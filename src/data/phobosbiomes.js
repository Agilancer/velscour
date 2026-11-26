// The ten dungeon biomes of City State Phobos and Castle Velscour. Their packs (assets/tiles/ph_*/) are Bellmourn's
// seamless Phobos tiles laid over the Castle Keep, Catacombs and Sewers walls, arches and floors by tools/phobostex.py;
// their props come from those rig packs (`morePacks`, 1-based ranges as in data/biomes.js). Never in a biome bag,
// ACT_BIOMES or the overworld list: the Phobos story builds them by id (`phobos: true`).
const CK = 'castle_keep', CAT = 'catacombs', SEW = 'sewers';
// prop groups of the rig packs (see each pack.json's scatter)
const CK_HALL = [[1, 3], [8, 13], [16, 21], [27, 30], [37, 38], [40, 40]], CK_IRON = [[4, 7], [11, 14], [17, 18], [22, 26], [31, 37], [39, 39]];
const CK_SIEGE = [[15, 16], [19, 22], [31, 31], [35, 35], [37, 37]];
const CAT_BONES = [[4, 6], [21, 22], [28, 30]], CAT_RITES = [[7, 16], [24, 27], [31, 35]], CAT_STONE = [[17, 19], [32, 32]];
const SEW_ALL = [[1, 40]];

const ph = (o) => ({ palette: null, wallPack: null, part: null, moreFloors: null, townProps: null, painted: false, phobos: true, ...o, pack: o.id });

export const PHOBOS_BIOMES = [
  ph({
    id: 'ph_city', name: "Phobos: the King's Mile", style: 'maze', dark: 0.72, light: 8.6,
    ambient: { type: 'dust', color: '#d8b890' }, mon: { hue: 20, sat: 0.9, light: 0.02 }, el: 'phys', blood: '#8a0b08',
    adj: ['Chainmarket', "King's Mile", 'Tolled', 'Shuttered'], roster: ['cultist', 'knight', 'archer', 'hound', 'zombie', 'ghoul', 'wraith', 'imp', 'bat', 'skeleton'],
    torch: '#ffb45d', fog: '#14100c', morePacks: [[CK, [...CK_HALL, ...CK_SIEGE]]],
    townProps: ['market_table', 'crate_stack'],
  }),
  ph({
    id: 'ph_slums', name: 'Phobos: the Rookeries', style: 'ruin', dark: 0.8, light: 7.4,
    ambient: { type: 'drip', color: '#a8a078' }, mon: { hue: 40, sat: 0.7, light: -0.04 }, el: 'poison', blood: '#6a1a0a',
    adj: ['Rookery', "Tanner's", 'Wharfside', 'Gutter'], roster: ['zombie', 'ghoul', 'hound', 'cultist', 'spider', 'bat', 'slime', 'skeleton', 'abomination', 'beetle'],
    torch: '#e8a050', fog: '#0f0c08', morePacks: [[SEW, [[5, 8], [21, 23], [27, 30], [40, 40]]], [CAT, CAT_BONES]],
    townProps: ['crate_stack', 'firewood_stack'],
  }),
  ph({
    id: 'ph_cinder', name: 'Phobos: the Cinder Quarter', style: 'ruin', dark: 0.78, light: 7.8,
    ambient: { type: 'ash', color: '#9a9088' }, mon: { hue: 15, sat: 0.6, light: -0.05 }, el: 'fire', blood: '#5a1808',
    adj: ['Cinder', 'Sooted', 'Burnt', 'Smouldering'], roster: ['zombie', 'imp', 'elemental', 'demon', 'skeleton', 'ghoul', 'wraith', 'hound', 'cultist', 'golem'],
    torch: '#ff7a30', fog: '#120a06', morePacks: [[CK, CK_SIEGE], [CAT, CAT_STONE]],
  }),
  ph({
    id: 'ph_bones', name: 'Phobos: the Bone Yards', style: 'crypt', dark: 0.8, light: 7.6,
    ambient: { type: 'mote', color: '#e8e0c8' }, mon: { hue: 0, sat: 0.55, light: 0.08 }, el: 'cold', blood: '#6a0e0a',
    adj: ['Ossuary', 'Bone-Yard', 'Charnel', 'Ivory'], roster: ['skeleton', 'archer', 'wraith', 'ghoul', 'zombie', 'abomination', 'cultist', 'bat', 'eye', 'gargoyle'],
    torch: '#ffd890', fog: '#100e0a', morePacks: [[CAT, [...CAT_BONES, ...CAT_RITES, ...CAT_STONE]]],
  }),
  ph({
    id: 'ph_rich', name: "Phobos: the Mages' Rise", style: 'hall', dark: 0.74, light: 8.6,
    ambient: { type: 'glitter', color: '#c8a8ff' }, mon: { hue: 270, sat: 0.8, light: 0.02 }, el: 'arcane', blood: '#5a0a2a',
    adj: ["Mages'", "Dukes'", 'Gilded', 'Velvet'], roster: ['cultist', 'eye', 'gargoyle', 'golem', 'elemental', 'wraith', 'knight', 'imp', 'archer', 'skeleton'],
    torch: '#d8a0ff', fog: '#0e0a14', morePacks: [[CK, CK_HALL]],
    townProps: ['scroll_rack', 'potion_jars'],
  }),
  ph({
    id: 'ph_wall', name: 'Phobos: the City Wall', style: 'hall', dark: 0.78, light: 8,
    ambient: { type: 'dust', color: '#9aa4b8' }, mon: { hue: 210, sat: 0.6, light: -0.02 }, el: 'phys', blood: '#6a0a0a',
    adj: ['Barbican', 'Rampart', 'Bastion', 'Gatehouse'], roster: ['knight', 'archer', 'skeleton', 'gargoyle', 'golem', 'hound', 'cultist', 'wraith', 'bat', 'zombie'],
    torch: '#ffa860', fog: '#0a0c10', morePacks: [[CK, [...CK_IRON, ...CK_SIEGE]]],
  }),
  ph({
    id: 'ph_sewers', name: 'Phobos: the Undercroft', style: 'channel', dark: 0.82, light: 7.2,
    ambient: { type: 'drip', color: '#9ad070' }, mon: { hue: 85, sat: 0.8, light: -0.03 }, el: 'poison', blood: '#3a5a18',
    adj: ['Undercroft', 'Sluice', 'Drowned', 'Slime'], roster: ['slime', 'zombie', 'ghoul', 'spider', 'worm', 'bat', 'abomination', 'shroom', 'beetle', 'skeleton'],
    torch: '#a8ff60', fog: '#060a05', morePacks: [[SEW, SEW_ALL]],
  }),
  ph({
    id: 'ph_castle', name: 'Castle Velscour: the Wards', style: 'hall', dark: 0.76, light: 8.4,
    ambient: { type: 'dust', color: '#b8c4d8' }, mon: { hue: 220, sat: 0.7, light: 0 }, el: 'phys', blood: '#7a0a0a',
    adj: ['Warded', 'Black-Iron', 'Oathsworn', "Velscour's"], roster: ['knight', 'archer', 'cultist', 'gargoyle', 'wraith', 'skeleton', 'golem', 'hound', 'demon', 'abomination'],
    torch: '#ffb45d', fog: '#0c0c12', morePacks: [[CK, [[1, 40]]]],
  }),
  ph({
    id: 'ph_keep', name: 'Castle Velscour: the Keep', style: 'hall', dark: 0.84, light: 7.6,
    ambient: { type: 'ember', color: '#e0d0c0' }, mon: { hue: 330, sat: 0.75, light: -0.04 }, el: 'fire', blood: '#4a0612',
    adj: ['Bone-Jointed', 'Basalt', 'Throne', 'Spire'], roster: ['knight', 'demon', 'wraith', 'gargoyle', 'cultist', 'abomination', 'imp', 'elemental', 'skeleton', 'eye'],
    torch: '#ff6a50', fog: '#0c0608', morePacks: [[CK, CK_IRON], [CAT, CAT_BONES]],
  }),
  ph({
    id: 'ph_marches', name: 'Phobos: the Marches', style: 'crypt', dark: 0.72, light: 8.8,
    ambient: { type: 'leaf', color: '#a8a890' }, mon: { hue: 60, sat: 0.6, light: 0.02 }, el: 'phys', blood: '#7a0b08',
    adj: ['Marchland', 'Lichen', 'Granite', 'Border'], roster: ['knight', 'archer', 'hound', 'skeleton', 'zombie', 'wraith', 'spider', 'bat', 'golem', 'cultist'],
    torch: '#ffb860', fog: '#0e100c', morePacks: [[CK, [...CK_SIEGE, ...CK_HALL]], [CAT, CAT_STONE]],
  }),
];
export const PHOBOS_BIOME_BY_ID = Object.fromEntries(PHOBOS_BIOMES.map((b) => [b.id, b]));
