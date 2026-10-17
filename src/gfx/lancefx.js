// Dragoon leaps: an energy lance aimed along the jump arc (up on the rise, diving on the fall, then plunged into the
// ground on landing), and a trail of its own for each of the 9 leap skills. Started by castSkill (skillrun.js).
import { G } from '../state.js';
import { isoX, isoY, HW, HH } from '../core/view.js';
import { rand, TAU, makeCanvas, dist } from '../core/util.js';
import { spawn, smoke, addEffect, Ring, Bolt, Column, glowSprite, addLight } from './vfx.js';

// glow/core/dark: the lance and trail colours; len: lance length in world px; life: how long the ribbon lingers (s)
const STYLES = {
  'Jump': { trail: 'gust', glow: '#6cc8ff', core: '#f0fbff', dark: '#1c4a90', len: 54, life: 0.32 },
  'Aerial Strike': { trail: 'ghost', glow: '#8aa8ff', core: '#ffffff', dark: '#202c90', len: 58, life: 0.3 },
  'Dragon Dive': { trail: 'helix', glow: '#ff8018', core: '#fff0a0', dark: '#a01800', len: 62, life: 0.42 },
  'High Jump': { trail: 'contrail', glow: '#c8eaff', core: '#ffffff', dark: '#4a6a90', len: 62, life: 0.95 },
  'Comet Dive': { trail: 'comet', glow: '#ff5010', core: '#fff4c0', dark: '#900c00', len: 66, life: 0.5 },
  'Stardive': { trail: 'stars', glow: '#c060ff', core: '#ffe8ff', dark: '#3a0c90', len: 64, life: 0.4 },
  'Storm Dive': { trail: 'storm', glow: '#7ab0ff', core: '#ffffff', dark: '#2030e0', len: 66, life: 0.3 },
  'Dragonfall': { trail: 'wings', glow: '#ff3818', core: '#ffe070', dark: '#700400', len: 82, life: 0.55 },
  'Cyclone Dive': { trail: 'cyclone', glow: '#50f0b8', core: '#f0fff8', dark: '#0a7050', len: 66, life: 0.5 },
  'Vaulting Reprisal': { trail: 'ghost', glow: '#b0d8ff', core: '#ffffff', dark: '#304880', len: 62, life: 0.4 },
  'Sunfall Lance': { trail: 'comet', glow: '#ff9a38', core: '#fff6b0', dark: '#993018', len: 74, life: 0.48 },
  'Cataclysm Descent': { trail: 'wings', glow: '#ff5830', core: '#fff2bc', dark: '#8d150a', len: 86, life: 0.6 },
};
export const LANCE_LEAPS = Object.keys(STYLES);

/** Dress a Leap hazard cast by the Dragoon skill `name` (no-op for other leaps). */
export function lanceLeap(leap, name) {
  const st = STYLES[name];
  if (!st) return;
  leap.lance = true;
  addEffect(new LanceLeap(leap, st));
}

// Spectral spear barrages borrow every existing Dragoon leap's elaborate lance
// design. The actual hit lands instantly in skillrun; these shafts keep stabbing.
export function lanceSpearBarrage(centers, r, triune = false) {
  const count = G.touch ? 7 : 11; // three circles must remain cheap on phones
  for (const [x, y] of centers)
    addEffect(new Ring(x, y, 0.15, r, 0.5, triune ? '#d6b6ff' : '#95d8ff', 3, { fill: true }));
  addEffect(new SpearBarrage(centers, r, count, triune));
}

class SpearBarrage {
  constructor(centers, r, count, triune) {
    this.t = 0;
    this.life = triune ? 1.65 : 1.35;
    this.spears = [];
    for (let c = 0; c < centers.length; c++) {
      const [x, y] = centers[c];
      for (let i = 0; i < count; i++) {
        const a = i * 2.39996 + c * 1.2, d = Math.sqrt((i + 0.5) / count) * r * 0.92;
        this.spears.push({ x: x + Math.cos(a) * d, y: y + Math.sin(a) * d,
          start: (i % 4) * 0.16 + c * 0.06, len: 52 + (i % 4) * 7,
          st: STYLES[LANCE_LEAPS[(i + c * 3) % LANCE_LEAPS.length]] });
      }
    }
  }
  update(dt) { this.t += dt; return this.t < this.life; }
  draw(ctx) {
    for (const s of this.spears) {
      const age = this.t - s.start;
      if (age < 0 || age > 0.95) continue;
      const k = Math.min(1, age / 0.22);
      const alpha = Math.min(1, age / 0.09) * Math.min(1, (0.95 - age) / 0.35);
      const px = isoX(s.x, s.y), py = isoY(s.x, s.y) - 24 - (1 - k) * 130;
      // Reuse the nine leap lances' original shaft, wings, blade and glow painter.
      LanceLeap.prototype.drawLance.call({ st: s.st, t: this.t, blade: LanceLeap.prototype.blade },
        ctx, px, py, Math.PI / 2 + Math.sin(s.start * 9) * 0.14, s.len, alpha, -0.38);
    }
  }
}

// screen offset (world px) -> tile offset + height, for spawning particles at a point on the lance
const toTile = (dx, dy, z0) => [dx / HW / 2, -dx / HW / 2, z0 - dy];
const emit = (rate, dt, fn) => { const n = rate * dt * (G.touch ? 0.6 : 1); for (let i = Math.floor(n) + (Math.random() < n % 1 ? 1 : 0); i > 0; i--) fn(i); };

// tinted silhouettes of the hero image for afterimages
const silCache = new WeakMap();
function silhouette(img, sx, sw, sh, color) {
  let m = silCache.get(img);
  if (!m) silCache.set(img, (m = new Map()));
  const key = color + sx;
  let c = m.get(key);
  if (c) return c;
  c = makeCanvas(sw, sh);
  const x = c.getContext('2d');
  x.drawImage(img, sx, 0, sw, sh, 0, 0, sw, sh);
  x.globalCompositeOperation = 'source-in';
  x.fillStyle = color; x.fillRect(0, 0, sw, sh);
  m.set(key, c);
  return c;
}

class LanceLeap {
  constructor(leap, st) {
    const s = leap.src;
    Object.assign(this, { leap, st, s, t: 0, land: -1, pts: [], ghosts: [], stars: [], shattered: false, gt: 0, lastStar: null });
    this.a = dist(leap.sx, leap.sy, leap.tx, leap.ty) > 0.05 ? Math.atan2(leap.ty - leap.sy, leap.tx - leap.sx) : s.facing || 0;
    // flat travel direction on screen, and its perpendicular
    const fx = (Math.cos(this.a) - Math.sin(this.a)) * HW, fy = (Math.cos(this.a) + Math.sin(this.a)) * HH, fl = Math.hypot(fx, fy) || 1;
    this.fx = fx / fl; this.fy = fy / fl; this.nx = -this.fy; this.ny = this.fx;
    this.hand = (s.spriteH || 60) * (s.scale || 1) * 0.48;
    this.takeoff();
  }

  /** Screen angle of the lance: the travel direction tipped up on the rise and down on the dive. */
  aim(k) {
    const vy = this.fy + (2 * k - 1) * 0.85;
    return Math.atan2(vy, this.fx);
  }

  takeoff() {
    const { s, st } = this, x = s.x, y = s.y;
    addEffect(new Ring(x, y, 0.1, 1.1, 0.35, st.glow, 3));
    for (let i = 0; i < 14; i++) {
      const a = rand(TAU), v = rand(1, 3);
      spawn({ type: 'glow', x, y, z: 4, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vz: rand(30, 90), g: 80, drag: 2, life: rand(0.3, 0.6), size: rand(2, 3.5), size1: 0, color: i % 2 ? st.glow : st.core, add: true });
    }
    switch (st.trail) {
      case 'gust': case 'cyclone': smoke(x, y, 2, '#8a8478', 6, 7); break;
      case 'contrail': // sonic boom
        addEffect(new Ring(x, y, 0.2, 2.2, 0.4, '#ffffff', 5));
        addEffect(new Ring(x, y, 0.1, 1.5, 0.3, st.glow, 3));
        smoke(x, y, 2, '#c8c0b0', 10, 9);
        break;
      case 'helix': case 'comet': case 'wings':
        for (let i = 0; i < 24; i++) spawn({ type: 'glow', x: x + rand(-0.4, 0.4), y: y + rand(-0.4, 0.4), z: rand(0, 10), vz: rand(40, 140), life: rand(0.3, 0.8), size: rand(2, 5), size1: 0, color: i % 3 ? st.glow : st.core, add: true });
        if (st.trail === 'wings') addEffect(new Column(x, y, st.glow, 0.45, 34, 240));
        break;
      case 'storm': addEffect(new Bolt(x, y, 320, x, y, 0, st.glow, 0.22, 3)); break;
      case 'stars': for (let i = 0; i < 6; i++) this.addStar(x + rand(-0.6, 0.6), y + rand(-0.6, 0.6), rand(4, 30), 1.4); break;
    }
    addLight(x, y, 3, 1);
  }

  addStar(x, y, z, big = 1) {
    const star = { x, y, z, t: this.t, life: rand(0.5, 0.9), size: rand(3, 6) * big, ph: rand(TAU) };
    this.stars.push(star);
    return star;
  }

  update(dt) {
    this.t += dt;
    const { leap, s, st } = this;
    if (this.land < 0) {
      if (leap.done && !s.dead) this.onLand();
      else if (s.dead || this.t > 2) { this.land = this.t; this.shattered = true; } // interrupted
      else this.fly(dt, leap.k || 0);
    }
    const now = this.t;
    while (this.pts.length && now - this.pts[0].t > st.life) this.pts.shift();
    while (this.ghosts.length && now - this.ghosts[0].t > 0.3) this.ghosts.shift();
    this.stars = this.stars.filter((p) => now - p.t < p.life);
    if (this.land >= 0 && !this.shattered && now - this.land > 0.5) this.shatter();
    return this.land < 0 || now - this.land < 0.75 || this.pts.length > 0 || this.stars.length > 0;
  }

  /** In flight at arc progress k: record the trail and throw off this leap's particles. */
  fly(dt, k) {
    const { s, st } = this, x = s.x, y = s.y, z = s.z + this.hand;
    this.pts.push({ x, y, z, t: this.t });
    const ang = this.aim(k), ca = Math.cos(ang), sa = Math.sin(ang), L = st.len;
    const back = Math.cos(this.a + Math.PI), backY = Math.sin(this.a + Math.PI);
    // sparks shed from the lance tip
    emit(40, dt, () => {
      const [ox, oy, oz] = toTile(ca * L * 0.6, sa * L * 0.6, z);
      spawn({ type: 'glow', x: x + ox, y: y + oy, z: oz, vx: back * rand(1, 3), vy: backY * rand(1, 3), vz: rand(-10, 20), drag: 3, life: rand(0.15, 0.35), size: rand(1.5, 3), size1: 0, color: Math.random() < 0.5 ? st.core : st.glow, add: true });
    });
    switch (st.trail) {
      case 'gust':
        emit(70, dt, () => spawn({ type: 'streak', x: x + rand(-0.3, 0.3), y: y + rand(-0.3, 0.3), z: z + rand(-24, 14), vx: back * rand(4, 8), vy: backY * rand(4, 8), vz: rand(-20, 20), drag: 4, life: rand(0.18, 0.32), size: rand(1, 2), color: Math.random() < 0.6 ? '#ffffff' : st.glow, add: true }));
        break;
      case 'ghost':
        this.gt -= dt;
        if (this.gt <= 0) { this.gt = 0.035; this.ghosts.push({ x, y, z: s.z, flip: s.flip, t: this.t, col: this.ghosts.length % 2 ? st.glow : st.dark }); }
        emit(40, dt, () => spawn({ type: 'streak', x: x + rand(-0.25, 0.25), y: y + rand(-0.25, 0.25), z: z + rand(-26, 20), vx: back * rand(5, 9), vy: backY * rand(5, 9), drag: 5, life: 0.2, size: 1.2, color: st.glow, add: true }));
        break;
      case 'helix': case 'wings':
        emit(st.trail === 'wings' ? 160 : 90, dt, (i) => spawn({ type: 'glow', x: x + rand(-0.35, 0.35), y: y + rand(-0.35, 0.35), z: z + rand(-20, 12), vx: back * rand(0.5, 2), vy: backY * rand(0.5, 2), vz: rand(10, 60), drag: 1.5, life: rand(0.25, 0.6), size: rand(2, 4.5), size1: 0, color: i % 3 === 0 ? st.core : i % 3 === 1 ? st.glow : '#ffb040', add: true }));
        emit(25, dt, () => spawn({ type: 'dot', x, y, z, vx: rand(-1, 1), vy: rand(-1, 1), vz: rand(0, 40), g: 220, life: 0.9, size: rand(1.5, 2.5), color: '#ffd060', add: true }));
        if (st.trail === 'wings') emit(12, dt, () => smoke(x, y, z - 10, '#2a1a14', 1, 7));
        break;
      case 'contrail':
        emit(14, dt, () => spawn({ type: 'shard', x: x + rand(-0.3, 0.3), y: y + rand(-0.3, 0.3), z: z + rand(-10, 10), vx: rand(-0.5, 0.5), vy: rand(-0.5, 0.5), vz: rand(-5, 15), g: 18, drag: 1, vr: rand(-6, 6), rot: rand(TAU), life: rand(0.9, 1.5), size: rand(1.5, 2.6), color: '#f4fbff' }));
        emit(30, dt, () => spawn({ type: 'glow', x, y, z, vz: rand(-4, 4), life: 0.4, size: rand(2, 3), size1: 0, color: st.glow, add: true }));
        break;
      case 'comet':
        emit(120, dt, (i) => spawn({ type: 'glow', x: x + rand(-0.2, 0.2), y: y + rand(-0.2, 0.2), z: z + rand(-8, 8), vx: back * rand(1, 4), vy: backY * rand(1, 4), vz: rand(-10, 30), drag: 2, life: rand(0.2, 0.5), size: rand(2.5, 5), size1: 0, color: i % 2 ? st.core : st.glow, add: true }));
        emit(30, dt, () => smoke(x, y, z, '#2a2420', 1, 8));
        emit(18, dt, () => spawn({ type: 'dot', x, y, z, vx: back * rand(0.5, 2) + rand(-1, 1), vy: backY * rand(0.5, 2) + rand(-1, 1), vz: rand(-10, 30), g: 260, life: 1.2, size: rand(2, 3.5), color: Math.random() < 0.5 ? '#ff9020' : '#ffd060', add: true }));
        break;
      case 'stars': {
        const last = this.lastStar;
        if (!last || this.t - last.t > 0.035) this.lastStar = this.addStar(x + rand(-0.35, 0.35), y + rand(-0.35, 0.35), z + rand(-22, 16), rand(0.6, 1.2));
        emit(60, dt, (i) => spawn({ type: 'glow', x: x + rand(-0.4, 0.4), y: y + rand(-0.4, 0.4), z: z + rand(-20, 15), vx: rand(-0.4, 0.4), vy: rand(-0.4, 0.4), vz: rand(-8, 8), life: rand(0.4, 0.9), size: rand(2.5, 5), size1: 0, color: i % 2 ? '#ff70d0' : st.glow, add: true }));
        break;
      }
      case 'storm':
        emit(55, dt, () => { const a = rand(TAU), v = rand(4, 9); spawn({ type: 'streak', x, y, z: z + rand(-18, 12), vx: Math.cos(a) * v, vy: Math.sin(a) * v, vz: rand(-60, 60), drag: 6, life: rand(0.1, 0.22), size: rand(1, 2), color: Math.random() < 0.5 ? '#ffffff' : st.glow, add: true }); });
        emit(9, dt, () => { const a = rand(TAU), d = rand(0.6, 1.8); addEffect(new Bolt(x, y, z, x + Math.cos(a) * d, y + Math.sin(a) * d, 0, st.glow, 0.14, 2)); });
        break;
      case 'cyclone':
        emit(80, dt, () => {
          const a = rand(TAU), r = rand(0.4, 0.9);
          spawn({ type: 'streak', x: x + Math.cos(a) * r, y: y + Math.sin(a) * r, z: z + rand(-24, 14), vx: -Math.sin(a) * 6 + back * 2, vy: Math.cos(a) * 6 + backY * 2, vz: rand(10, 40), drag: 3, life: rand(0.2, 0.4), size: rand(1, 2), color: Math.random() < 0.5 ? '#ffffff' : st.glow, add: true });
        });
        emit(14, dt, () => spawn({ type: 'shard', x: x + rand(-0.5, 0.5), y: y + rand(-0.5, 0.5), z, vx: rand(-2, 2), vy: rand(-2, 2), vz: rand(10, 50), g: 60, drag: 1, vr: rand(-10, 10), rot: rand(TAU), life: rand(0.6, 1), size: rand(1.4, 2.2), color: Math.random() < 0.5 ? '#70e070' : '#a8f0a0' }));
        break;
    }
  }

  onLand() {
    const { s, st } = this;
    this.land = this.t;
    this.lx = s.x; this.ly = s.y;
    this.plunge = Math.atan2(this.fy * 0.45 + 1, this.fx * 0.45);
    addEffect(new Column(s.x, s.y, st.glow, 0.35, 16, st.trail === 'wings' || st.trail === 'contrail' ? 300 : 200));
    addEffect(new Ring(s.x, s.y, 0.1, 1.3, 0.4, st.core, 3));
    for (let i = 0; i < 26; i++) {
      const a = rand(TAU), v = rand(1.5, 4.5);
      spawn({ type: 'streak', x: s.x, y: s.y, z: rand(2, 16), vx: Math.cos(a) * v, vy: Math.sin(a) * v, vz: rand(40, 160), g: 240, drag: 1, life: rand(0.3, 0.6), size: rand(1.2, 2.2), color: i % 2 ? st.core : st.glow, add: true });
    }
    addLight(s.x, s.y, 5, 1.6);
    switch (st.trail) {
      case 'storm':
        for (let i = 0; i < 3; i++) { const a = rand(TAU), d = rand(0.3, 1.4); addEffect(new Bolt(s.x + Math.cos(a) * d, s.y + Math.sin(a) * d, 340, s.x, s.y, 0, st.glow, 0.3, 3)); }
        G.flash = Math.max(G.flash || 0, 0.15);
        break;
      case 'stars': for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; this.addStar(s.x + Math.cos(a) * 1.2, s.y + Math.sin(a) * 1.2, rand(4, 20), 1.3); } break;
      case 'cyclone': addEffect(new Ring(s.x, s.y, 0.3, 2.4, 0.5, '#ffffff', 2)); break;
      case 'wings': addEffect(new Ring(s.x, s.y, 0.2, 2.8, 0.6, st.glow, 6, { fill: true })); break;
    }
  }

  /** The planted lance bursts into shards. */
  shatter() {
    this.shattered = true;
    const { st } = this, [ox, oy, oz] = toTile(Math.cos(this.plunge) * -st.len * 0.3, Math.sin(this.plunge) * -st.len * 0.3, 0);
    for (let i = 0; i < 18; i++) {
      const a = rand(TAU), v = rand(1, 3.5);
      spawn({ type: 'shard', x: this.lx + ox, y: this.ly + oy, z: oz + rand(-10, 10), vx: Math.cos(a) * v, vy: Math.sin(a) * v, vz: rand(30, 110), g: 220, vr: rand(-12, 12), rot: rand(TAU), life: rand(0.4, 0.8), size: rand(1.6, 3), color: i % 2 ? st.core : st.glow, add: true });
    }
  }

  // ------------------------------------------------------------------ drawing
  draw(ctx) {
    const { s, st } = this;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    this.drawTrail(ctx);
    if (this.land < 0 && !this.shattered) {
      const k = this.leap.k || 0, px = isoX(s.x, s.y), py = isoY(s.x, s.y) - s.z - this.hand;
      if (st.trail === 'wings') this.drawWings(ctx, px, py);
      if (st.trail === 'comet' || st.trail === 'storm' || st.trail === 'wings') {
        const r = st.trail === 'comet' ? 30 : 22, f = 1 + Math.sin(this.t * 50) * 0.12;
        ctx.globalAlpha = 0.7; ctx.drawImage(glowSprite(st.glow), px - r * f, py - r * f, r * 2 * f, r * 2 * f);
      }
      const grow = Math.min(1, this.t / 0.1), e = 1 + 2.7 * Math.pow(grow - 1, 3) + 1.7 * Math.pow(grow - 1, 2); // ease-out-back
      this.drawLance(ctx, px, py, this.aim(k), st.len * e, 1, -0.38);
    } else if (this.land >= 0 && !this.shattered) {
      const lt = this.t - this.land, sink = Math.min(1, lt / 0.06);
      const px = isoX(this.lx, this.ly), py = isoY(this.lx, this.ly), L = st.len;
      // the lance is driven in: its tip buried 30% deep, a shiver as it lands
      const off = L * (0.42 - 0.12 * sink), sh = Math.sin(lt * 70) * 2 * Math.max(0, 1 - lt * 4);
      const hx = px - Math.cos(this.plunge) * off + sh, hy = py - Math.sin(this.plunge) * off;
      ctx.globalAlpha = 0.8 * (1 - lt / 0.5);
      ctx.drawImage(glowSprite(st.glow), px - 26, py - 13, 52, 26);
      this.drawLance(ctx, hx, hy, this.plunge, L, 1 - Math.max(0, lt - 0.3) / 0.25, -0.5, 0.8);
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  /** The lance at hand (x,y), screen angle `ang`. `from` = where the butt is, as a fraction of L behind the hand;
   *  `cut` clips it (the buried part when planted). */
  drawLance(ctx, x, y, ang, L, alpha, from = -0.38, cut = 1) {
    if (alpha <= 0 || L <= 1) return;
    const { st } = this, t = this.t;
    const back = L * from, tip = back + L, bl = L * 0.22, bw = L * 0.07, pulse = 1 + Math.sin(t * 38) * 0.08;
    ctx.save();
    ctx.translate(x, y); ctx.rotate(ang);
    if (cut < 1) { ctx.beginPath(); ctx.rect(back - 20, -40, L * cut + 20, 80); ctx.clip(); }
    // dark underlay so the lance reads on bright floors
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = alpha * 0.55;
    ctx.strokeStyle = st.dark; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(back, 0); ctx.lineTo(tip - bl, 0); ctx.stroke();
    this.blade(ctx, tip, bl * 1.08, bw * 1.3); ctx.fillStyle = st.dark; ctx.fill();
    ctx.globalCompositeOperation = 'lighter';
    // halo along the whole lance + a hot glow at the point
    ctx.globalAlpha = alpha * 0.55;
    ctx.drawImage(glowSprite(st.glow), back - 14, -14 * pulse, L + 28, 28 * pulse);
    ctx.globalAlpha = alpha * 0.9;
    const tg = 22 * pulse;
    ctx.drawImage(glowSprite(st.glow), tip - bl * 0.5 - tg, -tg, tg * 2, tg * 2);
    // shaft
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = st.glow; ctx.lineWidth = 3.4;
    ctx.beginPath(); ctx.moveTo(back, 0); ctx.lineTo(tip - bl, 0); ctx.stroke();
    ctx.strokeStyle = st.core; ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.moveTo(back + 2, 0); ctx.lineTo(tip - bl, 0); ctx.stroke();
    // swept-back wings at the blade's base, and a diamond butt
    ctx.fillStyle = st.glow;
    for (const sgn of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(tip - bl, sgn * bw * 0.4);
      ctx.lineTo(tip - bl - L * 0.14, sgn * bw * 2.6);
      ctx.lineTo(tip - bl - L * 0.07, sgn * bw * 0.5);
      ctx.closePath(); ctx.fill();
    }
    ctx.beginPath(); ctx.moveTo(back - 5, 0); ctx.lineTo(back, -3); ctx.lineTo(back + 5, 0); ctx.lineTo(back, 3); ctx.closePath(); ctx.fill();
    // blade: glow, then a white-hot core
    this.blade(ctx, tip, bl, bw); ctx.fillStyle = st.glow; ctx.fill();
    this.blade(ctx, tip - 1, bl * 0.75, bw * 0.45); ctx.fillStyle = st.core; ctx.fill();
    // energy motes running up the shaft
    for (let i = 0; i < 3; i++) {
      const f = (t * 2.6 + i / 3) % 1, mx = back + (tip - bl - back) * f, r = 5;
      ctx.globalAlpha = alpha * Math.sin(f * Math.PI);
      ctx.drawImage(glowSprite(st.core), mx - r, -r, r * 2, r * 2);
    }
    if (st.trail === 'storm') { // crackle along the shaft
      ctx.globalAlpha = alpha; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1;
      for (let j = 0; j < 2; j++) {
        ctx.beginPath(); ctx.moveTo(back, 0);
        for (let q = 1; q <= 6; q++) ctx.lineTo(back + (tip - back) * q / 6, rand(-6, 6));
        ctx.stroke();
      }
    }
    ctx.restore();
  }
  blade(ctx, tip, bl, bw) {
    ctx.beginPath();
    ctx.moveTo(tip, 0);
    ctx.lineTo(tip - bl * 0.55, -bw);
    ctx.lineTo(tip - bl, -bw * 0.35);
    ctx.lineTo(tip - bl, bw * 0.35);
    ctx.lineTo(tip - bl * 0.55, bw);
    ctx.closePath();
  }

  /** Two burning wings off the hero's back, beating. */
  drawWings(ctx, px, py) {
    const { st } = this, beat = Math.sin(this.t * 22);
    const bx = px - this.fx * 6, by = py - 4 - this.fy * 4;
    for (const sgn of [-1, 1]) {
      for (let f = 0; f < 6; f++) {
        // feathers fan from out-and-up to swept back; the beat lifts and spreads them
        const sweep = f / 5, side = (1 - sweep * 0.6) * (0.8 + beat * 0.3), aft = 0.3 + sweep * 0.9, up = (0.9 - sweep * 0.6) * (0.6 + beat * 0.5);
        const dx = this.nx * sgn * side - this.fx * aft, dy = (this.ny * sgn * side - this.fy * aft) * 0.6 - up;
        const len = 34 - f * 3.5, dl = Math.hypot(dx, dy) || 1, ex = bx + dx / dl * len, ey = by + dy / dl * len;
        ctx.globalAlpha = 0.55 - f * 0.05;
        ctx.strokeStyle = st.glow; ctx.lineWidth = 6 - f * 0.6;
        ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(ex, ey); ctx.stroke();
        ctx.globalAlpha = 0.8; ctx.strokeStyle = st.core; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(ex, ey); ctx.stroke();
        ctx.globalAlpha = 0.6;
        ctx.drawImage(glowSprite('#ffb040'), ex - 7, ey - 7, 14, 14);
      }
    }
  }

  drawTrail(ctx) {
    const { st, pts } = this, now = this.t;
    switch (st.trail) {
      case 'gust': this.ribbon(ctx, pts, now, 7, [st.glow, '#ffffff']); break;
      case 'ghost': this.drawGhosts(ctx, now); this.ribbon(ctx, pts, now, 4, [st.glow, '#ffffff']); break;
      case 'helix': {
        const w = (p, sgn) => { const o = Math.sin(p.t * 26) * 11 * sgn; return [this.nx * o, this.ny * o]; };
        this.ribbon(ctx, pts, now, 7, [st.glow, st.core], (p) => w(p, 1));
        this.ribbon(ctx, pts, now, 7, ['#ff3000', '#ffd060'], (p) => w(p, -1));
        break;
      }
      case 'contrail': this.ribbon(ctx, pts, now, 16, ['#5a7090', st.glow, '#ffffff'], null, true); break;
      case 'comet': this.ribbon(ctx, pts, now, 22, [st.dark, st.glow, st.core]); break;
      case 'wings': this.ribbon(ctx, pts, now, 18, [st.dark, st.glow, st.core]); break;
      case 'storm': this.ribbon(ctx, pts, now, 5, [st.glow, '#ffffff'], () => [rand(-7, 7), rand(-7, 7)]); break;
      case 'cyclone':
        for (let i = 0; i < 3; i++) {
          this.ribbon(ctx, pts, now, 4, [st.glow, '#ffffff'], (p) => {
            const a = p.t * 30 + i * TAU / 3, r = 16 * Math.min(1, (now - p.t) * 6 + 0.3);
            return [this.nx * Math.cos(a) * r, this.ny * Math.cos(a) * r + Math.sin(a) * r * 0.55];
          });
        }
        break;
      case 'stars': this.ribbon(ctx, pts, now, 4, [st.glow, '#ffd8ff']); break;
    }
    if (this.stars.length) this.drawStars(ctx, now);
  }

  /** A tapered glowing ribbon through the trail points (older = thinner and fainter). `off(p)` shifts a point
   *  in screen px; `soft` = a vapour trail that widens as it ages. */
  ribbon(ctx, pts, now, width, cols, off = null, soft = false) {
    const n = pts.length;
    if (n < 2) return;
    const life = this.st.life, xy = new Array(n);
    for (let i = 0; i < n; i++) {
      const p = pts[i], o = off ? off(p) : null;
      xy[i] = [isoX(p.x, p.y) + (o ? o[0] : 0), isoY(p.x, p.y) - p.z + (o ? o[1] : 0)];
    }
    cols.forEach((c, pass) => {
      const wk = 1 - pass / cols.length * 0.75;
      ctx.strokeStyle = c;
      for (let i = 1; i < n; i++) {
        const age = Math.min(1, (now - pts[i].t) / life), f = 1 - age;
        const along = i / (n - 1);
        ctx.globalAlpha = f * (soft ? 0.45 : 0.85) * (pass === 0 ? 0.6 : 1);
        ctx.lineWidth = Math.max(0.5, width * wk * (soft ? 0.5 + age * 1.4 : 0.25 + 0.75 * along) * (soft ? 1 : f * 0.5 + 0.5));
        ctx.beginPath(); ctx.moveTo(xy[i - 1][0], xy[i - 1][1]); ctx.lineTo(xy[i][0], xy[i][1]); ctx.stroke();
      }
    });
  }

  drawGhosts(ctx, now) {
    const s = this.s, art = s.artFrame && s.artFrame();
    for (const g of this.ghosts) {
      const a = 0.5 * (1 - (now - g.t) / 0.3);
      if (a <= 0) continue;
      ctx.globalAlpha = a;
      const px = isoX(g.x, g.y), py = isoY(g.x, g.y) - g.z;
      ctx.save();
      ctx.translate(px, py);
      if (g.flip) ctx.scale(-1, 1);
      if (art) {
        const sil = silhouette(art.img, art.frame * art.cw, art.cw, art.ch, g.col), k = art.k * (s.scale || 1);
        ctx.drawImage(sil, -art.ax * k, -art.ay * k, art.cw * k, art.ch * k);
      } else {
        const img = s.spriteImage(), [w, h] = s.spriteDims(img);
        ctx.drawImage(silhouette(img, 0, img.width, img.height, g.col), -w / 2, -h, w, h);
      }
      ctx.restore();
    }
  }

  /** Four-point twinkling stars joined into a constellation. */
  drawStars(ctx, now) {
    const { st } = this;
    let prev = null;
    ctx.lineWidth = 1;
    for (const p of this.stars) {
      const age = (now - p.t) / p.life, a = Math.sin(Math.min(1, age) * Math.PI) * (0.7 + 0.3 * Math.sin(now * 30 + p.ph));
      const x = isoX(p.x, p.y), y = isoY(p.x, p.y) - p.z, r = p.size * (1 + age * 0.4);
      if (prev && dist(prev[0], prev[1], x, y) < 60) {
        ctx.globalAlpha = a * 0.45; ctx.strokeStyle = '#ffb0ff';
        ctx.beginPath(); ctx.moveTo(prev[0], prev[1]); ctx.lineTo(x, y); ctx.stroke();
      }
      prev = [x, y];
      ctx.globalAlpha = a * 0.7;
      ctx.drawImage(glowSprite(st.glow), x - r * 2, y - r * 2, r * 4, r * 4);
      ctx.globalAlpha = a;
      ctx.fillStyle = st.core;
      ctx.beginPath();
      ctx.moveTo(x, y - r * 1.6); ctx.lineTo(x + r * 0.25, y - r * 0.25); ctx.lineTo(x + r * 1.6, y); ctx.lineTo(x + r * 0.25, y + r * 0.25);
      ctx.lineTo(x, y + r * 1.6); ctx.lineTo(x - r * 0.25, y + r * 0.25); ctx.lineTo(x - r * 1.6, y); ctx.lineTo(x - r * 0.25, y - r * 0.25);
      ctx.closePath(); ctx.fill();
    }
  }
}
