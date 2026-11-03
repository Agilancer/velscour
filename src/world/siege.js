// THE ENDLESS SIEGE (docs/ENDLESS_SIEGE.md): a 64 x 64 fortress map. The keep's curtain is a ring of height-mapped
// masonry (the Castle's wall faces, gfx/castlewalls.js) with towers on the corners and flanking three gates; the
// courtyard lies at the top of the screen (low x + y), the field the horde crosses below it (+x, +y), so the walls
// show their faces to the dead coming up from the siege camp. Behind the keep a rock cliff rises. Walls and towers are
// solid; the gate passages are open ground the run (game/siege.js) holds shut against the dead.
import { TileMap } from './map.js';
import { RNG } from '../core/util.js';
import { TW } from '../core/view.js';
import { A, biomeTileSet } from '../core/assets.js';
import { townObject, makeTownTiles } from './town.js';
import { overworldObject } from '../gfx/overworldart.js';
import { castleFrames, castleObject, castleRampartTops, castleTent } from '../gfx/castle.js';
import { FACE } from '../gfx/castlewalls.js';
import { rollLooks } from '../data/bestiary.js';
import { BIOME_BY_ID } from '../data/biomes.js';

export const SW = 64, SH = 64;
const K = TW / 160;                       // town-pack tiles are 160 x 80
export const LV = Object.freeze({ wall: 14, tower: 22, gate: 19, cliff: 34, merlon: 3 });
/** The curtain: wall tiles fill [X0, X1) x [Y0, Y1) two deep; the courtyard is [IN0, IN1) on both axes. */
export const RING = Object.freeze({ X0: 2, Y0: 2, X1: 35, Y1: 35, IN0: 4, IN1: 33 });
// the gates: axis 'x' spans x on the south wall (faces +y), 'y' spans y on the east wall (faces +x); a0 = first tile,
// three wide; the outer line (where the gate stands) is at 35
export const GATES = Object.freeze([
  { id: 'west', name: 'the West Gate', axis: 'x', a0: 9 },
  { id: 'great', name: 'the Great Gate', axis: 'x', a0: 20 },
  { id: 'east', name: 'the East Gate', axis: 'y', a0: 15 },
]);
export const LINE = 35;
const TOWERS = [[1, 1], [31, 1], [1, 31], [31, 31]];   // 5 x 5 corner towers (top-left tile)
export const BALLISTAE = Object.freeze([          // on the corner towers that look over the field: [centre, foot inside]
  { id: 'sw', at: [3.5, 33.5], foot: [6.5, 30.5] },
  { id: 'se', at: [33.5, 33.5], foot: [30.5, 30.5] },
  { id: 'ne', at: [33.5, 3.5], foot: [30.5, 6.5] },
]);
export const KEEP = Object.freeze({ start: [18.5, 23.5], banner: [18.5, 18.5], exit: [8.5, 8.5], portal: [21, 22.8] });
// where the dead come from: the far edges of the field
export const SPAWN_BANDS = Object.freeze([[8, 57, 58, 61], [57, 8, 61, 56], [40, 40, 58, 58]]);
// prop heights in world px (a hero stands 60)
const PH = { sandbags: 20, wicker_barricade: 40, timber_barricade: 38, sharpened_stakes: 50, empty_brazier: 44, arrow_bundle: 40,
  crossbow_rack: 40, spear_bundle: 56, leaned_shields: 30, water_cask: 38, stretcher: 20, medicine_box: 14, stone_blocks: 26,
  rubble_pile: 24, large_rubble: 22, small_rubble: 12, mason_tools: 10, mortar_trough: 16, banner_pole: 96, guard_stool: 22,
  crate_stack: 34, firewood_stack: 30, stone_firepit: 14, ladder: 58, scaffold_frame: 86, rope_coil: 12 };
const KEEP_H = { keep_ballista: 74, chain_winch: 50, royal_banner_stand: 104, siege_cannon_wreck: 64, cannonball_pile: 22,
  brazier_ash: 34, war_map_table: 46, armory_barrel: 44, broken_lance: 30, toppled_column: 44, smashed_heraldic_shield: 30,
  cracked_tile_rubble: 26, weapon_chest: 40, knight_memorial: 78 };

/** The castle_keep pack's tile set (its scatter and floors), or null until it is loaded. */
export function keepSet() {
  const s = biomeTileSet(BIOME_BY_ID.castle_keep);
  return s && s.pack === 'castle_keep' ? s : null;
}
/** A castle_keep pack sprite by name, sized to `h` world px (h defaults to KEEP_H). */
export function keepSprite(name) {
  const s = keepSet(), spr = s && s.scatter.find((e) => e.name === name);
  return spr ? { spr, k: (KEEP_H[name] || 40) / spr.h } : null;
}
const inGate = (x, y) => GATES.find((g) => (g.axis === 'x' ? x >= g.a0 && x < g.a0 + 3 && y >= RING.IN1 && y < RING.Y1 : y >= g.a0 && y < g.a0 + 3 && x >= RING.IN1 && x < RING.X1));
const flank = (x, y) => GATES.some((g) => {
  const [u, v] = g.axis === 'x' ? [x, y] : [y, x];
  return v >= RING.IN1 - 1 && v < RING.Y1 + 1 && ((u >= g.a0 - 2 && u < g.a0) || (u >= g.a0 + 3 && u < g.a0 + 5));
});
const tower = (x, y) => TOWERS.some(([tx, ty]) => x >= tx && x < tx + 5 && y >= ty && y < ty + 5);
const wall = (x, y) => x >= RING.X0 && y >= RING.Y0 && x < RING.X1 && y < RING.Y1 && (x < RING.IN0 || y < RING.IN0 || x >= RING.IN1 || y >= RING.IN1);
/** Inside the curtain (the courtyard, or a gate passage): the dead held at a gate only while the hero is in here. */
export const insideKeep = (x, y) => x < LINE && y < LINE && x >= RING.X0 && y >= RING.Y0;
export const inCourtyard = (x, y) => x >= RING.IN0 && y >= RING.IN0 && x < RING.IN1 && y < RING.IN1;

export function generateSiege(depth, biome, seed) {
  const rng = new RNG(seed), W = SW, H = SH, N = W * H, map = new TileMap(W, H), I = (x, y) => y * W + x;
  const hgt = new Int16Array(N), faceArt = new Uint8Array(N), faceBand = new Int16Array(N);
  map.t.fill(1); map.losBlocks = true;
  // ---- floor tiles: the town pack's grass/gravel/dirt/mud/stone, the keep pack's flagstones, the rampart tops
  // (map.v is a byte: the town's grounds and their seams only, then this map's own, so every index stays under 256)
  const town = makeTownTiles(), ks = keepSet(), tiles = town.slice(0, 6 + Object.keys(A.town.meta.transitions).length * 8);
  const keepFloor = (name) => {
    const f = ks && ks.floors.find((e) => e.name === name);
    if (!f) return 4;   // the town's stone
    tiles.push(f); return tiles.length - 1;
  };
  const FL = { grass: 0, gravel: 1, dirt: 2, mud: 3, stone: 4,
    flag: keepFloor('weathered_gatehouse_flag'), moss: keepFloor('mossline_foundation_stone'), slate: keepFloor('bluegray_bastion_slate'),
    block: keepFloor('rough_battlement_block'), grate: keepFloor('portcullis_floor_grate'), scorch: keepFloor('siege_scorch_paving') };
  const tops = castleRampartTops(), top0 = tiles.length;
  tiles.push(...tops);
  const topAt = (x, y) => (tops.length ? top0 + ((x * 3 + y * 5) % tops.length) : FL.block);   // the slabs in their four turns
  // ---- heights and solids
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = I(x, y);
    if (tower(x, y)) { hgt[i] = LV.tower; faceArt[i] = FACE.tower; faceBand[i] = LV.tower - 4; map.block[i] = 1; map.v[i] = topAt(x, y); continue; }
    if (inGate(x, y)) { map.v[i] = FL.block; continue; }
    if (wall(x, y) && flank(x, y)) { hgt[i] = LV.gate; faceArt[i] = FACE.tower; faceBand[i] = LV.gate - 4; map.block[i] = 1; map.v[i] = topAt(x, y); continue; }
    if (wall(x, y)) {
      // the outer row of the front walls is crenellated: a merlon every other tile
      const front = (y === RING.Y1 - 1 && x >= RING.IN0) || (x === RING.X1 - 1 && y >= RING.IN0);
      hgt[i] = LV.wall + (front && (x + y) % 2 === 0 ? LV.merlon : 0);
      faceArt[i] = FACE.wall; faceBand[i] = LV.wall - 2; map.block[i] = 1; map.v[i] = topAt(x, y); continue;
    }
    if (x < RING.X0 || y < RING.Y0) { hgt[i] = LV.cliff + (x + y < 3 ? 6 : 0); map.block[i] = 1; map.v[i] = FL.stone; continue; }   // the rock the keep is built against
    if (inCourtyard(x, y)) { map.v[i] = rng.chance(0.08) ? FL.moss : rng.chance(0.05) ? FL.slate : FL.flag; continue; }
    // the field: churned earth and mud near the walls, trampled grass further out, the edge of the map closed
    const d = Math.min(Math.abs(x - LINE), Math.abs(y - LINE)), n = Math.sin(x * 0.37 + seed * 1e-4) + Math.cos(y * 0.29 - x * 0.11);
    map.v[i] = d < 3 ? FL.dirt : n > 1.5 ? FL.mud : n > 0.3 ? FL.dirt : n < -1.1 ? FL.gravel : FL.grass;
    if (x >= W - 2 || y >= H - 2) map.block[i] = 1;
  }
  // soft seams between the field's materials (the Forsaken Wilds' transitions: world/overworld.js)
  const MATS = ['grass', 'gravel', 'dirt', 'mud'], pairs = Object.keys(A.town.meta.transitions), mat = map.v.slice();
  const field = (x, y) => x >= 0 && y >= 0 && x < W && y < H && !hgt[I(x, y)] && !inCourtyard(x, y) && !inGate(x, y) && mat[I(x, y)] < 4;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!field(x, y)) continue;
    const i = I(x, y), m = mat[i], s = [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]].map(([a, b]) => (field(a, b) ? mat[I(a, b)] : 99));
    let n = 99; for (const v of s) if (v < m && v < n) n = v;
    if (n === 99) continue;
    const [l, r, u, d] = s.map((v) => v === n);
    const shape = l && !r && !u && !d ? 0 : r && !l && !u && !d ? 1 : u && !d && !l && !r ? 2 : d && !u && !l && !r ? 3 : l && u && !r && !d ? 4 : r && d && !l && !u ? 5 : l && d && !r && !u ? 6 : r && u && !l && !d ? 7 : -1;
    const pair = pairs.indexOf(MATS[n] + '__' + MATS[m]);
    map.v[i] = shape < 0 || pair < 0 ? n : 6 + pair * 8 + shape;
  }
  for (const g of GATES) for (let k = 0; k < 3; k++) { const [x, y] = g.axis === 'x' ? [g.a0 + k, RING.Y1 - 1] : [RING.X1 - 1, g.a0 + k]; map.v[I(x, y)] = FL.grate; }
  Object.assign(map, { hgt, faceArt, faceBand, climb: 4, drop: 10, walkStep: 4, tallOcclusion: true, baseLevel: 0, noSky: true, flowRange: 96,
    minLevel: 0, maxLevel: LV.cliff + 6, siege: true });

  // ---- props
  const props = [], buildings = [], keep = new Set();
  const reserve = (x, y, r) => { for (let yy = Math.floor(y - r); yy <= y + r; yy++) for (let xx = Math.floor(x - r); xx <= x + r; xx++) if (Math.hypot(xx + 0.5 - x, yy + 0.5 - y) <= r) keep.add(I(xx, yy)); };
  reserve(...KEEP.start, 2.5); reserve(...KEEP.banner, 2.2); reserve(...KEEP.exit, 2.5); reserve(...KEEP.portal, 1.6);
  for (const b of BALLISTAE) reserve(...b.foot, 1.8);
  for (const g of GATES) {   // the passage and a lane each side of it
    const c = g.a0 + 1.5;
    for (let s = -7; s <= 7; s += 0.5) { const [x, y] = g.axis === 'x' ? [c, LINE + s] : [LINE + s, c]; reserve(x, y, 2.6); }
  }
  const free = (x, y, r = 0.4) => map.circleFree(x, y, r) && !keep.has(I(Math.floor(x), Math.floor(y)));
  const put = (spr, x, y, k, o = {}) => { if (!spr) return null; const p = { kind: 'scatter', x, y, spr, k, flip: !!o.flip, z: 0, fixedK: true, light: o.light || 0 }; props.push(p); if (o.solid) map.block[I(Math.floor(x), Math.floor(y))] = 1; return p; };
  const scat = new Map(castleFrames('scatter').map((f) => [f.id.replace(/^scatter_\d+_/, ''), f.id]));
  const C = (name, x, y, o = {}) => { const spr = scat.has(name) && castleObject(scat.get(name)); return spr && put(spr, x, y, (PH[name] || 30) / spr.h, o); };
  const KP = (name, x, y, o = {}) => { const s = keepSprite(name); return s && put(s.spr, x, y, s.k * (o.scale || 1), o); };
  const T = (name, x, y, o = {}) => { const spr = townObject(name) || overworldObject(name); return spr && put(spr, x, y, K * (spr.pixelScale || 1) * (o.scale || 1), o); };
  // town buildings in the north of the courtyard: the barracks and the armoury
  for (const [name, x0, y0] of [['b_inn', 11, 5], ['b_armor', 23, 5]]) {
    const spr = townObject(name);
    if (!spr) continue;
    for (let y = y0; y < y0 + 3; y++) for (let x = x0; x < x0 + 3; x++) map.block[I(x, y)] = 1;
    buildings.push({ cx: x0 + 1.5, cy: y0 + 1.5, spr, k: K * 1.5, depth: x0 + y0 + 3, flip: false, name: name.slice(2), x0, y0, entryAxis: 'y' });
  }
  // the courtyard: the garrison's stores, braziers and a war table, all off the lanes
  const braziers = [[7.5, 27.5], [28.5, 27.5], [28.5, 9.5], [15.5, 15.5], [22.5, 15.5], [7.5, 15.5]];
  for (const [x, y] of braziers) if (free(x, y)) KP('brazier_ash', x, y, { light: 5 }) || C('empty_brazier', x, y, { light: 5 });
  const yard = [['war_map_table', 'K', true], ['armory_barrel', 'K', true], ['cannonball_pile', 'K'], ['weapon_chest', 'K', true], ['spear_bundle', 'C', true],
    ['arrow_bundle', 'C', true], ['crossbow_rack', 'C', true], ['leaned_shields', 'C'], ['water_cask', 'C', true], ['stretcher', 'C'], ['medicine_box', 'C'],
    ['sandbags', 'C'], ['crate_stack', 'C', true], ['firewood_stack', 'C', true], ['stone_blocks', 'C', true], ['mortar_trough', 'C'], ['guard_stool', 'C']];
  for (let n = 0, t = 0; n < 22 && t < 400; t++) {
    const x = rng.int(RING.IN0 + 1, RING.IN1 - 2) + 0.5, y = rng.int(RING.IN0 + 1, RING.IN1 - 2) + 0.5;
    if (!free(x, y, 0.45) || !free(x + 1, y) || !free(x - 1, y) || !free(x, y + 1) || !free(x, y - 1)) continue;
    const [name, pack, solid] = yard[n % yard.length];
    if ((pack === 'K' ? KP : C)(name, x, y, { solid, flip: rng.chance(0.5) })) n++;
  }
  // the field: the siege lines (stakes and barricades facing the walls), the camp's tents and wrecked engines, the dead of
  // earlier assaults, and dead trees round the edge
  for (let n = 0, t = 0; n < 14 && t < 300; t++) {
    const x = rng.int(38, 60) + 0.5, y = rng.int(38, 60) + 0.5;
    if (Math.hypot(x - 50, y - 50) > 10 || !free(x, y, 0.6)) continue;
    if (n < 6) put(castleTent(n % 3), x, y, 0.55, { solid: true }); else if (n < 8) KP('siege_cannon_wreck', x, y, { solid: true, flip: rng.chance(0.5) }); else C(rng.pick(['stone_firepit', 'crate_stack', 'firewood_stack', 'banner_pole']), x, y, { solid: true });
    n++;
  }
  // the siege lines: broken rows of stakes and barricades a stone's throw off each front, gaps left at the gates
  for (const along of [true, false]) {
    const v = rng.range(42, 45);
    for (let u = 4.5; u < 58; u += rng.range(0.9, 1.4)) {
      if (rng.chance(0.3)) { u += rng.range(1.5, 3.5); continue; }   // a gap
      const [x, y] = along ? [u, v + rng.range(-0.25, 0.25)] : [v + rng.range(-0.25, 0.25), u];
      if (free(x, y, 0.45)) C(rng.chance(0.7) ? 'sharpened_stakes' : rng.pick(['timber_barricade', 'wicker_barricade']), x, y, { solid: true, flip: rng.chance(0.5) });
    }
  }
  const debris = ['ow_bone_pile', 'ow_bone_pile', 'ow_discarded_shield', 'ow_fallen_banner', 'broken_lance', 'smashed_heraldic_shield', 'cracked_tile_rubble', 'toppled_column', 'rubble_pile', 'small_rubble'];
  for (let n = 0, t = 0; n < 34 && t < 800; t++) {
    const x = rng.range(3, 61), y = rng.range(3, 61);
    if (insideKeep(x, y) || !free(x, y, 0.3)) continue;
    const name = rng.pick(debris);
    (name.startsWith('ow_') ? T(name, x, y, { flip: rng.chance(0.5) }) : KEEP_H[name] ? KP(name, x, y, { flip: rng.chance(0.5) }) : C(name, x, y)) && n++;
  }
  for (let n = 0, t = 0; n < 34 && t < 600; t++) {
    const e = rng.int(0, 1), u = rng.range(37, 62), x = e ? 62 + rng.range(-0.4, 1.2) : u, y = e ? u : 62 + rng.range(-0.4, 1.2);
    if (T(rng.pick(['t_dead_oak', 't_storm_deadwood', 't_dead_thorn', 't_crooked_oak']), x, y, { flip: rng.chance(0.5) })) n++;
  }
  // the gate winches (repairs) and rubble against the walls
  for (const g of GATES) {
    const [x, y] = g.axis === 'x' ? [g.a0 - 0.9, RING.IN1 - 1.4] : [RING.IN1 - 1.4, g.a0 - 0.9];
    keep.add(I(Math.floor(x), Math.floor(y)));
  }

  // ---- monsters: the waves are spawned by the run; their looks are chosen now so their art loads with the level
  const looks = rollLooks(biome, rng.fn());
  const roster = ['skeleton', 'zombie', 'archer', 'ghoul', 'cultist', 'knight', 'wraith', 'imp', 'golem', 'abomination'].filter((a) => (biome.roster || []).includes(a));
  for (const a of roster) looks.pick(a);
  const boss = looks.boss(['knight', 'abomination', 'golem', 'skeleton']);
  // spawn points the field can reach: the far bands, checked against the courtyard
  const seen = new Uint8Array(N), q = [I(Math.floor(KEEP.start[0]), Math.floor(KEEP.start[1]))]; seen[q[0]] = 1;
  for (let a = 0; a < q.length; a++) {
    const i = q[a], x = i % W, y = (i / W) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const j = I(x + dx, y + dy); if (map.walkableTile(x + dx, y + dy) && !seen[j] && map.stepOk(i, j)) { seen[j] = 1; q.push(j); } }
  }
  const spawnPts = [];
  for (const [x0, y0, x1, y1] of SPAWN_BANDS) for (let n = 0, t = 0; n < 10 && t < 200; t++) {
    const x = rng.int(x0, x1) + 0.5, y = rng.int(y0, y1) + 0.5;
    if (seen[I(Math.floor(x), Math.floor(y))] && map.circleFree(x, y, 0.5)) { spawnPts.push([x, y]); n++; }
  }
  for (const p of [KEEP.exit, KEEP.banner, ...BALLISTAE.map((b) => b.foot), ...GATES.map((g) => (g.axis === 'x' ? [g.a0 + 1.5, LINE + 3] : [LINE + 3, g.a0 + 1.5]))])
    if (!seen[I(Math.floor(p[0]), Math.floor(p[1]))]) throw new Error('Endless Siege: unreachable ' + p.join(',') + '; seed ' + seed);
  if (spawnPts.length < 8) throw new Error('Endless Siege: too few spawn points; seed ' + seed);
  const chests = [{ x: 5.5, y: 5.5, rare: rng.chance(0.25) }, { x: 50.5 + rng.range(-1, 1), y: 50.5 + rng.range(-1, 1), rare: true }]
    .map((c) => { const [x, y] = map.randomNear(c.x, c.y, 1.5, rng.fn()); return { ...c, x, y }; });
  return { map, props, buildings, wallHangings: [], townTiles: tiles, looks, spawns: [], chests, torches: [],
    start: KEEP.start, exit: KEEP.exit, townPortal: KEEP.portal, spawnPts, roster, boss, braziers, seed, reach: seen };
}
