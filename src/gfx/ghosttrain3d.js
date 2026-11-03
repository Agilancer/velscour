// THE IRON EXPRESS in three.js (region id ghost_train; docs/GHOST_TRAIN.md): a procedural steam train (a red caboose,
// six painted cars, the tender and a green-and-black locomotive with red wheels and brass), the track and the Wilds
// streaming past beneath it at night, and the stations it pulls in at. Drawn live behind the 2D sprites each frame with
// the game's own camera (orthographic, 30 degrees down, 45 round; one unit = one tile, tile (x, y) at height h is
// (x, h, y)), like the Pirate Seas (gfx/seabattle3d.js). The car floors are at height 0, where the sprites stand. The
// train never moves: the ground, the sleepers, the scenery and the stations slide by under it. Each car's roof and near
// side are their own group (the cutaway over the hero, game/ghosttrain.js); the rest is merged into one mesh per
// material, so the whole train is a few dozen draw calls.
import { G } from '../state.js';
import { camera, HW } from '../core/view.js';
import { CARS, ENGINE, CZ, ROW0, ROWS, PLAT0, PLAT1, PLAT_LEN, crateCells } from '../world/ghosttrain.js';

const SC = HW * Math.SQRT2;   // world px a unit across the screen
const SKY = 0x141a26;         // the night beyond the lamps
let T = null, BGU = null, R = null, S = null;

// The repo's own textures (the airship pack's planks and metals, the castle bake's brick, slate and stone; no new
// art): [file, units a repeat across, grey (tinted by the material's colour) or natural, mean brightness wanted].
const AIR = 'assets/source/airship/textures/', CST = 'assets/source/castle3d/tex/';
const TEX = {
  boards: [AIR + 'ship_planks/SHIP-06_Salt_Bleached_Greyboards.png', 1.6, true, 0.82],   // painted car sides
  deck: [AIR + 'ship_planks/SHIP-02_Salt_Worn_Oak.png', 1.6, false, 0.4],               // car floors
  crate: [CST + 'wood.png', 0.9, false, 0.5],
  cedar: [AIR + 'wood/WOOD-04_Weathered_Cedar.png', 1.2, false, 0.45],                   // benches, the station door
  iron: [AIR + 'metal/MET-02_Riveted_Black_Iron.png', 1.4, true, 0.55],                  // frames, smokebox, chimney
  gun: [AIR + 'metal/MET-01_Hammered_Gunmetal.png', 1.4, true, 0.8],                     // painted metal: boiler, cab, roofs
  rust: [AIR + 'metal/MET-03_Flaked_Iron.png', 0.9, true, 0.8],                           // wheels, buffers, buffer beam
  brass: [AIR + 'metal/MET-09_Oxide_Stained_Brass.png', 0.8, false, 0.62],
  brick: [CST + 'brick.png', 1.4, false, 0],
  slate: [CST + 'slate.png', 1.6, false, 0],
  stone: [CST + 'ashlar.png', 1.5, true, 0.8],                                            // the platforms
  cloth: [AIR + 'sailcloth/CLOTH-01_Coarse_Sail_Canvas.png', 1.0, true, 0.75],        // banners
};
const IMG = {};
const loadImg = (src) => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => no(new Error('no ' + src)); i.src = src; });
/** three.js, its geometry utilities and the textures; rejects if three.js fails (the region then plays as the
 *  Forsaken Wilds). A texture that fails leaves its parts their flat colour. */
export async function loadTrain3D() {
  if (!T) [T, BGU] = await Promise.all([import('three'), import('three/addons/utils/BufferGeometryUtils.js')]);
  await Promise.all(Object.entries(TEX).map(([k, [src]]) => IMG[k] || loadImg(src).then((i) => { IMG[k] = i; }).catch((e) => console.warn(e))));
}
/** A texture from IMG[key], greyed (to be tinted) or not, brought to a mean brightness; null if it didn't load. */
function texOf(key) {
  const img = IMG[key], [, , grey, mean] = TEX[key];
  if (!img) return null;
  const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
  const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0);
  if (grey || mean) {
    const id = x.getImageData(0, 0, c.width, c.height), d = id.data, n = d.length / 4;
    let sum = 0; for (let i = 0; i < d.length; i += 4) sum += (d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11) / 255;
    const k = mean ? mean / Math.max(0.05, sum / n) : 1;
    for (let i = 0; i < d.length; i += 4) {
      if (grey) { const v = Math.min(255, (d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11) * k); d[i] = d[i + 1] = d[i + 2] = v; }
      else { d[i] = Math.min(255, d[i] * k); d[i + 1] = Math.min(255, d[i + 1] * k); d[i + 2] = Math.min(255, d[i + 2] * k); }
    }
    x.putImageData(id, 0, 0);
  }
  const t = new T.CanvasTexture(c);
  t.colorSpace = T.SRGBColorSpace; t.wrapS = t.wrapT = T.RepeatWrapping; t.magFilter = T.NearestFilter; t.anisotropy = 4;
  return t;
}
export const train3dReady = () => !!(T && BGU);
export const trainScene = () => S;

function renderer() {
  if (R) return R;
  const gl = new T.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'high-performance' });
  gl.setPixelRatio(1);
  const cam = new T.OrthographicCamera(-10, 10, 10, -10, 1, 1600);
  const e = Math.PI / 6, a = Math.PI / 4;
  cam.position.set(Math.cos(e) * Math.sin(a), Math.sin(e), Math.cos(e) * Math.cos(a)).multiplyScalar(800);
  cam.up.set(0, 1, 0); cam.lookAt(0, 0, 0); cam.updateMatrixWorld();
  R = { gl, cam, w: 0, h: 0, dir: cam.position.clone().normalize() };
  return R;
}

// ------------------------------------------------------------------ textures
let haloTex = null;
function halo() {
  if (haloTex) return haloTex;
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, '#fff'); g.addColorStop(0.25, '#fff8'); g.addColorStop(1, '#fff0');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  haloTex = new T.CanvasTexture(c); haloTex.colorSpace = T.SRGBColorSpace;
  return haloTex;
}
let puffTex = null;
/** A soft, lumpy puff for smoke and steam. */
function puff() {
  if (puffTex) return puffTex;
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  for (let i = 0; i < 7; i++) {
    const px = 22 + rnd() * 20, py = 22 + rnd() * 20, r = 12 + rnd() * 10, g = x.createRadialGradient(px, py, 0, px, py, r);
    g.addColorStop(0, 'rgba(255,255,255,0.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  }
  puffTex = new T.CanvasTexture(c); puffTex.colorSpace = T.SRGBColorSpace;
  return puffTex;
}
function canvasTex(w, h, paint, rx = 1, ry = 1) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; paint(c.getContext('2d'), w, h);
  const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(rx, ry); t.colorSpace = T.SRGBColorSpace;
  t.magFilter = T.NearestFilter; t.anisotropy = 1;
  return t;
}
const rnd = (() => { let s = 1234567; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
/** Meadow at night: grass, dirt and stones, one 8-unit tile. */
const groundPaint = (x, w, h) => {
  x.fillStyle = '#2b3a25'; x.fillRect(0, 0, w, h);
  for (let i = 0; i < 1400; i++) { const v = rnd(); x.fillStyle = v < 0.4 ? '#324428' : v < 0.7 ? '#24321f' : v < 0.88 ? '#3a4c2c' : '#4a4030'; x.fillRect((rnd() * w) | 0, (rnd() * h) | 0, 2 + ((rnd() * 4) | 0), 1 + ((rnd() * 3) | 0)); }
  for (let i = 0; i < 30; i++) { x.fillStyle = rnd() < 0.5 ? '#6a665a' : '#7a7466'; x.fillRect((rnd() * w) | 0, (rnd() * h) | 0, 2, 2); }
};
/** The ballast under the track: grey stones and a creosoted sleeper every unit (2 units a tile of texture). */
const ballastPaint = (x, w, h) => {
  x.fillStyle = '#4a4744'; x.fillRect(0, 0, w, h);
  for (let i = 0; i < 500; i++) { x.fillStyle = rnd() < 0.5 ? '#5c5854' : '#383532'; x.fillRect((rnd() * w) | 0, (rnd() * h) | 0, 2, 2); }
  for (const sx of [0.1, 0.6]) { x.fillStyle = '#3a2a1c'; x.fillRect(sx * w, h * 0.08, w * 0.16, h * 0.84); x.fillStyle = '#4e3a28'; x.fillRect(sx * w, h * 0.08, w * 0.16, 2); }
};


/** World-space UVs (a box projection on each face's main axis), `su` x `sv` units a repeat: a texture keeps its scale
 *  on every part, however long, and merged parts share one material. */
function boxUV(g, su, sv) {
  const P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv;
  if (!U) return;
  for (let i = 0; i < P.count; i++) {
    const ax = Math.abs(N.getX(i)), ay = Math.abs(N.getY(i)), az = Math.abs(N.getZ(i)), x = P.getX(i), y = P.getY(i), z = P.getZ(i);
    if (ax >= ay && ax >= az) U.setXY(i, z / su, y / sv); else if (ay >= az) U.setXY(i, x / su, z / sv); else U.setXY(i, x / su, y / sv);
  }
  U.needsUpdate = true;
}
// ------------------------------------------------------------------ a builder that merges by material
function kit() {
  const parts = new Map(), edges = [], m4 = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), one = new T.Vector3(1, 1, 1), p = new T.Vector3();
  const add = (geo, mat, x, y, z, o = {}) => {
    e.set(o.rx || 0, o.ry || 0, o.rz || 0); q.setFromEuler(e); m4.compose(p.set(x, y, z), q, one);
    const g = (geo.index ? geo.toNonIndexed() : geo).applyMatrix4(m4); if (g !== geo) geo.dispose();
    if (mat.map && mat.userData.su) boxUV(g, mat.userData.su, mat.userData.sv);
    if (!parts.has(mat)) parts.set(mat, []);
    parts.get(mat).push(g);
    if (o.edge !== false) edges.push(new T.EdgesGeometry(g, 35));
  };
  return {
    add,
    box: (w, h, d, mat, x, y, z, o) => add(new T.BoxGeometry(w, h, d), mat, x, y, z, o),
    cyl: (r0, r1, h, mat, x, y, z, o = {}) => add(new T.CylinderGeometry(r0, r1, h, o.seg || 10), mat, x, y, z, o),
    build(group, edgeMat) {
      for (const [mat, gs] of parts) { group.add(new T.Mesh(BGU.mergeGeometries(gs), mat)); for (const g of gs) g.dispose(); }
      if (edges.length && edgeMat) { group.add(new T.LineSegments(BGU.mergeGeometries(edges), edgeMat)); for (const g of edges) g.dispose(); }
      return group;
    },
  };
}
function mats() {
  const tex = {};
  for (const k in TEX) tex[k] = texOf(k);
  /** A Lambert material: flat `c`, or texture `key` tinted `tint` (white: its own colours) when it loaded. */
  const L = (c, key = null, tint = 0xffffff) => {
    const t = key && tex[key];
    const m = new T.MeshLambertMaterial({ color: t ? tint : c, map: t || null });
    if (t) { const su = TEX[key][1]; m.userData.su = su; m.userData.sv = su * t.image.height / t.image.width; }
    return m;
  };
  return {
    // a war engine's palette: dark riveted iron, bronze, deep red; boards and oak where wood shows; brick, slate, stone
    blood: L(0x7a1a14, 'boards', 0x8e2018), iron: L(0x2a2a30, 'iron', 0x4a4a54), dark: L(0x26282e, 'gun', 0x3c3e48),
    redMetal: L(0x7a1a14, 'rust', 0x9a2016), wheel: L(0x8a1a12, 'rust', 0xa8241a), bronze: L(0xa07040, 'brass', 0xd09a68),
    wood: L(0x7a5a3a, 'deck', 0xd8c0a0), crate: L(0x8a6a40, 'crate'), cedar: L(0x7a5a3a, 'cedar'), deck: L(0x7a5a3a, 'deck', 0xd8b890),
    black: L(0x1d1d20, 'iron', 0x3a3a40), steel: L(0x5c5e62, 'gun', 0x9a9ca2), cloth: L(0x8a1810, 'cloth', 0x9a1c14),
    cream: L(0xd8c8a0), coal: L(0x18181a), stone: L(0x8a847a, 'stone', 0xb0a898), brick: L(0x8a4a34, 'brick'), slate: L(0x3a3e48, 'slate', 0xa8acb8),
    rail: L(0xa0a0a4), trunk: L(0x4a3424), leaf: L(0x2a4a2c), rock: L(0x6a6a64), pole: L(0x5a4430),
    window: new T.MeshBasicMaterial({ color: 0xffb860 }), fire: new T.MeshBasicMaterial({ color: 0xff7a24 }), lamp: new T.MeshBasicMaterial({ color: 0xffe0a0 }),
    edge: new T.LineBasicMaterial({ color: 0x0a0806, transparent: true, opacity: 0.45, depthWrite: false }),
  };
}
const BODY = { caboose: 'blood', gondola: 'iron', coach: 'blood', flat: 'wood', boxcar: 'dark', mail: 'blood', tender: 'iron' };

// ------------------------------------------------------------------ the train
const Y_RAIL = -1.1, Y_GROUND = -1.25;
/** Box from x0..x1 (tiles), on z (tiles), y0..y1. */
const span = (k, mat, x0, x1, y0, y1, z, d, o) => k.box(x1 - x0, y1 - y0, d, mat, (x0 + x1) / 2, (y0 + y1) / 2, z, o);
/** Iron spikes (4-sided cones) along x from x0 to x1 every `step`, standing on y at z; `dir` 1 up. */
const spikes = (k, M, x0, x1, y, z, step = 0.9, h = 0.32) => { for (let x = x0; x <= x1 + 1e-6; x += step) k.add(new T.ConeGeometry(0.08, h, 4), M.black, x, y + h / 2, z, { edge: false }); };
/** Battlements: merlons along x on top of a wall (y) at z, `d` deep. */
const merlons = (k, mat, x0, x1, y, z, d = 0.14, step = 0.7) => { for (let x = x0 + step / 2; x < x1; x += step) k.box(step * 0.5, 0.22, d, mat, x, y + 0.11, z); };
/** A pointed (gothic) window lit from inside: a pane and a diamond on top for its arch, on the wall at z. */
const arch = (k, mat, x, y0, y1, w, z, d = 0.14) => {
  k.box(w, y1 - y0, d, mat, x, (y0 + y1) / 2, z, { edge: false });
  const s2 = w / Math.SQRT2; k.box(s2, s2, d, mat, x, y1, z, { rz: Math.PI / 4, edge: false });
};
/** Riveted armour plates along x on the wall at z, from y0 to y1 (a hair proud of it). */
const plates = (k, M, x0, x1, y0, y1, z, out) => { const n = Math.max(1, Math.round((x1 - x0) / 1.5)), w = (x1 - x0) / n; for (let i = 0; i < n; i++) k.box(w - 0.06, y1 - y0, 0.06, M.iron, x0 + (i + 0.5) * w, (y0 + y1) / 2, z + out * 0.05); };
function buildTrain(scene, M, glows) {
  const k = kit(), z0 = ROW0 - 0.1, z1 = ROW0 + ROWS + 0.1, W = z1 - z0, cuts = [];
  const glow = (x, y, z, r, c = 0xffb060) => glows.push({ x, y, z, r, c });
  /** An iron lantern on a bracket (and its light). */
  const lantern = (kk, x, y, z) => { kk.box(0.22, 0.3, 0.22, M.black, x, y, z); kk.box(0.14, 0.18, 0.24, M.lamp, x, y, z, { edge: false }); kk.add(new T.ConeGeometry(0.17, 0.18, 4), M.black, x, y + 0.24, z, { ry: Math.PI / 4, edge: false }); glow(x, y, z, 1.5); };
  /** A war banner: an iron pole with a crossbar and a red cloth hanging from it. */
  const banner = (kk, x, y, z, h = 1.6) => {
    kk.box(0.07, h, 0.07, M.black, x, y + h / 2, z); kk.add(new T.ConeGeometry(0.07, 0.25, 4), M.bronze, x, y + h + 0.12, z, { edge: false });
    kk.box(0.7, 0.05, 0.05, M.bronze, x - 0.35, y + h - 0.1, z, { edge: false });
    kk.box(0.62, 0.9, 0.03, M.cloth, x - 0.36, y + h - 0.58, z); kk.add(new T.ConeGeometry(0.31, 0.3, 3), M.cloth, x - 0.36, y + h - 1.17, z, { rz: Math.PI, edge: false });
  };
  for (const car of CARS) {
    const L = car.x1 - car.x0, cx = (car.x0 + car.x1) / 2, body = M[BODY[car.kind]] || M.iron, h = car.wall;
    const cut = car.kind === 'engine' ? null : kit();   // this car's roof and near side: hidden while the hero is in it
    if (car.kind !== 'engine') {
      k.box(L, 0.22, W, M.deck, cx, -0.11, CZ, { edge: false });   // the plank floor the fight is on
      k.box(L, 0.3, 0.14, M.iron, cx, -0.12, z0 - 0.02); k.box(L, 0.3, 0.14, M.iron, cx, -0.12, z1 + 0.02);   // the iron sole bars
      k.box(L - 0.6, 0.32, W - 0.7, M.black, cx, -0.4, CZ, { edge: false });    // the underframe
      for (const bx of [car.x0 + 1.5, car.x1 - 1.5]) {                           // two bogies, red iron wheels
        k.box(2.0, 0.24, W - 0.5, M.black, bx, -0.62, CZ);
        for (const dx of [-0.6, 0.6]) for (const wz of [z0 + 0.08, z1 - 0.08]) k.cyl(0.4, 0.4, 0.14, M.wheel, bx + dx, Y_RAIL + 0.4, wz, { rx: Math.PI / 2, seg: 14 });
      }
      for (const bz of [CZ - 1, CZ + 1]) for (const bx of [car.x0 - 0.12, car.x1 + 0.12]) k.cyl(0.12, 0.12, 0.25, M.bronze, bx, -0.32, bz, { rz: Math.PI / 2, seg: 8 });   // buffers
      if (car.kind !== 'tender') k.box(0.9, 0.1, 1.6, M.iron, car.x1 + 0.5, -0.05, CZ);   // the gangway plate
    }
    // the sides: the far one whole, the near one a sill (always) and the rest in the cutaway; armour along the bottom
    if (car.kind !== 'engine') {
      span(k, body, car.x0, car.x1, 0, h, z0 + 0.05, 0.1);
      span(k, body, car.x0, car.x1, 0, Math.min(h, 0.35), z1 - 0.05, 0.1);
      if (h > 0.35) span(cut, body, car.x0, car.x1, 0.35, h, z1 - 0.05, 0.1);
      if (car.kind !== 'flat') {
        plates(k, M, car.x0, car.x1, 0, Math.min(h, 0.7), z0, -1);
        plates(k, M, car.x0, car.x1, 0, Math.min(h, 0.35), z1, 1);
        if (h > 0.35) plates(cut, M, car.x0, car.x1, 0.35, Math.min(h, 0.7), z1, 1);
      }
    }
    const windows = (n, y0, y1) => {
      for (let i = 0; i < n; i++) {
        const x = car.x0 + (i + 0.5) * (L / n), w = Math.min(0.62, L / n - 0.6);
        arch(k, M.window, x, y0, y1, w, z0 + 0.05); arch(cut, M.window, x, y0, y1, w, z1 - 0.05);
        k.box(w + 0.12, 0.06, 0.16, M.bronze, x, y0 - 0.03, z0 + 0.05, { edge: false }); cut.box(w + 0.12, 0.06, 0.16, M.bronze, x, y0 - 0.03, z1 - 0.05, { edge: false });
      }
    };
    const roofed = () => {
      // end walls either side of the door; a dark iron roof with a bronze ridge and spikes along its eaves
      for (const ex of [car.x0 + 0.05, car.x1 - 0.05]) { k.box(0.1, h, 0.75, body, ex, h / 2, z0 + 0.37); cut.box(0.1, h, 0.75, body, ex, h / 2, z1 - 0.37); }
      cut.box(L + 0.2, 0.12, W + 0.3, M.dark, cx, h + 0.06, CZ);
      cut.box(L - 0.2, 0.22, W - 0.6, M.dark, cx, h + 0.23, CZ);
      cut.box(L - 0.2, 0.06, 0.2, M.bronze, cx, h + 0.37, CZ, { edge: false });
      for (const z of [z0 - 0.08, z1 + 0.08]) spikes(cut, M, car.x0 + 0.3, car.x1 - 0.3, h + 0.12, z, 0.85, 0.3);
      span(k, M.bronze, car.x0, car.x1, h - 0.12, h - 0.06, z0 - 0.02, 0.04, { edge: false }); span(cut, M.bronze, car.x0, car.x1, h - 0.12, h - 0.06, z1 + 0.02, 0.04, { edge: false });
    };
    if (car.kind === 'caboose') {
      roofed();
      cut.box(2.4, 0.8, 1.6, M.iron, car.x0 + 3.2, h + 0.7, CZ); cut.box(2.6, 0.1, 1.8, M.dark, car.x0 + 3.2, h + 1.15, CZ);   // the watch turret
      merlons(cut, M.iron, car.x0 + 2.0, car.x0 + 4.4, h + 1.2, CZ - 0.85, 0.12, 0.6); merlons(cut, M.iron, car.x0 + 2.0, car.x0 + 4.4, h + 1.2, CZ + 0.85, 0.12, 0.6);
      cut.box(1.6, 0.3, 1.64, M.window, car.x0 + 3.2, h + 0.72, CZ, { edge: false });
      windows(3, 0.85, 1.35);
      k.box(0.6, 0.9, 0.6, M.black, car.x0 + 0.4, 0.45, CZ - 0.6);   // the stove
      banner(k, car.x0 + 0.9, h, z0 + 0.2, 1.4);
      glow(car.x0 - 0.15, 1.3, z1 - 0.3, 1.4, 0xff4020);   // the tail lamp
    } else if (car.kind === 'coach') {
      roofed(); windows(5, 0.8, 1.3);
      lantern(k, car.x0 + 0.25, h - 0.35, z0 - 0.15); lantern(k, car.x1 - 0.25, h - 0.35, z0 - 0.15);
      glow(cx, 1.6, CZ, 2.2);
    } else if (car.kind === 'mail') {
      roofed(); windows(3, 0.95, 1.35);
      lantern(k, cx, h - 0.35, z0 - 0.15);
      glow(cx, 1.6, CZ, 2.0);
    } else if (car.kind === 'boxcar') {
      roofed();
      for (const [kk, z, o] of [[k, z0 - 0.03, -1], [cut, z1 + 0.03, 1]]) { kk.box(2.2, 1.5, 0.05, M.redMetal, cx, 0.95, z); kk.box(2.6, 0.08, 0.06, M.bronze, cx, 1.75, z + o * 0.01, { edge: false }); kk.box(0.08, 1.5, 0.07, M.black, cx, 0.95, z + o * 0.01, { edge: false }); }
      for (const [x, y] of crateCells(car)) k.box(0.9, 0.8, 0.9, M.crate, x + 0.5, 0.4, y + 0.5);
      glow(car.x0 + 1, 1.4, CZ, 1.6);
    } else if (car.kind === 'gondola') {
      // a war wagon: iron walls with battlements, spiked corner posts
      merlons(k, M.iron, car.x0, car.x1, h, z0 + 0.05); merlons(cut, M.iron, car.x0, car.x1, h, z1 - 0.05);
      for (const ex of [car.x0 + 0.05, car.x1 - 0.05]) { k.box(0.1, h, 0.7, body, ex, h / 2, z0 + 0.35); k.box(0.1, 0.35, 0.7, body, ex, 0.175, z1 - 0.35); }
      for (const ex of [car.x0 + 0.1, car.x1 - 0.1]) { k.box(0.18, h + 0.4, 0.18, M.black, ex, (h + 0.4) / 2, z0 + 0.05); k.add(new T.ConeGeometry(0.1, 0.35, 4), M.black, ex, h + 0.57, z0 + 0.05, { edge: false }); }
      banner(k, cx, h, z0 + 0.12, 1.5);
    } else if (car.kind === 'flat') {
      // iron stakes with spiked tops, crates lashed down
      for (let x = car.x0 + 0.3; x < car.x1; x += 1.4) for (const z of [z0 + 0.06, z1 - 0.06]) { k.box(0.12, 0.8, 0.12, M.black, x, 0.4, z); k.add(new T.ConeGeometry(0.08, 0.28, 4), M.black, x, 0.94, z, { edge: false }); }
      for (const [x, y] of crateCells(car)) { k.box(0.9, 0.75, 0.9, M.crate, x + 0.5, 0.38, y + 0.5); k.box(0.94, 0.06, 0.94, M.black, x + 0.5, 0.6, y + 0.5, { edge: false }); }
      lantern(k, car.x0 + 4.5, 0.95, z0 + 0.06);
    } else if (car.kind === 'tender') {
      for (const ex of [car.x0 + 0.05]) { k.box(0.1, h, 0.7, body, ex, h / 2, z0 + 0.35); k.box(0.1, 0.35, 0.7, body, ex, 0.175, z1 - 0.35); }
      k.box(0.1, h, W, body, car.x1 - 0.05, h / 2, CZ);
      merlons(k, M.iron, car.x0, car.x1, h, z0 + 0.05); merlons(cut, M.iron, car.x0, car.x1, h, z1 - 0.05);
      for (const [kk, z] of [[k, z0 - 0.04], [cut, z1 + 0.04]]) span(kk, M.redMetal, car.x0, car.x1, 0.78, 0.86, z, 0.04, { edge: false });
      for (let i = 0; i < 9; i++) k.add(new T.DodecahedronGeometry(0.45 + rnd() * 0.35), M.coal, car.x1 - 0.9 - rnd() * 1.3, 0.25 + rnd() * 0.45, z0 + 0.5 + rnd() * (W - 1), { rx: rnd() * 3, ry: rnd() * 3 });
      banner(k, car.x0 + 0.6, h, z0 + 0.15, 1.7);
      lantern(k, car.x0 + 0.3, h + 0.2, z0 + 0.6);
    } else if (car.kind === 'engine') {
      const x0 = car.x0, x1 = car.x1, cab = 3, by = 1.0, bl = x1 - 1.4 - (x0 + cab);
      k.box(L + 0.4, 0.3, W - 0.2, M.black, cx + 0.2, -0.15, CZ);                // the running board
      k.box(L - 1, 0.4, W - 1.2, M.black, cx - 0.3, -0.5, CZ, { edge: false });
      for (const z of [z0 + 0.06, z1 - 0.06]) k.box(L - 3.6, 0.1, 0.06, M.bronze, x0 + cab + (L - 3.6) / 2 + 0.2, -0.02, z, { edge: false });
      // the cab: a deep red iron keep, pointed lit windows, a battlemented roof, war banners, the furnace grates glowing
      k.box(cab, 2.2, 0.12, M.redMetal, x0 + cab / 2, 1.1, z0 + 0.1); k.box(cab, 2.2, 0.12, M.redMetal, x0 + cab / 2, 1.1, z1 - 0.1);
      k.box(0.12, 2.2, W - 0.2, M.redMetal, x0 + cab - 0.06, 1.1, CZ);
      plates(k, M, x0, x0 + cab, 0, 0.8, z0 + 0.1, -1); plates(k, M, x0, x0 + cab, 0, 0.8, z1 - 0.1, 1);
      k.box(cab + 0.5, 0.16, W + 0.3, M.dark, x0 + cab / 2, 2.3, CZ);
      merlons(k, M.iron, x0 - 0.25, x0 + cab + 0.25, 2.38, z0 - 0.05, 0.16, 0.6); merlons(k, M.iron, x0 - 0.25, x0 + cab + 0.25, 2.38, z1 + 0.05, 0.16, 0.6);
      for (const z of [z0 + 0.04, z1 - 0.04]) { arch(k, M.window, x0 + 1.6, 1.05, 1.6, 0.6, z, 0.06); k.box(0.9, 0.08, 0.08, M.bronze, x0 + 1.6, 1.0, z, { edge: false }); }
      for (const z of [z0 + 0.02, z1 - 0.02]) for (let i = 0; i < 3; i++) k.box(0.5, 0.06, 0.04, M.fire, x0 + cab - 0.55, 0.15 + i * 0.13, z, { edge: false });   // the grate
      k.box(0.6, 0.6, 1.2, M.fire, x0 + cab - 0.4, 0.5, CZ, { edge: false });
      banner(k, x0 + 0.15, 2.38, z0 + 0.05, 1.5); banner(k, x0 + 0.15, 2.38, z1 - 0.05, 1.5);
      // the boiler: an armoured octagonal shell in bronze bands, a riveted iron smokebox
      k.cyl(1.08, 1.08, bl, M.iron, x0 + cab + bl / 2, by, CZ, { rz: Math.PI / 2, seg: 8 });
      for (let x = x0 + cab + 0.2; x < x1 - 1.3; x += 1.5) k.cyl(1.13, 1.13, 0.14, M.bronze, x, by, CZ, { rz: Math.PI / 2, seg: 8, edge: false });
      k.cyl(1.1, 1.1, 1.4, M.dark, x1 - 0.7, by, CZ, { rz: Math.PI / 2, seg: 16 });
      // a bronze skull on the smokebox door, its eyes the furnace
      k.cyl(0.62, 0.62, 0.08, M.iron, x1 + 0.02, by, CZ, { rz: Math.PI / 2, seg: 16, edge: false });
      k.add(new T.SphereGeometry(0.46, 10, 8), M.bronze, x1 + 0.08, by + 0.12, CZ, { edge: false });
      k.box(0.3, 0.28, 0.5, M.bronze, x1 + 0.22, by - 0.32, CZ, { edge: false });
      for (let t = -2; t <= 2; t++) k.box(0.06, 0.12, 0.07, M.cream, x1 + 0.38, by - 0.22, CZ + t * 0.09, { edge: false });
      for (const dz of [-0.18, 0.18]) k.box(0.1, 0.16, 0.16, M.fire, x1 + 0.5, by + 0.14, CZ + dz, { edge: false });
      k.box(0.08, 0.12, 0.08, M.black, x1 + 0.53, by - 0.04, CZ, { edge: false });
      // the dome and safety valve, spiked; the crowned chimney
      k.cyl(0.38, 0.46, 0.55, M.bronze, x0 + cab + bl * 0.45, by + 1.15, CZ, { seg: 8 });
      k.add(new T.ConeGeometry(0.12, 0.45, 4), M.black, x0 + cab + bl * 0.45, by + 1.65, CZ, { edge: false });
      k.cyl(0.16, 0.2, 0.4, M.bronze, x0 + cab + 0.6, by + 1.15, CZ, { seg: 8 });
      k.cyl(0.36, 0.36, 1.3, M.black, x1 - 0.8, by + 1.55, CZ, { seg: 10 });
      k.cyl(0.62, 0.36, 0.42, M.iron, x1 - 0.8, by + 2.4, CZ, { seg: 10 });
      k.cyl(0.64, 0.64, 0.07, M.bronze, x1 - 0.8, by + 2.62, CZ, { seg: 10, edge: false });
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; k.add(new T.ConeGeometry(0.07, 0.42, 4), M.black, x1 - 0.8 + Math.cos(a) * 0.56, by + 2.85, CZ + Math.sin(a) * 0.56, { edge: false }); }
      // cylinders, the red buffer beam, a spiked iron ram for a cowcatcher, a lantern on the smokebox
      for (const z of [z0 + 0.25, z1 - 0.25]) k.cyl(0.32, 0.32, 1.3, M.black, x1 - 1.2, -0.45, z, { rz: Math.PI / 2, seg: 8 });
      k.box(0.2, 0.42, W, M.redMetal, x1 + 0.15, -0.3, CZ);
      k.add(new T.ConeGeometry(0.75, 1.5, 4), M.iron, x1 + 0.95, -0.45, CZ, { rz: -Math.PI / 2, rx: Math.PI / 4 });
      for (const dz of [-0.7, 0, 0.7]) k.add(new T.ConeGeometry(0.1, 0.6, 4), M.bronze, x1 + 0.9 + (dz ? 0 : 0.5), -0.45, CZ + dz, { rz: -Math.PI / 2, edge: false });
      lantern(k, x1 - 0.2, by + 1.25, CZ);
      glow(x1 + 0.55, by + 0.14, CZ, 2.4, 0xff6020); glow(x0 + cab - 0.4, 0.9, CZ, 2.4, 0xff7a2a); glow(x0 + cab - 0.55, 0.3, z1, 1.4, 0xff6a20);
    }
    if (cut) { const g = cut.build(new T.Group(), M.edge); scene.add(g); cuts.push({ g, x0: car.x0, x1: car.x1, roof: car.roof }); }
  }
  // the track: two steel rails on a ballast strip, far longer than the view
  for (const z of [CZ - 0.72, CZ + 0.72]) k.box(320, 0.1, 0.1, M.rail, 50, Y_RAIL - 0.05, z, { edge: false });
  const g = k.build(new T.Group(), M.edge);
  scene.add(g);
  return { g, cuts };
}
/** The engine's driving wheels (they turn) and their side rods. */
function buildDrivers(scene, M) {
  const out = [], rods = [];
  for (const z of [ROW0 - 0.02, ROW0 + ROWS + 0.02]) {
    for (let i = 0; i < 3; i++) {
      const g = new T.Group(), x = ENGINE.x0 + 3.8 + i * 1.65;
      g.add(new T.Mesh(new T.TorusGeometry(0.62, 0.09, 6, 18), M.wheel));
      for (let s = 0; s < 6; s++) { const sp = new T.Mesh(new T.BoxGeometry(0.07, 1.2, 0.05), M.wheel); sp.rotation.z = (s * Math.PI) / 6; g.add(sp); }
      const hub = new T.Mesh(new T.CylinderGeometry(0.15, 0.15, 0.14, 8), M.bronze); hub.rotation.x = Math.PI / 2; g.add(hub);
      g.position.set(x, Y_RAIL + 0.7, z); scene.add(g); out.push(g);
    }
    const rod = new T.Mesh(new T.BoxGeometry(3.6, 0.1, 0.06), M.steel); rod.userData.z = z; scene.add(rod); rods.push(rod);
  }
  return { wheels: out, rods };
}

// ------------------------------------------------------------------ the land going by
const SCN_N = 46;
function buildScenery(scene, M) {
  const inst = (geo, mat, n) => { const m = new T.InstancedMesh(geo, mat, n); m.instanceMatrix.setUsage(T.DynamicDrawUsage); m.frustumCulled = false; scene.add(m); return m; };
  const I = {
    trunk: inst(new T.CylinderGeometry(0.12, 0.24, 1, 6), M.trunk, SCN_N), crown: inst(new T.IcosahedronGeometry(1, 0), M.leaf, SCN_N),
    bush: inst(new T.DodecahedronGeometry(0.5), M.leaf, SCN_N), pole: inst(new T.BoxGeometry(0.16, 1, 0.16), M.pole, SCN_N),
    bar: inst(new T.BoxGeometry(0.08, 0.08, 1.4), M.pole, SCN_N), rock: inst(new T.DodecahedronGeometry(0.5), M.rock, SCN_N),
  };
  const items = [];
  const roll = (it, x) => {
    const far = rnd() < 0.6;
    // the near side keeps clear of the platforms and low (a tall tree there would stand over the cars being fought on)
    it.x = x; it.z = far ? -12 + rnd() * 18 : 21.5 + rnd() * 14;
    const r = rnd();
    it.kind = far ? (r < 0.5 ? 'tree' : r < 0.66 ? 'pole' : r < 0.85 ? 'bush' : 'rock') : (r < 0.5 ? 'bush' : r < 0.8 || it.z < 28 ? 'rock' : 'tree');
    if (it.kind === 'pole') it.z = 8.6;   // the telegraph line along the far side
    it.h = it.kind === 'tree' ? 2.4 + rnd() * 2.4 : it.kind === 'pole' ? 4.2 : 1; it.s = 0.6 + rnd() * 0.7; it.ry = rnd() * 6.28; it.lean = (rnd() - 0.5) * 0.2;
  };
  for (let i = 0; i < SCN_N; i++) { const it = {}; roll(it, -60 + (i / SCN_N) * 220 + rnd() * 4); items.push(it); }
  return { I, items, roll };
}
function placeScenery(N, scroll) {
  const m4 = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), p = new T.Vector3(), s = new T.Vector3(), I = N.I;
  const set = (mesh, i, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0) => { e.set(rx, ry, rz); q.setFromEuler(e); m4.compose(p.set(x, y, z), q, s.set(sx, sy, sz)); mesh.setMatrixAt(i, m4); };
  const hide = (mesh, i) => set(mesh, i, 0, -99, 0, 0.001, 0.001, 0.001);
  N.items.forEach((it, i) => {
    let x = it.x - scroll;
    if (x < -60) { N.roll(it, it.x + 220); x = it.x - scroll; }
    const g = Y_GROUND;
    if (it.kind === 'tree') { set(I.trunk, i, x, g + it.h * 0.35, it.z, it.s, it.h * 0.7, it.s, 0, it.ry, it.lean); set(I.crown, i, x + it.lean, g + it.h * 0.8, it.z, it.s * 1.3, it.h * 0.42, it.s * 1.3, 0, it.ry, 0); }
    else { hide(I.trunk, i); hide(I.crown, i); }
    if (it.kind === 'bush') set(I.bush, i, x, g + 0.2 * it.s, it.z, it.s * 1.4, it.s, it.s * 1.4, 0, it.ry, 0); else hide(I.bush, i);
    if (it.kind === 'pole') { set(I.pole, i, x, g + it.h / 2, it.z, 1, it.h, 1); set(I.bar, i, x, g + it.h - 0.3, it.z, 1, 1, 1.4); } else { hide(I.pole, i); hide(I.bar, i); }
    if (it.kind === 'rock') set(I.rock, i, x, g + 0.1, it.z, it.s * 1.2, it.s * 0.6, it.s, it.ry, it.ry, 0); else hide(I.rock, i);
  });
  for (const k in I) I[k].instanceMatrix.needsUpdate = true;
}

// ------------------------------------------------------------------ a station
function signTex(name) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 48; const x = c.getContext('2d');
  x.fillStyle = '#1c2a4a'; x.fillRect(0, 0, 256, 48); x.strokeStyle = '#e8e0c8'; x.lineWidth = 3; x.strokeRect(3, 3, 250, 42);
  const t0 = name.toUpperCase(); let fs = 22;
  do { x.font = `bold ${fs}px Georgia, serif`; } while (x.measureText(t0).width > 232 && --fs > 10);
  x.fillStyle = '#f4ecd4'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(t0, 128, 25);
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t;
}
function buildStation(scene, M) {
  const k = kit(), L = PLAT_LEN + 2, zf = PLAT0 + 0.12, zn = PLAT1 + 0.7, glows = [];
  // the platform on the near side, level with the car floors; a white safety edge along the track
  k.box(L, 1.25, zn - zf, M.stone, 0, -0.625, (zf + zn) / 2);
  k.box(L, 0.03, 0.22, M.cream, 0, 0.01, zf + 0.2, { edge: false });
  for (let x = -L / 2 + 2; x <= L / 2 - 2; x += 5.5) {
    k.box(0.12, 2.3, 0.12, M.black, x, 1.15, zn - 0.35); k.box(0.36, 0.06, 0.06, M.black, x, 2.15, zn - 0.35, { edge: false });
    k.box(0.28, 0.34, 0.28, M.black, x, 2.4, zn - 0.35); k.box(0.2, 0.24, 0.3, M.lamp, x, 2.4, zn - 0.35, { edge: false });
    k.add(new T.ConeGeometry(0.22, 0.3, 4), M.black, x, 2.72, zn - 0.35, { ry: Math.PI / 4, edge: false });
    glows.push({ x, y: 2.4, z: zn - 0.35, r: 2.2, c: 0xffc070 });
  }
  for (const x of [-8, 8]) { k.box(2, 0.1, 0.5, M.cedar, x, 0.45, zn - 0.5); k.box(2, 0.5, 0.08, M.cedar, x, 0.7, zn - 0.25); }
  // across the track: a gothic station hall (brick, pointed lit windows and door, buttresses, a steep slate roof with
  // finials) and its belfry, on its own strip of platform
  k.box(L, 1.25, 3, M.stone, 0, -0.625, 9.3);
  k.box(10, 2.8, 3.2, M.brick, 0, 1.4, 6.6);
  const roof = new T.CylinderGeometry(2.0, 2.0, 10.6, 3); roof.scale(1, 1, 1.7);
  k.add(roof, M.slate, 0, 4.4, 6.6, { rz: Math.PI / 2, rx: -Math.PI / 2 });
  for (const x of [-5.3, 5.3]) k.add(new T.ConeGeometry(0.14, 0.7, 4), M.bronze, x, 7.4, 6.6, { edge: false });
  for (const x of [-3.6, -1.6, 3.6]) arch(k, M.window, x, 0.9, 1.9, 0.7, 8.22, 0.06);
  arch(k, M.cedar, 1.2, 0, 1.7, 1.0, 8.22, 0.08);
  for (const x of [-4.95, -2.6, 2.4, 4.95]) { k.box(0.4, 2.2, 0.5, M.stone, x, 1.1, 8.3); k.add(new T.ConeGeometry(0.3, 0.5, 4), M.stone, x, 2.45, 8.3, { ry: Math.PI / 4, edge: false }); }
  k.box(2, 5.2, 2, M.brick, -6.2, 2.6, 6.2);
  arch(k, M.window, -6.2, 3.4, 4.3, 0.6, 7.22, 0.06);
  k.add(new T.ConeGeometry(1.6, 2.6, 4), M.slate, -6.2, 6.5, 6.2, { ry: Math.PI / 4 });
  k.add(new T.ConeGeometry(0.1, 0.8, 4), M.bronze, -6.2, 8.1, 6.2, { edge: false });
  glows.push({ x: 1.2, y: 2.2, z: 8.5, r: 2, c: 0xffb060 });
  const g = k.build(new T.Group(), M.edge);
  const sign = new T.Mesh(new T.PlaneGeometry(4, 0.75), new T.MeshBasicMaterial({ map: signTex('—') }));
  sign.position.set(4.5, 1.9, zn - 0.3); g.add(sign);
  for (const x of [2.6, 6.4]) { const pl = new T.Mesh(new T.BoxGeometry(0.1, 2.2, 0.1), M.black); pl.position.set(x, 1.1, zn - 0.32); g.add(pl); }
  g.visible = false; scene.add(g);
  return { g, sign, glows };
}

// ------------------------------------------------------------------ build / tick / draw
const ENGINE_STACK = () => [ENGINE.x1 - 0.8, 3.7, CZ];
/** The scene for one run; `world` is the level it belongs to (the scene goes when the hero leaves it). */
export function buildTrain3D(world) {
  disposeTrain3D();
  renderer();
  const scene = new T.Scene(), M = mats(), few = G.touch;
  scene.add(new T.HemisphereLight(0xa8b8d8, 0x302418, 1.15 * Math.PI), new T.AmbientLight(0x505868, 0.45 * Math.PI));
  const moon = new T.DirectionalLight(0xd0dcff, 0.9 * Math.PI);
  moon.position.set(-20, 60, -10).add(new T.Vector3(50, 0, CZ)); moon.target.position.set(50, 0, CZ); scene.add(moon, moon.target);
  scene.fog = new T.Fog(SKY, 40, 120);
  const ground = new T.Mesh(new T.PlaneGeometry(320, 320), new T.MeshLambertMaterial({ map: canvasTex(128, 128, groundPaint, 40, 40) }));
  ground.rotation.x = -Math.PI / 2; ground.position.set(50, Y_GROUND, CZ); scene.add(ground);
  const ballast = new T.Mesh(new T.PlaneGeometry(320, 2.9), new T.MeshLambertMaterial({ map: canvasTex(64, 32, ballastPaint, 160, 1) }));
  ballast.rotation.x = -Math.PI / 2; ballast.position.set(50, Y_GROUND + 0.06, CZ); scene.add(ballast);
  const glowList = [];
  const train = buildTrain(scene, M, glowList);
  const drivers = buildDrivers(scene, M);
  const scn = buildScenery(scene, M);
  const st = buildStation(scene, M);
  S = { scene, M, world, t: 0, scroll: 0, speed: 0, fire: 1, ground, ballast, train, cuts: train.cuts, drivers, scn, st, glows: [], lightSrc: [], pool: [], smoke: [], smokeT: 0, steamT: 0, stationX: null };
  const addGlow = (gl, parent) => {
    const s = new T.Sprite(new T.SpriteMaterial({ map: halo(), color: gl.c, blending: T.AdditiveBlending, depthWrite: false, transparent: true }));
    const engine = gl.x >= ENGINE.x0 && parent === S.scene;
    s.position.set(gl.x, gl.y, gl.z); s.scale.setScalar(gl.r); s.renderOrder = 3; s.userData.engine = engine; parent.add(s); S.glows.push(s);
    S.lightSrc.push({ o: parent, p: new T.Vector3(gl.x, gl.y + 0.3, gl.z), c: gl.c, r: 7, w: new T.Vector3(), engine });
  };
  for (const gl of glowList) addGlow(gl, scene);
  for (const gl of st.glows) addGlow(gl, st.g);
  S.engineGlows = S.glows.filter((s) => s.userData.engine);
  for (let i = 0; i < 34; i++) {
    const s = new T.Sprite(new T.SpriteMaterial({ map: puff(), color: 0x888888, depthWrite: false, transparent: true, opacity: 0 }));
    s.renderOrder = 4; s.visible = false; scene.add(s); S.smoke.push({ s, life: 0 });
  }
  for (let i = 0; i < (few ? 3 : 5); i++) { const L = new T.PointLight(0xffffff, 0, 7, 1.5); scene.add(L); S.pool.push(L); }
  placeScenery(scn, 0);
  // the scene belongs to this level: it goes once the hero is elsewhere (nothing else ticks it then)
  S.watch = setInterval(() => { if (S && G.world !== S.world) disposeTrain3D(); }, 2500);
  return S;
}
/** Name the station on its sign (tickTrain3D's stationX places it). */
export function trainStation(name) {
  if (!S) return;
  const m = S.st.sign.material; if (m.map) m.map.dispose(); m.map = signTex(name); m.needsUpdate = true;
}
/** The cars cut away round the hero (x: his tile x; null: none): their roofs and near sides hidden. */
export function trainCutaway(x) {
  if (!S) return;
  for (const c of S.cuts) c.g.visible = x == null || x < c.x0 - 0.6 || x > c.x1 + 0.6;
}
function emit(x, y, z, vx, vy, vz, life, color, s0, s1, a) {
  const sm = S.smoke.find((q) => q.life <= 0); if (!sm) return;
  Object.assign(sm, { x, y, z, vx, vy, vz, life, max: life, s0, s1, a }); sm.s.material.color.setHex(color); sm.s.visible = true;
}
/** Game time: the land streams by at `speed` tiles a second, the station stands at `stationX` (null: none), the
 *  engine's fire burns at `fire` (0..1: its smoke and firebox). */
export function tickTrain3D(dt, { speed = 0, stationX = null, fire = 1 } = {}) {
  if (!S) return;
  S.t += dt; S.speed = speed; S.fire = fire;
  const dx = speed * dt; S.scroll += dx;
  S.ground.material.map.offset.x = (S.scroll / 8) % 1;
  S.ballast.material.map.offset.x = (S.scroll / 2) % 1;
  placeScenery(S.scn, S.scroll);
  // the driving wheels turn with the ground (r 0.7), the side rods follow their crank pins
  const a = -S.scroll / 0.7;
  for (const g of S.drivers.wheels) g.rotation.z = a;
  for (const rod of S.drivers.rods) rod.position.set(ENGINE.x0 + 5.45 + 0.35 * Math.cos(a), Y_RAIL + 0.7 + 0.35 * Math.sin(a), rod.userData.z + (rod.userData.z < CZ ? -0.08 : 0.08));
  S.stationX = stationX;
  S.st.g.visible = stationX != null && Math.abs(stationX - 50) < 170;
  if (S.st.g.visible) S.st.g.position.x = stationX;
  // coal smoke from the chimney (trailing back while she runs, rising when she stands), steam from the cylinders
  if (fire > 0.05 && (S.smokeT -= dt) <= 0) {
    S.smokeT = (speed > 1 ? 0.09 : 0.2) / Math.max(0.3, fire);
    const [x, y, z] = ENGINE_STACK();
    emit(x, y, z, -speed * 0.85 - 0.3 + rnd() * 0.6, 1.5 + rnd() * 0.8, (rnd() - 0.5) * 0.6, 2.6 + rnd(), rnd() < 0.5 ? 0x3c3a38 : 0x5a5856, 0.9, 4.2, 0.7);
  }
  if (speed > 0.5 && (S.steamT -= dt) <= 0) {
    S.steamT = 0.5 / Math.min(1, speed / 9);
    for (const z of [ROW0 - 0.3, ROW0 + ROWS + 0.3]) emit(ENGINE.x1 - 1.2, -0.45, z, -speed * 0.6, 0.6, (z < CZ ? -1 : 1) * 0.6, 0.9, 0xe8e8ea, 0.4, 1.8, 0.6);
  }
  for (const sm of S.smoke) {
    if (sm.life <= 0) continue;
    sm.life -= dt; const k = 1 - sm.life / sm.max;
    sm.x += sm.vx * dt; sm.y += sm.vy * dt * (1 - k * 0.6); sm.z += sm.vz * dt;
    sm.s.position.set(sm.x, sm.y, sm.z); sm.s.scale.setScalar(sm.s0 + k * (sm.s1 - sm.s0)); sm.s.material.opacity = sm.a * (1 - k) * Math.min(1, k * 8);
    if (sm.life <= 0) sm.s.visible = false;
  }
  S.glows.forEach((g, i) => { g.material.opacity = 0.55 + 0.08 * Math.sin(S.t * 7 + i * 1.7); });
  for (const g of S.engineGlows) g.material.opacity *= 0.3 + 0.7 * fire;
  S.M.fire.color.setRGB(1, 0.35 + 0.2 * fire, 0.1 * fire).multiplyScalar(0.35 + 0.65 * fire);
}

/**
 * Draw the train and the land behind the sprites. focus: the hero's [tile x, height, tile y] (the lamps nearest him
 * get the point lights; the night closes in beyond him). One pixel per world px (0.75 on touch), as the Pirate Seas.
 */
export function drawTrain3D(ctx, focus) {
  const W = G.W * G.dpr, H = G.H * G.dpr;
  if (!S) { ctx.fillStyle = '#141a26'; ctx.fillRect(0, 0, W, H); return; }
  const rd = renderer(), z = camera.zoom, q = G.touch ? 0.75 : 1;
  const zq = G.zoomFlux ? 2 ** (Math.round(Math.log2(z) * 6) / 6) : z;
  let pw = G.W / zq * q, ph = G.H / zq * q;
  const cap = G.touch ? 1.1e6 : 2.4e6, k = Math.min(1, Math.sqrt(cap / (pw * ph)));
  pw = Math.max(16, Math.round(pw * k)); ph = Math.max(16, Math.round(ph * k));
  if (rd.w !== pw || rd.h !== ph) { rd.gl.setSize(pw, ph, false); rd.w = pw; rd.h = ph; }
  const cx = camera.x + camera.shakeX, cy = camera.y + camera.shakeY, hw = G.W / 2 / z, hh = G.H / 2 / z, cam = rd.cam;
  cam.left = (cx - hw) / SC; cam.right = (cx + hw) / SC; cam.top = -(cy - hh) / SC; cam.bottom = -(cy + hh) / SC; cam.updateProjectionMatrix();
  const [fx, fy, fz] = focus || [50, 0, CZ];
  const d0 = 800 - (fx * rd.dir.x + fy * rd.dir.y + fz * rd.dir.z);
  S.scene.fog.near = d0 + 22; S.scene.fog.far = d0 + 95;
  const near = [];
  for (const l of S.lightSrc) {
    if (l.o !== S.scene && !l.o.visible) continue;
    l.o.localToWorld(l.w.copy(l.p));
    const dd = (l.w.x - fx) ** 2 + (l.w.z - fz) ** 2;
    if (dd < 400) near.push([dd, l]);
  }
  near.sort((a, b) => a[0] - b[0]);
  for (let i = 0; i < S.pool.length; i++) {
    const L = S.pool[i], n = near[i];
    if (!n) { L.intensity = 0; continue; }
    const l = n[1], fl = 0.92 + 0.08 * Math.sin(S.t * 9 + i * 1.7) * Math.sin(S.t * 5.3 + i);
    L.position.copy(l.w); L.color.setHex(l.c); L.distance = l.r; L.intensity = 9 * fl * (l.engine ? 0.3 + 0.7 * S.fire : 1);
  }
  rd.gl.setClearColor(SKY, 1);
  rd.gl.render(S.scene, cam);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const sm = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false;
  ctx.drawImage(rd.gl.domElement, 0, 0, W, H);
  ctx.imageSmoothingEnabled = sm;
}

export function disposeTrain3D() {
  if (!S) return;
  clearInterval(S.watch);
  S.scene.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
    for (const m of ms) { if (m.map && m.map !== haloTex && m.map !== puffTex) m.map.dispose(); m.dispose(); }
  });
  S = null;
  if (R) { R.w = R.h = 0; }
}
/** The engine's silhouette for the sprite masks: [x0, x1, z0, z1, y0, y1] boxes (the cab, the boiler, the chimney). */
export const ENGINE_BOXES = [
  [ENGINE.x0 - 0.25, ENGINE.x0 + 3.25, ROW0 - 0.25, ROW0 + ROWS + 0.25, -1.1, 2.6],
  [ENGINE.x0 + 3, ENGINE.x1 + 0.6, CZ - 1.15, CZ + 1.15, -1.1, 2.15],
  [ENGINE.x1 - 1.45, ENGINE.x1 - 0.15, CZ - 0.65, CZ + 0.65, 2, 4.05],
];
