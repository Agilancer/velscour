// The Rogue: Combo Points, Stealth and her own moves.
//
// Builders (`cp=N` in data/skilldata.js) add N Combo Points when the cast first lands; she holds up to five (more with
// talents). Finishers (`fin`) spend them all: a finisher's damage is FIN_BASE + FIN_PER for each point, so five points
// hit four times as hard as none. Stealth (`rog=stealth`, Smoke Bomb) makes her untargetable until she strikes; a
// strike out of the shadows is an Ambush: a sure critical for half again the damage, and a builder gains one more
// point. Shadow Dance makes every strike an Ambush while it lasts. The points drain a while after her last blow.
// rogueCast is castSkill's hook: true = the move replaced the kind's cast, false = it failed, undefined = it adds to it.
import { G } from '../state.js';
import { rand, chance, TAU, clamp, angleTo, dist } from '../core/util.js';
import { sfx } from '../core/audio.js';
import { camera, isoX, isoY } from '../core/view.js';
import { addEffect, Ring, Slash, burst, smoke, sparkle, floatText, addDecal, glowSprite, effects } from '../gfx/vfx.js';
import { hit, aoe } from './combat.js';
import { explode } from './hazards.js';
import { later, headAt } from './sigs/common.js';
import { GiantBlade, GroundBlades, preloadBlades3D } from '../gfx/blades3d.js';
import { shownEquip } from '../data/items.js';
import { drawHeldModel3D } from '../gfx/heldmodel3d.js';
import { AfterImage, shadowTrail, CutLine, bloodCut, bloodBurst, dirtPop, drawGhost, SHADE, BLOOD } from '../gfx/shadowfx.js';

export const CP_MAX = 5, FIN_BASE = 0.55, FIN_PER = 0.33, AMBUSH = 1.5;
const CRIMSON = '#ff2a3c', DRAIN_AFTER = 10, roll = (d) => rand(d[0], d[1]);
/** A finisher's damage multiplier with `cp` Combo Points. */
export const finisherMul = (cp) => FIN_BASE + FIN_PER * cp;

/** Her state: points, the shadows she stands in, the buffs of her own. */
export function rogueOf(p) {
  return p.rogue || (p.rogue = { cp: 0, idle: 0, stealth: 0, dance: 0, rush: 0, flurry: 0, cast: 0, paid: 0, spent: 0, pop: 0, world: null });
}
export const cpMax = (p) => CP_MAX + ((p.st && p.st.talents && p.st.talents.deeper_stratagem) ? 1 : 0);
const blood = (w) => (w && w.biome && w.biome.blood) || '#8a0b08';
/** Her own dagger, as worn, for the blades that fall from the sky (GiantBlade's o.model): its three.js model, point down. */
export function ownBlade(p) {
  const it = p.char && shownEquip(p.char).weapon;
  if (!it || it.base !== 'dagger') return null;
  return (ctx, px, tip, L, spin) => !!drawHeldModel3D(ctx, it, 'rogue', px, tip - L * 0.66, Math.PI / 2, L * 0.66, { spin, tilt: 0.2 });
}

export function gainCp(p, n) {
  const S = rogueOf(p), max = cpMax(p), was = S.cp;
  S.cp = Math.min(max, S.cp + n); S.idle = 0;
  if (S.cp > was) { S.pop = 1; if (S.cp === max && was < max) sfx('ui', 0.5); }
}
function unstealth(p) {
  const S = rogueOf(p);
  if (S.hidden) { S.hidden = false; S.stealth = 0; p.targetable = true; p.alpha = undefined; }
}
function stealth(p, dur) {
  const S = rogueOf(p), w = p.world;
  S.stealth = Math.max(S.stealth, dur); S.hidden = true; p.targetable = false;
  smoke(p.x, p.y, 8, '#16101a', 10, 14);
  for (const c of w.creatures) if (c.team === 'enemy' && (c.foe === p || c.aggro === p || c.target === p)) { c.foe = null; c.aggro = null; c.target = null; }
}

// ------------------------------------------------------------------ the cast hook
export function rogueCast(p, sk, L, tx, ty, C) {
  const S = rogueOf(p), m = sk.m, w = p.world, { dmg, o, area } = C;
  const support = ['buff', 'heal', 'summon'].includes(sk.kind) || (sk.kind === 'curse' && m.at === 'self');
  preloadBlades3D();
  o.cast = ++S.cast;
  const ambush = !support && (S.stealth > 0 || S.dance > 0);
  if (ambush) { o.ambush = true; o.sureCrit = true; for (let i = 0; i < 2; i++) dmg[i] *= AMBUSH; }
  if (!support) unstealth(p);
  if (m.cp) o.cp = m.cp + (ambush ? 1 : 0) + (S.rush > 0 ? 1 : 0);
  let cp = 0;
  if (m.fin) { // spend them all
    cp = S.cp; S.cp = 0; S.spent += cp; S.idle = 0; o.fin = cp;
    const k = finisherMul(cp);
    for (let i = 0; i < 2; i++) dmg[i] *= k;
    if (cp) {
      floatText(p.x, p.y, 78, '◆'.repeat(cp), CRIMSON, 13, { life: 0.7 });
      addEffect(new Ring(p.x, p.y, 0.2, 0.8 + cp * 0.22, 0.3, CRIMSON, 3));
    }
  }
  switch (m.rog) {
    case 'twin': // both daggers: a second, crossing slash
      addEffect(new Slash(p.x, p.y, C.ang, 1.9, 1.25, 0.16, CRIMSON, { width: 6, flip: true }));
      return undefined;
    case 'eviscerate': case 'rupture': { // the X of a finisher, wider for every point
      const r = 1.2 + cp * 0.12;
      for (const f of [0, 1]) addEffect(new Slash(p.x, p.y, C.ang + (f ? 0.5 : -0.5), 2.4, r, 0.22, f ? '#ffffff' : CRIMSON, { width: 9 + cp, flip: !!f }));
      bloodBurst(p.x + Math.cos(C.ang) * 0.9, p.y + Math.sin(C.ang) * 0.9, 3 + cp, blood(w), 1.2 + cp * 0.15);
      if (m.rog === 'rupture') o.rupture = 1 + cp * 0.5;
      return undefined;
    }
    case 'kidney': o.kidney = 1.1 + 0.45 * cp; return undefined;
    case 'envenom': bloodBurst(p.x, p.y, 4 + cp, '#3f8a1c', 1.6); return undefined;
    case 'backstab': return backstab(p, sk, tx, ty, C, ambush);
    case 'dfa': { // a somersault over them, both points down; daggers stand in the ground where she lands
      p.acro = { t: 0, dur: 0.48, spins: 1, h: 0, dir: 1 };
      shadowTrail(p, 0.48, { tint: SHADE, a: 0.4 });
      later(w, 0.5, () => { if (p.dead) return; w.addHazard(new GroundBlades(p.x, p.y, { r: 1.2 + cp * 0.14, n: 4 + cp * 2, len: 40, hold: 0.5, onPop: (x, y) => dirtPop(x, y) })); bloodBurst(p.x, p.y, 5 + cp, blood(w), 2); camera.shake(4 + cp); });
      return undefined;
    }
    case 'shadowstrike': shadowTrail(p, 0.3, { a: 0.5 }); return undefined;
    case 'stealth': stealth(p, m.dur || 8); sfx('shadow', 0.6); return undefined;
    case 'smoke': stealth(p, 2.5); return undefined;
    case 'dance': S.dance = (m.dur || 10) + (L - 1) * 0.3; shadowTrail(p, 0.5, { a: 0.5 }); return undefined;
    case 'rush': S.rush = (m.dur || 14) + (L - 1) * 0.3; return undefined;
    case 'flurry': S.flurry = (m.dur || 12) + (L - 1) * 0.3; return undefined;
    case 'mark': gainCp(p, cpMax(p)); floatText(p.x, p.y, 70, 'Marked for Death', CRIMSON, 12); return undefined;
    case 'secret': return secret(p, sk, tx, ty, C, cp);
    case 'fangs': return fangs(p, sk, tx, ty, C);
    case 'giant': return giant(p, sk, tx, ty, C, cp);
    case 'tempest': // a wheel of blood
      for (let i = 0; i < 6; i++) addEffect(new CutLine(p.x, p.y, (i / 6) * Math.PI + rand(-0.1, 0.1), { len: 90 + cp * 14, color: BLOOD, width: 5, delay: i * 0.03, z: 22 }));
      bloodBurst(p.x, p.y, 6 + cp * 2, blood(w), 2.2);
      return undefined;
    case 'exsang': return exsanguinate(p, sk, tx, ty, C);
    case 'cuts': return thousandCuts(p, sk, tx, ty, C);
    case 'night': { // the daggers come up out of the ground first, then the sky answers
      const [x, y] = clampAt(w, p, tx, ty, 10), r = 2 * (m.r ?? 1) * area;
      w.addHazard(new GroundBlades(x, y, { r, n: 12 + cp * 2, len: 44, hold: 0.35, spread: 0.35, onPop: (bx, by) => { dirtPop(bx, by); } }));
      later(w, 0.25, () => aoe(w, p, x, y, r, roll(dmg) * 0.6, C.el, { ...o, aoe: true }));
      return undefined;
    }
    default: return undefined;
  }
}
function clampAt(w, p, tx, ty, range) {
  const a = angleTo(p.x, p.y, tx, ty);
  let d = Math.min(range, dist(p.x, p.y, tx, ty)), x = p.x + Math.cos(a) * d, y = p.y + Math.sin(a) * d;
  while (d > 0 && !w.map.isFloor(x, y)) { d -= 0.25; x = p.x + Math.cos(a) * d; y = p.y + Math.sin(a) * d; }
  return [x, y];
}

// ------------------------------------------------------------------ her own moves
/** Backstab: she is behind the nearest foe to the click before it turns, and the dagger goes in. */
function backstab(p, sk, tx, ty, C, ambush) {
  const w = p.world, { dmg, o, el } = C, reach = 6.5 * (sk.m.range ?? 1);
  const t = w.nearestHostile(p.team, tx, ty, 2.2, false) || w.nearestHostile(p.team, p.x, p.y, reach, true);
  if (!t || dist(p.x, p.y, t.x, t.y) > reach + 1) return undefined; // nobody there: a plain step through the shadows
  const a = angleTo(p.x, p.y, t.x, t.y);
  // behind it, else beside it, else in front: never a spot the foe cannot see (the far side of a wall)
  let bx = p.x, by = p.y;
  for (const da of [0, 0.9, -0.9, 1.8, -1.8, Math.PI]) {
    const x = t.x + Math.cos(a + da) * 0.85, y = t.y + Math.sin(a + da) * 0.85;
    if (w.map.walkable(x, y) && w.map.los(t.x, t.y, x, y)) { bx = x; by = y; break; }
  }
  w.addHazard(new AfterImage(p, { life: 0.4, a: 0.6 }));
  smoke(p.x, p.y, 10, '#16101a', 6, 10);
  p.x = bx; p.y = by; p.path = null; p.moveTarget = null;
  const back = angleTo(p.x, p.y, t.x, t.y);
  p.face(back); p.lunge = 1;
  smoke(p.x, p.y, 10, '#16101a', 4, 8);
  hit(p, t, roll(dmg) * (ambush ? 1 : 1), el === 'shadow' ? 'phys' : el, { ...o, ang: back, melee: true, sureCrit: true, bleed: true });
  addEffect(new CutLine(t.x, t.y, Math.atan2(isoY(t.x, t.y) - isoY(p.x, p.y), isoX(t.x, t.y) - isoX(p.x, p.y)), { len: 80, color: '#ffffff', width: 4 }));
  bloodBurst(t.x, t.y, 5, blood(w), 1.8);
  sfx('swing', 0.9); sfx('gore', 0.5);
  return true;
}
/** Secret Technique: her shadows step out behind the foes around the target and stab, one more for every point. */
function secret(p, sk, tx, ty, C, cp) {
  const w = p.world, { dmg, o, el } = C, n = (sk.m.n || 4) + cp;
  const [x, y] = clampAt(w, p, tx, ty, 10);
  const foes = w.hostiles(p.team, x, y, 5).filter((c) => !c.dead && !c.clutter).sort((a, b) => dist(x, y, a.x, a.y) - dist(x, y, b.x, b.y));
  if (!foes.length) { floatText(p.x, p.y, 60, 'No one to strike', '#c0b0c0', 12); return true; }
  for (let i = 0; i < n; i++) {
    const t = foes[i % foes.length], a = rand(TAU), gx = t.x + Math.cos(a) * 0.8, gy = t.y + Math.sin(a) * 0.8;
    later(w, i * 0.07, () => {
      if (p.dead) return;
      const back = angleTo(gx, gy, t.x, t.y);
      w.addHazard(new AfterImage(p, { x: gx, y: gy, z: 0, flip: isoX(t.x, t.y) < isoX(gx, gy), life: 0.45, a: 0.8, lunge: 1, glow: '#9030d0', acro: null }));
      smoke(gx, gy, 8, '#16101a', 2, 8);
      if (!t.dead) { hit(p, t, roll(dmg), el, { ...o, ang: back, melee: true }); bloodCut(t, back, 1.2); }
      if (i % 2 === 0) sfx('swing', 0.6);
    });
  }
  sfx('shadow', 0.7);
  return true;
}
/** Fangs of the Earth: daggers burst point-first out of the ground under the target. */
function fangs(p, sk, tx, ty, C) {
  const w = p.world, { dmg, o, el, area } = C, [x, y] = clampAt(w, p, tx, ty, 10), r = 1.6 * (sk.m.r ?? 1) * area;
  w.addHazard(new GroundBlades(x, y, { r, n: Math.round(9 + r * 3), len: 48, hold: 0.6, spread: 0.22, onPop: (bx, by) => dirtPop(bx, by) }));
  addEffect(new Ring(x, y, 0.2, r, 0.35, CRIMSON, 3));
  later(w, 0.14, () => {
    for (const t of w.hostiles(p.team, x, y, r)) { hit(p, t, roll(dmg), el, { ...o, aoe: true, knock: 0.3 }); bloodCut(t, -Math.PI / 2, 1.4); }
    camera.shake(4); sfx('gore', 0.7); sfx('thud', 0.5);
  });
  return true;
}
/** Executioner's Blade: one giant dagger falls out of the sky. */
function giant(p, sk, tx, ty, C, cp) {
  const w = p.world, { dmg, o, el, area } = C, [x, y] = clampAt(w, p, tx, ty, 10), r = 1.6 * (sk.m.r ?? 1) * area, fall = 0.75;
  addEffect(new Ring(x, y, r, 0.3, fall, CRIMSON, 3), 'ground');
  addEffect(new Ring(x, y, 0.2, r, 0.5, CRIMSON, 2, { fill: true }), 'ground');
  w.addHazard(new GiantBlade(x, y, { fall, len: (190 + cp * 16) * (G.touch ? 0.8 : 1), hold: 1.2, model: ownBlade(p) }));
  sfx('swing', 1);
  later(w, fall, () => {
    explode(w, p, x, y, r, dmg, el, { ...o, knock: 0.8 }, 'eruption');
    bloodBurst(x, y, 10 + cp * 2, blood(w), 2.6);
    for (let i = 0; i < 3; i++) addEffect(new Ring(x, y, 0.2, r * (0.7 + i * 0.35), 0.4 + i * 0.12, i % 2 ? '#ffffff' : CRIMSON, 5 - i));
    addDecal(x, y, 'rgba(10,6,4,0.7)', r * 0.5, 'scorch', 0.8);
    camera.shake(12 + cp); G.flash = Math.max(G.flash || 0, G.settings?.reduceFlashing ? 0 : 0.18);
    sfx('explode', 0.8); sfx('thud', 1); sfx('gore', 0.8);
  });
  return true;
}
/** Exsanguinate: the bleeding burst; the rest are opened. */
function exsanguinate(p, sk, tx, ty, C) {
  const w = p.world, { dmg, o, el } = C, [x, y] = clampAt(w, p, tx, ty, 10);
  const foes = w.hostiles(p.team, x, y, 5 * (sk.m.r ?? 1)).filter((c) => !c.dead && !c.clutter)
    .sort((a, b) => ((b.status.bleed && b.status.bleed.t > 0) ? 1 : 0) - ((a.status.bleed && a.status.bleed.t > 0) ? 1 : 0)).slice(0, sk.m.n || 5);
  if (!foes.length) return true;
  foes.forEach((t, i) => later(w, i * 0.08, () => {
    if (t.dead) return;
    const bleeding = t.status.bleed && t.status.bleed.t > 0;
    hit(p, t, roll(dmg) * (bleeding ? 1.7 : 0.8), el, { ...o, aoe: true });
    bloodBurst(t.x, t.y, bleeding ? 8 : 3, blood(w), bleeding ? 2.4 : 1.2);
    addEffect(new Ring(t.x, t.y, 0.1, bleeding ? 1.2 : 0.7, 0.3, CRIMSON, 3));
    if (i % 2 === 0) sfx('gore', 0.6);
  }));
  return true;
}
/** Thousand Cuts: cut after cut through everything in the circle. */
function thousandCuts(p, sk, tx, ty, C) {
  const w = p.world, { dmg, o, el, area } = C, m = sk.m, [x, y] = clampAt(w, p, tx, ty, 10), r = 1.6 * (m.r ?? 1) * area, n = m.n || 9;
  addEffect(new Ring(x, y, 0.2, r, 0.4, CRIMSON, 2));
  for (let i = 0; i < n; i++) later(w, (i / n) * (m.dur || 1.6), () => {
    const a = rand(Math.PI);
    addEffect(new CutLine(x + rand(-0.4, 0.4), y + rand(-0.4, 0.4), a, { len: r * 100, color: i % 3 ? BLOOD : '#ffffff', width: 5, dur: 0.26 }));
    for (const t of w.hostiles(p.team, x, y, r)) { hit(p, t, roll(dmg), el, { ...o, aoe: true, multiHit: true, hitIndex: i, hitCount: n }); if (chance(0.5)) bloodCut(t, a, 0.8); }
    if (i % 2 === 0) sfx('swing', 0.5);
  });
  return true;
}

// ------------------------------------------------------------------ hits
/** Every hit the Rogue herself lands (Player.onHit): points, blood, the moves' riders. */
export function rogueHit(p, tgt, dmg, el, o) {
  if (o.dot || !o.sk || !o.sk.startsWith('rogue.')) return;
  const S = rogueOf(p);
  if (o.cp && o.cast !== S.paid) { S.paid = o.cast; gainCp(p, o.cp); }
  S.idle = 0;
  if (tgt.dead) return;
  if (o.kidney && tgt.status.stun) tgt.status.stun.t = Math.max(tgt.status.stun.t, tgt.rank === 'boss' ? 0.8 : o.kidney);
  if (o.rupture && tgt.status.bleed) { tgt.status.bleed.t = 3 + o.rupture * 2; tgt.status.bleed.dps *= 1 + o.rupture * 0.4; }
  if ((o.melee || o.fin !== undefined) && !o.sig && (S.cutT || 0) <= 0) { // a bloody cut (a few a moment, not one a hit)
    S.cutT = G.touch ? 0.09 : 0.04;
    bloodCut(tgt, o.ang ?? angleTo(p.x, p.y, tgt.x, tgt.y), o.fin ? 1 + o.fin * 0.3 : o.ambush ? 1.6 : 0.8);
  }
  if (S.flurry > 0 && o.melee && !o.flurry) { // Blade Flurry: the blow carries to two more
    let n = 0;
    for (const c of p.world.hostiles(p.team, tgt.x, tgt.y, 2.6)) {
      if (c === tgt || c.dead || n >= 2) continue;
      n++;
      hit(p, c, dmg * 0.4, el, { sk: o.sk, flurry: true, melee: true, crit: false, ang: angleTo(tgt.x, tgt.y, c.x, c.y) });
      addEffect(new Slash(c.x, c.y, angleTo(tgt.x, tgt.y, c.x, c.y), 1.6, 0.7, 0.16, '#e8e0d8', { width: 5 }));
    }
  }
}

// ------------------------------------------------------------------ every frame
export function rogueUpdate(p, dt) {
  const S = rogueOf(p), w = p.world;
  if (S.world !== w) { S.world = w; S.cp = 0; unstealth(p); S.dance = S.rush = S.flurry = 0; }
  if (S.cutT > 0) S.cutT -= dt;
  if (S.pop > 0) S.pop = Math.max(0, S.pop - dt * 4);
  for (const k of ['dance', 'rush', 'flurry']) if (S[k] > 0) S[k] -= dt;
  if (S.stealth > 0) {
    S.stealth -= dt;
    p.alpha = 0.32 + 0.06 * Math.sin(p.animT * 5);
    if (S.stealth <= 0 || p.dead) unstealth(p);
  } else if (S.dance > 0 && chance(dt * 14)) w.addHazard(new AfterImage(p, { life: 0.3, a: 0.35 }));
  if (S.cp > 0 && (S.idle += dt) > DRAIN_AFTER) { S.idle -= 1.5; S.cp--; } // out of the fight they drain
  if (w.kind !== 'town' && (!p._cpLayer || !effects.includes(p._cpLayer))) addEffect(p._cpLayer = new ComboPips(p), 'top');
}

/** The Combo Points over her head: crimson diamonds, the last one bright when she is full. */
class ComboPips {
  constructor(p) { this.p = p; this.t = 0; }
  update(dt) { this.t += dt; return G.player === this.p && this.p.classId === 'rogue' && !!this.p.world; }
  draw(ctx) {
    const p = this.p, S = p.rogue;
    if (!S || p.dead || p.ghostDraw || !p.world || p.world.kind === 'town') return;
    const max = cpMax(p), [cx, cy0] = headAt(p, G.settings.signatures === false ? 10 : 30), gap = G.touch ? 8 : 9.5, full = S.cp >= max;
    const cy = cy0 + (full ? Math.sin(this.t * 9) * 1 : 0);
    ctx.save();
    for (let i = 0; i < max; i++) {
      const x = cx + (i - (max - 1) / 2) * gap, lit = i < S.cp, r = (lit ? 3.6 : 2.6) * (lit && i === S.cp - 1 ? 1 + S.pop * 0.9 : 1);
      if (lit) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = full ? 0.9 : 0.55; ctx.drawImage(glowSprite(CRIMSON), x - 9, cy - 9, 18, 18); ctx.globalCompositeOperation = 'source-over'; }
      ctx.globalAlpha = lit ? 1 : 0.55;
      ctx.fillStyle = lit ? (full ? '#fff0f0' : CRIMSON) : '#2a1216'; ctx.strokeStyle = '#000'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, cy - r); ctx.lineTo(x + r * 0.8, cy); ctx.lineTo(x, cy + r); ctx.lineTo(x - r * 0.8, cy); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    if (S.stealth > 0) { ctx.globalAlpha = 0.9; ctx.fillStyle = '#c0a0e0'; ctx.font = '700 9px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('STEALTH', cx, cy - 8); }
    ctx.restore();
  }
}
