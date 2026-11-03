// THE GREAT HUNT (docs/GREAT_HUNT.md): one colossal beast per hunt, tracked by its signs through its territory, worn
// down over three fights, cornered in its lair. Five territories (data/huntlands.js), one rolled per level ('hunt 3',
// 'hunt fen'). The territory is world/hunt.js, the hunt itself game/hunt.js.
import { registerRegion, regionVariant } from '../regions.js';
import { loadBiomeArt, biomeTileSet } from '../../core/assets.js';
import { BIOME_BY_ID } from '../../data/biomes.js';
import { loadDarkForestTrees, darkForestTreesReady } from '../../gfx/darkforest.js';
import { loadSeaOfSandPack } from '../../gfx/seaofsand.js';
import { HUNT_LANDS } from '../../data/huntlands.js';
import { generateHunt } from '../../world/hunt.js';
import { createHuntRun, huntQuest } from '../hunt.js';

// each land's odds of rain and of nightfall (game.js reads gen.variant.look for the Wilds' weather)
const WEATHER = { wood: { rain: 0.3, night: 0.25 }, tundra: { rain: 0, night: 0.15 }, fen: { rain: 0.45, night: 0.3 }, badlands: { rain: 0, night: 0.2 }, crags: { rain: 0.25, night: 0.1 } };

const R = registerRegion({
  id: 'great_hunt',
  words: ['hunt', 'great hunt', 'the great hunt', 'beast'],
  minLevel: 10, // the user's rule: no hunting before level 10
  variants: HUNT_LANDS.map(({ id, name }) => ({ id, name })),
  portal: 'Track the beast by its signs. Wound it, follow its blood, corner it in its lair.',
  townLine: 'The Great Hunt lies beyond: one great beast, tracked by its signs, worn down, cornered in its lair.',
  // the Dark Forest's floors, props and towering trees (and the town's) for every land; the Badlands add the Sea of Sand
  load: () => Promise.all([loadBiomeArt(BIOME_BY_ID.dark_forest), loadDarkForestTrees(), regionVariant(R)?.id === 'badlands' ? loadSeaOfSandPack() : null]),
  ready: () => darkForestTreesReady() && biomeTileSet(BIOME_BY_ID.dark_forest).pack === 'dark_forest',
  generate: (depth, biome, seed) => {
    const v = regionVariant(R), gen = generateHunt(depth, biome, seed, v?.id);
    gen.variant = { id: gen.hunt.land, name: v?.name || HUNT_LANDS[0].name, look: WEATHER[gen.hunt.land] };
    return gen;
  },
  createRun: (world, gen, biome, depth, win) => createHuntRun(world, gen, biome, depth, win),
  intro: (world) => { const sc = world.overworldScenario; return sc.land.intro(sc.def.name); },
  quest: huntQuest,
  winText: 'Bonus skill point for the kill!',
  amb: 'dark_forest',
  wilds: true,
});
