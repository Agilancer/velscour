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

export const PHOBOS_SEED = 230_1114;
export const PW = 248, PH = 204;
const CX = 128, CY = 102, RX = 112, RY = 94;
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

export function generatePhobos(biome, tileset, seed = PHOBOS_SEED) {
  const rng = new RNG(seed), W = PW, H = PH, map = new TileMap(W, H), I = (x, y) => y * W + x;
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
  rect(4, CY - 14, gateW[0] - 2, 28);           // the moat plain
  disc(10, CY, 9);                              // the Sill
  // the drawbridge's causeway through the wall (and the gatehouse's bent passage)
  rect(gateW[0] - 6, CY - 2, 16, 5); rect(gateW[0] + 8, CY - 6, 5, 13);
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
    dist[I(x, y)] = x < gateW[0] + 4 ? 0 : best;
  }

  // ---- the Slough: the canal running north to south through the west, bridged where the streets cross
  const slough = (y) => CX - RX * 0.33 + Math.sin(y / 17) * 5;
  for (let y = 0; y < H; y++) { const x0 = Math.round(slough(y)); for (let x = x0; x < x0 + 3; x++) if (map.t[I(x, y)] && !road[I(x, y)] && !keep[I(x, y)]) set(x, y, 0); }

  // ---- the houses: blocks set wall to wall on a jittered grid, leaving the streets; half of them hollow (enterable)
  const houses = [];
  const free = (x, y, w, h) => { for (let yy = y - 1; yy < y + h + 1; yy++) for (let xx = x - 1; xx < x + w + 1; xx++) { if (!inb(xx, yy) || !map.t[I(xx, yy)] || road[I(xx, yy)] || keep[I(xx, yy)]) return false; } return true; };
  for (let y = 6; y < H - 8; y += 4) for (let x = gateW[0] + 6; x < W - 8; x += 4) {
    const d = DISTRICTS[dist[I(x, y)]] || DISTRICTS[0];
    const rich = d.ground === 'rich' || d.id === 'dukes', poor = d.ground === 'slums' || d.ground === 'cinder';
    const w = rng.int(poor ? 4 : 5, rich ? 10 : 8), h = rng.int(poor ? 4 : 5, rich ? 9 : 7), ox = x + rng.int(-1, 1), oy = y + rng.int(-1, 1);
    if (!free(ox, oy, w, h) || (d.id === 'cinder' && rng.chance(0.35)) || (d.id === 'boneyards' && rng.chance(0.4))) continue;
    const hollow = w >= 6 && h >= 6 && rng.chance(rich ? 0.6 : poor ? 0.45 : 0.5);
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
  const reach = new Uint8Array(W * H), q = [I(10, CY)]; reach[q[0]] = 1;
  for (let h = 0; h < q.length; h++) { const i = q[h]; for (const j of [i + 1, i - 1, i + W, i - W]) if (!reach[j] && map.t[j]) { reach[j] = 1; q.push(j); } }
  for (let i = 0; i < map.t.length; i++) if (map.t[i] && !reach[i]) map.t[i] = 0;
  const open = houses.filter((h) => h.hollow && reach[I(Math.floor(h.mx), Math.floor(h.my))]);

  // rooms for the dressing: the squares (themed floors) and the open houses
  const rooms = [
    ...Object.entries(squares).map(([id, s], idx) => ({ type: 'room', idx, x: Math.floor(s.x - s.r), y: Math.floor(s.y - s.r), w: Math.ceil(s.r * 2), h: Math.ceil(s.r * 2), mx: s.x, my: s.y, district: id })),
    ...open.map((h, k) => ({ type: 'room', idx: 20 + k, x: h.x + 1, y: h.y + 1, w: h.w - 2, h: h.h - 2, mx: h.mx, my: h.my, house: h })),
  ];
  finishMap(map, tileset, rng, null, rooms, []);
  const props = placeObstacles(map, rooms.filter((r) => r.house && r.w >= 5 && r.h >= 5), tileset, rng, rooms[0]);
  const { torches, wallHangings } = wallMounts(map, rng, biome, () => 0.42, 0.3, wallHangingCount(biome));

  // street spots per district (for packs, folk and respawns)
  const spots = DISTRICTS.map(() => []);
  for (let y = 4; y < H - 4; y += 3) for (let x = gateW[0] + 6; x < W - 4; x += 3) {
    const i = I(x, y); if (map.t[i] && !map.block[i] && reach[i] && dist[i] < 255) spots[dist[i]].push([x + 0.5, y + 0.5]);
  }
  const chests = [];
  for (const h of open) if (rng.chance(0.18) && map.walkable(h.mx, h.my)) chests.push({ x: h.mx, y: h.my, rare: rng.chance(0.2) });
  const hubHouse = (dId) => {
    const s = squares[dId];
    return open.filter((h) => h.district === dId).sort((a, b) => Math.hypot(a.mx - s.x, a.my - s.y) - Math.hypot(b.mx - s.x, b.my - s.y))[0] || null;
  };
  return {
    map, rooms, props, chests, torches, wallHangings, spots, squares, houses: open, district: dist, hubHouse,
    start: [10, CY], exit: [gateE[0] - 1, CY], castleGate: [gateE[0] - 1, CY], gateW, sill: [10, CY],
    spawns: [], seed,
  };
}
