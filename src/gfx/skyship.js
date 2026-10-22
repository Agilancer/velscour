// The Sky Battle's drawing (docs/SKY_BATTLE.md), around the ship's baked pieces (gfx/terrain.js draws those):
//   skyBack   screen space, first: the sky gradient, sun / moon / stars / the fire below, two layers of pixel clouds
//             drifting astern (the ship flies toward the upper right, so the world streams down-left)
//   skyWorld  world space, before the ship: the pirates' galleon and boats (all to port, behind the deck), the crews
//             standing on them, the ironclad's engine props
//   skyFx     world space, after everyone: furnace glow and steam, braziers, lift crystals, hooks and chains, cannon
//             shot in flight, lightning bolts
//   skyFront  screen space, last: rain, snow, ash, wind streaks, cloud wisps, fog, lightning flashes
//   drawSkyGate  the arrival portal swirling in the bridge's great door (a world portal of type 'skygate')
// The director (game/skybattle.js) owns world.sky: { v (the variant), boats, galleon, hooks, shots, bolts, flash, gate }.
import { G } from '../state.js';
import { camera, HW, HH } from '../core/view.js';
import { makeCanvas, clamp } from '../core/util.js';
import { glowSprite } from './vfx.js';
import { castle3dState } from './castle3dart.js';
import { enemyImage } from '../core/enemyart.js';
import { drawRuneblade3D } from './runeblade3d.js';
import { Cine } from '../game/cinema.js';
import { isoX, isoY } from '../core/view.js';
import { OX, OY, LV, FC_H } from '../world/skyship.js';

const HS = 4, TAU = Math.PI * 2;
// the world streams astern: ship +y (tile) on screen is (-32, +16)
const DIR = [-0.894, 0.447];
const hash = (a, b) => { let h = Math.imul(a ^ 0x2c1b3c6d, 0x297a2d39) ^ Math.imul(b ^ 0x51ed27, 0x1b873593); h = Math.imul(h ^ (h >>> 15), 0x85ebca6b); return ((h ^ (h >>> 13)) >>> 0) / 4294967296; };
/** Ship (x, y, z) in ship units to world px. */
export const shipPx = (x, y, z) => [((OX + x) - (OY + z)) * HW, ((OX + x) + (OY + z)) * HH - y * LV * HS];
/** Tile (x, y) at `lv` levels to world px. */
export const tilePx = (x, y, lv = 0) => [(x - y) * HW, (x + y) * HH - lv * HS];

// ------------------------------------------------------------------ clouds
/** A pixel cloud: lit puffs from the upper left, three tones plus a highlight, hard edges. */
function cloudSprite(w, h, tones, seed) {
  // painted and hard-edged on a CPU canvas (its getImageData stalls on nothing), then copied to the canvas it is drawn from
  const cpu = makeCanvas(w, h), x = cpu.getContext('2d', { willReadFrequently: true }), puffs = [], n = Math.round(w / 9) + 3;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1), r = h * (0.22 + 0.2 * Math.sin(Math.PI * t)) * (0.8 + 0.35 * hash(seed, i));
    puffs.push([w * (0.12 + 0.76 * t) + (hash(seed, i + 50) - 0.5) * 6, h - r - 1 - hash(seed, i + 90) * h * 0.12, r]);
  }
  const pass = (col, dx, dy, k, op) => {
    x.globalCompositeOperation = op; x.fillStyle = col;
    for (const [px, py, r] of puffs) { x.beginPath(); x.arc(Math.round(px + dx * r), Math.round(py + dy * r), Math.max(1, r * k), 0, TAU); x.fill(); }
  };
  pass(tones[0], 0, 0, 1, 'source-over');
  pass(tones[1], -0.12, -0.16, 0.86, 'source-atop');
  pass(tones[2], -0.25, -0.3, 0.6, 'source-atop');
  pass(tones[3], -0.38, -0.42, 0.28, 'source-atop');
  const d = x.getImageData(0, 0, w, h);
  for (let i = 3; i < d.data.length; i += 4) d.data[i] = d.data[i] > 100 ? 255 : 0;
  x.putImageData(d, 0, 0);
  const c = makeCanvas(w, h);
  c.getContext('2d').drawImage(cpu, 0, 0);
  return c;
}
/** Build a Sky Battle world's clouds (and the director's own art: the knights' sheets) now (game.js warmLevelArt: behind
 *  the loading screen, not on the first frame). */
export function warmSky(world) { if (world.sky) { skyArt(world.sky.v); if (world.sky.warm) world.sky.warm(); } }
/** The sky's clouds and gradient for a variant (built once per variant). */
function skyArt(v) {
  if (v._art) return v._art;
  const layer = (tones, n, w0, w1, h0, h1, speed, alpha, par, seed) => ({ speed, alpha, par,
    items: Array.from({ length: n }, (_, i) => ({ img: cloudSprite(Math.round(w0 + hash(seed, i) * (w1 - w0)), Math.round(h0 + hash(seed, i + 7) * (h1 - h0)), tones, seed * 100 + i), u: hash(seed, i + 13), v: hash(seed, i + 29) })) });
  v._art = {
    far: layer(v.far, 30, 40, 90, 16, 30, 9, v.fog ? 0.6 : 0.85, 0.05, 3),
    mid: layer(v.mid, 14, 50, 120, 20, 40, 22, v.fog ? 0.75 : 1, 0.12, 5),
    wisps: Array.from({ length: v.fog ? 7 : 3 }, (_, i) => ({ img: cloudSprite(90 + (i * 37) % 70, 30 + (i * 13) % 20, v.mid, 900 + i), u: hash(77, i), v: hash(78, i) })),
    // the bank the flagship comes out of, and the cloud the arrival's camera comes down through
    bank: Array.from({ length: 6 }, (_, i) => cloudSprite(110 + (i * 29) % 70, 34 + (i * 11) % 18, v.mid, 700 + i)),
  };
  return v._art;
}

// ------------------------------------------------------------------ screen space, first
let gradKey = '', gradCanvas = null, low = null;
export function skyBack(ctx, W, H, world) {
  const S = world.sky, v = S.v, t = G.time;
  const key = W + 'x' + H + v.id;
  if (key !== gradKey) {
    gradKey = key; gradCanvas = makeCanvas(W, H);
    const g = gradCanvas.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, v.sky[0]); gr.addColorStop(0.55, v.sky[1]); gr.addColorStop(1, v.sky[2]);
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    if (v.glow) { const r = g.createLinearGradient(0, H * 0.55, 0, H); r.addColorStop(0, 'rgba(255,90,26,0)'); r.addColorStop(1, 'rgba(255,90,26,0.55)'); g.fillStyle = r; g.fillRect(0, 0, W, H); }
    if (v.stars) for (let i = 0; i < 260; i++) {
      const x = hash(i, 1) * W, y = hash(i, 2) * H * 0.85, b = hash(i, 3);
      g.fillStyle = `rgba(230,236,255,${0.25 + b * 0.7})`; g.fillRect(Math.round(x), Math.round(y), b > 0.9 ? 2 : 1, b > 0.9 ? 2 : 1);
    }
  }
  ctx.drawImage(gradCanvas, 0, 0);
  if (v.stars) { ctx.globalAlpha = 0.9; ctx.drawImage(glowSprite('#dfe8ff'), W * 0.78, H * 0.08, H * 0.16, H * 0.16); ctx.fillStyle = '#eef2ff'; ctx.beginPath(); ctx.arc(W * 0.78 + H * 0.08, H * 0.16, H * 0.035, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
  if (v.sunset) { ctx.globalAlpha = 0.85; ctx.drawImage(glowSprite('#ffd27a'), W * 0.06, H * 0.42, H * 0.5, H * 0.5); ctx.fillStyle = '#ffe2a0'; ctx.beginPath(); ctx.arc(W * 0.06 + H * 0.25, H * 0.67, H * 0.07, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
  // clouds at a third of the resolution, scaled up hard-edged: pixel art like the ship
  const lw = Math.ceil(W / 3), lh = Math.ceil(H / 3);
  if (!low || low.width !== lw || low.height !== lh) low = makeCanvas(lw, lh);
  const lc = low.getContext('2d'), A = skyArt(v), wind = v.wind * (S.windK ?? 1);
  lc.clearRect(0, 0, lw, lh);
  const cx = camera.x * camera.zoom * G.dpr / 3, cy = camera.y * camera.zoom * G.dpr / 3;
  for (const L of [A.far, A.mid]) {
    lc.globalAlpha = L.alpha;
    const pw = lw + 240, ph = lh + 120;
    for (const c of L.items) {
      const u = (((c.u + DIR[0] * L.speed * wind * t / pw - cx * L.par / pw) % 1) + 1) % 1, w = (((c.v + DIR[1] * L.speed * wind * t / ph - cy * L.par / ph) % 1) + 1) % 1;
      lc.drawImage(c.img, Math.round(u * pw - 120), Math.round(w * ph - 60));
    }
  }
  lc.globalAlpha = 1;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(low, 0, 0, lw * 3, lh * 3);
  ctx.imageSmoothingEnabled = true;
}

// ------------------------------------------------------------------ world space, before the ship
function sprite(name, frame, ax, ay, alpha = 1) {
  const st = castle3dState(), sp = st && st.sprites && st.sprites[name];
  if (!sp) return;
  const f = sp.f[frame % sp.f.length], k = 1 / sp.S;
  if (alpha < 1) ctx_alpha(alpha);
  CTX.drawImage(st.imgs[f[0]], f[1], f[2], f[3], f[4], ax + f[5], ay + f[6], f[3] * k, f[4] * k);
  if (alpha < 1) CTX.globalAlpha = 1;
}
let CTX = null;
/** A baked prop sprite (hook, chain link, cannonball) centred at (x, y), turned `rot`, at `k` times its baked size. */
function prop(ctx, name, frame, x, y, rot = 0, k = 1) {
  const st = castle3dState(), sp = st && st.sprites && st.sprites[name];
  if (!sp) return false;
  const f = sp.f[frame % sp.f.length], w = f[3] / sp.S * k, h = f[4] / sp.S * k;
  if (!rot) { ctx.drawImage(st.imgs[f[0]], f[1], f[2], f[3], f[4], x - w / 2, y - h / 2, w, h); return true; }
  // turned: the base transform times translate + rotate, set once (no save/restore: chains are hundreds of links)
  const B = baseT || ctx.getTransform(), c = Math.cos(rot), sn = Math.sin(rot);
  ctx.setTransform(B.a * c + B.c * sn, B.b * c + B.d * sn, B.c * c - B.a * sn, B.d * c - B.b * sn, B.a * x + B.c * y + B.e, B.b * x + B.d * y + B.f);
  ctx.drawImage(st.imgs[f[0]], f[1], f[2], f[3], f[4], -w / 2, -h / 2, w, h);
  ctx.setTransform(B);
  return true;
}
let baseT = null;   // skyFx's world transform while it draws turned props
const ctx_alpha = (a) => { CTX.globalAlpha = a; };
/** A painted pirate standing at world px (x, y), feet there, h px tall, flipped to face the ironclad. */
function crewman(art, x, y, h, flip, bob) {
  const img = enemyImage(art, null);
  if (!img) return;
  const w = h * img.width / img.height, fx = (img._art && img._art.fx != null ? img._art.fx : img.width / 2) / img.width;
  if (!flip) { CTX.drawImage(img, x - w * fx, y - bob - h, w, h); return; }
  CTX.save(); CTX.translate(x, y - bob); CTX.scale(-1, 1);
  CTX.drawImage(img, -w * fx, -h, w, h); CTX.restore();
}
export function skyWorld(ctx, world) {
  const S = world.sky; if (!S) return;
  CTX = ctx;
  const fr = Math.floor(G.time * 12), t = G.time;
  const items = [];
  if (S.bank) cloudBank(ctx, S.bank, S.v, false);
  if (S.galleon && S.galleon.alpha > 0) items.push(S.galleon);
  for (const b of S.boats) if (b.alpha > 0) items.push(b);
  items.sort((a, b) => a.x + a.y - (b.x + b.y));
  for (const o of items) {
    const [ax, ay] = tilePx(o.x, o.y, o.lv);
    const name = o.galleon ? 'galleon' : `skiff_${o.kind}_${o.ramp > 0.5 ? 'down' : 'up'}`;
    sprite(name, fr + (o.phase || 0), ax, ay, o.alpha);
    // the crew waiting at the rail
    for (const c of o.crew || []) {
      const [cx, cy] = tilePx(o.x + c.x, o.y + c.z, o.lv + (c.y || 0) * LV);
      crewman(c.art, cx, cy, c.h, c.flip, Math.abs(Math.sin(t * 6 + c.ph)) * 2);
    }
    if (o.flag) whiteFlag(ctx, ...tilePx(o.x, o.y - 5, o.lv), t);
    if (o.burn) for (let i = 0; i < o.burn.length; i++) {   // fires on a hit hull
      const [bx, by] = tilePx(o.x + o.burn[i][0], o.y + o.burn[i][2], o.lv + o.burn[i][1] * LV), k = 0.7 + 0.3 * Math.sin(t * 13 + i * 3);
      ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(glowSprite('#ff7020'), bx - 30 * k, by - 40 * k, 60 * k, 60 * k); ctx.globalCompositeOperation = 'source-over';
    }
  }
  if (S.bank) cloudBank(ctx, S.bank, S.v, true);
  // the ironclad's two engine props, turning behind and beside the hull
  const st = castle3dState();
  if (st && st.sprites) for (let i = 0; i < 2; i++) sprite('ship_prop_' + i, Math.floor(t * 20), 0, 0);
}
// the flagship's cloud bank: puffs round her middle [dx, dy, scale] (world px), behind her and in front; the front ones
// part and blow astern as she pushes out, the ones behind thin slowly
const BANK_BACK = [[-430, -70, 3.2], [380, -130, 3], [-10, -270, 3.4], [-220, 150, 2.8], [270, 170, 3]];
const BANK_FRONT = [[-520, 70, 2.6], [-250, -20, 3.4], [110, 50, 3.6], [430, 0, 3], [-70, 230, 3.2], [210, -250, 2.8]];
function cloudBank(ctx, B, v, front) {
  const A = skyArt(v), t = B.t, [cx, cy] = tilePx(B.x, B.y, B.lv);
  const a = front ? clamp(1 - Math.max(0, t - 0.5) / 2.2, 0, 1) : clamp(1 - Math.max(0, t - 2) / 5, 0, 1);
  if (a <= 0) return;
  const spread = front ? 1 + t * 0.45 : 1 + t * 0.06, drift = (front ? 46 : 14) * t;
  ctx.imageSmoothingEnabled = false;
  (front ? BANK_FRONT : BANK_BACK).forEach(([dx, dy, k], i) => {
    const img = A.bank[(i + (front ? 3 : 0)) % A.bank.length], w = img.width * k, h = img.height * k;
    ctx.globalAlpha = a * (front ? 0.95 : 0.85);
    ctx.drawImage(img, cx - 16 + dx * spread + DIR[0] * drift - w / 2, cy - 105 + dy * spread + DIR[1] * drift - h / 2, w, h);
  });
  ctx.imageSmoothingEnabled = true; ctx.globalAlpha = 1;
}
/** A white flag of truce on a pole at (x, y) (world px, the pole's foot), streaming astern: 2 px columns of cloth,
 *  16 frames of its wave baked once. */
let flagFrames = null;
const FLAG = { H: 62, w: 30, h: 18, cw: 36, ch: 74 };
function whiteFlag(ctx, x, y, t) {
  const { H, w, h, cw, ch } = FLAG;
  if (!flagFrames) {
    flagFrames = makeCanvas(cw * 16, ch);
    const g = flagFrames.getContext('2d');
    for (let fr = 0; fr < 16; fr++) {
      const ox = fr * cw + cw - 4, ph = fr / 16 * TAU;   // the pole near the right edge, the cloth streaming left
      g.fillStyle = '#3e2c1c'; g.fillRect(ox - 1, ch - H, 3, H);
      g.fillStyle = '#c8b070'; g.fillRect(ox - 2, ch - H - 3, 5, 4);
      for (let px = 0; px < w; px += 2) {
        const u = px / w, wave = Math.sin(ph - px * 0.2) * 3 * u, slope = Math.cos(ph - px * 0.2);
        g.fillStyle = slope > 0.4 ? '#fbf8ef' : slope > -0.4 ? '#e4dfd2' : '#bdb6a6';
        g.fillRect(ox - 2 - px, Math.round(ch - H + 2 + px * 0.28 + wave), 2, Math.round(h * (1 - u * 0.25)));
      }
    }
  }
  const fr = Math.floor(((t * 7) / TAU) * 16) % 16;
  ctx.drawImage(flagFrames, fr * cw, 0, cw, ch, Math.round(x) - cw + 4, Math.round(y) - ch, cw, ch);
}

// ------------------------------------------------------------------ world space, after everyone
function glow(ctx, x, y, r, col, a = 1) { ctx.globalAlpha = a; ctx.drawImage(glowSprite(col), x - r, y - r, r * 2, r * 2); }
export function skyFx(ctx, world) {
  const S = world.sky; if (!S) return;
  const st = castle3dState(), A = st && st.anchors && st.anchors.ship, t = G.time;
  ctx.globalCompositeOperation = 'lighter';
  if (A) {
    for (const [x, y, z, r] of A.furnaces) {   // forge mouths and their exhaust
      const [px, py] = shipPx(x, y, z), k = 0.85 + 0.15 * Math.sin(t * 17 + x);
      glow(ctx, px, py, 34 * r * k, '#ff7a2a', 0.85);
      for (let j = 1; j <= 4; j++) { const [qx, qy] = shipPx(x, y, z + j * 0.9 * k); glow(ctx, qx, qy, (26 - j * 4) * r, '#ff5010', 0.5 - j * 0.1); }
    }
    for (const [x, y, z] of A.braziers) { const [px, py] = shipPx(x, y + 0.35, z), k = 0.8 + 0.2 * Math.sin(t * 19 + x * 3); glow(ctx, px, py - 6 * k, 22 * k, '#ff8a30', 0.9); glow(ctx, px, py - 10, 9, '#fff0b0', 0.8); }
    for (const [x, y, z] of A.crystals) { const [px, py] = shipPx(x, y, z); glow(ctx, px, py, 46 + 6 * Math.sin(t * 2.2 + z), '#a040ff', 0.55); }
    for (const [x, y, z] of A.lamps) { const [px, py] = shipPx(x, y, z); glow(ctx, px, py, 14, '#ffa040', world.night ? 0.8 : 0.4); }
    // the rune ring on the landing, turning, brighter as the gate flares
    const g = A.gate, gc = S.gateColor || '#ff5020', fl = S.gateFlash || 0;
    ctx.strokeStyle = gc; ctx.lineWidth = 2;
    const [rx, ry] = shipPx(0, FC_H, g.z + 0.8);
    ctx.globalAlpha = 0.5 + fl * 0.4;
    for (let i = 0; i < 14; i++) {
      const a = t * 0.8 + i * TAU / 14, a1 = a + 0.25, R = (0.6 + fl * 0.4) * Math.SQRT2;
      ctx.beginPath(); ctx.moveTo(rx + Math.cos(a) * R * HW, ry + Math.sin(a) * R * HH); ctx.lineTo(rx + Math.cos(a1) * R * HW, ry + Math.sin(a1) * R * HH); ctx.stroke();
    }
    glow(ctx, rx, ry - 30, 60 + fl * 60, gc, 0.35 + fl * 0.5);
  }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  baseT = ctx.getTransform();
  // grappling chains: baked iron links along a sagging curve from the thrower's rail, the baked hook at the head
  for (const h of S.hooks) {
    const k = clamp(h.t, 0, 1), [ax, ay] = tilePx(...h.from), [bx, by] = tilePx(...h.to);
    const ex = ax + (bx - ax) * k, ey = ay + (by - ay) * k - Math.sin(Math.PI * k) * 120 * (1 - (h.taut || 0));
    const sag = k >= 1 ? 26 * (1 - (h.taut || 0)) : 0, cx = (ax + ex) / 2, cy = (ay + ey) / 2 + sag;
    const L = Math.hypot(ex - ax, ey - ay) + sag, n = Math.max(2, Math.floor(L / 7));
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5) / n, x = (1 - u) ** 2 * ax + 2 * (1 - u) * u * cx + u * u * ex, y = (1 - u) ** 2 * ay + 2 * (1 - u) * u * cy + u * u * ey;
      const tx = 2 * (1 - u) * (cx - ax) + 2 * u * (ex - cx), ty = 2 * (1 - u) * (cy - ay) + 2 * u * (ey - cy);
      prop(ctx, 'sky_link', i, x, y, Math.atan2(ty, tx) + Math.PI / 2, 0.55);
    }
    const ang = Math.atan2(ey - cy, ex - cx) + Math.PI / 2;
    prop(ctx, 'sky_hook', 0, ex, ey, ang + Math.PI, 0.45);
  }
  // cannon shot in flight: the baked iron ball, a hot glow behind it
  for (const s of S.shots) {
    const k = clamp(s.t / s.dur, 0, 1), [ax, ay] = tilePx(...s.from), [bx, by] = tilePx(...s.to);
    const x = ax + (bx - ax) * k, y = ay + (by - ay) * k - Math.sin(Math.PI * k) * s.arc;
    ctx.globalCompositeOperation = 'lighter'; glow(ctx, x, y, 11, '#ff9a40', 0.5); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    prop(ctx, 'sky_ball', 0, x, y, 0, 0.75);
  }
  baseT = null;
  // ropes: from their anchor high above to the hands of whoever swings or slides on them
  for (const r of S.ropes) {
    const [ax, ay] = tilePx(...r.a()), m = r.m, hx = isoX(m.x, m.y), hy = isoY(m.x, m.y) - (m.z || 0) - (m.artH || 50) * (m.scale || 1) * 0.85;
    ctx.strokeStyle = '#3a2a1c'; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.quadraticCurveTo((ax + hx) / 2 + 6, (ay + hy) / 2 + 10, hx, hy); ctx.stroke();
    ctx.strokeStyle = '#a07a50'; ctx.lineWidth = 1; ctx.setLineDash([2, 4]); ctx.stroke(); ctx.setLineDash([]);
  }
  // the knights' runeblades: the Death Knight's 3D blade in each knight's colours, swept through the strike with a trail
  for (const b of S.blades) {
    const k = b.k, x = isoX(k.x, k.y), y = isoY(k.x, k.y) - (k.lift || 0) - 34, q = clamp(b.t / b.dur, 0, 1), e = 1 - (1 - q) ** 3;
    b.t += Math.min(0.05, G.dt || 0.016);
    const a = b.a0 + (b.a1 - b.a0) * e;
    ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = b.glow; ctx.lineCap = 'round';
    for (let j = 0; j < 3; j++) { ctx.globalAlpha = (0.45 - j * 0.12) * (1 - q * 0.6); ctx.lineWidth = 10 - j * 3; ctx.beginPath(); ctx.arc(x, y, b.len * (0.9 - j * 0.12), Math.min(b.a0, a), Math.max(b.a0, a)); ctx.stroke(); }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    if (!drawRuneblade3D(ctx, x, y, a, b.len, { skin: b.skin, palette: b.palette, spin: q * 2, tilt: 0.3, glow: b.glow, glowAmt: 0.55 })) {
      ctx.strokeStyle = b.glow; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * b.len, y + Math.sin(a) * b.len); ctx.stroke();
    }
  }
  // lightning: a jagged bolt from the clouds to the deck, brightest at the strike
  for (const b of S.bolts) {
    const [bx, by] = tilePx(b.x, b.y, b.lv), a = clamp(1 - b.t / 0.35, 0, 1);
    if (a <= 0) continue;
    ctx.globalCompositeOperation = 'lighter';
    for (const [w, col] of [[7, 'rgba(140,170,255,0.35)'], [2.5, 'rgba(235,245,255,0.95)']]) {
      ctx.strokeStyle = col; ctx.lineWidth = w; ctx.globalAlpha = a; ctx.beginPath();
      let x = bx + b.dx, y = by - 900;
      ctx.moveTo(x, y);
      for (let i = 1; i <= 14; i++) { const k = i / 14; x = bx + b.dx * (1 - k) + (i < 14 ? (hash(b.seed, i) - 0.5) * 60 * (1 - k * 0.6) : 0); y = by - 900 * (1 - k); ctx.lineTo(x, y); }
      ctx.stroke();
    }
    glow(ctx, bx, by, 90, '#cfe0ff', a);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }
}

// ------------------------------------------------------------------ screen space, last
let fogCanvas = null;
const drops = [];
export function skyFront(ctx, W, H, world, dt) {
  const S = world.sky; if (!S) return;
  const v = S.v, t = G.time, wind = v.wind * (S.windK ?? 1), dpr = G.dpr;
  // weather: rain streaks, snow, ash and embers (screen space, wrapped)
  const kind = v.rain ? 'rain' : v.snow ? 'snow' : v.ash ? 'ash' : null;
  const want = kind ? (G.touch ? 110 : 220) : 60;
  while (drops.length < want) drops.push({ x: Math.random(), y: Math.random(), s: 0.6 + Math.random() * 0.8, e: Math.random() < 0.18 });
  if (drops.length > want) drops.length = want;
  if (kind) {
    for (const d of drops) {
      const vy = kind === 'rain' ? 1.6 : kind === 'snow' ? 0.12 : 0.08, vx = DIR[0] * (kind === 'rain' ? 0.35 : 0.14) * wind;
      d.y += vy * d.s * dt; d.x += (vx + (kind === 'snow' ? Math.sin(t * 2 + d.s * 9) * 0.02 : 0)) * d.s * dt;
      if (d.y > 1.05) { d.y -= 1.1; d.x = Math.random(); } if (d.x < -0.05) d.x += 1.1; if (d.x > 1.05) d.x -= 1.1;
      const x = d.x * W, y = d.y * H;
      if (kind === 'rain') { ctx.strokeStyle = 'rgba(190,210,235,0.45)'; ctx.lineWidth = dpr; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + DIR[0] * 14 * dpr * wind * 0.5, y + 18 * dpr); ctx.stroke(); }
      else if (kind === 'snow') { ctx.fillStyle = 'rgba(250,252,255,0.85)'; ctx.fillRect(x, y, 2 * dpr * d.s, 2 * dpr * d.s); }
      else if (d.e) { ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(glowSprite('#ff7a20'), x - 4 * dpr, y - 4 * dpr, 8 * dpr, 8 * dpr); ctx.globalCompositeOperation = 'source-over'; }
      else { ctx.fillStyle = 'rgba(40,34,32,0.7)'; ctx.fillRect(x, y, 2 * dpr, 2 * dpr); }
    }
  }
  // wind streaks rushing astern
  ctx.fillStyle = '#fff';
  const n = Math.round((v.gusts ? 70 : 34) * Math.min(2, wind));
  for (let i = 0; i < n; i++) {
    const life = 0.6 + hash(i, 5) * 0.7, ph = (t / life + hash(i, 6)) % 1, cyc = Math.floor(t / life + hash(i, 6));
    const x0 = hash(i, cyc * 3 + 1) * W * 1.2, y0 = hash(i, cyc * 3 + 2) * H, sp = (300 + hash(i, 9) * 300) * dpr * wind;
    const x = x0 + DIR[0] * sp * ph * life, y = y0 + DIR[1] * sp * ph * life, len = (18 + hash(i, 4) * 40) * dpr, a = Math.sin(Math.PI * ph) * (0.25 + hash(i, 8) * 0.35);
    ctx.globalAlpha = a;
    ctx.save(); ctx.translate(x, y); ctx.rotate(Math.atan2(DIR[1], DIR[0])); ctx.fillRect(0, 0, len, dpr); ctx.restore();
  }
  ctx.globalAlpha = 1;
  // fog: a bank of grey over everything, thin round the hero
  if (v.fog && world.player) {
    const fw = Math.ceil(W / 6), fh = Math.ceil(H / 6);
    if (!fogCanvas || fogCanvas.width !== fw || fogCanvas.height !== fh) fogCanvas = makeCanvas(fw, fh);
    // in a cut scene the clear patch moves to the shot's subject (the middle of the screen) and opens with the zoom
    const f = fogCanvas.getContext('2d'), [hx, hy] = camera.tileToScreen(world.player.x, world.player.y, 30), k = Cine.bars;
    const sx = (hx * (1 - k) + G.W / 2 * k) * dpr, sy = (hy * (1 - k) + G.H / 2 * k) * dpr;
    f.globalCompositeOperation = 'source-over'; f.clearRect(0, 0, fw, fh);
    f.fillStyle = 'rgba(176,186,194,0.8)'; f.fillRect(0, 0, fw, fh);
    f.globalCompositeOperation = 'destination-out';
    const open = 1 + k * (0.5 + 0.5 * clamp(camera.zoom / (Cine.zoom0 || 1), 0.5, 3));
    const r = (H / 6) * 0.5 * (S.fogR ?? 1) * open, cx = sx / 6, cy = sy / 6, g = f.createRadialGradient(cx, cy, r * 0.25, cx, cy, r);
    g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    f.fillStyle = g; f.fillRect(0, 0, fw, fh);
    ctx.drawImage(fogCanvas, 0, 0, W, H);
  }
  // wisps of cloud blowing across in front
  const A = skyArt(v);
  ctx.imageSmoothingEnabled = false;
  for (const c of A.wisps) {
    const pw = W + 900 * dpr, ph = H + 400 * dpr;
    const u = (((c.u + DIR[0] * 140 * dpr * wind * t / pw) % 1) + 1) % 1, w = (((c.v + DIR[1] * 140 * dpr * wind * t / ph) % 1) + 1) % 1;
    ctx.globalAlpha = v.fog ? 0.35 : 0.18;
    ctx.drawImage(c.img, Math.round(u * pw - 450 * dpr), Math.round(w * ph - 200 * dpr), c.img.width * 6 * dpr, c.img.height * 6 * dpr);
  }
  ctx.imageSmoothingEnabled = true; ctx.globalAlpha = 1;
  // the arrival: the camera comes down through a cloud, which parts from the middle of the screen
  if (S.through > 0) {
    const k = 1 - S.through, B = A.bank, R = Math.max(W, H);
    ctx.globalAlpha = clamp(S.through * 2 - 1, 0, 1); ctx.fillStyle = v.mid[2]; ctx.fillRect(0, 0, W, H);
    ctx.imageSmoothingEnabled = false;
    for (let i = 0; i < 14; i++) {
      const img = B[i % B.length], ang = i * 2.4 + 0.4, d = (0.05 + 0.85 * k * k) * R * (0.55 + 0.45 * hash(i, 3));
      const sc = (6 + 14 * k) * dpr * (0.8 + 0.4 * hash(i, 4)), w = img.width * sc, h = img.height * sc;
      const x = W / 2 + Math.cos(ang) * d - w / 2, y = H / 2 + Math.sin(ang) * d * 0.7 - h / 2;
      if (x > W || y > H || x + w < 0 || y + h < 0) continue;   // parted off the screen
      ctx.globalAlpha = clamp(S.through * 1.5, 0, 1);
      ctx.drawImage(img, x, y, w, h);
    }
    ctx.imageSmoothingEnabled = true; ctx.globalAlpha = 1;
  }
  // a lightning flash lights the whole sky
  if (S.flash > 0) { ctx.fillStyle = `rgba(225,235,255,${Math.min(0.75, S.flash)})`; ctx.fillRect(0, 0, W, H); }
}

// ------------------------------------------------------------------ the gate
/** The swirling gate in the bridge's great door, drawn in the door's own plane (the portal record's skygate). */
export function drawSkyGate(ctx, p) {
  const st = castle3dState(), g = st && st.anchors && st.anchors.ship.gate;
  if (!g) return;
  const S = G.world && G.world.sky, t = G.time, col = p.active ? (S?.gateColor || p.color) : '#ff5020', fl = S?.gateFlash || 0;
  // ship x -> screen (32, 16) a unit; ship y (up) -> (0, -LV * HS)
  const [bx, by] = shipPx(0, 0, g.z);
  ctx.save();
  ctx.transform(HW, HH, 0, -LV * HS, bx, by);
  const a = g.w / 2, hs = g.hs, h = g.h, y0 = g.y;
  ctx.beginPath(); ctx.moveTo(-a, y0); ctx.lineTo(-a, y0 + hs);
  ctx.bezierCurveTo(-a, y0 + hs + (h - hs) * 0.55, -a * 0.35, y0 + h - 0.05, 0, y0 + h);
  ctx.bezierCurveTo(a * 0.35, y0 + h - 0.05, a, y0 + hs + (h - hs) * 0.55, a, y0 + hs);
  ctx.lineTo(a, y0); ctx.closePath(); ctx.clip();
  const cy = y0 + h * 0.42;
  const gr = ctx.createRadialGradient(0, cy, 0, 0, cy, h * 0.75);
  gr.addColorStop(0, '#fff6e8'); gr.addColorStop(0.18, col); gr.addColorStop(1, '#1a0606');
  ctx.fillStyle = gr; ctx.fillRect(-a, y0, a * 2, h);
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 7; i++) {
    const sp = 2 + i * 0.55, r = h * (0.55 - i * 0.06);
    ctx.globalAlpha = (p.active ? 0.5 : 0.28) - i * 0.04 + fl * 0.2;
    ctx.strokeStyle = i % 2 ? col : '#ffffff'; ctx.lineWidth = 0.07 - i * 0.006;
    ctx.beginPath(); ctx.ellipse(0, cy, r * 0.62, r, 0, t * sp, t * sp + 4.2); ctx.stroke();
  }
  ctx.globalAlpha = 0.6 + fl * 0.4; ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.ellipse(0, cy, 0.18 + fl * 0.25, 0.3 + fl * 0.4, 0, 0, TAU); ctx.fill();
  ctx.restore();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.5 + fl * 0.5;
  const [gx, gy] = shipPx(0, y0 + h * 0.45, g.z + 0.1);
  ctx.drawImage(glowSprite(col), gx - 70, gy - 80, 140, 160);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}
