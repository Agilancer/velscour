// Velscour Unbound (docs/ENDGAME.md): the rematch three Abyssal Keys open. The keys (c.keys) drop from BOSS ROOM bosses
// past depth 600 under Heresy rank 10 and from Abyssal Rift Guardians from tier 10 (keyChance, read by loot.dropLoot).
// The fight itself is Velscour's five phases (game/velscour.js) with the Court of the Abyss, the Pact, the Abyssal Crown
// and the Unbound Chains on top (setupUnbound, called by setupVelscour when world.unbound). game.enterUnbound builds it.
import { G } from '../state.js';
import { clamp } from '../core/util.js';
import { KEYS_RANK, worldRank } from './heresies.js';
import { endgameUnlocked } from './endgame.js';

export const UNBOUND_KEYS = 3;
export const keysOf = (c = G.char) => ((c && c.keys) | 0);
/** Three keys and the Endgame open: the altar (and the skull's "unbound") may start the rematch. */
export const unboundReady = (c = G.char) => !!c && keysOf(c) >= UNBOUND_KEYS && endgameUnlocked(c);
/** The chance a slain raid boss drops an Abyssal Key. */
export function keyChance(world, m) {
  if (!world || !m || !m.isRaid || m.raid?.court) return 0;
  if (world.rift) return world.rift.tier >= 10 ? clamp(0.12 + 0.005 * world.rift.tier, 0, 0.5) : 0;
  if (world.depth > 600 && worldRank(world) >= KEYS_RANK) return clamp(0.06 + 0.002 * (world.depth - 600), 0, 0.25);
  return 0;
}
/** Spend the keys on the rematch. False if the hero can't. */
export function spendKeys(c = G.char) {
  if (!unboundReady(c)) return false;
  c.keys -= UNBOUND_KEYS;
  return true;
}
/** The rematch's extra mechanics, on Velscour's fight V (game/velscour.js VelscourFight): filled in by setupUnbound. */
export function setupUnbound(V) {
  V.unbound = true;
  return V;
}
