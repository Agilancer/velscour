// First-person view (Settings: "First-person view", off by default): the game seen through the hero's eyes.
// three.js draws the floor (the level's own floor art, laid flat), the walls (the biome's wall art, straightened) and a
// ceiling from the tile map; render.js (renderFirstPerson) then draws every creature, townsperson, prop and item over it
// as a billboard with the game's own sprite code, clipped column by column against a raycast wall depth. A warp
// (core/view.js setWarp) projects tile positions onto the screen, so clicks, labels, damage numbers and particles all
// land where they should, and a click on the floor walks there. The tower and caverns keep their own 3D views.
import { G } from '../state.js';
import { camera, setWarp, currentWarp, TW, HW, HH, TH } from '../core/view.js';
import { makeCanvas, hexToRgb } from '../core/util.js';
import { stampDecals, bakedDecals } from './vfx.js';

let T = null, failed = false, loading = null, R = null;
export const PX = 44;              // world px of sprite per tile of height (the hero stands ~62 px: ~1.4 tiles)
export const EYE = 1.2;            // eye height, tiles
const FAR = 60;

/** The view: yaw (tile-space angle), eye position, focal length and horizon (css px), wall depth per screen column. */
export const fp = { yaw: 0, manual: 0, ex: 0, ey: 0, c: 1, s: 0, f: 600, hy: 300, step: 2, zbuf: new Float32Array(0), far: 30, on: false, wall: 2 };

/** Is first person wanted for this world? (Not in the Serpentine Tower or the caverns, which draw their own 3D.) */
export const fpWanted = (w) => !!(G.settings.firstPerson && w && w.player && !w.tower && !w.cave);
/** three.js is in (fetched on first use; until then, and if it can't be fetched, the game draws as usual). */
export function fpReady() {
  if (T) return true;
  if (!loading && !failed) loading = import('three').then((m) => { T = m; }, (e) => { failed = true; console.warn('first person: three.js could not be loaded', e); });
  return false;
}

// ------------------------------------------------------------------ steering
const angDiff = (a, b) => { let d = (a - b) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };
/** Called by controls every update: turn (A/D, the joystick's x) and the yaw easing round to where the hero looks
 *  while he walks somewhere, fights or plays himself. Returns the tile-space move vector for forward/back. */
export function fpSteer(dt, p, turn, fwd, auto) {
  if (fp.yaw == null || !Number.isFinite(fp.yaw)) fp.yaw = p.facing || 0;
  if (turn) { fp.yaw += turn * 2.6 * dt; fp.manual = 0.8; }
  else if (fp.manual > 0) fp.manual -= dt;
  else if (auto || p.moveTarget || p.path || p.attackTarget || p.castLock > 0 || p.interact) {
    const k = 1 - Math.exp(-dt * (p.castLock > 0 || p.attackTarget ? 7 : 4));
    fp.yaw += angDiff(p.facing || 0, fp.yaw) * k;
  }
  fp.yaw = angDiff(fp.yaw, 0);
  return fwd ? [Math.cos(fp.yaw) * fwd, Math.sin(fp.yaw) * fwd] : null;
}
/** Snap the view behind the hero's eyes (a new level, or the mode just turned on). */
export function fpSnap(p) { fp.yaw = p.facing || 0; fp.manual = 0; }

// ------------------------------------------------------------------ projection
/** Depth of a tile position in front of the eye (tiles; <= 0 behind). */
export const fpDepth = (x, y) => (x - fp.ex) * fp.c + (y - fp.ey) * fp.s;
/** Tile position -> css px on screen (z: height in tiles). Behind the eye: far off screen. */
export function fpProject(x, y, z, out) {
  const dx = x - fp.ex, dy = y - fp.ey, d = dx * fp.c + dy * fp.s;
  if (d < 0.05) { out[0] = out[1] = -1e5; return out; }
  out[0] = G.W / 2 + (dy * fp.c - dx * fp.s) / d * fp.f;
  out[1] = fp.hy + (EYE - z) / d * fp.f;
  return out;
}
/** World px per world px of sprite at depth d: what a billboard is scaled by under the camera transform. */
export const fpScale = (d) => fp.f / (PX * Math.max(0.2, d) * camera.zoom);
// the warp hands world px to the camera transform, so camera.toScreen gives back exactly the projected css px
function warp(x, y, out) {
  fpProject(x, y, 0, out);
  const z = camera.zoom;
  out[0] = camera.x + (out[0] - G.W / 2) / z; out[1] = camera.y + (out[1] - G.H / 2) / z;
  return out;
}
function pick(wx, wy) {
  const z = camera.zoom, sx = (wx - camera.x) * z + G.W / 2, sy = (wy - camera.y) * z + G.H / 2;
  const d = sy - fp.hy > 1e-3 ? Math.min(FAR, EYE * fp.f / (sy - fp.hy)) : FAR, l = (sx - G.W / 2) * d / fp.f;
  return [fp.ex + fp.c * d - fp.s * l, fp.ey + fp.s * d + fp.c * l];
}
let warped = false;
/** Hand the warp back (first person turned off, or a tower/cave took over). */
export function fpRelease() {
  if (warped) { warped = false; if (currentWarp() === warp) setWarp(null, null); }
  if (fp.world) { fpDispose(fp.world); fp.world = null; }
  if (camera.fixed) { camera.fixed = false; if (G.player) camera.follow(G.player.x, G.player.y, 0, true); }
  fp.on = false;
}

// ------------------------------------------------------------------ the level in 3D
const isVoid = (map, x, y) => x < 0 || y < 0 || x >= map.w || y >= map.h || map.t[y * map.w + x] !== 1;

/** The level's floor seen from straight above: each iso floor tile drawn back onto a square. */
function floorCanvas(world, paintFloor) {
  const map = world.map, S = Math.max(6, Math.min(32, Math.floor(2048 / Math.max(map.w, map.h))));
  const c = makeCanvas(map.w * S, map.h * S), g = c.getContext('2d');
  const [r, gg, b] = hexToRgb(world.biome?.fog || '#000000');
  g.fillStyle = `rgb(${r >> 1},${gg >> 1},${b >> 1})`; g.fillRect(0, 0, c.width, c.height);
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'medium';
  g.setTransform(S / TW, -S / TW, S / TH, S / TH, 0, 0); // iso world px -> top-down px
  paintFloor(g, -map.h * HW - TW, -TH, map.w * HW + TW, (map.w + map.h) * HH + TH);
  return { c, g, S, seq: 0 };
}

/** One tile's width of the biome's straight wall (a "\" run), sheared back upright, ground at the bottom. */
function wallCanvas(world, floor) {
  const ts = world.tileset, fam = ts && ts.families && ts.walls && (ts.walls[ts.families[0]] || null);
  const vars = fam && (fam[10] || fam['10']);
  if (vars && vars[0] && vars[0].length) {
    const k = ts.k || 1, tw = Math.round(TW / k), H = tw * 3;
    const c = makeCanvas(Math.round(tw / 2), H), g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.setTransform(1, -0.5, 0, 1, tw / 4, H);
    for (const s of vars[0]) g.drawImage(s.img, s.sx, s.sy, s.w, s.h, s.ox, s.oy, s.w, s.h);
    // crop to the rows that hold wall (the top cap stays: it rides above the eye)
    const d = g.getImageData(0, 0, c.width, H).data, cw = c.width;
    let top = H;
    for (let y = 0; y < H && top === H; y++) {
      let n = 0;
      for (let x = Math.floor(cw * 0.3); x < cw * 0.7; x++) if (d[(y * cw + x) * 4 + 3] > 200) n++;
      if (n > cw * 0.3) top = y;
    }
    const fh = H - top;
    if (fh > 8) {
      const out = makeCanvas(cw, fh), og = out.getContext('2d');
      og.fillStyle = '#000'; og.fillRect(0, 0, cw, fh); // holes in the art read as shadow, not see-through
      og.drawImage(c, 0, top, cw, fh, 0, 0, cw, fh);
      return { c: out, h: Math.max(1.4, Math.min(3, fh * k / PX)) };
    }
  }
  // no wall pack (the town and the wilds): blocks cut from the floor, stacked and shaded
  const S = floor.S, out = makeCanvas(S * 2, S * 3), og = out.getContext('2d');
  const map = world.map;
  let sx = 0, sy = 0;
  for (let i = 0; i < map.w * map.h; i++) if (map.t[i] === 1) { sx = (i % map.w) * S; sy = Math.floor(i / map.w) * S; break; }
  for (let y = 0; y < 3; y++) for (let x = 0; x < 2; x++) og.drawImage(floor.c, sx, sy, S, S, x * S, y * S, S, S);
  og.fillStyle = 'rgba(0,0,0,0.35)'; og.fillRect(0, 0, out.width, out.height);
  og.fillStyle = 'rgba(0,0,0,0.5)';
  for (let y = 0; y < 3; y++) { og.fillRect(0, y * S, out.width, 1); og.fillRect(((y & 1) * S) / 2, y * S, 1, S); og.fillRect(((y & 1) * S) / 2 + S, y * S, 1, S); }
  return { c: out, h: 2 };
}

function texture(canvas, nearest) {
  const t = new T.CanvasTexture(canvas);
  t.colorSpace = T.SRGBColorSpace;
  t.wrapS = t.wrapT = T.RepeatWrapping;
  t.magFilter = nearest ? T.NearestFilter : T.LinearFilter;
  t.anisotropy = 8;
  return t;
}

const outdoor = (world) => world.kind !== 'dungeon';

function buildScene(world, paintFloor) {
  const map = world.map, scene = new T.Scene();
  const floor = floorCanvas(world, paintFloor), wall = wallCanvas(world, floor);
  const ftex = texture(floor.c, true), wtex = texture(wall.c, true);
  const fm = new T.Mesh(new T.PlaneGeometry(map.w, map.h), new T.MeshBasicMaterial({ map: ftex }));
  fm.rotation.x = -Math.PI / 2; fm.position.set(map.w / 2, 0, map.h / 2);
  scene.add(fm);
  const WH = outdoor(world) ? Math.min(wall.h, 1.8) : wall.h;
  if (!outdoor(world)) {
    const cm = new T.Mesh(new T.PlaneGeometry(map.w, map.h), new T.MeshBasicMaterial({ map: ftex, color: 0x3c3c3c, side: T.DoubleSide }));
    cm.rotation.x = Math.PI / 2; cm.position.set(map.w / 2, WH, map.h / 2);
    scene.add(cm);
  }
  // a quad on every floor edge that meets the void, facing the floor; x-running walls a shade darker
  const pos = [], uv = [], col = [];
  const quad = (x0, y0, x1, y1, sh) => {
    pos.push(x0, 0, y0, x1, 0, y1, x1, WH, y1, x0, 0, y0, x1, WH, y1, x0, WH, y0);
    uv.push(0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1);
    for (let i = 0; i < 6; i++) col.push(sh, sh, sh);
  };
  for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) {
    if (map.t[y * map.w + x] !== 1) continue;
    if (isVoid(map, x, y - 1)) quad(x, y, x + 1, y, 1);
    if (isVoid(map, x, y + 1)) quad(x + 1, y + 1, x, y + 1, 1);
    if (isVoid(map, x - 1, y)) quad(x, y + 1, x, y, 0.78);
    if (isVoid(map, x + 1, y)) quad(x + 1, y, x + 1, y + 1, 0.78);
  }
  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
  geo.setAttribute('color', new T.Float32BufferAttribute(col, 3));
  scene.add(new T.Mesh(geo, new T.MeshBasicMaterial({ map: wtex, vertexColors: true, side: T.DoubleSide })));
  const b = world.biome || {};
  const fogHex = outdoor(world) ? (world.night ? '#0a0e1c' : '#8a96a8') : (b.fog || '#000000');
  const far = outdoor(world) ? (world.night ? 26 : 55) : Math.max(9, 40 - (b.dark || 0.8) * 40 + (b.light || 7) * 1.4);
  scene.fog = new T.Fog(new T.Color(fogHex), far * 0.2, far);
  return { scene, floor, ftex, wall: WH, far, fogHex };
}

function renderer() {
  if (R) return R;
  const gl = new T.WebGLRenderer({ antialias: false, alpha: true, premultipliedAlpha: true, powerPreference: 'high-performance' });
  gl.setPixelRatio(1);
  gl.setClearColor(0x000000, 0);
  R = { gl, cam: new T.PerspectiveCamera(70, 1, 0.05, 200) };
  return R;
}

/** Forget a level's 3D (left it, or first person turned off). */
export function fpDispose(world) {
  const s = world && world.fp3d;
  if (!s) return;
  s.scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) { o.material.map && o.material.map.dispose(); o.material.dispose(); } });
  world.fp3d = null;
}

/** Cast one ray per screen column group: the depth of the first wall along it. */
function castColumns(map) {
  const n = Math.ceil(G.W / fp.step);
  if (fp.zbuf.length !== n) fp.zbuf = new Float32Array(n);
  const z = fp.zbuf, ox = fp.ex, oy = fp.ey;
  for (let i = 0; i < n; i++) {
    const t = ((i + 0.5) * fp.step - G.W / 2) / fp.f;
    const rx = fp.c - fp.s * t, ry = fp.s + fp.c * t; // forward component is 1: distances come out as depth
    let mx = Math.floor(ox), my = Math.floor(oy);
    const ddx = Math.abs(1 / rx), ddy = Math.abs(1 / ry), sx = rx < 0 ? -1 : 1, sy = ry < 0 ? -1 : 1;
    let tx = (rx < 0 ? ox - mx : mx + 1 - ox) * ddx, ty = (ry < 0 ? oy - my : my + 1 - oy) * ddy, d = FAR;
    for (let k = 0; k < 160; k++) {
      let hit;
      if (tx < ty) { mx += sx; hit = tx; tx += ddx; } else { my += sy; hit = ty; ty += ddy; }
      if (hit > FAR) break;
      if (isVoid(map, mx, my)) { d = hit; break; }
    }
    z[i] = d;
  }
}

const tmp = [0, 0];
/**
 * Set up this frame's view and draw the level's floor, walls and ceiling (or sky) onto ctx (identity transform).
 * paintFloor(g, x0, y0, x1, y1) paints the iso floor between those world px (render.js drawFloorTiles).
 * Returns false when it can't draw (three.js not in yet): the caller draws the usual view instead.
 */
export function fpBegin(ctx, world, paintFloor) {
  if (!fpReady()) { fpRelease(); return false; }
  const p = world.player;
  if (fp.world !== world) { fpDispose(fp.world); fp.world = world; fpSnap(p); }
  else if (!fp.on) fpSnap(p);
  if (warped) setWarp(null, null); // the floor art is painted in plain iso px
  if (!world.fp3d) world.fp3d = buildScene(world, paintFloor);
  const s = world.fp3d;
  fp.on = true; fp.far = s.far; fp.wall = s.wall;
  camera.fixed = true; camera.x = camera.y = 0;
  fp.ex = p.x; fp.ey = p.y; fp.c = Math.cos(fp.yaw); fp.s = Math.sin(fp.yaw);
  const fov = (G.H > G.W ? 62 : 74) * Math.PI / 180;
  fp.f = (G.W / 2) / Math.tan(fov / 2);
  fp.hy = G.H * 0.5 + (camera.shakeY || 0) * 0.5;
  fp.step = G.touch ? 3 : 2;
  // blood that has settled is stamped into the floor now and then (each upload sends the whole floor)
  const fl = s.floor;
  if (bakedDecals.length && bakedDecals[bakedDecals.length - 1].seq > fl.seq && G.time - (fl.at || 0) > 2.5) {
    fl.at = G.time;
    const map = world.map;
    fl.seq = stampDecals(fl.g, fl.seq, -map.h * HW - TW, -TH, map.w * HW + TW, (map.w + map.h) * HH + TH);
    s.ftex.needsUpdate = true;
  }
  warped = true; setWarp(warp, pick);
  castColumns(world.map);
  // sky (outdoors) under the 3D
  const W = G.W * G.dpr, H = G.H * G.dpr;
  if (outdoor(world)) {
    const g = ctx.createLinearGradient(0, 0, 0, fp.hy * G.dpr);
    if (world.night) { g.addColorStop(0, '#02030a'); g.addColorStop(1, s.fogHex); }
    else { g.addColorStop(0, '#3d5f8e'); g.addColorStop(1, s.fogHex); }
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, fp.hy * G.dpr + 2);
    ctx.fillStyle = s.fogHex; ctx.fillRect(0, fp.hy * G.dpr, W, H);
  } else { ctx.fillStyle = s.fogHex; ctx.fillRect(0, 0, W, H); }
  const rd = renderer(), q = G.touch ? 0.5 : 0.6;
  const rw = Math.max(64, Math.round(W * q)), rh = Math.max(48, Math.round(H * q));
  if (rd.w !== rw || rd.h !== rh) { rd.gl.setSize(rw, rh, false); rd.w = rw; rd.h = rh; }
  const cam = rd.cam;
  cam.fov = 2 * Math.atan((G.H / 2) / fp.f) * 180 / Math.PI;
  cam.aspect = G.W / G.H;
  cam.near = 0.05; cam.far = s.far + 2;
  // shift the projection so the horizon sits at fp.hy (shake nudges it)
  cam.updateProjectionMatrix();
  cam.position.set(fp.ex, EYE, fp.ey);
  cam.lookAt(fp.ex + fp.c, EYE - (fp.hy - G.H / 2) / fp.f, fp.ey + fp.s);
  rd.gl.render(s.scene, cam);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(rd.gl.domElement, 0, 0, W, H);
  ctx.imageSmoothingEnabled = true;
  return true;
}

/**
 * Clip ctx (any transform) to the screen columns between css x0..x1 where nothing nearer than depth d stands.
 * Returns 0 if all of it is hidden, 1 if none of it is (no clip set), 2 if a clip was pushed (ctx.restore() after).
 */
export function fpClip(ctx, x0, x1, d) {
  const z = fp.zbuf, st = fp.step, n = z.length;
  const i0 = Math.max(0, Math.floor(x0 / st)), i1 = Math.min(n - 1, Math.floor(x1 / st));
  if (i1 < i0) return 0;
  let vis = 0, hid = 0;
  for (let i = i0; i <= i1; i++) if (z[i] > d) vis++; else hid++;
  if (!vis) return 0;
  if (!hid) return 1;
  ctx.save();
  const m = ctx.getTransform();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.beginPath();
  const k = G.dpr;
  for (let i = i0; i <= i1; i++) {
    if (z[i] <= d) continue;
    let j = i; while (j + 1 <= i1 && z[j + 1] > d) j++;
    ctx.rect(i * st * k, 0, (j - i + 1) * st * k, G.H * k);
    i = j;
  }
  // beyond the sprite's estimated span nothing is clipped away
  if (i0 > 0 && z[i0] > d) ctx.rect(0, 0, i0 * st * k, G.H * k);
  if (i1 < n - 1 && z[i1] > d) ctx.rect((i1 + 1) * st * k, 0, (n - i1 - 1) * st * k, G.H * k);
  ctx.clip();
  ctx.setTransform(m);
  return 2;
}
export { tmp as fpTmp };
