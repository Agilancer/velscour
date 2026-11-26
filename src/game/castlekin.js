// The Castle Creatures' mechanics (data/castlekin.js): every one of the 50 plays a rule no other monster has, on top
// of its archetype's AI. A kit is { desc, init(m, s), tick(m, dt, t, d, s), hit(m, tgt, dmg, s), hurt(m, src, dmg, s),
// taken(m, src, el, o, s) -> damage multiplier, death(m, src, s) }, with `s` the monster's own kit state (m.ks).
// tick() runs every frame the monster has a target, before its special moves and AI; returning true takes the frame.
// Monster.update / deal / onDamaged, combat.hit and kill call these (attachKit wires a monster up in makeMonster).
// Hero-side effects this adds to combat.hit: status.rust (takes more damage), status.disarm (deals less),
// status.hunted (monsters hit harder), and `guardedBy` (a Cinder Squire takes half of its ward's hits).
// Hazards publish danger(out) / autoGoal() for auto-play like the raid ones (autoplay.js dangers()).
import { G } from '../state.js';
import { rand, chance, TAU, clamp, angleTo, angleDiff, dist, pick, shuffle } from '../core/util.js';
import { isoX, isoY, HW, HH, camera } from '../core/view.js';
import { sfx } from '../core/audio.js';
import { addEffect, Telegraph, Ring, Bolt, Column, burst, spawn, sparkle, floatText, smoke, addLight, glowSprite } from '../gfx/vfx.js';
import { hit, aoe, kill } from './combat.js';
import { Delayed, Area, lineTargets, coneTargets } from './hazards.js';
import { Monster, makeMonster } from './monster.js';
import { GroundItem } from './loot.js';
import { ambush } from './mayhem.js';

// ------------------------------------------------------------------------------------------------ helpers
const hero = (m) => { const p = m.world && m.world.player; return p && !p.dead ? p : null; };
const say = (m, text, color = '#ffd0a0', size = 13) => floatText(m.x, m.y, (m.artH || 40) * (m.scale || 1) + 10, text, color, size, { life: 1.3, vz: 18 });
const tele = (o) => addEffect(new Telegraph(o), 'ground');
const dmgR = (m, mul) => [m.dmg * mul * 0.85, m.dmg * mul * 1.1];
/** s[k] counts down; true (and reset to `every`) when it runs out. Call once a frame per key. */
const ready = (s, k, dt, every, first = every * 0.5) => { s[k] = (s[k] ?? first) - dt; if (s[k] > 0) return false; s[k] = every; return true; };
const later = (w, delay, fn) => w.addHazard({ t: delay, update(dt) { if ((this.t -= dt) <= 0) { fn(); return false; } return true; }, draw() {} });
const alive = (m) => m && !m.dead && m.world === G.world;
const blast = (m, x, y, r, delay, mul, el = m.el, o = {}, fx = 'explosion') =>
  m.world.addHazard(new Delayed({ world: m.world, src: m, x, y, r, delay, fx, el: el === 'phys' ? 'fire' : el, dmg: dmgR(m, mul), o }));
const allies = (m, r) => m.world.query(m.x, m.y, r, (c) => c !== m && c.team === m.team && !c.dead && !c.summon && c.targetable !== false && !c.static);
/** A floor spot `r0..r1` tiles from (x, y) the hero can walk to. */
function spotNear(w, x, y, r0, r1, rr = 0.4) {
  for (let i = 0; i < 30; i++) {
    const a = rand(TAU), r = rand(r0, r1), sx = x + Math.cos(a) * r, sy = y + Math.sin(a) * r;
    if (w.map.circleFree(sx, sy, rr) && w.map.flowAt(sx, sy) >= 0) return [sx, sy];
  }
  return null;
}
/** A floor tile beside a wall within r of (x, y), and the point just inside the wall. */
function wallNear(w, x, y, r) {
  const map = w.map;
  for (let i = 0; i < 40; i++) {
    const a = rand(TAU), rr = rand(1, r), cx = Math.floor(x + Math.cos(a) * rr) + 0.5, cy = Math.floor(y + Math.sin(a) * rr) + 0.5;
    if (!map.circleFree(cx, cy, 0.35)) continue;
    for (const [dx, dy] of shuffle([[1, 0], [-1, 0], [0, 1], [0, -1]])) if (!map.isFloor(cx + dx, cy + dy)) return [cx, cy, cx + dx * 0.45, cy + dy * 0.45];
  }
  return null;
}
/** Step away from (x, y). */
const flee = (m, x, y, dt, mul = 1) => { const a = angleTo(x, y, m.x, m.y); m.navTo(m.x + Math.cos(a) * 3, m.y + Math.sin(a) * 3, dt, m.speed * mul); };
/** A creature of `art` beside m (ratlings, hatchlings, a split forge tick). `kit` false: none of its own. */
export function spawnKin(m, art, x, y, o = {}) {
  const w = m.world;
  const c = makeMonster(w, m.arch, w.biome || {}, m.level, 'normal', x, y, 0, { art, swap: m.swap }, o.kit === false);
  if (o.scale) { c.scale = o.scale; c.r *= o.scale; }
  if (o.hp) { c.maxHp *= o.hp; c.hp = c.maxHp; }
  if (o.dmg) c.dmg *= o.dmg;
  c.xp *= o.xp ?? 0.3;
  if (o.name) c.name = o.name;
  c.awake = true; c.hunter = true;
  w.add(c);
  return c;
}

/** Block floor tiles for `dur` seconds (portcullis bars, cages, anvils), drawn by `drawTile`. */
export function blockTiles(w, list, dur, drawTile, o = {}) {
  const map = w.map, tiles = [];
  for (const [tx, ty] of list) {
    const i = ty * map.w + tx;
    if (tx < 0 || ty < 0 || tx >= map.w || ty >= map.h || !map.isFloor(tx + 0.5, ty + 0.5) || map.block[i]) continue;
    if (w.query(tx + 0.5, ty + 0.5, 0.75, (c) => !c.dead && !c.fly).length) continue;
    map.block[i] = 1; tiles.push(i);
  }
  if (!tiles.length) return null;
  map.flowFrom = [-9, -9];
  const cx = tiles.reduce((a, i) => a + (i % map.w), 0) / tiles.length, cy = tiles.reduce((a, i) => a + ((i / map.w) | 0), 0) / tiles.length;
  return w.addHazard({ t: 0, tiles, ...o, get depth() { return cx + cy + 1; },
    update(dt) { this.t += dt; if (this.t > dur || (o.owner && o.owner.dead && o.dieWith)) { for (const i of tiles) map.block[i] = 0; map.flowFrom = [-9, -9]; return false; } return true; },
    draw(ctx) { const k = Math.min(1, this.t / 0.2), f = clamp((dur - this.t) / 0.3, 0, 1); for (const i of tiles) drawTile(ctx, i % map.w + 0.5, ((i / map.w) | 0) + 0.5, k * f, this.t); } });
}
export const drawBars = (ctx, x, y, k) => {
  const px = isoX(x, y), py = isoY(x, y), h = 46 * k;
  ctx.save(); ctx.globalAlpha = Math.min(1, k * 1.2);
  ctx.fillStyle = '#2a2420'; ctx.fillRect(px - 15, py - h - 4, 30, 5);
  ctx.strokeStyle = '#5a5048'; ctx.lineWidth = 3;
  for (let b = -12; b <= 12; b += 6) { ctx.beginPath(); ctx.moveTo(px + b, py + 2); ctx.lineTo(px + b, py - h); ctx.stroke(); }
  ctx.strokeStyle = '#9a8a70'; ctx.lineWidth = 1;
  for (let b = -12; b <= 12; b += 6) { ctx.beginPath(); ctx.moveTo(px + b - 1, py); ctx.lineTo(px + b - 1, py - h); ctx.stroke(); }
  ctx.fillStyle = '#7a6a58'; for (let b = -12; b <= 12; b += 6) ctx.fillRect(px + b - 2, py, 4, 4);
  ctx.restore();
};

/** A small thing thrown that runs code on what it hits: webs, keys, cutlery, relic bolts. */
export class Shot {
  constructor(o) { Object.assign(this, { t: 0, speed: 8, range: 8, r: 0.35, color: '#e0d0b0', size: 1, z: 28, trail: true }, o); this.vx = Math.cos(this.ang) * this.speed; this.vy = Math.sin(this.ang) * this.speed; this.life = this.range / this.speed; }
  get depth() { return this.x + this.y + 0.3; }
  danger(out) { out.push({ line: true, x: this.x, y: this.y, x1: this.x + this.vx * 0.5, y1: this.y + this.vy * 0.5, r: this.r + 0.4 }); }
  update(dt) {
    const w = this.world;
    this.t += dt;
    if (this.home && !this.home.dead) { const a = angleTo(this.x, this.y, this.home.x, this.home.y); this.vx = Math.cos(a) * this.speed; this.vy = Math.sin(a) * this.speed; if (dist(this.x, this.y, this.home.x, this.home.y) < 0.5) { this.onEnd && this.onEnd(this); return false; } }
    const nx = this.x + this.vx * dt, ny = this.y + this.vy * dt;
    if (!this.ghost && !w.map.isFloor(nx, ny)) { this.onEnd && this.onEnd(this); return false; }
    this.x = nx; this.y = ny;
    for (const c of w.hostiles(this.team, this.x, this.y, this.r + 0.2)) {
      if (this.hits && this.hits.has(c)) continue;
      if (this.onHit) this.onHit(c, this);
      if (!this.pierce) return false;
      (this.hits = this.hits || new Set()).add(c);
    }
    if (this.trail && chance(dt * 30)) spawn({ type: 'glow', x: this.x, y: this.y, z: this.z, vz: 0, life: 0.25, size: 3 * this.size, size1: 0, color: this.color, add: true });
    if (this.t > this.life && !this.home) { this.onEnd && this.onEnd(this); return false; }
    return this.t < 8;
  }
  draw(ctx) {
    const px = isoX(this.x, this.y), py = isoY(this.x, this.y) - this.z, a = Math.atan2(isoY(this.vx, this.vy), isoX(this.vx, this.vy));
    ctx.save(); ctx.translate(px, py);
    if (this.look === 'blade') {
      ctx.rotate(a + this.t * (this.spin || 0)); ctx.fillStyle = '#e8eef4'; ctx.fillRect(-7, -1.5, 12, 3); ctx.fillStyle = '#8a6a40'; ctx.fillRect(-11, -2, 5, 4);
    } else {
      ctx.globalCompositeOperation = 'lighter'; const s = 10 * this.size;
      ctx.drawImage(glowSprite(this.color), -s, -s, s * 2, s * 2);
      if (this.look === 'web') { ctx.globalCompositeOperation = 'source-over'; ctx.strokeStyle = '#e8e0d0'; ctx.lineWidth = 1; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(i) * s, Math.sin(i) * s * 0.6); ctx.stroke(); } }
    }
    ctx.restore();
  }
}
const shot = (m, ang, o) => m.world.addHazard(new Shot({ world: m.world, team: m.team, src: m, x: m.x, y: m.y, ang, ...o }));

/** A floor circle that does something each frame to what stands in it; `bad` ones are dangers for auto-play. */
class Patch {
  constructor(o) { Object.assign(this, { t: 0, ground: true, dur: 5, r: 1, color: '#c0a060', bad: true, alpha: 0.35 }, o); }
  danger(out) { if (this.bad) out.push({ x: this.x, y: this.y, r: this.r + 0.3 }); }
  inside(c) { return dist(c.x, c.y, this.x, this.y) < this.r; }
  update(dt) { this.t += dt; if (this.tick) this.tick(dt, this); return this.t < this.dur && !this.dead; }
  draw(ctx) {
    const px = isoX(this.x, this.y), py = isoY(this.x, this.y), k = clamp(this.t / 0.25, 0, 1) * clamp((this.dur - this.t) / 0.5, 0, 1);
    ctx.save(); ctx.globalAlpha = this.alpha * k; ctx.fillStyle = this.color;
    ctx.beginPath(); ctx.ellipse(px, py, this.r * HW * 1.41, this.r * HH * 1.41, 0, 0, TAU); ctx.fill();
    ctx.globalAlpha = 0.6 * k; ctx.strokeStyle = this.edge || this.color; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(px, py, this.r * HW * 1.41, this.r * HH * 1.41, 0, 0, TAU); ctx.stroke();
    if (this.paint) this.paint(ctx, px, py, k);
    ctx.restore();
  }
}
const patch = (w, o) => w.addHazard(new Patch(o));

/** A line between two creatures, drawn every frame while `keep()` holds (chains, tethers, bodyguard links). */
function link(w, a, b, color, keep, o = {}) {
  return w.addHazard({ t: 0, a, b, ...o, get depth() { return Math.max(a.x + a.y, b.x + b.y) + 0.5; },
    danger(out) { if (o.hurts) out.push({ line: true, x: a.x, y: a.y, x1: b.x, y1: b.y, r: 0.6 }); },
    update(dt) { this.t += dt; if (o.tick) o.tick(dt, this); return keep(this); },
    draw(ctx) {
      const ax = isoX(a.x, a.y), ay = isoY(a.x, a.y) - (o.za ?? 24), bx = isoX(b.x, b.y), by = isoY(b.x, b.y) - (o.zb ?? 24);
      ctx.save();
      if (o.chain) {
        const n = Math.max(3, Math.round(Math.hypot(bx - ax, by - ay) / 9));
        for (let i = 0; i <= n; i++) {
          const k = i / n, x = ax + (bx - ax) * k, y = ay + (by - ay) * k + Math.sin(k * Math.PI) * 10;
          ctx.strokeStyle = i % 2 ? '#8a8078' : '#5a524c'; ctx.lineWidth = 2.5;
          ctx.beginPath(); ctx.ellipse(x, y, i % 2 ? 4 : 2, i % 2 ? 2 : 4, 0, 0, TAU); ctx.stroke();
        }
      } else {
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.6 + Math.sin(this.t * 8) * 0.2;
        ctx.strokeStyle = color; ctx.lineWidth = o.width || 3; ctx.setLineDash(o.dash || []);
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
      }
      ctx.restore();
    } });
}

// ------------------------------------------------------------------------------------------------ the kits
export const KITS = {};
const kit = (k, def) => { KITS[k] = def; };

// ===== the gatehouse
kit('portcullis', {
  desc: 'drops a portcullis behind the hero, cutting off the retreat, then rushes in',
  tick(m, dt, t, d, s) {
    if (s.rush > 0) { s.rush -= dt; m.speed = s.spd * (s.rush > 0 ? 1.7 : 1); }
    if (!t.isPlayer || d > 6.5 || d < 1.5 || !m.world.map.los(m.x, m.y, t.x, t.y) || !ready(s, 'drop', dt, 10, 3)) return false;
    const w = m.world, a = angleTo(m.x, m.y, t.x, t.y), bx = t.x + Math.cos(a) * 1.7, by = t.y + Math.sin(a) * 1.7, px = -Math.sin(a), py = Math.cos(a), list = [];
    for (let k = -2.5; k <= 2.5; k += 0.5) list.push([Math.floor(bx + px * k), Math.floor(by + py * k)]);
    tele({ kind: 'line', x: bx - px * 2.5, y: by - py * 2.5, ang: Math.atan2(py, px), len: 5, w: 0.5, dur: 0.6, color: '#c0a070' });
    later(w, 0.6, () => {
      if (!alive(m)) return;
      const uniq = [...new Map(list.map((q) => [q.join(), q])).values()];
      if (blockTiles(w, uniq, 4.5, drawBars)) { camera.shake(5); sfx('thud', 0.9); say(m, 'PORTCULLIS!', '#e0c080', 15); smoke(bx, by, 6, '#6a5a4a', 6, 12); }
    });
    s.spd = s.spd || m.speed; s.rush = 3;
    return false;
  },
});

kit('harpy', {
  desc: 'circles high over the hero where nothing reaches it, then dives along a marked line and lands',
  tick(m, dt, t, d, s) {
    s.mode = s.mode || 'ground'; s.t = (s.t || 0) + dt;
    const w = m.world;
    if (s.mode === 'ground') {
      if (s.t > 4 && d < 9) { s.mode = 'up'; s.t = 0; s.a = angleTo(t.x, t.y, m.x, m.y); sfx('swing', 0.5); }
      return false;
    }
    m.moving = true;
    if (s.mode === 'up') {
      m.targetable = false; m.z = Math.min(90, (m.z || 0) + 200 * dt);
      s.a += dt * 1.4;
      const gx = t.x + Math.cos(s.a) * 4, gy = t.y + Math.sin(s.a) * 4;
      w.map.move(m, clamp(gx - m.x, -1, 1) * m.speed * 1.4 * dt, clamp(gy - m.y, -1, 1) * m.speed * 1.4 * dt, true);
      m.face(angleTo(m.x, m.y, t.x, t.y));
      if (s.t > 2.4) {
        s.mode = 'aim'; s.t = 0; s.ang = angleTo(m.x, m.y, t.x, t.y); s.len = Math.min(9, dist(m.x, m.y, t.x, t.y) + 2);
        tele({ kind: 'line', x: m.x, y: m.y, ang: s.ang, len: s.len, w: 0.7, dur: 0.6, color: '#ff6040' });
        s.danger = w.addHazard({ x: m.x, y: m.y, a: s.ang, L: s.len, t: 0, danger(out) { out.push({ line: true, x: this.x, y: this.y, x1: this.x + Math.cos(this.a) * this.L, y1: this.y + Math.sin(this.a) * this.L, r: 0.9 }); }, update(dt2) { return (this.t += dt2) < 1.1; }, draw() {} });
      }
      return true;
    }
    if (s.mode === 'aim') { m.moving = false; if (s.t > 0.6) { s.mode = 'dive'; s.t = 0; s.hit = new Set(); sfx('swing', 0.8); } return true; }
    // dive
    const step = 16 * dt;
    w.map.move(m, Math.cos(s.ang) * step, Math.sin(s.ang) * step, true);
    m.z = Math.max(0, 90 * (1 - s.t / 0.5));
    for (const c of lineTargets(w, m.team, m.x - Math.cos(s.ang) * step, m.y - Math.sin(s.ang) * step, m.x, m.y, 0.6)) {
      if (s.hit.has(c)) continue; s.hit.add(c);
      m.deal(c, m.dmg * 1.7, 'phys', { knock: 1.2, ang: s.ang });
    }
    if (s.t > 0.5 || !w.map.isFloor(m.x + Math.cos(s.ang) * 0.6, m.y + Math.sin(s.ang) * 0.6)) {
      s.mode = 'ground'; s.t = 0; m.z = 0; m.targetable = true;
      smoke(m.x, m.y, 4, '#6a5a4a', 5, 10); sfx('thud', 0.6);
    }
    return true;
  },
  death(m) { m.z = 0; },
});

kit('ballista', {
  desc: 'keeps its distance and plants its back-mounted ballista for a long piercing bolt',
  tick(m, dt, t, d, s) {
    if (s.aim > 0) {
      m.moving = false; m.face(s.ang);
      if ((s.aim -= dt) <= 0) {
        const w = m.world, L = w.map.rayLength(m.x, m.y, s.ang, 13), group = new Set();
        for (const c of lineTargets(w, m.team, m.x, m.y, m.x + Math.cos(s.ang) * L, m.y + Math.sin(s.ang) * L, 0.45)) if (!group.has(c)) { group.add(c); m.deal(c, m.dmg * 2.3, 'phys', { knock: 1.6, ang: s.ang, bleed: true }); }
        addEffect(new Bolt(m.x, m.y, 30, m.x + Math.cos(s.ang) * L, m.y + Math.sin(s.ang) * L, 30, '#e8d8b0', 0.2, 4));
        sfx('bow', 0.9); camera.shake(2);
      }
      return true;
    }
    if (d < 2.6) { flee(m, t.x, t.y, dt, 1.1); return true; }
    if (d < 11 && m.world.map.los(m.x, m.y, t.x, t.y) && ready(s, 'b', dt, 6, 2)) {
      s.aim = 1.1; s.ang = angleTo(m.x, m.y, t.x, t.y);
      tele({ kind: 'line', x: m.x, y: m.y, ang: s.ang, len: m.world.map.rayLength(m.x, m.y, s.ang, 13), w: 0.45, dur: 1.1, color: '#ffb060' });
      m.world.addHazard({ x: m.x, y: m.y, a: s.ang, t: 0, danger(out) { out.push({ line: true, x: this.x, y: this.y, x1: this.x + Math.cos(this.a) * 13, y1: this.y + Math.sin(this.a) * 13, r: 0.8 }); }, update(dt2) { return (this.t += dt2) < 1.15; }, draw() {} });
      say(m, 'WINDING...', '#ffb060', 11);
      return true;
    }
    return false;
  },
});

kit('leech', {
  desc: 'latches onto the hero and drinks until struck hard enough; leaves slowing moat water behind',
  tick(m, dt, t, d, s) {
    const w = m.world;
    if (m.moving && ready(s, 'pool', dt, 1.4)) patch(w, { x: m.x, y: m.y, r: 0.9, dur: 5, color: '#305a6a', edge: '#6aa0b0', tick: (dt2, P) => { for (const c of w.hostiles(m.team, P.x, P.y, P.r)) c.status.slow = { t: 0.3, amt: 0.35 }; } });
    if (!s.on) return false;
    const p = s.on;
    if (p.dead || (s.lt -= dt) <= 0) { s.on = null; return false; }
    m.x = p.x + Math.cos(s.oa) * 0.5; m.y = p.y + Math.sin(s.oa) * 0.5; m.moving = false; m.face(angleTo(m.x, m.y, p.x, p.y));
    p.status.slow = { t: 0.2, amt: 0.35 };
    if (ready(s, 'drain', dt, 0.5)) { const got = m.deal(p, m.dmg * 0.3, 'blood', { crit: false }); m.heal(got * 2); burst(p.x, p.y, 30, 'blood', 4, 2); }
    return true;
  },
  hit(m, t, dmg, s) {
    if (s.on || !t.isPlayer || (s.cd || 0) > m.lifeT) return;
    s.on = t; s.lt = 3.5; s.took = 0; s.oa = rand(TAU); s.cd = m.lifeT + 7;
    floatText(t.x, t.y, 70, 'LATCHED', '#c04040', 14);
  },
  hurt(m, src, dmg, s) {
    if (!s.on) return;
    if ((s.took += dmg) > m.maxHp * 0.12) { s.on = null; m.status.stun = { t: 1.5 }; m.kbx = rand(-3, 3); m.kby = rand(-3, 3); say(m, 'PRIED OFF', '#a0ffa0'); }
  },
});

kit('arrowslit', {
  desc: 'melts into the nearest wall and shoots from an arrow slit where it cannot be struck',
  tick(m, dt, t, d, s) {
    const w = m.world;
    if (s.hide) {
      m.moving = false; m.targetable = false; m.alpha = 0.3; m.x = s.hide[2]; m.y = s.hide[3];
      if (ready(s, 'arrow', dt, 0.85, 0.6) && w.map.los(s.hide[0], s.hide[1], t.x, t.y)) {
        const a = angleTo(m.x, m.y, t.x, t.y);
        shot(m, a, { color: '#ff5030', speed: 11, range: 12, ghost: true, look: 'blade', onHit: (c) => m.deal(c, m.dmg * 1.1, 'phys', { bleed: true }) });
        sfx('bow', 0.5);
      }
      if ((s.ht -= dt) <= 0) { m.x = s.hide[0]; m.y = s.hide[1]; s.hide = null; m.targetable = true; m.alpha = undefined; smoke(m.x, m.y, 20, '#6a6070', 5, 8); }
      return true;
    }
    if (ready(s, 'h', dt, 8, 2) && d < 10) {
      const spot = wallNear(w, m.x, m.y, 5);
      if (spot) { s.hide = spot; s.ht = 3.6; smoke(m.x, m.y, 20, '#6a6070', 5, 8); say(m, 'INTO THE WALL', '#b0a0c0', 11); }
    }
    return false;
  },
  death(m, src, s) { if (s.hide) { m.x = s.hide[0]; m.y = s.hide[1]; } },
});

kit('chainpack', {
  desc: 'chained to its packmates: the chain between them tears at anything that crosses it',
  tick(m, dt, t, d, s) {
    const w = m.world;
    if (!s.partner || s.partner.dead || dist(m.x, m.y, s.partner.x, s.partner.y) > 7) {
      s.partner = null;
      const mates = allies(m, 6).filter((c) => c.kit !== KITS.chainpack || !(c.ks.partner === m));
      const pref = mates.filter((c) => c.kit === KITS.chainpack);
      const p2 = (pref.length ? pref : mates).sort((a, b) => dist(m.x, m.y, a.x, a.y) - dist(m.x, m.y, b.x, b.y))[0];
      if (p2) {
        s.partner = p2;
        const hits = new Map();
        link(w, m, p2, '#8a8078', () => alive(m) && !p2.dead && s.partner === p2 && dist(m.x, m.y, p2.x, p2.y) <= 7, { chain: true, za: 14, zb: 14, hurts: true, tick: (dt2, L) => {
          for (const c of lineTargets(w, m.team, m.x, m.y, p2.x, p2.y, 0.3)) {
            if ((hits.get(c) || 0) > L.t) continue;
            hits.set(c, L.t + 0.6);
            m.deal(c, m.dmg * 0.6, 'phys', { bleed: true, crit: false });
            c.status.slow = { t: 0.6, amt: 0.4 };
            spawn({ type: 'spark', x: c.x, y: c.y, z: 20, vz: 60, life: 0.3, size: 2, color: '#d0c0a0' });
          }
        } });
      }
    }
    return false;
  },
});

kit('soot', {
  desc: 'sleeps as stone (all but immune), wakes in a cloud of choking soot, then sets again',
  init(m, s) { s.stone = true; s.st = rand(1, 3); },
  tick(m, dt, t, d, s) {
    s.st -= dt;
    if (s.stone) {
      m.moving = false; m.heal(m.maxHp * 0.03 * dt);
      if (s.st <= 0 || d < 1.4 || s.woken) { s.stone = false; s.woken = false; s.st = 4.5; this.wake(m, s); }
      return true;
    }
    if (s.st <= 0) { s.stone = true; s.st = 3.5; say(m, 'TURNS TO STONE', '#a0a0a8', 11); burst(m.x, m.y, 30, 'phys', 10, 2); }
    return false;
  },
  wake(m) {
    const w = m.world;
    w.addHazard(new Area({ world: w, src: m, x: m.x, y: m.y, r: 2.3, dur: 5, tick: 0.5, dmg: dmgR(m, 0.18), el: 'shadow', fx: 'void', slow: true }));
    smoke(m.x, m.y, 20, '#1a1614', 22, 18); aoe(w, m, m.x, m.y, 1.5, m.dmg * 1.1, 'phys', { knock: 1 });
    sfx('roar', 0.5); camera.shake(3);
  },
  taken(m, src, el, o, s) { if (!s.stone) return 1; if (!o.dot && chance(0.3)) floatText(m.x, m.y, 50, 'STONE', '#a0a0a8', 10); if (!o.dot) s.woken = s.woken || chance(0.12); return 0.12; },
});

kit('barbican', {
  desc: 'its shell turns slowly to face the hero and shrugs off blows from the front: flank it',
  tick(m, dt, t, d, s) {
    const want = angleTo(m.x, m.y, t.x, t.y);
    s.face = s.face ?? want;
    s.face += clamp(angleDiff(s.face, want), -1.1 * dt, 1.1 * dt);
    if (!s.mark) s.mark = m.world.addHazard({ ground: true, update() { return alive(m); }, draw(ctx) {
      const px = isoX(m.x, m.y), py = isoY(m.x, m.y);
      ctx.save(); ctx.globalAlpha = 0.45; ctx.strokeStyle = '#c0b090'; ctx.lineWidth = 3; ctx.beginPath();
      for (let i = 0; i <= 12; i++) { const a = s.face - 1.1 + i / 12 * 2.2, x = m.x + Math.cos(a) * 1.1, y = m.y + Math.sin(a) * 1.1; i ? ctx.lineTo(isoX(x, y), isoY(x, y)) : ctx.moveTo(isoX(x, y), isoY(x, y)); }
      ctx.stroke(); ctx.restore();
    } });
    if (s.ram > 0) {
      s.ram -= dt; m.moving = true;
      m.world.map.move(m, Math.cos(s.face) * 9 * dt, Math.sin(s.face) * 9 * dt);
      for (const c of m.world.hostiles(m.team, m.x, m.y, m.r + 0.5)) if (!s.rh.has(c)) { s.rh.add(c); m.deal(c, m.dmg * 1.6, 'phys', { knock: 2, ang: s.face, stun: 0.6 }); }
      return true;
    }
    if (d < 6 && Math.abs(angleDiff(s.face, want)) < 0.3 && ready(s, 'r', dt, 7, 3)) {
      s.ram = 0.7; s.rh = new Set();
      tele({ kind: 'line', x: m.x, y: m.y, ang: s.face, len: 6.3, w: 0.8, dur: 0.4, color: '#c0b090' });
    }
    return false;
  },
  taken(m, src, el, o, s) {
    if (!src || o.dot || s.face === undefined) return 1;
    if (Math.abs(angleDiff(s.face, angleTo(m.x, m.y, src.x, src.y))) > 1.1) return 1.15;
    if (chance(0.35)) { floatText(m.x, m.y, 40, 'DEFLECTED', '#c0b090', 10); spawn({ type: 'spark', x: m.x, y: m.y, z: 20, vz: 60, life: 0.3, size: 2, color: '#fff0c0' }); }
    return 0.2;
  },
});

kit('rustpike', {
  desc: 'a long pike thrust; every wound rusts the hero, who takes more from every blow',
  tick(m, dt, t, d, s) {
    if (s.aim > 0) {
      m.moving = false;
      if ((s.aim -= dt) <= 0) {
        const w = m.world;
        for (const c of lineTargets(w, m.team, m.x, m.y, m.x + Math.cos(s.ang) * 4.6, m.y + Math.sin(s.ang) * 4.6, 0.45)) m.deal(c, m.dmg * 1.5, 'phys', { knock: 0.6, ang: s.ang });
        addEffect(new Bolt(m.x, m.y, 26, m.x + Math.cos(s.ang) * 4.6, m.y + Math.sin(s.ang) * 4.6, 26, '#a07050', 0.15, 3)); sfx('swing', 0.7);
      }
      return true;
    }
    if (d > 1.6 && d < 4.4 && ready(s, 'p', dt, 5, 2)) {
      s.aim = 0.6; s.ang = angleTo(m.x, m.y, t.x, t.y); m.face(s.ang);
      tele({ kind: 'line', x: m.x, y: m.y, ang: s.ang, len: 4.6, w: 0.45, dur: 0.6, color: '#c08050' });
      return true;
    }
    return false;
  },
  hit(m, t) {
    const r = t.status.rust, amt = Math.min(0.42, (r && r.t > 0 ? r.amt : 0) + 0.06);
    t.status.rust = { t: 7, amt };
    floatText(t.x, t.y, 60, `RUSTED +${Math.round(amt * 100)}%`, '#c08050', 11);
  },
});

kit('grate', {
  desc: 'drops through the floor grates, comes up behind the hero, and brings ratlings with it',
  tick(m, dt, t, d, s) {
    const w = m.world;
    if (s.under) {
      s.under -= dt; m.moving = true; m.targetable = false; m.alpha = 0.15;
      m.navTo(s.gx, s.gy, dt, m.speed * 2.2);
      if (chance(dt * 25)) spawn({ type: 'dot', x: m.x + rand(-0.3, 0.3), y: m.y + rand(-0.3, 0.3), z: 2, vz: rand(30, 70), g: 220, life: 0.5, size: 2.5, color: '#3a3028' });
      if (s.under <= 0) {
        m.targetable = true; m.alpha = undefined; s.under = 0;
        aoe(w, m, m.x, m.y, 1.2, m.dmg * 1.2, 'phys', { bleed: true });
        smoke(m.x, m.y, 4, '#4a4038', 5, 10); sfx('thud', 0.5);
        s.kids = (s.kids || []).filter((c) => !c.dead);
        for (let i = 0; i < 2 && s.kids.length < 4; i++) {
          const sp = spotNear(w, m.x, m.y, 0.6, 1.6);
          if (sp) s.kids.push(spawnKin(m, m.art, sp[0], sp[1], { kit: false, scale: 0.55, hp: 0.22, dmg: 0.45, xp: 0.15, name: 'Ratling' }));
        }
      }
      return true;
    }
    if (d > 2.2 && d < 11 && ready(s, 'u', dt, 6.5, 2.5)) {
      const behind = angleTo(m.x, m.y, t.x, t.y), sp = spotNear(w, t.x + Math.cos(behind) * 1.6, t.y + Math.sin(behind) * 1.6, 0, 0.8) || [t.x, t.y];
      s.under = 1.2; s.gx = sp[0]; s.gy = sp[1];
      tele({ kind: 'circle', x: sp[0], y: sp[1], r: 1.2, dur: 1.2, color: '#a08060' });
      smoke(m.x, m.y, 4, '#4a4038', 4, 10);
      return true;
    }
    return false;
  },
});

// ===== the dungeons
kit('rack', {
  desc: 'webs the hero to the rack: rooted, stretched toward it, and torn while it lasts',
  tick(m, dt, t, d, s) {
    if (d < 7 && d > 1.8 && m.world.map.los(m.x, m.y, t.x, t.y) && ready(s, 'w', dt, 8, 2)) {
      shot(m, angleTo(m.x, m.y, t.x, t.y), { color: '#e0d8c8', speed: 9, range: 8, look: 'web', size: 1.3, onHit: (c) => {
        floatText(c.x, c.y, 70, 'RACKED', '#e0d0c0', 14);
        let k = 0;
        m.world.addHazard({ t: 0, update(dt2) {
          this.t += dt2;
          if (c.dead || this.t > 2.2) return false;
          c.status.slow = { t: 0.2, amt: 0.9 };
          if (alive(m)) { const a = angleTo(c.x, c.y, m.x, m.y); c.kbx += Math.cos(a) * 5 * dt2; c.kby += Math.sin(a) * 5 * dt2; }
          if ((k -= dt2) <= 0) { k = 0.5; hit(m, c, m.dmg * 0.4, 'phys', { dot: true, crit: false }); burst(c.x, c.y, 30, 'blood', 3, 2); }
          return true;
        }, draw(ctx) { if (!alive(m)) return; const ax = isoX(c.x, c.y), ay = isoY(c.x, c.y) - 30, bx = isoX(m.x, m.y), by = isoY(m.x, m.y) - 20; ctx.save(); ctx.strokeStyle = '#e8e0d0'; ctx.globalAlpha = 0.7; for (const o of [-3, 0, 3]) { ctx.beginPath(); ctx.moveTo(ax + o, ay); ctx.lineTo(bx, by + o); ctx.stroke(); } ctx.restore(); }, get depth() { return c.x + c.y + 1; } });
      } });
      sfx('swing', 0.4);
    }
    return false;
  },
});

kit('keyring', {
  desc: 'picks the hero\'s purse and runs; kill it and the gold spills back, with interest',
  tick(m, dt, t, d, s) {
    if (s.run > 0) { s.run -= dt; flee(m, t.x, t.y, dt, 1.5); if (chance(dt * 2)) say(m, pick(['hehehe', 'MINE!', '*jingle*']), '#ffd34a', 11); return true; }
    // it wants the purse, not a fight: it darts in to pick the hero's pocket
    if (t.isPlayer && G.char && G.char.gold > 0 && (s.next || 0) <= m.lifeT) {
      if (d > m.atkRange(t)) { m.chase(dt, t, m.speed * 1.25); return true; }
      if (m.cd <= 0) { m.cd = 1; m.face(angleTo(m.x, m.y, t.x, t.y)); m.deal(t, m.dmg * 0.6, 'phys', { crit: false }); }
      return true;
    }
    return false;
  },
  hit(m, t, dmg, s) {
    const c = G.char;
    if (!t.isPlayer || !c || !(c.gold > 0) || s.run > 0) return;
    const n = Math.max(1, Math.min(Math.floor(c.gold * 0.05), 20 + m.level * 10));
    c.gold -= n; s.stolen = (s.stolen || 0) + n; s.run = 5; s.next = m.lifeT + 9;
    floatText(t.x, t.y, 70, `-${n} GOLD`, '#ffd34a', 14); sfx('pickup', 0.6);
  },
  death(m, src, s) {
    if (!s.stolen) return;
    const w = m.world, n = Math.round(s.stolen * 1.5);
    for (let i = 0; i < 3; i++) w.addLoot(new GroundItem(m.x, m.y, 'gold', { amount: Math.max(1, Math.round(n / 3)) }));
    floatText(m.x, m.y, 60, 'THE PURSE SPILLS', '#ffd34a', 13);
  },
});

/** A wax pool: stand in it too long and it sets round the hero's legs. */
function waxPool(m, x, y, r, dur) {
  const w = m.world;
  patch(w, { x, y, r, dur, color: '#e0c890', edge: '#fff0c0', alpha: 0.45, tick: (dt, P) => {
    const p = w.player;
    if (!p || p.dead) return;
    if (P.inside(p)) {
      p.status.slow = { t: 0.25, amt: 0.3 };
      if ((p._waxAt || 0) < w.time - 0.4) p._waxT = 0;
      if (p._waxAt !== w.time) { p._waxAt = w.time; p._waxT = (p._waxT || 0) + dt; }
      if (p._waxT > 1.4) { p._waxT = 0; p.status.stun = { t: 1.2 }; floatText(p.x, p.y, 70, 'ENCASED IN WAX', '#fff0c0', 14); if (alive(m)) hit(m, p, m.dmg * 0.8, 'fire', { crit: false }); }
    }
  } });
}
kit('tallow', {
  desc: 'leaves pools of hot wax; stand in them too long and they set solid round the hero',
  tick(m, dt, t, d, s) { if (m.moving && ready(s, 'wax', dt, 0.9)) waxPool(m, m.x, m.y, 0.85, 6); return false; },
  death(m) { waxPool(m, m.x, m.y, 1.7, 8); },
});

/** Mimics: sit as furniture until the hero comes close (or strikes), then spring. */
function disguise(name) {
  return (m, s) => { s.dis = true; s.real = m.name; m.name = name; m.aggroRange = 4; };
}
function unmask(m, s) { s.dis = false; m.name = s.real; say(m, 'IT\'S ALIVE!', '#ff6040', 15); sfx('roar', 0.6); camera.shake(3); }
kit('cagemimic', {
  desc: 'sits as an empty cage; when the hero comes near it springs and cages the hero in with it',
  init: disguise('Iron Cage'),
  tick(m, dt, t, d, s) {
    if (!s.dis) return false;
    m.moving = false;
    if (d > 2.4 && m.hp >= m.maxHp) return true;
    unmask(m, s);
    if (t.isPlayer) {
      const cx = Math.floor(t.x), cy = Math.floor(t.y), gap = Math.floor(rand(4)), list = [];
      for (let k = -2; k <= 2; k++) for (const [x, y, side] of [[cx + k, cy - 2, 0], [cx + 2, cy + k, 1], [cx + k, cy + 2, 2], [cx - 2, cy + k, 3]]) if (!(side === gap && Math.abs(k) <= 0)) list.push([x, y]);
      const sp = spotNear(m.world, t.x, t.y, 0.8, 1.3, 0.3);
      if (sp) { m.x = sp[0]; m.y = sp[1]; }
      if (blockTiles(m.world, list, 4, drawBars)) floatText(t.x, t.y, 80, 'CAGED!', '#ff8040', 16);
      m.deal(t, m.dmg * 1.4, 'phys', { bleed: true });
    }
    return false;
  },
});

kit('ogre', {
  desc: 'swings its ball and chain round in a wide circle; at half life its shackles break and it goes berserk',
  tick(m, dt, t, d, s) {
    if (!s.free && m.hp < m.maxHp * 0.5) {
      s.free = true; m.speed *= 1.6; m.dmg *= 1.3; m.atkCd *= 0.7; m.scale = (m.scale || 1) * 1.08;
      say(m, 'THE SHACKLES BREAK', '#ff5030', 15); burst(m.x, m.y, 30, 'phys', 18, 4); sfx('roar'); camera.shake(5);
    }
    if (s.spin > 0) {
      s.spin -= dt; s.a = (s.a || 0) + dt * (s.free ? 7 : 4.5);
      const R = s.free ? 2.8 : 2.2, bx = m.x + Math.cos(s.a) * R, by = m.y + Math.sin(s.a) * R;
      s.ball = [bx, by];
      for (const c of m.world.hostiles(m.team, bx, by, 0.7)) if ((s.hits.get(c) || 0) < m.lifeT) { s.hits.set(c, m.lifeT + 0.7); m.deal(c, m.dmg * 1.3, 'phys', { knock: 2, ang: angleTo(m.x, m.y, c.x, c.y) }); }
      if (s.spin <= 0) s.ball = null;
      m.moving = false;
      return !s.free; // free, it chases while it swings
    }
    if (d < 4 && ready(s, 'f', dt, s.free ? 4 : 6, 2)) {
      s.spin = 2.2; s.hits = new Map(); sfx('swing', 0.8);
      if (!s.ballFx) s.ballFx = m.world.addHazard({ get depth() { return s.ball ? s.ball[0] + s.ball[1] + 0.4 : 0; },
        danger(out) { if (s.ball) out.push({ ring: true, x: m.x, y: m.y, r0: (s.free ? 2.8 : 2.2) - 0.8, r1: (s.free ? 2.8 : 2.2) + 0.8, gap: 0, gapW: 0 }); },
        update() { return alive(m); },
        draw(ctx) { if (!s.ball) return; const px = isoX(...s.ball), py = isoY(...s.ball) - 18, mx = isoX(m.x, m.y), my = isoY(m.x, m.y) - 30; ctx.save(); ctx.strokeStyle = '#6a6058'; ctx.lineWidth = 2; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(px, py); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = '#3a3430'; ctx.beginPath(); ctx.arc(px, py, 9, 0, TAU); ctx.fill(); ctx.fillStyle = '#7a7068'; ctx.beginPath(); ctx.arc(px - 3, py - 3, 3, 0, TAU); ctx.fill(); ctx.restore(); } });
    }
    return false;
  },
});

kit('jailor', {
  desc: 'throws a cell round the hero: stepping out of it is punished',
  tick(m, dt, t, d, s) {
    if (!t.isPlayer || d > 7 || !ready(s, 'c', dt, 11, 2.5)) return false;
    const w = m.world, x = t.x, y = t.y, r = m.rank === 'boss' ? 3.2 : 2.6;
    let hurt = 0;
    const P = patch(w, { x, y, r, dur: 5.5, color: '#6a5a8a', edge: '#c0a0ff', alpha: 0.12, bad: false, tick: (dt2) => {
      if (t.dead) return;
      if (!P.inside(t) && (hurt -= dt2) <= 0) { hurt = 0.5; hit(m, t, m.dmg * 0.9, 'arcane', { force: true, crit: false }); t.status.slow = { t: 0.5, amt: 0.4 }; floatText(t.x, t.y, 70, 'ESCAPE ATTEMPT', '#c0a0ff', 12); }
    }, paint: (ctx, px, py, k) => { ctx.globalAlpha = 0.7 * k; ctx.strokeStyle = '#8a7aa0'; ctx.lineWidth = 2; for (let i = 0; i < 16; i++) { const a = i / 16 * TAU, bx = isoX(x + Math.cos(a) * r, y + Math.sin(a) * r), by = isoY(x + Math.cos(a) * r, y + Math.sin(a) * r); ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx, by - 26); ctx.stroke(); } } });
    P.autoGoal = () => ({ x, y, r: r - 1 });
    floatText(t.x, t.y, 80, 'IMPRISONED', '#c0a0ff', 15); sfx('thud', 0.6);
    return false;
  },
});

kit('blind', {
  desc: 'blind: it hunts by sound, losing a hero who stands still and charging one who moves or fights',
  tick(m, dt, t, d, s) {
    if (!t.isPlayer) return false;
    const moved = dist(s.px ?? t.x, s.py ?? t.y, t.x, t.y) > 0.01 || t.attackAnimT > 0 || t.lunge > 0;
    s.px = t.x; s.py = t.y;
    s.heard = moved ? 1.2 : (s.heard || 0) - dt;
    if (s.heard > 0) { m.speed = (s.spd = s.spd || m.speed) * 1.35; if (!s.was) { s.was = true; say(m, '!', '#ff6040', 18); } return false; }
    s.was = false; m.speed = s.spd || m.speed;
    if (ready(s, 'q', dt, 2.5)) { say(m, '?', '#a0a0a0', 16); s.wx = m.x + rand(-2, 2); s.wy = m.y + rand(-2, 2); }
    m.navTo(s.wx ?? m.x, s.wy ?? m.y, dt, m.speed * 0.4);
    return true;
  },
});

kit('oubliette', {
  desc: 'swims under the floor and opens an oubliette under the hero, who drops somewhere else, stunned',
  tick(m, dt, t, d, s) {
    const w = m.world;
    if (s.sub > 0) {
      s.sub -= dt; m.targetable = false; m.alpha = 0.15; m.moving = true;
      m.navTo(s.px, s.py, dt, m.speed * 2.4);
      if (s.sub <= 0) {
        m.targetable = true; m.alpha = undefined; m.x = s.px; m.y = s.py;
        let dropped = false;
        for (const c of w.hostiles(m.team, s.px, s.py, s.pr)) {
          if (c.isPlayer) {
            const sp = spotNear(w, c.x, c.y, 4, 7, 0.35);
            if (sp) { c.x = sp[0]; c.y = sp[1]; dropped = true; }
            c.status.stun = { t: 0.8 }; floatText(c.x, c.y, 80, 'OUBLIETTE', '#80c0ff', 15);
            addEffect(new Ring(c.x, c.y, 0.2, 1.5, 0.4, '#80c0ff', 4));
          }
          m.deal(c, m.dmg * 1.4, 'cold', { crit: false });
        }
        burst(s.px, s.py, 10, 'cold', 14, 3); sfx(dropped ? 'thud' : 'hit', 0.7);
      }
      return true;
    }
    if (d < 9 && ready(s, 'o', dt, 8, 3)) {
      s.sub = 1.3; s.px = t.x; s.py = t.y; s.pr = m.rank === 'boss' ? 2 : 1.3;
      tele({ kind: 'circle', x: s.px, y: s.py, r: s.pr, dur: 1.3, color: '#4080c0' });
      w.addHazard(new Patch({ x: s.px, y: s.py, r: s.pr, dur: 1.35, color: '#000814', edge: '#4080c0', alpha: 0.5 }));
      say(m, 'SUBMERGES', '#80c0ff', 11);
      return true;
    }
    return false;
  },
});

kit('lockjaw', {
  desc: 'clamps its jaws on the hero (rooted and bleeding); it takes double damage while locked on',
  tick(m, dt, t, d, s) {
    if (!s.lock) return false;
    const p = s.lock;
    if (p.dead || (s.lt -= dt) <= 0) { s.lock = null; return false; }
    m.moving = false; m.face(angleTo(m.x, m.y, p.x, p.y));
    p.status.slow = { t: 0.2, amt: 0.92 };
    if (ready(s, 'b', dt, 0.5)) { m.deal(p, m.dmg * 0.35, 'phys', { dot: true, crit: false }); burst(p.x, p.y, 30, 'blood', 4, 2); }
    return true;
  },
  hit(m, t, dmg, s) {
    if (s.lock || !t.isPlayer || (s.next || 0) > m.lifeT) return;
    s.lock = t; s.lt = 2.4; s.took = 0; s.next = m.lifeT + 7;
    floatText(t.x, t.y, 70, 'LOCKJAW', '#c0a040', 15); sfx('hit');
  },
  taken(m, src, el, o, s) { return s.lock ? 2 : 1; },
  hurt(m, src, dmg, s) { if (s.lock && (s.took += dmg) > m.maxHp * 0.1) { s.lock = null; m.status.stun = { t: 1.2 }; say(m, 'JAWS PRIED OPEN', '#a0ffa0'); } },
});

kit('gaoler', {
  desc: 'chains an ally to itself: the chained one shrugs off three quarters of all harm until the Gaoler falls',
  tick(m, dt, t, d, s) {
    const c = s.ward;
    if (c && (c.dead || dist(m.x, m.y, c.x, c.y) > 7)) { c.ward = undefined; s.ward = null; }
    if (!s.ward && ready(s, 'l', dt, 2, 0.5)) {
      const pool = allies(m, 6).filter((a) => a.rank !== 'boss' && a.ward === undefined && a.kit !== KITS.gaoler);
      const a = pool.sort((x, y) => y.maxHp - x.maxHp)[0];
      if (a) {
        s.ward = a; a.ward = 0.25;
        floatText(a.x, a.y, 60, 'CHAINED TO THE GAOLER', '#c0c0c0', 12);
        link(m.world, m, a, '#a0a0a0', () => alive(m) && s.ward === a && !a.dead, { chain: true, za: 30, zb: 26 });
      }
    }
    return false;
  },
  death(m, src, s) { if (s.ward) { s.ward.ward = undefined; floatText(s.ward.x, s.ward.y, 60, 'UNCHAINED', '#ffffff', 12); } },
});

// ===== the chapel
kit('censer', {
  desc: 'swings its censer, filling the room with incense that heals monsters and chokes the hero',
  tick(m, dt, t, d, s) {
    if (d < 7 && ready(s, 'i', dt, 5, 1.5)) {
      const w = m.world;
      w.addHazard(new Area({ world: w, src: m, x: m.x, y: m.y, r: 2, dur: 6, tick: 0.5, dmg: dmgR(m, 0.15), el: 'shadow', fx: 'void', heal: true }));
      smoke(m.x, m.y, 30, '#5a4a6a', 14, 16); sfx('arcane', 0.4);
    }
    return false;
  },
});

kit('choir', {
  desc: 'sings with every Choir Moth near it, each one louder; three together bring down a hymn on the hero',
  init(m, s) { s.base = m.dmg; },
  tick(m, dt, t, d, s) {
    const w = m.world, choir = [m, ...allies(m, 6).filter((c) => c.kit === KITS.choir)];
    m.dmg = s.base * (1 + 0.2 * (choir.length - 1));
    if (choir.length >= 2 && chance(dt * 3)) spawn({ type: 'glow', x: m.x, y: m.y, z: 50, vz: 30, life: 0.8, size: 3, size1: 0, color: '#fff0a0', add: true });
    if (choir.length >= 3 && (w._hymnT || 0) < w.time && d < 9) {
      w._hymnT = w.time + 8;
      const n = choir.length;
      for (const c of choir) floatText(c.x, c.y, 60, '♪', '#fff0a0', 16);
      tele({ kind: 'circle', x: t.x, y: t.y, r: 2.4, dur: 1.4, color: '#fff0a0' });
      blast(m, t.x, t.y, 2.4, 1.4, 0.9 * n, 'holy', {}, 'nova');
      sfx('holy', 0.7);
    }
    return false;
  },
});

kit('chalice', {
  desc: 'fills its chalice with every wound it deals; full, it gives communion and heals its kin. Kill it full and the cup is yours',
  tick(m, dt, t, d, s) {
    m.aura = s.fill >= 2 ? '#c01020' : null;
    if ((s.fill || 0) >= 4) {
      s.fill = 0;
      for (const a of [m, ...allies(m, 6)]) { a.heal(a.maxHp * 0.25); if (!a.communed) { a.communed = true; a.dmg *= 1.15; } addEffect(new Ring(a.x, a.y, 0.2, 1, 0.4, '#ff3040', 3)); }
      say(m, 'COMMUNION', '#ff3040', 15); sfx('holy', 0.5);
    }
    return false;
  },
  hit(m, t, dmg, s) { s.fill = (s.fill || 0) + 1; if (s.fill >= 2) floatText(m.x, m.y, 50, 'the cup fills', '#ff6070', 10); },
  death(m, src, s) {
    if ((s.fill || 0) < 2) return;
    const w = m.world;
    patch(w, { x: m.x, y: m.y, r: 1.5, dur: 6, color: '#c01030', edge: '#ff6070', bad: false, tick: (dt, P) => { const p = w.player; if (p && !p.dead && P.inside(p)) p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.06 * dt); } }).autoGoal = () => null;
    floatText(m.x, m.y, 60, 'THE CUP SPILLS', '#ff6070', 13);
  },
});

kit('belltongue', {
  desc: 'rings its bell: a tolling wave stuns the hero nearby and calls every monster around to the hunt',
  tick(m, dt, t, d, s) {
    const w = m.world, R = m.rank === 'boss' ? 4.8 : 3.6;
    if (s.ring > 0) {
      m.moving = false;
      if ((s.ring -= dt) <= 0) {
        addEffect(new Ring(m.x, m.y, 0.3, R, 0.5, '#ffe080', 6)); addEffect(new Ring(m.x, m.y, 0.3, R * 3, 1.2, '#ffe080', 2));
        for (const c of w.hostiles(m.team, m.x, m.y, R)) { m.deal(c, m.dmg * 0.7, 'light', { crit: false }); c.status.stun = { t: 1 }; }
        for (const c of w.query(m.x, m.y, 16, (c) => c.team === m.team && !c.summon)) { c.awake = true; c.hunter = true; if (w.player) c.aggro = w.player; }
        say(m, 'DOOONG', '#ffe080', 17); sfx('thud', 1); camera.shake(4);
      }
      return true;
    }
    if (d < R + 2 && ready(s, 'b', dt, 7, 2)) {
      s.ring = 1; tele({ kind: 'circle', x: m.x, y: m.y, r: R, dur: 1, color: '#ffe080' });
      m.world.addHazard({ x: m.x, y: m.y, t: 0, danger(out) { out.push({ x: this.x, y: this.y, r: R + 0.4 }); }, update(dt2) { return (this.t += dt2) < 1.05; }, draw() {} });
      return true;
    }
    return false;
  },
});

/** Votive candles: little static adds that shield their keeper while they burn. */
function lightCandles(m, s, n) {
  const w = m.world;
  s.candles = (s.candles || []).filter((c) => !c.dead);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + rand(0.4), [x, y] = w.map.nudge(m.x + Math.cos(a) * 2.4, m.y + Math.sin(a) * 2.4, 0.3);
    const c = new Monster({ x, y, team: m.team, ai: 'melee', static: true, sprite: 'crystal', px: 2, r: 0.3, maxHp: m.maxHp * (m.rank === 'boss' ? 0.03 : 0.08), hp: 1,
      level: m.level, dmg: 0, xp: m.xp * 0.02, name: 'Votive Candle', rank: 'normal', aura: '#ffb040', awake: true, el: 'fire', res: {}, goreType: 'spark',
      pal: { a: '#ffd080', c: '#ffb040', w: '#ffffff', m: '#c0a080' } });
    c.hp = c.maxHp;
    c.wardTick = () => { c.moving = false; if (!alive(m)) c.dead = true; if (chance(0.1)) spawn({ type: 'glow', x: c.x, y: c.y, z: 30, vz: 30, life: 0.5, size: 3, size1: 0, color: '#ffb040', add: true }); addLight(c.x, c.y, 2, 0.6); };
    w.add(c); s.candles.push(c);
    link(w, c, m, '#ffb040', () => alive(m) && !c.dead, { za: 20, zb: 40, width: 2, dash: [4, 4] });
  }
}
kit('votive', {
  desc: 'lights votive candles round itself and is shielded while any still burn: snuff them first',
  tick(m, dt, t, d, s) {
    if (!s.lit) { s.lit = 1; lightCandles(m, s, m.rank === 'boss' ? 4 : 3); say(m, 'THE VIGIL BEGINS', '#ffb040', 13); }
    if (s.lit === 1 && m.hp < m.maxHp * 0.5) { s.lit = 2; lightCandles(m, s, 3); say(m, 'RELIT', '#ffb040', 13); }
    return false;
  },
  taken(m, src, el, o, s) {
    if (!(s.candles || []).some((c) => !c.dead)) return 1;
    if (!o.dot && chance(0.3)) floatText(m.x, m.y, 50, 'SHIELDED BY THE VIGIL', '#ffb040', 10);
    return 0.12;
  },
  death(m, src, s) { for (const c of s.candles || []) c.dead = true; },
});

kit('altar', {
  desc: 'marks the hero with an altar sigil that strikes where they stood; sacrifices a weaker ally to grow',
  tick(m, dt, t, d, s) {
    const w = m.world;
    if (d < 8 && ready(s, 'm', dt, 7, 2)) {
      let fol = 1.3;
      const P = patch(w, { x: t.x, y: t.y, r: 1.4, dur: 2.2, color: '#a02020', edge: '#ff5050', alpha: 0.25, tick: (dt2) => { if ((fol -= dt2) > 0 && !t.dead) { P.x = t.x; P.y = t.y; } } });
      later(w, 1.4, () => { if (alive(m)) blast(m, P.x, P.y, 1.4, 0.8, 2, 'phys', { bleed: true }); });
      floatText(t.x, t.y, 80, 'MARKED FOR THE ALTAR', '#ff5050', 12);
    }
    if (m.hp < m.maxHp * 0.5 && ready(s, 's', dt, 12, 0)) {
      const v = allies(m, 5).filter((a) => a.rank === 'normal' && a.maxHp < m.maxHp)[0];
      if (v) {
        addEffect(new Bolt(v.x, v.y, 30, m.x, m.y, 40, '#ff3030', 0.4, 5));
        kill(v, m); m.heal(m.maxHp * 0.4); m.dmg *= 1.25; m.scale = (m.scale || 1) * 1.08;
        say(m, 'SACRIFICE', '#ff3030', 16); sfx('roar', 0.6);
      }
    }
    return false;
  },
});

kit('sacristy', {
  desc: 'unseen and untouchable until it strikes; it shows itself only for a moment after each blow',
  tick(m, dt, t, d, s) {
    if (s.vis > 0) { s.vis -= dt; m.alpha = s.vis < 0.6 ? 0.15 + s.vis : undefined; return false; }
    m.targetable = false; m.alpha = 0.12;
    if (s.wind > 0) {
      m.moving = false;
      if ((s.wind -= dt) <= 0) {
        if (dist(m.x, m.y, t.x, t.y) < m.atkRange(t) + 0.5) m.deal(t, m.dmg * 1.7, 'shadow', { bleed: true });
        s.vis = 3; m.targetable = true; m.alpha = undefined; burst(m.x, m.y, 30, 'shadow', 12, 3); sfx('swing', 0.7);
      }
      return true;
    }
    if (d < m.atkRange(t) + 0.3) { s.wind = 0.4; m.face(angleTo(m.x, m.y, t.x, t.y)); say(m, '...', '#a080c0', 12); return true; }
    m.chase(dt, t, m.speed * 1.1);
    return true;
  },
});

kit('reliquary', {
  desc: 'every blow shakes a bone relic loose from its box to circle it and fire on the hero: kill it fast',
  tick(m, dt, t, d, s) {
    const w = m.world;
    s.relics = (s.relics || []).filter((r) => r.t < 12);
    for (const r of s.relics) {
      r.t += dt; r.a += dt * 2;
      if ((r.cd -= dt) <= 0 && d < 9) {
        r.cd = 2.6;
        const x = m.x + Math.cos(r.a) * 1.3, y = m.y + Math.sin(r.a) * 1.3;
        w.addHazard(new Shot({ world: w, team: m.team, x, y, ang: angleTo(x, y, t.x, t.y), speed: 7, range: 9, color: '#ffe8a0', onHit: (c) => m.deal(c, m.dmg * 0.6, 'holy', { crit: false }) }));
      }
    }
    if (!s.fx) s.fx = w.addHazard({ get depth() { return m.x + m.y + 0.6; }, update() { return alive(m); }, draw(ctx) {
      for (const r of s.relics) { const x = m.x + Math.cos(r.a) * 1.3, y = m.y + Math.sin(r.a) * 1.3, px = isoX(x, y), py = isoY(x, y) - 34;
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(glowSprite('#ffe8a0'), px - 10, py - 10, 20, 20); ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = '#e8dcc0'; ctx.beginPath(); ctx.arc(px, py, 4, 0, TAU); ctx.fill(); ctx.fillStyle = '#2a2018'; ctx.fillRect(px - 2, py - 1, 1.5, 1.5); ctx.fillRect(px + 0.5, py - 1, 1.5, 1.5); ctx.restore(); }
    } });
    return false;
  },
  hurt(m, src, dmg, s) { s.relics = s.relics || []; if (s.relics.length < 4 && chance(0.35)) { s.relics.push({ a: rand(TAU), t: 0, cd: rand(0.5, 1.5) }); say(m, 'A RELIC STIRS', '#ffe8a0', 10); } },
});

kit('sainteater', {
  desc: 'devours the hero\'s mana with every bite, healing on it; a hero run dry takes half again as much',
  init(m, s) { s.base = m.dmg; },
  tick(m, dt, t, d, s) { m.dmg = s.base * (t.isPlayer && t.maxMana && t.mana < t.maxMana * 0.1 ? 1.5 : 1); return false; },
  hit(m, t) {
    if (!t.isPlayer || !t.maxMana) return;
    const n = Math.min(t.mana, t.maxMana * 0.14);
    t.mana -= n; m.heal(m.maxHp * 0.05);
    if (n > 0) floatText(t.x, t.y, 60, 'MANA DEVOURED', '#6080ff', 11);
  },
});

kit('waxseal', {
  desc: 'seals a dying ally in wax: untouchable for a moment, and healed when it breaks out',
  tick(m, dt, t, d, s) {
    if (!ready(s, 'w', dt, 4, 1)) return false;
    const pool = [m, ...allies(m, 7)].filter((a) => a.hp < a.maxHp * 0.4 && !(a.sealT > m.world.time) && a.rank !== 'boss');
    const a = pool[0];
    if (!a || (a === m && s.self)) return false;
    if (a === m) s.self = true;
    a.sealT = m.world.time + 15; a.invuln = 3; a.heal(a.maxHp * 0.35);
    addEffect(new Bolt(m.x, m.y, 40, a.x, a.y, 30, '#ffe0a0', 0.3, 3)); addEffect(new Ring(a.x, a.y, 1.2, 0.4, 0.5, '#ffe0a0', 5));
    floatText(a.x, a.y, 70, 'WAX SEAL', '#ffe0a0', 14);
    m.world.addHazard({ t: 0, get depth() { return a.x + a.y + 0.7; }, update(dt2) { return (this.t += dt2) < 3 && !a.dead; }, draw(ctx) { const px = isoX(a.x, a.y), py = isoY(a.x, a.y); ctx.save(); ctx.globalAlpha = 0.45; ctx.fillStyle = '#f0d8a0'; ctx.beginPath(); ctx.ellipse(px, py - 24, 18, 30, 0, 0, TAU); ctx.fill(); ctx.restore(); } });
    return false;
  },
});

// ===== the armory
kit('anvil', {
  desc: 'hurls anvils that crush where they land and stay there as cover (and walls) for a while',
  tick(m, dt, t, d, s) {
    if (d > 8 || d < 1.5 || !ready(s, 'a', dt, m.rank === 'boss' ? 5 : 7, 2)) return false;
    const w = m.world, n = m.rank === 'boss' ? 3 : 1;
    for (let i = 0; i < n; i++) {
      const x = t.x + (i ? rand(-2.5, 2.5) : 0), y = t.y + (i ? rand(-2.5, 2.5) : 0);
      blast(m, x, y, 1.1, 1, 2, 'phys', { knock: 1.5 }, 'eruption');
      later(w, 1.02, () => { if (!m.world) return; blockTiles(w, [[Math.floor(x), Math.floor(y)]], 8, (ctx, ax, ay, k) => {
        const px = isoX(ax, ay), py = isoY(ax, ay);
        ctx.save(); ctx.globalAlpha = k; ctx.fillStyle = '#2a2a30'; ctx.fillRect(px - 14, py - 10, 28, 10); ctx.fillStyle = '#4a4a54'; ctx.fillRect(px - 18, py - 22, 36, 12); ctx.fillStyle = '#6a6a78'; ctx.fillRect(px - 18, py - 22, 36, 3); ctx.beginPath(); ctx.moveTo(px + 18, py - 22); ctx.lineTo(px + 28, py - 18); ctx.lineTo(px + 18, py - 14); ctx.fill(); ctx.restore();
      }); camera.shake(3); });
    }
    sfx('swing', 0.7);
    return false;
  },
});

kit('quench', {
  desc: 'breathes fire, then quenching steam: a hero caught by both within a few seconds is tempered, stunned and broken',
  tick(m, dt, t, d, s) {
    if (s.breath) {
      m.moving = false;
      if ((s.bt -= dt) <= 0) {
        const w = m.world, fire = s.breath === 'fire';
        for (const c of coneTargets(w, m.team, m.x, m.y, s.ang, 4.2, 0.55)) {
          if (fire) { m.deal(c, m.dmg * 1.1, 'fire', { burn: true }); c._temperT = w.time + 3.5; }
          else if ((c._temperT || 0) > w.time) { c._temperT = 0; m.deal(c, m.dmg * 2.4, 'cold', { crit: false }); c.status.stun = { t: 1.1 }; floatText(c.x, c.y, 80, 'TEMPERED!', '#a0e0ff', 16); burst(c.x, c.y, 30, 'cold', 20, 4); }
          else { m.deal(c, m.dmg * 0.7, 'cold', { chill: true }); c.status.chill = { t: 1.5, amt: 0.3 }; }
        }
        for (let i = 0; i < 18; i++) { const a = s.ang + rand(-0.55, 0.55), r = rand(0.5, 4.2); spawn({ type: fire ? 'glow' : 'dot', x: m.x + Math.cos(a) * r, y: m.y + Math.sin(a) * r, z: rand(10, 30), vz: 30, life: 0.6, size: fire ? 5 : 4, size1: 0, color: fire ? '#ff8030' : '#e0f0ff', add: fire }); }
        sfx(fire ? 'fire' : 'cold', 0.6);
        s.breath = fire ? 'steam' : null; s.bt = 0.9; s.ang = angleTo(m.x, m.y, t.x, t.y);
        if (s.breath) tele({ kind: 'cone', x: m.x, y: m.y, ang: s.ang, half: 0.55, len: 4.2, dur: 0.9, color: '#a0e0ff' });
      }
      return true;
    }
    if (d < 4 && ready(s, 'q', dt, 6, 2)) {
      s.breath = 'fire'; s.bt = 0.6; s.ang = angleTo(m.x, m.y, t.x, t.y); m.face(s.ang);
      tele({ kind: 'cone', x: m.x, y: m.y, ang: s.ang, half: 0.55, len: 4.2, dur: 0.6, color: '#ff8030' });
      return true;
    }
    return false;
  },
});

kit('squire', {
  desc: 'stands guard over its biggest ally and takes half of every blow aimed at it',
  tick(m, dt, t, d, s) {
    const c = s.ward;
    if (c && (c.dead || dist(m.x, m.y, c.x, c.y) > 6)) { if (c.guardedBy === m) c.guardedBy = null; s.ward = null; }
    if (!s.ward && ready(s, 'g', dt, 2, 0.3)) {
      const a = allies(m, 5).filter((a) => !a.guardedBy && a.kit !== KITS.squire && a.rank !== 'boss').sort((x, y) => y.maxHp - x.maxHp)[0];
      if (a) {
        s.ward = a; a.guardedBy = m;
        floatText(a.x, a.y, 60, 'GUARDED', '#ffb060', 11);
        link(m.world, m, a, '#ffb060', () => alive(m) && s.ward === a && !a.dead, { width: 2, za: 30, zb: 30 });
      }
    }
    if (s.ward && dist(m.x, m.y, s.ward.x, s.ward.y) > 2.5) { m.navTo(s.ward.x, s.ward.y, dt); return true; }
    return false;
  },
  death(m, src, s) { if (s.ward && s.ward.guardedBy === m) s.ward.guardedBy = null; },
});

kit('forgetick', {
  desc: 'swells with every bite; at four it splits in two',
  hit(m, t, dmg, s) {
    s.n = (s.n || 0) + 1; m.scale = (m.scale || 1) * 1.07; m.dmg *= 1.08;
    if (s.n < 4) return;
    s.n = 0; m.scale /= 1.07 ** 4;
    const w = m.world;
    if ((w._forgeTicks = (w._forgeTicks || 0) + 1) > 12) return;
    const sp = spotNear(w, m.x, m.y, 0.5, 1.2, 0.3);
    if (sp) { const c = spawnKin(m, m.art, sp[0], sp[1], { hp: 0.7, xp: 0.5 }); c.swap = m.swap; say(m, 'IT SPLITS', '#ff9040', 13); burst(m.x, m.y, 20, 'fire', 10, 3); }
  },
});

kit('tongs', {
  desc: 'tears the weapon out of the hero\'s hands and runs off with it: strike it to take it back',
  tick(m, dt, t, d, s) {
    if (s.run > 0) { s.run -= dt; flee(m, t.x, t.y, dt, 1.3); return true; }
    return false;
  },
  hit(m, t, dmg, s) {
    if (!t.isPlayer || s.run > 0 || (s.next || 0) > m.lifeT) return;
    t.status.disarm = { t: 4.5, by: m }; s.run = 4.5; s.next = m.lifeT + 11;
    floatText(t.x, t.y, 80, 'DISARMED!', '#ff8040', 16); sfx('block', 0.8);
  },
  hurt(m, src, dmg, s) {
    const p = m.world.player;
    if (p && src === p && p.status.disarm && p.status.disarm.t > 0 && p.status.disarm.by === m) { p.status.disarm = null; s.run = 0; floatText(p.x, p.y, 70, 'WEAPON RECOVERED', '#a0ffa0', 13); }
  },
  death(m) { const p = m.world.player; if (p && p.status.disarm && p.status.disarm.by === m) p.status.disarm = null; },
});

kit('bellows', {
  desc: 'breathes in (dragging the hero close) then blasts it all out again in a cone of burning ash, stoking its fiery kin',
  tick(m, dt, t, d, s) {
    const w = m.world;
    if (s.in > 0) {
      m.moving = false; s.in -= dt;
      for (const c of w.hostiles(m.team, m.x, m.y, 7)) { if (c.static || c.rank === 'boss') continue; const a = angleTo(c.x, c.y, m.x, m.y); c.kbx += Math.cos(a) * 9 * dt; c.kby += Math.sin(a) * 9 * dt; }
      if (chance(dt * 40)) { const a = rand(TAU), r = rand(3, 7); spawn({ type: 'dot', x: m.x + Math.cos(a) * r, y: m.y + Math.sin(a) * r, z: 20, vx: -Math.cos(a) * r * 1.5, vy: -Math.sin(a) * r * 1.5, life: 0.6, size: 2, color: '#8a8078' }); }
      if (s.in <= 0) {
        const ang = angleTo(m.x, m.y, t.x, t.y);
        for (const c of coneTargets(w, m.team, m.x, m.y, ang, 4.5, 0.6)) m.deal(c, m.dmg * 1.2, 'fire', { knock: 2.5, ang, burn: true });
        w.addHazard(new Area({ world: w, src: m, x: m.x + Math.cos(ang) * 2.5, y: m.y + Math.sin(ang) * 2.5, r: 1.8, dur: 4, tick: 0.5, dmg: dmgR(m, 0.2), el: 'fire', fx: 'fire' }));
        for (const a of allies(m, 6)) if (a.el === 'fire' && (a.stoked || 0) < 3) { a.stoked = (a.stoked || 0) + 1; a.dmg *= 1.1; floatText(a.x, a.y, 50, 'STOKED', '#ff8030', 10); }
        smoke(m.x + Math.cos(ang) * 2, m.y + Math.sin(ang) * 2, 20, '#3a302a', 14, 16); sfx('fire', 0.8);
      }
      return true;
    }
    if (d < 7 && ready(s, 'b', dt, 7, 2)) { s.in = 1.5; say(m, 'INHALES', '#c0b0a0', 12); sfx('portal', 0.3); return true; }
    return false;
  },
});

kit('hermit', {
  desc: 'pulls back into its helm when hurt: untouchable and mending, then bursts out spikes first (twice)',
  tick(m, dt, t, d, s) {
    if (s.in > 0) {
      m.moving = false; s.in -= dt; m.heal(m.maxHp * 0.05 * dt);
      if (s.in <= 0) { aoe(m.world, m, m.x, m.y, 1.8, m.dmg * 1.3, 'phys', { knock: 1.5, bleed: true }); burst(m.x, m.y, 20, 'phys', 14, 4); say(m, 'EMERGES', '#c0c0c8', 12); sfx('hit'); }
      return true;
    }
    return false;
  },
  hurt(m, src, dmg, s) {
    if (s.in > 0 || (s.n || 0) >= 2 || m.hp > m.maxHp * (s.n ? 0.25 : 0.5)) return;
    s.n = (s.n || 0) + 1; s.in = 3.5; m.invuln = 3.5;
    say(m, 'WITHDRAWS INTO ITS HELM', '#c0c0c8', 12); sfx('block');
  },
});

kit('roach', {
  desc: 'lays clutches of furnace eggs that hatch into more roaches unless stamped out; bursts into flame when it dies',
  tick(m, dt, t, d, s) {
    const w = m.world;
    if (!ready(s, 'egg', dt, 5, 0.5) || (w._roachEggs || 0) > 10) return false;
    w._roachEggs = (w._roachEggs || 0) + 1;
    const x = m.x, y = m.y, art = m.art, swap = m.swap, src = m;
    const E = patch(w, { x, y, r: 0.45, dur: 4.5, color: '#ff8030', edge: '#ffd060', alpha: 0.5, bad: false, tick: (dt2, P) => {
      const p = w.player;
      if (p && !p.dead && P.inside(p)) { P.dead = true; w._roachEggs--; floatText(x, y, 30, 'SQUISH', '#ffd060', 11); burst(x, y, 4, 'fire', 8, 2); }
    } });
    E.autoGoal = () => ({ x, y, r: 0.2 });
    later(w, 4.4, () => {
      if (E.dead) return;
      w._roachEggs--;
      for (let i = 0; i < 2; i++) { const sp = spotNear(w, x, y, 0.2, 0.9, 0.25); if (sp) spawnKin(src, art, sp[0], sp[1], { kit: false, scale: 0.6, hp: 0.3, dmg: 0.6, xp: 0.2, name: 'Roach Hatchling' }).swap = swap; }
      burst(x, y, 4, 'fire', 10, 2);
    });
    return false;
  },
  death(m) { const w = m.world; w.addHazard(new Area({ world: w, src: m, x: m.x, y: m.y, r: 1.6, dur: 3, tick: 0.5, dmg: dmgR(m, 0.3), el: 'fire', fx: 'fire' })); },
});

kit('smith', {
  desc: 'hammers its allies\' armour: each one it tempers shrugs off a third of all blows and gains life',
  tick(m, dt, t, d, s) {
    if (s.work > 0) {
      m.moving = false;
      if ((s.work -= dt) <= 0) {
        const a = s.on;
        if (a && !a.dead) {
          a.smithed = true; for (const k of ['phys', 'fire', 'cold', 'light']) a.res[k] = (a.res[k] || 0) + 0.3; a.maxHp *= 1.2; a.heal(a.maxHp * 0.2);
          addEffect(new Bolt(m.x, m.y, 30, a.x, a.y, 30, '#ffa040', 0.3, 3)); floatText(a.x, a.y, 60, 'REFORGED', '#ffa040', 12);
        } else aoe(m.world, m, m.x, m.y, 1.8, m.dmg * 1.3, 'fire', { knock: 1 });
        sfx('block', 0.8); burst(m.x, m.y, 30, 'fire', 12, 3);
      }
      return true;
    }
    if (ready(s, 'h', dt, 6, 1.5)) {
      s.on = allies(m, 6).find((a) => !a.smithed && a.kit !== KITS.smith && a.rank !== 'boss') || null;
      if (s.on || d < 2.2) { s.work = 0.8; say(m, '*CLANG*', '#ffa040', 12); return true; }
    }
    return false;
  },
});

kit('slag', {
  desc: 'slithers a ring of molten slag round the hero; when the coil closes the whole circle erupts',
  tick(m, dt, t, d, s) {
    const w = m.world;
    if (s.coil) {
      const C = s.coil;
      C.t += dt;
      const k = Math.min(1, C.t / C.dur), a = C.a0 + k * TAU;
      const nx = C.x + Math.cos(a) * C.r, ny = C.y + Math.sin(a) * C.r;
      if (w.map.isFloor(nx, ny)) { m.x = nx; m.y = ny; }
      m.face(a + Math.PI / 2); m.moving = true; m.targetable = true;
      if (k >= 1) {
        s.coil = null;
        for (const c of w.hostiles(m.team, C.x, C.y, C.r)) m.deal(c, m.dmg * 2.2, 'fire', { burn: true, crit: false });
        for (let i = 0; i < 10; i++) { const b = rand(TAU), r = rand(C.r); burst(C.x + Math.cos(b) * r, C.y + Math.sin(b) * r, 10, 'fire', 8, 3); }
        addEffect(new Ring(C.x, C.y, 0.2, C.r, 0.4, '#ff6020', 6)); camera.shake(4); sfx('fire', 0.9);
      }
      return true;
    }
    if (d < 5 && ready(s, 'c', dt, 9, 3)) {
      const r = m.rank === 'boss' ? 4 : 3;
      s.coil = { x: t.x, y: t.y, r, a0: angleTo(t.x, t.y, m.x, m.y), t: 0, dur: 2.4 };
      const C = s.coil;
      w.addHazard({ ground: true, t: 0, C, danger(out) { out.push({ x: C.x, y: C.y, r: C.r + 0.4 }); },
        update(dt2) { this.t += dt2; return this.t < C.dur + 0.1 && alive(m); },
        draw(ctx) {
          const k = Math.min(1, this.t / C.dur);
          ctx.save(); ctx.strokeStyle = '#ff6020'; ctx.lineWidth = 7; ctx.globalAlpha = 0.85; ctx.beginPath();
          for (let i = 0; i <= 48 * k; i++) { const a = C.a0 + (i / 48) * TAU, x = C.x + Math.cos(a) * C.r, y = C.y + Math.sin(a) * C.r; i ? ctx.lineTo(isoX(x, y), isoY(x, y)) : ctx.moveTo(isoX(x, y), isoY(x, y)); }
          ctx.stroke();
          ctx.globalAlpha = 0.1 + 0.2 * k; ctx.fillStyle = '#ff4010'; ctx.beginPath(); ctx.ellipse(isoX(C.x, C.y), isoY(C.x, C.y), C.r * HW * 1.41, C.r * HH * 1.41, 0, 0, TAU); ctx.fill();
          ctx.restore();
        } });
      floatText(t.x, t.y, 80, 'THE COIL TIGHTENS', '#ff6020', 13);
      return true;
    }
    return false;
  },
});

// ===== the royal wing
kit('tapestry', {
  desc: 'hangs flat against a wall like a tapestry, pounces on a hero who passes, then slinks back to the wall',
  init(m, s) { s.mode = 'seek'; },
  tick(m, dt, t, d, s) {
    const w = m.world;
    if (s.mode === 'hung') {
      m.moving = false; m.targetable = false; m.alpha = 0.18; m.x = s.spot[2]; m.y = s.spot[3];
      if (d < 3.4) { s.mode = 'pounce'; s.t = 0; m.x = s.spot[0]; m.y = s.spot[1]; s.from = [m.x, m.y]; s.to = [t.x, t.y]; m.targetable = true; m.alpha = undefined; say(m, 'RRAAH', '#ff4040', 14); sfx('roar', 0.4); }
      return true;
    }
    if (s.mode === 'pounce') {
      s.t += dt; const k = Math.min(1, s.t / 0.35);
      w.map.move(m, (s.from[0] + (s.to[0] - s.from[0]) * k) - m.x, (s.from[1] + (s.to[1] - s.from[1]) * k) - m.y);
      m.z = Math.sin(k * Math.PI) * 30;
      if (k >= 1) { m.z = 0; aoe(w, m, m.x, m.y, 1.2, m.dmg * 1.6, 'phys', { bleed: true, knock: 0.8 }); s.mode = 'fight'; s.t = 0; }
      return true;
    }
    if (s.mode === 'fight') { if ((s.t += dt) > 4.5) { s.mode = 'seek'; s.t = 0; } return false; }
    // seek a wall
    if (!s.spot || s.t === 0) s.spot = wallNear(w, m.x, m.y, 5);
    s.t = (s.t || 0) + dt;
    if (!s.spot) { s.mode = 'fight'; s.t = 0; return false; }
    m.navTo(s.spot[0], s.spot[1], dt, m.speed * 1.3);
    if (dist(m.x, m.y, s.spot[0], s.spot[1]) < 0.4 || s.t > 3) { s.mode = 'hung'; smoke(m.x, m.y, 30, '#5a2030', 4, 8); }
    return true;
  },
});

kit('pantry', {
  desc: 'raids the hero\'s potion belt and drinks what it steals when hurt; eats corpses to heal. Kill it to win back what\'s left',
  tick(m, dt, t, d, s) {
    const w = m.world;
    if ((s.pots || 0) > 0 && m.hp < m.maxHp * 0.5 && ready(s, 'gulp', dt, 3, 0)) { s.pots--; m.heal(m.maxHp * 0.35); say(m, '*GULP*', '#ff6060', 14); }
    if (ready(s, 'eat', dt, 4, 2)) {
      const k = w.corpses.find((c) => !c.used && dist(c.x, c.y, m.x, m.y) < 2.2);
      if (k) { k.used = true; k.t = 999; m.heal(m.maxHp * 0.15); m.scale = Math.min(1.5, (m.scale || 1) * 1.05); say(m, '*CRUNCH*', '#c06040', 12); burst(k.x, k.y, 10, 'blood', 14, 3); }
    }
    return false;
  },
  hit(m, t, dmg, s) {
    const c = G.char;
    if (!t.isPlayer || !c || !c.potions || (s.next || 0) > m.lifeT) return;
    const kind = ['hp', 'mp', 'rejuv'].find((k) => c.potions[k] > 0);
    if (!kind) return;
    c.potions[kind]--; s.pots = (s.pots || 0) + 1; (s.took = s.took || []).push(kind); s.next = m.lifeT + 5;
    floatText(t.x, t.y, 70, 'POTION STOLEN', '#ff6060', 13);
  },
  death(m, src, s) {
    const c = G.char, back = (s.took || []).slice(0, s.pots || 0);
    if (!c || !back.length) return;
    for (const k of back) c.potions[k] = Math.min(30, (c.potions[k] || 0) + 1);
    floatText(m.x, m.y, 60, `+${back.length} POTION${back.length > 1 ? 'S' : ''} RECOVERED`, '#ff8080', 13);
  },
});

kit('envoy', {
  desc: 'backs away to parley with the court: unless struck hard while it calls, reinforcements arrive',
  tick(m, dt, t, d, s) {
    const w = m.world;
    if (s.call > 0) {
      m.moving = false; s.call -= dt;
      if (chance(dt * 20)) sparkle(m.x + rand(-1, 1), m.y + rand(-1, 1), rand(10, 70), '#c080ff', 1, 0.3);
      if (s.call <= 0) { s.calls = (s.calls || 0) + 1; say(m, 'THE COURT ANSWERS', '#c080ff', 15); if (w.roster && w.roster.length) ambush(w, 'teleport', 2 + (s.calls || 0)); else for (let i = 0; i < 2; i++) { const sp = spotNear(w, m.x, m.y, 1, 2.5); if (sp) spawnKin(m, m.art, sp[0], sp[1], { kit: false, hp: 0.5, name: 'Courtier Shade' }); } }
      return true;
    }
    if ((s.calls || 0) >= 2) return false;
    if (s.back > 0) {
      s.back -= dt; flee(m, t.x, t.y, dt, 1.1);
      if (s.back <= 0 || d > 6) { s.back = 0; s.call = 3; s.took = 0; say(m, 'CALLS THE COURT', '#c080ff', 14); addEffect(new Ring(m.x, m.y, 2, 0.3, 3, '#c080ff', 3)); }
      return true;
    }
    if (ready(s, 'p', dt, 13, 3)) { s.back = 2; return true; }
    return false;
  },
  hurt(m, src, dmg, s) { if (s.call > 0 && (s.took += dmg) > m.maxHp * 0.08) { s.call = 0; m.status.stun = { t: 2 }; say(m, 'PARLEY BROKEN', '#ffffff', 14); } },
});

kit('silverware', {
  desc: 'throws a fan of cutlery that sticks in the floor, then calls every piece back home through whoever is in the way',
  tick(m, dt, t, d, s) {
    const w = m.world;
    s.stuck = (s.stuck || []).filter((k) => !k.gone);
    if (s.stuck.length && ready(s, 'recall', dt, 2.4, 2.4)) {
      for (const k of s.stuck) { k.gone = true; w.addHazard(new Shot({ world: w, team: m.team, x: k.x, y: k.y, ang: 0, speed: 11, home: m, ghost: true, pierce: true, look: 'blade', spin: 20, onHit: (c) => m.deal(c, m.dmg * 0.55, 'phys', { bleed: true, crit: false }) })); }
      say(m, 'RETURN!', '#e0e8f0', 12); sfx('swing', 0.6);
      return false;
    }
    if (!s.stuck.length && d < 7 && ready(s, 'fan', dt, 5, 1.5)) {
      const a0 = angleTo(m.x, m.y, t.x, t.y);
      for (let i = -2; i <= 2; i++) {
        const rec = { x: 0, y: 0, gone: false };
        shot(m, a0 + i * 0.22, { speed: 10, range: 6.5, look: 'blade', spin: 0, onHit: (c) => m.deal(c, m.dmg * 0.7, 'phys', { crit: false }), onEnd: (S) => { rec.x = S.x; rec.y = S.y; s.stuck.push(rec);
          w.addHazard({ ground: true, update() { return !rec.gone && alive(m); }, draw(ctx) { const px = isoX(rec.x, rec.y), py = isoY(rec.x, rec.y); ctx.save(); ctx.fillStyle = '#d8e0e8'; ctx.fillRect(px - 1, py - 10, 2, 10); ctx.fillStyle = '#8a6a40'; ctx.fillRect(px - 1.5, py - 14, 3, 5); ctx.restore(); } }); } });
      }
      s.recall = 2.4; sfx('swing', 0.5);
    }
    return false;
  },
});

kit('louse', {
  desc: 'crawls onto another monster and crowns it: the host grows stronger until it dies and the louse moves on',
  tick(m, dt, t, d, s) {
    const h = s.host;
    if (h) {
      if (h.dead) { s.host = null; m.targetable = true; m.z = 0; m.x = h.x; m.y = h.y; say(m, 'NEEDS A NEW HOST', '#ffd060', 11); return false; }
      m.x = h.x; m.y = h.y + 0.01; m.z = (h.artH || 40) * (h.scale || 1) * 0.75; m.moving = false; m.targetable = false;
      return true;
    }
    if (!ready(s, 'look', dt, 1, 0.2) && !s.seek) return false;
    const pool = allies(m, 8).filter((a) => !a.crowned && a.kit !== KITS.louse && a.rank !== 'boss' && !a.fly);
    s.seek = pool.sort((a, b) => dist(m.x, m.y, a.x, a.y) - dist(m.x, m.y, b.x, b.y))[0] || null;
    if (!s.seek) return false;
    m.navTo(s.seek.x, s.seek.y, dt, m.speed * 1.2);
    if (dist(m.x, m.y, s.seek.x, s.seek.y) < s.seek.r + m.r + 0.3) {
      const a = s.seek; s.host = a; s.seek = null;
      a.crowned = true; a.maxHp *= 1.5; a.heal(a.maxHp); a.dmg *= 1.3; a.scale = (a.scale || 1) * 1.1; a.aura = '#ffd060'; a.xp *= 2;
      if (a.rank === 'normal') a.name = 'Crowned ' + a.name;
      floatText(a.x, a.y, 70, 'CROWNED', '#ffd060', 15); sfx('holy', 0.5);
    }
    return true;
  },
});

kit('canopy', {
  desc: 'climbs into the canopy out of reach, creeps over the hero and drops on them in a net',
  tick(m, dt, t, d, s) {
    const w = m.world;
    s.mode = s.mode || 'ground'; s.t = (s.t || 0) + dt;
    if (s.mode === 'ground') { if (s.t > 5 && d < 9) { s.mode = 'climb'; s.t = 0; say(m, 'CLIMBS AWAY', '#a0c080', 11); } return false; }
    m.targetable = false;
    if (s.mode === 'climb') { m.z = Math.min(140, (m.z || 0) + 220 * dt); m.moving = false; if (s.t > 0.7) { s.mode = 'creep'; s.t = 0; } return true; }
    if (s.mode === 'creep') {
      m.moving = true; w.map.move(m, clamp(t.x - m.x, -1, 1) * m.speed * 1.3 * dt, clamp(t.y - m.y, -1, 1) * m.speed * 1.3 * dt, true);
      if (s.t > 1.8 || dist(m.x, m.y, t.x, t.y) < 0.4) { s.mode = 'drop'; s.t = 0; s.dx = t.x; s.dy = t.y; tele({ kind: 'circle', x: t.x, y: t.y, r: 1.6, dur: 0.6, color: '#a0c080' }); w.addHazard({ x: t.x, y: t.y, t: 0, danger(out) { out.push({ x: this.x, y: this.y, r: 2 }); }, update(dt2) { return (this.t += dt2) < 0.65; }, draw() {} }); }
      return true;
    }
    // drop
    m.moving = false;
    if (s.t > 0.6) {
      m.x = s.dx; m.y = s.dy; m.z = 0; m.targetable = true; s.mode = 'ground'; s.t = 0;
      [m.x, m.y] = w.map.nudge(m.x, m.y, m.r);
      aoe(w, m, m.x, m.y, 1.6, m.dmg * 1.5, 'phys', { knock: 0.5 });
      patch(w, { x: m.x, y: m.y, r: 1.8, dur: 3.5, color: '#d0d0c0', edge: '#ffffff', alpha: 0.25, paint: (ctx, px, py, k) => { ctx.globalAlpha = 0.5 * k; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + Math.cos(a) * 1.8 * HW * 1.41, py + Math.sin(a) * 1.8 * HH * 1.41); ctx.stroke(); } },
        tick: (dt2, P) => { for (const c of w.hostiles(m.team, P.x, P.y, P.r)) c.status.slow = { t: 0.3, amt: 0.6 }; } });
      smoke(m.x, m.y, 4, '#6a5a4a', 6, 10); sfx('thud', 0.7);
    }
    return true;
  },
  death(m) { m.z = 0; },
});

kit('banquet', {
  desc: 'sits as a covered platter, then roams the room eating the loot off the floor: kill it to get it all back',
  init: disguise('Banquet Platter'),
  tick(m, dt, t, d, s) {
    const w = m.world;
    if (s.dis) { m.moving = false; if (d > 2.4 && m.hp >= m.maxHp) return true; unmask(m, s); m.deal(t, m.dmg * 1.3, 'phys', { bleed: true }); return false; }
    if (d < 2.5) return false;
    const g = w.loot.find((l) => !l.dead && (l.kind === 'item' || l.kind === 'gold' || l.kind === 'potion') && dist(l.x, l.y, m.x, m.y) < 8);
    if (!g) return false;
    m.navTo(g.x, g.y, dt, m.speed * 1.2);
    if (dist(g.x, g.y, m.x, m.y) < 0.6) {
      w.loot.splice(w.loot.indexOf(g), 1); (s.ate = s.ate || []).push(g);
      m.heal(m.maxHp * 0.1); m.scale = Math.min(1.6, (m.scale || 1) * 1.06);
      say(m, '*CHOMP*', '#ffd34a', 14); sfx('pickup', 0.5);
    }
    return true;
  },
  death(m, src, s) {
    if (!s.ate || !s.ate.length) return;
    for (const g of s.ate) { g.x = m.x; g.y = m.y; g.z = 0; g.vz = rand(90, 150); const a = rand(TAU); g.vx = Math.cos(a); g.vy = Math.sin(a); m.world.addLoot(g); }
    floatText(m.x, m.y, 60, 'THE FEAST SPILLS', '#ffd34a', 13);
  },
});

kit('crownhound', {
  desc: 'howls the royal hunt: every monster near joins it, faster, and hits the hunted hero harder',
  tick(m, dt, t, d, s) {
    const w = m.world;
    if (s.howl > 0) {
      m.moving = false;
      if ((s.howl -= dt) <= 0) {
        for (const c of w.query(m.x, m.y, 12, (c) => c.team === m.team && !c.summon && !c.static)) { c.awake = true; c.hunter = true; if (w.player) c.aggro = w.player; if (!c.royalHunt) { c.royalHunt = true; c.speed *= 1.2; } }
        if (t.isPlayer) { t.status.hunted = { t: 8 }; floatText(t.x, t.y, 80, 'HUNTED', '#ffd060', 16); }
        addEffect(new Ring(m.x, m.y, 0.3, 12, 0.9, '#ffd060', 3)); sfx('roar', 0.8);
      }
      return true;
    }
    if (d < 10 && ready(s, 'h', dt, 12, 1.5)) { s.howl = 0.8; say(m, 'AWOOOO', '#ffd060', 15); return true; }
    if (m.rank === 'normal' && (t.status.hunted?.t || 0) > 0 && d < 3.2) { flee(m, t.x, t.y, dt, 0.9); return true; } // it lets the pack do the killing
    return false;
  },
});

kit('duelist', {
  desc: 'takes guard (EN GARDE): blows struck into its guard are turned back; then it lunges and falls back',
  tick(m, dt, t, d, s) {
    if (s.guard > 0) {
      m.moving = false; m.reflect = true; s.guard -= dt;
      if (chance(dt * 20)) spawn({ type: 'spark', x: m.x + rand(-0.3, 0.3), y: m.y + rand(-0.3, 0.3), z: rand(20, 50), vz: 20, life: 0.3, size: 2, color: '#e0f0ff' });
      if (s.guard <= 0) { m.reflect = false; s.lunge = 0.3; s.ang = angleTo(m.x, m.y, t.x, t.y); s.lh = false; }
      return true;
    }
    if (s.lunge > 0) {
      s.lunge -= dt; m.moving = true; m.world.map.move(m, Math.cos(s.ang) * 11 * dt, Math.sin(s.ang) * 11 * dt);
      if (!s.lh && dist(m.x, m.y, t.x, t.y) < m.atkRange(t) + 0.3) { s.lh = true; m.deal(t, m.dmg * 1.7, 'phys', { bleed: true }); floatText(t.x, t.y, 60, 'TOUCHÉ', '#e0f0ff', 13); }
      if (s.lunge <= 0) s.back = 0.5;
      return true;
    }
    if (s.back > 0) { s.back -= dt; flee(m, t.x, t.y, dt, 1.4); return true; }
    if (d < 3.5 && ready(s, 'g', dt, 6, 2)) { s.guard = 1.3; say(m, 'EN GARDE', '#e0f0ff', 14); sfx('block', 0.6); return true; }
    return false;
  },
  death(m) { m.reflect = false; },
});

kit('mirror', {
  desc: 'swaps places with the hero through its mirror, then strikes them from behind',
  tick(m, dt, t, d, s) {
    if (s.swap > 0) {
      m.moving = false;
      if ((s.swap -= dt) <= 0) {
        if (!t.dead && dist(m.x, m.y, t.x, t.y) < 10) {
          const x = m.x, y = m.y; m.x = t.x; m.y = t.y; t.x = x; t.y = y;
          if (t.isPlayer) t.status.stun = { t: 0.4 };
          for (const c of [m, t]) { addEffect(new Ring(c.x, c.y, 0.2, 1.3, 0.35, '#c0e0ff', 4)); sparkle(c.x, c.y, 40, '#c0e0ff', 10, 0.5); }
          floatText(t.x, t.y, 80, 'MIRRORED', '#c0e0ff', 15); sfx('arcane', 0.7);
          s.strike = 0.35;
        }
      }
      return true;
    }
    if (s.strike > 0) { m.moving = false; if ((s.strike -= dt) <= 0 && dist(m.x, m.y, t.x, t.y) < 2.5) m.deal(t, m.dmg * 1.6, m.el, { crit: false }); return true; }
    if (d > 2.2 && d < 8 && m.world.map.los(m.x, m.y, t.x, t.y) && ready(s, 'sw', dt, 8, 3)) {
      s.swap = 0.8; for (const c of [m, t]) tele({ kind: 'circle', x: c.x, y: c.y, r: 0.8, dur: 0.8, color: '#c0e0ff' });
      say(m, 'LOOK INTO THE GLASS', '#c0e0ff', 12);
      return true;
    }
    return false;
  },
});

// ------------------------------------------------------------------------------------------------ wiring
/** Give a monster its kit (makeMonster; `key` = the art's kit). */
export function attachKit(m, key) {
  const K = KITS[key];
  if (!K) return;
  m.kit = K; m.ks = {};
  if (K.init) K.init(m, m.ks);
  if (K.death) { const prev = m.onDeath; m.onDeath = (src) => { if (prev) prev.call(m, src); if (m.kit === K) K.death(m, src, m.ks); }; }
}
/** Monster.update: true takes the frame. */
export const kitTick = (m, dt, t, d) => !!(m.kit && m.kit.tick && m.kit.tick(m, dt, t, d, m.ks));
export const kitHit = (m, t, dmg) => { if (m.kit && m.kit.hit && t && !t.dead) m.kit.hit(m, t, dmg, m.ks); };
export const kitHurt = (m, src, dmg) => { if (m.kit && m.kit.hurt) m.kit.hurt(m, src, dmg, m.ks); };
/** combat.hit: the share of a blow this monster takes. */
export const kitTaken = (m, src, el, o) => (m.kit && m.kit.taken ? m.kit.taken(m, src, el, o, m.ks) : 1);
