// The loot filter (Settings > Loot filter): which item types and rarities auto-pickup grabs. Auto-play picks up only
// what it passes (plus upgrades it will wear, unless that's switched off); walking over an item picks it up only when
// it passes. Clicking or tapping an item always picks it up. Sealed treasures always pass. Lives in G.settings.lootFilter.
import { G } from '../state.js';

/** Filter rows: what each covers. Rarity rows hold the lowest rarity to keep (-1: none of them). */
export const FILTER_ROWS = [
  { k: 'weapon', name: 'Weapons', test: (it) => it.slot === 'weapon' },
  { k: 'offhand', name: 'Off-hands', test: (it) => it.slot === 'offhand' },
  { k: 'armor', name: 'Armor (head, body, hands, legs, feet)', test: (it) => it.slot !== 'weapon' && it.slot !== 'offhand' && it.slot !== 'ring' },
  { k: 'ring', name: 'Rings', test: (it) => it.slot === 'ring' },
];
export const FILTER_DEFAULT = { on: false, weapon: 0, offhand: 0, armor: 0, ring: 0, gems: true, upgrades: true, keep: false };

/** The filter's settings, filled with defaults (old settings have none). */
export function lootFilter() {
  const f = G.settings.lootFilter;
  if (!f || typeof f !== 'object') return (G.settings.lootFilter = { ...FILTER_DEFAULT });
  for (const k in FILTER_DEFAULT) if (f[k] === undefined) f[k] = FILTER_DEFAULT[k];
  return f;
}
/** The filter when it's switched on, else null. */
export const activeFilter = () => { const f = lootFilter(); return f.on ? f : null; };

/** Does item `it` pass the filter? (Everything passes while it's off.) */
export function filterPasses(it) {
  const f = activeFilter();
  if (!f || !it) return true;
  if (it.type === 'gem') return !!f.gems;
  if (it.type !== 'gear' || it.sealed) return true;
  const row = FILTER_ROWS.find((r) => r.test(it));
  const min = row ? f[row.k] : 0;
  return min >= 0 && (it.rarity || 0) >= min;
}
/** Should auto-play keep this item (store it in the chest) rather than sell it? */
export const filterKeeps = (it) => { const f = activeFilter(); return !!(f && f.keep && it && !it.sealed && filterPasses(it)); };
