// The Air Pirates' boarding boats: three small craft that pull alongside the heroes' ship (tools/airship3d_ironclad.js)
// and drop a ramp on its rail to offload a wave. Rough wood, rust and patched canvas against the heroes' steel.
//   gasbag  - a sloop slung under a patched balloon, stern prop            (14 x 2.7, crew ~6)
//   cutter  - a fast, narrow harpoon boat: black lateen sail, twin props    (13 x 2.3, crew ~4, a plank)
//   hauler  - a boxy barge under a top rotor: smokestack, crane, cargo,
//             a wide drawbridge                                             (15 x 3.8, crew ~10)
// Same units and frame as the big ships: 1 unit = 1 tile, bow to -Z, deck at y = 0, centred on z = 0.
// buildSkiff(M, kind, rampSide) -> { root, anim, info, setRamp(f) }; rampSide +1 drops the ramp to starboard (+X).
import * as THREE from 'three';
import { Parts, box, rod, surf, flag, sm, hull, ramp } from './airship3d.js';

const scaleUV = (g, su, sv) => { const a = g.attributes.uv.array; for (let i = 0; i < a.length; i += 2) { a[i] *= su; a[i + 1] *= sv; } return g; };
const round = (k) => Math.pow(Math.max(0, 1 - Math.pow(k, 2.5)), 0.55);
const boxy = (k) => k < 0.65 ? 1 : 1 - Math.pow((k - 0.65) / 0.35, 1.5) * 0.85;

const KINDS = {
  gasbag: { L: 14, B: 2.7, depth: 2.4, rise: 1.1, stern: 0.12, bowLen: 0.45, bowExp: 0.8, prof: round, rampS: 0.5, rampW: 2.0, deck: 'cypress', wall: 'scorched', cap: 'iron',
    bands: [['mossed', 0, 0.45, 6], ['copper', 0.45, 0.5, 1], ['hullLow', 0.5, 1, 6]] },
  cutter: { L: 13, B: 2.3, depth: 2.0, rise: 0.9, stern: 0.08, bowLen: 0.55, bowExp: 1.0, prof: round, rampS: 0.42, rampW: 1.1, deck: 'bonenail', wall: 'blackwood', cap: 'flaked',
    bands: [['scorched', 0, 0.5, 6], ['flaked', 0.5, 0.56, 1], ['hullLow', 0.56, 1, 6]] },
  hauler: { L: 15, B: 3.8, depth: 2.8, rise: 0.6, stern: 0.25, bowLen: 0.22, bowExp: 0.45, prof: boxy, rampS: 0.45, rampW: 3.0, deck: 'step', wall: 'flaked', cap: 'iron',
    bands: [['flaked', 0, 0.14, 2], ['hullLow', 0.14, 0.85, 6], ['iron', 0.85, 1, 2]] },
};
export const SKIFF_KINDS = Object.keys(KINDS);

/** Smoke puffs rising from p and trailing aft (+Z): soft grey sprites on a loop. */
function smoke(p, n = 7) {
  const c = document.createElement('canvas'); c.width = c.height = 32; const x = c.getContext('2d');
  const g = x.createRadialGradient(16, 16, 0, 16, 16, 16); g.addColorStop(0, '#5a5560'); g.addColorStop(0.6, '#4a4550aa'); g.addColorStop(1, '#4a455000');
  x.fillStyle = g; x.fillRect(0, 0, 32, 32);
  const tex = new THREE.CanvasTexture(c), grp = new THREE.Group(), puffs = [];
  for (let i = 0; i < n; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    grp.add(s); puffs.push(s);
  }
  return { grp, update: (t) => puffs.forEach((s, i) => {
    const f = (t * 0.45 + i / n) % 1;
    s.position.set(p[0] + Math.sin(i * 7 + t) * 0.2 * f, p[1] + f * 2.6, p[2] + f * f * 5);
    s.scale.setScalar(0.6 + f * 2.2); s.material.opacity = 0.75 * (1 - f) * Math.min(1, f * 6);
  }) };
}

export function buildSkiff(M, kind, rampSide = 1) {
  const o = KINDS[kind], { L } = o, Z0 = L / 2;
  const zAt = (s) => Z0 - s * L, sAt = (z) => (Z0 - z) / L;
  const beam = (s) => o.B * Math.sqrt(Math.min(1, (s + o.stern) / 0.3)) * Math.pow(Math.max(0, Math.min(1, (1 - s) / o.bowLen)), o.bowExp);
  const sheer = (s) => 0.8 + o.rise * (Math.pow(1 - s, 4) * 0.5 + Math.pow(s, 3));
  const keel = (s) => -o.depth * (0.75 + 0.25 * Math.sin(Math.PI * s)) + o.depth * 0.7 * Math.pow(sm(0.6, 1, s), 1.5);
  const inner = (s) => Math.max(0, beam(s) - 0.22), deckAt = () => 0;
  const hullX = (s, y) => beam(s) * o.prof((sheer(s) - y) / (sheer(s) - keel(s)));
  const root = new THREE.Group(); root.name = kind;
  const P = new Parts(M), spin = [], waves = [], glow = [], fx = [];
  hull(P, { L, beam, sheer, keel, prof: o.prof, transom: o.bands[0][0], inner, deckAt, wall: o.wall, cap: o.cap, bands: o.bands, decks: [[o.deck, 0.01, 0.97, 0]] });
  P.add(o.wall, box(inner(0) * 2, sheer(0), 0.2, 0, sheer(0) / 2, Z0 - 0.1));

  const lantern = (x, y, z) => {
    P.add('iron', rod([x, y - 0.5, z], [x, y, z], 0.04, 0.04, 4));
    P.add('glass', box(0.22, 0.28, 0.22, x, y + 0.14, z)); P.add('iron', box(0.28, 0.05, 0.28, x, y + 0.3, z));
    glow.push({ x, y: y + 0.14, z, r: 1.4, c: 0xff8a30 });
  };
  const liftCrystal = (s) => {
    const z = zAt(s), y = keel(s) - 1.0;
    P.add('flaked', rod([0, keel(s) + 0.2, z], [0, y + 0.7, z], 0.1, 0.1, 6));
    P.add('flaked', new THREE.TorusGeometry(0.55, 0.06, 4, 12).rotateX(Math.PI / 2).translate(0, y + 0.6, z));
    for (let i = 0; i < 3; i++) { const a = i * Math.PI * 2 / 3; P.add('iron', rod([Math.cos(a) * 0.55, y + 0.6, z + Math.sin(a) * 0.55], [0, y - 0.8, z], 0.04, 0.04, 4)); }
    const c = new THREE.Mesh(new THREE.OctahedronGeometry(0.42).scale(1, 1.6, 1), M.redCrystal); c.position.set(0, y, z); root.add(c);
    spin.push({ o: c, axis: 'y', w: 1.1 });
    glow.push({ x: 0, y, z, r: 3, c: 0xff3a6a, light: true, lr: 3.2 });
  };
  const prop = (x, y, z, r, blades, mat, w) => {
    const g = new THREE.Group(), R = new Parts(M); g.position.set(x, y, z);
    R.add('iron', new THREE.ConeGeometry(r * 0.2, r * 0.4, 8).rotateX(Math.PI / 2));
    for (let i = 0; i < blades; i++) {
      const b = new THREE.BoxGeometry(r * 0.32, r, 0.06), pos = b.attributes.position;
      for (let v = 0; v < pos.count; v++) { pos.setZ(v, pos.getZ(v) + pos.getX(v) * 0.6); pos.setY(v, pos.getY(v) + r * 0.55); }
      b.computeVertexNormals(); b.rotateZ(i * Math.PI * 2 / blades); R.add(mat, b);
    }
    g.add(R.build('prop')); root.add(g); spin.push({ o: g, axis: 'z', w });
  };
  const pirateFlag = (p, len = 2.4, h = 1.4) => { const f = flag(M.charcoal, len, h, p, 0.25, 'flag'); waves.push(f); root.add(f.mesh); };

  if (kind === 'gasbag') {
    const by = 6.4, bz = 0.4;
    const bag = new THREE.SphereGeometry(1, 28, 16).scale(2.5, 2.3, 6.8).translate(0, by, bz);
    P.add('patched', scaleUV(bag, 6, 3), { uv: 'keep' });
    for (const z of [-3.4, 0, 3.4]) { const r = Math.sqrt(1 - ((z) / 6.8) ** 2); P.add('iron', new THREE.TorusGeometry(1, 0.035, 4, 24).scale(2.52 * r, 2.32 * r, 1).translate(0, by, bz + z)); }
    P.add('iron', new THREE.TorusGeometry(1, 0.04, 4, 32).rotateX(Math.PI / 2).scale(2.53, 1, 6.83).translate(0, by, bz));
    for (const side of [-1, 1]) {                         // tail fins
      P.add('charcoal', surf(4, 2, (u, v) => [side * (0.2 + u * 2.4), by + 0.1, bz + 5.0 + v * 2.6 + u * 1.2 - (1 - v) * u * 0.6], (u, v) => [u, v]), { uv: 'keep' });
    }
    P.add('charcoal', surf(4, 2, (u, v) => [0, by + 1.4 + u * 2.4, bz + 4.8 + v * 2.6 + u * 1.2], (u, v) => [u, v]), { uv: 'keep' });
    for (const z of [-3, 3]) for (const side of [-1, 1]) P.add('blackwood', rod([side * (inner(sAt(z)) - 0.1), sheer(sAt(z)), z], [side * 0.9, by - 2.15, z + bz * 0.5], 0.08, 0.08, 5));
    const lines = [];
    for (const z of [-5, -2.5, 0, 2.5, 5]) for (const side of [-1, 1]) {
      const s = sAt(z * 0.85); if (s < 0.02 || s > 0.95) continue;
      lines.push([side * 2.3 * Math.sqrt(Math.max(0, 1 - (z / 6.8) ** 2)), by - 0.6, z + bz], [side * (beam(s) + 0.05), sheer(s) + 0.12, z * 0.85]);
    }
    root.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(lines.map((p) => new THREE.Vector3(...p))), M.rope));
    P.add('iron', rod([0, by + 2.2, bz - 1], [0, by + 4.2, bz - 0.6], 0.05, 0.05, 4));
    pirateFlag([0, by + 4.2, bz - 0.6]);
    P.add('iron', rod([0, -0.8, Z0 - 0.5], [0, -0.8, Z0 + 0.4], 0.1, 0.1, 6));
    prop(0, -0.8, Z0 + 0.5, 1.5, 3, 'cedar', 12);
    P.add('blackwood', rod([0, 0, zAt(0.06)], [0, 1.0, zAt(0.06)], 0.08, 0.08, 6));               // tiller
    P.add('blackwood', rod([0, 1.0, zAt(0.06)], [0, 1.1, zAt(0.18)], 0.06, 0.05, 5));
    lantern(0, sheer(0.97) + 0.4, zAt(0.97)); lantern(-inner(0.08) + 0.1, sheer(0.08) + 0.6, zAt(0.08)); lantern(inner(0.08) - 0.1, sheer(0.08) + 0.6, zAt(0.08));
    liftCrystal(0.5);
  }

  if (kind === 'cutter') {
    const zm = zAt(0.55);
    P.add('cedar', rod([0, -0.1, zm], [0, 6.6, zm], 0.16, 0.1, 8), { swap: true });
    const A = [0, 1.9, zm - 3.4], B = [0, 8.6, zm + 2.9], C = [0, 1.5, zm + 3.6];
    P.add('cedar', rod([A[0], A[1] - 0.1, A[2] - 0.3], [B[0], B[1] + 0.1, B[2] + 0.2], 0.09, 0.06, 6), { swap: true });
    P.add('charcoal', surf(8, 6, (u, v) => {
      const p = [0, 1, 2].map((i) => A[i] + (B[i] - A[i]) * v + (C[i] - A[i]) * u * (1 - v));
      p[0] += Math.sin(Math.PI * v) * Math.sin(Math.PI * u) * 0.8;
      return p;
    }, (u, v) => [u * 2.5 * (1 - v), v * 3.5]), { uv: 'keep' });
    const lines = [[0, 6.6, zm], [0, sheer(0.97) + 0.1, zAt(0.97)], [0, 6.6, zm], [0, sheer(0.03) + 0.1, zAt(0.03)]];
    for (const side of [-1, 1]) lines.push([0, 5.5, zm], [side * beam(0.55), sheer(0.55) + 0.1, zm + 0.4]);
    lines.push(C, [0, sheer(0.1) + 0.1, zAt(0.1)]);
    root.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(lines.map((p) => new THREE.Vector3(...p))), M.rope));
    P.add('iron', rod([0, 6.6, zm], [0, 7.8, zm], 0.04, 0.04, 4));
    pirateFlag([0, 7.8, zm], 2.6, 0.8);
    // harpoon ballista on the bow
    {
      const z = zAt(0.82), y = 0;
      P.add('blackwood', box(0.9, 0.7, 0.9, 0, y + 0.35, z));
      P.add('blackwood', box(0.3, 0.3, 2.2, 0, y + 0.85, z - 0.4));
      for (const side of [-1, 1]) {
        P.add('iron', rod([0, y + 0.9, z - 1.3], [side * 0.9, y + 0.95, z - 1.0], 0.07, 0.06, 5));
        P.add('iron', rod([side * 0.9, y + 0.95, z - 1.0], [side * 1.3, y + 0.95, z - 0.5], 0.06, 0.05, 5));
      }
      P.add('flaked', rod([0, y + 1.05, z + 0.4], [0, y + 1.05, z - 2.6], 0.06, 0.06, 6));
      P.add('iron', new THREE.ConeGeometry(0.18, 0.55, 6).rotateX(-Math.PI / 2).translate(0, y + 1.05, z - 2.85));
      for (const side of [-1, 1]) P.add('iron', new THREE.ConeGeometry(0.06, 0.4, 4).rotateZ(side * 2.4).translate(side * 0.15, y + 1.05, z - 2.5));
    }
    for (const [dy, dz] of [[0.6, 0], [-0.2, 0.4]]) P.add('flaked', new THREE.ConeGeometry(0.16, 0.9, 6).rotateX(-Math.PI / 2).translate(0, sheer(0.99) - 0.6 + dy, zAt(0.99) - 0.4 + dz));
    for (const side of [-1, 1]) {                       // twin outrigger props
      const x = side * (o.B + 1.3), y = -0.5, z = zAt(0.16);
      P.add('iron', rod([side * (hullX(0.16, -0.3) - 0.1), -0.3, z], [x, y, z], 0.1, 0.1, 6));
      P.add('copper', new THREE.CylinderGeometry(0.35, 0.45, 1.6, 10).rotateX(Math.PI / 2).translate(x, y, z), { swap: true });
      prop(x, y, z + 1.0, 0.9, 3, 'cedar', side * 16);
    }
    lantern(0, sheer(0.02) + 0.6, zAt(0.02)); lantern(0, sheer(0.95) + 0.3, zAt(0.95));
    liftCrystal(0.45);
  }

  if (kind === 'hauler') {
    for (const [s, dy, w, h, m] of [[0.3, -0.7, 1.6, 0.9, 'flaked'], [0.55, -1.2, 2.0, 0.7, 'copper'], [0.75, -0.5, 1.3, 1.0, 'flaked'], [0.18, -1.6, 1.8, 0.8, 'iron']]) {
      for (const side of [-1, 1]) { const y = sheer(s) + dy; P.add(m, box(0.1, h, w, side * (hullX(s, y) + 0.04), y, zAt(s) + side * 0.4)); }
    }
    // tripod and rotor
    const ay = 6.2, legs = [[inner(0.3) - 0.3, zAt(0.3)], [-(inner(0.3) - 0.3), zAt(0.3)], [0, zAt(0.68)]];
    for (const [x, z] of legs) P.add('iron', rod([x, 0, z], [0, ay, 0.4], 0.13, 0.1, 6));
    P.add('flaked', new THREE.CylinderGeometry(0.4, 0.55, 0.8, 10).translate(0, ay + 0.2, 0.4));
    {
      const g = new THREE.Group(), R = new Parts(M); g.position.set(0, ay + 0.75, 0.4);
      R.add('iron', new THREE.SphereGeometry(0.35, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2));
      for (let i = 0; i < 4; i++) {
        const b = new THREE.BoxGeometry(4.2, 0.07, 0.6), pos = b.attributes.position;
        for (let v = 0; v < pos.count; v++) { pos.setY(v, pos.getY(v) + pos.getZ(v) * 0.3); pos.setX(v, pos.getX(v) + 2.35); }
        b.computeVertexNormals(); b.rotateY(i * Math.PI / 2); R.add('cedar', b);
        R.add('iron', box(0.3, 0.12, 0.65, Math.cos(i * Math.PI / 2) * 4.4, 0, -Math.sin(i * Math.PI / 2) * 4.4, i * Math.PI / 2));
      }
      g.add(R.build('rotor')); root.add(g); spin.push({ o: g, axis: 'y', w: 6.5 });
    }
    // smokestack at the stern, trailing smoke
    const sx = -rampSide * 1.2, sz = zAt(0.1);
    P.add('flaked', new THREE.CylinderGeometry(0.42, 0.5, 3.2, 10).translate(sx, 1.6, sz));
    P.add('iron', new THREE.CylinderGeometry(0.55, 0.55, 0.25, 10).translate(sx, 3.15, sz));
    P.add('ember', new THREE.CylinderGeometry(0.36, 0.36, 0.05, 10).translate(sx, 3.27, sz));
    const puff = smoke([sx, 3.4, sz]); root.add(puff.grp); fx.push(puff);
    // crane at the bow with a grapple hanging over the docking side
    {
      const z = zAt(0.84), x0 = -rampSide * 0.4, x1 = rampSide * (beam(0.84) + 1.6);
      P.add('blackwood', rod([x0, 0, z], [x0, 3.6, z], 0.14, 0.12, 6));
      P.add('blackwood', rod([x0, 3.3, z], [x1, 3.9, z], 0.1, 0.08, 6));
      P.add('iron', rod([x0, 1.2, z], [x0 + (x1 - x0) * 0.5, 3.6, z], 0.06, 0.06, 4));
      const hy = 0.4;
      P.add('iron', rod([x1, 3.9, z], [x1, hy + 0.4, z], 0.04, 0.04, 4));
      for (let i = 0; i < 3; i++) { const a = i * Math.PI * 2 / 3; P.add('iron', rod([x1, hy + 0.4, z], [x1 + Math.cos(a) * 0.45, hy - 0.1, z + Math.sin(a) * 0.45], 0.05, 0.03, 4)); }
      P.add('iron', rod([x1, hy + 0.5, z], [x1, hy + 0.1, z], 0.09, 0.09, 6));
    }
    // cargo: crates and barrels on the stern half
    for (const [x, z, s] of [[-1.6, 3.6, 1.0], [-1.6, 2.5, 0.9], [-0.5, 4.4, 0.8], [1.5, 4.0, 1.0]].map(([x, z, s]) => [x * -rampSide, z, s])) {
      P.add('endgrain', box(s, s, s, x, s / 2, z)); P.add('iron', box(s + 0.04, 0.08, s + 0.04, x, s - 0.1, z));
    }
    P.add('endgrain', box(0.8, 0.8, 0.8, 1.6 * rampSide, 1.4, 3.6));
    for (const [x, z] of [[0.9, 2.2], [1.6, 2.6], [0.4, 3.0]].map(([x, z]) => [x * -rampSide, z])) {
      P.add('cedar', new THREE.CylinderGeometry(0.34, 0.34, 0.95, 10).translate(x, 0.48, z), { swap: true });
      for (const y of [0.18, 0.78]) P.add('iron', new THREE.CylinderGeometry(0.36, 0.36, 0.07, 10).translate(x, y, z));
    }
    P.add('iron', rod([0, -1.4, Z0 - 0.5], [0, -1.4, Z0 + 0.4], 0.14, 0.14, 6));
    prop(0, -1.4, Z0 + 0.55, 1.9, 4, 'flaked', -9);
    P.add('iron', rod([-rampSide * (inner(0.04) - 0.2), sheer(0.04), zAt(0.04)], [-rampSide * (inner(0.04) - 0.2), sheer(0.04) + 4.6, zAt(0.04) + 0.3], 0.06, 0.05, 5));
    pirateFlag([-rampSide * (inner(0.04) - 0.2), sheer(0.04) + 4.55, zAt(0.04) + 0.3], 2.8, 1.7);
    for (const s of [0.2, 0.62, 0.9]) lantern(rampSide * (inner(s) + 0.05), sheer(s) + 0.6, zAt(s));
    liftCrystal(0.3); liftCrystal(0.7);
  }

  root.add(P.build(kind));
  root.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });

  // the boarding ramp (a plank on the cutter) on the docking side
  const rs = o.rampS, rz = zAt(rs), rlen = kind === 'cutter' ? 3.0 : 2.8;
  const rp = ramp(M, kind === 'cutter' ? 'cedar' : kind === 'hauler' ? 'iron' : 'cypress', rlen, o.rampW, rampSide);
  rp.position.set(rampSide * (beam(rs) + 0.05), sheer(rs) + 0.16, rz); root.add(rp);

  function anim(t, dt) {
    for (const s of spin) s.o.rotation[s.axis] += s.w * dt;
    for (const w of waves) w.update(t);
    for (const f of fx) f.update(t);
  }
  const info = { length: L, beam: 2 * o.B, glow, rampY: sheer(rs) + 0.16, rampX: beam(rs) + 0.05, rampZ: rz, rampLen: rlen,
    walk: { inner, sAt, zAt, deckAt, L }, deckTiles: null };
  return { root, anim, info, setRamp: (f) => rp.userData.set(f) };
}
