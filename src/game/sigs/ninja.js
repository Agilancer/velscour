// Ninja: Zanshin, the Unseen Cut.
// Every cut of his blade (and his shadows') leaves a mark on the foe it passed through, up to PER on each. At NEED
// cuts he sheathes the blade and every mark opens at once: the more marks a foe carries, the harder it is hit.
import { G, stat, power, sigO, headAt, glow, later, rand, TAU } from './common.js';
import { isoX, isoY, camera } from '../../core/view.js';
import { sfx } from '../../core/audio.js';
import { addEffect, Ring, floatText, sparkle } from '../../gfx/vfx.js';
import { hit } from '../combat.js';
import { CutLine, bloodCut, CYAN } from '../../gfx/shadowfx.js';

const NEED = 16, PER = 4;

export default {
  id: 'ninja',
  name: 'Zanshin',
  color: CYAN,
  desc: `Every cut leaves a mark on the foe it passed through (up to ${PER} each). At ${NEED} cuts he sheathes his blade and every mark opens at once.`,
  init: () => ({ n: 0, marks: new Map(), t: 0, pop: 0, busy: false }),
  enter(p, s) { s.marks.clear(); s.n = 0; s.busy = false; },
  hit(p, s, tgt, dmg, el, o) {
    if (s.busy || tgt.dead || !(o.cut || o.melee) || !o.sk || !o.sk.startsWith('ninja.')) return;
    let m = s.marks.get(tgt);
    if (!m) s.marks.set(tgt, (m = { a: [] }));
    if (m.a.length < PER) m.a.push(rand(Math.PI));
    s.n = Math.min(NEED, s.n + 1); s.pop = 1;
    if (s.n >= NEED) this.fire(p, s);
  },
  update(p, s, dt) {
    s.t += dt;
    if (s.pop > 0) s.pop = Math.max(0, s.pop - dt * 4);
    for (const t of s.marks.keys()) if (t.dead || t.world !== p.world) s.marks.delete(t);
  },
  fill(s) { return s.n / NEED; },
  fire(p, s) {
    const w = p.world;
    if (!w || p.dead || s.busy) return;
    s.busy = true; s.n = NEED;
    stat('ninja', 'fire');
    const P = power(p), list = [...s.marks].filter(([t]) => !t.dead);
    floatText(p.x, p.y, 84, 'ZANSHIN', '#ffffff', 18, { life: 1.2 });
    sparkle(p.x, p.y, 34, '#ffffff', 10, 0.25); sfx('hit', 0.7); // the blade goes home
    later(w, 0.28, () => {
      s.busy = false; s.n = 0; s.marks.clear();
      if (p.dead) return;
      for (const [t, m] of list) {
        if (t.dead) continue;
        m.a.forEach((a, i) => addEffect(new CutLine(t.x, t.y, a, { len: 70 + i * 12, width: 6, delay: i * 0.035, dur: 0.36, color: i % 2 ? '#ffffff' : CYAN })));
        hit(p, t, P * (1.4 + 0.65 * m.a.length), 'phys', sigO());
        bloodCut(t, rand(TAU), 1.6);
        addEffect(new Ring(t.x, t.y, 0.1, 1, 0.3, CYAN, 3));
      }
      if (list.length) { camera.shake(8); G.flash = Math.max(G.flash || 0, G.settings?.reduceFlashing ? 0 : 0.12); sfx('gore', 0.8); sfx('swing', 1); }
    });
  },
  draw(ctx, p, s, t) {
    // the marks on the foes: thin lines waiting to open
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    for (const [f, m] of s.marks) {
      const px = isoX(f.x, f.y), py = isoY(f.x, f.y) - 24 - (f.z || 0);
      m.a.forEach((a, i) => {
        ctx.globalAlpha = 0.45 + 0.25 * Math.sin(t * 6 + i); ctx.strokeStyle = CYAN; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(px - Math.cos(a) * 11, py - Math.sin(a) * 11); ctx.lineTo(px + Math.cos(a) * 11, py + Math.sin(a) * 11); ctx.stroke();
      });
    }
    ctx.restore();
    // the tally over his head: sixteen strokes in fours
    const [cx, cy] = headAt(p, 15), gap = G.touch ? 3.2 : 3.8, W = (NEED + 2) * gap;
    if (s.n) glow(ctx, CYAN, cx, cy, 14 + s.pop * 6, 0.25 + 0.3 * s.pop + (s.busy ? 0.4 : 0));
    for (let i = 0; i < NEED; i++) {
      const x = cx - W / 2 + (i + Math.floor(i / 4)) * gap + gap, lit = i < s.n;
      ctx.globalAlpha = lit ? 1 : 0.4; ctx.strokeStyle = lit ? (s.busy ? '#ffffff' : CYAN) : '#2a3440'; ctx.lineWidth = lit ? 1.6 : 1.2;
      ctx.beginPath(); ctx.moveTo(x + 1.6, cy - 4); ctx.lineTo(x - 1.6, cy + 4); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  },
};
