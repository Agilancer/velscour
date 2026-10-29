// Auto-play between battles: picks the squad, equips and refines gear, ascends and levels heroes, and chooses the next
// stage. It never spends Soul Shards or tickets and never opens packs (that stays the Commander's call), and it leaves
// the Bastion Works alone.
import { CARDS } from '../data/cards.js';
import { KITS } from '../data/kits.js';
import { unitDef, ownedHeroes } from './power.js';
import { canLevel, levelUp, canAscend, ascend, autoEquip, canRefine, refine } from './upgrade.js';
import { SQUAD_MAX } from './progress.js';
import { LEVELS } from '../data/campaign.js';
import { deployLimit } from '../data/waves.js';

/** The strongest squad of 10 with a sensible mix: some short-range bruisers, plenty of reach, something for flyers. */
export function pickSquad(save) {
  const all = ownedHeroes(save).map((id) => unitDef(id, save)).sort((a, b) => b.power - a.power);
  const out = [], take = (d) => { if (d && !out.includes(d) && out.length < SQUAD_MAX) out.push(d); };
  const melee = all.filter((d) => d.range <= 2), ranged = all.filter((d) => d.range > 2), air = all.filter((d) => d.kit.air);
  melee.slice(0, 3).forEach(take); ranged.slice(0, 5).forEach(take); air.slice(0, 2).forEach(take);
  for (const d of all) take(d);
  out.sort((a, b) => b.power - a.power);
  save.squad = out.map((d) => d.id);
  return save.squad;
}

/** Spend gold and duplicates on the squad: gear first (free), then ascension, then levels, keeping the squad even. */
export function upgradeCharacters(save) {
  const log = [];
  for (const [gid] of Object.entries(save.cards)) while (CARDS[gid] && CARDS[gid].type !== 'hero' && canRefine(save, gid)) { refine(save, gid); log.push('refined ' + CARDS[gid].name); }
  for (const id of ownedHeroes(save)) while (canAscend(save, id)) { ascend(save, id); log.push('ascended ' + CARDS['h:' + id].hero.short); }
  for (const id of save.squad) if (autoEquip(save, id)) log.push('re-equipped ' + CARDS['h:' + id].hero.short);
  // levels: the heroes that will actually take the field (Deploy Limit + 1) first, kept even; the bench after
  const squad = save.squad.filter((id) => save.cards['h:' + id]?.n > 0), front = squad.slice(0, deployLimit(Math.min(80, save.frontier)) + 2);
  for (let guard = 0; guard < 4000; guard++) {
    let cands = front.filter((id) => canLevel(save, id));
    if (!cands.length) cands = squad.filter((id) => canLevel(save, id) && save.cards['h:' + id].lvl < save.cards['h:' + front[front.length - 1]].lvl - 5);
    if (!cands.length) break;
    cands.sort((a, b) => save.cards['h:' + a].lvl - save.cards['h:' + b].lvl || unitDef(b, save).power - unitDef(a, save).power);
    levelUp(save, cands[0]);
    if (guard === 0) log.push('levelled the squad');
  }
  return log;
}

/** Where auto-play goes next: the frontier, unless it has failed there twice in a row; then the best farm behind it. */
export function nextStage(save, recentFails = 0) {
  const f = Math.min(save.frontier, LEVELS.length);
  if (recentFails < 2) return f;
  for (let n = f - 1; n >= 1; n--) if ((save.progress[n]?.clears || 0) > 0) return n;
  return f;
}
export const melee = (cls) => KITS[cls].post === 'road';
