// Class art packs, made by tools/classart.py (see docs/CLASS_ART.md): per class an armor pose strip per
// outfit, an item icon atlas and an effect strip per ability. Only the class being played is loaded, and
// armor/effect strips only when first needed, so a phone holds a few small images, not the whole pack.
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

/** An armor ("armor/P07") or effect ("fx/F12") strip; null until loaded (the first call starts the load). */
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

/** The outfit a hero of `cls` shows wearing `body` (a catalog body armor, else the pack's first, plainest one). */
export function outfitOf(cls, body) {
  const meta = classArt(cls);
  if (!meta) return null;
  return body && body.artCls === cls && meta.armor[body.art] ? body.art : Object.keys(meta.armor)[0];
}

/** One pose frame of an outfit (default CAST1, the rest pose) fitted in w x h, or null until loaded. */
export function outfitImage(cls, id, w, h, frame = 6) {
  const meta = classArt(cls);
  const e = meta && meta.armor[id];
  const img = e && artStrip(cls, 'armor/' + id);
  if (!img) return null;
  const key = `${cls}${id}|${frame}|${w}x${h}`;
  let c = iconCache.get(key);
  if (!c) {
    const [cw, ch] = e.cell;
    // crop to the frame's opaque box, so the figure fills the icon
    const t = makeCanvas(cw, ch), tx = t.getContext('2d');
    tx.drawImage(img, frame * cw, 0, cw, ch, 0, 0, cw, ch);
    const d = tx.getImageData(0, 0, cw, ch).data;
    let x0 = cw, y0 = ch, x1 = 0, y1 = 0;
    for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) if (d[(y * cw + x) * 4 + 3]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
    const k = Math.min(w / bw, h / bh) * 0.94;
    c = makeCanvas(w, h);
    c.getContext('2d').drawImage(t, x0, y0, bw, bh, (w - bw * k) / 2, (h - bh * k) / 2, bw * k, bh * k);
    iconCache.set(key, c);
  }
  return c;
}

/** Start loading strips ahead of use (e.g. the effects of the skills on the bar). */
export function preloadStrips(cls, paths) { for (const p of paths) artStrip(cls, p); }

const iconCache = new Map();
/** Icon canvas for a catalog item (item.art), or null when its pack isn't loaded. */
export function artIcon(item, size = 48) {
  const meta = classArt(item.artCls);
  if (meta && meta.armor[item.art]) return outfitImage(item.artCls, item.art, size, size);
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
