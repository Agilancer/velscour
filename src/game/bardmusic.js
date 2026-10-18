// The Bard's music, free of game state so tools can use it (tools/songbook.html): pitching written glyphs from a
// jingle, and arranging a written bar for the sequencer (src/core/sampler.js).
import { NOTES, MEASURE, REGISTERS } from '../data/notation.js';
import { JINGLES, TPB, jingleDegree, degNote, chordAt, chordPcs } from '../data/jingles.js';

/**
 * Pitch a written glyph from the bar's jingle: each notehead (a beamed group or triplet has several, evenly spaced)
 * takes the tune's note at its beat position, in the skill's register. Heads: { at, L (diatonic index), acc, midi }.
 */
export function pitchHeads(sc, g, at, reg) {
  const N = NOTES[g], J = JINGLES[sc.jingle >= 0 ? sc.jingle : 0], R = REGISTERS[reg] || REGISTERS.piano4;
  if (!N || N.rest || N.clef) return [];
  if (!sc.notes.length) sc.jst = { e: -1 };
  const n = N.heads || 1, out = [];
  for (let i = 0; i < n; i++) {
    const hat = at + (i * N.beats) / n, nt = degNote(J.key, jingleDegree(J, Math.round(hat * TPB), sc.jst));
    out.push({ at: hat, L: nt.L + 7 * R.oct, acc: nt.acc, midi: 12 * (R.oct + 1) + nt.m });
  }
  return out;
}
/**
 * The music of a performed bar, as sequencer events ({ inst, midi, beat, beats, vel }): every written head at its beat,
 * the chord under the tune (root and fifth in the bass) wherever it changes under a new note, and the landing on
 * beat `land`: tonic in the bass, the triad in the middle, the tune's landing note on top in the last note's register.
 * Bars that use the low piano octave put the bass an octave lower (repitched).
 */
/** How long the landing chord rings, in beats (the Bard writes nothing until it has died away). */
export const LAND_BEATS = 1.5;
export function bardArrangement(J, notes, clef = 'treble', land = MEASURE) {
  const ev = [], low = notes.some((n) => n.reg === 'piano3'), bass = low ? 36 : 48, add = (inst, midi, beat, beats, vel, legato) => ev.push({ inst, midi, beat, beats, vel, legato });
  let lastReg = 'piano4';
  const strikes = [];   // the chord under the tune, struck under the first note that sounds over it
  for (const n of notes) {
    const N = NOTES[n.g], inst = REGISTERS[n.reg].inst;
    for (const h of n.heads) add(inst, h.midi, h.at, N.beats / (N.heads || 1), 0.82);
    if (!n.heads.length) continue;
    lastReg = n.reg;
    const ch = chordAt(J, Math.round(n.at * TPB));
    if (!strikes.length || strikes[strikes.length - 1].ch !== ch) strikes.push({ ch, at: n.at });
  }
  strikes.forEach((st, i) => { // root and fifth (third over a diminished fifth), held only until the next chord
    const pcs = chordPcs(J.key, st.ch), until = i + 1 < strikes.length ? strikes[i + 1].at : land, len = Math.min(2, until - st.at);
    const fifth = (pcs[2] - pcs[0] + 12) % 12, up = fifth === 7 ? 7 : (pcs[1] - pcs[0] + 12) % 12;
    add('piano', bass + pcs[0], st.at, len, 0.5, 0.97); add('piano', bass + pcs[0] + up, st.at, len, 0.32, 0.97);
  });
  const ton = chordPcs(J.key, { root: 0 }), R = REGISTERS[lastReg], ln = degNote(J.key, J.land), big = clef === 'bass', L = LAND_BEATS;
  add('piano', bass + ton[0], land, L, big ? 0.95 : 0.78, 1);
  add('piano', bass + ton[0] + 7, land, L, 0.5, 1);
  if (big && bass === 48) add('piano', 36 + ton[0], land, L, 0.8, 1);
  for (const pc of ton) add('piano', 60 + pc, land, L, 0.5, 1);
  add(R.inst, 12 * (R.oct + 1) + ln.m, land, L, 0.92, 1);
  if (R.inst !== 'harpsichord') add('harpsichord', 60 + ton[0], land, L, 0.42, 1);
  return ev;
}
