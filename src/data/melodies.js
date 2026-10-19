// The Bard's 2,000 melodies: two-bar harpsichord pieces in nine styles (ballads, baroque inventions, tavern dances,
// courtly dances, fantasy themes, dungeon crawls, laments, chorales with runs over the chords, toccatas). Generated at
// first use from a fixed seed, so the set never changes between loads.
//  - Bar A is the "spell" bar: the Bard writes its rhythm with his skills and the notes take the tune's pitches. It is
//    the antecedent (it ends away from home, usually on the dominant).
//  - Bar B is the finishing bar the harpsichord plays by itself after a Cadence: runs, a second voice, ornaments, and the
//    tonic arriving on beat 3 or 4. Any B whose opening chord and first note follow an A in the same key can finish it
//    (`finishes`), so the 2,000 pairs give tens of thousands of songs.
//  - Every A bar, every B bar and so every melody is unique, even transposed (compared as scale degrees + rhythm).
//  - The left hand (bardmusic.js) plays the style's accompaniment over the chords: Alberti, walking bass, broken
//    chords, oom-pah, drones, ostinatos, a lament bass, block chords, toccata pedals.
// Notes are scale degrees `d` (0 = the tonic near middle C, 7 = an octave up) with an alteration `alt` (-1/0/+1: the
// natural 7th of minor, a raised 6th, the borrowed iv, the Neapolitan), spelled so the staff shows the right letter and
// accidental. Time is in ticks: TPB per beat; a rest has `r: true`.
export const TPB = 24;
export const BAR = 4 * TPB;
const STEPS = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 11] };   // minor = harmonic (raised 7th)
export const NATURAL = [0, 2, 4, 5, 7, 9, 11];   // semitone of each natural letter C D E F G A B
export const LETTERS = 'CDEFGAB';
// letter = the tonic's letter (0 = C), pc = its semitone above C, sig = sharps (+) or flats (-)
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
export const mod7 = (d) => ((d % 7) + 7) % 7;
/**
 * Spell degree d (alteration alt) of a key: { L: letters above C4 (0 = C4), m: semitones above C4, acc: accidental
 * against the natural letter }. midi = 60 + m.
 */
export function degNote(key, d, alt = 0) {
  const L = key.letter + d, m = key.pc + STEPS[key.minor ? 'minor' : 'major'][mod7(d)] + 12 * Math.floor(d / 7) + alt;
  return { L, m, acc: m - (NATURAL[mod7(L)] + 12 * Math.floor(L / 7)) };
}
export const degMidi = (key, d, alt = 0) => 60 + degNote(key, d, alt).m;
/** The right hand's degrees for a key: about B3 to A5, the same register in every key. */
export function degRange(key) {
  let lo = -7, hi = 14;
  while (degMidi(key, lo) < 59) lo++;
  while (degMidi(key, hi) > 81) hi--;
  return [lo, hi];
}

// ---------------------------------------------------------------- chords: tones as [degree, alteration]
const CH = {
  major: {
    I: [[0], [2], [4]], ii: [[1], [3], [5]], iii: [[2], [4], [6]], IV: [[3], [5], [0]], V: [[4], [6], [1]], V7: [[4], [6], [1], [3]],
    vi: [[5], [0], [2]], bVII: [[6, -1], [1], [3]], II: [[1], [3, 1], [5]], iv: [[3], [5, -1], [0]], Ic: [[0], [2], [4]],
  },
  minor: {
    i: [[0], [2], [4]], 'ii°': [[1], [3], [5]], III: [[2], [4], [6, -1]], iv: [[3], [5], [0]], V: [[4], [6], [1]], V7: [[4], [6], [1], [3]],
    VI: [[5], [0], [2]], VII: [[6, -1], [1], [3]], bII: [[1, -1], [3], [5]], v: [[4], [6, -1], [1]], ic: [[0], [2], [4]],
  },
};
const ROMAN_ROOT = { I: 0, i: 0, Ic: 0, ic: 0, ii: 1, 'ii°': 1, II: 1, bII: 1, iii: 2, III: 2, IV: 3, iv: 3, V: 4, V7: 4, v: 4, vi: 5, VI: 5, bVII: 6, VII: 6 };
const chordCache = {};
/** A chord of a mode: { roman, root, tones: [[d, alt]], bass (degree in the bass), dom (a dominant), tonic }. */
export function chord(minor, roman) {
  const k = (minor ? 'm' : 'M') + roman;
  if (chordCache[k]) return chordCache[k];
  const tones = CH[minor ? 'minor' : 'major'][roman].map(([d, a = 0]) => [d, a]);
  return (chordCache[k] = { roman, root: ROMAN_ROOT[roman], tones, bass: roman === 'Ic' || roman === 'ic' ? 4 : ROMAN_ROOT[roman], dom: roman === 'V' || roman === 'V7', tonic: roman === 'I' || roman === 'i' });
}
const toneOf = (ch, d) => ch.tones.find((t) => mod7(t[0]) === mod7(d));
export const inChord = (ch, d) => !!toneOf(ch, d);
/** The alteration degree d takes over chord ch: the chord's own, else minor's natural 7th (raised over V) and 6th. */
export function altOf(key, ch, d) {
  const t = toneOf(ch, d);
  if (t) return t[1];
  if (!key.minor) return ch.roman === 'bVII' && mod7(d) === 6 ? -1 : ch.roman === 'iv' && mod7(d) === 5 ? -1 : 0;
  const k = mod7(d);
  if (k === 6) return ch.dom || ch.roman === 'ii°' ? 0 : -1;
  if (k === 5) return ch.dom ? 1 : 0;
  if (k === 1 && ch.roman === 'bII') return -1;
  return 0;
}
/** Pitch classes of a chord (root first). */
export const chordPcs = (key, ch) => ch.tones.map(([d, a]) => ((degMidi(key, d, a) % 12) + 12) % 12);

// ---------------------------------------------------------------- styles
// Rhythms come in half bars (48 ticks); negative = a rest. A: the spell bar's halves. Bh: the finishing bar's first half
// (the runs). end48 / end72: its second half when the tonic arrives on beat 3 / beat 4 (the arrival is the first onset
// at that tick, and everything after it is a rest or the held tonic).
const H = {
  plain: [[48], [24, 24], [36, 12], [24, 12, 12], [12, 12, 24], [12, 12, 12, 12]],
  lyric: [[48], [36, 12], [24, 24], [24, 12, 12], [12, 12, 24], [18, 6, 24], [12, 24, 12], [24, 18, 6]],
  dotted: [[18, 6, 18, 6], [36, 12], [18, 6, 24], [24, 18, 6], [12, 12, 18, 6], [16, 8, 24]],
  dance: [[12, 12, 12, 12], [18, 6, 12, 12], [12, 12, 24], [24, 12, 12], [12, 6, 6, 12, 12], [6, 6, 12, 24], [18, 6, 24], [12, 12, 6, 6, 12]],
  run: [[6, 6, 6, 6, 6, 6, 6, 6], [6, 6, 6, 6, 24], [24, 6, 6, 6, 6], [12, 12, 6, 6, 6, 6], [6, 6, 6, 6, 12, 12], [12, 6, 6, 12, 6, 6]],
  sparse: [[48], [24, -24], [36, 12], [24, 24], [12, 12, -24], [-12, 12, 24], [36, -12], [24, -12, 12]],
  sigh: [[24, 24], [36, 12], [12, 12, 24], [24, 12, 12], [48], [18, 6, 24]],
  arp: [[6, 6, 6, 6, 6, 6, 6, 6], [6, 6, 6, 6, 24], [12, 6, 6, 6, 6, 6, 6], [6, 6, 6, 6, 6, 6, 12]],
};
const END48 = { hold: [[48]], punch: [[24, -24], [12, -12, -24]], tag: [[36, -12]] };
const END72 = { plain: [[24, 24], [12, 12, 24], [18, 6, 24]], run: [[6, 6, 6, 6, 24], [6, 6, 12, 24]], punch: [[24, 12, -12], [12, 12, 12, -12]] };
const PROGS = {
  major: {
    A: { f: ['I I V V', 'I IV V V', 'I vi IV V', 'I vi ii V', 'I IV I V', 'I V vi V', 'I ii V V', 'I iii IV V', 'I IV ii V', 'I I IV IV', 'IV IV I V', 'I V I V', 'I vi vi V', 'I I ii V'],
      m: ['I bVII IV IV', 'I bVII I V', 'I IV bVII bVII', 'I I bVII IV'], b: ['I iv I V', 'I IV iv V'] },
    B: { f: ['ii V I I', 'IV V I I', 'I V I I', 'ii V7 I I', 'IV Ic V I', 'II V I I', 'V V7 I I', 'vi ii V I', 'I IV V I', 'IV V V I', 'Ic V I I', 'vi V I I'],
      m: ['bVII bVII I I', 'IV bVII I I', 'bVII IV I I'], b: ['IV iv I I', 'ii iv I I'] },
  },
  minor: {
    A: { f: ['i i V V', 'i iv V V', 'i VI iv V', 'i iv i V', 'i ii° V V', 'i i iv iv', 'i VI ii° V', 'iv iv i V', 'i III iv V', 'i iv VI V'],
      m: ['i VII VI V', 'i VI VII VII', 'i VII VI VII', 'i bII i V', 'i i bII V', 'i v iv V', 'i III VII VII', 'VI VII i V'] },
    B: { f: ['iv V i i', 'VI ii° V i', 'ii° V i i', 'iv V7 i i', 'iv ic V i', 'VI iv V i', 'V V7 i i', 'VI V i i', 'i iv V i'],
      m: ['VI VII i i', 'VII VII i i', 'bII V i i', 'iv VII i i', 'bII bII V i', 'v iv V i'] },
  },
};
// mood: which modes; prog: progression families; lh: left-hand patterns; tempo; A/B rhythm sets; end: cadence shapes
export const STYLES = {
  ballad: { name: 'Ballad', modes: ['major', 'minor'], prog: 'fb', lh: ['broken', 'arp'], tempo: [96, 112], A: ['lyric', 'plain'], B: ['lyric', 'run'], end48: ['hold', 'tag'], end72: ['plain'], voice2: true, w: 1,
    forms: ['Ballad', 'Air', 'Lay', 'Serenade', 'Song', 'Lullaby', 'Romance'] },
  baroque: { name: 'Invention', modes: ['major', 'minor'], prog: 'f', lh: ['walking', 'counter'], tempo: [100, 120], A: ['run', 'dance'], B: ['run'], end48: ['hold', 'punch'], end72: ['run', 'plain'], orn: true, w: 1,
    forms: ['Invention', 'Prelude', 'Fughetta', 'Partita', 'Courante', 'Gigue', 'Sinfonia'] },
  tavern: { name: 'Tavern Tune', modes: ['major', 'major', 'minor'], prog: 'fm', lh: ['oompah', 'oompah', 'march'], tempo: [132, 160], A: ['dance', 'dotted'], B: ['dance', 'run'], end48: ['punch', 'hold'], end72: ['punch', 'plain'], voice2: true, w: 1.1,
    forms: ['Jig', 'Reel', 'Hornpipe', 'Drinking Song', 'Romp', 'Shanty', 'Round'] },
  courtly: { name: 'Court Dance', modes: ['major', 'major', 'minor'], prog: 'f', lh: ['alberti'], tempo: [108, 126], A: ['dance', 'dotted', 'plain'], B: ['run', 'dance'], end48: ['hold', 'tag'], end72: ['plain'], orn: true, w: 1,
    forms: ['Gavotte', 'Minuet', 'Bourrée', 'Pavane', 'Galliard', 'Allemande', 'Rigaudon'] },
  fantasy: { name: 'Fantasy Theme', modes: ['major', 'minor', 'minor'], prog: 'fm', lh: ['drone', 'march'], tempo: [104, 124], A: ['dotted', 'lyric'], B: ['run', 'dotted'], end48: ['hold'], end72: ['run', 'plain'], voice2: true, w: 1.1,
    forms: ['Theme', 'Saga', 'Anthem', 'March', 'Quest', 'Legend', 'Overture'] },
  dungeon: { name: 'Dungeon Crawl', modes: ['minor'], prog: 'm', lh: ['ostinato', 'drone'], tempo: [96, 116], A: ['sparse', 'sigh'], B: ['run', 'sparse'], end48: ['hold', 'punch'], end72: ['plain', 'punch'], w: 1.1,
    forms: ['Descent', 'Delve', 'Crawl', 'Catacomb Hymn', 'Vigil', 'Crypt March', 'Undercroft Song'] },
  lament: { name: 'Lament', modes: ['minor'], prog: 'f', lh: ['lament', 'block'], tempo: [96, 108], A: ['sigh', 'lyric'], B: ['sigh', 'run'], end48: ['hold'], end72: ['plain'], voice2: true, orn: true, w: 0.9,
    forms: ['Lament', 'Elegy', 'Dirge', 'Sarabande', 'Threnody', 'Requiem', 'Mourning Air'] },
  chorale: { name: 'Chorale', modes: ['major', 'minor'], prog: 'fb', lh: ['block'], tempo: [96, 116], A: ['run', 'plain'], B: ['run'], end48: ['hold'], end72: ['run', 'plain'], w: 0.9,
    forms: ['Chorale', 'Hymn', 'Carol', 'Canticle', 'Psalm', 'Processional', 'Antiphon'] },
  toccata: { name: 'Toccata', modes: ['minor'], prog: 'fm', lh: ['pedal'], tempo: [112, 132], A: ['arp', 'run'], B: ['arp', 'run'], end48: ['hold', 'punch'], end72: ['run', 'punch'], arp: true, w: 0.9,
    forms: ['Toccata', 'Fantasia', 'Storm', 'Tempest', 'Capriccio', 'Ricercar', 'Etude'] },
};
const ADJ = ['Amber', 'Silver', 'Crooked', 'Drowsy', 'Lantern', 'Merry', 'Hollow', 'Gilded', 'Wandering', 'Velvet', 'Thorny', 'Moonlit',
  'Rusty', 'Laughing', 'Sunken', 'Copper', 'Winter', 'Ember', 'Gallant', 'Restless', 'Ivory', 'Briar', 'Last', 'Little', 'Ashen',
  'Weeping', 'Iron', 'Forgotten', 'Golden', 'Starlit', 'Crimson', 'Shrouded', 'Wicked', 'Broken', 'Hidden', 'Gloaming', 'Bramble',
  'Raven', 'Pale', 'Burning', 'Silent', 'Feasting', 'Ancient', 'Bonny', 'Grim', 'Cursed', 'Blessed', 'Shadowed', 'Hearthlit', 'Drunken'];
const NOUN = ['Tavern', 'Crown', 'Fox', 'Road', 'Bell', 'Raven', 'Harbor', 'Candle', 'Knight', 'Meadow', 'Gate', 'Barrow',
  'Maiden', 'Goblet', 'Tower', 'Mill', 'Pilgrim', 'Moon', 'Dragon', 'Cellar', 'Lute', 'Ferryman', 'Orchard', 'Crypt', 'Throne',
  'Hollow', 'Abbey', 'Wyrm', 'Warden', 'Keep', 'Chalice', 'Forge', 'Altar', 'Ossuary', 'Hearth', 'Banner', 'Lich', 'Shepherd',
  'Mire', 'Sword', 'Queen', 'Wolf', 'Bard', 'Stair', 'Lantern', 'Vault', 'Rose', 'Ember', 'Grave', 'Hound'];

function rng(seed) { // mulberry32
  return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const pick = (r, a) => a[Math.floor(r() * a.length)];
const semis = (key, a, aa, b, ba) => Math.abs(degMidi(key, a, aa) - degMidi(key, b, ba));
const BAD_LEAP = new Set([6, 10, 11]);

function rhythmOf(r, set) {
  const out = [];
  let t = 0;
  for (const half of set) for (const v of half) { out.push({ t, dur: Math.abs(v), r: v < 0 }); t += Math.abs(v); }
  return out;
}
/** Contours for the tune's shape: a target degree offset from the range middle over the bar (x 0..1). */
const SHAPES = [(x) => Math.sin(x * Math.PI) * 3 - 0.5, (x) => -Math.sin(x * Math.PI) * 2.5 + 1, (x) => x * 5 - 2.5, (x) => 2.5 - x * 5,
  (x) => Math.sin(x * Math.PI * 2) * 2.5, (x) => -Math.sin(x * Math.PI * 2) * 2.5, () => 0.5, (x) => (x < 0.5 ? x * 6 - 1 : 4 - x * 6)];

/**
 * Pitch one bar's rhythm over its chords. role 'A' ends away from home; role 'B' lands on the tonic at `arrive`
 * (ticks) and keeps to the tonic chord after it. prev = the last note before the bar ({ d, alt }) or null.
 */
function pitchBar(r, key, style, chords, ev, role, prev, arrive) {
  const [lo, hi] = degRange(key), mid = (lo + hi) / 2, S = STYLES[style];
  const shape = role === 'B' ? (x) => 2 - x * 3.2 : pick(r, SHAPES);
  let p = prev ? { ...prev } : null, prevNct = false, lastLeap = 0, reps = 0, runDir = 0;
  const notes = ev.filter((e) => !e.r), lastNote = notes[notes.length - 1];
  for (let i = 0; i < ev.length; i++) {
    const e = ev[i];
    if (e.r) { continue; }
    const ch = chords[Math.min(3, Math.floor(e.t / TPB))], onBeat = e.t % TPB === 0, quick = e.dur <= 6;
    const isArrive = role === 'B' && e.t === arrive, after = role === 'B' && e.t > arrive, last = e === lastNote;
    const target = mid + shape(e.t / BAR);
    let best = null, bestS = Infinity;
    for (let d = lo; d <= hi; d++) {
      const ct = inChord(ch, d), alt = altOf(key, ch, d);
      if ((onBeat || after || isArrive) && !ct) continue;
      if (isArrive && mod7(d) !== 0 && !(S.voice2 && mod7(d) === 2 && r() < 0.2)) continue;
      if (p && (!ct || prevNct) && Math.abs(d - p.d) !== 1) continue;    // non-chord tones in and out by step
      if (!p && !ct) continue;
      let s = Math.abs(d - target) * 0.5 + r() * 1.7;
      if (p) {
        const iv = Math.abs(d - p.d), st = semis(key, d, alt, p.d, p.alt);
        if (BAD_LEAP.has(st) || st > 12) continue;
        if (iv === 1 && st === 3) continue;                              // augmented second
        if (iv === 1 && st === 0) continue;                              // a step that spells one pitch twice
        const arpOk = (S.arp || quick) && ct && iv >= 2 && iv <= 4 && inChord(ch, p.d);
        s += [1.4, 0, 0.6, 1.7, 2.6, 3.4, 4.2, 5][Math.min(7, iv)] - (arpOk && S.arp ? 1.6 : 0);
        if (iv === 0 && reps >= 1) s += 7;
        if (iv === 0 && quick) s += 3;
        if (lastLeap && (iv > 2 || Math.sign(d - p.d) === Math.sign(lastLeap))) s += 2.4;   // a leap turns back by step
        if (quick && !S.arp && runDir && iv === 1 && Math.sign(d - p.d) === runDir) s -= 1.2; // runs keep going
        if (isArrive && iv > 2 && !(mod7(p.d) === 4 && iv <= 4)) s += 4;  // into the tonic by step (or from the fifth)
      } else s += Math.abs(d - mid) * 0.4;
      if (role === 'A' && last) { const k = mod7(d); s += k === 0 ? 3 : k === 1 || k === 4 || k === 6 ? -1 : 0; }
      if (s < bestS) { bestS = s; best = { d, alt }; }
    }
    if (!best) return false;
    const iv = p ? best.d - p.d : 0;
    reps = p && iv === 0 ? reps + 1 : 0;
    lastLeap = Math.abs(iv) >= 3 ? iv : 0;
    runDir = quick && Math.abs(iv) === 1 ? Math.sign(iv) : quick ? runDir : 0;
    Object.assign(e, best);
    p = best; prevNct = !inChord(ch, best.d);
  }
  return true;
}

/** Rule check of one bar (also used by the tests). Returns a list of faults. */
export function barFaults(key, chords, ev, role, prev, arrive) {
  const f = [], notes = ev.filter((e) => !e.r);
  if (!notes.length) return ['no notes'];
  if (ev[0].r || ev[0].t !== 0) f.push('no note on the downbeat');
  const ms = notes.map((e) => degMidi(key, e.d, e.alt)), [lo, hi] = degRange(key), span = Math.max(...ms) - Math.min(...ms);
  if (span > 16) f.push('range ' + span);
  if (notes.some((e) => e.d < lo || e.d > hi)) f.push('out of range');
  if (new Set(notes.map((e) => e.d)).size < Math.min(3, notes.length)) f.push('too few pitches');
  let p = prev, pch = null, pct = true, run = 0;
  ev.forEach((e) => {
    if (e.r) return;
    const ch = chords[Math.min(3, Math.floor(e.t / TPB))], ct = inChord(ch, e.d);
    if (e.alt !== altOf(key, ch, e.d)) f.push('alteration');
    if (e.t % TPB === 0 && !ct) f.push(`beat note at ${e.t} not a chord tone`);
    if (p) {
      const st = semis(key, e.d, e.alt, p.d, p.alt), iv = Math.abs(e.d - p.d);
      if (BAD_LEAP.has(st) || st > 12) f.push(`leap ${st} at ${e.t}`);
      if (iv === 1 && st === 3) f.push('augmented second');
      if ((!ct || !pct) && iv !== 1) f.push(`non-chord tone not by step at ${e.t}`);
      run = iv === 0 ? run + 1 : 0;
      if (run >= 2) f.push('three repeats');
    }
    p = e; pch = ch; pct = ct;
  });
  void pch;
  if (role === 'B') {
    const a = notes.find((e) => e.t === arrive);
    if (!a) f.push('no arrival');
    else {
      if (mod7(a.d) !== 0 && mod7(a.d) !== 2) f.push('arrival not on the tonic');
      if (notes.some((e) => e.t > arrive && !inChord(chords[3], e.d))) f.push('after the arrival, off the tonic chord');
      if (!chords[Math.floor(arrive / TPB)].tonic) f.push('arrival chord is not the tonic');
    }
  }
  return f;
}

const progsFor = (mode, part, fam) => [...fam].flatMap((c) => PROGS[mode][part][c] || []);
const chordsOf = (minor, s) => s.split(' ').map((x) => chord(minor, x));
/** Does chord b follow chord a well (root up a step, a fourth, down a third, plagal or the same chord)? */
export function follows(a, b) {
  const mv = mod7(b.root - a.root);
  return mv === 0 || mv === 1 || mv === 3 || mv === 5 || (mv === 4 && (a.tonic || a.root === 3)) || (mv === 6 && a.root === 6);
}
const sigOf = (ev) => ev.map((e) => (e.r ? `r${e.dur}` : `${e.dur}:${e.d}${e.alt ? (e.alt > 0 ? '#' : 'b') : ''}`)).join(',');

function compose(r, style, key) {
  const S = STYLES[style], mode = key.minor ? 'minor' : 'major';
  const pa = progsFor(mode, 'A', S.prog), pb = progsFor(mode, 'B', S.prog);
  if (!pa.length || !pb.length) return null;
  const A = chordsOf(key.minor, pick(r, pa));
  const okB = pb.map((s) => chordsOf(key.minor, s)).filter((b) => follows(A[3], b[0]));
  if (!okB.length) return null;
  const B = pick(r, okB);
  const evA = rhythmOf(r, [pick(r, H[pick(r, S.A)]), pick(r, H[pick(r, S.A)])]);
  if (evA[0].r) return null;
  if (!pitchBar(r, key, style, A, evA, 'A', null)) return null;
  if (barFaults(key, A, evA, 'A', null).length) return null;
  const arrive = B[2].tonic ? 48 : 72;
  const end = arrive === 48 ? END48[pick(r, S.end48)] : END72[pick(r, S.end72)];
  const evB = rhythmOf(r, [pick(r, H[pick(r, S.B)]), pick(r, end)]);
  const lastA = evA.filter((e) => !e.r).pop();
  if (!pitchBar(r, key, style, B, evB, 'B', lastA, arrive)) return null;
  if (barFaults(key, B, evB, 'B', lastA, arrive).length) return null;
  if (Math.abs(evB[0].d - lastA.d) > 4) return null;
  return {
    style, key, A: { chords: A, rh: evA, lh: pick(r, S.lh) }, B: { chords: B, rh: evB, lh: pick(r, S.lh), arrive },
    tempo: S.tempo[0] + Math.floor(r() * ((S.tempo[1] - S.tempo[0]) / 4 + 1)) * 4,
    orn: S.orn && r() < 0.7, voice2: S.voice2 && r() < 0.75,
  };
}

export const MELODY_COUNT = 2000;
let built = null;
function build() {
  const r = rng(0x8a2d51c3), out = [], seenA = new Set(), seenB = new Set(), names = new Set();
  // a fixed share per style (its weight), its modes taken in turn and each mode's keys in turn: every key gets plenty
  const styles = Object.keys(STYLES), tw = styles.reduce((a, s) => a + STYLES[s].w, 0), plan = [];
  for (const s of styles) for (let k = Math.round((MELODY_COUNT * STYLES[s].w) / tw); k > 0; k--) plan.push(s);
  while (plan.length < MELODY_COUNT) plan.push(styles[plan.length % styles.length]);
  plan.length = MELODY_COUNT;
  for (let i = plan.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [plan[i], plan[j]] = [plan[j], plan[i]]; }
  const turn = {};
  for (const style of plan) {
    const S = STYLES[style], c = (turn[style] = (turn[style] || 0) + 1), mode = S.modes[c % S.modes.length];
    const keys = KEYS.filter((k) => !!k.minor === (mode === 'minor')), key = keys[Math.floor(c / S.modes.length) % keys.length];
    let m = null;
    for (let tries = 0; tries < 4000 && !m; tries++) {
      m = compose(r, style, key);
      if (m && (seenA.has(sigOf(m.A.rh)) || seenB.has(sigOf(m.B.rh)))) m = null;
    }
    if (!m) continue;
    const sa = sigOf(m.A.rh), sb = sigOf(m.B.rh);   // key-free: no tune twice, not even transposed
    let name, n = 0;
    do name = `${pick(r, S.forms)} of the ${pick(r, ADJ)} ${pick(r, NOUN)}`; while ((names.has(name) || /(\w+) \1$/.test(name)) && ++n < 50);
    if (names.has(name)) continue;
    seenA.add(sa); seenB.add(sb); names.add(name);
    m.id = out.length; m.name = name; m.sigA = sa; m.sigB = sb;
    out.push(m);
  }
  return out;
}
/** All melodies (built on first use, ~0.1 s). */
export function melodies() { return built || (built = build()); }
const byKey = new Map();
/** Melody ids in a key. */
export function inKey(keyId) {
  if (!byKey.size) for (const m of melodies()) { if (!byKey.has(m.key.id)) byKey.set(m.key.id, []); byKey.get(m.key.id).push(m.id); }
  return byKey.get(keyId) || [];
}
const finCache = new Map();
/**
 * The finishing bars that can follow melody a's spell bar: same key, B's opening chord follows A's last chord, and its
 * first note is within a fifth of A's last. Always includes a's own.
 */
export function finishes(a) {
  if (finCache.has(a)) return finCache.get(a);
  const M = melodies(), A = M[a], lastA = A.A.rh.filter((e) => !e.r).pop();
  const out = inKey(A.key.id).filter((b) => b === a || (follows(A.A.chords[3], M[b].B.chords[0]) && Math.abs(M[b].B.rh[0].d - lastA.d) <= 4));
  finCache.set(a, out);
  return out;
}
/** The chord under a tick of a bar. */
export const chordAt = (bar, tick) => bar.chords[Math.max(0, Math.min(3, Math.floor(tick / TPB)))];
