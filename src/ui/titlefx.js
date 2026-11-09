// Title screen: the VELSCOUR logo rises out of the dark in time with "Hymn of the Abyss" and bursts into flame on the
// song's first hit; red eyes blink in the background. The separate Credits screen owns the studio credit cards.
// Timeline (song time, s): visuals start with scheduled music, then re-sync to its clock when playback is available.
// If the browser hasn't let audio start yet, a prompt asks for a click first (the eyes watch you meanwhile).
// Any click or key during the intro skips ahead to the burst.
// Flames are simulated in coarse units (one unit = PX css px) but drawn at device resolution with tiny particles,
// on a canvas laid over the title screen. A low-res copy of the fire, upscaled with smoothing, gives it a soft glow.
import { A } from '../core/assets.js';
import { initAudio, audioReady, playMusic, primeMusic, musicClock, seekMusic } from '../core/audio.js';
import { rand, randi, clamp } from '../core/util.js';

const FLAME = ['#fffbe8', '#ffe264', '#ffa218', '#ff6408', '#e22e06', '#991404', '#440802'];
export const INTRO_DELAY = 0, HIT = 6.88, FADE0 = -1.5;   // song-time seconds (FADE0 < 0: before the song starts)
const CREDIT_CARD_MS = 2750, CREDIT_FADE_MS = 800, CREDITS_MS = CREDIT_CARD_MS * 2;
const LOGO_FADE_START = (CREDIT_CARD_MS * 2 - CREDIT_FADE_MS) / 1000;
// phones: fewer, slightly bigger particles at a lower canvas resolution; Q also drops further if frames run slow
const MAX_PARTS = 14000;
let geo = null;              // logo emitter points in native logo pixels (built once)

/** Sample the logo's alpha/colour: top contour (flames) and molten cracks (embers). */
function logoGeometry(img) {
  const w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const cx = c.getContext('2d', { willReadFrequently: true }); cx.drawImage(img, 0, 0);
  const d = cx.getImageData(0, 0, w, h).data;
  const a = (x, y) => d[(y * w + x) * 4 + 3];
  const top = [], cracks = [];
  for (let x = 0; x < w; x += 2) {
    for (let y = 0; y < h; y++) if (a(x, y) > 110) { top.push([x, y]); break; }
  }
  for (let i = 0; i < 60000 && cracks.length < 1000; i++) {
    const x = randi(0, w - 1), y = randi(0, h - 1), k = (y * w + x) * 4;
    if (d[k + 3] > 200 && d[k] > 220 && d[k + 1] > 70 && d[k + 1] < 190 && d[k + 2] < 90) cracks.push([x, y]);
  }
  return { w, h, top, cracks };
}

/**
 * Attach the title effects. els: { tag, menu, gate } fade in/out with the intro. Returns a detach function.
 * The loop also stops by itself once the screen leaves the DOM.
 */
export function attachTitleFx(screen, logoEl, els = {}) {
  const cv = document.createElement('canvas');
  cv.className = 'title-fx';
  const eyeCv = document.createElement('canvas');
  eyeCv.className = 'title-eyes';
  screen.prepend(cv); screen.prepend(eyeCv);
  const ctx = cv.getContext('2d'), ectx = eyeCv.getContext('2d');
  const reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const lowCv = document.createElement('canvas'), lctx = lowCv.getContext('2d');   // eyes, drawn chunky then upscaled
  let W = 0, H = 0, PX = 3, D = 1, S = 3, cssW = 0, cssH = 0;
  let parts = [], eyes = [];
  let flash = 0, shake = 0, last = performance.now(), raf = 0, ready = false;
  const LITE = document.body.classList.contains('touch');
  let Q = LITE ? 0.4 : 1, slow = 0;   // particle budget scale (adaptive)
  const ZS = LITE ? 1.35 : 1;         // particle size boost when the budget is cut
  const lg = { s: 1, x: 0, y: 0 };

  // ------------------------------------------------------------------ intro timeline
  // phase: 'gate' (waiting for a click so audio may play) -> 'credits' -> 'intro' (logo fading in) -> 'lit' (burning)
  let phase = 'gate', t0 = 0, ts = FADE0 - 1, eyeT = 0.4, burstAt = 0, creditsAt = 0, creditsClockAnchored = false, skipAfterCredits = false;
  const clockNow = () => (performance.now() - t0) / 1000;   // wall clock in song time
  let priming = false;
  function startIntro(skipNow = false) {
    if (phase !== 'credits') return;
    phase = 'intro'; t0 = performance.now();
    if (els.credits) for (const card of els.credits.children) card.style.opacity = '0';
    if (skipNow) {
      seekMusic(HIT - 0.35);
      const songT = HIT - 0.35 + INTRO_DELAY;
      t0 = performance.now() - songT * 1000;
      creditsAt = performance.now() - songT * 1000; creditsClockAnchored = true; ts = Math.max(ts, songT);
    }
  }
  function startSequence() {
    phase = 'audio-pending'; priming = true;
    screen.classList.remove('title-gated');
    primeMusic('title').then(() => {
      if (!cv.isConnected) return;
      priming = false;
      playMusic('title', { delay: 0 });
      phase = 'credits'; creditsAt = performance.now(); creditsClockAnchored = false;
      if (skipAfterCredits) startIntro(true);
      else if (!els.credits) startIntro();
    });
  }
  function begin() {   // called inside the tap: show the credits while the title song buffers
    if (phase !== 'gate') return;
    if (els.onAwaken && !window.VELSCOUR_TEST_MENU) {
      phase = 'warning';
      screen.classList.remove('title-gated');
      els.onAwaken(() => {
        startSequence();
      });
      return;
    }
    startSequence();
  }
  function light(instant) {   // the hit: the logo bursts into flame and the menu appears
    if (phase === 'lit') return;
    phase = 'lit'; burstAt = performance.now();
    screen.classList.add('title-lit');
    // buttons take taps only once they've faded in (and never from the tap that skipped the intro)
    setTimeout(() => screen.classList.add('title-ready'), instant ? 0 : 950);
    if (ready) burst();
  }
  function skip() {
    if (phase === 'lit' || phase === 'warning') return;
    if (phase === 'gate') {
      begin();
      return;
    }
    if (phase === 'credits') {
      skipAfterCredits = true;
      if (els.credits) for (const card of els.credits.children) card.style.opacity = '0';
      if (!priming) startIntro(true);
      return;
    }
    if (phase !== 'intro' || priming) return;
    seekMusic(HIT - 0.35);
    t0 = performance.now() - (HIT - 0.35 + INTRO_DELAY) * 1000;
    creditsAt = performance.now() - (HIT - 0.35 + INTRO_DELAY) * 1000; creditsClockAnchored = true; ts = Math.max(ts, HIT - 0.35);
  }
  if (window.VELSCOUR_TEST_MENU) screen.classList.add('title-ready');   // headless tests click the menu straight away
  const c0 = musicClock();
  if (c0 && c0.kind === 'title') { phase = 'intro'; light(true); }      // back from a sub-menu: the song is still playing
  else if (audioReady()) begin();
  else screen.classList.add('title-gated');
  // iOS only lets audio start from a touch's *end* (pointerup), never its pointerdown, so a touch opens the gate on
  // release; a mouse button or key opens it on press. Every input also re-tries the unlock.
  const onInput = (e) => {
    if (phase === 'warning') return;
    if (e.type !== 'keydown' && (e.pointerType === 'mouse') !== (e.type === 'pointerdown')) return;
    initAudio();
    if (phase === 'gate') begin(); else skip();
  };
  const EVTS = ['pointerdown', 'pointerup', 'keydown'];
  for (const k of EVTS) window.addEventListener(k, onInput, true);

  function updateTimeline() {
    if (phase === 'credits') {
      if (!creditsClockAnchored) {
        const c = musicClock(), startupElapsed = performance.now() - creditsAt;
        if (c && c.kind === 'title' && startupElapsed < 500) {
          // Re-anchor the scheduled visual start to the first audible frame when it begins promptly.
          creditsAt = performance.now() - c.t * 1000;
          creditsClockAnchored = true;
        } else if (startupElapsed >= 500) {
          creditsClockAnchored = true;
        }
        // If playback is unavailable, the scheduled start still advances the intro rather than leaving a blank screen.
      }
      const elapsed = performance.now() - creditsAt;
      ts = Math.max(ts, elapsed / 1000);
      if (els.credits && !skipAfterCredits) {
        const active = Math.min(1, Math.floor(elapsed / CREDIT_CARD_MS));
        const cardTime = elapsed - active * CREDIT_CARD_MS;
        const k = Math.min(clamp(cardTime / CREDIT_FADE_MS, 0, 1), clamp((CREDIT_CARD_MS - cardTime) / CREDIT_FADE_MS, 0, 1));
        const eased = k * k * (3 - 2 * k);
        for (let i = 0; i < els.credits.children.length; i++) {
          els.credits.children[i].style.opacity = i === active ? eased.toFixed(3) : '0';
        }
      }
      if ((skipAfterCredits || elapsed >= CREDITS_MS) && !priming) startIntro(skipAfterCredits);
      return;
    }
    if (phase !== 'intro') return;
    const wall = clockNow(), c = musicClock();
    let t;
    if (c && c.kind === 'title' && (c.t > 0.02 || wall < 3)) t = c.t;   // the song's own clock (unless it never starts)
    else if (creditsAt) t = (performance.now() - creditsAt) / 1000;   // use scheduled time when media playback is unavailable
    else if (wall < 0) t = wall;                                // before the song is due
    else t = audioReady() && wall < 3 ? 0 : wall - (audioReady() ? 3 : 0);   // song still loading: hold, then give up
    ts = Math.max(ts, t);
    if (ts >= HIT) light();
  }
  function styleLogo(now) {
    let k = phase === 'lit' ? 1 : clamp((ts - LOGO_FADE_START) / (HIT - LOGO_FADE_START), 0, 1);
    if (phase === 'gate') k = 0;
    const e = k * k * (3 - 2 * k), op = e;
    const burn = phase === 'lit' ? Math.max(0, 1 - (now - burstAt) / 1600) : 0;
    logoEl.style.opacity = op.toFixed(3);
    logoEl.style.transform = `scale(${(0.965 + 0.035 * e + burn * 0.03).toFixed(4)})`;
    logoEl.style.filter = phase === 'lit'
      ? `brightness(${(1 + burn * 0.6).toFixed(2)}) drop-shadow(0 0 ${(30 + burn * 50) | 0}px rgba(255,${(80 + burn * 90) | 0},10,${(0.45 + burn * 0.5).toFixed(2)}))`
      : `drop-shadow(0 0 ${(e * 18) | 0}px rgba(120,10,4,${(e * 0.5).toFixed(2)}))`;
  }

  function resize() {
    const r = cv.getBoundingClientRect();
    const dpr = Math.min(LITE ? 1.5 : 2, window.devicePixelRatio || 1);
    if (r.width === cssW && r.height === cssH && dpr === D) return;
    cssW = r.width; cssH = r.height; D = dpr;
    PX = Math.max(2, Math.round(Math.min(r.width, r.height) / 240)); S = PX * D;   // device px per sim unit
    cv.width = eyeCv.width = Math.max(1, Math.round(r.width * D)); cv.height = eyeCv.height = Math.max(1, Math.round(r.height * D));
    W = Math.max(1, Math.round(r.width / PX)); H = Math.max(1, Math.round(r.height / PX));
    lowCv.width = W; lowCv.height = H;
  }
  // logo native px -> sim px, honouring object-fit: contain and the intro scale
  function place() {
    const c = cv.getBoundingClientRect(), r = logoEl.getBoundingClientRect();
    const s = Math.min(r.width / geo.w, r.height / geo.h);
    lg.s = s / PX;
    lg.x = (r.left + (r.width - geo.w * s) / 2 - c.left) / PX;
    lg.y = (r.top + (r.height - geo.h * s) / 2 - c.top) / PX;
  }
  const P = (nx, ny) => [lg.x + nx * lg.s, lg.y + ny * lg.s];

  // ------------------------------------------------------------------ flames & embers
  // kind: 0 flame lick (additive, tapered velocity stretch), 1 spark (ballistic streak), 3 realistic ember (buoyant, turbulent, trailing streak), 4 shockwave ring
  const add = (o) => { if (parts.length < MAX_PARTS * Q) parts.push(o); };
  const flame = (x, y, vx, vy, life, sz = 1) => add({
    k: 0,
    x, y,
    originX: x,
    vx, vy,
    t: 0,
    life,
    sz: sz * ZS,
    ph: rand(6.28),
    buoyancy: rand(24, 52),
    pinch: rand(1.8, 3.6),
    flickerSpeed: rand(14, 22)
  });
  const spark = (x, y, vx, vy, life, g) => add({ k: 1, x, y, vx, vy, t: 0, life, g });
  const ember = (x, y, vx, vy, life, sz = 1, emberType = 0) => add({
    k: 3,
    x, y,
    vx, vy,
    t: 0,
    life,
    sz: sz * ZS,
    seed: rand(100),
    drift: rand(-10, 10),
    swayAmp: rand(14, 28),
    flutterFreq: rand(8, 16),
    flutterAmp: rand(4, 9),
    buoyancy: rand(16, 38),
    flickerRate: rand(12, 24),
    baseAlpha: rand(0.75, 1.0),
    popTimer: rand(0.7, 2.4),
    flare: 0,
    trailLen: rand(0.025, 0.05),
    emberType
  });
  const topPt = () => P(...geo.top[randi(0, geo.top.length - 1)]);
  const crackPt = () => P(...geo.cracks[randi(0, geo.cracks.length - 1)]);

  function emitLogo(dt) {
    if (phase !== 'lit') {   // a few embers start to stir and float out of the cracks just before the hit
      const k = (ts - (HIT - 1.6)) / 1.6;
      if (phase === 'intro' && k > 0) {
        for (let n = Math.floor(dt * 36 * k * Q + Math.random()); n-- > 0;) {
          const [x, y] = crackPt();
          ember(x + rand(-2, 2), y, rand(-6, 6), -rand(12, 28), rand(2.2, 4.0), rand(0.8, 1.4), 1);
        }
      }
      return;
    }
    const s = lg.s, surge = 1 + 1.5 * Math.max(0, 1 - (performance.now() - burstAt) / 2500);   // burns hottest right after the burst

    // Flame tongues licking upward along the top edge
    for (let n = Math.floor(dt * 1300 * surge * Q + Math.random()); n-- > 0;) {
      const [x, y] = topPt();
      flame(x + rand(-1, 1), y + rand(0, 3 * s * 8), rand(-4, 4), -rand(16, 36) * (0.8 + surge * 0.2), rand(0.35, 0.8), rand(1, 2.2));
    }
    // Flame licks rising off the letters' faces and cracks
    for (let n = Math.floor(dt * 260 * Q + Math.random()); n-- > 0;) {
      const [x, y] = crackPt();
      flame(x + rand(-2, 2), y, rand(-3, 3), -rand(14, 30), rand(0.25, 0.55), rand(0.8, 1.8));
    }
    // Realistic embers trailing up the screen in sporadic, turbulent currents off the fire
    for (let n = Math.floor(dt * 135 * surge * Q + Math.random()); n-- > 0;) {
      const [x, y] = Math.random() < 0.5 ? crackPt() : topPt();
      const r = Math.random();
      const type = r < 0.65 ? 0 : r < 0.9 ? 1 : 2;
      const sz = type === 0 ? rand(0.7, 1.2) : type === 1 ? rand(1.2, 1.8) : rand(1.8, 2.4);
      const life = rand(2.4, 5.2);
      const vy = -rand(28, 80) * (0.85 + surge * 0.25);
      const vx = rand(-14, 14);
      ember(x + rand(-2, 2), y + rand(-1, 2), vx, vy, life, sz, type);
    }
    // Ballistic shooting sparks
    for (let n = Math.floor(dt * 30 * Q + Math.random()); n-- > 0;) {
      const [x, y] = topPt();
      spark(x, y, rand(-32, 32), -rand(35, 95), rand(0.6, 1.5), rand(-5, 30));
    }
  }

  // the hit: a wall of fire shoots straight up and a shower of embers erupts
  function burst() {
    for (let n = 0; n < 2200 * Q; n++) {
      const [x, y] = Math.random() < 0.7 ? topPt() : crackPt();
      flame(x + rand(-1.5, 1.5), y + rand(-1, 2), rand(-10, 10), -rand(40, 170), rand(0.4, 1.2), rand(1.2, 2.6));
    }
    for (let n = 0; n < 380 * Q; n++) {
      const [x, y] = Math.random() < 0.6 ? topPt() : crackPt();
      const type = Math.random() < 0.65 ? 0 : Math.random() < 0.88 ? 1 : 2;
      ember(x + rand(-3, 3), y + rand(-2, 2), rand(-45, 45), -rand(60, 190), rand(2.6, 5.5), rand(0.9, 2.2), type);
    }
    for (let n = 0; n < 180 * Q; n++) {
      const [x, y] = topPt();
      spark(x, y, rand(-60, 60), -rand(80, 240), rand(0.8, 2.2), rand(20, 90));
    }
    const cx = lg.x + geo.w * lg.s / 2, cy = lg.y + geo.h * lg.s * 0.45;
    parts.push({ k: 4, x: cx, y: cy, t: 0, life: 0.6, r: geo.w * lg.s * 0.6 });
    flash = 0.55; shake = reduceMotion ? 0 : 0.45;
  }

  function updateParts(dt) {
    const logoMidX = lg.x + (geo ? geo.w * lg.s * 0.5 : W * 0.5);
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.t += dt;
      if (p.t >= p.life || p.y < -40 || p.x < -30 || p.x > W + 30 || p.y > H + 20) {
        parts[i] = parts[parts.length - 1];
        parts.pop();
        continue;
      }
      if (p.k === 4) continue;

      if (p.k === 0) {
        const u = p.t / p.life;
        p.vy -= p.buoyancy * (1 - u * 0.4) * dt;
        p.vx -= (p.x - p.originX) * p.pinch * dt;
        p.vx += Math.sin(p.t * p.flickerSpeed + p.ph) * (20 * (1 - u)) * dt;
        p.vx *= (1 - dt * 2.2);
        p.vy *= (1 - dt * 1.0);
      } else if (p.k === 1) {
        p.vy += p.g * dt;
        p.vx *= (1 - dt * 0.6);
      } else if (p.k === 3) {
        const distFromCenter = Math.abs(p.x - logoMidX) / Math.max(20, geo ? geo.w * lg.s * 0.5 : 100);
        const chimney = Math.max(0, 1 - distFromCenter * 0.5) * 12;
        p.vy -= (p.buoyancy + chimney) * dt;

        const eddy1 = Math.sin(p.y * 0.02 + p.t * 2.2 + p.seed) * p.swayAmp;
        const eddy2 = Math.cos(p.x * 0.03 - p.t * 3.2 + p.seed * 1.6) * (p.swayAmp * 0.55);
        const flutter = Math.sin(p.t * p.flutterFreq + p.seed * 2.8) * p.flutterAmp;
        p.vx += (eddy1 + eddy2 + flutter + p.drift) * 1.4 * dt;

        p.popTimer -= dt;
        if (p.popTimer <= 0) {
          p.popTimer = rand(1.2, 3.2);
          p.vx += rand(-20, 20);
          p.vy -= rand(14, 30);
          p.flare = 0.5;
          p.drift = rand(-12, 12);
        }
        if (p.flare > 0) p.flare = Math.max(0, p.flare - dt * 2.2);

        p.vx *= (1 - dt * 1.25);
        p.vy *= (1 - dt * 0.65);
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }

  // ------------------------------------------------------------------ eyes
  // An eye: almond (or round) socket that opens, glares (pupil follows the pointer, darts now and then), blinks, closes.
  // A "watcher" is a group of eyes that share timing: a pair, one huge eye, a cluster, or a vertical stack.
  const look = { x: 0.5, y: 0.5 };   // pointer in 0..1 screen space
  const onMove = (e) => { look.x = e.clientX / Math.max(1, innerWidth); look.y = e.clientY / Math.max(1, innerHeight); };
  window.addEventListener('pointermove', onMove, true);
  const avoid = () => [logoEl, els.menu, els.tag].filter(Boolean).map((n) => {
    const r = n.getBoundingClientRect(), c = cv.getBoundingClientRect();
    return { x0: (r.left - c.left) / PX - 6, y0: (r.top - c.top) / PX - 6, x1: (r.right - c.left) / PX + 6, y1: (r.bottom - c.top) / PX + 6 };
  });
  function spot(rx, ry) {   // somewhere in the dark, clear of the logo and menu (and not on top of another watcher)
    const boxes = avoid();
    let best = null;
    for (let i = 0; i < 30; i++) {
      const x = rand(rx + 4, W - rx - 4), y = rand(ry + 4, H - ry - 4);
      const hit = boxes.some((b) => x + rx > b.x0 && x - rx < b.x1 && y + ry > b.y0 && y - ry < b.y1) ||
        eyes.some((w) => Math.abs(w.x - x) < rx + w.rx && Math.abs(w.y - y) < ry + w.ry);
      if (!hit) return [x, y];
      if (!best) best = [x, y];
    }
    return Math.random() < 0.3 ? best : null;
  }
  function watcher() {
    const r = Math.random(), list = [];
    const slit = Math.random() < 0.55, hue = rand(-12, 14);
    let rx, ry;
    if (r < 0.45) {                                    // a pair, maybe slanted in anger
      const w = rand(4, 13), gap = w * rand(1.4, 2.6), tilt = rand(-0.35, 0.45);
      list.push({ dx: -gap / 2, dy: 0, w, h: w * rand(0.35, 0.6), rot: tilt }, { dx: gap / 2, dy: 0, w, h: w * rand(0.35, 0.6), rot: -tilt });
      rx = gap / 2 + w; ry = w;
    } else if (r < 0.65) {                             // one big eye
      const w = rand(18, 42);
      list.push({ dx: 0, dy: 0, w, h: w * rand(0.4, 0.62), rot: rand(-0.12, 0.12) });
      rx = w * 0.6; ry = w * 0.4;
    } else if (r < 0.88) {                             // a cluster of little eyes, opening one after another
      const n = randi(3, 8), R = rand(6, 14);
      for (let i = 0; i < n; i++) { const a = rand(6.28), d = rand(0, R), w = rand(2.5, 6.5); list.push({ dx: Math.cos(a) * d, dy: Math.sin(a) * d * 0.7, w, h: w * rand(0.4, 0.75), rot: rand(-0.6, 0.6), lag: rand(0, 0.9) }); }
      rx = R + 7; ry = R * 0.7 + 5;
    } else {                                           // a vertical stack, like something tall pressed to the dark
      const n = randi(2, 4), w = rand(4, 8);
      for (let i = 0; i < n; i++) list.push({ dx: rand(-1.5, 1.5), dy: (i - (n - 1) / 2) * w * 0.9, w: w * rand(0.8, 1.15), h: w * 0.42, rot: rand(-0.15, 0.15), lag: i * 0.12 });
      rx = w; ry = n * w * 0.5 + 2;
    }
    const at = spot(rx, ry); if (!at) return;
    const open = Math.random() < 0.3 ? rand(0.9, 1.6) : rand(0.18, 0.4);   // sometimes they open slowly, which is worse
    const hold = rand(1.4, 4.2);
    const blinks = []; for (let n = randi(0, 2), t = rand(0.5, 1.2); n-- > 0 && t < hold - 0.3; t += rand(0.6, 1.6)) blinks.push(open + t);
    const depth = rand(0.4, 1.2);
    eyes.push({ x: at[0], y: at[1], rx, ry, list, slit, hue, t: 0, open, hold, close: rand(0.2, 0.7), blinks,
      gaze: [0, 0], dart: rand(0.8, 2), dartTo: null, glare: Math.random() < 0.25, depth });
  }
  function lid(w, tt) {   // 0 closed .. 1 open
    if (tt <= 0) return 0;
    let o = tt < w.open ? Math.pow(tt / w.open, 0.7) : tt < w.open + w.hold ? 1 : 1 - (tt - w.open - w.hold) / w.close;
    for (const b of w.blinks) { const d = Math.abs(tt - b); if (d < 0.11) o = Math.min(o, d / 0.11); }
    return clamp(o, 0, 1);
  }
  function updateEyes(dt) {
    eyeT -= dt;
    if (eyeT <= 0) {
      eyeT = rand(0.7, 2.4);
      const n = Math.random() < 0.25 ? randi(2, 3) : 1;
      for (let i = 0; i < n && eyes.length < 7; i++) watcher();
    }
    for (let i = eyes.length - 1; i >= 0; i--) {
      const w = eyes[i];
      w.t += dt;
      if (w.t > w.open + w.hold + w.close + 1) { eyes.splice(i, 1); continue; }
      // gaze: toward the pointer (or a glare straight out), with sudden darts aside
      w.dart -= dt;
      if (w.dart <= 0) { w.dart = rand(0.7, 2.2); w.dartTo = Math.random() < 0.5 ? [rand(-1, 1), rand(-0.6, 0.6)] : null; }
      let gx = (look.x * W - w.x) / (W * 0.35), gy = (look.y * H - w.y) / (H * 0.35);
      if (w.glare) { gx = 0; gy = 0; }
      if (w.dartTo) [gx, gy] = w.dartTo;
      const m = Math.hypot(gx, gy); if (m > 1) { gx /= m; gy /= m; }
      const k = Math.min(1, dt * (w.dartTo ? 18 : 5));
      w.gaze[0] += (gx - w.gaze[0]) * k; w.gaze[1] += (gy - w.gaze[1]) * k;
    }
  }
  function drawEyes() {
    lctx.clearRect(0, 0, W, H);
    const glows = [];
    for (const w of eyes) {
      const pxShift = (look.x - 0.5) * 14 * (w.depth || 0.6);
      const pyShift = (look.y - 0.5) * 10 * (w.depth || 0.6);
      for (const e of w.list) {
        const o = lid(w, w.t - (e.lag || 0)); if (o <= 0.02) continue;
        const x = w.x + e.dx + pxShift, y = w.y + e.dy + pyShift, hw = e.w / 2, hh = Math.max(0.5, e.h / 2 * o);
        glows.push([x, y, e.w, o]);
        lctx.save(); lctx.translate(x, y); lctx.rotate(e.rot);
        lctx.beginPath(); lctx.moveTo(-hw, 0);
        lctx.quadraticCurveTo(0, -hh * 2, hw, 0); lctx.quadraticCurveTo(0, hh * 2, -hw, 0); lctx.closePath();
        const g = lctx.createRadialGradient(0, 0, 0, 0, 0, hw);
        g.addColorStop(0, `hsl(${18 + w.hue},100%,62%)`); g.addColorStop(0.45, `hsl(${4 + w.hue},100%,45%)`); g.addColorStop(1, `hsl(${356 + w.hue},90%,16%)`);
        lctx.fillStyle = g; lctx.fill();
        lctx.save(); lctx.clip();
        const px = w.gaze[0] * hw * 0.45, py = w.gaze[1] * hh * 0.5;   // pupil
        lctx.fillStyle = '#ffd27a'; lctx.beginPath(); lctx.ellipse(px, py, e.w * 0.2, e.h * 0.34, 0, 0, 7); lctx.globalAlpha = 0.45; lctx.fill(); lctx.globalAlpha = 1;
        lctx.fillStyle = '#060000'; lctx.beginPath();
        if (w.slit) lctx.ellipse(px, py, Math.max(0.5, e.w * 0.055), e.h * 0.48, 0, 0, 7);
        else lctx.ellipse(px, py, Math.max(0.6, e.w * 0.13), Math.max(0.6, e.w * 0.13), 0, 0, 7);
        lctx.fill();
        if (e.w > 9) { lctx.fillStyle = 'rgba(255,240,220,.8)'; lctx.fillRect(Math.round(px - e.w * 0.12), Math.round(py - e.h * 0.2), 1, 1); }   // a wet glint
        lctx.restore();
        lctx.strokeStyle = 'rgba(20,0,0,.9)'; lctx.lineWidth = 0.8; lctx.stroke();   // lids
        lctx.restore();
      }
    }
    ectx.clearRect(0, 0, eyeCv.width, eyeCv.height);
    if (!glows.length) return;
    ectx.globalCompositeOperation = 'lighter';
    for (const [x, y, w, o] of glows) {   // a dim red bloom round each eye
      const r = w * 1.6 * S, g = ectx.createRadialGradient(x * S, y * S, 0, x * S, y * S, r);
      g.addColorStop(0, `rgba(200,20,6,${(0.22 * o).toFixed(3)})`); g.addColorStop(1, 'rgba(120,0,0,0)');
      ectx.fillStyle = g; ectx.fillRect(x * S - r, y * S - r, r * 2, r * 2);
    }
    ectx.globalCompositeOperation = 'source-over';
    ectx.imageSmoothingEnabled = false;   // chunky pixels, like the rest of the game
    ectx.drawImage(lowCv, 0, 0, W, H, 0, 0, W * S, H * S);
  }

  // ------------------------------------------------------------------ draw fire & embers
  function draw() {
    const cw = cv.width, ch = cv.height, lw = D;   // lw: one css px in device px
    ctx.clearRect(0, 0, cw, ch);

    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';

    // 1. Flame tongues (k: 0): white-hot incandescent cores, golden body, and fiery red sheaths
    for (let tier = 0; tier < 4; tier++) {
      const strokeCol = tier === 0 ? '#b81c04' : tier === 1 ? '#ff5a0a' : tier === 2 ? '#ffb818' : '#fffbe0';
      const widthMult = (tier === 0 ? 2.4 : tier === 1 ? 1.6 : tier === 2 ? 1.0 : 0.55) * ZS;
      ctx.strokeStyle = strokeCol;
      ctx.lineWidth = Math.max(1, lw * widthMult);
      ctx.beginPath();
      let count = 0;
      for (const p of parts) {
        if (p.k !== 0) continue;
        const u = p.t / p.life;
        if (tier === 3 && u > 0.35) continue;
        if (tier === 2 && u > 0.65) continue;
        if (tier === 1 && u > 0.88) continue;

        const hx = p.x * S, hy = p.y * S;
        const tailDt = (tier === 3 ? 0.022 : 0.038) * p.sz;
        const tx = (p.x - p.vx * tailDt) * S, ty = (p.y - p.vy * tailDt) * S;
        ctx.moveTo(tx, ty);
        ctx.lineTo(hx, hy);
        count++;
      }
      if (count > 0) ctx.stroke();
    }

    // 2. Ballistic sparks (k: 1)
    for (const hot of [true, false]) {
      ctx.strokeStyle = hot ? '#fff0a0' : '#ff7a10';
      ctx.globalAlpha = hot ? 0.95 : 0.65;
      ctx.lineWidth = lw;
      ctx.beginPath();
      for (const p of parts) {
        if (p.k !== 1 || (p.t / p.life < 0.45) !== hot) continue;
        ctx.moveTo((p.x - p.vx * 0.04) * S, (p.y - p.vy * 0.04) * S);
        ctx.lineTo(p.x * S, p.y * S);
      }
      ctx.stroke();
    }

    // 3. Realistic trailing embers (k: 3)
    for (const p of parts) {
      if (p.k !== 3) continue;
      const u = p.t / p.life;
      const flicker = 0.75 + 0.25 * Math.sin(p.t * p.flickerRate + p.seed);
      const flare = p.flare || 0;
      const brightness = Math.min(1.6, (1 - u * 0.7) * flicker + flare);
      const fadeIn = u < 0.05 ? u / 0.05 : 1;
      const fadeOut = u > 0.85 ? (1 - u) / 0.15 : 1;
      const alpha = Math.max(0, Math.min(1, fadeIn * fadeOut * p.baseAlpha));
      if (alpha <= 0.01) continue;

      let r, g, b;
      if (u < 0.18) {
        const k = u / 0.18;
        r = 255; g = Math.round(250 - 45 * k); b = Math.round(200 - 160 * k);
      } else if (u < 0.52) {
        const k = (u - 0.18) / 0.34;
        r = 255; g = Math.round(205 - 115 * k); b = Math.round(40 - 30 * k);
      } else if (u < 0.82) {
        const k = (u - 0.52) / 0.30;
        r = Math.round(255 - 75 * k); g = Math.round(90 - 72 * k); b = Math.round(10 - 5 * k);
      } else {
        const k = (u - 0.82) / 0.18;
        r = Math.round(180 - 115 * k); g = Math.round(18 - 14 * k); b = 5;
      }

      const hx = p.x * S, hy = p.y * S;
      const trailTime = p.trailLen * (1 + flare * 0.7);
      const tx = (p.x - p.vx * trailTime) * S;
      const ty = (p.y - p.vy * trailTime) * S;

      ctx.strokeStyle = `rgba(${r},${g},${b},${(alpha * 0.85).toFixed(3)})`;
      ctx.lineWidth = Math.max(0.75 * lw, p.sz * lw * 0.75);
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(hx, hy);
      ctx.stroke();

      const headR = Math.max(0.8 * lw, p.sz * lw * 0.65);
      ctx.fillStyle = `rgba(${r},${g},${b},${alpha.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(hx, hy, headR, 0, 6.28);
      ctx.fill();

      if (brightness > 0.95 || u < 0.22) {
        ctx.fillStyle = `rgba(255,255,230,${Math.min(1, alpha * 1.2).toFixed(3)})`;
        const coreR = Math.max(0.5 * lw, headR * 0.45);
        ctx.beginPath();
        ctx.arc(hx, hy, coreR, 0, 6.28);
        ctx.fill();
      }
    }

    // 4. Shockwave ring (k: 4)
    for (const p of parts) {
      if (p.k !== 4) continue;
      const u = p.t / p.life, r = p.r * Math.sqrt(u) * S;
      ctx.globalAlpha = 0.75 * (1 - u);
      ctx.strokeStyle = u < 0.3 ? '#fff5c0' : '#ff7a10';
      ctx.lineWidth = 2.5 * lw;
      ctx.beginPath();
      ctx.ellipse(p.x * S, p.y * S, r, r * 0.4, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    if (flash > 0) {
      ctx.fillStyle = `rgba(255,${(150 + flash * 100) | 0},${(60 + flash * 120) | 0},${(flash * 0.45).toFixed(3)})`;
      ctx.fillRect(0, 0, cw, ch);
    }
  }

  // ------------------------------------------------------------------ loop
  function detach() {
    cancelAnimationFrame(raf); cv.remove(); eyeCv.remove(); screen.style.transform = '';
    for (const k of EVTS) window.removeEventListener(k, onInput, true);
    window.removeEventListener('pointermove', onMove, true);
  }
  function frame(now) {
    if (!cv.isConnected) { detach(); return; }
    raf = requestAnimationFrame(frame);
    const raw = (now - last) / 1000, dt = Math.min(0.05, raw); last = now;
    if (phase === 'lit' && raw < 0.5) {   // frames over ~22 ms for a while: thin the fire (never below 15%)
      slow = raw > 0.022 ? slow + 1 : Math.max(0, slow - 1);
      if (slow > 20) { slow = 0; Q = Math.max(0.15, Q * 0.8); }
    }
    resize();
    updateTimeline();
    styleLogo(now);
    updateEyes(dt); drawEyes();
    if (ready) {
      place();
      emitLogo(dt);
      updateParts(dt);
      draw();
    }
    flash = Math.max(0, flash - dt * 2);
    if (shake > 0) {
      shake = Math.max(0, shake - dt);
      const m = shake * 12;
      screen.style.transform = shake > 0 ? `translate(${rand(-m, m).toFixed(1)}px,${rand(-m, m).toFixed(1)}px)` : '';
    }
  }

  cv.fx = { state: () => ({ phase, ts, Q, ready: screen.classList.contains('title-ready'), W, H, parts: parts.length, eyes: eyes.length, opacity: +logoEl.style.opacity }), skip, begin, watcher };   // test hooks
  const start = (img) => {
    try { geo = geo || logoGeometry(img); } catch (e) { return; }   // never let FX break the menu: just no flames
    if (!geo.top.length) return;
    if (!geo.cracks.length) geo.cracks = geo.top;
    ready = true;
    if (phase === 'lit') { place(); burst(); flash = 0; shake = 0; }
  };
  last = performance.now(); raf = requestAnimationFrame(frame);
  styleLogo(last);
  if (geo || A.logo) start(A.logo);
  else if (logoEl.complete && logoEl.naturalWidth) start(logoEl);
  else logoEl.addEventListener('load', () => start(logoEl), { once: true });
  return detach;
}
