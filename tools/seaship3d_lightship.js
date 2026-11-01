// The Lampwarden lightship (docs/PIRATE_SEAS.md): a floating lighthouse of the Lampwardens of the Ninth Bell, the
// GULLWRACK light. A stout white-and-blue hull carrying a stone-and-steel lantern tower amidships whose great lens burns
// green and turns, throwing one long beam right round every six seconds (fog boarders can only be struck inside it).
// Bells hang round the gallery; two short masts carry blue steadying sails; a bell buoy hangs ready on the port bow
// crane. Its deck is walkable: a plank spot on the starboard rail (info.plank), a clear way to the iron ladder up the
// tower, and the lantern gallery at its head (info.gallery). Same frame as the fleet: bow -Z, starboard +X, deck y = 0.
import * as THREE from 'three';
import { Parts, box, rod, surf, flag, smoke, TAU, lerp, clamp, squareSail, triSail, lines, shrouds, mast, yard, dinghy, davits, anchor } from './seaship3d.js';
import { lampMaterials, ensignMat, sailTex, texSail, bellGeo, greenLantern, greenFire, loft, archShape, archFrame, canvasTex, remap } from './seaship3d_dawnwake.js';

const sm = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const L = 26, ZS = 13, LB = 4.2, WL = -1.5, WALL = 0.3;
const zAt = (s) => ZS - s * L, sAt = (z) => (ZS - z) / L;
const beam = (s) => s < 0.28 ? LB * Math.sqrt(Math.max(0, 1 - ((0.28 - s) / 0.3) ** 2)) : s > 0.62 ? LB * Math.sqrt(Math.max(0, 1 - ((s - 0.62) / 0.38) ** 2.2)) : LB;
const sheer = (s) => 1.0 + 1.1 * Math.pow(sm(0.7, 1, s), 1.6) + 0.55 * Math.pow(1 - sm(0, 0.3, s), 2);
const keel = (s) => -3.6 + 0.9 * Math.pow(1 - sm(0, 0.3, s), 1.5) + 1.7 * Math.pow(sm(0.72, 1, s), 1.4);
const inner = (s) => Math.max(0, beam(s) - WALL);
function hx(s, y) {
  const top = sheer(s), bot = keel(s), b = beam(s);
  const y0 = bot + Math.max(WL + 0.25 - bot, 0.5 * (top - bot));
  if (y >= y0) return b * (1 + 0.025 * clamp((y - y0) / Math.max(0.1, top - y0), 0, 1));   // a little flare
  const d = clamp((y0 - y) / (y0 - bot), 0, 1);
  const run = lerp(1, 0.25 + 0.75 * sm(0, 0.3, s), Math.pow(d, 0.8)), entry = lerp(1, 1 - 0.4 * sm(0.65, 1, s), d);
  return b * run * entry * (0.08 + 0.92 * Math.pow(Math.max(0, 1 - Math.pow(d, 2.6)), 0.5));
}
export const LIGHTSHIP = { L, zAt, sAt, beam, inner, sheer, keel, waterline: WL };

export function buildLightship(M) {
  const MM = lampMaterials(M);
  const root = new THREE.Group(); root.name = 'lightship';
  const P = new Parts(MM), glow = [], fx = [], sails = [], flags = [], fires = [], bells = [], rig = [], ratl = [];
  const NS = 100;

  // ---------------------------------------------------------------- hull: white oak over Lampwarden blue, copper below
  loft(P, { L, zs: ZS, ns: NS, sheer, keel, x: hx, transom: true, bands: [
    ['whitewood', null, 0.32, 3], ['gilt', 0.32, 0.2, 1], ['hullPaintBlue', 0.2, -1.12, 3], ['whitewood', -1.12, -1.24, 1],
    ['tar', -1.24, -1.75, 2], ['copper', -1.75, null, 7]] });
  { const pts = []; for (let i = 0; i <= 26; i++) { const s = i / 26; pts.push([0, keel(s) - 0.1, zAt(s)]); }
    for (let i = 0; i < 26; i++) P.add('copper', rod(pts[i], pts[i + 1], 0.13, 0.13, 6));
    P.add('whitewood', rod([0, keel(1), zAt(1)], [0, sheer(1) + 0.15, zAt(1) - 0.05], 0.15, 0.13, 6)); }
  P.add('copper', box(0.22, -1.75 - keel(0) + 0.1, 1.0, 0, (keel(0) - 0.1 - 1.75) / 2, ZS + 0.45));
  P.add('tar', box(0.22, 0.5, 0.95, 0, -1.5, ZS + 0.43));
  P.add('whitewood', box(0.2, 1.2, 0.7, 0, -0.65, ZS + 0.3));
  for (const side of [1, -1]) {
    P.add('whitewood', surf(NS, 1, (u, v) => [side * inner(u), v ? -0.05 : sheer(u), zAt(u)], (u, v) => [zAt(u) / 2, v * 0.6], side < 0), { uv: 'keep' });
    P.add('gilt', surf(NS, 1, (u, v) => [side * (v ? inner(u) - 0.06 : hx(u, sheer(u)) + 0.07), sheer(u) + 0.12, zAt(u)], (u, v) => [zAt(u) / 2, v * 0.2], side < 0), { uv: 'keep' });
    P.add('gilt', surf(NS, 1, (u, v) => [side * (hx(u, sheer(u)) + 0.07), sheer(u) + 0.12 - v * 0.14, zAt(u)], (u, v) => [zAt(u) / 2, v * 0.1], side > 0), { uv: 'keep' });
    P.add('whitewood', surf(NS, 1, (u, v) => [side * (inner(u) - 0.06), sheer(u) + 0.12 - v * 0.14, zAt(u)], (u, v) => [zAt(u) / 2, v * 0.1], side < 0), { uv: 'keep' });
  }
  P.add('whitewood', box(inner(0.004) * 2, sheer(0), WALL, 0, sheer(0) / 2, ZS - WALL / 2));
  P.add('deck', surf(NS, 1, (u, v) => [(v * 2 - 1) * inner(u), 0, zAt(u)], (u, v) => [zAt(u) / 2, (v * 2 - 1) * inner(u) / 2], true), { uv: 'keep' });
  for (let z = 10.6; z > -10.8; z -= 1.3) for (const side of [-1, 1]) { const s = sAt(z); if (side > 0 && Math.abs(z + 1.6) < 1.0) continue; P.add('whitewood', box(0.14, sheer(s) - 0.05, 0.16, side * (inner(s) - 0.07), (sheer(s) - 0.05) / 2, z)); }
  // portholes fore and aft of the name, brass rims, warm light
  for (const side of [-1, 1]) for (const z of [-9.0, -7.6, -6.2, 7.0, 8.4, 9.8]) {
    const y = -0.45, x = side * (hx(sAt(z), y) + 0.02), at = (g) => g.rotateY(side * Math.PI / 2).translate(x, y, z);
    P.add('holy', at(new THREE.CircleGeometry(0.2, 10))); P.add('gilt', at(new THREE.TorusGeometry(0.22, 0.05, 4, 12)));
  }
  const name = canvasTex(256, 32, (x) => {
    x.font = 'bold 26px Georgia, serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillStyle = '#10223e'; for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [0, 2]]) x.fillText('G U L L W R A C K', 128 + dx, 17 + dy);
    x.fillStyle = '#f6f0e0'; x.fillText('G U L L W R A C K', 128, 17);
  });
  const nameMat = new THREE.MeshStandardMaterial({ map: name, transparent: true, alphaTest: 0.4, roughness: 0.8 });
  for (const side of [-1, 1]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(8.0, 1.0), nameMat); m.rotation.y = side * Math.PI / 2; m.position.set(side * (LB * 1.012 + 0.05), -0.45, 1.2); root.add(m); }

  // ---------------------------------------------------------------- the lantern tower: ashlar and bright steel
  const TZ = 0.8, TR0 = 1.75, TR1 = 1.3, TH = 8.6;
  const stone = new THREE.MeshStandardMaterial({ color: 0xe8e2d6, roughness: 0.9 });
  new THREE.TextureLoader().load(new URL('../assets/source/castle3d/tex/ashlar.png', import.meta.url).href, (t) => {
    const c = new THREE.CanvasTexture(remap(t.image, 0x8c867c, 0xfaf6ee, 0.85)); c.colorSpace = THREE.SRGBColorSpace;
    c.wrapS = c.wrapT = THREE.RepeatWrapping; c.magFilter = THREE.NearestFilter; c.repeat.set(10, 4.4); c.anisotropy = 8;
    stone.map = c; stone.bumpMap = c; stone.bumpScale = 1.2; stone.color.set(0xffffff); stone.needsUpdate = true;
  });
  const S = new Parts({ ...MM, stone });
  S.add('stone', new THREE.CylinderGeometry(TR1, TR0, TH, 16, 1, true).translate(0, TH / 2, TZ), { uv: 'keep' });
  root.add(S.build('tower'));
  P.add('paleSteel', new THREE.CylinderGeometry(TR0 + 0.12, TR0 + 0.2, 0.36, 16).translate(0, 0.18, TZ));
  for (const y of [2.9, 5.8]) { const r = lerp(TR0, TR1, y / TH) + 0.04; P.add('paleSteel', new THREE.CylinderGeometry(r, r, 0.18, 16).translate(0, y, TZ)); }
  // the door aft, slit windows, the corbels
  { const z = TZ + TR0 - 0.02;
    P.add('dark', new THREE.ShapeGeometry(archShape(1.1, 1.3, 1.9), 6).translate(0, 0.36, z + 0.03));
    P.add('hullPaintBlue', new THREE.ShapeGeometry(archShape(0.95, 1.25, 1.78), 6).translate(0, 0.36, z + 0.06));
    for (const y of [0.8, 1.4]) P.add('paleSteel', box(0.95, 0.07, 0.05, 0, y, z + 0.08));
    P.add('gilt', archFrame(1.1, 1.3, 1.9, 0.14, 0.16).translate(0, 0.36, z));
    P.add('greenGlass', box(0.18, 0.26, 0.18, 0.75, 2.45, z + 0.2)); glow.push({ x: 0.75, y: 2.45, z: z + 0.3, r: 1.2, c: 0x46ff8a }); }
  for (const [a, y] of [[Math.PI / 2 + 0.6, 3.6], [-0.3, 4.6], [Math.PI + 0.5, 5.9], [Math.PI / 2 - 0.5, 6.4]]) {
    const r = lerp(TR0, TR1, y / TH) + 0.02, at = (g) => g.rotateY(a).translate(Math.sin(a) * r, y, TZ + Math.cos(a) * r);
    P.add('holy', at(new THREE.ShapeGeometry(archShape(0.32, 0.5, 0.75), 4))); P.add('gilt', at(archFrame(0.32, 0.5, 0.75, 0.08, 0.06)));
  }
  for (let i = 0; i < 16; i++) { const a = i / 16 * TAU, c = Math.cos(a), s = Math.sin(a);
    P.add('whitewood', box(0.24, 0.5, 0.75, 0, 0, 0).translate(0, 0, 0.38).rotateY(a).translate(s * (TR1 - 0.05), TH - 0.3, TZ + c * (TR1 - 0.05)));
    P.add('gilt', new THREE.SphereGeometry(0.08, 5, 4).translate(s * (TR1 + 0.7), TH - 0.55, TZ + c * (TR1 + 0.7))); }
  // the gallery: a steel deck, railings, bells hung round its rim, the hatch where the ladder comes up
  const GY = TH + 0.12, GR = 2.35;
  P.add('paleSteel', new THREE.CylinderGeometry(GR, GR - 0.15, 0.22, 28).translate(0, GY, TZ));
  P.add('gilt', new THREE.TorusGeometry(GR, 0.06, 4, 32).rotateX(Math.PI / 2).translate(0, GY + 0.1, TZ));
  for (let i = 0; i < 24; i++) { const a = i / 24 * TAU; P.add('paleSteel', rod([Math.sin(a) * (GR - 0.08), GY, TZ + Math.cos(a) * (GR - 0.08)], [Math.sin(a) * (GR - 0.08), GY + 0.9, TZ + Math.cos(a) * (GR - 0.08)], 0.03, 0.03, 4)); }
  P.add('gilt', new THREE.TorusGeometry(GR - 0.08, 0.05, 4, 32).rotateX(Math.PI / 2).translate(0, GY + 0.92, TZ));
  P.add('paleSteel', new THREE.TorusGeometry(GR - 0.08, 0.03, 4, 32).rotateX(Math.PI / 2).translate(0, GY + 0.5, TZ));
  P.add('dark', box(0.62, 0.02, 0.7, 1.75, GY + 0.115, TZ));
  for (let i = 0; i < 8; i++) {
    const a = (i + 0.5) / 8 * TAU, x = Math.sin(a) * (GR + 0.25), z = TZ + Math.cos(a) * (GR + 0.25);
    P.add('paleSteel', rod([Math.sin(a) * (GR - 0.1), GY - 0.05, TZ + Math.cos(a) * (GR - 0.1)], [x, GY - 0.05, z], 0.04, 0.04, 4));
    const g = new THREE.Group(), B = new Parts(MM); g.position.set(x, GY - 0.08, z);
    B.add('bellBronze', bellGeo(0.22, 0.42)); B.add('gilt', new THREE.TorusGeometry(0.22, 0.025, 4, 12).rotateX(Math.PI / 2).translate(0, -0.4, 0));
    B.add('iron', new THREE.SphereGeometry(0.05, 5, 4).translate(0, -0.42, 0));
    g.add(B.build('bell')); g.rotation.y = a; root.add(g); bells.push({ o: g, amp: 0.12, w: 1.3 + i * 0.17, ph: i * 1.3 });
  }
  // the lantern room: a steel sill, green-washed glazing with diamond astragals, a blue-steel dome and a gilt vent
  const LY0 = GY + 0.1, LY1 = LY0 + 0.7, LY2 = LY1 + 1.9, LR = 1.18;
  P.add('paleSteel', new THREE.CylinderGeometry(LR + 0.06, LR + 0.1, LY1 - LY0, 16).translate(0, (LY0 + LY1) / 2, TZ));
  const glaze = new THREE.MeshStandardMaterial({ color: 0xd0ffe4, emissive: 0x2ee874, emissiveIntensity: 0.35, transparent: true, opacity: 0.28, roughness: 0.1, metalness: 0.2, depthWrite: false, side: THREE.DoubleSide });
  const gl = new THREE.Mesh(new THREE.CylinderGeometry(LR, LR, LY2 - LY1, 16, 1, true).translate(0, (LY1 + LY2) / 2, TZ), glaze); gl.name = 'glazing'; root.add(gl);
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * TAU, b = a + TAU / 8, at = (q, y) => [Math.sin(q) * (LR + 0.02), y, TZ + Math.cos(q) * (LR + 0.02)];
    P.add('paleSteel', rod(at(a, LY1), at(a, LY2), 0.04, 0.04, 4));
    P.add('paleSteel', rod(at(a, LY1), at(b, LY2), 0.025, 0.025, 4)); P.add('paleSteel', rod(at(b, LY1), at(a, LY2), 0.025, 0.025, 4));
  }
  for (const y of [LY1, LY2]) P.add('gilt', new THREE.TorusGeometry(LR + 0.03, 0.06, 4, 24).rotateX(Math.PI / 2).translate(0, y, TZ));
  P.add('blueSteel', new THREE.SphereGeometry(LR + 0.2, 18, 8, 0, TAU, 0, Math.PI / 2).scale(1, 0.75, 1).translate(0, LY2, TZ));
  for (let i = 0; i < 8; i++) { const a = i / 8 * TAU, pts = []; for (let j = 0; j <= 4; j++) { const q = j / 4 * Math.PI / 2; pts.push([Math.sin(a) * Math.cos(q) * (LR + 0.22), LY2 + Math.sin(q) * (LR + 0.2) * 0.75, TZ + Math.cos(a) * Math.cos(q) * (LR + 0.22)]); }
    for (let j = 0; j < 4; j++) P.add('gilt', rod(pts[j], pts[j + 1], 0.04, 0.04, 4)); }
  const VY = LY2 + (LR + 0.2) * 0.75;
  P.add('gilt', new THREE.SphereGeometry(0.34, 12, 8).translate(0, VY + 0.25, TZ));
  P.add('paleSteel', rod([0, VY + 0.5, TZ], [0, VY + 1.7, TZ], 0.04, 0.03, 4));
  P.add('bellBronze', bellGeo(0.13, 0.24).translate(0, VY + 1.25, TZ));
  const vane = flag(MM.gilt, 0.7, 0.3, [0, VY + 1.6, TZ], 0.02, 'vane'); flags.push(vane); root.add(vane.mesh);
  // the great lens: a beehive of green prism rings round a burning core, two bull's-eyes; it turns with the beam
  const lens = new THREE.Group(); lens.position.set(0, (LY1 + LY2) / 2, TZ); root.add(lens);
  { const Q = new Parts(MM);
    Q.add('greenFlame', new THREE.CylinderGeometry(0.2, 0.2, 1.2, 10));
    for (let i = -3; i <= 3; i++) { const r = 0.68 * Math.sqrt(1 - (i / 4.2) ** 2); Q.add('greenGlass', new THREE.TorusGeometry(r, 0.06, 4, 18).rotateX(Math.PI / 2).translate(0, i * 0.2, 0)); }
    for (const sd of [-1, 1]) { Q.add('greenFlame', new THREE.CircleGeometry(0.42, 16).rotateY(sd * Math.PI / 2).translate(sd * 0.72, 0, 0));
      for (const r of [0.2, 0.32, 0.44]) Q.add('gilt', new THREE.TorusGeometry(r, 0.025, 3, 16).rotateY(Math.PI / 2).translate(sd * 0.74, 0, 0)); }
    Q.add('gilt', new THREE.CylinderGeometry(0.75, 0.8, 0.12, 16).translate(0, -0.72, 0));
    lens.add(Q.build('lens')); }
  glow.push({ x: 0, y: (LY1 + LY2) / 2, z: TZ, r: 5.5, c: 0x46ff8a, light: true, lr: 14 });
  // the beam: one long additive cone and a bright core, tilted down to sweep the water and the decks
  const BEAM_LEN = 28, TILT = 0.2;
  const shipInv = new THREE.Matrix4();
  const beamMat = (r, k) => new THREE.ShaderMaterial({
    uniforms: { t: { value: 0 }, c: { value: new THREE.Color(0x46ff8a) }, k: { value: k }, shipInv: { value: shipInv } },
    vertexShader: 'varying float f; varying vec3 vN; varying float vY; uniform mat4 shipInv; void main(){ f = 1.0 - uv.y; vN = normalize(normalMatrix * normal); vY = (shipInv * modelMatrix * vec4(position, 1.0)).y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    // where the beam crosses the figure layer (sea level to head height over the decks, ship-relative) it is held
    // to a thin wash, so the boarders it reveals stay readable inside it
    fragmentShader: `varying float f; varying vec3 vN; varying float vY; uniform float t; uniform vec3 c; uniform float k;
      void main(){ float edge = 0.25 + 0.75 * pow(abs(vN.z), 0.8); float a = pow(1.0 - f, 1.4) * edge * k * (0.9 + 0.1 * sin(t * 5.0 + f * 9.0)) * smoothstep(0.0, 0.03, f);
        a = mix(a, min(a, 0.16), 1.0 - smoothstep(3.0, 4.4, vY));
        gl_FragColor = vec4(mix(vec3(1.0), c, smoothstep(0.0, 0.35, f) * 0.8), clamp(a, 0.0, 1.0)); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const beamGrp = new THREE.Group(); beamGrp.position.copy(lens.position); root.add(beamGrp);
  const beamMats = [];
  for (const [r, k, len] of [[3.6, 0.6, BEAM_LEN], [1.0, 1.4, BEAM_LEN * 0.85], [0.9, 0.4, 4]]) {
    const g = new THREE.ConeGeometry(r, len, 24, 1, true).translate(0, -len / 2, 0).rotateZ(Math.PI / 2).rotateZ(-TILT * (len > 5 ? 1 : -1));
    if (len < 5) g.rotateY(Math.PI);                                      // a faint back-flash out of the second bull's-eye
    g.boundingBox = new THREE.Box3(new THREE.Vector3(-1, -1, -1), new THREE.Vector3(1, 1, 1));   // the beam doesn't count when framing views
    const m = new THREE.Mesh(g, beamMat(r, k)); m.frustumCulled = false; m.name = 'beam'; m.renderOrder = 5; beamGrp.add(m); beamMats.push(m.material);
  }

  // ---------------------------------------------------------------- the iron ladder up the tower (starboard), the plank spot on the starboard rail
  const LX0 = TR0 + 0.32, LX1 = TR1 + 0.32;
  for (const dz of [-0.28, 0.28]) P.add('paleSteel', rod([LX0, 0, TZ + dz], [LX1, GY + 0.95, TZ + dz], 0.045, 0.045, 5));
  for (let y = 0.3; y < GY; y += 0.3) { const x = lerp(LX0, LX1, y / (GY + 0.95)); P.add('paleSteel', rod([x, y, TZ - 0.28], [x, y, TZ + 0.28], 0.025, 0.025, 4)); }
  for (let y = 2.4; y < GY; y += 0.8) { const x = lerp(LX0, LX1, y / (GY + 0.95)); P.add('paleSteel', new THREE.TorusGeometry(0.45, 0.025, 3, 12, Math.PI).rotateX(Math.PI / 2).rotateY(-Math.PI / 2).translate(x, y, TZ)); }
  const plankZ = -1.6, plankS = sAt(plankZ), plank = [hx(plankS, sheer(plankS)) - 0.1, sheer(plankS) + 0.12, plankZ];
  P.add('whitewood', box(0.9, 0.5, 1.4, inner(plankS) - 0.45, 0.25, plankZ));                 // the step up to the rail
  P.add('gilt', box(0.94, 0.05, 1.44, inner(plankS) - 0.45, 0.51, plankZ));
  for (const dz of [-0.7, 0.7]) { P.add('gilt', rod([plank[0], plank[1], plankZ + dz], [plank[0], plank[1] + 1.0, plankZ + dz], 0.05, 0.05, 6)); P.add('gilt', new THREE.SphereGeometry(0.08, 6, 4).translate(plank[0], plank[1] + 1.05, plankZ + dz)); }
  rig.push([plank[0], plank[1] + 0.95, plankZ - 0.7], [plank[0], plank[1] + 0.6, plankZ], [plank[0], plank[1] + 0.6, plankZ], [plank[0], plank[1] + 0.95, plankZ + 0.7]);

  // ---------------------------------------------------------------- masts: short, with blue steadying sails and a gilt daymark
  const tex = {}; const T = (k) => tex[k] ||= sailTex(M, k);
  const FZ = -7.2, MZ = 6.9;
  const fh = mast(P, 0, 0, FZ, 9.0, 0.27, { mat: 'whitewood', band: 'paleSteel', tops: [[6.8, 0.75]], cap: 'gilt' });
  const mh = mast(P, 0, 0, MZ, 8.6, 0.25, { mat: 'whitewood', band: 'paleSteel', tops: [], cap: 'gilt' });
  yard(P, 0, 6.6, FZ, 3.0, 0.11, 'whitewood'); yard(P, 0, 3.5, FZ, 3.2, 0.1, 'whitewood');
  { const sl = texSail((m) => squareSail(m, { z: FZ - 0.25, y0: 3.6, y1: 6.5, w0: 3.1, w1: 2.8, belly: 0.8 }), T('blueStar')); root.add(sl.mesh); sails.push(sl); }
  for (const sx of [-1, 1]) rig.push([sx * 3.0, 6.6, FZ], [sx * (inner(sAt(FZ + 4)) - 0.1), sheer(sAt(FZ + 4)), FZ + 4], [sx * 3.2, 3.5, FZ], [sx * (inner(sAt(FZ + 2.5)) - 0.1), sheer(sAt(FZ + 2.5)), FZ + 2.5]);
  // the gaff sail on the mizzen, its boom clear over the deckhouse
  P.add('whitewood', rod([0, 3.1, MZ + 0.25], [0, 3.2, 12.2], 0.1, 0.08, 6)); P.add('whitewood', rod([0, 6.6, MZ + 0.25], [0, 8.0, 11.0], 0.09, 0.07, 6));
  { const sp = texSail((m) => triSail(m, [0, 6.5, MZ + 0.4], [0, 7.85, 10.9], [0, 3.3, 12.0], 0.5, 1, [0, 3.2, MZ + 0.4]), T('blue')); root.add(sp.mesh); sails.push(sp); }
  rig.push([0, 8.0, 11.0], [0, 8.5, MZ], [0, 3.2, 12.2], [0, sheer(0.02) + 0.1, 12.4]);
  // the daymark: a gilt cage ball at the fore masthead
  for (const r of [0, Math.PI / 2]) P.add('gilt', new THREE.TorusGeometry(0.5, 0.05, 4, 16).rotateY(r).translate(0, 9.85, FZ));
  P.add('gilt', new THREE.TorusGeometry(0.5, 0.05, 4, 16).rotateX(Math.PI / 2).translate(0, 9.85, FZ));
  P.add('paleSteel', rod([0, 9.0, FZ], [0, 10.45, FZ], 0.05, 0.05, 4));
  for (const [z, h, ty] of [[FZ, fh[1], 6.8], [MZ, mh[1], 6.4]]) for (const side of [-1, 1]) {
    const s = sAt(z + 1.0), cx = side * (hx(s, sheer(s)) + 0.15), cy = sheer(s) - 0.1;
    const sh = shrouds([side * 0.25, ty, z], [cx, cy, z - 0.3], [cx, cy, z + 1.6], 3, 0.5);
    for (let i = 0; i < 6; i += 2) rig.push(sh[i], sh[i + 1]); for (let i = 6; i < sh.length; i++) ratl.push(sh[i]);
    P.add('whitewood', box(0.32, 0.1, 2.2, cx - side * 0.05, cy, z + 0.65));
  }
  rig.push(fh, [0, sheer(1) + 0.2, zAt(1) + 0.1], mh, [0, LY2 + 1.0, TZ + 1.0], [0, LY2 + 1.0, TZ - 1.0], [0, 9.0, FZ]);
  const pen = flag(MM.flagBlue, 2.6, 0.45, [0, mh[1] + 0.1, MZ], 0.1, 'pennant'); flags.push(pen); root.add(pen.mesh);

  // ---------------------------------------------------------------- the fog bell forward, the bell buoy on the port bow crane
  { const z = -10.0;
    for (const sx of [-1, 1]) { P.add('whitewood', rod([sx * 1.0, 0, z - 0.5], [sx * 0.15, 2.3, z], 0.09, 0.08, 6)); P.add('whitewood', rod([sx * 1.0, 0, z + 0.5], [sx * 0.15, 2.3, z], 0.09, 0.08, 6)); }
    P.add('gilt', box(0.6, 0.18, 0.18, 0, 2.32, z));
    const g = new THREE.Group(), B = new Parts(MM); g.position.set(0, 2.2, z);
    B.add('bellBronze', bellGeo(0.55, 0.95)); B.add('gilt', new THREE.TorusGeometry(0.55, 0.04, 4, 16).rotateX(Math.PI / 2).translate(0, -0.92, 0));
    B.add('iron', rod([0, 0, 0], [0, -0.85, 0], 0.03, 0.03, 4)); B.add('iron', new THREE.SphereGeometry(0.1, 6, 4).translate(0, -0.85, 0));
    g.add(B.build('fogbell')); root.add(g); bells.push({ o: g, amp: 0.1, w: 0.9, ph: 0 });
    rig.push([0, 1.5, z + 0.5], [0.8, 0.9, z + 1.4]); }
  let buoy;
  { const x0 = -(inner(sAt(-8.4)) - 0.45), z0 = -8.4, ax = -(beam(sAt(-8.8)) + 1.3), ay = 4.1, az = -8.8;
    P.add('paleSteel', new THREE.CylinderGeometry(0.22, 0.3, 0.3, 10).translate(x0, 0.15, z0));
    P.add('paleSteel', rod([x0, 0, z0], [x0, 3.3, z0], 0.13, 0.11, 8));
    P.add('paleSteel', rod([x0, 3.1, z0], [ax, ay, az], 0.1, 0.08, 6)); P.add('paleSteel', rod([x0, 1.2, z0], [ax + 0.8, ay - 0.35, az + 0.1], 0.06, 0.06, 5));
    P.add('gilt', new THREE.CylinderGeometry(0.18, 0.18, 0.3, 10).rotateX(Math.PI / 2).translate(x0, 1.3, z0));
    buoy = new THREE.Group(); const B = new Parts(MM); buoy.position.set(ax, ay - 0.4, az);
    B.add('hullPaintBlue', new THREE.CylinderGeometry(0.75, 0.3, 0.9, 14).translate(0, -3.0, 0));
    B.add('whitewood', new THREE.CylinderGeometry(0.78, 0.78, 0.22, 14).translate(0, -2.45, 0));
    B.add('gilt', new THREE.TorusGeometry(0.78, 0.05, 4, 16).rotateX(Math.PI / 2).translate(0, -2.34, 0));
    for (let i = 0; i < 4; i++) { const a = i * TAU / 4 + 0.4; B.add('paleSteel', rod([Math.cos(a) * 0.6, -2.35, Math.sin(a) * 0.6], [Math.cos(a) * 0.2, -0.85, Math.sin(a) * 0.2], 0.04, 0.04, 4)); }
    B.add('bellBronze', bellGeo(0.3, 0.5).translate(0, -1.35, 0)); B.add('iron', new THREE.SphereGeometry(0.06, 5, 4).translate(0, -1.82, 0));
    B.add('paleSteel', new THREE.CylinderGeometry(0.22, 0.22, 0.08, 8).translate(0, -0.85, 0));
    B.add('greenGlass', new THREE.CylinderGeometry(0.14, 0.14, 0.3, 8).translate(0, -0.68, 0)); B.add('gilt', new THREE.ConeGeometry(0.2, 0.22, 8).translate(0, -0.42, 0));
    B.add('paleSteel', new THREE.TorusGeometry(0.1, 0.03, 4, 8).translate(0, -0.25, 0));
    buoy.add(B.build('bellbuoy')); root.add(buoy);
    rig.push([ax, ay, az], [ax, ay - 0.65, az], [x0, 1.3, z0], [ax, ay, az]);
    glow.push({ x: ax, y: ay - 1.1, z: az, r: 1.4, c: 0x46ff8a }); }

  // ---------------------------------------------------------------- the keeper's deckhouse aft, the wheel, the skiff
  { const z0 = 8.4, z1 = 10.7, w = 1.85, h = 2.0, zc = (z0 + z1) / 2;
    P.add('whitewood', box(w * 2, h, z1 - z0, 0, h / 2, zc));
    P.add('gilt', box(w * 2 + 0.12, 0.1, z1 - z0 + 0.12, 0, h - 0.02, zc));
    for (const sx of [-1, 1]) P.add('blueSteel', new THREE.BoxGeometry(w + 0.22, 0.1, z1 - z0 + 0.36).translate(sx * (w + 0.22) / 2, 0, 0).rotateZ(-sx * 0.16).translate(0, h + 0.1, zc));   // a cambered roof
    P.add('gilt', box(0.16, 0.12, z1 - z0 + 0.4, 0, h + 0.13, zc));
    for (const side of [-1, 1]) for (const z of [z0 + 0.6, z1 - 0.6]) { const at = (g) => g.rotateY(side * Math.PI / 2).translate(side * (w + 0.02), 1.2, z);
      P.add('holy', at(new THREE.CircleGeometry(0.24, 10))); P.add('gilt', at(new THREE.TorusGeometry(0.26, 0.05, 4, 12))); }
    P.add('dark', box(0.95, 1.65, 0.05, 0.7, 0.83, z0 - 0.02)); P.add('hullPaintBlue', box(0.82, 1.55, 0.05, 0.7, 0.8, z0 - 0.04));
    P.add('gilt', box(1.1, 0.1, 0.1, 0.7, 1.7, z0 - 0.05));
    P.add('holy', box(0.7, 0.55, 0.04, -0.85, 1.25, z0 - 0.02)); P.add('paleSteel', box(0.82, 0.07, 0.07, -0.85, 1.55, z0 - 0.04));
    P.add('paleSteel', rod([-1.1, h, z1 - 0.5], [-1.1, h + 1.3, z1 - 0.4], 0.12, 0.12, 8)); P.add('iron', new THREE.CylinderGeometry(0.2, 0.15, 0.18, 8).translate(-1.1, h + 1.38, z1 - 0.4));
    const st = smoke([-1.1, h + 1.5, z1 - 0.4], 5, ['#c8ccd2', '#9aa0a8'], 1.6, 0.6); fx.push(st); root.add(st.grp);
    glow.push(greenLantern(P, w - 0.2, h + 0.05, z0 + 0.25, 0.7));
    // the wheel aft of the house
    const wz = 11.5; P.add('whitewood', box(0.4, 1.0, 0.4, 0, 0.5, wz));
    const W = new Parts(MM); W.add('cedar', new THREE.TorusGeometry(0.5, 0.06, 6, 18));
    for (let i = 0; i < 9; i++) { const a = i * TAU / 9; W.add('gilt', rod([0, 0, 0], [Math.cos(a) * 0.68, Math.sin(a) * 0.68, 0], 0.035, 0.03, 4)); }
    const wheel = W.build('wheel'); wheel.position.set(0, 1.12, wz - 0.26); root.add(wheel); }
  { const z = 4.6, s = sAt(z), l = 3.4;
    davits(P, -(beam(s) - 0.15), sheer(s) + 0.1, z, -1, l, 2.6);
    dinghy(P, -(beam(s) + 0.95), sheer(s) + 0.75, z, l, 0.66, { mat: 'whitewood', inner: 'cedar', rim: 'gilt' });
    for (const dz of [-l * 0.38, l * 0.38]) rig.push([-(beam(s) + 0.45), sheer(s) + 2.7, z + dz], [-(beam(s) + 0.95), sheer(s) + 0.85, z + dz]); }
  // anchors catted at the bow, a hawse each side; oil casks and coils by the tower
  for (const side of [-1, 1]) { const z = -10.6, s = sAt(z);
    P.add('whitewood', box(1.1, 0.24, 0.26, side * (beam(s) + 0.2), sheer(s) + 0.06, z));
    anchor(P, side * (beam(s) + 0.62), sheer(s) - 0.15, z + 0.12, 0.8, side * 0.25, 'paleSteel'); }
  for (const [x, z] of [[-2.6, -1.0], [-2.65, 2.2], [-2.0, 3.1]]) {
    P.add('cedar', new THREE.CylinderGeometry(0.32, 0.32, 0.8, 10).translate(x, 0.4, z), { swap: true });
    for (const y of [0.12, 0.68]) P.add('paleSteel', new THREE.CylinderGeometry(0.335, 0.335, 0.06, 10).translate(x, y, z));
    P.add('greenFlame', new THREE.CircleGeometry(0.08, 6).rotateX(-Math.PI / 2).translate(x + 0.15, 0.81, z));
  }
  for (const [x, z] of [[-2.9, 5.6], [3.0, -5.6]]) for (let i = 0; i < 4; i++) P.add('cedar', new THREE.TorusGeometry(0.42 - i * 0.07, 0.05, 4, 14).rotateX(Math.PI / 2).translate(x, 0.05 + i * 0.06, z));
  // green lanterns along the rails
  for (const s of [0.12, 0.3, 0.7, 0.85]) for (const side of [-1, 1]) glow.push(greenLantern(P, side * (inner(s) + WALL / 2), sheer(s) + 0.12, zAt(s), 0.7));
  // the order's ensign astern
  P.add('paleSteel', rod([0, sheer(0.01) + 0.1, ZS - 0.4], [0, sheer(0.01) + 3.6, ZS + 0.1], 0.06, 0.05, 6));
  const ens = flag(ensignMat(MM), 2.2, 1.4, [0, sheer(0.01) + 3.6, ZS + 0.1], 0.22, 'ensign'); flags.push(ens); root.add(ens.mesh);

  // ---------------------------------------------------------------- build
  root.add(P.build('lightship'));
  root.add(lines(rig, M.rope, 'rigging'), lines(ratl, M.ropeLight, 'ratlines'));
  root.traverse((o) => { if (o.isMesh && o.name !== 'beam' && o.name !== 'glazing') { o.castShadow = true; o.receiveShadow = true; } });
  const PERIOD = 6;
  let beamAngle = 0;
  function anim(t, dt) {
    for (const s of sails) s.update(t);
    for (const f of flags) f.update(t);
    for (const f of fx) f.update(t);
    for (const b of bells) b.o.rotation.x = Math.sin(t * b.w + b.ph) * b.amp;
    buoy.rotation.z = Math.sin(t * 0.8) * 0.06; buoy.rotation.x = Math.sin(t * 0.6 + 1) * 0.05;
    beamAngle = (t / PERIOD) * TAU % TAU;
    lens.rotation.y = beamGrp.rotation.y = beamAngle;
    for (const m of beamMats) m.uniforms.t.value = t;
    root.updateWorldMatrix(true, false); shipInv.copy(root.matrixWorld).invert();
  }
  const info = {
    length: L, beam: 2 * LB, waterline: WL, hl: 12.6, hb: 4.1, glow,
    crew: [[2.6, 0, -3.4, 'hero'], [-2.4, 0, -4.0, 'hero'], [2.8, 0, 4.0, 'hero'], [-2.6, 0, 5.2, 'hero'], [1.3, GY + 0.12, TZ - 1.6, 'hero'], [0.6, 0, -5.4, 'hero']],
    plank: plank, gallery: [1.75, GY + 0.12, TZ], ladder: [[LX0 + 0.35, 0, TZ], [LX1, GY + 0.12, TZ]],
    // the beam: from the lens, turning about +Y once every `period` seconds, angle 0 = toward +X (rotation.y = angle)
    lamp: { origin: [0, (LY1 + LY2) / 2, TZ], period: PERIOD, length: BEAM_LEN, halfAngle: Math.atan(3.6 / BEAM_LEN), tilt: TILT },
    // deck obstacles for a walk map: circles [x, z, r] and boxes [x0, z0, x1, z1]
    blocks: { circles: [[0, TZ, TR0 + 0.1], [0, FZ, 0.4], [0, MZ, 0.4]], boxes: [[-1.85, 8.4, 1.85, 10.7], [-1.1, -10.6, 1.1, -9.4], [-0.3, 11.3, 0.3, 11.7], [-3.0, -1.4, -2.2, 3.5]] },
    walk: LIGHTSHIP,
  };
  return { root, anim, info, beamAngle: () => beamAngle };
}
