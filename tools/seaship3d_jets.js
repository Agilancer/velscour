// The carrier's aircraft (docs/PIRATE_SEAS.md): the Brass Fraternity's steampunk jets, flown by renegade Gunners in
// Velscour's pay off the carrier's deck. The only things in the sea fleet that fly, and they fly as jets: turbine
// nacelles with spinning intake fans and blue afterburners, no lift crystals, no balloons.
//   buildJet(M, 'kestrel' | 'thunderhawk', { folded, gear })
//     -> { root, anim(t, dt), info, setFold(k), setThrottle(k), setGear(down), fire(on), drop(), rearm() }
// Frame as the ships: nose toward -Z, starboard +X, up +Y; the root origin is the wheels' contact point, so a jet set
// on a deck at y = 0 stands on its wheels. folded: outer wings hinged up for the hangar and engines cold (parked).
// setGear(false) retracts the legs and the arresting hook behind closed doors (flight); setThrottle(0) darkens the
// nozzles; drop() lets a Thunderhawk torpedo go (starboard, then port) and hands back its world pose for the fall and splash.
// Brass Kestrel: 8.0 long (pitot to hook) x 6.4 span (3.7 folded), an inverted gull wing (a W from the bow), a hero-sized cockpit, twin nacelles at
// the knees, two nose gatlings. Thunderhawk: 12.0 long (to the stinger's guns) x 11.5 span (5.8 folded), three turbines, a glazed bombardier's
// nose, an astrodome, a tail gunner's glazed stinger, twin torpedoes semi-recessed in cradles on the flanks.
// Skins: gunmetal with dark riveted strap seams; brass is the jewellery (calmed copies of the pack textures, below).
import * as THREE from 'three';
import { Parts, box, rod, surf, plume, TAU } from './seaship3d.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;

// ------------------------------------------------------------------ materials
/** A calmer copy of a pack texture: shifted toward `target` (a colour) and pulled k of the way to its mean, so the
 *  pixel-art mottle reads as worked metal rather than rust; drawn at a larger repeat. */
function calm(src, k, target, rep, o = {}) {
  const img = src.map.image, w = img.width, h = img.height, c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d'); x.drawImage(img, 0, 0);
  const d = x.getImageData(0, 0, w, h), p = d.data, n = w * h, m = [0, 0, 0];
  for (let i = 0; i < p.length; i += 4) { m[0] += p[i]; m[1] += p[i + 1]; m[2] += p[i + 2]; }
  for (let j = 0; j < 3; j++) m[j] /= n;
  const tg = target == null ? m : [(target >> 16) & 255, (target >> 8) & 255, target & 255].map((v, j) => lerp(m[j], v, 0.75));
  for (let i = 0; i < p.length; i += 4) for (let j = 0; j < 3; j++) p[i + j] = Math.max(0, Math.min(255, lerp(p[i + j] - m[j] + tg[j], tg[j], k)));
  x.putImageData(d, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.NearestFilter; t.anisotropy = 8; t.repeat.set(rep, rep);
  return new THREE.MeshStandardMaterial({ map: t, bumpMap: t, bumpScale: 0.35, roughness: 0.4, metalness: 0.55, ...o });
}
/** The jets' shared paints, made once per material set. */
function jetMats(M) {
  if (M._jetMats) return M._jetMats;
  const J = {
    skin: calm(M.gunmetal, 0.74, 0x5a5f6c, 1, { roughness: 0.42, metalness: 0.6 }),                   // gunmetal hull
    jbrass: calm(M.brass, 0.6, 0xd8aa4c, 0.5, { roughness: 0.3, metalness: 0.72 }),                     // the jewellery
    jcopper: calm(M.brass, 0.65, 0xd0703c, 0.5, { roughness: 0.32, metalness: 0.7 }),                   // pipes, lips, nozzles
    jsteel: calm(M.steel, 0.55, 0x8a9cb8, 0.6, { roughness: 0.22, metalness: 0.75 }),                   // the polished spine
  };
  J.skinDark = J.skin.clone(); J.skinDark.color = new THREE.Color(0x9a9aa4);                            // belly in shadow
  J.checkBlack = new THREE.MeshStandardMaterial({ color: 0x141216, roughness: 0.5, metalness: 0.3 });
  Object.defineProperty(M, '_jetMats', { value: J, enumerable: false });
  return J;
}
let HALO = null;
const haloTex = () => HALO ||= (() => {
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,0.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c);
})();
/** The afterburner: a ~1 tile cone, white-hot at the nozzle into blue, with shock diamonds, along +Z from the origin. */
function burnerCone(r, len, color = 0x7fd0ff, core = false) {
  const g = new THREE.CylinderGeometry(r * 0.1, r, len, 16, 10, true).rotateX(Math.PI / 2).translate(0, 0, len / 2);
  const mat = new THREE.ShaderMaterial({
    uniforms: { t: { value: 0 }, c: { value: new THREE.Color(color) }, len: { value: len }, k: { value: 1 } },
    vertexShader: 'varying float f; uniform float len; void main(){ f = position.z / len; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `varying float f; uniform float t; uniform vec3 c; uniform float k; void main(){
      float d = pow(abs(cos(f * 13.0 - t * 1.5)), 4.0);
      float a = pow(1.0 - f, ${core ? '1.8' : '1.1'}) * (0.55 + 0.45 * d) * (0.85 + 0.15 * sin(t * 47.0)) * k;
      vec3 col = mix(vec3(1.0, 0.97, 0.9), c, smoothstep(0.0, ${core ? '0.9' : '0.45'}, f));
      gl_FragColor = vec4(col * ${core ? '1.0' : 'a * 1.6'}, min(1.0, a * ${core ? '1.15' : '1.0'})); }`,
    transparent: true, depthWrite: false, blending: core ? THREE.NormalBlending : THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
  const m = new THREE.Mesh(g, mat); m.name = 'burner'; m.renderOrder = core ? 2 : 3; m.castShadow = false;
  m.userData.update = (t) => { mat.uniforms.t.value = t; m.scale.z = 0.92 + 0.1 * Math.sin(t * 29) + 0.05 * Math.sin(t * 61); };
  return m;
}

// ------------------------------------------------------------------ geometry helpers
/** Flip g's winding if most of its faces point against want(centroid). */
function orient(g, want) {
  g = g.index ? g.toNonIndexed() : g;
  const p = g.attributes.position.array, uv = g.attributes.uv?.array;
  const a = V(), b = V(), c = V(), m = V();
  let vote = 0;
  for (let i = 0; i < p.length; i += 9) {
    a.fromArray(p, i); b.fromArray(p, i + 3); c.fromArray(p, i + 6);
    m.copy(a).add(b).add(c).divideScalar(3);
    vote += Math.sign(b.clone().sub(a).cross(c.clone().sub(a)).dot(want(m)));
  }
  if (vote < 0) for (let i = 0, k = 0; i < p.length; i += 9, k += 6) {
    for (let j = 0; j < 3; j++) { const t = p[i + 3 + j]; p[i + 3 + j] = p[i + 6 + j]; p[i + 6 + j] = t; }
    if (uv) for (let j = 0; j < 2; j++) { const t = uv[k + 2 + j]; uv[k + 2 + j] = uv[k + 4 + j]; uv[k + 4 + j] = t; }
  }
  g.attributes.position.needsUpdate = true; g.computeVertexNormals();
  return g;
}
/** A smooth 1D curve through [[x, y], ...] (Catmull-Rom, clamped ends). */
function spline(pts) {
  return (x) => {
    if (x <= pts[0][0]) return pts[0][1];
    if (x >= pts[pts.length - 1][0]) return pts[pts.length - 1][1];
    let i = 0; while (x > pts[i + 1][0]) i++;
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    const t = (x - p1[0]) / (p2[0] - p1[0]), h = p2[0] - p1[0];
    const m1 = (p2[1] - p0[1]) / (p2[0] - p0[0]) * h, m2 = (p3[1] - p1[1]) / (p3[0] - p1[0]) * h;
    const t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * p1[1] + (t3 - 2 * t2 + t) * m1 + (-2 * t3 + 3 * t2) * p2[1] + (t3 - t2) * m2;
  };
}
/** A body of revolution with elliptic sections. R(z) -> [rx, ry, cy, cx]; angle a = 0 on top, pi/2 to starboard. */
function loft(z0, z1, R, { a0 = 0, a1 = TAU, nu = 28, nv = 22, off = 0, inward = false } = {}) {
  const g = surf(nu, nv, (u, v) => { const z = lerp(z0, z1, u), [rx, ry, cy, cx = 0] = R(z), a = lerp(a0, a1, v); return [cx + (rx + off) * Math.sin(a), cy + (ry + off) * Math.cos(a), z]; });
  return orient(g, (m) => { const [, , cy, cx = 0] = R(m.z), d = V(m.x - cx, m.y - cy, 0); return inward ? d.negate() : d; });
}
const fp = (R, z, a, off = 0) => { const [rx, ry, cy, cx = 0] = R(z); return [cx + (rx + off) * Math.sin(a), cy + (ry + off) * Math.cos(a), z]; };
const tube = (pts, r, seg = 5, n) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => V(...p))), n || Math.max(4, pts.length * 3), r, seg, false);
const ball = (r, x, y, z, sx = 1, sy = 1, sz = 1, seg = 12) => new THREE.SphereGeometry(r, seg, Math.max(6, seg >> 1)).scale(sx, sy, sz).translate(x, y, z);
const discZ = (r, x, y, z, seg = 16, th = 0.02) => new THREE.CylinderGeometry(r, r, th, seg).rotateX(Math.PI / 2).translate(x, y, z);
/** A flat plate from a 2D outline [[z, y], ...] in the plane x = 0, thickness th along X, canted about its root
 *  (the z axis through (x, y)) by `cant` radians (positive leans the top toward +X). */
function fin(pts, th, x, y, cant = 0) {
  const g = new THREE.ExtrudeGeometry(new THREE.Shape(pts.map(([z, h]) => new THREE.Vector2(z, h))), { depth: th, bevelEnabled: false }).rotateY(-Math.PI / 2).translate(th / 2, 0, 0);
  return g.rotateZ(-cant).translate(x, y, 0);
}
/** A flat plate from a 2D outline [[x, z], ...] lying at height y, thickness th downward. */
const plate = (pts, th, y) => new THREE.ExtrudeGeometry(new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, z))), { depth: th, bevelEnabled: false }).rotateX(Math.PI / 2).translate(0, y + th, 0);

// ------------------------------------------------------------------ the parts of a jet
/** The fuselage: a gunmetal skin, a darker belly, dark riveted strap seams every ~0.8 with brass rivets, a polished
 *  steel spine panel and a thin brass beading along the flanks. */
function fuselage(P, F) {
  const R = F.R, top = 0.42 * Math.PI;
  P.add('skin', loft(F.z0, F.z1, R, { a0: -top, a1: top, nu: 36, nv: 16 }));
  P.add('skinDark', loft(F.z0, F.z1, R, { a0: top, a1: TAU - top, nu: 36, nv: 14 }));
  for (const s of [-1, 1]) P.add('jbrass', loft(F.z0 + 0.1, F.z1 - 0.05, R, { a0: s * top - 0.025, a1: s * top + 0.025, nu: 30, nv: 1, off: 0.01 }));
  for (const [za, zb] of F.spine) P.add('jsteel', loft(za, zb, R, { a0: -F.spineW, a1: F.spineW, nu: 16, nv: 3, off: 0.012 }));
  for (const z of F.straps) {
    P.add('iron', loft(z - 0.04, z + 0.04, R, { nu: 1, nv: 26, off: 0.012 }));
    for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU + 0.1; P.add('jbrass', ball(F.rivet, ...fp(R, z, a, 0.03), 1, 1, 1, 5), { rep: 1 }); }
  }
  for (const s of [-1, 1]) for (let z = F.z0 + 0.4; z < F.z1 - 0.3; z += F.rivetStep) P.add('iron', ball(F.rivet * 0.8, ...fp(R, z, s * (top + 0.08), 0.006), 1, 1, 1, 5), { rep: 1 });
}
/** A brass filigree scroll on the skin of a loft: two curls joined by a stem, in (z, angle) space. */
function filigree(P, R, zc, ac, len, size, flip = 1, mat = 'jbrass', r = 0.018) {
  const rr = R(zc)[0] || 0.5, line = (pts) => P.add(mat, tube(pts.map(([z, a]) => fp(R, z, a, 0.016)), r, 4), { rep: 1 });
  const curl = (z0, a0, dir) => { const pts = []; for (let k = 0; k <= 16; k++) { const th = dir * k / 16 * TAU * 1.1, rho = size * (1 - k / 16 * 0.82); pts.push([z0 + rho * Math.cos(th) * dir, a0 + flip * rho * Math.sin(th) / rr]); } return pts; };
  const zA = zc - len / 2, zB = zc + len / 2;
  const stem = []; for (let k = 0; k <= 10; k++) { const t = k / 10; stem.push([lerp(zA + size, zB - size, t), ac + flip * Math.sin(t * TAU) * size * 0.6 / rr]); }
  line(stem); line(curl(zA, ac, 1)); line(curl(zB, ac, -1));
}

/** Wing sections [{x, y, z (leading edge), c (chord), t (thickness)}] inner to outer, x >= 0. */
function wingAt(S, xa) {
  let i = 0; while (i < S.length - 2 && xa > S[i + 1].x) i++;
  const A = S[i], B = S[i + 1], t = Math.min(1, Math.max(0, (xa - A.x) / (B.x - A.x)));
  return { x: xa, y: lerp(A.y, B.y, t), z: lerp(A.z, B.z, t), c: lerp(A.c, B.c, t), t: lerp(A.t, B.t, t) };
}
const AF = (v) => 2.6 * (1 - v) * Math.sqrt(Math.max(0, v));                  // thickness along the chord
const wingY = (S, xa, v, top = true) => { const s = wingAt(S, xa); return s.y + s.t * AF(v) * (top ? 0.65 : -0.35); };
/** A patch of wing skin from |x| = xa0..xa1 and chord fraction v0..v1, raised by off (top) or under (bottom). */
function wingPatch(S, side, xa0, xa1, v0, v1, off = 0, top = true, nu = 6, nv = 10) {
  const g = surf(nu, nv, (u, v) => { const xa = lerp(xa0, xa1, u), s = wingAt(S, xa), vv = lerp(v0, v1, v); return [side * xa, wingY(S, xa, vv, top) + (top ? off : -off), s.z + vv * s.c]; });
  return orient(g, () => V(0, top ? 1 : -1, 0));
}
/** A disc decal on the wing top at (xa, chord fraction v), radius r0 (r1 > 0 makes a ring). */
function wingDisc(S, side, xa, v, r0, r1 = 0, off = 0.014) {
  const s0 = wingAt(S, xa), zc = s0.z + v * s0.c;
  const g = surf(2, 24, (u, w) => {
    const rho = lerp(r1, r0, u), th = w * TAU, x = xa + rho * Math.cos(th), z = zc + rho * Math.sin(th), s = wingAt(S, x);
    return [side * x, wingY(S, x, Math.min(1, Math.max(0, (z - s.z) / s.c))) + off, z];
  });
  return orient(g, () => V(0, 1, 0));
}

/** One wing (side +1 starboard), split at the fold hinge: inner skin into P, outer into the hinged group's Parts.
 *  Gunmetal skin, a brass leading edge, dark riveted rib straps, Fraternity red tips edged in brass, a red roundel with
 *  a brass ring and a black cog, a wingtip pod with its nav light. Returns the hinge point and the light. */
function wing(P, PO, side, W) {
  const S = W.S, hx = W.hinge, hs = wingAt(S, hx), xr = S[0].x, xt = S[S.length - 1].x;
  const to = (g) => g.translate(-side * hx, -hs.y, 0);                       // into hinge-local space
  const pick = (xa) => (xa < hx ? [P, (g) => g] : [PO, to]);
  const add = (xa0, xa1, fn) => {                                            // split a spanwise range at the hinge
    if (xa0 < hx) fn(P, xa0, Math.min(hx, xa1), (g) => g);
    if (xa1 > hx) fn(PO, Math.max(hx, xa0), xa1, to);
  };
  const breaks = [...S.map((s) => s.x), hx].sort((a, b) => a - b).filter((x, i, a) => i === 0 || x - a[i - 1] > 1e-4);
  for (let i = 0; i < breaks.length - 1; i++) {
    const a = breaks[i], b = breaks[i + 1], [T, tf] = pick((a + b) / 2);
    T.add('skin', tf(wingPatch(S, side, a, b, 0, 1, 0, true, 5, 12)));
    T.add('skinDark', tf(wingPatch(S, side, a, b, 0, 1, 0, false, 5, 8)));
  }
  add(xr, xt, (T, a, b, tf) => {
    const pts = []; for (let k = 0; k <= 8; k++) { const xa = lerp(a, b, k / 8), s = wingAt(S, xa); pts.push([side * xa, s.y + 0.005, s.z + 0.012]); }
    T.add('jbrass', tf(tube(pts, W.le, 6, 10)), { rep: 1 });
    T.add('iron', tf(wingPatch(S, side, a, b, 0.8, 1, 0.01, true, 4, 2)));                       // flaps
    T.add('iron', tf(wingPatch(S, side, a, b, 0.32, 0.36, 0.009, true, 4, 1)));                  // the spar strap
  });
  for (const xa of W.ribs) {
    const [T, tf] = pick(xa), s = wingAt(S, xa);
    T.add('iron', tf(wingPatch(S, side, xa - W.le * 0.6, xa + W.le * 0.6, 0.04, 0.8, 0.009, true, 1, 8)));
    for (let v = 0.08; v < 0.8; v += 0.08) T.add('jbrass', tf(ball(W.rivet, side * xa, wingY(S, xa, v) + 0.02, s.z + v * s.c, 1, 0.6, 1, 5)), { rep: 1 });
  }
  // Fraternity red tip band edged in brass
  const tip0 = xt - W.tipBand;
  PO.add('fratRed', to(wingPatch(S, side, tip0, xt, 0, 0.98, 0.011, true, 3, 10)));
  PO.add('fratRed', to(wingPatch(S, side, tip0, xt, 0, 0.98, 0.011, false, 3, 6)));
  PO.add('jbrass', to(wingPatch(S, side, tip0 - 0.05, tip0, 0, 0.98, 0.013, true, 1, 10)));
  // the roundel: red, a brass ring, a black cog with eight teeth and a brass hub
  const [rx, rv, rr] = W.roundel, [T, tf] = pick(rx);
  T.add('fratRed', tf(wingDisc(S, side, rx, rv, rr, 0, 0.014)));
  T.add('jbrass', tf(wingDisc(S, side, rx, rv, rr * 1.12, rr * 0.98, 0.016)));
  T.add('checkBlack', tf(wingDisc(S, side, rx, rv, rr * 0.42, 0, 0.018)));
  const s0 = wingAt(S, rx), zc = s0.z + rv * s0.c;
  for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU, x = rx + Math.cos(a) * rr * 0.48, z = zc + Math.sin(a) * rr * 0.48, sx = wingAt(S, x); T.add('checkBlack', tf(box(rr * 0.16, 0.02, rr * 0.16, side * x, wingY(S, x, (z - sx.z) / sx.c) + 0.018, z, -a)), { rep: 1 }); }
  T.add('jbrass', tf(wingDisc(S, side, rx, rv, rr * 0.14, 0, 0.022)));
  // the wingtip pod and its nav light (port red, starboard green-blue)
  const st = wingAt(S, xt), pr = st.t * 0.9 + 0.02;
  PO.add('jbrass', to(ball(pr, side * (xt + 0.02), st.y + st.t * 0.25, st.z + st.c * 0.45, 1, 1, st.c * 0.55 / pr, 10)));
  const light = V(side * (xt + 0.02), st.y + st.t * 0.25, st.z - st.c * 0.08);
  PO.add(side > 0 ? 'cyan' : 'ember', to(ball(st.t * 0.6 + 0.02, light.x, light.y, light.z, 1, 1, 1, 8)), { uv: 'none' });
  return { hinge: V(side * hx, hs.y, 0), light };
}

/** A turbine nacelle along Z from z0 (intake) to z1 (nozzle) at (x, y), radius r: gunmetal body with dark straps, a
 *  brass cowl ring, an intake lip (red on the Kestrel, copper on the bomber), a brass filigree scroll, a copper nozzle
 *  with iron petals, the fan (spins), the burner core, the afterburner cone, a plume, a heat trail and a halo. */
function nacelle(J, P, x, y, z0, z1, r, { lip = 'jcopper' } = {}) {
  const L = z1 - z0, zn = z1 - L * 0.16;
  const R = spline([[z0, r * 0.86], [z0 + L * 0.12, r * 0.98], [z0 + L * 0.3, r], [z0 + L * 0.7, r * 0.94], [zn, r * 0.8]]);
  const RR = (z) => [R(z), R(z), y, x];
  P.add('skin', loft(z0, zn, RR, { nu: 18, nv: 22 }));
  P.add('jbrass', loft(z0 + L * 0.06, z0 + L * 0.2, RR, { nu: 3, nv: 22, off: 0.014 }));
  P.add('skinDark', loft(z0, z0 + L * 0.14, RR, { nu: 3, nv: 22, off: -0.03, inward: true }));
  P.add(lip, new THREE.TorusGeometry(r * 0.88, r * 0.09, 6, 26).translate(x, y, z0), { rep: 1 });
  P.add('dark', discZ(r * 0.85, x, y, z0 + L * 0.14, 22));
  for (const k of [0.36, 0.56, 0.74]) {
    P.add('iron', loft(z0 + L * k - 0.03, z0 + L * k + 0.03, RR, { nu: 1, nv: 22, off: 0.012 }));
    for (let i = 0; i < 12; i++) P.add('jbrass', ball(r * 0.035, ...fp(RR, z0 + L * k, (i / 12) * TAU, 0.03), 1, 1, 1, 5), { rep: 1 });
  }
  for (const s of [-1, 1]) filigree(P, RR, z0 + L * 0.47, s * Math.PI / 2, L * 0.16, r * 0.17, s, 'jbrass', r * 0.04);
  const RN = (z) => { const u = (z - zn) / (z1 - zn), q = r * (0.8 - 0.14 * u); return [q, q, y, x]; };
  P.add('jcopper', loft(zn, z1, RN, { nu: 3, nv: 16 }));
  P.add('jcopper', loft(zn, z1, (z) => { const q = RN(z); return [q[0] - 0.03, q[1] - 0.03, y, x]; }, { nu: 3, nv: 16, inward: true }));
  for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU + 0.2; P.add('iron', rod(fp(RN, zn + 0.03, a, 0.012), fp(RN, z1 - 0.02, a, 0.012), r * 0.045, r * 0.045, 4), { rep: 1 }); }
  P.add('heat', new THREE.TorusGeometry(r * 0.6, r * 0.05, 5, 20).translate(x, y, z1 - 0.12), { uv: 'none' });
  P.add('burn', discZ(r * 0.58, x, y, z1 - 0.1, 18), { uv: 'none' });
  // the fan: brass blades with a twist, a brass spinner
  const FP = new Parts(J.M);
  for (let i = 0; i < 14; i++) { const a = (i / 14) * TAU; FP.add('jbrass', box(r * 0.17, r * 0.72, 0.03, 0, r * 0.47, 0).rotateY(0.6).rotateZ(a), { rep: 1 }); }
  FP.add('jbrass', rod([0, 0, 0.05], [0, 0, -r * 0.55], r * 0.26, 0.01, 14), { rep: 1 });
  FP.add(lip, new THREE.TorusGeometry(r * 0.26, r * 0.03, 4, 16), { rep: 1 });
  const fan = FP.build('fan'); fan.position.set(x, y, z0 + L * 0.07); J.root.add(fan); J.fans.push(fan);
  engineFx(J, x, y, z1, r * 0.66);
}
/** What a running engine shows at its nozzle (x, y, z) of radius rn: a burner cone and core, a long faint plume, a
 *  short heat trail of puffs and a halo. All hide at throttle 0. */
function engineFx(J, x, y, z, rn) {
  const sheath = burnerCone(rn * 1.0, 1.25, 0x5fb8ff), core = burnerCone(rn * 0.6, 0.95, 0x9fe0ff, true), pl = plume(rn * 0.8, rn * 6, 0x7fd0ff);
  for (const m of [sheath, core, pl]) { m.position.set(x, y, z - 0.04); J.root.add(m); J.fx.push(m); }
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex(), color: 0x7fd0ff, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  halo.position.set(x, y, z + 0.15); halo.scale.setScalar(rn * 5); J.root.add(halo); J.fx.push(halo);
  const puffs = [], ph = Math.random() * 3;
  for (let i = 0; i < 10; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex(), color: 0xd6dee6, transparent: true, depthWrite: false, opacity: 0 }));
    J.root.add(s); puffs.push(s); J.fx.push(s);
  }
  J.trails.push((t) => puffs.forEach((s, i) => {
    const f = (t * 1.3 + ph + i / puffs.length) % 1;
    s.position.set(x + Math.sin(i * 5 + t * 3) * 0.06 * f, y + f * 0.3, z + 0.7 + f * 4.2);
    s.scale.setScalar(rn * (1.6 + f * 4.5)); s.material.opacity = 0.42 * (1 - f) * Math.min(1, f * 5);
  }));
  halo.userData.pulse = true;
}

/** A gatling: six barrels about the Z axis, breech at the origin, muzzles at -len; brass bands, an iron shroud. */
function gatling(J, len, r, x, y, z) {
  const G = new Parts(J.M), br = r * 0.32;
  for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU, bx = Math.cos(a) * r, by = Math.sin(a) * r; G.add('gunmetal', rod([bx, by, 0], [bx, by, -len], br, br, 6), { rep: 1 }); G.add('dark', discZ(br * 0.7, bx, by, -len - 0.005, 6, 0.01), { uv: 'none' }); }
  G.add('iron', rod([0, 0, 0.05], [0, 0, -len * 0.98], r * 0.45, r * 0.45, 8), { rep: 1 });
  for (const k of [0.25, 0.62, 0.94]) G.add('jbrass', rod([0, 0, -len * k + 0.03], [0, 0, -len * k - 0.03], r * 1.45, r * 1.45, 12), { rep: 1 });
  const g = G.build('gatling'); g.position.set(x, y, z); J.root.add(g); J.guns.push(g);
  return g;
}
/** A wheel with its axle along X at (x, y = radius, z): black tyre, brass hub, iron spokes. */
function wheel(P, r, w, x, z) {
  P.add('dark', new THREE.TorusGeometry(r * 0.78, r * 0.24, 8, 20).rotateY(Math.PI / 2).scale(w / (r * 0.48), 1, 1).translate(x, r, z), { uv: 'none' });
  P.add('jbrass', new THREE.CylinderGeometry(r * 0.6, r * 0.6, w * 0.8, 14).rotateZ(Math.PI / 2).translate(x, r, z), { rep: 1 });
  P.add('jcopper', new THREE.CylinderGeometry(r * 0.2, r * 0.2, w * 1.05, 10).rotateZ(Math.PI / 2).translate(x, r, z), { rep: 1 });
  for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; P.add('iron', box(w * 0.85, 0.02, r * 0.5, x, r + Math.sin(a) * r * 0.32, z + Math.cos(a) * r * 0.32), { rep: 1 }); }
}
/** A gear leg: an oleo from the airframe down to a fork over the wheel, a brass scissor link, open doors beside. */
function leg(P, x, yTop, z, r, w, twin = 0) {
  P.add('jsteel', rod([x, yTop, z], [x, r + r * 0.25, z], r * 0.14, r * 0.12, 8), { rep: 1 });
  P.add('iron', rod([x, yTop, z], [x, lerp(yTop, r, 0.45), z], r * 0.2, r * 0.2, 8), { rep: 1 });
  P.add('jbrass', rod([x, lerp(yTop, r, 0.5), z - r * 0.25], [x, lerp(yTop, r, 0.75), z - r * 0.1], r * 0.06, r * 0.06, 4), { rep: 1 });
  if (twin) { P.add('iron', rod([x - twin, r, z], [x + twin, r, z], r * 0.12, r * 0.12, 6), { rep: 1 }); wheel(P, r, w, x - twin, z); wheel(P, r, w, x + twin, z); }
  else { P.add('iron', box(w * 1.6, r * 0.25, r * 0.4, x, r * 1.25, z), { rep: 1 }); for (const s of [-1, 1]) P.add('iron', box(0.03, r * 0.3, r * 0.3, x + s * w * 0.75, r * 1.05, z), { rep: 1 }); wheel(P, r, w, x, z); }
  const dw = (twin ? twin * 2 : w) + r * 0.5, dh = Math.min(yTop - r * 2.1, r * 1.6);                 // the open doors
  if (dh > 0.05) for (const s of [-1, 1]) P.add('skinDark', box(0.03, dh, r * 2.4, x + s * (dw / 2 + 0.05), yTop - dh / 2, z), { rep: 1 });
}
/** Closed gear doors: a flush panel with a dark seam and brass hinge knuckles, centred (x, y, z), w wide, l long. */
function doors(P, x, y, z, w, l) {
  P.add('skinDark', box(w, 0.04, l, x, y, z), { rep: 1 });
  P.add('iron', box(0.03, 0.05, l, x, y - 0.005, z), { rep: 1 });
  for (const s of [-1, 1]) for (const k of [-0.35, 0.35]) P.add('jbrass', box(0.05, 0.05, 0.08, x + s * w / 2, y, z + k * l), { rep: 1 });
}
/** The arresting hook: let down (gear) or stowed flush under the tail (flight). */
function tailHook(P, a, b, r) {
  P.add('iron', rod(a, b, r, r * 0.8, 6), { rep: 1 });
  const d = V(...b).sub(V(...a)).normalize();
  P.add('jbrass', new THREE.TorusGeometry(r * 2.2, r * 0.8, 5, 10, Math.PI).rotateY(Math.PI / 2).rotateX(Math.PI).rotateX(-Math.atan2(-d.y, d.z)).translate(b[0], b[1] + r * 1.5, b[2]), { rep: 1 });
}
/** A goggled airman's head (hero scale), facing -Z (or turned by yaw): leather helmet, brass goggles, red scarf. */
function airman(P, x, y, z, yaw = 0, s = 1) {
  const q = new THREE.Matrix4().makeRotationY(yaw).setPosition(x, y, z), add = (m, g, o) => P.add(m, g.applyMatrix4(q), o);
  add('patched', ball(0.14 * s, 0, 0, 0, 1, 1.08, 1.05), { rep: 0.5 });
  add('charcoal', ball(0.145 * s, 0, 0.02 * s, 0.01 * s, 1, 0.75, 1.05, 12).translate(0, 0.03 * s, 0), { rep: 0.5 });
  add('boneWhite', ball(0.1 * s, 0, -0.04 * s, -0.07 * s, 0.9, 0.8, 0.6, 10), { rep: 1 });               // face
  for (const sx of [-1, 1]) {
    add('jbrass', new THREE.TorusGeometry(0.045 * s, 0.014 * s, 5, 12).translate(sx * 0.05 * s, 0.025 * s, -0.125 * s), { rep: 1 });
    add('cyan', discZ(0.036 * s, sx * 0.05 * s, 0.025 * s, -0.12 * s, 10, 0.012), { uv: 'none' });
    add('patched', box(0.03 * s, 0.05 * s, 0.1 * s, sx * 0.135 * s, -0.01 * s, -0.02 * s), { rep: 1 });   // ear flaps
  }
  add('charcoal', rod([-0.13 * s, 0.03 * s, 0.02 * s], [0.13 * s, 0.03 * s, 0.02 * s], 0.012 * s, 0.012 * s, 4), { rep: 1 });
  add('fratRed', new THREE.TorusGeometry(0.1 * s, 0.04 * s, 6, 14).rotateX(Math.PI / 2).translate(0, -0.15 * s, 0.01 * s), { rep: 1 });
  add('fratRed', box(0.07 * s, 0.02 * s, 0.3 * s, 0.04 * s, -0.16 * s, 0.22 * s), { rep: 1 });
  add('patched', ball(0.22 * s, 0, -0.3 * s, 0.03 * s, 1.15, 0.6, 0.7), { rep: 0.5 });                   // shoulders
}
/** A glass bubble over (x, y, z): an upper half ellipsoid with brass frame bows and a brass spine rail. */
function bubble(P, x, y, z, rx, ry, rz, bows = [-0.55, 0, 0.55]) {
  P.add('canopy', new THREE.SphereGeometry(1, 22, 10, 0, TAU, 0, Math.PI / 2).scale(rx, ry, rz).translate(x, y, z), { uv: 'none' });
  for (const k of bows) { const q = Math.sqrt(1 - k * k); P.add('jbrass', new THREE.TorusGeometry(1, 0.025 / Math.max(rx, ry), 4, 18, Math.PI).scale(rx * q + 0.01, ry * q + 0.01, 1).translate(x, y, z + k * rz), { rep: 1 }); }
  const sp = []; for (let i = 0; i <= 12; i++) { const a = (i / 12) * Math.PI; sp.push([x, y + Math.sin(a) * (ry + 0.012), z + Math.cos(a) * (rz + 0.012)]); }
  P.add('jbrass', tube(sp, 0.025, 5, 18), { rep: 1 });
  P.add('jbrass', new THREE.TorusGeometry(1, 0.035 / Math.max(rx, rz), 4, 26).rotateX(Math.PI / 2).scale(rx + 0.015, 1, rz + 0.015).translate(x, y + 0.01, z), { rep: 1 });
}
/** The cockpit under a bubble: a dark well, a padded headrest, a glowing instrument panel and gunsight, the airman. */
function cockpit(P, sill, ck, rw) {
  P.add('dark', ball(rw, 0, sill, ck, 1, 0.12, 2.0, 14), { uv: 'none' });
  airman(P, 0, sill + 0.24, ck + 0.05);
  P.add('patched', box(0.24, 0.3, 0.1, 0, sill + 0.24, ck + 0.33), { rep: 1 });
  P.add('iron', box(rw * 1.4, 0.12, 0.08, 0, sill + 0.06, ck - 0.42), { rep: 1 });
  for (const sx of [-0.12, 0, 0.12]) P.add('glass', discZ(0.035, sx * rw * 2, sill + 0.08, ck - 0.465, 10), { uv: 'none' });   // dials
  P.add('jbrass', box(0.08, 0.1, 0.12, 0, sill + 0.17, ck - 0.48), { rep: 1 }); P.add('cyan', discZ(0.03, 0, sill + 0.22, ck - 0.545, 10), { uv: 'none' });
}

// ------------------------------------------------------------------ the two aircraft
const KINDS = {
  // The Brass Kestrel: a gunmetal fighter with brass jewellery, 8.0 long, 6.4 span, an inverted gull wing.
  kestrel(J, P, PG, PD, PO) {
    const cy = 1.55, z0 = -4.1, z1 = 3.2, nc = -3.35;
    const r = spline([[-4.1, 0], [-3.95, 0.07], [-3.5, 0.17], [-2.9, 0.29], [-2.2, 0.38], [-1.4, 0.44], [-0.4, 0.46], [0.6, 0.43], [1.6, 0.35], [2.5, 0.26], [3.2, 0.19]]);
    const R = (z) => [r(z), r(z) * 1.15 + 0.07 * sm(-0.4, 0.4, z) * (1 - sm(1.2, 2.6, z)), cy - 0.08 * (1 - sm(-4.1, -2.6, z))];
    fuselage(P, { R, z0: nc, z1, straps: [-2.75, -1.95, 0.0, 0.8, 1.6, 2.4], spine: [[-3.2, -2.05], [-0.3, 2.9]], spineW: 0.32, rivet: 0.02, rivetStep: 0.16 });
    // the nose: a brass cone to a point with a pitot needle, the Fraternity red ring behind it
    P.add('jbrass', loft(z0, nc + 0.01, R, { nu: 10, nv: 20 }));
    P.add('fratRed', loft(nc - 0.02, nc + 0.16, R, { nu: 1, nv: 22, off: 0.016 }));
    P.add('jbrass', loft(nc + 0.16, nc + 0.2, R, { nu: 1, nv: 22, off: 0.02 }));
    P.add('jsteel', rod([0, R(z0)[2], z0 + 0.02], [0, R(z0)[2], -4.55], 0.022, 0.008, 6), { rep: 1 });
    P.add('jbrass', rod([0, R(z0)[2], -4.2], [0, R(z0)[2], -4.28], 0.035, 0.035, 8), { rep: 1 });
    for (const s of [-1, 1]) filigree(P, R, -3.75, s * 1.3, 0.55, 0.07, s, 'checkBlack', 0.014);
    // the tail cone: copper, a heat ring, the tail light
    P.add('jcopper', rod([0, cy, z1 - 0.05], [0, cy, z1 + 0.2], 0.2, 0.13, 12), { rep: 1 });
    P.add('heat', discZ(0.1, 0, cy, z1 + 0.205, 12), { uv: 'none' });
    P.add('lamp', ball(0.05, 0, cy + 0.2, z1 + 0.12, 1, 1, 1, 8), { uv: 'none' });
    J.glow.push({ x: 0, y: cy + 0.2, z: z1 + 0.16, r: 0.6, c: 0xfff0d0 });
    // the cockpit and its bubble
    const ck = -1.25, sill = cy + R(ck)[1] - 0.05;
    cockpit(P, sill, ck, 0.27);
    bubble(P, 0, sill - 0.03, ck, 0.32, 0.48, 0.76);
    P.add('jbrass', rod([0, sill + 0.25, ck + 0.95], [0, sill + 0.6, ck + 1.25], 0.02, 0.012, 5), { rep: 1 });   // radio mast
    // the gatlings flanking the long nose, in brass blisters
    for (const s of [-1, 1]) {
      P.add('jbrass', ball(0.13, s * 0.29, cy - 0.12, -2.3, 1, 0.85, 3.4, 12), { rep: 1 });
      P.add('fratRed', new THREE.TorusGeometry(0.09, 0.02, 4, 14).translate(s * 0.3, cy - 0.12, -2.73), { rep: 1 });
      gatling(J, 1.15, 0.055, s * 0.3, cy - 0.12, -2.7);
    }
    // exposed copper exhaust pipes along the flanks: three a side in brass clamps, flaring into hot trumpets
    for (const s of [-1, 1]) for (const [k, a] of [[0, 1.42], [1, 1.66], [2, 1.9]]) {
      const pts = []; for (let i = 0; i <= 10; i++) { const z = lerp(-0.55 + k * 0.12, 2.15 - k * 0.12, i / 10); pts.push(fp(R, z, s * a, 0.06 + 0.05 * Math.sin(i / 10 * Math.PI) + i / 10 * 0.04)); }
      P.add('jcopper', tube(pts, 0.032, 6, 22), { rep: 1 });
      const e = V(...pts[10]), d = e.clone().sub(V(...pts[9])).normalize(), f = e.clone().addScaledVector(d, 0.16);
      P.add('jcopper', rod(e.toArray(), f.toArray(), 0.034, 0.07, 10, true), { rep: 1 });
      P.add('heat', ball(0.05, f.x, f.y, f.z, 1, 1, 1, 8), { uv: 'none' });
      for (const z of [0.1, 0.9, 1.6]) P.add('jbrass', rod(fp(R, z, s * a, 0.0), fp(R, z, s * a, 0.12), 0.045, 0.045, 6), { rep: 1 });
    }
    // the inverted gull wing: inner panels 27 degrees down to the knees, nacelles and short legs there, outer 12 up
    const k27 = Math.tan(0.47), k12 = Math.tan(0.21), kx = 1.35, tx = 3.2;
    const S = [{ x: 0.25, y: cy - 0.02, z: -1.15, c: 2.5, t: 0.2 }, { x: kx, y: cy - 0.02 - (kx - 0.25) * k27, z: -0.5, c: 1.9, t: 0.17 }];
    S.push({ x: tx, y: S[1].y + (tx - kx) * k12, z: 0.5, c: 0.85, t: 0.07 });
    const W = { S, hinge: 1.78, le: 0.035, rivet: 0.016, ribs: [0.8, 1.6, 2.2, 2.7], tipBand: 0.36, roundel: [2.38, 0.42, 0.26] };
    for (const s of [-1, 1]) {
      const w = wing(P, PO[s], s, W); J.hinges[s] = w.hinge; J.navs.push([w.light, s]);
      const ny = S[1].y - 0.12;
      nacelle(J, P, s * kx, ny, -1.3, 1.55, 0.29, { lip: 'fratRed' });
      leg(PG, s * kx, ny - 0.22, 0.25, 0.24, 0.12);
      doors(PD, s * kx, ny - 0.27, 0.25, 0.22, 0.75);
    }
    // the twin canted tail fins with the Fraternity stripe, the tailplanes
    for (const s of [-1, 1]) {
      const fx = s * 0.16, fy = cy + 0.14, cant = s * 0.36, q = new THREE.Matrix4().makeRotationZ(-cant).setPosition(fx, fy, 0);
      P.add('skin', fin([[1.75, 0], [3.12, 0], [3.34, 1.2], [2.76, 1.2]], 0.06, fx, fy, cant), { rep: 1 });
      P.add('fratRed', fin([[2.06, 0.5], [3.22, 0.5], [3.27, 0.75], [2.28, 0.75]], 0.075, fx, fy, cant), { rep: 1 });
      for (const [a, b] of [[0.44, 0.5], [0.75, 0.81]]) P.add('jbrass', fin([[1.75 + a * 0.84, a], [3.12 + a * 0.18, a], [3.12 + b * 0.18, b], [1.75 + b * 0.84, b]], 0.08, fx, fy, cant), { rep: 1 });
      P.add('jbrass', rod(V(0, 0.02, 1.76).applyMatrix4(q).toArray(), V(0, 1.21, 2.77).applyMatrix4(q).toArray(), 0.03, 0.03, 5), { rep: 1 });
      P.add('jbrass', ball(0.055, ...V(0, 1.2, 3.05).applyMatrix4(q).toArray(), 1, 1, 6, 8), { rep: 1 });
      const tp = s > 0 ? [[0.12, 2.25], [1.25, 2.85], [1.25, 3.22], [0.12, 3.2]] : [[-0.12, 2.25], [-0.12, 3.2], [-1.25, 3.22], [-1.25, 2.85]];
      P.add('skin', plate(tp, 0.05, cy - 0.06), { rep: 1 });
      P.add('fratRed', plate(s > 0 ? [[0.95, 2.69], [1.26, 2.85], [1.26, 3.23], [0.95, 3.22]] : [[-0.95, 2.69], [-0.95, 3.22], [-1.26, 3.23], [-1.26, 2.85]], 0.06, cy - 0.055), { rep: 1 });
      P.add('jbrass', rod([s * 0.12, cy - 0.04, 2.25], [s * 1.26, cy - 0.04, 2.85], 0.02, 0.02, 5), { rep: 1 });
    }
    // the gear: the nose leg and its doors, the hook let down or stowed
    leg(PG, 0, cy - R(-2.55)[1] + 0.02, -2.55, 0.2, 0.09);
    doors(PD, 0, cy - R(-2.55)[1] - 0.01, -2.55, 0.2, 0.6);
    tailHook(PG, [0, cy - 0.17, 2.55], [0, 0.55, 3.35], 0.035);
    tailHook(PD, [0, cy - 0.2, 2.5], [0, cy - 0.22, 3.15], 0.035);
    J.fold = Math.PI * 0.53;
    J.info = { length: 8.0, beam: 6.4, cockpit: [0, sill, ck] };
  },

  // The Thunderhawk: a long-winged gunmetal torpedo bomber, 12.0 long, 11.5 span, three turbines, crew of four.
  thunderhawk(J, P, PG, PD, PO) {
    const cy0 = 2.05, z0 = -5.3, zg = -4.1, z1 = 4.75;
    const r = spline([[-5.3, 0], [-5.2, 0.24], [-4.85, 0.6], [-4.1, 0.84], [-3.0, 0.95], [-1.3, 0.97], [0.4, 0.92], [1.8, 0.78], [3.0, 0.6], [4.0, 0.46], [4.75, 0.38]]);
    const cyz = (z) => cy0 - 0.1 * (1 - sm(-5.3, -3.6, z)) + 0.32 * sm(0.8, 4.75, z);           // the belly sweeps up aft
    const R = (z) => [r(z), r(z) * 1.1, cyz(z)];
    fuselage(P, { R, z0: zg, z1, straps: [-3.3, -2.5, -0.9, -0.1, 0.7, 1.5, 2.3, 3.1, 3.9], spine: [[-2.25, -1.25], [0.95, 4.5]], spineW: 0.3, rivet: 0.026, rivetStep: 0.2 });
    // the glazed nose: faceted glass in a brass cage, the bombardier and his sight; a red nose band behind it
    P.add('canopy', loft(z0, zg, R, { nu: 4, nv: 12 }), { uv: 'none' });
    for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU, pts = []; for (let k = 0; k <= 5; k++) pts.push(fp(R, lerp(z0 + 0.04, zg, k / 5), a, 0.012)); P.add('jbrass', tube(pts, 0.022, 4, 10), { rep: 1 }); }
    for (const z of [-4.75, -4.35]) P.add('jbrass', loft(z - 0.03, z + 0.03, R, { nu: 1, nv: 22, off: 0.016 }));
    P.add('fratRed', loft(zg - 0.02, zg + 0.42, R, { nu: 2, nv: 26, off: 0.018 }));
    for (const z of [zg - 0.04, zg + 0.44]) P.add('jbrass', loft(z - 0.025, z + 0.025, R, { nu: 1, nv: 26, off: 0.024 }));
    P.add('jbrass', ball(0.12, 0, R(z0)[2], z0 + 0.02, 1, 1, 0.6, 12), { rep: 1 });
    P.add('dark', discZ(0.84, 0, cyz(zg) - 0.0, zg + 0.05, 24));
    P.add('dark', box(1.1, 0.04, 0.9, 0, cy0 - 0.55, -4.45), { uv: 'none' });
    airman(P, 0, cy0 - 0.2, -4.4);
    P.add('jbrass', box(0.16, 0.22, 0.2, 0, cy0 - 0.42, -4.85), { rep: 1 }); P.add('cyan', discZ(0.05, 0, cy0 - 0.38, -4.96, 10), { uv: 'none' });
    gatling(J, 0.9, 0.065, 0, cy0 - 0.78, -4.55);                                                         // chin gun
    P.add('skinDark', ball(0.2, 0, cy0 - 0.78, -4.45, 1, 0.8, 1.2, 12), { rep: 1 });
    // the pilot's stepped cockpit and the navigator's astrodome
    const ck = -2.95, sill = cyz(ck) + R(ck)[1] - 0.08;
    cockpit(P, sill, ck, 0.4);
    bubble(P, 0, sill - 0.04, ck, 0.48, 0.55, 0.95);
    const az = 0.3, ay = cyz(az) + R(az)[1] - 0.04;
    P.add('jbrass', new THREE.CylinderGeometry(0.4, 0.44, 0.1, 22).translate(0, ay, az), { rep: 1 });
    P.add('dark', new THREE.CylinderGeometry(0.34, 0.34, 0.02, 18).translate(0, ay + 0.05, az), { uv: 'none' });
    P.add('jbrass', box(0.16, 0.14, 0.16, 0, ay + 0.12, az), { rep: 1 }); P.add('glass', discZ(0.05, 0, ay + 0.14, az - 0.085, 10), { uv: 'none' });   // the sextant
    bubble(P, 0, ay + 0.04, az, 0.36, 0.32, 0.36, [0]);
    // portholes along the flanks, amber-lit; steam pipes; filigree
    for (const s of [-1, 1]) {
      for (let i = 0; i < 6; i++) {
        const z = -2.1 + i * 0.75, p = fp(R, z, s * 1.45, 0), n = V(p[0], p[1] - cyz(z), 0).normalize();
        const q = new THREE.Matrix4().lookAt(n, V(0, 0, 0), V(0, 1, 0)).setPosition(...p);
        P.add('jbrass', new THREE.TorusGeometry(0.14, 0.035, 5, 16).applyMatrix4(q), { rep: 1 });
        P.add('glass', new THREE.CircleGeometry(0.12, 14).applyMatrix4(q), { uv: 'none' });
        for (let k = 0; k < 6; k++) { const a = (k / 6) * TAU; P.add('jbrass', ball(0.018, Math.cos(a) * 0.14, Math.sin(a) * 0.14, 0.03, 1, 1, 1, 4).applyMatrix4(q), { rep: 1 }); }
      }
      const pts = []; for (let k = 0; k <= 10; k++) pts.push(fp(R, lerp(-3.6, 3.4, k / 10), s * 1.9, 0.06));
      P.add('jcopper', tube(pts, 0.038, 6, 20), { rep: 1 });
      filigree(P, R, -3.6, s * 1.15, 1.0, 0.15, s);
      filigree(P, R, 2.7, s * 1.0, 1.0, 0.13, s);
    }
    // the long wings: tapered, a gentle dihedral, two nacelles, folding just outboard of them
    const S = [{ x: 0.75, y: cy0 - 0.12, z: -1.75, c: 3.3, t: 0.36 }, { x: 2.15, y: cy0 - 0.02, z: -1.5, c: 2.85, t: 0.31 }, { x: 5.75, y: cy0 + 0.42, z: -0.3, c: 1.1, t: 0.1 }];
    const W = { S, hinge: 2.78, le: 0.05, rivet: 0.022, ribs: [1.45, 3.4, 4.1, 4.8], tipBand: 0.5, roundel: [3.85, 0.42, 0.4] };
    for (const s of [-1, 1]) {
      const w = wing(P, PO[s], s, W); J.hinges[s] = w.hinge; J.navs.push([w.light, s]);
      const st = wingAt(S, 2.15), ny = cy0 - 0.55;
      nacelle(J, P, s * 2.15, ny, -2.65, 1.6, 0.48);
      P.add('skin', box(0.2, st.y - ny - 0.3, 2.0, s * 2.15, (st.y + ny + 0.3) / 2, -0.4), { rep: 1 });
      P.add('jbrass', box(0.21, 0.04, 2.02, s * 2.15, st.y - 0.12, -0.4), { rep: 1 });
      leg(PG, s * 2.15, ny - 0.33, -0.25, 0.4, 0.2, 0.24);
      doors(PD, s * 2.15, ny - 0.4, -0.25, 0.36, 1.4);
      for (const k of [0, 1]) P.add('jcopper', rod([s * 2.15, ny + 0.34 + k * 0.07, -1.2], [s * 0.85, cy0 - 0.35 + k * 0.07, -1.5], 0.03, 0.03, 5), { rep: 1 });
    }
    // the tail engine on a pylon over the tapering rear fuselage
    const ty = cy0 + 1.4;
    nacelle(J, P, 0, ty, 2.25, 4.95, 0.42);
    P.add('skin', box(0.22, 0.55, 1.7, 0, ty - 0.62, 3.45), { rep: 1 });
    P.add('jbrass', box(0.24, 0.04, 1.72, 0, ty - 0.4, 3.45), { rep: 1 });
    // the broad twin tail: a tailplane with endplate fins, black-and-red checkered, brass caps
    const tyy = cyz(4.2) + 0.05;
    P.add('skin', plate([[-0.3, 3.35], [0.3, 3.35], [2.6, 3.65], [2.6, 4.75], [-2.6, 4.75], [-2.6, 3.65]], 0.08, tyy), { rep: 1 });
    for (const s of [-1, 1]) {
      P.add('jbrass', rod([s * 2.6, tyy + 0.04, 3.63], [s * 0.3, tyy + 0.04, 3.33], 0.035, 0.035, 5), { rep: 1 });
      const fx = s * 2.64, fy = tyy;
      P.add('skin', fin([[3.4, -0.65], [4.75, -0.65], [5.05, 1.5], [4.3, 1.75], [3.75, 1.25]], 0.09, fx, fy, s * 0.04), { rep: 1 });
      // the checker: four rows of five squares on each face band
      for (let row = 0; row < 3; row++) for (let col = 0; col < 5; col++) {
        const y0 = 0.15 + row * 0.24, y1 = y0 + 0.24, za = 3.62 + col * 0.24 + y0 * 0.1, zb = za + 0.24;
        P.add((row + col) % 2 ? 'checkBlack' : 'fratRed', fin([[za, y0], [zb, y0], [zb + 0.024, y1], [za + 0.024, y1]], 0.11, fx, fy, s * 0.04), { rep: 1 });
      }
      for (const yy of [0.12, 0.87]) P.add('jbrass', fin([[3.6 + yy * 0.1, yy], [4.85 + yy * 0.1, yy], [4.86 + yy * 0.1, yy + 0.04], [3.61 + yy * 0.1, yy + 0.04]], 0.12, fx, fy, s * 0.04), { rep: 1 });
      P.add('jbrass', ball(0.08, fx + s * 0.07, fy + 1.62, 4.65, 1, 1, 6, 10), { rep: 1 });
      P.add('jbrass', tube([[fx, fy + 1.25, 3.76], [fx, fy + 1.55, 4.0], [fx, fy + 1.76, 4.3]], 0.035, 5, 8), { rep: 1 });
      P.add('fratRed', plate(s > 0 ? [[1.85, 3.9], [2.55, 3.9], [2.55, 4.72], [1.85, 4.72]] : [[-2.55, 3.9], [-1.85, 3.9], [-1.85, 4.72], [-2.55, 4.72]], 0.09, tyy), { rep: 1 });
    }
    // the tail gunner's glazed stinger between the fins: a brass-caged glass cone, twin guns sweeping aft
    const sz0 = z1 - 0.05, sz1 = 5.75, SR = (z) => { const u = (z - sz0) / (sz1 - sz0); return [0.38 * Math.sqrt(Math.max(0, 1 - u * u * 0.9)), 0.42 * Math.sqrt(Math.max(0, 1 - u * u * 0.9)), cyz(z1)]; };
    P.add('canopy', loft(sz0, sz1, SR, { nu: 5, nv: 12 }), { uv: 'none' });
    for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU, pts = []; for (let k = 0; k <= 5; k++) pts.push(fp(SR, lerp(sz0, sz1 - 0.03, k / 5), a, 0.01)); P.add('jbrass', tube(pts, 0.018, 4, 10), { rep: 1 }); }
    P.add('jbrass', loft(sz0 - 0.03, sz0 + 0.04, SR, { nu: 1, nv: 18, off: 0.02 }));
    P.add('dark', discZ(0.36, 0, cyz(z1), sz0 - 0.02, 18));
    airman(P, 0, cyz(z1) + 0.02, 5.1, Math.PI, 0.9);
    const TP = new Parts(J.M);
    TP.add('iron', ball(0.13, 0, 0, 0, 1, 1, 1, 10), { rep: 1 });
    for (const s of [-1, 1]) {
      TP.add('gunmetal', rod([s * 0.12, 0, -0.1], [s * 0.12, 0, 0.95], 0.03, 0.026, 6), { rep: 1 });
      TP.add('iron', rod([s * 0.12, 0, 0.05], [s * 0.12, 0, 0.45], 0.055, 0.055, 8), { rep: 1 });
      TP.add('jbrass', rod([s * 0.12, 0, 0.85], [s * 0.12, 0, 0.98], 0.045, 0.04, 8), { rep: 1 });
      TP.add('jbrass', rod([s * 0.25, -0.05, -0.15], [s * 0.25, -0.05, 0.05], 0.08, 0.08, 12), { rep: 1 });   // ammo drums
    }
    const tur = TP.build('stinger'); tur.position.set(0, cyz(z1) - 0.08, 5.55); J.root.add(tur); J.turret = tur;
    P.add('lamp', ball(0.06, 0, ty + 0.5, 4.4, 1, 1, 1, 8), { uv: 'none' });
    J.glow.push({ x: 0, y: ty + 0.55, z: 4.4, r: 0.7, c: 0xfff0d0 });
    // the torpedo, semi-recessed in a cradle along the starboard flank under the wing root: its copper warhead, red
    // band and brass body run out ahead of the wing, where the game camera sees them
    const ta = -4.3, tb = -1.3, tm = (ta + tb) / 2, tyy0 = cy0 - 0.32, txx = r(tm) * Math.sqrt(1 - (0.32 / (r(tm) * 1.1)) ** 2) + 0.2;
    const TR = spline([[ta, 0], [ta + 0.1, 0.15], [ta + 0.4, 0.25], [ta + 0.75, 0.27], [tb - 0.75, 0.27], [tb - 0.2, 0.18], [tb, 0.09]]);
    const TRR = (z) => [TR(z), TR(z), 0, 0], TG = new Parts(J.M);
    TG.add('jcopper', loft(ta, ta + 0.72, TRR, { nu: 8, nv: 16 }).translate(0, 0, -tm));
    TG.add('jbrass', loft(ta + 0.72, tb - 0.55, TRR, { nu: 8, nv: 16 }).translate(0, 0, -tm));
    TG.add('iron', loft(tb - 0.55, tb, TRR, { nu: 4, nv: 16 }).translate(0, 0, -tm));
    TG.add('fratRed', loft(ta + 0.72, ta + 1.0, TRR, { nu: 1, nv: 16, off: 0.012 }).translate(0, 0, -tm));
    for (const z of [ta + 0.72, ta + 1.02, ta + 1.9]) TG.add('iron', loft(z - 0.025, z + 0.025, TRR, { nu: 1, nv: 16, off: 0.016 }).translate(0, 0, -tm));
    TG.add('jbrass', ball(0.045, 0, 0, ta - 0.02 - tm, 1, 1, 1, 8), { rep: 1 });
    for (let i = 0; i < 4; i++) { const a = (i / 4) * TAU + Math.PI / 4; TG.add('iron', box(0.02, 0.3, 0.3, 0, 0.17, 0).rotateZ(a).translate(0, 0, tb - 0.25 - tm), { rep: 1 }); }
    const bz = tb - 0.25 - tm;
    TG.add('iron', box(0.5, 0.025, 0.28, 0, 0.23, bz), { rep: 1 }); TG.add('iron', box(0.5, 0.025, 0.28, 0, -0.23, bz), { rep: 1 });
    TG.add('iron', box(0.025, 0.48, 0.28, 0.24, 0, bz), { rep: 1 }); TG.add('iron', box(0.025, 0.48, 0.28, -0.24, 0, bz), { rep: 1 });
    for (const k of [0, 1]) for (let i = 0; i < 3; i++) TG.add('jbrass', box(0.03, 0.24, 0.02, 0, 0, 0).rotateZ((i / 3) * Math.PI + k * 0.5).translate(0, 0, tb + 0.04 + k * 0.08 - tm), { rep: 1 });
    const tg = TG.build('torpedo');
    for (const s of [1, -1]) {                                                    // a twin on each flank, starboard drops first
      const torp = s > 0 ? tg : tg.clone(); torp.position.set(s * txx, tyy0, tm); torp.userData.home = torp.position.clone(); J.root.add(torp); J.torpedoes.push(torp);
      for (const z of [ta + 1.35, tm + 0.55]) {                                                          // the cradle straps
        P.add('iron', new THREE.TorusGeometry(0.3, 0.03, 4, 18, Math.PI * 1.1).rotateZ(-Math.PI * 0.55).rotateY(s > 0 ? 0 : Math.PI).translate(s * txx, tyy0, z), { rep: 1 });
        for (const dy of [0.2, -0.2]) P.add('jbrass', box(0.22, 0.08, 0.12, s * (txx - 0.24), tyy0 + dy, z), { rep: 1 });
      }
      P.add('dark', loft(ta + 0.3, tb, (z) => [0.06, 0.24, tyy0, s * (txx - 0.29)], { nu: 6, nv: 8 }));    // the recess behind it
    }
    // the gear: the nose leg and its doors, the hook let down or stowed
    leg(PG, 0, cyz(-3.75) - R(-3.75)[1] + 0.03, -3.75, 0.3, 0.14);
    doors(PD, 0, cyz(-3.75) - R(-3.75)[1] - 0.01, -3.75, 0.28, 0.8);
    tailHook(PG, [0, cyz(4.1) - R(4.1)[1] + 0.02, 4.1], [0, 1.05, 4.85], 0.05);
    tailHook(PD, [0, cyz(3.9) - R(3.9)[1] - 0.02, 3.9], [0, cyz(4.5) - R(4.5)[1] - 0.04, 4.5], 0.05);
    J.fold = Math.PI * 0.57;
    J.info = { length: 12.0, beam: 11.5, cockpit: [0, sill, ck] };
  },
};

/** The Brass Fraternity's jets: buildJet(M, kind, { folded, gear }). See the header. */
export function buildJet(M, kind = 'kestrel', { folded = false, gear = true } = {}) {
  if (!KINDS[kind]) kind = 'kestrel';
  const MM = Object.assign(Object.create(M), jetMats(M));
  MM.burn = M.jetGlow.clone();                                                   // per jet: burners pulse, go dark parked
  MM.heat = M.ember.clone();
  MM.fratRed = M.stripeRed.clone(); MM.fratRed.emissive = new THREE.Color(0x8a1008); MM.fratRed.emissiveIntensity = 0.35;   // reads at night
  MM.fratRed.metalness = 0.25; MM.fratRed.roughness = 0.5;
  MM.canopy = M.canopy.clone(); MM.canopy.opacity = 0.42; MM.canopy.emissiveIntensity = 0.25; MM.canopy.depthWrite = false;   // see the airmen
  const root = new THREE.Group(); root.name = kind;
  const J = { M: MM, root, fans: [], guns: [], fx: [], trails: [], glow: [], navs: [], hinges: {}, turret: null, torpedoes: [], fold: Math.PI * 0.55 };
  const P = new Parts(MM), PG = new Parts(MM), PD = new Parts(MM), PO = { 1: new Parts(MM), [-1]: new Parts(MM) };
  KINDS[kind](J, P, PG, PD, PO);
  root.add(P.build(`${kind}:body`));
  const gearG = PG.build(`${kind}:gear`), doorG = PD.build(`${kind}:doors`); root.add(gearG, doorG);
  const outer = {};
  for (const s of [-1, 1]) { const g = new THREE.Group(); g.add(PO[s].build(`${kind}:wing${s > 0 ? 'R' : 'L'}`)); g.position.copy(J.hinges[s]); root.add(g); outer[s] = g; }
  const st = { fold: 0, thr: 1, firing: true, dropped: false };
  const setFold = (k) => { st.fold = k; for (const s of [-1, 1]) outer[s].rotation.z = s * J.fold * k; };
  const setThrottle = (k) => {
    st.thr = k; const on = k > 0.05;
    for (const o of J.fx) o.visible = on;
    MM.burn.emissiveIntensity = on ? 2.2 : 0; MM.burn.color.set(on ? 0xbfe8ff : 0x1c2026);
    MM.heat.emissiveIntensity = on ? 1.8 : 0; MM.heat.color.set(on ? 0xff7a4a : 0x2a1c18);
  };
  const setGear = (down) => { gearG.visible = !!down; doorG.visible = !down; };
  setFold(folded ? 1 : 0); setThrottle(folded ? 0 : 1); setGear(gear);
  // halos the viewer adds: nav lights where the wingtips are, the tail light (the burner halos are the jet's own)
  const glow = J.glow.slice();
  for (const [p, s] of J.navs) {
    const h = J.hinges[s], q = p.clone().sub(h).applyAxisAngle(V(0, 0, 1), s * J.fold * (folded ? 1 : 0)).add(h);
    glow.push({ x: q.x + s * 0.05, y: q.y, z: q.z, r: 0.7, c: s > 0 ? 0x40ffa0 : 0xff3020 });
  }
  let n = 0; root.traverse((o) => { if (o.isMesh && o.geometry.attributes.position) n += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; });
  const info = { ...J.info, waterline: 0, hl: J.info.length / 2, hb: J.info.beam / 2, glow, crew: [], tris: Math.round(n), folded };
  const anim = (t) => {
    for (const f of J.fans) f.rotation.z = t * (1.5 + st.thr * 34);
    for (const g of J.guns) g.rotation.z = st.firing ? t * 22 : 0;
    if (st.thr > 0.05) {
      for (const o of J.fx) o.userData.update?.(t);
      for (const tr of J.trails) tr(t);
      for (const o of J.fx) if (o.userData.pulse) o.material.opacity = 0.75 + 0.25 * Math.sin(t * 37);
      MM.burn.emissiveIntensity = 2.2 + 0.8 * Math.sin(t * 31) * Math.sin(t * 13);
    }
    if (J.turret) J.turret.rotation.y = Math.sin(t * 0.6) * 0.55;
  };
  anim(0);
  /** Let the torpedo go: returns its world pose { position, quaternion, object } (the object is detached from the jet;
   *  a scene adds it to the world at that pose and animates the fall), or null if it has gone already. */
  const drop = () => {
    const o = J.torpedoes.find((t) => t.parent === root);
    if (!o) return null;
    o.updateWorldMatrix(true, false);
    const position = V(), quaternion = new THREE.Quaternion(), scale = V(); o.matrixWorld.decompose(position, quaternion, scale);
    root.remove(o);
    return { position, quaternion, object: o, length: 3.0, radius: 0.27 };
  };
  const rearm = () => { for (const t of J.torpedoes) if (t.parent !== root) { t.position.copy(t.userData.home); t.quaternion.identity(); t.scale.setScalar(1); root.add(t); } };
  return { root, anim, info, setFold, setThrottle, setGear, fire: (on) => { st.firing = !!on; }, drop, rearm };
}
