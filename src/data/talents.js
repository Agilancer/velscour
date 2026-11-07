// Passive Talent Trees: 3 branches × 5 tiers (8 nodes per branch, 24 per class, 408 total) across all 17 classes.
// Heroes earn +1 Talent Point every 5 levels (Lv 5, 10, 15, ... -> 20 points at Lv 100).
// Rows 1 & 3 are mutually exclusive Choice A vs Choice B Skill Morphs; Row 4 is Choice A vs Choice B Apex Keystones.

import { CLASSES } from './classes.js';
import { TALENT_DATA_1 } from './talentdata1.js';
import { TALENT_DATA_2 } from './talentdata2.js';

export const TALENT_ROW_LEVELS = [1, 10, 20, 30, 45];

const RAW_TALENTS = {
  ...TALENT_DATA_1,
  ...TALENT_DATA_2,
};

// Build indexed lookup tables
export const TALENTS = {};       // id -> node
export const CLASS_TALENTS = {}; // classId -> [ branch0, branch1, branch2 ]

for (const [cls, branches] of Object.entries(RAW_TALENTS)) {
  CLASS_TALENTS[cls] = branches.map((b, bIdx) => {
    const nodes = b.nodes.map((n, nIdx) => {
      const id = `${cls}.${bIdx}.${n.key}`;
      const node = {
        ...n,
        id,
        classId: cls,
        branch: bIdx,
        sheetRow: bIdx,
        sheetCol: nIdx,
        reqLevel: TALENT_ROW_LEVELS[n.row] || 1,
      };
      TALENTS[id] = node;
      return node;
    });
    return {
      index: bIdx,
      name: b.name,
      el: b.el,
      nodes,
    };
  });
}

// Fallback for any disabled class so legacy saves never crash
for (const cls of Object.keys(CLASSES)) {
  if (!CLASS_TALENTS[cls]) CLASS_TALENTS[cls] = CLASS_TALENTS.paladin;
}

/** Return the hero's talent map { [nodeId]: rank }. */
export function getTalents(c) {
  if (!c) return {};
  if (!c.talents) c.talents = {};
  return c.talents;
}

/** Total talent points spent by hero c. */
export function talentPointsSpent(c) {
  const t = getTalents(c);
  let sum = 0;
  for (const v of Object.values(t)) sum += Number(v) || 0;
  return sum;
}

/** Find the sibling choice node ('A' <-> 'B') on the same branch & row, if any. */
export function getSiblingChoice(node) {
  if (!node || !node.choice) return null;
  const branches = CLASS_TALENTS[node.classId];
  const b = branches && branches[node.branch];
  if (!b) return null;
  return b.nodes.find((n) => n.row === node.row && n.choice && n.choice !== node.choice) || null;
}

/** Check if a choice node is locked because points were invested in its mutually exclusive sibling. */
export function isTalentLockedByChoice(c, node) {
  const sib = getSiblingChoice(node);
  if (!sib) return false;
  const t = getTalents(c);
  return (t[sib.id] || 0) > 0;
}

/**
 * Check prerequisite satisfaction for a 5-tier talent node:
 * - Row 0 (Lv 1, 5 ranks): always unlocked
 * - Row 1 (Lv 10, 3 ranks, 2nd pt): >= 1 rank in Row 0
 * - Row 2 (Lv 20, 5 ranks, 4th pt): >= 1 rank in Row 1 (A or B)
 * - Row 3 (Lv 30, 3 ranks, 6th pt): >= 2 ranks in Row 2
 * - Row 4 (Lv 45, 1 rank,  9th pt): >= 2 ranks in Row 3 (A or B)
 */
export function isTalentPrereqMet(c, node) {
  if (!c || !node) return false;
  const branches = CLASS_TALENTS[node.classId];
  const b = branches && branches[node.branch];
  if (!b) return false;
  const t = getTalents(c);
  if (node.row === 0) return true;
  if (node.row === 1) {
    const r0 = b.nodes.find((n) => n.row === 0);
    return r0 ? (t[r0.id] || 0) >= 1 : true;
  }
  if (node.row === 2) {
    const r1 = b.nodes.filter((n) => n.row === 1);
    return r1.some((n) => (t[n.id] || 0) >= 1);
  }
  if (node.row === 3) {
    const r2 = b.nodes.find((n) => n.row === 2);
    return r2 ? (t[r2.id] || 0) >= 2 : true;
  }
  if (node.row === 4) {
    const r3 = b.nodes.filter((n) => n.row === 3);
    return r3.some((n) => (t[n.id] || 0) >= 2);
  }
  return true;
}

/** Return true if hero c can currently invest a point into `node`. */
export function canLearnTalent(c, node) {
  if (!c || !node) return false;
  if ((c.talentPoints || 0) <= 0) return false;
  if ((c.level || 1) < node.reqLevel) return false;
  const cur = getTalents(c)[node.id] || 0;
  if (cur >= node.maxRank) return false;
  if (isTalentLockedByChoice(c, node)) return false;
  if (!isTalentPrereqMet(c, node)) return false;
  return true;
}

/** Spend 1 talentPoint to learn 1 rank of `nodeId`. Returns true if learned. */
export function learnTalent(c, nodeId) {
  const node = TALENTS[nodeId];
  if (!canLearnTalent(c, node)) return false;
  const t = getTalents(c);
  t[node.id] = (t[node.id] || 0) + 1;
  c.talentPoints = Math.max(0, (c.talentPoints || 0) - 1);
  return true;
}

/** Refund all spent talent points back into `c.talentPoints`. */
export function respecTalents(c) {
  if (!c) return 0;
  const spent = talentPointsSpent(c);
  if (spent <= 0) return 0;
  c.talents = {};
  c.talentPoints = (c.talentPoints || 0) + spent;
  return spent;
}

/**
 * Aggregate all active talent bonuses for hero `c`:
 * - `stats`: flat/percentage stat map to apply in `Player.recompute()`
 * - `mods`: `{ [modKey]: rank }`
 * - `skillMults`: array of `{ tree, kind, skills, pct }` for `Player.skillDamage()`
 * - `morphs`: array of `{ nodeId, name, el, rank, morph }` for `skillMorphFor()`
 * - `cheatDeath`: `{ name, el, healPct, cd } | null`
 * - `onKill`: array of `{ status, el, pctMaxHp }`
 * - `knightCapPlus`: bonus Lancer Knight Order cap
 */
export function computeTalentBonuses(c) {
  const stats = {};
  const mods = {};
  const skillMults = [];
  const morphs = [];
  const onKill = [];
  let cheatDeath = null;
  let knightCapPlus = 0;

  if (!c || !c.talents) {
    return { stats, mods, skillMults, morphs, cheatDeath, onKill, knightCapPlus };
  }

  for (const [id, rank] of Object.entries(c.talents)) {
    const r = Number(rank) || 0;
    if (r <= 0) continue;
    const node = TALENTS[id];
    if (!node || (c.classId && node.classId !== c.classId)) continue;
    if (node.stats) {
      for (const [k, v] of Object.entries(node.stats)) {
        stats[k] = (stats[k] || 0) + v * r;
      }
    }
    if (node.mod) mods[node.mod] = r;
    mods[node.key] = r;
    if (node.skillMult) {
      skillMults.push({
        tree: node.skillMult.tree ?? null,
        kind: node.skillMult.kind || null,
        skills: node.skillMult.skills || null,
        pct: node.skillMult.pct * r,
      });
    }
    if (node.morph) {
      morphs.push({
        nodeId: node.id,
        name: node.name,
        el: node.el || 'phys',
        rank: r,
        morph: node.morph,
      });
    }
    if (node.cheatDeath) cheatDeath = node.cheatDeath;
    if (node.onKill) onKill.push(node.onKill);
    if (node.knightCapPlus) knightCapPlus += node.knightCapPlus * r;
  }

  return { stats, mods, skillMults, morphs, cheatDeath, onKill, knightCapPlus };
}

/** Check whether a declarative `morph` targets skill `sk`. */
export function morphMatchesSkill(morph, sk) {
  if (!morph || !sk) return false;
  let hasRule = false;
  if (morph.skills) {
    hasRule = true;
    if (!morph.skills.includes(sk.name)) return false;
  }
  if (morph.tree !== undefined && morph.tree !== null) {
    hasRule = true;
    const trees = Array.isArray(morph.tree) ? morph.tree : [morph.tree];
    if (!trees.includes(sk.tree)) return false;
  }
  if (morph.kind !== undefined && morph.kind !== null) {
    hasRule = true;
    const kinds = Array.isArray(morph.kind) ? morph.kind : [morph.kind];
    if (!kinds.includes(sk.kind)) return false;
  }
  return hasRule;
}

/**
 * Resolve and merge all active Talent Morphs on `player` affecting `sk`.
 * Cached per `sk.id` on `player.morphCache` (cleared in `player.recompute()`).
 */
export function skillMorphFor(player, sk) {
  if (!player || !sk || !player.st) return null;
  if (sk.classId && player.classId && sk.classId !== player.classId) return null;
  if (player.morphCache && player.morphCache.has(sk.id)) {
    return player.morphCache.get(sk.id);
  }
  const list = player.st.talentMorphs;
  if (!list || !list.length) {
    if (player.morphCache) player.morphCache.set(sk.id, null);
    return null;
  }

  let out = null;
  for (const entry of list) {
    const mp = entry.morph;
    if (!morphMatchesSkill(mp, sk)) continue;
    const r = entry.rank;
    if (!out) {
      out = {
        el: null,
        sumSwap: null,
        extraN: 0,
        extraMax: 0,
        extraBounce: 0,
        areaPct: 0,
        durPct: 0,
        cdPct: 0,
        dmgPct: 0,
        summonHpPct: 0,
        summonDmgPct: 0,
        healPct: 0,
        rageGain: 0,
        pierce: false,
        home: false,
        pull: false,
        stun: false,
        freeze: false,
        burn: false,
        bleed: false,
        poison: false,
        slow: false,
        fear: false,
        leech: false,
        resetOnKill: false,
        curses: [],
        trail: null,
        novaOnCast: null,
        waveProjs: [],
        labels: [],
      };
    }
    if (mp.el) out.el = mp.el;
    if (mp.sumSwap) out.sumSwap = mp.sumSwap;
    if (mp.extraN) out.extraN += mp.extraN;
    if (mp.extraNPerRank) out.extraN += mp.extraNPerRank * r;
    if (mp.extraMax) out.extraMax += mp.extraMax;
    if (mp.extraMaxPerRank) out.extraMax += mp.extraMaxPerRank * r;
    if (mp.extraBounce) out.extraBounce += mp.extraBounce * r;
    if (mp.areaPct) out.areaPct += mp.areaPct * r;
    if (mp.durPct) out.durPct += mp.durPct * r;
    if (mp.cdPct) out.cdPct = Math.min(60, out.cdPct + mp.cdPct * r);
    if (mp.dmgPct) out.dmgPct += mp.dmgPct * r;
    if (mp.summonHpPct) out.summonHpPct += mp.summonHpPct * r;
    if (mp.summonDmgPct) out.summonDmgPct += mp.summonDmgPct * r;
    if (mp.healPct) out.healPct += mp.healPct * r;
    if (mp.rageGain) out.rageGain += mp.rageGain * r;
    for (const flag of ['pierce', 'home', 'pull', 'stun', 'freeze', 'burn', 'bleed', 'poison', 'slow', 'fear', 'leech', 'resetOnKill']) {
      if (mp[flag]) out[flag] = true;
    }
    if (mp.curse && !out.curses.includes(mp.curse)) out.curses.push(mp.curse);
    if (mp.trail) out.trail = mp.trail;
    if (mp.novaOnCast) out.novaOnCast = mp.novaOnCast;
    if (mp.waveProj) {
      out.waveProjs.push({
        fx: mp.waveProj.fx || 'blade',
        el: mp.waveProj.el || mp.el || sk.el,
        n: Math.max(1, (mp.waveProj.nPerRank || 1) * r),
        dmgMul: mp.waveProj.dmgMul || 0.4,
      });
    }
    if (mp.label) {
      const text = typeof mp.label === 'function' ? mp.label(r) : mp.label;
      out.labels.push({ name: entry.name, el: entry.el, text });
    }
  }

  if (player.morphCache) player.morphCache.set(sk.id, out);
  return out;
}

/** Return a shallow morphed copy of `sk` reflecting `morph` (element, summon swap, counts, duration, flags). */
export function applySkillMorph(sk, morph) {
  if (!morph || !sk) return sk;
  const m = { ...sk.m };
  const el = morph.el || sk.el;
  if (morph.sumSwap && sk.kind === 'summon' && m.sum !== 'revive') {
    m.sum = morph.sumSwap;
  }
  if (morph.extraN > 0) {
    if (sk.kind === 'rain') m.n = (m.n || 12) + morph.extraN * 3;
    else if (sk.kind === 'chain') m.n = (m.n || 4) + morph.extraN * 2;
    else if (sk.kind === 'orbit') m.n = (m.n || 3) + morph.extraN;
    else if (['proj', 'strike', 'nova', 'cyclone', 'fissure', 'trap', 'summon', 'melee', 'corpse', 'dash'].includes(sk.kind) || m.n) {
      m.n = (m.n || 1) + morph.extraN;
    }
  }
  if (morph.extraMax > 0 && sk.kind === 'summon') {
    m.max = (m.max || (m.dur ? 99 : (sk.m.n || 1))) + morph.extraMax;
  }
  if (morph.extraBounce > 0) {
    if (m.ricochet) m.ricochet += morph.extraBounce;
    else if (m.chain) m.chain += morph.extraBounce;
    else if (sk.kind === 'chain') m.n = (m.n || 4) + morph.extraBounce;
    else if (sk.kind === 'proj' && !m.ret) m.bounce = (m.bounce || 0) + morph.extraBounce;
  }
  if (morph.durPct > 0 && m.dur) {
    m.dur = +(m.dur * (1 + morph.durPct / 100)).toFixed(2);
  }
  if (morph.pierce) m.pierce = true;
  if (morph.home) m.home = true;
  if (morph.pull) m.pull = true;
  for (const flag of ['stun', 'freeze', 'burn', 'bleed', 'poison', 'slow', 'fear', 'leech']) {
    if (morph[flag]) m[flag] = true;
  }
  if (morph.curses.length) {
    const base = m.curse ? (Array.isArray(m.curse) ? m.curse : [m.curse]) : (sk.kind === 'curse' ? ['amp'] : []);
    m.curse = [...new Set([...base, ...morph.curses])];
  }
  return { ...sk, el, m };
}
