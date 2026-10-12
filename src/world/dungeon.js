// Procedural dungeon generation: a maze of rooms laid out on a chunk grid.
import { TileMap } from './map.js';
import { RNG, clamp } from '../core/util.js';
import { ARCH } from '../data/enemies.js';
import { rollLooks } from '../data/bestiary.js';

const S = 11; // chunk size in tiles

export function generateDungeon(depth, biome, tileset, seed) {
  if (depth === 100) return generateThrone(biome, tileset, seed);
  const rng = new RNG(seed);
  const CW = clamp(4 + Math.floor(depth / 14) + rng.int(0, 1), 4, 8);
  const CH = clamp(4 + Math.floor(depth / 18) + rng.int(0, 1), 4, 7);
  const W = CW * S + 2, H = CH * S + 2;
  const map = new TileMap(W, H);
  const ci = (x, y) => y * CW + x;

  // ---- maze over chunks (randomised DFS) + a few loops
  const conn = new Set();
  const ek = (a, b) => (a < b ? a + ',' + b : b + ',' + a);
  const start = { x: 0, y: rng.int(0, CH - 1) };
  if (rng.chance(0.5)) { start.x = rng.int(0, CW - 1); start.y = rng.chance(0.5) ? 0 : CH - 1; }
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
  let exitIdx = 0;
  for (let i = 0; i < dist.length; i++) if (dist[i] > dist[exitIdx]) exitIdx = i;
  const startRoom = rooms[ci(start.x, start.y)];
  const exitRoom = rooms[exitIdx];
  // make sure the boss arena is roomy
  if (exitRoom.type !== 'room' || exitRoom.w < 7 || exitRoom.h < 7) {
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
  finishMap(map, tileset, rng, region);
  const obstacles = placeObstacles(map, rooms.filter((r) => r !== startRoom && r !== exitRoom), tileset, rng, startRoom);

  // ---- spawns
  const spawns = [];
  const roster = biome.roster;
  const rnd = () => rng.next();
  const looks = rollLooks(biome, rnd); // this level's bestiary: which art and palette swap each archetype gets
  const density = 1 + depth * 0.012;
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
    let packs = Math.max(r === exitRoom ? 0 : 1, Math.round((area / 26) * density * rng.range(0.7, 1.3)));
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
  const champs = 2 + Math.floor(depth / 15), uniques = 1 + Math.floor(depth / 30);
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
  // the guardian of the exit
  const guardian = looks.boss(roster);
  if (guardian) spawns.push({ x: exitRoom.mx, y: exitRoom.my, arch: guardian.arch, n: 1, rank: 'boss', look: guardian.look });
  else spawns.push({ x: exitRoom.mx, y: exitRoom.my, arch: rng.pick(roster.filter((a) => !['bat', 'spider', 'beetle'].includes(a))), n: 1, rank: 'boss' });

  // ---- props, chests, torches
  const props = obstacles;
  for (const r of rooms) {
    if (r === startRoom || r === exitRoom) continue;
    const nr = rng.int(0, 3);
    for (let i = 0; i < nr && tileset.rubble.length; i++) {
      const [px, py] = roomFloorSpot(r);
      props.push({ kind: 'rubble', x: px, y: py, spr: rng.pick(tileset.rubble), scale: rng.range(0.6, 0.9) });
    }
    if (!tileset.scatter.length && rng.chance(0.35)) { // placeholder pixel-art decor when the biome has no scatter art
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
  for (const s of map.segments) {
    if (s.front || rng.next() > 0.07) continue;
    const ox = s.dir === 'f' ? 0.12 : 0, oy = s.dir === 'b' ? 0.12 : 0;
    torches.push({ x: s.mx + ox, y: s.my + oy, depth: s.depth + 0.01 });
  }

  return {
    map, rooms, spawns, props, chests, torches, looks,
    start: [startRoom.mx, startRoom.my],
    exit: exitPos(map, exitRoom, startRoom),
    bossRoom: exitRoom,
  };
}

/**
 * Scatter terrain and barricades. Objects go mostly against walls, some in the open, never next to a
 * corridor mouth, and any placement that would cut a part of the level off from the start is undone.
 * Footprints: scatter size 1 = one tile, 2 = a 2x2 block; a barricade blocks two tiles in a row along its
 * diagonal ("fwd" = "/" runs along y, "back" = "\\" runs along x).
 */
function placeObstacles(map, rooms, tileset, rng, startRoom) {
  const props = [];
  const scat = tileset.scatter, bar = tileset.barricades;
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
  const tryBlock = (tiles) => {
    if (!tiles.every(([x, y]) => map.walkableTile(x, y))) return false;
    for (const [x, y] of tiles) map.block[y * W + x] = 1;
    if (reachable() === open - tiles.length) { open -= tiles.length; return true; }
    for (const [x, y] of tiles) map.block[y * W + x] = 0;
    return false;
  };
  const voidAround = (x, y) => [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => !map.tile(x + dx, y + dy)).length;
  // per sheet scale: a typical one-tile object is ~0.8 tile wide
  const kOf = new Map();
  const scaleFor = (e) => {
    if (!kOf.has(e.img)) {
      const ws = scat.filter((o) => o.img === e.img && o.size === 1).map((o) => o.w).sort((a, b) => a - b);
      kOf.set(e.img, 50 / (ws[ws.length >> 1] || 90));
    }
    return kOf.get(e.img);
  };
  for (const r of rooms) {
    const inRoom = (x, y) => x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h;
    // keep corridor mouths clear: no blocker within a tile of a floor tile outside the room
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
    // a free-standing column near a corner of a big room
    if (r.type === 'room' && r.w >= 7 && r.h >= 7 && tileset.towers.length && rng.chance(0.45)) {
      const x = Math.floor(r.x + (rng.chance(0.5) ? 1 : r.w - 2)), y = Math.floor(r.y + (rng.chance(0.5) ? 1 : r.h - 2));
      if (ok(x, y) && tryBlock([[x, y]])) { used.add(y * W + x); props.push({ kind: 'tower', x: x + 0.5, y: y + 0.5, spr: rng.pick(tileset.towers) }); }
    }
    // a barricade across part of a bigger room
    const hasBar = bar.fwd.length || bar.back.length;
    if (hasBar && r.w >= 6 && r.h >= 6 && mid.length && rng.chance(0.5)) {
      for (let tries = 0; tries < 8; tries++) {
        const [x, y] = rng.pick(mid);
        const fwd = rng.chance(0.5);
        const tiles = fwd ? [[x, y], [x, y + 1]] : [[x, y], [x + 1, y]];
        if (!tiles.every(([a, b]) => ok(a, b) && !voidAround(a, b)) || !tryBlock(tiles)) continue;
        const own = fwd ? bar.fwd : bar.back, other = fwd ? bar.back : bar.fwd;
        const spr = own.length ? rng.pick(own) : rng.pick(other);
        for (const [a, b] of tiles) used.add(b * W + a);
        props.push({ kind: 'barricade', x: fwd ? x + 0.5 : x + 1, y: fwd ? y + 1 : y + 0.5, spr, k: 76 / spr.w, flip: !own.length });
        break;
      }
    }
    if (!scat.length) continue;
    const n = Math.round((cells.length / 7) * rng.range(0.7, 1.3));
    for (let i = 0, tries = 0; i < n && tries < n * 6; tries++) {
      const pool = edge.length && (rng.chance(0.65) || !mid.length) ? edge : mid;
      const [x, y] = rng.pick(pool);
      const e = rng.pick(scat);
      const big = e.size === 2;
      const tiles = big ? [[x, y], [x + 1, y], [x, y + 1], [x + 1, y + 1]] : [[x, y]];
      if (!tiles.every(([a, b]) => ok(a, b))) continue;
      if (e.block && !tryBlock(tiles)) continue;
      for (const [a, b] of tiles) used.add(b * W + a);
      props.push({ kind: 'scatter', x: big ? x + 1 : x + 0.5, y: big ? y + 1 : y + 0.5, spr: e, k: scaleFor(e), flip: rng.chance(0.5) });
      i++;
    }
  }
  return props;
}

function exitPos(map, room, from) {
  // put the exit on the side of the room farthest from where the player came in
  const dx = room.mx - from.mx, dy = room.my - from.my;
  const fx = Math.abs(dx) > Math.abs(dy) ? Math.sign(dx) : 0, fy = fx ? 0 : Math.sign(dy) || 1;
  let x = room.mx + fx * (room.w / 2 - 1.5), y = room.my + fy * (room.h / 2 - 1.5);
  if (!map.walkable(x, y)) { x = room.mx; y = room.my; }
  return [x, y];
}

function finishMap(map, tileset, rng, region = null) {
  // floors are sorted calm -> busy (pits, rubble); mostly plain paving like Diablo II, busier tiles now and then.
  // A mixed set holds two biomes' floors back to back (tileset.split); region(i) = 1 paves tile i with the second.
  const sp = tileset.split;
  const sets = [[0, sp ? sp.floors : tileset.floors.length, 0, sp ? sp.details : tileset.details.length]];
  if (sp) sets.push([sp.floors, tileset.floors.length - sp.floors, sp.details, tileset.details.length - sp.details]);
  for (let i = 0; i < map.t.length; i++) {
    if (!map.t[i]) continue;
    const [f0, nf, d0, nd] = sets[region && region(i) ? 1 : 0];
    const calm = Math.max(1, Math.ceil(nf * 0.45));
    const r = rng.next();
    map.v[i] = r < 0.08 && nd ? 100 + d0 + rng.int(0, nd - 1) : f0 + (r < 0.78 ? rng.int(0, calm - 1) : rng.int(0, nf - 1));
  }
  map.buildWalls(tileset, () => rng.next());
}

/** Depth 100: a gauntlet that ends in the demon lord's arena. */
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
  for (const [x, y] of [[12, 10], [32, 10], [12, 24], [32, 24]]) {
    if (tileset.towers.length && map.walkableTile(x, y)) { map.block[y * W + x] = 1; props.push({ kind: 'tower', x: x + 0.5, y: y + 0.5, spr: tileset.towers[0] }); }
  }
  return {
    map, rooms: [{ x: ar.x, y: ar.y, w: ar.w, h: ar.h, mx: 22, my: 17 }], spawns, props, chests: [{ x: 22.5, y: 72.5, rare: true }], torches,
    start: [22, 73], exit: [22, 7], bossRoom: { x: ar.x, y: ar.y, w: ar.w, h: ar.h, mx: 22, my: 17 }, throne: true,
  };
}
