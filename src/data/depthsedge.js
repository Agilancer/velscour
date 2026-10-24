// DEPTH'S EDGE: TERROR II (Depths_Edge_Terror_II_50_Monsters_10_Bosses.zip): the 50 monsters and 10 bosses of the
// Depth's Edge Caverns (docs/DEPTHS_EDGE.md), cut by tools/depthsedge.py and packed by
// `python tools/process_assets.py enemies depths_edge` into depths_edge/monsters_1 (M001-M025), monsters_2 (M026-M050)
// and bosses. They are a faction of their own like the Air Pirates: never in another level's random looks
// (bestiary.js artPool/bossPool skip `depthsEdge`), and the caverns field nothing else (game/caverns.js caveLooks).
// Rows are [name, arch, h, extras]; the id is 'de_' + the name in snake case, the cell the row's index.
const cave = { depthsEdge: true, undead: false, gore: 'flesh', demon: false };
const row = (sheet, base) => (rows) => rows.map(([name, arch, h, o], i) => ({
  id: 'de_' + name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''), sheet, i, arch, name, h, ...cave, ...base, ...o,
}));
const mon1 = row('depths_edge/monsters_1', {}), mon2 = row('depths_edge/monsters_2', {});
const boss = row('depths_edge/bosses', { boss: true, lone: true });

export const DEPTHS_EDGE = [
  ...mon1([
    ['Pressure Widow', 'shroom', 58, { also: ['abomination'] }],            // a concussive exhale: punish it breathing out
    ['Suture Grazer', 'hound', 44, { also: ['scorpion'] }],
    ['Wellhand', 'worm', 52, { also: ['shroom'] }],
    ['Milkvein Knuckler', 'ghoul', 48, { also: ['abomination'] }],
    ['False Rescue', 'ghoul', 48, { also: ['zombie', 'cultist'] }],
    ['Throat Kiln', 'worm', 44, { also: ['imp'], el: 'fire' }],
    ['Lint Bride', 'zombie', 48, { also: ['wraith'] }],
    ['Basin Tongue', 'worm', 42, { also: ['scorpion'] }],
    ['Ossuary Bladder', 'beetle', 40, { gore: 'bone' }],                  // it bursts
    ['Earless Listener', 'cultist', 58, { also: ['skeleton'] }],
    ['Drain Apostle', 'skeleton', 60, { also: ['zombie'] }],
    ['Cleft Nurse', 'spider', 42, { also: ['ghoul'] }],
    ['Tallow Skipper', 'hound', 42, { also: ['ghoul'] }],
    ['Marrow Harrow', 'scorpion', 42, { also: ['spider'], gore: 'bone' }],
    ['Blindfold Eater', 'hound', 40, { also: ['ghoul'] }],
    ['Rafter Griever', 'bat', 46, { also: ['gargoyle'], fly: true }],
    ['Pearl Rotator', 'slime', 42, { also: ['beetle'] }],
    ['Hunger Apron', 'ghoul', 52, { also: ['zombie'] }],
    ['Sump Yoke', 'abomination', 58, { also: ['golem'] }],
    ['Pallid Augur', 'worm', 44, { also: ['scorpion'] }],                 // a drill head: it burrows
    ['Breath Taxer', 'golem', 52, { also: ['abomination'], gore: 'rock' }],
    ['Mourning Valve', 'shroom', 50, { also: ['eye'], el: 'cold' }],
    ['Grief Dredger', 'worm', 44, { also: ['golem'] }],
    ['Cistern Heir', 'golem', 54, { also: ['abomination'], el: 'cold' }],
    ['Tongue Raft', 'spider', 34, { also: ['scorpion'] }],
  ]),
  ...mon2([
    ['Seam Beggar', 'archer', 54, { also: ['cultist'] }],
    ['Crownless Molter', 'scorpion', 44, { also: ['spider'], gore: 'rock' }],
    ['Funeral Fold', 'wraith', 50, { also: ['bat'], fly: true }],
    ['Brine Knell', 'abomination', 58, { also: ['golem'], el: 'cold' }],
    ['Sepulcher Snout', 'ghoul', 44, { also: ['hound'] }],
    ['Scream Sieve', 'cultist', 54, { also: ['wraith'] }],
    ['Pit Unbuttoner', 'spider', 42, { also: ['ghoul'] }],
    ['Mercy Hook', 'knight', 52, { also: ['ghoul'] }],
    ['Choiceless Face', 'knight', 56, { also: ['gargoyle'] }],
    ['Salt Lung Porter', 'spider', 46, { also: ['abomination'] }],
    ['Gallows Drinker', 'hound', 44, { also: ['scorpion'] }],
    ['Knuckle Psalm', 'golem', 46, { also: ['scorpion'], gore: 'rock' }],
    ['Hollow Wicker', 'eye', 48, { also: ['shroom'], fly: false }],
    ['Choke Mantle', 'ghoul', 44, { also: ['hound'] }],
    ['Ash Licker', 'zombie', 54, { also: ['ghoul'] }],
    ['Woundless Butcher', 'knight', 56, { also: ['abomination'] }],
    ['Navel Lantern', 'cultist', 52, { also: ['eye'], el: 'light' }],
    ['Cradle Fluke', 'worm', 42, { also: ['slime'] }],
    ['Tithe Mill', 'golem', 44, { also: ['slime'], gore: 'rock' }],
    ['Ligament Sailor', 'gargoyle', 52, { also: ['bat'], fly: true }],
    ['Muffled Stranger', 'zombie', 52, { also: ['ghoul'] }],
    ['Cavity Usher', 'scorpion', 42, { also: ['hound'] }],
    ['Last Supper', 'beetle', 42, { also: ['spider'] }],
    ['Mouthlock Penitent', 'hound', 48, { also: ['ghoul'] }],
    ['Ruin Gestator', 'abomination', 56, { also: ['slime'] }],            // a brood mother
  ]),
  ...boss([
    ['The Pressure Confessor', 'abomination', 76, {}],
    ['Mother of Closed Doors', 'golem', 74, { gore: 'rock' }],
    ['The Unswallowed', 'abomination', 72, {}],
    ['Abbot of the Empty Skin', 'demon', 80, {}],
    ['The Brine Testament', 'abomination', 70, { el: 'cold' }],
    ['Sovereign of the Held Breath', 'golem', 74, {}],
    ['The Mercy Engine', 'golem', 72, { gore: 'rock' }],
    ['Grandmother Under the Sill', 'abomination', 64, {}],
    ['The Last Warm Thing', 'demon', 80, {}],
    ['The Depth That Remembers', 'abomination', 76, {}],
  ]),
];

/** The raid template each boss fights with (game/raid.js RAID_BOSSES) and the title it takes. */
export const DEPTHS_EDGE_BOSSES = {
  de_the_pressure_confessor: ['colossus', 'Who Seals the Vents'],
  de_mother_of_closed_doors: ['carapace', 'Brood-Warden of the Shelf'],
  de_the_unswallowed: ['cauldron', 'Keeper of the Stone Egg'],
  de_abbot_of_the_empty_skin: ['pontiff', 'Hierophant of the Hollow'],
  de_the_brine_testament: ['cephalarch', 'Voice of the Silt Pools'],
  de_sovereign_of_the_held_breath: ['anvil', 'Lord of the Last Air'],
  de_the_mercy_engine: ['mantis', 'the Bone Bellows'],
  de_grandmother_under_the_sill: ['maws', 'Mouth Beneath the Falls'],
  de_the_last_warm_thing: ['reaper', 'Ember of the Cold Deep'],
  de_the_depth_that_remembers: ['oracle', 'Memory of the Abyss'],
};
