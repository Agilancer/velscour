// The Dawnwake (docs/PIRATE_SEAS.md): the heroes' ship, lent by the Lampwardens of the Ninth Bell. A steam frigate in
// limed white oak and bright steel: three masts of blue and cream square sails, one gilded funnel amidships, side paddle
// wheels with the Ninth Bell on their boxes, a gun deck of ports, green-flame lanterns (Tessariel's fire) on the rails.
// The forecastle carries a bell tower where the ironclad has its cathedral bridge: its great door is the party's
// arrival portal and nine bronze bells hang in its open belfry, the ninth green-gold. A brass diving bell (Brother
// Tolland's) hangs from a crane on the port quarter. It keeps the ironclad's deck plan (src/world/skyship.js: decks,
// stairs, fittings, the gate) so the game can reuse that walk map; only the hull below the waterline is a sea hull.
import * as THREE from 'three';
import { Parts, box, rod, surf, tris, flag, smoke, TAU, lerp, clamp, squareSail, triSail, lines, shrouds, mast, yard, gunPort, dinghy, davits, anchor } from './seaship3d.js';
import { slab } from './airship3d.js';
import { L, ZS, QD_S, FC_S, QD_H, FC_H, WALL, TOWER, zAt, sAt, beam, sheer, inner, deckAt, STAIR_W, QD_STAIRS, FC_STAIRS, GATE, LANDING, FITTINGS, sm } from '../src/world/skyship.js';

// ------------------------------------------------------------------ the Lampwardens' kit (shared with the lightship and tender)
const KITS = new WeakMap();
/** The faction's own materials on top of the sea pack (an overlay object, so the shared M is left untouched). */
export function lampMaterials(M) {
  if (KITS.has(M)) return KITS.get(M);
  const MM = Object.create(M);
  MM.greenFlame = new THREE.MeshStandardMaterial({ color: 0xc8ffdc, emissive: 0x46ff8a, emissiveIntensity: 2.3, roughness: 0.4 });
  MM.greenGlass = new THREE.MeshStandardMaterial({ color: 0x8affb4, emissive: 0x2ee874, emissiveIntensity: 1.5, roughness: 0.25, metalness: 0.1 });
  MM.bellBronze = M.bronze.clone(); MM.bellBronze.side = THREE.DoubleSide; MM.bellBronze.color = new THREE.Color(0xffd9a0);
  MM.ninthBell = M.goldHammer.clone(); Object.assign(MM.ninthBell, { side: THREE.DoubleSide, emissive: new THREE.Color(0x46ff8a), emissiveIntensity: 0.55 });
  MM.ninthBell.color = new THREE.Color(0xe8ffb0);
  MM.diveBrass = M.brass.clone(); MM.diveBrass.side = THREE.FrontSide; MM.diveBrass.color = new THREE.Color(0xffe0a0);
  MM.flameAdd = new THREE.MeshBasicMaterial({ color: 0x46ff8a, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false });
  MM.flameCore = new THREE.MeshBasicMaterial({ color: 0xeaffef });
  // the faction's palette, remapped from the pack's pixel-art tiles (the pack's woods and metals are all dark):
  // limed white oak, bright steel, a pale oak deck, Lampwarden blue paint, and fresh cream / blue sailcloth
  const tile = (src, lo, hi, gamma, o = {}) => {
    const t = new THREE.CanvasTexture(remap(M[src].map.image, lo, hi, gamma)); t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.NearestFilter; t.anisotropy = 8;
    return new THREE.MeshStandardMaterial({ map: t, bumpMap: t, bumpScale: 1.0, roughness: o.metal ? 0.45 : 0.85, metalness: o.metal || 0, side: o.side || THREE.FrontSide });
  };
  MM.whitewood = tile('greyboards', 0x8a8478, 0xfbf7ee, 0.8);
  MM.paleSteel = tile('silver', 0x6a7486, 0xf2f6ff, 0.9, { metal: 0.3 });
  MM.deck = tile('greyboards', 0x6e5a42, 0xdcc8a2, 0.9);
  MM.hullPaintBlue = tile('greyboards', 0x1c3560, 0x6c9cdc, 0.9);
  MM.gilt = tile('goldHammer', 0x7a5218, 0xfff0b0, 0.8, { metal: 0.15 });
  MM.blueSteel = tile('steel', 0x1e3462, 0x8cb8f4, 0.9, { metal: 0.45 });
  MM.creamCloth = remap(M.cream.map.image, 0xb8a888, 0xfffaf0, 0.8);
  MM.blueCloth = remap(M.cream.map.image, 0x1d3a6c, 0x6fa0e0, 0.9);
  const cloth = (c) => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.NearestFilter;
    return new THREE.MeshStandardMaterial({ map: t, roughness: 0.9, side: THREE.DoubleSide }); };
  MM.flagBlue = cloth(MM.blueCloth); MM.flagCream = cloth(MM.creamCloth);
  KITS.set(M, MM);
  return MM;
}
/** A pack tile recoloured onto a ramp lo..hi (hex colours) by its luminance (2..98th percentile), as a canvas. */
export function remap(img, lo, hi, gamma = 1) {
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
  const x = c.getContext('2d'); x.drawImage(img, 0, 0);
  const d = x.getImageData(0, 0, c.width, c.height), a = d.data, n = a.length / 4, Ls = new Float32Array(n);
  for (let i = 0; i < n; i++) Ls[i] = 0.3 * a[i * 4] + 0.59 * a[i * 4 + 1] + 0.11 * a[i * 4 + 2];
  const so = Float32Array.from(Ls).sort(), p0 = so[Math.floor(n * 0.02)], p1 = so[Math.floor(n * 0.98)];
  const A = [(lo >> 16) & 255, (lo >> 8) & 255, lo & 255], B = [(hi >> 16) & 255, (hi >> 8) & 255, hi & 255];
  for (let i = 0; i < n; i++) { const t = Math.pow(clamp((Ls[i] - p0) / Math.max(1, p1 - p0), 0, 1), gamma); for (let k = 0; k < 3; k++) a[i * 4 + k] = A[k] + (B[k] - A[k]) * t; }
  x.putImageData(d, 0, 0);
  return c;
}
/** A pixel-art canvas texture (nearest up close). */
export function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d'); x.imageSmoothingEnabled = false; draw(x, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter; t.anisotropy = 8;
  return t;
}
/** The Ninth Bell device: a gold bell under a green flame, at (cx, cy) top-left-ish, s pixels per cell. */
export function drawBell(x, cx, cy, s, { bell = '#e0b850', dark = '#3a2a10', flame = '#46ff8a', core = '#eaffef' } = {}) {
  const rows = [2, 4, 4, 6, 6, 6, 6, 8, 8, 10, 12, 12];
  const flameRows = [1, 1, 3, 3, 5, 5, 3];
  const put = (col, list, y0, grow) => list.forEach((w, i) => x.fillRect(cx - (w / 2 + grow) * s, cy + (y0 + i - grow * (i === 0 ? 1 : 0)) * s, (w + grow * 2) * s, s * (1 + (i === list.length - 1 ? grow : 0))));
  x.fillStyle = dark; put(dark, rows, 7, 1);
  x.fillStyle = bell; put(bell, rows, 7, 0);
  x.fillStyle = 'rgba(255,255,255,0.35)'; for (let i = 3; i < 10; i++) x.fillRect(cx - (rows[i] / 2 - 1) * s, cy + (7 + i) * s, s, s);
  x.fillStyle = dark; x.fillRect(cx - s, cy + 19 * s, 2 * s, 2 * s);
  x.fillStyle = flame; put(flame, flameRows, 0, 0);
  x.fillStyle = core; x.fillRect(cx - s / 2, cy + 3 * s, s, 3 * s);
}
/** The Peal of Nine: nine small bells in a shallow arc (the ninth, in the middle, green-gold) over one green flame.
 *  cx, cy: the arc's crown; span: its width in px. Drawn so it can never read as a ring of stars. */
export function drawPeal(x, cx, cy, span, { bell = '#e8c060', ninth = '#b8f070', dark = '#2a1c08', flame = '#46ff8a', core = '#eaffef' } = {}) {
  const s = Math.max(1, Math.round(span / 46)), rows = [1, 2, 2, 3, 3, 4, 4];
  const small = (bx, by, col) => {
    x.fillStyle = dark; rows.forEach((w, i) => x.fillRect(bx - (w / 2 + 1) * s, by + (i - (i ? 0 : 1)) * s, (w + 2) * s, s * (i ? 1 : 2)));
    x.fillRect(bx - 3 * s, by + rows.length * s, 6 * s, s);
    x.fillStyle = col; rows.forEach((w, i) => x.fillRect(bx - (w / 2) * s, by + i * s, w * s, s));
    x.fillStyle = dark; x.fillRect(bx - s / 2, by + rows.length * s, s, s);
  };
  for (let i = 0; i < 9; i++) { const t = (i - 4) / 4; small(Math.round(cx + t * span / 2), Math.round(cy + t * t * span * 0.16), i === 4 ? ninth : bell); }
  const fy = cy + span * 0.26, F = [1, 1, 3, 3, 5, 5, 7, 7, 5, 3];
  x.fillStyle = dark; F.forEach((w, i) => x.fillRect(cx - (w / 2 + 1) * s, fy + (i - 1) * s, (w + 2) * s, s * 2));
  x.fillStyle = flame; F.forEach((w, i) => x.fillRect(cx - (w / 2) * s, fy + i * s, w * s, s));
  x.fillStyle = core; x.fillRect(cx - s / 2, fy + 4 * s, s, 4 * s);
}
/** Sailcloth: the pack's cream linen tiled small, tinted, with panel seams, reef points, a bolt rope and an emblem. */
export function sailTex(M, kind) {
  const MM = lampMaterials(M);
  return canvasTex(256, 256, (x, w, h) => {
    const blue = kind.startsWith('blue'), img = blue ? MM.blueCloth : MM.creamCloth;
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) x.drawImage(img, i * 128, j * 128, 128, 128);
    x.fillStyle = 'rgba(40,30,20,0.16)'; for (let i = 18; i < w; i += 21) x.fillRect(i, 0, 2, h);
    x.fillStyle = 'rgba(40,30,20,0.25)'; for (const y of [44, 92]) for (let i = 10; i < w; i += 14) x.fillRect(i, y, 2, 4);
    if (kind.endsWith('Band')) { x.fillStyle = blue ? 'rgba(250,240,215,0.9)' : 'rgba(60,110,180,0.85)'; x.fillRect(0, 170, w, 26); }
    x.fillStyle = blue ? '#24406c' : '#8a7a5c'; x.fillRect(0, 0, w, 5); x.fillRect(0, h - 5, w, 5); x.fillRect(0, 0, 5, h); x.fillRect(w - 5, 0, 5, h);
    if (kind.endsWith('Bell')) {                    // the Ninth Bell, big on the main course
      x.fillStyle = blue ? 'rgba(250,240,215,0.9)' : 'rgba(61,111,176,0.9)';
      x.beginPath(); x.arc(128, 132, 70, 0, TAU); x.fill();
      x.fillStyle = blue ? '#24406c' : '#e8dcc0'; x.beginPath(); x.arc(128, 132, 62, 0, TAU); x.fill();
      x.fillStyle = blue ? 'rgba(250,240,215,0.9)' : 'rgba(61,111,176,0.95)'; x.beginPath(); x.arc(128, 132, 56, 0, TAU); x.fill();
      drawBell(x, 128, 88, 4.4);
    }
    if (kind.endsWith('Star')) drawPeal(x, 128, 92, 150);   // the Peal of Nine
  });
}
/** The Lampwardens' ensign: blue with a cream hoist and fly band, the Peal of Nine over the green flame. */
export function ensignMat(MM) {
  if (MM.ensign) return MM.ensign;
  const ensTex = canvasTex(96, 64, (x) => {
    x.fillStyle = '#3d6fb0'; x.fillRect(0, 0, 96, 64); x.fillStyle = '#f2ead6'; x.fillRect(0, 0, 10, 64); x.fillRect(0, 56, 96, 8); x.fillRect(0, 0, 96, 6);
    drawPeal(x, 54, 16, 62);
  });
  return (MM.ensign = new THREE.MeshStandardMaterial({ map: ensTex, roughness: 0.9, side: THREE.DoubleSide }));
}
/** A sail made from a canvas texture (squareSail / triSail clone the material; the map goes on after). */
const plainSail = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.92, side: THREE.DoubleSide });
export function texSail(make, tex) { const s = make(plainSail); s.mesh.material.map = tex; s.mesh.material.needsUpdate = true; return s; }

/** A bell (lathe, opening down) hung from its crown at the origin: mouth radius r, height h. */
export function bellGeo(r, h, seg = 14) {
  const P = [[1.0, -1.0], [0.94, -0.93], [0.76, -0.8], [0.6, -0.6], [0.52, -0.36], [0.5, -0.16], [0.42, -0.04], [0.2, 0], [0.0, 0.0]];
  return new THREE.LatheGeometry(P.map(([a, b]) => new THREE.Vector2(a * r, b * h)), seg);
}
/** A Lampwarden lantern on the rail: steel base and posts, green glass, gilt hood and ring. Returns its glow. */
export function greenLantern(P, x, y, z, k = 1) {
  P.add('paleSteel', box(0.32 * k, 0.06, 0.32 * k, x, y, z));
  P.add('greenGlass', box(0.22 * k, 0.32 * k, 0.22 * k, x, y + 0.19 * k, z));
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) P.add('paleSteel', box(0.04, 0.34 * k, 0.04, x + dx * 0.12 * k, y + 0.19 * k, z + dz * 0.12 * k));
  P.add('goldHammer', new THREE.ConeGeometry(0.21 * k, 0.3 * k, 4).rotateY(Math.PI / 4).translate(x, y + 0.5 * k, z));
  P.add('goldHammer', new THREE.TorusGeometry(0.06 * k, 0.02 * k, 4, 8).translate(x, y + 0.7 * k, z));
  return { x, y: y + 0.19 * k, z, r: 1.5 * k, c: 0x46ff8a };
}
/** A flickering green flame (additive shell round a white core) as its own group at (x, y, z). */
export function greenFire(MM, x, y, z, k = 1) {
  const g = new THREE.Group(); g.position.set(x, y, z);
  const o = new THREE.Mesh(new THREE.ConeGeometry(0.26 * k, 0.8 * k, 7).translate(0, 0.4 * k, 0), MM.flameAdd);
  const o2 = new THREE.Mesh(new THREE.ConeGeometry(0.18 * k, 0.6 * k, 6).translate(0, 0.3 * k, 0), MM.flameAdd); o2.position.set(0.08 * k, 0, 0.05 * k);
  const c = new THREE.Mesh(new THREE.ConeGeometry(0.11 * k, 0.42 * k, 6).translate(0, 0.21 * k, 0), MM.flameCore);
  g.add(o, o2, c); g.name = 'greenfire';
  g.userData.update = (t, i = 0) => { o.scale.set(1, 0.8 + 0.35 * Math.abs(Math.sin(t * 9 + i * 2.1)), 1); o2.scale.set(1, 0.7 + 0.5 * Math.abs(Math.sin(t * 13 + i)), 1); o.rotation.y = t * 2; };
  return g;
}
/** A lofted sea hull from a width function x(s, y), banded by absolute heights (so the boot-top sits level). */
export function loft(P, H) {
  const ns = H.ns || Math.round(H.L * 3.5), zOf = (s) => H.zs - s * H.L;
  for (const [mat, yt, yb, nk = 3] of H.bands) for (const side of [1, -1]) {
    const Y = (u, v) => { const top = H.sheer(u), bot = H.keel(u), a = yt == null ? top : clamp(yt, bot, top), b = yb == null ? bot : clamp(yb, bot, top); return lerp(a, b, v); };
    P.add(mat, surf(ns, nk, (u, v) => { const y = Y(u, v); return [side * H.x(u, y), y, zOf(u)]; }, (u, v) => [zOf(u) / 2, Y(u, v) / 2], side > 0), { uv: 'keep' });
  }
  if (H.transom) for (const [mat, yt, yb, nk = 3] of H.bands) {           // a flat transom at s = 0, banded the same
    const top = H.sheer(0), bot = H.keel(0), a = yt == null ? top : clamp(yt, bot, top), b = yb == null ? bot : clamp(yb, bot, top);
    if (a - b < 1e-3) continue;
    P.add(mat, surf(1, nk * 2, (u, v) => { const y = lerp(a, b, v); return [(u * 2 - 1) * H.x(0, y), y, H.zs]; }, (u, v) => [(u * 2 - 1) * H.x(0, lerp(a, b, v)) / 2, lerp(a, b, v) / 2], true), { uv: 'keep' });
  }
}
/** A pointed arch outline (width w, sides straight to hs, apex at h) and an extruded frame round it. */
export function archShape(w, hs, h) {
  const s = new THREE.Shape(), a = w / 2;
  s.moveTo(-a, 0); s.lineTo(-a, hs);
  s.bezierCurveTo(-a, hs + (h - hs) * 0.55, -a * 0.35, h - 0.05, 0, h);
  s.bezierCurveTo(a * 0.35, h - 0.05, a, hs + (h - hs) * 0.55, a, hs);
  s.lineTo(a, 0); s.lineTo(-a, 0);
  return s;
}
export const archFrame = (w, hs, h, t, depth) => new THREE.ExtrudeGeometry(Object.assign(archShape(w + t * 2, hs + t * 0.2, h + t * 1.5), { holes: [archShape(w, hs, h)] }),
  { depth, bevelEnabled: false, curveSegments: 6 });
/** Brother Tolland's diving bell: a riveted brass bell with round ports, ballast weights and a hose, hung at the origin. */
export function divingBell(MM, k = 1) {
  const g = new THREE.Group(), P = new Parts(MM);
  P.add('diveBrass', new THREE.LatheGeometry([[0, 0.05], [0.25, 0.05], [0.55, -0.15], [0.78, -0.6], [0.92, -1.25], [1.0, -1.7], [1.06, -1.78], [0.94, -1.78]].map(([a, b]) => new THREE.Vector2(a * k, b * k)), 16).rotateY(0.1));
  for (const y of [-0.62, -1.2, -1.66]) P.add('goldHammer', new THREE.TorusGeometry((0.79 + (-0.62 - y) * 0.26) * k, 0.045 * k, 4, 20).rotateX(Math.PI / 2).translate(0, y * k, 0));
  for (let i = 0; i < 3; i++) {
    const a = i * TAU / 3 + 0.4, r = 0.86 * k, y = -1.05 * k, n = new THREE.Vector3(Math.sin(a), 0.18, Math.cos(a)).normalize();
    const port = new THREE.CircleGeometry(0.17 * k, 10); port.lookAt(n); port.translate(Math.sin(a) * r, y, Math.cos(a) * r); P.add('greenGlass', port);
    const rim = new THREE.TorusGeometry(0.19 * k, 0.045 * k, 4, 12); rim.lookAt(n); rim.translate(Math.sin(a) * (r + 0.01), y, Math.cos(a) * (r + 0.01)); P.add('paleSteel', rim);
    P.add('iron', box(0.22 * k, 0.3 * k, 0.22 * k, Math.sin(a + 1) * 1.02 * k, -1.62 * k, Math.cos(a + 1) * 1.02 * k));       // ballast
  }
  P.add('paleSteel', new THREE.TorusGeometry(0.16 * k, 0.05 * k, 4, 10).translate(0, 0.2 * k, 0));
  P.add('iron', rod([0.2 * k, 0.05 * k, 0], [0.5 * k, 0.5 * k, 0.1 * k], 0.06 * k, 0.06 * k, 6));
  g.add(P.build('divingbell'));
  return g;
}

// ------------------------------------------------------------------ the hull below the deck plan
const WL = -2.2;
const keelY = (s) => -5.5 + 1.0 * (1 - sm(0, 0.22, s)) + 2.9 * Math.pow(sm(0.62, 1, s), 1.4);
/** Half-width at (s, y): wall-sided topsides (the deck plan's beam), a round bilge, a fine run aft and entry forward. */
function hx(s, y) {
  const top = sheer(s), bot = keelY(s), b = beam(s);
  const y0 = bot + Math.max(WL + 0.25 - bot, 0.55 * (top - bot));
  if (y >= y0) return b;
  const d = clamp((y0 - y) / (y0 - bot), 0, 1);
  const run = lerp(1, 0.12 + 0.88 * sm(0, 0.3, s), Math.pow(d, 0.65));
  const entry = lerp(1, 1 - 0.5 * sm(0.6, 1, s), d);
  return b * run * entry * (0.05 + 0.95 * Math.pow(Math.max(0, 1 - Math.pow(d, 2.3)), 0.55));
}
export const DAWNWAKE = { L, QD_S, FC_S, QD_H, FC_H, zAt, sAt, beam, inner, deckAt, sheer, keel: keelY, waterline: WL,
  blocked: (x, z) => { const s = sAt(z); return s > TOWER[0] - 0.01 && s < TOWER[1] + 0.02; } };

export function buildDawnwake(M) {
  const MM = lampMaterials(M);
  const root = new THREE.Group(); root.name = 'dawnwake';
  const P = new Parts(MM), glow = [], fx = [], sails = [], flags = [], spin = [], bells = [], fires = [], guns = [], sway = [];
  const rig = [], ratl = [];
  const NS = 140;

  // ---------------------------------------------------------------- hull: white oak, a blue gun strake, a gold wale, copper
  loft(P, { L, zs: ZS, ns: NS, sheer, keel: keelY, x: hx, transom: true, bands: [
    ['whitewood', null, 0.98, 3], ['goldHammer', 0.98, 0.84, 1], ['whitewood', 0.84, -0.28, 3], ['goldHammer', -0.28, -0.42, 1],
    ['hullPaintBlue', -0.42, -1.56, 3], ['goldHammer', -1.56, -1.68, 1], ['whitewood', -1.68, -1.92, 1], ['tar', -1.92, -2.48, 2], ['copper', -2.48, null, 8]] });
  // keel, stem and sternpost
  { const pts = []; for (let i = 0; i <= 40; i++) { const s = i / 40; pts.push([0, keelY(s) - 0.12, zAt(s)]); }
    for (let i = 0; i < 40; i++) P.add('copper', rod(pts[i], pts[i + 1], 0.16, 0.16, 6));
    P.add('whitewood', rod([0, keelY(1), -20.0], [0, sheer(1) + 0.1, -20.05], 0.17, 0.15, 6));
    P.add('goldHammer', rod([0, -0.4, -20.12], [0, sheer(1) + 0.15, -20.14], 0.1, 0.1, 6)); }
  // rudder on the sternpost: copper below, steel straps, a gilt head
  { const y0 = keelY(0) - 0.1, y1 = -2.45, y2 = -0.15;
    P.add('copper', box(0.26, y1 - y0, 1.3, 0, (y0 + y1) / 2, ZS + 0.7));
    P.add('tar', box(0.26, 0.5, 1.2, 0, y1 + 0.25, ZS + 0.65));
    P.add('whitewood', box(0.24, y2 - y1 - 0.5, 0.9, 0, (y1 + 0.5 + y2) / 2, ZS + 0.5));
    for (const y of [-3.6, -2.9, -1.6, -0.8]) P.add('paleSteel', box(0.32, 0.12, y < -2.5 ? 1.35 : 0.95, 0, y, ZS + (y < -2.5 ? 0.7 : 0.5))); }
  // bulwarks: inner face, cap rail with fascias, stern bulwark; the decks
  for (const side of [1, -1]) {
    P.add('whitewood', surf(NS, 1, (u, v) => [side * inner(u), v ? deckAt(u) - 0.05 : sheer(u), zAt(u)], (u, v) => [zAt(u) / 2, v * 0.6], side < 0), { uv: 'keep' });
    P.add('goldHammer', surf(NS, 1, (u, v) => [side * (v ? inner(u) - 0.06 : beam(u) + 0.07), sheer(u) + 0.12, zAt(u)], (u, v) => [zAt(u) / 2, v * 0.2], side < 0), { uv: 'keep' });
    P.add('goldHammer', surf(NS, 1, (u, v) => [side * (beam(u) + 0.07), sheer(u) + 0.12 - v * 0.14, zAt(u)], (u, v) => [zAt(u) / 2, v * 0.1], side > 0), { uv: 'keep' });
    P.add('whitewood', surf(NS, 1, (u, v) => [side * (inner(u) - 0.06), sheer(u) + 0.12 - v * 0.14, zAt(u)], (u, v) => [zAt(u) / 2, v * 0.1], side < 0), { uv: 'keep' });
  }
  P.add('whitewood', box(inner(0) * 2, sheer(0) - QD_H, WALL, 0, (sheer(0) + QD_H) / 2, ZS - WALL / 2));
  P.add('goldHammer', box(beam(0) * 2 + 0.14, 0.14, WALL + 0.16, 0, sheer(0) + 0.06, ZS - WALL / 2));
  const deckStrip = (mat, s0, s1, y) => P.add(mat, surf(Math.max(2, Math.ceil((s1 - s0) * NS)), 1, (u, v) => { const s = lerp(s0, s1, u); return [(v * 2 - 1) * inner(s), y, zAt(s)]; },
    (u, v) => { const s = lerp(s0, s1, u); return [zAt(s) / 2, (v * 2 - 1) * inner(s) / 2]; }, true), { uv: 'keep' });
  deckStrip('deck', QD_S - 0.01, FC_S + 0.01, 0); deckStrip('deck', 0.009, QD_S, QD_H); deckStrip('deck', FC_S, 0.995, FC_H);
  // bulwark stanchions inside (the frames showing through), with belaying pins
  for (let z = 10.6; z > -10.6; z -= 1.45) for (const side of [-1, 1]) {
    const s = sAt(z);
    P.add('whitewood', box(0.14, sheer(s) - 0.05, 0.16, side * (inner(s) - 0.07), (sheer(s) - 0.05) / 2, z));
  }
  for (const side of [-1, 1]) for (const z0 of [-9.6, 5.6]) {                        // pin rails by the shrouds
    const z = z0 + 1.6, s = sAt(z), x = side * (inner(s) - 0.18);
    P.add('whitewood', box(0.22, 0.08, 2.6, x, 0.72, z));
    for (let i = 0; i < 7; i++) P.add('paleSteel', rod([x, 0.62, z - 1.15 + i * 0.38], [x, 0.92, z - 1.15 + i * 0.38], 0.025, 0.025, 4));
  }
  const zq = zAt(QD_S), zf = zAt(FC_S);
  for (const [z, h, f] of [[zq - 0.15, QD_H, -1], [zf + 0.15, FC_H, 1]]) {
    const w = inner(sAt(z)) * 2;
    P.add('whitewood', box(w, h, 0.3, 0, h / 2, z));
    P.add('goldHammer', box(w, 0.12, 0.36, 0, h - 0.06, z));
    for (const x of [-2.25, 2.25, -w / 2 + 0.5, w / 2 - 0.5]) P.add('paleSteel', box(0.24, h, 0.1, x, h / 2, z + f * 0.17));
  }

  // ---------------------------------------------------------------- the grand stairs (the deck plan's): oak treads, brass nosing
  const stairs = (z0, dir, h, n) => {
    const rise = h / n, run = 4 / n, w = STAIR_W;
    for (let i = 0; i < n; i++) {
      const y = rise * (n - i), z = z0 + dir * run * (i + 0.5);
      P.add('deck', box(w, y, run, 0, y / 2, z));
      P.add('goldHammer', box(w, 0.05, 0.08, 0, y + 0.01, z + dir * (run / 2 - 0.04)));
    }
    for (const sx of [-1, 1]) {
      const g = new THREE.BoxGeometry(0.26, 0.4, run * n * Math.hypot(1, h / (run * n)) + 0.2);
      g.rotateX(dir * Math.atan2(h, run * n)); g.translate(sx * (w / 2 - 0.13), h / 2 + 0.16, z0 + dir * run * n / 2);
      P.add('whitewood', g);
    }
    return z0 + dir * run * n;
  };
  const qFoot = stairs(zq, -1, QD_H, QD_STAIRS[2]), fFoot = stairs(zf, 1, FC_H, FC_STAIRS[2]);
  const rail = (x0, x1, y, z) => {
    const len = Math.abs(x1 - x0), cx = (x0 + x1) / 2, n = Math.max(2, Math.round(len / 0.42));
    for (let i = 0; i <= n; i++) P.add('whitewood', new THREE.CylinderGeometry(0.05, 0.07, 0.6, 6).translate(x0 + (x1 - x0) * i / n, y + 0.36, z));
    P.add('goldHammer', box(len + 0.16, 0.12, 0.22, cx, y + 0.72, z));
    P.add('whitewood', box(len, 0.08, 0.14, cx, y + 0.08, z));
    for (const x of [x0, x1]) { P.add('paleSteel', box(0.3, 1.0, 0.3, x, y + 0.5, z)); P.add('goldHammer', new THREE.SphereGeometry(0.12, 6, 4).translate(x, y + 1.1, z)); }
  };
  rail(-inner(QD_S) + 0.1, -2.2, QD_H, zq + 0.12); rail(2.2, inner(QD_S) - 0.1, QD_H, zq + 0.12);
  rail(-inner(FC_S) + 0.1, -2.2, FC_H, zf + 0.12); rail(2.2, inner(FC_S) - 0.1, FC_H, zf + 0.12);
  for (const sx of [-2.2, 2.2]) { glow.push(greenLantern(P, sx, QD_H + 1.22, zq + 0.12, 0.8)); glow.push(greenLantern(P, sx, FC_H + 1.22, zf + 0.12, 0.8)); }
  // doors under the raised decks: blue oak in steel straps under gilded pointed arches
  const door = (x, z, face) => {
    const flat = (w, hs, h, dz) => { const g = new THREE.ShapeGeometry(archShape(w, hs, h), 6); if (face < 0) g.rotateY(Math.PI); return g.translate(x, 0, z + face * dz); };
    P.add('dark', flat(1.4, 1.35, 1.95, 0.02)); P.add('hullPaintBlue', flat(1.2, 1.3, 1.82, 0.05));
    for (const y of [0.4, 1.1]) P.add('paleSteel', box(1.2, 0.08, 0.05, x, y, z + face * 0.07));
    const fr = archFrame(1.4, 1.35, 1.95, 0.16, 0.14); if (face < 0) fr.translate(0, 0, -0.14);
    P.add('goldHammer', fr.translate(x, 0, z));
  };
  door(-3.6, zf + 0.3, 1); door(3.6, zf + 0.3, 1); door(-3.9, zq - 0.3, -1); door(3.9, zq - 0.3, -1);
  // green-flame lanterns along the rails (not over the paddle boxes)
  for (const s of [0.07, 0.3, 0.38, 0.62, 0.7, 0.86]) for (const side of [-1, 1]) glow.push(greenLantern(P, side * (inner(s) + WALL / 2), sheer(s) + 0.12, zAt(s), 0.75));

  // ---------------------------------------------------------------- the gun deck: ports in the blue strake, white lids
  const PORTS = [10.4, 8.6, 6.8, 5.0, -5.0, -6.8, -8.6, -10.4];
  for (const side of [-1, 1]) for (const z of PORTS) { const y = -0.98; gunPort(P, side * hx(sAt(z), y), y, z, side, { lid: 'whitewood', frame: 'goldHammer', gun: 'paleSteel', size: 0.6 }); }
  // channels with deadeyes and chain plates where the shrouds come down
  for (const side of [-1, 1]) for (const [z0, z1] of [[-6.6, -3.8], [4.4, 7.2], [13.4, 15.6]]) {
    const zc = (z0 + z1) / 2, s = sAt(zc), y = sheer(s) - 0.28, x = side * (beam(s) + 0.22);
    P.add('whitewood', box(0.46, 0.12, z1 - z0, x, y, zc));
    for (let i = 0; i < 5; i++) { const z = lerp(z0 + 0.2, z1 - 0.2, i / 4); P.add('blackwood', new THREE.SphereGeometry(0.1, 6, 4).scale(0.6, 1, 1).translate(x + side * 0.16, y + 0.16, z)); P.add('paleSteel', box(0.05, 1.3, 0.07, x + side * 0.16, y - 0.6, z)); }
  }

  // ---------------------------------------------------------------- paddle wheels amidships, the Ninth Bell on their boxes
  const PZ = 0, PR = 2.9, PWD = 1.7, PY = -0.25, BR = PR + 0.38;
  for (const side of [-1, 1]) {
    const x0 = side * (beam(0.5) + 0.12), xc = side * (beam(0.5) + 0.2 + PWD / 2), xo = side * (beam(0.5) + 0.3 + PWD);
    // the box: a gilded half drum of white oak, flat faces, a sponson deck and fairings
    P.add('whitewood', new THREE.CylinderGeometry(BR, BR, PWD + 0.2, 28, 1, true, 0, Math.PI).rotateZ(Math.PI / 2).translate(xc, PY, PZ));
    for (let i = 1; i < 7; i++) { const a = i / 7 * Math.PI; P.add('paleSteel', new THREE.BoxGeometry(PWD + 0.24, 0.06, 0.14).rotateX(Math.PI / 2 - a).translate(xc, PY + Math.sin(a) * (BR + 0.02), PZ + Math.cos(a) * (BR + 0.02))); }
    for (const xx of [x0, xo]) P.add('whitewood', new THREE.CircleGeometry(BR, 28, 0, Math.PI).rotateY(Math.sign(xx - xc) * Math.PI / 2).translate(xx, PY, PZ));
    P.add('goldHammer', new THREE.TorusGeometry(BR, 0.09, 5, 28, Math.PI).rotateY(Math.PI / 2).translate(xo, PY, PZ));
    P.add('goldHammer', new THREE.TorusGeometry(BR, 0.06, 5, 28, Math.PI).rotateY(Math.PI / 2).translate(x0 + side * 0.05, PY, PZ));
    const face = (g, d = 0.03) => g.rotateY(side * Math.PI / 2).translate(xo + side * d, PY, PZ);
    P.add('hullPaintBlue', face(new THREE.CircleGeometry(BR * 0.86, 28, 0, Math.PI)));
    for (let i = 0; i < 9; i++) {                                // nine gilt rays, the Ninth at the top
      const a = Math.PI * (0.1 + 0.8 * i / 8), r0 = 0.95, r1 = BR * 0.82;
      const g = new THREE.BoxGeometry(i === 4 ? 0.26 : 0.15, r1 - r0, 0.05).translate(0, (r0 + r1) / 2, 0).rotateZ(a - Math.PI / 2);
      P.add(i === 4 ? 'greenGlass' : 'goldHammer', face(g, 0.07));
    }
    P.add('goldHammer', face(new THREE.CircleGeometry(0.9, 18, 0, Math.PI), 0.06));
    P.add('goldHammer', face(new THREE.TorusGeometry(BR * 0.86, 0.06, 4, 24, Math.PI), 0.07));
    const bell = bellGeo(0.42, 0.75).translate(0, 0.95, 0); bell.rotateX(0); P.add('bellBronze', bell.translate(xo + side * 0.32, PY + 0.25, PZ));
    P.add('goldHammer', box(0.1, 0.12, 0.5, xo + side * 0.32, PY + 1.25, PZ));
    // sponson: a walkway along the box's foot, struts to the hull, fairings fore and aft
    P.add('whitewood', box(Math.abs(xo - x0) + 0.2, 0.14, BR * 2 + 2.4, (x0 + xo) / 2, PY - 0.06, PZ));
    P.add('goldHammer', box(0.08, 0.16, BR * 2 + 2.4, xo + side * 0.04, PY - 0.06, PZ));
    for (const dz of [-1, 1]) {
      const zt = PZ + dz * (BR + 1.2), zh = PZ + dz * (BR + 3.4);
      P.add('whitewood', tris([[x0, PY, zt], [xo, PY, zt], [x0, PY, zh], [x0, PY - 0.14, zt], [xo, PY - 0.14, zt], [x0, PY - 0.14, zh]], side > 0 ? [0, 2, 1, 3, 4, 5, 1, 2, 5, 1, 5, 4] : [0, 1, 2, 3, 5, 4, 1, 5, 2, 1, 4, 5]));
      for (const zz of [PZ + dz * (BR - 0.4), PZ + dz * (BR + 1.0)]) P.add('paleSteel', rod([x0, -1.7, zz], [xo - side * 0.2, PY - 0.12, zz], 0.08, 0.08, 5));
    }
    glow.push(greenLantern(P, xo - side * 0.3, PY + BR + 0.05, PZ, 0.85));
    // the wheel: steel rims and spokes, oak floats; turns so its bottom pushes aft
    const wheel = new THREE.Group(), W = new Parts(MM); wheel.position.set(xc, PY, PZ);
    W.add('paleSteel', new THREE.CylinderGeometry(0.3, 0.3, PWD + 0.6, 12).rotateZ(Math.PI / 2));
    for (const dx of [-PWD / 2 + 0.12, PWD / 2 - 0.12]) for (const rr of [PR * 0.93, PR * 0.55]) W.add('paleSteel', new THREE.TorusGeometry(rr, 0.055, 4, 28).rotateY(Math.PI / 2).translate(dx, 0, 0));
    for (let i = 0; i < 14; i++) {
      const a = i / 14 * TAU, c = Math.cos(a), s = Math.sin(a);
      for (const dx of [-PWD / 2 + 0.12, PWD / 2 - 0.12]) W.add('paleSteel', rod([dx, 0, 0], [dx, s * PR * 0.93, c * PR * 0.93], 0.045, 0.045, 4));
      const b = new THREE.BoxGeometry(PWD - 0.1, 0.07, 0.62); b.rotateX(-a); b.translate(0, s * PR * 0.86, c * PR * 0.86); W.add('cedar', b);
    }
    wheel.add(W.build('paddle')); root.add(wheel); spin.push({ o: wheel, axis: 'x', w: -1.3 });
  }

  // ---------------------------------------------------------------- the gilded funnel amidships, white steam
  const FZ = -1.2;
  { // smooth polished brass, dark iron bands, a flared crown with a dark throat, a wisp of white steam
    const r = 0.85, h = 7.6, rake = 0.1, at = (f) => [0, h * f, FZ + rake * h * f];
    MM.brassSmooth ||= new THREE.MeshStandardMaterial({ color: 0xe0b058, metalness: 0.45, roughness: 0.32 });
    P.add('brassSmooth', rod(at(0), at(1), r, r * 0.94, 20));
    for (const f of [0.08, 0.36, 0.64, 0.9]) P.add('iron', rod(at(f), at(f + 0.03), r * 1.05, r * 1.05, 20));
    for (const f of [0.36, 0.64]) for (let i = 0; i < 12; i++) { const q = i / 12 * TAU, c = at(f + 0.015); P.add('goldHammer', new THREE.SphereGeometry(0.05, 4, 3).translate(Math.sin(q) * r * 1.08, c[1], c[2] + Math.cos(q) * r * 1.08)); }
    const top = at(1);
    P.add('brassSmooth', new THREE.CylinderGeometry(r * 1.34, r * 0.94, 0.55, 20, 1, true).translate(top[0], top[1] + 0.27, top[2]));
    P.add('iron', new THREE.TorusGeometry(r * 1.34, 0.07, 5, 24).rotateX(Math.PI / 2).translate(top[0], top[1] + 0.55, top[2]));
    P.add('dark', new THREE.CircleGeometry(r * 1.3, 20).rotateX(-Math.PI / 2).translate(top[0], top[1] + 0.3, top[2]));
    fx.push(smoke([top[0], top[1] + 0.6, top[2]], 9, ['#ffffff', '#e4e8ee'], 4.2, 1.2));
  }
  P.add('paleSteel', new THREE.CylinderGeometry(1.15, 1.25, 0.5, 16).translate(0, 0.25, FZ));
  P.add('goldHammer', new THREE.TorusGeometry(1.18, 0.07, 4, 20).rotateX(Math.PI / 2).translate(0, 0.5, FZ));
  P.add('brass', rod([0.95, 0.4, FZ + 0.3], [0.95, 6.8, FZ + 1.0], 0.09, 0.09, 6));                  // steam pipe and whistle
  P.add('goldHammer', new THREE.CylinderGeometry(0.13, 0.16, 0.5, 8).translate(0.95, 7.0, FZ + 1.02));
  { const st = smoke([0.95, 7.3, FZ + 1.05], 4, ['#ffffff', '#e8ecf2'], 2.0, 0.55); fx.push(st); }
  for (const z of [2.2, -3.6]) {                                                                         // flush gratings
    P.add('blackwood', box(1.8, 0.03, 1.4, 0, 0.015, z));
    for (let i = -3; i <= 3; i++) P.add('paleSteel', box(0.04, 0.035, 1.4, i * 0.25, 0.02, z));
    P.add('goldHammer', new THREE.BoxGeometry(1.9, 0.04, 0.08).translate(0, 0.02, z - 0.72)); P.add('goldHammer', new THREE.BoxGeometry(1.9, 0.04, 0.08).translate(0, 0.02, z + 0.72));
  }

  // ---------------------------------------------------------------- masts, yards and sails: blue and cream, set and drawing
  const tex = {}; const T = (k) => tex[k] ||= sailTex(M, k);
  const RIGS = [
    { z: -6.4, y0: 0, h: 18.2, r: 0.4, tops: [[8.3, 1.2], [12.6, 0.75]], foot: 4.4, yards: [[8.0, 5.8], [12.4, 4.2], [15.4, 3.0], [17.2, 2.2]], kinds: ['cream', 'blue', 'cream', 'blue'] },
    { z: 4.4, y0: 0, h: 20, r: 0.44, tops: [[9.0, 1.3], [13.7, 0.8]], foot: 4.6, yards: [[8.7, 6.2], [13.5, 4.5], [16.8, 3.2], [18.8, 2.3]], kinds: ['creamStar', 'blueBell', 'cream', 'blue'] },
    { z: 13.55, y0: QD_H, h: 13.4, r: 0.3, tops: [[6.6, 0.85]], foot: null, yards: [[8.6, 3.4], [11.8, 2.6], [14.2, 1.9]], kinds: [null, 'blue', 'cream'] },
  ];
  const heads = [];
  for (const R of RIGS) {
    const top = mast(P, 0, R.y0, R.z, R.h, R.r, { mat: 'whitewood', band: 'paleSteel', tops: R.tops, cap: 'goldHammer' });
    heads.push(top);
    P.add('paleSteel', new THREE.CylinderGeometry(R.r * 1.6, R.r * 1.8, 0.3, 10).translate(0, R.y0 + 0.15, R.z));   // mast coat
    R.yards.forEach(([y, w], i) => {
      yard(P, 0, y, R.z, w, 0.13 - i * 0.015, 'whitewood');
      P.add('paleSteel', box(0.36, 0.2, 0.36, 0, y, R.z));
      const kind = R.kinds[i];
      const y0 = i === 0 ? R.foot : R.yards[i - 1][0] + 0.12, w0 = i === 0 ? w + 0.25 : R.yards[i - 1][1] - 0.2;
      if (kind && y0 != null) { const sl = texSail((m) => squareSail(m, { z: R.z - 0.3, y0, y1: y - 0.1, w0, w1: w - 0.2, belly: 0.9 + 0.3 * (i === 0), furl: i === 0 ? 0.62 : 0 }), T(kind)); root.add(sl.mesh); sails.push(sl);
        for (const sx of [-1, 1]) rig.push([sx * w, y, R.z], [sx * (beam(sAt(R.z + 5)) + 0.1), sheer(sAt(R.z + 5)) + 0.1, R.z + 5]);   // braces
        if (i === 0) for (const sx of [-1, 1]) rig.push([sx * w0, y0, R.z - 0.8], [sx * (inner(sAt(R.z + 2.2)) - 0.2), 1.0, R.z + 2.2]);     // course sheets
      }
      for (const sx of [-1, 1]) ratl.push([sx * w, y, R.z], [sx * w * 0.5, y - 0.35, R.z], [sx * w * 0.5, y - 0.35, R.z], [0, y - 0.05, R.z]);         // footropes
    });
    // shrouds with ratlines to the channels; topmast shrouds to the top
    const [ty, tw] = R.tops[0], s1 = sAt(R.z + 1.4);
    for (const side of [-1, 1]) {
      const cy = sheer(s1) - 0.12, cx = side * (beam(s1) + 0.38);
      const sh = shrouds([side * 0.4, R.y0 + ty, R.z], [cx, cy, R.z - 0.1], [cx, cy, R.z + 2.6], 5, 0.5);
      for (let i = 0; i < 10; i += 2) rig.push(sh[i], sh[i + 1]);
      for (let i = 10; i < sh.length; i++) ratl.push(sh[i]);
      if (R.tops[1]) { const [ty2, tw2] = R.tops[1]; const t2 = shrouds([side * 0.2, R.y0 + ty2, R.z], [side * tw, R.y0 + ty, R.z - 0.4], [side * tw, R.y0 + ty, R.z + 0.8], 3, 0.5);
        for (let i = 0; i < 6; i += 2) rig.push(t2[i], t2[i + 1]); for (let i = 6; i < t2.length; i++) ratl.push(t2[i]); }
      rig.push([side * 0.15, top[1] - 0.3, R.z], [side * (beam(sAt(R.z + 7)) + 0.3), sheer(sAt(R.z + 7)) - 0.1, R.z + 7]);   // backstays
    }
  }
  // fore-and-aft: the spanker on the mizzen, its boom out over the stern
  { const z = 13.55; P.add('whitewood', rod([0, QD_H + 1.4, z + 0.3], [0, QD_H + 1.6, ZS + 1.4], 0.12, 0.09, 6)); P.add('whitewood', rod([0, QD_H + 5.6, z + 0.3], [0, QD_H + 7.4, z + 5.0], 0.1, 0.08, 6));
    const sp = texSail((m) => triSail(m, [0, QD_H + 5.5, z + 0.45], [0, QD_H + 7.25, z + 4.9], [0, QD_H + 1.75, ZS + 1.2], 0.55, 1, [0, QD_H + 1.6, z + 0.45]), T('creamBand'));
    root.add(sp.mesh); sails.push(sp); rig.push([0, QD_H + 7.4, z + 5.0], [0, QD_H + 12.0, z]); }
  // stays between the masts, the forestay to the bell tower
  const TZ = -15.4, beaconY = 15.4;
  rig.push(heads[2], [0, 13.6, 4.4], [0, QD_H + 6.7, 13.55], [0, 1.0, 5.6], heads[1], [0, 12.6, -6.4], [0, 9.0, 4.4], [0, 1.0, -5.4], heads[0], [0, beaconY + 0.5, TZ]);
  rig.push([0, 8.3, -6.4], [0, 12.6, TZ + 1.5]);

  // ---------------------------------------------------------------- the bell tower on the forecastle: the gate, the belfry, the beacon
  const outline = (s0, s1, inset, y) => {
    const pts = [], n = 6;
    for (let i = 0; i <= n; i++) { const s = lerp(s0, s1, i / n); pts.push([Math.max(0.3, inner(s) - inset), y, zAt(s)]); }
    for (let i = n; i >= 0; i--) { const s = lerp(s0, s1, i / n); pts.push([-Math.max(0.3, inner(s) - inset), y, zAt(s)]); }
    return pts;
  };
  const BASE_H = 4.2, B0 = FC_H, B1 = FC_H + BASE_H;
  P.add('whitewood', slab(outline(TOWER[0], TOWER[1], 0.35, B1), BASE_H));
  P.add('goldHammer', slab(outline(TOWER[0] - 0.003, TOWER[1] + 0.003, 0.22, B1 + 0.16), 0.2));
  P.add('paleSteel', slab(outline(TOWER[0] - 0.002, TOWER[1] + 0.002, 0.28, B0 + 0.3), 0.3));
  for (const side of [-1, 1]) for (const s of [TOWER[0] + 0.004, (TOWER[0] + TOWER[1]) / 2, TOWER[1] - 0.004]) P.add('paleSteel', box(0.22, BASE_H, 0.22, side * (inner(s) - 0.35), (B0 + B1) / 2, zAt(s)));
  // warm lancets down the base's sides
  const lancet = (x, yb, z, w, h, rotY = 0, glass = 'holy') => {
    for (const [m, g] of [[glass, new THREE.ShapeGeometry(archShape(w, h * 0.72, h), 5).translate(0, 0, 0.02)], ['goldHammer', archFrame(w, h * 0.72, h, 0.08, 0.06)], ['paleSteel', box(0.05, h * 0.92, 0.05, 0, h * 0.46, 0.05)]]) { g.rotateY(rotY); g.translate(x, yb, z); P.add(m, g); }
  };
  for (const side of [-1, 1]) for (const f of [0.3, 0.7]) {
    const sa = lerp(TOWER[0], TOWER[1], f - 0.08), sb = lerp(TOWER[0], TOWER[1], f + 0.08), sc = (sa + sb) / 2;
    const dz = zAt(sb) - zAt(sa), dx = side * ((inner(sb) - inner(sa))), nx = side * -dz, nz = side * dx, l = Math.hypot(nx, nz);
    lancet(side * (inner(sc) - 0.35) + nx / l * 0.01, B0 + 1.3, zAt(sc) + nz / l * 0.01, 0.55, 1.7, Math.atan2(nx / l, nz / l));
  }
  // the shaft and its rose window
  const SH = 1.55, S0 = B1 + 0.2, S1 = S0 + 3.0;
  P.add('whitewood', box(SH * 2, S1 - S0, SH * 2, 0, (S0 + S1) / 2, TZ));
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) P.add('paleSteel', box(0.32, S1 - S0 + 0.3, 0.32, dx * SH, (S0 + S1) / 2, TZ + dz * SH));
  P.add('goldHammer', box(SH * 2 + 0.3, 0.18, SH * 2 + 0.3, 0, S1, TZ));
  for (const [rot, ox, oz] of [[0, 0, SH + 0.01], [Math.PI / 2, SH + 0.01, 0]]) {
    const y = (S0 + S1) / 2 + 0.1, at = (g) => g.rotateY(rot).translate(ox, y, TZ + oz);
    P.add('greenGlass', at(new THREE.CircleGeometry(0.85, 20)));
    P.add('goldHammer', at(new THREE.TorusGeometry(0.92, 0.1, 5, 24).translate(0, 0, 0.02)));
    P.add('goldHammer', at(new THREE.TorusGeometry(0.3, 0.06, 4, 16).translate(0, 0, 0.03)));
    for (let i = 0; i < 9; i++) P.add('goldHammer', at(box(0.06, 0.6, 0.04, 0, 0.6, 0).rotateZ(i * TAU / 9).translate(0, 0, 0.03)));
    glow.push({ x: ox, y, z: TZ + oz + (rot ? 0 : 0.2), r: 2.2, c: 0x46ff8a });
  }
  // the belfry: steel-clad piers, gilt arches, a balustrade, nine bells on oak headstocks
  const F0 = S1 + 0.1, F1 = F0 + 3.5, PS = SH + 0.05;
  P.add('paleSteel', box(SH * 2 + 0.2, 0.2, SH * 2 + 0.2, 0, F0, TZ));
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { P.add('whitewood', box(0.44, F1 - F0, 0.44, dx * PS, (F0 + F1) / 2, TZ + dz * PS)); P.add('paleSteel', box(0.5, 0.2, 0.5, dx * PS, F0 + 0.2, TZ + dz * PS)); }
  for (let f = 0; f < 4; f++) {
    const rot = f * Math.PI / 2, at = (g) => g.rotateY(rot).translate(0, 0, TZ);
    const arc = archFrame(PS * 2 - 0.44, 1.9, 2.95, 0.12, 0.12); arc.translate(0, F0 + 0.45, PS - 0.06); P.add('goldHammer', at(arc));
    P.add('whitewood', at(box(PS * 2 + 0.44, 0.45, 0.3, 0, F1 - 0.22, PS)));
    P.add('whitewood', at(new THREE.ShapeGeometry(Object.assign(new THREE.Shape([[-PS, 0], [PS, 0], [PS, 3.1], [-PS, 3.1]].map(([a, b]) => new THREE.Vector2(a, b))),
      { holes: [archShape(PS * 2 - 0.44, 1.9, 2.95)] }), 4).translate(0, F0 + 0.45, PS + 0.07)));
    P.add('goldHammer', at(box(PS * 2, 0.08, 0.14, 0, F0 + 0.62, PS)));
    for (let i = 1; i < 8; i++) P.add('paleSteel', at(box(0.06, 0.42, 0.06, -PS + i * PS / 4, F0 + 0.4, PS)));
  }
  const HY = F1 - 0.75;
  for (const dz of [-0.98, 0, 0.98]) P.add('blackwood', box(PS * 2, 0.2, 0.18, 0, HY + 0.12, TZ + dz));
  for (let ix = -1; ix <= 1; ix++) for (let iz = -1; iz <= 1; iz++) {
    const ninth = ix === 0 && iz === 0, r = ninth ? 0.62 : 0.34, h = ninth ? 1.2 : 0.7;
    const g = new THREE.Group(), B = new Parts(MM); g.position.set(ix * 0.98, HY, TZ + iz * 0.98);
    B.add(ninth ? 'ninthBell' : 'bellBronze', bellGeo(r, h));
    B.add('goldHammer', new THREE.TorusGeometry(r * 0.98, 0.035, 4, 16).rotateX(Math.PI / 2).translate(0, -h + 0.04, 0));
    B.add('blackwood', box(0.16, 0.16, r * 1.5, 0, 0.04, 0));
    B.add('iron', rod([0, -0.05, 0], [0, -h * 0.8, 0], 0.025, 0.025, 4)); B.add('iron', new THREE.SphereGeometry(r * 0.17, 6, 4).translate(0, -h * 0.85, 0));
    g.add(B.build(ninth ? 'ninthbell' : 'bell')); root.add(g);
    bells.push({ o: g, amp: ninth ? 0.18 : 0.06 + 0.04 * ((ix + iz + 2) % 3), w: ninth ? 1.1 : 1.6 + 0.37 * (ix * 3 + iz + 4), ph: (ix * 3 + iz) * 0.9 });
  }
  glow.push({ x: 0, y: HY - 0.7, z: TZ, r: 3.0, c: 0x7dffa0, light: true, lr: 6 });
  // the roof: a blue-steel spire with gilt hips, the green beacon on top
  const R0 = F1 + 0.05, RH = beaconY - R0 - 0.3;
  P.add('goldHammer', box(PS * 2 + 0.7, 0.18, PS * 2 + 0.7, 0, R0, TZ));
  P.add('blueSteel', new THREE.ConeGeometry((PS + 0.35) * Math.SQRT2, RH, 4, 1).rotateY(Math.PI / 4).translate(0, R0 + RH / 2 + 0.09, TZ));
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    P.add('goldHammer', rod([dx * (PS + 0.35), R0 + 0.1, TZ + dz * (PS + 0.35)], [0, R0 + RH + 0.05, TZ], 0.06, 0.05, 4));
    P.add('goldHammer', new THREE.SphereGeometry(0.13, 6, 4).translate(dx * (PS + 0.35), R0 + 0.22, TZ + dz * (PS + 0.35)));
  }
  for (const [rot] of [[0], [Math.PI / 2], [Math.PI], [-Math.PI / 2]]) {             // dormer louvres
    const g = (geo) => geo.translate(0, R0 + 0.9, PS * 0.62).rotateY(rot).translate(0, 0, TZ);
    P.add('whitewood', g(box(0.8, 0.9, 0.5, 0, 0, 0))); P.add('dark', g(box(0.56, 0.6, 0.06, 0, 0, 0.26)));
    for (let i = 0; i < 3; i++) P.add('paleSteel', g(box(0.6, 0.05, 0.08, 0, -0.2 + i * 0.2, 0.28)));
    P.add('blueSteel', g(new THREE.ConeGeometry(0.62, 0.42, 4, 1).rotateY(Math.PI / 4).scale(1, 1, 0.9).translate(0, 0.62, 0)));
  }
  P.add('paleSteel', rod([0, beaconY - 0.4, TZ], [0, beaconY + 0.4, TZ], 0.1, 0.08, 6));
  P.add('goldHammer', new THREE.CylinderGeometry(0.5, 0.26, 0.36, 12, 1, true).translate(0, beaconY + 0.55, TZ));
  P.add('goldHammer', new THREE.TorusGeometry(0.5, 0.05, 4, 16).rotateX(Math.PI / 2).translate(0, beaconY + 0.73, TZ));
  for (let i = 0; i < 6; i++) { const a = i * TAU / 6; P.add('goldHammer', rod([Math.cos(a) * 0.5, beaconY + 0.72, TZ + Math.sin(a) * 0.5], [Math.cos(a) * 0.62, beaconY + 1.5, TZ + Math.sin(a) * 0.62], 0.035, 0.03, 4));
    P.add('goldHammer', new THREE.ConeGeometry(0.06, 0.2, 4).translate(Math.cos(a) * 0.63, beaconY + 1.6, TZ + Math.sin(a) * 0.63)); }
  { const f = greenFire(MM, 0, beaconY + 0.6, TZ, 2.2); root.add(f); fires.push(f); }
  glow.push({ x: 0, y: beaconY + 1.4, z: TZ, r: 5.0, c: 0x46ff8a, light: true, lr: 12 });
  // lanterns on the base's roof corners, framing the gate
  for (const side of [-1, 1]) { const s = TOWER[0] + 0.006, x = side * (inner(s) - 0.65); P.add('paleSteel', box(0.3, 0.7, 0.3, x, B1 + 0.5, zAt(s))); glow.push(greenLantern(P, x, B1 + 0.85, zAt(s), 1.0)); }

  // ---------------------------------------------------------------- the arrival portal in the great door (the deck plan's GATE)
  const PW = GATE.w, PHS = GATE.hs, PH = GATE.h, gz = GATE.z;
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
        vec3 col = mix(vec3(0.02, 0.17, 0.08), vec3(0.27, 1.0, 0.52), s * 0.75 + s2 * 0.25);
        col = mix(col, vec3(1.0, 0.82, 0.34), core * 0.65 * (0.6 + 0.4 * s2));
        col = mix(col, vec3(1.0, 0.98, 0.86), pow(core, 3.0) * (0.85 + flash));
        col *= 0.95 + 0.1 * sin(t * 7.0) + flash * 1.4;
        gl_FragColor = vec4(col, 1.0);
      }` });
  const gate = new THREE.Mesh(new THREE.ShapeGeometry(archShape(PW, PHS, PH), 12), portalMat);
  gate.position.set(0, FC_H, gz); gate.name = 'portal'; root.add(gate);
  {
    const fr = new THREE.ExtrudeGeometry(Object.assign(archShape(PW + 0.7, PHS + 0.05, PH + 0.45), { holes: [archShape(PW, PHS, PH)] }),
      { depth: 0.4, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.05, bevelSegments: 1, curveSegments: 12 });
    P.add('goldHammer', fr.translate(0, FC_H, gz - 0.1));
    for (const sx of [-1, 1]) {
      P.add('paleSteel', box(0.4, PHS + 0.2, 0.45, sx * (PW / 2 + 0.55), FC_H + (PHS + 0.2) / 2, gz + 0.1));
      P.add('goldHammer', box(0.55, 0.16, 0.6, sx * (PW / 2 + 0.55), FC_H + PHS + 0.25, gz + 0.1));
      P.add('goldHammer', box(0.55, 0.16, 0.6, sx * (PW / 2 + 0.55), FC_H + 0.08, gz + 0.1));
    }
    // over the arch: a bronze bell under a gilt hood, nine studs round the archivolt
    P.add('bellBronze', bellGeo(0.32, 0.55).translate(0, FC_H + PH + 1.0, gz + 0.32));
    P.add('goldHammer', new THREE.ConeGeometry(0.5, 0.32, 4).rotateY(Math.PI / 4).scale(1, 1, 0.5).translate(0, FC_H + PH + 1.12, gz + 0.32));
    for (let i = 0; i < 9; i++) { const a = Math.PI * (0.08 + 0.84 * i / 8), rx = (PW / 2 + 0.25), ry = PH - PHS + 0.2;
      P.add(i === 4 ? 'greenGlass' : 'goldHammer', new THREE.SphereGeometry(0.09, 6, 4).translate(Math.cos(a) * rx, FC_H + PHS + Math.sin(a) * ry, gz + 0.33)); }
    P.add('paleSteel', box(PW + 0.5, 0.12, 0.6, 0, FC_H + 0.06, gz + 0.3));
    for (const sx of [-1, 1]) {                        // green-fire braziers (the deck plan's brazier fittings)
      const x = sx * (PW / 2 + 1.2), z = gz + 0.5;
      P.add('paleSteel', rod([x, FC_H, z], [x, FC_H + 0.9, z], 0.08, 0.06, 6));
      P.add('goldHammer', new THREE.CylinderGeometry(0.32, 0.18, 0.28, 10).translate(x, FC_H + 1.02, z));
      const f = greenFire(MM, x, FC_H + 1.12, z, 0.9); root.add(f); fires.push(f);
      glow.push({ x, y: FC_H + 1.4, z, r: 1.8, c: 0x46ff8a });
    }
    glow.push({ x: 0, y: FC_H + 1.4, z: gz + 0.3, r: 4.5, c: 0x7dffa0 });
  }
  const ring = new THREE.Group(); ring.position.set(0, FC_H + 0.03, gz + 0.8); root.add(ring);
  for (let i = 0; i < 9; i++) { const a = i * TAU / 9, b = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.03, 0.08), MM.greenFlame); b.position.set(Math.cos(a) * 0.6, 0, Math.sin(a) * 0.6); b.rotation.y = -a + Math.PI / 2; ring.add(b); }
  const portalLight = new THREE.PointLight(0x7dffa0, 16, 7, 1.6); portalLight.position.set(0, FC_H + 1.4, gz + 1.0); root.add(portalLight);
  const sparkTex = canvasTex(8, 8, (x) => { x.fillStyle = '#fff'; x.fillRect(2, 2, 4, 4); x.fillStyle = '#d0ffd8'; x.fillRect(3, 0, 2, 8); x.fillRect(0, 3, 8, 2); });
  const sparks = Array.from({ length: 30 }, (_, i) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: sparkTex, color: i % 3 ? 0x7dffa0 : 0xffd36a, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
    s.scale.setScalar(0.14); root.add(s); s.userData = { life: Math.random() * 2, max: 1 }; return s;
  });
  let flash = 0;
  const respawn = (s, burst) => {
    const a = Math.random() * TAU, r = Math.random() * 0.8;
    s.position.set(Math.cos(a) * r * 0.9, FC_H + 1.3 + Math.sin(a) * r * 1.2, gz + 0.05);
    s.userData = { life: 0, max: 0.8 + Math.random() * 1.2, v: new THREE.Vector3((Math.random() - 0.5) * (burst ? 3 : 0.8), (Math.random() - 0.2) * (burst ? 2.5 : 0.6), 0.5 + Math.random() * (burst ? 3.5 : 1.2)) };
  };

  // ---------------------------------------------------------------- the bow: knee, figurehead, bowsprit and jibs, catheads
  {
    const sh = new THREE.Shape([[19.85, -2.3], [20.6, -1.2], [21.3, 0.6], [21.9, 2.3], [22.1, 3.4], [21.3, 3.7], [19.85, 3.9]].map(([a, b]) => new THREE.Vector2(a, b)));
    const g = new THREE.ExtrudeGeometry(sh, { depth: 0.36, bevelEnabled: false }); g.translate(0, 0, -0.18); g.rotateY(Math.PI / 2);
    P.add('whitewood', g);
    for (const [a, b] of [[[0, -2.3, -19.9], [0, -1.2, -20.62]], [[0, -1.2, -20.62], [0, 0.6, -21.32]], [[0, 0.6, -21.32], [0, 2.3, -21.92]], [[0, 2.3, -21.92], [0, 3.4, -22.12]]]) P.add('goldHammer', rod(a, b, 0.1, 0.1, 5));
    for (const side of [-1, 1]) for (const y of [1.2, 2.6]) P.add('goldHammer', rod([side * 0.2, y, -20.1], [side * 0.2, y + 0.4, -21.2 - (y - 1.2) * 0.25], 0.05, 0.05, 4));   // trailboards
    // Tessariel: a gilded winged figure leaning out under the bowsprit, holding up a green flame
    const fz = -22.0, fy = 3.6;
    P.add('goldHammer', new THREE.CylinderGeometry(0.22, 0.4, 1.5, 8).rotateX(0.55).translate(0, fy + 0.3, fz - 0.25));
    P.add('goldHammer', new THREE.SphereGeometry(0.24, 10, 8).translate(0, fy + 1.2, fz - 0.7));
    P.add('goldHammer', new THREE.ConeGeometry(0.28, 0.5, 8).rotateX(Math.PI).translate(0, fy + 1.35, fz - 0.6));   // hood
    P.add('goldHammer', rod([0, fy + 0.85, fz - 0.6], [0, fy + 1.6, fz - 1.25], 0.07, 0.06, 5));
    P.add('paleSteel', box(0.2, 0.06, 0.2, 0, fy + 1.66, fz - 1.3));
    P.add('greenGlass', box(0.16, 0.24, 0.16, 0, fy + 1.82, fz - 1.3));
    glow.push({ x: 0, y: fy + 1.85, z: fz - 1.3, r: 1.6, c: 0x46ff8a });
    for (const side of [-1, 1]) {
      const R = [side * 0.25, fy + 0.8, fz - 0.4], T2 = [side * 1.9, fy + 1.4, fz + 1.9], pts = [], idx = [], n = 6;
      for (let i = 0; i <= n; i++) {
        const t = i / n, lead = R.map((r, j) => r + (T2[j] - r) * t + (j === 1 ? Math.sin(Math.PI * t) * 0.35 : 0));
        const drop = (1.3 - 0.8 * t) * (i % 2 ? 0.75 : 1);
        pts.push(lead, [lead[0] - side * 0.15 * drop, lead[1] - drop, lead[2] + 0.4 * drop]);
      }
      for (let i = 0; i < n; i++) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3, a, a + 1, a + 2, a + 1, a + 3, a + 2); }
      P.add('goldHammer', tris(pts, idx));
    }
    // bowsprit and jib-boom, the dolphin striker, the bobstays
    P.add('whitewood', rod([0, 3.7, -18.2], [0, 6.2, -25.2], 0.34, 0.24, 10));
    P.add('whitewood', rod([0, 5.85, -23.8], [0, 7.1, -28.4], 0.17, 0.11, 8));
    for (const t of [0.35, 0.7, 0.98]) P.add('paleSteel', new THREE.CylinderGeometry(0.31 - t * 0.08, 0.31 - t * 0.08, 0.14, 10).rotateX(Math.PI / 2 - 0.34).translate(0, 3.7 + 2.5 * t, -18.2 - 7.0 * t));
    P.add('paleSteel', box(0.5, 0.5, 0.36, 0, 6.15, -25.05));
    P.add('paleSteel', rod([0, 5.9, -25.0], [0, 3.9, -25.1], 0.06, 0.05, 5));
    rig.push([0, 3.9, -25.1], [0, 7.05, -28.3], [0, 3.9, -25.1], [0, -0.8, -20.6], [0, 6.0, -25.1], [0, -1.6, -20.3]);
    // stays from the tower to the jib-boom; the jibs on them
    const st1a = [0, beaconY + 0.2, TZ - 0.3], st1b = [0, 7.05, -28.3], st2a = [0, R0 + 0.3, TZ - 1.9], st2b = [0, 6.15, -25.2];
    rig.push(st1a, st1b, st2a, st2b);
    const on = (a, b, t) => a.map((v, i) => lerp(v, b[i], t));
    const j1 = texSail((m) => triSail(m, on(st1a, st1b, 0.94), on(st1a, st1b, 0.2), [0, 5.7, -21.4], 0.5, 1), T('cream'));
    const j2 = texSail((m) => triSail(m, on(st2a, st2b, 0.92), on(st2a, st2b, 0.18), [0, 5.0, -19.6], 0.45, 1), T('blue'));
    root.add(j1.mesh, j2.mesh); sails.push(j1, j2);
    // catheads and catted anchors
    for (const side of [-1, 1]) {
      const z = -17.0, s = sAt(z), y = sheer(s) + 0.08;
      P.add('whitewood', box(1.5, 0.3, 0.3, side * (beam(s) + 0.35), y, z, 0));
      P.add('goldHammer', new THREE.CircleGeometry(0.15, 8).rotateY(side * Math.PI / 2).translate(side * (beam(s) + 1.11), y, z));
      anchor(P, side * (beam(s) + 0.85), y - 0.25, z + 0.15, 1.05, side * 0.25, 'paleSteel');
      P.add('dark', new THREE.CircleGeometry(0.2, 8).rotateY(side * Math.PI / 2 - side * 0.5).translate(side * (hx(sAt(-18.4), 1.8) + 0.02), 1.8, -18.4));  // hawse
    }
  }

  // ---------------------------------------------------------------- the stern: gallery windows, the name, stern lanterns, quarter galleries
  {
    const z = ZS + 0.02;
    for (let i = 0; i < 5; i++) {
      const x = (i - 2) * 1.25;
      P.add('holy', box(0.8, 1.15, 0.04, x, 0.95, z));
      P.add('goldHammer', box(0.95, 0.1, 0.1, x, 1.58, z + 0.03)); P.add('goldHammer', box(0.95, 0.1, 0.1, x, 0.33, z + 0.03));
      for (const dx of [-0.45, 0.45]) P.add('paleSteel', box(0.1, 1.35, 0.1, x + dx, 0.95, z + 0.04));
      P.add('paleSteel', box(0.04, 1.15, 0.06, x, 0.95, z + 0.04)); P.add('paleSteel', box(0.8, 0.04, 0.06, x, 0.95, z + 0.04));
    }
    P.add('whitewood', box(beam(0) * 2 - 0.4, 0.22, 0.6, 0, 0.18, z + 0.28));            // stern walk
    for (let x = -5; x <= 5.01; x += 0.5) P.add('goldHammer', box(0.06, 0.5, 0.06, x, 0.52, z + 0.55));
    P.add('goldHammer', box(beam(0) * 2 - 0.4, 0.08, 0.1, 0, 0.8, z + 0.55));
    for (const s of [-1, 1]) glow.push({ x: s * 2.5, y: 0.95, z: z + 0.4, r: 2.0, c: 0xffd36a });
    const name = canvasTex(160, 24, (x) => {
      x.font = 'bold 20px Georgia, serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillStyle = '#2a1a08'; for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [1, 1]]) x.fillText('DAWNWAKE', 80 + dx, 13 + dy);
      x.fillStyle = '#f0c858'; x.fillText('DAWNWAKE', 80, 13);
    });
    const nm = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 0.7), new THREE.MeshStandardMaterial({ map: name, transparent: true, alphaTest: 0.4, roughness: 0.5, metalness: 0.3 }));
    nm.position.set(0, 2.45, z + 0.03); root.add(nm);
    P.add('hullPaintBlue', box(5.2, 0.86, 0.04, 0, 2.45, z + 0.005));
    for (const sx of [-1, 1]) {                                                            // stern lanterns on the taffrail
      const x = sx * 2.9, y = sheer(0) + 0.2;
      P.add('paleSteel', rod([x, y - 0.6, ZS + 0.05], [x, y + 0.6, ZS + 0.5], 0.06, 0.06, 5));
      P.add('goldHammer', new THREE.CylinderGeometry(0.28, 0.2, 0.2, 8).translate(x, y + 0.65, ZS + 0.5));
      P.add('greenGlass', new THREE.CylinderGeometry(0.24, 0.2, 0.55, 8).translate(x, y + 1.02, ZS + 0.5));
      P.add('goldHammer', new THREE.ConeGeometry(0.3, 0.45, 8).translate(x, y + 1.5, ZS + 0.5));
      glow.push({ x, y: y + 1.0, z: ZS + 0.5, r: 2.2, c: 0x46ff8a });
    }
    for (const side of [-1, 1]) {                                                         // quarter galleries
      const zc = zAt(0.06), x = side * (beam(0.06) + 0.25);
      P.add('whitewood', box(0.55, 1.8, 2.2, x, 1.0, zc));
      P.add('holy', box(0.05, 0.9, 1.6, x + side * 0.28, 1.0, zc));
      for (const dz of [-0.55, 0, 0.55]) P.add('paleSteel', box(0.06, 1.0, 0.07, x + side * 0.3, 1.0, zc + dz));
      P.add('goldHammer', box(0.7, 0.14, 2.4, x, 1.95, zc)); P.add('goldHammer', box(0.7, 0.14, 2.4, x, 0.05, zc));
      P.add('blueSteel', new THREE.ConeGeometry(0.5, 0.6, 4).rotateY(Math.PI / 4).scale(1, 1, 2.4).translate(x - side * 0.05, 2.3, zc));
    }
  }
  // ensign: the Lampwardens' blue with the Ninth Bell
  P.add('paleSteel', rod([0, sheer(0) + 0.1, ZS - 0.2], [0, sheer(0) + 5.0, ZS + 0.4], 0.08, 0.06, 6));
  P.add('goldHammer', new THREE.SphereGeometry(0.16, 6, 4).translate(0, sheer(0) + 5.1, ZS + 0.41));
  const ensMat = ensignMat(MM);
  const ensign = flag(ensMat, 3.4, 2.2, [0, sheer(0) + 4.95, ZS + 0.4], 0.3, 'ensign'); flags.push(ensign);
  const pen = flag(MM.flagBlue, 4.6, 0.6, [0, 20.4, 4.4], 0.12, 'pennant'); flags.push(pen);
  const pen2 = flag(MM.flagCream, 3.4, 0.5, [0, 18.5, -6.4], 0.1, 'pennant'); flags.push(pen2);
  root.add(ensign.mesh, pen.mesh, pen2.mesh);

  // ---------------------------------------------------------------- the quarterdeck: helm, binnacle, pivot guns (the deck plan's turrets)
  let wheel;
  {
    const z = zAt(0.14), y = QD_H;
    P.add('whitewood', box(0.5, 1.1, 0.5, 0, y + 0.55, z));
    wheel = new THREE.Group(); const W = new Parts(MM); wheel.position.set(0, y + 1.25, z - 0.32);
    W.add('cedar', new THREE.TorusGeometry(0.66, 0.07, 6, 20));
    for (let i = 0; i < 9; i++) { const a = i * TAU / 9; W.add('goldHammer', rod([0, 0, 0], [Math.cos(a) * 0.88, Math.sin(a) * 0.88, 0], 0.04, 0.035, 5)); }
    W.add('goldHammer', new THREE.CylinderGeometry(0.15, 0.15, 0.2, 10).rotateX(Math.PI / 2));
    wheel.add(W.build('wheel')); root.add(wheel);
    P.add('brass', new THREE.CylinderGeometry(0.28, 0.34, 1.0, 10).translate(0, y + 0.5, z + 1.1));
    P.add('greenGlass', new THREE.SphereGeometry(0.26, 10, 6, 0, TAU, 0, Math.PI / 2).translate(0, y + 1.0, z + 1.1));
  }
  for (const side of [-1, 1]) {
    const x = side * (inner(0.06) - 1.2), z = zAt(0.06);
    P.add('paleSteel', new THREE.CylinderGeometry(0.9, 1.05, 0.3, 16).translate(x, QD_H + 0.15, z));
    P.add('goldHammer', new THREE.TorusGeometry(0.98, 0.06, 4, 18).rotateX(Math.PI / 2).translate(x, QD_H + 0.3, z));
    const g = new THREE.Group(), G = new Parts(MM); g.position.set(x, QD_H + 0.3, z);
    G.add('whitewood', box(1.0, 0.45, 1.5, 0, 0.25, 0.1)); G.add('paleSteel', box(1.06, 0.08, 1.56, 0, 0.5, 0.1));
    for (const dx of [-0.42, 0.42]) G.add('paleSteel', box(0.12, 0.55, 0.9, dx, 0.7, 0));
    G.add('paleSteel', rod([0, 0.85, 0.75], [0, 0.95, -1.9], 0.24, 0.17, 12)); G.add('goldHammer', rod([0, 0.95, -1.75], [0, 0.96, -1.95], 0.21, 0.21, 12));
    G.add('paleSteel', new THREE.SphereGeometry(0.22, 8, 6).translate(0, 0.85, 0.8)); G.add('goldHammer', rod([-0.5, 0.82, 0], [0.5, 0.82, 0], 0.07, 0.07, 6));
    g.add(G.build('pivotgun')); root.add(g); guns.push({ o: g, base: side > 0 ? -0.7 : 0.7, ph: side });
  }

  // ---------------------------------------------------------------- the boats on the port side, Brother Tolland's diving bell on the port quarter
  for (const [z, l] of [[8.6, 4.4], [-8.4, 4.0]]) {
    const s = sAt(z), x = -(beam(s) + 1.0);
    davits(P, -(beam(s) - 0.15), sheer(s) + 0.1, z, -1, l, 3.0);
    dinghy(P, x, sheer(s) + 0.9, z, l, 0.78, { mat: 'whitewood', inner: 'cedar', rim: 'goldHammer' });
    for (const dz of [-l * 0.38, l * 0.38]) rig.push([-(beam(s) - 0.15) - 0.6, sheer(s) + 3.1, z + dz], [x, sheer(s) + 1.0, z + dz]);
  }
  let diveBell;
  {
    const z = 18.4, x0 = -(inner(sAt(z)) - 0.55), y0 = QD_H, ax = -(beam(sAt(z)) + 1.4), ay = QD_H + 3.6;
    P.add('paleSteel', new THREE.CylinderGeometry(0.28, 0.36, 0.3, 10).translate(x0, y0 + 0.15, z));
    P.add('paleSteel', rod([x0, y0, z], [x0, y0 + 3.0, z], 0.16, 0.13, 8));
    P.add('paleSteel', rod([x0, y0 + 2.8, z], [ax, ay, z], 0.12, 0.09, 6));
    P.add('paleSteel', rod([x0, y0 + 0.9, z], [ax + 0.7, ay - 0.3, z], 0.07, 0.07, 5));
    P.add('goldHammer', new THREE.CylinderGeometry(0.22, 0.22, 0.32, 10).rotateX(Math.PI / 2).translate(x0, y0 + 1.1, z));   // winch drum
    P.add('goldHammer', new THREE.SphereGeometry(0.14, 6, 4).translate(ax, ay, z));
    diveBell = divingBell(MM, 0.95); diveBell.position.set(ax, ay - 1.2, z); root.add(diveBell);
    rig.push([ax, ay, z], [ax, ay - 1.0, z], [x0, y0 + 1.1, z], [ax, ay, z]);
    for (let i = 0; i < 9; i++) { const a = i * 0.7; rig.push([x0 + 0.3 + Math.cos(a) * 0.3, y0 + 0.1, z + 0.6 + Math.sin(a) * 0.3], [x0 + 0.3 + Math.cos(a + 0.7) * 0.3, y0 + 0.1, z + 0.6 + Math.sin(a + 0.7) * 0.3]); }   // air hose coil
  }

  // ---------------------------------------------------------------- build
  root.add(P.build('dawnwake'));
  root.add(lines(rig, M.rope, 'rigging'), lines(ratl, M.ropeLight, 'ratlines'));
  for (const f of fx) if (f.grp) root.add(f.grp);
  root.traverse((o) => { if (o.isMesh && o.name !== 'portal' && o.material !== MM.flameAdd) { o.castShadow = true; o.receiveShadow = true; } });

  function anim(t, dt) {
    for (const s of sails) s.update(t);
    for (const f of flags) f.update(t);
    for (const f of fx) f.update(t);
    for (const s of spin) s.o.rotation[s.axis] += s.w * dt;
    fires.forEach((f, i) => f.userData.update(t, i));
    for (const b of bells) b.o.rotation.x = Math.sin(t * b.w + b.ph) * b.amp;
    for (const g of guns) g.o.rotation.y = g.base + Math.sin(t * 0.3 + g.ph) * 0.5;
    diveBell.rotation.z = Math.sin(t * 0.9) * 0.05; diveBell.rotation.y = Math.sin(t * 0.37) * 0.3;
    wheel.rotation.z = Math.sin(t * 0.4) * 0.5;
    flash = Math.max(0, flash - dt * 1.2);
    portalMat.uniforms.t.value = t; portalMat.uniforms.flash.value = flash;
    ring.rotation.y = t * 0.8; ring.scale.setScalar(1 + flash * 0.6);
    portalLight.intensity = 14 + 4 * Math.sin(t * 6) + flash * 60;
    for (const s of sparks) {
      const u = s.userData; u.life += dt;
      if (u.life > u.max) respawn(s, false);
      if (!u.v) continue;
      u.v.y -= dt * 1.2; s.position.addScaledVector(u.v, dt);
      s.material.opacity = Math.sin(Math.PI * Math.min(1, u.life / u.max));
    }
  }
  const arrive = () => { flash = 1.3; for (const s of sparks) { respawn(s, true); s.userData.life = Math.random() * 0.2; } };
  const info = {
    length: L + 8.4, beam: 2 * beam(0.5), waterline: WL, hl: 19.7, hb: 6.1, glow,
    crew: [[-2.8, 0, 1.5, 'hero'], [2.9, 0, -3.0, 'hero'], [0.4, 0, 6.6, 'hero'], [-3.4, 0, -6.2, 'hero'], [3.6, 0, 4.0, 'hero'], [0, FC_H, LANDING[1] + 0.2, 'hero'], [2.6, QD_H, 15.2, 'hero']],
    mainDeck: { z0: fFoot, z1: qFoot, width: 2 * inner(0.5) }, walk: DAWNWAKE,
    portal: { gate: [0, FC_H, gz], path: [[0, FC_H, gz + 0.1], [0, FC_H, zf + 0.15], [0, 0, fFoot + 0.2], [0, 0, fFoot + 2.6]] },
    // centreline pieces on the walkable main deck the ironclad's walk map does not block: [x0, z0, x1, z1]
    fittings: [...FITTINGS, [-0.5, -6.9, 0.5, -5.9], [-0.5, 3.9, 0.5, 4.9], [-1.25, FZ - 1.25, 1.25, FZ + 1.25]],
    divingBell: [-(beam(sAt(18.4)) + 1.4), QD_H + 2.4, 18.4],
    // the bell itself (a scenario lowers it: game/seascen/ninth_bell.js) and its davit's foot on the quarterdeck
    bell: diveBell, davit: [-(inner(sAt(18.4)) - 0.55), QD_H, 18.4],
  };
  return { root, anim, info, arrive };
}
