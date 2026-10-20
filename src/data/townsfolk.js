// Herrington Hollow's people and animals: one painted sheet each (the user's People and Animals pack, cut by
// tools/build_people_pack.py into assets/sprites/people/). Every sheet holds the ten labelled emotions; the three
// Greener sheets have twenty. What they do and say lives in src/game/townlife.js, src/game/townanimals.js and
// src/data/townscripts.js; out in the world in src/game/folk.js.
import { townFrameCount } from '../game/townsfolkvisuals.js';

// [sheet, name, role, flags]  flags: c child, k knight, g guard, r royal, q courtier, v regular visitor, m merchant,
// w worker, o old, s spellcaster, h healer, f family id after '@'
const PEOPLE = [
  ['00_greener_20_frames', 'Greener', 'goblin scamp', 'c@greener'],
  ['00_greener_spooky_goofy_a', 'Grinner Greener', 'goblin scamp', 'c@greener'],
  ['00_greener_spooky_goofy_b', 'Gobble Greener', 'goblin scamp', 'c@greener'],
  ['01_militia_veteran', 'Old Tobin', 'retired veteran', 'gvo'],
  ['02_border_scout', 'Mira Thistle', 'border scout', 'gv'],
  ['03_city_watch', 'Watchman Gorm', 'guard', 'g'],
  ['04_river_patrol', 'Hale of the River Patrol', 'guard', 'g'],
  ['05_road_guard', 'Brina the Road Warden', 'guard', 'g'],
  ['06_knight_ashen_bastion', 'Aldric of the Ashen Bastion', 'knight', 'k'],
  ['07_knight_ivory_mantle', 'Elsabet of the Ivory Mantle', 'knight', 'k'],
  ['08_knight_rusted_bulwark', 'Bastian the Rusted Bulwark', 'knight', 'k'],
  ['09_knight_silver_censer', 'Cassius of the Silver Censer', 'knight', 'k'],
  ['10_knight_thornwall', 'Rosette of Thornwall', 'knight', 'k'],
  ['11_knight_cinder_crown', 'Varric of the Cinder Crown', 'knight', 'k'],
  ['12_knight_mourning_veil', 'Maeve of the Mourning Veil', 'knight', 'k'],
  ['13_knight_frostbound', 'Halvard the Frostbound', 'knight', 'k'],
  ['14_knight_dusk_lancer', 'Kestrel the Dusk Lancer', 'knight', 'k'],
  ['15_knight_hollow_star', 'Odo of the Hollow Star', 'knight', 'k'],
  ['18_king', 'King Edric', 'king', 'r'],
  ['19_queen', 'Queen Elowen', 'queen', 'r'],
  ['20_crown_prince', 'Prince Rowan', 'prince', 'r'],
  ['21_crown_princess', 'Princess Isolde', 'princess', 'r'],
  ['22_dowager_queen', 'Dowager Queen Agnes', 'dowager queen', 'ro'],
  ['23_duke', 'Duke Halric', 'duke', 'q'],
  ['24_duchess', 'Duchess Ysabet', 'duchess', 'q'],
  ['25_royal_heir', 'Pip', 'royal heir', 'cr'],
  ['26_traveling_merchant_spice', 'Zahra', 'spice merchant', 'm'],
  ['27_traveling_merchant_fur', 'Bjorn', 'fur trader', 'm'],
  ['28_traveling_merchant_glass', 'Ilse', 'glass seller', 'm'],
  ['29_traveling_merchant_books', 'Tomas', 'bookseller', 'm'],
  ['30_traveling_merchant_potter', 'Marta', 'potter', 'mw'],
  ['31_traveling_merchant_fabric', 'Ottilie', 'cloth merchant', 'm'],
  ['32_traveling_merchant_fisher', 'Nell', 'fishmonger', 'm'],
  ['33_witch', 'Nan Bramble', 'hedge witch', 'osh'],
  ['34_wizard_purple', 'Zebulon the Purple', 'wandering wizard', 's'],
  ['35_townsfolk_baker', 'Bess', 'baker', 'w'],
  ['36_townsfolk_mason', 'Dain', 'mason', 'w'],
  ['37_townsfolk_midwife', 'Hilda', 'midwife', 'oh'],
  ['38_townsfolk_stablehand', 'Finn', 'stablehand', 'w'],
  ['39_townsfolk_candle_maker', 'Quill', 'candlemaker', 'w'],
  ['40_townsfolk_porter', 'Ulf', 'porter', 'w'],
  ['41_friar', 'Brother Cael', 'friar', 'o'],
  ['42_priest', 'Mother Agatha', 'priest', 'oh'],
  ['43_townsfolk_shepherd', 'Rowena', 'shepherd', 'w'],
  ['44_townsfolk_tailor', 'Perrin', 'tailor', 'wo'],
  ['45_townsfolk_cooper', 'Greta', 'cooper', 'w'],
  ['46_townsfolk_ferryman', 'Old Ferris', 'ferryman', 'wo'],
];

export const TOWNSFOLK = Object.freeze(PEOPLE.map(([spriteId, name, role, flags], i) => {
  const has = (f) => flags.split('@')[0].includes(f);
  const child = has('c'), knight = has('k'), royal = has('r'), courtier = has('q'), guard = has('g');
  const group = child ? 'kids' : royal || courtier ? 'royal' : knight ? 'knight' : guard ? 'guard' : has('m') ? 'merchant' : has('o') ? 'old' : 'any';
  return Object.freeze({
    id: `folk_${String(i + 1).padStart(2, '0')}`, name, role, sprite: 'townsfolk', spriteId, palette: null,
    child, royal, courtier, knight, guard, regular: has('v'), merchant: has('m'), worker: has('w'), old: has('o'),
    caster: has('s'), healer: has('h'), familyId: flags.split('@')[1] || null, group,
    frame: { w: 256, h: 200, count: townFrameCount(spriteId) },
  });
}));

/** Who's who: the first resident matching a role, or a test. */
export const folkBy = (test) => TOWNSFOLK.find(typeof test === 'string' ? (v) => v.role === test || v.spriteId === test : test);
/** Short label for out in the world: "Bess the baker", "Pip", "King Edric". */
export const folkLabel = (v) => v.child || v.animal || v.name.includes(' ') ? v.name : `${v.name} the ${v.role}`;

// [sheet, name, species, where]  where: town (cats, dogs walk the lanes) | edge (rabbits, rats, deer on the outskirts)
const BEASTS = [
  ['cat_01_black', 'Soot', 'cat', 'town'], ['cat_02_tabby', 'Biscuit', 'cat', 'town'], ['cat_03_tortoiseshell', 'Patches', 'cat', 'town'],
  ['dog_01_small_terrier', 'Scamp', 'dog', 'town'], ['dog_02_hound', 'Barley', 'dog', 'town'], ['dog_03_shepherd', 'Shep', 'dog', 'town'],
  ['rabbit_01', 'a rabbit', 'rabbit', 'edge'], ['rat_01', 'a rat', 'rat', 'edge'],
  ['deer_buck_01', 'a stag', 'deer', 'edge'], ['deer_doe_01', 'a doe', 'deer', 'edge'],
];
// idle height in the cell (px of 200), for the name/bubble anchor; speeds in tiles/s
const SPECIES = { cat: { h: 62, speed: 1.3, run: 3.6 }, dog: { h: 84, speed: 1.5, run: 3.8 }, rabbit: { h: 54, speed: 1.1, run: 4.2 },
  rat: { h: 38, speed: 1.4, run: 3.4 }, deer: { h: 155, speed: 0.9, run: 4.6 } };
export const ANIMALS = Object.freeze(BEASTS.map(([spriteId, name, species, where]) => Object.freeze({
  id: spriteId, name, role: species, species, where, sprite: 'townsfolk', spriteId, palette: null, animal: true, group: 'animal',
  ...SPECIES[species], frame: { w: 256, h: 200, count: townFrameCount(spriteId) },
})));
