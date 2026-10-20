// Totem Master: the Spirit Pole. A little carved totem pole floats over his head and grows a face for every two
// spells he casts; the face is the spirit of the tree the spell came from (Totems: the bear, Ancestors: the wolf,
// Earth & Storm: the thunderbird, the fourth tree: the serpent). Four faces and the pole slams into the earth as
// a GREAT TOTEM, as tall as a house, for eight seconds: the bear heals him and roars foes back, the wolf howls them
// slow, the thunderbird calls lightning, the serpent spits venom. The same spirit twice works twice.
// The great totem is a 3D model (src/gfx/totem3d.js): it grinds up out of cracked, glowing ground for 1.1 s (dirt,
// dust, spirit motes, the camera rumbling), then bursts when it stands (its wings snap open, a flash, shock rings,
// a light column, spirit sparks from each face, rocks and dust flung out) and at the end sinks back in.
import { G, later, stat, power, sigO, crowd, foesNear, headAt, glow, rand, TAU } from './common.js';
import { isoX, isoY, HW, HH, camera } from '../../core/view.js';
import { sfx } from '../../core/audio.js';
import { addEffect, addLight, Ring, Bolt, Beam, Column, floatText, spawn, burst, smoke } from '../../gfx/vfx.js';
import { drawTotem3D, totemFaceZ, totemHeight } from '../../gfx/totem3d.js';
import { hit, aoe } from '../combat.js';

const FACES = 4, KINDS = ['bear', 'wolf', 'eagle', 'serpent'], TEAL = '#5ac8a0';
const PAINT = { bear: '#a0582a', wolf: '#8a92a0', eagle: '#c8402a', serpent: '#4a9a40' };
const SPIRIT = { bear: '#ffb060', wolf: '#c0d8ff', eagle: '#a8ccff', serpent: '#90ff60' };

/** A carved face on the pole, w x h at (x, y) top-left; `lit` glows its eyes. */
function face(ctx, kind, x, y, w, h, lit) {
  const u = w / 8;
  ctx.fillStyle = '#5a3a20'; ctx.fillRect(x, y, w, h);                       // the log
  ctx.fillStyle = PAINT[kind]; ctx.fillRect(x + u * 0.5, y + u * 0.5, w - u, h - u);
  ctx.fillStyle = '#2a1608'; ctx.fillRect(x, y + h - u * 0.6, w, u * 0.6);    // the seam to the next face
  const eye = lit ? SPIRIT[kind] : '#1a1008';
  if (kind === 'bear') {
    ctx.fillStyle = PAINT.bear; ctx.fillRect(x - u * 0.5, y - u, u * 2, u * 1.6); ctx.fillRect(x + w - u * 1.5, y - u, u * 2, u * 1.6); // round ears
    ctx.fillStyle = eye; ctx.fillRect(x + u * 1.6, y + u * 2, u * 1.2, u * 1.2); ctx.fillRect(x + w - u * 2.8, y + u * 2, u * 1.2, u * 1.2);
    ctx.fillStyle = '#e0b080'; ctx.fillRect(x + u * 2.5, y + u * 3.6, u * 3, u * 2.2); ctx.fillStyle = '#1a1008'; ctx.fillRect(x + u * 3.4, y + u * 3.8, u * 1.2, u * 0.8);
  } else if (kind === 'wolf') {
    ctx.fillStyle = PAINT.wolf; ctx.beginPath(); ctx.moveTo(x, y + u); ctx.lineTo(x + u, y - u * 2); ctx.lineTo(x + u * 2.6, y + u); ctx.moveTo(x + w, y + u); ctx.lineTo(x + w - u, y - u * 2); ctx.lineTo(x + w - u * 2.6, y + u); ctx.fill(); // pointed ears
    ctx.fillStyle = eye; ctx.fillRect(x + u * 1.4, y + u * 2.2, u * 1.6, u * 0.9); ctx.fillRect(x + w - u * 3, y + u * 2.2, u * 1.6, u * 0.9);
    ctx.fillStyle = '#e8e8f0'; ctx.fillRect(x + u * 2.6, y + u * 3.4, u * 2.8, u * 2.6); ctx.fillStyle = '#1a1008'; ctx.fillRect(x + u * 3.3, y + u * 3.4, u * 1.4, u);
  } else if (kind === 'eagle') {
    ctx.fillStyle = '#2a8a9a'; ctx.fillRect(x + u * 0.5, y + u * 0.5, w - u, u * 1.4); // a painted brow
    ctx.fillStyle = eye; ctx.fillRect(x + u * 1.3, y + u * 2.2, u * 1.4, u * 1.4); ctx.fillRect(x + w - u * 2.7, y + u * 2.2, u * 1.4, u * 1.4);
    ctx.fillStyle = '#ffc040'; ctx.beginPath(); ctx.moveTo(x + u * 2.6, y + u * 3.4); ctx.lineTo(x + w - u * 2.6, y + u * 3.4); ctx.lineTo(x + w / 2, y + h + u * 0.6); ctx.closePath(); ctx.fill(); // the hooked beak
  } else {
    ctx.fillStyle = eye; ctx.fillRect(x + u * 1.5, y + u * 2, u * 1.6, u * 1.6); ctx.fillRect(x + w - u * 3.1, y + u * 2, u * 1.6, u * 1.6);
    ctx.fillStyle = '#1a1008'; ctx.fillRect(x + u * 2.1, y + u * 2, u * 0.5, u * 1.6); ctx.fillRect(x + w - u * 2.5, y + u * 2, u * 0.5, u * 1.6); // slit pupils
    ctx.fillStyle = '#ff3050'; ctx.fillRect(x + w / 2 - u * 0.3, y + u * 4.2, u * 0.6, u * 1.8); ctx.fillRect(x + w / 2 - u * 0.9, y + u * 5.8, u * 0.6, u * 0.8); ctx.fillRect(x + w / 2 + u * 0.3, y + u * 5.8, u * 0.6, u * 0.8); // forked tongue
  }
  if (lit) glow(ctx, SPIRIT[kind], x + w / 2, y + h * 0.35, w * 0.7, 0.35);
}
/** Thunderbird wings that crown a full pole. */
function wings(ctx, x, y, w, open) {
  ctx.fillStyle = '#c8402a';
  for (const s of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(x + s * w * 0.3, y); ctx.lineTo(x + s * w * (0.6 + 0.9 * open), y - w * 0.5 * open - 2); ctx.lineTo(x + s * w * (0.5 + 0.6 * open), y + w * 0.15); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#2a8a9a'; ctx.fillRect(x + s * w * (0.45 + 0.4 * open) - 1, y - w * 0.15 * open, 2, 2); ctx.fillStyle = '#c8402a';
  }
}

const RISE = 1.1, UP = 7.6, SINK = 0.7, K3 = 0.95;    // seconds bursting out, standing, sinking back; model scale
const EARTH = ['#5a4a30', '#7a6648', '#4a3c2a', '#8a7a60', '#6a6058'];
const few = () => (G.touch ? 0.5 : 1);
/** How far out of the ground it is, u 0..1 through the rise: grinding pushes that slow as it frees itself. */
const riseCurve = (u) => Math.max(0, Math.min(1, 1 - Math.pow(1 - u, 2.4) + 0.03 * Math.sin(u * Math.PI * 7) * (1 - u)));
/** A point dx, dy tiles off (x, y) on screen. */
const scr = (x, y, dx, dy) => [isoX(x + dx, y + dy), isoY(x + dx, y + dy)];

/** The torn ground it bursts from: a dark hole, rubble round the lip and cracks that glow while the totem stands. */
class TotemScar {
  constructor(x, y) {
    let sd = (Math.floor(x * 977) * 73856093 ^ Math.floor(y * 991) * 19349663) >>> 0;
    const rn = () => (sd = (sd * 1664525 + 1013904223) >>> 0) / 4294967296;
    const cracks = [], rocks = [];
    for (let i = 0; i < 9; i++) {
      const a = i / 9 * TAU + rn() * 0.5, len = 1.3 + rn() * 1.2, pts = [];
      for (let j = 0; j <= 4; j++) { const r = 0.5 + (len - 0.5) * j / 4, b = a + (rn() - 0.5) * 0.4 * (j > 0); pts.push([Math.cos(b) * r, Math.sin(b) * r]); }
      cracks.push(pts);
    }
    for (let i = 0; i < 16; i++) { const a = i / 16 * TAU + rn() * 0.3, r = 0.62 + rn() * 0.3; rocks.push([Math.cos(a) * r, Math.sin(a) * r, 2.5 + rn() * 3, EARTH[Math.floor(rn() * EARTH.length)], rn() * TAU]); }
    Object.assign(this, { x, y, t: 0, ground: true, cracks, rocks, life: RISE + UP + SINK + 1.6 });
  }
  update(dt) { this.t += dt; return this.t < this.life; }
  /** The cracks' glow through the totem's life. */
  heat() {
    const t = this.t, b = t - RISE, end = RISE + UP + SINK;
    if (t < RISE) return 0.6 + 0.4 * Math.min(1, t / 0.2) * (0.75 + 0.25 * Math.sin(t * 40));
    if (b < 0.6) return 1.6 - b * 2;
    if (t < end) return 0.4 + 0.12 * Math.sin(t * 3);
    return 0.4 * Math.max(0, 1 - (t - end) / 1.2);
  }
  draw(ctx) {
    const { x, y, t } = this, px = isoX(x, y), py = isoY(x, y), end = RISE + UP + SINK;
    const open = Math.min(1, t / 0.18) * (t > end ? Math.max(0, 1 - (t - end) / 1.4) : 1), grow = Math.min(1, t / 0.3) * (t > RISE ? 1 : 0.7), h = this.heat();
    if (open <= 0) return;
    ctx.save(); ctx.translate(px, py); ctx.scale(1, HH / HW);                 // the hole: a soft dark pit
    const rr = 0.85 * HW * 1.41 * open, gr = ctx.createRadialGradient(0, 0, 0, 0, 0, rr * 1.35);
    gr.addColorStop(0, 'rgba(6,4,2,0.92)'); gr.addColorStop(0.55, 'rgba(14,9,5,0.75)'); gr.addColorStop(1, 'rgba(20,14,8,0)');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, 0, rr * 1.35, 0, TAU); ctx.fill();
    ctx.restore();
    glow(ctx, TEAL, px, py, 46 * open, Math.min(0.55, 0.32 * h));
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const pass of [0, 1]) {                                            // cracks: dark scores, then their light
      if (pass) { ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = '#7affe0'; ctx.lineWidth = 1.3; ctx.globalAlpha = Math.min(1, h) * open; }
      else { ctx.strokeStyle = '#140c06'; ctx.lineWidth = 3; ctx.globalAlpha = 0.85 * open; }
      ctx.beginPath();
      for (const c of this.cracks) {
        const m = 1 + (c.length - 1) * grow, whole = Math.floor(m);
        c.forEach((q, j) => { if (j > m) return; const [sx, sy] = scr(x, y, q[0], q[1]); j ? ctx.lineTo(sx, sy) : ctx.moveTo(sx, sy); });
        if (whole < c.length - 1) { const a = c[whole], b = c[whole + 1], f = m - whole, [sx, sy] = scr(x, y, a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f); ctx.lineTo(sx, sy); }
      }
      ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = open;
    for (const [dx, dy, r, col, a] of this.rocks) {                            // rubble heaved up round the lip
      const [sx, sy] = scr(x, y, dx * (0.6 + 0.4 * open), dy * (0.6 + 0.4 * open));
      ctx.fillStyle = '#1a120a'; ctx.beginPath();
      for (let k = 0; k < 5; k++) { const b = a + k / 5 * TAU, q = r * (0.75 + 0.25 * Math.sin(b * 3 + a)) + 0.8; k ? ctx.lineTo(sx + Math.cos(b) * q, sy + Math.sin(b) * q * 0.7) : ctx.moveTo(sx + Math.cos(b) * q, sy + Math.sin(b) * q * 0.7); }
      ctx.fill(); ctx.fillStyle = col; ctx.beginPath();
      for (let k = 0; k < 5; k++) { const b = a + k / 5 * TAU, q = r * (0.75 + 0.25 * Math.sin(b * 3 + a)); k ? ctx.lineTo(sx + Math.cos(b) * q, sy - 0.6 + Math.sin(b) * q * 0.7) : ctx.moveTo(sx + Math.cos(b) * q, sy - 0.6 + Math.sin(b) * q * 0.7); }
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

/** The blast when it stands: a white-teal core flash and rays of spirit light. */
class TotemBlast {
  constructor(x, y, z) { Object.assign(this, { x, y, z, t: 0, dur: 0.6, add: true, rays: Array.from({ length: 16 }, (_, i) => [i / 16 * TAU + rand(-0.12, 0.12), rand(0.6, 1.25)]) }); }
  update(dt) { this.t += dt; return this.t < this.dur; }
  draw(ctx) {
    const k = this.t / this.dur, px = isoX(this.x, this.y), py = isoY(this.x, this.y) - this.z, a = (1 - k) * (1 - k);
    const R = 28 + 75 * Math.sqrt(k), gr = ctx.createRadialGradient(px, py, 0, px, py, R);
    gr.addColorStop(0, `rgba(255,255,255,${a})`); gr.addColorStop(0.3, `rgba(90,232,192,${a * 0.75})`); gr.addColorStop(1, 'rgba(90,200,160,0)');
    ctx.fillStyle = gr; ctx.fillRect(px - R, py - R, R * 2, R * 2);
    ctx.globalAlpha = Math.pow(1 - k, 1.6); ctx.fillStyle = '#d0fff0';
    for (const [ang, l] of this.rays) {
      const r0 = 10 + 50 * k, r1 = (50 + 140 * k) * l, wd = 4 * (1 - k) + 0.6, c = Math.cos(ang), sn = Math.sin(ang);
      ctx.beginPath(); ctx.moveTo(px + c * r0 - sn * wd, py + sn * r0 * 0.8 + c * wd); ctx.lineTo(px + c * r1, py + sn * r1 * 0.8); ctx.lineTo(px + c * r0 + sn * wd, py + sn * r0 * 0.8 - c * wd); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

class GreatTotem {
  constructor(p, x, y, faces) { Object.assign(this, { p, x, y, faces, t: 0, dur: RISE + UP, em: 0, puff: 0, cd: faces.map((_, i) => RISE + 0.3 + i * 0.3) }); }
  get depth() { return this.x + this.y; }
  update(dt) {
    const p = this.p, t0 = this.t, t = (this.t += dt), up = t >= RISE && t < this.dur;
    if (t < RISE) this.rising(dt, t / RISE);
    if (t0 < RISE && t >= RISE) this.deploy();
    if (t0 < this.dur && t >= this.dur) this.sink();
    if (t > this.dur && t < this.dur + SINK) this.rising(dt * 0.45, 1 - (t - this.dur) / SINK, true);
    if (up && !p.dead) this.faces.forEach((k, i) => { if ((this.cd[i] -= dt) <= 0) { this.cd[i] = 1.2; this.act(k, i); } });
    const b = t - RISE;
    addLight(this.x, this.y, 3.5 + (b > 0 && b < 0.6 ? 4 * (1 - b / 0.6) : 0), t < RISE ? 0.6 : b < 0.6 ? 1.2 : 0.55, 60, '#7affd8');
    return t < this.dur + SINK;
  }
  /** Bursting out (or, sink, going back in): dirt and pebbles flung from the lip, dust, spirit motes up the pole. */
  rising(dt, u, sink) {
    const { x, y } = this, f = few();
    this.em += dt * 95 * f;
    while (this.em >= 1) {
      this.em--;
      const a = rand(TAU), r = rand(0.35, 0.7), v = rand(1.2, 3.4), c = Math.cos(a), s = Math.sin(a), q = Math.random();
      if (q < 0.5) spawn({ type: 'shard', x: x + c * r, y: y + s * r, z: 2, vx: c * v, vy: s * v, vz: rand(70, 190), g: 330, life: rand(0.5, 0.9), size: rand(1.5, 3.5), size1: 1, color: EARTH[Math.floor(rand(EARTH.length))], rot: rand(TAU), vr: rand(-10, 10) });
      else if (q < 0.7) spawn({ type: 'dot', x: x + c * r, y: y + s * r, z: 1, vx: c * v * 0.7, vy: s * v * 0.7, vz: rand(90, 220), g: 380, life: rand(0.5, 0.8), size: rand(1.5, 2.6), color: EARTH[Math.floor(rand(EARTH.length))] });
      else if (q < 0.9) spawn({ type: 'glow', x: x + c * 0.4, y: y + s * 0.4, z: rand(0, 20), vx: -s * 0.9 + c * 0.2, vy: c * 0.9 + s * 0.2, vz: rand(60, 140), drag: 0.6, life: rand(0.7, 1.2), size: rand(2, 3.5), size1: 0, color: Math.random() < 0.7 ? TEAL : '#e0fff4', add: true });
      else { const d = rand(0.8, 1.9); spawn({ type: 'glow', x: x + c * d, y: y + s * d, z: 1, vz: rand(20, 60), life: rand(0.3, 0.5), size: rand(1.5, 3), size1: 0, color: '#9affe8', add: true }); }
    }
    if ((this.puff -= dt) <= 0) { this.puff = 0.06 / f; const a = rand(TAU); smoke(x + Math.cos(a) * 0.6, y + Math.sin(a) * 0.6, 0, '#7a6a50', 1, 9); }
    camera.shake(sink ? 2 : 2.2 + 2 * u);
    if (Math.random() < dt * 7) sfx('thud', 0.3, rand(0.55, 0.85));
  }
  /** It stands: the blast. */
  deploy() {
    const { x, y, faces } = this, w = this.world, f = few(), n = faces.length, H = totemHeight(n, K3), mid = H * 0.5;
    addEffect(new Ring(x, y, 0.3, 5.5, 0.55, '#e8fff4', 5));
    addEffect(new Ring(x, y, 0.2, 4, 0.75, TEAL, 10, { fill: true }));
    faces.forEach((k, i) => later(w, 0.05 + i * 0.07, () => addEffect(new Ring(x, y, 0.4, 3 + i * 0.6, 0.6, SPIRIT[k], 3))));
    addEffect(new Column(x, y, TEAL, 0.45, 22, 340));
    addEffect(new TotemBlast(x, y, mid));
    faces.forEach((k, i) => {                                                 // each spirit bursts from its face
      const z = totemFaceZ(i, n, K3);
      for (let j = 0; j < 16 * f; j++) { const a = rand(TAU), v = rand(2, 5.5); spawn({ type: 'glow', x, y, z, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vz: rand(-30, 70), g: 30, drag: 1.6, life: rand(0.6, 1.1), size: rand(2, 4), size1: 0, color: SPIRIT[k], add: true }); }
    });
    for (let j = 0; j < 28 * f; j++) { const a = rand(TAU), v = rand(7, 11); spawn({ type: 'streak', x, y, z: rand(10, H * 0.9), vx: Math.cos(a) * v, vy: Math.sin(a) * v, vz: rand(-20, 40), drag: 2.5, life: rand(0.25, 0.4), size: 1.5, color: j % 2 ? '#ffffff' : TEAL, add: true }); }
    for (let j = 0; j < 30 * f; j++) { const a = rand(TAU), v = rand(2, 5); spawn({ type: 'shard', x: x + Math.cos(a) * 0.5, y: y + Math.sin(a) * 0.5, z: 3, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vz: rand(120, 260), g: 360, life: rand(0.8, 1.3), size: rand(2, 4.5), size1: 1.5, color: EARTH[j % EARTH.length], rot: rand(TAU), vr: rand(-12, 12) }); }
    for (let j = 0; j < 16 * f; j++) { const a = j / (16 * f) * TAU, v = rand(1.6, 2.8); spawn({ type: 'smoke', x: x + Math.cos(a) * 0.7, y: y + Math.sin(a) * 0.7, z: rand(0, 6), vx: Math.cos(a) * v, vy: Math.sin(a) * v, vz: rand(4, 16), drag: 1.8, life: rand(1, 1.6), size: 10, size1: 26, color: '#8a7a60', alpha: 0.5 }); }
    for (let j = 0; j < 20 * f; j++) spawn({ type: 'glow', x: x + rand(-0.5, 0.5), y: y + rand(-0.5, 0.5), z: rand(0, H), vx: rand(-0.4, 0.4), vy: rand(-0.4, 0.4), vz: rand(30, 80), life: rand(1, 1.8), size: rand(1.5, 3), size1: 0, color: j % 3 ? TEAL : '#e0fff4', add: true });
    floatText(x, y, H + 20, 'GREAT TOTEM', TEAL, 18, { life: 1.8, vz: 14 });
    camera.shake(12); sfx('explode', 0.9); sfx('thud', 1, 0.7);
    later(w, 0.15, () => sfx('roar', 0.5));
  }
  sink() { smoke(this.x, this.y, 0, '#7a6a50', 6 * few(), 12); camera.shake(4); sfx('thud', 0.7, 0.6); }
  /** Where face i sits, in tile + z. */
  at(i) { return [this.x, this.y, totemFaceZ(i, this.faces.length, K3)]; }
  act(k, i) {
    const p = this.p, w = this.world, P = power(p), [x, y, z] = this.at(i);
    if (k === 'bear') {
      if (Math.hypot(p.x - x, p.y - y) < 8) { p.heal(p.maxHp * 0.025); burst(p.x, p.y, 30, 'holy', 6, 1.5); }
      addEffect(new Ring(x, y, 0.2, 2.5, 0.4, SPIRIT.bear, 4)); aoe(w, p, x, y, 2.5, P * 0.6, 'phys', sigO({ knock: 1 }));
    } else if (k === 'wolf') {
      addEffect(new Ring(x, y, 0.2, 4.5, 0.6, SPIRIT.wolf, 3)); addEffect(new Ring(x, y, 0.2, 3.5, 0.5, '#ffffff', 1));
      for (const c of foesNear(p, x, y, 4.5)) { hit(p, c, P * 0.5, 'cold', sigO({ slow: true })); }
      if (Math.random() < 0.4) sfx('roar', 0.25);
    } else if (k === 'eagle') {
      const c = foesNear(p, x, y, 7)[Math.floor(rand(3))] || foesNear(p, x, y, 7)[0];
      if (c) { addEffect(new Bolt(x, y, z + 10, c.x, c.y, 20, SPIRIT.eagle, 0.3, 3)); hit(p, c, P * 1.2, 'light', sigO({ noArc: false })); sfx('light', 0.5); }
    } else {
      const c = foesNear(p, x, y, 6)[0];
      if (c) { addEffect(new Beam(x, y, c.x, c.y, SPIRIT.serpent, 4, 0.3, { z, core: '#e8ff90' })); hit(p, c, P * 0.9, 'poison', sigO({ poison: true })); burst(c.x, c.y, 28, 'poison', 8, 2); }
    }
  }
  draw(ctx) {
    const t = this.t, n = this.faces.length, b = t - RISE;
    let rise = 1, fold = 0, flash = 0, rim = 0, jx = 0, k = K3, rune = 0.45 + 0.2 * Math.sin(t * 3);
    if (t < RISE) { const u = t / RISE; rise = riseCurve(u); fold = 1; rim = 1; jx = Math.sin(t * 73) * 1.6 * (1 - u); rune = 0.7 + 0.3 * Math.sin(t * 20); }
    else if (t < this.dur) {                                                   // the wings snap open and shiver still; a pop and a flash
      fold = b < 0.16 ? 1 - b / 0.16 : -0.14 * Math.exp(-(b - 0.16) * 6) * Math.cos((b - 0.16) * 24);
      flash = Math.max(0, 0.75 - b * 2.2); rim = Math.max(0, 1 - b * 3); k = K3 * (1 + 0.07 * Math.exp(-b * 8)); if (b < 0.6) rune = 1;
    } else { const u = Math.min(1, (t - this.dur) / SINK); rise = 1 - u * u; fold = Math.min(1, u * 3); rim = 0.7; jx = Math.sin(t * 60) * 1.2; }
    const glow4 = this.faces.map((_, i) => (t < RISE ? 0.5 + 0.5 * Math.sin(t * 14 + i) : this.cd[i] > 0.95 ? 1 : 0.2));
    const px = isoX(this.x, this.y) + jx, py = isoY(this.x, this.y), H = totemHeight(n, K3);
    glow(ctx, TEAL, px, py - H * 0.45 * rise, H * 0.6, (0.14 + 0.25 * flash) * rise);
    if (drawTotem3D(ctx, px, py, this.faces, { k, rise, fold, glow: glow4, rune, flash, rim })) return;
    // no WebGL: the flat carved pole
    const W = 36, FH = 30, tall = n * FH;
    ctx.save();
    ctx.beginPath(); ctx.rect(px - 80, py - 400, 160, 400); ctx.clip(); // it grows out of the ground
    const top = py - tall * rise - 6;
    glow(ctx, TEAL, px, top + tall / 2, tall * 0.8, 0.3);
    this.faces.forEach((kd, i) => face(ctx, kd, px - W / 2, top + i * FH, W, FH, glow4[i] > 0.9));
    wings(ctx, px, top, W * 1.2, 1 - Math.max(0, fold));
    ctx.restore();
  }
}

export default {
  id: 'totem_master', name: 'Spirit Pole', color: TEAL,
  desc: 'A carved pole over his head grows a spirit face for every two spells: bear, wolf, thunderbird or serpent by the spell\'s tree. Four faces and it slams down as a GREAT TOTEM that heals, howls, calls lightning and spits venom.',
  init: () => ({ faces: [], prog: 0, flash: 0, slam: 0 }),
  cast(p, s, sk) {
    if (s.faces.length >= FACES || (sk.m.free && Math.random() < 0.5)) return;
    if (++s.prog < 2) return;
    s.prog = 0; s.flash = 0.6;
    s.faces.push(KINDS[Number(String(sk.id).split('.')[1]) % 4] || 'bear');
  },
  update(p, s, dt) {
    s.flash = Math.max(0, s.flash - dt * 2); s.slam = Math.max(0, s.slam - dt);
    if (s.faces.length >= FACES && (s.wait = (s.wait || 0) - dt) <= 0) { s.wait = 0.3; if (foesNear(p, p.x, p.y, 8).length) this.fire(p, s); }
  },
  fill: (s) => s.faces.length / FACES,
  fire(p, s) {
    while (s.faces.length < FACES) s.faces.push(KINDS[s.faces.length]);
    const c = crowd(p, 6), w = p.world;
    let [x, y] = c || [p.x + 1.5, p.y + 1.5];
    const a = Math.atan2(y - p.y, x - p.x), d = Math.min(3, Math.hypot(x - p.x, y - p.y)); // planted between him and them
    x = p.x + Math.cos(a) * d; y = p.y + Math.sin(a) * d;
    if (!w.map.walkable(x, y)) { x = p.x; y = p.y; }
    w.addHazard(new TotemScar(x, y));
    w.addHazard(new GreatTotem(p, x, y, s.faces.splice(0)));
    s.slam = 0.5;
    addEffect(new Ring(x, y, 0.2, 1.6, 0.4, TEAL, 4));
    smoke(x, y, 2, '#6a5a40', 6, 10);
    camera.shake(5); sfx('thud', 1, 0.8); sfx('gate', 0.5);
    stat('totem_master', 'fire');
  },
  draw(ctx, p, s, t) {
    const [cx, cy] = headAt(p, 4), n = s.faces.length, W = G.touch ? 9 : 11, H = Math.round(W * 0.85);
    const bob = Math.sin(t * 2) * 1.5;
    ctx.globalAlpha = 0.5; ctx.fillStyle = '#3a2412'; ctx.fillRect(cx - 1, cy - 3 + bob, 2, 4); ctx.globalAlpha = 1; // the stub it grows from
    for (let i = 0; i < FACES; i++) { // empty sockets show what is to come
      const y = cy - (i + 1) * H + bob;
      if (i < n) face(ctx, s.faces[i], cx - W / 2, y, W, H, i === n - 1 && s.flash > 0);
      else { ctx.globalAlpha = 0.2; ctx.strokeStyle = '#c0a080'; ctx.lineWidth = 1; ctx.strokeRect(cx - W / 2 + 0.5, y + 0.5, W - 1, H - 1); ctx.globalAlpha = 1; }
    }
    if (n >= FACES) wings(ctx, cx, cy - FACES * H + bob, W * 1.2, 0.6 + 0.4 * Math.sin(t * 6));
  },
};
