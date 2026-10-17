// The Astronomer (class id arcane_sorcerer) charts the sky as he fights. Every spell he casts lights a star where it
// lands (a free Star Missile every third cast, and a slain monster sometimes becomes one). Consecutive stars are
// joined by starlines that burn and slow anything crossing them. The fifth star completes a constellation: it ASCENDS,
// every star drops a starfall, the lines flare, and the shape he drew names it and grants its zodiac boon for 15 s:
// a straight line is the Hunter (crit), a closed loop the Crown (cooldowns), a tight cluster the Twins (+1 missile),
// a zigzag the Serpent (life steal), a curve that bends one way the Swan (speed), a long sprawl Draco (damage), a wide
// one the Great Bear (armor and life), anything else the Scales (regen, resist, mana). Three boons at once start a
// Grand Conjunction: the sky opens and meteors fall on everything near him.
// Also the special spells named by `astro=` (castSkill calls astroCast first) and the Celestial Mirror images.
import { G } from '../state.js';
import { rand, chance, TAU, angleTo, angleDiff, dist, clamp } from '../core/util.js';
import { sfx } from '../core/audio.js';
import { isoX, isoY, HW, HH, camera } from '../core/view.js';
import { addEffect, Ring, Column, Beam, Bolt, floatText, spawn, burst, sparkle, smoke, addDecal, addLight, glowSprite, effects } from '../gfx/vfx.js';
import { explosionFx } from '../gfx/shapes.js';
import { ASTRO, drawSun, drawMoon, drawBlackHole, drawChartStar, drawPlanet, planetColor, starSprite, drawCosmic } from '../gfx/cosmos.js';
import { SKILLS } from '../data/skills.js';
import { hit, aoe } from './combat.js';
import { Projectile, NovaWave, Area, explode, lineTargets } from './hazards.js';

export const ASTRONOMER = 'arcane_sorcerer';
export const CHART_N = 5;           // stars that complete a constellation
const STAR_LIFE = 12, LINK = 9, NEAR = 1.3, BOON_T = 15;
const roll = (d) => rand(d[0], d[1]);
const avg = (d) => (d[0] + d[1]) / 2;
class Wait {
  constructor(t, fn) { this.t = t; this.fn = fn; }
  update(dt) { this.t -= dt; if (this.t <= 0) { this.fn(); return false; } return true; }
  draw() {}
}
const later = (w, t, fn) => (t <= 0 ? fn() : w.addHazard(new Wait(t, fn)));
const stat = (k) => { if (G.astroStats) G.astroStats[k] = (G.astroStats[k] || 0) + 1; }; // tests count events

// ===================================================================== the zodiac
export const ZODIAC = {
  hunter: { name: 'The Hunter', desc: '+20% crit chance', color: '#ffd060', stats: { crit: 80 } },
  crown: { name: 'The Northern Crown', desc: '-20% cooldowns', color: '#ffffff', stats: { cdr: 40 } },
  twins: { name: 'The Twins', desc: '+1 projectile, +15% damage', color: '#60ffd0', stats: { proj: 1, dmg: 15 } },
  serpent: { name: 'The Serpent', desc: '+10% life steal, +15% damage', color: '#a0ff80', stats: { leech: 40, dmg: 15 } },
  swan: { name: 'The Swan', desc: '+24% move speed, +15% damage', color: '#9fe6ff', stats: { speed: 40, dmg: 15 } },
  dragon: { name: 'Draco', desc: '+40% damage', color: '#ff8060', stats: { dmg: 40 } },
  bear: { name: 'The Great Bear', desc: '+60% armor, +25% life', color: '#a080ff', stats: { armor: 60, life: 25 } },
  scales: { name: 'The Scales', desc: 'regeneration, +30 resist, mana', color: '#ff80e0', stats: { regen: 60, res: 30 } },
};
export const ZODIAC_KEYS = Object.keys(ZODIAC);

/** Name the constellation from the shape of its stars (in the order they were charted). */
export function readSky(S) {
  const n = S.length;
  if (n < 2) return 'scales';
  const cx = S.reduce((s, a) => s + a.x, 0) / n, cy = S.reduce((s, a) => s + a.y, 0) / n;
  const spread = Math.max(...S.map((a) => dist(a.x, a.y, cx, cy)));
  let length = 0, turn = 0, alt = 0, same = 0, lastSign = 0;
  for (let i = 1; i < n; i++) length += dist(S[i - 1].x, S[i - 1].y, S[i].x, S[i].y);
  for (let i = 2; i < n; i++) {
    const t = angleDiff(angleTo(S[i - 2].x, S[i - 2].y, S[i - 1].x, S[i - 1].y), angleTo(S[i - 1].x, S[i - 1].y, S[i].x, S[i].y));
    turn += Math.abs(t);
    const sg = Math.abs(t) < 0.25 ? 0 : Math.sign(t);
    if (sg && lastSign && sg !== lastSign) alt++;
    if (sg && lastSign && sg === lastSign) same++;
    if (sg) lastSign = sg;
  }
  if (n >= 4 && dist(S[0].x, S[0].y, S[n - 1].x, S[n - 1].y) < 2.6 && spread > 1.4) return 'crown';
  if (spread < 2.2) return 'twins';
  if (turn < 1.1) return 'hunter';
  if (alt >= Math.max(2, n - 3)) return 'serpent';
  if (same >= Math.max(2, n - 3) && alt === 0) return 'swan';
  if (length > 24) return 'dragon';
  if (spread > 5) return 'bear';
  return 'scales';
}

// ===================================================================== the chart
export function chartOf(p) {
  let ch = p.chart;
  if (!ch) ch = p.chart = { stars: [], fading: [], basic: 0, asc: 0, conjCd: 0, lineT: 0, flash: 0, last: null, from: null, world: null };
  if (ch.world !== p.world) { ch.stars.length = 0; ch.fading.length = 0; ch.world = p.world; }
  return ch;
}
const onFloor = (w, x, y) => w && w.map && w.map.isFloor(x, y);
function clampPt(p, tx, ty, range) {
  const w = p.world, a = angleTo(p.x, p.y, tx, ty);
  let d = Math.min(range, dist(p.x, p.y, tx, ty)), x = p.x + Math.cos(a) * d, y = p.y + Math.sin(a) * d;
  while (d > 0 && !onFloor(w, x, y)) { d -= 0.25; x = p.x + Math.cos(a) * d; y = p.y + Math.sin(a) * d; }
  return [x, y];
}
/** The basic attack's average hit: the least a star is worth. */
function basicDmg(p) {
  const b = SKILLS[ASTRONOMER + '.0.0'];
  return avg(p.skillDamage(b, Math.max(1, p.skillLevel(b))));
}

/** Light a star at (x, y). Returns true if it was charted (not merged into a star already there). */
export function chartStar(p, x, y, dmg, skId, opts = {}) {
  const ch = chartOf(p), w = p.world;
  if (!w || w.kind === 'town' || !onFloor(w, x, y)) return false;
  const near = ch.stars.find((s) => dist(s.x, s.y, x, y) < NEAR);
  if (near) { near.t = 0; near.pop = 1; return false; } // the same spot only brightens its star
  const last = ch.stars[ch.stars.length - 1];
  if (last && dist(last.x, last.y, x, y) > LINK) breakChart(ch); // too far to join: the old chart fades away
  ch.stars.push({ x, y, t: 0, pop: 1, dmg: Math.max(dmg || 0, basicDmg(p)), sk: skId, seed: rand(TAU) });
  stat('stars');
  sparkle(x, y, 18, ASTRO.ice, G.touch ? 3 : 6, 0.25);
  addEffect(new Ring(x, y, 0.05, 0.9, 0.35, ASTRO.glow, 2), 'ground');
  if (ch.stars.length > 1) { const a = ch.stars[ch.stars.length - 2]; addEffect(new Beam(a.x, a.y, x, y, ASTRO.glow, 4, 0.3, { z: 8, core: '#ffffff' }), 'ground'); }
  if (!opts.hold && ch.stars.length >= CHART_N) ascend(p);
  return true;
}
function breakChart(ch) {
  for (const s of ch.stars) ch.fading.push({ ...s, f: 1 });
  ch.stars.length = 0;
}

/** Complete the constellation: starfalls on every star, the lines flare, the zodiac boon. */
export function ascend(p, mul = 1, forced = null) {
  const ch = chartOf(p), w = p.world, S = ch.stars.splice(0);
  if (S.length < 2 || !w) { ch.stars.push(...S); return null; }
  const key = forced || readSky(S), Z = ZODIAC[key], n = S.length;
  const area = 1 + ((p.st && p.st.areaPct) || 0) / 100;
  const power = (S.reduce((s, a) => s + a.dmg, 0) / n) * mul * (1 + 0.07 * n);
  const sk = S[S.length - 1].sk;
  ch.asc++; ch.flash = 1; stat('asc');
  if (G.astroStats) (G.astroStats.signs || (G.astroStats.signs = {}))[key] = (G.astroStats.signs[key] || 0) + 1;
  addEffect(new ConstellationFx(S, Z), 'ground');
  S.forEach((s, i) => later(w, 0.05 + i * 0.07, () => { // a starfall on every star
    if (p.dead || p.world !== w) return;
    addEffect(new Column(s.x, s.y, ASTRO.glow, 0.5, 20, 320));
    addEffect(new Ring(s.x, s.y, 0.1, 1.5 * area, 0.4, ASTRO.ice, 4, { fill: true }));
    burst(s.x, s.y, 10, 'astral', G.touch ? 8 : 16, 3, { up: 1.5 });
    aoe(w, p, s.x, s.y, 1.5 * area, power * 0.9, 'astral', { sk, knock: 0.4 });
  }));
  for (let i = 1; i < n; i++) { // the lines flare
    const a = S[i - 1], b = S[i];
    addEffect(new Beam(a.x, a.y, b.x, b.y, '#ffffff', 9, 0.5, { z: 10, core: '#ffffff' }));
    for (const c of lineTargets(w, p.team, a.x, a.y, b.x, b.y, 0.6)) hit(p, c, power * 0.5, 'astral', { sk, slow: true });
  }
  if (n >= 3 && key === 'crown') addEffect(new Beam(S[n - 1].x, S[n - 1].y, S[0].x, S[0].y, '#ffffff', 9, 0.5, { z: 10 }));
  grantBoon(p, key);
  const cx = S.reduce((s, a) => s + a.x, 0) / n, cy = S.reduce((s, a) => s + a.y, 0) / n;
  floatText(cx, cy, 70, Z.name, Z.color, 17, { life: 2.2, vz: 18 });
  floatText(cx, cy, 50, Z.desc, '#d8ecff', 11, { life: 2, vz: 18 });
  camera.shake(4);
  sfx('holy', 0.8); sfx('arcane', 0.7);
  checkConjunction(p);
  return key;
}
function grantBoon(p, key) {
  const Z = ZODIAC[key];
  p.addBuff({ id: 'astro_' + key, name: `${Z.name}: ${Z.desc}`, el: 'astral', fx: 'aura', stats: { ...Z.stats }, t: BOON_T, max: BOON_T, zodiac: key });
  if (key === 'scales') p.mana = Math.min(p.maxMana, p.mana + p.maxMana * 0.25);
}
export const activeBoons = (p) => p.buffs.filter((b) => b.zodiac && b.t > 0).map((b) => b.zodiac);
function checkConjunction(p, force) {
  const ch = chartOf(p);
  if (!force && (ch.conjCd > 0 || activeBoons(p).length < 3)) return;
  ch.conjCd = 40;
  stat('conj');
  p.world.addHazard(new Conjunction(p, 4.5));
  floatText(p.x, p.y, 110, 'GRAND CONJUNCTION', '#ffffff', 20, { life: 2.6, vz: 14 });
  G.flash = Math.max(G.flash || 0, 0.35);
  sfx('boss', 0.7);
}

/** After a successful cast (Player.tryUseSkill): chart the star this spell lands on. */
export function astroAfterCast(p, sk, L, tx, ty) {
  if (!p.world || p.world.kind === 'town') return;
  const ch = chartOf(p), m = sk.m, k = sk.kind;
  if (m.astro === 'chart' || m.astro === 'ignite' || m.astro === 'heavensmap' || m.astro === 'mirror' || m.astro === 'conjunction') return;
  if (k === 'buff' || k === 'heal' || k === 'summon') return;
  if (m.free && (++ch.basic % 3)) return; // the basic missiles light one star every third cast
  let x, y;
  if (k === 'blink' || k === 'dash' || k === 'leap') [x, y] = ch.from || [p.x, p.y];
  else if (k === 'nova' || k === 'whirl' || (k === 'curse' && m.at === 'self') || m.follow) { x = p.x; y = p.y; }
  else [x, y] = clampPt(p, tx, ty, 9);
  chartStar(p, x, y, avg(p.skillDamage(sk, L)), sk.id);
}
export function astroOnKill(p, tgt) {
  if (p.classId !== ASTRONOMER || !chance(0.35)) return;
  chartStar(p, tgt.x, tgt.y, 0, ASTRONOMER + '.0.0');
}

/** Per frame (Player.update): starlines burn, stars fade, the orrery over his head. */
export function astroUpdate(p, dt) {
  const ch = chartOf(p), w = p.world;
  if (!w) return;
  if (!p._chartFx || !effects.includes(p._chartFx)) addEffect(p._chartFx = new ChartFx(p), 'ground');
  if (!p._orreryFx || !effects.includes(p._orreryFx)) addEffect(p._orreryFx = new OrreryFx(p), 'top');
  ch.flash = Math.max(0, ch.flash - dt * 1.5);
  if (ch.conjCd > 0) ch.conjCd -= dt;
  for (const s of ch.stars) { s.t += dt; s.pop = Math.max(0, s.pop - dt * 3); }
  if (ch.stars.length && ch.stars[0].t > STAR_LIFE) { ch.fading.push({ ...ch.stars.shift(), f: 1 }); }
  for (let i = ch.fading.length - 1; i >= 0; i--) if ((ch.fading[i].f -= dt * 1.2) <= 0) ch.fading.splice(i, 1);
  if ((ch.lineT -= dt) <= 0 && ch.stars.length > 1 && w.kind !== 'town') { // starlines sting what crosses them
    ch.lineT = 0.5;
    for (let i = 1; i < ch.stars.length; i++) {
      const a = ch.stars[i - 1], b = ch.stars[i], d = (a.dmg + b.dmg) * 0.5 * 0.16;
      for (const c of lineTargets(w, p.team, a.x, a.y, b.x, b.y, 0.4)) {
        hit(p, c, d, 'astral', { dot: true, sk: b.sk });
        c.status.slow = { t: 0.7, amt: 0.35 };
        if (chance(0.5)) sparkle(c.x, c.y, 20, ASTRO.ice, 2, 0.2);
      }
    }
  }
}

// ===================================================================== special casts (castSkill)
/**
 * Called by castSkill before its kind switch. Returns undefined to let the normal kind run (the special only adds
 * to it), true when the special replaced it, false when it could not be cast (refunded).
 */
export function astroCast(p, sk, L, tx, ty, c) {
  const w = p.world, m = sk.m, { dmg, area, o, el } = c;
  chartOf(p).from = [p.x, p.y];
  switch (m.astro) {
    case 'meteor': {
      const [x, y] = clampPt(p, tx, ty, 10), r = 1.6 * (m.r ?? 1) * area;
      w.addHazard(new Meteor({ world: w, src: p, x, y, r, delay: m.delay ?? 0.85, dmg, el, o, small: (m.r ?? 1) < 1.2, burn: m.burn }));
      sfx('arcane', 0.5);
      return true;
    }
    case 'shower': {
      const [x, y] = clampPt(p, tx, ty, 10), r = 2 * (m.r ?? 1) * area;
      w.addHazard(new Shower({ world: w, src: p, x, y, r, n: (m.n || 12) + Math.floor(((p.st && p.st.extraProj) || 0) * 3), dur: m.dur || 1.2, dmg, el, o }));
      addEffect(new Ring(x, y, 0.2, r, 0.6, '#ff9a40', 2), 'ground');
      return true;
    }
    case 'sunslam': case 'moonfall': {
      const [x, y] = clampPt(p, tx, ty, 10), r = 1.6 * (m.r ?? 1) * area;
      w.addHazard(new Body({ world: w, src: p, x, y, r, delay: m.delay ?? 2, dmg, el, o, kind: m.astro === 'sunslam' ? 'sun' : 'moon', burn: m.burn }));
      sfx(m.astro === 'sunslam' ? 'fire' : 'cold', 0.8);
      return true;
    }
    case 'blackhole': case 'well': {
      const [x, y] = clampPt(p, tx, ty, 10), r = 1.6 * (m.r ?? 1) * area;
      w.addHazard(new BlackHole({ world: w, src: p, x, y, r, dur: m.dur || 4, dmg: dmg.map((v) => v * 0.4), blast: dmg.map((v) => v * 2), el, o, small: m.astro === 'well' }));
      sfx('shadow'); sfx('portal', 0.6);
      return true;
    }
    case 'bigbang': {
      const [x, y] = clampPt(p, tx, ty, 10), r = 1.6 * (m.r ?? 1) * area;
      w.addHazard(new BigBang({ world: w, src: p, x, y, r, delay: m.delay ?? 1.2, dmg, el, o, anti: el === 'shadow' }));
      return true;
    }
    case 'pulsar':
      w.addHazard(new Pulsar({ world: w, src: p, dur: m.dur || 3, len: 7.5 * (m.range ?? 1), dmg: dmg.map((v) => v * 0.32), el, o }));
      sfx('light'); return true;
    case 'neutron': {
      const [x, y] = clampPt(p, tx, ty, 9);
      w.addHazard(new NeutronStar({ world: w, src: p, x, y, r: 1.8 * (m.r ?? 1) * area, dur: m.dur || 6, dmg, el, o }));
      sfx('light', 0.8); return true;
    }
    case 'wormhole': {
      const [x, y] = clampPt(p, tx, ty, 6.5 * (m.range ?? 1));
      addEffect(new Portal(p.x, p.y, 1), 'ground'); addEffect(new Portal(x, y, 1), 'ground');
      addEffect(new Beam(p.x, p.y, x, y, ASTRO.violet, 5, 0.3, { z: 20 }));
      p.x = x; p.y = y; p.path = null; p.moveTarget = null;
      if (m.nova) w.addHazard(new NovaWave({ world: w, src: p, x, y, r: 2.2 * area, dmg, el, fx: 'void', o }));
      sfx('portal', 0.7);
      return true;
    }
    case 'mirror': startMirror(p, Math.max(2, 3 + 0.3 * (L - 1)), L); return undefined; // the buff still applies
    case 'supernova': {
      addEffect(new Flash(p.x, p.y, 2.2 * (m.r ?? 1) * area));
      G.flash = Math.max(G.flash || 0, 0.25); camera.shake(8);
      for (let i = 0; i < (G.touch ? 18 : 40); i++) { const a = rand(TAU), v = rand(4, 9); spawn({ type: 'glow', x: p.x, y: p.y, z: 30, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vz: rand(-30, 60), drag: 2, life: rand(0.5, 1), size: rand(2, 4.5), size1: 0, color: i % 3 ? ASTRO.glow : i % 2 ? '#ffffff' : '#ffd060', add: true }); }
      sfx('explode', 0.8);
      return undefined;
    }
    case 'eclipse': {
      const [x, y] = clampPt(p, tx, ty, 9);
      w.addHazard(new Eclipse({ world: w, src: p, x, y, r: 2.2 * (m.r ?? 1) * area, dmg: dmg.map((v) => v * 3), el, o }));
      return undefined;
    }
    case 'align': w.addHazard(new Alignment(p, 15 + 0.3 * (L - 1))); return undefined;
    case 'conjunction': {
      const keys = ZODIAC_KEYS.slice().sort(() => Math.random() - 0.5).slice(0, 4);
      for (const k of keys) grantBoon(p, k);
      checkConjunction(p, true);
      return undefined;
    }
    case 'chart': { // three stars from the hand to the target, each a little starfall
      const [x, y] = clampPt(p, tx, ty, 9);
      for (let i = 1; i <= 3; i++) {
        const k = i / 3, sx = p.x + (x - p.x) * k, sy = p.y + (y - p.y) * k;
        later(w, i * 0.08, () => {
          if (p.dead || p.world !== w || !onFloor(w, sx, sy)) return;
          addEffect(new Column(sx, sy, ASTRO.glow, 0.35, 12, 240));
          aoe(w, p, sx, sy, 0.9 * area, roll(dmg), el, o);
          chartStar(p, sx, sy, avg(dmg), sk.id);
        });
      }
      sfx('holy', 0.5);
      return true;
    }
    case 'ignite': {
      const ch = chartOf(p);
      if (ch.stars.length >= 2) { ascend(p, 1.25); return true; }
      const [x, y] = clampPt(p, tx, ty, 9);
      addEffect(new Column(x, y, ASTRO.glow, 0.4, 14, 260));
      aoe(w, p, x, y, 1.2 * area, roll(dmg), el, o);
      chartStar(p, x, y, avg(dmg), sk.id);
      return true;
    }
    case 'heavensmap': { // seven stars round the target, then the Crown ascends
      const [x, y] = clampPt(p, tx, ty, 9), R = 2.4 * area, ch = chartOf(p);
      if (ch.stars.length >= 2) ascend(p);
      breakChart(ch);
      for (let i = 0; i < 7; i++) { const a = (i / 7) * TAU, sx = x + Math.cos(a) * R, sy = y + Math.sin(a) * R; chartStar(p, onFloor(w, sx, sy) ? sx : x, onFloor(w, sx, sy) ? sy : y, avg(dmg), sk.id, { hold: true }); }
      later(w, 0.35, () => { if (!p.dead && p.world === w) ascend(p, 1.5, 'crown'); });
      sfx('holy');
      return true;
    }
    default: return undefined;
  }
}

/** While the Celestial Mirror shines, projectile spells also leave every image (a few each). */
export function mirrorShots(p) {
  const M = p.mirror;
  return M && M.t < M.dur ? M.images.map((im) => im.at()) : null;
}

// ===================================================================== hazards and effects
/** A meteor (or a falling star) streaking down onto (x, y). */
class Meteor {
  constructor(o) {
    Object.assign(this, { t: 0, delay: 0.85, r: 1.5 }, o);
    this.team = this.src.team; this.seed = rand(TAU);
    this.fire = this.el === 'fire';
    addEffect(new Tele(this.x, this.y, this.r, this.delay, this.fire ? '#ff9a40' : ASTRO.glow), 'ground');
  }
  at(k) { const f = 1 - k; return [this.x - f * 3.2, this.y - f * 1.4, f * 430]; } // in from the upper left
  update(dt) {
    this.t += dt;
    const k = Math.min(1, this.t / this.delay), [x, y, z] = this.at(k), m = G.touch ? 0.5 : 1;
    if (chance(dt * 60 * m)) spawn({ type: 'glow', x: x + rand(-0.15, 0.15), y: y + rand(-0.15, 0.15), z: z + rand(-6, 6), vz: rand(10, 40), life: rand(0.3, 0.6), size: rand(3, 6) * (this.small ? 0.7 : 1 + this.r * 0.2), size1: 0, color: this.fire ? (chance(0.6) ? '#ff8a20' : ASTRO.ice) : (chance(0.5) ? ASTRO.glow : '#ffffff'), add: true });
    if (this.fire && chance(dt * 18 * m)) smoke(x, y, z, '#2a1a20', 1, 6);
    addLight(x, y, 3 + this.r, 0.9, z, this.fire ? '#ff9a40' : ASTRO.glow);
    if (this.t < this.delay) return true;
    explode(this.world, this.src, this.x, this.y, this.r, this.dmg, this.el, { ...this.o, sound: true }, this.small ? 'explosion' : 'meteor');
    burst(this.x, this.y, 8, 'astral', G.touch ? 10 : 22, 3 + this.r, { up: 1.6 });
    if (!this.small) { addDecal(this.x, this.y, 'rgba(10,14,30,0.55)', this.r * 0.55, 'scorch', 0.6); addEffect(new Ring(this.x, this.y, 0.2, this.r * 1.5, 0.6, '#ffffff', 3)); }
    if (this.burn) this.world.addHazard(new Area({ world: this.world, src: this.src, x: this.x, y: this.y, r: this.r * 0.75, dur: 3, tick: 0.5, dmg: this.dmg.map((v) => v * 0.15), el: this.el, fx: 'fire', o: this.o }));
    return false;
  }
  draw(ctx) {
    const k = Math.min(1, this.t / this.delay), [x, y, z] = this.at(k);
    const px = isoX(x, y), py = isoY(x, y) - z, s = this.small ? 0.8 : 0.9 + this.r * 0.35;
    const [x0, y0, z0] = this.at(Math.max(0, k - 0.05)), head = Math.atan2(py - (isoY(x0, y0) - z0), px - isoX(x0, y0));
    drawCosmic(ctx, 'comet', px, py, head, s, null, this.t);
    if (!this.small) { // a dark rock in the flame head
      ctx.fillStyle = this.fire ? '#3a2018' : '#202838';
      ctx.save(); ctx.translate(px, py); ctx.rotate(this.t * 5 + this.seed);
      ctx.beginPath(); for (let i = 0; i < 7; i++) { const a = i / 7 * TAU, rr = (6 + (i % 3) * 1.6) * s; i ? ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); } ctx.fill();
      ctx.restore();
      ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(glowSprite(this.fire ? '#ff7a10' : ASTRO.glow), px - 14 * s, py - 14 * s, 28 * s, 28 * s); ctx.globalCompositeOperation = 'source-over';
    }
  }
}
/** A ground telegraph ring that fills as the impact nears. */
class Tele {
  constructor(x, y, r, dur, color) { Object.assign(this, { x, y, r, dur, color, t: 0 }); }
  update(dt) { this.t += dt; return this.t < this.dur; }
  draw(ctx) {
    const k = this.t / this.dur, px = isoX(this.x, this.y), py = isoY(this.x, this.y), rx = this.r * HW * 1.41, ry = this.r * HH * 1.41;
    ctx.globalAlpha = 0.4 + 0.4 * k; ctx.strokeStyle = this.color; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(px, py, rx, ry, 0, 0, TAU); ctx.stroke();
    ctx.globalAlpha = 0.12 + 0.2 * k; ctx.fillStyle = this.color;
    ctx.beginPath(); ctx.ellipse(px, py, rx * k, ry * k, 0, 0, TAU); ctx.fill();
    ctx.globalAlpha = 1;
  }
}
/** A shower of meteors over an area. */
class Shower {
  constructor(o) { Object.assign(this, { t: 0, made: 0 }, o); this.team = this.src.team; }
  update(dt) {
    this.t += dt;
    const want = Math.min(this.n, Math.floor((this.t / this.dur) * this.n) + 1);
    while (this.made < want) {
      this.made++;
      const a = rand(TAU), d = Math.sqrt(Math.random()) * this.r, x = this.x + Math.cos(a) * d, y = this.y + Math.sin(a) * d;
      if (onFloor(this.world, x, y)) this.world.addHazard(new Meteor({ world: this.world, src: this.src, x, y, r: rand(0.8, 1.15), delay: rand(0.45, 0.7), dmg: this.dmg, el: this.el, o: this.o, small: chance(0.35) }));
    }
    return this.made < this.n;
  }
  draw() {}
}

/** The Sun Slam (and Moonfall): a whole sun (or moon) slowly drops out of the sky and crashes. */
class Body {
  constructor(o) {
    Object.assign(this, { t: 0, delay: 2, heatT: 0 }, o);
    this.team = this.src.team; this.sun = this.kind === 'sun'; this.H = 300;
    addEffect(new BodyShadow(this), 'ground');
  }
  k() { return Math.min(1, this.t / this.delay); }
  fall() { const k = this.k(); return Math.pow(k, 1.6); } // slow at first, then it plunges
  update(dt) {
    this.t += dt;
    const k = this.k(), f = this.fall(), w = this.world, m = G.touch ? 0.5 : 1;
    const z = this.H * (1 - f), x = this.x - (1 - f) * 2, y = this.y - (1 - f) * 2;
    addLight(this.x, this.y, this.r * (1 + 2 * k), 0.6 + k, 20, this.sun ? '#ff9a30' : '#a8d8ff');
    if (chance(dt * 40 * m)) { // embers (or frost) shed as it falls
      const a = rand(TAU), d = rand(0, this.r * 0.4);
      spawn({ type: this.sun ? 'glow' : 'shard', x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, z: z + rand(-20, 20), vz: rand(-160, -60), g: this.sun ? 0 : 120, life: rand(0.5, 1), size: rand(2, 5), size1: this.sun ? 0 : undefined, color: this.sun ? (chance(0.5) ? '#ffb040' : '#ff6010') : '#d8f4ff', add: this.sun, rot: rand(TAU) });
    }
    if (k > 0.45 && (this.heatT -= dt) <= 0) { // the heat (or cold) is felt before it lands
      this.heatT = 0.5;
      for (const c of w.hostiles(this.team, this.x, this.y, this.r)) { hit(this.src, c, roll(this.dmg) * 0.06, this.el, { dot: true, sk: this.o.sk }); if (!this.sun) c.status.slow = { t: 0.6, amt: 0.35 }; }
      if (this.sun && chance(0.5)) sfx('fire', 0.35);
    }
    if (k > 0.6) camera.shake(1 + 4 * (k - 0.6));
    if (this.t < this.delay) return true;
    // impact
    const r = this.r;
    explode(w, this.src, this.x, this.y, r, this.dmg, this.el, { ...this.o, knock: 1.6, sound: true, slow: !this.sun || this.o.slow }, 'nuke');
    for (let i = 0; i < 4; i++) addEffect(new Ring(this.x, this.y, 0.2, r * (1.1 + i * 0.35), 0.5 + i * 0.15, i % 2 ? '#ffffff' : this.sun ? '#ffb040' : '#a8e0ff', 7 - i));
    addEffect(new Flash(this.x, this.y, r * 1.2, this.sun ? '#fff0b0' : '#e8f6ff'));
    for (let i = 0; i < (G.touch ? 30 : 70); i++) {
      const a = rand(TAU), v = rand(3, 9) * (0.6 + r * 0.15);
      spawn({ type: this.sun ? 'glow' : 'shard', x: this.x, y: this.y, z: 10, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vz: rand(40, 220), g: 260, drag: 1.2, life: rand(0.6, 1.4), size: rand(2.5, 5), size1: this.sun ? 0.5 : undefined, color: this.sun ? (i % 3 ? '#ff8a20' : '#ffe080') : i % 2 ? '#d8f4ff' : '#ffffff', add: this.sun, rot: a });
    }
    addDecal(this.x, this.y, this.sun ? 'rgba(20,8,2,0.6)' : '#b0e0ff', r * 0.7, this.sun ? 'scorch' : 'frost', 0.65);
    if (this.sun) w.addHazard(new Area({ world: w, src: this.src, x: this.x, y: this.y, r: r * 0.85, dur: 3.5, tick: 0.5, dmg: this.dmg.map((v) => v * 0.12), el: 'fire', fx: 'fire', o: this.o }));
    G.flash = Math.max(G.flash || 0, 0.55); camera.shake(16);
    sfx('boss', 0.8);
    stat(this.sun ? 'sun' : 'moon');
    return false;
  }
  draw(ctx) {
    const f = this.fall(), z = this.H * (1 - f), x = this.x - (1 - f) * 2, y = this.y - (1 - f) * 2;
    const R = this.r * HW * 0.85 * (0.7 + 0.3 * this.k());
    if (this.sun) drawSun(ctx, isoX(x, y), isoY(x, y) - z - R * 0.4, R, this.t, 0.6 + this.k() * 0.6);
    else drawMoon(ctx, isoX(x, y), isoY(x, y) - z - R * 0.4, R, this.t);
  }
}
class BodyShadow {
  constructor(b) { this.b = b; this.t = 0; }
  update(dt) { this.t += dt; return this.t < this.b.delay; }
  draw(ctx) {
    const b = this.b, k = b.k(), px = isoX(b.x, b.y), py = isoY(b.x, b.y), rx = b.r * HW * 1.41, ry = b.r * HH * 1.41;
    ctx.globalAlpha = 0.15 + 0.45 * k; ctx.fillStyle = b.sun ? '#1a0800' : '#081020';
    ctx.beginPath(); ctx.ellipse(px, py, rx * (0.3 + 0.7 * k), ry * (0.3 + 0.7 * k), 0, 0, TAU); ctx.fill();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.25 + 0.55 * k; ctx.strokeStyle = b.sun ? '#ff7a10' : '#80c8ff'; ctx.lineWidth = 2 + 3 * k;
    ctx.beginPath(); ctx.ellipse(px, py, rx, ry, 0, 0, TAU); ctx.stroke();
    if (b.sun) { ctx.globalAlpha = 0.35 * k; ctx.drawImage(glowSprite('#ff6010'), px - rx, py - ry * 1.6, rx * 2, ry * 3.2); }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }
}

/** A black hole: drags everything in, swallows enemy missiles, then collapses with a blast. */
class BlackHole {
  constructor(o) {
    Object.assign(this, { t: 0, tickT: 0 }, o);
    this.team = this.src.team; this.dead = false;
    this.R = this.r * (this.small ? 1.4 : 1.7);
  }
  get depth() { return this.x + this.y + 0.2; }
  update(dt) {
    const w = this.world;
    this.t += dt;
    const k = Math.min(1, this.t * 3) * Math.min(1, (this.dur - this.t) * 3 + 0.2);
    for (const c of w.hostiles(this.team, this.x, this.y, this.R)) { // the pull grows near the heart
      if (c.static) continue;
      const d = dist(c.x, c.y, this.x, this.y); if (d < 0.25) continue;
      const a = angleTo(c.x, c.y, this.x, this.y), sp = (1.6 + 3.4 * (1 - d / this.R)) * (c.rank === 'boss' ? 0.2 : 1) * k;
      w.map.move(c, Math.cos(a) * sp * dt, Math.sin(a) * sp * dt, c.ghost);
    }
    for (const h of w.hazards) if (h instanceof Projectile && h.team !== this.team && !h.dead && dist(h.x, h.y, this.x, this.y) < this.r) { h.dead = true; sparkle(h.x, h.y, h.z || 20, ASTRO.violet, 3, 0.2); }
    if ((this.tickT -= dt) <= 0) {
      this.tickT = 0.3;
      for (const c of w.hostiles(this.team, this.x, this.y, this.r)) hit(this.src, c, roll(this.dmg), this.el, { ...this.o, dot: true });
    }
    const m = G.touch ? 0.5 : 1;
    for (let i = 0; i < 3; i++) if (chance(dt * 30 * m)) { // matter spirals in
      spawn({ type: 'glow', x: this.x, y: this.y, z: 8, life: rand(0.6, 1.1), size: rand(1.8, 3.6), size1: 0.5, color: [ASTRO.glow, '#ffa040', '#ffffff', ASTRO.violet][i + (chance(0.3) ? 1 : 0)], add: true,
        vortex: { owner: this, angle: rand(TAU), omega: rand(4, 6), radius: this.R * rand(0.8, 1.1), radial: -this.R * 0.9, rise: 6 } });
    }
    addLight(this.x, this.y, this.R * 1.3, 0.7, 20, '#7a50ff');
    if (this.t < this.dur) return true;
    this.dead = true; // collapse
    explode(w, this.src, this.x, this.y, this.r * 1.1, this.blast, this.el, { ...this.o, knock: 1.2, sound: true }, 'void');
    addEffect(new Ring(this.x, this.y, this.R * 1.4, 0.1, 0.45, '#ffffff', 6));
    addEffect(new Flash(this.x, this.y, this.r, '#c8b0ff'));
    if (!this.small) { G.flash = Math.max(G.flash || 0, 0.2); camera.shake(10); }
    stat('hole');
    return false;
  }
  draw(ctx) {
    const k = Math.min(1, this.t * 3) * Math.min(1, (this.dur - this.t) * 3 + 0.2);
    const px = isoX(this.x, this.y), py = isoY(this.x, this.y), R = this.r * HW * 0.55 * (0.4 + 0.6 * k);
    ctx.globalAlpha = 0.35 * k; ctx.fillStyle = '#05000c';
    ctx.beginPath(); ctx.ellipse(px, py, this.R * HW * 1.1, this.R * HH * 1.1, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
    drawBlackHole(ctx, px, py - 26, R, this.t, k);
  }
}

/** A star at the hero's chest sweeping two beams round and round. */
class Pulsar {
  constructor(o) { Object.assign(this, { t: 0, tickT: 0, n: 0 }, o); this.team = this.src.team; this.ang = rand(TAU); }
  get depth() { return this.src.x + this.src.y + 0.6; }
  ends() {
    const s = this.src, w = this.world, out = [];
    for (const a of [this.ang, this.ang + Math.PI]) { const L = w.map.rayLength(s.x, s.y, a, this.len); out.push([s.x + Math.cos(a) * L, s.y + Math.sin(a) * L]); }
    return out;
  }
  update(dt) {
    const s = this.src;
    if (s.dead || s.world !== this.world) return false;
    this.t += dt; this.ang += dt * 3.4;
    if ((this.tickT -= dt) <= 0) {
      this.tickT = 0.12; this.n++;
      for (const [ex, ey] of this.ends()) for (const c of lineTargets(this.world, this.team, s.x, s.y, ex, ey, 0.55)) hit(s, c, roll(this.dmg), this.el, { ...this.o, dot: this.n % 4 !== 1 });
    }
    for (const [ex, ey] of this.ends()) { if (chance(dt * 30)) spawn({ type: 'glow', x: ex, y: ey, z: 18, vz: rand(10, 40), life: 0.3, size: 4, size1: 0, color: ASTRO.ice, add: true }); addLight(ex, ey, 2, 0.8, 20, ASTRO.glow); }
    return this.t < this.dur;
  }
  draw(ctx) {
    const s = this.src, ax = isoX(s.x, s.y), ay = isoY(s.x, s.y) - 30, k = Math.min(1, this.t * 5) * Math.min(1, (this.dur - this.t) * 4);
    ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    for (const [ex, ey] of this.ends()) {
      const bx = isoX(ex, ey), by = isoY(ex, ey) - 18, wv = 8 * k * (1 + Math.sin(this.t * 60) * 0.15);
      ctx.globalAlpha = 0.3; ctx.strokeStyle = ASTRO.glow; ctx.lineWidth = wv * 3; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
      ctx.globalAlpha = 0.9; ctx.strokeStyle = ASTRO.ice; ctx.lineWidth = wv; ctx.stroke();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = wv * 0.3; ctx.stroke();
    }
    ctx.globalAlpha = k; const r = 18 + Math.sin(this.t * 30) * 4;
    ctx.drawImage(glowSprite(ASTRO.glow), ax - r * 2, ay - r * 2, r * 4, r * 4);
    ctx.save(); ctx.translate(ax, ay); ctx.rotate(this.t * 8); ctx.drawImage(starSprite('#ffffff'), -r * 0.7, -r * 0.7, r * 1.4, r * 1.4); ctx.restore();
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }
}

/** A neutron star hangs over the ground, pulsing and shooting star missiles at whatever is near. */
class NeutronStar {
  constructor(o) { Object.assign(this, { t: 0, shotT: 0.2, pulseT: 0.5 }, o); this.team = this.src.team; }
  get depth() { return this.x + this.y + 0.5; }
  update(dt) {
    const w = this.world;
    this.t += dt;
    if ((this.shotT -= dt) <= 0) {
      this.shotT = 0.42;
      const foes = w.hostiles(this.team, this.x, this.y, 7);
      if (foes.length) {
        const f = foes[Math.floor(Math.random() * foes.length)];
        w.addHazard(new Projectile({ world: w, src: this.src, x: this.x, y: this.y, z: 46, ang: angleTo(this.x, this.y, f.x, f.y), speed: 11, range: 8, fx: 'starmissile', el: 'astral', dmg: this.dmg.map((v) => v * 0.55), o: this.o, home: 1.5, light: true }));
      }
    }
    if ((this.pulseT -= dt) <= 0) {
      this.pulseT = 0.5;
      aoe(w, this.src, this.x, this.y, this.r, roll(this.dmg) * 0.25, this.el, { ...this.o, dot: true });
      addEffect(new Ring(this.x, this.y, 0.1, this.r, 0.4, ASTRO.ice, 2), 'ground');
    }
    addLight(this.x, this.y, 3.5, 1.1, 46, ASTRO.glow);
    return this.t < this.dur;
  }
  draw(ctx) {
    const px = isoX(this.x, this.y), py = isoY(this.x, this.y), z = 46 + Math.sin(this.t * 3) * 4, k = Math.min(1, this.t * 4) * Math.min(1, (this.dur - this.t) * 3);
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = k;
    ctx.fillStyle = 'rgba(80,160,255,0.15)'; ctx.beginPath(); ctx.ellipse(px, py, 22, 11, 0, 0, TAU); ctx.fill();
    for (const dir of [-1, 1]) { // polar jets
      const g = ctx.createLinearGradient(px, py - z, px, py - z + dir * 70);
      g.addColorStop(0, 'rgba(220,240,255,0.9)'); g.addColorStop(1, 'rgba(60,140,255,0)');
      ctx.fillStyle = g; ctx.fillRect(px - 3, Math.min(py - z, py - z + dir * 70), 6, 70);
    }
    ctx.strokeStyle = ASTRO.glow; ctx.lineWidth = 1.2;
    for (let i = 0; i < 3; i++) { ctx.globalAlpha = 0.6 * k; ctx.beginPath(); ctx.ellipse(px, py - z, 8 + i * 6, 16 + i * 8, this.t * 2 + i * 1.05, 0, TAU); ctx.stroke(); }
    ctx.globalAlpha = k;
    ctx.drawImage(glowSprite(ASTRO.glow), px - 30, py - z - 30, 60, 60);
    ctx.save(); ctx.translate(px, py - z); ctx.rotate(this.t * 12); ctx.drawImage(starSprite('#ffffff'), -14, -14, 28, 28); ctx.restore();
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }
}

/** The Big Bang (and Annihilation): the light gathers to a point, then everything goes out at once. */
class BigBang {
  constructor(o) { Object.assign(this, { t: 0, delay: 1.2 }, o); this.team = this.src.team; this.cols = this.anti ? ['#ff50e0', '#50e8ff', '#ffffff'] : [ASTRO.glow, '#ffd060', '#ff80e0', '#ffffff', '#80ffd0']; }
  get depth() { return this.x + this.y + 0.5; }
  update(dt) {
    this.t += dt;
    const m = G.touch ? 0.5 : 1;
    if (this.t < this.delay) {
      for (let i = 0; i < 2; i++) if (chance(dt * 40 * m)) { // light and matter gather to the point
        const a = rand(TAU), d = this.r * rand(1.2, 1.8), life = rand(0.3, 0.55);
        spawn({ type: 'glow', x: this.x + Math.cos(a) * d, y: this.y + Math.sin(a) * d, z: 30, vx: -Math.cos(a) * d / life, vy: -Math.sin(a) * d / life, life, size: rand(2, 4), size1: 0.5, color: this.cols[i % this.cols.length], add: true });
      }
      addLight(this.x, this.y, 2 + this.t * 3, 0.6, 30, this.cols[0]);
      return true;
    }
    const w = this.world;
    explode(w, this.src, this.x, this.y, this.r, this.dmg, this.el, { ...this.o, knock: 1.5, sound: true }, 'nuke');
    for (let i = 0; i < 5; i++) addEffect(new Ring(this.x, this.y, 0.1, this.r * (0.8 + i * 0.32), 0.45 + i * 0.12, this.cols[i % this.cols.length], 8 - i));
    addEffect(new Flash(this.x, this.y, this.r * 1.3, '#ffffff'));
    for (let i = 0; i < (G.touch ? 50 : 120); i++) {
      const a = rand(TAU), v = rand(4, 13);
      spawn({ type: i % 4 ? 'glow' : 'streak', x: this.x, y: this.y, z: 28, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vz: rand(-60, 120), drag: 1.4, life: rand(0.6, 1.3), size: rand(2, 4.5), size1: 0, color: this.cols[i % this.cols.length], add: true });
    }
    G.flash = Math.max(G.flash || 0, 0.7); camera.shake(18);
    sfx('boss', 0.9); sfx('explode');
    stat('bang');
    return false;
  }
  draw(ctx) {
    const k = Math.min(1, this.t / this.delay), px = isoX(this.x, this.y), py = isoY(this.x, this.y) - 30;
    ctx.globalAlpha = 0.5 * k; ctx.fillStyle = '#000004';
    ctx.beginPath(); ctx.ellipse(px, py + 30, this.r * HW * 1.41 * (1.2 - 0.4 * k), this.r * HH * 1.41 * (1.2 - 0.4 * k), 0, 0, TAU); ctx.fill();
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 1;
    const r = 4 + 10 * k + Math.sin(this.t * 40) * 2;
    ctx.drawImage(glowSprite(this.cols[0]), px - r * 3, py - r * 3, r * 6, r * 6);
    ctx.drawImage(starSprite('#ffffff'), px - r, py - r, r * 2, r * 2);
    ctx.globalCompositeOperation = 'source-over';
  }
}

/** Eclipse: a moon slides over a sun above the target; at totality the corona flares. */
class Eclipse {
  constructor(o) { Object.assign(this, { t: 0, total: 1.0, dur: 2.4, fired: false }, o); this.team = this.src.team; }
  update(dt) {
    this.t += dt;
    if (!this.fired && this.t >= this.total) {
      this.fired = true;
      aoe(this.world, this.src, this.x, this.y, this.r, roll(this.dmg), this.el, { ...this.o });
      addEffect(new Ring(this.x, this.y, 0.2, this.r * 1.2, 0.6, '#ffffff', 5));
      G.flash = Math.max(G.flash || 0, 0.2); sfx('holy', 0.7);
    }
    return this.t < this.dur;
  }
  draw(ctx) {
    const px = isoX(this.x, this.y), py = isoY(this.x, this.y), k = Math.min(1, this.t / this.total), fade = Math.min(1, (this.dur - this.t) * 2);
    ctx.globalAlpha = 0.45 * Math.min(k * 1.5, 1) * fade; ctx.fillStyle = '#04030a';
    ctx.beginPath(); ctx.ellipse(px, py, this.r * HW * 1.41, this.r * HH * 1.41, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = fade;
    const sy = py - 130, R = 26;
    if (this.t >= this.total) { // corona
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 12; i++) { const a = i / 12 * TAU + this.t; ctx.strokeStyle = '#fff6d0'; ctx.globalAlpha = 0.5 * fade; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px + Math.cos(a) * R, sy + Math.sin(a) * R); ctx.lineTo(px + Math.cos(a) * R * (1.6 + 0.3 * Math.sin(this.t * 8 + i)), sy + Math.sin(a) * R * (1.6 + 0.3 * Math.sin(this.t * 8 + i))); ctx.stroke(); }
      ctx.globalCompositeOperation = 'source-over';
    }
    drawSun(ctx, px, sy, R, this.t, 0.4);
    const mx = px + (1 - k) * 70; // the moon slides in
    ctx.globalAlpha = fade; ctx.fillStyle = '#05040a'; ctx.beginPath(); ctx.arc(mx, sy, R * 1.02, 0, TAU); ctx.fill();
    ctx.globalAlpha = 1;
  }
}

/** Syzygy: five planets drift into a line over the Astronomer's head while the buff lasts. */
class Alignment {
  constructor(p, dur) { this.p = p; this.dur = dur; this.t = 0; }
  update(dt) { this.t += dt; return this.t < this.dur && !this.p.dead && this.p.buffs.some((b) => b.t > 0 && SKILLS[b.id] && SKILLS[b.id].m.astro === 'align'); }
  draw(ctx) {
    const p = this.p, cx = isoX(p.x, p.y), cy = isoY(p.x, p.y) - (p.spriteH || 60) * 1.22 - 40, k = Math.min(1, this.t / 1.5);
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.35 * k; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cx - 60, cy); ctx.lineTo(cx + 60, cy); ctx.stroke(); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    for (let i = 0; i < 5; i++) {
      const a = i * 1.3 + this.t * 0.8, free = [cx + Math.cos(a) * 40, cy + Math.sin(a) * 14], line = [cx - 56 + i * 28, cy + Math.sin(this.t * 3 + i) * 1.5];
      drawPlanet(ctx, free[0] + (line[0] - free[0]) * k, free[1] + (line[1] - free[1]) * k, i + 1, i === 2 ? 7 : 5, this.t);
    }
  }
}

/** Grand Conjunction: the sky opens over the Astronomer and meteors fall on everything near him. */
class Conjunction {
  constructor(p, dur) {
    this.p = p; this.world = p.world; this.dur = dur; this.t = 0; this.dropT = 0;
    this.dmg = [basicDmg(p) * 1.2, basicDmg(p) * 1.6];
    this.stars = Array.from({ length: G.touch ? 30 : 60 }, () => [rand(-1, 1), rand(-1, 1), rand(TAU)]);
  }
  update(dt) {
    const p = this.p, w = this.world;
    if (p.dead || p.world !== w) return false;
    this.t += dt;
    if ((this.dropT -= dt) <= 0) {
      this.dropT = G.touch ? 0.2 : 0.13;
      const foes = w.hostiles(p.team, p.x, p.y, 9);
      let x, y;
      if (foes.length && chance(0.8)) { const f = foes[Math.floor(Math.random() * foes.length)]; x = f.x + rand(-0.6, 0.6); y = f.y + rand(-0.6, 0.6); }
      else { const a = rand(TAU), d = rand(2, 7); x = p.x + Math.cos(a) * d; y = p.y + Math.sin(a) * d; }
      if (onFloor(w, x, y)) w.addHazard(new Meteor({ world: w, src: p, x, y, r: rand(0.9, 1.4), delay: rand(0.4, 0.6), dmg: this.dmg, el: chance(0.5) ? 'fire' : 'astral', o: { sk: ASTRONOMER + '.0.0' }, small: chance(0.3) }));
    }
    return this.t < this.dur;
  }
  draw(ctx) { // a starry sky washed over the battlefield round him
    const p = this.p, cx = isoX(p.x, p.y), cy = isoY(p.x, p.y) - 40, k = Math.min(1, this.t * 2) * Math.min(1, (this.dur - this.t) * 1.5), W = 520, H = 300;
    const g = ctx.createRadialGradient(cx, cy, 20, cx, cy, W);
    g.addColorStop(0, 'rgba(10,20,70,0.35)'); g.addColorStop(1, 'rgba(4,6,30,0)');
    ctx.globalAlpha = k; ctx.fillStyle = g; ctx.fillRect(cx - W, cy - W, W * 2, W * 2);
    ctx.globalCompositeOperation = 'lighter';
    for (const [sx, sy, ph] of this.stars) {
      const r = 3 + 2.5 * Math.sin(this.t * 4 + ph);
      ctx.globalAlpha = k * (0.5 + 0.5 * Math.sin(this.t * 3 + ph));
      ctx.drawImage(starSprite(ph > 3 ? '#ffffff' : ASTRO.glow), cx + sx * W - r, cy + sy * H - 120 - r, r * 2, r * 2);
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }
}

/** A comet stabbing down out of the sky (the Comet Storm strikes; visual only). */
class CometDrop {
  constructor(x, y) { Object.assign(this, { x, y, t: 0, dur: 0.16 }); }
  update(dt) { this.t += dt; return this.t < this.dur; }
  draw(ctx) {
    const f = 1 - this.t / this.dur, px = isoX(this.x, this.y) - f * 60, py = isoY(this.x, this.y) - f * 300;
    drawCosmic(ctx, 'comet', px, py, Math.atan2(300, 60), 1.2, null, this.t);
  }
}
export const cometStrike = (x, y) => addEffect(new CometDrop(x, y));
/** A white-hot flash sphere (supernova, impacts). */
class Flash {
  constructor(x, y, r, color = '#ffffff') { Object.assign(this, { x, y, r, color, t: 0, dur: 0.45, add: true }); }
  update(dt) { this.t += dt; return this.t < this.dur; }
  draw(ctx) {
    const k = this.t / this.dur, px = isoX(this.x, this.y), py = isoY(this.x, this.y) - 24, R = this.r * HW * (0.4 + 1.2 * Math.sqrt(k));
    ctx.globalAlpha = 1 - k; ctx.drawImage(glowSprite(this.color), px - R, py - R * 0.75, R * 2, R * 1.5); ctx.globalAlpha = 1;
  }
}
/** A wormhole mouth on the ground. */
class Portal {
  constructor(x, y, dur) { Object.assign(this, { x, y, dur, t: 0 }); }
  update(dt) { this.t += dt; return this.t < this.dur; }
  draw(ctx) {
    const px = isoX(this.x, this.y), py = isoY(this.x, this.y), k = 1 - this.t / this.dur;
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 4; i++) {
      ctx.globalAlpha = k * (0.7 - i * 0.12); ctx.strokeStyle = i % 2 ? ASTRO.violet : ASTRO.glow; ctx.lineWidth = 3 - i * 0.5;
      ctx.beginPath(); ctx.ellipse(px, py, (12 + i * 7) * (0.6 + 0.4 * k), (6 + i * 3.5) * (0.6 + 0.4 * k), 0, this.t * (8 - i) + i, this.t * (8 - i) + i + 4.4); ctx.stroke();
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }
}

// ===================================================================== the Celestial Mirror
/** Eight see-through Astronomers ring him; he cannot be hurt while they shine, and they cast with him. */
function startMirror(p, dur, L) {
  const w = p.world;
  if (p.mirror) for (const im of p.mirror.images) im.dead = true;
  const M = p.mirror = { t: 0, dur, images: [], spin: rand(TAU) };
  p.invuln = Math.max(p.invuln || 0, dur);
  for (let i = 0; i < 8; i++) { const im = new MirrorImage(p, M, i, L); M.images.push(im); w.addHazard(im); }
  w.addHazard(new MirrorRing(p, M));
  // the ring of images is a constellation of its own: the Crown
  const ch = chartOf(p);
  if (ch.stars.length >= 2) ascend(p); else breakChart(ch);
  for (let i = 0; i < 8; i++) { const a = M.spin + (i / 8) * TAU; chartStar(p, p.x + Math.cos(a) * 2, p.y + Math.sin(a) * 2, 0, ASTRONOMER + '.0.0', { hold: true }); }
  later(w, 0.45, () => { if (!p.dead && p.world === w && chartOf(p).stars.length >= 2) ascend(p, 1, 'crown'); });
  sparkle(p.x, p.y, 30, ASTRO.ice, 30, 1.2);
  addEffect(new Ring(p.x, p.y, 0.1, 2.4, 0.5, '#ffffff', 4));
  sfx('portal', 0.8); sfx('arcane');
  stat('mirror');
}
class MirrorImage {
  constructor(p, M, i, L) { this.p = p; this.M = M; this.i = i; this.shotT = 0.3 + i * 0.07; this.L = L; this.world = p.world; }
  radius() { const M = this.M, t = M.t; return 1.9 * Math.min(1, t / 0.3) * Math.min(1, (M.dur - t) / 0.3 + 0.0001); }
  at() { const a = this.M.spin + this.M.t * 0.7 + (this.i / 8) * TAU, r = this.radius(); return [this.p.x + Math.cos(a) * r, this.p.y + Math.sin(a) * r]; }
  get depth() { const [x, y] = this.at(); return x + y; }
  update(dt) {
    const p = this.p, M = this.M;
    if (p.dead || p.world !== this.world || p.mirror !== M) return false;
    if (this.i === 0) M.t += dt;
    if (M.t >= M.dur) { if (this.i === 0) { p.mirror = null; sparkle(p.x, p.y, 30, ASTRO.ice, 12, 1.4); } return false; }
    if ((this.shotT -= dt) <= 0) { // each image looses a star missile of its own
      this.shotT = 0.6;
      const [x, y] = this.at(), f = this.world.nearestHostile(p.team, x, y, 8, false);
      if (f) {
        const b = SKILLS[ASTRONOMER + '.0.0'], d = p.skillDamage(b, Math.max(1, p.skillLevel(b))).map((v) => v * 0.45);
        this.world.addHazard(new Projectile({ world: this.world, src: p, x, y, ang: angleTo(x, y, f.x, f.y), speed: 10, range: 9, fx: 'starmissile', el: 'astral', dmg: d, o: { sk: b.id }, home: 1, light: true, size: 0.85 }));
      }
    }
    if (chance(dt * 8)) { const [x, y] = this.at(); sparkle(x, y, rand(10, 50), ASTRO.ice, 1, 0.3); }
    return true;
  }
  draw(ctx) {
    const p = this.p, [x, y] = this.at(), ox = p.x, oy = p.y, oa = p.alpha, top = p.screenTop, sbox = p.sbox;
    const px = isoX(x, y), py = isoY(x, y) - 28;
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.45;
    ctx.drawImage(glowSprite(ASTRO.glow), px - 26, py - 34, 52, 68);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    p.x = x; p.y = y; p.alpha = 0.3 + 0.08 * Math.sin(this.M.t * 6 + this.i); p.ghostDraw = true;
    try { p.draw(ctx); } finally { p.x = ox; p.y = oy; p.alpha = oa; p.ghostDraw = false; p.screenTop = top; p.sbox = sbox; }
  }
}
/** The ring of light that joins the eight images. */
class MirrorRing {
  constructor(p, M) { this.p = p; this.M = M; this.world = p.world; }
  update() { return this.p.mirror === this.M && !this.p.dead; }
  draw(ctx) {
    const pts = this.M.images.map((im) => { const [x, y] = im.at(); return [isoX(x, y), isoY(x, y) - 30]; });
    ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = ASTRO.ice; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.45 + 0.2 * Math.sin(this.M.t * 5);
    ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.stroke();
    ctx.globalAlpha = 0.25; ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = pts[i], b = pts[(i + 3) % 8]; ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); } ctx.stroke(); // an eight-pointed star
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }
}

// ===================================================================== the chart on the battlefield, the orrery
/** Stars and starlines, drawn on the ground layer. */
class ChartFx {
  constructor(p) { this.p = p; this.t = 0; this.add = false; }
  update(dt) { this.t += dt; return !this.p.dead && this.p.chart && G.player === this.p && this.p.world === this.p.chart.world; }
  draw(ctx) {
    const ch = this.p.chart, S = ch.stars, t = this.t;
    const P = (s) => [isoX(s.x, s.y), isoY(s.x, s.y) - 14];
    ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    for (let i = 1; i < S.length; i++) { // starlines: a soft band, a bright thread, motes flowing along
      const [ax, ay] = P(S[i - 1]), [bx, by] = P(S[i]);
      ctx.globalAlpha = 0.3; ctx.strokeStyle = ASTRO.glow; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
      ctx.globalAlpha = 0.55; ctx.lineWidth = 2.5; ctx.stroke();
      ctx.globalAlpha = 0.9; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.2; ctx.setLineDash([7, 6]); ctx.lineDashOffset = -t * 30; ctx.stroke(); ctx.setLineDash([]);
      for (let j = 0; j < 3; j++) { const k = (t * 0.7 + j / 3) % 1, r = 3; ctx.globalAlpha = 0.9 * Math.sin(k * Math.PI); ctx.drawImage(glowSprite('#ffffff'), ax + (bx - ax) * k - r, ay + (by - ay) * k - r, r * 2, r * 2); }
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    for (const s of ch.fading) { const [x, y] = P(s); drawChartStar(ctx, x, y, 0.7, t + s.seed, ASTRO.glow, s.f * 0.6); }
    S.forEach((s, i) => {
      const [x, y] = P(s), life = s.t > STAR_LIFE - 2 ? (STAR_LIFE - s.t) / 2 : 1;
      drawChartStar(ctx, x, y, 0.8 + s.pop * 0.6 + (i === S.length - 1 ? 0.15 : 0), t * 1.3 + s.seed, i === S.length - 1 ? '#9fe6ff' : ASTRO.glow, Math.max(0.15, life));
    });
  }
}
/** The finished constellation: its figure flares and fades with its name. */
class ConstellationFx {
  constructor(S, Z) { this.S = S.map((s) => [s.x, s.y]); this.Z = Z; this.t = 0; this.dur = 2.2; }
  update(dt) { this.t += dt; return this.t < this.dur; }
  draw(ctx) {
    const k = 1 - this.t / this.dur, P = this.S.map(([x, y]) => [isoX(x, y), isoY(x, y) - 14]);
    ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const [w, a, c] of [[14, 0.25, this.Z.color], [4, 0.9, '#ffffff']]) {
      ctx.globalAlpha = a * k; ctx.strokeStyle = c; ctx.lineWidth = w;
      ctx.beginPath(); P.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); if (this.Z.name.includes('Crown')) ctx.closePath(); ctx.stroke();
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    for (const [x, y] of P) drawChartStar(ctx, x, y, 1.4 * (0.6 + 0.4 * k), this.t * 3, this.Z.color, k);
  }
}
/** The little orrery over his head: the chart's progress as stars round a ring, his boons as orbiting planets. */
class OrreryFx {
  constructor(p) { this.p = p; this.t = 0; }
  update(dt) { this.t += dt; return !this.p.dead && this.p.chart && G.player === this.p; }
  draw(ctx) {
    const p = this.p, ch = p.chart;
    if (!p.world || p.world.kind === 'town') return;
    const cx = isoX(p.x, p.y), cy = (p.screenTop ?? isoY(p.x, p.y) - (p.spriteH || 60) * (p.scale || 1)) - 12, RX = G.touch ? 20 : 25, RY = RX * 0.32;
    const boons = activeBoons(p), busy = ch.stars.length || boons.length || ch.flash > 0;
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = busy ? 0.6 : 0.25;
    ctx.strokeStyle = ch.flash > 0 ? '#ffffff' : ASTRO.glow; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(cx, cy, RX, RY, 0, 0, TAU); ctx.stroke();
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    for (let i = 0; i < CHART_N; i++) { // the chart: lit and unlit slots
      const a = -Math.PI / 2 + (i / CHART_N) * TAU, x = cx + Math.cos(a) * RX, y = cy + Math.sin(a) * RY, lit = i < ch.stars.length;
      if (lit) drawChartStar(ctx, x, y, 0.45, this.t * 2 + i, ASTRO.glow, 1);
      else { ctx.globalAlpha = busy ? 0.5 : 0.25; ctx.fillStyle = '#6a80b0'; ctx.fillRect(x - 1, y - 1, 2, 2); ctx.globalAlpha = 1; }
    }
    boons.forEach((k, i) => { // the boons orbit as planets
      const a = this.t * 1.6 + (i / Math.max(1, boons.length)) * TAU, x = cx + Math.cos(a) * RX * 0.62, y = cy - 6 + Math.sin(a) * RY * 0.62;
      ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(glowSprite(ZODIAC[k].color), x - 7, y - 7, 14, 14); ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = ZODIAC[k].color; ctx.beginPath(); ctx.arc(x, y, 2.4, 0, TAU); ctx.fill();
    });
    if (ch.flash > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = ch.flash; ctx.drawImage(glowSprite('#ffffff'), cx - RX * 1.5, cy - RX * 1.5, RX * 3, RX * 3); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
  }
}
export { planetColor };
