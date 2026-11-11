// Where attribute points go when the game spends them for the player (auto-play, and the Stats panel's Auto button).
// Each class has its own plan: first the stat its weapon / off-hand needs (kept at the requirement of gear of the
// hero's level, gear bonuses counted), then its primary attribute (+damage to every skill) and Vitality (life) by
// weight. Slime Lords (primary Vitality) put the rest into their weapon's stat.
import { CLASSES } from '../data/classes.js';
import { BASE_REQ_STAT, charEffectiveStat } from '../data/items.js';
import { MAX_LEVEL } from '../data/depth.js';

const ATTR_KEYS = ['str', 'dex', 'vit', 'int'];

/** The class's split of free points as {attr: weight}. */
export function attrWeights(classId) {
  const C = CLASSES[classId];
  if (!C) return { vit: 1 };
  if (C.primary === 'vit') return { vit: 7, [BASE_REQ_STAT[C.weapon] || 'str']: 3 };
  return { [C.primary]: 6, vit: 4 };
}

/** The stats the class's weapon and off-hand require. */
export const reqAttrs = (classId) => {
  const C = CLASSES[classId];
  return C ? [...new Set([BASE_REQ_STAT[C.weapon], C.offhand && BASE_REQ_STAT[C.offhand]].filter(Boolean))] : [];
};

/** Spend all of c.statPoints by the class's plan. Returns the number of points spent. */
export function allocateAttrs(c) {
  const C = CLASSES[c.classId];
  if (!C || !(c.statPoints > 0)) return 0;
  const W = attrWeights(c.classId), req = reqAttrs(c.classId);
  const target = c.level > 1 ? 20 + (Math.min(c.level, MAX_LEVEL) - 1) * 2 : 0; // a hero-level weapon's requirement (items.js itemReqStat)
  const spent = (k) => Math.max(0, (c.attrs[k] || 0) - (C.base[k] || 0));
  let n = 0;
  while (c.statPoints > 0) {
    let k = target > 0 ? req.find((s) => charEffectiveStat(c, s) < target) : null;
    if (!k) {
      let best = Infinity;
      for (const a of ATTR_KEYS) if (W[a]) { const v = (spent(a) + 1) / W[a]; if (v < best) { best = v; k = a; } }
    }
    c.attrs[k]++; c.statPoints--; n++;
  }
  return n;
}
