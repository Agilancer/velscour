// Shared parts for the sea ships (docs/PIRATE_SEAS.md): the airships' toolkit (tools/airship3d.js) taken down to the
// water. Same units and frame: 1 unit = 1 game tile, heights in the same unit (a 60 px hero is 1.53 tall), bow toward
// -Z (upper right in the iso view), starboard +X, main deck at y = 0. A sea ship also has a waterline (info.waterline,
// below the deck): the ocean (tools/sea3d.js) is drawn at that height and the hull below it is copper sheathed.
// Every builder returns { root, anim(t, dt), info } like the airships; info.glow lists lamp halos for the viewer.
import * as THREE from 'three';
import { Parts, box, rod, surf, tris, flag, sm, smoke, plume, airshipMaterials } from './airship3d.js';
export { Parts, box, rod, surf, tris, flag, sm, smoke, plume };

export const TAU = Math.PI * 2;
export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

/** The airship pack plus the paints the sea fleet needs (hull paint, faction colours, glass, jet glow). */
export async function seaMaterials(base) {
  const M = await airshipMaterials(base);
  const tint = (src, color, o = {}) => { const m = M[src].clone(); m.color = new THREE.Color(color); Object.assign(m, o); return m; };
  M.tar = tint('hullLow', 0x6a6a72);                                 // tarred black oak, a touch lifted
  M.redPaint = tint('cedar', 0xb0402e, { roughness: 0.85 });        // red lead boot-topping / gun deck paint
  M.ochre = tint('cedar', 0xd2a24a, { roughness: 0.85 });           // ochre strake (Nelson chequer)
  M.whitewood = tint('greyboards', 0xf2efe6, { roughness: 0.85 });  // the Tidewardens' limed white oak
  M.paleSteel = tint('silver', 0xe8eef6);                           // the Tidewardens' bright steel
  M.seaBlue = tint('cream', 0x3d6fb0, { roughness: 0.9 });          // the Tidewardens' blue sailcloth
  M.blackSail = tint('charcoal', 0x55525c, { roughness: 0.95 });    // Velscour's black sails
  M.bloodSail = tint('plum', 0xc05050, { roughness: 0.95 });        // Velscour's crimson
  M.boneWhite = tint('cream', 0xe6dcc4, { roughness: 0.8 });
  M.hullPaintBlue = tint('greyboards', 0x5c86c4, { roughness: 0.8 });
  M.deckPaint = tint('step', 0x8a8a90, { roughness: 0.95 });       // the carrier's non-slip deck
  M.stripeWhite = new THREE.MeshStandardMaterial({ color: 0xe8e2d0, roughness: 0.9 });
  M.stripeYellow = new THREE.MeshStandardMaterial({ color: 0xe0b030, roughness: 0.9 });
  M.stripeRed = new THREE.MeshStandardMaterial({ color: 0xc03028, roughness: 0.9 });
  M.canopy = new THREE.MeshStandardMaterial({ color: 0x9fd6ff, emissive: 0x1a4a70, emissiveIntensity: 0.6, roughness: 0.1, metalness: 0.4, transparent: true, opacity: 0.75 });
  M.holy = new THREE.MeshStandardMaterial({ color: 0xfff2c4, emissive: 0xffd36a, emissiveIntensity: 1.8, roughness: 0.4 });   // Tessariel's light
  M.starlight = new THREE.MeshStandardMaterial({ color: 0xdff4ff, emissive: 0x7fd0ff, emissiveIntensity: 1.7, roughness: 0.3, flatShading: true });
  M.furnace = new THREE.MeshStandardMaterial({ color: 0xffb070, emissive: 0xff5a10, emissiveIntensity: 2.2, roughness: 0.6 });
  M.jetGlow = new THREE.MeshStandardMaterial({ color: 0xbfe8ff, emissive: 0x4ab8ff, emissiveIntensity: 2.2, roughness: 0.4 });
  M.rope = new THREE.LineBasicMaterial({ color: 0x2b1d16 });
  M.ropeLight = new THREE.LineBasicMaterial({ color: 0x6a5238 });
  // The critics' round-1 note: the hammered gunmetal and flaked iron read as granite and masonry at the game camera.
  // At sea those textures are calmed toward their mean (the pack's own pixels, less contrast), and riveted plate is
  // generated: plate seams, rivet rows and a little rust bleeding from the seams.
  for (const [k, amt] of [['gunmetal', 0.6], ['flaked', 0.45], ['iron', 0.3], ['steel', 0.4], ['gold', 0.5], ['goldLeaf', 0.55], ['goldHammer', 0.4], ['brass', 0.45], ['bronze', 0.35], ['copper', 0.35]]) calm(M[k], amt);
  M.plate = plateMat({ base: [44, 42, 46], seam: [18, 17, 20], rivet: [96, 92, 98], rust: 0, metal: 0.4 });          // black riveted iron
  M.plateRust = plateMat({ base: [58, 46, 40], seam: [26, 18, 14], rivet: [110, 84, 66], rust: 0.55, metal: 0.3 });  // a rusting tug's iron
  M.plateDeck = plateMat({ base: [104, 102, 100], seam: [62, 60, 60], rivet: [150, 146, 140], rust: 0.12, metal: 0.25, tread: true });  // steel deck plate
  M.plateRed = plateMat({ base: [96, 22, 20], seam: [40, 8, 8], rivet: [150, 60, 50], rust: 0.1, metal: 0.3 });     // the Tide's red, plated
  return M;
}
/** Pull a material's texture toward its mean colour by amt (0..1): same pixels, lower contrast. */
export function calm(m, amt) {
  const img = m?.map?.image; if (!img || !img.width) return m;
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
  const x = c.getContext('2d'); x.drawImage(img, 0, 0);
  const d = x.getImageData(0, 0, c.width, c.height), p = d.data, mean = [0, 0, 0];
  for (let i = 0; i < p.length; i += 4) { mean[0] += p[i]; mean[1] += p[i + 1]; mean[2] += p[i + 2]; }
  const n = p.length / 4; mean[0] /= n; mean[1] /= n; mean[2] /= n;
  for (let i = 0; i < p.length; i += 4) for (let j = 0; j < 3; j++) p[i + j] = p[i + j] + (mean[j] - p[i + j]) * amt;
  x.putImageData(d, 0, 0);
  const t = new THREE.CanvasTexture(c);
  for (const k of ['colorSpace', 'wrapS', 'wrapT', 'magFilter', 'anisotropy']) t[k] = m.map[k];
  t.repeat.copy(m.map.repeat);
  m.map = t; m.bumpMap = t; m.needsUpdate = true;
  return m;
}
/** A generated 160 px riveted iron plate (pixel art, tiling): two plates a tile with seams, rivet rows along them, a
 *  fine mottle, optional rust streaks bleeding down from the seams and a raised diamond tread for walkways. */
export function plateMat({ base, seam, rivet, rust = 0, metal = 0.35, tread = false }) {
  const N = 160, c = document.createElement('canvas'); c.width = c.height = N;
  const x = c.getContext('2d'), d = x.createImageData(N, N), p = d.data;
  let s = 7331; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const noise = new Float32Array(N * N).map(() => rnd());
  const at = (i, j) => noise[((j + N) % N) * N + ((i + N) % N)];
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const k = (j * N + i) * 4;
    let v = (at(i, j) + at(i + 1, j) + at(i, j + 1) + at(i >> 1, j >> 1)) / 4 - 0.5;            // a soft mottle
    let col = base.map((b) => b * (1 + v * 0.22));
    const sx = i % 80, sy = (j + (Math.floor(i / 80) % 2) * 40) % 80;                         // staggered plates
    if (sx < 2 || sy < 2) col = seam.slice();
    else if (sx < 3 || sy < 3) col = col.map((q) => q * 1.18);                                  // a lit plate edge
    const rv = (sx === 7 || sx === 73) && sy % 10 === 5 || (sy === 7 || sy === 73) && sx % 10 === 5;
    if (rv) col = rivet.slice();
    else if ((sx === 7 || sx === 73) && sy % 10 === 6 || (sy === 7 || sy === 73) && sx % 10 === 6) col = col.map((q) => q * 0.6);
    if (rust && sy > 2 && sy < 30 && at(i, 0) > 1 - rust * 0.5) col = col.map((q, n) => q * (1 - (sy / 30) * 0.3) + [70, 30, 8][n] * rust * (1 - sy / 30));
    if (tread && sx > 4 && sy > 4 && ((i + j) % 8 === 0 || (i - j + 160) % 8 === 0) && (i % 4 === 0)) col = col.map((q) => q * 1.25);
    p[k] = col[0]; p[k + 1] = col[1]; p[k + 2] = col[2]; p[k + 3] = 255;
  }
  x.putImageData(d, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.NearestFilter; t.anisotropy = 8;
  return new THREE.MeshStandardMaterial({ map: t, bumpMap: t, bumpScale: 1.2, roughness: 0.55, metalness: metal });
}
/** Fighting sail: brail the courses up (squareSail.set({ furl })) and fade every sail over a walkable deck to `alpha`
 *  (1 = solid), so the deck being fought on stays visible from the game camera. sails: the update objects. */
export function fightingSail(sails, { furl = 0.75, alpha = 1, courses = [] } = {}) {
  for (const s of courses) s.set?.({ furl });
  for (const s of sails) {
    const m = s.mesh?.material; if (!m) continue;
    m.transparent = alpha < 1; m.opacity = alpha; m.depthWrite = alpha >= 1; m.needsUpdate = true;
  }
}

// ------------------------------------------------------------------ hulls
/**
 * A lofted sea hull. H = { L, beam(s), sheer(s), keel(s), prof(k), bands: [[mat, yTop, yBottom]] in absolute heights
 * (null = the sheer / the keel), ns, transom, inner, deckAt, wall, cap, decks: [[mat, s0, s1, y]], tumble }.
 * s runs 0 (stern) .. 1 (bow), bow toward -Z, centred on z = 0. Bands by height let a waterline band sit level
 * along the whole ship (boot-topping, copper below), whatever the sheer does.
 */
export function seaHull(P, H) {
  const zAt = (s) => H.L / 2 - s * H.L, ns = H.ns || Math.round(H.L * 3.5);
  const kOf = (s, y) => { const top = H.sheer(s), bot = H.keel(s); return clamp((top - y) / Math.max(1e-3, top - bot), 0, 1); };
  const tumble = H.tumble || 0;                          // tumblehome: topsides lean in by this fraction at the sheer
  const X = (s, k) => H.beam(s) * H.prof(k) * (1 - tumble * Math.max(0, 0.25 - k) / 0.25);
  for (const [mat, yt, yb, nk = 6] of H.bands) for (const side of [1, -1]) P.add(mat, surf(ns, nk, (u, v) => {
    const k0 = yt == null ? 0 : kOf(u, yt), k1 = yb == null ? 1 : kOf(u, yb), k = k0 + (k1 - k0) * v;
    const top = H.sheer(u), bot = H.keel(u);
    return [side * X(u, k), top - (top - bot) * k, zAt(u)];
  }, (u, v) => {
    const k0 = yt == null ? 0 : kOf(u, yt), k1 = yb == null ? 1 : kOf(u, yb), k = k0 + (k1 - k0) * v;
    return [zAt(u) / 2, -(H.sheer(u) - H.keel(u)) * k / 2];
  }, side > 0), { uv: 'keep' });
  if (H.transom && H.beam(0) > 0.05) {
    const N = 16, ring = [];
    for (let j = 0; j <= N; j++) { const k = j / N; ring.push([X(0, k), H.sheer(0) - (H.sheer(0) - H.keel(0)) * k]); }
    const all = [...ring, ...ring.slice(0, -1).reverse().map(([x, y]) => [-x, y])], pts = [[0, (H.sheer(0) + H.keel(0)) / 2, H.L / 2]], idx = [];
    all.forEach(([x, y]) => pts.push([x, y, H.L / 2]));
    for (let i = 1; i < all.length; i++) idx.push(0, i + 1, i);
    idx.push(0, 1, all.length);
    P.add(H.transom, tris(pts, idx));
  }
  if (H.inner) for (const side of [1, -1]) {
    P.add(H.wall, surf(ns, 1, (u, v) => [side * H.inner(u), v ? H.deckAt(u) - 0.05 : H.sheer(u), zAt(u)], (u, v) => [zAt(u) / 2, v * 0.6], side < 0), { uv: 'keep' });
    if (H.cap) P.add(H.cap, surf(ns, 1, (u, v) => [side * (v ? H.inner(u) - 0.05 : X(u, 0) + 0.06), H.sheer(u) + 0.12, zAt(u)], (u, v) => [zAt(u) / 2, v * 0.2], side < 0), { uv: 'keep' });
  }
  for (const [mat, s0, s1, y] of H.decks || []) P.add(mat, surf(Math.max(2, Math.ceil((s1 - s0) * ns)), 1, (u, v) => {
    const s = s0 + (s1 - s0) * u; return [(v * 2 - 1) * H.inner(s), y, zAt(s)];
  }, (u, v) => { const s = s0 + (s1 - s0) * u; return [zAt(s) / 2, (v * 2 - 1) * H.inner(s) / 2]; }, true), { uv: 'keep' });
  return { zAt, sAt: (z) => (H.L / 2 - z) / H.L, hullX: (s, y) => X(s, kOf(s, y)) };
}
/** Wale strips: a raised band proud of the hull at height y (mat, thickness th), from s0 to s1. */
export function wale(P, mat, H, hx, y, th, s0 = 0.01, s1 = 0.99, out = 0.06) {
  const zAt = (s) => H.L / 2 - s * H.L, n = Math.round((s1 - s0) * (H.ns || H.L * 3.5));
  for (const side of [1, -1]) P.add(mat, surf(n, 1, (u, v) => {
    const s = s0 + (s1 - s0) * u, yy = y + (v - 0.5) * th; return [side * (hx(s, yy) + out), yy, zAt(s)];
  }, (u, v) => [zAt(s0 + (s1 - s0) * u) / 2, v * th], side > 0), { uv: 'keep' });
}

// ------------------------------------------------------------------ rig
/**
 * A square sail set between two yards, bellied forward by the wind on the quarter (the ships sail bow-first, so the
 * wind fills the sails toward -Z). o: { z, y0 (foot), y1 (head), w0 (foot half-width), w1 (head half-width),
 * belly, furl (0..1: brailed up) }. Returns { mesh, update(t), set(o) }.
 */
export function squareSail(mat, o) {
  const nu = 12, nv = 8, g = new THREE.PlaneGeometry(1, 1, nu, nv);
  const m = mat.clone(); m.side = THREE.DoubleSide;
  if (m.map) { m.map = m.map.clone(); m.map.repeat.set(Math.max(1, o.w0 / 1.4), Math.max(1, (o.y1 - o.y0) / 1.8)); m.map.needsUpdate = true; m.bumpMap = m.map; }
  const mesh = new THREE.Mesh(g, m); mesh.name = 'sail'; mesh.castShadow = true;
  const st = { ...o, belly: o.belly ?? 1.2, furl: o.furl ?? 0, ph: Math.random() * 6 };
  const update = (t) => {
    const a = g.attributes.position.array, uv = g.attributes.uv.array, f = st.furl;
    for (let i = 0, k = 0; i < a.length; i += 3, k += 2) {
      const u = uv[k], v0 = uv[k + 1], v = 1 - (1 - v0) * (1 - f);          // furl gathers the cloth up toward the head yard
      const w = lerp(st.w0, st.w1, v), x = (u * 2 - 1) * w;
      const bell = (1 - (u * 2 - 1) ** 2) * Math.sin(Math.PI * clamp(v * 1.05 + 0.04, 0, 1)) * (1 - f);
      const breathe = 1 + 0.06 * Math.sin(t * 1.7 + st.ph) + 0.03 * Math.sin(t * 4.3 + u * 3 + st.ph);
      a[i] = x * (1 - 0.05 * bell);
      a[i + 1] = lerp(st.y0, st.y1, v) + bell * 0.15;
      a[i + 2] = st.z - 0.15 - bell * st.belly * breathe + Math.sin(t * 6 + u * 8 + v * 4 + st.ph) * 0.03 * (1 - f);
    }
    g.attributes.position.needsUpdate = true; g.computeVertexNormals();
  };
  update(0);
  return { mesh, update, set: (p) => { Object.assign(st, p); update(0); } };
}
/** A fore-and-aft sail on three corners (tack a, head b, clew c), bellied to side `lee` (+1 starboard). Lateen, jib,
 *  gaff (pass d for a four-cornered gaff sail: throat a, peak b, clew c, tack d). Breathes in the wind. */
export function triSail(mat, a, b, c, belly = 0.8, lee = 1, d = null) {
  const nu = 10, nv = 8, g = new THREE.PlaneGeometry(1, 1, nu, nv);
  const m = mat.clone(); m.side = THREE.DoubleSide;
  if (m.map) { m.map = m.map.clone(); const L = Math.hypot(b[1] - a[1], b[2] - a[2]); m.map.repeat.set(Math.max(1, L / 2), Math.max(1, L / 2.4)); m.map.needsUpdate = true; m.bumpMap = m.map; }
  const mesh = new THREE.Mesh(g, m); mesh.name = 'trisail'; mesh.castShadow = true;
  const ph = Math.random() * 6;
  const P = (u, v) => {
    if (d) {                                             // bilinear: a(0,0) b(0,1) c(1,1) d(1,0) with u along the foot
      return [0, 1, 2].map((i) => lerp(lerp(d[i], a[i], v), lerp(c[i], b[i], v), u));
    }
    return [0, 1, 2].map((i) => a[i] + (b[i] - a[i]) * v + (c[i] - a[i]) * u * (1 - v));
  };
  const update = (t) => {
    const p = g.attributes.position.array, uv = g.attributes.uv.array;
    for (let i = 0, k = 0; i < p.length; i += 3, k += 2) {
      const u = uv[k], v = uv[k + 1], q = P(u, v);
      const bell = Math.sin(Math.PI * u) * Math.sin(Math.PI * Math.min(1, v * 1.1)) * belly * (1 + 0.07 * Math.sin(t * 1.9 + ph));
      p[i] = q[0] + lee * bell; p[i + 1] = q[1]; p[i + 2] = q[2] - bell * 0.35 + Math.sin(t * 5 + u * 7 + ph) * 0.025;
    }
    g.attributes.position.needsUpdate = true; g.computeVertexNormals();
  };
  update(0);
  return { mesh, update };
}
/** Line segments (rigging) from a flat list of point pairs. */
export function lines(pairs, mat, name = 'rigging') {
  const r = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pairs.map((p) => new THREE.Vector3(...p))), mat);
  r.name = name; return r;
}
/** Shrouds with ratlines: from a mast point `top` down to chain plates `foot0..foot1` (n lines), rungs every `step`. */
export function shrouds(top, foot0, foot1, n = 4, step = 0.55) {
  const out = [], feet = [];
  for (let i = 0; i < n; i++) { const f = n === 1 ? 0.5 : i / (n - 1); feet.push(foot0.map((v, j) => lerp(v, foot1[j], f))); }
  for (const f of feet) out.push(top, f);
  const h = top[1] - foot0[1];
  for (let y = step; y < h * 0.85; y += step) {
    const t = y / h, pts = feet.map((f) => f.map((v, j) => lerp(v, top[j], t)));
    for (let i = 0; i < pts.length - 1; i++) out.push(pts[i], pts[i + 1]);
  }
  return out;
}
/** A mast: tapering spar with iron bands, mast step, and tops (platforms) at the given heights. */
export function mast(P, x, y0, z, h, r, { mat = 'cedar', band = 'iron', tops = [], cap = 'goldHammer' } = {}) {
  P.add(mat, rod([x, y0 - 0.1, z], [x, y0 + h, z], r, r * 0.55, 10), { swap: true });
  for (let y = y0 + 0.8; y < y0 + h - 0.6; y += 1.9) P.add(band, rod([x, y, z], [x, y + 0.16, z], r * (1 - 0.42 * (y - y0) / h) + 0.04, undefined, 10));
  P.add('scroll', box(r * 3, 0.4, r * 3, x, y0 + 0.2, z));
  for (const [ty, tw] of tops) {                          // the top: a platform with a rim, trestle trees under it
    P.add(mat, new THREE.CylinderGeometry(tw, tw * 0.85, 0.14, 12).translate(x, y0 + ty, z));
    P.add(band, new THREE.TorusGeometry(tw, 0.05, 4, 16).rotateX(Math.PI / 2).translate(x, y0 + ty + 0.08, z));
  }
  P.add(cap, new THREE.SphereGeometry(r * 0.8, 8, 6).translate(x, y0 + h + 0.05, z));
  return [x, y0 + h, z];
}
/** A yard across the mast at height y, half-length w, with gold tips. */
export function yard(P, x, y, z, w, r = 0.12, mat = 'cedar') {
  P.add(mat, rod([x - w, y, z], [x + w, y, z], r * 0.7, r, 8), { swap: true });
  P.add(mat, rod([x, y, z], [x + w, y, z], r, r * 0.7, 8), { swap: true });
  for (const sx of [-1, 1]) P.add('iron', rod([x + sx * w * 0.97, y, z], [x + sx * w * 1.02, y, z], r * 0.9, r * 0.9, 6));
}

// ------------------------------------------------------------------ guns
/** A broadside gun port in the hull side at (x, y, z), facing `side`: a dark port, a lid hinged up and a muzzle out. */
export function gunPort(P, x, y, z, side, { lid = 'redPaint', frame = 'blackwood', gun = 'iron', size = 0.7, open = true } = {}) {
  P.add('dark', box(0.1, size, size, x + side * 0.02, y, z));
  P.add(frame, box(0.12, size + 0.16, 0.1, x + side * 0.03, y, z - size / 2 - 0.04));
  P.add(frame, box(0.12, size + 0.16, 0.1, x + side * 0.03, y, z + size / 2 + 0.04));
  P.add(frame, box(0.12, 0.1, size + 0.16, x + side * 0.03, y - size / 2 - 0.04, z));
  if (open) {                                             // the lid swung up and out, a muzzle poking through
    const g = new THREE.BoxGeometry(0.08, size, size); g.translate(0, size / 2, 0); g.rotateZ(-side * 1.1); g.translate(x + side * 0.05, y + size / 2, z);
    P.add(lid, g);
    P.add(gun, rod([x - side * 0.3, y - 0.05, z], [x + side * 0.55, y - 0.02, z], size * 0.24, size * 0.2, 10));
    P.add(gun, rod([x + side * 0.48, y - 0.02, z], [x + side * 0.58, y - 0.02, z], size * 0.27, size * 0.27, 10));
  } else P.add(lid, box(0.08, size, size, x + side * 0.06, y, z));
}
/** A deck cannon on a wooden truck carriage at (x, z) on deck y, pointing toward `dir` (radians about Y, 0 = +X). */
export function deckCannon(P, x, y, z, dir, { len = 1.6, r = 0.2, barrel = 'iron', carriage = 'blackwood', trim = 'goldHammer' } = {}) {
  const c = Math.cos(dir), s = Math.sin(dir), at = (f, h) => [x + c * f, y + h, z - s * f];
  const g = new THREE.BoxGeometry(1.0, 0.4, 0.75); g.rotateY(dir); g.translate(x, y + 0.3, z); P.add(carriage, g);
  for (const sd of [-1, 1]) for (const f of [-0.35, 0.35]) {
    const wx = x + c * f - s * sd * 0.42, wz = z - s * f - c * sd * 0.42;
    P.add('iron', new THREE.CylinderGeometry(0.18, 0.18, 0.08, 10).rotateX(Math.PI / 2).rotateY(dir).translate(wx, y + 0.18, wz));
  }
  P.add(barrel, rod(at(-0.55, 0.62), at(len - 0.4, 0.66), r * 1.25, r, 12));
  P.add(trim, rod(at(len - 0.5, 0.66), at(len - 0.38, 0.66), r * 1.2, r * 1.2, 12));
  P.add(barrel, new THREE.SphereGeometry(r * 0.9, 8, 6).translate(...at(-0.62, 0.62)));
}
/** A twin-gun armoured turret (for the dreadnought and the carrier's galleries) as its own group, so it can sweep. */
export function turret(M, { r = 1.6, h = 0.9, guns = 2, len = 3.4, bore = 0.18, shell = 'iron', trim = 'goldHammer', barrel = 'gunmetal', crest = null } = {}) {
  const g = new THREE.Group(), P = new Parts(M);
  P.add(shell, new THREE.CylinderGeometry(r, r * 1.08, h, 20).translate(0, h / 2, 0));
  P.add(shell, new THREE.SphereGeometry(r * 0.98, 20, 8, 0, TAU, 0, Math.PI / 2.6).scale(1, 0.45, 1).translate(0, h, 0));
  P.add(trim, new THREE.TorusGeometry(r * 1.05, 0.07, 5, 24).rotateX(Math.PI / 2).translate(0, h * 0.15, 0));
  P.add(trim, new THREE.TorusGeometry(r * 1.0, 0.06, 5, 24).rotateX(Math.PI / 2).translate(0, h * 0.95, 0));
  P.add(shell, box(r * 1.1, h * 0.8, 0.6, -r * 0.55, h * 0.55, 0));             // the gun house's face plate
  for (let i = 0; i < guns; i++) {
    const zz = (i - (guns - 1) / 2) * bore * 4.2;
    P.add(barrel, rod([-r * 0.9, h * 0.6, zz], [-r - len, h * 0.62, zz], bore * 1.4, bore, 12));
    P.add(trim, rod([-r - len + 0.1, h * 0.62, zz], [-r - len - 0.1, h * 0.62, zz], bore * 1.3, bore * 1.3, 12));
    P.add('dark', new THREE.CircleGeometry(bore * 0.8, 10).rotateY(-Math.PI / 2).translate(-r - len - 0.11, h * 0.62, zz));
  }
  for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; P.add(trim, new THREE.SphereGeometry(0.06, 5, 4).translate(Math.cos(a) * r * 1.06, h * 0.5, Math.sin(a) * r * 1.06)); }
  if (crest) P.add(crest, new THREE.ConeGeometry(0.14, 0.6, 6).translate(r * 0.3, h + r * 0.45 + 0.25, 0));
  g.add(P.build('turret'));
  return g;
}

// ------------------------------------------------------------------ steam
/** A funnel: an iron stack with bands and a flared cap, glowing at the top, trailing smoke. Returns the smoke fx. */
export function funnel(P, x, y, z, r, h, { mat = 'iron', band = 'goldHammer', cap = 'gunmetal', rake = 0.12, tint, rise = 3.2, size = 1.4, n = 9 } = {}) {
  const top = [x, y + h, z + rake * h];
  P.add(mat, rod([x, y, z], top, r, r * 0.92, 16));
  for (const f of [0.18, 0.62, 0.86]) P.add(band, rod([x, y + h * f, z + rake * h * f], [x, y + h * f + 0.18, z + rake * (h * f + 0.18)], r * 1.04, r * 1.04, 16));
  // an open throat, not a lit lid: a flared rim, a dark bore with a grating, and the fire deep down (critics, round 1)
  P.add(cap, new THREE.CylinderGeometry(r * 1.18, r * 0.95, 0.3, 16, 1, true).translate(top[0], top[1] + 0.1, top[2]));
  P.add(cap, new THREE.TorusGeometry(r * 1.12, 0.06, 5, 16).rotateX(Math.PI / 2).translate(top[0], top[1] + 0.25, top[2]));
  P.add('dark', new THREE.CylinderGeometry(r * 0.9, r * 0.9, 0.9, 16, 1, true).translate(top[0], top[1] - 0.2, top[2]));
  P.add('dark', new THREE.CircleGeometry(r * 0.9, 16).rotateX(-Math.PI / 2).translate(top[0], top[1] - 0.6, top[2]));
  P.add('furnace', new THREE.CircleGeometry(r * 0.5, 12).rotateX(-Math.PI / 2).translate(top[0], top[1] - 0.58, top[2]));
  for (const d of [-0.5, 0, 0.5]) P.add('iron', box(r * 1.7, 0.05, 0.05, top[0], top[1] + 0.05, top[2] + d * r));
  return smoke([top[0], top[1] + 0.4, top[2]], n, tint || ['#3e3a40', '#2c2a30'], rise, size);
}
/** A paddle wheel in its box on one side: returns the spinning wheel group (spins about X). */
export function paddleWheel(M, P, x, y, z, r, w, side, { box: bm = 'iron', trim = 'goldHammer', blade = 'blackwood', crest } = {}) {
  // the paddle box: a half drum over the axle (the upper half) with a crest plate
  P.add(bm, new THREE.CylinderGeometry(r + 0.35, r + 0.35, w + 0.3, 24, 1, true, 0, Math.PI).rotateZ(Math.PI / 2).translate(x, y, z));
  for (const dx of [-1, 1]) P.add(bm, new THREE.CircleGeometry(r + 0.35, 24, 0, Math.PI).rotateY(Math.PI / 2 * dx).translate(x + dx * (w / 2 + 0.15), y, z));
  P.add(trim, new THREE.TorusGeometry(r + 0.36, 0.07, 5, 24, Math.PI).rotateY(Math.PI / 2).translate(x + side * (w / 2 + 0.16), y, z));
  if (crest) P.add(crest, new THREE.CircleGeometry(r * 0.55, 20, 0, Math.PI).rotateY(Math.PI / 2 * side).translate(x + side * (w / 2 + 0.18), y + 0.1, z));
  const wheel = new THREE.Group(), R = new Parts(M); wheel.position.set(x, y, z);
  R.add('iron', new THREE.CylinderGeometry(0.25, 0.25, w, 10).rotateZ(Math.PI / 2));
  for (const dx of [-w / 2 + 0.1, w / 2 - 0.1]) R.add('iron', new THREE.TorusGeometry(r * 0.92, 0.05, 4, 24).rotateY(Math.PI / 2).translate(dx, 0, 0));
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * TAU, c = Math.cos(a), s = Math.sin(a);
    R.add('iron', rod([0, 0, 0], [0, s * r * 0.9, c * r * 0.9], 0.04, 0.04, 4).translate(w / 2 - 0.1, 0, 0));
    R.add('iron', rod([0, 0, 0], [0, s * r * 0.9, c * r * 0.9], 0.04, 0.04, 4).translate(-w / 2 + 0.1, 0, 0));
    const b = new THREE.BoxGeometry(w - 0.1, 0.06, 0.5); b.rotateX(-a); b.translate(0, s * r * 0.88, c * r * 0.88); R.add(blade, b);
  }
  wheel.add(R.build('paddle'));
  return wheel;
}

// ------------------------------------------------------------------ boats and fittings
/** A small open boat (lifeboat, jolly boat) as geometry in P at (x, y, z), length l, bow toward -Z, rotated ry. */
export function dinghy(P, x, y, z, l, b, { mat = 'cedar', inner: im = 'cypress', rim = 'iron', ry = 0, oars = 0 } = {}) {
  const N = 14, sec = (s) => b * Math.pow(Math.sin(Math.PI * clamp(s * 0.92 + 0.08, 0, 1)), 0.7), d = b * 0.75;
  const g = surf(N, 4, (u, v) => {
    const s = u, w = sec(s), k = v;
    return [w * Math.pow(Math.max(0, 1 - k * k), 0.6) * (v < 1 ? 1 : 0), -d * k + 0.1 * Math.pow(Math.abs(s - 0.5) * 2, 3), l / 2 - s * l];
  }, (u, v) => [u * l / 2, v]);
  const g2 = g.clone().scale(-1, 1, 1); g2.index ? 0 : null;
  const flipN = (gg) => { const p = gg.attributes.position; for (let i = 0; i < p.count; i += 3) { const ax = p.getX(i + 1), ay = p.getY(i + 1), az = p.getZ(i + 1); p.setXYZ(i + 1, p.getX(i + 2), p.getY(i + 2), p.getZ(i + 2)); p.setXYZ(i + 2, ax, ay, az); } gg.computeVertexNormals(); return gg; };
  for (const gg of [g, flipN(g2)]) { gg.rotateY(ry); gg.translate(x, y, z); P.add(mat, gg, { uv: 'keep' }); }
  const deck = new THREE.PlaneGeometry(b * 1.5, l * 0.86).rotateX(-Math.PI / 2).translate(0, -d * 0.55, 0);
  deck.rotateY(ry); deck.translate(x, y, z); P.add(im, deck);
  for (const f of [0.3, 0.5, 0.7]) { const t = box(b * 1.7 * sec(f) / b, 0.08, 0.3, 0, -0.12, l / 2 - f * l); t.rotateY(ry); t.translate(x, y, z); P.add(im, t); }
  const rimG = new THREE.TorusGeometry(1, 0.05, 4, 24).rotateX(Math.PI / 2).scale(b * 0.98, 1, l * 0.5); rimG.rotateY(ry); rimG.translate(x, y + 0.02, z); P.add(rim, rimG);
  for (let i = 0; i < oars; i++) for (const sd of [-1, 1]) {
    const f = 0.32 + i * 0.18, zz = l / 2 - f * l, a = [sd * b * 0.9, 0.05, zz], e = [sd * (b + 1.9), -0.55, zz + 0.3];
    const o = rod(a, e, 0.04, 0.04, 4); o.rotateY(ry); o.translate(x, y, z); P.add('cedar', o);
  }
}
/** A boat davit pair holding a dinghy over the side at s along the ship (x outboard, deck y). */
export function davits(P, x, y, z, side, l, h = 2.2) {
  for (const dz of [-l * 0.38, l * 0.38]) {
    P.add('iron', rod([x - side * 0.3, y, z + dz], [x - side * 0.3, y + h * 0.8, z + dz], 0.06, 0.06, 6));
    P.add('iron', rod([x - side * 0.3, y + h * 0.8, z + dz], [x + side * 0.6, y + h, z + dz], 0.06, 0.05, 6));
  }
}
/** A stocked anchor hung at the cathead: shank, arms, flukes, ring and stock (wood). */
export function anchor(P, x, y, z, s = 1, ry = 0, mat = 'iron') {
  const add = (g) => { g.scale(s, s, s); g.rotateY(ry); g.translate(x, y, z); P.add(mat, g); };
  add(rod([0, 0, 0], [0, -1.6, 0], 0.07, 0.07, 6));
  for (const sd of [-1, 1]) { add(rod([0, -1.6, 0], [sd * 0.55, -1.15, 0], 0.07, 0.06, 6)); add(new THREE.ConeGeometry(0.16, 0.3, 4).rotateZ(sd * -0.6).translate(sd * 0.6, -1.05, 0)); }
  add(new THREE.TorusGeometry(0.14, 0.035, 4, 10).translate(0, 0.14, 0));
  const st = rod([0, -0.12, -0.6], [0, -0.12, 0.6], 0.06, 0.06, 6); st.scale(s, s, s); st.rotateY(ry); st.translate(x, y, z); P.add('blackwood', st);
}
/** A lantern on a bracket: returns its glow entry. */
export function lamp(P, x, y, z, big = 1, c = 0xffa040, glass = 'glass') {
  P.add('iron', box(0.28 * big, 0.06, 0.28 * big, x, y, z));
  P.add(glass, box(0.2 * big, 0.28 * big, 0.2 * big, x, y + 0.17 * big, z));
  P.add('goldHammer', new THREE.ConeGeometry(0.19 * big, 0.2 * big, 4).rotateY(Math.PI / 4).translate(x, y + 0.41 * big, z));
  return { x, y: y + 0.17 * big, z, r: 1.4 * big, c };
}
/** A boarding gangplank hinged at the origin reaching along +x*side; userData.set(f): 0 raised, 1 down on a rail. */
export function gangplank(M, mat, len, w, side) {
  const g = new THREE.Group(), P = new Parts(M);
  P.add(mat, box(len, 0.14, w, side * len / 2, 0, 0));
  for (let i = 0.35; i < len; i += 0.45) P.add('iron', box(0.06, 0.06, w + 0.02, side * i, 0.09, 0));
  for (const dz of [-w / 2, w / 2]) P.add('iron', box(len, 0.08, 0.08, side * len / 2, 0.05, dz));
  for (const dz of [-w / 2, w / 2]) for (let i = 0.3; i < len; i += 0.9) P.add('iron', rod([side * i, 0.05, dz], [side * i, 0.7, dz], 0.03, 0.03, 4));
  for (const dz of [-w / 2 + 0.15, w / 2 - 0.15]) P.add('iron', new THREE.ConeGeometry(0.1, 0.35, 5).translate(side * (len + 0.04), -0.18, dz));
  g.add(P.build('gangplank'));
  g.userData.set = (f) => { g.rotation.z = side * (Math.PI / 2 * (1 - f) - 0.08 * f); };
  g.userData.set(0);
  return g;
}
/** A grappling hook (4 tines) at origin, shank up +Y. */
export function grapnel(P, x, y, z, s = 1, mat = 'iron') {
  P.add(mat, rod([x, y, z], [x, y + 0.7 * s, z], 0.05 * s, 0.05 * s, 6));
  P.add(mat, new THREE.TorusGeometry(0.1 * s, 0.03 * s, 4, 8).translate(x, y + 0.78 * s, z));
  for (let i = 0; i < 4; i++) {
    const a = i / 4 * TAU + 0.4, c = Math.cos(a), sn = Math.sin(a);
    P.add(mat, rod([x, y, z], [x + c * 0.32 * s, y + 0.12 * s, z + sn * 0.32 * s], 0.04 * s, 0.035 * s, 5));
    P.add(mat, new THREE.ConeGeometry(0.04 * s, 0.22 * s, 4).translate(x + c * 0.34 * s, y + 0.25 * s, z + sn * 0.34 * s));
  }
}
/** A raised poop/forecastle rail of posts and a cap rail along x from x0 to x1 at deck y, at z. */
export function rail(P, x0, x1, y, z, { post = 'blackwood', cap = 'goldHammer', h = 0.62, gap = 0.45 } = {}) {
  const len = Math.abs(x1 - x0), cx = (x0 + x1) / 2, n = Math.max(2, Math.round(len / gap));
  for (let i = 0; i <= n; i++) P.add(post, box(0.09, h, 0.09, x0 + (x1 - x0) * i / n, y + h / 2, z));
  P.add(cap, box(len + 0.14, 0.1, 0.18, cx, y + h + 0.05, z));
}
/** Steps from deck y0 at z0 rising to y1 going along dir (+1/-1 in z), w wide. */
export function stairs(P, x, z0, y0, y1, dir, w = 2.4, mat = 'step', n) {
  n = n || Math.max(3, Math.round((y1 - y0) / 0.25)); const run = 0.42, rise = (y1 - y0) / n;
  for (let i = 0; i < n; i++) { const top = y0 + rise * (i + 1); P.add(mat, box(w, top - y0, run, x, y0 + (top - y0) / 2, z0 + dir * run * (n - i - 0.5))); }
  return z0 + dir * run * n;
}
/** A ship's wheel group, facing -Z, at deck y. */
export function helm(M, P, x, y, z) {
  P.add('blackwood', box(0.45, 1.05, 0.45, x, y + 0.52, z));
  const wheel = new THREE.Group(); wheel.position.set(x, y + 1.2, z - 0.3);
  const W = new Parts(M);
  W.add('scroll', new THREE.TorusGeometry(0.6, 0.07, 6, 20));
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; W.add('scroll', rod([0, 0, 0], [Math.cos(a) * 0.82, Math.sin(a) * 0.82, 0], 0.04, 0.035, 5)); }
  W.add('goldHammer', new THREE.CylinderGeometry(0.13, 0.13, 0.2, 10).rotateX(Math.PI / 2));
  wheel.add(W.build('wheel'));
  return wheel;
}
/** A bowl of crates and barrels (cargo) at (x, z) on deck y. */
export function cargo(P, x, y, z, n = 4, seed = 1) {
  let r = seed; const rnd = () => (r = (r * 9301 + 49297) % 233280) / 233280;
  for (let i = 0; i < n; i++) {
    const dx = (rnd() - 0.5) * 1.8, dz = (rnd() - 0.5) * 1.8;
    if (rnd() < 0.5) { const s = 0.6 + rnd() * 0.4; P.add('endgrain', box(s, s, s, x + dx, y + s / 2, z + dz, rnd())); P.add('iron', box(s + 0.03, 0.06, s + 0.03, x + dx, y + s - 0.12, z + dz, 0)); }
    else { P.add('cedar', new THREE.CylinderGeometry(0.3, 0.3, 0.85, 10).translate(x + dx, y + 0.43, z + dz), { swap: true }); for (const yy of [0.15, 0.7]) P.add('iron', new THREE.CylinderGeometry(0.32, 0.32, 0.06, 10).translate(x + dx, y + yy, z + dz)); }
  }
}
/** Pirate skull-and-bones emblem (a flat plate) facing +X*side at (x, y, z). */
export function skullPlate(P, x, y, z, side, s = 1, mat = 'boneWhite') {
  const f = (g) => { g.scale(s, s, s); g.rotateY(side > 0 ? Math.PI / 2 : -Math.PI / 2); g.translate(x, y, z); P.add(mat, g); };
  f(new THREE.SphereGeometry(0.42, 10, 8).scale(1, 1.05, 0.25));
  f(new THREE.BoxGeometry(0.42, 0.25, 0.12).translate(0, -0.42, 0));
  for (const d of [-1, 1]) f(new THREE.BoxGeometry(1.5, 0.14, 0.08).rotateZ(d * 0.7).translate(0, -0.15, -0.06));
  P.add('dark', new THREE.SphereGeometry(0.1 * s, 6, 4).translate(x + side * 0.12 * s, y + 0.05 * s, z - 0.16 * s));
  P.add('dark', new THREE.SphereGeometry(0.1 * s, 6, 4).translate(x + side * 0.12 * s, y + 0.05 * s, z + 0.16 * s));
}
/** Every mesh casts and takes shadows; a standard finish for a builder's root. */
export function finish(root) { root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); return root; }
