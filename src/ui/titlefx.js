// Title screen logo FX: flames and embers rise off the VELSCOUR logo, black tar drips from its spikes and piles up
// on the floor, and now and then a falling spark lands on the pile, which catches fire and explodes.
// Simulated in coarse units (one unit = PX css px) but drawn at device resolution with tiny particles, on a canvas
// laid over the title screen. A low-res copy of the fire, upscaled with smoothing, gives it a soft glow.
import { A } from '../core/assets.js';
import { sfx } from '../core/audio.js';
import { rand, randi, clamp } from '../core/util.js';

const FLAME = ['#fff7c8', '#ffe070', '#ffb428', '#ff7a12', '#e0400a', '#9a1c06', '#4a0c04'];
const TAR = '#0a0706', TAR_RIM = '#55392b', TAR_SHINE = '#a08474';   // glossy black, rim-lit by the fire
const GRAV = 220;            // sim px / s^2 for tar and heavy sparks
const REPOSE = 0.6;          // max slope of the tar pile before it creeps sideways
let geo = null;              // logo emitter points in native logo pixels (built once)

/** Sample the logo's alpha/colour: top contour (flames), molten cracks (embers), bottom spike tips (tar drips). */
function logoGeometry(img) {
  const w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const cx = c.getContext('2d', { willReadFrequently: true }); cx.drawImage(img, 0, 0);
  const d = cx.getImageData(0, 0, w, h).data;
  const a = (x, y) => d[(y * w + x) * 4 + 3];
  const top = [], cracks = [], bottom = new Int16Array(w).fill(-1);
  for (let x = 0; x < w; x++) {
    let y0 = -1, y1 = -1;
    for (let y = 0; y < h; y++) if (a(x, y) > 110) { if (y0 < 0) y0 = y; y1 = y; }
    bottom[x] = y1;
    if (y0 >= 0 && x % 3 === 0) top.push([x, y0]);
  }
  for (let i = 0; i < 40000 && cracks.length < 700; i++) {
    const x = randi(0, w - 1), y = randi(0, h - 1), k = (y * w + x) * 4;
    if (d[k + 3] > 200 && d[k] > 220 && d[k + 1] > 70 && d[k + 1] < 190 && d[k + 2] < 90) cracks.push([x, y]);
  }
  // spike tips: columns that hang lowest within +-24px, at least 40px apart
  const tips = [];
  for (let x = 24; x < w - 24; x++) {
    const y = bottom[x]; if (y < h * 0.55) continue;
    let best = true;
    for (let j = -24; j <= 24 && best; j++) if (bottom[x + j] > y || (bottom[x + j] === y && j < 0)) best = false;
    if (best && (!tips.length || x - tips[tips.length - 1][0] >= 40)) tips.push([x, y]);
  }
  return { w, h, top, cracks, tips };
}

/** Attach the effect to the title screen. The loop stops by itself once the screen leaves the DOM. */
export function attachTitleFx(screen, logoEl) {
  const cv = document.createElement('canvas');
  cv.className = 'title-fx';
  screen.prepend(cv);
  const ctx = cv.getContext('2d');
  const reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const glowCv = document.createElement('canvas'), gctx = glowCv.getContext('2d');
  let W = 0, H = 0, PX = 3, D = 1, S = 3, cssW = 0, cssH = 0, pile = new Float32Array(0), burn = new Float32Array(0);
  let parts = [], drops = [], drips = [], fires = [], blasts = [];
  let flash = 0, shake = 0, sinceBoom = 3, last = performance.now(), map = null, raf = 0;
  const lg = { s: 1, x: 0, y: 0 };

  function resize() {
    const r = cv.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (r.width === cssW && r.height === cssH && dpr === D) return;
    cssW = r.width; cssH = r.height; D = dpr;
    PX = Math.max(2, Math.round(Math.min(r.width, r.height) / 240)); S = PX * D;   // device px per sim unit
    cv.width = Math.max(1, Math.round(r.width * D)); cv.height = Math.max(1, Math.round(r.height * D));
    const w = Math.max(1, Math.round(r.width / PX)), h = Math.max(1, Math.round(r.height / PX));
    glowCv.width = w; glowCv.height = h;
    if (w === W && h === H) return;
    const old = pile; W = w; H = h;
    pile = new Float32Array(W); burn = new Float32Array(W);
    pile.set(old.subarray(0, Math.min(old.length, W)));
  }
  // logo native px -> sim px, honouring object-fit: contain and the intro scale animation
  function place() {
    const c = cv.getBoundingClientRect(), r = logoEl.getBoundingClientRect();
    const s = Math.min(r.width / geo.w, r.height / geo.h);
    lg.s = s / PX;
    lg.x = (r.left + (r.width - geo.w * s) / 2 - c.left) / PX;
    lg.y = (r.top + (r.height - geo.h * s) / 2 - c.top) / PX;
    if (!map || map.length !== geo.tips.length) {
      drips = geo.tips.map(([x, y]) => ({ nx: x, ny: y, len: 0, max: rand(4, 9), rate: rand(1.2, 3.2), wait: rand(0, 4), snap: 0 }));
      map = geo.tips;
    }
  }
  const P = (nx, ny) => [lg.x + nx * lg.s, lg.y + ny * lg.s];
  const floorAt = (x) => H - (pile[clamp(Math.round(x), 0, W - 1)] || 0);

  // ------------------------------------------------------------------ particles
  // kind: 0 flame (additive, ramps through FLAME), 1 spark (additive, ballistic, may ignite tar),
  //       2 smoke (alpha), 3 tar glob (dark, ballistic; burning globs ignite tar they land on). sz is in css px.
  const add = (o) => { if (parts.length < 8000) parts.push(o); };
  const flame = (x, y, vx, vy, life, sz = 1) => add({ k: 0, x, y, vx, vy, t: 0, life, sz, ph: rand(6.28) });
  const spark = (x, y, vx, vy, life, g, fated = false) => add({ k: 1, x, y, vx, vy, t: 0, life, g, fated });
  const smoke = (x, y, vx, vy, life, sz) => add({ k: 2, x, y, vx, vy, t: 0, life, sz });
  const glob = (x, y, vx, vy, lit) => add({ k: 3, x, y, vx, vy, t: 0, life: 4, lit, sz: rand(0.8, 2) });

  function emitLogo(dt) {
    const s = lg.s;
    for (let n = Math.floor(dt * 1700 + Math.random()); n-- > 0;) {        // flame tongues along the top edge
      const [x, y] = P(...geo.top[randi(0, geo.top.length - 1)]);
      flame(x + rand(-1, 1), y + rand(0, 3 * s * 8), rand(-4, 4), -rand(10, 26), rand(0.3, 0.75), rand(1, 2.2));
    }
    for (let n = Math.floor(dt * 140 + Math.random()); n-- > 0;) {         // embers out of the molten cracks
      const [x, y] = P(...geo.cracks[randi(0, geo.cracks.length - 1)]);
      flame(x, y, rand(-3, 3), -rand(6, 16), rand(1.2, 2.6), 1);
    }
    for (let n = Math.floor(dt * 22 + Math.random()); n-- > 0;) {        // drifting sparks
      const [x, y] = P(...geo.top[randi(0, geo.top.length - 1)]);
      const heavy = Math.random() < 0.18;
      spark(x, y, rand(-28, 28), -rand(30, 80), heavy ? rand(2.5, 3.5) : rand(0.8, 1.8), heavy ? GRAV * 0.6 : rand(-10, 25));
    }
  }

  // a spark that pops off the logo and arcs down onto the tallest part of the pile
  function fatedSpark() {
    let bx = 0; for (let x = 1; x < W; x++) if (pile[x] > pile[bx]) bx = x;
    const tx = bx + rand(-2, 2), ty = H - pile[bx];
    let best = null;
    for (let i = 0; i < 12; i++) { const p = P(...geo.top[randi(0, geo.top.length - 1)]); if (!best || Math.abs(p[0] - tx) < Math.abs(best[0] - tx)) best = p; }
    const [x0, y0] = best, T = rand(1.5, 2.1), g = GRAV * 0.6;
    spark(x0, y0, (tx - x0) / T, (ty - y0 - 0.5 * g * T * T) / T, T + 0.5, g, true);
  }

  // ------------------------------------------------------------------ tar
  function updateDrips(dt) {
    for (const d of drips) {
      if (d.snap > 0) { d.snap -= dt; d.len = Math.max(0, d.len - dt * 30); continue; }
      if (d.wait > 0) { d.wait -= dt; continue; }
      d.len += dt * d.rate * (0.6 + d.len * 0.35);           // stretches faster as it gets heavy
      if (d.len >= d.max) {
        const [x, y] = P(d.nx, d.ny);
        drops.push({ x: Math.round(x), y: y + d.len, vy: 8, sz: d.max > 5 ? 2 : 1, vol: d.max * 2.8 });
        d.len = d.max * 0.6; d.snap = 0.18; d.max = rand(4, 9); d.wait = rand(0.6, 3.5); d.rate = rand(1.2, 3.2);
      }
    }
    for (let i = drops.length - 1; i >= 0; i--) {
      const o = drops[i];
      o.vy += GRAV * dt; o.y += o.vy * dt;
      const x = clamp(o.x, 0, W - 1);
      if (o.y >= floorAt(x)) {
        if (pile[x] < H * 0.4) for (let j = -2; j <= 2; j++) { const xx = x + j; if (xx >= 0 && xx < W) pile[xx] += o.vol * [0.1, 0.2, 0.4, 0.2, 0.1][j + 2]; }
        for (let n = randi(2, 5); n-- > 0;) glob(x, floorAt(x) - 1, rand(-25, 25), -rand(15, 45), false);
        if (burn[x] > 0) for (let n = 20; n-- > 0;) flame(x + rand(-2, 2), floorAt(x), rand(-10, 10), -rand(20, 50), rand(0.3, 0.6), rand(1, 2));
        drops.splice(i, 1);
      }
    }
  }

  function relaxPile(dt) {
    const k = Math.min(0.5, dt * 6);
    const step = (x, y) => { const d = pile[x] - pile[y]; if (d > REPOSE) { const m = (d - REPOSE) * k * 0.5; pile[x] -= m; pile[y] += m; } else if (d > 0.05 && pile[x] > 1) { const m = d * dt * 0.25; pile[x] -= m; pile[y] += m; } };   // + slow sag rounds the mounds off
    if (Math.random() < 0.5) for (let x = 0; x < W - 1; x++) { step(x, x + 1); step(x + 1, x); }
    else for (let x = W - 2; x >= 0; x--) { step(x + 1, x); step(x, x + 1); }
  }

  // ------------------------------------------------------------------ fire + explosion
  function segment(x) {   // contiguous run of tar around x
    let a = x, b = x;
    while (a > 0 && pile[a - 1] > 0.4) a--;
    while (b < W - 1 && pile[b + 1] > 0.4) b++;
    return [a, b];
  }
  function ignite(x, fated) {
    x = clamp(Math.round(x), 0, W - 1);
    if (pile[x] < 1.5 || burn[x] > 0) return false;
    const [a, b] = segment(x);
    let vol = 0; for (let i = a; i <= b; i++) vol += pile[i];
    if (!fated && sinceBoom > 2 && (sinceBoom < 16 || vol < 60)) return false;
    if (vol < 25) { for (let n = 25; n-- > 0;) flame(x, floorAt(x), rand(-8, 8), -rand(10, 30), rand(0.2, 0.5)); return false; }   // too little: fizzles
    fires.push({ x, a, b, t: 0, front: 0, dur: 0.45 + (b - a) / 300 + rand(0.15, 0.35) });
    burn[x] = 0.001;
    sfx('fire', 0.6);
    return true;
  }
  function updateFires(dt) {
    for (let i = fires.length - 1; i >= 0; i--) {
      const f = fires[i];
      f.t += dt; f.front += dt * 280;                          // flames race along the pile
      for (let x = f.a; x <= f.b; x++) if (Math.abs(x - f.x) <= f.front && pile[x] > 0.4) burn[x] += dt;
      for (let x = f.a; x <= f.b; x++) {
        if (burn[x] <= 0) continue;
        const heat = Math.min(1, burn[x] * 2.5) * (1 + f.t / f.dur);
        for (let n = Math.floor(dt * 55 * heat + Math.random()); n-- > 0;) flame(x + rand(-0.5, 0.5), floorAt(x) + rand(0, 1), rand(-5, 5), -rand(18, 45) * (0.6 + pile[x] / 12), rand(0.35, 0.9), rand(0.8, 2));
        if (Math.random() < dt * 2 * heat) smoke(x, floorAt(x) - 4, rand(-4, 4), -rand(8, 18), rand(1.5, 2.6), 2);
        if (Math.random() < dt * 2.5 * heat) spark(x, floorAt(x), rand(-20, 20), -rand(40, 90), rand(0.6, 1.2), GRAV * 0.4);
      }
      if (f.t >= f.dur) { explode(f); fires.splice(i, 1); }
    }
  }
  // the burning pile goes up mound by mound, a chain of blasts racing out from where the spark landed
  function explode(f) {
    const peaks = [];
    for (let x = f.a; x <= f.b; x++) {
      let top = true;
      for (let j = -14; j <= 14 && top; j++) { const y = x + j; if (y >= f.a && y <= f.b && (pile[y] > pile[x] || (pile[y] === pile[x] && j < 0))) top = false; }
      if (top && pile[x] > 1.5) peaks.push(x);
    }
    if (!peaks.length) peaks.push(f.x);
    let a = f.a;
    peaks.forEach((px, i) => {
      const b = i < peaks.length - 1 ? Math.floor((px + peaks[i + 1]) / 2) : f.b;
      blasts.push({ a, b, delay: Math.abs(px - f.x) / 600 + i * 0.02 });
      a = b + 1;
    });
    sinceBoom = 0;
  }
  function blast(g) {
    let vol = 0, cx = 0, top = 0;
    for (let x = g.a; x <= g.b; x++) { vol += pile[x]; cx += x * pile[x]; top = Math.max(top, pile[x]); }
    if (vol < 1) return;
    cx /= vol;
    const pw = clamp(vol / 90, 0.4, 1.5), hy = H - top - 3;
    for (let n = Math.round(30 * pw); n-- > 0;) {                       // flung tar, picked by height
      let x = randi(g.a, g.b); for (let k = 0; k < 3; k++) { const y = randi(g.a, g.b); if (pile[y] > pile[x]) x = y; }
      const dir = Math.sign(x - cx) || (Math.random() < 0.5 ? -1 : 1);
      glob(x, H - rand(0, pile[x]), dir * rand(10, 110) * pw + rand(-30, 30), -rand(90, 270) * pw, Math.random() < 0.8);
    }
    for (let x = g.a; x <= g.b; x++) { pile[x] = 0; burn[x] = 0; }
    for (let n = Math.round(220 * pw); n-- > 0;) {                      // fireball
      const a = rand(Math.PI * 0.95, Math.PI * 2.05), v = rand(20, 190) * pw * (Math.random() < 0.3 ? 0.4 : 1);
      flame(cx + rand(-3, 3), hy + rand(-3, 3), Math.cos(a) * v, Math.sin(a) * v * 1.2 - 30, rand(0.35, 1.2), rand(1, 2.6));
    }
    for (let n = Math.round(45 * pw); n-- > 0;) { const a = rand(Math.PI, Math.PI * 2), v = rand(50, 210) * pw; spark(cx, hy, Math.cos(a) * v, Math.sin(a) * v, rand(0.6, 1.8), GRAV * 0.5); }
    for (let n = Math.round(22 * pw); n-- > 0;) smoke(cx + rand(-12, 12), hy - rand(0, 18), rand(-35, 35), -rand(20, 70), rand(1.8, 3.4), randi(2, 4));
    parts.push({ k: 4, x: cx, y: H - 2, t: 0, life: 0.5, r: 70 * pw });   // shockwave ring
    flash = Math.min(0.85, flash + 0.3 + pw * 0.2); shake = reduceMotion ? 0 : Math.min(0.9, shake + 0.25 + 0.2 * pw);
    for (const d of drips) { d.wait = Math.max(d.wait, rand(0.5, 2)); d.len = Math.max(0, d.len - 2); }   // the blast shakes the drips loose
    sinceBoom = 0;
    sfx('explode', 1.0, rand(0.6, 0.8)); sfx('thud', 0.8, 0.6);
  }
  function updateBlasts(dt) {
    for (let i = blasts.length - 1; i >= 0; i--) if ((blasts[i].delay -= dt) <= 0) { blast(blasts[i]); blasts.splice(i, 1); }
  }

  function updateParts(dt) {
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.t += dt;
      if (p.t >= p.life) { parts[i] = parts[parts.length - 1]; parts.pop(); continue; }
      if (p.k === 4) continue;
      if (p.k === 0) { const f = 1 - Math.min(0.5, dt * Math.hypot(p.vx, p.vy) * 0.03); p.vx += Math.sin(p.t * 9 + p.ph) * 30 * dt; p.vy -= 6 * dt; p.vx *= f * (1 - dt * 1.5); p.vy *= f * (1 - dt * 0.8); }   // fast flames drag hard: blasts stay a fireball
      else if (p.k === 1) { p.vy += p.g * dt; p.vx *= 1 - dt * 0.4; }
      else if (p.k === 2) { p.vx *= 1 - dt * 0.8; p.vy *= 1 - dt * 0.4; }
      else { p.vy += GRAV * dt; p.vx *= 1 - dt * 0.3; if (p.lit) for (let n = Math.floor(dt * 12 + Math.random()); n-- > 0;) flame(p.x + rand(-0.5, 0.5), p.y + rand(-0.5, 0.5), rand(-4, 4), -rand(5, 15), rand(0.2, 0.5), rand(0.7, 1.4)); if (Math.random() < dt * 4) smoke(p.x, p.y, 0, -5, rand(0.8, 1.4), 1); }
      p.x += p.vx * dt; p.y += p.vy * dt;
      if ((p.k === 1 || p.k === 3) && p.vy > 0 && p.x >= 0 && p.x < W && p.y >= floorAt(p.x)) {
        if (p.k === 1 ? (p.fated || p.t > 0.25) : p.lit) ignite(p.x, p.fated);
        if (p.k === 3) { const x = clamp(Math.round(p.x), 0, W - 1); pile[x] += 0.5; }
        parts[i] = parts[parts.length - 1]; parts.pop();
      } else if (p.y > H + 10 || p.x < -20 || p.x > W + 20) { parts[i] = parts[parts.length - 1]; parts.pop(); }
    }
  }

  // ------------------------------------------------------------------ draw
  const buckets = Array.from({ length: FLAME.length * 8 }, () => []);
  function draw(time) {
    const cw = cv.width, ch = cv.height, lw = D;   // lw: one css px in device px
    ctx.clearRect(0, 0, cw, ch);
    // tar drips hanging from the spikes: tapered strand + bulb
    for (const d of drips) {
      if (d.len < 0.5) continue;
      const [x, y] = P(d.nx, d.ny), X = x * S, Y = (y - 0.5) * S, L = d.len * S, r = (0.9 + Math.min(d.len, 9) * 0.17) * lw, by = Y + L - r;
      ctx.fillStyle = TAR;
      ctx.beginPath(); ctx.moveTo(X - lw, Y); ctx.lineTo(X + lw, Y); ctx.lineTo(X + r * 0.55, by); ctx.lineTo(X - r * 0.55, by); ctx.fill();
      ctx.beginPath(); ctx.arc(X, by, r, 0, 7); ctx.fill();
      ctx.strokeStyle = TAR_RIM; ctx.lineWidth = lw * 0.8; ctx.beginPath(); ctx.arc(X, by, r, Math.PI * 0.6, Math.PI * 1.2); ctx.stroke();
      ctx.fillStyle = TAR_SHINE; ctx.fillRect(X - r * 0.5, by - r * 0.5, lw, lw);
    }
    // falling drops: teardrop with a short streak
    for (const o of drops) {
      const X = (o.x + 0.5) * S, Y = o.y * S, r = (o.sz > 1 ? 2.4 : 1.7) * lw, tail = clamp(o.vy / 40, 1, 6) * S * 0.6;
      ctx.fillStyle = TAR;
      ctx.beginPath(); ctx.moveTo(X, Y - r - tail); ctx.lineTo(X + r * 0.7, Y - r); ctx.lineTo(X - r * 0.7, Y - r); ctx.fill();
      ctx.beginPath(); ctx.arc(X, Y - r, r, 0, 7); ctx.fill();
      ctx.fillStyle = TAR_SHINE; ctx.fillRect(X - r * 0.5, Y - r * 1.4, lw, lw);
    }
    // pile: smooth silhouette, rim-lit top edge (flame-coloured where burning), ember flecks and glints
    ctx.fillStyle = TAR; ctx.beginPath(); ctx.moveTo(0, ch);
    for (let x = 0; x < W; x++) ctx.lineTo((x + 0.5) * S, ch - pile[x] * S);
    ctx.lineTo(cw, ch); ctx.fill();
    const edge = (hot, style, width) => {
      ctx.strokeStyle = style; ctx.lineWidth = width; ctx.beginPath();
      let on = false;
      for (let x = 0; x < W; x++) {
        const ok = pile[x] > 0.3 && (burn[x] > 0) === hot, X = (x + 0.5) * S, Y = ch - pile[x] * S + width * 0.5;
        if (ok) { on ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); on = true; } else on = false;
      }
      ctx.stroke();
    };
    edge(false, TAR_RIM, 1.5 * lw);
    edge(true, FLAME[2 + ((time * 12) | 0) % 2], 2.5 * lw);
    for (let x = 0; x < W; x++) {
      const h = pile[x]; if (h < 2) continue;
      if (burn[x] > 0) { for (let n = 2; n-- > 0;) if (Math.random() < 0.6) { ctx.fillStyle = FLAME[randi(2, 5)]; ctx.fillRect((x + Math.random()) * S, ch - rand(0, h - 0.5) * S, lw, lw); } }
      else if ((x * 13 + Math.round(h * 3)) % 11 === 0) { ctx.fillStyle = TAR_SHINE; ctx.fillRect((x + 0.3) * S, ch - (h - 0.6) * S, lw, lw); }
    }
    // smoke + tar globs (normal blending)
    ctx.fillStyle = 'rgb(30,24,22)';
    for (let a = 0; a < 6; a++) {   // smoke, batched by fade level
      ctx.globalAlpha = 0.3 * (1 - (a + 0.5) / 6); ctx.beginPath();
      for (const p of parts) if (p.k === 2) { const u = p.t / p.life; if (((u * 6) | 0) !== a) continue; const r = (p.sz * 0.5 + u * 2) * S; ctx.moveTo(p.x * S + r, p.y * S); ctx.arc(p.x * S, p.y * S, r, 0, 7); }
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (const p of parts) {
      if (p.k === 3) {
        ctx.fillStyle = TAR; ctx.beginPath(); ctx.arc(p.x * S, p.y * S, p.sz * lw, 0, 7); ctx.fill();
        if (p.lit) { ctx.fillStyle = FLAME[randi(1, 3)]; ctx.fillRect(p.x * S - lw * 0.5, p.y * S - p.sz * lw - lw, lw, lw); }
      }
    }
    // fire: soft glow (low-res copy, smoothed upscale) then sharp particles batched by colour/alpha, all additive
    gctx.clearRect(0, 0, W, H); gctx.globalCompositeOperation = 'lighter';
    for (const b of buckets) b.length = 0;
    for (const p of parts) {
      if (p.k !== 0) continue;
      const u = p.t / p.life, ci = Math.min(FLAME.length - 1, (u * FLAME.length) | 0), a = 0.95 * (1 - u * u);
      buckets[ci * 8 + Math.min(7, (a * 8) | 0)].push(p);
    }
    for (let i = 0; i < buckets.length; i++) {
      const b = buckets[i]; if (!b.length) continue;
      gctx.fillStyle = FLAME[(i / 8) | 0]; gctx.globalAlpha = ((i % 8) + 0.5) / 8 * 0.35;
      gctx.beginPath(); for (const p of b) gctx.rect(p.x | 0, p.y | 0, 1, 1); gctx.fill();
    }
    ctx.globalCompositeOperation = 'lighter';
    ctx.imageSmoothingEnabled = true; ctx.drawImage(glowCv, 0, 0, W, H, -S, -S, W * S + S, H * S + S);
    for (let i = 0; i < buckets.length; i++) {
      const b = buckets[i]; if (!b.length) continue;
      ctx.fillStyle = FLAME[(i / 8) | 0]; ctx.globalAlpha = ((i % 8) + 0.5) / 8;
      ctx.beginPath(); for (const p of b) { const z = Math.max(1, Math.round(p.sz * lw)); ctx.rect((p.x * S) | 0, (p.y * S) | 0, z, z); } ctx.fill();
    }
    // sparks: thin streaks along their velocity
    for (const hot of [true, false]) {
      ctx.strokeStyle = hot ? FLAME[0] : FLAME[2]; ctx.globalAlpha = hot ? 0.95 : 0.6; ctx.lineWidth = lw; ctx.beginPath();
      for (const p of parts) {
        if (p.k !== 1 || (p.t / p.life < 0.5) !== hot) continue;
        ctx.moveTo((p.x - p.vx * 0.03) * S, (p.y - p.vy * 0.03) * S); ctx.lineTo(p.x * S, p.y * S);
      }
      ctx.stroke();
    }
    ctx.strokeStyle = FLAME[3]; ctx.globalAlpha = 0.6; ctx.lineWidth = lw; ctx.beginPath();   // burning tar trails
    for (const p of parts) if (p.k === 3 && p.lit) { ctx.moveTo((p.x - p.vx * 0.025) * S, (p.y - p.vy * 0.025) * S); ctx.lineTo(p.x * S, p.y * S); }
    ctx.stroke();
    for (const p of parts) {
      if (p.k !== 4) continue;
      const u = p.t / p.life, r = p.r * Math.sqrt(u) * S;
      ctx.globalAlpha = 0.8 * (1 - u); ctx.strokeStyle = u < 0.3 ? FLAME[0] : FLAME[2]; ctx.lineWidth = 2 * lw;
      ctx.beginPath(); ctx.ellipse(p.x * S, p.y * S, r, r * 0.55, 0, Math.PI, Math.PI * 2); ctx.stroke();
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    if (flash > 0) { ctx.fillStyle = `rgba(255,${(150 + flash * 100) | 0},${(60 + flash * 120) | 0},${(flash * 0.5).toFixed(3)})`; ctx.fillRect(0, 0, cw, ch); }
  }

  // ------------------------------------------------------------------ loop
  function frame(now) {
    if (!cv.isConnected) { screen.style.transform = ''; return; }
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    resize(); place();
    sinceBoom += dt;
    emitLogo(dt);
    updateDrips(dt); relaxPile(dt); updateFires(dt); updateBlasts(dt); updateParts(dt);
    // occasionally send a spark onto a decent pile; always once the pile is getting tall
    let top = 0; for (let x = 0; x < W; x++) if (pile[x] > top) top = pile[x];
    if (!fires.length && !blasts.length && sinceBoom > 12 && top > 9 && (Math.random() < dt * 0.22 || top > H * 0.12)) { fatedSpark(); sinceBoom = 6; }
    flash = Math.max(0, flash - dt * 2.4);
    if (shake > 0) {
      shake = Math.max(0, shake - dt);
      const m = shake * 14;
      screen.style.transform = shake > 0 ? `translate(${rand(-m, m).toFixed(1)}px,${rand(-m, m).toFixed(1)}px)` : '';
    }
    draw(now / 1000);
  }

  cv.fx = { pileUp: (h) => { for (let x = 0; x < W; x++) pile[x] = Math.max(pile[x], h * (0.6 + 0.4 * Math.sin(x / 9) ** 2)); }, spark: fatedSpark, state: () => ({ W, H, parts: parts.length, drops: drops.length, fires: fires.length + blasts.length, top: Math.max(0, ...pile) }) };   // test hooks
  const start = (img) => {
    try { geo = geo || logoGeometry(img); } catch (e) { cv.remove(); return; }   // never let FX break the menu
    if (!geo.top.length || !geo.tips.length) { cv.remove(); return; }
    if (!geo.cracks.length) geo.cracks = geo.top;
    last = performance.now(); raf = requestAnimationFrame(frame);
  };
  if (geo || A.logo) start(A.logo);
  else if (logoEl.complete && logoEl.naturalWidth) start(logoEl);
  else logoEl.addEventListener('load', () => start(logoEl), { once: true });
  return () => { cancelAnimationFrame(raf); cv.remove(); screen.style.transform = ''; };
}
