// Painted replacements. Loaded at boot; one atlas and a bounded cache for phones.
import { makeCanvas, recolor, silhouette, swapKey, decoded } from './util.js';

let sheet, meta, loading;
const cache = new Map();
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
    image._art = { fx: cell.fx };
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
