// CITY STATE PHOBOS (docs/PHOBOS.md, after Bellmourn's docs/PHOBOS-LAYOUT.md): one walled city, the same for every
// hero (PHOBOS_SEED; never rolled). A twelve-sided wall round a tight labyrinth of streets, west (poor, low: the
// Barbican, the Cinder Quarter, the Rookeries, the Wharf on the Slough) to east (rich, high: the Mages' Rise, Dukes'
// Row, the Castle Approach) with the Castle Gate at its east point. The King's Mile winds from the Drawbridge Gate to
// the Castle Gate, bending at every district; Ash Lane, the Low Road and the High Loop hang off it. Houses stand wall
// to wall; about half can be gone into (a door, a room, sometimes a chest). Each district has its square.
import { TileMap } from './map.js';
import { RNG, clamp } from '../core/util.js';
import { finishMap, placeObstacles, wallMounts } from './dungeon.js';
import { wallHangingCount } from '../gfx/wallhangings.js';
import { DISTRICTS } from '../data/phobos.js';
import { townObject } from './town.js';
import { A } from '../core/assets.js';
import { TW } from '../core/view.js';
import { PH_V, TOWN_GROUND, floorV } from '../gfx/phobostex.js';

export const PHOBOS_SEED = 230_1114;
export const PW = 344, PH = 204;
// the city's wall stands in the east of the map; west of it the road in, after Bellmourn's overview (PHOBOS-LAYOUT.md,
// "The east, west to east"): the green Marches, the ridge at Widow's Notch, the winding Chasm, the Sill, the dead moat
// plain, the moat and the drawbridge
const WEST = 96, CX = 128 + WEST, CY = 102, RX = 112, RY = 94;
export const APPROACH_V = PH_V;   // floor variants from here up: the town pack's ground and Phobos's own (gfx/phobostex.js)
const chasmY = (x) => CY + 13 * Math.sin(((x - 44) / 40) * Math.PI * 3);   // north, south, north again; level with the road at both ends
// where each district's square stands (fractions of the wall's radii from its centre), west to east
const SQUARES = {
  barbican: [-0.78, 0.02], cinder: [-0.52, -0.5], rookeries: [-0.5, 0.36], chainmarket: [-0.2, -0.08], wharf: [-0.18, 0.62],
  tanners: [0.14, 0.6], boneyards: [-0.06, -0.7], barracks: [0.22, -0.2], mages: [0.46, -0.6], dukes: [0.5, 0.36], approach: [0.8, 0.0],
};

/** Inside the twelve-sided wall? (a little longer north to south, a flat side square to each gate) */
function inWall(x, y, pad = 0) {
  const dx = (x - CX) / (RX - pad), dy = (y - CY) / (RY - pad), a = Math.atan2(dy, dx), r = Math.hypot(dx, dy);
  const s = Math.PI / 6, k = Math.cos(s / 2) / Math.cos(((a % s) + s) % s - s / 2); // a regular dodecagon's radius at a
  return r <= k;
}

// The plan is laid out west (the road in) to east (the Castle Gate) on a PW x PH grid, then stood on the map turned a
// quarter (the map is PH wide, PW tall): the hero arrives in the lower left of the screen and climbs up and to the right
// to Castle Velscour. I() and R() take plan coordinates to the map's tile index and position.
export const toMap = (x, y) => [y, PW - x];          // a plan position on the map
export const planX = (mx, my) => PW - my;            // and back: how far along the road in (west to east)
export const APPROACH_FLOORS = TOWN_GROUND;
export function generatePhobos(biome, tileset, seed = PHOBOS_SEED) {
  const rng = new RNG(seed), W = PW, H = PH, MW = PH, map = new TileMap(MW, PW), I = (x, y) => (PW - 1 - x) * MW + y, R = toMap;
  const ofI = (i) => [PW - 1 - ((i / MW) | 0), i % MW];   // a map index back to its plan tile
  const inb = (x, y) => x > 1 && y > 1 && x < W - 2 && y < H - 2;
  const set = (x, y, v = 1) => { x |= 0; y |= 0; if (inb(x, y)) map.t[I(x, y)] = v; };
  const rect = (x, y, w, h, v = 1) => { for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) set(xx, yy, v); };
  const disc = (cx, cy, r, v = 1) => { for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) if (Math.hypot(x + 0.5 - cx, y + 0.5 - cy) <= r) set(x, y, v); };
  const road = new Uint8Array(W * H), keep = new Uint8Array(W * H); // streets kept open; squares, yards and gates
  const lane = (x0, y0, x1, y1, w) => { const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2) + 1; for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0) * i / n, y = y0 + (y1 - y0) * i / n; for (let dy = -(w >> 1); dy < w - (w >> 1); dy++) for (let dx = -(w >> 1); dx < w - (w >> 1); dx++) { const u = Math.round(x + dx), v = Math.round(y + dy); if (inb(u, v)) road[I(u, v)] = 1; } } };
  const path = (pts, w) => { for (let i = 1; i < pts.length; i++) lane(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], w); };
  const sq = Object.fromEntries(Object.entries(SQUARES).map(([k, [fx, fy]]) => [k, [CX + fx * RX, CY + fy * RY]]));

  // the ground inside the wall, and outside it the Sill and the moat plain the hero arrives on (west)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (inWall(x, y, 4)) set(x, y);
  const gateW = [Math.round(CX - RX + 2), CY], gateE = [Math.round(CX + RX - 3), CY];
  // the Marches: open meadow, its edges a forest you can't walk into
  for (let x = 2; x < 46; x++) for (let y = 2; y < H - 2; y++) set(x, y);   // edge to edge: its bounds are the trees, not walls
  // the Chasm through the ridge: snaking north and south, a cart wide at the slots, chambers between
  for (let x = 44; x < 84; x++) { const c = chasmY(x), w = 1.6 + 1.6 * Math.abs(Math.cos(((x - 44) / 40) * Math.PI * 3)); for (let y = Math.floor(c - w); y <= c + w; y++) set(x, y); }
  for (let x = 44; x < 84; x++) for (let y = Math.floor(chasmY(x)) - 1; y <= chasmY(x + 1) + 1; y++) set(x, y);   // no gaps where it turns
  disc(57, chasmY(57), 4.2); disc(72, chasmY(72), 4.6);
  disc(86, CY, 6);                              // the Sill: the Chasm's mouth, first sight of the walls
  rect(88, CY - 16, gateW[0] - 8 - 88, 32);     // the moat plain (the moat is the void between it and the wall)
  // the drawbridge's causeway through the wall (and the gatehouse's bent passage)
  rect(gateW[0] - 10, CY - 2, 20, 5); rect(gateW[0] + 8, CY - 6, 5, 13);
  for (let x = gateW[0] - 8; x < gateW[0] + 12; x++) for (let y = CY - 2; y <= CY + 2; y++) keep[I(x, y)] = 1;

  // ---- the streets: the King's Mile bending through every district's square, and the three loops
  const order = ['barbican', 'chainmarket', 'rookeries', 'wharf', 'tanners', 'barracks', 'dukes', 'mages', 'approach'];
  path([[gateW[0] + 10, CY], ...order.map((k) => sq[k]), gateE], 4);                    // the King's Mile
  path([sq.barbican, sq.cinder, sq.boneyards, sq.barracks], 3);                           // Ash Lane
  path([sq.barbican, sq.rookeries, sq.wharf, sq.tanners], 3);                             // the Low Road
  path([sq.boneyards, sq.mages, sq.approach, sq.dukes, sq.tanners], 3);                   // the High Loop
  path([sq.chainmarket, sq.boneyards], 3); path([sq.chainmarket, sq.barracks], 3);
  // alleys: a loose web of narrow lanes so no block is an island
  for (let k = 0; k < 70; k++) {
    let x = CX + rng.range(-RX, RX) * 0.9, y = CY + rng.range(-RY, RY) * 0.9;
    if (!inWall(x, y, 8)) continue;
    const horiz = rng.chance(0.5), len = rng.int(14, 34);
    for (let s = 0; s < len; s++) { if (rng.chance(0.08)) { x += horiz ? 0 : (rng.chance(0.5) ? 1 : -1); y += horiz ? (rng.chance(0.5) ? 1 : -1) : 0; } horiz ? x++ : y++; if (inWall(x, y, 6)) road[I(x | 0, y | 0)] = 1, road[I((x | 0) + (horiz ? 0 : 1), (y | 0) + (horiz ? 1 : 0))] = 1; }
  }
  // the squares, the parade ground, the market, the grave rows' open ground
  const squares = {};
  for (const d of DISTRICTS) {
    const [x, y] = sq[d.id], r = d.id === 'barracks' ? 11 : d.id === 'chainmarket' ? 9 : d.id === 'approach' ? 8 : 6.5;
    squares[d.id] = { x, y, r };
    for (let yy = Math.floor(y - r); yy <= y + r; yy++) for (let xx = Math.floor(x - r); xx <= x + r; xx++) if (Math.hypot(xx + 0.5 - x, yy + 0.5 - y) <= r && inb(xx, yy)) keep[I(xx, yy)] = 1;
  }
  // the Castle Approach's last climb to the Castle Gate
  for (let x = Math.round(sq.approach[0]); x < gateE[0] + 3; x++) for (let y = CY - 3; y <= CY + 3; y++) keep[I(x, y)] = 1;

  // ---- the district each tile belongs to (nearest square, weighted), for ground, foes and the map
  const dist = new Uint8Array(W * H).fill(255);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!map.t[I(x, y)]) continue;
    let best = 0, bd = 1e9;
    DISTRICTS.forEach((d, k) => { const [a, b] = sq[d.id], q = (x - a) ** 2 + ((y - b) * 1.1) ** 2; if (q < bd) { bd = q; best = k; } });
    dist[I(x, y)] = x < gateW[0] - 6 ? 255 : x < gateW[0] + 4 ? 0 : best;   // (the road in belongs to no ward)
  }

  // ---- the Slough: the canal running north to south through the west, bridged where the streets cross
  const slough = (y) => CX - RX * 0.33 + Math.sin(y / 17) * 5;
  for (let y = 0; y < H; y++) { const x0 = Math.round(slough(y)); for (let x = x0; x < x0 + 3; x++) if (map.t[I(x, y)] && !road[I(x, y)] && !keep[I(x, y)]) set(x, y, 0); }

  // ---- the houses: blocks set wall to wall on a jittered grid, leaving the streets; half of them hollow (enterable)
  const houses = [], solid = new Uint8Array(W * H);
  const free = (x, y, w, h) => { for (let yy = y - 1; yy < y + h + 1; yy++) for (let xx = x - 1; xx < x + w + 1; xx++) { if (!inb(xx, yy) || !map.t[I(xx, yy)] || road[I(xx, yy)] || keep[I(xx, yy)]) return false; } return true; };
  for (let y = 6; y < H - 8; y += 4) for (let x = gateW[0] + 6; x < W - 8; x += 4) {
    const d = DISTRICTS[dist[I(x, y)]] || DISTRICTS[0];
    const rich = d.ground === 'rich' || d.id === 'dukes', poor = d.ground === 'slums' || d.ground === 'cinder';
    const w = rng.int(poor ? 4 : 5, rich ? 10 : 8), h = rng.int(poor ? 4 : 5, rich ? 9 : 7), ox = x + rng.int(-1, 1), oy = y + rng.int(-1, 1);
    if (!free(ox, oy, w, h) || (d.id === 'cinder' && rng.chance(0.35)) || (d.id === 'boneyards' && rng.chance(0.4))) continue;
    const hollow = w >= 6 && h >= 6 && rng.chance(rich ? 0.2 : poor ? 0.12 : 0.15);   // most stand shut: a city of roofs, not of rooms
    if (!hollow) { houses.push({ x: ox, y: oy, w, h, district: d.id, solid: true, rich, poor }); for (let yy = oy; yy < oy + h; yy++) for (let xx = ox; xx < ox + w; xx++) solid[I(xx, yy)] = 1; continue; }
    rect(ox, oy, w, h, 0);
    const hs = { x: ox, y: oy, w, h, district: d.id, hollow };
    if (hollow) {
      rect(ox + 1, oy + 1, w - 2, h - 2, 1);
      // a door onto whichever side meets a street
      const sides = [[ox + (w >> 1), oy - 1, ox + (w >> 1), oy], [ox + (w >> 1), oy + h, ox + (w >> 1), oy + h - 1], [ox - 1, oy + (h >> 1), ox, oy + (h >> 1)], [ox + w, oy + (h >> 1), ox + w - 1, oy + (h >> 1)]];
      const s = sides.find(([a, b]) => map.t[I(a, b)]) || sides[0];
      set(s[2], s[3]); if (s[0] === s[2]) set(s[2] + 1, s[3]); else set(s[2], s[3] + 1);
      hs.door = [s[2] + 0.5, s[3] + 0.5]; hs.mx = ox + w / 2; hs.my = oy + h / 2;
    }
    houses.push(hs);
    // the Bone Yards' grave rows between the charnel houses
    if (d.id === 'boneyards') for (let k = 0; k < 3; k++) { const gx = ox + rng.int(-6, 6), gy = oy + h + 2; if (free(gx, gy, 1, 2)) rect(gx, gy, 1, 2, 0); }
  }
  // the wall's towers: drums proud of the curtain round the dodecagon (scenery; the wall itself is the void outside)
  for (let k = 0; k < 24; k++) {
    const a = (k / 24) * Math.PI * 2, x = CX + Math.cos(a) * (RX - 7), y = CY + Math.sin(a) * (RY - 7);
    if (Math.abs(y - CY) < 10) continue; // not over a gate
    for (let yy = Math.floor(y - 2); yy <= y + 2; yy++) for (let xx = Math.floor(x - 2); xx <= x + 2; xx++) if (Math.hypot(xx + 0.5 - x, yy + 0.5 - y) <= 2.3 && !road[I(xx, yy)] && !keep[I(xx, yy)]) set(xx, yy, 0);
  }

  // ---- keep what the Sill reaches
  const reach = new Uint8Array(W * H), q = [I(8, CY)]; reach[q[0]] = 1;
  for (let h = 0; h < q.length; h++) { const i = q[h]; for (const j of [i + 1, i - 1, i + MW, i - MW]) if (!reach[j] && map.t[j]) { reach[j] = 1; q.push(j); } }
  for (let i = 0; i < map.t.length; i++) if (map.t[i] && !reach[i]) map.t[i] = 0;
  const open = houses.filter((h) => h.hollow && reach[I(Math.floor(h.mx), Math.floor(h.my))]);
  const blocks = houses.filter((h) => h.solid && reach[I(h.x, h.y)]);
  // the road in has no walls: off the way it is rough ground (forest, rock, dead stands), solid but open to the eye
  const ridge = new Uint8Array(W * H);
  for (let y = 2; y < H - 2; y++) for (let x = 2; x < gateW[0] - 8; x++) if (!map.t[I(x, y)]) { map.t[I(x, y)] = 1; ridge[I(x, y)] = 1; }

  // rooms for the dressing: the squares (themed floors) and the open houses
  const rooms = [
    ...Object.entries(squares).map(([id, s], idx) => ({ type: 'room', idx, x: Math.floor(s.x - s.r), y: Math.floor(s.y - s.r), w: Math.ceil(s.r * 2), h: Math.ceil(s.r * 2), mx: s.x, my: s.y, district: id })),
    ...open.map((h, k) => ({ type: 'room', idx: 20 + k, x: h.x + 1, y: h.y + 1, w: h.w - 2, h: h.h - 2, mx: h.mx, my: h.my, house: h })),
  ];
  const rotRoom = (r) => { const [mx, my] = R(r.mx, r.my); return { ...r, x: r.y, y: PW - r.x - r.w, w: r.h, h: r.w, mx, my }; };
  for (let j = 0; j < rooms.length; j++) rooms[j] = rotRoom(rooms[j]);
  finishMap(map, tileset, rng, null, rooms, []);
  const props = placeObstacles(map, rooms.filter((r) => r.house && r.w >= 5 && r.h >= 5), tileset, rng, rooms[0]);
  const mounts = wallMounts(map, rng, biome, () => 0.42, 0.3, wallHangingCount(biome)), wild = (o) => planX(o.mountX ?? o.x, o.mountY ?? o.y) < gateW[0] - 8;
  const torches = mounts.torches.filter((t) => !wild(t)), wallHangings = mounts.wallHangings.filter((h) => !wild(h));   // no sconces out in the wilds

  // ---- the ground: cobbled streets, flagged squares, packed earth yards (one base each), worn gutters by the walls
  const bases = tileset.bases, F = tileset.features || [];
  const lumOf = (i) => tileset.floors[i].lum, dark = F.slice().sort((a, b) => lumOf(a) - lumOf(b)).slice(0, Math.max(1, F.length >> 2));
  const inSq = new Uint8Array(W * H);
  for (const s of Object.values(squares)) for (let yy = Math.floor(s.y - s.r); yy <= s.y + s.r; yy++) for (let xx = Math.floor(s.x - s.r); xx <= s.x + s.r; xx++) if (inb(xx, yy) && Math.hypot(xx + 0.5 - s.x, yy + 0.5 - s.y) <= s.r) inSq[I(xx, yy)] = 1;
  // a capital's ground, from the town pack (APPROACH_FLOORS): paved and flagged streets with stone kerbs, paved squares,
  // grass and garden in the yards (packed dirt and mud in the poor wards); only the open houses keep the stone indoors
  const indoor = new Uint8Array(W * H);
  for (const h of open) for (let yy = h.y + 1; yy < h.y + h.h - 1; yy++) for (let xx = h.x + 1; xx < h.x + h.w - 1; xx++) indoor[I(xx, yy)] = 1;
  const V = (n, x, y) => floorV(n, y, PW - 1 - x), RICH = new Set(['mages', 'dukes', 'approach', 'barracks', 'chainmarket']), POOR = new Set(['cinder', 'rookeries', 'wharf', 'barbican']);
  const yards = [];
  for (let i = 0; i < W * H; i++) {
    if (!map.t[i] || indoor[i]) continue;
    const [x, y] = ofI(i); if (x < gateW[0] - 7) continue;   // (the road in is laid below)
    const d = DISTRICTS[dist[i]]?.id, rich = RICH.has(d), poor = POOR.has(d), n = 0.5 + 0.5 * Math.sin(x * 0.31 + Math.sin(y * 0.23) * 2) * Math.cos(y * 0.27 - x * 0.05);
    const kerb = !map.t[i - 1] || !map.t[i + 1] || !map.t[i - MW] || !map.t[i + MW];
    // (Bellmourn's Phobos set: setts for the rich, slum cobbles for the poor, ash in the Cinder, ward paving in the squares)
    if (inSq[i]) map.v[i] = V(d === 'boneyards' ? 'bone_joint_flags' : d === 'wharf' ? 'wharf_deck' : d === 'cinder' ? 'ash_street' : rich ? (n > 0.8 ? 'bridge_ashlar' : 'ward_paving') : 'walk_paving', x, y);
    else if (road[i]) map.v[i] = V(kerb ? 'walk_paving' : d === 'cinder' ? 'ash_street' : rich ? 'rutted_setts' : poor ? 'slum_cobbles' : n > 0.5 ? 'rutted_setts' : 'slum_cobbles', x, y);
    else if (solid[i]) map.v[i] = V(poor ? 'dirt' : 'trampled_verge', x, y);
    else { map.v[i] = V(poor ? (n > 0.6 ? 'mud' : n > 0.3 ? 'dirt' : 'trampled_verge') : d === 'cinder' ? 'ash_clay_ground' : d === 'boneyards' ? 'dead_grass' : n > 0.7 ? 'dense_meadow' : n > 0.25 ? 'grass' : 'trampled_verge', x, y); if (!kerb) yards.push([x, y, rich, poor, d]); }
  }
  void bases; void dark;
  // ---- the solid blocks: rows of the town pack's houses, 3 x 3 apiece, on their own ground
  const buildings = [], k = TW / A.town.meta.tile[0], BS = 1.5;
  const NAMES = { poor: ['cottage', 'cottage', 'stables', 'bakery'], mid: ['cottage', 'bakery', 'inn', 'socket', 'weapons', 'armor'], rich: ['inn', 'enchant', 'gems', 'alchemist', 'gamble'] };
  for (const b of blocks) {
    for (let yy = b.y; yy < b.y + b.h; yy++) for (let xx = b.x; xx < b.x + b.w; xx++) map.block[I(xx, yy)] = 1;
    const names = NAMES[b.rich ? 'rich' : b.poor ? 'poor' : 'mid'];
    for (let y0 = b.y; y0 + 3 <= b.y + b.h; y0 += 3) for (let x0 = b.x; x0 + 3 <= b.x + b.w; x0 += 3) {
      if (b.district === 'cinder' && rng.chance(0.3)) continue;   // burnt-out plots
      const name = rng.pick(names), spr = townObject('b_' + name); if (!spr) continue;
      const [cx, cy] = R(x0 + 1.5, y0 + 1.5);
      buildings.push({ cx, cy, spr, k: k * BS, depth: cx + cy, flip: rng.chance(0.5), name, sx: rng.chance(0.5), x0: y0, y0: PW - x0 - 3 });
    }
  }
  // ---- set pieces: each square dressed for its ward, the moat plain strewn with the siege's leavings
  const xy = (x, y) => { const [a, b] = R(x, y); return { x: a, y: b }; };
  const tprop = (name, x, y, solidP = true) => {
    const spr = townObject(name), i = I(x | 0, y | 0);
    if (!spr || !map.t[i] || map.block[i] || road[i] && !inSq[i]) return false;
    props.push({ kind: 'scatter', ...xy(x, y), spr, k, flip: rng.chance(0.5) }); if (solidP) map.block[i] = 1; return true;
  };
  const DRESS = {
    barbican: ['handcart', 'crate_stack', 'cart_debris', 'closed_barrel'], cinder: ['cart_debris', 'tiles_and_bricks', 'firewood_stack', 'cold_forge'],
    rookeries: ['cart_debris', 'closed_barrel', 'tiles_and_bricks', 'water_bucket'], chainmarket: ['market_table', 'market_table', 'cloth_crate', 'grain_sacks', 'vegetable_basket', 'handcart'],
    wharf: ['water_barrel', 'rope_and_hook', 'crate_stack', 'closed_barrel'], tanners: ['water_barrel', 'horse_trough', 'workbench', 'closed_barrel'],
    boneyards: ['stone_boundary', 'fieldstone_cluster', 'stone_bench'], barracks: ['tool_rack', 'crate_stack', 'anvil_stump', 'arrow_milestone'],
    mages: ['scroll_rack', 'potion_jars', 'stone_bench'], dukes: ['stone_bench', 'potion_jars', 'cloth_crate'], approach: ['arrow_milestone', 'crate_stack', 'stone_bench'],
  };
  for (const d of DISTRICTS) {
    const s = squares[d.id]; if (!s) continue;
    if (d.id !== 'boneyards' && d.id !== 'barracks') tprop('village_well', s.x, s.y);
    const list = DRESS[d.id] || [], n = Math.round(s.r * 1.6);
    for (let j = 0; j < n; j++) { const a = (j / n) * Math.PI * 2 + rng.range(-0.2, 0.2), r = s.r * rng.range(0.55, 0.85); tprop(list[j % list.length], s.x + Math.cos(a) * r, s.y + Math.sin(a) * r); }
  }
  // ---- the road in: green to brown to dead, the trees with it (the forest walls in the Marches)
  const green = (x) => 1 - clamp((x - 30) / 60, 0, 1);          // 1 in the Marches, 0 by the moat
  const LIVE = ['t_ancient_oak', 't_mature_ash', 't_tall_elm', 't_twin_birch', 't_crooked_oak', 't_medium_willow'], DEAD = ['t_dead_oak', 't_storm_deadwood', 't_dead_thorn'];
  const tree = (x, y, g) => { const spr = townObject(rng.chance(g) ? rng.pick(LIVE) : rng.pick(DEAD)); if (spr) { props.push({ kind: 'scatter', ...xy(x, y), spr, k, flip: rng.chance(0.5) }); map.block[I(x | 0, y | 0)] = 1; } };
  // ---- the yards: gardens and trees in the rich wards, sheds and junk in the poor, a little green in all of them
  const GARDEN = ['wildflowers', 'leafy_shrub', 'wildflowers', 'moss_boulder', 'stone_bench'], JUNK = ['closed_barrel', 'firewood_stack', 'cart_debris', 'water_bucket', 'dry_reeds', 'crate_stack'];
  for (const [x, y, rich, poor, d] of yards) {
    const r = rng.next();
    if (r < (rich ? 0.05 : 0.025)) tree(x + 0.5, y + 0.5, d === 'cinder' || d === 'boneyards' ? 0 : poor ? 0.4 : 1);
    else if (r < (rich ? 0.12 : 0.07)) tprop(rng.pick(poor ? JUNK : GARDEN), x + 0.5 + rng.range(-0.2, 0.2), y + 0.5 + rng.range(-0.2, 0.2), false);
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < gateW[0] - 7; x++) {
    const i = I(x, y); if (!map.t[i]) continue;
    // ground in patches, not a checkerboard: two smooth noises pick the grass line and the dead ground's mud and gravel
    const g = green(x), n1 = 0.5 + 0.25 * (Math.sin(x * 0.23 + Math.sin(y * 0.19) * 2.1) + Math.sin(y * 0.21 + x * 0.07)), n2 = 0.5 + 0.5 * Math.sin(x * 0.17 - y * 0.13 + Math.sin(x * 0.05) * 3);
    const gg = g + (n1 - 0.5) * 0.5;
    map.v[i] = gg > 0.62 ? APPROACH_V + (n2 > 0.72 ? 1 : 0) : gg > 0.45 ? APPROACH_V + 2 : V(x > gateW[0] - 24 && n2 > 0.55 ? 'ash_clay_ground' : n2 < 0.3 ? 'dead_grass' : gg > 0.3 ? 'dead_grass' : 'ash_clay_ground', x, y);
    // the Marches' edge: a forest wall, thinning to dead stands toward the ridge
    const edge = x < 46 && (Math.abs(y - CY) > 17 + 5 * Math.sin(x / 6) + 3 * Math.sin(x / 2.3) || x < 4) && !(x > 40 && Math.abs(y - chasmY(x)) < 4);
    if (edge) { map.block[i] = 1; if (Math.abs(y - CY) < 40 && (x + y * 3) % 2 === 0 && rng.chance(0.75)) tree(x + 0.5 + rng.range(-0.3, 0.3), y + 0.5 + rng.range(-0.3, 0.3), g); }
    else if (ridge[i]) {   // the ridge and the plain's margins: rock, scree and dead wood
      map.block[i] = 1; map.v[i] = g > 0.6 ? APPROACH_V + 1 : V(n2 > 0.5 ? 'scree' : 'ash_clay_ground', x, y);
      const py = x < 44 ? CY : x < 84 ? chasmY(x) : CY;
      if (Math.abs(y - py) < 22 && rng.chance(0.3)) {
        const jx = x + 0.5 + rng.range(-0.25, 0.25), jy = y + 0.5 + rng.range(-0.25, 0.25);
        if (rng.chance(0.45)) tree(jx, jy, g * 0.8);
        else { const spr = townObject(g > 0.5 ? rng.pick(['moss_boulder', 'leafy_shrub', 'fieldstone_cluster']) : rng.pick(['fieldstone_cluster', 'fieldstone_cluster', 'thorn_bush', 'dry_reeds', 'stone_boundary'])); if (spr) props.push({ kind: 'scatter', ...xy(jx, jy), spr, k, flip: rng.chance(0.5) }); }
      }
    }
  }
  for (let j = 0; j < 260; j++) {   // what grows (or doesn't) along the way, off the road
    const x = rng.range(4, gateW[0] - 9), y = CY + rng.range(-30, 30), cy = x < 44 ? CY : x < 84 ? chasmY(x) : CY, g = green(x);
    if (Math.abs(y - cy) < (x < 44 ? 3 : 1.6) || Math.hypot(x - 86, y - CY) < 3) continue;
    const i = I(x | 0, y | 0); if (!map.t[i] || map.block[i]) continue;
    if (rng.chance(0.22)) { tree(x, y, g); continue; }
    const pickG = ['wildflowers', 'leafy_shrub', 'moss_boulder', 'wildflowers', 'mushrooms', 'fallen_log'], pickD = ['dry_reeds', 'thorn_bush', 'fieldstone_cluster', 'cart_debris', 'broken_wheel', 'handcart', 'tiles_and_bricks'];
    const name = rng.chance(g) ? rng.pick(pickG) : rng.pick(pickD), spr = townObject(name);
    if (spr) { props.push({ kind: 'scatter', ...xy(x, y), spr, k, flip: rng.chance(0.5) }); if (!/flower|reeds|mushroom|shrub|thorn/.test(name)) map.block[i] = 1; }
  }

  // street spots per district (for packs, folk and respawns)
  const spots = DISTRICTS.map(() => []);
  for (let y = 4; y < H - 4; y += 3) for (let x = gateW[0] + 6; x < W - 4; x += 3) {
    const i = I(x, y); if (map.t[i] && !map.block[i] && reach[i] && dist[i] < 255) spots[dist[i]].push(R(x + 0.5, y + 0.5));
  }
  // the houses and squares onto the map too
  for (const h of open) { const [mx, my] = R(h.mx, h.my); Object.assign(h, { x: h.y, y: PW - h.x - h.w, w: h.h, h: h.w, mx, my, door: h.door && R(...h.door) }); }
  for (const s of Object.values(squares)) Object.assign(s, xy(s.x, s.y));
  const chests = [];
  for (const h of open) if (rng.chance(0.18) && map.walkable(h.mx, h.my)) chests.push({ x: h.mx, y: h.my, rare: rng.chance(0.2) });
  const hubHouse = (dId) => {
    const s = squares[dId];
    return open.filter((h) => h.district === dId).sort((a, b) => Math.hypot(a.mx - s.x, a.my - s.y) - Math.hypot(b.mx - s.x, b.my - s.y))[0] || null;
  };
  return {
    map, rooms, props, chests, torches, wallHangings, buildings, spots, squares, houses: open, district: dist, hubHouse,
    start: R(14.5, CY + 0.5), exit: R(gateE[0] - 0.5, CY + 0.5), castleGate: R(gateE[0] - 0.5, CY + 0.5), gateW: R(...gateW), sill: R(86, CY),
    spawns: [], seed,
  };
}
