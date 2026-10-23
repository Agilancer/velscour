// THE ETERNAL BREACH (docs/ETERNAL_BREACH.md): its own 200 monsters and 30 bosses (data/breachroster.js, packed by
// tools/eternalbreach.py), the floors' difficulty and the final boss's rewards. The Breach's creatures never join the
// regular bestiary's draws (artPool skips `breach` art), and the Breach draws only on them.
import { BREACH_ROSTER } from './breachroster.js';
import { depthLevel } from './depth.js';
import { ARCH } from './enemies.js';

const BONE = { undead: true };
export const BREACH_ART = BREACH_ROSTER.map(([id, sheet, i, name, family, arch, h, f]) => ({
  id: 'eb_' + id.slice(4).toLowerCase(), sheet, i, arch, name, h, family, breach: true, gore: f.gore,
  ...(f.gore === 'bone' ? BONE : { undead: false }), ...(f.fly ? { fly: true } : {}),
  ...(id.startsWith('ETB-B') ? { boss: true, lone: true, breachBoss: true } : {}), ...(f.brute ? { brute: true } : {}),
}));
export const BREACH_MONSTERS = BREACH_ART.filter((a) => !a.breachBoss);
export const BREACH_BOSSES = BREACH_ART.filter((a) => a.breachBoss);
/** Every archetype the Breach's monsters play. */
export const BREACH_ARCHS = [...new Set(BREACH_MONSTERS.map((a) => a.arch))];
/** A random archetype of the Breach, the bulky ones (brutes, abominations) rarer: weight 1 / life, at most 1.5. */
const WEIGHTS = BREACH_ARCHS.map((a) => Math.min(1.5, 1 / (ARCH[a]?.hp || 1))), WSUM = WEIGHTS.reduce((s, v) => s + v, 0);
export function breachArch(rnd = Math.random) {
  let r = rnd() * WSUM;
  for (let k = 0; k < BREACH_ARCHS.length; k++) if ((r -= WEIGHTS[k]) <= 0) return BREACH_ARCHS[k];
  return BREACH_ARCHS[0];
}
/** A pack's size for an archetype (its own range, data/enemies.js), plus `extra`. */
export const breachPack = (arch, rnd = Math.random, extra = 0) => { const [a, b] = ARCH[arch]?.pack || [2, 4]; return Math.min(b, a + Math.floor(rnd() * (b - a + 1)) + extra); };
/** Big flying monsters that can carry a squad over the void and drop it off (the 'ride' arrival). */
export const BREACH_CARRIERS = BREACH_ART.filter((a) => a.fly && a.h >= 54).map((a) => a.id);

/** Floor n of the Breach is as hard as standard depth 10n. */
export const breachDepth = (floor) => Math.max(1, floor) * 10;
export const breachLevel = (floor) => depthLevel(breachDepth(floor));

/**
 * A floor's bestiary (the rollLooks API: pick(arch), boss(), ids()): up to five looks per archetype from the Breach's
 * own creatures, at most `sheets` of its six atlases, unrecoloured (their violet trim is the point).
 */
export function breachLooks(rnd = Math.random, sheets = 3) {
  const use = new Set();
  const all = [...new Set(BREACH_MONSTERS.map((a) => a.sheet))];
  while (use.size < Math.min(sheets, all.length)) use.add(all[Math.floor(rnd() * all.length)]);
  const chosen = new Map(), bosses = [];
  const looksFor = (arch) => {
    if (chosen.has(arch)) return chosen.get(arch);
    let pool = BREACH_MONSTERS.filter((a) => a.arch === arch && use.has(a.sheet));
    if (!pool.length) pool = BREACH_MONSTERS.filter((a) => a.arch === arch);
    if (!pool.length) pool = BREACH_MONSTERS.filter((a) => use.has(a.sheet));
    const looks = [];
    pool = pool.slice();
    for (let k = 0; k < 5 && pool.length; k++) looks.push({ art: pool.splice(Math.floor(rnd() * pool.length), 1)[0].id, swap: null });
    chosen.set(arch, looks);
    return looks;
  };
  return {
    pick(arch, r = rnd) { const l = looksFor(arch); return l.length ? l[Math.floor(r() * l.length)] : null; },
    /** A boss of the Breach: `index` picks one, else a random one. */
    boss(index, r = rnd) {
      const a = BREACH_BOSSES[index ?? Math.floor(r() * BREACH_BOSSES.length)];
      bosses.push(a.id);
      return { arch: a.arch, look: { art: a.id, swap: null }, art: a };
    },
    /** The roster's archetypes this floor actually has looks for. */
    archs: () => BREACH_ARCHS,
    ids() { return [...bosses, ...[...chosen.values()].flat().map((l) => l.art)]; },
  };
}

/** The final boss of floor n: the six boss families in turn, each family's six from least to most fearsome. */
// (the roster is five families of six; this once cycled six families, and floors 6, 12, 18... asked for a boss past the
// end of the list: the Heart threw on every frame and the screen went black)
const FAMILIES = BREACH_BOSSES.length / 6;
export const finalBossIndex = (floor) => ((floor - 1) % FAMILIES) * 6 + Math.min(5, Math.floor((floor - 1) / FAMILIES));

/**
 * What the final boss of floor `floor` drops (the user's table): a rarity id (data/items.js RARITY: 2 Rare, 3 Epic,
 * 4 Legendary, 5 Mythic). `first`: the first time this floor is beaten.
 * - floors 1-3: a Rare, every time
 * - floors 4-10: an Epic the first time; after that a Rare, with a very low chance of a Legendary
 * - floor 11 on: an Epic the first time, with a small chance of a Legendary and an even smaller one of a Mythic;
 *   after that a Rare, with a low chance of something better
 */
export const BREACH_ODDS = { lateLegendary: 0.02, firstLegendary: 0.12, firstMythic: 0.03, repeatEpic: 0.06, repeatLegendary: 0.015, repeatMythic: 0.003 };
export function breachReward(floor, first, rnd = Math.random) {
  const O = BREACH_ODDS, r = rnd();
  if (floor <= 3) return 2;
  if (floor <= 10) return first ? 3 : r < O.lateLegendary ? 4 : 2;
  if (first) return r < O.firstMythic ? 5 : r < O.firstMythic + O.firstLegendary ? 4 : 3;
  return r < O.repeatMythic ? 5 : r < O.repeatMythic + O.repeatLegendary ? 4 : r < O.repeatMythic + O.repeatLegendary + O.repeatEpic ? 3 : 2;
}

// ------------------------------------------------------------------ the Ethereal Wyrm (game/breachdragon.js)
/** Its colours: body (x the baked scales), accent (belly, spines, fins), glow; its breath element; the heads and
 * claws cut from the set 2 dragons (tools/breachdragon3d.html). The violet one is the Breach's own and the commonest. */
export const WYRM_VARIANTS = [
  { id: 'violet', name: 'Ethereal', body: '#7040b8', accent: '#ead8ff', glow: '#b060ff', el: 'arcane', heads: ['amethyst'], claw: 'amethyst', w: 4 },
  { id: 'red', name: 'Crimson', body: '#c03024', accent: '#ffd890', glow: '#ff5030', el: 'fire', heads: ['scarlet', 'crimson'], claw: 'crimson', w: 1 },
  { id: 'black', name: 'Black', body: '#2c2634', accent: '#8a8096', glow: '#ff3a60', el: 'shadow', heads: ['obsidian'], claw: 'obsidian', w: 1 },
  { id: 'green', name: 'Jade', body: '#2e9a52', accent: '#f4ecb8', glow: '#50ff90', el: 'poison', heads: ['jade', 'emerald'], claw: 'jade', w: 1 },
  { id: 'gold', name: 'Golden', body: '#e0a42c', accent: '#fff2c8', glow: '#ffd860', el: 'holy', heads: ['golden'], claw: 'golden', w: 1 },
  { id: 'silver', name: 'Silver', body: '#aab2c4', accent: '#eef4ff', glow: '#b8dcff', el: 'light', heads: ['silver'], claw: 'bone', w: 1 },
  { id: 'white', name: 'White', body: '#f0eef8', accent: '#ffffff', glow: '#e4f6ff', el: 'cold', heads: ['ivory', 'bone'], claw: 'bone', w: 1 },
];
export const WYRM_NAMES = ["Ysh'vael", 'Nhalakor', 'Veyrith', 'Ossarune', "Khel'mora", 'Saevrith', 'Umbrathiel', 'Iolanthe', 'Corvaxis', "Thal'zuun", 'Mirrovane', 'Quessadrel'];
/** A floor's wyrm: floor 1 is always the violet one; after that a weighted draw. */
export function wyrmVariant(floor, rnd = Math.random) {
  if (floor <= 1) return WYRM_VARIANTS[0];
  let r = rnd() * WYRM_VARIANTS.reduce((s, v) => s + v.w, 0);
  for (const v of WYRM_VARIANTS) if ((r -= v.w) < 0) return v;
  return WYRM_VARIANTS[0];
}
/** It grows longer, faster and deadlier floor by floor, and learns new attacks. */
export function wyrmStats(floor) {
  const f = Math.max(1, floor);
  return {
    segs: Math.min(60, 30 + f * 2), scale: Math.min(1.9, 1.35 + f * 0.03),
    speed: Math.min(10, 6.4 + f * 0.24), turn: Math.min(2.4, 1.55 + f * 0.04),
    passes: Math.min(5, 2 + Math.floor(f / 4)), away: [Math.max(18, 40 - f), Math.max(30, 70 - f * 2)],
    hpMul: 3 + f * 0.15, dmgMul: 1 + f * 0.04,
    breath: f >= 2, orbs: f >= 4, brood: f >= 3, coil: f >= 6, attackCd: Math.max(2.6, 5 - f * 0.12),
  };
}
