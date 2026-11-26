// ACT III signature attacks (game/phobosattacks.js): every non-boss Phobos art (data/phobos.js: the city's folk and ward
// foes, the castle's garrison, knights and creatures, and the Dungeon Horrors) gets one attack of its own, built from a
// primitive (a shape and its timing), a rider (what the blow does besides damage) and a form (plain, great: bigger and
// slower, swift: smaller and quicker). The primitive is read off the monster's name, the rider off its element and name;
// no two arts share a combination, so each has its own attack and its own name. Bosses are left to their raid mechanics.
import { PHOBOS_ART } from './phobos.js';
import { hashStr } from '../core/util.js';

// band: near (from the body, close in), mid (closes a gap), far (placed on the target). Ranged and caster archetypes
// skip `near` ones. r: the riders that suit it. kw: the names that suit it. n: names for the plain, great and swift forms.
export const PRIMS = {
  thrust:    { band: 'mid',  cd: 6.5, r: ['rend', 'shove'], n: ['Thrust', 'Impaling Drive', 'Jab'], kw: /(pike|lance|spear|halberd|glaive|poleax|needle|nail|pin\b|quill|spindle|skewer|rod\b)/ },
  cleave:    { band: 'near', cd: 6,   r: ['rend', 'drain'], n: ['Cleave', "Headsman's Arc", 'Slash'], kw: /(axe|blade|cleav|sword|butcher|carving|shear|claw|serrat|knife|fork|scythe|execut|chisel|talon)/ },
  sweep:     { band: 'near', cd: 7,   r: ['rend', 'shove'], n: ['Double Sweep', 'Whirling Reap', 'Flick'], kw: /(flail|whip|lash|sweep|tail|viper|strap|rake|duelist|fencer|curtain|cloth|banner|pennant)/ },
  slam:      { band: 'near', cd: 7,   r: ['shove', 'daze'], n: ['Slam', 'Earthbreaker', 'Stomp'], kw: /(hammer|anvil|ogre|brute|colossus|bulwark|greatshield|rampart|\box\b|mace|knuckle|fist|gauntlet|bully|wrestler|titan|ape\b|footstool)/ },
  shockwave: { band: 'near', cd: 8,   r: ['daze', 'shove'], n: ['Shockwave', 'Groundswell', 'Tremor'], kw: /(buttress|parapet|quoin|mortar|plaster|grout|cairn|clay|causeway|bastion|pew|kneel|excavat)/ },
  toll:      { band: 'near', cd: 8.5, r: ['daze', 'sap'], n: ['Toll', 'Great Peal', 'Knell'], kw: /(bell|toll|chime|organ|lyre|harp|choir|chorist|canticle|hymn|trumpet|signal|cantor|chanter)/ },
  pounce:    { band: 'mid',  cd: 6.5, r: ['rend', 'daze'], n: ['Pounce', 'Falling Maul', 'Spring'], kw: /(hound|wolf|mastiff|jackal|fox\b|raptor|\bcat\b|stalker|prowler|lizard|gecko|salamander|manticore|hunter|harrier|toad|basilisk)/ },
  charge:    { band: 'mid',  cd: 7,   r: ['shove', 'daze'], n: ['Rush', 'Trampling Charge', 'Dart'], kw: /(charger|cavalier|dragoon|\bram\b|stag|boar|courier|runner|centipede|centaur|hippogryph|mutineer|deserter)/ },
  hook:      { band: 'mid',  cd: 7,   r: ['drag', 'rend'], n: ['Hook', 'Gaff Haul', 'Snag'], kw: /(hook|chain|winch|anchor|rope|grapple|shackle|tendon|tong|clasp|gaff|pulley|ladder)/ },
  snare:     { band: 'far',  cd: 7.5, r: ['mire', 'venom'], n: ['Snare', 'Binding Net', 'Trip Line'], kw: /(web|spider|widow|\bnet\b|weaver|spinner|trellis|vine|ivy|bramble|tangle|briar|snare|trap|cage|rack|loom)/ },
  barrage:   { band: 'far',  cd: 7,   r: ['rend', 'burn'], n: ['Barrage', 'Siege Volley', 'Pepper'], kw: /(bow|arrow|bolt|quiver|ballista|arbal|loop|sling|shrike|kite|rivet|crest)/ },
  cross:     { band: 'far',  cd: 8,   r: ['sap', 'daze'], n: ['Crossfire', 'Gibbet Cross', 'Cross Cut'], kw: /(grate|bars|portcullis|latch|lock|pillory|cross|gate|lattice|window|prism|refract|shutter|hinge|deadbolt|arch\b)/ },
  lattice:   { band: 'far',  cd: 8.5, r: ['sap', 'frost'], n: ['Lattice', 'Grand Grid', 'Checker'], kw: /(index|ledger|tally|grid|chalk|\btile|checker|page|vellum|folio|parchment|ink|book|scribe|scriven|quire|grimoire|marginalia|palimpsest|registrar|clerk|census|stack|tome|archive|card)/ },
  encircle:  { band: 'far',  cd: 8.5, r: ['drag', 'daze'], n: ['Cordon', 'Iron Cordon', 'Noose'], kw: /(gaoler|warden|turnkey|cuff|watchman|sentence|penance|vault|oubliette|urn|coffin|casket|sarcophag|collector|bailiff|warder|custodian)/ },
  pool:      { band: 'far',  cd: 8,   r: ['venom', 'burn'], n: ['Spill', 'Flood Jar', 'Splash'], kw: /(flask|vessel|retort|crucible|alchem|apothec|distill|poison|\btar\b|pitch|bile|grease|slick|driptray|tureen|wine|potion|plague|mildew|jelly|tumor|polyp|slime)/ },
  scatter:   { band: 'far',  cd: 8,   r: ['venom', 'mire'], n: ['Scatter', 'Bloomfall', 'Sprinkle'], kw: /(spore|puffball|pollen|mycel|truffle|cordyceps|gill|sporocarp|midge|swarm|louse|wasp|dust|salt|mulch|cap veil|burster)/ },
  breath:    { band: 'near', cd: 8,   r: ['burn', 'venom'], n: ['Breath', 'Bellow', 'Gasp'], kw: /(breath|throat|lung|bellows|chimney|furnace|brazier|censer|thurible|incense|kiln|smoke|boiler|coke|coal|smelt|oven|flame|plume|gut\b|gutling)/ },
  fan:       { band: 'far',  cd: 7,   r: ['rend', 'frost'], n: ['Volley', 'Storm of Shards', 'Flurry'], kw: /(shard|splinter|glass|feather|wing|harpy|\bbat\b|swallow|owl|cormorant|sail|shrapnel|mirror|facet|glaze|foil)/ },
  nova:      { band: 'far',  cd: 8,   r: ['daze', 'sap'], n: ['Nova', 'Starburst', 'Pulse'], kw: /(spark|crackle|lightning|thunder|storm|nimbus|electric|fulminant|urchin|orb\b|star|wisp|seraph|gale)/ },
  spikes:    { band: 'far',  cd: 7.5, r: ['rend', 'mire'], n: ['Eruption', 'Spine Road', 'Prickle'], kw: /(bone|rib\b|spine|vertebra|mandible|marrow|sternum|ossu|skull|teeth|cranial|cranium|hipbone|ossicle|ivory|calcif|root|thorn|spinal|barnacle)/ },
  drop:      { band: 'far',  cd: 8.5, r: ['daze', 'shove'], n: ['Downfall', 'Avalanche', 'Tumble'], kw: /(lintel|keystone|beam|cantilever|roof|corbel|mason|stone|slate|brick|crown|chandelier|candelabra|cart|wheel|weight|marble|stair|spire|tower)/ },
  blink:     { band: 'far',  cd: 7.5, r: ['drain', 'rend'], n: ['Shadowstep', 'Night Ambush', 'Flicker'], kw: /(shadow|shade|veil|phantom|ghost|haunt|poltergeist|hush|silent|mute|unlit|lightless|night|curfew|door|mask|cloak|hood|inward|reflected|sable|black)/ },
  tether:    { band: 'mid',  cd: 9,   r: ['drain', 'sap'], n: ['Tether', 'Long Leash', 'Thread'], kw: /(leech|lamprey|\beel|vein|artery|aorta|clot|blood|gut|tongue|thread|stitch|skein|string|seam|sinew|cord)/ },
  brand:     { band: 'far',  cd: 8.5, r: ['burn', 'sap'], n: ['Brand', 'Doom Seal', 'Mark'], kw: /(brand|hex|curse|witch|warlock|augur|seer|\beye|watcher|sigil|oath|seal|candle|votive|wax|tallow|lantern|lamp|wick|relic|charm)/ },
  wave:      { band: 'far',  cd: 8.5, r: ['frost', 'shove'], n: ['Tide', 'Floodwall', 'Ripple'], kw: /(flood|drown|waterlog|sluice|canal|moat|wet\b|tide|deluge|ferry|river|barge|naiad|rain|cistern|dredge|brine|bog|marsh|quench|water|gutter|channel)/ },
  vortex:    { band: 'near', cd: 9,   r: ['drag', 'drain'], n: ['Vortex', 'Maelstrom', 'Gulp'], kw: /(maw|jaw|mouth|hag|glutton|trough|ration|feast|banquet|gullet|siphon|drain|\bpit\b|hollow|empty|bag\b|sack|scraps|bellied)/ },
  boomerang: { band: 'mid',  cd: 7.5, r: ['rend', 'daze'], n: ['Returning Blade', 'Great Wheel', 'Skipping Disc'], kw: /(sickle|disc|platter|plate|goblet|buckler|badge|wheel|coin|cardsharp|shield|pavise|gorget|bracer|visor)/ },
  orbit:     { band: 'near', cd: 9,   r: ['sap', 'burn'], n: ['Orbit', 'Crown of Motes', 'Twirl'], kw: /(reliquary|halo|mote|moth|orbit|amulet|rosary|prayer|sacrament|rood|chasuble|vestment|mitre|scepter|sceptre|incense)/ },
};

// what a blow does besides damage; el: the element it strikes with unless the art shows its own
export const RIDERS = {
  rend:  { adj: 'Rending',   el: 'phys',   color: '#ff3a3a', kw: /(blood|vein|artery|aorta|clot|serrat|butcher|blade|claw|shear|knife|fork|torturer|flens|execut|red|scarlet|crimson|rack)/ },
  burn:  { adj: 'Searing',   el: 'fire',   color: '#ff8a20', kw: /(ember|flame|cinder|brazier|forge|blaze|ash|soot|kiln|coal|coke|furnace|smelt|fire|pyra|tallow|wax|candle|censer|incense|oven|chimney|boiler|slag)/ },
  frost: { adj: 'Rime',      el: 'cold',   color: '#80e0ff', kw: /(frost|rime|ice|winter|snow|brine|drown|flood|sluice|cistern|canal|wet|deluge|water|eel|quench|moat|river|ferry|barge|salt|naiad|rain)/ },
  venom: { adj: 'Venom',     el: 'poison', color: '#90ff40', kw: /(plague|rot|spore|venom|moth|bile|poison|mildew|fung|mycel|cordyceps|flask|retort|verdigris|tar|grease|slick|wasp|widow|scorpion|centipede|toad)/ },
  daze:  { adj: 'Stunning',  el: 'light',  color: '#ffe040', kw: /(bell|toll|hammer|anvil|thunder|lightning|storm|spark|crackle|electric|mace|knuckle|fist|gauntlet|keystone|lintel|signal|trumpet)/ },
  shove: { adj: 'Heaving',   el: 'phys',   color: '#f0f0f0', kw: /(ox|ram|stag|boar|bulwark|greatshield|shield|pavise|rampart|colossus|ogre|brute|gale|wind|bellows|buttress|parapet)/ },
  drag:  { adj: 'Dragging',  el: 'phys',   color: '#d0a040', kw: /(hook|chain|winch|anchor|rope|shackle|tendon|tong|clasp|gaff|pulley|maw|jaw|eel|lamprey|ladder|coil)/ },
  drain: { adj: 'Thirsting', el: 'shadow', color: '#c02060', kw: /(leech|lamprey|vampir|wight|lich|thirst|drain|gut|hag|glutton|feast|banquet|ghoul|maw|bloodglass)/ },
  sap:   { adj: 'Sapping',   el: 'arcane', color: '#6080ff', kw: /(ink|book|scribe|vellum|folio|parchment|quill|ledger|index|tome|page|mirror|glass|prism|facet|mage|magus|sorcer|warlock|hex|augur|blue|azure|sapphire)/ },
  mire:  { adj: 'Miring',    el: 'poison', color: '#a0a040', kw: /(mud|mire|bog|marsh|mulch|moss|root|vine|ivy|trellis|tar|pitch|grout|mortar|clay|plaster|dredge|silt|sewer|gutter)/ },
};
const RIDER_OF_EL = { fire: 'burn', cold: 'frost', poison: 'venom', light: 'daze', shadow: 'drain', holy: 'daze', arcane: 'sap', blood: 'rend' };

// forms: size (shape scale), wind (telegraph time), dmg, cd (cooldown)
export const FORMS = [
  { id: 'plain', size: 1, wind: 1, dmg: 1, cd: 1 },
  { id: 'great', size: 1.3, wind: 1.3, dmg: 1.3, cd: 1.25 },
  { id: 'swift', size: 0.8, wind: 0.72, dmg: 0.8, cd: 0.8 },
];

// the archetypes' own fallbacks, in order, once the name runs out of ideas (or its picks are taken)
const ARCH_PRIMS = {
  knight: ['thrust', 'cleave', 'charge', 'slam', 'sweep', 'hook', 'boomerang', 'shockwave'], skeleton: ['spikes', 'thrust', 'cleave', 'sweep', 'boomerang'],
  cultist: ['brand', 'lattice', 'cross', 'drop', 'encircle', 'toll', 'nova', 'scatter'], wraith: ['blink', 'tether', 'brand', 'nova', 'fan', 'encircle'],
  zombie: ['vortex', 'slam', 'pool', 'wave', 'tether'], abomination: ['slam', 'vortex', 'shockwave', 'cleave', 'breath', 'charge'],
  golem: ['drop', 'shockwave', 'slam', 'spikes', 'toll'], shroom: ['scatter', 'pool', 'snare', 'nova'], spider: ['snare', 'pounce', 'fan', 'tether'],
  worm: ['tether', 'pool', 'spikes', 'wave', 'vortex'], hound: ['pounce', 'charge', 'sweep', 'cleave'], elemental: ['nova', 'breath', 'scatter', 'orbit'],
  gargoyle: ['pounce', 'fan', 'drop', 'charge'], eye: ['brand', 'cross', 'nova', 'lattice'], demon: ['breath', 'blink', 'nova', 'pounce'], archer: ['barrage', 'fan', 'cross', 'snare'],
};
const RANGED = new Set(['archer', 'imp', 'wraith', 'cultist', 'worm', 'eye']);
const CAP = 22;   // no primitive is worn by more than this many arts, so the shapes spread over the whole act

const lc = (a) => (a.name + ' ' + (a.title || '')).toLowerCase();
/** The word an attack is named after: the art's first telling word (for the folk, their trade). */
function wordOf(a) {
  const src = (a.cat === 'gray' || a.cat === 'good') && a.title ? a.title : a.name;
  const w = src.split(/[\s-]+/).filter((x) => !/^(the|of|a|an|and|that)$/i.test(x));
  return (w[0] || src).replace(/'s$/i, '').replace(/^./, (c) => c.toUpperCase());
}

/** Every kitted art's attack, by art id: { prim, rider, form, name, color, el, seed }. Built once, deterministically. */
export const PHOBOS_KITS = {};
(function build() {
  const used = new Set(), count = {};
  const list = PHOBOS_ART.filter((a) => !a.boss).sort((a, b) => (a.id < b.id ? -1 : 1));
  // the names with the strongest pull pick first, so a "Bell" gets the bell before the fallbacks fill it
  const prefOf = (a) => {
    const s = lc(a), hits = [];
    for (const [k, P] of Object.entries(PRIMS)) { const m = s.match(P.kw); if (m) hits.push([k, m.index]); }
    hits.sort((x, y) => x[1] - y[1]);
    const out = hits.map((h) => h[0]);
    for (const k of ARCH_PRIMS[a.arch] || ARCH_PRIMS.knight) if (!out.includes(k)) out.push(k);
    for (const k of Object.keys(PRIMS)) if (!out.includes(k)) out.push(k);
    return RANGED.has(a.arch) ? [...out.filter((k) => PRIMS[k].band !== 'near'), ...out.filter((k) => PRIMS[k].band === 'near')] : out;
  };
  const riderPref = (a, p) => {
    const s = lc(a), out = [];
    const hits = Object.entries(RIDERS).map(([k, R]) => { const m = s.match(R.kw); return m ? [k, m.index] : null; }).filter(Boolean).sort((x, y) => x[1] - y[1]);
    for (const [k] of hits) out.push(k);
    if (a.el && RIDER_OF_EL[a.el] && !out.includes(RIDER_OF_EL[a.el])) out.push(RIDER_OF_EL[a.el]);
    for (const k of PRIMS[p].r) if (!out.includes(k)) out.push(k);
    const rest = Object.keys(RIDERS).filter((k) => !out.includes(k)), h = hashStr(a.id);
    for (let i = 0; i < rest.length; i++) out.push(rest[(i + h) % rest.length]);
    return out;
  };
  const ranked = list.map((a) => ({ a, pref: prefOf(a), strong: PRIMS[prefOf(a)[0]].kw.test(lc(a)) })).sort((x, y) => (y.strong - x.strong) || (x.a.id < y.a.id ? -1 : 1));
  for (const { a, pref } of ranked) {
    const h = hashStr(a.id), forms = [0, 1, 2].map((i) => FORMS[(i + h) % 3]);
    let got = null;
    for (const p of pref) {
      if ((count[p] || 0) >= CAP) continue;
      for (const r of riderPref(a, p)) { for (const f of forms) if (!used.has(p + r + f.id)) { got = [p, r, f]; break; } if (got) break; }
      if (got) break;
    }
    if (!got) for (const p of Object.keys(PRIMS)) for (const r of Object.keys(RIDERS)) for (const f of FORMS) if (!got && !used.has(p + r + f.id)) got = [p, r, f];
    const [p, r, f] = got;
    used.add(p + r + f.id); count[p] = (count[p] || 0) + 1;
    const R = RIDERS[r], noun = PRIMS[p].n[FORMS.indexOf(f)];
    PHOBOS_KITS[a.id] = { prim: p, rider: r, form: f.id, name: `${wordOf(a)} ${R.adj} ${noun}`, color: R.color, el: a.el && RIDER_OF_EL[a.el] === r ? a.el : R.el, seed: h };
  }
})();
export const phobosKitOf = (id) => PHOBOS_KITS[id] || null;
