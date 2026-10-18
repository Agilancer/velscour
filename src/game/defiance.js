// Defiance and town blessings: the hero-side bonuses that live on the save (G.char), read by Player.recompute.
// Defiance: every death inside one five-depth block (it ends in a BOSS ROOM) adds a stack, up to MAX_DEFIANCE:
// more life, more damage, less damage taken. Clearing the block's BOSS ROOM (a new threshold) spends it. So a wall
// can cost a few deaths, but each try is easier, and by the 6th-8th the hero breaks through.
// Blessings: a town happening (game/happenings.js) can bless the hero for the next few depths.
import { blockStart } from '../data/depth.js';

export const MAX_DEFIANCE = 8;
export const DEFIANCE = { life: 10, dmg: 8, reduce: 5 }; // per stack
const ZERO = { life: 0, dmg: 0, reduce: 0, mf: 0, gf: 0, xp: 0 };

/** What Defiance and the blessing add right now: { life, dmg, reduce, mf, gf, xp } (percent). */
export function heroBonus(c) {
  if (!c) return ZERO;
  const n = c.defiance ? c.defiance.n : 0, b = c.blessing && c.blessing.left > 0 ? c.blessing.stats : null;
  if (!n && !b) return ZERO;
  return {
    life: n * DEFIANCE.life + ((b && b.life) || 0), dmg: n * DEFIANCE.dmg + ((b && b.dmg) || 0), reduce: n * DEFIANCE.reduce + ((b && b.reduce) || 0),
    mf: (b && b.mf) || 0, gf: (b && b.gf) || 0, xp: (b && b.xp) || 0,
  };
}

/** A death at `depth`: one more stack if it's the same block as the last death, else a fresh first stack. */
export function addDefiance(c, depth) {
  const block = blockStart(depth);
  if (c.defiance && c.defiance.block === block) c.defiance.n = Math.min(MAX_DEFIANCE, c.defiance.n + 1);
  else c.defiance = { block, n: 1 };
  return c.defiance.n;
}

/** Cleared `depth`: past the end of the Defiance block, it's spent. Returns true when it was. */
export function clearDefiance(c, depth) {
  if (!c.defiance || depth < c.defiance.block + 4) return false;
  c.defiance = null;
  return true;
}

/** Entering a new depth uses up one depth of the blessing. */
export function tickBlessing(c) {
  if (!c.blessing) return;
  if (--c.blessing.left <= 0) c.blessing = null;
}

export function defianceText(n) {
  return `+${n * DEFIANCE.life}% life, +${n * DEFIANCE.dmg}% damage, ${n * DEFIANCE.reduce}% less damage taken`;
}
