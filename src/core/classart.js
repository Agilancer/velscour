// Class art packs, made by tools/classart.py (see docs/CLASS_ART.md): per class a weapon/shield icon atlas and
// an effect strip per ability. Only the class being played is loaded, and effect strips only when first
// needed. Body armor and helmets (the hero's look) come from the gear art: core/gearart.js.
import { makeCanvas } from './util.js';

const BASE = 'assets/sprites/classes/';
const packs = { list: null, meta: {}, items: {}, strips: {} };

function loadImage(src) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => rej(new Error('Failed to load ' + src));
    img.src = src;
  });
}

/** Load a class's pack (JSON + item icons). Resolves to its meta, or null if the class has none. */
export async function loadClassArt(cls) {
  if (packs.meta[cls] !== undefined) return packs.meta[cls];
  try {
    if (!packs.list) packs.list = await fetch(BASE + 'packs.json').then((r) => (r.ok ? r.json() : []));
    if (!packs.list.includes(cls)) return (packs.meta[cls] = null);
    const [meta, items] = await Promise.all([
      fetch(`${BASE}${cls}/${cls}.json`).then((r) => { if (!r.ok) throw new Error('pack ' + cls); return r.json(); }),
      loadImage(`${BASE}${cls}/items.webp`),
    ]);
    packs.items[cls] = items;
    return (packs.meta[cls] = meta);
  } catch (e) {
    console.warn('class art unavailable for', cls, e);
    return (packs.meta[cls] = null);
  }
}

export const classArt = (cls) => packs.meta[cls] || null;

/** An effect strip ("fx/F12"); null until loaded (the first call starts the load). */
export function artStrip(cls, path) {
  const key = cls + '/' + path;
  const s = packs.strips[key];
  if (s) return s instanceof Image ? s : null;
  packs.strips[key] = loadImage(`${BASE}${cls}/${path}.webp`).then((img) => {
    packs.strips[key] = img;
    if (onLoad && !loadT) loadT = setTimeout(() => { loadT = 0; onLoad(); }, 120);
  }).catch(() => { packs.strips[key] = 'missing'; });
  return null;
}
let onLoad = null, loadT = 0;
/** Call `fn` (batched) whenever a strip finishes loading, e.g. to redraw open panels that show armor icons. */
export function onArtLoad(fn) { onLoad = fn; }

/** Start loading strips ahead of use (e.g. the effects of the skills on the bar). */
export function preloadStrips(cls, paths) { for (const p of paths) artStrip(cls, p); }

const iconCache = new Map();
/** Icon canvas for a catalog item (item.art), or null when its pack isn't loaded. */
export function artIcon(item, size = 48) {
  const meta = classArt(item.artCls);
  const e = meta && meta.items[item.art];
  if (!e) return null;
  const key = item.artCls + item.art + '|' + size;
  let c = iconCache.get(key);
  if (!c) {
    const [x, y, w, h] = e.rect;
    c = makeCanvas(size, size);
    const k = Math.min(size / w, size / h) * 0.94;
    c.getContext('2d').drawImage(packs.items[item.artCls], x, y, w, h, (size - w * k) / 2, (size - h * k) / 2, w * k, h * k);
    iconCache.set(key, c);
  }
  return c;
}
