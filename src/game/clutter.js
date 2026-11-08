import { Creature } from './creature.js';
import { sfx } from '../core/audio.js';
import { spawn, smoke, burst } from '../gfx/vfx.js';
import { rand, TAU } from '../core/util.js';
import { G } from '../state.js';

const DARK_FOREST_TREES = new Set([
  'ancient_black_oak', 'spire_pine', 'twisted_yew', 'dead_crowned_elm',
  'cathedral_redwood', 'weeping_willow', 'split_lightning_oak',
  'thornbound_cypress', 'hollow_ash', 'fungal_beech', 'bone_white_birch',
  'root_fused_twins', 'hanging_moss_fir', 'blighted_chestnut', 'elder_heartwood',
  'scatter_02_date_palm_sapling', 'scatter_03_bent_desert_palm', 'scatter_04_thorn_acacia', 'scatter_05_dead_snag',
]);

const TREE_NAME_REGEX = /(^|[_\s])(tree|trees|palm|palms|oak|pine|pines|birch|willow|willows|cedar|cedars|cypress|elm|elms|beech|yew|yews|fir|firs|juniper|acacia|redwood|deadwood|sapling)($|[_\s])/i;
const EXCLUDE_REGEX = /pew|door|board|crate|barrel|urn|brazier|coffin|chest|stump|pile|stack|remains|skeleton|menhir/i;

export function isTreeProp(pr) {
  if (!pr) return false;
  if (pr.tree || pr.spr?.tree) return true;
  const cat = pr.category || pr.spr?.category;
  if (cat === 'tree' || cat === 'trees') return true;
  const name = pr.name || pr.spr?.name || pr.spr?.id || '';
  if (!name) return false;
  if (name.startsWith('t_') || name.startsWith('tree_') || name === 'tree') return true;
  if (DARK_FOREST_TREES.has(name)) return true;
  if (EXCLUDE_REGEX.test(name)) return false;
  if (TREE_NAME_REGEX.test(name)) return true;
  return false;
}

export class Clutter extends Creature {
  constructor(world, prop) {
    if (isTreeProp(prop)) {
      super({ x: prop?.x || 0, y: prop?.y || 0, team: 'enemy', maxHp: 1, hp: 1 });
      this.dead = true;
      this.targetable = false;
      return;
    }
    super({
      x: prop.x,
      y: prop.y,
      team: 'enemy',
      maxHp: 1,
      hp: 1,
      r: 0.45,
      speed: 0,
    });
    this.world = world;
    this.prop = prop;
    this.name = prop.spr?.name || 'Clutter';
    this.clutter = true;
    this.noLifeBar = true;
    this.targetable = true;
    this.static = true;
    this.ghost = true; // prevent world.add nudge
    this.xp = 0;
    this.rank = 'normal';
    this.tx = Math.floor(prop.x);
    this.ty = Math.floor(prop.y);
  }

  update() {
    return !this.dead;
  }

  // Rendered in world.props layer in render.js
  draw() {}

  drawOverhead() {}

  spriteImage() {
    return null;
  }

  spriteDims() {
    const w = (this.prop?.spr?.w || 32) * (this.prop?.k || 1);
    const h = (this.prop?.spr?.h || 32) * (this.prop?.k || 1);
    return [w, h];
  }

  rimColor() {
    return null;
  }

  flashImage() {
    return null;
  }

  die(src) {
    if (isTreeProp(this.prop)) return;
    this.dead = true;
    breakClutter(this);
  }
}

export function breakClutter(c) {
  const w = c?.world;
  if (!w || !c || isTreeProp(c.prop)) return;

  // 1. Remove prop from world.props
  if (w.props && c.prop) {
    const pidx = w.props.indexOf(c.prop);
    if (pidx !== -1) w.props.splice(pidx, 1);
  }

  // 2. Unblock the tile in map
  if (w.map) {
    const tidx = c.ty * w.map.w + c.tx;
    const remaining = w.creatures && w.creatures.some((o) => o !== c && o.clutter && !o.dead && o.tx === c.tx && o.ty === c.ty);
    if (!remaining) {
      if (w.map.block) w.map.block[tidx] = 0;
      if (w.map.clutter) w.map.clutter[tidx] = 0;
      if (w.map.flowFrom) w.map.flowFrom = [-999, -999];
      w.map.blockKey = (w.map.blockKey || 0) + 1;
    }
  }

  // 3. Audio & debris splinters
  sfx('thud', 0.85);
  sfx('hit', 0.75);
  const stone = /stone|urn|pillar|statue|brazier|altar|sarcophagus|pedestal|crystal/i.test(c.name);
  const cols = stone ? ['#8a8680', '#6a6660', '#a8a29a'] : ['#8a6a44', '#644a2e', '#a88458'];
  for (let i = 0; i < 12; i++) {
    const a = rand(TAU), sp = rand(1.4, 4.4);
    spawn({
      type: 'dot',
      x: c.x + rand(-0.15, 0.15),
      y: c.y + rand(-0.15, 0.15),
      z: 8 + rand(0, 12),
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      vz: rand(50, 140),
      g: 360,
      drag: 0.9,
      life: rand(0.45, 0.95),
      size: rand(2.2, 4.2),
      size1: 0.8,
      color: cols[i % cols.length],
    });
  }
  smoke(c.x, c.y, 10, stone ? '#686460' : '#584e44', 5, 10);
  burst(c.x, c.y, 10, 'phys', 8, 2.4);

  // 4. Remove from world creatures
  if (w.creatures) {
    const cidx = w.creatures.indexOf(c);
    if (cidx !== -1) w.creatures.splice(cidx, 1);
  }

  // 5. Invalidate autoplay pathing so it immediately walks through
  if (G.autoplay) {
    G.autoplay.navT = 0;
    G.autoplay.path = null;
  }
}
