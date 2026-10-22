// The Gunner's war machines in three.js, from the airships' Material Texture Pack (assets/source/airship/, via
// airshipMaterials): his four turrets (Gun, Flame, Rocket and Cryo Turret summons) and the Bombing Run biplane
// (src/game/sigs/gunner.js). Units are tiles like the airships (1 unit = one tile, heights too: a 60 px hero is
// 1.53 tall). Forward is +X, up +Y, right +Z. Each turret is a fixed stand and a head that turns about the stand's
// pivot (head origin = the pivot), so the bake can draw the stand once and the head at every yaw.
// buildTurret(M, kind) -> { stand, head, frame(i), frames, info: { pivot, muzzle: [forward, up], scale } }
// buildBiplane(M) -> { root, frame(i), frames, info }. Viewer and bake: tools/gunner3d.html.
import * as THREE from 'three';
import { Parts, box, rod, surf, tris } from './airship3d.js';

const TAU = Math.PI * 2;
export const TURRET_KINDS = ['turret', 'flameturret', 'rocketturret', 'cryoturret'];

/** The extra paints the pack has no texture for (warheads, glass, glows). */
function extras(M) {
  if (M.warhead) return;
  M.warhead = new THREE.MeshStandardMaterial({ color: 0xb02818, roughness: 0.55, metalness: 0.25 });
  M.bore = new THREE.MeshStandardMaterial({ color: 0x07060a, roughness: 1 });
  M.glassBlue = new THREE.MeshStandardMaterial({ color: 0x9fdcff, emissive: 0x3aaef0, emissiveIntensity: 1.3, roughness: 0.2, transparent: true, opacity: 0.9 });
  M.ice = new THREE.MeshStandardMaterial({ color: 0xd8f6ff, emissive: 0x58d0ff, emissiveIntensity: 1.5, roughness: 0.15, flatShading: true });
  M.lens = new THREE.MeshStandardMaterial({ color: 0xff6a50, emissive: 0xff2010, emissiveIntensity: 1.8, roughness: 0.3 });
  M.flame = new THREE.MeshStandardMaterial({ color: 0xffd080, emissive: 0xff7a18, emissiveIntensity: 2.4, roughness: 0.6 });
  M.windscreen = new THREE.MeshStandardMaterial({ color: 0xc8e4ff, roughness: 0.1, metalness: 0.3, transparent: true, opacity: 0.45 });
  M.redPaint = new THREE.MeshStandardMaterial({ map: M.canvas.map, color: 0xe04a30, roughness: 0.8 });   // doped crimson canvas
  M.propDisc = new THREE.MeshBasicMaterial({ color: 0xf0e6d0, transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false });
}

// ------------------------------------------------------------------ small shapes
const cyl = (r, h, seg, x, y, z) => new THREE.CylinderGeometry(r, r, h, seg).translate(x, y, z);
/** A ring (torus) round the X axis at x. */
const ringX = (x, y, z, R, r, seg = 16) => new THREE.TorusGeometry(R, r, 6, seg).rotateY(Math.PI / 2).translate(x, y, z);
const ball = (r, x, y, z, sx = 1, sy = 1, sz = 1, seg = 12) => new THREE.SphereGeometry(r, seg, Math.max(6, seg >> 1)).scale(sx, sy, sz).translate(x, y, z);
/** A box turned about Y by a, centred at (x, y, z). */
const boxY = (w, h, d, x, y, z, a) => new THREE.BoxGeometry(w, h, d).rotateY(a).translate(x, y, z);
/** n legs from the hub (y0) out to feet at radius R, starting at angle a0. */
function legs(P, mat, feetMat, n, R, y0, a0 = 0, r = 0.032) {
  const feet = [];
  for (let i = 0; i < n; i++) {
    const a = a0 + (i / n) * TAU, fx = Math.cos(a) * R, fz = Math.sin(a) * R;
    P.add(mat, rod([0, y0, 0], [fx, 0.04, fz], r * 1.15, r, 6), { rep: 1 });
    P.add(feetMat, cyl(0.06, 0.035, 10, fx, 0.018, fz), { rep: 1 });
    feet.push([fx, fz]);
  }
  // a brace round the legs half way down
  for (let i = 0; i < n; i++) {
    const a = feet[i], b = feet[(i + 1) % n], k = 0.55;
    P.add(mat, rod([a[0] * k, 0.04 + (y0 - 0.04) * (1 - k), a[1] * k], [b[0] * k, 0.04 + (y0 - 0.04) * (1 - k), b[1] * k], 0.014, 0.014, 5), { rep: 1 });
  }
}
/** The turntable the head sits on: a disc and a gold race. */
function turntable(P, mat, rim, r = 0.17) {
  P.add(mat, cyl(r, 0.06, 18, 0, 0.03, 0), { rep: 1 });
  P.add(rim, new THREE.TorusGeometry(r, 0.016, 6, 22).rotateX(Math.PI / 2).translate(0, 0.06, 0), { rep: 1 });
}

// ------------------------------------------------------------------ the turrets
const TURRETS = {
  // Gun Turret: a black iron tripod with an ammo crate; a six-barrel rotary gun behind a curved riveted shield,
  // a brass ammo drum, a scope with a red lens and a gold finial.
  turret(M) {
    const pivot = 0.56, S = new Parts(M), H = new Parts(M), B = new Parts(M);
    legs(S, 'iron', 'brass', 3, 0.42, 0.44, Math.PI / 6);
    S.add('gunmetal', rod([0, 0.18, 0], [0, pivot, 0], 0.075, 0.065, 10), { rep: 1 });
    S.add('brass', cyl(0.11, 0.06, 14, 0, pivot - 0.04, 0), { rep: 1 });
    S.add('hull', box(0.26, 0.15, 0.18, -0.26, 0.075, 0.2, 0.5), { rep: 0.8 });                 // ammo crate
    S.add('iron', box(0.27, 0.025, 0.19, -0.26, 0.14, 0.2, 0.5), { rep: 1 });
    S.add('gold', box(0.04, 0.03, 0.05, -0.2, 0.16, 0.16, 0.5), { rep: 1 });
    turntable(H, 'gunmetal', 'goldHammer');
    for (const z of [-0.12, 0.12]) H.add('iron', box(0.3, 0.2, 0.04, -0.02, 0.15, z), { rep: 1 });   // yoke cheeks
    H.add('iron', box(0.38, 0.15, 0.17, -0.02, 0.17, 0), { rep: 1 });                                 // receiver
    H.add('gunmetal', box(0.3, 0.03, 0.15, -0.04, 0.26, 0), { rep: 1 });
    H.add('brass', rod([-0.06, 0.18, -0.12], [-0.06, 0.18, -0.27], 0.1, 0.1, 16), { rep: 0.7 });      // ammo drum
    H.add('goldHammer', rod([-0.06, 0.18, -0.265], [-0.06, 0.18, -0.285], 0.07, 0.07, 14), { rep: 1 });
    for (const y of [0.13, 0.23]) H.add('brass', rod([-0.2, y, 0.05], [-0.34, y - 0.05, 0.05], 0.012, 0.012, 5), { rep: 1 }); // grips
    // the shield: five riveted plates on an arc, a slot for the barrels, gold along the top
    for (let i = -2; i <= 2; i++) {
      const a = i * 0.36, x = Math.cos(a) * 0.25, z = Math.sin(a) * 0.25, top = 0.36 - Math.abs(i) * 0.04;
      if (i === 0) { H.add('flaked', boxY(0.035, 0.07, 0.11, x, 0.075, z, -a), { rep: 0.8 }); H.add('flaked', boxY(0.035, top - 0.235, 0.11, x, (top + 0.235) / 2, z, -a), { rep: 0.8 }); }
      else H.add('flaked', boxY(0.035, top - 0.04, 0.115, x, (top + 0.04) / 2, z, -a), { rep: 0.8 });
      H.add('goldHammer', boxY(0.045, 0.022, 0.12, x, top, z, -a), { rep: 1 });
    }
    H.add('steel', box(0.16, 0.05, 0.05, 0.02, 0.32, 0.1), { rep: 1 });                                // scope
    H.add('lens', cyl(0.022, 0.01, 8, 0, 0, 0).rotateZ(Math.PI / 2).translate(0.105, 0.32, 0.1), { uv: 'none' });
    H.add('gold', rod([-0.08, 0.27, 0], [-0.08, 0.33, 0], 0.025, 0.002, 8), { rep: 1 });               // finial
    // the barrel cluster, turning about its own axis (y = 0.17)
    const ax = 0.17;
    for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU, y = Math.cos(a) * 0.045, z = Math.sin(a) * 0.045; B.add('gunmetal', rod([0.12, y, z], [0.74, y, z], 0.017, 0.017, 6), { rep: 1 }); }
    B.add('gunmetal', rod([0.1, 0, 0], [0.74, 0, 0], 0.022, 0.022, 6), { rep: 1 });
    for (const x of [0.42, 0.66]) B.add('brass', rod([x - 0.02, 0, 0], [x + 0.02, 0, 0], 0.072, 0.072, 12), { rep: 1 });
    B.add('steel', rod([0.7, 0, 0], [0.76, 0, 0], 0.07, 0.068, 12), { rep: 1 });
    for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; B.add('bore', cyl(0.012, 0.01, 6, 0, 0, 0).rotateZ(Math.PI / 2).translate(0.765, Math.cos(a) * 0.045, Math.sin(a) * 0.045), { uv: 'none' }); }
    const stand = S.build('stand'), head = H.build('head'), spin = B.build('barrels');
    spin.position.set(0, ax, 0); head.add(spin);
    return { stand, head, pivot, muzzle: [0.78, ax], frames: 3, frame(i) { spin.rotation.x = (i / 3) * (TAU / 6); } };
  },

  // Flame Turret: a squat iron drum with two copper fuel tanks on cradles; a bronze housing with a fuel ball on its
  // back, a finned barrel and a brass bell nozzle with gold fangs and a pilot light (lit when it breathes fire).
  flameturret(M) {
    const pivot = 0.5, S = new Parts(M), H = new Parts(M), lit = new Parts(M);
    S.add('iron', new THREE.CylinderGeometry(0.27, 0.32, 0.14, 12).translate(0, 0.07, 0), { rep: 1 });
    S.add('brass', new THREE.TorusGeometry(0.3, 0.018, 6, 24).rotateX(Math.PI / 2).translate(0, 0.1, 0), { rep: 1 });
    S.add('gunmetal', rod([0, 0.14, 0], [0, pivot, 0], 0.085, 0.07, 10), { rep: 1 });
    S.add('bronze', cyl(0.1, 0.05, 14, 0, pivot - 0.035, 0), { rep: 1 });
    for (const z of [-0.15, 0.15]) {
      S.add('copper', rod([-0.2, 0.25, z - 0.13], [-0.2, 0.25, z + 0.13], 0.085, 0.085, 14), { rep: 0.7 });
      for (const zz of [z - 0.14, z + 0.14]) S.add('copper', ball(0.085, -0.2, 0.25, zz, 1, 1, 0.45), { rep: 0.7 });
      S.add('iron', ringX(0, 0, 0, 0.09, 0.012).rotateY(Math.PI / 2).translate(-0.2, 0.25, z), { rep: 1 });
      S.add('bore', rod([-0.12, 0.27, z * 0.6], [-0.02, 0.4, 0], 0.012, 0.012, 5), { uv: 'none' });      // fuel hoses
    }
    S.add('iron', box(0.08, 0.12, 0.42, -0.2, 0.17, 0), { rep: 1 });                                   // cradle
    turntable(H, 'bronze', 'goldHammer', 0.15);
    H.add('bronze', ball(0.16, 0.02, 0.16, 0, 1.15, 0.85, 1), { rep: 0.8 });                          // housing
    H.add('copper', ball(0.12, -0.17, 0.2, 0, 1, 1, 1, 14), { rep: 0.7 });                            // fuel ball
    H.add('goldHammer', new THREE.TorusGeometry(0.12, 0.014, 6, 20).translate(-0.17, 0.2, 0), { rep: 1 });
    H.add('gunmetal', rod([0.1, 0.15, 0], [0.56, 0.15, 0], 0.045, 0.04, 10), { rep: 1 });
    for (let i = 0; i < 6; i++) H.add('iron', rod([0.2 + i * 0.045, 0.15, 0], [0.215 + i * 0.045, 0.15, 0], 0.08, 0.08, 12), { rep: 1 }); // heat fins
    H.add('brass', rod([0.54, 0.15, 0], [0.7, 0.15, 0], 0.045, 0.1, 14, true), { rep: 0.6 });         // bell
    H.add('goldHammer', ringX(0.7, 0.15, 0, 0.1, 0.014, 18), { rep: 1 });
    for (const s of [-1, 1]) H.add('gold', rod([0.66, 0.15 + s * 0.09, 0], [0.74, 0.15 + s * 0.055, 0], 0.02, 0.003, 6), { rep: 1 }); // fangs
    H.add('bore', cyl(0.042, 0.01, 10, 0, 0, 0).rotateZ(Math.PI / 2).translate(0.57, 0.15, 0), { uv: 'none' });
    H.add('iron', rod([0.5, 0.15, 0], [0.62, 0.06, 0], 0.01, 0.01, 4), { rep: 1 });                    // pilot arm
    lit.add('flame', ball(0.022, 0.63, 0.055, 0, 1, 1.4, 1, 8), { uv: 'none' });                       // pilot light
    lit.add('flame', cyl(0.07, 0.01, 12, 0, 0, 0).rotateZ(Math.PI / 2).translate(0.6, 0.15, 0), { uv: 'none' });
    const stand = S.build('stand'), head = H.build('head'), glow = lit.build('lit');
    head.add(glow);
    return { stand, head, pivot, muzzle: [0.72, 0.15], frames: 2, frame(i) { M.flame.emissiveIntensity = i ? 3.4 : 1.2; } };
  },

  // Rocket Turret: a heavy octagonal riveted plinth on four stabiliser feet; a yoke holding two green-copper pods
  // of four rockets each (red warheads), pitched up, with a radar dish between them.
  rocketturret(M) {
    const pivot = 0.46, S = new Parts(M), H = new Parts(M), lit = new Parts(M);
    S.add('iron', new THREE.CylinderGeometry(0.3, 0.36, 0.16, 8).rotateY(Math.PI / 8).translate(0, 0.08, 0), { rep: 1 });
    S.add('goldHammer', new THREE.CylinderGeometry(0.305, 0.305, 0.025, 8).rotateY(Math.PI / 8).translate(0, 0.16, 0), { rep: 1 });
    S.add('gunmetal', new THREE.CylinderGeometry(0.19, 0.24, 0.14, 8).rotateY(Math.PI / 8).translate(0, 0.24, 0), { rep: 1 });
    S.add('gunmetal', rod([0, 0.3, 0], [0, pivot, 0], 0.09, 0.08, 10), { rep: 1 });
    for (let i = 0; i < 4; i++) { const a = Math.PI / 4 + (i / 4) * TAU; S.add('iron', boxY(0.22, 0.06, 0.09, Math.cos(a) * 0.38, 0.03, Math.sin(a) * 0.38, -a), { rep: 1 }); S.add('brass', cyl(0.05, 0.03, 8, Math.cos(a) * 0.47, 0.015, Math.sin(a) * 0.47), { rep: 1 }); }
    turntable(H, 'gunmetal', 'goldHammer', 0.19);
    H.add('iron', box(0.24, 0.08, 0.2, 0, 0.1, 0), { rep: 1 });
    for (const z of [-0.12, 0.12]) H.add('iron', box(0.12, 0.2, 0.04, 0, 0.2, z), { rep: 1 });
    const pods = new THREE.Group(), PP = new Parts(M);
    for (const z of [-0.24, 0.24]) {
      PP.add('copper', box(0.5, 0.22, 0.2, 0, 0, z), { rep: 0.7 });
      for (const x of [-0.17, 0.17]) PP.add('goldHammer', box(0.03, 0.235, 0.215, x, 0, z), { rep: 1 });
      for (const [dy, dz] of [[-0.055, -0.05], [-0.055, 0.05], [0.055, -0.05], [0.055, 0.05]]) {
        PP.add('bore', cyl(0.04, 0.01, 10, 0, 0, 0).rotateZ(Math.PI / 2).translate(0.252, dy, z + dz), { uv: 'none' });
        PP.add('warhead', rod([0.24, dy, z + dz], [0.33, dy, z + dz], 0.034, 0.002, 10), { uv: 'none' });
        PP.add('iron', cyl(0.036, 0.01, 10, 0, 0, 0).rotateZ(Math.PI / 2).translate(-0.252, dy, z + dz), { rep: 1 });
        lit.add('flame', cyl(0.028, 0.012, 10, 0, 0, 0).rotateZ(Math.PI / 2).translate(-0.26, dy, z + dz), { uv: 'none' });
      }
    }
    PP.add('gunmetal', rod([0, 0, -0.14], [0, 0, 0.14], 0.035, 0.035, 10), { rep: 1 });                // the trunnion
    pods.add(PP.build('pods'), lit.build('exhaust'));
    pods.position.set(0, 0.24, 0); pods.rotation.z = 0.2;
    H.add('steel', rod([-0.04, 0.24, 0], [-0.04, 0.4, 0], 0.016, 0.016, 6), { rep: 1 });               // radar mast
    H.add('silver', new THREE.SphereGeometry(0.1, 14, 6, 0, TAU, 0, 1.0).rotateZ(Math.PI / 2 + 0.35).translate(-0.02, 0.42, 0), { rep: 0.8 });
    H.add('lens', ball(0.018, 0.04, 0.44, 0, 1, 1, 1, 8), { uv: 'none' });
    const stand = S.build('stand'), head = H.build('head');
    head.add(pods);
    M.silver.side = THREE.DoubleSide;
    const ex = pods.children[1];
    return { stand, head, pivot, muzzle: [0.36, 0.3], frames: 2, frame(i) { ex.visible = !!i; M.flame.emissiveIntensity = 2.6; pods.position.x = i ? -0.03 : 0; } };
  },

  // Cryo Turret: a blue-steel tripod caging a glowing coolant canister; a steel housing with silver frost fins, a
  // barrel wound with copper coils, and an ice crystal held out front by three gold prongs.
  cryoturret(M) {
    const pivot = 0.54, S = new Parts(M), H = new Parts(M), coils = new Parts(M);
    legs(S, 'steel', 'brass', 3, 0.4, 0.42, -Math.PI / 2);
    S.add('steel', rod([0, 0.32, 0], [0, pivot, 0], 0.07, 0.065, 10), { rep: 1 });
    S.add('silver', cyl(0.1, 0.05, 14, 0, pivot - 0.035, 0), { rep: 1 });
    S.add('glassBlue', rod([0, 0.1, 0], [0, 0.32, 0], 0.075, 0.075, 14), { uv: 'none' });              // coolant
    for (const y of [0.1, 0.32]) S.add('steel', cyl(0.09, 0.03, 14, 0, y, 0), { rep: 1 });
    for (let i = 0; i < 3; i++) { const a = (i / 3) * TAU + 0.5; S.add('silver', rod([Math.cos(a) * 0.085, 0.1, Math.sin(a) * 0.085], [Math.cos(a) * 0.085, 0.32, Math.sin(a) * 0.085], 0.01, 0.01, 4), { rep: 1 }); }
    turntable(H, 'steel', 'silver', 0.16);
    H.add('steel', box(0.32, 0.16, 0.2, -0.02, 0.15, 0), { rep: 1 });
    H.add('goldCharcoal', box(0.26, 0.04, 0.16, -0.04, 0.25, 0), { rep: 1 });
    for (const s of [-1, 1]) H.add('silver', tris([[-0.16, 0.12, 0.1 * s], [0.08, 0.12, 0.1 * s], [-0.2, 0.3, 0.2 * s], [-0.16, 0.18, 0.1 * s]], s > 0 ? [0, 1, 2, 0, 2, 3, 0, 2, 1] : [0, 2, 1, 0, 3, 2, 0, 1, 2]), { rep: 1 }); // frost fins
    H.add('steel', rod([0.12, 0.15, 0], [0.56, 0.15, 0], 0.04, 0.036, 10), { rep: 1 });
    for (let i = 0; i < 4; i++) coils.add('copper', ringX(0.24 + i * 0.08, 0.15, 0, 0.06, 0.018, 14), { rep: 1 });
    for (let i = 0; i < 3; i++) { const a = (i / 3) * TAU; H.add('gold', rod([0.52, 0.15 + Math.cos(a) * 0.04, Math.sin(a) * 0.04], [0.66, 0.15 + Math.cos(a) * 0.075, Math.sin(a) * 0.075], 0.012, 0.008, 5), { rep: 1 }); }
    H.add('ice', new THREE.OctahedronGeometry(0.07).scale(1.8, 1, 1).translate(0.66, 0.15, 0), { uv: 'none' });
    H.add('lens', ball(0.016, 0.08, 0.22, 0.1, 1, 1, 1, 8), { uv: 'none' });
    const stand = S.build('stand'), head = H.build('head'), cg = coils.build('coils');
    head.add(cg);
    const cu = cg.children[0].material, coilLit = cu.clone(); coilLit.emissive = new THREE.Color(0x40c8ff); coilLit.emissiveIntensity = 0.8;
    return { stand, head, pivot, muzzle: [0.78, 0.15], frames: 2, frame(i) { cg.children[0].material = i ? coilLit : cu; M.ice.emissiveIntensity = i ? 3 : 1.5; M.glassBlue.emissiveIntensity = i ? 2 : 1.3; } };
  },
};
export const TURRET_SCALE = { turret: 1.4, flameturret: 1.4, rocketturret: 1.5, cryoturret: 1.4 };

export function buildTurret(M, kind) {
  extras(M);
  const t = TURRETS[kind](M), k = TURRET_SCALE[kind];
  t.stand.scale.setScalar(k); t.head.scale.setScalar(k);
  t.head.position.y = t.pivot * k;
  return { stand: t.stand, head: t.head, frames: t.frames, frame: t.frame, info: { pivot: t.pivot * k, muzzle: [t.muzzle[0] * k, t.muzzle[1] * k], scale: k } };
}

// ------------------------------------------------------------------ the biplane
/** The Bombing Run biplane: a mahogany fuselage with a brass cowl and radial engine, cream linen wings edged in gold
 * with plum roundels, blackwood struts and bracing wires, a plum tail, twin guns on the cowl, four bombs under the
 * lower wing, wheels, and a goggled pilot with a plum scarf. The nose is +X; frame i turns the propeller. */
export function buildBiplane(M) {
  extras(M);
  const P = new Parts(M), prop = new Parts(M), root = new THREE.Group(); root.name = 'biplane';
  const X0 = -1.05, X1 = 0.62;
  const rad = (x) => { const u = (x - X0) / (X1 - X0); return 0.035 + 0.17 * Math.pow(Math.sin(Math.min(1, u * 1.25) * Math.PI / 2), 0.9) - (u > 0.9 ? (u - 0.9) * 0.2 : 0); };
  P.add('hull', surf(28, 16, (u, v) => { const x = X0 + u * (X1 - X0), r = rad(x), a = v * TAU; return [x, Math.cos(a) * r * 1.12 + (1 - u) * 0.06, Math.sin(a) * r]; }, (u, v) => [u * 3, v * 1.2]), { uv: 'none' });
  P.add('goldHammer', ringX(0.05, 0.005, 0, 0.215, 0.012, 20), { rep: 1 });
  P.add('goldHammer', ringX(-0.55, 0.03, 0, 0.16, 0.01, 18), { rep: 1 });
  P.add('brass', rod([0.56, 0, 0], [0.72, 0, 0], 0.205, 0.195, 18, true), { rep: 0.5 });                // cowl
  for (let i = 0; i < 7; i++) { const a = (i / 7) * TAU; P.add('bronze', rod([0.68, Math.cos(a) * 0.12, Math.sin(a) * 0.12], [0.68, Math.cos(a) * 0.235, Math.sin(a) * 0.235], 0.035, 0.03, 6), { rep: 1 }); }
  P.add('gunmetal', cyl(0.13, 0.08, 14, 0, 0, 0).rotateZ(Math.PI / 2).translate(0.68, 0, 0), { rep: 1 });
  P.add('gold', rod([0.72, 0, 0], [0.86, 0, 0], 0.07, 0.005, 14), { rep: 1 });                            // spinner
  for (const s of [-1, 1]) P.add('brass', rod([0.5, -0.12, 0.17 * s], [0.2, -0.17, 0.2 * s], 0.018, 0.014, 6), { rep: 1 }); // exhausts
  for (const s of [-1, 1]) { P.add('gunmetal', rod([0.22, 0.2, 0.065 * s], [0.66, 0.2, 0.065 * s], 0.018, 0.016, 6), { rep: 1 }); P.add('bore', cyl(0.012, 0.01, 6, 0, 0, 0).rotateZ(Math.PI / 2).translate(0.665, 0.2, 0.065 * s), { uv: 'none' }); }
  // wings: cream linen, gold leading edges, plum roundels on the upper wing
  const wing = (span, y, x, chord) => {
    P.add('canvas', box(chord, 0.035, span - 0.7, x, y, 0), { rep: 1.2 });
    for (const s of [-1, 1]) P.add('redPaint', box(chord, 0.034, 0.35, x, y, (span / 2 - 0.175) * s), { uv: 'box' });   // crimson tips
    P.add('goldLeaf', rod([x + chord / 2, y, -span / 2], [x + chord / 2, y, span / 2], 0.022, 0.022, 6), { rep: 1 });
    for (const s of [-1, 1]) P.add('redPaint', cyl(chord / 2, 0.034, 12, 0, 0, 0).scale(1, 1, 0.45).translate(x, y, (span / 2) * s), { rep: 1.2 });
    for (let i = 1; i < 10; i++) { const z = (i / 10 - 0.5) * span; if (Math.abs(z) > 0.2) P.add('scroll', box(chord * 0.96, 0.04, 0.012, x, y, z), { rep: 1 }); }   // ribs
  };
  wing(2.6, 0.42, 0.1, 0.44); wing(2.3, -0.13, 0.14, 0.4);
  for (const s of [-1, 1]) {
    P.add('plum', cyl(0.15, 0.006, 20, 0.1, 0.441, 0.85 * s), { rep: 0.6 });
    P.add('goldHammer', new THREE.TorusGeometry(0.15, 0.012, 4, 22).rotateX(Math.PI / 2).translate(0.1, 0.443, 0.85 * s), { rep: 1 });
    P.add('goldHammer', cyl(0.05, 0.007, 12, 0.1, 0.443, 0.85 * s), { rep: 1 });
    P.add('plum', cyl(0.13, 0.006, 20, 0.14, -0.153, 0.75 * s), { rep: 0.6 });
    // struts and bracing
    for (const dx of [-0.08, 0.22]) P.add('blackwood', rod([dx + 0.02, -0.11, 0.85 * s], [dx, 0.4, 0.85 * s], 0.018, 0.018, 6), { rep: 1 });
    P.add('iron', rod([0.22, -0.11, 0.85 * s], [-0.08, 0.4, 0.2 * s], 0.005, 0.005, 3), { rep: 1 });
    P.add('iron', rod([0.22, 0.4, 0.85 * s], [-0.06, -0.1, 0.2 * s], 0.005, 0.005, 3), { rep: 1 });
    for (const dx of [-0.02, 0.24]) P.add('blackwood', rod([dx, 0.15, 0.06 * s], [dx, 0.4, 0.2 * s], 0.014, 0.014, 5), { rep: 1 }); // cabane
    // undercarriage: V struts, wheels with brass hubs
    P.add('iron', rod([0.35, -0.16, 0.08 * s], [0.3, -0.42, 0.2 * s], 0.014, 0.014, 5), { rep: 1 });
    P.add('iron', rod([0.1, -0.16, 0.08 * s], [0.3, -0.42, 0.2 * s], 0.014, 0.014, 5), { rep: 1 });
    P.add('iron', new THREE.CylinderGeometry(0.1, 0.1, 0.05, 16).rotateX(Math.PI / 2).translate(0.3, -0.42, 0.22 * s), { rep: 1 });
    P.add('brass', new THREE.CylinderGeometry(0.035, 0.035, 0.06, 10).rotateX(Math.PI / 2).translate(0.3, -0.42, 0.22 * s), { rep: 1 });
    // bombs under the lower wing
    for (const z of [0.42, 0.66]) {
      P.add('iron', ball(0.055, 0.12, -0.22, z * s, 2.4, 1, 1, 12), { rep: 1 });
      P.add('brass', box(0.08, 0.1, 0.008, -0.03, -0.22, z * s), { rep: 1 }); P.add('brass', box(0.08, 0.008, 0.1, -0.03, -0.22, z * s), { rep: 1 });
      P.add('iron', rod([0.12, -0.16, z * s], [0.12, -0.13, z * s], 0.01, 0.01, 4), { rep: 1 });
    }
  }
  P.add('iron', rod([0.3, -0.42, -0.22], [0.3, -0.42, 0.22], 0.012, 0.012, 5), { rep: 1 });              // axle
  // tail: gold-edged stabiliser, a plum fin and rudder, a skid
  P.add('canvas', tris([[-0.72, 0.06, 0], [-1.08, 0.06, 0.42], [-1.08, 0.06, -0.42], [-1.0, 0.06, 0.42], [-1.0, 0.06, -0.42]], [0, 3, 1, 0, 1, 2, 0, 2, 4, 0, 2, 1, 0, 1, 3, 0, 4, 2]), { rep: 1 });
  P.add('goldLeaf', rod([-1.09, 0.06, -0.43], [-1.09, 0.06, 0.43], 0.012, 0.012, 5), { rep: 1 });
  const fin = [[-0.78, 0.1, 0], [-1.1, 0.1, 0], [-1.12, 0.46, 0], [-1.0, 0.44, 0]];
  P.add('plum', tris(fin.map(([x, y]) => [x, y, 0.012]).concat(fin.map(([x, y]) => [x, y, -0.012])), [0, 1, 2, 0, 2, 3, 4, 6, 5, 4, 7, 6]), { rep: 0.6 });
  P.add('goldLeaf', rod([-1.12, 0.46, 0], [-1.0, 0.44, 0], 0.012, 0.012, 5), { rep: 1 });
  P.add('goldLeaf', rod([-1.0, 0.44, 0], [-0.78, 0.1, 0], 0.01, 0.01, 5), { rep: 1 });
  P.add('iron', rod([-0.95, -0.02, 0], [-1.02, -0.13, 0], 0.012, 0.008, 5), { rep: 1 });
  // cockpit: a dark well, a windscreen, the goggled pilot and his plum scarf
  P.add('bore', new THREE.CylinderGeometry(0.11, 0.11, 0.02, 14).scale(1.4, 1, 1).translate(-0.2, 0.2, 0), { uv: 'none' });
  P.add('brass', new THREE.TorusGeometry(0.11, 0.014, 5, 18).rotateX(Math.PI / 2).scale(1.4, 1, 1).translate(-0.2, 0.205, 0), { rep: 1 });
  P.add('windscreen', box(0.01, 0.1, 0.18, -0.03, 0.26, 0, 0).rotateZ(0), { uv: 'none' });
  P.add('charcoal', ball(0.075, -0.22, 0.3, 0, 1, 1.05, 0.95), { rep: 0.5 });
  P.add('brass', new THREE.TorusGeometry(0.026, 0.008, 4, 10).rotateY(Math.PI / 2).translate(-0.15, 0.32, 0.03), { rep: 1 });
  P.add('brass', new THREE.TorusGeometry(0.026, 0.008, 4, 10).rotateY(Math.PI / 2).translate(-0.15, 0.32, -0.03), { rep: 1 });
  P.add('glassBlue', ball(0.022, -0.148, 0.32, 0.03, 0.4, 1, 1, 8), { uv: 'none' });
  P.add('glassBlue', ball(0.022, -0.148, 0.32, -0.03, 0.4, 1, 1, 8), { uv: 'none' });
  P.add('plum', box(0.3, 0.012, 0.06, -0.42, 0.25, 0.05, 0).rotateZ(0), { rep: 0.5 });
  // the propeller: two carved blades at the frame's angle and a faint blur disc
  prop.add('scroll', box(0.03, 0.62, 0.07, 0, 0, 0), { rep: 1 });
  prop.add('gold', box(0.034, 0.08, 0.075, 0, 0.27, 0), { rep: 1 }); prop.add('gold', box(0.034, 0.08, 0.075, 0, -0.27, 0), { rep: 1 });
  prop.add('propDisc', new THREE.CircleGeometry(0.34, 28).rotateY(Math.PI / 2), { uv: 'none' });
  const body = P.build('body'), pg = prop.build('prop');
  pg.position.set(0.8, 0, 0);
  pg.traverse((o) => { if (o.material === M.propDisc) o.castShadow = false; });
  root.add(body, pg);
  const blades = pg.children.filter((m) => m.material !== M.propDisc);
  return { root, frames: 2, frame(i) { for (const b of blades) b.rotation.x = i * Math.PI / 2 + 0.4; }, info: { span: 2.6, length: 1.9 } };
}
