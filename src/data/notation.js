// Musical notation of the Bard. Every Bard skill writes one glyph (skill mod `note=`) into the 4/4 measure that
// floats over his head; filling it to exactly four beats plays a Cadence (src/game/bard.js). Clefs take no time and
// change the key: treble replays the measure as homing notes, bass as one ground-shaking chord.
// heads: how many single notes a beamed group or triplet is made of (the `scatter` mod splits into that many).
export const MEASURE = 4;
export const NOTES = {
  w: { name: 'Whole note', beats: 4, heads: 1 },
  h: { name: 'Half note', beats: 2, heads: 1 },
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
/** The glyph a skill writes, or null. */
export const noteOf = (sk) => (sk && sk.m && NOTES[sk.m.note] ? sk.m.note : null);
export const beatsOf = (sk) => { const n = noteOf(sk); return n ? NOTES[n].beats : 0; };
// Every Bard skill plays its notes on one register of the sampler (src/core/sampler.js): a piano octave or the
// harpsichord. Songs sing on the upper piano, Sonic Arts rumble on the lower, Trickery plucks the harpsichord, and
// the Grand Finale tree picks by note length (long notes low, quick figures on the harpsichord). `inst=` overrides.
export const REGISTERS = {
  piano3: { inst: 'piano', oct: 3, name: 'Piano, low octave (C3-B3)' },
  piano4: { inst: 'piano', oct: 4, name: 'Piano, middle octave (C4-B4)' },
  harpsichord: { inst: 'harpsichord', oct: 4, name: 'Harpsichord (C4-C5)' },
};
const TREE_REG = ['piano4', 'piano3', 'harpsichord'];
const LONG = new Set(['w', 'h', 'rw', 'rh', 'bass']), QUICK = new Set(['s', 's2', 's3', 's4', 't16', 't32', 'rs', 'rt']);
/** The register (REGISTERS key) a Bard skill plays on. */
export function registerOf(sk) {
  if (!sk) return 'piano4';
  if (sk.m && REGISTERS[sk.m.inst]) return sk.m.inst;
  const tree = +String(sk.id).split('.')[1];
  if (TREE_REG[tree]) return TREE_REG[tree];
  const g = noteOf(sk);
  return LONG.has(g) ? 'piano3' : QUICK.has(g) ? 'harpsichord' : 'piano4';
}
/** Bard skill-level tiers: the staff changes colour and gains particles at ranks 5, 10, 15 and 20. */
export const noteTier = (L) => (L >= 20 ? 4 : L >= 15 ? 3 : L >= 10 ? 2 : L >= 5 ? 1 : 0);
// tooltip words for the Bard's projectile mods
export const NOTE_MODS = {
  wavy: 'Vibrato (weaves)', stac: 'Staccato (hops, pulsing)', ferm: 'Fermata (holds and pulses)', cresc: 'Crescendo (grows)',
  gliss: 'Glissando (accelerates)', canon: 'Canon (an echo follows)', scatter: 'Scatters into single notes', trip: 'Triplet (hits 3 times)',
  hush: 'Rest (restores mana on hit)', dacapo: 'Da Capo (plays the measure now)', rubato: 'Rubato (no Discord while active)',
};
