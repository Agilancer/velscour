// The Black Tide's medium ships (docs/PIRATE_SEAS.md): Velscour's sea pirates.
//   brig      - the Corsair gun-brig: a tarred two-master in patched black sail with a crimson course, a red-lead gun
//               strake of five ports a side, two bow chasers, a raised quarterdeck and a boarding gangplank  (26 x 7)
//   hulk      - buildBrig(M, { hulk: true }): the same brig dismasted, burnt and listing in the Red Tide, weed on its
//               hull and Velscour's blood idol on its main deck (info.list, info.idol)
//   grappler  - the Grapple steamer: a rusted iron paddle tug with a tall smoking funnel, an armoured wheelhouse, a
//               lattice boom crane swinging a great four-tine grapple, and a drop-ramp bow on chains     (22 x 7)
// Same frame as the fleet: 1 unit = 1 tile, bow to -Z, starboard +X, main deck at y = 0. Nothing on them flies.
// buildBrig(M, { hulk }) -> { root, anim, info, setPlank(f) }; buildGrappler(M) -> { root, anim, info, setRamp(f) }.
import * as THREE from 'three';
import { Parts, box, rod, tris, flag, sm, TAU, seaHull, wale, squareSail, triSail, lines, shrouds, mast, yard, gunPort,
  deckCannon, paddleWheel, dinghy, anchor, lamp, grapnel, rail, stairs, helm, cargo, funnel, fightingSail, finish } from './seaship3d.js';

const RED = 0xff3020;                                       // the Black Tide's lamps: red, so they hold in fog and night
/** The few plain colours the Tide needs beyond seaMaterials (red lamp glass, rust streaks, char, live embers). */
function tideMats(M) {
  M.tideGlass ||= new THREE.MeshStandardMaterial({ color: 0xff6450, emissive: 0xff1a08, emissiveIntensity: 2.0, roughness: 0.5 });
  M.tideRust ||= new THREE.MeshStandardMaterial({ color: 0x7a3a1a, roughness: 0.95, side: THREE.DoubleSide });
  M.tideChar ||= new THREE.MeshStandardMaterial({ color: 0x151113, roughness: 1, side: THREE.DoubleSide });
  M.tideHold ||= new THREE.MeshStandardMaterial({ color: 0x5a1808, emissive: 0x8a2008, emissiveIntensity: 1.3, roughness: 1 });   // fire in the hold, seen through a hole
  M.tideEmber ||= new THREE.MeshStandardMaterial({ color: 0xff8a40, emissive: 0xff4a10, emissiveIntensity: 2.4, roughness: 0.7 });
}
/** Hand-painted pixel sailcloth for one sail (no tiling): vertical cloths of uneven shade with seams, irregular patches
 *  of different sizes with stitched edges, a few lighter replacement cloths, tabling round the edge, reef bands straight
 *  across at heights `reefs` (0 foot .. 1 head) with reef points; `burnt` eats holes with charred, ember edges. */
function sailCloth(seed, { base = [48, 45, 52], crimson = false, reefs = [], burnt = false, W = 96, H = 96, panel = 8 } = {}) {
  const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
  let s = seed * 7919 + 13; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const rgb = (a, k = 1) => `rgb(${a.map((v) => Math.max(0, Math.min(255, v * k)) | 0).join(',')})`;
  for (let i = 0; i < W; i += panel) { x.fillStyle = rgb(base, rnd() < 0.14 ? 1.4 : 0.88 + rnd() * 0.2); x.fillRect(i, 0, panel, H); }
  for (let n = 0; n < W * H / 5; n++) { x.fillStyle = rgb(base, 0.7 + rnd() * 0.6); x.globalAlpha = 0.3; x.fillRect(rnd() * W | 0, rnd() * H | 0, 1, 1); }
  x.globalAlpha = 1; x.fillStyle = rgb(base, 0.55);
  for (let i = panel; i < W; i += panel) x.fillRect(i, 0, 1, H);
  const pal = crimson ? [[[34, 28, 32], 1], [base, 1.3], [base, 0.68], [[84, 62, 48], 1]] : [[base, 1.55], [[82, 64, 52], 1], [[128, 36, 30], 1], [base, 0.6], [[96, 92, 100], 1]];
  for (let n = 0; n < 10; n++) {
    const w = 5 + rnd() * 20 | 0, h = 4 + rnd() * 16 | 0, px = 3 + rnd() * (W - w - 6) | 0, py = 3 + rnd() * (H - h - 6) | 0, [col, k] = pal[rnd() * pal.length | 0];
    x.fillStyle = rgb(col, k); x.fillRect(px, py, w, h);
    x.fillStyle = rgb(col, k * 0.5); x.fillRect(px, py, w, 1); x.fillRect(px, py + h - 1, w, 1); x.fillRect(px, py, 1, h); x.fillRect(px + w - 1, py, 1, h);
    x.fillStyle = rgb(col, k * 1.6 + 0.2); for (let i = 2; i < w - 1; i += 2) { x.fillRect(px + i, py + 1, 1, 1); x.fillRect(px + i, py + h - 2, 1, 1); }
  }
  x.fillStyle = rgb(base, 0.45); x.fillRect(0, 0, W, 3); x.fillRect(0, H - 3, W, 3); x.fillRect(0, 0, 2, H); x.fillRect(W - 2, 0, 2, H);
  for (const v of reefs) {
    const y = H * (1 - v) | 0;
    x.fillStyle = crimson ? 'rgb(30,24,28)' : 'rgb(150,34,30)'; x.fillRect(0, y, W, 3);
    x.fillStyle = 'rgb(20,16,18)'; x.fillRect(0, y + 3, W, 1);
    x.fillStyle = 'rgb(150,124,92)'; for (let i = 3; i < W - 2; i += 5) { x.fillRect(i, y - 3, 1, 3); x.fillRect(i, y + 4, 1, 3); }
  }
  if (burnt) {
    const holes = []; for (let n = 0; n < 14; n++) holes.push([rnd() * W, rnd() * H, 2 + rnd() * 8]);
    for (let i = 0; i < W; i += 3) holes.push([i, H - 1, 2 + rnd() * 7]);                         // a ragged, eaten foot
    for (const [hx, hy, r] of holes) { x.fillStyle = 'rgb(40,22,14)'; x.beginPath(); x.arc(hx, hy, r + 3, 0, TAU); x.fill(); }
    for (const [hx, hy, r] of holes) { x.fillStyle = 'rgb(210,92,30)'; x.beginPath(); x.arc(hx, hy, r + 1.2, 0, TAU); x.fill(); }
    x.globalCompositeOperation = 'destination-out';
    for (const [hx, hy, r] of holes) { x.beginPath(); x.arc(hx, hy, r, 0, TAU); x.fill(); }
    x.globalCompositeOperation = 'source-over';
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter; t.anisotropy = 4;
  return new THREE.MeshStandardMaterial({ map: t, bumpMap: t, bumpScale: 0.5, roughness: 0.95, side: THREE.DoubleSide, alphaTest: burnt ? 0.5 : 0 });
}
/** Pin a sail's painted cloth to the whole sail (the shared sail builders tile the map by size). */
const wholeCloth = (sail) => { const m = sail.mesh.material; m.map.repeat.set(1, 1); m.map.offset.set(0, 0); m.map.needsUpdate = true; return sail; };
/** A corvus: a boarding bridge hinged at the rail, reaching out along +x*side, cleated, rope-railed, with an iron beak
 *  under its tip to bite a rail. userData.set(f): 0 raised ~70 degrees on its tackle, 1 down. */
function corvus(M, len, w, side) {
  const g = new THREE.Group(), P = new Parts(M), X = (v) => side * v;
  P.add('cedar', box(len, 0.14, w, X(len / 2), 0, 0));
  for (let i = 0.35; i < len - 0.1; i += 0.36) P.add('blackwood', box(0.08, 0.07, w - 0.12, X(i), 0.1, 0));
  for (const dz of [-w / 2, w / 2]) P.add('iron', box(len, 0.12, 0.1, X(len / 2), 0.02, dz));
  for (const dz of [-w / 2, w / 2]) for (let i = 0.4; i < len; i += 0.8) P.add('iron', rod([X(i), 0.05, dz], [X(i), 0.62, dz], 0.03, 0.03, 4));
  for (const dz of [-w / 2, w / 2]) P.add('cedar', rod([X(0.3), 0.6, dz], [X(len - 0.3), 0.6, dz], 0.025, 0.025, 4));
  for (const dz of [-w / 2 + 0.12, 0, w / 2 - 0.12]) P.add('iron', new THREE.CylinderGeometry(0.11, 0.11, 0.26, 8).rotateX(Math.PI / 2).translate(0, -0.02, dz));   // hinge knuckles
  P.add('iron', rod([0, -0.02, -w / 2 - 0.1], [0, -0.02, w / 2 + 0.1], 0.05, 0.05, 6));
  P.add('iron', box(0.18, 0.18, w + 0.1, X(len - 0.1), -0.02, 0));
  P.add('iron', new THREE.ConeGeometry(0.17, 1.0, 5).rotateX(Math.PI).translate(X(len - 0.12), -0.55, 0));                       // the beak
  for (const dz of [-w / 2 + 0.1, w / 2 - 0.1]) P.add('iron', new THREE.ConeGeometry(0.08, 0.55, 4).rotateX(Math.PI).translate(X(len - 0.1), -0.32, dz));
  P.add('iron', new THREE.TorusGeometry(0.1, 0.03, 4, 8).translate(X(len - 0.25), 0.2, 0));
  g.add(P.build('corvus'));
  g.userData.tip = new THREE.Vector3(X(len - 0.25), 0.25, 0);
  g.userData.set = (f) => { g.rotation.z = side * (1.22 * (1 - f) - 0.08 * f); };
  g.userData.set(0);
  return g;
}
/** A bow shackle: a U of round bar hanging under its pin (pin along x) at (x, y, z). */
function shackle(P, x, y, z, s = 1) {
  P.add('iron', new THREE.TorusGeometry(0.13 * s, 0.04 * s, 5, 10, Math.PI).rotateZ(Math.PI).translate(x, y, z));
  P.add('gunmetal', rod([x - 0.17 * s, y, z], [x + 0.17 * s, y, z], 0.045 * s, 0.045 * s, 6));
}
/** Transform a geometry: scale s, rotate (rx, ry, rz), then move to (x, y, z). */
const T = (g, s, ry, x, y, z, rx = 0, rz = 0) => { g.scale(s, s, s); if (rx) g.rotateX(rx); if (rz) g.rotateZ(rz); if (ry) g.rotateY(ry); return g.translate(x, y, z); };

/** A skull with crossed bones behind it, facing -Z (ry turns it), scale s. */
function skull(P, x, y, z, ry, s = 1, mat = 'boneWhite') {
  const f = (g, m = mat) => P.add(m, T(g, s, ry, x, y, z));
  f(new THREE.SphereGeometry(0.45, 12, 9).scale(0.92, 1, 1.05).translate(0, 0.12, 0));
  f(new THREE.BoxGeometry(0.5, 0.3, 0.42).translate(0, -0.28, -0.12));               // cheeks and jaw
  f(new THREE.BoxGeometry(0.4, 0.14, 0.3).translate(0, -0.48, -0.16));
  for (const d of [-1, 1]) f(new THREE.SphereGeometry(0.13, 7, 5).translate(d * 0.17, 0.04, -0.37), 'dark');
  f(new THREE.ConeGeometry(0.07, 0.16, 3).rotateX(Math.PI).translate(0, -0.15, -0.42), 'dark');
  for (let i = 0; i < 5; i++) f(new THREE.BoxGeometry(0.055, 0.1, 0.04).translate(-0.12 + i * 0.06, -0.39, -0.335), 'dark');
  for (const d of [-1, 1]) {                                // crossed thigh bones with knuckled ends
    f(new THREE.CylinderGeometry(0.07, 0.07, 1.5, 6).rotateZ(d * 0.8).translate(0, -0.1, 0.22));
    for (const e of [-1, 1]) f(new THREE.SphereGeometry(0.12, 6, 5).translate(e * Math.sin(d * 0.8) * -0.75, -0.1 + e * Math.cos(d * 0.8) * 0.75, 0.22));
  }
}
/** A hatch grating: a coaming, dark below, slats both ways. */
function grating(P, x, y, z, w, d, coam = 'blackwood', slat = 'cedar') {
  P.add('dark', box(w, 0.02, d, x, y + 0.03, z));
  for (const sx of [-1, 1]) P.add(coam, box(0.16, 0.22, d + 0.16, x + sx * w / 2, y + 0.11, z));
  for (const sz of [-1, 1]) P.add(coam, box(w + 0.16, 0.22, 0.16, x, y + 0.11, z + sz * d / 2));
  for (let i = 1; i < Math.round(w / 0.28); i++) P.add(slat, box(0.06, 0.06, d, x - w / 2 + i * w / Math.round(w / 0.28), y + 0.18, z));
  for (let i = 1; i < Math.round(d / 0.28); i++) P.add(slat, box(w, 0.05, 0.06, x, y + 0.15, z - d / 2 + i * d / Math.round(d / 0.28)));
}
/** A fife rail of belaying pins round a mast foot. */
function fifeRail(P, x, y, z, w = 0.9) {
  for (const [dx, dz] of [[-w, -w], [w, -w], [-w, w], [w, w]]) P.add('blackwood', box(0.14, 0.8, 0.14, x + dx, y + 0.4, z + dz));
  for (const sz of [-1, 1]) P.add('blackwood', box(w * 2 + 0.2, 0.1, 0.18, x, y + 0.78, z + sz * w));
  for (const sz of [-1, 1]) for (let i = 0; i < 5; i++) P.add('cedar', rod([x - w * 0.7 + i * w * 0.35, y + 0.68, z + sz * w], [x - w * 0.7 + i * w * 0.35, y + 0.98, z + sz * w], 0.03, 0.025, 4));
}
/** An end cap closing a hull section at z (dir -1 faces -Z, the bow), between heights y0 (top) and y1 (bottom). */
function endCap(P, mat, hx, s, z, y0, y1, dir) {
  const N = 14, ring = [];
  for (let j = 0; j <= N; j++) { const y = y0 + (y1 - y0) * j / N; ring.push([hx(s, y), y]); }
  const all = [...ring, ...ring.slice(0, -1).reverse().map(([x, y]) => [-x, y])], pts = [[0, (y0 + y1) / 2, z]], idx = [];
  all.forEach(([x, y]) => pts.push([x, y, z]));
  for (let i = 1; i < all.length; i++) dir > 0 ? idx.push(0, i + 1, i) : idx.push(0, i, i + 1);
  dir > 0 ? idx.push(0, 1, all.length) : idx.push(0, all.length, 1);
  P.add(mat, tris(pts, idx));
}
/** Chain links (static) along a polyline. */
function chainPath(P, pts, mat = 'iron', r = 0.09, tube = 0.03) {
  const g0 = new THREE.TorusGeometry(r, tube, 4, 8).scale(1.7, 1, 1), X = new THREE.Vector3(1, 0, 0);
  let k = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = new THREE.Vector3(...pts[i]), b = new THREE.Vector3(...pts[i + 1]), d = b.clone().sub(a), len = d.length(), step = r * 2.6;
    const q = new THREE.Quaternion().setFromUnitVectors(X, d.normalize());
    for (let f = 0; f < len; f += step, k++) {
      const g = g0.clone(); if (k % 2) g.rotateX(Math.PI / 2);
      g.applyQuaternion(q); const p = a.clone().addScaledVector(d, f); g.translate(p.x, p.y, p.z); P.add(mat, g);
    }
  }
}
/** A live chain between two moving points: instanced links, re-laid by set(a, b, sag). */
function liveChain(M, mat = 'iron', max = 48, r = 0.1, tube = 0.035) {
  const g = new THREE.TorusGeometry(r, tube, 4, 8).scale(1.7, 1, 1);
  const mesh = new THREE.InstancedMesh(g, M[mat], max); mesh.name = 'chain'; mesh.castShadow = true;
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), q2 = new THREE.Quaternion(), X = new THREE.Vector3(1, 0, 0), one = new THREE.Vector3(1, 1, 1);
  const set = (a, b, sag = 0.3) => {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), len = A.distanceTo(B), n = Math.min(max, Math.ceil(len / (r * 2.6)) + 1);
    const at = (f) => A.clone().lerp(B, f).add(new THREE.Vector3(0, -Math.sin(Math.PI * f) * sag, 0));
    for (let i = 0; i < n; i++) {
      const f = i / Math.max(1, n - 1), p = at(f), d = at(Math.min(1, f + 0.01)).sub(at(Math.max(0, f - 0.01))).normalize();
      q.setFromUnitVectors(X, d); if (i % 2) q.multiply(q2.setFromAxisAngle(X, Math.PI / 2));
      mesh.setMatrixAt(i, m4.compose(p, q, one));
    }
    mesh.count = n; mesh.instanceMatrix.needsUpdate = true;
  };
  return { mesh, set };
}

// =================================================================== the Corsair gun-brig (and its burnt hulk)
/** A gun port stove in: a splintered hole, the lid hanging by one hinge, scorch round it; the gun sometimes drooping out. */
function stovePort(P, x, y, z, side, k) {
  const sz = 0.6 + (k % 3) * 0.08;
  P.add('dark', box(0.12, sz * 1.1, sz * 1.25, x + side * 0.02, y - 0.04, z, (k % 2 ? 0.1 : -0.12)));
  P.add('scorched', box(0.08, sz * 1.7, sz * 1.9, x - side * 0.01, y, z));
  const g = new THREE.BoxGeometry(0.07, sz, sz); g.translate(0, -sz / 2, 0); g.rotateX(0.5 + (k % 3) * 0.3); g.rotateZ(side * 0.25);
  P.add('redPaint', g.translate(x + side * 0.08, y - sz * 0.45, z + sz * 0.35));
  for (let i = 0; i < 5; i++) { const a = i / 5 * TAU + k; P.add('cedar', new THREE.ConeGeometry(0.05, 0.35, 3).rotateX(Math.PI / 2).rotateY(Math.PI / 2 * side).rotateX(a).translate(x + side * 0.1, y + Math.sin(a) * sz * 0.55, z + Math.cos(a) * sz * 0.6)); }
  if (k % 3 === 1) P.add('iron', rod([x - side * 0.3, y + 0.05, z], [x + side * 0.5, y - 0.35, z + 0.1], 0.13, 0.11, 8));
}
/** Jagged splinters round a snapped spar's end at p (radius r). */
function snapped(P, p, r, mat = 'cedar', n = 7, up = [0, 1, 0]) {
  const U = new THREE.Vector3(...up).normalize(), q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), U);
  for (let i = 0; i < n; i++) {
    const a = i / n * TAU, h = 0.3 + ((i * 7) % 5) * 0.16, g = new THREE.ConeGeometry(r * 0.38, h, 3).translate(Math.cos(a) * r * 0.62, h / 2, Math.sin(a) * r * 0.62);
    g.applyQuaternion(q); P.add(mat, g.translate(...p));
  }
  P.add('dark', new THREE.CylinderGeometry(r * 0.95, r * 0.95, 0.04, 10).applyQuaternion(q).translate(...p));
}
/** The Red Tide's blood idol: an iron plinth ringed with skulls, a cage of bone ribs round a red heart, a crowned skull
 *  on top, chains to the deck, a pool of blood. Returns { core, glow }. ~3.2 tall at (x, y, z). */
function bloodIdol(M, P, root, x, y, z) {   // the heart: violet-white (critics: red vanished into the blood sea)
  const oct = (r, h, yy, m) => P.add(m, new THREE.CylinderGeometry(r * 0.92, r, h, 8).translate(x, y + yy, z));
  P.add('bloodSail', new THREE.CircleGeometry(1.7, 14).rotateX(-Math.PI / 2).scale(1, 1, 0.85).translate(x + 0.15, y + 0.025, z + 0.1));
  oct(1.15, 0.22, 0.11, 'gunmetal'); oct(0.95, 0.38, 0.41, 'iron'); oct(0.72, 0.16, 0.68, 'gunmetal');
  for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + Math.PI / 8; skull(P, x + Math.cos(a) * 1.0, y + 0.42, z + Math.sin(a) * 1.0, -a - Math.PI / 2, 0.32); }
  for (let i = 0; i < 6; i++) {                        // bone ribs curving up round the heart, meeting under the crown
    const a = i / 6 * TAU, c = Math.cos(a), s = Math.sin(a), pts = [];
    for (let j = 0; j <= 7; j++) { const t = j / 7, rr = 0.62 * Math.sin(Math.PI * (0.12 + t * 0.8)) + 0.12; pts.push([x + c * rr, y + 0.75 + t * 2.0, z + s * rr]); }
    for (let j = 0; j < 7; j++) P.add('boneWhite', rod(pts[j], pts[j + 1], 0.075 - j * 0.004, 0.07 - j * 0.004, 5));
    P.add('iron', new THREE.ConeGeometry(0.05, 0.4, 4).rotateZ(-Math.PI / 2).rotateY(-a).translate(x + c * 0.86, y + 1.55, z + s * 0.86));
  }
  for (const yy of [1.05, 2.15]) P.add('iron', new THREE.TorusGeometry(yy < 2 ? 0.66 : 0.42, 0.04, 4, 16).rotateX(Math.PI / 2).translate(x, y + yy, z));
  P.add('gunmetal', new THREE.CylinderGeometry(0.28, 0.2, 0.18, 8).translate(x, y + 2.8, z));
  skull(P, x, y + 3.18, z, -Math.PI / 2, 0.62);                                     // facing starboard, toward the boarders
  for (let i = 0; i < 7; i++) { const a = i / 7 * TAU; P.add('iron', new THREE.ConeGeometry(0.06, 0.5, 4).translate(x + Math.cos(a) * 0.26, y + 3.62, z + Math.sin(a) * 0.26)); }
  for (const [a, b] of [[0.4, [1.5, 0, 1.0]], [2.3, [-1.4, 0, 0.9]], [4.1, [-0.3, 0, -1.6]]]) chainPath(P, [[x + Math.cos(a) * 0.5, y + 2.3, z + Math.sin(a) * 0.5], [x + b[0] * 0.8, y + 0.9, z + b[2] * 0.8], [x + b[0], y + 0.08, z + b[2]]], 'iron', 0.06, 0.022);
  for (const [dx, dz] of [[1.2, -0.6], [-1.15, -0.5], [0.9, 0.9]]) {
    P.add('boneWhite', new THREE.CylinderGeometry(0.07, 0.08, 0.32, 6).translate(x + dx, y + 0.16, z + dz));
    P.add('lamp', new THREE.SphereGeometry(0.05, 5, 4).translate(x + dx, y + 0.37, z + dz));
  }
  // the heart burns violet-white in a ring of char, so it holds against Velscour's red sea
  P.add('tideChar', new THREE.TorusGeometry(0.55, 0.09, 6, 18).rotateX(Math.PI / 2).translate(x, y + 1.6, z));
  const coreMat = new THREE.MeshStandardMaterial({ color: 0xf2e6ff, emissive: 0xa040ff, emissiveIntensity: 2.4, roughness: 0.3, flatShading: true });
  const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.38, 0).scale(1, 1.55, 1), coreMat); core.position.set(x, y + 1.6, z); core.name = 'idolheart';
  root.add(core);
  const veil = new THREE.Mesh(new THREE.IcosahedronGeometry(0.6, 1), new THREE.MeshBasicMaterial({ color: 0xa850ff, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false }));
  veil.position.copy(core.position); veil.renderOrder = 3; root.add(veil);
  return { core, veil, coreMat, glow: { x, y: y + 1.6, z, r: 4.2, c: 0xb060ff, light: true, lr: 9 } };
}

export function buildBrig(M, opt = {}) {
  const hulk = !!opt.hulk;
  const L = 26, Z0 = L / 2, WL = -1.6, QH = 1.2, FH = 1.0, TUM = 0.06, LIST = hulk ? -0.14 : 0, TRIM = hulk ? -0.06 : 0;   // the hulk lists 8 degrees and is down by the head
  const zAt = (s) => Z0 - s * L, sAt = (z) => (Z0 - z) / L;
  const beam = (s) => s < 0.35 ? 2.7 + 0.8 * Math.sin(s / 0.35 * Math.PI / 2) : s < 0.55 ? 3.5 : 3.5 * Math.pow(Math.max(0, 1 - ((s - 0.55) / 0.45) ** 2), 0.62);
  const sheer0 = (s) => 1.0 + 1.1 * (1 - sm(0.21, 0.27, s)) + 0.9 * sm(0.82, 0.88, s) + 0.55 * sm(0.9, 1, s) ** 2 + 0.25 * (1 - sm(0, 0.08, s));
  // the hulk's bulwarks are burnt through at GAPS (both sides; the starboard one at 0.56 is where boarders land)
  const GAPS = hulk ? [0.31, 0.56] : [], GW = 0.026;
  const sheer = (s) => sheer0(s) - GAPS.reduce((a, c) => a + 0.82 * (sm(c - GW - 0.006, c - GW + 0.003, s) - sm(c + GW - 0.003, c + GW + 0.006, s)), 0);
  const keel = (s) => -4 + 1.6 * (1 - sm(0, 0.22, s)) ** 2 + 3.3 * sm(0.8, 1, s) ** 1.7;
  const prof = (k) => Math.pow(Math.max(0, 1 - Math.pow(k, 2.6)), 0.6);
  const inner = (s) => Math.max(0, beam(s) * (1 - TUM) - 0.24);
  const deckAt = (s) => s < 0.25 ? QH : s > 0.85 ? FH : 0;
  const root = new THREE.Group(); root.name = hulk ? 'hulk' : 'brig';
  tideMats(M);
  const P = new Parts(M), glow = [], waves = [], sails = [];
  let idol = null, course = null;
  const HOLES = hulk ? [[1.6, zAt(0.69), 1.1, 1.4], [-2.3, zAt(0.44), 0.9, 1.5], [2.0, zAt(0.33), 0.9, 1.0]] : [];   // [x, z, w, d] on the main deck
  const TOP = hulk ? 'scorched' : 'tar', DECK = hulk ? 'scorched' : 'deck', DECK2 = hulk ? 'scorched' : 'deck2';
  const H = { L, beam, sheer, keel, prof, tumble: TUM, ns: hulk ? 230 : 96, transom: TOP, inner, deckAt, wall: hulk ? 'scorched' : 'redPaint', cap: 'blackwood',
    // tarred topsides, a red-lead gun strake, tar, a dark boot-top at the waterline, copper below
    bands: [[TOP, null, -0.1, 4], [hulk ? 'hullLow' : 'redPaint', -0.1, -1.1, 3], ['tar', -1.1, -1.42, 1], ['iron', -1.42, -1.78, 1], [hulk ? 'mossed' : 'copper', -1.78, null, 6]],
    decks: [[DECK, 0.245, 0.855, 0], [DECK2, 0.004, 0.25, QH], [DECK2, 0.85, 0.988, FH]] };
  const { hullX } = seaHull(P, H);
  for (const [y, th] of [[-0.1, 0.16], [-1.1, 0.16]]) wale(P, 'blackwood', H, hullX, y, th, 0.01, 0.985, 0.05);
  { const cuts = [0.01, ...GAPS.flatMap((c) => [c - GW - 0.01, c + GW + 0.01]), 0.985];                    // the upper wale breaks at the gaps
    for (let i = 0; i < cuts.length; i += 2) wale(P, 'blackwood', H, hullX, 0.55, 0.12, cuts[i], cuts[i + 1], 0.05); }
  // rudder, sternpost and the transom's stern windows, skull plate and a red-lit stern lantern
  P.add('blackwood', box(0.26, 5.2, 0.7, 0, -1.4, Z0 + 0.3)); for (const y of [-0.4, -1.6, -2.8]) P.add('iron', box(0.34, 0.1, 0.8, 0, y, Z0 + 0.3));
  for (const x of [-1.5, 0, 1.5]) {
    P.add(hulk ? 'dark' : 'tideGlass', box(0.8, 0.62, 0.06, x, 0.55, Z0 + 0.04));
    P.add('blackwood', box(0.98, 0.1, 0.14, x, 0.2, Z0 + 0.08)); P.add('blackwood', box(0.98, 0.1, 0.14, x, 0.9, Z0 + 0.08));
    for (const dx of [-0.45, 0, 0.45]) P.add('blackwood', box(0.08, 0.72, 0.12, x + dx, 0.55, Z0 + 0.08));
    if (!hulk) glow.push({ x, y: 0.55, z: Z0 + 0.3, r: 1.2, c: RED });
  }
  P.add(hulk ? 'tideChar' : 'redPaint', box(beam(0) * 1.8, 0.16, 0.18, 0, 1.12, Z0 + 0.06));
  skull(P, 0, 1.7, Z0 + 0.12, Math.PI, 0.62);
  P.add('iron', rod([0, sheer(0) + 0.1, Z0 - 0.15], [0, sheer(0) + 0.7, Z0 + 0.15], 0.06, 0.05, 6));
  P.add('iron', rod([0, sheer(0) + 0.7, Z0 + 0.15], [0, sheer(0) + 0.75, Z0 + 0.55], 0.05, 0.05, 5));
  if (!hulk) {
    glow.push({ ...lamp(P, 0, sheer(0) + 0.4, Z0 + 0.55, 1.8, RED, 'tideGlass'), r: 2.6, light: true, lr: 6 });
    for (const sd of [-1, 1]) glow.push({ ...lamp(P, sd * (inner(0.02) - 0.05), sheer(0.02) + 0.12, zAt(0.02), 1, RED, 'tideGlass'), r: 1.6 });
  } else P.add('iron', rod([0, sheer(0) + 0.75, Z0 + 0.55], [0.25, sheer(0) + 0.35, Z0 + 0.7], 0.04, 0.04, 4));        // the stern lantern torn away

  // the breaks: quarterdeck bulkhead with the great cabin door, forecastle bulkhead, side stairs, rails
  const zq = zAt(0.25), zf = zAt(0.85);
  P.add(hulk ? 'scorched' : 'scroll', box(inner(0.25) * 2, QH, 0.18, 0, QH / 2, zq - 0.09));
  P.add(hulk ? 'scorched' : 'scroll', box(inner(0.85) * 2, FH, 0.18, 0, FH / 2, zf + 0.09));
  const door = (x, z, face, w = 0.95, h = QH - 0.12) => {
    P.add('dark', box(w + 0.1, h, 0.06, x, h / 2, z + face * 0.04));
    if (!hulk) P.add('blackwood', box(w, h - 0.1, 0.05, x, h / 2 - 0.05, z + face * 0.08));
    for (const y of [0.25, h - 0.3]) P.add('iron', box(w * 0.6, 0.06, 0.04, x - w * 0.15, y, z + face * 0.11));
    for (const dx of [-1, 1]) P.add('redPaint', box(0.1, h + 0.04, 0.1, x + dx * (w / 2 + 0.05), h / 2, z + face * 0.08));
  };
  door(0, zq - 0.18, -1); door(0, zf + 0.18, 1, 0.85, FH - 0.08);
  for (const sx of [-1, 1]) { stairs(P, sx * 2.05, zq, 0, QH, -1, 1.25, 'step'); stairs(P, sx * 1.35, zf, 0, FH, 1, 1.05, 'step'); }
  rail(P, -1.42, hulk ? 0.3 : 1.42, QH, zq - 0.06, { post: 'blackwood', cap: 'redPaint' });
  rail(P, -0.82, 0.82, FH, zf + 0.06, { post: 'blackwood', cap: 'redPaint' });
  if (!hulk) for (const sx of [-1, 1]) glow.push({ ...lamp(P, sx * 1.42, QH + 0.72, zq - 0.06, 0.9, RED, 'tideGlass'), r: 1.4 });
  // the ship's bell on the forecastle rail
  P.add('blackwood', box(0.1, 0.9, 0.1, -0.25, FH + 0.75, zf + 0.06)); P.add('blackwood', box(0.1, 0.9, 0.1, 0.25, FH + 0.75, zf + 0.06));
  P.add('blackwood', box(0.66, 0.1, 0.14, 0, FH + 1.22, zf + 0.06));
  P.add('bronze', new THREE.CylinderGeometry(0.1, 0.2, 0.32, 10, 1, true).translate(0, FH + 1.0, zf + 0.06));

  // quarterdeck: the helm, a binnacle, two swivel guns, water casks to port
  const wheel = helm(M, P, 0, QH, zAt(0.11)); root.add(wheel);
  if (hulk) wheel.rotation.z = 0.6;
  P.add('blackwood', box(0.42, 0.9, 0.42, 0, QH + 0.45, zAt(0.11) - 1.3)); P.add('brass', new THREE.SphereGeometry(0.24, 10, 6, 0, TAU, 0, Math.PI / 2).translate(0, QH + 0.9, zAt(0.11) - 1.3));
  for (const sd of [-1, 1]) {
    const x = sd * (inner(0.05) - 0.1), z = zAt(0.05), y = sheer(0.05) + 0.12;
    P.add('iron', rod([x, y, z], [x, y + 0.3, z], 0.05, 0.05, 5));
    P.add('iron', rod([x - sd * 0.35, y + 0.35, z], [x + sd * 0.55, y + (hulk ? 0.05 : 0.38), z - 0.15], 0.09, 0.07, 8));
  }
  for (const [x, z, tip] of [[-2.1, zAt(0.18), 0], [-2.2, zAt(0.14), 0], [-1.5, zAt(0.165), hulk ? 1 : 0]]) {
    const g = (geo) => tip ? geo.rotateZ(Math.PI / 2).translate(x + 0.3, QH + 0.3, z) : geo.translate(x, QH + 0.4, z);
    P.add('cedar', g(new THREE.CylinderGeometry(0.3, 0.3, 0.8, 10)), { swap: true });
    for (const yy of [-0.26, 0.26]) P.add('iron', g(new THREE.CylinderGeometry(0.32, 0.32, 0.06, 10).translate(0, yy, 0)));
  }

  // main deck: a capstan, the main and fore gratings, the ship's boat on chocks to port, pin rails, the pump
  {
    const z = zAt(0.315);
    P.add('blackwood', new THREE.CylinderGeometry(0.62, 0.7, 0.18, 12).translate(0, 0.09, z));
    P.add('blackwood', new THREE.CylinderGeometry(0.36, 0.46, 0.75, 10).translate(0, 0.55, z));
    for (const y of [0.32, 0.72]) P.add('iron', new THREE.CylinderGeometry(0.45, 0.45, 0.06, 10).translate(0, y, z));
    P.add('cedar', new THREE.CylinderGeometry(0.58, 0.5, 0.24, 10).translate(0, 1.04, z));
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; P.add('dark', box(0.1, 0.12, 0.1, Math.cos(a) * 0.55, 1.04, z + Math.sin(a) * 0.55, -a)); }
    for (let i = 0; i < (hulk ? 1 : 4); i++) { const a = i / 4 * TAU + 0.4; P.add('cedar', rod([Math.cos(a) * 0.5, 1.04, z + Math.sin(a) * 0.5], [Math.cos(a) * 1.25, 1.02, z + Math.sin(a) * 1.25], 0.05, 0.05, 5)); }
  }
  grating(P, 0, 0, zAt(0.79), 1.2, 1.2); grating(P, 0, QH, zAt(0.2) + 0.2, 1.0, 1.0);
  if (!hulk) {
    grating(P, 0.5, 0, zAt(0.55), 1.4, 1.9);
    for (const z of [zAt(0.51), zAt(0.665)]) P.add('blackwood', box(1.5, 0.28, 0.28, -2.0, 0.14, z));
    dinghy(P, -2.0, 0.78, zAt(0.588), 4.3, 0.72, { mat: 'tar', inner: 'cypress', rim: 'redPaint' });
  }
  for (const sd of [-1, 1]) for (const [s0, s1] of [[0.37, 0.47], [0.67, 0.77]]) {
    const z0 = zAt(s0), z1 = zAt(s1), x = sd * (inner((s0 + s1) / 2) - 0.12);
    P.add('blackwood', box(0.2, 0.08, Math.abs(z1 - z0), x, 0.72, (z0 + z1) / 2));
    for (let z = z1 + 0.2; z < z0; z += hulk ? 0.71 : 0.32) P.add('cedar', rod([x, 0.6, z], [x, 0.9, z], 0.03, 0.024, 4));
  }

  // forecastle: two bow chasers, catheads with stocked anchors, hawse holes, the stem skull
  for (const sd of [-1, 1]) {
    if (!hulk || sd < 0) deckCannon(P, sd * 0.62, FH, zAt(0.925), Math.PI / 2 - sd * 0.1, { len: 1.9, r: 0.17, barrel: 'iron', carriage: 'blackwood', trim: 'redPaint' });
    else { P.add('iron', rod([0.3, FH + 0.2, zAt(0.9)], [1.1, FH + 0.22, zAt(0.9) - 1.5], 0.2, 0.17, 10)); P.add('blackwood', box(0.9, 0.35, 0.7, 0.9, FH + 0.18, zAt(0.88), 0.9)); }
    const s = 0.905, x = sd * (hullX(s, 2.1) + 0.05), z = zAt(s);
    P.add('blackwood', box(1.0, 0.24, 0.24, x + sd * 0.3, 2.15, z, sd * 0.25));
    if (!hulk || sd < 0) anchor(P, x + sd * 0.72, 2.0, z - 0.2, 0.75, Math.PI / 2);
    P.add('dark', new THREE.CylinderGeometry(0.16, 0.16, 0.2, 8).rotateZ(Math.PI / 2).translate(sd * (hullX(0.95, 0.9) + 0.02), 0.9, zAt(0.95)));
  }
  skull(P, 0, 1.55, zAt(1) - 0.3, 0, 0.95);
  for (const sd of [-1, 1]) P.add('iron', new THREE.ConeGeometry(0.07, 0.6, 4).rotateX(-Math.PI / 2 + 0.3).translate(sd * 0.3, 2.3, zAt(1) - 0.5));

  const sF = 0.72, sM = 0.42, zF = zAt(sF), zM = zAt(sM), rig = [];
  const spritBase = [0, 1.6, zAt(0.9)];
  if (!hulk) {
    // masts and spars: fore square-rigged (course, topsail, topgallant), main with a gaff mainsail and a square topsail
    mast(P, 0, 0, zF, 15.6, 0.34, { mat: 'cedar', band: 'iron', cap: 'iron', tops: [[6.2, 1.0], [10.4, 0.55]] });
    mast(P, 0, 0, zM, 17.4, 0.38, { mat: 'cedar', band: 'iron', cap: 'iron', tops: [[7.2, 1.15], [11.3, 0.6]] });
    fifeRail(P, 0, 0, zF, 0.75); fifeRail(P, 0, 0, zM, 0.8);
    const FY = [[5.6, 5.2], [9.7, 4.2], [12.7, 3.1]], MY = [[10.6, 4.2], [14.3, 3.3]];
    for (const [y, w] of FY) yard(P, 0, y, zF, w, 0.13, 'blackwood');
    for (const [y, w] of MY) yard(P, 0, y, zM, w, 0.12, 'blackwood');
    // patched black cloth painted per sail; the topsails' reef bands run crimson, straight along the yards
    const addSail = (mat, o) => { const s = wholeCloth(squareSail(mat, o)); root.add(s.mesh); sails.push(s); return s; };
    course = addSail(sailCloth(1, { base: [150, 34, 32], crimson: true, reefs: [0.84] }), { z: zF, y0: 1.95, y1: 5.5, w0: 5.3, w1: 4.9, belly: 1.3 });   // the crimson fore course
    addSail(sailCloth(2, { reefs: [0.6, 0.8] }), { z: zF, y0: 5.75, y1: 9.6, w0: 4.8, w1: 4.0, belly: 1.1 });
    addSail(sailCloth(3, { base: [40, 38, 44] }), { z: zF, y0: 9.85, y1: 12.6, w0: 3.9, w1: 2.95, belly: 0.8 });
    addSail(sailCloth(4, { reefs: [0.6, 0.8] }), { z: zM, y0: 10.75, y1: 14.2, w0: 4.0, w1: 3.15, belly: 0.9 });
    yard(P, 0, 6.8, zM, 4.3, 0.12, 'blackwood');                                                    // a dry main yard: it carries the corvus tackle
    // gaff mainsail: boom and gaff swung a little to port so the quarterdeck stays clear in the iso view
    const throat = [0, 8.7, zM + 0.4], tack = [0, 3.1, zM + 0.4], peak = [-0.9, 13.2, zM + 8.2], clew = [-1.3, 3.75, zM + 10.8];
    P.add('blackwood', rod(tack, [clew[0], clew[1], clew[2] + 0.4], 0.14, 0.1, 8), { swap: true });
    P.add('blackwood', rod(throat, [peak[0], peak[1] + 0.1, peak[2] + 0.3], 0.12, 0.08, 8), { swap: true });
    for (const p of [throat, tack]) P.add('iron', new THREE.TorusGeometry(0.42, 0.06, 4, 10).rotateX(Math.PI / 2).translate(0, p[1], zM));
    const main = wholeCloth(triSail(sailCloth(5, { reefs: [0.18, 0.34] }), throat, peak, clew, 0.9, -1, tack)); root.add(main.mesh); sails.push(main);
    P.add('blackwood', box(0.2, 1.7, 0.2, -1.3, QH + 0.85, zAt(0.04))); P.add('blackwood', box(0.9, 0.16, 0.24, -1.3, QH + 1.7, zAt(0.04)));   // boom crutch

    // bowsprit and jibboom, dolphin striker, two jibs
    const spritEnd = [0, 4.4, -19.6], jibEnd = [0, 5.5, -23.2];
    P.add('cedar', rod(spritBase, spritEnd, 0.3, 0.18, 10), { swap: true });
    P.add('cedar', rod([0, 3.9, -18.0], jibEnd, 0.14, 0.09, 8), { swap: true });
    P.add('iron', rod([0, 4.2, -19.2], [0, 4.6, -19.9], 0.24, 0.24, 8));
    const striker = [0, 2.6, -19.0]; P.add('iron', rod([0, 4.3, -19.3], striker, 0.06, 0.05, 5));
    const jib1 = wholeCloth(triSail(sailCloth(6, { base: [56, 53, 60] }), [0, 5.2, -22.4], [0, 10.0, -9.6], [0, 2.9, -13.6], 0.7, -1)); root.add(jib1.mesh); sails.push(jib1);
    const jib2 = wholeCloth(triSail(sailCloth(7), [0, 3.7, -17.4], [0, 5.9, -8.0], [0, 2.4, -11.2], 0.55, -1)); root.add(jib2.mesh); sails.push(jib2);

    // channels with chain plates and deadeyes, shrouds with ratlines, stays, backstays, braces, lifts
    for (const [s, top, ttop, topR, n] of [[sF, 6.1, 10.3, 1.0, 4], [sM, 7.1, 11.2, 1.15, 5]]) {
      const z = zAt(s);
      for (const sd of [-1, 1]) {
        channel(s, sd, n, top);
        rig.push(...shrouds([sd * 0.16, ttop, z], [sd * topR * 0.92, top + 0.15, z - 0.3], [sd * topR * 0.92, top + 0.15, z + 0.7], 3, 0.5));
        rig.push([sd * topR * 0.92, top + 0.1, z + 0.2], [sd * 0.3, top - 1.1, z + 0.1]);
        rig.push([sd * 0.1, ttop + (s === sF ? 2.6 : 3.4), z], [sd * (hullX(s - 0.08, 0.9) + 0.4), 0.9, zAt(s - 0.08)]);  // backstays
      }
    }
    rig.push([0, 6.1, zF], [0, 2.8, -15.5], [0, 10.3, zF], spritEnd, [0, 12.8, zF], jibEnd);                       // fore stays
    rig.push([0, 7.1, zM], [0, 1.0, zF + 0.5], [0, 11.2, zM], [0, 6.3, zF], [0, 14.4, zM], [0, 10.4, zF]);        // main stays
    rig.push(spritEnd, striker, jibEnd, striker, striker, [0, -0.9, zAt(0.985)], [0, 4.0, -18.4], [0, 0.4, zAt(0.995)]);
    for (const [y, w] of FY) for (const sd of [-1, 1]) {
      rig.push([sd * w, y, zF], [0, y + 2.4, zF]);                                                                   // lifts
      rig.push([sd * w, y, zF], [sd * 1.0, 11 - y * 0.35, zM]);                                                      // braces to the mainmast
    }
    for (const [y, w] of MY) for (const sd of [-1, 1]) { rig.push([sd * w, y, zM], [0, y + 2.2, zM]); rig.push([sd * w, y, zM], [sd * (inner(0.18) - 0.05), sheer(0.18) + 0.1, zAt(0.18)]); }
    for (const sd of [-1, 1]) rig.push([sd * 5.25, 1.95, zF - 1.2], [sd * (inner(0.6) - 0.05), sheer(0.6) + 0.1, zAt(0.6)]);    // course sheets
    rig.push(peak, [0, 15.6, zM], [0, 12.4, zM], [peak[0] * 0.5, 11.3, zM + 4.5], clew, [-0.6, sheer(0.01) + 0.1, zAt(0.01)]);

    // colours: a crimson pennant at the main truck, the black ensign at the gaff peak
    P.add('iron', rod([0, 17.3, zM], [0, 18.6, zM], 0.05, 0.04, 4));
    const pen = flag(M.bloodSail, 4.6, 0.75, [0, 18.55, zM], 0.18, 'pennant'); waves.push(pen); root.add(pen.mesh);
    const ens = flag(M.charcoal, 2.4, 1.5, [peak[0], peak[1] + 0.05, peak[2] + 0.4], 0.25, 'ensign'); waves.push(ens); root.add(ens.mesh);
    P.add('iron', rod([0, 15.5, zF], [0, 16.4, zF], 0.04, 0.035, 4));
    const fpen = flag(M.bloodSail, 2.6, 0.5, [0, 16.35, zF], 0.15, 'pennant'); waves.push(fpen); root.add(fpen.mesh);
    for (const s of [0.48, 0.66]) glow.push({ ...lamp(P, -(inner(s) + 0.1), sheer(s) + 0.12, zAt(s), 0.85, RED, 'tideGlass'), r: 1.4 });
  } else {
    // the hulk: the foremast snapped above its top, the main snapped low and its upper mast fallen across the quarterdeck,
    // the bowsprit broken short, the fore yard hanging askew with the crimson course in rags
    P.add('blackwood', rod([0, -0.1, zF], [0, 7.0, zF], 0.34, 0.27, 10), { swap: true });
    for (const y of [0.8, 2.7, 4.6]) P.add('iron', rod([0, y, zF], [0, y + 0.16, zF], 0.37, 0.37, 10));
    P.add('blackwood', new THREE.CylinderGeometry(1.0, 0.85, 0.14, 12).translate(0, 6.2, zF));
    P.add('iron', new THREE.TorusGeometry(1.0, 0.05, 4, 16, Math.PI * 1.3).rotateX(Math.PI / 2).translate(0, 6.28, zF));
    snapped(P, [0, 7.0, zF], 0.27, 'blackwood');
    P.add('blackwood', rod([0, -0.1, zM], [0, 3.6, zM], 0.38, 0.34, 10), { swap: true });
    snapped(P, [0, 3.6, zM], 0.34, 'blackwood', 8, [0.25, 1, 0.3]);
    fifeRail(P, 0, 0, zF, 0.75); fifeRail(P, 0, 0, zM, 0.8);
    const fall0 = [0.3, 2.2, zM + 1.2], fall1 = [4.6, 2.35, zAt(0.07)];             // the fallen main topmast, across to the starboard quarter
    P.add('blackwood', rod(fall0, fall1, 0.32, 0.22, 10), { swap: true });
    snapped(P, fall0, 0.32, 'blackwood', 7, fall0.map((v, i) => v - fall1[i]));
    P.add('blackwood', new THREE.CylinderGeometry(1.1, 0.95, 0.14, 12).rotateX(0.5).rotateZ(-0.3).translate(2.2, 2.0, zAt(0.2)));
    P.add('blackwood', rod([-1.8, 0.28, zAt(0.3)], [1.4, 1.42, zAt(0.16)], 0.12, 0.1, 8), { swap: true });             // its yard, wedged against the break
    P.add('blackwood', rod([-4.8, 4.9, zF + 0.1], [4.7, 6.1, zF - 0.1], 0.13, 0.1, 8), { swap: true });                // the fore yard askew
    // rags of the crimson course and black topsail hanging from it
    const rag = (i, red) => sailCloth(20 + i, { base: red ? [70, 18, 18] : [30, 27, 30], crimson: red, burnt: true, W: 32, H: 64, panel: 6 });
    const rags = [[-4.0, 1.4, rag(0)], [-2.7, 2.6, rag(1)], [-1.6, 1.0, rag(2, 1)], [-0.3, 3.1, rag(3)], [1.1, 1.8, rag(4)], [2.3, 2.7, rag(5, 1)], [3.6, 1.2, rag(6)]];
    for (const [x, len, mat] of rags) {
      const y1 = 4.9 + (x + 4.8) / 9.5 * 1.2 - 0.12, s = squareSail(mat, { z: zF + 0.15, y0: y1 - len, y1, w0: 0.28 + (len % 0.3), w1: 0.5, belly: 0.25 });
      wholeCloth(s); s.mesh.position.x = x; root.add(s.mesh); sails.push(s);
    }
    P.add('cedar', rod(spritBase, [0, 3.0, -15.6], 0.3, 0.26, 10), { swap: true }); snapped(P, [0, 3.0, -15.6], 0.26, 'cedar', 6, [0, 0.4, -1]);
    for (const sd of [-1, 1]) channel(sF, sd, 4, 6.1, sd > 0 ? 2 : 4);
    channel(sM, -1, 5, 3.4, 2); channel(sM, 1, 5, 3.4, 0);
    // dangling lines and a burnt crimson pennant on the fore stump
    for (const [a, b] of [[[-4.8, 4.9, zF], [-4.6, 1.4, zF + 0.6]], [[4.7, 6.1, zF], [4.2, 2.2, zF - 0.8]], [[0, 6.2, zF], [0, 0.9, zF + 4.6]], [[0, 7.0, zF], [0.2, 1.1, zF - 5.2]], [[0.3, 3.5, zM], [-2.9, 0.9, zM - 2.6]]]) {
      const m = a.map((v, i) => (v + b[i]) / 2 - (i === 1 ? 0.6 : 0)); rig.push(a, m, m, b);
    }
    P.add('iron', rod([0, 6.9, zF], [0, 8.6, zF], 0.04, 0.035, 4));
    const fpen = flag(M.bloodSail, 2.2, 0.5, [0, 8.55, zF], 0.2, 'pennant'); waves.push(fpen); root.add(fpen.mesh);
    // charred debris and planks torn up round the waist
    for (const [x, z, ry, l] of [[-2.4, zAt(0.4), 0.3, 1.8], [-2.6, zAt(0.68), -0.5, 1.4], [0.6, zAt(0.68), 1.2, 1.2], [-1.9, zAt(0.75), 0.9, 1.6], [2.4, zAt(0.33), 0.2, 1.2]]) P.add('scorched', box(0.32, 0.08, l, x, 0.05, z, ry));
    // holes burnt through the deck (unwalkable: info.holes): a void, jagged plank ends, a charred beam across, embers
    for (const [hx, hz, hw, hd] of HOLES) {
      P.add('tideChar', box(hw + 0.6, 0.012, hd + 0.6, hx, 0.004, hz));
      P.add('tideHold', box(hw, 0.02, hd, hx, 0.008, hz)); glow.push({ x: hx, y: 0.1, z: hz, r: 1.6, c: 0xff4010 });
      for (let x = hx - hw / 2 + 0.09; x < hx + hw / 2; x += 0.2) for (const e of [-1, 1]) {
        const l = 0.08 + Math.abs(Math.sin(x * 37 + e * 11 + hz)) * 0.35;
        P.add('scorched', box(0.18, 0.05, l, x, 0.005, hz + e * (hd / 2 - l / 2)));
        if (Math.sin(x * 53 + e * 7) > 0.4) P.add('tideEmber', box(0.15, 0.05, 0.04, x, 0.03, hz + e * (hd / 2 - l)));
      }
      for (const dz of [-0.25, 0.3]) P.add('tideChar', box(hw + 0.1, 0.06, 0.2, hx, 0.03, hz + dz * hd));     // charred joists across the hole
    }
    // the burnt-through bulwark gaps: snapped plank ends, glowing edges; the starboard landing marked in red and bone
    for (const c of GAPS) for (const sd of [-1, 1]) for (const e of [-1, 1]) {
      const sg = c + e * (GW - 0.003), z = zAt(sg);
      for (let i = 0; i < 3; i++) {
        const zz = z + e * (0.06 + i * 0.12), top = 0.35 + ((i * 5 + (sd + 2) * 3 + (e + 2)) % 4) * 0.17, x = sd * (hullX(sg, 0.4) - 0.08);
        P.add('scorched', box(0.16, top, 0.12, x, top / 2, zz));
        P.add('tideEmber', new THREE.ConeGeometry(0.05, 0.16, 3).translate(x, top + 0.04, zz));
      }
    }
    {
      const z = zAt(0.56), x = hullX(0.56, 0.5);
      for (const e of [-1, 1]) {
        P.add('boneWhite', rod([x - 0.12, 0, z + e * 0.85], [x - 0.05, 1.7, z + e * 0.85], 0.06, 0.05, 6));
        for (let i = 0; i < 3; i++) P.add('bloodSail', box(0.05, 0.5 - i * 0.1, 0.1, x + 0.02, 1.25 - i * 0.05, z + e * 0.85 + (i - 1) * 0.1, 0));
      }
      skull(P, x - 0.05, 1.95, z + 0.85, -Math.PI / 2, 0.36);
      for (const d of [-1, 1]) P.add('redPaint', box(0.16, 0.012, 1.5, x - 0.9, 0.015, z, d * 0.7));          // a red cross daubed on the landing
    }
    // fire climbing the topsides: charred tongues with ember edges above the stove ports
    for (const [s, k] of [[0.31, 1], [0.41, 2], [0.51, 4], [0.61, 5], [0.71, 7]]) for (const sd of [-1, 1]) {
      if ((k + (sd > 0 ? 1 : 0)) % 3 === 2) continue;
      for (let i = 0; i < 3; i++) {
        const z0 = zAt(s) + (i - 1) * 0.3, ya = 0.35 + ((k + i * 3) % 4) * 0.2, dz = Math.sin(k * 3 + i) * 0.25, out = (y) => sd * (hullX(s, y) + 0.035);
        const b0 = [out(-0.3), -0.3, z0 - 0.22], b1 = [out(-0.3), -0.3, z0 + 0.22], a = [out(ya), ya, z0 + dz];
        P.add('tideChar', tris([b0, b1, a], [0, 1, 2]));
        P.add('tideEmber', rod(b0, a, 0.022, 0.012, 3)); P.add('tideEmber', rod(b1, a, 0.022, 0.012, 3));
      }
    }
    // scorch round the idol, flecked with embers
    for (const [dx, dz, r] of [[0, 0, 2.1], [0.6, 0.5, 1.4], [-0.4, -0.7, 1.5]]) P.add('tideChar', new THREE.CircleGeometry(r, 12).rotateX(-Math.PI / 2).translate(-0.9 + dx, 0.006, zAt(0.585) + dz));
    for (let i = 0; i < 18; i++) { const a = i * 2.4, r = 1.3 + (i % 5) * 0.18; P.add('tideEmber', box(0.06, 0.02, 0.06, -0.9 + Math.cos(a) * r, 0.02, zAt(0.585) + Math.sin(a) * r)); }
    for (const [x, z] of [[2.6, zAt(0.66)], [-2.6, zAt(0.36)]]) P.add('cedar', new THREE.CylinderGeometry(0.3, 0.3, 0.8, 10).rotateZ(Math.PI / 2).rotateY(0.6).translate(x, 0.3, z), { swap: true });
    // red-black weed hanging off the hull: thick at the waterline, strands from the wales
    let q = 5; const rnd = () => (q = (q * 9301 + 49297) % 233280) / 233280;
    for (let s = 0.03; s < 0.97; s += 0.009) for (const sd of [-1, 1]) {
      if (rnd() < 0.2) continue;
      const hi = rnd() < 0.35, top = hi ? 0.5 - rnd() * 0.1 : -1.05 - rnd() * 0.35, len = hi ? 0.3 + rnd() * 0.8 : 0.5 + rnd() * 1.2, y = top - len / 2;
      // crimson over the scorched topsides, black over the red strake and at the waterline
      P.add(hi ? (rnd() < 0.75 ? 'bloodSail' : 'hullLow') : (rnd() < 0.5 ? 'hullLow' : 'bloodSail'),
        new THREE.ConeGeometry(0.07 + rnd() * 0.08, len, 4).rotateX(Math.PI).rotateZ(sd * 0.1).translate(sd * (hullX(s, y) + 0.05), y, zAt(s)));
      if (rnd() < 0.25) P.add('bloodSail', new THREE.SphereGeometry(0.12 + rnd() * 0.1, 5, 4).scale(0.5, 1, 1.6).translate(sd * (hullX(s, top) + 0.04), top, zAt(s)));
    }
    // the blood idol on the main deck, to port of the plank's landing
    idol = bloodIdol(M, P, root, -0.9, 0, zAt(0.585)); glow.push(idol.glow);
  }
  /** A channel on side sd at mast s: a ledge off the hull, chain plates, deadeyes; shrouds to the mast top (keep of n). */
  function channel(s, sd, n, top, keep = n) {
    const z = zAt(s), zs = z + 0.5, hx = hullX(s, 0.72), xo = sd * (hx + 0.5);
    P.add('blackwood', box(0.55, 0.12, 3.0, sd * (hx + 0.25), 0.72, zs));
    const f0 = [xo, 0.86, zs - 1.2], f1 = [xo, 0.86, zs + 1.3];
    if (keep === n) rig.push(...shrouds([sd * 0.3, top, z], f0, f1, n, 0.55));
    else for (let i = 0; i < keep; i++) rig.push([sd * 0.3, top, z], [xo, 0.86, zs - 1.2 + 2.5 * i / (n - 1)]);
    for (let i = 0; i < n; i++) {
      const zz = zs - 1.2 + 2.5 * i / (n - 1);
      P.add('blackwood', new THREE.CylinderGeometry(0.12, 0.12, 0.14, 8).rotateZ(Math.PI / 2).translate(xo, 0.84, zz));
      P.add('iron', rod([xo, 0.75, zz], [sd * (hullX(s, -0.05) + 0.06), -0.05, zz + 0.1], 0.035, 0.035, 4));
    }
  }
  root.add(lines(rig, M.rope));

  root.add(P.build(root.name));
  // the five-a-side gun deck: lids open, muzzles out (the hulk's stove in)
  {
    const G = new Parts(M); let k = 0;
    for (const s of [0.31, 0.41, 0.51, 0.61, 0.71]) for (const sd of [-1, 1]) {
      const x = sd * hullX(s, -0.6);
      if (hulk && (k++ % 3 !== 2)) stovePort(G, x, -0.6, zAt(s), sd, k);
      else gunPort(G, x, -0.6, zAt(s), sd, { lid: 'redPaint', frame: 'blackwood', gun: 'iron', size: 0.6, open: !hulk });
    }
    root.add(G.build('gundeck'));
  }
  // the corvus on the starboard waist: hinged at the rail, hauled up ~70 degrees by a tackle from the main yardarm
  const sP = 0.56, plankLen = 3.6;
  let plank = null, tackle = null;
  const yardArm = [4.15, 6.75, zM];
  if (!hulk) {
    plank = corvus(M, plankLen, 1.3, 1);
    plank.position.set(beam(sP) * (1 - TUM) + 0.06, sheer(sP) + 0.14, zAt(sP)); root.add(plank);
    const B = new Parts(M);
    B.add('blackwood', box(0.2, 0.36, 0.16, yardArm[0], yardArm[1] - 0.3, yardArm[2]));            // the upper block
    for (const dz of [-0.5, 0.5]) B.add('iron', box(0.6, 0.12, 0.12, beam(sP) * (1 - TUM) - 0.25, sheer(sP) + 0.2, zAt(sP) + dz));   // the hinge seat on the rail
    root.add(B.build('tackleblock'));
    tackle = new THREE.LineSegments(new THREE.BufferGeometry(), M.rope); tackle.name = 'tackle'; root.add(tackle);
  }
  const setPlank = (f) => {
    if (!plank) return;
    plank.userData.set(f); plank.updateMatrix();
    const tp = plank.userData.tip.clone().applyMatrix4(plank.matrix), up = [yardArm[0], yardArm[1] - 0.48, yardArm[2]];
    const pts = [[tp.x, tp.y, tp.z - 0.06], [up[0], up[1], up[2] - 0.06], [tp.x, tp.y, tp.z + 0.06], [up[0], up[1], up[2] + 0.06],
      [up[0], up[1] + 0.3, up[2]], [0.3, 6.6, zM], [0.3, 6.6, zM], [0.35, 0.9, zM + 0.8]];       // the fall leads in along the yard and down the mast
    tackle.geometry.setFromPoints(pts.map((q) => new THREE.Vector3(...q)));
  };
  setPlank(0);
  finish(root);
  // down by the head: everything goes into a body trimmed about the waterline; info points follow it
  const body = new THREE.Group(); body.name = 'trim';
  if (hulk) { body.add(...root.children); body.position.y = WL; body.rotation.x = TRIM; body.updateMatrix(); body.matrix.multiply(new THREE.Matrix4().makeTranslation(0, -WL, 0)); body.matrixAutoUpdate = false; root.add(body); }
  const tp = (q) => hulk ? new THREE.Vector3(q[0], q[1], q[2]).applyMatrix4(body.matrix).toArray().map((v) => +v.toFixed(3)) : [q[0], q[1], q[2]];
  for (const g of glow) [g.x, g.y, g.z] = tp([g.x, g.y, g.z]);
  root.rotation.z = LIST;

  const crew0 = hulk
    ? [[1.6, 0, zAt(0.56), 'pirate'], [2.2, 0, zAt(0.5), 'pirate'], [0.9, 0, zAt(0.66), 'pirate'], [-2.4, 0, zAt(0.6), 'pirate'], [1.4, 0, zAt(0.42), 'pirate'], [0.6, 0, zAt(0.5), 'pirate'], [-0.6, QH, zAt(0.08), 'pirate'], [0.4, FH, zAt(0.9), 'pirate']]
    : [[1.5, 0, -1.4, 'pirate'], [2.2, 0, 0.6, 'pirate'], [0.9, 0, -3.6, 'pirate'], [2.0, 0, -4.4, 'pirate'], [1.1, 0, 3.4, 'pirate'],
      [2.4, 0, 2.8, 'pirate'], [-1.0, 0, 2.6, 'pirate'], [0.9, QH, zAt(0.15), 'pirate'], [-0.6, QH, zAt(0.08), 'pirate'], [0.4, FH, zAt(0.88), 'pirate']];
  const crew = crew0.map((c) => [...tp(c), c[3]]);
  function anim(t) {
    for (const s of sails) s.update(t);
    for (const w of waves) w.update(t);
    if (hulk) {
      const p = 0.5 + 0.5 * Math.sin(t * 2.4) * Math.sin(t * 0.7 + 1);
      idol.core.rotation.y = t * 0.8; idol.coreMat.emissiveIntensity = 2.0 + 1.6 * p;
      idol.veil.scale.setScalar(1 + 0.25 * p); idol.veil.material.opacity = 0.12 + 0.14 * p;
    } else wheel.rotation.z = Math.sin(t * 0.6) * 0.35;
  }
  const info = { length: hulk ? L + 3 : L + 10, beam: 2 * beam(0.45), waterline: WL, hl: L / 2 * 0.94, hb: hullX(0.45, WL), glow, crew,
    plank: { x: beam(sP) * (1 - TUM) + 0.06, y: sheer(sP) + 0.14, z: zAt(sP), len: plankLen, side: 1 },
    walk: { L, zAt, sAt, inner, deckAt, QH, FH },
    // the side stairs as walk data ([x, z foot, y foot, z top, y top, width]): game arenas walk them (world/seaship.js)
    stairs: [-1, 1].flatMap((sx) => [[sx * 2.05, zq - 2.1, 0, zq + 0.5, QH, 1.25], [sx * 1.35, zf + 1.68, 0, zf - 0.5, FH, 1.05]]).map(([x, z0, y0, z1, y1, w]) => [...tp([x, y0, z0]), ...tp([x, y1, z1]), w]) };
  if (hulk) {
    info.list = LIST; info.trim = TRIM; info.idol = tp([-0.9, 0, zAt(0.585)]); info.idolCore = tp([-0.9, 1.6, zAt(0.585)]);
    info.idolParts = idol;   // the idol's heart and veil (a scenario breaks it: game/seascen/red_tide.js)
    info.holes = HOLES.map(([x, z, w, d]) => ({ c: tp([x, 0, z]), w, d }));                         // deck holes: centre (root frame), size
    info.landing = { c: tp([hullX(0.56, 0.5), 0.2, zAt(0.56)]), w: 2 * GW * L, side: 1 };            // the starboard bulwark gap boarders cross
  }
  /** k 0..1: 0 full sail; 1 the course brailed up to its yard and every other sail faded, so the decks show. */
  for (const sl of sails) sl.mesh.renderOrder = 3;                // faded sails draw after the sea (renderOrder 1)
  const setFightingSail = (k) => fightingSail(sails, { furl: 0.85 * k, alpha: 1 - 0.65 * k, courses: course ? [course] : [] });
  return { root, anim, info, setPlank, setRamp: setPlank, setFightingSail };
}

// =================================================================== the Grapple steamer
export function buildGrappler(M) {
  const L = 22, Z0 = L / 2, WL = -1.5;
  const zAt = (s) => Z0 - s * L, sAt = (z) => (Z0 - z) / L;
  const beam = (s) => s < 0.2 ? 2.4 + 0.8 * Math.sin(s / 0.2 * Math.PI / 2) : s < 0.7 ? 3.2 : 3.2 - 0.95 * Math.pow(sm(0.7, 1, s), 1.3);
  const sheer = (s) => 0.95 + 0.55 * sm(0.55, 1, s) + 0.2 * (1 - sm(0, 0.1, s));
  const keel = (s) => -3.5 + 0.9 * (1 - sm(0, 0.2, s)) ** 2 + 1.6 * Math.pow(sm(0.72, 1, s), 1.4);
  const prof = (k) => k < 0.58 ? 1 : 1 - Math.pow((k - 0.58) / 0.42, 1.6) * 0.82;
  const inner = (s) => Math.max(0, beam(s) - 0.2), deckAt = () => 0;
  tideMats(M);
  const root = new THREE.Group(); root.name = 'grappler';
  const P = new Parts(M), glow = [], fx = [], spin = [];
  const H = { L, beam, sheer, keel, prof, ns: 80, transom: 'plateRust', inner, deckAt, wall: 'plate', cap: 'gunmetal',
    bands: [['plateRust', null, 0.35, 2], ['plate', 0.35, -0.15, 1], ['plateRust', -0.15, -1.25, 3], ['redPaint', -1.25, -1.75, 1], ['copper', -1.75, null, 5]],
    decks: [['step', 0.01, 0.999, 0]] };
  const { hullX } = seaHull(P, H);
  endCap(P, 'plateRust', hullX, 1, zAt(1), 0, keel(1), -1);              // the bow below the ramp; above deck the ramp closes it
  wale(P, 'gunmetal', H, hullX, 0.35, 0.18, 0.005, 0.995, 0.06); wale(P, 'gunmetal', H, hullX, -1.25, 0.14, 0.005, 0.995, 0.05);
  // scuppers at the deck edge with orange rust bleeding down the plates, more weeping from the seams
  const streak = (s, y0, len, wd, sd) => {
    const z = zAt(s), o = (y) => sd * (hullX(s, y) + 0.035);
    P.add('tideRust', tris([[o(y0), y0, z - wd], [o(y0), y0, z + wd], [o(y0 - len), y0 - len, z + wd * 0.2]], [0, 1, 2]));
  };
  for (let s = 0.08, i = 0; s < 0.95; s += 0.065, i++) for (const sd of [-1, 1]) {
    if (s > 0.4 && s < 0.6) continue;
    P.add('dark', box(0.06, 0.12, 0.34, sd * (hullX(s, 0.08) + 0.02), 0.08, zAt(s)));
    streak(s, 0.02, 0.8 + ((i * 7 + (sd + 1)) % 5) * 0.14, 0.07, sd);
    if (i % 2) streak(s + 0.03, -0.18, 0.5 + (i % 3) * 0.25, 0.04, sd);
  }
  for (let s = 0.08, i = 0; s < 0.94; s += 0.075, i++) for (const sd of [-1, 1]) {
    if (s > 0.38 && s < 0.62) continue;
    const x = sd * (hullX(s, -0.62) + 0.03), lit = (i + (sd > 0 ? 1 : 0)) % 3 === 0;
    P.add('brass', new THREE.TorusGeometry(0.17, 0.045, 4, 10).rotateY(Math.PI / 2).translate(x, -0.62, zAt(s) + 0.37));
    P.add(lit ? 'ember' : 'dark', new THREE.CircleGeometry(0.15, 10).rotateY(sd * Math.PI / 2).translate(x - sd * 0.01, -0.62, zAt(s) + 0.37));
    if (lit) glow.push({ x: x + sd * 0.2, y: -0.62, z: zAt(s) + 0.37, r: 0.7, c: RED });
  }
  // rudder and stern: a skull plate, a red stern lamp, a stern roller for the tow chain
  P.add('iron', box(0.24, 3.2, 1.4, 0, -2.2, Z0 + 0.5));
  skull(P, 0, -0.2, Z0 + 0.06, Math.PI, 0.6);
  P.add('iron', new THREE.CylinderGeometry(0.28, 0.28, 1.6, 12).rotateZ(Math.PI / 2).translate(0, sheer(0) + 0.2, Z0 - 0.1));
  for (const sd of [-1, 1]) P.add('gunmetal', box(0.16, 0.6, 0.7, sd * 0.9, sheer(0) + 0.15, Z0 - 0.1));
  for (const sd of [-1, 1]) glow.push({ ...lamp(P, sd * 1.6, sheer(0.02) + 0.12, zAt(0.02), 1.2, RED), r: 1.8 });

  // paddle wheels in their boxes, on sponsons, a skull on each box
  const sW = 0.5, zW = zAt(sW), r = 2.0, w = 1.1, ax = WL + r * 0.55;
  for (const sd of [-1, 1]) {
    const x = sd * (beam(sW) + 0.2 + w / 2 + 0.15);
    const wheel = paddleWheel(M, P, x, ax, zW, r, w, sd, { box: 'plateRust', trim: 'iron', blade: 'blackwood', crest: 'redPaint' });
    root.add(wheel); spin.push(wheel);
    for (const [dz, len] of [[-1.5, 0.9], [-0.6, 1.3], [0.9, 0.8], [1.7, 1.1]]) {                     // rust weeping down the box face
      const fx0 = x + sd * (w / 2 + 0.17), yt = ax + Math.sqrt(Math.max(0, (r + 0.2) ** 2 - dz * dz)) - 0.1;
      P.add('tideRust', tris([[fx0, yt, zW + dz - 0.05], [fx0, yt, zW + dz + 0.05], [fx0, yt - len, zW + dz]], [0, 1, 2]));
    }
    const onDrum = (g, a, rr, dx = 0) => g.rotateX(Math.PI / 2 - a).translate(x + dx, ax + Math.sin(a) * rr, zW + Math.cos(a) * rr);
    for (const a of [0.35, 0.95, Math.PI / 2, Math.PI - 0.95, Math.PI - 0.35]) P.add('iron', onDrum(new THREE.BoxGeometry(w + 0.36, 0.08, 0.22), a, r + 0.37));
    for (let i = 0; i < 6; i++) P.add('dark', onDrum(new THREE.BoxGeometry(0.04, 0.5, 0.09), 0.25 + i * 0.53, r - 0.15, sd * (w / 2 + 0.16)));   // vent slots
    skull(P, x + sd * (w / 2 + 0.2), ax + 0.85, zW, sd > 0 ? -Math.PI / 2 : Math.PI / 2, 0.55);
    P.add('step', box(Math.abs(x) - beam(sW) + w / 2 + 0.2, 0.12, 6.6, sd * (beam(sW) + (Math.abs(x) - beam(sW) + w / 2) / 2), 0.0, zW));    // sponson deck
    for (const dz of [-3.2, 3.2]) P.add('iron', rod([sd * (beam(sW) - 0.1), -0.9, zW + dz * 0.7], [sd * (Math.abs(x) + w / 2), -0.05, zW + dz], 0.08, 0.08, 5));
    for (const dz of [-3.3, 3.3]) rail(P, sd * beam(sW), sd * (Math.abs(x) + w / 2 + 0.1), 0, zW + dz, { post: 'iron', cap: 'gunmetal', h: 0.9 });
  }

  // engine casing amidships, the armoured wheelhouse on it, the funnel behind
  const cz0 = zAt(0.37), cz1 = zAt(0.68), CH = 1.3, cw = 1.75;
  P.add('plateRust', box(cw * 2, CH, cz0 - cz1, 0, CH / 2, (cz0 + cz1) / 2));
  P.add('gunmetal', box(cw * 2 + 0.16, 0.12, cz0 - cz1 + 0.16, 0, CH + 0.06, (cz0 + cz1) / 2));
  for (const sd of [-1, 1]) {
    P.add('dark', box(0.06, 1.05, 0.8, sd * (cw + 0.02), 0.55, zAt(0.42))); P.add('iron', box(0.05, 1.0, 0.72, sd * (cw + 0.05), 0.52, zAt(0.42)));
    for (const s of [0.47, 0.53, 0.59]) { P.add('tideGlass', box(0.05, 0.3, 0.4, sd * (cw + 0.02), 0.9, zAt(s))); P.add('iron', box(0.06, 0.36, 0.46, sd * (cw + 0.03), 0.9, zAt(s))); glow.push({ x: sd * (cw + 0.2), y: 0.9, z: zAt(s), r: 0.8, c: RED }); }
  }
  rail(P, -cw, cw, CH + 0.12, cz0, { post: 'iron', cap: 'gunmetal', h: 0.8 });
  for (const sd of [-1, 1]) stairs(P, sd * (cw - 0.55), cz0, 0, CH, 1, 0.9, 'plateDeck');
  {
    // the wheelhouse: sloped armour faces, slit windows lit red, rivets, a roof with a searchlight and a flagstaff
    const y0 = CH + 0.12, h = 2.5, zb = zAt(0.585), zf = zAt(0.675), xb = 1.6, xt = 1.2, zt0 = zb, zt1 = zf + 0.5;
    const pts = [[-xb, y0, zf], [xb, y0, zf], [xb, y0, zb], [-xb, y0, zb], [-xt, y0 + h, zt1], [xt, y0 + h, zt1], [xt, y0 + h, zt0], [-xt, y0 + h, zt0]];
    const idx = [0, 1, 5, 0, 5, 4, 1, 2, 6, 1, 6, 5, 2, 3, 7, 2, 7, 6, 3, 0, 4, 3, 4, 7, 4, 5, 6, 4, 6, 7];
    P.add('plate', tris(pts, idx));
    const yl = y0 + h * 0.62, fz = lerp3(zf, zt1, 0.62);
    for (const dx of [-0.75, 0, 0.75]) { P.add('ember', box(0.5, 0.08, 0.06, dx, yl, fz - 0.06)); glow.push({ x: dx, y: yl, z: fz - 0.2, r: 0.9, c: RED }); }
    P.add('gunmetal', box(2.5, 0.16, 0.12, 0, yl - 0.16, fz - 0.05));
    P.add('iron', box(2.7, 0.14, 0.55, 0, yl + 0.2, fz - 0.2).translate(0, -yl - 0.2, -fz + 0.2).rotateX(0.25).translate(0, yl + 0.2, fz - 0.2));   // the visor brow
    for (let i = 0; i < 7; i++) P.add('iron', new THREE.ConeGeometry(0.07, 0.42, 4).translate(-xt + i * xt / 3, y0 + h + 0.35, zt1 - 0.05));
    for (const sd of [-1, 1]) for (const zz of [zt1 + 0.3, zt0 - 0.3]) P.add('iron', new THREE.ConeGeometry(0.07, 0.4, 4).translate(sd * (xt + 0.1), y0 + h + 0.34, zz));
    for (const sd of [-1, 1]) {
      const xs = sd * ((xb + xt) / 2 + 0.03);
      P.add('ember', box(0.06, 0.08, 0.8, xs, yl, (zb + zf) / 2)); glow.push({ x: xs + sd * 0.15, y: yl, z: (zb + zf) / 2, r: 0.8, c: RED });
      for (let i = 0; i < 5; i++) for (const yy of [y0 + 0.25, y0 + h - 0.3]) P.add('iron', new THREE.SphereGeometry(0.05, 4, 3).translate(sd * (lerp3(xb, xt, (yy - y0) / h) + 0.02), yy, zf + 0.25 + i * (zb - zf - 0.5) / 4));
      const xd = sd * (lerp3(xb, xt, 0.3) + 0.03); P.add('dark', box(0.06, 1.4, 0.7, xd, y0 + 0.72, zb - 0.5)); P.add('iron', box(0.05, 1.3, 0.62, xd + sd * 0.03, y0 + 0.7, zb - 0.5));
    }
    P.add('gunmetal', box(xt * 2 + 0.4, 0.14, zt0 - zt1 + 0.4, 0, y0 + h + 0.07, (zt0 + zt1) / 2));
    const ry = y0 + h + 0.14;
    P.add('brass', new THREE.CylinderGeometry(0.3, 0.34, 0.5, 12).rotateX(Math.PI / 2).translate(0.6, ry + 0.45, zt1 + 0.2));
    P.add('glass', new THREE.CircleGeometry(0.27, 12).rotateY(Math.PI).translate(0.6, ry + 0.45, zt1 - 0.06));
    P.add('iron', box(0.4, 0.3, 0.3, 0.6, ry + 0.15, zt1 + 0.25));
    glow.push({ x: 0.6, y: ry + 0.45, z: zt1 - 0.3, r: 2.2, c: 0xffc070, light: true, lr: 7 });
    P.add('brass', rod([-0.7, ry, zt0 - 0.4], [-0.7, ry + 0.8, zt0 - 0.4], 0.07, 0.07, 6)); P.add('brass', new THREE.ConeGeometry(0.18, 0.45, 8, 1, true).rotateX(Math.PI / 2).translate(-0.7, ry + 0.9, zt0 - 0.65));
    P.add('iron', rod([-0.9, ry, zt0 - 0.2], [-0.9, ry + 4.2, zt0 - 0.1], 0.06, 0.05, 6));
    const fl = flag(M.patched, 2.6, 1.6, [-0.9, ry + 4.15, zt0 - 0.1], 0.25, 'flag'); fx.push(fl); root.add(fl.mesh);
    P.add('iron', rod([-0.9, ry + 4.2, zt0 - 0.1], [-0.9, ry + 4.9, zt0 - 0.1], 0.04, 0.04, 4));
    const pn = flag(M.bloodSail, 3.2, 0.5, [-0.9, ry + 4.9, zt0 - 0.1], 0.15, 'pennant'); fx.push(pn); root.add(pn.mesh);
  }
  {
    const fz = zAt(0.49);
    const sk = funnel(P, 0, CH + 0.1, fz, 0.72, 7.6, { mat: 'plateRust', band: 'iron', cap: 'gunmetal', rake: 0.1, tint: ['#2a2628', '#1a1819'], rise: 5, size: 2.0, n: 11 });
    sk.grp.children.forEach((o) => { o.renderOrder = 3; }); root.add(sk.grp); fx.push(sk);   // drawn after the sea (renderOrder 1) so it shows over water
    P.add('redPaint', rod([0, CH + 0.1 + 7.6 * 0.72, fz + 0.76], [0, CH + 0.1 + 7.6 * 0.72 + 0.5, fz + 0.81], 0.75, 0.75, 16));
    for (const [a, y, len] of [[0.2, 5.6, 1.4], [-0.5, 5.5, 1.0], [0.9, 2.9, 1.2], [-1.2, 3.0, 0.9], [2.2, 5.5, 1.3]]) {   // rust runs down the stack
      const yy = CH + 0.1 + y - len / 2, zz = fz + 0.1 * (yy - CH - 0.1);
      P.add('tideRust', box(0.03, len, 0.12, Math.cos(a) * 0.73, yy, zz - Math.sin(a) * 0.73, a));
    }
    P.add('brass', rod([0.55, CH + 0.1, fz + 0.4], [0.62, CH + 6.2, fz + 1.0], 0.1, 0.1, 6));                   // steam pipe and whistle
    P.add('brass', new THREE.CylinderGeometry(0.13, 0.16, 0.5, 8).translate(0.63, CH + 6.45, fz + 1.02));
    for (const sd of [-1, 1]) P.add('iron', rod([sd * 0.6, CH + 5.4, fz + 0.54], [sd * (cw - 0.1), CH + 0.12, fz + (sd > 0 ? 1.4 : -1.4)], 0.03, 0.03, 4));
    for (const sd of [-1, 1]) { P.add('iron', rod([sd * 1.05, CH + 0.1, zAt(0.43)], [sd * 1.05, CH + 1.6, zAt(0.43)], 0.22, 0.22, 10)); P.add('iron', new THREE.SphereGeometry(0.3, 8, 5, 0, TAU, 0, Math.PI / 2).translate(sd * 1.05, CH + 1.6, zAt(0.43))); P.add('dark', new THREE.CircleGeometry(0.2, 8).translate(sd * 1.05, CH + 1.65, zAt(0.43) - 0.31)); }  // vents
  }

  // aft deck: a towing winch, H-bitts, a towing arch, bollards, the heavy tow chain over the stern roller; cargo to port
  {
    const zw = zAt(0.33);
    P.add('iron', new THREE.CylinderGeometry(0.55, 0.55, 2.2, 14).rotateZ(Math.PI / 2).translate(0, 0.75, zw));
    for (const sd of [-1, 1]) { P.add('plateRust', box(0.2, 1.4, 1.4, sd * 1.2, 0.7, zw)); P.add('iron', new THREE.CylinderGeometry(0.62, 0.62, 0.08, 14).rotateZ(Math.PI / 2).translate(sd * 1.08, 0.75, zw)); }
    for (let i = 0; i < 9; i++) P.add('dark', new THREE.TorusGeometry(0.58, 0.05, 4, 14).rotateY(Math.PI / 2).translate(-0.9 + i * 0.22, 0.75, zw));
    const zb = zAt(0.2);
    for (const sd of [-1, 1]) { P.add('iron', rod([sd * 0.55, 0, zb], [sd * 0.55, 1.0, zb], 0.17, 0.17, 10)); P.add('gunmetal', new THREE.CylinderGeometry(0.22, 0.22, 0.1, 10).translate(sd * 0.55, 1.03, zb)); }
    P.add('iron', rod([-0.9, 0.7, zb], [0.9, 0.7, zb], 0.09, 0.09, 6));
    for (const s of [0.08]) for (const sd of [-1, 1]) { const x = sd * (inner(s) - 0.35); P.add('iron', rod([x, 0, zAt(s)], [x, 0.55, zAt(s)], 0.15, 0.13, 8)); P.add('gunmetal', new THREE.CylinderGeometry(0.2, 0.2, 0.08, 8).translate(x, 0.58, zAt(s))); }
    // towing arch over the aft deck
    const za = zAt(0.12), ah = 2.6;
    const arch = []; for (let i = 0; i <= 12; i++) { const a = Math.PI * i / 12; arch.push([-Math.cos(a) * (inner(0.12) - 0.25), 0.4 + Math.sin(a) * ah, za]); }
    for (let i = 0; i < arch.length - 1; i++) P.add('iron', rod(arch[i], arch[i + 1], 0.13, 0.13, 6));
    for (const sd of [-1, 1]) P.add('plateRust', box(0.4, 0.5, 0.5, sd * (inner(0.12) - 0.25), 0.25, za));
    // the tow chain: wound off the winch, round the bitts, over the roller, down into the sea
    chainPath(P, [[0.1, 0.18, zw + 0.6], [0.2, 0.12, zb - 0.4], [0.55, 0.65, zb], [0.2, 0.3, zb + 0.5], [0.05, 0.14, Z0 - 1.6], [0, sheer(0) + 0.5, Z0 - 0.1], [0, -0.4, Z0 + 1.2], [0, WL - 0.4, Z0 + 2.2]], 'iron', 0.12, 0.04);
    cargo(P, -1.9, 0, zAt(0.24), 4, 7);
    for (const [x, z] of [[-2.2, zAt(0.07)], [-1.5, zAt(0.05)]]) {
      P.add('plateRust', new THREE.CylinderGeometry(0.32, 0.32, 0.9, 10).translate(x, 0.45, z), { swap: true });
      for (const y of [0.12, 0.78]) P.add('iron', new THREE.CylinderGeometry(0.34, 0.34, 0.06, 10).translate(x, y, z));
    }
    // fenders of old cable hanging on chains off the bulwark
    for (const s of [0.1, 0.25, 0.75, 0.88]) for (const sd of [-1, 1]) {
      const x = sd * (hullX(s, 0.2) + 0.25), z = zAt(s);
      P.add('hullLow', new THREE.TorusGeometry(0.32, 0.14, 6, 12).rotateY(Math.PI / 2).translate(x, 0.1, z));
      P.add('iron', rod([x, 0.42, z], [sd * (beam(s) + 0.02), sheer(s) + 0.12, z], 0.03, 0.03, 4));
    }
  }

  // fore deck: the coal bunker to port, a hatch, the crane on its turntable, the bow gallows and the drop ramp
  {
    const bz = cz1 - 0.55, bx = -0.85;                                     // the coal bunker against the casing's front
    P.add('plateRust', box(1.7, 0.8, 0.12, bx, 0.4, bz - 0.45)); for (const e of [-1, 1]) P.add('plateRust', box(0.12, 0.8, 0.95, bx + e * 0.85, 0.4, bz));
    P.add('dark', new THREE.ConeGeometry(0.85, 0.75, 7).scale(1.0, 1, 0.6).translate(bx, 0.72, bz + 0.05));
    let q = 3; const rnd = () => (q = (q * 9301 + 49297) % 233280) / 233280;
    for (let i = 0; i < 20; i++) { const a = rnd() * TAU, rr = rnd() * 0.7; P.add('gunmetal', new THREE.DodecahedronGeometry(0.09 + rnd() * 0.08).translate(bx + Math.cos(a) * rr, 0.6 + (0.7 - rr) * 0.45, bz + Math.sin(a) * rr * 0.5)); }
    for (const [dx, dz] of [[0.3, -0.75], [-0.4, -0.85]]) P.add('gunmetal', box(0.4, 0.06, 0.5, bx + dx, 0.03, bz + dz, 0.4));     // spilled coal
    P.add('iron', rod([bx + 1.0, 0.1, bz - 0.5], [bx + 1.2, 1.1, bz - 0.1], 0.03, 0.03, 4)); P.add('iron', box(0.28, 0.05, 0.34, bx + 0.98, 0.1, bz - 0.55));
    grating(P, 1.5, 0, zAt(0.735), 1.0, 1.1, 'iron', 'gunmetal');
  }
  // the bow gallows that hold the ramp chains, with a chain winch
  const gz = zAt(0.955), gx = 1.95, gy = 4.4;
  for (const sd of [-1, 1]) {
    P.add('iron', rod([sd * gx, 0, gz], [sd * gx, gy, gz], 0.16, 0.13, 8));
    P.add('iron', rod([sd * gx, 0, gz + 1.4], [sd * gx, gy - 0.4, gz], 0.08, 0.08, 6));
    P.add('gunmetal', new THREE.CylinderGeometry(0.28, 0.28, 0.18, 12).rotateZ(Math.PI / 2).translate(sd * gx, gy - 0.15, gz - 0.2));
  }
  P.add('iron', box(gx * 2 + 0.3, 0.3, 0.3, 0, gy, gz));
  for (const sd of [-1, 1]) P.add('iron', new THREE.ConeGeometry(0.1, 0.5, 4).translate(sd * gx, gy + 0.4, gz));
  P.add('iron', new THREE.CylinderGeometry(0.35, 0.35, 2.6, 12).rotateZ(Math.PI / 2).translate(0, 0.6, gz + 1.0));
  for (const sd of [-1, 1]) P.add('plateRust', box(0.18, 1.0, 0.9, sd * 1.35, 0.5, gz + 1.0));
  for (const sd of [-1, 1]) chainPath(P, [[sd * 1.0, 0.95, gz + 1.0], [sd * (gx - 0.15), gy - 0.4, gz - 0.1]], 'iron', 0.08, 0.03);
  for (const sd of [-1, 1]) glow.push({ ...lamp(P, sd * (gx + 0.05), gy + 0.15, gz + 0.2, 1, RED), r: 1.8 });

  root.add(P.build('grappler'));

  // the drop ramp: a riveted iron drawbridge hinged at the bow, spiked at its lip, a skull on its face
  const rampLen = 3.8, rampW = 2 * inner(1) - 0.1, hz = zAt(1) + 0.02, hy = 0.06;
  const ramp = new THREE.Group(); ramp.position.set(0, hy, hz); root.add(ramp);
  {
    const R = new Parts(M);
    R.add('plateRust', box(rampW, 0.18, rampLen, 0, 0, -rampLen / 2));
    for (let z = 0.4; z < rampLen; z += 0.42) R.add('iron', box(rampW - 0.2, 0.07, 0.08, 0, 0.12, -z));
    for (const sd of [-1, 1]) R.add('iron', box(0.16, 0.36, rampLen, sd * (rampW / 2 - 0.08), 0.1, -rampLen / 2));
    for (const sd of [-1, 0.33, -0.33, 1]) R.add('iron', box(0.12, 0.14, rampLen, sd * rampW * 0.38, -0.15, -rampLen / 2));
    R.add('iron', rod([-rampW / 2 - 0.15, 0, 0], [rampW / 2 + 0.15, 0, 0], 0.09, 0.09, 8));                       // the hinge pin
    for (const k of [-3, -1, 1, 3]) R.add('iron', new THREE.CylinderGeometry(0.22, 0.22, 0.42, 10).rotateZ(Math.PI / 2).translate(k * rampW / 8, 0, 0));
    for (let i = 0; i < 9; i++) R.add('iron', new THREE.ConeGeometry(0.1, 0.55, 4).rotateX(-Math.PI / 2 - 0.9).translate(-rampW / 2 + 0.25 + i * (rampW - 0.5) / 8, -0.2, -rampLen - 0.05));
    for (let x = -rampW / 2 + 0.2; x < rampW / 2; x += 0.4) for (const z of [0.2, rampLen / 2, rampLen - 0.2]) R.add('iron', new THREE.SphereGeometry(0.045, 4, 3).translate(x, -0.1, -z));
    ramp.add(R.build('ramp'));
    // a skull on the underside: built facing -Z, turned to face -Y so it glares forward when the ramp is raised
    const S = new Parts(M); skull(S, 0, 0, 0, 0, 0.95); const sg = S.build('rampskull');
    sg.rotation.x = -Math.PI / 2; sg.position.set(0, -0.3, -rampLen * 0.55); ramp.add(sg);
  }
  {   // the deck half of the hinge: knuckles between the ramp's, on lugs down the bow face
    const K = new Parts(M);
    for (const k of [-4, -2, 0, 2, 4]) {
      const x = k * rampW / 8 * (Math.abs(k) === 4 ? 0.94 : 1);
      K.add('iron', new THREE.CylinderGeometry(0.22, 0.22, 0.36, 10).rotateZ(Math.PI / 2).translate(x, hy, hz));
      K.add('plate', box(0.34, 0.6, 0.2, x, hy - 0.32, hz + 0.08));
    }
    for (const e of [-1, 1]) K.add('gunmetal', new THREE.CylinderGeometry(0.13, 0.13, 0.1, 8).rotateZ(Math.PI / 2).translate(e * (rampW / 2 + 0.2), hy, hz));
    root.add(K.build('hinge'));
  }
  const chains = [liveChain(M), liveChain(M)]; chains.forEach((c) => root.add(c.mesh));
  const tipL = new THREE.Vector3();
  const setRamp = (f) => {
    ramp.rotation.x = Math.PI / 2 * (1 - f) - 0.12 * f;
    ramp.updateMatrix();
    chains.forEach((c, i) => {
      const sd = i ? 1 : -1; tipL.set(sd * (rampW / 2 - 0.15), 0.15, -rampLen + 0.15).applyMatrix4(ramp.matrix);
      c.set([tipL.x, tipL.y, tipL.z], [sd * (gx - 0.12), gy - 0.15, gz - 0.3], 0.15 + 0.3 * f);
    });
  };
  setRamp(0);

  // the crane: a turntable, a cab with a counterweight, an A-frame, a lattice boom, and the grapple on its chain
  const crane = new THREE.Group(); crane.position.set(0.2, 0, zAt(0.81)); root.add(crane);
  const pend = new THREE.Group(), head = new THREE.Group();
  const boomL = 9.6, elev = 0.7, piv = [0.5, 1.7, 0], tip = [piv[0] + Math.cos(elev) * boomL, piv[1] + Math.sin(elev) * boomL, 0];
  {
    const C = new Parts(M);
    P.add('iron', new THREE.CylinderGeometry(1.25, 1.4, 0.35, 18).translate(crane.position.x, 0.17, crane.position.z));
    C.add('gunmetal', new THREE.CylinderGeometry(1.15, 1.15, 0.16, 18).translate(0, 0.43, 0));
    for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; C.add('iron', new THREE.SphereGeometry(0.06, 4, 3).translate(Math.cos(a) * 1.1, 0.52, Math.sin(a) * 1.1)); }
    C.add('plateRust', box(1.6, 1.3, 1.5, -0.35, 1.15, 0));                                  // the cab
    C.add('iron', box(0.9, 1.0, 1.6, -1.45, 1.0, 0));                                     // the counterweight
    C.add('dark', box(0.06, 0.4, 0.8, 0.46, 1.4, 0)); C.add('ember', box(0.04, 0.12, 0.7, 0.47, 1.4, 0));
    C.add('iron', new THREE.CylinderGeometry(0.4, 0.4, 1.2, 12).rotateX(Math.PI / 2).translate(-0.2, 1.95, 0));      // hoist drum
    C.add('flaked', rod([-0.2, 1.8, 0], [-0.15, 3.6, 0.15], 0.12, 0.12, 6));
    const af = [-0.6, 4.6, 0];
    for (const dz of [-0.55, 0.55]) { C.add('iron', rod([-0.9, 1.8, dz], af, 0.1, 0.08, 6)); C.add('iron', rod([0.35, 1.8, dz], af, 0.1, 0.08, 6)); }
    C.add('iron', new THREE.CylinderGeometry(0.18, 0.18, 0.4, 10).rotateX(Math.PI / 2).translate(...af));
    // lattice boom: four chords tapering to the tip, zigzag lacing
    const chord = (u, a, b) => { const k = 1 - 0.55 * u, p = [piv[0] + (tip[0] - piv[0]) * u, piv[1] + (tip[1] - piv[1]) * u, 0]; return [p[0] - Math.sin(elev) * a * k, p[1] + Math.cos(elev) * a * k, b * k]; };
    const cs = [[0.32, 0.4], [0.32, -0.4], [-0.32, 0.4], [-0.32, -0.4]];
    for (const [a, b] of cs) C.add('flaked', rod(chord(0, a, b), chord(1, a, b), 0.07, 0.05, 6));
    for (let i = 0; i < 12; i++) {
      const u0 = i / 12, u1 = (i + 1) / 12;
      for (const b of [0.4, -0.4]) C.add('iron', rod(chord(u0, i % 2 ? 0.32 : -0.32, b), chord(u1, i % 2 ? -0.32 : 0.32, b), 0.03, 0.03, 4));
      for (const a of [0.32, -0.32]) C.add('iron', rod(chord(u0, a, i % 2 ? 0.4 : -0.4), chord(u1, a, i % 2 ? -0.4 : 0.4), 0.03, 0.03, 4));
    }
    C.add('iron', new THREE.CylinderGeometry(0.3, 0.3, 0.3, 12).rotateX(Math.PI / 2).translate(...tip));
    C.add('gunmetal', new THREE.CylinderGeometry(0.2, 0.2, 1.1, 10).rotateX(Math.PI / 2).translate(...piv));
    crane.add(C.build('crane'));
    crane.add(lines([af, tip, af, [tip[0] - 1.2, tip[1] - 0.6, 0.2]], M.rope, 'cranewire'));
    { const CC = new Parts(M); chainPath(CC, [[tip[0], tip[1] - 0.3, 0], [-0.1, 2.35, 0], [-0.2, 1.6, 0.4], [0, 0.45, 0.2]], 'iron', 0.095, 0.034); crane.add(CC.build('cranechain')); }
    // the grapple: a heavy chain and four great barbed tines, swinging from the boom tip
    pend.position.set(...tip);
    const C2 = new Parts(M), G = new Parts(M), cl = 3.4;
    chainPath(C2, [[0, -0.2, 0], [0, -cl, 0]], 'iron', 0.095, 0.034);
    pend.add(C2.build('grapplechain'));
    const gy0 = -cl - 0.2;
    shackle(G, 0, gy0 + 0.12, 0, 1.2);
    G.add('iron', new THREE.TorusGeometry(0.22, 0.07, 5, 10).translate(0, gy0 + 0.05, 0));
    G.add('iron', rod([0, gy0 - 0.1, 0], [0, gy0 - 1.7, 0], 0.13, 0.15, 8));
    G.add('gunmetal', new THREE.CylinderGeometry(0.24, 0.24, 0.28, 8).translate(0, gy0 - 0.35, 0));
    G.add('iron', new THREE.SphereGeometry(0.24, 8, 6).translate(0, gy0 - 1.75, 0));
    for (let i = 0; i < 4; i++) {
      const a = i / 4 * TAU + Math.PI / 4, c = Math.cos(a), s = Math.sin(a), pts = [];
      for (let j = 0; j <= 5; j++) { const th = j / 5 * Math.PI * 0.55; pts.push([c * (0.15 + Math.sin(th) * 1.05), gy0 - 1.75 + (1 - Math.cos(th)) * 0.95, s * (0.15 + Math.sin(th) * 1.05)]); }
      pts.push([c * 0.95, gy0 - 0.45, s * 0.95]);                                        // hooked back in, point up
      for (let j = 0; j < 6; j++) G.add('iron', rod(pts[j], pts[j + 1], 0.13 - j * 0.012, 0.12 - j * 0.012, 6));
      const e = pts[6], d0 = pts[6].map((v, k) => v - pts[5][k]), dl = Math.hypot(...d0);
      G.add('gunmetal', rod(e, e.map((v, k) => v + d0[k] / dl * 0.55), 0.13, 0.0, 5));
      G.add('gunmetal', rod([e[0] - c * 0.05, e[1] - 0.05, e[2] - s * 0.05], [e[0] - c * 0.4, e[1] - 0.25, e[2] - s * 0.4], 0.07, 0.0, 4));   // the barb
    }
    head.add(G.build('grapple')); pend.add(head); crane.add(pend);
    const mk = new THREE.Object3D(); mk.name = 'grapple:crane'; mk.position.set(0, gy0 + 0.12, 0); head.add(mk);
  }
  // two swivel grapnel launchers on the bow quarters; all three chains run aft through fairleads to the towing winch,
  // which hauls whatever they bite from astern. Markers 'grapple:*' sit on the shackles at the biting ends.
  {
    const W = new Parts(M), zw = zAt(0.33), FL = [0.8, 0.7, 0.6, 0.47, 0.39];
    const lane = (s, sd, d = 0) => sd * (inner(s) - 0.3 - d);
    const run = (sd, d, start) => {
      const pts = [...start];
      FL.forEach((s, i) => { if (i) pts.push([lane((s + FL[i - 1]) / 2, sd, d), 0.1, zAt((s + FL[i - 1]) / 2)]); pts.push([lane(s, sd, d), 0.28, zAt(s)]); });
      pts.push([sd * (1.15 + d), 0.12, zw - 0.95], [sd * (0.75 - d), 1.25, zw - 0.2]);
      chainPath(W, pts, 'iron', 0.095, 0.034);
    };
    for (const sd of [-1, 1]) for (const s of FL) {                                    // fairleads: a ring on a post at the bulwark foot
      const x = lane(s, sd, sd < 0 ? 0.12 : 0), z = zAt(s);
      W.add('iron', box(0.14, 0.34, 0.14, x + sd * (sd < 0 ? 0.36 : 0.22), 0.17, z));
      W.add('gunmetal', new THREE.TorusGeometry(sd < 0 ? 0.3 : 0.18, 0.05, 5, 12).translate(x, 0.28, z));
    }
    root.updateMatrixWorld(true);
    for (const sd of [-1, 1]) {
      const s = 0.86, bx = sd * 2.05, bz = zAt(s), ph = 1.35;                         // raised on a pedestal to fire over the bow bulwark
      W.add('plate', new THREE.CylinderGeometry(0.26, 0.42, ph, 10).translate(bx, ph / 2, bz));
      for (let i = 0; i < 3; i++) { const a = i / 3 * TAU; W.add('iron', rod([bx + Math.cos(a) * 0.65, 0, bz + Math.sin(a) * 0.65], [bx, ph * 0.7, bz], 0.05, 0.05, 4)); }
      W.add('gunmetal', new THREE.CylinderGeometry(0.38, 0.38, 0.08, 12).translate(bx, ph + 0.02, bz));
      const yoke = new THREE.Group(); yoke.position.set(bx, ph + 0.36, bz); yoke.rotation.order = 'YXZ'; yoke.rotation.set(0.28, -sd * 0.5, 0); root.add(yoke);
      const Y = new Parts(M), g0 = -1.3;
      for (const e of [-1, 1]) Y.add('iron', box(0.08, 0.55, 0.32, e * 0.28, -0.12, 0));
      Y.add('iron', rod([-0.32, 0, 0], [0.32, 0, 0], 0.06, 0.06, 6));
      Y.add('gunmetal', rod([0, 0, 0.7], [0, 0, -1.2], 0.22, 0.18, 12));
      Y.add('iron', rod([0, 0, -1.08], [0, 0, -1.32], 0.25, 0.25, 12));
      Y.add('iron', rod([0, 0, 0.45], [0, 0, 0.78], 0.27, 0.27, 12)); Y.add('iron', new THREE.SphereGeometry(0.23, 8, 6).translate(0, 0, 0.82));
      Y.add('iron', rod([0, 0, 0.85], [0, -0.4, 1.3], 0.04, 0.04, 4));
      Y.add('iron', rod([0, 0, g0 + 0.3], [0, 0, g0 - 0.6], 0.06, 0.06, 6));           // the grapnel seated in the muzzle
      for (let i = 0; i < 4; i++) {
        const a = i / 4 * TAU + Math.PI / 4, c = Math.cos(a), sn = Math.sin(a), k = [c * 0.26, sn * 0.26, g0 - 0.72], tip = [c * 0.44, sn * 0.44, g0 - 0.38];
        Y.add('iron', rod([0, 0, g0 - 0.6], k, 0.05, 0.05, 5)); Y.add('iron', rod(k, tip, 0.05, 0.04, 5));
        Y.add('gunmetal', new THREE.ConeGeometry(0.05, 0.22, 4).rotateX(Math.PI / 2).translate(tip[0], tip[1], tip[2] + 0.1));
      }
      shackle(Y, 0, 0.3, g0 + 0.2, 0.9);
      yoke.add(Y.build('launcher'));
      const mk = new THREE.Object3D(); mk.name = `grapple:${sd > 0 ? 'starboard' : 'port'}`; mk.position.set(0, 0.3, g0 + 0.2); yoke.add(mk);
      yoke.updateMatrixWorld(true);
      const ring = new THREE.Vector3(0, 0.3, g0 + 0.32).applyMatrix4(yoke.matrixWorld), end = new THREE.Vector3(0, 0.26, 0.4).applyMatrix4(yoke.matrixWorld);
      run(sd, 0, [ring.toArray(), end.toArray(), [bx - sd * 0.15, ph * 0.6, bz + 0.45], [bx - sd * 0.2, 0.1, bz + 0.75], [lane(0.83, sd), 0.1, zAt(0.83)]]);
    }
    // the crane's chain comes down through the turntable's centre and out to port to join the run
    const cx = crane.position.x, cz = crane.position.z;
    run(-1, 0.25, [[cx, 0.45, cz + 0.2], [cx - 1.3, 0.4, cz + 0.55], [lane(0.79, -1, 0.25), 0.1, zAt(0.79) - 0.2]]);
    root.add(W.build('chains'));
  }
  finish(root);
  const grapples = []; root.traverse((o) => { if (o.name.startsWith('grapple:')) grapples.push(o); });

  const crew = [[1.5, 0, zAt(0.3), 'pirate'], [-0.9, 0, zAt(0.26), 'pirate'], [1.8, 0, zAt(0.15), 'pirate'], [-1.0, 0, zAt(0.12) + 1, 'pirate'], [2.2, 0, zAt(0.4), 'pirate'],
    [0.8, CH + 0.12, zAt(0.4), 'pirate'], [2.0, 0, zAt(0.67), 'pirate'], [-0.6, 0, zAt(0.9), 'pirate'], [0.9, 0, zAt(0.92), 'pirate'], [-2.1, 0, zAt(0.58), 'pirate']];
  function anim(t, dt = 0.016) {
    for (const wh of spin) wh.rotation.x -= 1.6 * dt;
    for (const f of fx) f.update(t);
    crane.rotation.y = 0.62 + 0.38 * Math.sin(t * 0.32);          // sweeps from abeam to starboard to fine on the bow
    head.rotation.y = 0.89 + t * 0.35;                              // the grapple turns on its swivel: three tines always show
    pend.rotation.z = 0.12 * Math.sin(t * 1.25 + 0.6) + 0.06 * Math.cos(t * 0.32);
    pend.rotation.x = 0.08 * Math.sin(t * 0.9);
  }
  anim(0, 0);
  const info = { length: L + 3.8, beam: 2 * (beam(sW) + 0.35 + w), waterline: WL, hl: L / 2 * 0.95, hb: hullX(0.5, WL), glow, crew,
    ramp: { x: 0, y: hy, z: hz, len: rampLen, w: rampW, dir: -1 }, walk: { L, zAt, sAt, inner, deckAt },
    grapples };                                                   // Object3D markers on the three biting shackles (getWorldPosition)
  return { root, anim, info, setRamp };
}
const lerp3 = (a, b, t) => a + (b - a) * t;
