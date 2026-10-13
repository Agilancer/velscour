// Items, affixes, gems and legendary powers.
import { rand, randi, pick, weighted, clamp, chance } from '../core/util.js';
import { rollAugments, RING_NAMES, AUGMENTS, KIND_NAMES } from './rings.js';
import { SKILLS } from './skills.js';

export const RARITY = [
  { id: 0, name: 'Common', color: '#e8e8e8', weight: 62, affixes: [0, 1], sockets: 1, mult: 1 },
  { id: 1, name: 'Uncommon', color: '#4fd65a', weight: 25, affixes: [1, 2], sockets: 2, mult: 1 },
  { id: 2, name: 'Rare', color: '#4f8dff', weight: 9, affixes: [2, 3], sockets: 3, mult: 1.1 },
  { id: 3, name: 'Epic', color: '#b45cff', weight: 3.2, affixes: [3, 4], sockets: 4, mult: 1.25 },
  { id: 4, name: 'Legendary', color: '#ff9a2a', weight: 0.8, affixes: [4, 5], sockets: 6, mult: 1.4 },
  { id: 5, name: 'Mythic', color: '#ff4058', weight: 0.12, affixes: [5, 6], sockets: 6, mult: 1.65 },
];
/** Display colour per rarity id (also used for icon and staff tints). */
export const RARITY_COLORS = RARITY.map((r) => r.color);

export const MATERIALS = [
  { name: 'Rusted', color: '#8a6a50' }, { name: 'Iron', color: '#9aa0a8' }, { name: 'Steel', color: '#c4ccd4' },
  { name: 'Tempered', color: '#d8c8a8' }, { name: 'Mithril', color: '#a8e4ff' }, { name: 'Runic', color: '#80ffd0' },
  { name: 'Obsidian', color: '#4a3a5a' }, { name: 'Dragonbone', color: '#ece0c0' }, { name: 'Celestial', color: '#fff0a0' },
  { name: 'Abyssal', color: '#b050ff' },
];
export const tierOf = (ilvl) => clamp(Math.floor((ilvl - 1) / 10), 0, 9);

export const RING_SLOTS = ['ring1', 'ring2', 'ring3', 'ring4'];
export const SLOTS = ['weapon', 'offhand', 'head', 'body', 'hands', 'legs', 'feet', ...RING_SLOTS];
export const SLOT_NAMES = { weapon: 'Weapon', offhand: 'Off-hand', head: 'Head', body: 'Body', hands: 'Hands', legs: 'Legs', feet: 'Feet', ring: 'Ring', ring1: 'Ring', ring2: 'Ring', ring3: 'Ring', ring4: 'Ring' };
/** Can item it go in equipment slot `slot`? (A ring fits any of the four ring slots.) */
export const fitsSlot = (it, slot) => !!it && it.type === 'gear' && (it.slot === slot || (it.slot === 'ring' && RING_SLOTS.includes(slot)));
/** The equipment slot an item goes to: its own, or for a ring the first empty ring slot (else the first). */
export const slotFor = (equip, it) => (it.slot !== 'ring' ? it.slot : RING_SLOTS.find((s) => !equip[s]) || RING_SLOTS[0]);

export const WEAPONS = {
  sword: { names: ['Shortsword', 'Longsword', 'Broadsword', 'Bastard Sword', 'Runeblade'], icon: 'sword', dmg: 1.0, spd: 1.0 },
  axe: { names: ['Hatchet', 'War Axe', 'Bearded Axe', 'Battle Axe', 'Executioner'], icon: 'axe', dmg: 1.15, spd: 0.92 },
  mace: { names: ['Club', 'Mace', 'Flanged Mace', 'Morning Star', 'Reliquary Mace'], icon: 'mace', dmg: 1.05, spd: 0.97 },
  hammer: { names: ['War Hammer', 'Maul', 'Great Maul', 'Earthbreaker', 'Titan Hammer'], icon: 'hammer', dmg: 1.25, spd: 0.85 },
  dagger: { names: ['Knife', 'Dirk', 'Stiletto', 'Kris', 'Soul Blade'], icon: 'dagger', dmg: 0.75, spd: 1.25, crit: 4 },
  staff: { names: ['Quarterstaff', 'Gnarled Staff', 'Battle Staff', 'Archon Staff', 'Elder Staff'], icon: 'staff', dmg: 0.9, spd: 1.0, cast: 8 },
  wand: { names: ['Twig Wand', 'Bone Wand', 'Grim Wand', 'Lich Wand', 'Unearthed Wand'], icon: 'wand', dmg: 0.7, spd: 1.1, cast: 10 },
  bow: { names: ['Short Bow', 'Hunter\'s Bow', 'Composite Bow', 'Long War Bow', 'Matriarchal Bow'], icon: 'bow', dmg: 1.0, spd: 1.05 },
  crossbow: { names: ['Light Crossbow', 'Arbalest', 'Siege Crossbow', 'Ballista', 'Demon Crossbow'], icon: 'crossbow', dmg: 1.2, spd: 0.85 },
  spear: { names: ['Spear', 'Pike', 'Partizan', 'War Lance', 'Dragon Lance'], icon: 'spear', dmg: 1.1, spd: 0.95 },
  scythe: { names: ['Sickle', 'Scythe', 'War Scythe', 'Reaper', 'Thresher'], icon: 'scythe', dmg: 1.2, spd: 0.9 },
  pistol: { names: ['Flintlock', 'Blunderbuss', 'Hand Cannon', 'Repeater', 'Dragon Pistol'], icon: 'pistol', dmg: 1.0, spd: 1.1 },
  boomerang: { names: ['Throwing Stick', 'Boomerang', 'Glaive', 'Chakram', 'Moon Glaive'], icon: 'boomerang', dmg: 0.95, spd: 1.1 },
  lute: { names: ['Lute', 'Mandolin', 'War Lyre', 'Siren Harp', 'Lute of Ages'], icon: 'lute', dmg: 0.85, spd: 1.1, cast: 5 },
};
export const OFFHANDS = {
  shield: { names: ['Buckler', 'Kite Shield', 'Tower Shield', 'Aegis', 'Bulwark'], icon: 'shield', armor: 1.0, block: [8, 16] },
  orb: { names: ['Glass Orb', 'Eldritch Orb', 'Sacred Globe', 'Eye of Night', 'Star of Ruin'], icon: 'orb', armor: 0.25, spell: [6, 14] },
};
export const ARMORS = {
  head: { names: ['Cap', 'Helm', 'Great Helm', 'Winged Helm', 'Crown'], icon: 'helm', armor: 0.6 },
  body: { names: ['Leather Armor', 'Chain Mail', 'Breastplate', 'Plate Armor', 'Ancient Armor'], icon: 'armor', armor: 1.2 },
  hands: { names: ['Gloves', 'Bracers', 'Gauntlets', 'War Gauntlets', 'Ogre Gauntlets'], icon: 'gloves', armor: 0.4 },
  legs: { names: ['Leggings', 'Chain Leggings', 'Greaves', 'Plate Greaves', 'Warlord Greaves'], icon: 'legs', armor: 0.8 },
  feet: { names: ['Boots', 'Heavy Boots', 'Chain Boots', 'Sabatons', 'War Boots'], icon: 'boots', armor: 0.45 },
};

// Affixes. slots: W weapon, O offhand, H head, B body, G hands, L legs, F feet, R ring.
export const AFFIXES = [
  { s: 'dmgPct', t: '+{v}% Damage', pre: 'Vicious', min: 6, max: 14, sc: 0.025, slots: 'WOGR' },
  { s: 'flatDmg', t: '+{v} Weapon Damage', pre: 'Jagged', min: 1, max: 4, sc: 0.07, slots: 'W' },
  { s: 'atkSpeed', t: '+{v}% Attack Speed', pre: 'Swift', min: 4, max: 10, sc: 0.004, slots: 'WGR' },
  { s: 'castSpeed', t: '+{v}% Cast Speed', pre: 'Arcane', min: 4, max: 10, sc: 0.004, slots: 'WOHR' },
  { s: 'critChance', t: '+{v}% Critical Chance', pre: 'Keen', min: 2, max: 5, sc: 0.004, slots: 'WGHR' },
  { s: 'critDmg', t: '+{v}% Critical Damage', pre: 'Brutal', min: 10, max: 25, sc: 0.01, slots: 'WGOR' },
  { s: 'life', t: '+{v} Life', suf: 'of the Bear', min: 8, max: 20, sc: 0.06, slots: 'OHBGLFR' },
  { s: 'mana', t: '+{v} Mana', suf: 'of the Owl', min: 6, max: 15, sc: 0.05, slots: 'WOHBGLFR' },
  { s: 'lifeRegen', t: '+{v} Life per Second', suf: 'of Regrowth', min: 1, max: 3, sc: 0.05, slots: 'HBLFR' },
  { s: 'manaRegen', t: '+{v} Mana per Second', suf: 'of Clarity', min: 1, max: 2, sc: 0.04, slots: 'WOHGR' },
  { s: 'armor', t: '+{v} Armor', pre: 'Sturdy', min: 5, max: 15, sc: 0.07, slots: 'OHBGLF' },
  { s: 'armorPct', t: '+{v}% Armor', pre: 'Fortified', min: 10, max: 30, sc: 0.008, slots: 'OHBGLF' },
  { s: 'str', t: '+{v} Strength', suf: 'of Might', min: 2, max: 6, sc: 0.035, slots: 'WOHBGLFR' },
  { s: 'dex', t: '+{v} Dexterity', suf: 'of the Fox', min: 2, max: 6, sc: 0.035, slots: 'WOHBGLFR' },
  { s: 'vit', t: '+{v} Vitality', suf: 'of the Ox', min: 2, max: 6, sc: 0.035, slots: 'WOHBGLFR' },
  { s: 'int', t: '+{v} Intellect', suf: 'of the Sage', min: 2, max: 6, sc: 0.035, slots: 'WOHBGLFR' },
  { s: 'allAttr', t: '+{v} All Attributes', suf: 'of the Ancients', min: 1, max: 3, sc: 0.03, slots: 'WBHR', w: 0.4 },
  { s: 'resFire', t: '+{v}% Fire Resistance', suf: 'of Embers', min: 5, max: 14, sc: 0.004, slots: 'OHBGLFR' },
  { s: 'resCold', t: '+{v}% Cold Resistance', suf: 'of Winter', min: 5, max: 14, sc: 0.004, slots: 'OHBGLFR' },
  { s: 'resLight', t: '+{v}% Lightning Resistance', suf: 'of Grounding', min: 5, max: 14, sc: 0.004, slots: 'OHBGLFR' },
  { s: 'resPoison', t: '+{v}% Poison Resistance', suf: 'of the Antidote', min: 5, max: 14, sc: 0.004, slots: 'OHBGLFR' },
  { s: 'resAll', t: '+{v}% All Resistances', suf: 'of the Prism', min: 3, max: 8, sc: 0.003, slots: 'OHBR', w: 0.5 },
  { s: 'lifeSteal', t: '{v}% Life Steal', pre: 'Vampiric', min: 1, max: 3, sc: 0.002, slots: 'WGR' },
  { s: 'manaSteal', t: '{v}% Mana Steal', pre: 'Draining', min: 1, max: 3, sc: 0.002, slots: 'WGR' },
  { s: 'moveSpeed', t: '+{v}% Movement Speed', pre: 'Fleet', min: 4, max: 10, sc: 0.002, slots: 'FL' },
  { s: 'goldFind', t: '+{v}% Gold Find', suf: 'of Greed', min: 10, max: 30, sc: 0.01, slots: 'HGFR' },
  { s: 'magicFind', t: '+{v}% Magic Find', suf: 'of Fortune', min: 5, max: 15, sc: 0.006, slots: 'HGFR' },
  { s: 'block', t: '+{v}% Block Chance', pre: 'Stalwart', min: 3, max: 8, sc: 0.002, slots: 'O' },
  { s: 'thorns', t: '{v} Thorns Damage', pre: 'Spiked', min: 2, max: 6, sc: 0.08, slots: 'OBL' },
  { s: 'physPct', t: '+{v}% Physical Damage', pre: 'Sharpened', min: 8, max: 18, sc: 0.02, slots: 'WG' },
  { s: 'firePct', t: '+{v}% Fire Damage', pre: 'Burning', min: 8, max: 18, sc: 0.02, slots: 'WOHR' },
  { s: 'coldPct', t: '+{v}% Cold Damage', pre: 'Frozen', min: 8, max: 18, sc: 0.02, slots: 'WOHR' },
  { s: 'lightPct', t: '+{v}% Lightning Damage', pre: 'Shocking', min: 8, max: 18, sc: 0.02, slots: 'WOHR' },
  { s: 'poisonPct', t: '+{v}% Poison Damage', pre: 'Venomous', min: 8, max: 18, sc: 0.02, slots: 'WOHR' },
  { s: 'arcanePct', t: '+{v}% Arcane Damage', pre: 'Mystic', min: 8, max: 18, sc: 0.02, slots: 'WOHR' },
  { s: 'holyPct', t: '+{v}% Holy Damage', pre: 'Blessed', min: 8, max: 18, sc: 0.02, slots: 'WOHR' },
  { s: 'shadowPct', t: '+{v}% Shadow Damage', pre: 'Cursed', min: 8, max: 18, sc: 0.02, slots: 'WOHR' },
  { s: 'bloodPct', t: '+{v}% Blood Damage', pre: 'Sanguine', min: 8, max: 18, sc: 0.02, slots: 'WOHR' },
  { s: 'acidPct', t: '+{v}% Acid Damage', pre: 'Caustic', min: 8, max: 18, sc: 0.02, slots: 'WOHR' },
  { s: 'cdr', t: '+{v}% Cooldown Reduction', pre: 'Hastened', min: 3, max: 7, sc: 0.002, slots: 'HOGR', w: 0.6 },
  { s: 'areaPct', t: '+{v}% Area of Effect', pre: 'Vast', min: 5, max: 12, sc: 0.003, slots: 'WOB', w: 0.6 },
  { s: 'projSpeed', t: '+{v}% Projectile Speed', pre: 'Hurtling', min: 6, max: 15, sc: 0.003, slots: 'WG', w: 0.6 },
  { s: 'xpPct', t: '+{v}% Experience Gained', suf: 'of Learning', min: 3, max: 8, sc: 0.002, slots: 'HBR', w: 0.5 },
  { s: 'bossDmg', t: '+{v}% Damage to Bosses', pre: 'Slayer\'s', min: 8, max: 18, sc: 0.01, slots: 'WGO', w: 0.5 },
  { s: 'skillsAll', t: '+{v} to All Skills', pre: 'Exalted', min: 1, max: 1, sc: 0, slots: 'WOHBR', w: 0.25, minRarity: 3 },
  { s: 'skillTree0', t: '+{v} to {tree0} Skills', pre: 'Adept\'s', min: 1, max: 2, sc: 0, slots: 'WOH', w: 0.25, minRarity: 2 },
  { s: 'skillTree1', t: '+{v} to {tree1} Skills', pre: 'Adept\'s', min: 1, max: 2, sc: 0, slots: 'WOH', w: 0.25, minRarity: 2 },
  { s: 'skillTree2', t: '+{v} to {tree2} Skills', pre: 'Adept\'s', min: 1, max: 2, sc: 0, slots: 'WOH', w: 0.25, minRarity: 2 },
];
export const AFFIX_BY_STAT = Object.fromEntries(AFFIXES.map((a) => [a.s, a]));
const SLOT_LETTER = { weapon: 'W', offhand: 'O', head: 'H', body: 'B', hands: 'G', legs: 'L', feet: 'F', ring: 'R' };

export const LEGENDARY = {
  thunder: { name: 'Thunderstruck', desc: 'Hits have a 12% chance to call down a lightning bolt.' },
  echo: { name: 'Echoing', desc: 'Skills have a 20% chance to cast twice.', stats: [['echoChance', 20]] },
  split: { name: 'Splintering', desc: 'Projectiles split into three on their first hit.', stats: [['splitChance', 100]] },
  vamp: { name: 'Sanguinarch', desc: '+6% Life Steal. Kills heal 2% of life.', stats: [['lifeSteal', 6]] },
  inferno: { name: 'Infernal Path', desc: 'You leave a trail of burning ground.' },
  bloodbath: { name: 'Bloodbath', desc: 'Enemies you kill explode for 35% of their life.' },
  frostbite: { name: 'Frostbite', desc: 'Hits chill; 10% chance to freeze solid.' },
  surge: { name: 'Arcane Surge', desc: '15% chance on cast to refund the mana cost.' },
  wraith: { name: 'Wraithwalk', desc: '+25% movement speed and you pass through monsters.', stats: [['moveSpeed', 25]] },
  hammer: { name: 'Hammerfall', desc: 'Every 6th hit drops a spinning holy hammer.' },
  orbit: { name: 'Orbiting Shards', desc: 'Three spectral blades orbit you permanently.' },
  phoenix: { name: 'Phoenix Heart', desc: 'Once every 90 seconds, survive a killing blow.' },
  glass: { name: 'Glass Cannon', desc: '+60% damage, -30% life.', stats: [['dmgPct', 60], ['lifePct', -30]] },
  prism: { name: 'Prismatic', desc: '+1 projectile to all projectile skills.', stats: [['extraProj', 1]] },
  giant: { name: 'Giant\'s Reach', desc: '+30% area of effect.', stats: [['areaPct', 30]] },
  chain: { name: 'Chain Reaction', desc: 'Chains, bounces and pierces happen 2 extra times.', stats: [['chainPlus', 2], ['pierce', 2]] },
  nova: { name: 'Nova Heart', desc: '25% chance on cast to release a nova of the skill\'s element.', stats: [['novaOnCast', 25]] },
  greed: { name: 'Midas Touch', desc: '+80% gold find. Kills sometimes burst into coins.', stats: [['goldFind', 80]] },
  berserk: { name: 'Berserker', desc: '+4% damage for every 10% of life missing.' },
  thorns: { name: 'Iron Maiden', desc: 'Attackers take 150% of the damage they deal.' },
  legion: { name: 'Legion', desc: 'Your summons deal +60% damage and have +60% life.', stats: [['summonPct', 60]] },
  crit: { name: 'Executioner', desc: '+10% critical chance and +60% critical damage.', stats: [['critChance', 10], ['critDmg', 60]] },
};

// ---------------------------------------------------------------- class catalog items
// A class art pack (assets/sprites/classes/<cls>/<cls>.json) names that class's weapons and shields. While a
// hero of that class plays, every drop, vendor item and starting item of those slots is one of the catalog
// pieces of the rolled rarity (with its own name and icon) when one fits the slot and base; everything else
// stays a generic item. (Body armor and helmets look like the class's gear art: core/gearart.js.)
let classPool = null;
const BASE_WORDS = [
  ['sword', /Sword|Sabre|Blade|Edge|Falchion|Estoc|Rapier|Scimitar|Amen/], ['axe', /Axe|Cleaver|Executioner|Reaver/],
  ['hammer', /Hammer|Maul/], ['spear', /Spear|Lance|Trident|Glaive|Halberd|Pike/], ['mace', /Mace|Club|Flail|Scourge/],
];
/** The generic weapon base a catalog weapon behaves as (by its name; swords by default). */
export function catalogBase(name) {
  for (const [b, re] of BASE_WORDS) if (re.test(name)) return b;
  return 'sword';
}
export function setClassItems(cls, meta) {
  if (!meta) { classPool = null; return; }
  const rar = (r) => Math.max(0, RARITY.findIndex((x) => x.name === r));
  classPool = { weapon: [], offhand: [] };
  for (const [id, e] of Object.entries(meta.items)) {
    if (e.kind !== 'weapon' && e.kind !== 'shield') continue;
    const slot = e.kind === 'shield' ? 'offhand' : 'weapon';
    classPool[slot].push({ id, cls, name: e.name, rarity: rar(e.rarity), base: slot === 'offhand' ? 'shield' : catalogBase(e.name) });
  }
}
function classItem(slot, rarity, base) {
  const list = classPool && classPool[slot];
  if (!list) return null;
  const fits = list.filter((e) => e.rarity === rarity && (!base || e.base === base));
  return fits.length ? pick(fits) : null;
}

// ---------------------------------------------------------------- gems
export const GEM_TIERS = ['Chipped', 'Flawed', '', 'Flawless', 'Perfect', 'Royal', 'Imperial', 'Celestial', 'Abyssal', 'Eternal'];
export const MAX_GEM_TIER = GEM_TIERS.length - 1;
const GEM_MULT = [1, 1.8, 3, 4.5, 6.5, 9, 13, 18, 25, 35];
/** Gem Forge prices: fusing three gems of a tier into one of the next, or refining a single gem (much dearer). */
export const gemFuseCost = (tier) => Math.round(80 * Math.pow(2.2, tier));
export const gemRefineCost = (tier, special) => Math.round((special ? 2400 : 900) * Math.pow(2.6, tier));
export const GEMS = {
  ruby: { name: 'Ruby', color: '#e0203a', stats: [['life', 8], ['firePct', 4]] },
  sapphire: { name: 'Sapphire', color: '#2a5aff', stats: [['mana', 6], ['coldPct', 4]] },
  topaz: { name: 'Topaz', color: '#ffc020', stats: [['magicFind', 4], ['lightPct', 4]] },
  emerald: { name: 'Emerald', color: '#20c050', stats: [['dex', 2], ['poisonPct', 4]] },
  amethyst: { name: 'Amethyst', color: '#a040e0', stats: [['str', 2], ['armor', 6]] },
  diamond: { name: 'Diamond', color: '#e8f4ff', stats: [['resAll', 2], ['holyPct', 3]] },
  onyx: { name: 'Onyx', color: '#3a3448', stats: [['lifeSteal', 0.4], ['shadowPct', 4]] },
  opal: { name: 'Opal', color: '#f0d0ff', stats: [['int', 2], ['castSpeed', 1.5]] },
  jade: { name: 'Jade', color: '#40d0a0', stats: [['atkSpeed', 1.5], ['critChance', 0.6]] },
  bloodstone: { name: 'Bloodstone', color: '#a00018', stats: [['critDmg', 4], ['bloodPct', 4]] },
  moonstone: { name: 'Moonstone', color: '#c0d8ff', stats: [['cdr', 0.8], ['manaRegen', 0.5]] },
  sunstone: { name: 'Sunstone', color: '#ffa020', stats: [['arcanePct', 4], ['lifeRegen', 0.6]] },
  // shot-pattern / skill gems (rare). Fewer tiers matter: values per tier below.
  prism: { name: 'Prism Shard', color: '#ffffff', special: true, stats: [['extraProj', 0.34]], desc: 'More projectiles' },
  twinsoul: { name: 'Twinsoul Gem', color: '#ff80ff', special: true, stats: [['echoChance', 3]], desc: 'Chance to echo-cast' },
  splitter: { name: 'Splitter Garnet', color: '#ff5030', special: true, stats: [['splitChance', 8]], desc: 'Projectiles split on hit' },
  orbit: { name: 'Orbit Pearl', color: '#e0f0ff', special: true, stats: [['orbitOnCast', 4]], desc: 'Casts spawn orbiting orbs' },
  novacore: { name: 'Nova Core', color: '#ffd040', special: true, stats: [['novaOnCast', 4]], desc: 'Casts release novas' },
  chainlink: { name: 'Chainlink Agate', color: '#a0a0ff', special: true, stats: [['chainPlus', 0.34], ['pierce', 0.34]], desc: 'Extra chains & pierce' },
  titan: { name: 'Titan Heart', color: '#c06030', special: true, stats: [['areaPct', 4]], desc: 'Bigger areas' },
  seeker: { name: 'Seeker\'s Eye', color: '#40ffc0', special: true, stats: [['homing', 0.34], ['projSpeed', 5]], desc: 'Homing projectiles' },
  classgem: { name: 'Tear of the Ancients', color: '#ffe0a0', special: true, stats: [['skillsAll', 0.34]], desc: '+Skill levels' },
};
const GEM_KEYS = Object.keys(GEMS);
const NORMAL_GEMS = GEM_KEYS.filter((k) => !GEMS[k].special);
const SPECIAL_GEMS = GEM_KEYS.filter((k) => GEMS[k].special);

export function gemStats(gem, tier) {
  const g = GEMS[gem];
  return g.stats.map(([s, v]) => {
    let val = v * GEM_MULT[tier];
    if (['extraProj', 'chainPlus', 'pierce', 'homing', 'skillsAll'].includes(s)) val = Math.max(0, Math.floor((tier + 1) * v + 0.0001));
    else val = Math.round(val * 10) / 10;
    return [s, val];
  }).filter(([, v]) => v > 0);
}
export function gemName(gem, tier) {
  const t = GEM_TIERS[tier];
  return (t ? t + ' ' : '') + GEMS[gem].name;
}

let UID = Date.now() % 1000000;
export const newUid = () => ++UID;

export function makeGem(gem, tier) {
  return { uid: newUid(), type: 'gem', gem, tier: clamp(tier, 0, MAX_GEM_TIER), count: 1, ilvl: tier * 15 + 1 };
}
export function rollGem(ilvl) {
  const maxTier = clamp(Math.floor(ilvl / 16), 0, 7); // the top two tiers only come from the Gem Forge
  const tier = clamp(maxTier - (chance(0.6) ? randi(0, 1) : 0), 0, 7);
  const special = chance(0.08 + ilvl * 0.0012);
  return makeGem(special ? pick(SPECIAL_GEMS) : pick(NORMAL_GEMS), tier);
}

// --------------------------------------------------------------- items
export function affixValue(a, ilvl, rarity, roll = Math.random()) {
  const base = a.min + (a.max - a.min) * roll;
  const v = base * (1 + ilvl * a.sc) * RARITY[rarity].mult;
  return a.min >= 1 && a.max <= 2 && a.sc === 0 ? Math.round(base) : Math.max(1, Math.round(v));
}

function rollAffixes(item, count) {
  const letter = SLOT_LETTER[item.slot];
  const pool = AFFIXES.filter((a) => a.slots.includes(letter) && (a.minRarity || 0) <= item.rarity && !item.affixes.some((x) => x.s === a.s));
  for (let i = 0; i < count && pool.length; i++) {
    const a = weighted(pool.map((p) => [p, p.w ?? 1]));
    pool.splice(pool.indexOf(a), 1);
    item.affixes.push({ s: a.s, v: affixValue(a, item.ilvl, item.rarity) });
  }
}

export function rollRarity(mf = 0, bonus = 0) {
  const m = 1 + mf / 100;
  return weighted(RARITY.map((r) => [r.id, r.id === 0 ? r.weight / (1 + bonus) : r.weight * m * (1 + bonus * r.id)]));
}

const EPIC_A = ['Doom', 'Soul', 'Blood', 'Grim', 'Storm', 'Night', 'Wrath', 'Bone', 'Dread', 'Ember', 'Frost', 'Shadow', 'Hell', 'Star', 'Void', 'Rune', 'Gore', 'Plague', 'Dawn', 'Ash'];
const EPIC_B = ['bringer', 'reaver', 'fang', 'song', 'ward', 'call', 'bane', 'shard', 'heart', 'grasp', 'veil', 'brand', 'mourn', 'fall', 'spire', 'maw', 'crest', 'thorn', 'whisper', 'edge'];

export function rollItem(ilvl, opts = {}) {
  ilvl = Math.max(1, Math.round(ilvl));
  const slot = opts.slot || pick(['weapon', 'weapon', 'offhand', 'head', 'body', 'hands', 'legs', 'feet', 'ring', 'ring']);
  const rarity = opts.rarity ?? rollRarity(opts.mf || 0, opts.bonus || 0);
  const tier = tierOf(ilvl);
  const item = { uid: newUid(), type: 'gear', slot, rarity, ilvl, tier, upg: 0, affixes: [], gems: [], sockets: 0 };
  const art = opts.generic || slot === 'ring' ? null : classItem(slot, rarity, opts.base);
  if (art) opts = { ...opts, base: art.base };
  if (slot === 'weapon') {
    item.base = opts.base || pick(Object.keys(WEAPONS));
    const W = WEAPONS[item.base];
    const avg = 3.4 * Math.pow(1.052, ilvl - 1) * W.dmg * (1 + ilvl * 0.012);
    item.dmg = [Math.max(1, Math.round(avg * 0.75)), Math.max(2, Math.round(avg * 1.25))];
    item.icon = W.icon;
    item.baseName = W.names[Math.min(4, Math.floor(tier / 2))];
    if (W.crit) item.affixes.push({ s: 'critChance', v: W.crit, implicit: true });
    if (W.cast) item.affixes.push({ s: 'castSpeed', v: W.cast, implicit: true });
  } else if (slot === 'offhand') {
    item.base = opts.base || pick(Object.keys(OFFHANDS));
    const O = OFFHANDS[item.base];
    item.armor = Math.round(6 * O.armor * Math.pow(1.045, ilvl - 1) * (0.85 + Math.random() * 0.3));
    item.icon = O.icon;
    item.baseName = O.names[Math.min(4, Math.floor(tier / 2))];
    if (O.block) item.affixes.push({ s: 'block', v: randi(O.block[0], O.block[1]), implicit: true });
    if (O.spell) item.affixes.push({ s: 'dmgPct', v: randi(O.spell[0], O.spell[1]) + Math.floor(ilvl / 10), implicit: true });
  } else if (slot === 'ring') {
    item.base = 'ring'; item.icon = 'ring';
    item.baseName = RING_NAMES[tier];
    item.aug = rollAugments(rarity, ilvl, ringCtx.classId, ringCtx.learned || {});
  } else {
    item.base = slot;
    const A = ARMORS[slot];
    item.armor = Math.round(6 * A.armor * Math.pow(1.045, ilvl - 1) * (0.85 + Math.random() * 0.3));
    item.icon = A.icon;
    item.baseName = A.names[Math.min(4, Math.floor(tier / 2))];
  }
  const R = RARITY[rarity];
  rollAffixes(item, randi(R.affixes[0], R.affixes[1]));
  item.maxSockets = slot === 'ring' ? [0, 0, 1, 1, 2, 2][rarity] : R.sockets;
  item.sockets = Math.min(item.maxSockets, chance(0.45) ? randi(0, Math.ceil(item.maxSockets / 2)) : 0);
  if (rarity >= 4) item.legendary = pick(Object.keys(LEGENDARY));
  if (rarity >= 3) item.title = pick(EPIC_A) + pick(EPIC_B);
  if (art) Object.assign(item, { art: art.id, artCls: art.cls, uname: art.name });
  else if (slot === 'ring') item.rname = ringName(item);
  else if (rarity >= 1) {
    const pre = item.affixes.find((a) => !a.implicit && AFFIX_BY_STAT[a.s].pre);
    const suf = item.affixes.find((a) => !a.implicit && AFFIX_BY_STAT[a.s].suf);
    item.pre = pre ? AFFIX_BY_STAT[pre.s].pre : null;
    item.suf = rarity >= 2 && suf ? AFFIX_BY_STAT[suf.s].suf : (suf && !pre ? AFFIX_BY_STAT[suf.s].suf : null);
  }
  item.req = Math.max(1, Math.floor(ilvl * 0.8));
  if (opts.unid) item.unid = true;
  return item;
}

// ---------------------------------------------------------------- rings
// rollItem rolls a ring's augments for the hero who plays now (game.startChar sets this): their class, and their
// learned skills, which rings favour.
let ringCtx = {};
export function setRingContext(classId, learned) { ringCtx = { classId, learned }; }
/** What an augment targets, for names and tooltips: a skill's name, "Orbit skills" or "all skills". */
export function augTarget(a) {
  if (a.sk) return SKILLS[a.sk] ? SKILLS[a.sk].name : 'a lost skill';
  if (a.kind) return `${KIND_NAMES[a.kind] || a.kind} skills`;
  return 'all skills';
}
function ringName(item) {
  const a = item.aug[0];
  if (!a) return item.baseName;
  return `${AUGMENTS[a.id].word} ${item.baseName} of ${augTarget(a)}`;
}

export function itemName(item) {
  if (item.type === 'gem') return gemName(item.gem, item.tier);
  if (item.type === 'potion') return item.name;
  if (item.rname) return item.rname + (item.upg ? ` +${item.upg}` : '');
  if (item.uname) return item.uname + (item.upg ? ` +${item.upg}` : '');
  const base = `${MATERIALS[item.tier].name} ${item.baseName}`;
  const upg = item.upg ? ` +${item.upg}` : '';
  if (item.rarity >= 3) return `${item.title}${upg}`;
  return `${item.pre ? item.pre + ' ' : ''}${base}${item.suf ? ' ' + item.suf : ''}${upg}`;
}
export function itemBaseLine(item) {
  if (item.type !== 'gear') return '';
  if (item.slot === 'ring') return item.baseName;
  return `${MATERIALS[item.tier].name} ${item.baseName}`;
}
export function itemColor(item) {
  if (item.type === 'gem') return GEMS[item.gem].special ? '#ff9a2a' : '#c8f0ff';
  if (item.type === 'potion') return '#ffffff';
  return RARITY[item.rarity].color;
}

export const upgMult = (item) => 1 + (item.upg || 0) * 0.1;

/** All stat contributions of an item as [stat, value] pairs (excluding base dmg/armor). */
export function itemStats(item) {
  const out = [];
  if (item.type !== 'gear') return out;
  const am = 1 + (item.upg || 0) * 0.04;
  for (const a of item.affixes) out.push([a.s, Math.round(a.v * (a.implicit ? 1 : am) * 10) / 10]);
  for (const g of item.gems) for (const s of gemStats(g.gem, g.tier)) out.push(s);
  if (item.legendary && LEGENDARY[item.legendary].stats) for (const s of LEGENDARY[item.legendary].stats) out.push(s);
  return out;
}

export function itemDmg(item) {
  const m = upgMult(item);
  return [Math.round(item.dmg[0] * m), Math.round(item.dmg[1] * m)];
}
export function itemArmor(item) { return Math.round((item.armor || 0) * upgMult(item)); }

export function itemValue(item) {
  if (item.type === 'gem') return Math.round((GEMS[item.gem].special ? 400 : 60) * Math.pow(2.6, item.tier));
  const base = 12 * Math.pow(1.06, item.ilvl) * [1, 2.5, 6, 15, 40, 100][item.rarity];
  return Math.round(base * (1 + item.affixes.length * 0.15) * (1 + item.sockets * 0.2) * (1 + (item.upg || 0) * 0.3));
}

export function upgradeCost(item) { return Math.round(60 * Math.pow(1.06, item.ilvl) * Math.pow(1.7, item.upg || 0) * (1 + item.rarity * 0.5)); }
export function socketCost(item) { return Math.round(150 * Math.pow(1.05, item.ilvl) * Math.pow(2, item.sockets) * (1 + item.rarity * 0.3)); }
export function enchantCost(item, add) { return Math.round((add ? 400 : 180) * Math.pow(1.055, item.ilvl) * (1 + item.rarity * 0.6)); }
export function unsocketCost(item) { return Math.round(50 * Math.pow(1.04, item.ilvl)); }

export function rerollAffixes(item) {
  const keep = item.affixes.filter((a) => a.implicit);
  const n = item.affixes.length - keep.length;
  item.affixes = keep;
  rollAffixes(item, Math.max(1, n));
}
export function addAffix(item) {
  const R = RARITY[item.rarity];
  const n = item.affixes.filter((a) => !a.implicit).length;
  if (n >= R.affixes[1] + 1) return false;
  rollAffixes(item, 1);
  return true;
}

export function statLabel(s, v, classTrees) {
  const a = AFFIX_BY_STAT[s];
  const special = {
    extraProj: `+${v} Projectile${v > 1 ? 's' : ''}`, echoChance: `${v}% chance to Echo-cast skills`, splitChance: `${v}% chance for projectiles to split`,
    orbitOnCast: `${v}% chance on cast to spawn an orbiting orb`, novaOnCast: `${v}% chance on cast to release a nova`,
    chainPlus: `+${v} Chain / Bounce`, pierce: `+${v} Pierce`, homing: 'Projectiles seek enemies', lifePct: `${v > 0 ? '+' : ''}${v}% Maximum Life`,
    summonPct: `+${v}% Summon Damage & Life`,
  };
  if (special[s]) return special[s];
  if (!a) return `${s}: ${v}`;
  let t = a.t.replace('{v}', v);
  if (classTrees) t = t.replace('{tree0}', classTrees[0]).replace('{tree1}', classTrees[1]).replace('{tree2}', classTrees[2]);
  return t;
}

export function potionItem(kind) {
  const P = {
    hp: { name: 'Healing Potion', color: 'red' }, mp: { name: 'Mana Potion', color: 'blue' },
    rejuv: { name: 'Rejuvenation Potion', color: 'purple' }, fury: { name: 'Elixir of Fury', color: 'orange' },
  }[kind];
  return { uid: newUid(), type: 'potion', kind, name: P.name, color: P.color };
}
export const POTION_PRICE = { hp: 25, mp: 25, rejuv: 120, fury: 200 };
export const POTION_INFO = {
  hp: 'Restores 45% Life over 2 seconds.',
  mp: 'Restores 50% Mana over 2 seconds.',
  rejuv: 'Instantly restores 35% Life and Mana.',
  fury: '+30% Damage and Attack Speed for 15 seconds.',
};
