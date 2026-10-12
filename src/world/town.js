// The town of Duskhollow: vendors, buildings, props and the dungeon portal.
import { TileMap } from './map.js';
import { RNG } from '../core/util.js';
import { groundTile, buildingSprite } from '../gfx/townart.js';

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

export function makeTownTiles() {
  const tiles = {};
  for (let i = 0; i < 4; i++) tiles[i] = { img: groundTile('grass', 100 + i), sx: 0, sy: 0, w: 192, h: 96 };
  for (let i = 0; i < 2; i++) tiles[10 + i] = { img: groundTile('dirt', 200 + i), sx: 0, sy: 0, w: 192, h: 96 };
  for (let i = 0; i < 2; i++) tiles[20 + i] = { img: groundTile('cobble', 300 + i), sx: 0, sy: 0, w: 192, h: 96 };
  for (let i = 0; i < 2; i++) tiles[30 + i] = { img: groundTile('plaza', 400 + i), sx: 0, sy: 0, w: 192, h: 96 };
  return tiles;
}

export function generateTown(tileset) {
  const rng = new RNG(1337);
  const W = 46, H = 46;
  const map = new TileMap(W, H);
  const set = (x, y, v) => { if (map.inb(x, y)) { map.t[y * W + x] = 1; map.v[y * W + x] = v; } };
  for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) set(x, y, rng.int(0, 3));
  // plaza
  const P = { x0: 18, y0: 18, x1: 31, y1: 31 };
  for (let y = P.y0; y < P.y1; y++) for (let x = P.x0; x < P.x1; x++) set(x, y, 30 + rng.int(0, 1));
  // roads
  for (let x = 4; x < P.x0; x++) for (let y = 23; y < 26; y++) set(x, y, 10 + rng.int(0, 1));
  for (let y = 4; y < P.y0; y++) for (let x = 23; x < 26; x++) set(x, y, 10 + rng.int(0, 1));
  for (let i = 0; i < 12; i++) for (let w = 0; w < 3; w++) { set(P.x1 + i, P.y1 - 2 + i + w - 1, 10 + rng.int(0, 1)); set(P.x1 + i + 1, P.y1 - 2 + i + w - 1, 10 + rng.int(0, 1)); }
  // portal platform
  const portal = { x: 40.5, y: 39.5 };
  for (let y = 37; y < 42; y++) for (let x = 38; x < 43; x++) set(x, y, 20 + rng.int(0, 1));

  // shops: north row (doors face south-west) and west column (doors face south-east)
  const buildings = [];
  const shopSpots = [
    { x0: 13, y0: 6, w: 6, d: 5, door: 'sw' },
    { x0: 20, y0: 6, w: 6, d: 5, door: 'sw' },
    { x0: 28, y0: 6, w: 5, d: 5, door: 'sw' },
    { x0: 35, y0: 7, w: 5, d: 5, door: 'sw', tower: true },
    { x0: 5, y0: 13, w: 5, d: 6, door: 'se' },
    { x0: 5, y0: 27, w: 5, d: 5, door: 'se' },
    { x0: 5, y0: 33, w: 5, d: 5, door: 'se', tower: true },
    { x0: 13, y0: 36, w: 5, d: 5, door: 'sw' },
  ];
  const palettes = [
    { wall: '#8a7a62', roof: '#6a2a1e', style: 'timber' },
    { wall: '#6e6a66', roof: '#3a4a5a', style: 'stone' },
    { wall: '#7a5a40', roof: '#4a2a1a', style: 'stone' },
    { wall: '#5a5070', roof: '#2a1a4a', style: 'stone' },
    { wall: '#8a806a', roof: '#3a5a2a', style: 'timber' },
    { wall: '#6a7a8a', roof: '#1a3a5a', style: 'stone' },
    { wall: '#7a6a5a', roof: '#5a1a3a', style: 'timber' },
    { wall: '#8a6a4a', roof: '#6a4a1a', style: 'timber' },
  ];
  const npcs = [];
  VENDORS.forEach((v, i) => {
    const s = shopSpots[i];
    const spec = { ...s, ...palettes[i], sign: v.sign, chimney: i % 2 === 0, seed: 50 + i, h: s.tower ? 64 : 50 };
    const spr = buildingSprite(spec);
    buildings.push({ x0: s.x0, y0: s.y0, w: s.w, d: s.d, spr, depth: s.x0 + s.y0 + (s.w + s.d) / 2, vendor: v.id });
    for (let y = s.y0; y < s.y0 + s.d; y++) for (let x = s.x0; x < s.x0 + s.w; x++) map.block[y * W + x] = 1;
    const nx = s.door === 'sw' ? s.x0 + s.w / 2 : s.x0 + s.w + 0.9;
    const ny = s.door === 'sw' ? s.y0 + s.d + 0.9 : s.y0 + s.d / 2;
    npcs.push({ vendor: v, x: nx, y: ny });
  });
  // a couple of plain houses
  for (const h of [{ x0: 33, y0: 15, w: 5, d: 4, door: 'sw' }, { x0: 33, y0: 22, w: 4, d: 4, door: 'sw' }, { x0: 22, y0: 36, w: 4, d: 4, door: 'sw' }]) {
    const spec = { ...h, wall: '#7a6a58', roof: '#4a3020', style: rng.chance(0.5) ? 'timber' : 'stone', chimney: true, seed: h.x0 * 7 };
    buildings.push({ x0: h.x0, y0: h.y0, w: h.w, d: h.d, spr: buildingSprite(spec), depth: h.x0 + h.y0 + (h.w + h.d) / 2 });
    for (let y = h.y0; y < h.y0 + h.d; y++) for (let x = h.x0; x < h.x0 + h.w; x++) map.block[y * W + x] = 1;
  }

  // props
  const props = [];
  const blockAt = (x, y) => { map.block[Math.floor(y) * W + Math.floor(x)] = 1; };
  const free = (x, y) => map.walkable(x, y) && map.v[Math.floor(y) * W + Math.floor(x)] < 10;
  props.push({ kind: 'sprite', sprite: 'well', pal: { b: '#4a2e18', m: '#6a6660', k: '#06121a' }, x: 24.5, y: 24.5, px: 2.6 }); blockAt(24.5, 24.5);
  for (const [lx, ly] of [[P.x0 + 0.5, P.y0 + 0.5], [P.x1 - 0.5, P.y0 + 0.5], [P.x0 + 0.5, P.y1 - 0.5], [P.x1 - 0.5, P.y1 - 0.5], [11, 22], [22, 11], [36, 35], [12, 27], [27, 12]]) {
    props.push({ kind: 'sprite', sprite: 'lamp', pal: { c: '#3a2a1a', e: '#ffd070', m: '#2a2a2a' }, x: lx, y: ly, px: 2.6, light: 5 }); blockAt(lx, ly);
  }
  let trees = 0;
  for (let i = 0; i < 400 && trees < 46; i++) {
    const x = rng.range(3, W - 3), y = rng.range(3, H - 3);
    if (!free(x, y) || (x > P.x0 - 2 && x < P.x1 + 2 && y > P.y0 - 2 && y < P.y1 + 2)) continue;
    if (Math.hypot(x - portal.x, y - portal.y) < 4) continue;
    if (npcs.some((n) => Math.hypot(n.x - x, n.y - y) < 2.5)) continue;
    const pine = rng.chance(0.4);
    props.push({ kind: 'sprite', sprite: pine ? 'pine' : 'tree', pal: { a: rng.pick(['#2e5a2a', '#3a6a30', '#4a6a28', '#2a4a30', '#5a5a24']), b: '#4a3020' }, x, y, px: pine ? 3.4 : 3.2, sway: true });
    blockAt(x, y); trees++;
  }
  for (let i = 0; i < 40; i++) {
    const x = rng.range(3, W - 3), y = rng.range(3, H - 3);
    if (!free(x, y)) continue;
    const kind = rng.pick(['bush', 'bush', 'rock', 'barrel', 'crate']);
    props.push({ kind: 'sprite', sprite: kind, pal: { a: '#3a5a2a', b: '#6a4a28', m: '#6a6660' }, x, y, px: 2.4 });
    if (kind !== 'bush') blockAt(x, y);
  }
  // shop dressing
  props.push({ kind: 'sprite', sprite: 'anvil', pal: { m: '#5a5a60' }, x: 30, y: 12.8, px: 2.4 });
  props.push({ kind: 'sprite', sprite: 'cauldron', pal: { c: '#60ff60' }, x: 11.4, y: 19.5, px: 2.4, light: 2.5 });
  props.push({ kind: 'sprite', sprite: 'barrel', pal: { b: '#6a4a28', m: '#5a5a5a' }, x: 14, y: 12.5, px: 2.4 });
  props.push({ kind: 'sprite', sprite: 'crate', pal: { b: '#7a5a30' }, x: 19.2, y: 12.4, px: 2.4 });
  props.push({ kind: 'sprite', sprite: 'banner', pal: { b: '#8a1010', c: '#ffd060', m: '#3a3a3a', g: '#ffd060' }, x: 37.5, y: 37.5, px: 3 });
  props.push({ kind: 'sprite', sprite: 'banner', pal: { b: '#8a1010', c: '#ffd060', m: '#3a3a3a', g: '#ffd060' }, x: 37.5, y: 41.5, px: 3 });
  for (const p of props) if (p.sprite === 'anvil' || p.sprite === 'cauldron') blockAt(p.x, p.y);

  map.buildWalls(tileset, () => rng.next());
  return { map, buildings, npcs, props, portal, start: [24.5, 28] };
}
