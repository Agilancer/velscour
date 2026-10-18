// Wizard: the Confluence. Three element orbs circle his head (fire, frost, storm); every spell charges its own orb
// (other elements feed the dimmest). Three charges in all three and they CONVERGE: the orbs fly up and come down on
// the thickest crowd as a meteor, a ring of ice and a storm of lightning, one after the other, under a prism flash.
// Pour everything into one orb while the others sit empty and it OVERLOADS instead: a nova of its element alone.
import { G, later, stat, power, sigO, crowd, foesNear, headAt, glow, rand, TAU } from './common.js';
import { isoX, isoY, camera } from '../../core/view.js';
import { sfx } from '../../core/audio.js';
import { addEffect, Ring, Bolt, floatText, spawn, burst, elem, addDecal } from '../../gfx/vfx.js';
import { explosionFx } from '../../gfx/shapes.js';
import { aoe, hit } from '../combat.js';

const ORBS = ['fire', 'cold', 'light'], MAX = 3;

class Meteor {
  constructor(p, x, y) { Object.assign(this, { p, x, y, t: 0, dur: 0.42 }); }
  get depth() { return this.x + this.y + 0.5; }
  update(dt) {
    this.t += dt;
    const k = this.t / this.dur, z = 300 * (1 - k), ox = (1 - k) * -2.2;
    for (let i = 0; i < 2; i++) spawn({ type: 'glow', x: this.x + ox + rand(-0.15, 0.15), y: this.y + ox + rand(-0.15, 0.15), z: z + rand(-6, 6), vz: rand(-10, 20), life: rand(0.25, 0.5), size: rand(4, 8), size1: 0, color: i ? '#ff7a10' : '#fff3a0', add: true });
    if (k >= 1) {
      const p = this.p;
      explosionFx(this.x, this.y, 2.2, 'fire', 'meteor');
      aoe(p.world, p, this.x, this.y, 2.2, power(p) * 3, 'fire', sigO({ burn: true, knock: 0.8 }));
      addDecal(this.x, this.y, 'rgba(20,8,4,0.6)', 0.8, 'scorch', 0.5);
      camera.shake(7);
      return false;
    }
    return true;
  }
  draw(ctx) {
    const k = this.t / this.dur, ox = (1 - k) * -2.2, px = isoX(this.x + ox, this.y + ox), py = isoY(this.x + ox, this.y + ox) - 300 * (1 - k);
    glow(ctx, '#ff7a10', px, py, 34, 0.9); glow(ctx, '#fff3a0', px, py, 14, 1);
    ctx.fillStyle = '#5a2010'; ctx.beginPath(); ctx.arc(px, py, 7, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ffb040'; ctx.beginPath(); ctx.arc(px - 1.5, py - 1.5, 4, 0, TAU); ctx.fill();
  }
}

function frostRing(p, x, y) {
  const w = p.world, n = G.touch ? 10 : 16;
  for (let i = 0; i < n; i++) { // ice spikes thrust up in a ring
    const a = (i / n) * TAU, r = 1.9;
    for (let j = 0; j < 3; j++) spawn({ type: 'shard', x: x + Math.cos(a) * r, y: y + Math.sin(a) * r, z: 2, vx: Math.cos(a) * 0.4, vy: Math.sin(a) * 0.4, vz: rand(90, 160), g: 260, life: rand(0.5, 0.8), size: rand(3, 5), size1: 1.5, color: j ? '#a8e8ff' : '#ffffff', rot: -Math.PI / 2, add: true });
  }
  addEffect(new Ring(x, y, 0.2, 2.4, 0.5, '#60c8ff', 6, { fill: true }));
  addEffect(new Ring(x, y, 2.6, 0.4, 0.5, '#f0ffff', 2));
  addDecal(x, y, 'rgba(160,220,255,0.45)', 1.4, 'frost', 0.7);
  aoe(w, p, x, y, 2.4, power(p) * 3, 'cold', sigO({ freeze: true, slow: true }));
  sfx('cold', 0.9);
}
function storm(p, x, y) {
  const P = power(p), foes = foesNear(p, x, y, 3.2).slice(0, 7);
  const spots = foes.length ? foes.map((c) => [c.x, c.y, c]) : [[x, y, null]];
  for (let i = 0; i < Math.max(4, spots.length); i++) {
    const [sx, sy, c] = spots[i % spots.length];
    later(p.world, i * 0.05, () => {
      addEffect(new Bolt(sx - 0.4, sy - 0.4, 280, sx, sy, 4, '#a8ccff', 0.3, 4));
      burst(sx, sy, 6, 'light', 8, 2.5);
      if (c && !c.dead) hit(p, c, P * 2.5, 'light', sigO({ noArc: true, stun: true }));
    });
  }
  sfx('light', 1);
}

export default {
  id: 'wizard', name: 'Confluence', color: '#ff8a30',
  desc: 'Fire, frost and storm orbs circle his head and charge with each spell of their element. Three in each and they CONVERGE: meteor, ring of ice, lightning storm. Pour everything into one orb and it OVERLOADS.',
  init: () => ({ ch: { fire: 0, cold: 0, light: 0 }, fl: { fire: 0, cold: 0, light: 0 }, conv: 0, cx: 0, cy: 0 }),
  cast(p, s, sk) {
    if (sk.m.free && Math.random() < 0.5) return;
    let e = ORBS.includes(sk.el) ? sk.el : ORBS.reduce((a, b) => (s.ch[b] < s.ch[a] ? b : a));
    if (s.ch[e] >= MAX) {
      if (ORBS.every((o) => o === e || s.ch[o] === 0)) return this.overload(p, s, e);
      e = ORBS.reduce((a, b) => (s.ch[b] < s.ch[a] ? b : a)); // a full orb spills into the dimmest
      if (s.ch[e] >= MAX) return;
    }
    s.ch[e]++; s.fl[e] = 1;
    if (ORBS.every((o) => s.ch[o] >= MAX)) s.ready = true;
  },
  overload(p, s, e) {
    const E = elem(e), w = p.world;
    s.ch[e] = 0; s.fl[e] = 1;
    explosionFx(p.x, p.y, 3, e, e === 'fire' ? 'meteor' : 'explosion');
    aoe(w, p, p.x, p.y, 3, power(p) * 3, e, sigO({ freeze: e === 'cold', burn: e === 'fire', stun: e === 'light', knock: 1 }));
    if (e === 'light') for (let i = 0; i < 6; i++) { const a = rand(TAU); addEffect(new Bolt(p.x, p.y, 30, p.x + Math.cos(a) * 3, p.y + Math.sin(a) * 3, 6, E.glow, 0.3, 3)); }
    floatText(p.x, p.y, 96, 'OVERLOAD', E.glow, 15, { life: 1.3 });
    camera.shake(5);
    stat('wizard', 'overload');
  },
  update(p, s, dt) {
    for (const o of ORBS) s.fl[o] = Math.max(0, s.fl[o] - dt * 2);
    if (s.conv > 0) s.conv -= dt;
    if (s.ready && (s.wait = (s.wait || 0) - dt) <= 0) { s.wait = 0.3; if (crowd(p, 8)) this.fire(p, s); }
  },
  fill: (s) => ORBS.reduce((n, o) => n + s.ch[o], 0) / (MAX * 3),
  fire(p, s) {
    const c = crowd(p, 9), w = p.world;
    const [x, y] = c || [p.x + Math.cos(p.facing || 0) * 3, p.y + Math.sin(p.facing || 0) * 3];
    for (const o of ORBS) s.ch[o] = 0;
    s.ready = false; s.conv = 1.2;
    floatText(p.x, p.y, 104, 'CONFLUENCE', '#ffffff', 19, { life: 1.8, vz: 16 });
    sfx('arcane', 0.8);
    for (let i = 0; i < 3; i++) { // the orbs leave his head in a spiral of their colours
      const E = elem(ORBS[i]);
      for (let j = 0; j < 14; j++) { const a = (j / 14) * TAU + i * 2; spawn({ type: 'glow', x: p.x, y: p.y, z: 70, vx: Math.cos(a) * 2, vy: Math.sin(a) * 2, vz: 120, drag: 2, life: 0.6, size: 4, size1: 0, color: j % 2 ? E.glow : E.core, add: true }); }
    }
    w.addHazard(new Meteor(p, x, y));
    later(w, 0.62, () => { if (!p.dead && p.world === w) frostRing(p, x, y); });
    later(w, 0.95, () => {
      if (p.dead || p.world !== w) return;
      storm(p, x, y);
      for (const [i, col] of ['#ff7a10', '#60c8ff', '#a8ccff', '#ffffff'].entries()) addEffect(new Ring(x, y, 0.2, 3 + i * 0.4, 0.5 + i * 0.1, col, 4));
      G.flash = Math.max(G.flash || 0, 0.18);
    });
    stat('wizard', 'fire');
  },
  draw(ctx, p, s, t) {
    const [cx, cy] = headAt(p, 2), R = G.touch ? 12 : 15, conv = s.conv > 0 ? s.conv / 1.2 : 0;
    const pos = ORBS.map((o, i) => { const a = t * 1.4 + (i / 3) * TAU; return [cx + Math.cos(a) * R * (1 - conv), cy - 6 + Math.sin(a) * R * 0.35 - conv * 60]; });
    if (ORBS.every((o) => s.ch[o] > 0)) { // all three lit: threads of power join them
      ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; ctx.globalAlpha = 0.35 + 0.15 * Math.sin(t * 8);
      ctx.beginPath(); pos.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.stroke();
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
    ORBS.forEach((o, i) => {
      const E = elem(o), n = s.ch[o], [x, y] = pos[i], r = 1.6 + n * 1.1 + s.fl[o] * 1.5;
      glow(ctx, E.glow, x, y, 6 + n * 4 + s.fl[o] * 8, n ? 0.75 : 0.25);
      ctx.globalAlpha = n ? 1 : 0.4; ctx.fillStyle = n ? E.core : E.dark;
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
      for (let j = 0; j < n; j++) { // each charge is a mote circling its orb
        const a = t * 5 + (j / n) * TAU, mx = x + Math.cos(a) * (r + 3), my = y + Math.sin(a) * (r + 3) * 0.6;
        ctx.fillStyle = E.glow; ctx.fillRect(mx - 1, my - 1, 2, 2);
      }
      ctx.globalAlpha = 1;
    });
  },
};
