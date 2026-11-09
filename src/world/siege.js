// THE ENDLESS SIEGE (docs/ENDLESS_SIEGE.md): a 64 x 64 fortress map in one of five variants (`SIEGE_VARIANTS`: the
// Old Keep, a frozen border fort, a burning river town's wall, a mountain pass fortress, a swamp abbey). Each keep's
// curtain is a ring of height-mapped masonry (the Castle's wall faces, gfx/castlewalls.js) with towers on its corners
// (and sometimes between) and flanking its gates; the courtyard lies at the top of the screen (low x + y), the field
// the horde crosses below it (+x, +y), so the walls show their faces to the dead. Behind the keep a rock cliff rises.
// The wall tops are a wall-walk (the Castle's height-map rules, docs/MOUNTAINSIDE.md: a hop up is `climb` 4 levels, a
// drop at most 10): flights of stairs climb from the courtyard, one step a tile, the walk runs along the curtain, the
// gate flanks stand one step over it and the towers (the ballistae's) one more; a parapet (blocked merlons and
// crenels) runs along every edge over the field, so nothing outside can climb up and nothing on top can step off. The
// gate passages are open ground the run (game/siege.js) holds shut against the dead. A variant's `terrain` adds its
// own ground: a river with bridges, ice, the rock of a pass, mire pools.
import { TileMap } from './map.js';
import { RNG } from '../core/util.js';
import { TW } from '../core/view.js';
import { A, biomeTileSet } from '../core/assets.js';
import { townObject, makeTownTiles } from './town.js';
import { overworldObject } from '../gfx/overworldart.js';
import { castleFrames, castleObject, castleRampartTops, castleTent, castleFloorTiles } from '../gfx/castle.js';
import { FACE } from '../gfx/castlewalls.js';
import { rollLooks } from '../data/bestiary.js';
import { BIOME_BY_ID } from '../data/biomes.js';

export const SW = 64, SH = 64;
const K = TW / 160;                       // town-pack tiles are 160 x 80
export const LV = Object.freeze({ wall: 14, step: 18, tower: 22, gate: 18, cliff: 34, merlon: 3 });
/** Every tile of a flight of stairs with its level: [x, y, lv]. A flight is three steps (4, 8, 12 levels) two tiles
 *  wide from its foot step (x, y), rising along (dx, dy) to the walk. */
export const stairTiles = (st) => {
  const out = [];
  for (let k = 0; k < 3; k++) for (let w = 0; w < 2; w++) out.push([st.x + st.dx * k + (st.dx ? 0 : w), st.y + st.dy * k + (st.dx ? w : 0), 4 * (k + 1)]);
  return out;
};
const sm = (x, y, s) => Math.sin(x * 0.37 + s * 1e-4) + Math.cos(y * 0.29 - x * 0.11);   // smooth noise for the ground
const blob = (x, y, s, k = 0.45) => Math.sin(x * k + s * 3e-4) * Math.cos(y * k * 0.9 - s * 7e-4) + Math.sin((x + y) * k * 0.6 + s * 1e-3) * 0.6;

/**
 * The five keeps. LX / LY: the outer lines of the east and south walls (the gates stand on them); the walls are two
 * tiles deep inside them, the courtyard is [4, LX - 2) x [4, LY - 2). Gates: axis 'x' spans x on the south wall, 'y'
 * spans y on the east wall, three tiles from a0. Towers: the four corners, then `towers` (5 x 5, top-left tile);
 * ballistae stand on the towers listed by index (0 NW, 1 NE, 2 SW, 3 SE, 4.. the extras). Stairs: one or more for
 * every stretch of walk the gates cut apart. Roster: the horde's kinds in the order they join the waves (three from the
 * first, two more from the second, the rest from the third); heavy: its Gate-Breakers. Floors: castle-pack floor names (recoloured by `palette`), 'town' for the
 * town pack. `terrain(x, y, seed)`: the variant's own ground outside the keep: 'rock' (a cliff), 'water' (sunk, a
 * river), 'bridge', 'ice' (walkable, the dead slow on it), 'pool' (sunk mire), or null.
 */
export const SIEGE_VARIANTS = Object.freeze([
  { id: 'keep', name: 'The Old Keep', blurb: 'the dead are at the walls of the old keep',
    LX: 35, LY: 35,
    gates: [{ id: 'west', name: 'the West Gate', axis: 'x', a0: 9 }, { id: 'great', name: 'the Great Gate', axis: 'x', a0: 20 }, { id: 'east', name: 'the East Gate', axis: 'y', a0: 15 }],
    towers: [], ballistae: [2, 3, 1],
    stairs: [{ x: 6, y: 22, dx: -1, dy: 0 }, { x: 18, y: 6, dx: 0, dy: -1 }, { x: 17, y: 31, dx: -1, dy: 0 }, { x: 27, y: 31, dx: -1, dy: 0 }],
    keep: { start: [18.5, 23.5], banner: [18.5, 18.5], exit: [8.5, 8.5], portal: [21, 22.8] },
    buildings: [['b_inn', 11, 5], ['b_armor', 23, 5]],
    braziers: [[7.5, 27.5], [28.5, 27.5], [28.5, 9.5], [15.5, 15.5], [22.5, 15.5], [7.5, 15.5]],
    spawnBands: [[8, 57, 58, 61], [57, 8, 61, 56], [40, 40, 58, 58]], camp: [50, 50, 10], stakes: true,
    floors: 'town', trees: ['t_dead_oak', 't_storm_deadwood', 't_dead_thorn', 't_crooked_oak'],
    roster: ['skeleton', 'zombie', 'archer', 'ghoul', 'cultist', 'knight', 'wraith', 'imp'], heavy: ['golem', 'abomination'],
    bossPool: ['knight', 'abomination', 'golem', 'skeleton'], lord: 'Lord of the Endless Siege',
    biome: null, look: { rain: 0.3, night: 0.25 }, twist: null, terrain: () => null },

  { id: 'frost', name: 'The Frozen Border Fort', blurb: 'a border fort in the snow, its field glazed with ice; one wave comes in a blizzard',
    LX: 43, LY: 29,
    gates: [{ id: 'sledge', name: 'the Sledge Gate', axis: 'x', a0: 10 }, { id: 'frost', name: 'the Frost Gate', axis: 'x', a0: 29 }],
    towers: [[19, 25]], ballistae: [2, 4, 3, 1],
    stairs: [{ x: 6, y: 14, dx: -1, dy: 0 }, { x: 21, y: 6, dx: 0, dy: -1 }, { x: 17, y: 25, dx: -1, dy: 0 }, { x: 37, y: 25, dx: -1, dy: 0 }],
    keep: { start: [21.5, 17.5], banner: [21.5, 12.5], exit: [7.5, 7.5], portal: [24, 16.8] },
    buildings: [['b_inn', 12, 5], ['b_stables', 28, 5]],
    braziers: [[8.5, 21.5], [34.5, 21.5], [34.5, 9.5], [15.5, 12.5], [28.5, 12.5], [8.5, 12.5]],
    spawnBands: [[6, 54, 58, 61], [54, 6, 61, 46], [44, 38, 60, 60]], camp: [49, 49, 8], stakes: true,
    floors: { palette: { sat: 0.16, light: 0.24, contrast: 0.78, tint: [236, 244, 255, 0.55] }, tops: { sat: 0.35, light: 0.14, tint: [236, 244, 255, 0.35] },
      yard: ['floor_31_grey_flagstone', 'floor_35_granite_setts', 'floor_34_slate_paving'], field: ['floor_03_trampled_grass', 'floor_08_dry_grass', 'floor_06_shaded_grass', 'floor_12_weathered_limestone'],
      near: 'floor_21_packed_courtyard_earth', ice: 'floor_60_clear_shallow_water', rock: 'floor_32_irregular_limestone' },
    trees: ['t_medium_fir', 't_scots_pine', 't_young_pine', 't_dead_thorn'],
    roster: ['skeleton', 'archer', 'ghoul', 'wraith', 'gargoyle', 'knight'], heavy: ['golem'],
    bossPool: ['knight', 'golem', 'wraith'], lord: 'Marshal of the White Death',
    biome: { el: 'cold', mon: { hue: 180, sat: 0.5, light: 0.08 }, blood: '#9cc4dc', ambient: { type: 'snow', color: '#eef4ff' }, adj: ['Frozen', 'Rimed', 'Frostbitten', 'Hoarfrost'], torch: '#bfe0ff' },
    look: { rain: 0, night: 0.3 }, twist: 'frost',
    terrain: (x, y, s) => (x >= 45 || y >= 31) && blob(x, y, s, 0.42) > 0.85 ? 'ice' : null },

  { id: 'river', name: 'The Burning River Wall', blurb: 'a river town\'s wall by night, its bridges the only ways across; fire-pots stand over the gates',
    LX: 33, LY: 33,
    gates: [{ id: 'bridge', name: 'the Bridge Gate', axis: 'x', a0: 15 }, { id: 'mill', name: 'the Mill Gate', axis: 'y', a0: 12 }],
    towers: [], ballistae: [2, 3, 1],
    stairs: [{ x: 6, y: 16, dx: -1, dy: 0 }, { x: 17, y: 6, dx: 0, dy: -1 }, { x: 24, y: 29, dx: -1, dy: 0 }],
    keep: { start: [16.5, 22.5], banner: [16.5, 17.5], exit: [7.5, 7.5], portal: [19, 21.8] },
    buildings: [['b_bakery', 9, 5], ['b_cottage', 22, 5]],
    braziers: [[7.5, 25.5], [26.5, 25.5], [26.5, 9.5], [12.5, 13.5], [20.5, 13.5]],
    spawnBands: [[4, 46, 60, 61], [46, 4, 61, 44], [44, 44, 60, 60]], camp: [52, 52, 7], stakes: false,
    floors: { palette: { hue: -6, sat: 0.85, light: -0.06, tint: [255, 150, 80, 0.08] }, tops: null,
      yard: ['floor_35_granite_setts', 'floor_36_mossy_cobbles', 'floor_38_chipped_pavers'], field: ['floor_21_packed_courtyard_earth', 'floor_24_cart_ruts', 'floor_28_churned_clay', 'floor_03_trampled_grass'],
      near: 'floor_24_cart_ruts', water: 'floor_52_moat_water_rippled', bridge: 'floor_16_wheel_worn_stone' },
    trees: ['t_medium_willow', 't_twin_birch', 't_dead_oak'],
    roster: ['zombie', 'skeleton', 'archer', 'hound', 'cultist', 'imp'], heavy: ['demon', 'abomination'],
    bossPool: ['demon', 'abomination', 'knight'], lord: 'the Burning Lord',
    biome: { el: 'fire', mon: { hue: 15, sat: 0.95, light: -0.02 }, blood: '#6a1410', ambient: { type: 'ember', color: '#ffb070' }, adj: ['Burning', 'Charred', 'Smouldering', 'Ashen'] },
    look: { rain: 0, night: 0.4 }, twist: 'fire',
    // the river bends round the town in an L, three tiles wide; a bridge carries each gate's road over it
    terrain: (x, y) => {
      const h = y >= 37 && y <= 39 && x <= 39, v = x >= 37 && x <= 39 && y <= 39;
      if (!h && !v) return null;
      return (h && x >= 15 && x <= 17) || (v && y >= 12 && y <= 14) ? 'bridge' : 'water';
    } },

  { id: 'pass', name: 'The Mountain Pass Fortress', blurb: 'a fortress barring a narrow pass, one great gate; rocks fall on the dead in the pass',
    LX: 30, LY: 30,
    gates: [{ id: 'pass', name: 'the Pass Gate', axis: 'x', a0: 14 }],
    towers: [], ballistae: [2, 3],
    stairs: [{ x: 6, y: 14, dx: -1, dy: 0 }, { x: 15, y: 6, dx: 0, dy: -1 }, { x: 10, y: 26, dx: -1, dy: 0 }, { x: 23, y: 26, dx: -1, dy: 0 }],
    keep: { start: [15.5, 19.5], banner: [15.5, 14.5], exit: [7.5, 7.5], portal: [18, 18.8] },
    buildings: [['b_inn', 8, 5], ['b_armor', 19, 5]],
    braziers: [[7.5, 23.5], [23.5, 23.5], [23.5, 9.5], [11.5, 13.5], [19.5, 13.5]],
    spawnBands: [[4, 50, 30, 56], [4, 56, 30, 61]], camp: null, stakes: false,
    floors: { palette: { sat: 0.32, light: 0.01, contrast: 1.04 }, tops: null,
      yard: ['floor_31_grey_flagstone', 'floor_32_irregular_limestone', 'floor_35_granite_setts'], field: ['floor_13_castle_road_gravel', 'floor_18_broken_chips', 'floor_14_pale_quarry_grit', 'floor_17_pebble_gravel'],
      near: 'floor_15_dark_grit', rock: 'floor_14_pale_quarry_grit' },
    trees: ['t_scots_pine', 't_medium_fir', 't_wind_juniper'],
    roster: ['skeleton', 'archer', 'ghoul', 'hound', 'gargoyle', 'knight'], heavy: ['golem'],
    bossPool: ['golem', 'knight'], lord: 'King under the Pass',
    biome: { el: 'phys', mon: { hue: -10, sat: 0.7, light: 0.02 }, ambient: { type: 'dust', color: '#c8c0b0' }, adj: ['Stone', 'Craggy', 'Grim', 'Mountain'] },
    look: { rain: 0.35, night: 0.2 }, twist: 'rockfall',
    // the pass: a winding gully from the gate down to the bottom of the map, rock either side of it
    terrain: (x, y) => {
      if (y < 30) return 'rock';   // (east of the keep)
      const cx = 15.5 + (y > 34 ? 7 * Math.sin((y - 34) / 7) : 0), hw = y < 34 ? 6.5 : 4.6;
      return Math.abs(x + 0.5 - cx) <= hw ? null : 'rock';
    } },

  { id: 'mire', name: 'The Swamp Abbey', blurb: 'an abbey in the fog of a swamp; the dead rise from the mire pools, their lord carries the plague',
    LX: 37, LY: 33,
    gates: [{ id: 'abbey', name: 'the Abbey Gate', axis: 'x', a0: 17 }, { id: 'mire', name: 'the Mire Gate', axis: 'y', a0: 8 }, { id: 'bone', name: 'the Bone Gate', axis: 'y', a0: 21 }],
    towers: [], ballistae: [2, 3, 1],
    stairs: [{ x: 6, y: 16, dx: -1, dy: 0 }, { x: 12, y: 29, dx: -1, dy: 0 }, { x: 32, y: 15, dx: 1, dy: 0 }, { x: 28, y: 29, dx: -1, dy: 0 }],
    keep: { start: [18.5, 20.5], banner: [18.5, 15.5], exit: [7.5, 7.5], portal: [21, 19.8] },
    buildings: [['b_alchemist', 10, 5], ['b_inn', 24, 5]],
    braziers: [[7.5, 26.5], [30.5, 25.5], [30.5, 10.5], [14.5, 14.5], [22.5, 14.5]],
    spawnBands: null, camp: null, stakes: false,
    floors: { palette: { hue: -14, sat: 0.55, light: -0.05, tint: [205, 205, 150, 0.16] }, tops: { hue: -10, sat: 0.6, light: -0.04, tint: [180, 200, 140, 0.18] },
      yard: ['floor_45_mossed_brick', 'floor_39_damp_stone', 'floor_36_mossy_cobbles'], field: ['floor_22_damp_mud', 'floor_27_mud_puddles', 'floor_07_damp_grass', 'floor_04_mossy_lawn'],
      near: 'floor_22_damp_mud', pool: 'floor_54_green_moat_water' },
    trees: ['t_medium_willow', 't_ancient_willow', 't_dead_oak', 't_storm_deadwood'],
    roster: ['zombie', 'ghoul', 'spider', 'worm', 'cultist', 'shroom'], heavy: ['abomination'],
    bossPool: ['abomination', 'zombie'], lord: 'the Plague Abbot',
    biome: { el: 'poison', mon: { hue: 60, sat: 0.7, light: -0.05 }, blood: '#4a5a20', ambient: { type: 'firefly', color: '#b0ff80' }, adj: ['Plagued', 'Bloated', 'Mire-born', 'Festering'], torch: '#c0ff90' },
    look: { rain: 0.5, night: 0 }, fog: 0.36, twist: 'plague',
    // mire pools all over the field, from a few strides off the walls to the far edge
    terrain: (x, y, s) => ((x >= 41 || y >= 37) && blob(x, y, s, 0.55) > 0.95 ? 'pool' : null) },
]);
export const SIEGE_BY_ID = Object.fromEntries(SIEGE_VARIANTS.map((v) => [v.id, v]));

/**
 * A variant's layout, with everything derived from its lines: the inner faces (IX, IY), its towers and ballistae
 * (centre on the tower, foot in the courtyard), and the tests the generator and the run share.
 */
export function siegeLayout(id) {
  const d = SIEGE_BY_ID[id] || SIEGE_VARIANTS[0], { LX, LY } = d, IX = LX - 2, IY = LY - 2;
  const towers = [[1, 1], [LX - 4, 1], [1, LY - 4], [LX - 4, LY - 4], ...d.towers];
  const cx = (4 + IX) / 2, cy = (4 + IY) / 2, sg = (v, c) => (Math.abs(c - v) < 3 ? 0 : Math.sign(c - v));
  const ballistae = d.ballistae.map((t, k) => {
    const at = [towers[t][0] + 2.5, towers[t][1] + 2.5];
    return { id: ['nw', 'ne', 'sw', 'se'][t] || 'mid' + k, at, foot: [at[0] + 3 * sg(at[0], cx), at[1] + 3 * sg(at[1], cy)] };
  });
  const gates = d.gates.map((g) => ({ ...g, line: g.axis === 'x' ? LY : LX, inner: g.axis === 'x' ? IY : IX }));
  const L = { ...d, IX, IY, X0: 2, Y0: 2, IN0: 4, towers, ballistae, gates, stairs: d.stairs };
  L.insideKeep = (x, y) => x < LX && y < LY && x >= 2 && y >= 2;
  L.inCourtyard = (x, y) => x >= 4 && y >= 4 && x < IX && y < IY;
  L.tower = (x, y) => towers.some(([tx, ty]) => x >= tx && x < tx + 5 && y >= ty && y < ty + 5);
  L.wall = (x, y) => x >= 2 && y >= 2 && x < LX && y < LY && (x < 4 || y < 4 || x >= IX || y >= IY);
  L.inGate = (x, y) => gates.find((g) => (g.axis === 'x' ? x >= g.a0 && x < g.a0 + 3 && y >= IY && y < LY : y >= g.a0 && y < g.a0 + 3 && x >= IX && x < LX));
  L.flank = (x, y) => gates.some((g) => {
    const [u, v] = g.axis === 'x' ? [x, y] : [y, x];
    return v >= g.inner - 1 && v < g.line + 1 && ((u >= g.a0 - 2 && u < g.a0) || (u >= g.a0 + 3 && u < g.a0 + 5));
  });
  /** The ground in front of a gate the dead gather on (its centre `out` tiles from the line). */
  L.gateOut = (g, out = 2) => (g.axis === 'x' ? [g.a0 + 1.5, g.line + out] : [g.line + out, g.a0 + 1.5]);
  /** How far (x, y) is out from the curtain's outer lines (0 at a wall's foot). */
  L.outFrom = (x, y) => Math.max(0, x - LX, y - LY);
  return L;
}

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

export function generateSiege(depth, biome, seed, variantId = 'keep') {
  const L = siegeLayout(variantId), V = SIEGE_BY_ID[L.id];
  const { LX, LY, IX, IY, gates: GATES, ballistae: BALLISTAE, keep: KEEP, stairs: STAIRS, insideKeep, inCourtyard, tower, wall, inGate, flank } = L;
  const rng = new RNG(seed), W = SW, H = SH, N = W * H, map = new TileMap(W, H), I = (x, y) => y * W + x;
  const hgt = new Int16Array(N), faceArt = new Uint8Array(N), faceBand = new Int16Array(N);
  map.t.fill(1);
  // ---- floor tiles (map.v is a byte, so every index stays under 256). The Old Keep: the town pack's grounds and their
  // seams; the others: the Castle pack's sixty floors recoloured to the variant's season. Then the keep pack's
  // flagstones and the rampart tops.
  const ks = keepSet(), town = L.floors === 'town';
  const tiles = town ? makeTownTiles().slice(0, 6 + Object.keys(A.town.meta.transitions).length * 8) : castleFloorTiles(L.floors.palette);
  const keepFloor = (name) => {
    const f = ks && ks.floors.find((e) => e.name === name);
    if (!f) return 4;
    tiles.push(f); return tiles.length - 1;
  };
  const cf = (name) => { const k = town ? -1 : tiles.findIndex((f) => f.name === name); return k < 0 ? 4 : k; };
  const FL = { grass: 0, gravel: 1, dirt: 2, mud: 3, stone: 4,
    flag: keepFloor('weathered_gatehouse_flag'), moss: keepFloor('mossline_foundation_stone'), slate: keepFloor('bluegray_bastion_slate'),
    block: keepFloor('rough_battlement_block'), grate: keepFloor('portcullis_floor_grate'), scorch: keepFloor('siege_scorch_paving') };
  const VF = town ? null : { yard: L.floors.yard.map(cf), field: L.floors.field.map(cf), near: cf(L.floors.near), ice: cf(L.floors.ice || L.floors.near),
    water: cf(L.floors.water || L.floors.near), bridge: cf(L.floors.bridge || L.floors.near), rock: cf(L.floors.rock || L.floors.near), pool: cf(L.floors.pool || L.floors.near) };
  const tops = castleRampartTops(town ? null : L.floors.tops), top0 = tiles.length;
  tiles.push(...tops);
  const topAt = (x, y) => (tops.length ? top0 + ((x * 3 + y * 5) % tops.length) : FL.block);   // the slabs in their four turns
  // ---- the variant's own ground outside the keep
  const ter = new Array(N).fill(null), ice = new Uint8Array(N);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (x >= 2 && y >= 2 && !insideKeep(x, y) && !tower(x, y)) ter[I(x, y)] = L.terrain(x, y, seed);
  // the ground right in front of each gate stays open (the dead must get to it), and so do its lanes on a pass
  for (const g of GATES) for (let s = 0; s <= 3; s++) for (let k = -1; k <= 3; k++) {
    const [x, y] = g.axis === 'x' ? [g.a0 + k, g.line + s] : [g.line + s, g.a0 + k], i = I(x, y);
    if (ter[i] !== 'water' && ter[i] !== 'bridge') ter[i] = ter[i] === 'ice' ? 'ice' : null;
  }
  // how far each rock tile lies from open ground outside the keep (8-way steps), for the crags' heights
  const rockD = new Uint8Array(N).fill(99), rq = [];
  for (let i = 0; i < N; i++) { const x = i % W, y = (i / W) | 0; if (x >= 2 && y >= 2 && !ter[i] && !insideKeep(x, y) && !tower(x, y)) { rockD[i] = 0; rq.push(i); } }
  for (let h = 0; h < rq.length; h++) {
    const i = rq[h], x = i % W, y = (i / W) | 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const u = x + dx, v = y + dy, j = I(u, v); if (u >= 0 && v >= 0 && u < W && v < H && ter[j] === 'rock' && rockD[j] > rockD[i] + 1) { rockD[j] = rockD[i] + 1; rq.push(j); } }
  }
  // ---- heights and solids: the curtain, towers and gate flanks are walkable tops; a parapet over the field
  const stairLv = new Map();
  for (const st of STAIRS) for (const [x, y, lv] of stairTiles(st)) stairLv.set(I(x, y), lv);
  const raised = (x, y) => x >= 0 && y >= 0 && x < W && y < H && (tower(x, y) || (wall(x, y) && !inGate(x, y)));
  const fieldAt = (x, y) => x >= 2 && y >= 2 && x < W && y < H && !insideKeep(x, y) && !raised(x, y) && ter[I(x, y)] !== 'rock';
  const parapet = (x, y) => raised(x, y) && (!insideKeep(x, y) || fieldAt(x + 1, y) || fieldAt(x - 1, y) || fieldAt(x, y + 1) || fieldAt(x, y - 1));
  const nextTower = (x, y) => tower(x + 1, y) || tower(x - 1, y) || tower(x, y + 1) || tower(x, y - 1);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = I(x, y);
    if (stairLv.has(i)) { hgt[i] = stairLv.get(i); faceArt[i] = FACE.wall; map.v[i] = FL.block; continue; }
    if (inGate(x, y)) { map.v[i] = FL.block; continue; }
    if (raised(x, y)) {
      // the top: a tower's floor, a gate flank one step over the walk, the walk (a step up where it meets a tower)
      const isT = tower(x, y), isF = !isT && flank(x, y), base = isT ? LV.tower : isF ? LV.gate : nextTower(x, y) ? LV.step : LV.wall;
      faceArt[i] = isT || isF ? FACE.tower : FACE.wall; faceBand[i] = isT || isF ? base - 4 : LV.wall - 2; map.v[i] = topAt(x, y);
      hgt[i] = base;
      // the parapet: merlons and crenels, both blocked (a crenel lets a shot through, not a body)
      if (parapet(x, y)) { hgt[i] = base + ((x + y) % 2 === 0 ? LV.merlon : 0); map.block[i] = 1; }
      continue;
    }
    if (x < 2 || y < 2) { hgt[i] = LV.cliff + (x + y < 3 ? 6 : 0); map.block[i] = 1; map.v[i] = town ? FL.stone : VF.rock; continue; }   // the rock the keep is built against
    if (inCourtyard(x, y)) {
      map.v[i] = town ? (rng.chance(0.08) ? FL.moss : rng.chance(0.05) ? FL.slate : FL.flag) : VF.yard[rng.chance(0.9) ? 0 : rng.chance(0.5) ? 1 : 2];
      continue;
    }
    // the field: churned earth near the walls, the variant's ground further out, the edge of the map closed
    const t = ter[i], d = L.outFrom(x, y), n = sm(x, y, seed);
    if (t === 'rock') {   // crags rising away from the open ground beside them, a step at a time
      hgt[i] = Math.min(LV.cliff, 12 + Math.min(rockD[i], 9) * 4 + Math.round(2 * blob(x, y, seed, 0.7))); map.block[i] = 1; map.v[i] = VF.rock; continue;
    }
    if (t === 'water' || t === 'pool') { hgt[i] = t === 'pool' ? -2 : -3; map.block[i] = 1; map.v[i] = t === 'pool' ? VF.pool : VF.water; continue; }
    if (t === 'bridge') { map.v[i] = VF.bridge; continue; }
    if (t === 'ice') { ice[i] = 1; map.v[i] = VF.ice; continue; }
    if (town) map.v[i] = d < 3 ? FL.dirt : n > 1.5 ? FL.mud : n > 0.3 ? FL.dirt : n < -1.1 ? FL.gravel : FL.grass;
    else map.v[i] = d < 3 ? VF.near : VF.field[n > 1.2 ? 1 : n > 0.1 ? 0 : n < -1 ? 3 : 2];
    if (x >= W - 2 || y >= H - 2) map.block[i] = 1;
  }
  // the ballistae stand in the middle of their towers' tops
  for (const b of BALLISTAE) map.block[I(Math.floor(b.at[0]), Math.floor(b.at[1]))] = 1;
  // the wall-walk's tiles: the run lends them to auto-play as the Castle's `rampartDeck` for a fighter (game/siege.js)
  map.siegeDeck = new Uint8Array(N);
  for (let i = 0; i < N; i++) if (hgt[i] >= LV.wall && hgt[i] < LV.cliff && !map.block[i] && !ter[i]) map.siegeDeck[i] = 1;
  map.siegeIce = ice;
  // soft seams between the field's materials (the Forsaken Wilds' transitions: world/overworld.js; the town pack only)
  if (town) {
    const MATS = ['grass', 'gravel', 'dirt', 'mud'], pairs = Object.keys(A.town.meta.transitions), mat = map.v.slice();
    const field = (x, y) => x >= 0 && y >= 0 && x < W && y < H && !hgt[I(x, y)] && !inCourtyard(x, y) && !inGate(x, y) && mat[I(x, y)] < 4;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (!field(x, y)) continue;
      const i = I(x, y), m = mat[i], s = [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]].map(([a, b]) => (field(a, b) ? mat[I(a, b)] : 99));
      let nn = 99; for (const v of s) if (v < m && v < nn) nn = v;
      if (nn === 99) continue;
      const [l, r, u, dd] = s.map((v) => v === nn);
      const shape = l && !r && !u && !dd ? 0 : r && !l && !u && !dd ? 1 : u && !dd && !l && !r ? 2 : dd && !u && !l && !r ? 3 : l && u && !r && !dd ? 4 : r && dd && !l && !u ? 5 : l && dd && !r && !u ? 6 : r && u && !l && !dd ? 7 : -1;
      const pair = pairs.indexOf(MATS[nn] + '__' + MATS[m]);
      map.v[i] = shape < 0 || pair < 0 ? nn : 6 + pair * 8 + shape;
    }
  }
  for (const g of GATES) for (let k = 0; k < 3; k++) { const [x, y] = g.axis === 'x' ? [g.a0 + k, LY - 1] : [LX - 1, g.a0 + k]; map.v[I(x, y)] = FL.grate; }
  // losBlocks off: sight is the height map's (walls hide the field from the courtyard, the parapet hides nothing from the
  // walk); meleeStep: no blow lands between the walk and the ground under it (monster.js atkRange)
  Object.assign(map, { hgt, faceArt, faceBand, climb: 4, drop: 10, walkStep: 4, tallOcclusion: true, baseLevel: 0, noSky: true, flowRange: 120,
    minLevel: -3, maxLevel: LV.cliff + 6, siege: true, losBlocks: false, meleeStep: 10 });

  // ---- props
  const props = [], buildings = [], keep = new Set();
  const reserve = (x, y, r) => { for (let yy = Math.floor(y - r); yy <= y + r; yy++) for (let xx = Math.floor(x - r); xx <= x + r; xx++) if (Math.hypot(xx + 0.5 - x, yy + 0.5 - y) <= r) keep.add(I(xx, yy)); };
  reserve(...KEEP.start, 2.5); reserve(...KEEP.banner, 2.2); reserve(...KEEP.exit, 2.5); reserve(...KEEP.portal, 1.6);
  for (const b of BALLISTAE) reserve(...b.foot, 1.8);
  for (const st of STAIRS) {   // the flights and their feet
    for (const [x, y] of stairTiles(st)) keep.add(I(x, y));
    reserve(st.x - st.dx * 1.2 + (st.dx ? 0.5 : 1), st.y - st.dy * 1.2 + (st.dx ? 1 : 0.5), 1.5);
  }
  for (const g of GATES) {   // the passage and a lane each side of it
    const c = g.a0 + 1.5;
    for (let s = -7; s <= 7; s += 0.5) { const [x, y] = g.axis === 'x' ? [c, g.line + s] : [g.line + s, c]; reserve(x, y, 2.6); }
  }
  const free = (x, y, r = 0.4) => map.circleFree(x, y, r) && !keep.has(I(Math.floor(x), Math.floor(y)));
  const put = (spr, x, y, k, o = {}) => { if (!spr) return null; const p = { kind: 'scatter', x, y, spr, k, flip: !!o.flip, z: 0, fixedK: true, light: o.light || 0, tree: !!o.tree || !!spr.tree }; props.push(p); if (o.solid) map.block[I(Math.floor(x), Math.floor(y))] = 1; return p; };
  const scat = new Map(castleFrames('scatter').map((f) => [f.id.replace(/^scatter_\d+_/, ''), f.id]));
  const C = (name, x, y, o = {}) => { const spr = scat.has(name) && castleObject(scat.get(name)); return spr && put(spr, x, y, (PH[name] || 30) / spr.h, o); };
  const KP = (name, x, y, o = {}) => { const s = keepSprite(name); return s && put(s.spr, x, y, s.k * (o.scale || 1), o); };
  const T = (name, x, y, o = {}) => { const spr = townObject(name) || overworldObject(name); return spr && put(spr, x, y, K * (spr.pixelScale || 1) * (o.scale || 1), o); };
  // town buildings in the north of the courtyard
  for (const [name, x0, y0] of L.buildings) {
    const spr = townObject(name);
    if (!spr) continue;
    for (let y = y0; y < y0 + 3; y++) for (let x = x0; x < x0 + 3; x++) map.block[I(x, y)] = 1;
    buildings.push({ cx: x0 + 1.5, cy: y0 + 1.5, spr, k: K * 1.5, depth: x0 + y0 + 3, flip: false, name: name.slice(2), x0, y0, entryAxis: 'y' });
  }
  // the courtyard: the garrison's stores, braziers and a war table, all off the lanes
  const braziers = L.braziers;
  for (const [x, y] of braziers) if (free(x, y)) KP('brazier_ash', x, y, { light: 5 }) || C('empty_brazier', x, y, { light: 5 });
  const yard = [['war_map_table', 'K', true], ['armory_barrel', 'K', true], ['cannonball_pile', 'K'], ['weapon_chest', 'K', true], ['spear_bundle', 'C', true],
    ['arrow_bundle', 'C', true], ['crossbow_rack', 'C', true], ['leaned_shields', 'C'], ['water_cask', 'C', true], ['stretcher', 'C'], ['medicine_box', 'C'],
    ['sandbags', 'C'], ['crate_stack', 'C', true], ['firewood_stack', 'C', true], ['stone_blocks', 'C', true], ['mortar_trough', 'C'], ['guard_stool', 'C']];
  const nYard = Math.round(22 * ((IX - 4) * (IY - 4)) / (29 * 29));
  for (let n = 0, t = 0; n < nYard && t < 400; t++) {
    const x = rng.int(5, IX - 2) + 0.5, y = rng.int(5, IY - 2) + 0.5;
    if (hgt[I(Math.floor(x), Math.floor(y))] || !free(x, y, 0.45) || !free(x + 1, y) || !free(x - 1, y) || !free(x, y + 1) || !free(x, y - 1)) continue;   // (never up on a tower's corner)
    const [name, pack, solid] = yard[n % yard.length];
    if ((pack === 'K' ? KP : C)(name, x, y, { solid, flip: rng.chance(0.5) })) n++;
  }
  // the field: the camp's tents and wrecked engines, the siege lines, the dead of earlier assaults, trees
  if (L.camp) {
    const [cx, cy, cr] = L.camp;
    for (let n = 0, t = 0; n < 14 && t < 300; t++) {
      const x = rng.int(cx - cr, cx + cr) + 0.5, y = rng.int(cy - cr, cy + cr) + 0.5;
      if (Math.hypot(x - cx, y - cy) > cr || !free(x, y, 0.6) || ter[I(Math.floor(x), Math.floor(y))]) continue;
      if (n < 6) put(castleTent(n % 3), x, y, 0.55, { solid: true }); else if (n < 8) KP('siege_cannon_wreck', x, y, { solid: true, flip: rng.chance(0.5) }); else C(rng.pick(['stone_firepit', 'crate_stack', 'firewood_stack', 'banner_pole']), x, y, { solid: true });
      n++;
    }
  }
  if (L.stakes) for (const along of [true, false]) {   // broken rows of stakes and barricades off each front, gaps at the gates
    const v = (along ? LY : LX) + rng.range(7, 10);
    for (let u = 4.5; u < 58; u += rng.range(0.9, 1.4)) {
      if (rng.chance(0.3)) { u += rng.range(1.5, 3.5); continue; }   // a gap
      const [x, y] = along ? [u, v + rng.range(-0.25, 0.25)] : [v + rng.range(-0.25, 0.25), u];
      if (free(x, y, 0.45) && !ter[I(Math.floor(x), Math.floor(y))]) C(rng.chance(0.7) ? 'sharpened_stakes' : rng.pick(['timber_barricade', 'wicker_barricade']), x, y, { solid: true, flip: rng.chance(0.5) });
    }
  }
  const debris = ['ow_bone_pile', 'ow_bone_pile', 'ow_discarded_shield', 'ow_fallen_banner', 'broken_lance', 'smashed_heraldic_shield', 'cracked_tile_rubble', 'toppled_column', 'rubble_pile', 'small_rubble'];
  for (let n = 0, t = 0; n < 34 && t < 800; t++) {
    const x = rng.range(3, 61), y = rng.range(3, 61);
    if (insideKeep(x, y) || !free(x, y, 0.3) || ter[I(Math.floor(x), Math.floor(y))] === 'bridge') continue;
    const name = rng.pick(debris);
    (name.startsWith('ow_') ? T(name, x, y, { flip: rng.chance(0.5) }) : KEEP_H[name] ? KP(name, x, y, { flip: rng.chance(0.5) }) : C(name, x, y)) && n++;
  }
  for (let n = 0, t = 0; n < 34 && t < 600; t++) {   // trees round the edge of the map (on a pass: on the rock)
    const e = rng.int(0, 1), u = rng.range(Math.min(LX, LY) + 2, 62), x = e ? 62 + rng.range(-0.4, 1.2) : u, y = e ? u : 62 + rng.range(-0.4, 1.2);
    if (T(rng.pick(L.trees), x, y, { flip: rng.chance(0.5) })) n++;
  }
  if (L.id === 'pass') for (let n = 0, t = 0; n < 40 && t < 900; t++) {   // pines and boulders on the rock along the gully
    const x = rng.range(3, 61), y = rng.range(31, 61), i = I(Math.floor(x), Math.floor(y));
    if (ter[i] !== 'rock' || ![[1, 0], [-1, 0], [0, 1], [2, 0], [-2, 0]].some(([a, b]) => !ter[I(Math.floor(x) + a, Math.floor(y) + b)])) continue;
    T(rng.chance(0.6) ? rng.pick(L.trees) : rng.pick(['moss_boulder', 'fieldstone_cluster']), x, y, { flip: rng.chance(0.5) }) && n++;
  }
  if (L.id === 'mire' || L.id === 'river') for (let n = 0, t = 0; n < (L.id === 'mire' ? 46 : 24) && t < 1200; t++) {   // reeds by the water, willows in the swamp
    const x = rng.range(3, 61), y = rng.range(3, 61), i = I(Math.floor(x), Math.floor(y));
    if (insideKeep(x, y) || ter[i] || !free(x, y, 0.35)) continue;
    const wet = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => ['pool', 'water'].includes(ter[I(Math.floor(x) + a, Math.floor(y) + b)]));
    if (wet) T(rng.pick(['dry_reeds', 'dry_reeds', 'mushrooms']), x, y, { flip: rng.chance(0.5) }) && n++;
    else if (L.id === 'mire' && rng.chance(0.25) && L.outFrom(x, y) > 6) T(rng.pick(L.trees), x, y, { flip: rng.chance(0.5), solid: true }) && n++;
  }
  // the gate winches (repairs) stay clear
  for (const g of GATES) {
    const [x, y] = g.axis === 'x' ? [g.a0 - 0.9, IY - 1.4] : [IX - 1.4, g.a0 - 0.9];
    keep.add(I(Math.floor(x), Math.floor(y)));
  }

  // ---- monsters: the waves are spawned by the run; their looks are chosen now so their art loads with the level
  const looks = rollLooks(biome, rng.fn());
  const roster = [...L.roster, ...L.heavy];
  for (const a of roster) looks.pick(a);
  const boss = looks.boss(L.bossPool);
  // spawn points the field can reach: the far bands (the mire: beside its pools, near and far), checked from the courtyard
  const seen = new Uint8Array(N), q = [I(Math.floor(KEEP.start[0]), Math.floor(KEEP.start[1]))]; seen[q[0]] = 1;
  for (let a = 0; a < q.length; a++) {
    const i = q[a], x = i % W, y = (i / W) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const j = I(x + dx, y + dy); if (map.walkableTile(x + dx, y + dy) && !seen[j] && map.stepOk(i, j)) { seen[j] = 1; q.push(j); } }
  }
  const spawnPts = [], ok = (x, y) => seen[I(Math.floor(x), Math.floor(y))] && !insideKeep(x, y) && map.circleFree(x, y, 0.5);
  if (L.spawnBands) {
    for (const [x0, y0, x1, y1] of L.spawnBands) for (let n = 0, t = 0; n < 10 && t < 200; t++) {
      const x = rng.int(x0, x1) + 0.5, y = rng.int(y0, y1) + 0.5;
      if (ok(x, y)) { spawnPts.push([x, y]); n++; }
    }
  } else {
    const c = [];
    for (let i = 0; i < N; i++) {
      const x = i % W + 0.5, y = ((i / W) | 0) + 0.5;
      if (ter[i] || !ok(x, y) || L.outFrom(x, y) < 6) continue;
      if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => ter[I(Math.floor(x) + a, Math.floor(y) + b)] === 'pool')) c.push([x, y]);
    }
    for (let n = 0; n < 30 && c.length; n++) spawnPts.push(c.splice(rng.int(0, c.length - 1), 1)[0]);
  }
  for (const p of [KEEP.exit, KEEP.banner, ...BALLISTAE.map((b) => b.foot), ...GATES.map((g) => L.gateOut(g, 3))])
    if (!seen[I(Math.floor(p[0]), Math.floor(p[1]))]) throw new Error(`Endless Siege (${L.id}): unreachable ${p.join(',')}; seed ${seed}`);
  if (spawnPts.length < 8) throw new Error(`Endless Siege (${L.id}): too few spawn points; seed ${seed}`);
  // a chest on the north-west tower (a walk round the walls for it), one out in the field
  const far = L.camp ? map.randomNear(L.camp[0] + rng.range(-1, 1), L.camp[1] + rng.range(-1, 1), 1.5, rng.fn()) : spawnPts[rng.int(0, spawnPts.length - 1)];
  const chests = [{ x: 3.5, y: 3.5, rare: rng.chance(0.25) }, { x: far[0], y: far[1], rare: true }];
  return { map, props, buildings, wallHangings: [], townTiles: tiles, looks, spawns: [], chests, torches: [],
    start: KEEP.start, exit: KEEP.exit, townPortal: KEEP.portal, spawnPts, roster, boss, braziers, seed, reach: seen, lay: L, ter,
    variant: { id: V.id, name: V.name, look: V.look } };
}
