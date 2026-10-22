// The heroes' airship: a gothic, steam-driven ironclad (fantasy Battlefleet Gothic): black riveted iron with bronze and
// gold, broadside gun batteries between buttresses, a ram prow under a gilded winged crest, a cathedral bridge on the
// forecastle with the party's arrival portal set in its great door, brass steam engines on iron trusses and furnace
// exhausts at the stern. Same size and deck plan as the galleon (tools/airship3d.js): 1 unit = 1 tile, bow to -Z.
// Tall parts go toward the bow (the iso camera only loses sky behind them); the starboard side and stern stay low.
import * as THREE from 'three';
import { Parts, box, rod, tris, flag, sm, hull, slab, plume, smoke } from './airship3d.js';

import { L, ZS, QD_S, FC_S, QD_H, FC_H, WALL, TOWER, zAt, sAt, beam, sheer, keel, prof, inner, deckAt, hullX, yAtK, STAIR_W, QD_STAIRS, FC_STAIRS } from '../src/world/skyship.js';
const lerp = (a, b, t) => a + (b - a) * t;
export const IRONCLAD = { L, QD_S, FC_S, QD_H, FC_H, zAt, sAt, beam, inner, deckAt, sheer, keel,
  blocked: (x, z) => { const s = sAt(z); return s > TOWER[0] - 0.01 && s < TOWER[1] + 0.02; } };

/** A pointed (gothic) arch outline: width w, sides straight up to hs, apex at h. */
function archShape(w, hs, h) {
  const s = new THREE.Shape(), a = w / 2;
  s.moveTo(-a, 0); s.lineTo(-a, hs);
  s.bezierCurveTo(-a, hs + (h - hs) * 0.55, -a * 0.35, h - 0.05, 0, h);
  s.bezierCurveTo(a * 0.35, h - 0.05, a, hs + (h - hs) * 0.55, a, hs);
  s.lineTo(a, 0); s.lineTo(-a, 0);
  return s;
}
const archFrame = (w, hs, h, t, depth) => new THREE.ExtrudeGeometry(Object.assign(archShape(w + t * 2, hs + t * 0.2, h + t * 1.5), { holes: [archShape(w, hs, h)] }),
  { depth, bevelEnabled: false, curveSegments: 6 });

/** opts.bake: leave out what moves or glows at runtime (portal swirl, flames, plumes, steam, sparks, engine props) and
 *  return where those go as `anchors`, with the props as their own groups (tools/skyship_bake.js). */
export function buildIronclad(M, opts = {}) {
  const bake = !!opts.bake, live = !bake;
  const root = new THREE.Group(); root.name = 'ironclad';
  const P = new Parts(M), spin = [], fx = [], glow = [], turrets = [], sway = [], flames = [];
  const anchors = { braziers: [], furnaces: [], stacks: [], crystals: [], ports: [], props: [] };
  hull(P, { L, beam, sheer, keel, prof, ns: 140, transom: 'iron', inner, deckAt, wall: 'iron', cap: 'goldHammer',
    bands: [['goldHammer', 0, 0.04, 1], ['iron', 0.04, 0.4, 6], ['bronze', 0.4, 0.43, 1], ['gunmetal', 0.43, 0.72, 6], ['iron', 0.72, 1, 6]],
    decks: [['greyboards', QD_S - 0.01, FC_S + 0.01, 0], ['greyboards', 0.009, QD_S, QD_H], ['greyboards', FC_S, 0.995, FC_H]] });
  P.add('iron', box(inner(0) * 2, sheer(0) - QD_H, WALL, 0, (sheer(0) + QD_H) / 2, ZS - WALL / 2));
  P.add('goldHammer', box(beam(0) * 2 + 0.1, 0.12, WALL + 0.12, 0, sheer(0) + 0.06, ZS - WALL / 2));
  const zq = zAt(QD_S), zf = zAt(FC_S);
  P.add('gunmetal', box(inner(QD_S) * 2, QD_H, 0.3, 0, QD_H / 2, zq - 0.15));
  P.add('gunmetal', box(inner(FC_S) * 2, FC_H, 0.3, 0, FC_H / 2, zf + 0.15));

  // Stairs: iron treads with gold nosing, 4 tiles wide.
  const stairs = (z0, dir, h, n) => {
    const rise = h / n, run = 4 / n, w = STAIR_W;
    for (let i = 0; i < n; i++) {
      const y = rise * (n - i), z = z0 + dir * run * (i + 0.5);
      P.add('iron', box(w, y, run, 0, y / 2, z));
      P.add('goldHammer', box(w, 0.05, 0.08, 0, y + 0.01, z + dir * (run / 2 - 0.04)));
    }
    for (const sx of [-1, 1]) {
      const g = new THREE.BoxGeometry(0.26, 0.4, run * n * Math.hypot(1, h / (run * n)) + 0.2);
      g.rotateX(dir * Math.atan2(h, run * n)); g.translate(sx * (w / 2 - 0.13), h / 2 + 0.16, z0 + dir * run * n / 2);
      P.add('gunmetal', g);
    }
    return z0 + dir * run * n;
  };
  const qFoot = stairs(zq, -1, QD_H, QD_STAIRS[2]), fFoot = stairs(zf, 1, FC_H, FC_STAIRS[2]);

  const lantern = (x, y, z, k = 1) => {
    P.add('iron', box(0.32 * k, 0.06, 0.32 * k, x, y, z));
    P.add('glass', box(0.22 * k, 0.32 * k, 0.22 * k, x, y + 0.19 * k, z));
    for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) P.add('iron', box(0.04, 0.34 * k, 0.04, x + dx * 0.12 * k, y + 0.19 * k, z + dz * 0.12 * k));
    P.add('goldHammer', new THREE.ConeGeometry(0.21 * k, 0.32 * k, 4).rotateY(Math.PI / 4).translate(x, y + 0.5 * k, z));
    glow.push({ x, y: y + 0.19 * k, z, r: 1.6 * k, c: 0xffa040 });
  };
  const finial = (x, y, z, r = 0.09) => P.add('goldHammer', new THREE.SphereGeometry(r, 6, 4).translate(x, y + r, z));
  const rail = (x0, x1, y, z) => {
    const len = Math.abs(x1 - x0), cx = (x0 + x1) / 2, n = Math.max(2, Math.round(len / 0.5));
    for (let i = 0; i <= n; i++) P.add('iron', box(0.1, 0.66, 0.1, x0 + (x1 - x0) * i / n, y + 0.33, z));
    P.add('goldHammer', box(len + 0.16, 0.12, 0.22, cx, y + 0.72, z));
    P.add('iron', box(len, 0.08, 0.12, cx, y + 0.14, z));
    for (const x of [x0, x1]) { P.add('gunmetal', box(0.3, 1.0, 0.3, x, y + 0.5, z)); finial(x, y + 1.0, z, 0.13); }
  };
  rail(-inner(QD_S) + 0.1, -2.2, QD_H, zq + 0.12); rail(2.2, inner(QD_S) - 0.1, QD_H, zq + 0.12);   // on the quarterdeck's edge (its own tiles)
  lantern(-2.2, QD_H + 1.26, zq + 0.12, 0.8); lantern(2.2, QD_H + 1.26, zq + 0.12, 0.8);
  rail(-inner(FC_S) + 0.1, -2.2, FC_H, zf + 0.12); rail(2.2, inner(FC_S) - 0.1, FC_H, zf + 0.12);

  // Gothic doors under the raised decks: oak in iron straps under a gilded pointed arch.
  const door = (x, z, face) => {
    const flat = (w, hs, h, dz) => { const g = new THREE.ShapeGeometry(archShape(w, hs, h), 6); if (face < 0) g.rotateY(Math.PI); return g.translate(x, 0, z + face * dz); };
    P.add('dark', flat(1.4, 1.35, 1.95, 0.02));
    P.add('scroll', flat(1.2, 1.3, 1.82, 0.05));
    for (const y of [0.4, 1.1]) P.add('iron', box(1.2, 0.08, 0.05, x, y, z + face * 0.07));
    const fr = archFrame(1.4, 1.35, 1.95, 0.18, 0.14);
    if (face < 0) fr.translate(0, 0, -0.14);
    P.add('goldHammer', fr.translate(x, 0, z));
  };
  door(-3.0, zf + 0.3, 1); door(3.0, zf + 0.3, 1); door(-3.8, zq - 0.3, -1); door(3.8, zq - 0.3, -1);
  const LAMPS = [0.1, 0.3, 0.45, 0.6, 0.72];
  for (const s of LAMPS) for (const side of [-1, 1]) lantern(side * (inner(s) + WALL / 2), sheer(s) + 0.12, zAt(s), 0.75);
  // Crenellations along the bulwarks.
  for (const [s0, s1] of [[0.02, 0.165], [0.24, 0.76]]) for (let z = zAt(s0); z > zAt(s1); z -= 1.3) for (const side of [-1, 1]) {
    const s = sAt(z); if (LAMPS.some((q) => Math.abs(zAt(q) - z) < 0.6)) continue;
    P.add('gunmetal', box(0.34, 0.36, 0.55, side * (inner(s) + WALL / 2), sheer(s) + 0.3, z));
  }

  // Broadside batteries: two gun decks of arched ports between buttresses.
  const ports = [];
  for (let z = zAt(0.39); z > zAt(0.745); z -= 1.5) ports.push(z);
  for (const side of [-1, 1]) {
    for (const z of ports) for (const k of [0.13, 0.31]) {
      const s = sAt(z), y = yAtK(s, k), x = side * hullX(s, y);
      P.add('bronze', box(0.14, 0.98, 0.84, x + side * 0.05, y, z));
      P.add('dark', box(0.16, 0.72, 0.56, x + side * 0.08, y - 0.04, z));
      for (const d of [-1, 1]) P.add('goldHammer', new THREE.BoxGeometry(0.14, 0.08, 0.5).rotateX(d * 0.6).translate(x + side * 0.1, y + 0.5, z + d * 0.19));
      P.add('gunmetal', rod([x, y - 0.06, z], [x + side * 0.85, y - 0.04, z], 0.15, 0.13, 8));
      anchors.ports.push([x + side * 0.95, y - 0.04, z, side]);
      P.add('goldHammer', rod([x + side * 0.8, y - 0.04, z], [x + side * 0.92, y - 0.04, z], 0.16, 0.16, 8));
    }
    for (const z of [...ports.map((p) => p + 0.75), ports[ports.length - 1] - 0.75]) {
      const s = sAt(z), y0 = sheer(s) - 0.05, y1 = yAtK(s, 0.42), x = side * (beam(s) + 0.12);
      P.add('iron', box(0.26, y0 - y1, 0.32, x, (y0 + y1) / 2, z));
      P.add('goldHammer', new THREE.ConeGeometry(0.2, 0.42, 4).rotateY(Math.PI / 4).translate(x, y0 + 0.2, z));
    }
  }

  // Prow: a heavy iron ram tapering to a spur, gold-edged, under a gilded winged crest.
  {
    const sh = new THREE.Shape([[19.2, 2.3], [21.5, 1.75], [24.6, 0.85], [21.3, 0.15], [19.2, -0.3]].map(([x, y]) => new THREE.Vector2(x, y)));
    const g = new THREE.ExtrudeGeometry(sh, { depth: 0.7, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.08, bevelSegments: 1 });
    g.translate(0, 0, -0.35);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setZ(i, pos.getZ(i) * (1 - Math.min(1, Math.max(0, (pos.getX(i) - 19.2) / 5.4)) * 0.75));
    g.computeVertexNormals(); g.rotateY(Math.PI / 2);
    P.add('iron', g);
    P.add('goldHammer', rod([0, 2.35, -19.2], [0, 1.8, -21.5], 0.1, 0.09, 6));
    P.add('goldHammer', rod([0, 1.8, -21.5], [0, 0.88, -24.6], 0.09, 0.05, 6));
    P.add('goldHammer', rod([0, -0.32, -19.2], [0, 0.85, -24.6], 0.08, 0.05, 6));
    for (const side of [-1, 1]) for (const [x, y] of [[20.6, 1.0], [22.2, 1.05], [23.6, 0.9]]) P.add('bronze', new THREE.SphereGeometry(0.1, 6, 4).translate(side * (0.45 - (x - 19.2) * 0.06), y, -x));
    // armored prow plating: gilded strakes along the bow and plate seams between them
    for (const side of [-1, 1]) {
      const at = (s, k) => { const y = yAtK(s, k); return [side * (hullX(s, y) + 0.06), y, zAt(s)]; };
      for (const k of [0.16, 0.36, 0.58]) for (let i = 0; i < 8; i++) {
        const s0 = lerp(0.78, 0.985, i / 8), s1 = lerp(0.78, 0.985, (i + 1) / 8);
        P.add('goldHammer', rod(at(s0, k), at(s1, k), 0.07, 0.07, 4));
      }
      for (const s of [0.82, 0.87, 0.92, 0.96]) for (const [k0, k1] of [[0.16, 0.36], [0.36, 0.58]]) {
        P.add('bronze', rod(at(s, k0), at(s + 0.012, k1), 0.06, 0.06, 4));
        for (const k of [k0 + 0.05, k1 - 0.05]) P.add('goldHammer', new THREE.SphereGeometry(0.09, 6, 4).translate(...at(s + 0.006, k)));
      }
    }
    const cz = -20.2, cy = 4.2;
    P.add('goldHammer', new THREE.SphereGeometry(0.6, 12, 8).scale(1, 1.1, 0.9).translate(0, cy, cz));
    for (const sx of [-0.22, 0.22]) P.add('glass', new THREE.SphereGeometry(0.11, 6, 4).translate(sx, cy + 0.12, cz - 0.5));
    P.add('goldHammer', new THREE.ConeGeometry(0.2, 0.7, 6).rotateX(-Math.PI / 2).translate(0, cy - 0.1, cz - 0.8));
    for (const side of [-1, 1]) {
      const R = [side * 0.4, cy, cz + 0.1], T = [side * 4.4, cy + 2.9, cz + 3.0], pts = [], idx = [], n = 8;
      for (let i = 0; i <= n; i++) {
        const t = i / n, lead = R.map((r, j) => r + (T[j] - r) * t + (j === 1 ? Math.sin(Math.PI * t) * 0.6 : 0));
        const drop = (2.0 - 1.3 * t) * (i % 2 ? 0.78 : 1);
        pts.push(lead, [lead[0] - side * 0.3 * drop, lead[1] - drop, lead[2] + 0.6 * drop]);
      }
      for (let i = 0; i < n; i++) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3, a, a + 1, a + 2, a + 1, a + 3, a + 2); }
      P.add('goldHammer', tris(pts, idx));
      P.add('bronze', rod(R, T, 0.16, 0.07, 6));
    }
  }

  // The cathedral bridge on the forecastle: three tiers of dark iron with lancet windows, crenellations, spires,
  // flying buttresses, a rose window and banners. Its great door is the party's arrival portal.
  const outline = (s0, s1, inset, y) => {
    const pts = [], n = 6;
    for (let i = 0; i <= n; i++) { const s = lerp(s0, s1, i / n); pts.push([Math.max(0.3, inner(s) - inset), y, zAt(s)]); }
    for (let i = n; i >= 0; i--) { const s = lerp(s0, s1, i / n); pts.push([-Math.max(0.3, inner(s) - inset), y, zAt(s)]); }
    return pts;
  };
  const lancet = (x, yb, z, w, h, rotY = 0) => {      // an arched window facing +Z, or turned by rotY
    for (const [m, g] of [['glass', new THREE.ShapeGeometry(archShape(w, h * 0.72, h), 5).translate(0, 0, 0.02)], ['goldHammer', archFrame(w, h * 0.72, h, 0.08, 0.06)],
      ['iron', box(0.05, h * 0.92, 0.05, 0, h * 0.46, 0.05)]]) { g.rotateY(rotY); g.translate(x, yb, z); P.add(m, g); }
  };
  const sideLancets = (s0, s1, inset, yb, h, n) => {
    for (const side of [-1, 1]) for (let i = 0; i < n; i++) {
      const sa = lerp(s0, s1, (i + 0.25) / n), sb = lerp(s0, s1, (i + 0.75) / n), sc = (sa + sb) / 2;
      const dz = zAt(sb) - zAt(sa), dx = side * ((inner(sb) - inset) - (inner(sa) - inset));
      const nx = side * -dz, nz = side * dx, l = Math.hypot(nx, nz);
      lancet(side * (inner(sc) - inset) + nx / l * 0.01, yb, zAt(sc) + nz / l * 0.01, 0.5, h, Math.atan2(nx / l, nz / l));
    }
  };
  const merlons = (s0, s1, inset, y) => {
    const o = outline(s0, s1, inset - 0.08, y);
    for (let i = 0; i < o.length; i++) {
      const a = o[i], b = o[(i + 1) % o.length], n = Math.floor(Math.hypot(b[0] - a[0], b[2] - a[2]) / 0.7);
      for (let j = 0; j < n; j++) { const t = (j + 0.5) / n; P.add('gunmetal', box(0.26, 0.34, 0.26, lerp(a[0], b[0], t), y + 0.17, lerp(a[2], b[2], t))); }
    }
  };
  const spire = (x, y, z, r, h) => {
    P.add('iron', box(r * 2, r * 2.2, r * 2, x, y + r * 1.1, z));
    P.add('goldHammer', box(r * 2.2, 0.08, r * 2.2, x, y + r * 2.2, z));
    P.add('gunmetal', new THREE.ConeGeometry(r * 1.05, h, 8).translate(x, y + r * 2.2 + h / 2, z));
    finial(x, y + r * 2.2 + h - 0.05, z, r * 0.45);
  };
  const tier = (s0, s1, inset, y0, h) => {
    P.add('gunmetal', slab(outline(s0, s1, inset, y0 + h), h));
    P.add('goldHammer', slab(outline(s0 - 0.002, s1 + 0.002, inset - 0.07, y0 + h + 0.1), 0.12));
    merlons(s0, s1, inset, y0 + h + 0.1);
    return { z: zAt(s0), hw: inner(s0) - inset, top: y0 + h + 0.1 };
  };
  const T1 = tier(TOWER[0], TOWER[1], 0.35, FC_H, 3.4);
  const T2 = tier(0.85, 0.93, 0.95, T1.top, 2.3);
  const T3 = tier(0.863, 0.912, 1.5, T2.top, 1.5);
  sideLancets(TOWER[0], TOWER[1], 0.35, FC_H + 1.2, 1.6, 3);
  sideLancets(0.85, 0.93, 0.95, T2.top - 1.9, 1.3, 2);
  for (const x of [-2.95, 2.95]) lancet(x, FC_H + 1.1, T1.z + 0.01, 0.55, 1.7);
  lancet(0, T3.top - 1.35, T3.z + 0.01, 0.8, 1.1);
  for (const side of [-1, 1]) {
    spire(side * (T1.hw - 0.05), T1.top, T1.z + 0.05, 0.32, 2.3);
    spire(side * (T2.hw - 0.05), T2.top, T2.z + 0.05, 0.26, 1.9);
    P.add('iron', rod([side * (T2.hw - 0.1), T2.top - 0.5, T2.z + 0.1], [side * (T1.hw - 0.15), T1.top + 0.6, T1.z + 0.15], 0.11, 0.11, 5));
    P.add('iron', rod([side * (T2.hw - 0.1), T2.top - 1.4, T2.z + 0.1], [side * (T1.hw - 0.15), T1.top + 0.2, T1.z + 0.6], 0.09, 0.09, 5));
  }
  { // rose window on the second tier, banners either side
    const y = T2.top - 1.25, z = T2.z + 0.02;
    P.add('glass', new THREE.CircleGeometry(0.78, 20).translate(0, y, z));
    P.add('goldHammer', new THREE.TorusGeometry(0.82, 0.09, 5, 24).translate(0, y, z + 0.02));
    P.add('goldHammer', new THREE.TorusGeometry(0.3, 0.05, 4, 16).translate(0, y, z + 0.03));
    for (let i = 0; i < 8; i++) P.add('goldHammer', box(0.05, 0.5, 0.04, 0, 0.55, 0).rotateZ(i * Math.PI / 4).translate(0, y, z + 0.03));
    glow.push({ x: 0, y, z: z + 0.2, r: 2.4, c: 0xffa040 });
    for (const sx of [-1.75, 1.75]) {
      P.add('goldHammer', rod([sx - 0.45, T2.top - 0.3, z + 0.12], [sx + 0.45, T2.top - 0.3, z + 0.12], 0.04, 0.04, 4));
      const b = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.7, 1, 4).translate(0, -0.85, 0), M.plum);
      b.position.set(sx, T2.top - 0.32, z + 0.14); root.add(b); sway.push(b);
    }
  }
  let pennant;
  { // the central spire
    const z = zAt(0.888), y = T3.top;
    P.add('iron', new THREE.CylinderGeometry(0.85, 0.95, 1.7, 8).translate(0, y + 0.85, z));
    for (let i = 0; i < 8; i += 2) { const a = i * Math.PI / 4 + Math.PI / 8; lancet(Math.sin(a) * 0.9, y + 0.3, z + Math.cos(a) * 0.9, 0.3, 1.0, a); }
    P.add('goldHammer', new THREE.CylinderGeometry(1.0, 1.0, 0.12, 8).translate(0, y + 1.76, z));
    P.add('gunmetal', new THREE.ConeGeometry(0.98, 5.8, 8).translate(0, y + 1.8 + 2.9, z));
    for (const f of [0.3, 0.6]) P.add('goldHammer', new THREE.CylinderGeometry(0.98 * (1 - f) + 0.05, 0.98 * (1 - f) + 0.05, 0.1, 8).translate(0, y + 1.8 + 5.8 * f, z));
    finial(0, y + 7.5, z, 0.22);
    P.add('iron', rod([0, y + 7.8, z], [0, y + 9.0, z], 0.04, 0.04, 4));
    pennant = flag(M.plum, 4.4, 0.7, [0, y + 9.0, z], 0.12, 'pennant');
  }

  // The arrival portal in the great door: a gilded pointed arch over a swirling gate (the game's portal colours),
  // braziers either side, a rune ring on the landing. arrive() flares it as a hero steps through.
  const PW = 2.3, PHS = 1.9, PH = 3.0, gz = T1.z + 0.04;
  const portalMat = new THREE.ShaderMaterial({
    uniforms: { t: { value: 0 }, flash: { value: 0 }, w: { value: PW }, h: { value: PH } },
    vertexShader: 'varying vec2 vUv; uniform float w; uniform float h; void main(){ vUv = vec2(position.x / w + 0.5, position.y / h); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `varying vec2 vUv; uniform float t; uniform float flash;
      void main(){
        vec2 p = (vUv - vec2(0.5, 0.42)) * vec2(1.0, 0.72);
        float r = length(p), a = atan(p.y, p.x);
        float s = sin(a * 3.0 - r * 22.0 + t * 3.2) * 0.5 + 0.5;
        float s2 = sin(a * 5.0 + r * 15.0 - t * 2.1) * 0.5 + 0.5;
        float core = smoothstep(0.42, 0.0, r);
        vec3 col = mix(vec3(0.28, 0.02, 0.02), vec3(1.0, 0.31, 0.12), s * 0.75 + s2 * 0.25);
        col = mix(col, vec3(1.0, 0.62, 0.3), core * 0.6);
        col = mix(col, vec3(1.0, 0.96, 0.88), pow(core, 3.0) * (0.85 + flash));
        col *= 0.95 + 0.1 * sin(t * 7.0) + flash * 1.4;
        gl_FragColor = vec4(col, 1.0);
      }` });
  const gate = new THREE.Mesh(new THREE.ShapeGeometry(archShape(PW, PHS, PH), 12), portalMat);
  gate.position.set(0, FC_H, gz); gate.name = 'portal'; if (live) root.add(gate);
  anchors.gate = { x: 0, y: FC_H, z: gz, w: PW, hs: PHS, h: PH };
  {
    const fr = new THREE.ExtrudeGeometry(Object.assign(archShape(PW + 0.7, PHS + 0.05, PH + 0.45), { holes: [archShape(PW, PHS, PH)] }),
      { depth: 0.4, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.05, bevelSegments: 1, curveSegments: 12 });
    P.add('goldHammer', fr.translate(0, FC_H, gz - 0.1));
    for (const sx of [-1, 1]) {                         // columns with capitals
      P.add('iron', box(0.4, PHS + 0.2, 0.45, sx * (PW / 2 + 0.55), FC_H + (PHS + 0.2) / 2, gz + 0.1));
      P.add('goldHammer', box(0.55, 0.16, 0.6, sx * (PW / 2 + 0.55), FC_H + PHS + 0.25, gz + 0.1));
      P.add('goldHammer', box(0.55, 0.16, 0.6, sx * (PW / 2 + 0.55), FC_H + 0.08, gz + 0.1));
    }
    P.add('goldHammer', new THREE.SphereGeometry(0.28, 8, 6).translate(0, FC_H + PH + 0.55, gz + 0.25));   // keystone, with wings
    for (const side of [-1, 1]) P.add('goldHammer', tris([[0, FC_H + PH + 0.5, gz + 0.32], [side * 1.2, FC_H + PH + 1.0, gz + 0.32], [side * 0.95, FC_H + PH + 0.4, gz + 0.32],
      [side * 0.65, FC_H + PH + 0.2, gz + 0.32]], [0, 2, 1, 0, 1, 2, 0, 3, 2, 0, 2, 3]));
    P.add('iron', box(PW + 0.5, 0.12, 0.6, 0, FC_H + 0.06, gz + 0.3));                              // threshold
    for (const sx of [-1, 1]) {                         // braziers
      const x = sx * (PW / 2 + 1.2), z = gz + 0.5;
      P.add('iron', rod([x, FC_H, z], [x, FC_H + 0.9, z], 0.08, 0.06, 6));
      P.add('bronze', new THREE.CylinderGeometry(0.32, 0.18, 0.28, 10).translate(x, FC_H + 1.02, z));
      const f = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.55, 6), M.ember); f.position.set(x, FC_H + 1.42, z); if (live) root.add(f); flames.push(f);
      anchors.braziers.push([x, FC_H + 1.2, z]);
      glow.push({ x, y: FC_H + 1.4, z, r: 1.8, c: 0xff6a20 });
    }
    glow.push({ x: 0, y: FC_H + 1.4, z: gz + 0.3, r: 4.5, c: 0xff5020 });
  }
  const ring = new THREE.Group(); ring.position.set(0, FC_H + 0.03, gz + 0.8); if (live) root.add(ring);
  for (let i = 0; i < 14; i++) { const a = i * Math.PI * 2 / 14, b = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.03, 0.08), M.ember); b.position.set(Math.cos(a) * 0.6, 0, Math.sin(a) * 0.6); b.rotation.y = -a + Math.PI / 2; ring.add(b); }
  const portalLight = new THREE.PointLight(0xff5a24, 18, 7, 1.6); portalLight.position.set(0, FC_H + 1.4, gz + 1.0); if (live) root.add(portalLight);
  const sparkTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 8; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(2, 2, 4, 4); x.fillStyle = '#ffd9a0'; x.fillRect(3, 0, 2, 8); x.fillRect(0, 3, 8, 2); return new THREE.CanvasTexture(c); })();
  const sparks = Array.from({ length: 36 }, () => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: sparkTex, color: 0xff8a40, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
    s.scale.setScalar(0.14); if (live) root.add(s); s.userData = { life: Math.random() * 2, max: 1 }; return s;
  });
  let flash = 0;
  const respawn = (s, burst) => {
    const a = Math.random() * Math.PI * 2, r = Math.random() * 0.8;
    s.position.set(Math.cos(a) * r * 0.9, FC_H + 1.3 + Math.sin(a) * r * 1.2, gz + 0.05);
    s.userData = { life: 0, max: 0.8 + Math.random() * 1.2, v: new THREE.Vector3((Math.random() - 0.5) * (burst ? 3 : 0.8), (Math.random() - 0.2) * (burst ? 2.5 : 0.6), 0.5 + Math.random() * (burst ? 3.5 : 1.2)) };
  };

  // Steam engines on iron trusses: brass boilers, twin stacks venting steam, big props astern.
  for (const side of [-1, 1]) {
    const x = side * 10, y = -3.0, z0 = 1.4, z1 = 9.4, zc = (z0 + z1) / 2, r = 1.25;
    P.add('brass', new THREE.CylinderGeometry(r, r, z1 - z0, 20).rotateX(Math.PI / 2).translate(x, y, zc), { swap: true });
    for (const z of [z0 + 0.4, zc - 1.3, zc + 1.3, z1 - 0.4]) P.add('iron', new THREE.CylinderGeometry(r + 0.07, r + 0.07, 0.28, 20).rotateX(Math.PI / 2).translate(x, y, z));
    P.add('goldHammer', new THREE.SphereGeometry(r, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(-Math.PI / 2).scale(1, 1, 1.3).translate(x, y, z0));
    P.add('iron', new THREE.ConeGeometry(r, 1.4, 20).rotateX(Math.PI / 2).translate(x, y, z1 + 0.7));
    for (const dz of [-1.6, 1.0]) {
      const sx = x + side * 0.15, sz = zc + dz;
      P.add('gunmetal', rod([sx, y + r - 0.2, sz], [sx, y + r + 2.0, sz + 0.2], 0.24, 0.3, 10));
      P.add('bronze', new THREE.CylinderGeometry(0.38, 0.34, 0.25, 10).translate(sx, y + r + 2.0, sz + 0.2));
      const st = smoke([sx, y + r + 2.2, sz + 0.2], 6, ['#e8eaef', '#c9ced8'], 2.2, 0.9); if (live) root.add(st.grp); fx.push(st);
      anchors.stacks.push([sx, y + r + 2.2, sz + 0.2]);
    }
    for (const [hy, hz] of [[-1.8, z0 + 0.8], [-1.8, z1 - 0.8], [-4.2, zc]]) {                    // truss
      P.add('iron', rod([side * (hullX(sAt(hz), hy) - 0.2), hy, hz], [x - side * (r - 0.1), y + (hy > -3 ? 0.6 : -0.6), hz], 0.15, 0.15, 6));
    }
    for (const hz of [z0 + 0.8, z1 - 0.8]) P.add('iron', rod([side * (hullX(sAt(hz), -1.8) - 0.2), -1.8, hz], [x - side * (r - 0.2), y - 0.5, zc], 0.09, 0.09, 4));
    const prop = new THREE.Group(), R = new Parts(M); prop.position.set(x, y, z1 + 1.5);
    R.add('goldHammer', new THREE.ConeGeometry(0.4, 0.8, 12).rotateX(Math.PI / 2));
    for (let i = 0; i < 4; i++) {
      const g = new THREE.BoxGeometry(0.7, 2.3, 0.08), pos = g.attributes.position;
      for (let v = 0; v < pos.count; v++) { const t = (pos.getY(v) + 1.15) / 2.3; pos.setX(v, pos.getX(v) * (1.15 - 0.6 * Math.abs(t - 0.5))); pos.setZ(v, pos.getZ(v) + pos.getX(v) * 0.5); pos.setY(v, pos.getY(v) + 1.3); }
      g.computeVertexNormals(); g.rotateZ(i * Math.PI / 2); R.add('bronze', g);
    }
    prop.add(R.build('prop')); if (live) root.add(prop); spin.push({ o: prop, axis: 'z', w: side * 12 });
    anchors.props.push({ group: prop, x, y, z: z1 + 1.5, side });
  }

  // Furnaces at the stern: two engine sponsons along the quarters and three through the transom, each a bronze bell
  // glowing like a forge and venting steam.
  const furnace = (x, y, z, r, len) => {
    P.add('bronze', new THREE.CylinderGeometry(r + 0.35, r, 0.9, 20, 1, true).rotateX(Math.PI / 2).translate(x, y, z + 0.45));
    P.add('goldHammer', new THREE.TorusGeometry(r + 0.36, 0.1, 5, 24).translate(x, y, z + 0.9));
    P.add('ember', new THREE.CircleGeometry(r * 0.95, 20).translate(x, y, z + 0.3));
    const pl = plume(r * 0.85, len, 0xff6a1a); pl.position.set(x, y, z + 0.35); if (live) root.add(pl); fx.push(pl);
    const st = smoke([x, y + 0.2, z + 1.2], 7, ['#dfe2e8', '#b8bdc8'], 1.4, 1.2); if (live) root.add(st.grp); fx.push(st);
    anchors.furnaces.push([x, y, z + 0.35, r]);
    glow.push({ x, y, z: z + 1.0, r: r * 3.2, c: 0xff7a2a });
  };
  for (const side of [-1, 1]) {
    const x = side * (beam(0.2) + 0.55), y = -1.3, z0 = 6.6, z1 = 20.6, r = 1.35;
    P.add('gunmetal', new THREE.CylinderGeometry(r, r, z1 - z0, 22).rotateX(Math.PI / 2).translate(x, y, (z0 + z1) / 2), { swap: true });
    P.add('iron', new THREE.ConeGeometry(r, 2.2, 22).rotateX(-Math.PI / 2).translate(x, y, z0 - 1.1));
    P.add('goldHammer', new THREE.TorusGeometry(r * 0.55, 0.1, 5, 18).translate(x, y, z0 - 1.1));
    finial(x, y - 0.12, z0 - 2.25, 0.16);
    for (const z of [z0 + 0.3, z0 + 4.6, z0 + 9.0, z1 - 0.5]) P.add('goldHammer', new THREE.CylinderGeometry(r + 0.08, r + 0.08, 0.3, 22).rotateX(Math.PI / 2).translate(x, y, z));
    for (let z = z0 + 1.4; z < z1 - 1; z += 1.45) P.add('glass', new THREE.SphereGeometry(0.15, 6, 4).translate(x + side * (r - 0.06), y + 0.35, z));
    furnace(x, y, z1, r * 0.8, 3.2);
  }
  for (const [x, y, r] of [[-2.6, -1.4, 1.15], [2.6, -1.4, 1.15], [0, -3.7, 0.8]]) {
    P.add('iron', new THREE.CylinderGeometry(r + 0.1, r + 0.2, 0.6, 20).rotateX(Math.PI / 2).translate(x, y, ZS + 0.25));
    furnace(x, y, ZS + 0.5, r, 2.6 + r);
  }
  // Stern gallery: gothic lancets above the furnaces.
  for (let i = 0; i < 5; i++) lancet((i - 2) * 1.35, QD_H - 1.65, ZS + 0.02, 0.7, 1.3);
  P.add('goldHammer', box(7.4, 0.16, 0.3, 0, QD_H - 1.75, ZS + 0.12));
  // Ventral keel fin under the stern.
  {
    const z0 = zAt(0.24), sh = new THREE.Shape();
    sh.moveTo(0, keel(0.24) + 0.3); sh.lineTo((ZS - z0) * 0.5, keel(0.12) - 2.0); sh.lineTo(ZS - z0 - 0.6, keel(0) - 2.6); sh.lineTo(ZS - z0 - 1.6, keel(0.02) + 0.4);
    const g = new THREE.ExtrudeGeometry(sh, { depth: 0.3, bevelEnabled: false });
    g.rotateY(-Math.PI / 2); g.translate(0.15, 0, z0);
    P.add('iron', g);
    P.add('goldHammer', rod([0, keel(0.24) + 0.3, z0], [0, keel(0.12) - 2.0, z0 + (ZS - z0) * 0.5], 0.14, 0.14, 6));
    P.add('goldHammer', rod([0, keel(0.12) - 2.0, z0 + (ZS - z0) * 0.5], [0, keel(0) - 2.6, ZS - 0.6], 0.14, 0.14, 6));
  }

  // Turrets on the quarterdeck corners, sweeping slowly.
  const turret = (x, y, z, base, dome, len, sweep) => {
    const g = new THREE.Group(), T = new Parts(M); g.position.set(x, y, z);
    T.add('iron', new THREE.SphereGeometry(dome, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.75, 1.15));
    T.add('goldHammer', new THREE.TorusGeometry(dome, 0.08, 4, 18).rotateX(Math.PI / 2));
    T.add('goldHammer', new THREE.SphereGeometry(0.14, 6, 4).translate(0, dome * 0.75, 0));
    for (const dx of [-0.24, 0.24]) {
      T.add('gunmetal', rod([dx, dome * 0.35, -dome * 0.6], [dx, dome * 0.35 + len * 0.08, -dome * 0.6 - len], 0.14, 0.11, 8));
      T.add('bronze', rod([dx, dome * 0.35 + len * 0.08, -dome * 0.6 - len], [dx, dome * 0.35 + len * 0.085, -dome * 0.6 - len - 0.2], 0.16, 0.16, 8));
    }
    g.add(T.build('turret')); root.add(g);
    turrets.push({ o: g, base, sweep, ph: turrets.length * 1.7 });
  };
  for (const side of [-1, 1]) {
    const x = side * (inner(0.06) - 1.2), z = zAt(0.06);
    P.add('iron', new THREE.CylinderGeometry(0.9, 1.05, 0.38, 16).translate(x, QD_H + 0.19, z));
    P.add('goldHammer', new THREE.TorusGeometry(1.0, 0.07, 4, 18).rotateX(Math.PI / 2).translate(x, QD_H + 0.38, z));
    turret(x, QD_H + 0.38, z, -side * (Math.PI - 0.7), 0.85, 2.4, 0.6);
  }

  // Helm: an iron-and-gold wheel and a brass binnacle.
  {
    const z = zAt(0.14), y = QD_H;
    P.add('gunmetal', box(0.5, 1.1, 0.5, 0, y + 0.55, z));
    const wheel = new THREE.Group(), W = new Parts(M); wheel.position.set(0, y + 1.25, z - 0.32);
    W.add('iron', new THREE.TorusGeometry(0.66, 0.07, 6, 20));
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; W.add('goldHammer', rod([0, 0, 0], [Math.cos(a) * 0.88, Math.sin(a) * 0.88, 0], 0.04, 0.035, 5)); }
    W.add('goldHammer', new THREE.CylinderGeometry(0.15, 0.15, 0.2, 10).rotateX(Math.PI / 2));
    wheel.add(W.build('wheel')); root.add(wheel);
    P.add('brass', new THREE.CylinderGeometry(0.28, 0.34, 1.0, 10).translate(0, y + 0.5, z + 1.1));
    P.add('glass', new THREE.SphereGeometry(0.26, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, y + 1.0, z + 1.1));
  }
  // Lift crystals caged under the keel.
  for (const s of [0.3, 0.5, 0.7]) {
    const z = zAt(s), y = keel(s) - 2.0;
    P.add('iron', rod([0, keel(s) + 0.2, z], [0, y + 1.5, z], 0.18, 0.18, 8));
    P.add('goldHammer', new THREE.TorusGeometry(1.0, 0.1, 6, 16).rotateX(Math.PI / 2).translate(0, y + 1.3, z));
    P.add('goldHammer', new THREE.TorusGeometry(0.75, 0.1, 6, 16).rotateX(Math.PI / 2).translate(0, y - 1.3, z));
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; P.add('iron', rod([Math.cos(a), y + 1.3, z + Math.sin(a)], [Math.cos(a) * 0.75, y - 1.3, z + Math.sin(a) * 0.75], 0.07, 0.07, 4)); }
    const c = new THREE.Mesh(new THREE.OctahedronGeometry(0.85, 0).scale(1, 1.7, 1), M.crystal);
    c.position.set(0, y, z); c.name = 'crystal'; root.add(c); spin.push({ o: c, axis: 'y', w: 0.8 });
    anchors.crystals.push([0, y, z]);
    glow.push({ x: 0, y, z, r: 5, c: 0xa040ff, light: true, lr: 5 });
  }
  // Lift hatch in the middle of the main deck: an iron grate in gold, flush.
  {
    const z = (qFoot + fFoot) / 2;
    P.add('iron', new THREE.CircleGeometry(1.5, 24).rotateX(-Math.PI / 2).translate(0, 0.012, z));
    P.add('goldHammer', new THREE.TorusGeometry(1.7, 0.12, 4, 28).rotateX(Math.PI / 2).scale(1, 0.3, 1).translate(0, 0.03, z));
    P.add('bronze', new THREE.TorusGeometry(1.15, 0.07, 4, 28).rotateX(Math.PI / 2).scale(1, 0.3, 1).translate(0, 0.03, z));
    for (let i = 0; i < 4; i++) P.add('goldHammer', box(0.1, 0.03, 3.3, 0, 0, 0).rotateY(i * Math.PI / 4).translate(0, 0.02, z));
  }
  // Ensign at the stern.
  P.add('iron', rod([0, sheer(0) + 0.1, ZS - 0.2], [0, sheer(0) + 5.0, ZS + 0.4], 0.08, 0.06, 6));
  finial(0, sheer(0) + 4.95, ZS + 0.41, 0.17);
  const ensign = flag(M.plum, 3.6, 2.2, [0, sheer(0) + 4.95, ZS + 0.4], 0.32, 'ensign');

  root.add(P.build('ironclad'), pennant.mesh, ensign.mesh);
  root.traverse((o) => { if (o.isMesh && o.name !== 'plume' && o.name !== 'portal') { o.castShadow = true; o.receiveShadow = true; } });

  function anim(t, dt) {
    for (const s of spin) s.o.rotation[s.axis] += s.w * dt;
    for (const p of fx) (p.userData?.update || p.update)(t);
    for (const tr of turrets) tr.o.rotation.y = tr.base + Math.sin(t * 0.35 + tr.ph) * tr.sweep;
    sway.forEach((b, i) => { b.rotation.x = Math.sin(t * 1.3 + i) * 0.08 - 0.05; });
    flames.forEach((f, i) => { f.scale.set(1, 0.85 + 0.3 * Math.abs(Math.sin(t * 9 + i * 2)), 1); });
    pennant.update(t); ensign.update(t);
    flash = Math.max(0, flash - dt * 1.2);
    portalMat.uniforms.t.value = t; portalMat.uniforms.flash.value = flash;
    ring.rotation.y = t * 0.8; ring.scale.setScalar(1 + flash * 0.6);
    portalLight.intensity = 16 + 4 * Math.sin(t * 6) + flash * 60;
    for (const s of sparks) {
      const u = s.userData; u.life += dt;
      if (u.life > u.max) respawn(s, false);
      if (!u.v) continue;
      u.v.y -= dt * 1.2; s.position.addScaledVector(u.v, dt);
      s.material.opacity = Math.sin(Math.PI * Math.min(1, u.life / u.max));
    }
  }
  const info = { length: L + 4.6, beam: 2 * 6.2, mainDeck: { z0: fFoot, z1: qFoot, width: 2 * inner(0.5) }, walk: IRONCLAD, glow,
    portal: { gate: [0, FC_H, gz], path: [[0, FC_H, gz + 0.1], [0, FC_H, zf + 0.15], [0, 0, fFoot + 0.2], [0, 0, fFoot + 2.6]] } };
  /** The gate flares and throws sparks: call as a hero steps out. */
  const arrive = () => { flash = 1.3; for (const s of sparks) { respawn(s, true); s.userData.life = Math.random() * 0.2; } };
  anchors.lamps = glow.filter((g) => g.c === 0xffa040).map((g) => [g.x, g.y, g.z]);
  return { root, anim, info, arrive, anchors };
}
