// Death Knight: the Runeblade. A spectral greatsword hovers at his side with six rune slots down its blade. His
// blows carve runes into it by their nature: frost (cold, the Frost tree), unholy (shadow, poison, Unholy), blood
// (blood, the Blood tree). Six runes and the blade swells to giant size for RUNIC OBLITERATION, one colossal cleave.
// The runes decide what follows: mostly frost freezes everything it struck, mostly unholy bursts into plague, mostly
// blood drinks their life back into him. All six of one kind is PERFECT: half again as strong.
// The sword is a 3D model (src/gfx/runeblade3d.js, docs/RUNEBLADE_3D.md): it sways round its length as it hovers,
// twirls when it takes a rune, and the same model, scaled up, makes the Obliteration swing. Its skin changes every 10
// levels and its palette every 50 (runebladeLook), announced as the blade is reforged.
const look = (p) => runebladeLook((p === G.player && G.char ? G.char.level : p.level) || 1);
import { G, stat, power, sigO, crowd, glow, rand, TAU } from './common.js';
import { isoX, isoY, camera, HW, HH } from '../../core/view.js';
import { sfx } from '../../core/audio.js';
import { addEffect, Ring, Slash, floatText, spawn, burst, bloodSpray, addDecal } from '../../gfx/vfx.js';
import { hit, aoe } from '../combat.js';
import { coneTargets } from '../hazards.js';
import { drawRuneblade3D, runeblade3DReady, runebladeLook, preloadRuneblade } from '../../gfx/runeblade3d.js';

const RUNES = 6;
const RC = { frost: '#7ad0ff', unholy: '#70e050', blood: '#ff2a30' };
const EL = { frost: 'cold', unholy: 'shadow', blood: 'blood' };
const TREE = ['frost', 'unholy', 'blood', 'frost'];

/** The blade from its hilt (x, y) along angle a (screen space), `len` long, runes lit along it. */
function blade(ctx, x, y, a, len, runes, t, scale = 1) {
  const dx = Math.cos(a), dy = Math.sin(a), nx = -dy, ny = dx, W = 3.2 * scale;
  ctx.save();
  glow(ctx, runes.length ? RC[runes[runes.length - 1]] : '#7ad0ff', x + dx * len * 0.5, y + dy * len * 0.5, len * 0.6, 0.25 + runes.length * 0.06);
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.55;
  ctx.fillStyle = '#9ab8d8';
  ctx.beginPath(); // the blade: broad, with a long point
  ctx.moveTo(x + nx * W, y + ny * W); ctx.lineTo(x + dx * len * 0.85 + nx * W * 0.9, y + dy * len * 0.85 + ny * W * 0.9);
  ctx.lineTo(x + dx * len, y + dy * len); ctx.lineTo(x + dx * len * 0.85 - nx * W * 0.9, y + dy * len * 0.85 - ny * W * 0.9); ctx.lineTo(x - nx * W, y - ny * W); ctx.closePath(); ctx.fill();
  ctx.globalAlpha = 0.9; ctx.strokeStyle = '#e8f6ff'; ctx.lineWidth = 0.8 * scale; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + dx * len * 0.92, y + dy * len * 0.92); ctx.stroke(); // the fuller
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  ctx.fillStyle = '#2a3040'; // crossguard, grip, pommel
  ctx.beginPath(); ctx.moveTo(x + nx * W * 3, y + ny * W * 3); ctx.lineTo(x - nx * W * 3, y - ny * W * 3); ctx.lineWidth = 2.6 * scale; ctx.strokeStyle = '#3a4258'; ctx.stroke();
  ctx.strokeStyle = '#1a1a24'; ctx.lineWidth = 2 * scale; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - dx * 9 * scale, y - dy * 9 * scale); ctx.stroke();
  ctx.fillStyle = runes.length === RUNES ? '#ffffff' : '#5a6a8a'; ctx.beginPath(); ctx.arc(x - dx * 10 * scale, y - dy * 10 * scale, 2 * scale, 0, TAU); ctx.fill();
  for (let i = 0; i < RUNES; i++) { // rune slots down the blade
    const k = 0.14 + i * 0.12, rx = x + dx * len * k, ry = y + dy * len * k, r = runes[i];
    if (r) { glow(ctx, RC[r], rx, ry, 5 * scale, 0.9); ctx.fillStyle = '#ffffff'; }
    else ctx.fillStyle = 'rgba(30,40,60,0.6)';
    const s = 1.3 * scale; ctx.fillRect(rx - s, ry - s, s * 2, s * 2);
    if (r) { ctx.fillStyle = RC[r]; ctx.fillRect(rx - s * 0.5, ry - s * 2, s, s * 4); }
  }
  ctx.restore();
}

/** The Runeblade: the 3D model with its lit runes, or the flat blade above until the model can draw. */
function sword(ctx, p, x, y, a, len, runes, t, scale, spin, tilt) {
  const L = look(p);
  if (!runeblade3DReady(L.skin)) return blade(ctx, x, y, a, len, runes, t, scale);
  const col = runes.length ? RC[runes[runes.length - 1]] : L.glow, ga = ctx.globalAlpha;  // glow() resets the alpha
  glow(ctx, col, x + Math.cos(a) * len * 0.5, y + Math.sin(a) * len * 0.5, len * 0.6, (0.25 + runes.length * 0.06) * ga);
  ctx.globalAlpha = ga;
  const v = drawRuneblade3D(ctx, x, y, a, len, { skin: L.skin, palette: L.palette, spin, tilt, glow: col, glowAmt: 0.12 + runes.length * 0.07 });
  if (!v) return;
  const f = Math.min(1, v.face * 1.6), s = Math.max(1, 5 * v.k);  // runes fade edge-on
  for (let i = 0; i < runes.length && i < RUNES; i++) {
    const [rx, ry] = v.slots[i], r = runes[i];
    glow(ctx, RC[r], rx, ry, Math.max(4.5, 28 * v.k), 0.9 * f * ga);
    ctx.globalAlpha = f * ga; ctx.fillStyle = '#ffffff'; ctx.fillRect(rx - s * 0.7, ry - s * 0.7, s * 1.4, s * 1.4);
    ctx.fillStyle = RC[r]; ctx.fillRect(rx - s * 0.35, ry - s * 1.6, s * 0.7, s * 3.2); ctx.globalAlpha = ga;
  }
}

class Obliteration {
  constructor(p, s, ang, runes) { Object.assign(this, { p, ang, runes, t: 0, dur: 0.75, hitAt: 0.32, done: false }); }
  get depth() { return this.p.x + this.p.y + 0.6; }
  update(dt) {
    this.t += dt;
    const p = this.p, w = this.world;
    if (!this.done && this.t >= this.hitAt) {
      this.done = true;
      const cnt = { frost: 0, unholy: 0, blood: 0 };
      for (const r of this.runes) cnt[r]++;
      const main = Object.keys(cnt).reduce((a, b) => (cnt[b] > cnt[a] ? b : a)), perfect = cnt[main] === RUNES;
      const P = power(p) * 7 * (perfect ? 1.5 : 1), el = EL[main], targets = coneTargets(w, p.team, p.x, p.y, this.ang, 4.8, 1.05);
      for (const c of targets) hit(p, c, P, el, sigO({ knock: 1.2, freeze: main === 'frost' && cnt.frost >= 4, slow: true }));
      addEffect(new Slash(p.x, p.y, this.ang, 2.2, 4.2, 0.35, RC[main], { width: 22, z: 20 }));
      addEffect(new Slash(p.x, p.y, this.ang, 2.0, 3.4, 0.3, '#ffffff', { width: 8, z: 22 }));
      const fx = p.x + Math.cos(this.ang) * 2.6, fy = p.y + Math.sin(this.ang) * 2.6;
      if (cnt[main] >= 4 || perfect) {
        if (main === 'frost') { addDecal(fx, fy, 'rgba(160,220,255,0.5)', 2, 'frost', 0.8); for (let i = 0; i < 20; i++) spawn({ type: 'shard', x: fx + rand(-1.5, 1.5), y: fy + rand(-1.5, 1.5), z: 0, vz: rand(80, 160), g: 280, life: rand(0.5, 0.8), size: rand(3, 5), size1: 1, color: i % 2 ? '#c8f0ff' : '#ffffff', rot: -Math.PI / 2, add: true }); }
        else if (main === 'unholy') { aoe(w, p, fx, fy, 3.2, P * 0.3, 'poison', sigO({ poison: true })); addEffect(new Ring(fx, fy, 0.2, 3.2, 0.6, RC.unholy, 5, { fill: true })); burst(fx, fy, 20, 'poison', 30, 3, { up: 1.5 }); }
        else { p.heal(p.maxHp * 0.12); for (const c of targets) bloodSpray(c.x, c.y, 26, Math.atan2(p.y - c.y, p.x - c.x), 12, '#a00808', 1.2); floatText(p.x, p.y, 70, 'Blood drunk', RC.blood, 12); }
      }
      if (perfect) floatText(p.x, p.y, 120, 'PERFECT RUNES', RC[main], 15, { life: 1.6 });
      camera.shake(10); G.hitStop = Math.max(G.hitStop || 0, 0.07);
      sfx('crit', 1); sfx(main === 'frost' ? 'cold' : main === 'blood' ? 'blood' : 'shadow', 0.9);
    }
    return this.t < this.dur;
  }
  draw(ctx) {
    const p = this.p, t = this.t, px = isoX(p.x, p.y), py = isoY(p.x, p.y) - 30;
    const sa = Math.atan2((Math.cos(this.ang) + Math.sin(this.ang)) * HH, (Math.cos(this.ang) - Math.sin(this.ang)) * HW); // to screen
    // raised overhead, then brought down through the target direction
    const k = Math.min(1, t / this.hitAt), a = t < this.hitAt ? -Math.PI / 2 - 0.6 + (sa + Math.PI / 2 + 0.6) * k * k : sa;
    const grow = Math.min(1, t / 0.15), fade = t > this.hitAt ? 1 - (t - this.hitAt) / (this.dur - this.hitAt) : 1;
    // in 3D: raised leaning away and turned, it comes round flat to the camera as it falls, then rolls on
    const spin = t < this.hitAt ? (1 - k) * 1.3 : -(t - this.hitAt) * 0.9, tilt = t < this.hitAt ? -0.55 * (1 - k) : 0.12;
    ctx.globalAlpha = fade;
    sword(ctx, p, px + Math.cos(a) * 8, py + Math.sin(a) * 8, a, 125 * grow, this.runes, t, 2.4, spin, tilt);
    ctx.globalAlpha = 1;
  }
}

export default {
  id: 'death_knight', name: 'Runeblade', color: '#7ad0ff',
  desc: 'A spectral greatsword at his side takes a rune for every blow: frost, unholy or blood by its nature. Six runes and RUNIC OBLITERATION, one colossal cleave; the runes decide whether it freezes, spreads plague or drinks life.',
  init: () => ({ runes: [], gap: 0, flash: 0, swing: 0 }),
  hit(p, s, tgt, dmg, el, o) {
    if (s.gap > 0 || s.runes.length >= RUNES || s.swing > 0) return;
    s.gap = 0.5; s.flash = 0.5;
    const r = el === 'cold' ? 'frost' : el === 'shadow' || el === 'poison' ? 'unholy' : el === 'blood' ? 'blood' : TREE[Number(String(o.sk || '').split('.')[1]) || 0];
    s.runes.push(r);
  },
  update(p, s, dt) {
    s.gap -= dt; s.flash = Math.max(0, s.flash - dt * 2); s.swing = Math.max(0, s.swing - dt);
    const L = look(p);
    if (s.band !== L.band) {   // a new skin every 10 levels: reforged with a twirl
      if (s.band !== undefined) { s.flash = 0.5; floatText(p.x, p.y, 110, 'Runeblade reforged: ' + L.name, L.glow, 14, { life: 2.2, vz: 14 }); sfx('cold', 0.6); }
      s.band = L.band; preloadRuneblade(L.skin);
    }
    if (s.runes.length >= RUNES && s.swing <= 0 && (s.wait = (s.wait || 0) - dt) <= 0) { s.wait = 0.2; if (crowd(p, 4.5)) this.fire(p, s); }
  },
  fill: (s) => s.runes.length / RUNES,
  fire(p, s) {
    while (s.runes.length < RUNES) s.runes.push(TREE[s.runes.length % 3]);
    const c = crowd(p, 5), ang = c ? Math.atan2(c[1] - p.y, c[0] - p.x) : p.facing || 0;
    p.world.addHazard(new Obliteration(p, s, ang, s.runes.splice(0)));
    s.swing = 0.8;
    floatText(p.x, p.y, 110, 'RUNIC OBLITERATION', '#c8ecff', 17, { life: 1.6, vz: 16 });
    sfx('cold', 0.5);
    stat('death_knight', 'fire');
  },
  draw(ctx, p, s, t) {
    if (s.swing > 0) return;
    const px = isoX(p.x, p.y), py = isoY(p.x, p.y) - (p.z || 0), sc = G.touch ? 0.85 : 1;
    const x = px + 20 * sc, y = py - 62 * (p.scale || 1) + Math.sin(t * 2) * 2, a = Math.PI / 2 + 0.12 + Math.sin(t * 1.3) * 0.06;
    if (s.flash > 0 && s.runes.length) glow(ctx, RC[s.runes[s.runes.length - 1]], x, y + 18, 18, s.flash);
    const u = s.flash > 0 ? 1 - s.flash / 0.5 : 1;  // a full twirl as it takes a rune
    sword(ctx, p, x, y, a, 42 * sc, s.runes, t, sc, Math.sin(t * 0.7) * 0.75 + TAU * (1 - (1 - u) ** 3), 0.18);
  },
};
