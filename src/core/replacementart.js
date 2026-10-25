// Painted replacements. Loaded at boot; one atlas and a bounded cache for phones.
import { makeCanvas, recolor, silhouette, swapKey, decoded } from './util.js';

let sheet, meta, loading;
const cache = new Map();
const feet = new Map();
/**
 * The feet's centre column of a cell, in its pixels (creature.js anchors art there and mirrors about it). The atlas
 * stores fx as a fraction (0.5 for every cell), which creature.js read as pixels: every painted replacement was drawn
 * from its left edge, so a turn threw it a whole sprite width sideways (Velscour looked to face away). Measured from
 * the opaque pixels of the cell's bottom eighth, once per cell.
 */
function feetX(id, cell) {
  if (feet.has(id)) return feet.get(id);
  let fx = (cell.fx <= 1 ? cell.fx : cell.fx / cell.w) * cell.w;
  try {
    const c = makeCanvas(cell.w, cell.h), g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(sheet, cell.x, cell.y, cell.w, cell.h, 0, 0, cell.w, cell.h);
    const d = g.getImageData(0, 0, cell.w, cell.h).data;
    let bottom = -1;
    for (let y = cell.h - 1; y >= 0 && bottom < 0; y--) for (let x = 0; x < cell.w; x++) if (d[(y * cell.w + x) * 4 + 3] > 40) { bottom = y; break; }
    if (bottom >= 0) {
      let sum = 0, n = 0;
      for (let y = Math.max(0, bottom - Math.ceil(cell.h / 8)); y <= bottom; y++) for (let x = 0; x < cell.w; x++) if (d[(y * cell.w + x) * 4 + 3] > 40) { sum += x; n++; }
      if (n) fx = sum / n;
    }
  } catch (e) { /* no canvas (tests under Node): keep the stored centre */ }
  feet.set(id, fx);
  return fx;
}
export function loadReplacementArt() {
  return loading || (loading = Promise.all([
    fetch('assets/sprites/replacements/atlas.json').then((r) => { if (!r.ok) throw new Error('Replacement catalog unavailable'); return r.json(); }),
    new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img); img.onerror = () => reject(new Error('Replacement atlas unavailable'));
      img.src = 'assets/sprites/replacements/atlas.webp';
    }),
  ]).then(async ([m, image]) => { meta = m; sheet = await decoded(image); }).catch((e) => { loading = null; throw e; }));
}

export function replacementImage(id, swap = null, mode = '') {
  id = id.replace(/^va_/, '');
  const cell = meta && meta[id];
  if (!cell || !sheet) return null;
  const key = `${id}|${swapKey(swap)}`;
  let image = cache.get(key);
  if (image) { cache.delete(key); cache.set(key, image); }
  else {
    image = recolor(sheet, swap, cell.x, cell.y, cell.w, cell.h);
    image._art = { fx: feetX(id, cell) };
    cache.set(key, image);
    while (cache.size > 192) cache.delete(cache.keys().next().value);
  }
  // flash/corpse silhouettes hang off the base sprite (util.silhouette)
  return mode ? silhouette(image, mode === 'flash' ? '#ffffff' : 'rgba(24,8,6,0.62)') : image;
}

// Fit without stretching. Tint overlays preserve the original pixel texture and alpha.
export function replacementIcon(id, size = 48, tint = null, fraction = .88) {
  const src = replacementImage(id);
  if (!src) return null;
  const key = `icon|${id}|${size}|${tint}|${fraction}`;
  let image = cache.get(key);
  if (image) return image;
  image = makeCanvas(size, size);
  const ctx = image.getContext('2d'), k = size * fraction / Math.max(src.width, src.height);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(src, (size-src.width*k)/2, (size-src.height*k)/2, src.width*k, src.height*k);
  if (tint) {
    ctx.globalCompositeOperation = 'source-atop'; ctx.globalAlpha = .24; ctx.fillStyle = tint;
    ctx.fillRect(0, 0, size, size); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }
  cache.set(key, image);
  while (cache.size > 192) cache.delete(cache.keys().next().value);
  return image;
}
