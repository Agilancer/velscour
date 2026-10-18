// The Bard's 300 jingles: one-bar 4/4 tunes the measure over his head is written from. Each is built by plain
// common-practice rules, seeded so the set never changes between loads:
//  - a key (7 major, 7 harmonic minor, at most three sharps or flats) and a tempo;
//  - one chord per beat, a progression that ends on the dominant (I-vi-ii-V, i-iv-V-V, ...), and a landing tonic
//    chord on the next downbeat: every bar is an authentic cadence;
//  - a melody in one-beat rhythm cells (quarters, eighths, dotted eighths, sixteenths, eighth triplets,
//    syncopations), with a note on every beat. Beats carry chord tones; off-beats may pass or neighbour by step;
//    steps are preferred over leaps, a leap turns back by step, no tritone or seventh leaps, no augmented second,
//    and the last note leads into the landing note by step where it can.
// Every melody stays inside one octave C..B, so any register (piano C3-B3 or C4-B4, harpsichord C4-B4) can play it.
// Notes are kept as scale degrees (`d`, 0 = the tonic) and spelled (`L` letter 0-6 = C-B, `m` semitone 0-11 above C),
// so the staff shows the right letter and accidental. Time is in ticks: TPB per beat (24 fits 32nds and triplets).
export const TPB = 24;
export const BAR = 4 * TPB;
const STEPS = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 11] };   // minor = harmonic (raised 7th)
export const NATURAL = [0, 2, 4, 5, 7, 9, 11];   // semitone of each natural letter C D E F G A B
export const LETTERS = 'CDEFGAB';
// letter = the tonic's letter (0 = C), pc = its semitone in the C..B window, sig = sharps (+) or flats (-)
export const KEYS = [
  { id: 'C', letter: 0, pc: 0, sig: 0 }, { id: 'G', letter: 4, pc: 7, sig: 1 }, { id: 'D', letter: 1, pc: 2, sig: 2 },
  { id: 'A', letter: 5, pc: 9, sig: 3 }, { id: 'F', letter: 3, pc: 5, sig: -1 }, { id: 'Bb', letter: 6, pc: 10, sig: -2 },
  { id: 'Eb', letter: 2, pc: 3, sig: -3 },
  { id: 'Am', letter: 5, pc: 9, sig: 0, minor: true }, { id: 'Em', letter: 2, pc: 4, sig: 1, minor: true },
  { id: 'Bm', letter: 6, pc: 11, sig: 2, minor: true }, { id: 'F#m', letter: 3, pc: 6, sig: 3, minor: true },
  { id: 'Dm', letter: 1, pc: 2, sig: -1, minor: true }, { id: 'Gm', letter: 4, pc: 7, sig: -2, minor: true },
  { id: 'Cm', letter: 0, pc: 0, sig: -3, minor: true },
];
export const keyName = (k) => k.id.replace('b', '♭').replace('#', '♯').replace(/m$/, ' minor') + (k.minor ? '' : ' major');
const SHARPS = [3, 0, 4, 1, 5, 2, 6], FLATS = [6, 2, 5, 1, 4, 0, 3];   // letters in key-signature order: F C G D A E B
/** The key signature's accidental on a letter: +1, -1 or 0. */
export function sigAcc(key, letter) {
  if (key.sig > 0) return SHARPS.slice(0, key.sig).includes(letter) ? 1 : 0;
  if (key.sig < 0) return FLATS.slice(0, -key.sig).includes(letter) ? -1 : 0;
  return 0;
}
export const sigLetters = (key) => (key.sig > 0 ? SHARPS.slice(0, key.sig) : FLATS.slice(0, -key.sig));
const mod7 = (d) => ((d % 7) + 7) % 7;
/** Degrees that stay inside the C..B window for a key. */
export const degRange = (key) => [-key.letter, 6 - key.letter];
/** Spell scale degree d of a key: { L: letter 0-6, m: semitone 0-11, acc: -1/0/+1 against the natural letter }. */
export function degNote(key, d) {
  const L = key.letter + d, m = key.pc + STEPS[key.minor ? 'minor' : 'major'][mod7(d)] + 12 * Math.floor(d / 7);
  return { L, m, acc: m - NATURAL[L] };
}

// roman numeral -> chord root degree (+ a seventh)
const ROMAN = { I: 0, i: 0, ii: 1, 'ii°': 1, iii: 2, IV: 3, iv: 3, V: 4, V7: 4, vi: 5, VI: 5 };
const PROGS = {
  major: ['I IV V V', 'I vi IV V', 'I vi ii V', 'I IV ii V', 'I iii IV V', 'I ii IV V', 'I V IV V', 'I I IV V', 'I I V V7',
    'I IV I V', 'vi IV I V', 'I vi IV V7', 'I IV V7 V7', 'I iii vi V', 'I ii V V7', 'IV I ii V', 'I V vi V', 'I vi ii V7'],
  minor: ['i iv V V', 'i VI iv V', 'i VI ii° V', 'i iv i V', 'i i iv V', 'i ii° V V7', 'VI iv i V', 'i iv VI V', 'i VI iv V7', 'i i V V7'],
};
const chordOf = (r) => ({ roman: r, root: ROMAN[r], seventh: r === 'V7' });
/** Is degree d a tone of the chord? */
export const inChord = (ch, d) => { const k = mod7(d - ch.root); return k === 0 || k === 2 || k === 4 || (ch.seventh && k === 6); };

// one-beat rhythm cells in ticks (24 = a quarter note)
const CELLS = [[24], [12, 12], [18, 6], [6, 6, 12], [12, 6, 6], [6, 6, 6, 6], [8, 8, 8], [6, 12, 6], [16, 8]];
const CELL_W = [ // weights per beat of the bar: the first is lively, the last plain so it leads into the landing
  [2, 4, 3, 2, 2, 1, 1.5, 1, 1], [2, 4, 2, 2, 2, 1.5, 1.5, 1.5, 1], [2, 4, 2, 2, 2, 1.5, 1.5, 1.5, 1], [5, 4, 1, 1, 1.5, 0.5, 1.5, 0.5, 1],
];
const CONTOURS = [(x) => Math.sin(x * Math.PI) * 2.5 - 0.5, (x) => -Math.sin(x * Math.PI) * 2.5 + 0.8, (x) => x * 4 - 2,
  (x) => 2 - x * 4, (x) => Math.sin(x * Math.PI * 2) * 2, (x) => -Math.sin(x * Math.PI * 2) * 2, () => 0];
const FORMS = ['Air', 'Reel', 'Jig', 'Galliard', 'Gavotte', 'Minuet', 'Ballad', 'Carol', 'Hornpipe', 'Rondo', 'Bourrée', 'Chanson', 'Ditty', 'Round', 'Canzona', 'Lay', 'Romp', 'Fanfare'];
const MINOR_FORMS = ['Lament', 'Elegy', 'Dirge', 'Nocturne', 'Sarabande', 'Pavane', 'Ballad', 'Air', 'Lay', 'Chanson', 'Round', 'Galliard'];
const ADJ = ['Amber', 'Silver', 'Crooked', 'Drowsy', 'Lantern', 'Merry', 'Hollow', 'Gilded', 'Wandering', 'Velvet', 'Thorny', 'Moonlit',
  'Rusty', 'Laughing', 'Sunken', 'Copper', 'Winter', 'Ember', 'Gallant', 'Restless', 'Ivory', 'Briar', 'Last', 'Little'];
const NOUN = ['Tavern', 'Lantern', 'Crown', 'Fox', 'Road', 'Bell', 'Raven', 'Harbor', 'Candle', 'Knight', 'Meadow', 'Gate', 'Barrow',
  'Maiden', 'Goblet', 'Tower', 'Mill', 'Pilgrim', 'Moon', 'Dragon', 'Cellar', 'Lute', 'Ferryman', 'Orchard'];

function rng(seed) { // mulberry32
  return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const pickW = (r, w) => { let s = w.reduce((a, b) => a + b, 0) * r(); for (let i = 0; i < w.length; i++) if ((s -= w[i]) <= 0) return i; return w.length - 1; };
const semis = (key, a, b) => Math.abs(degNote(key, a).m - degNote(key, b).m);
/** An augmented second (b6 <-> raised 7 in harmonic minor) between two adjacent degrees. */
const aug2 = (key, a, b) => key.minor && Math.abs(a - b) === 1 && semis(key, a, b) === 3;

function compose(r, key) {
  const [lo, hi] = degRange(key), mid = (lo + hi) / 2;
  const prog = PROGS[key.minor ? 'minor' : 'major'], chords = prog[Math.floor(r() * prog.length)].split(' ').map(chordOf);
  const shape = CONTOURS[Math.floor(r() * CONTOURS.length)], mel = [];
  for (let b = 0; b < 4; b++) { let t = b * TPB; for (const dur of CELLS[pickW(r, CELL_W[b])]) { mel.push({ t, dur }); t += dur; } }
  let prev = null, prevNct = false, lastLeap = 0, reps = 0;
  for (let i = 0; i < mel.length; i++) {
    const ev = mel[i], ch = chords[Math.floor(ev.t / TPB)], onBeat = ev.t % TPB === 0, last = i === mel.length - 1;
    const target = mid + shape(ev.t / BAR);
    let best = null, bestS = Infinity;
    for (let d = lo; d <= hi; d++) {
      const ct = inChord(ch, d);
      if (onBeat && !ct) continue;
      if ((!ct || prevNct) && (prev === null || Math.abs(d - prev) !== 1)) continue;   // non-chord tones in and out by step
      let s = Math.abs(d - target) * 0.55 + r() * 1.6;
      if (prev !== null) {
        const iv = Math.abs(d - prev), st = semis(key, d, prev);
        s += [1.3, 0, 0.5, 1.6, 2.6, 3.6][Math.min(5, iv)] + (iv > 5 ? 9 : 0);
        if (st === 6 || st === 10 || st === 11) s += 9;   // no tritone or seventh leaps
        if (aug2(key, d, prev)) s += 20;
        if (iv === 0 && reps >= 1) s += 6;
        if (lastLeap && (iv > 2 || Math.sign(d - prev) === Math.sign(lastLeap))) s += 2.2;   // a leap turns back by step
      } else s += Math.abs(d - mid) * 0.4;
      if (last) { const k = mod7(d); s += k === 6 || k === 1 ? -1.4 : k === 4 ? -0.4 : 0.6; }
      if (s < bestS) { bestS = s; best = d; }
    }
    if (best === null) return null;
    const iv = prev === null ? 0 : best - prev;
    reps = iv === 0 && prev !== null ? reps + 1 : 0; lastLeap = Math.abs(iv) >= 3 ? iv : 0;
    ev.d = best; prev = best; prevNct = !inChord(ch, best);
  }
  // the landing note: a tonic-chord tone, by step from the last note where possible
  let land = null, ls = Infinity;
  for (let d = lo; d <= hi; d++) {
    const k = mod7(d);
    if (k !== 0 && k !== 2 && k !== 4) continue;
    const iv = Math.abs(d - prev), s = [1.4, 0, 0.6, 2, 3, 4, 5][Math.min(6, iv)] + (k === 0 ? -0.4 : 0) + (semis(key, d, prev) >= 10 ? 9 : 0);
    if (s < ls) { ls = s; land = d; }
  }
  return { chords, mel, land };
}

/** Rule check of a composed bar (also used by the tests): range, variety, no forbidden intervals, beats on chord tones. */
export function jingleFaults(j) {
  const f = [], ds = j.mel.map((e) => e.d), key = j.key, ms = ds.map((d) => degNote(key, d).m);
  const range = Math.max(...ms) - Math.min(...ms);
  if (range < 4 || range > 11) f.push('range ' + range);
  if (new Set(ds).size < 3) f.push('fewer than 3 pitches');
  if (ms.some((m) => m < 0 || m > 11)) f.push('outside C..B');
  for (let i = 0; i < 4; i++) if (!j.mel.some((e) => e.t === i * TPB)) f.push('no note on beat ' + (i + 1));
  j.mel.forEach((e, i) => {
    const ch = j.chords[Math.floor(e.t / TPB)];
    if (e.t % TPB === 0 && !inChord(ch, e.d)) f.push(`beat note ${i} not a chord tone`);
    if (i) {
      const p = j.mel[i - 1].d, st = semis(key, e.d, p);
      if (st === 6 || st === 10 || st === 11) f.push(`leap ${st} at ${i}`);
      if (aug2(key, e.d, p)) f.push('augmented second');
      const pch = j.chords[Math.floor(j.mel[i - 1].t / TPB)];
      if ((!inChord(ch, e.d) || !inChord(pch, p)) && Math.abs(e.d - p) !== 1) f.push('non-chord tone not by step');
      if (i > 1 && e.d === p && p === j.mel[i - 2].d) f.push('three repeats');
    }
  });
  const k = mod7(j.land);
  if (k !== 0 && k !== 2 && k !== 4) f.push('landing not a tonic tone');
  if (Math.abs(j.land - ds[ds.length - 1]) > 4) f.push('landing leap');
  return f;
}

function build() {
  const r = rng(0x5eed7a1e), out = [], seen = new Set(), names = new Set();
  for (let tries = 0; out.length < 300 && tries < 40000; tries++) {
    const key = KEYS[out.length % KEYS.length], c = compose(r, key);
    if (!c) continue;
    const j = { key, ...c };
    if (jingleFaults(j).length) continue;
    const sig = key.id + c.mel.map((e) => e.t + ':' + e.d).join() + '>' + c.land;
    if (seen.has(sig)) continue;
    let name;
    do {
      const forms = key.minor ? MINOR_FORMS : FORMS;
      name = `${forms[Math.floor(r() * forms.length)]} of the ${ADJ[Math.floor(r() * ADJ.length)]} ${NOUN[Math.floor(r() * NOUN.length)]}`;
    } while (names.has(name) || name.includes('Lantern Lantern'));
    seen.add(sig); names.add(name);
    j.id = out.length; j.name = name;
    j.tempo = key.minor ? 120 + Math.floor(r() * 6) * 6 : 132 + Math.floor(r() * 7) * 6;   // 120-150 minor, 132-168 major
    out.push(j);
  }
  return out;
}
export const JINGLES = build();

/**
 * The degree a written note takes at `tick` of jingle j. A note on one of the tune's own onsets plays that note;
 * further notes inside the same tune note walk by step toward the next one (passing tones), or turn on an upper
 * neighbour when the tune repeats. st = { e, d } carries the previous head (start each bar with { e: -1 }).
 */
export function jingleDegree(j, tick, st) {
  const mel = j.mel, [lo, hi] = degRange(j.key);
  let e = 0;
  while (e + 1 < mel.length && mel[e + 1].t <= tick) e++;
  let d = mel[e].d;
  if (e === st.e && st.d != null) {
    const next = e + 1 < mel.length ? mel[e + 1].d : j.land, cur = st.d;
    if (next > cur) d = cur + 1; else if (next < cur) d = cur - 1;
    else d = cur === mel[e].d ? (cur + 1 <= hi ? cur + 1 : cur - 1) : mel[e].d;
    if (d < lo || d > hi || aug2(j.key, d, cur)) d = mel[e].d;
  }
  st.e = e; st.d = d;
  return d;
}
/** The chord under `tick`. */
export const chordAt = (j, tick) => j.chords[Math.max(0, Math.min(3, Math.floor(tick / TPB)))];
/** Pitch class (0-11) of a scale degree. */
export const degPc = (key, d) => (key.pc + STEPS[key.minor ? 'minor' : 'major'][mod7(d)]) % 12;
/** Pitch classes of a chord's tones: [root, third, fifth(, seventh)]. */
export const chordPcs = (key, ch) => [0, 2, 4, 6].slice(0, ch.seventh ? 4 : 3).map((k) => degPc(key, ch.root + k));
