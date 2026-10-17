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
export function bardArrangement(J, notes, clef = 'treble', land = MEASURE) {
  const ev = [], low = notes.some((n) => n.reg === 'piano3'), bass = low ? 36 : 48, add = (inst, midi, beat, beats, vel, legato) => ev.push({ inst, midi, beat, beats, vel, legato });
  let last = null, lastReg = 'piano4';
  for (const n of notes) {
    const N = NOTES[n.g], inst = REGISTERS[n.reg].inst;
    for (const h of n.heads) add(inst, h.midi, h.at, N.beats / (N.heads || 1), 0.82);
    if (!n.heads.length) continue;
    lastReg = n.reg;
    const ch = chordAt(J, Math.round(n.at * TPB));
    if (ch !== last) {
      last = ch;
      const pcs = chordPcs(J.key, ch);
      add('piano', bass + pcs[0], n.at, 1.4, 0.5, 1); add('piano', bass + pcs[0] + ((pcs[2] - pcs[0] + 12) % 12), n.at, 1.4, 0.32, 1);
    }
  }
  const ton = chordPcs(J.key, { root: 0 }), R = REGISTERS[lastReg], ln = degNote(J.key, J.land), big = clef === 'bass';
  add('piano', bass + ton[0], land, 3, big ? 0.95 : 0.78, 1);
  add('piano', bass + ton[0] + ((ton[2] - ton[0] + 12) % 12), land, 3, 0.5, 1);
  if (big && bass === 48) add('piano', 36 + ton[0], land, 3, 0.8, 1);
  for (const pc of ton) add('piano', 60 + pc, land, 2.6, 0.5, 1);
  add(R.inst, 12 * (R.oct + 1) + ln.m, land, 2.8, 0.92, 1);
  if (R.inst !== 'harpsichord') add('harpsichord', 60 + ton[0], land, 2, 0.42, 1);
  return ev;
}
