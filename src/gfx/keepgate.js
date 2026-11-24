// The portal to TESSARIEL'S KEEP (docs/TESSARIELS_KEEP.md), in Herrington Hollow and the Act II town, and its twin in
// the keep's hall: Tessariel's green-and-gold fire standing in a ring, two wings of light folded over it, a gilt T
// burning at its heart, and seven ember-stones going round. The dungeon portal's size; no two portals look alike.
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
  // the gilt T at the heart, and sparks rising
  ctx.globalAlpha = 0.9 + Math.sin(t * 3) * 0.08;
  ctx.fillStyle = '#fff0b0';
  ctx.fillRect(-13, -H * 0.2, 26, 5); ctx.fillRect(-2.5, -H * 0.2, 5, 34);
  ctx.beginPath(); ctx.moveTo(-5, -H * 0.2 + 34); ctx.lineTo(0, -H * 0.2 + 42); ctx.lineTo(5, -H * 0.2 + 34); ctx.fill();
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
