// THE ENDLESS SIEGE's moving parts, drawn (docs/ENDLESS_SIEGE.md): the portcullis gates on their lines, the gate
// winches, the ballistae on the corner towers, the keep's standard and the ballista bolts in flight. Gates, winches,
// ballistae and the standard are world.chests entries (render.drawChest calls their draw); bolts are effects.
import { G } from '../state.js';
import { HW, HH } from '../core/view.js';
import { clamp } from '../core/util.js';
import { glowSprite } from './vfx.js';
import { keepSprite } from '../world/siege.js';

const hash = (k, s) => { let h = Math.imul(k ^ 0x5bd1e995, 0x27d4eb2d) ^ s; h = Math.imul(h ^ (h >>> 15), 0x85ebca6b); return ((h ^ (h >>> 13)) >>> 0) / 4294967296; };

function sprite(ctx, s, x, y, flip = false, alpha = 1, dy = 0) {
  if (!s) return;
  const { spr, k } = s, w = spr.w * k, h = spr.h * k;
  if (alpha < 1) ctx.globalAlpha = alpha;
  if (flip) { ctx.save(); ctx.translate(x, 0); ctx.scale(-1, 1); ctx.drawImage(spr.img, spr.sx, spr.sy, spr.w, spr.h, spr.ox * k, y + spr.oy * k + dy, w, h); ctx.restore(); }
  else ctx.drawImage(spr.img, spr.sx, spr.sy, spr.w, spr.h, x + spr.ox * k, y + spr.oy * k + dy, w, h);
  ctx.globalAlpha = 1;
}
const KS = new Map();
const ks = (name) => { if (!KS.has(name)) KS.set(name, keepSprite(name)); return KS.get(name); };
/** Forget the cached sprites (a new level may have new keep-pack art). */
export function resetSiegeArt() { KS.clear(); }

function bar(ctx, x, y, f, w = 46, col = null) {
  ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(x - w / 2 - 1, y - 1, w + 2, 6);
  ctx.fillStyle = col || (f > 0.6 ? '#7fd050' : f > 0.3 ? '#e8c040' : '#e04a30');
  ctx.fillRect(x - w / 2, y, w * clamp(f, 0, 1), 4);
}
function label(ctx, x, y, text, color = '#ffe2a0') {
  ctx.font = '600 11px Georgia, serif'; ctx.textAlign = 'center';
  ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.8)'; ctx.strokeText(text, x, y);
  ctx.fillStyle = color; ctx.fillText(text, x, y);
}
function pulseRing(ctx, x, y, color, r = 22) {
  const a = 0.35 + Math.sin(G.time * 4) * 0.2;
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a;
  ctx.drawImage(glowSprite(color), x - r * 1.4, y - r * 0.9, r * 2.8, r * 1.4);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}

/**
 * A gate: an iron portcullis between two timber posts, standing on its line (g.line) across a three-tile passage. It rises
 * when the hero walks through and drops behind him; battered, its bars bend and fall out; broken, it is a heap.
 */
export function drawGate(ctx, g) {
  const P = (u, z) => {
    const [x, y] = g.axis === 'x' ? [g.a0 + u, g.line] : [g.line, g.a0 + u];
    return [(x - y) * HW, (x + y) * HH - z];
  };
  const f = g.hp / g.max, lift = g.lift * 40, H = 50, B = 62, wood = '#4a3020', woodL = '#7a5434';   // grid H tall, beam at B px
  const line = (a, b, w, c) => { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.stroke(); };
  ctx.lineCap = 'butt';
  if (g.broken) {
    // the wreck: stubs of the posts, bent bars on the ground, splinters
    for (const u of [0.05, 2.95]) { line(P(u, 0), P(u, 26), 6, wood); line(P(u, 22), P(u, 30), 4, '#2a1a10'); }
    for (let k = 0; k < 9; k++) {
      const u = 0.25 + k * 0.3, r = hash(k, g.a0);
      const [x, y] = P(u, 0);
      ctx.strokeStyle = '#2c2c30'; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.moveTo(x, y - 2); ctx.lineTo(x + (r - 0.5) * 30, y - 4 - r * 6); ctx.stroke();
    }
    return;
  }
  // the iron grid
  const bars = 10, z0 = lift, z1 = lift + H;
  for (let k = 1; k < bars; k++) {
    const u = (k / bars) * 3, gone = hash(k, g.a0 * 7) > f + 0.25;
    if (gone) continue;
    const bend = (1 - f) * (hash(k, 3) - 0.5) * 10, [xb, yb] = P(u, z0), [xt, yt] = P(u, z1);
    ctx.strokeStyle = '#25252a'; ctx.lineWidth = 2.6;
    ctx.beginPath(); ctx.moveTo(xt, yt); ctx.lineTo(xb + bend, yb); ctx.stroke();
    ctx.fillStyle = '#1a1a1e'; ctx.beginPath(); ctx.moveTo(xb + bend - 2.5, yb - 1); ctx.lineTo(xb + bend + 2.5, yb); ctx.lineTo(xb + bend, yb + 6); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(160,170,190,0.35)'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(xt - 0.8, yt); ctx.lineTo(xb + bend - 0.8, yb); ctx.stroke();
  }
  for (let r = 0; r < 4; r++) {
    const z = z0 + 8 + r * 13;
    if (hash(r, g.a0 + 11) > f + 0.4) continue;
    line(P(0.05, z), P(2.95, z), 2.2, '#2a2a30');
  }
  // timber posts and the beam over them (the portcullis runs up into the beam)
  for (const u of [0.05, 2.95]) { line(P(u, 0), P(u, B + 4), 7, wood); line(P(u, 0), P(u, B + 4), 2, woodL); }
  line(P(-0.05, B), P(3.05, B), 9, wood); line(P(-0.05, B + 4), P(3.05, B + 4), 2, woodL);
  if (g.hitT > 0) {   // a blow lands: the grid shudders white for a moment
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = g.hitT * 3;
    line(P(0.2, z0 + H / 2), P(2.8, z0 + H / 2), 20, 'rgba(255,220,180,0.25)');
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }
  if (g.hp < g.max || g.attackers) { const [x, y] = P(1.5, B + 16); bar(ctx, x, y, f, 52); }
}

/** A gate's winch, inside: turn it to mend the gate. It glows while the gate needs work. */
export function drawWinch(ctx, w, x, y) {
  const g = w.gate;
  if (w.needs()) pulseRing(ctx, x, y, g.broken ? '#ff6040' : '#ffb040', 20);
  sprite(ctx, ks('chain_winch'), x, y, w.flip);
  const p = G.player;
  if (p && w.needs() && Math.hypot(p.x - w.x, p.y - w.y) < 5) label(ctx, x, y - 58, g.broken ? 'Rebuild the gate' : 'Mend the gate', g.broken ? '#ff9070' : '#ffd080');
}

/** A ballista on its tower: it swings to face its mark, kicks back when it looses, and shows its bolts. */
export function drawBallista(ctx, b, x, y) {
  const s = ks('keep_ballista');
  if (!b.ammo) pulseRing(ctx, x, y, '#ff8040', 26);
  sprite(ctx, s, x, y, Math.cos(b.aim) - Math.sin(b.aim) < 0, 1, b.recoil * 3);
  for (let k = 0; k < b.max; k++) {   // the bolts racked beside it
    const px = x - (b.max - 1) * 3 + k * 6, py = y - 64;
    ctx.fillStyle = k < b.ammo ? '#e8d0a0' : 'rgba(40,30,20,0.6)'; ctx.fillRect(px - 1, py - 7, 2.5, 9);
    if (k < b.ammo) { ctx.fillStyle = '#9aa0aa'; ctx.fillRect(px - 1.5, py - 9, 3.5, 3); }
  }
  const p = G.player;
  if (p && b.ammo < b.max && Math.hypot(p.x - b.foot[0], p.y - b.foot[1]) < 5) label(ctx, x, y - 76, b.ammo ? 'Reload the ballista' : 'Load the ballista', '#ffd080');
}

/** The keep's standard: sound the horn under it to bring on the next wave early. */
export function drawStandard(ctx, s, x, y) {
  if (s.ready()) pulseRing(ctx, x, y, '#ffd060', 26);
  sprite(ctx, ks('royal_banner_stand'), x, y);
  const p = G.player;
  if (p && s.ready() && Math.hypot(p.x - s.x, p.y - s.y) < 5) label(ctx, x, y - 112, 'Sound the horn', '#ffe090');
}

/** A fire-pot on the walk over a gate (the Burning River Wall): a brazier of oil, burning while it is full. */
export function drawFirePot(ctx, o, x, y) {
  if (o.full) pulseRing(ctx, x, y, '#ff6020', 18);
  sprite(ctx, ks('brazier_ash'), x, y, false, o.full ? 1 : 0.7);
  if (o.full) {
    ctx.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 3; k++) {
      const f = Math.sin(G.time * 9 + k * 2.1), h = 14 + f * 4;
      ctx.globalAlpha = 0.55; ctx.drawImage(glowSprite(k ? '#ff9030' : '#ffd060'), x - 9 + k * 4, y - 40 - h, 12, h + 6);
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }
  const p = G.player;
  if (p && o.full && Math.hypot(p.x - o.x, p.y - o.y) < 4) label(ctx, x, y - 54, 'Tip the fire-pot', '#ffb070');
}

/**
 * A ballista bolt: a heavy shaft from the tower top (z0, absolute world px) down along a straight line; `onPass(x0,
 * y0, x1, y1)` is called with the stretch it crossed each frame (the run hits what stands on it).
 */
export class SiegeBolt {
  constructor(x0, y0, z0, ang, len, z1, onPass) {
    Object.assign(this, { x0, y0, z0, ang, len, z1, onPass, s: 0, speed: 30, t: 0 });
  }
  at(s) {
    const k = s / this.len, x = this.x0 + Math.cos(this.ang) * s, y = this.y0 + Math.sin(this.ang) * s;
    return [x, y, this.z0 + (this.z1 - this.z0) * k];
  }
  update(dt) {
    this.t += dt;
    const s0 = this.s; this.s = Math.min(this.len, this.s + this.speed * dt);
    const a = this.at(s0), b = this.at(this.s);
    this.onPass(a[0], a[1], b[0], b[1]);
    return this.s < this.len;
  }
  draw(ctx) {
    const scr = (s) => { const [x, y, z] = this.at(Math.max(0, s)); return [(x - y) * HW, (x + y) * HH - z]; };
    const h = scr(this.s), t = scr(this.s - 1.1), tr = scr(this.s - 3.2);
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(255,230,190,0.18)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(...tr); ctx.lineTo(...t); ctx.stroke();
    ctx.strokeStyle = '#5a3a20'; ctx.lineWidth = 3.4; ctx.beginPath(); ctx.moveTo(...t); ctx.lineTo(...h); ctx.stroke();
    ctx.strokeStyle = '#c8a070'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(...t); ctx.lineTo(...h); ctx.stroke();
    const a = Math.atan2(h[1] - t[1], h[0] - t[0]);
    ctx.fillStyle = '#b8c0c8'; ctx.beginPath(); ctx.moveTo(h[0] + Math.cos(a) * 6, h[1] + Math.sin(a) * 6);
    ctx.lineTo(h[0] + Math.cos(a + 2.4) * 5, h[1] + Math.sin(a + 2.4) * 5); ctx.lineTo(h[0] + Math.cos(a - 2.4) * 5, h[1] + Math.sin(a - 2.4) * 5); ctx.closePath(); ctx.fill();
  }
}
