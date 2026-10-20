// Class signature effects: every skill cast and hit gets particles themed on its class (the Dragon Knight's flames,
// the Slime Lord's blue goo, the Paladin's holy glow...), growing more over the top at skill ranks 5/10/15/20.
// Also the Lancer's huge elemental energy lance (EnergyLance) and its tower shields (drawn by shapes.js 'tshield').
import { G } from '../state.js';
import { isoX, isoY, camera } from '../core/view.js';
import { rand, TAU, chance } from '../core/util.js';
import { spawn, smoke, addEffect, Ring, Column, Bolt, addLight, addDecal, elem, glowSprite } from './vfx.js';
import { glyphSprite } from './notation.js';

const P = (o) => spawn(o);
// a mote that rises from (x,y)
const rise = (x, y, z, color, s = 1, sp = 0.4) => P({ type: 'glow', x: x + rand(-sp, sp), y: y + rand(-sp, sp), z: z + rand(-6, 6), vz: rand(30, 80) * s, life: rand(0.4, 0.9), size: rand(2, 4) * s, size1: 0, color, add: true });
// a spark flying outward
const fling = (x, y, z, color, sp = 3, type = 'glow', o = {}) => { const a = rand(TAU), v = rand(0.4, 1) * sp; return P({ type, x, y, z, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vz: rand(20, 90), g: 160, drag: 1.5, life: rand(0.35, 0.8), size: rand(1.5, 3.5), size1: 0.3, color, add: type !== 'smoke', rot: a, ...o }); };
// a ring of n particles spinning out
const spiral = (x, y, z, color, n, r = 0.8, up = 40) => { const b = rand(TAU); for (let i = 0; i < n; i++) { const a = b + (i / n) * TAU; P({ type: 'glow', x: x + Math.cos(a) * 0.2, y: y + Math.sin(a) * 0.2, z, vx: Math.cos(a + 1.2) * r * 3, vy: Math.sin(a + 1.2) * r * 3, vz: up, drag: 2.5, life: 0.7, size: 3, size1: 0, color, add: true }); } };

// [glow, core, dark] and the emitter: (x, y, n, k, at) where at is 'cast' (at the hero) or 'hit' (on a target)
const THEMES = {
  paladin: { c: ['#ffd860', '#fffff0', '#d08a00'], fx(x, y, n, k) { // holy motes, light rays, a halo
    for (let i = 0; i < n; i++) rise(x, y, 10, i % 3 ? '#ffd860' : '#fffff0', k, 0.5);
    for (let i = 0; i < Math.min(8, n / 3); i++) { const a = (i / 4) * Math.PI; P({ type: 'streak', x, y, z: 30, vx: Math.cos(a) * 6, vy: Math.sin(a) * 6, vz: 0, drag: 4, life: 0.35, size: 2 * k, color: '#fff6c0', add: true }); }
  } },
  ranger: { c: ['#7ccf5a', '#e8ffd0', '#2a6010'], fx(x, y, n, k) { // whirling leaves
    for (let i = 0; i < n; i++) fling(x, y, 20, i % 2 ? '#7ccf5a' : '#c8e060', 2.5 * k, 'shard', { g: 30, vr: rand(-8, 8), size: rand(1.5, 2.6) * k, add: false });
  } },
  wizard: { c: ['#ff8a30', '#fff3a0', '#c02000'], el: true, fx(x, y, n, k, at, E) { // element sparks round a rune circle
    for (let i = 0; i < n; i++) fling(x, y, 26, i % 2 ? E.glow : E.core, 3 * k);
    if (at === 'cast') spiral(x, y, 8, E.glow, Math.min(16, 6 + n / 3), 0.6, 20);
  } },
  necromancer: { c: ['#a070ff', '#e8c0ff', '#280038'], fx(x, y, n, k) { // soul wisps and grave mist
    for (let i = 0; i < n; i++) P({ type: 'glow', x: x + rand(-0.5, 0.5), y: y + rand(-0.5, 0.5), z: 6, vx: rand(-0.6, 0.6), vy: rand(-0.6, 0.6), vz: rand(40, 90), life: rand(0.6, 1.1), size: rand(2, 3.5) * k, size1: 0, color: i % 4 ? '#a070ff' : '#60ffb0', add: true });
    smoke(x, y, 2, '#1a0824', Math.ceil(n / 6), 7 * k);
  } },
  barbarian: { c: ['#ff5020', '#ffd0a0', '#701000'], fx(x, y, n, k) { // rage sparks and kicked-up dust
    for (let i = 0; i < n; i++) fling(x, y, 14, i % 2 ? '#ff5020' : '#ffb060', 4 * k, 'streak', { size: 2 });
    smoke(x, y, 0, '#6a5038', Math.ceil(n / 5), 8 * k);
  } },
  dragoon: { c: ['#6aa8ff', '#f0fbff', '#1c4a90'], fx(x, y, n, k) { // sky-blue wind streaks
    for (let i = 0; i < n; i++) { const a = rand(TAU); P({ type: 'streak', x, y, z: rand(10, 50), vx: Math.cos(a) * 7 * k, vy: Math.sin(a) * 7 * k, vz: rand(-20, 40), drag: 3, life: 0.4, size: rand(1.5, 2.5), color: i % 2 ? '#6aa8ff' : '#f0fbff', add: true }); }
  } },
  totem_master: { c: ['#5ac8a0', '#e0fff0', '#0a5040'], fx(x, y, n, k) { // spirit motes spiralling up
    spiral(x, y, 4, '#5ac8a0', n, 0.4 * k, 70);
    for (let i = 0; i < n / 3; i++) rise(x, y, 0, '#ffe080', k);
  } },
  death_knight: { c: ['#7ad0ff', '#f0ffff', '#1a3a80'], fx(x, y, n, k) { // frost shards and icy mist
    for (let i = 0; i < n; i++) fling(x, y, 24, i % 2 ? '#bfeaff' : '#7ad0ff', 3.5 * k, 'shard', { size: rand(2, 3.5) * k });
    smoke(x, y, 4, '#a8d8ff', Math.ceil(n / 6), 7 * k);
    for (let i = 0; i < Math.max(2, n / 3); i++) P({ type: 'skull', x: x + rand(-0.6, 0.6), y: y + rand(-0.6, 0.6), z: rand(8, 30), vx: rand(-0.8, 0.8), vy: rand(-0.8, 0.8), vz: rand(30, 70), drag: 1, life: rand(0.6, 1.1), size: rand(4, 6.5) * k, size1: rand(4, 6.5) * k, color: i % 3 ? '#e8f4ff' : '#bfeaff', eye: '#06102a', add: false });
  } },
  arcane_sorcerer: { c: ['#4aa8ff', '#f2fbff', '#1430a0'], fx(x, y, n, k) { // the Astronomer: blue star glints and a spinning ring of stardust
    for (let i = 0; i < n; i++) fling(x, y, 30, i % 4 ? (i % 2 ? '#4aa8ff' : '#9fe6ff') : '#ffffff', 2.8 * k, 'glow', { g: 0, drag: 3 });
    spiral(x, y, 30, '#9fe6ff', Math.min(14, n / 2), 0.8 * k, 0);
  } },
  carrion_witch: { c: ['#9ac84a', '#e8ff90', '#203010'], fx(x, y, n, k) { // bile drops and buzzing flies
    for (let i = 0; i < n; i++) fling(x, y, 26, '#9ac84a', 2.5 * k, 'dot', { g: 260, size: rand(2, 3.5), add: false });
    for (let i = 0; i < n / 2; i++) P({ type: 'dot', x: x + rand(-0.6, 0.6), y: y + rand(-0.6, 0.6), z: rand(10, 40), vx: rand(-3, 3), vy: rand(-3, 3), vz: rand(-20, 20), life: rand(0.5, 1), size: 1.5, color: '#141808' });
  } },
  bard: { c: ['#ff6a8a', '#fff0f8', '#7a1040'], fx(x, y, n, k) { // a few rainbow motes and little notes drifting up (the skill's own glyph does the rest)
    const hues = ['#ff6a8a', '#ffd860', '#70e0ff', '#a0ff80', '#d080ff'];
    for (let i = 0; i < n / 3; i++) P({ type: 'glow', x, y, z: 30, vx: rand(-2, 2) * k, vy: rand(-2, 2) * k, vz: rand(20, 60), drag: 2, life: rand(0.5, 0.9), size: rand(1.5, 2.5) * k, size1: 0, color: hues[i % 5], add: true });
    for (let i = 0; i < Math.min(4, n / 6); i++) P({ type: 'img', img: glyphSprite(['q', 'e', 'e2', 's'][i % 4], hues[i % 5]), x: x + rand(-0.4, 0.4), y: y + rand(-0.4, 0.4), z: 30, vx: rand(-0.6, 0.6), vy: rand(-0.6, 0.6), vz: rand(30, 60), drag: 1, life: rand(0.7, 1.1), size: rand(16, 22) * Math.min(1.4, k), size1: 8 });
  } },
  slime_lord: { c: ['#3a8cff', '#d8f0ff', '#0c2aa0'], fx(x, y, n, k, at) { // blue goo globs that splat
    for (let i = 0; i < n; i++) fling(x, y, 20, i % 3 ? '#3a8cff' : '#a8d8ff', 3 * k, 'dot', { g: 320, vz: rand(60, 160), size: rand(2.5, 5) * k, size1: 1.5, add: false });
    for (let i = 0; i < n / 3; i++) rise(x, y, 4, '#80c0ff', k * 0.8);
    if (at === 'hit' || chance(0.5)) addDecal(x + rand(-0.3, 0.3), y + rand(-0.3, 0.3), '#2a70e0', 0.5 + k * 0.2, 'splat', 0.6);
  } },
  boomerang_knight: { c: ['#3ac8a8', '#e0fff8', '#0a5048'], fx(x, y, n, k) { // circling gale streaks
    for (let i = 0; i < n; i++) { const a = (i / n) * TAU; P({ type: 'streak', x: x + Math.cos(a) * 0.6, y: y + Math.sin(a) * 0.6, z: 24, vx: Math.cos(a + 1.6) * 6 * k, vy: Math.sin(a + 1.6) * 6 * k, drag: 3, life: 0.4, size: 2, color: i % 2 ? '#3ac8a8' : '#e0fff8', add: true }); }
  } },
  lancer: { c: ['#c0d8ff', '#ffffff', '#4a64c0'], el: true, fx(x, y, n, k, at, E) { // steel sparks in the skill's element
    for (let i = 0; i < n; i++) fling(x, y, 28, i % 2 ? '#e8eef8' : E.glow, 4 * k, 'streak', { size: 1.6 });
    if (at === 'cast') spiral(x, y, 6, E.glow, Math.min(14, n / 2), 0.5, 10);
  } },
  dragon_knight: { c: ['#ff5a2a', '#fff3a0', '#900c00'], fx(x, y, n, k) { // licking flames and an ember fountain
    for (let i = 0; i < n; i++) P({ type: 'glow', x: x + rand(-0.4, 0.4), y: y + rand(-0.4, 0.4), z: rand(0, 14), vx: rand(-0.4, 0.4), vy: rand(-0.4, 0.4), vz: rand(50, 120) * k, life: rand(0.3, 0.65), size: rand(3, 6) * k, size1: 0.5, color: ['#ff3010', '#ff8a20', '#ffd040'][i % 3], add: true });
    for (let i = 0; i < n / 2; i++) fling(x, y, 20, '#ffb040', 3 * k, 'dot', { g: 120, size: 1.6 });
    smoke(x, y, 20, '#2a1008', Math.ceil(n / 8), 6 * k);
  } },
  gunner: { c: ['#ffc060', '#fff3c0', '#704010'], fx(x, y, n, k, at) { // brass casings, sparks, gun smoke
    if (at === 'cast') for (let i = 0; i < Math.min(6, 1 + n / 6); i++) P({ type: 'shard', x, y, z: 30, vx: rand(-1.5, 1.5), vy: rand(-1.5, 1.5), vz: rand(60, 120), g: 400, life: 0.6, size: 1.6, color: '#e0b040', rot: rand(TAU), vr: rand(-12, 12) });
    for (let i = 0; i < n; i++) fling(x, y, 26, i % 2 ? '#ffc060' : '#fff3c0', 4.5 * k, 'streak', { size: 1.4 });
    smoke(x, y, 24, '#4a4440', Math.ceil(n / 6), 5 * k);
  } },
};
const DEF = THEMES.paladin;
export const CLASS_THEMES = THEMES;

/** Glow that hugs the hero for a moment after each cast, brighter and bigger at higher skill ranks. */
class HeroGlow {
  constructor(p, c, k, dur) { Object.assign(this, { p, c, k, t: 0, dur }); }
  update(dt) { this.t += dt; if (this.p.dead) return false; if (chance(dt * 30 * this.k)) rise(this.p.x, this.p.y, 6, chance(0.5) ? this.c[0] : this.c[1], this.k * 0.7, 0.35); return this.t < this.dur; }
  draw(ctx) {
    const f = 1 - this.t / this.dur, px = isoX(this.p.x, this.p.y), py = isoY(this.p.x, this.p.y) - 26, s = 26 * this.k * (1 + Math.sin(G.time * 12) * 0.08);
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.min(1, f * 1.4) * 0.55;
    ctx.drawImage(glowSprite(this.c[0]), px - s, py - s * 1.3, s * 2, s * 2.6);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }
}

const tierOf = (L) => (L >= 20 ? 4 : L >= 15 ? 3 : L >= 10 ? 2 : L >= 5 ? 1 : 0);
const NAMES = ['', 'Empowered', 'Exalted', 'Ascendant', 'Godlike'];
export const tierName = (L) => NAMES[tierOf(L)];

/** The class flourish on a cast: at the hero, and again where the skill lands. */
export function classCastFx(p, sk, L, tx, ty) {
  const T = THEMES[p.classId] || DEF, tier = tierOf(L), k = 1 + tier * 0.22;
  const E = T.el ? elem(sk.el) : { glow: T.c[0], core: T.c[1], dark: T.c[2] };
  const n = Math.round((6 + L * 0.9) * (G.touch ? 0.55 : 1));
  T.fx(p.x, p.y, n, k, 'cast', E);
  const g = p._classGlow;
  if (g && g.t < g.dur) { g.t = 0; g.k = Math.max(g.k, k); } else addEffect(p._classGlow = new HeroGlow(p, T.c, k, 0.45 + tier * 0.12));
  if (tier >= 1) addEffect(new Ring(p.x, p.y, 0.1, 0.9 + tier * 0.3, 0.45, T.c[0], 2 + tier));
  const bard = p.classId === 'bard'; // the Bard's ranks show on his notes and staves instead of a bloom over him
  if (tier >= 2 && !bard) { addEffect(new Ring(p.x, p.y, 0.05, 0.6 + tier * 0.2, 0.55, T.c[1], 2, { fill: true })); addLight(p.x, p.y, 3 + tier, 0.6); }
  const far = Math.hypot(tx - p.x, ty - p.y) > 0.8 && Math.hypot(tx - p.x, ty - p.y) < 14;
  if (tier >= 3 && far) { T.fx(tx, ty, Math.round(n * 0.6), k, 'hit', E); addEffect(new Ring(tx, ty, 0.1, 1.4, 0.5, T.c[0], 4)); }
  if (tier >= 4 && !bard) { addEffect(new Column(p.x, p.y, T.c[0], 0.45, 16, 180)); if (!sk.m.free) camera.shake(1.2); }
}

let hitBudget = 0, hitAt = 0;
/** Small themed splash where a player skill lands (throttled so a rain of hits doesn't flood the particle pool). */
export function classHitFx(p, tgt, skId, el) {
  const now = G.time || 0;
  if (now !== hitAt) { hitAt = now; hitBudget = G.touch ? 2 : 4; }
  if (hitBudget-- <= 0) return;
  const T = THEMES[p.classId] || DEF, L = (p.char && p.char.skills[skId]) || 1, tier = tierOf(L), k = 0.8 + tier * 0.15;
  const E = T.el ? elem(el) : { glow: T.c[0], core: T.c[1], dark: T.c[2] };
  T.fx(tgt.x, tgt.y, Math.round((3 + tier * 2) * (G.touch ? 0.6 : 1)), k, 'hit', E);
}

// ===================================================================== the Lancer's energy lance
// A huge spear of raw element thrust from the hero's hand: a fat glowing shaft, a spearhead, crackling particles.
const LANCE_EL = {
  light: ['#a8ccff', '#ffffff', '#4a64ff'], fire: ['#ff7a10', '#fff3a0', '#c02000'], cold: ['#60c8ff', '#f0ffff', '#1a50d0'],
  holy: ['#ffd860', '#fffff0', '#d08a00'], arcane: ['#c060ff', '#ffe0ff', '#5a10c0'], poison: ['#70e020', '#e8ff90', '#206010'],
  shadow: ['#9030d0', '#e8c0ff', '#280038'], blood: ['#e01010', '#ffa0a0', '#5a0000'], phys: ['#c0d8ff', '#ffffff', '#4a64c0'],
};
export class EnergyLance {
  /** follow: the hero (the lance rides along on a dash); len in tiles; L: skill level (bigger, wilder lances). */
  constructor(src, ang, len, el, dur, L = 1, prism = false) {
    Object.assign(this, { src, ang, len, dur, t: 0, L, c: LANCE_EL[el] || LANCE_EL.light, el, prism });
    this.w = 7 + Math.min(20, L) * 0.45;
  }
  update(dt) {
    this.t += dt;
    if (this.src.dead) return false;
    const s = this.src;
    if (this.ride && s.channel && s.channel.ang !== undefined) this.ang = s.channel.ang; // follows a charge's turns
    else if (this.aim && s.aim) this.ang = Math.atan2(s.aim[1] - s.y, s.aim[0] - s.x);
    if (this.prism) { const ks = Object.keys(LANCE_EL); this.el = ks[Math.floor(this.t * 8) % ks.length]; this.c = LANCE_EL[this.el]; }
    const c = this.c, n = (14 + this.L) * dt * (G.touch ? 0.5 : 1);
    for (let i = 0; i < n * 6; i++) {
      const f = rand(0.15, 1), x = s.x + Math.cos(this.ang) * this.len * f, y = s.y + Math.sin(this.ang) * this.len * f;
      P({ type: this.el === 'light' && chance(0.3) ? 'streak' : 'glow', x, y, z: 26 + rand(-4, 4), vx: rand(-1.5, 1.5), vy: rand(-1.5, 1.5), vz: rand(-20, 40), drag: 3, life: rand(0.15, 0.4), size: rand(1.5, 3.5), size1: 0, color: chance(0.5) ? c[0] : c[1], add: true });
    }
    if (this.el === 'light' && chance(dt * 12)) { const f = rand(0.3, 1); addEffect(new Bolt(s.x + Math.cos(this.ang) * this.len * f, s.y + Math.sin(this.ang) * this.len * f, 26, s.x + Math.cos(this.ang) * this.len * f + rand(-1, 1), s.y + Math.sin(this.ang) * this.len * f + rand(-1, 1), 0, c[0], 0.12, 2)); }
    addLight(s.x + Math.cos(this.ang) * this.len * 0.6, s.y + Math.sin(this.ang) * this.len * 0.6, 3 + this.len * 0.4, 0.7);
    return this.t < this.dur;
  }
  draw(ctx) {
    const s = this.src, k = this.t / this.dur, grow = Math.min(1, this.t / 0.08), fade = k > 0.7 ? (1 - k) / 0.3 : 1;
    const ax = isoX(s.x, s.y), ay = isoY(s.x, s.y) - 26;
    const ex = s.x + Math.cos(this.ang) * this.len * grow, ey = s.y + Math.sin(this.ang) * this.len * grow;
    const bx = isoX(ex, ey), by = isoY(ex, ey) - 26;
    const dx = bx - ax, dy = by - ay, dl = Math.hypot(dx, dy) || 1, ux = dx / dl, uy = dy / dl, nx = -uy, ny = ux;
    const w = this.w * (1 + Math.sin(G.time * 50) * 0.08), c = this.c;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    // a medieval lance: a short haft, a round vamplate, then a long cone tapering to a needle tip (same overall reach)
    const hl = w * 3.4, tx = bx + ux * hl, ty = by + uy * hl;
    const vx = ax + (tx - ax) * 0.25, vy = ay + (ty - ay) * 0.25, hw = w * 1.5;
    for (const [a, lw, col] of [[0.25, w * 3.2, c[0]], [0.7, w * 1.4, c[0]], [1, w * 0.5, c[1]]]) {
      ctx.globalAlpha = a * fade; ctx.strokeStyle = col; ctx.lineWidth = lw;
      ctx.beginPath(); ctx.moveTo(ax - ux * 10, ay - uy * 10); ctx.lineTo(vx, vy); ctx.stroke();
    }
    for (const [a, sw, col] of [[0.3, 1.8, c[0]], [0.9, 1, c[0]], [1, 0.35, c[1]]]) {
      ctx.globalAlpha = a * fade; ctx.fillStyle = col;
      ctx.beginPath(); ctx.moveTo(tx + ux * (sw - 1) * w, ty + uy * (sw - 1) * w);
      ctx.lineTo(vx + nx * hw * sw, vy + ny * hw * sw); ctx.lineTo(vx - ux * w * 0.3, vy - uy * w * 0.3); ctx.lineTo(vx - nx * hw * sw, vy - ny * hw * sw);
      ctx.closePath(); ctx.fill();
    }
    ctx.globalAlpha = 0.85 * fade; ctx.strokeStyle = c[1]; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(vx, vy, w * 0.5, hw * 1.15, Math.atan2(uy, ux), 0, TAU); ctx.stroke();
    // a guard of spinning rings round the haft at high ranks
    if (this.L >= 10) for (let i = 0; i < 3; i++) {
      const f = ((G.time * 1.5 + i / 3) % 1), rx = ax + dx * f, ry = ay + dy * f;
      ctx.globalAlpha = 0.6 * fade * (1 - f); ctx.strokeStyle = c[1]; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(rx, ry, w * 1.2, w * 2.2, Math.atan2(dy, dx), 0, TAU); ctx.stroke();
    }
    ctx.restore();
  }
}
/** Thrust an energy lance from p along ang (len tiles) and leave it up for dur seconds. */
export function energyLance(p, ang, len, el, dur, L, prism) {
  return addEffect(new EnergyLance(p, ang, len, el, dur, L, prism));
}
