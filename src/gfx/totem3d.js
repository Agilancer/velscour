// The Totem Master's GREAT TOTEM (his class signature, src/game/sigs/totem.js) as a real 3D model. Built in code, no
// art file: a stepped stone plinth with glowing runes and roots gripping it, a carved log of one segment per spirit
// face (bear: round ears and a muzzle; wolf: pointed ears, a long snout and fangs; thunderbird: a teal brow, side
// feathers and a hooked beak; serpent: a flared hood, slit eyes, fangs and a forked tongue), and a thunderbird crown
// with a crest and two hinged plank wings. Seams between the faces glow spirit teal.
// The mesh is built once per face order and kept on the GPU; everything that moves is a uniform: lift (it grows out of
// the ground: anything below z = 0 is cut away, the cut rim glows hot), the wing fold (folded up while it rises,
// snapped open when it lands), each face's eye glow, the runes, a white flash for the blast. Drawn with WebGL on one
// small shared canvas (z-buffer, lit from the top-left, wood grain, a teal rim) and copied into the 2D frame.
// Without WebGL drawTotem3D returns false and the caller draws the flat pole.
import { HW } from '../core/view.js';

const TAU = Math.PI * 2;
/** World px along a tile edge: the 2:1 iso camera's ground scale. */
export const TOTEM_TILE = HW * Math.SQRT2;
const S2 = Math.SQRT1_2, C30 = Math.sqrt(3) / 2;
const CAM = [[S2, -S2, 0], [0.5 * S2, 0.5 * S2, -C30], [C30 * S2, C30 * S2, 0.5]];   // world -> screen (right, down, toward the viewer)
const MAXC = 1024;
const norm = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (u, v) => [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
const dot = (u, v) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
const LIGHT = norm([-0.5, -0.55, 0.67]);

// model units ~ world px at k = 1; x forward (the carved faces), y left, z up
const R = 15, SEG = 32, BASE = 12;
/** Model height of the pole's top for n faces (the crown adds ~30 more). */
export const totemTop = (n) => BASE + n * SEG;
/** Game height (screen px over the ground, at scale k) of face i's eyes; face 0 is the top one. */
export const totemFaceZ = (i, n, k = 1) => (BASE + (n - 1 - i) * SEG + SEG * 0.62) * k * C30;
/** Game height of the whole totem at scale k, crown included. */
export const totemHeight = (n, k = 1) => (totemTop(n) + 30) * k * C30;

// ------------------------------------------------------------------ colours
const hex = (h) => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
const mix = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const C = {
  wood: hex('#6a4426'), dark: hex('#3a2412'), groove: hex('#1e1008'), stone: hex('#77726a'), stone2: hex('#5a5650'),
  teal: hex('#2a8a9a'), cream: hex('#e0b080'), white: hex('#ecebf2'), black: hex('#1a1008'), red: hex('#c8402a'),
  yellow: hex('#ffc040'), tongue: hex('#ff3050'), glow: hex('#5ae8c0'),
};
const PAINT = { bear: hex('#a0582a'), wolf: hex('#8a92a0'), eagle: hex('#c8402a'), serpent: hex('#4a9a40') };
const SPIRIT = { bear: hex('#ffb060'), wolf: hex('#c0d8ff'), eagle: hex('#a8ccff'), serpent: hex('#b0ff70') };

// ------------------------------------------------------------------ mesh building
// vertex: x y z, nx ny nz, r g b, emissive, glow group (0 none, 1-4 face eyes, 5 runes), hinge (+1 left wing, -1 right), grain
const STRIDE = 13;
let buf = new Float32Array(1 << 16), n = 0;
const M = { e: 0, g: 0, h: 0, w: 0 };                // the current material
const mat = (o) => { M.e = 0; M.g = 0; M.h = 0; M.w = 0; Object.assign(M, o); };
function vtx(p, nr, c) {
  if (n + STRIDE > buf.length) { const b = new Float32Array(buf.length * 2); b.set(buf); buf = b; }
  buf[n++] = p[0]; buf[n++] = p[1]; buf[n++] = p[2]; buf[n++] = nr[0]; buf[n++] = nr[1]; buf[n++] = nr[2];
  buf[n++] = c[0]; buf[n++] = c[1]; buf[n++] = c[2]; buf[n++] = M.e; buf[n++] = M.g; buf[n++] = M.h; buf[n++] = M.w;
}
// Triangles are always wound counter-clockwise seen from outside (the shader tells the inside, seen through the
// ground cut, by gl_FrontFacing). Smooth: given outward normals. Flat: outward = away from the solid's centre.
function triS(a, b, c, na, nb, nc, ca, cb = ca, cc = cb) {
  if (dot(cross(sub(b, a), sub(c, a)), [na[0] + nb[0] + nc[0], na[1] + nb[1] + nc[1], na[2] + nb[2] + nc[2]]) < 0) { [b, c] = [c, b]; [nb, nc] = [nc, nb]; [cb, cc] = [cc, cb]; }
  vtx(a, na, ca); vtx(b, nb, cb); vtx(c, nc, cc);
}
function triF(a, b, c, col, ctr) {
  let nr = norm(cross(sub(b, a), sub(c, a)));
  const m = [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3, (a[2] + b[2] + c[2]) / 3];
  if (dot(nr, sub(m, ctr)) < 0) { [b, c] = [c, b]; nr = [-nr[0], -nr[1], -nr[2]]; }
  vtx(a, nr, col); vtx(b, nr, col); vtx(c, nr, col);
}
/** A convex six-sided solid: corners 0-3 one end, 4-7 the other (same order). col: one colour or [end0, end1, sides]. */
function hexa(P, col) {
  const ctr = [0, 1, 2].map((k) => P.reduce((s, p) => s + p[k], 0) / 8);
  const [c0, c1, cs] = Array.isArray(col[0]) ? col : [col, col, col];
  const q = (a, b, c, d, k) => { triF(P[a], P[b], P[c], k, ctr); triF(P[a], P[c], P[d], k, ctr); };
  q(0, 1, 2, 3, c0); q(4, 5, 6, 7, c1);
  q(0, 1, 5, 4, cs); q(1, 2, 6, 5, cs); q(2, 3, 7, 6, cs); q(3, 0, 4, 7, cs);
}
/** An axis-aligned block. */
const blk = (x0, x1, y0, y1, z0, z1, col) => hexa([[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], col);
/** A frustum along x: from x0 (centre y0, z0, half sizes hy0, hz0) to x1. */
function fx(x0, x1, [y0, z0, hy0, hz0], [y1, z1, hy1, hz1], col) {
  hexa([[x0, y0 - hy0, z0 - hz0], [x0, y0 + hy0, z0 - hz0], [x0, y0 + hy0, z0 + hz0], [x0, y0 - hy0, z0 + hz0],
    [x1, y1 - hy1, z1 - hz1], [x1, y1 + hy1, z1 - hz1], [x1, y1 + hy1, z1 + hz1], [x1, y1 - hy1, z1 + hz1]], col);
}
/** A tapered flat plank from p0 to p1 (widths w0, w1), thick along the model's x (it faces the viewer). */
function plank(p0, p1, w0, w1, th, col) {
  const ax = norm(sub(p1, p0)), s = norm(cross(ax, [1, 0, 0])), t = [th / 2, 0, 0];
  const c = (p, w, k, f) => [p[0] + s[0] * w * k + t[0] * f, p[1] + s[1] * w * k, p[2] + s[2] * w * k];
  hexa([c(p0, w0, -0.5, -1), c(p0, w0, 0.5, -1), c(p0, w0, 0.5, 1), c(p0, w0, -0.5, 1), c(p1, w1, -0.5, -1), c(p1, w1, 0.5, -1), c(p1, w1, 0.5, 1), c(p1, w1, -0.5, 1)], col);
}
/** A tapered square spike/tube from p0 (half size r0) to p1 (r1), turned so one face looks along `up`. */
function limb(p0, p1, r0, r1, col, up = [0, 0, 1]) {
  const ax = norm(sub(p1, p0));
  let s = cross(ax, up); if (Math.hypot(...s) < 1e-3) s = cross(ax, [1, 0, 0]);
  s = norm(s); const u = norm(cross(s, ax));
  const c = (p, r, a, b) => [p[0] + (s[0] * a + u[0] * b) * r, p[1] + (s[1] * a + u[1] * b) * r, p[2] + (s[2] * a + u[2] * b) * r];
  hexa([c(p0, r0, -1, -1), c(p0, r0, 1, -1), c(p0, r0, 1, 1), c(p0, r0, -1, 1), c(p1, r1 || 0.05, -1, -1), c(p1, r1 || 0.05, 1, -1), c(p1, r1 || 0.05, 1, 1), c(p1, r1 || 0.05, -1, 1)], col);
}
/**
 * A surface of revolution round the vertical through (cx, cy). rings: [z, rx, ry] (ry defaults to rx);
 * col(angle, z, ring index) -> colour. flat: faceted (stone); cap: close the ends.
 */
function lathe(cx, cy, rings, seg, col, { flat = false, cap = false, phase = 0 } = {}) {
  const P = [], N = [], K = [];
  rings.forEach((r, i) => {
    const p = rings[Math.max(0, i - 1)], q = rings[Math.min(rings.length - 1, i + 1)];
    const dz = q[0] - p[0], slope = dz ? (q[1] - p[1]) / dz : (q[1] > p[1] ? -1e3 : 1e3);
    P.push([]); N.push([]); K.push([]);
    for (let j = 0; j <= seg; j++) {
      const a = phase + j / seg * TAU, ca = Math.cos(a), sa = Math.sin(a), rx = r[1], ry = r[2] ?? r[1];
      P[i].push([cx + ca * rx, cy + sa * ry, r[0]]);
      const nx = ca / Math.max(rx, 0.3), ny = sa / Math.max(ry, 0.3), m = Math.hypot(nx, ny) || 1;
      N[i].push(norm(dz ? [nx / m, ny / m, -slope] : [0, 0, r[1] < p[1] || r[1] < q[1] ? 1 : -1]));
      K[i].push(col(a, r[0], i));
    }
  });
  const ctr = [cx, cy, (rings[0][0] + rings[rings.length - 1][0]) / 2];
  for (let i = 0; i + 1 < rings.length; i++) {
    for (let j = 0; j < seg; j++) {
      const a = P[i][j], b = P[i + 1][j], c = P[i + 1][j + 1], d = P[i][j + 1];
      if (flat) { const k = K[i][j], ledge = Math.abs(a[2] - b[2]) < 1e-6, lc = [ctr[0], ctr[1], (a[2] + b[2]) / 2 + (ledge ? (rings[i + 1][1] < rings[i][1] ? -10 : 10) : 0)]; triF(a, b, c, k, lc); triF(a, c, d, k, lc); }
      else { triS(a, b, c, N[i][j], N[i + 1][j], N[i + 1][j + 1], K[i][j], K[i + 1][j], K[i + 1][j + 1]); triS(a, c, d, N[i][j], N[i + 1][j + 1], N[i][j + 1], K[i][j], K[i + 1][j + 1], K[i][j + 1]); }
    }
  }
  if (cap) for (const i of [0, rings.length - 1]) {
    const z = rings[i][0], up = i ? 1 : -1, cc = [cx, cy, z];
    for (let j = 0; j < seg; j++) triS(cc, P[i][j], P[i][j + 1], [0, 0, up], [0, 0, up], [0, 0, up], K[i][j]);
  }
}

// --- the pieces
function plinth() {
  mat({});
  lathe(0, 0, [[-30, 27], [5, 27], [5, 22.5], [9, 22.5], [9, 18.5], [12, 17.5]], 8, (a, z) => (z > 6 ? C.stone : C.stone2), { flat: true, cap: true, phase: TAU / 16 });
  mat({ e: 1, g: 5 });                                                       // runes on the plinth's faces
  for (let k = 0; k < 8; k++) {
    const a = k / 8 * TAU, r = 27 * Math.cos(TAU / 16) + 0.3, cx = Math.cos(a) * r, cy = Math.sin(a) * r, tx = -Math.sin(a), ty = Math.cos(a);
    const z = 1.5, h = 2.4, w = 1.5, d = 0.7;
    const mark = (u0, u1, z0, z1) => hexa([[cx + tx * u0, cy + ty * u0, z0], [cx + tx * u1, cy + ty * u1, z0], [cx + tx * u1 + Math.cos(a) * d, cy + ty * u1 + Math.sin(a) * d, z0], [cx + tx * u0 + Math.cos(a) * d, cy + ty * u0 + Math.sin(a) * d, z0],
      [cx + tx * u0, cy + ty * u0, z1], [cx + tx * u1, cy + ty * u1, z1], [cx + tx * u1 + Math.cos(a) * d, cy + ty * u1 + Math.sin(a) * d, z1], [cx + tx * u0 + Math.cos(a) * d, cy + ty * u0 + Math.sin(a) * d, z1]], C.glow);
    mark(-0.4, 0.4, z - h * 0.2, z + h); mark(-w, w, z + h * 0.35, z + h * 0.6);           // a little cross rune
  }
  mat({ w: 1 });                                                              // roots gripping the plinth
  for (let k = 0; k < 6; k++) {
    const a = k / 6 * TAU + 0.4, ca = Math.cos(a), sa = Math.sin(a);
    limb([ca * 12, sa * 12, 20], [ca * 19, sa * 19, 11], 3.2, 2.6, C.dark);
    limb([ca * 19, sa * 19, 11], [ca * 25, sa * 25, 7], 2.6, 1.8, C.dark);
    limb([ca * 25, sa * 25, 7], [ca * 30, sa * 30, -2], 1.8, 0.6, C.dark);
  }
}
function segment(kind, i, z0) {
  const z1 = z0 + SEG, P = PAINT[kind], ez = z0 + SEG * 0.62, g = i + 1;
  mat({ w: 1 });
  lathe(0, 0, [[z0, R - 2.2], [z0 + 2.4, R], [z1 - 2.4, R], [z1, R - 2.2]], 18, (a) => mix(P, C.wood, Math.max(0, -Math.cos(a)) * 0.55));
  mat({ e: 0.9, g: 5 });                                                       // the glowing seam
  lathe(0, 0, [[z0 - 0.6, R - 1.6], [z0 + 0.6, R - 1.6]], 18, () => C.glow);
  mat({ w: 0.6 });
  const brow = mix(P, C.black, 0.25);
  const eyes = (wide, h, gap, slit) => {
    mat({ e: 1, g });
    for (const s of [1, -1]) blk(R - 1.5, R + 1.3, s * gap, s * (gap + wide), ez - h, ez + h, SPIRIT[kind]);
    mat({});
    if (slit) for (const s of [1, -1]) blk(R + 1.3, R + 1.7, s * (gap + wide / 2 - 0.4), s * (gap + wide / 2 + 0.4), ez - h, ez + h, C.black);
  };
  if (kind === 'bear') {
    for (const s of [1, -1]) { mat({ w: 0.6 }); lathe(R - 5, s * 12, [[z1 - 10, 0], [z1 - 9, 3.4], [z1 - 6.5, 5.6], [z1 - 2.5, 5.4], [z1, 3.4], [z1 + 0.8, 0]], 10, () => P); mat({}); blk(R + 0.2, R + 1.2, s * 10, s * 14, z1 - 7, z1 - 2.5, C.cream); }
    blk(R - 2, R + 2.2, -10, 10, ez + 2.6, ez + 5.2, brow);
    eyes(4, 1.6, 2.5);
    mat({ w: 0.4 }); fx(R - 3, R + 8, [0, z0 + SEG * 0.33, 7, 5.2], [0, z0 + SEG * 0.31, 5, 3.8], C.cream);
    mat({}); blk(R + 6.4, R + 9, -2.6, 2.6, z0 + SEG * 0.33, z0 + SEG * 0.33 + 3.6, C.black);    // the nose
    blk(R + 4, R + 7.6, -4.5, 4.5, z0 + SEG * 0.16 - 1, z0 + SEG * 0.16 + 0.3, C.black);         // the mouth
    for (const s of [1, -1]) limb([R + 6.6, s * 3, z0 + SEG * 0.18], [R + 6.8, s * 3, z0 + SEG * 0.06], 1, 0.2, C.white);
  } else if (kind === 'wolf') {
    for (const s of [1, -1]) { mat({ w: 0.5 }); limb([R - 6, s * 9.5, z1 - 7], [R - 3, s * 17, z1 + 5], 4.4, 0.3, P); mat({}); limb([R - 1.8, s * 10.4, z1 - 6], [R - 0.4, s * 15.4, z1 + 2], 2.2, 0.2, C.black); }
    blk(R - 2, R + 1.8, -9, 9, ez + 2.2, ez + 4.4, brow);
    eyes(4.5, 1.1, 2);
    mat({ w: 0.3 }); fx(R - 3, R + 13, [0, z0 + SEG * 0.36, 6.2, 5], [0, z0 + SEG * 0.3, 3, 2.8], [C.white, C.white, mix(C.white, P, 0.25)]);
    mat({}); blk(R + 11, R + 13.8, -2, 2, z0 + SEG * 0.36, z0 + SEG * 0.36 + 2.6, C.black);
    blk(R + 2, R + 12.4, -3.4, 3.4, z0 + SEG * 0.16, z0 + SEG * 0.2, C.tongue);                    // the open jaw
    for (const s of [1, -1]) limb([R + 9, s * 2.2, z0 + SEG * 0.22], [R + 9.6, s * 2.2, z0 + SEG * 0.06], 1, 0.15, C.white);
  } else if (kind === 'eagle') {
    mat({}); blk(R - 1.6, R + 2.2, -12, 12, ez + 2.4, ez + 6.4, C.teal);                        // the painted brow
    eyes(4, 1.8, 2.8);
    for (const s of [1, -1]) { mat({ w: 0.4 }); plank([0, s * (R - 2), z0 + SEG * 0.55], [-2, s * (R + 9), z0 + SEG * 0.75], 9, 3, 3, C.red); mat({}); plank([-2, s * (R + 8), z0 + SEG * 0.73], [-3, s * (R + 12), z0 + SEG * 0.8], 3, 0.4, 3.2, C.teal); }
    mat({}); const bz = z0 + SEG * 0.4;
    fx(R - 3, R + 8, [0, bz, 5.2, 5.4], [0, bz - 1, 3.6, 4], C.yellow);
    fx(R + 8, R + 12.5, [0, bz - 1, 3.6, 4], [0, bz - 3.4, 2, 2.6], C.yellow);
    limb([R + 12, 0, bz - 3.5], [R + 10.6, 0, bz - 10], 2.2, 0.3, mix(C.yellow, C.red, 0.3));     // the hook
    fx(R - 2, R + 6, [0, bz - 6, 4, 1.6], [0, bz - 6.4, 2.4, 1], mix(C.yellow, C.black, 0.4));     // the lower beak
  } else {
    for (const s of [1, -1]) {                                                 // the flared hood
      mat({ w: 0.4 }); hexa([[1, s * (R - 4), z0 + 3], [-3, s * (R - 4), z0 + 3], [-3, s * (R + 9), z0 + SEG * 0.42], [1, s * (R + 9), z0 + SEG * 0.42],
        [1, s * (R - 4), z1 + 3], [-3, s * (R - 4), z1 + 3], [-3, s * (R + 9), z1 - 4], [1, s * (R + 9), z1 - 4]], P);
      mat({}); blk(1, 1.8, s * (R + 2), s * (R + 6), z0 + SEG * 0.5, z1 - 6, C.cream);
    }
    eyes(4.4, 1.8, 2.2, true);
    mat({}); blk(R - 1.6, R + 1.6, -6, 6, z0 + SEG * 0.3, z0 + SEG * 0.36, C.black);              // the mouth
    for (const s of [1, -1]) limb([R + 0.6, s * 3.6, z0 + SEG * 0.32], [R + 1.6, s * 3.4, z0 + SEG * 0.08], 1.1, 0.15, C.white);
    blk(R, R + 9, -0.8, 0.8, z0 + SEG * 0.24, z0 + SEG * 0.29, C.tongue);                         // the forked tongue
    for (const s of [1, -1]) limb([R + 8.5, s * 0.3, z0 + SEG * 0.265], [R + 12.5, s * 2.4, z0 + SEG * 0.2], 0.7, 0.15, C.tongue);
    blk(R - 0.6, R + 0.9, -2.5, 2.5, z0 + 2, z0 + SEG * 0.2, C.cream);                           // belly scales
  }
}
const HZ = (n) => totemTop(n) - 5;                    // the wings' hinge height
function crown(top) {
  mat({ w: 0.5 });
  lathe(0, 0, [[top - 0.5, 12.5], [top + 5, 12], [top + 11, 9.5], [top + 16, 4.5], [top + 17.5, 0]], 16, () => C.red, { cap: true });
  mat({ e: 1, g: 5 });
  for (const s of [1, -1]) blk(8.6, 10.8, s * 2.6, s * 6.2, top + 8, top + 10.6, C.glow);
  mat({}); limb([8, 0, top + 7], [21, 0, top + 4.5], 3.6, 1.6, C.yellow); limb([20.6, 0, top + 4.6], [21.6, 0, top - 1.5], 1.7, 0.2, C.yellow);
  [[-1, C.teal], [0, C.white], [1, C.teal]].forEach(([j, c]) => { limb([-2, j * 2.4, top + 14], [-9, j * 6, top + 28 - Math.abs(j) * 4], 2.4, 0.3, c); });
  for (const s of [1, -1]) {                                                    // the hinged wings
    mat({ h: s, w: 0.5 });
    const hy = s * (R - 3), hz = top - 5;
    const arm = (u) => [-1, hy + s * 34 * u, hz + 2 + 15 * u];
    plank([-1, hy, hz + 2], arm(1), 11, 6, 3.2, C.red);
    mat({ h: s }); plank(arm(0.05), arm(0.95), 3.2, 2, 3.6, C.teal);           // the covert line
    for (let f = 0; f < 5; f++) {                                               // feathers hanging out and down
      const u = 0.25 + f * 0.19, r = arm(u), ang = -1.15 + f * 0.24, L = 15 + f * 2.2;
      const d = [0, s * Math.cos(ang), Math.sin(ang)], mid = [r[0] - 0.4 - f * 0.25, r[1] + d[1] * L * 0.6, r[2] + d[2] * L * 0.6], tip = [r[0] - 0.4 - f * 0.25, r[1] + d[1] * L, r[2] + d[2] * L];
      const root = [r[0] - 0.4 - f * 0.25, r[1], r[2]];
      plank(root, mid, 6.4, 5.6, 2.4, C.red); plank(mid, tip, 5.6, 1.2, 2.4, f % 2 ? C.white : C.black);
    }
    mat({ h: s, e: 1, g: 5 }); plank(arm(0.55), arm(0.7), 2.4, 2.4, 4, C.glow);   // a painted spirit eye on each wing
  }
  mat({});
}

const MESHES = new Map();
function buildMesh(faces) {
  n = 0;
  plinth();
  const nf = faces.length;
  faces.forEach((k, i) => segment(k, i, BASE + (nf - 1 - i) * SEG));
  crown(totemTop(nf));
  return buf.slice(0, n);
}

// ------------------------------------------------------------------ WebGL (one shared context and canvas)
const VS = `attribute vec3 aP; attribute vec3 aN; attribute vec3 aC; attribute float aE; attribute vec3 aG;
uniform mat4 uM; uniform mat3 uR; uniform float uLift; uniform float uFold; uniform float uHinge; uniform vec4 uGlow; uniform float uRune;
varying vec3 vN; varying vec3 vC; varying float vE; varying vec3 vM; varying float vZ; varying float vW; varying float vRune;
void main() {
  vRune = uRune;
  vec3 p = aP, nr = aN;
  if (aG.y != 0.0) {                                       // the wings turn round their hinge (x axis) to fold up
    float a = aG.y * uFold, c = cos(a), s = sin(a);
    vec2 d = vec2(p.y - aG.y * ${(R - 3).toFixed(1)}, p.z - uHinge);
    p.yz = vec2(aG.y * ${(R - 3).toFixed(1)} + d.x * c - d.y * s, uHinge + d.x * s + d.y * c);
    nr.yz = vec2(nr.y * c - nr.z * s, nr.y * s + nr.z * c);
  }
  p.z += uLift; vZ = p.z; vM = aP; vW = aG.z;
  gl_Position = uM * vec4(p, 1.0); vN = uR * nr; vC = aC;
  float g = aG.x;
  vE = aE * (g < 0.5 ? 1.0 : g < 1.5 ? uGlow.x : g < 2.5 ? uGlow.y : g < 3.5 ? uGlow.z : g < 4.5 ? uGlow.w : uRune);
}`;
const FS = `precision mediump float;
uniform vec3 uL; uniform float uFlash; uniform float uRim;
varying vec3 vN; varying vec3 vC; varying float vE; varying vec3 vM; varying float vZ; varying float vW; varying float vRune;
void main() {
  if (vZ < 0.0) discard;                                   // still under the ground
  vec3 teal = vec3(0.35, 0.95, 0.78);
  if (!gl_FrontFacing) {                                   // the inside, seen through the ground cut: heartwood, burning at the rim
    gl_FragColor = vec4(mix(vec3(0.16, 0.09, 0.04), teal, 0.55 * uRim), 1.0); return;
  }
  vec3 n = normalize(vN);
  float d = max(dot(n, uL), 0.0);
  float gr = sin(atan(vM.y, vM.x) * 23.0 + sin(vM.z * 0.21) * 2.2 + vM.z * 0.03);
  vec3 base = vC * (1.0 - vW * 0.16 * smoothstep(0.2, 1.0, gr));          // wood grain
  vec3 col = base * (0.4 + 0.75 * d);
  col += vec3(1.0, 0.95, 0.85) * pow(max(dot(n, normalize(uL + vec3(0.0, 0.0, 1.0))), 0.0), 12.0) * 0.18;
  float rim = 1.0 - max(n.z, 0.0);
  col += teal * rim * rim * (0.12 + 0.4 * vRune);                          // the spirit light round its edge
  col = mix(col, vC * 1.25 + vec3(0.12), clamp(vE, 0.0, 1.0));             // glowing eyes and runes
  col += teal * smoothstep(5.0, 0.0, vZ) * uRim;                           // the earth torn open at its foot
  col = mix(col, vec3(0.85, 1.0, 0.95), uFlash);
  gl_FragColor = vec4(min(col, vec3(1.0)), 1.0);
}`;
let gl = null, glc = null, prog = null, U = null, glDead = false, tries = 0, gen = 0;
function initGL() {
  if (gl && !gl.isContextLost()) return gl;
  if (glDead || typeof document === 'undefined' || ++tries > 4) { glDead = true; return null; }
  glc = document.createElement('canvas'); glc.width = glc.height = 128;
  glc.addEventListener('webglcontextlost', (e) => { e.preventDefault(); gl = null; });
  const g = glc.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, depth: true, stencil: false, preserveDrawingBuffer: false, powerPreference: 'low-power' });
  if (!g) { glDead = true; return null; }
  const sh = (type, src) => { const s = g.createShader(type); g.shaderSource(s, src); g.compileShader(s); if (!g.getShaderParameter(s, g.COMPILE_STATUS)) throw new Error(g.getShaderInfoLog(s)); return s; };
  try {
    prog = g.createProgram(); g.attachShader(prog, sh(g.VERTEX_SHADER, VS)); g.attachShader(prog, sh(g.FRAGMENT_SHADER, FS)); g.linkProgram(prog);
    if (!g.getProgramParameter(prog, g.LINK_STATUS)) throw new Error(g.getProgramInfoLog(prog));
  } catch (e) { console.warn('totem3d: ' + e.message); glDead = true; return null; }
  U = {}; for (const k of ['uM', 'uR', 'uL', 'uLift', 'uFold', 'uHinge', 'uGlow', 'uRune', 'uFlash', 'uRim']) U[k] = g.getUniformLocation(prog, k);
  for (const k of ['aP', 'aN', 'aC', 'aE', 'aG']) U[k] = g.getAttribLocation(prog, k);
  gl = g; gen++; MESHES.clear();
  return g;
}
/** True when WebGL works: drawTotem3D will draw. */
export const totem3DReady = () => !!initGL();

const YAW = Math.PI / 4 + 0.32;                         // faces the camera, turned a little so the snouts read
const rotZ = (a) => { const c = Math.cos(a), s = Math.sin(a); return [[c, -s, 0], [s, c, 0], [0, 0, 1]]; };
const mul = (A, B) => A.map((r) => [0, 1, 2].map((j) => r[0] * B[0][j] + r[1] * B[1][j] + r[2] * B[2][j]));
const ROT = mul(CAM, rotZ(YAW));
const FOLD = 1.25;                                      // the wings' folded angle (radians up)

/** The GPU mesh for this face order (and its screen box at k = 1, holding every lift and fold). */
function mesh(g, faces) {
  const key = faces.join(',');
  let m = MESHES.get(key);
  if (m) return m;
  if (MESHES.size > 6) { const [k0, v0] = MESHES.entries().next().value; g.deleteBuffer(v0.vbo); MESHES.delete(k0); }
  const data = buildMesh(faces), hz = HZ(faces.length);
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, zr = 1, zt = 0;
  for (let i = 0; i < data.length; i += STRIDE) {
    const hg = data[i + 11];
    for (const f of hg ? [0, FOLD * 0.5, FOLD] : [0]) {
      let px = data[i], py = data[i + 1], pz = data[i + 2];
      if (f) { const c = Math.cos(hg * f), s = Math.sin(hg * f), dy = py - hg * (R - 3), dz = pz - hz; py = hg * (R - 3) + dy * c - dz * s; pz = hz + dy * s + dz * c; }
      if (pz > zt) zt = pz;
      for (const z of [pz, Math.min(pz, 0)]) {
        const X = ROT[0][0] * px + ROT[0][1] * py + ROT[0][2] * z, Y = ROT[1][0] * px + ROT[1][1] * py + ROT[1][2] * z, Z = ROT[2][0] * px + ROT[2][1] * py + ROT[2][2] * z;
        if (X < x0) x0 = X; if (X > x1) x1 = X; if (Y < y0) y0 = Y; if (Y > y1) y1 = Y; if (Math.abs(Z) > zr) zr = Math.abs(Z);
      }
    }
  }
  const vbo = g.createBuffer();
  g.bindBuffer(g.ARRAY_BUFFER, vbo); g.bufferData(g.ARRAY_BUFFER, data, g.STATIC_DRAW);
  MESHES.set(key, m = { vbo, count: data.length / STRIDE, box: [x0 - 3, y0 - 3, x1 + 3, y1 + 3], zr: zr + 4, hz, top: zt + 1, tris: data.length / STRIDE / 3 });
  return m;
}

/**
 * Draw the great totem with the middle of its foot at (x, y) (current ctx units). faces: spirit kinds, top first
 * ('bear', 'wolf', 'eagle', 'serpent'). o: { k (px per model unit; the pole is ~170 units tall), rise (0 buried ..
 * 1 standing), fold (0 wings open .. 1 folded up), glow ([4] eye glow per face, top first, 0..1), rune (seams, runes
 * and the rim light, 0..1), flash (0..1 white), rim (0..1 the hot rim at the ground cut) }. Returns false without WebGL.
 */
export function drawTotem3D(ctx, x, y, faces, o = {}) {
  const g = initGL();
  if (!g || !faces.length) return false;
  const m = mesh(g, faces), k = o.k || 1, [bx0, by0, bx1, by1] = m.box.map((v) => v * k);
  const tf = ctx.getTransform();
  const res = Math.min(Math.max(0.25, Math.hypot(tf.a, tf.b)), MAXC / (bx1 - bx0), MAXC / (by1 - by0));
  const w = Math.max(1, Math.ceil((bx1 - bx0) * res)), h = Math.max(1, Math.ceil((by1 - by0) * res));
  const bw = w / res, bh = h / res, zr = m.zr * k;
  if (glc.width < w || glc.height < h) { glc.width = Math.min(MAXC, Math.max(glc.width, 1 << Math.ceil(Math.log2(w)))); glc.height = Math.min(MAXC, Math.max(glc.height, 1 << Math.ceil(Math.log2(h)))); }
  const Mx = [2 / bw, -2 / bh, -1 / zr], Mo = [-2 * bx0 / bw - 1, 2 * by0 / bh + 1, 0];
  const M4 = new Float32Array(16), R3 = new Float32Array(9);
  for (let c = 0; c < 3; c++) for (let r = 0; r < 3; r++) { M4[c * 4 + r] = Mx[r] * ROT[r][c] * k; R3[c * 3 + r] = ROT[r][c]; }
  M4[12] = Mo[0]; M4[13] = Mo[1]; M4[14] = Mo[2]; M4[15] = 1;
  const cw = Math.min(glc.width, w + 2), chh = Math.min(glc.height, h + 2);
  g.enable(g.SCISSOR_TEST); g.scissor(0, glc.height - chh, cw, chh);
  g.clearColor(0, 0, 0, 0); g.clearDepth(1); g.clear(g.COLOR_BUFFER_BIT | g.DEPTH_BUFFER_BIT);
  g.viewport(0, glc.height - h, w, h);
  g.enable(g.DEPTH_TEST); g.depthFunc(g.LEQUAL); g.disable(g.CULL_FACE); g.disable(g.BLEND);
  g.frontFace(g.CW);                                      // the y flip into clip space mirrors the winding
  g.useProgram(prog);
  g.bindBuffer(g.ARRAY_BUFFER, m.vbo);
  const F = 4 * STRIDE;
  g.enableVertexAttribArray(U.aP); g.vertexAttribPointer(U.aP, 3, g.FLOAT, false, F, 0);
  g.enableVertexAttribArray(U.aN); g.vertexAttribPointer(U.aN, 3, g.FLOAT, false, F, 12);
  g.enableVertexAttribArray(U.aC); g.vertexAttribPointer(U.aC, 3, g.FLOAT, false, F, 24);
  g.enableVertexAttribArray(U.aE); g.vertexAttribPointer(U.aE, 1, g.FLOAT, false, F, 36);
  g.enableVertexAttribArray(U.aG); g.vertexAttribPointer(U.aG, 3, g.FLOAT, false, F, 40);
  g.uniformMatrix4fv(U.uM, false, M4); g.uniformMatrix3fv(U.uR, false, R3); g.uniform3fv(U.uL, LIGHT);
  const gw = o.glow || [];
  g.uniform1f(U.uLift, -(1 - Math.max(0, Math.min(1, o.rise ?? 1))) * m.top);
  g.uniform1f(U.uFold, (o.fold || 0) * FOLD); g.uniform1f(U.uHinge, m.hz);
  g.uniform4f(U.uGlow, gw[0] || 0, gw[1] || 0, gw[2] || 0, gw[3] || 0);
  g.uniform1f(U.uRune, o.rune ?? 0.5); g.uniform1f(U.uFlash, o.flash || 0); g.uniform1f(U.uRim, o.rim || 0);
  g.drawArrays(g.TRIANGLES, 0, m.count);
  g.frontFace(g.CCW);
  ctx.drawImage(glc, 0, 0, w, h, x + bx0, y + by0, bw, bh);
  return true;
}
/** Triangle count of a face order's mesh (for tests). */
export const totemTris = (faces) => { const g = initGL(); return g ? mesh(g, faces).tris : 0; };
