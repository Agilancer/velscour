// Ground grit: pebbles, dirt specks, dust and grass tufts scattered over the floor tiles. The colours are sampled from
// each floor tile's own (palette-swapped) art, so they always fit the biome; town transition tiles get the most, mixing
// both materials they blend. Baked once per world into a few overlay sprites per floor variant, one drawImage a tile.
import { makeCanvas, rasterSprites } from '../core/util.js';
import { G } from '../state.js';
import { TW, TH, HW, HH } from '../core/view.js';

const VARIANTS = 4, U = 2; // U: world px per grit pixel (the camera shows tiles small)
let gritFrame = -1, gritMade = 0;
const hash = (x, y, s) => { let h = (x * 374761393 + y * 668265263 + s * 2246822519) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return (h ^ (h >>> 16)) >>> 0; };
const css = (c, f, a = 1) => {
  const m = f >= 0 ? (v) => v + (255 - v) * f : (v) => v * (1 + f);
  return `rgba(${m(c[0]) | 0},${m(c[1]) | 0},${m(c[2]) | 0},${a})`;
};

const cellKey = (e) => e.sx + ',' + e.sy + ',' + e.w + ',' + e.h;
/** Up to 40 opaque colours from inside the tile's diamond (g: the world's grit state; list: the world's floor tiles). */
function sample(f, g, list) {
  const img = f.img, k = cellKey(f);
  if (img && img._grit && img._grit.has(k)) return img._grit.get(k);
  const image = img instanceof HTMLImageElement && img.complete && img.naturalWidth > 0;
  if (!rasterSprites() || !(image || img instanceof HTMLCanvasElement)) return pick(img, f.sx, f.sy, f.w, f.h);
  // Desktop: the colours of every cell of this atlas the world's floors use, from one copy of it to the CPU. Reading the
  // cells one by one as they come into view was a GPU readback each (a GPU canvas, or an image Chromium keeps decoded on
  // the GPU), and each waits for the GPU's whole queue: ~0.5 s with vsync off. Same pixels (a 1:1 copy).
  let m = image ? img._grit : g.atlas.get(img); // an image never changes: its colours keep for later worlds
  if (!m || !m.has(k)) {
    const cells = new Map([[k, f]]);
    // plain entries only: a castle floor's img is a getter that recolours its atlas on first use (and reads its grit then)
    for (const e of list) if (e && Object.getOwnPropertyDescriptor(e, 'img')?.value === img) cells.set(cellKey(e), e);
    const got = gritSamples(img, [...cells.values()].map((e) => ({ x: e.sx, y: e.sy, w: e.w, h: e.h })));
    if (m) for (const [a, b] of got) m.set(a, b); else m = got;
    if (image) img._grit = m; else g.atlas.set(img, m);
  }
  return m.has(k) ? m.get(k) : null;
}
/** Every cell's colours ([{x, y, w, h}] in img), from one copy to the CPU of the part of img they cover. Read while a
 *  floor atlas is built (where raster sprites are on), it is no GPU readback mid-frame later. Same pixels. A recoloured
 *  atlas hands over its CPU pixels (`img._px`, util.recolor keepPx): no readback at all. */
export function gritSamples(img, cells) {
  const m = new Map();
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const c of cells) { x0 = Math.min(x0, c.x); y0 = Math.min(y0, c.y); x1 = Math.max(x1, c.x + c.w); y1 = Math.max(y1, c.y + c.h); }
  if (!(x1 > x0 && y1 > y0)) return m;
  x0 = Math.floor(x0); y0 = Math.floor(y0); x1 = Math.ceil(x1); y1 = Math.ceil(y1);
  const t = makeCanvas(x1 - x0, y1 - y0), tx = t.getContext('2d', { willReadFrequently: true });
  try {
    if (img._px) tx.putImageData(img._px, -x0, -y0, x0, y0, x1 - x0, y1 - y0);
    else tx.drawImage(img, x0, y0, x1 - x0, y1 - y0, 0, 0, x1 - x0, y1 - y0);
  } catch (e) { return m; }
  for (const { x, y, w, h } of cells) m.set(x + ',' + y + ',' + w + ',' + h, pick(t, x - x0, y - y0, w, h));
  t.width = t.height = 0;
  return m;
}
// The cell's own pixels (a 1:1 copy, exact from any image or canvas), sampled on a 32x16 grid in JS. A shrinking
// drawImage gave different colours for the same tile with Chromium's decode cache and canvas history, and with them
// a different layout of specks (the colours steer the speck rolls) from one visit, or build, to the next.
let cell = null;   // one CPU-side canvas for every sample (a new one per floor variant was a canvas each)
function pick(img, sx, sy, sw, sh) {
  const w = Math.max(1, Math.round(sw)), h = Math.max(1, Math.round(sh));
  const c = cell || (cell = makeCanvas(1, 1).getContext('2d', { willReadFrequently: true }));
  if (c.canvas.width < w || c.canvas.height < h) { c.canvas.width = Math.max(c.canvas.width, w); c.canvas.height = Math.max(c.canvas.height, h); }
  let d;
  try { c.clearRect(0, 0, w, h); c.drawImage(img, sx, sy, sw, sh, 0, 0, w, h); d = c.getImageData(0, 0, w, h).data; } catch (e) { return null; }
  const out = [], at = (x, y, k) => d[(y * w + x) * 4 + k];
  for (let y = 2; y < 14; y += 2) for (let i = 4; i < 28; i += 2) {
    if (Math.abs(i - 16) / 16 + Math.abs(y - 8) / 8 > 0.8) continue;
    // the grid pixel's centre in the cell, bilinear between its four nearest pixels
    const u = Math.min(w - 1, Math.max(0, (i + 0.5) * w / 32 - 0.5)), v = Math.min(h - 1, Math.max(0, (y + 0.5) * h / 16 - 0.5));
    const x0 = u | 0, y0 = v | 0, x1 = Math.min(w - 1, x0 + 1), y1 = Math.min(h - 1, y0 + 1), fx = u - x0, fy = v - y0;
    const px = (k) => (at(x0, y0, k) * (1 - fx) + at(x1, y0, k) * fx) * (1 - fy) + (at(x0, y1, k) * (1 - fx) + at(x1, y1, k) * fx) * fy;
    if (px(3) > 200) out.push([Math.round(px(0)), Math.round(px(1)), Math.round(px(2))]);
  }
  return out.length ? out : null;
}

function bake(cols, seed, n) {
  const c = makeCanvas(TW, TH), x = c.getContext('2d');
  let r = seed;
  const rnd = () => ((r = Math.imul(r ^ (r >>> 15), 2654435761) + 0x9e3779b9 | 0) >>> 0) / 4294967296;
  for (let k = 0; k < n; k++) {
    // a point well inside the diamond
    let px, py;
    for (let g = 0; g < 8; g++) {
      px = rnd() * TW; py = rnd() * TH;
      if (Math.abs(px - HW) / HW + Math.abs(py - HH) / HH < 0.78) break;
    }
    px = (px / U | 0) * U; py = (py / U | 0) * U;
    const col = cols[(rnd() * cols.length) | 0];
    const green = col[1] > col[0] * 0.97 && col[1] > col[2] * 1.15;
    const roll = rnd();
    if (green && roll < 0.55) { // grass tuft: a few blades, dark root, lit tips
      const blades = 2 + ((rnd() * 3) | 0);
      for (let b = 0; b < blades; b++) {
        const h = 2 + ((rnd() * 3) | 0), bx = px + (b - (blades >> 1)) * U;
        x.fillStyle = css(col, -0.4); x.fillRect(bx, py - (h - 1) * U, U, h * U);
        x.fillStyle = css(col, 0.3); x.fillRect(bx, py - (h - 1) * U, U, U);
      }
    } else if (roll < 0.3) { // pebble: lit top, shadow under
      const w = 1 + ((rnd() * 2) | 0);
      x.fillStyle = 'rgba(0,0,0,0.45)'; x.fillRect(px, py + U, (w + 1) * U, U);
      x.fillStyle = css(col, 0.18 + rnd() * 0.2); x.fillRect(px, py, w * U, U);
      if (w > 1) { x.fillStyle = css(col, -0.15); x.fillRect(px, py + U, w * U, U); }
    } else if (roll < 0.78) { // dirt / grit speck
      x.fillStyle = css(col, -0.35 - rnd() * 0.3, 0.9); x.fillRect(px, py, (1 + ((rnd() * 1.6) | 0)) * U, U);
    } else { // dust / sand fleck
      x.fillStyle = css(col, 0.35 + rnd() * 0.25, 0.7); x.fillRect(px, py, U, U);
    }
  }
  return c;
}

/** The grit overlay for floor tile (tx, ty) of variant v drawn with entry f, or null. */
export function gritAt(world, f, v, tx, ty, force = false) {
  const g = world.grit || (world.grit = { cols: new Map(), spr: new Map(), atlas: new Map() });
  const town = !!world.townTiles && !['castle','sea_of_sand','act2_town'].includes(world.biome?.id), trans = town && v >= 6;
  const h = hash(tx, ty, 7);
  if ((h & 255) >= (trans ? 256 : town ? 150 : 105)) return null;
  const key = v * VARIANTS + ((h >>> 8) % VARIANTS);
  let s = g.spr.get(key);
  if (s === undefined) {
    // Spread fresh tile sampling/canvas baking over multiple phone frames.
    // Heavy new biome floors may contain dozens of variants in one viewport;
    // synchronous getImageData on all of them in one render causes a hitch.
    if (G.touch && !force) {
      if (gritFrame !== G.frame) { gritFrame = G.frame; gritMade = 0; }
      if (gritMade >= 2) return null;
      gritMade++;
    }
    let cols = g.cols.get(v);
    if (cols === undefined) g.cols.set(v, cols = sample(f, g, world.townTiles || world.tileset?.floors || []));
    s = cols ? bake(cols, key * 9973 + 17, trans ? 22 : town ? 12 : 8) : null;
    g.spr.set(key, s);
  }
  return s;
}
