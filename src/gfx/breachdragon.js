// The Ethereal Wyrm of the Eternal Breach (game/breachdragon.js moves it): a long wingless parade dragon. Its body
// segment and tail tip are three.js models baked at 24 headings (tools/breachdragon3d.html -> assets/sprites/
// breach_dragon/body.webp) in three layers that are tinted here once per colour variant: scales x body colour, accent
// (belly, spines, fins) x accent colour, glow added in the glow colour, plus a blurred aura of the silhouette. Its
// heads and claws are cut from the set 2 dragon sprites (parts.webp). Each frame the segments, head, claws and tail are
// drawn back to front by depth, over additive glows, with glowing whiskers trailing from the mouth.
// Drawn in one of two passes: 'void' (deep under the islands, before the floors, faint) or 'top' (over everything).
import { G } from '../state.js';
import { HW, HH } from '../core/view.js';
import { makeCanvas, clamp, TAU } from '../core/util.js';
import { glowSprite } from './vfx.js';

const DIR = 'assets/sprites/breach_dragon/';
/** World px along a tile edge (the iso ground scale): a segment's px size over this is its size in tiles. */
export const WYRM_TILE = HW * Math.SQRT2;
let meta = null, body = null, parts = null, loading = null;
const img = (src) => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; });
/** Start loading the sheets (the Breach floor does this on build). */
export function preloadWyrm() {
  return loading || (loading = Promise.all([fetch(DIR + 'dragon.json').then((r) => r.json()), img(DIR + 'body.webp'), img(DIR + 'parts.webp')])
    .then(([m, b, p]) => { meta = m; body = b; parts = p; }).catch(() => { loading = null; }));
}
export const wyrmReady = () => !!meta;
/** The baked segment radius at scale 1 (px). */
export const wyrmR = () => (meta ? meta.R : 16);
/** A head's mouth offset from its neck in head-size units (for the breath's origin), and whether the head exists. */
export const wyrmHead = (id) => meta?.heads[id] || null;

const TINT = new Map();
/** The variant's sheet: per model (seg, tail) a tinted row and its aura row. */
function tinted(v) {
  let out = TINT.get(v.id);
  if (out) return out;
  out = {};
  const S = meta.S, W = body.width;
  for (const k of ['seg', 'tail']) {
    const M = meta[k], h = Math.round(M.h * S), y0 = Math.round(M.y * S);
    const c = makeCanvas(W, h), g = c.getContext('2d');
    g.drawImage(body, 0, y0, W, h, 0, 0, W, h);
    g.globalCompositeOperation = 'multiply'; g.fillStyle = v.body; g.fillRect(0, 0, W, h);
    for (const [r, col] of [[1, v.accent], [2, v.glow]]) {
      const t = makeCanvas(W, h), tg = t.getContext('2d');
      tg.drawImage(body, 0, y0 + r * h, W, h, 0, 0, W, h);
      tg.globalCompositeOperation = 'multiply'; tg.fillStyle = col; tg.fillRect(0, 0, W, h);
      tg.globalCompositeOperation = 'destination-in'; tg.drawImage(body, 0, y0 + r * h, W, h, 0, 0, W, h);
      g.globalCompositeOperation = 'lighter'; g.drawImage(t, 0, 0);
    }
    g.globalCompositeOperation = 'destination-in'; g.drawImage(body, 0, y0, W, h, 0, 0, W, h);
    // the aura: the silhouette in the glow colour, blurred, each cell in its own padded box
    const sil = makeCanvas(W, h), sg = sil.getContext('2d');
    sg.drawImage(body, 0, y0, W, h, 0, 0, W, h);
    sg.globalCompositeOperation = 'source-in'; sg.fillStyle = v.glow; sg.fillRect(0, 0, W, h);
    const cw = Math.round(M.cw * S), P = 8 * S, a = makeCanvas(meta.dirs * (cw + 2 * P), h + 2 * P), ag = a.getContext('2d');
    ag.filter = `blur(${3 * S}px)`;
    for (let i = 0; i < meta.dirs; i++) ag.drawImage(sil, i * cw, 0, cw, h, i * (cw + 2 * P) + P, P, cw, h);
    out[k] = { c, aura: a, cw, h, P, M };
  }
  TINT.set(v.id, out);
  return out;
}

const frameOf = (ang) => ((Math.round((ang / TAU) * meta.dirs) % meta.dirs) + meta.dirs) % meta.dirs;
const sx = (x, y) => (x - y) * HW;
const sy = (x, y, alt) => (x + y) * HH - alt;
const items = [];

/**
 * Draw wyrm `w` if it belongs to this pass. w: { layer, variant, head, claw, scale, alpha, segs: [{x, y, alt, ang, s,
 * g (ground px under it, or null)}] (head first; the last is the tail), x, y, alt, ang (the head), claws: [{i, side}],
 * dissolve (0..1, from the tail), flash }.
 */
export function drawWyrm(ctx, w, pass) {
  if (!w || w.layer !== pass || !w.segs?.length || w.gone) return;
  if (!meta) { preloadWyrm(); return; }
  const v = w.variant, T = tinted(v), S = meta.S, n = w.segs.length, t = G.time;
  const shown = Math.max(0, Math.ceil(n * (1 - (w.dissolve || 0))));
  if (!shown) return;
  const A = clamp(w.alpha ?? 1, 0, 1);
  ctx.save();
  // ---- shadows on the islands under it (only when low over the ground)
  if (pass === 'top') {
    ctx.fillStyle = '#0a0410';
    for (let i = 0; i < shown; i += 2) {
      const s = w.segs[i];
      if (s.g == null) continue;
      const lift = s.alt - s.g;
      if (lift > 260 || lift < -10) continue;
      const r = meta.R * w.scale * s.s * (1.1 - lift / 520);
      ctx.globalAlpha = A * 0.28 * (1 - lift / 280);
      ctx.beginPath(); ctx.ellipse(sx(s.x, s.y), sy(s.x, s.y, s.g), r, r * 0.5, 0, 0, TAU); ctx.fill();
    }
  }
  // ---- auras and glows (additive)
  ctx.globalCompositeOperation = 'lighter';
  const pulse = 0.75 + 0.25 * Math.sin(t * 3.1) + (w.flash > 0 ? 0.6 : 0) + (w.rage || 0) * 0.35;
  const gs = glowSprite(v.glow);
  for (let i = 0; i < shown; i++) {
    const s = w.segs[i], k = w.scale * s.s, R = T[i === n - 1 ? 'tail' : 'seg'], M = R.M, f = frameOf(s.ang);
    const px = sx(s.x, s.y), py = sy(s.x, s.y, s.alt);
    ctx.globalAlpha = A * 0.26 * pulse;
    ctx.drawImage(R.aura, f * (R.cw + 2 * R.P), 0, R.cw + 2 * R.P, R.h + 2 * R.P, px - M.ax * k - R.P / S * k, py - M.ay * k - R.P / S * k, (R.cw / S + 2 * R.P / S) * k, (M.h + 2 * R.P / S) * k);
    if (i % 3 === 0) { const r = meta.R * k * 2.6; ctx.globalAlpha = A * 0.09 * pulse; ctx.drawImage(gs, px - r, py - r, r * 2, r * 2); }
  }
  // ---- the body, head and claws back to front
  ctx.globalCompositeOperation = 'source-over';
  items.length = 0;
  for (let i = 0; i < shown; i++) items.push({ d: w.segs[i].x + w.segs[i].y, kind: i === n - 1 ? 'tail' : 'seg', i });
  if (shown === n || (w.dissolve || 0) < 0.98) {
    if (shown > n * 0.9 || !w.dissolve) items.push({ d: w.x + w.y + 0.05, kind: 'head' });
  }
  items.sort((a, b) => a.d - b.d);
  ctx.globalAlpha = A;
  // the legs on the far side behind the whole body, the near ones in front of it
  const legs = (w.claws || []).filter((c) => c.i < shown);
  for (const c of legs) if (farLeg(w, c)) drawClaw(ctx, w, c, A);
  for (const it of items) {
    if (it.kind === 'head') drawHead(ctx, w, A);
    else {
      const s = w.segs[it.i], k = w.scale * s.s, R = T[it.kind], M = R.M, f = frameOf(s.ang);
      ctx.drawImage(R.c, f * R.cw, 0, Math.round(M.w * S), R.h, sx(s.x, s.y) - M.ax * k, sy(s.x, s.y, s.alt) - M.ay * k, M.w * k, M.h * k);
    }
  }
  for (const c of legs) if (!farLeg(w, c)) drawClaw(ctx, w, c, A);
  // ---- whiskers and the head's burning eyes (additive)
  ctx.globalCompositeOperation = 'lighter';
  if (w.mouth && shown > n * 0.9) {
    const [mx, my, dx, dy] = w.mouth, L = meta.R * w.scale * 3.2;
    ctx.strokeStyle = v.glow; ctx.lineWidth = Math.max(1.2, w.scale * 1.3); ctx.lineCap = 'round';
    for (const side of [1, -1]) {
      ctx.globalAlpha = A * 0.75;
      const wave = Math.sin(t * 4 + side) * L * 0.25;
      ctx.beginPath(); ctx.moveTo(mx, my);
      ctx.bezierCurveTo(mx - dx * L * 0.35 - dy * side * L * 0.3, my - dy * L * 0.35 + dx * side * L * 0.3 + wave * 0.5,
        mx - dx * L * 0.7 + dy * side * L * 0.1, my - dy * L * 0.7 - dx * side * L * 0.1 + wave,
        mx - dx * L - dy * side * L * 0.25, my - dy * L + dx * side * L * 0.25 - wave * 0.6);
      ctx.stroke();
    }
    const r = meta.R * w.scale * 1.1;
    ctx.globalAlpha = A * 0.3 * pulse; ctx.drawImage(gs, mx - r, my - r, r * 2, r * 2);
  }
  if (w.charge > 0 && w.mouth) {
    const r = meta.R * w.scale * (0.8 + w.charge * 2.2), [mx, my] = w.mouth;
    ctx.globalAlpha = Math.min(1, w.charge) * A; ctx.drawImage(gs, mx - r, my - r, r * 2, r * 2); ctx.drawImage(glowSprite('#ffffff'), mx - r * 0.4, my - r * 0.4, r * 0.8, r * 0.8);
  }
  ctx.restore();
}

function drawHead(ctx, w, A) {
  const H = meta.heads[w.head] || Object.values(meta.heads)[0], s1 = w.segs[Math.min(1, w.segs.length - 1)];
  const hx = sx(w.x, w.y), hy = sy(w.x, w.y, w.alt), bx = sx(s1.x, s1.y), by = sy(s1.x, s1.y, s1.alt);
  let dx = hx - bx, dy = hy - by;
  const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
  const flip = dx < -0.05 || (Math.abs(dx) <= 0.05 && w.flipHead);
  w.flipHead = flip;
  const [nx, ny] = H.neck, [mx0, my0] = H.mouth, nm = Math.hypot(mx0 - nx, my0 - ny) || 1;
  // the head lies along the body: its eye-to-snout line on the heading, its neck point on the body's axis, about one
  // and a half body widths from the back of the skull to the snout
  const hs = (meta.R * w.scale * 2.4) / nm, spriteAng = Math.atan2(my0 - ny, mx0 - nx);
  const a = clamp(Math.atan2(dy, Math.abs(dx)), -1.1, 1.1) - spriteAng + (w.bite || 0) * 0.25;
  ctx.save();
  ctx.translate(hx, hy); if (flip) ctx.scale(-1, 1); ctx.rotate(a);
  ctx.globalAlpha = A;
  ctx.drawImage(parts, H.x, H.y, H.w, H.h, -nx * hs, -ny * hs, H.w * hs, H.h * hs);
  if (w.flash > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = A * Math.min(1, w.flash * 4) * 0.5; ctx.drawImage(parts, H.x, H.y, H.w, H.h, -nx * hs, -ny * hs, H.w * hs, H.h * hs); }
  ctx.restore();
  // the mouth on screen and the way the head points (whiskers, breath)
  const c = Math.cos(a), s = Math.sin(a), mx = (mx0 - nx) * hs, my = (my0 - ny) * hs;
  const rx = (mx * c - my * s) * (flip ? -1 : 1), ry = mx * s + my * c;
  w.mouth = [hx + rx, hy + ry, flip ? -Math.cos(a) : Math.cos(a), Math.sin(a)];
}

/** Is this leg on the body's side away from the camera (its offset goes up the screen)? */
const farLeg = (w, c) => { const a = w.segs[c.i].ang; return (Math.cos(a) - Math.sin(a)) * c.side < 0; };

function drawClaw(ctx, w, c, A) {
  // a Chinese dragon's leg: hung from the shoulder at the body's side, a little below its middle, paddling forward
  // and back as it swims; the far-side pair a touch smaller (and so further off)
  const C = meta.claws[w.claw] || Object.values(meta.claws)[0], s = w.segs[c.i], k = w.scale * s.s;
  const R = meta.R * k / WYRM_TILE, px = s.x + Math.sin(s.ang) * -c.side * R * 0.7, py = s.y + Math.cos(s.ang) * c.side * R * 0.7;
  const far = farLeg(w, c);
  const X = sx(px, py), Y = sy(px, py, s.alt - meta.R * k * 0.25);
  const h = meta.R * k * (far ? 2.1 : 2.5), sc = h / C.h, flip = Math.cos(s.ang) - Math.sin(s.ang) < 0;   // screen dx of the heading
  const [tx, ty] = C.top || [C.w * 0.3, 0];
  const swing = 0.2 + Math.sin(G.time * 4.2 + c.i * 0.55 + (c.side > 0 ? 0 : Math.PI)) * 0.5 + (w.bite || 0) * 0.3;
  ctx.save(); ctx.translate(X, Y); if (flip) ctx.scale(-1, 1); ctx.rotate(-swing);
  // the claws glow in the wyrm's colour; the leg takes a faint sheen of it
  const [fx, fy] = C.foot || [C.w * 0.6, C.h * 0.85], r = h * 0.55;
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = A * (far ? 0.25 : 0.4);
  ctx.drawImage(glowSprite(w.variant.glow), (fx - tx) * sc - r, (fy - ty) * sc - r, r * 2, r * 2);
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = A;
  ctx.drawImage(parts, C.x, C.y, C.w, C.h, -tx * sc, -ty * sc, C.w * sc, h);
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = A * 0.22;
  ctx.drawImage(parts, C.x, C.y, C.w, C.h, -tx * sc, -ty * sc, C.w * sc, h);
  ctx.restore();
}
