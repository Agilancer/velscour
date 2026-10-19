// The Death Knight's Rune Weapon summons (Dancing Rune Weapon, Dark Runeweapon: summon key 'runeweapon') drawn as his
// 3D Runeblade (gfx/runeblade3d.js), the same skin, palette and size as his familiar sword. It hovers point-down,
// turning, leans into the way it flies, and swings on each attack: a slash (alternating sides), a thrust or a chop.
// Creature.draw calls drawRuneWeapon first; until the model loads it returns false and the old sprite draws.
import { G } from '../state.js';
import { isoX, isoY, HW, HH } from '../core/view.js';
import { TAU, angleDiff } from '../core/util.js';
import { glowSprite } from './vfx.js';
import { drawRuneblade3D, runeblade3DReady, runebladeLook, preloadRuneblade, RUNEBLADE_LEN } from './runeblade3d.js';

const GLOW = { blood: '#ff2a30', shadow: '#70e050', poison: '#70e050', cold: '#7ad0ff' };
const SA = (wa) => Math.atan2((Math.cos(wa) + Math.sin(wa)) * HH, (Math.cos(wa) - Math.sin(wa)) * HW);   // floor angle -> screen
const SWINGS = ['slash', 'thrust', 'chop'];

function glow(ctx, color, x, y, r, a) {
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a;
  ctx.drawImage(glowSprite(color), x - r, y - r, r * 2, r * 2);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}

/** Draw a Rune Weapon summon; false while the model is not ready (the caller draws its sprite). */
export function drawRuneWeapon(ctx, m) {
  const o = m.owner, lv = (o && (o === G.player && G.char ? G.char.level : o.level)) || 1, L = runebladeLook(lv);
  preloadRuneblade(L.skin);
  if (!runeblade3DReady(L.skin)) return false;
  const S = m._rw || (m._rw = { a: Math.PI / 2, spin: 0, last: 0, side: 1, kind: 'slash', t: m.animT || 0 });
  const dt = Math.max(0, Math.min(0.1, (m.animT || 0) - S.t)); S.t = m.animT || 0;
  if (m.lunge > S.last + 0.3) { S.side = -S.side; S.kind = SWINGS[Math.floor(Math.random() * SWINGS.length)]; }   // a new attack
  S.last = m.lunge;
  const px = isoX(m.x, m.y), py = isoY(m.x, m.y), len = RUNEBLADE_LEN * (G.touch ? 0.85 : 1) * (m.scale || 1);
  const appear = m.spawnT < 0.3 ? m.spawnT / 0.3 : 1, t = m.animT || 0, f = SA(m.facing || 0), k = 1 - m.lunge;   // k: 0..1 through a swing
  const hover = (m.fly ? 16 + Math.sin(t * 3) * 4 : 6) + (m.z || 0);
  // where it wants to point (screen angle hilt -> point) and where its middle sits
  let a = Math.PI / 2 + Math.sin(t * 1.4) * 0.12, spin = t * 1.6, cx = px, cy = py - hover - len * 0.55, tilt = 0.12;
  if (m.moving) a += angleDiff(a, f) * 0.3;   // leans into the way it flies
  if (m.lunge > 0) {
    const e = k * k * (3 - 2 * k);
    if (S.kind === 'slash') { a = f + S.side * (-1.3 + 2.6 * e); spin = 0.2 * S.side; tilt = 0.35; cx += Math.cos(f) * 8; cy += Math.sin(f) * 4 + len * 0.15; }
    else if (S.kind === 'thrust') { a = f; spin = k * TAU; const r = Math.sin(k * Math.PI) * 18; cx += Math.cos(f) * r; cy += Math.sin(f) * r * 0.5 + len * 0.2; }
    else { const side = Math.cos(f) >= 0 ? 1 : -1, a0 = -Math.PI / 2 - side * 0.6; let d = (f + 0.5 * side - a0) % TAU; if (side > 0 && d < 0) d += TAU; if (side < 0 && d > 0) d -= TAU; a = a0 + d * e; spin = 0; tilt = 0.2; }
  }
  const ka = 1 - Math.exp(-dt * (m.lunge > 0 ? 30 : 10));
  S.a += angleDiff(S.a, a) * ka; S.spin += angleDiff(S.spin, spin) * ka;
  const dx = Math.cos(S.a), dy = Math.sin(S.a), Ls = len * appear, hx = cx - dx * Ls * 0.5, hy = cy - dy * Ls * 0.5;
  const col = GLOW[m.summonEl] || L.glow;
  // shadow, glow, the blade
  ctx.fillStyle = 'rgba(0,0,0,0.32)';
  ctx.beginPath(); ctx.ellipse(px, py, 6 + Math.abs(dx) * Ls * 0.35, 3, 0, 0, TAU); ctx.fill();
  const ga = m.alpha !== undefined ? m.alpha : 1;
  glow(ctx, col, cx, cy, Ls * 0.65, (0.35 + (m.flash > 0 ? 0.4 : 0)) * ga);
  ctx.globalAlpha = ga;
  drawRuneblade3D(ctx, hx, hy, S.a, Ls, { skin: L.skin, palette: L.palette, spin: S.spin, tilt, glow: col, glowAmt: 0.3 });
  ctx.globalAlpha = 1;
  const top = Math.min(hy, hy + dy * Ls) - 2;
  m.screenTop = top;
  m.drawOverhead(ctx, px, top - 4, Ls * 0.6);
  return true;
}
