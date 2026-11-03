// THE ENDLESS SIEGE (docs/ENDLESS_SIEGE.md): a keep under an undead horde that never stops. Hold the gates in waves,
// mend them and load the ballistae between; the last wave brings the horde's lord, and holding it opens the exit.
// The map: world/siege.js; the run: game/siege.js; its moving parts drawn: gfx/siege.js.
import { registerRegion, regionVariant } from '../regions.js';
import { loadCastlePack, castleRamparts } from '../../gfx/castle.js';
import { loadBiomeArt } from '../../core/assets.js';
import { BIOME_BY_ID } from '../../data/biomes.js';
import { generateSiege, keepSet, SIEGE_VARIANTS } from '../../world/siege.js';
import { createSiegeRun, siegeWaves } from '../siege.js';

const R = registerRegion({
  id: 'endless_siege',
  // five keeps (world/siege.js SIEGE_VARIANTS): their walls, gates, ground, horde, lord and twist
  variants: SIEGE_VARIANTS.map((v) => ({ id: v.id, name: v.name })),
  words: ['siege', 'endless siege', 'the endless siege', 'hold the walls'],
  portal: 'A keep under siege by the dead. Hold its gates through every wave; mend them and load the ballistae between. Holding the last opens the exit.',
  townLine: 'The portal opens on <b>The Endless Siege</b>: hold the keep against the dead, wave on wave.',
  // the Castle's wall masonry and the Castle Keep pack's ballistae, winches, standard and flagstones
  load: () => Promise.all([loadCastlePack(), loadBiomeArt(BIOME_BY_ID.castle_keep)]),
  ready: () => !!castleRamparts() && !!keepSet(),
  castleArt: true,   // keep the Castle pack loaded while here (game.js releaseLevelArt)
  generate: (depth, biome, seed) => {
    const v = regionVariant(R)?.id || 'keep';
    for (let k = 0; k < 6; k++) { try { return generateSiege(depth, biome, (seed + k * 7919) >>> 0, v); } catch (e) { if (k === 5) throw e; } }
  },
  createRun: (world, gen, biome, depth, win) => createSiegeRun(world, gen, biome, depth, win),
  intro: (world, gen) => `${gen.lay.name}: ${gen.lay.blurb}. Load the ballistae, mend the gates, then sound the horn under the standard. Hold ${siegeWaves(world.depth)} waves.`,
  quest(sc, step) {
    let h = '';
    h += step(sc.wave > 0 || sc.phase === 'wave' || sc.completed, 'Load the ballistae and mend the gates, then sound the horn under the keep\'s standard.');
    h += step(sc.completed, `Hold the walls: wave <b>${Math.min(sc.wave + (sc.completed ? 0 : 1), sc.total)}/${sc.total}</b> <span class="dim">— the keep's resolve ${Math.round(sc.resolve)}%</span>.`);
    h += step(false, '<span class="dim">While you are inside, the gates hold the dead on their lines. The dead inside the walls wear the keep\'s resolve down.</span>');
    const tw = { frost: 'Ice glazes the field and slows the dead; one wave comes in a <b>blizzard</b> (the ballistae see half as far).',
      fire: 'Tip the <b>fire-pots</b> on the walk over the gates onto the crowds below; one wave comes <b>burning</b>.',
      rockfall: '<b>Rocks fall</b> on the dead in the pass. One gate only: hold it.',
      plague: 'The dead rise from the <b>mire</b>, some close to the walls; their lord spreads the <b>plague</b>.' }[sc.twist];
    if (tw) h += step(false, `<span class="dim">${tw}</span>`);
    h += step(sc.completed, 'Break the horde\'s lord in the last wave.');
    h += step(sc.completed, sc.completed ? 'The exit in the courtyard is open.' : 'Victory opens the exit in the courtyard.');
    return h;
  },
  winText: 'Bonus skill point for breaking the Endless Siege!',
  amb: 'necropolis',
  wilds: true,
});
