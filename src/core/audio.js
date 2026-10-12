// Procedural Web Audio sound effects + ambient drone music (no audio files needed).
import { G } from '../state.js';

let ac = null, master, sfxBus, musicBus, noiseBuf;
const last = {};
let music = null;

export function initAudio() {
  if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ac = new AC();
  master = ac.createGain(); master.gain.value = 0.9; master.connect(ac.destination);
  const comp = ac.createDynamicsCompressor();
  comp.threshold.value = -16; comp.ratio.value = 6;
  comp.connect(master);
  sfxBus = ac.createGain(); sfxBus.connect(comp);
  musicBus = ac.createGain(); musicBus.connect(master);
  applyVolumes();
  noiseBuf = ac.createBuffer(1, ac.sampleRate * 1.5, ac.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
}

export function applyVolumes() {
  if (!ac) return;
  sfxBus.gain.value = G.settings.sfx;
  musicBus.gain.value = G.settings.music * 0.5;
}

function env(g, t, a, peak, dec, sus = 0.0001) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + a);
  g.gain.exponentialRampToValueAtTime(sus, t + a + dec);
}

function noise(t, dur, { type = 'lowpass', f0 = 1000, f1 = f0, q = 1, vol = 0.5, a = 0.005 } = {}) {
  const src = ac.createBufferSource(); src.buffer = noiseBuf;
  src.playbackRate.value = 0.8 + Math.random() * 0.4;
  const filt = ac.createBiquadFilter(); filt.type = type; filt.Q.value = q;
  filt.frequency.setValueAtTime(f0, t); filt.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  const g = ac.createGain(); env(g, t, a, vol, dur);
  src.connect(filt); filt.connect(g); g.connect(sfxBus);
  src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.05);
}

function tone(t, dur, { wave = 'sine', f0 = 440, f1 = f0, vol = 0.3, a = 0.005, detune = 0 } = {}) {
  const o = ac.createOscillator(); o.type = wave; o.detune.value = detune;
  o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  const g = ac.createGain(); env(g, t, a, vol, dur);
  o.connect(g); g.connect(sfxBus);
  o.start(t); o.stop(t + dur + 0.05);
}

const R = (a, b) => a + Math.random() * (b - a);

const SOUNDS = {
  swing: (t, p) => noise(t, 0.14, { type: 'bandpass', f0: 3000 * p, f1: 600, q: 2, vol: 0.25 }),
  hit: (t, p) => { noise(t, 0.09, { f0: 1800 * p, f1: 300, vol: 0.35 }); tone(t, 0.1, { f0: 160 * p, f1: 60, vol: 0.3 }); },
  crit: (t, p) => { SOUNDS.hit(t, p); tone(t, 0.08, { wave: 'square', f0: 1400, f1: 700, vol: 0.08 }); },
  squish: (t, p) => { noise(t, 0.22, { f0: 900 * p, f1: 120, q: 4, vol: 0.4 }); tone(t, 0.18, { f0: 90, f1: 40, vol: 0.2, wave: 'triangle' }); },
  gore: (t, p) => { noise(t, 0.4, { f0: 1400 * p, f1: 80, q: 3, vol: 0.5 }); noise(t + 0.05, 0.3, { type: 'bandpass', f0: 400, f1: 150, q: 6, vol: 0.35 }); tone(t, 0.3, { f0: 70, f1: 30, vol: 0.35, wave: 'triangle' }); },
  bones: (t, p) => { for (let i = 0; i < 4; i++) tone(t + i * 0.035, 0.05, { wave: 'square', f0: R(700, 1300) * p, f1: 300, vol: 0.06 }); },
  fire: (t, p) => noise(t, 0.35, { f0: 2400 * p, f1: 300, vol: 0.35, a: 0.03 }),
  cold: (t, p) => { tone(t, 0.25, { f0: 2200 * p, f1: 3400, vol: 0.07 }); noise(t, 0.2, { type: 'highpass', f0: 5000, f1: 2500, vol: 0.18 }); },
  light: (t, p) => { const o = ac.createOscillator(); o.type = 'sawtooth'; const g = ac.createGain(); env(g, t, 0.003, 0.12, 0.2); for (let i = 0; i < 8; i++) o.frequency.setValueAtTime(R(150, 1800) * p, t + i * 0.02); o.connect(g); g.connect(sfxBus); o.start(t); o.stop(t + 0.25); noise(t, 0.15, { type: 'highpass', f0: 3000, vol: 0.2 }); },
  arcane: (t, p) => { tone(t, 0.3, { f0: 500 * p, f1: 1400 * p, vol: 0.12 }); tone(t, 0.3, { f0: 750 * p, f1: 2100 * p, vol: 0.06, wave: 'triangle' }); },
  holy: (t, p) => { [523, 659, 784].forEach((f, i) => tone(t + i * 0.02, 0.5, { f0: f * p, vol: 0.07, a: 0.03 })); },
  shadow: (t, p) => { tone(t, 0.4, { wave: 'sawtooth', f0: 220 * p, f1: 55, vol: 0.12 }); noise(t, 0.3, { f0: 600, f1: 100, vol: 0.2 }); },
  poison: (t, p) => { for (let i = 0; i < 5; i++) tone(t + i * 0.04, 0.06, { f0: R(200, 500) * p, f1: R(400, 800), vol: 0.07 }); },
  acid: (t, p) => { noise(t, 0.25, { type: 'bandpass', f0: 500 * p, f1: 200, q: 8, vol: 0.4 }); SOUNDS.poison(t, p * 0.7); },
  blood: (t, p) => SOUNDS.squish(t, p),
  phys: (t, p) => SOUNDS.swing(t, p),
  explode: (t, p) => { noise(t, 0.7, { f0: 1600 * p, f1: 60, vol: 0.7, a: 0.004 }); tone(t, 0.5, { f0: 90 * p, f1: 30, vol: 0.5, wave: 'triangle' }); },
  shoot: (t, p) => { noise(t, 0.12, { type: 'highpass', f0: 2500 * p, f1: 800, vol: 0.4 }); tone(t, 0.06, { wave: 'square', f0: 180, f1: 60, vol: 0.15 }); },
  bow: (t, p) => { tone(t, 0.12, { wave: 'triangle', f0: 320 * p, f1: 180, vol: 0.2 }); noise(t, 0.08, { type: 'bandpass', f0: 2000, f1: 900, q: 3, vol: 0.15 }); },
  pickup: (t) => { tone(t, 0.07, { f0: 660, vol: 0.12 }); tone(t + 0.07, 0.1, { f0: 990, vol: 0.12 }); },
  gold: (t) => { for (let i = 0; i < 3; i++) tone(t + i * 0.05, 0.12, { f0: R(2400, 3600), vol: 0.06, wave: 'triangle' }); },
  orb: (t) => { tone(t, 0.18, { f0: 400, f1: 900, vol: 0.1 }); },
  potion: (t) => { for (let i = 0; i < 4; i++) tone(t + i * 0.06, 0.08, { f0: R(300, 600), f1: R(150, 300), vol: 0.12 }); },
  levelup: (t) => { [392, 523, 659, 784, 1046].forEach((f, i) => tone(t + i * 0.09, 0.5, { f0: f, vol: 0.12, wave: 'triangle' })); },
  portal: (t) => { noise(t, 1.0, { type: 'bandpass', f0: 200, f1: 2400, q: 3, vol: 0.4, a: 0.2 }); tone(t, 1.0, { f0: 200, f1: 800, vol: 0.08, a: 0.2 }); },
  ui: (t) => tone(t, 0.05, { wave: 'triangle', f0: 900, f1: 700, vol: 0.1 }),
  error: (t) => tone(t, 0.18, { wave: 'square', f0: 130, f1: 110, vol: 0.08 }),
  boss: (t) => { tone(t, 1.2, { wave: 'sawtooth', f0: 90, f1: 40, vol: 0.3, a: 0.1 }); noise(t, 1.2, { f0: 800, f1: 100, vol: 0.4, a: 0.1 }); },
  die: (t) => { tone(t, 1.4, { wave: 'sawtooth', f0: 300, f1: 40, vol: 0.25 }); noise(t, 1.0, { f0: 1000, f1: 50, vol: 0.3 }); },
  summon: (t, p) => { noise(t, 0.5, { type: 'bandpass', f0: 300 * p, f1: 1500 * p, q: 4, vol: 0.3, a: 0.1 }); tone(t, 0.4, { f0: 200 * p, f1: 600 * p, vol: 0.06 }); },
  heal: (t) => { [660, 880, 1100].forEach((f, i) => tone(t + i * 0.07, 0.4, { f0: f, vol: 0.07 })); },
  buff: (t, p) => { tone(t, 0.5, { f0: 300 * p, f1: 900 * p, vol: 0.1, a: 0.05 }); noise(t, 0.4, { type: 'highpass', f0: 4000, vol: 0.08, a: 0.1 }); },
  thud: (t, p) => { tone(t, 0.25, { f0: 110 * p, f1: 35, vol: 0.5, wave: 'triangle' }); noise(t, 0.25, { f0: 700, f1: 60, vol: 0.4 }); },
  roar: (t) => { tone(t, 0.6, { wave: 'sawtooth', f0: 140, f1: 70, vol: 0.18, a: 0.05 }); noise(t, 0.6, { type: 'bandpass', f0: 500, f1: 250, q: 2, vol: 0.3, a: 0.05 }); },
  hurt: (t) => { tone(t, 0.15, { wave: 'square', f0: 220, f1: 140, vol: 0.08 }); noise(t, 0.1, { f0: 1200, f1: 300, vol: 0.2 }); },
  block: (t) => { tone(t, 0.12, { wave: 'square', f0: 900, f1: 600, vol: 0.08 }); noise(t, 0.06, { type: 'highpass', f0: 3000, vol: 0.2 }); },
  sonic: (t, p) => { tone(t, 0.3, { wave: 'square', f0: 110 * p, f1: 55, vol: 0.12 }); tone(t, 0.3, { wave: 'square', f0: 165 * p, f1: 82, vol: 0.08 }); },
  note: (t, p) => { const f = [523, 587, 659, 784, 880][Math.floor(Math.random() * 5)]; tone(t, 0.3, { wave: 'triangle', f0: f * p, vol: 0.12 }); },
};

export function sfx(name, vol = 1, pitch = 1) {
  if (!ac || G.settings.sfx <= 0) return;
  const fn = SOUNDS[name];
  if (!fn) return;
  const now = ac.currentTime;
  const l = last[name] || (last[name] = { t: 0, n: 0 });
  if (now - l.t < 0.045) { if (++l.n > 2) return; } else { l.n = 0; }
  l.t = now;
  try {
    const p = pitch * (0.92 + Math.random() * 0.16);
    if (vol !== 1) {
      const g = ac.createGain(); g.gain.value = vol;
      const prev = sfxBus; sfxBus = g; g.connect(prev);
      fn(now, p);
      sfxBus = prev;
    } else fn(now, p);
  } catch (e) { /* audio errors are never fatal */ }
}

// ------------------------------------------------------------------ music
export function playMusic(kind) {
  if (!ac) return;
  if (music && music.kind === kind) return;
  stopMusic();
  const nodes = [];
  const out = ac.createGain(); out.gain.value = 0; out.connect(musicBus);
  out.gain.linearRampToValueAtTime(1, ac.currentTime + 3);
  const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = kind === 'town' ? 900 : 420; lp.Q.value = 2; lp.connect(out);
  const lfo = ac.createOscillator(); lfo.frequency.value = 0.07;
  const lfoG = ac.createGain(); lfoG.gain.value = kind === 'town' ? 250 : 180; lfo.connect(lfoG); lfoG.connect(lp.frequency); lfo.start();
  nodes.push(lfo);
  const roots = kind === 'town' ? [110, 164.8, 220, 277.2] : kind === 'boss' ? [41.2, 43.65, 82.4, 61.7] : [55, 82.4, 110, 65.4];
  roots.forEach((f, i) => {
    const o = ac.createOscillator(); o.type = kind === 'town' ? 'triangle' : 'sawtooth'; o.frequency.value = f;
    o.detune.value = (i % 2 ? 7 : -7);
    const g = ac.createGain(); g.gain.value = kind === 'town' ? 0.05 : 0.07;
    o.connect(g); g.connect(lp); o.start(); nodes.push(o);
  });
  // occasional bell / choir tones
  const bell = setInterval(() => {
    if (!ac) return;
    const t = ac.currentTime;
    const scale = kind === 'town' ? [440, 494, 554, 659, 740] : [110, 130.8, 146.8, 164.8, 196, 220];
    const f = scale[Math.floor(Math.random() * scale.length)] * (kind === 'town' ? 1 : 2);
    const o = ac.createOscillator(); o.type = 'sine'; o.frequency.value = f;
    const g = ac.createGain(); env(g, t, 0.6, 0.05, 4);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + 5);
  }, kind === 'boss' ? 1800 : 5200);
  music = { kind, nodes, out, bell };
}

export function stopMusic() {
  if (!music || !ac) return;
  const m = music; music = null;
  clearInterval(m.bell);
  m.out.gain.cancelScheduledValues(ac.currentTime);
  m.out.gain.setValueAtTime(m.out.gain.value, ac.currentTime);
  m.out.gain.linearRampToValueAtTime(0, ac.currentTime + 1.5);
  setTimeout(() => m.nodes.forEach((n) => { try { n.stop(); } catch (e) { /* ignore */ } }), 1700);
}
