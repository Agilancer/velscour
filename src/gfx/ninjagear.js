// The Ninja's gear on his body: the equipped katana as a live three.js model in his right fist (heldmodel3d.js: finish,
// element glow, socketed gems) and the nunchaku hanging over his belt by its cord, swinging as he moves. Called by
// Player.drawArtLayer around the hero image ('back' before it, 'front' after) with Creature.drawArt's `where`; drawn
// with the given ctx and no setTransform, so a somersault's transform turns the gear with him.
// The katana: a ready stance, the blade up and forward; low and trailing at a run, streaming behind in the air, and a
// cut through an arc on every attack (p.lunge), down then up by turns, with a pale sweep behind the point.
// The nunchaku: each stick a little pendulum on its half of the cord (verlet), hung from the belt point of the worn
// armor: gravity, the drag of his run, his bob, leaps and turns move it; the sticks are cut from the design's whole
// sprite (heldFree: assets/sprites/held/nunchakus). Both stay out of the baked hero image while they draw here
// (heldart.js setHeldLive) and fall back to it until three.js, the model and the sprites have loaded.
// State: p._ninjaGear (the blade's angle and the sticks' points); nothing else is kept.
import { G } from '../state.js';
import { isoX, isoY } from '../core/view.js';
import { shownEquip } from '../data/items.js';
import { heldSetOf, heldElement } from '../data/held.js';
import { heldFree, heldFists, setHeldLive } from './heldart.js';
import { drawHeldModel3D, heldModel3DReady } from './heldmodel3d.js';
import { drawHeldFx, fxColor } from './heldfx.js';
import { addLight } from './vfx.js';

const W = 128, D = Math.PI / 180, clamp = (v, a, b) => Math.max(a, Math.min(b, v)), ease = (u) => u * u * (3 - 2 * u);
export const NINJA_GEAR = {
  scale: 1.1,            // art px per katana model unit (the baked pose's scale: tools/weapons3d.js SETS.katanas)
  fist: 3.3,             // the fist hides the handle inside this radius (art px)
  rest: -52 * D, run: 132 * D, air: 160 * D,                   // the blade's screen angle, hero facing right (-90: straight up)
  cut: [[-128 * D, 44 * D], [72 * D, -112 * D]],               // a cut's sweep: down, then the rising one
  belt: [-12, -10.5],    // the belt point from the left fist (art px), as the bake hangs it (handheld3d_kits.js POSE.belt)
  cord: [1.9, 2.7], sticks: 1.15, gravity: 1150, drag: 1.5, damp: 2.4, // each stick's half of the cord (art px); the sticks' size; art px / s^2; per s
};
const N = NINJA_GEAR;

const katanaOf = (it) => !!it && it.type === 'gear' && heldSetOf(it.base, 'weapon', 'ninja') === 'katanas';
const sticksOf = (it) => (it && it.type === 'gear' && it.base === 'nunchaku' ? heldFree(it, 'ninja', 'offhand') : null);
// while these draw live, the hero image leaves them out (his after-images and portraits keep the baked ones)
setHeldLive((cls, slot, it) => cls === 'ninja' && !G.player?.ghostDraw && G.settings.heldGear !== false
  && (slot === 'weapon' ? katanaOf(it) && heldModel3DReady(it, cls) : !!sticksOf(it)?.pts.sticks));

/** A cut's angle u of the way through an attack (0..1): the sweep in the first half, back to rest in the second. */
const HALF = 0.5, arc = (c, u) => (u < HALF ? c[0] + (c[1] - c[0]) * ease(u / HALF) : c[1] + (N.rest - c[1]) * ease((u - HALF) / (1 - HALF)));
/** The blade this frame: { a (screen angle), spin, tilt, sweep: null | { tail (angle), alpha } behind the point in a cut }. */
function stance(p, S, dt) {
  if (p.lunge > S.lunge + 0.3) S.n++; // a new attack: the other cut
  S.lunge = p.lunge;
  let to = p.z > 1 || p.acro ? N.air : p.moving ? N.run : N.rest + Math.sin((G.time || 0) * 1.9) * 0.035, rate = 13, spin = 0, tilt = 0, sweep = null;
  if (p.lunge > 0) {
    const u = 1 - p.lunge, c = N.cut[S.n & 1], back = u < HALF ? 1 : 1 - ease((u - HALF) / (1 - HALF));
    to = arc(c, u); rate = 60;
    spin = (S.n & 1 ? Math.PI : 0) * back; // the rising cut leads with the edge too
    tilt = Math.sin(Math.PI * Math.min(1, u / HALF)) * 0.4;
    if (u < 0.8) sweep = { tail: arc(c, Math.max(0, u - 0.3)), alpha: Math.sin(Math.PI * u / 0.8) };
  }
  S.a += (to - S.a) * (dt > 0 ? 1 - Math.exp(-dt * rate) : 0);
  return { a: S.a, spin, tilt, sweep };
}

/** A pale sweep behind the blade's point through a cut: from angle a0 to a1 round (x, y), radius r. */
function sweep(ctx, x, y, a0, a1, r, col, alpha) {
  const n = 18, w = r * 0.5;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const u0 = i / n, u1 = (i + 1) / n, b0 = a0 + (a1 - a0) * u0, b1 = a0 + (a1 - a0) * u1, ri = r - w * (0.25 + 0.75 * u1);
    ctx.globalAlpha = alpha * u1 * u1;
    ctx.fillStyle = `rgb(${col})`;
    ctx.beginPath(); ctx.arc(x, y, r, b0, b1, a1 < a0); ctx.arc(x, y, ri, b1, b0, a1 > a0); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

let sil = null;
/** A dark line round the live blade, as the baked sprites have: its silhouette stamped about it, under it (heldmodel3d's o.rim). */
function outline(ctx, o, img, sx, sy, sw, sh, dx, dy, dw, dh) {
  if (!sil || sil.width < sw || sil.height < sh) { const c = document.createElement('canvas'); c.width = Math.max(sw, sil?.width || 0); c.height = Math.max(sh, sil?.height || 0); sil = c; }
  const x = sil.getContext('2d');
  x.globalCompositeOperation = 'source-over'; x.clearRect(0, 0, sw, sh); x.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
  x.globalCompositeOperation = 'source-in'; x.fillStyle = '#1a100c'; x.fillRect(0, 0, sw, sh);
  for (const [ox, oy] of [[o, 0], [-o, 0], [0, o], [0, -o]]) ctx.drawImage(sil, 0, 0, sw, sh, dx + ox, dy + oy, dw, dh);
}

/** Step the sticks: two pendulums from the belt point (ax, ay), s ctx units per art px, (hx, hy) the hero's planar move. */
function swing(S, ax, ay, s, dt, hx, hy, flip, ar) {
  const sgn = flip ? -1 : 1, L = S.len;
  if (!S.pts || !(dt < 0.25) || S.s !== s) { // new, or after a long gap: hanging at rest
    S.pts = [0, 1].map((i) => { const x = ax + sgn * (i ? 1.3 : -1.3) * s, y = ay + N.cord[i] * s; return { i, tx: x, ty: y, px: x, py: y, bx: x, by: y + L[i] * s, qx: x, qy: y + L[i] * s }; });
    S.s = s;
  }
  if (!(dt > 0)) return;
  const steps = Math.min(6, Math.ceil(dt * 90)), h = dt / steps, kd = Math.exp(-h * N.damp), g = N.gravity * s;
  // gravity (turned back when a somersault turns the picture) and the wind of his run
  let fx = -hx / dt * N.drag, fy = -hy / dt * N.drag;
  const fl = Math.hypot(fx, fy), fm = g * 1.6;
  if (fl > fm) { fx *= fm / fl; fy *= fm / fl; }
  const gx = Math.sin(ar) * g + fx, gy = Math.cos(ar) * g + fy;
  for (const q of S.pts) { q.tx += hx; q.ty += hy; q.px += hx; q.py += hy; q.bx += hx; q.by += hy; q.qx += hx; q.qy += hy; } // carried with him
  for (let n = 0; n < steps; n++) {
    for (const q of S.pts) {
      const c = N.cord[q.i] * s, l = L[q.i] * s, ox = ax + sgn * (q.i ? 1.3 : -1.3) * s, oy = ay + (q.i ? 0.4 : 0) * s;
      let vx = (q.tx - q.px) * kd, vy = (q.ty - q.py) * kd; q.px = q.tx; q.py = q.ty; q.tx += vx + gx * h * h; q.ty += vy + gy * h * h;
      vx = (q.bx - q.qx) * kd; vy = (q.by - q.qy) * kd; q.qx = q.bx; q.qy = q.by; q.bx += vx + gx * h * h; q.by += vy + gy * h * h;
      for (let k = 0; k < 3; k++) {
        let dx = q.tx - ox, dy = q.ty - oy, d = Math.hypot(dx, dy) || 1e-6;
        if (d > c) { q.tx = ox + dx / d * c; q.ty = oy + dy / d * c; }           // the cord: slack or taut
        dx = q.bx - q.tx; dy = q.by - q.ty; d = Math.hypot(dx, dy) || 1e-6;
        const e = (d - l) / d; q.tx += dx * e * 0.35; q.ty += dy * e * 0.35; q.bx -= dx * e * 0.65; q.by -= dy * e * 0.65; // the stick: rigid
      }
    }
    const [a, b] = S.pts, dx = b.bx - a.bx, d = Math.abs(dx), min = 2 * s; // the free ends knock apart
    if (d < min && Math.abs(b.by - a.by) < 4 * s) { const e = (min - d) * 0.5 * (dx < 0 ? -1 : 1); a.bx -= e; b.bx += e; }
  }
}

function drawSticks(ctx, p, S, f, s, ax, ay, flip, fx) {
  const P = f.pts, k = s / 2 * N.sticks, sgn = flip ? -1 : 1, t = G.time || 0, col = fxColor(f.element); // the whole sprite is 2 px per art px
  const cord = { rope: ['#cdb080', null], braid: ['#9a2028', null], chain: ['#a2a2ae', [k * 1.6, k * 1.2]], glow: [`rgb(${col})`, [k * 1.6, k * 1.2]] }[P.cord] || ['#cdb080', null];
  ctx.save();
  if (p.alpha !== undefined) ctx.globalAlpha = p.alpha;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const line = (w, c, dash) => { // the cord: over the belt and down to each stick
    ctx.lineWidth = w; ctx.strokeStyle = c; ctx.setLineDash(dash || []);
    ctx.beginPath();
    const [a, b] = S.pts;
    ctx.moveTo(a.tx, a.ty); ctx.lineTo(ax - sgn * 1.3 * s, ay); ctx.quadraticCurveTo(ax, ay - 1.6 * s, ax + sgn * 1.3 * s, ay + 0.4 * s); ctx.lineTo(b.tx, b.ty);
    ctx.stroke();
  };
  line(s * 1.5, 'rgba(20,14,12,0.9)'); line(s * 0.8, cord[0], cord[1]); ctx.setLineDash([]);
  ctx.imageSmoothingEnabled = true;
  for (const q of S.pts) {
    const [c0, c1] = P.sticks[q.i], up = c1[1] < c0[1], th = Math.atan2(q.by - q.ty, q.bx - q.tx);
    const y0 = Math.max(0, Math.floor(Math.min(c0[1], c1[1]) - (up ? 7 : 2))), y1 = Math.min(f.img.height, Math.ceil(Math.max(c0[1], c1[1]) + (up ? 2 : 7)));
    ctx.save();
    ctx.translate(q.tx, q.ty); ctx.rotate(th + (up ? Math.PI / 2 : -Math.PI / 2)); ctx.scale(k, k);
    ctx.drawImage(f.img, 0, y0, f.img.width, y1 - y0, -c0[0], y0 - c0[1], f.img.width, y1 - y0);
    ctx.restore();
  }
  ctx.restore();
  const [a, b] = S.pts, mid = [(a.tx + a.bx + b.tx + b.bx) / 4, (a.ty + a.by + b.ty + b.by) / 4];
  drawHeldFx(ctx, { rarity: f.rarity, element: f.element, gems: f.gems, pts: {
    head: [...mid, S.len[0] * 0.5], tip: [b.bx, b.by], line: [[a.tx, a.ty], [a.bx, a.by]], orbit: [...mid, 5],
    slots: [[a.bx, a.by], [b.bx, b.by], [(a.tx + a.bx) / 2, (a.ty + a.by) / 2], [(b.tx + b.bx) / 2, (b.ty + b.by) / 2]],
  } }, t, (x, y) => [x, y], s, { fx, seed: 23, size: 1.3, quality: G.lowFx ? 0.5 : 1 });
}

/**
 * Draw the Ninja's live gear round his image. layer 'back' | 'front' (all of it is in front of him: his right hand is
 * the near one); art: Creature.drawArt's where { img, x, y, dx, dy, k, sq, flip, rot, sx, sy }.
 */
export function ninjaGearLayer(ctx, p, layer, art) {
  if (layer !== 'front' || p.ghostDraw || !p.char || !art?.img || !p.heldArt?.base) return;
  const eq = shownEquip(p.char), F = heldFists('ninja', eq);
  if (!F) return;
  const S = (p._ninjaGear ||= { t: G.time || 0, a: N.rest, lunge: 0, n: -1, wx: isoX(p.x, p.y), wy: isoY(p.x, p.y) });
  const now = G.time || 0, dt = clamp(now - S.t, 0, 1), HD = art.img.width / W, s = HD * art.k, sq = art.sq || 1, sgn = art.flip ? -1 : 1;
  const rot = art.rot || 0, sx = art.sx ?? 1, sy = art.sy ?? 1, cos = Math.cos(rot), sin = Math.sin(rot), fx = G.settings.heldFx !== false;
  const local = (ax, ay) => [art.dx + ax * s, art.dy + ay * s * sq];                                  // art px -> the hero's own frame
  const world = (ax, ay) => { const [lx, ly] = local(ax, ay), X = lx * sx, Y = ly * sy; return [art.x + sgn * (X * cos - Y * sin), art.y + X * sin + Y * cos]; };
  const wx = isoX(p.x, p.y), wy = isoY(p.x, p.y), hx = wx - S.wx, hy = wy - S.wy;
  S.t = now; S.wx = wx; S.wy = wy;
  let top = -1;

  // the nunchaku on his belt
  const f = sticksOf(eq.offhand);
  if (f?.pts.sticks) {
    S.len = f.pts.sticks.map(([c0, c1]) => Math.hypot(c1[0] - c0[0], c1[1] - c0[1]) / 2 * N.sticks);
    const [ax, ay] = world(F.L[0] + N.belt[0], F.L[1] + N.belt[1]);
    swing(S, ax, ay, s, dt, hx, hy, art.flip, p.acro ? p.lastArt?.ar || 0 : 0);
    drawSticks(ctx, p, S, f, s, ax, ay, art.flip, fx);
    top = Math.max(top, f.rarity);
  } else S.pts = null;

  // the katana in his right fist
  const it = eq.weapon, pose = stance(p, S, dt);
  if (katanaOf(it) && heldModel3DReady(it, 'ninja')) {
    const [gx, gy] = local(F.R[0], F.R[1]), unit = s * N.scale, el = heldElement(it) || heldFree(it, 'ninja')?.element || 'shadow', R = it.rarity | 0;
    ctx.save();
    if (p.alpha !== undefined) ctx.globalAlpha = p.alpha;
    ctx.translate(art.x, art.y); if (art.flip) ctx.scale(-1, 1); ctx.rotate(rot); ctx.scale(sx, sy);
    if (pose.sweep && S.reach) sweep(ctx, gx, gy, pose.sweep.tail, pose.a, S.reach, fxColor(R >= 2 ? el : 'astral').map((v) => (v + 255) >> 1), (0.5 + R * 0.05) * pose.sweep.alpha * ctx.globalAlpha);
    ctx.save();
    ctx.beginPath(); ctx.rect(gx - 4096, gy - 4096, 8192, 8192); ctx.arc(gx, gy, N.fist * s, 0, Math.PI * 2, true); ctx.clip('evenodd'); // the handle passes through his fist
    const v = drawHeldModel3D(ctx, it, 'ninja', gx, gy, pose.a, 0, { unit, origin: true, spin: pose.spin, tilt: pose.tilt, rim: (...r) => outline(ctx, s * 0.6, ...r) });
    ctx.restore();
    if (v) {
      if (v.pts.tip) S.reach = Math.hypot(v.pts.tip[0] - gx, v.pts.tip[1] - gy);
      const gl = (now % 4.2) / 0.55; // now and then a gleam runs up the edge
      if (fx && gl < 1 && v.pts.tip && v.pts.guard && !pose.sweep) {
        const x = v.pts.guard[0] + (v.pts.tip[0] - v.pts.guard[0]) * gl, y = v.pts.guard[1] + (v.pts.tip[1] - v.pts.guard[1]) * gl, r = s * 3.2 * Math.sin(Math.PI * gl) * v.face;
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha *= 0.85; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.max(0.3, s * 0.45);
        ctx.beginPath(); ctx.moveTo(x - r, y); ctx.lineTo(x + r, y); ctx.moveTo(x, y - r); ctx.lineTo(x, y + r); ctx.stroke(); ctx.restore();
      }
      const rad = (q) => q && [q[0], q[1], q[2] / s]; // radii in art px, as the effects want them
      drawHeldFx(ctx, { rarity: R, element: el, gems: [], pts: { ...v.pts, head: rad(v.pts.head) || [gx, gy, 4], orbit: rad(v.pts.orbit) } }, now, (x, y) => [x, y], s, { fx, seed: 11, size: 1.3, quality: G.lowFx ? 0.5 : 1 });
      top = Math.max(top, R);
    }
    ctx.restore();
  }
  if (fx && top >= 4) addLight(p.x, p.y, 1.4 + (top - 4) * 0.8, 0.3);
}
