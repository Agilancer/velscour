// The Bard's harpsichord sampler and step sequencer. One-shot samples for every key C2-C7 (MIDI 36-96) in four banks
// (assets/audio/inst/harpsichord/<bank>/<midi>.mp3, cut from the user's pack by `process_assets.py instruments`); the
// pack's seven articulations are those banks at measured gains (instruments.json):
//   normal_held / soft_held / marcato_held   the full pluck, damped when the key is let go (`dur`)
//   normal_short / soft_short / staccato_short / marcato_short   the damper is in the sample
//   loadInstruments()                            fetch + decode once (call after initAudio)
//   playNote('harpsichord', midi, { at, dur, vel, art })
//   playSequence(events, { at, bpm })            schedule [{ midi, beat, beats, vel, art }] on the audio clock
// Samples are decoded at the pack's 22,050 Hz (nothing above 11 kHz) to keep a phone's memory low, and voices are
// capped (the oldest stolen with a short fade) so two busy hands never flood it.
import { audioCtx, audioOut } from './audio.js';

const DIR = new URL('../../assets/audio/inst/', import.meta.url).href;   // relative to this module, so tools/ pages work too
export const INSTRUMENTS = { harpsichord: { name: 'Harpsichord', lo: 36, hi: 96 } };
export const ARTICULATIONS = ['normal_held', 'soft_held', 'marcato_held', 'normal_short', 'soft_short', 'staccato_short', 'marcato_short'];
const ORDER = ['held', 'normal', 'staccato', 'marcato'];   // banks in load order: the singing one first
let man = null, loading = null, bus = null;
const bufs = {};          // bank -> { midi: { buf, off } }
const live = [];          // { src, g, end }
const MAX_VOICES = 40, DAMP = 0.09;
let tap = null, vid = 0;
/** Tests: see every note asked for ({ name, midi, at, dur, vel, art, tag }, plus the audio clock now), even without samples. */
export const setNoteTap = (f) => { tap = f; };

function decoder(ac, rate) { // decode at the pack's rate where the browser allows it (half the memory of 44.1/48 kHz)
  try { const O = window.OfflineAudioContext || window.webkitOfflineAudioContext; if (O && rate) return new O(1, 1, rate); } catch (e) { /* fall back */ }
  return ac;
}
const decode = (ac, data) => new Promise((res, rej) => { const p = ac.decodeAudioData(data, res, rej); if (p && p.catch) p.catch(rej); });
/** Where the pluck starts in a decoded buffer (an MP3 encoder pads the front): just before the first sample above -40 dB. */
function onset(buf) {
  const d = buf.getChannelData(0), n = Math.min(d.length, Math.floor(buf.sampleRate * 0.2));
  for (let i = 0; i < n; i++) if (Math.abs(d[i]) > 0.01) return Math.max(0, i - 8) / buf.sampleRate;
  return 0;
}

/** Fetch and decode every bank (once). Resolves to the number of samples loaded. */
export function loadInstruments() {
  const ac = audioCtx();
  if (!ac) return Promise.resolve(0);
  if (loading) return loading;
  loading = fetch(DIR + 'instruments.json').then((r) => r.json()).then(async (m) => {
    man = m.harpsichord;
    const dec = decoder(ac, man.rate);
    for (const bank of ORDER) { // bank by bank, so the held one can play while the rest arrive
      const def = man.banks[bank];
      if (!def) continue;
      await Promise.all(def.keys.map((k) => fetch(`${DIR}harpsichord/${bank}/${k}.mp3`).then((r) => r.arrayBuffer())
        .then((b) => decode(dec, b.slice(0)).catch(() => (dec === ac ? null : decode(ac, b))))
        .then((buf) => { if (buf) (bufs[bank] || (bufs[bank] = {}))[k] = { buf, off: onset(buf) }; }).catch(() => {})));
    }
    return keysLoaded();
  }).catch(() => { loading = null; return 0; });
  return loading;
}
export const keysLoaded = () => Object.values(bufs).reduce((s, b) => s + Object.keys(b).length, 0);
/** Is the harpsichord ready to sing (its held bank decoded)? */
export const instReady = () => !!bufs.held && Object.keys(bufs.held).length > 0;
/** Audio clock now (0 without a context). */
export const audioNow = () => { const ac = audioCtx(); return ac ? ac.currentTime : 0; };

function out(ac) {
  if (!bus) { // a gentle compressor: two hands of plucks never clip the sfx bus
    bus = ac.createGain(); bus.gain.value = 0.8;
    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -14; comp.knee.value = 10; comp.ratio.value = 4; comp.attack.value = 0.003; comp.release.value = 0.2;
    bus.connect(comp); comp.connect(audioOut());
  }
  return bus;
}
function nearest(set, midi) {
  let best = null;
  for (const k in set) if (best === null || Math.abs(k - midi) < Math.abs(best - midi)) best = +k;
  return best;
}
const artOf = (art) => (man && (man.articulations[art] || man.articulations.normal_held)) || { bank: 'held', gain: 1 };

/**
 * One note. at = audio-clock time (0 = now), dur = seconds the key is held (held articulations are damped then;
 * short ones carry their own damper), vel 0..1 scales the articulation's level. Returns the voice or null.
 */
export function playNote(name, midi, { at = 0, dur = 0.5, vel = 0.8, art = 'normal_held', tag = null } = {}) {
  const ac = audioCtx();
  const id = ++vid;
  if (tap) tap({ id, name, midi, at: Math.max(at, audioNow()), dur, vel, art, tag, now: audioNow() });
  if (!ac || !man) return null;
  const A = artOf(art);
  let bank = A.bank, set = bufs[bank];
  if (!set || !Object.keys(set).length) { bank = 'held'; set = bufs.held; }   // still loading: the held bank, damped short
  if (!set) return null;
  const k = nearest(set, midi);
  if (k === null) return null;
  const { buf, off } = set[k], t = Math.max(at, ac.currentTime);
  const src = ac.createBufferSource(); src.buffer = buf;
  const rate = k !== midi ? Math.pow(2, (midi - k) / 12) : 1;
  if (rate !== 1) src.playbackRate.value = rate;
  const g = ac.createGain(), lvl = Math.max(0.0002, vel * A.gain * 0.9), natural = (buf.duration - off) / rate;
  const held = bank === 'held', hold = held ? Math.min(natural, Math.max(0.05, A.bank === 'held' ? dur : Math.min(dur, 0.35))) : natural;
  g.gain.setValueAtTime(lvl, t);
  if (held && hold < natural) { g.gain.setValueAtTime(lvl, t + hold); g.gain.exponentialRampToValueAtTime(0.0001, t + hold + DAMP); }
  src.connect(g); g.connect(out(ac));
  const end = t + Math.min(natural, hold + DAMP) + 0.02;
  src.start(t, off); src.stop(end);
  const v = { id, src, g, end };
  src.onended = () => { const i = live.indexOf(v); if (i >= 0) live.splice(i, 1); };
  live.push(v);
  while (live.length > MAX_VOICES) fade(live.shift(), 0.04);
  return v;
}
function fade(v, sec) {
  const ac = audioCtx();
  if (!ac || !v) return;
  const t = ac.currentTime;
  if (tap) tap({ stop: v.id, at: t, fade: sec, now: t });
  try {
    v.g.gain.cancelScheduledValues(t); v.g.gain.setValueAtTime(Math.max(0.0002, v.g.gain.value), t);
    v.g.gain.exponentialRampToValueAtTime(0.0001, t + sec); v.src.stop(t + sec + 0.02);
  } catch (e) { /* already stopped */ }
}
/** Fade out voices (a playSequence handle's, or any list) over `sec` seconds; notes not yet started never sound. */
export function stopVoices(voices, sec = 0.08) { for (const v of voices) if (v) fade(v, sec); }

/**
 * The sequencer: schedule events on the audio clock. beat/beats are in quarter notes at `bpm`.
 * Returns { voices, start, spb, stop(sec) }.
 */
export function playSequence(events, { at = 0, bpm = 120, tag = null } = {}) {
  const t0 = Math.max(at, audioNow() + 0.02), spb = 60 / bpm, voices = [];
  for (const e of events) voices.push(playNote('harpsichord', e.midi, { at: t0 + e.beat * spb, dur: (e.beats || 1) * spb * (e.legato ?? 0.95), vel: e.vel ?? 0.8, art: e.art || 'normal_held', tag: e.tag ? { ...tag, ...e.tag } : tag }));
  return { voices, start: t0, spb, stop: (sec) => stopVoices(voices, sec) };
}
