// The Dragon Knight's dragons and wings, live in 3D (gfx/beasts3d.js; models from tools/blender/dragons.py and
// tools/blender/dkwings.py). Her summons (and the Dragoon's): the Elder Red Drake (dragon.glb), the Drake Whelp (the
// same model with a baby's proportions and an ember hide), the Wyvern (dragon_wyvern.glb, bronze) and the Frost Wyrm
// (dragon_frost.glb, a skeletal wyrm in ice). They hover on their own wing beat, bank into turns, stretch out and
// breathe when they attack (the fire leaves the 'mouth' bone: dragonMuzzle), flinch when hit and fall when they die.
// drawDkWings: the wings on her back (folded -> half open -> spread by `open`, lit by `ember`).
// drawSpectre: the red dragon as a thing of fire (additive), for the Dragonheart, her roar and her dragon forms.
import { G } from '../state.js';
import { isoX, isoY, HW } from '../core/view.js';
import { drawBeast, beastPoint, preloadBeasts } from './beasts3d.js';
import { registerBeastLook } from './beastlooks.js';
import { addEffect, spawn, glowSprite } from './vfx.js';

const TAU = Math.PI * 2, wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a)), clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = (u) => u * u * (3 - 2 * u);
// a hatchling's proportions on the grown dragon's rig: big head on a short neck, stubby tail, small wings, thick limbs
const WHELP = { neck1: { s: 0.8 }, head: { s: 1.85 }, tail1: { s: 0.62 }, wroot_L: { s: 0.84 }, wroot_R: { s: 0.84 }, chest: { s: 1.08 },
  thigh_L: { s: 1.15 }, thigh_R: { s: 1.15 }, upperarm_L: { s: 1.15 }, upperarm_R: { s: 1.15 } };
/** Per summon: model, hide, px per model unit, hover height, wing-beat speed, glow, breath colours. */
export const DRAGONS = {
  whelp: { id: 'dragon', skin: 'whelp', k: 52, hover: 24, speed: 1.7, ember: 1.5, bones: WHELP, glow: '#ff8a20', top: 0.62 },
  wyvern: { id: 'dragon_wyvern', k: 86, hover: 30, speed: 1.2, ember: 1.2, glow: '#ffa030', top: 0.5 },
  frostwyrm: { id: 'dragon_frost', k: 106, hover: 34, speed: 1, ember: 1.5, glow: '#60c8ff', top: 0.5 },
  elderwyrm: { id: 'dragon', k: 126, hover: 36, speed: 0.9, ember: 1.6, glow: '#ff5a10', top: 0.5 },
};
const ATK = 0.55, HIT = 0.4;
export function preloadDragons(...keys) { for (const k of keys) { const D = DRAGONS[k]; if (D) preloadBeasts(D.skin ? D.id + ':' + D.skin : D.id); } }

function shadow(ctx, px, py, r, a) {
  ctx.fillStyle = 'rgba(0,0,0,' + a + ')'; ctx.beginPath(); ctx.ellipse(px, py, r, r * 0.45, 0, 0, TAU); ctx.fill();
}
/** A screen offset from a ground point as a world place: [x, y, z]. */
const worldAt = (x, y, dx, up) => [x + dx / (2 * HW), y - dx / (2 * HW), up];

function drawDragon(ctx, m) {
  const D = DRAGONS[m.summonKey];
  if (!D) return false;
  const now = G.time || 0;
  let S = m.d3;
  if (!S) { S = m.d3 = { yaw: m.facing || 0, roll: 0, t: Math.random() * 3, mv: 0, atk: 0, hit: 0, hp: m.hp, pa: 0, last: now, key: 'dr' + m.id }; preloadDragons(m.summonKey); }
  const dt = clamp(now - S.last, 0, 0.1); S.last = now;
  const dy = wrap((m.facing || 0) - S.yaw);
  S.yaw += dy * Math.min(1, dt * 7);
  S.roll += (clamp(dy * 1.4, -0.65, 0.65) * (m.moving ? 1 : 0.35) - S.roll) * Math.min(1, dt * 5);
  S.mv += ((m.moving ? 1 : 0) - S.mv) * Math.min(1, dt * 5);
  S.t += dt * D.speed;
  if (m.attackAnimT > S.pa + 0.01) S.atk = ATK;
  S.pa = m.attackAnimT; S.atk = Math.max(0, S.atk - dt);
  if (m.hp < S.hp - m.maxHp * 0.01) S.hit = HIT;
  S.hp = m.hp; S.hit = Math.max(0, S.hit - dt);
  const k = D.k * (m.scale || 1) * (G.touch ? 0.9 : 1), born = Math.min(1, m.spawnT / 0.4);
  const px = isoX(m.x, m.y), py = isoY(m.x, m.y), z = (m.z || 0) + (D.hover + Math.sin(S.t * 2.4) * 3) * (0.3 + 0.7 * ease(born));
  let clip = 'fly_hover', t = S.t, clip2 = 'fly', t2 = S.t * 1.15, mix = S.mv, pitch = -0.1 * S.mv;
  if (S.hit > 0) { clip = S.mv > 0.5 ? 'fly' : 'fly_hover'; if (clip === 'fly') t = t2; clip2 = 'hit_air'; t2 = 0.1 + (HIT - S.hit) * 1.4; mix = Math.min(1, (HIT - S.hit) / 0.06, S.hit / 0.2) * 0.85; }
  else if (S.atk > 0) { // the neck goes out and the jaws open: the hold of the hovering breath, blended in and out
    const u = ATK - S.atk;
    clip = S.mv > 0.5 ? 'fly' : 'fly_hover'; if (clip === 'fly') t = t2; clip2 = 'hover_breath_hold'; t2 = 0.4 + u; mix = Math.min(1, u / 0.08, S.atk / 0.28);
    pitch = 0.1 * mix;
  }
  const lx = m.lunge > 0 ? (Math.cos(m.facing) - Math.sin(m.facing)) * m.lunge * 5 : 0, ly = m.lunge > 0 ? (Math.cos(m.facing) + Math.sin(m.facing)) * m.lunge * 2.5 : 0;
  const a = (m.alpha ?? 1) * Math.min(1, born * 1.6);
  const o = { key: S.key, k: k * (0.35 + 0.65 * ease(born)), yaw: S.yaw, roll: S.roll, pitch, clip, t, clip2, t2, mix, skin: D.skin, bones: D.bones,
    rad: 0.95, ember: D.ember * (1 + 0.25 * Math.sin(S.t * 3) + (S.atk > 0 ? 1.2 : 0)), flash: m.flash > 0 ? Math.min(1, m.flash * 8) * 0.4 : 0, alpha: a, points: ['mouth'] };
  S.o = o; S.px = px + lx; S.py = py + ly - z; S.gx = m.x; S.gy = m.y;
  if (!S.watch || now - S.watch.seen > 0.5) S.watch = addEffect(new Fall(m, D), 'top'); // (effects are dropped between levels)
  shadow(ctx, px, py, k * 0.26, 0.3 * a);
  if (!drawBeast(ctx, D.id, S.px, S.py, o)) { S.ok = false; return false; }
  S.ok = true;
  if (S.atk > 0) { // the maw lights up
    const p = beastPoint(S.key, 'mouth');
    if (p) { const g = glowSprite(D.glow), r = k * 0.16 * Math.min(1, S.atk / 0.2); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.8; ctx.drawImage(g, S.px + p[0] - r, S.py + p[1] - r, r * 2, r * 2); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
  }
  m.screenTop = S.py - k * D.top;
  if (m.drawOverhead) m.drawOverhead(ctx, px, m.screenTop - 4, k * 0.5);
  return true;
}
registerBeastLook(Object.keys(DRAGONS), drawDragon);

/** Where a 3D dragon's breath leaves it: { x, y, z } in the world, or null (not a dragon, or not drawn yet). */
export function dragonMuzzle(m) {
  const S = m && m.d3;
  if (!S || !S.ok) return null;
  const p = beastPoint(S.key, 'mouth');
  if (!p) return null;
  const py = isoY(m.x, m.y), [x, y, z] = worldAt(m.x, m.y, S.px + p[0] - isoX(m.x, m.y), py - (S.py + p[1]));
  return { x, y, z };
}

/** A slain (or dismissed) dragon folds up and drops out of the air, burning away as it falls. */
class Fall {
  constructor(m, D) { Object.assign(this, { m, D, t: -1, seen: G.time || 0 }); }
  update(dt) {
    const m = this.m;
    this.seen = G.time || 0;
    if (this.t < 0) { if (!m.dead) return true; this.t = 0; if (!m.d3.ok) return false; }
    this.t += dt;
    return this.t < 1.1;
  }
  draw(ctx) {
    if (this.t < 0) return;
    const S = this.m.d3, u = this.t / 1.1, D = this.D;
    drawBeast(ctx, D.id, S.px, S.py + u * u * D.hover * 0.9, { ...S.o, key: S.key, clip: 'fly_hover', clip2: 'death_air', t2: 0.9 + this.t * 1.5, mix: Math.min(1, this.t / 0.12), loop: false,
      roll: S.roll + u * 0.5, alpha: 1 - u * u, ember: D.ember * (1 + 3 * u), flash: 0, tint: [1 - 0.5 * u, 1 - 0.6 * u, 1 - 0.6 * u] });
    if (Math.random() < 0.5) spawn({ type: 'glow', x: S.gx + (Math.random() - 0.5) * 0.8, y: S.gy + (Math.random() - 0.5) * 0.8, z: D.hover * (1 - u) + 10, vz: 30, life: 0.5, size: 3, size1: 0, color: D.glow, add: true });
  }
}

// ------------------------------------------------------------------ her wings
const WING_YAW = 0.36;
/** The wings on her back at (x, y): o { key, flip, open 0..1 (folded -> spread), ember, flap 0..1 with flapClip ('flap' | 'dash'), t, k, tint, alpha }. */
export function drawDkWings(ctx, x, y, o) {
  const open = clamp(o.open, 0, 1), t = o.t || 0;
  let clip, clip2, mix, t2 = t;
  if (o.flap > 0.02) { clip = open < 0.3 ? 'rest' : open < 0.75 ? 'idle' : 'spread'; clip2 = o.flapClip || 'flap'; mix = o.flap; t2 = o.flapT ?? t; }
  else if (open < 0.5) { clip = 'rest'; clip2 = 'idle'; mix = ease(open * 2); }
  else { clip = 'idle'; clip2 = 'spread'; mix = ease(open * 2 - 1); }
  return drawBeast(ctx, 'dkwings', x, y, { key: o.key || 'dkwings', k: o.k, yaw: Math.PI / 4 + (o.flip ? WING_YAW : -WING_YAW), clip, t, clip2, t2, mix,
    ember: o.ember, tint: o.tint, alpha: o.alpha, add: o.add, light: o.light, rad: 1.95 });
}

// ------------------------------------------------------------------ the dragon of fire
/** The red dragon drawn as light at (x, y): o { key, k, yaw, clip, t, clip2, t2, mix, alpha, heat 0..1, tint, points, loop, pitch, roll }. */
export function drawSpectre(ctx, x, y, o) {
  const h = o.heat ?? 1, a = o.alpha ?? 1;
  const b = { loop: true, ...o, tint: o.tint || [1.15, 0.5 + 0.2 * h, 0.22 + 0.1 * h], ember: 1.6 + 2.4 * h, light: 0.95 + 0.35 * h };
  // a body first (so it reads on bright ground too), then itself again as light
  return drawBeast(ctx, 'dragon', x, y, { ...b, alpha: a * (o.body ?? 0.5) }) && drawBeast(ctx, 'dragon', x, y, { ...b, add: true, alpha: a });
}
export const spectrePoint = (key, node = 'mouth') => beastPoint(key, node);
export { worldAt };

/** Wyrm Coil (an Orbit hazard with fx 'dragon'): each orbiter is a small ember wyrm banking round her. */
export function drawCoilWyrms(ctx, orb) {
  let ok = true;
  const k = 34 * (orb.size || 1) * (G.touch ? 0.9 : 1), id = orb.cid || (orb.cid = 'coil' + Math.random().toString(36).slice(2, 7));
  orb.pos.forEach(([x, y, a], i) => {
    const px = isoX(x, y), py = isoY(x, y), fade = Math.min(1, orb.t * 4, (orb.dur - orb.t) * 3);
    shadow(ctx, px, py, k * 0.22, 0.25 * fade);
    const g = glowSprite('#ff7a10'), r = k * 0.55; ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.4 * fade; ctx.drawImage(g, px - r, py - 26 - r, r * 2, r * 2); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    if (!drawBeast(ctx, 'dragon', px, py - 24 - Math.sin(orb.t * 5 + i * 2) * 3, { key: id + i, k, yaw: a + Math.PI / 2, roll: 0.55, pitch: 0.05, clip: 'fly', t: orb.t * 2 + i * 0.4,
      skin: 'whelp', bones: WHELP, ember: 2.4, alpha: fade })) ok = false;
  });
  return ok;
}
