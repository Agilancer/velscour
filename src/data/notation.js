// Musical notation of the Bard. Every Bard skill writes one glyph (skill mod `note=`) into the 4/4 measure that
// floats over his head; filling it to exactly four beats plays a Cadence (src/game/bard.js). Clefs take no time and
// change the key: treble replays the measure as homing notes, bass as one ground-shaking chord.
// heads: how many single notes a beamed group or triplet is made of (the `scatter` mod splits into that many).
// No skill writes a whole note or a whole rest (a bar is several casts), and only Chorus writes a triplet.
export const MEASURE = 4;
export const NOTES = {
  w: { name: 'Whole note', beats: 4, heads: 1 },
  hd: { name: 'Dotted half note', beats: 3, heads: 1 },
  h: { name: 'Half note', beats: 2, heads: 1 },
  qd: { name: 'Dotted quarter note', beats: 1.5, heads: 1 },
  q: { name: 'Quarter note', beats: 1, heads: 1 },
  e: { name: 'Eighth note', beats: 0.5, heads: 1 },
  e2: { name: 'Pair of tied eighth notes', beats: 1, heads: 2 },
  s: { name: 'Sixteenth note', beats: 0.25, heads: 1 },
  s2: { name: 'Two beamed sixteenths', beats: 0.5, heads: 2 },
  s3: { name: 'Three beamed sixteenths', beats: 0.75, heads: 3 },
  s4: { name: 'Four beamed sixteenths', beats: 1, heads: 4 },
  t8: { name: 'Eighth-note triplet', beats: 1, heads: 3 },
  t16: { name: 'Sixteenth-note triplet', beats: 0.5, heads: 3 },
  t32: { name: 'Thirty-second-note triplet', beats: 0.25, heads: 3 },
  rw: { name: 'Whole rest', beats: 4, rest: true },
  rh: { name: 'Half rest', beats: 2, rest: true },
  rq: { name: 'Quarter rest', beats: 1, rest: true },
  re: { name: 'Eighth rest', beats: 0.5, rest: true },
  rs: { name: 'Sixteenth rest', beats: 0.25, rest: true },
  rt: { name: 'Thirty-second rest', beats: 0.125, rest: true },
  treble: { name: 'Treble clef', beats: 0, clef: 'treble' },
  bass: { name: 'Bass clef', beats: 0, clef: 'bass' },
};
/** The single note a beamed group or triplet breaks into. */
export const SINGLE = { e2: 'e', s2: 's', s3: 's', s4: 's', t8: 'e', t16: 's', t32: 's' };
/** A sounding length in ticks (24 a beat) -> the note / rest glyph that writes it (for a bar's realised rhythm). */
export const NOTE_OF_TICKS = { 6: 's', 12: 'e', 24: 'q', 36: 'qd', 48: 'h', 72: 'hd', 96: 'w' };
export const REST_OF_TICKS = { 3: 'rt', 6: 'rs', 12: 're', 24: 'rq', 48: 'rh', 96: 'rw' };
/** The glyph a skill writes, or null. */
export const noteOf = (sk) => (sk && sk.m && NOTES[sk.m.note] ? sk.m.note : null);
export const beatsOf = (sk) => { const n = noteOf(sk); return n ? NOTES[n].beats : 0; };
// Every Bard skill plays the harpsichord (src/core/sampler.js) with its tree's touch: Songs sing (held, full decay),
// Sonic Arts strike hard (marcato, doubled an octave below), Trickery plucks (staccato), the Grand Finale tree by note
// length. `inst=` overrides.
// The note's length picks the short or held sample of that touch (artFor).
export const REGISTERS = {
  song: { name: 'Harpsichord, singing touch', held: 'normal_held', short: 'normal_short', quick: 'normal_short' },
  sonic: { name: 'Harpsichord, marcato touch (octave doubled)', held: 'marcato_held', short: 'marcato_short', quick: 'marcato_short', double: true },
  trick: { name: 'Harpsichord, staccato touch', held: 'normal_short', short: 'staccato_short', quick: 'staccato_short' },
};
const TREE_REG = ['song', 'sonic', 'trick'];
const LONG = new Set(['hd', 'h', 'qd', 'rh', 'bass']), QUICK = new Set(['e', 's', 's2', 's4', 're', 'rs']);
/** The touch (REGISTERS key) a Bard skill plays with. */
export function registerOf(sk) {
  if (!sk) return 'song';
  if (sk.m && REGISTERS[sk.m.inst]) return sk.m.inst;
  const tree = TREE_REG[+String(sk.id).split('.')[1]];
  if (tree) return tree;
  const g = noteOf(sk);   // the Grand Finale tree: long notes strike, quick ones pluck
  return LONG.has(g) ? 'sonic' : QUICK.has(g) ? 'trick' : 'song';
}
/** The sample articulation for a note of `beats` in a touch. */
export function artFor(reg, beats) {
  const R = REGISTERS[reg] || REGISTERS.song;
  return beats >= 0.99 ? R.held : beats >= 0.49 ? R.short : R.quick;
}
/** Bard skill-level tiers: the staff changes colour and gains particles at ranks 5, 10, 15 and 20. */
export const noteTier = (L) => (L >= 20 ? 4 : L >= 15 ? 3 : L >= 10 ? 2 : L >= 5 ? 1 : 0);
// tooltip words for the Bard's projectile mods
export const NOTE_MODS = {
  wavy: 'Vibrato (weaves)', stac: 'Staccato (hops, pulsing)', ferm: 'Fermata (holds and pulses)', cresc: 'Crescendo (grows)',
  gliss: 'Glissando (accelerates)', canon: 'Canon (an echo follows)', scatter: 'Scatters into single notes', trip: 'Triplet (hits 3 times)',
  hush: 'Rest (restores mana on hit)', dacapo: 'Da Capo (plays the measure now)', rubato: 'Rubato (no Discord while active)',
};
