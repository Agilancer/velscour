// Monster art from assets/sprites/enemies (tools/process_assets.py enemies): atlas loading plus a bounded
// cache of cut-out, palette-swapped, flash (white) and corpse (dark) canvases. See docs/ENEMY_ART.md.
import { makeCanvas, recolor } from './util.js';
import { ART_BY_ID } from '../data/bestiary.js';

const DIR = 'assets/sprites/enemies/';
const E = { meta: null, sheets: {}, loading: null };
const cache = new Map(); // LRU: `${id}|${mode}|${swap}` -> canvas
const CACHE_MAX = 160; // ~70 KB each; iOS caps total canvas memory

/** Fetch enemies.json and every sheet atlas (about 1.1 MB). Safe to call repeatedly. */
export function loadEnemyArt() {
  return E.loading || (E.loading = fetch(DIR + 'enemies.json')
    .then((r) => { if (!r.ok) throw new Error('Failed to load enemies.json'); return r.json(); })
    .then((meta) => Promise.all(Object.entries(meta).map(([key, s]) => new Promise((res) => {
      const img = new Image();
      img.onload = () => { E.sheets[key] = img; res(); };
      img.onerror = () => { console.warn('Failed to load ' + s.file); res(); };
      img.src = DIR + s.file;
    }))).then(() => { E.meta = meta; }))
    .catch((e) => { E.loading = null; throw e; }));
}

function cell(a) {
  const s = E.meta && E.meta[a.sheet];
  return s && E.sheets[a.sheet] ? s.cells[a.i] : null;
}

/** True once a look's art has loaded. */
export function enemyArtReady(id) {
  const a = ART_BY_ID[id];
  return !!(a && cell(a));
}

/**
 * The canvas for a monster look, or null while its sheet is loading. mode: '' (as seen), 'flash' (white
 * silhouette for hit flashes) or 'dark' (corpse). The canvas carries `_art = {fx}`: the feet's centre column.
 */
export function enemyImage(id, swap = null, mode = '') {
  const a = ART_BY_ID[id];
  const c = a && cell(a);
  if (!c) return null;
  const key = id + '|' + mode + '|' + (swap ? JSON.stringify(swap) : '');
  let img = cache.get(key);
  if (img) { cache.delete(key); cache.set(key, img); return img; }
  if (mode) {
    img = makeCanvas(c.w, c.h);
    const x = img.getContext('2d');
    x.drawImage(enemyImage(id, swap), 0, 0);
    x.globalCompositeOperation = 'source-atop';
    x.fillStyle = mode === 'flash' ? '#ffffff' : 'rgba(24,8,6,0.62)';
    x.fillRect(0, 0, c.w, c.h);
  } else img = recolor(E.sheets[a.sheet], swap, c.x, c.y, c.w, c.h);
  img._art = { fx: c.fx };
  cache.set(key, img);
  while (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value);
  return img;
}
