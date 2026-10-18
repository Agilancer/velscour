// The instrument sampler and step sequencer. Chromatic one-shot samples (assets/audio/inst/<name>/<midi>.mp3, cut
// from the user's packs by `process_assets.py instruments`) play through the shared Web Audio context:
//   loadInstruments()                      fetch + decode every key once (call after initAudio)
//   playNote(name, midi, { at, dur, vel })  one voice; a missing key is repitched from the nearest sample
//   playSequence(events, { at, bpm })       schedule [{ inst, midi, beat, beats, vel }] on the audio clock
// Voices are capped (oldest stolen with a short fade) so a burst of notes never floods a phone.
import { audioCtx, audioOut } from './audio.js';

const DIR = new URL('../../assets/audio/inst/', import.meta.url).href;   // relative to this module, so tools/ pages work too
export const INSTRUMENTS = {
  piano: { name: 'Piano', lo: 48, hi: 71, release: 0.32 },
  harpsichord: { name: 'Harpsichord', lo: 60, hi: 72, release: 0.12 },
};
const bufs = {};          // name -> { midi: AudioBuffer }
let loading = null, bus = null;
const live = [];          // { src, g, end }
const MAX_VOICES = 36;
let tap = null, vid = 0;
/** Tests: see every note asked for ({ name, midi, at, dur, vel, tag }, plus the audio clock now), even without samples. */
export const setNoteTap = (f) => { tap = f; };

const decode = (ac, data) => new Promise((res, rej) => { const p = ac.decodeAudioData(data, res, rej); if (p && p.catch) p.catch(rej); });

/** Fetch and decode every instrument key (once). Resolves to the number of keys loaded. */
export function loadInstruments() {
  const ac = audioCtx();
  if (!ac) return Promise.resolve(0);
  if (loading) return loading;
  loading = fetch(DIR + 'instruments.json').then((r) => r.json()).then((man) => Promise.all(Object.entries(man).flatMap(([name, def]) => def.keys.map((k) =>
    fetch(`${DIR}${name}/${k}.mp3`).then((r) => r.arrayBuffer()).then((b) => decode(ac, b)).then((buf) => { (bufs[name] || (bufs[name] = {}))[k] = buf; }).catch(() => {})))))
    .then(() => keysLoaded()).catch(() => { loading = null; return 0; });
  return loading;
}
export const keysLoaded = () => Object.values(bufs).reduce((s, b) => s + Object.keys(b).length, 0);
export const instReady = (name) => !!bufs[name] && Object.keys(bufs[name]).length > 0;
/** Audio clock now (0 without a context). */
export const audioNow = () => { const ac = audioCtx(); return ac ? ac.currentTime : 0; };

function out(ac) {
  if (!bus) { bus = ac.createGain(); bus.gain.value = 0.85; bus.connect(audioOut()); }
  return bus;
}
function nearest(set, midi) {
  let best = null;
  for (const k in set) if (best === null || Math.abs(k - midi) < Math.abs(best - midi)) best = +k;
  return best;
}

/**
 * One note. at = audio-clock time (0 = now), dur = seconds held before the release, vel 0..1.
 * Returns the voice (for stopVoices) or null when the instrument is not loaded.
 */
export function playNote(name, midi, { at = 0, dur = 0.5, vel = 0.8, tag = null } = {}) {
  const ac = audioCtx(), set = bufs[name];
  const id = ++vid;
  if (tap) tap({ id, name, midi, at: Math.max(at, audioNow()), dur, vel, tag, now: audioNow() });
  if (!ac || !set) return null;
  const k = nearest(set, midi);
  if (k === null) return null;
  const t = Math.max(at, ac.currentTime), rel = (INSTRUMENTS[name] || {}).release || 0.25;
  const src = ac.createBufferSource(); src.buffer = set[k];
  if (k !== midi) src.playbackRate.value = Math.pow(2, (midi - k) / 12);
  const g = ac.createGain(), peak = Math.max(0.0002, vel * vel * 0.9), off = t + Math.max(0.04, dur);
  g.gain.setValueAtTime(peak, t);
  g.gain.setValueAtTime(peak, off);
  g.gain.exponentialRampToValueAtTime(0.0001, off + rel);
  src.connect(g); g.connect(out(ac));
  src.start(t); src.stop(off + rel + 0.02);
  const v = { id, src, g, end: off + rel };
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
  if (tag) events = events.map((e) => ({ ...e, tag }));
  const t0 = Math.max(at, audioNow() + 0.02), spb = 60 / bpm, voices = [];
  for (const e of events) voices.push(playNote(e.inst, e.midi, { at: t0 + e.beat * spb, dur: (e.beats || 1) * spb * (e.legato ?? 0.95), vel: e.vel ?? 0.8, tag: e.tag }));
  return { voices, start: t0, spb, stop: (sec) => stopVoices(voices, sec) };
}
