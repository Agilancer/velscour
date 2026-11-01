// THE ANVIL: the Black Tide's super-huge carrier (docs/PIRATE_SEAS.md), crewed by the Brass Fraternity, renegade Gunners
// in Velscour's pay, who fly steampunk jet fighters off it. The ship is built as a smith's anvil: the flight deck's
// bow tapers to a long conical HORN, the stern is the square HEEL. A planked flight deck (y = 0, the battlefield) with
// brass strips and iron tie-downs overhangs a 20-wide riveted iron hull; tread plate only on the catapults and the wire
// area. An angled landing strip with four arresting wires, two steam catapults (lanes 1 and 2) with blast deflectors,
// two deck-edge elevators on racks and counterweights that bring the boarders' waves up from the lit hangar, and the
// island on PORT (the far side in the game view) built as a foundry: riveted iron, arched brass-mullioned windows,
// pipework and a gauge, a funnel breathing forge-red, a brass lattice mast with the turning aether-finder dish, and
// an open flag-bridge platform with an outside stair where the boss fights (info.bossDeck). Real jets
// (tools/seaship3d_jets.js) park folded in angled clusters with lanes between, round tow tractors, ordnance carts,
// fuel bowsers and chock stacks (all under 1.2 high: cover). Built in a design frame with the island to +X, then
// mirrored (the hull group has scale.x = -1); paint that must read (lane numbers, the Fraternity's mark, the V) and
// the jets are placed unmirrored. buildCarrier(M) -> { root, anim(t, dt), info }.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Parts, box, rod, surf, flag, sm, smoke, dinghy, anchor, stairs, finish, TAU, lerp, clamp } from './seaship3d.js';
import { buildJet } from './seaship3d_jets.js';

// ------------------------------------------------------------------ the hull's shape (design frame: island to +X)
const L = 124, ZS = L / 2, WL = -6, TOP = -0.7;         // hull length at the waterline, waterline, hull top (flight deck underside)
const zAt = (s) => ZS - s * L;
const W = (s) => 9.8 * (s < 0.12 ? 0.86 + 0.14 * sm(0, 0.12, s) : s < 0.6 ? 1 : Math.pow(Math.max(0, 1 - ((s - 0.6) / 0.4) ** 2), 0.8));
const T = (s) => 10.6 * (s < 0.1 ? 0.93 + 0.07 * sm(0, 0.1, s) : s < 0.68 ? 1 : Math.pow(Math.max(0, 1 - ((s - 0.68) / 0.32) ** 2.4), 0.5));
const keel = (s) => -13 + 3.4 * (1 - sm(0, 0.15, s)) + 7 * sm(0.86, 1, s) ** 2;
const rake = (s, y) => sm(0.84, 1, s) * (y - WL) * 0.42;       // the raked stem: the bow reaches forward as it rises
/** Half-width of the hull at station s and height y: flared above the waterline, a round bilge below. */
const hx = (s, y) => {
  if (y >= WL) return lerp(W(s), T(s), Math.pow(clamp((y - WL) / (TOP - WL), 0, 1), 0.85));
  const d = WL - keel(s); if (d < 1e-3) return 0;
  return W(s) * Math.sqrt(Math.max(0, 1 - Math.pow(clamp((WL - y) / d, 0, 1), 4)));
};
const zOf = (s, y) => zAt(s) - rake(s, y);
const sAt = (z) => (ZS - z) / L;

// The anvil's horn: the flight deck's half-width toward the bow, tapering to a point.
const HORN = [[-30, 12.5], [-42, 11.6], [-52, 10.2], [-60, 8.4], [-66, 6.2], [-70.5, 3.8], [-73.5, 1.6], [-74.8, 0]];
const hornW = (z) => { for (let i = 1; i < HORN.length; i++) if (z >= HORN[i][0]) { const [z0, w0] = HORN[i - 1], [z1, w1] = HORN[i]; return lerp(w0, w1, (z - z0) / (z1 - z0)); } return 0; };
// The flight deck's outline (x, z): starboard from the heel to the horn tip, then port back; the notches are the elevators.
const STBD = [[12.4, 64.5], [12.4, 31], [10.7, 31], [10.7, 21], [12.6, 21], [12.9, 10], [12.9, -9], ...HORN.map(([z, w]) => [w, z])];
const PORT = [[-1.6, -73.5], [-3.8, -70.5], [-6.2, -66], [-8.4, -60], [-10.2, -52], [-11.8, -43], [-14, -33], [-16.4, -25], [-16.6, -10],
  [-15.4, 8], [-14.2, 24], [-13.4, 35], [-10.7, 35], [-10.7, 45], [-13, 45], [-12.4, 56], [-12.4, 64.5]];
const OUTLINE = [...STBD, ...PORT];
const ANG = 0.1222, SHW = 5, DLEN = 80;                 // the angled strip: 7 degrees off the axis, half-width, length
const LAND0 = [-1, 63];                                  // the landing axis starts at the stern ramp
const along = (d, off = 0) => [LAND0[0] - Math.sin(ANG) * d + Math.cos(ANG) * off, LAND0[1] - Math.cos(ANG) * d - Math.sin(ANG) * off];
const CATS = [[4.6, -60, -31], [-4.6, -60, -31]];       // catapult x, bow end z, aft (shuttle) end z
const ISLAND = { x0: 9.7, x1: 12.7, z0: -6, z1: 9, zb: 1.5 };   // zb: where the upper works start (the boss deck is forward of it)
const ELEV = [{ x0: 10.7, x1: 17.2, z0: 21, z1: 31, side: 1 }, { x0: -17.2, x1: -10.7, z0: 35, z1: 45, side: -1 }];
const BOSS = { x0: 8.1, x1: 12.9, z0: -6.2, z1: ISLAND.zb, y: 3.25 };

/** Where the jets go, in the design frame: [x, y, z, heading (0 = nose to -Z), folded, kind]. Two on the catapults, the
 *  rest parked folded in angled clusters on the island's half with lanes between them. */
const SPOTS = [
  [4.6, 0, -35.5, 0, false, 'kestrel'], [-4.6, 0, -37.5, 0, false, 'thunderhawk'],
  [9.4, 0, -22.5, 0.2, true, 'kestrel'],
  [5.6, 0, 15, 0.15, true, 'kestrel'], [9.6, 0, 15.5, 0.15, true, 'kestrel'],
  [9.4, 0, 33.5, 0.7, true, 'kestrel'], [9.4, 0, 39, 0.7, true, 'kestrel'], [9.4, 0, 44.5, 0.7, true, 'kestrel'],
  [8.4, 0, 57, 0.35, true, 'thunderhawk'],
];
/** The game frame (after the mirror): island on port, jets on the far half. */
export const JET_SPOTS = SPOTS.map(([x, y, z, h, f, k]) => [-x, y, z, -h, f, k]);
const mirrorBox = (b) => ({ ...b, x0: -b.x1, x1: -b.x0 });
export const CARRIER = { name: 'The Anvil', L, WL, TOP, OUTLINE: OUTLINE.map(([x, z]) => [-x, z]).reverse(), CATS: CATS.map(([x, a, b]) => [-x, a, b]),
  ISLAND: mirrorBox(ISLAND), ELEV: ELEV.map((e) => ({ ...mirrorBox(e), side: -e.side })), BOSS: mirrorBox(BOSS), ANG: -ANG, LAND0: [-LAND0[0], LAND0[1]],
  along: (d, off = 0) => { const [x, z] = along(d, off); return [-x, z]; } };

const inPoly = (x, z, poly = OUTLINE) => {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i], [xj, zj] = poly[j];
    if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c;
  }
  return c;
};
/** A flat paint mark on the deck: a box lying at y, rotated ry. */
const mark = (P, mat, w, d, x, z, ry = 0, y = 0.012) => P.add(mat, box(w, 0.02, d, x, y, z, ry), { uv: 'none' });
// Painted landmarks face the game camera (glyph up = away from it, up the screen) and are stretched along that axis
// to make up for the 30 degree view, so a phone player reads them upright. These take GAME-frame coordinates.
const SCR = Math.PI / 4, STRETCH = 1.5;
/** Flat shape (x, y) lying on the deck at (x, z), its +y up the screen, scaled k (and st along +y). */
const flat = (shape, x, z, k = 1, y = 0.014, ry = SCR, st = STRETCH) => new THREE.ShapeGeometry(shape, 24).scale(k, k * st, 1).rotateX(-Math.PI / 2).rotateY(ry).translate(x, y, z);
const SEG = { 0: 'abcdef', 1: 'bc', 2: 'abged', 3: 'abgcd', 4: 'fgbc', 5: 'afgcd', 6: 'afgedc', 7: 'abc', 8: 'abcdefg' };
function digit(P, mat, n, cx, cz, w, h, t, y = 0.012) {
  h *= STRETCH;
  const R = [Math.cos(SCR), -Math.sin(SCR)], U = [-Math.sin(SCR), -Math.cos(SCR)];
  const hw = w / 2, hh = h / 2, seg = {
    a: [w, t, 0, hh - t / 2], g: [w, t, 0, 0], d: [w, t, 0, -hh + t / 2],
    f: [t, hh, -hw + t / 2, hh / 2], b: [t, hh, hw - t / 2, hh / 2], e: [t, hh, -hw + t / 2, -hh / 2], c: [t, hh, hw - t / 2, -hh / 2],
  };
  for (const k of SEG[n]) { const [sw, sh, gx, gy] = seg[k]; mark(P, mat, sw, sh, cx + gx * R[0] + gy * U[0], cz + gx * R[1] + gy * U[1], SCR, y); }
}
/** The Brass Fraternity's anvil, in outline: a long pointed horn to the left, the heel to the right, a flared foot. */
const ANVIL = [[-2.4, 2], [-4.4, 1.9], [-6.6, 1.6], [-4.2, 1.15], [-2.4, 0.75], [-1.5, 0.45], [-1.3, -0.9], [-2.9, -1.6], [-3.1, -2.3], [3.9, -2.3], [3.7, -1.6], [2.2, -0.9], [2.4, 0.5], [3.6, 0.95], [3.8, 2]];
const VEE = [[-2, 1.5], [-1.1, 1.5], [0, -0.9], [1.1, 1.5], [2, 1.5], [0.45, -1.5], [-0.45, -1.5]];
const shapeOf = (pts) => new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
const ringShape = (r1, r2) => { const s = new THREE.Shape().absarc(0, 0, r2, 0, TAU, false); s.holes.push(new THREE.Path().absarc(0, 0, r1, 0, TAU, true)); return s; };
/** An annular wall sector (a splinter shield): radii r1..r2, angles a0..a1 (from +X toward -Z), height h, base y = 0. */
const arcWall = (r1, r2, a0, a1, h) => {
  const s = new THREE.Shape(); s.absarc(0, 0, r2, a0, a1, false); s.absarc(0, 0, r1, a1, a0, true);
  return new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: false, curveSegments: 16 }).rotateX(-Math.PI / 2);
};
/** A pointed (gothic) arch outline w wide, straight sides to hs, apex at h. */
function archShape(w, hs, h) {
  const s = new THREE.Shape(), a = w / 2;
  s.moveTo(-a, 0); s.lineTo(-a, hs);
  s.bezierCurveTo(-a, hs + (h - hs) * 0.55, -a * 0.35, h - 0.03, 0, h);
  s.bezierCurveTo(a * 0.35, h - 0.03, a, hs + (h - hs) * 0.55, a, hs);
  s.lineTo(a, 0); s.lineTo(-a, 0);
  return s;
}

/** Vertex clustering: snap every vertex to a grid of `cell` and drop the triangles that collapse. The jets are modelled
 *  for close-ups; on a 140-tile deck their rivets and fine cylinders are sub-pixel, so this keeps the silhouette at a
 *  fraction of the triangles. Works on non-indexed position / normal / uv geometry. */
export function decimate(g, cell = 0.05) {
  g = g.index ? g.toNonIndexed() : g;
  const p = g.attributes.position.array, n = g.attributes.normal?.array, uv = g.attributes.uv?.array, rep = new Map(), key = [], q = new Float32Array(p.length);
  for (let i = 0; i < p.length / 3; i++) {
    const k = `${Math.round(p[i * 3] / cell)},${Math.round(p[i * 3 + 1] / cell)},${Math.round(p[i * 3 + 2] / cell)}`;
    if (!rep.has(k)) rep.set(k, i);
    const j = rep.get(k); key.push(j); q[i * 3] = p[j * 3]; q[i * 3 + 1] = p[j * 3 + 1]; q[i * 3 + 2] = p[j * 3 + 2];
  }
  const keep = [];
  for (let t = 0; t < key.length; t += 3) if (key[t] !== key[t + 1] && key[t + 1] !== key[t + 2] && key[t] !== key[t + 2]) keep.push(t);
  const P2 = new Float32Array(keep.length * 9), N2 = n && new Float32Array(keep.length * 9), U2 = uv && new Float32Array(keep.length * 6);
  keep.forEach((t, o) => { P2.set(q.subarray(t * 3, t * 3 + 9), o * 9); if (N2) N2.set(n.subarray(t * 3, t * 3 + 9), o * 9); if (U2) U2.set(uv.subarray(t * 2, t * 2 + 6), o * 6); });
  const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.BufferAttribute(P2, 3));
  if (N2) out.setAttribute('normal', new THREE.BufferAttribute(N2, 3)); else out.computeVertexNormals();
  if (U2) out.setAttribute('uv', new THREE.BufferAttribute(U2, 2));
  return out;
}
const JET_CELL = 0.07;
/** Parked jets, merged: one template per kind (folded, burners dark, gear down) baked into world-space geometry per
 *  material, so nine jets cost a handful of draw calls. */
function parkedJets(M, spots) {
  const grp = new THREE.Group(); grp.name = 'parkedJets';
  const kinds = [...new Set(spots.map((s) => s[5]))];
  for (const kind of kinds) {
    const jet = buildJet(M, kind, { folded: true }); jet.setThrottle(0); jet.setGear(true); jet.anim(0);
    jet.root.updateMatrixWorld(true);
    const meshes = [];
    jet.root.traverse((o) => { if (!o.isMesh || Array.isArray(o.material)) return; let v = true; for (let p = o; p; p = p.parent) if (!p.visible) v = false; if (v) meshes.push(o); });
    const by = new Map();
    for (const [x, y, z, h] of spots.filter((s) => s[5] === kind)) {
      const T = new THREE.Matrix4().makeRotationY(h).setPosition(x, y, z);
      for (const m of meshes) {
        let g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
        for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
        if (!g.attributes.normal) g.computeVertexNormals();
        if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
        g = decimate(g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(T, m.matrixWorld)), JET_CELL);
        if (!by.has(m.material)) by.set(m.material, []);
        by.get(m.material).push(g);
      }
    }
    for (const [mat, list] of by) { const mm = new THREE.Mesh(mergeGeometries(list), mat); mm.name = `parked:${kind}`; grp.add(mm); }
  }
  return grp;
}

// ------------------------------------------------------------------ the ship
export function buildCarrier(M) {
  const root = new THREE.Group(); root.name = 'carrier';
  const ship = new THREE.Group(); ship.name = 'anvil'; ship.scale.x = -1; root.add(ship);   // the design frame, mirrored
  const P = new Parts(M), PW = new Parts(M), fx = [], glow = [], waves = [], guns = [];   // PW: game-frame paint
  const sigMat = M.lamp.clone(), sigRed = M.ember.clone(), laneMat = M.ember.clone();
  const S = new Parts({ sig: sigMat, sigRed, lane: laneMat });   // the lamps that blink
  const plate = 'plate';

  // ---- hull: riveted black iron topsides, a red boot-top at the waterline, copper below
  const NS = 190;
  const bands = [[plate, TOP, WL + 0.6, 8], ['redPaint', WL + 0.6, WL - 0.35, 2], ['copper', WL - 0.35, -99, 8]];
  for (const [mat, yt, yb, nk] of bands) for (const side of [1, -1]) P.add(mat, surf(NS, nk, (u, v) => {
    const a = Math.min(yt, TOP), b = Math.max(yb, keel(u)), y = a + (Math.min(a, b) - a) * v;
    return [side * hx(u, y), y, zOf(u, y)];
  }, (u, v) => { const a = Math.min(yt, TOP), b = Math.max(yb, keel(u)), y = a + (Math.min(a, b) - a) * v; return [zOf(u, y) / 2, y / 2]; }, side > 0), { uv: 'keep' });
  for (const [mat, yt, yb] of bands) {                    // transom, in the same bands
    const a = Math.min(yt, TOP), b = Math.max(yb, keel(0)), sh = new THREE.Shape(), N = 10;
    for (let j = 0; j <= N; j++) { const y = a + (b - a) * j / N; sh[j ? 'lineTo' : 'moveTo'](hx(0, y), y); }
    for (let j = N; j >= 0; j--) { const y = a + (b - a) * j / N; sh.lineTo(-hx(0, y), y); }
    P.add(mat, new THREE.ShapeGeometry(sh).translate(0, 0, ZS));
  }
  // a bulbous forefoot under the water, and the screws, shafts and twin rudders
  P.add('copper', new THREE.SphereGeometry(1, 14, 10).scale(1.5, 1.9, 5).translate(0, -10.2, -59.5));
  for (const x of [-7.5, -3, 3, 7.5]) {
    const z = 50 + Math.abs(x) * 0.3;
    P.add('bronze', rod([x, -10.4, z - 12], [x, -10.9, z], 0.28, 0.28, 8));
    P.add('bronze', rod([x, -10.9, z], [x, -10.9, z + 0.8], 0.45, 0.2, 8));
    for (let i = 0; i < 3; i++) P.add('bronze', new THREE.BoxGeometry(0.12, 1.6, 0.7).translate(0, 0.9, 0).rotateZ(i / 3 * TAU + x).translate(x, -10.9, z + 0.4));
    P.add('bronze', rod([x, -9.6, z - 3], [x, -10.8, z - 2.6], 0.12, 0.12, 5));
  }
  for (const x of [-4.8, 4.8]) P.add(plate, box(0.35, 3.6, 3.4, x, -9.6, 58.6));
  // brass bands: a gilt rubbing strake, a red pinstripe and two brass plate seams
  for (const [mat, y, th, out] of [['brass', -1.35, 0.22, 0.08], ['redPaint', -1.75, 0.12, 0.03], ['brass', -2.5, 0.1, 0.03], ['brass', -3.9, 0.1, 0.03]]) for (const side of [1, -1]) P.add(mat, surf(NS, 1, (u, v) => {
    const s = 0.004 + u * 0.95, yy = y + (v - 0.5) * th; return [side * (hx(s, yy) + out), yy, zOf(s, yy)];
  }, (u, v) => [zAt(u) / 2, v * th], side < 0), { uv: 'keep' });

  // ---- hangar openings: tall doors in the topsides, lamplight spilling out of the hangar
  const hangar = (z0, z1, side, shutter = 0.25) => {
    const zc = (z0 + z1) / 2, s = sAt(zc), y0 = WL + 0.9, y1 = -1.95, x = side * hx(s, (y0 + y1) / 2), len = z1 - z0;
    P.add('dark', box(0.2, y1 - y0, len, x + side * 0.06, (y0 + y1) / 2, zc));
    P.add('glass', box(0.22, 0.28, len - 0.4, x + side * 0.08, y0 + 0.16, zc));                    // the hangar floor lit
    P.add('lamp', box(0.22, 0.1, len - 1.2, x + side * 0.08, y1 - 0.18 - (y1 - y0) * shutter, zc));   // the strip lights inside
    P.add('gunmetal', box(0.26, (y1 - y0) * shutter, len, x + side * 0.1, y1 - (y1 - y0) * shutter / 2, zc));   // the shutter, part raised
    for (let i = 0; i < (y1 - y0) * shutter / 0.25 - 0.5; i++) P.add(plate, box(0.28, 0.04, len, x + side * 0.11, y1 - 0.1 - i * 0.25, zc));
    for (const zz of [z0 - 0.15, z1 + 0.15]) P.add('brass', box(0.34, y1 - y0 + 0.5, 0.3, x + side * 0.1, (y0 + y1) / 2, zz));
    P.add('brass', box(0.34, 0.3, len + 0.6, x + side * 0.1, y1 + 0.15, zc));
    glow.push({ x: x + side * 1.2, y: y0 + 0.6, z: zc, r: Math.min(7, len * 0.8), c: 0xffa040 });
  };
  hangar(21.4, 30.6, 1, 0.1); hangar(-20, -12, 1); hangar(44, 51, 1, 0.4); hangar(35.4, 44.6, -1, 0.1); hangar(-6, 2, -1); hangar(-40, -34, -1, 0.5);
  for (let z = -52; z < 60; z += 2.6) for (const side of [1, -1]) for (const y of [-1.0, -3.2]) {   // portholes
    const s = sAt(z); if (s > 0.92) continue;
    const near = [[21, 31, 1], [-21, -11, 1], [43, 52, 1], [34, 46, -1], [-7, 3, -1], [-41, -33, -1]].some(([a, b, sd]) => sd === side && z > a - 1 && z < b + 1);
    if (near && y < -1.5) continue;
    P.add('glass', box(0.12, 0.22, 0.36, side * (hx(s, y) + 0.03), y, z));
  }
  // anchors at the hawse pipes, and Velscour's red V on the bow flanks
  for (const side of [1, -1]) {
    const s = 0.905, y = -2.4, z = zOf(s, y), x = side * (hx(s, y) + 0.25);
    P.add('brass', new THREE.TorusGeometry(0.5, 0.14, 6, 14).rotateY(Math.PI / 2).translate(x - side * 0.1, y, z));
    P.add('dark', new THREE.CircleGeometry(0.4, 10).rotateY(side * Math.PI / 2).translate(x - side * 0.05, y, z));
    anchor(P, x + side * 0.15, y - 0.4, z + 0.3, 1.5, Math.PI / 2 + side * 0.15);
    const sv = 0.84, yv = -2.9, zv = zOf(sv, yv), xv = side * (hx(sv, yv) + 0.05);
    for (const d of [-1, 1]) {
      P.add('plateRed', new THREE.BoxGeometry(0.12, 3.2, 0.7).rotateX(d * 0.42).translate(xv + side * 0.02, yv, zv + d * 0.7));
      P.add('brass', new THREE.BoxGeometry(0.1, 3.5, 0.12).rotateX(d * 0.42).translate(xv + side * 0.06, yv, zv + d * 1.12));
    }
  }

  // ---- the heel: the square stern block under the flight deck, banded in brass, a lit quarterdeck in its face
  {
    const zf = 64.5, d = 2.3, hy = -3.7;
    P.add(plate, box(24.7, TOP - hy, d, 0, (TOP + hy) / 2, zf - d / 2));
    for (const y of [-0.95, -3.55]) P.add('brass', box(24.9, 0.18, d + 0.12, 0, y, zf - d / 2));
    for (const x of [-12.35, 12.35]) P.add('brass', box(0.2, TOP - hy, d + 0.12, x, (TOP + hy) / 2, zf - d / 2));
    P.add('dark', box(11, 1.9, 0.2, 0, -2.25, zf + 0.02));
    P.add('glass', box(10.4, 0.22, 0.24, 0, -3.05, zf + 0.04));
    for (let i = 0; i < 6; i++) P.add('gunmetal', box(0.1, 1.9, 0.1, -4.6 + i * 1.84, -2.25, zf + 0.12));
    for (const x of [-5.6, 5.6]) P.add('brass', box(0.3, 2.3, 0.3, x, -2.25, zf + 0.1));
    for (const x of [-10, 10]) { P.add('ember', box(0.45, 0.45, 0.2, x, -2.2, zf + 0.06)); glow.push({ x, y: -2.2, z: zf + 0.5, r: 2.4, c: 0xff3020 }); }
    glow.push({ x: 0, y: -2.5, z: zf + 1, r: 7, c: 0xffa040 });
    // the underside of the heel's overhang, so the sea never sees light through it
    P.add(plate, box(24.5, 0.1, 3.0, 0, hy, zf - d - 1.4));
  }

  // ---- the flight deck: a riveted plate slab, planked on top
  {
    const sh = new THREE.Shape(OUTLINE.map(([x, z]) => new THREE.Vector2(x, z)));
    P.add(plate, new THREE.ExtrudeGeometry(sh, { depth: 0.7, bevelEnabled: false }).rotateX(Math.PI / 2));
    const top = new THREE.Shape(OUTLINE.map(([x, z]) => new THREE.Vector2(x, -z)));
    P.add('greyboards', new THREE.ShapeGeometry(top).rotateX(-Math.PI / 2).translate(0, 0.004, 0));
    // brass strips across the planking every 6 tiles (the plank butts), clipped to the outline
    for (let z = -66; z < 64; z += 6) {
      let run = null;
      for (let x = -17; x <= 13.01; x += 0.25) {
        const inside = inPoly(x, z);
        if (inside && run === null) run = x;
        if ((!inside || x > 13) && run !== null) { if (x - run > 1) P.add('brass', box(x - run - 0.3, 0.02, 0.12, (x + run) / 2, 0.01, z)); run = null; }
      }
    }
    // a brass coaming round the deck edge (below the deck top), catwalks, knee braces
    for (let i = 0; i < OUTLINE.length; i++) {
      const [ax, az] = OUTLINE[i], [bx, bz] = OUTLINE[(i + 1) % OUTLINE.length], len = Math.hypot(bx - ax, bz - az), ry = Math.atan2(bx - ax, bz - az);
      const nx = -(bz - az) / len, nz = (bx - ax) / len;        // outward normal
      const isNotch = Math.abs(ax) === 10.7 && Math.abs(bx) === 10.7 || (Math.abs(az - bz) < 0.01 && (Math.abs(ax) === 10.7 || Math.abs(bx) === 10.7));
      if (isNotch) continue;
      P.add('brass', box(0.1, 0.18, len, (ax + bx) / 2 - nx * 0.05, -0.12, (az + bz) / 2 - nz * 0.05, ry));
      if (Math.abs(az) > 64 || Math.abs(bz) > 64 || len < 4 || az < -58) continue;
      const cx = (ax + bx) / 2 + nx * 0.7, cz = (az + bz) / 2 + nz * 0.7;
      P.add('gunmetal', box(1.1, 0.1, len - 0.6, cx, -1.05, cz, ry));
      for (let f = 0.4; f < len - 0.3; f += 1.5) {
        const px = ax + (bx - ax) * f / len + nx * 1.2, pz = az + (bz - az) * f / len + nz * 1.2;
        P.add('gunmetal', box(0.07, 0.75, 0.07, px, -0.65, pz));
        if (((f / 1.5) | 0) % 2 === 0) P.add('gunmetal', rod([px - nx * 1.1, -0.7, pz - nz * 1.1], [px - nx * 0.5, -1.05, pz - nz * 0.5], 0.05, 0.05, 4));
      }
      P.add('brass', box(0.08, 0.08, len - 0.6, cx + nx * 0.5, -0.28, cz + nz * 0.5, ry));
      for (let f = 1.5; f < len - 1; f += 3.5) {
        const ex = ax + (bx - ax) * f / len, ez = az + (bz - az) * f / len, s = sAt(ez); if (s < 0.01 || s > 0.95) continue;
        const sd = Math.sign(ex), hxv = hx(s, -3.4), over = Math.abs(ex) - hx(s, TOP);
        if (over < 1.2) continue;
        P.add(plate, rod([sd * hxv, -3.4, ez], [ex - nx * 0.4, -0.75, ez - nz * 0.4], 0.14, 0.14, 5));
        P.add(plate, box(over + 0.2, 0.32, 0.25, sd * (hx(s, TOP) + over / 2), -0.86, ez));
      }
    }
    // the horn's underside: a riveted half-cone under the bow overhang, banded in brass, a brass point
    const z0 = -36, z1 = -74.8, dep = (z) => Math.min(4.6, hornW(z) * 0.55) * (0.15 + 0.85 * sm(-36, -54, z));
    const cone = (mat, za, zb, k = 1, nu = 26) => P.add(mat, surf(nu, 14, (u, v) => {
      const z = lerp(za, zb, u), w = hornW(z) * k, th = v * Math.PI;
      return [w * Math.cos(th), TOP - dep(z) * k * Math.sin(th), z];
    }, (u, v) => [lerp(za, zb, u) / 2, v * hornW(lerp(za, zb, u)) * 1.5], true));
    cone(plate, z0, z1 + 0.05);
    for (const z of [-56, -63, -69]) cone('brass', z, z - 0.45, 1.03, 2);
    P.add('brass', new THREE.ConeGeometry(0.42, 1.4, 10).rotateX(-Math.PI / 2).translate(0, -0.45, -75.2));
    P.add('brass', new THREE.SphereGeometry(0.46, 10, 8).translate(0, -0.45, -74.4));
  }

  // ---- paint and fittings on the deck
  // tread plate where the catapults run and where the wires catch, the planks everywhere else
  for (const [x, zb, za] of CATS) P.add('plateDeck', box(2.2, 0.02, za - zb + 1, x, 0.008, (za + zb) / 2));
  { const [x, z] = along(18); P.add('plateDeck', box(SHW * 2 + 2.4, 0.02, 22, x, 0.008, z, ANG)); }
  // the landing strip: solid edge lines, a dashed centreline, centreline lights, a red and white ramp at the stern
  for (const off of [-SHW, SHW]) { const [x, z] = along(DLEN / 2 + 1, off); mark(P, 'stripeWhite', 0.28, DLEN, x, z, ANG); }
  const clearD = (d) => d > 49 && d < 65;                  // the Fraternity's mark
  for (let d = 6; d < DLEN - 2; d += 6) { if (clearD(d)) continue; const [x, z] = along(d); mark(P, 'stripeWhite', 0.32, 3, x, z, ANG); }
  for (let d = 3; d < DLEN; d += 6) for (const off of [-SHW, SHW]) {
    const [x, z] = along(d, off); P.add('lamp', box(0.22, 0.06, 0.22, x, 0.03, z));
    if (d % 18 === 3) glow.push({ x, y: 0.15, z, r: 1.1, c: 0xffb050 });
  }
  for (let d = 9; d < DLEN - 2; d += 6) { if (clearD(d)) continue; const [x, z] = along(d); P.add('jetGlow', box(0.16, 0.05, 0.16, x, 0.03, z)); }
  for (let i = 0; i < 10; i++) { const [x, z] = along(1.1, -SHW + i + 0.5); mark(P, i % 2 ? 'stripeWhite' : 'stripeRed', 0.95, 1.8, x, z, ANG); }
  { const [x, z] = along(40, SHW + 1); mark(P, 'stripeRed', 0.22, 70, x, z, ANG); }   // the foul line: keep out when they land
  // the arresting wires: four cables across the strip on bowed springs, sheaves at each end
  for (const d of [12, 16, 20, 24]) {
    const a = along(d, -SHW - 0.8), b = along(d, SHW + 0.8);
    P.add('paleSteel', rod([a[0], 0.12, a[1]], [b[0], 0.12, b[1]], 0.075, 0.075, 6));
    for (const f of [-3.8, -1.3, 1.3, 3.8]) { const [x, z] = along(d, f); P.add('gunmetal', new THREE.TorusGeometry(0.16, 0.04, 4, 8, Math.PI).rotateY(Math.PI / 2 - ANG).translate(x, 0, z)); }
    for (const off of [-SHW - 1.4, SHW + 1.4]) {
      const [x, z] = along(d, off);
      P.add('brass', new THREE.CylinderGeometry(0.36, 0.36, 0.16, 12).translate(x, 0.08, z));
      P.add('gunmetal', new THREE.CylinderGeometry(0.16, 0.16, 0.24, 8).translate(x, 0.12, z));
    }
  }
  // the steam catapults: a slotted track between brass rails, a shuttle, yellow lane lines, red lane lights that warn
  // of a launch (the strafing run telegraph), steam venting along the track, and the jet blast deflector raised aft
  CATS.forEach(([x, zb, za], ci) => {
    const len = za - zb, zc = (za + zb) / 2;
    P.add('dark', box(0.26, 0.03, len, x, 0.012, zc));
    for (const d of [-0.28, 0.28]) P.add('brass', box(0.14, 0.05, len, x + d, 0.022, zc));
    for (let z = zb + 1; z < za; z += 2.5) P.add('gunmetal', box(0.9, 0.04, 0.16, x, 0.02, z));
    for (const d of [-2.6, 2.6]) mark(P, 'stripeYellow', 0.24, len - 1, x + d, zc + 0.5);
    for (let z = zb + 2; z < za; z += 4) for (const d of [-2.6, 2.6]) S.add('lane', box(0.3, 0.06, 0.3, x + d, 0.035, z));
    P.add('brass', box(0.5, 0.28, 0.9, x, 0.14, za - 3.3 - (ci ? 2 : 0)));          // the shuttle under the jet's nose
    for (const z of [za + 0.3, zb - 0.6]) P.add('brass', new THREE.CylinderGeometry(0.45, 0.55, 0.22, 10).translate(x + 1.6 * (ci ? -1 : 1), 0.11, z));  // steam valve caps
    for (const z of [za - 10, za - 19, zb + 5]) { const sm2 = smoke([x, 0.15, z], 5, ['#f4f6f8', '#d6dde2'], 1.6, 0.9); ship.add(sm2.grp); fx.push(sm2); }
    // the jet blast deflector: hinged on its forward edge, raised 55 degrees, cooling pipes on its back
    const zh = za + 1.0, ang = 0.96, dep = 3.4, w = ci ? 6.4 : 5.2, pan = new THREE.Group();
    const D = new Parts(M);
    D.add('gunmetal', box(w, 0.18, dep, 0, 0.09, dep / 2));
    for (let i = 0; i < 4; i++) D.add(plate, box(0.12, 0.2, dep, -w / 2 + 0.6 + i * (w - 1.2) / 3, -0.06, dep / 2));
    for (let i = 0; i < 5; i++) D.add('copper', rod([-w / 2 + 0.3, -0.1, 0.4 + i * 0.65], [w / 2 - 0.3, -0.1, 0.4 + i * 0.65], 0.06, 0.06, 5));
    D.add('stripeYellow', box(w + 0.02, 0.2, 0.25, 0, 0.1, dep - 0.12), { uv: 'none' });
    const gD = D.build('jbd'); gD.rotation.x = -ang; pan.add(gD); pan.position.set(x, 0, zh);
    pan.updateMatrixWorld(true);
    gD.children.forEach((m) => { m.geometry.applyMatrix4(m.matrixWorld); P.add(Object.keys(D.by).find((k) => m.name === `jbd:${k}`), m.geometry, { uv: 'none' }); });
    for (const d of [-1, 1]) {                                                         // the hydraulic rams
      P.add('steel', rod([x + d * (w / 2 - 0.5), 0.05, zh + 3.6], [x + d * (w / 2 - 0.5), Math.sin(ang) * 2.1 - 0.1, zh + Math.cos(ang) * 2.1 + 0.15], 0.1, 0.1, 6));
      P.add('brass', rod([x + d * (w / 2 - 0.5), 0.05, zh + 3.6], [x + d * (w / 2 - 0.5), 0.5, zh + 3.25], 0.17, 0.17, 6));
    }
    mark(P, 'stripeYellow', w + 0.4, 0.3, x, zh - 0.25);
    // the lane number, big, on the lane forward of the jet (game frame: the design's +X lane is the far one, lane 2)
    digit(PW, 'stripeWhite', x > 0 ? 2 : 1, -x, -49.5, 3.6, 5.6, 0.8, 0.06);
  });
  // Velscour's V at the horn, and the Fraternity's anvil-in-cog amidships on the strip (game frame)
  P.add('ember', box(0.28, 0.05, 0.28, 0, 0.03, -71.5));
  PW.add('stripeWhite', flat(shapeOf(VEE), 0, -64.6, 1.18, 0.014), { uv: 'none' });
  PW.add('stripeRed', flat(shapeOf(VEE), 0, -64.6, 1.0, 0.017), { uv: 'none' });
  {
    const [dx, az] = along(57, 0), ax = -dx;
    PW.add('stripeYellow', flat(ringShape(4.6, 5.3), ax, az, 1, 0.014, 0, 1), { uv: 'none' });
    for (let i = 0; i < 14; i++) { const a = i / 14 * TAU; PW.add('stripeYellow', box(1.0, 0.02, 0.85, ax + Math.cos(a) * 5.6, 0.014, az - Math.sin(a) * 5.6, a), { uv: 'none' }); }
    PW.add('stripeWhite', flat(shapeOf(ANVIL), ax + 0.45, az, 0.92, 0.016), { uv: 'none' });
    PW.add('stripeRed', flat(shapeOf(ANVIL), ax + 0.45, az, 0.8, 0.019), { uv: 'none' });
  }
  // the axial yellow taxi line from the aft park to the bow, the island's no-go line
  for (let z = -26; z < 30; z += 4) mark(P, 'stripeYellow', 0.22, 2.4, 3.2, z);
  mark(P, 'stripeRed', 0.25, ISLAND.z1 + 12, ISLAND.x0 - 2.0, (ISLAND.z1 - 12) / 2 - 0.5);
  // red edge lights round the deck, the kind that still read at night
  for (let i = 0; i < OUTLINE.length; i++) {
    const [ax, az] = OUTLINE[i], [bx, bz] = OUTLINE[(i + 1) % OUTLINE.length], len = Math.hypot(bx - ax, bz - az);
    if (Math.abs(ax) === 10.7 || Math.abs(bx) === 10.7) continue;
    for (let f = 1; f < len - 0.5; f += 6) {
      const x = ax + (bx - ax) * f / len, z = az + (bz - az) * f / len, nx = -(bz - az) / len, nz = (bx - ax) / len;
      P.add('ember', box(0.24, 0.07, 0.24, x - nx * 0.4, 0.035, z - nz * 0.4));
    }
  }
  // iron tie-down points
  for (let x = -15; x <= 12; x += 3) for (let z = -62; z <= 63; z += 3) {
    if (!inPoly(x, z) || !inPoly(x + 1, z) || !inPoly(x - 1, z)) continue;
    if (CATS.some(([cx, zb, za]) => Math.abs(x - cx) < 1.3 && z > zb - 1 && z < za + 5)) continue;
    if (x > ISLAND.x0 - 1.8 && z > ISLAND.z0 - 6 && z < ISLAND.z1 + 1) continue;
    P.add('gunmetal', new THREE.CylinderGeometry(0.16, 0.16, 0.04, 8).translate(x, 0.02, z));
    P.add('dark', new THREE.CylinderGeometry(0.07, 0.07, 0.05, 6).translate(x, 0.025, z));
  }

  // ---- deck clutter, all under 1.2 high: cover between the parked jets
  const put = (mat, g, x, z, h) => P.add(mat, g.rotateY(h).translate(x, 0, z));
  const wheels = (x, z, h, w, l, r = 0.22) => { for (const a of [-1, 1]) for (const b of [-1, 1]) put('dark', new THREE.CylinderGeometry(r, r, 0.16, 10).rotateZ(Math.PI / 2).translate(a * w, r, b * l), x, z, h); };
  const tractor = (x, z, h) => {
    put('plateRed', new THREE.BoxGeometry(1.4, 0.55, 2.2).translate(0, 0.5, 0), x, z, h);
    put(plate, new THREE.BoxGeometry(1.2, 0.35, 0.9).translate(0, 0.95, 0.4), x, z, h);
    put('brass', rod([0.45, 0.7, -0.7], [0.45, 1.15, -0.75], 0.07, 0.07, 6), x, z, h);
    put('gunmetal', new THREE.BoxGeometry(0.2, 0.15, 0.7).translate(0, 0.3, -1.4), x, z, h);
    wheels(x, z, h, 0.72, 0.7, 0.28);
  };
  const cart = (x, z, h, torpedo) => {
    put('gunmetal', new THREE.BoxGeometry(1.3, 0.12, 2.6).translate(0, 0.42, 0), x, z, h);
    for (const a of [-1, 1]) put('brass', new THREE.BoxGeometry(0.08, 0.3, 2.6).translate(a * 0.62, 0.6, 0), x, z, h);
    if (torpedo) { put('steel', rod([0, 0.85, 1.3], [0, 0.85, -1.1], 0.3, 0.3, 10), x, z, h); put('brass', rod([0, 0.85, -1.1], [0, 0.85, -1.6], 0.3, 0.05, 10), x, z, h); }
    else for (const a of [-0.3, 0.3]) for (const b of [-0.7, 0.7]) { put(plate, new THREE.SphereGeometry(0.28, 10, 8).scale(1, 1, 1.6).translate(a, 0.78, b), x, z, h); put('plateRed', new THREE.ConeGeometry(0.16, 0.3, 6).rotateX(-Math.PI / 2).translate(a, 0.78, b - 0.55), x, z, h); }
    wheels(x, z, h, 0.62, 1.0);
  };
  const bowser = (x, z, h) => {
    put('brass', new THREE.CylinderGeometry(0.62, 0.62, 2.6, 14).rotateX(Math.PI / 2).translate(0, 0.85, 0.2), x, z, h);
    for (const b of [-0.6, 0.5, 1.3]) put(plate, new THREE.CylinderGeometry(0.66, 0.66, 0.12, 14).rotateX(Math.PI / 2).translate(0, 0.85, b), x, z, h);
    put('plateRed', new THREE.BoxGeometry(1.2, 0.7, 0.8).translate(0, 0.55, -1.5), x, z, h);
    put('gunmetal', rod([0.5, 0.7, 1.4], [0.9, 0.2, 1.8], 0.06, 0.06, 5), x, z, h);
    wheels(x, z, h, 0.62, 1.1);
  };
  const chocks = (x, z, h) => { for (let i = 0; i < 4; i++) put('stripeYellow', new THREE.BoxGeometry(0.9, 0.22, 0.32).translate((i % 2) * 0.1, 0.11 + i * 0.22, 0), x, z, h + i * 0.3); };
  for (const [fn, x, z, h, t] of [[tractor, 3.6, 8.5, 0.4], [bowser, 5.8, -9.5, -0.3], [chocks, 8.4, -13.8, 0.2], [cart, 5.0, 25.5, 0.1], [tractor, 4.4, 51, -0.5],
    [cart, -10.8, -27, 0.2, true], [chocks, 8.9, -31.6, 0.6], [bowser, 2.8, -14, 0.1], [chocks, 12, 49.6, 0.3], [cart, -10.4, 55, -0.1], [chocks, -11.8, -40, 0.4], [tractor, -9.8, 31, 0.9]])
    fn(x, z, h, t);

  // ---- the deck-edge elevators: platforms that rise from the hangar with each wave, on racks with counterweights
  const lift = [null, null], LIFT = -1 - WL - 0.1;
  const elevators = ELEV.map((e, i) => {
    const g = new THREE.Group(), E = new Parts(M), w = e.x1 - e.x0, d = e.z1 - e.z0, cx = (e.x0 + e.x1) / 2, cz = (e.z0 + e.z1) / 2;
    E.add(plate, box(w, 0.5, d, 0, -0.25, 0));
    E.add('plateDeck', box(w - 0.2, 0.02, d - 0.2, 0, 0.004, 0));
    for (const [sw, sd, ox, oz] of [[w, 0.35, 0, -d / 2 + 0.2], [w, 0.35, 0, d / 2 - 0.2], [0.35, d, -w / 2 + 0.2, 0], [0.35, d, w / 2 - 0.2, 0]]) E.add('stripeYellow', box(sw, 0.02, sd, ox, 0.016, oz), { uv: 'none' });
    for (let k = 0; k < 3; k++) for (const sgn of [-1, 1]) E.add('stripeRed', new THREE.BoxGeometry(0.45, 0.02, 2.6).rotateY(sgn * 0.7).translate(e.side * (-1.2 + k * 1.5), 0.018, sgn * 0.85), { uv: 'none' });
    E.add('brass', box(0.12, 0.3, d, e.side * (w / 2 - 0.06), -0.15, 0));
    const hxE = -e.side * w / 2;
    for (const oz of [-d / 2 - 0.25, d / 2 + 0.25]) {                       // pinions on the racks
      E.add('brass', new THREE.CylinderGeometry(0.42, 0.42, 0.22, 12).rotateX(Math.PI / 2).translate(hxE + e.side * 0.6, -0.5, oz));
      E.add('gunmetal', new THREE.CylinderGeometry(0.14, 0.14, 0.5, 8).rotateX(Math.PI / 2).translate(hxE + e.side * 0.6, -0.5, oz));
    }
    g.add(E.build('elevator' + i)); g.position.set(cx, 0, cz); ship.add(g);
    for (const oz of [e.z0 - 0.3, e.z1 + 0.3]) {                            // the racks up the hull side, a counterweight on its chain
      const s = sAt(oz), x = e.side * (hx(s, -2.5) + 0.3), dz = Math.sign(oz - cz);
      P.add('gunmetal', box(0.5, 5.2, 0.4, x, -3.1, oz));
      for (let y = -5.4; y < -0.9; y += 0.3) P.add('brass', box(0.16, 0.12, 0.2, x + e.side * 0.3, y, oz - dz * 0.12));
      P.add('brass', box(0.56, 0.2, 0.46, x, -0.65, oz));
      P.add('gunmetal', new THREE.CylinderGeometry(0.32, 0.32, 0.3, 10).rotateX(Math.PI / 2).translate(x, -0.95, oz + dz * 0.45));
      for (let y = -1.2; y > -3.2; y -= 0.22) P.add('gunmetal', new THREE.TorusGeometry(0.09, 0.03, 4, 6).rotateY(((y * 10) | 0) % 2 ? Math.PI / 2 : 0).translate(x, y, oz + dz * 0.6));
      P.add(plate, box(0.6, 0.9, 0.5, x, -3.6, oz + dz * 0.6));
    }
    return { g, e, ph: i * 13 };
  });

  // ---- the island, on port amidships (design +X): a foundry of riveted iron and brass
  {
    const { x0, x1, z0, z1, zb } = ISLAND, cx = (x0 + x1) / 2;
    const rim = (x, y, z, w, d, t = 0.16) => { for (const sz of [-1, 1]) P.add('brass', box(w, 0.16, t, x, y, z + sz * (d - t) / 2)); for (const sx of [-1, 1]) P.add('brass', box(t, 0.16, d, x + sx * (w - t) / 2, y, z)); };
    /** An arched window on a wall facing `face` ('x-', 'x+', 'z-'), forge-lit glass behind brass mullions. */
    const archWin = (x, y, z, face, w = 0.8, h = 1.25) => {
      const ry = face === 'x-' ? -Math.PI / 2 : face === 'x+' ? Math.PI / 2 : Math.PI, o = face === 'x-' ? [-1, 0] : face === 'x+' ? [1, 0] : [0, -1];
      const at = (g, d) => P.add(g.mat, g.geo.rotateY(ry).translate(x + o[0] * d, y, z + o[1] * d), { uv: 'none' });
      at({ mat: 'glass', geo: new THREE.ShapeGeometry(archShape(w, h * 0.6, h), 6) }, 0.03);
      const fr = new THREE.ExtrudeGeometry(Object.assign(archShape(w + 0.2, h * 0.6 + 0.05, h + 0.14), { holes: [archShape(w, h * 0.6, h)] }), { depth: 0.08, bevelEnabled: false, curveSegments: 6 });
      at({ mat: 'brass', geo: fr }, 0.0);
      at({ mat: 'brass', geo: new THREE.BoxGeometry(0.06, h, 0.06).translate(0, h / 2, 0.04) }, 0.03);
      at({ mat: 'brass', geo: new THREE.BoxGeometry(w, 0.06, 0.06).translate(0, h * 0.5, 0.04) }, 0.03);
    };
    // level A (the forge hall) and level B (the upper works, aft): riveted plate, brass rims
    P.add(plate, box(x1 - x0, 3.2, z1 - z0, cx, 1.6, (z0 + z1) / 2));
    P.add(plate, box(x1 - x0 - 0.15, 2.4, z1 - zb, cx + 0.07, 4.4, (zb + z1) / 2));
    rim(cx, 3.2, (z0 + z1) / 2, x1 - x0 + 0.3, z1 - z0 + 0.3); rim(cx + 0.07, 5.6, (zb + z1) / 2, x1 - x0 + 0.15, z1 - zb + 0.3);
    P.add('gunmetal', box(x1 - x0 - 0.2, 0.08, z1 - zb - 0.2, cx + 0.07, 5.62, (zb + z1) / 2));
    for (const y of [1.05, 2.15]) P.add('brass', box(0.06, 0.08, z1 - z0, x0 - 0.03, y + 1.3, (z0 + z1) / 2));
    for (let z = z0 + 1.2; z < z1 - 0.8; z += 1.7) { if (Math.abs(z - 3.6) < 0.9) continue; archWin(x0, 0.95, z, 'x-'); archWin(x1, 0.95, z, 'x+'); }
    for (let z = zb + 1.2; z < z1 - 0.5; z += 1.7) archWin(x0 + 0.07, 3.85, z, 'x-', 0.7, 1.15);
    for (const x of [cx - 0.8, cx + 0.8]) archWin(x, 3.8, zb, 'z-', 0.6, 1.1);
    for (let z = z0 + 1.2; z < z1 - 0.8; z += 1.7) glow.push({ x: x0 - 0.5, y: 1.4, z, r: 1.1, c: 0xff8a30 });
    // the foundry door to the forge hall, under a brass arch
    { const fr = new THREE.ExtrudeGeometry(Object.assign(archShape(1.6, 1.4, 2.3), { holes: [archShape(1.3, 1.3, 2.1)] }), { depth: 0.12, bevelEnabled: false, curveSegments: 6 });
      P.add('brass', fr.rotateY(-Math.PI / 2).translate(x0 - 0.02, 0, 3.6), { uv: 'none' });
      P.add('furnace', new THREE.ShapeGeometry(archShape(1.3, 1.3, 2.1), 6).rotateY(-Math.PI / 2).translate(x0 - 0.03, 0, 3.6), { uv: 'none' });
      glow.push({ x: x0 - 1.0, y: 1.0, z: 3.6, r: 3.2, c: 0xff5a20 }); }
    // pipework: brass steam pipes up the inboard face, copper valve wheels, and a big pressure gauge over the boss deck
    for (const [dz, r] of [[-0.25, 0.12], [0.1, 0.09], [7.2, 0.14]]) P.add('brass', rod([x0 - 0.18, 0, z0 + 1 + dz], [x0 - 0.18, 5.6, z0 + 1 + dz], r, r, 6));
    for (const y of [1.2, 4.2]) P.add('copper', new THREE.TorusGeometry(0.22, 0.05, 5, 10).rotateY(Math.PI / 2).translate(x0 - 0.36, y, z0 + 0.75));
    P.add('brass', rod([x0 - 0.18, 4.9, z0 + 0.75], [x0 - 0.18, 4.9, zb - 0.1], 0.1, 0.1, 6));
    P.add('brass', rod([cx - 1.1, 4.9, zb - 0.1], [x0 - 0.18, 4.9, zb - 0.1], 0.1, 0.1, 6));
    {
      const gx = cx, gy = 4.45, gz = zb - 0.06;
      P.add('brass', new THREE.TorusGeometry(0.72, 0.1, 6, 20).translate(gx, gy, gz - 0.02));
      P.add('boneWhite', new THREE.CircleGeometry(0.66, 20).rotateY(Math.PI).translate(gx, gy, gz - 0.03), { uv: 'none' });
      for (let i = 0; i < 9; i++) { const a = Math.PI * 1.25 - i / 8 * Math.PI * 1.5; P.add('dark', box(0.04, 0.12, 0.02, gx - Math.cos(a) * 0.52, gy + Math.sin(a) * 0.52, gz - 0.05).rotateZ(0)); }
      P.add('plateRed', new THREE.BoxGeometry(0.06, 0.55, 0.03).translate(0, 0.27, 0).rotateZ(-0.9).translate(gx, gy, gz - 0.07));
      P.add('brass', new THREE.CylinderGeometry(0.08, 0.08, 0.06, 8).rotateX(Math.PI / 2).translate(gx, gy, gz - 0.08));
    }
    // the crest on the forge hall: Velscour's V in a brass cog
    P.add('brass', new THREE.CircleGeometry(1.0, 16).rotateY(-Math.PI / 2).translate(x0 - 0.06, 2.0, 6.8));
    P.add('plateRed', new THREE.ShapeGeometry(shapeOf(VEE)).scale(0.38, 0.38, 1).rotateY(-Math.PI / 2).translate(x0 - 0.1, 2.0, 6.8), { uv: 'none' });
    for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; P.add('brass', box(0.08, 0.25, 0.25, x0 - 0.06, 2.0 + Math.sin(a) * 1.08, 6.8 + Math.cos(a) * 1.08)); }

    // the flag-bridge platform: the boss's deck on the forge hall's roof, cantilevered over the flight deck
    {
      const { x0: bx0, x1: bx1, z0: bz0, z1: bz1, y } = BOSS;
      P.add('plateDeck', box(bx1 - bx0, 0.2, bz1 - bz0, (bx0 + bx1) / 2, y - 0.1, (bz0 + bz1) / 2));
      rim((bx0 + bx1) / 2, y - 0.12, (bz0 + bz1) / 2, bx1 - bx0 + 0.1, bz1 - bz0 + 0.1, 0.12);
      for (let z = bz0 + 0.6; z < bz1; z += 2.2) P.add(plate, rod([x0, 1.2, z], [bx0 + 0.15, y - 0.25, z], 0.12, 0.12, 5));
      const railX = (x, za, zb2) => { for (let z = za; z <= zb2 + 0.01; z += 0.9) P.add(plate, box(0.08, 1.0, 0.08, x, y + 0.5, z)); P.add('brass', box(0.1, 0.1, zb2 - za + 0.1, x, y + 1.0, (za + zb2) / 2)); P.add('gunmetal', box(0.05, 0.05, zb2 - za, x, y + 0.5, (za + zb2) / 2)); };
      const railZ = (z, xa, xb) => { for (let x = xa; x <= xb + 0.01; x += 0.8) P.add(plate, box(0.08, 1.0, 0.08, x, y + 0.5, z)); P.add('brass', box(xb - xa + 0.1, 0.1, 0.1, (xa + xb) / 2, y + 1.0, z)); P.add('gunmetal', box(xb - xa, 0.05, 0.05, (xa + xb) / 2, y + 0.5, z)); };
      railX(bx0 + 0.05, bz0 + 0.05, bz1 - 0.1); railX(bx1 - 0.05, bz0 + 0.05, bz1 - 0.1); railZ(bz0 + 0.05, bx0 + 0.05, 9.75);
      // the outside stair down to the flight deck, forward of the island
      const sx = (9.9 + 12.5) / 2, foot = stairs(P, sx, bz0, 0, y, -1, 2.6, 'plateDeck');
      for (const d of [-1.38, 1.38]) {
        const run = bz0 - foot, g = new THREE.BoxGeometry(0.16, 0.36, Math.hypot(run, y) + 0.2);
        g.rotateX(-Math.atan2(y, run)); g.translate(sx + d, y / 2 + 0.1, (bz0 + foot) / 2); P.add(plate, g);
        P.add('brass', rod([sx + d, 1.0, foot + 0.2], [sx + d, y + 1.0, bz0 + 0.1], 0.05, 0.05, 5));
        for (let f = 0.15; f < 1; f += 0.28) P.add(plate, box(0.06, 1.0, 0.06, sx + d, lerp(0, y, f) + 0.5, lerp(foot, bz0, f)));
      }
      for (const x of [bx0 + 0.3, bx1 - 0.3]) { P.add('brass', new THREE.CylinderGeometry(0.28, 0.2, 0.5, 10).translate(x, y + 1.25, bz0 + 0.3)); P.add('furnace', new THREE.CylinderGeometry(0.22, 0.22, 0.06, 10).translate(x, y + 1.5, bz0 + 0.3)); glow.push({ x, y: y + 1.7, z: bz0 + 0.3, r: 2.0, c: 0xff6020 }); }
    }

    // the navigating bridge on the upper works: glass all round, brass mullions, a plate roof
    const by0 = 5.6, by1 = 7.8, bz0 = zb - 0.6, bz1 = 5.6, bx0 = x0 - 0.4, bx1 = x1 + 0.2;
    P.add(plate, box(bx1 - bx0, 0.7, bz1 - bz0, (bx0 + bx1) / 2, by0 + 0.35, (bz0 + bz1) / 2));
    P.add(plate, box(bx1 - bx0 - 0.3, by1 - by0, bz1 - bz0 - 0.3, (bx0 + bx1) / 2 + 0.1, (by0 + by1) / 2, (bz0 + bz1) / 2 + 0.1));
    const gl = (w, h, d, x, y, z, rx, rz) => P.add('canopy', new THREE.BoxGeometry(w, h, d).rotateX(rx).rotateZ(rz).translate(x, y, z));
    gl(bx1 - bx0, 1.15, 0.08, (bx0 + bx1) / 2, by0 + 1.25, bz0 - 0.16, 0.25, 0);
    gl(0.08, 1.15, bz1 - bz0, bx0 - 0.16, by0 + 1.25, (bz0 + bz1) / 2, 0, -0.25);
    gl(0.08, 1.0, bz1 - bz0, bx1 + 0.12, by0 + 1.25, (bz0 + bz1) / 2, 0, 0.18);
    for (let x = bx0; x <= bx1 + 0.01; x += (bx1 - bx0) / 5) P.add('brass', new THREE.BoxGeometry(0.1, 1.25, 0.1).rotateX(0.25).translate(x, by0 + 1.25, bz0 - 0.16));
    for (let z = bz0; z <= bz1 + 0.01; z += (bz1 - bz0) / 5) P.add('brass', new THREE.BoxGeometry(0.1, 1.25, 0.1).rotateZ(-0.25).translate(bx0 - 0.16, by0 + 1.25, z));
    P.add('gunmetal', box(bx1 - bx0 + 1.0, 0.22, bz1 - bz0 + 1.0, (bx0 + bx1) / 2, by1 + 0.1, (bz0 + bz1) / 2));
    rim((bx0 + bx1) / 2, by1 + 0.24, (bz0 + bz1) / 2, bx1 - bx0 + 1.1, bz1 - bz0 + 1.1);
    const sigLamp = (x, y, z, red) => {
      P.add('brass', rod([x, y, z + 0.25], [x, y, z - 0.2], 0.22, 0.22, 10));
      P.add(plate, rod([x, y - 0.5, z], [x, y - 0.22, z], 0.06, 0.06, 5));
      S.add(red ? 'sigRed' : 'sig', new THREE.CircleGeometry(0.18, 10).rotateY(Math.PI).translate(x, y, z - 0.21));
      glow.push({ x, y, z: z - 0.4, r: 1.5, c: red ? 0xff3020 : 0xffd080 });
    };
    sigLamp(bx0 + 0.1, by1 + 0.75, bz0 - 0.2, true); sigLamp(bx1 - 0.2, by1 + 0.75, bz0 - 0.2, false);
    // the funnel: oval, raked aft, banded in brass and red, an open throat with the forge fire deep inside
    {
      const fz = 7.0, fy = 5.6, h = 9.5, rk = 0.3, g = new THREE.CylinderGeometry(1.1, 1.35, h, 22, 6, true).scale(1, 1, 1.6).translate(0, h / 2, 0);
      const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, p.getZ(i) + p.getY(i) * rk);
      g.computeVertexNormals(); P.add(plate, g.translate(cx, fy, fz));
      const rr = (y, k) => (1.35 - 0.25 * y / h) * k + 0.02;
      const band = (y, hh, mat, k = 1.04) => P.add(mat, new THREE.CylinderGeometry(rr(y, k), rr(y, k), hh, 22).scale(1, 1, 1.6).translate(cx, fy + y, fz + y * rk));
      band(1.0, 0.25, 'brass', 1.12); band(4.8, 0.25, 'brass'); band(7.7, 0.7, 'plateRed'); band(8.6, 0.25, 'brass');
      const tz = fz + h * rk, ty = fy + h;
      P.add('gunmetal', new THREE.CylinderGeometry(1.32, 1.12, 0.35, 22, 1, true).scale(1, 1, 1.6).translate(cx, ty + 0.12, tz));
      P.add('brass', new THREE.TorusGeometry(1.26, 0.07, 5, 22).rotateX(Math.PI / 2).scale(1, 1, 1.6).translate(cx, ty + 0.3, tz));
      P.add('dark', new THREE.CylinderGeometry(1.0, 1.0, 1.2, 22, 1, true).scale(1, 1, 1.6).translate(cx, ty - 0.5, tz));
      P.add('dark', new THREE.CircleGeometry(1.0, 22).rotateX(-Math.PI / 2).scale(1, 1, 1.6).translate(cx, ty - 1.05, tz));
      P.add('furnace', new THREE.CircleGeometry(0.62, 16).rotateX(-Math.PI / 2).scale(1, 1, 1.6).translate(cx, ty - 1.02, tz));
      for (const d of [-0.6, 0, 0.6]) P.add(plate, box(2.1, 0.06, 0.06, cx, ty + 0.05, tz + d * 1.4));
      P.add('brass', rod([cx, fy + 1.5, fz - 1.9], [cx, ty - 0.3, fz - 2.1 + (h - 0.3) * rk], 0.12, 0.12, 6));   // the whistle line
      P.add('brass', new THREE.ConeGeometry(0.28, 0.7, 8).rotateX(Math.PI).translate(cx, ty + 0.15, fz - 2.1 + (h - 0.3) * rk));
      const sm1 = smoke([cx, ty + 0.6, tz + 0.3], 13, ['#9a4424', '#3a2622'], 9, 3.0); ship.add(sm1.grp); fx.push(sm1);
      glow.push({ x: cx, y: ty + 0.5, z: tz, r: 4.2, c: 0xff4a18 });
    }
    // the brass lattice mast on the bridge roof: four tapering legs, X bracing, a yardarm with flags, the aether-finder
    const mx = cx - 0.5, mz = (bz0 + bz1) / 2 - 0.4, my0 = by1 + 0.2, my1 = 18.2;
    const leg = (dx, dz, f) => [mx + dx * lerp(1.0, 0.35, f), lerp(my0, my1, f), mz + dz * lerp(1.0, 0.35, f)];
    const LG = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    for (const [dx, dz] of LG) P.add('brass', rod(leg(dx, dz, 0), leg(dx, dz, 1), 0.1, 0.07, 6));
    for (let k = 0; k < 6; k++) {
      const f0 = k / 6, f1 = (k + 1) / 6;
      for (let i = 0; i < 4; i++) {
        const [ax, az] = LG[i], [bx, bz] = LG[(i + 1) % 4];
        P.add('bronze', rod(leg(ax, az, f0), leg(bx, bz, f1), 0.04, 0.04, 4));
        P.add('bronze', rod(leg(bx, bz, f0), leg(ax, az, f1), 0.04, 0.04, 4));
        P.add('brass', rod(leg(ax, az, f1), leg(bx, bz, f1), 0.05, 0.05, 4));
      }
    }
    const yy = lerp(my0, my1, 0.6);
    P.add(plate, box(1.8, 0.12, 1.8, mx, yy, mz)); P.add('brass', new THREE.TorusGeometry(1.2, 0.04, 4, 4).rotateX(Math.PI / 2).rotateY(Math.PI / 4).translate(mx, yy + 0.5, mz));
    P.add('gunmetal', rod([mx - 3.2, yy + 0.9, mz], [mx + 3.2, yy + 0.9, mz], 0.08, 0.08, 6));
    for (const d of [-3.1, 3.1]) sigLamp(mx + d, yy + 0.6, mz - 0.05, d < 0);
    for (const [mat, d, hh] of [['bloodSail', -2.5, 0.9], ['stripeYellow', -1.5, 0.8], ['blackSail', 1.6, 0.9], ['stripeRed', 2.5, 0.8]]) {
      const m = M[mat].clone(); m.side = THREE.DoubleSide;
      const fl = flag(m, 1.3, hh, [mx + d, yy + 0.85, mz], 0.12, 'signal'); fl.mesh.rotation.z = -1.05; ship.add(fl.mesh); waves.push(fl);
    }
    P.add(plate, box(1.2, 0.12, 1.2, mx, my1, mz));
    P.add('gunmetal', new THREE.CylinderGeometry(0.4, 0.5, 0.6, 10).translate(mx, my1 + 0.35, mz));
    P.add(plate, rod([mx, yy + 1.8, mz + 0.4], [mx, yy + 2.4, mz + 2.6], 0.06, 0.05, 5));
    { const fl = flag(M.blackSail, 3.0, 1.8, [mx, yy + 2.4, mz + 2.6], 0.25, 'ensign'); ship.add(fl.mesh); waves.push(fl); }
    { const fl = flag(M.bloodSail, 3.6, 0.6, [mx, my1 + 3.4, mz + 0.3], 0.15, 'pennant'); ship.add(fl.mesh); waves.push(fl); }
    P.add('brass', rod([mx, my1, mz + 0.3], [mx, my1 + 3.7, mz + 0.3], 0.06, 0.04, 5));
    // the aether-finder: a big brass dish that turns slowly, a cyan crystal burning at its focus
    var dishRef = new THREE.Group(); dishRef.position.set(mx, my1 + 0.75, mz);
    const DP = new Parts(M);
    DP.add('brass', new THREE.SphereGeometry(2.5, 20, 6, 0, TAU, 0, 0.7).translate(0, -2.5, 0).rotateX(-Math.PI / 2 + 0.35).translate(0, 1.5, 0.7));
    DP.add('bronze', new THREE.TorusGeometry(1.6, 0.09, 5, 28).rotateX(0.35).translate(0, 2.0, -0.85));
    for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + 0.4; DP.add('brass', rod([Math.cos(a) * 1.5, 1.5 + Math.sin(a) * 1.4, -0.7], [0, 2.3, -2.5], 0.045, 0.045, 4)); }
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; DP.add('bronze', rod([0, 1.5, 0.7], [Math.cos(a) * 1.55, 1.5 + Math.sin(a) * 1.45, -0.55], 0.03, 0.03, 4)); }
    DP.add('gunmetal', rod([0, 0, 0], [0, 1.4, 0.45], 0.2, 0.15, 8));
    DP.add('cyan', new THREE.OctahedronGeometry(0.32).translate(0, 2.32, -2.6), { uv: 'none' });
    dishRef.add(DP.build('aetherfinder')); ship.add(dishRef);
    glow.push({ x: mx, y: my1 + 3.1, z: mz - 2.3, r: 2.2, c: 0x5fd8ff });
  }

  // ---- gun galleries: plated sponsons off the deck edge, each with a sweeping twin brass gatling mount
  const GALLERY = [[-12.6, -48], [12.9, -46], [-15.6, -34], [14.4, 40], [-14.4, 58], [14.2, 57]];
  for (const [gx, gz] of GALLERY) {
    const sd = Math.sign(gx), yaw = (sd > 0 ? 0 : Math.PI) + (gz < -20 ? sd * 0.4 : gz > 50 ? -sd * 0.4 : 0);   // aim out, a little fore or aft
    const fy = -1.75, r = 2.3;
    P.add(plate, new THREE.CylinderGeometry(r, r * 0.92, 0.25, 20).translate(gx, fy, gz));
    P.add(plate, new THREE.ConeGeometry(r * 0.9, 2.4, 16).rotateX(Math.PI).translate(gx, fy - 1.3, gz));
    for (const y of [-2.2, -2.9]) P.add('brass', new THREE.TorusGeometry(lerp(r * 0.9, 0, (fy - y - 0.1) / 2.4), 0.05, 4, 20).rotateX(Math.PI / 2).translate(gx, y, gz));
    P.add(plate, arcWall(r - 0.12, r, yaw - 1.6, yaw + 1.6, 0.9).translate(gx, fy + 0.12, gz));
    P.add('brass', arcWall(r - 0.16, r + 0.05, yaw - 1.6, yaw + 1.6, 0.1).translate(gx, fy + 1.02, gz));
    for (let i = -2; i <= 2; i++) { const a = yaw + i * 0.6; P.add('plateRed', box(0.12, 0.5, 0.28, gx + Math.cos(a) * (r + 0.07), fy + 0.6, gz - Math.sin(a) * (r + 0.07), a)); }
    const g = new THREE.Group(), GP = new Parts(M), bar = [];
    GP.add('gunmetal', new THREE.CylinderGeometry(0.4, 0.55, 0.6, 12).translate(0, 0.3, 0));
    GP.add('bronze', box(0.8, 0.4, 1.5, 0, 0.75, 0));
    GP.add(plate, arcWall(0.95, 1.03, -0.75, 0.75, 0.85).translate(0, 0.65, 0));
    GP.add('copper', new THREE.CylinderGeometry(0.34, 0.34, 0.5, 12).translate(-0.35, 1.0, 0));    // the ammunition drum
    GP.add('brass', rod([-0.9, 0.65, 0], [-0.55, 0.95, 0], 0.05, 0.05, 5));
    GP.add('dark', box(0.4, 0.1, 0.4, -0.9, 0.55, 0));
    for (const z of [-0.5, 0.5]) {
      GP.add('bronze', rod([-0.5, 1.0, z], [0.2, 1.0, z], 0.24, 0.24, 10));
      for (const x of [0.5, 1.5]) GP.add('gunmetal', rod([x, 1.0, z], [x + 0.12, 1.0, z], 0.21, 0.21, 10));
      const b = new THREE.Group(), BP = new Parts(M);
      for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; BP.add('brass', rod([0.15, Math.sin(a) * 0.13, Math.cos(a) * 0.13], [1.8, Math.sin(a) * 0.13, Math.cos(a) * 0.13], 0.045, 0.045, 5)); }
      b.add(BP.build('barrels')); b.position.set(0, 1.0, z); g.add(b); bar.push(b);
    }
    g.add(GP.build('gatling')); g.position.set(gx, fy + 0.12, gz); g.rotation.y = yaw; ship.add(g);
    guns.push({ g, bar, yaw, ph: gx * 0.7 + gz * 0.13 });
  }
  // boats in davits under the overhang
  for (const [z, side] of [[-25, 1], [49.5, 1], [16, -1], [52, -1]]) {
    const s = sAt(z), x = side * (hx(s, -2.4) + 1.3);
    dinghy(P, x, -2.1, z, 4.4, 0.95, { mat: 'tar', inner: 'cypress', rim: 'brass' });
    for (const dz of [-1.7, 1.7]) {
      P.add(plate, rod([side * hx(s, -1.2), -1.2, z + dz], [x, -1.0, z + dz], 0.08, 0.08, 5));
      P.add('steel', rod([x, -1.0, z + dz], [x, -2.0, z + dz], 0.025, 0.025, 4));
    }
  }

  ship.add(P.build('carrier'), S.build('signals'));
  root.add(PW.build('paint'));

  // ---- the jets (game frame): parked ones merged, the two on the catapults live and spooling up
  const parked = JET_SPOTS.filter((s) => s[4]);
  root.add(parkedJets(M, parked));
  const live = JET_SPOTS.filter((s) => !s[4]).map(([x, y, z, h, , kind]) => {
    const j = buildJet(M, kind, { folded: false }); j.setGear(true); j.setThrottle(0.6);
    j.root.traverse((o) => { if (o.isMesh && o.material?.isMeshStandardMaterial && !o.material.transparent && o.geometry.attributes.position.count > 60) o.geometry = decimate(o.geometry, JET_CELL); });
    j.root.position.set(x, y, z); j.root.rotation.y = h; root.add(j.root);
    for (const gl of j.info.glow || []) { const v = new THREE.Vector3(gl.x, gl.y, gl.z).applyAxisAngle(new THREE.Vector3(0, 1, 0), h); glow.push({ ...gl, x: v.x + x, y: v.y + y, z: v.z + z, game: true }); }
    return j;
  });
  finish(root);
  for (const f of fx) f.grp.traverse((o) => { o.castShadow = false; });

  // crew spots (design frame; the boss stands on the flag-bridge platform)
  const crewD = [[-4, 0, -8, 'hero'], [-7, 0, 6, 'hero'], [-2, 0, 24, 'hero'], [-9, 0, -30, 'hero'], [3.2, 0, -22, 'pirate'], [7, 0, 26, 'pirate'],
    [4.2, 0, 45, 'pirate'], [0, 0, -44, 'pirate'], [10.6, BOSS.y, -2.5, 'pirate'], [-9.6, 0, 50, 'pirate']];
  const gx = (o) => o.game ? o : { ...o, x: -o.x };
  return {
    root,
    anim(t, dt) {
      for (const f of fx) f.update(t);
      for (const w of waves) w.update(t);
      for (const j of live) j.anim(t, dt);
      dishRef.rotation.y = t * 0.45;
      for (const { g, bar, yaw, ph } of guns) {
        g.rotation.y = yaw + Math.sin(t * 0.35 + ph) * 0.55;
        const burst = Math.sin(t * 0.9 + ph * 2) > 0.6;
        for (const b of bar) b.rotation.x += burst ? 0.9 : 0.02;
      }
      sigMat.emissiveIntensity = Math.sin(t * 7) > 0.2 ? 3 : 0.4;
      sigRed.emissiveIntensity = Math.sin(t * 2.3) > 0 ? 2.6 : 0.5;
      laneMat.emissiveIntensity = 1.2 + 1.4 * Math.max(0, Math.sin(t * 5));        // the lanes' launch warning
      elevators.forEach(({ g, ph }, i) => {                                           // up, down to the hangar and back, staggered
        const c = (t + ph) % 26, f = lift[i] ?? (c < 12 ? 0 : c < 15 ? sm(12, 15, c) : c < 23 ? 1 : 1 - sm(23, 26, c));
        g.position.y = -f * LIFT;
      });
    },
    info: {
      length: 140, beam: 29.5, waterline: WL, hl: L / 2 - 1, hb: 9.8, glow: glow.map(gx), crew: crewD.map(([x, y, z, w]) => [-x, y, z, w]),
      jetSpots: JET_SPOTS, name: 'The Anvil', outline: CARRIER.OUTLINE, catapults: CARRIER.CATS, elevators: CARRIER.ELEV, island: CARRIER.ISLAND,
      bossDeck: { ...CARRIER.BOSS, stair: { x0: -12.5, x1: -9.9, z0: BOSS.z0 - 13 * 0.42, z1: BOSS.z0, y0: 0, y1: BOSS.y } },
      // a scenario's hold on the elevators (lift[i]: 0 up at the flight deck .. 1 down in the hangar, LIFT under it; null
      // cycles them as in the viewer) and the two live jets on the catapults (CARRIER.CATS order: [kestrel, thunderhawk])
      lift, liftDepth: LIFT, catJets: live,
    },
  };
}
