// THE SEA OF SAND BESTIARY (VELSCOUR_Sea_of_Sand_200_Sprites.zip, the Thanksgiving update): 50 small creatures,
// 70 large monsters, 30 mythic monsters and 50 huge bosses of the deserts, cut by heat map with tools/sandkin.py and
// packed by `python tools/process_assets.py enemies sand` into one atlas per sheet (sand/01_dune_hollows ..
// sand/20_astral_desert_and_glass, ten each). They live only in the deserts (DESERT_BIOMES: the Sea of Sand and its
// pyramid dunes, the desert, tomb and temple dungeons and their Sheer Drops): there rollLooks fills most of a level's
// packs with them, a mythic now and then, and most guardians and BOSS ROOM bosses are theirs; the dunes' variants
// (data/dunes.js) take the ones the roster suggests for them, and the Sea of Sand's own creatures trade looks with them.
// Rows are [name, arch, also, extras]; the id is 'sk_' + the name in snake case, the cell the row's index in its sheet.
// `h` is the roster's world height (1.8 art px a world px), held down for the bigger tiers so they fit a level.
const mortal = { undead: false, demon: false };
const bone = { undead: true, gore: 'bone' };
const dead = { undead: true };
const rock = { gore: 'rock' };
const sheet = (file, tier, zone, dunes, hs) => (rows) => rows.map(([name, arch, also, o], i) => ({
  id: 'sk_' + name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''), sheet: 'sand/' + file, i, arch,
  also: also || [], name, h: hs[i], sandKin: true, tier, zone, dunes, ...mortal,
  ...(tier === 'mythic' ? { mythic: true } : tier === 'boss' ? { boss: true, lone: true } : null), ...o,
}));
// the roster's suggested world heights (px) per cell, scaled: small 1, large 0.85, mythic 0.75, boss 0.62
const S = [31, 36, 34, 38, 30, 39, 37, 33, 32, 40];
const L = [66, 70, 76, 73, 78, 68, 77, 64, 71, 80].map((h) => Math.round(h * 0.85));
const M = [109, 116, 122, 127, 119, 131, 124, 112, 129, 133].map((h) => Math.round(h * 0.75));
const B = [140, 144, 153, 147, 158, 151, 160, 143, 157, 149].map((h) => Math.round(h * 0.62));

export const SAND_KIN = [
  // ---------------------------------------------------------------- small creatures
  ...sheet('01_dune_hollows', 'small', 'Dune Hollows', ['golden', 'red'], S)([
    ['Sandglass Flea', 'spider', ['beetle']], ['Blind Dune Mole', 'hound', ['ghoul']], ['Copper Whisker Jerboa', 'hound'],
    ['Saffron Sand Flea', 'spider', ['scorpion']], ['Powder Puff Crawler', 'beetle', ['spider'], { el: 'fire', gore: 'goo' }],
    ['Buried Bell Cricket', 'spider', ['beetle']], ['Rippleback Skink', 'hound', ['scorpion']], ['Shale Ear Pika', 'hound'],
    ['Hollow Thorn Tick', 'spider', [], { gore: 'goo' }], ['Dune Funnel Antlion', 'scorpion', ['spider'], { gore: 'goo' }],
  ]),
  ...sheet('02_salt_flats', 'small', 'Salt Flats', ['gypsum', 'saltflats'], S)([
    ['Brine Prism Crab', 'scorpion', [], { el: 'cold', gore: 'goo' }], ['Chalk Gnat Host', 'bat', ['beetle']],
    ['Salt Loom Mite', 'spider'], ['White Rind Geode Snail', 'slime', ['beetle'], rock],
    ['Alkali Spadefoot', 'slime', ['ghoul'], { el: 'poison' }], ['Dry Pan Isopod', 'beetle', ['spider'], { gore: 'goo' }],
    ['Glaze Ankle Centipede', 'worm', ['spider']], ['Salt Quill Hedgehog', 'hound', ['beetle']],
    ['Evaporite Loach', 'worm', [], { el: 'cold' }], ['White Mask Shrimp', 'scorpion', [], { gore: 'goo' }],
  ]),
  ...sheet('03_oasis_fringe', 'small', 'Oasis Fringe', ['emerald', 'golden'], S)([
    ['Reed Cup Frog', 'slime', ['ghoul'], { el: 'poison' }], ['Date Pit Weevil', 'beetle', [], { gore: 'goo' }],
    ['Water Jar Hermit Crab', 'scorpion', [], { gore: 'goo' }], ['Palm Husk Bat', 'bat'], ['Cactus Needlebird', 'bat', ['gargoyle']],
    ['Silt Lace Newt', 'worm', ['hound']], ['Mirage Minnow Wisp', 'elemental', ['bat'], { el: 'arcane', gore: 'ecto' }],
    ['Mud Seal Tortoise', 'golem', ['beetle']], ['Night Reed Gecko', 'hound', ['ghoul']], ['Pale Fig Mantid', 'scorpion', ['spider'], { gore: 'goo' }],
  ]),
  ...sheet('04_caravan_tracks', 'small', 'Caravan Tracks', ['golden', 'copper'], S)([
    ['Broken Seal Locomote', 'golem', ['beetle'], rock], ['Bone Thimble Spider', 'spider', [], { gore: 'bone' }],
    ['Spillgrain Rat', 'hound', ['ghoul']], ['Copper Stitch Moth', 'bat'], ['Breadcrumb Gargoyle', 'gargoyle', ['imp'], rock],
    ['Clothpin Imp', 'imp', [], { demon: true }], ['Bedroll Worm', 'worm'], ['Canteen Clasp Mimic', 'ghoul', ['beetle'], rock],
    ['Glass Bead Millipede', 'worm', ['spider']], ['Brass Spur Biter', 'spider', ['hound']],
  ]),
  ...sheet('05_pyramid_antechamber', 'small', 'Pyramid Antechamber', ['golden', 'moonlit'], S)([
    ['Shard Foot Plover', 'bat', ['gargoyle']], ['Gilt Ink Crawler', 'spider', ['scorpion']],
    ['Bead Collar Wight', 'wraith', ['skeleton'], { ...dead, gore: 'ecto', el: 'shadow' }], ['Sealwax Spiderlet', 'spider'],
    ['Pumice Urchin', 'beetle', [], { el: 'fire', gore: 'rock' }], ['Mortar Fleck Lurker', 'ghoul', ['golem'], rock],
    ['Amber Pin Beetle', 'beetle', [], { gore: 'goo' }], ['Linen Fold Imp', 'imp', ['zombie'], { ...dead }],
    ['Tablet Jaw Gecko', 'hound', ['ghoul']], ['Eye Socket Sandgrouse', 'bat', ['eye']],
  ]),
  // ---------------------------------------------------------------- large monsters
  ...sheet('06_basalt_ravines', 'large', 'Basalt Ravines', ['obsidian', 'red'], L)([
    ['Crag Jaw Blesbok', 'hound', ['knight']], ['Basalt Rib Hyrax', 'golem', ['hound'], rock],
    ['Tuff Horn Butcher', 'abomination', ['demon', 'golem']], ['Volcanic Trumpet Worm', 'worm', [], { el: 'fire' }],
    ['Obsidian Spade Mantid', 'scorpion', ['spider'], { gore: 'goo' }], ['Seam Walking Boulderback', 'golem', [], rock],
    ['Pumice Hood Monstrosity', 'abomination', ['golem'], rock], ['Sulfur Shard Baboon', 'ghoul', ['imp'], { el: 'poison' }],
    ['Ravine Plate Wasp', 'gargoyle', ['bat'], { gore: 'goo' }], ['Cinder Brow Aurochs', 'knight', ['hound'], { el: 'fire', gore: 'flesh' }],
  ]),
  ...sheet('07_shifting_dunes', 'large', 'Shifting Dunes', ['golden', 'red'], L)([
    ['Sailback Sand Pangolin', 'golem', ['scorpion']], ['Banded Dune Mara', 'hound'], ['Dromedary Dredge', 'abomination', ['zombie']],
    ['Awning Ray', 'gargoyle', ['bat']], ['Sand Comb Stag', 'knight', ['hound'], { gore: 'flesh' }], ['Spiral Spine Oryx', 'hound', ['knight']],
    ['Buried Jaw Gharial', 'worm', ['scorpion']], ['Rhyolite Knuckle Drake', 'demon', ['golem'], { el: 'fire' }],
    ['Saffron Frill Tunneler', 'worm', ['scorpion']], ['Dune Hinge Centipede', 'worm', ['spider'], { gore: 'goo' }],
  ]),
  ...sheet('08_salt_and_glass_expanse', 'large', 'Salt and Glass Expanse', ['saltflats', 'obsidian'], L)([
    ["Glassblower's Ram", 'knight', ['hound'], { gore: 'flesh' }], ['Borax Claw Prawn', 'scorpion', [], { gore: 'goo' }],
    ['Clear Throat Hyena', 'hound'], ['Prism Hoof Kudu', 'hound', ['knight']], ['Sunblown Porcelain Giant', 'golem', ['knight'], rock],
    ['Caustic Spit Pangolin', 'worm', ['scorpion'], { el: 'poison' }], ['Glaze Shell Monitor', 'scorpion', ['ghoul']],
    ['Glass Reed Cassowary', 'hound', ['gargoyle']], ['Salt Fissure Basilisk', 'worm', ['scorpion'], { el: 'cold' }],
    ['Crystal Heel Gastropod', 'slime', ['golem'], { el: 'cold', gore: 'goo' }],
  ]),
  ...sheet('09_dry_river_and_oasis', 'large', 'Dry River and Oasis', ['emerald', 'golden'], L)([
    ['Sluice Shell Hippopotamus', 'abomination', ['golem']], ['Silt Mantle Egret', 'gargoyle', ['bat'], { gore: 'flesh' }],
    ['Flood Bark Crocodile', 'hound', ['scorpion']], ['Date Husk Colugo', 'bat', ['gargoyle']],
    ['Well Winch Catoblepas', 'abomination', ['demon', 'golem'], { el: 'poison' }], ['Mud Brick Crayfish', 'scorpion', ['golem'], rock],
    ['Jackfruit Maw Baboon', 'ghoul', ['zombie']], ['Cistern Branch Hydra', 'worm', ['shroom'], { el: 'poison' }],
    ['Reed Roof Otterfiend', 'ghoul', ['imp']], ['Lily Hood Prowler', 'hound', ['ghoul']],
  ]),
  ...sheet('10_caravan_grave_roads', 'large', 'Caravan Grave Roads', ['copper', 'bone'], L)([
    ['Baggage Rack Revenant', 'skeleton', ['knight'], bone], ['Spindle Axle Ghoul', 'ghoul', ['zombie'], dead],
    ['Sun Faded Standard Tortoise', 'golem', ['cultist']], ['Trade Weight Golem', 'golem', [], rock],
    ['Kettleback Scavenger', 'zombie', ['ghoul']], ['Bridle Jaw Abomination', 'abomination', ['zombie']],
    ['Sundial Robber Effigy', 'archer', ['golem'], rock], ['Copper Pack Saddle Horror', 'abomination', ['demon', 'golem']],
    ['Spoked Cart Widow', 'spider', [], { gore: 'goo' }], ['Tallow Box Skulker', 'ghoul', ['imp'], { el: 'fire' }],
  ]),
  ...sheet('11_pyramid_vaults', 'large', 'Pyramid Vaults', ['gypsum', 'bone'], L)([
    ['Kiln Door Ushabti', 'golem', ['knight'], rock], ['Funeral Loom Revenant', 'zombie', ['skeleton'], dead],
    ['Choir Niche Omen', 'wraith', ['cultist'], { ...dead, gore: 'ecto', el: 'shadow' }], ['Obsidian Inlay Bastion', 'knight', ['golem'], rock],
    ['Painted Plaster Chimera', 'demon', ['gargoyle'], rock], ['Perfume Vessel Horror', 'shroom', ['abomination', 'cultist'], { el: 'poison' }],
    ['Sandstone Seal Lamassu', 'gargoyle', ['knight'], rock], ['Arch Key Ram', 'knight', ['hound'], { gore: 'flesh' }],
    ['Cinnabar Grout Scarifier', 'cultist', ['ghoul'], { el: 'fire' }], ['Sarcophagus Slat Caterpillar', 'worm', ['zombie']],
  ]),
  ...sheet('12_buried_astronomy_halls', 'large', 'Buried Astronomy Halls', ['moonlit', 'copper'], L)([
    ['Bronze Sextant Lurker', 'ghoul', ['spider']], ['Orrery Ring Crawler', 'spider', ['elemental']],
    ['Sun Transit Husk', 'zombie', ['cultist'], { ...dead, el: 'fire' }], ['Copper Chart Ophidian', 'worm', ['cultist'], { el: 'arcane' }],
    ['Cracked Meridian Statue', 'golem', ['knight'], rock], ['Ink Well Astral Crane', 'gargoyle', ['bat'], { el: 'arcane' }],
    ['Star Dial Eye Fiend', 'eye', ['demon'], { el: 'arcane' }], ['Telescope Neck Jacana', 'archer', ['gargoyle'], { gore: 'flesh', fly: false }],
    ['Eclipse Plate Mimic', 'ghoul', ['golem'], { el: 'shadow', gore: 'rock' }], ['Celestial Tile Serpent', 'worm', ['elemental'], { el: 'arcane' }],
  ]),
  // ---------------------------------------------------------------- mythic monsters (rare, a pack's champion)
  ...sheet('13_dune_below', 'mythic', 'Dune Below', ['golden', 'red', 'storm'], M)([
    ['Mother of the Buried Furrows', 'worm', ['abomination']], ['Interdune Mantleback', 'golem', ['scorpion']],
    ['Crest of the Singing Dune', 'demon', ['gargoyle'], { el: 'light' }], ['Plateback of the Endless Drift', 'golem', ['abomination']],
    ['The Saffron Trench Prowler', 'knight', ['hound'], { gore: 'flesh' }], ['Sunshard Spiral Leviathan', 'worm', [], { el: 'fire' }],
    ['The Dustfront Throat', 'abomination', ['worm']], ['Hundred Rib Antlion', 'scorpion', ['spider'], { gore: 'goo' }],
    ['Dune Sea Saddlebeast', 'abomination', ['golem']], ['The Deep Sand Weir', 'golem', ['worm'], rock],
  ]),
  ...sheet('14_sunken_monuments', 'mythic', 'Sunken Monuments', ['bone', 'gypsum', 'obsidian'], M)([
    ['Sunken Pillar Behemoth', 'golem', [], rock], ['The Buried Courtyard Host', 'abomination', ['zombie'], dead],
    ['Ossified Arc of the Mastaba', 'golem', ['skeleton'], bone], ['The Wind Eroded Throne', 'golem', ['knight'], rock],
    ['Walking Colonnade of the South', 'golem', [], rock], ['The Lacquered Cenotaph', 'knight', ['golem'], rock],
    ['Undercrypt Mosaic Hydra', 'worm', ['abomination'], { el: 'poison' }], ['The Lintel Skinned Mammoth', 'abomination', ['golem']],
    ['Diorite Censer Giant', 'demon', ['golem'], { el: 'fire', gore: 'rock' }], ['The Stairway Carapace', 'scorpion', ['golem'], rock],
  ]),
  ...sheet('15_mirage_and_salt_storms', 'mythic', 'Mirage and Salt Storms', ['emerald', 'saltflats', 'storm'], M)([
    ['Walking Mirage Cistern', 'golem', ['elemental'], { el: 'cold', gore: 'rock' }], ['Cerulean Dryfall Leviathan', 'worm', [], { el: 'cold' }],
    ['The Pall of Noon', 'wraith', ['demon'], { el: 'shadow', gore: 'ecto' }], ['Hallucination Saddle Wyrm', 'demon', ['worm'], { el: 'arcane' }],
    ['Salt Panorama Centaur', 'knight', ['hound'], { el: 'cold', gore: 'flesh' }], ["The Horizon's Empty Palanquin", 'wraith', ['golem'], { el: 'arcane', gore: 'ecto' }],
    ['Needle Storm Kite Titan', 'gargoyle', ['demon'], { el: 'light' }], ['The Third Mirage Crocodile', 'abomination', ['hound'], { el: 'arcane' }],
    ['Celestial Brine Nautilus', 'eye', ['worm'], { el: 'arcane' }], ['The Heat Haze Humpback', 'abomination', ['golem'], { el: 'fire' }],
  ]),
  // ---------------------------------------------------------------- huge bosses (guardians, BOSS ROOMs, the pyramids)
  ...sheet('16_pyramid_keepers', 'boss', 'Pyramid Keepers', ['golden', 'obsidian', 'bone'], B)([
    ['Amehet the Ossuary Architect', 'cultist', ['golem'], { ...bone, el: 'shadow' }], ['The Six-Sill Pharaoh', 'knight', ['cultist'], dead],
    ['Khessari the Obsidian Regent', 'knight', ['demon'], { el: 'fire' }], ['Scales of the Last Embalmer', 'golem', ['cultist'], rock],
    ['The Sealed Queen of Veils', 'wraith', ['cultist'], { ...dead, el: 'shadow', gore: 'ecto' }], ['Grand Vizier of the Closed Eye', 'cultist', ['eye'], { el: 'arcane' }],
    ['Basin of the Nine Funeral Oils', 'abomination', ['shroom'], { el: 'poison' }], ['Avarat the Canopic Pretender', 'zombie', ['knight'], dead],
    ['The Dead King Who Never Sat', 'skeleton', ['knight'], bone], ['The Mask Beneath the Pyramid', 'demon', ['golem'], { el: 'shadow', gore: 'rock' }],
  ]),
  ...sheet('17_deep_deserts', 'boss', 'Deep Deserts', ['red', 'golden', 'storm'], B)([
    ['Rhazek the Driftbreaker', 'golem', ['demon'], rock], ['The Nine Dune Maw', 'worm', ['abomination']],
    ['Ishbara the Sky Sickle', 'gargoyle', ['demon']], ['The Silt Colossus with Four Hearts', 'golem', [], rock],
    ['Duneswallow Gargantua', 'worm', ['abomination']], ['Mother of the Shifting Valleys', 'scorpion', ['abomination'], { gore: 'goo' }],
    ['The Bone Sirocco', 'elemental', ['wraith'], { gore: 'bone' }], ['Zakhara the Red Salt Burrower', 'scorpion', ['worm'], { gore: 'goo' }],
    ['King Bleshekh of the Sand Trenches', 'knight', ['scorpion']], ['The Gilt Throat of the Wastes', 'worm', ['demon'], { el: 'holy' }],
  ]),
  ...sheet('18_oasis_and_cisterns', 'boss', 'Oasis and Cisterns', ['emerald', 'saltflats'], B)([
    ['Queen Mesheri of the Bitter Spring', 'cultist', ['wraith'], { el: 'poison' }], ['The Drowned Garden Gate', 'golem', ['shroom'], rock],
    ['Nakhut the Well Below the Well', 'eye', ['worm'], { el: 'cold' }], ['The Lily Crown Devourer', 'abomination', ['shroom'], { el: 'poison' }],
    ['Taurava the Palm Breaker', 'demon', ['knight']], ['The Cistern With a Hundred Tongues', 'abomination', ['worm']],
    ['Azhira of the Broken Water Clock', 'cultist', ['elemental'], { el: 'cold' }], ['The Crocodile in the Empty Canal', 'hound', ['abomination']],
    ['The Wellmouth Choir', 'wraith', ['cultist'], { el: 'shadow', gore: 'ecto' }], ['The Last Keeper of the Black Acre', 'zombie', ['knight'], dead],
  ]),
  ...sheet('19_cliff_and_caravan_roads', 'boss', 'Cliff and Caravan Roads', ['copper', 'obsidian', 'red'], B)([
    ['Orvek the Brass Toll King', 'knight', ['golem']], ['Carriage of the Broken Axle', 'golem', ['abomination'], rock],
    ['Hazarra the Cliff Mother', 'gargoyle', ['spider']], ['The Shardhorn Avalanche', 'golem', ['hound'], rock],
    ['Besharin the Mule Saint', 'cultist', ['abomination'], { el: 'holy' }], ['The Iron Yoke of the Last Caravan', 'knight', ['zombie']],
    ['The Spire That Learned to Walk', 'golem', [], rock], ['Riders Beneath the Selling Post', 'knight', ['skeleton']],
    ['The Great Waymarker Devourer', 'abomination', ['golem']], ['The Collapsed Ravine Herald', 'demon', ['golem'], rock],
  ]),
  ...sheet('20_astral_desert_and_glass', 'boss', 'Astral Desert and Glass', ['moonlit', 'storm', 'obsidian'], B)([
    ['Serakhet the Sunset Crucible', 'elemental', ['demon'], { el: 'fire' }], ['Mistress of the Northern Mirage', 'wraith', ['cultist'], { el: 'arcane', gore: 'ecto' }],
    ['The Starmap Inverted', 'eye', ['elemental'], { el: 'arcane' }], ['The Weight of Noon', 'golem', [], { el: 'holy', gore: 'rock' }],
    ['The Abandoned Orb of Skara', 'eye', [], { el: 'arcane' }], ['The Salt Sun in a Broken Halo', 'elemental', ['cultist'], { el: 'holy' }],
    ['Ishvekh the Sky Mirror', 'gargoyle', ['wraith'], { el: 'light' }], ['The Shattered Orrery Prince', 'cultist', ['golem'], { el: 'arcane' }],
    ['Born Under a Dry Eclipse', 'demon', ['wraith'], { el: 'shadow' }], ["The Last Mirage at World's End", 'wraith', ['demon'], { el: 'arcane', gore: 'ecto' }],
  ]),
];

// THE SEA OF SAND'S HUMANOIDS AND DJINN (VELSCOUR_Sea_of_Sand_Humanoids_and_Djinn_310.zip): 50 mummies, 40 zombies,
// 20 living, 10 undead and 10 mummified pharaohs, 40 nomads, 30 desert knights, 50 djinn, 40 humanoid bosses and
// 20 djinn bosses, cut by tools/sandkin.py into the sand2/* atlases. A sheet's kind gives the archetype; a bow, sling or
// javelin in the name makes an archer, a scepter, lamp or lens a caster; a djinn's element is in its name.
const RANGED = /bow|sling|thrower|javelin|harpoon|falcon|archer|hunter/i;
const CASTER = /scepter|held flame|healer|star reader|surveyor|signalman|fire tender|lamp|incense|lens|troubadour|florist|cartographer|rain gauge|crook prince/i;
const DJINN_EL = [['fire', /ember|cinder|coal|flint|crucible|chimney|bellows|tallow|kiln|brazier|furnace|ifrit|ash|chandelier/i],
  ['light', /thunder|storm|fulgurite|lightning|anemometer|whirl|tornado|gust|typhoon|nimbus|raincall|wind/i],
  ['cold', /marid|reed|spring|well|water|ewer|droplet|quartz|milk|brine|salt|limestone|gypsum|tide|pool|clay|vapor/i]];
const djinnEl = (name) => (DJINN_EL.find(([, re]) => re.test(name)) || ['arcane'])[0];
const djinn = { arch: 'elemental', also: ['cultist', 'wraith', 'imp'], fly: true, gore: 'spark' };
const KIND = {
  mummy: { arch: 'zombie', also: ['skeleton', 'knight'], ...dead },
  zombie: { arch: 'zombie', also: ['ghoul'], ...dead },
  living_pharaoh: { arch: 'knight', also: ['skeleton', 'cultist'], gore: 'flesh' },
  undead_pharaoh: { arch: 'knight', also: ['skeleton', 'wraith'], ...bone },
  mummified_pharaoh: { arch: 'knight', also: ['zombie'], ...dead },
  nomad: { arch: 'ghoul', also: ['skeleton', 'hound'], gore: 'flesh' },
  knight: { arch: 'knight', also: ['skeleton'], gore: 'flesh' },
  djinn, djinn_boss: { ...djinn, also: ['cultist', 'demon', 'wraith'] },
  // the humanoid bosses by court: living pharaohs, mummified pharaohs, the undead and corpse court, nomads and knights
  '26_living_pharaoh_courts': { arch: 'knight', also: ['cultist'], gore: 'flesh' },
  '27_mummified_pharaoh_vaults': { arch: 'zombie', also: ['knight'], ...dead },
  '28_undead_and_corpse_courts': { arch: 'zombie', also: ['knight', 'abomination'], ...dead },
  '29_nomad_and_knight_strongholds': { arch: 'knight', also: ['ghoul'], gore: 'flesh' },
};
// the roster's world heights per cell: humanoids as given, djinn 0.9, bosses 0.62
const HH = [55, 58, 54, 59, 57, 57, 56, 60, 58, 56];
const DJ = [64, 68, 74, 65, 69, 77, 67, 73, 71, 80].map((h) => Math.round(h * 0.9));
const BB = [134, 142, 149, 138, 156, 151, 160, 144, 157, 153].map((h) => Math.round(h * 0.62));
const kin2 = (file, kind, zone, dunes) => (names) => names.map((name, i) => {
  const boss = /_boss$/.test(kind), k = KIND[kind === 'humanoid_boss' ? file : kind];
  let { arch, also, ...o } = k;
  if (kind === 'djinn' || kind === 'djinn_boss') o = { ...o, el: djinnEl(name) };
  else if (RANGED.test(name)) { also = [arch, ...also]; arch = 'archer'; }
  else if (CASTER.test(name)) { also = [arch, ...also]; arch = 'cultist'; o = { ...o, el: /flame|lamp|incense|fire/i.test(name) ? 'fire' : 'arcane' }; }
  return { id: 'sk_' + name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''), sheet: 'sand2/' + file, i, arch, also, name,
    h: (boss ? BB : kind === 'djinn' ? DJ : HH)[i], sandKin: true, tier: boss ? 'boss' : kind, kind, zone, dunes, ...mortal, ...(boss ? { boss: true, lone: true } : null), ...o };
});
export const SAND_HUMANOIDS = [
  ...kin2('01_linen_court', 'mummy', 'Linen Court', ['golden', 'moonlit'])(['Bitumen Sickle Bearer', 'Sewn Mouth Sarissa', 'Reed Needle Custodian', 'Gold Thread Kukri', 'Dusk Shroud Halberdier', 'Tallow Thumb Knife', 'Lamp Knot Stave Keeper', 'Split Veil Hatchet', 'Palm Twine Slingbearer', 'Clay Stitch Maul']),
  ...kin2('02_funerary_workshops', 'mummy', 'Funerary workshops', ['golden', 'bone'])(['Coffin Latch Khopesh', 'Sealing Comb Trident', 'Red Wax Broadblade', 'Incense Cord Lash', 'Nail Cloth Shieldbearer', 'Pillar Lock Pike', 'Bone Weft Knuckler', 'Night Resin Hammer', 'Ewer Strap Bowhand', 'Sarcophagus Hinge Flail']),
  ...kin2('03_canopic_galleries', 'mummy', 'Canopic Galleries', ['obsidian', 'gypsum'])(['Amber Heart Partisan', 'Ivory Lung Longbow', 'Lapis Gall Cleaver', 'Salt Liver Scepter', 'Porcelain Eye Spadone', 'Tarnished Vessel Hook', 'Tomb Jar Gauntleteer', 'Bronze Stopper Spear', 'Soot Linen Cutlass', 'Lacquer Label Hammerman']),
  ...kin2('04_moon_pyramid', 'mummy', 'Moon Pyramid', ['moonlit'])(['Blue Hem Moonblade', 'Noctilucent Linen Lancer', 'Pale Collar Thrower', 'Wick Moon Quarterstaff', 'Tarnished Crescent Axeman', 'Wax Wing Bladeguard', 'Plaster Face Bowhand', 'Sunless Knot Dagger', 'Pearl Shroud Kopis', 'Moon Vat Hookguard']),
  ...kin2('05_ossuary_pyramid', 'mummy', 'Ossuary Pyramid', ['bone'])(["Funeral Reed Shieldman", "Linen Rib Falxbearer", "Carved Pelvis Hammer", "Ivory Hook Bowman", "Pitch Thread Glaive", "Cinnabar Bind Swordman", "Burial Hinge Billman", "Mourner's Cloth Needle", "Sepulcher Fletch Bowman", "Rib Stitch Dervish"]),
  ...kin2('06_dune_grave_roads', 'zombie', 'Dune Grave Roads', ['golden', 'copper'])(['Silt Jaw Camp Follower', 'Axle Drag Zombie', 'Broken Canteen Deadman', 'Salt Tongue Porter', 'Burnt Satchel Reclaimer', 'Torn Saddle Cloth Husk', 'Sour Wine Corpse', 'Oar Strap Deadwalker', 'Thorn Wrapped Mulehand', 'Night Wagon Corpse']),
  ...kin2('07_macellum_ruin', 'zombie', 'Macellum Ruin', ['golden', 'red'])(['Clay Oven Butcher', 'Brittle Spice Vendor', 'Dust Spoon Husk', 'Lantern Door Zombie', 'Gourd Pickler Dead', 'Scalded Dyeworker', 'Broken Spice Scale Attendant', 'Mold Apron Leatherman', 'Sunken Well Rope Keeper', 'Bone Awl Cobbler']),
  ...kin2('08_white_gypsum_sea', 'zombie', 'White Gypsum Sea', ['gypsum', 'saltflats'])(["Gypsum Javelin Cadaver", "Chalk Club Zombie", "Salt Chisel Husk", "Brittle Hip Slingman", "Miner's Pick Dead", "Brined Hook Hauler", "Silt Rake Undead", "Dry Skin Swordbreaker", "White Pitchfork Corpse", "Pale Mallet Reclaimer"]),
  ...kin2('09_red_erg_trenches', 'zombie', 'Red Erg Trenches', ['red'])(['Copper Crutch Corpse', 'Gravel Teeth Knifeman', 'Charred Mantle Crawler', 'Red Sand Harpoon Dead', 'Soot Kettle Trenchling', 'Broken Shield Stumbler', 'Split Boot Halberd Zombie', 'Funeral Shovel Dead', 'Ash Wound Skirmisher', 'Winch Chain Revenant']),
  ...kin2('10_golden_expanse', 'living_pharaoh', 'Golden Expanse', ['golden'])(['Narehotep of the Copper Bow', 'Nebrek the Flint Spear', 'Neshera of the Dawn Khopesh', 'Setevar the Jackal Halberd', 'Qetara of the Veiled Sabre', 'Irenat the Crook Prince', 'Vashkhet of the Bronze Blade', 'Azinra the Lotus Mace', 'Kemheset of the Banded Axe', 'Tavarek the Scepter King']),
  ...kin2('11_copper_dunes', 'living_pharaoh', 'Copper Dunes', ['copper'])(['Vesheti the Held Flame', 'Qirat of Seven Sashes', 'Akkemi of the Shield Crook', 'Tebresh the Red Javelin', 'Oshkura of the Horn Bow', 'Mareth of the Bronze Falx', 'Nezhete the Dune Shield', 'Beshela of the Cinnabar Mace', 'Rekmesh the Gold Lance', 'Shaheret of the Padded Glaive']),
  ...kin2('12_moonlit_barrens', 'undead_pharaoh', 'Moonlit Barrens', ['moonlit', 'bone'])(['Osshera of the Rimmed Dagger', 'Vahset the Veinless Queen', 'Nerhat of the Jaw Cleaver', 'Khesira the Ash Scepter', 'Ornuket of the Black Pelt Axe', 'Bosharet the Bone Fork', 'Yathmera of the Ruined Helm', 'Asherqet the Empty Blade', 'Sutenar of the Ivory Pike', 'Tahekra the Crooked Bow']),
  ...kin2('13_pyramid_burial_courts', 'mummified_pharaoh', 'Pyramid Burial Courts', ['golden', 'gypsum', 'obsidian'])(['Hareqi the Red Wax Pharaoh', 'Marahet with the Veiled Scimitar', 'Nazarit of the Star Crossbow', 'Sehetra with the Kiln Hammer', 'Ihetek of the Obsidian Glaive', 'Vadira with the Woven Shield', 'Nunekhet of the Carved Khopesh', 'Rasheq of the Tomb Trident', 'Sharet with the Coffer Flail', 'Eshari the Lance of Masks']),
  ...kin2('14_open_caravan_roads', 'nomad', 'Open Caravan Roads', ['golden', 'copper'])(['Amber Route Cartographer', 'Woven Yurt Scout', 'Salt Road Pilgrim', 'Crosswind Camel Carer', 'Waystone Troubadour', 'Indigo Veil Banjo Courier', 'Hollow Needle Seamster', 'Pewter Tea Wanderer', 'Mule Bell Trader', 'Sand Dial Water Seeker']),
  ...kin2('15_oasis_outskirts', 'nomad', 'Oasis Outskirts', ['emerald', 'golden'])(['Palm Scale Outrider', 'Night Reed Healer', 'Oasis Ewer Hunter', 'Mirage Lens Surveyor', 'Mudbank Reed Archer', 'Lily Root Florist', 'Scarf Sail Pathfinder', 'Eel Gate Fishmonger', 'Date Knife Orchard Keeper', 'Tin Neck Falconress']),
  ...kin2('16_red_erg', 'nomad', 'Red Erg', ['red'])(['Pale Braid Falconer', 'Red Veil Spear Shepherd', 'Caravan Drum Skirmisher', 'Brocade Stave Navigator', 'Reed Harp Sword Dancer', 'Dune Horn Courier', 'Glass Beetle Keeper', 'Copper Flint Fire Tender', 'Dusk Banner Drifter', 'Tailloom Blade Dancer']),
  ...kin2('17_storm_sands', 'nomad', 'Storm Sands', ['storm'])(['Saffron Storm Signalman', 'Cloudcloak Scout', 'Turquoise Knot Ropemaker', 'Rain Gauge Nomad', 'Hooded Slate Surveyor', 'Gourd-Flute Courier', 'Windshield Vintner', 'Glazed Mask Spice Runner', 'Frost Veil Mountaineer', 'Salt Lens Star Reader']),
  ...kin2('18_cliff_citadels', 'knight', 'Cliff Citadels', ['red', 'obsidian'])(['Limestone Gate Falconet', 'Ash Canopy Zweihander', 'Brass Shoulder Sallet Guard', 'Mosaic Tower Shield Knight', 'Dune Chevron Halberdier', 'Rampart Ahlspiess Knight', 'Iron Prow Pollaxe Guard', 'Slate Crest Lucerne Knight', 'Saffron Rondel Guard', 'Serpent Rim Billman']),
  ...kin2('19_temple_roads', 'knight', 'Temple Roads', ['golden', 'copper'])(['Faience Scutum Knight', 'Tarnished Sun Sword Knight', 'Terracotta Coat Ranseur Guard', 'Salt Mantle Estoc Knight', 'Gilded Sash Swordbreaker', 'Cinnabar Buckler Knight', 'Padded Vambrace Mace Knight', 'Alabaster Kite Shield Guard', 'Night Inlay Warpick Knight', 'Grave Bronze Corseque Guard']),
  ...kin2('20_obsidian_guard', 'knight', 'Obsidian Guard', ['obsidian'])(['Black Mirror War Scythe', 'Copper Pique Hussar', 'Glass Stud Spear Guard', 'Brine Scale Claymore Guard', 'Lapis Rivet Axe Knight', 'Sun Cracked Heavy Lancer', 'Weighted Banner Knight', 'Diorite Rapier Patrol', 'Grit Weave Pike Sentinel', 'Reflecting Helm Flamberge']),
  ...kin2('21_cinder_caravans', 'djinn', 'Cinder Caravans', ['red', 'copper'])(['Ember Abacus Djinn', 'Copper Bellows Ifrit', 'Pomegranate Coal Djinn', 'Saffron Chimney Djinn', 'Cracked Glaze Marid', 'Flint Flask Ifrit', 'Charcoal Spool Djinn', 'Red Yoke Djinn', 'Tallow Crucible Ifrit', 'Dusk Chandelier Djinn']),
  ...kin2('22_mirror_oases', 'djinn', 'Mirror Oases', ['emerald', 'saltflats'])(['Reed Mirror Marid', 'Ink Spring Djinn', 'Lapis Reed Marid', 'Silver Ewer Djinn', 'Quartz Droplet Djinn', 'Milk Glass Marid', 'Inverted Well Djinn', 'Palm Reflection Djinn', 'Saltblue Coil Marid', 'Water Dial Djinn']),
  ...kin2('23_storm_sands', 'djinn', 'Storm Sands', ['storm'])(['Oblique Thunder Djinn', 'Gilt Anemometer Djinn', 'Copper Whirl Djinn', 'Silk Thunder Ifrit', 'Silt Tornado Djinn', 'Violet Fulgurite Djinn', 'Slate Raincall Djinn', 'Wind Censer Djinn', 'Carved Nimbus Djinn', 'Alabaster Gust Djinn']),
  ...kin2('24_star_vaults', 'djinn', 'Star Vaults', ['moonlit'])(['Sextant Hush Djinn', 'Amethyst Crescent Djinn', 'Ivory Nautical Djinn', 'Cerulean Aperture Djinn', 'Ragged Zodiac Djinn', 'Pale Eclipser Djinn', 'Threaded Comet Djinn', 'Night Orrery Djinn', 'Shadow Sun Dial Djinn', 'Diorite Starlamp Djinn']),
  ...kin2('25_salt_and_ruin', 'djinn', 'Salt and Ruin', ['gypsum', 'saltflats', 'obsidian'])(['Pitted Reliquary Djinn', 'White Clay Vapor Djinn', 'Verdigris Grout Djinn', 'Bone Lace Djinn', 'Rose Gypsum Marid', 'Porcelain Splitface Djinn', 'Bitumen Wrap Djinn', 'Burnished Mortar Djinn', 'Wet Limestone Djinn', 'Broken Capital Djinn']),
  ...kin2('26_living_pharaoh_courts', 'humanoid_boss', 'Living Pharaoh Courts', ['golden', 'copper'])(['Empress Zhahet of the Twin Glaives', 'Barekhet the Brazen Chariot Lord', 'Sethar the Rose Gold Blade', 'Queen Umerit of the Sun Pillar', 'Ishkhemet of the Seven Banners', 'Nevarra of the Lapis Shield', 'Kashet the Uphill Archer', 'Tanurek the Cinnabar King', 'Shahvar the Crook and Lance', 'Pharaoh Emerat of the Horned Gate']),
  ...kin2('27_mummified_pharaoh_vaults', 'humanoid_boss', 'Mummified Pharaoh Vaults', ['bone', 'gypsum'])(["Hesharekh the Many Wrapped", "Queen Bedjara of the Funeral Loom", "Zarakhit the Canopic War Master", "The Pharaoh Beneath Five Veils", "Usharet of the Coffin Blade", "Herathel the Tallow Immortal", "Sereq of the Great Embalmer's Hook", "Nepharekh of the Ivory Oar", "Mistress Akheti of the Nine Knots", "Akhuret the Sundered Cartouche"]),
  ...kin2('28_undead_and_corpse_courts', 'humanoid_boss', 'Undead and Corpse Courts', ['moonlit', 'bone', 'saltflats'])(["Vasek the Brine Fed Giant", "The Ossuary Axemarshal", "Mistress Tefura the Sank Queen", "Lutet the Head of the Funeral Host", "Serev the White Shovel", "The Cistern's Dead Butcher", "Gharit of the Walking Coffin", "The Last Taxman of Khepra", "Torvekh of the Shattered Oath", "The Bleached Gravedigger King"]),
  ...kin2('29_nomad_and_knight_strongholds', 'humanoid_boss', 'Nomad and Knight Strongholds', ['red', 'copper', 'obsidian'])(['Marshal Taqver of the Iron Dunes', 'Tessur the Great Sand Lance', 'Sileth the Caravan Standard', 'Duchess Orare the Glass Vizor', 'Knight Maruz of the Ember Sash', 'The Reed Banner Matriarch', 'Captain Varek of the Great Pavise', 'Rekhar the Double Axe Regent', 'The Sandstep Glaive Queen', 'The Siege Knight of Copper Night']),
  ...kin2('30_furnace_and_thunder', 'djinn_boss', 'Furnace and Thunder', ['storm', 'red', 'copper'])(['Azhrum the Storm Kiln', 'Uzarekh the Magenta Thunderhead', 'Kavethar the Copper Typhoon', 'Serazhet the Seven Braziers', 'The Ifrit of the Broken Horizon', 'Zahvaret the Lightning Loom', 'Kharum the Furnace Atlas', 'Nazevi the Ash Chariot', 'Yerrath the Hollow Bell', 'The Sky Furnace Regent']),
  ...kin2('31_mirage_and_astral_courts', 'djinn_boss', 'Mirage and Astral Courts', ['emerald', 'moonlit', 'saltflats'])(['Marid Queen Thesara of Ten Springs', 'Veshar the Royal Night Mirror', 'Omarhet the Violet Meridian', 'Nirvare the Salt Eclipse', 'The Djinn Beneath the Second Moon', 'Tazeq the Broken Spring Crown', 'Ravahet the Thousand Prism', 'Ishmeret the Astral Weir', 'Orvak the Mirage Tide', 'Empress Qaheti of the Last Reflecting Pool']),
];
SAND_KIN.push(...SAND_HUMANOIDS);

/** The deserts: where the Sea of Sand bestiary lives (a Sheer Drop counts by its base). */
export const DESERT_BIOMES = ['sea_of_sand', 'desert', 'gilded', 'serpent', 'amber', 'desert_temple'];
export const isDesert = (biome) => !!biome && (DESERT_BIOMES.includes(biome.id) || DESERT_BIOMES.includes(biome.base));

const fits = (a, arch) => a.arch === arch || a.also.includes(arch);
// The roster suggests no bosses for the White Gypsum Sea and only mythics for the Storm Sands: they borrow their
// neighbours' (white salt for the gypsum, the glass and the moonlit night for the storm).
const DUNE_ALSO = { gypsum: ['saltflats'], storm: ['moonlit', 'obsidian'] };
const inDune = (a, dune) => !dune || a.dunes.includes(dune) || (DUNE_ALSO[dune] || []).some((d) => a.dunes.includes(d));
/** Creatures (small and large) that can play `arch`; `dune`: only those the roster suggests for that dune variant. */
export const sandCreatures = (arch, dune) => SAND_KIN.filter((a) => !a.boss && !a.mythic && (!arch || fits(a, arch)) && inDune(a, dune));
export const sandMythics = (arch, dune) => SAND_KIN.filter((a) => a.mythic && (!arch || fits(a, arch)) && inDune(a, dune));
export const sandBosses = (arch, dune) => SAND_KIN.filter((a) => a.boss && (!arch || fits(a, arch)) && inDune(a, dune));
