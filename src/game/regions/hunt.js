// THE GREAT HUNT (docs/GREAT_HUNT.md): one colossal beast per hunt, tracked by its signs through its woods, worn down
// over three fights, cornered in its lair. The territory is world/hunt.js, the hunt itself game/hunt.js.
import { registerRegion } from '../regions.js';
import { loadBiomeArt, biomeTileSet } from '../../core/assets.js';
import { BIOME_BY_ID } from '../../data/biomes.js';
import { loadDarkForestTrees, darkForestTreesReady } from '../../gfx/darkforest.js';
import { generateHunt } from '../../world/hunt.js';
import { createHuntRun, huntQuest } from '../hunt.js';

registerRegion({
  id: 'great_hunt',
  words: ['hunt', 'great hunt', 'the great hunt', 'beast'],
  portal: 'Track the beast by its signs. Wound it, follow its blood, corner it in its lair.',
  townLine: 'The Great Hunt lies beyond: one great beast, tracked by its signs, worn down, cornered in its lair.',
  // the Mountainside's floors and the Dark Forest's props and towering trees
  load: () => Promise.all([loadBiomeArt(BIOME_BY_ID.dark_forest), loadDarkForestTrees()]),
  ready: () => darkForestTreesReady() && biomeTileSet(BIOME_BY_ID.dark_forest).pack === 'dark_forest',
  generate: (depth, biome, seed) => generateHunt(depth, biome, seed),
  createRun: (world, gen, biome, depth, win) => createHuntRun(world, gen, biome, depth, win),
  intro: (world) => `${world.overworldScenario.def.name} hunts these woods. Follow its signs.`,
  quest: huntQuest,
  winText: 'Bonus skill point for the kill!',
  amb: 'dark_forest',
  wilds: true,
});
