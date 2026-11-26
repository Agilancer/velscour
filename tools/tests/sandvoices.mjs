// The Sea of Sand bestiary's kits and voices, no browser: node tools/tests/sandvoices.mjs
// 510 kits, no two alike (moves + shots + sizes + passives, and the move set and title alone); 1,200 shouts, none
// twice, every one fits a three-line bubble; every creature's voice exists.
import { SAND_KIN } from '../../src/data/sandkin.js';
import { SAND_KITS, PASSIVES, kitSig, sandVoice } from '../../src/data/sandkits.js';
import { SAND_VOICES } from '../../src/data/sandvoices.js';

const bad = [];
const MOVES = ['lunge', 'whirl', 'combo', 'quake', 'hook', 'frenzy', 'phase', 'burrow', 'fan', 'burst', 'snipe', 'lob', 'web', 'wall', 'homing', 'rain', 'runes', 'orbs', 'sweep', 'spiral', 'cross', 'rings', 'blink'];
const kits = SAND_KIN.map((a) => [a, SAND_KITS[a.id]]);
if (SAND_KIN.length !== 510) bad.push('bestiary has ' + SAND_KIN.length);
const sigs = new Set(), sets = new Set(), titles = new Set(), voices = {};
for (const [a, k] of kits) {
  if (!k) { bad.push('no kit ' + a.id); continue; }
  sigs.add(kitSig(k)); sets.add([...k.moves].sort().join('+')); titles.add(k.title);
  if (k.moves.length !== (a.boss || a.mythic ? 4 : 3) || new Set(k.moves).size !== k.moves.length) bad.push('moves ' + a.id);
  for (const mv of k.moves) if (!MOVES.includes(mv)) bad.push(a.id + ' move ' + mv);
  if (a.fly && k.moves.includes('burrow')) bad.push(a.id + ' flies but burrows');
  for (const p of k.passive) if (!PASSIVES.includes(p)) bad.push(a.id + ' passive ' + p);
  if (!k.fx || !(k.n > 0) || !(k.spd > 0)) bad.push('kit fields ' + a.id);
  const v = sandVoice(a); voices[v] = (voices[v] || 0) + 1;
  if (!SAND_VOICES[v] || !SAND_VOICES[v].length) bad.push(a.id + ' voice ' + v);
}
for (const [what, n] of [['kits', sigs.size], ['move sets', sets.size], ['titles', titles.size]]) if (n !== 510) bad.push(`${n} unique ${what}`);
const lines = Object.values(SAND_VOICES).flat();
if (lines.length !== 1200) bad.push(lines.length + ' lines');
if (new Set(lines.map((l) => l.toLowerCase())).size !== lines.length) bad.push('repeated lines');
for (const l of lines) if (l.length > 70 || !l.trim() || /[^\x20-\x7e]/.test(l)) bad.push('line: ' + l);
const passives = {}; for (const [, k] of kits) for (const p of k.passive) passives[p] = (passives[p] || 0) + 1;
console.log('voices (creatures):', JSON.stringify(voices));
console.log('lines per voice:', JSON.stringify(Object.fromEntries(Object.entries(SAND_VOICES).map(([k, v]) => [k, v.length]))));
console.log('passives:', JSON.stringify(passives));
console.log(`${sigs.size} kits, ${sets.size} move sets, ${titles.size} titles, ${lines.length} lines (longest ${Math.max(...lines.map((l) => l.length))})`);
console.log(bad.length ? 'FAIL\n' + bad.slice(0, 40).join('\n') : 'PASS');
process.exit(bad.length ? 1 : 0);
