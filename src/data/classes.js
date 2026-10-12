// The sixteen playable classes.
// primary: attribute that adds +1% damage to all of the class' skills per point.
export const CLASSES = {
  paladin: {
    name: 'Paladin', primary: 'str', base: { str: 24, dex: 14, vit: 24, int: 16 }, life: 70, mana: 30, lifeLvl: 8, manaLvl: 2,
    weapon: 'mace', offhand: 'shield', element: 'holy', color: '#ffd860',
    trees: ['Holy Wrath', 'Bulwark', 'Crusade'],
    desc: 'A holy warrior clad in blessed steel. Hammers of light, righteous auras and an unbreakable shield wall.',
  },
  ranger: {
    name: 'Ranger', primary: 'dex', base: { str: 16, dex: 28, vit: 18, int: 14 }, life: 55, mana: 30, lifeLvl: 6, manaLvl: 2.5,
    weapon: 'bow', element: 'phys', color: '#7ccf5a',
    trees: ['Marksmanship', 'The Wilds', 'Traps & Tricks'],
    desc: 'A deadly archer of the wildwood. Volleys of arrows, beast companions and cunning traps.',
  },
  wizard: {
    name: 'Wizard', primary: 'int', base: { str: 12, dex: 16, vit: 16, int: 32 }, life: 45, mana: 60, lifeLvl: 5, manaLvl: 4,
    weapon: 'staff', element: 'fire', color: '#ff8a30',
    trees: ['Fire', 'Frost', 'Storm'],
    desc: 'Master of the classic elements. Meteors, blizzards and chain lightning at your fingertips.',
  },
  necromancer: {
    name: 'Necromancer', primary: 'int', base: { str: 14, dex: 16, vit: 18, int: 28 }, life: 48, mana: 55, lifeLvl: 5, manaLvl: 4,
    weapon: 'wand', offhand: 'orb', element: 'shadow', color: '#a070ff',
    trees: ['Bone & Blood', 'Summoning', 'Curses & Plague', 'Skeletal Legion'],
    desc: 'Commander of the dead. Raise skeletal armies, hurl bone spears and detonate corpses.',
  },
  barbarian: {
    name: 'Barbarian', primary: 'str', base: { str: 30, dex: 18, vit: 26, int: 8 }, life: 80, mana: 20, lifeLvl: 9, manaLvl: 1.5,
    weapon: 'axe', element: 'phys', color: '#d8853a',
    trees: ['Rage', 'Warcries', 'Earthshaker'],
    desc: 'A savage berserker from the frozen north. Whirlwinds of steel, earth-splitting slams and battle cries.',
  },
  dragoon: {
    name: 'Dragoon', primary: 'str', base: { str: 24, dex: 22, vit: 22, int: 12 }, life: 65, mana: 30, lifeLvl: 7, manaLvl: 2,
    weapon: 'spear', element: 'fire', color: '#6aa8ff',
    trees: ['Lancework', 'Sky Dive', 'Wyrmblood'],
    desc: 'A lance-wielding knight who leaps from the heavens. Dragon dives, lance flurries and wyrm breath.',
  },
  totem_master: {
    name: 'Totem Master', primary: 'int', base: { str: 18, dex: 16, vit: 22, int: 24 }, life: 60, mana: 45, lifeLvl: 7, manaLvl: 3,
    weapon: 'staff', element: 'light', color: '#5ac8a0',
    trees: ['Totems', 'Ancestors', 'Earth & Storm'],
    desc: 'A shaman who plants spirit totems that burn, shock and heal while ancestors fight at their side.',
  },
  death_knight: {
    name: 'Death Knight', primary: 'str', base: { str: 26, dex: 14, vit: 26, int: 14 }, life: 75, mana: 30, lifeLvl: 8, manaLvl: 2,
    weapon: 'sword', element: 'cold', color: '#7ad0ff',
    trees: ['Frost', 'Unholy', 'Blood'],
    desc: 'A fallen champion bound by runic frost. Obliterating strikes, plague and life-stealing blood magic.',
  },
  arcane_sorcerer: {
    name: 'Arcane Sorcerer', primary: 'int', base: { str: 12, dex: 16, vit: 16, int: 34 }, life: 44, mana: 65, lifeLvl: 5, manaLvl: 4.5,
    weapon: 'wand', offhand: 'orb', element: 'arcane', color: '#d070ff',
    trees: ['Arcane', 'Chronomancy', 'Void'],
    desc: 'A scholar of raw magic. Homing missiles, time manipulation and void-born death lasers.',
  },
  carrion_witch: {
    name: 'Carrion Witch', primary: 'int', base: { str: 12, dex: 18, vit: 18, int: 30 }, life: 48, mana: 55, lifeLvl: 5, manaLvl: 4,
    weapon: 'staff', element: 'poison', color: '#9ac84a',
    trees: ['Plague', 'Murder of Crows', 'Hexes'],
    desc: 'A swamp hag who commands locusts and crows, and hexes her foes into rotting puppets.',
  },
  bard: {
    name: 'Bard', primary: 'dex', base: { str: 16, dex: 26, vit: 20, int: 18 }, life: 55, mana: 40, lifeLvl: 6, manaLvl: 3,
    weapon: 'lute', element: 'arcane', color: '#ff6a8a',
    trees: ['Songs', 'Sonic Arts', 'Trickery'],
    desc: 'A roguish minstrel whose songs empower allies, whose chords shatter bone, and whose knives never miss.',
  },
  slime_lord: {
    name: 'Slime Lord', primary: 'vit', base: { str: 18, dex: 14, vit: 32, int: 16 }, life: 85, mana: 35, lifeLvl: 9, manaLvl: 2.5,
    weapon: 'mace', element: 'acid', color: '#4aa8ff',
    trees: ['Ooze', 'Spawn', 'Mutation'],
    desc: 'A crowned king of living ooze. Acid floods, endless slimeling broods and grotesque mutations.',
  },
  boomerang_knight: {
    name: 'Boomerang Knight', primary: 'dex', base: { str: 20, dex: 28, vit: 20, int: 12 }, life: 60, mana: 30, lifeLvl: 7, manaLvl: 2,
    weapon: 'boomerang', element: 'phys', color: '#3ac8a8',
    trees: ['Throwing', 'Bladesmanship', 'Gale Knight'],
    desc: 'A dashing knight whose blades always come back. Ricochets, swirling sword storms and gale cyclones.',
  },
  lancer: {
    name: 'Lancer', primary: 'str', base: { str: 26, dex: 20, vit: 26, int: 8 }, life: 78, mana: 25, lifeLvl: 8, manaLvl: 1.5,
    weapon: 'spear', offhand: 'shield', element: 'light', color: '#c0c0d0',
    trees: ['Phalanx', 'Javelin', 'Valor'],
    desc: 'An iron-clad spearman. Shield walls, storms of lightning javelins and banners that rally the brave.',
  },
  dragon_knight: {
    name: 'Dragon Knight', primary: 'str', base: { str: 26, dex: 18, vit: 24, int: 12 }, life: 72, mana: 30, lifeLvl: 8, manaLvl: 2,
    weapon: 'sword', element: 'fire', color: '#ff5a2a',
    trees: ['Flame', 'Scale', 'Draconic'],
    desc: 'Blood of the wyrm runs hot. Fire breath, dragon-scale armor and the power to become a dragon.',
  },
  gunner: {
    name: 'Gunner', primary: 'dex', base: { str: 16, dex: 30, vit: 18, int: 16 }, life: 55, mana: 35, lifeLvl: 6, manaLvl: 2.5,
    weapon: 'pistol', element: 'fire', color: '#d0a060',
    trees: ['Firearms', 'Explosives', 'Engineering'],
    desc: 'A powder-stained engineer. Bullet hell, rocket barrages, turrets, drones and a death laser.',
  },
};

export const ATTRS = {
  str: { name: 'Strength', short: 'STR', desc: '+1% physical damage, +1 armor' },
  dex: { name: 'Dexterity', short: 'DEX', desc: '+0.3% attack speed, +0.05% crit chance' },
  vit: { name: 'Vitality', short: 'VIT', desc: '+3 life, +0.05 life regen' },
  int: { name: 'Intellect', short: 'INT', desc: '+2 mana, +1% elemental damage' },
};
