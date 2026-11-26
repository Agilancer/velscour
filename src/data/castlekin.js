// CASTLE CREATURES AND BOSSES (VELSCOUR_Castle_Creatures_and_Bosses.zip, the Thanksgiving update): 50 creatures from
// five wings of a fallen castle and 10 bosses, cut by heat map with tools/castlekin.py and packed by
// `python tools/process_assets.py enemies castle` into castle/creatures_1 (1-25), castle/creatures_2 (26-50) and
// castle/bosses. Unlike the Air Pirates or the Depth's Edge they are part of the base game: every level's random
// bestiary can roll them (and favours them: rollLooks' KIN_SHARE), and the bosses are guardians and raid bosses.
// Every creature plays its own mechanic, `kit` (game/castlekin.js KITS); the bosses fight with their own raid
// passives and signatures (game/castleraids.js) and, as depth guardians, with one of the creature kits.
// Rows are [name, arch, h, kit, extras]; the id is 'ck_' + the name in snake case, the cell the row's index.
const mortal = { undead: false, gore: 'flesh', demon: false };
const bone = { undead: true, gore: 'bone' };
const row = (sheet, base, wings) => (rows) => rows.map(([name, arch, h, kit, o], i) => ({
  id: 'ck_' + name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''), sheet, i, arch, name, h, kit,
  castleKin: true, wing: wings[Math.floor(i / 10)], ...mortal, ...base, ...o,
}));
const set1 = row('castle/creatures_1', {}, ['gatehouse', 'dungeons', 'chapel']);
const set2 = row('castle/creatures_2', {}, ['chapel', 'armory', 'royal']);
const boss = row('castle/bosses', { boss: true, lone: true }, ['bosses']);

export const CASTLE_KIN = [
  ...set1([
    // the gatehouse
    ['Portcullis Maw', 'golem', 64, 'portcullis', { also: ['abomination', 'demon'] }],
    ['Rampart Harpy', 'gargoyle', 52, 'harpy', { also: ['bat'], fly: true }],
    ['Boltback Imp', 'archer', 44, 'ballista', { also: ['imp'], demon: true }],
    ['Moat Leech', 'worm', 46, 'leech', { also: ['scorpion'] }],
    ['Arrow-Slit Wraith', 'archer', 56, 'arrowslit', { also: ['wraith'], ...bone, gore: 'ecto' }],
    ['Chain Hound', 'hound', 42, 'chainpack', {}],
    ['Soot Gargoyle', 'gargoyle', 50, 'soot', { also: ['golem'], gore: 'rock' }],
    ['Barbican Beetle', 'scorpion', 42, 'barbican', { also: ['golem', 'spider'], gore: 'goo' }],
    ['Rust Pike Revenant', 'skeleton', 58, 'rustpike', { also: ['knight'], ...bone }],
    ['Grate Rat', 'hound', 34, 'grate', { also: ['ghoul', 'spider'] }],
    // the dungeons
    ['Rack Spider', 'spider', 40, 'rack', { gore: 'goo' }],
    ['Keyring Imp', 'imp', 42, 'keyring', { also: ['ghoul'], demon: true }],
    ['Tallow Leech', 'worm', 40, 'tallow', { also: ['scorpion'], el: 'fire' }],
    ['Cage Mimic', 'ghoul', 46, 'cagemimic', { also: ['spider', 'scorpion'], gore: 'rock' }],
    ['Shackled Ogre', 'abomination', 66, 'ogre', { also: ['golem', 'zombie'] }],
    ['Hookhand Jailor', 'ghoul', 56, 'jailor', { also: ['knight', 'zombie'] }],
    ['Blind Cell Crawler', 'ghoul', 40, 'blind', { also: ['spider', 'hound'] }],
    ['Oubliette Eel', 'worm', 40, 'oubliette', { also: ['scorpion'], el: 'cold', gore: 'goo' }],
    ['Lockjaw Toad', 'abomination', 50, 'lockjaw', { also: ['golem'], el: 'poison', gore: 'goo' }],
    ['Bone Gaoler', 'skeleton', 58, 'gaoler', { also: ['knight', 'cultist'], ...bone }],
    // the chapel
    ['Censer Wraith', 'wraith', 56, 'censer', { also: ['cultist'], el: 'shadow', ...bone, gore: 'ecto', fly: true }],
    ['Choir Moth', 'bat', 44, 'choir', { also: ['gargoyle', 'elemental'], el: 'holy', fly: true, gore: 'goo' }],
    ['Chalice Parasite', 'ghoul', 42, 'chalice', { also: ['spider', 'scorpion'], el: 'blood' }],
    ['Bell-Tongue Imp', 'imp', 46, 'belltongue', { also: ['ghoul', 'cultist'], demon: true }],
    ['Votive Husk', 'zombie', 54, 'votive', { also: ['cultist', 'shroom'], el: 'fire', undead: true }],
  ]),
  ...set2([
    ['Altar Mantis', 'scorpion', 52, 'altar', { also: ['spider', 'ghoul'], gore: 'goo' }],
    ['Sacristy Shade', 'wraith', 58, 'sacristy', { also: ['ghoul'], el: 'shadow', undead: true, gore: 'ecto', fly: true }],
    ['Reliquary Crab', 'golem', 42, 'reliquary', { also: ['scorpion', 'spider'], el: 'holy', gore: 'rock' }],
    ['Saint-Eater', 'ghoul', 54, 'sainteater', { also: ['zombie', 'demon'], el: 'shadow' }],
    ['Wax Acolyte', 'cultist', 56, 'waxseal', { also: ['zombie', 'shroom'], el: 'fire' }],
    // the armory
    ['Anvilback Brute', 'golem', 64, 'anvil', { also: ['abomination', 'demon'] }],
    ['Quench Drake', 'hound', 40, 'quench', { also: ['scorpion', 'worm'], el: 'fire' }],
    ['Cinder Squire', 'knight', 56, 'squire', { also: ['skeleton'], el: 'fire' }],
    ['Forge Tick', 'spider', 36, 'forgetick', { also: ['scorpion'], el: 'fire', gore: 'goo' }],
    ['Tongs Fiend', 'ghoul', 56, 'tongs', { also: ['imp', 'demon'], demon: true }],
    ['Ash Bellows', 'shroom', 50, 'bellows', { also: ['golem', 'elemental'], el: 'fire', gore: 'rock' }],
    ['Helm Hermit', 'scorpion', 42, 'hermit', { also: ['spider', 'golem'], gore: 'goo' }],
    ['Furnace Roach', 'beetle', 38, 'roach', { also: ['spider'], el: 'fire', gore: 'goo' }],
    ['Soot Smith', 'cultist', 56, 'smith', { also: ['knight', 'zombie'], el: 'fire' }],
    ['Slag Viper', 'worm', 40, 'slag', { also: ['scorpion', 'hound'], el: 'fire' }],
    // the royal wing
    ['Tapestry Stalker', 'ghoul', 56, 'tapestry', { also: ['wraith', 'hound'] }],
    ['Pantry Ghoul', 'zombie', 56, 'pantry', { also: ['ghoul', 'abomination'], undead: true }],
    ['Envoy Shade', 'wraith', 56, 'envoy', { also: ['cultist'], el: 'arcane', undead: true, gore: 'ecto' }],
    ['Silverware Imp', 'imp', 46, 'silverware', { also: ['archer', 'ghoul'], demon: true }],
    ['Throne Louse', 'spider', 40, 'louse', { also: ['scorpion'], gore: 'goo' }],
    ['Canopy Creeper', 'spider', 46, 'canopy', { also: ['ghoul', 'bat'] }],
    ['Banquet Mimic', 'ghoul', 40, 'banquet', { also: ['scorpion', 'beetle'], gore: 'rock' }],
    ['Crown Hound', 'hound', 50, 'crownhound', {}],
    ['Dueling Husk', 'skeleton', 56, 'duelist', { also: ['knight', 'ghoul'], ...bone }],
    ['Mirror Ghast', 'wraith', 56, 'mirror', { also: ['ghoul', 'skeleton'], el: 'arcane', undead: true, gore: 'ecto' }],
  ]),
  ...boss([
    ['The Drowned Castellan', 'knight', 88, 'oubliette', { also: ['golem', 'zombie'], el: 'cold', undead: true }],
    ['Matron of Keys', 'cultist', 86, 'jailor', { also: ['wraith'], el: 'arcane' }],
    ['The Last Bell', 'knight', 88, 'belltongue', { also: ['cultist', 'skeleton'], el: 'light' }],
    ['Reliquary Seraph', 'cultist', 90, 'votive', { also: ['wraith', 'gargoyle'], el: 'holy', undead: true }],
    ['Furnace Regent', 'golem', 90, 'anvil', { also: ['demon', 'abomination'], el: 'fire', gore: 'rock' }],
    ['The Rack Saint', 'zombie', 86, 'rack', { also: ['cultist', 'skeleton'], el: 'blood', undead: true }],
    ['Banquet Below', 'abomination', 80, 'pantry', { also: ['demon', 'golem'], el: 'poison' }],
    ['The Veiled Seneschal', 'wraith', 88, 'mirror', { also: ['cultist'], el: 'shadow', undead: true, gore: 'ecto' }],
    ['Sable Briar', 'demon', 76, 'slag', { also: ['hound', 'abomination'], el: 'poison' }],
    ['Crownless Colossus', 'golem', 92, 'crownhound', { also: ['knight', 'abomination'], gore: 'rock' }],
  ]),
];
export const CASTLE_BOSS_IDS = CASTLE_KIN.filter((a) => a.boss).map((a) => a.id);
