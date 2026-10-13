// General helpers shared across the game.
export const TAU = Math.PI * 2;
export const DEG = Math.PI / 180;

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const rand = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
export const randi = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
export const chance = (p) => Math.random() < p;
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
export const dist2 = (ax, ay, bx, by) => (bx - ax) * (bx - ax) + (by - ay) * (by - ay);
export const angleTo = (ax, ay, bx, by) => Math.atan2(by - ay, bx - ax);
export const sign = (v) => (v < 0 ? -1 : 1);

export function angleDiff(a, b) {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
}

export function shuffle(arr, rng = Math.random) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function weighted(entries, rng = Math.random) {
  // entries: [[value, weight], ...]
  let total = 0;
  for (const e of entries) total += e[1];
  let r = rng() * total;
  for (const e of entries) {
    r -= e[1];
    if (r <= 0) return e[0];
  }
  return entries[entries.length - 1][0];
}

export function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export class RNG {
  constructor(seed = Date.now()) { this.s = seed >>> 0 || 1; }
  next() {
    let t = (this.s += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  range(a, b) { return a + this.next() * (b - a); }
  int(a, b) { return Math.floor(a + this.next() * (b - a + 1)); }
  pick(arr) { return arr[Math.floor(this.next() * arr.length)]; }
  chance(p) { return this.next() < p; }
  fn() { return () => this.next(); }
}

export function fmt(n) {
  n = Math.round(n);
  if (Math.abs(n) >= 1e12) return (n / 1e12).toFixed(1) + 'T';
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(1) + 'B';
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (Math.abs(n) >= 1e4) return (n / 1e3).toFixed(1) + 'k';
  return String(n);
}

export function fmtInt(n) { return Math.round(n).toLocaleString('en-US'); }

// ---------------------------------------------------------------- colours
export function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const v = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}
export function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
}
export function mixHex(a, b, t) {
  const A = hexToRgb(a), B = hexToRgb(b);
  return rgbToHex(lerp(A[0], B[0], t), lerp(A[1], B[1], t), lerp(A[2], B[2], t));
}
export function shade(hex, f) {
  // f > 0 lighten toward white, f < 0 darken toward black
  return f >= 0 ? mixHex(hex, '#ffffff', f) : mixHex(hex, '#000000', -f);
}
export function rgba(hex, a) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

export function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  return [h, s, l];
}
function hue2rgb(p, q, t) {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
  return p;
}
export function hslToRgb(h, s, l) {
  if (s === 0) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [hue2rgb(p, q, h + 1 / 3) * 255, hue2rgb(p, q, h) * 255, hue2rgb(p, q, h - 1 / 3) * 255];
}

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
}

/**
 * Palette-swap an image region. params:
 *  hue (degrees shift), sat (multiplier), light (-1..1 add), contrast (mult around .5),
 *  tint [r,g,b,amount] blended in after the HSL shift, keepHue (bool: colourize to hue)
 */
export function recolor(src, params, sx = 0, sy = 0, sw, sh) {
  sw = sw ?? src.width; sh = sh ?? src.height;
  const c = makeCanvas(sw, sh);
  if (!params) { c.getContext('2d').drawImage(src, sx, sy, sw, sh, 0, 0, sw, sh); return c; }
  // read the pixels on a throwaway CPU canvas: a willReadFrequently canvas stays CPU-backed, and drawing from one
  // every frame (tile atlases, monster art) re-uploads it to the GPU each time, which crawls on iOS Safari
  const tmp = makeCanvas(sw, sh), tx = tmp.getContext('2d', { willReadFrequently: true });
  tx.drawImage(src, sx, sy, sw, sh, 0, 0, sw, sh);
  const img = tx.getImageData(0, 0, sw, sh);
  tmp.width = tmp.height = 0; // free its backing store now (iOS counts canvas memory until GC)
  const d = img.data;
  const hue = (params.hue || 0) / 360;
  const sat = params.sat ?? 1;
  const light = params.light || 0;
  const contrast = params.contrast ?? 1;
  const tint = params.tint;
  const colorize = params.colorize; // [h(0-360), s]
  // colours are looked up on a 6-bit-per-channel table: big atlases hold millions of pixels but few colours
  const lut = new Int32Array(1 << 18).fill(-1);
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue;
    const q = ((d[i] >> 2) << 12) | ((d[i + 1] >> 2) << 6) | (d[i + 2] >> 2);
    let v = lut[q];
    if (v < 0) {
      let [h, s, l] = rgbToHsl(d[i], d[i + 1], d[i + 2]);
      if (colorize) { h = colorize[0] / 360; s = colorize[1] * (0.4 + s * 0.6); }
      h = (h + hue + 1) % 1;
      s = clamp(s * sat, 0, 1);
      l = clamp((l - 0.5) * contrast + 0.5 + light, 0, 1);
      let [r, g, b] = hslToRgb(h, s, l);
      if (tint) {
        const t = tint[3];
        r = r + (tint[0] - r) * t * l * 1.4;
        g = g + (tint[1] - g) * t * l * 1.4;
        b = b + (tint[2] - b) * t * l * 1.4;
      }
      v = lut[q] = (clamp(Math.round(r), 0, 255) << 16) | (clamp(Math.round(g), 0, 255) << 8) | clamp(Math.round(b), 0, 255);
    }
    d[i] = v >> 16; d[i + 1] = (v >> 8) & 255; d[i + 2] = v & 255;
  }
  c.getContext('2d').putImageData(img, 0, 0);
  return c;
}

/** Downscale an image in halving steps for a clean result. */
export function scaleImage(src, targetH) {
  let cur = src, w = src.width, h = src.height;
  const tw = Math.max(1, Math.round((w * targetH) / h));
  while (h / 2 > targetH) {
    const c = makeCanvas(Math.round(w / 2), Math.round(h / 2));
    const cx = c.getContext('2d');
    cx.imageSmoothingQuality = 'high';
    cx.drawImage(cur, 0, 0, c.width, c.height);
    cur = c; w = c.width; h = c.height;
  }
  const out = makeCanvas(tw, targetH);
  const ox = out.getContext('2d');
  ox.imageSmoothingQuality = 'high';
  ox.drawImage(cur, 0, 0, tw, targetH);
  return out;
}

export function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
}

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
