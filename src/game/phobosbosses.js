// Act III's free-standing bosses (City State Phobos' ward lords, Castle Velscour's captains, wing lords and 5th-floor
// guardians) fight on WoW-style scripts from docs/RAID_MECHANICS.md, with no sealed arena: applyBossMechanics(m, art,
// tier) gives a plain `makeMonster(..., 'boss')` a timeline loop of two or three catalogue mechanics, an energy bar whose
// 100 fires a big one (shield, platform break, carried item...), and health stages ('guardian' 3, 'lord' 2, 'ward' 1-2)
// that each add a mechanic. Every mechanic has a cast bar over the boss, ground telegraphs that fill from the rim inward,
// damage as a share of the hero's life (capped by the boss's own hits), and publishes danger()/autoGoal() for auto-play.
// The same mechanics (MECHS) run inside the raid framework too: runMech(R, id, name) (game/phobosraids.js).
//   colours: red = dodge out, gold = stand in, violet = lethal, green = pools, white = forced movement
import { G } from '../state.js';
import { rand, chance, TAU, clamp, angleTo, angleDiff, dist, pick } from '../core/util.js';
import { isoX, isoY, HW, HH } from '../core/view.js';
import { sfx } from '../core/audio.js';
import { addEffect, Ring, Bolt, Column, burst, floatText, addLight, elem, sparkle } from '../gfx/vfx.js';
import { explosionFx } from '../gfx/shapes.js';
import { hit } from './combat.js';
import { UI } from '../ui/ui.js';
import { zone, add, hero } from './raidsigs.js';

const RED = '#ff3a20', GOLD = '#ffd040', VIOLET = '#b040ff', GREEN = '#70ff50', WHITE = '#f0f4ff', CYAN = '#60d0ff';
const DMG_CAP = 9;   // a mechanic's hit is at most this many of the boss's own blows for the same share of life
const TIER_K = { ward: 0.75, lord: 0.9, guardian: 1, raid: 1 };
const fxEl = (el) => (el === 'phys' || el === 'blood' ? 'fire' : el);
const segDist = (px, py, x0, y0, x1, y1) => { const dx = x1 - x0, dy = y1 - y0, L = dx * dx + dy * dy || 1, t = clamp(((px - x0) * dx + (py - y0) * dy) / L, 0, 1); return Math.hypot(px - x0 - dx * t, py - y0 - dy * t); };

// =============================================================================================== the fight context
/** What the mechanics need of a boss, free-standing (no arena) or a raid boss (R: game/raid.js). */
function makeCtx(m, o) {
  const el = o.el || m.el || 'phys';
  const C = {
    m, el, E: elem(fxEl(el)), tier: o.tier, k: TIER_K[o.tier] || 1, fails: {}, timers: {}, pools: [], raid: o.raid || null, frozen: 0, shield: 0, shieldMax: 0,
    get w() { return m.world; }, get p() { return m.world && m.world.player; },
    get pi() { return this.raid ? this.raid.pi : this.stage || 0; },
    alive() { return !m.dead && m.hp > 0 && !!m.world && m.world === G.world; },
    pets() { const w = m.world; return w ? w.creatures.filter((c) => c.team === 'player' && !c.dead && !c.isPlayer && dist(c.x, c.y, m.x, m.y) < 22) : []; },
    /** a share f of the hero's life, never more than DMG_CAP of the boss's blows for it */
    pain(f) { const p = this.p; return p ? Math.min(p.maxHp * f, m.dmg * f * DMG_CAP) * this.k : 0; },
    hurt(c, f, h = {}) {
      if (!c || c.dead) return;
      const amt = c.isPlayer ? this.pain(f) : c.maxHp * f * 0.8;
      hit(m, c, amt, h.el || el, { force: true, crit: false, knock: h.knock || 0, ang: h.ang ?? angleTo(m.x, m.y, c.x, c.y), dot: !!h.dot });
      if (h.stun && !c.dead) c.status.stun = { t: c.isPlayer ? h.stun : h.stun * 1.5 };
    },
    fail(id) { return (this.fails[id] = (this.fails[id] || 0) + 1) - 1; },   // the first mistake is survivable, the next is not
    /** a vulnerable window after a survival test (M40): the boss takes +50% */
    burn(t = 8, mul = 1.5) { if (this.raid && this.raid.inter) return; this.timers.burn = t; m.ward = mul; floatText(m.x, m.y, (m.artH || 60) * (m.scale || 1) + 26, 'EXPOSED', '#ffb040', 17, { life: 1.6 }); addEffect(new Ring(m.x, m.y, 0.3, 3.5, 0.7, '#ffb040', 5)); },
    vuln(t, mul) { const p = this.p; if (!p) return; this.timers.vuln = t; p.raidTakenMul = mul; },
    weaken(t, mul) { const p = this.p; if (!p) return; this.timers.weak = t; p.raidDmgMul = mul; },
    empower(t = 20, mul = 1.1) { if ((this.emp = (this.emp || 0)) >= 3) return; this.emp++; m.dmg *= mul; (this.empT ||= []).push([t, mul]); floatText(m.x, m.y, (m.artH || 60) * (m.scale || 1) + 18, `EMPOWERED x${this.emp}`, '#ff8040', 14); },
    freeze(on) {
      if (on === !!this.frozen) return;
      this.frozen = on ? 1 : 0;
      if (this.raid) { if (on) m.speed *= 0.02; else m.speed /= 0.02; }
      if (on) { m.moving = false; m.nav = null; }
    },
    dps() { return this.raid ? m.maxHp / 110 : this.dpsEst || 0; },
    tick(dt) {
      const T = this.timers, p = this.p;
      if (T.burn > 0 && (T.burn -= dt) <= 0 && !(this.raid && this.raid.inter)) m.ward = 1;
      if (T.vuln > 0 && (T.vuln -= dt) <= 0 && p) p.raidTakenMul = 1;
      if (T.weak > 0 && (T.weak -= dt) <= 0 && p) p.raidDmgMul = 1;
      if (T.colour > 0 && (T.colour -= dt) <= 0) this.colour = null;
      if (T.stun > 0 && (T.stun -= dt) <= 0) this.stunned = false;
      if (this.empT) for (let i = this.empT.length - 1; i >= 0; i--) if ((this.empT[i][0] -= dt) <= 0) { m.dmg /= this.empT[i][1]; this.empT.splice(i, 1); this.emp--; }
      if (this.frozen && !this.raid) m.moving = false;
      // the hero's damage over the last seconds sizes the shields (M39: 10-12 s of it)
      if (!this.shield) { const lost = (this.lastHp ?? m.hp) - m.hp; this.acc = (this.acc || 0) + Math.max(0, lost); if ((this.win = (this.win || 0) + dt) >= 1) { (this.hist ||= []).push(this.acc / this.win); if (this.hist.length > 8) this.hist.shift(); this.dpsEst = this.hist.reduce((a, b) => a + b, 0) / this.hist.length; this.acc = 0; this.win = 0; } }
      this.lastHp = m.hp;
    },
    cleanup() {
      if (this.done) return; this.done = true;
      const p = this.p;
      if (this.timers.burn > 0 && !m.dead) m.ward = 1;
      if (p && this.timers.vuln > 0) p.raidTakenMul = 1;
      if (p && this.timers.weak > 0) p.raidDmgMul = 1;
      if (this.frozen) this.freeze(false);
      this.shield = 0; this.colour = null;
      for (const c of this.R.minions) if (!c.dead) { c.dead = true; burst(c.x, c.y, 20, fxEl(el), 10, 2); }
      for (const z of this.pools) z.dead = true;
      if (m.vel === this.vel) { if (this.prevVel) m.vel = this.prevVel; else delete m.vel; }
    },
    /** the hero's own marks: attunement colour, countdown rings */
    drawHero(ctx) {
      const p = this.p; if (!p || !this.colour) return;
      const col = this.colour === 'gold' ? GOLD : VIOLET, px = isoX(p.x, p.y), py = isoY(p.x, p.y);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.globalAlpha = 0.85;
      for (let i = 0; i < 3; i++) { const a = G.time * 3 + i * TAU / 3; ctx.beginPath(); ctx.ellipse(px, py - 2, HW * 0.8, HH * 0.8, 0, a, a + 1.4); ctx.stroke(); }
      ctx.restore();
    },
  };
  // the light raid object raidsigs' helpers take (zone, add): the boss, its colours, its adds
  C.R = o.raid || { m, tpl: { el, name: m.name, id: 'free' }, E: C.E, fx: { fire: 'fireball', cold: 'frost', poison: 'poison', shadow: 'shadow', holy: 'holy', arcane: 'shard', light: 'spark' }[el] || 'orb', pi: 0, minions: [], inter: null, free: true,
    get arena() { return { x: m.x - 10, y: m.y - 8, w: 20, h: 16, cx: m.x, cy: m.y }; } };
  // the shield (M39) and the channel's stillness ride the hooks combat.js and monster.js already read
  C.prevVel = m.vel;
  C.vel = m.vel = {
    absorb: (d) => {
      if (C.shield > 0) { const a = Math.min(C.shield, d); C.shield -= a; d -= a; if (C.shield <= 0) C.shield = 0; }
      return C.prevVel ? C.prevVel.absorb(d) : d;
    },
    holdBoss: () => !!C.frozen || !!C.stunned || (C.prevVel ? C.prevVel.holdBoss() : false),
    label: () => (C.label ? C.label() : C.prevVel ? C.prevVel.label() : ''),
  };
  if (m.ward === undefined) m.ward = 1;
  return C;
}

// =============================================================================================== drawing helpers
const circlePts = (x, y, r, n = 40) => { const o = []; for (let i = 0; i < n; i++) { const a = (i / n) * TAU; o.push([x + Math.cos(a) * r, y + Math.sin(a) * r]); } return o; };
const sectorPts = (x, y, ang, half, r0, r1) => { const o = []; for (let i = 0; i <= 18; i++) { const a = ang - half + (i / 18) * half * 2; o.push([x + Math.cos(a) * r1, y + Math.sin(a) * r1]); } if (r0 <= 0.05) o.push([x, y]); else for (let i = 18; i >= 0; i--) { const a = ang - half + (i / 18) * half * 2; o.push([x + Math.cos(a) * r0, y + Math.sin(a) * r0]); } return o; };
const rectPts = (x0, y0, x1, y1, hw) => { const a = Math.atan2(y1 - y0, x1 - x0), nx = -Math.sin(a) * hw, ny = Math.cos(a) * hw; return [[x0 + nx, y0 + ny], [x1 + nx, y1 + ny], [x1 - nx, y1 - ny], [x0 - nx, y0 - ny]]; };
function poly(ctx, pts) { pts.forEach(([x, y], i) => (i ? ctx.lineTo(isoX(x, y), isoY(x, y)) : ctx.moveTo(isoX(x, y), isoY(x, y)))); ctx.closePath(); }

/** A telegraphed ground shape that lands once (and may linger as a pit): circle | ring | cone | line. It fills from
 *  its rim inward, so a full shape means it lands now; the rim is brighter than the fill to read over gibs and dark. */
class Mark {
  constructor(C, o) {
    Object.assign(this, { C, t: 0, ground: true, team: 'enemy', world: C.m.world, shape: 'circle', dur: 1, color: RED, bad: true, frac: 0.3, linger: 0, r: 1.5, r0: 0, half: 0.6, w: 1 }, o);
  }
  isBad() { return typeof this.bad === 'function' ? this.bad() : this.bad; }
  inside(c, pad = 0) {
    const d = dist(c.x, c.y, this.x, this.y);
    switch (this.shape) {
      case 'ring': return d > this.r0 - pad && d < this.r + pad;
      case 'cone': return d < this.r + pad && (d < 0.7 || Math.abs(angleDiff(this.ang, angleTo(this.x, this.y, c.x, c.y))) < this.half + pad / Math.max(1, d));
      case 'line': return segDist(c.x, c.y, this.x, this.y, this.x1, this.y1) < this.w / 2 + pad;
      default: return d < this.r + pad;
    }
  }
  danger(out) {
    if (!this.isBad() || (this.landed && !this.linger)) return;
    const s = this.shape;
    if (s === 'ring') out.push({ ring: true, x: this.x, y: this.y, r0: Math.max(0, this.r0 - 0.4), r1: this.r + 0.45, gap: 0, gapW: 0 });
    else if (s === 'cone') { out.push({ cone: true, x: this.x, y: this.y, ang: this.ang, half: this.half + 0.12, r: this.r + 0.5 }); out.push({ x: this.x, y: this.y, r: 1.1 }); }
    else if (s === 'line') out.push({ line: true, x: this.x, y: this.y, x1: this.x1, y1: this.y1, r: this.w / 2 + 0.5 });
    else out.push({ x: this.x, y: this.y, r: this.r + 0.45, linger: this.landed || undefined });
  }
  update(dt) {
    if (!this.C.alive() || this.dead) return false;
    this.t += dt;
    if (this.follow) this.follow(this, dt);
    if (!this.landed && this.t >= this.dur) {
      this.landed = true;
      const C = this.C, vic = [C.p, ...(this.pets === false ? [] : C.pets())].filter((c) => c && !c.dead && this.inside(c, (c.r || 0.3) * 0.6));
      if (this.onLand) this.onLand(vic); else for (const c of vic) C.hurt(c, this.frac, { knock: this.knock, stun: this.stun, ang: this.knockAng });
      this.boom();
      if (!this.linger) return false;
    }
    if (this.landed) {
      const p = this.C.p;
      if (p && this.inside(p) && (this.tk = (this.tk || 0) - dt) <= 0) { this.tk = 0.5; this.C.hurt(p, this.pit || 0.12, { dot: true }); }
      return this.t < this.dur + this.linger;
    }
    return true;
  }
  boom() {
    const fx = fxEl(this.C.el), s = this.shape;
    if (s === 'circle') explosionFx(this.x, this.y, this.r, fx, 'nova', { shake: 3 });
    else if (s === 'ring') for (let i = 0; i < 10; i++) { const a = i / 10 * TAU, d = (this.r0 + this.r) / 2; burst(this.x + Math.cos(a) * d, this.y + Math.sin(a) * d, 6, fx, 6, 3); }
    else if (s === 'cone') for (let i = 0; i < 6; i++) { const a = this.ang + (i / 5 - 0.5) * this.half * 2, d = this.r * 0.65; burst(this.x + Math.cos(a) * d, this.y + Math.sin(a) * d, 6, fx, 6, 3); }
    else for (let k = 0; k <= 1; k += 0.2) burst(this.x + (this.x1 - this.x) * k, this.y + (this.y1 - this.y) * k, 6, fx, 4, 2);
    if (this.sound !== false) sfx(this.sound || 'thud', 0.6);
  }
  shapePts(k = 1) {   // k: how far in from the rim (1 = the whole shape)
    const s = this.shape;
    if (s === 'ring') { const d = (this.r - this.r0) * k * 0.5; return [circlePts(this.x, this.y, this.r), circlePts(this.x, this.y, this.r - d), circlePts(this.x, this.y, this.r0 + d), circlePts(this.x, this.y, Math.max(0.01, this.r0))]; }
    if (s === 'cone') return [sectorPts(this.x, this.y, this.ang, this.half, this.r * (1 - k), this.r)];
    if (s === 'line') return k >= 1 ? [rectPts(this.x, this.y, this.x1, this.y1, this.w / 2)] : [rectPts(this.x, this.y, this.x1, this.y1, this.w / 2), rectPts(this.x, this.y, this.x1, this.y1, this.w / 2 * (1 - k))];
    return k >= 1 ? [circlePts(this.x, this.y, this.r)] : [circlePts(this.x, this.y, this.r), circlePts(this.x, this.y, this.r * (1 - k))];
  }
  draw(ctx) {
    const k = clamp(this.t / this.dur, 0, 1), col = this.colorFn ? this.colorFn() : this.color;
    ctx.save();
    if (this.landed) {   // the void left behind
      ctx.globalAlpha = 0.55 * clamp((this.dur + this.linger - this.t) / 0.5, 0, 1); ctx.fillStyle = '#08000c';
      ctx.beginPath(); for (const P of this.shapePts(1)) poly(ctx, P); ctx.fill('evenodd');
      ctx.globalAlpha *= 1.4; ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.setLineDash([6, 4]); ctx.lineDashOffset = -this.t * 18;
      ctx.beginPath(); for (const P of this.shapePts(1)) poly(ctx, P); ctx.stroke();
      ctx.restore(); return;
    }
    ctx.globalAlpha = 0.1; ctx.fillStyle = col;
    ctx.beginPath(); for (const P of this.shapePts(1)) poly(ctx, P); ctx.fill('evenodd');
    ctx.globalAlpha = 0.18 + 0.32 * k;   // the fill closes in from the rim
    ctx.beginPath(); for (const P of this.shapePts(k)) poly(ctx, P); ctx.fill('evenodd');
    ctx.globalAlpha = 0.95; ctx.strokeStyle = col; ctx.lineWidth = this.isBad() ? 2.5 : 3; if (!this.isBad()) ctx.setLineDash([]);
    ctx.beginPath(); for (const P of this.shapePts(1)) poly(ctx, P); ctx.stroke();
    if (this.cracks) {   // a floor about to fall: cracks running out from the boss
      ctx.globalAlpha = 0.4 + 0.5 * k; ctx.lineWidth = 1.5; ctx.strokeStyle = '#e0b0ff';
      for (const [a, d] of this.cracks) { ctx.beginPath(); ctx.moveTo(isoX(this.x + Math.cos(a) * d * 0.3, this.y + Math.sin(a) * d * 0.3), isoY(this.x + Math.cos(a) * d * 0.3, this.y + Math.sin(a) * d * 0.3)); ctx.lineTo(isoX(this.x + Math.cos(a + 0.1) * d * k, this.y + Math.sin(a + 0.1) * d * k), isoY(this.x + Math.cos(a + 0.1) * d * k, this.y + Math.sin(a + 0.1) * d * k)); ctx.stroke(); }
    }
    if (this.label) { ctx.globalAlpha = 0.9; ctx.font = 'bold 11px Georgia, serif'; ctx.textAlign = 'center'; ctx.fillStyle = col; ctx.fillText(this.label, isoX(this.x, this.y), isoY(this.x, this.y) + 4); }
    ctx.restore();
  }
}
const mark = (C, o) => C.m.world.addHazard(new Mark(C, o));
/** A ground hazard with its own update/draw/danger/autoGoal, gone with the boss. */
const ground = (C, o) => C.m.world.addHazard({ ground: true, team: 'enemy', t: 0, world: C.m.world, ...o, update(dt) { if (!C.alive() || this.dead) return false; this.t += dt; return o.update.call(this, dt); } });

/** A floor point rmin..rmax from (x, y) that passes test, else null. */
function spot(C, x, y, rmin, rmax, test, tries = 30) {
  const map = C.m.world.map;
  for (let i = 0; i < tries; i++) {
    const a = rand(TAU), d = rand(rmin, rmax), sx = x + Math.cos(a) * d, sy = y + Math.sin(a) * d;
    if (map.circleFree(sx, sy, 0.45) && map.los(x, y, sx, sy) && (!test || test(sx, sy))) return [sx, sy];
  }
  return null;
}
/** The floor point furthest along ang from (x, y), up to len. */
function along(C, x, y, ang, len) { const map = C.m.world.map; let bx = x, by = y; for (let d = 0.5; d <= len; d += 0.5) { const nx = x + Math.cos(ang) * d, ny = y + Math.sin(ang) * d; if (!map.circleFree(nx, ny, 0.4)) break; bx = nx; by = ny; } return [bx, by]; }
const headZ = (m) => (m.artH || 60) * (m.scale || 1) + (m.z || 0);
function countdown(ctx, p, col, secs, r = 1) {
  const px = isoX(p.x, p.y), py = isoY(p.x, p.y);
  ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.globalAlpha = 0.9; ctx.setLineDash([5, 3]); ctx.lineDashOffset = -G.time * 20;
  ctx.beginPath(); ctx.ellipse(px, py, r * HW * 1.41, r * HH * 1.41, 0, 0, TAU); ctx.stroke();
  ctx.setLineDash([]); ctx.font = 'bold 14px Georgia, serif'; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = '#000'; ctx.fillStyle = col;
  const s = String(Math.max(0, Math.ceil(secs))); ctx.strokeText(s, px, py - 78); ctx.fillText(s, px, py - 78);
  ctx.restore();
}

// =============================================================================================== the mechanics
// MECHS[id](C, name, o) starts one and returns its act: { name, castT, dur, lethal, burnAfter, update(dt) -> running,
// danger(out), autoGoal(), draw(ctx), end() }. Hazards it lays down publish their own danger().
const act = (C, name, o) => Object.assign({ C, name, t: 0, castT: 1, dur: 2, update(dt) { this.t += dt; if (this.tick && this.tick(dt) === false) return false; return this.t < this.dur; } }, o);
export const MECH_NAMES = { soak: 'M01 Split soak', frontal: 'M11 Frontal cone', combo: 'M12 Combo string', brk: 'M35 Platform break', shield: 'M39 Break the shield', carry: 'M23 Carry the item',
  tether: 'M27 Tether', beam: 'M04 Intercept the beam', attune: 'M05 Colour attunement', march: 'M18 Marchers', pull: 'M29 Pull to the maw', wave: 'M32 Wave with gaps',
  beams: 'M13 Rotating beams', pool: 'M07 Drop a pool', spread: 'M09 Spread mark' };
export const MECHS = {
  // M01 the gold circle: stand in it (pets count half), or the whole floor pays
  soak(C, name) {
    const p = C.p, m = C.m, r = 1.6, dur = 2.8;
    const [x, y] = spot(C, p.x, p.y, 2.2, 4.2, (sx, sy) => dist(sx, sy, m.x, m.y) > 2.4) || [p.x, p.y];
    mark(C, { shape: 'circle', x, y, r, dur, color: GOLD, bad: false, label: 'SOAK', sound: 'holy', onLand: () => {
      const pets = C.pets().filter((c) => dist(c.x, c.y, x, y) < r + c.r * 0.5), inH = dist(p.x, p.y, x, y) < r + 0.25;
      if (inH || pets.length) {
        const share = 0.3 / (1 + 0.5 * pets.length);
        if (inH) C.hurt(p, share); for (const c of pets) C.hurt(c, share);
        floatText(x, y, 70, 'SOAKED', GOLD, 14);
      } else {
        const f = C.fail('soak') ? 0.95 : 0.6;
        for (const c of [p, ...C.pets()]) if (dist(c.x, c.y, x, y) < 20) C.hurt(c, f, { stun: 1 });
        floatText(p.x, p.y, 80, 'UNSOAKED', '#ff4040', 16); G.flash = 0.3; addEffect(new Ring(x, y, 0.5, 14, 0.8, GOLD, 6));
      }
    } });
    return act(C, name, { castT: dur, dur: dur + 0.2, autoGoal: () => ({ x, y, r: 0.8 }) });
  },
  // M11 a red cone off the boss's face: side-step or get behind
  frontal(C, name) {
    const m = C.m, p = C.p, n = C.pi >= 1 && C.tier !== 'ward' ? 2 : 1, wind = C.pi >= 2 ? 0.9 : 1.05;
    let i = 0, next = 0;
    C.freeze(true);
    return act(C, name, { castT: wind, dur: n * (wind + 0.45) + 0.2, tick(dt) {
      if (i < n && this.t >= next) { const a = angleTo(m.x, m.y, p.x, p.y); m.face(a); mark(C, { shape: 'cone', x: m.x, y: m.y, ang: a, half: 0.61, r: 5.5, dur: wind, frac: 0.45, knock: 2.2, knockAng: a, color: RED, sound: 'swing' }); i++; next = this.t + wind + 0.45; }
    } });
  },
  // M12 three to five glyphs over his head (cone, ring, slam) land in order: read the next one
  combo(C, name) {
    const m = C.m, n = { ward: 3, lord: 4 }[C.tier] || 5, seq = [], step = 1.25, wind = 1.1;
    for (let i = 0; i < n; i++) { let g; do g = pick(['cone', 'ring', 'slam']); while (i >= 2 && g === seq[i - 1] && g === seq[i - 2]); seq.push(g); }
    let i = 0;
    C.freeze(true);
    const lead = 0.8;   // the whole string shows first
    return act(C, name, { castT: lead + (n - 1) * step + wind, dur: lead + (n - 1) * step + wind + 0.3, seq, tick() {
      const p = C.p;
      if (i < n && this.t >= lead + i * step) {
        const g = seq[i], a = angleTo(m.x, m.y, p.x, p.y); m.face(a);
        if (g === 'cone') mark(C, { shape: 'cone', x: m.x, y: m.y, ang: a, half: 0.62, r: 5.5, dur: wind, frac: 0.28, color: RED, sound: 'swing' });
        else if (g === 'ring') mark(C, { shape: 'ring', x: m.x, y: m.y, r0: 1.9, r: 5.6, dur: wind, frac: 0.28, color: RED, sound: 'thud' });
        else mark(C, { shape: 'circle', x: m.x, y: m.y, r: 2.6, dur: wind + 0.1, frac: 0.3, knock: 1.4, color: RED, sound: 'thud' });
        i++; this.cur = i;
      }
    },
    draw(ctx) {   // the glyph string over his head; the next to land glows
      const px = isoX(m.x, m.y), py = isoY(m.x, m.y) - headZ(m) - 46, k = Math.max(0, (this.cur || 0) - 1);
      ctx.save();
      seq.forEach((g, j) => {
        const x = px + (j - (n - 1) / 2) * 20, done = j < k, now = j === k;
        ctx.globalAlpha = done ? 0.25 : now ? 1 : 0.6; ctx.strokeStyle = now ? '#ffffff' : RED; ctx.fillStyle = now ? RED : 'rgba(60,10,5,0.8)'; ctx.lineWidth = 2;
        ctx.beginPath();
        if (g === 'cone') { ctx.moveTo(x - 7, py + 6); ctx.lineTo(x, py - 7); ctx.lineTo(x + 7, py + 6); ctx.closePath(); }
        else if (g === 'ring') { ctx.arc(x, py, 7, 0, TAU); ctx.moveTo(x + 3, py); ctx.arc(x, py, 3, 0, TAU); }
        else for (let s = 0; s < 10; s++) { const a = s / 10 * TAU, rr = s % 2 ? 3.5 : 8; s ? ctx.lineTo(x + Math.cos(a) * rr, py + Math.sin(a) * rr) : ctx.moveTo(x + rr, py); }
        ctx.fill('evenodd'); ctx.stroke();
      });
      ctx.restore();
    } });
  },
  // M35 a sector round the boss cracks for 4 s, then falls: a void that stays
  brk(C, name) {
    const m = C.m, p = C.p, a = angleTo(m.x, m.y, p.x, p.y), crack = 4.2, linger = 8;
    const kind = C.pi >= 2 ? 'halves' : (C.brkN = (C.brkN || 0) + 1) % 2 ? 'quarter' : 'core';
    const onLand = (vic) => { for (const c of vic) { C.hurt(c, c.isPlayer && C.fail('brk') ? 1.05 : 0.7, { stun: 0.8 }); if (c.isPlayer) floatText(c.x, c.y, 80, 'THE FLOOR FALLS', VIOLET, 15); } G.shake = Math.max(G.shake || 0, 10); };
    const cracks = Array.from({ length: 7 }, () => [rand(TAU), rand(3, 7)]);
    const o = { dur: crack, color: VIOLET, linger, pit: 0.12, onLand, cracks, sound: 'explode' };
    if (kind === 'core') mark(C, { ...o, shape: 'circle', x: m.x, y: m.y, r: 4.2, label: 'THE FLOOR CRACKS' });
    else for (const off of kind === 'halves' ? [0, Math.PI] : [0]) mark(C, { ...o, shape: 'cone', x: m.x, y: m.y, ang: a + off, half: Math.PI / 4, r: 7.5, cracks: cracks.map(([, d], j) => [a + off + (j / 6 - 0.5) * 1.4, d]) });
    if (C.m.world.boss === m || C.raid) UI.centerMsg(name.toUpperCase(), kind === 'core' ? 'The floor round him falls: get clear!' : 'Get off the cracked floor!', 2);
    sfx('thud'); G.shake = Math.max(G.shake || 0, 4);
    return act(C, name, { castT: crack, dur: crack + 0.4, lethal: true });
  },
  // M39 a ward worth ~10 s of the hero's damage and a long channel: break it (interrupt) or take it all
  shield(C, name) {
    const m = C.m, dur = { ward: 10, lord: 12, guardian: 14 }[C.tier] || 13;
    const hp = clamp(C.dps() * 9 * (C.tier === 'ward' ? 0.8 : 1), m.maxHp * 0.025, m.maxHp * 0.09) || m.maxHp * 0.05;
    C.shield = C.shieldMax = hp; C.freeze(true);
    UI.centerMsg(name.toUpperCase(), 'Break the ward before the cast ends!', 2.4);
    addEffect(new Column(m.x, m.y, CYAN, 0.8, 40, 300)); sfx('arcane');
    return act(C, name, { castT: dur, dur: dur + 0.1, lethal: true, shield: true,
      tick() {
        if (C.shield <= 0) {   // broken: the next blow interrupts him
          C.shield = 0; C.freeze(false); C.stunned = true; C.timers.stun = 3; m.status.stun = { t: 3 };
          floatText(m.x, m.y, headZ(m) + 20, 'INTERRUPTED', '#a0f0ff', 18, { life: 1.6 }); explosionFx(m.x, m.y, 2.5, 'cold', 'nova', { shake: 6 }); sfx('glass');
          C.burn(10, 1.5); return false;
        }
        if (this.t >= dur) {
          const p = C.p, f = C.fail('shield') ? 1.25 : 0.7;
          for (const c of [p, ...C.pets()]) if (c && dist(c.x, c.y, m.x, m.y) < 22) C.hurt(c, f, { stun: 0.8 });
          C.shield = 0; explosionFx(m.x, m.y, 6, fxEl(C.el), 'eruption', { shake: 14 }); G.flash = 0.5;
          floatText(p.x, p.y, 90, name.toUpperCase(), VIOLET, 16); sfx('explode'); return false;
        }
        if (chance(0.2)) sparkle(m.x, m.y, 40, CYAN, 1, 1.2);
      },
      autoGoal: () => ({ x: m.x, y: m.y, r: 4.5 }),
      draw(ctx) {
        const px = isoX(m.x, m.y), py = isoY(m.x, m.y), R = (m.r || 0.6) + 1, k = C.shield / (C.shieldMax || 1);
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.25 + 0.35 * k; ctx.strokeStyle = CYAN; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.ellipse(px, py - headZ(m) * 0.45, R * HW * 1.1, headZ(m) * 0.62, 0, 0, TAU); ctx.stroke();
        ctx.globalAlpha = 0.1 + 0.15 * k; ctx.fillStyle = CYAN; ctx.fill();
        // the channel's reach: a violet ring that closes as it nears its end
        const q = this.t / dur; ctx.globalAlpha = 0.6; ctx.strokeStyle = VIOLET; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(px, py, 12 * (1 - q * 0.85) * HW * 1.41, 12 * (1 - q * 0.85) * HH * 1.41, 0, 0, TAU); ctx.stroke();
        ctx.restore();
      } });
  },
  // M23 carry the item he drops to the socket before his cast ends (slowed, ticking, 12 s at most in hand)
  carry(C, name, o = {}) {
    const m = C.m, p = C.p, dur = 15, item = o.item || 'Ember', sock = o.socket || 'the Socket';
    const [ix, iy] = spot(C, m.x, m.y, 2.5, 4, (x, y) => dist(x, y, p.x, p.y) < 7) || [p.x, p.y];
    const [sx, sy] = spot(C, ix, iy, 6.5, 9.5, (x, y) => dist(x, y, m.x, m.y) > 5.5) || spot(C, ix, iy, 4, 7) || [ix, iy];
    const S = { x: ix, y: iy, held: false, holdT: 0 };
    const Z = zone(C.R, { x: sx, y: sy, r: 1.3, dur: dur + 1, color: CYAN, good: true, goal: false });
    C.freeze(true);
    UI.centerMsg(name.toUpperCase(), `Carry the ${item} to ${sock}!`, 2.2); sfx('arcane');
    return act(C, name, { castT: dur, dur: dur + 0.1, lethal: true, carry: S,
      tick(dt) {
        if (!S.held && dist(p.x, p.y, S.x, S.y) < 1.1) { S.held = true; S.holdT = 0; floatText(p.x, p.y, 80, item.toUpperCase(), CYAN, 14); sfx('gold', 0.6); }
        if (S.held) {
          S.x = p.x; S.y = p.y; S.holdT += dt; p.status.slow = { t: 0.25, amt: 0.25 };
          if ((S.tk = (S.tk || 0) - dt) <= 0) { S.tk = 0.5; C.hurt(p, 0.01, { dot: true, el: 'fire' }); }
          if (S.holdT > 12) { S.held = false; floatText(p.x, p.y, 80, 'DROPPED', '#ff8040', 13); }
          if (dist(p.x, p.y, sx, sy) < 1.4) {   // delivered: the cast breaks
            Z.dead = true; C.freeze(false); C.stunned = true; C.timers.stun = 2.5; m.status.stun = { t: 2.5 };
            explosionFx(sx, sy, 2, 'cold', 'nova', { shake: 5 }); floatText(sx, sy, 80, 'DELIVERED', CYAN, 16); sfx('freeze'); C.burn(8, 1.5); return false;
          }
        }
        if (this.t >= dur) {
          const f = C.fail('carry') ? 1 : 0.6; Z.dead = true;
          for (const c of [p, ...C.pets()]) if (dist(c.x, c.y, m.x, m.y) < 22) C.hurt(c, f, { stun: 1 });
          explosionFx(m.x, m.y, 6, fxEl(C.el), 'eruption', { shake: 12 }); G.flash = 0.4; floatText(p.x, p.y, 90, 'TOO LATE', '#ff4040', 15); return false;
        }
      },
      autoGoal: () => (S.held ? { x: sx, y: sy, r: 0.7 } : { x: S.x, y: S.y, r: 0.5 }),
      draw(ctx) {
        const px = isoX(S.x, S.y), py = isoY(S.x, S.y) - (S.held ? 92 : 14 + Math.sin(G.time * 4) * 4);
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = CYAN; ctx.globalAlpha = 0.9; ctx.beginPath(); ctx.moveTo(px, py - 9); ctx.lineTo(px + 6, py); ctx.lineTo(px, py + 9); ctx.lineTo(px - 6, py); ctx.closePath(); ctx.fill();
        ctx.globalAlpha = 0.35; ctx.beginPath(); ctx.arc(px, py, 14, 0, TAU); ctx.fill();
        if (S.held) {   // white arrows to the socket
          ctx.globalCompositeOperation = 'source-over'; ctx.strokeStyle = WHITE; ctx.lineWidth = 2; ctx.globalAlpha = 0.8; ctx.setLineDash([6, 6]); ctx.lineDashOffset = -G.time * 30;
          ctx.beginPath(); ctx.moveTo(isoX(p.x, p.y), isoY(p.x, p.y)); ctx.lineTo(isoX(sx, sy), isoY(sx, sy)); ctx.stroke();
        }
        ctx.restore();
        if (S.held) countdown(ctx, p, CYAN, 12 - S.holdT, 0.8);
        ctx.save(); ctx.font = 'bold 11px Georgia, serif'; ctx.textAlign = 'center'; ctx.fillStyle = CYAN; ctx.fillText(sock.toUpperCase(), isoX(sx, sy), isoY(sx, sy) + 26); ctx.restore();
      } });
  },
  // M27 a chain to a stake drains life, more each second: walk 6 tiles off to snap it (a burst, then a brief vulnerability)
  tether(C, name) {
    const p = C.p, m = C.m, snap = 6, dur = 11;
    const [ax, ay] = spot(C, p.x, p.y, 1, 2) || [p.x + 1, p.y];
    let goal = null, best = -1;
    for (let i = 0; i < 16; i++) { const a = i / 16 * TAU, x = ax + Math.cos(a) * (snap + 1.6), y = ay + Math.sin(a) * (snap + 1.6); if (!C.m.world.map.circleFree(x, y, 0.45)) continue; const s = dist(x, y, m.x, m.y) * 0.4 - dist(x, y, p.x, p.y); if (!goal || s > best) { best = s; goal = { x, y, r: 0.9 }; } }
    floatText(p.x, p.y, 80, 'CHAINED', '#c0a070', 15); sfx('chain');
    return act(C, name, { castT: 1, dur, tick(dt) {
      const d = dist(p.x, p.y, ax, ay);
      if ((this.fx = (this.fx || 0) - dt) <= 0) { this.fx = 0.09; addEffect(new Bolt(ax, ay, 26, p.x, p.y, 40, d > snap * 0.75 ? '#ff6040' : '#c0a070', 0.1, 3)); }
      if (d > snap) { C.hurt(p, 0.22); C.vuln(6, 1.3); floatText(p.x, p.y, 80, 'SNAPPED', '#ffd0a0', 15); burst(ax, ay, 20, 'fire', 14, 3); sfx('chain'); return false; }
      if ((this.tk = (this.tk || 0) - dt) <= 0) { this.tk = 0.5; C.hurt(p, 0.008 + 0.0025 * this.t, { dot: true }); }
      if (this.t >= dur - 0.05) { C.hurt(p, 0.4, { stun: 1 }); floatText(p.x, p.y, 80, 'CRUSHED BY CHAINS', '#ff4040', 15); return false; }
    },
    autoGoal: () => goal,
    draw(ctx) {
      ctx.save(); ctx.strokeStyle = '#c0a070'; ctx.globalAlpha = 0.5; ctx.lineWidth = 1.5; ctx.setLineDash([4, 6]);
      ctx.beginPath(); ctx.ellipse(isoX(ax, ay), isoY(ax, ay), snap * HW * 1.41, snap * HH * 1.41, 0, 0, TAU); ctx.stroke();
      ctx.setLineDash([]); ctx.globalAlpha = 1; ctx.fillStyle = '#5a4630'; ctx.fillRect(isoX(ax, ay) - 3, isoY(ax, ay) - 26, 6, 26);
      ctx.restore();
      countdown(ctx, p, '#c0a070', dur - this.t, 0.7);
    } });
  },
  // M04 a line from the boss to a pet or a fragile altar thickens: step into it, or he feeds on what it hits
  beam(C, name) {
    const m = C.m, p = C.p, dur = 2.6, pet = C.pets().sort((a, b) => dist(a.x, a.y, m.x, m.y) - dist(b.x, b.y, m.x, m.y))[0];
    const alt = pet && dist(pet.x, pet.y, m.x, m.y) < 10 ? null : (spot(C, m.x, m.y, 5, 7.5) || [m.x + 5, m.y]);
    const tgt = () => (alt ? { x: alt[0], y: alt[1] } : pet);
    const onLine = (c) => { const T = tgt(); return segDist(c.x, c.y, m.x, m.y, T.x, T.y) < 0.4 + (c.r || 0.3) && dist(c.x, c.y, m.x, m.y) > 0.8; };
    C.freeze(true); sfx('holy');
    return act(C, name, { castT: dur, dur: dur + 0.1, tick() {
      const T = tgt(); m.face(angleTo(m.x, m.y, T.x, T.y));
      if (this.t < dur) return;
      if (onLine(p)) { C.hurt(p, 0.25); floatText(p.x, p.y, 80, 'INTERCEPTED', GOLD, 15); }
      else if (pet && !alt) { C.hurt(pet, 0.6); floatText(pet.x, pet.y, 60, 'STRUCK', '#ff6040', 13); }
      else { m.heal(m.maxHp * 0.05); C.empower(15, 1.1); explosionFx(T.x, T.y, 1.4, 'holy', 'nova', { shake: 4 }); floatText(T.x, T.y, 70, 'THE ALTAR BREAKS', '#ff6040', 14); }
      addEffect(new Bolt(m.x, m.y, 40, T.x, T.y, 30, GOLD, 0.35, 6)); return false;
    },
    autoGoal() { const T = tgt(); return { x: m.x + (T.x - m.x) * 0.55, y: m.y + (T.y - m.y) * 0.55, r: 0.3 }; },
    draw(ctx) {
      const T = tgt(), k = clamp(this.t / dur, 0, 1);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
      ctx.globalAlpha = 0.3 + 0.5 * k; ctx.strokeStyle = GOLD; ctx.lineWidth = 2 + 10 * k;
      ctx.beginPath(); ctx.moveTo(isoX(m.x, m.y), isoY(m.x, m.y) - 30); ctx.lineTo(isoX(T.x, T.y), isoY(T.x, T.y) - 20); ctx.stroke();
      if (alt) { ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.fillStyle = '#c8b070'; ctx.fillRect(isoX(T.x, T.y) - 6, isoY(T.x, T.y) - 22, 12, 22); ctx.fillStyle = GOLD; ctx.fillRect(isoX(T.x, T.y) - 8, isoY(T.x, T.y) - 26, 16, 5); }
      ctx.restore();
    } });
  },
  // M05 his cast turns the hero gold or violet; then both colours fall: only the other colour hurts
  attune(C, name) {
    const p = C.p, cast = 2.2;
    let fell = false;
    return act(C, name, { castT: cast, dur: cast + 3.4, tick() {
      if (fell || this.t < cast) return;
      fell = true;
      C.colour = C.colour === 'gold' ? 'violet' : C.colour === 'violet' ? 'gold' : chance(0.5) ? 'gold' : 'violet'; C.timers.colour = 22;
      floatText(p.x, p.y, 90, C.colour === 'gold' ? 'ATTUNED: GOLD' : 'ATTUNED: VIOLET', C.colour === 'gold' ? GOLD : VIOLET, 16); sfx('arcane');
      for (let i = 0; i < 8; i++) {
        const col = i % 2 ? 'gold' : 'violet', [x, y] = i === 0 ? [p.x, p.y] : spot(C, p.x, p.y, 0.8, 4.5) || [p.x + rand(-3, 3), p.y + rand(-3, 3)];
        const mine = () => C.colour === col;
        mark(C, { shape: 'circle', x, y, r: 1.5, dur: 1.4 + i * 0.16, color: col === 'gold' ? GOLD : VIOLET, bad: () => !mine(), sound: 'arcane', onLand: (vic) => {
          for (const c of vic) { if (!c.isPlayer || mine()) C.hurt(c, 0.06); else { C.hurt(c, 0.4); C.weaken(6, 0.7); floatText(c.x, c.y, 80, 'DISSONANCE', '#ff40a0', 14); } }
        } });
      }
    } });
  },
  // M18 slow marchers leave the walls for him: each that reaches him empowers and heals him
  march(C, name, o = {}) {
    const m = C.m, w = m.world, n = { ward: 3, lord: 4 }[C.tier] || 5, ours = [];
    const arts = [...new Set(w.creatures.filter((c) => c.team === 'enemy' && c.art && c !== m && c.rank !== 'boss' && !c.dead).map((c) => c.art))];
    for (let i = 0; i < n; i++) {
      const [x, y] = spot(C, m.x, m.y, 8, 10.5) || spot(C, m.x, m.y, 5, 8) || [m.x + rand(-6, 6), m.y + rand(-6, 6)];
      const c = add(C.R, x, y, { name: o.add || 'Marcher', hp: 0.02, priority: 6, ai: 'melee', art: arts.length ? pick(arts) : null, artH: 52, r: 0.4,
        tick: (c, dt) => {
          c.moveToward(m.x, m.y, dt, 1.6);
          if ((c.tr = (c.tr || 0) - dt) <= 0) { c.tr = 0.3; burst(c.x, c.y, 2, fxEl(C.el), 1, 0.5); }
          if (dist(c.x, c.y, m.x, m.y) < (m.r || 0.6) + 1) { c.dead = true; c.xp = 0; C.empower(20, 1.1); m.heal(m.maxHp * 0.02); sparkle(m.x, m.y, 40, C.E.glow, 12, 0.6); floatText(m.x, m.y, headZ(m), 'THE MARCH ARRIVES', '#ff8040', 13); }
        } });
      ours.push(c);
    }
    UI.log(`${m.name}: <b>${name}</b>. Stop the marchers before they reach him!`, '#ffc0a0'); sfx('summon');
    return act(C, name, { castT: 1, dur: 22, tick() { if (ours.every((c) => c.dead)) return false; },
      draw(ctx) {   // their dotted routes to him
        ctx.save(); ctx.strokeStyle = '#ff9060'; ctx.globalAlpha = 0.55; ctx.lineWidth = 2; ctx.setLineDash([3, 7]); ctx.lineDashOffset = -G.time * 16;
        for (const c of ours) if (!c.dead) { ctx.beginPath(); ctx.moveTo(isoX(c.x, c.y), isoY(c.x, c.y)); ctx.lineTo(isoX(m.x, m.y), isoY(m.x, m.y)); ctx.stroke(); }
        ctx.restore();
      } });
  },
  // M29 he inhales: a pull toward his maw (lethal to stand in); walk straight out, or dash
  pull(C, name) {
    const m = C.m, p = C.p, inhale = 1.6, dur = inhale + 5, speed = 2.6, maw = 1.7;
    C.freeze(true);
    const danger = (out) => out.push({ x: m.x, y: m.y, r: maw + 1 });
    let far = null;
    return act(C, name, { castT: inhale, dur, lethal: true, danger, tick(dt) {
      if (!far || (this.ft = (this.ft || 0) - dt) <= 0) { this.ft = 0.5; const [x, y] = along(C, m.x, m.y, angleTo(m.x, m.y, p.x, p.y), 11); far = { x, y, r: 1.5 }; }
      if (this.t < inhale) { if (chance(0.5)) burst(m.x + rand(-6, 6), m.y + rand(-6, 6), 4, 'arcane', 1, 1); return; }
      const d = dist(p.x, p.y, m.x, m.y);
      if (d < 15 && d > 0.3 && !p.leaping && !p.dashT && !p.blink) { const s = speed * dt, nx = p.x + (m.x - p.x) / d * s, ny = p.y + (m.y - p.y) / d * s; if (C.m.world.map.circleFree(nx, ny, 0.3)) { p.x = nx; p.y = ny; } }
      for (const c of C.pets()) { const e = dist(c.x, c.y, m.x, m.y); if (e < 12 && e > 0.3) C.m.world.map.move(c, (m.x - c.x) / e * speed * 0.8 * dt, (m.y - c.y) / e * speed * 0.8 * dt); }
      if (d < maw + 0.3 && (this.tk = (this.tk || 0) - dt) <= 0) { this.tk = 0.5; C.hurt(p, C.fails.pull ? 0.35 : 0.25); C.fail('pull'); floatText(p.x, p.y, 70, 'DEVOURED', VIOLET, 14); }
      if (chance(dt * 18)) addEffect(new Bolt(p.x, p.y, 20, m.x, m.y, 50, WHITE, 0.15, 1.5));
    },
    autoGoal: () => far,
    draw(ctx) {
      const px = isoX(m.x, m.y), py = isoY(m.x, m.y), k = clamp(this.t / inhale, 0, 1);
      ctx.save(); ctx.strokeStyle = VIOLET; ctx.lineWidth = 3; ctx.globalAlpha = 0.85;
      ctx.beginPath(); ctx.ellipse(px, py, maw * HW * 1.41, maw * HH * 1.41, 0, 0, TAU); ctx.stroke();
      ctx.strokeStyle = WHITE; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.5;
      for (let i = 0; i < 4; i++) { const r = ((G.time * 3 + i * 3) % 12) * (this.t < inhale ? k : 1); ctx.beginPath(); ctx.ellipse(px, py, r * HW * 1.41, r * HH * 1.41, 0, 0, TAU); ctx.stroke(); }
      ctx.restore();
    } });
  },
  // M32 a wall crosses the floor edge to edge with one or two foam-white gaps: be in a gap when it passes
  wave(C, name) {
    const m = C.m, p = C.p, u = angleTo(m.x, m.y, p.x, p.y), ux = Math.cos(u), uy = Math.sin(u), vx = -uy, vy = ux;
    const ox = m.x - ux * 3, oy = m.y - uy * 3, halfW = 9, gapW = 1.1, speed = 3, pre = 1.5, len = 17, done = new Set();
    const hl = (p.x - ox) * vx + (p.y - oy) * vy, gaps = [clamp(hl + (chance(0.5) ? 1 : -1) * rand(2, 4.5), -7, 7)];
    if (C.pi < 2) gaps.push(clamp(-gaps[0] * rand(0.5, 1), -7, 7));
    const inGap = (lat) => gaps.some((g) => Math.abs(lat - g) < gapW);
    const front = (t) => (t - pre) * speed;
    const H = ground(C, { x: m.x, y: m.y, update() {
        const s = front(this.t);
        if (s >= 0) for (const c of [p, ...C.pets()]) {
          if (done.has(c)) continue;
          const al = (c.x - ox) * ux + (c.y - oy) * uy, lat = (c.x - ox) * vx + (c.y - oy) * vy;
          if (Math.abs(al - s) < 0.45 && Math.abs(lat) < halfW && !inGap(lat)) { done.add(c); C.hurt(c, 0.5, { stun: 1, knock: 1.2, ang: u }); if (c.isPlayer) floatText(c.x, c.y, 80, 'SWEPT AWAY', CYAN, 14); }
        }
        return s < len;
      },
      danger(out) {   // the solid stretches of the wall, a step ahead of where it is
        const s = Math.max(0, front(this.t)) + 0.6, cuts = [-halfW, ...gaps.flatMap((g) => [g - gapW * 0.7, g + gapW * 0.7]).sort((a, b) => a - b), halfW];
        for (let i = 0; i + 1 < cuts.length; i += 2) if (cuts[i + 1] > cuts[i]) out.push({ line: true, x: ox + ux * s + vx * cuts[i], y: oy + uy * s + vy * cuts[i], x1: ox + ux * s + vx * cuts[i + 1], y1: oy + uy * s + vy * cuts[i + 1], r: 0.95 });
      },
      draw(ctx) {
        const s = Math.max(0, front(this.t)), pts = (a, b, d) => [[ox + ux * d + vx * a, oy + uy * d + vy * a], [ox + ux * d + vx * b, oy + uy * d + vy * b]];
        ctx.save(); ctx.lineCap = 'butt';
        const cuts = [-halfW, ...gaps.flatMap((g) => [g - gapW, g + gapW]).sort((a, b) => a - b), halfW];
        for (let i = 0; i + 1 < cuts.length; i += 2) {
          const [[x0, y0], [x1, y1]] = pts(cuts[i], cuts[i + 1], s);
          ctx.globalAlpha = this.t < pre ? 0.3 : 0.75; ctx.strokeStyle = this.t < pre ? CYAN : '#3070c0'; ctx.lineWidth = this.t < pre ? 3 : 14;
          ctx.beginPath(); ctx.moveTo(isoX(x0, y0), isoY(x0, y0)); ctx.lineTo(isoX(x1, y1), isoY(x1, y1)); ctx.stroke();
          ctx.globalAlpha = 0.9; ctx.strokeStyle = WHITE; ctx.lineWidth = 2; ctx.stroke();
        }
        for (const g of gaps) {   // the foam marks the gap
          const [[x0, y0]] = pts(g, g, s); ctx.globalAlpha = 0.9; ctx.fillStyle = WHITE;
          for (let j = -1; j <= 1; j++) { ctx.beginPath(); ctx.arc(isoX(x0 + vx * j * 0.55, y0 + vy * j * 0.55), isoY(x0 + vx * j * 0.55, y0 + vy * j * 0.55), 3, 0, TAU); ctx.fill(); }
        }
        ctx.restore();
      } });
    sfx('wind');
    return act(C, name, { castT: pre, dur: pre + len / speed, lethal: true,
      update(dt) { this.t += dt; return !H.dead && this.t < this.dur && C.alive(); },
      autoGoal() {   // slide sideways into the nearest gap and wait there for it
        const s = front(this.t), al = (p.x - ox) * ux + (p.y - oy) * uy;
        if (al < s - 0.5 || al - s > 6) return null;
        const lat = (p.x - ox) * vx + (p.y - oy) * vy, g = gaps.reduce((b, q) => (Math.abs(q - lat) < Math.abs(b - lat) ? q : b), gaps[0]);
        return { x: ox + ux * al + vx * g, y: oy + uy * al + vy * g, r: 0.45 };
      } });
  },
  // M13 beams turn round him, shown ahead as faint lines: walk with the sweep or stay out of their reach
  beams(C, name) {
    const m = C.m, p = C.p, n = C.tier === 'ward' ? 1 : C.tier === 'guardian' && C.pi >= 2 ? 3 : 2, len = 11, pre = 1.5, dur = pre + 7, dir = chance(0.5) ? 1 : -1, spd = 0.6;
    const a0 = angleTo(m.x, m.y, p.x, p.y) + dir * 1.1, angs = () => Array.from({ length: n }, (_, i) => a0 + i * TAU / n + dir * spd * Math.max(0, this_t - pre));
    let this_t = 0;
    C.freeze(true); sfx('light');
    const H = ground(C, { x: m.x, y: m.y, update() {
        this_t = this.t;
        if (this.t < pre) return true;
        for (const a of angs()) for (const c of [p, ...C.pets()]) {
          if ((c.beamT || 0) > G.time || dist(c.x, c.y, m.x, m.y) > len || dist(c.x, c.y, m.x, m.y) < 0.6) continue;
          if (segDist(c.x, c.y, m.x, m.y, m.x + Math.cos(a) * len, m.y + Math.sin(a) * len) < 0.45 + (c.r || 0.3)) { c.beamT = G.time + 1; C.hurt(c, 0.45, { stun: 0.6 }); }
        }
        return this.t < dur;
      },
      danger(out) { for (const a of angs()) for (const da of [0, dir * 0.3]) out.push({ line: true, x: m.x, y: m.y, x1: m.x + Math.cos(a + da) * len, y1: m.y + Math.sin(a + da) * len, r: 0.95 }); },
      draw(ctx) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
        for (const a of angs()) {
          const bx = m.x + Math.cos(a) * len, by = m.y + Math.sin(a) * len;
          ctx.globalAlpha = this.t < pre ? 0.3 : 0.8; ctx.strokeStyle = this.t < pre ? '#ff9080' : C.E.glow; ctx.lineWidth = this.t < pre ? 3 : 12;
          ctx.beginPath(); ctx.moveTo(isoX(m.x, m.y), isoY(m.x, m.y) - 4); ctx.lineTo(isoX(bx, by), isoY(bx, by) - 4); ctx.stroke();
          if (this.t >= pre) { ctx.globalAlpha = 0.25; ctx.strokeStyle = WHITE; ctx.lineWidth = 2; const la = a + dir * 0.3; ctx.beginPath(); ctx.moveTo(isoX(m.x, m.y), isoY(m.x, m.y)); ctx.lineTo(isoX(m.x + Math.cos(la) * len, m.y + Math.sin(la) * len), isoY(m.x + Math.cos(la) * len, m.y + Math.sin(la) * len)); ctx.stroke(); }
        }
        ctx.restore();
      } });
    return act(C, name, { castT: pre, dur, lethal: true, update(dt) { this.t += dt; return !H.dead && this.t < dur && C.alive(); } });
  },
  // M07 a ring follows the hero for 5 s, then drops a pool that stays: put it at the edge
  pool(C, name) {
    const m = C.m, p = C.p, dur = 5;
    let goal = null;
    return act(C, name, { castT: 1, dur: dur + 0.1, tick(dt) {
      if (!goal || (this.gt = (this.gt || 0) - dt) <= 0) { this.gt = 0.6; const [x, y] = along(C, m.x, m.y, angleTo(m.x, m.y, p.x, p.y), 9); goal = dist(x, y, m.x, m.y) > 5 ? { x, y, r: 1.2 } : null; }
      if (this.t < dur) return;
      const Z = zone(C.R, { x: p.x, y: p.y, r: 1.5, dur: 45, color: GREEN, good: false });
      Z.tick = (d) => { const q = C.p; if (q && Z.inside(q) && (Z.h = (Z.h || 0) - d) <= 0) { Z.h = 0.5; C.hurt(q, 0.04, { dot: true, el: 'poison' }); } };
      C.pools.push(Z); const on = C.pools.filter((z) => !z.dead && z.t < z.dur); while (on.length > 3) on.shift().dead = true;
      burst(p.x, p.y, 10, 'poison', 16, 3); sfx('acid'); return false;
    },
    autoGoal: () => goal,
    draw(ctx) { countdown(ctx, p, GREEN, dur - this.t, 1.5); } });
  },
  // M09 a mark bursts on the hero after 6 s and on every pet near him: walk away from them
  spread(C, name) {
    const p = C.p, dur = 6, r = 2.2;
    let goal = null;
    floatText(p.x, p.y, 80, 'MARKED', '#ff60c0', 15);
    return act(C, name, { castT: 1, dur: dur + 0.1, tick(dt) {
      const pets = C.pets().filter((c) => dist(c.x, c.y, p.x, p.y) < 8);
      if ((this.gt = (this.gt || 0) - dt) <= 0) { this.gt = 0.5; if (pets.length) { const cx = pets.reduce((s, c) => s + c.x, 0) / pets.length, cy = pets.reduce((s, c) => s + c.y, 0) / pets.length, [x, y] = along(C, p.x, p.y, angleTo(cx, cy, p.x, p.y), 4); goal = { x, y, r: 0.8 }; } else goal = null; }
      if (this.t < dur) return;
      C.hurt(p, 0.15); explosionFx(p.x, p.y, r, 'arcane', 'nova', { shake: 4 });
      for (const c of pets) if (dist(c.x, c.y, p.x, p.y) < r) { C.hurt(c, 0.6); floatText(c.x, c.y, 60, 'CAUGHT', '#ff60c0', 12); }
      return false;
    },
    autoGoal: () => goal,
    draw(ctx) { countdown(ctx, p, '#ff60c0', dur - this.t, r); } });
  },
};
const BIG = new Set(['shield', 'brk', 'carry', 'pull', 'wave', 'beams', 'march']);
const BURN_AFTER = new Set(['brk', 'pull', 'wave', 'beams', 'march']);   // a survival test buys a vulnerable window (M40)

// =============================================================================================== the scripts
// match (a piece of the art's name): [loop1, loop2], big (fired at 100 energy, and at every stage change), [stage 2, stage 3]
// adds; a 'ward' uses the loop and big (and stage 2 when it has two stages), a 'lord' adds stage 2, a 'guardian' all.
// 'id:Name' or 'id:Name:item:socket' for carry.
const SCRIPTS = [
  // ---- the thirty Dungeon Horror bosses
  ['Reliquary That Kneels', ['soak:The Kneeling Toll', 'beam:Tithe of Relics'], 'shield:The Sealed Reliquary', ['combo:Litany of Knees', 'brk:The Nave Gives Way']],
  ['Bone Loom', ['tether:Bone-Loom Thread', 'combo:Warp and Weft'], 'march:Loom-Children', ['pool:Marrow Spool', 'brk:The Loom Unravels']],
  ['Third Pallbearer', ['frontal:Coffin Swing', 'soak:Weight of the Bier'], 'carry:Carry the Casket:Casket Nail:the Open Grave', ['march:Mourners\' Procession', 'pull:The Open Grave']],
  ['Altar Beneath the Meat', ['pull:Hunger of the Altar', 'pool:Offal Brand'], 'shield:Ward of Meat', ['march:Feeders to the Altar', 'soak:The Bloody Tithe']],
  ['Hollow-Headed Abbot', ['combo:Hollow Psalter', 'spread:Echoing Skull'], 'shield:Vespers Unending', ['beam:Censer of the Hollow', 'attune:Light and Dark of the Abbey']],
  ['Upside-Down Cistern', ['tether:Gaoler\'s Shackle', 'wave:The Cistern Drains Up'], 'pull:Cistern Whirl', ['frontal:Turnkey Blow', 'brk:The Floor Becomes the Ceiling']],
  ['Drowned Regent', ['wave:Tide of the Court', 'soak:Audience with the Regent'], 'carry:Bring the Drowned Crown:Drowned Crown:the Chair', ['pool:Brackish Decree', 'beams:The Regent\'s Turning Gaze']],
  ['Lantern That Breathed', ['pool:Lantern Drip', 'beams:Breath of the Wick'], 'carry:Feed the Lantern:Wick-Coal:the Lantern', ['soak:Last Light', 'pull:The Lantern Inhales']],
  ['Deluge Undertaker', ['wave:The Deluge', 'frontal:Undertaker\'s Spade'], 'brk:Grave Flood', ['tether:Burial Rope', 'soak:Weight of the Water']],
  ['Ten Floodgates', ['wave:A Floodgate Opens', 'beam:Sluice Line'], 'brk:The Gates Give Way', ['soak:Ten Locks', 'pull:Undertow']],
  ['Rack That Wore a Crown', ['tether:Rack Chains', 'combo:Turn of the Screw'], 'shield:The Crowned Rack', ['frontal:Breaking Wheel', 'brk:Trapdoor Verdict']],
  ['Bent Keys', ['tether:Chain of Office', 'frontal:Governor\'s Mace'], 'carry:The Bent Key:Bent Key:the Lock', ['combo:Turn of the Keys', 'march:Prisoners Released']],
  ['End of the Corridor', ['pull:The Corridor Draws In', 'frontal:Grasp'], 'wave:The Walls Close', ['spread:Fingerprints', 'brk:The Corridor Ends']],
  ['Iron Mercy', ['frontal:Mercy Stroke', 'soak:Iron Mercy'], 'shield:No Mercy', ['tether:Warden\'s Leash', 'combo:Sentence and Stroke']],
  ['Sealed Gaol', ['tether:Wedding Chains', 'attune:Veil and Vow'], 'shield:The Sealed Vow', ['soak:Bridal Toll', 'brk:The Gaol Floor']],
  ['Split-Plate', ['combo:Drill of the Split Plate', 'march:Muster Call'], 'shield:Plate Wall', ['frontal:Split Charge', 'soak:Hold the Line']],
  ['Oath-Brand', ['spread:Oath-Brand', 'frontal:General\'s Cleave'], 'march:Sworn Ranks', ['soak:Brand of Fealty', 'shield:Unbroken Oath']],
  ['Pavise Unmade', ['frontal:Pavise Bash', 'soak:Lock Shields'], 'shield:The Pavise Raised', ['combo:Shieldbearer\'s Drill', 'wave:The Wall Advances']],
  ['Quiverback', ['beam:Despot\'s Volley', 'spread:Quiver Brand'], 'beams:Rain of Quills', ['march:Pressed Archers', 'pool:Pitch Arrows']],
  ['Last Trumpeter', ['soak:The Last Call', 'combo:Bugle Signals'], 'march:Muster of the Dead', ['wave:Charge Sounded', 'shield:The Final Note']],
  ['Orchard Under the Skin', ['pool:Rotten Windfall', 'tether:Root Under the Skin'], 'pull:The Orchard Breathes In', ['march:Seedlings', 'brk:Roots Heave the Floor']],
  ['Spore Bell', ['soak:Toll of Spores', 'pool:Spore Bloom'], 'pull:The Bell Inhales', ['attune:Bride and Groom', 'wave:Spore Tide']],
  ['Breathing Lintel', ['pull:The Lintel Breathes', 'frontal:Lintel Fall'], 'brk:The Doorway Collapses', ['soak:Keystone Weight', 'beams:The Turning Door']],
  ['Kiln Without a Door', ['pool:Kiln Slag', 'soak:Stoke the Kiln'], 'carry:Quench the Kiln:Quench Jar:the Flue', ['beams:Firing Vents', 'brk:The Kiln Floor Cracks']],
  ['High Mirror Penitent', ['attune:Mirror and Shadow', 'beam:Reflected Penance'], 'shield:The High Mirror', ['combo:Penitent\'s Rite', 'beams:Turning Mirrors']],
  ['False Angles', ['beams:False Angles', 'combo:Crooked Liturgy'], 'brk:The Floor Folds', ['tether:Plumb Line', 'attune:Light Through the Wrong Window']],
  ['Inward-Facing Crown', ['pull:The Crown Turns Inward', 'attune:Two Faces of the Crown'], 'shield:The Inward Ward', ['spread:Coronation Brand', 'brk:The Throne Floor']],
  ['Glass Wound', ['beams:Rays of the Glass Wound', 'attune:Facet and Flaw'], 'brk:The Glass Floor Shatters', ['soak:Bleed the Glass', 'beam:Mirror Lance']],
  ['Twelfth Toll', ['soak:The Twelfth Toll', 'combo:Chime Sequence'], 'shield:Midnight Strikes', ['wave:Peal Wave', 'pull:The Bell\'s Mouth']],
  ['Black Stair', ['combo:Black Stair Litany', 'tether:Saint\'s Chain'], 'brk:The Stair Gives Way', ['beam:Martyr\'s Ray', 'pool:Black Ichor']],
  // ---- the twenty castle guardians
  ['Iron Table Marshal', ['frontal:Silver-Plate Duel', 'soak:A Place at the Table'], 'march:The Serving Line', ['combo:Courses of the Feast', 'beam:The Lit Place Settings']],
  ['Book of Broken Oaths', ['beam:The Rewritten Line', 'combo:Clauses'], 'shield:The Clasps Close', ['attune:Ink and Gilt', 'brk:Torn Pages']],
  ['Armourer of the Hollow Crown', ['frontal:Hammer Stroke', 'pool:Molten Slag'], 'carry:Quench the Crown:Cold Ingot:the Quench Trough', ['soak:The Hollow Crown Drops', 'beams:Bellows Blast']],
  ['Third Latch', ['combo:Three Latches', 'frontal:Latch Bar'], 'brk:The Portcullis Drops', ['tether:Gate Chain', 'soak:Hinge Weight']],
  ['Bell Without a Clapper', ['soak:The Silent Toll', 'frontal:The Bell Swings'], 'pull:The Bell\'s Mouth', ['combo:Peal Without Sound', 'brk:The Belfry Floor']],
  ['Brazier Duke', ['pool:Pour the Coals', 'beams:Grating Flames'], 'carry:Open the Ash Chute:Chute Key:the Ash Chute', ['soak:The Coal Scuttle', 'march:Stokers to the Grate']],
  ['Crypt Procession General', ['march:Tomb Guard Procession', 'frontal:The General\'s Sabre'], 'wave:The Procession Advances', ['soak:Ring the Rear Niche', 'shield:The Crypt Seal']],
  ['Long Stacks Regent', ['combo:Index Order', 'pool:Ink Blot'], 'wave:The Shelf Banks Slide', ['beam:The Reading Lamp', 'brk:The Stacks Fall']],
  ['Ash Chancellor', ['attune:Candle and Ash', 'soak:Snuff the Row'], 'beams:Row by Row', ['carry:Carry the Last Candle:Last Candle:the Altar', 'shield:Ash Benediction']],
  ['Oubliette Elector', ['tether:Spectral Bars', 'spread:Vote of Exile'], 'brk:The Oubliette Opens', ['combo:Ballot Order', 'pull:Down the Pit']],
  ['Sixfold Sentinel', ['combo:Six Stances', 'frontal:The Shielded Turn'], 'shield:The Sixfold Guard', ['soak:The Sentinel\'s Weight', 'beams:Rotating Guard']],
  ['Gilt Balcony', ['beam:Rail-Post Bolt', 'attune:Gilt and Shadow'], 'beams:The Third Post Turns Bright', ['spread:A Pinned Spell', 'brk:The Balcony Rail Breaks']],
  ['Windward Black Knight', ['frontal:Wind Dash', 'wave:Gale Front'], 'shield:The Storm Shield', ['pull:Eye of the Storm', 'soak:Lightning Rod']],
  ['Queen of Iron Pennants', ['beams:Pennant Whips', 'tether:Pennant Cord'], 'wave:Weighted Pennants', ['march:The Menagerie Loose', 'combo:Lash Pattern']],
  ['Spire Warden', ['frontal:The Warden\'s Halberd', 'soak:Hold the Landing'], 'brk:The Stair Collapses', ['tether:Spire Rope', 'pull:The Tower Draws Breath']],
  ['Hand Behind the Visor', ['pull:The Visor Opens', 'combo:Hand Signs'], 'shield:The Closed Visor', ['spread:Shadow Grip', 'beam:Strike the Wrist']],
  ['Stair That Bears a Crown', ['wave:Folding Steps', 'soak:The Level Step'], 'brk:The Stair Folds', ['frontal:Crest Strike', 'pull:Stairwell Draught']],
  ['Duke of the Last Span', ['beams:Two Sweeps', 'frontal:Span Rake'], 'brk:The Last Span Breaks', ['soak:Bridge Toll', 'carry:Carry the Keystone:Keystone:the Arch']],
  ['Living Siege Mantle', ['beams:Orbiting Plate', 'pool:Siege Pitch'], 'shield:Mantle of Plates', ['march:Loose Plate Gathers', 'soak:Strike the Harness']],
  ["High Ward's Eclipse", ['attune:The Two-Colour Beam', 'beams:The Bright Seam'], 'pull:Totality', ['soak:Umbral Weight', 'brk:Darkness Falls']],
];
// everyone else (ward lords and captains): the mechanics their names and deeds suggest
const THEMES = [
  ['tether', /(chain|hook|rope|web|thread|braid|clothesline|tar rope|leash|cord|cuff|gaol|clamp)/], ['soak', /(bell|toll|drum|chime|trumpet|tithe|tax|weight|coffer|census|count)/],
  ['wave', /(water|drown|flood|tide|eel|moat|silt|sluice|canal|bubbl|wave|stampede|swath|sludge)/], ['carry', /(ash|ember|cinder|soot|brazier|candle|lantern|coal|kiln)/],
  ['attune', /(mirror|glass|face|portrait|prism|gilt|two-colou?r)/], ['shield', /(shell|shield|plate|mantle|armou?r|castellan|barnacle|crown)/],
  ['brk', /(roof|tenement|masonry|slab|stair|bridge|floor|lid|niche|window|arch)/], ['march', /(procession|rank|skeleton|fleet|moth|swarm|march|muster|cocoon|nine|wreckage)/],
  ['pull', /(breath|inhale|dust|maw|below|leviathan|undertow)/], ['combo', /(sequence|order|finger|spell|cadence|stance|eyes in)/],
  ['frontal', /(charge|rear|swing|hammer|blade|cleave|halberd|lunge)/], ['beams', /(beam|rail|sweep|lane|ray)/],
  ['pool', /(pool|silk|spit|venom|poison|pitch|slag)/], ['spread', /(mark|brand|copies|curse)/], ['beam', /(altar|relic|bait|lamp)/],
];
const NAMES = {
  soak: ['Weight of the {N}', 'The {N} Toll'], combo: ['The {N} Litany', 'Steps of the {N}'], brk: ['The Floor Gives Way', 'Collapse of the {N}'], shield: ['Ward of the {N}', 'Bulwark of the {N}'],
  carry: ['Carry the Ember'], tether: ['The {N}\'s Chain'], frontal: ['{N} Cleave', 'Sweep of the {N}'], wave: ['Tide of the {N}'], beams: ['The Turning {N}'], attune: ['Gold and Violet'],
  march: ['Call of the {N}'], pull: ['Breath of the {N}'], pool: ['Drip of the {N}'], spread: ['Mark of the {N}'], beam: ['Intercept the {N}'],
};
const ORDER = ['soak', 'combo', 'frontal', 'tether', 'brk', 'shield', 'carry', 'wave', 'beams', 'attune', 'march', 'pull', 'pool', 'spread', 'beam'];
const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
const parse = (s) => { const [id, name, item, socket] = s.split(':'); return { id, name, item, socket }; };
function themed(art, m) {
  const name = (art && art.name) || m.name || 'Lord', txt = `${name} ${art?.does || ''} ${art?.counter || ''} ${art?.at || ''}`.toLowerCase(), h = hash(name);
  const noun = name.split(/\s+/).slice(-1)[0];
  const score = (id) => THEMES.filter(([k, re]) => k === id && re.test(txt)).length * 10 + ((h >> (ORDER.indexOf(id) % 24)) & 7);
  const ids = ORDER.slice().sort((a, b) => score(b) - score(a));
  const big = ids.find((id) => BIG.has(id) && score(id) >= 10) || ['shield', 'brk', 'carry', 'wave', 'pull'][h % 5];
  const rest = ids.filter((id) => id !== big);
  const nm = (id) => { const L = NAMES[id]; return `${id}:${L[h % L.length].replace("{N}'s", /s$/.test(noun) ? `${noun}'` : `${noun}'s`).replace('{N}', noun)}`; };
  return [null, [nm(rest[0]), nm(rest[1])], nm(big), [nm(rest[2]), nm(rest[3])]];
}
/** The script a boss of this art fights by: its authored one, else one read off its name and deeds. */
export function scriptFor(art, m = {}) {
  const n = (art && art.name) || m.name || '';
  const S = SCRIPTS.find(([k]) => n.includes(k)) || themed(art, m);
  return { loop: S[1].map(parse), big: parse(S[2]), adds: S[3].map(parse), authored: !!S[0] };
}

// =============================================================================================== the free-standing boss
class Script {
  constructor(C, plan) {
    Object.assign(this, { C, team: 'enemy', loop: plan.loop.slice(), big: plan.big, adds: plan.adds, marks: plan.marks, li: 0, gap: 3.5, energy: 0, cur: null, log: {} });
    this.rate = 100 / ({ ward: 32, lord: 28, guardian: 24 }[C.tier] || 28);
    C.label = () => `${this.marks.length ? `Stage ${C.pi + 1}/${this.marks.length + 1} · ` : ''}${this.cur ? this.cur.name : `Energy ${Math.floor(this.energy)}%`}${C.shield > 0 ? ` · Ward ${Math.ceil(100 * C.shield / C.shieldMax)}%` : ''}`;
  }
  get world() { return this.C.m.world; }
  set world(v) {}
  update(dt) {
    const C = this.C, m = C.m;
    if (!C.alive()) { this.endCur(); C.cleanup(); return false; }
    C.tick(dt);
    const p = C.p; if (!p || p.dead) return true;
    if (C.pi < this.marks.length && m.hp < m.maxHp * this.marks[C.pi]) this.nextStage();
    if (this.cur) {
      if (this.cur.update(dt) === false || !C.alive()) { const c = this.cur; this.endCur(); this.gap = c.lethal ? 2.5 : 1.6; if (BURN_AFTER.has(c.id) && c.big) C.burn(8, 1.5); }
      else if (m.bossT !== undefined) m.bossT = Math.max(m.bossT, 0.8);   // the boss's own patterns wait their lane
      return true;
    }
    if (!m.awake || dist(m.x, m.y, p.x, p.y) > 16 || C.stunned) return true;
    this.energy = Math.min(100, this.energy + dt * this.rate);
    if ((this.gap -= dt) > 0) return true;
    const big = this.energy >= 100;
    this.start(big ? this.big : this.loop[this.li++ % this.loop.length], big);
    if (big) this.energy = 0;
    return true;
  }
  start(s, big) {
    const C = this.C, m = C.m;
    this.cur = MECHS[s.id](C, s.name, s); this.cur.id = s.id; this.cur.big = big;
    this.log[s.id] = (this.log[s.id] || 0) + 1;
    floatText(m.x, m.y, headZ(m) + 12, s.name, big ? '#ff9050' : '#ffd0a0', big ? 17 : 15, { life: 1.6, vz: 18 });
    if (m.bossT !== undefined) m.bossT = Math.max(m.bossT, 1.2);
  }
  endCur() { if (!this.cur) return; this.cur.end && this.cur.end(); this.cur = null; this.C.freeze(false); }
  nextStage() {
    const C = this.C, m = C.m;
    C.stage = (C.stage || 0) + 1; C.R.pi = C.stage;
    const a = this.adds[C.stage - 1];
    if (a) { if (this.loop.length >= 3) this.loop.shift(); this.loop.push(a); }
    this.energy = 100; this.gap = Math.min(this.gap, 1);
    m.dmg *= 1.05;
    const title = `${m.name}`.toUpperCase(), sub = `Stage ${C.stage + 1}: ${a ? a.name : this.big.name}`;
    if (m.world.boss === m || dist(m.x, m.y, C.p.x, C.p.y) < 16) UI.centerMsg(title, sub, 2.4);
    addEffect(new Ring(m.x, m.y, 0.3, 5, 0.8, C.E.glow, 6)); sfx('roar');
  }
  danger(out) { if (this.cur && this.cur.danger) this.cur.danger(out); }
  autoGoal() { return this.cur && this.cur.autoGoal ? this.cur.autoGoal() : null; }
  draw(ctx) {
    const C = this.C, m = C.m, p = C.p;
    if (!m.awake || !p || dist(m.x, m.y, p.x, p.y) > 22) return;
    if (this.cur && this.cur.draw) this.cur.draw(ctx);
    C.drawHero(ctx);
    plate(ctx, m, { name: this.cur ? this.cur.name : null, k: this.cur ? clamp(this.cur.t / (this.cur.castT || 1), 0, 1) : 0, energy: this.energy / 100, shield: C.shield > 0 ? C.shield / C.shieldMax : 0, big: this.cur && this.cur.big, stage: this.marks.length ? `${C.pi + 1}/${this.marks.length + 1}` : '' });
  }
}
/** The cast bar, energy bar and ward bar over a boss's head. */
function plate(ctx, m, o) {
  const px = isoX(m.x, m.y), py = isoY(m.x, m.y) - headZ(m) - 26, W = 110;
  ctx.save(); ctx.textAlign = 'center';
  if (o.name) {
    ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(px - W / 2 - 1, py - 1, W + 2, 9);
    ctx.fillStyle = o.big ? '#ff7030' : '#e0a040'; ctx.fillRect(px - W / 2, py, W * o.k, 7);
    ctx.strokeStyle = '#ffffff'; ctx.globalAlpha = 0.8; ctx.lineWidth = 1; ctx.strokeRect(px - W / 2 - 0.5, py - 0.5, W + 1, 8);
    ctx.globalAlpha = 1; ctx.font = 'bold 12px Georgia, serif'; ctx.lineWidth = 3; ctx.strokeStyle = '#000'; ctx.fillStyle = o.big ? '#ffb080' : '#ffe0b0';
    ctx.strokeText(o.name, px, py - 4); ctx.fillText(o.name, px, py - 4);
  }
  const y2 = py + 11;
  if (o.energy != null) { ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(px - W / 2, y2, W, 4); ctx.fillStyle = '#40b0ff'; ctx.fillRect(px - W / 2, y2, W * o.energy, 4); }
  if (o.shield) { ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(px - W / 2, y2 + 6, W, 5); ctx.fillStyle = CYAN; ctx.fillRect(px - W / 2, y2 + 6, W * o.shield, 5); }
  if (o.stage) { ctx.font = 'bold 10px Georgia, serif'; ctx.fillStyle = '#d0c0b0'; ctx.fillText(`Stage ${o.stage}`, px + W / 2 + 22, y2 + 4); }
  ctx.restore();
}

/**
 * Give an Act III boss its raid-style script. tier: 'ward' (a City State ward lord), 'lord' (a castle wing lord or
 * captain) or 'guardian' (a 5th-floor guardian). Attaches on its first update if it isn't in a world yet.
 */
export function applyBossMechanics(m, art, tier = 'lord') {
  if (!m || m.bossScript || m.raid) return m;
  art = art || null;
  const plan = scriptFor(art, m);
  const stages = tier === 'guardian' ? 3 : tier === 'lord' ? 2 : (art && art.horror) || hash((art && art.id) || m.name || '') % 2 ? 2 : 1;
  plan.marks = stages === 3 ? [0.66, 0.33] : stages === 2 ? [0.5] : [];
  const C = makeCtx(m, { tier, el: m.el });
  const S = new Script(C, plan);
  m.bossScript = S; S.plan = plan; S.tier = tier;
  const attach = () => { if (S.on) return; S.on = true; m.world.addHazard(S); };
  if (m.world) attach();
  else { const up = m.update; m.update = function (dt) { if (this.world && !S.on) { delete this.update; attach(); } return up.call(this, dt); }; }
  return m;
}

// =============================================================================================== inside a raid
class Runner {   // one mechanic of a raid boss (game/phobosraids.js sigs): its act, cast bar and hooks
  constructor(C, act) { Object.assign(this, { C, act, team: 'enemy' }); C.busy = this; }
  update(dt) {
    const C = this.C, R = C.raid;
    if (!C.alive() || R.inter && !this.act.inter) { this.stop(); return false; }
    if (this.act.update(dt) === false) { const a = this.act; this.stop(); if (BURN_AFTER.has(a.id) && a.big) C.burn(8, 1.5); return false; }
    if (this.act.lethal || C.frozen) R.gap = Math.max(R.gap, 0.4);   // nothing else of his lands over it
    return true;
  }
  stop() { const C = this.C; if (this.act.end) this.act.end(); C.freeze(false); if (C.busy === this) C.busy = null; if (C.shield > 0 && this.act.shield) C.shield = 0; }
  danger(out) { if (this.act.danger) this.act.danger(out); }
  autoGoal() { return this.act.autoGoal ? this.act.autoGoal() : null; }
  draw(ctx) { const m = this.C.m; if (this.act.draw) this.act.draw(ctx); this.C.drawHero(ctx); plate(ctx, m, { name: this.act.name, k: clamp(this.act.t / (this.act.castT || 1), 0, 1), shield: this.C.shield > 0 ? this.C.shield / this.C.shieldMax : 0, big: this.act.big, energy: this.C.raid.energy != null ? this.C.raid.energy / 100 : null }); }
}
/** The fight context of a raid boss (made once; its timers tick while the boss lives). */
export function raidCtx(R) {
  if (R.mctx && R.mctx.m === R.m) return R.mctx;
  const C = R.mctx = makeCtx(R.m, { tier: 'raid', el: R.tpl.el, raid: R });
  R.m.world.addHazard({ update(dt) { if (!C.alive()) { C.cleanup(); return false; } C.tick(dt); return true; }, draw(ctx) { if (!C.busy) C.drawHero(ctx); } });
  return C;
}
/** Start catalogue mechanic id on a raid boss (one at a time). big: a survival test that earns a burn window. */
export function runMech(R, id, name, o = {}) {
  const C = raidCtx(R);
  if (C.busy || !MECHS[id] || !R.m.world) return null;
  const a = MECHS[id](C, name, o); a.id = id; a.big = !!o.big; a.inter = !!o.inter;
  return R.m.world.addHazard(new Runner(C, a));
}
void addLight; void hero;
