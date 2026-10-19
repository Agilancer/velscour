// The Death Knight's Runeblade as a real 3D model (his class signature, src/game/sigs/deathknight.js): the sword that
// hovers at his side and, scaled up, RUNIC OBLITERATION's giant cleave. Its look follows his level (runebladeLook): every
// 10 levels the next of five skins (RUNEBLADE_SKINS), and every 50 the next of six palettes (RUNEBLADE_PALETTES), so
// levels 1-300 show all 30 looks once. Each skin is built at load time from its painted views
// (tools/runeblade3d.py -> assets/fx/runeblade/runeblade3d_<skin>.png + .json; docs/RUNEBLADE_3D.md):
//  - every painted row of the FRONT view is one slab, as wide as that row and as thick as the same row of the SIDE
//    (edge-on) view, with a six-sided cross-section (edge, bevel, flat, bevel, edge), so the pixel-stepped outline
//    becomes stepped geometry; slabs with the same profile merge, and steps between them are flat ledges;
//  - the front half takes its colours from FRONT, the back half from BACK (painted mirrored, un-mirrored here);
//    clear texels inside the outline are real holes (alpha discard).
// Drawn with WebGL on one small shared canvas (z-buffer, flat-shaded faces lit from the top-left front, a rune-tinted
// rim on the blade), then copied into the 2D frame at the device resolution. Without WebGL, or until the model has
// loaded, drawRuneblade3D returns null and the caller draws the old flat blade.
const SRC = 'assets/fx/runeblade/runeblade3d_';
/** World px from guard to point of the Death Knight's familiar Runeblade and his Rune Weapon summons (sigs/deathknight.js, gfx/runeweapon.js). */
export const RUNEBLADE_LEN = 52;
export const RUNEBLADE_SKINS = [
  { id: 'reliquary_sliver', name: 'Reliquary Sliver' },
  { id: 'funeral_sash', name: 'Funeral Sash' },
  { id: 'frozen_sand', name: 'Frozen Sand Reliquary' },
  { id: 'verdigris_weeper', name: 'Verdigris Weeper' },
  { id: 'blank_epitaph', name: 'Blank Epitaph' },
];
export const DEFAULT_RUNEBLADE_SKIN = RUNEBLADE_SKINS[0].id;
// Palettes recolour the painted art in the shader: hue turned (degrees, round the grey axis, so light and dark stay
// put), saturation scaled, brightness scaled; glow tints the blade's rim and halo while no rune is lit.
export const RUNEBLADE_PALETTES = [
  { id: 'rime', name: 'Rime', hue: 0, sat: 1, lum: 1, glow: '#7ad0ff' },
  { id: 'grave_jade', name: 'Grave Jade', hue: -50, sat: 1.05, lum: 1, glow: '#6ef0b0' },
  { id: 'wraith_violet', name: 'Wraith Violet', hue: 75, sat: 1.1, lum: 1, glow: '#b48cff' },
  { id: 'blood_moon', name: 'Blood Moon', hue: 165, sat: 1.15, lum: 0.92, glow: '#ff5a50' },
  { id: 'starless', name: 'Starless Silver', hue: 0, sat: 0.1, lum: 1.05, glow: '#e8eef8' },
  { id: 'gilded_oath', name: 'Gilded Oath', hue: -150, sat: 1.2, lum: 1.05, glow: '#ffd060' },
];
/** The Runeblade a Death Knight of this level carries: a new skin every 10 levels, a new palette every 50. */
export function runebladeLook(level) {
  const band = Math.max(0, Math.min(RUNEBLADE_SKINS.length * RUNEBLADE_PALETTES.length - 1, Math.floor((level || 1) / 10)));
  const skin = RUNEBLADE_SKINS[band % RUNEBLADE_SKINS.length], palette = RUNEBLADE_PALETTES[Math.floor(band / RUNEBLADE_SKINS.length)];
  return { band, skin: skin.id, palette: palette.id, name: palette.hue || palette.sat !== 1 ? `${palette.name} ${skin.name}` : skin.name, glow: palette.glow };
}
const PAL = {};
/** A palette's colour matrix (column-major 3x3, CSS hue-rotate x saturate x brightness). */
function palMatrix(id) {
  if (PAL[id]) return PAL[id];
  const p = RUNEBLADE_PALETTES.find((q) => q.id === id) || RUNEBLADE_PALETTES[0];
  const a = p.hue * Math.PI / 180, c = Math.cos(a), sn = Math.sin(a), t = p.sat;
  const H = [[0.213 + c * 0.787 - sn * 0.213, 0.715 - c * 0.715 - sn * 0.715, 0.072 - c * 0.072 + sn * 0.928],
    [0.213 - c * 0.213 + sn * 0.143, 0.715 + c * 0.285 + sn * 0.140, 0.072 - c * 0.072 - sn * 0.283],
    [0.213 - c * 0.213 - sn * 0.787, 0.715 - c * 0.715 + sn * 0.715, 0.072 + c * 0.928 + sn * 0.072]];
  const S = [[0.213 + 0.787 * t, 0.715 - 0.715 * t, 0.072 - 0.072 * t], [0.213 - 0.213 * t, 0.715 + 0.285 * t, 0.072 - 0.072 * t],
    [0.213 - 0.213 * t, 0.715 - 0.715 * t, 0.072 + 0.928 * t]];
  const m = new Float32Array(9);
  for (let r = 0; r < 3; r++) for (let k = 0; k < 3; k++) m[k * 3 + r] = p.lum * (S[r][0] * H[0][k] + S[r][1] * H[1][k] + S[r][2] * H[2][k]);
  return (PAL[id] = m);
}
const skinId = (id) => (id === 'placeholder' || RUNEBLADE_SKINS.some((k) => k.id === id) ? id : DEFAULT_RUNEBLADE_SKIN);
const MAXC = 1024;                                  // the GL canvas never grows past this (big swords render coarser)
const LIGHT = norm([-0.45, -0.55, 0.7]);            // screen space: x right, y down, z toward the viewer

function norm(v) { const l = Math.hypot(...v); return v.map((c) => c / l); }

const MODELS = new Map();                          // skin -> { ready, error, info, img, mesh, gen, vbo, tex }
/** Start loading a skin's model (once each); returns its state. Unknown skins load the default. */
export function preloadRuneblade(skin) {
  const id = skinId(skin);
  let M = MODELS.get(id);
  if (M) return M;
  MODELS.set(id, M = { id, ready: false, error: null, gen: -1 });
  if (typeof Image === 'undefined') { M.error = 'no DOM'; return M; }
  const img = new Image(), src = SRC + id;
  const pic = new Promise((ok, bad) => { img.onload = ok; img.onerror = () => bad(new Error(src + '.png')); img.src = src + '.png'; });
  Promise.all([fetch(src + '.json').then((r) => { if (!r.ok) throw new Error(src + '.json ' + r.status); return r.json(); }), pic])
    .then(([info]) => { M.info = info; M.img = img; M.mesh = buildMesh(info); M.ready = true; })
    .catch((e) => { M.error = String(e.message || e); });
  return M;
}
export const runebladeModel = (skin) => preloadRuneblade(skin);
/** True once the skin's model has loaded and WebGL works: drawRuneblade3D will draw it. */
export function runeblade3DReady(skin) { return preloadRuneblade(skin).ready && !!initGL(); }

/** The triangle soup: interleaved x, y, z, nx, ny, nz, u, v (model units = art pixels, origin at the crossguard
 *  centre, +y toward the point, +z toward the viewer when the FRONT faces him). */
export function buildMesh(info) {
  const [TW, TH] = info.size, fc = info.cols.front, bc = info.cols.back, gy = info.guard;
  const slabs = [];
  for (const [y, x0, x1, t] of info.rows) {
    const s = slabs[slabs.length - 1];
    if (s && s.y1 === y && s.x0 === x0 && s.x1 === x1 && s.t === t) s.y1 = y + 1;
    else slabs.push({ y0: y, y1: y + 1, x0, x1, t });
  }
  const out = [];
  const hex = (s) => { const w = s.x1 - s.x0, b = Math.min(w * 0.3, s.t * 2.5);
    return [[s.x0, 0], [s.x0 + b, s.t], [s.x1 - b, s.t], [s.x1, 0], [s.x1 - b, -s.t], [s.x0 + b, -s.t]]; };
  const uv = (x, row, front) => [(front ? fc + x : bc - x) / TW, row / TH];
  const vert = (x, y, z, u, n) => out.push(x, y - gy, z, n[0], n[1], n[2], u[0], u[1]);
  const quad = (a, b, c, d, n) => { vert(...a, n); vert(...b, n); vert(...c, n); vert(...a, n); vert(...c, n); vert(...d, n); };
  // a flat cap (or ledge) at row y: the ring between hexagon A (inner, may be null = a point) and B, facing ny
  const ledge = (A, B, y, row, ny) => {
    const cx = (B[0][0] + B[3][0]) / 2;
    for (let i = 0; i < 6; i++) {
      const j = (i + 1) % 6, front = B[i][1] + B[j][1] > 0;
      const a = A ? A[i] : [cx, 0], b = A ? A[j] : [cx, 0];
      quad([a[0], y, a[1], uv(a[0], row, front)], [b[0], y, b[1], uv(b[0], row, front)],
        [B[j][0], y, B[j][1], uv(B[j][0], row, front)], [B[i][0], y, B[i][1], uv(B[i][0], row, front)], [0, ny, 0]);
    }
  };
  slabs.forEach((s, k) => {
    const P = hex(s), cx = (s.x0 + s.x1) / 2;
    for (let i = 0; i < 6; i++) {                     // the six long faces
      const p = P[i], q = P[(i + 1) % 6], dx = q[0] - p[0], dz = q[1] - p[1];
      let n = norm([dz, 0, -dx]);
      if (n[0] * ((p[0] + q[0]) / 2 - cx) + n[2] * (p[1] + q[1]) / 2 < 0) n = n.map((c) => -c);
      const front = p[1] + q[1] > 0;
      quad([p[0], s.y0, p[1], uv(p[0], s.y0, front)], [q[0], s.y0, q[1], uv(q[0], s.y0, front)],
        [q[0], s.y1, q[1], uv(q[0], s.y1, front)], [p[0], s.y1, p[1], uv(p[0], s.y1, front)], n);
    }
    const prev = slabs[k - 1], next = slabs[k + 1];
    if (!prev || prev.y1 !== s.y0) ledge(null, P, s.y0, s.y0 + 0.5, -1);            // top cap
    if (!next || next.y0 !== s.y1) ledge(null, P, s.y1, s.y1 - 0.5, 1);             // bottom cap
    else {                                                                           // the step down to the next slab
      const Q = hex(next), wider = next.x1 - next.x0 > s.x1 - s.x0 || next.t > s.t;
      ledge(wider ? P : Q, wider ? Q : P, s.y1, wider ? next.y0 + 0.5 : s.y1 - 0.5, wider ? -1 : 1);
    }
  });
  let minX = 0, maxX = 0, maxT = 0; const thick = {};
  for (const [y, x0, x1, t] of info.rows) { minX = Math.min(minX, x0); maxX = Math.max(maxX, x1); maxT = Math.max(maxT, t); thick[y] = t; }
  return { data: new Float32Array(out), count: out.length / 8, slabs: slabs.length, minX, maxX, maxT, thick,
    y0: info.top - gy, y1: info.tip + 1 - gy, bladeY: info.bladeTop - gy, len: info.tip + 1 - gy };
}

// ------------------------------------------------------------------ WebGL (one shared context and canvas)
const VS = `attribute vec3 aP; attribute vec3 aN; attribute vec2 aT;
uniform mat4 uM; uniform mat3 uR; varying vec3 vN; varying vec2 vT; varying float vY;
void main() { gl_Position = uM * vec4(aP, 1.0); vN = uR * aN; vT = aT; vY = aP.y; }`;
const FS = `precision mediump float;
uniform sampler2D uTex; uniform mat3 uPal; uniform vec3 uL; uniform vec3 uGlow; uniform float uGlowAmt; uniform float uBladeY;
varying vec3 vN; varying vec2 vT; varying float vY;
void main() {
  vec4 c = texture2D(uTex, vT);
  if (c.a < 0.4) discard;
  c.rgb = clamp(uPal * c.rgb, 0.0, 1.0);                    // the palette
  vec3 n = normalize(vN);
  float d = max(dot(n, uL), 0.0);
  vec3 col = c.rgb * (0.5 + 0.8 * d);                       // face-on is about the art as painted
  col += vec3(0.85, 0.93, 1.0) * pow(max(dot(n, normalize(uL + vec3(0.0, 0.0, 1.0))), 0.0), 28.0) * 0.35;
  if (vY > uBladeY) { float r = 1.0 - abs(n.z); col += uGlow * uGlowAmt * (0.2 + r * r); }
  gl_FragColor = vec4(min(col, vec3(1.0)), 1.0);
}`;
let gl = null, glc = null, prog = null, U = null, glGen = 0, glDead = false, tries = 0;
function initGL() {
  if (gl && !gl.isContextLost()) return gl;
  if (glDead || typeof document === 'undefined' || ++tries > 4) { glDead = true; return null; }
  glc = document.createElement('canvas'); glc.width = glc.height = 256;
  glc.addEventListener('webglcontextlost', (e) => { e.preventDefault(); gl = null; });
  const g = glc.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, depth: true, stencil: false, preserveDrawingBuffer: false, powerPreference: 'low-power' });
  if (!g) { glDead = true; return null; }
  const sh = (type, src) => { const s = g.createShader(type); g.shaderSource(s, src); g.compileShader(s); if (!g.getShaderParameter(s, g.COMPILE_STATUS)) throw new Error(g.getShaderInfoLog(s)); return s; };
  try {
    prog = g.createProgram(); g.attachShader(prog, sh(g.VERTEX_SHADER, VS)); g.attachShader(prog, sh(g.FRAGMENT_SHADER, FS)); g.linkProgram(prog);
    if (!g.getProgramParameter(prog, g.LINK_STATUS)) throw new Error(g.getProgramInfoLog(prog));
  } catch (e) { console.warn('runeblade3d: ' + e.message); glDead = true; return null; }
  U = {}; for (const n of ['uM', 'uR', 'uTex', 'uPal', 'uL', 'uGlow', 'uGlowAmt', 'uBladeY']) U[n] = g.getUniformLocation(prog, n);
  U.aP = g.getAttribLocation(prog, 'aP'); U.aN = g.getAttribLocation(prog, 'aN'); U.aT = g.getAttribLocation(prog, 'aT');
  glGen++; gl = g;   // a new context: every skin uploads again
  return g;
}
function upload(g, m) {
  if (m.gen === glGen) return;
  m.gen = glGen;
  m.vbo = g.createBuffer(); g.bindBuffer(g.ARRAY_BUFFER, m.vbo); g.bufferData(g.ARRAY_BUFFER, m.mesh.data, g.STATIC_DRAW);
  m.tex = g.createTexture(); g.bindTexture(g.TEXTURE_2D, m.tex);
  g.pixelStorei(g.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  g.texImage2D(g.TEXTURE_2D, 0, g.RGBA, g.RGBA, g.UNSIGNED_BYTE, m.img);
  g.generateMipmap(g.TEXTURE_2D);
  g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MIN_FILTER, g.LINEAR_MIPMAP_LINEAR);
  g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MAG_FILTER, g.NEAREST);       // big on screen: crisp art pixels
  g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_S, g.CLAMP_TO_EDGE); g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_T, g.CLAMP_TO_EDGE);
}

/** Rotation for a pose: the blade along screen angle a (hilt -> point), turned `spin` round its own length and
 *  tipped `tilt` toward the viewer (+: the point comes toward him). Row-major 3x3. */
export function runebladeRotation(a, spin = 0, tilt = 0) {
  const p = a - Math.PI / 2, cz = Math.cos(p), sz = Math.sin(p), cx = Math.cos(tilt), sx = Math.sin(tilt), cy = Math.cos(spin), sy = Math.sin(spin);
  const X = [[1, 0, 0], [0, cx, -sx], [0, sx, cx]], Y = [[cy, 0, sy], [0, 1, 0], [-sy, 0, cy]], Z = [[cz, -sz, 0], [sz, cz, 0], [0, 0, 1]];
  const mul = (A, B) => A.map((r) => [0, 1, 2].map((j) => r[0] * B[0][j] + r[1] * B[1][j] + r[2] * B[2][j]));
  return mul(Z, mul(X, Y));
}

const COLOR = {};
const rgb = (h) => COLOR[h] || (COLOR[h] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255));

/** Draw the Runeblade with its crossguard centre at (x, y) (current ctx units), the blade `len` long from the guard
 *  to the point along screen angle a. o: { skin, palette, spin, tilt, glow: '#rrggbb', glowAmt }. Returns the six rune slot points
 *  on the face turned toward the viewer ({ slots: [[x, y]...], face: 0..1 how square-on it is, k: px per art pixel })
 *  or null when the 3D model can't draw (no WebGL, not loaded): then draw the 2D fallback. */
export function drawRuneblade3D(ctx, x, y, a, len, o = {}) {
  const m = preloadRuneblade(o.skin);
  if (!m.ready || len <= 0) return null;
  const g = initGL();
  if (!g) return null;
  upload(g, m);
  const me = m.mesh, k = len / me.len, R = runebladeRotation(a, o.spin || 0, o.tilt || 0);
  // screen bounds of the model's box
  let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity;
  for (const px of [me.minX, me.maxX]) for (const py of [me.y0, me.y1]) for (const pz of [-me.maxT, me.maxT]) {
    const X = k * (R[0][0] * px + R[0][1] * py + R[0][2] * pz), Y = k * (R[1][0] * px + R[1][1] * py + R[1][2] * pz);
    bx0 = Math.min(bx0, X); bx1 = Math.max(bx1, X); by0 = Math.min(by0, Y); by1 = Math.max(by1, Y);
  }
  bx0 = Math.floor(bx0 - 1); by0 = Math.floor(by0 - 1);
  const tf = ctx.getTransform();
  const res = Math.min(Math.max(0.25, Math.hypot(tf.a, tf.b)), MAXC / (bx1 + 1 - bx0), MAXC / (by1 + 1 - by0));
  const w = Math.max(1, Math.ceil((bx1 + 1 - bx0) * res)), h = Math.max(1, Math.ceil((by1 + 1 - by0) * res));
  const bw = w / res, bh = h / res;
  if (glc.width < w || glc.height < h) { glc.width = Math.min(MAXC, Math.max(glc.width, 1 << Math.ceil(Math.log2(w)))); glc.height = Math.min(MAXC, Math.max(glc.height, 1 << Math.ceil(Math.log2(h)))); }
  const zr = k * Math.hypot(Math.max(-me.minX, me.maxX), Math.max(-me.y0, me.y1), me.maxT) + 1;
  // clip = M * p: x -> [-1, 1] over the box, y flipped (screen down), z toward the viewer -> nearer
  const A = R.map((r) => r.map((c) => c * k));
  const Mx = [2 / bw, -2 / bh, -1 / zr], Mo = [-2 * bx0 / bw - 1, 2 * by0 / bh + 1, 0];
  const mat = new Float32Array(16);
  for (let c = 0; c < 3; c++) for (let r = 0; r < 3; r++) mat[c * 4 + r] = Mx[r] * A[r][c];
  mat[12] = Mo[0]; mat[13] = Mo[1]; mat[14] = Mo[2]; mat[15] = 1;
  const rot = new Float32Array(9);
  for (let c = 0; c < 3; c++) for (let r = 0; r < 3; r++) rot[c * 3 + r] = R[r][c];
  g.viewport(0, glc.height - h, w, h); g.enable(g.SCISSOR_TEST); g.scissor(0, glc.height - h, w, h);
  g.clearColor(0, 0, 0, 0); g.clearDepth(1); g.clear(g.COLOR_BUFFER_BIT | g.DEPTH_BUFFER_BIT);
  g.enable(g.DEPTH_TEST); g.depthFunc(g.LEQUAL); g.disable(g.CULL_FACE); g.disable(g.BLEND);
  g.useProgram(prog);
  g.bindBuffer(g.ARRAY_BUFFER, m.vbo);
  g.enableVertexAttribArray(U.aP); g.vertexAttribPointer(U.aP, 3, g.FLOAT, false, 32, 0);
  g.enableVertexAttribArray(U.aN); g.vertexAttribPointer(U.aN, 3, g.FLOAT, false, 32, 12);
  g.enableVertexAttribArray(U.aT); g.vertexAttribPointer(U.aT, 2, g.FLOAT, false, 32, 24);
  g.activeTexture(g.TEXTURE0); g.bindTexture(g.TEXTURE_2D, m.tex); g.uniform1i(U.uTex, 0);
  g.uniformMatrix4fv(U.uM, false, mat); g.uniformMatrix3fv(U.uR, false, rot);
  g.uniformMatrix3fv(U.uPal, false, palMatrix(o.palette));
  g.uniform3fv(U.uL, LIGHT); g.uniform3fv(U.uGlow, rgb(o.glow || '#7ad0ff')); g.uniform1f(U.uGlowAmt, o.glowAmt ?? 0.25);
  g.uniform1f(U.uBladeY, me.bladeY);
  g.drawArrays(g.TRIANGLES, 0, me.count);
  ctx.drawImage(glc, 0, 0, w, h, x + bx0, y + by0, bw, bh);
  // the rune slots on whichever face is turned toward the viewer
  const side = R[2][2] >= 0 ? 1 : -1, slots = [];
  for (const sy of m.info.slots) {
    const py = sy - m.info.guard, pz = side * (me.thick[Math.round(sy)] || 1);
    slots.push([x + k * (R[0][1] * py + R[0][2] * pz), y + k * (R[1][1] * py + R[1][2] * pz)]);
  }
  return { slots, face: Math.abs(R[2][2]), k };
}
