// The Astronomer's look: star missiles, comets, moons, planets, suns, gravity orbs and starry beams, all procedural
// and cached. drawCosmic/cosmicTrail are called by shapes.js for these fx names; drawCosmicBeam by hazards.js BeamCh.
import { G } from '../state.js';
import { TAU, rand, makeCanvas, hexToRgb } from '../core/util.js';
import { glowSprite, spawn } from './vfx.js';

export const ASTRO = { core: '#f2fbff', glow: '#4aa8ff', deep: '#1430a0', ice: '#9fe6ff', violet: '#9a6aff' };
const add = (ctx) => { ctx.globalCompositeOperation = 'lighter'; };
const norm = (ctx) => { ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; };
function glow(ctx, x, y, r, color, a = 1) {
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a;
  ctx.drawImage(glowSprite(color), x - r, y - r, r * 2, r * 2);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}

// ------------------------------------------------------------------ cached sprites
const cache = new Map();
const cached = (key, w, h, paint) => {
  let c = cache.get(key);
  if (!c) { c = makeCanvas(w, h); paint(c.getContext('2d'), w, h); cache.set(key, c); }
  return c;
};
/** A four-pointed star with a soft halo (64 px). */
export function starSprite(color = ASTRO.glow) {
  return cached('star' + color, 64, 64, (x) => {
    const [r, g, b] = hexToRgb(color);
    const grd = x.createRadialGradient(32, 32, 0, 32, 32, 30);
    grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.18, `rgba(${r},${g},${b},.8)`); grd.addColorStop(1, `rgba(${r},${g},${b},0)`);
    x.fillStyle = grd; x.fillRect(0, 0, 64, 64);
    x.fillStyle = '#ffffff';
    for (const [w, l] of [[3.2, 30], [1.6, 18]]) {
      for (let k = 0; k < (l > 20 ? 2 : 2); k++) {
        x.save(); x.translate(32, 32); x.rotate(k * Math.PI / 2 + (l > 20 ? 0 : Math.PI / 4));
        x.beginPath(); x.moveTo(0, -l); x.quadraticCurveTo(w * 0.4, -w * 0.4, w, 0); x.quadraticCurveTo(w * 0.4, w * 0.4, 0, l);
        x.quadraticCurveTo(-w * 0.4, w * 0.4, -w, 0); x.quadraticCurveTo(-w * 0.4, -w * 0.4, 0, -l); x.fill(); x.restore();
      }
    }
  });
}
/** A shaded sphere: the sun, the moon or a planet (128 px). */
function sphereSprite(kind, i = 0) {
  return cached('sph' + kind + i, 128, 128, (x) => {
    const C = 64, R = 60;
    x.save(); x.beginPath(); x.arc(C, C, R, 0, TAU); x.clip();
    if (kind === 'sun') {
      const g = x.createRadialGradient(C - 14, C - 16, 4, C, C, R);
      g.addColorStop(0, '#fffbe0'); g.addColorStop(0.35, '#ffd860'); g.addColorStop(0.75, '#ff8a20'); g.addColorStop(1, '#d03a08');
      x.fillStyle = g; x.fillRect(0, 0, 128, 128);
      for (let k = 0; k < 70; k++) { // granulation and sunspots
        const a = rand(TAU), d = Math.sqrt(Math.random()) * R;
        x.globalAlpha = rand(0.08, 0.25); x.fillStyle = k % 9 ? '#fff0a0' : '#8a2004';
        x.beginPath(); x.arc(C + Math.cos(a) * d, C + Math.sin(a) * d, rand(2, k % 9 ? 6 : 4), 0, TAU); x.fill();
      }
    } else if (kind === 'moon') {
      const g = x.createRadialGradient(C - 18, C - 18, 4, C, C, R);
      g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, '#dfe8f4'); g.addColorStop(1, '#7a88a8');
      x.fillStyle = g; x.fillRect(0, 0, 128, 128);
      for (let k = 0; k < 16; k++) { // craters
        const a = rand(TAU), d = Math.sqrt(Math.random()) * R * 0.85, cr = rand(3, 12);
        const cx = C + Math.cos(a) * d, cy = C + Math.sin(a) * d;
        x.globalAlpha = 0.35; x.fillStyle = '#8a96b0'; x.beginPath(); x.arc(cx, cy, cr, 0, TAU); x.fill();
        x.globalAlpha = 0.4; x.fillStyle = '#ffffff'; x.beginPath(); x.arc(cx - cr * 0.25, cy - cr * 0.25, cr * 0.55, 0, TAU); x.fill();
      }
    } else { // planet i: banded colours
      const P = PLANETS[i % PLANETS.length];
      x.fillStyle = P[0]; x.fillRect(0, 0, 128, 128);
      for (let k = 0; k < 7; k++) { x.globalAlpha = 0.5; x.fillStyle = P[1 + (k % 2)]; x.fillRect(0, 10 + k * 16 + Math.sin(k * 3) * 4, 128, rand(4, 9)); }
      const g = x.createRadialGradient(C - 20, C - 22, 6, C, C, R);
      g.addColorStop(0, 'rgba(255,255,255,0.35)'); g.addColorStop(0.6, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,10,0.65)');
      x.globalAlpha = 1; x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    }
    x.restore();
    if (kind === 'moon') { x.globalAlpha = 1; } // rim light is added at draw time
  });
}
const PLANETS = [['#c86a3a', '#e8a060', '#8a3a1a'], ['#3a7ad0', '#80c0ff', '#1a40a0'], ['#d8c080', '#f8e8b0', '#a08040'], ['#6ac0a0', '#a0f0d0', '#2a7060'],
  ['#a060d0', '#d0a0ff', '#5a2a90'], ['#e0e0e8', '#ffffff', '#9090a8'], ['#d05050', '#ff9080', '#801818'], ['#e0a030', '#ffe080', '#905010']];
const RINGED = [2, 5];
export const planetColor = (i) => PLANETS[i % PLANETS.length][1];

/** A planet of index i, radius R px, at (x, y). */
export function drawPlanet(ctx, x, y, i, R, t = 0) {
  const ringed = RINGED.includes(i % PLANETS.length);
  glow(ctx, x, y, R * 2.4, planetColor(i), 0.45);
  if (ringed) { ctx.strokeStyle = PLANETS[i % PLANETS.length][1]; ctx.globalAlpha = 0.7; ctx.lineWidth = Math.max(1, R * 0.28); ctx.beginPath(); ctx.ellipse(x, y, R * 1.9, R * 0.55, -0.35, Math.PI, TAU); ctx.stroke(); }
  ctx.globalAlpha = 1; ctx.drawImage(sphereSprite('planet', i % PLANETS.length), x - R, y - R, R * 2, R * 2);
  if (ringed) { ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.ellipse(x, y, R * 1.9, R * 0.55, -0.35, 0, Math.PI); ctx.stroke(); }
  ctx.globalAlpha = 1;
}

/** The sun: a burning sphere with licking prominences, radius R px. */
export function drawSun(ctx, x, y, R, t, heat = 1) {
  glow(ctx, x, y, R * 4.2, '#ff7a10', 0.55 * heat);
  glow(ctx, x, y, R * 2.4, '#ffd860', 0.8);
  add(ctx);
  for (let i = 0; i < 9; i++) { // prominences: arcs that rise and fall off the rim
    const a = i * 0.7 + t * 0.35 + Math.sin(t * 1.3 + i) * 0.2, h = R * (0.1 + 0.14 * (0.5 + 0.5 * Math.sin(t * 2.1 + i * 1.7)));
    ctx.globalAlpha = 0.6; ctx.strokeStyle = i % 2 ? '#ffb040' : '#ff6010'; ctx.lineWidth = Math.max(2, R * 0.06);
    ctx.beginPath(); ctx.arc(x + Math.cos(a) * R * 0.97, y + Math.sin(a) * R * 0.97, h, a - 1.45, a + 1.45); ctx.stroke();
  }
  norm(ctx);
  ctx.save(); ctx.translate(x, y); ctx.rotate(t * 0.15); ctx.drawImage(sphereSprite('sun'), -R, -R, R * 2, R * 2); ctx.restore();
  add(ctx); ctx.globalAlpha = 0.35 + 0.15 * Math.sin(t * 6); ctx.drawImage(glowSprite('#fff6c0'), x - R * 0.9, y - R * 0.9, R * 1.8, R * 1.8); norm(ctx);
}
/** The moon, radius R px; a cold blue rim. */
export function drawMoon(ctx, x, y, R, t) {
  glow(ctx, x, y, R * 3.2, '#80c8ff', 0.5);
  ctx.save(); ctx.translate(x, y); ctx.rotate(t * 0.08); ctx.drawImage(sphereSprite('moon'), -R, -R, R * 2, R * 2); ctx.restore();
  add(ctx); ctx.globalAlpha = 0.6; ctx.strokeStyle = '#c8ecff'; ctx.lineWidth = Math.max(1.5, R * 0.06);
  ctx.beginPath(); ctx.arc(x, y, R * 0.98, 0, TAU); ctx.stroke(); norm(ctx);
}
/** A black hole: lensing halo, an accretion disk (tilted for the iso view) and the dark heart. */
export function drawBlackHole(ctx, x, y, R, t, k = 1) {
  add(ctx);
  glow(ctx, x, y + R * 0.2, R * 3.4, '#5a20c0', 0.5 * k);
  for (let i = 0; i < 4; i++) { // the disk: hot inner, blue outer, spinning arcs
    const rr = R * (0.75 + i * 0.32), off = t * (3.2 - i * 0.6);
    ctx.globalAlpha = (0.55 - i * 0.1) * k; ctx.strokeStyle = ['#ffe8b0', '#ffa040', '#4aa8ff', '#7a50ff'][i]; ctx.lineWidth = R * (0.22 - i * 0.03);
    ctx.beginPath(); ctx.ellipse(x, y, rr, rr * 0.38, -0.12, off, off + 4.6); ctx.stroke();
  }
  norm(ctx);
  ctx.fillStyle = '#000000'; ctx.globalAlpha = 0.96 * k;
  ctx.beginPath(); ctx.arc(x, y - R * 0.2, R * 0.48, 0, TAU); ctx.fill();
  add(ctx); ctx.globalAlpha = 0.9 * k; ctx.strokeStyle = '#d8f0ff'; ctx.lineWidth = Math.max(1.5, R * 0.07); // photon ring
  ctx.beginPath(); ctx.arc(x, y - R * 0.2, R * 0.52, 0, TAU); ctx.stroke();
  ctx.globalAlpha = 0.5 * k; ctx.strokeStyle = '#ffd890'; ctx.lineWidth = R * 0.12; // the far side of the disk bent over the top
  ctx.beginPath(); ctx.ellipse(x, y - R * 0.2, R * 0.78, R * 0.62, 0, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
  norm(ctx);
}

// ------------------------------------------------------------------ projectiles, orbiters
const COSMIC = new Set(['starmissile', 'starfall', 'stardust', 'moon', 'comet', 'flare', 'gravorb', 'darkmatter', 'antimatter', 'accretion', 'zodiac', 'planet', 'meteor_astral']);
export const isCosmic = (fx) => COSMIC.has(fx);
const ZODIAC_HUES = ['#ff8060', '#ffd060', '#a0ff80', '#60ffd0', '#60c0ff', '#a080ff', '#ff80e0', '#ffffff'];

/** Draw a cosmic projectile at screen (x, y), heading screen angle a, size s. Returns false for other fx. */
export function drawCosmic(ctx, fx, x, y, a, s, E, t, extra) {
  if (!COSMIC.has(fx)) return false;
  switch (fx) {
    case 'starmissile': case 'starfall': { // a blue star with a comet-like streak
      const L = 16 * s, ca = Math.cos(a), sa = Math.sin(a);
      add(ctx);
      const g = ctx.createLinearGradient(x, y, x - ca * L * 1.6, y - sa * L * 1.6);
      g.addColorStop(0, 'rgba(160,220,255,0.9)'); g.addColorStop(1, 'rgba(40,90,255,0)');
      ctx.strokeStyle = g; ctx.lineWidth = 2.6 * s; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - ca * L * 1.6, y - sa * L * 1.6); ctx.stroke();
      glow(ctx, x, y, 10 * s, ASTRO.glow, 0.5);
      add(ctx);
      const r = (8 + Math.sin(t * 30) * 1.5) * s;
      ctx.save(); ctx.translate(x, y); ctx.rotate(t * 7); ctx.drawImage(starSprite(ASTRO.glow), -r, -r, r * 2, r * 2); ctx.restore();
      norm(ctx);
      return true;
    }
    case 'stardust': {
      add(ctx);
      for (let i = 0; i < 3; i++) {
        const b = t * 9 + i * TAU / 3, px = x + Math.cos(b) * 5 * s, py = y + Math.sin(b) * 2.5 * s, r = (5 + i) * s;
        ctx.drawImage(starSprite(i ? ASTRO.ice : ASTRO.glow), px - r, py - r, r * 2, r * 2);
      }
      norm(ctx); glow(ctx, x, y, 10 * s, ASTRO.glow, 0.6);
      return true;
    }
    case 'moon': { // a spinning crescent
      glow(ctx, x, y, 18 * s, '#9fd8ff', 0.8);
      ctx.save(); ctx.translate(x, y); ctx.rotate(a + t * 4);
      ctx.fillStyle = '#eef6ff';
      ctx.beginPath(); ctx.arc(0, 0, 10 * s, -1.9, 1.9); ctx.arc(-4 * s, 0, 8.2 * s, 1.55, -1.55, true); ctx.fill();
      ctx.restore();
      return true;
    }
    case 'comet': { // an icy head and a long two-tone tail
      const L = 46 * s, ca = Math.cos(a), sa = Math.sin(a);
      add(ctx);
      for (const [w, c0, c1, k] of [[16, 'rgba(80,150,255,0.45)', 'rgba(20,40,160,0)', 1.3], [7, 'rgba(210,245,255,0.85)', 'rgba(120,200,255,0)', 1]]) {
        const g = ctx.createLinearGradient(x, y, x - ca * L * k, y - sa * L * k);
        g.addColorStop(0, c0); g.addColorStop(1, c1);
        ctx.strokeStyle = g; ctx.lineWidth = w * s; ctx.lineCap = 'round';
        const wob = Math.sin(t * 14) * 3 * s;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x - ca * L * 0.5 - sa * wob, y - sa * L * 0.5 + ca * wob, x - ca * L * k, y - sa * L * k); ctx.stroke();
      }
      glow(ctx, x, y, 22 * s, ASTRO.glow, 1);
      ctx.drawImage(glowSprite('#ffffff'), x - 7 * s, y - 7 * s, 14 * s, 14 * s);
      norm(ctx);
      return true;
    }
    case 'flare': { // a lick of solar fire
      glow(ctx, x, y, 18 * s, '#ff8a20', 0.9);
      add(ctx); ctx.strokeStyle = '#ffd860'; ctx.lineWidth = 2.5 * s; ctx.globalAlpha = 0.8;
      ctx.beginPath(); ctx.arc(x, y, 9 * s, a + t * 9, a + t * 9 + 3.6); ctx.stroke();
      ctx.drawImage(glowSprite('#fff6c0'), x - 7 * s, y - 7 * s, 14 * s, 14 * s); norm(ctx);
      return true;
    }
    case 'gravorb': case 'darkmatter': { // a dark core, lensed light bending round it
      glow(ctx, x, y, 20 * s, fx === 'gravorb' ? '#7a50ff' : '#5a20a0', 0.8);
      ctx.fillStyle = '#05000c'; ctx.beginPath(); ctx.arc(x, y, 6.5 * s, 0, TAU); ctx.fill();
      add(ctx); ctx.strokeStyle = fx === 'gravorb' ? '#c8b0ff' : '#9a6aff'; ctx.lineWidth = 1.6 * s;
      for (let i = 0; i < 3; i++) { ctx.globalAlpha = 0.7 - i * 0.18; ctx.beginPath(); ctx.ellipse(x, y, (8 + i * 3) * s, (4 + i * 1.5) * s, t * (3 + i), 0, TAU); ctx.stroke(); }
      norm(ctx);
      return true;
    }
    case 'antimatter': {
      const f = Math.sin(t * 40) > 0;
      glow(ctx, x, y, 20 * s, f ? '#ff50e0' : '#50e8ff', 0.95);
      ctx.drawImage(glowSprite('#ffffff'), x - 8 * s, y - 8 * s, 16 * s, 16 * s);
      add(ctx); ctx.strokeStyle = f ? '#50e8ff' : '#ff50e0'; ctx.lineWidth = 2 * s;
      ctx.beginPath(); ctx.arc(x, y, 10 * s, t * 12, t * 12 + 2); ctx.stroke(); ctx.beginPath(); ctx.arc(x, y, 10 * s, t * 12 + Math.PI, t * 12 + Math.PI + 2); ctx.stroke();
      norm(ctx);
      return true;
    }
    case 'accretion': { // a glowing chunk of the disk
      glow(ctx, x, y, 12 * s, (extra && extra.i % 2) ? '#ffa040' : ASTRO.glow, 0.9);
      ctx.save(); ctx.translate(x, y); ctx.rotate(t * 6); ctx.fillStyle = '#2a2030'; ctx.fillRect(-3 * s, -2.5 * s, 6 * s, 5 * s); ctx.restore();
      return true;
    }
    case 'zodiac': { // a glowing sign ring
      const c = ZODIAC_HUES[((extra && extra.i) || 0) % ZODIAC_HUES.length];
      glow(ctx, x, y, 16 * s, c, 0.8);
      add(ctx); ctx.strokeStyle = c; ctx.lineWidth = 1.6 * s; ctx.globalAlpha = 0.9;
      ctx.beginPath(); ctx.arc(x, y, 8 * s, 0, TAU); ctx.stroke();
      ctx.save(); ctx.translate(x, y); ctx.rotate(-t * 3);
      ctx.beginPath(); for (let k = 0; k < 5; k++) { const b = k * TAU * 2 / 5 - Math.PI / 2; k ? ctx.lineTo(Math.cos(b) * 6 * s, Math.sin(b) * 6 * s) : ctx.moveTo(Math.cos(b) * 6 * s, Math.sin(b) * 6 * s); } ctx.closePath(); ctx.stroke();
      ctx.restore(); norm(ctx);
      return true;
    }
    case 'planet': drawPlanet(ctx, x, y, (extra && extra.i) || 0, 7 * s, t); return true;
    default: return false;
  }
}

/** Trail particles for cosmic projectiles. Returns false for other fx. */
export function cosmicTrail(fx, x, y, z, E, dt, s = 1) {
  if (!COSMIC.has(fx)) return false;
  const m = G.touch ? 0.5 : 1, p = Math.random();
  switch (fx) {
    case 'starmissile': case 'starfall': case 'stardust':
      if (p < dt * 24 * m) spawn({ type: 'glow', x: x + rand(-0.06, 0.06), y: y + rand(-0.06, 0.06), z: z + rand(-3, 3), vx: rand(-0.5, 0.5), vy: rand(-0.5, 0.5), vz: rand(-8, 8), life: rand(0.2, 0.4), size: rand(1.2, 2.2) * s, size1: 0, color: p < dt * 4 ? '#ffffff' : p < dt * 16 ? ASTRO.glow : '#2a6aff', add: true });
      break;
    case 'comet':
      if (p < dt * 70 * m) spawn({ type: 'glow', x: x + rand(-0.1, 0.1), y: y + rand(-0.1, 0.1), z: z + rand(-4, 4), vz: rand(-10, 10), life: rand(0.35, 0.8), size: rand(2.5, 5) * s, size1: 0.5, color: chance2() ? ASTRO.glow : ASTRO.ice, add: true });
      if (p < dt * 20 * m) spawn({ type: 'dot', x, y, z, vx: rand(-1, 1), vy: rand(-1, 1), vz: rand(-20, 20), life: 0.5, size: 1.5, color: '#ffffff', add: true });
      break;
    case 'moon': if (p < dt * 25 * m) spawn({ type: 'glow', x, y, z, life: 0.4, size: 2.2 * s, size1: 0, color: '#c8ecff', add: true }); break;
    case 'flare': if (p < dt * 50 * m) spawn({ type: 'glow', x, y, z, vz: rand(5, 30), life: rand(0.2, 0.45), size: rand(2, 4) * s, size1: 0, color: chance2() ? '#ff8a20' : '#ffd860', add: true }); break;
    case 'gravorb': case 'darkmatter':
      if (p < dt * 30 * m) { const a = rand(TAU); spawn({ type: 'glow', x: x + Math.cos(a) * 0.5, y: y + Math.sin(a) * 0.5, z, vx: -Math.cos(a) * 1.4, vy: -Math.sin(a) * 1.4, life: 0.35, size: 2, size1: 0, color: '#9a6aff', add: true }); }
      break;
    case 'antimatter': if (p < dt * 40 * m) spawn({ type: 'glow', x, y, z, vz: rand(-10, 10), life: 0.3, size: 2.4 * s, size1: 0, color: chance2() ? '#ff50e0' : '#50e8ff', add: true }); break;
    default: if (p < dt * 12 * m) spawn({ type: 'glow', x, y, z, life: 0.3, size: 2, size1: 0, color: ASTRO.glow, add: true });
  }
  return true;
}
const chance2 = () => Math.random() < 0.5;

/** Channelled beams with a cosmic look (moonbeam, quasar, graviton). Returns false for other fx. */
export function drawCosmicBeam(ctx, fx, ax, ay, bx, by, t) {
  if (fx !== 'moonbeam' && fx !== 'quasar' && fx !== 'graviton') return false;
  const len = Math.hypot(bx - ax, by - ay) || 1, nx = -(by - ay) / len, ny = (bx - ax) / len;
  add(ctx); ctx.lineCap = 'round';
  if (fx === 'graviton') { // a heavy violet wave
    for (let pass = 0; pass < 2; pass++) {
      ctx.globalAlpha = pass ? 0.9 : 0.35; ctx.strokeStyle = pass ? '#e0d0ff' : '#7a50ff'; ctx.lineWidth = pass ? 2 : 10;
      ctx.beginPath();
      for (let i = 0; i <= 24; i++) { const k = i / 24, w = Math.sin(k * 18 - t * 16) * 6 * Math.sin(k * Math.PI); const px = ax + (bx - ax) * k + nx * w, py = ay + (by - ay) * k + ny * w; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
      ctx.stroke();
    }
  } else {
    const W = fx === 'quasar' ? 13 : 7, col = fx === 'quasar' ? ASTRO.glow : '#a8d8ff';
    const wv = W * (1 + Math.sin(t * 50) * 0.12);
    ctx.globalAlpha = 0.3; ctx.strokeStyle = col; ctx.lineWidth = wv * 2.8; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
    ctx.globalAlpha = 0.85; ctx.lineWidth = wv; ctx.stroke();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = wv * 0.35; ctx.stroke();
    if (fx === 'quasar') { // twin helices of starlight round the core
      ctx.lineWidth = 1.6;
      for (const ph of [0, Math.PI]) {
        ctx.globalAlpha = 0.8; ctx.strokeStyle = ph ? '#c8a0ff' : '#9fe6ff'; ctx.beginPath();
        for (let i = 0; i <= 30; i++) { const k = i / 30, w = Math.sin(k * 26 - t * 22 + ph) * wv * 0.9; const px = ax + (bx - ax) * k + nx * w, py = ay + (by - ay) * k + ny * w; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
        ctx.stroke();
      }
    }
    for (let i = 0; i < 5; i++) { // stars racing down the beam
      const k = (t * 1.8 + i / 5) % 1, r = (fx === 'quasar' ? 9 : 6) * (0.6 + 0.4 * Math.sin(k * Math.PI));
      ctx.globalAlpha = 1; ctx.drawImage(starSprite(col), ax + (bx - ax) * k - r, ay + (by - ay) * k - r, r * 2, r * 2);
    }
    if (fx === 'moonbeam') { ctx.globalAlpha = 1; norm(ctx); drawMoon(ctx, ax, ay - 10, 6, t); add(ctx); }
  }
  norm(ctx);
  return true;
}

/** A twinkling chart star at screen (x, y). */
export function drawChartStar(ctx, x, y, s, t, color = ASTRO.glow, a = 1) {
  const r = (10 + Math.sin(t * 5) * 2) * s;
  add(ctx); ctx.globalAlpha = a;
  ctx.drawImage(glowSprite(color), x - r * 2, y - r * 2, r * 4, r * 4);
  ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(t * 1.3) * 0.3); ctx.drawImage(starSprite(color), -r, -r, r * 2, r * 2); ctx.restore();
  norm(ctx);
}
