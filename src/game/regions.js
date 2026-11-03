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
export const REGIONS = {};
export function registerRegion(r) { REGIONS[r.id] = r; return r; }
export const regionOf = (biome) => (biome && REGIONS[biome.id]) || null;
/** The region a skull message names, or null. */
export function regionByWord(message) {
  const m = String(message || '').trim().toLowerCase();
  for (const r of Object.values(REGIONS)) if ((r.words || []).includes(m)) return r;
  return null;
}
