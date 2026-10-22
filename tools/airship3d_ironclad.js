// The heroes' airship: an armored, futuristic Final Fantasy airship (Highwind / Ragnarok / Strahl lineage) the same size
// and deck plan as the galleon (tools/airship3d.js): steel plate over a greyboard deck, a wedge prow, a bridge tower on
// the forecastle (tall parts go toward the bow, where the iso camera only loses sky behind them), swept wings with
// turbine nacelles, stern thrusters, turrets and violet lift drives. Same units and frame: 1 unit = 1 tile, bow to -Z.
import * as THREE from 'three';
import { Parts, box, rod, flag, sm, hull, slab, plume } from './airship3d.js';

const L = 40, ZS = 20, QD_S = 0.2, FC_S = 0.8, QD_H = 2.2, FC_H = 2.0, BW = 1.1, WALL = 0.35;
const lerp = (a, b, t) => a + (b - a) * t;
const zAt = (s) => ZS - s * L, sAt = (z) => (ZS - z) / L;
const beam = (s) => s < 0.1 ? 5.6 + 0.6 * sm(0, 0.1, s) : s < 0.6 ? 6.2 : 6.2 * (1 - Math.pow((s - 0.6) / 0.4, 2.2));
const sheer = (s) => BW + QD_H * (1 - sm(0.17, 0.23, s)) + FC_H * sm(0.77, 0.83, s) + 1.0 * Math.pow(sm(0.88, 1, s), 2);
const keel = (s) => -6.0 + 1.4 * (1 - sm(0, 0.3, s)) + 6.6 * Math.pow(sm(0.58, 1, s), 1.3);
// faceted section: a vertical armor belt, a chine, a V bottom to a keel blade
const prof = (k) => k < 0.42 ? 1 - 0.03 * k / 0.42 : k < 0.72 ? lerp(0.97, 0.72, (k - 0.42) / 0.3) : lerp(0.72, 0.04, (k - 0.72) / 0.28);
const inner = (s) => Math.max(0, beam(s) - WALL);
const deckAt = (s) => s < QD_S ? QD_H : s > FC_S ? FC_H : 0;
const TOWER = [0.835, 0.945];
const hullX = (s, y) => beam(s) * prof((sheer(s) - y) / (sheer(s) - keel(s)));   // the hull's half-width at height y
export const IRONCLAD = { L, QD_S, FC_S, QD_H, FC_H, BW, zAt, sAt, beam, inner, deckAt, sheer, keel,
  blocked: (x, z) => { const s = sAt(z); return s > TOWER[0] - 0.01 && s < TOWER[1] + 0.02; } };

export function buildIronclad(M) {
  const root = new THREE.Group(); root.name = 'ironclad';
  const P = new Parts(M), spin = [], fx = [], glow = [], turrets = [];
  hull(P, { L, beam, sheer, keel, prof, ns: 140, transom: 'iron', inner, deckAt, wall: 'iron', cap: 'goldLeaf',
    bands: [['goldLeaf', 0, 0.04, 1], ['steel', 0.04, 0.4, 6], ['neon', 0.4, 0.42, 1], ['silver', 0.42, 0.72, 6], ['iron', 0.72, 1, 6]],
    decks: [['greyboards', QD_S - 0.01, FC_S + 0.01, 0], ['greyboards', 0.009, QD_S, QD_H], ['greyboards', FC_S, 0.995, FC_H]] });
  P.add('iron', box(inner(0) * 2, sheer(0) - QD_H, WALL, 0, (sheer(0) + QD_H) / 2, ZS - WALL / 2));
  P.add('goldLeaf', box(beam(0) * 2 + 0.1, 0.12, WALL + 0.12, 0, sheer(0) + 0.06, ZS - WALL / 2));
  const zq = zAt(QD_S), zf = zAt(FC_S);
  P.add('steel', box(inner(QD_S) * 2, QD_H, 0.3, 0, QD_H / 2, zq - 0.15));
  P.add('steel', box(inner(FC_S) * 2, FC_H, 0.3, 0, FC_H / 2, zf + 0.15));

  // Stairs: steel treads with gold nosing, as wide as the galleon's.
  const stairs = (z0, dir, h, n) => {
    const rise = h / n, run = 0.42, w = 4;
    for (let i = 0; i < n; i++) {
      const y = rise * (n - i), z = z0 + dir * run * (i + 0.5);
      P.add('iron', box(w, y, run, 0, y / 2, z));
      P.add('goldLeaf', box(w, 0.05, 0.08, 0, y + 0.01, z + dir * (run / 2 - 0.04)));
    }
    for (const sx of [-1, 1]) {
      const g = new THREE.BoxGeometry(0.24, 0.36, run * n * Math.hypot(1, h / (run * n)) + 0.2);
      g.rotateX(dir * Math.atan2(h, run * n)); g.translate(sx * (w / 2 + 0.12), h / 2 + 0.14, z0 + dir * run * n / 2);
      P.add('steel', g);
    }
    return z0 + dir * run * n;
  };
  const qFoot = stairs(zq, -1, QD_H, 9), fFoot = stairs(zf, 1, FC_H, 8);

  const lamp = (x, y, z, k = 1) => {
    P.add('silver', box(0.2 * k, 0.5 * k, 0.2 * k, x, y + 0.25 * k, z));
    P.add('cyan', box(0.26 * k, 0.22 * k, 0.26 * k, x, y + 0.6 * k, z));
    P.add('goldLeaf', new THREE.ConeGeometry(0.22 * k, 0.22 * k, 4).rotateY(Math.PI / 4).translate(x, y + 0.82 * k, z));
    glow.push({ x, y: y + 0.6 * k, z, r: 1.5 * k, c: 0x7fe4ff });
  };
  const rail = (x0, x1, y, z) => {
    const len = Math.abs(x1 - x0), cx = (x0 + x1) / 2, n = Math.max(2, Math.round(len / 0.9));
    for (let i = 0; i <= n; i++) P.add('silver', box(0.14, 0.7, 0.14, x0 + (x1 - x0) * i / n, y + 0.35, z));
    P.add('goldLeaf', box(len + 0.16, 0.12, 0.22, cx, y + 0.74, z));
    P.add('neon', box(len, 0.06, 0.08, cx, y + 0.3, z));
  };
  for (const [z, y, s] of [[zq - 0.12, QD_H, QD_S], [zf + 0.12, FC_H, FC_S]]) {
    rail(-inner(s) + 0.1, -2.2, y, z); rail(2.2, inner(s) - 0.1, y, z);
    lamp(-2.2, y + 0.75, z, 0.8); lamp(2.2, y + 0.75, z, 0.8);
  }
  // Blast doors under the raised decks, framed in light.
  const door = (x, z, face) => {
    P.add('dark', box(1.4, 1.85, 0.06, x, 0.93, z + face * 0.04));
    for (const dx of [-0.33, 0.33]) P.add('silver', box(0.62, 1.75, 0.06, x + dx, 0.88, z + face * 0.08));
    P.add('neon', box(1.5, 0.08, 0.08, x, 1.88, z + face * 0.08));
    for (const dx of [-0.73, 0.73]) P.add('neon', box(0.08, 1.85, 0.08, x + dx, 0.93, z + face * 0.08));
    P.add('goldLeaf', box(1.7, 0.18, 0.14, x, 2.0, z + face * 0.08));
  };
  door(-3.0, zf + 0.3, 1); door(3.0, zf + 0.3, 1); door(-3.8, zq - 0.3, -1); door(3.8, zq - 0.3, -1);
  for (const s of [0.1, 0.3, 0.45, 0.6, 0.72]) for (const side of [-1, 1]) lamp(side * (inner(s) + WALL / 2), sheer(s) + 0.12, zAt(s), 0.7);

  // Armor plates on the belt, gold-riveted.
  for (let z = zAt(0.37); z > zAt(0.7); z -= 2.3) for (const side of [-1, 1]) {
    const s = sAt(z), y = sheer(s) - 0.95, x = side * (beam(s) + 0.08);
    P.add('silver', box(0.16, 1.5, 2.1, x, y, z));
    for (const dy of [-0.6, 0.6]) for (const dz of [-0.9, 0.9]) P.add('goldLeaf', new THREE.SphereGeometry(0.09, 6, 4).translate(x + side * 0.08, y + dy, z + dz));
  }
  // cyan slit windows high on the transom
  for (let i = 0; i < 6; i++) P.add('cyan', box(0.5, 0.32, 0.06, (i - 2.5) * 1.3, QD_H - 0.6, ZS + 0.03));

  // Prow blade and headlights.
  {
    const sh = new THREE.Shape([[19.5, 2.2], [23.6, 0.95], [23.0, 0.3], [19.3, -0.5]].map(([x, y]) => new THREE.Vector2(x, y)));
    const g = new THREE.ExtrudeGeometry(sh, { depth: 0.3, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.1, bevelSegments: 1 });
    g.rotateY(Math.PI / 2); g.translate(-0.15, 0, 0);
    P.add('steel', g);
    P.add('goldLeaf', rod([0, 2.3, -19.5], [0, 1.0, -23.75], 0.13, 0.08, 6));
    for (const side of [-1, 1]) {
      const s = 0.955, y = sheer(s) - 1.6, x = side * (hullX(s, y) + 0.05);
      P.add('cyan', new THREE.SphereGeometry(0.22, 8, 6).translate(x, y, zAt(s)));
      glow.push({ x, y, z: zAt(s) - 0.2, r: 2.2, c: 0x9fefff });
    }
  }

  // Bridge tower on the forecastle: two tiers following the hull, banded with lit glass, a radar mast on top.
  const outline = (s0, s1, inset, y) => {
    const pts = [], n = 6;
    for (let i = 0; i <= n; i++) { const s = lerp(s0, s1, i / n); pts.push([Math.max(0.3, inner(s) - inset), y, zAt(s)]); }
    for (let i = n; i >= 0; i--) { const s = lerp(s0, s1, i / n); pts.push([-Math.max(0.3, inner(s) - inset), y, zAt(s)]); }
    return pts;
  };
  const tier = (s0, s1, inset, y0, h, mat) => {
    P.add(mat, slab(outline(s0, s1, inset, y0 + h), h));
    P.add('cyan', slab(outline(s0, s1, inset - 0.04, y0 + h * 0.78), h * 0.24));
    P.add('goldLeaf', slab(outline(s0 - 0.002, s1 + 0.002, inset - 0.06, y0 + h + 0.1), 0.1));
  };
  tier(TOWER[0], TOWER[1], 0.35, FC_H, 2.8, 'silver');
  tier(0.845, 0.93, 0.9, FC_H + 2.9, 2.0, 'steel');
  tier(0.858, 0.912, 1.45, FC_H + 5.0, 1.4, 'silver');
  const top = FC_H + 6.5, tz = zAt(0.872);
  {
    const z0 = zAt(0.9), z1 = zAt(0.875), sh = new THREE.Shape([[-z0, top - 0.1], [-z1, top - 0.1], [-z1 + 1.6, top + 3.6], [-z1 + 2.6, top + 4.1], [-z0 + 1.8, top + 1.2]].map(([x, y]) => new THREE.Vector2(x, y)));
    const g = new THREE.ExtrudeGeometry(sh, { depth: 0.22, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.06, bevelSegments: 1 });
    g.rotateY(Math.PI / 2); g.translate(-0.11, 0, 0);
    P.add('steel', g);
    P.add('goldLeaf', rod([0, top, z1], [0, top + 3.65, z1 - 1.6], 0.1, 0.07, 6));
    P.add('neon', rod([0, top + 0.2, z0 - 0.1], [0, top + 1.25, z0 - 1.85], 0.06, 0.05, 4));
  }
  P.add('goldCharcoal', box(1.0, 0.3, 1.0, 0, top + 0.15, tz));
  P.add('silver', rod([0, top, tz], [0, top + 5, tz], 0.14, 0.08, 8));
  for (const [y, w] of [[top + 2.2, 1.6], [top + 3.4, 1.1]]) P.add('goldLeaf', rod([-w, y, tz], [w, y, tz], 0.06, 0.06, 6));
  for (const sx of [-1.6, 1.6]) { P.add('cyan', new THREE.SphereGeometry(0.12, 6, 4).translate(sx, top + 2.2, tz)); glow.push({ x: sx, y: top + 2.2, z: tz, r: 1, c: 0x7fe4ff }); }
  {
    const radar = new THREE.Group(), R = new Parts(M); radar.position.set(0, top + 4.2, tz);
    R.add('goldLeaf', new THREE.SphereGeometry(1.1, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2.6).scale(1, 0.5, 1).rotateZ(Math.PI / 2).translate(-0.2, 0, 0));
    R.add('silver', rod([-0.3, 0, 0], [0.6, 0, 0], 0.08, 0.08, 6));
    R.add('crystal', new THREE.OctahedronGeometry(0.22).translate(0.7, 0, 0));
    radar.add(R.build('radar')); root.add(radar); spin.push({ o: radar, axis: 'y', w: 1.6 });
  }
  P.add('silver', rod([0, top + 5, tz], [0, top + 6.2, tz], 0.05, 0.05, 4));
  const pennant = flag(M.plum, 4.4, 0.7, [0, top + 6.2, tz], 0.12, 'pennant');

  // Canards at the bow, swept wings amidships with turbine nacelles beneath.
  for (const side of [-1, 1]) {
    const m = (pts) => pts.map(([x, y, z]) => [side * x, y, z]);
    P.add('steel', slab(m([[4.0, -2.6, -11.2], [7.8, -2.95, -8.6], [7.8, -2.95, -7.4], [4.0, -2.6, -7.6]]), 0.3));
    P.add('goldLeaf', rod([side * 4.0, -2.55, -11.2], [side * 7.8, -2.9, -8.6], 0.08, 0.06, 5));
    const wing = m([[4.9, -3.0, -2.4], [14.2, -3.5, 6.0], [14.2, -3.5, 8.6], [4.9, -3.0, 9.6]]);
    P.add('steel', slab(wing, 0.5));
    P.add('goldLeaf', rod([side * 4.9, -2.98, -2.4], [side * 14.2, -3.48, 6.0], 0.16, 0.1, 6));
    P.add('neon', rod([side * 5.4, -3.2, 9.62], [side * 14.0, -3.68, 8.62], 0.06, 0.06, 4));
    for (const f of [0.35, 0.65]) {   // armor ribs across the wing
      const a = [lerp(4.9, 14.2, f), lerp(-3.0, -3.5, f), lerp(-2.4, 6.0, f)], b = [a[0], a[1], lerp(9.6, 8.6, f)];
      P.add('silver', rod([side * a[0], a[1] + 0.05, a[2]], [side * b[0], b[1] + 0.05, b[2]], 0.09, 0.09, 4));
    }
    P.add('steel', box(0.22, 1.9, 2.6, side * 14.25, -2.7, 7.6));                   // wingtip fin
    P.add('neon', new THREE.SphereGeometry(0.16, 6, 4).translate(side * 14.3, -1.7, 7.0));
    glow.push({ x: side * 14.3, y: -1.7, z: 7.0, r: 1.4, c: 0xb36bff });

    const x = side * 10, y = -4.75, z0 = 1.4, z1 = 9.4, zc = (z0 + z1) / 2;
    P.add('iron', box(0.5, 1.1, 4.6, x, -4.0, zc + 0.6));
    P.add('steel', new THREE.CylinderGeometry(1.2, 1.38, z1 - z0, 20).rotateX(Math.PI / 2).translate(x, y, zc), { swap: true });
    for (const zz of [z0 + 0.7, zc + 0.6, z1 - 0.5]) P.add('goldLeaf', new THREE.CylinderGeometry(1.42 - (zz - z0) * 0.02, 1.42 - (zz - z0) * 0.02, 0.3, 20).rotateX(Math.PI / 2).translate(x, y, zz));
    P.add('goldLeaf', new THREE.TorusGeometry(1.32, 0.14, 6, 24).translate(x, y, z0));
    P.add('dark', new THREE.CircleGeometry(1.25, 20).rotateY(Math.PI).translate(x, y, z0 + 0.25));
    const fan = new THREE.Group(), F = new Parts(M); fan.position.set(x, y, z0 + 0.15);
    F.add('goldLeaf', new THREE.ConeGeometry(0.4, 0.8, 12).rotateX(-Math.PI / 2));
    for (let i = 0; i < 9; i++) { const g = new THREE.BoxGeometry(0.34, 1.0, 0.05).translate(0, 0.62, 0); g.rotateY(0.5); g.rotateZ(i * Math.PI * 2 / 9); F.add('silver', g); }
    fan.add(F.build('fan')); root.add(fan); spin.push({ o: fan, axis: 'z', w: side * 22 });
    P.add('iron', new THREE.CylinderGeometry(0.85, 1.18, 1.1, 20, 1, true).rotateX(Math.PI / 2).translate(x, y, z1 + 0.5));
    P.add('cyan', new THREE.CircleGeometry(0.85, 20).translate(x, y, z1 + 0.9));
    const pl = plume(0.85, 6.5, 0x5fd8ff); pl.position.set(x, y, z1 + 1.0); root.add(pl); fx.push(pl);
    glow.push({ x, y, z: z1 + 1.4, r: 3.2, c: 0x7fe4ff });
  }

  // Engine sponsons along the stern quarters, Highwind style: long steel pods merged into the hull, gold cowls forward.
  for (const side of [-1, 1]) {
    const x = side * (beam(0.2) + 0.55), y = -1.3, z0 = 6.6, z1 = 21.2, r = 1.35;
    P.add('steel', new THREE.CylinderGeometry(r, r, z1 - z0, 22).rotateX(Math.PI / 2).translate(x, y, (z0 + z1) / 2), { swap: true });
    P.add('goldLeaf', new THREE.ConeGeometry(r, 2.4, 22).rotateX(-Math.PI / 2).translate(x, y, z0 - 1.2));
    P.add('cyan', new THREE.SphereGeometry(0.22, 8, 6).translate(x, y, z0 - 2.4));
    for (const z of [z0 + 0.3, z0 + 4.5, z0 + 8.7, z1 - 1.4]) P.add('goldLeaf', new THREE.CylinderGeometry(r + 0.08, r + 0.08, 0.3, 22).rotateX(Math.PI / 2).translate(x, y, z));
    for (let z = z0 + 1.2; z < z1 - 2; z += 1.4) P.add('neon', box(0.08, 0.18, 0.7, x + side * (r - 0.02), y + 0.35, z));
    P.add('iron', new THREE.CylinderGeometry(r * 0.75, r + 0.05, 1.0, 22, 1, true).rotateX(Math.PI / 2).translate(x, y, z1 + 0.5));
    P.add('cyan', new THREE.CircleGeometry(r * 0.72, 20).translate(x, y, z1 + 0.85));
    const pl = plume(r * 0.72, 7, 0x5fd8ff); pl.position.set(x, y, z1 + 0.95); root.add(pl); fx.push(pl);
    glow.push({ x, y, z: z1 + 1.4, r: 4, c: 0x7fe4ff });
  }
  // Deck inlays: lit lines down the main deck and a lift hatch in its centre (flush, nothing to trip on).
  for (const side of [-1, 1]) P.add('neon', box(0.1, 0.03, qFoot - fFoot - 1, side * (inner(0.5) - 0.7), 0.015, (qFoot + fFoot) / 2));
  {
    const z = (qFoot + fFoot) / 2;
    P.add('iron', new THREE.CircleGeometry(1.5, 24).rotateX(-Math.PI / 2).translate(0, 0.012, z));
    P.add('goldLeaf', new THREE.TorusGeometry(1.7, 0.12, 4, 28).rotateX(Math.PI / 2).scale(1, 0.3, 1).translate(0, 0.03, z));
    P.add('neon', new THREE.TorusGeometry(1.2, 0.06, 4, 28).rotateX(Math.PI / 2).scale(1, 0.3, 1).translate(0, 0.03, z));
    for (let i = 0; i < 4; i++) P.add('goldLeaf', box(0.1, 0.03, 3.3, 0, 0, 0).rotateY(i * Math.PI / 4).translate(0, 0.02, z));
  }

  // Stern thrusters through the transom.
  for (const [x, y, r] of [[-2.6, -1.4, 1.25], [2.6, -1.4, 1.25], [0, -3.7, 0.85]]) {
    P.add('silver', new THREE.CylinderGeometry(r, r + 0.2, 1.9, 20).rotateX(Math.PI / 2).translate(x, y, ZS + 0.6), { swap: true });
    P.add('goldLeaf', new THREE.TorusGeometry(r + 0.05, 0.13, 6, 24).translate(x, y, ZS + 1.55));
    P.add('cyan', new THREE.CircleGeometry(r - 0.1, 20).translate(x, y, ZS + 1.4));
    const pl = plume(r - 0.1, 5 + r * 3, 0x5fd8ff); pl.position.set(x, y, ZS + 1.45); root.add(pl); fx.push(pl);
    glow.push({ x, y, z: ZS + 1.9, r: r * 3.2, c: 0x7fe4ff });
  }

  // Turrets: two sponsons a side on the belt, two on the quarterdeck corners. They sweep slowly.
  const turret = (x, y, z, base, dome, len, sweep) => {
    const g = new THREE.Group(), T = new Parts(M); g.position.set(x, y, z);
    T.add('steel', new THREE.SphereGeometry(dome, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.7, 1.15));
    T.add('goldLeaf', new THREE.TorusGeometry(dome, 0.07, 4, 18).rotateX(Math.PI / 2));
    for (const dx of [-0.22, 0.22]) {
      T.add('gunmetal', rod([dx, dome * 0.35, -dome * 0.6], [dx, dome * 0.35 + len * 0.08, -dome * 0.6 - len], 0.12, 0.1, 8));
      T.add('goldLeaf', rod([dx, dome * 0.35 + len * 0.08, -dome * 0.6 - len], [dx, dome * 0.35 + len * 0.085, -dome * 0.6 - len - 0.18], 0.14, 0.14, 8));
    }
    g.add(T.build('turret')); root.add(g);
    turrets.push({ o: g, base, sweep, ph: turrets.length * 1.7 });
  };
  for (const side of [-1, 1]) {
    for (const s of [0.45, 0.66]) {
      const y = sheer(s) - (sheer(s) - keel(s)) * 0.3, x = side * (hullX(s, y) + 0.25);
      P.add('iron', new THREE.CylinderGeometry(0.75, 0.95, 0.6, 14).rotateZ(side * Math.PI / 2).translate(x - side * 0.1, y, zAt(s)));
      turret(x + side * 0.25, y, zAt(s), -side * (Math.PI / 2 - 0.25), 0.75, 2.2, 0.5);
    }
    const x = side * (inner(0.06) - 1.2), z = zAt(0.06);
    P.add('iron', new THREE.CylinderGeometry(0.85, 1.0, 0.35, 16).translate(x, QD_H + 0.17, z));
    turret(x, QD_H + 0.35, z, -side * (Math.PI - 0.7), 0.85, 2.4, 0.6);
  }

  // Helm: a console with a floating crystal in a ring of light.
  {
    const z = zAt(0.14), y = QD_H;
    P.add('silver', box(0.8, 1.0, 0.5, 0, y + 0.5, z));
    P.add('iron', box(1.4, 0.14, 0.8, 0, y + 1.08, z - 0.05));
    P.add('cyan', box(1.0, 0.04, 0.5, 0, y + 1.17, z - 0.05));
    const orb = new THREE.Group(); orb.position.set(0, y + 2.0, z);
    orb.add(new THREE.Mesh(new THREE.OctahedronGeometry(0.32).scale(1, 1.5, 1), M.crystal));
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.05, 6, 24), M.neon); ring.rotation.x = Math.PI / 2.4; orb.add(ring);
    root.add(orb); spin.push({ o: orb, axis: 'y', w: 1.2 });
    glow.push({ x: 0, y: y + 2.0, z, r: 2.4, c: 0xa040ff });
  }

  // Lift drives under the keel: violet rings and crystals.
  for (const s of [0.3, 0.5, 0.7]) {
    const z = zAt(s), y = keel(s);
    P.add('iron', new THREE.CylinderGeometry(1.15, 0.85, 0.9, 16).translate(0, y - 0.2, z));
    P.add('neon', new THREE.TorusGeometry(1.2, 0.13, 6, 24).rotateX(Math.PI / 2).translate(0, y - 0.7, z));
    const c = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.5, 6).rotateX(Math.PI), M.crystal);
    c.position.set(0, y - 1.6, z); c.name = 'crystal'; root.add(c); spin.push({ o: c, axis: 'y', w: 0.9 });
    glow.push({ x: 0, y: y - 1.2, z, r: 5, c: 0xa040ff, light: true, lr: 5 });
  }

  // Ensign at the stern.
  P.add('silver', rod([0, sheer(0) + 0.1, ZS - 0.2], [0, sheer(0) + 5.0, ZS + 0.4], 0.08, 0.06, 6));
  P.add('goldLeaf', new THREE.SphereGeometry(0.16, 8, 6).translate(0, sheer(0) + 5.05, ZS + 0.41));
  const ensign = flag(M.plum, 3.6, 2.2, [0, sheer(0) + 4.95, ZS + 0.4], 0.32, 'ensign');

  root.add(P.build('ironclad'), pennant.mesh, ensign.mesh);
  root.traverse((o) => { if (o.isMesh && o.name !== 'plume') { o.castShadow = true; o.receiveShadow = true; } });

  function anim(t, dt) {
    for (const s of spin) s.o.rotation[s.axis] += s.w * dt;
    for (const p of fx) p.userData.update(t);
    for (const tr of turrets) tr.o.rotation.y = tr.base + Math.sin(t * 0.35 + tr.ph) * tr.sweep;
    pennant.update(t); ensign.update(t);
  }
  const info = { length: L + 4.6, beam: 2 * 6.2, mainDeck: { z0: fFoot, z1: qFoot, width: 2 * inner(0.5) }, walk: IRONCLAD, glow };
  return { root, anim, info };
}
