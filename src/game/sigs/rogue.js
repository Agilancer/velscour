// Rogue: Bloodletting.
// Every Combo Point she spends (game/rogue.js) fills the blade over her head. At NEED points it is DEATHMARK: a dagger
// falls out of the sky on the toughest foe near her and daggers burst from the ground under every other, all of them
// left bleeding.
import { G, stat, power, sigO, foesNear, toughest, headAt, glow, later, rand } from './common.js';
import { camera } from '../../core/view.js';
import { sfx } from '../../core/audio.js';
import { addEffect, Ring, floatText } from '../../gfx/vfx.js';
import { hit } from '../combat.js';
import { GiantBlade, GroundBlades } from '../../gfx/blades3d.js';
import { bloodBurst, bloodCut, dirtPop } from '../../gfx/shadowfx.js';
import { ownBlade } from '../rogue.js';

const NEED = 15, RED = '#ff2a3c';

export default {
  id: 'rogue',
  name: 'Bloodletting',
  color: RED,
  desc: `Every Combo Point she spends fills the blade. At ${NEED}, DEATHMARK: a dagger falls from the sky on the toughest foe nearby and daggers burst from the ground under the rest, leaving them all bleeding.`,
  init: () => ({ spent: 0, seen: 0, t: 0, pop: 0 }),
  enter(p, s) { s.seen = p.rogue ? p.rogue.spent : 0; },
  update(p, s, dt) {
    s.t += dt;
    if (s.pop > 0) s.pop = Math.max(0, s.pop - dt * 3);
    const R = p.rogue;
    if (!R) return;
    if (R.spent < s.seen) s.seen = R.spent;
    if (R.spent > s.seen) { s.spent += R.spent - s.seen; s.seen = R.spent; s.pop = 1; }
    if (s.spent >= NEED && foesNear(p, p.x, p.y, 8).length) this.fire(p, s);
  },
  fill(s) { return Math.min(1, s.spent / NEED); },
  fire(p, s) {
    const w = p.world;
    if (!w || p.dead) return;
    s.spent = 0;
    stat('rogue', 'fire');
    const P = power(p), blood = (w.biome && w.biome.blood) || '#8a0b08', big = toughest(p, 8), foes = foesNear(p, p.x, p.y, 8).slice(0, G.touch ? 8 : 12);
    floatText(p.x, p.y, 84, 'DEATHMARK', RED, 18, { life: 1.3 });
    sfx('shadow', 0.9); sfx('swing', 0.8);
    if (big) {
      addEffect(new Ring(big.x, big.y, 1.6, 0.2, 0.5, RED, 3), 'ground');
      w.addHazard(new GiantBlade(big.x, big.y, { fall: 0.5, len: G.touch ? 110 : 140, h: 480, hold: 0.8, model: ownBlade(p) }));
      later(w, 0.5, () => {
        if (!big.dead) hit(p, big, P * 6, 'blood', sigO({ bleed: true }));
        bloodBurst(big.x, big.y, 10, blood, 2.4); camera.shake(9); sfx('gore', 0.9); sfx('thud', 0.9);
        addEffect(new Ring(big.x, big.y, 0.2, 2, 0.4, RED, 5));
      });
    }
    foes.filter((f) => f !== big).forEach((f, i) => later(w, 0.12 + i * 0.05, () => {
      if (f.dead) return;
      w.addHazard(new GroundBlades(f.x, f.y, { r: 0.45, n: 3, len: 42, hold: 0.45, spread: 0.08, onPop: (x, y) => dirtPop(x, y) }));
      hit(p, f, P * 3, 'blood', sigO({ bleed: true }));
      bloodCut(f, -Math.PI / 2 + rand(-0.4, 0.4), 1.5);
    }));
  },
  draw(ctx, p, s) {
    const [cx, cy] = headAt(p, 16), W = G.touch ? 30 : 36, f = Math.min(1, s.spent / NEED), x0 = cx - W / 2;
    // a dagger lying over her head, filling with blood from the grip to the point
    const blade = () => { ctx.beginPath(); ctx.moveTo(x0 + 9, cy - 2.6); ctx.lineTo(x0 + W - 6, cy - 2.2); ctx.lineTo(x0 + W, cy); ctx.lineTo(x0 + W - 6, cy + 2.2); ctx.lineTo(x0 + 9, cy + 2.6); ctx.closePath(); };
    if (f > 0) glow(ctx, RED, x0 + 9 + (W - 9) * f, cy, 7 + s.pop * 5, 0.5 + 0.4 * s.pop);
    ctx.fillStyle = '#1a0c0e'; ctx.strokeStyle = '#000'; ctx.lineWidth = 1;
    blade(); ctx.fill();
    ctx.save(); blade(); ctx.clip(); ctx.fillStyle = f >= 1 ? '#ffd0d0' : RED; ctx.fillRect(x0 + 9, cy - 3, (W - 9) * f, 6); ctx.restore();
    blade(); ctx.stroke();
    ctx.fillStyle = '#6a5030'; ctx.fillRect(x0 + 7, cy - 4.5, 2, 9); // the guard, the grip
    ctx.fillStyle = '#3a1418'; ctx.fillRect(x0, cy - 1.6, 7, 3.2);
  },
};
