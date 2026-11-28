// Summoned birds, live in 3D (gfx/beasts3d.js; both models built by tools/blender/phoenix.py on one rig):
// the Phoenix (the Ranger's firebird, phoenix.glb: reborn in a burst of flame, it hovers on its own wing beat, banks
// into turns, flies flat out when it moves, rears and rakes with its talons when it attacks, and sheds fire from its
// plumes) and the Carrion Witch's Ravens (raven.glb: ragged black carrion birds with red eyes; up to eleven at once,
// each on its own beat). Creature.draw asks here first (gfx/beastlooks.js); while a model loads its sprite is drawn.
import { G } from '../state.js';
import { isoX, isoY, HW } from '../core/view.js';
import { beast, drawBeast, beastPoint, preloadBeasts } from './beasts3d.js';
import { registerBeastLook } from './beastlooks.js';
import { drawFirebird, firebirdSway } from './phoenix3d.js';
import { spawn, glowSprite } from './vfx.js';

const TAU = Math.PI * 2, wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a)), clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = (u) => u * u * (3 - 2 * u);
/** Per summon: model, px per model unit, hover height, wing beats a second, the cell it needs, where its head tops out. */
export const BIRDS = {
  phoenix: { id: 'phoenix', k: 17, hover: 30, beat: 1.3, rad: 3.05, top: 1.1, born: 0.9, fire: true, pts: ['tailtip0', 'tailtip2', 'tailtip4', 'tailtip6', 'tip_L', 'tip_R'] },
  raven: { id: 'raven', k: 16, hover: 22, beat: 2.1, rad: 2, top: 0.9, born: 0.3 },
};
const ATK = 0.5, DUR = { fly: 1, hover: 2 / 3, strike: 2 / 3, flare: 7 / 6 };
export function preloadBirds(...keys) { for (const k of keys) if (BIRDS[k]) preloadBeasts(BIRDS[k].id); }

function drawBird(ctx, m) {
  const D = BIRDS[m.summonKey];
  if (!D) return false;
  const now = G.time || 0;
  let S = m.b3;
  if (!S) S = m.b3 = { yaw: m.facing || 0, roll: 0, t: Math.random() * 5, ph: Math.random(), mv: 0, atk: 0, pa: 0, pl: 0, emit: 0, last: now, key: 'bd' + m.id, sway: {} };
  const dt = clamp(now - S.last, 0, 0.1); S.last = now;
  const dy = wrap((m.facing || 0) - S.yaw);
  S.yaw += dy * Math.min(1, dt * 8);
  S.roll += (clamp(dy * 1.5, -0.7, 0.7) * (m.moving ? 1 : 0.3) - S.roll) * Math.min(1, dt * 5);
  S.mv += ((m.moving ? 1 : 0) - S.mv) * Math.min(1, dt * 5);
  S.t += dt; S.ph += dt * D.beat * (1 + 0.2 * S.mv);
  if (m.attackAnimT > S.pa + 0.01 || (m.lunge || 0) > S.pl + 0.3) { S.atk = ATK; S.strikes = (S.strikes || 0) + 1; }   // a spell, or a melee lunge
  S.pa = m.attackAnimT; S.pl = m.lunge || 0; S.atk = Math.max(0, S.atk - dt);
  const born = Math.min(1, m.spawnT / D.born), grow = D.fire ? ease(Math.min(1, born * 2.5)) : ease(born);
  const k = D.k * (m.scale || 1) * (G.touch ? 0.9 : 1) * (0.3 + 0.7 * grow);
  const px = isoX(m.x, m.y), py = isoY(m.x, m.y), z = (m.z || 0) + (D.hover + Math.sin(S.t * 2.2) * 3) * (0.4 + 0.6 * grow);
  const beat = S.ph % 1;
  let clip = 'hover', t = beat * DUR.hover, clip2 = 'fly', t2 = beat * DUR.fly, mix = ease(S.mv), pitch = -0.14 * S.mv, heat = 0.3;
  if (D.fire && born < 1) { // reborn: it uncurls out of the fire and throws its wings wide
    clip2 = 'flare'; t2 = 0.3 + born * 0.84; mix = 1 - ease(clamp((born - 0.82) / 0.18, 0, 1)); pitch = 0; heat = 1 - 0.6 * born;
  } else if (S.atk > 0) { // it rears, wings flared, and rakes with its talons
    const u = ATK - S.atk;
    if (S.mv > 0.5) { clip = 'fly'; t = t2; }
    clip2 = 'strike'; t2 = 0.1 + u / ATK * (DUR.strike - 0.12); mix = Math.min(1, u / 0.07, S.atk / 0.16); pitch *= 1 - mix; heat = 0.3 + 0.5 * mix;
  }
  const lx = m.lunge > 0 ? (Math.cos(m.facing) - Math.sin(m.facing)) * m.lunge * 6 : 0, ly = m.lunge > 0 ? (Math.cos(m.facing) + Math.sin(m.facing)) * m.lunge * 3 : 0;
  const a = (m.alpha ?? 1) * Math.min(1, born * (D.fire ? 4 : 2)), x = px + lx, y = py + ly - z;
  const o = { key: S.key, k, yaw: S.yaw, roll: S.roll, pitch, clip, t, clip2, t2, mix, loop: false, rad: D.rad, alpha: a, flash: m.flash > 0 ? Math.min(1, m.flash * 8) * 0.4 : 0 };
  ctx.fillStyle = 'rgba(0,0,0,' + 0.28 * a + ')'; ctx.beginPath(); ctx.ellipse(px, py, k * 0.75, k * 0.3, 0, 0, TAU); ctx.fill();
  if (D.fire) {
    o.points = D.pts; o.bones = firebirdSway(S.t, 0, S.sway);
    const g = glowSprite('#ff7a1c'), r = k * (2.1 + 1.6 * heat);
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = (0.22 + 0.3 * heat) * a; ctx.drawImage(g, x - r, y - r, r * 2, r * 2);
    ctx.globalAlpha = 0.12 * a; ctx.drawImage(g, px - r, py - r * 0.5, r * 2, r); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    if (!drawFirebird(ctx, x, y, o, heat)) return (S.ok = false);
    // fire off the plumes and the wing tips, left where it flew
    S.emit = Math.min(S.emit + dt * (G.touch ? 14 : 30) * (0.6 + heat), 6);
    for (; S.emit >= 1; S.emit--) {
      const p = beastPoint(S.key, D.pts[Math.floor(Math.random() * D.pts.length)]);
      if (!p) break;
      const wx = m.x + (lx + p[0]) / (2 * HW), wy = m.y - (lx + p[0]) / (2 * HW), wz = z - ly - p[1];
      if (Math.random() < 0.4) spawn({ type: 'flame', x: wx, y: wy, z: wz, vz: 4 + Math.random() * 12, g: -12, drag: 1.5, life: 0.3 + Math.random() * 0.3, size: 1.4 + Math.random(), size1: 0.4, add: true });
      else spawn({ type: 'glow', x: wx, y: wy, z: wz, vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4, vz: Math.random() * 12 - 3, g: -12, drag: 1.5, life: 0.4 + Math.random() * 0.5, size: 1 + Math.random(), size1: 0.2,
        color: ['#fff0a0', '#ffd050', '#ffa028', '#ff6414'][Math.floor(Math.random() * 4)], add: true });
    }
  } else {
    const md = beast(D.id);
    if (md.ready && !md.soft) { md.soft = true; for (const mt of md.mats) mt.alphaToCoverage = true; }   // ragged feather edges, softened
    o.ember = 2 + (S.atk > 0 ? 2 : 0); o.light = 1.5;   // black birds over dark floors: lit hard, their sheen and red eyes kept bright
    if (!drawBeast(ctx, D.id, x, y, o)) return (S.ok = false);
  }
  S.ok = true; m.screenTop = y - k * D.top;
  if (m.drawOverhead) m.drawOverhead(ctx, px, m.screenTop - 4, k * 1.2);
  return true;
}
registerBeastLook(['phoenix', 'raven'], drawBird);
