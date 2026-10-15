// Procedural dungeon generation: a maze of rooms laid out on a chunk grid.
import { TileMap } from './map.js';
import { RNG, clamp } from '../core/util.js';
import { ARCH } from '../data/enemies.js';
import { rollLooks } from '../data/bestiary.js';

const S = 11; // chunk size in tiles

/** Every fifth depth (but the throne at FINAL_DEPTH) ends in a BOSS ROOM with a raid boss (game/raid.js). */
import { isRaidDepth, FINAL_DEPTH } from '../data/depth.js';
export { isRaidDepth };

// the boss room: an arena east of the maze, reached by a corridor from its far end
const ARENA_W = 30, ARENA_H = 26, ARENA_GAP = 6;

export function generateDungeon(depth, biome, tileset, seed) {
  if (depth === FINAL_DEPTH) return generateThrone(biome, tileset, seed);
  const rng = new RNG(seed);
  const raid = isRaidDepth(depth);
  // a raid level's maze is a little smaller: the boss fight takes the time
  const CW = clamp(4 + Math.floor(depth / 14) + rng.int(0, 1) - (raid ? 1 : 0), 4, 8);
  const CH = clamp(4 + Math.floor(depth / 18) + rng.int(0, 1), 4, 7);
  const W = CW * S + 2 + (raid ? ARENA_GAP + ARENA_W + 2 : 0), H = Math.max(CH * S + 2, raid ? ARENA_H + 6 : 0);
  const map = new TileMap(W, H);
  const ci = (x, y) => y * CW + x;

  // ---- maze over chunks (randomised DFS) + a few loops
  const conn = new Set();
  const ek = (a, b) => (a < b ? a + ',' + b : b + ',' + a);
  const start = { x: 0, y: rng.int(0, CH - 1) };
  if (rng.chance(0.5) && !raid) { start.x = rng.int(0, CW - 1); start.y = rng.chance(0.5) ? 0 : CH - 1; }
  const seen = new Uint8Array(CW * CH);
  const stack = [start];
  seen[ci(start.x, start.y)] = 1;
  while (stack.length) {
    const c = stack[stack.length - 1];
    const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]]
      .map(([dx, dy]) => ({ x: c.x + dx, y: c.y + dy }))
      .filter((n) => n.x >= 0 && n.y >= 0 && n.x < CW && n.y < CH && !seen[ci(n.x, n.y)]);
    if (!nb.length) { stack.pop(); continue; }
    const n = rng.pick(nb);
    seen[ci(n.x, n.y)] = 1;
    conn.add(ek(ci(c.x, c.y), ci(n.x, n.y)));
    stack.push(n);
  }
  for (let y = 0; y < CH; y++) {
    for (let x = 0; x < CW; x++) {
      if (x + 1 < CW && rng.chance(0.1)) conn.add(ek(ci(x, y), ci(x + 1, y)));
      if (y + 1 < CH && rng.chance(0.1)) conn.add(ek(ci(x, y), ci(x, y + 1)));
    }
  }
  const adj = Array.from({ length: CW * CH }, () => []);
  for (const k of conn) { const [a, b] = k.split(',').map(Number); adj[a].push(b); adj[b].push(a); }

  // ---- rooms
  const carve = (x, y) => { if (x > 0 && y > 0 && x < W - 1 && y < H - 1) map.t[y * W + x] = 1; };
  const rooms = [];
  for (let cy = 0; cy < CH; cy++) {
    for (let cx = 0; cx < CW; cx++) {
      const ox = cx * S + 1, oy = cy * S + 1;
      const isStart = cx === start.x && cy === start.y;
      const roll = rng.next();
      let type = roll < 0.62 ? 'room' : roll < 0.8 ? 'cave' : 'small';
      if (isStart) type = 'room';
      let rw, rh, rx, ry;
      if (type === 'small') { rw = rng.int(3, 4); rh = rng.int(3, 4); }
      else { rw = rng.int(5, S - 2); rh = rng.int(5, S - 2); }
      rx = ox + rng.int(1, S - rw - 1); ry = oy + rng.int(1, S - rh - 1);
      if (type === 'cave') {
        const ccx = ox + S / 2, ccy = oy + S / 2;
        const blobs = rng.int(3, 6);
        for (let b = 0; b < blobs; b++) {
          const bx = ccx + rng.range(-2.5, 2.5), by = ccy + rng.range(-2.5, 2.5), br = rng.range(1.8, 3.4);
          for (let y = Math.floor(by - br); y <= by + br; y++) for (let x = Math.floor(bx - br); x <= bx + br; x++) {
            if ((x + 0.5 - bx) ** 2 + (y + 0.5 - by) ** 2 <= br * br && x > ox && y > oy && x < ox + S - 1 && y < oy + S - 1) carve(x, y);
          }
        }
        rx = Math.floor(ccx - 2); ry = Math.floor(ccy - 2); rw = 4; rh = 4;
        for (let y = ry; y < ry + rh; y++) for (let x = rx; x < rx + rw; x++) carve(x, y);
      } else {
        for (let y = ry; y < ry + rh; y++) for (let x = rx; x < rx + rw; x++) carve(x, y);
      }
      rooms.push({ cx, cy, x: rx, y: ry, w: rw, h: rh, type, mx: rx + rw / 2, my: ry + rh / 2, idx: ci(cx, cy) });
    }
  }

  // ---- corridors along maze edges
  for (const k of conn) {
    const [a, b] = k.split(',').map(Number);
    const A = rooms[a], B = rooms[b];
    const wid = rng.chance(0.25) ? 3 : 2;
    const ax = Math.floor(A.mx), ay = Math.floor(A.my), bx = Math.floor(B.mx), by = Math.floor(B.my);
    const horizFirst = rng.chance(0.5);
    const hline = (x0, x1, y) => { for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) for (let w = 0; w < wid; w++) carve(x, y + w - (wid > 2 ? 1 : 0)); };
    const vline = (y0, y1, x) => { for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) for (let w = 0; w < wid; w++) carve(x + w - (wid > 2 ? 1 : 0), y); };
    if (horizFirst) { hline(ax, bx, ay); vline(ay, by, bx); } else { vline(ay, by, ax); hline(ax, bx, by); }
  }

  // ---- distances: exit = farthest chunk from start
  const dist = new Int16Array(CW * CH).fill(-1);
  const q = [ci(start.x, start.y)]; dist[q[0]] = 0;
  while (q.length) { const c = q.shift(); for (const n of adj[c]) if (dist[n] < 0) { dist[n] = dist[c] + 1; q.push(n); } }
  let exitIdx = raid ? ci(CW - 1, 0) : 0;
  for (let i = 0; i < dist.length; i++) if (dist[i] > dist[exitIdx] && (!raid || i % CW === CW - 1)) exitIdx = i;
  const startRoom = rooms[ci(start.x, start.y)];
  const exitRoom = rooms[exitIdx];
  const arena = raid ? carveArena(map, exitRoom, CW, rng) : null;
  // make sure the boss arena is roomy
  if (!raid && (exitRoom.type !== 'room' || exitRoom.w < 7 || exitRoom.h < 7)) {
    const ox = exitRoom.cx * S + 1, oy = exitRoom.cy * S + 1;
    exitRoom.x = ox + 1; exitRoom.y = oy + 1; exitRoom.w = S - 3; exitRoom.h = S - 3; exitRoom.type = 'room';
    exitRoom.mx = exitRoom.x + exitRoom.w / 2; exitRoom.my = exitRoom.y + exitRoom.h / 2;
    for (let y = exitRoom.y; y < exitRoom.y + exitRoom.h; y++) for (let x = exitRoom.x; x < exitRoom.x + exitRoom.w; x++) carve(x, y);
  }

  // a mixed level (assets.js mixedTileSet) paves its far chunks, and a few others, with the second biome's floors
  let region = null;
  if (tileset.split) {
    let far = 0;
    for (let i = 0; i < dist.length; i++) far = Math.max(far, dist[i]);
    const alt = new Uint8Array(CW * CH);
    for (let i = 0; i < alt.length; i++) alt[i] = i !== ci(start.x, start.y) && (dist[i] > far * 0.45) !== rng.chance(0.2) ? 1 : 0;
    region = (i) => alt[ci(clamp(Math.floor((i % W - 1) / S), 0, CW - 1), clamp(Math.floor((Math.floor(i / W) - 1) / S), 0, CH - 1))];
  }
  finishMap(map, tileset, rng, region, arena ? [...rooms, arena] : rooms, arena ? [arena.arch] : []);
  const obstacles = placeObstacles(map, rooms.filter((r) => r !== startRoom && (raid || r !== exitRoom)), tileset, rng, startRoom);

  // ---- spawns
  const spawns = [];
  const roster = biome.roster;
  const rnd = () => rng.next();
  const looks = rollLooks(biome, rnd); // this level's bestiary: which art and palette swap each archetype gets
  const density = 1.1 + Math.min(depth, 120) * 0.013;
  const pickArch = () => {
    // earlier roster entries are a bit more common
    const i = Math.floor(Math.pow(rng.next(), 1.35) * roster.length);
    return roster[i];
  };
  const roomFloorSpot = (r) => {
    for (let i = 0; i < 30; i++) {
      const x = r.x + rng.range(0.6, r.w - 0.6), y = r.y + rng.range(0.6, r.h - 0.6);
      if (map.walkable(x, y)) return [x, y];
    }
    return [r.mx, r.my];
  };
  const packRooms = rooms.filter((r) => r !== startRoom && dist[r.idx] >= 0);
  for (const r of packRooms) {
    const area = r.type === 'cave' ? 28 : r.w * r.h;
    let packs = Math.max(r === exitRoom && !raid ? 0 : 1, Math.round((area / 26) * density * rng.range(0.7, 1.3)));
    if (r.type === 'small') packs = rng.chance(0.5) ? 1 : 0;
    for (let p = 0; p < packs; p++) {
      const arch = pickArch();
      const A = ARCH[arch];
      const [px, py] = roomFloorSpot(r);
      const n = rng.int(A.pack[0], A.pack[1]) + (depth > 30 && rng.chance(0.4) ? 1 : 0);
      spawns.push({ x: px, y: py, arch, n, rank: 'normal', look: looks.pick(arch) });
    }
  }
  // elites
  const champs = 2 + Math.floor(Math.min(depth, 150) / 15), uniques = 1 + Math.floor(Math.min(depth, 150) / 30);
  for (let i = 0; i < champs; i++) {
    const r = rng.pick(packRooms.filter((x) => x !== exitRoom)) || exitRoom;
    const [px, py] = roomFloorSpot(r);
    const arch = pickArch();
    spawns.push({ x: px, y: py, arch, n: rng.int(2, 4), rank: 'champion', look: looks.pick(arch) });
  }
  for (let i = 0; i < uniques; i++) {
    const r = rng.pick(packRooms.filter((x) => x !== exitRoom)) || exitRoom;
    const [px, py] = roomFloorSpot(r);
    const arch = pickArch();
    spawns.push({ x: px, y: py, arch, n: rng.int(3, 5), rank: 'unique', look: looks.pick(arch) });
  }
  // the guardian of the exit, or the raid boss in its arena (game/raid.js picks which)
  const guardian = looks.boss(roster);
  if (arena) spawns.push({ x: arena.cx + 4, y: arena.cy, n: 1, rank: 'raid' });
  else if (guardian) spawns.push({ x: exitRoom.mx, y: exitRoom.my, arch: guardian.arch, n: 1, rank: 'boss', look: guardian.look });
  else spawns.push({ x: exitRoom.mx, y: exitRoom.my, arch: rng.pick(roster.filter((a) => !['bat', 'spider', 'beetle'].includes(a))), n: 1, rank: 'boss' });

  // ---- props, chests, torches
  const props = obstacles;
  if (!tileset.scatter.length) {
    for (const r of rooms) { // placeholder pixel-art decor when the biome has no scatter art
      if (r === startRoom || r === exitRoom || !rng.chance(0.35)) continue;
      const [px, py] = roomFloorSpot(r);
      props.push({ kind: 'decor', x: px, y: py, sprite: rng.pick(['grave', 'rock', 'barrel', 'crate', 'rock']), seed: rng.int(0, 9999) });
    }
  }
  const chests = [];
  const deadEnds = rooms.filter((r) => adj[r.idx].length === 1 && r !== startRoom && r !== exitRoom);
  const nChests = rng.int(1, 3);
  for (let i = 0; i < nChests; i++) {
    const r = deadEnds.length ? deadEnds.splice(rng.int(0, deadEnds.length - 1), 1)[0] : rng.pick(packRooms);
    if (!r) break;
    chests.push({ x: Math.floor(r.mx) + 0.5, y: Math.floor(r.my) + 0.5, rare: rng.chance(0.2) });
  }
  const torches = [];
  const inArena = (s) => arena && s.mx >= arena.x - 0.5 && s.mx <= arena.x + arena.w + 0.5 && s.my >= arena.y - 0.5 && s.my <= arena.y + arena.h + 0.5;
  for (const s of map.segments) {
    if (s.front || rng.next() > (inArena(s) ? 0.3 : 0.07)) continue;
    const ox = s.dir === 'f' ? 0.12 : 0, oy = s.dir === 'b' ? 0.12 : 0;
    torches.push({ x: s.mx + ox, y: s.my + oy, depth: s.depth + 0.01 });
  }

  return {
    map, rooms, spawns, props, chests, torches, looks,
    start: [startRoom.mx, startRoom.my],
    exit: arena ? [arena.x + arena.w - 2.5, arena.cy] : exitPos(map, exitRoom, startRoom),
    bossRoom: arena || exitRoom,
    raid: arena,
  };
}

/**
 * The BOSS ROOM: a chamfered ARENA_W x ARENA_H hall east of the maze with four 2x2 stone pillars (real walls, so
 * they block sight and shots: cover from the boss's cataclysm), reached by a 3-wide corridor from the far room of
 * the maze's last column, under an arch. Returns the arena {x, y, w, h, cx, cy, gate, pillars, arch}.
 */
function carveArena(map, from, CW, rng) {
  const W = map.w, H = map.h;
  const set = (x, y, v) => { if (x > 0 && y > 0 && x < W - 1 && y < H - 1) map.t[y * W + x] = v; };
  const ax = CW * S + 1 + ARENA_GAP, ay = clamp(Math.round(from.my - ARENA_H / 2), 2, H - ARENA_H - 2);
  const cut = 5;
  for (let y = 0; y < ARENA_H; y++) {
    for (let x = 0; x < ARENA_W; x++) {
      const ex = Math.min(x, ARENA_W - 1 - x), ey = Math.min(y, ARENA_H - 1 - y);
      if (ex + ey >= cut) set(ax + x, ay + y, 1);
    }
  }
  const cx = ax + ARENA_W / 2, cy = ay + ARENA_H / 2;
  const pillars = [];
  for (const [dx, dy] of [[-7, -5], [7, -5], [-7, 5], [7, 5]]) {
    const px = Math.floor(cx + dx) - 1, py = Math.floor(cy + dy) - 1;
    for (let y = py; y < py + 2; y++) for (let x = px; x < px + 2; x++) set(x, y, 0);
    pillars.push([px + 1, py + 1]);
  }
  // corridor: east out of the room, down the gap to the arena's middle rows, east into the arena
  const gy = clamp(Math.floor(from.my), ay + cut + 2, ay + ARENA_H - cut - 3);
  const fx = Math.floor(from.mx), fy = Math.floor(from.my), mx = CW * S + 3;
  for (let x = fx; x <= mx + 1; x++) for (let w = -1; w <= 1; w++) set(x, fy + w, 1);
  for (let y = Math.min(fy, gy) - 1; y <= Math.max(fy, gy) + 1; y++) for (let w = -1; w <= 1; w++) set(mx + w, y, 1);
  for (let x = mx; x < ax; x++) for (let w = -1; w <= 1; w++) set(x, gy + w, 1);
  const arch = { axis: 'y', line: ax, a0: gy - 1, a1: gy + 2, kind: 'arch', design: null, flip: rng.chance(0.5) };
  return { type: 'arena', x: ax, y: ay, w: ARENA_W, h: ARENA_H, cx, cy, mx: cx, my: cy, pillars, arch, gate: { x: ax, y0: gy - 1, y1: gy + 1 } };
}

/**
 * Scatter terrain from the biome pack. Objects go mostly against walls, some in the open, never next to a corridor
 * mouth or in the room centre (chests), and any blocking placement that would cut a part of the level off from the
 * start is undone. Every prop takes one tile (the pack's footprints are all under one tile); walk-over props
 * (bones, candles, chains...) don't block.
 */
function placeObstacles(map, rooms, tileset, rng, startRoom) {
  const props = [];
  const scat = tileset.scatter;
  if (!scat.length) return props;
  const W = map.w;
  const sx = Math.floor(startRoom.mx), sy = Math.floor(startRoom.my);
  const reachable = () => {
    const seen = new Uint8Array(map.t.length), q = [sy * W + sx];
    seen[q[0]] = 1;
    let n = 0;
    while (q.length) {
      const i = q.pop(); n++;
      const x = i % W, y = (i / W) | 0;
      for (const j of [i - 1, i + 1, i - W, i + W]) {
        const jx = j % W, jy = (j / W) | 0;
        if (Math.abs(jx - x) + Math.abs(jy - y) === 1 && !seen[j] && map.walkableTile(jx, jy)) { seen[j] = 1; q.push(j); }
      }
    }
    return n;
  };
  let open = reachable();
  const used = new Set();
  const tryBlock = (x, y) => {
    if (!map.walkableTile(x, y)) return false;
    map.block[y * W + x] = 1;
    if (reachable() === open - 1) { open--; return true; }
    map.block[y * W + x] = 0;
    return false;
  };
  const voidAround = (x, y) => [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => !map.tile(x + dx, y + dy)).length;
  // a level shows a dozen or so of the pack's props, so rooms look furnished rather than random
  const pool = shuffleWith(scat.slice(), rng).slice(0, rng.int(10, 16));
  for (const r of rooms) {
    const inRoom = (x, y) => x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h;
    // keep corridor mouths clear: no blocker within two tiles of a floor tile outside the room
    const nearDoor = (x, y) => {
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (map.tile(x + dx, y + dy) && !inRoom(x + dx, y + dy)) return true;
      return false;
    };
    // ...and the room centre, where loot chests go
    const ok = (x, y) => inRoom(x, y) && map.walkableTile(x, y) && !nearDoor(x, y) && !used.has(y * W + x)
      && (Math.abs(x - Math.floor(r.mx)) > 1 || Math.abs(y - Math.floor(r.my)) > 1);
    const cells = [];
    for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) if (ok(x, y)) cells.push([x, y]);
    if (!cells.length) continue;
    const edge = cells.filter(([x, y]) => voidAround(x, y)), mid = cells.filter(([x, y]) => !voidAround(x, y));
    const n = Math.round((cells.length / 7) * rng.range(0.7, 1.3));
    for (let i = 0, tries = 0; i < n && tries < n * 6; tries++) {
      const cs = edge.length && (rng.chance(0.65) || !mid.length) ? edge : mid;
      const [x, y] = rng.pick(cs);
      const e = rng.pick(pool);
      if (!ok(x, y)) continue;
      if (e.block && !tryBlock(x, y)) continue;
      used.add(y * W + x);
      const j = e.block ? 0.08 : 0.25; // walk-over clutter can sit anywhere in its tile
      props.push({ kind: 'scatter', x: x + 0.5 + rng.range(-j, j), y: y + 0.5 + rng.range(-j, j), spr: e, k: tileset.k, flip: rng.chance(0.5), light: LIT[e.name] });
      i++;
    }
  }
  return props;
}

// light radius (tiles) of the props that burn
const LIT = { grave_lantern: 2.2, torch_stand: 3.2, incense_brazier: 3, iron_candelabrum: 2.6, vigil_candles: 2, votive_candles: 2,
  gold_brazier: 3.6, blue_flame_brazier: 3.8, temple_censer: 2.8, burial_lantern: 2.6, sun_torch: 3.2, royal_censer: 3.0 };

function shuffleWith(a, rng) {
  for (let i = a.length - 1; i > 0; i--) { const j = rng.int(0, i); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/**
 * Gaps in a rectangular room's wall where a corridor meets it, flanked by wall on both sides.
 * Three in four get an arch (one spanning 3 tiles for a 2-3 wide gap, so a 2-wide gap's arch overlaps the wall by half a
 * tile each side; 5 or 7 tiles for wider gaps when the pack has them) or, in a 2-wide gap, a pair of doors.
 * See TileMap.buildWalls.
 */
export function archesFor(tileset, n) {
  const span = n + (n % 2 ? 0 : 1), sp = tileset.archSpan || {};
  return Object.keys(tileset.arches || {}).filter((d) => (sp[d] || 3) === span);
}

function findOpenings(map, rooms, tileset, rng) {
  const out = [];
  const arches = Object.keys(tileset.arches || {}), doors = Object.keys(tileset.doors || {});
  if (!arches.length) return out;
  const fl = (x, y) => map.tile(x, y) === 1;
  for (const r of rooms) {
    if (r.type === 'cave' || r.type === 'arena') continue; // the arena's gate arch is placed by carveArena
    const sides = [
      { axis: 'x', line: r.y, lo: r.x, hi: r.x + r.w, inT: (a) => [a, r.y], outT: (a) => [a, r.y - 1] },
      { axis: 'x', line: r.y + r.h, lo: r.x, hi: r.x + r.w, inT: (a) => [a, r.y + r.h - 1], outT: (a) => [a, r.y + r.h] },
      { axis: 'y', line: r.x, lo: r.y, hi: r.y + r.h, inT: (a) => [r.x, a], outT: (a) => [r.x - 1, a] },
      { axis: 'y', line: r.x + r.w, lo: r.y, hi: r.y + r.h, inT: (a) => [r.x + r.w - 1, a], outT: (a) => [r.x + r.w, a] },
    ];
    for (const s of sides) {
      const gap = (a) => fl(...s.inT(a)) && fl(...s.outT(a));
      for (let a = s.lo + 1; a < s.hi - 1; a++) {
        if (!gap(a) || gap(a - 1)) continue;
        let b = a;
        while (b < s.hi && gap(b)) b++;
        const n = b - a;
        // flanked by real wall (room floor inside, void outside) on both ends
        const wall = (t) => t >= s.lo && t < s.hi && fl(...s.inT(t)) && !fl(...s.outT(t));
        const fit = archesFor(tileset, n);
        if (fit.length && wall(a - 1) && wall(b) && rng.chance(0.75)) {
          const door = n === 2 && doors.length && rng.chance(0.35);
          out.push({ axis: s.axis, line: s.line, a0: a, a1: b, kind: door ? 'door' : 'arch', design: rng.pick(door ? doors : fit), flip: rng.chance(0.5) });
        }
        a = b;
      }
    }
  }
  return out;
}

function exitPos(map, room, from) {
  // put the exit on the side of the room farthest from where the player came in
  const dx = room.mx - from.mx, dy = room.my - from.my;
  const fx = Math.abs(dx) > Math.abs(dy) ? Math.sign(dx) : 0, fy = fx ? 0 : Math.sign(dy) || 1;
  let x = room.mx + fx * (room.w / 2 - 1.5), y = room.my + fy * (room.h / 2 - 1.5);
  if (!map.walkable(x, y)) { x = room.mx; y = room.my; }
  return [x, y];
}

/**
 * Floors and walls. Floors are paved like Diablo II: each room in one of the pack's self-seamless materials (most
 * rooms share the level's main one), corridors in another, with a scattering of the pack's feature tiles (drains,
 * seals, mosaics, cracks) picked to match the brightness of the paving around them. A mixed set (assets.js
 * mixedTileSet) holds a second palette's floors after `split`; region(i) = 1 paves tile i with those.
 * Walls come from 2-3 of the pack's wall families, one per straight run, the first most often.
 */
function finishMap(map, tileset, rng, region = null, rooms = [], extra = []) {
  const W = map.w;
  const bases = shuffleWith(tileset.bases.slice(), rng);
  const main = bases[0], hall = bases[1 % bases.length];
  const roomBase = new Int16Array(map.t.length).fill(-1);
  for (const r of rooms) {
    const b = rng.chance(0.7) ? main : rng.pick(bases);
    if (r.type === 'cave') {
      const ox = r.cx * S + 1, oy = r.cy * S + 1;
      for (let y = oy; y < oy + S; y++) for (let x = ox; x < ox + S; x++) roomBase[y * W + x] = b;
    } else for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) roomBase[y * W + x] = b;
  }
  const near = new Map();
  const featuresFor = (b) => {
    if (!near.has(b)) {
      const lum = tileset.floors[b].lum;
      const f = tileset.features.filter((i) => Math.abs(tileset.floors[i].lum - lum) < 0.07);
      near.set(b, f.length >= 4 ? f : tileset.features);
    }
    return near.get(b);
  };
  const sp = tileset.split || 0;
  for (let i = 0; i < map.t.length; i++) {
    if (!map.t[i]) continue;
    const inRoom = roomBase[i] >= 0;
    const b = inRoom ? roomBase[i] : rooms.length ? hall : main;
    let v = b;
    if (rng.chance(inRoom ? 0.07 : 0.035)) v = rng.pick(featuresFor(b));
    map.v[i] = v + (region && region(i) ? sp : 0);
  }
  const fams = shuffleWith(tileset.families.slice(), rng);
  const families = [[fams[0], 5], [fams[1 % fams.length], 3], [fams[2 % fams.length], 1.5]];
  for (const o of extra) if (o.kind === 'arch' && !o.design) { const fit = archesFor(tileset, o.a1 - o.a0); o.design = fit.length ? rng.pick(fit) : null; }
  map.buildWalls(tileset, () => rng.next(), [...findOpenings(map, rooms, tileset, rng), ...extra.filter((o) => o.design)], families);
}

/** Depth FINAL_DEPTH (500): a gauntlet that ends in the demon lord's arena. */
function generateThrone(biome, tileset, seed) {
  const rng = new RNG(seed);
  const W = 44, H = 80;
  const map = new TileMap(W, H);
  const carveRect = (x, y, w, h) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (i > 0 && j > 0 && i < W - 1 && j < H - 1) map.t[j * W + i] = 1; };
  // entrance hall
  carveRect(17, 68, 10, 9);
  // winding gauntlet
  carveRect(20, 56, 4, 13);
  carveRect(8, 52, 28, 6);
  carveRect(8, 40, 5, 13);
  carveRect(31, 40, 5, 13);
  carveRect(8, 36, 28, 5);
  carveRect(20, 30, 4, 7);
  // arena
  const ar = { x: 6, y: 4, w: 32, h: 27 };
  for (let y = ar.y; y < ar.y + ar.h; y++) for (let x = ar.x; x < ar.x + ar.w; x++) {
    const cx = ar.x + ar.w / 2, cy = ar.y + ar.h / 2;
    if (((x + 0.5 - cx) / (ar.w / 2)) ** 2 + ((y + 0.5 - cy) / (ar.h / 2)) ** 2 <= 1) map.t[y * W + x] = 1;
  }
  finishMap(map, tileset, rng);
  const spawns = [
    { x: 14, y: 54, arch: 'demon', n: 3, rank: 'champion' },
    { x: 30, y: 54, arch: 'knight', n: 4, rank: 'normal' },
    { x: 10, y: 45, arch: 'imp', n: 6, rank: 'normal' },
    { x: 33, y: 45, arch: 'gargoyle', n: 4, rank: 'normal' },
    { x: 22, y: 38, arch: 'abomination', n: 2, rank: 'unique' },
    { x: 22, y: 14, arch: 'velscour', n: 1, rank: 'boss' },
  ];
  const torches = [];
  for (const s of map.segments) if (!s.front && rng.next() < 0.12) torches.push({ x: s.mx + (s.dir === 'f' ? 0.12 : 0), y: s.my + (s.dir === 'b' ? 0.12 : 0), depth: s.depth + 0.01 });
  const props = [];
  const ob = tileset.scatter.find((e) => e.name === 'funerary_obelisk') || tileset.scatter[0];
  for (const [x, y] of [[12, 10], [32, 10], [12, 24], [32, 24]]) {
    if (ob && map.walkableTile(x, y)) { map.block[y * W + x] = 1; props.push({ kind: 'scatter', x: x + 0.5, y: y + 0.5, spr: ob, k: tileset.k }); }
  }
  return {
    map, rooms: [{ x: ar.x, y: ar.y, w: ar.w, h: ar.h, mx: 22, my: 17 }], spawns, props, chests: [{ x: 22.5, y: 72.5, rare: true }], torches,
    start: [22, 73], exit: [22, 7], bossRoom: { x: ar.x, y: ar.y, w: ar.w, h: ar.h, mx: 22, my: 17 }, throne: true,
  };
}
