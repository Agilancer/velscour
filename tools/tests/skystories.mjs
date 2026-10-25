// The Sky Battle's stories (docs/SKY_STORIES.md), no browser: every story is complete and every name in it resolves:
// art ids, archetypes, swaps, cast keys, speakers on screen at that beat, acts, tokens, knights, line lengths, unique ids
// and names. Prints a count per story.
//   node tools/tests/skystories.mjs [ids]
import { SKY_STORIES } from '../../src/data/skystories.js';
import { SKY_VARIANTS } from '../../src/data/skybattle.js';
import { ART_BY_ID, SWAPS } from '../../src/data/bestiary.js';
import { AIR_CAPTAIN, AIR_CREW } from '../../src/data/airpirates.js';
import { TOWNSFOLK } from '../../src/data/townsfolk.js';

const ARCHS = 'skeleton archer zombie ghoul imp demon spider bat slime wraith golem cultist hound eye knight worm shroom elemental scorpion gargoyle beetle abomination'.split(' ');
const MOOD = 'calm grim laugh angry smug shock'.split(' ');
const KACT = 'laugh cry rage flex dance spin salute swoon faint hop point shrug bow thinking attack'.split(' ');
const MOVES = 'crew hook leap barrage storm smoke'.split(' ');
const BASES = SKY_VARIANTS.map((v) => v.id);
const KNIGHTS = TOWNSFOLK.filter((q) => q.knight).map((q) => q.name.split(' ')[0]);
const want = process.argv[2] ? process.argv[2].split(',') : null;
const fails = [];
const art = (id) => ART_BY_ID[id] || AIR_CAPTAIN[id] || AIR_CREW.find((a) => a.id === id);
const ids = new Set(), names = new Set(), lines = new Set();
let total = 0;

for (const s of SKY_STORIES) {
  const bad = (m) => fails.push(`${s.id}: ${m}`);
  if (ids.has(s.id)) bad('duplicate id'); ids.add(s.id);
  if (names.has(s.name)) bad('duplicate name'); names.add(s.name);
  if (BASES.includes(s.id)) bad('id clashes with a weather');
  if (want && !want.includes(s.id)) continue;
  for (const k of ['name', 'weather', 'blurb', 'ship', 'shipSub']) if (typeof s[k] !== 'string' || !s[k]) bad(`missing ${k}`);
  if (!BASES.includes(s.base)) bad(`base ${s.base}`);
  const swap = (w, x) => { if (x != null && typeof x === 'string' && !SWAPS[x]) bad(`${w}: swap ${x}`); };
  const checkArt = (w, a) => {
    if (!a || !art(a.art)) bad(`${w}: art ${a && a.art}`);
    else if (/^(de_|bs\d|ss_|hv_)/.test(a.art) || art(a.art).breach) bad(`${w}: art ${a.art} not allowed`);
    if (!ARCHS.includes(a.arch)) bad(`${w}: arch ${a.arch}`);
    swap(w, a.swap);
  };
  if (!Array.isArray(s.crew) || s.crew.length < 6) bad('crew: at least 6');
  (s.crew || []).forEach((c, i) => checkArt(`crew ${i}`, c));
  const cast = s.cast || {};
  for (const [k, c] of Object.entries(cast)) {
    checkArt(`cast ${k}`, c);
    if (!c.name || !c.title) bad(`cast ${k}: name/title`);
    if (!(c.h >= 30 && c.h <= 220)) bad(`cast ${k}: h ${c.h}`);
    if (!(c.voice >= 0.3 && c.voice <= 1.6)) bad(`cast ${k}: voice ${c.voice}`);
    if (!Array.isArray(c.moves) || !c.moves.length || c.moves.some((m) => !MOVES.includes(m))) bad(`cast ${k}: moves ${c.moves}`);
  }
  if (!cast[s.mid]) bad(`mid ${s.mid}`);
  if (!Array.isArray(s.finals) || s.finals.length !== 2 || s.finals.some((k) => !cast[k]) || s.finals[0] === s.finals[1]) bad(`finals ${s.finals}`);
  if (s.knights) {
    if (s.knights.length !== 2 || s.knights[0].base === s.knights[1].base) bad('knights: two different');
    for (const k of s.knights) { if (!KNIGHTS.includes(k.base)) bad(`knight base ${k.base}`); if (!k.name) bad('knight name'); if (k.hue !== undefined && !(k.hue >= 0 && k.hue < 360)) bad(`knight hue ${k.hue}`); }
  }
  const G = s.gauntlet, master = G && G.master;
  if (G && !cast[master]) bad(`gauntlet master ${master}`);
  const tokens = (w, t) => {
    for (const [, k] of t.matchAll(/\{([@\w]+)\}/g)) {
      if (k[0] === '@') { if (!cast[k.slice(1)]) bad(`${w}: token {${k}}`); } else if (!['hero', 'class', 'k1', 'k2'].includes(k)) bad(`${w}: token {${k}}`);
    }
    const len = t.replace(/\{@(\w+)\}/g, (m, k) => (cast[k] ? cast[k].name : m)).replace('{hero}', 'Sir Reginald IV').replace('{class}', 'Death Knight').replace(/\{k[12]\}/g, 'Sky-Knight Elsabet').length;
    if (len > 150) bad(`${w}: ${len} chars: "${t.slice(0, 40)}..."`);
    if (lines.has(t)) bad(`${w}: line used twice "${t.slice(0, 40)}"`); lines.add(t);
    total++;
  };
  const say = (w, ln, who) => {
    if (!ln || typeof ln.text !== 'string') { bad(`${w}: not a line`); return; }
    if (!who.includes(ln.who)) bad(`${w}: speaker ${ln.who} (can be ${who.join(' ')})`);
    const acts = ln.who === 'k1' || ln.who === 'k2' ? KACT : MOOD;
    if (!acts.includes(ln.act)) bad(`${w}: act ${ln.act} for ${ln.who}`);
    tokens(w, ln.text);
  };
  const L = s.lines || {};
  const str = (w) => { if (typeof L[w] !== 'string') bad(`lines.${w} must be a string`); else tokens(w, L[w]); };
  ['arrive', 'mid', 'second', 'victory'].forEach(str);
  const parley = L.parley || [];
  if (parley.length < 8 || parley.length > 14) bad(`parley: ${parley.length} lines (8-14)`);
  parley.forEach((ln, i) => say(`parley ${i}`, ln, ['hero', 'cap', 'k1', 'k2']));
  const tw = L.twist || [];
  if (tw.length < 1 || tw.length > 3) bad('twist: 1-3 lines');
  tw.forEach((ln, i) => say(`twist ${i}`, ln, ['cap', 'hero', 'k1', 'k2', ...(master ? [master] : [])]));
  const be = L.betrayal || [];
  if (be.length < 2 || be.length > 4) bad('betrayal: 2-4 lines');
  be.forEach((ln, i) => say(`betrayal ${i}`, ln, ['k1', 'k2', 'hero']));
  const pair = (w, kact) => { const a = L[w]; if (!Array.isArray(a) || a.length !== 2) { bad(`${w}: two entries`); return; } a.forEach((x, i) => { if (kact) { if (!Array.isArray(x) || !KACT.includes(x[1])) bad(`${w} ${i}: [text, knight act]`); else tokens(`${w} ${i}`, x[0]); } else if (typeof x !== 'string') bad(`${w} ${i}: text`); else tokens(`${w} ${i}`, x); }); };
  pair('hooks', true); pair('charge', false); pair('farewell', true);
  if (G) {
    const deck = ['hero', 'k1', 'k2', master];
    (G.intro || []).forEach((ln, i) => say(`gauntlet intro ${i}`, ln, deck));
    if (!(G.intro || []).length) bad('gauntlet intro');
    if (!Array.isArray(G.waves) || G.waves.length < 1 || G.waves.length > 4) bad('gauntlet: 1-4 waves');
    const used = new Set([s.mid, ...s.finals, master]);
    (G.waves || []).forEach((wv, i) => {
      if (!Array.isArray(wv.keys) || wv.keys.length < 1 || wv.keys.length > 2) bad(`wave ${i}: 1-2 keys`);
      for (const k of wv.keys || []) { if (!cast[k]) bad(`wave ${i}: key ${k}`); if (used.has(k)) bad(`wave ${i}: ${k} already fought`); used.add(k); }
      say(`wave ${i}`, wv.line, deck);
    });
    (G.finale || []).forEach((ln, i) => say(`finale ${i}`, ln, deck));
    (G.death || []).forEach((ln, i) => say(`death ${i}`, ln, deck));
    if (!(G.finale || []).length || !(G.death || []).length) bad('gauntlet finale/death');
  }
  console.log(`${s.id.padEnd(22)} ${String(Object.keys(cast).length).padStart(2)} cast  ${String((s.crew || []).length).padStart(2)} crew  ${G ? `gauntlet ${G.waves.length}` : '          '}  ${s.name}`);
}
console.log(`${SKY_STORIES.length} stories, ${total} lines`);
if (!want && SKY_STORIES.length !== 30) fails.push(`${SKY_STORIES.length} stories (want 30)`);
if (fails.length) { console.log('FAIL\n  ' + fails.join('\n  ')); process.exit(1); }
console.log('OK');
