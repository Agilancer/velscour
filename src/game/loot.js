// Drops on the ground: gold, health/mana orbs, potions, gear and gems.
import { G } from '../state.js';
import { rand, chance, randi, TAU, pick, clamp } from '../core/util.js';
import { isoX, isoY, camera } from '../core/view.js';
import { sfx } from '../core/audio.js';
import { spawn, glowSprite, sparkle, floatText, addLight, elem } from '../gfx/vfx.js';
import { replacementIcon } from '../core/replacementart.js';
import { pixelSprite, gemIcon, goldIcon, ringIcon } from '../gfx/pixelart.js';
import { rollItem, rollGem, itemName, itemColor, MATERIALS, GEMS, potionItem, RARITY_COLORS } from '../data/items.js';
import { potionIcon } from '../core/assets.js';
import { artIcon } from '../core/classart.js';
import { gearIcon } from '../core/gearart.js';
import { AUGMENTS } from '../data/rings.js';
import { depthLevel } from '../data/depth.js';

export class GroundItem {
  constructor(x, y, kind, data = {}) {
    this.x = x; this.y = y; this.z = 0;
    this.kind = kind; // gold | orb_hp | orb_mp | item | potion
    Object.assign(this, data);
    const a = rand(TAU), s = rand(0.5, 1.6);
    this.vx = Math.cos(a) * s; this.vy = Math.sin(a) * s; this.vz = rand(90, 150);
    this.t = 0;
    this.r = 0.35;
  }
  get label() {
    if (this.kind === 'gold') return `${this.amount} Gold`;
    if (this.kind === 'item') return itemName(this.item);
    if (this.kind === 'potion') return this.item.name;
    return null;
  }
  get color() {
    if (this.kind === 'gold') return '#ffd34a';
    if (this.kind === 'item' || this.kind === 'potion') return itemColor(this.item);
    return '#fff';
  }
  update(dt, world) {
    this.t += dt;
    if (this.z > 0 || this.vz > 0) {
      this.vz -= 420 * dt; this.z += this.vz * dt;
      const nx = this.x + this.vx * dt, ny = this.y + this.vy * dt;
      if (world.map.walkable(nx, ny)) { this.x = nx; this.y = ny; }
      if (this.z <= 0) { this.z = 0; this.vz = this.vz < -60 ? -this.vz * 0.3 : 0; if (this.kind === 'item' && this.item.rarity >= 3) sfx('pickup'); }
    }
    const p = world.player;
    if (!p || p.dead) return true;
    const d = Math.hypot(p.x - this.x, p.y - this.y);
    const magnet = this.kind === 'gold' ? 2.2 : this.kind.startsWith('orb') ? 3.2 : 0;
    if (magnet && d < magnet && this.t > 0.4) {
      const k = Math.min(1, dt * 9);
      this.x += (p.x - this.x) * k; this.y += (p.y - this.y) * k;
    }
    const auto = this.kind !== 'item' || G.touch || G.settings.autoLoot;
    if (this.t > 0.35 && (d < 0.55 || (p.lootTarget === this && d < 1.2)) && (auto || p.lootTarget === this)) {
      if (p.pickup(this)) {
        if (p.lootTarget === this) p.lootTarget = null;
        return false;
      }
    }
    if (this.t > 120 && this.kind !== 'item') return false;
    // light pillars for good loot
    if (this.kind === 'item' && this.item.rarity >= 2) {
      addLight(this.x, this.y, 1.6 + this.item.rarity * 0.5, 0.6);
      if (chance(dt * (this.item.rarity * 4))) sparkle(this.x, this.y, rand(4, 30), itemColor(this.item), 1, 0.2);
    }
    if (this.kind.startsWith('orb')) addLight(this.x, this.y, 1.8, 0.7);
    return true;
  }
  icon() {
    if (this.kind === 'item') return itemIcon(this.item);
    if (this.kind === 'potion') return potionIcon(this.item.color, 48);
    if (this.kind === 'gold') return goldIcon(48, this.amount);
    return null;
  }
  draw(ctx) {
    const px = isoX(this.x, this.y), py = isoY(this.x, this.y) - this.z;
    if (this.kind === 'orb_hp' || this.kind === 'orb_mp') {
      const c = this.kind === 'orb_hp' ? '#ff2a2a' : '#3a6aff';
      const b = 8 + Math.sin(this.t * 6) * 1.5;
      ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(glowSprite(c), px - b * 2.2, py - 10 - b * 2.2, b * 4.4, b * 4.4);
      ctx.globalCompositeOperation = 'source-over';
      const orb = replacementIcon(this.kind, 20);
      if (orb) { ctx.drawImage(orb, px - 10, py - 20 - Math.sin(this.t * 4) * 2); return; }
      ctx.fillStyle = c; ctx.beginPath(); ctx.arc(px, py - 10 - Math.sin(this.t * 4) * 2, 4.5, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.fillRect(px - 2, py - 13 - Math.sin(this.t * 4) * 2, 2, 2);
      return;
    }
    const img = this.icon();
    if (!img) return;
    const art = this.kind === 'item' && ((this.item.art && artIcon(this.item)) || gearIcon(this.item));
    const s = this.kind === 'gold' ? 20 : art ? 30 : 22;
    if (this.kind === 'item' && this.item.rarity >= 2) {
      const col = itemColor(this.item);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.25 + this.item.rarity * 0.08;
      const g = ctx.createLinearGradient(px, py - 90, px, py);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, col);
      ctx.fillStyle = g; ctx.fillRect(px - 3 - this.item.rarity, py - 90, 6 + this.item.rarity * 2, 90);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(px, py + 1, 9, 4, 0, 0, TAU); ctx.fill();
    ctx.save();
    ctx.translate(px, py - s * 0.45);
    if (this.kind === 'item' && this.item.type === 'gear' && !art) ctx.rotate(-0.6); // catalog and gear art are drawn upright / diagonal already
    ctx.drawImage(img, -s / 2, -s / 2, s, s);
    ctx.restore();
  }
}

const iconCache = new Map();
/** Inventory icon canvas for any item. */
export function itemIcon(item, size = 48) {
  if (item.type === 'gem') return gemIcon(item.gem, GEMS[item.gem].color, item.tier, size);
  if (item.type === 'potion') return potionIcon(item.color, size);
  if (item.slot === 'ring') return ringIcon(MATERIALS[item.tier].color, elem((AUGMENTS[(item.aug && item.aug[0] || {}).id] || {}).el || 'arcane').glow, item.rarity, size);
  if (item.art) { const a = artIcon(item, size); if (a) return a; }
  { const g = gearIcon(item, size); if (g) return g; }
  const key = `${item.icon}|${item.tier}|${item.rarity}|${item.base}|${size}`;
  let c = iconCache.get(key);
  if (c) return c;
  const mat = MATERIALS[item.tier].color;
  const pal = { m: mat, w: '#ffffff', b: item.icon === 'shield' ? '#5a2a1a' : '#5a3a20', g: item.rarity >= 3 ? '#ffd040' : '#b08a3a', c: item.rarity >= 2 ? RARITY_COLORS[item.rarity] : '#8a6a40', e: '#ff4040', k: '#101010' };
  if (item.icon === 'orb') { pal.c = mat; pal.e = '#c060ff'; }
  if (item.icon === 'staff' || item.icon === 'wand') { pal.c = ['#a0a0a0', '#60ff60', '#60a0ff', '#c060ff', '#ffa020', '#ff4058'][item.rarity]; pal.b = '#6a4a2a'; pal.e = '#ffffff'; }
  c = replacementIcon('item_' + item.icon, size, mat) || pixelSprite(item.icon, pal, 4);
  iconCache.set(key, c);
  return c;
}

// ------------------------------------------------------------------ drops
export function dropLoot(world, m) {
  const p = G.player;
  if (!p) return;
  const st = p.st;
  const lvl = m.level;
  const rank = m.rank || 'normal';
  const R = { normal: 1, champion: 3, unique: 5, boss: 10 }[rank];
  const add = (kind, data) => world.addLoot(new GroundItem(m.x + rand(-0.2, 0.2), m.y + rand(-0.2, 0.2), kind, data));
  // gold
  if (chance(rank === 'normal' ? 0.45 : 1)) {
    const n = rank === 'boss' ? 5 : 1;
    for (let i = 0; i < n; i++) add('gold', { amount: Math.max(1, Math.round((3 + lvl * 2.2) * rand(0.6, 1.4) * Math.sqrt(R) * (1 + st.goldFind / 100) * (world.goldMul || 1))) });
  }
  if (st.legendary.greed && chance(0.15)) for (let i = 0; i < 4; i++) add('gold', { amount: Math.round((2 + lvl) * (1 + st.goldFind / 100)) });
  // orbs
  if (chance(0.14 * Math.sqrt(R))) add('orb_hp', {});
  if (chance(0.1 * Math.sqrt(R))) add('orb_mp', {});
  // potions
  if (chance(0.035 * R)) add('potion', { item: potionItem(pick(['hp', 'hp', 'mp', 'mp', 'rejuv', 'fury'])) });
  // gear
  const items = rank === 'boss' ? randi(4, 6) + (world.depth % 10 === 0 ? 2 : 0) : rank === 'unique' ? randi(2, 3) : rank === 'champion' ? (chance(0.6) ? randi(1, 2) : 0) : (chance(0.085 * (world.lootMul || 1)) ? 1 : 0); // lootMul: omens (game/happenings.js)
  const bonus = rank === 'boss' ? 1.2 : rank === 'unique' ? 0.6 : rank === 'champion' ? 0.3 : 0;
  for (let i = 0; i < items; i++) {
    const ilvl = lvl + (rank === 'boss' ? 3 : rank === 'normal' ? 0 : 1) + randi(-1, 1);
    add('item', { item: rollItem(ilvl, { mf: st.magicFind, bonus }) });
  }
  // rings: a guardian usually drops one
  if ((rank === 'boss' && chance(0.6)) || (rank === 'unique' && chance(0.2))) add('item', { item: rollItem(lvl + 2, { slot: 'ring', mf: st.magicFind, bonus }) });
  // gems
  const gems = rank === 'boss' ? randi(1, 3) : chance(rank === 'normal' ? 0.025 : 0.25) ? 1 : 0;
  for (let i = 0; i < gems; i++) add('item', { item: rollGem(lvl + (rank === 'boss' ? 6 : 0)) });
}

export function dropChest(world, chest, depth) {
  const st = G.player ? G.player.st : { magicFind: 0, goldFind: 0 };
  const n = chest.rare ? randi(3, 5) : randi(1, 3);
  const add = (kind, data) => world.addLoot(new GroundItem(chest.x, chest.y + 0.3, kind, data));
  for (let i = 0; i < n; i++) add('item', { item: rollItem(depthLevel(depth) + 1, { mf: st.magicFind, bonus: chest.rare ? 0.8 : 0.25 }) });
  for (let i = 0; i < randi(2, 4); i++) add('gold', { amount: Math.round((10 + depthLevel(depth) * 4) * rand(0.6, 1.4) * (1 + st.goldFind / 100)) });
  if (chance(chest.rare ? 0.8 : 0.3)) add('item', { item: rollGem(depthLevel(depth) + 4) });
  if (chance(0.5)) add('potion', { item: potionItem(pick(['hp', 'mp', 'rejuv'])) });
}

/** Draw D2-style ground labels for nearby items (screen space). Returns hit boxes. */
export function drawLootLabels(ctx, world, mouse) {
  const boxes = [];
  const p = world.player;
  ctx.font = `${Math.round(12 * G.dpr)}px "Alegreya Sans", sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const placed = [];
  for (const l of world.loot) {
    if (l.kind !== 'item' && l.kind !== 'potion' && !(l.kind === 'gold' && l.amount > 0)) continue;
    if (p && Math.hypot(p.x - l.x, p.y - l.y) > 14) continue;
    if (l.kind === 'gold' && !G.settings.showGoldLabels) continue;
    const [sx, sy0] = camera.tileToScreen(l.x, l.y, 26);
    let sy = sy0;
    const text = l.label;
    const w = ctx.measureText(text).width / G.dpr + 10, h = 16;
    // avoid overlapping labels
    for (let k = 0; k < 8; k++) {
      if (!placed.some((b) => Math.abs(b.x - sx) < (b.w + w) / 2 && Math.abs(b.y - sy) < h)) break;
      sy -= h + 1;
    }
    const box = { x: sx, y: sy, w, h, loot: l };
    placed.push(box);
    const hover = mouse && Math.abs(mouse.x - sx) < w / 2 && Math.abs(mouse.y - sy) < h / 2;
    ctx.fillStyle = hover ? 'rgba(40,30,80,0.9)' : 'rgba(0,0,0,0.72)';
    ctx.fillRect((sx - w / 2) * G.dpr, (sy - h / 2) * G.dpr, w * G.dpr, h * G.dpr);
    ctx.fillStyle = l.color;
    ctx.fillText(text, sx * G.dpr, (sy + 1) * G.dpr);
    boxes.push(box);
  }
  ctx.textBaseline = 'alphabetic';
  return boxes;
}

export { clamp, floatText, spawn };
