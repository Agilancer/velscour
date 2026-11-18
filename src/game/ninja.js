// The Ninja: somersaults, cuts that pass straight through the enemy, shadows that repeat them, the grappling hook,
// shuriken and caltrops. ninjaCast is castSkill's hook for his `nin=` moves (data/skilldata.js): true = the move
// replaced the kind's cast, false = it failed, undefined = it adds to it (most: a flip, after-images, a crescent).
//
// Mirror Shadows: for its time two to four shadows follow in his footsteps and repeat every strike he makes
// (MIRROR_DMG of it each). Grappling Hook pulls hookCount(L) foes to him: one at rank 1, one more every four ranks,
// five from rank 17; a guardian too heavy to drag pulls him to it instead.
import { G } from '../state.js';
import { rand, chance, TAU, clamp, angleTo, dist } from '../core/util.js';
import { sfx } from '../core/audio.js';
import { camera, isoX, isoY } from '../core/view.js';
import { addEffect, Ring, Slash, Bolt, burst, smoke, sparkle, floatText, addDecal } from '../gfx/vfx.js';
import { hit, aoe } from './combat.js';
import { explode, lineTargets, Projectile, Area } from './hazards.js';
import { later } from './sigs/common.js';
import { drawBlade3D, preloadBlades3D } from '../gfx/blades3d.js';
import { AfterImage, shadowTrail, CutLine, cutBetween, Crescent, Rope, drawGhost, bloodCut, SHADE, CYAN } from '../gfx/shadowfx.js';

export const MIRROR_DMG = 0.2;
/** Foes one Grappling Hook pulls at rank L: 1, 2 at rank 5, 3 at 9, 4 at 13, 5 from 17. */
export const hookCount = (L) => Math.min(5, 1 + Math.floor((Math.max(1, L) - 1) / 4));
/** Shadows that follow him under Mirror Shadows at rank L: 2, 3 at rank 8, 4 from 15. */
export const mirrorCount = (L) => Math.min(4, 2 + Math.floor((Math.max(1, L) - 1) / 7));
const roll = (d) => rand(d[0], d[1]), WHITE = '#ffffff';
const scr = (x0, y0, x1, y1) => Math.atan2(isoY(x1, y1) - isoY(x0, y0), isoX(x1, y1) - isoX(x0, y0));
const flipOf = (x0, y0, x1, y1) => isoX(x1, y1) < isoX(x0, y0);

export function ninjaOf(p) {
  return p.ninja || (p.ninja = { n: 0, mirror: 0, mirrorN: 2, hist: [], smoke: 0, cutT: 0, world: null, shades: null });
}
function clampAt(w, p, tx, ty, range) {
  const a = angleTo(p.x, p.y, tx, ty);
  let d = Math.min(range, dist(p.x, p.y, tx, ty)), x = p.x + Math.cos(a) * d, y = p.y + Math.sin(a) * d;
  while (d > 0 && !w.map.walkable(x, y)) { d -= 0.25; x = p.x + Math.cos(a) * d; y = p.y + Math.sin(a) * d; }
  return [x, y];
}
/** A somersault: `spins` turns in `dur` seconds, `h` px of arc of its own (a leap brings its own height). */
export function flip(p, dur, spins = 1, h = 0, dir = 1) { p.acro = { t: 0, dur, spins, h, dir }; }
const foesAt = (p, x, y, r) => p.world.hostiles(p.team, x, y, r).filter((c) => !c.dead && !c.clutter).sort((a, b) => dist(x, y, a.x, a.y) - dist(x, y, b.x, b.y));

// ------------------------------------------------------------------ the cast hook
export function ninjaCast(p, sk, L, tx, ty, C) {
  const S = ninjaOf(p), m = sk.m, w = p.world, { dmg, o, el, area, ang } = C;
  preloadBlades3D();
  S.n++;
  const dmgKind = !['buff', 'heal', 'summon', 'curse'].includes(sk.kind);
  if (S.smoke > 0 && dmgKind) { S.smoke = 0; p.targetable = true; p.alpha = undefined; }
  if (S.mirror > 0 && dmgKind && !C.echo) mirrorEcho(p, sk, tx, ty, C); // his shadows repeat the strike
  if (sk.kind === 'melee' && sk.fx === 'slash') o.cut = true;
  switch (m.nin) {
    case 'crescent': { // the katana's moon; every third cut he turns right over with it
      const third = S.n % 3 === 0, r = 1.5 * (m.r ?? 1) * (third ? 1.25 : 1);
      addEffect(new Crescent(p.x, p.y, ang, { r, arc: third ? 4.4 : 2.7, flip: S.n % 2 ? 1 : -1, dur: third ? 0.3 : 0.22 }));
      if (third) { flip(p, 0.3, 1, 16); for (let i = 0; i < 2; i++) dmg[i] *= 1.25; w.addHazard(new AfterImage(p, { life: 0.25, a: 0.4 })); }
      return undefined;
    }
    case 'swallow': { // a leaping cut clean through them
      const len = Math.min(5 * (m.range ?? 1), Math.max(2, dist(p.x, p.y, tx, ty) + 0.5)), dur = len / 16 + 0.06, x0 = p.x, y0 = p.y;
      flip(p, dur, 1, 26); shadowTrail(p, dur, { a: 0.5, glow: el === 'light' ? '#a8ccff' : null });
      later(w, dur, () => { cutBetween(x0, y0, p.x, p.y, { width: 6, dur: 0.4, color: el === 'light' ? '#cfe2ff' : CYAN }); addEffect(new Crescent(p.x, p.y, ang + Math.PI, { r: 1.2, arc: 2.4 })); });
      o.cut = true;
      return undefined;
    }
    case 'rising': // a backflip with the blade coming up under them
      flip(p, 0.42, 1, 36, -1); w.addHazard(new AfterImage(p, { life: 0.3, a: 0.45 }));
      addEffect(new Crescent(p.x, p.y, ang, { r: 1.7 * (m.r ?? 1), arc: 3.8, dur: 0.3, z: 30 }));
      addEffect(new CutLine(p.x + Math.cos(ang) * 0.7, p.y + Math.sin(ang) * 0.7, -Math.PI / 2, { len: 130, width: 7, dur: 0.34, z: 50 }));
      o.cut = true;
      return undefined;
    case 'iai': return iaido(p, sk, tx, ty, C);
    case 'cross': { // three crossing dashes
      const dur = 0.25 * (m.n || 3) + 0.2;
      flip(p, 0.28, 1, 18); shadowTrail(p, dur, { a: 0.45 });
      for (let i = 1; i < (m.n || 3); i++) later(w, i * 0.26, () => { if (!p.dead && p.channel) flip(p, 0.26, 1, 18, i % 2 ? -1 : 1); });
      o.cut = true;
      return undefined;
    }
    case 'drop': return heavensDrop(p, sk, tx, ty, C);
    case 'petals': case 'flail': { // he cartwheels through them, the steel a wheel round him
      const dur = m.dur || 2;
      flip(p, dur, Math.round(dur * 2.5), 10); shadowTrail(p, dur, { a: 0.3, gap: 0.09 });
      const col = m.nin === 'flail' ? '#ffd890' : CYAN;
      for (let i = 0; i < dur / 0.22; i++) later(w, i * 0.22, () => { if (!p.dead) addEffect(new Crescent(p.x, p.y, i * 2.1, { r: 1.5, arc: 4.6, dur: 0.24, color: col, flip: i % 2 ? 1 : -1 })); });
      o.cut = m.nin === 'petals';
      return undefined;
    }
    case 'hundred': return hundredCuts(p, sk, tx, ty, C);
    case 'step': // out of one shadow, into another
      w.addHazard(new AfterImage(p, { life: 0.5, a: 0.65 }));
      later(w, 0.02, () => addEffect(new Crescent(p.x, p.y, ang, { r: 1.5, arc: 6.2, dur: 0.26, color: '#b58cff' })));
      return undefined;
    case 'mirror': S.mirror = (m.dur || 16) + (L - 1) * 0.3; S.mirrorN = Math.min(5, mirrorCount(L) + (p.st.talents && p.st.talents.living_shadows ? 1 : 0)); sfx('shadow', 0.6); return undefined;
    case 'grapple': return grapple(p, sk, L, tx, ty, C);
    case 'smoke': S.smoke = 2.5; p.targetable = false; smoke(p.x, p.y, 8, '#16101a', 10, 14); return undefined;
    case 'zip': { // the hook bites, the rope takes him there feet first
      const [x, y] = clampAt(w, p, tx, ty, 6.5 * (m.range ?? 1));
      addEffect(new Rope(p, () => [x, y, 6], { dur: 0.5, taut: true }));
      flip(p, 0.48, 1, 0); shadowTrail(p, 0.48, { a: 0.4 });
      return undefined;
    }
    case 'legion': return umbralLegion(p, sk, tx, ty, C);
    case 'thousand': return thousandShadows(p, sk, tx, ty, C);
    case 'caltrops': { const [x, y] = clampAt(w, p, tx, ty, 9); w.addHazard(new CaltropField(p, x, y, 1.8 * (m.r ?? 1) * area, m.dur || 7)); return undefined; }
    case 'backflip': return backflip(p, sk, tx, ty, C);
    case 'steel': flip(p, 0.7, 2, 64); shadowTrail(p, 0.7, { a: 0.35, gap: 0.08 }); return undefined; // he spins up over them, throwing
    case 'demon': flip(p, 0.4, 1, 22); return undefined;
    case 'chucks': // the nunchaku: a figure of eight
      for (let i = 0; i < 4; i++) later(w, i * 0.085, () => { if (!p.dead) addEffect(new Slash(p.x, p.y, ang + (i % 2 ? 0.5 : -0.5), 2.6, 1.05, 0.14, i % 2 ? '#ffd890' : '#c08a48', { width: 5, flip: i % 2 })); });
      o.chucks = true;
      return undefined;
    case 'kick': flip(p, 0.48, 1, 0); shadowTrail(p, 0.48, { a: 0.4, glow: '#a8ccff' }); later(w, 0.48, () => addEffect(new Bolt(p.x - 0.6, p.y - 0.6, 300, p.x, p.y, 0, '#cfe2ff', 0.3, 4))); return undefined;
    case 'dragon': // the cuts come down as fire
      flip(p, 0.5, 2, 40); shadowTrail(p, 0.5, { a: 0.4, glow: '#ff7a10' });
      for (let i = 0; i < 3; i++) later(w, i * 0.12, () => addEffect(new Crescent(p.x, p.y, ang + i * 2.1, { r: 2 + i * 0.4, arc: 5, dur: 0.3, color: '#ff8a20' })));
      return undefined;
    default: return undefined;
  }
}

// ------------------------------------------------------------------ Mirror Shadows
/** His shadows repeat a strike a beat behind him, from where they stand. */
function mirrorEcho(p, sk, tx, ty, C) {
  const S = ninjaOf(p), w = p.world, d = C.dmg.map((v) => v * (p.st.talents && p.st.talents.kage_bunshin ? 0.32 : MIRROR_DMG)), proj = ['proj', 'rain', 'orbit', 'trap'].includes(sk.kind);
  for (let i = 0; i < S.mirrorN; i++) later(w, 0.1 * (i + 1), () => {
    if (p.dead || S.mirror <= 0) return;
    const at = shadeAt(S, i), a = angleTo(at.x, at.y, tx, ty);
    if (proj) w.addHazard(new Projectile({ world: w, src: p, x: at.x, y: at.y, ang: a, speed: 12, range: 9, fx: sk.fx === 'caltrop' ? 'shuriken' : sk.fx, el: C.el, dmg: d, o: { sk: sk.id, mirror: true }, size: 0.9, r: 0.3, skin: sk.name }));
    else {
      addEffect(new Crescent(at.x, at.y, a, { r: 1.5, arc: 2.6, dur: 0.22, color: '#8f7cff', flip: i % 2 ? 1 : -1 }));
      for (const t of w.hostiles(p.team, at.x + Math.cos(a) * 0.9, at.y + Math.sin(a) * 0.9, 1.5)) hit(p, t, roll(d), C.el, { sk: sk.id, mirror: true, cut: true, ang: a, melee: true });
    }
    at.lunge = 1;
  });
}
function shadeAt(S, i) { // where shadow i stands: his own place a little while ago
  const H = S.hist, want = 0.16 * (i + 1);
  let acc = 0;
  for (let k = H.length - 1; k >= 0; k--) { acc += H[k].dt; if (acc >= want) return H[k]; }
  return H[0] || { x: 0, y: 0, z: 0, flip: false, acro: null, dt: 0 };
}
class MirrorShades {
  constructor(p) { this.p = p; }
  get depth() { return this.p.x + this.p.y - 0.03; }
  update() { const S = this.p.ninja; return !!S && S.mirror > 0 && !this.p.dead && this.p.world === this.world; }
  draw(ctx) {
    const p = this.p, S = p.ninja, fade = Math.min(1, S.mirror * 2);
    for (let i = S.mirrorN - 1; i >= 0; i--) {
      const h = shadeAt(S, i);
      if (dist(h.x, h.y, p.x, p.y) < 0.12 && !h.acro) continue; // he stands still: they stand in him
      drawGhost(ctx, p, { x: h.x, y: h.y, z: h.z, flip: h.flip, acro: h.acro, alpha: (0.5 - i * 0.07) * fade, lunge: h.lunge || 0 });
      if (h.lunge > 0) h.lunge = Math.max(0, h.lunge - 0.07);
    }
  }
}

// ------------------------------------------------------------------ his own moves
/** Iaido: he is past them before the blade is seen; they come apart when it is sheathed. */
function iaido(p, sk, tx, ty, C) {
  const w = p.world, { dmg, o, el, ang } = C, x0 = p.x, y0 = p.y;
  let d = 0;
  const max = 8 * (sk.m.range ?? 1);
  while (d < max && w.map.walkable(x0 + Math.cos(ang) * (d + 0.25), y0 + Math.sin(ang) * (d + 0.25))) d += 0.25;
  if (d < 1) return false;
  const x1 = x0 + Math.cos(ang) * d, y1 = y0 + Math.sin(ang) * d, victims = lineTargets(w, p.team, x0, y0, x1, y1, 0.9);
  for (let i = 0; i < 4; i++) { // the shadows he leaves along the way
    const u = i / 4;
    w.addHazard(new AfterImage(p, { x: x0 + (x1 - x0) * u, y: y0 + (y1 - y0) * u, life: 0.35 + u * 0.25, a: 0.3 + u * 0.3, acro: i === 2 ? { t: 0.1, dur: 0.2, spins: 1, h: 0, dir: 1 } : null }));
  }
  p.x = x1; p.y = y1; p.path = null; p.moveTarget = null; p.lunge = 1; p.invuln = Math.max(p.invuln || 0, 0.4);
  cutBetween(x0, y0, x1, y1, { width: 3, dur: 0.5, color: WHITE });
  sfx('swing', 1);
  for (const t of victims) { t.status.stun = { t: Math.max(t.status.stun ? t.status.stun.t : 0, t.rank === 'boss' ? 0.2 : 0.5) }; }
  later(w, 0.36, () => { // the blade goes home
    cutBetween(x0, y0, x1, y1, { width: 9, dur: 0.3 });
    sparkle(p.x, p.y, 34, WHITE, 6, 0.2);
    for (const t of victims) {
      if (t.dead) continue;
      hit(p, t, roll(dmg), el, { ...o, ang, melee: true, cut: true });
      addEffect(new CutLine(t.x, t.y, rand(Math.PI), { len: 70, width: 6 }));
      bloodCut(t, ang, 1.3);
    }
    if (victims.length) { camera.shake(3 + Math.min(6, victims.length)); sfx('gore', 0.7); }
    sfx('hit', 0.6);
  });
  return true;
}

/** Heaven's Drop: he takes the foe up with him, turning over and over, and comes down on its head. */
class HeavensDrop {
  constructor(p, t, C, r) { Object.assign(this, { p, tgt: t, C, r, t: 0, up: 0.5, down: 0.16 }); p.channel = this; p.invuln = Math.max(p.invuln || 0, 0.8); flip(p, 0.66, 3, 0); }
  update(dt) {
    const p = this.p, t = this.tgt, w = this.world;
    if (p.dead) { p.z = 0; if (t) t.z = 0; return false; }
    this.t += dt;
    const u = this.t / this.up, d = (this.t - this.up) / this.down;
    p.z = u < 1 ? 150 * (1 - (1 - u) * (1 - u)) : 150 * Math.max(0, 1 - d * d);
    if (t && !t.dead) { t.z = p.z * 0.85; t.x = p.x + (p.flip ? -0.3 : 0.3); t.y = p.y + 0.05; t.status.stun = { t: 0.9 }; }
    if (chance(dt * 40)) w.addHazard(new AfterImage(p, { life: 0.22, a: 0.35 }));
    if (this.t >= this.up + this.down) {
      p.z = 0; p.channel = null; if (t) t.z = 0;
      const { dmg, o, el } = this.C;
      if (t && !t.dead) hit(p, t, roll(dmg) * 1.6, el, { ...o, melee: true, cut: true });
      explode(w, p, p.x, p.y, this.r, dmg, el, { ...o, knock: 0.9 }, 'eruption');
      addEffect(new Ring(p.x, p.y, 0.2, this.r * 1.3, 0.4, CYAN, 5));
      addDecal(p.x, p.y, 'rgba(10,6,4,0.6)', this.r * 0.5, 'scorch', 0.7);
      camera.shake(10); sfx('thud', 1);
      return false;
    }
    return true;
  }
  draw() {}
}
function heavensDrop(p, sk, tx, ty, C) {
  const w = p.world, reach = 6.5 * (sk.m.range ?? 1);
  const t = w.nearestHostile(p.team, tx, ty, 2.2, false) || w.nearestHostile(p.team, p.x, p.y, 3, true);
  if (!t || dist(p.x, p.y, t.x, t.y) > reach) return undefined; // nobody to take: a plain leap
  const a = angleTo(p.x, p.y, t.x, t.y), heavy = t.rank === 'boss' || t.rank === 'raid' || t.static || t.vel;
  w.addHazard(new AfterImage(p, { life: 0.3, a: 0.5 }));
  cutBetween(p.x, p.y, t.x, t.y, { width: 4, dur: 0.3 });
  const d = Math.max(0, dist(p.x, p.y, t.x, t.y) - 0.7);
  const nx = p.x + Math.cos(a) * d, ny = p.y + Math.sin(a) * d;
  if (w.map.walkable(nx, ny) && w.map.los(p.x, p.y, nx, ny)) { p.x = nx; p.y = ny; }
  p.path = null; p.moveTarget = null; p.face(a);
  w.addHazard(new HeavensDrop(p, heavy ? null : t, C, 1.6 * (sk.m.r ?? 1) * C.area));
  if (heavy) later(w, 0.66, () => { if (!t.dead) hit(p, t, roll(C.dmg) * 1.6, C.el, { ...C.o, melee: true, cut: true }); });
  sfx('swing', 0.9);
  return true;
}

/** Hundred-Cut Reckoning: he is everywhere in the circle at once; when he sheathes the blade every cut opens. */
class HundredCuts {
  constructor(p, x, y, r, n, C) {
    Object.assign(this, { p, x, y, r, n, C, t: 0, i: 0, acc: 0, hits: new Map(), home: [p.x, p.y], done: -1 });
    p.channel = this; p.invuln = Math.max(p.invuln || 0, n * 0.075 + 0.7);
  }
  update(dt) {
    const p = this.p, w = this.world, { dmg, o, el } = this.C;
    if (p.dead) return false;
    this.t += dt;
    if (this.done >= 0) { // the pause, then the sheathing
      if (this.t - this.done < 0.3) return true;
      addEffect(new Ring(this.x, this.y, 0.2, this.r * 1.3, 0.45, WHITE, 5));
      for (const [t, k] of this.hits) {
        if (t.dead) continue;
        for (let j = 0; j < Math.min(4, k); j++) addEffect(new CutLine(t.x, t.y, rand(Math.PI), { len: 60 + j * 14, width: 6, delay: j * 0.03 }));
        hit(p, t, roll(dmg) * (1.2 + 0.25 * k), el, { ...o, aoe: true, cut: true });
        bloodCut(t, rand(TAU), 1.8);
      }
      G.flash = Math.max(G.flash || 0, G.settings?.reduceFlashing ? 0 : 0.2); camera.shake(12); sfx('explode', 0.6); sfx('gore', 0.9); sfx('hit', 0.8);
      p.channel = null;
      return false;
    }
    this.acc += dt;
    while (this.acc >= 0.075 && this.i < this.n) {
      this.acc -= 0.075; this.i++;
      const foes = foesAt(p, this.x, this.y, this.r + 0.5);
      if (!foes.length) { this.i = this.n; break; }
      const t = foes[(this.i * 5 + 1) % foes.length], a = angleTo(p.x, p.y, t.x, t.y) + rand(-0.2, 0.2), ox = p.x, oy = p.y;
      const ok = (x, y) => w.map.walkable(x, y) && w.map.los(t.x, t.y, x, y); // never the far side of a wall
      let nx = t.x + Math.cos(a) * 1.1, ny = t.y + Math.sin(a) * 1.1;
      if (!ok(nx, ny)) { nx = t.x - Math.cos(a) * 0.6; ny = t.y - Math.sin(a) * 0.6; }
      if (!ok(nx, ny)) { nx = t.x; ny = t.y; }
      w.addHazard(new AfterImage(p, { life: 0.45, a: 0.6, acro: { t: rand(0.05, 0.25), dur: 0.3, spins: 1, h: rand(8, 26), dir: this.i % 2 ? 1 : -1 } }));
      p.x = nx; p.y = ny; p.face(a); p.lunge = 1; flip(p, 0.15, 0.5, 14, this.i % 2 ? 1 : -1);
      cutBetween(ox, oy, nx, ny, { width: 4, dur: 0.45, color: this.i % 3 ? CYAN : WHITE });
      hit(p, t, roll(dmg), el, { ...o, ang: a, melee: true, cut: true, multiHit: true, hitIndex: this.i, hitCount: this.n });
      this.hits.set(t, (this.hits.get(t) || 0) + 1);
      if (this.i % 2) sfx('swing', 0.7);
    }
    if (this.i >= this.n) { // back to where he began, blade out
      w.addHazard(new AfterImage(p, { life: 0.4, a: 0.6 }));
      if (w.map.walkable(this.home[0], this.home[1])) { p.x = this.home[0]; p.y = this.home[1]; }
      p.path = null; p.moveTarget = null; this.done = this.t;
      sparkle(p.x, p.y, 34, WHITE, 10, 0.3);
    }
    return true;
  }
  draw() {}
}
function hundredCuts(p, sk, tx, ty, C) {
  const w = p.world, [x, y] = clampAt(w, p, tx, ty, 9), r = 1.6 * (sk.m.r ?? 1) * C.area;
  if (!foesAt(p, x, y, r + 0.5).length) { floatText(p.x, p.y, 60, 'No one to cut', '#c0d0e0', 12); return false; }
  addEffect(new Ring(x, y, r, r * 0.9, 0.9, CYAN, 2), 'ground');
  w.addHazard(new HundredCuts(p, x, y, r, sk.m.n || 12, C));
  return true;
}

/** A shadow of him that runs a line and cuts whatever stands on it. */
class ShadeDash {
  constructor(p, x0, y0, x1, y1, dmg, el, o, dur = 0.22, delay = 0) {
    Object.assign(this, { p, x0, y0, x1, y1, dmg, el, o, dur, t: -delay, hitSet: new Set(), flip: flipOf(x0, y0, x1, y1), a: angleTo(x0, y0, x1, y1), cut: false });
  }
  get depth() { const u = clamp(this.t / this.dur, 0, 1); return this.x0 + this.y0 + (this.x1 + this.y1 - this.x0 - this.y0) * u - 0.02; }
  update(dt) {
    this.t += dt;
    if (this.t < 0) return true;
    if (!this.cut) { this.cut = true; cutBetween(this.x0, this.y0, this.x1, this.y1, { width: 4, dur: 0.4, delay: this.dur * 0.4, color: '#b58cff' }); smoke(this.x0, this.y0, 8, '#16101a', 2, 8); }
    const u = Math.min(1, this.t / this.dur), x = this.x0 + (this.x1 - this.x0) * u, y = this.y0 + (this.y1 - this.y0) * u;
    for (const c of this.world.hostiles(this.p.team, x, y, 0.95)) {
      if (this.hitSet.has(c)) continue;
      this.hitSet.add(c);
      hit(this.p, c, roll(this.dmg), this.el, { ...this.o, ang: this.a, melee: true, cut: true });
    }
    return this.t < this.dur + 0.12 && !this.p.dead;
  }
  draw(ctx) {
    if (this.t < 0) return;
    const u = Math.min(1, this.t / this.dur), fade = this.t > this.dur ? 1 - (this.t - this.dur) / 0.12 : 1;
    for (let k = 2; k >= 0; k--) {
      const v = Math.max(0, u - k * 0.12);
      drawGhost(ctx, this.p, { x: this.x0 + (this.x1 - this.x0) * v, y: this.y0 + (this.y1 - this.y0) * v, z: 6, flip: this.flip, alpha: (0.75 - k * 0.22) * fade, lunge: 1, facing: this.a,
        acro: { t: v * this.dur, dur: this.dur, spins: 1, h: 14, dir: 1 } });
    }
  }
}
/** Umbral Legion: his shadows, each running a foe through. */
function umbralLegion(p, sk, tx, ty, C) {
  const w = p.world, { dmg, o, el } = C, [x, y] = clampAt(w, p, tx, ty, 10), foes = foesAt(p, x, y, 5 * (sk.m.r ?? 1));
  if (!foes.length) { floatText(p.x, p.y, 60, 'No one to cut', '#c0d0e0', 12); return false; }
  for (let i = 0; i < (sk.m.n || 6); i++) {
    const t = foes[i % foes.length], a = rand(TAU);
    w.addHazard(new ShadeDash(p, t.x - Math.cos(a) * 2.2, t.y - Math.sin(a) * 2.2, t.x + Math.cos(a) * 2.2, t.y + Math.sin(a) * 2.2, dmg, el, o, 0.2, i * 0.07));
  }
  sfx('shadow', 0.8); sfx('swing', 0.6);
  return true;
}
/** Thousand Shadows: they come from every side through the middle, then the dark closes on it. */
function thousandShadows(p, sk, tx, ty, C) {
  const w = p.world, { dmg, o, el, area } = C, [x, y] = clampAt(w, p, tx, ty, 10), r = 1.6 * (sk.m.r ?? 1) * area, N = G.touch ? 6 : 9;
  addEffect(new Ring(x, y, r, r * 0.8, 0.8, '#9030d0', 3), 'ground');
  const line = dmg.map((v) => v * 0.2);
  for (let i = 0; i < N; i++) {
    const a = (i / N) * TAU + 0.2;
    w.addHazard(new ShadeDash(p, x + Math.cos(a) * r, y + Math.sin(a) * r, x - Math.cos(a) * r, y - Math.sin(a) * r, line, el, { ...o, multiHit: true, hitIndex: i, hitCount: N }, 0.2, i * 0.06));
  }
  later(w, N * 0.06 + 0.3, () => {
    explode(w, p, x, y, r, dmg, el, { ...o, knock: 0.6 }, 'void');
    for (let i = 0; i < 4; i++) addEffect(new Crescent(x, y, i * 1.57, { r: r * 0.9, arc: 3, dur: 0.34, color: i % 2 ? '#b58cff' : WHITE, z: 20 }));
    camera.shake(10); sfx('shadow', 1); sfx('explode', 0.6);
  });
  sfx('shadow', 0.8);
  return true;
}

/** The hook: out, bite, and whoever it bit comes to him (or he to it). */
class Grapple {
  constructor(p, t, i, C, heavy) {
    Object.assign(this, { p, tgt: t, C, heavy, t: -i * 0.07, out: 0.16, pull: 0.24, hx: p.x, hy: p.y, sx: t.x, sy: t.y, bit: false });
    const a = angleTo(t.x, t.y, p.x, p.y), spread = (i - 2) * 0.35;
    this.dest = heavy ? [t.x + Math.cos(a) * 1, t.y + Math.sin(a) * 1] : [p.x + Math.cos(a + Math.PI + spread) * 1.05, p.y + Math.sin(a + Math.PI + spread) * 1.05];
    const M = p.world.map, from = heavy ? p : t; // what cannot be reached in a straight line stays where it is
    if (!M.walkable(this.dest[0], this.dest[1]) || !M.los(from.x, from.y, this.dest[0], this.dest[1])) this.dest = [from.x, from.y];
    this.px = p.x; this.py = p.y;
    const self = this;
    addEffect(new Rope(p, () => [self.hx, self.hy, self.hz], { dur: this.out + this.pull + i * 0.07 + 0.05, taut: () => self.bit }));
  }
  update(dt) {
    const p = this.p, t = this.tgt, w = this.world;
    this.t += dt;
    if (p.dead || t.dead) return false;
    if (this.t < 0) { this.hx = p.x; this.hy = p.y; this.hz = 30; return true; }
    if (this.t < this.out) { const u = this.t / this.out; this.hx = p.x + (t.x - p.x) * u; this.hy = p.y + (t.y - p.y) * u; this.hz = 30 - 8 * u; return true; }
    if (!this.bit) { this.bit = true; sparkle(t.x, t.y, 24, WHITE, 5, 0.2); sfx('hit', 0.6); t.status.stun = { t: t.rank === 'boss' ? 0.3 : 1.2 }; this.sx = t.x; this.sy = t.y; }
    const u = Math.min(1, (this.t - this.out) / this.pull), e = u * u * (3 - 2 * u), [dx, dy] = this.dest;
    if (this.heavy) { // too heavy: the rope takes him to it
      const nx = this.px + (dx - this.px) * e, ny = this.py + (dy - this.py) * e;
      if (w.map.walkable(nx, ny)) { p.x = nx; p.y = ny; }
      p.z = 30 * Math.sin(Math.PI * u); p.path = null; p.moveTarget = null;
    } else {
      const nx = this.sx + (dx - this.sx) * e, ny = this.sy + (dy - this.sy) * e;
      if (w.map.walkable(nx, ny)) { t.x = nx; t.y = ny; }
      t.z = 22 * Math.sin(Math.PI * u);
    }
    this.hx = t.x; this.hy = t.y; this.hz = 24 + (t.z || 0);
    if (u >= 1) {
      t.z = 0; if (this.heavy) p.z = 0;
      const { dmg, o, el } = this.C;
      hit(p, t, roll(dmg), el, { ...o, stun: false, ang: angleTo(p.x, p.y, t.x, t.y), melee: true });
      burst(t.x, t.y, 16, 'phys', 6, 2);
      return false;
    }
    return true;
  }
  draw() {}
}
function grapple(p, sk, L, tx, ty, C) {
  const w = p.world, reach = 10 * (sk.m.range ?? 1), n = hookCount(L) + (sk.m.n || 1) - 1;
  const first = w.nearestHostile(p.team, tx, ty, 2.5, false) || w.nearestHostile(p.team, p.x, p.y, reach, true);
  if (!first || dist(p.x, p.y, first.x, first.y) > reach + 1) { floatText(p.x, p.y, 60, 'Nothing to hook', '#c0d0e0', 12); sfx('error'); return false; }
  if (!w.map.los(p.x, p.y, first.x, first.y)) { floatText(p.x, p.y, 60, 'Nothing to hook', '#c0d0e0', 12); sfx('error'); return false; }
  const picks = [first, ...foesAt(p, first.x, first.y, 4).filter((c) => c !== first && dist(p.x, p.y, c.x, c.y) <= reach + 1 && w.map.los(p.x, p.y, c.x, c.y))].slice(0, n);
  picks.forEach((t, i) => w.addHazard(new Grapple(p, t, i, C, i === 0 && (t.rank === 'boss' || t.rank === 'raid' || t.static || !!t.vel))));
  p.face(angleTo(p.x, p.y, first.x, first.y)); p.lunge = 0.8;
  sfx('bow', 0.8); sfx('swing', 0.5);
  return true;
}

/** Caltrops strewn on the ground (the zone itself is the kind's Area): thrown out in arcs, they lie there glinting. */
class CaltropField {
  constructor(p, x, y, r, dur) {
    this.t = 0; this.dur = dur; this.x = x; this.y = y;
    this.c = [];
    const n = Math.round((G.touch ? 9 : 16) * r);
    for (let i = 0; i < n; i++) {
      const a = rand(TAU), d = Math.sqrt(Math.random()) * r;
      this.c.push({ x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, sx: p.x, sy: p.y, at: rand(0, 0.25), fly: rand(0.22, 0.4), seed: rand(TAU), s: rand(0.8, 1.2) });
    }
  }
  get depth() { return this.x + this.y - 2; }
  update(dt) { this.t += dt; return this.t < this.dur; }
  draw(ctx) {
    const fade = Math.min(1, (this.dur - this.t) * 2);
    ctx.save(); ctx.globalAlpha *= fade;
    for (const c of this.c) {
      const u = clamp((this.t - c.at) / c.fly, 0, 1);
      if (this.t < c.at) continue;
      const x = c.sx + (c.x - c.sx) * u, y = c.sy + (c.y - c.sy) * u, z = u < 1 ? 26 * 4 * u * (1 - u) + 24 * (1 - u) : 0;
      const px = isoX(x, y), py = isoY(x, y) - z - 3;
      if (!drawBlade3D(ctx, 'caltrop', px, py, 0, c.s, this.t, u < 1 ? { spin: 16, seed: c.seed, glow: 0 } : { still: true, seed: c.seed, glow: 0 })) { ctx.fillStyle = '#aab2c0'; ctx.fillRect(px - 1.5, py - 1.5, 3, 3); }
    }
    ctx.restore();
  }
}
/** Backflip Scatter: over backwards away from them, caltrops where he stood and shuriken into their faces. */
class Backflip {
  constructor(p, x, y) { Object.assign(this, { p, sx: p.x, sy: p.y, x, y, t: 0, dur: 0.42 }); p.channel = this; p.invuln = Math.max(p.invuln || 0, 0.45); flip(p, 0.42, 1, 0, -1); }
  update(dt) {
    const p = this.p;
    if (p.dead) { p.z = 0; return false; }
    this.t += dt;
    const u = Math.min(1, this.t / this.dur);
    p.x = this.sx + (this.x - this.sx) * u; p.y = this.sy + (this.y - this.sy) * u; p.z = 4 * 52 * u * (1 - u);
    if (u >= 1) { p.z = 0; p.channel = null; return false; }
    return true;
  }
  draw() {}
}
function backflip(p, sk, tx, ty, C) {
  const w = p.world, { dmg, o, el, area } = C, m = sk.m;
  const foe = w.nearestHostile(p.team, tx, ty, 3, false) || w.nearestHostile(p.team, p.x, p.y, 8, false);
  const toward = foe ? angleTo(p.x, p.y, foe.x, foe.y) : angleTo(p.x, p.y, tx, ty), away = toward + Math.PI;
  let d = 0;
  const far = 6.5 * (m.range ?? 1); // as far back as the floor goes: never over a wall
  while (d < far && w.map.walkable(p.x + Math.cos(away) * (d + 0.25), p.y + Math.sin(away) * (d + 0.25))) d += 0.25;
  const r = 1.8 * (m.r ?? 1) * area, ox = p.x, oy = p.y;
  w.addHazard(new Area({ world: w, src: p, x: ox, y: oy, r, dur: 5, tick: 0.5, dmg: dmg.map((v) => v * 0.3), el, fx: 'caltrop', slow: true, o: { ...o, bleed: true } }));
  w.addHazard(new CaltropField(p, ox, oy, r, 5));
  p.face(toward);
  shadowTrail(p, 0.42, { a: 0.45 });
  w.addHazard(new Backflip(p, p.x + Math.cos(away) * d, p.y + Math.sin(away) * d));
  for (let i = -2; i <= 2; i++) later(w, 0.12 + (i + 2) * 0.03, () => { // five shuriken from the top of the flip
    if (p.dead) return;
    w.addHazard(new Projectile({ world: w, src: p, x: p.x, y: p.y, ang: toward + i * 0.16, speed: 14, range: 9, fx: 'shuriken', el, dmg, o, z: 30, r: 0.3, size: 1, skin: sk.name }));
  });
  sfx('swing', 0.8);
  return true;
}

// ------------------------------------------------------------------ hits, every frame
/** Every hit the Ninja himself lands (Player.onHit): the cut shows on the foe. */
export function ninjaHit(p, tgt, dmg, el, o) {
  if (o.dot || !o.sk || !o.sk.startsWith('ninja.')) return;
  const S = ninjaOf(p);
  if (o.chucks && o.hitIndex === (o.hitCount || 1) - 1 && !tgt.dead && tgt.rank !== 'boss' && chance(0.3)) tgt.status.stun = { t: 0.8 };
  if (!(o.cut || o.melee) || S.cutT > 0 || o.aoe) return;
  S.cutT = G.touch ? 0.08 : 0.035;
  const a = o.ang ?? angleTo(p.x, p.y, tgt.x, tgt.y);
  addEffect(new CutLine(tgt.x, tgt.y, scr(0, 0, Math.cos(a), Math.sin(a)) + rand(-0.6, 0.6), { len: 54, width: 4, dur: 0.24, color: el === 'shadow' ? '#b58cff' : el === 'fire' ? '#ffb060' : CYAN }));
  if (!tgt.dead && chance(0.5)) bloodCut(tgt, a, 0.5);
}

export function ninjaUpdate(p, dt) {
  const S = ninjaOf(p), w = p.world;
  if (S.world !== w) { S.world = w; S.hist.length = 0; S.mirror = 0; S.shades = null; if (S.smoke > 0) { S.smoke = 0; p.targetable = true; p.alpha = undefined; } }
  if (S.cutT > 0) S.cutT -= dt;
  if (S.smoke > 0) { S.smoke -= dt; p.alpha = 0.35; if (S.smoke <= 0 || p.dead) { p.targetable = true; p.alpha = undefined; } }
  // where he has been (his shadows walk it)
  S.hist.push({ x: p.x, y: p.y, z: p.z, flip: p.flip, acro: p.acro ? { ...p.acro } : null, dt });
  if (S.hist.length > 90) S.hist.shift();
  if (S.mirror > 0) {
    S.mirror -= dt;
    if (!S.shades || !w.hazards.includes(S.shades)) w.addHazard(S.shades = new MirrorShades(p));
  }
}
