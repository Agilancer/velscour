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

// thousands suffixes for the deep game's numbers (gold piles reach ~1e20 at level 600, armor ~1e57 at 3000); past
// Dc (1e33) they go to e-notation
const SUFFIX = ['', 'k', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
/** n with a thousands suffix: `digits` decimals (fixed), or significant digits when sig (trailing zeros dropped). */
function suffixed(n, digits, sig) {
  if (!Number.isFinite(n)) return String(n);
  let e = Math.max(0, Math.floor(Math.log10(Math.abs(n) || 1) / 3)), v = n / Math.pow(1000, e);
  let s = sig ? (+v.toPrecision(digits)).toString() : v.toFixed(digits);
  if (Math.abs(parseFloat(s)) >= 1000 && e + 1 < SUFFIX.length) { e++; v = n / Math.pow(1000, e); s = sig ? (+v.toPrecision(digits)).toString() : v.toFixed(digits); }
  return e >= SUFFIX.length ? n.toExponential(2).replace('e+', 'e') : s + SUFFIX[e];
}
export function fmt(n) {
  n = Math.round(n);
  return Math.abs(n) >= 1e4 ? suffixed(n, 1) : String(n);
}
/** A big count in 4 significant digits and a suffix: 386.7Qi, 1.5B (fmtInt uses it from a billion up). */
export const fmtBig = (n) => suffixed(n, 4, true);

/** A damage figure on the shown scale (shownDmg in data/depth.js): small ones keep a decimal or two. */
export function fmtDmg(n) {
  const a = Math.abs(n);
  return a >= 10 ? fmt(n) : a >= 1 ? n.toFixed(1).replace(/\.0$/, '') : n.toFixed(2);
}

// en-US digit grouping by hand: toLocaleString goes through ICU, and the HUD and tooltips format numbers every frame
export function fmtInt(n) {
  const r = Math.round(n);
  if (!Number.isFinite(r) || Object.is(r, -0)) return r.toLocaleString('en-US');
  if (Math.abs(r) >= 1e9) return fmtBig(r); // past nine digits commas stop helping (and past 2^53 the digits are made up)
  const s = String(Math.abs(r)), g = s.length > 3 ? s.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : s;
  return r < 0 ? '-' + g : g;
}

// ---------------------------------------------------------------- colours
// memoised (lighting and glows ask every frame); the shared array is frozen so a caller can't change it for others
const rgbCache = new Map();
export function hexToRgb(hex) {
  let c = rgbCache.get(hex);
  if (c) return c;
  if (hex[0] !== '#' && /[^0-9a-f]/i.test(hex)) return cssRgb(hex);   // rgb(), hsl(), a name: not black
  const h = hex.replace('#', '');
  const v = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  c = Object.freeze([(v >> 16) & 255, (v >> 8) & 255, v & 255]);
  if (rgbCache.size < 512) rgbCache.set(hex, c);
  return c;
}
// any CSS colour (#hex, rgb(), hsl(), a name) as [r, g, b]: hexToRgb reads only hex, and turned an hsl() into black.
// The canvas parses it: fillStyle reads back as #rrggbb, or rgba() when translucent.
export function cssRgb(col) {
  if (col[0] === '#') return hexToRgb(col);
  let c = rgbCache.get(col);
  if (c) return c;
  const x = measureCtx();
  x.fillStyle = '#000'; x.fillStyle = col;
  const n = x.fillStyle;
  c = n[0] === '#' ? hexToRgb(n) : Object.freeze((n.match(/[\d.]+/g) || []).slice(0, 3).map(Number));
  if (rgbCache.size < 512) rgbCache.set(col, c);
  return c;
}
/**
 * A small sprite cache for colour-keyed glows and discs: colours are snapped to 5 bits a channel (a hue cycling every
 * frame used to bake a new canvas every frame, forever) and at `max` sprites the oldest canvas is repainted for the new
 * colour instead of a new one made. Only for sprites drawn at once and never kept by the caller.
 */
export function colourSprites(max, size, paint) {
  const byStr = new Map(), byQ = new Map();
  return (col) => {
    let c = byStr.get(col);
    if (c) return c;
    const [r, g, b] = cssRgb(col), q = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
    c = byQ.get(q);
    if (!c) {
      if (byQ.size >= max) { const k = byQ.keys().next().value; c = byQ.get(k); byQ.delete(k); byStr.clear(); }
      if (c && !rasterSprites()) c.width = size;   // (resets the canvas; a raster sprite is let go and a new one made)
      else c = spriteCanvas(size, size);
      paint(c.getContext('2d'), (r & ~7) | 4, (g & ~7) | 4, (b & ~7) | 4);
      c = frozen(c);
      byQ.set(q, c);
    }
    if (byStr.size >= 2048) byStr.clear();
    byStr.set(col, c);
    return c;
  };
}
/** One shared 2D context for measureText (each label/number baked used to make a throwaway canvas just to measure). */
let measurer = null;
export function measureCtx(font) {
  if (!measurer) measurer = makeCanvas(1, 1).getContext('2d');
  if (font && measurer.font !== font) measurer.font = font;
  return measurer;
}
export function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
}
export function mixHex(a, b, t) {
  const A = hexToRgb(a), B = hexToRgb(b);
  return rgbToHex(lerp(A[0], B[0], t), lerp(A[1], B[1], t), lerp(A[2], B[2], t));
}
const shadeCache = new Map();
export function shade(hex, f) {
  // f > 0 lighten toward white, f < 0 darken toward black (memoised: particles and props shade colours per draw)
  const key = hex + '|' + f;
  let c = shadeCache.get(key);
  if (c === undefined) {
    c = f >= 0 ? mixHex(hex, '#ffffff', f) : mixHex(hex, '#000000', -f);
    if (shadeCache.size >= 2048) shadeCache.clear();
    shadeCache.set(key, c);
  }
  return c;
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

// ------------------------------------------------------------------ raster sprites (Chromium, desktop)
// Chromium copies a canvas whole into a fresh mipmapped texture every time it is drawn with mipmapped smoothing (the
// desktop's 'medium' sprite quality), however small the slice drawn, and keeps no copy: a 1080p fight copied up to
// 50 Mpx a frame of bone sheets, blood splats, glows and monster sprites, ~70% of the GPU process's time. A raster
// ImageBitmap (painted on a CPU-backed OffscreenCanvas and handed over) is uploaded once and kept, its mip levels built
// on the GPU as a canvas's are (see prime below), so it draws as fast as 'low' smoothing. What still differs from a
// canvas is the painting: Skia on the CPU anti-aliases and resamples in its last bits differently from the GPU
// (tools/tests/rasterlook.js measures it). Phones draw sprites 'low' (no copies) and other browsers are untested, so
// both keep plain canvases. globalThis.VELSCOUR_NO_RASTER = true (tests, comparisons) or ?noraster in
// the page's address turns it off.
let rasterOK;
export function rasterSprites() {
  if (rasterOK !== undefined) return rasterOK;
  try {
    const touch = matchMedia('(pointer: coarse)').matches || ('ontouchstart' in window && navigator.maxTouchPoints > 0);
    // userAgentData only exists on https/localhost: over plain http (a LAN address) the user-agent string says it
    const chromium = navigator.userAgentData ? navigator.userAgentData.brands.some((b) => /Chromium/.test(b.brand)) : /\bChrome\/\d/.test(navigator.userAgent);
    const off = globalThis.VELSCOUR_NO_RASTER || /[?&]noraster\b/.test(location.search);
    rasterOK = !touch && chromium && !off && typeof OffscreenCanvas === 'function' &&
      'transferToImageBitmap' in OffscreenCanvas.prototype && !!new OffscreenCanvas(1, 1).getContext('2d', { willReadFrequently: true });
  } catch (e) { rasterOK = false; }
  return rasterOK;
}
/** Are img's pixels on the CPU (an image, a raster sprite, a CPU canvas)? Then painting from it on the CPU reads
 *  nothing back from the GPU. A plain canvas is GPU-backed: drawn into a CPU canvas it stalls the GPU process. */
export function cpuImage(img) {
  return !!img && (img._cpu === true || img instanceof HTMLImageElement || (typeof ImageBitmap === 'function' && img instanceof ImageBitmap));
}
/** A canvas painted and read on the CPU (willReadFrequently), marked so cpuImage() knows it. */
export function cpuCanvas(w, h) {
  const c = makeCanvas(w, h);
  c.getContext('2d', { willReadFrequently: true });
  c._cpu = true;
  return c;
}
/** img as a source three.js can upload upright: WebGL ignores flipY for an ImageBitmap, so a raster sprite is copied to
 *  a canvas first (memoised on the sprite). */
export function texSource(img) {
  if (!img || typeof ImageBitmap !== 'function' || !(img instanceof ImageBitmap)) return img;
  if (!img._tex) { const c = makeCanvas(img.width, img.height); c.getContext('2d').drawImage(img, 0, 0); img._tex = c; }
  return img._tex;
}
/** The RGBA pixels of any image or canvas (a raster sprite has no context of its own: it is read through a CPU canvas). */
export function pixelsOf(img) {
  const w = img.width, h = img.height;
  if (typeof img.getContext === 'function') return img.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, w, h).data;
  const t = cpuCanvas(w, h), x = t.getContext('2d');
  x.drawImage(img, 0, 0);
  return x.getImageData(0, 0, w, h).data;
}
/** A canvas to paint a sprite on and hand to frozen(): CPU-backed where rasterSprites(), else a plain canvas. from: an
 *  image it will be painted from; if that one lives on the GPU the sprite stays a plain canvas (no readback). */
export function spriteCanvas(w, h, from = null) {
  if (!rasterSprites() || (from && !cpuImage(from))) return makeCanvas(w, h);
  const c = new OffscreenCanvas(Math.max(1, Math.ceil(w)), Math.max(1, Math.ceil(h)));
  c.getContext('2d', { willReadFrequently: true });
  c._cpu = true;
  return c;
}
/** A finished sprite from spriteCanvas: a raster ImageBitmap carrying the canvas's own fields (_art, _pad...), or the
 *  canvas itself where it is a plain one. Never paint on a sprite after this. */
export function frozen(c) {
  if (!c || c._cpu !== true || typeof c.transferToImageBitmap !== 'function') return c;
  const b = c.transferToImageBitmap();
  for (const k of Object.keys(c)) if (k !== '_cpu') b[k] = c[k];
  prime(b);
  rasters.add(b);
  return b;
}
// A raster sprite uploaded by a draw that needs mip levels has them built on the CPU, and Skia filters a side of odd
// length more softly there than the GPU does for a canvas: minified, such sprites looked softer (up to ~30% less fine
// detail). Drawn first at 1:1 (no mips) and handed over at once, it goes to the GPU plain and the GPU builds its mip
// levels later, exactly as for a canvas (tools/tests/out/bench_mips6: the same pixels at every size and scale), and it
// draws faster too. ~0.13 ms a sprite. If this fails the sprite keeps the CPU's levels: softer, never broken. So does a
// sprite whose GPU copy Chromium let go (critical memory pressure) and sent again for a minified draw: 0.95-0.99 of a
// canvas's fine detail (tools/tests/out/rasterlook_r4_purge.txt), until the safety valve below draws it from a canvas.
let primer = null;
function prime(b) {
  try {
    const x = (primer ||= new OffscreenCanvas(16, 16)).getContext('2d');
    if (!x) return;
    x.imageSmoothingEnabled = false;
    x.drawImage(b, 0, 0, 1, 1, 0, 0, 1, 1);
    primer.transferToImageBitmap().close(); // hands the frame over: the draw (and the plain upload) reaches the GPU now
  } catch (e) { /* unprimed */ }
}
// The safety valve (main.js rasterWatch). A raster sprite's GPU copy lives in Chromium's image cache, and after critical
// memory pressure Chromium may stop keeping it and send the sprite up again on every draw: 8-30 fps even in the town,
// where plain canvases (textures of their own) hold on (tools/tests/out/purge_play_*.txt). In fallback, a raster sprite
// drawn into the game canvas is drawn from a plain canvas copy of it, made once: what the game did before raster
// sprites. Nothing else changes (what is made, how grit is read). rasterFallback(false) undoes it.
const rasters = new WeakSet();
let plainDraw = null, copiesMade = 0;
export function rasterFallback(on = true) {
  const P = CanvasRenderingContext2D.prototype;
  if (!on) { if (plainDraw) P.drawImage = plainDraw; plainDraw = null; return; }
  if (plainDraw) return;
  const draw = plainDraw = P.drawImage, copies = new WeakMap();
  let game = null;
  P.drawImage = function (img, a, b, c, d, e, f, g, h) {
    if (rasters.has(img) && this.canvas === (game ||= document.getElementById('game'))) {
      let k = copies.get(img);
      if (!k) { k = makeCanvas(img.width, img.height); draw.call(k.getContext('2d'), img, 0, 0); copies.set(img, k); copiesMade++; }
      img = k;
    }
    const n = arguments.length;
    return n === 3 ? draw.call(this, img, a, b) : n === 5 ? draw.call(this, img, a, b, c, d) : draw.call(this, img, a, b, c, d, e, f, g, h);
  };
}
export const rasterFallbackOn = () => !!plainDraw;
export const rasterFallbackCopies = () => copiesMade;   // for tests

/**
 * A loaded image as a decoded ImageBitmap, for atlases that palette swaps read on the CPU (recolor): Chrome may drop
 * an <img>'s decoded pixels, and every swap of a level then decoded the whole multi-MB sheet again (100+ ms on a
 * phone). Falls back to the image itself where createImageBitmap is missing or fails.
 */
export function decoded(img) {
  if (typeof createImageBitmap !== 'function') return Promise.resolve(img);
  return createImageBitmap(img).catch(() => img);
}

/**
 * A sprite's silhouette filled with `fill` (hit flash, corpse shade), made on the GPU from an already built sprite
 * (no pixel readback) and kept as long as the sprite is: art caches store only the base sprite, so a flash or a
 * corpse never evicts a look or rebuilds its palette swap.
 */
const silhouettes = new WeakMap();
export function silhouette(img, fill) {
  let m = silhouettes.get(img);
  if (!m) silhouettes.set(img, (m = new Map()));
  let c = m.get(fill);
  if (!c) {
    c = spriteCanvas(img.width, img.height, img);
    const x = c.getContext('2d');
    x.drawImage(img, 0, 0); x.globalCompositeOperation = 'source-atop'; x.fillStyle = fill; x.fillRect(0, 0, c.width, c.height);
    if (img._art) c._art = img._art;
    m.set(fill, (c = frozen(c)));
  }
  return c;
}

/**
 * Level-scoped trimming for the LRU art caches (Map insertion order = recency): lruMark drops a sentinel at the
 * newest end; every entry read or added after it moves past it; lruTrim then deletes everything still in front of
 * it, i.e. what the new level never asked for. Caches keep their size caps; this just stops a long run carrying
 * every earlier level's monsters (and their GPU textures) along.
 */
const LRU_MARK = Symbol('lru-mark');
export function lruMark(map) { map.delete(LRU_MARK); map.set(LRU_MARK, null); }
export function lruTrim(map) {
  if (!map.has(LRU_MARK)) return;
  for (const k of map.keys()) { map.delete(k); if (k === LRU_MARK) break; }
}

/** A stable cache key for a palette swap object (memoised: JSON.stringify per draw adds up). */
const swapKeys = new WeakMap();
export function swapKey(swap) {
  if (!swap || typeof swap !== 'object') return '';
  let k = swapKeys.get(swap);
  if (k === undefined) swapKeys.set(swap, (k = JSON.stringify(swap)));
  return k;
}

/**
 * Atlases over 4096 px on a side exceed many GPUs' texture limit, and Chrome then draws every slice from them on the
 * slow path. pageAtlas(img) cuts such an atlas into overlapping 3072 px pages along its long side (step 2048, so any
 * sprite under 1024 px fits a page whole) and returns rect => {img, sx, sy} on the right page; small atlases pass through.
 */
const atlasPages = new WeakMap();
export function pageAtlas(img) {
  const W = img.naturalWidth || img.width, H = img.naturalHeight || img.height;
  if (W <= 4096 && H <= 4096) return (sx, sy) => ({ img, sx, sy });
  let pages = atlasPages.get(img);
  const vert = H >= W, L = vert ? H : W, STEP = 2048, SIZE = 3072;
  if (!pages) {
    pages = [];
    for (let s = 0; s < L; s += STEP) {
      const n = Math.min(SIZE, L - s), c = vert ? makeCanvas(W, n) : makeCanvas(n, H);
      c.getContext('2d').drawImage(img, vert ? 0 : -s, vert ? -s : 0);
      pages.push(c);
      if (s + SIZE >= L) break;
    }
    atlasPages.set(img, pages);
  }
  return (sx, sy) => {
    const i = Math.min(pages.length - 1, Math.floor((vert ? sy : sx) / STEP));
    return vert ? { img: pages[i], sx, sy: sy - i * STEP } : { img: pages[i], sx: sx - i * STEP, sy };
  };
}

/**
 * Palette-swap an image region. params:
 *  hue (degrees shift), sat (multiplier), light (-1..1 add), contrast (mult around .5),
 *  tint [r,g,b,amount] blended in after the HSL shift, keepHue (bool: colourize to hue)
 */
export function recolor(src, params, sx = 0, sy = 0, sw, sh, sprite = false, keepPx = false) {
  // sprite: the result is only ever drawn in 2D (a monster look, a prop): a raster sprite where rasterSprites() (frozen
  // above); not for three.js textures (an ImageBitmap ignores their flipY) or anything painted on afterwards.
  // keepPx: the recoloured pixels stay on the canvas as `_px` (ImageData) for its caller to read without a GPU
  // readback (floor atlases' grit colours, gfx/grit.js gritSamples), which then deletes them
  sw = sw ?? src.width; sh = sh ?? src.height;
  if (!params) { const c = sprite ? spriteCanvas(sw, sh, src) : makeCanvas(sw, sh); c.getContext('2d').drawImage(src, sx, sy, sw, sh, 0, 0, sw, sh); return frozen(c); }
  const c = sprite ? spriteCanvas(sw, sh) : makeCanvas(sw, sh);
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
  const livery = params.livery;     // [h(0-360), sat x, dark?]: a castle wing's livery. The coloured cloth and tinted plate take the hue; dark: blackened plate, the brightest colour gilt
  // colours are looked up on a 6-bit-per-channel table: big atlases hold millions of pixels but few colours
  const lut = new Int32Array(1 << 18).fill(-1);
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue;
    const q = ((d[i] >> 2) << 12) | ((d[i + 1] >> 2) << 6) | (d[i + 2] >> 2);
    let v = lut[q];
    if (v < 0) {
      let [h, s, l] = rgbToHsl(d[i], d[i + 1], d[i + 2]);
      if (colorize) { h = colorize[0] / 360; s = colorize[1] * (0.4 + s * 0.6); }
      if (livery) {
        if (livery[2]) { if (s > 0.42 && l > 0.2) { h = livery[0] / 360; s = clamp(s * livery[1], 0, 1); l = clamp(l + 0.03, 0, 1); } else { s *= 0.2; l = clamp(l * 0.86 - 0.02, 0, 1); } }   // dark, with gold highlights
        else if (s > 0.2 && l > 0.07 && !(h > 0.085 && h < 0.17 && s > 0.38 && l > 0.3)) { h = livery[0] / 360; s = clamp(s * livery[1], 0, 1); }   // (the art's own gilt stays gilt)
      }
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
  if (keepPx && !sprite) c._px = img;
  return frozen(c);
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

// ------------------------------------------------------------------ canvas colour filters everywhere
// ctx.filter is missing from some browsers (WebKit long left it out, and has drawn offscreen canvases unfiltered), so
// baked looks (tints, darkened corpses) would come out plain there. filterOK() tests it once on a pixel; where it
// fails, drawFiltered() draws plainly, then puts the colour filters (brightness, contrast, saturate, grayscale, sepia,
// hue-rotate, invert; others are skipped) through the pixels by the CSS spec's matrices.
let FOK;
export function filterOK() {
  if (FOK !== undefined) return FOK;
  if (globalThis.VELSCOUR_NO_CANVAS_FILTER) return (FOK = false);   // tests: the by-hand path in a browser that has filters
  try {
    const a = makeCanvas(1, 1), b = makeCanvas(1, 1), x = b.getContext('2d', { willReadFrequently: true });
    a.getContext('2d').fillStyle = '#fff'; a.getContext('2d').fillRect(0, 0, 1, 1);
    x.filter = 'brightness(0)'; x.drawImage(a, 0, 0); x.filter = 'none';
    FOK = x.getImageData(0, 0, 1, 1).data[0] < 128;
  } catch (e) { FOK = false; }
  return FOK;
}
const LUM = [0.2126, 0.7152, 0.0722];
function filterOps(f) {
  const ops = [];
  for (const [, fn, arg] of String(f).matchAll(/([a-z-]+)\(([^)]*)\)/g)) {
    let v = parseFloat(arg); if (/%/.test(arg)) v /= 100;
    if (fn === 'hue-rotate') { v = /rad/.test(arg) ? v : /turn/.test(arg) ? v * 2 * Math.PI : v * Math.PI / 180; const c = Math.cos(v), s = Math.sin(v); ops.push([0.213 + c * 0.787 - s * 0.213, 0.715 - c * 0.715 - s * 0.715, 0.072 - c * 0.072 + s * 0.928, 0.213 - c * 0.213 + s * 0.143, 0.715 + c * 0.285 + s * 0.140, 0.072 - c * 0.072 - s * 0.283, 0.213 - c * 0.213 - s * 0.787, 0.715 - c * 0.715 + s * 0.715, 0.072 + c * 0.928 + s * 0.072]); }
    else if (fn === 'saturate') ops.push([0.213 + 0.787 * v, 0.715 - 0.715 * v, 0.072 - 0.072 * v, 0.213 - 0.213 * v, 0.715 + 0.285 * v, 0.072 - 0.072 * v, 0.213 - 0.213 * v, 0.715 - 0.715 * v, 0.072 + 0.928 * v]);
    else if (fn === 'grayscale') { const k = 1 - Math.min(1, v); ops.push([LUM[0] + (1 - LUM[0]) * k, LUM[1] - LUM[1] * k, LUM[2] - LUM[2] * k, LUM[0] - LUM[0] * k, LUM[1] + (1 - LUM[1]) * k, LUM[2] - LUM[2] * k, LUM[0] - LUM[0] * k, LUM[1] - LUM[1] * k, LUM[2] + (1 - LUM[2]) * k]); }
    else if (fn === 'sepia') { const k = 1 - Math.min(1, v); ops.push([0.393 + 0.607 * k, 0.769 - 0.769 * k, 0.189 - 0.189 * k, 0.349 - 0.349 * k, 0.686 + 0.314 * k, 0.168 - 0.168 * k, 0.272 - 0.272 * k, 0.534 - 0.534 * k, 0.131 + 0.869 * k]); }
    else if (fn === 'brightness') ops.push([v, 0, 0, 0, v, 0, 0, 0, v]);
    else if (fn === 'contrast') ops.push([v, 0, 0, 0, v, 0, 0, 0, v, 0.5 - 0.5 * v]);
    else if (fn === 'invert') { const k = Math.min(1, v); ops.push([1 - 2 * k, 0, 0, 0, 1 - 2 * k, 0, 0, 0, 1 - 2 * k, k]); }
  }
  return ops;
}
/** Run filter f's colour functions through the pixels of (x, y, w, h) on ctx (the fallback for ctx.filter). */
export function filterPixels(ctx, f, x = 0, y = 0, w = ctx.canvas.width, h = ctx.canvas.height) {
  const ops = filterOps(f);
  x = Math.max(0, Math.floor(x)); y = Math.max(0, Math.floor(y));
  w = Math.min(ctx.canvas.width - x, Math.ceil(w) + 1); h = Math.min(ctx.canvas.height - y, Math.ceil(h) + 1);
  if (!ops.length || w <= 0 || h <= 0) return;
  const id = ctx.getImageData(x, y, w, h), d = id.data;
  for (let i = 0; i < d.length; i += 4) {
    if (!d[i + 3]) continue;
    let r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255;
    for (const m of ops) {
      const o = m[9] || 0, nr = r * m[0] + g * m[1] + b * m[2] + o, ng = r * m[3] + g * m[4] + b * m[5] + o, nb = r * m[6] + g * m[7] + b * m[8] + o;
      r = nr < 0 ? 0 : nr > 1 ? 1 : nr; g = ng < 0 ? 0 : ng > 1 ? 1 : ng; b = nb < 0 ? 0 : nb > 1 ? 1 : nb;
    }
    d[i] = r * 255 + 0.5; d[i + 1] = g * 255 + 0.5; d[i + 2] = b * 255 + 0.5;
  }
  ctx.putImageData(id, x, y);
}
/** ctx.drawImage(img, ...args) through filter f: the canvas filter where it works, else filterPixels on the drawn box. */
export function drawFiltered(ctx, f, img, ...args) {
  if (filterOK()) { ctx.filter = f; ctx.drawImage(img, ...args); ctx.filter = 'none'; return; }
  ctx.drawImage(img, ...args);
  const [dx, dy, dw, dh] = args.length >= 8 ? args.slice(4) : [args[0], args[1], args[2] ?? img.width, args[3] ?? img.height];
  const t = ctx.getTransform(), x0 = t.a * dx + t.e, y0 = t.d * dy + t.f, x1 = t.a * (dx + dw) + t.e, y1 = t.d * (dy + dh) + t.f;   // (scale and shift only)
  filterPixels(ctx, f, Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0), Math.abs(y1 - y0));
}
