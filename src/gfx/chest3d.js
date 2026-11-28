// The treasure chest of the Bellmourn 3D game (bm repo's chest.glb), baked from the game's iso camera by
// tools/chest3d_bake.js into assets/sprites/chest3d.webp: eight frames of its lid swinging open. It stands in for
// every chest that used to be drawn in code (the Cursed Chest, a chest whose pack art has not loaded) and is Act III's
// own chest; the looks are palette swaps of the one bake (util.recolor), made the first time each is drawn.
import { G } from '../state.js';
import { loadImage } from '../core/assets.js';
import { recolor } from '../core/util.js';

const LOOKS = { plain: null, rare: { colorize: [278, 0.62], light: 0.02 }, cursed: { colorize: [338, 0.85], light: 0.03, contrast: 1.1 }, blood: { colorize: [356, 0.8] } };
const W = 62, OPEN_FPS = 14;   // world px a cell is drawn at; frames a second as the lid swings
let img = null, meta = null, loading = null;
const made = {};
export function loadChest3D() {
  return loading || (loading = Promise.all([loadImage('assets/sprites/chest3d.webp'), fetch('assets/sprites/chest3d.json').then((r) => r.json())]).then(([i, m]) => { img = i; meta = m; }).catch((e) => { loading = null; console.warn('chest3d:', e); }));
}
if (typeof Image !== 'undefined') loadChest3D();
export const chest3DReady = () => !!(img && meta);
/** Draw chest `c` (it remembers when it was opened, for the swing) at screen (x, y), its foot there. False if the art is not in yet. */
export function drawChest3D(ctx, c, x, y, look = 'plain', scale = 1) {
  if (!img || !meta) return false;
  const sheet = made[look] || (made[look] = recolor(img, LOOKS[look] || null, 0, 0, undefined, undefined, true));
  if (c.opened && c._openAt == null) c._openAt = c._seenShut ? G.time : -99;   // (opened before it was ever seen: already open)
  if (!c.opened) { c._seenShut = true; c._openAt = null; }
  const f = c.opened ? Math.min(meta.frames - 1, Math.floor((G.time - c._openAt) * OPEN_FPS)) : 0, k = (W * scale) / meta.cell;
  ctx.fillStyle = 'rgba(0,0,0,0.38)'; ctx.beginPath(); ctx.ellipse(x, y, 17 * scale, 7.5 * scale, 0, 0, Math.PI * 2); ctx.fill();
  const sm = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = true;
  ctx.drawImage(sheet, f * meta.cell, 0, meta.cell, meta.cell, x - meta.px * k, y - meta.py * k + 3 * scale, meta.cell * k, meta.cell * k);
  ctx.imageSmoothingEnabled = sm;
  return true;
}
