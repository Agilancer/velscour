// THE DEEP RAIL MINES (docs/DEEP_RAIL_MINES.md): a dwarven mine overrun from below. Minecarts ride the lines from
// shaft to shaft, junction switches pick the line, it gets worse the deeper you go, and something waits at the Bottom.
// The map is world/mines.js, the run game/mines.js, the rails and the three.js cart gfx/mines.js.
import { registerRegion } from '../regions.js';
import { loadBiomeArt } from '../../core/assets.js';
import { generateMines, MINE_ART } from '../../world/mines.js';
import { createMinesRun, minesQuest } from '../mines.js';
import { loadMinecart3D } from '../../gfx/mines.js';

registerRegion({
  id: 'deep_mines',
  words: ['mines', 'mine', 'deep mines', 'rail mines', 'deep rail mines', 'minecart', 'minecarts'],
  portal: 'A dwarven mine, overrun from below. Ride the minecarts down from shaft to shaft; a switch picks the line at each junction. Something waits at the Bottom.',
  townLine: 'The Deep Rail Mines lie beyond: minecarts from shaft to shaft, down to whatever waits at the Bottom.',
  // the mine's packs (rock, walls, crates and tools) and the cart's three.js bake; without three.js a flat cart stands in
  load: () => Promise.all([loadBiomeArt(MINE_ART), loadMinecart3D().catch((e) => console.warn(e))]),
  ready: () => true,
  generate: (depth, biome, seed) => generateMines(depth, biome, seed),
  createRun: createMinesRun,
  intro: (world, gen) => `The lifts are dead. Ride the carts down ${gen.mine.L} shafts. Something waits at the Bottom.`,
  quest: minesQuest,
  winText: 'Bonus skill point for clearing the Deep Rail Mines!',
  amb: 'catacombs',
});
