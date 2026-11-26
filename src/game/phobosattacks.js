// ACT III signature attacks (data/phobosattacks.js holds who gets what): applyPhobosKit(m, art) gives a Phobos monster
// its own attack, one of 28 primitives (a shape on the ground and its timing) with a rider (bleed, burn, chill, poison,
// stun, shove, drag, drain, mana sap, mire) and a form (plain, great, swift). Everything is marked on the floor before it
// lands (Mark: a filling circle, ring, lane, cone or tile in the kit's colour) and publishes danger() for auto-play.
// The monster stands and winds up while its mark fills (Monster.startAction 'pk', which perform() lets pass), then the
// mark strikes; shapes cast from the body vanish with a caster that dies first, thrown and placed ones still land.
// It hooks in by wrapping the monster's own update(): no change to monster.js. Bosses and raid bosses are left alone.
import { G } from '../state.js';
import { rand, TAU, clamp, angleTo, angleDiff, dist } from '../core/util.js';
import { isoX, isoY, HW, HH, camera } from '../core/view.js';
import { sfx } from '../core/audio.js';
import { addEffect, Ring, Slash, Bolt, burst, spawn, sparkle, floatText, smoke, glowSprite, elem } from '../gfx/vfx.js';
import { Area } from './hazards.js';
import { PHOBOS_KITS, PRIMS, FORMS } from '../data/phobosattacks.js';
import { PHOBOS_BY_ID } from '../data/phobos.js';
export { PHOBOS_KITS } from '../data/phobosattacks.js';

const POOL_FX = { fire: 'fire', cold: 'frost', poison: 'poison', shadow: 'void', arcane: 'void', light: 'storm', holy: 'holy', phys: 'poison', blood: 'blood' };
const segT = (px, py, x0, y0, ang, len) => clamp((px - x0) * Math.cos(ang) + (py - y0) * Math.sin(ang), 0, len);
const iso = (x, y) => [isoX(x, y), isoY(x, y)];

// ------------------------------------------------------------------------------------------------ the blow itself
/** One blow of a kit on c: the primitive's share of the monster's damage, then the rider. */
function strike(m, K, c, mul, o = {}) {
  const R = K.rider, opt = { ...o }, now = m.world.time || 0;
  // control (stun, shove, drag) takes at most once in a while on the same body: a ticking leash or breath that stuns
  // would lock the hero in place
  const ctl = (R === 'daze' || R === 'shove' || R === 'drag') && !((c.pkCtlT || 0) > now);
  if (ctl) c.pkCtlT = now + (R === 'daze' ? 2.5 : 1);
  if (R === 'rend') opt.bleed = true; else if (R === 'burn') opt.burn = true; else if (R === 'venom') opt.poison = true;
  else if (R === 'frost') opt.slow = true; else if (R === 'daze') opt.stun = ctl; else if (R === 'shove') opt.knock = ctl && 1.3; else if (R === 'drag') opt.pull = ctl;
  const got = m.deal(c, m.dmg * mul * K.F.dmg, K.el, opt);
  if (m.pk) { m.pk.hits++; if (c.isPlayer) m.pk.hero++; }
  if (R === 'drain' && !m.dead) { if (got > 0) m.heal(got * 0.6); sparkle(m.x, m.y, 30, '#ff4080', 8, 0.5); }
  else if (R === 'sap' && c.isPlayer && c.maxMana) { c.mana = Math.max(0, c.mana - c.maxMana * 0.06 * clamp(mul, 0.3, 1)); sparkle(c.x, c.y, 30, '#6080ff', 6, 0.4); }
  else if (R === 'mire') c.status.slow = { t: 2.4, amt: 0.55 };
  return got;
}

// ------------------------------------------------------------------------------------------------ ground marks
/**
 * A shape on the floor that fills while it is telegraphed (delay), strikes what it covers, and may stay active for
 * `life` seconds more (breath, moving tides, nets). shape: circle {r}, ring {r0, r1}, line {ang, len, w} (from x, y),
 * cone {ang, len, half}, tile {h} (a square), spokes {n, len} (only drawn). dud: draws and warns but deals nothing.
 */
class Mark {
  constructor(o) {
    Object.assign(this, { t: 0, ground: true, delay: 0.8, life: 0, shape: 'circle', r: 1, r0: 0, r1: 2, w: 0.8, len: 4, half: 0.8, h: 0.7, mul: 1, color: '#ff3020' }, o);
    this.team = this.src.team; this.fired = false;
  }
  reach() { const s = this.shape; return s === 'circle' ? this.r : s === 'ring' ? this.r1 : s === 'tile' ? this.h * 1.5 : this.len; }
  covers(c) {
    const cr = (c.r || 0.3) * 0.5, s = this.shape, d = dist(this.x, this.y, c.x, c.y);
    if (s === 'circle') return d < this.r + cr;
    if (s === 'ring') return d > this.r0 - cr && d < this.r1 + cr;
    if (s === 'tile') return Math.abs(c.x - this.x) < this.h + cr && Math.abs(c.y - this.y) < this.h + cr;
    if (s === 'cone') return d < this.len + cr && (d < 0.6 || Math.abs(angleDiff(this.ang, angleTo(this.x, this.y, c.x, c.y))) <= this.half);
    if (s === 'line') { const t = segT(c.x, c.y, this.x, this.y, this.ang, this.len); return dist(this.x + Math.cos(this.ang) * t, this.y + Math.sin(this.ang) * t, c.x, c.y) < this.w / 2 + cr; }
    return false;
  }
  danger(out) {
    if (this.dud && !this.warn) return;
    if (this.lane) { out.push(this.lane()); if (this.t >= this.delay) return; }
    const s = this.shape;
    if (s === 'circle') out.push({ x: this.x, y: this.y, r: this.r + 0.4 });
    else if (s === 'ring') out.push({ ring: true, x: this.x, y: this.y, r0: Math.max(0, this.r0 - 0.3), r1: this.r1 + 0.4, gap: 0, gapW: 0 });
    else if (s === 'tile') out.push({ x: this.x, y: this.y, r: this.h * 1.42 + 0.3 });
    else if (s === 'cone') out.push({ cone: true, x: this.x, y: this.y, ang: this.ang, half: this.half + 0.15, r: this.len + 0.5 });
    else if (s === 'line') out.push({ line: true, x: this.x, y: this.y, x1: this.x + Math.cos(this.ang) * this.len, y1: this.y + Math.sin(this.ang) * this.len, r: this.w / 2 + 0.45 });
  }
  /** Strike everything inside (once per creature per cast when the cast has a cap). */
  sweep(mul = this.mul, set = null) {
    const m = this.src, w = this.world, C = this.cast;
    const mx = this.shape === 'line' ? this.x + Math.cos(this.ang) * this.len / 2 : this.x, my = this.shape === 'line' ? this.y + Math.sin(this.ang) * this.len / 2 : this.y;
    for (const c of w.hostiles(this.team, mx, my, (this.shape === 'line' ? this.len / 2 + this.w : this.reach()) + 1)) {
      if (!this.covers(c) || (set && set.has(c))) continue;
      if (C && C.max && (C.hits.get(c) || 0) >= C.max) continue;
      if (set) set.add(c);
      if (C) C.hits.set(c, (C.hits.get(c) || 0) + 1);
      strike(m, this.K, c, mul, { ang: this.push ?? angleTo(this.x, this.y, c.x, c.y), melee: !!this.bound });
    }
  }
  fire() {
    const m = this.src, E = elem(this.K.el), col = this.color;
    this.fired = true;
    if (m.pk) m.pk.landed++;
    if (!this.dud) this.sweep();
    if (!this.quiet) {
      const s = this.shape;
      if (s === 'circle' || s === 'tile') { const r = s === 'tile' ? this.h * 1.3 : this.r; addEffect(new Ring(this.x, this.y, 0.2, r, 0.3, col, 4)); burst(this.x, this.y, 10, this.K.el, Math.round(6 + r * 5), 3); }
      else if (s === 'ring') { addEffect(new Ring(this.x, this.y, this.r0, this.r1, 0.35, col, 6)); burst(this.x, this.y, 8, this.K.el, 10, 4); }
      else if (s === 'line') { const ex = this.x + Math.cos(this.ang) * this.len, ey = this.y + Math.sin(this.ang) * this.len; addEffect(new Bolt(this.x, this.y, 18, ex, ey, 18, col, 0.22, Math.max(3, this.w * 8))); }
      else if (s === 'cone') addEffect(new Slash(this.x, this.y, this.ang, this.half * 2, this.len, 0.25, col, { width: 9 }));
      if (this.cast && !this.cast.sfx) { this.cast.sfx = true; sfx(E.sfx, 0.4); }
    }
    if (this.shake) camera.shake(this.shake);
    if (this.onLand) this.onLand(this);
  }
  update(dt) {
    const m = this.src;
    if (this.bound && (m.dead || m.world !== this.world)) return false;
    this.t += dt;
    if (this.stick) { this.x = this.stick.x; this.y = this.stick.y; }
    if (this.follow && this.t < this.followT && !this.follow.dead) { this.x = this.follow.x; this.y = this.follow.y; }
    if (!this.fired) { if (this.t >= this.delay) this.fire(); else return true; }
    if (this.t >= this.delay + this.life) return false;
    if (this.tick) this.tick(dt, this);
    return true;
  }
  path(ctx, s) {
    const sh = this.shape;
    ctx.beginPath();
    if (sh === 'circle') { const [px, py] = iso(this.x, this.y); ctx.ellipse(px, py, Math.max(0.1, this.r * s) * HW * 1.41, Math.max(0.1, this.r * s) * HH * 1.41, 0, 0, TAU); }
    else if (sh === 'ring') {
      const [px, py] = iso(this.x, this.y), ro = this.r0 + (this.r1 - this.r0) * s;
      ctx.ellipse(px, py, ro * HW * 1.41, ro * HH * 1.41, 0, 0, TAU);
      if (this.r0 > 0.05) { ctx.moveTo(px + this.r0 * HW * 1.41, py); ctx.ellipse(px, py, this.r0 * HW * 1.41, this.r0 * HH * 1.41, 0, 0, TAU, true); }
    } else if (sh === 'line') {
      const c = Math.cos(this.ang), sn = Math.sin(this.ang), L = this.len * s, hw = this.w / 2;
      const P = [[-sn * hw, c * hw], [c * L - sn * hw, sn * L + c * hw], [c * L + sn * hw, sn * L - c * hw], [sn * hw, -c * hw]].map(([dx, dy]) => iso(this.x + dx, this.y + dy));
      ctx.moveTo(...P[0]); for (let i = 1; i < 4; i++) ctx.lineTo(...P[i]); ctx.closePath();
    } else if (sh === 'cone') {
      ctx.moveTo(...iso(this.x, this.y));
      for (let i = 0; i <= 16; i++) { const a = this.ang - this.half + (i / 16) * this.half * 2; ctx.lineTo(...iso(this.x + Math.cos(a) * this.len * s, this.y + Math.sin(a) * this.len * s)); }
      ctx.closePath();
    } else if (sh === 'tile') {
      const h = this.h * s, P = [[-h, -h], [h, -h], [h, h], [-h, h]].map(([dx, dy]) => iso(this.x + dx, this.y + dy));
      ctx.moveTo(...P[0]); for (let i = 1; i < 4; i++) ctx.lineTo(...P[i]); ctx.closePath();
    } else if (sh === 'spokes') {
      for (let i = 0; i < this.n; i++) { const a = this.ang + (i / this.n) * TAU; ctx.moveTo(...iso(this.x + Math.cos(a) * 0.5, this.y + Math.sin(a) * 0.5)); ctx.lineTo(...iso(this.x + Math.cos(a) * this.len * s, this.y + Math.sin(a) * this.len * s)); }
    }
  }
  draw(ctx) {
    const k = clamp(this.t / this.delay, 0, 1), act = this.fired, col = this.color, late = !act && k > 0.75;
    ctx.save();
    if (this.lanePaint) this.lanePaint(ctx, this, k);
    if (!(act && this.hideActive)) {
      if (this.shape === 'spokes') {
        ctx.globalAlpha = 0.35 + 0.4 * k; ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.setLineDash([6, 5]); this.path(ctx, k); ctx.stroke(); ctx.setLineDash([]);
      } else {
        ctx.globalAlpha = act ? 0.3 + 0.15 * Math.sin(this.t * 30) : 0.12 + 0.3 * k; ctx.fillStyle = col;
        this.path(ctx, act ? 1 : k); ctx.fill('evenodd');
        ctx.globalAlpha = late ? 0.6 + 0.4 * Math.abs(Math.sin(this.t * 22)) : 0.7; ctx.strokeStyle = late ? '#ffffff' : col; ctx.lineWidth = late ? 2.5 : 2;
        if (this.dud && !this.warn) ctx.setLineDash([5, 4]);
        this.path(ctx, 1); ctx.stroke(); ctx.setLineDash([]);
      }
    }
    // a thing falling on the mark (dropped stones, lobbed flasks, arrows from above), its shadow growing
    if (this.lob && !act) {
      const [px, py] = iso(this.x, this.y), z = (1 - k) * 150, sz = 9 + 6 * (this.r || 1);
      ctx.globalAlpha = 0.25 + 0.4 * k; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(px, py, sz * k, sz * 0.5 * k, 0, 0, TAU); ctx.fill();
      ctx.globalAlpha = 0.9; ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(glowSprite(col), px - sz, py - z - sz, sz * 2, sz * 2); ctx.globalCompositeOperation = 'source-over';
    }
    if (this.paint) this.paint(ctx, this, k, act);
    ctx.restore();
  }
}

/** A thrown thing that runs code on what it meets (volley shards, nova motes, returning blades). */
class Shot {
  constructor(o) { Object.assign(this, { t: 0, speed: 9, range: 8, r: 0.3, z: 26, size: 1 }, o); this.team = this.src.team; this.vx = Math.cos(this.ang) * this.speed; this.vy = Math.sin(this.ang) * this.speed; this.hits = new Set(); }
  get depth() { return this.x + this.y + 0.3; }
  danger(out) { out.push({ line: true, x: this.x, y: this.y, x1: this.x + this.vx * 0.45, y1: this.y + this.vy * 0.45, r: this.r + 0.4 }); }
  update(dt) {
    const w = this.world;
    this.t += dt;
    if (this.home) {
      if (this.home.dead) return false;
      const a = angleTo(this.x, this.y, this.home.x, this.home.y); this.vx = Math.cos(a) * this.speed; this.vy = Math.sin(a) * this.speed;
      if (dist(this.x, this.y, this.home.x, this.home.y) < 0.45) return false;
    }
    const nx = this.x + this.vx * dt, ny = this.y + this.vy * dt;
    if (!this.home && !w.map.isFloor(nx, ny)) { this.onEnd && this.onEnd(this); return false; }
    this.x = nx; this.y = ny;
    for (const c of w.hostiles(this.team, this.x, this.y, this.r + 0.3)) {
      if (this.hits.has(c) || dist(c.x, c.y, this.x, this.y) > this.r + (c.r || 0.3)) continue;
      this.hits.add(c);
      if (this.onHit) this.onHit(c, this);
      if (!this.pierce) return false;
    }
    if (Math.random() < dt * 30) spawn({ type: 'glow', x: this.x, y: this.y, z: this.z, vz: 0, life: 0.25, size: 3 * this.size, size1: 0, color: this.color, add: true });
    if (!this.home && this.t * this.speed > this.range) { this.onEnd && this.onEnd(this); return false; }
    return this.t < 6;
  }
  draw(ctx) {
    const px = isoX(this.x, this.y), py = isoY(this.x, this.y) - this.z;
    ctx.save(); ctx.translate(px, py);
    if (this.blade) { ctx.rotate(this.t * 18); ctx.fillStyle = '#e8eef4'; ctx.fillRect(-9, -2, 18, 4); ctx.fillRect(-2, -9, 4, 18); ctx.globalCompositeOperation = 'lighter'; }
    else ctx.globalCompositeOperation = 'lighter';
    const s = 10 * this.size; ctx.drawImage(glowSprite(this.color), -s, -s, s * 2, s * 2);
    ctx.restore();
  }
}

// ------------------------------------------------------------------------------------------------ the 28 primitives
// go(c) lays the marks for one cast and returns how long the monster stands winding up. c: { m, t, K, F, w, map, ang,
// d, S (size), tw(sec) (a telegraph time for this form, never under half a second), mk(o) (a Mark), cast }.
// max: the farthest it is used from (times the form's size when `sz`); min: the nearest.
const cosA = Math.cos, sinA = Math.sin;
const shotHit = (c, mul) => (x) => { const C = c.cast; if (C.max && (C.hits.get(x) || 0) >= C.max) return; C.hits.set(x, (C.hits.get(x) || 0) + 1); strike(c.m, c.K, x, mul); };
const ahead = (c, len) => c.map.rayLength(c.m.x, c.m.y, c.ang, len);
const CAST = {
  thrust: { max: 4.6, sz: true, go(c) { const L = ahead(c, 4.6 * c.S), dl = c.tw(0.7); c.mk({ shape: 'line', x: c.m.x, y: c.m.y, ang: c.ang, len: L, w: 0.8, delay: dl, mul: 1.5, bound: true }); return dl; } },
  cleave: { max: 2.8, sz: true, go(c) { const dl = c.tw(0.6); c.mk({ shape: 'cone', x: c.m.x, y: c.m.y, ang: c.ang, len: 2.6 * c.S, half: 1.0, delay: dl, mul: 1.45, bound: true }); return dl; } },
  sweep: { max: 2.6, sz: true, go(c) {   // the same wide arc twice: step out after the first
    const dl = c.tw(0.6);
    for (let i = 0; i < 2; i++) c.mk({ shape: 'cone', x: c.m.x, y: c.m.y, ang: c.ang, len: 2.4 * c.S, half: 1.3, delay: dl + i * 0.5, mul: 0.8, bound: true });
    return dl + 0.5;
  } },
  slam: { max: 2, sz: true, go(c) { const dl = c.tw(0.75); c.mk({ shape: 'circle', x: c.m.x, y: c.m.y, r: 2 * c.S, delay: dl, mul: 1.6, bound: true, shake: 4 }); return dl; } },
  shockwave: { max: 3.4, sz: true, go(c) { const dl = c.tw(0.85); c.mk({ shape: 'ring', x: c.m.x, y: c.m.y, r0: 1.1, r1: 3.4 * c.S, delay: dl, mul: 1.35, bound: true, shake: 3 }); return dl; } },
  toll: { max: 3.9, sz: true, go(c) {   // three rings, inside out: the eye is safe once the first has rung
    const dl = c.tw(0.7), R = 1.3 * c.S;
    for (let i = 0; i < 3; i++) c.mk({ shape: 'ring', x: c.m.x, y: c.m.y, r0: i * R, r1: (i + 1) * R, delay: dl + i * 0.35, mul: 0.7, bound: true });
    return dl + 0.7;
  } },
  pounce: { min: 1.8, max: 6, go(c) {
    const { m, t, map } = c;
    if (!map.leapOk(m.x, m.y, t.x, t.y, 0.35)) return false;
    const dl = c.tw(0.75);
    c.mk({ shape: 'circle', x: t.x, y: t.y, r: 1.2 * c.S, delay: dl, mul: 1.5, bound: true, onLand: (M) => {
      smoke(m.x, m.y, 4, '#5a4a3a', 5, 10);
      if (map.circleFree(M.x, M.y, 0.3)) { m.x = M.x; m.y = M.y; m.nav = null; m.path = null; }
      smoke(m.x, m.y, 4, '#5a4a3a', 6, 12); sfx('thud', 0.5);
    } });
    return dl;
  } },
  charge: { min: 2, max: 7, go(c) {
    const { m, map } = c, L = Math.min(ahead(c, 7.5 * c.S), c.d + 2), dl = c.tw(0.65);
    if (L < 1.5) return false;
    c.mk({ shape: 'line', x: m.x, y: m.y, ang: c.ang, len: L, w: 1.0, delay: dl, mul: 1.4, bound: true, push: c.ang, onLand: (M) => {
      for (let s = 0; s < M.len - 0.4; s += 0.25) { if (!map.move(m, cosA(M.ang) * 0.25, sinA(M.ang) * 0.25, m.ghost)) break; spawn({ type: 'glow', x: m.x, y: m.y, z: 20, life: 0.3, size: 6, size1: 0, color: M.color, add: true }); }
      m.nav = null; m.path = null; sfx('roar', 0.4);
    } });
    return dl;
  } },
  hook: { min: 2.2, max: 6.5, go(c) {
    const { m } = c, L = Math.min(ahead(c, 6.5), c.d + 0.6), dl = c.tw(0.6);
    c.mk({ shape: 'line', x: m.x, y: m.y, ang: c.ang, len: L, w: 0.6, delay: dl, mul: 0.9, bound: true, onLand: (M) => {
      for (const x of M.world.hostiles(M.team, m.x, m.y, L + 1)) if (M.covers(x) && !x.static && x.rank !== 'boss') { const a = angleTo(x.x, x.y, m.x, m.y); x.kbx += cosA(a) * 10; x.kby += sinA(a) * 10; }
      addEffect(new Bolt(m.x, m.y, 24, m.x + cosA(M.ang) * L, m.y + sinA(M.ang) * L, 20, '#c0a070', 0.3, 3)); sfx('swing', 0.6);
    } });
    return dl;
  } },
  snare: { max: 7.5, go(c) {
    const { t } = c, dl = c.tw(0.85), r = 1.15 * c.S;
    c.mk({ shape: 'circle', x: t.x, y: t.y, r, delay: dl, mul: 0.8, onLand: (M) => {
      for (const x of M.world.hostiles(M.team, M.x, M.y, r + 1)) if (M.covers(x)) { x.status.slow = { t: 1.6, amt: 0.85 }; floatText(x.x, x.y, 70, 'SNARED', M.color, 12); }
      c.mk({ shape: 'circle', x: M.x, y: M.y, r, delay: 0.01, life: 1.6, dud: true, quiet: true, hideActive: true, paint: paintNet });
    } });
    return Math.min(dl, 0.7);
  } },
  barrage: { min: 1.5, max: 8.5, go(c) {   // a walking line of falls, from short of the target to past it
    const { m, t } = c, n = 4 + (c.K.seed % 3), dl = c.tw(0.7);
    c.cast.max = 2;
    for (let i = 0; i < n; i++) {
      const k = 0.45 + (i / (n - 1)) * 0.85, x = m.x + (t.x - m.x) * k, y = m.y + (t.y - m.y) * k;
      if (c.map.isFloor(x, y)) c.mk({ shape: 'circle', x, y, r: 0.85 * c.S, delay: dl + i * 0.2, mul: 0.55, lob: true });
    }
    return dl;
  } },
  cross: { max: 8.5, go(c) {
    const { t } = c, dl = c.tw(0.9), L = 6 * c.S, a0 = c.ang + (c.K.seed % 2 ? Math.PI / 4 : 0);
    c.cast.max = 1;
    for (const a of [a0, a0 + Math.PI / 2]) c.mk({ shape: 'line', x: t.x - cosA(a) * L / 2, y: t.y - sinA(a) * L / 2, ang: a, len: L, w: 0.8, delay: dl, mul: 1.15 });
    return Math.min(dl, 0.8);
  } },
  lattice: { max: 8.5, go(c) {   // a checkerboard round the target, in two waves
    const { t } = c, dl = c.tw(0.8), sp = 1.4 * c.S, h = 0.66 * c.S;
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
      const x = t.x + i * sp, y = t.y + j * sp;
      if (c.map.isFloor(x, y)) c.mk({ shape: 'tile', x, y, h, delay: dl + ((i + j) & 1) * 0.6, mul: 0.9 });
    }
    return Math.min(dl, 0.8);
  } },
  encircle: { max: 8.5, go(c) { const dl = c.tw(1.0); c.mk({ shape: 'ring', x: c.t.x, y: c.t.y, r0: 1.25, r1: 2.9 * c.S, delay: dl, mul: 1.35 }); return Math.min(dl, 0.8); } },
  pool: { min: 1.5, max: 8.5, go(c) {
    const { m, t } = c, dl = c.tw(0.9), r = 1.3 * c.S, el = c.K.el;
    c.mk({ shape: 'circle', x: t.x, y: t.y, r, delay: dl, mul: 0.8, lob: true, onLand: (M) => M.world.addHazard(new Area({ world: M.world, src: m, x: M.x, y: M.y, r: r * 0.9, dur: 4, tick: 0.5, dmg: [m.dmg * 0.12, m.dmg * 0.16], el, fx: POOL_FX[el] || 'poison' })) });
    return Math.min(dl, 0.7);
  } },
  scatter: { max: 8, go(c) {
    const { t } = c, n = 4 + (c.K.seed % 3), dl = c.tw(0.9);
    c.cast.max = 2;
    for (let i = 0; i < n; i++) {
      const a = rand(TAU), r = i ? rand(1, 2.6) : 0, x = t.x + cosA(a) * r, y = t.y + sinA(a) * r;
      if (c.map.isFloor(x, y)) c.mk({ shape: 'circle', x, y, r: 0.9 * c.S, delay: dl + rand(0.5), mul: 0.6, lob: true });
    }
    return Math.min(dl, 0.7);
  } },
  breath: { max: 3.8, sz: true, go(c) {   // a cone that keeps burning while it is held
    const { m } = c, dl = c.tw(0.6);
    c.mk({ shape: 'cone', x: m.x, y: m.y, ang: c.ang, len: 3.8 * c.S, half: 0.5, delay: dl, life: 1.2, dud: true, warn: true, quiet: true, bound: true, stick: m,
      onLand: () => sfx(elem(c.K.el).sfx, 0.5),
      tick: (dt, M) => {
        if ((M.tk = (M.tk ?? 0) - dt) <= 0) { M.tk = 0.3; M.sweep(0.32); }
        if (Math.random() < dt * 40) { const a = M.ang + rand(-M.half, M.half), r = rand(0.5, M.len); spawn({ type: 'glow', x: M.x + cosA(a) * r, y: M.y + sinA(a) * r, z: rand(8, 30), vz: 20, life: 0.4, size: 6, size1: 0, color: M.color, add: true }); }
      } });
    return dl + 1.2;
  } },
  fan: { min: 1.5, max: 8.5, go(c) {
    const { m } = c, n = 3 + 2 * (c.K.seed % 3), dl = c.tw(0.6), spread = 0.22;
    c.cast.max = 2;
    for (let i = 0; i < n; i++) {
      const a = c.ang + (i - (n - 1) / 2) * spread, L = c.map.rayLength(m.x, m.y, a, 8);
      c.mk({ shape: 'line', x: m.x, y: m.y, ang: a, len: L, w: 0.3, delay: dl, dud: true, quiet: true, bound: true, onLand: (M) => M.world.addHazard(new Shot({ world: M.world, src: m, x: m.x, y: m.y, ang: M.ang, speed: 11, range: L, color: M.color, onHit: shotHit(c, 0.7) })) });
    }
    sfx('bow', 0.3);
    return dl;
  } },
  nova: { max: 6, go(c) {
    const { m } = c, n = 8 + (c.K.seed % 5), dl = c.tw(0.65), a0 = rand(TAU);
    c.cast.max = 2;
    c.mk({ shape: 'spokes', x: m.x, y: m.y, ang: a0, n, len: 6, delay: dl, dud: true, bound: true, onLand: (M) => { for (let i = 0; i < n; i++) M.world.addHazard(new Shot({ world: M.world, src: m, x: m.x, y: m.y, ang: a0 + (i / n) * TAU, speed: 6, range: 6.5, color: M.color, size: 1.2, onHit: shotHit(c, 0.55) })); } });
    c.mk({ shape: 'circle', x: m.x, y: m.y, r: 1.0, delay: dl, dud: true, quiet: true, bound: true });
    return dl;
  } },
  spikes: { max: 7.5, go(c) {   // spikes burst up one after another along the ground, out past the target
    const { m } = c, dl = c.tw(0.5), L = Math.min(ahead(c, c.d + 2.5), 9);
    c.cast.max = 1;
    for (let s = 1, i = 0; s <= L; s += 0.9, i++) { const x = m.x + cosA(c.ang) * s, y = m.y + sinA(c.ang) * s; c.mk({ shape: 'circle', x, y, r: 0.75 * c.S, delay: dl + i * 0.11, mul: 0.85, life: 0.4, paint: paintSpike }); }
    return dl;
  } },
  drop: { max: 8.5, go(c) { const dl = c.tw(1.35); c.mk({ shape: 'circle', x: c.t.x, y: c.t.y, r: 1.8 * c.S, delay: dl, mul: 2.0, lob: true, shake: 5 }); return Math.min(dl, 0.8); } },
  blink: { min: 1.5, max: 8.5, go(c) {   // fades, and comes out of the dark just behind the target
    const { m, t, map } = c, x = t.x + cosA(c.ang) * 0.9, y = t.y + sinA(c.ang) * 0.9;
    if (!map.circleFree(x, y, 0.35)) return false;
    const dl = c.tw(0.75);
    m.alpha = 0.3; sparkle(m.x, m.y, 30, c.K.color, 16, 0.5);
    c.mk({ shape: 'circle', x, y, r: 1.3 * c.S, delay: dl, mul: 1.4, bound: true, onLand: () => { m.x = x; m.y = y; m.nav = null; m.path = null; m.alpha = undefined; m.face(angleTo(x, y, t.x, t.y)); sparkle(x, y, 30, c.K.color, 16, 0.5); } });
    return dl;
  } },
  tether: { max: 4.8, go(c) {
    const { m, t } = c, dl = c.tw(0.6), R = 5;
    c.mk({ shape: 'circle', x: m.x, y: m.y, r: R, delay: dl, dud: true, quiet: true, bound: true, stick: m, onLand: () => {
      if (t.dead || dist(m.x, m.y, t.x, t.y) > R) return;
      m.world.addHazard({ t: 0, tk: 0.25, ground: true, x: m.x, y: m.y, team: m.team, world: m.world,
        danger(out) { out.push({ x: m.x, y: m.y, r: R + 0.3 }); },
        update(dt) {
          this.t += dt; this.x = m.x; this.y = m.y;
          if (m.dead || t.dead || this.t > 3) return false;
          if (dist(m.x, m.y, t.x, t.y) > R + 0.3) { floatText(t.x, t.y, 70, 'SNAPPED', '#a0ffa0', 12); return false; }
          if ((this.tk -= dt) <= 0) { this.tk = 0.5; strike(m, c.K, t, 0.28, { crit: false }); }
          return true;
        },
        draw(ctx) {
          const [ax, ay] = iso(m.x, m.y), [bx, by] = iso(t.x, t.y);
          ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.55 + Math.sin(this.t * 14) * 0.25; ctx.strokeStyle = c.K.color; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.moveTo(ax, ay - 24); ctx.quadraticCurveTo((ax + bx) / 2, (ay + by) / 2 - 10 + Math.sin(this.t * 6) * 8, bx, by - 24); ctx.stroke(); ctx.restore();
        } });
    } });
    return dl;
  } },
  brand: { max: 9.5, go(c) {   // a seal that follows the target, then sets: step off it
    const ft = c.tw(1.1), dl = ft + 0.6;
    c.mk({ shape: 'circle', x: c.t.x, y: c.t.y, r: 1.3 * c.S, delay: dl, mul: 1.6, follow: c.t, followT: ft, paint: paintSigil });
    return 0.5;
  } },
  wave: { max: 7.5, go(c) {   // a wall of water (or ash, or bone) that rolls down a lane
    const { m } = c, dl = c.tw(0.7), half = 2.5 * c.S, travel = Math.min(ahead(c, 8), c.d + 2.5), sp = 6, dir = c.ang, pa = dir + Math.PI / 2;
    const sx = m.x + cosA(dir) * 0.8, sy = m.y + sinA(dir) * 0.8, ex = sx + cosA(dir) * travel, ey = sy + sinA(dir) * travel, seen = new Set();
    c.mk({ shape: 'line', x: sx - cosA(pa) * half, y: sy - sinA(pa) * half, ang: pa, len: half * 2, w: 0.9, delay: dl, life: travel / sp, dud: true, warn: true, quiet: true, push: dir,
      lane: () => ({ line: true, x: sx, y: sy, x1: ex, y1: ey, r: half + 0.4 }),
      lanePaint: (ctx, M) => { if (M.fired) return; ctx.globalAlpha = 0.1; ctx.fillStyle = M.color; const P = [[-half, 0], [-half, travel], [half, travel], [half, 0]].map(([u, v]) => iso(sx + cosA(pa) * u + cosA(dir) * v, sy + sinA(pa) * u + sinA(dir) * v)); ctx.beginPath(); ctx.moveTo(...P[0]); for (const q of P.slice(1)) ctx.lineTo(...q); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 0.4; ctx.strokeStyle = M.color; ctx.setLineDash([6, 6]); ctx.stroke(); ctx.setLineDash([]); },
      onLand: () => sfx(elem(c.K.el).sfx, 0.5),
      tick: (dt, M) => { M.x += cosA(dir) * sp * dt; M.y += sinA(dir) * sp * dt; M.sweep(1.1, seen); if (Math.random() < dt * 30) { const u = rand(-half, half); spawn({ type: 'glow', x: M.x + cosA(pa) * (u + half), y: M.y + sinA(pa) * (u + half), z: rand(4, 26), vz: 30, life: 0.4, size: 7, size1: 0, color: M.color, add: true }); } } });
    return dl;
  } },
  vortex: { max: 3.4, sz: true, go(c) {   // a pull toward the maw, then the bite
    const { m } = c, pull = c.tw(1.0), R = 3.6 * c.S;
    c.mk({ shape: 'circle', x: m.x, y: m.y, r: R, delay: 0.45, life: pull, dud: true, warn: true, quiet: true, bound: true, stick: m,
      tick: (dt, M) => { for (const x of M.world.hostiles(M.team, m.x, m.y, R)) if (!x.static && x.rank !== 'boss' && dist(x.x, x.y, m.x, m.y) > 0.8) { const a = angleTo(x.x, x.y, m.x, m.y); M.world.map.move(x, cosA(a) * 1.9 * dt, sinA(a) * 1.9 * dt); }
        if (Math.random() < dt * 30) { const a = rand(TAU); spawn({ type: 'glow', x: m.x + cosA(a) * R, y: m.y + sinA(a) * R, z: 10, vx: -cosA(a) * R * 1.5, vy: -sinA(a) * R * 1.5, life: 0.6, size: 4, size1: 0, color: M.color, add: true }); } } });
    c.mk({ shape: 'circle', x: m.x, y: m.y, r: 1.4 * c.S, delay: 0.45 + pull, mul: 1.6, bound: true, stick: m });
    return 0.45 + pull;
  } },
  boomerang: { min: 1.2, max: 6.5, go(c) {
    const { m } = c, L = ahead(c, 6.5 * c.S), dl = c.tw(0.55);
    if (L < 1.5) return false;
    c.mk({ shape: 'line', x: m.x, y: m.y, ang: c.ang, len: L, w: 0.6, delay: dl, dud: true, warn: true, quiet: true, bound: true, onLand: (M) => {
      sfx('swing', 0.6);
      M.world.addHazard(new Shot({ world: M.world, src: m, x: m.x, y: m.y, ang: M.ang, speed: 10, range: L, pierce: true, blade: true, color: M.color, onHit: (x) => strike(m, c.K, x, 0.8),
        onEnd: (s) => M.world.addHazard(new Shot({ world: M.world, src: m, x: s.x, y: s.y, ang: M.ang + Math.PI, speed: 10, home: m, pierce: true, blade: true, color: M.color, onHit: (x) => strike(m, c.K, x, 0.8) })) }));
    } });
    return dl;
  } },
  orbit: { max: 3, sz: true, go(c) {   // motes that wheel round the body for a few seconds
    const { m } = c, dl = c.tw(0.6), n = c.F.id === 'great' ? 4 : 3, rr = 1.7 * c.S;
    c.mk({ shape: 'ring', x: m.x, y: m.y, r0: rr - 0.6, r1: rr + 0.6, delay: dl, dud: true, warn: true, quiet: true, bound: true, stick: m, onLand: () => {
      const cdT = new Map();
      m.world.addHazard({ t: 0, x: m.x, y: m.y, team: m.team, world: m.world, a0: rand(TAU),
        get depth() { return m.x + m.y + 0.5; },
        danger(out) { out.push({ ring: true, x: m.x, y: m.y, r0: rr - 0.7, r1: rr + 0.7, gap: 0, gapW: 0 }); },
        update(dt) {
          this.t += dt; this.x = m.x; this.y = m.y;
          if (m.dead || this.t > 4) return false;
          for (let i = 0; i < n; i++) {
            const a = this.a0 + this.t * 2.4 + (i / n) * TAU, x = m.x + cosA(a) * rr, y = m.y + sinA(a) * rr;
            for (const h of m.world.hostiles(m.team, x, y, 0.8)) if (dist(h.x, h.y, x, y) < 0.45 + (h.r || 0.3) && (cdT.get(h) || 0) <= this.t) { cdT.set(h, this.t + 0.6); strike(m, c.K, h, 0.4); }
          }
          return true;
        },
        draw(ctx) {
          ctx.save(); ctx.globalCompositeOperation = 'lighter';
          for (let i = 0; i < n; i++) { const a = this.a0 + this.t * 2.4 + (i / n) * TAU, [px, py] = iso(m.x + cosA(a) * rr, m.y + sinA(a) * rr); ctx.drawImage(glowSprite(c.K.color), px - 12, py - 34, 24, 24); }
          ctx.restore();
        } });
    } });
    return dl;
  } },
};

// ------------------------------------------------------------------------------------------------ painted extras
function paintNet(ctx, M) {
  const [px, py] = iso(M.x, M.y), rx = M.r * HW * 1.41, ry = M.r * HH * 1.41, f = clamp((M.delay + M.life - M.t) / 0.4, 0, 1);
  ctx.globalAlpha = 0.75 * f; ctx.strokeStyle = '#e8e0d0'; ctx.lineWidth = 1;
  for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + Math.cos(a) * rx, py + Math.sin(a) * ry); ctx.stroke(); }
  for (const k of [0.35, 0.7, 1]) { ctx.beginPath(); ctx.ellipse(px, py, rx * k, ry * k, 0, 0, TAU); ctx.stroke(); }
}
function paintSigil(ctx, M, k, act) {
  if (act) return;
  const [px, py] = iso(M.x, M.y), rx = M.r * HW * 1.1, ry = M.r * HH * 1.1, a0 = M.t * (M.t < M.followT ? 2 : 0.4);
  ctx.globalAlpha = 0.5 + 0.4 * k; ctx.strokeStyle = M.color; ctx.lineWidth = 1.5; ctx.beginPath();
  for (let i = 0; i <= 5; i++) { const a = a0 + (i * 2 / 5) * TAU; i ? ctx.lineTo(px + Math.cos(a) * rx, py + Math.sin(a) * ry) : ctx.moveTo(px + Math.cos(a) * rx, py + Math.sin(a) * ry); }
  ctx.stroke();
}
function paintSpike(ctx, M, k, act) {
  if (!act) return;
  const [px, py] = iso(M.x, M.y), f = clamp(1 - (M.t - M.delay) / 0.4, 0, 1);
  if (f <= 0) return;
  ctx.globalAlpha = f; ctx.fillStyle = '#e8dcc0';
  for (const [dx, h] of [[-6, 22], [0, 32], [6, 18]]) { ctx.beginPath(); ctx.moveTo(px + dx - 3, py); ctx.lineTo(px + dx, py - h); ctx.lineTo(px + dx + 3, py); ctx.closePath(); ctx.fill(); }
}
for (const k of Object.keys(PRIMS)) if (!CAST[k]) throw new Error('phobosattacks: no primitive ' + k);
for (const k of Object.keys(CAST)) if (!PRIMS[k]) throw new Error('phobosattacks: no data for ' + k);

// ------------------------------------------------------------------------------------------------ wiring
/** The farthest this monster's kit is used from. */
const maxOf = (K) => { const P = CAST[K.prim]; return P.max * (P.sz ? K.F.size : 1); };

/** Cast m's signature at t now (test hook; `force` skips the range and sight checks). True if it began. */
export function castPhobosKit(m, t = m.target, force = false) {
  const s = m.pk; if (!s || !t || t.dead || m.dead) return false;
  const K = s.K, P = CAST[K.prim], w = m.world, map = w.map, d = dist(m.x, m.y, t.x, t.y);
  if (!force && (d > maxOf(K) || d < (P.min || 0) || !map.los(m.x, m.y, t.x, t.y))) return false;
  const cast = { hits: new Map(), max: 0 };
  const c = { m, t, K, F: K.F, w, map, d, ang: angleTo(m.x, m.y, t.x, t.y), S: K.F.size, cast,
    tw: (sec) => Math.max(0.5, sec * K.F.wind),
    mk: (o) => w.addHazard(new Mark({ world: w, src: m, K, cast, color: K.color, ...o })) };
  const wind = P.go(c);
  if (wind === false) return false;
  m.face(c.ang);
  m.startAction('pk', Math.max(0.35, wind), { target: t });   // (perform() has no 'pk': the monster just stands and winds up)
  s.cd = PRIMS[K.prim].cd * K.F.cd * (m.rank === 'normal' ? 1 : 0.8) * rand(0.9, 1.15);
  s.casts++; s.lastT = w.time || 0;
  floatText(m.x, m.y, (m.artH || 44) * (m.scale || 1) + 14, K.name, K.color, 12, { life: 1.3, vz: 16 });
  sfx('swing', 0.35);
  return true;
}

/** A quick hop toward or away from t, to the distance `want` (at most 2.5 tiles): a pouncer too close springs back, a
 * cleaver standing off (a caster's AI keeps its distance) steps in. */
function hop(m, t, want) {
  const map = m.world.map, d = dist(m.x, m.y, t.x, t.y), a = angleTo(t.x, t.y, m.x, m.y), go = clamp(want - d, -2.5, 2.5), n = Math.ceil(Math.abs(go) / 0.2), st = go / Math.max(1, n);
  smoke(m.x, m.y, 4, '#5a4a3a', 4, 8);
  for (let i = 0; i < n; i++) { if (!map.move(m, Math.cos(a) * st, Math.sin(a) * st, m.ghost)) break; if (i % 2) spawn({ type: 'glow', x: m.x, y: m.y, z: 16, life: 0.25, size: 5, size1: 0, color: m.pk.K.color, add: true }); }
  m.nav = null; m.path = null;
}

function pkTick(m, dt) {
  const s = m.pk;
  if ((s.cd -= dt) > 0 || G.cine || m.team !== 'enemy' || !m.awake || m.entering) return;
  if (m.state === 'windup' || m.state === 'act' || m.disabled() || (m.status.fear && m.status.fear.t > 0) || m.targetable === false) return;
  const t = m.target;
  if (!t || t.dead || t.world !== m.world) { s.cd = 0.4; return; }
  if (castPhobosKit(m, t)) return;
  s.cd = 0.3;
  // out of its window: hop into it (a far one waits for the monster's own AI to bring it in)
  const K = s.K, P = CAST[K.prim], d = dist(m.x, m.y, t.x, t.y), mx = maxOf(K), band = PRIMS[K.prim].band;
  if (m.static || !m.world.map.los(m.x, m.y, t.x, t.y)) return;
  if (P.min && d < P.min) hop(m, t, P.min + 0.6);
  else if (band !== 'far' && d > mx && d < mx + 2.5) hop(m, t, mx * 0.75);
  else return;
  castPhobosKit(m, t);
}

/**
 * Give monster m (made from Phobos art `art`: the entry or its id; default m.art) its signature attack. Bosses
 * (boss art, guardian rank, raid AI) and minions are left alone. Safe to call twice. Returns m.
 */
export function applyPhobosKit(m, art) {
  if (!m || m.pk) return m;
  const a = typeof art === 'string' ? PHOBOS_BY_ID[art] : art || PHOBOS_BY_ID[m.art];
  if (!a || a.boss || m.rank === 'boss' || m.ai === 'boss' || m.ai === 'raid' || m.raid || m.summon) return m;
  const K0 = PHOBOS_KITS[a.id];
  if (!K0) return m;
  m.pk = { K: { ...K0, F: FORMS.find((f) => f.id === K0.form) }, cd: rand(1.2, 2.8), casts: 0, landed: 0, hits: 0, hero: 0 };
  m.kitName = K0.name;
  const up = m.update;
  m.update = function (dt) { if (!this.dead && this.pk) pkTick(this, dt); return up.call(this, dt); };
  return m;
}
