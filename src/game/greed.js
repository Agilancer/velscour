// The Greed lever (0-5): pull it up and the depths fight back harder (more champions, bigger packs, more monster
// traits, tougher monsters) for richer drops. Every depth cleared with the lever up adds that many stacks to the
// Hoard, a loot bonus that keeps growing; a death spends it all and drops the lever back to 0.
// The lever is read when a depth is built: game.buildDungeon -> greedPacks / greedWorld; happenings ticks
// greedTick (marks every enemy as it appears, ambushes too); game.brokeThrough -> greedCleared;
// game.onPlayerDeath -> greedDeath. Saves keep c.greed and c.hoard (both optional).
import { G } from '../state.js';
import { chance, clamp } from '../core/util.js';
import { UI } from '../ui/ui.js';

export const GREED_MAX = 5;
export const HOARD_MAX = 50; // stacks
const HOARD_LOOT = 0.02; // +2% drops and gold per stack (+100% at the cap)

export const greedOf = (c = G.char) => clamp((c && c.greed) | 0, 0, GREED_MAX);
export const hoardOf = (c = G.char) => clamp((c && c.hoard) | 0, 0, HOARD_MAX);

/** What lever level g does (also the tooltip's numbers). */
export function greedMods(g, hoard = 0) {
  return {
    champ: 0.07 * g, // a pack's leader turns champion
    extra: 0.12 * g, // extra monsters per pack, as a share
    trait: 0.08 * g, // a pack without a trait gains one
    hp: 1 + 0.1 * g, dmg: 1 + 0.06 * g, xp: 1 + 0.1 * g,
    loot: (1 + 0.25 * g) * (1 + HOARD_LOOT * hoard), gold: (1 + 0.3 * g) * (1 + HOARD_LOOT * hoard), mf: 20 * g + 2 * hoard,
  };
}

/** Move the lever (the HUD's - / + buttons). It takes hold from the next depth. */
export function setGreed(v) {
  const c = G.char;
  if (!c) return;
  const g = clamp(v | 0, 0, GREED_MAX);
  if (g === greedOf(c)) return;
  c.greed = g;
  const here = G.world && G.world.kind === 'dungeon' && G.world.greed !== g;
  UI.log(g ? `<b style="color:#ffc040">Greed ${g}</b>${here ? ' (from the next depth)' : ''}: more champions, bigger packs and tougher monsters for ×${greedMods(g).loot.toFixed(2)} drops.` : `Greed lever down${here ? ' (from the next depth)' : ''}.`, '#ffc040');
}

/** Pack spawns of a fresh depth (game.buildDungeon): bigger packs, champion leaders. Returns the spawns to use. */
export function greedPacks(spawns, g) {
  if (!g) return spawns;
  const M = greedMods(g);
  return spawns.map((s) => {
    if (!s.n || ['raid', 'boss'].includes(s.rank)) return s;
    const n = s.n + Math.floor(s.n * M.extra + Math.random());
    return { ...s, n, champ: s.rank === 'normal' && chance(M.champ), trait: chance(M.trait) };
  });
}

/** The world's loot dials once the depth is built (after its omen set world.lootMul / goldMul). */
export function greedWorld(world, c = G.char) {
  const g = greedOf(c), h = g ? hoardOf(c) : 0;
  world.greed = g; world.hoard = h;
  if (!g && !h) return;
  const M = greedMods(g, h);
  world.lootMul = (world.lootMul || 1) * M.loot;
  world.goldMul = (world.goldMul || 1) * M.gold;
  world.mfAdd = (world.mfAdd || 0) + M.mf;
}

/** Tougher monsters, as each one appears (packs, ambushes, the horde). */
export function greedTick(world, dt) {
  if (!world.greed || (world.greedT = (world.greedT || 0) - dt) > 0) return;
  world.greedT = 0.4;
  const M = greedMods(world.greed);
  for (const m of world.creatures) {
    if (m.team !== 'enemy' || m._greed || m.dead || m.summon) continue;
    m._greed = true;
    m.maxHp *= M.hp; m.hp *= M.hp; m.dmg *= M.dmg; m.xp *= M.xp;
  }
}

/** A depth cleared with the lever up: the Hoard grows by the lever's level. */
export function greedCleared(world, c = G.char) {
  const g = world && world.greed;
  if (!c || !g || world.greedPaid) return;
  world.greedPaid = true;
  const before = hoardOf(c);
  c.hoard = Math.min(HOARD_MAX, before + g);
  if (c.hoard > before) UI.log(`<b style="color:#ffc040">The Hoard grows</b> to ${c.hoard} (+${Math.round(HOARD_LOOT * c.hoard * 100)}% drops and gold while greedy). Die and it's gone.`, '#ffc040');
}

/** Death spends the Hoard and drops the lever. Returns true if there was anything to lose. */
export function greedDeath(c = G.char) {
  if (!c || (!greedOf(c) && !hoardOf(c))) return false;
  const h = hoardOf(c);
  c.greed = 0; c.hoard = 0;
  UI.log(`Your greed undoes you: the lever drops to 0${h ? ` and the Hoard of ${h} is lost` : ''}.`, '#ff9040');
  return true;
}
