// The Altar of Heresy in Herrington Hollow (docs/ENDGAME.md), baked in Blender (tools/heresyaltar_blender.py ->
// python tools/heresyaltar.py -> assets/sprites/npc/heresy_altar.webp/json): a basalt dais, two great horns, the
// forbidden book on its slab, and a blood crystal turning in two rings of runes above it. Three states cross-fade in
// place: sealed (cold stone, before the Endgame), awake (runes and candles lit) and ablaze (every Heresy's fire: cracks,
// horn grooves, a heartbeat that quickens with the rank, fire off the horn tips). Loads on first use;
// drawHeresyAltar returns false until then and render.js draws the old obelisk.
import { G } from '../state.js';
import { rasterSprites, decoded, clamp } from '../core/util.js';
import { glowSprite, addLight, spawn } from './vfx.js';

let meta = null, img = null, loading = null;
function load() {
  loading = Promise.all([
    fetch('assets/sprites/npc/heresy_altar.json').then((r) => r.json()),
    new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = 'assets/sprites/npc/heresy_altar.webp'; }),
  ]).then(([m, im]) => Promise.resolve(rasterSprites() ? decoded(im) : im).then((b) => { meta = m; img = b; }))
    .catch((e) => console.warn('heresy altar art', e));
  return loading;
}
export const heresyAltarReady = () => (img ? Promise.resolve() : loading || load());

/** 0 sealed, 1 awake, 2 ablaze (the rank lifts it from 1.55 to 2). */
export const altarLevel = (open, rank) => (!open ? 0 : rank > 0 ? 1.55 + 0.45 * Math.min(1, rank / 20) : 1);

// a heartbeat: two thumps, then rest; faster with the rank
function beat(t, period) {
  const p = (t % period) / period;
  return Math.exp(-((p - 0.06) ** 2) / 0.0016) + 0.65 * Math.exp(-((p - 0.24) ** 2) / 0.0018);
}

/** The altar at (x, y), the ground under its middle in world px, for NPC n (state kept on it). */
export function drawHeresyAltar(ctx, n, x, y, open, rank) {
  if (!img) { if (!loading) load(); return false; }
  const { S, base, heart, fx } = meta, k = 1 / S, t = G.time, dt = Math.min(0.1, G.dt || 0);
  // ease toward the state, so the Endgame opening (or the last Heresy renounced) fades rather than snaps
  const want = altarLevel(open, rank);
  n._lvl = n._lvl === undefined ? want : n._lvl + (want - n._lvl) * Math.min(1, dt * 1.6);
  const L = n._lvl, blaze = clamp(L - 1, 0, 1), period = 1.25 - 0.45 * clamp((rank || 0) / 26, 0, 1);
  const b = blaze > 0.02 ? beat(t, period) * blaze : 0, breath = 0.5 + 0.5 * Math.sin(t * 1.3);
  const [bw, bh] = base.size, [ax, ay] = base.anchor, X = x - ax * k, Y = y - ay * k;
  // the ground under it smoulders
  if (L > 0.3) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = clamp(L - 0.3, 0, 1) * (0.08 + 0.05 * breath + 0.12 * b);
    ctx.drawImage(glowSprite('#ff3418'), x - 70, y - 30, 140, 54);
    ctx.restore();
  }
  // the three states, each over the last (the same crop and silhouette)
  ctx.drawImage(img, base.sealed[0], base.sealed[1], bw, bh, X, Y, bw * k, bh * k);
  const a1 = clamp(L, 0, 1), a2 = clamp(blaze * (0.82 + 0.18 * b), 0, 1);
  if (a1 > 0.01) { ctx.globalAlpha = a1; ctx.drawImage(img, base.awake[0], base.awake[1], bw, bh, X, Y, bw * k, bh * k); }
  if (a2 > 0.01) { ctx.globalAlpha = a2; ctx.drawImage(img, base.ablaze[0], base.ablaze[1], bw, bh, X, Y, bw * k, bh * k); }
  // the fire's bloom (its own render, blurred, on black), added: a breath while awake, the heartbeat while ablaze
  const bloom = clamp(L, 0, 1) * (0.05 + 0.05 * breath) + blaze * (0.14 + 0.36 * b);
  if (bloom > 0.01) {
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = clamp(bloom, 0, 1);
    ctx.drawImage(img, base.glow[0], base.glow[1], bw, bh, X, Y, bw * k, bh * k);
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.globalAlpha = 1;
  // the heart: turns faster as the altar wakes, bobs, its rings and runes lit by the level
  n._ph = ((n._ph || 0) + dt * (0.1 + 0.16 * Math.min(1, L) + 0.22 * blaze)) % 1;
  const f = Math.floor(n._ph * heart.n) % heart.n, [hw, hh] = heart.size, [hax, hay] = heart.anchor;
  const bob = Math.sin(t * 1.7) * 2.2 - b * 1.2, HX = x - hax * k, HY = y - hay * k + bob;
  const d = heart.dim[f], l = heart.lit[f], lit = clamp(L * 0.62 + blaze * 0.38, 0, 1);
  ctx.drawImage(img, d[0], d[1], hw, hh, HX, HY, hw * k, hh * k);
  if (lit > 0.01) { ctx.globalAlpha = lit; ctx.drawImage(img, l[0], l[1], hw, hh, HX, HY, hw * k, hh * k); }
  // light: the heart's glow, candle flames, the skull's eyes
  ctx.globalCompositeOperation = 'lighter';
  const [hx, hy] = fx.heart;
  if (L > 0.05) {
    const g = (0.12 + 0.1 * breath) * Math.min(1, L) + 0.3 * b, R = 26 + 8 * blaze + 6 * b;
    ctx.globalAlpha = clamp(g, 0, 1); ctx.drawImage(glowSprite('#ff2a14'), x + hx - R, y + hy + bob - R, R * 2, R * 2);
    ctx.globalAlpha = clamp(g * 0.9, 0, 1); ctx.drawImage(glowSprite('#ffb070'), x + hx - 7, y + hy + bob - 9, 14, 18);
    const fa = Math.min(1, L);
    for (let i = 0; i < fx.flames.length; i++) {
      const [fx0, fy0] = fx.flames[i], fl = 0.55 + 0.3 * Math.sin(t * 13 + i * 2.1) + 0.15 * Math.sin(t * 29 + i * 5.3);
      ctx.globalAlpha = fa * fl * 0.55; ctx.drawImage(glowSprite('#ffa040'), x + fx0 - 5, y + fy0 - 7, 10, 12);
    }
    if (blaze > 0.02) for (const [ex, ey] of fx.eyes) {
      ctx.globalAlpha = blaze * (0.5 + 0.5 * b); ctx.drawImage(glowSprite('#ff2010'), x + ex - 9, y + ey - 6, 18, 12);
    }
  }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  if (n._fx !== G.frame) { // once a frame (the see-through pass draws NPCs again)
    n._fx = G.frame;
    if (L > 0.05) addLight(n.x, n.y, 2.6 + 1.4 * blaze, 0.3 + 0.2 * Math.min(1, L) + 0.15 * blaze + 0.15 * b, 60, '#ff3020');
    // fire off the horn tips and embers off the dais while Heresies are on
    if (blaze > 0.02 && dt > 0) {
      n._fire = (n._fire || 0) + dt * (10 + 14 * blaze);
      for (; n._fire >= 1; n._fire--) {
        const [tx, ty] = fx.tips[(Math.random() * fx.tips.length) | 0], o = (Math.random() - 0.5) * 2;
        spawn({ type: 'flame', x: n.x + (tx + o) / 64, y: n.y - (tx + o) / 64, z: -ty, vz: 18 + Math.random() * 16, life: 0.35 + Math.random() * 0.3, size: 1.6 + blaze * 1.2, size1: 0.4, add: true });
      }
      n._emb = (n._emb || 0) + dt * 5 * blaze;
      for (; n._emb >= 1; n._emb--) {
        const a = Math.random() * Math.PI * 2, r = 0.3 + Math.random() * 0.55;
        spawn({ type: 'glow', x: n.x + Math.cos(a) * r, y: n.y + Math.sin(a) * r, z: 2 + Math.random() * 10, vx: (Math.random() - 0.5) * 0.15, vy: (Math.random() - 0.5) * 0.15, vz: 14 + Math.random() * 18, drag: 0.5, life: 0.9 + Math.random() * 0.9, size: 0.8 + Math.random() * 0.8, size1: 0.2, color: Math.random() < 0.5 ? '#ff5020' : '#ffb060', add: true });
      }
    }
  }
  n.sbox = [X + bw * k * 0.1, Y + bh * k * 0.05, X + bw * k * 0.9, Y + bh * k];
  return true;
}
