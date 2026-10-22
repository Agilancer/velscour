// Cut scenes (the Sky Battle's, docs/SKY_BATTLE.md): letterbox bars, a scripted camera (pans, zooms, shakes), title
// cards and a dialogue panel (portrait, name, typed text, a syllable-blip voice). While one plays the game holds still
// round it: no input, no auto-play, no monster thinks (game.js), and it can't be skipped, auto-play or not.
// Cine.play(steps) runs steps in order; a step is
//   { cam: { x, y, lv, zoom, dur, ease } }  move the camera to tile (x, y) at `lv` levels (wait: true holds the script)
//   { wait: s } | { until: () => bool, max: s } | { do: fn } | { card: [title, sub], dur } | { shake: px }
//   { say: { name, color, portrait(ctx, x, y, w, h), text, voice: { pitch, wave }, onStart, onEnd }, dur }
// Cine.speed (tests) multiplies time; G.cine is true while a scene plays.
import { G } from '../state.js';
import { camera, isoX, isoY } from '../core/view.js';
import { clamp } from '../core/util.js';
import { audioCtx, audioOut } from '../core/audio.js';

const ease = { lin: (k) => k, io: (k) => k * k * (3 - 2 * k), out: (k) => 1 - (1 - k) ** 3, in: (k) => k * k };

/** A short blip per syllable, pitched per speaker: the dialogue voice. */
function voice(text, v = {}) {
  const ac = audioCtx(), out = audioOut();
  if (!ac || !out || ac.state !== 'running' || (G.settings && G.settings.sfx === 0)) return;
  const words = text.split(/\s+/).filter(Boolean).slice(0, 24);
  let t = ac.currentTime + 0.02;
  const base = 180 * (v.pitch || 1);
  for (const w of words) {
    const syl = Math.max(1, Math.min(4, Math.round(w.replace(/[^a-z]/gi, '').length / 3)));
    const loud = /[A-Z]{3,}|!/.test(w) ? 1.6 : 1;
    for (let s = 0; s < syl; s++) {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = v.wave || 'square';
      const f = base * (0.85 + Math.random() * 0.35) * (w.endsWith('?') && s === syl - 1 ? 1.35 : 1);
      o.frequency.setValueAtTime(f, t); o.frequency.linearRampToValueAtTime(f * 0.9, t + 0.06);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.045 * loud, t + 0.01); g.gain.linearRampToValueAtTime(0, t + 0.07);
      o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.08);
      t += 0.075;
    }
    t += 0.05;
  }
}

export const Cine = {
  active: false, steps: [], i: 0, t: 0, speed: 1, bars: 0, card: null, line: null, cam: null, shook: false,
  onEnd: null,
  /** Start a scene (or queue it after the one playing). */
  play(steps, onEnd = null) {
    if (this.active) { this.steps.push(...steps); if (onEnd) { const prev = this.onEnd; this.onEnd = () => { prev && prev(); onEnd(); }; } return; }
    this.active = true; G.cine = true; this.steps = steps.slice(); this.i = 0; this.t = 0; this.onEnd = onEnd; this.line = null; this.card = null;
    this.zoom0 = camera.zoom;
  },
  stop() {
    this.active = false; G.cine = false; this.steps = []; this.line = null; this.card = null; this.cam = null;
    camera.computeZoom();
    const f = this.onEnd; this.onEnd = null; if (f) f();
  },
  /** Drop a scene without its ending: the hero left the world it played in (else its camera and hidden HUD follow
   *  him to town, which then draws black). */
  abort() { this.onEnd = null; if (this.active) this.stop(); this.bars = 0; },
  update(dt) {
    dt *= this.speed;
    this.bars = clamp(this.bars + (this.active ? dt : -dt) * 2.5, 0, 1);
    if (!this.active) return;
    // the camera glides toward its mark
    if (this.cam) {
      const c = this.cam; c.t += dt;
      const k = (ease[c.ease] || ease.io)(clamp(c.t / c.dur, 0, 1));
      camera.x = c.x0 + (c.x1 - c.x0) * k; camera.y = c.y0 + (c.y1 - c.y0) * k; camera.zoom = c.z0 + (c.z1 - c.z0) * k;
    }
    if (this.card) { this.card.t += dt; if (this.card.t > this.card.dur) this.card = null; }
    for (let guard = 0; guard < 50 && this.active; guard++) {
      const s = this.steps[this.i];
      if (!s) { this.stop(); return; }
      if (!s._on) { s._on = true; this.t = 0; this.begin(s); }
      this.t += guard ? 0 : dt;
      if (!this.done(s)) return;
      if (s.say && s.say.onEnd) s.say.onEnd();
      this.i++; this.line = s.say ? null : this.line;
    }
  },
  begin(s) {
    if (s.cam) {
      const c = s.cam, [x1, y1] = c.px || [isoX(c.x, c.y), isoY(c.x, c.y) - (c.lv || 0) * 4 - (c.up ?? 24)];
      this.cam = { t: 0, dur: Math.max(0.01, c.dur ?? 1.5), ease: c.ease, x0: camera.x, y0: camera.y, z0: camera.zoom, x1, y1, z1: (c.zoom ?? 1) * this.zoom0 };
    }
    if (s.do) s.do();
    if (s.shake) camera.shakeAmt = Math.max(camera.shakeAmt, s.shake);
    if (s.card) this.card = { title: s.card[0], sub: s.card[1] || '', t: 0, dur: s.dur ?? 2.6 };
    if (s.say) {
      const d = s.say;
      this.line = { ...d, t: 0, shown: 0 };
      s.dur = s.dur ?? 1.4 + d.text.length * 0.045;
      if (d.onStart) d.onStart();
      voice(d.text, d.voice);
    }
  },
  done(s) {
    if (s.say) { this.line.t = this.t; return this.t >= s.dur; }
    if (s.wait !== undefined) return this.t >= s.wait;
    if (s.until) return s.until() || this.t >= (s.max ?? 30);
    if (s.cam && s.cam.wait) return this.t >= (s.cam.dur ?? 1.5);
    if (s.card && s.block) return this.t >= (s.dur ?? 2.6);
    return true;
  },
};

// ------------------------------------------------------------------ drawing (screen space, device px)
function wrap(ctx, text, maxW) {
  const lines = []; let line = '';
  for (const w of text.split(/\s+/)) { const n = line ? line + ' ' + w : w; if (line && ctx.measureText(n).width > maxW) { lines.push(line); line = w; } else line = n; }
  if (line) lines.push(line);
  return lines;
}
export function drawCine(ctx, W, H) {
  const k = Cine.bars;
  if (k <= 0) return;
  const dpr = G.dpr, bar = Math.round(H * 0.13 * (1 - (1 - k) ** 2));
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, bar); ctx.fillRect(0, H - bar, W, bar);
  const C = Cine.card;
  if (C) {
    const a = Math.min(1, C.t / 0.4, (C.dur - C.t) / 0.5);
    ctx.globalAlpha = clamp(a, 0, 1); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `${Math.round(46 * dpr)}px "Cinzel", "Alegreya", serif`; ctx.fillStyle = '#000'; ctx.fillText(C.title, W / 2 + 3 * dpr, H * 0.36 + 3 * dpr);
    ctx.fillStyle = '#ffd9a0'; ctx.fillText(C.title, W / 2, H * 0.36);
    if (C.sub) { ctx.font = `italic ${Math.round(20 * dpr)}px "Alegreya", serif`; ctx.fillStyle = '#e8d8c0'; ctx.fillText(C.sub, W / 2, H * 0.36 + 44 * dpr); }
    ctx.globalAlpha = 1;
  }
  const L = Cine.line;
  if (L && k > 0.5) {
    const pad = 14 * dpr, ph = Math.max(bar - pad, 60 * dpr), py = H - bar + (bar - ph) / 2, pw = ph;
    const x0 = Math.max(pad, W / 2 - 520 * dpr);
    ctx.globalAlpha = Math.min(1, L.t / 0.15);
    ctx.fillStyle = '#120c0a'; ctx.fillRect(x0, py, pw, ph);
    ctx.strokeStyle = L.color || '#c9a060'; ctx.lineWidth = 2 * dpr; ctx.strokeRect(x0 + 1, py + 1, pw - 2, ph - 2);
    if (L.portrait) { ctx.save(); ctx.beginPath(); ctx.rect(x0 + 3, py + 3, pw - 6, ph - 6); ctx.clip(); L.portrait(ctx, x0 + 3, py + 3, pw - 6, ph - 6, L.t); ctx.restore(); }
    const tx = x0 + pw + 16 * dpr, maxW = Math.min(W - tx - pad, 820 * dpr);
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.font = `bold ${Math.round(17 * dpr)}px "Cinzel", "Alegreya", serif`; ctx.fillStyle = L.color || '#ffd9a0';
    ctx.fillText(L.name, tx, py + 2 * dpr);
    ctx.font = `${Math.round(17 * dpr)}px "Alegreya Sans", "Segoe UI", sans-serif`; ctx.fillStyle = '#f2e8d8';
    const n = Math.floor(L.t * 42), shown = L.text.slice(0, n);
    const lines = wrap(ctx, L.text, maxW);
    let used = 0;
    lines.forEach((ln, j) => { const part = shown.slice(used, used + ln.length); used += ln.length + 1; ctx.fillText(part, tx, py + 28 * dpr + j * 22 * dpr); });
    ctx.globalAlpha = 1;
  }
}
