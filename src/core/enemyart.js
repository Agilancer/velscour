// Monster art from assets/sprites/enemies (tools/process_assets.py enemies): atlas loading plus a bounded
// cache of cut-out, palette-swapped, flash (white) and corpse (dark) canvases. See docs/ENEMY_ART.md.
import { makeCanvas, recolor } from './util.js';
import { loadReplacementArt, replacementImage } from './replacementart.js';
import { ART_BY_ID } from '../data/bestiary.js';

const DIR = 'assets/sprites/enemies/';
const EAGER = /^(set1|minions)\//; // fetched with the meta; the rest (set2, ~5 MB) loads per level as looks need it
const PETS = /^familiars\//; // pet sheets (~2.6 MB): fetched in the background once the meta is in
const E = { meta: null, sheets: {}, loading: null, sheet: {} }; // sheet: key -> load promise
const cache = new Map(); // LRU: `${id}|${mode}|${swap}` -> canvas
const CACHE_MAX = 160; // ~70 KB each; iOS caps total canvas memory

function loadSheet(key) {
  const s = E.meta && E.meta[key];
  if (!s) return Promise.resolve();
  return E.sheet[key] || (E.sheet[key] = new Promise((res) => {
    const img = new Image();
    img.onload = () => { E.sheets[key] = img; res(); };
    img.onerror = () => { console.warn('Failed to load ' + s.file); res(); }; // not retried: pixel sprites stand in
    img.src = DIR + s.file;
  }));
}

/** Fetch enemies.json and the set 1 / minion atlases (about 1.4 MB). Safe to call repeatedly. */
export function loadEnemyArt() {
  return E.loading || (E.loading = fetch(DIR + 'enemies.json')
    .then((r) => { if (!r.ok) throw new Error('Failed to load enemies.json'); return r.json(); })
    .then((meta) => {
      E.meta = meta;
      const keys = Object.keys(meta);
      return Promise.all(keys.filter((k) => EAGER.test(k)).map(loadSheet)).then(() => { E.pets = Promise.all(keys.filter((k) => PETS.test(k)).map(loadSheet)); });
    })
    .catch((e) => { E.loading = null; throw e; }));
}

/** Resolves once every pet sheet (familiars/) has loaded, too. */
export function loadPetArt() {
  return loadEnemyArt().then(() => E.pets);
}

/** Load these sheets (all of them if no list). A new level awaits its monsters' and looks' sheets (loadArtFor). */
export async function loadEnemySheets(keys) {
  await loadEnemyArt();
  await Promise.all((keys || Object.keys(E.meta)).map(loadSheet));
}

/** Load the sheets these art ids are on (unknown or empty ids are skipped). */
export function loadArtFor(ids) {
  return Promise.all([
    ids.some((id) => id && id.startsWith('va_')) ? loadReplacementArt() : null,
    loadEnemySheets([...new Set(ids.filter((id) => ART_BY_ID[id] && ART_BY_ID[id].sheet).map((id) => ART_BY_ID[id].sheet))]),
  ]);
}

function cell(a) {
  const s = E.meta && E.meta[a.sheet];
  if (s && !E.sheets[a.sheet]) loadSheet(a.sheet); // drawn before its level asked: the pixel sprite stands in meanwhile
  return s && E.sheets[a.sheet] ? s.cells[a.i] : null;
}

/** The stored cell ({x, y, w, h, fx, oh}) of an art id, or null while its sheet is loading. */
export function artCell(id) {
  const a = ART_BY_ID[id];
  return a ? cell(a) : null;
}

/** True once a look's art has loaded. */
export function enemyArtReady(id) {
  if (id && id.startsWith('va_')) return !!replacementImage(id);
  const a = ART_BY_ID[id];
  return !!(a && cell(a));
}

/**
 * The canvas for a monster look, or null while its sheet is loading. mode: '' (as seen), 'flash' (white
 * silhouette for hit flashes) or 'dark' (corpse). The canvas carries `_art = {fx}`: the feet's centre column.
 */
export function enemyImage(id, swap = null, mode = '') {
  if (id && id.startsWith('va_')) return replacementImage(id, swap, mode);
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
