// Gilded critters: little treasures that cross the screen now and then (a gilded wisp drifting through the air, a
// starmoth, a golden scarab scuttling over the floor, now and then a prismatic wisp). Auto-play never chases them:
// they are the player's to tap (or click) before they get away. They aren't creatures, so nothing fights them.
// Wiring: game.update -> crittersTick, each critter is a 'top' effect (vfx.js) that moves and draws itself, and
// spectate.js hit-tests taps against world.critters (catchCritterAt).
import { G } from '../state.js';
import { rand, chance, pick, TAU, fmtInt } from '../core/util.js';
import { sfx } from '../core/audio.js';
import { camera, isoX, isoY } from '../core/view.js';
import { addEffect, Ring, glowSprite, sparkle, spawn, floatText, addLight } from '../gfx/vfx.js';
import { depthLevel } from '../data/depth.js';
import { rollGem, potionItem } from '../data/items.js';
import { addToBag, xpToNext } from './player.js';
import { GroundItem } from './loot.js';
import { UI } from '../ui/ui.js';

// fly: drifts in the air (z), else scuttles on the floor. w: odds. life: seconds before it gets away.
export const CRITTERS = {
  wisp: { name: 'Gilded Wisp', color: '#ffd040', fly: true, w: 45, life: 12, speed: 1.3, pay: { gold: 30 } },
  moth: { name: 'Starmoth', color: '#a8c8ff', fly: true, w: 25, life: 11, speed: 1.6, pay: { xp: 0.035 } },
  scarab: { name: 'Golden Scarab', color: '#ffb030', fly: false, w: 22, life: 10, speed: 2.1, pay: { gold: 18, gem: 0.6 } },
  prism: { name: 'Prismatic Wisp', color: '#ff80e0', fly: true, w: 8, life: 9, speed: 2, pay: { gold: 40, xp: 0.03, gem: 1, potion: 1 } },
};
const KEYS = Object.keys(CRITTERS);
export const CRITTER_GAP = [40, 85]; // seconds between critters

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
    if (p && Math.hypot(p.x - this.x, p.y - this.y) > 9) this.a = Math.atan2(p.y - this.y, p.x - this.x) + rand(-0.6, 0.6);
    const s = K.speed * (K.fly ? 1 : 0.6 + 0.4 * Math.abs(Math.sin(this.t * 7)));
    const nx = this.x + Math.cos(this.a) * s * dt, ny = this.y + Math.sin(this.a) * s * dt;
    if (K.fly || m.walkable(nx, ny)) { this.x = nx; this.y = ny; } else { this.a += Math.PI * rand(0.6, 1.4); this.turn = 0.3; }
    if (K.fly) this.z += Math.sin(this.t * 3 + this.ph) * dt * 14;
    addLight(this.x, this.y, 1.6, 0.7, this.z, K.color);
    if (chance(dt * (K.fly ? 14 : 6))) spawn({ type: 'glow', x: this.x + rand(-0.1, 0.1), y: this.y + rand(-0.1, 0.1), z: this.z + rand(-3, 3), vz: K.fly ? -8 : 12, life: rand(0.4, 0.8), size: rand(1.5, 3), size1: 0, color: this.key === 'prism' ? pick(['#ff80e0', '#80e0ff', '#ffe060', '#90ff90']) : K.color, add: true });
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
    if (K.fly) {
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
    ctx.globalAlpha = 1;
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
    if (ch && !ch.tips.critter) { ch.tips.critter = true; UI.log(`A <b style="color:${c.K.color}">${c.K.name}</b>! ${G.touch ? 'Tap' : 'Click'} it before it gets away: gilded critters are yours to catch, auto-play leaves them alone.`, '#ffe2a0'); }
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
  if (world.critterT === undefined) world.critterT = rand(18, 40);
  if (world.critters && world.critters.some((c) => c.alive)) return;
  if ((world.critterT -= dt) <= 0) { world.critterT = rand(...CRITTER_GAP); spawnCritter(world); }
}

/** A tap/click at screen point (sx, sy): catch the critter under it. Returns true when one was caught. */
export function catchCritterAt(sx, sy) {
  const w = G.world;
  if (!w || !w.critters) return false;
  const reach = (G.touch ? 38 : 28);
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

/** The catch: its treasure goes straight to the hero (gold, experience, a gem, a potion). */
export function catchCritter(cr) {
  const p = G.player, c = G.char, w = cr.world, K = cr.K, pay = K.pay;
  if (!p || !c || !cr.alive) return;
  cr.caught = true;
  const lvl = depthLevel(w.depth || 1), lines = [];
  if (pay.gold) {
    const g = Math.max(10, Math.round((3 + lvl * 2.2) * pay.gold * rand(0.8, 1.25) * (1 + p.st.goldFind / 100)));
    c.gold += g; lines.push(`${fmtInt(g)} gold`);
    floatText(cr.x, cr.y, cr.z + 20, `+${fmtInt(g)} gold`, '#ffd34a', 15, { life: 1.6 });
    sfx('gold', 0.8);
  }
  if (pay.xp) {
    const x = Math.max(5, Math.round(xpToNext(c.level) * pay.xp));
    p.gainXp(x); lines.push(`${fmtInt(x)} experience`);
    floatText(cr.x, cr.y, cr.z + 36, `+${fmtInt(x)} XP`, '#a8c8ff', 14, { life: 1.6 });
  }
  if (pay.gem && chance(pay.gem)) {
    const gem = rollGem(lvl + 4);
    if (!addToBag(c, gem)) w.addLoot(new GroundItem(p.x, p.y, 'item', { item: gem }));
    lines.push('a gem');
  }
  if (pay.potion) {
    const k = pick(['hp', 'rejuv', 'fury']);
    c.potions[k] = (c.potions[k] || 0) + 1; lines.push(potionItem(k).name.toLowerCase());
  }
  addEffect(new Ring(cr.x, cr.y, 0.1, 1.6, 0.45, K.color, 4, { z: cr.z }));
  sparkle(cr.x, cr.y, cr.z, K.color, 24, 0.5);
  sparkle(cr.x, cr.y, cr.z, '#ffffff', 8, 0.3);
  sfx('levelup', 0.35);
  c.critters = (c.critters || 0) + 1;
  UI.log(`Caught a <b style="color:${K.color}">${K.name}</b>: ${lines.join(', ')}.`, '#ffe2a0');
  UI.refresh();
}

