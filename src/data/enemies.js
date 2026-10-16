// Monster archetypes. Each biome re-skins a roster of these with palette shifts,
// names and elemental attacks to produce its own bestiary (25 biomes x 12 = 300 kinds,
// plus champion / unique / boss variants).
import { SAND_CREATURES, SAND_BOSSES, SAND_AI } from './seaofsand.js';
export const ARCH = {
  skeleton: { sprite: 'skeleton', ai: 'melee', hp: 1, dmg: 1, spd: 2.5, px: 2.3, r: 0.32, pal: { w: '#e6dcc2', m: '#a8aeb8', g: '#b08a3a', e: '#ff3a20' }, gore: 'bone', undead: true, names: ['Skeleton', 'Bonewalker', 'Rattler'], pack: [3, 6] },
  archer: { sprite: 'archer', ai: 'ranged', hp: 0.7, dmg: 0.8, spd: 2.3, px: 2.3, r: 0.32, proj: { fx: 'arrow', speed: 9 }, el: 'phys', range: 7, pal: { w: '#e6dcc2', c: '#8a5a2a', e: '#ff3a20' }, gore: 'bone', undead: true, names: ['Skeleton Archer', 'Bone Sniper', 'Deadshot'], pack: [2, 4] },
  zombie: { sprite: 'zombie', ai: 'melee', hp: 1.7, dmg: 1.2, spd: 1.4, px: 2.5, r: 0.36, pal: { a: '#7a9a6a', b: '#4a3a5a', e: '#ffe040', r: '#5a1010' }, gore: 'flesh', undead: true, names: ['Zombie', 'Rotting Corpse', 'Shambler'], pack: [3, 6] },
  ghoul: { sprite: 'ghoul', ai: 'melee', hp: 0.9, dmg: 0.9, spd: 3.7, px: 2.6, r: 0.33, pal: { a: '#8a8070', e: '#ff2020', w: '#e0d8c0' }, gore: 'flesh', names: ['Ghoul', 'Flesh Eater', 'Gnawer'], pack: [3, 5] },
  imp: { sprite: 'imp', ai: 'ranged', hp: 0.6, dmg: 0.85, spd: 3.2, px: 2.4, r: 0.28, proj: { fx: 'fireball', speed: 7 }, el: 'fire', range: 6.5, pal: { a: '#c03a20', c: '#701808', w: '#f0e0c0', e: '#ffee40' }, gore: 'flesh', demon: true, names: ['Imp', 'Fire Fiend', 'Hellspawn'], pack: [3, 5] },
  demon: { sprite: 'demon', ai: 'brute', hp: 2.6, dmg: 1.7, spd: 2.1, px: 2.8, r: 0.5, pal: { a: '#8a2020', b: '#3a1a10', w: '#e0d0b0', e: '#ffcc20' }, gore: 'flesh', demon: true, names: ['Demon', 'Pit Fiend', 'Balor'], xp: 2, pack: [1, 2] },
  spider: { sprite: 'spider', ai: 'melee', hp: 0.55, dmg: 0.6, spd: 4.2, px: 2.3, r: 0.3, pal: { a: '#3a2a2a', A: '#1a1010', b: '#8a2020', e: '#ff3030' }, gore: 'goo', poison: true, names: ['Spider', 'Crawler', 'Broodling'], pack: [4, 8] },
  bat: { sprite: 'bat', ai: 'swarm', hp: 0.35, dmg: 0.45, spd: 4.8, px: 2.0, r: 0.25, fly: true, pal: { a: '#4a3040', e: '#ff3030' }, gore: 'flesh', names: ['Bat', 'Gloom Bat', 'Vampire Bat'], pack: [4, 9] },
  slime: { sprite: 'slime', ai: 'melee', hp: 1.3, dmg: 0.9, spd: 1.7, px: 2.6, r: 0.36, pal: { a: '#40c040', w: '#d0ffd0', e: '#102010', r: '#104010' }, gore: 'goo', split: true, names: ['Slime', 'Ooze', 'Gelatinous Mass'], pack: [2, 4] },
  wraith: { sprite: 'wraith', ai: 'caster', hp: 0.8, dmg: 1.0, spd: 2.6, px: 2.3, r: 0.3, fly: true, proj: { fx: 'skull', speed: 6 }, el: 'shadow', range: 6.5, pal: { a: '#9090b0', b: '#3a3a5a', k: '#0a0a14', e: '#80ffff' }, gore: 'ecto', undead: true, names: ['Wraith', 'Specter', 'Banshee'], pack: [2, 4] },
  golem: { sprite: 'golem', ai: 'brute', hp: 3.2, dmg: 1.8, spd: 1.5, px: 3.4, r: 0.55, pal: { a: '#7a7068', c: '#ff8030', e: '#ff8030' }, gore: 'rock', names: ['Golem', 'Stone Colossus', 'Rockbrute'], xp: 2, pack: [1, 2] },
  cultist: { sprite: 'cultist', ai: 'caster', hp: 0.85, dmg: 1.1, spd: 2.3, px: 2.6, r: 0.3, aoe: true, el: 'fire', range: 7, pal: { b: '#5a1010', k: '#100808', e: '#ff4020', c: '#6a4a2a', s: '#c8a080' }, gore: 'flesh', names: ['Cultist', 'Dark Acolyte', 'Heretic'], pack: [2, 4], summoner: 0.3 },
  hound: { sprite: 'hound', ai: 'charger', hp: 0.9, dmg: 1.0, spd: 4.4, px: 2.5, r: 0.35, pal: { a: '#5a4030', e: '#ffcc20', r: '#a01010' }, gore: 'flesh', names: ['Hellhound', 'Dire Hound', 'Ravager'], pack: [3, 5] },
  eye: { sprite: 'eye', ai: 'beamer', hp: 1.0, dmg: 1.1, spd: 2.0, px: 2.4, r: 0.35, fly: true, el: 'arcane', range: 7, pal: { a: '#8a3050', w: '#f0e0e0', e: '#40ff40', k: '#000000' }, gore: 'goo', names: ['Floating Eye', 'Beholder', 'Watcher'], pack: [1, 3] },
  knight: { sprite: 'knight', ai: 'charger', hp: 2.0, dmg: 1.3, spd: 2.3, px: 2.6, r: 0.36, pal: { m: '#7a8090', b: '#5a2020', g: '#c0a040', e: '#ff3020', c: '#a0a0a0' }, gore: 'bone', undead: true, armor: true, names: ['Death Knight', 'Blackguard', 'Revenant'], xp: 1.5, pack: [1, 3] },
  worm: { sprite: 'worm', ai: 'ranged', hp: 1.1, dmg: 0.9, spd: 1.6, px: 2.8, r: 0.38, proj: { fx: 'blob', speed: 6, lob: true }, el: 'poison', range: 6, pal: { a: '#b08070', e: '#ff3030', r: '#801010' }, gore: 'goo', names: ['Maggot', 'Bile Worm', 'Carrion Crawler'], pack: [2, 4] },
  shroom: { sprite: 'shroom', ai: 'nova', hp: 1.2, dmg: 0.9, spd: 1.2, px: 2.6, r: 0.33, el: 'poison', range: 3, pal: { c: '#a03030', w: '#f0f0d0', a: '#d0c0a0', e: '#202020' }, gore: 'goo', names: ['Shroomling', 'Spore Lord', 'Fungoid'], pack: [2, 4] },
  elemental: { sprite: 'elemental', ai: 'nova', hp: 1.1, dmg: 1.1, spd: 2.2, px: 2.6, r: 0.33, fly: true, el: 'fire', range: 5, pal: { a: '#ff8020', c: '#ffd040', e: '#ffffff' }, gore: 'spark', names: ['Elemental', 'Wisp', 'Primal'], pack: [1, 3] },
  scorpion: { sprite: 'scorpion', ai: 'melee', hp: 1.2, dmg: 1.1, spd: 2.9, px: 2.6, r: 0.36, pal: { a: '#a06030', e: '#ff3020', r: '#ffcc20' }, gore: 'goo', poison: true, names: ['Scorpion', 'Stinger', 'Deathstalker'], pack: [2, 4] },
  gargoyle: { sprite: 'gargoyle', ai: 'charger', hp: 1.5, dmg: 1.2, spd: 3.0, px: 2.6, r: 0.38, fly: true, pal: { a: '#6a6a70', b: '#4a4a50', e: '#ff4020', w: '#d0d0d0' }, gore: 'rock', armor: true, names: ['Gargoyle', 'Stone Watcher', 'Grotesque'], pack: [1, 3] },
  beetle: { sprite: 'beetle', ai: 'exploder', hp: 0.5, dmg: 2.0, spd: 4.0, px: 2.3, r: 0.3, el: 'fire', pal: { a: '#3a3020', c: '#c06020', e: '#ffff40', k: '#100808' }, gore: 'goo', names: ['Bombardier', 'Blast Beetle', 'Volatile Scarab'], pack: [3, 6] },
  abomination: { sprite: 'abomination', ai: 'brute', hp: 4.0, dmg: 2.0, spd: 1.5, px: 3.4, r: 0.6, pal: { a: '#a07a70', r: '#801010', w: '#e0d0c0', e: '#ffcc20' }, gore: 'flesh', names: ['Abomination', 'Flesh Golem', 'Gorger'], xp: 3, pack: [1, 1] },
  velscour: { sprite: 'velscour', ai: 'boss', hp: 1, dmg: 1, spd: 2.4, px: 3.6, r: 0.9, pal: { a: '#5a0c0c', b: '#1a0606', c: '#2a0808', w: '#e8d8b0', g: '#ffb020', e: '#ffee40', r: '#ff2010', k: '#000000' }, gore: 'flesh', demon: true, names: ['Velscour'] },
};

const SAND_BASE = {
  charger: 'hound', pack_flanker: 'hound', elite_hunter: 'knight', burrower: 'scorpion', ranged: 'archer',
  ambusher: 'ghoul', brute: 'golem', tank: 'knight', swarm: 'bat', caster: 'cultist', flyer: 'gargoyle',
  melee: 'skeleton', skirmisher: 'ghoul', illusionist: 'wraith', teleporter: 'imp', summoner: 'cultist',
  support: 'elemental', hunter: 'hound',
};
function addSandArchetype(id, name, role, boss = false, bossIndex = 0) {
  const base = ARCH[SAND_BASE[role] || 'skeleton'];
  ARCH[id] = {
    ...base, ai: boss ? 'boss' : (SAND_AI[role] || base.ai),
    hp: base.hp * (boss ? 1.85 + bossIndex * 0.13 : 0.72 + (id.length % 7) * 0.1),
    dmg: base.dmg * (boss ? 1.15 + (bossIndex % 3) * 0.16 : 0.8 + (id.length % 5) * 0.1),
    spd: base.spd * (boss ? 0.84 + (bossIndex % 4) * 0.11 : role === 'tank' || role === 'brute' ? 0.78 : 0.94 + (id.length % 4) * 0.08),
    pal: { ...base.pal }, names: [name], ...(boss ? { bossName: name, bossPatterns:SAND_BOSSES[bossIndex][4] } : {}), seaOfSand: true,
  };
}
for (const [id, name, role] of SAND_CREATURES) addSandArchetype(id, name, role);
for (const [i, [id, name]] of SAND_BOSSES.entries()) addSandArchetype(id, name, 'brute', true, i);

// Special attacks (Monster.trySpecial in game/monster.js). A normal monster rolls one of its archetype's (more often
// the deeper it is), a greater breed two, champions and uniques all of them.
//   melee:  lunge (leap onto the target), whirl (spin hitting all round), combo (three quick blows), quake (a fissure
//           along the ground), hook (a chain that drags the target in), frenzy (faster and fiercer when badly hurt)
//   ranged: fan (a spread of five), burst (three or more shots that lead a moving target), lob (an arcing glob that
//           leaves a pool), snipe (a long telegraphed piercing shot), blink (teleport away from a hero up close),
//           runes (three delayed blasts round the target), orbs (a ring of slow orbs), sweep (a beam swept across),
//           web (a sticky shot that slows)
export const ARCH_MOVES = {
  skeleton: ['combo', 'lunge'], archer: ['burst', 'snipe', 'fan'], zombie: ['frenzy', 'combo'], ghoul: ['lunge', 'frenzy'],
  imp: ['blink', 'fan', 'lob'], demon: ['whirl', 'quake', 'hook'], spider: ['lunge', 'web'], bat: ['lunge'], slime: ['lob'],
  wraith: ['blink', 'orbs'], golem: ['quake', 'whirl'], cultist: ['runes', 'blink'], hound: ['lunge', 'frenzy'],
  eye: ['sweep', 'orbs'], knight: ['combo', 'whirl', 'hook'], worm: ['lob', 'burst'], shroom: ['lob'], elemental: ['orbs', 'blink'],
  scorpion: ['lunge', 'combo'], gargoyle: ['lunge', 'quake'], beetle: [], abomination: ['whirl', 'hook', 'quake'], velscour: [],
};
for (const [id, , role] of SAND_CREATURES) ARCH_MOVES[id] = ARCH_MOVES[SAND_BASE[role] || 'skeleton'] || [];
for (const [id, , role] of SAND_BOSSES) ARCH_MOVES[id] = ARCH_MOVES[role] || ['quake', 'slam'];

export const GORE = {
  flesh: { blood: null, gib: null },
  bone: { blood: '#d8ccb0', gib: '#e8dcc0', bones: true },
  goo: { blood: '#4ab020', gib: '#2a8010' },
  ecto: { blood: '#80e0ff', gib: '#c0f0ff' },
  rock: { blood: '#6a6058', gib: '#8a8078' },
  spark: { blood: '#ffcc40', gib: '#ff8020' },
};

export const ELITE_AFFIXES = {
  strong: { name: 'Extra Strong' },
  fast: { name: 'Extra Fast' },
  tough: { name: 'Stone Skin' },
  fiery: { name: 'Fire Enchanted' },
  frozen: { name: 'Cold Aura' },
  shocking: { name: 'Lightning Enchanted' },
  vampiric: { name: 'Vampiric' },
  teleport: { name: 'Teleporting' },
  multishot: { name: 'Multishot' },
  thorns: { name: 'Thorns' },
  regen: { name: 'Regenerating' },
};

const SYL_A = ['Gor', 'Mal', 'Vex', 'Thra', 'Ul', 'Kra', 'Zar', 'Mor', 'Bel', 'Skar', 'Dra', 'Ny', 'Oth', 'Gul', 'Vor', 'Xa', 'Rak', 'Sil', 'Grim', 'Az', 'Bal', 'Cor', 'Hex', 'Ith'];
const SYL_B = ['gath', 'mok', 'zul', 'rax', 'thos', 'grim', 'nar', 'vex', 'dor', 'kul', 'mire', 'bane', 'zith', 'rog', 'goth', 'mael', 'drex', 'ul', 'iel', 'axx'];
const EPITHETS = ['the Flayer', 'the Bonegrinder', 'the Undying', 'the Devourer', 'the Defiler', 'the Hollow King', 'the Plaguebringer', 'Who Walks in Ash', 'the Red Butcher', 'the Ravenous', 'the Weeping Horror', 'the Unborn', 'Soulreaper', 'the Iron Maw', 'the Many-Eyed', 'the Gravelord', 'the Skinless', 'the Pale Hunger', 'Spinecrusher', 'the Wretched'];

export function bossName(rng = Math.random) {
  const p = (a) => a[Math.floor(rng() * a.length)];
  return `${p(SYL_A)}${p(SYL_B)} ${p(EPITHETS)}`;
}
export function uniqueName(rng = Math.random) {
  const p = (a) => a[Math.floor(rng() * a.length)];
  const adj = ['Vile', 'Bloody', 'Grim', 'Rotten', 'Cursed', 'Feral', 'Wicked', 'Gnashing', 'Foul', 'Black'];
  const noun = ['Fang', 'Gut', 'Skull', 'Claw', 'Maw', 'Heart', 'Eye', 'Spine', 'Hide', 'Horn'];
  return `${p(adj)}${p(noun).toLowerCase()} the ${p(['Butcher', 'Glutton', 'Wretch', 'Ripper', 'Gnawer', 'Shrieker', 'Brute', 'Stalker'])}`;
}
