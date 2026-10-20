// Castle masonry (docs/CASTLE_OVERWORLD.md): the faces of the Castle's height-mapped curtain walls, towers, stairs,
// halls and bridges, painted with the user's castle artwork (assets/source/biomes/VELSCOUR_Castle_Artwork_Complete.zip,
// cut by tools/castleramparts.py). terrain.js asks drawCastleFace for every column face whose tile has a style in
// map.faceArt; the textures are level (unsheared) in the atlas and sheared back onto each face here, anchored in world
// space so the courses run on unbroken from one tile to the next.
import { castleRamparts } from './castle.js';
import { makeCanvas } from '../core/util.js';

// map.faceArt styles (written by world/castleworld.js)
export const FACE = Object.freeze({ wall: 1, warm: 2, bridge: 3, moat: 4, earth: 5, tower: 6 });

let tex = null;
function textures() {
  const R = castleRamparts();
  if (!R || !R.img || !R.img.complete || !R.img.naturalWidth) return null;
  if (tex && tex.src === R) return tex;
  // a region of the atlas on its own canvas (patterns need a whole image), multiplied by `mul` for the shaded side
  const cut = (k, mul = null) => {
    const [x, y, w, h] = R.rects[k], c = makeCanvas(w, h), g = c.getContext('2d');
    g.drawImage(R.img, x, y, w, h, 0, 0, w, h);
    if (mul) {
      g.globalCompositeOperation = 'multiply'; g.fillStyle = mul; g.fillRect(0, 0, w, h);
      g.globalCompositeOperation = 'destination-in'; g.drawImage(R.img, x, y, w, h, 0, 0, w, h);
    }
    return c;
  };
  const SHADE = 'rgb(140,150,172)', WSHADE = 'rgb(170,156,140)';
  tex = {
    src: R, wallL: cut('face'), wallD: cut('face', SHADE), warmL: cut('warm'), warmD: cut('warm', WSHADE),
    corbelL: cut('corbel'), corbelD: cut('corbel', SHADE), plinthL: cut('plinth'), plinthD: cut('plinth', SHADE),
    slit: cut('slit'), archL: cut('arch'), archD: cut('arch', SHADE),
  };
  return tex;
}

const pats = new WeakMap();
function patOf(ctx, c) {
  let m = pats.get(ctx);
  if (!m) pats.set(ctx, (m = new Map()));
  let p = m.get(c);
  if (!p) m.set(c, (p = ctx.createPattern(c, 'repeat')));
  return p;
}
const hash = (i, s) => { let h = Math.imul(i ^ 0x5bd1e995, 0x27d4eb2d) ^ s; h = Math.imul(h ^ (h >>> 15), 0x85ebca6b); return (h ^ (h >>> 13)) >>> 0; };

function quad(ctx, x0, y0, dx, dy, a, b) {
  ctx.beginPath();
  ctx.moveTo(x0, y0 + a); ctx.lineTo(x0 + dx, y0 + dy + a); ctx.lineTo(x0 + dx, y0 + dy + b); ctx.lineTo(x0, y0 + b); ctx.closePath();
}
// A horizontal band of texture `c` across the face, its top `a` px below the face's top edge, anchored in world space.
function band(ctx, c, x0, y0, dx, dy, a, D) {
  const s = dy / dx, h = Math.min(c.height, D - a);
  if (h <= 0) return;
  const p = patOf(ctx, c);
  p.setTransform(new DOMMatrix([1, s, 0, 1, 0, y0 + a - s * x0]));
  quad(ctx, x0, y0, dx, dy, Math.max(0, a), a + h);
  ctx.fillStyle = p; ctx.fill();
}

/**
 * One face of column i: x0,y0 its top-left corner, dx,dy the run of its top edge (SW face: +HW,+HH; SE: +HW,-HH),
 * `depth` levels tall (HS px each) under a top `top` levels up. Returns false while the art is still loading.
 */
export function drawCastleFace(ctx, map, i, x0, y0, dx, dy, depth, dark, top, HS) {
  const T = textures();
  if (!T || map.faceArt[i] === FACE.earth) return false;   // earth banks: terrain.js draws them
  const style = map.faceArt[i], D = depth * HS, s = dy / dx, foot = top - depth;
  const arch = style === FACE.bridge ? map.faceArch?.[i] : 0;
  if (arch) {
    // a bridge arch spanning `span` tiles of the bridge's side; this tile shows slice k of it
    const k = (arch - 1) & 15, span = (arch - 1) >> 4, c = dark ? T.archD : T.archL, sw = c.width / span;
    ctx.save();
    ctx.transform(1, s, 0, 1, x0, y0);
    ctx.drawImage(c, k * sw, 0, sw, c.height, -0.3, 0, dx + 0.6, D);
    ctx.restore();
  } else {
    const c = style === FACE.warm ? (dark ? T.warmD : T.warmL) : (dark ? T.wallD : T.wallL), p = patOf(ctx, c);
    // courses at fixed heights above the ground plane (v = -z), so they run level round corners and from a merlon to
    // the wall under it; joints at fixed world x
    p.setTransform(new DOMMatrix([1, s, 0, 1, 0, y0 - s * x0 + top * HS]));
    quad(ctx, x0, y0, dx, dy, 0, D);
    ctx.fillStyle = p; ctx.fill();
  }
  // the towers' corbel band under their battlements, and an arrow slit on some faces
  const bl = map.faceBand?.[i] || 0;
  if (style === FACE.tower && bl && bl <= top && bl > foot) {
    const a = (top - bl) * HS;
    band(ctx, dark ? T.corbelD : T.corbelL, x0, y0, dx, dy, a, D);
    if (D - a > 70 && hash(i, dark ? 7 : 3) % 3 === 0) {
      const w = 13, h = 27, u = dx * 0.5 - w / 2, v = a + 30;
      ctx.save(); ctx.transform(1, s, 0, 1, x0, y0); ctx.globalAlpha = dark ? 0.8 : 1;
      ctx.drawImage(T.slit, u, v, w, h); ctx.restore();
    }
  } else if (style === FACE.wall && bl && bl <= top && bl > foot) {
    // the curtain's string course at the wall-walk: a thin ledge with its shadow under it
    const a = (top - bl) * HS;
    quad(ctx, x0, y0, dx, dy, a, a + 2); ctx.fillStyle = dark ? 'rgba(170,180,200,0.35)' : 'rgba(215,225,240,0.45)'; ctx.fill();
    quad(ctx, x0, y0, dx, dy, a + 2, a + 5); ctx.fillStyle = 'rgba(6,8,14,0.35)'; ctx.fill();
  }
  // weathering, a little different on every tile: rain streaks running down from the coping, moss and damp at the foot
  if (!arch && D >= 24) {
    const h = hash(i, dark ? 11 : 5), n = h % 3;
    for (let k = 0; k < n; k++) {
      const hk = hash(i, 17 + k * 7 + (dark ? 3 : 0)), u = 0.12 + (hk % 76) / 100, wd = 2 + (hk >>> 8) % 4, len = D * (0.25 + ((hk >>> 12) % 60) / 100);
      const x = x0 + dx * u, y = y0 + dy * u;
      const g = ctx.createLinearGradient(0, y, 0, y + len);
      g.addColorStop(0, 'rgba(10,14,12,0.22)'); g.addColorStop(1, 'rgba(10,14,12,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + wd, y + s * wd); ctx.lineTo(x + wd, y + s * wd + len); ctx.lineTo(x, y + len); ctx.closePath(); ctx.fill();
    }
    if (foot <= 0 && style !== FACE.warm && (h >>> 4) % 3) {
      const mh = 6 + ((h >>> 9) % 10);
      quad(ctx, x0, y0, dx, dy, D - mh - 10, D - 8);
      const g = ctx.createLinearGradient(0, y0 + D - mh - 10 + Math.min(0, dy), 0, y0 + D + Math.max(0, dy));
      g.addColorStop(0, 'rgba(40,62,30,0)'); g.addColorStop(1, 'rgba(40,62,30,0.32)');
      ctx.fillStyle = g; ctx.fill();
    }
  }
  // a battered plinth where a wall stands on the ground (or rises from the moat)
  if (foot <= 0 && D >= 36 && style !== FACE.bridge) band(ctx, style === FACE.warm ? (dark ? T.warmD : T.warmL) : (dark ? T.plinthD : T.plinthL), x0, y0, dx, dy, D - 12, D);
  // shading: darker toward the foot; the moat's revetment wet and green at the waterline
  quad(ctx, x0, y0, dx, dy, 0, D);
  const g = ctx.createLinearGradient(0, y0 + Math.min(0, dy), 0, y0 + D + Math.max(0, dy));
  if (style === FACE.moat || (style === FACE.bridge && foot < 0)) {
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.55, 'rgba(10,22,18,0.18)'); g.addColorStop(0.85, 'rgba(22,48,30,0.5)'); g.addColorStop(1, 'rgba(8,20,22,0.75)');
  } else { g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.7, 'rgba(4,6,12,0.08)'); g.addColorStop(1, 'rgba(4,6,12,0.32)'); }
  ctx.fillStyle = g; ctx.fill();
  // the coping: a lit edge along the top, a dark seam at the foot
  ctx.lineWidth = 1;
  ctx.strokeStyle = dark ? 'rgba(170,182,205,0.4)' : 'rgba(225,232,245,0.55)';
  ctx.beginPath(); ctx.moveTo(x0, y0 + 0.5); ctx.lineTo(x0 + dx, y0 + dy + 0.5); ctx.stroke();
  ctx.strokeStyle = 'rgba(5,6,10,0.45)';
  ctx.beginPath(); ctx.moveTo(x0, y0 + D - 0.5); ctx.lineTo(x0 + dx, y0 + dy + D - 0.5); ctx.stroke();
  return true;
}

// ------------------------------------------------------------------ arched spans
// The lintel over a gate passage or a hall's doorway: a block of masonry `L` tiles across the opening and `T` deep,
// from the arch up to `zt` world px, its front face cut by a round arch springing at `zs` px and rising to `zc` px at
// the crown, ringed with voussoirs; the gates add a raised portcullis's teeth under the crown and merlons on top.
// axis 'x': the span runs along x and its face looks down +y (a SW face); 'y': mirrored, the face looks down +x.
// The canvas is drawn on first use (generation stays canvas-free under Node); pivot: the face's ground point at u = 0.
const spanCache = new Map();
export function castleSpan({ L, T = 1, zs, zc, zt, axis = 'x', warm = false, portcullis = false, merlons = false, top: topTile = null }) {
  const HWp = 32, HHp = 16, top = zt + (merlons ? 18 : 0);
  const w = Math.ceil((L + T) * HWp) + 2, h = Math.ceil(top + T * HHp + L * HHp - zs + 4);
  const key = [L, T, zs, zc, zt, axis, warm, portcullis, merlons, topTile?.name].join('|');
  const spr = { sx: 0, sy: 0, w, h, ox: axis === 'x' ? -1 : -(w - 1), oy: -(top + T * HHp + 1), name: 'castle_span_' + key, castle: true, lazy: true };
  Object.defineProperty(spr, 'img', { enumerable: true, get() {
    if (typeof document === 'undefined') return null;
    let c = spanCache.get(key);
    if (c) return c;
    const T_ = textures();
    if (!T_) return null;
    c = makeCanvas(w, h);
    const g = c.getContext('2d'), dark = axis === 'y';
    if (dark) { g.translate(w, 0); g.scale(-1, 1); }
    g.translate(1, top + T * HHp + 1);   // origin: the face's ground point at u = 0
    // tile point (u, v) at height z -> canvas, v = T on the face
    const P = (u, v, z) => [(u - (v - T)) * HWp, (u + (v - T)) * HHp - z];
    const face = warm ? (dark ? T_.warmD : T_.warmL) : (dark ? T_.wallD : T_.wallL);
    const arch = (s) => { const t = (s - L / 2) / (L / 2); return zs + (zc - zs) * Math.sqrt(Math.max(0, 1 - t * t)); };
    const N = 24;
    // the front face, above the arch
    g.beginPath();
    g.moveTo(...P(0, T, zt)); g.lineTo(...P(L, T, zt));
    for (let k = N; k >= 0; k--) { const s = (k / N) * L; g.lineTo(...P(s, T, arch(s))); }
    g.closePath();
    const p = g.createPattern(face, 'repeat'); p.setTransform(new DOMMatrix([1, 0.5, 0, 1, 0, 0]));
    g.fillStyle = p; g.fill();
    g.fillStyle = 'rgba(4,6,12,0.12)'; g.fill();
    // voussoirs: a lighter ring of wedge stones round the arch
    const ring = 9;
    for (let k = 0; k < 11; k++) {
      const s0 = (k / 11) * L, s1 = ((k + 1) / 11) * L;
      g.beginPath();
      g.moveTo(...P(s0, T, arch(s0))); g.lineTo(...P(s1, T, arch(s1)));
      g.lineTo(...P(s1, T, arch(s1) + ring)); g.lineTo(...P(s0, T, arch(s0) + ring)); g.closePath();
      g.fillStyle = k % 2 ? 'rgba(200,210,226,0.16)' : 'rgba(150,162,184,0.12)'; g.fill();
      g.strokeStyle = 'rgba(8,10,16,0.55)'; g.lineWidth = 1; g.stroke();
    }
    // the arch's edge in shadow (the thickness of the wall), and the keystone
    g.beginPath();
    for (let k = 0; k <= N; k++) { const s = (k / N) * L; const [x, y] = P(s, T, arch(s)); k ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.strokeStyle = 'rgba(2,3,6,0.85)'; g.lineWidth = 2; g.stroke();
    { const s = L / 2, a = arch(s); g.beginPath(); g.moveTo(...P(s - 0.18, T, a)); g.lineTo(...P(s + 0.18, T, a)); g.lineTo(...P(s + 0.24, T, a + ring + 3)); g.lineTo(...P(s - 0.24, T, a + ring + 3)); g.closePath();
      g.fillStyle = 'rgba(214,222,236,0.35)'; g.fill(); g.strokeStyle = 'rgba(8,10,16,0.6)'; g.lineWidth = 1; g.stroke(); }
    if (portcullis) {
      // the raised portcullis: its iron grid in the top of the opening, teeth hanging below
      g.strokeStyle = 'rgba(22,22,26,0.95)'; g.lineWidth = 2.2;
      const bars = Math.round(L * 3);
      for (let k = 1; k < bars; k++) {
        const s = (k / bars) * L, a = arch(s), z1 = Math.max(zs - 2, zc - 26);
        if (a <= z1) continue;
        g.beginPath(); g.moveTo(...P(s, T, a)); g.lineTo(...P(s, T, z1)); g.stroke();
        const [x, y] = P(s, T, z1); g.fillStyle = '#1a1a1e'; g.beginPath(); g.moveTo(x - 2, y); g.lineTo(x + 2, y + 1); g.lineTo(x, y + 6); g.closePath(); g.fill();
      }
      for (const z of [zc - 6, zc - 16]) {
        g.beginPath(); let on = false;
        for (let k = 0; k <= N; k++) { const s = (k / N) * L; if (arch(s) < z + 1) { on = false; continue; } const [x, y] = P(s, T, z); on ? g.lineTo(x, y) : g.moveTo(x, y); on = true; }
        g.lineWidth = 1.6; g.stroke();
      }
    }
    // the top: flagstones, a lit front lip
    g.beginPath(); g.moveTo(...P(0, 0, zt)); g.lineTo(...P(L, 0, zt)); g.lineTo(...P(L, T, zt)); g.lineTo(...P(0, T, zt)); g.closePath();
    const R = castleRamparts(), tf = topTile || { img: R.img, sx: R.rects.top_2[0], sy: R.rects.top_2[1], w: R.rects.top_2[2], h: R.rects.top_2[3] };
    g.save(); g.clip(); for (let u = -1; u < L + 1; u++) for (let v = -1; v <= T; v++) { const [x, y] = P(u, v, zt); g.drawImage(tf.img, tf.sx, tf.sy, tf.w, tf.h, x - HWp - 0.6, y - 0.6, 2 * HWp + 1.2, 2 * HHp + 1.2); } g.restore();
    g.strokeStyle = 'rgba(230,236,248,0.55)'; g.lineWidth = 1; g.beginPath(); g.moveTo(...P(0, T, zt)); g.lineTo(...P(L, T, zt)); g.stroke();
    if (merlons) {
      // a short battlement between the gate towers
      for (let s = 0.15; s < L - 0.3; s += 1) {
        const a = s, b = s + 0.55, v0 = T - 0.5, z0 = zt, z1 = zt + 18;
        g.beginPath(); g.moveTo(...P(a, T, z1)); g.lineTo(...P(b, T, z1)); g.lineTo(...P(b, T, z0)); g.lineTo(...P(a, T, z0)); g.closePath();
        g.fillStyle = p; g.fill(); g.strokeStyle = 'rgba(6,8,12,0.6)'; g.stroke();
        g.beginPath(); g.moveTo(...P(a, v0, z1)); g.lineTo(...P(b, v0, z1)); g.lineTo(...P(b, T, z1)); g.lineTo(...P(a, T, z1)); g.closePath();
        g.fillStyle = 'rgb(112,120,138)'; g.fill(); g.stroke();
      }
    }
    spanCache.set(key, c);
    return c;
  } });
  return spr;
}

// ------------------------------------------------------------------ panels on a wall face
// A flat picture sheared onto the plane of a wall face: an open door leaf cut out of a castle pack door (`trim` px off
// each side: its frame), or a banner (the pack's hangings are all painted face on). axis 'y': the panel runs along y,
// on a face looking down +x (an SE face, shaded); 'x': along x, on a face looking down +y (lit). `len` tiles long,
// `hpx` tall; pivot: the panel's foot at the run's start (axis 'y': its +y end; 'x': its -x end).
const panelCache = new Map();
export function castlePanel(art, { len = 1, hpx = 52, axis = 'y', trim = [0, 0, 0, 0], shade = null }) {
  const run = len * 32, rise = len * 16, w = run + 2, h = hpx + rise + 2, key = art.name + '|' + len + '|' + hpx + '|' + axis + '|' + trim.join(',');
  // axis 'y' climbs to the right, so its start (the pivot) is the canvas's low left corner; 'x' falls to the right
  const spr = { sx: 0, sy: 0, w, h, ox: -1, oy: -(hpx + 1 + (axis === 'y' ? rise : 0)), name: 'castle_panel_' + key, castle: true, lazy: true };
  Object.defineProperty(spr, 'img', { enumerable: true, get() {
    if (typeof document === 'undefined' || !art.img) return null;
    let c = panelCache.get(key);
    if (c) return c;
    c = makeCanvas(w, h);
    const g = c.getContext('2d'), [l, t, r, b] = trim;
    if (axis === 'y') g.setTransform(1, -0.5, 0, 1, 1, hpx + 1 + rise); else g.setTransform(1, 0.5, 0, 1, 1, hpx + 1);
    g.drawImage(art.img, art.sx + l, art.sy + t, art.w - l - r, art.h - t - b, 0, -hpx, run, hpx);
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = shade ?? (axis === 'y' ? 'rgba(10,8,14,0.3)' : 'rgba(10,8,14,0.08)'); g.fillRect(0, -hpx, run, hpx);
    g.setTransform(1, 0, 0, 1, 0, 0);
    panelCache.set(key, c);
    return c;
  } });
  return spr;
}
/** An open door leaf: a panel cut from a door sprite inside its frame. */
export const castleLeaf = (door, o) => castlePanel(door, { trim: [14, 14, 14, 6], ...o });
