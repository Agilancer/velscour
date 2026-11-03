// MOUNTAINSIDE (docs/MOUNTAINSIDE.md): a switchback climb in three.js, in the regular overworld rotation. Its summit
// leads straight on into the Snowy Summit (regions/summit.js), whose peak opens the exit.
import { registerRegion } from '../regions.js';
import { loadBiomeArt, biomeTileSet } from '../../core/assets.js';
import { BIOME_BY_ID } from '../../data/biomes.js';
import { loadDarkForestTrees, darkForestTreesReady } from '../../gfx/darkforest.js';
import { loadAlpine3D, alpine3dReady } from '../../gfx/alpine3d.js';
import { generateMountain } from '../../world/mountain.js';
import { createMountainRun, mountainQuest } from '../mountain.js';
import { G } from '../../state.js';

registerRegion({
  id: 'mountainside',
  words: ['mountain', 'mountainside', 'mountains', 'climb'],
  portal: 'Climb the switchback trail to the summit, fighting all the way. Ledges a hop high can be climbed; cliffs cannot. Above the summit the trail climbs on into the Snowy Summit.',
  townLine: 'The Mountainside lies beyond: a switchback climb up the cliffs to its summit, and above it the Snowy Summit.',
  // the mountain floors (town + Dark Forest packs), its pines, the Snowy Summit pack for the top bands, three.js
  load: () => Promise.all([loadBiomeArt(BIOME_BY_ID.dark_forest), loadDarkForestTrees(), loadBiomeArt(BIOME_BY_ID.snowy_summit), loadAlpine3D()]),
  ready: () => alpine3dReady() && darkForestTreesReady() && biomeTileSet(BIOME_BY_ID.snowy_summit).pack === 'snowy_summit',
  generate: (depth, biome, seed) => generateMountain(depth, biome, seed),
  createRun: (world, gen, biome, depth) => createMountainRun(world, gen, biome, depth, () => G.game.continueTo('snowy_summit')),
  intro: () => 'The trail switchbacks up the cliffs to the summit, and things hold it all the way. A ledge a hop high can be climbed; the cliffs cannot.',
  quest: mountainQuest,
  winText: 'Bonus skill point for taking the summit!',
  amb: 'mountainside',
});
