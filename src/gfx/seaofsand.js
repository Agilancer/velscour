// Runtime access to the authored Sea of Sand frame atlases.
import { makeCanvas, recolor, silhouette, swapKey } from '../core/util.js';
import { isoFix } from './isofix.js';

const DIR = 'assets/tiles/sea_of_sand/';
let loading = null, meta = null, images = null;
export const cache = new Map(); // ss_ monster sprites, LRU (enemyart.js trims it per level)

function loadImage(name) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load ${DIR}${name}.webp`));
    img.src = `${DIR}${name}.webp`;
  });
}

export function loadSeaOfSandPack() {
  if (images) return Promise.resolve();
  return loading || (loading = Promise.all([
    fetch(`${DIR}pack.json`).then((r) => { if (!r.ok) throw new Error('Sea of Sand metadata missing'); return r.json(); }),
    ...['floor','scatter','tree','monster','boss','cliff'].map(loadImage),
  ]).then(([m, ...atlas]) => {
    meta = m;
    images = Object.fromEntries(['floor','scatter','tree','monster','boss','cliff'].map((k, i) => [k, atlas[i]]));
  }).catch((e) => { loading = null; throw e; }));
}

/** Let the pack's atlases and monster sprites go once no level needs them; loadSeaOfSandPack fetches them again. */
export function releaseSeaOfSandPack() { if (!images) return; images = null; loading = null; cache.clear(); }

export function seaOfSandFrames(category) { return meta?.atlases[category] || []; }
export function seaOfSandFloorTiles() {
  return seaOfSandFrames('floor').map((f) => ({ img: images.floor, sx:f.x, sy:f.y, w:f.w, h:f.h, lum:0.02, seamless:true, name:f.name }));
}

export function seaOfSandObject(name, category = 'scatter') {
  const frame = seaOfSandFrames(category).find((f) => f.name === name || f.name.endsWith('_'+name) || f.id === name);
  if (!frame) return null;
  const [px, py] = frame.pivot || [frame.w / 2, frame.h];
  const footprint = category === 'tree' ? 0.72 : frame.w > 190 ? 0.6 : 0.42;
  const fix = category === 'scatter' && isoFix('sea_of_sand', frame.name); // re-projected onto the 2:1 grid
  return { img: images[category], sx:frame.x, sy:frame.y, w:frame.w, h:frame.h,
    ox:-px, oy:-py, ...fix, fp:footprint, block:category === 'tree', name:frame.name, isometric:true };
}

export function seaOfSandCliff(name) {
  const f = seaOfSandFrames('cliff').find((v) => v.name === name || v.id === name);
  if (!f) return null;
  const [px, py] = f.pivot || [f.w / 2, f.h];
  return { img:images.cliff, sx:f.x, sy:f.y, w:f.w, h:f.h, ox:-px, oy:-py,
    fp:0.2, block:true, name:f.name, isometric:true, cliff:true };
}

export function seaOfSandArtCell(i) {
  const f = [...seaOfSandFrames('monster'), ...seaOfSandFrames('boss')][i];
  return f ? { x:f.x, y:f.y, w:f.w, h:f.h, fx:(f.pivot?.[0] ?? f.w/2), oh:f.h, source:'sea_of_sand' } : null;
}

export function seaOfSandEnemyImage(id, swap = null, mode = '') {
  if (!images || !id?.startsWith('ss_')) return null;
  const key = `${id}|${swapKey(swap)}`;
  let img = cache.get(key);
  if (img) { cache.delete(key); cache.set(key, img); }
  else {
    const a = [...seaOfSandFrames('monster'), ...seaOfSandFrames('boss')].find((f) => f.id === id.slice(3));
    if (!a) return null;
    img = swap ? recolor(images[a.category], swap, a.x, a.y, a.w, a.h) : makeCanvas(a.w, a.h);
    if (!swap) img.getContext('2d').drawImage(images[a.category], a.x, a.y, a.w, a.h, 0, 0, a.w, a.h);
    img._art = { fx:(a.pivot?.[0] ?? a.w/2) };
    cache.set(key, img);
    while (cache.size > 100) cache.delete(cache.keys().next().value);
  }
  // flash/corpse silhouettes hang off the base sprite (util.silhouette)
  return mode ? silhouette(img, mode === 'flash' ? '#fff' : 'rgba(24,8,6,.62)') : img;
}
