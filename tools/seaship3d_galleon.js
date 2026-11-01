// The Black Tide's flagship: the air galleon (tools/airship3d.js) taken to sea (docs/PIRATE_SEAS.md). Same character
// (red mahogany over tarblack oak, a gold strake, raised quarterdeck and forecastle joined to the waist by wide central
// stairs, a gilded raven figurehead with spread wings, stern gallery windows, deck guns, lanterns) but nothing flies:
// a deep sea hull coppered below the waterline with a keel and a hung rudder, two tiers of gun ports with their lids
// up, and three masts of black sail (deep crimson foot and leeches, Velscour's crimson V on the main course) full of a wind on the
// starboard quarter. The pirate captain waits on the quarterdeck (info.boss); the waist and the quarterdeck are the
// battlefield and stay clear. 1 unit = 1 tile, bow toward -Z, starboard +X, main deck at y = 0.
import * as THREE from 'three';
import { Parts, box, rod, surf, tris, flag, sm, TAU, lerp, clamp, triSail, deckCannon, anchor, shrouds, wale, helm, finish } from './seaship3d.js';

// ------------------------------------------------------------------ shape of the hull
const L = 44, ZS = L / 2;                    // stern (transom) at z = +22, stem head at z = -22; s runs 0 (stern) .. 1 (bow)
const QD_S = 0.26, FC_S = 0.84, QD_H = 2.2, FC_H = 2.0, BW = 1.05, WALL = 0.3, WL = -2.4, CAP = 0.12;
const zAt = (s) => ZS - s * L, sAt = (z) => (ZS - z) / L;
const beam = (s) => s < 0.22 ? 5.1 + 0.9 * Math.sin(s / 0.22 * Math.PI / 2) : s < 0.6 ? 6.0
  : 6.0 * Math.pow(Math.max(0, 1 - Math.pow((s - 0.6) / 0.4, 1.9)), 0.6);
const sheer = (s) => BW + QD_H * (1 - sm(0.24, 0.28, s)) + FC_H * sm(0.82, 0.86, s) + 1.6 * Math.pow(sm(0.88, 1, s), 2) + 0.6 * (1 - sm(0, 0.12, s));
const keel = (s) => { const q = clamp((s - 0.7) / 0.3, 0, 1); return -6.0 + 0.7 * (1 - sm(0, 0.18, s)) + 7.0 * (1 - Math.sqrt(1 - q * q)); };   // a round forefoot
const prof = (k) => Math.pow(Math.max(0, 1 - Math.pow(k, 2.6)), 0.5);
const kOf = (s, y) => clamp((sheer(s) - y) / Math.max(1e-3, sheer(s) - keel(s)), 0, 1);
const pinch = (s, y) => 1 - (1 - sm(0, 0.24, s)) * sm(-1.3, -3.6, y) * 0.97;       // a fine run aft under the transom
const tumble = (y) => 1 - 0.09 * clamp((y + 1) / 4.6, 0, 1);                        // tumblehome above the gun deck
const hullX = (s, y) => Math.max(0.12, beam(s) * prof(kOf(s, y)) * tumble(y) * pinch(s, y));
const inner = (s) => Math.max(0, hullX(s, sheer(s)) - WALL);
const deckAt = (s) => s < QD_S ? QD_H : s > FC_S ? FC_H : 0;
const STAIR_W = 5, QD_FLIGHT = 3.0, QD_LAND = 2.3;     // forecastle stair width; the quarterdeck's twin flights (depth) and landing (width)
export const SEA_GALLEON = { L, QD_S, FC_S, QD_H, FC_H, WL, zAt, sAt, beam, sheer, keel, hullX, inner, deckAt, STAIR_W, QD_FLIGHT, QD_LAND };

let seed = 7; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;

// ------------------------------------------------------------------ cloth with paint on it
/** Splits triangles until no edge is longer than maxLen, so paint on a bellied sail follows the cloth. */
function subdivide(g, maxLen) {
  g = g.index ? g.toNonIndexed() : g;
  let a = Array.from(g.attributes.position.array);
  for (let pass = 0; pass < 6; pass++) {
    const out = []; let split = false;
    for (let i = 0; i < a.length; i += 9) {
      const p = [a.slice(i, i + 3), a.slice(i + 3, i + 6), a.slice(i + 6, i + 9)];
      const d = (u, v) => Math.hypot(u[0] - v[0], u[1] - v[1]);
      if (Math.max(d(p[0], p[1]), d(p[1], p[2]), d(p[2], p[0])) <= maxLen) { out.push(...p[0], ...p[1], ...p[2]); continue; }
      split = true;
      const m = (u, v) => [(u[0] + v[0]) / 2, (u[1] + v[1]) / 2, 0], m01 = m(p[0], p[1]), m12 = m(p[1], p[2]), m20 = m(p[2], p[0]);
      out.push(...p[0], ...m01, ...m20, ...m01, ...p[1], ...m12, ...m20, ...m12, ...p[2], ...m01, ...m12, ...m20);
    }
    a = out; if (!split) break;
  }
  const r = new THREE.BufferGeometry(); r.setAttribute('position', new THREE.Float32BufferAttribute(a, 3)); return r;
}
/** A grid in a unit rectangle (for border bands given in the sail's own u, v). */
function uvRect(u0, u1, v0, v1, nu, nv) {
  const g = new THREE.PlaneGeometry(1, 1, nu, nv), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setXYZ(i, lerp(u0, u1, p.getX(i) + 0.5), lerp(v0, v1, p.getY(i) + 0.5), 0);
  return g.toNonIndexed();
}
const polyShape = (pts) => { const s = new THREE.Shape(); s.moveTo(...pts[0]); for (const q of pts.slice(1)) s.lineTo(...q); return s; };
/** Velscour's V: a gothic letter with flared serifs and a spurred point, S high (half) around (0, cy). */
const V_PTS = [[-1.2, 1], [-0.55, 1], [-0.6, 0.88], [0, -0.35], [0.6, 0.88], [0.55, 1], [1.2, 1], [1.05, 0.88], [0.12, -0.9], [0, -1.2], [-0.12, -0.9], [-1.05, 0.88]];
const vShape = (S, cy = 0, k = 1, hx = 1) => polyShape(V_PTS.map(([x, y]) => [x * S * k * hx, cy + y * S * k]));

/**
 * A square sail hung from a yard and full of wind (the wind on the starboard quarter, so it bellies toward the bow, -Z).
 * Its group pivots on the mast at (0, 0, mz) and is braced by `brace` (radians about Y). o: { zo (cloth z rel. to the
 * mast), y0 (foot), y1 (head), w0, w1 (half widths), belly }. paint: [{ mat, uv: [u0,u1,v0,v1] } | { mat, shapes,
 * cx, cy }] painted on both faces. Returns { mesh, update(t) }.
 */
function setSail(M, mat, mz, brace, o, paint = []) {
  const grp = new THREE.Group(); grp.position.set(0, 0, mz); grp.rotation.y = brace; grp.name = 'sail';
  const st = { belly: 1.2, furl: 0, ...o, ph: rnd() * 6 };
  const H = st.y1 - st.y0, wAt = (v) => lerp(st.w0, st.w1, v);
  const pos = (u, v0, t, lift, out, i) => {
    const f = st.furl, v = 1 - (1 - v0) * (1 - f);                     // brailed: the cloth gathers up to the yard
    const bell = (1 - f) * (1 - (u * 2 - 1) ** 2) * Math.sin(Math.PI * clamp(v * 1.05 + 0.04, 0, 1));
    const breathe = 1 + 0.06 * Math.sin(t * 1.7 + st.ph) + 0.03 * Math.sin(t * 4.3 + u * 3 + st.ph);
    out[i] = (u * 2 - 1) * wAt(v) * (1 - 0.05 * bell);
    out[i + 1] = lerp(st.y0, st.y1, v) + bell * 0.15;
    out[i + 2] = st.zo - bell * st.belly * breathe + Math.sin(t * 6 + u * 8 + v * 4 + st.ph) * 0.03 * (1 - f) + lift * (1 + f * 3) - f * 0.25 * Math.sin(Math.PI * v0);
  };
  const sheets = [], mats = [];
  const add = (g, m, lift, uvs) => {
    const mesh = new THREE.Mesh(g, m); mesh.castShadow = true; grp.add(mesh); sheets.push({ g, uvs, lift }); if (!mats.includes(m)) mats.push(m);
  };
  const cloth = new THREE.PlaneGeometry(1, 1, 16, 10), cm = mat.clone(); cm.side = THREE.DoubleSide;
  if (cm.map) { cm.map = cm.map.clone(); cm.map.repeat.set(Math.max(1, st.w0 / 1.4), Math.max(1, H / 1.8)); cm.map.needsUpdate = true; cm.bumpMap = cm.map; }
  add(cloth, cm, 0, Array.from(cloth.attributes.uv.array));
  for (const p of paint) {
    let g;
    if (p.uv) g = uvRect(...p.uv, Math.max(2, Math.round((p.uv[1] - p.uv[0]) * 16)), Math.max(1, Math.round((p.uv[3] - p.uv[2]) * 10)));
    else {
      g = subdivide(new THREE.ShapeGeometry(p.shapes, 10), 0.35);
      const a = g.attributes.position;                      // local units -> the sail's u, v
      for (let i = 0; i < a.count; i++) { const v = 0.5 + (a.getY(i) + (p.cy || 0)) / H; a.setXYZ(i, 0.5 + (a.getX(i) + (p.cx || 0)) / (2 * wAt(v)), v, 0); }
    }
    const uvs = []; const a = g.attributes.position; for (let i = 0; i < a.count; i++) uvs.push(a.getX(i), a.getY(i));
    const pm = M[p.mat].clone(); pm.side = THREE.DoubleSide; pm.map = null; pm.bumpMap = null;
    for (const lift of [0.05 + (p.lift || 0), -0.05 - (p.lift || 0)]) add(lift > 0 ? g : g.clone(), pm, lift, uvs);
  }
  const update = (t) => {
    for (const sh of sheets) {
      const a = sh.g.attributes.position.array;
      for (let i = 0, k = 0; i < a.length; i += 3, k += 2) pos(sh.uvs[k], sh.uvs[k + 1], t, sh.lift, a, i);
      sh.g.attributes.position.needsUpdate = true; sh.g.computeVertexNormals();
    }
  };
  update(0);
  const fade = (a) => { for (const m of mats) { m.transparent = a < 1; m.opacity = a; m.depthWrite = a >= 1; m.needsUpdate = true; } grp.children.forEach((c) => { c.castShadow = a >= 1; }); };
  return { mesh: grp, update, set: (p) => { Object.assign(st, p); update(0); }, fade };
}
/** A black flag streaming downwind from a pole at p (its top corner), heading `ry` about Y, Velscour's crimson V on both faces. */
function jollyRoger(M, len, h, p, ry, amp = 0.16) {
  const grp = new THREE.Group(); grp.position.set(...p); grp.rotation.y = ry; grp.name = 'jollyroger';
  const sheets = [];
  const add = (g, m, lift) => { const base = Array.from(g.attributes.position.array); const mesh = new THREE.Mesh(g, m); mesh.castShadow = true; grp.add(mesh); sheets.push({ g, base, lift }); };
  const cloth = new THREE.PlaneGeometry(len, h, 24, 6).translate(len / 2, -h / 2, 0).toNonIndexed();
  const cm = M.blackSail.clone(); cm.side = THREE.DoubleSide; add(cloth, cm, 0);
  const cr = M.crimson.clone(); cr.side = THREE.DoubleSide;
  const g = subdivide(new THREE.ShapeGeometry([vShape(h * 0.33)], 8), 0.3); g.translate(len * 0.42, -h * 0.5, 0);
  add(g, cr, 0.03); add(g.clone(), cr, -0.03);
  const band = uvRect(len * 0.86, len, -h, 0, 3, 6);                    // a crimson fly
  add(band, cr, 0.03); add(band.clone(), cr, -0.03);
  const update = (t) => {
    for (const sh of sheets) {
      const a = sh.g.attributes.position.array, b = sh.base;
      for (let i = 0; i < a.length; i += 3) {
        const x = b[i], f = x / len;
        a[i] = x; a[i + 1] = b[i + 1] - f * f * 0.3 * h;
        a[i + 2] = Math.sin(x * 1.9 - t * 9) * amp * (0.2 + f) + Math.sin(x * 4.1 - t * 15) * amp * 0.25 * f + sh.lift;
      }
      sh.g.attributes.position.needsUpdate = true; sh.g.computeVertexNormals();
    }
  };
  update(0);
  return { mesh: grp, update };
}

// ------------------------------------------------------------------ the ship
export function buildSeaGalleon(M0) {
  // the Tide's own paints, layered over the shared set: tarred planks (the mahogany's planking, near black), a deeper
  // tar for the boot-top, Velscour's deep crimson (a little self-lit so it holds at night and in fog), red-amber glass
  const tint = (src, color, o = {}) => { const m = M0[src].clone(); m.color = new THREE.Color(color); Object.assign(m, o); return m; };
  const M = Object.assign(Object.create(M0), {
    tarPlank: tint('hull', 0x4a3e40), bootTop: tint('hull', 0x262022), keelWood: tint('blackwood', 0x6a5a58),
    crimson: new THREE.MeshStandardMaterial({ color: 0x8a1414, emissive: 0x5a0808, emissiveIntensity: 1.0, roughness: 0.9 }),
    redGlass: new THREE.MeshStandardMaterial({ color: 0xff9a60, emissive: 0xff4a18, emissiveIntensity: 1.5, roughness: 0.6 }),
  });
  const root = new THREE.Group(); root.name = 'seaGalleon';
  const P = new Parts(M), wave = [], glow = [], standing = [], running = [], courses = [], upper = [], fadeOnly = [], sheets = [];
  const NS = 176;

  // Hull: bands by absolute height so the boot-topping sits level along the whole ship.
  const yIn = (u, yt, yb, v) => { const top = sheer(u), bot = keel(u), a = yt == null ? top : clamp(yt, bot, top), b = yb == null ? bot : clamp(yb, bot, top); return a + (b - a) * v; };
  const BANDS = [['hull', null, 0.05, 6], ['gold', 0.05, -0.22, 1], ['tarPlank', -0.22, -1.95, 6], ['bootTop', -1.95, -2.65, 2], ['copper', -2.65, null, 14]];
  for (const [mat, yt, yb, nk] of BANDS) for (const side of [1, -1]) P.add(mat, surf(NS, nk, (u, v) => {
    const y = yIn(u, yt, yb, v); return [side * hullX(u, y), y, zAt(u)];
  }, (u, v) => { const y = yIn(u, yt, yb, v); return [zAt(u) / 2, (y - sheer(u)) / 2]; }, side > 0), { uv: 'keep' });
  // the transom, banded the same way
  {
    const ys = new Set(); for (let y = sheer(0); y > keel(0); y -= 0.2) ys.add(+y.toFixed(3));
    for (const [, yt, yb] of BANDS) { if (yt != null) ys.add(yt); if (yb != null) ys.add(yb); }
    ys.add(keel(0)); const list = [...ys].filter((y) => y <= sheer(0) && y >= keel(0)).sort((a, b) => b - a);
    const matAt = (y) => (BANDS.find(([, yt, yb]) => (yt == null || y <= yt) && (yb == null || y >= yb)) || BANDS[0])[0];
    for (let j = 0; j < list.length - 1; j++) {
      const y0 = list[j], y1 = list[j + 1], x0 = hullX(0, y0), x1 = hullX(0, y1);
      P.add(matAt((y0 + y1) / 2), tris([[-x0, y0, ZS], [x0, y0, ZS], [x1, y1, ZS], [-x1, y1, ZS]], [0, 3, 2, 0, 2, 1]));
    }
  }
  // bulwarks: inner faces, the cap rail with its edges; decks
  for (const side of [1, -1]) {
    P.add('blackwood', surf(NS, 1, (u, v) => [side * inner(u), v ? deckAt(u) - 0.05 : sheer(u), zAt(u)], (u, v) => [zAt(u) / 2, v * 0.6], side < 0), { uv: 'keep' });
    P.add('goldHammer', surf(NS, 1, (u, v) => [side * (v ? inner(u) - 0.05 : hullX(u, sheer(u)) + 0.06), sheer(u) + CAP, zAt(u)], (u, v) => [zAt(u) / 2, v * 0.2], side < 0), { uv: 'keep' });
    P.add('goldHammer', surf(NS, 1, (u, v) => [side * (hullX(u, sheer(u)) + 0.06), sheer(u) + CAP * (1 - v) - 0.02, zAt(u)], (u, v) => [zAt(u) / 2, v * 0.1], side > 0), { uv: 'keep' });
    P.add('goldHammer', surf(NS, 1, (u, v) => [side * (inner(u) - 0.05), sheer(u) + CAP * (1 - v) - 0.02, zAt(u)], (u, v) => [zAt(u) / 2, v * 0.1], side < 0), { uv: 'keep' });
  }
  const deckStrip = (mat, s0, s1, y) => P.add(mat, surf(Math.max(2, Math.ceil((s1 - s0) * NS)), 1, (u, v) => {
    const s = s0 + (s1 - s0) * u; return [(v * 2 - 1) * inner(s), y, zAt(s)];
  }, (u, v) => { const s = s0 + (s1 - s0) * u; return [zAt(s) / 2, (v * 2 - 1) * inner(s) / 2]; }, true), { uv: 'keep' });
  deckStrip('deck', QD_S - 0.01, FC_S + 0.01, 0);
  deckStrip('deck2', 0.0075, QD_S, QD_H);
  deckStrip('deck2', FC_S, 0.993, FC_H);
  const HL = { L, ns: NS };
  wale(P, 'blackwood', HL, hullX, -0.45, 0.16, 0.004, 0.985, 0.05);
  wale(P, 'blackwood', HL, hullX, -1.95, 0.12, 0.006, 0.975, 0.04);
  wale(P, 'goldHammer', HL, hullX, QD_H + 0.12, 0.14, 0.004, 0.232, 0.05);
  wale(P, 'goldHammer', HL, hullX, FC_H + 0.12, 0.14, 0.868, 0.985, 0.05);
  // keel and stem: a timber following the keel line, coppered under water, then the stem up to the head
  {
    let sw = 0.7; for (let s = 0.7; s < 1; s += 0.001) if (keel(s) > -2.6) { sw = s; break; }
    const strip = (mat, s0, s1, w, below, above) => {
      const n = Math.max(4, Math.round((s1 - s0) * 160));
      const at = (s, d) => {
        const e = 0.002, dz = zAt(s + e) - zAt(s - e), dy = keel(Math.min(1, s + e)) - keel(Math.max(0, s - e)), l = Math.hypot(dz, dy), nz = -dy / l, ny = dz / l;
        return [zAt(s) + nz * d, keel(s) + ny * d];
      };
      for (const side of [1, -1]) P.add(mat, surf(n, 1, (u, v) => { const [z, y] = at(lerp(s0, s1, u), v ? -above : below); return [side * w, y, z]; }, (u, v) => [u * (s1 - s0) * L / 2, v * 0.3], side > 0), { uv: 'keep' });
      P.add(mat, surf(n, 1, (u, v) => { const [z, y] = at(lerp(s0, s1, u), below); return [(v * 2 - 1) * w, y, z]; }, (u, v) => [u * (s1 - s0) * L / 2, v * 0.3], false), { uv: 'keep' });
    };
    strip('copper', 0.0, sw, 0.2, 0.42, 0.3);
    strip('blackwood', sw - 0.002, 0.999, 0.18, 0.3, 0.3);
    P.add('blackwood', box(0.32, sheer(1) - keel(1) + 0.2, 0.34, 0, (sheer(1) + keel(1)) / 2, zAt(1) - 0.05));          // stem head
    P.add('copper', box(0.34, -1.4 - keel(0), 0.36, 0, (keel(0) - 1.4) / 2 - 0.2, ZS - 0.1));                            // sternpost
  }
  // Rudder hung on the sternpost: coppered blade, blackwood head, iron pintle straps.
  {
    const blade = (mat, yTop, yBot) => {
      const ex = (y) => ZS + 0.15 + lerp(0.55, 1.75, clamp((0.6 - y) / 6, 0, 1));
      const sh = new THREE.Shape(); sh.moveTo(ZS + 0.12, yTop); sh.lineTo(ex(yTop), yTop); sh.lineTo(ex(yBot), yBot); sh.lineTo(ZS + 0.12, yBot);
      const g = new THREE.ExtrudeGeometry(sh, { depth: 0.34, bevelEnabled: false }); g.rotateY(-Math.PI / 2); g.translate(0.17, 0, 0);
      P.add(mat, g);
    };
    blade('copper', -2.6, keel(0) - 0.25); blade('blackwood', 0.7, -2.6);
    for (let y = -4.9; y < 0.6; y += 1.15) P.add('iron', box(0.42, 0.14, 1.1, 0, y, ZS + 0.25));
    P.add('blackwood', box(0.4, 0.5, 0.5, 0, 0.9, ZS + 0.4));
  }

  // Stern bulwark across the quarterdeck, the bulkheads under the raised decks with doors.
  P.add('blackwood', box(inner(0) * 2, sheer(0) - QD_H, WALL, 0, (sheer(0) + QD_H) / 2, ZS - WALL / 2));
  P.add('goldHammer', box(hullX(0, sheer(0)) * 2 + 0.12, CAP, WALL + 0.12, 0, sheer(0) + CAP / 2, ZS - WALL / 2));
  const zq = zAt(QD_S), zf = zAt(FC_S);
  P.add('hull', box(inner(QD_S) * 2, QD_H, 0.3, 0, QD_H / 2, zq - 0.15));
  P.add('hull', box(inner(FC_S) * 2, FC_H, 0.3, 0, FC_H / 2, zf + 0.15));
  for (const [z, f, w] of [[zq - 0.32, -1, inner(QD_S)], [zf + 0.32, 1, inner(FC_S)]]) {
    P.add('goldHammer', box(w * 2, 0.14, 0.12, 0, (f < 0 ? QD_H : FC_H) - 0.1, z));
    P.add('goldHammer', box(w * 2, 0.1, 0.1, 0, 0.05, z));
  }
  const door = (x, z, face) => {
    P.add('dark', box(1.1, 1.75, 0.06, x, 0.88, z + face * 0.05));
    P.add('scroll', box(1.0, 1.65, 0.05, x, 0.83, z + face * 0.09));
    P.add('iron', box(0.1, 0.1, 0.1, x + 0.32, 0.9, z + face * 0.13));
    P.add('goldHammer', box(1.3, 0.14, 0.12, x, 1.8, z + face * 0.08));
    for (const dx of [-0.6, 0.6]) P.add('goldHammer', box(0.12, 1.85, 0.12, x + dx, 0.92, z + face * 0.08));
  };
  door(-3.4, zf + 0.3, 1); door(3.4, zf + 0.3, 1); door(0, zq - 0.3, -1);

  const lantern = (x, y, z, big = 1, c = 0xffa040, glass = 'glass') => {
    P.add('iron', box(0.3 * big, 0.06, 0.3 * big, x, y, z));
    P.add(glass, box(0.22 * big, 0.3 * big, 0.22 * big, x, y + 0.18 * big, z));
    for (const [dx, dz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) P.add('iron', box(0.03, 0.32 * big, 0.03, x + dx * 0.12 * big, y + 0.18 * big, z + dz * 0.12 * big));
    P.add('goldHammer', new THREE.ConeGeometry(0.2 * big, 0.2 * big, 4).rotateY(Math.PI / 4).translate(x, y + 0.43 * big, z));
    glow.push({ x, y: y + 0.18 * big, z, r: 1.6 * big, c });
  };
  // Stairs: a wide central flight up to the forecastle; to the quarterdeck a grand double stair (two flights rising
  // athwartships from the bulwarks to a central landing), so the waist and the captain's deck fight as one arena.
  const stairs = (z0, dir, h, n, w) => {
    const rise = h / n, run = 0.42;
    for (let i = 0; i < n; i++) { const y = rise * (n - i), z = z0 + dir * run * (i + 0.5); P.add('step', box(w, y, run, 0, y / 2, z)); P.add('goldHammer', box(w, 0.05, 0.08, 0, y + 0.01, z + dir * (run / 2 - 0.05))); }
    const len = run * n, ang = Math.atan2(h, len);
    for (const sx of [-1, 1]) {
      const g = new THREE.BoxGeometry(0.24, 0.34, Math.hypot(len, h) + 0.2); g.rotateX(dir * ang); g.translate(sx * (w / 2 + 0.12), h / 2 + 0.12, z0 + dir * len / 2);
      P.add('blackwood', g);
      P.add('goldHammer', rod([sx * (w / 2 + 0.12), h + 0.95, z0], [sx * (w / 2 + 0.12), 0.95, z0 + dir * len], 0.05, 0.05, 6));       // handrail
      P.add('scroll', box(0.24, 1.05, 0.24, sx * (w / 2 + 0.12), 0.52, z0 + dir * len));                                            // newel
      lantern(sx * (w / 2 + 0.12), 1.06, z0 + dir * len, 0.9);
    }
    return z0 + dir * len;
  };
  const fFoot = stairs(zf, 1, FC_H, 8, STAIR_W);
  const qFoot = zq - QD_FLIGHT, qFlights = [];
  for (const sx of [-1, 1]) {                                   // each flight: foot by the bulwark, top at the landing
    const n = 9, run = 0.42, rise = QD_H / n, d = QD_FLIGHT, zc = zq - d / 2, x1 = sx * QD_LAND / 2, xf = x1 + sx * run * n;
    for (let i = 0; i < n; i++) { const y = rise * (n - i), x = x1 + sx * run * (i + 0.5); P.add('step', box(run, y, d, x, y / 2, zc)); P.add('goldHammer', box(0.08, 0.05, d, x + sx * (run / 2 - 0.05), y + 0.01, zc)); }
    const len = run * n, ang = Math.atan2(QD_H, len), zs = zq - d - 0.12;
    const g = new THREE.BoxGeometry(Math.hypot(len, QD_H) + 0.2, 0.34, 0.24); g.rotateZ(-sx * ang); g.translate((x1 + xf) / 2, QD_H / 2 + 0.12, zs); P.add('blackwood', g);
    P.add('goldHammer', rod([x1, QD_H + 0.95, zs], [xf, 0.95, zs], 0.05, 0.05, 6));
    P.add('scroll', box(0.24, 1.05, 0.24, xf, 0.52, zs)); lantern(xf, 1.06, zs, 0.9);
    qFlights.push({ x0: Math.min(xf, x1), x1: Math.max(xf, x1), z0: zq - d, z1: zq, y0: 0, y1: QD_H, foot: [xf, 0, zc], top: [x1, QD_H, zc] });
  }
  P.add('deck2', box(QD_LAND, 0.2, QD_FLIGHT, 0, QD_H - 0.1, zq - QD_FLIGHT / 2));            // the landing, on carved posts
  P.add('goldHammer', box(QD_LAND + 0.1, 0.1, 0.12, 0, QD_H - 0.15, zq - QD_FLIGHT));
  for (const sx of [-1, 1]) P.add('scroll', box(0.28, QD_H - 0.2, 0.28, sx * (QD_LAND / 2 - 0.16), (QD_H - 0.2) / 2, zq - QD_FLIGHT + 0.16));
  lantern(-QD_LAND / 2 + 0.16, QD_H + 0.02, zq - QD_FLIGHT + 0.16, 0.8); lantern(QD_LAND / 2 - 0.16, QD_H + 0.02, zq - QD_FLIGHT + 0.16, 0.8);

  // Balustrades on the raised deck edges (a gap for the stairs), lanterns on the newels.
  const rail = (x0, x1, y, z) => {
    const len = Math.abs(x1 - x0), cx = (x0 + x1) / 2, n = Math.max(2, Math.round(len / 0.42));
    for (let i = 0; i <= n; i++) P.add('blackwood', rod([x0 + (x1 - x0) * i / n, y, z], [x0 + (x1 - x0) * i / n, y + 0.62, z], 0.05, 0.065, 6));
    P.add('goldHammer', box(len + 0.16, 0.12, 0.2, cx, y + 0.68, z));
    P.add('blackwood', box(len, 0.08, 0.14, cx, y + 0.1, z));
    for (const x of [x0, x1]) P.add('scroll', box(0.26, 0.92, 0.26, x, y + 0.46, z));
  };
  for (const [z, y, s, sw] of [[zq - 0.12, QD_H, QD_S, QD_LAND - 0.5], [zf + 0.12, FC_H, FC_S, STAIR_W]]) {
    const sg = sw / 2 + 0.25;
    rail(-inner(s) + 0.1, -sg, y, z); rail(sg, inner(s) - 0.1, y, z);
    lantern(-sg, y + 0.92, z); lantern(sg, y + 0.92, z);
  }
  for (const s of [0.3, 0.47, 0.64, 0.79]) for (const side of [-1, 1]) lantern(side * (inner(s) + WALL / 2), sheer(s) + CAP, zAt(s), 0.8);

  // Gun ports: the gun deck tier through the tarblack, the upper tier in the bulwarks and under the raised decks.
  const port = (s, y, side, size, frame, gun = 'iron') => {
    const z = zAt(s), x = side * (hullX(s, y) + 0.02);
    P.add('dark', box(0.5, size, size, x - side * 0.2, y, z));
    P.add(frame, box(0.12, size + 0.16, 0.1, x + side * 0.02, y, z - size / 2 - 0.04));
    P.add(frame, box(0.12, size + 0.16, 0.1, x + side * 0.02, y, z + size / 2 + 0.04));
    P.add(frame, box(0.12, 0.1, size + 0.16, x + side * 0.02, y - size / 2 - 0.04, z));
    P.add(frame, box(0.12, 0.1, size + 0.16, x + side * 0.02, y + size / 2 + 0.04, z));
    const g = new THREE.BoxGeometry(0.08, size, size); g.translate(0, size / 2, 0); g.rotateZ(-side * 1.15); g.translate(x + side * 0.06, y + size / 2 + 0.05, z);
    P.add('redPaint', g);
    P.add('iron', rod([x + side * 0.05, y + size / 2 + 0.05, z - size * 0.3], [x + side * (0.05 + size * 0.95), y + size * 0.85, z - size * 0.3], 0.02, 0.02, 4));   // lid tackle
    if (gun) {
      P.add(gun, rod([x - side * 0.3, y - 0.04, z], [x + side * 0.5, y - 0.02, z], size * 0.22, size * 0.18, 10));
      P.add(gun, rod([x + side * 0.42, y - 0.02, z], [x + side * 0.54, y - 0.02, z], size * 0.25, size * 0.25, 10));
    }
  };
  const LOWER = [], UPPER = [0.075, 0.13, 0.34, 0.42, 0.6, 0.69, 0.78, 0.88], WAIST = [0.34, 0.42, 0.6, 0.69, 0.78];
  for (let i = 0; i < 11; i++) LOWER.push(0.12 + i * 0.072);
  for (const side of [-1, 1]) {
    for (const s of LOWER) port(s, -1.3, side, 0.72, 'blackwood');
    for (const s of UPPER) port(s, 0.55, side, 0.6, 'goldHammer', WAIST.includes(s) ? null : 'iron');
    for (const s of WAIST) {                                      // the deck guns run out through the bulwark ports
      const z = zAt(s);
      P.add('dark', box(0.08, 0.6, 0.6, side * (inner(s) + 0.02), 0.55, z));
      deckCannon(P, side * (inner(s) - 1.0), 0, z, side > 0 ? 0 : Math.PI, { len: 2.0, r: 0.19 });
      for (const dz of [-0.55, 0.55]) P.add('iron', new THREE.TorusGeometry(0.06, 0.02, 4, 8).translate(side * (inner(s) - 0.02), 0.6, z + dz));   // breeching ring bolts
    }
  }
  // two stern chasers and two bow chasers
  for (const x of [-1.7, 1.7]) {
    P.add('dark', box(0.62, 0.6, 0.1, x, -0.85, ZS + 0.02));
    for (const [w, h, dx, dy] of [[0.8, 0.1, 0, 0.34], [0.8, 0.1, 0, -0.34], [0.1, 0.78, 0.36, 0], [0.1, 0.78, -0.36, 0]]) P.add('goldHammer', box(w, h, 0.1, x + dx, -0.85 + dy, ZS + 0.06));
    P.add('iron', rod([x, -0.87, ZS - 0.2], [x, -0.85, ZS + 0.55], 0.15, 0.12, 10));
  }
  for (const side of [-1, 1]) port(0.95, 1.0, side, 0.55, 'goldHammer');

  // Channels, deadeyes and chain plates, for the shrouds.
  const channel = (s, ych, z0, z1, side, n) => {
    const zc = (z0 + z1) / 2, xh = hullX(sAt(zc), ych), feet = [];
    P.add('blackwood', box(0.64, 0.14, z1 - z0, side * (xh + 0.3), ych, zc));
    for (let i = 0; i < n; i++) {
      const zz = lerp(z0 + 0.3, z1 - 0.3, i / Math.max(1, n - 1)), xh2 = hullX(sAt(zz), ych), dx = side * (xh2 + 0.5);
      P.add('endgrain', new THREE.CylinderGeometry(0.13, 0.13, 0.08, 8).rotateZ(Math.PI / 2).translate(dx, ych + 0.2, zz));
      P.add('iron', rod([dx, ych + 0.08, zz], [side * (hullX(sAt(zz), ych - 1.1) + 0.04), ych - 1.1, zz + 0.12], 0.03, 0.03, 4));
      P.add('iron', box(0.08, 0.1, 0.12, side * (hullX(sAt(zz), ych - 1.1) + 0.04), ych - 1.1, zz + 0.12));
      feet.push([dx, ych + 0.3, zz]);
    }
    return feet;
  };

  // Masts: lower mast, topmast and topgallant with doublings and caps; fighting tops with rails; braced yards.
  const MASTS = [
    { key: 'fore', s: 0.885, h: 20.6, r: 0.44, top: 8.3, tr: 1.7, cross: 13.9, brace: 0.21, belly: 1.0, ych: 2.55, ch: [-1.4, 2.2], n: 4,
      yards: [[8.0, 6.2], [13.35, 4.9], [17.6, 3.5]], sails: [[3.3, 7.85, 5.95, 5.85], [8.2, 13.2, 5.0, 4.45], [13.6, 17.45, 3.8, 3.25]] },
    { key: 'main', s: 0.52, h: 23.6, r: 0.52, top: 9.9, tr: 2.0, cross: 16.3, brace: 0.17, belly: 1.25, ych: 0.85, ch: [-1.9, 2.6], n: 5, nest: true,
      yards: [[9.45, 7.2], [15.45, 5.5], [20.3, 3.8]], sails: [[4.2, 9.3, 6.95, 6.9], [9.65, 15.3, 6.0, 5.2], [15.7, 20.15, 4.5, 3.6]] },
    { key: 'mizzen', s: 0.06, h: 15.6, r: 0.36, top: 7.3, tr: 1.35, cross: 11.7, brace: 0.13, belly: 0.9, ych: 2.8, ch: [-2.5, -0.1], n: 3,
      yards: [[7.0, 4.4, true], [11.5, 3.5]], sails: [null, [7.45, 11.35, 3.9, 3.35]] },
  ];
  const MT = {};
  const rot = (a, mz) => (x, y, zr) => [x * Math.cos(a) + zr * Math.sin(a), y, mz - x * Math.sin(a) + zr * Math.cos(a)];
  for (const m of MASTS) {
    const z = zAt(m.s), y0 = deckAt(m.s), r = m.r, rt = 0.6 * r, rg = 0.38 * r, zt = -0.95 * r, zg = zt - 0.75 * rt, R = rot(m.brace, z);
    const T = MT[m.key] = { z, y0, head: y0 + m.top, top: [0, y0 + m.top, z], cross: [0, y0 + m.cross, z + zt], truck: [0, y0 + m.h, z + zg], yards: [] };
    // lower mast with woolding bands, partners and a gold ring at the deck
    P.add('cedar', rod([0, y0 - 0.1, z], [0, y0 + m.top + 1.35, z], r, r * 0.82, 12), { swap: true });
    for (let y = y0 + 0.9; y < y0 + m.top - 0.5; y += 1.4) P.add('iron', rod([0, y, z], [0, y + 0.15, z], r * (1 - 0.18 * (y - y0) / m.top) + 0.035, undefined, 12));
    P.add('scroll', box(r * 3.2, 0.36, r * 3.2, 0, y0 + 0.18, z));
    P.add('goldHammer', new THREE.TorusGeometry(r + 0.06, 0.06, 4, 14).rotateX(Math.PI / 2).translate(0, y0 + 0.4, z));
    // fife rail of belaying pins round the foot (small: the deck stays open)
    for (const [dx, dz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) P.add('blackwood', box(0.14, 0.78, 0.14, dx * 1.0, y0 + 0.39, z + dz * 0.8));
    for (const dz of [-0.8, 0.8]) P.add('blackwood', box(2.14, 0.12, 0.16, 0, y0 + 0.78, z + dz));
    for (let i = 0; i < 6; i++) for (const dz of [-0.8, 0.8]) P.add('iron', rod([-0.75 + i * 0.3, y0 + 0.7, z + dz], [-0.75 + i * 0.3, y0 + 0.98, z + dz], 0.025, 0.025, 4));
    // the top: trestle trees, a round platform set aft, a rail of posts
    const ty = y0 + m.top, tz = z + 0.45;
    for (const dx of [-0.42, 0.42]) P.add('blackwood', box(0.16, 0.22, m.tr * 1.8, dx, ty - 0.12, tz));
    for (const dz of [-0.7, 0.2, 1.1]) P.add('blackwood', box(m.tr * 1.8, 0.16, 0.16, 0, ty - 0.1, tz + dz * m.tr / 2));
    P.add('cedar', new THREE.CylinderGeometry(m.tr, m.tr * 0.94, 0.16, 18).translate(0, ty + 0.08, tz));
    P.add('iron', new THREE.TorusGeometry(m.tr, 0.05, 4, 20).rotateX(Math.PI / 2).translate(0, ty + 0.12, tz));
    for (let i = 0; i < 14; i++) { const a = i / 14 * TAU; P.add('blackwood', rod([Math.sin(a) * m.tr * 0.96, ty + 0.16, tz + Math.cos(a) * m.tr * 0.96], [Math.sin(a) * m.tr * 0.96, ty + 0.9, tz + Math.cos(a) * m.tr * 0.96], 0.04, 0.04, 4)); }
    P.add('goldHammer', new THREE.TorusGeometry(m.tr * 0.96, 0.06, 4, 20).rotateX(Math.PI / 2).translate(0, ty + 0.9, tz));
    P.add('blackwood', new THREE.TorusGeometry(m.tr * 0.96, 0.04, 4, 20).rotateX(Math.PI / 2).translate(0, ty + 0.52, tz));
    // the cap over the doubling, the topmast, crosstrees, the topgallant mast and its truck
    P.add('iron', box(r * 2.3, 0.3, r * 2 + rt * 2 + 0.5, 0, ty + 1.2, z + zt / 2));
    P.add('cedar', rod([0, ty - 0.25, z + zt], [0, y0 + m.cross + 1.1, z + zt], rt, rt * 0.78, 10), { swap: true });
    for (let y = ty + 2.4; y < y0 + m.cross - 0.4; y += 1.5) P.add('iron', rod([0, y, z + zt], [0, y + 0.12, z + zt], rt * 0.95 + 0.03, undefined, 10));
    const cy = y0 + m.cross;
    P.add('blackwood', box(2.4, 0.14, 0.16, 0, cy, z + zt + 0.15)); P.add('blackwood', box(1.6, 0.14, 0.16, 0, cy, z + zt + 0.75));
    for (const dx of [-0.25, 0.25]) P.add('blackwood', box(0.12, 0.16, 1.3, dx, cy + 0.05, z + zt + 0.35));
    P.add('iron', box(rt * 2.4, 0.22, rt * 2 + rg * 2 + 0.4, 0, cy + 1.2, z + zt + (zg - zt) / 2));
    P.add('cedar', rod([0, cy - 0.5, z + zg], [0, y0 + m.h, z + zg], rg, rg * 0.7, 8), { swap: true });
    P.add('goldHammer', new THREE.SphereGeometry(rg * 1.5, 8, 6).translate(0, y0 + m.h + 0.08, z + zg));
    if (m.nest) {                                             // crow's nest on the main crosstrees, aft of the topmast
      const nz = z + zt + 0.55;
      P.add('cedar', new THREE.CylinderGeometry(0.78, 0.66, 0.95, 14, 1, true).translate(0, cy + 0.6, nz));
      P.add('cedar', new THREE.CylinderGeometry(0.66, 0.66, 0.1, 14).translate(0, cy + 0.14, nz));
      for (const y of [cy + 0.2, cy + 1.05]) P.add('iron', new THREE.TorusGeometry(y > cy + 0.5 ? 0.79 : 0.68, 0.045, 4, 16).rotateX(Math.PI / 2).translate(0, y, nz));
    }
    // yards (braced round the mast), footropes, lifts; sails set under them
    m.yards.forEach(([yy, w, bare], i) => {
      const yAbs = y0 + yy, mr = i === 0 ? r * 0.85 : i === 1 ? rt * 0.85 : rg * 0.8, zc = (i === 0 ? 0 : i === 1 ? zt : zg) - mr - 0.17, yr = i === 0 ? 0.17 : i === 1 ? 0.13 : 0.1;
      const A = R(-w, yAbs, zc), B = R(w, yAbs, zc), C = R(0, yAbs, zc);
      P.add('cedar', rod(C, A, yr, yr * 0.6, 8), { swap: true }); P.add('cedar', rod(C, B, yr, yr * 0.6, 8), { swap: true });
      for (const sx of [-1, 1]) P.add('iron', rod(R(sx * w * 0.96, yAbs, zc), R(sx * w * 1.02, yAbs, zc), yr * 0.75, yr * 0.75, 6));
      P.add('iron', rod(R(-0.3, yAbs, zc), R(0.3, yAbs, zc), yr * 1.25, yr * 1.25, 8));         // the parrel and sling band
      for (const sx of [-1, 1]) {
        running.push(R(sx * w, yAbs, zc), R(sx * w * 0.2, yAbs + 2.0, zc + 0.15));                     // lifts
        standing.push(R(sx * w * 0.98, yAbs - 0.05, zc + 0.12), R(sx * w * 0.55, yAbs - 0.62, zc + 0.12), R(sx * w * 0.55, yAbs - 0.62, zc + 0.12), R(sx * 0.4, yAbs - 0.45, zc + 0.12));   // footropes
      }
      T.yards.push({ y: yAbs, w, zc, A, B });
      const sd = m.sails[i];
      if (sd && !bare) {
        const [f0, f1, w0, w1] = sd, main = m.key === 'main' && i === 0;
        const paint = [{ mat: 'crimson', uv: [0, 1, 0, 0.06] }, { mat: 'crimson', uv: [0, 0.03, 0.06, 1] }, { mat: 'crimson', uv: [0.97, 1, 0.06, 1] }];
        if (main) paint.push({ mat: 'crimson', shapes: [vShape(2.2, 0, 1, 2.0)], cy: 0.22, lift: 0.01 });
        const sail = setSail(M, M.blackSail, z, m.brace, { zo: zc - 0.08, y0: y0 + f0, y1: y0 + f1, w0, w1, belly: m.belly * (i === 2 ? 0.75 : 1) }, paint);
        wave.push(sail); (i === 0 ? courses : upper).push(sail);
        const clew = (sx) => R(sx * w0, y0 + f0, zc - 0.08);
        if (i === 0) for (const sx of [-1, 1]) {                      // course sheets aft and tacks forward to the rail
          const sa = clamp(m.s - 0.14, 0.02, 1), sb = clamp(m.s + 0.1, 0, 0.98);
          sheets.push(clew(sx), [sx * (inner(sa) + 0.1), sheer(sa) + CAP, zAt(sa)], clew(sx), [sx * (inner(sb) + 0.1), sheer(sb) + CAP, zAt(sb)]);
        } else for (const sx of [-1, 1]) running.push(clew(sx), T.yards[i - 1][sx < 0 ? 'A' : 'B']);   // topsail sheets to the yardarms below
      }
    });
    // shrouds with ratlines from the lower masthead down to the channels; topmast and topgallant shrouds above
    for (const side of [-1, 1]) {
      const feet = channel(m.s, m.ych, z + m.ch[0], z + m.ch[1], side, m.n);
      standing.push(...shrouds([side * r * 0.85, ty - 0.25, z], feet[0], feet[feet.length - 1], feet.length, 0.42));
      const rim = (dz) => [side * m.tr * 0.9, ty + 0.14, tz + dz];
      standing.push(...shrouds([side * rt * 0.9, cy - 0.15, z + zt], rim(-0.6), rim(0.9), 3, 0.42));
      for (const dz of [-0.6, 0.15, 0.9]) standing.push(rim(dz), [side * r * 0.82, ty - 1.7, z + dz * 0.3]);   // futtocks
      standing.push([side * rg * 0.9, y0 + m.h - 1.6, z + zg], [side * 1.15, cy + 0.07, z + zt + 0.15], [side * rg * 0.9, y0 + m.h - 1.6, z + zg], [side * 0.8, cy + 0.07, z + zt + 0.75]);
      const back = [side * (hullX(sAt(z + m.ch[1] + 1.2), m.ych) + 0.5), m.ych + 0.3, z + m.ch[1] + 1.2];   // backstays
      standing.push([side * rt * 0.8, cy + 0.9, z + zt], back, [side * rg * 0.8, y0 + m.h - 0.6, z + zg], back);
    }
  }
  const F = MT.fore, MM = MT.main, Z = MT.mizzen;

  // Bowsprit and jib boom, with gammoning, a cap, the dolphin striker and its stays.
  const spritY = (z) => 4.95 + (-22 - z) * 0.36;
  const S0 = [0, spritY(-18.4), -18.4], S1 = [0, spritY(-30), -30], J0 = [0, spritY(-27.6) + 0.42, -27.6], J1 = [0, spritY(-34.8) + 0.3, -34.8];
  P.add('cedar', rod(S0, S1, 0.42, 0.26, 12), { swap: true });
  P.add('cedar', rod(J0, J1, 0.2, 0.12, 10), { swap: true });
  P.add('blackwood', box(1.0, 1.7, 0.4, 0, FC_H + 0.85, -18.0));                                           // bowsprit bitts
  for (const z of [-21.6, -22.2, -22.8]) P.add('iron', rod([0, spritY(z) - 0.1, z + 0.08], [0, spritY(z) + 0.1, z - 0.08], 0.47, 0.47, 10));
  P.add('iron', box(0.6, 0.9, 0.4, 0, S1[1] + 0.25, S1[2]));                                                 // bowsprit cap
  P.add('goldHammer', new THREE.ConeGeometry(0.14, 0.5, 8).rotateX(-Math.PI / 2 + Math.atan(0.36)).translate(J1[0], J1[1] + 0.1, J1[2] - 0.2));
  const DS = [0, S1[1] - 2.4, S1[2] + 0.3];
  P.add('blackwood', rod([0, S1[1] - 0.2, S1[2] + 0.2], DS, 0.07, 0.05, 6));
  standing.push(DS, J1, DS, [0, spritY(-23) - 0.5, -23.2]);
  for (const side of [-1, 1]) standing.push(S1, [side * hullX(0.97, 2.5), 2.5, zAt(0.97)], J1, [side * 1.1, S1[1], S1[2] + 0.2]);   // bowsprit shrouds, jib guys
  // Stays: fore and aft between the mastheads, down to the bowsprit.
  const onSprit = (z) => [0, spritY(z) + 0.3, z];
  standing.push(F.top, onSprit(-23.3), F.cross, onSprit(-29.6), [0, F.truck[1] - 0.6, F.truck[2]], J1);
  standing.push(MM.top, [0, FC_H + 0.6, F.z + 1.1], MM.cross, [0, F.head + 0.4, F.z - 0.2], [0, MM.truck[1] - 0.6, MM.truck[2]], [0, F.cross[1] + 0.3, F.cross[2]]);
  standing.push(Z.top, [0, 2.6, MM.z + 0.7], Z.cross, [0, MM.head + 0.3, MM.z + 0.6], [0, Z.truck[1] - 0.5, Z.truck[2]], [0, MM.cross[1] + 0.2, MM.cross[2]]);
  // braces: course yards to the rail aft, upper yards to the next mast aft (the mizzen's lead forward to the main)
  for (const [m, aft, toY] of [[F, MM, 1], [MM, Z, 1], [Z, MM, -1]]) m.yards.forEach((yd, i) => {
    for (const end of [yd.A, yd.B]) {
      if (i === 0 && m !== Z) { const sx = Math.sign(end[0]), s = clamp(sAt(end[2] + 7.5), 0.01, 0.98); running.push(end, [sx * (inner(s) + 0.1), sheer(s) + CAP, zAt(s)]); }
      else running.push(end, [0, toY > 0 ? aft.head + 0.6 + i * 2.2 : MM.head - 1.5 + i * 1.5, aft.z + (toY > 0 ? -0.6 : 0.8)]);
    }
  });
  // Head sails: fore staysail, jib and flying jib, bellied to port (the lee).
  const along = (a, b, f) => a.map((v, i) => v + (b[i] - v) * f);
  {
    const st1 = [onSprit(-23.3), F.top], st2 = [onSprit(-29.6), F.cross], st3 = [J1, [0, F.truck[1] - 0.6, F.truck[2]]];
    const jw = wave.length;
    wave.push(triSail(M.blackSail, along(...st1, 0.06), along(...st1, 0.7), [0, 5.0, -19.7], 0.55, -1));
    wave.push(triSail(M.blackSail, along(...st2, 0.07), along(...st2, 0.74), [0, 6.1, -21.6], 0.65, -1));
    wave.push(triSail(M.blackSail, along(...st3, 0.08), along(...st3, 0.62), [0, 7.9, -25.6], 0.6, -1));
    fadeOnly.push(...wave.slice(jw));
    for (const [c, a] of [[[0, 5.0, -19.7], F.z - 0.5], [[0, 6.1, -21.6], F.z - 0.2], [[0, 7.9, -25.6], F.z]]) for (const sx of [-1, 1]) running.push(c, [sx * (inner(sAt(a + 0.4)) + 0.1), sheer(sAt(a + 0.4)) + CAP, a + 0.4]);
  }
  // Spanker: brailed in to the mast and gaff for the fight (the captain's deck stays open), boom crutched amidships;
  // the ensign flies from the gaff peak.
  {
    const bA = 0.05, y0 = Z.y0, mz = Z.z, swing = (len, y) => [-Math.sin(bA) * len, y, mz + 0.45 + Math.cos(bA) * len];
    const boomEnd = swing(4.7, y0 + 2.05), peak = swing(4.2, y0 + 8.4), throat = [0, y0 + 6.4, mz + 0.42];
    P.add('cedar', rod([0, y0 + 1.95, mz + 0.42], boomEnd, 0.15, 0.11, 8), { swap: true });
    P.add('cedar', rod(throat, peak, 0.12, 0.08, 8), { swap: true });
    for (const y of [y0 + 1.95, y0 + 6.4]) P.add('iron', new THREE.TorusGeometry(0.42, 0.05, 4, 10).rotateX(Math.PI / 2).translate(0, y, mz));
    P.add('blackSail', rod([0, y0 + 2.2, mz + 0.58], [0, y0 + 6.2, mz + 0.58], 0.17, 0.13, 8));                   // brailed cloth up the mast
    P.add('blackSail', rod([peak[0] * 0.1, throat[1] - 0.18, throat[2] + 0.35], [peak[0] * 0.9, peak[1] - 0.22, peak[2] - 0.3], 0.14, 0.08, 8));   // and under the gaff
    P.add('blackwood', rod([0, QD_H, boomEnd[2] - 0.6], [0, boomEnd[1] - 0.1, boomEnd[2] - 0.6], 0.06, 0.06, 5));       // the boom crutch
    for (let f = 0.25; f < 1; f += 0.25) running.push([0, Z.cross[1] - 0.3, Z.cross[2]], [peak[0] * f, lerp(throat[1], peak[1], f) - 0.3, lerp(throat[2], peak[2], f)]);
    running.push([0, Z.cross[1], Z.cross[2]], peak, [0, Z.head + 0.9, mz], boomEnd, boomEnd, [0, sheer(0) + CAP, ZS - 0.3]);
    wave.push(jollyRoger(M, 3.0, 1.9, [peak[0], peak[1] - 0.05, peak[2]], 2.2, 0.14));
  }
  // Velscour's colours at the main truck, crimson pennants on the fore and mizzen.
  {
    const t = MM.truck; P.add('iron', rod([0, t[1], t[2]], [0, t[1] + 1.4, t[2]], 0.05, 0.04, 6));
    wave.push(jollyRoger(M, 3.4, 2.1, [0, t[1] + 1.35, t[2]], 2.15, 0.16));
    for (const m of [F, Z]) {
      const tk = m.truck; P.add('iron', rod([0, tk[1], tk[2]], [0, tk[1] + 1.0, tk[2]], 0.04, 0.03, 6));
      const f = flag(Object.assign(M.crimson.clone(), { side: THREE.DoubleSide }), 4.4, 0.6, [0, tk[1] + 0.95, tk[2]], 0.12, 'pennant'); f.mesh.rotation.y = 2.15; wave.push(f);
    }
  }

  // The head: a carved knee under the bowsprit, head rails, catheads with anchors, hawse holes, Velscour's V on the bows.
  {
    const sh = new THREE.Shape(), pts = [[-21.8, -1.8], [-22.8, -0.8], [-23.75, 0.3], [-24.6, 1.6], [-25.0, 2.35], [-24.5, 2.95], [-23.2, 3.55], [-21.85, 3.9]];
    sh.moveTo(...pts[0]); for (const p of pts.slice(1)) sh.lineTo(...p);
    const g = new THREE.ExtrudeGeometry(sh, { depth: 0.3, bevelEnabled: false, curveSegments: 4 }); g.rotateY(-Math.PI / 2); g.translate(0.15, 0, 0);
    P.add('tarPlank', g);
    for (let i = 0; i < 2; i++) P.add('iron', rod([0, pts[i][1], pts[i][0]], [0, pts[i + 1][1], pts[i + 1][0]], 0.09, 0.09, 6));      // iron cutwater edge
    for (let i = 2; i < 7; i++) P.add('goldHammer', rod([0, pts[i][1], pts[i][0] - 0.02], [0, pts[i + 1][1], pts[i + 1][0] - 0.02], 0.12, 0.12, 6));
    for (const side of [-1, 1]) for (const [dy, f] of [[0, 1], [-0.8, 0.85]]) {
      const zb = zAt(0.955), yb = 3.2 + dy;
      const a = [side * 0.24, 2.9 + dy * 0.7, -24.6 + (1 - f) * 0.9], mid = [side * hullX(0.985, yb) * 0.9, yb + 0.25, -22.9], b = [side * (hullX(0.955, yb) + 0.05), yb, zb];
      P.add('goldHammer', rod(a, mid, 0.07, 0.07, 6)); P.add('goldHammer', rod(mid, b, 0.07, 0.07, 6));
    }
    // the gilded raven, wings raised and spread back along the bows; ember eyes
    const z = -24.85, y = 2.2;
    P.add('goldSeam', new THREE.SphereGeometry(0.55, 10, 8).scale(0.8, 0.9, 1.25).translate(0, y + 0.55, z - 0.45));
    P.add('goldSeam', new THREE.ConeGeometry(0.22, 1.2, 6).rotateX(-Math.PI / 2).translate(0, y + 0.47, z - 1.45));
    P.add('goldSeam', new THREE.SphereGeometry(0.42, 10, 8).scale(0.8, 1.2, 1.3).translate(0, y - 0.1, z + 0.25));
    for (const sx of [-1, 1]) P.add('ember', new THREE.OctahedronGeometry(0.1).translate(sx * 0.3, y + 0.67, z - 0.8));
    for (const side of [-1, 1]) {
      const R0 = [side * 0.35, y + 0.35, z + 0.15], T = [side * 3.3, y + 2.9, z + 2.7], pts2 = [], idx = [], n = 7;
      for (let i = 0; i <= n; i++) {
        const t = i / n, lead = R0.map((r, j) => r + (T[j] - r) * t + (j === 1 ? Math.sin(Math.PI * t) * 0.5 : 0));
        const drop = (1.7 - 1.1 * t) * (i % 2 ? 0.78 : 1);
        pts2.push(lead, [lead[0] - side * 0.25 * drop, lead[1] - drop, lead[2] + 0.55 * drop]);
      }
      for (let i = 0; i < n; i++) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3, a, a + 1, a + 2, a + 1, a + 3, a + 2); }
      P.add('gold', tris(pts2, idx));
      P.add('goldSeam', rod(R0, T, 0.14, 0.06, 6));
    }
    for (const side of [-1, 1]) {
      const s = 0.925, zc = zAt(s), yc = sheer(s) - 0.15, xh = hullX(s, yc);
      const a = [side * (xh - 0.4), yc, zc + 0.3], b = [side * (xh + 1.35), yc + 0.25, zc - 0.55];
      P.add('blackwood', rod(a, b, 0.2, 0.17, 8));
      P.add('goldHammer', new THREE.SphereGeometry(0.22, 8, 6).scale(1, 1, 0.6).translate(b[0] + side * 0.05, b[1], b[2] - 0.05));   // the cat's face
      P.add('iron', rod([b[0], b[1] - 0.1, b[2]], [b[0], b[1] - 0.55, b[2]], 0.04, 0.04, 4));
      anchor(P, b[0], b[1] - 0.6, b[2], 1.3, Math.PI / 2);
      const hz = zAt(0.965), hy = 1.25, hx = side * (hullX(0.965, hy) + 0.02);
      P.add('dark', new THREE.CylinderGeometry(0.22, 0.22, 0.2, 10).rotateZ(Math.PI / 2).translate(hx, hy, hz));
      P.add('goldHammer', new THREE.TorusGeometry(0.25, 0.06, 4, 12).rotateY(Math.PI / 2).translate(hx + side * 0.04, hy, hz));
      standing.push([hx, hy, hz], [b[0], b[1] - 0.75, b[2]]);
      vPlate(P, side * (hullX(0.905, 2.45) + 0.06), 2.45, zAt(0.905), 0.5, side * Math.PI / 2);
    }
  }

  // Stern castle: the great cabin's gallery windows behind a balcony, carved panels, pilasters, the taffrail crest,
  // the red stern lantern trio, and quarter galleries on both quarters.
  {
    const zt = ZS + 0.05, xw = (y) => hullX(0, y);
    for (let i = 0; i < 5; i++) {                                              // great cabin windows
      const x = (i - 2) * 1.62, y = 1.15;
      P.add('redGlass', box(0.92, 1.15, 0.06, x, y, zt));
      P.add('redGlass', new THREE.CylinderGeometry(0.46, 0.46, 0.06, 12, 1, false, 0, Math.PI).rotateX(Math.PI / 2).rotateZ(Math.PI / 2).translate(x, y + 0.57, zt));
      for (const dy of [-0.2, 0.25]) P.add('iron', box(0.92, 0.04, 0.05, x, y + dy, zt + 0.04));
      P.add('iron', box(0.04, 1.6, 0.05, x, y + 0.2, zt + 0.04));
      glow.push({ x, y: y + 0.2, z: zt + 0.3, r: 1.5, c: 0xff5a28 });
    }
    for (let i = 0; i < 6; i++) { const x = (i - 2.5) * 1.62; P.add('goldHammer', box(0.2, 3.6, 0.18, x, 1.95, zt + 0.06)); P.add('goldHammer', new THREE.SphereGeometry(0.15, 8, 6).translate(x, 3.8, zt + 0.1)); }
    for (const [y, h] of [[0.32, 0.18], [2.2, 0.16], [3.2, 0.1]]) P.add('goldHammer', box(xw(y) * 2 + 0.1, h, 0.18, 0, y, zt + 0.06));
    for (let i = 0; i < 4; i++) {                                              // carved panels on the taffrail
      const xx = [-3.24, -1.62, 1.62, 3.24][i];
      P.add('scroll', box(1.15, 0.85, 0.08, xx, 2.85, zt + 0.02)); P.add('goldLeaf', box(0.7, 0.12, 0.1, xx, 2.85, zt + 0.07));
    }
    vPlate(P, 0, 2.85, zt + 0.06, 0.38, 0);
    // the stern walk: a balcony on carved brackets with gilt balusters
    const bw = xw(0.3) * 0.86;
    P.add('blackwood', box(bw * 2, 0.16, 1.0, 0, 0.3, ZS + 0.5));
    for (let x = -bw + 0.15; x <= bw - 0.1; x += 0.34) P.add('goldHammer', rod([x, 0.38, ZS + 0.94], [x, 1.08, ZS + 0.94], 0.04, 0.055, 6));
    P.add('goldHammer', box(bw * 2 + 0.1, 0.1, 0.16, 0, 1.12, ZS + 0.94)); P.add('blackwood', box(bw * 2, 0.08, 0.12, 0, 0.42, ZS + 0.94));
    for (const x of [-bw * 0.8, -bw * 0.27, bw * 0.27, bw * 0.8]) P.add('scroll', box(0.22, 0.75, 0.75, x, -0.1, ZS + 0.35).rotateX(0));
    P.add('scroll', box(xw(-0.3) * 2 - 0.2, 0.42, 0.1, 0, -0.3, zt + 0.02));                      // carved frieze under the walk
    P.add('goldHammer', box(xw(-0.55) * 2 - 0.1, 0.08, 0.14, 0, -0.55, zt + 0.04));
    for (const x of [-3.3, 3.3]) { P.add('redGlass', box(0.62, 0.5, 0.06, x, -0.85, zt)); P.add('goldHammer', box(0.82, 0.08, 0.1, x, -0.55, zt + 0.04)); P.add('goldHammer', box(0.82, 0.08, 0.1, x, -1.15, zt + 0.04)); }
    // taffrail crest: scroll-cut, gold rimmed, Velscour's V at its heart
    const sh = new THREE.Shape(), w = inner(0) - 0.2, h = 1.45;
    sh.moveTo(-w, 0); sh.lineTo(-w, h * 0.45);
    sh.bezierCurveTo(-w * 0.6, h * 0.4, -w * 0.45, h * 1.05, 0, h);
    sh.bezierCurveTo(w * 0.45, h * 1.05, w * 0.6, h * 0.4, w, h * 0.45); sh.lineTo(w, 0);
    const base = sheer(0) + CAP;
    P.add('scroll', new THREE.ExtrudeGeometry(sh, { depth: 0.24, bevelEnabled: false, curveSegments: 10 }).translate(0, base, ZS - 0.3));
    const rim = new THREE.ExtrudeGeometry(sh, { depth: 0.3, bevelEnabled: false, curveSegments: 10 }); rim.scale(1.04, 1.06, 1); P.add('goldHammer', rim.translate(0, base - 0.02, ZS - 0.33));
    vPlate(P, 0, base + 0.75, ZS - 0.04, 0.5, 0);
    for (const sx of [-1, 1]) P.add('goldLeaf', rod([sx * 0.9, base + 0.45, ZS - 0.03], [sx * 2.6, base + 0.42, ZS - 0.03], 0.09, 0.04, 6));
    // the stern lantern trio (red glass: Velscour's lamps), the centre one on the crest's peak
    const bigLantern = (x, y, z, s, light) => {
      P.add('goldHammer', new THREE.CylinderGeometry(0.22 * s, 0.3 * s, 0.18 * s, 8).translate(x, y, z));
      P.add('ember', new THREE.CylinderGeometry(0.3 * s, 0.24 * s, 0.62 * s, 6).translate(x, y + 0.4 * s, z));
      for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; P.add('iron', rod([x + Math.cos(a) * 0.29 * s, y + 0.09 * s, z + Math.sin(a) * 0.29 * s], [x + Math.cos(a) * 0.31 * s, y + 0.72 * s, z + Math.sin(a) * 0.31 * s], 0.025 * s, 0.025 * s, 4)); }
      P.add('goldHammer', new THREE.CylinderGeometry(0.36 * s, 0.3 * s, 0.1 * s, 8).translate(x, y + 0.74 * s, z));
      P.add('goldHammer', new THREE.SphereGeometry(0.3 * s, 8, 5, 0, TAU, 0, Math.PI / 2).translate(x, y + 0.78 * s, z));
      P.add('goldHammer', new THREE.ConeGeometry(0.06 * s, 0.4 * s, 6).translate(x, y + 1.25 * s, z));
      P.add('goldHammer', new THREE.ConeGeometry(0.1 * s, 0.3 * s, 6).rotateX(Math.PI).translate(x, y - 0.22 * s, z));
      glow.push({ x, y: y + 0.4 * s, z, r: 2.6 * s, c: 0xff3020, light, lr: 9 });
    };
    bigLantern(0, base + h - 0.05, ZS - 0.18, 1.7, true);
    for (const sx of [-1, 1]) {
      const bx = sx * (w - 0.1), by = base + 0.55, end = [sx * (w - 0.3), by + 0.35, ZS + 0.85];
      P.add('iron', rod([bx, base + 0.1, ZS - 0.15], [bx, by, ZS - 0.15], 0.07, 0.07, 6));
      P.add('iron', rod([bx, by, ZS - 0.15], end, 0.06, 0.06, 6));
      bigLantern(end[0], end[1] + 0.05, end[2], 1.35, false);
    }
    // quarter galleries: half-octagon bays with two tiers of lit windows, a domed roof and a drop finial
    for (const side of [-1, 1]) {
      const sc = 0.03, zc = zAt(sc), len = 2.5, y0 = -0.45, y1 = 3.0, xh = side * (hullX(sc, 1.2) - 0.2), th0 = side > 0 ? 0 : Math.PI, rx = 0.9, rz = len / 2;
      const half = (r0, r1, hh, cy, seg = 8) => new THREE.CylinderGeometry(r0, r1, hh, seg, 1, true, th0, Math.PI).scale(rx, 1, rz).translate(xh, cy, zc);
      P.add('hull', half(1, 1, y1 - y0, (y0 + y1) / 2));
      for (const [ya, yb] of [[1.0, 2.2], [-0.05, 0.62]]) {
        P.add('redGlass', half(1.03, 1.03, yb - ya, (ya + yb) / 2));
        for (let k = 0; k <= 4; k++) { const a = th0 + k * Math.PI / 4; P.add('goldHammer', box(0.09, yb - ya + 0.1, 0.09, xh + Math.sin(a) * rx * 1.05, (ya + yb) / 2, zc + Math.cos(a) * rz * 1.05)); }
      }
      for (const y of [y0, 0.82, 2.38, y1]) P.add('goldHammer', half(1.08, 1.08, 0.14, y));
      P.add('tarPlank', new THREE.ConeGeometry(1.08, 1.0, 8, 1, true, th0, Math.PI).scale(rx, 1, rz).translate(xh, y1 + 0.5, zc));
      P.add('goldHammer', new THREE.SphereGeometry(0.16, 8, 6).translate(xh + side * 0.25, y1 + 1.0, zc));
      P.add('goldHammer', new THREE.ConeGeometry(0.06, 0.5, 6).translate(xh + side * 0.25, y1 + 1.3, zc));
      P.add('scroll', new THREE.ConeGeometry(1.0, 1.1, 8, 1, true, th0, Math.PI).rotateX(Math.PI).scale(rx, 1, rz).translate(xh, y0 - 0.55, zc));
      P.add('goldHammer', new THREE.ConeGeometry(0.12, 0.45, 6).rotateX(Math.PI).translate(xh + side * 0.25, y0 - 1.2, zc));
      glow.push({ x: xh + side * 0.7, y: 1.6, z: zc, r: 1.6, c: 0xff5a28 });
    }
  }

  // Quarterdeck: the helm and binnacle aft of the mizzen; the captain's ground is the open deck before it (info.bossDeck).
  {
    const hz = Z.z + 1.4, wheel = helm(M, P, 0, QD_H, hz);
    root.add(wheel);
    P.add('blackwood', box(0.5, 0.9, 0.5, 1.4, QD_H + 0.45, hz));
    P.add('brass', new THREE.SphereGeometry(0.3, 10, 6, 0, TAU, 0, Math.PI / 2).translate(1.4, QD_H + 0.9, hz));
  }
  // Main deck furniture, all flush or against the bulwarks: hatch gratings, ring bolts, rope coils, a boarding ladder.
  for (const [z, w, d] of [[3.4, 2.6, 2.2], [-7.2, 2.2, 2.0]]) {
    P.add('blackwood', box(w + 0.24, 0.12, d + 0.24, 0, 0.06, z));
    P.add('endgrain', box(w, 0.13, d, 0, 0.065, z));
    for (let x = -w / 2 + 0.25; x < w / 2; x += 0.33) P.add('dark', box(0.08, 0.135, d - 0.1, x, 0.066, z));
  }
  for (const [x, z] of [[-4.4, 7.4], [4.5, -2.6], [-4.5, -9.5], [4.4, 6.9]]) {
    P.add('canvas', new THREE.TorusGeometry(0.38, 0.1, 5, 14).rotateX(Math.PI / 2).translate(x, 0.1, z));
    P.add('canvas', new THREE.TorusGeometry(0.24, 0.09, 5, 12).rotateX(Math.PI / 2).translate(x, 0.24, z));
  }
  for (const side of [-1, 1]) {                                // battens up the side at the entry port
    const s = 0.47, z = zAt(s);
    for (let y = -2.15; y < BW - 0.1; y += 0.4) P.add('blackwood', box(0.12, 0.1, 0.72, side * (hullX(s, y) + 0.06), y, z));
    P.add('goldHammer', box(0.14, 0.1, 1.2, side * (hullX(s, BW) + 0.07), BW + 0.05, z));
    for (const dz of [-0.55, 0.55]) standing.push([side * (hullX(s, BW) + 0.25), BW + 0.6, z + dz], [side * (hullX(s, -1.2) + 0.3), -1.2, z + dz]);
    for (const dz of [-0.55, 0.55]) P.add('goldHammer', rod([side * (inner(s) + WALL), BW + 0.1, z + dz], [side * (inner(s) + WALL + 0.05), BW + 0.75, z + dz], 0.035, 0.035, 5));
  }
  // The ship's boat on davits off the starboard quarter.
  {
    const s = 0.19, z = zAt(s), side = 1, xb = hullX(s, 2.0) + 1.25, yb = 2.55;
    const l = 4.6, b = 0.95, d = 0.75, sec = (u) => b * Math.pow(Math.sin(Math.PI * clamp(u * 0.9 + 0.06, 0, 1)), 0.6), rise = (u) => 0.3 * Math.pow(Math.abs(u - 0.5) * 2, 3);
    const bp = (side, sc = 1) => (u, v) => [xb + side * sec(u) * sc * Math.sqrt(Math.max(0, 1 - v * v)), yb + rise(u) * (1 - v) - d * v, z + l / 2 - u * l];
    for (const side of [-1, 1]) for (const fl of [true, false]) P.add('cedar', surf(14, 5, bp(side), (u, v) => [u * l / 2, v * d], fl), { uv: 'keep' });
    for (const side of [-1, 1]) for (let i = 0; i < 14; i++) P.add('blackwood', rod(bp(side)(i / 14, 0), bp(side)((i + 1) / 14, 0), 0.06, 0.06, 4));
    P.add('cypress', box(b * 1.3, 0.05, l * 0.8, xb, yb - d * 0.62, z));
    for (const f of [0.3, 0.5, 0.7]) P.add('cypress', box(sec(f) * 1.8, 0.07, 0.3, xb, yb - 0.18, z + l / 2 - f * l));
    for (const dx of [-0.25, 0.25]) P.add('cedar', rod([xb + dx, yb - 0.25, z + 1.8], [xb + dx, yb - 0.2, z - 1.8], 0.04, 0.04, 4));
    for (const dz of [-1.75, 1.75]) {
      const foot = [side * (inner(sAt(z + dz)) + 0.12), sheer(sAt(z + dz)) + CAP, z + dz], knee = [foot[0] + 0.2, foot[1] + 1.1, z + dz], head = [xb, foot[1] + 1.35, z + dz];
      P.add('iron', rod(foot, knee, 0.07, 0.07, 6)); P.add('iron', rod(knee, head, 0.07, 0.06, 6));
      P.add('blackwood', box(0.2, 0.3, 0.16, head[0], head[1] - 0.15, z + dz));
      running.push([head[0], head[1] - 0.3, z + dz], [xb, yb + 0.15, z + dz * 0.95]);
    }
    P.add('iron', rod([side * (inner(s) + 0.38), sheer(s) + CAP + 1.0, z - 1.75], [side * (inner(s) + 0.38), sheer(s) + CAP + 1.0, z + 1.75], 0.03, 0.03, 4));   // span
  }

  // Rigging lines: standing rigging (tarred, dark) and running rigging (hemp, lighter).
  const mk = (pairs, mat, name) => { const r = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pairs.map((p) => new THREE.Vector3(...p))), mat); r.name = name; root.add(r); return r; };
  mk(standing, M.rope, 'standing');
  mk(running, M.ropeLight || M.rope, 'running');
  const sheetLines = mk(sheets, M.ropeLight || M.rope, 'sheets');

  root.add(P.build('hull'));
  for (const w of wave) root.add(w.mesh);
  finish(root);

  function anim(t) { for (const w of wave) w.update(t); }
  /** Fighting sail: k = 0 full sail (the default), 1 = courses brailed up and the rest faded to 0.35 so the decks show. */
  function setFightingSail(k = 1) {
    for (const c of courses) c.set({ furl: 0.86 * k });
    for (const u of upper) u.fade(1 - 0.65 * k);
    for (const j of fadeOnly) { const m = j.mesh.material; m.transparent = k > 0; m.opacity = 1 - 0.65 * k; m.depthWrite = k === 0; m.needsUpdate = true; j.mesh.castShadow = k === 0; }
    sheetLines.visible = k < 0.5;
  }
  const hlz = 21.3, hb = hullX(0.45, WL);
  const info = {
    length: L, overall: ZS + 1.9 + 34.8, beam: 2 * beam(0.45), waterline: WL, hl: hlz, hb,
    glow,
    // crew spots: index 6 is the captain on the quarterdeck (the boss), the rest pirates and two boarding heroes
    crew: [[1.6, 0, 4.8, 'pirate'], [-2.2, 0, 1.6, 'pirate'], [1.2, 0, -9.0, 'hero'], [-1.4, 0, -5.2, 'pirate'], [3.0, 0, -6.8, 'hero'],
      [-4.0, 0, 5.2, 'pirate'], [0, QD_H, 14.4, 'pirate', 'captain'], [-3.2, QD_H, 16.4, 'pirate'], [2.0, FC_H, -18.9, 'pirate'], [0.4, MM.head + 0.16, MM.z + 1.1, 'pirate']],
    boss: { x: 0, y: QD_H, z: 14.4, name: 'Admiral Veyl' },
    // the boss fight's floor: the quarterdeck from its front rail to the mizzen's fife rail, wall to wall (about 8 x 10.8)
    bossDeck: { y: QD_H, x0: -inner(0.15), x1: inner(0.15), z0: zq + 0.2, z1: Z.z - 0.95, spot: [0, QD_H, 14.4],
      flights: qFlights, landing: { x0: -QD_LAND / 2, x1: QD_LAND / 2, z0: zq - QD_FLIGHT, z1: zq, y: QD_H } },
    decks: [
      { name: 'main', y: 0, z0: fFoot, z1: qFoot, hw: inner(0.5), note: 'the waist: clear from the forecastle stairs to the quarterdeck flights (which stand along the bulkhead, z1 .. zq)' },
      { name: 'quarterdeck', y: QD_H, z0: zq, z1: ZS - WALL, hw: inner(0.15), clear: [zq + 0.2, Z.z - 0.95] },
      { name: 'forecastle', y: FC_H, z0: zAt(0.993), z1: zf, hw: inner(0.88) },
    ],
    stairs: [...qFlights.map((f) => ({ ...f, athwart: true })), { x: 0, w: STAIR_W, z0: fFoot, z1: zf, y0: 0, y1: FC_H }],
    walk: SEA_GALLEON,
  };
  return { root, anim, info, setFightingSail };
}

/** Velscour's V carved in crimson on a gilt backing, facing +Z turned by ry, at (x, y, z), S high (half). */
function vPlate(P, x, y, z, S, ry) {
  const g = new THREE.ExtrudeGeometry(vShape(S), { depth: 0.1, bevelEnabled: false }); g.translate(0, 0, 0.02);
  const b = new THREE.ExtrudeGeometry(vShape(S, 0, 1.16), { depth: 0.08, bevelEnabled: false }); b.translate(0, 0, -0.04);
  for (const [m, q] of [['crimson', g], ['goldHammer', b]]) { q.rotateY(ry); q.translate(x, y, z); P.add(m, q); }
}
