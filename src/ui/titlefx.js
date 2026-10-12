// Title screen logo FX: flames and embers rise off the VELSCOUR logo, black tar drips from its spikes and piles up
// on the floor, and now and then a falling spark lands on the pile, which catches fire and explodes.
// Simulated on a low-res canvas (one sim pixel = PX css px, drawn pixelated) laid over the title screen.
import { A } from '../core/assets.js';
import { sfx } from '../core/audio.js';
import { rand, randi, clamp } from '../core/util.js';

const FLAME = ['#fff7c8', '#ffe070', '#ffb428', '#ff7a12', '#e0400a', '#9a1c06', '#4a0c04'];
const TAR = '#0a0706', TAR_DIM = '#1d1512', TAR_RIM = '#55392b', TAR_SHINE = '#a08474';   // glossy black, rim-lit by the fire
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
  let W = 0, H = 0, PX = 3, pile = new Float32Array(0), burn = new Float32Array(0);
  let parts = [], drops = [], drips = [], fires = [], blasts = [];
  let flash = 0, shake = 0, sinceBoom = 3, last = performance.now(), map = null, raf = 0;
  const lg = { s: 1, x: 0, y: 0 };

  function resize() {
    const r = cv.getBoundingClientRect();
    PX = Math.max(2, Math.round(Math.min(r.width, r.height) / 240));
    const w = Math.max(1, Math.round(r.width / PX)), h = Math.max(1, Math.round(r.height / PX));
    if (w === W && h === H) return;
    const old = pile; W = w; H = h; cv.width = W; cv.height = H;
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
  //       2 smoke (alpha), 3 tar glob (dark, ballistic; burning globs ignite tar they land on)
  const add = (o) => { if (parts.length < 4000) parts.push(o); };
  const flame = (x, y, vx, vy, life, sz = 1) => add({ k: 0, x, y, vx, vy, t: 0, life, sz, ph: rand(6.28) });
  const spark = (x, y, vx, vy, life, g, fated = false) => add({ k: 1, x, y, vx, vy, t: 0, life, g, fated, px: x, py: y });
  const smoke = (x, y, vx, vy, life, sz) => add({ k: 2, x, y, vx, vy, t: 0, life, sz });
  const glob = (x, y, vx, vy, lit) => add({ k: 3, x, y, vx, vy, t: 0, life: 4, lit, sz: randi(1, 2) });

  function emitLogo(dt) {
    const s = lg.s;
    for (let n = Math.floor(dt * 260 + Math.random()); n-- > 0;) {        // flame tongues along the top edge
      const [x, y] = P(...geo.top[randi(0, geo.top.length - 1)]);
      flame(x + rand(-1, 1), y + rand(0, 3 * s * 8), rand(-4, 4), -rand(10, 26), rand(0.3, 0.75), Math.random() < 0.25 ? 2 : 1);
    }
    for (let n = Math.floor(dt * 40 + Math.random()); n-- > 0;) {         // embers out of the molten cracks
      const [x, y] = P(...geo.cracks[randi(0, geo.cracks.length - 1)]);
      flame(x, y, rand(-3, 3), -rand(6, 16), rand(1.2, 2.6), 1);
    }
    if (Math.random() < dt * 7) {                                         // drifting sparks
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
        for (let n = randi(1, 3); n-- > 0;) glob(x, floorAt(x) - 1, rand(-25, 25), -rand(15, 45), false);
        if (burn[x] > 0) for (let n = 6; n-- > 0;) flame(x + rand(-2, 2), floorAt(x), rand(-10, 10), -rand(20, 50), rand(0.3, 0.6), 2);
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
    if (vol < 25) { for (let n = 8; n-- > 0;) flame(x, floorAt(x), rand(-8, 8), -rand(10, 30), rand(0.2, 0.5)); return false; }   // too little: fizzles
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
        if (Math.random() < dt * 30 * heat) flame(x + rand(-0.5, 0.5), floorAt(x), rand(-5, 5), -rand(18, 45) * (0.6 + pile[x] / 12), rand(0.35, 0.9), Math.random() < 0.4 ? 2 : 1);
        if (Math.random() < dt * 2 * heat) smoke(x, floorAt(x) - 4, rand(-4, 4), -rand(8, 18), rand(1.5, 2.6), 2);
        if (Math.random() < dt * 0.8 * heat) spark(x, floorAt(x), rand(-20, 20), -rand(40, 90), rand(0.6, 1.2), GRAV * 0.4);
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
    for (let x = g.a; x <= g.b; x++) {
      const h = pile[x];
      for (let n = Math.ceil(h * 0.5); n-- > 0;) {
        const dir = Math.sign(x - cx) || (Math.random() < 0.5 ? -1 : 1);
        glob(x, H - rand(0, h), dir * rand(10, 110) * pw + rand(-30, 30), -rand(90, 270) * pw, Math.random() < 0.8);
      }
      pile[x] = 0; burn[x] = 0;
    }
    for (let n = Math.round(80 * pw); n-- > 0;) {                      // fireball
      const a = rand(Math.PI * 0.95, Math.PI * 2.05), v = rand(20, 190) * pw * (Math.random() < 0.3 ? 0.4 : 1);
      flame(cx + rand(-3, 3), hy + rand(-3, 3), Math.cos(a) * v, Math.sin(a) * v * 1.2 - 30, rand(0.35, 1.2), randi(2, 4));
    }
    for (let n = Math.round(14 * pw); n-- > 0;) { const a = rand(Math.PI, Math.PI * 2), v = rand(50, 210) * pw; spark(cx, hy, Math.cos(a) * v, Math.sin(a) * v, rand(0.6, 1.8), GRAV * 0.5); }
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
      if (p.k === 0) { p.vx += Math.sin(p.t * 9 + p.ph) * 30 * dt; p.vy -= 6 * dt; p.vx *= 1 - dt * 1.5; p.vy *= 1 - dt * 0.8; }
      else if (p.k === 1) { p.px = p.x; p.py = p.y; p.vy += p.g * dt; p.vx *= 1 - dt * 0.4; }
      else if (p.k === 2) { p.vx *= 1 - dt * 0.8; p.vy *= 1 - dt * 0.4; }
      else { p.vy += GRAV * dt; p.vx *= 1 - dt * 0.3; if (p.lit && Math.random() < dt * 16) flame(p.x, p.y, rand(-4, 4), -rand(5, 15), rand(0.2, 0.5)); if (Math.random() < dt * 4) smoke(p.x, p.y, 0, -5, rand(0.8, 1.4), 1); }
      p.x += p.vx * dt; p.y += p.vy * dt;
      if ((p.k === 1 || p.k === 3) && p.vy > 0 && p.x >= 0 && p.x < W && p.y >= floorAt(p.x)) {
        if (p.k === 1 ? (p.fated || p.t > 0.25) : p.lit) ignite(p.x, p.fated);
        if (p.k === 3) { const x = clamp(Math.round(p.x), 0, W - 1); pile[x] += 0.5; }
        parts[i] = parts[parts.length - 1]; parts.pop();
      } else if (p.y > H + 10 || p.x < -20 || p.x > W + 20) { parts[i] = parts[parts.length - 1]; parts.pop(); }
    }
  }

  // ------------------------------------------------------------------ draw
  function draw(time) {
    ctx.clearRect(0, 0, W, H);
    // tar drips hanging from the spikes + falling drops
    for (const d of drips) {
      if (d.len < 0.5) continue;
      const [x, y] = P(d.nx, d.ny), X = Math.round(x), Y = Math.round(y) - 1, L = Math.round(d.len);
      const b = d.len > 4 ? 2 : 1;
      ctx.fillStyle = TAR; ctx.fillRect(X, Y, 1, L); ctx.fillRect(X - (b - 1), Y + L - b, b + 1, b + 1);
      ctx.fillStyle = TAR_RIM; ctx.fillRect(X - b, Y + L - b, 1, b);
      ctx.fillStyle = TAR_SHINE; ctx.fillRect(X - (b - 1), Y + L - b, 1, 1);
    }
    for (const o of drops) {
      const len = clamp(Math.round(o.vy / 40), 1, 6);
      const Y = Math.round(o.y);
      ctx.fillStyle = TAR; ctx.fillRect(o.x, Y - len, 1, len); ctx.fillRect(o.x, Y - o.sz, o.sz + 1, o.sz + 1);
      ctx.fillStyle = TAR_RIM; ctx.fillRect(o.x - 1, Y - o.sz, 1, o.sz);
      ctx.fillStyle = TAR_SHINE; ctx.fillRect(o.x, Y - o.sz, 1, 1);
    }
    // pile: dark body, glossy edge, glowing when on fire
    for (let x = 0; x < W; x++) {
      const h = Math.round(pile[x]); if (h <= 0) continue;
      const top = H - h;
      ctx.fillStyle = TAR; ctx.fillRect(x, top, 1, h);
      const hot = burn[x] > 0;
      if (hot) {
        ctx.fillStyle = FLAME[(x + (time * 20 | 0)) % 3 + 1]; ctx.fillRect(x, top, 1, 1);
        if (Math.random() < 0.5) { ctx.fillStyle = FLAME[randi(3, 5)]; ctx.fillRect(x, top + randi(1, Math.max(1, h)), 1, 1); }
      } else {
        ctx.fillStyle = TAR_RIM; ctx.fillRect(x, top, 1, 1);
        if (h > 2) { ctx.fillStyle = TAR_DIM; ctx.fillRect(x, top + 1, 1, Math.min(2, h - 2)); }
        if (h > 3 && (x * 13 + Math.round(pile[x] * 3)) % 17 === 0) { ctx.fillStyle = TAR_SHINE; ctx.fillRect(x, top + 1, 1, 1); }
      }
    }
    // smoke + tar globs (normal blending)
    for (const p of parts) {
      if (p.k === 2) {
        const u = p.t / p.life, s = p.sz + Math.round(u * 3);
        ctx.fillStyle = `rgba(30,24,22,${(0.45 * (1 - u)).toFixed(3)})`;
        ctx.fillRect(Math.round(p.x - s / 2), Math.round(p.y - s / 2), s, s);
      } else if (p.k === 3) {
        const X = Math.round(p.x), Y = Math.round(p.y);
        ctx.fillStyle = TAR; ctx.fillRect(X, Y, p.sz, p.sz);
        if (p.lit) { ctx.fillStyle = FLAME[randi(1, 3)]; ctx.fillRect(X, Y - 1, 1, 1); }
      }
    }
    // fire (additive)
    ctx.globalCompositeOperation = 'lighter';
    for (const p of parts) {
      const u = p.t / p.life;
      if (p.k === 0) {
        const c = FLAME[Math.min(FLAME.length - 1, (u * FLAME.length) | 0)];
        const X = Math.round(p.x), Y = Math.round(p.y);
        ctx.globalAlpha = 0.16 * (1 - u); ctx.fillStyle = c; ctx.fillRect(X - 1, Y - 1, p.sz + 2, p.sz + 2);
        ctx.globalAlpha = 0.9 * (1 - u * u); ctx.fillRect(X, Y, p.sz, p.sz);
      } else if (p.k === 1) {
        ctx.globalAlpha = 1 - u * 0.7; ctx.fillStyle = u < 0.5 ? FLAME[0] : FLAME[2];
        ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
        ctx.globalAlpha *= 0.6; ctx.fillStyle = FLAME[3];
        ctx.fillRect(Math.round(p.x - (p.x - p.px) * 2), Math.round(p.y - (p.y - p.py) * 2), 1, 1);
      } else if (p.k === 4) {
        const r = p.r * Math.sqrt(u);
        ctx.globalAlpha = 0.8 * (1 - u); ctx.strokeStyle = u < 0.3 ? FLAME[0] : FLAME[2]; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(p.x, p.y, r, r * 0.55, 0, Math.PI, Math.PI * 2); ctx.stroke();
      }
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    if (flash > 0) { ctx.fillStyle = `rgba(255,${(150 + flash * 100) | 0},${(60 + flash * 120) | 0},${(flash * 0.5).toFixed(3)})`; ctx.fillRect(0, 0, W, H); }
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
