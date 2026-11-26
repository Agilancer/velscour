// The Castle's ten bosses as raid bosses (the fourth host of RAID_BOSSES, `sigs: true`; art from data/castlekin.js).
// Each fights around one fight-long rule of its own (CASTLE_PASSIVES, run every frame) and two signature attacks
// (registered in raidsigs.js SIGS), with the same auto-play hooks as the third host: danger(out), autoGoal(), safeAt.
//   The Drowned Castellan  Rising Moat: the arena floods ring by ring from the walls in; then it drains
//   Matron of Keys         Locked Doors: bars seal the hero in their quarter; find the key before the locks tighten
//   The Last Bell          Three Tolls: on the third, only the hush (a quiet circle) is safe
//   Reliquary Seraph       Relic Chorus: three relics ward the Seraph; break them, and they come back each phase
//   Furnace Regent         The Forge Floor: alternate squares of the floor heat white-hot
//   The Rack Saint         The Breaking Wheel: spokes of light turn round it all fight long
//   Banquet Below          The Feast: dishes appear; eat them (heal, but grow sluggish) or it eats them (heals)
//   The Veiled Seneschal   Masquerade: it hides among veiled copies; strike a false face and it bursts on you
//   Sable Briar            Overgrowth: thorns spread over the floor, patch by patch
//   Crownless Colossus     The Lost Crown: take the crown to hurt it more, or it crowns itself and rages
import { G } from '../state.js';
import { rand, chance, TAU, clamp, angleTo, angleDiff, dist, pick } from '../core/util.js';
import { isoX, isoY, HW, HH, camera } from '../core/view.js';
import { sfx } from '../core/audio.js';
import { addEffect, Ring, Bolt, Column, burst, spawn, sparkle, floatText, smoke, addLight, glowSprite } from '../gfx/vfx.js';
import { explosionFx } from '../gfx/shapes.js';
import { hit } from './combat.js';
import { Projectile, Area, lineTargets, coneTargets } from './hazards.js';
import { UI } from '../ui/ui.js';
import { SIGKIT, PASSIVES } from './raidsigs.js';
import { blockTiles, drawBars, Shot } from './castlekin.js';

const { sig, blast, line, zone, mover, add, randFloor, say, later, hero, live, dmgOf, tele } = SIGKIT;
const A = (R) => R.arena;
const inArena = (R, x, y) => { const a = A(R); return x > a.x + 1 && y > a.y + 1 && x < a.x + a.w - 1 && y < a.y + a.h - 1; };
const ground = (R, o) => R.m.world.addHazard({ ground: true, t: 0, draw() {}, ...o, update(dt) { this.t += dt; if (o.tick && o.tick.call(this, dt) === false) return false; return live(R) && (!o.dur || this.t < o.dur); } });

// ======================================================================================== 1 The Drowned Castellan
sig('anchor_throw', 'Anchor Throw', (R, t) => {
  const m = R.m, w = m.world, ang = angleTo(m.x, m.y, t.x, t.y), L = Math.min(11, w.map.rayLength(m.x, m.y, ang, 11));
  tele({ kind: 'line', x: m.x, y: m.y, ang, len: L, w: 0.6, dur: 0.9, color: '#60a0c0' });
  later(w, 0.9, () => {
    if (!live(R)) return;
    for (const c of lineTargets(w, m.team, m.x, m.y, m.x + Math.cos(ang) * L, m.y + Math.sin(ang) * L, 0.6)) {
      hit(m, c, R.m.dmg * 1.4, 'cold', { crit: false });
      const a = angleTo(c.x, c.y, m.x, m.y), d = dist(c.x, c.y, m.x, m.y);
      c.kbx += Math.cos(a) * d * 3.2; c.kby += Math.sin(a) * d * 3.2;
      floatText(c.x, c.y, 80, 'HAULED IN', '#60a0c0', 14);
    }
    addEffect(new Bolt(m.x, m.y, 40, m.x + Math.cos(ang) * L, m.y + Math.sin(ang) * L, 20, '#8ab0c0', 0.3, 5));
    sfx('swing');
  });
});
sig('sluice_gates', 'Sluice Gates', (R) => {
  const a = A(R), horiz = chance(0.5), n = 3 + R.pi, group = new Set();
  for (let i = 0; i < n; i++) {
    const k = (i + 0.5) / n, x = horiz ? a.x + 1 : a.x + a.w * k, y = horiz ? a.y + a.h * k : a.y + 1;
    later(R.m.world, i * 0.25, () => live(R) && line(R, x, y, horiz ? 0 : Math.PI / 2, horiz ? a.w : a.h, 0.8, 1.2, 1.1, '#60b0e0', { el: 'cold', knock: 2, group }));
  }
  UI.centerMsg('SLUICE GATES', 'Stand between the torrents', 1.6);
  sfx('cold');
});

// ======================================================================================== 2 Matron of Keys
sig('key_volley', 'Key Volley', (R, t) => {
  const m = R.m, w = m.world, n = 5 + R.pi * 2;
  for (let i = 0; i < n; i++) later(w, i * 0.12, () => {
    if (!live(R)) return;
    const p = hero(R); if (!p) return;
    const a = angleTo(m.x, m.y, p.x, p.y) + rand(-0.5, 0.5);
    w.addHazard(new Shot({ world: w, team: m.team, x: m.x, y: m.y, ang: a, speed: 9, range: 13, color: '#ffd060', size: 1.2, onHit: (c) => hit(m, c, m.dmg * 0.6, 'arcane', { crit: false }) }));
  });
  sfx('pickup');
});
sig('chain_gaol', 'Chain Gaol', (R, t) => {
  const w = R.m.world, cx = Math.floor(t.x), cy = Math.floor(t.y), gap = Math.floor(rand(4)), list = [];
  for (let k = -2; k <= 2; k++) for (const [x, y, s] of [[cx + k, cy - 2, 0], [cx + 2, cy + k, 1], [cx + k, cy + 2, 2], [cx - 2, cy + k, 3]]) if (!(s === gap && Math.abs(k) <= 1)) list.push([x, y]);
  blockTiles(w, list, 3.4, drawBars);
  blast(R, cx + 0.5, cy + 0.5, 1.8, 2.2, 2.2, { el: 'arcane', fx: 'nova' });
  floatText(t.x, t.y, 90, 'GAOLED', '#c0a0ff', 15);
  sfx('thud');
});

// ======================================================================================== 3 The Last Bell
/** An expanding ring with a gap: be in the gap (or far out of reach) when it passes. */
function outRing(R, x, y, r1, speed, gapW, mul, color) {
  const w = R.m.world, gap = rand(TAU), done = new Set();
  return w.addHazard({ ground: true, r: 0.6, t: 0,
    inGap(px, py) { return Math.abs(angleDiff(gap, angleTo(x, y, px, py))) < gapW / 2; },
    danger(out) { out.push({ ring: true, x, y, r0: Math.max(0, this.r - 0.6), r1: this.r + 1.6, gap, gapW: gapW * 0.8 }); },
    update(dt) {
      if (!live(R)) return false;
      this.r += speed * dt;
      for (const c of w.hostiles(R.m.team, x, y, this.r + 1)) {
        if (done.has(c) || Math.abs(dist(x, y, c.x, c.y) - this.r) > 0.5 || this.inGap(c.x, c.y)) continue;
        done.add(c); hit(R.m, c, R.m.dmg * mul, R.tpl.el, { knock: 1, ang: angleTo(x, y, c.x, c.y) });
      }
      return this.r < r1;
    },
    draw(ctx) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (const [lw, al] of [[10, 0.2], [3, 0.9]]) {
        ctx.globalAlpha = al; ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.beginPath();
        for (let i = 0; i <= 64; i++) { const a = gap + gapW / 2 + (i / 64) * (TAU - gapW), px = x + Math.cos(a) * this.r, py = y + Math.sin(a) * this.r; i ? ctx.lineTo(isoX(px, py), isoY(px, py)) : ctx.moveTo(isoX(px, py), isoY(px, py)); }
        ctx.stroke();
      }
      ctx.restore();
    } });
}
sig('resonance', 'Resonance', (R) => {
  const m = R.m;
  for (let i = 0; i < 2 + R.pi; i++) later(m.world, i * 0.9, () => live(R) && outRing(R, m.x, m.y, 16, 5, 1.1, 1.1, '#ffe080'));
  sfx('thud');
});
sig('bell_drop', 'Bell Drop', (R, t) => {
  const n = 5 + R.pi * 2;
  blast(R, t.x, t.y, 1.6, 1.6, 2, { el: 'light', fx: 'eruption', o: { stun: true } });
  for (let i = 1; i < n; i++) { const [x, y] = randFloor(R, 2); blast(R, x, y, 1.6, 1.2 + rand(0.8), 1.8, { el: 'light', fx: 'eruption', o: { stun: true } }); }
  sfx('swing');
});

// ======================================================================================== 4 Reliquary Seraph
sig('saints_lance', "Saint's Lance", (R, t) => {
  const srcs = (R.relics || []).filter((r) => !r.dead), from = srcs.length ? srcs : [R.m], group = new Set();
  for (const s of from) line(R, s.x, s.y, angleTo(s.x, s.y, t.x, t.y), 20, 0.55, 1.2, 1.3, '#fff0b0', { el: 'holy', group });
  sfx('holy');
});
sig('ascension', 'Ascension', (R) => {
  const m = R.m, w = m.world, n = 4 + R.pi;
  m.targetable = false;
  const S = ground(R, { dur: 3.4, tick(dt) { m.z = Math.min(80, (m.z || 0) + 120 * dt); } });
  for (let i = 0; i < n; i++) later(w, 0.4 + i * 0.55, () => { const p = hero(R); if (live(R) && p) blast(R, p.x, p.y, 1.5, 1, 1.6, { el: 'holy', fx: 'nova' }); });
  later(w, 3.4, () => { if (!live(R)) return; m.targetable = true; m.z = 0; explosionFx(m.x, m.y, 3, 'holy', 'nova', { shake: 8 }); for (const c of w.hostiles(m.team, m.x, m.y, 3.5)) hit(m, c, m.dmg * 1.6, 'holy', { knock: 2, ang: angleTo(m.x, m.y, c.x, c.y) }); });
  UI.centerMsg('ASCENSION', 'Keep moving!', 1.6);
  sfx('holy');
  return S;
});

// ======================================================================================== 5 Furnace Regent
sig('molten_pour', 'Molten Pour', (R, t) => {
  const m = R.m, w = m.world, base = angleTo(m.x, m.y, t.x, t.y);
  for (const off of R.pi >= 2 ? [-0.5, 0, 0.5] : [-0.3, 0.3]) {
    const ang = base + off, L = Math.min(12, w.map.rayLength(m.x, m.y, ang, 12));
    line(R, m.x, m.y, ang, L, 0.7, 1.1, 1.4, '#ff7020', { el: 'fire' });
    later(w, 1.15, () => { if (!live(R)) return; for (let k = 1.5; k < L; k += 1.6) w.addHazard(new Area({ world: w, src: m, x: m.x + Math.cos(ang) * k, y: m.y + Math.sin(ang) * k, r: 0.9, dur: 5, tick: 0.5, dmg: dmgOf(R, 0.18), el: 'fire', fx: 'fire' })); });
  }
  sfx('fire');
});
sig('bellows_blast', 'Bellows Blast', (R) => {
  const m = R.m, w = m.world, p = hero(R);
  ground(R, { dur: 1.6, tick(dt) { if (!p || p.dead) return; const a = angleTo(p.x, p.y, m.x, m.y); p.kbx += Math.cos(a) * 7 * dt; p.kby += Math.sin(a) * 7 * dt; } });
  later(w, 1.6, () => {
    if (!live(R) || !p) return;
    const ang = angleTo(m.x, m.y, p.x, p.y);
    tele({ kind: 'cone', x: m.x, y: m.y, ang, half: 0.7, len: 7, dur: 0.5, color: '#ff8030' });
    later(w, 0.5, () => { if (!live(R)) return; for (const c of coneTargets(w, m.team, m.x, m.y, ang, 7, 0.7)) hit(m, c, m.dmg * 2, 'fire', { knock: 3, ang, burn: true }); for (let i = 0; i < 30; i++) { const a = ang + rand(-0.7, 0.7), r = rand(1, 7); spawn({ type: 'glow', x: m.x + Math.cos(a) * r, y: m.y + Math.sin(a) * r, z: 20, vz: 40, life: 0.6, size: 6, size1: 0, color: '#ff8030', add: true }); } sfx('fire'); });
  });
  UI.centerMsg('THE BELLOWS DRAW', 'Get out of its breath!', 1.6);
});

// ======================================================================================== 6 The Rack Saint
sig('stretch', 'The Stretch', (R, t) => {
  const m = R.m, w = m.world;
  if (!t.isPlayer) return;
  let k = 0;
  ground(R, { dur: 2.4,
    tick(dt) { if (t.dead) return false; const a = angleTo(m.x, m.y, t.x, t.y); t.kbx += Math.cos(a) * 6 * dt; t.kby += Math.sin(a) * 6 * dt; if ((k -= dt) <= 0) { k = 0.4; hit(m, t, m.dmg * 0.4, 'blood', { dot: true, crit: false }); burst(t.x, t.y, 30, 'blood', 4, 2); } },
    draw(ctx) { const ax = isoX(m.x, m.y), ay = isoY(m.x, m.y) - 60, bx = isoX(t.x, t.y), by = isoY(t.x, t.y) - 30; ctx.save(); ctx.strokeStyle = '#c08060'; ctx.lineWidth = 2; for (const o of [-4, 0, 4]) { ctx.beginPath(); ctx.moveTo(ax, ay + o); ctx.lineTo(bx, by + o); ctx.stroke(); } ctx.restore(); } });
  floatText(t.x, t.y, 90, 'STRETCHED', '#c08060', 15); sfx('swing');
});
sig('martyrs_nails', "Martyr's Nails", (R, t) => {
  const n = 8 + R.pi * 3;
  blast(R, t.x, t.y, 1.2, 1.1, 1.4, { el: 'phys', fx: 'eruption', o: { bleed: true } });
  for (let i = 1; i < n; i++) { const [x, y] = randFloor(R, 2); blast(R, x, y, 1.1, 0.9 + rand(0.9), 1.3, { el: 'phys', fx: 'eruption', o: { bleed: true } }); }
  sfx('hit');
});

// ======================================================================================== 7 Banquet Below
sig('devour', 'Devour', (R, t) => {
  const m = R.m, w = m.world, ang = angleTo(m.x, m.y, t.x, t.y);
  tele({ kind: 'cone', x: m.x, y: m.y, ang, half: 0.6, len: 8, dur: 1.8, color: '#c04060' });
  ground(R, { dur: 1.8, danger(out) { out.push({ cone: true, x: m.x, y: m.y, ang, half: 0.7, r: 8.5 }); },
    tick(dt) { for (const c of coneTargets(w, m.team, m.x, m.y, ang, 8, 0.6)) { if (c.static) continue; const a = angleTo(c.x, c.y, m.x, m.y); c.kbx += Math.cos(a) * 8 * dt; c.kby += Math.sin(a) * 8 * dt; } } });
  later(w, 1.8, () => { if (!live(R)) return; for (const c of w.hostiles(m.team, m.x + Math.cos(ang) * 1.6, m.y + Math.sin(ang) * 1.6, 2)) { hit(m, c, m.dmg * 2.4, 'poison', { crit: false }); floatText(c.x, c.y, 80, 'DEVOURED', '#c04060', 15); } camera.shake(6); sfx('roar'); });
  UI.centerMsg('IT INHALES', 'Run from its mouth!', 1.6);
});
sig('spoiled_courses', 'Spoiled Courses', (R, t) => {
  const m = R.m, w = m.world, n = 4 + R.pi * 2;
  for (let i = 0; i < n; i++) {
    const [x, y] = i ? randFloor(R, 2) : [t.x, t.y];
    blast(R, x, y, 1.3, 1.2 + i * 0.1, 1.2, { el: 'poison', fx: 'explosion' });
    later(w, 1.25 + i * 0.1, () => live(R) && w.addHazard(new Area({ world: w, src: m, x, y, r: 1.2, dur: 6, tick: 0.5, dmg: dmgOf(R, 0.15), el: 'poison', fx: 'poison' })));
  }
  sfx('swing');
});

// ======================================================================================== 8 The Veiled Seneschal
sig('veil_daggers', 'Veil Daggers', (R) => {
  const m = R.m, w = m.world, n = 10 + R.pi * 3;
  for (let k = 0; k < 3; k++) later(w, k * 0.35, () => {
    if (!live(R)) return;
    for (let i = 0; i < n; i++) w.addHazard(new Projectile({ world: w, src: m, x: m.x, y: m.y, z: 40, ang: (i / n) * TAU + k * 0.2, speed: 6, range: 12, fx: 'skull', el: 'shadow', dmg: dmgOf(R, 0.55) }));
  });
  sfx('arcane');
});
sig('veil_step', 'Veil Step', (R, t) => {
  const m = R.m, w = m.world, back = angleTo(t.x, t.y, m.x, m.y) + Math.PI;
  const [x, y] = w.map.nudge(t.x + Math.cos(back + Math.PI) * -1.6, t.y + Math.sin(back + Math.PI) * -1.6, m.r);
  sparkle(m.x, m.y, 60, '#a060c0', 20, 1);
  m.x = x; m.y = y;
  const ang = angleTo(m.x, m.y, t.x, t.y);
  tele({ kind: 'cone', x: m.x, y: m.y, ang, half: 0.9, len: 3.5, dur: 0.55, color: '#a060c0' });
  later(w, 0.55, () => { if (!live(R)) return; for (const c of coneTargets(w, m.team, m.x, m.y, ang, 3.5, 0.9)) hit(m, c, m.dmg * 1.9, 'shadow', { knock: 1.5, ang }); sfx('swing'); });
  sfx('arcane');
});

// ======================================================================================== 9 Sable Briar
sig('thorn_lash', 'Thorn Lash', (R, t) => {
  const m = R.m, w = m.world, ang = angleTo(m.x, m.y, t.x, t.y);
  tele({ kind: 'cone', x: m.x, y: m.y, ang, half: 1, len: 6.5, dur: 0.9, color: '#80a040' });
  ground(R, { dur: 0.95, danger(out) { out.push({ cone: true, x: m.x, y: m.y, ang, half: 1.1, r: 7 }); } });
  later(w, 0.9, () => { if (!live(R)) return; for (const c of coneTargets(w, m.team, m.x, m.y, ang, 6.5, 1)) hit(m, c, m.dmg * 1.8, 'poison', { bleed: true, knock: 1, ang }); sfx('swing'); });
});
sig('bramble_wall', 'Bramble Wall', (R, t) => {
  const m = R.m, w = m.world, a = angleTo(m.x, m.y, t.x, t.y), mx = (m.x + t.x) / 2, my = (m.y + t.y) / 2, px = -Math.sin(a), py = Math.cos(a), list = [];
  for (let k = -5; k <= 5; k += 0.5) if (Math.abs(k) > 0.8) list.push([Math.floor(mx + px * k), Math.floor(my + py * k)]);
  blockTiles(w, [...new Map(list.map((q) => [q.join(), q])).values()], 6, (ctx, x, y, k) => {
    const sx = isoX(x, y), sy = isoY(x, y);
    ctx.save(); ctx.globalAlpha = k; ctx.strokeStyle = '#3a4a20'; ctx.lineWidth = 3;
    for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(sx - 14 + i * 7, sy + 2); ctx.quadraticCurveTo(sx - 10 + i * 6, sy - 30, sx - 16 + i * 8, sy - 40 * k); ctx.stroke(); }
    ctx.fillStyle = '#c04040'; for (let i = 0; i < 4; i++) ctx.fillRect(sx - 12 + i * 8, sy - 18 - (i % 2) * 10, 3, 3);
    ctx.restore();
  });
  line(R, m.x, m.y, a, 12, 0.7, 1.3, 1.6, '#80a040', { el: 'poison' });
  sfx('thud');
});

// ======================================================================================== 10 Crownless Colossus
sig('usurper_stomp', "Usurper's Stomp", (R) => {
  const w = R.m.world;
  for (let i = 0; i < 3; i++) later(w, i * 0.75, () => { const p = hero(R); if (live(R) && p) blast(R, p.x, p.y, 1.5 + i * 0.6, 0.8, 1.7, { el: 'phys', fx: 'eruption', o: { knock: 1.5 } }); });
  sfx('thud');
});
sig('crumbling_throne', 'Crumbling Throne', (R) => {
  const a = A(R), safes = [0, 1, 2].map(() => randFloor(R, 4));
  for (const [x, y] of safes) zone(R, { x, y, r: 1.6, dur: 3.2, color: '#ffe0a0', good: true });
  for (let i = 0; i < 70; i++) {
    const x = a.x + rand(1, a.w - 1), y = a.y + rand(1, a.h - 1);
    if (safes.some(([sx, sy]) => dist(sx, sy, x, y) < 2.4) || !R.m.world.map.walkable(x, y)) continue;
    blast(R, x, y, 1.3, 2.6 + rand(0.5), 1.6, { el: 'phys', fx: 'eruption' });
  }
  UI.centerMsg('THE THRONE CRUMBLES', 'Find the light!', 2.2);
  camera.shake(6); sfx('roar');
});

// ======================================================================================== passives
export const CASTLE_PASSIVES = {
  // the moat rises a ring at a time from the walls inward (three steps), then drains
  castellan(R, dt) {
    const a = A(R), w = R.m.world, p = hero(R), far = Math.max(a.w, a.h) / 2;
    if (R.moatT === undefined) { R.moatT = 6; R.moat = 0; R.moatUp = true; }
    if ((R.moatT -= dt) <= 0) {
      if (R.moatUp && R.moat < 3) { R.moat++; R.moatT = 8; UI.centerMsg('THE MOAT RISES', 'Keep to the middle', 1.4); sfx('cold'); }
      else if (R.moat > 0) { R.moatUp = false; R.moat = 0; R.moatT = 9; floatText(R.m.x, R.m.y, 120, 'THE MOAT DRAINS', '#60a0c0', 15); }
      else { R.moatUp = true; R.moatT = 2; }
    }
    const dry = far - R.moat * 2.6;
    R.moatR = (R.moatR ?? far) + clamp(dry - (R.moatR ?? far), -3 * dt, 3 * dt);
    if (!R.moatFx) R.moatFx = w.addHazard({ ground: true,
      danger(out) { if (R.moat) out.push({ ring: true, x: a.cx, y: a.cy, r0: R.moatR, r1: 60, gap: 0, gapW: 0 }); },
      autoGoal() { return R.moat ? { x: a.cx, y: a.cy, r: Math.max(1, R.moatR - 1.5) } : null; },
      update() { return live(R); },
      draw(ctx) {
        if (R.moatR >= far - 0.1) return;
        const px = isoX(a.cx, a.cy), py = isoY(a.cx, a.cy);
        ctx.save(); ctx.globalAlpha = 0.32; ctx.fillStyle = '#204a60';
        ctx.beginPath(); ctx.ellipse(px, py, far * 2 * HW, far * 2 * HH, 0, 0, TAU); ctx.ellipse(px, py, R.moatR * HW * 1.41, R.moatR * HH * 1.41, 0, 0, TAU); ctx.fill('evenodd');
        ctx.globalAlpha = 0.7; ctx.strokeStyle = '#80c0e0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(px, py, R.moatR * HW * 1.41, R.moatR * HH * 1.41, 0, 0, TAU); ctx.stroke();
        ctx.restore();
      } });
    if (p && R.moat && dist(p.x, p.y, a.cx, a.cy) > R.moatR) {
      p.status.slow = { t: 0.2, amt: 0.4 };
      if ((R.moatHurt = (R.moatHurt || 0) - dt) <= 0) { R.moatHurt = 0.5; hit(R.m, p, p.maxHp * 0.035, 'cold', { force: true, crit: false, dot: true }); }
    }
  },
  // every 18 s the bars come down round the hero's quarter of the arena; a key appears in it
  matron(R, dt) {
    const a = A(R), w = R.m.world, p = hero(R);
    if (!p) return;
    if (R.lockT === undefined) R.lockT = 10;
    if (R.locked) {
      R.locked.t += dt;
      if (R.locked.key.dead) { R.locked.bars && (R.locked.bars.t = 999); R.locked = null; R.lockT = 18; R.m.status.stun = { t: 2 }; say(R, 'THE LOCK TURNS', '#ffd060'); return; }
      if (R.locked.t > 10) { R.locked.key.dead = true; R.locked.bars && (R.locked.bars.t = 999); R.locked = null; R.lockT = 18; hit(R.m, p, p.maxHp * 0.4, 'arcane', { force: true, crit: false }); UI.centerMsg('THE LOCKS TIGHTEN', '', 1.4); explosionFx(p.x, p.y, 2, 'arcane', 'nova'); }
      return;
    }
    if ((R.lockT -= dt) > 0) return;
    const qx = p.x < a.cx ? -1 : 1, qy = p.y < a.cy ? -1 : 1, list = [];
    for (let x = a.x; x < a.x + a.w; x++) list.push([x, Math.floor(a.cy)]);
    for (let y = a.y; y < a.y + a.h; y++) list.push([Math.floor(a.cx), y]);
    const bars = blockTiles(w, list, 12, drawBars);
    let kx = a.cx + qx * a.w / 4, ky = a.cy + qy * a.h / 4;
    for (let i = 0; i < 20 && !w.map.walkable(kx, ky); i++) { kx = a.cx + qx * rand(2, a.w / 2 - 2); ky = a.cy + qy * rand(2, a.h / 2 - 2); }
    let held = 0;
    const key = zone(R, { x: kx, y: ky, r: 0.9, dur: 11, color: '#ffd060', good: true });
    key.tick = (dt2) => { if (key.inside(p)) { held += dt2; if (held > 0.8) { key.dead = true; floatText(p.x, p.y, 80, 'THE KEY!', '#ffd060', 15); sfx('pickup'); } } else held = 0; };
    R.locked = { t: 0, key, bars };
    UI.centerMsg('LOCKED IN', 'Find the key!', 2);
    sfx('thud');
  },
  // tolls every 7 s; at the second toll a hush appears; the third is the Last Bell
  lastbell(R, dt) {
    const w = R.m.world, p = hero(R);
    if ((R.tollT = (R.tollT ?? 6) - dt) > 0) return;
    R.tollT = 7; R.toll = ((R.toll || 0) % 3) + 1;
    const m = R.m;
    addEffect(new Ring(m.x, m.y, 0.3, 5, 0.6, '#ffe080', 5));
    if (R.toll < 3) {
      floatText(m.x, m.y, m.artH * m.scale + 20, R.toll === 1 ? 'I' : 'II', '#ffe080', 22, { life: 1.6 });
      for (const c of w.hostiles(m.team, m.x, m.y, 3)) c.status.stun = { t: 0.8 };
      if (R.toll === 2) { const [x, y] = randFloor(R, 4); R.hush = zone(R, { x, y, r: 2, dur: 7.5, color: '#c0e0ff', good: true }); UI.centerMsg('THE SECOND TOLL', 'Find the hush before the third', 2); }
      sfx('thud', 0.8);
      return;
    }
    UI.centerMsg('THE LAST BELL', '', 1.4); G.flash = 0.5; camera.shake(10); sfx('thud', 1); sfx('boss', 0.5);
    for (const c of w.hostiles(m.team, m.x, m.y, 60)) if (!(R.hush && R.hush.inside(c))) { hit(m, c, c.maxHp * 0.45, 'light', { force: true, crit: false }); floatText(c.x, c.y, 80, 'DEAFENED', '#ffe080', 14); }
    R.hush = null;
  },
  // three relics ward the Seraph (a quarter of the damage each); they return each phase
  seraph(R, dt) {
    const a = A(R), m = R.m;
    if (R.relicPi !== R.pi) {
      R.relicPi = R.pi;
      R.relics = [0, 1, 2].map((i) => {
        const ang = (i / 3) * TAU + rand(0.5), [x, y] = R.m.world.map.nudge(a.cx + Math.cos(ang) * 6, a.cy + Math.sin(ang) * 6, 0.5);
        return add(R, x, y, { name: 'Reliquary', static: true, hp: 0.035, sprite: 'crystal', aura: '#fff0b0', priority: 6, tick: () => {} });
      });
      say(R, 'THE RELICS SING', '#fff0b0');
      for (const r of R.relics) { const L = r; ground(R, { draw(ctx) { if (L.dead) return; const ax = isoX(L.x, L.y), ay = isoY(L.x, L.y) - 30, bx = isoX(m.x, m.y), by = isoY(m.x, m.y) - 80; ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5; ctx.strokeStyle = '#fff0b0'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke(); ctx.restore(); }, tick() { return !L.dead; } }); }
    }
    const up = R.relics.filter((r) => !r.dead).length;
    if (!R.inter) m.ward = 1 - 0.25 * up;
  },
  // squares of the floor heat in turn: warn (glow) 1.5 s, burn 2.5 s
  regent(R, dt) {
    const a = A(R), w = R.m.world, p = hero(R), S = 4;
    if ((R.forgeT = (R.forgeT ?? 4) - dt) <= 0) { R.forgeT = 4.5; R.forgeOdd = !R.forgeOdd; R.forgeAt = R.t; }
    const age = R.t - (R.forgeAt ?? -99), hot = age > 1.5 && age < 4, warm = age <= 1.5;
    const cellHot = (x, y) => ((Math.floor((x - a.x) / S) + Math.floor((y - a.y) / S)) % 2 === 0) === !!R.forgeOdd;
    if (!R.forgeFx) R.forgeFx = w.addHazard({ ground: true,
      danger(out) { if (age < 4.3) for (let x = a.x; x < a.x + a.w; x += S) for (let y = a.y; y < a.y + a.h; y += S) if (cellHot(x + 0.5, y + 0.5)) out.push({ x: x + S / 2, y: y + S / 2, r: S * 0.72 }); },
      autoGoal() { if (!p || !cellHot(p.x, p.y) || age > 4) return null; for (const [dx, dy] of [[S, 0], [-S, 0], [0, S], [0, -S]]) { const x = p.x + dx, y = p.y + dy; if (inArena(R, x, y) && !cellHot(x, y) && w.map.walkable(x, y)) return { x: Math.floor((x - a.x) / S) * S + a.x + S / 2, y: Math.floor((y - a.y) / S) * S + a.y + S / 2, r: 1 }; } return null; },
      update() { return live(R); },
      draw(ctx) {
        const ag = R.t - (R.forgeAt ?? -99);
        if (ag > 4.3) return;
        ctx.save();
        for (let x = a.x; x < a.x + a.w; x += S) for (let y = a.y; y < a.y + a.h; y += S) {
          if (!cellHot(x + 0.5, y + 0.5)) continue;
          ctx.globalAlpha = ag <= 1.5 ? 0.12 + 0.12 * Math.sin(ag * 12) : 0.38;
          ctx.fillStyle = ag <= 1.5 ? '#ff9040' : '#ff5010';
          ctx.beginPath(); ctx.moveTo(isoX(x, y), isoY(x, y)); ctx.lineTo(isoX(x + S, y), isoY(x + S, y)); ctx.lineTo(isoX(x + S, y + S), isoY(x + S, y + S)); ctx.lineTo(isoX(x, y + S), isoY(x, y + S)); ctx.closePath(); ctx.fill();
        }
        ctx.restore();
      } });
    if (warm && age < dt * 1.5) UI.centerMsg('THE FORGE FLOOR', 'Off the glowing squares!', 1.2);
    if (hot && p && cellHot(p.x, p.y) && (R.forgeHurt = (R.forgeHurt || 0) - dt) <= 0) { R.forgeHurt = 0.5; hit(R.m, p, p.maxHp * 0.06, 'fire', { force: true, crit: false, dot: true }); }
    if (hot && chance(dt * 30)) { const x = a.x + rand(a.w), y = a.y + rand(a.h); if (cellHot(x, y)) spawn({ type: 'glow', x, y, z: 2, vz: 40, life: 0.6, size: 4, size1: 0, color: '#ff7020', add: true }); }
  },
  // spokes of light turn round the Saint all fight long, faster each phase
  racksaint(R, dt) {
    const m = R.m, w = m.world, n = 3 + (R.pi >= 2 ? 1 : 0), L = 8;
    R.wheel = (R.wheel || 0) + dt * (0.5 + R.pi * 0.12);
    R.wheelHits = R.wheelHits || new Map();
    if (!R.wheelFx) R.wheelFx = w.addHazard({ ground: true,
      danger(out) { for (let i = 0; i < n; i++) { const a = R.wheel + (i / n) * TAU + 0.25; out.push({ line: true, x: m.x, y: m.y, x1: m.x + Math.cos(a) * L, y1: m.y + Math.sin(a) * L, r: 0.9 }); } },
      update() { return live(R); },
      draw(ctx) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < n; i++) { const a = R.wheel + (i / n) * TAU, x1 = m.x + Math.cos(a) * L, y1 = m.y + Math.sin(a) * L;
          for (const [lw, al] of [[12, 0.15], [3, 0.8]]) { ctx.globalAlpha = al; ctx.strokeStyle = '#ff6040'; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(isoX(m.x, m.y), isoY(m.x, m.y)); ctx.lineTo(isoX(x1, y1), isoY(x1, y1)); ctx.stroke(); } }
        ctx.restore();
      } });
    if (R.t < 3) return; // a moment to read it
    for (let i = 0; i < n; i++) {
      const a = R.wheel + (i / n) * TAU;
      for (const c of lineTargets(w, m.team, m.x + Math.cos(a) * 1.2, m.y + Math.sin(a) * 1.2, m.x + Math.cos(a) * L, m.y + Math.sin(a) * L, 0.35)) {
        if ((R.wheelHits.get(c) || 0) > R.t) continue;
        R.wheelHits.set(c, R.t + 1);
        hit(m, c, m.dmg * 0.9, 'blood', { knock: 1, ang: a + Math.PI / 2, crit: false });
      }
    }
  },
  // dishes appear; whoever gets there first is fed
  banquet(R, dt) {
    const m = R.m, w = m.world, p = hero(R);
    if (!p) return;
    if (p.gluttony > 0) { p.gluttony = Math.max(0, p.gluttony - dt / 20); p.status.slow = { t: 0.2, amt: Math.min(0.5, p.gluttony * 0.08) }; }
    if ((R.dishT = (R.dishT ?? 4) - dt) > 0) return;
    R.dishT = 8 - R.pi;
    const [x, y] = randFloor(R, 3);
    let held = 0;
    const D = zone(R, { x, y, r: 0.9, dur: 6.5, color: '#ffc060', good: true });
    D.goal = p.hp < p.maxHp * 0.7;
    D.tick = (dt2) => {
      if (D.inside(p)) { held += dt2; if (held > 0.6) { D.dead = true; p.heal ? p.heal(p.maxHp * 0.12) : (p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.12)); p.gluttony = (p.gluttony || 0) + 1; floatText(p.x, p.y, 80, 'GLUTTONY', '#ffc060', 14); sfx('pickup'); } } else held = 0;
      if (D.t > 6.3 && !D.dead) { D.dead = true; m.heal(m.maxHp * 0.04); addEffect(new Bolt(x, y, 10, m.x, m.y, 60, '#ffc060', 0.4, 4)); say(R, 'IT FEASTS', '#ffc060'); }
    };
    floatText(x, y, 40, 'a dish is served', '#ffc060', 12);
  },
  // the Seneschal hides among veiled copies; a false face bursts when struck
  seneschal(R, dt) {
    const m = R.m, w = m.world, a = A(R);
    if (R.masq) {
      const M = R.masq;
      M.t += dt;
      if (chance(dt * 4)) sparkle(m.x + rand(-0.4, 0.4), m.y + rand(-0.4, 0.4), rand(40, 120), '#ffd060', 1, 0.2); // the tell
      if (m.hp < M.hp - m.maxHp * 0.01 || M.t > 12) {
        for (const d of M.decoys) if (!d.dead) { d.dead = true; sparkle(d.x, d.y, 60, '#a060c0', 20, 1); }
        if (M.t <= 12) { m.status.stun = { t: 2 }; say(R, 'UNMASKED', '#ffd060'); }
        R.masq = null; R.masqT = 22;
      }
      return;
    }
    if ((R.masqT = (R.masqT ?? 15) - dt) > 0 || R.inter) return;
    const spots = [0, 1, 2, 3, 4].map((i) => { const ang = (i / 5) * TAU + rand(0.3); return w.map.nudge(a.cx + Math.cos(ang) * 5, a.cy + Math.sin(ang) * 5, 1); });
    const real = Math.floor(rand(5)), decoys = [];
    spots.forEach(([x, y], i) => {
      if (i === real) { sparkle(m.x, m.y, 60, '#a060c0', 20, 1); m.x = x; m.y = y; return; }
      const d = add(R, x, y, { name: m.name, art: R.artId, artH: m.artH, hp: 0.01, ai: 'melee', priority: 0, aura: '#a060c0', tick: (c) => { c.face(angleTo(c.x, c.y, (hero(R) || c).x, (hero(R) || c).y)); },
        onDeath: (c) => { const p = hero(R); if (p && !p.dead) { hit(m, p, p.maxHp * 0.2, 'shadow', { force: true, crit: false }); floatText(p.x, p.y, 80, 'A FALSE FACE', '#a060c0', 15); } explosionFx(c.x, c.y, 2, 'shadow', 'nova'); } });
      d.scale = m.scale; d.r = m.r; d.title = m.title;
      decoys.push(d);
    });
    R.masq = { t: 0, decoys, hp: m.hp };
    UI.centerMsg('MASQUERADE', 'Only one of them is real', 2.2);
    sfx('arcane');
  },
  // thorns spread over the floor, patch by patch
  briar(R, dt) {
    const w = R.m.world, p = hero(R);
    R.thorns = (R.thorns || []).filter((z) => !z.dead && z.t < z.dur);
    if ((R.thornT = (R.thornT ?? 3) - dt) <= 0 && R.thorns.length < 14 + R.pi * 3) {
      R.thornT = Math.max(1.2, 2.6 - R.pi * 0.4);
      const from = R.thorns.length && chance(0.75) ? pick(R.thorns) : null;
      const [x, y] = from ? [from.x + rand(-2.4, 2.4), from.y + rand(-2.4, 2.4)] : randFloor(R, 3);
      if (inArena(R, x, y) && w.map.walkable(x, y)) {
        let hurt = 0;
        const z = zone(R, { x, y, r: 1.3, dur: 20, color: '#507030', good: false });
        z.tick = (dt2) => { if (p && z.t > 0.8 && z.inside(p)) { p.status.slow = { t: 0.2, amt: 0.3 }; if ((hurt -= dt2) <= 0) { hurt = 0.5; hit(R.m, p, p.maxHp * 0.03, 'poison', { force: true, crit: false, dot: true }); burst(p.x, p.y, 20, 'blood', 3, 2); } } };
        R.thorns.push(z);
      }
    }
  },
  // the crown: hold it to wound the Colossus; leave it and the Colossus crowns itself
  colossus(R, dt) {
    const m = R.m, w = m.world, p = hero(R);
    if (!p) return;
    if (R.crownPi !== R.pi && !R.crown && !R.crowned) {
      R.crownPi = R.pi;
      const [x, y] = randFloor(R, 4);
      let held = 0;
      R.crown = zone(R, { x, y, r: 1, dur: 14, color: '#ffd060', good: true });
      R.crown.tick = (dt2) => {
        if (R.crown.inside(p)) { held += dt2; if (held > 1.4) { R.crown.dead = true; R.crown = null; R.crowned = { who: 'hero', t: 15 }; UI.centerMsg('YOU WEAR THE CROWN', 'It cannot bear it', 2); sfx('holy'); } }
        else held = 0;
        if (R.crown && R.crown.t > 13.5) { R.crown.dead = true; R.crown = null; R.crowned = { who: 'boss', t: 15 }; m.dmg *= 1.2; R.bossCrown = true; say(R, 'IT CROWNS ITSELF', '#ff6040'); sfx('roar'); }
      };
      floatText(x, y, 40, 'THE LOST CROWN', '#ffd060', 13);
    }
    if (R.crowned) {
      R.crowned.t -= dt;
      if (R.crowned.who === 'hero') { p.raidDmgMul = 1.45; if (chance(dt * 6)) spawn({ type: 'glow', x: p.x, y: p.y, z: 70, vz: 10, life: 0.5, size: 3, size1: 0, color: '#ffd060', add: true }); if ((R.crownBurn = (R.crownBurn || 0) - dt) <= 0) { R.crownBurn = 1; hit(m, p, p.maxHp * 0.015, 'phys', { force: true, crit: false, dot: true }); } }
      if (R.crowned.t <= 0) { if (R.crowned.who === 'hero') p.raidDmgMul = 1; else if (R.bossCrown) { m.dmg /= 1.2; R.bossCrown = false; } R.crowned = null; floatText(m.x, m.y, 120, 'THE CROWN SHATTERS', '#ffd060', 14); }
    }
  },
};
Object.assign(PASSIVES, CASTLE_PASSIVES);

// ======================================================================================== the templates
const art = (id) => ['ck_' + id];
export const CASTLE_RAIDS = [
  { id: 'castellan', name: 'The Drowned Castellan', title: 'Keeper of the Flooded Gate', art: art('the_drowned_castellan'), el: 'cold', fx: 'shard', sigs: true, passive: 'castellan',
    adds: ['worm', 'zombie', 'knight'], hp: 1.1, spd: 0.8,
    phases: [
      { name: 'High Water', pool: { anchor_throw: 3, sluice_gates: 2, cleave: 2 } },
      { name: 'The Gate Floods', pool: { sluice_gates: 3, anchor_throw: 2, adds: 1 } },
      { name: 'Undertow', pool: { anchor_throw: 3, sluice_gates: 3, slam: 1 } },
      { name: 'Drowned Keep', pool: { sluice_gates: 3, anchor_throw: 3, adds: 1, cleave: 1 } },
    ] },
  { id: 'matron', name: 'The Matron of Keys', title: 'Warden of Every Door', art: art('matron_of_keys'), el: 'arcane', fx: 'orb', sigs: true, passive: 'matron',
    adds: ['ghoul', 'skeleton', 'cultist'], hp: 1, spd: 0.9,
    phases: [
      { name: 'The Turnkey', pool: { key_volley: 3, chain_gaol: 2, orbs: 1 } },
      { name: 'Lockdown', pool: { chain_gaol: 3, key_volley: 2, adds: 1 } },
      { name: 'No Way Out', pool: { key_volley: 3, chain_gaol: 3, orbs: 1 } },
      { name: 'Every Door Shut', pool: { chain_gaol: 3, key_volley: 3, adds: 1 } },
    ] },
  { id: 'lastbell', name: 'The Last Bell', title: 'Who Tolls the Hour', art: art('the_last_bell'), el: 'light', fx: 'spark', sigs: true, passive: 'lastbell',
    adds: ['cultist', 'imp', 'bat'], hp: 1.05, spd: 0.85,
    phases: [
      { name: 'Vespers', pool: { resonance: 3, bell_drop: 2, cleave: 1 } },
      { name: 'Compline', pool: { bell_drop: 3, resonance: 2, adds: 1 } },
      { name: 'The Long Toll', pool: { resonance: 3, bell_drop: 3 } },
      { name: 'The Last Hour', pool: { resonance: 3, bell_drop: 3, adds: 1 } },
    ] },
  { id: 'seraph', name: 'The Reliquary Seraph', title: 'Bones of the Saints', art: art('reliquary_seraph'), el: 'holy', fx: 'holy', sigs: true, passive: 'seraph',
    adds: ['wraith', 'cultist'], hp: 0.95, spd: 0.9,
    phases: [
      { name: 'Relic Chorus', pool: { saints_lance: 3, ascension: 1, nova: 1 } },
      { name: 'Sainted Choir', pool: { saints_lance: 3, ascension: 2, adds: 1 } },
      { name: 'Ascendant', pool: { ascension: 2, saints_lance: 3, nova: 1 } },
      { name: 'The Last Relic', pool: { saints_lance: 3, ascension: 2, adds: 1 } },
    ] },
  { id: 'regent', name: 'The Furnace Regent', title: 'Lord of the Armory', art: art('furnace_regent'), el: 'fire', fx: 'fireball', sigs: true, passive: 'regent',
    adds: ['imp', 'golem', 'beetle'], hp: 1.2, spd: 0.75,
    phases: [
      { name: 'Banked Coals', pool: { molten_pour: 3, bellows_blast: 2, slam: 1 } },
      { name: 'White Heat', pool: { bellows_blast: 2, molten_pour: 3, adds: 1 } },
      { name: 'The Quench', pool: { molten_pour: 3, bellows_blast: 3 } },
      { name: 'Meltdown', pool: { molten_pour: 3, bellows_blast: 3, adds: 1 } },
    ] },
  { id: 'racksaint', name: 'The Rack Saint', title: 'Martyr of the Breaking Wheel', art: art('the_rack_saint'), el: 'blood', fx: 'blob', sigs: true, passive: 'racksaint',
    adds: ['zombie', 'skeleton'], hp: 1, spd: 0.85,
    phases: [
      { name: 'The Wheel Turns', pool: { stretch: 2, martyrs_nails: 3, cleave: 1 } },
      { name: 'Penitence', pool: { martyrs_nails: 3, stretch: 2, adds: 1 } },
      { name: 'Broken on the Wheel', pool: { stretch: 3, martyrs_nails: 3 } },
      { name: 'Martyrdom', pool: { martyrs_nails: 3, stretch: 3, adds: 1 } },
    ] },
  { id: 'banquet', name: 'Banquet Below', title: 'the Endless Table', art: art('banquet_below'), el: 'poison', fx: 'blob', sigs: true, passive: 'banquet',
    adds: ['ghoul', 'zombie', 'worm'], hp: 1.25, spd: 0.7,
    phases: [
      { name: 'First Course', pool: { devour: 2, spoiled_courses: 3, slam: 1 } },
      { name: 'Second Helpings', pool: { spoiled_courses: 3, devour: 2, adds: 1 } },
      { name: 'Gorging', pool: { devour: 3, spoiled_courses: 3 } },
      { name: 'The Last Supper', pool: { devour: 3, spoiled_courses: 3, adds: 1 } },
    ] },
  { id: 'seneschal', name: 'The Veiled Seneschal', title: 'Steward of the Empty Throne', art: art('the_veiled_seneschal'), el: 'shadow', fx: 'skull', sigs: true, passive: 'seneschal',
    adds: ['wraith', 'ghoul'], hp: 0.95, spd: 1.05,
    phases: [
      { name: 'The Receiving Line', pool: { veil_daggers: 3, veil_step: 2 } },
      { name: 'Masquerade', pool: { veil_step: 3, veil_daggers: 2, adds: 1 } },
      { name: 'Behind the Veil', pool: { veil_daggers: 3, veil_step: 3 } },
      { name: 'Unveiled', pool: { veil_step: 3, veil_daggers: 3, adds: 1 } },
    ] },
  { id: 'sable_briar', name: 'Sable Briar', title: 'the Garden Gone Wild', art: art('sable_briar'), el: 'poison', fx: 'blob', sigs: true, passive: 'briar',
    adds: ['spider', 'hound', 'shroom'], hp: 1.1, spd: 1,
    phases: [
      { name: 'Creeping Thorns', pool: { thorn_lash: 3, bramble_wall: 2, charge3: 1 } },
      { name: 'Overgrowth', pool: { bramble_wall: 3, thorn_lash: 2, adds: 1 } },
      { name: 'The Thicket', pool: { thorn_lash: 3, bramble_wall: 3 } },
      { name: 'Choked Garden', pool: { thorn_lash: 3, bramble_wall: 3, adds: 1 } },
    ] },
  { id: 'colossus_crown', name: 'The Crownless Colossus', title: 'Who Lost the Kingdom', art: art('crownless_colossus'), el: 'phys', fx: 'rock', sigs: true, passive: 'colossus',
    adds: ['golem', 'knight', 'gargoyle'], hp: 1.3, spd: 0.7,
    phases: [
      { name: 'The Fallen King', pool: { usurper_stomp: 3, crumbling_throne: 1, cleave: 2 } },
      { name: 'Usurpers', pool: { usurper_stomp: 3, crumbling_throne: 2, adds: 1 } },
      { name: 'The Throne Falls', pool: { crumbling_throne: 2, usurper_stomp: 3, shockwave: 1 } },
      { name: 'Dust and Crowns', pool: { usurper_stomp: 3, crumbling_throne: 2, adds: 1 } },
    ] },
];
