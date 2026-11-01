// A Lampwarden tender (docs/PIRATE_SEAS.md): the small workboat that services the lights and lays the bell buoys.
// White oak over Lampwarden blue, bright steel, green-flame lamps; one mast with a blue gaff sail and a cream
// staysail, a keeper's deckhouse aft with a tiller, a buoy davit on the port bow, casks of lamp oil and coils of line,
// and a clear, flat deck between low bulwarks amidships, so three of them lashed side by side make one fighting floor
// a hero can leap across (scenario 11). Same frame as the fleet: bow -Z, starboard +X, deck y = 0.
import * as THREE from 'three';
import { Parts, box, rod, surf, flag, smoke, TAU, lerp, clamp, triSail, lines, shrouds, mast, anchor } from './seaship3d.js';
import { lampMaterials, ensignMat, sailTex, texSail, bellGeo, greenLantern, loft, canvasTex, drawBell } from './seaship3d_dawnwake.js';

const sm = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const L = 16, ZS = 8, HB = 2.5, WL = -1.2, WALL = 0.2, LEAP_Z = 0.5;
const zAt = (s) => ZS - s * L, sAt = (z) => (ZS - z) / L;
const beam = (s) => s < 0.25 ? HB * Math.sqrt(Math.max(0, 1 - ((0.25 - s) / 0.29) ** 2)) : s > 0.6 ? HB * Math.sqrt(Math.max(0, 1 - ((s - 0.6) / 0.4) ** 2)) : HB;
const sheer = (s) => 0.5 + 0.8 * Math.pow(sm(0.65, 1, s), 1.5) + 0.4 * Math.pow(1 - sm(0, 0.3, s), 2);
const keel = (s) => -2.6 + 0.6 * Math.pow(1 - sm(0, 0.3, s), 1.5) + 1.4 * Math.pow(sm(0.7, 1, s), 1.4);
const inner = (s) => Math.max(0, beam(s) - WALL);
function hx(s, y) {
  const top = sheer(s), bot = keel(s), b = beam(s);
  const y0 = bot + Math.max(WL + 0.2 - bot, 0.5 * (top - bot));
  if (y >= y0) return b;
  const d = clamp((y0 - y) / (y0 - bot), 0, 1);
  const run = lerp(1, 0.2 + 0.8 * sm(0, 0.3, s), Math.pow(d, 0.75)), entry = lerp(1, 1 - 0.45 * sm(0.62, 1, s), d);
  return b * run * entry * (0.07 + 0.93 * Math.pow(Math.max(0, 1 - Math.pow(d, 2.4)), 0.5));
}
export const TENDER = { L, zAt, sAt, beam, inner, sheer, keel, waterline: WL };

export function buildTender(M) {
  const MM = lampMaterials(M);
  const root = new THREE.Group(); root.name = 'tender';
  const P = new Parts(MM), glow = [], fx = [], sails = [], flags = [], rig = [], ratl = [];
  const NS = 70;

  // ---------------------------------------------------------------- hull, low bulwarks, the deck
  loft(P, { L, zs: ZS, ns: NS, sheer, keel, x: hx, transom: true, bands: [
    ['whitewood', null, 0.06, 2], ['gilt', 0.06, -0.06, 1], ['hullPaintBlue', -0.06, -0.86, 3], ['tar', -0.86, -1.42, 2], ['copper', -1.42, null, 6]] });
  { const pts = []; for (let i = 0; i <= 16; i++) { const s = i / 16; pts.push([0, keel(s) - 0.08, zAt(s)]); }
    for (let i = 0; i < 16; i++) P.add('copper', rod(pts[i], pts[i + 1], 0.1, 0.1, 6));
    P.add('whitewood', rod([0, keel(1), zAt(1)], [0, sheer(1) + 0.15, zAt(1) - 0.04], 0.12, 0.1, 6)); }
  P.add('copper', box(0.16, -1.42 - keel(0) + 0.1, 0.8, 0, (keel(0) - 0.1 - 1.42) / 2, ZS + 0.4));
  P.add('tar', box(0.16, 0.5, 0.75, 0, -1.17, ZS + 0.38));
  P.add('whitewood', box(0.15, 1.2, 0.55, 0, -0.35, ZS + 0.28));
  P.add('cedar', rod([0, 0.35, ZS + 0.3], [0, 0.75, ZS - 1.6], 0.06, 0.045, 6));                 // the tiller
  P.add('gilt', new THREE.SphereGeometry(0.08, 6, 4).translate(0, 0.75, ZS - 1.62));
  for (const side of [1, -1]) {
    P.add('whitewood', surf(NS, 1, (u, v) => [side * inner(u), v ? -0.05 : sheer(u), zAt(u)], (u, v) => [zAt(u) / 2, v * 0.6], side < 0), { uv: 'keep' });
    P.add('gilt', surf(NS, 1, (u, v) => [side * (v ? inner(u) - 0.05 : beam(u) + 0.06), sheer(u) + 0.1, zAt(u)], (u, v) => [zAt(u) / 2, v * 0.2], side < 0), { uv: 'keep' });
    P.add('gilt', surf(NS, 1, (u, v) => [side * (beam(u) + 0.06), sheer(u) + 0.1 - v * 0.12, zAt(u)], (u, v) => [zAt(u) / 2, v * 0.1], side > 0), { uv: 'keep' });
    P.add('whitewood', surf(NS, 1, (u, v) => [side * (inner(u) - 0.05), sheer(u) + 0.1 - v * 0.12, zAt(u)], (u, v) => [zAt(u) / 2, v * 0.1], side < 0), { uv: 'keep' });
  }
  P.add('whitewood', box(inner(0.004) * 2, sheer(0), WALL, 0, sheer(0) / 2, ZS - WALL / 2));
  P.add('deck', surf(NS, 1, (u, v) => [(v * 2 - 1) * inner(u), 0, zAt(u)], (u, v) => [zAt(u) / 2, (v * 2 - 1) * inner(u) / 2], true), { uv: 'keep' });
  for (let z = 6.6; z > -6.6; z -= 1.1) for (const side of [-1, 1]) { const s = sAt(z); P.add('whitewood', box(0.1, sheer(s) - 0.05, 0.12, side * (inner(s) - 0.05), (sheer(s) - 0.05) / 2, z)); }
  // rope fenders down both sides (the tenders lie lashed together), cleats on the rail for the lashings
  for (const side of [-1, 1]) for (const z of [-3.2, -0.55, 1.55, 3.2]) {
    const x = side * (beam(sAt(z)) + 0.22);
    P.add('cedar', new THREE.CylinderGeometry(0.2, 0.2, 0.65, 8).translate(x, -0.25, z), { swap: true });
    for (const y of [-0.5, 0.0]) P.add('blackwood', new THREE.CylinderGeometry(0.21, 0.21, 0.05, 8).translate(x, y, z));
    rig.push([x, 0.08, z], [side * (inner(sAt(z)) - 0.05), sheer(sAt(z)) + 0.1, z]);
    P.add('paleSteel', box(0.12, 0.08, 0.42, side * (inner(sAt(z + 0.6)) - 0.1), sheer(sAt(z + 0.6)) + 0.14, z + 0.6));
  }
  // the Ninth Bell painted on both bows
  const bellTex = canvasTex(32, 32, (x) => { x.fillStyle = '#f2ead6'; x.beginPath(); x.arc(16, 16, 15, 0, TAU); x.fill(); x.fillStyle = '#3d6fb0'; x.beginPath(); x.arc(16, 16, 13, 0, TAU); x.fill(); drawBell(x, 16, 4, 1.1); });
  const bellMat = new THREE.MeshStandardMaterial({ map: bellTex, transparent: true, alphaTest: 0.4, roughness: 0.7 });
  for (const side of [-1, 1]) { const z = -5.0, s = sAt(z), y = -0.4, m = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), bellMat);
    const dz = 0.2, x0 = hx(sAt(z - dz), y), x1 = hx(sAt(z + dz), y); m.rotation.y = side * (Math.PI / 2 - Math.atan2(x0 - x1, 2 * dz)) ; m.position.set(side * (hx(s, y) + 0.05), y, z); root.add(m); }

  // ---------------------------------------------------------------- the mast, the gaff sail over the deck, a staysail forward
  const MZ = -2.4, tex = {}, T = (k) => tex[k] ||= sailTex(M, k);
  const head = mast(P, 0, 0, MZ, 8.0, 0.2, { mat: 'whitewood', band: 'paleSteel', tops: [], cap: 'gilt' });
  P.add('paleSteel', new THREE.CylinderGeometry(0.32, 0.36, 0.25, 10).translate(0, 0.12, MZ));
  P.add('whitewood', rod([0, 2.35, MZ + 0.2], [0, 2.5, 5.6], 0.08, 0.06, 6));
  P.add('whitewood', rod([0, 6.3, MZ + 0.2], [0, 7.6, 2.8], 0.07, 0.05, 6));
  { const sp = texSail((m) => triSail(m, [0, 6.2, MZ + 0.35], [0, 7.45, 2.7], [0, 2.6, 5.4], 0.45, 1, [0, 2.5, MZ + 0.35]), T('blueStar')); root.add(sp.mesh); sails.push(sp); }
  { const a = [0, sheer(1) + 0.15, zAt(1) + 0.05], b = [0, 7.2, MZ];
    const js = texSail((m) => triSail(m, a.map((v, i) => lerp(v, b[i], 0.06)), a.map((v, i) => lerp(v, b[i], 0.82)), [0, 1.9, MZ - 1.1], 0.35, 1), T('cream'));
    root.add(js.mesh); sails.push(js); rig.push(a, head); }
  rig.push([0, 7.6, 2.8], [0, 8.0, MZ], [0, 2.5, 5.6], [0, sheer(0.02) + 0.1, 7.6], [0, 2.5, 5.6], [0.9, sheer(0.06) + 0.1, 7.0]);
  for (const side of [-1, 1]) {
    const s = sAt(MZ + 0.6), cx = side * (beam(s) + 0.12), cy = sheer(s);
    const sh = shrouds([side * 0.18, 6.0, MZ], [cx, cy, MZ - 0.2], [cx, cy, MZ + 1.2], 2, 0.45);
    for (let i = 0; i < 4; i += 2) rig.push(sh[i], sh[i + 1]); for (let i = 4; i < sh.length; i++) ratl.push(sh[i]);
    P.add('paleSteel', box(0.08, 0.5, 1.5, cx, cy - 0.2, MZ + 0.5));
  }
  glow.push(greenLantern(P, 0, head[1] + 0.12, MZ, 0.6));
  const pen = flag(MM.flagBlue, 1.8, 0.35, [0, head[1] + 0.6, MZ], 0.08, 'pennant'); flags.push(pen); root.add(pen.mesh);
  P.add('paleSteel', rod([0, head[1], MZ], [0, head[1] + 0.65, MZ], 0.03, 0.03, 4));

  // ---------------------------------------------------------------- the keeper's deckhouse aft
  { const z0 = 3.7, z1 = 6.2, w = 1.25, h = 1.7, zc = (z0 + z1) / 2;
    P.add('whitewood', box(w * 2, h, z1 - z0, 0, h / 2, zc));
    P.add('gilt', box(w * 2 + 0.1, 0.08, z1 - z0 + 0.1, 0, h - 0.02, zc));
    for (const sx of [-1, 1]) P.add('blueSteel', new THREE.BoxGeometry(w + 0.18, 0.08, z1 - z0 + 0.3).translate(sx * (w + 0.18) / 2, 0, 0).rotateZ(-sx * 0.15).translate(0, h + 0.08, zc));
    P.add('gilt', box(0.12, 0.1, z1 - z0 + 0.34, 0, h + 0.11, zc));
    for (const side of [-1, 1]) for (const z of [z0 + 0.6, z1 - 0.6]) { const at = (g) => g.rotateY(side * Math.PI / 2).translate(side * (w + 0.02), 1.05, z);
      P.add('holy', at(new THREE.CircleGeometry(0.18, 10))); P.add('gilt', at(new THREE.TorusGeometry(0.2, 0.04, 4, 12))); }
    P.add('dark', box(0.8, 1.45, 0.05, 0.45, 0.73, z0 - 0.02)); P.add('hullPaintBlue', box(0.7, 1.36, 0.05, 0.45, 0.7, z0 - 0.04));
    P.add('gilt', box(0.9, 0.08, 0.08, 0.45, 1.5, z0 - 0.05));
    P.add('holy', box(0.5, 0.42, 0.04, -0.6, 1.1, z0 - 0.02)); P.add('paleSteel', box(0.6, 0.06, 0.06, -0.6, 1.34, z0 - 0.04));
    P.add('paleSteel', rod([-0.75, h, z1 - 0.4], [-0.75, h + 1.0, z1 - 0.32], 0.09, 0.09, 8)); P.add('iron', new THREE.CylinderGeometry(0.15, 0.11, 0.14, 8).translate(-0.75, h + 1.07, z1 - 0.32));
    const st = smoke([-0.75, h + 1.2, z1 - 0.32], 4, ['#c8ccd2', '#9aa0a8'], 1.3, 0.45); fx.push(st); root.add(st.grp);
    glow.push(greenLantern(P, w - 0.15, h + 0.06, z0 + 0.2, 0.6));
    P.add('bellBronze', bellGeo(0.16, 0.3).translate(-w + 0.25, h + 0.6, z0 + 0.2));   // the ship's bell on a little gallows
    P.add('paleSteel', rod([-w + 0.25, h + 0.05, z0 + 0.2], [-w + 0.25, h + 0.65, z0 + 0.2], 0.03, 0.03, 4)); }

  // ---------------------------------------------------------------- the buoy davit on the port bow, casks of lamp oil, coils
  { const x0 = -(inner(sAt(-5.0)) - 0.35), z0 = -5.0, ax = -(beam(sAt(-5.6)) + 0.9), ay = 3.0, az = -5.6;
    P.add('paleSteel', new THREE.CylinderGeometry(0.16, 0.22, 0.24, 8).translate(x0, 0.12, z0));
    P.add('paleSteel', rod([x0, 0, z0], [x0, 2.5, z0], 0.1, 0.085, 8));
    P.add('paleSteel', rod([x0, 2.35, z0], [ax, ay, az], 0.08, 0.06, 6)); P.add('paleSteel', rod([x0, 0.9, z0], [ax + 0.6, ay - 0.3, az + 0.08], 0.05, 0.05, 5));
    P.add('gilt', new THREE.CylinderGeometry(0.14, 0.14, 0.24, 8).rotateX(Math.PI / 2).translate(x0, 1.0, z0));
    P.add('iron', box(0.16, 0.24, 0.12, ax, ay - 1.1, az)); P.add('iron', new THREE.TorusGeometry(0.15, 0.04, 4, 10, Math.PI * 1.4).rotateZ(Math.PI * 0.8).translate(ax, ay - 1.4, az));
    rig.push([ax, ay, az], [ax, ay - 1.0, az], [x0, 1.0, z0], [ax, ay, az]);
    glow.push(greenLantern(P, ax, ay + 0.04, az, 0.45)); }
  const cask = (x, z, upright = true) => {
    if (upright) { P.add('cedar', new THREE.CylinderGeometry(0.26, 0.26, 0.66, 10).translate(x, 0.33, z), { swap: true });
      for (const y of [0.1, 0.56]) P.add('paleSteel', new THREE.CylinderGeometry(0.275, 0.275, 0.05, 10).translate(x, y, z));
      P.add('greenFlame', new THREE.CircleGeometry(0.06, 6).rotateX(-Math.PI / 2).translate(x + 0.12, 0.665, z)); }
    else { P.add('cedar', new THREE.CylinderGeometry(0.26, 0.26, 0.66, 10).rotateX(Math.PI / 2).translate(x, 0.27, z), { swap: true });
      for (const dz of [-0.23, 0.23]) P.add('paleSteel', new THREE.CylinderGeometry(0.275, 0.275, 0.05, 10).rotateX(Math.PI / 2).translate(x, 0.27, z + dz)); }
  };
  P.add('whitewood', box(0.7, 0.12, 1.9, -1.8, 0.06, 2.45));                                   // the cask rack against the port bulwark
  for (const z of [1.85, 2.5, 3.15]) cask(-1.8, z, false);
  cask(-1.05, 3.3); cask(-0.5, 3.35);
  // the leap way: a blue-painted walk straight across the deck to a gate in each rail (a blue rail cap between two
  // gilt lamp posts, a step inside, fat fenders outside), so three tenders lashed abeam read as one route
  { const z0 = LEAP_Z - 0.8, z1 = LEAP_Z + 0.8, hw = inner(sAt(LEAP_Z));
    P.add('hullPaintBlue', box(hw * 2 - 0.3, 0.02, z1 - z0 - 0.2, 0, 0.012, LEAP_Z));
    for (const dz of [-1, 1]) P.add('gilt', box(hw * 2 - 0.3, 0.025, 0.07, 0, 0.014, LEAP_Z + dz * (z1 - z0 - 0.2) / 2));
    for (let i = -2; i <= 2; i++) for (const sd of [-1, 1]) P.add('whitewood', new THREE.BoxGeometry(0.42, 0.026, 0.09).rotateY(sd * 0.6).translate(i * 0.8 + 0.12, 0.016, LEAP_Z + sd * 0.14));
    for (const side of [-1, 1]) {
      const s = sAt(LEAP_Z), xr = side * (inner(s) + WALL / 2), y = sheer(s) + 0.1;
      P.add('hullPaintBlue', box(WALL + 0.2, 0.06, z1 - z0, xr, y + 0.03, LEAP_Z));
      P.add('whitewood', box(0.5, 0.24, z1 - z0 - 0.2, side * (inner(s) - 0.3), 0.12, LEAP_Z));
      P.add('gilt', box(0.52, 0.04, z1 - z0 - 0.18, side * (inner(s) - 0.3), 0.25, LEAP_Z));
      for (const z of [z0, z1]) { P.add('gilt', rod([xr, y, z], [xr, y + 0.62, z], 0.05, 0.045, 6)); glow.push(greenLantern(P, xr, y + 0.62, z, 0.55)); }
      for (const dz of [-0.35, 0.35]) { const x = side * (beam(s) + 0.28);
        P.add('cedar', new THREE.CylinderGeometry(0.27, 0.27, 0.8, 8).translate(x, -0.3, LEAP_Z + dz), { swap: true });
        for (const yy of [-0.65, 0.05]) P.add('hullPaintBlue', new THREE.CylinderGeometry(0.28, 0.28, 0.07, 8).translate(x, yy, LEAP_Z + dz));
        rig.push([x, 0.1, LEAP_Z + dz], [side * (inner(s) - 0.05), y, LEAP_Z + dz]); }
    } }
  for (const [x, z, n] of [[1.75, 2.9, 4], [0.55, -3.3, 3], [-1.2, -4.4, 4]]) for (let i = 0; i < n; i++) P.add('cedar', new THREE.TorusGeometry(0.34 - i * 0.065, 0.045, 4, 14).rotateX(Math.PI / 2).translate(x, 0.04 + i * 0.05, z));
  for (const side of [-1, 1]) { const z = -6.3, s = sAt(z);
    P.add('whitewood', box(0.7, 0.18, 0.2, side * (beam(s) + 0.1), sheer(s) + 0.06, z));
    if (side > 0) anchor(P, side * (beam(s) + 0.4), sheer(s) - 0.1, z + 0.1, 0.55, 0.3, 'paleSteel'); }
  for (const s of [0.18, 0.72]) for (const side of [-1, 1]) {
    const x = side * (inner(s) + WALL / 2), y = sheer(s) + 0.1;
    P.add('paleSteel', rod([x, y, zAt(s)], [x, y + 0.5, zAt(s)], 0.04, 0.04, 4));
    glow.push(greenLantern(P, x, y + 0.5, zAt(s), 0.6));
  }
  P.add('paleSteel', rod([0, sheer(0.01) + 0.1, ZS - 0.3], [0, sheer(0.01) + 2.4, ZS + 0.05], 0.04, 0.035, 5));
  const ens = flag(ensignMat(MM), 1.4, 0.9, [0, sheer(0.01) + 2.4, ZS + 0.05], 0.16, 'ensign'); flags.push(ens); root.add(ens.mesh);

  // ---------------------------------------------------------------- build
  root.add(P.build('tender'));
  root.add(lines(rig, M.rope, 'rigging'), lines(ratl, M.ropeLight, 'ratlines'));
  root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  function anim(t) {
    for (const s of sails) s.update(t);
    for (const f of flags) f.update(t);
    for (const f of fx) f.update(t);
  }
  const info = {
    length: L, beam: 2 * HB, waterline: WL, hl: 7.7, hb: 2.45, glow,
    crew: [[1.2, 0, -1.0, 'hero'], [-0.9, 0, 0.8, 'hero'], [1.4, 0, 1.8, 'hero'], [0.2, 0, -5.0, 'hero'], [0.8, 0, 6.9, 'hero']],
    // a clear deck from the mast to the deckhouse; the rail is only 0.5 high there, for leaping across to a lashed neighbour
    deck: { y: 0, z0: -1.8, z1: 3.5, halfWidth: inner(0.45), rail: sheer(0.45) },
    leap: [[-beam(sAt(LEAP_Z)), sheer(sAt(LEAP_Z)), LEAP_Z], [beam(sAt(LEAP_Z)), sheer(sAt(LEAP_Z)), LEAP_Z]],
    lash: [-3.2, 0, 3.2].flatMap((z) => [[-beam(sAt(z)), sheer(sAt(z)), z], [beam(sAt(z)), sheer(sAt(z)), z]]),
    blocks: { circles: [[0, MZ, 0.3]], boxes: [[-1.25, 3.7, 1.25, 6.2], [-2.15, 1.5, -1.45, 3.4], [-1.35, 3.0, -0.2, 3.65], [-1.9, -5.3, -1.1, -4.7]] },
    walk: TENDER,
  };
  return { root, anim, info };
}
