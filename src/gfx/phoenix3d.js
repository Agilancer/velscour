// The Ranger's golden phoenix (her class signature, src/game/sigs/ranger.js) as a real 3D model. It is built in code,
// with no art file: a smooth body, neck and head with glowing eyes, an ivory beak, a three-plume crest, two jointed
// wings (gold coverts, flame-tipped secondaries and a fan of seven primaries) and five long tail plumes that stream
// behind and end in flame. Every frame it is posed (the wing beat with the hand lagging the arm, gliding, the wings
// swept back for the stoop, crest and tail swaying) and drawn with WebGL on one small shared canvas (z-buffer, lit
// from the top-left front, gold specular, a flame rim, glowing tips), then copied into the 2D frame.
// phoenixPoints gives the wing and tail tips in the world, so the caller can trail embers from them. Without WebGL
// drawPhoenix3D returns false and the caller draws the flat bird.
import { HW } from '../core/view.js';

const TAU = Math.PI * 2;
/** World px along a tile edge: the 2:1 iso camera's ground scale. */
export const PHOENIX_TILE = HW * Math.SQRT2;
const MAXC = 512;
const norm = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const LIGHT = norm([-0.45, -0.6, 0.66]);              // screen space: x right, y down, z toward the viewer
// world px (x along tile x, y along tile y, z up) -> screen px (right, down, toward the viewer): the iso camera
const S2 = Math.SQRT1_2, C30 = Math.sqrt(3) / 2;
const CAM = [[S2, -S2, 0], [0.5 * S2, 0.5 * S2, -C30], [C30 * S2, C30 * S2, 0.5]];
/** The game draws height z as z screen px; the camera foreshortens model "up" by cos 30. */
export const PHOENIX_UP = C30;

// ------------------------------------------------------------------ colours
const C = {
  hi: [1, 0.92, 0.55], gold: [1, 0.77, 0.24], amber: [0.94, 0.52, 0.1], flame: [1, 0.36, 0.06], ember: [0.8, 0.1, 0.04],
  ivory: [1, 0.94, 0.74], beak: [1, 0.6, 0.16], eye: [1, 1, 0.86],
};
const mix = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
/** A colour ramp through stops, k 0..1. */
function ramp(st, k) {
  const f = Math.max(0, Math.min(0.9999, k)) * (st.length - 1), i = Math.floor(f);
  return mix(st[i], st[i + 1], f - i);
}
const PLUME = [C.hi, C.gold, C.amber, C.flame, C.ember];
const FEATHER = [C.gold, C.amber, C.flame, C.ember];
const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// ------------------------------------------------------------------ the mesh, rebuilt per pose
// vertex: x, y, z, nx, ny, nz, r, g, b, emissive (model units ~ world px at k = 1; x forward, y left, z up)
const STRIDE = 10;
let buf = new Float32Array(40000), n = 0;
function vtx(p, nr, c, e) {
  if (n + STRIDE > buf.length) { const b = new Float32Array(buf.length * 2); b.set(buf); buf = b; }
  buf[n++] = p[0]; buf[n++] = p[1]; buf[n++] = p[2]; buf[n++] = nr[0]; buf[n++] = nr[1]; buf[n++] = nr[2];
  buf[n++] = c[0]; buf[n++] = c[1]; buf[n++] = c[2]; buf[n++] = e;
}
function tri(a, b, c, ca, cb, cc, ea = 0, eb = ea, ec = eb) {
  const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const nr = norm([u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]);
  vtx(a, nr, ca, ea); vtx(b, nr, cb, eb); vtx(c, nr, cc, ec);
}

/** A smooth surface of revolution along x. rings: [x, ry, rz, zc, top colour, belly colour, emissive]. */
function lathe(rings, seg, dz = 0) {
  const P = [], N = [], K = [];
  rings.forEach((r, i) => {
    const p = rings[Math.max(0, i - 1)], q = rings[Math.min(rings.length - 1, i + 1)];
    const slope = ((q[1] + q[2]) - (p[1] + p[2])) / 2 / ((q[0] - p[0]) || 1);
    P.push([]); N.push([]); K.push([]);
    for (let j = 0; j <= seg; j++) {
      const a = j / seg * TAU, ca = Math.cos(a), sa = Math.sin(a);
      P[i].push([r[0], ca * r[1], r[3] + sa * r[2] + dz]);
      const gy = ca * Math.max(r[2], 0.3), gz = sa * Math.max(r[1], 0.3), m = Math.hypot(gy, gz) || 1;
      N[i].push(norm([-slope, gy / m, gz / m]));
      K[i].push(mix(r[4], r[5], (1 - sa) / 2));
    }
  });
  for (let i = 0; i + 1 < rings.length; i++) {
    const e0 = rings[i][6] || 0, e1 = rings[i + 1][6] || 0;
    for (let j = 0; j < seg; j++) {
      const a = [i, j], b = [i + 1, j], c = [i + 1, j + 1], d = [i, j + 1];
      for (const [x, y, z] of [[a, b, c], [a, c, d]]) for (const [ii, jj] of [x, y, z]) vtx(P[ii][jj], N[ii][jj], K[ii][jj], ii === i ? e0 : e1);
    }
  }
}

/** A feather-like ribbon along a centreline, a shallow V across (a raised spine) so it catches the light.
 *  pts: centre points; w(u): half width; col(u), em(u); ref: the width runs along ref x tangent. */
function ribbon(pts, w, col, em, ref = [0, 0, 1]) {
  const m = pts.length - 1, L = [], M = [], R = [], U = [];
  for (let i = 0; i <= m; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(m, i + 1)];
    const t = norm([b[0] - a[0], b[1] - a[1], b[2] - a[2]]);
    let s = [t[1] * ref[2] - t[2] * ref[1], t[2] * ref[0] - t[0] * ref[2], t[0] * ref[1] - t[1] * ref[0]];
    if (Math.hypot(...s) < 1e-3) s = [0, 1, 0];
    s = norm(s);
    const up = norm([s[1] * t[2] - s[2] * t[1], s[2] * t[0] - s[0] * t[2], s[0] * t[1] - s[1] * t[0]]);
    const u = i / m, hw = w(u), p = pts[i];
    L.push([p[0] - s[0] * hw, p[1] - s[1] * hw, p[2] - s[2] * hw]);
    R.push([p[0] + s[0] * hw, p[1] + s[1] * hw, p[2] + s[2] * hw]);
    M.push([p[0] + up[0] * hw * 0.3, p[1] + up[1] * hw * 0.3, p[2] + up[2] * hw * 0.3]);
    U.push(u);
  }
  for (let i = 0; i < m; i++) {
    const c0 = col(U[i]), c1 = col(U[i + 1]), e0 = em(U[i]), e1 = em(U[i + 1]);
    const cm0 = mix(c0, C.hi, 0.18), cm1 = mix(c1, C.hi, 0.18);
    tri(L[i], M[i], M[i + 1], c0, cm0, cm1, e0, e0, e1); tri(L[i], M[i + 1], L[i + 1], c0, cm1, c1, e0, e1, e1);
    tri(M[i], R[i], R[i + 1], cm0, c0, c1, e0, e0, e1); tri(M[i], R[i + 1], M[i + 1], cm0, c1, cm1, e0, e1, e1);
  }
}

// --- the wings
const SH = [2.4, 2.9, 1.9], WRIST = 10;               // shoulder (y mirrored per side) and the wrist's span
const lead = (s) => (s <= WRIST ? 0.4 + 1.3 * s / WRIST : 1.7 - (s - WRIST) * 0.35);  // the leading edge (forward)
function wingPose(o) {
  const amp = o.amp ?? 1, fold = o.fold || 0, f = o.flap || 0, open = 1 - fold;
  const th = (0.2 + 0.7 * amp * Math.sin(f)) * open + 0.1 * fold;          // the beat round the shoulder
  const ph = (0.12 + 0.5 * amp * Math.sin(f - 0.9)) * open - 0.1 * fold;     // the hand lags the arm
  const sw = 1.05 * fold, hf = 0.8 * fold;                                  // swept back, hand folded
  return { ct: Math.cos(th), st: Math.sin(th), cp: Math.cos(ph), sp: Math.sin(ph), cs: Math.cos(sw), ss: Math.sin(sw),
    ch: Math.cos(hf), sh: Math.sin(hf), wx: lead(WRIST) };
}
/** A wing point (x forward from the shoulder, y out along the span, z up) to model space; hand points turn at the wrist. */
function wingXf(sg, p, hand, W) {
  let [x, y, z] = p;
  if (hand) {
    let dy = y - WRIST, dz = z;
    [dy, dz] = [dy * W.cp - dz * W.sp, dy * W.sp + dz * W.cp]; y = WRIST + dy; z = dz;
    let dx = x - W.wx; dy = y - WRIST;
    [dx, dy] = [dx * W.ch - dy * W.sh, dx * W.sh + dy * W.ch]; x = W.wx + dx; y = WRIST + dy;
  }
  [x, y] = [x * W.cs - y * W.ss, x * W.ss + y * W.cs];
  [y, z] = [y * W.ct - z * W.st, y * W.st + z * W.ct];
  return [SH[0] + x, sg * (SH[1] + y), SH[2] + z];
}
// the primaries: root span, root chord, angle from the span toward the back, length
const PRIM = [0, 1, 2, 3, 4, 5, 6].map((i) => ({ s: WRIST + 8.5 * (1 - i / 6), c: 0.8 + i * 0.35, a: 0.16 + i * 0.16, len: [9, 10.5, 11, 10.5, 9.6, 8.6, 7.6][i] }));
const featherTip = (f) => [lead(f.s) - f.c - Math.sin(f.a) * f.len, f.s + Math.cos(f.a) * f.len, 0];

/** A flat pointed feather in the wing plane from root r along direction d (both wing-local), then posed. */
function feather(sg, r, d, len, wid, hand, W, h, cRoot, cTip, eTip) {
  const sx = -d[1], sy = d[0];                                  // across the feather, in the wing plane
  const at = (u, k) => wingXf(sg, [r[0] + d[0] * len * u + sx * wid * k, r[1] + d[1] * len * u + sy * wid * k, h], hand, W);
  const R = at(0, 0), A = at(0, -0.5), B = at(0, 0.5), mA = at(0.7, -0.55), mB = at(0.7, 0.55), T = at(1, 0);
  const cm = mix(cRoot, cTip, 0.6);
  tri(A, B, mB, cRoot, cRoot, cm, 0, 0, eTip * 0.4); tri(A, mB, mA, cRoot, cm, cm, 0, eTip * 0.4, eTip * 0.4);
  tri(mA, mB, T, cm, cm, cTip, eTip * 0.4, eTip * 0.4, eTip);
  return R;
}
function wing(sg, W) {
  const quad = (a, b, c, d, ca, cb, cc, cd, e = 0) => { tri(a, b, c, ca, cb, cc, e); tri(a, c, d, ca, cc, cd, e); };
  // coverts over the arm and the hand: leading edge pale gold -> gold -> amber at the covert line
  const spans = [0, 2.5, 5, 7.5, WRIST, WRIST + 3, WRIST + 6, WRIST + 8.5];
  for (let i = 0; i + 1 < spans.length; i++) {
    const s0 = spans[i], s1 = spans[i + 1], hand = s0 >= WRIST;
    const xf = (s, c, z) => wingXf(sg, [lead(s) - c, s, z], hand, W);
    const cw0 = s0 < WRIST ? 4.6 : 3.2 - (s0 - WRIST) * 0.25, cw1 = s1 <= WRIST ? 4.6 : 3.2 - (s1 - WRIST) * 0.25;
    const a0 = xf(s0, 0, 0.35), a1 = xf(s1, 0, 0.35), b0 = xf(s0, cw0 * 0.45, 0.2), b1 = xf(s1, cw1 * 0.45, 0.2);
    const d0 = xf(s0, cw0, 0.05), d1 = xf(s1, cw1, 0.05);
    quad(a0, a1, b1, b0, C.hi, C.hi, C.gold, C.gold);
    quad(b0, b1, d1, d0, C.gold, C.gold, C.amber, C.amber);
  }
  // secondaries along the arm, overlapping, each a little lower
  for (let i = 0; i < 6; i++) {
    const s = 0.6 + i * 1.75, len = 7.2 - i * 0.25;
    feather(sg, [lead(s) - 3.6, s], [-0.995, 0.1], len, 2.3, false, W, -0.08 * i, C.amber, ramp(FEATHER, 0.75), 0.45);
  }
  // primaries fanning from the hand
  for (let i = PRIM.length - 1; i >= 0; i--) {
    const f = PRIM[i];
    feather(sg, [lead(f.s) - f.c, f.s], [-Math.sin(f.a), Math.cos(f.a)], f.len, 1.9, true, W, -0.12 - 0.07 * (6 - i), C.gold, C.ember, 0.75);
  }
}

// --- body, head, crest and tail
const BODY = [
  [-10.5, 0.6, 0.6, 0.8, C.amber, C.gold], [-8.5, 1.8, 1.6, 0.6, C.amber, C.gold], [-5, 3, 2.7, 0.3, C.amber, C.hi],
  [-1.5, 3.9, 3.5, 0.1, C.amber, C.hi], [2, 4, 3.8, 0.1, C.gold, C.hi], [4.8, 3.1, 3.1, 0.7, C.gold, C.hi],
  [6.8, 2, 2.2, 1.9, C.gold, C.hi], [8.6, 1.8, 2, 3, C.gold, C.hi], [10.2, 2.3, 2.4, 3.5, C.gold, C.hi],
  [12.2, 2.2, 2.2, 3.6, C.gold, C.hi], [13.8, 1.4, 1.4, 3.3, C.gold, C.hi], [14.6, 0.5, 0.5, 3.1, C.gold, C.gold], [14.9, 0, 0, 3, C.gold, C.gold],
];
const BEAK = [[14.1, 0.9, 0.85, 3, C.ivory, C.ivory], [15.9, 0.55, 0.5, 2.75, C.ivory, C.beak], [17.4, 0.18, 0.18, 2.25, C.beak, C.beak], [17.9, 0, 0, 1.9, C.beak, C.beak]];
const TAIL = [-2, -1, 0, 1, 2].map((j) => ({ j, len: [23, 28, 33, 28, 23][j + 2], a: j * 0.17 }));
function tailPoint(T, u, o) {
  const fold = o.fold || 0, t = o.t || 0, a = T.a * (1 - 0.6 * fold), L = T.len * (1 + 0.1 * fold);
  return [-9.8 - L * u * Math.cos(a), T.j * 0.45 + L * u * Math.sin(a) + Math.sin(t * 2.6 - u * 3.5 + T.j * 1.3) * u * 1.6,
    0.7 - 0.12 * (1 - fold) * L * u * u + Math.sin(t * 3.2 - u * 4 + T.j) * u * 1.8];
}
const CREST = [-1, 0, 1].map((i) => ({ i, len: i ? 6.5 : 8.5 }));
function crestPoint(K, u, o) {
  const t = o.t || 0, L = K.len, i = K.i;
  return [11.4 - L * u * 0.9, i * 0.7 + i * u * 2 + Math.sin(t * 4 + i * 2) * u * 0.5, 5.4 + L * u * 0.5 - L * u * u * 0.25 + Math.sin(t * 5 + i) * u * 0.6];
}

function build(o) {
  n = 0;
  const W = wingPose(o), bob = -0.7 * (o.amp ?? 1) * Math.sin(o.flap || 0) * (1 - (o.fold || 0));
  for (const T of TAIL) {
    const pts = []; for (let i = 0; i <= 10; i++) pts.push(tailPoint(T, i / 10, o));
    ribbon(pts, (u) => (0.55 + 2.1 * Math.exp(-(((u - 0.8) / 0.13) ** 2))) * Math.min(1, (1 - u) * 7), (u) => ramp(PLUME, u), (u) => smooth(0.45, 1, u) * 0.9);
  }
  wing(1, W); wing(-1, W);
  lathe(BODY.map((r) => [r[0], r[1], r[2], r[3] + bob, r[4], r[5], 0.04]), 10);
  lathe(BEAK.map((r) => [r[0], r[1], r[2], r[3] + bob, r[4], r[5], 0]), 8);
  for (const sg of [1, -1]) {                                                 // eyes: a hot white-gold glint
    const y = sg * 2.18, z = 4 + bob;
    tri([12, y, z], [12.4, y, z + 0.4], [12.8, y, z], C.eye, C.eye, C.eye, 1);
    tri([12, y, z], [12.8, y, z], [12.4, y, z - 0.35], C.eye, C.eye, C.eye, 1);
  }
  for (const K of CREST) {
    const pts = []; for (let i = 0; i <= 6; i++) { const p = crestPoint(K, i / 6, o); p[2] += bob; pts.push(p); }
    ribbon(pts, (u) => 1.25 * Math.sin(Math.PI * (0.15 + 0.85 * u)), (u) => ramp([C.gold, C.amber, C.flame, C.ember], u), (u) => u * u * 0.85);
  }
  return n / STRIDE;
}

// Lean: the whole bird tips its back toward the camera (round the screen's x axis, done in the world so the tips
// phoenixPoints reports still match the drawing), so a banked wing never goes edge-on to the 30-degree iso view.
const LEAN = 0.35;
function leanRot(a) {
  const c = Math.cos(a), sn = Math.sin(a), X = [[1, 0, 0], [0, c, sn], [0, -sn, c]];
  const CT = [0, 1, 2].map((i) => [CAM[0][i], CAM[1][i], CAM[2][i]]);
  return mul(CT, mul(X, CAM));
}
const LEANS = new Map();
/** The body -> world rotation (x forward, y left, z up; world x/y along the tiles, z up), leaned toward the camera. */
function bodyRot(o) {
  const ln = o.lean ?? LEAN;
  let L = LEANS.get(ln); if (!L) LEANS.set(ln, L = leanRot(ln));
  const cy = Math.cos(o.yaw || 0), sy = Math.sin(o.yaw || 0), cp = Math.cos(o.pitch || 0), sp = Math.sin(o.pitch || 0), cr = Math.cos(o.roll || 0), sr = Math.sin(o.roll || 0);
  const Z = [[cy, -sy, 0], [sy, cy, 0], [0, 0, 1]], Y = [[cp, 0, sp], [0, 1, 0], [-sp, 0, cp]], X = [[1, 0, 0], [0, cr, -sr], [0, sr, cr]];
  return mul(L, mul(Z, mul(Y, X)));
}
const mul = (A, B) => A.map((r) => [0, 1, 2].map((j) => r[0] * B[0][j] + r[1] * B[1][j] + r[2] * B[2][j]));

/** Where the wing tips, tail plume tips and crest are, as world offsets from the bird's centre:
 *  { wings: [[dx, dy, dz] x2], tail: [...x5], crest: [dx, dy, dz] }, dx/dy in tiles, dz in game height px.
 *  o: the pose drawPhoenix3D takes (k: px per model unit). */
export function phoenixPoints(o) {
  const B = bodyRot(o), k = o.k || 1, W = wingPose(o);
  const toW = (p) => {
    const x = k * (B[0][0] * p[0] + B[0][1] * p[1] + B[0][2] * p[2]), y = k * (B[1][0] * p[0] + B[1][1] * p[1] + B[1][2] * p[2]), z = k * (B[2][0] * p[0] + B[2][1] * p[1] + B[2][2] * p[2]);
    return [x / PHOENIX_TILE, y / PHOENIX_TILE, z * C30];
  };
  const tip = featherTip(PRIM[0]);
  return { wings: [1, -1].map((sg) => toW(wingXf(sg, tip, true, W))), tail: TAIL.map((T) => toW(tailPoint(T, 0.93, o))), crest: toW(crestPoint(CREST[1], 1, o)) };
}

// ------------------------------------------------------------------ WebGL (one shared context and canvas)
const VS = `attribute vec3 aP; attribute vec3 aN; attribute vec3 aC; attribute float aE;
uniform mat4 uM; uniform mat3 uR; varying vec3 vN; varying vec3 vC; varying float vE;
void main() { gl_Position = uM * vec4(aP, 1.0); vN = uR * aN; vC = aC; vE = aE; }`;
const FS = `precision mediump float;
uniform vec3 uL; uniform float uHeat; varying vec3 vN; varying vec3 vC; varying float vE;
void main() {
  vec3 n = normalize(vN);
  if (n.z < 0.0) n = -n;                                     // thin feathers: light the side the camera sees
  float d = max(dot(n, uL), 0.0);
  vec3 col = vC * (0.42 + 0.78 * d);
  col += vec3(1.0, 0.88, 0.55) * pow(max(dot(n, normalize(uL + vec3(0.0, 0.0, 1.0))), 0.0), 16.0) * 0.6;   // polished gold
  float rim = 1.0 - n.z;
  col += vec3(1.0, 0.45, 0.1) * rim * rim * (0.25 + 0.35 * uHeat);                                          // a flame rim
  float e = clamp(vE * (0.75 + 0.5 * uHeat), 0.0, 1.0);
  col = mix(col, vC * 1.2 + vec3(0.3, 0.16, 0.02), e);                                                       // the burning tips
  gl_FragColor = vec4(min(col, vec3(1.0)), 1.0);
}`;
let gl = null, glc = null, prog = null, U = null, vbo = null, glDead = false, tries = 0;
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
  } catch (e) { console.warn('phoenix3d: ' + e.message); glDead = true; return null; }
  U = {}; for (const k of ['uM', 'uR', 'uL', 'uHeat']) U[k] = g.getUniformLocation(prog, k);
  for (const k of ['aP', 'aN', 'aC', 'aE']) U[k] = g.getAttribLocation(prog, k);
  vbo = g.createBuffer(); gl = g;
  return g;
}
/** True when WebGL works: drawPhoenix3D will draw. */
export const phoenix3DReady = () => !!initGL();

/**
 * Draw the phoenix with its body centre at (x, y) (current ctx units). o: { yaw (heading along the tiles, radians),
 * pitch (+: nose down), roll (+: the left wing up), flap (wing-beat phase), amp (beat strength 0..1, low = gliding),
 * fold (0 open .. 1 swept back for the stoop), t (seconds, sways the plumes), k (px per model unit; the wingspan is
 * about 55 units), heat (0..1, the plumes and rim burn brighter), lean (radians its back tips toward the camera,
 * default 0.35) }. Returns false when WebGL is missing.
 */
export function drawPhoenix3D(ctx, x, y, o = {}) {
  const g = initGL();
  if (!g) return false;
  const count = build(o), k = o.k || 1, R = mul(CAM, bodyRot(o));
  let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity, zr = 1;
  for (let i = 0; i < n; i += STRIDE) {
    const px = buf[i], py = buf[i + 1], pz = buf[i + 2];
    const X = k * (R[0][0] * px + R[0][1] * py + R[0][2] * pz), Y = k * (R[1][0] * px + R[1][1] * py + R[1][2] * pz), Z = k * (R[2][0] * px + R[2][1] * py + R[2][2] * pz);
    if (X < bx0) bx0 = X; if (X > bx1) bx1 = X; if (Y < by0) by0 = Y; if (Y > by1) by1 = Y; if (Math.abs(Z) > zr) zr = Math.abs(Z);
  }
  bx0 = Math.floor(bx0 - 1); by0 = Math.floor(by0 - 1); zr += 1;
  const tf = ctx.getTransform();
  const res = Math.min(Math.max(0.25, Math.hypot(tf.a, tf.b)), MAXC / (bx1 + 1 - bx0), MAXC / (by1 + 1 - by0));
  const w = Math.max(1, Math.ceil((bx1 + 1 - bx0) * res)), h = Math.max(1, Math.ceil((by1 + 1 - by0) * res));
  const bw = w / res, bh = h / res;
  if (glc.width < w || glc.height < h) { glc.width = Math.min(MAXC, Math.max(glc.width, 1 << Math.ceil(Math.log2(w)))); glc.height = Math.min(MAXC, Math.max(glc.height, 1 << Math.ceil(Math.log2(h)))); }
  // clip = M * p: x -> [-1, 1] over the box, y flipped (screen down), z toward the viewer -> nearer
  const Mx = [2 / bw, -2 / bh, -1 / zr], Mo = [-2 * bx0 / bw - 1, 2 * by0 / bh + 1, 0];
  const mat = new Float32Array(16), rot = new Float32Array(9);
  for (let c = 0; c < 3; c++) for (let r = 0; r < 3; r++) { mat[c * 4 + r] = Mx[r] * R[r][c] * k; rot[c * 3 + r] = R[r][c]; }
  mat[12] = Mo[0]; mat[13] = Mo[1]; mat[14] = Mo[2]; mat[15] = 1;
  // clear a margin too: drawImage's smoothing samples a texel past the copied rect, where an older, bigger frame may be
  const cw = Math.min(glc.width, w + 2), chh = Math.min(glc.height, h + 2);
  g.enable(g.SCISSOR_TEST); g.scissor(0, glc.height - chh, cw, chh);
  g.clearColor(0, 0, 0, 0); g.clearDepth(1); g.clear(g.COLOR_BUFFER_BIT | g.DEPTH_BUFFER_BIT);
  g.viewport(0, glc.height - h, w, h);
  g.enable(g.DEPTH_TEST); g.depthFunc(g.LEQUAL); g.disable(g.CULL_FACE); g.disable(g.BLEND);
  g.useProgram(prog);
  g.bindBuffer(g.ARRAY_BUFFER, vbo); g.bufferData(g.ARRAY_BUFFER, buf.subarray(0, n), g.DYNAMIC_DRAW);
  const F = 4 * STRIDE;
  g.enableVertexAttribArray(U.aP); g.vertexAttribPointer(U.aP, 3, g.FLOAT, false, F, 0);
  g.enableVertexAttribArray(U.aN); g.vertexAttribPointer(U.aN, 3, g.FLOAT, false, F, 12);
  g.enableVertexAttribArray(U.aC); g.vertexAttribPointer(U.aC, 3, g.FLOAT, false, F, 24);
  g.enableVertexAttribArray(U.aE); g.vertexAttribPointer(U.aE, 1, g.FLOAT, false, F, 36);
  g.uniformMatrix4fv(U.uM, false, mat); g.uniformMatrix3fv(U.uR, false, rot);
  g.uniform3fv(U.uL, LIGHT); g.uniform1f(U.uHeat, o.heat || 0);
  g.drawArrays(g.TRIANGLES, 0, count);
  ctx.drawImage(glc, 0, 0, w, h, x + bx0, y + by0, bw, bh);
  return true;
}
