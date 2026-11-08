// The descent: Demon Lord Velscour waits at FINAL_DEPTH, and depthLevel maps a depth to the monster level that
// sets its monsters' life, damage, XP and loot.
// Level 1-100 polynomial progression where Player HP, Player Damage, Monster HP, and Monster Damage
// operate on a unified 1:1 scale across all 500 depths without exponential inflation.
export const FINAL_DEPTH = 500;
/** The hero level cap (game/player.js re-exports it): no item asks for more (data/items.js rollItem). */
export const MAX_LEVEL = 100;

/** The 5 Thematic Acts of the campaign descent */
export const ACTS = [
  { act: 1, name: 'The Fallen Realms', start: 1, end: 100, midBoss: 'valdric', finaleBoss: 'colossus' },
  { act: 2, name: 'The Scorched Wastes', start: 101, end: 200, midBoss: 'ambrecoil', finaleBoss: 'sekhmun' },
  { act: 3, name: 'The Frozen Peaks', start: 201, end: 300, midBoss: 'kaela', finaleBoss: 'hollowmere' },
  { act: 4, name: 'The Empyrean Heights', start: 301, end: 400, midBoss: 'ophaniel', finaleBoss: 'aurion' },
  { act: 5, name: 'The Infernal Dominion', start: 401, end: 500, midBoss: 'kragmaul', finaleBoss: 'velscour' },
];

export const getActForDepth = (d) => ACTS.find((a) => d >= a.start && d <= a.end) || ACTS[0];

export const SUPERBOSS_DEPTHS = {
  50: 'valdric',
  100: 'colossus',
  150: 'ambrecoil',
  200: 'sekhmun',
  250: 'kaela',
  300: 'hollowmere',
  350: 'ophaniel',
  400: 'aurion',
  450: 'kragmaul',
};

export const isSuperbossDepth = (d) => !!SUPERBOSS_DEPTHS[d] || d === FINAL_DEPTH;
export const superbossForDepth = (d) => SUPERBOSS_DEPTHS[d] || (d === FINAL_DEPTH ? 'velscour' : null);

export const depthLevel = (d) => {
  if (d <= 30) return Math.max(1, d);
  if (d <= FINAL_DEPTH) return Math.min(MAX_LEVEL, Math.round(30 + 70 * Math.pow((d - 30) / (FINAL_DEPTH - 30), 0.85)));
  return Math.min(120, MAX_LEVEL + Math.floor((d - FINAL_DEPTH) / 25));
};
/** Every fifth depth but the last ends in a BOSS ROOM. */
export const isRaidDepth = (d) => d % 5 === 0 && d !== FINAL_DEPTH;
/** First depth of d's five-depth block (the block ends in its BOSS ROOM): where a death sends the hero back to. */
export const blockStart = (d) => Math.floor((Math.max(1, d) - 1) / 5) * 5 + 1;
/**
 * Armor's divisor against an attacker of level `lvl`: armor / (armor + armorDiv) of physical damage is mitigated.
 * Polynomial curve matched to polynomial item armor (data/items.js).
 */
export const armorDiv = (lvl) => Math.round(40 + lvl * 14 + 0.12 * lvl * lvl);
/** Hero life multiplier by hero level ("Fortitude"): unified 1:1 scale across levels 1-100. */
export const fortitude = (_level) => 1;
/** Read a table of [x, value] points at x: log-linear between points, held flat past either end. */
export function logCurve(T, x) {
  if (x <= T[0][0]) return T[0][1];
  for (let i = 1; i < T.length; i++) if (x <= T[i][0]) {
    const [x0, a] = T[i - 1], [x1, b] = T[i];
    return a * Math.pow(b / a, (x - x0) / (x1 - x0));
  }
  return T[T.length - 1][1];
}
/** Monster life multiplier by monster level: smooth power curve back-loaded to keep early levels gentle while challenging high-level builds. */
export const toughness = (lvl) => (lvl <= 10 ? 1 : 1 + Math.pow((lvl - 10) / 90, 1.5) * 6.5);
/** Abyssal Rifts hold multiplier: 1.0 on the unified 1-100 scale. */
export const riftHold = (_lvl) => 1;
/** Monster damage multiplier by monster level: maintains meaningful incoming hit threat against player life pools without early one-shots. */
export const danger = (lvl) => (lvl <= 10 ? 1 : 1 + Math.pow((lvl - 10) / 90, 1.4) * 2.2);
/** Monster packs per room area by depth (world/dungeon.js). */
export const density = (d) => 1 + Math.min(d, 120) * 0.006;
const OLD_DENSITY = (d) => 1.1 + Math.min(d, 120) * 0.013;
/** XP multiplier for a monster level. */
export const densityXp = (lvl) => { const d = lvl <= 40 ? lvl : 40 + (lvl - 40) * 4; return OLD_DENSITY(d) / density(d); };
/**
 * Unified 1:1 combat scale: raw damage and displayed damage are identical (dmgScale = 1),
 * so player damage, player HP, enemy damage, and enemy HP are directly comparable across every depth.
 */
export const dmgScale = (_lvl) => 1;
export const shownDmg = (raw, _lvl) => raw;
/** Reference weapon average damage at level `lvl`, and direct 1:1 weapon damage display. */
export const weaponRef = (lvl) => 6 + lvl * 1.8 + 0.022 * lvl * lvl;
export const shownWeapon = (raw, _lvl) => raw;
/** The level tooltips and the stats plaque measure against: the monsters of the hero's depth. */
export const heroDmgLevel = (c) => depthLevel((c && c.depth) || 1);
