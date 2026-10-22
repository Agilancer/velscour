// The Gunner's turrets and Bombing Run biplane, drawn from the three.js bake (tools/gunner3d.html -> node
// tools/gunner3d_bake.js -> assets/sprites/gunner/<kind>.webp/json; models in tools/gunner3d.js, textured from the
// airships' pack). A turret is its stand, then its head at the nearest of 48 turns: the head slews toward its target,
// sweeps slowly while it has none, drops onto the stand turning when summoned, spins its barrels (Gun Turret) or
// lights up (the others) and kicks back as it fires. turretMuzzle() gives the barrel's tip so shots leave from there.
// The biplane is 32 headings x 2 propeller frames, with its ground shadow. Each sheet loads on first use; until it
// is in, drawTurret3D/drawBiplane3D return false and the caller draws the old art.
import { G } from '../state.js';
import { isoX, isoY } from '../core/view.js';
import { TAU, angleDiff } from '../core/util.js';
import { glowSprite } from './vfx.js';

export const TURRET3D = new Set(['turret', 'flameturret', 'rocketturret', 'cryoturret']);
const GLOW = { turret: '#ffd070', flameturret: '#ff8a20', rocketturret: '#ffb040', cryoturret: '#70d8ff' };
const sheets = new Map();

function sheet(key) {
  let s = sheets.get(key);
  if (!s) {
    sheets.set(key, (s = { meta: null, img: null }));
    Promise.all([
      fetch(`assets/sprites/gunner/${key}.json`).then((r) => r.json()),
      new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = `assets/sprites/gunner/${key}.webp`; }),
    ]).then(([m, im]) => { s.meta = m; s.img = im; }).catch((e) => console.warn('gunner 3d art', key, e));
  }
  return s.img ? s : null;
}
/** Start loading the Gunner's sheets (all four turrets and the plane). */
export function preloadGunner3D() { for (const k of TURRET3D) sheet(k); sheet('biplane'); }

const dirIndex = (a, n) => ((Math.round((a / TAU) * n) % n) + n) % n;
function glow(ctx, col, x, y, r, a) {
  if (a <= 0) return;
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.min(1, a);
  ctx.drawImage(glowSprite(col), x - r, y - r, r * 2, r * 2);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}

/** The turret's head state: its yaw, slewed toward the target or sweeping; kept on the creature. */
function aim(m) {
  const S = m._t3 || (m._t3 = { yaw: m.facing || 0, base: m.facing || 0, t: m.animT || 0, spin: 0 });
  const dt = Math.max(0, Math.min(0.1, (m.animT || 0) - S.t)); S.t = m.animT || 0;
  const tg = m.target && !m.target.dead ? m.target : null;
  let want;
  if (tg) { want = Math.atan2(tg.y - m.y, tg.x - m.x); S.base = want; S.idle = 0; }
  else { S.idle = (S.idle || 0) + dt; want = S.base + Math.sin(S.idle * 0.7) * 0.9; }   // sweeping
  const k = 1 - Math.exp(-dt * (tg ? 16 : 3));
  S.yaw += angleDiff(S.yaw, want) * k;
  if (m.spawnT < 0.45) S.yaw = want - (1 - m.spawnT / 0.45) ** 2 * TAU * 1.5;   // spins up as it lands
  S.spin += dt * (m.attackAnimT > 0 ? 30 : 0);
  return S;
}

/** Where a 3D turret's barrel ends when it aims along ang: { x, y, z } (tiles; z in px over the ground), or null. */
export function turretMuzzle(m, ang) {
  if (!TURRET3D.has(m.summonKey)) return null;
  const s = sheet(m.summonKey);
  if (!s) return null;
  const k = m.scale || 1, [f, up] = s.meta.muzzle, x = m.x + Math.cos(ang) * f * k, y = m.y + Math.sin(ang) * f * k;
  const map = m.world && m.world.map;
  if (map && !map.walkable(x, y)) return { x: m.x, y: m.y, z: up * k };   // up against a wall: from the turret itself
  return { x, y, z: up * k };
}

/** Draw a Gunner turret summon; false while its sheet loads (the caller draws its sprite). */
export function drawTurret3D(ctx, m) {
  const s = sheet(m.summonKey);
  if (!s) return false;
  const { meta: M, img } = s, S = M.S, A = aim(m), k = (m.scale || 1) * (G.touch ? 0.9 : 1);
  const px = isoX(m.x, m.y), py = isoY(m.x, m.y), t = m.animT || 0;
  const land = m.spawnT < 0.3 ? m.spawnT / 0.3 : 1, drop = (1 - land) ** 2 * 70;   // falls onto its spot
  const firing = m.attackAnimT > 0, kick = firing ? (m.attackAnimT / 0.32) : 0;
  const ga = (m.alpha ?? 1) * Math.min(1, land * 2);
  // the shadow, the stand
  ctx.fillStyle = 'rgba(0,0,0,0.36)';
  ctx.beginPath(); ctx.ellipse(px, py, 20 * k * (0.6 + 0.4 * land), 8 * k * (0.6 + 0.4 * land), 0, 0, TAU); ctx.fill();
  if (land < 1 && land > 0.7) glow(ctx, '#c0a080', px, py, 26 * k, (1 - land) * 2);   // dust where it lands
  ctx.save(); ctx.globalAlpha = ga;
  const st = M.stand, sx0 = 0, sy0 = st.y * S, sdx = px - st.ax * k, sdy = py - st.ay * k - (m.z || 0) - drop;
  m.drawRim(ctx, img, sx0, sy0, st.w * S, st.h * S, sdx, sdy, st.w * k, st.h * k);
  ctx.drawImage(img, sx0, sy0, st.w * S, st.h * S, sdx, sdy, st.w * k, st.h * k);
  // the head at its turn and frame, kicked back along the barrel while firing
  const H = M.head, i = dirIndex(A.yaw, M.dirs);
  const f = M.frames >= 3 ? (Math.floor(A.spin) % M.frames) : firing ? 1 : 0;
  const rx = -(Math.cos(A.yaw) - Math.sin(A.yaw)) * kick * 2.5 * k, ry = -(Math.cos(A.yaw) + Math.sin(A.yaw)) * kick * 1.25 * k;
  const hdx = px - H.ax * k + rx, hdy = py - H.ay * k - (m.z || 0) - drop * 1.25 + ry;
  m.drawRim(ctx, img, i * H.w * S, 0, H.w * S, H.h * S, hdx, hdy, H.w * k, H.h * k);
  ctx.drawImage(img, i * H.w * S, f * H.h * S, H.w * S, H.h * S, hdx, hdy, H.w * k, H.h * k);
  if (m.flash > 0) {
    ctx.globalAlpha = Math.min(1, m.flash * 8) * 0.6 * ga; ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(img, sx0, sy0, st.w * S, st.h * S, sdx, sdy, st.w * k, st.h * k);
    ctx.drawImage(img, i * H.w * S, f * H.h * S, H.w * S, H.h * S, hdx, hdy, H.w * k, H.h * k);
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.restore();
  // the muzzle: a flash when it fires, the pilot light / the ice crystal always
  const [mf, mu] = M.muzzle, mx = px + (Math.cos(A.yaw) - Math.sin(A.yaw)) * 32 * mf * k + rx, my = py + (Math.cos(A.yaw) + Math.sin(A.yaw)) * 16 * mf * k - mu * k - (m.z || 0) - drop + ry;
  const col = GLOW[m.summonKey];
  if (m.summonKey === 'turret') { if (firing) glow(ctx, col, mx, my, (9 + Math.random() * 5) * k, 0.9 * kick + 0.2); }
  else if (m.summonKey === 'flameturret') glow(ctx, col, mx, my, (firing ? 16 : 5 + Math.sin(t * 17) * 1.2) * k, firing ? 0.9 : 0.55);
  else if (m.summonKey === 'cryoturret') glow(ctx, col, mx, my, (7 + Math.sin(t * 3) * 1.5 + (firing ? 8 : 0)) * k, firing ? 0.9 : 0.45);
  else if (firing) glow(ctx, col, px - (Math.cos(A.yaw) - Math.sin(A.yaw)) * 10 * k, my + 4 * k, 14 * k, kick);   // rocket back-blast
  const top = hdy + 4 * k;
  m.screenTop = top;
  m.drawOverhead(ctx, px, top - 4, H.w * k * 0.5);
  return true;
}

/** Draw the biplane: (x, y) the ground point under it (world px), z its height, heading in tile space, bank tilts
 * it (radians, screen space); with shadow set, only its shadow on the ground. False while its sheet loads. */
export function drawBiplane3D(ctx, x, y, z, heading, t, k = 1, bank = 0, shadow = false) {
  const s = sheet('biplane');
  if (!s) return false;
  const { meta: M, img } = s, S = M.S, i = dirIndex(heading, M.dirs), f = Math.floor(t * 40) % M.frames;
  const sh = M.shadow, B = M.body;
  if (shadow) {
    ctx.save(); ctx.globalAlpha = 0.3;
    ctx.drawImage(img, i * sh.w * S, sh.y * S, sh.w * S, sh.h * S, x - sh.ax * k, y - sh.ay * k, sh.w * k, sh.h * k);
    ctx.restore();
    return true;
  }
  ctx.save(); ctx.translate(x, y - z); if (bank) ctx.rotate(bank);
  ctx.drawImage(img, i * B.w * S, f * B.h * S, B.w * S, B.h * S, -B.ax * k, -B.ay * k, B.w * k, B.h * k);
  ctx.restore();
  return true;
}
