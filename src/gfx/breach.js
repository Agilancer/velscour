// THE ETERNAL BREACH's own drawing (docs/ETERNAL_BREACH.md): the void behind the islands (a violet nebula, stars, far
// drifting rocks, rift lightning), the islands' undersides (rock tapering into the void, with hanging stalactites,
// roots and glowing rift crystal), the wards across walkways, and the riders' carrier beasts.
import { G } from '../state.js';
import { makeCanvas } from '../core/util.js';
import { camera, isoX, isoY } from '../core/view.js';
import { enemyImage } from '../core/enemyart.js';
import { glowSprite } from './vfx.js';

const hash = (x, y, s) => {
  let h = Math.imul(x ^ 0x3c6ef372, 0x2c1b3c6d) ^ Math.imul(y ^ s, 0x297a2d39);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296;
};

// ------------------------------------------------------------------ the void
const T = 1024; // the layers tile every T screen px
let layers = null;
function buildLayers() {
  // far nebula: soft clouds built at an eighth of the size and blown up (smoothing on), wrapped so the layer tiles
  const S = 128, small = makeCanvas(S, S), g = small.getContext('2d');
  g.fillStyle = '#06030c'; g.fillRect(0, 0, S, S);
  const blob = (ctx, x, y, r, col, a, size) => {
    for (const ox of [-size, 0, size]) for (const oy of [-size, 0, size]) {
      const gr = ctx.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r);
      gr.addColorStop(0, col.replace('A', a)); gr.addColorStop(1, col.replace('A', 0));
      ctx.fillStyle = gr; ctx.fillRect(x + ox - r, y + oy - r, r * 2, r * 2);
    }
  };
  g.globalCompositeOperation = 'lighter';
  const COLS = ['rgba(120,40,190,A)', 'rgba(170,40,160,A)', 'rgba(70,40,170,A)', 'rgba(200,70,220,A)', 'rgba(60,20,110,A)', 'rgba(40,60,150,A)'];
  for (let k = 0; k < 70; k++) {
    const x = hash(k, 1, 7) * S, y = hash(k, 2, 7) * S, r = 6 + hash(k, 3, 7) ** 2 * 34;
    blob(g, x, y, r, COLS[k % COLS.length], 0.05 + hash(k, 4, 7) * 0.14, S);
  }
  // dark dust lanes eat into the glow
  g.globalCompositeOperation = 'source-over';
  for (let k = 0; k < 26; k++) blob(g, hash(k, 5, 9) * S, hash(k, 6, 9) * S, 5 + hash(k, 7, 9) * 18, 'rgba(4,2,10,A)', 0.35, S);
  const far = makeCanvas(T, T), fg = far.getContext('2d');
  fg.imageSmoothingEnabled = true; fg.imageSmoothingQuality = 'high';
  fg.drawImage(small, 0, 0, T, T);
  // stars: pin pricks, a few bright crosses, painted onto the far nebula (one full-screen layer less a frame; they
  // drift with it)
  const sg = fg;
  for (let k = 0; k < 900; k++) {
    const x = Math.floor(hash(k, 8, 3) * T), y = Math.floor(hash(k, 9, 3) * T), b = hash(k, 10, 3);
    sg.fillStyle = b > 0.97 ? '#ffffff' : b > 0.8 ? '#e8d8ff' : b > 0.5 ? '#a090c8' : '#5a4a80';
    sg.fillRect(x, y, b > 0.92 ? 2 : 1, b > 0.92 ? 2 : 1);
    if (b > 0.985) { sg.globalAlpha = 0.5; sg.fillRect(x - 3, y, 8, 1); sg.fillRect(x, y - 3, 1, 8); sg.globalAlpha = 1; }
  }
  // near wisps: brighter, thinner veils drifting faster
  const ws = makeCanvas(S, S), wg = ws.getContext('2d');
  wg.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 40; k++) {
    const x = hash(k, 11, 5) * S, y = hash(k, 12, 5) * S;
    for (let j = 0; j < 4; j++) blob(wg, x + j * 4, y + j * 1.5, 4 + hash(k, 13, 5) * 9, k % 3 ? 'rgba(190,90,255,A)' : 'rgba(255,90,200,A)', 0.07, S);
  }
  const near = makeCanvas(T, T), ng = near.getContext('2d');
  ng.imageSmoothingEnabled = true; ng.imageSmoothingQuality = 'high';
  ng.drawImage(ws, 0, 0, T, T);
  // far drifting rocks: little dark islands with violet rims, each its own small sprite (a T x T layer for nine of them
  // was a full screen of empty pixels to blend every frame); [sprite, x, y] its place in the tile, kept to the same
  // sub-pixel so it draws as it did
  const rocks = [], box = [];
  for (let k = 0; k < 9; k++) {
    const cx = hash(k, 14, 1) * T, cy = hash(k, 15, 1) * T, w = 14 + hash(k, 16, 1) * 46, h = w * (0.7 + hash(k, 17, 1) * 0.6);
    box.push([cx, cy, w, h, Math.floor(cx - w / 2) - 1, Math.floor(cy - 8), Math.ceil(w + 3), Math.ceil(h + 10)]);
  }
  // one atlas (a canvas that size stays on the GPU), the rocks side by side
  const atlas = makeCanvas(box.reduce((a, b) => a + b[6], 0), Math.max(...box.map((b) => b[7]))), rg = atlas.getContext('2d');
  let ax = 0;
  for (let k = 0; k < 9; k++) {
    const [cx, cy, w, h, x0, y0, bw, bh] = box[k];
    rg.setTransform(1, 0, 0, 1, ax - x0, -y0);
    rg.fillStyle = '#120a1c';
    rg.beginPath(); rg.moveTo(cx - w / 2, cy);
    for (let j = 0; j <= 6; j++) rg.lineTo(cx - w / 2 + (w * j) / 6, cy - 2 - hash(k, j, 2) * 5);
    rg.lineTo(cx + w / 2, cy); rg.lineTo(cx + w * 0.12, cy + h); rg.lineTo(cx - w * 0.08, cy + h * 0.8); rg.closePath(); rg.fill();
    rg.fillStyle = 'rgba(170,90,255,0.55)'; rg.fillRect(cx - w / 2, cy - 1, w, 1);
    rocks.push([atlas, ax, 0, bw, bh, x0, y0]);
    ax += bw;
  }
  layers = { far, near, rocks };
}
function tiled(ctx, img, W, H, ox, oy) {
  const x0 = -(((ox % T) + T) % T), y0 = -(((oy % T) + T) % T);
  for (let y = y0; y < H; y += T) for (let x = x0; x < W; x += T) ctx.drawImage(img, x, y);
}
/** Atlas sprites [img, sx, sy, w, h, x, y] placed at (x, y) in a T x T tile, tiled over the screen like tiled() (those
 *  off the screen skipped). A sprite poking over the tile's edge is also drawn from the tile before. */
function tiledSprites(ctx, list, W, H, ox, oy) {
  const x0 = -(((ox % T) + T) % T) - T, y0 = -(((oy % T) + T) % T) - T;
  for (let y = y0; y < H; y += T) for (let x = x0; x < W; x += T) {
    for (const [img, sx, sy, w, h, tx, ty] of list) {
      const px = x + tx, py = y + ty;
      if (px < W && py < H && px + w > 0 && py + h > 0) ctx.drawImage(img, sx, sy, w, h, px, py, w, h);
    }
  }
}
/** The void behind the islands, in screen space: nebula, stars, far rocks and a rift flash now and then. */
export function drawNebula(ctx, W, H, camX, camY) {
  if (!layers) buildLayers();
  const t = G.time || 0;
  tiled(ctx, layers.far, W, H, camX * 0.04 + t * 1.5, camY * 0.04);   // opaque: render.js skips its black clear under it
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.6 + 0.15 * Math.sin(t * 0.3);
  tiled(ctx, layers.near, W, H, camX * 0.12 + t * 6, camY * 0.12 - t * 2);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  tiledSprites(ctx, layers.rocks, W, H, camX * 0.18 - t * 3, camY * 0.18 + Math.sin(t * 0.2) * 6);
  // rift lightning: a jagged violet crack somewhere in the deep every few seconds
  const k = Math.floor(t / 3.7), ph = t / 3.7 - k;
  if (ph < 0.12 && hash(k, 0, 55) < 0.6) {
    const x = hash(k, 1, 55) * W, y = hash(k, 2, 55) * H * 0.8, a = 1 - ph / 0.12;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a * 0.8;
    ctx.strokeStyle = '#e0a0ff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x, y);
    let px = x, py = y;
    for (let j = 0; j < 9; j++) { px += (hash(k, j, 56) - 0.5) * 60; py += 12 + hash(k, j, 57) * 22; ctx.lineTo(px, py); }
    ctx.stroke();
    ctx.globalAlpha = a * 0.35; ctx.drawImage(glowSprite('#b050ff'), x - 120, y - 60, 240, 240);
    ctx.restore();
  }
}

// ------------------------------------------------------------------ island undersides
/**
 * The face of a column hanging over the void (terrain.js face(): `quad` and the rock pattern `pat` are its own): rock
 * darkening into violet haze toward its foot, a few glowing rift seams, and stalactites, roots and crystal hanging
 * below the foot (their depth comes from the tile, so neighbouring faces don't line up into a ruler edge).
 */
export function breachUnderside(ctx, i, x0, y0, dx, dy, D, dark, quad, pat, few = false) {
  const skew = new DOMMatrix([1, dy / dx, 0, 1, 0, 0]);
  quad(ctx, x0, y0, dx, dy, 0, D);
  pat.setTransform(skew); ctx.fillStyle = pat; ctx.fill();
  const gr = ctx.createLinearGradient(0, y0, 0, y0 + D + Math.abs(dy));
  gr.addColorStop(0, 'rgba(14,6,24,0)'); gr.addColorStop(0.4, 'rgba(18,6,32,0.25)'); gr.addColorStop(1, 'rgba(12,4,24,0.62)');
  ctx.fillStyle = gr; ctx.fill();
  // stalactites and roots below the foot
  const n = few ? (hash(i, 1, 9) < 0.45 ? 1 : 0) : 2 + Math.floor(hash(i, 1, dark ? 3 : 4) * 3); // a short piece of a curve: one at most
  for (let k = 0; k < n; k++) {
    const u = (k + 0.2 + hash(i, k, 5) * 0.6) / n, w = 4 + hash(i, k, 6) * 9, len = 6 + hash(i, k, 7) ** 1.5 * 34;
    const bx = x0 + dx * u, by = y0 + dy * u + D;
    if (hash(i, k, 8) < 0.22) {
      // a hanging root
      ctx.strokeStyle = 'rgba(52,34,40,0.9)'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(bx, by - 1);
      ctx.quadraticCurveTo(bx + (hash(i, k, 9) - 0.5) * 10, by + len * 0.5, bx + (hash(i, k, 10) - 0.5) * 6, by + len * 1.2);
      ctx.stroke();
      continue;
    }
    ctx.fillStyle = dark ? '#0d0714' : '#170d22';
    ctx.beginPath(); ctx.moveTo(bx - w / 2, by - 1); ctx.lineTo(bx + w / 2, by - 1 + dy / dx * w);
    ctx.lineTo(bx + (hash(i, k, 11) - 0.5) * w * 0.5, by + len); ctx.closePath(); ctx.fill();
    if (hash(i, k, 12) < 0.18) {
      // a shard of rift crystal at its tip
      const cx = bx + (hash(i, k, 11) - 0.5) * w * 0.5, cy = by + len;
      ctx.fillStyle = '#c070ff'; ctx.beginPath(); ctx.moveTo(cx - 2, cy - 5); ctx.lineTo(cx + 2, cy - 5); ctx.lineTo(cx, cy + 4); ctx.closePath(); ctx.fill();
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.45; ctx.drawImage(glowSprite('#b060ff'), cx - 9, cy - 10, 18, 18); ctx.restore();
    }
  }
  // glowing rift seams in the rock
  if (hash(i, 2, dark ? 13 : 14) < 0.3 && D > 30) {
    const u = 0.2 + hash(i, 3, 15) * 0.6, sx = x0 + dx * u, sy = y0 + dy * u + 8;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(190,100,255,0.7)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(sx, sy);
    let px = sx, py = sy;
    for (let k = 0; k < 4; k++) { px += (hash(i, k, 16) - 0.5) * 8; py += Math.min(D - 10, 6 + hash(i, k, 17) * 12) / 2; ctx.lineTo(px, py); }
    ctx.stroke(); ctx.restore();
  }
  ctx.strokeStyle = 'rgba(20,12,28,0.6)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x0, y0 + 0.5); ctx.lineTo(x0 + dx, y0 + dy + 0.5); ctx.stroke();
}
/** How far below a face's foot its stalactites can hang (world px), for the columns' screen boxes. */
export const UNDERSIDE_HANG = 46;

// ------------------------------------------------------------------ wards
/** A ward across a walkway: a curtain of violet light between two rune posts, flickering, with motes rising. */
export function drawWard(ctx, w) {
  const t = G.time, a = w.open ?? 0, vis = 1 - a;
  if (vis <= 0.01) return;
  const x = isoX(w.x, w.y), y = isoY(w.x, w.y), half = 30, ax = w.axis === 'x' ? 1 : -1, hgt = 70;
  const vr = camera.viewRect(60);   // every ward on the floor is a hazard drawn each frame: those off the screen stop here
  if (x < vr.x0 || x > vr.x1 || y < vr.y0 || y - hgt > vr.y1) return;
  const lx = x - half, ly = y - half * 0.5 * ax, rx = x + half, ry = y + half * 0.5 * ax;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 3; k++) {
    ctx.globalAlpha = vis * (0.14 + 0.06 * Math.sin(t * 5 + k * 2));
    const gr = ctx.createLinearGradient(0, y - hgt, 0, y);
    gr.addColorStop(0, 'rgba(160,60,255,0)'); gr.addColorStop(0.5, k === 1 ? '#ff60d0' : '#a050ff'); gr.addColorStop(1, '#e0b0ff');
    ctx.fillStyle = gr;
    ctx.beginPath(); ctx.moveTo(lx, ly);
    for (let j = 0; j <= 8; j++) { const u = j / 8; ctx.lineTo(lx + (rx - lx) * u, ly + (ry - ly) * u - hgt * (0.8 + 0.2 * Math.sin(t * 3 + j + k))); }
    ctx.lineTo(rx, ry); ctx.closePath(); ctx.fill();
  }
  // vertical rune lines
  ctx.globalAlpha = vis * 0.6; ctx.strokeStyle = '#f0d0ff'; ctx.lineWidth = 1;
  for (let j = 1; j < 8; j++) {
    const u = j / 8, bx = lx + (rx - lx) * u, by = ly + (ry - ly) * u, s = (t * 40 + j * 13) % hgt;
    ctx.beginPath(); ctx.moveTo(bx, by - s); ctx.lineTo(bx, by - s - 8); ctx.stroke();
  }
  ctx.globalAlpha = vis * 0.35; ctx.drawImage(glowSprite('#b050ff'), x - 45, y - hgt, 90, hgt + 20);
  ctx.restore();
  // the posts
  ctx.globalAlpha = vis;
  for (const [px, py] of [[lx, ly], [rx, ry]]) {
    ctx.fillStyle = '#2a1e30'; ctx.fillRect(px - 3, py - 26, 6, 26);
    ctx.fillStyle = '#d090ff'; ctx.fillRect(px - 1, py - 22 + Math.sin(t * 4 + px) * 2, 2, 4);
  }
  ctx.globalAlpha = 1;
}

// ------------------------------------------------------------------ carriers
/** A carrier beast (a big flier of the Breach) bearing riders over the void: its sprite at `z`, flapping, a shadow
 * on the ground below it when over an island. */
export function drawCarrier(ctx, c) {
  const img = enemyImage(c.art, null);
  const x = isoX(c.x, c.y), gy = isoY(c.x, c.y), y = gy - c.z;
  if (c.ground) {
    ctx.fillStyle = 'rgba(10,4,16,0.35)';
    ctx.beginPath(); ctx.ellipse(x, gy, c.h * 0.6, c.h * 0.22, 0, 0, Math.PI * 2); ctx.fill();
  }
  if (!img) return;
  const flap = 1 + Math.sin(G.time * 9 + c.seed) * 0.09, h = c.h, w = h * img.width / img.height;
  ctx.save(); ctx.translate(x, y); if (c.flip) ctx.scale(-1, 1); ctx.scale(1, flap);
  ctx.drawImage(img, -w / 2, -h, w, h);
  ctx.restore();
  // its riders cling under it
  for (const r of c.riders || []) {
    if (r.dropped) continue;
    const ri = enemyImage(r.art, r.swap);
    if (!ri) continue;
    const rh = (r.artH || 50) * 0.8, rw = rh * ri.width / ri.height;
    ctx.drawImage(ri, x + r.ox - rw / 2, y - h * 0.25 - rh + r.oy, rw, rh);
  }
}
