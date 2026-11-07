// The Bard's acoustic plucked lute sampler and step sequencer (MIDI 36-96).
// Synthesizes authentic acoustic Renaissance plucked lute string tones with physical plectrum attack transient,
// warm dual-string course detuning (+/- 3.5 cents), dynamic lowpass damping, and soundboard wooden body resonance.
import { audioCtx, audioOut } from './audio.js';

export const INSTRUMENTS = {
  lute: { name: 'Acoustic Lute', lo: 36, hi: 96 },
  harpsichord: { name: 'Acoustic Lute', lo: 36, hi: 96 }
};
export const ARTICULATIONS = ['normal_held', 'soft_held', 'marcato_held', 'normal_short', 'soft_short', 'staccato_short', 'marcato_short'];

let bus = null;
const live = [];          // { id, src, srcs, g, end }
const MAX_VOICES = 40;
let tap = null, vid = 0;

/** Tests: see every note asked for ({ name, midi, at, dur, vel, art, tag }, plus the audio clock now). */
export const setNoteTap = (f) => { tap = f; };

/** Initialize and ready the lute instrument. */
export function loadInstruments() {
  return Promise.resolve(61);
}
export const keysLoaded = () => 61;
/** Is the acoustic lute ready to sing? */
export const instReady = () => true;
/** Audio clock now (0 without a context). */
export const audioNow = () => { const ac = audioCtx(); return ac ? ac.currentTime : 0; };

function out(ac) {
  if (!bus) {
    bus = ac.createGain();
    bus.gain.value = 0.9;

    // Lute wooden bowl resonator: warm 280 Hz body resonance
    const bodyRes = ac.createBiquadFilter();
    bodyRes.type = 'peaking';
    bodyRes.frequency.value = 280;
    bodyRes.Q.value = 1.4;
    bodyRes.gain.value = 4.5;

    // Soft gut/nylon string warmer: roll off metallic brittle highs above 3800 Hz
    const stringWarm = ac.createBiquadFilter();
    stringWarm.type = 'lowpass';
    stringWarm.frequency.value = 3800;
    stringWarm.Q.value = 0.7;

    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -12;
    comp.knee.value = 8;
    comp.ratio.value = 3.5;
    comp.attack.value = 0.002;
    comp.release.value = 0.18;

    bus.connect(bodyRes);
    bodyRes.connect(stringWarm);
    stringWarm.connect(comp);
    comp.connect(audioOut());
  }
  return bus;
}

/**
 * Play an authentic acoustic plucked lute note at a given MIDI pitch.
 */
function playLuteNote(ac, midi, { at = 0, dur = 0.5, vel = 0.8, art = 'normal_held', id } = {}) {
  const t = Math.max(at, ac.currentTime);
  const freq = 440 * Math.pow(2, (midi - 69) / 12);
  const outNode = out(ac);

  const isShort = art.includes('short') || art.includes('staccato');
  const isSoft = art.includes('soft');
  const isMarcato = art.includes('marcato');
  const holdDur = isShort ? Math.min(dur, 0.2) : Math.max(0.12, dur);
  const totalDur = holdDur + (isShort ? 0.25 : 0.45);

  // 1. Master note gain envelope
  const g = ac.createGain();
  const baseVol = Math.max(0.01, Math.min(1.0, vel * (isSoft ? 0.35 : isMarcato ? 0.65 : 0.52)));
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(baseVol, t + 0.0025); // fast plectrum pluck onset
  const decayVol = baseVol * (isShort ? 0.2 : isSoft ? 0.5 : 0.62);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0001, decayVol), t + (isShort ? 0.05 : 0.1));
  g.gain.setValueAtTime(Math.max(0.0001, decayVol), t + holdDur);
  g.gain.exponentialRampToValueAtTime(0.0001, t + totalDur);

  // 2. Dual gut-string courses (paired strings with slight detuning shimmer, like an authentic lute)
  // Primary string: warm triangle fundamental
  const osc1 = ac.createOscillator();
  osc1.type = 'triangle';
  osc1.frequency.setValueAtTime(freq, t);
  osc1.detune.setValueAtTime(-3.5, t);

  // Secondary string: soft sawtooth for acoustic overtone shimmer
  const osc2 = ac.createOscillator();
  osc2.type = 'sawtooth';
  osc2.frequency.setValueAtTime(freq, t);
  osc2.detune.setValueAtTime(3.5, t);

  // Sub fundamental for deep bass notes (< MIDI 55)
  let oscSub = null;
  if (midi < 55) {
    oscSub = ac.createOscillator();
    oscSub.type = 'sine';
    oscSub.frequency.setValueAtTime(freq, t);
  }

  const g1 = ac.createGain();
  g1.gain.value = 0.76;
  const g2 = ac.createGain();
  g2.gain.value = isSoft ? 0.18 : 0.28;

  osc1.connect(g1);
  osc2.connect(g2);

  // 3. Dynamic lowpass damping filter (initial bright pluck rapidly warms into acoustic decay)
  const filter = ac.createBiquadFilter();
  filter.type = 'lowpass';
  filter.Q.value = 1.9;
  const startCutoff = Math.min(4200, Math.max(1200, freq * (isSoft ? 4.0 : 6.0)));
  const endCutoff = Math.max(180, freq * 1.5);
  filter.frequency.setValueAtTime(startCutoff, t);
  filter.frequency.exponentialRampToValueAtTime(endCutoff, t + (isShort ? 0.08 : 0.2));

  g1.connect(filter);
  g2.connect(filter);

  if (oscSub) {
    const gSub = ac.createGain();
    gSub.gain.value = 0.35;
    oscSub.connect(gSub);
    gSub.connect(filter);
    oscSub.start(t);
    oscSub.stop(t + totalDur + 0.02);
  }

  // 4. Pluck attack transient (white noise puff simulating plectrum/finger friction on gut string)
  const noiseDur = 0.02;
  const bufferSize = Math.floor(ac.sampleRate * noiseDur);
  if (bufferSize > 0) {
    const noiseBuffer = ac.createBuffer(1, bufferSize, ac.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
    }
    const noiseSource = ac.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    const noiseFilter = ac.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(Math.min(3200, freq * 3.5), t);
    noiseFilter.Q.value = 2.8;
    const noiseGain = ac.createGain();
    noiseGain.gain.setValueAtTime(baseVol * 0.22, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, t + noiseDur);
    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(filter);
    noiseSource.start(t);
    noiseSource.stop(t + noiseDur);
  }

  filter.connect(g);
  g.connect(outNode);

  osc1.start(t);
  osc2.start(t);
  const end = t + totalDur;
  osc1.stop(end + 0.02);
  osc2.stop(end + 0.02);

  const srcs = [osc1, osc2, ...(oscSub ? [oscSub] : [])];
  const v = { id, src: osc1, srcs, g, end };
  osc1.onended = () => {
    const i = live.indexOf(v);
    if (i >= 0) live.splice(i, 1);
    try {
      g.disconnect();
      filter.disconnect();
      g1.disconnect();
      g2.disconnect();
    } catch (e) {}
  };

  live.push(v);
  while (live.length > MAX_VOICES) fade(live.shift(), 0.04);
  return v;
}

/**
 * One note. at = audio-clock time (0 = now), dur = seconds the key is held, vel 0..1 scales the level. Returns the voice or null.
 */
export function playNote(name, midi, { at = 0, dur = 0.5, vel = 0.8, art = 'normal_held', tag = null } = {}) {
  const ac = audioCtx();
  const id = ++vid;
  if (tap) tap({ id, name, midi, at: Math.max(at, audioNow()), dur, vel, art, tag, now: audioNow() });
  if (!ac) return null;
  return playLuteNote(ac, midi, { at, dur, vel, art, id });
}

function fade(v, sec) {
  const ac = audioCtx();
  if (!ac || !v) return;
  const t = ac.currentTime;
  if (tap) tap({ stop: v.id, at: t, fade: sec, now: t });
  try {
    v.g.gain.cancelScheduledValues(t);
    v.g.gain.setValueAtTime(Math.max(0.0002, v.g.gain.value), t);
    v.g.gain.exponentialRampToValueAtTime(0.0001, t + sec);
    if (v.srcs) {
      for (const s of v.srcs) s.stop(t + sec + 0.02);
    } else if (v.src) {
      v.src.stop(t + sec + 0.02);
    }
  } catch (e) { /* already stopped */ }
}

/** Fade out voices over `sec` seconds; notes not yet started never sound. */
export function stopVoices(voices, sec = 0.08) {
  for (const v of voices) if (v) fade(v, sec);
}

/**
 * The sequencer: schedule events on the audio clock. beat/beats are in quarter notes at `bpm`.
 * Returns { voices, start, spb, stop(sec) }.
 */
export function playSequence(events, { at = 0, bpm = 120, tag = null } = {}) {
  const t0 = Math.max(at, audioNow() + 0.02), spb = 60 / bpm, voices = [];
  for (const e of events) {
    voices.push(playNote('lute', e.midi, {
      at: t0 + e.beat * spb,
      dur: (e.beats || 1) * spb * (e.legato ?? 0.95),
      vel: e.vel ?? 0.8,
      art: e.art || 'normal_held',
      tag: e.tag ? { ...tag, ...e.tag } : tag
    }));
  }
  return { voices, start: t0, spb, stop: (sec) => stopVoices(voices, sec) };
}
