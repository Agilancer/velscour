// Sound: the user's samples (assets/audio/, imported by `process_assets.py audio`), with procedural Web Audio
// fallbacks for sounds that have no sample (or until the samples finish loading), plus the music + ambience directors.
//   sfx(name)           one-shot: a random sample from SAMPLES[name] if loaded, else the procedural SOUNDS[name]
//   playMusic(kind)     'title' | 'town': songs with quiet breaks between them (dungeons have ambience only)
//   setAmbience(key)    a biome id or 'town' / 'title': a looped ambient bed that drifts louder and softer
// Songs and beds stream through <audio> elements routed into the Web Audio graph, so they're never fully decoded.
import { G } from '../state.js';

let ac = null, master, sfxBus, musicBus, ambBus, noiseBuf, pulseWave;
let fanfareEnd = 0;
const last = {};
const AUDIO = 'assets/audio/';
let manifest = null;               // assets/audio/audio.json
const buffers = {};                // sample slug -> AudioBuffer
const voices = {};                 // sound name -> live sample voices (capped)

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
  ambBus = ac.createGain(); ambBus.connect(master);
  applyVolumes();
  noiseBuf = ac.createBuffer(1, ac.sampleRate * 1.5, ac.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  // 25% pulse, the classic arcade lead
  const n = 32, re = new Float32Array(n), im = new Float32Array(n);
  for (let k = 1; k < n; k++) im[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * 0.25);
  pulseWave = ac.createPeriodicWave(re, im);
  decks.music = [new Deck(musicBus), new Deck(musicBus)];
  decks.amb = [new Deck(ambBus), new Deck(ambBus)];
  for (const k in decks) for (const dk of decks[k]) dk.unlock();   // iOS: media elements must first play inside a gesture
  loadSamples();
  setInterval(tick, 250);
  if (pending.music) { const m = pending.music; pending.music = null; playMusic(m.kind, m.opts); }
  if (pending.amb) { const a = pending.amb; pending.amb = null; setAmbience(a); }
}

export const audioReady = () => !!ac && ac.state === 'running';
/** For tests: what's loaded and playing. */
export const audioStats = () => ({ samples: Object.keys(buffers).length, music: music && music.kind, song: music && music.song, amb: amb && amb.bed });

export function applyVolumes() {
  if (!ac) return;
  sfxBus.gain.value = G.settings.sfx;
  musicBus.gain.value = G.settings.music;
  ambBus.gain.value = G.settings.amb ?? 0.5;
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
  const o = ac.createOscillator(); o.detune.value = detune;
  if (wave === 'pulse') o.setPeriodicWave(pulseWave); else o.type = wave;
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
  critping: (t) => tone(t, 0.08, { wave: 'square', f0: 1400, f1: 700, vol: 0.06 }),
  chest: (t) => { SOUNDS.thud(t, 1.4); SOUNDS.pickup(t + 0.1); },
  door: (t) => SOUNDS.thud(t, 0.7),
  gate: (t) => { tone(t, 0.8, { wave: 'sawtooth', f0: 70, f1: 50, vol: 0.12 }); noise(t, 0.8, { type: 'bandpass', f0: 900, f1: 400, q: 6, vol: 0.2 }); },
  step: (t, p) => noise(t, 0.05, { f0: 700 * p, f1: 200, vol: 0.06 }),
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
    if (playSample(name, vol, p, now)) return;
    if (vol !== 1) {
      const g = ac.createGain(); g.gain.value = vol;
      const prev = sfxBus; sfxBus = g; g.connect(prev);
      fn(now, p);
      sfxBus = prev;
    } else fn(now, p);
  } catch (e) { /* audio errors are never fatal */ }
}


// ------------------------------------------------------------------ level up
const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12); // MIDI note -> Hz

/**
 * Grim level-up toll: a rising dread swell, then a sub boom, a cracked funeral bell and a low diminished choir drone.
 * Returns { voiceAt, voiceDur } (the moment of the toll, 0), or null when sound is off or one is still ringing.
 */
export function levelUpFanfare() {
  if (!ac || G.settings.sfx <= 0) return null;
  const now = ac.currentTime;
  if (now < fanfareEnd) return null;
  const t0 = now + 0.02, ts = t0 + 0.55;
  try {
    // dread swell into the toll
    noise(t0, 0.6, { type: 'bandpass', f0: 120, f1: 900, q: 2, vol: 0.3, a: 0.5 });
    tone(t0, 0.6, { f0: 40, f1: 70, vol: 0.25, a: 0.5 });
    // the toll: sub boom, thud, a cracked low bell (inharmonic partials)
    tone(ts, 1.4, { f0: 70, f1: 26, vol: 0.7, a: 0.003 });
    noise(ts, 0.5, { f0: 500, f1: 60, vol: 0.6, a: 0.002 });
    [[0.5, 0.2], [1, 0.16], [1.19, 0.1], [1.5, 0.07], [2, 0.06], [2.74, 0.04], [3.76, 0.025]].forEach(([m, v], i) =>
      tone(ts, 3.6 - i * 0.3, { f0: 98 * m, f1: 98 * m * 0.985, vol: v, a: 0.004, detune: i % 2 ? 6 : -6 }));
    // a low diminished choir under it (D, F, Ab), detuned saws through a dark filter
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 520; lp.connect(sfxBus);
    [38, 41, 44, 50].forEach((n, i) => [-9, 9].forEach((dt) => {
      const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = NOTE(n); o.detune.value = dt;
      const g = ac.createGain(); g.gain.setValueAtTime(0.0001, ts); g.gain.exponentialRampToValueAtTime(0.03 - i * 0.004, ts + 0.6);
      g.gain.exponentialRampToValueAtTime(0.0001, ts + 3.4);
      o.connect(g); g.connect(lp); o.start(ts); o.stop(ts + 3.5);
    }));
    noise(ts + 0.3, 2.6, { type: 'bandpass', f0: 380, f1: 180, q: 4, vol: 0.12, a: 0.8 });   // a breath in the dark
  } catch (e) { /* audio errors are never fatal */ }
  const voiceAt = 0.57, voiceDur = 0;
  const end = voiceAt + 3;
  fanfareEnd = now + end;
  // duck the music and ambience under it
  for (const [bus, v] of [[musicBus, G.settings.music], [ambBus, G.settings.amb ?? 0.5]]) {
    const g = bus.gain;
    g.cancelScheduledValues(now); g.setValueAtTime(v, now);
    g.linearRampToValueAtTime(v * 0.25, now + 0.15); g.setValueAtTime(v * 0.25, now + end);
    g.linearRampToValueAtTime(v, now + end + 1.2);
  }
  return { voiceAt, voiceDur };
}

// ------------------------------------------------------------------ samples
const n3 = (base, n) => Array.from({ length: n }, (_, i) => `${base}_${i + 1}`);
const STEP = (kind) => ({ s: [...n3(`${kind}_walk`, 5), ...n3(`${kind}_run`, 5)], v: 0.2, max: 2 }); // missing slugs are skipped
// sound name -> { s: sample slugs (one picked at random), v: gain, layer: procedural sound played on top, max: voices }
const SAMPLES = {
  swing: { s: [...n3('sword_attack', 3), ...n3('torch_attack_strike', 2)], v: 0.5 },
  phys: { s: n3('sword_attack', 3), v: 0.5 },
  hit: { s: [...n3('sword_impact_hit', 3), ...n3('bow_impact_hit', 3), ...n3('torch_impact', 2)], v: 0.55 },
  crit: { s: n3('sword_impact_hit', 3), v: 0.75, layer: 'critping' },
  block: { s: [...n3('sword_blocked', 3), ...n3('sword_parry', 3), ...n3('bow_blocked', 3)], v: 0.55 },
  bow: { s: n3('bow_attack', 2), v: 0.55 },
  fire: { s: [...n3('fireball', 3), ...n3('firespray', 2)], v: 0.45 },
  cold: { s: [...n3('ice_throw', 2), ...n3('ice_freeze', 2), ...n3('ice_barrage', 2), ...n3('ice_wall', 2)], v: 0.45 },
  acid: { s: [...n3('waterspray', 2), ...n3('wave_attack', 2)], v: 0.4 },
  thud: { s: n3('rock_wall', 2), v: 0.35, max: 2 },
  arcane: { s: n3('spell_impact', 3), v: 0.5 },
  explode: { s: [...n3('rock_meteor_throw', 2), ...n3('rock_meteor_swarm', 2)], v: 0.55, layer: 'explode' },
  buff: { s: [...n3('firebuff', 2), ...n3('light_torch', 2), ...n3('light_torch_with_starting_loop', 2)], v: 0.4, max: 1 },
  chest: { s: [...n3('chest_open', 2), ...n3('chest_close', 2), 'lock_unlock'], v: 0.7, max: 1 },
  door: { s: [...n3('door_open', 2), ...n3('door_close', 2)], v: 0.45, max: 2 },
  gate: { s: ['gate_open', 'gate_close', 'portcullis_gate'], v: 0.7, max: 1 },
  step_stone: STEP('stone'), step_dirt: STEP('dirt'), step_water: STEP('water'), step_wood: STEP('wood'),
};

async function loadSamples() {
  try {
    manifest = await (await fetch(AUDIO + 'audio.json')).json();
  } catch (e) { return; }   // no audio files: everything stays procedural
  const want = [...new Set(Object.values(SAMPLES).flatMap((d) => d.s))].filter((k) => manifest.sfx.includes(k));
  let i = 0;
  const worker = async () => {
    while (i < want.length) {
      const k = want[i++];
      try {
        const data = await (await fetch(`${AUDIO}sfx/${k}.mp3`)).arrayBuffer();
        buffers[k] = await new Promise((ok, no) => ac.decodeAudioData(data, ok, no));
      } catch (e) { /* that sound stays procedural */ }
    }
  };
  await Promise.all([worker(), worker(), worker(), worker()]);
}

function playSample(name, vol, p, now) {
  const d = SAMPLES[name];
  if (!d) return false;
  const ready = d.s.filter((k) => buffers[k]);
  if (!ready.length) return false;
  const live = voices[name] || (voices[name] = []);
  for (let i = live.length - 1; i >= 0; i--) if (live[i] < now) live.splice(i, 1);
  if (live.length >= (d.max || 3)) return true;   // enough of this sound already playing
  const buf = ready[Math.floor(Math.random() * ready.length)];
  const src = ac.createBufferSource(); src.buffer = buffers[buf]; src.playbackRate.value = p;
  const g = ac.createGain(); g.gain.value = d.v * vol;
  src.connect(g); g.connect(sfxBus); src.start(now);
  live.push(now + buffers[buf].duration / p);
  if (d.layer) {
    const lg = ac.createGain(); lg.gain.value = vol * 0.6; lg.connect(sfxBus);
    const prev = sfxBus; sfxBus = lg; SOUNDS[d.layer](now, p); sfxBus = prev;
  }
  return true;
}

/** Footsteps: call every frame with the walker; plays a step every ~0.85 tiles walked on the given surface. */
let stepX = null, stepY = 0, stepD = 0;
export function footsteps(p, surface) {
  if (!ac || !p) return;
  if (!p.moving || p.dead) { stepX = p.x; stepY = p.y; return; }
  if (stepX === null || Math.abs(p.x - stepX) + Math.abs(p.y - stepY) > 3) { stepX = p.x; stepY = p.y; return; }   // teleported
  stepD += Math.hypot(p.x - stepX, p.y - stepY); stepX = p.x; stepY = p.y;
  if (stepD < 0.85) return;
  stepD = 0;
  sfx(SAMPLES['step_' + surface] ? 'step_' + surface : 'step_stone', 1, 1);
}

// ------------------------------------------------------------------ streamed tracks
const decks = {};
const pending = {};
let silentUrl = null;
function silence() {   // a 0.05 s silent WAV, used to unlock the media elements inside the first gesture
  if (silentUrl) return silentUrl;
  const n = 2205, b = new ArrayBuffer(44 + n * 2), v = new DataView(b);
  const w = (o, str) => { for (let i = 0; i < str.length; i++) v.setUint8(o + i, str.charCodeAt(i)); };
  w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true);
  v.setUint16(22, 1, true); v.setUint32(24, 44100, true); v.setUint32(28, 88200, true); v.setUint16(32, 2, true);
  v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true);
  return (silentUrl = URL.createObjectURL(new Blob([b], { type: 'audio/wav' })));
}

/** One <audio> element -> gain -> bus. fade() ramps the gain; the element itself always plays at full volume. */
class Deck {
  constructor(bus) {
    this.el = new Audio(); this.el.preload = 'auto';
    this.g = ac.createGain(); this.g.gain.value = 0; this.g.connect(bus);
    try { ac.createMediaElementSource(this.el).connect(this.g); } catch (e) { this.direct = true; }
    this.name = null; this.gen = 0;
  }
  unlock() { if (this.name) return; this.el.src = silence(); const p = this.el.play(); if (p) p.then(() => { if (!this.name) this.el.pause(); }).catch(() => {}); }
  load(name, url, loop, at = 0) {
    this.gen++; this.name = name;
    this.el.loop = loop;
    if (!this.el.src.endsWith(url)) this.el.src = url;
    try { this.el.currentTime = at; } catch (e) { /* not seekable yet */ }
    const p = this.el.play(); if (p) p.catch(() => {});
    return this.gen;
  }
  fade(v, sec) {
    const g = this.g.gain, t = ac.currentTime;
    g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(v, t + Math.max(0.02, sec));
    if (this.direct) this.el.volume = Math.min(1, v);
  }
  stop(sec) {
    const gen = ++this.gen; this.fade(0, sec);
    setTimeout(() => { if (this.gen === gen) { this.el.pause(); this.name = null; } }, sec * 1000 + 60);
  }
  get playing() { return !!this.name && !this.el.paused; }
}

// ------------------------------------------------------------------ music director
const R2 = ([a, b]) => a + Math.random() * (b - a);
// songs in order of play (shuffled when `shuffle`); `gap` = seconds of silence (ambience only) between songs
const MUSIC = {
  title: { songs: ['hymn_of_the_abyss'], gap: [10, 16], vol: 0.9 },
  town: { songs: ['empty_school'], gap: [30, 70], vol: 0.75 },
};
let music = null;   // { kind, def, deck, queue, next (ac time of next song or 0), gen }
const songUrls = {};   // song -> blob URL of a fully downloaded copy (preloadSong)

/** Download a song completely before the title shows, so its intro never waits on the network. Never rejects. */
export function preloadSong(song, progress) {
  return fetch(`${AUDIO}music/${song}.mp3`).then(async (r) => {
    if (!r.ok) throw new Error(r.status);
    const total = +r.headers.get('content-length') || 0, rd = r.body && r.body.getReader();
    if (!rd || !total) { songUrls[song] = URL.createObjectURL(await r.blob()); return; }
    const parts = []; let got = 0;
    for (;;) { const { done, value } = await rd.read(); if (done) break; parts.push(value); got += value.length; progress && progress(Math.min(1, got / total)); }
    songUrls[song] = URL.createObjectURL(new Blob(parts, { type: 'audio/mpeg' }));
  }).catch((e) => console.warn('song preload failed, it will stream:', song, e));
}

/** Start a music kind (no-op if it's already the current one). opts.delay: seconds before the first song starts. */
export function playMusic(kind, opts = {}) {
  if (!ac) { pending.music = { kind, opts }; return; }
  if (music && music.kind === kind) return;
  const def = MUSIC[kind]; if (!def) return;
  if (music && music.deck) music.deck.stop(1.5);
  const deck = decks.music.find((d) => !d.playing && (!music || d !== music.deck)) || decks.music[0];
  const queue = def.shuffle ? [...def.songs].sort(() => Math.random() - 0.5) : [...def.songs];
  music = { kind, def, deck, queue, next: ac.currentTime + (opts.delay ?? (music ? 1.2 : 0.3)), song: null };
}

export function stopMusic(sec = 1.5) {
  pending.music = null;
  if (!music || !ac) { music = null; return; }
  if (music.deck) music.deck.stop(sec);
  music = null;
}

function startSong(at = 0) {
  const m = music, def = m.def;
  if (!m.queue.length) m.queue = def.shuffle ? [...def.songs].sort(() => Math.random() - 0.5) : [...def.songs];
  m.song = m.queue.shift();
  if (manifest && !(m.song in manifest.music)) { m.song = null; m.next = 0; return; }
  const deck = m.deck;
  deck.load(m.song, songUrls[m.song] || `${AUDIO}music/${m.song}.mp3`, false, at || def.at || 0);
  deck.g.gain.cancelScheduledValues(ac.currentTime); deck.g.gain.setValueAtTime(0, ac.currentTime);
  deck.fade(def.vol, at || def.at ? 0.4 : 0.05);
  m.next = 0;
}

/** Current song position, for syncing visuals to it: { kind, song, t } or null while nothing is audible. */
export function musicClock() {
  if (!music || !music.song || !music.deck.playing) return null;
  return { kind: music.kind, song: music.song, t: music.deck.el.currentTime };
}
/** Jump the current kind's song to t seconds (starting it now if it's still waiting). */
export function seekMusic(t) {
  if (!music) return;
  if (!music.song || !music.deck.playing) { music.queue.unshift(music.def.songs[0]); startSong(t); return; }
  try { music.deck.el.currentTime = t; } catch (e) { /* ignore */ }
}

// ------------------------------------------------------------------ ambience director
// Each area gets one or more 60 s beds; one plays at a time, drifting between soft and fuller every 10-25 s and now and
// then crossfading to another of its beds. Beds sit lower while a song plays and come up in the breaks between songs.
const AMB = {
  title: ['cave_storm', 'inside_night_storm'], town: ['forest_night', 'forest_night_rain', 'forest_day'],
  catacombs: ['inside_night', 'cave'], frozen: ['cave_storm', 'forest_night_storm'], molten: ['cave', 'torch_loop'],
  fungal: ['cave_rain', 'cave'], sunken: ['sea', 'cave_rain', 'beach_rain'], blood: ['inside_night_rain', 'inside_night'],
  ashen: ['cave_storm', 'inside_day_storm'], void: ['cave', 'inside_night_storm'], gilded: ['inside_day', 'inside_night', 'inside_day_rain'],
  plague: ['river_stream_loop', 'cave_rain'], crystal: ['cave_rain', 'cave'], desert: ['inside_day_storm', 'beach_storm'],
  shadow: ['inside_night', 'cave'], forge: ['torch_loop', 'cave'], abyss: ['sea_storm', 'cave_storm', 'sea_rain'],
  thorn: ['forest_night', 'forest_day_rain'], storm: ['forest_night_storm', 'cave_storm', 'forest_day_storm'], obsidian: ['cave', 'inside_night'],
  flesh: ['inside_night_rain', 'cave_rain'], serpent: ['river_loop', 'cave_rain'], shattered: ['inside_day_storm', 'cave_storm'],
  library: ['inside_night_rain', 'inside_night'], necropolis: ['forest_night', 'forest_night_storm'],
  amber: ['inside_day_storm', 'beach'], throne: ['cave_storm', 'waterfall_loop'],
};
let amb = null;   // { key, beds, deck, bed, level, nextDrift, nextSwap }

export function setAmbience(key) {
  if (!ac) { pending.amb = key; return; }
  if (amb && amb.key === key) return;
  const beds = AMB[key] || AMB.catacombs;
  const old = amb;
  amb = { key, beds, deck: null, bed: null, level: 0.7, nextDrift: 0, nextSwap: ac.currentTime + R2([50, 110]) };
  swapBed(beds[0], old && old.deck, 3);
}
export function stopAmbience(sec = 2) { pending.amb = null; if (amb && amb.deck) amb.deck.stop(sec); amb = null; }

function swapBed(bed, from, sec) {
  if (manifest && !(bed in manifest.amb)) return;
  if (from) from.stop(sec);
  const deck = decks.amb.find((d) => d !== from) || decks.amb[0];
  deck.load(bed, `${AUDIO}amb/${bed}.mp3`, true, Math.random() * 50);
  deck.g.gain.cancelScheduledValues(ac.currentTime); deck.g.gain.setValueAtTime(0, ac.currentTime);
  amb.deck = deck; amb.bed = bed;
  deck.fade(ambTarget(), sec);
}
const ambTarget = () => amb.level * (music && music.song && music.deck.playing ? 0.45 : 1);

let songOn = false;
function tick() {
  if (!ac) return;
  const now = ac.currentTime;
  if (music) {
    const m = music;
    if (m.song && !m.deck.playing && m.deck.el.ended) { m.song = null; m.next = now + R2(m.def.gap); }   // song over: a break
    if (!m.song && m.next && now >= m.next) startSong();
  }
  const on = !!(music && music.song && music.deck.playing);
  if (amb && amb.deck && on !== songOn) amb.deck.fade(ambTarget(), on ? 3 : 8);   // duck under songs, swell in the breaks
  songOn = on;
  if (amb && amb.deck) {
    if (now >= amb.nextSwap && amb.beds.length > 1) {
      amb.nextSwap = now + R2([60, 140]);
      const others = amb.beds.filter((b) => b !== amb.bed);
      swapBed(others[Math.floor(Math.random() * others.length)], amb.deck, 8);
    } else if (now >= amb.nextDrift) {
      amb.nextDrift = now + R2([10, 25]);
      amb.level = R2([0.3, 1]);
      amb.deck.fade(ambTarget(), R2([6, 12]));
    }
  }
}
