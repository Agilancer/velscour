// Monster art from assets/sprites/enemies (tools/process_assets.py enemies): atlas loading plus a bounded
// cache of cut-out, palette-swapped, flash (white) and corpse (dark) canvases. See docs/ENEMY_ART.md.
import { recolor, silhouette, swapKey, decoded, lruMark, lruTrim } from './util.js';
import { loadReplacementArt, replacementImage } from './replacementart.js';
import { ART_BY_ID } from '../data/bestiary.js';
import { heavenlyEnemyImage, preloadApprovedHeavenlyArtwork, CACHE as heavenlyCache } from '../gfx/heavenlymonsters.js';
import { loadSeaOfSandPack, seaOfSandArtCell, seaOfSandEnemyImage, cache as sandCache } from '../gfx/seaofsand.js';

const DIR = 'assets/sprites/enemies/';
const EAGER = /^(set1|minions)\//; // fetched with the meta; the rest (set2, ~5 MB) loads per level as looks need it
const PETS = /^familiars\//; // pet sheets (~2.6 MB): fetched in the background once the meta is in
const E = { meta: null, sheets: {}, loading: null, sheet: {} }; // sheet: key -> load promise
const cache = new Map(); // LRU: `${id}|${swap}` -> base canvas (flash/corpse silhouettes hang off it: util.silhouette)
const CACHE_MAX = 160; // ~70 KB each; iOS caps total canvas memory
export const FLASH = '#ffffff', CORPSE = 'rgba(24,8,6,0.62)';

function loadSheet(key) {
  const s = E.meta && E.meta[key];
  if (!s) return Promise.resolve();
  return E.sheet[key] || (E.sheet[key] = new Promise((res) => {
    const img = new Image();
    img.onload = () => decoded(img).then((d) => { E.sheets[key] = d; res(); });
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

/** Load the sheets these art ids are on (unknown or empty ids are skipped). A level's call also lets go of the
 * per-level sheets (set 2) it doesn't use: decoded, each is 2-7 MB that a long run would otherwise keep. */
export function loadArtFor(ids, release = false) {
  const keys = [...new Set(ids.map(id=>{
    const a=ART_BY_ID[id];
    if (a?.sheet === 'sea_of_sand') return null;
    return a?.sheet !== 'heavenly/generated' ? a?.sheet : null;
  }).filter(Boolean))];
  if (release) for (const k of Object.keys(E.sheets)) {
    if (EAGER.test(k) || PETS.test(k) || keys.includes(k)) continue;
    E.sheets[k].close?.(); delete E.sheets[k]; delete E.sheet[k]; // fetched again (HTTP cache) if a later level wants it
  }
  return Promise.all([
    ids.some((id) => id && id.startsWith('va_')) ? loadReplacementArt() : null,
    ids.some((id) => id && id.startsWith('ss_')) ? loadSeaOfSandPack() : null,
    ids.some((id) => id && id.startsWith('hv_')) ? preloadApprovedHeavenlyArtwork().catch((e) => console.warn(e)) : null,
    loadEnemySheets(keys),
  ]);
}

// The monster sprite caches: marked before a level's warm-up, trimmed after it (util.lruMark/lruTrim), so sprites
// only earlier levels used (and their flash/corpse silhouettes and GPU textures) don't pile up over a long run.
const levelCaches = () => [cache, heavenlyCache, sandCache];
export function markArtCaches() { levelCaches().forEach(lruMark); }
export function trimArtCaches() { levelCaches().forEach(lruTrim); }

function cell(a) {
  if (a?.sheet === 'sea_of_sand') return seaOfSandArtCell(a.i);
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
  if (id && id.startsWith('hv_')) return !!heavenlyEnemyImage(id);
  const a = ART_BY_ID[id];
  return !!(a && cell(a));
}

/**
 * The canvas for a monster look, or null while its sheet is loading. mode: '' (as seen), 'flash' (white
 * silhouette for hit flashes) or 'dark' (corpse). The canvas carries `_art = {fx}`: the feet's centre column.
 */
export function enemyImage(id, swap = null, mode = '') {
  if (id && id.startsWith('ss_')) return seaOfSandEnemyImage(id, swap, mode);
  if (id && id.startsWith('hv_')) return heavenlyEnemyImage(id, swap, mode);
  if (id && id.startsWith('va_')) return replacementImage(id, swap, mode);
  const a = ART_BY_ID[id];
  const c = a && cell(a);
  if (!c) return null;
  const key = id + '|' + swapKey(swap);
  let img = cache.get(key);
  if (img) { cache.delete(key); cache.set(key, img); }
  else {
    img = recolor(E.sheets[a.sheet], swap, c.x, c.y, c.w, c.h);
    img._art = { fx: c.fx };
    cache.set(key, img);
    while (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value);
  }
  return mode ? silhouette(img, mode === 'flash' ? FLASH : CORPSE) : img;
}
