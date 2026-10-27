// The Abyssal Rifts' honour board (docs/ENDGAME.md): one Firestore document per player and class,
// boards/{classId}/entries/{uid}, written through game/cloud.js's backend when a signed-in player beats their own best
// (game/rifts.js riftWin), read for the board dialog (ui/rifts.js). Saves are local, so this is an honour board: a cheat
// can post anything, and the build is recorded beside every entry so a reader can judge it.
import { G } from '../state.js';
import { Cloud } from './cloud.js';
import { itemName } from '../data/items.js';
import { marksTotal } from './marks.js';

/** What a run records of the hero: the bar's skills and the worn gear's names, rarities and levels. */
export function buildSnapshot(c) {
  const gear = {};
  for (const [slot, it] of Object.entries(c.equip || {})) if (it) gear[slot] = { name: itemName(it), rarity: it.rarity | 0, ilvl: it.ilvl | 0, relic: it.relic || null, upg: it.upg | 0 };
  return { bar: (c.bar || []).filter(Boolean).slice(0, 15), gear, level: c.level | 0, marks: marksTotal() };
}

export const Board = {
  /** Post this hero's run (only when signed in; the backend decides the rest). Resolves false when it could not. */
  async submit(c, tier, time) {
    if (!Cloud.signedIn || !Cloud.backend) return false;
    const rec = { v: 1, name: String(c.name || 'Hero').slice(0, 24), cls: c.classId, tier: tier | 0, time: Math.round(time * 10) / 10, at: Date.now(), level: c.level | 0, marks: marksTotal(), build: buildSnapshot(c) };
    return Cloud.putBoard(c.classId, rec);
  },
  /** The top n entries of a class, best tier first then the fastest time; [] when offline or signed out. */
  async top(cls, n = 50) {
    if (!Cloud.backend) return [];
    const all = await Cloud.board(cls);
    return all.filter((e) => e && Number.isFinite(e.tier) && Number.isFinite(e.time)).sort((a, b) => b.tier - a.tier || a.time - b.time).slice(0, n);
  },
};
export { G };
