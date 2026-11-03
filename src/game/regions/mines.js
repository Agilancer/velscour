// THE DEEP RAIL MINES (docs/DEEP_RAIL_MINES.md): a dwarven mine overrun from below. Minecarts ride the lines from
// shaft to shaft, junction switches pick the line, it gets worse the deeper you go, and something waits at the Bottom.
// Five variants (world/mines.js MINE_VARIANTS): the Dwarven Mine, the Flooded Workings, the Crystal Vein, the
// Forge-Deep and the Collapsed Dig. The map is world/mines.js, the run game/mines.js, the rails and the cart gfx/mines.js.
import { registerRegion, regionVariant } from '../regions.js';
import { loadBiomeArt } from '../../core/assets.js';
import { generateMines, MINE_VARIANTS, mineVariant, applyMineLook } from '../../world/mines.js';
import { createMinesRun, minesQuest } from '../mines.js';
import { loadMinecart3D } from '../../gfx/mines.js';

// this level's variant, its look swapped into the mine biome (light, ambience, monster palette, roster)
const variant = (biome) => { const V = mineVariant(regionVariant(REG)?.id); if (biome) applyMineLook(biome, V); return V; };

const REG = registerRegion({
  id: 'deep_mines',
  words: ['mines', 'mine', 'deep mines', 'rail mines', 'deep rail mines', 'minecart', 'minecarts'],
  variants: MINE_VARIANTS.map(({ id, name }) => ({ id, name })),
  portal: 'A dwarven mine, overrun from below. Ride the minecarts down from shaft to shaft; a switch picks the line at each junction. Something waits at the Bottom.',
  townLine: 'The Deep Rail Mines lie beyond: minecarts from shaft to shaft, down to whatever waits at the Bottom.',
  // the variant's packs (rock, walls, props) and the cart's three.js bake; without three.js a flat cart stands in
  load: (biome) => Promise.all([loadBiomeArt(variant(biome).art), loadMinecart3D().catch((e) => console.warn(e))]),
  ready: () => true,
  generate: (depth, biome, seed) => generateMines(depth, biome, seed, variant(biome)),
  createRun: createMinesRun,
  intro: (world, gen) => `${gen.mine.variant.name}. Ride the carts down ${gen.mine.L} shafts; something waits at the Bottom. ${gen.mine.variant.hint}`,
  quest: minesQuest,
  winText: 'Bonus skill point for clearing the Deep Rail Mines!',
  get amb() { return mineVariant(regionVariant(REG)?.id).amb; },
});
