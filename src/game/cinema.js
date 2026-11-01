// Cut scenes (the Sky Battle's, docs/SKY_BATTLE.md): letterbox bars, a scripted camera (pans, zooms, shakes), title
// cards and a dialogue panel (portrait, name, typed text, a syllable-blip voice). While one plays the game holds still
// round it: no input, no auto-play, no monster thinks (game.js), and it can't be skipped, auto-play or not.
// Cine.play(steps) runs steps in order; a step is
//   { cam: { on, fit, x, y, lv, zoom, dur, ease, wait, push, drift } }  a camera move (wait: true holds the script):
//       on: () => [wx, wy]       a world px point read every frame (an actor's face, a boat): the camera eases onto it
//                                and keeps on it after, so a moving subject stays framed
//       fit: () => [[wx, wy]...]  frame all these points (the centre tracked, the zoom fitted once, at most `zoom`)
//       x, y, lv                 a fixed tile; `lv` an absolute level (a boat's), else the ground there
//       zoom                     times the game's own zoom; push: the zoom's growth a second once there (a slow push-in);
//       drift: [wx, wy]          world px a second the frame slides once there; pace: world px a second, the move's
//                                length from how far it goes (dur its longest)
//   { wait: s } | { until: () => bool, max: s } | { do: fn } | { card: [title, sub], dur } | { shake: px }
//   { say: { name, color, portrait(ctx, x, y, w, h), text, voice: { pitch, wave }, focus, onStart, onEnd }, dur }
//       focus: () => [wx, wy], the speaker (tests check every line frames its speaker)
// When a scene ends the zoom eases back to the game's (the director's last shot is usually the hero already).
// Cine.speed (tests) multiplies time; G.cine is true while a scene plays.
import { G } from '../state.js';
import { camera, isoX, isoY, HH } from '../core/view.js';
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

/** The game's own zoom (settings, screen size), without touching the camera. */
function baseZoom() { const z = camera.zoom; camera.computeZoom(); const b = camera.zoom; camera.zoom = z; return b; }

/** How much faster a scene the hero has already watched plays (game.js runs that many steps a frame). */
export const CINE_FAST = 20;
export const Cine = {
  fast: false,   // this scene was seen: it plays at CINE_FAST (set by the director's first step, game/skybattle.js scene())
  active: false, steps: [], i: 0, t: 0, speed: 1, bars: 0, card: null, line: null, cam: null, shook: false, back: null,
  onEnd: null, zoom0: 1,
  /** Start a scene (or queue it after the one playing). */
  play(steps, onEnd = null) {
    if (this.active) { this.steps.push(...steps); if (onEnd) { const prev = this.onEnd; this.onEnd = () => { prev && prev(); onEnd(); }; } return; }
    this.active = true; G.cine = true; this.steps = steps.slice(); this.i = 0; this.t = 0; this.onEnd = onEnd; this.line = null; this.card = null;
    this.zoom0 = baseZoom(); this.back = null; this.cam = null;
  },
  stop() {
    this.active = false; G.cine = false; this.fast = false; this.steps = []; this.line = null; this.card = null; this.cam = null;
    this.back = { t: 0, z0: camera.zoom };   // ease the zoom home (game.js's camera.follow brings the frame back to the hero)
    const f = this.onEnd; this.onEnd = null; if (f) f();
  },
  /** Drop a scene without its ending: the hero left the world it played in (else its camera and hidden HUD follow
   *  him to town, which then draws black). */
  abort() { this.onEnd = null; if (this.active) this.stop(); this.back = null; camera.computeZoom(); this.bars = 0; },
  update(dt) {
    dt *= this.speed;
    this.bars = clamp(this.bars + (this.active ? dt : -dt) * 2.5, 0, 1);
    G.zoomFlux = this.active || !!this.back;   // the camera's zoom is moving: render.js bakes the floor at zoom steps
    if (!this.active) {
      if (this.back) { const b = this.back; b.t += dt; const k = ease.io(clamp(b.t / 0.7, 0, 1)); camera.zoom = b.z0 + (baseZoom() - b.z0) * k; if (k >= 1) this.back = null; }
      return;
    }
    if (this.cam) this.aim(dt);
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
  /** The camera glides toward its mark, then holds it (a moving mark is followed), pushing in or drifting. */
  aim(dt) {
    const c = this.cam; c.t += dt;
    const k = (ease[c.ease] || ease.io)(clamp(c.t / c.dur, 0, 1)), after = Math.max(0, c.t - c.dur);
    let [tx, ty] = c.on ? c.on() : [c.x1, c.y1];
    if (c.drift) { tx += c.drift[0] * after; ty += c.drift[1] * after; }
    if (c.t <= c.dur) { camera.x = c.x0 + (tx - c.x0) * k; camera.y = c.y0 + (ty - c.y0) * k; }
    else { const f = 1 - Math.pow(0.004, dt); camera.x += (tx - camera.x) * f; camera.y += (ty - camera.y) * f; }
    camera.zoom = (c.z0 + (c.z1 - c.z0) * k) * (1 + Math.min(0.3, (c.push || 0) * after));
  },
  begin(s) {
    if (s.cam) {
      const c = s.cam, z0 = this.zoom0;
      let on = c.on || null, zoom = c.zoom ?? 1, x1 = 0, y1 = 0;
      if (c.fit) {
        // frame every point: the box's centre (followed), the zoom that fits the box into the frame between the bars
        const box = () => { const ps = c.fit(); let a = Infinity, b = Infinity, d = -Infinity, e = -Infinity; for (const [x, y] of ps) { a = Math.min(a, x); b = Math.min(b, y); d = Math.max(d, x); e = Math.max(e, y); } return [a, b, d, e]; };
        const [a, b, d, e] = box(), m = c.margin ?? 0.62;
        zoom = Math.min(zoom, (G.W * m) / Math.max(40, d - a) / z0, (G.H * 0.74 * m) / Math.max(30, e - b) / z0);
        zoom = Math.max(c.min ?? 0.4, zoom);
        on = () => { const [a2, b2, d2, e2] = box(); return [(a2 + d2) / 2, (b2 + e2) / 2]; };
      } else if (!on) {
        // a fixed tile: at an absolute level (a boat's, a perch) the flat plane lifted by it, else the ground there
        x1 = isoX(c.x, c.y); y1 = (c.lv === undefined ? isoY(c.x, c.y) : (c.x + c.y) * HH - c.lv * 4) - (c.up ?? 24);
      }
      let dur = c.dur ?? 1.5;
      if (c.pace) { const [tx, ty] = on ? on() : [x1, y1]; dur = clamp((Math.hypot(tx - camera.x, ty - camera.y) + Math.abs(Math.log(zoom * z0 / camera.zoom)) * 450) / c.pace, 0.35, dur); }
      this.cam = { t: 0, dur: Math.max(0.01, dur), ease: c.ease, x0: camera.x, y0: camera.y, z0: camera.zoom, x1, y1, z1: zoom * z0, on, push: c.push, drift: c.drift };
    }
    if (s.do) s.do();
    if (s.shake) camera.shakeAmt = Math.max(camera.shakeAmt, s.shake);
    if (s.card) this.card = { title: s.card[0], sub: s.card[1] || '', t: 0, dur: s.dur ?? 2.6 };
    if (s.say) {
      const d = s.say;
      this.line = { ...d, t: 0, shown: 0 };
      s.dur = s.dur ?? 1.4 + d.text.length * 0.045;
      if (d.onStart) d.onStart();
      if (!this.fast) voice(d.text, d.voice);
    }
  },
  done(s) {
    if (s.say) { this.line.t = this.t; return this.t >= s.dur; }
    if (s.wait !== undefined) return this.t >= s.wait;
    if (s.until) return s.until() || this.t >= (s.max ?? 30);
    if (s.cam && s.cam.wait) return this.t >= (this.cam ? this.cam.dur : s.cam.dur ?? 1.5);
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
  // css px sizes (x dpr): on a short screen (a phone on its side) the font shrinks and the bars grow to hold the panel
  const dpr = G.dpr, f = clamp(G.H / 42, 11, 17), lh = f * 1.3, pad = Math.max(6, f * 0.5);
  const barCss = Math.max(G.H * 0.13, pad * 2 + f + 4 + lh * 2), bar = Math.round(barCss * dpr * (1 - (1 - k) ** 2));
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, bar); ctx.fillRect(0, H - bar, W, bar);
  const C = Cine.card;
  if (C) {
    const a = Math.min(1, C.t / 0.4, (C.dur - C.t) / 0.5), big = clamp(G.H / 15.6, 24, 46), sub = big * 0.44;
    ctx.globalAlpha = clamp(a, 0, 1); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `${Math.round(big * dpr)}px "Cinzel", "Alegreya", serif`; ctx.fillStyle = '#000'; ctx.fillText(C.title, W / 2 + 3 * dpr, H * 0.36 + 3 * dpr);
    ctx.fillStyle = '#ffd9a0'; ctx.fillText(C.title, W / 2, H * 0.36);
    if (C.sub) {   // the line under the title: on a dark plate, outlined, near the title's weight (it is often the payoff)
      const fs = Math.round(Math.max(sub, big * 0.52) * dpr), sy = H * 0.36 + big * 1.0 * dpr;
      ctx.font = `italic 600 ${fs}px "Alegreya", serif`;
      const tw = ctx.measureText(C.sub).width, pw = tw + fs * 1.6, ph = fs * 1.55;
      ctx.fillStyle = 'rgba(8,6,10,0.62)'; ctx.fillRect(W / 2 - pw / 2, sy - ph / 2, pw, ph);
      ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(2, fs * 0.16); ctx.strokeStyle = '#000'; ctx.strokeText(C.sub, W / 2, sy);
      ctx.fillStyle = '#f4e6cc'; ctx.fillText(C.sub, W / 2, sy);
    }
    ctx.globalAlpha = 1;
  }
  if (Cine.fast && k > 0.5) {   // fast-forwarding a scene already seen
    const fs = Math.round(clamp(G.H / 52, 10, 14) * dpr);
    ctx.font = `${fs}px "Alegreya Sans", "Segoe UI", sans-serif`; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#c8b898'; ctx.fillText(`▶▶ x${CINE_FAST}  ·  seen before  (Settings: Don't skip cutscenes)`, W - pad * dpr, bar / 2);
  }
  const L = Cine.line;
  if (L && k > 0.5) {
    const ph = (barCss - pad * 2) * dpr, py = H - bar + (bar - ph) / 2, pw = ph;
    const x0 = Math.max(pad * dpr, W / 2 - 520 * dpr);
    ctx.globalAlpha = Math.min(1, L.t / 0.15);
    ctx.fillStyle = '#120c0a'; ctx.fillRect(x0, py, pw, ph);
    ctx.strokeStyle = L.color || '#c9a060'; ctx.lineWidth = 2 * dpr; ctx.strokeRect(x0 + 1, py + 1, pw - 2, ph - 2);
    if (L.portrait) { ctx.save(); ctx.beginPath(); ctx.rect(x0 + 3, py + 3, pw - 6, ph - 6); ctx.clip(); L.portrait(ctx, x0 + 3, py + 3, pw - 6, ph - 6, L.t); ctx.restore(); }
    const tx = x0 + pw + f * dpr, maxW = Math.min(W - tx - pad * dpr, 820 * dpr);
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.font = `bold ${Math.round(f * dpr)}px "Cinzel", "Alegreya", serif`; ctx.fillStyle = L.color || '#ffd9a0';
    ctx.fillText(L.name, tx, py + 2 * dpr);
    ctx.font = `${Math.round(f * dpr)}px "Alegreya Sans", "Segoe UI", sans-serif`; ctx.fillStyle = '#f2e8d8';
    const n = Math.floor(L.t * 42), shown = L.text.slice(0, n);
    const lines = wrap(ctx, L.text, maxW);
    let used = 0;
    lines.forEach((ln, j) => {
      const part = shown.slice(used, used + ln.length), yy = py + (f + 4 + 2) * dpr + j * lh * dpr; used += ln.length + 1;
      const mk = L.mark, at = mk ? part.indexOf(mk.word) : -1;
      if (at < 0) { ctx.fillText(part, tx, yy); return; }
      // a marked word in its own colour (the Pirate Seas: the Ember's name, said aloud)
      const pre = part.slice(0, at), w = part.slice(at, at + mk.word.length), x1 = tx + ctx.measureText(pre).width, x2 = x1 + ctx.measureText(w).width;
      ctx.fillText(pre, tx, yy); ctx.fillStyle = mk.color; ctx.fillText(w, x1, yy); ctx.fillStyle = '#f2e8d8'; ctx.fillText(part.slice(at + mk.word.length), x2, yy);
    });
    ctx.globalAlpha = 1;
  }
}
