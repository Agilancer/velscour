// Gear looks: palette swaps ("finishes") for the armor and helm art, and the effects high rarity body armor
// shows on the hero. How they're applied: src/core/gearart.js (palettes) and src/gfx/gearfx.js (effects).
import { RARITY } from './items.js';

// Gradient ramps, dark -> light. A palette recolours four materials, told apart per pixel by colour: neutral
// metal, saturated cloth, bright warm trim (gold, brass) and dark warm leather. The hero's face, hair and
// skin are masked out by the importer and never recoloured.
const R = {
  steel: ['#06070a', '#3a3e46', '#9aa2ae', '#f4f8ff'], iron: ['#060606', '#2c2c2e', '#6e6c6a', '#cfcac2'],
  black: ['#030304', '#16161a', '#4a4a52', '#b8b8c4'], rust: ['#0a0503', '#3e2214', '#8a5432', '#e0b080'],
  bronze: ['#100602', '#5a3416', '#b07a40', '#ffe0b0'], gold: ['#140a00', '#7a5410', '#e0b040', '#fff4c0'],
  silver: ['#0a0c10', '#5a6270', '#c8d0dc', '#ffffff'], copper: ['#0e0402', '#5a2412', '#c06a3a', '#ffd0a8'],
  bone: ['#0e0c08', '#4e4636', '#b0a688', '#fff8e4'], ash: ['#0a0a0a', '#3a3836', '#8a8680', '#e8e4dc'],
  bloodsteel: ['#0a0404', '#4a2626', '#a07070', '#ffe0d8'], frost: ['#04080e', '#36506a', '#a0c8e8', '#f4fcff'],
  verdigris: ['#020806', '#1e4a40', '#5aa08a', '#d8fff0'], obsidian: ['#06040a', '#2a2436', '#7a7090', '#e8e0ff'],
  ember: ['#0e0402', '#6a1e06', '#e06a1a', '#fff0a0'], sunsteel: ['#141008', '#7a6a40', '#f0e0a0', '#ffffff'],
  jade: ['#020a06', '#1e5a3a', '#5ac08a', '#e0ffe8'], amethyst: ['#0a0410', '#4a2470', '#a070e0', '#f4e8ff'],
  // cloth dyes
  crimson: ['#100000', '#6a0c0c', '#d02828', '#ffb0a0'], wine: ['#0a0004', '#4a0a20', '#9a2a50', '#f0a0c0'],
  royal: ['#000510', '#0a2050', '#3060c0', '#c0d8ff'], navy: ['#020408', '#101c38', '#2a4478', '#a0b8e8'],
  forest: ['#020802', '#143a18', '#3a7a34', '#c0f0a8'], moss: ['#060802', '#2a3414', '#6a7a34', '#e0eab0'],
  purple: ['#0a0010', '#401070', '#a040ff', '#f0c0ff'], violet: ['#06020c', '#2e1650', '#6a40a0', '#dcc8ff'],
  teal: ['#000a0a', '#0c4446', '#2a9a96', '#c0fff8'], sable: ['#030303', '#141214', '#3a363c', '#a8a0aa'],
  ivory: ['#0e0c08', '#5a5444', '#c8c0a8', '#fffcf0'], ochre: ['#0c0600', '#5a3a08', '#c08a20', '#fff0b0'],
  flame: ['#100200', '#7a1800', '#ff6010', '#fff0a0'], ice: ['#000818', '#103870', '#4090e0', '#c0f0ff'],
  emerald: ['#001008', '#0a5030', '#20c070', '#c0ffe0'], rose: ['#0e0206', '#5a1430', '#d05080', '#ffd0e0'],
  toxic: ['#040a00', '#2a5a00', '#80e010', '#f0ffb0'], blood: ['#080000', '#4a0000', '#a00808', '#ff8070'],
  void: ['#020004', '#1a0830', '#5a20a0', '#e0a0ff'], storm: ['#02040a', '#1a2a5a', '#5a8aff', '#e8f4ff'],
  // leathers
  leather: ['#0a0604', '#3a2416', '#7a5434', '#d8b890'], darkleather: ['#050404', '#1e1a18', '#4a403a', '#a89c90'],
  redleather: ['#080202', '#3a1410', '#7a3428', '#e0a090'], greyleather: ['#060606', '#2a2828', '#5e5a58', '#c0bab4'],
};

// [name, minimum rarity, metal, cloth, trim, leather, glow colour (effects), strength]
const P = [
  ['Original', 0], // the artist's own colours, at every rarity
  ['Rusted', 0, 'rust', 'moss', 'rust', 'leather', '#c08040', 0.7], ['Ashen', 0, 'ash', 'sable', 'iron', 'greyleather', '#c0c0c0', 0.7],
  ['Ironbound', 0, 'iron', 'navy', 'bronze', 'darkleather', '#a0b0c0', 0.75], ['Faded Crimson', 0, 'iron', 'wine', 'bronze', 'leather', '#c04040', 0.75],
  ['Woodland', 0, 'iron', 'forest', 'bronze', 'leather', '#60c060', 0.75], ['Peasant Ochre', 0, 'rust', 'ochre', 'copper', 'leather', '#e0a040', 0.75],
  ['Grave Dust', 0, 'bone', 'sable', 'iron', 'greyleather', '#d0c8b0', 0.7], ['Mud & Steel', 0, 'steel', 'moss', 'rust', 'darkleather', '#a0a080', 0.7],
  ['Steel & Navy', 1, 'steel', 'navy', 'silver', 'darkleather', '#80a0ff'], ['Bloodforged', 1, 'bloodsteel', 'crimson', 'gold', 'redleather', '#ff3030'],
  ['Verdant', 1, 'steel', 'forest', 'bronze', 'leather', '#50d050'], ['Blackened', 1, 'black', 'blood', 'bronze', 'darkleather', '#ff4020'],
  ['Copperleaf', 1, 'copper', 'teal', 'copper', 'leather', '#40e0c0'], ['Ivory Guard', 1, 'silver', 'ivory', 'gold', 'leather', '#fff0c0'],
  ['Wine Cellar', 1, 'iron', 'wine', 'gold', 'redleather', '#e04080'], ['Teal Tide', 1, 'steel', 'teal', 'silver', 'greyleather', '#40f0e0'],
  ['Violet Order', 1, 'steel', 'violet', 'silver', 'darkleather', '#a080ff'], ['Bronze Legion', 1, 'bronze', 'crimson', 'bronze', 'leather', '#ffa040'],
  ['Gilded', 2, 'gold', 'royal', 'gold', 'leather', '#ffd040'], ['Frostbound', 2, 'frost', 'ice', 'silver', 'darkleather', '#80d0ff'],
  ['Voidtouched', 2, 'obsidian', 'purple', 'amethyst', 'darkleather', '#b040ff'], ['Verdigris', 2, 'verdigris', 'teal', 'copper', 'leather', '#40ffc0'],
  ['Sable Knight', 2, 'black', 'sable', 'silver', 'darkleather', '#c0c0ff'], ['Rose Thorn', 2, 'silver', 'rose', 'gold', 'redleather', '#ff60a0'],
  ['Emerald Court', 2, 'silver', 'emerald', 'gold', 'leather', '#40ff90'], ['Royal Silver', 2, 'silver', 'royal', 'silver', 'greyleather', '#6090ff'],
  ['Ochre Sun', 2, 'bronze', 'ochre', 'gold', 'leather', '#ffc040'], ['Bone Warden', 2, 'bone', 'wine', 'bone', 'greyleather', '#e0d0a0'],
  ['Emberforged', 3, 'ember', 'flame', 'gold', 'redleather', '#ff7020'], ['Stormcaller', 3, 'storm', 'royal', 'silver', 'darkleather', '#80b0ff'],
  ['Jade Empress', 3, 'jade', 'emerald', 'gold', 'leather', '#60ffa0'], ['Amethyst', 3, 'amethyst', 'violet', 'silver', 'darkleather', '#c080ff'],
  ['Obsidian Flame', 3, 'obsidian', 'flame', 'gold', 'darkleather', '#ff5010'], ['Glacier', 3, 'frost', 'ivory', 'silver', 'greyleather', '#c0f0ff'],
  ['Toxic Bloom', 3, 'verdigris', 'toxic', 'bronze', 'darkleather', '#a0ff20'], ['Crimson Crown', 3, 'gold', 'crimson', 'gold', 'redleather', '#ff4040'],
  ['Sunforged', 4, 'sunsteel', 'ivory', 'gold', 'leather', '#fff0a0'], ['Abyssal', 4, 'obsidian', 'void', 'amethyst', 'darkleather', '#a020ff'],
  ['Hellfire', 4, 'ember', 'blood', 'gold', 'redleather', '#ff3000'], ['Winter King', 4, 'frost', 'ice', 'silver', 'greyleather', '#60c0ff'],
  ['Thunderlord', 4, 'storm', 'storm', 'gold', 'darkleather', '#a0c8ff'], ['Venom Lord', 4, 'jade', 'toxic', 'gold', 'darkleather', '#80ff20'],
  ['Bloodmoon', 4, 'bloodsteel', 'blood', 'silver', 'redleather', '#ff1030'], ['Golden Idol', 4, 'gold', 'ochre', 'gold', 'leather', '#ffe060'],
  ['Starfall', 5, 'silver', 'void', 'gold', 'darkleather', '#e0c0ff'], ['Godforged', 5, 'sunsteel', 'royal', 'gold', 'leather', '#ffffff'],
  ['Demonheart', 5, 'black', 'flame', 'ember', 'redleather', '#ff2010'], ['Eternal Frost', 5, 'frost', 'storm', 'silver', 'greyleather', '#a0f0ff'],
  ['Nightmare', 5, 'obsidian', 'blood', 'amethyst', 'darkleather', '#ff20a0'], ['Worldtree', 5, 'jade', 'forest', 'gold', 'leather', '#a0ff60'],
];
// More finishes, mixed per rarity from that rarity's materials (seeded, so a palette index means the same look
// in every session; appended after the hand-made ones so saved looks keep their colours)
const MIX = [
  [['rust', 'ash', 'iron', 'bone'], ['moss', 'sable', 'navy', 'wine', 'forest', 'ochre'], ['rust', 'iron', 'bronze', 'copper']],
  [['steel', 'iron', 'bronze', 'copper', 'bloodsteel'], ['navy', 'crimson', 'forest', 'teal', 'violet', 'wine', 'ivory'], ['silver', 'gold', 'bronze', 'copper']],
  [['gold', 'frost', 'obsidian', 'verdigris', 'black', 'silver'], ['royal', 'ice', 'purple', 'teal', 'sable', 'rose', 'emerald', 'ochre'], ['gold', 'silver', 'amethyst', 'copper']],
  [['ember', 'storm', 'jade', 'amethyst', 'obsidian', 'frost'], ['flame', 'royal', 'emerald', 'violet', 'toxic', 'crimson', 'ice'], ['gold', 'silver', 'bronze', 'amethyst']],
  [['sunsteel', 'obsidian', 'ember', 'frost', 'storm', 'jade', 'bloodsteel'], ['ivory', 'void', 'blood', 'ice', 'storm', 'toxic', 'flame'], ['gold', 'silver', 'amethyst']],
  [['sunsteel', 'obsidian', 'silver', 'frost', 'black', 'ember'], ['void', 'royal', 'flame', 'storm', 'blood', 'forest', 'purple'], ['gold', 'amethyst', 'ember', 'silver']],
];
const LEATHERS = ['leather', 'darkleather', 'redleather', 'greyleather'];
const cap = (w) => w[0].toUpperCase() + w.slice(1);
let seed = 7;
const rnd = (a) => a[(seed = (seed * 16807) % 2147483647) % a.length];
MIX.forEach(([metals, cloths, trims], tier) => {
  const seen = new Set();
  for (let n = 0; n < 12; n++) {
    const m = rnd(metals), cl = rnd(cloths), t = rnd(trims), l = rnd(LEATHERS);
    if (seen.has(m + cl)) continue;
    seen.add(m + cl);
    P.push([`${cap(m)} & ${cap(cl)}`, tier, m, cl, t, l, R[cl][2], tier ? undefined : 0.75]);
  }
});

export const PALETTES = P.map(([name, tier, metal, cloth, trim, leather, glow, k]) => ({
  name, tier, k: metal ? k ?? 0.85 : 0,
  ramps: metal ? { metal: R[metal], cloth: R[cloth], trim: R[trim], leather: R[leather] } : null,
  glow: glow || null,
}));

// Effects worn by high rarity body armor. Parts (all optional): glow = outline glow strength; orbs = orbiting
// lights {n, r (tiles), speed (rad/s), size, pattern: ring | eight | double | wobble, trail}; parts = particle
// emitters [{kind: mote | ember | spark | frost | smoke | flame | rune, rate (/s)}]; ring = rune circle at the feet.
// col: fixed colour (else the finish's glow, else the rarity colour).
export const GEAR_FX = [
  { name: 'Shimmer', tier: 2, glow: 0.35 },
  { name: 'Motes', tier: 2, glow: 0.2, parts: [{ kind: 'mote', rate: 5 }] },
  { name: 'Twin Wisps', tier: 2, orbs: { n: 2, r: 0.55, speed: 2.2, size: 2.5, pattern: 'ring' } },
  { name: 'Radiance', tier: 3, glow: 0.6, parts: [{ kind: 'mote', rate: 9 }] },
  { name: 'Orbiting Wisps', tier: 3, glow: 0.3, orbs: { n: 3, r: 0.6, speed: 2.4, size: 3, pattern: 'ring' } },
  { name: 'Smoldering', tier: 3, glow: 0.35, col: '#ff7020', parts: [{ kind: 'ember', rate: 14 }] },
  { name: 'Rime', tier: 3, glow: 0.4, col: '#a0e0ff', parts: [{ kind: 'frost', rate: 12 }] },
  { name: 'Static', tier: 3, glow: 0.3, col: '#a0c8ff', parts: [{ kind: 'spark', rate: 7 }] },
  { name: 'Shade', tier: 3, glow: 0.3, col: '#8040c0', parts: [{ kind: 'smoke', rate: 8 }] },
  { name: 'Wisp Crown', tier: 4, glow: 0.55, orbs: { n: 4, r: 0.65, speed: 2.6, size: 3.4, pattern: 'wobble', trail: true }, parts: [{ kind: 'mote', rate: 6 }] },
  { name: 'Infernal', tier: 4, glow: 0.65, col: '#ff6010', parts: [{ kind: 'flame', rate: 26 }, { kind: 'ember', rate: 10 }] },
  { name: 'Tempest', tier: 4, glow: 0.55, col: '#90b8ff', orbs: { n: 2, r: 0.7, speed: 4, size: 3, pattern: 'eight', trail: true }, parts: [{ kind: 'spark', rate: 14 }] },
  { name: 'Runebound', tier: 4, glow: 0.5, ring: true, parts: [{ kind: 'rune', rate: 4 }] },
  { name: 'Frostfire', tier: 4, glow: 0.6, col: '#60c0ff', orbs: { n: 3, r: 0.6, speed: 2, size: 3.2, pattern: 'ring', trail: true }, parts: [{ kind: 'frost', rate: 16 }] },
  { name: 'Umbral', tier: 4, glow: 0.5, col: '#a020ff', orbs: { n: 3, r: 0.7, speed: -2.2, size: 3, pattern: 'wobble' }, parts: [{ kind: 'smoke', rate: 14 }] },
  { name: 'Ascendant', tier: 5, glow: 0.85, ring: true, orbs: { n: 6, r: 0.75, speed: 2.4, size: 3.2, pattern: 'double', trail: true }, parts: [{ kind: 'mote', rate: 14 }, { kind: 'rune', rate: 3 }] },
  { name: 'Cataclysm', tier: 5, glow: 0.9, col: '#ff4010', ring: true, orbs: { n: 4, r: 0.8, speed: 3, size: 3.6, pattern: 'eight', trail: true }, parts: [{ kind: 'flame', rate: 34 }, { kind: 'ember', rate: 16 }, { kind: 'spark', rate: 6 }] },
  { name: 'Starborn', tier: 5, glow: 0.8, orbs: { n: 5, r: 0.8, speed: 1.8, size: 3.4, pattern: 'wobble', trail: true }, parts: [{ kind: 'spark', rate: 10 }, { kind: 'mote', rate: 12 }] },
  { name: 'Voidheart', tier: 5, glow: 0.85, col: '#c040ff', ring: true, orbs: { n: 6, r: 0.7, speed: -2.6, size: 3, pattern: 'double', trail: true }, parts: [{ kind: 'smoke', rate: 18 }, { kind: 'spark', rate: 8 }] },
  { name: 'Glacial Throne', tier: 5, glow: 0.85, col: '#a0e8ff', ring: true, orbs: { n: 4, r: 0.75, speed: 2.2, size: 3.4, pattern: 'ring', trail: true }, parts: [{ kind: 'frost', rate: 26 }, { kind: 'spark', rate: 5 }] },
];

/** Chance a body armor of each rarity rolls an effect (at its own tier, or one below now and then). */
export const FX_CHANCE = [0, 0, 0.45, 1, 1, 1];

/** Glow colour of a look: the effect's own, else the finish's, else the rarity colour. */
export function fxColor(fx, pal, rarity) {
  return (fx && fx.col) || (pal && pal.glow) || RARITY[rarity].color;
}
