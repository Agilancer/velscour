// Gear art (tools/gearart.py, docs/CLASS_ART.md): per class 80 body armors and 80 helms, single frames of the
// same hero. The hero is drawn as the equipped body armor's design in its finish (palette), with the
// equipped helm composited over the head: the face shows through the helm's opening, and hair that would
// poke out of the shell is clipped. Only the played class is loaded (about 600 KB).
import { makeCanvas, hexToRgb, clamp, randi, pick, chance } from './util.js';
import { RARITY } from '../data/items.js';
import { PALETTES, GEAR_FX, FX_CHANCE } from '../data/gear.js';

const BASE = 'assets/sprites/gear/';
const S = { list: null, cls: null, meta: null, armor: null, amask: null, helms: null, hmask: null };

function loadImage(src) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => rej(new Error('Failed to load ' + src));
    img.src = src;
  });
}
function pixels(img) {
  const c = makeCanvas(img.width, img.height), x = c.getContext('2d', { willReadFrequently: true });
  x.drawImage(img, 0, 0);
  return x.getImageData(0, 0, img.width, img.height);
}
function channel(img) { // one channel of a greyscale mask
  const d = pixels(img).data, out = new Uint8Array(d.length / 4);
  for (let i = 0; i < out.length; i++) out[i] = d[i * 4];
  return out;
}

/** Load a class's gear art. Resolves to its meta, or null if the class has none (it then keeps its old sprite). */
export async function loadGearArt(cls) {
  if (S.cls === cls) return S.meta;
  try {
    if (!S.list) S.list = await fetch(BASE + 'classes.json').then((r) => (r.ok ? r.json() : []));
    if (!S.list.includes(cls)) { Object.assign(S, { cls, meta: null }); return null; }
    const dir = BASE + cls + '/';
    const [meta, a, am, h, hm] = await Promise.all([
      fetch(dir + 'gear.json').then((r) => { if (!r.ok) throw new Error('gear ' + cls); return r.json(); }),
      loadImage(dir + 'armor.webp'), loadImage(dir + 'armor_mask.png'), loadImage(dir + 'helms.webp'), loadImage(dir + 'helms_mask.png'),
    ]);
    Object.assign(S, { cls, meta, armor: pixels(a), amask: channel(am), helms: pixels(h), hmask: channel(hm) });
    looks.clear(); icons.clear();
    return meta;
  } catch (e) {
    console.warn('gear art unavailable for', cls, e);
    Object.assign(S, { cls, meta: null });
    return null;
  }
}
export const gearMeta = (cls) => (S.cls === cls ? S.meta : null);

// ------------------------------------------------------------------ looks of items
const rarityName = (r) => RARITY[r].name.toLowerCase();
/** A design id for a rarity band that follows the item's level: low levels get the band's first designs. */
function designFor(band, ilvl) {
  const [a, b] = band;
  const t = Math.sqrt(clamp((ilvl - 1) / 99, 0, 1));
  return clamp(Math.round(a + t * (b - a)) + randi(-1, 1), a, b);
}
function finishFor(rarity) {
  if (chance(0.1)) return 0; // the original colours
  const ok = PALETTES.map((p, i) => i).filter((i) => i && PALETTES[i].tier <= rarity && PALETTES[i].tier >= rarity - 2);
  return pick(ok);
}
function fxFor(rarity) {
  if (!chance(FX_CHANCE[rarity])) return -1;
  const tier = rarity >= 3 && chance(0.2) ? rarity - 1 : rarity; // now and then one tier down
  const ok = GEAR_FX.map((f, i) => i).filter((i) => GEAR_FX[i].tier === Math.min(5, tier));
  return ok.length ? pick(ok) : -1;
}

/**
 * The look of a body armor or helm for the played class: [design, finish, effect] (effect -1 = none). Rolled on
 * first use from the item's rarity and level and kept on the item (so saves keep it); null without gear art.
 */
export function itemLook(item) {
  if (!item || item.type !== 'gear' || (item.slot !== 'body' && item.slot !== 'head') || !S.meta) return null;
  const lib = S.meta[item.slot === 'body' ? 'armor' : 'helms'];
  if (!item.look || item.look[0] > lib.n) {
    const band = lib.bands[rarityName(item.rarity)] || lib.bands.common;
    item.look = [designFor(band, item.ilvl), finishFor(item.rarity), item.slot === 'body' ? fxFor(item.rarity) : -1];
  }
  return item.look;
}
export const finishOf = (item) => { const l = itemLook(item); return l && l[1] ? PALETTES[l[1]] : null; };
export const gearFxOf = (item) => { const l = itemLook(item); return l && l[2] >= 0 ? GEAR_FX[l[2]] || null : null; };

// ------------------------------------------------------------------ palettes
const lutCache = new Map();
/** Per palette and material a 256-entry RGB lookup by luminance. */
function luts(pi) {
  let L = lutCache.get(pi);
  if (L) return L;
  L = {};
  for (const [m, stops] of Object.entries(PALETTES[pi].ramps)) {
    const rgb = stops.map(hexToRgb), n = rgb.length - 1, t = new Float32Array(256 * 3);
    for (let i = 0; i < 256; i++) {
      const u = (i / 255) * n, j = Math.min(n - 1, Math.floor(u)), f = u - j;
      for (let c = 0; c < 3; c++) t[i * 3 + c] = (rgb[j][c] * (1 - f) + rgb[j + 1][c] * f) / 255;
    }
    L[m] = t;
  }
  lutCache.set(pi, L);
  return L;
}
const ss = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

/**
 * Recolour pixel i of `d` (RGBA bytes) in place with palette `pi`: every material is mapped through its ramp by
 * luminance, then rescaled to the original luminance so the artist's shading survives.
 */
function recolorPx(d, i, pi, L, k) {
  const r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), dd = mx - mn;
  const s = mx > 0 ? dd / mx : 0;
  let h = 0;
  if (dd > 1e-6) h = mx === r ? (((g - b) / dd) % 6 + 6) % 6 * 60 : mx === g ? ((b - r) / dd + 2) * 60 : ((r - g) / dd + 4) * 60;
  const lum = r * 0.299 + g * 0.587 + b * 0.114;
  const warm = h >= 12 && h <= 62 ? 1 : 0;
  const wT = ss(0.35, 0.55, s) * ss(0.42, 0.62, mx) * warm;
  const wL = ss(0.25, 0.45, s) * (1 - ss(0.42, 0.62, mx)) * warm;
  const wN = (1 - ss(0.2, 0.42, s)) * (1 - wT) * (1 - wL);
  const wC = Math.max(0, 1 - wT - wN - wL);
  const li = Math.round(clamp((lum - 0.02) * 1.2, 0, 1) * 255) * 3;
  let nr = 0, ng = 0, nb = 0;
  for (const [t, w] of [[L.metal, wN], [L.cloth, wC], [L.trim, wT], [L.leather, wL]]) {
    if (w <= 0) continue;
    nr += t[li] * w; ng += t[li + 1] * w; nb += t[li + 2] * w;
  }
  const nl = nr * 0.299 + ng * 0.587 + nb * 0.114, f = (lum + 0.01) / (nl + 0.01);
  d[i] = (r * (1 - k) + Math.min(1, nr * f) * k) * 255;
  d[i + 1] = (g * (1 - k) + Math.min(1, ng * f) * k) * 255;
  d[i + 2] = (b * (1 - k) + Math.min(1, nb * f) * k) * 255;
}

/** One armor frame (1-based id) as RGBA bytes, recoloured by palette `pi`. */
function armorPixels(id, pi) {
  const { meta, armor, amask } = S, [fw, fh] = meta.frame;
  const sx = ((id - 1) % meta.cols) * fw, sy = Math.floor((id - 1) / meta.cols) * fh, aw = armor.width;
  const out = new Uint8ClampedArray(fw * fh * 4);
  const pal = PALETTES[pi] || PALETTES[0], L = pal.k ? luts(pi) : null;
  for (let y = 0; y < fh; y++) {
    for (let x = 0; x < fw; x++) {
      const si = (sy + y) * aw + sx + x, o = (y * fw + x) * 4;
      if (!armor.data[si * 4 + 3]) continue;
      out[o] = armor.data[si * 4]; out[o + 1] = armor.data[si * 4 + 1]; out[o + 2] = armor.data[si * 4 + 2]; out[o + 3] = 255;
      if (L && !amask[si]) recolorPx(out, o, pi, L, pal.k);
    }
  }
  return out;
}

/** One helm cell (1-based id) as RGBA bytes + its mask (255 opening, 128 crown zone), recoloured. */
function helmPixels(id, pi) {
  const { meta, helms, hmask } = S, [, , hw, hh] = meta.helmCell;
  const sx = ((id - 1) % meta.cols) * hw, sy = Math.floor((id - 1) / meta.cols) * hh, aw = helms.width;
  const out = new Uint8ClampedArray(hw * hh * 4), m = new Uint8Array(hw * hh);
  const pal = PALETTES[pi] || PALETTES[0], L = pal.k ? luts(pi) : null;
  for (let y = 0; y < hh; y++) {
    for (let x = 0; x < hw; x++) {
      const si = (sy + y) * aw + sx + x, o = (y * hw + x) * 4;
      m[y * hw + x] = hmask[si];
      if (!helms.data[si * 4 + 3]) continue;
      out[o] = helms.data[si * 4]; out[o + 1] = helms.data[si * 4 + 1]; out[o + 2] = helms.data[si * 4 + 2]; out[o + 3] = 255;
      if (L && hmask[si] !== 255) recolorPx(out, o, pi, L, pal.k);
    }
  }
  return { px: out, m };
}

function toCanvas(px, w, h) {
  const c = makeCanvas(w, h);
  c.getContext('2d').putImageData(new ImageData(px, w, h), 0, 0);
  return c;
}

// ------------------------------------------------------------------ the hero
const looks = new Map();
/**
 * The hero's full-frame canvas wearing `body` and `head` (gear items or null), or null without gear art.
 * No body armor shows the first, plainest design; no helm shows the bare head.
 */
export function heroLook(cls, body, head) {
  if (!gearMeta(cls)) return null;
  const bl = body ? itemLook(body) : [1, 0, -1], hl = head ? itemLook(head) : null;
  const key = bl[0] + '|' + bl[1] + '|' + (hl ? hl[0] + '|' + hl[1] : '-');
  let c = looks.get(key);
  if (c) return c;
  const { meta } = S, [fw, fh] = meta.frame;
  const px = armorPixels(bl[0], bl[1]);
  if (hl) {
    const [hx, hy, hw, hh] = meta.helmCell, { px: hp, m } = helmPixels(hl[0], hl[1]);
    for (let y = 0; y < hh; y++) {
      for (let x = 0; x < hw; x++) {
        const hi = y * hw + x, o = ((hy + y) * fw + hx + x) * 4;
        const mk = m[hi], shell = hp[hi * 4 + 3] > 0;
        if (mk === 128) { px[o + 3] = 0; continue; }          // crown zone: hair poking out of the shell
        if (!shell) continue;
        if (mk === 255 && px[o + 3]) continue;                // opening: the face shows through
        px[o] = hp[hi * 4]; px[o + 1] = hp[hi * 4 + 1]; px[o + 2] = hp[hi * 4 + 2]; px[o + 3] = 255;
      }
    }
  }
  c = toCanvas(px, fw, fh);
  if (looks.size >= 8) looks.delete(looks.keys().next().value);
  looks.set(key, c);
  return c;
}

/** Draw parameters of the hero canvas: feet anchor and world px per art px for a hero `spriteH` tall. */
export function heroFrame(cls, spriteH) {
  const m = gearMeta(cls);
  return m && { ax: m.frame[0] / 2, ay: m.feet, k: spriteH / (m.feet - m.headTop) };
}

// ------------------------------------------------------------------ icons
const icons = new Map();
function fitCanvas(src, box, w, h) {
  const [x0, y0, x1, y1] = box, bw = x1 - x0, bh = y1 - y0;
  const k = Math.min(w / bw, h / bh) * 0.94;
  const c = makeCanvas(w, h);
  c.getContext('2d').drawImage(src, x0, y0, bw, bh, (w - bw * k) / 2, (h - bh * k) / 2, bw * k, bh * k);
  return c;
}
/** Icon canvas (w x h) of a body armor or helm in its finish, or null without gear art. */
export function gearIcon(item, w = 48, h = w) {
  const l = itemLook(item);
  if (!l) return null;
  const key = item.slot + l[0] + '|' + l[1] + '|' + w + 'x' + h;
  let c = icons.get(key);
  if (!c) {
    const { meta } = S;
    if (item.slot === 'body') c = fitCanvas(toCanvas(armorPixels(l[0], l[1]), meta.frame[0], meta.frame[1]), meta.armor.box[l[0] - 1], w, h);
    else {
      const [, , hw, hh] = meta.helmCell, { px, m } = helmPixels(l[0], l[1]);
      for (let i = 0; i < m.length; i++) if (m[i] === 255) px[i * 4 + 3] = 0; // an empty helm: see through its opening
      c = fitCanvas(toCanvas(px, hw, hh), meta.helms.box[l[0] - 1], w, h);
    }
    if (icons.size > 300) icons.clear();
    icons.set(key, c);
  }
  return c;
}

/** The hero's portrait (w x h) for the inventory, or null without gear art. */
export function heroPortrait(cls, body, head, w, h) {
  const c = heroLook(cls, body, head);
  if (!c) return null;
  const m = S.meta, b = [0, Infinity, 0, 0];
  // the armor box widened by the helm's
  const ab = m.armor.box[(body ? itemLook(body)[0] : 1) - 1];
  b[0] = ab[0]; b[1] = ab[1]; b[2] = ab[2]; b[3] = ab[3];
  if (head) { const hb = m.helms.box[itemLook(head)[0] - 1]; b[1] = Math.min(b[1], hb[1] + m.helmCell[1]); }
  return fitCanvas(c, b, w, h);
}
