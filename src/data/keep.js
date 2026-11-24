// TESSARIEL'S KEEP (docs/TESSARIELS_KEEP.md): the data. The keep's people, its decorations and trophies, the Ember
// trade, Renown, and the quests: eight Sagas the Castellan gives chapter by chapter, Bounties on a daily board, and the
// Challenges (deeds, tiers of them) that count on their own. Every objective is a metric (METRICS) and a count; the game
// keeps the counters (src/game/keep.js keepEvent). Pure data, runs under Node (tools/tests/keep_quests.mjs).
//
// Lore: Tessariel, the Sacred Flame ("Ember that falls"), is the good god of this world; Velscour the Fiend. The keep
// keeps his green fire. T never stands near V: nothing of Velscour's comes into the keep, not even as a trophy.

export const EMBER_COLOR = '#c8f060';
export const KEEP_NAME = "Tessariel's Keep";
export const CASTELLAN = { name: 'Castellan Elsabet', title: 'of the Ivory Mantle, Keeper of the Flame', sprite: '07_knight_ivory_mantle' };
// the keep's own folk, walking its hall (townsfolk sheets): [sprite, name, role, where]
export const KEEP_FOLK = [
  ['41_friar', 'Brother Cael', 'tends the Flame', 'flame'],
  ['09_knight_silver_censer', 'Ser Cassius', 'of the Silver Censer', 'hall'],
  ['14_knight_dusk_lancer', 'Kestrel', 'the Dusk Lancer', 'balcony'],
  ['42_priest', 'Mother Agatha', 'reads the Chronicle', 'chronicle'],
  ['13_knight_frostbound', 'Halvard', 'the Frostbound', 'gate'],
];

// ------------------------------------------------------------------ metrics
// Counters (c.keep.st) the game adds to (keepEvent), and absolute values read off the save. A quest counts from the
// moment it is taken (its base), a challenge from the save's own record where there is one (kills, depth, level...).
export const METRICS = {
  kill: 'monsters slain', elite: 'champions or uniques slain', unique: 'uniques slain', guardian: 'guardians slain',
  raid: 'BOSS ROOM lords slain', clear: 'depths cleared', clearBoss: 'BOSS ROOMs cleared', region: 'overworld trials won',
  breach: 'Eternal Breach floors won', rift: 'Abyssal Rifts closed', heresyClear: 'depths cleared under a Heresy',
  gold: 'gold gathered', epic: 'Epic or better items found', legendary: 'Legendary or better items found', mythic: 'Mythic or better items found',
  potion: 'potions drunk', socket: 'gems socketed', upgrade: 'items upgraded', death: 'deaths',
  cleanClear: 'depths cleared without a potion', fastClear: 'depths cleared in under 90 seconds', blitzClear: 'depths cleared in under 45 seconds',
  raidFast: 'BOSS ROOMs cleared in under 2 minutes', raidClean: 'BOSS ROOMs cleared without a potion', velscour: 'Velscours slain',
  // absolute (read off the save)
  level: 'hero level', deepest: 'deepest depth', breachBest: 'best Breach floor', riftBest: 'best Rift tier', kills: 'monsters slain (all time)',
  unboundWins: 'Velscour Unbound defeated', heresyRank: 'Heresy rank',
};
export const ABS = new Set(['level', 'deepest', 'breachBest', 'riftBest', 'kills', 'unboundWins', 'heresyRank']);
// per biome / region counters: 'clear:<biome>' and 'region:<id>' (names from data/biomes.js)
export const REGION_IDS = ['overworld', 'castle', 'sea_of_sand', 'dark_forest', 'skyship', 'pirate_seas', 'serpentine_tower', 'depths_edge', 'mountainside', 'snowy_summit', 'ghost_train', 'endless_siege', 'deep_mines', 'great_hunt'];
export const REGION_NAMES = { overworld: 'the Forsaken Wilds', castle: 'the Castle', sea_of_sand: 'the Sea of Sand', dark_forest: 'the Dark Forest', skyship: 'the Sky Battle',
  pirate_seas: 'the Pirate Seas', serpentine_tower: 'the Serpentine Tower', depths_edge: "the Depth's Edge Caverns", mountainside: 'the Mountainside', snowy_summit: 'the Snowy Summit',
  ghost_train: 'the Iron Express', endless_siege: 'the Endless Siege', deep_mines: 'the Deep Rail Mines', great_hunt: 'the Great Hunt' };
export const DUNGEON_IDS = ['catacombs', 'castle_keep', 'frozen', 'ice_temple', 'molten', 'fungal', 'sunken', 'blood', 'ashen', 'void', 'gilded', 'plague', 'crystal', 'desert', 'shadow', 'forge', 'abyss',
  'thorn', 'storm', 'obsidian', 'flesh', 'serpent', 'shattered', 'library', 'sewers', 'necropolis', 'cathedral', 'amber', 'desert_temple', 'hell', 'astral_plane', 'heavenly'];

// ------------------------------------------------------------------ decorations
// Slots are the layout's anchors (world/tkeep.js): 14 banners, 10 windows, 3 rugs, 16 pedestals, 4 Elder plinths.
// `free`: the keep starts with them; the rest are quest rewards (DECOR_REWARD below says which).
export const BANNERS = [
  { id: 'tess_a', name: "Tessariel's Azure", free: true }, { id: 'tess_a1', name: "Tessariel's Ivory", free: true },
  { id: 'tess_b', name: "The Ember's Blue", free: true }, { id: 'tess_b1', name: "The Ember's White", free: true },
  { id: 'holy_azure_sunburst', name: 'Azure Sunburst' }, { id: 'holy_winged_star', name: 'Winged Star' }, { id: 'holy_harvest', name: 'Harvest of the Flame' },
  { id: 'holy_lilies', name: 'Lilies of the Ninth Bell' }, { id: 'holy_open_hands', name: 'The Open Hands' }, { id: 'holy_verdant_cross', name: 'Verdant Cross' },
  { id: 'town_eagle', name: 'The White Eagle' }, { id: 'town_stag', name: 'The Green Stag' }, { id: 'town_ram', name: 'The Mountain Ram' },
  { id: 'town_ship', name: "The Lampwardens' Ship" }, { id: 'town_bridge', name: 'The Sunlit Bridge' }, { id: 'town_tower_and_keys', name: 'Tower and Keys' },
];
export const GLASS = [
  { id: 'glass_a', name: 'The Host of Dawn', free: true }, { id: 'glass_c', name: 'The Gilded Charge', free: true },
  { id: 'glass_b', name: 'The Silver Wings' }, { id: 'glass_d', name: 'The Last Light' }, { id: 'glass_e', name: 'The Choir of Spears' }, { id: 'glass_d1', name: 'Dawn over the Pit' },
];
export const RUGS = [
  { id: 'blue_wool', name: 'Azure Wool', free: true }, { id: 'gold_wool', name: 'Gilded Wool', free: true },
  { id: 'blue_geometric', name: 'Lampwarden Blue' }, { id: 'forest_wool', name: 'Forest Wool' }, { id: 'green_floral', name: 'Verdant Floral' },
  { id: 'red_gothic', name: 'Crimson Tracery' }, { id: 'heraldic', name: 'Heraldic Field' }, { id: 'geometric_rug', name: "Pilgrim's Rug" },
  { id: 'ivory_wool', name: 'Ivory Wool' }, { id: 'plum_wool', name: 'Plum Wool' }, { id: 'wine_wool', name: 'Wine Wool' }, { id: 'red_floral', name: 'Rose Floral' },
];
export const DECOR = { banner: BANNERS, glass: GLASS, rug: RUGS };
/** A new keep's look: the four T banners round the hall, two windows in turn, the blue runner and the gilded dais. */
export function defaultDecor() {
  const tb = ['tess_a', 'tess_b', 'tess_a1', 'tess_b1'], gl = ['glass_a', 'glass_c'];
  return { banner: Array.from({ length: 14 }, (_, i) => tb[i % 4]), glass: Array.from({ length: 10 }, (_, i) => (i === 2 ? 'glass_c' : gl[i % 2])), rug: ['blue_wool', 'blue_wool', 'gold_wool'], pedestal: Array(16).fill(null) };
}

// ------------------------------------------------------------------ trophies
// Each is earned once (a Saga's last chapter or a Challenge) and can stand on any pedestal; the four Elder Dragons have
// their own plinths round the Flame. art: the baked sprite (data/keepart.js).
export const TROPHIES = [
  { id: 'elder_gale', art: 'dragon_green', name: 'Thyrraxis, the Gale Eternal', desc: 'The green Elder God of wind, carved and set over the Flame.', plinth: 'nw' },
  { id: 'elder_hearth', art: 'dragon_red', name: 'Kaldurra, the Hearth of the World', desc: 'The red Elder God of the deep fires.', plinth: 'ne' },
  { id: 'elder_cold', art: 'dragon_undead', name: 'Morvekh, Who Remembers the Cold', desc: 'The pale Elder God who will not stay dead.', plinth: 'sw' },
  { id: 'elder_star', art: 'dragon_black', name: 'Nihvaroth, the Hollow Star', desc: 'The black Elder God of the Maw. The other three were its teeth.', plinth: 'se' },
  { id: 'ember_shield', art: 'shield_t_blue', name: "The Ember's Shield", desc: 'Tessariel\'s T on blue, for the hero who walked the Ember\'s Road.' },
  { id: 'ivory_shield', art: 'shield_t_white', name: 'The Ivory Ward', desc: 'Carried by the first of the Flame\'s knights.' },
  { id: 'martyr_shield', art: 'shield_t_red', name: "The Martyr's Shield", desc: 'Red for those the Fiend took. Earned in blood.' },
  { id: 'night_shield', art: 'shield_t_black', name: 'The Night Watch', desc: 'For those who stood watch where the light ends.' },
  { id: 'wyrm_shield', art: 'shield_dragon', name: "Wyrmslayer's Bulwark", desc: 'A serpent coiled on bronze: a Breach wyrm\'s bane.' },
  { id: 'tree_shield', art: 'shield_tree', name: 'The World Tree Pavise', desc: 'From the Heart of the Forest.' },
  { id: 'sun_shield', art: 'shield_sun', name: 'The Sunburst Tower', desc: 'Raised over the walls of the Endless Siege.' },
  { id: 'keep_shield', art: 'shield_keep', name: 'The Keep Unbroken', desc: 'For a castle retaken.' },
  { id: 'elder_shield', art: 'shield_elder', name: 'The Elder Oak', desc: 'From the Great Hunt\'s last lair.' },
  { id: 'crown_shield', art: 'shield_crown', name: 'The Solar Crown', desc: 'Worn by a lord of a BOSS ROOM, and now by none.' },
  { id: 'stag_shield', art: 'shield_stag', name: 'The Stag Crowned', desc: 'The free towns\' thanks.' },
  { id: 'radiant_shield', art: 'shield_radiant', name: 'The Radiant Ward', desc: 'Light that did not go out in the Abyssal Rifts.' },
  { id: 'dawn_shield', art: 'shield_dawn', name: 'The Dawnstar', desc: 'For a hundred dawns seen from the deep.' },
  { id: 'griffin_shield', art: 'shield_griffin', name: 'The Griffin Shield', desc: 'For the skies held against the Air Pirates.' },
  { id: 'lion_shield', art: 'shield_lionsun', name: 'The Lion and Sun', desc: 'For gold beyond counting.' },
  { id: 'north_shield', art: 'shield_north', name: 'The Northstar', desc: 'The Lampwardens\' own: steer by it.' },
  { id: 'skull', art: 'skull', name: 'Skull of the First Lord', desc: 'The skull of the first BOSS ROOM lord you broke.' },
  { id: 'gem_skull', art: 'skull_gems', name: 'The Jewelled Skull', desc: 'Its eyes are rubies. It still watches.' },
  { id: 'dawn_staff', art: 'staff_dawn', name: "Angels' Dawn", desc: 'A staff that once lit a choir.' },
  { id: 'phoenix_staff', art: 'staff_phoenix', name: 'Phoenix Ascendant', desc: 'Fire that rises again.' },
  { id: 'winter_staff', art: 'staff_winter', name: 'Winterstar', desc: 'Cold light from the Snowy Summit.' },
  { id: 'seraph_staff', art: 'staff_seraph', name: "Seraph's Coil", desc: 'For a hero who never once fell.' },
  { id: 'orrery_staff', art: 'staff_orrery', name: 'The Celestial Orrery', desc: 'The heavens turn round it. So do the Rifts.' },
  { id: 'hourglass_staff', art: 'staff_hourglass', name: 'Hourglass of Ages', desc: 'For deeds done before the sand ran out.' },
  { id: 'sunbanner_staff', art: 'staff_sunbanner', name: 'The Sunbanner', desc: 'Carried before the Flame\'s armies.' },
  { id: 'radiant_lance', art: 'lance_radiant', name: 'The Radiant Lance', desc: 'The lance that will be raised against the Fiend\'s throne.' },
];
export const TROPHY_BY_ID = Object.fromEntries(TROPHIES.map((t) => [t.id, t]));

// ------------------------------------------------------------------ Renown, the Ember trade, the Vault
/** Renown rank from points: rank r needs 5 r (r + 1) / 2 (5, 15, 30, ... 1,050 at 20). */
export const RENOWN_MAX = 20;
export const renownNeed = (r) => (5 * r * (r + 1)) / 2;
export const renownRank = (pts) => { let r = 0; while (r < RENOWN_MAX && pts >= renownNeed(r + 1)) r++; return r; };
/** What a rank gives, always on: gold found, magic find, XP (small: the keep helps, it doesn't carry). */
export const renownBonus = (r) => ({ gf: r, mf: r, xp: r * 0.5 });
export const RENOWN_TITLES = ['Pilgrim', 'Pilgrim', 'Lamplighter', 'Lamplighter', 'Acolyte of the Flame', 'Acolyte of the Flame', 'Ember-Sworn', 'Ember-Sworn', 'Warden', 'Warden',
  'Warden of the Hall', 'Warden of the Hall', 'Knight of the Flame', 'Knight of the Flame', 'Knight-Captain', 'Knight-Captain', 'Champion of the Keep', 'Champion of the Keep', 'Hand of Tessariel', 'Hand of Tessariel', 'Ember Eternal'];
// The Castellan's trade: armour of the hero's own level (data/items.js rollItem), Rare to Legendary; a Legendary may
// come out of the forge Mythic. Prices in Embers.
export const TRADE_SLOTS = ['head', 'body', 'hands', 'legs', 'feet'];
export const TRADE = [
  { rarity: 2, cost: 18 },
  { rarity: 3, cost: 55 },
  { rarity: 4, cost: 150, mythic: 0.1 },
];
// The Vault of the Flame: once a week, a choice of Legendary gear by how many of the keep's tasks were done that week.
export const VAULT_STEPS = [3, 7, 12];
export const VAULT_MYTHIC = 0.15;
// The Sacred Flame's blessing: kneel at it for "Kindled" (XP, gold and magic find) for a while; once an hour.
export const KINDLE = { minutes: 30, cooldownMin: 60, xp: 10, gf: 15, mf: 15 };
// The War Table: your other heroes go on errands of the keep in real time (minutes) and bring back Embers and spoils.
export const EXPEDITIONS = [
  { id: 'escort', name: 'Escort the pilgrims', where: 'through the Forsaken Wilds', min: 20, embers: 3, gold: 6, gems: 0, lvl: 1 },
  { id: 'lamps', name: 'Relight the coast lamps', where: 'for the Lampwardens of Gullwrack', min: 45, embers: 5, gold: 8, gems: 1, lvl: 10 },
  { id: 'relics', name: 'Bring home the relics', where: 'from the drowned chapels', min: 90, embers: 8, gold: 12, gems: 1, lvl: 25 },
  { id: 'scout', name: 'Scout the Breach', where: 'at the purple portal\'s edge', min: 180, embers: 13, gold: 18, gems: 2, lvl: 45 },
  { id: 'vigil', name: 'Keep the long vigil', where: 'on the walls of the Endless Siege', min: 480, embers: 26, gold: 30, gems: 3, lvl: 70 },
];

// ------------------------------------------------------------------ the Sagas
// Chapters in order; each a metric and a count (abs: a value to reach). `trophy`/`decor` on a chapter: what it gives.
// Rewards: Embers 6 + 2 per chapter, Renown 2 (5 for the last), gold by the hero's level.
const C = (m, n, text, o = {}) => ({ m, n, text, ...o });
export const SAGAS = [
  { id: 'ember_road', name: "The Ember's Road", giver: 'Castellan Elsabet', min: 0, color: '#c8f060',
    pitch: 'Every knight of the Flame walks the same road first: down, and back up with something to show for it.',
    ch: [
      C('kill', 40, 'Slay 40 of the Fiend\'s creatures.'), C('clear', 2, 'Clear 2 depths.'), C('elite', 4, 'Slay 4 champions or uniques.'),
      C('socket', 1, 'Socket a gem into your gear (the Jeweler in town).'), C('guardian', 2, 'Slay 2 guardians.'), C('deepest', 10, 'Reach Depth 10.', { abs: true }),
      C('upgrade', 1, 'Have Homunculus upgrade an item.'), C('raid', 1, 'Break a BOSS ROOM\'s lord (every fifth depth).'), C('deepest', 20, 'Reach Depth 20.', { abs: true }),
      C('raid', 3, 'Break 3 BOSS ROOM lords.', { trophy: 'ember_shield', decor: ['banner', 'holy_azure_sunburst'] }),
    ] },
  { id: 'lampwardens', name: "The Lampwardens' Debt", giver: 'Commodore Brask (by letter)', min: 8, color: '#9fd8ff',
    pitch: 'The Lampwardens of the Ninth Bell lent us their light when we had none. Their coast is going dark.',
    ch: [
      C('region', 1, 'Win an overworld trial (any shrine, ship or tower).'), C('region:pirate_seas', 1, 'Hold the Dawnwake in the Pirate Seas.'), C('kill', 300, 'Slay 300 of the Black Tide\'s allies.'),
      C('region:skyship', 1, 'Win a Sky Battle.'), C('region:serpentine_tower', 1, 'Take the roof of the Serpentine Tower.'), C('region:sea_of_sand', 1, 'Cross the Sea of Sand.'),
      C('elite', 25, 'Slay 25 champions or uniques.'), C('region', 6, 'Win 6 overworld trials.', { decor: ['rug', 'blue_geometric'] }), C('region:pirate_seas', 3, 'Hold the Dawnwake 3 times.'),
      C('region:skyship', 3, 'Win 3 Sky Battles.', { trophy: 'north_shield', decor: ['banner', 'town_ship'] }),
    ] },
  { id: 'four_teeth', name: 'The Four Teeth', giver: 'Castellan Elsabet', min: 25, color: '#ffb070',
    pitch: 'Four gods older than the Fiend sleep round a black star. We will carve them, one by one, as you earn the right.',
    ch: [
      C('raid', 4, 'THE GALE: break 4 BOSS ROOM lords (stand in the lee, carry the spark away).'), C('region:mountainside', 1, 'Climb the Mountainside to its summit.'),
      C('raidFast', 1, 'Clear a BOSS ROOM in under 2 minutes, as the storm would.'), C('region:snowy_summit', 1, 'Win the Snowy Summit.', { trophy: 'elder_gale', decor: ['glass', 'glass_b'] }),
      C('clear:molten', 1, 'THE HEARTH: clear a depth of the Molten Depths.'), C('clear:forge', 1, 'Clear a depth of the Forge.'), C('breach', 3, 'Win 3 floors of the Eternal Breach.'),
      C('cleanClear', 5, 'Clear 5 depths without drinking a potion (the floor is lava; find your shelter).', { trophy: 'elder_hearth' }),
      C('clear:frozen', 1, 'THE COLD: clear a depth of the Frozen Ossuary.'), C('clear:ice_temple', 1, 'Clear the Palace of the Everfrost.'), C('guardian', 30, 'Slay 30 guardians: climb ahead of the mist.'),
      C('raidClean', 2, 'Clear 2 BOSS ROOMs without a potion.', { trophy: 'elder_cold', decor: ['rug', 'forest_wool'] }),
      C('clear:void', 1, 'THE HOLLOW STAR: clear a depth of the Void Sanctum.'), C('clear:abyss', 1, 'Clear a depth of the Abyss.'), C('deepest', 150, 'Reach Depth 150.', { abs: true }),
      C('raid', 30, 'Break 30 BOSS ROOM lords: resist the pull.', { trophy: 'elder_star', decor: ['glass', 'glass_d1'] }),
    ] },
  { id: 'hollow_crowns', name: 'The Hollow Crowns', giver: 'Ser Cassius', min: 15, color: '#ff9a6a',
    pitch: 'Every fifth depth a lord sits a stolen throne. Bring me their crowns; I keep count.',
    ch: [
      C('raid', 2, 'Break 2 BOSS ROOM lords.', { trophy: 'skull' }), C('raidClean', 1, 'Clear a BOSS ROOM without a potion.'), C('raid', 6, 'Break 6 lords.'),
      C('raidFast', 2, 'Clear 2 BOSS ROOMs in under 2 minutes.'), C('unique', 20, 'Slay 20 uniques, their heralds.'), C('raid', 12, 'Break 12 lords.', { decor: ['banner', 'holy_winged_star'] }),
      C('raidFast', 6, 'Clear 6 BOSS ROOMs in under 2 minutes.'), C('raidClean', 6, 'Clear 6 BOSS ROOMs without a potion.'), C('raid', 25, 'Break 25 lords.'),
      C('raid', 40, 'Break 40 lords.', { trophy: 'crown_shield', decor: ['glass', 'glass_e'] }),
    ] },
  { id: 'saints_deep', name: 'Saints of the Deep', giver: 'Mother Agatha', min: 5, color: '#e8d8ff',
    pitch: 'The Flame had shrines in every deep place once. Walk them, so the Chronicle can name them again.',
    ch: [
      C('clear:catacombs', 1, 'Clear a depth of the Catacombs.'), C('clear:cathedral', 1, 'Clear a depth of the Cathedral.'), C('clear:library', 1, 'Clear a depth of the Library.'),
      C('clear:sunken', 1, 'Clear a depth of the Sunken halls.'), C('clear:crystal', 1, 'Clear a depth of the Crystal Caverns.', { decor: ['banner', 'holy_lilies'] }), C('clear:necropolis', 1, 'Clear a depth of the Necropolis.'),
      C('clear:heavenly', 1, 'Clear a depth of the Empyrean Citadel.'), C('clear:gilded', 1, 'Clear a depth of the Gilded vaults.'), C('clear:astral_plane', 1, 'Clear a depth of the Celestial Expanse.'),
      C('clear', 60, 'Clear 60 depths.', { trophy: 'dawn_staff', decor: ['glass', 'glass_d'] }),
    ] },
  { id: 'free_towns', name: 'The Free Towns', giver: 'Kestrel the Dusk Lancer', min: 12, color: '#a8e070',
    pitch: 'The towns the Fiend has not burned yet send their thanks, and their troubles.',
    ch: [
      C('region:overworld', 1, 'Win a trial in the Forsaken Wilds.'), C('region:dark_forest', 1, 'Reach the Heart of the Forest.', { trophy: 'tree_shield' }), C('region:castle', 1, 'Retake the Castle.'),
      C('region:ghost_train', 1, 'Stop the Iron Express.'), C('region:endless_siege', 1, 'Hold the Endless Siege.', { trophy: 'sun_shield' }), C('region:deep_mines', 1, 'Reach the bottom of the Deep Rail Mines.'),
      C('region:great_hunt', 1, 'Bring down the beast of the Great Hunt.', { trophy: 'elder_shield' }), C('region:castle', 3, 'Retake the Castle 3 times.', { trophy: 'keep_shield', decor: ['banner', 'town_tower_and_keys'] }),
      C('region', 15, 'Win 15 overworld trials.'), C('region', 30, 'Win 30 overworld trials.', { trophy: 'stag_shield', decor: ['banner', 'town_stag'] }),
    ] },
  { id: 'endless_watch', name: 'The Endless Watch', giver: 'Halvard the Frostbound', min: 60, color: '#80e0ff',
    pitch: 'Some doors never close. Someone has to stand at them.',
    ch: [
      C('breach', 1, 'Win a floor of the Eternal Breach.'), C('breachBest', 5, 'Win Breach floor 5.', { abs: true }), C('breach', 10, 'Win 10 Breach floors.', { trophy: 'wyrm_shield' }),
      C('deepest', 250, 'Reach Depth 250.', { abs: true }), C('breachBest', 15, 'Win Breach floor 15.', { abs: true }), C('deepest', 500, 'Reach Velscour\'s throne at Depth 500.', { abs: true }),
      C('velscour', 1, 'Slay Velscour on his throne.', { trophy: 'radiant_lance', decor: ['banner', 'holy_open_hands'] }), C('rift', 3, 'Close 3 Abyssal Rifts.'), C('riftBest', 20, 'Close a Rift of Tier 20.', { abs: true, trophy: 'radiant_shield' }),
      C('heresyClear', 25, 'Clear 25 depths under a Heresy.', { trophy: 'orrery_staff', decor: ['glass', 'glass_c'] }),
    ] },
  { id: 'hearth_hall', name: 'Hearth and Hall', giver: 'Brother Cael', min: 3, color: '#ffd890',
    pitch: 'A keep runs on bread, iron and gold as much as on faith. Bring home what the deep gives up.',
    ch: [
      C('gold', 5000, 'Gather 5,000 gold.'), C('epic', 3, 'Find 3 Epic or better items.'), C('socket', 5, 'Socket 5 gems.'), C('upgrade', 5, 'Have 5 upgrades done.', { decor: ['rug', 'heraldic'] }),
      C('legendary', 1, 'Find a Legendary item.'), C('gold', 100000, 'Gather 100,000 gold.'), C('legendary', 5, 'Find 5 Legendary or better items.', { decor: ['rug', 'red_gothic'] }),
      C('socket', 25, 'Socket 25 gems.'), C('mythic', 1, 'Find a Mythic item.', { trophy: 'gem_skull' }), C('gold', 5e6, 'Gather 5,000,000 gold.', { trophy: 'lion_shield', decor: ['banner', 'holy_harvest'] }),
    ] },
];
export const SAGA_BY_ID = Object.fromEntries(SAGAS.map((s) => [s.id, s]));
export const sagaReward = (k, last) => ({ embers: 6 + 2 * k + (last ? 30 : 0), renown: last ? 5 : 2, gold: last ? 8 : 2 + k * 0.4 });

// ------------------------------------------------------------------ the Bounty board (daily)
// Three a day from these, picked by the day and the hero (each the same all day); counts scale with the hero.
export const BOUNTIES = [];
{
  const B = (id, m, n, text) => BOUNTIES.push({ id, m, n, text });
  B('cull', 'kill', 150, 'Cull the deep: slay {n} monsters.'); B('cull2', 'kill', 400, 'A great culling: slay {n} monsters.');
  B('heads', 'elite', 12, 'Champions and uniques: slay {n}.'); B('heralds', 'unique', 6, 'The heralds of the Fiend: slay {n} uniques.');
  B('wardens', 'guardian', 3, 'Slay {n} guardians.'); B('crowns', 'raid', 1, 'Break a BOSS ROOM\'s lord.');
  B('descent', 'clear', 4, 'Clear {n} depths.'); B('trial', 'region', 1, 'Win an overworld trial.'); B('trials', 'region', 2, 'Win {n} overworld trials.');
  B('pure', 'cleanClear', 2, 'Clear {n} depths without drinking a potion.'); B('swift', 'fastClear', 2, 'Clear {n} depths in under 90 seconds.');
  B('tithe', 'gold', 0, 'Gather {n} gold for the keep\'s tithe.'); B('jewels', 'socket', 2, 'Socket {n} gems.'); B('finds', 'epic', 2, 'Find {n} Epic or better items.');
  for (const b of DUNGEON_IDS) B('pilgrim_' + b, 'clear:' + b, 1, 'A pilgrimage: clear a depth of {biome}.');
  for (const r of REGION_IDS) B('errand_' + r, 'region:' + r, 1, 'An errand: win ' + REGION_NAMES[r] + '.');
  B('breach', 'breach', 1, 'Win a floor of the Eternal Breach.'); B('rift', 'rift', 1, 'Close an Abyssal Rift.');
}
export const BOUNTY_REWARD = { embers: 8, renown: 1, gold: 3 };
export const BOUNTIES_A_DAY = 3;

// ------------------------------------------------------------------ the Challenges (deeds)
// Tiers of a metric; each tier is a challenge of its own. Rewards by tier (Embers, Renown); some give a trophy or a
// decoration. Grouped by kind for the Castellan's list.
export const CHALLENGES = [];
const TIER_EMBERS = [5, 10, 18, 30, 50, 75], TIER_RENOWN = [1, 1, 2, 3, 4, 5];
function tiers(group, id, m, steps, name, text, extra = {}) {
  steps.forEach((n, k) => CHALLENGES.push({ id: `${id}_${k + 1}`, group, m, n, abs: ABS.has(m), tier: k, name: `${name} ${'I II III IV V VI VII VIII IX X'.split(' ')[k]}`,
    text: text.replace('{n}', n >= 1e6 ? (n / 1e6) + ' million' : n.toLocaleString('en-US')), embers: TIER_EMBERS[Math.min(k, 5)], renown: TIER_RENOWN[Math.min(k, 5)], ...(extra[k] || {}) }));
}
// slaying
tiers('Slayer', 'slay', 'kills', [500, 2500, 10000, 50000, 150000, 500000], 'Slayer', 'Slay {n} monsters (all time).', { 3: { trophy: 'martyr_shield' } });
tiers('Slayer', 'elites', 'elite', [25, 100, 400, 1500, 5000], 'Champion\'s Bane', 'Slay {n} champions or uniques.');
tiers('Slayer', 'uniques', 'unique', [10, 50, 200, 800], 'Herald-Hunter', 'Slay {n} uniques.');
tiers('Slayer', 'guardians', 'guardian', [5, 25, 100, 300, 1000], 'Warden-Breaker', 'Slay {n} guardians.');
tiers('Slayer', 'lords', 'raid', [1, 5, 20, 50, 100, 200], 'Crownbreaker', 'Break {n} BOSS ROOM lords.', { 4: { decor: ['banner', 'holy_verdant_cross'] } });
// the descent
tiers('Descent', 'depth', 'deepest', [10, 25, 50, 75, 100, 150, 200, 300, 400, 500], 'The Descent', 'Reach Depth {n}.', { 3: { decor: ['banner', 'town_eagle'] }, 9: { trophy: 'night_shield' } });
tiers('Descent', 'level', 'level', [10, 20, 30, 50, 75, 100, 150, 250, 500, 1000], 'The Ascent', 'Reach hero level {n}.', { 5: { trophy: 'dawn_shield' } });
tiers('Descent', 'clears', 'clear', [10, 50, 150, 400, 1000], 'Delver', 'Clear {n} depths.');
tiers('Descent', 'bossrooms', 'clearBoss', [3, 15, 50, 120], 'Throne-Taker', 'Clear {n} BOSS ROOMs.');
// the raid's mechanics, as the old raids taught them (docs/TESSARIELS_KEEP.md names what each borrows from)
tiers('Raid Trials', 'gale', 'raidFast', [1, 5, 15, 40], 'The Gale Eternal', 'Clear a BOSS ROOM in under 2 minutes, {n} times: be pushed, thrown, and still win.');
tiers('Raid Trials', 'hearth', 'raidClean', [1, 5, 15, 40], 'The Floor Is Lava', 'Clear a BOSS ROOM without a potion, {n} times.');
tiers('Raid Trials', 'cold', 'cleanClear', [5, 25, 100, 300], 'Remember the Cold', 'Clear {n} depths without a potion.', { 2: { trophy: 'seraph_staff' } });
tiers('Raid Trials', 'star', 'blitzClear', [1, 10, 40, 120], 'The Hollow Star', 'Clear a depth in under 45 seconds, {n} times: the wells close fast.', { 1: { trophy: 'hourglass_staff' } });
tiers('Raid Trials', 'swift', 'fastClear', [5, 25, 100, 400], 'Swift as the Ember', 'Clear {n} depths in under 90 seconds.');
// the world
for (const r of REGION_IDS) tiers('Overworld', 'reg_' + r, 'region:' + r, [1, 5, 15], cap(REGION_NAMES[r]), 'Win ' + REGION_NAMES[r] + ' {n} time(s).',
  r === 'skyship' ? { 1: { trophy: 'griffin_shield' } } : r === 'snowy_summit' ? { 1: { trophy: 'winter_staff' } } : r === 'endless_siege' ? { 2: { trophy: 'sunbanner_staff' } } : {});
tiers('Overworld', 'regions', 'region', [5, 25, 75, 200], 'Wayfarer', 'Win {n} overworld trials.', { 1: { decor: ['banner', 'town_ram'] }, 2: { decor: ['banner', 'town_bridge'] } });
for (const b of DUNGEON_IDS) tiers('Dungeons', 'dg_' + b, 'clear:' + b, [1, 10], '{biome}', 'Clear a depth of {biome} {n} time(s).');
// the endgame
tiers('Endgame', 'breach', 'breach', [1, 5, 15, 40, 100], 'Breach-Walker', 'Win {n} floors of the Eternal Breach.');
tiers('Endgame', 'breachBest', 'breachBest', [5, 10, 20, 30, 40, 50], 'Into the Void', 'Win Breach floor {n}.', { 5: { trophy: 'phoenix_staff' } });
tiers('Endgame', 'rift', 'rift', [1, 10, 50, 150], 'Riftcloser', 'Close {n} Abyssal Rifts.');
tiers('Endgame', 'riftBest', 'riftBest', [5, 15, 30, 60, 100, 150], 'The Abyssal Tiers', 'Close a Rift of Tier {n}.');
tiers('Endgame', 'heresy', 'heresyClear', [5, 50, 200], 'Heretic', 'Clear {n} depths under a Heresy.');
tiers('Endgame', 'velscour', 'velscour', [1, 3, 10], 'Fiendslayer', 'Slay Velscour {n} time(s).', { 0: { decor: ['rug', 'ivory_wool'] } });
tiers('Endgame', 'unbound', 'unboundWins', [1, 5, 20], 'Unbinder', 'Defeat Velscour Unbound {n} time(s).', { 0: { trophy: 'ivory_shield' } });
// hearth and hall
tiers('Hearth', 'gold', 'gold', [1e4, 1e5, 1e6, 1e7, 1e8], 'Tithe-Bearer', 'Gather {n} gold.', { 2: { decor: ['rug', 'gold_wool'] } });
tiers('Hearth', 'legend', 'legendary', [1, 10, 40, 120], 'Legend-Finder', 'Find {n} Legendary or better items.', { 1: { decor: ['rug', 'geometric_rug'] } });
tiers('Hearth', 'mythic', 'mythic', [1, 5, 20], 'Mythmaker', 'Find {n} Mythic or better items.', { 1: { decor: ['rug', 'plum_wool'] } });
tiers('Hearth', 'epic', 'epic', [10, 50, 200], 'Treasure-Seeker', 'Find {n} Epic or better items.');
tiers('Hearth', 'socket', 'socket', [10, 50, 200], 'Lapidary', 'Socket {n} gems.', { 2: { decor: ['rug', 'green_floral'] } });
tiers('Hearth', 'upgrade', 'upgrade', [10, 50, 150], 'Forge-Friend', 'Have {n} upgrades done.', { 2: { decor: ['rug', 'wine_wool'] } });
tiers('Hearth', 'potions', 'potion', [50, 300, 1500], 'Steady Hand', 'Drink {n} potions (no shame in it).', { 2: { decor: ['rug', 'red_floral'] } });
function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
export const CHALLENGE_BY_ID = Object.fromEntries(CHALLENGES.map((c) => [c.id, c]));
export const CHALLENGE_GROUPS = [...new Set(CHALLENGES.map((c) => c.group))];

/** Every decoration a reward gives: [kind, id] -> what earns it (for the Steward's list). */
export function decorSources() {
  const out = {};
  const note = (d, src) => { if (d) (out[d[0] + ':' + d[1]] ||= []).push(src); };
  for (const s of SAGAS) s.ch.forEach((c, k) => note(c.decor, `${s.name}, chapter ${k + 1}`));
  for (const c of CHALLENGES) note(c.decor, c.name);
  return out;
}
export function trophySources() {
  const out = {};
  for (const s of SAGAS) s.ch.forEach((c, k) => { if (c.trophy) (out[c.trophy] ||= []).push(`${s.name}, chapter ${k + 1}`); });
  for (const c of CHALLENGES) if (c.trophy) (out[c.trophy] ||= []).push(c.name);
  return out;
}
/** How many quests the keep holds: saga chapters, bounty kinds, challenges. */
export const questCount = () => ({ sagas: SAGAS.reduce((n, s) => n + s.ch.length, 0), bounties: BOUNTIES.length, challenges: CHALLENGES.length });
