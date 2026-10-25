// Gilded critters: little treasures that cross the screen now and then (a gilded wisp drifting through the air, a
// starmoth, a golden scarab scuttling over the floor, now and then a prismatic wisp). Auto-play never chases them:
// they are the player's to tap (or click) before they get away. They aren't creatures, so nothing fights them.
// Each pays one thing: a big sum of experience, a share of the hero's next level (pay.xp), or, the Golden Scarab, a
// heap of gold (pay.gold: that many gold piles of the hero's level, gold find counted). A red arrow bobs over
// each one and sparks stream up from it so players know to tap.
// Only a click or a tap catches one: the hero never does (they shy away from the hero, and nothing but
// catchCritterAt calls catchCritter).
// Looks: three.js models (tools/critters3d.html), baked by `node tools/critters3d_bake.js` into
// assets/sprites/critters/ (8 facings x walk/flap frames, a 12-frame idle for the wisps), each with a halo of lights.
// Wiring: game.update -> crittersTick, each critter is a 'top' effect (vfx.js) that moves and draws itself, and
// spectate.js hit-tests taps against world.critters (catchCritterAt).
import { G } from '../state.js';
import { rand, chance, pick, TAU, fmtInt } from '../core/util.js';
import { sfx } from '../core/audio.js';
import { camera, isoX, isoY } from '../core/view.js';
import { addEffect, Ring, glowSprite, sparkle, spawn, floatText, addLight } from '../gfx/vfx.js';
import { xpToNext } from './player.js';
import { goldPile } from '../data/items.js';
import { UI } from '../ui/ui.js';

// fly: drifts in the air (z), else scuttles on the floor. w: odds. life: seconds before it gets away.
// pay.xp: experience, as a share of xpToNext(hero level); pay.gold: gold piles (items.js goldPile) at the hero's level.
export const CRITTERS = {
  wisp: { name: 'Gilded Wisp', color: '#ffd040', fly: true, w: 45, life: 12, speed: 1.3, pay: { xp: 0.05 } },
  moth: { name: 'Starmoth', color: '#a8c8ff', fly: true, w: 25, life: 11, speed: 1.6, pay: { xp: 0.06 } },
  scarab: { name: 'Golden Scarab', color: '#ffb030', fly: false, w: 22, life: 10, speed: 2.1, pay: { gold: 40 } },
  prism: { name: 'Prismatic Wisp', color: '#ff80e0', fly: true, w: 8, life: 9, speed: 2, pay: { xp: 0.15 } },
};
const KEYS = Object.keys(CRITTERS);
// seconds between critters, now on a clock that doesn't wait for the last one to go: twice as many as the old 12-25 s
// gap after each critter's 9-12 s life (one every ~30 s); at most CRITTER_MAX at once
export const CRITTER_GAP = [10, 19];
export const CRITTER_MAX = 3;

// the baked models; until they load (or if they fail) the hand-drawn critters below stand in
const ART = { img: null, meta: null };
function loadArt() {
  if (ART.img) return;
  ART.img = new Image(); ART.img.src = 'assets/sprites/critters/critters.webp';
  fetch('assets/sprites/critters/critters.json').then((r) => r.json()).then((m) => { ART.meta = m; }).catch(() => {});
}
const artReady = () => ART.meta && ART.img.complete && ART.img.naturalWidth > 0;
const LIGHT2 = { wisp: '#ff9a20', moth: '#b080ff', scarab: '#40ffe8', prism: '#60d8ff' };

class Critter {
  constructor(world, key, x, y) {
    const K = CRITTERS[key];
    Object.assign(this, { world, key, K, x, y, z: K.fly ? rand(38, 58) : 0, t: 0, life: K.life, a: rand(TAU), turn: 0, ph: rand(TAU), caught: false, gone: false, layer: 'top' });
  }
  get alive() { return !this.caught && !this.gone && this.t < this.life; }
  update(dt) {
    if (G.world !== this.world || this.caught) return false;
    this.t += dt;
    const K = this.K, m = this.world.map;
    if (this.t >= this.life) { // away it goes: up into the dark, or into a crack in the floor
      if (!this.gone) { this.gone = true; this.t0 = this.t; }
      const k = this.t - this.t0;
      if (K.fly) this.z += dt * 160; else this.sink = Math.min(1, k * 2.5);
      if (chance(dt * 20)) sparkle(this.x, this.y, this.z, K.color, 1, 0.1);
      return k < 0.6;
    }
    // wander: smooth turns, steer off walls, stay within a screen of the hero
    if ((this.turn -= dt) <= 0) { this.turn = rand(0.4, 1.4); this.da = rand(-2.2, 2.2); }
    this.a += this.da * dt;
    const p = this.world.player;
    const hd = p ? Math.hypot(p.x - this.x, p.y - this.y) : 0;
    if (hd > 9) this.a = Math.atan2(p.y - this.y, p.x - this.x) + rand(-0.6, 0.6);
    else if (p && hd < 2.2 && !((this.bump -= dt) > 0)) { this.a = Math.atan2(this.y - p.y, this.x - p.x) + rand(-0.4, 0.4); this.turn = 0.4; } // shy of the hero
    const s = K.speed * (K.fly ? 1 : 0.6 + 0.4 * Math.abs(Math.sin(this.t * 7)));
    const nx = this.x + Math.cos(this.a) * s * dt, ny = this.y + Math.sin(this.a) * s * dt;
    if (K.fly || m.walkable(nx, ny)) { this.x = nx; this.y = ny; } else { this.a += Math.PI * rand(0.6, 1.4); this.turn = 0.3; this.bump = 0.5; }
    if (K.fly) this.z += Math.sin(this.t * 3 + this.ph) * dt * 14;
    // its lights: a wide one in its colour, a second that breathes in its accent colour, and a plain one that lights
    // the floor round it without washing its colours out
    addLight(this.x, this.y, 2.6, 0.8, this.z, K.color);
    addLight(this.x, this.y, 1.8, 0.35 + 0.25 * Math.sin(this.t * 4 + this.ph), this.z + 10, LIGHT2[this.key]);
    addLight(this.x, this.y, 2, 0.6, 4);
    // a stream of sparks rising from it, so it reads as something to tap even in a busy fight
    for (let n = Math.floor(dt * (artReady() ? 14 : 34) + Math.random()); n > 0; n--) {
      const a = rand(TAU), r = rand(0.05, 0.3);
      spawn({ type: 'glow', x: this.x + Math.cos(a) * r, y: this.y + Math.sin(a) * r, z: this.z + rand(-4, 6), vz: rand(45, 85), drag: 0.6, life: rand(0.7, 1.3), size: rand(1.2, 2.6), size1: 0, color: chance(0.25) ? '#ffffff' : this.key === 'prism' ? pick(['#ff80e0', '#80e0ff', '#ffe060', '#90ff90']) : K.color, add: true });
    }
    return true;
  }
  draw(ctx) {
    const K = this.K, px = isoX(this.x, this.y), py = isoY(this.x, this.y), t = this.t;
    const fade = this.gone ? Math.max(0, 1 - (t - this.t0) / 0.6) : Math.min(1, t * 3);
    // a soft beacon ring on the floor so it reads as something to tap, brighter in its last seconds
    const late = !this.gone && this.life - t < 3;
    ctx.globalAlpha = fade * (0.35 + 0.25 * Math.sin(t * (late ? 14 : 5)));
    ctx.strokeStyle = K.color; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(px, py, 16, 8, 0, 0, TAU); ctx.stroke();
    if (artReady()) this.drawModel(ctx, px, py, fade);
    else if (K.fly) {
      const y = py - this.z, col = this.key === 'prism' ? `hsl(${(t * 220) % 360},100%,70%)` : K.color;
      ctx.globalAlpha = fade * 0.3; ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.beginPath(); ctx.ellipse(px, py, 6, 3, 0, 0, TAU); ctx.fill();
      ctx.globalCompositeOperation = 'lighter';
      const b = 24 + Math.sin(t * 9) * 4;
      ctx.globalAlpha = fade;
      ctx.drawImage(glowSprite(this.key === 'prism' ? '#ff80e0' : K.color), px - b, y - b, b * 2, b * 2);
      if (this.key === 'moth') { // two fluttering wings
        const f = Math.abs(Math.sin(t * 16)) * 10 + 3;
        ctx.fillStyle = col;
        for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.ellipse(px + sgn * 6, y - 1, f, 6, sgn * 0.5, 0, TAU); ctx.fill(); }
      }
      // a four-point twinkle, turning
      const tw = 9 + Math.sin(t * 6 + this.ph) * 4, ta = t * 1.5;
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.4;
      ctx.beginPath();
      for (let i = 0; i < 4; i++) { const a = ta + i * Math.PI / 2; ctx.moveTo(px, y); ctx.lineTo(px + Math.cos(a) * tw, y + Math.sin(a) * tw); }
      ctx.stroke();
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(px, y, 3.4, 0, TAU); ctx.fill();
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(px, y, 6, 0, TAU); ctx.globalAlpha = fade * 0.6; ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    } else { // a gold scarab, legs ticking, half sunk once it digs away
      const sink = this.sink || 0, h = Math.cos(this.a), v = Math.sin(this.a);
      const fx = (h - v) * 0.5, fy = (h + v) * 0.25; // facing, in screen space
      ctx.globalAlpha = fade;
      ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.ellipse(px, py + 1, 8, 4, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#3a2408'; ctx.lineWidth = 1.2;
      for (let i = -1; i <= 1; i++) for (const sgn of [-1, 1]) { // six legs
        const wig = Math.sin(t * 30 + i + sgn) * 1.5;
        ctx.beginPath(); ctx.moveTo(px + i * fx * 6, py - 3 + i * fy * 6); ctx.lineTo(px + i * fx * 6 - fy * sgn * 16 + wig, py - 2 + i * fy * 6 + fx * sgn * 5); ctx.stroke();
      }
      ctx.save(); ctx.translate(px, py - 3 + sink * 4); ctx.rotate(Math.atan2(fy, fx));
      ctx.scale(1.4, 1.4 * (1 - sink * 0.7));
      const g = ctx.createLinearGradient(-7, -5, 7, 5); g.addColorStop(0, '#fff2a0'); g.addColorStop(0.5, K.color); g.addColorStop(1, '#8a5008');
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, 7, 5, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#5a3008'; ctx.beginPath(); ctx.ellipse(7, 0, 2.6, 2.4, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#6a3c08'; ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(6, 0); ctx.stroke();
      ctx.restore();
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = fade * (0.4 + 0.3 * Math.sin(t * 6));
      ctx.drawImage(glowSprite(K.color), px - 18, py - 21, 36, 36);
      ctx.globalCompositeOperation = 'source-over';
    }
    if (!this.gone) { // a small red arrow bobbing over it, pointing down at it
      const tip = py - this.z - (K.fly ? 20 : 18) - Math.abs(Math.sin(t * 5)) * 6;
      ctx.globalAlpha = fade;
      ctx.fillStyle = '#ff2a2a'; ctx.strokeStyle = '#3a0000'; ctx.lineWidth = 1.5; ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(px, tip); ctx.lineTo(px - 7, tip - 8); ctx.lineTo(px - 3, tip - 8); ctx.lineTo(px - 3, tip - 15);
      ctx.lineTo(px + 3, tip - 15); ctx.lineTo(px + 3, tip - 8); ctx.lineTo(px + 7, tip - 8); ctx.closePath();
      ctx.fill(); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  /** The baked three.js model, wrapped in glows: a wide halo behind, a hot core over it and three orbiting lights. */
  drawModel(ctx, px, py, fade) {
    const K = this.K, M = ART.meta, s = M.sets[this.key], t = this.t, cs = M.cell, w = cs / M.S * 1.3;
    const d = s.dirs > 1 ? ((Math.round(this.a / (TAU / s.dirs)) % s.dirs) + s.dirs) % s.dirs : 0;
    const i = s.at + d * s.frames + Math.floor(t * (this.key === 'moth' ? 16 : this.key === 'scarab' ? 14 : 10) + this.ph * 3) % s.frames;
    const sink = this.sink || 0, cy = K.fly ? py - this.z : py - 6;
    const col = this.key === 'prism' ? `hsl(${(t * 220) % 360},100%,70%)` : K.color;
    if (K.fly) { ctx.globalAlpha = fade * 0.3; ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.beginPath(); ctx.ellipse(px, py, 9, 4.5, 0, 0, TAU); ctx.fill(); }
    ctx.globalCompositeOperation = 'lighter';
    const b = 24 + Math.sin(t * 5) * 3;
    ctx.globalAlpha = fade * 0.4; ctx.drawImage(glowSprite(K.color), px - b, cy - b, b * 2, b * 2);
    ctx.globalAlpha = fade * 0.2; ctx.drawImage(glowSprite(LIGHT2[this.key]), px - b * 1.6, cy - b * 1.6, b * 3.2, b * 3.2);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = fade;
    if (sink) { ctx.save(); ctx.beginPath(); ctx.rect(px - w, py - w * 2, w * 2, w * 2 + 2); ctx.clip(); }
    ctx.drawImage(ART.img, (i % M.cols) * cs, Math.floor(i / M.cols) * cs, cs, cs, px - w / 2, (K.fly ? py - this.z : py + 4) - w / 2 + sink * 16, w, w);
    if (sink) ctx.restore();
    ctx.globalCompositeOperation = 'lighter';
    if (K.fly) { ctx.globalAlpha = fade * (0.15 + 0.1 * Math.sin(t * 7 + this.ph)); ctx.drawImage(glowSprite('#ffffff'), px - 7, cy - 7, 14, 14); }
    for (let k = 0; k < 3; k++) { // lights circling it
      const a = t * 2.2 + k * TAU / 3 + this.ph, r = 24 + 3 * Math.sin(t * 3 + k);
      const lx = px + Math.cos(a) * r, ly = cy + Math.sin(a) * r * 0.45 - (K.fly ? 0 : 4), fr = Math.sin(a) > 0 ? 1 : 0.55;
      ctx.globalAlpha = fade * 0.85 * fr; ctx.drawImage(glowSprite(k ? col : '#ffffff'), lx - 4.5, ly - 4.5, 9, 9);
    }
    ctx.globalCompositeOperation = 'source-over';
  }
  /** Screen position (css px) of its body, for taps. */
  screen() { return camera.tileToScreen(this.x, this.y, this.z + (this.K.fly ? 0 : 4)); }
}

/** Is there room for a critter in this world? Dungeons and overworlds, never town or a sealed BOSS ROOM fight. */
const allowed = (w) => w && w.kind === 'dungeon' && !(w.raid && w.raid.sealed);

/** A critter appears a few tiles from the hero, on screen. */
export function spawnCritter(world, key = null) {
  const p = world.player;
  if (!p || p.dead) return null;
  loadArt();
  key = key || weighted();
  for (let i = 0; i < 30; i++) {
    const a = rand(TAU), r = rand(3.5, 7), x = p.x + Math.cos(a) * r, y = p.y + Math.sin(a) * r;
    if (!world.map.walkable(x, y)) continue;
    const [sx, sy] = camera.tileToScreen(x, y, 40);
    if (sx < 60 || sy < 70 || sx > G.W - 60 || sy > G.H * 0.72) continue;
    const c = new Critter(world, key, x, y);
    (world.critters ||= []).push(c);
    addEffect(c, 'top');
    addEffect(new Ring(x, y, 0.1, 1.2, 0.5, c.K.color, 3, { z: c.z }));
    sparkle(x, y, c.z, c.K.color, 10, 0.4);
    sfx('pickup', 0.5);
    const ch = G.char;
    if (ch && !ch.tips.critter) { ch.tips.critter = true; UI.log(`A <b style="color:${c.K.color}">${c.K.name}</b>! ${G.touch ? 'Tap' : 'Click'} it before it gets away: each gilded critter is worth a big sum of experience (a Golden Scarab, a pile of gold), and auto-play leaves them to you.`, '#ffe2a0'); }
    return c;
  }
  return null;
}
function weighted() {
  let r = rand(KEYS.reduce((a, k) => a + CRITTERS[k].w, 0));
  for (const k of KEYS) if ((r -= CRITTERS[k].w) <= 0) return k;
  return 'wisp';
}

/** Spawning clock (per level). */
export function crittersTick(world, dt) {
  if (!allowed(world)) return;
  if (world.critters) world.critters = world.critters.filter((c) => c.alive || (c.gone && G.world === world && c.t - c.t0 < 0.6));
  if (world.critterT === undefined) { world.critterT = rand(2, 6); loadArt(); }
  if ((world.critterT -= dt) > 0) return;
  world.critterT = rand(...CRITTER_GAP);
  if (!world.critters || world.critters.filter((c) => c.alive).length < CRITTER_MAX) spawnCritter(world);
}

/** A tap/click at screen point (sx, sy): catch the critter under it. Returns true when one was caught. */
export function catchCritterAt(sx, sy) {
  const w = G.world;
  if (!w || !w.critters) return false;
  const reach = (G.touch ? 42 : 32);
  let best = null, bd = reach;
  for (const c of w.critters) {
    if (!c.alive) continue;
    const [x, y] = c.screen(), d = Math.hypot(x - sx, y - sy);
    if (d < bd) { bd = d; best = c; }
  }
  if (!best) return false;
  catchCritter(best);
  return true;
}

/** The catch (only ever from a click or a tap): a share of the hero's next level in experience, straight to the hero. */
export function catchCritter(cr) {
  const p = G.player, c = G.char, K = cr.K;
  if (!p || !c || !cr.alive) return;
  cr.caught = true;
  const gold = !!K.pay.gold;
  const x = gold ? Math.round(goldPile(c.level) * K.pay.gold * rand(0.85, 1.15) * (1 + p.st.goldFind / 100)) : Math.max(5, Math.round(xpToNext(c.level) * K.pay.xp * rand(0.9, 1.1)));
  if (gold) { c.gold += x; sfx('gold'); } else p.gainXp(x, true);
  floatText(cr.x, cr.y, cr.z + 24, `+${fmtInt(x)} ${gold ? 'gold' : 'XP'}`, gold ? '#ffd040' : '#a8c8ff', 16, { life: 1.8 });
  addEffect(new Ring(cr.x, cr.y, 0.1, 1.6, 0.45, K.color, 4, { z: cr.z }));
  sparkle(cr.x, cr.y, cr.z, K.color, 24, 0.5);
  sparkle(cr.x, cr.y, cr.z, '#ffffff', 8, 0.3);
  sfx('levelup', 0.35);
  c.critters = (c.critters || 0) + 1;
  UI.log(`Caught a <b style="color:${K.color}">${K.name}</b>: ${fmtInt(x)} ${gold ? 'gold' : 'experience'}.`, '#ffe2a0');
  UI.refresh();
}
