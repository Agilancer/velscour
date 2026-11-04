// The mountain overworlds' hook into the renderer (world.cave, as the caverns and the dunes have): the ground is the
// level's height field (world/alpine.js) drawn in three.js (gfx/alpine3d.js); this lifts every sprite onto it, picks
// the tile under the mouse through it, hides whoever stands behind higher ground, and hops a creature up a ledge
// (render.js asks hopArc for its arc while the smooth field carries it up the step's crease).
import { G } from '../state.js';
import { camera, setElevation, HW, HH, isoX, isoY } from '../core/view.js';
import { clamp } from '../core/util.js';
import { VZ } from '../world/caverns.js';
import { LV } from '../world/alpine.js';
import { buildAlpine3D, drawAlpine3D, tickAlpine3D, disposeAlpine3D, alpineScene } from '../gfx/alpine3d.js';
import { spawn } from '../gfx/vfx.js';

const K = HH / VZ;   // rise per tile of depth seen edge-on

/** Lift the ground onto a mountain's field for a mountain level; tear its 3D down for any other (game.js setWorld). */
export function useAlpine(world) {
  const cr = world && world.cave;
  if (!cr || !cr.av) { if (alpineScene()) disposeAlpine3D(); return; }
  setElevation(cr.elev, cr.pick);
  cr.frame(0, true);
}

/**
 * world.cave for a mountain level. av: the level's alpine description (gfx/alpine3d.js buildAlpine3D); opts.zoom: the
 * level's zoom factor, or a function of the hero (the plateaus pull back a little).
 */
export function alpineHook(world, av, opts = {}) {
  const map = world.map, W = map.w, H = map.h, F = av.F;
  const floorLo = map.minLevel / LV - 2, floorHi = map.maxLevel / LV + 6;
  const ground = (x, y) => F.H2(x, y);
  const cr = world.cave = {
    av, focus: [0, 0, 0], cut: false, zoomK: 1, look: null, lookT: 0, lookDur: 0,
    elev: (x, y) => ground(x, y) * VZ,
    /** World px back to the tile position whose ground shows there (walkable ground before rock). */
    pick(wx, wy) {
      let rock = null, inRock = false;
      const at = (h) => { const yy = wy + h * VZ; return [(wx / HW + yy / HH) / 2, (yy / HH - wx / HW) / 2]; };
      const open = (x, y) => map.walkableTile(Math.floor(x), Math.floor(y));
      const below = (h) => { const [x, y] = at(h); if (x < 0 || y < 0 || x >= W || y >= H) return false; return ground(x, y) >= h; };
      for (let h = floorHi; h >= floorLo; h -= 0.06) {
        if (!below(h)) { inRock = false; continue; }
        const [x, y] = at(h);
        if (inRock) { if (open(x, y)) return [x, y]; continue; }
        let a = h + 0.06, b = h;
        for (let k = 0; k < 6; k++) { const m = (a + b) / 2; if (below(m)) b = m; else a = m; }
        const q = at(b);
        if (open(q[0], q[1])) return q;
        if (!rock) rock = q;
        inRock = true;
      }
      if (rock) return rock;
      const p = world.player, h = p ? ground(p.x, p.y) : 0, yy = wy + h * VZ;
      return [(wx / HW + yy / HH) / 2, (yy / HH - wx / HW) / 2];
    },
    /** Where the ground in front of a creature hides it (null: nothing; -Infinity: all of it). */
    horizon(o) {
      if (o === world.player) return null;
      const x = o.x, y = o.y, h0 = ground(x, y), fy = (x + y) * HH - h0 * VZ - (o.z || 0);
      let top = Infinity;
      for (let s = 0.25, sMax = (floorHi - h0) / (2 * K) + 1; s < sMax; s += s < 2 ? 0.25 : 0.5) {
        const sx = x + s, sy = y + s;
        if (sx >= W || sy >= H) break;
        const py = (sx + sy) * HH - ground(sx, sy) * VZ;
        if (py < top) top = py;
      }
      if (top >= fy - 3) return null;
      const hgt = o.viewH || 46 * (o.scale || 1);
      return top <= fy - hgt ? -Infinity : top;
    },
    drawProp() {},
    frame(dt, snap = false) {
      const p = world.player;
      if (!p) return;
      cr.focus[0] = p.x; cr.focus[1] = ground(p.x, p.y); cr.focus[2] = p.y;
      const zk = typeof opts.zoom === 'function' ? opts.zoom(p) : opts.zoom ?? 1;
      if (snap || Math.abs(cr.zoomK - zk) > 0.002) {
        cr.zoomK = snap ? zk : cr.zoomK + (zk - cr.zoomK) * Math.min(1, dt * 1.4);
        camera.zoomK = cr.zoomK; camera.computeZoom();
      }
      if (cr.look && cr.lookT > 0) {   // the camera eases over to something worth seeing and back
        cr.lookT -= dt;
        const kk = clamp(Math.min(cr.lookT, cr.lookDur - cr.lookT) / 0.8, 0, 1), [lx, ly] = cr.look, lh = ground(lx, ly);
        camera.leadX = (isoX(lx, ly) - isoX(p.x, p.y)) * kk; camera.leadY = (isoY(lx, ly) - isoY(p.x, p.y)) * kk;
        if (cr.lookT <= 0) { cr.look = null; camera.leadX = camera.leadY = 0; }
        void lh;
      }
      if (dt) tickAlpine3D(dt);
    },
    /** Pan the camera to (x, y) for `dur` seconds and back. */
    lookAt(x, y, dur = 3) { cr.look = [x, y]; cr.lookT = cr.lookDur = dur; },
    draw(ctx) { drawAlpine3D(ctx, cr); },
  };
  buildAlpine3D(av);
  return cr;
}

/**
 * A creature hopping up a ledge (or landing off one) on a smooth field: px it rides above the ground for the arc
 * (render.js case 6). A step up of more than map.walkStep levels between two tiles is a hop; a drop of more than
 * map.drop / 2 a jump down with a small arc and a landing puff for the hero.
 */
export function hopArc(o, map) {
  const ti = map.tileIdx(o.x, o.y), lv = map.hgt[ti];
  if (o._hopMap !== map) { o._hopMap = map; o._lv = lv; o._ti = ti; o._arc = null; return 0; }
  if (lv === o._lv) o._ti = ti;
  if (lv !== o._lv) {
    const dl = lv - o._lv, walk = map.walkStep ?? 3, prev = o._ti ?? ti, w = map.w;
    o._ti = ti;
    // only a step to the next tile hops (a blink, a leap or a teleport just lands)
    if (Math.abs((prev % w) - (ti % w)) > 1 || Math.abs(((prev / w) | 0) - ((ti / w) | 0)) > 1 || Math.abs(dl) > (map.drop ?? 10) * 2) { o._lv = lv; o._arc = null; return 0; }
    if (dl > walk) o._arc = { t0: G.time, dur: 0.2 + dl * 0.012, a: 7 + dl * 2.4 };
    else if (-dl > walk + 2) o._arc = { t0: G.time, dur: 0.16 + -dl * 0.008, a: 4 + -dl * 0.5 };
    if (o._arc && o._arc.t0 === G.time && o === G.player && dl > 0) for (let k = 0; k < 3; k++) spawn({ type: 'dot', x: o.x + (Math.random() - 0.5) * 0.4, y: o.y + (Math.random() - 0.5) * 0.4, z: 2, vx: (Math.random() - 0.5) * 0.8, vy: (Math.random() - 0.5) * 0.8, vz: 25 + Math.random() * 20, g: 140, life: 0.4, size: 2.4, color: map.hopDust || '#b8ab94' });   // a little kicked-up dust or snow
    o._lv = lv;
  }
  const a = o._arc;
  if (!a) return 0;
  const t = (G.time - a.t0) / a.dur;
  if (t >= 1 || t < 0) { o._arc = null; return 0; }
  return a.a * Math.sin(Math.PI * t);
}
