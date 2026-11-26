// THE BROKEN SPIRES in three.js (world/castlespires.js, game/castlespires.js). Like the Serpentine Tower (gfx/tower3d.js)
// the level is drawn live every frame behind the 2D sprites with the game's own camera: orthographic, 30 degrees down,
// 45 round, one unit a tile (HW * sqrt 2 = 45.25 world px across, VZ = 39.19 px up). The scene is the level frame
// (X, h, Z); the root turns by the run's alpha about the hero and is moved so he stands at the origin, exactly as the
// 2D warp places every tile position. Built once per floor from the ribbon: spire drums with stairs wound round them,
// stepped treads and parapets (fallen where the grid's parapet row is void), balconies on corbels, lanterns and lit
// slits, conical slate roofs; bridges between, with gibbets hanging under; the round tower tops; and Velscour's
// crossings, animated from their state each frame. Masonry is the Castle 3D set (assets/source/castle3d/tex/), palette
// swapped per STYLE (core/util.js recolor). The sky is a gradient with stars, a parallax skyline of far spires and the
// Throne Tower, a sea of cloud far below, and Velscour's own eye watching from the sky.
import { G } from '../state.js';
import { camera, HW } from '../core/view.js';
import { recolor, makeCanvas, TAU } from '../core/util.js';

const SC = HW * Math.SQRT2;
const TEX = 'assets/source/castle3d/tex/';
let T = null, BGU = null, R = null, S = null;
const IMG = new Map();
const loadImg = (src) => IMG.get(src) || IMG.set(src, new Promise((ok, no) => {
  const im = new Image(); im.onload = () => ok(im); im.onerror = () => no(new Error('Failed to load ' + src)); im.src = src;
})).get(src);

// the look of each part of the castle: masonry and its swap, roofs, lamps, the sky, the abyss, Velscour's flesh
export const STYLES = {
  storm: { stone: 'ashlar', ss: { colorize: [214, 0.1], light: -0.08, contrast: 1.12 }, trim: 'chapel', ts: { colorize: [212, 0.18], light: 0.04 }, floor: 'slatestone', fs: { colorize: [220, 0.1], light: -0.02 },
    roof: 'roof_blue', lamp: 0x9ad8ff, sky: ['#02040a', '#0c1830', '#2a4266'], abyss: '#03060c', amb: 0x5a6a80, hemi: [0x8aa8d8, 0x101820], moon: 0xb8d8ff, flesh: 0xb8b0b4, dark: 0.32, fog: '#151e38', storm: true, motes: '#c8e0ff' },
  bone: { stone: 'chapel', ss: { colorize: [42, 0.1], light: 0.02, contrast: 1.08 }, trim: 'ashlar', ts: { colorize: [40, 0.18], light: 0.1 }, floor: 'slate', fs: { colorize: [38, 0.1], light: 0.02 },
    roof: 'roof_black', lamp: 0xd8ff80, sky: ['#050404', '#1c1610', '#463826'], abyss: '#060403', amb: 0x6a6250, hemi: [0xd8c8a0, 0x14100a], moon: 0xffeed0, flesh: 0xc8b8a4, dark: 0.34, fog: '#1e1919', motes: '#e8dcc0' },
  blood: { stone: 'ashlar', ss: { colorize: [356, 0.1], light: -0.14, contrast: 1.12 }, trim: 'brick', ts: { colorize: [6, 0.25], light: -0.1 }, floor: 'basalt', fs: { colorize: [350, 0.1], light: -0.04 },
    roof: 'roof_char', lamp: 0xff5040, sky: ['#060102', '#2a0408', '#6a1010'], abyss: '#080102', amb: 0x6a3a38, hemi: [0xc8a098, 0x180404], moon: 0xffa080, flesh: 0xb89890, dark: 0.36, fog: '#220c12', motes: '#ff6040' },
  gloam: { stone: 'brick', ss: { colorize: [268, 0.1], light: -0.12, contrast: 1.15 }, trim: 'panel', ts: { colorize: [276, 0.25], light: -0.04 }, floor: 'slate', fs: { colorize: [270, 0.1], light: -0.06 },
    roof: 'roof_violet', lamp: 0xc890ff, sky: ['#040208', '#140a26', '#36204e'], abyss: '#040208', amb: 0x4a4060, hemi: [0xb8a0ff, 0x0c0814], moon: 0xe0c8ff, flesh: 0xb0a4b8, dark: 0.36, fog: '#19102a', motes: '#d0b0ff' },
  ember: { stone: 'basalt', ss: { colorize: [18, 0.1], light: -0.06, contrast: 1.1 }, trim: 'brick', ts: { colorize: [22, 0.25], light: -0.02 }, floor: 'soot', fs: { colorize: [20, 0.1], light: 0.02 },
    roof: 'roof_terracotta', lamp: 0xff9a40, sky: ['#050202', '#260a04', '#6a2408'], abyss: '#0a0402', amb: 0x6a4a3a, hemi: [0xffb080, 0x180804], moon: 0xffc080, flesh: 0xb8a090, dark: 0.34, fog: '#221312', motes: '#ff9a40', embers: true },
  throne: { stone: 'basalt', ss: { colorize: [350, 0.1], light: -0.18, contrast: 1.2 }, trim: 'ashlar', ts: { colorize: [44, 0.25], light: 0.04 }, floor: 'slatestone', fs: { colorize: [356, 0.1], light: -0.1 },
    roof: 'roof_gold', lamp: 0xff4020, sky: ['#040102', '#200208', '#5a0a12'], abyss: '#050102', amb: 0x5a3434, hemi: [0xc8a098, 0x100204], moon: 0xff9070, flesh: 0xa89490, dark: 0.36, fog: '#1e0c12', motes: '#ff4030', storm: true },
  iron: { stone: 'brick', ss: { colorize: [30, 0.06], light: -0.06, contrast: 1.08 }, trim: 'ashlar', ts: { colorize: [36, 0.14], light: 0.02 }, floor: 'slatestone', fs: { colorize: [30, 0.08], light: -0.02 },
    roof: 'roof_black', lamp: 0xffb060, sky: ['#030304', '#141620', '#34303c'], abyss: '#040406', amb: 0x5a5a60, hemi: [0xc8c0b8, 0x101014], moon: 0xe8e0d0, flesh: 0xb8aca8, dark: 0.32, fog: '#191922', motes: '#d8c8b0' },
};
const files = (st) => [st.stone, st.trim, st.floor, st.roof, 'iron', 'wood', 'chapel', 'rubble'].map((k) => TEX + k + '.png');

/** three.js and a style's textures (every style's if none is named). Rejects if three.js can't be fetched. */
export async function loadSpires3D(style = null) {
  if (!T) [T, BGU] = await Promise.all([import('three'), import('three/addons/utils/BufferGeometryUtils.js')]);
  const list = style ? files(STYLES[style] || STYLES.iron) : Object.values(STYLES).flatMap(files);
  await Promise.all([...new Set(list)].map(loadImg));
}
export const spires3dReady = () => !!T;
export const spiresScene = () => S;

function renderer() {
  if (R) return R;
  const gl = new T.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'high-performance' });
  gl.setPixelRatio(1);
  const cam = new T.OrthographicCamera(-10, 10, 10, -10, 1, 1600);
  const e = Math.PI / 6, a = Math.PI / 4;
  cam.position.set(Math.cos(e) * Math.sin(a), Math.sin(e), Math.cos(e) * Math.cos(a)).multiplyScalar(760);
  cam.up.set(0, 1, 0); cam.lookAt(0, 0, 0); cam.updateMatrixWorld();
  R = { gl, cam, w: 0, h: 0 };
  return R;
}

// ------------------------------------------------------------------ materials
async function texture(src, swap) {
  const img = await loadImg(src), c = recolor(img, swap);
  const t = new T.CanvasTexture(c);
  t.colorSpace = T.SRGBColorSpace; t.wrapS = t.wrapT = T.RepeatWrapping; t.magFilter = T.NearestFilter; t.anisotropy = 4;
  return t;
}
// the abyss: stone far below the hero fades into the dark, so every spire falls away into nothing
const FOG = { y: { value: 0 }, c: { value: null } };
function fogged(m, key) {
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uFogY = FOG.y; sh.uniforms.uFogC = FOG.c;
    sh.vertexShader = 'varying float vWY;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n\tvWY = (modelMatrix * vec4(transformed, 1.0)).y;');
    sh.fragmentShader = 'uniform float uFogY; uniform vec3 uFogC; varying float vWY;\n' + sh.fragmentShader.replace('#include <dithering_fragment>',
      '#include <dithering_fragment>\n\tfloat fogD = clamp((uFogY - vWY - 5.0) / 30.0, 0.0, 1.0), fogU = clamp((vWY - uFogY - 26.0) / 50.0, 0.0, 1.0);\n\tgl_FragColor.rgb = mix(gl_FragColor.rgb, uFogC, fogD * 0.85 + fogU * 0.1);');
  };
  m.customProgramCacheKey = () => key;
  return m;
}
async function materials(st) {
  const M = {};
  FOG.c.value = new T.Color(st.abyss);
  const std = async (k, src, swap, o = {}) => {
    const map = await texture(TEX + src + '.png', swap), bump = map.clone(); bump.colorSpace = T.NoColorSpace; bump.needsUpdate = true;
    M[k] = fogged(new T.MeshStandardMaterial({ map, bumpMap: bump, bumpScale: o.bump ?? 1.1, roughness: o.rough ?? 0.9, metalness: o.metal ?? 0, color: o.color ?? 0xd8d2ca, side: o.side ?? T.FrontSide }), 'spire' + (o.side ? 'd' : ''));
  };
  await Promise.all([
    std('stone', st.stone, st.ss, { color: 0x9a948c }), std('trim', st.trim, st.ts, { color: 0xece6dc }), std('floor', st.floor, st.fs, { bump: 0.7, color: 0xe8e2da }),
    std('roof', st.roof, null, { bump: 0.8, color: 0xc8c4c0 }), std('iron', 'iron', { sat: 0.4, light: -0.12 }, { metal: 0.4, rough: 0.55, bump: 0.5 }),
    std('wood', 'wood', { light: -0.12 }, { bump: 0.5 }), std('bone', 'chapel', { colorize: [44, 0.16], light: 0.16, contrast: 0.9 }, { color: 0xfff4e0, bump: 0.6 }),
    std('rubble', 'rubble', st.ss, { bump: 1.2 }), std('flesh', 'chapel', { colorize: [12, 0.3], light: -0.04, contrast: 0.8 }, { color: st.flesh, rough: 0.7, bump: 2.2 }),
    std('bronze', 'iron', { colorize: [36, 0.6], light: 0.06 }, { color: 0xe0b070, metal: 0.7, rough: 0.4, bump: 0.4 }),
  ]);
  M.lamp = fogged(new T.MeshStandardMaterial({ color: 0xfff0d0, emissive: st.lamp, emissiveIntensity: 2.4 }), 'spirefog');
  M.slit = fogged(new T.MeshBasicMaterial({ color: new T.Color(st.lamp).multiplyScalar(0.85), side: T.DoubleSide }), 'spirefogb');
  M.blood = fogged(new T.MeshBasicMaterial({ color: 0xa00810 }), 'spirefogb');
  M.rune = new T.MeshBasicMaterial({ color: 0xc040ff, transparent: true, opacity: 0.8, blending: T.AdditiveBlending, depthWrite: false });
  M.cloth = fogged(new T.MeshStandardMaterial({ color: 0x6a0a10, roughness: 0.95, side: T.DoubleSide }), 'spired');
  M.nail = fogged(new T.MeshStandardMaterial({ color: 0x3a2a2a, roughness: 0.4 }), 'spire');
  return M;
}
let haloTex = null;
function halo() {
  if (haloTex) return haloTex;
  const c = makeCanvas(64, 64), x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, '#fff'); g.addColorStop(0.22, '#fff8'); g.addColorStop(1, '#fff0');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  haloTex = new T.CanvasTexture(c); haloTex.colorSpace = T.SRGBColorSpace;
  return haloTex;
}
const glow = (color, size, opacity = 1) => {
  const s = new T.Sprite(new T.SpriteMaterial({ map: halo(), color, blending: T.AdditiveBlending, depthWrite: false, transparent: true, opacity }));
  s.scale.setScalar(size); return s;
};

// ------------------------------------------------------------------ geometry
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
/** Triangles per material, merged into one mesh each. Quads are wound to face their given normal. */
class Build {
  constructor() { this.by = new Map(); }
  arr(k) { let a = this.by.get(k); if (!a) this.by.set(k, (a = { p: [], n: [], u: [], g: [] })); return a; }
  quad(k, a, b, c, d, n, uv) {
    const ab = sub(b, a), ac = sub(c, a), cr = [ab[1] * ac[2] - ab[2] * ac[1], ab[2] * ac[0] - ab[0] * ac[2], ab[0] * ac[1] - ab[1] * ac[0]];
    if (!n) { const l = Math.hypot(...cr) || 1; n = [cr[0] / l, cr[1] / l, cr[2] / l]; }
    let P = [a, b, c, d], U = uv;
    if (cr[0] * n[0] + cr[1] * n[1] + cr[2] * n[2] < 0) { P = [a, d, c, b]; U = [uv[0], uv[3], uv[2], uv[1]]; }
    const A = this.arr(k);
    for (const i of [0, 1, 2, 0, 2, 3]) { A.p.push(...P[i]); A.n.push(...n); A.u.push(...U[i]); }
  }
  tri(k, a, b, c, n, uv) { const A = this.arr(k); for (const [p, q] of [[a, uv[0]], [b, uv[1]], [c, uv[2]]]) { A.p.push(...p); A.n.push(...n); A.u.push(...q); } }
  add(k, g) { g = g.index ? g.toNonIndexed() : g; if (!g.attributes.normal) g.computeVertexNormals(); for (const n of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(n)) g.deleteAttribute(n); this.arr(k).g.push(g); }
  build(M, name) {
    const grp = new T.Group(); grp.name = name;
    for (const [k, a] of this.by) {
      const list = [...a.g];
      if (a.p.length) {
        const g = new T.BufferGeometry();
        g.setAttribute('position', new T.Float32BufferAttribute(a.p, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(a.n, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(a.u, 2));
        list.push(g);
      }
      if (!list.length) continue;
      const mesh = new T.Mesh(list.length > 1 ? BGU.mergeGeometries(list) : list[0], M[k]);
      mesh.frustumCulled = false; grp.add(mesh);
    }
    return grp;
  }
}
/** UVs from position by face direction: masonry runs on across parts (1 repeat per 1.6 tiles across, 3 up). */
function worldUV(g, ku = 1 / 1.6, kv = 1 / 3) {
  g = g.index ? g.toNonIndexed() : g;
  g.computeVertexNormals();
  const p = g.attributes.position, n = g.attributes.normal, uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    if (ay > 0.7) { uv[i * 2] = x * ku; uv[i * 2 + 1] = z * ku; } else if (ax > az) { uv[i * 2] = z * ku; uv[i * 2 + 1] = y * kv; } else { uv[i * 2] = x * ku; uv[i * 2 + 1] = y * kv; }
  }
  g.setAttribute('uv', new T.BufferAttribute(uv, 2));
  return g;
}
/** A geometry made in a crossing's local frame (x along s, y up, z inward) laid onto the level at (s0, h0). */
function frameMatrix(rb, s, h) {
  const q = rb.pos(s, 0), tau = rb.tau(s), m = new T.Matrix4();
  m.makeRotationY(-tau); m.setPosition(q[0], h, q[1]);
  return m;
}
const rnd = (seed) => { let h = seed | 0 || 1; return () => ((h = (Math.imul(h ^ (h >>> 13), 1274126177) + 0x6d2b79f5) | 0) >>> 0) / 4294967296; };

/** The scene of one floor (generateSpires' spires). Built once per level, after loadSpires3D. */
export async function buildSpires3D(gen) {
  const sp = gen.spires, st = STYLES[sp.style] || STYLES.iron, rb = sp.rb, map = gen.map, X1 = sp.X1, YC = sp.YC;
  if (S && S.sp === sp) return S;
  await loadSpires3D(sp.style);
  if (S && S.sp === sp) return S;
  disposeSpires3D();
  renderer();
  const M = await materials(st);
  const scene = new T.Scene(), root = new T.Group(), sky = new T.Group();
  scene.add(root, sky);
  const B = new Build(), lights = [], flick = [], R3 = rnd(sp.seed || 7);
  const V = (s, u, h) => { const q = rb.pos(s, u); return [q[0], h ?? q[2], q[1]]; };
  const tileAt = (s, u) => { const x = Math.floor(X1 - s), y = Math.floor(YC + u); return x >= 0 && y >= 0 && x < map.w && y < map.h ? map.t[y * map.w + x] + (map.block[y * map.w + x] ? 2 : 0) : 0; };
  const hBot = Math.min(...sp.towers.map((t) => t.foot ?? t.top)) - 90;
  // a box laid along the ribbon: s in [sa, sb], u in [ua, ub], from hb to ht above the route's own height (curved on a helix)
  const slab = (k, sa, sb, ua, ub, hb, ht, flat = null, faces = 63) => {
    const n = Math.max(1, Math.ceil((sb - sa) / 1.01));
    for (let i = 0; i < n; i++) {
      const a = sa + (sb - sa) * i / n, b = sa + (sb - sa) * (i + 1) / n, ha = flat ?? rb.h(a), hbv = flat ?? rb.h(b);
      const c = (s, u, h) => V(s, u, h);
      const A0 = c(a, ua, ha + hb), A1 = c(a, ub, ha + hb), B1 = c(b, ub, hbv + hb), B0 = c(b, ua, hbv + hb);
      const A0t = c(a, ua, ha + ht), A1t = c(a, ub, ha + ht), B1t = c(b, ub, hbv + ht), B0t = c(b, ua, hbv + ht);
      const w = Math.abs(ub - ua), L = b - a, us = a / 1.6;
      if (faces & 1) B.quad(k, A0t, A1t, B1t, B0t, [0, 1, 0], [[us, ua / 1.6], [us, ub / 1.6], [us + L / 1.6, ub / 1.6], [us + L / 1.6, ua / 1.6]]);
      if (faces & 2) B.quad(k, A0, B0, B1, A1, [0, -1, 0], [[0, 0], [L / 1.6, 0], [L / 1.6, w / 1.6], [0, w / 1.6]]);
      const v0 = hb / 3, v1 = ht / 3;
      if (faces & 4) B.quad(k, A1, B1, B1t, A1t, null, [[us, v0], [us + L / 1.6, v0], [us + L / 1.6, v1], [us, v1]]);
      if (faces & 8) B.quad(k, B0, A0, A0t, B0t, null, [[us + L / 1.6, v0], [us, v0], [us, v1], [us + L / 1.6, v1]]);
      if ((faces & 16) && i === 0) B.quad(k, A0, A1, A1t, A0t, null, [[0, v0], [w / 1.6, v0], [w / 1.6, v1], [0, v1]]);
      if ((faces & 32) && i === n - 1) B.quad(k, B1, B0, B0t, B1t, null, [[0, v0], [w / 1.6, v0], [w / 1.6, v1], [0, v1]]);
    }
  };
  const lantern = (s, u, h) => {
    const p = V(s, u, h), tau = rb.tau(s), o = [Math.sin(tau), 0, -Math.cos(tau)];
    const L = new T.BoxGeometry(0.26, 0.42, 0.26).translate(p[0] + o[0] * 0.55, p[1], p[2] + o[2] * 0.55); B.add('lamp', L);
    B.add('iron', worldUV(new T.BoxGeometry(0.4, 0.06, 0.4).translate(p[0] + o[0] * 0.55, p[1] - 0.26, p[2] + o[2] * 0.55)));
    B.add('iron', worldUV(new T.ConeGeometry(0.28, 0.26, 4).translate(p[0] + o[0] * 0.55, p[1] + 0.34, p[2] + o[2] * 0.55)));
    B.add('iron', worldUV(new T.BoxGeometry(0.6, 0.06, 0.06).rotateY(-tau - Math.PI / 2).translate(p[0] + o[0] * 0.28, p[1] + 0.5, p[2] + o[2] * 0.28)));
    const g = glow(st.lamp, 2.2, 0.75); g.position.set(p[0] + o[0] * 0.55, p[1], p[2] + o[2] * 0.55); root.add(g); flick.push({ o: g, base: 2.2 });
    lights.push({ p: [p[0] + o[0] * 0.9, p[1], p[2] + o[2] * 0.9], c: st.lamp, r: 9, i: 1.2 });
  };
  const torch = (p, size = 1) => {   // a brazier: an iron bowl on a post, fire in it
    B.add('iron', worldUV(new T.CylinderGeometry(0.12 * size, 0.18 * size, 1.1 * size, 6).translate(p[0], p[1] + 0.55 * size, p[2])));
    B.add('iron', worldUV(new T.CylinderGeometry(0.5 * size, 0.22 * size, 0.36 * size, 8).translate(p[0], p[1] + 1.25 * size, p[2])));
    B.add('lamp', new T.ConeGeometry(0.36 * size, 0.8 * size, 6).translate(p[0], p[1] + 1.75 * size, p[2]));
    const g = glow(st.lamp, 3.6 * size, 0.8); g.position.set(p[0], p[1] + 1.8 * size, p[2]); root.add(g); flick.push({ o: g, base: 3.6 * size });
    lights.push({ p: [p[0], p[1] + 2, p[2]], c: st.lamp, r: 12, i: 1.6 });
  };
  const parapet = (sa, sb, ua, ub, top = 1.05, flat = null) => {
    slab('trim', sa, sb, ua, ub, -0.05, top, flat, 63);
    if ((Math.floor(sa) & 1) === 0) slab('trim', sa + 0.15, sb - 0.15, ua + 0.06, ub - 0.06, top, top + 0.42, flat, 63);   // merlons
  };

  // ---- the spires
  for (const t of sp.towers) {
    if (t.kind !== 'helix') continue;
    const p = rb.piece(t.s0 + 0.01), rd = t.R - 2, wallTop = t.top + 5.2, H = wallTop - hBot;
    // the drum, from the abyss to above the crown, windows and lanterns on it
    const drum = new T.CylinderGeometry(rd, rd, H, 72, 1, true).translate(t.cx, hBot + H / 2, t.cz);
    { const uv = drum.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * TAU * rd / 1.6, uv.getY(i) * H / 3); }
    B.add('stone', drum);
    for (let s = t.s0 + 5; s < t.s1 - 3; s += 9) lantern(s, -2.05, rb.h(s) + 2.3);
    for (let s = t.s0 + 9.5; s < t.s1 - 2; s += 6.5) {   // lit arrow slits, high on the drum between the turns
      const q = V(s, -2.02, rb.h(s) + 3.9), tau = rb.tau(s);
      const g = new T.PlaneGeometry(0.28, 1.5).rotateY(-tau).translate(q[0], q[1], q[2]); B.add('slit', g);
      B.add('trim', worldUV(new T.BoxGeometry(0.7, 0.18, 0.3).rotateY(-tau).translate(q[0], q[1] - 0.86, q[2])));
    }
    // string courses round the drum at the foot and the crown
    for (let hh = t.foot - 1.6; hh < wallTop; hh += 6) B.add('trim', worldUV(new T.CylinderGeometry(rd + 0.3, rd + 0.3, 0.55, 72, 1, true).translate(t.cx, hh, t.cz)));   // a string course every storey
    { const H = wallTop - t.foot + 1.6; for (let k = 0; k < 12; k++) { const a = k / 12 * TAU; B.add('trim', worldUV(new T.BoxGeometry(0.7, H, 0.45).rotateY(-a).translate(t.cx + Math.cos(a) * (rd + 0.2), t.foot - 1.6 + H / 2, t.cz + Math.sin(a) * (rd + 0.2)))); } }   // and pilasters up the drum
    // the crown: machicolations, a cone of slate, a finial, his banners
    B.add('trim', worldUV(new T.CylinderGeometry(rd + 0.7, rd + 0.25, 0.9, 72).translate(t.cx, wallTop + 0.45, t.cz)));
    for (let k = 0; k < 28; k++) { const a = k / 28 * TAU; B.add('trim', worldUV(new T.BoxGeometry(0.5, 0.7, 0.6).rotateY(-a).translate(t.cx + Math.cos(a) * (rd + 0.5), wallTop + 1.25, t.cz + Math.sin(a) * (rd + 0.5)))); }
    const coneH = rd * 2.7 + R3() * 4, cone = new T.ConeGeometry(rd + 0.9, coneH, 48, 6, true).translate(t.cx, wallTop + 0.9 + coneH / 2, t.cz);
    { const uv = cone.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * TAU * rd / 2.2, uv.getY(i) * coneH / 2.6); }
    B.add('roof', cone);
    const tip = wallTop + 0.9 + coneH;
    B.add('iron', worldUV(new T.CylinderGeometry(0.08, 0.12, 3.2, 6).translate(t.cx, tip + 1.4, t.cz)));
    B.add('iron', worldUV(new T.SphereGeometry(0.32, 8, 6).translate(t.cx, tip + 0.5, t.cz)));
    const ex = glow(0xff2a10, 2.2, 0.9); ex.position.set(t.cx, tip + 3.1, t.cz); root.add(ex); flick.push({ o: ex, base: 2.2 });
    for (let k = 0; k < 3; k++) {   // long red banners down the drum, his eye on each
      const a = R3() * TAU, bh = 6 + R3() * 3, g = new T.PlaneGeometry(1.6, bh).translate(0, -bh / 2, 0).rotateY(-a + Math.PI / 2).translate(t.cx + Math.cos(a) * (rd + 0.06), wallTop - 0.4, t.cz + Math.sin(a) * (rd + 0.06));
      B.add('cloth', g);
    }
    // the stair: treads with lit nosings, risers, the outer face and the soffit, corbels under the outer edge
    const n = Math.ceil((t.s1 - t.s0) / 1.15);
    let hPrev = rb.h(t.s0);
    for (let i = 0; i < n; i++) {
      const a = t.s0 + (t.s1 - t.s0) * i / n, b = t.s0 + (t.s1 - t.s0) * (i + 1) / n, hq = rb.h((a + b) / 2);
      for (let j = 0; j < 2; j++) {
        const sa = a + (b - a) * j / 2, sb = a + (b - a) * (j + 1) / 2;
        const q = [V(sa, -2, hq), V(sa, 2.8, hq), V(sb, 2.8, hq), V(sb, -2, hq)];
        B.quad('floor', ...q, [0, 1, 0], q.map((v) => [v[0] / 1.6, v[2] / 1.6]));
        B.quad('stone', V(sa, 2.8, hq - 2.4), V(sb, 2.8, hq - 2.4), V(sb, 2.8, hq), V(sa, 2.8, hq), null, [[sa / 1.6, 0], [sb / 1.6, 0], [sb / 1.6, 0.45], [sa / 1.6, 0.45]]);
        const d = [V(sa, -2, hq - 2.4), V(sa, 2.8, hq - 2.4), V(sb, 2.8, hq - 2.4), V(sb, -2, hq - 2.4)];
        B.quad('stone', ...d, [0, -1, 0], d.map((v) => [v[0] / 1.6, v[2] / 1.6]));
      }
      if (Math.abs(hq - hPrev) > 0.01) B.quad('trim', V(a, -2, Math.min(hq, hPrev)), V(a, 2.8, Math.min(hq, hPrev)), V(a, 2.8, Math.max(hq, hPrev)), V(a, -2, Math.max(hq, hPrev)), null, [[0, 0], [3, 0], [3, 0.1], [0, 0.1]]);
      B.quad('trim', V(a, -2, hq + 0.04), V(a, 2.8, hq + 0.04), V(a + 0.3, 2.8, hq + 0.04), V(a + 0.3, -2, hq + 0.04), [0, 1, 0], [[0, 0], [3, 0], [3, 0.08], [0, 0.08]]);
      hPrev = hq;
      if (i % 2 === 0) slab('stone', a + 0.3, a + 0.9, 1.4, 2.7, -2.6, -1.3, hq, 63);   // corbels
      // the parapet, or what's left of it
      const pc = tileAt((a + b) / 2, 2.5);
      if (pc === 3) parapet(a, b, 2.15, 2.75, 1.0, hq);
      else if (pc === 0) { if (R3() < 0.5) slab('rubble', a + 0.2, a + 0.7, 2.2, 2.6, 0, 0.35 + R3() * 0.3, hq, 63); }
    }
    // the balconies: a deck on a great corbel, a parapet round it
    for (const bal of sp.balconies.filter((q) => q.tower === t)) {
      const hb = rb.h(bal.s), N = 20;
      const at = (k) => { const ang = Math.PI * k / N; return [bal.s - Math.cos(ang) * bal.half, 2 + Math.sin(ang) * bal.out]; };
      for (let k = 0; k < N; k++) {
        const [s0, u0] = at(k), [s1, u1] = at(k + 1), c0 = V(bal.s, 2, hb);
        B.tri('floor', c0, V(s0, u0, hb), V(s1, u1, hb), [0, 1, 0], [[c0[0] / 1.6, c0[2] / 1.6], [V(s0, u0, hb)[0] / 1.6, V(s0, u0, hb)[2] / 1.6], [V(s1, u1, hb)[0] / 1.6, V(s1, u1, hb)[2] / 1.6]]);
        const e0 = V(s0, u0, hb), e1 = V(s1, u1, hb), f0 = V(s0, u0, hb - 1.1), f1 = V(s1, u1, hb - 1.1), r0 = V(s0, u0 + 0.6, hb), r1 = V(s1, u1 + 0.6, hb);
        B.quad('stone', f0, f1, e1, e0, null, [[0, 0], [1, 0], [1, 0.4], [0, 0.4]]);
        const top = hb + 1.05 + (k & 1 ? 0.4 : 0), t0 = V(s0, u0, top), t1 = V(s1, u1, top), tr0 = V(s0, u0 + 0.6, top), tr1 = V(s1, u1 + 0.6, top);
        B.quad('trim', e0, e1, t1, t0, null, [[0, 0], [0.6, 0], [0.6, 0.4], [0, 0.4]]);
        B.quad('trim', r0, r1, tr1, tr0, null, [[0, 0], [0.6, 0], [0.6, 0.4], [0, 0.4]]);
        B.quad('trim', t0, t1, tr1, tr0, [0, 1, 0], [[0, 0], [0.6, 0], [0.6, 0.1], [0, 0.1]]);
        // the corbel under it: courses stepping in toward the drum
        const g0 = V(s0, 2 + (u0 - 2) * 0.35, hb - 4.5), g1 = V(s1, 2 + (u1 - 2) * 0.35, hb - 4.5);
        B.quad('stone', g0, g1, f1, f0, null, [[0, 0], [1, 0], [1, 1.2], [0, 1.2]]);
      }
      torch(V(bal.s, 2 + bal.out * 0.8, hb), 0.8);
    }
    // gates where the bridges meet the spire: an arch over the stair at its foot and its crown
    for (const [s, hh] of [[t.s0 + 0.6, rb.h(t.s0)], [t.s1 - 0.6, rb.h(t.s1)]]) arch(s, hh);
    void p;
  }
  function arch(s, hh) {
    for (const u of [-2.6, 2.6]) slab('trim', s - 0.4, s + 0.4, u - 0.35, u + 0.35, -0.1, 3.4, hh, 63);
    for (let k = 0; k < 10; k++) {
      const f0 = k / 10, f1 = (k + 1) / 10, y = (f) => 3.4 + 1.5 * Math.sin(Math.PI * f), u = (f) => -2.6 + 5.2 * f;
      slab('trim', s - 0.4, s + 0.4, u(f0), u(f1), y(f0) - 0.1, y(f0) + 0.55, hh, 63);
    }
    const g = glow(st.lamp, 1.6, 0.6), q = V(s, 0, hh + 4.6); g.position.set(...q); root.add(g);
  }

  // ---- the bridges and the round tower tops: tiles of floor, faces where they meet the void, parapets on the blocked
  const gapAt = (s) => sp.bridges.find((b) => b.gap && s > b.g0 - 0.05 && s < b.g1 + 0.05);
  for (const br of sp.bridges) {
    for (let s = Math.floor(br.s0); s < Math.ceil(br.s1); s++) {
      if (gapAt(s + 0.5)) continue;
      const sa = Math.max(br.s0, s), sb = Math.min(br.s1, s + 1);
      if (sb - sa < 0.01) continue;
      slab('floor', sa, sb, -3, 3, -0.02, 0, null, 1);
      slab('stone', sa, sb, -3, 3, -1.5, -0.02, null, 2 | 4 | 8);
      slab('stone', sa, sb, -1.2, 1.2, -3.0, -1.5, null, 2 | 4 | 8);   // the keel under the deck
      for (const u of [-2.5, 2.5]) {
        const c = tileAt(s + 0.5, u);
        if (c === 3) parapet(sa, sb, u - 0.3, u + 0.3, 1.0);
        else if (c === 0 && R3() < 0.6) slab('rubble', sa + 0.2, sb - 0.2, u - 0.25, u + 0.25, 0, 0.25 + R3() * 0.35, null, 63);
      }
      if (gapAt(s + 1.5) || gapAt(s - 0.5)) { slab('stone', sa, sb, -3, 3, -1.5, 0, null, gapAt(s + 1.5) ? 32 : 16); for (let k = 0; k < 4; k++) { const u = -2.6 + R3() * 5.2; slab('rubble', gapAt(s + 1.5) ? sb - 0.1 : sa - 0.4, gapAt(s + 1.5) ? sb + 0.4 : sa + 0.1, u - 0.3, u + 0.3, -1.4 + R3(), -0.2 + R3() * 0.5, null, 63); } }
    }
    // gibbets hung under the longer bridges
    for (let s = br.s0 + 6; s < br.s1 - 6; s += 9) {
      if (gapAt(s) || R3() < 0.45) continue;
      const q = V(s, (R3() - 0.5) * 2, rb.h(s) - 3), len = 3 + R3() * 4;
      B.add('iron', worldUV(new T.CylinderGeometry(0.05, 0.05, len, 4).translate(q[0], q[1] - len / 2, q[2])));
      const cy = q[1] - len - 1.1;
      for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; B.add('iron', new T.BoxGeometry(0.06, 2, 0.06).translate(q[0] + Math.cos(a) * 0.5, cy, q[2] + Math.sin(a) * 0.5)); }
      B.add('iron', worldUV(new T.CylinderGeometry(0.55, 0.55, 0.08, 10).translate(q[0], cy - 1, q[2])));
      B.add('iron', worldUV(new T.ConeGeometry(0.6, 0.5, 10).translate(q[0], cy + 1.2, q[2])));
      B.add('bone', worldUV(new T.SphereGeometry(0.2, 6, 5).translate(q[0] + 0.1, cy + 0.5, q[2])));
      B.add('bone', worldUV(new T.BoxGeometry(0.3, 0.7, 0.2).translate(q[0], cy - 0.1, q[2])));
    }
  }
  for (const t of sp.towers) {
    if (t.kind !== 'disc') continue;
    const r = t.rd + 1, H = t.top - hBot, cx = t.cx, cz = t.cz;
    const drum = new T.CylinderGeometry(r - 0.1, r - 0.4, H, 64, 1, true).translate(cx, hBot + H / 2 - 0.02, cz);
    { const uv = drum.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * TAU * r / 1.6, uv.getY(i) * H / 3); }
    B.add('stone', drum);
    const top = new T.CircleGeometry(r - 0.05, 64).rotateX(-Math.PI / 2).translate(cx, t.top, cz);
    { const p = top.attributes.position, uv = top.attributes.uv, g = R3() * TAU, c = Math.cos(g), sn = Math.sin(g); for (let i = 0; i < p.count; i++) { const x = p.getX(i) - cx, z = p.getZ(i) - cz; uv.setXY(i, (x * c - z * sn) / 1.6, (x * sn + z * c) / 1.6); } }
    B.add('floor', top);
    B.add('trim', worldUV(new T.RingGeometry(r - 1.6, r - 0.05, 64).rotateX(-Math.PI / 2).translate(cx, t.top + 0.01, cz)));   // a flagstone border round the rim
    B.add('trim', worldUV(new T.CircleGeometry(2.2, 32).rotateX(-Math.PI / 2).translate(cx, t.top + 0.015, cz)));            // and a boss at the heart
    B.add('trim', worldUV(new T.RingGeometry(r * 0.45, r * 0.45 + 0.35, 64).rotateX(-Math.PI / 2).translate(cx, t.top + 0.012, cz)));
    B.add('trim', worldUV(new T.CylinderGeometry(r + 0.5, r - 0.1, 1.2, 64).translate(cx, t.top - 0.9, cz)));   // the machicolated course under the rim
    for (let k = 0; k < 8; k++) { const a = k / 8 * TAU + 0.2; const q = [cx + Math.cos(a) * (r - 0.05), t.top - 3.5, cz + Math.sin(a) * (r - 0.05)]; B.add('slit', new T.PlaneGeometry(0.3, 1.5).rotateY(-a + Math.PI / 2).translate(...q)); }
    // the crenellated parapet round the rim, open where the bridge leaves
    const N = Math.round(r * 5);
    const bridgeAng = Math.atan2(...(() => { const b = t.start ? rb.pos(t.sc + t.rd + 1, 0) : rb.pos(t.sc - t.rd - 1, 0); return [b[1] - cz, b[0] - cx]; })());
    for (let k = 0; k < N; k++) {
      const a0 = k / N * TAU, a1 = (k + 1) / N * TAU, am = (a0 + a1) / 2, d = Math.abs(((am - bridgeAng + Math.PI) % TAU + TAU) % TAU - Math.PI);
      if (d * r < 2.7) continue;
      const hgt = k % 2 ? 1.0 : 1.45, g = new T.BoxGeometry(0.6, hgt, TAU * r / N + 0.04).translate(r - 0.3, hgt / 2, 0).rotateY(-am).translate(cx, t.top, cz);
      B.add('trim', worldUV(g));
    }
    if (t.summit) {   // braziers round the summit, and his likeness at its far edge, watching the stair
      for (let k = 0; k < 4; k++) { const a = bridgeAng + Math.PI / 4 + k * Math.PI / 2; torch([cx + Math.cos(a) * r * 0.72, t.top, cz + Math.sin(a) * r * 0.72], 1.1); }
      statue(cx - Math.cos(bridgeAng) * (r - 2.6), t.top, cz - Math.sin(bridgeAng) * (r - 2.6), bridgeAng);
    } else torch([cx - Math.cos(bridgeAng) * r * 0.6, t.top, cz - Math.sin(bridgeAng) * r * 0.6], 1);
  }
  /** Lord Velscour in black stone, horned and robed, his eyes lit, looking down the bridge at whoever comes. */
  function statue(x, y, z, face) {
    const rot = -face - Math.PI / 2, P = (g) => g.rotateY(rot).translate(x, y, z);
    B.add('stone', worldUV(P(new T.CylinderGeometry(1.7, 2.0, 1.2, 10).translate(0, 0.6, 0))));
    B.add('stone', worldUV(P(new T.CylinderGeometry(0.9, 1.7, 5.2, 10).translate(0, 3.8, 0))));
    B.add('stone', worldUV(P(new T.BoxGeometry(3.4, 1.0, 1.4).translate(0, 6.6, 0))));
    for (const sd of [-1, 1]) {
      B.add('stone', worldUV(P(new T.CylinderGeometry(0.38, 0.5, 3.4, 6).rotateZ(sd * 0.32).translate(sd * 1.9, 5.1, 0.3))));
      B.add('stone', worldUV(P(new T.BoxGeometry(0.5, 1.4, 0.3).rotateZ(sd * 0.6).translate(sd * 1.5, 8.4, 0.9))));   // the high collar's wings
      B.add('bone', worldUV(P(new T.ConeGeometry(0.22, 1.9, 6).rotateZ(-sd * 0.7).translate(sd * 0.9, 8.7, 0))));    // horns
    }
    B.add('stone', worldUV(P(new T.SphereGeometry(0.75, 10, 8).scale(0.9, 1.1, 0.9).translate(0, 7.8, 0))));
    B.add('stone', worldUV(P(new T.CylinderGeometry(0.15, 0.15, 8.5, 5).translate(2.3, 4.2, 0.6))));              // his sceptre
    B.add('lamp', P(new T.OctahedronGeometry(0.42).translate(2.3, 8.8, 0.6)));
    for (const sd of [-0.28, 0.28]) { const e = glow(0xff2010, 1.4, 1); const v = new T.Vector3(sd, 7.9, 0.72).applyAxisAngle(new T.Vector3(0, 1, 0), rot).add(new T.Vector3(x, y, z)); e.position.copy(v); root.add(e); flick.push({ o: e, base: 1.4 }); }
    lights.push({ p: [x, y + 8, z], c: 0xff3018, r: 14, i: 1.4 });
  }

  // ---- the crossings' parts (kept apart so they move: game/castlespires.js state, animated in tickSpires3D)
  const parts = [];
  for (const c of sp.crossings) {
    const grp = new T.Group(); grp.matrixAutoUpdate = false; grp.matrix.copy(frameMatrix(rb, c.s0, c.h0)); root.add(grp);
    const P = { c, grp };
    BUILD[c.kind] && BUILD[c.kind](P, M, rb, c, st);
    parts.push(P);
  }
  const statics = B.build(M, 'spires');
  root.add(statics);

  // ---- light: the sky's, a moon, and a pool of point lights moved to the lanterns nearest the hero
  const amb = new T.AmbientLight(st.amb, 0.5), hemi = new T.HemisphereLight(st.hemi[0], st.hemi[1], 0.45);
  const moon = new T.DirectionalLight(st.moon, 2.0); moon.position.set(-60, 32, 10); moon.target.position.set(0, 0, 0);
  const rim = new T.DirectionalLight(st.hemi[0], 0.7); rim.position.set(50, 20, -40);   // a cool rim off the void: the deck edges stand out of the sky
  scene.add(amb, hemi, moon, moon.target, rim);
  const pool = [];
  for (let i = 0; i < (G.touch ? 4 : 7); i++) { const L = new T.PointLight(0xffffff, 0, 10, 1.2); root.add(L); pool.push(L); }
  // ---- the sky: gradient and stars behind all, the skyline, the cloud sea, his eye
  scene.background = skyTexture(st);
  const skyline = skylineGroup(st, M, R3); sky.add(skyline.grp);
  const clouds = cloudLayer(st); root.add(clouds.grp);
  const eye = eyeSprite();   // (its blink only: the eye is drawn in 2D over the sky, drawSpires3D; in 3D the towers hid it)
  S = { sp, st, M, scene, root, sky, lights, flick, parts, pool, amb, hemi, moon, skyline, clouds, eye, t: 0, flash: 0, nextBolt: 2 + Math.random() * 3 };
  return S;
}

// ------------------------------------------------------------------ the crossings in 3D (local: x along s, y up, z inward)
const lerp = (a, b, k) => a + (b - a) * k;
const BUILD = {
  gondola(P, M, rb, c) {
    const L = c.s1 - c.s0, dA = -0.6, dB = L + 0.6, hB = c.h1 - c.h0, sag = 2.4;
    P.chain = (k) => lerp(2.7, hB + 2.7, k) - sag * 4 * k * (1 - k);
    P.da = dA; P.db = dB;
    const g = P.grp, add = (mat, geo) => { const m = new T.Mesh(geo, M[mat]); g.add(m); return m; };
    for (const [a, h] of [[dA - 0.4, 0], [dB + 0.4, hB]]) {   // gantries over each dock
      for (const z of [-1.9, 1.9]) add('wood', worldUV(new T.BoxGeometry(0.32, 4.4, 0.32).translate(a, h + 2.2, z)));
      add('wood', worldUV(new T.BoxGeometry(0.4, 0.36, 4.2).translate(a, h + 4.35, 0)));
      add('iron', new T.TorusGeometry(0.4, 0.09, 6, 14).translate(a, h + 3.9, 0));
    }
    const pts = []; for (let i = 0; i <= 40; i++) { const k = i / 40; pts.push(new T.Vector3(lerp(dA - 0.4, dB + 0.4, k), P.chain(k) + 1.2, 0)); }
    add('iron', new T.TubeGeometry(new T.CatmullRomCurve3(pts), 80, 0.09, 5));
    // the winch on the near landing: a drum on trestles, a ratchet wheel and its pawl, chain wound on
    const w = new T.Group(); w.position.set(-2.8, 0, 2.3); g.add(w); P.winch = w;
    for (const x of [-0.7, 0.7]) w.add(new T.Mesh(worldUV(new T.BoxGeometry(0.22, 1.5, 0.9).translate(x, 0.75, 0)), M.wood));
    w.add(new T.Mesh(worldUV(new T.CylinderGeometry(0.42, 0.42, 1.3, 12).rotateZ(Math.PI / 2).translate(0, 1.25, 0)), M.iron));
    const wheel = new T.Mesh(worldUV(new T.CylinderGeometry(0.8, 0.8, 0.14, 16).rotateZ(Math.PI / 2).translate(0.78, 1.25, 0)), M.iron); w.add(wheel); P.wheel = wheel;
    for (let k = 0; k < 12; k++) { const a = k / 12 * TAU; w.add(new T.Mesh(new T.BoxGeometry(0.16, 0.22, 0.22).translate(0.78, 1.25 + Math.cos(a) * 0.86, Math.sin(a) * 0.86), M.iron)); }
    const lock = glow(0xff3020, 1.6, 0.9); lock.position.set(0.95, 1.9, 0); w.add(lock); P.lock = lock;
    const wpts = [new T.Vector3(-2.8, 1.25, 2.3), new T.Vector3(-1.6, 3.4, 1.0), new T.Vector3(dA - 0.4, 3.9, 0)];
    P.winchChain = add('iron', new T.TubeGeometry(new T.CatmullRomCurve3(wpts), 16, 0.07, 4));
    // the cage: a gibbet, with its last passenger still in it
    const cage = new T.Group(); g.add(cage); P.cage = cage;
    cage.add(new T.Mesh(worldUV(new T.CylinderGeometry(0.85, 0.85, 0.12, 12)), M.iron));
    for (let k = 0; k < 12; k++) { const a = k / 12 * TAU; cage.add(new T.Mesh(new T.BoxGeometry(0.07, 2.3, 0.07).translate(Math.cos(a) * 0.82, 1.15, Math.sin(a) * 0.82), M.iron)); }
    cage.add(new T.Mesh(new T.TorusGeometry(0.82, 0.06, 4, 16).rotateX(Math.PI / 2).translate(0, 2.3, 0), M.iron));
    cage.add(new T.Mesh(worldUV(new T.ConeGeometry(0.9, 0.7, 12, 1, true).translate(0, 2.65, 0)), M.iron));
    cage.add(new T.Mesh(new T.TorusGeometry(0.22, 0.05, 4, 10).translate(0, 3.1, 0), M.iron));
    cage.add(new T.Mesh(worldUV(new T.SphereGeometry(0.2, 6, 5).translate(-0.45, 1.0, -0.4)), M.bone));
    cage.add(new T.Mesh(worldUV(new T.BoxGeometry(0.3, 0.7, 0.22).rotateZ(0.4).translate(-0.5, 0.45, -0.4)), M.bone));
    P.update = (t) => {
      const k = c.k ?? 1, x = lerp(dA, dB, k), y = P.chain(k) - 2.7 + (c.jolt || 0);
      cage.position.set(x, y, 0); cage.rotation.z = Math.sin(t * 2.1) * 0.06 * (c.riding ? 1.6 : 0.6); cage.rotation.x = Math.sin(t * 1.3) * 0.05;
      w.visible = !c.broken; P.winchChain.visible = !c.broken; lock.visible = !c.broken;
      wheel.rotation.x = (c.charge || 0) * 6;
      w.position.x = -2.8 + ((c.charge || 0) > 0 ? Math.sin(t * 60) * 0.04 : 0);
    };
  },
  masonry(P, M, rb, c) {
    const L = c.s1 - c.s0, n = Math.ceil(L), R3 = rnd(c.i * 97 + 5);
    P.stones = [];
    for (let j = 0; j < n; j++) {
      const s = c.s0 + j + 0.5, top = rb.h(s) - c.h0;
      const grp = new T.Group();
      const m = new T.Mesh(worldUV(new T.BoxGeometry(1.02, 0.9, 5.6)), M.stone); grp.add(m);
      const tr = new T.Mesh(worldUV(new T.BoxGeometry(1.02, 0.08, 5.6).translate(0, 0.45, 0)), M.floor); grp.add(tr);
      for (const z of [-2.5, 2.5]) if (R3() < 0.7) grp.add(new T.Mesh(worldUV(new T.BoxGeometry(0.9, 0.9 + R3() * 0.4, 0.55).translate(0, 0.9, z)), M.trim));
      const rune = glow(0xc040ff, 2.2, 0); rune.position.set(0, -0.6, 0); grp.add(rune);
      P.grp.add(grp);
      P.stones.push({ grp, rune, slot: [j + 0.5, top - 0.45, 0], drift: [j + 0.5 + (R3() - 0.5) * 3, -6 - R3() * 9, (R3() - 0.5) * 10], spin: [R3() * TAU, R3() * TAU, R3() * TAU], ph: R3() * TAU });
    }
    P.update = (t) => {
      for (let j = 0; j < P.stones.length; j++) {
        const q = P.stones[j], s = c.stones && c.stones[j] || { st: 'drift', t: 0 }, d = q.drift, bob = Math.sin(t * 0.8 + q.ph);
        const dpos = [d[0], d[1] + bob * 0.6, d[2] + Math.cos(t * 0.5 + q.ph) * 0.8], drot = [q.spin[0] + t * 0.2, q.spin[1] + t * 0.15, q.spin[2]];
        let pos = dpos, rot = drot, glowA = 0.25 + 0.15 * bob;
        if (s.st === 'rise') { const k = Math.min(1, s.t / 0.32), e = 1 - (1 - k) ** 3; pos = dpos.map((v, i) => lerp(v, q.slot[i], e)); rot = drot.map((v) => v * (1 - e)); glowA = 1; }
        else if (s.st === 'set') { pos = q.slot; rot = [0, 0, 0]; glowA = Math.max(0, 0.6 - s.t); }
        else if (s.st === 'fall') { const k = s.t; pos = [q.slot[0], q.slot[1] - 9 * k * k, q.slot[2]]; rot = [k * 1.2, 0, k * 0.8]; glowA = 0; }
        q.grp.position.set(...pos); q.grp.rotation.set(...rot); q.rune.material.opacity = glowA; q.grp.visible = !(s.st === 'fall' && s.t > 2.2);
      }
    };
  },
  hands(P, M, rb, c) {
    const L = c.s1 - c.s0, g = P.grp, rig = new T.Group(); g.add(rig);
    const slab = new T.Mesh(worldUV(new T.BoxGeometry(L + 0.7, 0.9, 5.4).translate(L / 2, -0.45, 0)), M.stone); rig.add(slab);
    rig.add(new T.Mesh(worldUV(new T.BoxGeometry(L + 0.7, 0.06, 5.4).translate(L / 2, 0.02, 0)), M.floor));
    const hand = (a, flip) => {
      const h = new T.Group(); h.position.set(a, -0.9, 0); rig.add(h);
      h.add(new T.Mesh(worldUV(new T.BoxGeometry(2.6, 0.9, 3.4).translate(0, -0.45, 0)), M.flesh));            // the palm under the slab
      const arm = new T.Mesh(worldUV(new T.CylinderGeometry(1.0, 1.7, 46, 10).translate(0, -23.4, 0)), M.flesh);   // the arm, down into the dark
      arm.rotation.z = flip * 0.22; h.add(arm);
      const fingers = [];
      for (let i = 0; i < 4; i++) {   // four fingers curl up over the slab's outer edge
        let par = new T.Group(); par.position.set(-0.95 + i * 0.63, -0.1, -1.7); h.add(par);
        const joints = [];
        for (const [len, r] of [[1.25, 0.32], [0.95, 0.28], [0.72, 0.24]]) {
          const j = new T.Group(); par.add(j);
          j.add(new T.Mesh(worldUV(new T.CylinderGeometry(r * 0.9, r, len, 8).translate(0, len / 2, 0)), M.flesh));
          const nx = new T.Group(); nx.position.set(0, len, 0); j.add(nx); joints.push(j); par = nx;
        }
        par.add(new T.Mesh(new T.BoxGeometry(0.34, 0.08, 0.3).translate(0, 0, 0.12), M.nail));
        fingers.push(joints);
      }
      const thumb = new T.Group(); thumb.position.set(0, -0.1, 1.7); h.add(thumb);
      const tj = [];
      { let par = thumb; for (const [len, r] of [[1.1, 0.38], [0.85, 0.32]]) { const j = new T.Group(); par.add(j); j.add(new T.Mesh(worldUV(new T.CylinderGeometry(r * 0.9, r, len, 8).translate(0, len / 2, 0)), M.flesh)); const nx = new T.Group(); nx.position.set(0, len, 0); j.add(nx); tj.push(j); par = nx; } }
      return { h, fingers, thumb: tj };
    };
    P.hands = [hand(0.9, -1), hand(L - 0.9, 1)];
    P.update = (t) => {
      const ph = c.phase || 'gone', pt = c.pt || 0;
      let y = 0, tilt = 0, curl = 1, slabY = 0;
      if (ph === 'rise') { const k = Math.min(1, pt / (c.riseT || 1.4)), e = 1 - (1 - k) ** 3; y = -16 * (1 - e); }
      else if (ph === 'hold') y = Math.sin(t * 1.4) * 0.05;
      else if (ph === 'open') { const k = Math.min(1, pt / 0.7); curl = Math.max(0, 1 - k * 2.2); slabY = -12 * k * k; tilt = k * 0.5; y = -3 * k; }
      else { y = -30; slabY = -30; }
      rig.position.y = y; slab.position.y = slabY; slab.rotation.x = tilt;
      rig.children[1].position.y = slabY;
      const open = c.fingersOpen || 0;
      P.hands.forEach((H, hi) => {
        H.fingers.forEach((js, i) => {
          const o = ph === 'hold' ? (i < open - (hi ? 0 : 0.5) ? 1 : 0) : ph === 'open' ? 1 - curl : 0, k = ph === 'rise' || ph === 'gone' ? 1 : 1 - o;
          const tremble = ph === 'hold' && (c.left || 9) < 2 ? Math.sin(t * 40 + i) * 0.05 : 0;
          js[0].rotation.x = -(0.3 + 1.0 * k) + tremble; js[1].rotation.x = -1.1 * k; js[2].rotation.x = -0.9 * k;
        });
        const tk = ph === 'open' ? curl : open >= 5 ? 0 : 1;
        H.thumb[0].rotation.x = 0.4 + 1.0 * tk; H.thumb[1].rotation.x = 0.9 * tk;
      });
    };
  },
  bellrope(P, M, rb, c) {
    const L = c.s1 - c.s0, half = L / 2 + 0.6, A = 0.87, Lr = half / Math.sin(A), piv = 1.5 + Lr * Math.cos(A), g = P.grp, mid = L / 2;
    P.geo = { half, Lr, piv, mid, A };
    for (const a of [-1.6, L + 1.6]) {   // the belfry's legs at both brinks, and the beam they carry over the gap
      for (const z of [-3.1, 3.1]) g.add(new T.Mesh(worldUV(new T.BoxGeometry(0.55, piv + 1.4, 0.55).translate(a, (piv + 1.4) / 2 + (a > 0 ? c.h1 - c.h0 : 0) * 0, z)), M.stone));
      g.add(new T.Mesh(worldUV(new T.BoxGeometry(0.7, 0.7, 7).translate(a, piv + 1.2, 0)), M.stone));
    }
    g.add(new T.Mesh(worldUV(new T.BoxGeometry(L + 3.9, 0.6, 0.7).translate(mid, piv + 1.4, 0)), M.wood));
    const bell = new T.Group(); bell.position.set(mid, piv, 0); g.add(bell); P.bell = bell;
    const prof = [[0.05, 0.4], [0.5, 0.36], [0.75, 0.0], [0.95, -1.2], [1.5, -2.2], [1.6, -2.45], [1.35, -2.4]].map(([x, y]) => new T.Vector2(x, y));
    bell.add(new T.Mesh(new T.LatheGeometry(prof, 24), M.bronze));
    bell.add(new T.Mesh(worldUV(new T.BoxGeometry(0.3, 0.6, 1.6).translate(0, 0.6, 0)), M.wood));
    bell.add(new T.Mesh(worldUV(new T.SphereGeometry(0.32, 8, 6).translate(0, -2.2, 0)), M.iron));
    const rope = new T.Group(); rope.position.set(mid, piv, 0); g.add(rope); P.rope = rope;
    rope.add(new T.Mesh(new T.CylinderGeometry(0.07, 0.07, Lr, 5).translate(0, -Lr / 2, 0), M.wood));
    rope.add(new T.Mesh(new T.TorusGeometry(0.28, 0.07, 5, 10).translate(0, -Lr - 0.2, 0), M.wood));
    const knot = glow(0x80ff90, 1.4, 0); knot.position.set(0, -Lr - 0.2, 0); rope.add(knot); P.knot = knot;
    P.update = () => {
      const e = c.e ?? 1, phi = -Math.asin(clampN(e * half / Lr, -0.999, 0.999));
      rope.rotation.z = phi; bell.rotation.z = phi * 0.55;
      knot.material.opacity = c.catchable ? 0.9 : 0;
    };
  },
  collapse(P, M, rb, c) {
    const L = c.s1 - c.s0, n = Math.ceil(L), R3 = rnd(c.i * 31 + 9);
    P.steps = [];
    for (let j = 0; j < n; j++) {
      const s = c.s0 + j + 0.5, top = rb.h(s) - c.h0, grp = new T.Group();
      grp.add(new T.Mesh(worldUV(new T.BoxGeometry(1.04, 0.55, 4.4).translate(0, -0.27, 0)), M.bone));
      grp.add(new T.Mesh(worldUV(new T.BoxGeometry(0.4, 1.8 + R3() * 1.4, 0.6).translate(0, -1.6, (R3() - 0.5) * 2.4)), M.bone));   // the step's bone stilt
      if (j % 3 === 0) for (const z of [-2.3, 2.3]) grp.add(new T.Mesh(worldUV(new T.SphereGeometry(0.3, 7, 6).scale(1, 1.1, 1).translate(0, 0.1, z)), M.bone));
      const ember = glow(0xff5020, 1.8, 0); ember.position.set(0, 0.1, 0); grp.add(ember);
      P.grp.add(grp);
      P.steps.push({ grp, ember, slot: [j + 0.5, top, 0], sp: (R3() - 0.5) * 2 });
    }
    P.update = (t) => {
      for (let j = 0; j < P.steps.length; j++) {
        const q = P.steps[j], s = c.steps && c.steps[j] || { st: 'set', t: 0 };
        let [x, y, z] = q.slot, rx = 0, rz = 0, vis = true, em = 0;
        if (s.st === 'shake') { x += Math.sin(t * 70 + j) * 0.05; y += Math.sin(t * 53 + j) * 0.04; em = 0.9; }
        else if (s.st === 'fall') { y -= 10 * s.t * s.t; rx = s.t * q.sp; rz = s.t * 0.7 * q.sp; vis = s.t < 2.4; em = Math.max(0, 0.6 - s.t); }
        else if (s.st === 'gone') vis = false;
        else if (s.st === 'rebuild') { const k = Math.min(1, s.t / 0.5), e = 1 - (1 - k) ** 2; y -= 8 * (1 - e); rx = (1 - e) * q.sp; }
        q.grp.position.set(x, y, z); q.grp.rotation.set(rx, 0, rz); q.grp.visible = vis; q.ember.material.opacity = em;
      }
    };
  },
  cart(P, M, rb, c) {
    const L = c.s1 - c.s0, dA = -0.8, dB = L + 0.8, hB = c.h1 - c.h0, D = 3.2 + L * 0.1, g = P.grp;
    P.rail = (k) => lerp(0, hB, k) - D * Math.sin(Math.PI * k);
    P.da = dA; P.db = dB;
    for (const z of [-0.7, 0.7]) { const pts = []; for (let i = 0; i <= 40; i++) { const k = i / 40; pts.push(new T.Vector3(lerp(dA - 0.6, dB + 0.6, k), P.rail(k) + 0.1, z)); } g.add(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 60, 0.08, 4), M.iron)); }
    for (let i = 0; i <= Math.ceil((dB - dA) / 0.8); i++) { const k = i / Math.ceil((dB - dA) / 0.8), x = lerp(dA, dB, k); g.add(new T.Mesh(worldUV(new T.BoxGeometry(0.3, 0.14, 1.9).translate(x, P.rail(k) - 0.02, 0)), M.wood)); }
    for (let x = 1.5; x < L - 0.5; x += 3) {   // the trestles: stilts of bone down into the dark, ribs across
      const k = (x - dA) / (dB - dA), y = P.rail(k);
      for (const z of [-0.9, 0.9]) g.add(new T.Mesh(worldUV(new T.CylinderGeometry(0.16, 0.26, 30, 6).translate(x, y - 15.2, z * (1 + (y - 0) * 0))), M.bone));
      for (let d = 1; d < 10; d += 2.6) g.add(new T.Mesh(new T.TorusGeometry(1.0, 0.09, 4, 10, Math.PI).rotateY(Math.PI / 2).translate(x, y - d, 0), M.bone));
    }
    const cart = new T.Group(); g.add(cart); P.cart = cart;
    cart.add(new T.Mesh(worldUV(new T.BoxGeometry(1.7, 0.85, 1.5).translate(0, 0.62, 0)), M.wood));
    for (const z of [-0.76, 0.76]) cart.add(new T.Mesh(worldUV(new T.BoxGeometry(1.74, 0.1, 0.06).translate(0, 0.95, z)), M.iron));
    for (const [x, z] of [[-0.55, -0.72], [0.55, -0.72], [-0.55, 0.72], [0.55, 0.72]]) cart.add(new T.Mesh(worldUV(new T.CylinderGeometry(0.3, 0.3, 0.12, 10).rotateX(Math.PI / 2).translate(x, 0.24, z)), M.iron));
    const cargo = new T.Group(); cart.add(cargo); P.cargo = cargo;
    const R3 = rnd(c.i * 13 + 3);
    for (let k = 0; k < 6; k++) cargo.add(new T.Mesh(worldUV(new T.SphereGeometry(0.32 + R3() * 0.16, 7, 5).scale(1.4, 0.7, 1).translate((R3() - 0.5) * 1.1, 1.05 + R3() * 0.2, (R3() - 0.5) * 0.9)), M.flesh));
    cargo.add(new T.Mesh(worldUV(new T.CylinderGeometry(0.1, 0.12, 1.1, 6).rotateZ(0.5).translate(0.4, 1.5, 0.2)), M.flesh));
    cargo.add(new T.Mesh(worldUV(new T.SphereGeometry(0.22, 7, 5).translate(-0.3, 1.35, -0.3)), M.bone));
    P.update = (t) => {
      const k = c.k ?? 0, x = lerp(dA, dB, k), y = P.rail(k), e = 0.01, sl = (P.rail(Math.min(1, k + e)) - P.rail(Math.max(0, k - e))) / ((dB - dA) * 2 * e);
      cart.position.set(x, y + 0.1, 0); cart.rotation.z = Math.atan(sl); cargo.visible = !c.spent;
      cart.position.y += c.riding ? Math.sin(t * 30) * 0.03 : 0;
    };
  },
  spine(P, M, rb, c) {
    const L = c.s1 - c.s0, n = Math.ceil(L), g = P.grp;
    const plate = new T.Group(); plate.position.set(-1.1, 0, 0); g.add(plate);
    plate.add(new T.Mesh(worldUV(new T.BoxGeometry(1.6, 0.32, 1.6).translate(0, 0.16, 0)), M.bone));
    plate.add(new T.Mesh(new T.BoxGeometry(1.2, 0.04, 0.16).translate(0, 0.34, 0), M.blood));
    plate.add(new T.Mesh(new T.BoxGeometry(0.16, 0.04, 1.2).translate(0, 0.34, 0), M.blood));
    for (const [x, z] of [[-0.7, -0.7], [0.7, -0.7], [-0.7, 0.7], [0.7, 0.7]]) plate.add(new T.Mesh(worldUV(new T.SphereGeometry(0.22, 7, 5).translate(x, 0.5, z)), M.bone));
    const drink = glow(0xff1020, 2.6, 0); drink.position.set(0, 0.5, 0); plate.add(drink); P.drink = drink;
    P.segs = [];
    for (let j = 0; j < n; j++) {
      const s = c.s0 + j + 0.5, top = rb.h(s) - c.h0, seg = new T.Group(); seg.position.set(j + 0.5, top, 0); g.add(seg);
      seg.add(new T.Mesh(worldUV(new T.CylinderGeometry(1.7, 1.7, 0.92, 14).rotateZ(Math.PI / 2).scale(1, 0.42, 1).translate(0, -0.36, 0)), M.bone));
      seg.add(new T.Mesh(worldUV(new T.ConeGeometry(0.35, 2.2, 6).rotateX(Math.PI).translate(0, -1.8, 0)), M.bone));
      for (const sd of [-1, 1]) {
        seg.add(new T.Mesh(new T.TorusGeometry(1.9, 0.11, 5, 12, Math.PI * 0.55).rotateY(Math.PI / 2).rotateX(sd > 0 ? 0 : Math.PI).translate(0, -0.4, 0), M.bone));
        seg.add(new T.Mesh(worldUV(new T.ConeGeometry(0.16, 0.9, 5).rotateX(sd * Math.PI / 2).translate(0, -0.3, sd * 2.0)), M.bone));
      }
      P.segs.push(seg);
    }
    P.update = (t) => {
      const grown = c.grown || 0;
      P.segs.forEach((seg, j) => { const k = clampN(grown - j, 0, 1), e = 1 - (1 - k) ** 2; seg.visible = k > 0.01; seg.scale.set(Math.max(0.05, e), Math.max(0.05, e), Math.max(0.05, e)); seg.position.x = j + 0.5 - (1 - e) * 0.7; });
      drink.material.opacity = c.drinking ? 0.6 + 0.4 * Math.sin(t * 9) : 0;
    };
  },
};
const clampN = (v, a, b) => (v < a ? a : v > b ? b : v);

// ------------------------------------------------------------------ the sky
function skyTexture(st) {
  const c = makeCanvas(256, 256), x = c.getContext('2d'), gr = x.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, st.sky[0]); gr.addColorStop(0.55, st.sky[1]); gr.addColorStop(1, st.sky[2]);
  x.fillStyle = gr; x.fillRect(0, 0, 256, 256);
  let h = 77;
  const r = () => ((h = (Math.imul(h ^ (h >>> 13), 1274126177) + 0x6d2b79f5) | 0) >>> 0) / 4294967296;
  for (let i = 0; i < 240; i++) { const y = r() * r() * 200, a = 0.2 + r() * 0.7 * (1 - y / 220); x.fillStyle = `rgba(255,240,230,${a.toFixed(2)})`; x.fillRect(r() * 256 | 0, y | 0, 1, 1); }
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.magFilter = T.NearestFilter; return t;
}
/** Far spires against the sky and the Throne Tower above them all, drawn at a slow parallax (drawSpires3D places them). */
function skylineGroup(st, M, R3) {
  const grp = new T.Group(), list = [], sky = new T.Color(st.sky[2]), col = (k) => new T.Color(st.abyss).lerp(sky, k);
  const mat = (k) => new T.MeshBasicMaterial({ color: col(k), fog: false });
  for (let i = 0; i < 16; i++) {
    const far = R3(), g = new T.Group(), w = 2 + R3() * 4, h = 40 + R3() * 70, m = mat(0.25 + far * 0.45);
    g.add(new T.Mesh(new T.CylinderGeometry(w, w * 1.15, h, 10).translate(0, h / 2, 0), m));
    g.add(new T.Mesh(new T.ConeGeometry(w * 1.3, w * 3.4, 10).translate(0, h + w * 1.7, 0), m));
    for (let k = 0; k < 5; k++) { const lit = new T.Mesh(new T.PlaneGeometry(0.35, 1.0), new T.MeshBasicMaterial({ color: st.lamp })); lit.position.set((R3() - 0.5) * w, h * (0.4 + R3() * 0.55), w * 0.9); lit.rotation.y = Math.PI / 4; g.add(lit); }
    grp.add(g); list.push({ g, ax: (i / 16 - 0.5) * 3600 + R3() * 120, ay: 260 + R3() * 400, par: 0.08 + far * 0.12, d: 600 + far * 120 });
  }
  // the Throne Tower: his, enormous, crowned in fire
  const tg = new T.Group(), tm = mat(0.18);
  tg.add(new T.Mesh(new T.CylinderGeometry(9, 12, 220, 12).translate(0, 110, 0), tm));
  for (let k = 0; k < 6; k++) { const a = k / 6 * TAU; tg.add(new T.Mesh(new T.ConeGeometry(2.4, 18, 6).translate(Math.cos(a) * 9, 226, Math.sin(a) * 9), tm)); }
  tg.add(new T.Mesh(new T.ConeGeometry(7, 40, 12).translate(0, 240, 0), tm));
  const fire = glow(0xff3010, 46, 0.55); fire.position.set(0, 222, 0); tg.add(fire);
  const crown = glow(0xffa040, 16, 0.8); crown.position.set(0, 236, 0); tg.add(crown);
  grp.add(tg); list.push({ g: tg, ax: 520, ay: 1500, par: 0.05, d: 700, throne: true, fire, crown });
  return { grp, list };
}
/** A sea of cloud far below everything, drifting. */
function cloudLayer(st) {
  const grp = new T.Group(), list = [], tex = [];
  for (let k = 0; k < 3; k++) {
    const c = makeCanvas(192, 96), x = c.getContext('2d');
    for (let i = 0; i < 16; i++) {
      const cx = 24 + Math.random() * 144, cy = 50 + Math.random() * 16, r = 14 + Math.random() * 22, gr = x.createRadialGradient(cx, cy - r * 0.3, r * 0.1, cx, cy, r);
      gr.addColorStop(0, 'rgba(255,255,255,0.35)'); gr.addColorStop(0.4, st.fog + 'c0'); gr.addColorStop(1, st.fog + '00');
      x.fillStyle = gr; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill();
    }
    const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; tex.push(t);
  }
  for (let i = 0; i < 30; i++) {
    const s = new T.Sprite(new T.SpriteMaterial({ map: tex[i % 3], transparent: true, opacity: 0.45 + Math.random() * 0.35, depthWrite: false, color: new T.Color(st.sky[2]) }));
    const w = 26 + Math.random() * 30; s.scale.set(w, w / 2, 1); grp.add(s);
    list.push({ s, x: (Math.random() - 0.5) * 120, z: (Math.random() - 0.5) * 120, y: -5 - Math.random() * 8, sp: 0.4 + Math.random() * 0.8 });
  }
  return { grp, list };
}
/** Velscour's eye in the sky: an iris of fire with a slit that turns to follow the hero, and blinks. */
function eyeSprite() {
  const grp = new T.Group();
  const mk = (draw, size) => { const c = makeCanvas(128, 128), x = c.getContext('2d'); draw(x); const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; const s = new T.Sprite(new T.SpriteMaterial({ map: t, transparent: true, depthWrite: false, fog: false })); s.scale.setScalar(size); return s; };
  const ball = mk((x) => {
    const g = x.createRadialGradient(64, 64, 4, 64, 64, 62); g.addColorStop(0, 'rgba(255,90,30,0.95)'); g.addColorStop(0.45, 'rgba(200,20,10,0.85)'); g.addColorStop(0.75, 'rgba(90,0,0,0.45)'); g.addColorStop(1, 'rgba(40,0,0,0)');
    x.fillStyle = g; x.beginPath(); x.ellipse(64, 64, 62, 34, 0, 0, TAU); x.fill();
    x.strokeStyle = 'rgba(255,160,80,0.5)'; x.lineWidth = 1; for (let i = 0; i < 26; i++) { const a = i / 26 * TAU; x.beginPath(); x.moveTo(64 + Math.cos(a) * 8, 64 + Math.sin(a) * 6); x.lineTo(64 + Math.cos(a) * 30, 64 + Math.sin(a) * 22); x.stroke(); }
  }, 16);
  const pupil = mk((x) => { x.fillStyle = 'rgba(10,0,0,0.95)'; x.beginPath(); x.ellipse(64, 64, 7, 30, 0, 0, TAU); x.fill(); }, 9);
  const haze = mk((x) => { const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,40,10,0.35)'); g.addColorStop(1, 'rgba(255,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); }, 110);
  grp.add(haze, ball, pupil);
  return { grp, ball, pupil, haze, blink: 0, next: 5 };
}

// ------------------------------------------------------------------ each frame
export function tickSpires3D(dt, hook) {
  if (!S || S.sp !== hook.sp) return;
  S.t += dt;
  for (const f of S.flick) f.o.scale.setScalar(f.base * (0.88 + 0.12 * Math.sin(S.t * 11 + f.base * 7)));
  for (const P of S.parts) if (P.update) P.update(S.t);
  for (const c of S.clouds.list) { c.x += c.sp * dt; if (c.x > 60) c.x -= 120; }
  const e = S.eye;
  if ((e.next -= dt) <= 0) { e.blink = 0.28; e.next = 4 + Math.random() * 7; }
  e.blink = Math.max(0, e.blink - dt);
  if (S.st.storm && (S.nextBolt -= dt) <= 0) { S.flash = 1; S.nextBolt = 7 + Math.random() * 10; hook.onBolt && hook.onBolt(); }
  S.flash = Math.max(0, S.flash - dt * 3.2);
}
/** Draw the level behind the sprites (hook = world.tower, game/castlespires.js: alpha, focus). */
export function drawSpires3D(ctx, hook) {
  const W = G.W * G.dpr, H = G.H * G.dpr;
  if (!S || S.sp !== hook.sp) return false;
  const rd = renderer(), z = camera.zoom, q = G.touch ? 0.75 : 1;
  const pw = Math.max(16, Math.round(G.W / z * q)), ph = Math.max(16, Math.round(G.H / z * q));
  if (rd.w !== pw || rd.h !== ph) { rd.gl.setSize(pw, ph, false); rd.w = pw; rd.h = ph; }
  const cx = camera.x + camera.shakeX, cy = camera.y + camera.shakeY, hw = G.W / 2 / z, hh = G.H / 2 / z, cam = rd.cam;
  cam.left = (cx - hw) / SC; cam.right = (cx + hw) / SC; cam.top = -(cy - hh) / SC; cam.bottom = -(cy + hh) / SC; cam.updateProjectionMatrix();
  // the level turned about the hero and moved so he stands at the origin (the 2D warp does the same)
  const a = hook.alpha, F = hook.focus, ca = Math.cos(a), sa = Math.sin(a);
  S.root.rotation.y = a; S.root.position.set(-(ca * F[0] + sa * F[1]), 0, -(-sa * F[0] + ca * F[1]));
  S.root.updateMatrixWorld(true);
  FOG.y.value = F[2];
  // lanterns nearest the hero get the point lights
  const near = [];
  for (const l of S.lights) { const dx = l.p[0] - F[0], dz = l.p[2] - F[1], dy = l.p[1] - F[2], d = dx * dx + dy * dy + dz * dz; if (d < 1600) near.push([d, l]); }
  near.sort((p, q) => p[0] - q[0]);
  for (let i = 0; i < S.pool.length; i++) {
    const L = S.pool[i], n = near[i];
    if (!n) { L.intensity = 0; continue; }
    const l = n[1], fl = 0.88 + 0.12 * Math.sin(S.t * 9 + i * 1.7);
    L.position.set(...l.p); L.color.setHex(l.c); L.distance = l.r; L.intensity = 14 * l.i * fl;
  }
  // lightning: the sky and the stone flash
  const fl = S.flash;
  S.amb.intensity = 0.5 + fl * 2.2; S.hemi.intensity = 0.45 + fl * 2.6;
  // the cloud sea follows below the hero; the skyline drifts at its parallax; the eye keeps its place in the sky
  for (const c of S.clouds.list) c.s.position.set(F[0] + c.x * ca - c.z * sa, F[2] + c.y, F[1] + c.x * sa + c.z * ca);
  const v = new T.Vector3(0.6124, 0.5, 0.6124);
  const at = (wx, wy, d) => { const X = (wx / HW + wy / 16) / 2, Z = (wy / 16 - wx / HW) / 2; return new T.Vector3(X, 0, Z).addScaledVector(v, -d); };
  for (const s of S.skyline.list) {
    let wx = s.ax - cx * s.par; const span = 3800; wx = ((wx + cx + span / 2) % span + span) % span - span / 2 + cx;
    const p = at(wx, cy * (1 - s.par * 0.5) + s.ay - F[2] * 39.19 * 0.15, s.d); s.g.position.copy(p);
    if (s.throne) { s.g.position.copy(at(cx - hw * 0.05 - (cx * s.par) % 200, cy + s.ay * 0.18 + hh * 1.0, s.d)); s.fire.material.opacity = 0.45 + 0.15 * Math.sin(S.t * 2.3) + fl * 0.3; }
  }
  const e = S.eye, ex = cx - hw * 0.3, ey = cy - hh * 0.5, ep = at(ex, ey + 0, 690);
  e.grp.position.copy(ep);
  const bl = e.blink > 0 ? Math.abs(Math.cos(e.blink / 0.28 * Math.PI)) : 1;
  e.ball.scale.set(40, 40 * bl, 1); e.pupil.scale.set(22 * (0.8 + 0.2 * Math.sin(S.t * 0.7)), 22 * bl, 1);
  const lx = -0.55, ly = 0.55; e.pupil.position.set(lx * 0.7 * 0.7071 - 0, ly * 0.4, -lx * 0.7 * 0.7071);   // looking down-left at the hero
  e.haze.material.opacity = 0.7 + 0.3 * Math.sin(S.t * 1.1);
  rd.gl.render(S.scene, cam);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const sm = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false;
  ctx.drawImage(rd.gl.domElement, 0, 0, W, H);
  // Velscour's eye over the sky, watching the climb: a slit pupil turned toward the hero, blinking now and then
  { const bl = e.blink > 0 ? Math.abs(Math.cos(e.blink / 0.28 * Math.PI)) : 1, ex = W * 0.5, ey = H * 0.17, R = W * 0.1;
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    let g = ctx.createRadialGradient(ex, ey, 0, ex, ey, W * 0.27); g.addColorStop(0, `rgba(255,40,10,${0.22 + 0.06 * Math.sin(S.t * 1.1)})`); g.addColorStop(1, 'rgba(255,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(ex - W * 0.3, ey - W * 0.3, W * 0.6, W * 0.6);
    g = ctx.createRadialGradient(ex, ey, 2, ex, ey, R); g.addColorStop(0, 'rgba(255,110,40,0.9)'); g.addColorStop(0.6, 'rgba(200,20,10,0.65)'); g.addColorStop(1, 'rgba(90,0,0,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(ex, ey, R, R * 0.42 * bl, 0, 0, TAU); ctx.fill();
    ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = 'rgba(12,0,0,0.6)';
    ctx.beginPath(); ctx.ellipse(ex - R * 0.06, ey + R * 0.1, R * 0.085 * (0.85 + 0.15 * Math.sin(S.t * 0.7)), R * 0.36 * bl, 0, 0, TAU); ctx.fill(); ctx.restore(); }
  if (fl > 0.02) { ctx.globalAlpha = fl * 0.35; ctx.fillStyle = '#e8f0ff'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
  ctx.imageSmoothingEnabled = sm;
  return true;
}
export function disposeSpires3D() {
  if (!S) return;
  S.scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material && o.material.map && o.material.map !== haloTex) o.material.map.dispose(); });
  for (const m of Object.values(S.M)) { m.map?.dispose(); m.bumpMap?.dispose(); m.dispose(); }
  S.scene.background?.dispose();
  S = null;
}
