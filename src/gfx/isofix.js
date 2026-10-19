// Scatter sprites re-projected onto the 2:1 iso grid by tools/isofix.py (assets/tiles/isofix/; docs/ISOFIX.md).
// The sprite getters (biomeTileSet, townObject, castleObject, seaOfSandObject) use a fixed copy wherever one exists.
const DIR = 'assets/tiles/isofix/';
let meta = null;
const images = {};

function loadImage(src) {
  return new Promise((res, rej) => { const img = new Image(); img.onload = () => res(img); img.onerror = () => rej(new Error('Failed to load ' + src)); img.src = src; });
}

/** Load the index and every atlas (~0.6 MB); without them the sources' own sprites are drawn. */
export function preloadIsoFix() {
  if (meta || typeof Image === 'undefined') return Promise.resolve();
  return fetch(DIR + 'isofix.json').then((r) => (r.ok ? r.json() : null)).then((m) => m && Promise.all(
    Object.entries(m).map(([k, v]) => loadImage(DIR + v.file).then((img) => { images[k] = img; }))).then(() => { meta = m; }))
    .catch((e) => console.warn('VELSCOUR iso fixes unavailable:', e.message));
}

/** The fixed atlas of a source ('pack:<id>', 'town', 'castle', 'sea_of_sand'), or null. */
export function isoFixImage(source) { return (meta && meta[source] && images[source]) || null; }

/** The fixed rect of `name` in `source`: {img, sx, sy, w, h, ox, oy} (ox/oy native px from the ground pivot), or null. */
export function isoFix(source, name) {
  const s = meta && meta[source] && meta[source].sprites[name];
  return s ? { img: images[source], sx: s[0], sy: s[1], w: s[2], h: s[3], ox: s[4], oy: s[5] } : null;
}
