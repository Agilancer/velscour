// THE LIGHTLESS: Velscour's dreadnought, flagship of the Black Tide (docs/PIRATE_SEAS.md). The evil mirror of the heroes'
// gothic ironclad (tools/airship3d_ironclad.js), taken to sea and made huge. Its work is putting out the coast's
// lighthouses, and it carries no lamps of its own: black riveted plate, black glass, unlit iron letters. The only light
// aboard is furnace light: the funnel throats, the turrets' firing slits and breech hatches, the stokehold grates
// under the deck and the slit ports of the conning tower. A ram forefoot under a raked stem and Velscour's thorned,
// bat-winged iron V; sheer rising and flaring to the bow, tumblehome amidships, an armour belt standing proud with the
// casemate sponsons bulging off it; three twin turrets (two forward, superfiring) and a secondary turret mid-deck that
// sweep slow arcs; two raked funnels; a spired gothic tower bridge.
// The fight runs bow to stern down the STARBOARD side (the side the game camera sees): the port side of the tower and
// funnels is closed by a deckhouse, the main deck has low cover (<= 2 high) and a turret beat mid-deck, and stairs
// under hoods lead down to the stern walk. Each turret has a glowing breech hatch at its rear: info.spikes.
// Bow toward -Z, starboard +X, main deck at y = 0; 1 unit = 1 tile.
import * as THREE from 'three';
import { Parts, box, rod, tris, flag, smoke, surf, dinghy, lines, TAU, lerp, clamp, sm, finish } from './seaship3d.js';
import { slab } from './airship3d.js';

const L = 74, ZS = L / 2, FC_S = 41 / 74, FC_H = 2.0, BW = 1.0, WALL = 0.32, WL = -3;
const zAt = (s) => ZS - s * L, sAt = (z) => (ZS - z) / L;
// the waterline half-beam, the sheer (a step at the forecastle, rising to the bow), the keel, the section shape
const bw = (s) => s < 0.18 ? 4.6 + 3.7 * Math.sin(s / 0.18 * Math.PI / 2) : s < 0.62 ? 8.3 : 8.3 * Math.pow(Math.max(0, 1 - ((s - 0.62) / 0.38) ** 2), 0.7);
const sheer = (s) => BW + FC_H * sm(FC_S - 0.004, FC_S + 0.004, s) + 1.5 * sm(0.72, 1, s) ** 1.6 + 0.35 * (1 - sm(0, 0.12, s));
const keel = (s) => -8 + 2.6 * (1 - sm(0, 0.14, s)) ** 1.4 + 3.0 * sm(0.84, 1, s);
const prof = (k) => Math.pow(Math.max(0, 1 - k ** 5), 0.35);
const flare = (s) => 0.34 * sm(0.62, 0.93, s);             // the bow sections open out above the water
const tumble = (s) => 0.08 * (1 - sm(0.5, 0.7, s));        // and lean in amidships and aft
const rake = (s) => 3.0 * sm(0.86, 1, s) ** 1.5;            // the stem leans back from the ram forefoot
/** A point of the hull side at s, k (0 = sheer .. 1 = keel), starboard: [x, y, z]. */
function sect(s, k) {
  const top = sheer(s), bot = keel(s), y = top - (top - bot) * k, h = clamp((y - WL) / Math.max(0.5, top - WL), 0, 1);
  return [bw(s) * prof(k) * (1 + (flare(s) - tumble(s)) * h), y, zAt(s) - rake(s) * k];
}
const kOf = (s, y) => clamp((sheer(s) - y) / Math.max(1e-3, sheer(s) - keel(s)), 0, 1);
const hx = (s, y) => sect(s, kOf(s, y))[0];
/** The hull side at s and height y on `side`, `out` proud of it: [x, y, z]. */
const at = (s, y, side, out = 0) => { const p = sect(s, kOf(s, y)); return [side * (p[0] + out), y, p[2]]; };
const inner = (s) => Math.max(0, sect(s, 0)[0] - WALL);
const deckAt = (s) => s >= FC_S ? FC_H : 0;
const ZB = zAt(FC_S);                                     // the forecastle break (z = -4)
const TR = 2.3;                                           // main turret house radius (barbettes TR + 0.35)
const TA = { id: 'A', x: 0, z: -28.4, y: FC_H, bh: 1.3, r: TR }, TB = { id: 'B', x: 0, z: -21.8, y: FC_H, bh: 3.9, r: TR };
const TD = { id: 'D', x: 2.4, z: 11.6, y: 0, bh: 0.8, r: 1.6 }, TC = { id: 'C', x: 0, z: 30.8, y: 0, bh: 1.8, r: TR };
const TW = { z0: -18.6, z1: -13.6, cz: -16.1 };           // the tower bridge
const CAS = { z0: -13.2, z1: -4.7, top: 3.3 };            // the funnel casing
const DH = { z0: -19.4, z1: ZB, x1: -2.3, top: FC_H + 2.6 };   // the port deckhouse closing the port lane
export const DREADNOUGHT = { L, FC_S, FC_H, zAt, sAt, inner, deckAt, sheer, keel, ZB, turrets: [TA, TB, TD, TC], tower: TW, casing: CAS, deckhouse: DH };

// ------------------------------------------------------------------ small shapes
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
/** Velscour's sigil: a bold V, its arms ending in spikes, thorns along the outer edges. Bottom tip at y -1.2, top 5.9. */
function vShape(thorns = true) {
  const B = [0, -1.2], RT = [3.35, 5.9], RI = [1.65, 4.35], N = [0, 1.15], LI = [-1.65, 4.35], LT = [-3.35, 5.9], pts = [B];
  const edge = (a, b, lean) => {
    const d = [b[0] - a[0], b[1] - a[1]], l = Math.hypot(d[0], d[1]), dn = [d[0] / l, d[1] / l], n = [dn[1], -dn[0]];
    if (thorns) for (const t of lean > 0 ? [0.26, 0.5, 0.74] : [0.17, 0.41, 0.65]) {
      const p = [a[0] + d[0] * t, a[1] + d[1] * t];
      pts.push(p, [p[0] + n[0] * 0.8 + dn[0] * 0.5 * lean, p[1] + n[1] * 0.8 + dn[1] * 0.5 * lean], [p[0] + d[0] * 0.09, p[1] + d[1] * 0.09]);
    }
  };
  edge(B, RT, 1); pts.push(RT, RI, N, LI, LT); edge(LT, B, -1);
  return new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
}
/** Ember cracks running up the V's arms (in the V's own frame, scale 1): polylines [[x, y], ...]. */
const V_CRACKS = [[[0.1, -0.6], [0.5, 0.4], [0.3, 1.3], [0.95, 2.2], [0.8, 3.0], [1.5, 3.9], [1.9, 4.6]], [[0.95, 2.2], [1.55, 2.4]],
  [[-0.15, -0.3], [-0.6, 0.7], [-0.4, 1.6], [-1.1, 2.5], [-0.95, 3.3], [-1.75, 4.3], [-2.4, 5.0]], [[-0.4, 1.6], [-0.05, 1.9]], [[-1.1, 2.5], [-1.7, 2.6]]];
/** Octagon outline (for slab) round (cx, cz), half sizes rx, rz, chamfer c, at height y. */
const oct = (cx, cz, rx, rz, c, y) => [[cx - rx + c, y, cz - rz], [cx + rx - c, y, cz - rz], [cx + rx, y, cz - rz + c], [cx + rx, y, cz + rz - c],
  [cx + rx - c, y, cz + rz], [cx - rx + c, y, cz + rz], [cx - rx, y, cz + rz - c], [cx - rx, y, cz - rz + c]];
// A 5 x 7 pixel font for the name boards.
const FONT = {
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'], H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'], L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  I: ['01110', '00100', '00100', '00100', '00100', '00100', '01110'], G: ['01110', '10001', '10000', '10111', '10001', '10001', '01111'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'], ' ': ['000', '000', '000', '000', '000', '000', '000'],
};
const textCols = (text) => { const cols = []; for (const ch of text) { const g = FONT[ch] || FONT[' ']; for (let c = 0; c < g[0].length; c++) cols.push(g.map((r) => r[c] === '1')); cols.push(Array(7).fill(false)); } cols.pop(); return cols; };

/** A heavy gothic twin turret, barrels toward -Z: an octagonal riveted gun house with a bustle, a sloped mantlet,
 *  furnace-lit firing slits, rangefinder ears, horns and a crown of spikes, and at its rear the breech hatch glowing
 *  round its seams (the spike point). Returns { g, cradle, spike } (cradle elevates; spike marks the hatch). */
function bigTurret(M, { r = TR, h = 2.0, len = 6.0, bore = 0.3, gap = 0.68 } = {}) {
  const g = new THREE.Group(), P = new Parts(M), k = r / TR;
  const oc = (r0, r1, hh, y, mat, z = 0.25 * k) => P.add(mat, new THREE.CylinderGeometry(r1, r0, hh, 8).rotateY(Math.PI / 8).scale(1, 1, 1.12).translate(0, y + hh / 2, z));
  oc(r, r * 0.88, h, 0, 'plate');
  oc(r * 0.88, r * 0.7, 0.34 * k, h, 'plate');
  oc(r * 1.03, r * 1.03, 0.2 * k, 0.0, 'bronze');
  oc(r * 0.9, r * 0.9, 0.12 * k, h - 0.08, 'gunmetal');
  const c8 = Math.cos(Math.PI / 8) * 1.12, fz = 0.25 * k - r * c8, rz = 0.25 * k + r * c8;      // front and rear faces at the base
  { const m = new THREE.BoxGeometry(r * 1.35, h * 0.86, 0.36 * k); m.rotateX(0.16); m.translate(0, h * 0.48, fz + 0.05); P.add('plate', m); }
  for (const sd of [-1, 1]) {
    P.add('furnace', box(0.75 * k, 0.07, 0.05, sd * r * 0.52, h * 0.8, fz + 0.14 * k));          // firing slits
    P.add('gunmetal', rod([sd * r * 0.75, h + 0.3 * k, 0.9 * k], [sd * (r + 0.55 * k), h + 0.3 * k, 0.9 * k], 0.2 * k, 0.2 * k, 10));   // rangefinder ears
    P.add('plate', box(0.5 * k, 0.5 * k, 0.55 * k, sd * (r + 0.6 * k), h + 0.3 * k, 0.9 * k));
    P.add('dark', box(0.04, 0.26 * k, 0.3 * k, sd * (r + 0.86 * k), h + 0.3 * k, 0.9 * k));
    P.add('iron', new THREE.ConeGeometry(0.2 * k, 1.3 * k, 6).translate(0, 0.65 * k, 0).rotateZ(-sd * 1.05).rotateX(0.55).translate(sd * r * 0.62, h + 0.2 * k, r * 0.95 + 0.2 * k));
  }
  for (let i = 0; i < 12; i++) {                            // a crown of spikes round the roof's edge
    const a = (i + 0.5) / 12 * TAU, x = Math.sin(a) * r * 0.86, z = 0.25 * k + Math.cos(a) * r * 0.86 * 1.12;
    if (Math.cos(a) < -0.75) continue;                      // none over the mantlet
    P.add('iron', new THREE.ConeGeometry(0.1 * k, 0.5 * k, 4).translate(0, 0.25 * k, 0).rotateZ(-Math.sin(a) * 0.4).rotateX(Math.cos(a) * 0.4).translate(x, h + 0.02, z));
  }
  P.add('plate', box(0.9 * k, 0.2, 0.9 * k, 0, h + 0.42 * k, 0.9 * k));
  for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; P.add('bronze', new THREE.SphereGeometry(0.07 * k, 5, 3).translate(Math.sin(a) * r * 1.0, 0.35 * k, 0.25 * k + Math.cos(a) * r * 1.12)); }
  // the breech hatch: an iron door in the bustle, its seams and grille glowing with the charge chamber's fire
  const hy = h * 0.46, hz = rz - h * 0.46 * 0.13, hw = 1.05 * k, hh = 0.95 * k;
  P.add('furnace', box(hw + 0.16, hh + 0.16, 0.08, 0, hy, hz - 0.02));
  P.add('gunmetal', box(hw, hh, 0.2, 0, hy, hz + 0.04));
  for (const dy of [-0.18, 0.02, 0.22]) P.add('furnace', box(hw * 0.55, 0.06, 0.05, 0, hy + dy * k, hz + 0.15));
  for (const sd of [-1, 1]) { P.add('iron', box(0.1, hh * 0.2, 0.12, sd * hw * 0.42, hy + hh * 0.3, hz + 0.16)); P.add('iron', box(0.1, hh * 0.2, 0.12, sd * hw * 0.42, hy - hh * 0.3, hz + 0.16)); }
  P.add('bronze', new THREE.TorusGeometry(0.16 * k, 0.04, 4, 10).translate(0, hy - 0.3 * k, hz + 0.18));
  g.add(P.build('turret'));
  const spike = new THREE.Object3D(); spike.name = 'spike'; spike.position.set(0, hy, hz + 0.3); g.add(spike);
  const cradle = new THREE.Group(), C = new Parts(M); cradle.position.set(0, h * 0.5, fz + 0.4 * k); g.add(cradle);
  for (const sd of [-1, 1]) {
    const x = sd * gap;
    C.add('blackSail', new THREE.CylinderGeometry(bore * 1.9, bore * 2.2, 0.6 * k, 10).rotateX(Math.PI / 2).translate(x, 0, -0.4 * k));   // blast bag
    C.add('gunmetal', rod([x, 0, 0.2], [x, 0, -len], bore * 1.45, bore, 14));
    for (const f of [0.18, 0.42]) C.add('iron', rod([x, 0, -len * f], [x, 0, -len * f - 0.22], bore * (1.42 - f * 0.3), bore * (1.42 - f * 0.3), 14));
    C.add('bronze', rod([x, 0, -len + 0.05], [x, 0, -len - 0.3], bore * 1.3, bore * 1.35, 14));
    C.add('dark', new THREE.CircleGeometry(bore * 0.75, 12).rotateY(Math.PI).translate(x, 0, -len - 0.31));
  }
  cradle.add(C.build('cradle'));
  return { g, cradle, spike };
}

export function buildDreadnought(M0) {
  // two local finishes: black glass with a faint red sheen, and a darker deck plate for the forecastle
  const M = Object.assign({}, M0, {
    blackGlass: new THREE.MeshStandardMaterial({ color: 0x120a0c, emissive: 0x2a0504, emissiveIntensity: 0.3, roughness: 0.12, metalness: 0.75 }),
    darkDeck: Object.assign(M0.plateDeck.clone(), { color: new THREE.Color(0x6a6466) }),
  });
  const root = new THREE.Group(); root.name = 'dreadnought';
  const P = new Parts(M), glow = [], fx = [], turrets = [], spin = [], rig = [], spikes = [];

  // ---------------------------------------------------------------- the hull
  const NS = 260;
  const bands = [['plate', null, -0.95, 6], ['plate', -0.95, -2.9, 3], ['plateRed', -2.9, -3.4, 2], ['copper', -3.4, null, 6]];
  for (const [mat, yt, yb, nk] of bands) for (const side of [1, -1]) P.add(mat, surf(NS, nk, (u, v) => {
    const k0 = yt == null ? 0 : kOf(u, yt), k1 = yb == null ? 1 : kOf(u, yb), p = sect(u, k0 + (k1 - k0) * v);
    return [side * p[0], p[1], p[2]];
  }, (u, v) => {
    const k0 = yt == null ? 0 : kOf(u, yt), k1 = yb == null ? 1 : kOf(u, yb), p = sect(u, k0 + (k1 - k0) * v);
    return [p[2] / 2, -p[1] / 2];
  }, side > 0), { uv: 'keep' });
  { // the transom, banded like the sides
    const band = (mat, y0, y1) => {
      const n = 12, l = [], r = [];
      for (let i = 0; i <= n; i++) { const y = lerp(y0, y1, i / n), x = hx(0, y); l.push(new THREE.Vector2(-x, y)); r.push(new THREE.Vector2(x, y)); }
      P.add(mat, new THREE.ShapeGeometry(new THREE.Shape([...r, ...l.reverse()])).translate(0, 0, ZS));
    };
    band('plate', sheer(0), -2.9); band('plateRed', -2.9, -3.4); band('copper', -3.4, keel(0) + 0.02);
  }
  for (const side of [1, -1]) {                               // bulwark inner faces and the cap rail
    P.add('plate', surf(NS, 1, (u, v) => [side * inner(u), v ? deckAt(u) - 0.05 : sheer(u), zAt(u)], (u, v) => [zAt(u) / 2, v * 0.6], side < 0), { uv: 'keep' });
    P.add('gunmetal', surf(NS, 1, (u, v) => [side * (v ? inner(u) - 0.05 : sect(u, 0)[0] + 0.06), sheer(u) + 0.12, zAt(u)], (u, v) => [zAt(u) / 2, v * 0.2], side < 0), { uv: 'keep' });
  }
  const deck = (mat, s0, s1, y) => P.add(mat, surf(Math.max(2, Math.ceil((s1 - s0) * NS)), 1, (u, v) => {
    const s = s0 + (s1 - s0) * u; return [(v * 2 - 1) * inner(s), y, zAt(s)];
  }, (u, v) => { const s = s0 + (s1 - s0) * u; return [zAt(s) / 2, (v * 2 - 1) * inner(s) / 2]; }, true), { uv: 'keep' });
  deck('scorched', 0.003, FC_S + 0.002, 0); deck('darkDeck', FC_S, 0.997, FC_H);
  /** A strip proud of the hull at height y (thickness th, out), from s0 to s1; `ledge` adds a chamfered top (bev high). */
  const strake = (mat, y, th, s0, s1, out, ledge, bev = 0.3) => {
    const n = Math.round((s1 - s0) * NS), o = (s) => out * sm(s0, s0 + 0.05, s) * (1 - sm(s1 - 0.05, s1, s));
    for (const side of [1, -1]) {
      const yt = y + th / 2 - (ledge ? bev : 0), ht = th - (ledge ? bev : 0);
      P.add(mat, surf(n, 2, (u, v) => { const s = lerp(s0, s1, u); return at(s, yt - ht * v, side, o(s) + 0.01); }, (u, v) => [zAt(lerp(s0, s1, u)) / 2, v * th / 2], side > 0), { uv: 'keep' });
      if (ledge) for (const fl of [true, false]) P.add(ledge, surf(n, 1, (u, v) => { const s = lerp(s0, s1, u); return at(s, y + th / 2 - bev * v, side, v * (o(s) + 0.01)); }, (u, v) => [zAt(lerp(s0, s1, u)) / 2, v * out], fl), { uv: 'keep' });
    }
  };
  // the armour belt: a heavy strake standing 0.4 proud from the waterline up, its top a visible ledge
  strake('plate', -2.15, 2.4, 0.04, 0.9, 0.55, 'plate', 0.35);
  strake('plate', 0.45, 0.55, 0.015, 0.975, 0.05);            // plate strakes on the topsides
  strake('gunmetal', 0.8, 0.1, 0.015, 0.975, 0.08);
  strake('plateRed', 2.45, 0.22, FC_S + 0.01, 0.985, 0.04);
  for (let z = zAt(0.07); z > zAt(0.88); z -= 2.4) for (const side of [1, -1]) {      // the belt's plate butts and rivets
    const s = sAt(z);
    P.add('iron', box(0.08, 2.0, 0.1, ...at(s, -2.3, side, 0.58)));
    for (const y of [-1.6, -2.5]) for (const dz of [-0.7, 0, 0.7]) P.add('bronze', new THREE.SphereGeometry(0.06, 5, 3).translate(...at(sAt(z + dz), y, side, 0.57)));
  }

  // ---------------------------------------------------------------- fittings
  const spike = (x, y, z, h = 0.5, r = 0.1, mat = 'gunmetal') => P.add(mat, new THREE.ConeGeometry(r, h, 4).translate(x, y + h / 2, z));
  const lancet = (x, yb, z, w, h, rotY = 0) => {              // a black-glazed pointed window facing +Z, turned by rotY
    for (const [m, g] of [['blackGlass', new THREE.ShapeGeometry(archShape(w, h * 0.72, h), 5).translate(0, 0, 0.02)], ['bronze', archFrame(w, h * 0.72, h, 0.08, 0.07)],
      ['iron', box(0.05, h * 0.92, 0.05, 0, h * 0.46, 0.06)], ['iron', box(w, 0.05, 0.05, 0, h * 0.5, 0.06)]]) { g.rotateY(rotY); g.translate(x, yb, z); P.add(m, g); }
  };
  const slit = (x, y, z, w, rotY = 0) => {                    // a furnace-lit slit port in an iron brow
    for (const [m, g] of [['furnace', box(w, 0.09, 0.05, 0, 0, 0.02)], ['iron', box(w + 0.2, 0.12, 0.16, 0, 0.12, 0.06)], ['iron', box(w + 0.2, 0.06, 0.1, 0, -0.08, 0.04)]]) { g.rotateY(rotY); g.translate(x, y, z); P.add(m, g); }
  };
  const door = (x, y, z, rotY = 0) => {                      // a gothic iron door facing +Z
    for (const [m, g] of [['dark', new THREE.ShapeGeometry(archShape(1.3, 1.35, 1.95), 6).translate(0, 0, 0.02)], ['plate', new THREE.ShapeGeometry(archShape(1.12, 1.3, 1.82), 6).translate(0, 0, 0.05)],
      ['bronze', archFrame(1.3, 1.35, 1.95, 0.16, 0.12)], ['iron', box(1.12, 0.08, 0.05, 0, 0.45, 0.08)], ['iron', box(1.12, 0.08, 0.05, 0, 1.15, 0.08)], ['iron', box(0.08, 1.8, 0.05, 0, 0.9, 0.08)]]) {
      g.rotateY(rotY); g.translate(x, y, z); P.add(m, g);
    }
  };
  /** Ember cracks in a V placed by matrix m (the V's frame: x across, y up, z out of the face). */
  const cracks = (m, r = 0.045) => {
    for (const line of V_CRACKS) for (let i = 0; i < line.length - 1; i++) {
      const a = new THREE.Vector3(line[i][0], line[i][1], 0).applyMatrix4(m), b = new THREE.Vector3(line[i + 1][0], line[i + 1][1], 0).applyMatrix4(m);
      P.add('ember', rod(a.toArray(), b.toArray(), r, r, 4));
    }
  };
  /** Raised unlit iron letters on a red plate board: place(c) -> { o, u } for column c (outward n = u x up). */
  const nameBoard = (text, px, place) => {
    const cols = textCols(text), N = cols.length, up = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i < N; i++) {
      const { o, u } = place(i - (N - 1) / 2), U = new THREE.Vector3(...u).normalize(), n = U.clone().cross(up), m = new THREE.Matrix4().makeBasis(U, up, n);
      const put = (mat, g, dy, out) => { g.applyMatrix4(m); g.translate(o[0] + n.x * out, o[1] + dy, o[2] + n.z * out); P.add(mat, g); };
      put('plateRed', new THREE.BoxGeometry(px * 1.02, px * 9.6, 0.06), 0, 0.03);
      for (const dy of [-4.9, 4.9]) put('gunmetal', new THREE.BoxGeometry(px * 1.02, px * 0.5, 0.1), dy * px, 0.05);
      cols[i].forEach((on, row) => { if (on) put('iron', new THREE.BoxGeometry(px * 0.92, px * 0.92, 0.12), (3 - row) * px, 0.1); });
    }
  };
  const flankBoard = (text, px, side, sc, y) => {
    const pt = (s) => at(s, y, side, 0.04), tab = [];
    let acc = 0, prev = pt(sc - 0.12);
    for (let i = 0; i <= 480; i++) { const s = sc - 0.12 + i / 480 * 0.24, p = pt(s); acc += Math.hypot(p[0] - prev[0], p[2] - prev[2]); tab.push([s, acc]); prev = p; }
    const mid = tab.find(([s]) => s >= sc)[1];
    const sOf = (a) => { const t = mid + a; const j = tab.findIndex(([, l]) => l >= t); return tab[Math.max(0, j)][0]; };
    nameBoard(text, px, (c) => {
      const s = sOf(side * c * px), p = pt(s), a = pt(s - 0.002), b = pt(s + 0.002);
      return { o: p, u: [(b[0] - a[0]) * side, 0, (b[2] - a[2]) * side] };
    });
  };
  /** A stokehold grate flush in the deck: iron bars over the furnace glow below. */
  const grate = (x, y, z, w = 1.4, d = 1.0) => {
    P.add('furnace', box(w, 0.02, d, x, y + 0.012, z));
    const nb = Math.round(w / 0.2);
    for (let i = 0; i <= nb; i++) P.add('iron', box(0.07, 0.05, d, x - w / 2 + i * w / nb, y + 0.035, z));
    P.add('gunmetal', box(w + 0.2, 0.06, 0.12, x, y + 0.03, z - d / 2 - 0.06)); P.add('gunmetal', box(w + 0.2, 0.06, 0.12, x, y + 0.03, z + d / 2 + 0.06));
    glow.push({ x, y: y + 0.3, z, r: 1.9, c: 0xff5212 });
  };

  // ---------------------------------------------------------------- the ram forefoot under Velscour's V
  {
    const sh = new THREE.Shape([[36.6, -1.2], [40.2, -2.25], [43.0, -2.8], [40.8, -3.9], [37.4, -5.0]].map(([x, y]) => new THREE.Vector2(x, y)));
    const g = new THREE.ExtrudeGeometry(sh, { depth: 1.7, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.08, bevelSegments: 1 });
    g.translate(0, 0, -0.85);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setZ(i, pos.getZ(i) * (1 - Math.min(1, Math.max(0, (pos.getX(i) - 37) / 6.2)) * 0.8));
    g.computeVertexNormals(); g.rotateY(Math.PI / 2);
    P.add('plate', g);
    P.add('gunmetal', rod([0, -1.15, -36.6], [0, -2.25, -40.2], 0.11, 0.1, 6));
    P.add('gunmetal', rod([0, -2.25, -40.2], [0, -2.8, -43.05], 0.1, 0.06, 6));
    P.add('iron', new THREE.ConeGeometry(0.3, 1.6, 6).rotateX(-Math.PI / 2).translate(0, -2.8, -43.6));
    for (const [z, y] of [[-38.4, -1.75], [-40.0, -2.25], [-41.6, -2.55]]) P.add('iron', new THREE.ConeGeometry(0.16, 0.8, 5).rotateX(-0.9).translate(0, y + 0.3, z - 0.15));
    for (const side of [-1, 1]) for (const [z, y] of [[-39.2, -2.9], [-41.2, -3.0]]) P.add('iron', new THREE.ConeGeometry(0.13, 0.7, 5).rotateZ(-side * 1.2).translate(side * (0.75 - (-z - 37) * 0.1), y, z));
    // the stem bar up the raked stem, with plate strakes on the bow
    const stem = []; for (let i = 0; i <= 10; i++) stem.push(sect(1, i / 10 * 0.82));
    for (let i = 0; i < 10; i++) P.add('gunmetal', rod([0, stem[i][1], stem[i][2] - 0.05], [0, stem[i + 1][1], stem[i + 1][2] - 0.05], 0.13, 0.13, 6));
    for (const side of [-1, 1]) for (const y of [-1.6, 0.2, 1.4, 3.2]) for (let i = 0; i < 8; i++) {
      const s0 = lerp(0.86, 0.995, i / 8), s1 = lerp(0.86, 0.995, (i + 1) / 8); if (y > sheer(s1) - 0.3) continue;
      P.add('gunmetal', rod(at(s0, y, side, 0.05), at(s1, y, side, 0.05), 0.06, 0.06, 4));
    }
    // the V crest on the stem head: black iron, gunmetal-edged, ember only in its cracks; thorns; bat wings
    const cz = zAt(1) - 0.45, by = sheer(1) - 0.3, vy = by + 1.2;
    const vg = new THREE.ExtrudeGeometry(vShape(), { depth: 0.7, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.06, bevelSegments: 1, curveSegments: 4 });
    P.add('plate', vg.translate(0, vy, cz - 0.35));
    for (const fz of [cz - 0.47, cz + 0.47]) {
      for (const sd of [-1, 1]) { P.add('gunmetal', rod([0, vy - 1.2, fz], [sd * 3.35, vy + 5.9, fz], 0.08, 0.08, 5)); P.add('gunmetal', rod([0, vy + 1.15, fz], [sd * 1.65, vy + 4.35, fz], 0.07, 0.07, 5)); }
      cracks(new THREE.Matrix4().makeTranslation(0, vy, fz));
    }
    glow.push({ x: 0, y: vy + 2.2, z: cz - 0.6, r: 1.6, c: 0xff2a10 });
    P.add('plate', rod([0, by - 0.6, cz + 0.2], [0, vy + 0.2, cz + 0.2], 0.4, 0.28, 6));     // the crest's mount on the stem head
    for (const sd of [-1, 1]) {
      const R = [sd * 1.9, vy + 3.0, cz + 0.3], W = [sd * 5.4, vy + 6.0, cz + 1.5], F = [[sd * 8.7, vy + 6.7, cz + 3.1], [sd * 8.5, vy + 3.5, cz + 3.8], [sd * 6.5, vy + 1.4, cz + 3.2], [sd * 3.0, vy + 0.8, cz + 1.5]];
      const toward = (a, b, f) => a.map((v, j) => lerp(v, b[j], f));
      const ring = [F[0]];
      for (let i = 1; i < F.length; i++) ring.push(toward(toward(F[i - 1], F[i], 0.5), W, 0.32), F[i]);
      ring.push(R);
      const pts = [W, ...ring], idx = [];
      for (let i = 1; i < pts.length - 1; i++) idx.push(0, i, i + 1, 0, i + 1, i);
      P.add('bloodSail', tris(pts, idx));
      P.add('gunmetal', rod(R, W, 0.2, 0.14, 6));
      P.add('gunmetal', rod(W, F[0], 0.13, 0.05, 5));
      for (const f of F.slice(1, 3)) P.add('iron', rod(W, f, 0.09, 0.04, 5));
      P.add('iron', new THREE.ConeGeometry(0.15, 0.8, 5).rotateZ(-sd * 0.5).translate(W[0] + sd * 0.2, W[1] + 0.35, W[2]));
      for (const f of F.slice(0, 3)) P.add('iron', new THREE.ConeGeometry(0.08, 0.5, 4).rotateX(0.9).translate(f[0], f[1], f[2] + 0.2));
    }
  }
  // Hawse pipes and stockless anchors, chains to the capstans; the name on both bows.
  for (const side of [-1, 1]) {
    const s = 0.94, y = 1.7, [x, , z] = at(s, y, side, 0.05);
    P.add('gunmetal', new THREE.TorusGeometry(0.34, 0.11, 6, 14).rotateY(Math.PI / 2).translate(x, y, z));
    P.add('dark', new THREE.CircleGeometry(0.28, 12).rotateY(side * Math.PI / 2).translate(x + side * 0.02, y, z));
    const ax = x + side * 0.25;
    P.add('iron', rod([ax, y - 0.1, z], [ax + side * 0.12, y - 2.2, z], 0.11, 0.11, 6));
    P.add('iron', box(0.32, 0.38, 1.5, ax + side * 0.14, y - 2.35, z));
    for (const dz of [-1, 1]) {
      P.add('iron', rod([ax + side * 0.16, y - 2.3, z + dz * 0.65], [ax + side * 0.22, y - 1.25, z + dz * 0.95], 0.2, 0.06, 5));
      P.add('iron', box(0.12, 0.6, 0.38, ax + side * 0.2, y - 1.7, z + dz * 0.8));
    }
    const dx = side * 1.2, dz0 = zAt(0.952), cz = TA.z - TR - 0.35 - 0.75;
    P.add('gunmetal', new THREE.TorusGeometry(0.28, 0.08, 4, 12).rotateX(Math.PI / 2).translate(dx, FC_H + 0.03, dz0));
    P.add('dark', new THREE.CircleGeometry(0.22, 10).rotateX(-Math.PI / 2).translate(dx, FC_H + 0.02, dz0));
    for (let zz = dz0 + 0.28, i = 0; zz < cz - 0.3; zz += 0.22, i++) P.add('iron', new THREE.TorusGeometry(0.1, 0.035, 4, 8).rotateY(i % 2 ? 0 : Math.PI / 2).rotateX(i % 2 ? Math.PI / 2 : 0).translate(dx, FC_H + 0.06, zz));
    P.add('plate', new THREE.CylinderGeometry(0.45, 0.55, 0.6, 12).translate(dx, FC_H + 0.3, cz));
    P.add('gunmetal', new THREE.CylinderGeometry(0.5, 0.45, 0.16, 12).translate(dx, FC_H + 0.68, cz));
    flankBoard('THE LIGHTLESS', 0.13, side, 0.85, 2.3);
  }

  // ---------------------------------------------------------------- casemates on the belt, spiked ribs, bulwarks
  const casemate = (side, z, y) => {
    const s = sAt(z), x0 = side * hx(s, y), cx = x0 - side * 0.2, t0 = side > 0 ? 0 : Math.PI;
    P.add('plate', new THREE.CylinderGeometry(1.15, 1.15, 1.25, 12, 1, false, t0, Math.PI).translate(cx, y, z));
    P.add('plate', new THREE.ConeGeometry(1.15, 0.5, 12, 1, false, t0, Math.PI).translate(cx, y + 0.87, z));
    P.add('gunmetal', new THREE.ConeGeometry(1.15, 0.55, 12, 1, false, t0, Math.PI).rotateX(Math.PI).translate(cx, y - 0.9, z));
    P.add('gunmetal', new THREE.TorusGeometry(1.16, 0.05, 4, 12, Math.PI).rotateX(Math.PI / 2).rotateY(side > 0 ? Math.PI / 2 : -Math.PI / 2).translate(cx, y + 0.62, z));
    P.add('dark', box(0.1, 0.62, 0.85, cx + side * 1.12, y, z));
    P.add('gunmetal', rod([cx, y, z], [cx + side * 2.8, y + 0.04, z], 0.21, 0.16, 10));
    P.add('bronze', rod([cx + side * 2.7, y + 0.04, z], [cx + side * 2.9, y + 0.04, z], 0.2, 0.2, 10));
    P.add('blackSail', new THREE.CylinderGeometry(0.3, 0.34, 0.3, 10).rotateZ(Math.PI / 2).translate(cx + side * 1.14, y, z));
    P.add('furnace', box(0.04, 0.06, 0.5, cx + side * 1.14, y + 0.42, z));
  };
  const CM_MAIN = [1.2, 5.6, 10, 14.4, 18.8, 23.2], CM_FC = [-8.6, -13.4, -18.2];
  for (const side of [-1, 1]) {
    for (const z of CM_MAIN) casemate(side, z, -0.2);
    for (const z of CM_FC) casemate(side, z, 1.2);
    for (const z of [-1.0, ...CM_MAIN.map((z) => z + 2.2), -6.2, -11.0, -15.8, 27.4]) {
      const s = sAt(z), y0 = -0.95, y1 = sheer(s) + 0.1, a = at(s, y0, side, 0.14), b = at(s, y1 - 0.1, side, 0.14);
      P.add('plate', rod(a, [b[0], y1, b[2]], 0.16, 0.13, 4));
      P.add('gunmetal', new THREE.ConeGeometry(0.17, 0.9, 4).rotateZ(-side * 0.45).translate(b[0] + side * 0.18, y1 + 0.38, b[2]));
    }
    for (let z = zAt(0.015); z > zAt(0.975); z -= 1.4) {
      if (Math.abs(z - ZB) < 0.6) continue;
      const s = sAt(z); spike(side * (sect(s, 0)[0] - 0.15), sheer(s) + 0.14, z, 0.42, 0.09);
    }
    for (const z of [3.4, 16.6, 26.0]) for (const dz of [-0.35, 0.35]) {      // bitts at the deck edge
      const x = side * (inner(sAt(z)) - 0.45);
      P.add('plate', new THREE.CylinderGeometry(0.17, 0.2, 0.5, 8).translate(x, 0.25, z + dz));
      P.add('gunmetal', new THREE.CylinderGeometry(0.22, 0.22, 0.06, 8).translate(x, 0.52, z + dz));
    }
  }

  // ---------------------------------------------------------------- the port deckhouse (closes the hidden port lane)
  {
    const n = 8, pts = [];
    for (let i = 0; i <= n; i++) { const z = lerp(DH.z0, DH.z1, i / n); pts.push([-inner(sAt(z)) + 0.02, DH.top, z]); }
    pts.push([DH.x1, DH.top, DH.z1], [DH.x1, DH.top, DH.z0]);
    P.add('plate', slab(pts, DH.top - FC_H));
    P.add('gunmetal', slab(pts.map(([x, , z]) => [x, DH.top + 0.12, z]), 0.14));
    for (let i = 0; i < n; i++) { const z = lerp(DH.z0, DH.z1, (i + 0.5) / n); spike(-inner(sAt(z)) + 0.2, DH.top + 0.12, z, 0.55, 0.1, 'iron'); }
    const xm = (-inner(sAt(DH.z1)) + DH.x1) / 2;
    door(xm, FC_H, DH.z1 + 0.01);                           // its aft door onto the break
    for (const x of [xm - 1.4, xm + 1.4]) lancet(x, FC_H + 0.9, DH.z1 + 0.01, 0.42, 1.2);
    for (const z of [-17.0, -13.0, -9.0]) lancet(-inner(sAt(z)) + 0.02, FC_H + 0.8, z, 0.45, 1.25, -Math.PI / 2);
    // a boat on chocks on its roof, and a stokehold vent grate glowing on the roof
    dinghy(P, -5.0, DH.top + 0.85, -9.5, 5.6, 1.0, { mat: 'tar', inner: 'scorched', rim: 'gunmetal' });
    for (const dz of [-1.6, 1.6]) P.add('plate', box(1.6, 0.4, 0.3, -5.0, DH.top + 0.2, -9.5 + dz));
    grate(-4.2, DH.top + 0.14, -15.6, 1.2, 1.0);
  }

  // ---------------------------------------------------------------- the forecastle break: bulkhead, door, starboard stairs
  {
    const w = inner(FC_S) - 0.02;
    P.add('plate', box(w * 2, FC_H, 0.3, 0, FC_H / 2, ZB + 0.15));
    P.add('gunmetal', box(w * 2, 0.12, 0.36, 0, FC_H - 0.06, ZB + 0.15));
    door(-1.2, 0, ZB + 0.3);
    for (const x of [-5.4, 0.9, 2.4]) lancet(x, 0.6, ZB + 0.3, 0.45, 1.0);
    const SX = 4.7, SW = 2.6, n = 8, rise = FC_H / n, run = 0.32;
    for (let i = 0; i < n; i++) {
      const top = FC_H - rise * i, z = ZB + 0.3 + run * (i + 0.5);
      P.add('plate', box(SW, top, run, SX, top / 2, z));
      P.add('plateRed', box(SW, 0.03, 0.08, SX, top + 0.005, z - run / 2 + 0.05));
    }
    for (const e of [-1, 1]) {
      const xe = SX + e * (SW / 2 + 0.09), len = run * n, g = new THREE.BoxGeometry(0.16, 0.32, len * Math.hypot(1, FC_H / len) + 0.1);
      g.rotateX(Math.atan2(FC_H, len)); g.translate(xe, FC_H / 2 + 0.12, ZB + 0.3 + len / 2); P.add('gunmetal', g);
      P.add('iron', rod([xe, FC_H + 0.9, ZB + 0.25], [xe, 0.9, ZB + 0.3 + len], 0.04, 0.04, 4));
      P.add('iron', rod([xe, 0, ZB + 0.3 + len], [xe, 0.9, ZB + 0.3 + len], 0.05, 0.05, 4));
    }
    const railSeg = (x0, x1) => {
      const len = Math.abs(x1 - x0), nn = Math.max(2, Math.round(len / 0.5));
      for (let i = 0; i <= nn; i++) P.add('iron', box(0.09, 0.7, 0.09, lerp(x0, x1, i / nn), FC_H + 0.35, ZB + 0.12));
      P.add('gunmetal', box(len + 0.12, 0.1, 0.18, (x0 + x1) / 2, FC_H + 0.72, ZB + 0.12));
      for (const x of [x0, x1]) { P.add('plate', box(0.26, 1.0, 0.26, x, FC_H + 0.5, ZB + 0.12)); spike(x, FC_H + 1.0, ZB + 0.12, 0.45, 0.1, 'iron'); }
    };
    railSeg(DH.x1 + 0.1, SX - SW / 2 - 0.15); railSeg(SX + SW / 2 + 0.15, w - 0.1);
    grate(4.6, FC_H, -11.0); grate(4.4, FC_H, -24.6, 1.2, 0.9);
  }

  // ---------------------------------------------------------------- the turrets
  const barbette = (T) => {
    const r = T.r + 0.35, y = T.y;
    P.add('plate', new THREE.CylinderGeometry(r, r + 0.1, T.bh, 28).translate(T.x, y + T.bh / 2, T.z));
    P.add('gunmetal', new THREE.TorusGeometry(r + 0.02, 0.08, 4, 28).rotateX(Math.PI / 2).translate(T.x, y + T.bh - 0.02, T.z));
    if (T.bh > 1.5) for (const f of [0.35, 0.7]) P.add('gunmetal', new THREE.TorusGeometry(r + 0.04, 0.06, 4, 28).rotateX(Math.PI / 2).translate(T.x, y + T.bh * f, T.z));
    for (let i = 0; i < 20; i++) { const a = i / 20 * TAU; P.add('bronze', new THREE.SphereGeometry(0.06, 5, 3).translate(T.x + Math.sin(a) * (r + 0.07), y + Math.min(0.35, T.bh / 2), T.z + Math.cos(a) * (r + 0.07))); }
  };
  const addTurret = (T, opts, base, amp, ph) => {
    barbette(T);
    const t = bigTurret(M, { r: T.r, ...opts }); t.g.position.set(T.x, T.y + T.bh, T.z); t.g.rotation.y = base; t.g.name = `turret${T.id}`; root.add(t.g);
    turrets.push({ o: t.g, c: t.cradle, base, amp, ph });
    t.g.updateMatrix(); const rest = t.spike.position.clone().applyMatrix4(t.g.matrix);
    spikes.push({ id: T.id, turret: t.g, marker: t.spike, rest: rest.toArray().map((v) => +v.toFixed(2)) });
  };
  addTurret(TA, { len: 5.3 }, 0, 0.42, 0);
  addTurret(TB, { len: 6.0 }, 0, 0.5, 2.1);
  addTurret(TD, { h: 1.5, len: 3.8, bore: 0.2, gap: 0.45 }, Math.PI / 2, 0.6, 1.0);   // the secondary turret mid-deck: guns sweep the deck, its breech to the starboard lane
  addTurret(TC, { len: 6.0 }, Math.PI, 0.45, 4.0);
  P.add('plate', box(0.9, TB.bh, 0.7, 0, TB.y + TB.bh / 2, TB.z + TR + 0.6));           // the superfiring barbette's ammunition trunk

  // ---------------------------------------------------------------- the tower bridge (black glass; furnace-lit slit ports)
  const cz = TW.cz;
  { // tier 1: the armoured conning tower, a band of slit ports round it
    P.add('plate', slab(oct(0, cz, 3.3, 2.5, 0.8, 5.4), 3.4));
    P.add('gunmetal', slab(oct(0, cz, 3.42, 2.62, 0.84, 5.52), 0.14));
    for (const z of [-17.4, -16.1, -14.8]) lancet(3.31, 2.75, z, 0.55, 1.6, Math.PI / 2);
    for (const x of [-1.5, 1.5]) lancet(x, 2.75, TW.z0 - 0.01, 0.6, 1.6, Math.PI);
    door(0, FC_H, TW.z1 + 0.01);
    for (const x of [-1.9, 1.9]) lancet(x, 2.85, TW.z1 + 0.01, 0.55, 1.4);
    for (const x of [-1.6, 0, 1.6]) slit(x, 4.85, TW.z1 + 0.01, 1.0);
    for (const x of [-1.6, 0, 1.6]) slit(x, 4.85, TW.z0 - 0.01, 1.0, Math.PI);
    for (const z of [-17.2, -15.0]) slit(3.31, 4.85, z, 1.0, Math.PI / 2);
    glow.push({ x: 0, y: 4.85, z: TW.z1 + 0.5, r: 2.2, c: 0xff4a12 }, { x: 3.8, y: 4.85, z: cz, r: 1.8, c: 0xff4a12 });
    for (const [x, z] of [[3.0, TW.z0 + 0.3], [-3.0, TW.z1 - 0.3], [3.0, TW.z1 - 0.3]]) { P.add('plate', box(0.5, 0.6, 0.5, x, 5.8, z)); spike(x, 6.1, z, 1.1, 0.2); }
    for (const e of [-0.25, 0.25]) P.add('iron', box(0.05, 3.6, 0.05, 2.8 + e, FC_H + 1.8, TW.z1 + 0.12));    // the ladder to the starboard wing
    for (let y = FC_H + 0.3; y < 5.6; y += 0.3) P.add('iron', box(0.5, 0.04, 0.04, 2.8, y, TW.z1 + 0.12));
  }
  { // tier 2: the navigating bridge, black-glazed, with open wings ending in armoured lookouts
    P.add('gunmetal', slab(oct(0, cz, 6.2, 1.0, 0.6, 5.62), 0.22));
    P.add('plate', slab(oct(0, cz - 0.05, 2.8, 1.45, 0.5, 7.6), 2.0));
    P.add('gunmetal', slab(oct(0, cz - 0.05, 3.1, 1.75, 0.6, 7.82), 0.22));
    for (let i = 0; i < 5; i++) lancet((i - 2) * 1.0, 6.0, cz - 1.51, 0.62, 1.3, Math.PI);
    for (const sd of [-1, 1]) lancet(sd * 2.81, 6.0, cz - 0.05, 0.6, 1.3, sd * Math.PI / 2);
    for (const x of [-1.9, -0.65, 0.65, 1.9]) lancet(x, 6.0, cz + 1.41, 0.55, 1.3);
    for (const sd of [-1, 1]) {
      const x0 = sd * 2.9, x1 = sd * 5.0;
      for (const z of [cz - 0.95, cz + 0.95]) {
        const n = 5; for (let i = 0; i <= n; i++) P.add('iron', box(0.07, 0.7, 0.07, lerp(x0, x1, i / n), 5.97, z));
        P.add('gunmetal', box(Math.abs(x1 - x0), 0.08, 0.14, (x0 + x1) / 2, 6.34, z));
      }
      P.add('plate', slab(oct(sd * 5.6, cz, 0.62, 0.95, 0.25, 7.0), 1.38));                // the lookout hood
      P.add('plate', new THREE.ConeGeometry(0.85, 0.9, 4).rotateY(Math.PI / 4).scale(1, 1, 1.3).translate(sd * 5.6, 7.45, cz));
      slit(sd * 6.23, 6.5, cz, 0.9, sd * Math.PI / 2); slit(sd * 5.6, 6.5, cz - 0.96, 0.6, Math.PI);
      P.add('iron', rod([sd * 3.32, 3.4, cz], [sd * 5.6, 5.5, cz], 0.1, 0.1, 5));
      for (const z of [cz - 0.8, cz + 0.8]) P.add('iron', rod([sd * 3.32, 4.3, z], [sd * 5.0, 5.5, z], 0.07, 0.07, 4));
      for (const z of [cz - 1.15, cz + 1.15]) {                // pinnacles on the bridge roof's corners
        const x = sd * 2.45; P.add('plate', box(0.5, 1.2, 0.5, x, 8.5, z)); P.add('gunmetal', new THREE.ConeGeometry(0.34, 2.4, 4).rotateY(Math.PI / 4).translate(x, 10.3, z));
        spike(x, 11.4, z, 0.6, 0.06, 'iron');
        P.add('iron', rod([x, 9.1, z], [sd * 1.75, 10.6, cz + (z - cz) * 0.6], 0.09, 0.09, 4));
      }
    }
  }
  { // tier 3: the tall lancet tower; Velscour's iron V on its aft face, ember in the cracks
    P.add('plate', slab(oct(0, cz, 1.9, 1.7, 0.6, 14.2), 6.4));
    for (const [rot, x, z] of [[Math.PI, 0, cz - 1.71], [Math.PI / 2, 1.91, cz], [-Math.PI / 2, -1.91, cz]]) lancet(x, 8.6, z, 0.85, 4.2, rot);
    const vz = cz + 1.72, s = 0.52;
    P.add('plate', new THREE.ExtrudeGeometry(vShape(), { depth: 0.22, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 1 }).scale(s, s, 1).translate(0, 9.6, vz - 0.02));
    P.add('gunmetal', new THREE.ExtrudeGeometry(vShape(false), { depth: 0.06, bevelEnabled: false }).scale(s * 1.1, s * 1.1, 1).translate(0, 9.5, vz - 0.06));
    cracks(new THREE.Matrix4().makeTranslation(0, 9.6, vz + 0.27).multiply(new THREE.Matrix4().makeScale(s, s, 1)), 0.035);
    glow.push({ x: 0, y: 11.0, z: vz + 0.5, r: 1.6, c: 0xff2a10 });
  }
  { // tier 4: the spotting top with its spiked parapet and slit-port drum; the spire, the mast and its yard
    P.add('gunmetal', slab(oct(0, cz, 2.8, 2.6, 0.9, 14.55), 0.35));
    P.add('plate', slab(oct(0, cz, 2.9, 2.7, 0.94, 14.2), 0.08));
    const o = oct(0, cz, 2.7, 2.5, 0.88, 14.55);
    for (let i = 0; i < o.length; i++) {
      const a = o[i], b = o[(i + 1) % o.length], n = Math.max(1, Math.floor(Math.hypot(b[0] - a[0], b[2] - a[2]) / 0.6));
      for (let j = 0; j < n; j++) { const t = (j + 0.5) / n, x = lerp(a[0], b[0], t), z = lerp(a[2], b[2], t); P.add('plate', box(0.24, 0.5, 0.24, x, 14.8, z)); if (j % 2 === 0) spike(x, 15.05, z, 0.4, 0.07, 'gunmetal'); }
    }
    for (const [x, z] of [[-1.9, cz], [1.9, cz], [0, cz - 1.7], [0, cz + 1.7]]) P.add('iron', rod([x * 0.95, 13.0, lerp(cz, z, 0.95)], [x * 1.35, 14.2, lerp(cz, z, 1.45)], 0.09, 0.09, 4));
    P.add('plate', slab(oct(0, cz, 1.35, 1.35, 0.4, 16.1), 1.55));
    for (const [rot, x, z] of [[0, 0, cz + 1.36], [Math.PI, 0, cz - 1.36], [Math.PI / 2, 1.36, cz], [-Math.PI / 2, -1.36, cz]]) slit(x, 15.4, z, 0.8, rot);
    P.add('gunmetal', new THREE.ConeGeometry(1.5, 6.8, 8).rotateY(Math.PI / 8).translate(0, 16.1 + 3.4, cz));
    for (const f of [0.22, 0.5]) P.add('plate', new THREE.CylinderGeometry(1.5 * (1 - f) + 0.06, 1.5 * (1 - f) + 0.06, 0.12, 8).rotateY(Math.PI / 8).translate(0, 16.1 + 6.8 * f, cz));
    for (const f of [0.14, 0.38, 0.62]) for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2 + (f > 0.3 && f < 0.5 ? Math.PI / 4 : 0), r = 1.5 * (1 - f);
      P.add('iron', new THREE.ConeGeometry(0.09, 0.55, 4).rotateX(0.9).rotateY(a).translate(Math.sin(a) * r, 16.1 + 6.8 * f, cz + Math.cos(a) * r));
    }
    P.add('iron', rod([0, 22.7, cz], [0, 26.4, cz], 0.11, 0.06, 6));
    P.add('iron', rod([-2.4, 24.8, cz], [2.4, 24.8, cz], 0.07, 0.07, 5));
    P.add('iron', rod([0, 23.4, cz], [0, 24.2, cz + 3.3], 0.06, 0.05, 5));        // the gaff for the ensign
    P.add('iron', new THREE.ConeGeometry(0.12, 0.7, 4).translate(0, 26.75, cz));
  }
  const pennant = flag(M.blackSail, 5.5, 0.8, [0, 26.3, cz], 0.14, 'pennant');
  const ensign = flag(M.bloodSail, 3.6, 2.2, [0, 24.2, cz + 3.3], 0.28, 'ensign');
  rig.push([0, 26.0, cz], [0, sheer(1) + 6.5, zAt(1) - 0.45], [0, 24.8, cz], [6.3, FC_H + 1.0, -16.6], [0, 24.8, cz], [-6.3, DH.top, -16.6]);

  // ---------------------------------------------------------------- the funnel casing and the two raked funnels
  {
    P.add('plate', slab(oct(0, (CAS.z0 + CAS.z1) / 2, 2.4, (CAS.z1 - CAS.z0) / 2, 0.7, CAS.top), CAS.top - FC_H));
    P.add('gunmetal', slab(oct(0, (CAS.z0 + CAS.z1) / 2, 2.52, (CAS.z1 - CAS.z0) / 2 + 0.12, 0.74, CAS.top + 0.06), 0.14));
    for (let z = CAS.z0 + 0.9; z < CAS.z1 - 0.5; z += 0.9) { P.add('furnace', box(0.04, 0.42, 0.5, 2.41, 2.62, z)); P.add('iron', box(0.08, 0.06, 0.62, 2.44, 2.62, z)); P.add('iron', box(0.08, 0.06, 0.62, 2.44, 2.82, z)); }
    glow.push({ x: 2.9, y: 2.7, z: -8.9, r: 2.6, c: 0xff4a12 });
    for (const sd of [-1, 1]) {                               // cowl vents between the funnels
      const x = sd * 1.75, z = -8.9;
      P.add('plate', rod([x, CAS.top, z], [x, CAS.top + 1.3, z], 0.26, 0.26, 10));
      P.add('plate', new THREE.TorusGeometry(0.34, 0.2, 6, 12, Math.PI).rotateY(Math.PI / 2).translate(x, CAS.top + 1.3, z - 0.34));
      P.add('dark', new THREE.CircleGeometry(0.3, 10).translate(x, CAS.top + 1.3, z - 0.7));
      P.add('gunmetal', new THREE.TorusGeometry(0.34, 0.05, 4, 12).translate(x, CAS.top + 1.3, z - 0.69));
    }
  }
  const funnel = (z0, h, rx, rz, rk) => {
    const y0 = CAS.top, tr = (g) => { const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, p.getZ(i) + rk * (p.getY(i) - y0)); return g; };
    const ov = (r0, r1, hh, y, seg = 20, open = false) => tr(new THREE.CylinderGeometry(r1, r0, hh, seg, 1, open).scale(rx, 1, rz).translate(0, y + hh / 2, z0));
    P.add('plate', ov(1, 0.96, h, y0));
    for (const f of [0.08, 0.42, 0.7]) P.add('gunmetal', ov(1.04, 1.04, 0.28, y0 + h * f));
    P.add('gunmetal', ov(1.0, 1.22, 0.55, y0 + h - 0.05, 20, true));
    P.add('plateRed', ov(0.99, 1.0, 0.5, y0 + h - 0.62));
    const top = y0 + h + 0.5, tz = z0 + rk * (top - y0);
    P.add('dark', ov(0.97, 0.97, 1.4, y0 + h - 0.95, 20, true).scale(-1, 1, 1));
    P.add('furnace', new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2).scale(rx * 0.97, 1, rz * 0.97).translate(0, top - 1.2, tz - rk * 1.2));
    P.add('dark', new THREE.RingGeometry(0.97, 1.24, 20).rotateX(-Math.PI / 2).scale(rx, 1, rz).translate(0, top - 0.04, tz));
    for (const sd of [-1, 1]) rig.push([sd * 2.4, 24.8, TW.cz], [sd * rx * 0.9, top - 0.3, tz]);
    for (let i = 0; i < 14; i++) {                            // a crown of iron spikes round the mouth
      const a = i / 14 * TAU, x = Math.sin(a) * rx * 1.24, z = tz + Math.cos(a) * rz * 1.24;
      P.add('iron', new THREE.ConeGeometry(0.09, 0.85, 4).translate(0, 0.42, 0).rotateZ(-Math.sin(a) * 0.35).rotateX(Math.cos(a) * 0.35).translate(x, top - 0.05, z));
    }
    P.add('gunmetal', tr(rod([0.5, y0, z0 + rz + 0.15], [0.5, y0 + h + 0.3, z0 + rz + 0.15], 0.1, 0.1, 6)));
    P.add('gunmetal', tr(new THREE.CylinderGeometry(0.16, 0.22, 0.5, 8).translate(0.5, y0 + h + 0.55, z0 + rz + 0.15)));
    for (const e of [-0.22, 0.22]) P.add('iron', tr(box(0.04, h - 0.6, 0.04, e, y0 + h / 2, z0 - rz - 0.1)));
    for (let y = y0 + 0.4; y < y0 + h - 0.4; y += 0.35) P.add('iron', tr(box(0.48, 0.04, 0.04, 0, y, z0 - rz - 0.1)));
    for (const [tint, n, rise, size, dim] of [[['#8a4030', '#2c1c1e'], 7, 3.0, 2.0, [0.8, 0.45, 0.4]], [['#2c262a', '#141014'], 12, 7.5, 3.6, [0.42, 0.38, 0.4]]]) {
      const s = smoke([0, top + 0.3, tz], n, tint, rise, size);
      s.grp.children.forEach((c) => { c.renderOrder = 4; c.material.color.setRGB(...dim); });   // canvas puffs read light: dim to soot
      root.add(s.grp); fx.push(s);
    }
    glow.push({ x: 0, y: top + 0.25, z: tz, r: 5.0, c: 0xff3a12, light: true, lr: 8 });
  };
  funnel(-11.0, 13.2, 1.55, 1.95, 0.2); funnel(-6.8, 12.6, 1.55, 1.95, 0.2);

  // ---------------------------------------------------------------- boats on davits
  const boat = (side, z, deckY, l = 5.4) => {
    const s = sAt(z), bx = side * (sect(s, 0)[0] + 0.95), by = sheer(s) + 0.75, dx = side * (sect(s, 0)[0] - 0.25);
    dinghy(P, bx, by, z, l, 0.95, { mat: 'tar', inner: 'scorched', rim: 'gunmetal' });
    for (const dz of [-l * 0.36, l * 0.36]) {
      const top = by + 1.9;
      P.add('iron', rod([dx, deckY, z + dz], [dx, top - 0.4, z + dz], 0.08, 0.07, 6));
      P.add('iron', rod([dx, top - 0.4, z + dz], [lerp(dx, bx, 0.5), top, z + dz], 0.07, 0.07, 6));
      P.add('iron', rod([lerp(dx, bx, 0.5), top, z + dz], [bx, top - 0.25, z + dz], 0.07, 0.06, 6));
      rig.push([bx, top - 0.3, z + dz], [bx, by + 0.05, z + dz]);
    }
  };
  boat(1, -9.0, FC_H); boat(-1, 4.0, 0, 5.0); boat(-1, 19.6, 0, 5.0);

  // ---------------------------------------------------------------- the main deck: low cover for the push aft
  {
    const coaming = (x, z, w, d) => {                         // a hatch with its raised coaming
      P.add('plate', box(w, 0.42, d, x, 0.21, z)); P.add('darkDeck', box(w - 0.3, 0.04, d - 0.3, x, 0.43, z));
      P.add('gunmetal', box(w + 0.08, 0.08, d + 0.08, x, 0.42, z));
      for (const dz of [-d / 2 + 0.3, d / 2 - 0.3]) P.add('iron', box(w - 0.2, 0.06, 0.08, x, 0.47, z + dz));
    };
    coaming(3.6, 4.4, 2.0, 1.6); coaming(-4.2, 2.6, 1.8, 1.6); coaming(3.2, 22.2, 1.8, 1.8);
    const cowl = (x, z, h = 1.5, face = 0) => {
      P.add('plate', rod([x, 0, z], [x, h, z], 0.28, 0.24, 10));
      P.add('plate', new THREE.TorusGeometry(0.34, 0.22, 6, 12, Math.PI).rotateY(Math.PI / 2).translate(0, 0, -0.34).rotateY(face).translate(x, h, z));
      P.add('dark', new THREE.CircleGeometry(0.32, 10).translate(0, 0, -0.7).rotateY(face).translate(x, h, z));
      P.add('gunmetal', rod([x, 0, z], [x, 0.18, z], 0.36, 0.36, 10));
    };
    cowl(6.0, 1.8, 1.6); cowl(-6.0, 8.0, 1.5, Math.PI / 2); cowl(6.1, 16.0, 1.4, -Math.PI / 2); cowl(-0.4, 25.8, 1.3, Math.PI);
    const hoist = (x, z, ry = 0) => {                         // a shell hoist: an armoured trunk, its lift door, a shell on the lip
      const g = (geo) => geo.rotateY(ry).translate(x, 0, z);
      P.add('plate', g(box(1.1, 1.6, 0.9, 0, 0.8, 0))); P.add('gunmetal', g(box(1.2, 0.12, 1.0, 0, 1.62, 0)));
      P.add('dark', g(box(0.7, 1.0, 0.05, 0, 0.75, 0.46))); P.add('iron', g(box(0.06, 1.0, 0.08, 0.38, 0.75, 0.47)));
      P.add('bronze', g(rod([0, 1.68, 0.1], [0, 2.2, 0.1], 0.14, 0.1, 8)));
    };
    hoist(TD.x, TD.z + TD.r + 0.95); hoist(-1.8, TC.z - TR - 1.0);
    const rack = (x, z, ry = 0) => {                          // ready-use shells racked upright in an iron frame
      const g = (geo) => geo.rotateY(ry).translate(x, 0, z);
      P.add('plate', g(box(1.8, 0.2, 0.7, 0, 0.1, 0))); P.add('gunmetal', g(box(1.8, 0.08, 0.7, 0, 0.95, 0)));
      for (const e of [-0.86, 0.86]) P.add('iron', g(box(0.08, 1.1, 0.7, e, 0.55, 0)));
      for (let i = 0; i < 6; i++) { const xx = -0.68 + i * 0.27; P.add('bronze', g(rod([xx, 0.2, 0], [xx, 0.95, 0], 0.11, 0.11, 8))); P.add('iron', g(new THREE.ConeGeometry(0.11, 0.3, 8).translate(xx, 1.1, 0))); }
    };
    rack(2.8, 7.2); rack(1.4, 19.4, Math.PI / 2); rack(-4.6, 15.6);
    { // the aft conning position to port: a squat armoured drum, slit ports all round, a domed hood
      const x = -4.6, z = 24.6;
      P.add('plate', new THREE.CylinderGeometry(1.35, 1.45, 1.75, 12).translate(x, 0.875, z));
      P.add('gunmetal', new THREE.TorusGeometry(1.4, 0.07, 4, 16).rotateX(Math.PI / 2).translate(x, 1.75, z));
      P.add('plate', new THREE.SphereGeometry(1.3, 12, 5, 0, TAU, 0, Math.PI / 2).scale(1, 0.32, 1).translate(x, 1.75, z));
      for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + 0.5; slit(x + Math.sin(a) * 1.4, 1.38, z + Math.cos(a) * 1.4, 0.55, a); }
      glow.push({ x: x + 1.0, y: 1.4, z: z + 1.0, r: 1.6, c: 0xff4a12 });
      P.add('iron', new THREE.ConeGeometry(0.12, 0.7, 4).translate(x, 2.2, z));
    }
    grate(2.2, 0, 1.4); grate(-2.0, 0, 6.6, 1.2, 0.9); grate(3.0, 0, 26.4, 1.2, 0.9);
    for (const [x, z] of [[0, 1.0], [-5, 12.8], [5, 9], [5, 20], [-2, 20.4]]) P.add('gunmetal', new THREE.TorusGeometry(0.14, 0.035, 4, 10).rotateX(Math.PI / 2).translate(x, 0.02, z));
  }

  // ---------------------------------------------------------------- the stern: name, capstans, hooded stairs down to the stern walk
  {
    const yt = sheer(0), w0 = inner(0.004), SXs = 2.5, SWs = 1.1;
    for (const [x0, x1] of [[-w0, -SXs - SWs / 2], [-SXs + SWs / 2, SXs - SWs / 2], [SXs + SWs / 2, w0]]) {
      P.add('plate', box(x1 - x0, yt, WALL, (x0 + x1) / 2, yt / 2, ZS - WALL / 2));
      P.add('gunmetal', box(x1 - x0 + 0.1, 0.12, WALL + 0.14, (x0 + x1) / 2, yt + 0.06, ZS - WALL / 2));
    }
    nameBoard('THE LIGHTLESS', 0.062, (c) => ({ o: [c * 0.062, 0.62, ZS], u: [1, 0, 0] }));
    for (const sd of [-1, 1]) {
      const x = sd * 4.1, z = 34.0;                           // capstans either side of the stair hoods
      P.add('plate', new THREE.CylinderGeometry(0.5, 0.62, 0.75, 12).translate(x, 0.375, z));
      P.add('gunmetal', new THREE.CylinderGeometry(0.62, 0.5, 0.18, 12).translate(x, 0.84, z));
      for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; P.add('iron', box(0.08, 0.08, 0.5, x + Math.sin(a) * 0.6, 0.6, z + Math.cos(a) * 0.6, a)); }
      // the hood over the stair head: low iron walls, a sloped roof, its mouth facing forward
      const hx0 = sd * SXs, hz0 = ZS - 1.7, hz1 = ZS - 0.15;
      for (const e of [-1, 1]) P.add('plate', box(0.16, 1.8, hz1 - hz0, hx0 + e * (SWs / 2 + 0.1), 0.9, (hz0 + hz1) / 2));
      const roof = new THREE.BoxGeometry(SWs + 0.6, 0.16, hz1 - hz0 + 0.3); roof.rotateX(-0.18); roof.translate(hx0, 1.88, (hz0 + hz1) / 2); P.add('plate', roof);
      P.add('gunmetal', box(SWs + 0.5, 0.12, 0.2, hx0, 1.7, hz0));
      spike(hx0 - (SWs / 2 + 0.2), 1.95, hz0, 0.5, 0.08, 'iron'); spike(hx0 + (SWs / 2 + 0.2), 1.95, hz0, 0.5, 0.08, 'iron');
    }
    const WY = -1.9, WZ = 3.2, n = 7, run = 0.3;
    for (const sd of [-1, 1]) {
      const x = sd * SXs;
      for (let i = 0; i < n; i++) { const top = -i * (-WY / n), z = ZS + run * (i + 0.5); P.add('plate', box(SWs, 0.12, run, x, top - 0.06, z)); P.add('plateRed', box(SWs, 0.03, 0.06, x, top + 0.005, z - run / 2 + 0.04)); }
      for (const e of [-1, 1]) {
        const xe = x + e * (SWs / 2 + 0.05), len = run * n, ang = Math.atan2(-WY, len);
        const g = new THREE.BoxGeometry(0.1, 0.26, Math.hypot(len, WY) + 0.1); g.rotateX(ang); g.translate(xe, WY / 2 - 0.08, ZS + len / 2); P.add('gunmetal', g);
        P.add('iron', rod([xe, 0.85, ZS], [xe, WY + 0.85, ZS + len], 0.035, 0.035, 4));
      }
    }
    // the walk: a chamfered iron gallery on knees, a spiked balustrade, black windows behind
    const wo = oct(0, ZS + WZ / 2 - 0.2, 5.0, WZ / 2 + 0.2, 1.4, WY);
    P.add('darkDeck', slab(wo, 0.16));
    P.add('gunmetal', slab(oct(0, ZS + WZ / 2 - 0.2, 5.08, WZ / 2 + 0.28, 1.45, WY - 0.16), 0.1));
    const ow = oct(0, ZS + WZ / 2 - 0.2, 4.92, WZ / 2 + 0.12, 1.36, WY);
    for (let i = 2; i < 7; i++) {
      const a = ow[i], b = ow[i + 1], len = Math.hypot(b[0] - a[0], b[2] - a[2]), nn = Math.max(2, Math.round(len / 0.45));
      for (let j = 0; j <= nn; j++) P.add('iron', box(0.08, 0.95, 0.08, lerp(a[0], b[0], j / nn), WY + 0.47, lerp(a[2], b[2], j / nn)));
      P.add('gunmetal', rod([a[0], WY + 0.98, a[2]], [b[0], WY + 0.98, b[2]], 0.07, 0.07, 5));
      P.add('iron', rod([a[0], WY + 0.35, a[2]], [b[0], WY + 0.35, b[2]], 0.04, 0.04, 4));
    }
    for (const p of [ow[3], ow[4], ow[5], ow[6]]) spike(p[0], WY + 1.02, p[2], 0.4, 0.07, 'iron');
    for (const x of [-4.0, -1.6, 1.6, 4.0]) P.add('iron', rod([x * 0.85, WY - 1.6, ZS], [x, WY - 0.1, ZS + WZ - 0.4], 0.12, 0.1, 5));
    for (let i = 0; i < 5; i++) lancet((i - 2) * 1.25, WY + 0.25, ZS + 0.01, 0.62, 1.45);
    P.add('gunmetal', box(7.2, 0.14, 0.24, 0, WY + 1.85, ZS + 0.1));
  }
  { // rudder and four screws (under the water)
    P.add('copper', box(0.35, 3.4, 2.4, 0, -5.9, ZS - 1.0));
    P.add('iron', rod([0, -4.0, ZS - 2.3], [0, -7.6, ZS - 2.3], 0.15, 0.15, 6));
    for (const [x, y] of [[-2.2, -6.6], [2.2, -6.6], [-4.8, -5.6], [4.8, -5.6]]) {
      P.add('bronze', rod([x, y, 20], [x, y, 32.6], 0.16, 0.16, 8));
      P.add('iron', rod([x, y, 30.6], [x * 0.75, keel(sAt(30.6)) + 0.6, 30.0], 0.1, 0.1, 4));
      const pg = new THREE.Group(), Q = new Parts(M); pg.position.set(x, y, 33.0);
      Q.add('bronze', new THREE.ConeGeometry(0.3, 0.7, 10).rotateX(Math.PI / 2));
      for (let i = 0; i < 3; i++) { const b = new THREE.BoxGeometry(0.42, 1.1, 0.06); b.translate(0, 0.62, 0); b.rotateY(0.5); b.rotateZ(i * TAU / 3); Q.add('bronze', b); }
      pg.add(Q.build('screw')); root.add(pg); spin.push({ o: pg, w: x > 0 ? 3 : -3 });
    }
  }

  root.add(P.build('dreadnought'), pennant.mesh, ensign.mesh, lines(rig, M.rope));
  finish(root);

  function anim(t, dt) {
    for (const tr of turrets) { tr.o.rotation.y = tr.base + Math.sin(t * 0.16 + tr.ph) * tr.amp; tr.c.rotation.x = 0.07 + 0.06 * Math.sin(t * 0.23 + tr.ph); }
    for (const s of spin) s.o.rotation.z += s.w * dt;
    for (const f of fx) f.update(t);
    pennant.update(t); ensign.update(t);
  }
  // the push runs down the starboard side: the forecastle lane past A and B, the tower and funnels, the stairs, the main
  // deck past the secondary turret and the cover, round the aft turret, down the hooded stairs to the stern walk
  const crew = [[4.4, FC_H, -25.6, 'pirate'], [5.0, FC_H, -16.0, 'pirate'], [5.4, FC_H, -8.0, 'hero'], [2.4, 0, 0.6, 'hero'],
    [5.2, 0, 6.6, 'pirate'], [5.7, 0, 12.4, 'pirate'], [0.2, 0, 17.0, 'pirate'], [-2.8, 0, 21.6, 'pirate'], [4.8, 0, 29.6, 'pirate'], [0, -1.9, 38.6, 'pirate']];
  const info = { length: L + 6.5, beam: 2 * sect(0.75, 0)[0], waterline: WL, hl: ZS + 2.4, hb: hx(0.4, WL), glow, crew, walk: DREADNOUGHT, spikes,
    mainDeck: { z0: -1.2, z1: TC.z - TR - 0.35, width: 2 * inner(0.4) }, sternWalk: { y: -1.9, z0: ZS, z1: ZS + 3.2 },
    lane: { side: 1, path: [[4.4, FC_H, -30], [4.8, FC_H, -16], [5.0, FC_H, -6], [4.7, 0, -0.8], [5.8, 0, 12], [4.8, 0, 30.8], [2.5, 0, 36.4], [2.5, -1.9, 38.6]] },
    // the stairs as walk data ([x, y, z] foot, [x, y, z] top, width; world/seaship.js walks them as ramps): the forecastle
    // break's starboard stair down to the main deck, and the two hooded stairs at the stern down to the stern walk
    stairs: [[4.7, 0, ZB + 3.3, 4.7, FC_H, ZB - 0.45, 2.4], ...[-2.5, 2.5].map((x) => [x, -1.9, ZS + 2.5, x, 0, ZS - 2.3, 1.1])] };
  return { root, anim, info };
}
