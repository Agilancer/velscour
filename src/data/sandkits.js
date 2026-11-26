// Every one of the Sea of Sand bestiary's 510 (data/sandkin.js) fights its own way. A kit is drawn once, from the
// creature's id, and no two kits are alike:
//   moves   its special moves (Monster.trySpecial): two from its role's pool and one from anywhere, four for a boss or a
//           mythic. A normal one uses the first two, a greater breed, champion or boss all of them.
//   fx      what its shots look like (a bone, a javelin, an ember, a locust...), from its kind's own set
//   n       the size of its patterns: shots in a volley, orbs in a halo, arms of a spiral, stones in a rain (x0.75-1.5)
//   spd     its shots' speed (x0.8-1.25)
//   passive one rule of its own (game/sandkits.js PASSIVES; two for a boss or a mythic)
//   title   the name of its signature move, called out when it first uses it ("Bitumen Rift")
// No two share the same set of moves, let alone moves + fx + n + spd + passives (tools/tests/sandvoices.mjs checks it).
import { SAND_KIN } from './sandkin.js';

const MELEE = ['lunge', 'whirl', 'combo', 'quake', 'hook', 'frenzy', 'phase', 'burrow'];
const RANGED = ['fan', 'burst', 'snipe', 'lob', 'web', 'wall', 'homing', 'rain'];
const CASTER = ['runes', 'orbs', 'sweep', 'spiral', 'cross', 'rings', 'rain', 'homing', 'blink', 'phase', 'wall'];
const ALL = [...new Set([...MELEE, ...RANGED, ...CASTER])];
const ROLE = { archer: RANGED, worm: RANGED, imp: RANGED, cultist: CASTER, wraith: CASTER, elemental: CASTER, eye: CASTER, shroom: CASTER };
export const PASSIVES = ['sandstep', 'mirage', 'scorch', 'duststorm', 'curse', 'rally', 'bulwark', 'regrow', 'vengeance', 'quicksand', 'sunflare', 'shadowstep'];
const FX = {
  beast: ['tooth', 'locust', 'blob', 'rock', 'shard', 'feather', 'bone', 'caltrop'],
  mummy: ['bone', 'spear', 'javelin', 'blade', 'skull', 'rune'],
  zombie: ['bone', 'tooth', 'rock', 'axe', 'caltrop', 'blob'],
  pharaoh: ['javelin', 'spear', 'star', 'rune', 'blade', 'fireball'],
  nomad: ['arrow', 'kunai', 'javelin', 'feather', 'caltrop', 'blade'],
  knight: ['spear', 'javelin', 'axe', 'blade', 'arrow', 'rock'],
  fire: ['fireball', 'meteor', 'star'], light: ['star', 'spirit', 'wave'], cold: ['ice', 'shard', 'wave'], arcane: ['rune', 'star', 'spirit'],
};
const NS = [0.75, 1, 1.25, 1.5], SPDS = [0.8, 0.9, 1, 1.1, 1.25];
export const MOVE_NOUN = {
  lunge: 'Pounce', whirl: 'Whirl', combo: 'Flurry', quake: 'Rift', hook: 'Hook', frenzy: 'Frenzy', phase: 'Step', burrow: 'Dive',
  fan: 'Volley', burst: 'Barrage', snipe: 'Piercer', lob: 'Pot', web: 'Snare', wall: 'Wall', homing: 'Seekers', rain: 'Rain',
  runes: 'Glyphs', orbs: 'Halo', sweep: 'Lash', spiral: 'Spiral', cross: 'Cross', rings: 'Rings', blink: 'Vanish',
};

/** Which voice and shot set a creature has (data/sandvoices.js keys). */
export function sandVoice(a) {
  const k = a.kind || a.tier;
  if (k === 'small' || k === 'large') return 'beast';
  if (k === 'living_pharaoh' || k === 'undead_pharaoh' || k === 'mummified_pharaoh') return 'pharaoh';
  if (k === 'djinn_boss') return 'djinn';
  if (k === 'humanoid_boss') return /pharaoh|vaults/.test(a.sheet) ? 'pharaoh' : /undead|corpse/.test(a.sheet) ? 'zombie' : 'knight';
  if (k === 'boss') return 'mythic';
  return k;   // mythic, mummy, zombie, nomad, knight, djinn
}

// a small seeded generator per id, so a creature's kit never changes between runs
function rng(id) {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
}
const pickR = (r, list) => list[Math.floor(r() * list.length)];
function drawKit(a, r) {
  const big = a.boss || a.mythic, pool = (ROLE[a.arch] || MELEE).filter((k) => k !== 'burrow' || !a.fly);
  const moves = [];
  while (moves.length < 2) { const k = pickR(r, pool); if (!moves.includes(k)) moves.push(k); }
  while (moves.length < (big ? 4 : 3)) { const k = pickR(r, ALL); if (!moves.includes(k) && (k !== 'burrow' || !a.fly)) moves.push(k); }
  const v = sandVoice(a), fxs = a.el && FX[a.el] && (a.kind === 'djinn' || a.kind === 'djinn_boss' || v === 'beast' || v === 'mythic') ? [...FX[a.el], ...(FX[v] || [])] : FX[v] || FX.beast;
  const passive = [pickR(r, PASSIVES)];
  if (big) { let p2; do p2 = pickR(r, PASSIVES); while (p2 === passive[0]); passive.push(p2); }
  return { moves, fx: pickR(r, fxs), n: pickR(r, NS), spd: pickR(r, SPDS), passive, title: a.name.split(' ').filter((w) => !/^(the|of|with)$/i.test(w))[0] + ' ' + MOVE_NOUN[moves[0]] };
}
export const kitSig = (k) => [[...k.moves].sort().join('+'), k.fx, k.n, k.spd, [...k.passive].sort().join('+')].join('|');

/** id -> kit, for all 510. */
export const SAND_KITS = (() => {
  const out = {}, used = new Set(), sets = new Set(), titles = new Set(), set = (k) => [...k.moves].sort().join('+');
  for (const a of SAND_KIN) {
    const r = rng(a.id);
    let k = drawKit(a, r);
    for (let i = 0; (used.has(kitSig(k)) || sets.has(set(k))) && i < 2000; i++) k = drawKit(a, r);
    used.add(kitSig(k)); sets.add(set(k));
    const words = a.name.split(' ').filter((w) => !/^(the|of|with|a)$/i.test(w));   // the title too: "Bitumen Rift", else "Bitumen Sickle Rift"
    for (let n = 1; n <= words.length && titles.has(k.title); n++) k.title = words.slice(0, n).join(' ') + ' ' + MOVE_NOUN[k.moves[0]];
    titles.add(k.title);
    out[a.id] = k;
  }
  return out;
})();
