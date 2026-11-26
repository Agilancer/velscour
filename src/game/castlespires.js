// THE BROKEN SPIRES live (world/castlespires.js, gfx/spires3d.js): like the Serpentine Tower (game/tower.js) the tile
// grid is laid onto the 3D route every frame (view.js setWarp): the route's (s, u) frame onto the towers' helices and
// the bridges between, the camera turned with the hero so the way ahead runs up the screen, and the three.js scene drawn
// behind the sprites through the world.tower hook render.js already knows.
import { G } from '../state.js';
import { camera, setWarp, warpMoved, HW, HH } from '../core/view.js';
import { spires3dReady, buildSpires3D, drawSpires3D, tickSpires3D } from '../gfx/spires3d.js';

const VZ = 39.19;   // px a tile up (HW * sqrt 2 * sin 60)
/** Lay the spires floor onto its 3D route; run.update gains the camera turn and the scene's clock. */
export function setupSpires(world, gen, run) {
  const sp = gen.spires; if (!sp || !spires3dReady()) return;   // (no three.js: the flat ribbon still plays)
  const rb = sp.rb, q = [0, 0, 0];
  const hook = world.tower = {
    sp, alpha: 0, focus: [0, 0, 0], ca: 1, sa: 0,
    raw(x, y, out) {
      rb.pos(rb.sOf(x), rb.uOf(y), q);
      const dx = q[0] - hook.focus[0], dz = q[1] - hook.focus[1], rx = hook.ca * dx + hook.sa * dz, rz = -hook.sa * dx + hook.ca * dz;
      out[0] = (rx - rz) * HW; out[1] = (rx + rz) * HH - q[2] * VZ;
      return out;
    },
    warp: (x, y, out) => hook.raw(x, y, out),
    /** World px back to the tile shown there: Newton steps from the flat inverse round the hero (as game/tower.js). */
    pick(wx, wy) {
      const p = world.player, a = [0, 0], b = [0, 0], c = [0, 0];
      let x = p ? p.x : gen.start[0], y = p ? p.y : gen.start[1];
      hook.raw(x, y, a);
      const dx = wx - a[0], dy = wy - a[1];
      x += (dx / HW + dy / HH) / 2; y += (dy / HH - dx / HW) / 2;   // (rough: the route turns, the Newton steps fix it)
      for (let i = 0; i < 8; i++) {
        hook.raw(x, y, a);
        const fx = a[0] - wx, fy = a[1] - wy;
        if (fx * fx + fy * fy < 0.04) break;
        hook.raw(x + 0.05, y, b); hook.raw(x, y + 0.05, c);
        const j11 = (b[0] - a[0]) / 0.05, j12 = (c[0] - a[0]) / 0.05, j21 = (b[1] - a[1]) / 0.05, j22 = (c[1] - a[1]) / 0.05, det = j11 * j22 - j12 * j21;
        if (Math.abs(det) < 1e-6) break;
        let sx = (j22 * fx - j12 * fy) / det, sy = (j11 * fy - j21 * fx) / det;
        const l = Math.hypot(sx, sy); if (l > 6) { sx *= 6 / l; sy *= 6 / l; }
        x -= sx; y -= sy;
      }
      return [x, y];
    },
    /** The camera turns so the route at the hero runs up-left (the way on), eased; a leap or blink turns it at once. */
    frame(dt) {
      const p = world.player; if (!p) return;
      const s = Math.max(0, Math.min(rb.S - 0.01, rb.sOf(p.x))), target = rb.tau(s) - Math.PI;
      let d = target - hook.alpha; d = Math.atan2(Math.sin(d), Math.cos(d));
      hook.alpha = dt && Math.abs(d) < 0.6 ? hook.alpha + d * (1 - Math.pow(0.0005, dt)) : target;
      hook.ca = Math.cos(hook.alpha); hook.sa = Math.sin(hook.alpha);
      rb.pos(s, rb.uOf(p.y), q); hook.focus[0] = q[0]; hook.focus[1] = q[1]; hook.focus[2] = q[2];
      camera.leadX = -G.W / camera.zoom * (G.touch ? 0.08 : 0.14); camera.leadY = -G.H / camera.zoom * 0.08;
      warpMoved();
    },
    draw(ctx) { drawSpires3D(ctx, hook); },
    front() {},
    minimap(c, W, H) {   // the route from above, the hero on it
      const g = c.getContext ? c.getContext('2d') : c; if (!g || !g.beginPath) return;
      let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; const pts = [];
      for (let s = 0; s <= rb.S; s += 2) { rb.pos(s, 0, q); pts.push([q[0], q[1]]); x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); z0 = Math.min(z0, q[1]); z1 = Math.max(z1, q[1]); }
      const k = Math.min(W / (x1 - x0 + 8), H / (z1 - z0 + 8)), ox = W / 2 - (x0 + x1) / 2 * k, oz = H / 2 - (z0 + z1) / 2 * k;
      g.save(); g.strokeStyle = 'rgba(200,190,170,0.8)'; g.lineWidth = 2; g.beginPath();
      pts.forEach(([x, z], i) => (i ? g.lineTo(ox + x * k, oz + z * k) : g.moveTo(ox + x * k, oz + z * k))); g.stroke();
      const p = world.player; if (p) { rb.pos(rb.sOf(p.x), rb.uOf(p.y), q); g.fillStyle = '#40ff60'; g.beginPath(); g.arc(ox + q[0] * k, oz + q[1] * k, 3, 0, Math.PI * 2); g.fill(); }
      g.restore();
    },
  };
  setWarp(hook.warp, hook.pick); hook.frame(0);
  void buildSpires3D(gen).catch((e) => console.warn('Spires 3D', e));
  const up = run.update.bind(run);
  run.update = (dt) => {
    up(dt); if (world.tower !== hook) return;
    hook.frame(dt); tickSpires3D(dt, hook);
  };
}
