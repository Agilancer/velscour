// THE SNOWY SUMMIT (docs/SNOWY_SUMMIT.md): where the Mountainside's summit leads (game.continueTo), and the skull's
// "summit". Ridgelines and plateaus up a mountain range in three.js, one of five snow-swapped bosses on the peak.
import { registerRegion } from '../regions.js';
import { loadBiomeArt, biomeTileSet } from '../../core/assets.js';
import { BIOME_BY_ID } from '../../data/biomes.js';
import { loadAlpine3D, alpine3dReady } from '../../gfx/alpine3d.js';
import { generateSummit } from '../../world/summit.js';
import { createSummitRun, summitQuest } from '../summit.js';

registerRegion({
  id: 'snowy_summit',
  words: ['summit', 'snowy summit', 'the snowy summit', 'snow', 'peak', 'ridge'],
  portal: 'Walk the thin ridgelines up the range, fight the groups that hold its plateaus, and take the peak from what waits there.',
  townLine: 'The Snowy Summit lies beyond: ridgelines and plateaus up a mountain range to its peak.',
  load: (biome) => Promise.all([loadBiomeArt(biome), loadAlpine3D()]),
  ready: () => alpine3dReady() && biomeTileSet(BIOME_BY_ID.snowy_summit).pack === 'snowy_summit',
  generate: (depth, biome, seed) => generateSummit(depth, biome, seed),
  createRun: (world, gen, biome, depth, win) => createSummitRun(world, gen, biome, depth, win),
  intro: (world) => `The Snowy Summit: ${world.summitRun.plateaus.length} plateaus and their gates lie along the ridgelines between you and the peak.`,
  quest: summitQuest,
  winText: 'Bonus skill point for taking the Snowy Summit!',
  amb: 'snowy_summit',
});
