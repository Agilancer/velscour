// Procedural set pieces the town's scenes put down for a visit (src/game/townlife.js): a campfire, candles, festival
// bunting between two posts, a bedroll, and the cursed great axe on its rack by the forge (game/homunculus.js; its
// glow follows the story chapter `ch`). Drawn by render.js drawProp for props with these kinds; `light` makes them glow.
import { glowSprite } from './vfx.js';
import { isoX, isoY } from '../core/view.js';
import { drawVarrowAxe } from './varrowaxe.js';

const TAU = Math.PI * 2;
export const TOWN_PROP_KINDS = new Set(['campfire', 'candle', 'bunting', 'bedroll', 'post', 'axe_rack']);

function flame(ctx, x, y, s, t, seed) {
  const f = Math.sin(t * 11 + seed) * 0.5 + Math.sin(t * 17 + seed * 2) * 0.3;
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.5 + f * 0.1;
  ctx.drawImage(glowSprite('#ff9a40'), x - 22 * s, y - 30 * s, 44 * s, 44 * s);
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#ff6a18';
  ctx.beginPath(); ctx.ellipse(x, y - 6 * s - f, 4.2 * s, (8 + f * 1.5) * s, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#ffb040';
  ctx.beginPath(); ctx.ellipse(x + f * 0.6, y - 5 * s - f, 2.6 * s, (5.5 + f) * s, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#fff0a0';
  ctx.beginPath(); ctx.ellipse(x, y - 3.5 * s, 1.3 * s, 2.8 * s, 0, 0, TAU); ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
}

export function drawTownProp(ctx, pr, t) {
  const x = isoX(pr.x, pr.y), y = isoY(pr.x, pr.y);
  if (pr.kind === 'campfire') {
    // ring of stones, crossed logs, a tall flame and rising sparks
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * TAU, sx = x + Math.cos(a) * 13, sy = y + Math.sin(a) * 6.5;
      ctx.fillStyle = i % 2 ? '#6d6a66' : '#585450';
      ctx.beginPath(); ctx.ellipse(sx, sy, 3.6, 2.6, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#8c8984'; ctx.fillRect(sx - 1.5, sy - 2, 2, 1);
    }
    ctx.fillStyle = '#2a1a10'; ctx.beginPath(); ctx.ellipse(x, y, 10, 4.6, 0, 0, TAU); ctx.fill();
    ctx.lineCap = 'round';
    for (const [a, b, c, d] of [[-9, 2, 8, -3], [-8, -3, 9, 2], [-2, 3, 2, -5]]) {
      ctx.strokeStyle = '#4a2c16'; ctx.lineWidth = 3.4; ctx.beginPath(); ctx.moveTo(x + a, y + b); ctx.lineTo(x + c, y + d); ctx.stroke();
      ctx.strokeStyle = '#7a4a24'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x + a, y + b - 1); ctx.lineTo(x + c, y + d - 1); ctx.stroke();
    }
    ctx.fillStyle = '#ff5a10'; ctx.globalAlpha = 0.7; ctx.beginPath(); ctx.ellipse(x, y, 6, 2.6, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
    flame(ctx, x - 2, y - 1, 1.15, t, pr.x);
    flame(ctx, x + 3, y, 0.8, t + 0.4, pr.y);
    ctx.fillStyle = '#ffd060';
    for (let i = 0; i < 4; i++) {
      const ph = (t * 0.7 + i * 0.27 + pr.x) % 1;
      ctx.globalAlpha = 1 - ph;
      ctx.fillRect(x + Math.sin(ph * 9 + i * 2) * 5, y - 12 - ph * 34, 1.5, 1.5);
    }
    ctx.globalAlpha = 1;
  } else if (pr.kind === 'candle') {
    ctx.fillStyle = '#e8dcc0'; ctx.fillRect(x - 1.6, y - 8, 3.2, 8);
    ctx.fillStyle = '#b8a888'; ctx.fillRect(x + 0.6, y - 8, 1, 8);
    ctx.fillStyle = '#4a3a2a'; ctx.beginPath(); ctx.ellipse(x, y, 3.2, 1.4, 0, 0, TAU); ctx.fill();
    flame(ctx, x, y - 8, 0.38, t, pr.x * 3 + pr.y);
  } else if (pr.kind === 'post' || pr.kind === 'bunting') {
    // a pole; bunting also strings pennants to its partner at (x2, y2)
    const pole = (px, py) => { ctx.fillStyle = '#5a3a1c'; ctx.fillRect(px - 1.5, py - 46, 3, 46); ctx.fillStyle = '#c8a050'; ctx.fillRect(px - 2.5, py - 48, 5, 3); };
    pole(x, y);
    if (pr.kind === 'bunting') {
      const x2 = isoX(pr.x2, pr.y2), y2 = isoY(pr.x2, pr.y2);
      pole(x2, y2);
      const cols = pr.colors || ['#d83a3a', '#f0c040', '#3a8ad8', '#f4f0e0', '#5ab040'];
      const n = Math.max(4, Math.round(Math.hypot(x2 - x, y2 - y) / 9));
      ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 0.8; ctx.beginPath();
      const at = (k) => { const sag = Math.sin(k * Math.PI) * 9; return [x + (x2 - x) * k, y - 44 + (y2 - y) * k + sag]; };
      for (let i = 0; i <= 16; i++) { const [px, py] = at(i / 16); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
      ctx.stroke();
      for (let i = 0; i < n; i++) {
        const k = (i + 0.5) / n, [px, py] = at(k), sw = Math.sin(t * 3 + i) * 1.2;
        ctx.fillStyle = cols[i % cols.length];
        ctx.beginPath(); ctx.moveTo(px - 3, py); ctx.lineTo(px + 3, py); ctx.lineTo(px + sw, py + 7); ctx.closePath(); ctx.fill();
      }
    }
  } else if (pr.kind === 'axe_rack') {
    // the 3D bake (gfx/varrowaxe.js): it sways on its chain, and turns slowly while Varrow speaks
    const dt = Math.min(0.1, Math.max(0, t - (pr.lastT ?? t))); pr.lastT = t;
    if (pr.talkT > 0) pr.spin = (pr.spin || 0) + dt * 1.3;
    else if (pr.spin) pr.spin += (Math.round(pr.spin / TAU) * TAU - pr.spin) * Math.min(1, dt * 1.2);
    const ch = pr.ch || 0, pulse = 0.5 + Math.sin(t * 2.2) * 0.5;
    axeGlow(ctx, x, y, ch, t, pulse, true);
    if (drawVarrowAxe(ctx, x, y, (pr.spin || 0) + Math.sin(t * 0.55 + pr.x) * 0.32, ch >= 1 ? runeColour(ch) : null, ch >= 1 ? 0.5 + ch * 0.07 + pulse * 0.35 : 0)) axeGlow(ctx, x, y, ch, t, pulse, false);
    else drawAxeRack(ctx, x, y, ch, t);
  } else if (pr.kind === 'bedroll') {
    ctx.save(); ctx.translate(x, y); ctx.scale(1, 0.5); ctx.rotate(pr.rot || 0.5);
    ctx.fillStyle = pr.color || '#6a3a2a'; ctx.fillRect(-14, -6, 28, 12);
    ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(-14, -6, 28, 3);
    ctx.fillStyle = '#c8b890'; ctx.fillRect(-14, -6, 7, 12);
    ctx.restore();
  }
}

const runeColour = (ch) => (ch >= 11 ? '#ffe080' : ch >= 5 ? '#a8f0ff' : '#7dffb0');
// the light round the 3D axe's head (behind it) and the frost drifting off it (in front)
function axeGlow(ctx, x, y, ch, t, pulse, behind) {
  const done = ch >= 11;
  if (behind) {
    if (ch < 1) return;
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.min(0.75, 0.12 + ch * 0.06) * (0.6 + pulse * 0.4);
    ctx.drawImage(glowSprite(runeColour(ch)), x - 34, y - 92, 68, 60);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    return;
  }
  if (ch < 5) return;
  ctx.fillStyle = done ? '#fff0b0' : '#dff8ff';
  for (let i = 0; i < 6; i++) { const ph = (t * 0.35 + i * 0.17) % 1; ctx.globalAlpha = (1 - ph) * 0.8; ctx.fillRect(x + Math.sin(ph * 7 + i) * 18, y - 58 - ph * 30, 1.6, 1.6); }
  ctx.globalAlpha = 1;
}

// Varrow's prison drawn flat (until the 3D bake has loaded): a great axe hung head-up on a two-post rack
function drawAxeRack(ctx, x, y, ch, t) {
  const pulse = 0.5 + Math.sin(t * 2.2) * 0.5, done = ch >= 11;
  const glow = done ? '#ffe080' : ch >= 5 ? '#a8f0ff' : '#7dffb0';
  if (ch >= 1) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.min(0.75, 0.12 + ch * 0.06) * (0.6 + pulse * 0.4);
    ctx.drawImage(glowSprite(glow), x - 26, y - 70, 52, 66);
    if (ch >= 5 && !done) { ctx.globalAlpha = 0.25 + pulse * 0.15; ctx.drawImage(glowSprite('#7dffb0'), x - 18, y - 30, 36, 30); }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(x, y, 14, 5, 0, 0, TAU); ctx.fill();
  // the rack
  for (const px of [x - 10, x + 10]) { ctx.fillStyle = '#4a2e18'; ctx.fillRect(px - 1.8, y - 44, 3.6, 44); ctx.fillStyle = '#6e4626'; ctx.fillRect(px - 1.8, y - 44, 1.2, 44); }
  ctx.fillStyle = '#5a3820'; ctx.fillRect(x - 13, y - 40, 26, 3.4); ctx.fillRect(x - 12, y - 12, 24, 3);
  // the haft and the double-bitted head
  ctx.fillStyle = '#2a1c14'; ctx.fillRect(x - 1.6, y - 64, 3.2, 60);
  ctx.fillStyle = '#463024'; ctx.fillRect(x - 1.6, y - 64, 1, 60);
  ctx.fillStyle = '#1e2224';
  for (const s of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(x + s * 1.5, y - 66); ctx.quadraticCurveTo(x + s * 13, y - 72, x + s * 15, y - 62);
    ctx.quadraticCurveTo(x + s * 14, y - 52, x + s * 1.5, y - 53); ctx.closePath(); ctx.fill();
  }
  ctx.fillStyle = '#6c767a';
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x + s * 13.5, y - 69); ctx.quadraticCurveTo(x + s * 16, y - 62, x + s * 13, y - 54); ctx.lineTo(x + s * 11.5, y - 56); ctx.quadraticCurveTo(x + s * 13.5, y - 62, x + s * 12, y - 67); ctx.closePath(); ctx.fill(); }
  ctx.fillStyle = '#3a3e40'; ctx.fillRect(x - 3, y - 70, 6, 18);
  // runes on the blade: dark at first, then green, then frost (gold once Varrow is reformed)
  ctx.fillStyle = ch >= 1 ? glow : '#4a5254';
  ctx.globalAlpha = ch >= 1 ? 0.55 + pulse * 0.45 : 1;
  for (const [rx, ry] of [[-8, -64], [-9, -60], [-7, -57], [8, -64], [9, -60], [7, -57], [0, -66], [0, -61], [0, -56]]) ctx.fillRect(x + rx - 0.7, y + ry, 1.4, 2);
  ctx.globalAlpha = 1;
  // chains: seven once, only broken links now
  ctx.strokeStyle = '#7a7470'; ctx.lineWidth = 1;
  for (const [cx, cy] of [[-10, -36], [-10, -32], [10, -36], [10, -31], [10, -27]]) { ctx.beginPath(); ctx.ellipse(x + cx, y + cy, 1.4, 2, 0, 0, TAU); ctx.stroke(); }
  // frost drifting off it once the forge has gone cold
  if (ch >= 5) {
    ctx.fillStyle = done ? '#fff0b0' : '#dff8ff';
    for (let i = 0; i < 5; i++) { const ph = (t * 0.35 + i * 0.21) % 1; ctx.globalAlpha = (1 - ph) * 0.8; ctx.fillRect(x + Math.sin(ph * 7 + i) * 12, y - 52 - ph * 26, 1.6, 1.6); }
    ctx.globalAlpha = 1;
  }
}
