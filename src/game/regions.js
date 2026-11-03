// New regions (docs/NEW_REGIONS.md): the Ghost Train, the Endless Siege, the Deep Rail Mines and the Great Hunt.
// Each region module (src/game/regions/<id>.js) calls registerRegion() once; game.js, the Quest Log and Velscour's
// skull read the registry, so a region needs no code of its own in those files.
//
// A region:
//   id        the biome id in BETA_BIOMES (src/data/biomes.js)
//   words     skull messages that teleport there (lower case), e.g. ['train', 'ghost train']
//   portal    the portal dialog's line before entering
//   townLine  the Quest Log's line in town when the portal opens on it
//   load(biome)                    -> Promise: art/three.js this level needs (before generate)
//   ready()                        -> bool: false falls back to the Forsaken Wilds (three.js failed to load)
//   generate(depth, biome, seed)   -> gen: { map, start, exit, spawns, chests, props, torches, ... } like the others
//   createRun(world, gen, biome, depth, win) -> the run (game.js sets it as world.overworldScenario); call win() once
//   intro(world, gen)              -> the log line on arrival
//   quest(sc, step)                -> Quest Log steps while inside (step(done, html) is the Quest Log's helper)
//   winText   the log line on a first clear ('Bonus skill point for ...')
//   amb       an ambience key (src/core/audio.js AMB); default the biome id
//   wilds     true: Forsaken Wilds extras (rain/night rolls) apply
//   castleArt true: the Castle pack stays loaded after the build (releaseLevelArt in game.js; the Siege's masonry)
//   minLevel  the hero's level it opens at (default none): below it the skull word, the HAIL VELSCOUR! list and a
//             saved portal all refuse (game.js reads regionNeeds)
//   variants  [{ id, name }, ...] its five variants. A level rolls one, never the one seen last; the skull word plus
//             a number, id or name ('train 3', 'siege frost') or the HAIL VELSCOUR! list picks one. load() and
//             generate() read the level's variant with regionVariant(region).
import { G } from '../state.js';

export const REGIONS = {};
export function registerRegion(r) { REGIONS[r.id] = r; return r; }
export const regionOf = (biome) => (biome && REGIONS[biome.id]) || null;
/** The level a hero of this level still needs for this biome's region (its minLevel), or 0 when he may go. */
export function regionNeeds(biome, level) {
  const r = regionOf(biome);
  return r && r.minLevel && (level || 1) < r.minLevel ? r.minLevel : 0;
}
/** A region's variant by number (1-based), id or a piece of its name, or null. */
export function findVariant(r, want) {
  const vs = r?.variants || [], w = String(want ?? '').trim().toLowerCase();
  if (!w) return null;
  return vs[Number(w) - 1] || vs.find((v) => v.id === w) || vs.find((v) => v.name.toLowerCase().includes(w)) || null;
}
/** The region a skull message names and the variant it asks for: { region, want } ('train', 'train 3'), or null. */
export function parseRegionWord(message) {
  const m = String(message || '').trim().toLowerCase().replace(/\s+/g, ' ');
  for (const r of Object.values(REGIONS)) for (const w of r.words || []) {
    if (m === w) return { region: r, want: null };
    if (m.startsWith(w + ' ') && findVariant(r, m.slice(w.length + 1))) return { region: r, want: m.slice(w.length + 1) };
  }
  return null;
}
/** The region a skull message names, or null. */
export const regionByWord = (message) => parseRegionWord(message)?.region || null;
/** Roll the variant the next level of this region is built as: the one asked for (G.regionWant[id], used once),
 * else any but the one seen last (G.char.lastRegionVariant). */
export function rollRegionVariant(r) {
  if (!r?.variants?.length) return null;
  const c = G.char, want = G.regionWant?.[r.id];
  if (G.regionWant) delete G.regionWant[r.id];
  let v = findVariant(r, want);
  if (!v) { const last = c?.lastRegionVariant?.[r.id], pool = r.variants.filter((q) => q.id !== last); v = pool[Math.floor(Math.random() * pool.length)] || r.variants[0]; }
  (G.regionNext ||= {})[r.id] = v;
  if (c) (c.lastRegionVariant ||= {})[r.id] = v.id;
  return v;
}
/** The variant this level of the region is built as (rolled by loadLevelArt; rolled here if a test skipped it). */
export const regionVariant = (r) => G.regionNext?.[r.id] || rollRegionVariant(r);
