// Base class for every living thing: player, monsters, summons.
import { G } from '../state.js';
import { isoX, isoY, screenDirToTile } from '../core/view.js';
import { TAU, rand, chance, clamp, makeCanvas } from '../core/util.js';
import { spawn, glowSprite, ELEM } from '../gfx/vfx.js';
import { pixelSprite } from '../gfx/pixelart.js';
import { classSprite } from '../core/assets.js';
import { enemyImage } from '../core/enemyart.js';
import { petAnimation, petTintImage } from '../core/petart.js';

let UID = 0;

// frozen / charmed tints: the CSS filter runs once into a cached copy of the image, not on every draw (a per-draw
// ctx.filter is a slow software path, in Safari above all); without ctx.filter support the tint just doesn't show
const FREEZE = 'hue-rotate(180deg) saturate(1.6) brightness(1.2)', CHARM = 'hue-rotate(90deg)';
const tints = { [FREEZE]: new WeakMap(), [CHARM]: new WeakMap() };
function tinted(img, f) {
  if (!f) return img;
  let c = tints[f].get(img);
  if (!c) {
    c = makeCanvas(img.width, img.height);
    const x = c.getContext('2d');
    if (!('filter' in x)) return img;
    x.filter = f; x.drawImage(img, 0, 0);
    c._art = img._art;
    tints[f].set(img, c);
  }
  return c;
}

// A 1px screen-space rim round every monster, coloured like the target window's name (normal red, champion blue,
// unique gold, boss orange), green round the hero's summons and pale gold round the hero; in town and on the roads
// townsfolk get violet and vendors (shops, crafters) cyan (drawNpc in render.js). Each sprite frame's rim
// (its silhouette stamped 8 ways, in source px) is baked once per colour and thickness: one extra draw per creature.
export const RIM = { normal: '#e0302a', champion: '#5a9aff', unique: '#ffc040', boss: '#ff7a1a', ally: '#48e868', hero: '#ffe9a8', folk: '#c08cff', vendor: '#3ee0e0' };
const RIM_DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [0.71, 0.71], [-0.71, 0.71], [0.71, -0.71], [-0.71, -0.71]];
const rims = new WeakMap(); // img -> Map(frame/colour/thickness key -> padded rim canvas)
function rimCanvas(img, sx, sy, sw, sh, col, o) {
  let m = rims.get(img);
  if (!m) rims.set(img, (m = new Map()));
  const key = sx + ',' + sy + ',' + sw + ',' + sh + col + o;
  let c = m.get(key);
  if (!c) {
    if (m.size > 400) m.clear(); // a creature rescaled endlessly can't grow the cache without bound
    const p = Math.ceil(o) + 1;
    c = makeCanvas(sw + p * 2, sh + p * 2);
    const x = c.getContext('2d');
    for (const [ux, uy] of RIM_DIRS) x.drawImage(img, sx, sy, sw, sh, p + ux * o, p + uy * o, sw, sh);
    x.globalCompositeOperation = 'source-in'; x.fillStyle = col; x.fillRect(0, 0, c.width, c.height);
    c._pad = p;
    m.set(key, c);
  }
  return c;
}

/** A col rim under a sprite: drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh) args in the sprite's current transform. */
export function drawRim(ctx, col, img, sx, sy, sw, sh, dx, dy, dw, dh) {
  if (!col || !img || !img.width || dw < 4 || dh < 4) return;
  // 1 CSS px in the sprite's source px, snapped to 2^(n/4) steps so zoom, squash and spawn growth reuse a few bakes
  const t = ctx.getTransform(), kx = dw / sw, ky = dh / sh;
  const o = Math.min(32, Math.max(0.25, 2 ** (Math.round(Math.log2(G.dpr / ((Math.hypot(t.a, t.b) || 1) * (kx + ky) / 2)) * 4) / 4)));
  const c = rimCanvas(img, sx, sy, sw, sh, col, o), p = c._pad;
  ctx.drawImage(c, dx - p * kx, dy - p * ky, dw + p * 2 * kx, dh + p * 2 * ky);
}

export class Creature {
  constructor(o = {}) {
    this.id = ++UID;
    this.x = 0; this.y = 0; this.z = 0;
    this.r = 0.32;
    this.team = 'enemy';
    this.maxHp = 10; this.hp = 10;
    this.speed = 2.5;
    this.facing = 0;
    this.flip = false;
    this.flash = 0;
    this.hpShow = 0;
    this.animT = Math.random() * 10;
    this.moving = false;
    this.lunge = 0;
    this.attackAnimT = 0;
    this.kbx = 0; this.kby = 0;
    this.dead = false;
    this.level = 1;
    this.res = {};
    this.st = { status: null };
    this.status = {}; // burn, poison, bleed: {t, dps, src}; chill/slow: {t, amt}; freeze/stun/fear/confuse: {t}
    this.curses = {}; // amp, weaken, leech, thorns, decay, mark, bomb, doom: {t, amt, src}
    this.buffs = [];
    this.spawnT = 0;
    this.scale = 1;
    Object.assign(this, o);
    this.hp = this.hp > this.maxHp ? this.maxHp : this.hp;
  }

  get alive() { return !this.dead; }

  /** Movement speed multiplier from status effects. */
  speedMul() {
    let m = 1;
    const s = this.status;
    if (s.chill && s.chill.t > 0) m *= 1 - s.chill.amt;
    if (s.slow && s.slow.t > 0) m *= 1 - s.slow.amt;
    if (this.curses.slow && this.curses.slow.t > 0) m *= 1 - this.curses.slow.amt;
    if (this.isPlayer && G.char && G.char.madT > 0) m *= 2; // MADNESS
    return Math.max(0.15, m);
  }
  disabled() {
    const s = this.status;
    return (s.freeze && s.freeze.t > 0) || (s.stun && s.stun.t > 0);
  }

  /** Tick status effects. Returns true if creature can act this frame. */
  tickStatus(dt, onDot) {
    const s = this.status;
    for (const k in s) {
      const e = s[k];
      if (!e || e.t <= 0) continue;
      e.t -= dt;
      if (e.dps) {
        e.acc = (e.acc || 0) + dt;
        if (e.acc >= 0.5) {
          e.acc -= 0.5;
          onDot && onDot(k, e.dps * 0.5, e.src);
        }
        // visuals
        if (k === 'burn' && chance(dt * 12)) spawn({ type: 'glow', x: this.x + rand(-0.2, 0.2), y: this.y + rand(-0.2, 0.2), z: rand(10, 40), vz: 30, life: 0.5, size: 3, size1: 0, color: chance(0.5) ? '#ff8020' : '#ffd040', add: true });
        if (k === 'poison' && chance(dt * 8)) spawn({ type: 'glow', x: this.x + rand(-0.2, 0.2), y: this.y + rand(-0.2, 0.2), z: rand(10, 40), vz: 15, life: 0.7, size: 2, size1: 3, color: '#80ff30', add: true });
        if (k === 'bleed' && chance(dt * 10)) spawn({ type: 'blood', x: this.x, y: this.y, z: rand(15, 30), vx: rand(-0.5, 0.5), vy: rand(-0.5, 0.5), vz: 10, g: 260, life: 1, size: 1.6, color: this.bloodColor || '#8a0b08' });
      }
      if (k === 'chill' && chance(dt * 6)) spawn({ type: 'dot', x: this.x + rand(-0.3, 0.3), y: this.y + rand(-0.3, 0.3), z: rand(10, 40), vz: -10, life: 0.6, size: 1.5, color: '#c8f0ff' });
    }
    for (const k in this.curses) {
      const c = this.curses[k];
      if (!c || c.t <= 0) continue;
      c.t -= dt;
      if (k === 'decay') {
        c.acc = (c.acc || 0) + dt;
        if (c.acc >= 0.5) { c.acc -= 0.5; onDot && onDot('decay', c.dps * 0.5, c.src); }
      }
      if ((k === 'bomb' || k === 'doom') && c.t <= 0 && c.onExpire) c.onExpire(this);
    }
    // knockback
    if (this.kbx || this.kby) {
      if (this.world) this.world.map.move(this, this.kbx * dt, this.kby * dt, this.ghost);
      const f = Math.pow(0.0015, dt);
      this.kbx *= f; this.kby *= f;
      if (Math.abs(this.kbx) + Math.abs(this.kby) < 0.05) this.kbx = this.kby = 0;
    }
    if (this.flash > 0) this.flash -= dt;
    if (this.hpShow > 0) this.hpShow -= dt;
    if (this.lunge > 0) this.lunge = Math.max(0, this.lunge - dt * 4);
    if (this.attackAnimT > 0) this.attackAnimT = Math.max(0, this.attackAnimT - dt);
    this.spawnT += dt;
    if (this.idleArt) { this.stillT = this.x === this._sx && this.y === this._sy ? (this.stillT || 0) + dt : 0; this._sx = this.x; this._sy = this.y; }
    return !this.disabled();
  }

  /** Move toward a point, returns remaining distance. */
  moveToward(tx, ty, dt, speed = this.speed) {
    const dx = tx - this.x, dy = ty - this.y;
    const d = Math.hypot(dx, dy);
    if (d < 0.02) { this.moving = false; return 0; }
    const step = Math.min(d, speed * this.speedMul() * dt);
    const moved = this.world.map.move(this, (dx / d) * step, (dy / d) * step, this.ghost);
    this.moving = moved;
    this.face(Math.atan2(dy, dx));
    return d - step;
  }

  face(ang) {
    this.facing = ang;
    // screen-space horizontal component decides sprite flip
    const sx = Math.cos(ang) - Math.sin(ang);
    if (Math.abs(sx) <= 0.15) return;
    // a facing change must hold for a moment: auto-play and kiting alternate move/attack directions frame to frame,
    // which strobed the sprite left-right. Deliberate turns (a held direction) still land within a tenth of a second.
    const want = sx < 0;
    if (want === this.flip) { this.flipAt = -1; return; }
    const t = G.time || 0;
    if (!(this.flipAt >= 0) || t < this.flipAt) this.flipAt = t;
    if (t - this.flipAt >= (this.isPlayer && !G.autoplayOn ? 0.06 : 0.14)) { this.flip = want; this.flipAt = -1; }
  }

  // ------------------------------------------------------------- drawing
  spriteImage() {
    // memoised per creature: building cache keys every frame is surprisingly costly
    const art = this.idleArt && this.stillT > 0.8 ? this.idleArt : this.art; // a pet that sits when it stands still
    const id = art || this.classId || this.sprite, pal = art ? this.swap : this.classPal || this.pal;
    if (this._img && this._imgSprite === id && this._imgPal === pal) return this._img;
    if (art) {
      const img = enemyImage(art, this.swap);
      if (!img) return pixelSprite(this.sprite, this.pal, 6); // monster art still loading: the old pixel look
      this._imgSprite = id; this._imgPal = pal; this._flashImg = null;
      return (this._img = img);
    }
    this._imgSprite = id;
    this._imgPal = pal;
    this._flashImg = null;
    this._img = this.classId ? classSprite(this.classId, this.spriteH * 3, this.classPal || null) : pixelSprite(this.sprite, this.pal, 6, this.dark ? { dark: true } : null);
    return this._img;
  }
  tintFilter() {
    return this.status.freeze && this.status.freeze.t > 0 ? FREEZE : this.curses.charm && this.curses.charm.t > 0 ? CHARM : '';
  }
  flashImage(img) {
    if (img && img._art) return enemyImage(img === this._img ? this._imgSprite : this.riseArt, this.swap, 'flash');
    if (this.classId) return null;
    if (!this._flashImg) this._flashImg = pixelSprite(this.sprite, this.pal, 6, { flash: true });
    return this._flashImg;
  }
  rimColor() {
    if (this.dead || this.targetable === false) return null;
    if (this.isPlayer) return RIM.hero;
    return this.team === 'enemy' ? RIM[this.rank] || RIM.normal : this.summon ? RIM.ally : null;
  }
  /** The rim under the sprite: drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh) args in the sprite's current transform. */
  drawRim(ctx, img, sx, sy, sw, sh, dx, dy, dw, dh) { drawRim(ctx, this.rimColor(), img, sx, sy, sw, sh, dx, dy, dw, dh); }
  /** World-px size of the sprite. */
  spriteDims(img) {
    if (img._art) { const h = this.artH * this.scale * (this.artRef ? img.height / this.artRef : 1); return [h * img.width / img.height, h]; }
    if (this.classId) { const h = this.spriteH * this.scale; return [h * img.width / img.height, h]; }
    const px = (this.px || 2.3) * this.scale / 6;
    return [img.width * px, img.height * px];
  }

  draw(ctx) {
    const art = this.artFrame && this.artFrame();
    if (art) return this.drawArt(ctx, art);
    const pet = petAnimation(this);
    if (pet) return this.drawPet(ctx, pet);
    const px = isoX(this.x, this.y), py = isoY(this.x, this.y);
    let img = this.spriteImage();
    const rising = this.riseArt && this.spawnT < 0.5 && enemyImage(this.riseArt);
    if (rising && this.spawnT < 0.22) img = rising; // a blue slime pools up as a puddle, then pops up out of it
    let [w, h] = this.spriteDims(img);
    // appear animation
    if (rising) { const k = this.spawnT < 0.22 ? 0.35 + this.spawnT / 0.22 * 0.65 : 1; w *= k; if (this.spawnT >= 0.22) { const t = (this.spawnT - 0.22) / 0.28; h *= 1 + 0.3 * Math.sin(t * Math.PI); w *= 1 - 0.15 * Math.sin(t * Math.PI); } }
    else if (this.spawnT < 0.3) { const k = this.spawnT / 0.3; w *= k; h *= k; }
    let bob = this.moving ? Math.abs(Math.sin(this.animT * 9)) * 2.2 : Math.sin(this.animT * 2) * 0.6;
    let squash = this.moving ? 1 + Math.sin(this.animT * 18) * 0.03 : 1;
    if (this.hop) { // slimes: stretch in the air, splat on landing; a slow wobble at rest
      const s = this.moving ? Math.sin(this.animT * 8) : 0;
      bob = Math.max(0, s) * 7 * this.scale;
      squash = this.moving ? 1 + (s > 0 ? s * 0.14 : s * 0.22) : 1 + Math.sin(this.animT * 3) * 0.04;
      w *= 2 - squash;
    }
    const fly = this.fly ? 16 + Math.sin(this.animT * 3) * 4 : 0;
    const z = this.z + fly + bob;
    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.38)';
    ctx.beginPath(); ctx.ellipse(px, py, Math.max(8, Math.min(w, h) * 0.32), Math.max(4, Math.min(w, h) * 0.14), 0, 0, TAU); ctx.fill();
    // elite aura
    if (this.aura) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.55 + Math.sin(this.animT * 4) * 0.2;
      const g = glowSprite(this.aura);
      ctx.drawImage(g, px - w * 0.8, py - h * 0.75 - z, w * 1.6, h * 1.3);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
    // lunge offset (screen-space direction of facing)
    const lx = this.lunge > 0 ? (Math.cos(this.facing) - Math.sin(this.facing)) * this.lunge * 8 : 0;
    const ly = this.lunge > 0 ? (Math.cos(this.facing) + Math.sin(this.facing)) * this.lunge * 4 : 0;
    // monster art is anchored at its feet (weapons stick out to one side), mirrored with the sprite
    const ax = img._art ? (this.flip ? 1 - img._art.fx / img.width : img._art.fx / img.width) : 0.5;
    const dx = px - w * ax + lx, dy = py - h * squash - z + ly;
    ctx.save();
    if (this.alpha !== undefined) ctx.globalAlpha = this.alpha;
    const ti = tinted(img, this.tintFilter());
    if (this.flip) {
      ctx.translate(dx + w, dy); ctx.scale(-1, 1);
      this.drawRim(ctx, img, 0, 0, img.width, img.height, 0, 0, w, h * squash);
      ctx.drawImage(ti, 0, 0, w, h * squash);
    } else { this.drawRim(ctx, img, 0, 0, img.width, img.height, dx, dy, w, h * squash); ctx.drawImage(ti, dx, dy, w, h * squash); }
    if (this.flash > 0) {
      const f = this.flashImage(img);
      ctx.globalAlpha = Math.min(1, this.flash * 8) * 0.85;
      if (f) {
        if (this.flip) ctx.drawImage(f, 0, 0, w, h * squash); else ctx.drawImage(f, dx, dy, w, h * squash);
      } else {
        ctx.globalCompositeOperation = 'lighter';
        if (this.flip) ctx.drawImage(img, 0, 0, w, h * squash); else ctx.drawImage(img, dx, dy, w, h * squash);
      }
    }
    ctx.restore();
    this.screenTop = py - h - z; // for overhead UI
    this.drawOverhead(ctx, px, py - h - z - 4, w);
  }

  /** Draw an animal or humanoid summon from its dedicated animation atlas. */
  drawPet(ctx, a) {
    const px = isoX(this.x, this.y), py = isoY(this.x, this.y);
    const h = a.h * this.scale, w = h * a.cw / a.ch;
    const spawning = a.frames === 9 && this.spawnT < 0.54;
    // Spawn frames are already drawn small and rising, so only ease them in lightly.
    const appear = spawning ? 0.75 + Math.min(1, this.spawnT / 0.54) * 0.25 : this.spawnT < 0.3 ? this.spawnT / 0.3 : 1;
    const z = this.z + (this.fly ? 16 + Math.sin(this.animT * 3) * 4 : 0) +
      (this.moving ? Math.abs(Math.sin(this.animT * 9)) * 2.2 : Math.sin(this.animT * 2) * 0.6);
    const dw = w * appear, dh = h * appear;
    ctx.fillStyle = 'rgba(0,0,0,0.38)';
    ctx.beginPath(); ctx.ellipse(px, py, Math.max(8, Math.min(dw, dh) * 0.32), Math.max(4, Math.min(dw, dh) * 0.14), 0, 0, TAU); ctx.fill();
    if (this.aura) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.55 + Math.sin(this.animT * 4) * 0.2;
      const g = glowSprite(this.aura);
      ctx.drawImage(g, px - dw * 0.8, py - dh * 0.75 - z, dw * 1.6, dh * 1.3);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
    const lx = this.lunge > 0 ? (Math.cos(this.facing) - Math.sin(this.facing)) * this.lunge * 8 : 0;
    const ly = this.lunge > 0 ? (Math.cos(this.facing) + Math.sin(this.facing)) * this.lunge * 4 : 0;
    const dx = px - dw / 2 + lx, dy = py - dh - z + ly;
    ctx.save();
    if (this.alpha !== undefined) ctx.globalAlpha = this.alpha;
    const img = petTintImage(a.img, this.tintFilter());
    if (this.flip) {
      ctx.translate(dx + dw, dy); ctx.scale(-1, 1);
      this.drawRim(ctx, a.img, a.sx, a.sy, a.cw, a.ch, 0, 0, dw, dh);
      ctx.drawImage(img, a.sx, a.sy, a.cw, a.ch, 0, 0, dw, dh);
    } else { this.drawRim(ctx, a.img, a.sx, a.sy, a.cw, a.ch, dx, dy, dw, dh); ctx.drawImage(img, a.sx, a.sy, a.cw, a.ch, dx, dy, dw, dh); }
    if (this.flash > 0) {
      ctx.globalAlpha = Math.min(1, this.flash * 8) * 0.6;
      ctx.globalCompositeOperation = 'lighter';
      if (this.flip) ctx.drawImage(a.img, a.sx, a.sy, a.cw, a.ch, 0, 0, dw, dh);
      else ctx.drawImage(a.img, a.sx, a.sy, a.cw, a.ch, dx, dy, dw, dh);
    }
    ctx.restore();
    this.screenTop = py - dh - z;
    this.drawOverhead(ctx, px, py - dh - z - 4, dw);
  }

  /**
   * Draw a single-image hero ({img, frame, cw, ch, ax, ay, k}: cell size, feet anchor in the cell, world px
   * per image px), with the same bob and squash as the class sprites. The art faces right; it is mirrored
   * when the creature faces left. drawArtLayer(ctx, 'back' | 'front', where), if defined, draws effects
   * behind and in front of it.
   */
  drawArt(ctx, a) {
    const px = isoX(this.x, this.y), py = isoY(this.x, this.y);
    let k = a.k * this.scale;
    if (this.spawnT < 0.3) k *= this.spawnT / 0.3;
    const bob = this.moving ? Math.abs(Math.sin(this.animT * 9)) * 2.2 : Math.sin(this.animT * 2) * 0.6;
    const squash = this.moving ? 1 + Math.sin(this.animT * 18) * 0.03 : 1;
    const z = this.z + bob;
    const w = a.cw * k, h = a.ch * k * squash;
    ctx.fillStyle = 'rgba(0,0,0,0.38)';
    ctx.beginPath(); ctx.ellipse(px, py, 13 * this.scale, 5.5 * this.scale, 0, 0, TAU); ctx.fill();
    const lx = this.lunge > 0 ? (Math.cos(this.facing) - Math.sin(this.facing)) * this.lunge * 8 : 0;
    const ly = this.lunge > 0 ? (Math.cos(this.facing) + Math.sin(this.facing)) * this.lunge * 4 : 0;
    const dx = -a.ax * k, dy = -a.ay * k * squash;
    const where = { img: a.img, x: px + lx, y: py + ly - z, dx, dy, k, flip: this.flip };
    if (this.drawArtLayer) this.drawArtLayer(ctx, 'back', where);
    ctx.save();
    if (this.alpha !== undefined) ctx.globalAlpha = this.alpha;
    ctx.translate(where.x, where.y);
    if (this.flip) ctx.scale(-1, 1);
    this.drawRim(ctx, a.img, a.frame * a.cw, 0, a.cw, a.ch, dx, dy, w, h);
    ctx.drawImage(tinted(a.img, this.tintFilter()), a.frame * a.cw, 0, a.cw, a.ch, dx, dy, w, h);
    if (this.flash > 0) {
      ctx.globalAlpha = Math.min(1, this.flash * 8) * 0.6;
      ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(a.img, a.frame * a.cw, 0, a.cw, a.ch, dx, dy, w, h);
    }
    ctx.restore();
    if (this.drawArtLayer) this.drawArtLayer(ctx, 'front', where);
    const top = py - this.spriteH * this.scale - z;
    this.screenTop = top;
    this.drawOverhead(ctx, px, top - 4, w * 0.6);
  }

  drawOverhead(ctx, px, py, w) {
    if (this.ghostDraw) return; // a see-through copy (the Astronomer's Celestial Mirror) carries no overhead marks
    // stun stars / curse marks
    const s = this.status;
    if ((s.stun && s.stun.t > 0) || (s.fear && s.fear.t > 0)) {
      const fear = s.fear && s.fear.t > 0;
      for (let i = 0; i < 3; i++) {
        const a = this.animT * 5 + (i * TAU) / 3;
        ctx.fillStyle = fear ? '#c080ff' : '#ffe060';
        ctx.fillRect(px + Math.cos(a) * 9 - 1.5, py + Math.sin(a) * 3 - 1.5, 3, 3);
      }
    }
    const cursed = Object.keys(this.curses).filter((k) => this.curses[k] && this.curses[k].t > 0);
    if (cursed.length) {
      ctx.strokeStyle = this.curses.mark || this.curses.doom ? '#ff3030' : '#b060ff';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(px, py - 6, 4 + Math.sin(this.animT * 6), 0, TAU); ctx.stroke();
    }
    // health bar for damaged normal monsters
    if (this.team === 'enemy' && this.hpShow > 0 && this.rank !== 'boss') {
      const bw = Math.max(22, Math.min(46, w * 0.8));
      ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(px - bw / 2 - 1, py - 8, bw + 2, 4);
      ctx.fillStyle = this.rank === 'unique' ? '#e0a030' : this.rank === 'champion' ? '#4a8aff' : '#c02010';
      ctx.fillRect(px - bw / 2, py - 7, bw * clamp(this.hp / this.maxHp, 0, 1), 2);
    }
    if (this.team === 'player' && !this.isPlayer && this.summon && this.maxHp > 0 && this.hp < this.maxHp) {
      const bw = 24;
      ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(px - bw / 2 - 1, py - 8, bw + 2, 4);
      ctx.fillStyle = '#30c040'; ctx.fillRect(px - bw / 2, py - 7, bw * clamp(this.hp / this.maxHp, 0, 1), 2);
    }
  }
}

export { screenDirToTile, ELEM };
