// The town of Duskhollow: vendors, buildings, props and the dungeon portal.
import { TileMap } from './map.js';
import { RNG } from '../core/util.js';
import { A } from '../core/assets.js';
import { TW } from '../core/view.js';

export const VENDORS = [
  { id: 'weapons', name: 'Garrick Ironhand', title: 'Weaponsmith', sprite: 'barbarian', pal: { hue: 25, sat: 0.6, light: -0.02 }, sign: 'sword', greet: 'Steel for the slaughter. Pick your poison - edges, hafts or bows.' },
  { id: 'armor', name: 'Hilde Stonewall', title: 'Armorer', sprite: 'lancer', pal: { hue: -25, sat: 0.9 }, sign: 'shield', greet: 'The dead hit hard down there. Wear something thicker than hope.' },
  { id: 'upgrade', name: 'Durgan Emberforge', title: 'Blacksmith', sprite: 'dragoon', pal: { hue: 20, sat: 0.7, light: 0.03 }, sign: 'hammer', greet: 'Bring me your gear and your gold. I\'ll hammer both into something better.' },
  { id: 'enchant', name: 'Lysandra the Veiled', title: 'Enchanter', sprite: 'arcane_sorcerer', pal: { hue: 120, sat: 1 }, sign: 'orb', greet: 'Magic is merely a negotiation. Let us renegotiate your equipment.' },
  { id: 'alchemist', name: 'Old Mother Wren', title: 'Alchemist', sprite: 'carrion_witch', pal: { hue: 150, sat: 0.8 }, sign: 'lantern', greet: 'Red for blood, blue for wits, purple for both. Orange... for when you mean it.' },
  { id: 'gems', name: 'Zafir the Lapidary', title: 'Gem Merchant', sprite: 'totem_master', pal: { hue: 200, sat: 0.9 }, sign: 'orb', greet: 'Every stone remembers the light. Three of a kind, and I can make them sing louder.' },
  { id: 'socket', name: 'Brother Anselm', title: 'Jeweler', sprite: 'wizard', pal: { hue: 60, sat: 0.7 }, sign: 'boots', greet: 'A socket is a promise. I can drill your gear - or pry those gems back out.' },
  { id: 'gamble', name: 'Fortunato', title: 'Gambler', sprite: 'bard', pal: { hue: 180, sat: 1 }, sign: 'bow', greet: 'Fortune favours the foolish! Unidentified treasures - who knows what lurks inside?' },
];

// Ground materials in the pack's transition order; a pair's A side is the earlier one.
const MATS = ['grass', 'gravel', 'dirt', 'mud', 'stone', 'concrete'];
const BS = 1.5; // buildings are the pack's 2 x 2 houses drawn 1.5x: a 3 x 3 tile footprint, walls ~1.3 heroes tall

/**
 * The town's ground tiles from the town pack: [{img,sx,sy,w,h}]; 0-5 are the MATS bases, then 8 transition shapes
 * per material pair (6 + pair * 8 + shape, pairs in TPAIRS order).
 */
let TPAIRS = null;
export function makeTownTiles() {
  const t = A.town, m = t.meta, tiles = [];
  const ent = ([x, y]) => ({ img: t.ground, sx: x, sy: y, w: m.tile[0], h: m.tile[1] });
  for (const n of MATS) tiles.push(ent(m.floors[n]));
  TPAIRS = Object.keys(m.transitions);
  for (const p of TPAIRS) for (const r of m.transitions[p]) tiles.push(ent(r));
  return tiles;
}

/** A town-pack object (building, tree, scatter) as a draw rect: {img,sx,sy,w,h,ox,oy} (ox/oy native px from its pivot). */
export function townObject(name) {
  const r = A.town.meta.objects[name];
  return r && { img: A.town.objects, sx: r[0], sy: r[1], w: r[2], h: r[3], ox: r[4], oy: r[5], name };
}

// Vendor shops: a north row (doors on their +y face) and a west row (doors on their +x face) around the plaza.
const SHOPS = {
  weapons: [15.5, 11.5], armor: [19.5, 11.5], upgrade: [23.5, 11.5], enchant: [27.5, 11.5],
  alchemist: [11.5, 15.5], gems: [11.5, 19.5], socket: [11.5, 23.5], gamble: [11.5, 27.5],
};
const HOUSES = [['inn', 11.5, 11.5], ['bakery', 34.5, 15.5], ['stables', 34.5, 25.5], ['cottage', 18.5, 35.5], ['cottage', 26.5, 35.5]];
const DOOR_X = new Set(['alchemist', 'gems', 'socket', 'gamble', 'bakery']); // pack door face NE (+x), else SE (+y)

export function generateTown(tileset) {
  const rng = new RNG(1337);
  const W = 44, H = 44;
  const map = new TileMap(W, H);
  const mat = new Uint8Array(W * H); // MATS index per tile
  map.t.fill(1);
  const paint = (x0, y0, x1, y1, m) => { for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (map.inb(x, y)) mat[y * W + x] = m; };
  // plaza (stone), the road to the portal (dirt), two lanes out of town, a gravel yard around the portal, mud by the stables
  const P = { x0: 14, y0: 14, x1: 30, y1: 30 };
  paint(P.x0, P.y0, P.x1, P.y1, 4);
  paint(14, 30, 30, 31, 1); paint(30, 14, 31, 31, 1); // gravel kerb on the open sides
  for (let i = 0; i < 9; i++) paint(30 + i, 29 + i, 33 + i, 32 + i, 2);
  paint(20, 31, 24, H - 2, 2); paint(31, 20, W - 2, 24, 2);
  paint(36, 36, 42, 42, 1);
  const portal = { x: 39, y: 39 };
  paint(37, 37, 41, 41, 4);
  paint(36, 27, 40, 31, 3);
  const center = { x: 22, y: 22 };

  const buildings = [], npcs = [], props = [], torches = [];
  const k = TW / A.town.meta.tile[0];
  const addBuilding = (name, cx, cy, vendor) => {
    const spr = townObject('b_' + name);
    buildings.push({ cx, cy, spr, k: k * BS, depth: cx + cy, vendor: vendor && vendor.id });
    for (let y = cy - 1.5; y < cy + 1.5; y++) for (let x = cx - 1.5; x < cx + 1.5; x++) map.block[Math.floor(y) * W + Math.floor(x)] = 1;
    // the torch beside the door, lit (the pack's torches are unlit)
    for (const [ox, oy] of A.town.meta.lights['b_' + name] || []) {
      const sx = ox * k * BS, sy = oy * k * BS; // screen offset from the building centre
      const ex = DOOR_X.has(name) ? 1.62 : 0, ey = DOOR_X.has(name) ? 0 : 1.62; // a point just off the wall
      const gx = cx + ex, gy = cy + ey;
      const dx = sx - (gx - cx - (gy - cy)) * TW / 2, dy = sy - (gx - cx + gy - cy) * TW / 4;
      torches.push({ kind: 'flame', x: gx, y: gy, fx: dx, fy: dy, light: 3.4 });
    }
    return DOOR_X.has(name);
  };
  VENDORS.forEach((v) => {
    const [cx, cy] = SHOPS[v.id];
    const dx = addBuilding(v.id, cx, cy, v);
    npcs.push({ vendor: v, x: dx ? cx + 2.3 : cx + 0.75, y: dx ? cy + 0.75 : cy + 2.3 });
  });
  for (const [n, cx, cy] of HOUSES) addBuilding(n, cx, cy);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (map.block[y * W + x] && mat[y * W + x] === 2) mat[y * W + x] = 0;

  // ground tiles: a tile beside a softer material takes the transition with that material on the shared side(s)
  makeTownTiles();
  const at = (x, y) => (map.inb(x, y) ? mat[y * W + x] : mat[Math.min(H - 1, Math.max(0, y)) * W + Math.min(W - 1, Math.max(0, x))]);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const m = at(x, y), sides = [at(x - 1, y), at(x + 1, y), at(x, y - 1), at(x, y + 1)];
    let n = 99;
    for (const s of sides) if (s < m && s < n) n = s;
    let v = m;
    if (n < 99) {
      const [lu, hu, lv, hv] = sides.map((s) => s === n);
      const shape = lu && !hu && !lv && !hv ? 0 : hu && !lu && !lv && !hv ? 1 : lv && !hv && !lu && !hu ? 2 : hv && !lv && !lu && !hu ? 3
        : lu && lv && !hu && !hv ? 4 : hu && hv && !lu && !lv ? 5 : lu && hv && !hu && !lv ? 6 : hu && lv && !lu && !hv ? 7 : -1;
      const pi = TPAIRS.indexOf(MATS[n] + '__' + MATS[m]);
      v = shape < 0 || pi < 0 ? n : 6 + pi * 8 + shape;
    }
    map.v[y * W + x] = v;
  }

  // props
  const S = (name) => townObject(name);
  const blockAt = (x, y) => { map.block[Math.floor(y) * W + Math.floor(x)] = 1; };
  const prop = (name, x, y, block = true, extra) => {
    const spr = S(name);
    if (!spr) return;
    props.push({ kind: 'scatter', x, y, spr, k, flip: rng.chance(0.5), ...extra });
    if (block) blockAt(x, y);
  };
  prop('village_well', center.x, center.y, true, { flip: false });
  // lamps: the catacombs pack's torch stands, lit, around the plaza and along the portal road
  const stand = tileset && tileset.scatter.find((e) => e.name === 'torch_stand');
  for (const [lx, ly] of [[P.x0 + 0.5, P.y1 - 0.5], [P.x1 - 0.5, P.y0 + 0.5], [P.x1 - 0.5, P.y1 - 0.5], [18.5, 18.5], [25.5, 25.5], [18.5, 25.5], [25.5, 18.5], [34, 33], [36.5, 38], [38, 36.5], [21, 38], [38, 21]]) {
    if (stand) props.push({ kind: 'scatter', x: lx, y: ly, spr: stand, k: tileset.k, light: 4.5 });
    blockAt(lx, ly);
  }
  // shop dressing, in front of and beside each shop
  const dress = [
    ['tool_rack', 14.4, 13.6], ['crate_stack', 17.6, 13.6],
    ['closed_barrel', 21.4, 13.6], ['cloth_crate', 18.4, 13.4],
    ['anvil_stump', 25.4, 13.7], ['cold_forge', 22.4, 13.6], ['smith_bellows', 25.6, 10.0],
    ['scroll_rack', 29.4, 13.6],
    ['potion_jars', 13.6, 14.3], ['market_table', 13.6, 17.4],
    ['vegetable_basket', 13.6, 18.3], ['market_table', 13.6, 21.4],
    ['crate_stack', 13.6, 25.4], ['grain_sacks', 13.6, 22.3],
    ['closed_barrel', 13.6, 29.4], ['water_bucket', 13.6, 26.3],
    ['hay_bale', 36.6, 25], ['horse_trough', 36.6, 27.4], ['handcart', 32.2, 27.6], ['hay_bale', 37, 29.4],
    ['firewood_stack', 36.4, 14.2], ['grain_handmill', 32.5, 17.4], ['water_barrel', 36.4, 17.6],
    ['workbench', 20.6, 37.6], ['axe_stump', 24.5, 37.2], ['sawn_stump', 28.6, 37.5],
    ['stone_bench', 17.2, 22], ['stone_bench', 26.8, 22], ['arrow_milestone', 31.5, 31.5],
    ['split_rail_fence', 38.5, 26.5], ['split_rail_fence', 38.5, 28.5],
  ];
  for (const [n, x, y] of dress) if (map.walkable(x, y)) prop(n, x, y, !['water_bucket', 'vegetable_basket'].includes(n));
  // a ring of trees closes the town in; more trees and brush on the grass inside
  const tnames = Object.keys(A.town.meta.objects).filter((n) => n.startsWith('t_'));
  const big = tnames.filter((n) => /large|medium/.test(n) && !/dead/.test(n)), small = tnames.filter((n) => /small/.test(n));
  const free = (x, y, r) => {
    for (let yy = Math.floor(y - r); yy <= Math.floor(y + r); yy++) for (let xx = Math.floor(x - r); xx <= Math.floor(x + r); xx++) {
      if (!map.walkableTile(xx, yy) || mat[yy * W + xx] !== 0) return false;
    }
    return true;
  };
  const nearKey = (x, y, d) => npcs.some((n) => Math.hypot(n.x - x, n.y - y) < d) || Math.hypot(x - portal.x, y - portal.y) < d + 1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const edge = Math.min(x, y, W - 1 - x, H - 1 - y);
    if (edge > 2) continue;
    if (edge < 2) map.block[y * W + x] = 1; // the forest wall
    if ((x + y * 3) % 2 === 0 || edge === 2 && rng.chance(0.5)) props.push({ kind: 'scatter', x: x + 0.5 + rng.range(-0.3, 0.3), y: y + 0.5 + rng.range(-0.3, 0.3), spr: S(rng.pick(big)), k, flip: rng.chance(0.5) });
    if (edge === 2) map.block[y * W + x] = 1;
  }
  let trees = 0;
  for (let i = 0; i < 600 && trees < 34; i++) {
    const x = Math.floor(rng.range(3, W - 3)) + 0.5, y = Math.floor(rng.range(3, H - 3)) + 0.5;
    if (!free(x, y, 1) || nearKey(x, y, 2.5) || (x > P.x0 - 3 && x < P.x1 + 3 && y > P.y0 - 3 && y < P.y1 + 3)) continue;
    prop(rng.pick(rng.chance(0.6) ? big : small), x, y); trees++;
  }
  const brush = ['leafy_shrub', 'thorn_bush', 'dry_reeds', 'wildflowers', 'wildflowers', 'mushrooms', 'moss_boulder', 'fieldstone_cluster', 'hollow_stump', 'fallen_log', 'sawn_stump'];
  for (let i = 0; i < 70; i++) {
    const x = rng.range(3, W - 3), y = rng.range(3, H - 3);
    if (!free(x, y, 0.4) || nearKey(x, y, 1.5)) continue;
    const n = rng.pick(brush);
    prop(n, x, y, /boulder|cluster|stump|log/.test(n));
  }
  props.push(...torches);
  return { map, buildings, npcs, props, portal, center, start: [22, 25.5] };
}
