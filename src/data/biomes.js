// Twenty dungeon biomes. Each re-tints the catacomb tile art, monsters and lighting.
// palette -> recolor() params applied to floor/wall atlases.
// mon -> hue/sat/light shift applied to monster palettes.
export const BIOMES = [
  {
    id: 'catacombs', name: 'Skull-Lined Catacombs', palette: null, dark: 0.82, light: 7.5,
    ambient: { type: 'dust', color: '#c8b89a' }, mon: { hue: 0, sat: 1, light: 0 }, el: 'phys', blood: '#8a0b08',
    adj: ['Grave', 'Crypt', 'Ossuary'], roster: ['skeleton', 'archer', 'zombie', 'ghoul', 'wraith', 'cultist', 'spider', 'bat', 'knight', 'abomination', 'beetle', 'eye'],
    torch: '#ff9a40', fog: '#1a0e08',
  },
  {
    id: 'frozen', name: 'Frozen Ossuary', palette: { colorize: [205, 0.35], light: 0.06, contrast: 1.05 }, dark: 0.76, light: 8,
    ambient: { type: 'snow', color: '#e8f4ff' }, mon: { hue: 180, sat: 0.6, light: 0.1 }, el: 'cold', blood: '#3a7ac8',
    adj: ['Frostbitten', 'Rime', 'Glacial'], roster: ['skeleton', 'archer', 'wraith', 'golem', 'hound', 'elemental', 'knight', 'bat', 'ghoul', 'eye', 'gargoyle', 'zombie'],
    torch: '#8ad8ff', fog: '#0a1420',
  },
  {
    id: 'molten', name: 'Molten Depths', palette: { tint: [255, 90, 20, 0.45], sat: 1.3, contrast: 1.1, light: -0.02 }, dark: 0.72, light: 8,
    ambient: { type: 'ember', color: '#ff8a30' }, mon: { hue: -20, sat: 1.3, light: 0 }, el: 'fire', blood: '#ff5a10',
    adj: ['Molten', 'Cinder', 'Magma'], roster: ['imp', 'demon', 'elemental', 'golem', 'hound', 'cultist', 'beetle', 'gargoyle', 'skeleton', 'worm', 'scorpion', 'wraith'],
    torch: '#ff6a10', fog: '#200802',
  },
  {
    id: 'fungal', name: 'Fungal Grotto', palette: { hue: 80, sat: 1.1, tint: [120, 255, 160, 0.18] }, dark: 0.8, light: 7.5,
    ambient: { type: 'spore', color: '#b0ff80' }, mon: { hue: 90, sat: 1.1, light: 0 }, el: 'poison', blood: '#5ac828',
    adj: ['Sporeborn', 'Mycelial', 'Moldering'], roster: ['shroom', 'spider', 'slime', 'worm', 'zombie', 'beetle', 'scorpion', 'eye', 'hound', 'abomination', 'bat', 'cultist'],
    torch: '#a0ff70', fog: '#081408',
  },
  {
    id: 'sunken', name: 'Sunken Crypt', palette: { colorize: [175, 0.33], light: -0.04 }, dark: 0.82, light: 7,
    ambient: { type: 'drip', color: '#7ae0e0' }, mon: { hue: 150, sat: 0.9, light: 0 }, el: 'cold', blood: '#2a8a8a',
    adj: ['Drowned', 'Sodden', 'Tidal'], roster: ['zombie', 'skeleton', 'worm', 'slime', 'wraith', 'eye', 'scorpion', 'ghoul', 'knight', 'archer', 'spider', 'elemental'],
    torch: '#60f0e0', fog: '#04141a',
  },
  {
    id: 'blood', name: 'Halls of Blood', palette: { colorize: [356, 0.55], light: -0.05, contrast: 1.1 }, dark: 0.8, light: 7.5,
    ambient: { type: 'drip', color: '#c01010' }, mon: { hue: -30, sat: 1.4, light: -0.05 }, el: 'blood', blood: '#a00000',
    adj: ['Gorebound', 'Sanguine', 'Crimson'], roster: ['ghoul', 'demon', 'abomination', 'hound', 'cultist', 'bat', 'zombie', 'imp', 'knight', 'slime', 'spider', 'wraith'],
    torch: '#ff3020', fog: '#1a0202',
  },
  {
    id: 'ashen', name: 'Ashen Wastes', palette: { sat: 0.12, light: 0.04, contrast: 0.95 }, dark: 0.74, light: 8,
    ambient: { type: 'ash', color: '#a0a0a0' }, mon: { hue: 0, sat: 0.25, light: 0.05 }, el: 'fire', blood: '#4a4040',
    adj: ['Ashen', 'Charred', 'Smoldering'], roster: ['skeleton', 'golem', 'imp', 'wraith', 'hound', 'archer', 'beetle', 'gargoyle', 'knight', 'zombie', 'cultist', 'elemental'],
    torch: '#ffb070', fog: '#141414',
  },
  {
    id: 'void', name: 'Void Sanctum', palette: { colorize: [275, 0.45], light: -0.08, contrast: 1.1 }, dark: 0.86, light: 7,
    ambient: { type: 'mote', color: '#c070ff' }, mon: { hue: 220, sat: 1.2, light: -0.02 }, el: 'shadow', blood: '#5a10a0',
    adj: ['Voidtouched', 'Nether', 'Hollow'], roster: ['wraith', 'eye', 'elemental', 'cultist', 'demon', 'imp', 'gargoyle', 'knight', 'spider', 'bat', 'slime', 'abomination'],
    torch: '#b050ff', fog: '#0c0418',
  },
  {
    id: 'gilded', name: 'Gilded Tomb', palette: { colorize: [44, 0.62], light: 0.03, contrast: 1.12 }, dark: 0.74, light: 8.5,
    ambient: { type: 'glitter', color: '#ffe080' }, mon: { hue: 30, sat: 1.3, light: 0.05 }, el: 'holy', blood: '#8a0b08',
    adj: ['Gilded', 'Pharaonic', 'Golden'], roster: ['skeleton', 'knight', 'scorpion', 'golem', 'wraith', 'archer', 'beetle', 'cultist', 'gargoyle', 'zombie', 'elemental', 'eye'],
    torch: '#ffd060', fog: '#1a1404',
  },
  {
    id: 'plague', name: 'Plague Sewers', palette: { colorize: [85, 0.42], light: -0.06 }, dark: 0.82, light: 7,
    ambient: { type: 'bubble', color: '#90d040' }, mon: { hue: 70, sat: 0.9, light: -0.04 }, el: 'poison', blood: '#6a9a10',
    adj: ['Plagued', 'Festering', 'Rotten'], roster: ['zombie', 'slime', 'worm', 'abomination', 'spider', 'beetle', 'bat', 'ghoul', 'shroom', 'hound', 'cultist', 'scorpion'],
    torch: '#c0ff40', fog: '#0a1004',
  },
  {
    id: 'crystal', name: 'Crystal Caverns', palette: { colorize: [192, 0.6], contrast: 1.2, light: 0.02 }, dark: 0.72, light: 9,
    ambient: { type: 'glitter', color: '#a0ffff' }, mon: { hue: 170, sat: 1.4, light: 0.06 }, el: 'light', blood: '#40c0ff',
    adj: ['Crystalline', 'Prismatic', 'Shardborn'], roster: ['elemental', 'golem', 'spider', 'eye', 'gargoyle', 'beetle', 'bat', 'scorpion', 'slime', 'wraith', 'knight', 'hound'],
    torch: '#80ffff', fog: '#041418',
  },
  {
    id: 'desert', name: 'Bone Desert Tombs', palette: { colorize: [36, 0.42], light: 0.1 }, dark: 0.7, light: 9,
    ambient: { type: 'sand', color: '#e0c080' }, mon: { hue: 20, sat: 0.9, light: 0.08 }, el: 'phys', blood: '#8a3008',
    adj: ['Sunscorched', 'Dune', 'Sandworn'], roster: ['scorpion', 'skeleton', 'worm', 'beetle', 'archer', 'hound', 'zombie', 'golem', 'gargoyle', 'cultist', 'spider', 'knight'],
    torch: '#ffc070', fog: '#1a1006',
  },
  {
    id: 'shadow', name: 'Shadow Labyrinth', palette: { sat: 0.3, light: -0.16, contrast: 1.1 }, dark: 0.9, light: 6,
    ambient: { type: 'wisp', color: '#504060' }, mon: { hue: 250, sat: 0.4, light: -0.1 }, el: 'shadow', blood: '#20101a',
    adj: ['Shadowed', 'Umbral', 'Lightless'], roster: ['wraith', 'ghoul', 'spider', 'bat', 'hound', 'eye', 'knight', 'cultist', 'imp', 'gargoyle', 'abomination', 'skeleton'],
    torch: '#9a80ff', fog: '#000000',
  },
  {
    id: 'forge', name: 'Infernal Forge', palette: { colorize: [12, 0.65], contrast: 1.15, light: -0.03 }, dark: 0.74, light: 8,
    ambient: { type: 'ember', color: '#ff5a10' }, mon: { hue: -15, sat: 1.4, light: -0.03 }, el: 'fire', blood: '#ff3000',
    adj: ['Infernal', 'Hellforged', 'Brimstone'], roster: ['demon', 'imp', 'golem', 'knight', 'hound', 'gargoyle', 'elemental', 'cultist', 'abomination', 'beetle', 'skeleton', 'scorpion'],
    torch: '#ff4000', fog: '#1e0400',
  },
  {
    id: 'abyss', name: 'Abyssal Rift', palette: { colorize: [232, 0.5], light: -0.1, contrast: 1.15 }, dark: 0.86, light: 7,
    ambient: { type: 'mote', color: '#6080ff' }, mon: { hue: 200, sat: 1.2, light: -0.05 }, el: 'light', blood: '#2040c0',
    adj: ['Abyssal', 'Deepborn', 'Starless'], roster: ['eye', 'wraith', 'elemental', 'worm', 'spider', 'demon', 'slime', 'knight', 'gargoyle', 'cultist', 'bat', 'abomination'],
    torch: '#6080ff', fog: '#02041a',
  },
  {
    id: 'thorn', name: 'Thornwood Barrow', palette: { colorize: [100, 0.32], light: -0.04 }, dark: 0.8, light: 7.5,
    ambient: { type: 'leaf', color: '#80a040' }, mon: { hue: 60, sat: 0.8, light: -0.02 }, el: 'poison', blood: '#6a2a08',
    adj: ['Thornbound', 'Barrow', 'Bramble'], roster: ['hound', 'spider', 'shroom', 'zombie', 'skeleton', 'archer', 'worm', 'scorpion', 'beetle', 'ghoul', 'cultist', 'golem'],
    torch: '#d0ff80', fog: '#081006',
  },
  {
    id: 'storm', name: 'Storm Spire', palette: { colorize: [214, 0.4], contrast: 1.15, light: 0.02 }, dark: 0.76, light: 8.5,
    ambient: { type: 'spark', color: '#c0e0ff' }, mon: { hue: 190, sat: 1.1, light: 0.04 }, el: 'light', blood: '#3060c0',
    adj: ['Stormwrought', 'Thunder', 'Galvanic'], roster: ['elemental', 'gargoyle', 'golem', 'knight', 'eye', 'hound', 'imp', 'cultist', 'bat', 'skeleton', 'archer', 'wraith'],
    torch: '#a0d0ff', fog: '#060c1a',
  },
  {
    id: 'obsidian', name: 'Obsidian Vault', palette: { sat: 0.25, light: -0.12, contrast: 1.35 }, dark: 0.84, light: 7,
    ambient: { type: 'dust', color: '#8080a0' }, mon: { hue: 260, sat: 0.3, light: -0.08 }, el: 'arcane', blood: '#300830',
    adj: ['Obsidian', 'Glassbound', 'Onyx'], roster: ['golem', 'knight', 'gargoyle', 'elemental', 'wraith', 'eye', 'beetle', 'spider', 'cultist', 'demon', 'skeleton', 'abomination'],
    torch: '#e080ff', fog: '#08060c',
  },
  {
    id: 'flesh', name: 'Flesh Pits', palette: { colorize: [342, 0.45], light: 0.02 }, dark: 0.78, light: 7.5,
    ambient: { type: 'spore', color: '#ff6080' }, mon: { hue: -40, sat: 1.2, light: 0.02 }, el: 'blood', blood: '#b00010',
    adj: ['Fleshwoven', 'Visceral', 'Writhing'], roster: ['abomination', 'worm', 'ghoul', 'slime', 'zombie', 'spider', 'eye', 'hound', 'demon', 'beetle', 'bat', 'shroom'],
    torch: '#ff5070', fog: '#1a0408',
  },
  {
    id: 'throne', name: "Velscour's Throne", palette: { colorize: [4, 0.72], light: -0.1, contrast: 1.2 }, dark: 0.8, light: 8,
    ambient: { type: 'ember', color: '#ff3a10' }, mon: { hue: -10, sat: 1.5, light: -0.06 }, el: 'fire', blood: '#c00000',
    adj: ['Hellsworn', 'Doom', 'Archfiend'], roster: ['demon', 'imp', 'knight', 'gargoyle', 'abomination', 'hound', 'wraith', 'cultist', 'elemental', 'golem', 'eye', 'skeleton'],
    torch: '#ff2000', fog: '#200000',
  },
];

export const BIOME_BY_ID = Object.fromEntries(BIOMES.map((b) => [b.id, b]));

/** Pick a random biome other than `exclude` (and never the throne before depth 100). */
export function randomBiome(exclude, depth) {
  if (depth === 100) return 'throne';
  const pool = BIOMES.filter((b) => b.id !== exclude && b.id !== 'throne');
  return pool[Math.floor(Math.random() * pool.length)].id;
}

export const TOWN_BIOME = {
  id: 'town', name: 'Duskhollow', palette: { colorize: [30, 0.22], light: 0.12, contrast: 0.95 }, wallPalette: { colorize: [32, 0.2], light: 0.18 },
  dark: 0.45, light: 12, ambient: { type: 'firefly', color: '#ffe890' }, mon: { hue: 0, sat: 1, light: 0 }, blood: '#8a0b08', torch: '#ffb050', fog: '#0a0806',
};
