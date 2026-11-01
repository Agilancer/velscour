// Velscour's Black Tide, the small craft (docs/PIRATE_SEAS.md): the boats that row and sail in close and board.
//   longboat - a rowed boarding boat, the gasbag sloop's sea cousin without the balloon: clinker strakes, eight oars
//              that row (catch, pull, lift, feather), a patched lug sail, a bow swivel gun, grapnels, a boarding ladder (9 x 2.6)
//   cutter   - the air harpoon cutter at sea: a narrow scorched hull, black lateen and jib, the chained harpoon
//              ballista and bow spikes, a port outrigger float, a raised steering platform with a tiller        (14 x 3.4)
// Same frame as every sea ship: 1 unit = 1 tile, bow toward -Z, starboard +X, deck (the longboat's floorboards) at y = 0.
// Both carry a red accent that holds up at night, in fog and in the blood tide: crimson sail bands, a red strake and
// red-lit stern lamps. buildLongboat(M) / buildSeaCutter(M) -> { root, anim(t, dt), info }.
import * as THREE from 'three';
import { Parts, box, rod, surf, flag, sm, seaHull, triSail, lines, lamp, skullPlate, finish, lerp, clamp, TAU } from './seaship3d.js';

const V = (a) => new THREE.Vector3(...a);
const round = (k) => Math.pow(Math.max(0, 1 - Math.pow(k, 2.4)), 0.5);

/** Geometry g turned by the Euler angles (about its own origin) and moved to p. */
export function place(g, p, rx = 0, ry = 0, rz = 0, order = 'XYZ') {
  g.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rx, ry, rz, order))); return g.translate(p[0], p[1], p[2]);
}
/** Points along a sagging line from a to b (a chain or a rope hanging under its weight). */
export function sag(a, b, drop = 0.3, n = 8) {
  const out = [];
  for (let i = 0; i <= n; i++) { const t = i / n; out.push([lerp(a[0], b[0], t), lerp(a[1], b[1], t) - drop * 4 * t * (1 - t), lerp(a[2], b[2], t)]); }
  return out;
}
/** A chain of alternating links along the polyline pts, into P. */
export function chain(P, mat, pts, link = 0.16, r = 0.028) {
  const segs = []; let total = 0;
  for (let i = 0; i < pts.length - 1; i++) { const a = V(pts[i]), b = V(pts[i + 1]), l = a.distanceTo(b); if (l > 1e-4) { segs.push([a, b, l]); total += l; } }
  const step = link * 0.72, n = Math.max(1, Math.floor(total / step)), X = new THREE.Vector3(1, 0, 0);
  for (let k = 0; k <= n; k++) {
    let d = k * step, i = 0; while (i < segs.length - 1 && d > segs[i][2]) { d -= segs[i][2]; i++; }
    const [a, b, l] = segs[i], dir = b.clone().sub(a).normalize(), p = a.clone().addScaledVector(dir, Math.min(d, l));
    const g = new THREE.TorusGeometry(link * 0.3, r, 4, 8).scale(1.6, 1, 1);
    if (k % 2) g.rotateX(Math.PI / 2);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(X, dir)); g.translate(p.x, p.y, p.z); P.add(mat, g);
  }
}
/** A coil of rope (stacked rings) on a surface at y. */
export function coil(P, x, y, z, r = 0.24, turns = 3) {
  for (let i = 0; i < turns; i++) P.add('hemp', new THREE.TorusGeometry(r - i * 0.035, 0.035, 4, 14).rotateX(Math.PI / 2).translate(x, y + 0.035 + i * 0.06, z));
}
/** A grapnel lying or leaning: four barbed tines and a ring, turned by (rx, rz) and set at p. */
export function hook(P, p, s = 1, rx = 0, rz = 0, mat = 'iron') {
  const add = (g) => P.add(mat, place(g, p, rx, 0, rz));
  add(rod([0, 0, 0], [0, 0.7 * s, 0], 0.045 * s, 0.045 * s, 6));
  add(new THREE.TorusGeometry(0.09 * s, 0.025 * s, 4, 8).translate(0, 0.78 * s, 0));
  for (let i = 0; i < 4; i++) {
    const a = i / 4 * TAU + 0.4, c = Math.cos(a), sn = Math.sin(a);
    add(rod([0, 0.02, 0], [c * 0.3 * s, 0.1 * s, sn * 0.3 * s], 0.035 * s, 0.03 * s, 5));
    add(new THREE.ConeGeometry(0.035 * s, 0.2 * s, 4).translate(c * 0.32 * s, 0.22 * s, sn * 0.32 * s));
  }
}
/** The materials only these boats use, added to M once: rope, the black flag, red stern glass, the crimson sail band. */
export function smallMaterials(M) {
  if (M.hemp && M.jollyRoger && M.redGlass) return M;
  const hemp = M.canvas.clone(); hemp.color = new THREE.Color(0x9a7a52); hemp.side = THREE.FrontSide; M.hemp = hemp;
  M.redGlass = new THREE.MeshStandardMaterial({ color: 0xff8070, emissive: 0xff2414, emissiveIntensity: 2.0, roughness: 0.5 });
  M.greenGlass = new THREE.MeshStandardMaterial({ color: 0xc8ffd0, emissive: 0x30ff70, emissiveIntensity: 2.0, roughness: 0.4 });
  // the Black Tide's flag: a ragged black field, a bone skull with red eyes over crossed bones (pixel art, 32 x 20)
  const W = 32, H = 20, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
  x.fillStyle = '#17131a'; x.fillRect(0, 0, W, H);
  const px = (X, Y, col) => { x.fillStyle = col; x.fillRect(X, Y, 1, 1); };
  const bone = '#e8dec6';
  // Velscour's crimson V: a gothic V, two equal strokes 3 px wide mirrored about the flag's middle, apex down, a dark
  // outline on both edges and flared serifs at the top of each arm (drawn on the left, mirrored to the right)
  const V = (X, Y, col) => { px(X, Y, col); px(W - 1 - X, Y, col); };
  for (let Y = 8; Y <= 19; Y++) {
    const c0 = Math.round(7 + (Y - 8) * (14 - 7) / 11);            // the stroke's left edge: 7 at the top, 14 at the apex
    V(c0 - 1, Y, '#4a0a10');
    for (let k = 0; k < 3; k++) V(c0 + k, Y, '#c8222c');
    if (c0 + 3 < W / 2) V(c0 + 3, Y, '#4a0a10');
  }
  for (let X = 5; X <= 11; X++) V(X, 8, X === 5 || X === 11 ? '#4a0a10' : '#c8222c');   // the serifs
  V(15, 19, '#c8222c');
  for (let Y = 0; Y <= 6; Y++) for (let X = 11; X <= 20; X++) if (((X - 15.5) / 4.3) ** 2 + ((Y - 3) / 3.2) ** 2 < 1) px(X, Y, bone);
  for (let X = 13; X <= 18; X++) px(X, 6, bone);
  x.fillStyle = '#17131a'; x.fillRect(13, 3, 2, 2); x.fillRect(17, 3, 2, 2); x.fillRect(15, 5, 2, 1);
  for (let X = 14; X <= 17; X += 2) x.fillRect(X, 6, 1, 1);
  px(13, 4, '#e0342a'); px(17, 4, '#e0342a');
  for (let Y = 0; Y < H; Y++) { const cut = [0, 2, 1, 3, 0, 1, 2, 2, 0, 1, 3, 1, 0, 2, 3, 1, 0, 2, 1, 0][Y]; x.clearRect(W - cut, Y, cut, 1); }   // a ragged fly, clear of the V
  for (const [X, Y] of [[25, 3], [3, 16], [28, 4], [2, 5]]) x.clearRect(X, Y, 1, 1);
  const t = new THREE.CanvasTexture(c); t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.colorSpace = THREE.SRGBColorSpace;
  M.jollyRoger = new THREE.MeshStandardMaterial({ map: t, side: THREE.DoubleSide, alphaTest: 0.5, roughness: 0.95 });
  return M;
}
/** Crimson bands painted across a sail from triSail/squareSail: a second mesh on the same (animated) geometry, cut by
 *  an alpha map in the sail's own uv (bands: [[v0, v1], ...] across v, or set axis 'u'). Glows a touch in the dark. */
export function sailBands(M, sail, bands, axis = 'v') {
  const N = 128, c = document.createElement('canvas'); c.width = axis === 'u' ? N : 2; c.height = axis === 'u' ? 2 : N;
  const x = c.getContext('2d'); x.fillStyle = '#000'; x.fillRect(0, 0, c.width, c.height); x.fillStyle = '#fff';
  for (const [a, b] of bands) axis === 'u' ? x.fillRect(a * N, 0, (b - a) * N, 2) : x.fillRect(0, (1 - b) * N, 2, (b - a) * N);
  const am = new THREE.CanvasTexture(c); am.magFilter = THREE.NearestFilter;
  const m = M.bloodSail.clone(); m.side = THREE.DoubleSide; m.alphaMap = am; m.alphaTest = 0.5; m.transparent = false;
  if (m.map) { m.map = sail.mesh.material.map.clone(); m.map.needsUpdate = true; m.bumpMap = m.map; }
  m.emissive = new THREE.Color(0x5a0c0a); m.emissiveIntensity = 0.55;
  m.polygonOffset = true; m.polygonOffsetFactor = -2; m.polygonOffsetUnits = -4;
  const band = new THREE.Mesh(sail.mesh.geometry, m); band.name = 'sailband'; band.castShadow = false;
  return band;
}

// ------------------------------------------------------------------ an oar's stroke
/** The rowing cycle, phase p 0..1: the catch at 0 (blade dropping in, forward), the drive (blade buried, sweeping
 *  aft), the release (blade lifts and feathers flat), the recovery (feathered, swinging forward), squaring for the catch. */
function stroke(p) {
  const sweep = p < 0.46 ? lerp(0.5, -0.42, sm(0, 0.46, p)) : lerp(-0.42, 0.5, sm(0.5, 0.97, p));
  const dip = p < 0.42 ? 1 : p < 0.52 ? 1 - sm(0.42, 0.52, p) : p < 0.88 ? 0 : sm(0.88, 1, p);
  const fea = sm(0.47, 0.56, p) * (1 - sm(0.84, 0.92, p));
  return { sweep, elev: lerp(0.3, 0.6, dip), feather: fea * Math.PI / 2 };
}

// ------------------------------------------------------------------ the longboat
export function buildLongboat(M) {
  smallMaterials(M);
  const L = 9, B = 1.3, WL = -0.3, root = new THREE.Group(); root.name = 'longboat';
  const P = new Parts(M), glow = [], waves = [], sails = [];
  const beam = (s) => B * (s < 0.45 ? lerp(0.66, 1, Math.sin(s / 0.45 * Math.PI / 2)) : Math.pow(Math.max(0, 1 - ((s - 0.45) / 0.55) ** 2), 0.6));
  const sheer = (s) => 0.5 + 0.35 * (1 - s) ** 3 + 0.85 * s ** 3.5;
  const keel = (s) => -1.2 + 0.1 * (1 - s) ** 2 + 0.85 * Math.pow(sm(0.7, 1, s), 1.4);
  const H = { L, beam, sheer, keel, prof: round, ns: 54, transom: 'scorched', bands: [['tar', WL + 0.09, WL - 0.07, 1], ['copper', WL - 0.07, null, 5]] };
  const { zAt, sAt, hullX } = seaHull(P, H);
  const face = (mat, s0, s1, f, flip, n = 40) => P.add(mat, surf(n, 1, (u, v) => f(lerp(s0, s1, u), v), undefined, flip));

  // clinker strakes above the boot-top, each lapping out over the one below; a red strake under the sheer strake
  const YB = WL + 0.09, STR = ['blackwood', 'redPaint', 'scorched', 'mossed', 'scorched', 'mossed'], NST = STR.length;
  STR.forEach((mat, i) => { for (const side of [1, -1]) P.add(mat, surf(54, 2, (u, v) => {
    const s = lerp(0.003, 0.997, u), top = sheer(s), yt = lerp(top, YB, i / NST), yb = lerp(top, YB, (i + 1) / NST) - (i < NST - 1 ? 0.035 : 0);
    const y = lerp(yt, yb, v), taper = clamp(beam(s) / 0.25, 0, 1);
    return [side * (hullX(s, y) + (0.012 + 0.03 * v) * taper), y, zAt(s)];
  }, (u, v) => { const s = lerp(0.003, 0.997, u), top = sheer(s); return [zAt(s) / 2, lerp(lerp(top, YB, i / NST), lerp(top, YB, (i + 1) / NST), v) / 2]; }, side > 0), { uv: 'keep' }); });
  // the inside: ceiling planks, ribs, floorboards, the stern sheets and the bow seat, the transom's inner face
  for (const side of [1, -1]) P.add('cypress', surf(44, 3, (u, v) => {
    const s = lerp(0.012, 0.996, u), y = lerp(sheer(s), -0.02, v); return [side * Math.max(0.01, hullX(s, y) - 0.07), y, zAt(s)];
  }, (u, v) => { const s = lerp(0.012, 0.996, u); return [zAt(s) / 2, lerp(sheer(s), 0, v) / 2]; }, side < 0), { uv: 'keep' });
  P.add('scorched', box(2 * (beam(0) - 0.08), sheer(0) + 0.02, 0.07, 0, sheer(0) / 2 - 0.01, zAt(0) - 0.07));
  for (let s = 0.1; s < 0.86; s += 0.055) for (const side of [1, -1]) { const h = sheer(s) - 0.02; P.add('blackwood', box(0.05, h, 0.07, side * (hullX(s, h / 2) - 0.1), h / 2, zAt(s))); }
  P.add('cedar', surf(30, 1, (u, v) => { const s = lerp(0.13, 0.87, u); return [(v * 2 - 1) * (hullX(s, 0) - 0.09), 0, zAt(s)]; }, (u, v) => { const s = lerp(0.13, 0.87, u); return [zAt(s) / 2, (v * 2 - 1) * (hullX(s, 0) - 0.09) / 2]; }, true), { uv: 'keep' });
  for (let x = -0.9; x <= 0.91; x += 0.3) P.add('blackwood', box(0.025, 0.012, 6.4, x, 0.006, zAt(0.5)));   // floorboard seams
  const seat = (s0, s1, y, m) => {
    P.add(m, surf(12, 1, (u, v) => { const s = lerp(s0, s1, u); return [(v * 2 - 1) * Math.max(0.02, hullX(s, y) - 0.08), y, zAt(s)]; }, (u, v) => { const s = lerp(s0, s1, u); return [zAt(s) / 2, (v * 2 - 1) * hullX(s, y) / 2]; }, true), { uv: 'keep' });
    const se = s0 < 0.5 ? s1 : s0; P.add('blackwood', box(2 * (hullX(se, y) - 0.08), y, 0.06, 0, y / 2, zAt(se)));
  };
  seat(0.014, 0.14, 0.36, 'bonenail'); seat(0.86, 0.996, 0.42, 'bonenail');
  // gunwale: a capping rail with an outer rubbing strake, following the sheer
  for (const side of [1, -1]) {
    face('blackwood', 0.004, 0.996, (s, v) => [side * (beam(s) + lerp(0.06, -0.12, v) * clamp(beam(s) / 0.2, 0, 1)), sheer(s) + 0.07, zAt(s)], side < 0);
    face('blackwood', 0.004, 0.996, (s, v) => [side * (beam(s) + 0.06 * clamp(beam(s) / 0.2, 0, 1)), sheer(s) + 0.07 - 0.17 * v, zAt(s)], side > 0);
    face('blackwood', 0.004, 0.996, (s, v) => [side * (beam(s) - 0.12 * clamp(beam(s) / 0.2, 0, 1)), sheer(s) + 0.07 - 0.12 * v, zAt(s)], side < 0);
  }
  // keel, stem and its skull, the transom's knees
  for (let s = 0.0; s < 0.99; s += 0.06) P.add('blackwood', rod([0, keel(s) + 0.04, zAt(s)], [0, keel(Math.min(0.996, s + 0.06)) + 0.04, zAt(Math.min(0.996, s + 0.06))], 0.06, 0.06, 5));
  P.add('blackwood', rod([0, keel(0.99), zAt(0.994)], [0, sheer(1) + 0.32, zAt(1) - 0.1], 0.07, 0.065, 6));
  {
    const sk = [0, sheer(1) + 0.5, zAt(1) - 0.12];
    P.add('boneWhite', new THREE.SphereGeometry(0.15, 8, 6).scale(0.9, 1, 1).translate(...sk));
    P.add('boneWhite', box(0.17, 0.08, 0.12, sk[0], sk[1] - 0.14, sk[2] - 0.04));
    for (const dx of [-0.055, 0.055]) P.add('dark', new THREE.SphereGeometry(0.04, 5, 4).translate(sk[0] + dx, sk[1] + 0.01, sk[2] - 0.12));
    for (const side of [1, -1]) skullPlate(P, side * (beam(0.84) + 0.05), sheer(0.84) - 0.32, zAt(0.84), side, 0.26);
  }

  // thwarts with knees, the rowers' benches; each pulls two oars (double banked)
  const TH = [0.25, 0.41, 0.57, 0.73], oars = [];
  for (const s of TH) {
    const z = zAt(s), y = 0.34, w = hullX(s, y) - 0.07;
    P.add('cedar', box(2 * w, 0.07, 0.3, 0, y, z));
    P.add('blackwood', box(0.08, y - 0.03, 0.08, 0, (y - 0.03) / 2, z));
    for (const side of [1, -1]) P.add('blackwood', box(0.06, sheer(s) - y, 0.2, side * (w - 0.02), (sheer(s) + y) / 2, z));
    const zo = z + 0.38, so = sAt(zo), yo = sheer(so) + 0.1;
    for (const side of [1, -1]) {
      const xo = side * (beam(so) + 0.02);
      for (const dz of [-0.09, 0.09]) P.add('iron', rod([xo, sheer(so) + 0.06, zo + dz], [xo, sheer(so) + 0.27, zo + dz], 0.025, 0.02, 5));   // thole pins
      const outer = new THREE.Group(), inner = new THREE.Group(), R = new Parts(M);
      outer.position.set(xo, yo, zo); outer.scale.x = side; inner.rotation.order = 'YZX';
      R.add('cedar', rod([-1.05, 0, 0], [1.9, 0, 0], 0.045, 0.038, 6), { swap: true });
      R.add('cedar', box(0.82, 0.29, 0.045, 2.18, 0, 0));
      R.add('iron', box(0.06, 0.31, 0.06, 2.6, 0, 0));
      R.add('redPaint', box(0.12, 0.3, 0.05, 2.46, 0, 0));
      R.add('dark', rod([-0.12, 0, 0], [0.16, 0, 0], 0.058, 0.058, 6));
      R.add('blackwood', rod([-1.08, 0, 0], [-0.78, 0, 0], 0.036, 0.036, 6));
      inner.add(R.build('oar')); outer.add(inner); root.add(outer);
      const fm = new THREE.MeshBasicMaterial({ color: 0xf2fbff, transparent: true, opacity: 0, depthWrite: false });
      const foam = new THREE.Mesh(new THREE.RingGeometry(0.12, 0.3, 14).rotateX(-Math.PI / 2), fm); foam.renderOrder = 3; root.add(foam);
      oars.push({ outer, inner, side, ph: -TH.indexOf(s) * 0.012, foam, age: 9, last: 0 });
    }
  }
  // mast (stepped through the fore thwart), lug yard and sail in patched charcoal with a crimson band
  const zm = zAt(0.73);
  P.add('blackwood', box(0.3, 0.12, 0.4, 0, 0.06, zm));
  P.add('cedar', rod([0, 0, zm], [0, 5.1, zm + 0.15], 0.095, 0.06, 8), { swap: true });
  for (const y of [1.25, 2.7, 4.1]) P.add('iron', rod([0, y, zm + 0.03 * y], [0, y + 0.1, zm + 0.03 * y], 0.1 - 0.008 * y, undefined, 8));
  P.add('blackwood', box(0.16, 0.24, 0.16, 0, 4.95, zm + 0.15));
  const T = [-0.14, 3.95, zm - 0.75], A = [-0.14, 5.55, zm + 2.75];
  P.add('cedar', rod([T[0], T[1] - 0.05, T[2] - 0.12], [A[0], A[1] + 0.04, A[2] + 0.1], 0.06, 0.045, 6), { swap: true });
  const clew = [-0.14, 1.95, zm + 3.05], tack = [-0.14, 1.8, zm - 0.45];
  const lug = triSail(M.patched, [T[0], T[1] - 0.07, T[2] + 0.05], [A[0], A[1] - 0.1, A[2] - 0.05], clew, 0.5, -1, tack);
  root.add(lug.mesh); sails.push(lug); root.add(sailBands(M, lug, [[0.12, 0.2], [0.26, 0.29]]));
  const sling = [T[0], lerp(T[1], A[1], 0.3), lerp(T[2], A[2], 0.3)], sq = sAt(zm + 0.3);
  const rig = [[0, 5.05, zm + 0.15], sling, [0, 5.0, zm + 0.15], [0.06, 0.4, zm + 0.12], [0, 4.85, zm + 0.14], [0, sheer(1) + 0.22, zAt(1) + 0.05],
    clew, [0.85, sheer(0.05) + 0.07, zAt(0.05)], tack, [0, 0.4, zm - 0.1]];
  for (const side of [1, -1]) rig.push([0, 4.0, zm + 0.1], [side * beam(sq), sheer(sq) + 0.07, zm + 0.3], [0, 4.0, zm + 0.1], [side * beam(sq + 0.06), sheer(sq + 0.06) + 0.07, zm - 0.24]);
  root.add(lines(rig, M.rope));
  // the swivel gun on its post in the bow, a linstock with a lit slow match beside it
  const zs = zAt(0.935);
  P.add('iron', rod([0, 0.42, zs], [0, 0.96, zs], 0.05, 0.045, 6));
  P.add('iron', new THREE.CylinderGeometry(0.1, 0.12, 0.08, 8).translate(0, 0.46, zs));
  const swivel = new THREE.Group(); swivel.position.set(0, 0.98, zs);
  {
    const R = new Parts(M);
    for (const dx of [-0.14, 0.14]) R.add('iron', box(0.04, 0.24, 0.08, dx, 0.08, 0));
    R.add('iron', box(0.32, 0.05, 0.08, 0, -0.03, 0));
    R.add('iron', rod([-0.14, 0.16, 0], [0.14, 0.16, 0], 0.03, 0.03, 6));
    R.add('bronze', rod([0, 0.16, 0.38], [0, 0.16, -0.72], 0.105, 0.075, 10));
    R.add('bronze', rod([0, 0.16, -0.66], [0, 0.16, -0.76], 0.1, 0.1, 10));
    R.add('bronze', rod([0, 0.16, 0.1], [0, 0.16, 0.18], 0.115, 0.115, 10));
    R.add('dark', new THREE.CircleGeometry(0.05, 8).translate(0, 0.16, -0.761).rotateY(0));
    R.add('bronze', new THREE.SphereGeometry(0.07, 6, 5).translate(0, 0.16, 0.44));
    R.add('iron', rod([0, 0.16, 0.44], [0, 0.0, 0.92], 0.025, 0.025, 5));
    R.add('blackwood', new THREE.SphereGeometry(0.045, 6, 4).translate(0, 0.0, 0.94));
    swivel.add(R.build('swivel'));
  }
  root.add(swivel);
  P.add('blackwood', rod([0.36, 0.42, zs + 0.3], [0.44, 1.22, zs + 0.18], 0.025, 0.02, 5));
  P.add('ember', new THREE.SphereGeometry(0.035, 6, 4).translate(0.445, 1.25, zs + 0.175));
  glow.push({ x: 0.445, y: 1.25, z: zs + 0.175, r: 0.55, c: 0xff4a1a });
  // the boarding ladder leant over the port bow, iron hooks ready to bite an enemy rail
  {
    const c0 = [-0.36, 0.42, zAt(0.875)], c1 = [-0.5, 2.5, -4.75], n = 8;
    for (const dx of [-0.21, 0.21]) P.add('cedar', rod([c0[0] + dx, c0[1], c0[2]], [c1[0] + dx, c1[1], c1[2]], 0.04, 0.04, 5));
    for (let i = 1; i < n; i++) { const t = i / n, p = [lerp(c0[0], c1[0], t), lerp(c0[1], c1[1], t), lerp(c0[2], c1[2], t)]; P.add('blackwood', rod([p[0] - 0.21, p[1], p[2]], [p[0] + 0.21, p[1], p[2]], 0.025, 0.025, 4)); }
    for (const dx of [-0.21, 0.21]) {
      const x = c1[0] + dx, pts = [[x, c1[1], c1[2]], [x, c1[1] + 0.14, c1[2] - 0.2], [x, c1[1] - 0.02, c1[2] - 0.4], [x, c1[1] - 0.2, c1[2] - 0.3]];
      for (let i = 0; i < 3; i++) P.add('iron', rod(pts[i], pts[i + 1], 0.035, 0.03, 5));
    }
  }
  // grapnels coiled on the stern sheets and by the fore thwart
  coil(P, -0.5, 0.36, zAt(0.07)); hook(P, [-0.42, 0.55, zAt(0.07) - 0.05], 0.85, 0.2, -1.1);
  coil(P, 0.42, 0, zAt(0.81), 0.22); hook(P, [0.45, 0.2, zAt(0.81)], 0.8, -0.3, 0.9);
  // the stern: rudder and tiller, a red-lit lantern on a crook (port quarter), the black flag on a staff (starboard)
  // the steering sweep: a long oar in an iron crutch on the transom, its blade trailing in the wake
  P.add('blackwood', box(0.12, sheer(0) + 1.1, 0.1, 0, (sheer(0) - 1.1) / 2, zAt(0) + 0.05));
  P.add('iron', rod([0.18, sheer(0) + 0.05, zAt(0)], [0.18, sheer(0) + 0.3, zAt(0)], 0.03, 0.03, 5));
  P.add('iron', new THREE.TorusGeometry(0.07, 0.02, 4, 8, Math.PI).translate(0.18, sheer(0) + 0.3, zAt(0)));
  const sweep = new THREE.Group(); sweep.position.set(0.18, sheer(0) + 0.28, zAt(0));
  {
    const R = new Parts(M), d = new THREE.Vector3(0.75, WL - 0.3 - sheer(0) - 0.28, 3.2).normalize(), at = (f) => [d.x * f, d.y * f, d.z * f];
    R.add('cedar', rod(at(-1.5), at(3.0), 0.05, 0.045, 6), { swap: true });
    const bl = new THREE.BoxGeometry(0.05, 0.36, 1.0); bl.lookAt(d); R.add('cedar', bl.translate(...at(3.4)));
    R.add('redPaint', new THREE.BoxGeometry(0.055, 0.37, 0.2).lookAt(d).translate(...at(3.85)));
    R.add('dark', rod(at(-0.12), at(0.15), 0.065, 0.065, 6));
    R.add('blackwood', rod(at(-1.55), at(-1.25), 0.04, 0.04, 6));
    sweep.add(R.build('sweep'));
  }
  root.add(sweep);
  {
    const x = -0.62, z0 = zAt(0.03);
    P.add('iron', rod([x, sheer(0.03), z0], [x, 1.95, z0 + 0.06], 0.035, 0.03, 5));
    P.add('iron', rod([x, 1.95, z0 + 0.06], [x, 1.95, zAt(0) + 0.35], 0.03, 0.03, 5));
    P.add('iron', rod([x, 1.95, zAt(0) + 0.35], [x, 1.81, zAt(0) + 0.35], 0.015, 0.015, 4));
    glow.push({ ...lamp(P, x, 1.3, zAt(0) + 0.35, 1, 0xff3020, 'redGlass'), r: 1.6 });
  }
  P.add('blackwood', rod([0.6, sheer(0.02) - 0.2, zAt(0.02)], [0.6, 2.9, zAt(0.02) + 0.06], 0.035, 0.028, 5));
  P.add('goldHammer', new THREE.SphereGeometry(0.05, 6, 4).translate(0.6, 2.93, zAt(0.02) + 0.06));
  const fl = flag(M.jollyRoger, 1.5, 0.95, [0.6, 2.86, zAt(0.02) + 0.06], 0.14, 'flag'); waves.push(fl); root.add(fl.mesh);

  root.add(P.build('longboat'));
  finish(root);
  for (const o of oars) o.foam.castShadow = o.foam.receiveShadow = false;
  const v = new THREE.Vector3();
  function anim(t, dt) {
    for (const o of oars) {
      const p = ((t * 0.62 + o.ph) % 1 + 1) % 1, k = stroke(p);
      o.inner.rotation.set(k.feather, k.sweep, -k.elev);
      if (o.last < 0.95 && p >= 0.95) o.age = 0;                // the blade bites: a ring of foam where it went in
      o.last = p; o.age += dt;
      if (o.age < 0.9) {
        v.set(2.2, 0, 0).applyEuler(o.inner.rotation); v.x *= o.side; v.add(o.outer.position);
        if (o.age < dt * 1.5) o.foam.position.set(v.x, WL + 0.03, v.z);
        o.foam.scale.setScalar(0.6 + o.age * 1.6); o.foam.material.opacity = 0.7 * (1 - o.age / 0.9);
      } else o.foam.material.opacity = 0;
    }
    for (const s of sails) s.update(t);
    for (const w of waves) w.update(t);
    swivel.rotation.y = 0.28 * Math.sin(t * 0.45); sweep.rotation.y = 0.08 * Math.sin(t * 0.3); swivel.rotation.x = 0.04 * Math.sin(t * 0.7);
  }
  const crew = [[0.3, 0.42, -3.45, 'pirate'], [0.55, 0, -1.3, 'pirate'], [-0.55, 0, 0.18, 'pirate'], [0.55, 0, 1.6, 'pirate'], [-0.5, 0, 2.9, 'pirate'], [0.4, 0.36, 3.7, 'pirate']];
  return { root, anim, info: { length: L, beam: 2 * B, waterline: WL, hl: 4.2, hb: hullX(0.4, WL), glow, crew, oars: oars.length } };
}

// ------------------------------------------------------------------ the harpoon cutter
export function buildSeaCutter(M) {
  smallMaterials(M);
  const L = 14, B = 1.7, WL = -0.85, PLAT = 0.85, SP = 0.16, FW = 0.79, FWY = 0.6, root = new THREE.Group(); root.name = 'cutter';
  const P = new Parts(M), glow = [], waves = [], sails = [];
  const beam = (s) => B * Math.sqrt(Math.min(1, (s + 0.1) / 0.36)) * Math.pow(clamp((1 - s) / 0.52, 0, 1), 0.95);
  const sheer = (s) => 0.8 + 0.5 * (1 - s) ** 4 + 0.6 * s ** 3;
  const keel = (s) => -2.55 + 0.3 * (1 - sm(0, 0.2, s)) + 1.65 * Math.pow(sm(0.6, 1, s), 1.4);
  const prof = (k) => Math.pow(Math.max(0, 1 - Math.pow(k, 1.8)), 0.75);
  const inner = (s) => Math.max(0, beam(s) - 0.16), deckAt = (s) => s < SP ? PLAT : s > FW ? FWY : 0;
  const H = { L, beam, sheer, keel, prof, ns: 72, transom: 'scorched', inner, deckAt, wall: 'hullLow', cap: 'flaked',
    bands: [['hullLow', null, 0.5, 2], ['redPaint', 0.5, 0.26, 1], ['scorched', 0.26, WL + 0.12, 4], ['tar', WL + 0.12, WL - 0.1, 1], ['copper', WL - 0.1, null, 6]],
    decks: [['bonenail', SP - 0.004, FW + 0.004, 0], ['cypress', 0.004, SP, PLAT], ['cypress', FW, 0.985, FWY]] };
  const { zAt, sAt, hullX } = seaHull(P, H);
  const Z0 = L / 2;
  // the raised steering platform aft: bulkhead, steps, a rail with a gap; the transom's inner face; the bow platform
  P.add('hullLow', box(2 * inner(SP), PLAT, 0.12, 0, PLAT / 2, zAt(SP) + 0.06));
  P.add('hullLow', box(2 * inner(0), sheer(0) - PLAT + 0.05, 0.1, 0, (sheer(0) + PLAT) / 2, Z0 - 0.08));
  for (let i = 0; i < 3; i++) { const top = PLAT * (i + 1) / 3, z = zAt(SP) - 0.42 * (2.5 - i); P.add('step', box(1.1, top, 0.42, 0, top / 2, z)); }
  for (const sx of [-1, 1]) {
    const x0 = sx * (inner(SP) - 0.06), x1 = sx * 0.62, n = 3, z = zAt(SP) + 0.05;
    for (let i = 0; i <= n; i++) P.add('hullLow', box(0.09, 0.62, 0.09, lerp(x0, x1, i / n), PLAT + 0.31, z));
    P.add('scorched', box(Math.abs(x1 - x0) + 0.12, 0.1, 0.16, (x0 + x1) / 2, PLAT + 0.66, z));
  }
  for (let i = 0; i <= 6; i++) P.add('hullLow', box(0.08, 0.36, 0.08, lerp(-inner(0) + 0.1, inner(0) - 0.1, i / 6), sheer(0) + 0.3, Z0 - 0.12));
  P.add('scorched', box(2 * inner(0), 0.09, 0.15, 0, sheer(0) + 0.5, Z0 - 0.12));
  P.add('hullLow', box(2 * inner(FW), FWY, 0.1, 0, FWY / 2, zAt(FW) - 0.05));
  P.add('step', box(1.0, FWY / 2, 0.4, 0, FWY / 4, zAt(FW) + 0.2));
  // tiller and rudder
  P.add('hullLow', box(0.12, 2.9, 0.7, 0, -0.85, Z0 + 0.42));
  P.add('hullLow', rod([0, 0.5, Z0 + 0.16], [0, PLAT + 0.66, Z0 + 0.16], 0.08, 0.08, 6));
  for (const y of [0.3, -0.6, -1.5]) P.add('iron', box(0.16, 0.08, 0.5, 0, y, Z0 + 0.2));
  P.add('hullLow', rod([0, PLAT + 0.62, Z0 + 0.2], [0, PLAT + 0.82, zAt(0.095)], 0.055, 0.04, 6));
  P.add('iron', rod([0, PLAT + 0.62, Z0 + 0.1], [0, PLAT + 0.64, Z0 - 0.02], 0.07, 0.07, 6));
  // mast with bands and a block at the hounds; chain plates for the shrouds
  const zm = -1.4;
  P.add('cedar', rod([0, -0.1, zm], [0, 6.1, zm], 0.16, 0.1, 10), { swap: true });
  for (const y of [1.0, 2.8, 4.6]) P.add('iron', rod([0, y, zm], [0, y + 0.13, zm], 0.165 - 0.011 * y, undefined, 10));
  P.add('hullLow', box(0.42, 0.34, 0.42, 0, 0.17, zm));
  P.add('hullLow', box(0.26, 0.4, 0.26, 0, 5.85, zm));
  P.add('iron', new THREE.SphereGeometry(0.12, 8, 6).translate(0, 6.15, zm));
  const sc = sAt(zm + 0.6);
  for (const side of [1, -1]) for (const dz of [-0.3, 0.3]) {
    const s = sAt(zm + 0.6 + dz); P.add('iron', box(0.05, 0.6, 0.09, side * (hullX(s, sheer(s) - 0.3) + 0.03), sheer(s) - 0.22, zAt(s)));
  }
  // the lateen yard: two spars fished together and lashed, slung on the port side of the mast
  const F = [-0.25, 2.3, -4.2], A = [-0.25, 11.35, 4.65], mid = [0, 1, 2].map((i) => lerp(F[i], A[i], 0.48));
  const along = (t) => [0, 1, 2].map((i) => lerp(F[i], A[i], t));
  P.add('cedar', rod(F, along(0.56), 0.1, 0.12, 8), { swap: true });
  P.add('cedar', rod(along(0.4), A, 0.115, 0.05, 8), { swap: true });
  for (const t of [0.42, 0.46, 0.5, 0.54]) P.add('hemp', rod(along(t), along(t + 0.012), 0.15, 0.15, 8));
  const sail = triSail(M.blackSail, [-0.25, 2.4, -4.0], [-0.25, 11.0, 4.3], [-0.25, 2.15, 4.35], 1.0, -1);
  root.add(sail.mesh); sails.push(sail); root.add(sailBands(M, sail, [[0.08, 0.15], [0.2, 0.225]]));
  // bowsprit, bobstay and jib
  P.add('cedar', rod([0, 0.95, -6.35], [0, 2.2, -9.65], 0.11, 0.07, 8), { swap: true });
  P.add('iron', rod([0, 2.11, -9.4], [0, 2.16, -9.58], 0.09, 0.09, 6));
  P.add('iron', rod([0, 1.08, -6.9], [0, 1.13, -7.12], 0.13, 0.13, 6));
  chain(P, 'iron', sag([0, 2.1, -9.5], [0, -0.55, -6.95], 0.1), 0.14, 0.025);
  const jib = triSail(M.blackSail, [0, 2.27, -9.4], [0, 4.95, -3.7], [0, 3.1, -6.0], 0.5, -1);
  root.add(jib.mesh); sails.push(jib); root.add(sailBands(M, jib, [[0.1, 0.18]]));
  // the beak: a raked cutwater knee before the stem, iron-strapped, studded with ram spikes; spikes along the bow rails
  {
    const pts = [[0, -0.95], [0.3, -0.55], [0.65, 0.0], [0.95, 0.6], [1.22, 1.1], [1.15, 1.26], [0, 1.08]];
    const sh = new THREE.Shape(pts.map(([d, y]) => new THREE.Vector2(d, y)));
    const g = new THREE.ExtrudeGeometry(sh, { depth: 0.18, bevelEnabled: false }).rotateY(Math.PI / 2).translate(-0.09, 0, zAt(1) + 0.02);
    P.add('hullLow', g);
    for (const [d, y] of [[0.15, -0.75], [0.47, -0.28], [0.8, 0.3], [1.08, 0.85]]) P.add('iron', box(0.22, 0.08, 0.3, 0, y, zAt(1) - d + 0.05, 0));
    for (const [d, y, ax] of [[0.3, -0.55, 0], [0.65, 0.0, 0], [0.95, 0.6, 0], [1.22, 1.1, 0], [0.65, 0.0, 0.5], [0.65, 0.0, -0.5], [0.95, 0.6, 0.45], [0.95, 0.6, -0.45]]) {
      const c = new THREE.ConeGeometry(0.1, 0.85, 6).translate(0, 0.38, 0).rotateX(-Math.PI / 2 + 0.25).rotateY(ax);
      P.add('iron', c.translate(0, y, zAt(1) - d));
    }
  }
  for (let s = 0.8; s < 0.975; s += 0.032) for (const side of [1, -1]) {
    const g = new THREE.ConeGeometry(0.045, 0.34, 5).rotateZ(-side * 0.55); P.add('iron', g.translate(side * (beam(s) + 0.05), sheer(s) + 0.28, zAt(s)));
  }
  // the harpoon ballista on a turning pedestal in the bow (its own group so it can train), chained to a deck winch
  const zB = zAt(0.84), PED = 0.3;
  P.add('hullLow', box(0.9, PED, 0.9, 0, FWY + PED / 2, zB));
  for (const y of [FWY + 0.08, FWY + PED - 0.05]) P.add('iron', box(0.94, 0.06, 0.94, 0, y, zB));
  P.add('iron', new THREE.TorusGeometry(0.1, 0.03, 4, 8).translate(0, FWY + 0.15, zB + 0.47));
  const bal = new THREE.Group(); bal.position.set(0, FWY + PED, zB); bal.scale.setScalar(1.5);
  {
    const R = new Parts(M), tilt = new THREE.Group(); tilt.position.set(0, 0.42, 0); tilt.rotation.x = 0.02;
    R.add('iron', new THREE.CylinderGeometry(0.46, 0.46, 0.1, 14).translate(0, 0.05, 0));
    for (const dx of [-0.2, 0.2]) R.add('hullLow', box(0.08, 0.42, 0.6, dx, 0.3, 0));
    R.add('iron', rod([-0.26, 0.42, 0], [0.26, 0.42, 0], 0.05, 0.05, 6));
    chain(R, 'iron', sag([0, 0.66, 0.6], [0, 0.05, 0.36], 0.12, 5), 0.12, 0.022);
    bal.add(R.build('ballista-base'));
    const S = new Parts(M);
    S.add('hullLow', box(0.3, 0.2, 2.05, 0, 0.1, -0.15));
    for (const z of [0.6, -0.2, -0.9]) S.add('iron', box(0.33, 0.23, 0.06, 0, 0.1, z));
    for (const dx of [-0.075, 0.075]) S.add('iron', box(0.03, 0.03, 2.0, dx, 0.215, -0.15));
    S.add('iron', box(0.38, 0.28, 0.26, 0, 0.12, -1.08));
    for (const side of [-1, 1]) {
      const pts = [[0, 0.13, -1.05], [side * 0.5, 0.13, -0.98], [side * 0.95, 0.13, -0.72], [side * 1.12, 0.13, -0.8]];
      for (let i = 0; i < 3; i++) S.add('iron', rod(pts[i], pts[i + 1], 0.065 - i * 0.012, 0.055 - i * 0.012, 6));
      S.add('flaked', box(0.45, 0.72, 0.06, side * 0.36, 0.28, -0.72));
      for (const [dx, dy] of [[0.25, 0.5], [0.45, 0.2], [0.25, 0.05]]) S.add('iron', new THREE.ConeGeometry(0.035, 0.18, 4).rotateX(-Math.PI / 2).translate(side * dx, dy, -0.8));
    }
    S.add('iron', box(0.22, 0.12, 0.16, 0, 0.27, 0.45));
    S.add('hullLow', rod([-0.3, 0.06, 0.84], [0.3, 0.06, 0.84], 0.07, 0.07, 8));
    for (const side of [-1, 1]) { S.add('iron', new THREE.TorusGeometry(0.12, 0.025, 4, 10).rotateY(Math.PI / 2).translate(side * 0.24, 0.06, 0.84)); S.add('iron', rod([side * 0.32, 0.06, 0.84], [side * 0.32, -0.2, 0.92], 0.025, 0.025, 4)); S.add('iron', rod([side * 0.32, -0.2, 0.92], [side * 0.44, -0.2, 0.92], 0.025, 0.025, 4)); }
    // the harpoon: a long iron shaft, vanes, a barbed head, a ring for the chain
    S.add('flaked', rod([0, 0.27, 0.55], [0, 0.27, -2.2], 0.042, 0.042, 6));
    S.add('iron', rod([0, 0.27, -2.12], [0, 0.27, -2.24], 0.07, 0.07, 6));
    S.add('paleSteel', new THREE.ConeGeometry(0.12, 0.5, 6).rotateX(-Math.PI / 2).translate(0, 0.27, -2.47));
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4, g = new THREE.ConeGeometry(0.035, 0.32, 4).rotateX(Math.PI / 2 - 0.5); g.rotateZ(a); S.add('paleSteel', g.translate(Math.cos(a + Math.PI / 2) * 0.08, 0.27 + Math.sin(a + Math.PI / 2) * 0.08, -2.3)); }
    for (let i = 0; i < 3; i++) { const g = box(0.015, 0.14, 0.32, 0, 0.07, 0); g.rotateZ(i * TAU / 3); S.add('hullLow', g.translate(0, 0.27, 0.32)); }
    S.add('iron', new THREE.TorusGeometry(0.07, 0.02, 4, 8).rotateY(Math.PI / 2).translate(0, 0.27, 0.62));
    tilt.add(S.build('ballista'));
    tilt.add(lines([[1.12, 0.13, -0.8], [0, 0.29, 0.42], [-1.12, 0.13, -0.8], [0, 0.29, 0.42]], M.rope, 'bowstring'));
    bal.add(tilt);
  }
  root.add(bal);
  {
    const wz = zAt(0.7), wx = 0.5;
    for (const dx of [-0.27, 0.27]) P.add('hullLow', box(0.08, 0.6, 0.5, wx + dx, 0.3, wz));
    P.add('iron', new THREE.CylinderGeometry(0.18, 0.18, 0.46, 12).rotateZ(Math.PI / 2).translate(wx, 0.45, wz));
    for (let i = 0; i < 5; i++) P.add('iron', new THREE.TorusGeometry(0.2, 0.03, 4, 10).rotateY(Math.PI / 2).translate(wx - 0.18 + i * 0.09, 0.45, wz));
    P.add('iron', rod([wx + 0.31, 0.45, wz], [wx + 0.31, 0.75, wz + 0.15], 0.025, 0.025, 4));
    P.add('hullLow', rod([wx + 0.31, 0.75, wz + 0.15], [wx + 0.44, 0.75, wz + 0.15], 0.03, 0.03, 4));
    chain(P, 'iron', [[wx, 0.64, wz - 0.05], [0.36, 0.05, wz - 0.45], [0.16, 0.05, zAt(FW) + 0.05], [0.08, FWY + 0.05, zAt(FW) - 0.2], [0.02, FWY + 0.15, zB + 0.47]], 0.14, 0.025);
  }
  // spare harpoons racked on the port bulwark, pitch barrels and a coil to starboard
  for (const [i, y] of [0.42, 0.6, 0.78].entries()) {
    const s0 = 0.43, s1 = 0.6, x = (s) => -(inner(s) - 0.08 - i * 0.02);
    P.add('flaked', rod([x(s0), y, zAt(s0)], [x(s1), y, zAt(s1)], 0.03, 0.03, 5));
    P.add('iron', new THREE.ConeGeometry(0.07, 0.3, 5).rotateX(-Math.PI / 2).translate(x(s1), y, zAt(s1) - 0.15));
  }
  for (const s of [0.45, 0.58]) P.add('iron', box(0.12, 0.5, 0.06, -(inner(s) - 0.05), 0.6, zAt(s)));
  for (const [x, z] of [[0.82, 2.3], [0.78, 1.55]]) {
    P.add('cedar', new THREE.CylinderGeometry(0.3, 0.3, 0.8, 10).translate(x, 0.4, z), { swap: true });
    for (const y of [0.12, 0.68]) P.add('iron', new THREE.CylinderGeometry(0.315, 0.315, 0.06, 10).translate(x, y, z));
    P.add('dark', new THREE.CircleGeometry(0.26, 10).rotateX(-Math.PI / 2).translate(x, 0.805, z));
  }
  coil(P, 0.45, 0, zm + 0.75, 0.25);
  // the port outrigger: two curved akas lashed to a long float that rides half under
  {
    const xf = -4.4, zf = 0.4, LF = 7, rf = 0.36, yf = WL + 0.06, prof2 = [];
    for (let i = 0; i <= 14; i++) { const t = i / 14; prof2.push(new THREE.Vector2(rf * Math.pow(Math.sin(Math.PI * t), 0.55) + 0.002, (t - 0.5) * LF)); }
    P.add('scorched', new THREE.LatheGeometry(prof2, 12).rotateX(Math.PI / 2).translate(xf, yf, zf));
    for (const dz of [-2.4, -0.8, 0.8, 2.4]) { const r = rf * Math.pow(Math.sin(Math.PI * (0.5 + dz / LF)), 0.55); P.add('iron', new THREE.TorusGeometry(r + 0.01, 0.03, 4, 12).translate(xf, yf, zf + dz)); }
    P.add('redPaint', rod([xf, yf + rf - 0.03, zf - 2.9], [xf, yf + rf - 0.03, zf + 2.9], 0.06, 0.06, 6));
    for (const s of [0.34, 0.6]) {
      const z = zAt(s), x0 = -(beam(s) - 0.05), y0 = sheer(s) + 0.1, top = [xf, yf + rf + 0.55, z];
      P.add('hullLow', rod([x0, y0, z], [lerp(x0, xf, 0.5), y0 + 0.25, z], 0.09, 0.085, 6));
      P.add('hullLow', rod([lerp(x0, xf, 0.5), y0 + 0.25, z], top, 0.085, 0.08, 6));
      for (const dz of [-0.35, 0.35]) P.add('hullLow', rod(top, [xf, yf + rf - 0.05, z + dz], 0.05, 0.05, 5));
      for (const xx of [x0 - 0.05, xf]) P.add('hemp', new THREE.TorusGeometry(0.12, 0.035, 4, 8).rotateY(Math.PI / 2).translate(xx, xx === xf ? top[1] : y0, z));
    }
  }
  // lanterns: red-lit astern (port rail post), one at the port bow; the black flag and a crimson masthead pennant
  glow.push({ ...lamp(P, -(inner(SP) - 0.06), PLAT + 0.72, zAt(SP) + 0.05, 1.1, 0xff3020, 'redGlass'), r: 1.8 });
  P.add('iron', rod([inner(0) - 0.15, sheer(0) + 0.5, Z0 - 0.12], [inner(0) - 0.15, sheer(0) + 0.9, Z0 - 0.12], 0.03, 0.03, 4));
  glow.push({ ...lamp(P, inner(0) - 0.15, sheer(0) + 0.9, Z0 - 0.12, 1, 0xff3020, 'redGlass'), r: 1.5 });
  P.add('iron', rod([-(beam(0.9) - 0.05), sheer(0.9), zAt(0.9)], [-(beam(0.9) - 0.05), sheer(0.9) + 0.5, zAt(0.9)], 0.03, 0.03, 4));
  glow.push(lamp(P, -(beam(0.9) - 0.05), sheer(0.9) + 0.5, zAt(0.9), 1, 0xffa040));
  P.add('hullLow', rod([-0.6, sheer(0.01) + 0.4, Z0 - 0.1], [-0.6, 4.3, Z0 - 0.02], 0.045, 0.035, 5));
  P.add('goldHammer', new THREE.SphereGeometry(0.06, 6, 4).translate(-0.6, 4.33, Z0 - 0.02));
  const fl = flag(M.jollyRoger, 2.1, 1.3, [-0.6, 4.25, Z0 - 0.02], 0.18, 'flag'); waves.push(fl); root.add(fl.mesh);
  const pm = M.bloodSail.clone(); pm.side = THREE.DoubleSide; pm.emissive = new THREE.Color(0x5a0c0a); pm.emissiveIntensity = 0.5;
  const pen = flag(pm, 2.6, 0.32, [0, 6.12, zm], 0.16, 'pennant'); waves.push(pen); root.add(pen.mesh);
  // rigging: shrouds, forestay to the bowsprit, backstays, halyards, the sheets
  const rig = [[0, 6.0, zm], [0, 2.2, -9.6], [0, 6.0, zm], [-0.25, 5.2, zm], [0, 5.9, zm], [0.1, 0.5, zm + 0.25],
    [-0.25, 2.15, 4.35], [-0.8, PLAT + 0.62, zAt(SP) + 0.05], [-0.25, 2.4, -4.0], [0, FWY + 0.1, -3.9],
    [0, 3.1, -6.0], [-(beam(0.72) - 0.1), sheer(0.72) + 0.1, zAt(0.72)], [0, 4.95, -3.7], [0, 5.6, zm]];
  for (const side of [1, -1]) {
    for (const dz of [-0.3, 0.3]) { const s = sAt(zm + 0.6 + dz); rig.push([0, 5.3, zm], [side * (hullX(s, sheer(s)) + 0.03), sheer(s) + 0.08, zAt(s)]); }
    rig.push([0, 5.8, zm], [side * (inner(0.06) - 0.05), sheer(0.06) + 0.12, zAt(0.06)]);
  }
  root.add(lines(rig, M.rope));

  root.add(P.build('cutter'));
  finish(root);
  function anim(t) {
    for (const s of sails) s.update(t);
    for (const w of waves) w.update(t);
    bal.rotation.y = 0.28 * Math.sin(t * 0.35);
  }
  const crew = [[0.35, PLAT, 5.7, 'pirate'], [0.5, 0, -2.9, 'pirate'], [-0.5, 0, -3.0, 'pirate'], [0.45, 0, 0.9, 'pirate'], [-0.45, 0, 2.6, 'pirate']];
  return { root, anim, info: { length: L, beam: 2 * B, waterline: WL, hl: 6.6, hb: hullX(0.4, WL), glow, crew } };
}
