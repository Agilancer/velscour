// ACT III (docs/PHOBOS.md): Bellmourn, City State Phobos and Castle Velscour. The art is the user's two packs
// (Bellmourn_Phobos_230_Characters.zip, Velscour_Keep_Castle_and_Grand_Finale.zip), cut by heat map with
// tools/phobospack.py into phobos/<folder> atlases; the roster it writes (data/phobosroster.js) becomes bestiary entries
// here. They are a faction of their own like the Depth's Edge creatures: never in another level's random looks
// (bestiary.js artPool/bossPool skip `phobos`), and Act III levels field nothing else.
import { PHOBOS_ROSTER } from './phobosroster.js';
import { HORRORS_ROSTER } from './horrorsroster.js';

// ---------------------------------------------------------------------------------------------- the bestiary
const RULES = [   // first match wins: the AI archetype a figure plays, read off its name and concept
  ['archer', /\b(bow|crossbow|arbalest|archer|sniper|quarrel|longbow|bolt|musket|sling)/],
  ['cultist', /(mage|sorcer|wizard|necroman|warlock|witch|priest|abbot|vicar|sister|chaplain|hierophant|cantor|scribe|librar|lector|astrolog|alchem|seer|oracle|mystic|deacon|bishop|monk|hymn|chancellor|regent|elector|census|doctor|liturg|summon|invoker|conjur|hex|sage|archivist|chorist|choir)/],
  ['wraith', /(wraith|ghost|spectre|specter|shade|phantom|banshee|wisp|veil|mourner|pall|shroud|apparition|revenant|haunt|eclipse|shadow)/],
  ['spider', /(spider|weaver|arachn|moth|widow|crawler)/],
  ['worm', /(worm|eel|maw|serpent|leech|leviathan|lamprey|tongue)/],
  ['gargoyle', /(gargoyle|wing|harpy|bat\b|drake|wyvern|griffin|raven|crow)/],
  ['hound', /(hound|dog|wolf|mastiff|cat\b|rat\b|boar|beast|ox\b|stag|bear|hyena|jackal)/],
  ['golem', /(golem|construct|automaton|clockwork|colossus|statue|mantle|engine|siege|bell|dredge|anvil|furnace|cage|crown that)/],
  ['elemental', /(ember|flame|storm|cinder|blaze|spark|brazier|fire|lightning|wind|ash\b)/],
  ['shroom', /(fung|spore|bloom|thorn|vine|rose|briar|root|orchid|moss|lily)/],
  ['eye', /\beye/],
  ['skeleton', /(skeleton|bone|ossu|skull|marrow|rattle|casket|crypt|charnel|grave)/],
  ['zombie', /(zombie|drowned|corpse|rot|plague|ghoul|unburied|carrion)/],
  ['abomination', /(abomin|flesh|glutton|feast|butcher|hulk|brute|horror|amalgam|thing)/],
  ['demon', /(demon|fiend|devil|imp\b)/],
];
const ALSO = { knight: ['skeleton'], cultist: ['wraith'], archer: ['knight'], golem: ['knight'], abomination: ['zombie'], hound: ['ghoul'], wraith: ['cultist'] };
function archOf(r) {
  const s = (r.name + ' ' + r.concept).toLowerCase();
  for (const [a, re] of RULES) if (re.test(s)) return a;
  return r.cat === 'creature' ? 'abomination' : 'knight';
}
const ELS = [['fire', /(ember|flame|cinder|brazier|forge|blaze|ash|soot|kiln)/], ['cold', /(frost|rime|ice|winter|snow)/], ['light', /(storm|spark|lightning|thunder|gale)/],
  ['poison', /(plague|rot|spore|venom|moth|bile)/], ['shadow', /(shadow|eclipse|void|night|veil|umbra)/], ['holy', /(sanct|chapel|saint|holy|candle|hymn)/], ['arcane', /(library|stack|book|rune|mirror|gilt)/]];
const elOf = (r) => { const s = (r.name + ' ' + r.concept + ' ' + r.at).toLowerCase(); for (const [e, re] of ELS) if (re.test(s)) return e; return null; };
const UNDEAD = /(bone|skelet|crypt|charnel|grave|ossu|lich|wraith|ghost|drowned|corpse|unburied|rattle|casket|pall|marrow)/;
// in-game heights (world px): folk a little under a hero, knights a hero's height, creatures by their build, bosses big
// (matched by eye against the hero and the older painted sets: tools/tests/phobos_lineup.js; townsfolk stand as tall as
// the NPC villagers so a resident who turns keeps his size; bosses as tall as the other sets' bosses, 82-92)
const H = { gray: 58, good: 58, ward: 58, castle: 58, knight: 60, creature: 54, ward_boss: 82, castle_boss: 86, finale: 84, horror: 58 };
// creatures by what they are: vermin small, beasts of burden and titans big
const BIG = /(titan|colossus|behemoth|giant|leviathan|ox|stag|hulk|golem|wyrm|drake|dragon|bull|elephant|mammoth|brute|ogre|troll|juggernaut|siege|wheel)/i;
const SMALL = /(rat|louse|beetle|mole|imp|gecko|moth|homunculus|swarm|eel|larva|mite|tick|crab|toad|slug|bat|leech|fly|wasp|snail|grub|maggot|skink|newt)/i;
const sizeOf = (r) => r.cat !== 'creature' ? H[r.cat] : BIG.test(r.name) ? 68 : SMALL.test(r.name) ? 42 : H.creature;
const FORM_H = [84, 94, 104, 112];   // Lord Velscour's four forms (the pack's 1.0x / 1.8x / 3.4x / 6.5x, tamed for the screen)

const PACK_ART = PHOBOS_ROSTER.map((r) => {
  const arch = archOf(r), wide = r.aspect < 0.95, form = r.cat === 'finale' ? (+r.id.split('_')[2] - 1) : -1;
  const e = {
    id: 'phx_' + r.id, sheet: r.sheet, i: r.i, arch, name: r.name.split(' — ')[0], title: r.name.split(' — ')[1] || '',
    h: form >= 0 ? FORM_H[form] : Math.round(sizeOf(r) * (r.cat === 'creature' && wide ? 0.85 : 1)),
    phobos: true, cat: r.cat, at: r.at, does: r.does, trigger: r.trigger, counter: r.counter, livery: r.livery,
    undead: UNDEAD.test((r.name + ' ' + r.concept).toLowerCase()), gore: /bone|skelet|ossu/.test(r.name.toLowerCase()) ? 'bone' : 'flesh', demon: form >= 1,
  };
  if (ALSO[arch]) e.also = ALSO[arch];
  const el = elOf(r); if (el) e.el = el;
  if (r.cat === 'ward_boss' || r.cat === 'castle_boss' || r.cat === 'finale') { e.boss = true; e.lone = true; }
  if (form >= 0) e.form = form;
  return e;
});

// The Dungeon Horrors (VELSCOUR_Dungeon_Horrors_130_Sprites.zip, tools/horrorspack.py, data/horrorsroster.js): 100
// humanoid horrors in ten dungeon themes and 30 bosses, native pixel art stored 1:1. They hold the districts and wings
// their themes suit (below). Heights follow the art's own pixel heights so every horror keeps one pixel density: the
// 104-121 px horrors stand 54-63 (a hero is 60), the 228-288 px bosses 82-92 like the other sets' bosses.
const HORROR_RULES = [   // first match on the name wins; else the theme's
  ['archer', /(arbalist|quiver)/],
  ['knight', /(captain|mutineer|bully|musterling|recruit|officer|standard|footman|knight|duelist|fencer|courtier|usher|marshal|general|trumpeter|turnkey|watchman|gaoler|governor|warden|pavise)/],
  ['cultist', /(chanter|scribe|cantor|clerk|chorister|priest|vicar|deacon|acolyte|sacristan|sexton|confessor|prophet|occultist|hermit|harper|monk|apothecary|anatomist|distiller|surgeon|midwife|abbot|interrogator|inquisitor|mortician|tallyman|ledger|penitent|sacrist|saint|keeper of the twelfth|page)/],
  ['wraith', /(mourner|poltergeist|shadow|inward eyes|custodian|lantern that|reflected)/],
  ['shroom', /(spore|mycel|truffle|cordyceps|puffball|gill|rootweft|sporocarp|orchard)/],
  ['golem', /(mason|lintel|cantilever|beam|keystone|cairn|pulley|chalk|plaster|surveyor|marauder|kiln|reliquary|iron mercy|rack|cradle|facet)/],
  ['zombie', /(drowned|waterlogged|sluice|brine|sinner|pilgrim|prisoner|inmate|beggar|vagrant|fugitive|husk|deluge|bride|undertaker)/],
  ['abomination', /(harrower|porter|pallbearer|hand|knuckle|torturer|carrier|cranium|wrestler|bellows|brazier|lung|altar|matron|servant|attendant|host|heretic|bellhand)/],
];
const HORROR_THEME = { 'Charnel Vaults': ['zombie', null], 'Flooded Crypts': ['zombie', 'cold'], 'Gaols and Oubliettes': ['knight', null], Sacristies: ['cultist', 'fire'],
  'Abandoned Barracks': ['knight', null], 'Fungal Passages': ['shroom', 'poison'], 'Alchemist Cellars': ['cultist', 'poison'], 'Glass and Mirror Halls': ['wraith', 'arcane'],
  'Collapsed Masonry': ['golem', null], 'Sealed Sanctuaries': ['cultist', 'shadow'], 'Charnel and Drowned Bosses': ['abomination', null],
  'Gaol and Barracks Bosses': ['knight', null], 'Fungal and Occult Bosses': ['cultist', 'shadow'] };
const HORROR_ELS = [['fire', /(kiln|brazier|soot|censer|tallow|wax|incense|lantern|crucible)/], ['cold', /(brine|drown|flood|sluice|cistern|canal|wet |deluge|water|eel)/],
  ['poison', /(spore|mycel|fung|verdigris|flask|vessel|retort|filter|distill|blister)/], ['shadow', /(shadow|night|black|inward|hood|ink)/],
  ['arcane', /(mirror|glass|prism|facet|refract|foil|reflect|ledger|scribe)/], ['holy', /(hymn|mitre|vestment|saint|reliquary|votive|toll|abbot)/]];
const HORROR_ALSO = { abomination: ['zombie'], cultist: ['wraith'], golem: ['knight'], knight: ['skeleton'], zombie: ['ghoul'], archer: ['knight'], wraith: ['cultist'] };
const horrorH = (r) => r.kind === 'boss' ? Math.round(82 + (r.ap - 228) / 6) : Math.round(H.horror * r.ap / 112);
const HORROR_ART = HORRORS_ROSTER.map((r) => {
  const n = r.name.toLowerCase(), boss = r.kind === 'boss', [tArch, tEl] = HORROR_THEME[r.theme] || ['abomination', null];
  const arch = (HORROR_RULES.find(([, re]) => re.test(n)) || [tArch])[0];
  const el = (HORROR_ELS.find(([, re]) => re.test(n)) || [tEl])[0];
  const e = { id: 'phx_' + r.id, sheet: r.sheet, i: r.i, arch, name: r.name, title: '', h: horrorH(r), phobos: true, horror: true,
    cat: boss ? 'horror_boss' : 'horror', at: r.theme, does: '', trigger: '', counter: '', livery: '',
    undead: /^(Charnel Vaults|Flooded Crypts)$/.test(r.theme) || UNDEAD.test(n), gore: /(bone|rib|spine|marrow|mandible|skelet)/.test(n) ? 'bone' : 'flesh' };
  if (HORROR_ALSO[arch]) e.also = HORROR_ALSO[arch];
  if (el) e.el = el;
  if (boss) { e.boss = true; e.lone = true; }
  return e;
});
export const PHOBOS_ART = [...PACK_ART, ...HORROR_ART];
export const PHOBOS_BY_ID = Object.fromEntries(PHOBOS_ART.map((a) => [a.id, a]));
const of = (cat, at) => PHOBOS_ART.filter((a) => a.cat === cat && (!at || (at instanceof RegExp ? at.test(a.at) : a.at === at)));
export const PHOBOS_FOLK = PHOBOS_ART.filter((a) => a.cat === 'gray' || a.cat === 'good');

// ---------------------------------------------------------------------------------------------- the city's wards
// The walled city (PHOBOS-LAYOUT.md): eleven districts west to east, poor and low to rich and high. lv: levels over the
// city's base. foes: the ward hostiles and Velscour's own who hold it; bosses: its world bosses (the ward bosses);
// folk: who lives there (gray residents start peaceable; a struck one turns); hub: a safe house with a quest giver.
const W = (re) => of('ward', re), WB = (re) => of('ward_boss', re), C = (re) => of('castle', re), K = (re) => of('knight', re), F = (re) => PHOBOS_FOLK.filter((a) => re.test(a.at));
const half = (a, k) => a.filter((_, i) => (i < a.length / 2) === !k);
// the Dungeon Horrors by theme (HX) or name (HN), and their bosses by name (HB)
const HX = (re) => HORROR_ART.filter((a) => !a.boss && re.test(a.at)), HN = (re) => HORROR_ART.filter((a) => !a.boss && re.test(a.name));
const HB = (...names) => names.map((n) => HORROR_ART.find((a) => a.boss && a.name.includes(n)));
export const DISTRICTS = [
  { id: 'barbican', name: 'The Barbican', lv: 0, ground: 'wall', verb: 'Storm the killing ground and lower the drawbridge from the winch-house.', foes: [...W(/Guard Tower/), ...half(C(/Castle Approach/), 0), ...half(HX(/Masonry/), 0)], bosses: [...half(WB(/Guard Tower/), 0).slice(0, 2), ...HB('Breathing Lintel')], folk: [] },
  { id: 'cinder', name: 'The Cinder Quarter', lv: 2, ground: 'cinder', verb: 'Pick your footing: the burnt floors give way and the embers flare.', foes: [...half(W(/Rookeries/), 0), ...half(HX(/Masonry/), 1)], bosses: [WB(/Rookeries/)[5], WB(/Rookeries/)[8], ...HB('Kiln Without')], folk: F(/Ash Lane/), hub: 'pennyless' },
  { id: 'rookeries', name: 'The Rookeries', lv: 3, ground: 'slums', verb: 'Chase the roof-runners through tenements no cart can pass.', foes: [...W(/Rookeries/), ...half(HX(/Fungal/), 0)], bosses: [WB(/Rookeries/)[2], WB(/Rookeries/)[9], WB(/Rookeries/)[4], ...HB('End of the Corridor')], folk: F(/^The Rookeries$/) },
  { id: 'chainmarket', name: 'Chainmarket', lv: 5, ground: 'city', verb: 'Time the watch changes and cut the prisoners down.', foes: [...W(/Guard Tower/), ...half(C(/Castle Approach/), 1), ...HX(/Gaols/)], bosses: [WB(/Guard Tower/)[0], WB(/Guard Tower/)[8], ...HB('Bent Keys')], folk: F(/^Chainmarket$/) },
  { id: 'wharf', name: 'The Drowned Wharf', lv: 7, ground: 'slums', verb: 'Raise the sunk boats with the great sluice wheel.', foes: [...half(W(/Guard Tower/), 1), ...HX(/Flooded/)], bosses: [WB(/Guard Tower/)[2], WB(/Guard Tower/)[5], WB(/Guard Tower/)[7], ...HB('Ten Floodgates')], folk: F(/Wharf/).slice(5) },
  { id: 'tanners', name: "The Tanners' Steps", lv: 7, ground: 'slums', verb: 'Climb the stepped lanes under the dye-vat ambushes.', foes: [...half(W(/Guard Tower/), 0), ...half(W(/Rookeries/), 1), ...half(HX(/Fungal/), 1), ...half(HX(/Alchemist/), 0)], bosses: [WB(/Guard Tower/)[9], WB(/Guard Tower/)[4], ...HB('Orchard Under')], folk: [...F(/Wharf/).slice(0, 5), ...F(/Dye works/)], hub: 'quietwatch' },
  { id: 'boneyards', name: 'The Bone Yards', lv: 9, ground: 'bones', verb: 'The dead rise by rows: break each row\'s marker to still it.', foes: [...W(/Bone Yards/), ...HX(/Charnel/)], bosses: [...WB(/Bone Yards/).slice(0, 4), ...HB('Third Pallbearer')], folk: F(/charnel/), hub: 'ashwardens' },
  { id: 'barracks', name: 'The Barracks Ward', lv: 11, ground: 'city', verb: 'Keep out of the lantern light, or the curfew alarm pulls the patrol.', foes: [...C(/Armoury/), ...K(/Castle Gate/).slice(0, 5), ...HX(/Barracks/)], bosses: [WB(/Guard Tower/)[1], WB(/Guard Tower/)[6], WB(/Bone Yards/)[6], ...HB('Split-Plate')], folk: F(/Barracks/).slice(0, 5) },
  { id: 'mages', name: "The Mages' Rise", lv: 15, ground: 'rich', verb: 'Find and break each house\'s ward anchor.', foes: [...half(W(/Rookeries/), 1), ...C(/Ancient Library/).slice(0, 5), ...HX(/Alchemist/), ...half(HX(/Sealed Sanctuaries/), 0)], bosses: [WB(/Rookeries/)[0], WB(/Rookeries/)[1], WB(/Rookeries/)[6], WB(/Rookeries/)[7], ...HB('High Mirror')], folk: F(/Mages/) },
  { id: 'dukes', name: "Dukes' Row", lv: 15, ground: 'rich', verb: 'Walled gardens and guard dogs: the heist district.', foes: [...C(/Great Hall/), ...K(/Castle Gate/).slice(5), ...HX(/Glass/)], bosses: [WB(/Rookeries/)[3], WB(/Bone Yards/)[4], WB(/Bone Yards/)[9], ...HB('Glass Wound')], folk: F(/Dukes/).slice(5) },
  { id: 'approach', name: 'The Castle Approach', lv: 19, ground: 'wall', verb: 'The switchback under arrow fire, to the Castle Gate.', foes: [...C(/Castle Approach/), ...K(/Castle Gate/), ...half(HX(/Barracks/), 1)], bosses: [WB(/Bone Yards/)[5], WB(/Bone Yards/)[7], WB(/Guard Tower/)[3], ...HB('Last Trumpeter')], folk: [] },
];
export const HUBS = {
  pennyless: { name: 'The Pennyless', where: 'under a burnt chandlery in the Cinder Quarter', giver: F(/Ash Lane/)[0] },
  quietwatch: { name: 'The Quiet Watch', where: "behind a dye works on the Tanners' Steps", giver: F(/Dye works/)[0] },
  ashwardens: { name: 'The Ashwardens', where: 'walled into a charnel house at the north tip', giver: F(/charnel/)[0] },
};

// ---------------------------------------------------------------------------------------------- Castle Velscour
// A hundred floors in ten wings, climbing from the Lower Ward to the Throne Above. Every floor is an authored kind of
// level (world/castlevelscour.js LAYOUTS); every fifth has a guardian (a castle boss), every tenth a raid boss
// (game/phobosraids.js), and the hundredth is Lord Velscour. A wing's first floor is a waypoint once reached.
// biome: the Phobos-textured biome pack its walls wear (data/phobosbiomes.js), with a fallback; sheer: towers and
// bridges over the void (data/sheer.js) instead of walls; livery: the palette Velscour's own wear there.
export const WINGS = [
  { id: 'gatehouse', name: 'The Lower Ward Gatehouse', biome: 'ph_wall', base: 'castle_keep', layouts: ['gatehouse', 'yard', 'barracks', 'arena', 'stairwell'], foes: [...K(/Castle Gate/), ...C(/Castle Approach/), ...HX(/Barracks/)], lords: HB('Pavise Unmade', 'Quiverback'), livery: 'red', boss: 'latch' },
  { id: 'oubliettes', name: "The Oubliettes and Generals' Crypt", biome: 'ph_bones', base: 'catacombs', layouts: ['pits', 'crypt', 'cells', 'pits', 'crypt'], foes: [...of('creature', /Oubliette|Crypt/), ...C(/Oubliettes/), ...HX(/Gaols|Charnel/)], lords: HB('Upside-Down Cistern', 'Rack That'), livery: 'white', boss: 'elector' },
  { id: 'armoury', name: 'The Armoury and the Forge', biome: 'ph_castle', base: 'castle_keep', layouts: ['forge', 'arena', 'barracks', 'forge', 'yard'], foes: [...K(/Castle Forge/), ...of('creature', /Armoury/), ...C(/Armoury/), ...HX(/Masonry/)], lords: HB('Iron Mercy', 'Oath-Brand'), livery: 'grey', boss: 'armourer' },
  { id: 'greathall', name: 'The Great Hall and Kitchens', biome: 'ph_rich', base: 'castle_keep', layouts: ['greathall', 'arena', 'kitchens', 'greathall', 'colosseum'], foes: [...of('creature', /Great Hall/), ...C(/Great Hall/), ...HX(/Glass/)], lords: HB('Altar Beneath'), livery: 'mixed', boss: 'banquet' },
  { id: 'library', name: 'The Ancient Library', biome: 'ph_castle', base: 'library', layouts: ['library', 'stacks', 'library', 'stairwell', 'stacks'], foes: [...K(/Castle Library/), ...of('creature', /Castle Library/), ...C(/Ancient Library/), ...HN(/Scribe|Ledger|Page|Tallyman|Clerk|Ink-Faced|Surveyor|Mortician|Hermit/), ...HX(/Alchemist/)], lords: HB('Drowned Regent'), livery: 'blue', boss: 'regent' },
  { id: 'menagerie', name: 'The Menagerie and the Drowned Conservatory', biome: 'ph_sewers', base: 'sewers', layouts: ['sewers', 'cages', 'sewers', 'aqueduct', 'cages'], foes: [...of('creature', /Conservatory|Menagerie/), ...HX(/Fungal|Flooded/)], lords: HB('Deluge Undertaker', 'Spore Bell'), livery: 'green', boss: 'pennants' },
  { id: 'sanctuaries', name: 'The Sanctuaries and the Ossuary Chapel', biome: 'ph_bones', base: 'cathedral', layouts: ['cathedral', 'nave', 'cathedral', 'crypt', 'nave'], foes: [...of('creature', /Sanctuaries/), ...C(/Sanctuaries/), ...HX(/Sacristies|Sealed Sanctuaries/), ...HN(/Bone|Rib|Spine|Mourner|Shroud/)], lords: HB('Reliquary That', 'Hollow-Headed', 'Twelfth Toll'), livery: 'white', boss: 'chancellor' },
  { id: 'stormspire', name: 'The Ember and Storm Spires', biome: 'ph_keep', base: 'castle_keep', sheer: 'sheer_gilded', layouts: ['bridges', 'outerstair', 'bridges', 'leaps', 'outerstair'], foes: [...K(/Keep Ember/), ...of('creature', /Ember Spire|Storm Spire|Air Bridges/), ...HN(/Brazier|Soot|Bellows|Censer|Kiln|Lintel|Keystone|Cantilever|Pulley|Cairn/)], lords: HB('Lantern That', 'False Angles'), livery: 'blue', boss: 'windward' },
  { id: 'bonespire', name: 'The Bone, Blood and Shadow Spires', biome: 'ph_keep', base: 'castle_keep', sheer: 'sheer_ossuary', layouts: ['outerstair', 'leaps', 'bridges', 'outerstair', 'leaps'], foes: [...K(/Keep Bone|Keep Blood/), ...of('creature', /Bone Spire|Blood Spire|Shadow Spire/), ...HN(/Bone|Rib|Spine|Mandible|Sternum|Torturer|Interrogator|Inquisitor|Tendon|Knuckle/)], lords: HB('Bone Loom', 'Black Stair'), livery: 'white', boss: 'eclipse' },
  { id: 'throne', name: "Velscour's Keep: the Throne Above", biome: 'ph_keep', base: 'castle_keep', layouts: ['antechamber', 'nave', 'colosseum', 'antechamber', 'gatehouse'], foes: [...of('creature', /Throne Antechambers/), ...C(/High Ward/), ...HN(/Crowned|Courtier|Usher|Footman|Duelist|Glaze Knight|Custodian|Servitor/)], lords: HB('Inward-Facing', 'Sealed Gaol'), livery: 'mixed', boss: 'velscour' },
];
export const CASTLE_FLOORS = 100;
export const wingOf = (floor) => WINGS[Math.min(WINGS.length - 1, Math.floor((floor - 1) / 10))];
/** A wing's own lords (the Dungeon Horrors' bosses, `lords`) hold its 3rd, 8th, 6th and 1st floors in that order; the
 * other captains' floors keep a captain drawn from the wing's foes. */
const LORD_FLOORS = [3, 8, 6, 1];
export const wingLordFor = (floor) => { const k = LORD_FLOORS.indexOf(floor % 10); return k >= 0 ? (wingOf(floor).lords || [])[k] || null : null; };
/** The effective depth a castle floor scales its monsters to (data/depth.js depthLevel): Act III's 240 to the throne's 500. */
export const castleDepth = (floor) => Math.min(500, 236 + Math.round(floor * 2.64));
/** The city's effective depth: Act III's opening, its districts a little deeper the further east. */
export const cityDepth = (lv = 0) => 206 + lv * 1.5;
/** A guardian of every fifth floor that is not a raid: the twenty castle bosses, two to a wing. */
export const GUARDIANS = of('castle_boss');
export const guardianFor = (floor) => GUARDIANS[(Math.floor(floor / 5) * 7 + 3) % GUARDIANS.length];
export const FINALE = {
  crimson: { name: 'The Crimson Dynasty', forms: PHOBOS_ART.filter((a) => a.form >= 0 && a.sheet.endsWith('crimson')).sort((a, b) => a.form - b.form).map((a) => a.id) },
  obsidian: { name: 'The Obsidian Eclipse', forms: PHOBOS_ART.filter((a) => a.form >= 0 && a.sheet.endsWith('obsidian')).sort((a, b) => a.form - b.form).map((a) => a.id) },
  cathedral: { name: 'The Cathedral of Ruin', forms: PHOBOS_ART.filter((a) => a.form >= 0 && a.sheet.endsWith('cathedral')).sort((a, b) => a.form - b.form).map((a) => a.id) },
};
export const FORM_NAMES = ['Lord Velscour', 'Demon Lord Velscour', 'Velscour, the Alpha Being', 'Velscour Omega, Destroyer of Worlds'];

// Where each floor stands, after Bellmourn's layout bible (bm-phobos docs/PHOBOS-LAYOUT.md, "Castle Velscour" and
// "Velscour's Keep"): five places per wing, two floors each; the Keep's crossings between spires are bridges, its
// outside ledges the outer stair. The bible's world and crossing bosses guard their floors.
export const PLACES = {
  gatehouse: ["The Gatehouse: the Captain's yard", 'The Drill Floor', 'The Barracks', "The Servants' Warren", 'The Gate Captain\'s Walk'],
  oubliettes: ['The Oubliettes: the pit stair', "The Generals' Crypt", 'The Pit Stair', 'The Crypt Door', 'The Aqueduct'],
  armoury: ['The Armoury', "The Forge: the idol's mould", "The Quartermaster's Stores", 'The Great Bellows', "The Servants' Warren"],
  greathall: ['The Great Hall: the long table', 'The Kitchens: the Great Hearth', 'The Portrait Gallery', 'The Horn Galleries', 'The Map Room'],
  library: ['The Ancient Library', 'The Drowned Archive', 'The Map Room', "The Alchemists' Wing: the still room", 'The Clock Tower: the gear shaft'],
  menagerie: ['The Menagerie: the cage rows', 'The Conservatory', 'The Sunk Garden', 'The Aqueduct Fall', 'The Menagerie of Chains'],
  sanctuaries: ['The Sanctuaries: the black nave', 'The Ossuary Chapel', 'The Hall of Mirrors', 'The Treasury', 'The Observatory'],
  stormspire: ['The Ember Spire: the outside ledges', 'The Storm Bridge (a crossing)', 'The Storm Spire: the outside ledges', 'The Ossein Stair (a crossing)', "The Storm Spire's head"],
  bonespire: ['The Bone Spire: the marrow shaft', 'The Gloam Balconies (a crossing)', 'The Shadow Spire', 'The Red Span (a crossing)', 'The Blood Spire'],
  throne: ['The Throne Antechambers', 'The Crown Court', 'The Last Stair', 'The Throne Tower', 'The Throne Above'],
};
export function placeOf(floor) { const w = wingOf(floor), L = PLACES[w.id] || [w.name]; return L[Math.min(L.length - 1, ((floor - 1) % 10) >> 1)]; }
/** The layout a place asks for. The Keep's crossings, the Last Stair, the spires and the castle's other tall towers are
 * the Broken Spires (world/castlespires.js, game/castlespires.js: stairs wound round towers in the void, in three.js,
 * bridged and leapt between); the outside ledges and the marrow shaft alternate with them. */
const SPIRE_PLACES = /crossing|Last Stair|Storm Spire's head|Shadow Spire|Blood Spire|Throne Tower|Clock Tower|Observatory|Horn Galleries|Gate Captain's Walk/;
export function placeLayout(floor) {
  const p = placeOf(floor), second = floor % 2 === 0;
  if (SPIRE_PLACES.test(p)) return 'spires';
  if (/outside ledges/.test(p)) return second ? 'spires' : 'outerstair';
  if (/marrow shaft/.test(p)) return second ? 'spires' : 'pits';
  return /Pit Stair|pit stair/.test(p) ? 'pits' : /Library|Archive/.test(p) && LIBRARY_OK ? 'library' : null;
}
const LIBRARY_OK = true;
export const BIBLE_BOSSES = { 5: 'The Gate Captain', 35: 'The Feast That Walks', 65: 'The Sexton of the High Ward', 75: 'The Bridge Warden', 85: 'The Balcony Duellist', 95: "Velscour's Herald" };
