// The Carrion Witch's Carrion Grubs drawn live in 3D (assets/models/beasts/grub.glb from tools/blender/grub.py, through
// gfx/beasts3d.js): one model, six hides (white is the model's own; grub_<kind>.webp and grub_<kind>_glow.webp the rest).
// The brain (game/carriongrubs.js) names the clip and its time; here the body turns toward where it faces, swells out
// of the ground when summoned, its flank sacs light up when it works magic, and a dead grub writhes and deflates.
import { G } from '../state.js';
import { isoX, isoY } from '../core/view.js';
import { drawBeast, preloadBeasts } from './beasts3d.js';
import { registerBeastLook } from './beastlooks.js';
import { GRUB_CLIPS, GRUBS } from '../game/carriongrubs.js'; // (a cycle: used only inside the draw functions)
import { glowSprite } from './vfx.js';

const LOOPS = new Set(['idle', 'slither', 'slither_fast']);
export const grubK = () => (G.touch ? 34 : 41);       // px per model unit: a grub is ~2.4 units long
const ease = (u) => u * u * (3 - 2 * u), wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const hex = (h) => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];

function shadow(ctx, px, py, k, yaw, a = 0.3) {
  // the body's ground shadow, lying along the way it faces (tile angle -> screen)
  const sx = Math.cos(yaw) - Math.sin(yaw), sy = (Math.cos(yaw) + Math.sin(yaw)) * 0.5, ang = Math.atan2(sy, sx), len = Math.hypot(sx, sy) / Math.SQRT2;
  ctx.save(); ctx.translate(px, py); ctx.rotate(ang); ctx.globalAlpha = a; ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.ellipse(0, 0, k * (0.55 + 0.75 * len), k * 0.36, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
}
function skinOf(kind) { return kind === 'white' ? {} : { skin: kind, eskin: kind + '_glow' }; }

function drawGrub(ctx, m) {
  const S = m.grub;
  if (!S) return false;
  if (!S.pre) { S.pre = true; preloadBeasts('grub', ...(S.kind === 'white' ? [] : ['grub:' + S.kind, 'grub:' + S.kind + '_glow'])); }
  S.yaw += wrap(m.facing - S.yaw) * 0.22;
  const born = Math.min(1, S.bornT / 0.55), px = isoX(m.x, m.y), py = isoY(m.x, m.y);
  const k = grubK() * (m.scale || 1) * (1 + 0.035 * S.fed) * (0.25 + 0.75 * ease(born));
  const clip = S.anim, dur = GRUB_CLIPS[clip] ? GRUB_CLIPS[clip][0] : 1, magic = S.act && ['pulse', 'heal', 'ward'].includes(clip) ? Math.sin(Math.PI * Math.min(1, S.act.t / S.act.dur)) : 0;
  const lx = m.lunge > 0 ? (Math.cos(m.facing) - Math.sin(m.facing)) * m.lunge * 5 : 0, ly = m.lunge > 0 ? (Math.cos(m.facing) + Math.sin(m.facing)) * m.lunge * 2.5 : 0;
  shadow(ctx, px, py, k, S.yaw, 0.3 * born);
  const lit = Math.max(S.glow, magic);
  if (lit > 0.05 || S.wardT > 0) { const g = glowSprite(GRUBS[S.kind].glow), r = k * (1.3 + 0.5 * lit), a = Math.min(0.6, 0.45 * lit + (S.wardT > 0 ? 0.18 + 0.06 * Math.sin(G.time * 6) : 0)); ctx.globalAlpha = a; ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(g, px - r, py - r * 0.6 - k * 0.25, r * 2, r * 1.2); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; }
  const ok = drawBeast(ctx, 'grub', px + lx, py + ly, {
    key: 'grub' + m.id, k, outline: 0.55, yaw: S.yaw, clip, t: S.animT, loop: LOOPS.has(clip), ...skinOf(S.kind),
    ember: 0.35 + 2.2 * lit, flash: m.flash > 0 ? Math.min(1, m.flash * 8) * 0.45 : 0, alpha: (m.alpha ?? 1) * Math.min(1, born * 2),
    tint: S.wardT > 0 ? [0.82, 0.86, 0.8] : undefined,
  });
  m.screenTop = py - k * (clip === 'pulse' || clip === 'ward' || clip === 'slam' ? 2.0 : 1.05);
  return ok;
}
registerBeastLook(['white', 'yellow', 'green', 'orange', 'brown', 'pink'].map((k) => 'grub_' + k), drawGrub);

/** A dead grub (game/carriongrubs.js Husk): it writhes, rolls over and deflates. */
export function drawGrubHusk(ctx, h) {
  const m = h.m, S = m.grub, px = isoX(h.x, h.y), py = isoY(h.x, h.y), k = grubK() * (m.scale || 1) * (1 + 0.035 * S.fed);
  const a = Math.min(1, (h.dur - h.t) / 0.7);
  shadow(ctx, px, py, k, S.yaw, 0.25 * a);
  drawBeast(ctx, 'grub', px, py, { key: 'husk' + m.id, k, yaw: S.yaw, clip: 'death', t: h.t, loop: false, ...skinOf(S.kind), ember: 0.1, alpha: a, tint: [0.75, 0.72, 0.68] });
}
export { hex };
