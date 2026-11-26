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
