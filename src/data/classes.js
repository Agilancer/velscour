import { TREE4_NAMES } from './skilltrees4.js';
// The sixteen playable classes.
// primary: attribute that adds +1% damage to all of the class' skills per point.
export const CLASSES = {
  paladin: {
    name: 'Paladin', primary: 'str', base: { str: 24, dex: 14, vit: 24, int: 16 }, life: 95, mana: 40, lifeLvl: 18, manaLvl: 3,
    weapon: 'mace', offhand: 'shield', element: 'holy', color: '#ffd860',
    trees: ['Holy Wrath', 'Bulwark', 'Crusade'],
    desc: 'A holy warrior clad in blessed steel. Hammers of light, righteous auras and an unbreakable shield wall.',
  },
  ranger: {
    name: 'Ranger', primary: 'dex', base: { str: 16, dex: 28, vit: 18, int: 14 }, life: 78, mana: 40, lifeLvl: 14, manaLvl: 3.5,
    weapon: 'bow', offhand: 'quiver', element: 'phys', color: '#7ccf5a',
    trees: ['Marksmanship', 'The Wilds', 'Traps & Tricks'],
    desc: 'A deadly archer of the wildwood. Volleys of arrows, beast companions and cunning traps.',
  },
  wizard: {
    name: 'Wizard', primary: 'int', base: { str: 12, dex: 16, vit: 16, int: 32 }, life: 68, mana: 75, lifeLvl: 12, manaLvl: 6,
    weapon: 'staff', offhand: 'tome', element: 'fire', color: '#ff8a30',
    trees: ['Fire', 'Frost', 'Storm'],
    desc: 'Master of the classic elements. Meteors, blizzards and chain lightning at your fingertips.',
  },
  necromancer: {
    name: 'Necromancer', primary: 'int', base: { str: 14, dex: 16, vit: 18, int: 28 }, life: 72, mana: 70, lifeLvl: 13, manaLvl: 5.5,
    weapon: 'wand', offhand: 'orb', element: 'shadow', color: '#a070ff',
    trees: ['Bone & Blood', 'Summoning', 'Curses & Plague', 'Skeletal Legion'],
    desc: 'Commander of the dead. Raise skeletal armies, hurl bone spears and detonate corpses.',
  },
  barbarian: {
    name: 'Barbarian', primary: 'str', base: { str: 30, dex: 18, vit: 26, int: 8 }, life: 110, mana: 25, lifeLvl: 22, manaLvl: 2,
    weapon: 'axe', element: 'phys', color: '#d8853a',
    trees: ['Rage', 'Warcries', 'Earthshaker'],
    desc: 'A savage berserker from the frozen north. Whirlwinds of steel, earth-splitting slams and battle cries.',
  },
  dragoon: {
    name: 'Dragoon', primary: 'str', base: { str: 24, dex: 22, vit: 22, int: 12 }, life: 88, mana: 35, lifeLvl: 16, manaLvl: 3,
    weapon: 'spear', offhand: 'shield', element: 'fire', color: '#6aa8ff',
    trees: ['Lancework', 'Sky Dive', 'Wyrmblood', 'Spearstorm'],
    desc: 'A lance-wielding knight who leaps from the heavens. Dragon dives, lance flurries and wyrm breath.',
  },
  totem_master: {
    name: 'Totem Master', primary: 'int', base: { str: 18, dex: 16, vit: 22, int: 24 }, life: 82, mana: 55, lifeLvl: 15, manaLvl: 4,
    weapon: 'staff', offhand: 'idol', element: 'light', color: '#5ac8a0',
    trees: ['Totems', 'Ancestors', 'Earth & Storm'],
    desc: 'A shaman who plants spirit totems that burn, shock and heal while ancestors fight at their side.',
  },
  death_knight: {
    name: 'Death Knight', primary: 'str', base: { str: 26, dex: 14, vit: 26, int: 14 }, life: 98, mana: 35, lifeLvl: 18, manaLvl: 3,
    weapon: 'sword', offhand: 'skull', element: 'cold', color: '#7ad0ff',
    trees: ['Frost', 'Unholy', 'Blood'],
    desc: 'A fallen champion bound by runic frost. Obliterating strikes, plague and life-stealing blood magic.',
  },
  arcane_sorcerer: {
    // the id stays arcane_sorcerer (saves, sprites and gear packs use it); he is the Astronomer now
    name: 'Astronomer', primary: 'int', base: { str: 12, dex: 16, vit: 16, int: 34 }, life: 68, mana: 80, lifeLvl: 12, manaLvl: 6,
    weapon: 'wand', offhand: 'orb', element: 'arcane', color: '#4aa8ff',
    trees: ['Starfire', 'Celestial Bodies', 'Gravity'],
    desc: 'A stargazer who wields the heavens. Swarms of star missiles, meteors, falling suns and black holes; every spell charts a star, and finished constellations grant zodiac boons.',
  },
  carrion_witch: {
    name: 'Carrion Witch', primary: 'int', base: { str: 12, dex: 18, vit: 18, int: 30 }, life: 72, mana: 70, lifeLvl: 13, manaLvl: 5.5,
    weapon: 'staff', offhand: 'lantern', element: 'poison', color: '#9ac84a',
    trees: ['Plague', 'Murder of Crows', 'Hexes'],
    desc: 'A swamp hag who commands locusts and crows, and hexes her foes into rotting puppets.',
  },
  bard: {
    name: 'Bard', primary: 'dex', base: { str: 16, dex: 26, vit: 20, int: 18 }, life: 78, mana: 52, lifeLvl: 14, manaLvl: 4,
    weapon: 'lute', offhand: 'drum', element: 'arcane', color: '#ff6a8a',
    trees: ['Songs', 'Sonic Arts', 'Trickery'],
    desc: 'A roguish minstrel whose songs empower allies, whose chords shatter bone, and whose knives never miss.',
  },
  slime_lord: {
    name: 'Slime Lord', primary: 'vit', base: { str: 18, dex: 14, vit: 32, int: 16 }, life: 105, mana: 45, lifeLvl: 20, manaLvl: 3.5,
    weapon: 'mace', offhand: 'jar', element: 'acid', color: '#4aa8ff',
    trees: ['Ooze', 'Spawn', 'Mutation'],
    desc: 'A crowned king of living ooze. Acid floods, endless slimeling broods and grotesque mutations.',
  },
  boomerang_knight: {
    name: 'Boomerang Knight', primary: 'dex', base: { str: 20, dex: 28, vit: 20, int: 12 }, life: 82, mana: 40, lifeLvl: 15, manaLvl: 3,
    weapon: 'boomerang', offhand: 'rang', element: 'phys', color: '#3ac8a8',
    trees: ['Throwing', 'Bladesmanship', 'Gale Knight'],
    desc: 'A dashing knight whose blades always come back. Ricochets, swirling sword storms and gale cyclones.',
  },
  lancer: {
    name: 'Lancer', primary: 'str', base: { str: 26, dex: 18, vit: 30, int: 8 }, life: 105, mana: 36, lifeLvl: 20, manaLvl: 2.5,
    weapon: 'spear', offhand: 'shield', element: 'light', color: '#c0c0d0',
    trees: ['Energy Lance', 'Bulwark', 'Knight Order'],
    desc: 'An unbreakable knight-captain. Huge elemental energy lances, up to ten tower shields circling him, and an order of knights at his back.',
  },
  dragon_knight: {
    name: 'Dragon Knight', primary: 'str', base: { str: 26, dex: 18, vit: 24, int: 12 }, life: 92, mana: 40, lifeLvl: 17, manaLvl: 3,
    weapon: 'sword', offhand: 'shield', element: 'fire', color: '#ff5a2a',
    trees: ['Flame', 'Scale', 'Draconic'],
    desc: 'Blood of the wyrm runs hot. Fire breath, dragon-scale armor and the power to become a dragon.',
  },
  gunner: {
    name: 'Gunner', primary: 'dex', base: { str: 16, dex: 30, vit: 18, int: 16 }, life: 78, mana: 45, lifeLvl: 14, manaLvl: 3.5,
    weapon: 'pistol', offhand: 'bomb', element: 'fire', color: '#d0a060',
    trees: ['Firearms', 'Explosives', 'Engineering'],
    desc: 'A powder-stained engineer. Bullet hell, rocket barrages, turrets, drones and a death laser.',
  },
};
for (const [c, name] of Object.entries(TREE4_NAMES)) if (CLASSES[c].trees.length === 3) CLASSES[c].trees.push(name);

/**
 * Every class's damage multiplier at hero levels DMG_TUNE_AT (log-interpolated, held past the ends; Player.skillDamage
 * applies it, so minions, signatures and procs follow). Tuned across Lv 1-100 under the polynomial rebalance so melee
 * vanguards hold a slight edge for standing in close combat while ranged/caster kits stay tightly grouped.
 */
export const DMG_TUNE_AT = [1, 25, 60, 100];
export const DMG_TUNE = {
  paladin: [1.05, 1.05, 1.05, 1.05],
  ranger: [0.96, 0.96, 0.96, 0.96],
  wizard: [0.98, 0.98, 0.98, 0.98],
  necromancer: [1.0, 1.0, 1.0, 1.0],
  barbarian: [1.1, 1.12, 1.12, 1.12],
  dragoon: [1.05, 1.05, 1.05, 1.05],
  totem_master: [1.0, 1.0, 1.0, 1.0],
  death_knight: [1.05, 1.05, 1.05, 1.05],
  arcane_sorcerer: [0.95, 0.95, 0.95, 0.95],
  carrion_witch: [1.0, 1.02, 1.04, 1.05],
  bard: [0.98, 1.0, 1.02, 1.02],
  slime_lord: [1.0, 1.0, 1.0, 1.0],
  boomerang_knight: [1.0, 1.0, 1.0, 1.0],
  lancer: [1.08, 1.1, 1.1, 1.1],
  dragon_knight: [1.05, 1.05, 1.05, 1.05],
  gunner: [0.96, 0.98, 0.98, 0.98],
};

export const ATTRS = {
  str: { name: 'Strength', short: 'STR', desc: '+1% physical damage, +1 armor' },
  dex: { name: 'Dexterity', short: 'DEX', desc: '+0.3% attack speed, +0.1% crit chance (past the 75% cap: +0.2% crit damage)' },
  vit: { name: 'Vitality', short: 'VIT', desc: '+6 life, +0.08 life regen' },
  int: { name: 'Intellect', short: 'INT', desc: '+2 mana, +1% elemental damage' },
};
