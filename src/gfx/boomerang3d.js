// The Boomerang Knight's boomerangs (and chakrams) as real 3D models, drawn with Canvas 2D. Each is a thin slab: a
// flat outline (two swept arms round an elbow, or a spiked ring) given thickness. A flat face under the game's
// parallel 2:1 isometric projection is an exact affine map, so a face is one transformed Path2D fill, and the edge is
// the same outline stacked a few times along the slab's normal. The model spins in its own plane round its centre;
// thrown, it leaves the hand near upright and lays over flat as it flies, the way a real boomerang does, banking about
// its line of flight, and its shadow slides along the ground beneath it.
// Looks per skill (RANG_SKINS): a solid colour, stripes near the wing tips (a band round a chakram) and a size.
import { isoX, isoY, HW, HH } from '../core/view.js';
import { G } from '../state.js';

const K = HH / HW;                                   // ground depth -> screen y (2:1 iso)
const VIEW = [0, 1, K];                              // (right, toward the camera, up): the parallel view direction
const LIGHT = norm([-0.45, 0.4, 0.8]);               // top-left, a little toward the camera
function norm(v) { const l = Math.hypot(...v); return v.map((c) => c / l); }

/** Skill name -> { c: body colour, s: stripe colour, k: size (on top of the skill's own radius), m: model }. */
export const RANG_SKINS = {
  'Boomerang': { c: '#c8873a', s: '#f4e8c8', k: 1 },
  'Twin Rang': { c: '#d84a3a', s: '#ffffff', k: 0.9 },
  'Ricochet': { c: '#e8c030', s: '#202020', k: 0.9 },
  'Heavy Rang': { c: '#5a5f6a', s: '#e8b030', k: 1.1 },
  'Tri-Rang': { c: '#3aa060', s: '#ffffff', k: 0.9 },
  'Seeking Rang': { c: '#a04ad8', s: '#f0e0ff', k: 1 },
  'Flame Rang': { c: '#ff6a1a', s: '#ffe060', k: 1 },
  'Frost Rang': { c: '#7ad8ff', s: '#ffffff', k: 1 },
  'Rang Storm': { c: '#20a0a0', s: '#ffffff', k: 0.85 },
  'Storm Rang': { c: '#3050e0', s: '#fff060', k: 1 },
  'Splitting Rang': { c: '#e05aa0', s: '#ffffff', k: 1.05 },
  'Infinity Rang': { c: '#8a40ff', s: '#40ffe0', k: 0.9 },
  'Rang Barrage': { c: '#d8a040', s: '#402010', k: 0.8 },
  'Orbiting Rangs': { c: '#d0b060', s: '#603010', k: 1 },
  'Rangnarok': { c: '#c02020', s: '#ffd040', k: 0.85 },
  'Black Hole Rang': { c: '#2a1840', s: '#b060ff', k: 0.9 },
  'Rang Rain': { c: '#40b0e0', s: '#ffffff', k: 0.75 },
  'Wind Rang': { c: '#c8f0d8', s: '#30a070', k: 1.05 },
  'Hurricane Rang': { c: '#30c890', s: '#ffffff', k: 0.9 },
  'Tempest Rang': { c: '#4060ff', s: '#c0e0ff', k: 1 },
  'Thunder Rang': { c: '#ffd020', s: '#3040a0', k: 0.8 },
  'Gale Rang': { c: '#3ac8a8', s: '#ffffff', k: 1 },
  'Ricochet Storm': { c: '#f0a020', s: '#202020', k: 1 },
  'Thunder Return': { c: '#5a70ff', s: '#fff060', k: 1.1 },
  'Halo of Rangs': { c: '#f0f0f0', s: '#ffc040', k: 0.9 },
  'Orbit Barrage': { c: '#2ab0d0', s: '#ffffff', k: 0.8 },
  'Thousand Rangs': { c: '#e04040', s: '#ffffff', k: 0.75 },
  'Chakram': { c: '#c8d0d8', s: '#3ac8a8', k: 1, m: 'chakram' },
  'Celestial Chakram': { c: '#ffe8a0', s: '#ffffff', k: 1.3, m: 'chakram' },
  'Twin Chakrams': { c: '#80a0ff', s: '#ffffff', k: 0.9, m: 'chakram' },
  'Storm Orbit': { c: '#a0c0ff', s: '#fff060', k: 0.9, m: 'chakram' },
  'Heart of the Gale': { c: '#60e0c0', s: '#ffffff', k: 0.9, m: 'chakram' },
  // the Trick Shot's charge ring and its golden boomerang (sigs/boomerang.js)
  'sig_lit': { c: '#3a9cff', s: '#ffffff', k: 0.8 },
  'sig_dim': { c: '#46506a', s: '#8a96b0', k: 0.8 },
  'trick_shot': { c: '#ffc830', s: '#ffffff', k: 1.5 },
};
const ELEM_COL = { phys: '#c8873a', fire: '#ff6a1a', cold: '#7ad8ff', light: '#5a70ff', holy: '#ffe8a0', arcane: '#a060ff', shadow: '#3a2850', poison: '#60c040', acid: '#90d030', blood: '#c02030' };
/** The look for a skill (unknown skills, monsters' boomerangs: a colour by element). */
export function rangSkin(name, fx, el) {
  const s = RANG_SKINS[name];
  if (s) return s;
  return { c: ELEM_COL[el] || '#c8873a', s: '#ffffff', k: 1, m: fx === 'chakram' ? 'chakram' : 'rang' };
}

// ------------------------------------------------------------------ the models (model units = screen px at size 1)
const MODELS = {};
const T = { rang: 2, chakram: 1.6 };              // slab thickness
function model(kind) {
  if (MODELS[kind]) return MODELS[kind];
  if (typeof Path2D === 'undefined') return null;
  return (MODELS[kind] = kind === 'chakram' ? chakramModel() : rangModel());
}
/** Two arms round a rounded elbow, a little narrower at the tips; spun round its centroid. */
function rangModel() {
  const N = 16, L = 10, B = 7, W0 = 5.6, W1 = 4.2, e = 0.3;
  const bend = (s) => -B * (1 - (Math.sqrt(s * s + e * e) - e) / (Math.sqrt(1 + e * e) - e));
  const C = [], Nr = [], Wd = [];
  for (let i = 0; i <= 2 * N; i++) {
    const s = i / N - 1, x = s * L, y = bend(s), ds = 0.001, dx = 2 * ds * L, dy = bend(Math.min(1, s + ds)) - bend(Math.max(-1, s - ds)), l = Math.hypot(dx, dy);
    C.push([x, y]); Nr.push([-dy / l, dx / l]); Wd.push((W0 + (W1 - W0) * Math.abs(s)) / 2);
  }
  const side = (i, k) => [C[i][0] + Nr[i][0] * Wd[i] * k, C[i][1] + Nr[i][1] * Wd[i] * k];
  const pts = [];
  for (let i = 0; i <= 2 * N; i++) pts.push(side(i, 1));
  const capTip = (i, from) => { // round the tip: a half circle round its far end, from one side to the other
    const [cx, cy] = C[i], a0 = Math.atan2(Nr[i][1], Nr[i][0]) + from;
    for (let k = 1; k < 6; k++) { const a = a0 - Math.PI * k / 6; pts.push([cx + Math.cos(a) * Wd[i], cy + Math.sin(a) * Wd[i]]); }
  };
  capTip(2 * N, 0);
  for (let i = 2 * N; i >= 0; i--) pts.push(side(i, -1));
  capTip(0, Math.PI);
  let cx = 0, cy = 0; for (const [x, y] of pts) { cx += x; cy += y; } cx /= pts.length; cy /= pts.length;
  const out = new Path2D(); pts.forEach(([x, y], i) => (i ? out.lineTo(x - cx, y - cy) : out.moveTo(x - cx, y - cy))); out.closePath();
  const stripes = new Path2D();
  const band = (s0, s1) => { // a band across the arm between centreline params s0 and s1 (indices)
    const a = Math.round((s0 + 1) * N), b = Math.round((s1 + 1) * N), q = [];
    for (let i = a; i <= b; i++) q.push(side(i, 1.02));
    for (let i = b; i >= a; i--) q.push(side(i, -1.02));
    q.forEach(([x, y], i) => (i ? stripes.lineTo(x - cx, y - cy) : stripes.moveTo(x - cx, y - cy))); stripes.closePath();
  };
  band(0.62, 0.69); band(0.81, 0.88); band(-0.69, -0.62); band(-0.88, -0.81);
  const edge = new Path2D(), eq = []; // a thin strip along the leading edge, where the glint runs
  for (let i = 2; i <= 2 * N - 2; i++) eq.push(side(i, 0.78));
  for (let i = 2 * N - 2; i >= 2; i--) eq.push(side(i, 0.45));
  eq.forEach(([x, y], i) => (i ? edge.lineTo(x - cx, y - cy) : edge.moveTo(x - cx, y - cy))); edge.closePath();
  return { out, stripes, edge, fill: 'nonzero' };
}
/** A ring with eight swept spikes and a hole in the middle. */
function chakramModel() {
  const out = new Path2D(), R = 7.5, r = 4.2, n = 8;
  for (let i = 0; i < n * 4; i++) {
    const k = i % 4, a = (Math.floor(i / 4) + [0, 0.35, 0.5, 0.85][k]) * Math.PI * 2 / n, rr = k === 2 ? R + 3 : R;
    i ? out.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : out.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  out.closePath(); out.moveTo(r, 0); out.arc(0, 0, r, 0, Math.PI * 2, true);
  const stripes = new Path2D(); stripes.arc(0, 0, 6.6, 0, Math.PI * 2); stripes.arc(0, 0, 5.4, 0, Math.PI * 2, true);
  const edge = new Path2D(); edge.arc(0, 0, R - 0.2, -2.4, -0.6); edge.arc(0, 0, R - 1.4, -0.6, -2.4, true); edge.closePath();
  return { out, stripes, edge, fill: 'evenodd' };
}

// ------------------------------------------------------------------ colour
const SHADES = new Map();
function shade(hex, f) {
  const q = Math.round(f * 20), key = hex + q;
  let v = SHADES.get(key);
  if (!v) {
    const n = parseInt(hex.slice(1), 16), g = q / 20, c = (x) => Math.max(0, Math.min(255, Math.round(x * g)));
    v = `rgb(${c(n >> 16)},${c((n >> 8) & 255)},${c(n & 255)})`; SHADES.set(key, v);
  }
  return v;
}

const LOD = { frame: -1, n: 0 }, RICH = 16;

/**
 * Draw one boomerang at screen point (px, py).
 *   o.skin  a RANG_SKINS entry (rangSkin)      o.size   scale (the skill's radius x visual scale)
 *   o.spin  angle in its own plane (rad)       o.head   heading on the ground, screen-aligned (rad, 0 = screen right)
 *   o.bank  roll about the heading (0 flat, pi/2 upright)    o.lift  px above the ground, for the shadow (0: none)
 *   o.alpha overall opacity                    o.blur   spin blur ghosts (0..1)
 */
export function drawRang3D(ctx, px, py, o) {
  const sk = o.skin || RANG_SKINS.Boomerang, M = model(sk.m || 'rang');
  if (!M) return false;
  if (LOD.frame !== G.frame) { LOD.frame = G.frame; LOD.n = 0; }
  const rich = ++LOD.n <= RICH; // past the first RICH in a frame (a volley of 24): no outline, glint or spin blur
  const s = (o.size || 1) * (sk.k || 1), hd = o.head || 0, bk = o.bank || 0;
  const ch = Math.cos(hd), sh = Math.sin(hd), cb = Math.cos(bk), sb = Math.sin(bk);
  const R = (sp) => { // Rz(head) . Rx(bank) . Rz(spin): where model x, model y and the face normal point
    const cs = Math.cos(sp), ss = Math.sin(sp);
    return [ch * cs - sh * ss * cb, sh * cs + ch * ss * cb, ss * sb,
      -ch * ss - sh * cs * cb, -sh * ss + ch * cs * cb, cs * sb,
      sh * sb, -ch * sb, cb];
  };
  const draw = (sp, a, full) => {
    const m = R(sp);
    const ax = m[0] * s, ay = (K * m[1] - m[2]) * s, cx = m[3] * s, cy = (K * m[4] - m[5]) * s; // model x, y -> screen
    const tx = m[6] * s, ty = (K * m[7] - m[8]) * s;                                          // normal -> screen
    const facing = m[7] * VIEW[1] + m[8] * VIEW[2] >= 0 ? 1 : -1;                              // which face we see
    const nx = m[6] * facing, ny = m[7] * facing, nz = m[8] * facing;
    const lit = Math.max(0, nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]);
    const th = T[sk.m || 'rang'], steps = rich ? Math.max(2, Math.min(4, Math.ceil(Math.hypot(tx, ty) * th * 1.2))) : 2;
    ctx.globalAlpha = a;
    if (full) { // the edge: the outline stacked from the far face to the near one, darkest at the back
      const ol = shade(sk.c, 0.16), d0 = -facing * th * 0.5, d1 = -d0;
      if (rich) for (const [ox, oy, dd] of [[-0.8, 0, d0], [0.8, 0, d0], [0, -0.8, d1], [0, 0.8, d0]]) { // a dark outline
        ctx.save(); ctx.transform(ax, ay, cx, cy, px + tx * dd + ox, py + ty * dd + oy);
        ctx.fillStyle = ol; ctx.fill(M.out, M.fill); ctx.restore();
      }
      for (let i = 0; i < steps; i++) {
        const d = facing * th * (i / (steps - 1) - 0.5);
        ctx.save(); ctx.transform(ax, ay, cx, cy, px + tx * d, py + ty * d);
        ctx.fillStyle = shade(sk.c, 0.32 + 0.18 * i / steps); ctx.fill(M.out, M.fill); ctx.restore();
      }
    }
    const d = facing * th * 0.5;
    ctx.save(); ctx.transform(ax, ay, cx, cy, px + tx * d, py + ty * d);
    ctx.fillStyle = shade(sk.c, 0.6 + 0.55 * lit); ctx.fill(M.out, M.fill);
    if (full) { ctx.fillStyle = shade(sk.s, 0.65 + 0.45 * lit); ctx.fill(M.stripes, 'evenodd'); }
    if (full && rich) { // a glint sweeps round as the leading edge turns to the light
      const g = Math.max(0, Math.cos(sp + hd - 2.2)) ** 6 * (0.3 + 0.7 * lit);
      if (g > 0.03) {
        ctx.globalAlpha = a * g; ctx.fillStyle = '#ffffff'; ctx.fill(M.edge);
      }
    }
    ctx.restore();
  };
  const a0 = o.alpha ?? 1, prev = ctx.globalAlpha;
  if (o.lift) { // the shadow: the outline flattened onto the ground
    const m = R(o.spin || 0);
    ctx.save(); ctx.transform(m[0] * s, K * m[1] * s, m[3] * s, K * m[4] * s, px, py + o.lift);
    ctx.globalAlpha = a0 * 0.28 * Math.max(0.3, 1 - o.lift / 160); ctx.fillStyle = '#000000'; ctx.fill(M.out, M.fill); ctx.restore();
  }
  const blur = o.blur ?? 0.8;
  if (blur > 0 && rich) draw((o.spin || 0) - 0.35 * (o.spinDir || 1), a0 * 0.3 * blur, false);
  draw(o.spin || 0, a0, true);
  ctx.globalAlpha = prev;
  return true;
}

/** Heading on the ground (screen-aligned, as drawRang3D wants it) of a world-space direction (dx, dy in tiles). */
export const groundHeading = (dx, dy) => Math.atan2(dx + dy, dx - dy);

/** A thrown boomerang projectile (hazards.js Projectile): it leaves the hand near upright, lays over as it flies,
 *  climbs a little and drops back to his hand; spins the way it was thrown. */
export function drawFlyingRang(ctx, pr) {
  if (!pr.skinObj) pr.skinObj = rangSkin(pr.skin, pr.fx, pr.el);
  const chakram = (pr.skinObj.m || 'rang') === 'chakram';
  const out = pr.returning ? 1 : Math.min(1, pr.t / Math.max(0.05, pr.turnAt || pr.life * 0.5));
  const ease = out * out * (3 - 2 * out);
  const bank = chakram ? 0.35 : pr.returning ? 0.22 : 1.15 - 0.9 * ease;
  let rise = 9 * Math.sin(ease * Math.PI / 2);
  if (pr.returning && pr.src) rise = 9 * Math.min(1, Math.hypot(pr.x - pr.src.x, pr.y - pr.src.y) / 2.5);
  const z = pr.z + rise, x = isoX(pr.x, pr.y), gy = isoY(pr.x, pr.y), head = groundHeading(pr.vx, pr.vy);
  // lean toward the camera's side of the flight line, so the face shows rather than going edge-on mid-flight
  return drawRang3D(ctx, x, gy - z, { skin: pr.skinObj, size: pr.size, spin: pr.t * 17, head, bank: Math.cos(head) > 0 ? -bank : bank, lift: z });
}
