// The Treasure Imp drawn live in 3D (assets/models/beasts/treasureimp.glb from tools/blender/treasureimp.py, through
// gfx/beasts3d.js). Looks only: game/happenings.js owns its rules. Here it runs with a stride matched to the ground it
// covers (a panicked scamper when the hero is close), turns to jeer or peer about when nobody is near, flinches and
// sheds spinning coins when struck, bounces its sack (bones `sack`, `sack_top`, `lantern`, `keys`), glows gold and
// leaves a glitter trail. impDeathFx / impEscapeFx play its end after the creature is gone: a tumble with the sack
// bursting into a fountain of coins, or a leap into a rift.
import { G } from '../state.js';
import { isoX, isoY } from '../core/view.js';
import { drawBeast, beastReady, preloadBeasts } from './beasts3d.js';
import { registerBeastLook } from './beastlooks.js';
import { addEffect, glowSprite, spawn, sparkle } from './vfx.js';

const ID = 'treasureimp', TAU = Math.PI * 2, LIGHT = 1.5;   // it carries a lantern: lit brighter than the dungeon's own
const DUR = { idle: 2.9, peek: 3.58, run: 1.125, panic: 0.667, hit: 1.29, death: 2.375, jump: 2.2, taunt: 3.17 };
export const impK = () => (G.touch ? 50 : 60);        // px per model unit: the imp stands ~0.95, its sack tops 1.2
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a)), clamp = (x, a, b) => Math.max(a, Math.min(b, x)), ease = (u) => u * u * (3 - 2 * u);
const rnd = (a, b) => a + Math.random() * (b - a);
const GEMS = ['#ff3048', '#30e8a8', '#60b0ff'];

// ---------------------------------------------------------------- coins: spinning, bouncing, glinting
class Coins {
  constructor() { this.c = []; this.t = 0; }
  /** n coins from (x, y, z px): out along ang (+- spread) at sp tiles/s, up at vz px/s; every seventh a gem. */
  add(x, y, z, n, o = {}) {
    for (let i = 0; i < n; i++) {
      const a = o.ang != null ? o.ang + rnd(-1, 1) * (o.spread ?? 0.8) : rnd(0, TAU), s = rnd(0.35, 1) * (o.sp || 2.2);
      this.c.push({ x, y, z, vx: Math.cos(a) * s, vy: Math.sin(a) * s, vz: rnd(0.55, 1) * (o.vz || 150), ph: rnd(0, TAU), w: rnd(9, 22), life: rnd(0.9, 1.5) * (o.life || 1), t: 0,
        r: rnd(0.8, 1.15), gem: i % 7 === 6 ? GEMS[(i / 7 | 0) % 3] : null });
    }
    return this;
  }
  update(dt) {
    this.t += dt;
    for (let i = this.c.length - 1; i >= 0; i--) {
      const c = this.c[i];
      c.t += dt; c.x += c.vx * dt; c.y += c.vy * dt; c.z += c.vz * dt; c.vz -= 520 * dt; c.ph += c.w * dt;
      if (c.z < 0) { c.z = 0; if (c.vz < -60) { c.vz *= -0.42; c.vx *= 0.6; c.vy *= 0.6; c.w *= 0.7; } else { c.vz = 0; c.vx *= 0.8; c.vy *= 0.8; c.w *= 0.9; } }
      if (c.t > c.life) this.c.splice(i, 1);
    }
    return this.c.length > 0 || this.t < 0.2;
  }
  draw(ctx) {
    const R = G.touch ? 2.7 : 3.3;
    for (const c of this.c) {
      const px = isoX(c.x, c.y), py = isoY(c.x, c.y) - c.z, r = R * c.r, f = Math.cos(c.ph), w = Math.max(0.7, r * Math.abs(f));
      ctx.globalAlpha = clamp((c.life - c.t) * 4, 0, 1);
      if (c.z > 1) { ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(px, py + c.z, r * 0.9, r * 0.4, 0, 0, TAU); ctx.fill(); }
      if (c.gem) { ctx.fillStyle = c.gem; ctx.beginPath(); ctx.moveTo(px, py - r * 1.3); ctx.lineTo(px + w, py); ctx.lineTo(px, py + r * 1.3); ctx.lineTo(px - w, py); ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillRect(px - 0.6, py - r * 0.7, 1.2, 1.2); continue; }
      ctx.fillStyle = '#7a4a06'; ctx.beginPath(); ctx.ellipse(px, py, w + 0.9, r + 0.9, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = f > 0 ? '#ffd23c' : '#e8a41c'; ctx.beginPath(); ctx.ellipse(px, py, w, r, 0, 0, TAU); ctx.fill();
      if (Math.abs(f) > 0.86) { // face on: it catches the light
        ctx.fillStyle = '#fff8c8'; ctx.beginPath(); ctx.ellipse(px - w * 0.25, py - r * 0.3, w * 0.4, r * 0.35, 0, 0, TAU); ctx.fill();
        const g = glowSprite('#ffe680'), s = r * 3.4; ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha *= 0.55; ctx.drawImage(g, px - s, py - s, s * 2, s * 2); ctx.globalCompositeOperation = 'source-over';
      }
    }
    ctx.globalAlpha = 1;
  }
}
/** Coins (looks only, no gold) flung from (x, y). */
export function coinSpray(x, y, z, n, o) { return addEffect(new Coins().add(x, y, z, n, o)); }

function shadow(ctx, px, py, k, a = 0.32) { ctx.globalAlpha = a; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(px, py, k * 0.36, k * 0.17, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
function aura(ctx, px, py, k, a) {
  const g = glowSprite('#ffd040'), r = k * 1.25;
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a;
  ctx.drawImage(g, px - r, py - r * 0.45, r * 2, r * 0.9); ctx.drawImage(g, px - r * 0.8, py - k * 0.75 - r * 0.8, r * 1.6, r * 1.6);
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
}
/** The sack, lantern and keys swinging: b the bounce (-1..1), s a slower sway. */
const swing = (b, s, burst = 1) => ({ sack: { rx: b * 0.13, rz: s * 0.07, s: burst }, sack_top: { rx: b * 0.2, rz: s * 0.14 }, lantern: { rx: -b * 0.5, rz: s * 0.6 }, keys: { rx: b * 0.5, rz: s * 0.35 } });

function drawImp(ctx, m) {
  if (!beastReady(ID)) return false;
  const S = m.imp3 || (m.imp3 = { yaw: m.facing || 0, lx: m.x, ly: m.y, last: G.time, runT: 0, mv: 0, near: 0, hp: m.hp, hitT: 0, idleT: 0, idle: 'taunt', wob: 0, wobV: 0, trail: 0, drop: 0 });
  if (m.dead) return true; // its end is played by ImpDeath / ImpEscape
  const dt = clamp(G.time - S.last, 0, 0.1); S.last = G.time;
  const dx = m.x - S.lx, dy = m.y - S.ly, moved = Math.hypot(dx, dy), p = G.player; S.lx = m.x; S.ly = m.y;
  const moving = dt > 0 && moved / dt > 0.4 && moved < 2;
  const pd = p ? Math.hypot(p.x - m.x, p.y - m.y) : 99;
  S.mv += ((moving ? 1 : 0) - S.mv) * Math.min(1, dt * 9); S.near += ((pd < 4.5 ? 1 : 0) - S.near) * Math.min(1, dt * 5);
  if (moving) { S.yaw += wrap(Math.atan2(dy, dx) - S.yaw) * Math.min(1, dt * 12); S.runT += moved / (S.near > 0.5 ? 1.9 : 2.4); S.idleT = 0; S.idle = 'taunt'; }
  else if (dt > 0) { // nobody near: it turns to jeer at the hero, then peers about for more to steal
    if (S.mv < 0.2) S.idleT += dt;
    if (S.idleT > DUR[S.idle]) { S.idleT = 0; S.idle = S.idle === 'taunt' ? 'peek' : 'taunt'; }
    if (p && S.idle === 'taunt') S.yaw += wrap(Math.atan2(p.y - m.y, p.x - m.x) - S.yaw) * Math.min(1, dt * 5);
  }
  if (m.hp < S.hp - 0.5) { // struck: a flinch, and the sack coughs coins
    S.hitT = 0.42; S.wobV += 9;
    const a = p ? Math.atan2(m.y - p.y, m.x - p.x) : rnd(0, TAU);
    coinSpray(m.x, m.y, 30, G.touch ? 5 : 8, { ang: a, spread: 1.3, sp: 2.6, vz: 190 }); sparkle(m.x, m.y, 34, '#fff0a0', 5, 0.35);
  }
  S.hp = m.hp; if (S.hitT > 0) S.hitT -= dt;
  // the sack: a spring kicked by hits, bounced by every footfall
  S.wobV += (-S.wob * 90 - S.wobV * 7) * dt; S.wob += S.wobV * dt;
  const run = S.near > 0.5 ? 'panic' : 'run', rt = S.runT * DUR[run], ph = S.runT * TAU * 2;
  const b = clamp(Math.sin(ph) * S.mv + S.wob + Math.sin(G.time * 2.2) * 0.12 * (1 - S.mv), -1.6, 1.6), sw = Math.sin(ph * 0.5 + 0.6) * S.mv + S.wob * 0.5;
  const px = isoX(m.x, m.y), py = isoY(m.x, m.y), k = impK() * (m.scale || 1) / 0.9, hop = Math.abs(Math.sin(ph * 0.5)) * 2.5 * S.mv;
  // gold glow and a glitter trail
  if (S.mv > 0.4 && (S.trail -= dt) <= 0) {
    S.trail = 0.05;
    spawn({ type: 'glow', x: m.x - Math.cos(S.yaw) * 0.35 + rnd(-0.15, 0.15), y: m.y - Math.sin(S.yaw) * 0.35 + rnd(-0.15, 0.15), z: rnd(4, 40), vz: rnd(-6, 14), life: rnd(0.35, 0.8), size: rnd(1.5, 3.6), size1: 0, color: Math.random() < 0.3 ? '#fff6c0' : '#ffc830', add: true });
    if ((S.drop -= 1) <= 0) { S.drop = Math.round(rnd(5, 10)); coinSpray(m.x - Math.cos(S.yaw) * 0.3, m.y - Math.sin(S.yaw) * 0.3, 34, 1, { sp: 0.7, vz: 90, life: 0.8 }); }
  }
  shadow(ctx, px, py, k);
  aura(ctx, px, py, k, 0.3 + 0.08 * Math.sin(G.time * 5));
  const hit = S.hitT > 0 ? Math.sin(Math.PI * (1 - S.hitT / 0.42)) : 0, idle = S.idle;
  const o = { key: 'imp' + m.id, k, yaw: S.yaw, bones: swing(b, sw), flash: m.flash > 0 ? Math.min(1, m.flash * 8) * 0.4 : 0, alpha: m.alpha ?? 1, light: LIGHT };
  if (hit > 0.05) Object.assign(o, { clip: S.mv > 0.5 ? run : idle, t: S.mv > 0.5 ? rt : S.idleT, clip2: 'hit', t2: 0.12 + (0.42 - S.hitT) * 1.1, mix: hit * 0.75 });
  else Object.assign(o, { clip: idle, t: S.idleT, loop: true, clip2: run, t2: rt, mix: S.mv });
  const ok = drawBeast(ctx, ID, px, py - hop, o);
  m.screenTop = py - k * 1.3;
  return ok;
}
registerBeastLook(['treasure_imp'], drawImp);
export function preloadImp() { preloadBeasts(ID); }

// ---------------------------------------------------------------- its ends (world hazards: drawn in depth order)
class ImpDeath {
  constructor(m, src) {
    const S = m.imp3, a = src ? Math.atan2(m.y - src.y, m.x - src.x) : S.yaw + Math.PI;
    Object.assign(this, { id: m.id, x: m.x, y: m.y, x0: m.x, y0: m.y, a, yaw: a + Math.PI, t: 0, dur: 3.4, ground: false, k: impK() * (m.scale || 1) / 0.9, wave: 0 });
    this.coins = coinSpray(m.x, m.y, 26, G.touch ? 26 : 44, { sp: 3.2, vz: 400, life: 1.5 });
  }
  get depth() { return this.x + this.y; }
  update(dt) {
    this.t += dt;
    const u = ease(Math.min(1, this.t / 0.55)); this.x = this.x0 + Math.cos(this.a) * 0.55 * u; this.y = this.y0 + Math.sin(this.a) * 0.55 * u;
    // the sack empties in spurts as it goes down
    if (this.wave < 4 && this.t > 0.12 + this.wave * 0.14) { this.wave++; this.coins.add(this.x, this.y, 22, G.touch ? 6 : 12, { sp: 2.4, vz: 330 - this.wave * 30, life: 1.3 }); sparkle(this.x, this.y, 30, '#fff0a0', 6, 0.5); }
    return this.t < this.dur;
  }
  draw(ctx) {
    const px = isoX(this.x, this.y), py = isoY(this.x, this.y), al = clamp((this.dur - this.t) / 0.8, 0, 1), flat = 1 - 0.62 * ease(clamp((this.t - 0.1) / 0.6, 0, 1));
    shadow(ctx, px, py, this.k, 0.3 * al);
    if (this.t < 0.7) aura(ctx, px, py, this.k * (1 + this.t * 1.5), 0.55 * (1 - this.t / 0.7));
    drawBeast(ctx, ID, px, py, { key: 'impdead' + this.id, k: this.k, yaw: this.yaw, clip: 'death', t: this.t * 1.35, loop: false, bones: swing(Math.sin(this.t * 14) * (1 - Math.min(1, this.t)), 0, flat), alpha: al, light: LIGHT,
      flash: this.t < 0.12 ? 0.5 : 0 });
  }
}
class ImpEscape {
  constructor(m) {
    const S = m.imp3, map = m.world && m.world.map;
    let a = S.yaw, d = 1.5;
    if (map) for (const t of [0, 0.7, -0.7, 1.5, -1.5, 2.4, -2.4, Math.PI]) if (map.walkable(m.x + Math.cos(S.yaw + t) * d, m.y + Math.sin(S.yaw + t) * d)) { a = S.yaw + t; break; }
    Object.assign(this, { id: m.id, x: m.x, y: m.y, x0: m.x, y0: m.y, gx: m.x + Math.cos(a) * d, gy: m.y + Math.sin(a) * d, a, t: 0, dur: 1.5, ground: false, k: impK() * (m.scale || 1) / 0.9, done: false });
  }
  get depth() { return Math.max(this.x + this.y, this.gx + this.gy) + 0.01; }
  update(dt) {
    this.t += dt;
    const u = clamp((this.t - 0.3) / 0.6, 0, 1); this.x = this.x0 + (this.gx - this.x0) * u; this.y = this.y0 + (this.gy - this.y0) * u;
    if (u > 0.2 && u < 0.9 && Math.random() < dt * 40) spawn({ type: 'glow', x: this.x, y: this.y, z: 20 + Math.sin(u * Math.PI) * 30, life: 0.5, size: 3, size1: 0, color: '#ffd040', add: true });
    if (u >= 1 && !this.done) { this.done = true; coinSpray(this.gx, this.gy, 30, 4, { ang: this.a + Math.PI, spread: 0.9, sp: 1.6, vz: 160 }); sparkle(this.gx, this.gy, 30, '#e0a0ff', 14, 0.5); }
    return this.t < this.dur;
  }
  draw(ctx) {
    const t = this.t, open = ease(clamp(t / 0.3, 0, 1)) * (1 - ease(clamp((t - 1.05) / 0.4, 0, 1))), gx = isoX(this.gx, this.gy), gy = isoY(this.gx, this.gy) - this.k * 0.62;
    // the rift: a violet tear rimmed in gold, turning
    if (open > 0.01) {
      const rx = this.k * 0.5 * open, ry = this.k * 0.78 * open, g = glowSprite('#b060ff'), h = glowSprite('#ffd040');
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.7 * open; ctx.drawImage(g, gx - rx * 2.4, gy - ry * 1.9, rx * 4.8, ry * 3.8); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
      ctx.fillStyle = '#12041e'; ctx.beginPath(); ctx.ellipse(gx, gy, rx, ry, 0, 0, TAU); ctx.fill();
      ctx.lineCap = 'round';
      for (let i = 0; i < 5; i++) {
        const a0 = t * (5 + i) * (i % 2 ? -1 : 1) + i * 1.3, f = 1 - i * 0.17;
        ctx.strokeStyle = i % 2 ? '#ffd860' : '#c070ff'; ctx.lineWidth = (i ? 1.6 : 2.6) * open; ctx.globalAlpha = open * (i ? 0.8 : 1);
        ctx.beginPath(); ctx.ellipse(gx, gy, rx * f, ry * f, 0, a0, a0 + (i ? 2.2 : TAU)); ctx.stroke();
      }
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5 * open; ctx.drawImage(h, gx - rx * 1.2, gy - ry * 1.2, rx * 2.4, ry * 2.4); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    }
    const u = clamp((t - 0.3) / 0.6, 0, 1);
    if (u >= 1) return;
    const px = isoX(this.x, this.y), py = isoY(this.x, this.y), z = Math.sin(u * Math.PI) * this.k * 0.45 + u * this.k * 0.25, s = 1 - 0.7 * ease(clamp((u - 0.45) / 0.55, 0, 1));
    shadow(ctx, px, py, this.k * s, 0.3 * (1 - u));
    // a crouch, the spring, then tucked small into the rift
    drawBeast(ctx, ID, px, py - z, { key: 'impgone' + this.id, k: this.k * s, yaw: this.a, clip: 'jump', t: t < 0.3 ? 0.25 + t * 1.2 : 0.62 + u * 0.75, loop: false, pitch: 0.5 * Math.sin(u * Math.PI),
      bones: swing(Math.sin(t * 16) * 0.8, 0), alpha: 1 - clamp((u - 0.8) / 0.2, 0, 1), glow: [0.22 * u, 0.12 * u, 0.3 * u], light: LIGHT });
  }
}
/** The imp died: play its tumble and the bursting sack. False while the model is not there (the old gore plays as before). */
export function impDeathFx(m, src) {
  if (!m.imp3 || !beastReady(ID) || !m.world) return false;
  m.world.addHazard(new ImpDeath(m, src)); return true;
}
/** The imp got away: it leaps into a rift. */
export function impEscapeFx(m) {
  if (!m.imp3 || !beastReady(ID) || !m.world) return false;
  m.world.addHazard(new ImpEscape(m)); return true;
}
