// The Bard's 2,000 melodies (src/data/melodies.js) and their two-handed arrangements (src/game/bardmusic.js), no browser:
//  - exactly 2,000, every spell bar, every finishing bar and every name unique (bars compared as degrees + rhythm,
//    so not even a transposition repeats), every bar rule-clean, all nine styles and all 14 keys well stocked;
//  - finishing-bar combinations: how many songs the 2,000 pairs make;
//  - arrangements of 300 random songs written in random Bard rhythms: keys C2-C7, the left hand under the right,
//    the finishing bar ends on the tonic, no NaN;
//  - the skills: no Bard skill writes a whole note or whole rest, and only one (a long cooldown) writes a triplet.
//   node tools/tests/melodies.mjs
import { melodies, finishes, barFaults, STYLES, KEYS, degNote, TPB, chordPcs } from '../../src/data/melodies.js';
import { realize, arrangement, fitScore, bestMelody, drawn } from '../../src/game/bardmusic.js';
import { NOTES, noteOf } from '../../src/data/notation.js';
import { CLASS_SKILLS } from '../../src/data/skills.js';

let bad = 0;
const fail = (m) => { console.log('FAIL ' + m); bad++; };
const t0 = Date.now(), M = melodies();
console.log(`built ${M.length} melodies in ${Date.now() - t0} ms`);
if (M.length !== 2000) fail(`expected 2000 melodies, got ${M.length}`);
const uniq = (f) => new Set(M.map(f)).size;
const full = (m) => m.sigA + '|' + m.sigB;
for (const [what, f] of [['spell bars', (m) => m.sigA], ['finishing bars', (m) => m.sigB], ['melodies', full], ['names', (m) => m.name]]) {
  const n = uniq(f);
  console.log(`  unique ${what}: ${n}`);
  if (n !== M.length) fail(`${M.length - n} repeated ${what}`);
}
let faults = 0;
for (const m of M) {
  const lastA = m.A.rh.filter((e) => !e.r).pop();
  const f = [...barFaults(m.key, m.A.chords, m.A.rh, 'A', null), ...barFaults(m.key, m.B.chords, m.B.rh, 'B', lastA, m.B.arrive)];
  if (f.length) { faults++; if (faults < 4) console.log('  ', m.name, f.join('; ')); }
}
if (faults) fail(`${faults} melodies break a rule`);
const by = (f) => { const o = {}; for (const m of M) o[f(m)] = (o[f(m)] || 0) + 1; return o; };
const st = by((m) => m.style), ks = by((m) => m.key.id);
console.log('  styles', JSON.stringify(st));
console.log('  keys', JSON.stringify(ks));
for (const s in STYLES) if (!(st[s] >= 120)) fail(`style ${s} has only ${st[s] || 0}`);
for (const k of KEYS) if (!(ks[k.id] >= 60)) fail(`key ${k.id} has only ${ks[k.id] || 0}`);
const tempos = M.map((m) => m.tempo);
if (Math.min(...tempos) < 96) fail('a tempo under 96 would make the spell bar take longer than before');
let combos = 0;
for (const m of M) { const f = finishes(m.id); combos += f.length; if (!f.includes(m.id)) fail(`${m.name} cannot finish itself`); }
console.log(`  songs (spell bar x a finishing bar that follows it): ${combos}`);
if (combos < 20000) fail('too few combinations');

// ------------------------------------------------------------ arrangements of random Bard bars
const POOL = ['q', 'q', 'q', 'e', 'e2', 'h', 'qd', 're', 'rq', 's2', 'rh', 'hd'], REG = ['song', 'sonic', 'trick'];
let r = 12345;
const rnd = () => ((r = (r * 1103515245 + 12345) & 0x7fffffff) / 0x80000000);
let lhOver = 0, nan = 0, endBad = 0, range = 0, evs = 0, rests = 0, refits = 0;
for (let i = 0; i < 300; i++) {
  const A = M[Math.floor(rnd() * M.length)], notes = [];
  let at = 0;
  while (at < 4 - 1e-6) {
    const fit = POOL.filter((g) => NOTES[g].beats <= 4 - at + 1e-6), g = fit[Math.floor(rnd() * fit.length)] || 'e';
    notes.push({ g, at, tier: 0, reg: REG[i % 3] }); at += NOTES[g].beats;
  }
  const cands = finishes(A.id).slice(0, 1).concat(M.filter((m) => m.key === A.key).map((m) => m.id).slice(0, 40));
  const mel = bestMelody(cands, notes, A.id, rnd);
  if (mel !== A.id) refits++;
  const S = M[mel], F = M[finishes(mel)[Math.floor(rnd() * finishes(mel).length)]];
  realize(S, notes, i % 5 ? 'treble' : 'bass');
  rests += drawn(notes).filter((n) => NOTES[n.g].rest).length - notes.filter((n) => NOTES[n.g].rest).length;
  const ev = arrangement(S, notes, F, { clef: i % 5 ? 'treble' : 'bass' });
  evs += ev.length;
  for (const e of ev) {
    if (![e.midi, e.beat, e.beats, e.vel].every(Number.isFinite)) nan++;
    if (e.midi < 36 || e.midi > 96) range++;
  }
  for (const e of ev.filter((x) => x.tag.hand === 'lh')) { // the left hand stays under the right hand sounding with it
    const rh = ev.filter((x) => x.tag.hand === 'rh' && x.beat <= e.beat + 1e-6 && x.beat + x.beats > e.beat + 1e-6);
    if (rh.some((x) => x.midi < e.midi)) { lhOver++; if (lhOver < 4) console.log('  crossing', e.tag.part, e.midi, 'under', rh.map((x) => x.midi).join(), S.style, F.style, i % 5 ? 'treble' : 'bass'); }
  }
  const lastRh = ev.filter((x) => x.tag.hand === 'rh' && x.tag.part === 'B').sort((a, b) => b.beat - a.beat)[0];
  const ton = chordPcs(S.key, F.B.chords[3])[0];
  if (!lastRh || ((lastRh.midi % 12) + 12) % 12 !== ton && ((lastRh.midi % 12) + 12) % 12 !== chordPcs(S.key, F.B.chords[3])[1]) endBad++;
}
console.log(`arrangements: 300 songs, ${evs} notes, ${refits} re-fitted to another melody, ${rests} rests the tunes breathed in; left hand over the right ${lhOver}, out of range ${range}, NaN ${nan}, bad endings ${endBad}`);
if (nan || range) fail('bad events');
if (endBad) fail(`${endBad} finishing bars do not end on the tonic chord`);
if (lhOver > evs * 0.01) fail(`the left hand crosses over the right too often (${lhOver})`);
void degNote; void TPB; void fitScore;

// ------------------------------------------------------------ the skills' notes
const bard = CLASS_SKILLS.bard, glyph = (sk) => noteOf(sk) || (String(sk.fx).startsWith('n_') ? sk.fx.slice(2) : null);
const whole = bard.filter((sk) => ['w', 'rw'].includes(glyph(sk))), trip = bard.filter((sk) => ['t8', 't16', 't32'].includes(glyph(sk)));
console.log(`skills: ${whole.length} whole notes/rests, triplets on ${trip.map((s) => `${s.name} (cd ${s.m.cd})`).join(', ')}`);
if (whole.length) fail('whole notes on ' + whole.map((s) => s.name).join());
if (trip.length !== 1 || !(trip[0].m.cd >= 20)) fail('exactly one long-cooldown skill should write a triplet');
console.log(bad ? `${bad} FAILURES` : 'MELODIES OK');
if (bad) process.exitCode = 1;
