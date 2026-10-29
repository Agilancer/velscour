// Permanent hero upgrades between battles: levels (gold), ascension (duplicates), gear (equip, refine with copies).
import { CARDS, SLOTS, LEVEL_CAP, ASCEND_DUPES, levelCost } from '../data/cards.js';
import { unitDef } from './power.js';

export const levelUpCost = (e) => levelCost(e.lvl);
export function canLevel(save, id) { const e = save.cards['h:' + id]; return !!e && e.n > 0 && e.lvl < LEVEL_CAP[e.stars - 1] && save.gold >= levelUpCost(e); }
export function levelUp(save, id) {
  if (!canLevel(save, id)) return false;
  const e = save.cards['h:' + id];
  save.gold -= levelUpCost(e); e.lvl++; save.stats.levelups = (save.stats.levelups || 0) + 1;
  return true;
}
export const ascendNeed = (e) => (e.stars >= 5 ? Infinity : ASCEND_DUPES[e.stars - 1]);
export function canAscend(save, id) { const e = save.cards['h:' + id]; return !!e && e.n > 0 && (e.dupes || 0) >= ascendNeed(e); }
export function ascend(save, id) {
  if (!canAscend(save, id)) return false;
  const e = save.cards['h:' + id];
  e.dupes -= ascendNeed(e); e.stars++;
  return true;
}
/** How many copies of a gear card are worn (by anyone but `except`). */
export function wornCount(save, gid, except = null) {
  let n = 0;
  for (const [k, e] of Object.entries(save.cards)) if (k.startsWith('h:') && k !== except && e.equip) for (const s of SLOTS) if (e.equip[s] === gid) n++;
  return n;
}
export const freeCopies = (save, gid, except) => (save.cards[gid]?.n || 0) - wornCount(save, gid, except) - (save.cards[gid]?.refine || 0) * 0;
/** Gear hero `id` may wear in `slot`: matching class (relics: anyone), with a copy free. */
export function wearable(save, id, slot) {
  const cls = CARDS['h:' + id].cls, out = [];
  for (const [gid, e] of Object.entries(save.cards)) {
    const c = CARDS[gid];
    if (!c || c.type !== slot || e.n <= 0) continue;
    if (c.cls && c.cls !== cls) continue;
    if (freeCopies(save, gid, 'h:' + id) <= 0 && save.cards['h:' + id].equip?.[slot] !== gid) continue;
    out.push(c);
  }
  return out;
}
export function equip(save, id, slot, gid) {
  const e = save.cards['h:' + id];
  if (!e) return false;
  if (!gid) { delete e.equip[slot]; return true; }
  if (!wearable(save, id, slot).some((c) => c.id === gid)) return false;
  e.equip[slot] = gid;
  return true;
}
/** Refining a gear card +1 (to +5) uses one spare copy of it. */
export function canRefine(save, gid) { const e = save.cards[gid]; return !!e && (e.refine || 0) < 5 && freeCopies(save, gid) >= 2; }
export function refine(save, gid) {
  if (!canRefine(save, gid)) return false;
  const e = save.cards[gid];
  e.n--; e.refine = (e.refine || 0) + 1;
  return true;
}
/** The best gear for each of hero id's slots by battle power (what auto-play and "Auto-equip" do). Returns changes made. */
export function autoEquip(save, id) {
  let changed = 0;
  for (const slot of SLOTS) {
    const e = save.cards['h:' + id], cur = e.equip[slot];
    let best = cur, bp = unitDef(id, save).power;
    for (const c of wearable(save, id, slot)) {
      if (c.id === cur) continue;
      e.equip[slot] = c.id;
      const p = unitDef(id, save).power;
      if (p > bp * 1.001) { bp = p; best = c.id; }
    }
    if (best) e.equip[slot] = best; else delete e.equip[slot];
    if (best !== cur) changed++;
  }
  return changed;
}
