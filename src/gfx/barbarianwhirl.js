// Isometric cyclone trails and captured battlefield debris for the Barbarian's Whirlwind.
import { G } from '../state.js';
import { isoX, isoY, HW, HH } from '../core/view.js';
import { rand, TAU } from '../core/util.js';
import { spawn, particles } from './vfx.js';

const COLORS = ['#e6f6ff', '#89d7ff', '#ffae5f', '#d3b7a5', '#922b25', '#ffffff'];

/** Low-cost particle helixes anchored to the moving hero; geometry stays isometric. */
export function emitWhirlCyclone(src, t, r) {
  const count = G.touch ? 5 : 9;
  for (let i = 0; i < count; i++) {
    const a = t * 16 + i * TAU / count + rand(-0.2, 0.2);
    const radius = rand(0.3, Math.max(0.36, r * 0.94));
    const kind = i % 7 === 0 ? 'smoke' : i % 3 === 0 ? 'shard' : i % 2 ? 'streak' : 'glow';
    const color = COLORS[(i + Math.floor(t * 11)) % COLORS.length];
    spawn({
      type: kind, x: src.x + Math.cos(a) * radius, y: src.y + Math.sin(a) * radius, z: rand(3, 55),
      size: kind === 'smoke' ? 4.5 : rand(1.3, 3.5), size1: kind === 'glow' ? 0.2 : 1,
      color: kind === 'smoke' ? '#766d6a' : color, alpha: 0.28, add: kind !== 'smoke',
      life: rand(0.42, 0.95), rot: a, vr: rand(-11, 11), drag: 0,
      vortex: { owner: src, angle: a, radius, omega: rand(11, 17),
        radial: rand(-0.4, 0.1), rise: rand(24, 53), gib: false },
    });
  }
}

/** Real gib sprites and flesh chunks are dragged into the eye instead of flying through the storm. */
export function captureWhirlGibs(src, r) {
  if (G.settings.gore === 0) return;
  const max = r * 1.75;
  for (const p of particles) {
    if (p.type !== 'gib' || p.vortex) continue;
    const dx = p.x - src.x, dy = p.y - src.y, d = Math.hypot(dx, dy);
    if (d > max || d < 0.08) continue;
    p.vortex = { owner: src, angle: Math.atan2(dy, dx), radius: d,
      omega: rand(9, 14), radial: -Math.max(0.55, d * 0.7), rise: 52, gib: true };
    p.life = Math.min(p.life, 2.1);
    p.vz = 0; p.g = 0;
    p.vr = rand(-13, 13);
  }
}

/** Multi-height 3D helices projected into the same isometric world as the player. */
export function drawWhirlCyclone(ctx, src, t, r) {
  const px = isoX(src.x, src.y), py = isoY(src.x, src.y);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const pulse = 0.88 + Math.sin(t * 18) * 0.08;
  // Ground-level pressure rings: visibly flattened in the game's 2:1 isometric view.
  for (let k = 0; k < 3; k++) {
    const rr = r * pulse * (0.72 + k * 0.15);
    ctx.globalAlpha = k === 0 ? 0.19 : 0.3;
    ctx.strokeStyle = k === 0 ? '#ad3225' : k === 1 ? '#f3c6a0' : '#8ccdf0';
    ctx.lineWidth = k === 0 ? 8 : 2.5;
    ctx.beginPath();
    ctx.ellipse(px, py - 2 - k * 4, rr * HW * 1.41, rr * HH * 1.41, 0,
      t * (10 + k * 2) + k, t * (10 + k * 2) + k + Math.PI * 1.55);
    ctx.stroke();
  }
  // Rising twisting wind columns: far and near segments both follow world projection.
  const number = G.touch ? 4 : 6;
  for (let i = 0; i < number; i++) {
    const base = t * 15 + i * TAU / number, color = COLORS[i % COLORS.length];
    for (let pass = 0; pass < 2; pass++) {
      ctx.globalAlpha = pass ? 0.68 : 0.2;
      ctx.lineWidth = pass ? (i % 2 ? 1.7 : 2.7) : 6;
      ctx.strokeStyle = pass ? color : '#a6d9ff';
      ctx.beginPath();
      for (let j = 0; j <= 18; j++) {
        const h = j / 18;
        const a = base + h * 5.7;
        const radius = r * (0.7 - h * 0.34) * (1 + 0.07 * Math.sin(t * 16 + i));
        const x = src.x + Math.cos(a) * radius;
        const y = src.y + Math.sin(a) * radius;
        const sx = isoX(x, y), sy = isoY(x, y) - 5 - h * 70;
        if (!j) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
      }
      ctx.stroke();
    }
  }
  ctx.restore();
}
