// THE ENDLESS SIEGE (docs/ENDLESS_SIEGE.md): a keep under an undead horde that never stops. Hold the gates in waves,
// mend them and load the ballistae between; the last wave brings the horde's lord, and holding it opens the exit.
// The map: world/siege.js; the run: game/siege.js; its moving parts drawn: gfx/siege.js.
import { registerRegion } from '../regions.js';
import { loadCastlePack, castleRamparts } from '../../gfx/castle.js';
import { loadBiomeArt } from '../../core/assets.js';
import { BIOME_BY_ID } from '../../data/biomes.js';
import { generateSiege, keepSet } from '../../world/siege.js';
import { createSiegeRun, siegeWaves } from '../siege.js';

registerRegion({
  id: 'endless_siege',
  words: ['siege', 'endless siege', 'the endless siege', 'hold the walls'],
  portal: 'A keep under siege by the dead. Hold its gates through every wave; mend them and load the ballistae between. Holding the last opens the exit.',
  townLine: 'The portal opens on <b>The Endless Siege</b>: hold the keep against the dead, wave on wave.',
  // the Castle's wall masonry and the Castle Keep pack's ballistae, winches, standard and flagstones
  load: () => Promise.all([loadCastlePack(), loadBiomeArt(BIOME_BY_ID.castle_keep)]),
  ready: () => !!castleRamparts() && !!keepSet(),
  castleArt: true,   // keep the Castle pack loaded while here (game.js releaseLevelArt)
  generate: (depth, biome, seed) => {
    for (let k = 0; k < 6; k++) { try { return generateSiege(depth, biome, (seed + k * 7919) >>> 0); } catch (e) { if (k === 5) throw e; } }
  },
  createRun: (world, gen, biome, depth, win) => createSiegeRun(world, gen, biome, depth, win),
  intro: (world) => `The Endless Siege: the dead are at the walls. Load the ballistae, mend the gates, then sound the horn under the standard. Hold ${siegeWaves(world.depth)} waves.`,
  quest(sc, step) {
    let h = '';
    h += step(sc.wave > 0 || sc.phase === 'wave' || sc.completed, 'Load the ballistae and mend the gates, then sound the horn under the keep\'s standard.');
    h += step(sc.completed, `Hold the walls: wave <b>${Math.min(sc.wave + (sc.completed ? 0 : 1), sc.total)}/${sc.total}</b> <span class="dim">— the keep's resolve ${Math.round(sc.resolve)}%</span>.`);
    h += step(false, '<span class="dim">While you are inside, the gates hold the dead on their lines. The dead inside the walls wear the keep\'s resolve down.</span>');
    h += step(sc.completed, 'Break the horde\'s lord in the last wave.');
    h += step(sc.completed, sc.completed ? 'The exit in the courtyard is open.' : 'Victory opens the exit in the courtyard.');
    return h;
  },
  winText: 'Bonus skill point for breaking the Endless Siege!',
  amb: 'necropolis',
  wilds: true,
});
