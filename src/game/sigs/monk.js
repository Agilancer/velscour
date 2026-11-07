// Monk: Inner Harmony (Seven Chakras).
// Attacks and casts align the 7 Chakras over the Monk's head. At 7 chakras, PALM OF ENLIGHTENMENT
// detonates an immense golden chi shockwave that stuns foes and heals the Monk.
import { G, stat, power, sigO, crowd, toughest, headAt, glow, rand, TAU } from './common.js';
import { isoX, isoY, HW, HH, camera } from '../../core/view.js';
import { sfx } from '../../core/audio.js';
import { addEffect, Ring, burst, sparkle } from '../../gfx/vfx.js';
import { aoe } from '../combat.js';

const CHAKRAS = 7, GOLD = '#ffaa30', WHITE = '#ffffff';

export default {
  id: 'monk',
  name: 'Inner Harmony',
  color: GOLD,
  desc: 'Attacks and casts align the 7 Chakras over the Monk. When full, Palm of Enlightenment detonates an immense golden shockwave that stuns foes and heals the Monk.',
  init: () => ({ chakras: 0, t: 0, pop: 0, basic: 0, ready: false }),
  enter(p, s) { s.chakras = 0; s.ready = false; },
  cast(p, s, sk) {
    if (sk && sk.m && sk.m.free && (++s.basic % 2)) return;
    this.add(p, s, 1);
  },
  kill(p, s, tgt) {
    if (tgt && tgt.rank !== 'normal') this.add(p, s, 1);
  },
  add(p, s, n) {
    if (s.ready) return;
    s.chakras += n;
    s.pop = 1;
    if (s.chakras >= CHAKRAS) {
      s.chakras = CHAKRAS;
      s.ready = true;
      this.fire(p, s);
    }
  },
  update(p, s, dt) {
    s.t += dt;
    if (s.pop > 0) s.pop = Math.max(0, s.pop - dt * 3);
  },
  fill(s) { return s.chakras / CHAKRAS; },
  fire(p, s) {
    const w = p.world;
    if (!w || p.dead) return;
    const spot = crowd(p, 7, 2.4) || (toughest(p, 7) && [toughest(p, 7).x, toughest(p, 7).y]) || [p.x, p.y];
    const [tx, ty] = spot;
    const P = power(p), r = 3.6;

    s.chakras = 0;
    s.ready = false;
    stat('monk', 'fire');

    sfx('holy', 1.0);
    sfx('thud', 1.2);
    camera.shake(12);

    addEffect(new Ring(tx, ty, 0.2, r + 0.6, 0.45, GOLD, 6));
    burst(tx, ty, 28, 'holy', G.touch ? 18 : 36, 6);
    sparkle(tx, ty, 30, WHITE, 24, r * 0.7);

    aoe(w, p, tx, ty, r, P * 5.2, 'holy', sigO({ stun: true, knock: 1.4 }));

    // Heal monk for 20% max hp
    if (typeof p.heal === 'function') {
      p.heal(p.maxHp * 0.2);
    }
  },
  draw(ctx, p, s, t) {
    const [cx, cy0] = headAt(p, 14), cy = cy0 + Math.sin(t * 2.5) * 2;
    const RX = G.touch ? 13 : 16, RY = RX * 0.35, f = s.chakras / CHAKRAS;

    glow(ctx, GOLD, cx, cy, RX * 1.5, 0.2 + 0.4 * f);
    ctx.globalCompositeOperation = 'lighter';

    // Seven revolving chakra beads over head
    for (let i = 0; i < CHAKRAS; i++) {
      const a = t * 1.2 + (i / CHAKRAS) * TAU;
      const bx = cx + Math.cos(a) * RX, by = cy + Math.sin(a) * RY;
      const lit = i < s.chakras;

      ctx.fillStyle = lit ? (s.ready ? WHITE : '#ffe070') : 'rgba(120, 80, 20, 0.35)';
      ctx.beginPath();
      ctx.arc(bx, by, lit ? 3.2 : 2.0, 0, TAU);
      ctx.fill();

      if (lit) glow(ctx, GOLD, bx, by, 7, 0.6);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  },
};
