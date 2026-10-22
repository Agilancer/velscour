// The airship: a Final Fantasy style flying galleon (wooden hull, mast rotors, outrigger engines, stern props, ribbed
// fins, an amethyst levitation keel) built in three.js from the Material Texture Pack (assets/source/airship/).
// Units are tiles: 1 unit = one game tile (64 x 32 px), height in the same units, so a 60 px hero stands 1.53 tall.
// Local frame: bow toward -Z (upper right in the game's iso view), starboard +X, main deck at y = 0.
// buildAirship(M) -> { root, anim(t, dt), info }. Viewer: tools/airship3d.html.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const TEX = {
  deck: 'ship_planks/SHIP-02_Salt_Worn_Oak', deck2: 'ship_planks/SHIP-03_Violet_Teak', hull: 'ship_planks/SHIP-05_Red_Mahogany',
  hullLow: 'ship_planks/SHIP-01_Tarblack_Oak', step: 'ship_planks/SHIP-10_Black_Walnut_Rift_Seam',
  iron: 'metal/MET-02_Riveted_Black_Iron', gunmetal: 'metal/MET-01_Hammered_Gunmetal', brass: 'metal/MET-09_Oxide_Stained_Brass',
  bronze: 'metal/MET-04_Tarnished_Bronze', copper: 'metal/MET-05_Oxidized_Copper', amethyst: 'metal/MET-10_Amethyst_Corrosion',
  canvas: 'sailcloth/CLOTH-01_Coarse_Sail_Canvas', charcoal: 'sailcloth/CLOTH-02_Stitched_Charcoal', patched: 'sailcloth/CLOTH-03_Patched_Dark_Canvas',
  plum: 'sailcloth/CLOTH-05_Deep_Plum_Woven_Sail', cedar: 'wood/WOOD-04_Weathered_Cedar', scroll: 'wood/WOOD-02_Scroll_Cut_Blackwood',
  blackwood: 'wood/WOOD-05_Violet_Streak_Blackwood', gold: 'gold/GOLD-01_Beaten_Antique_Gold', goldLeaf: 'gold/GOLD-02_Scratched_Gold_Leaf',
  goldSeam: 'gold/GOLD-03_Amethyst_Seamed_Gold', goldHammer: 'gold/GOLD-04_Hammered_Reliquary_Gold',
  greyboards: 'ship_planks/SHIP-06_Salt_Bleached_Greyboards', cypress: 'ship_planks/SHIP-04_Splintered_Cypress',
  scorched: 'ship_planks/SHIP-07_Ember_Scorched', mossed: 'ship_planks/SHIP-09_Mossed_Shipboard', bonenail: 'ship_planks/SHIP-08_Bone_Nail_Oak',
  flaked: 'metal/MET-03_Flaked_Iron', silver: 'metal/MET-06_Tarnished_Silver', steel: 'metal/MET-08_Scratched_Blue_Steel',
  endgrain: 'wood/WOOD-01_End_Grain_Timber', rootwood: 'wood/WOOD-03_Rootwood_Grain', goldCharcoal: 'gold/GOLD-05_Gilded_Charcoal_Alloy',
  cream: 'sailcloth/CLOTH-04_Aged_Cream_Linen',
};
const METAL = { flaked: 0.3, silver: 0.45, steel: 0.45, goldCharcoal: 0.45, iron: 0.35, gunmetal: 0.4, brass: 0.45, bronze: 0.4, copper: 0.3, amethyst: 0.3, gold: 0.55, goldLeaf: 0.55, goldSeam: 0.5, goldHammer: 0.55 };
const CLOTH = new Set(['canvas', 'charcoal', 'patched', 'plum', 'cream']);

/** Materials from the pack: nearest-neighbour up close, mipmapped far away (the 160 px tiles are pixel art). */
export async function airshipMaterials(base = '../assets/source/airship/textures/') {
  const loader = new THREE.TextureLoader(), M = {};
  await Promise.all(Object.entries(TEX).map(async ([k, f]) => {
    const t = await loader.loadAsync(`${base}${f}.png`);
    t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.magFilter = THREE.NearestFilter; t.anisotropy = 8;
    const metal = METAL[k] ?? 0, cloth = CLOTH.has(k);
    M[k] = new THREE.MeshStandardMaterial({ map: t, bumpMap: t, bumpScale: cloth ? 0.6 : 1.2, roughness: metal ? 0.5 : 0.9, metalness: metal,
      side: cloth || k === 'brass' ? THREE.DoubleSide : THREE.FrontSide });   // brass: the open prop shrouds
  }));
  M.glass = new THREE.MeshStandardMaterial({ color: 0xffb35a, emissive: 0xff8a2a, emissiveIntensity: 1.4, roughness: 0.6 });
  M.lamp = new THREE.MeshStandardMaterial({ color: 0xffd08a, emissive: 0xffa040, emissiveIntensity: 2.2 });
  M.crystal = new THREE.MeshStandardMaterial({ color: 0xc58cff, emissive: 0x9a3dff, emissiveIntensity: 1.6, roughness: 0.25, metalness: 0.1, flatShading: true });
  M.dark = new THREE.MeshStandardMaterial({ color: 0x0d0a0c, roughness: 1 });
  M.rope = new THREE.LineBasicMaterial({ color: 0x2b1d16 });
  M.neon = new THREE.MeshStandardMaterial({ color: 0xd9a6ff, emissive: 0xa24dff, emissiveIntensity: 2.0, roughness: 0.4 });
  M.cyan = new THREE.MeshStandardMaterial({ color: 0xbff4ff, emissive: 0x5fd8ff, emissiveIntensity: 1.6, roughness: 0.3 });
  M.ember = new THREE.MeshStandardMaterial({ color: 0xff7a4a, emissive: 0xff3a10, emissiveIntensity: 1.8, roughness: 0.6 });
  M.redCrystal = new THREE.MeshStandardMaterial({ color: 0xff7fa8, emissive: 0xd0206a, emissiveIntensity: 1.4, roughness: 0.3, flatShading: true });
  return M;
}

// ------------------------------------------------------------------ shape of the hull
const L = 40, ZS = L / 2;                    // stern at z = +20, bow tip at z = -20; s runs 0 (stern) .. 1 (bow)
const QD_S = 0.2, FC_S = 0.84;               // quarterdeck ends / forecastle starts
const QD_H = 2.2, FC_H = 2.0, BW = 1.0;      // raised deck heights, bulwark height
const WALL = 0.3;                            // bulwark thickness
const zAt = (s) => ZS - s * L;
const sAt = (z) => (ZS - z) / L;
export const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const beam = (s) => s < 0.25 ? 4.9 + 1.3 * Math.sin(s / 0.25 * Math.PI / 2) : s < 0.58 ? 6.2
  : 6.2 * Math.pow(Math.max(0, 1 - Math.pow((s - 0.58) / 0.42, 1.8)), 0.62);
const sheer = (s) => BW + QD_H * (1 - sm(0.17, 0.23, s)) + FC_H * sm(0.81, 0.87, s) + 2.2 * Math.pow(sm(0.86, 1, s), 2) + 0.5 * (1 - sm(0, 0.1, s));
const keel = (s) => -6.4 + 2.3 * (1 - sm(0, 0.34, s)) + 7.4 * Math.pow(sm(0.54, 1, s), 1.5);
const prof = (k) => Math.pow(Math.max(0, 1 - Math.pow(k, 2.5)), 0.55);     // half-width fraction k of the way down
const inner = (s) => Math.max(0, beam(s) - WALL);
const deckAt = (s) => s < QD_S ? QD_H : s > FC_S ? FC_H : 0;
export const AIRSHIP = { L, QD_S, FC_S, QD_H, FC_H, BW, zAt, sAt, beam, inner, deckAt, sheer, keel, prof };

// ------------------------------------------------------------------ geometry helpers
/** Box-projected UVs in the given frame, 1 texture repeat per 2 units (planks run along z on walls and floors). */
export function boxUV(g, swap = false, rep = 2) {
  g = g.index ? g.toNonIndexed() : g;
  if (!g.attributes.normal) g.computeVertexNormals();
  const p = g.attributes.position, n = g.attributes.normal, uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    let u, v;
    if (ay >= ax && ay >= az) { u = z; v = x; } else if (ax >= az) { u = z; v = y; } else { u = x; v = y; }
    if (swap) [u, v] = [v, u];
    uv[i * 2] = u / rep; uv[i * 2 + 1] = v / rep;
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
}
export const clean = (g) => { g = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k); return g; };

/** Collects geometry per material and merges it into one mesh each. */
export class Parts {
  constructor(M) { this.M = M; this.by = {}; }
  add(mat, g, { uv = 'box', swap = false, rep = 2 } = {}) {
    g = uv === 'box' ? boxUV(g, swap, rep) : clean(g);
    if (!g.attributes.normal) g.computeVertexNormals();
    (this.by[mat] ||= []).push(clean(g));
    return this;
  }
  build(name) {
    const grp = new THREE.Group(); grp.name = name;
    for (const [mat, list] of Object.entries(this.by)) {
      const m = new THREE.Mesh(mergeGeometries(list), this.M[mat]);
      m.name = `${name}:${mat}`; m.castShadow = m.receiveShadow = true; grp.add(m);
    }
    return grp;
  }
}
export const box = (w, h, d, x, y, z, ry = 0) => { const g = new THREE.BoxGeometry(w, h, d); if (ry) g.rotateY(ry); return g.translate(x, y, z); };
/** A cylinder (or cone, r1 = 0) from a to b. */
export function rod(a, b, r0, r1 = r0, seg = 8, open = false) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), d = B.clone().sub(A);
  const g = new THREE.CylinderGeometry(r1, r0, d.length(), seg, 1, open);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize()));
  return g.translate((A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2);
}
/** Triangles from a flat list of points [[x,y,z],...] and index triples; normals computed. */
export function tris(pts, idx) {
  const a = new Float32Array(idx.length * 3);
  idx.forEach((v, i) => a.set(pts[v], i * 3));
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(a, 3)); g.computeVertexNormals();
  return g;
}
/** A grid surface: f(i/nu, j/nv) -> [x,y,z], uvs given by uvf (or the grid). flip reverses the winding. */
export function surf(nu, nv, f, uvf = (u, v) => [u, v], flip = false) {
  const pos = [], uv = [];
  const P = (i, j) => f(i / nu, j / nv), U = (i, j) => uvf(i / nu, j / nv);
  for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
    const q = [[i, j], [i + 1, j], [i, j + 1], [i + 1, j + 1]];
    const order = flip ? [0, 2, 1, 1, 2, 3] : [0, 1, 2, 2, 1, 3];
    for (const o of order) { pos.push(...P(...q[o])); uv.push(...U(...q[o])); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
}

// ------------------------------------------------------------------ the ship
export function buildAirship(M) {
  const root = new THREE.Group(); root.name = 'airship';
  const P = new Parts(M), spin = [], wave = [], glow = [];
  const NS = 140;

  // Hull: bands down the side (mahogany, a gold strake, tarblack below), planks following the sheer.
  const hullBand = (mat, k0, k1, nk) => {
    for (const side of [1, -1]) P.add(mat, surf(NS, nk, (u, v) => {
      const s = u, k = k0 + (k1 - k0) * v, top = sheer(s), bot = keel(s);
      return [side * beam(s) * prof(k), top - (top - bot) * k, zAt(s)];
    }, (u, v) => { const s = u, k = k0 + (k1 - k0) * v; return [zAt(s) / 2, -(sheer(s) - keel(s)) * k / 2]; }, side > 0), { uv: 'keep' });
  };
  hullBand('hull', 0, 0.36, 10); hullBand('gold', 0.36, 0.41, 2); hullBand('hullLow', 0.41, 0.93, 14); hullBand('iron', 0.93, 1, 3);
  // Transom: the stern section filled.
  {
    const ring = [], N = 16;
    for (let j = 0; j <= N; j++) { const k = j / N; ring.push([beam(0) * prof(k), sheer(0) - (sheer(0) - keel(0)) * k]); }
    const pts = [[0, (sheer(0) + keel(0)) / 2, ZS]], idx = [];
    const all = [...ring, ...ring.slice(0, -1).reverse().map(([x, y]) => [-x, y])];
    all.forEach(([x, y]) => pts.push([x, y, ZS]));
    for (let i = 1; i < all.length; i++) idx.push(0, i + 1, i);
    idx.push(0, 1, all.length);
    P.add('hull', tris(pts, idx));
  }
  // Bulwark inner faces and the gold cap rail; decks.
  const capH = 0.12;
  for (const side of [1, -1]) {
    P.add('blackwood', surf(NS, 1, (u, v) => [side * inner(u), v ? deckAt(u) - 0.05 : sheer(u), zAt(u)], (u, v) => [zAt(u) / 2, v * 0.6], side < 0), { uv: 'keep' });
    P.add('goldHammer', surf(NS, 1, (u, v) => [side * (v ? inner(u) - 0.05 : beam(u) + 0.06), sheer(u) + capH, zAt(u)], (u, v) => [zAt(u) / 2, v * 0.2], side < 0), { uv: 'keep' });
  }
  const deckStrip = (mat, s0, s1, y) => P.add(mat, surf(Math.ceil((s1 - s0) * NS), 1, (u, v) => {
    const s = s0 + (s1 - s0) * u; return [(v * 2 - 1) * inner(s), y, zAt(s)];
  }, (u, v) => { const s = s0 + (s1 - s0) * u; return [zAt(s) / 2, (v * 2 - 1) * inner(s) / 2]; }, true), { uv: 'keep' });
  deckStrip('deck', QD_S - 0.01, FC_S + 0.01, 0);
  deckStrip('deck2', 0.0075, QD_S, QD_H);
  deckStrip('deck2', FC_S, 0.995, FC_H);
  // stern bulwark across the quarterdeck, and the bulkheads under the raised decks
  P.add('blackwood', box(inner(0) * 2, sheer(0) - QD_H, WALL, 0, (sheer(0) + QD_H) / 2, ZS - WALL / 2));
  P.add('goldHammer', box(beam(0) * 2 + 0.1, capH, WALL + 0.12, 0, sheer(0) + capH / 2, ZS - WALL / 2));
  const zq = zAt(QD_S), zf = zAt(FC_S);
  P.add('cedar', box(inner(QD_S) * 2, QD_H, 0.3, 0, QD_H / 2, zq - 0.15));
  P.add('cedar', box(inner(FC_S) * 2, FC_H, 0.3, 0, FC_H / 2, zf + 0.15));

  // Stairs: wide and central, so the decks connect as one arena.
  const stairs = (z0, dir, h, n) => {
    const rise = h / n, run = 0.42, w = 4;
    for (let i = 0; i < n; i++) {
      const y = rise * (n - i), z = z0 + dir * run * (i + 0.5);
      P.add('step', box(w, y, run, 0, y / 2, z));
    }
    for (const sx of [-1, 1]) {           // stringers
      const g = new THREE.BoxGeometry(0.22, 0.32, run * n * Math.hypot(1, h / (run * n)) + 0.2);
      g.rotateX(dir * Math.atan2(h, run * n)); g.translate(sx * (w / 2 + 0.11), h / 2 + 0.12, z0 + dir * run * n / 2);
      P.add('blackwood', g);
    }
    return z0 + dir * run * n;
  };
  const qFoot = stairs(zq, -1, QD_H, 9), fFoot = stairs(zf, 1, FC_H, 8);

  // Balustrades along the raised deck edges (gap for the stairs), with lanterns on the newel posts.
  const rail = (x0, x1, y, z) => {
    const len = Math.abs(x1 - x0), cx = (x0 + x1) / 2, n = Math.max(2, Math.round(len / 0.45));
    for (let i = 0; i <= n; i++) P.add('blackwood', box(0.1, 0.62, 0.1, x0 + (x1 - x0) * i / n, y + 0.31, z));
    P.add('goldHammer', box(len + 0.16, 0.12, 0.2, cx, y + 0.68, z));
    P.add('blackwood', box(len, 0.08, 0.12, cx, y + 0.12, z));
    for (const x of [x0, x1]) P.add('scroll', box(0.26, 0.9, 0.26, x, y + 0.45, z));
  };
  const lantern = (x, y, z, big = 1) => {
    P.add('iron', box(0.3 * big, 0.06, 0.3 * big, x, y, z));
    P.add('glass', box(0.22 * big, 0.3 * big, 0.22 * big, x, y + 0.18 * big, z));
    P.add('goldHammer', new THREE.ConeGeometry(0.2 * big, 0.2 * big, 4).rotateY(Math.PI / 4).translate(x, y + 0.43 * big, z));
    glow.push({ x, y: y + 0.18 * big, z, r: 1.6 * big, c: 0xffa040 });
  };
  for (const [z, y, s] of [[zq - 0.12, QD_H, QD_S], [zf + 0.12, FC_H, FC_S]]) {
    rail(-inner(s) + 0.1, -2.15, y, z); rail(2.15, inner(s) - 0.1, y, z);
    lantern(-2.15, y + 0.9, z); lantern(2.15, y + 0.9, z);
  }
  // Forecastle doors (below deck) and the quarterdeck's cabin doors, gold framed.
  const door = (x, z, face) => {
    P.add('dark', box(1.1, 1.7, 0.06, x, 0.85, z + face * 0.05));
    P.add('scroll', box(1.0, 1.6, 0.05, x, 0.8, z + face * 0.09));
    P.add('goldHammer', box(1.3, 0.14, 0.12, x, 1.75, z + face * 0.08));
    for (const dx of [-0.6, 0.6]) P.add('goldHammer', box(0.12, 1.8, 0.12, x + dx, 0.9, z + face * 0.08));
  };
  door(-3.8, zf + 0.3, 1); door(3.8, zf + 0.3, 1); door(-3.8, zq - 0.3, -1); door(3.8, zq - 0.3, -1);
  // Lanterns on the bulwark tops.
  for (const s of [0.1, 0.28, 0.42, 0.56, 0.7, 0.92]) for (const side of [-1, 1]) lantern(side * (inner(s) + WALL / 2), sheer(s) + capH, zAt(s), 0.8);

  // Gun ports along both sides, and four deck guns on the main deck.
  for (const s of [0.27, 0.47, 0.53, 0.74]) for (const side of [-1, 1]) {
    const z = zAt(s), x = beam(s) * prof(0.22) * side, y = sheer(s) - (sheer(s) - keel(s)) * 0.22;
    P.add('iron', box(0.24, 1.0, 1.1, x, y, z)); P.add('dark', box(0.26, 0.7, 0.8, x + side * 0.01, y, z));
    P.add('gunmetal', rod([x, y, z], [x + side * 0.9, y + 0.03, z], 0.2, 0.17, 10));
  }
  const deckGun = (s, side) => {
    const z = zAt(s), x = side * (inner(s) - 1.1);
    P.add('blackwood', box(1.0, 0.45, 1.0, x, 0.3, z));
    for (const dz of [-0.4, 0.4]) P.add('iron', rod([x - 0.45, 0.2, z + dz], [x + 0.45, 0.2, z + dz], 0.2, 0.2, 10));
    P.add('gunmetal', rod([x - side * 0.6, 0.75, z], [x + side * 1.2, 0.85, z], 0.26, 0.2, 12));
    P.add('goldHammer', rod([x + side * 1.1, 0.84, z], [x + side * 1.25, 0.86, z], 0.24, 0.24, 12));
  };
  for (const side of [-1, 1]) { deckGun(0.32, side); deckGun(0.72, side); }

  // Stern: gallery windows on the transom, carved taffrail crest, stern lanterns.
  for (let i = 0; i < 5; i++) {
    const x = (i - 2) * 1.55, y = QD_H * 0.42;
    P.add('glass', box(0.9, 1.25, 0.06, x, y, ZS + 0.05));
    P.add('glass', new THREE.CylinderGeometry(0.45, 0.45, 0.06, 12, 1, false, 0, Math.PI).rotateX(Math.PI / 2).rotateZ(Math.PI / 2).translate(x, y + 0.62, ZS + 0.05));
    P.add('goldHammer', box(1.12, 0.14, 0.16, x, y - 0.68, ZS + 0.1));
    for (const dx of [-0.52, 0.52]) P.add('goldHammer', box(0.12, 1.5, 0.16, x + dx, y + 0.05, ZS + 0.1));
  }
  for (let i = 0; i < 4; i++) {
    const x = (i - 1.5) * 1.6, y = -1.7;
    P.add('glass', box(0.7, 0.8, 0.06, x, y, ZS + 0.05));
    P.add('goldHammer', box(0.9, 0.12, 0.14, x, y - 0.46, ZS + 0.1)); P.add('goldHammer', box(0.9, 0.12, 0.14, x, y + 0.46, ZS + 0.1));
    glow.push({ x, y, z: ZS + 0.3, r: 1.6, c: 0xffa040 });
  }
  P.add('gold', box(beam(0) * 1.72 + 0.3, 0.24, 0.5, 0, QD_H * 0.42 - 0.95, ZS + 0.12));        // gallery sill
  {
    const sh = new THREE.Shape(), w = inner(0) - 0.2, base = 0, h = 1.5;
    sh.moveTo(-w, base); sh.lineTo(-w, base + h * 0.45);
    sh.bezierCurveTo(-w * 0.6, base + h * 0.4, -w * 0.45, base + h * 1.05, 0, base + h);
    sh.bezierCurveTo(w * 0.45, base + h * 1.05, w * 0.6, base + h * 0.4, w, base + h * 0.45); sh.lineTo(w, base);
    const g = new THREE.ExtrudeGeometry(sh, { depth: 0.24, bevelEnabled: false, curveSegments: 10 });
    P.add('scroll', g.translate(0, sheer(0) + capH, ZS - 0.3));
    const rim = new THREE.ExtrudeGeometry(sh, { depth: 0.3, bevelEnabled: false, curveSegments: 10 });
    rim.scale(1.04, 1.06, 1); P.add('goldHammer', rim.translate(0, sheer(0) + capH - 0.02, ZS - 0.33));
  }
  for (const x of [-inner(0) + 0.1, inner(0) - 0.1]) {
    const y = sheer(0) + capH + 0.8;
    P.add('iron', rod([x, y - 0.2, ZS - 0.15], [x, y + 0.2, ZS - 0.15], 0.06));
    lantern(x, y + 0.2, ZS - 0.15, 1.4);
  }

  // Helm on the quarterdeck.
  {
    const z = zAt(0.155), y = QD_H;
    P.add('blackwood', box(0.5, 1.1, 0.5, 0, y + 0.55, z));
    const wheel = new THREE.Group(); wheel.position.set(0, y + 1.25, z - 0.32);
    const W = new Parts(M);
    W.add('scroll', new THREE.TorusGeometry(0.62, 0.07, 6, 20));
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; W.add('scroll', rod([0, 0, 0], [Math.cos(a) * 0.85, Math.sin(a) * 0.85, 0], 0.04, 0.035, 5)); }
    W.add('goldHammer', new THREE.CylinderGeometry(0.14, 0.14, 0.2, 10).rotateX(Math.PI / 2));
    wheel.add(W.build('wheel')); root.add(wheel);
  }

  // Masts: tapering cedar with iron bands, furled yards, crow's nest, a rotor and pennant on top.
  const masts = [
    { s: 0.52, h: 17, r: 0.42, rotor: 5.8, blades: 4, yards: [[6.2, 8.4], [9.6, 7.2], [13, 5.8]], nest: 7.6 },
    { s: 0.915, h: 12.5, r: 0.34, rotor: 3.8, blades: 3, yards: [[5.2, 6], [8.6, 4.8]] },
    { s: 0.075, h: 11, r: 0.32, rotor: 3.6, blades: 3, yards: [[5.4, 6.4]] },
  ];
  const mastTop = [];
  for (const m of masts) {
    const z = zAt(m.s), y0 = deckAt(m.s), top = y0 + m.h;
    mastTop.push([0, top, z]);
    P.add('cedar', rod([0, y0 - 0.1, z], [0, top, z], m.r, m.r * 0.6, 12), { swap: true });
    for (let y = y0 + 0.6; y < top - 0.5; y += 2.2) P.add('iron', rod([0, y, z], [0, y + 0.22, z], m.r * (1 - 0.4 * (y - y0) / m.h) + 0.05, undefined, 12));
    P.add('scroll', box(m.r * 3.2, 0.5, m.r * 3.2, 0, y0 + 0.25, z));                  // mast step
    for (const [yy, w] of m.yards) {
      const y = y0 + yy;
      P.add('cedar', rod([-w, y, z], [w, y, z], 0.13, 0.13, 8), { swap: true });
      P.add('canvas', rod([-w * 0.92, y - 0.18, z + 0.05], [w * 0.92, y - 0.18, z + 0.05], 0.24, 0.24, 8));  // furled sail
      for (const sx of [-1, 1]) P.add('goldHammer', new THREE.SphereGeometry(0.16, 8, 6).translate(sx * w, y, z));
    }
    if (m.nest) {
      const y = y0 + m.nest;
      P.add('cedar', new THREE.CylinderGeometry(1.25, 1.05, 0.9, 16, 1, true).translate(0, y + 0.45, z));
      P.add('cedar', new THREE.CylinderGeometry(1.05, 1.05, 0.12, 16).translate(0, y, z));
      P.add('iron', new THREE.TorusGeometry(1.25, 0.06, 4, 20).rotateX(Math.PI / 2).translate(0, y + 0.9, z));
      P.add('iron', new THREE.TorusGeometry(1.1, 0.06, 4, 20).rotateX(Math.PI / 2).translate(0, y + 0.1, z));
    }
    // rotor: gold hub, twisted blades, tip weights; spins about the mast
    const R = new Parts(M), rotor = new THREE.Group(); rotor.position.set(0, top + 0.35, z);
    R.add('bronze', new THREE.CylinderGeometry(0.42, 0.55, 0.6, 12));
    R.add('goldHammer', new THREE.SphereGeometry(0.4, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 0.3, 0));
    for (let i = 0; i < m.blades; i++) {
      const a = i * Math.PI * 2 / m.blades;
      const g = new THREE.BoxGeometry(m.rotor, 0.08, 0.7);
      const pos = g.attributes.position;
      for (let v = 0; v < pos.count; v++) {                 // taper toward the tip and twist
        const x = pos.getX(v) + m.rotor / 2, t = x / m.rotor;
        pos.setZ(v, pos.getZ(v) * (1.15 - 0.55 * t)); pos.setY(v, pos.getY(v) + pos.getZ(v) * (0.35 - 0.25 * t)); pos.setX(v, x + 0.35);
      }
      g.computeVertexNormals(); g.rotateY(a); R.add('goldLeaf', g);
      R.add('iron', box(0.3, 0.14, 0.5, Math.cos(a) * (m.rotor + 0.25), 0, -Math.sin(a) * (m.rotor + 0.25), a));
    }
    rotor.add(R.build('rotor')); root.add(rotor);
    spin.push({ o: rotor, axis: 'y', w: 5.5 + m.blades * 0.4 });
    // pennant above the rotor
    P.add('iron', rod([0, top + 0.6, z], [0, top + 2.6, z], 0.05));
    wave.push(flag(M.plum, 3.6 + m.h * 0.12, 0.7, [0, top + 2.5, z], 0.12, 'pennant'));
  }

  // Bowsprit, jib and figurehead (a gilded raven with spread wings).
  const bowTip = [0, sheer(0.985) - 0.6, zAt(0.995)];
  const spritEnd = [0, bowTip[1] + 3.0, bowTip[2] - 8.0];
  P.add('cedar', rod([0, bowTip[1] - 0.6, bowTip[2] + 2.5], spritEnd, 0.32, 0.16, 10), { swap: true });
  P.add('gold', new THREE.ConeGeometry(0.2, 0.7, 8).rotateX(-Math.PI / 2 + Math.atan2(3, 8)).translate(spritEnd[0], spritEnd[1] + 0.12, spritEnd[2] - 0.3));
  for (const f of [0.35, 0.7]) {
    const p = bowTip.map((v, i) => v + (spritEnd[i] - v) * f);
    P.add('iron', rod([p[0], p[1] - 0.05, p[2] + 0.12], [p[0], p[1] + 0.05, p[2] - 0.12], 0.36, 0.36, 10));
  }
  {
    const fm = mastTop[1], a = [spritEnd[0], spritEnd[1] - 0.2, spritEnd[2] + 0.4], b = [0, bowTip[1] + 0.9, bowTip[2] + 1.0], c = [0, fm[1] - 3.4, fm[2] - 0.3];
    const g = surf(10, 6, (u, v) => {
      const p = [0, 1, 2].map((i) => a[i] + (c[i] - a[i]) * v + (b[i] - a[i]) * u * (1 - v));
      p[0] += Math.sin(Math.PI * v) * Math.sin(Math.PI * u) * 0.9;     // belly to starboard
      return p;
    }, (u, v) => [u * 3 * (1 - v), v * 5]);
    P.add('canvas', g, { uv: 'keep' });
  }
  {
    const z = zAt(0.985) - 1.2, y = sheer(0.985) - 1.5;
    P.add('goldSeam', new THREE.SphereGeometry(0.55, 10, 8).scale(0.8, 0.9, 1.25).translate(0, y + 0.5, z - 0.5));
    P.add('goldSeam', new THREE.ConeGeometry(0.22, 1.2, 6).rotateX(-Math.PI / 2).translate(0, y + 0.42, z - 1.5));
    P.add('goldSeam', new THREE.SphereGeometry(0.42, 10, 8).scale(0.8, 1.2, 1.3).translate(0, y - 0.15, z + 0.2));
    P.add('crystal', new THREE.OctahedronGeometry(0.1).translate(0.3, y + 0.62, z - 0.85));
    P.add('crystal', new THREE.OctahedronGeometry(0.1).translate(-0.3, y + 0.62, z - 0.85));
    for (const side of [-1, 1]) {                         // wings raised and spread back past the bow, feathered
      const R = [side * 0.35, y + 0.3, z + 0.1], T = [side * 3.4, y + 2.6, z + 2.6], pts = [], idx = [], n = 7;
      for (let i = 0; i <= n; i++) {
        const t = i / n, lead = R.map((r, j) => r + (T[j] - r) * t + (j === 1 ? Math.sin(Math.PI * t) * 0.5 : 0));
        const drop = (1.7 - 1.1 * t) * (i % 2 ? 0.78 : 1);
        pts.push(lead, [lead[0] - side * 0.25 * drop, lead[1] - drop, lead[2] + 0.55 * drop]);
      }
      for (let i = 0; i < n; i++) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3, a, a + 1, a + 2, a + 1, a + 3, a + 2); }
      P.add('gold', tris(pts, idx));
      P.add('goldSeam', rod(R, T, 0.14, 0.06, 6));
    }
  }
  // iron ram at the stem foot
  P.add('iron', new THREE.ConeGeometry(0.75, 3.2, 8).rotateX(-Math.PI / 2).scale(0.7, 1, 1).translate(0, keel(0.97) + 0.3, zAt(0.97) - 1.6));

  // Outrigger engines: brass nacelles on iron struts, gold nose, wooden props at the back.
  for (const s of [0.36, 0.645]) for (const side of [-1, 1]) {
    const z = zAt(s), b = beam(s), x = side * (b + 3.3), y = -2.6, len = 4.8;
    P.add('brass', new THREE.CylinderGeometry(0.85, 1.0, len, 16).rotateX(Math.PI / 2).translate(x, y, z), { swap: true });
    P.add('gold', new THREE.SphereGeometry(1.0, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 1, 1).rotateX(-Math.PI / 2).scale(1, 1, 1.5).translate(x, y, z - len / 2));
    for (const dz of [-1.6, 0, 1.6]) P.add('iron', new THREE.CylinderGeometry(1.06 - dz * 0.03, 1.06 - dz * 0.03, 0.26, 16).rotateX(Math.PI / 2).translate(x, y, z + dz));
    P.add('iron', new THREE.CylinderGeometry(0.5, 0.75, 0.9, 12).rotateX(Math.PI / 2).translate(x, y, z + len / 2 + 0.4));
    for (const dz of [-0.9, 0.7]) P.add('copper', rod([x, y + 0.8, z + dz], [x + side * 0.2, y + 2.0, z + dz + 0.6], 0.16, 0.2, 8));
    for (const [hy, dz] of [[-0.9, -1.2], [-0.9, 1.2], [-4.2, 0]]) P.add('iron', rod([side * (beam(sAt(z + dz)) * prof((sheer(s) - hy) / (sheer(s) - keel(s))) - 0.2), hy, z + dz], [x - side * 0.8, y + (hy > 0 ? 0.5 : -0.4), z + dz * 0.7], 0.17, 0.17, 6));
    P.add('scroll', rod([side * (b - 0.2), 0.2, z], [x - side * 0.5, y + 0.9, z], 0.12, 0.12, 6));
    const prop = new THREE.Group(); prop.position.set(x, y, z + len / 2 + 0.95);
    const R = new Parts(M);
    R.add('goldHammer', new THREE.ConeGeometry(0.42, 0.9, 12).rotateX(Math.PI / 2));
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2, g = new THREE.BoxGeometry(0.5, 2.15, 0.08);
      const pos = g.attributes.position;
      for (let v = 0; v < pos.count; v++) { const t = (pos.getY(v) + 1.075) / 2.15; pos.setX(v, pos.getX(v) * (1.2 - 0.6 * Math.abs(t - 0.45))); pos.setZ(v, pos.getZ(v) + pos.getX(v) * 0.5); pos.setY(v, pos.getY(v) + 1.2); }
      g.computeVertexNormals(); g.rotateZ(a); R.add('cedar', g);
    }
    prop.add(R.build('prop')); root.add(prop);
    spin.push({ o: prop, axis: 'z', w: side * 14 });
  }
  // Stern props under the transom.
  for (const side of [-1, 1]) {
    const x = side * 2.4, y = keel(0) + 0.2, z = ZS + 0.6;
    P.add('iron', rod([x, y, ZS - 3], [x, y, z], 0.18, 0.18, 8));
    P.add('iron', rod([side * 1.2, keel(0.04) + 0.3, ZS - 2.4], [x, y, ZS - 1.2], 0.14, 0.14, 6));
    const prop = new THREE.Group(); prop.position.set(x, y, z + 0.3);
    const R = new Parts(M);
    R.add('goldHammer', new THREE.ConeGeometry(0.34, 0.8, 10).rotateX(Math.PI / 2));
    for (let i = 0; i < 3; i++) {
      const g = new THREE.BoxGeometry(0.8, 1.55, 0.08);
      const pos = g.attributes.position;
      for (let v = 0; v < pos.count; v++) { const t = (pos.getY(v) + 0.775) / 1.55; pos.setX(v, pos.getX(v) * (1.1 - 0.5 * Math.abs(t - 0.55))); pos.setZ(v, pos.getZ(v) + pos.getX(v) * 0.6); pos.setY(v, pos.getY(v) + 0.95); }
      g.computeVertexNormals(); g.rotateZ(i * Math.PI * 2 / 3); R.add('brass', g);
    }
    prop.add(R.build('sternprop')); root.add(prop);
    P.add('brass', new THREE.CylinderGeometry(2.05, 2.15, 1.3, 24, 1, true).rotateX(Math.PI / 2).translate(x, y, z + 0.3));   // shroud
    for (const dz of [-0.62, 0.62]) P.add('iron', new THREE.TorusGeometry(2.12, 0.1, 5, 24).translate(x, y, z + 0.3 + dz));
    spin.push({ o: prop, axis: 'z', w: -side * 11 });
  }
  // Rudder fin below the stern.
  {
    const z0 = zAt(0.2), sh = new THREE.Shape();
    sh.moveTo(0, keel(0.2) + 0.3); sh.lineTo((ZS - z0) * 0.5, keel(0.1) - 1.8); sh.lineTo(ZS - z0 + 0.8, keel(0) - 2.6); sh.lineTo(ZS - z0 + 0.4, keel(0) + 0.4);
    const g = new THREE.ExtrudeGeometry(sh, { depth: 0.24, bevelEnabled: false });
    g.rotateY(-Math.PI / 2); g.translate(0.12, 0, z0);
    P.add('blackwood', g);
    P.add('iron', rod([0, keel(0.1) - 1.8, zAt(0.1) - 0.2], [0, keel(0) - 2.6, ZS + 0.8], 0.16, 0.16, 6));
  }
  // Ribbed fins at the stern quarters: plum cloth between gilded spars.
  for (const side of [-1, 1]) {
    const piv = [side * (beam(0.14) - 0.1), 0.5, zAt(0.15)];
    const ends = [[6.8, 0.9, -1.8], [7.2, 1.15, 1.2], [6.2, 1.0, 4.0], [3.6, 0.6, 6.2]].map(([dx, y, dz]) => [piv[0] + side * dx, y, piv[2] + dz]);
    ends.forEach((e) => P.add('blackwood', rod(piv, e, 0.14, 0.07, 6)));
    P.add('gold', new THREE.SphereGeometry(0.4, 10, 8).translate(...piv));
    for (let i = 0; i < ends.length - 1; i++) {
      const a = ends[i], b = ends[i + 1];
      const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - 0.15, (a[2] + b[2]) / 2];
      const pull = mid.map((v, j) => v + (piv[j] - v) * 0.22);        // scalloped trailing edge
      P.add('plum', surf(8, 4, (u, v) => {
        const edge = u < 0.5 ? a.map((q, j) => q + (pull[j] - q) * u * 2) : pull.map((q, j) => q + (b[j] - q) * (u - 0.5) * 2);
        const p = piv.map((q, j) => q + (edge[j] - q) * v);
        p[1] -= Math.sin(Math.PI * v) * 0.25;
        return p;
      }, (u, v) => [u * 2.2, v * 3.4], side < 0), { uv: 'keep' });
    }
  }
  // Amethyst levitation crystals in iron cages under the keel (the ship's lift).
  for (const s of [0.3, 0.5, 0.7]) {
    const z = zAt(s), y = keel(s) - 2.0;
    P.add('iron', rod([0, keel(s) + 0.2, z], [0, y + 1.5, z], 0.18, 0.18, 8));
    P.add('amethyst', new THREE.TorusGeometry(1.0, 0.1, 6, 16).rotateX(Math.PI / 2).translate(0, y + 1.3, z));
    P.add('amethyst', new THREE.TorusGeometry(0.75, 0.1, 6, 16).rotateX(Math.PI / 2).translate(0, y - 1.3, z));
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; P.add('iron', rod([Math.cos(a), y + 1.3, z + Math.sin(a)], [Math.cos(a) * 0.75, y - 1.3, z + Math.sin(a) * 0.75], 0.07, 0.07, 4)); }
    const c = new THREE.Mesh(new THREE.OctahedronGeometry(0.85, 0).scale(1, 1.7, 1), M.crystal);
    c.position.set(0, y, z); c.name = 'crystal'; root.add(c);
    spin.push({ o: c, axis: 'y', w: 0.8 });
    glow.push({ x: 0, y, z, r: 6, c: 0xa040ff, light: true });
  }

  // Rigging: shrouds from the masts to the bulwarks, stays fore and aft.
  const lines = [];
  masts.forEach((m, i) => {
    const z = zAt(m.s), top = mastTop[i][1];
    for (const side of [-1, 1]) for (const dz of [-1.8, -0.6, 0.6, 1.8]) {
      const s = sAt(z + dz);
      lines.push([0, deckAt(m.s) + m.h * 0.8, z], [side * (beam(s) + 0.05), sheer(s) + capH, z + dz]);
    }
    for (const [yy, w] of m.yards) for (const side of [-1, 1]) lines.push([side * w, deckAt(m.s) + yy, z], [0, top - 0.2, z]);
  });
  lines.push(mastTop[0], mastTop[1], mastTop[1], spritEnd, mastTop[0], mastTop[2], mastTop[2], [0, sheer(0) + 1.7, ZS - 0.2]);
  lines.push([0, mastTop[0][1] - 4, mastTop[0][2]], [0, bowTip[1] + 0.6, bowTip[2] + 1.5]);
  const rig = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(lines.map((p) => new THREE.Vector3(...p))), M.rope);
  rig.name = 'rigging'; root.add(rig);

  // Main topsail, set and full of wind, between the upper yards.
  {
    const m = masts[0], z = zAt(m.s), y0 = m.yards[1][0] - 0.2, y1 = m.yards[2][0], w0 = m.yards[1][1] * 0.92, w1 = m.yards[2][1] * 0.92;
    wave.push(sail(M.plum, [z, y0, y1, w0, w1]));
  }
  // Ensign at the stern.
  P.add('iron', rod([0, sheer(0) + 1.6, ZS - 0.2], [0, sheer(0) + 5.2, ZS + 0.6], 0.07, 0.05, 6));
  wave.push(flag(M.patched, 3.4, 2.0, [0, sheer(0) + 5.1, ZS + 0.55], 0.35, 'ensign'));

  root.add(P.build('hull'));
  for (const w of wave) root.add(w.mesh);
  root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });

  const crystals = root.children.filter((o) => o.name === 'crystal');
  function anim(t, dt) {
    for (const s of spin) s.o.rotation[s.axis] += s.w * dt;
    for (const w of wave) w.update(t);
    M.crystal.emissiveIntensity = 1.4 + 0.5 * Math.sin(t * 2.2);
    crystals.forEach((c, i) => { c.position.y = c.userData.y0 + Math.sin(t * 1.6 + i * 2) * 0.12; });
  }
  crystals.forEach((c) => { c.userData.y0 = c.position.y; });
  const info = {
    length: L + 9, beam: 2 * Math.max(...Array.from({ length: 50 }, (_, i) => beam(i / 49))),
    mainDeck: { z0: fFoot, z1: qFoot, width: 2 * inner(0.5) }, walk: AIRSHIP,
    glow,
  };
  return { root, anim, info };
}

/** A cloth strip streaming toward +Z from a pole at p (top corner), waving. */
export function flag(mat, len, h, p, amp, name) {
  const nu = 14, nv = 3;
  const g = new THREE.PlaneGeometry(len, h, nu, nv);
  g.translate(len / 2, -h / 2, 0);
  const base = g.attributes.position.array.slice();
  const pennant = name === 'pennant';
  if (pennant) for (let i = 0; i < base.length; i += 3) base[i + 1] = -h / 2 + (base[i + 1] + h / 2) * (1 - 0.8 * base[i] / len);
  const mesh = new THREE.Mesh(g, mat); mesh.name = name; mesh.castShadow = true;
  mesh.position.set(...p); mesh.rotation.y = -Math.PI / 2;
  const update = (t) => {
    const a = g.attributes.position.array;
    for (let i = 0; i < a.length; i += 3) {
      const x = base[i], f = x / len;
      a[i] = x; a[i + 1] = base[i + 1] - f * f * 0.3 * h;
      a[i + 2] = Math.sin(x * 1.9 - t * 9) * amp * (0.2 + f) + Math.sin(x * 4.1 - t * 15) * amp * 0.25 * f;
    }
    g.attributes.position.needsUpdate = true; g.computeVertexNormals();
  };
  update(0);
  return { mesh, update };
}
/** The main topsail between two yards: bellied aft with the wind, breathing. */
function sail(mat, [z, y0, y1, w0, w1]) {
  const nu = 12, nv = 8, g = new THREE.PlaneGeometry(1, 1, nu, nv);
  const mesh = new THREE.Mesh(g, mat); mesh.name = 'topsail'; mesh.castShadow = true;
  const update = (t) => {
    const a = g.attributes.position.array, uv = g.attributes.uv.array;
    for (let i = 0, k = 0; i < a.length; i += 3, k += 2) {
      const u = uv[k], v = uv[k + 1], w = w0 + (w1 - w0) * v, x = (u * 2 - 1) * w;
      const belly = (1 - (u * 2 - 1) ** 2) * Math.sin(Math.PI * Math.min(1, v * 1.1 + 0.05));
      a[i] = x * (1 - 0.06 * belly); a[i + 1] = y0 + (y1 - y0) * v - belly * 0.35;
      a[i + 2] = z + 0.35 + belly * (1.5 + 0.18 * Math.sin(t * 3.1 + u * 3)) + Math.sin(t * 7 + u * 9 + v * 4) * 0.04;
    }
    g.attributes.position.needsUpdate = true; g.computeVertexNormals();
  };
  update(0);
  // planar repeat for the cloth texture
  mat = mat.clone(); mat.map = mat.map.clone(); mat.map.repeat.set(w0 / 1.6, (y1 - y0) / 2); mat.map.needsUpdate = true;
  mat.bumpMap = mat.map; mesh.material = mat;
  return { mesh, update };
}

// ------------------------------------------------------------------ shared by the other ships
/** A lofted hull from H = { L, beam(s), sheer(s), keel(s), prof(k), bands: [[mat, k0, k1, nk]], ns, transom } (s: 0 stern
 *  .. 1 bow, bow toward -Z, centred on z = 0), plus the bulwarks' inner faces and cap when H.inner/H.deckAt/H.wall/H.cap
 *  are given, and flat decks H.decks: [[mat, s0, s1, y]]. Adds to the Parts P. */
export function hull(P, H) {
  const zAt = (s) => H.L / 2 - s * H.L, ns = H.ns || Math.round(H.L * 3.5);
  for (const [mat, k0, k1, nk] of H.bands) for (const side of [1, -1]) P.add(mat, surf(ns, nk, (u, v) => {
    const k = k0 + (k1 - k0) * v, top = H.sheer(u), bot = H.keel(u);
    return [side * H.beam(u) * H.prof(k), top - (top - bot) * k, zAt(u)];
  }, (u, v) => { const k = k0 + (k1 - k0) * v; return [zAt(u) / 2, -(H.sheer(u) - H.keel(u)) * k / 2]; }, side > 0), { uv: 'keep' });
  if (H.transom && H.beam(0) > 0.05) {
    const N = 16, ring = [];
    for (let j = 0; j <= N; j++) { const k = j / N; ring.push([H.beam(0) * H.prof(k), H.sheer(0) - (H.sheer(0) - H.keel(0)) * k]); }
    const all = [...ring, ...ring.slice(0, -1).reverse().map(([x, y]) => [-x, y])], pts = [[0, (H.sheer(0) + H.keel(0)) / 2, H.L / 2]], idx = [];
    all.forEach(([x, y]) => pts.push([x, y, H.L / 2]));
    for (let i = 1; i < all.length; i++) idx.push(0, i + 1, i);
    idx.push(0, 1, all.length);
    P.add(H.transom, tris(pts, idx));
  }
  if (H.inner) for (const side of [1, -1]) {
    P.add(H.wall, surf(ns, 1, (u, v) => [side * H.inner(u), v ? H.deckAt(u) - 0.05 : H.sheer(u), zAt(u)], (u, v) => [zAt(u) / 2, v * 0.6], side < 0), { uv: 'keep' });
    P.add(H.cap, surf(ns, 1, (u, v) => [side * (v ? H.inner(u) - 0.05 : H.beam(u) + 0.06), H.sheer(u) + 0.12, zAt(u)], (u, v) => [zAt(u) / 2, v * 0.2], side < 0), { uv: 'keep' });
  }
  for (const [mat, s0, s1, y] of H.decks || []) P.add(mat, surf(Math.max(2, Math.ceil((s1 - s0) * ns)), 1, (u, v) => {
    const s = s0 + (s1 - s0) * u; return [(v * 2 - 1) * H.inner(s), y, zAt(s)];
  }, (u, v) => { const s = s0 + (s1 - s0) * u; return [zAt(s) / 2, (v * 2 - 1) * H.inner(s) / 2]; }, true), { uv: 'keep' });
}

/** A prism: polygon pts [[x, y, z], ...] (convex) as the top face, dropped by t. */
export function slab(pts, t) {
  const n = pts.length, all = [...pts, ...pts.map(([x, y, z]) => [x, y - t, z])], idx = [];
  const area = pts.reduce((a, p, i) => { const q = pts[(i + 1) % n]; return a + (p[2] * q[0] - p[0] * q[2]); }, 0);
  const ccw = area > 0;                                  // counter-clockwise seen from +Y
  for (let i = 1; i < n - 1; i++) ccw ? idx.push(0, i, i + 1, n, n + i + 1, n + i) : idx.push(0, i + 1, i, n, n + i, n + i + 1);
  for (let i = 0; i < n; i++) { const j = (i + 1) % n; ccw ? idx.push(i, n + i, j, j, n + i, n + j) : idx.push(i, j, n + i, j, n + j, n + i); }
  return tris(all, idx);
}

/** A boarding ramp hinged at the origin, reaching out along +x (side = -1 mirrors it). userData.set(f): 0 up, 1 down. */
export function ramp(M, mat, len, w, side) {
  const g = new THREE.Group(), P = new Parts(M);
  P.add(mat, box(len, 0.16, w, side * len / 2, 0, 0));
  for (let i = 0.4; i < len; i += 0.5) P.add('iron', box(0.08, 0.08, w + 0.04, side * i, 0.1, 0));
  for (const dz of [-w / 2, w / 2]) P.add('iron', box(len, 0.1, 0.1, side * len / 2, 0.06, dz));
  for (const dz of [-w / 2 + 0.2, w / 2 - 0.2]) P.add('iron', new THREE.ConeGeometry(0.12, 0.4, 5).translate(side * (len + 0.05), -0.2, dz));
  g.add(P.build('ramp'));
  g.userData.set = (f) => { g.rotation.z = side * (Math.PI / 2 * (1 - f) - 0.1 * f); };
  g.userData.set(0);
  return g;
}

/** An additive engine plume pointing along +Z from the origin: white-hot core to the given colour, flickering. */
export function plume(r, len, color = 0xa24dff) {
  const g = new THREE.CylinderGeometry(r, r * 0.3, len, 16, 6, true).rotateX(Math.PI / 2).translate(0, 0, len / 2);
  const mat = new THREE.ShaderMaterial({
    uniforms: { t: { value: 0 }, c: { value: new THREE.Color(color) }, len: { value: len } },
    vertexShader: 'varying float f; uniform float len; void main(){ f = position.z / len; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'varying float f; uniform float t; uniform vec3 c; void main(){ float a = pow(1.0 - f, 1.6) * (0.75 + 0.25 * sin(t * 40.0 + f * 18.0)); gl_FragColor = vec4(mix(vec3(1.0), c, smoothstep(0.0, 0.45, f)) * a, a); }',
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
  const m = new THREE.Mesh(g, mat); m.name = 'plume';
  m.userData.update = (t) => { mat.uniforms.t.value = t; m.scale.z = 0.9 + 0.12 * Math.sin(t * 23) + 0.06 * Math.sin(t * 57); };
  return m;
}

/** Smoke or steam puffs rising from p and trailing aft (+Z): soft sprites on a loop. tint: [core, edge] css colours. */
export function smoke(p, n = 7, tint = ['#5a5560', '#4a4550'], rise = 2.6, size = 1) {
  const c = document.createElement('canvas'); c.width = c.height = 32; const x = c.getContext('2d');
  const g = x.createRadialGradient(16, 16, 0, 16, 16, 16); g.addColorStop(0, tint[0]); g.addColorStop(0.6, tint[1] + 'aa'); g.addColorStop(1, tint[1] + '00');
  x.fillStyle = g; x.fillRect(0, 0, 32, 32);
  const tex = new THREE.CanvasTexture(c), grp = new THREE.Group(), puffs = [];
  for (let i = 0; i < n; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    grp.add(s); puffs.push(s);
  }
  const ph = Math.random() * 10;
  return { grp, update: (t) => puffs.forEach((s, i) => {
    const f = (t * 0.45 + ph + i / n) % 1;
    s.position.set(p[0] + Math.sin(i * 7 + t) * 0.2 * f, p[1] + f * rise, p[2] + f * f * 5);
    s.scale.setScalar((0.6 + f * 2.2) * size); s.material.opacity = 0.75 * (1 - f) * Math.min(1, f * 6);
  }) };
}
