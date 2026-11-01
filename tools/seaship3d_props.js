// Small set pieces for the Pirate Seas (docs/PIRATE_SEAS.md): things that float, and the reef the Wreckers fight on.
//   mine     - a horned iron sea mine on a chain to its sinker, a red tell-tale lamp blinking on top
//   flotsam  - planks, barrels, a crate, a broken spar with a rag of sail, all bobbing apart
//   buoy     - a Lampwarden bell buoy: a verdigris float, a cage, a swinging bell, a green lamp
//   keg      - a floating powder keg, its fuse lit
//   torpedo  - a brass steampunk torpedo: ogive nose with an arming vane, cruciform fins, contra-rotating screws
//   wreck    - a broken mast and its rigging standing out of the sea, rags of sail, a lantern still burning
//   reef     - the Wreckers' Reef (about 40 x 24): wet rock shelves (0.7-1.45, above the day swell), a high middle shelf and ledges
//              joined by rock steps, a beached wreck heeled over with a walkable deck and its ribs bared, and three
//              wreckers' false lamps burning a sickly Lampwarden green ("They moved the lights")
// buildProp(M, kind) -> { root, anim(t, dt), info } (the reef adds setLamp(i, on) and lampOn(i)). info.waterline = 0: y = 0 is the sea surface. info.fixed: the piece
// is grounded (does not ride the swell). The reef adds info.walk = [[x0, z0, x1, z1, y], ...] (walkable rectangles, y
// the floor; overlapping rects share their floor) and info.lamps = [[x, y, z], ...] (the false fires: 0 east rock, 1 west
// rock, 2 the wreck's stem), info.cover = [[x, z, r, h], ...] (boulders, the anchor, the lamp masts).
import * as THREE from 'three';
import { Parts, box, rod, surf, tris, flag, sm, smoke, seaHull, triSail, lines, lamp, skullPlate, deckCannon, finish, lerp, clamp, TAU } from './seaship3d.js';
import { smallMaterials, chain, sag, coil, place } from './seaship3d_small.js';

export const PROP_KINDS = ['mine', 'flotsam', 'buoy', 'keg', 'torpedo', 'wreck', 'reef'];
const rng = (seed) => { let r = seed % 2147483647 || 1; return () => (r = (r * 16807) % 2147483647) / 2147483647; };

// ------------------------------------------------------------------ wet rock (pixel art, made on a canvas)
function rockTex(seed, pal, { cracks: cracks0 = 26, dots: dots0 = 60, dotCol = '#a7a596', weed: weed0 = 0, cells = 12, S = 3 } = {}) {
  let cracks = cracks0, dots = dots0, weed = weed0;
  const N = 160 * S, c = document.createElement('canvas'); c.width = c.height = N; const x = c.getContext('2d'), img = x.createImageData(N, N), R = rng(seed);
  const lat = (n) => { const a = new Float32Array(n * n); for (let i = 0; i < a.length; i++) a[i] = R(); return a; };
  const oct = [[4 * S, 0.4, lat(4 * S)], [8 * S, 0.27, lat(8 * S)], [16 * S, 0.18, lat(16 * S)], [32 * S, 0.15, lat(32 * S)]];
  const noise = (px, py) => {
    let v = 0;
    for (const [n, w, L] of oct) {
      const fx = px / N * n, fy = py / N * n, ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy, sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
      const g = (i, j) => L[((j % n + n) % n) * n + ((i % n + n) % n)];
      v += w * lerp(lerp(g(ix, iy), g(ix + 1, iy), sx), lerp(g(ix, iy + 1), g(ix + 1, iy + 1), sx), sy);
    }
    return v;
  };
  const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)], P = pal.map(hex);
  const put = (i, j, col) => { const k = (((j + N) % N) * N + ((i + N) % N)) * 4; img.data[k] = col[0]; img.data[k + 1] = col[1]; img.data[k + 2] = col[2]; img.data[k + 3] = 255; };
  // chunky rock plates (wrapped Voronoi cells): a tone per plate, lit along its upper lip, dark seams between plates
  const C = Array.from({ length: cells }, () => [R() * N, R() * N, R()]);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    let d1 = 1e9, d2 = 1e9, c1 = C[0];
    for (const c of C) { let dx = Math.abs(i - c[0]), dy = Math.abs(j - c[1]); dx = Math.min(dx, N - dx); dy = Math.min(dy, N - dy); const d = Math.hypot(dx, dy); if (d < d1) { d2 = d1; d1 = d; c1 = c; } else if (d < d2) d2 = d; }
    let dy = j - c1[1]; if (dy > N / 2) dy -= N; if (dy < -N / 2) dy += N;
    const dth = ((i * 7 + j * 13) % 4) / 4 * 0.08;
    let v = 0.22 + c1[2] * 0.4 + (noise(i, j) - 0.5) * 0.9 + dth;
    if (d2 - d1 < 1.4 && c1[2] > 0.3) v = 0.02; else if (d2 - d1 < 2.6 && c1[2] > 0.3) v += dy < 0 ? 0.12 : -0.12;
    put(i, j, P[clamp(Math.floor(v * P.length), 0, P.length - 1)]);
  }
  cracks *= S * S; dots *= S * S; weed *= S * S;
  for (let k = 0; k < cracks; k++) {                                           // cracks: a dark line lit on one lip
    let i = Math.floor(R() * N), j = Math.floor(R() * N), di = R() < 0.5 ? 1 : -1;
    for (let s = 0, n = 8 + R() * 30; s < n; s++) { put(i, j, P[0]); put(i, j + 1, P[Math.min(P.length - 1, 4)]); if (R() < 0.6) i += di; else j += R() < 0.5 ? 1 : -1; }
  }
  const dc = hex(dotCol);
  for (let k = 0; k < dots; k++) {                                             // barnacles / limpets
    const i = Math.floor(R() * N), j = Math.floor(R() * N), n = 1 + Math.floor(R() * 4);
    for (let q = 0; q < n; q++) { const a = i + Math.floor(R() * 4), b = j + Math.floor(R() * 3); put(a, b, dc); put(a, b + 1, P[0]); }
  }
  for (let k = 0; k < weed; k++) {                                             // weed strands hanging down
    const i = Math.floor(R() * N), j = Math.floor(R() * N), col = P[P.length - 1 - Math.floor(R() * 2)];
    for (let s = 0, n = 3 + R() * 9; s < n; s++) put(i + (s % 3 === 2 ? 1 : 0), j + s, col);
  }
  x.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.NearestFilter; t.anisotropy = 8; t.colorSpace = THREE.SRGBColorSpace;
  t.repeat.set(1 / S, 1 / S);                                                  // 80 px a unit, like the pack, over S times the area
  return t;
}
/** The reef's materials, added to M once: wet rock tops, dark sides, the wet and weed bands, pools, barnacles, the false fires' sickly green. */
export function reefMaterials(M) {
  smallMaterials(M);
  if (M.reefTop) return M;
  const mk = (t, o) => new THREE.MeshStandardMaterial({ map: t, bumpMap: t, bumpScale: 1.4, ...o });
  M.reefTop = mk(rockTex(11, ['#0c0e10', '#171b1e', '#22282b', '#2d3436', '#3a4241', '#4a5250', '#5c6460', '#727a70']), { roughness: 0.4, metalness: 0.15 });
  M.reefRock = mk(rockTex(23, ['#08090b', '#101316', '#181d20', '#21282b', '#2b3335', '#38403f'], { cracks: 40, dots: 30, cells: 9 }), { roughness: 0.5, metalness: 0.1 });
  M.reefWeed = mk(rockTex(37, ['#0a0d09', '#11170e', '#182112', '#1f2a15', '#283418', '#323d1a', '#3e4620'], { cracks: 10, dots: 25, dotCol: '#6a6a58', weed: 160, cells: 14 }), { roughness: 0.5, metalness: 0.08 });
  M.tidePool = new THREE.MeshStandardMaterial({ color: 0x1a3a46, roughness: 0.06, metalness: 0.4 });
  M.reefWet = mk(rockTex(41, ['#050607', '#0a0c0e', '#101417', '#161b1e', '#1d2428'], { cracks: 20, dots: 10, cells: 8 }), { roughness: 0.1, metalness: 0.3 });
  M.barnacle = new THREE.MeshStandardMaterial({ color: 0xbab4a2, roughness: 0.85, flatShading: true });
  M.sickly = new THREE.MeshStandardMaterial({ color: 0xd8ff9a, emissive: 0x7cf038, emissiveIntensity: 2.4, roughness: 0.6 });
  return M;
}

// ------------------------------------------------------------------ the props
export function buildProp(M, kind) {
  smallMaterials(M);
  const f = { mine, flotsam, buoy, keg, torpedo, wreck, reef }[kind];
  if (!f) throw new Error(`unknown prop ${kind}`);
  const p = f(M);
  p.root.name = kind; finish(p.root);
  p.root.traverse((o) => { if (o.userData.noShadow) o.castShadow = o.receiveShadow = false; });
  p.info = { waterline: 0, glow: [], crew: [], ...p.info };
  return p;
}

function mine(M) {
  const root = new THREE.Group(), bob = new THREE.Group(), P = new Parts(M), r = 0.62, yc = 0.12;
  P.add('flaked', new THREE.SphereGeometry(r, 18, 12).translate(0, yc, 0));
  P.add('brass', new THREE.TorusGeometry(r * 1.005, 0.06, 5, 24).rotateX(Math.PI / 2).translate(0, yc, 0));
  P.add('iron', new THREE.TorusGeometry(r * 0.86, 0.035, 4, 24).rotateX(Math.PI / 2).translate(0, yc + r * 0.5, 0));
  for (let i = 0; i < 24; i++) { const a = i / 24 * TAU; P.add('iron', new THREE.SphereGeometry(0.025, 4, 3).translate(Math.cos(a) * r * 1.05, yc + 0.06, Math.sin(a) * r * 1.05)); }
  const horns = [];
  for (let i = 0; i < 6; i++) horns.push([i / 6 * TAU + 0.3, 0.35]);
  for (let i = 0; i < 3; i++) horns.push([i / 3 * TAU, 1.05]);
  horns.push([0, Math.PI / 2]);
  for (const [a, el] of horns) {                         // Hertz horns: a lead sleeve over a glass vial of acid
    const d = new THREE.Vector3(Math.cos(el) * Math.cos(a), Math.sin(el), Math.cos(el) * Math.sin(a)), b = d.clone().multiplyScalar(r * 0.92).add(new THREE.Vector3(0, yc, 0)), e = d.clone().multiplyScalar(r + 0.28).add(new THREE.Vector3(0, yc, 0));
    P.add('iron', rod(b.toArray(), e.toArray(), 0.07, 0.055, 6));
    P.add('brass', new THREE.SphereGeometry(0.075, 6, 4).translate(e.x, e.y, e.z));
  }
  for (const s of [-1, 1]) skullPlate(P, s * (r - 0.06), yc - 0.08, 0, s, 0.32, 'redPaint');
  P.add('iron', rod([0, yc - r + 0.02, 0], [0, yc - r - 0.15, 0], 0.08, 0.06, 6));
  P.add('iron', new THREE.TorusGeometry(0.08, 0.025, 4, 8).translate(0, yc - r - 0.22, 0));
  chain(P, 'iron', [[0, yc - r - 0.28, 0], [0.15, -1.8, 0.05], [0.05, -3.25, 0]], 0.2, 0.03);
  P.add('iron', new THREE.CylinderGeometry(0.45, 0.55, 0.42, 10).translate(0.05, -3.5, 0));            // the sinker
  for (let i = 0; i < 4; i++) P.add('flaked', box(0.08, 0.36, 1.3, 0.05, -3.5, 0, i * Math.PI / 4));
  bob.add(P.build('mine'));
  const tell = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 6, 0, TAU, 0, Math.PI / 1.7), M.redGlass.clone()); tell.position.set(0, yc + r + 0.3, 0); bob.add(tell);
  bob.scale.setScalar(0.62); root.add(bob);
  const glow = [{ x: 0, y: (yc + r + 0.36) * 0.62, z: 0, r: 0.8, c: 0xff2a1a }];
  return { root, info: { length: 1.05, beam: 1.05, hl: 0.5, hb: 0.5, glow }, anim(t) {
    bob.position.y = 0.05 * Math.sin(t * 1.3); bob.rotation.z = 0.06 * Math.sin(t * 0.9); bob.rotation.x = 0.05 * Math.sin(t * 1.1 + 1); bob.rotation.y = 0.05 * t;
    tell.material.emissiveIntensity = Math.sin(t * 3) > 0.3 ? 3.2 : 0.15;
  } };
}

function flotsam(M) {
  const root = new THREE.Group(), R = rng(7), pieces = [];
  const piece = (x, z, ry, sink, build) => {
    const g = new THREE.Group(), P = new Parts(M); build(P); g.add(P.build('flotsam'));
    g.position.set(x, -sink, z); g.rotation.y = ry; root.add(g); pieces.push({ g, x, z, ry, sink, ph: R() * 6, k: 0.6 + R() * 0.6 });
  };
  for (const [x, z, ry, m, l] of [[-1.2, 0.6, 0.4, 'cypress', 2.2], [0.6, 1.5, 1.9, 'scorched', 1.8], [1.9, -0.7, 0.9, 'mossed', 2.6], [-0.4, -1.6, 2.6, 'greyboards', 1.5], [-2.3, -0.8, 1.2, 'cypress', 1.4]]) {
    piece(x, z, ry, 0.03, (P) => { P.add(m, box(l, 0.11, 0.36, 0, 0, 0)); for (const dx of [-l * 0.35, l * 0.3]) P.add('iron', new THREE.SphereGeometry(0.03, 4, 3).translate(dx, 0.06, 0.1)); });
  }
  piece(1.3, -0.55, 0.3, 0.02, (P) => { P.add('cypress', box(2.0, 0.11, 0.36, 0, 0, -0.2)); P.add('cypress', box(1.6, 0.11, 0.36, 0.1, 0, 0.2)); P.add('blackwood', box(0.12, 0.08, 0.8, -0.5, 0.08, 0)); P.add('blackwood', box(0.12, 0.08, 0.8, 0.6, 0.08, 0)); });
  const barrel = (P, upright) => {
    const g = new THREE.CylinderGeometry(0.3, 0.3, 0.85, 12); const bulge = g.attributes.position; for (let i = 0; i < bulge.count; i++) { const y = bulge.getY(i), k = 1 + 0.12 * (1 - (y / 0.425) ** 2); bulge.setX(i, bulge.getX(i) * k); bulge.setZ(i, bulge.getZ(i) * k); } g.computeVertexNormals();
    const hoops = [-0.3, 0.3].map((y) => new THREE.TorusGeometry(0.33, 0.025, 4, 14).rotateX(Math.PI / 2).translate(0, y, 0));
    for (const h of [g, ...hoops]) { if (!upright) h.rotateZ(Math.PI / 2); P.add(h === g ? 'cedar' : 'iron', h, h === g ? { swap: true } : undefined); }
  };
  piece(-0.2, 0.2, 0.7, 0.12, (P) => barrel(P, false));
  piece(2.4, 1.2, 2.2, 0.15, (P) => barrel(P, false));
  piece(-1.9, 1.6, 0, 0.25, (P) => barrel(P, true));
  piece(0.4, -2.3, 0.5, 0.2, (P) => { const g = box(0.8, 0.8, 0.8, 0, 0, 0); g.rotateX(0.25); g.rotateZ(0.18); P.add('endgrain', g); for (const y of [-0.3, 0.3]) { const b = box(0.84, 0.07, 0.84, 0, y, 0); b.rotateX(0.25); b.rotateZ(0.18); P.add('iron', b); } });
  piece(-0.8, -0.3, -0.5, 0.05, (P) => {                 // the broken spar with a rag of sail and its lines
    P.add('cedar', rod([-2.2, 0, 0], [1.5, 0.05, 0], 0.17, 0.14, 8), { swap: true });
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; P.add('endgrain', new THREE.ConeGeometry(0.05, 0.3 + (i % 3) * 0.12, 4).rotateZ(-Math.PI / 2).translate(1.6 + (i % 3) * 0.06, 0.05 + Math.sin(a) * 0.09, Math.cos(a) * 0.09)); }
    P.add('iron', rod([-1.2, 0, 0], [-1.05, 0, 0], 0.19, 0.19, 8));
    P.add('patched', surf(8, 4, (u, v) => [-1.9 + u * 2.4, -0.02 - v * 0.05 + Math.sin(u * 7) * 0.04, 0.15 + v * (1.0 + 0.4 * Math.sin(u * 9)) + Math.sin(v * 5 + u * 3) * 0.1], (u, v) => [u * 1.2, v * 0.6]), { uv: 'keep' });
    coil(P, 0.6, 0.1, -0.4, 0.22, 2);
  });
  const ropes = lines([[-2.6, 0.02, -0.5], [-3.4, 0.0, -1.3], [-3.4, 0.0, -1.3], [-4.1, -0.05, -1.1], [0.6, 0.02, -0.8], [1.2, 0.0, -1.7]], M.rope);
  root.add(ropes); root.scale.setScalar(1.3);
  return { root, info: { length: 7.8, beam: 6.5, hl: 3.4, hb: 2.9 }, anim(t) {
    for (const p of pieces) {
      p.g.position.y = -p.sink + 0.04 * Math.sin(t * 1.4 * p.k + p.ph);
      p.g.rotation.x = 0.05 * Math.sin(t * 1.1 * p.k + p.ph); p.g.rotation.z = 0.05 * Math.sin(t * 0.9 * p.k + p.ph * 2);
      p.g.rotation.y = p.ry + 0.08 * Math.sin(t * 0.13 + p.ph);
      p.g.position.x = p.x + 0.12 * Math.sin(t * 0.17 + p.ph); p.g.position.z = p.z + 0.12 * Math.cos(t * 0.15 + p.ph);
    }
  } };
}

function buoy(M) {
  const root = new THREE.Group(), body = new THREE.Group(), P = new Parts(M);
  const prof = [[0.05, -1.0], [0.45, -0.85], [0.85, -0.45], [1.0, -0.1], [1.0, 0.25], [0.92, 0.4], [0.3, 0.42]].map(([r, y]) => new THREE.Vector2(r, y));
  P.add('copper', new THREE.LatheGeometry(prof, 16));
  P.add('whitewood', new THREE.CylinderGeometry(1.012, 1.012, 0.2, 16, 1, true).translate(0, 0.1, 0));
  P.add('iron', new THREE.TorusGeometry(1.02, 0.05, 4, 20).rotateX(Math.PI / 2).translate(0, 0.25, 0));
  P.add('iron', new THREE.TorusGeometry(1.02, 0.05, 4, 20).rotateX(Math.PI / 2).translate(0, -0.08, 0));
  P.add('iron', new THREE.CylinderGeometry(0.92, 0.92, 0.06, 16).translate(0, 0.42, 0));
  for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; P.add('iron', new THREE.SphereGeometry(0.03, 4, 3).translate(Math.cos(a) * 1.03, 0.36, Math.sin(a) * 1.03)); }
  P.add('iron', rod([0, -1.0, 0], [0, -2.4, 0], 0.07, 0.07, 6)); P.add('iron', new THREE.SphereGeometry(0.28, 8, 6).translate(0, -2.5, 0));   // ballast pendulum
  // the cage: four legs to a ring, braces, a crossbar for the bell, the lamp on top
  const H = 2.7, legs = [0, 1, 2, 3].map((i) => i / 4 * TAU + Math.PI / 4);
  for (const a of legs) {
    P.add('iron', rod([Math.cos(a) * 0.72, 0.42, Math.sin(a) * 0.72], [Math.cos(a) * 0.24, H, Math.sin(a) * 0.24], 0.055, 0.045, 6));
    P.add('iron', box(0.2, 0.08, 0.2, Math.cos(a) * 0.72, 0.46, Math.sin(a) * 0.72));
  }
  for (const [y, rr] of [[1.25, 0.54], [2.25, 0.33], [H, 0.24]]) P.add('iron', new THREE.TorusGeometry(rr, 0.035, 4, 16).rotateX(Math.PI / 2).translate(0, y, 0));
  for (let i = 0; i < 4; i++) { const a0 = legs[i], a1 = legs[(i + 1) % 4]; P.add('iron', rod([Math.cos(a0) * 0.6, 0.85, Math.sin(a0) * 0.6], [Math.cos(a1) * 0.42, 1.75, Math.sin(a1) * 0.42], 0.025, 0.025, 4)); }
  P.add('iron', rod([-0.3, 2.3, 0], [0.3, 2.3, 0], 0.04, 0.04, 6));
  // the Ninth Bell's mark: a bronze plate with nine studs, on the float
  for (const s of [1, -1]) { P.add('bronze', box(0.05, 0.3, 0.42, s * 0.99, 0.1, 0)); for (let i = 0; i < 9; i++) P.add('goldHammer', new THREE.SphereGeometry(0.025, 4, 3).translate(s * 1.02, 0.02 + Math.floor(i / 3) * 0.08, -0.08 + (i % 3) * 0.08)); }
  P.add('iron', new THREE.CylinderGeometry(0.2, 0.24, 0.08, 10).translate(0, H + 0.04, 0));
  for (let i = 0; i < 4; i++) { const a = i / 4 * TAU; P.add('iron', rod([Math.cos(a) * 0.15, H + 0.08, Math.sin(a) * 0.15], [Math.cos(a) * 0.15, H + 0.5, Math.sin(a) * 0.15], 0.018, 0.018, 4)); }
  P.add('greenGlass', new THREE.CylinderGeometry(0.12, 0.12, 0.38, 10).translate(0, H + 0.28, 0));
  P.add('iron', new THREE.ConeGeometry(0.25, 0.24, 10).translate(0, H + 0.6, 0));
  P.add('bronze', new THREE.TorusGeometry(0.07, 0.02, 4, 8).translate(0, H + 0.76, 0));
  body.add(P.build('buoy'));
  const bell = new THREE.Group(); bell.position.set(0, 2.3, 0);
  {
    const B = new Parts(M), bp = [[0.0, 0], [0.12, -0.02], [0.16, -0.12], [0.2, -0.32], [0.3, -0.5], [0.34, -0.56], [0.3, -0.57]].map(([r, y]) => new THREE.Vector2(r, y));
    B.add('bronze', new THREE.LatheGeometry(bp, 14));
    B.add('bronze', new THREE.LatheGeometry(bp.map((v) => new THREE.Vector2(Math.max(0.001, v.x - 0.03), v.y)).reverse(), 14));
    B.add('goldHammer', new THREE.TorusGeometry(0.31, 0.02, 4, 16).rotateX(Math.PI / 2).translate(0, -0.48, 0));
    B.add('iron', new THREE.TorusGeometry(0.05, 0.02, 4, 8).translate(0, 0.02, 0));
    bell.add(B.build('bell'));
  }
  const clapper = new THREE.Group(); { const C = new Parts(M); C.add('iron', rod([0, 0, 0], [0, -0.45, 0], 0.02, 0.02, 4)); C.add('iron', new THREE.SphereGeometry(0.06, 6, 4).translate(0, -0.47, 0)); clapper.add(C.build('clapper')); }
  clapper.position.set(0, -0.05, 0); bell.add(clapper); body.add(bell);
  root.add(body);
  const glow = [{ x: 0, y: H + 0.28, z: 0, r: 2.4, c: 0x50ff80, light: true, lr: 7 }];
  return { root, info: { length: 2, beam: 2, hl: 1, hb: 1, glow }, anim(t) {
    body.position.y = 0.08 * Math.sin(t * 1.2); body.rotation.z = 0.09 * Math.sin(t * 0.9); body.rotation.x = 0.06 * Math.sin(t * 0.7 + 1.3);
    const sw = 0.32 * Math.sin(t * 1.8); bell.rotation.z = sw - body.rotation.z * 0.6; clapper.rotation.z = 0.5 * Math.sin(t * 1.8 - 0.9) - sw * 0.6;
  } };
}

function keg(M) {
  const root = new THREE.Group(), body = new THREE.Group(), P = new Parts(M);
  const g = new THREE.CylinderGeometry(0.42, 0.42, 1.1, 14, 4); const a = g.attributes.position;
  for (let i = 0; i < a.count; i++) { const y = a.getY(i), k = 1 + 0.15 * (1 - (y / 0.55) ** 2); a.setX(i, a.getX(i) * k); a.setZ(i, a.getZ(i) * k); } g.computeVertexNormals();
  P.add('blackwood', g, { swap: true });
  for (const y of [-0.46, -0.3, 0.3, 0.46]) P.add('iron', new THREE.TorusGeometry(0.42 * (1 + 0.15 * (1 - (y / 0.55) ** 2)) + 0.012, 0.025, 4, 16).rotateX(Math.PI / 2).translate(0, y, 0));
  P.add('endgrain', new THREE.CircleGeometry(0.4, 14).rotateX(-Math.PI / 2).translate(0, 0.552, 0));
  P.add('iron', new THREE.CylinderGeometry(0.07, 0.07, 0.06, 8).translate(0.12, 0.58, 0.05));
  for (const sd of [1, -1]) P.add('redPaint', place(box(0.04, 0.52, 0.11, 0, 0, 0), [0.49, 0.0, sd * 0.11], sd * 0.42, 0, 0));
  P.add('boneWhite', new THREE.SphereGeometry(0.07, 6, 4).scale(0.4, 1, 1).translate(0.49, 0.32, 0));
  const fuse = [[0.12, 0.6, 0.05], [0.14, 0.78, 0.0], [0.24, 0.9, -0.06], [0.36, 0.92, -0.02], [0.42, 0.86, 0.06]];
  for (let i = 0; i < fuse.length - 1; i++) P.add('hemp', rod(fuse[i], fuse[i + 1], 0.022, 0.02, 5));
  body.add(P.build('keg'));
  const spark = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 4), M.ember.clone()); spark.position.set(0.43, 0.85, 0.07); body.add(spark);
  const sparks = [];
  for (let i = 0; i < 6; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.018, 4, 3), M.lamp); s.userData.noShadow = true; body.add(s); sparks.push(s); }
  const puff = smoke([0.43, 0.9, 0.07], 6, ['#8a8288', '#6a6268'], 1.4, 0.35); body.add(puff.grp);
  body.position.y = -0.05; body.rotation.set(0.2, 0.6, 0.32); body.scale.setScalar(1.3); root.add(body);
  const glow = [{ x: 0.5, y: 1.1, z: 0.1, r: 0.9, c: 0xff8a20 }];
  return { root, info: { length: 1.6, beam: 1.6, hl: 0.7, hb: 0.7, glow }, anim(t) {
    body.position.y = -0.05 + 0.05 * Math.sin(t * 1.5); body.rotation.x = 0.2 + 0.08 * Math.sin(t * 1.1); body.rotation.z = 0.32 + 0.07 * Math.sin(t * 0.8);
    spark.scale.setScalar(0.8 + 0.5 * Math.abs(Math.sin(t * 23)) + 0.3 * Math.sin(t * 57));
    sparks.forEach((s, i) => { const f = (t * 2.2 + i / sparks.length) % 1, a = i * 2.4 + Math.floor(t * 2.2 + i / sparks.length) * 1.7; s.position.set(0.43 + Math.cos(a) * f * 0.35, 0.85 + f * 0.3 - f * f * 0.5, 0.07 + Math.sin(a) * f * 0.35); s.visible = f < 0.8; });
    puff.update(t);
  } };
}

function torpedo(M) {
  const root = new THREE.Group(), body = new THREE.Group(), P = new Parts(M), r = 0.27, Lb = 3.4;
  // lathe along Y, then laid along Z with the nose toward -Z
  const pr = [[0.001, 0], [0.12, 0.06], [0.2, 0.18], [0.25, 0.35], r, r, [0.22, 2.9], [0.12, 3.3], [0.05, 3.4]];
  const prof = pr.map((p, i) => Array.isArray(p) ? new THREE.Vector2(p[0], p[1]) : new THREE.Vector2(p, i === 4 ? 0.55 : 2.55));
  const lay = (g) => g.rotateX(Math.PI / 2).translate(0, 0, -Lb / 2);         // y 0..Lb -> z -Lb/2 .. +Lb/2 (nose at -Z)
  const nose = prof.slice(0, 5), mid = prof.slice(4, 6), tail = prof.slice(5);
  P.add('gunmetal', lay(new THREE.LatheGeometry(nose, 16)));
  P.add('brass', lay(new THREE.LatheGeometry(mid, 16)));
  P.add('copper', lay(new THREE.LatheGeometry(tail, 16)));
  for (const y of [0.55, 1.2, 1.9, 2.55]) P.add('bronze', lay(new THREE.TorusGeometry(r + 0.01, 0.025, 4, 18).rotateX(Math.PI / 2).translate(0, y, 0)));
  for (const y of [0.62, 1.27, 1.97]) for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; P.add('goldHammer', lay(new THREE.SphereGeometry(0.018, 4, 3).translate(Math.cos(a) * (r + 0.005), y, Math.sin(a) * (r + 0.005)))); }
  // an inspection port on the back with the aether gyroscope glowing through it, a lifting eye, a starting lever
  P.add('brass', new THREE.TorusGeometry(0.1, 0.025, 4, 12).rotateX(Math.PI / 2).translate(0, r + 0.005, 0.1));
  P.add('cyan', new THREE.SphereGeometry(0.09, 10, 6, 0, TAU, 0, Math.PI / 2).translate(0, r - 0.02, 0.1));
  P.add('iron', new THREE.TorusGeometry(0.06, 0.018, 4, 8).translate(0, r + 0.06, -0.55));
  P.add('iron', rod([0.18, 0.2, 0.6], [0.26, 0.33, 0.5], 0.018, 0.018, 4));
  // the pistol on the nose, with its arming vane
  P.add('iron', rod([0, 0, -Lb / 2], [0, 0, -Lb / 2 - 0.22], 0.03, 0.025, 6));
  // fins: cruciform, with the rudder and hydroplane flaps
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2;
    const fin = surf(2, 1, (u, v) => [0, lerp(0.12, 0.5, v), lerp(lerp(0.85, 1.55, v), 1.62, u)], (u, v) => [u, v]);
    const g1 = fin.clone();
    for (const gg of [g1, new THREE.BoxGeometry(0.03, 0.36, 0.72).translate(0, 0.32, 1.27)]) { gg.rotateZ(a); P.add('brass', gg); }
    P.add('bronze', new THREE.BoxGeometry(0.035, 0.36, 0.14).translate(0, 0.32, 1.67).rotateZ(a));
  }
  P.add('iron', rod([0, 0, Lb / 2 - 0.1], [0, 0, Lb / 2 + 0.5], 0.04, 0.04, 6));
  body.add(P.build('torpedo'));
  const screw = (z, n, dir, mat) => {
    const g = new THREE.Group(), S = new Parts(M); g.position.set(0, 0, z);
    S.add('bronze', new THREE.SphereGeometry(0.06, 6, 4));
    for (let i = 0; i < n; i++) { const b = new THREE.BoxGeometry(0.1, 0.24, 0.02), pos = b.attributes.position; for (let v = 0; v < pos.count; v++) { pos.setZ(v, pos.getZ(v) + pos.getX(v) * 0.5 * dir); pos.setY(v, pos.getY(v) + 0.14); } b.computeVertexNormals(); b.rotateZ(i / n * TAU); S.add(mat, b); }
    g.add(S.build('screw')); body.add(g); return g;
  };
  const s1 = screw(Lb / 2 + 0.22, 4, 1, 'brass'), s2 = screw(Lb / 2 + 0.42, 3, -1, 'bronze');
  const vane = screw(-Lb / 2 - 0.22, 2, 1, 'brass'); vane.scale.setScalar(0.6);
  const steam = smoke([0, 0.05, Lb / 2 + 0.6], 7, ['#eef6f8', '#d8e8ee'], 0.7, 0.45); body.add(steam.grp);
  body.position.y = -0.1; root.add(body);
  const glow = [{ x: 0, y: r + 0.05, z: 0.1, r: 0.7, c: 0x5fd8ff }];
  return { root, info: { length: Lb + 0.8, beam: 0.8, hl: 1.9, hb: 0.35, glow }, anim(t, dt) {
    s1.rotation.z += 20 * dt; s2.rotation.z -= 20 * dt; vane.rotation.z += 6 * dt;
    body.position.y = -0.1 + 0.03 * Math.sin(t * 2.1); body.rotation.x = 0.03 * Math.sin(t * 1.3);
    steam.update(t);
  } };
}

function wreck(M) {
  const root = new THREE.Group(), P = new Parts(M), waves = [], rags = [];
  const base = [0, -3, 0.6], top = [-0.9, 7.2, -1.6];
  const at = (t) => [0, 1, 2].map((i) => lerp(base[i], top[i], t));
  P.add('cedar', rod(base, at(0.97), 0.3, 0.2, 10), { swap: true });
  P.add('reefWeed' in M ? 'reefWeed' : 'mossed', rod(at(0.18), at(0.33), 0.32, 0.31, 10));
  for (const t of [0.42, 0.58, 0.74]) P.add('iron', rod(at(t), at(t + 0.015), 0.29 - t * 0.1, 0.29 - t * 0.1, 10));
  const tip = at(0.97);
  for (let i = 0; i < 7; i++) { const a = i / 7 * TAU, h = 0.3 + (i * 37 % 5) * 0.12; P.add('endgrain', new THREE.ConeGeometry(0.07, h, 4).translate(tip[0] + Math.cos(a) * 0.14, tip[1] + h / 2, tip[2] + Math.sin(a) * 0.14)); }
  // the top (platform), knocked askew, and the yard hanging from one sling, one arm in the sea
  const tp = at(0.72);
  P.add('cedar', place(new THREE.CylinderGeometry(1.0, 0.9, 0.14, 12), tp, 0.25, 0, -0.18));
  P.add('iron', place(new THREE.TorusGeometry(1.0, 0.05, 4, 16).rotateX(Math.PI / 2), [tp[0], tp[1] + 0.08, tp[2]], 0.25, 0, -0.18));
  for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; if (i === 2) continue; P.add('blackwood', rod([tp[0] + Math.cos(a) * 0.95, tp[1] + 0.05 + Math.sin(a) * 0.2, tp[2] + Math.sin(a) * 0.95], [tp[0] + Math.cos(a) * 0.95, tp[1] + 0.65 + Math.sin(a) * 0.2, tp[2] + Math.sin(a) * 0.95], 0.04, 0.04, 4)); }
  const y0 = at(0.6), Ya = [y0[0] + 3.4, -0.4, y0[2] + 1.6], Yb = [y0[0] - 2.6, y0[1] + 1.6, y0[2] - 1.0];
  P.add('cedar', rod(Ya, Yb, 0.14, 0.1, 8), { swap: true });
  P.add('iron', rod([Yb[0], Yb[1], Yb[2]], [Yb[0] - 0.12, Yb[1] + 0.05, Yb[2] - 0.05], 0.13, 0.13, 6));
  // rags of black sail hanging off the yard, cut ragged along the bottom
  const rag = (t0, t1, drop, mat, seed) => {
    const R = rng(seed), cuts = Array.from({ length: 9 }, () => 0.35 + R() * 0.65), g = new THREE.PlaneGeometry(1, 1, 8, 6), m = M[mat].clone(); m.side = THREE.DoubleSide;
    const mesh = new THREE.Mesh(g, m); root.add(mesh);
    const A = [0, 1, 2].map((i) => lerp(Ya[i], Yb[i], t0)), B = [0, 1, 2].map((i) => lerp(Ya[i], Yb[i], t1)), ph = R() * 6;
    rags.push((t) => {
      const p = g.attributes.position.array, uv = g.attributes.uv.array;
      for (let i = 0, k = 0; i < p.length; i += 3, k += 2) {
        const u = uv[k], v = 1 - uv[k + 1], cut = cuts[Math.min(8, Math.round(u * 8))], d = v * drop * cut;
        p[i] = lerp(A[0], B[0], u) + Math.sin(t * 2.3 + u * 6 + ph) * 0.12 * v; p[i + 1] = lerp(A[1], B[1], u) - d; p[i + 2] = lerp(A[2], B[2], u) + 0.25 * v + Math.sin(t * 1.7 + u * 5 + v * 3 + ph) * 0.15 * v;
      }
      g.attributes.position.needsUpdate = true; g.computeVertexNormals();
    });
  };
  rag(0.35, 0.62, 2.2, 'blackSail', 3); rag(0.66, 0.9, 1.6, 'patched', 5);
  // a lantern still burning, hung from the yard; the shrouds slack into the sea; a torn flag at the masthead
  const lh = [0, 1, 2].map((i) => lerp(Ya[i], Yb[i], 0.8));
  const lan = new THREE.Group(); lan.position.set(...lh); root.add(lan);
  { const Lp = new Parts(M); Lp.add('iron', rod([0, 0, 0], [0, -0.55, 0], 0.012, 0.012, 3)); const gl = lamp(Lp, 0, -0.95, 0, 0.9, 0xffa040); lan.add(Lp.build('lantern')); lan.userData.g = gl; }
  const shr = [];
  for (const [dx, dz] of [[1.8, 1.6], [2.4, 0.4], [-1.6, 2.2], [-2.6, 0.2], [0.8, -2.6]]) { const a = at(0.68); shr.push(...sag(a, [base[0] + dx * 1.8, -0.1, base[2] + dz * 1.8], 0.5, 6).flatMap((p, i, arr) => i ? [arr[i - 1], p] : [])); }
  for (let k = 1; k < 5; k++) { const a = at(0.68 - k * 0.07); shr.push(a, [a[0] + 0.5 + k * 0.4, a[1] - 0.6 - k * 0.5, a[2] + 0.5 + k * 0.4]); }
  root.add(lines(shr, M.rope));
  const fl = flag(M.jollyRoger, 1.2, 0.7, [tip[0], tip[1] - 0.15, tip[2]], 0.12, 'flag'); waves.push(fl); root.add(fl.mesh);
  // the hull's last showing: a run of rail and the stumps of ribs breaking the surface
  for (let i = 0; i < 7; i++) { const z = -2.4 + i * 0.75, h = 0.5 + ((i * 53) % 7) * 0.12; P.add('blackwood', rod([2.6 - i * 0.05, -0.8, z], [2.75 - i * 0.05, h, z + 0.05], 0.1, 0.07, 6)); }
  P.add('scorched', place(box(0.16, 0.14, 4.6, 0, 0, 0), [2.72, 0.22, 0.0], 0.06, 0, 0.12));
  for (let i = 0; i < 5; i++) { const z = 2.4 + i * 0.7; P.add('blackwood', rod([-2.6, -0.8, z], [-2.9 - i * 0.1, 0.4 + (i % 2) * 0.5, z + 0.2], 0.09, 0.06, 6)); }
  root.add(P.build('wreck'));
  const glow = [{ x: lh[0], y: lh[1] - 0.8, z: lh[2], r: 1.5, c: 0xffa040 }];
  return { root, info: { length: 8, beam: 8, hl: 2.5, hb: 2.5, glow, fixed: true }, anim(t) {
    for (const r of rags) r(t); for (const w of waves) w.update(t);
    lan.rotation.z = 0.12 * Math.sin(t * 1.3); lan.rotation.x = 0.08 * Math.sin(t * 0.9);
  } };
}

// ------------------------------------------------------------------ the Wreckers' Reef
/** A rock shelf over the walk rect (half extents hx, hz) at height y: its rim pushed out by a jagged margin round the
 *  rect (tight on the sides in `tight`, where steps meet it), its sides falling into the sea through a dark wet band and a
 *  weed band. Barnacles and weed gather on the waterline edge, wet streaks on the rim. Returns its outline. */
function shelf(P, cx, cz, hx, hz, y, seed, tight = {}) {
  const R = rng(seed), out = [], C = [[hx, -hz], [hx, hz], [-hx, hz], [-hx, -hz]], Nn = [[1, 0], [0, 1], [-1, 0], [0, -1]], KEY = ['x1', 'z1', 'x0', 'z0'];
  for (let k = 0; k < 4; k++) {
    const a = C[k], b = C[(k + 1) % 4], n = Nn[k], np = Nn[(k + 3) % 4], segs = Math.max(2, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.7));
    for (let i = 0; i < segs; i++) {
      const t = i / segs, tg = tight[KEY[k]] || (i === 0 && tight[KEY[(k + 3) % 4]]), m = tg ? 0.03 + R() * 0.04 : 0.18 + R() * 0.34;
      const [dx, dz] = i === 0 ? [(n[0] + np[0]) * 0.75, (n[1] + np[1]) * 0.75] : n;
      out.push({ x: lerp(a[0], b[0], t) + dx * m, z: lerp(a[1], b[1], t) + dz * m, dx, dz, tg, j: [R(), R(), R(), R()] });
    }
  }
  const N = out.length;
  const ring = (k, ex, yy) => out.map((p) => { const e = p.tg && k === 1 ? 0.04 : ex[0] + p.j[k % 4] * ex[1]; return [cx + p.x + p.dx * e, yy + (k ? (p.j[(k + 1) % 4] - 0.5) * 0.1 : 0), cz + p.z + p.dz * e]; });
  const yw = Math.min(0.16, y - 0.3), rings = [ring(0, [0, 0], y), ring(1, [0.1, 0.2], y - 0.18), ring(2, [0.3, 0.35], yw), ring(3, [0.6, 0.5], -0.28), ring(4, [1.3, 0.8], -1.7)];
  const top = [[cx, y, cz], ...rings[0]], ti = [];
  for (let i = 0; i < N; i++) ti.push(0, 1 + (i + 1) % N, 1 + i);
  P.add('reefTop', tris(top, ti));
  ['reefRock', 'reefWet', 'reefWeed', 'reefRock'].forEach((mat, k) => {
    const a = rings[k], b = rings[k + 1], pts = [...a, ...b], idx = [];
    for (let i = 0; i < N; i++) { const j = (i + 1) % N; idx.push(i, j, N + i, j, N + j, N + i); }
    P.add(mat, tris(pts, idx));
  });
  out.forEach((p, i) => {
    const r1 = rings[1][i], r2 = rings[2][i], r3 = rings[3][i], rn = rings[2][(i + 1) % N];
    if (p.j[0] < 0.45) for (let q = 0; q < 5 + Math.floor(p.j[1] * 6); q++) {            // barnacles at the waterline
      const f = R() * 0.6, u = R() * 0.6, at = [lerp(lerp(r2[0], r3[0], f), rn[0], u), lerp(r2[1], r3[1], f) + 0.02, lerp(lerp(r2[2], r3[2], f), rn[2], u)];
      P.add('barnacle', new THREE.ConeGeometry(0.05 + R() * 0.04, 0.07, 5).translate(at[0], at[1], at[2]));
    }
    if (!p.tg && p.j[2] < 0.3) blob(P, 'reefWeed', cx + p.x - p.dx * 0.35, y + 0.006, cz + p.z - p.dz * 0.35, 0.35 + p.j[3] * 0.4, seed * 7 + i, 9, 1.4 - p.j[1] * 0.6, 0.7 + p.j[1] * 0.6);
    else if (!p.tg && p.j[2] > 0.82) blob(P, 'reefWet', cx + p.x - p.dx * 0.25, y + 0.005, cz + p.z - p.dz * 0.25, 0.3 + p.j[3] * 0.5, seed * 5 + i, 9, 1.5, 0.6);
    if (p.j[3] > 0.7) blob(P, 'reefWeed', (r1[0] + r2[0]) / 2, (r1[1] + r2[1]) / 2 - 0.02, (r1[2] + r2[2]) / 2, 0.18, seed * 3 + i, 6);
  });
  return out;
}
/** A flat irregular patch (fan) at height y: pools, weed, wet streaks. */
function blob(P, mat, x, y, z, r, seed, n = 11, sx = 1, sz = 1) {
  const R = rng(seed), pts = [[x, y, z]], idx = [];
  for (let i = 0; i < n; i++) { const a = i / n * TAU, rr = r * (0.55 + R() * 0.6); pts.push([x + Math.cos(a) * rr * sx, y, z + Math.sin(a) * rr * sz]); }
  for (let i = 0; i < n; i++) idx.push(0, 1 + (i + 1) % n, 1 + i);
  P.add(mat, tris(pts, idx));
}
function boulder(P, x, y, z, s, seed, mat = 'reefRock') {
  const R = rng(seed), g = new THREE.IcosahedronGeometry(1, 0), p = g.attributes.position, key = new Map();
  for (let i = 0; i < p.count; i++) { const k = `${p.getX(i).toFixed(3)},${p.getY(i).toFixed(3)},${p.getZ(i).toFixed(3)}`; if (!key.has(k)) key.set(k, 0.75 + R() * 0.5); const f = key.get(k); p.setXYZ(i, p.getX(i) * f, p.getY(i) * f * 0.7, p.getZ(i) * f); }
  g.computeVertexNormals(); g.scale(s, s, s); g.rotateY(R() * TAU); P.add(mat, g.translate(x, y, z));
}
let HALO = null;
const haloTex = () => HALO ||= (() => {
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, '#fff'); g.addColorStop(0.3, '#fff9'); g.addColorStop(1, '#fff0'); x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
})();
/** A wreckers' false lamp: an iron brazier cage on a lashed spar mast (about 2.5 tall), burning a sickly guttering
 *  Lampwarden green to lure ships onto the reef, a red-glass tell hung in the cage, a pool of green light on what it stands
 *  on. Static parts go into P (in parent's frame); the fire, light and smoke are parent's children.
 *  Returns { pos, set(on), on, anim(t) }; out: no fire, no light, a thread of smoke. */
function falseLamp(M, P, parent, x, y, z, i, { cairn = true, poolY = y, poolR = 1.5, poolZ = z } = {}) {
  const H = 2.5, cb = y + H - 0.5;                                              // the cage's bowl
  if (cairn) for (let k = 0; k < 7; k++) boulder(P, x + Math.cos(k * 0.9) * 0.42, y + 0.08, z + Math.sin(k * 0.9) * 0.42, 0.24 + (k % 3) * 0.05, 400 + i * 17 + k);
  P.add('cedar', rod([x, y - 0.3, z], [x + 0.04, cb + 0.04, z + 0.03], 0.11, 0.08, 7), { swap: true });
  for (const f of [0.2, 0.55, 0.85]) P.add('hemp', rod([x, y + H * f - 0.06, z], [x, y + H * f + 0.06, z], 0.125, 0.12, 7));
  P.add('cedar', rod([x - 0.42, cb - 0.12, z + 0.02], [x + 0.42, cb - 0.12, z + 0.02], 0.045, 0.04, 5));
  P.add('cedar', rod([x + 0.02, cb - 0.12, z - 0.42], [x + 0.02, cb - 0.12, z + 0.42], 0.045, 0.04, 5));
  P.add('iron', new THREE.CylinderGeometry(0.27, 0.15, 0.14, 10).translate(x, cb + 0.07, z));
  for (let k = 0; k < 8; k++) {
    const a = k / 8 * TAU, c = Math.cos(a), s = Math.sin(a);
    P.add('iron', rod([x + c * 0.26, cb + 0.12, z + s * 0.26], [x + c * 0.35, cb + 0.62, z + s * 0.35], 0.022, 0.02, 4));
    P.add('iron', new THREE.ConeGeometry(0.025, 0.14, 4).translate(x + c * 0.35, cb + 0.69, z + s * 0.35));
  }
  for (const [h, r] of [[0.36, 0.31], [0.62, 0.35]]) P.add('iron', new THREE.TorusGeometry(r, 0.022, 4, 16).rotateX(Math.PI / 2).translate(x, cb + h, z));
  P.add('iron', box(0.03, 0.22, 0.16, x + 0.33, cb + 0.36, z));
  P.add('redGlass', box(0.05, 0.15, 0.11, x + 0.34, cb + 0.36, z));
  const fire = new THREE.Group(); fire.position.set(x, cb + 0.13, z); parent.add(fire);
  const fm = M.sickly.clone(), coal = M.ember.clone();
  fire.add(new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.2, 0.06, 10), coal));
  const flames = new THREE.Group(); fire.add(flames);
  for (const [dx, dz, h, r] of [[0, 0, 0.62, 0.15], [0.08, 0.05, 0.42, 0.09], [-0.07, -0.04, 0.48, 0.1], [0.02, -0.09, 0.36, 0.08]]) flames.add(new THREE.Mesh(new THREE.ConeGeometry(r, h, 6).translate(dx, h / 2 + 0.03, dz), fm));
  const sprite = (c, s, o = 1) => { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex(), color: c, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: o })); m.scale.setScalar(s); parent.add(m); return m; };
  const halo = sprite(0x9cff58, 2.8); halo.position.set(x, cb + 0.4, z);
  const tell = sprite(0xff2a18, 0.6, 0.8); tell.position.set(x + 0.36, cb + 0.36, z);
  const pm = new THREE.MeshBasicMaterial({ map: haloTex(), color: 0x7cff40, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
  const pool = new THREE.Mesh(new THREE.CircleGeometry(poolR, 24).rotateX(-Math.PI / 2), pm); pool.position.set(x, poolY + 0.03, poolZ); pool.renderOrder = 4; parent.add(pool);
  const light = new THREE.PointLight(0x8cff50, 16, 7, 1.6); light.position.set(x, cb + 0.6, z); parent.add(light);
  const fume = smoke([x, cb + 0.5, z], 7, ['#3e3e36', '#2c2c28'], 2.6, 0.7); fume.grp.visible = false; parent.add(fume.grp);
  for (const o of [fire, pool]) o.traverse((m) => { m.userData.noShadow = true; });
  let on = true;
  return {
    pos: [x, cb + 0.4, z],
    set(v) { on = !!v; for (const o of [flames, halo, tell, pool, light]) o.visible = on; coal.emissiveIntensity = on ? 1.8 : 0.25; fume.grp.visible = !on; },
    get on() { return on; },
    anim(t) {
      if (!on) { fume.update(t); return; }
      const g = Math.sin(t * 0.83 + i * 2.1) * Math.sin(t * 1.37 + i);
      let k = 0.8 + 0.12 * Math.sin(t * 7.3 + i * 3) + 0.08 * Math.sin(t * 17.1 + i);
      if (g > 0.5) k *= 0.25 + 0.75 * (1 - (g - 0.5) / 0.5);                    // it gutters low now and then
      flames.scale.set(1, 0.45 + 0.75 * k, 1); flames.rotation.y = t * 0.8; flames.position.x = 0.03 * Math.sin(t * 5 + i);
      fm.emissiveIntensity = 1.4 + 1.4 * k; light.intensity = 16 * k; halo.material.opacity = 0.8 * k; pm.opacity = 0.55 * k;
    },
  };
}
function reef(M) {
  reefMaterials(M);
  const root = new THREE.Group(), P = new Parts(M), walk = [], glow = [], waves = [], cover = [];
  // shelves, then the ledges between them. A ledge sits at the level of its lower shelf; where it meets a higher one it
  // is cut back and rock steps (rises of 0.3 or less) climb to the higher shelf's rim.
  const SH = [
    [-6, 3, 5.5, 3.5, 1.45, 101],   // A: the high middle shelf
    [8, 0.4, 5, 2.6, 1.05, 202],     // B: the wreck's shelf (she lies off its south edge)
    [17, 5, 3, 2.5, 0.75, 303],     // C: lamp rock (east)
    [-16, -4, 3, 3, 0.7, 404],      // D: lamp rock (west)
    [-2, 9.6, 3.5, 2.0, 0.8, 505],  // E: the north shelf
    [1.2, 1, 3.2, 1.4, 1.05, 606],   // ledge A-B
    [13.5, 2, 2.4, 1.6, 0.75, 707], // ledge B-C
    [-12.5, -0.8, 2.8, 2.0, 0.7, 808], // ledge A-D
    [-3.5, 6.6, 1.8, 1.4, 0.8, 909],   // ledge A-E
  ];
  const rects = SH.map(([x, z, hx, hz, y]) => [x - hx, z - hz, x + hx, z + hz, y]), tight = SH.map(() => ({})), steps = [];
  for (let li = 5; li < SH.length; li++) for (let si = 0; si < 5; si++) {
    const L = rects[li], S = rects[si], ox = Math.min(L[2], S[2]) - Math.max(L[0], S[0]), oz = Math.min(L[3], S[3]) - Math.max(L[1], S[1]);
    const rise = S[4] - L[4];
    if (ox <= 0 || oz <= 0 || rise < 0.2) continue;
    const ax = ox < oz, lo = ax ? 0 : 1, hi = ax ? 2 : 3, clo = ax ? 1 : 0, chi = ax ? 3 : 2;
    const dir = (L[lo] + L[hi]) > (S[lo] + S[hi]) ? 1 : -1, edge = dir > 0 ? S[hi] : S[lo], nb = Math.max(1, Math.ceil(rise / 0.3) - 1), gap = nb * 0.5;
    tight[si][(ax ? 'x' : 'z') + (dir > 0 ? '1' : '0')] = true;
    const c0 = Math.max(L[clo], S[clo]) + 0.1, c1 = Math.min(L[chi], S[chi]) - 0.1;
    if (dir > 0) L[lo] = edge + gap; else L[hi] = edge - gap;
    for (let k = 0; k < nb; k++) {
      const yk = +(S[4] - rise * (k + 1) / (nb + 1)).toFixed(2), a = edge + dir * k * 0.5, b = edge + dir * (k + 1) * 0.5, r = [0, 0, 0, 0, yk];
      r[lo] = Math.min(a, b); r[hi] = Math.max(a, b); r[clo] = c0; r[chi] = c1; steps.push(r.map((v) => +v.toFixed(2)));
      P.add('reefTop', box(r[2] - r[0] + 0.04, yk + 0.4, r[3] - r[1] + 0.3, (r[0] + r[2]) / 2, (yk - 0.4) / 2, (r[1] + r[3]) / 2));
      P.add('reefWet', box(r[2] - r[0] + 0.06, 0.12, r[3] - r[1] + 0.32, (r[0] + r[2]) / 2, yk - 0.16, (r[1] + r[3]) / 2));
    }
  }
  SH.forEach(([x, z, hx, hz, y, s], i) => shelf(P, x, z, hx, hz, y, s, tight[i]));
  walk.push(...rects.map((r) => r.map((v) => +v.toFixed(2))), ...steps);
  const R = rng(99);
  // irregular pools: dark and glassy, no rims; waist-high boulders standing on the shelves for cover
  for (const [x, z, r, y, sx, sz] of [[-9.4, 4.4, 0.9, 1.45, 1.5, 0.7], [-2.6, 3.4, 0.55, 1.45, 0.8, 1.3], [5.6, 1.7, 0.7, 1.05, 1.4, 0.8], [-15.2, -2.4, 0.5, 0.7, 1.2, 0.9], [-3.9, 9.9, 0.6, 0.8, 1.6, 0.7], [16.2, 3.4, 0.45, 0.75, 1, 1.4]]) {
    blob(P, 'reefWet', x, y + 0.008, z, r * 1.3, Math.round(x * 31 + z * 7) + 5000, 12, sx, sz);
    blob(P, 'tidePool', x, y + 0.014, z, r, Math.round(x * 31 + z * 7) + 5000, 12, sx, sz);
  }
  for (const [x, z, y, s] of [[-8.6, 2.2, 1.45, 0.7], [-4.0, 5.2, 1.45, 0.62], [-6.4, 0.2, 1.45, 0.55], [10.8, 1.9, 1.05, 0.66], [15.7, 5.6, 0.75, 0.6], [-14.7, -4.8, 0.7, 0.62], [-0.2, 9.6, 0.8, 0.58]]) {
    boulder(P, x, y + 0.3, z, s, Math.round(x * 13 + z * 3) + 6000); cover.push([x, z, +(s * 1.05).toFixed(2), +(0.3 + s * 0.8).toFixed(2)]);
    blob(P, 'reefWet', x, y + 0.005, z, s * 1.4, Math.round(x * 13 + z * 3) + 6100, 9);
  }
  const inWalk = (x, z) => walk.some(([x0, z0, x1, z1]) => x > x0 - 0.5 && x < x1 + 0.5 && z > z0 - 0.5 && z < z1 + 0.5);
  for (let i = 0; i < 300; i++) {
    const [cx, cz, hx, hz, y] = SH[i % SH.length], a = R() * TAU, k = 1.0 + R() * 0.7;
    const x = cx + Math.cos(a) * (hx + 0.5) * k, z = cz + Math.sin(a) * (hz + 0.5) * k;
    if (inWalk(x, z)) continue;
    boulder(P, x, y * (k < 1.25 ? 0.75 : 0.15) - 0.1, z, 0.25 + R() * 0.55, 1000 + i);
  }
  for (let i = 0; i < 26; i++) { const x = -22 + R() * 44, z = -12 + R() * 24; if (inWalk(x, z)) continue; boulder(P, x, -0.25, z, 0.4 + R() * 0.9, 2000 + i); }
  // the beached wreck: a broken brig on its port bilge on shelf B, bow out over the sea, stern stove in to its ribs
  let wreckLamp;
  const wr = new THREE.Group(), W = new Parts(M), RZ = 0.26, GX = 8, GY = 1.83, GZ = -4.75, WL = 13, WB = 2.6;
  {
    const beam = (s) => WB * Math.sqrt(Math.min(1, (s + 0.1) / 0.3)) * Math.pow(clamp((1 - s) / 0.42, 0, 1), 0.8);
    const sheer = (s) => 0.9 + 0.9 * s ** 3, keel = (s) => -2.4 + 1.3 * Math.pow(sm(0.6, 1, s), 1.5);
    const prof = (k) => Math.pow(Math.max(0, 1 - Math.pow(k, 2.3)), 0.55), inner = (s) => Math.max(0, beam(s) - 0.18);
    const { zAt, hullX } = seaHull(W, { L: WL, beam, sheer, keel, prof, bands: [] });
    const band = (mat, s0f, yt, yb) => { for (const side of [1, -1]) W.add(mat, surf(40, 3, (u, v) => {
      const s = lerp(s0f(side), 0.997, u), y = lerp(yt(s), Math.max(keel(s), yb), v); return [side * hullX(s, y), y, zAt(s)];
    }, (u, v) => { const s = lerp(s0f(side), 0.997, u); return [zAt(s) / 2, lerp(yt(s), yb, v) / 2]; }, side > 0), { uv: 'keep' }); };
    band('mossed', (sd) => sd > 0 ? 0.3 : 0.4, sheer, -0.3); band('redPaint', (sd) => sd > 0 ? 0.34 : 0.44, () => -0.3, -0.45);
    band('scorched', (sd) => sd > 0 ? 0.27 : 0.36, () => -0.45, -1.4); band('copper', (sd) => sd > 0 ? 0.33 : 0.3, () => -1.4, -9);
    for (let s = 0.04; s < 0.42; s += 0.042) for (const side of [1, -1]) {          // the bared ribs, some snapped short
      const cut = (s * 997 * (side + 3)) % 1, top = lerp(-0.4, sheer(s), cut < 0.3 ? 0.4 : 1), pts = [];
      for (let k = 0; k <= 5; k++) { const y = lerp(keel(s), top, k / 5); pts.push([side * (hullX(s, y) - 0.06), y, zAt(s)]); }
      for (let k = 0; k < 5; k++) W.add('hullLow', rod(pts[k], pts[k + 1], 0.09, 0.09, 5));
    }
    for (let s = 0.02; s < 0.99; s += 0.05) W.add('hullLow', rod([0, keel(s), zAt(s)], [0, keel(Math.min(0.995, s + 0.05)), zAt(Math.min(0.995, s + 0.05))], 0.15, 0.15, 6));
    for (const s of [0.12, 0.2, 0.29]) W.add('hullLow', box(2 * hullX(s, -0.15) - 0.1, 0.16, 0.2, 0, -0.12, zAt(s)));   // deck beams over the gap
    // the deck (walkable), planks broken off ragged into the gap, a hatch, the mast stump, a loose gun by the high rail
    W.add('greyboards', surf(24, 1, (u, v) => { const s = lerp(0.4, 0.93, u); return [(v * 2 - 1) * inner(s), 0, zAt(s)]; }, (u, v) => { const s = lerp(0.4, 0.93, u); return [zAt(s) / 2, (v * 2 - 1) * inner(s) / 2]; }, true), { uv: 'keep' });
    for (let i = 0; i < 9; i++) { const x = -2.1 + i * 0.52, l = 0.3 + ((i * 41) % 9) * 0.18; W.add('greyboards', box(0.48, 0.07, l, x, -0.02, zAt(0.4) + l / 2)); }
    W.add('dark', box(1.1, 0.02, 1.1, 0.6, 0.02, zAt(0.55)));
    for (let i = 0; i < 5; i++) W.add('iron', box(1.2, 0.05, 0.06, 0.6, 0.05, zAt(0.55) - 0.48 + i * 0.24));
    W.add('cedar', rod([0, -0.4, zAt(0.68)], [0, 2.1, zAt(0.68)], 0.24, 0.21, 10), { swap: true });
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU, h = 0.25 + (i % 3) * 0.14; W.add('endgrain', new THREE.ConeGeometry(0.08, h, 4).translate(Math.cos(a) * 0.15, 2.1 + h / 2, zAt(0.68) + Math.sin(a) * 0.15)); }
    deckCannon(W, 1.85, 0, zAt(0.78), 0.4, { len: 1.5, r: 0.18 });
    // bulwark: whole on the high (starboard) side, stove in on the low side save a few posts
    W.add('scorched', surf(30, 1, (u, v) => { const s = lerp(0.42, 0.97, u); return [inner(s), v ? 0 : sheer(s), zAt(s)]; }, undefined, false));
    W.add('flaked', surf(30, 1, (u, v) => { const s = lerp(0.42, 0.97, u); return [v ? inner(s) - 0.05 : beam(s) + 0.06, sheer(s) + 0.1, zAt(s)]; }, undefined, false));
    for (const s of [0.45, 0.47, 0.86, 0.92]) W.add('hullLow', box(0.12, sheer(s) * (0.5 + (s * 7) % 0.5), 0.12, -inner(s), sheer(s) * 0.3, zAt(s)));
    for (const s of [0.5, 0.62, 0.74]) W.add('hullLow', box(0.1, 0.12, 0.5, -beam(s) - 0.02, sheer(s) - 0.1, zAt(s)));
    // the bow: a broken bowsprit stub and a skull to the sea; weed on her bottom where she lies
    W.add('cedar', rod([0, sheer(1) - 0.2, zAt(0.97)], [0, sheer(1) + 0.4, zAt(1) - 1.4], 0.16, 0.13, 8), { swap: true });
    for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; W.add('endgrain', new THREE.ConeGeometry(0.06, 0.3, 4).rotateX(-Math.PI / 2 + 0.4).translate(Math.cos(a) * 0.1, sheer(1) + 0.48 + Math.sin(a) * 0.1, zAt(1) - 1.5)); }
    for (const sd of [1, -1]) skullPlate(W, sd * (beam(0.9) + 0.04), sheer(0.9) - 0.4, zAt(0.9), sd, 0.4);
    wreckLamp = falseLamp(M, W, wr, 0, sheer(1) - 0.55, zAt(1) + 0.3, 2, { cairn: false, poolY: 0, poolR: 1.3, poolZ: zAt(0.88) });
    for (const dy of [0.2, 0.7]) W.add('hemp', rod([0, sheer(1) - 0.55 + dy, zAt(1) + 0.2], [0, sheer(1) - 0.45 + dy, zAt(1) + 0.4], 0.14, 0.14, 7));
    wr.add(W.build('beached'));
    const rag = triSail(M.blackSail, [-0.1, 2.0, zAt(0.68) - 0.1], [-0.2, 1.7, zAt(0.68) + 1.6], [-1.3, 0.2, zAt(0.68) + 0.4], 0.25, -1);
    wr.add(rag.mesh); waves.push(rag);
    // walkable deck strips, in world space
    wr.rotation.set(0, Math.PI / 2, RZ, 'YXZ'); wr.position.set(GX, GY, GZ); wr.updateMatrix();
    const zA = zAt(0.78), zB = zAt(0.42), v = new THREE.Vector3();
    for (let xa = -2.3; xa < 2.29; xa += 0.92) {
      const xb = Math.min(2.3, xa + 0.92), c = [[xa, zA], [xb, zA], [xa, zB], [xb, zB]].map(([x, z]) => v.set(x, 0, z).applyMatrix4(wr.matrix).clone());
      walk.push([Math.min(...c.map((q) => q.x)), Math.min(...c.map((q) => q.z)), Math.max(...c.map((q) => q.x)), Math.max(...c.map((q) => q.z)), +(c.reduce((a, q) => a + q.y, 0) / 4).toFixed(2)]);
    }
  }
  root.add(wr);
  // a plank ramp from the open rock up onto the wreck's low side
  for (let i = 0; i < 4; i++) P.add('greyboards', place(box(0.5, 0.08, 1.5, 0, 0, 0), [5.6 + i * 0.55, 1.15, -2.25], -0.12, 0.05 * i, 0));
  walk.push([5.3, -2.95, 7.8, -1.7, 1.17]);
  for (let i = 0; i < 14; i++) boulder(P, GX - 5 + i * 0.85, -0.5 + (i % 3) * 0.15, GZ - 0.6 + ((i * 37) % 5) * 0.5, 0.7 + (i % 4) * 0.2, 3000 + i);
  // an older wreck's bones in the shallows off lamp rock D, an anchor fouled on the high shelf, driftwood
  for (let i = 0; i < 7; i++) for (const sd of [1, -1]) { const z = 3 + i * 0.9, h = 0.6 + ((i * 29) % 5) * 0.25; P.add('hullLow', rod([-18 + sd * 0.6, -1.0, z], [-18 + sd * (1.4 - i * 0.05), h, z + 0.1], 0.1, 0.07, 5)); }
  P.add('hullLow', rod([-18, -0.4, 2.4], [-18, 0.1, 9.4], 0.16, 0.14, 6));
  {
    const ax = -10.6, az = 5.8, y = 1.45;
    P.add('iron', place(rod([0, 0, 0], [0, 1.8, 0], 0.08, 0.07, 6), [ax, y - 0.25, az], 0.6, 0, 0.3));
    P.add('iron', place(new THREE.TorusGeometry(0.62, 0.07, 4, 12, Math.PI), [ax, y - 0.1, az], 0.6, 0.3, Math.PI));
    chain(P, 'iron', sag([ax + 0.35, y + 1.3, az - 0.9], [ax + 2.6, -0.2, az + 2.4], 0.4, 8), 0.18, 0.03);
    cover.push([ax, az, 0.7, 1.4]);
  }
  for (const [x, z, y, ry, l] of [[-9.0, 0.6, 1.51, 0.4, 2.4], [12.5, -4.5, 0.05, 1.2, 2.0], [3.4, 5.2, 0.05, 2.3, 1.8], [-14.2, 2.4, 0.05, 0.9, 1.6]]) P.add('scorched', place(box(l, 0.12, 0.34, 0, 0, 0), [x, y, z], 0.04, ry, 0.03));
  // the false lamps: one on each lamp rock, one lashed to the wreck's stem post, all looking out to sea
  const lampsL = [falseLamp(M, P, root, 18.4, 0.75, 6.1, 0), falseLamp(M, P, root, -17.6, 0.7, -5.7, 1)];
  root.add(P.build('reef'));
  const lamps = lampsL.map((l) => l.pos.map((n) => +n.toFixed(2)));
  lampsL.push(wreckLamp); lamps.push(new THREE.Vector3().fromArray(wreckLamp.pos).applyMatrix4(wr.matrix).toArray().map((n) => +n.toFixed(2)));
  for (const [x, z] of [[18.4, 6.1], [-17.6, -5.7]]) cover.push([x, z, 0.6, 2.5]);
  const crew = [[-6, 1.45, 3, 'pirate'], [-3.6, 1.45, 1.4, 'pirate'], [8.5, 1.05, -0.4, 'pirate'], [7.2, 1.6, -4.4, 'pirate'], [16.5, 0.75, 4.6, 'pirate'], [-15.6, 0.7, -3.6, 'pirate'], [-2, 0.8, 9.4, 'pirate']];
  return {
    root, info: { length: 44, beam: 26, hl: 20, hb: 12, glow, crew, walk, lamps, cover, fixed: true },
    setLamp: (i, on) => lampsL[i]?.set(on), lampOn: (i) => lampsL[i]?.on,
    anim(t) { for (const w of waves) w.update(t); for (const l of lampsL) l.anim(t); },
  };
}
