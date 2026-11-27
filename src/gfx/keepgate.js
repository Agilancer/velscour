// The portal to TESSARIEL'S KEEP (docs/TESSARIELS_KEEP.md), in Herrington Hollow and the Act II town, and its twin in
// the keep's hall: Tessariel's green-and-gold fire standing in a ring, two wings of light folded over it, the Sword of
// Light burning at its heart, and seven ember-stones going round. The dungeon portal's size; no two portals look alike.
import { G } from '../state.js';
import { isoX, isoY } from '../core/view.js';
import { TAU } from '../core/util.js';
import { glowSprite } from './vfx.js';

const SCALE = 0.66;
/** Where the keep's portal stands in a town: off the square, clear of the other portals, the altar and the vendors. */
export function keepgateSpot(t) {
  const m = t.map, C = t.center, P = t.portal;
  const open = (x, y) => { for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) if (!m.walkable(x + i, y + j)) return false; return true; };
  const others = [t.breach, t.rift, t.altar, t.riftgate, P].filter(Boolean);
  const clear = (x, y) => !t.npcs.some((n) => Math.hypot(n.x - x, n.y - y) < 3.2) && others.every((o) => Math.hypot(x - o.x, y - o.y) > 6)
    && Math.hypot(x - t.start[0], y - t.start[1]) > 3.5;
  const a0 = Math.atan2(C.y - P.y, C.x - P.x) + Math.PI / 2;   // to one side of the portal road
  for (const d of [6, 7, 5, 8, 9, 10, 4, 11, 12, 13]) for (let a = 0; a < 20; a++) {
    const ang = a0 + (a % 2 ? 1 : -1) * Math.ceil(a / 2) * 0.31;
    const x = Math.floor(C.x + Math.cos(ang) * d) + 0.5, y = Math.floor(C.y + Math.sin(ang) * d) + 0.5;
    if (open(x, y) && clear(x, y)) return { x, y };
  }
  return null;
}

export function drawKeepGate(ctx, p) {
  const t = G.time, H = 118, cy = -H * 0.55;
  ctx.save();
  ctx.translate(isoX(p.x, p.y), isoY(p.x, p.y)); ctx.scale(SCALE, SCALE);
  // a ring of pale stone set in the ground, lit from within
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.6 + Math.sin(t * 1.7) * 0.12;
  ctx.drawImage(glowSprite('#9cff5a'), -78, -30, 156, 60);
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  ctx.fillStyle = '#2a2a24'; ctx.beginPath(); ctx.ellipse(0, 0, 52, 24, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#d8c38a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(0, 0, 50, 23, 0, 0, TAU); ctx.stroke();
  ctx.strokeStyle = 'rgba(200,240,120,0.75)'; ctx.lineWidth = 1.5;
  for (let i = 0; i < 12; i++) { const a = i * TAU / 12 + t * 0.25; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 40, Math.sin(a) * 18); ctx.lineTo(Math.cos(a) * 48, Math.sin(a) * 22); ctx.stroke(); }
  // ember-stones going round (behind first)
  const stones = (front) => {
    for (let i = 0; i < 7; i++) {
      const a = -t * 0.6 + i * TAU / 7, s = Math.sin(a);
      if ((s > 0) !== front) continue;
      const sx = Math.cos(a) * 58, sy = cy + 28 + s * 16 + Math.sin(t * 2 + i) * 5, k = 0.8 + s * 0.2;
      ctx.fillStyle = '#e8dcb0'; ctx.beginPath(); ctx.moveTo(sx, sy - 7 * k); ctx.lineTo(sx + 4 * k, sy); ctx.lineTo(sx, sy + 6 * k); ctx.lineTo(sx - 4 * k, sy); ctx.fill();
      ctx.fillStyle = `rgba(160,255,90,${0.6 + 0.4 * Math.sin(t * 4 + i)})`; ctx.fillRect(sx - 1, sy - 2 * k, 2, 3 * k);
    }
  };
  stones(false);
  ctx.translate(0, cy);
  // the fire: a tall oval of green and gold, white at the heart
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.95; ctx.drawImage(glowSprite('#7dff4a'), -60, -H * 0.7, 120, H * 1.4);
  ctx.globalAlpha = 0.7; ctx.drawImage(glowSprite('#3aa030'), -46, -H * 0.55, 92, H * 1.1);
  ctx.globalAlpha = 0.5; ctx.drawImage(glowSprite('#ffe080'), -40, -H * 0.5, 80, H);
  for (let i = 0; i < 8; i++) {
    const r = 1 - i * 0.09, sp = 1.1 + i * 0.35;
    ctx.globalAlpha = 0.8;
    ctx.strokeStyle = i % 3 === 0 ? 'rgba(255,240,180,0.7)' : i % 3 === 1 ? 'rgba(150,255,90,0.75)' : 'rgba(230,200,90,0.7)';
    ctx.lineWidth = 3 - i * 0.25;
    ctx.beginPath(); ctx.ellipse(0, 0, 38 * r, H * 0.5 * r, 0, t * sp * (i % 2 ? -1 : 1), t * sp * (i % 2 ? -1 : 1) + 3.9 + i * 0.2); ctx.stroke();
  }
  // two wings of light folded over the fire
  ctx.globalAlpha = 0.22 + Math.sin(t * 1.3) * 0.06;
  for (const s of [-1, 1]) {
    ctx.fillStyle = 'rgba(230,255,190,0.5)';
    for (let f = 0; f < 5; f++) {
      ctx.beginPath(); ctx.moveTo(s * 10, -H * 0.18);
      ctx.quadraticCurveTo(s * (46 + f * 6), -H * (0.52 - f * 0.05), s * (58 + f * 4), -H * (0.12 - f * 0.08));
      ctx.quadraticCurveTo(s * (34 + f * 5), -H * (0.2 - f * 0.06), s * 10, -H * (0.1 - f * 0.04));
      ctx.fill();
    }
  }
  // the Sword of Light at the heart, point down (Tessariel's device; tools/tkeep_sword.py EMBLEM): drawn over the glow,
  // not added to it (the white heart of the fire swallowed the old device), on whole pixels with a thin dark-gold edge,
  // a gleam running down the blade, and the fire licking over it; then sparks rising
  const sw = 0.94 + Math.sin(t * 3) * 0.06, bob = Math.round(Math.sin(t * 1.4) * 1.5);
  const hilt = () => {
    ctx.beginPath(); ctx.moveTo(0, -50); ctx.lineTo(5, -44); ctx.lineTo(0, -38); ctx.lineTo(-5, -44); ctx.closePath();   // pommel
    ctx.rect(-2, -39, 4, 11);                                                                                            // grip
    ctx.moveTo(0, -31); ctx.quadraticCurveTo(12, -30, 19, -20); ctx.quadraticCurveTo(10, -25, 0, -24.5);                 // guard: two wings swept down
    ctx.quadraticCurveTo(-10, -25, -19, -20); ctx.quadraticCurveTo(-12, -30, 0, -31); ctx.closePath();
  };
  const half = (s) => { ctx.beginPath(); ctx.moveTo(0, -26); ctx.lineTo(s * 4.5, -26); ctx.lineTo(s * 3.5, 28); ctx.lineTo(0, 44); ctx.closePath(); };
  ctx.globalCompositeOperation = 'source-over'; ctx.translate(0, bob); ctx.lineJoin = 'miter';
  ctx.globalAlpha = sw; ctx.strokeStyle = '#6e4c10'; ctx.lineWidth = 1.5;
  hilt(); ctx.stroke(); ctx.fillStyle = '#e8b848'; ctx.fill();
  ctx.fillStyle = '#b8862a'; ctx.beginPath(); ctx.moveTo(0, -27.5); ctx.quadraticCurveTo(11, -27.5, 19, -20); ctx.quadraticCurveTo(10, -25, 0, -24.5); ctx.quadraticCurveTo(-10, -25, -19, -20); ctx.quadraticCurveTo(-11, -27.5, 0, -27.5); ctx.fill();   // the guard's underside, in shade
  half(-1); ctx.stroke(); half(1); ctx.stroke();
  half(-1); ctx.fillStyle = '#fff1b8'; ctx.fill();   // the lit side
  half(1); ctx.fillStyle = '#f0cf78'; ctx.fill();    // the shaded side
  ctx.fillStyle = '#fffdf0'; ctx.fillRect(-1, -25, 2, 62);   // the ridge: the brightest thing in the fire
  ctx.fillStyle = '#7ec8ff'; ctx.beginPath(); ctx.moveTo(0, -31); ctx.lineTo(2.5, -27.5); ctx.lineTo(0, -24); ctx.lineTo(-2.5, -27.5); ctx.fill();   // the gem at the cross
  const gl = (t * 0.55) % 1.6;   // the gleam
  if (gl < 1) { ctx.globalAlpha = sw * Math.sin(gl * Math.PI) * 0.9; ctx.fillStyle = '#ffffff'; ctx.fillRect(-3, Math.round(-24 + gl * 58), 6, 3); }
  ctx.translate(0, -bob); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 3; i++) {   // the fire over the blade
    const a = t * (1.3 + i * 0.4) + i * 2.1;
    ctx.globalAlpha = 0.3; ctx.strokeStyle = i % 2 ? 'rgba(150,255,90,0.8)' : 'rgba(255,240,180,0.8)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(0, 4, 16 + i * 5, H * (0.3 + i * 0.05), 0, a, a + 1.1); ctx.stroke();
  }
  for (let i = 0; i < 16; i++) {
    const f = (t * 0.4 + i / 16) % 1, a = i * 2.4;
    ctx.globalAlpha = 1 - f; ctx.fillStyle = i % 2 ? '#c8ff80' : '#fff4c0';
    ctx.fillRect(Math.sin(a + t) * 26 * (1 - f * 0.5), H * 0.45 - f * H * 1.05, 2, 2);
  }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  ctx.translate(0, -cy);
  stones(true);
  ctx.restore();
}
