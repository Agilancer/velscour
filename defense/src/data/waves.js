// The horde: monster roles, each stage's roster (painted Velscour monsters picked for the region) and the 1,000
// waves of the campaign on one rising curve (global wave g = 1..1000).
import { RNG, clamp } from '../core/util.js';
import { ART } from '../core/assets.js';
import { LEVELS, REGIONS } from './campaign.js';
import { CURVE, TERRAIN } from './curve.js';

// hp/def/res/speed are wave-1 values; leak = cracks dealt to the Heart; from = first stage it marches in
export const ROLES = {
  grunt: { name: 'Grunt', hp: 100, def: 8, res: 0.1, speed: 0.9, leak: 1, from: 1, arches: ['skeleton', 'zombie', 'ghoul', 'cultist'], h: 1 },
  runner: { name: 'Runner', hp: 52, def: 0, res: 0, speed: 1.6, leak: 1, from: 2, arches: ['hound', 'spider', 'imp', 'scorpion', 'beetle'], h: 0.8 },
  flyer: { name: 'Flyer', hp: 80, def: 4, res: 0.15, speed: 1.15, leak: 1, from: 4, air: true, arches: ['bat', 'gargoyle', 'eye'], h: 0.9 },
  brute: { name: 'Brute', hp: 270, def: 30, res: 0.1, speed: 0.72, leak: 2, from: 6, arches: ['knight', 'abomination', 'demon'], h: 1.15 },
  shaman: { name: 'Shaman', hp: 140, def: 6, res: 0.3, speed: 0.8, leak: 1, from: 11, heal: 0.05, arches: ['cultist', 'shroom'], h: 1 },
  tank: { name: 'Juggernaut', hp: 420, def: 75, res: 0.05, speed: 0.55, leak: 3, from: 15, arches: ['golem', 'knight'], h: 1.25 },
  warded: { name: 'Warded', hp: 190, def: 4, res: 0.6, speed: 0.85, leak: 1, from: 21, arches: ['wraith', 'elemental', 'slime'], h: 1 },
  hexer: { name: 'Hexer', hp: 150, def: 8, res: 0.35, speed: 0.8, leak: 1, from: 25, hex: 7, arches: ['cultist', 'eye', 'wraith'], h: 1 },
  splitter: { name: 'Splitter', hp: 170, def: 10, res: 0.2, speed: 0.8, leak: 1, from: 33, split: 2, arches: ['slime', 'worm', 'beetle'], h: 1.05 },
  lieutenant: { name: 'Lieutenant', hp: 1500, def: 35, res: 0.25, speed: 0.5, leak: 5, from: 5, roar: 10, h: 1.6 },
  boss: { name: 'Boss', hp: 4200, def: 45, res: 0.3, speed: 0.42, leak: 10, from: 10, roar: 9, summon: 12, h: 1.9 },
};
const ROLE_W = { grunt: 5, runner: 3, flyer: 2.2, brute: 2.2, shaman: 1.2, tank: 1.5, warded: 1.8, hexer: 1.1, splitter: 1.4 };

// what each region's horde looks like: preferred arches, elements and flags
const TASTE = {
  outskirts: { arches: ['hound', 'skeleton', 'zombie', 'ghoul', 'imp', 'bat', 'beetle', 'spider', 'knight', 'golem'] },
  catacombs: { undead: true, arches: ['skeleton', 'zombie', 'ghoul', 'spider', 'worm', 'wraith', 'bat'] },
  cathedral: { els: ['holy', 'shadow', 'fire'], arches: ['cultist', 'wraith', 'knight', 'skeleton', 'gargoyle'] },
  frostfang: { els: ['cold'], arches: ['hound', 'golem', 'knight', 'wraith', 'elemental'] },
  sand: { els: ['fire', 'light'], arches: ['scorpion', 'beetle', 'worm', 'golem', 'demon'] },
  forest: { els: ['poison'], arches: ['shroom', 'spider', 'hound', 'slime', 'beetle'] },
  ironcrown: { arches: ['knight', 'golem', 'demon', 'archer', 'abomination'] },
  rift: { els: ['shadow', 'fire', 'blood'], demon: true, arches: ['demon', 'wraith', 'eye', 'elemental', 'imp'] },
};

/**
 * Monster health at global wave g (1..1000): the fitted curve (data/curve.js, tests/calibrate.mjs) eased across each
 * stage's waves, so every wave is a little harder than the one before. DIFFICULTY scales the whole campaign.
 */
export const DIFFICULTY = 1;
const stageOfWave = [];
for (const L of LEVELS) for (let i = 0; i < L.waves; i++) stageOfWave.push(L);
export const TUNE = { flat: 0, terrain: 0 };   // tests/calibrate.mjs: one fixed multiplier for every wave, terrain off
/** How much a stage's map eases or stiffens the horde (fitted with the curve). */
export const terrainK = (n) => TUNE.terrain || TERRAIN[n - 1] || 1;
export function hpMul(g) {
  if (TUNE.flat) return TUNE.flat;
  const L = stageOfWave[Math.max(0, Math.min(stageOfWave.length - 1, g - 1))], f = (g - 1 - L.wave0) / L.waves;
  return DIFFICULTY * (CURVE[L.n - 1] + (CURVE[L.n] - CURVE[L.n - 1]) * f);
}
export const defMul = (g) => 1 + (g - 1) / 120;

/** Which painted monster plays each role in stage n (seeded: a stage always looks the same). */
export function stageRoster(n) {
  const L = LEVELS[n - 1], R = REGIONS.findIndex((r) => r.id === L.region), taste = TASTE[L.region], rng = new RNG('roster:' + n);
  const pool = ART.monsters.filter((m) => !m.lone && !m.boss);
  const score = (m) => (taste.arches.includes(m.arch) ? 2 : 0) + (taste.els && taste.els.includes(m.el) ? 1.5 : 0)
    + (taste.undead && m.undead ? 1 : 0) + (taste.demon && m.demon ? 1 : 0) + rng.next();
  const roster = {};
  for (const [role, def] of Object.entries(ROLES)) {
    if (role === 'boss' || role === 'lieutenant') continue;
    const cands = pool.filter((m) => def.arches.includes(m.arch) || (role === 'flyer' && m.fly));
    cands.sort((a, b) => score(b) - score(a));
    roster[role] = cands.slice(0, 3).map((m) => m.id);
  }
  // bosses and lieutenants are named in campaign.js and use the painted giant of that name when there is one
  const named = (name) => ART.monsters.find((m) => m.name === name)?.id;
  const giants = ART.monsters.filter((m) => m.boss);
  roster.lieutenant = [named(REGIONS[R].lieutenant) || rng.pick(giants).id];
  roster.boss = [named(REGIONS[R].boss) || rng.pick(giants).id];
  return roster;
}

/**
 * Stage n's waves: [{ g, groups: [{ role, art, count, gap, route, elite }] , big }]. routes = number of routes.
 * Pure data; the battle sim turns it into spawns.
 */
export function stageWaves(n, routes = 1) {
  const L = LEVELS[n - 1], rng = new RNG('waves:' + n), roster = stageRoster(n), waves = [];
  const roles = Object.keys(ROLE_W).filter((r) => ROLES[r].from <= n);
  for (let i = 0; i < L.waves; i++) {
    const g = L.wave0 + i + 1, last = i === L.waves - 1;
    let count = Math.round(4 + 3 * Math.log2(1 + g / 40) + (last ? 3 : 0));
    const groups = [], kinds = Math.min(roles.length, 1 + rng.int(0, Math.min(2, Math.floor(n / 6))));
    const chosen = [];
    while (chosen.length < kinds) {
      const r = rng.weighted(roles.map((k) => [k, ROLE_W[k] * (chosen.includes(k) ? 0 : 1) + 0.0001]));
      if (!chosen.includes(r)) chosen.push(r);
    }
    const eliteP = clamp((g - 25) / 900, 0, 0.3);
    chosen.forEach((role, k) => {
      const c = k === chosen.length - 1 ? count : Math.max(2, Math.round(count / (chosen.length - k) * rng.range(0.7, 1.2)));
      count -= c;
      if (c <= 0) return;
      const R = ROLES[role], fast = role === 'runner' ? 0.45 : 0.85;
      groups.push({ role, art: rng.pick(roster[role]), count: c, gap: clamp(fast - g / 3000, 0.3, 1), route: rng.int(0, routes - 1), elite: eliteP, delay: k * rng.range(1.5, 3) });
    });
    if (last && L.lieutenant) groups.push({ role: 'lieutenant', art: roster.lieutenant[0], count: 1, gap: 1, route: 0, delay: 4 });
    if (last && L.boss) groups.push({ role: 'boss', art: roster.boss[0], count: 1, gap: 1, route: 0, delay: 5 });
    waves.push({ g, groups, big: last });
  }
  return waves;
}

/** Deploy Limit (heroes on the field at once) and the Heart's cracks for stage n, before Bastion research. */
export const deployLimit = (n) => Math.min(9, 3 + Math.floor(Math.sqrt(n) * 0.7));
export const heartBase = (n) => 12 + Math.floor(n / 10) * 2;
