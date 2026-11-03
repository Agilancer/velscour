// THE DEEP RAIL MINES (docs/DEEP_RAIL_MINES.md): a dwarven mine overrun from below. Shafts (cave chambers) hang in
// tiers down the screen, the Lift Head at the top and the Bottom at the foot; minecart lines run between them through
// tunnels the hero can't walk (floor, but blocked: only a cart goes there). Tiers widen and narrow like a lattice
// (1-2-3-2-1 and so on), so every line runs to a neighbouring shaft of the next tier and no two lines cross; a shaft
// with two lines down is a junction, and its switch picks the line. Packs grow denser and tougher tier by tier, and
// something from the bestiary waits at the Bottom. game/mines.js runs it; gfx/mines.js draws the rails and the carts.
//
// Layout is planned in screen axes like the caverns: `a` to the right of the screen, `b` down it, in tiles;
// (x, y) = ((a + b) / sqrt 2, (b - a) / sqrt 2). Rails run along tile rows and columns (Z-shaped: out of a shaft,
// a jog, into the next), so the tunnels are clean iso corridors. A line to the right leaves along +x, one to the left
// along +y; a shaft's two lines in arrive from -x and -y at the same buffer stop.
import { TileMap } from './map.js';
import { RNG } from '../core/util.js';
import { rollLooks } from '../data/bestiary.js';
import { BIOME_BY_ID } from '../data/biomes.js';
import { biomeTileSet } from '../core/assets.js';
import { torchAtWallSegment } from './dungeon.js';

const R2 = Math.SQRT1_2;
const DA = 30, DB = 27;                 // tiles between neighbouring shafts across a tier, and between tiers
const SHAPES = [[1, 2, 3, 2, 1], [1, 2, 1, 2, 1], [1, 2, 3, 3, 2, 1]];
const NAMES = ['Lamp Gallery', 'Old Hoist', 'Copper Drift', 'Flooded Stope', 'Bone Seam', 'Black Adit', 'Glimmer Vein', 'Cinder Winze',
  'Iron Throat', 'Hollow Sump', 'Saltpetre Cut', 'Widow Drift', 'Dead Lamp Stope', 'Sunken Gallery', 'Gravel Run', 'Tallow Cut'];
// what waits at the Bottom: the heavy things that dig (the biome roster narrows it)
const DIGGERS = ['worm', 'golem', 'abomination', 'spider', 'elemental', 'beetle'];
// mine clutter from the packs (the Crystal Caverns' stones and crystals, the town's crates, tools and wheels)
const CLUTTER = /crate|barrel|tool|wheel|cart|rope|firewood|brick|anvil|bucket|sack|crystal|cairn|rubble|column|stone|bone|lantern|plank|chain/;

/** The mine's look: the Crystal Caverns' shale and gravel round rough rock, recoloured to rust and lamp-brown, with
 * the town's mine furniture. (A biome of its own for the tile set cache; never in a bag.) */
export const MINE_ART = (() => {
  const c = BIOME_BY_ID.crystal;
  return {
    id: 'deep_mines_art', name: 'The Deep Rail Mines', pack: c.pack, wallPack: c.wallPack, part: c.part, moreFloors: c.moreFloors,
    morePacks: c.morePacks, palette: { colorize: [30, 0.42], light: -0.03, contrast: 1.2 },
    townProps: ['crate_stack', 'closed_barrel', 'tool_rack', 'broken_wheel', 'cart_debris', 'rope_and_hook', 'firewood_stack', 'tiles_and_bricks', 'water_bucket', 'anvil_stump'],
  };
})();
export const mineTileSet = () => biomeTileSet(MINE_ART);

/** Sample a Z-shaped rail (tile-centre corners, rounded) every `step` tiles: [[x, y, angle], ...] and its length. */
export function railPath(pts, step = 0.25) {
  const out = [];
  let prev = null;
  const push = (x, y) => { if (prev && Math.hypot(x - prev[0], y - prev[1]) < 1e-4) return; out.push(prev = [x, y]); };
  push(pts[0][0], pts[0][1]);
  // corners rounded with quadratic curves, the straights between them sampled finely
  const segs = [];
  for (let i = 0; i < pts.length - 1; i++) segs.push([pts[i], pts[i + 1], Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1])]);
  const rad = (i) => (i <= 0 || i >= pts.length - 1 ? 0 : Math.min(2.2, segs[i - 1][2] / 2, segs[i][2] / 2));
  const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  for (let i = 0; i < segs.length; i++) {
    const [a, b, len] = segs[i];
    if (len < 1e-6) continue;
    const r0 = rad(i), r1 = rad(i + 1);
    const p0 = lerp(a, b, r0 / len), p1 = lerp(a, b, 1 - r1 / len);
    const n = Math.max(1, Math.ceil(Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) / step));
    for (let k = 0; k <= n; k++) push(...lerp(p0, p1, k / n));
    if (r1 > 0) {   // the corner at b: from p1 round to the next leg
      const [c, d, l2] = segs[i + 1], q = lerp(c, d, r1 / l2), m = Math.max(3, Math.ceil((r1 * 1.6) / step));
      for (let k = 1; k <= m; k++) { const t = k / m, u = 1 - t; push(u * u * p1[0] + 2 * u * t * b[0] + t * t * q[0], u * u * p1[1] + 2 * u * t * b[1] + t * t * q[1]); }
    }
  }
  // even spacing by arc length, so ties land the same way on two lines that share a stretch
  const cum = [0];
  for (let i = 1; i < out.length; i++) cum.push(cum[i - 1] + Math.hypot(out[i][0] - out[i - 1][0], out[i][1] - out[i - 1][1]));
  const len = cum[cum.length - 1], res = [];
  for (let s = 0, j = 0; s <= len + 1e-6; s += step) {
    while (j < cum.length - 2 && cum[j + 1] < s) j++;
    const t = (s - cum[j]) / Math.max(1e-6, cum[j + 1] - cum[j]), a = out[j], b = out[j + 1] || a;
    res.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, Math.atan2(b[1] - a[1], b[0] - a[0])]);
  }
  const e = out[out.length - 1];
  if (Math.hypot(res[res.length - 1][0] - e[0], res[res.length - 1][1] - e[1]) > 1e-3) res.push([e[0], e[1], res[res.length - 1][2]]);
  return { pts: res, len, step };
}

function plan(depth, rng) {
  const shape = depth >= 30 && rng.chance(0.5) ? SHAPES[2] : rng.pick(SHAPES);
  const L = shape.length - 1, shafts = [];
  shape.forEach((n, k) => {
    for (let i = 0; i < n; i++) {
      const u = i - (n - 1) / 2;
      shafts.push({ id: shafts.length, k, i, u, a: u * DA + (k && k < L ? rng.range(-2.5, 2.5) : 0), b: k * DB + (k && k < L ? rng.range(-2, 2) : 0),
        R: k === L ? 10.5 : k === 0 ? 7.5 : rng.range(7.6, 9), out: [], in: [], lamp: rng.range(0, Math.PI * 2), wob: [rng.range(0, 6.3), rng.range(0, 6.3)] });
    }
  });
  const edges = [];
  for (const s of shafts) for (const t of shafts) if (t.k === s.k + 1 && Math.abs(t.u - s.u) <= 0.51) { const e = { id: edges.length, from: s, to: t }; edges.push(e); s.out.push(e); t.in.push(e); }
  // some junctions lose a branch (never the last way into a shaft)
  for (const s of shafts) if (s.out.length === 2 && rng.chance(0.2)) {
    const e = rng.pick(s.out);
    if (e.to.in.length > 1) { s.out.splice(s.out.indexOf(e), 1); e.to.in.splice(e.to.in.indexOf(e), 1); edges.splice(edges.indexOf(e), 1); }
  }
  edges.forEach((e, i) => { e.id = i; });
  return { shape, L, shafts, edges };
}

function build(depth, biome, seed, ts) {
  const rng = new RNG(seed), rnd = () => rng.next();
  const P = plan(depth, rng), { shafts, edges, L } = P;
  // tile centres, then translated into the grid
  for (const s of shafts) { s.x = (s.a + s.b) * R2; s.y = (s.b - s.a) * R2; }
  const M = 9, x0 = Math.min(...shafts.map((s) => s.x - s.R)) - M, y0 = Math.min(...shafts.map((s) => s.y - s.R)) - M;
  for (const s of shafts) { s.x = Math.floor(s.x - x0) + 0.5; s.y = Math.floor(s.y - y0) + 0.5; }
  const W = Math.ceil(Math.max(...shafts.map((s) => s.x + s.R)) + M), H = Math.ceil(Math.max(...shafts.map((s) => s.y + s.R)) + M);
  const map = new TileMap(W, H);
  const room = new Int16Array(W * H).fill(-1);
  const names = NAMES.slice().sort(() => rnd() - 0.5);
  for (const s of shafts) {
    const d = Math.round(s.R * 0.42);
    s.inAt = [s.x - d, s.y - d]; s.outAt = [s.x + d, s.y + d];
    s.name = s.k === 0 ? 'The Lift Head' : s.k === L ? 'The Bottom' : names[s.id % names.length];
    s.tier = s.k; s.tiers = L;
    // the chamber: a lumpy disc
    s.r = (th) => s.R * (1 + 0.12 * Math.sin(3 * th + s.wob[0]) + 0.07 * Math.sin(5 * th + s.wob[1]));
    for (let y = Math.floor(s.y - s.R * 1.25); y <= s.y + s.R * 1.25; y++) for (let x = Math.floor(s.x - s.R * 1.25); x <= s.x + s.R * 1.25; x++) {
      if (!map.inb(x, y)) continue;
      const dx = x + 0.5 - s.x, dy = y + 0.5 - s.y;
      if (Math.hypot(dx, dy) < s.r(Math.atan2(dy, dx))) { map.t[y * W + x] = 1; room[y * W + x] = s.id; }
    }
  }
  // the lines: Z-shaped along rows and columns, from a shaft's out stop to the next one's buffer stop
  for (const e of edges) {
    const O = e.from.outAt, I = e.to.inAt, dx = I[0] - O[0], dy = I[1] - O[1];
    const xDom = e.to.u > e.from.u + 0.1 ? true : e.to.u < e.from.u - 0.1 ? false : dx >= dy;
    const f = rng.range(0.42, 0.58);
    const m = Math.floor(xDom ? O[0] + dx * f : O[1] + dy * f) + 0.5;
    e.corners = xDom ? [O, [m, O[1]], [m, I[1]], I] : [O, [O[0], m], [I[0], m], I];
    e.xDom = xDom;
    Object.assign(e, railPath(e.corners));
  }
  // check: a line keeps clear of every shaft but its two, and of lines that share neither end
  for (const e of edges) {
    for (const s of shafts) {
      if (s === e.from || s === e.to) continue;
      for (const p of e.pts) if (Math.hypot(p[0] - s.x, p[1] - s.y) < s.R * 1.2 + 2.5) return null;
    }
    for (const f of edges) {
      if (f.id <= e.id || f.from === e.from || f.to === e.to || f.from === e.to || f.to === e.from) continue;
      for (let i = 0; i < e.pts.length; i += 2) for (let j = 0; j < f.pts.length; j += 2) if (Math.hypot(e.pts[i][0] - f.pts[j][0], e.pts[i][1] - f.pts[j][1]) < 4) return null;
    }
  }
  // carve the tunnels: three tiles wide, floor (so walls line them) but blocked (only a cart goes there)
  const rail = new Uint8Array(W * H);
  for (const e of edges) for (const p of e.pts) {
    rail[Math.floor(p[1]) * W + Math.floor(p[0])] = 1;
    for (let y = Math.floor(p[1] - 1.4); y <= p[1] + 1.4; y++) for (let x = Math.floor(p[0] - 1.4); x <= p[0] + 1.4; x++) {
      if (!map.inb(x, y) || Math.hypot(x + 0.5 - p[0], y + 0.5 - p[1]) > 1.36) continue;
      const i = y * W + x;
      if (!map.t[i]) { map.t[i] = 1; map.block[i] = 1; }
    }
  }
  // floors: a paving per shaft (most share the mine's main one), the tunnels another, the odd feature tile
  const bases = ts.bases.length ? ts.bases.slice().sort(() => rnd() - 0.5) : [0];
  const main = bases[0], hall = bases[1 % bases.length];
  const roomBase = shafts.map(() => (rng.chance(0.7) ? main : rng.pick(bases)));
  const feats = (b) => { const lum = ts.floors[b]?.lum ?? 0.5, f = ts.features.filter((i) => Math.abs((ts.floors[i]?.lum ?? 0) - lum) < 0.08); return f.length >= 3 ? f : ts.features; };
  const fb = new Map();
  for (let i = 0; i < map.t.length; i++) {
    if (!map.t[i]) continue;
    const b = room[i] >= 0 ? roomBase[room[i]] : hall;
    if (!fb.has(b)) fb.set(b, feats(b));
    const F = fb.get(b);
    map.v[i] = F.length && rng.chance(room[i] >= 0 ? 0.07 : 0.03) ? rng.pick(F) : b;
  }
  const fams = ts.families.slice().sort(() => rnd() - 0.5);
  map.buildWalls(ts, rnd, [], fams.length ? [[fams[0], 5], [fams[1 % fams.length], 3], [fams[2 % fams.length], 1.5]] : null);

  // what each shaft holds: keep the rails, stops, switch and the way across clear
  const keep = new Uint8Array(W * H);
  const keepAround = (p, r) => { for (let y = Math.floor(p[1] - r); y <= p[1] + r; y++) for (let x = Math.floor(p[0] - r); x <= p[0] + r; x++) if (map.inb(x, y)) keep[y * W + x] = 1; };
  for (let i = 0; i < rail.length; i++) if (rail[i]) { keep[i] = 1; const x = i % W, y = (i / W) | 0; for (const j of [i - 1, i + 1, i - W, i + W]) if (j >= 0 && j < keep.length && Math.abs((j % W) - x) + Math.abs(((j / W) | 0) - y) === 1) keep[j] = 1; }
  for (const s of shafts) {
    keepAround(s.inAt, 2.2); keepAround(s.outAt, 2.2); keepAround([s.x, s.y], s.k === L ? 3 : 1);
    if (s.out.length > 1) { s.leverAt = [s.outAt[0] - 1.6, s.outAt[1] + 0.2]; keepAround(s.leverAt, 1); }
  }
  const cellsOf = (s) => {
    const out = [];
    for (let y = Math.floor(s.y - s.R * 1.25); y <= s.y + s.R * 1.25; y++) for (let x = Math.floor(s.x - s.R * 1.25); x <= s.x + s.R * 1.25; x++) if (map.inb(x, y) && room[y * W + x] === s.id && map.walkableTile(x, y)) out.push([x, y]);
    return out;
  };
  const flood = (s) => {   // walkable tiles of the shaft reachable from its buffer stop (or its centre)
    const st = s.inAt, seen = new Uint8Array(W * H), q = [Math.floor(st[1]) * W + Math.floor(st[0])];
    seen[q[0]] = 1; let n = 0;
    while (q.length) { const i = q.pop(); n++; const x = i % W, y = (i / W) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const j = (y + dy) * W + x + dx; if (map.walkableTile(x + dx, y + dy) && !seen[j]) { seen[j] = 1; q.push(j); } } }
    return n;
  };
  const props = [], chests = [], spawns = [];
  const looks = rollLooks(biome, rnd), roster = biome.roster;
  const scat = ts.scatter.filter((e) => CLUTTER.test(e.name)), clutter = scat.length >= 4 ? scat : ts.scatter;
  const lit = clutter.filter((e) => /lantern|candle|brazier|crystal/.test(e.name));
  for (const s of shafts) {
    let open = flood(s);
    const cells = cellsOf(s).sort(() => rnd() - 0.5);
    const free = cells.filter(([x, y]) => !keep[y * W + x]);
    // clutter: blockers only where they cut nothing off, mostly against the walls
    const edgeCell = ([x, y]) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => !map.tile(x + dx, y + dy) || map.block[(y + dy) * W + x + dx]);
    let n = Math.round(s.R * 0.9);
    for (const [x, y] of free.filter(edgeCell).concat(free.filter((c) => !edgeCell(c)))) {
      if (n <= 0) break;
      const i = y * W + x;
      if (keep[i] || map.block[i]) continue;
      const e = rng.chance(0.15) && lit.length ? rng.pick(lit) : rng.pick(clutter);
      if (e.block) { map.block[i] = 1; const m = flood(s); if (m !== open - 1) { map.block[i] = 0; continue; } open = m; }
      props.push({ kind: 'scatter', x: x + 0.5, y: y + 0.5, spr: e, k: ts.k, flip: rng.chance(0.5), light: /lantern|candle|brazier/.test(e.name) ? 2.4 : /crystal/.test(e.name) ? 1.6 : 0 });
      keep[i] = 1; n--;
    }
    // packs: denser and tougher every tier down; none on the buffer stop
    const spot = (minIn) => { for (let t = 0; t < 80; t++) { const [x, y] = rng.pick(cells); if (!map.walkableTile(x, y) || (keep[y * W + x] && t < 60) || Math.hypot(x + 0.5 - s.inAt[0], y + 0.5 - s.inAt[1]) < minIn) continue; return [x + 0.5, y + 0.5]; } return [s.x, s.y]; };
    const arch = () => rng.pick(roster);
    if (s.k === L) {
      const prefer = DIGGERS.filter((a) => roster.includes(a));
      const g = looks.boss(prefer.length ? prefer : roster);
      spawns.push(g ? { x: s.x, y: s.y, arch: g.arch, n: 1, rank: 'boss', look: g.look, tier: s.k } : { x: s.x, y: s.y, arch: 'golem', n: 1, rank: 'boss', tier: s.k });
      for (let j = 0; j < 2; j++) { const [x, y] = spot(6); const a = arch(); spawns.push({ x, y, arch: a, n: rng.int(2, 3), rank: 'champion', look: looks.pick(a), tier: s.k }); }
      const [cx, cy] = spot(5); chests.push({ x: cx, y: cy, rare: true });
      s.exitAt = s.outAt;
      continue;
    }
    const packs = s.k === 0 ? 1 : Math.min(4, 1 + s.k + (s.R > 8.5 ? 1 : 0));
    let uniq = s.k >= 3 && rng.chance(0.4);
    for (let j = 0; j < packs; j++) {
      const [x, y] = spot(s.k === 0 ? 6 : 4.5), a = arch();
      const rank = uniq ? 'unique' : 'normal'; uniq = false;
      spawns.push({ x, y, arch: a, n: rng.int(2, 3) + (s.k >> 1), rank, champ: rank === 'normal' && rng.chance(0.12 * s.k), look: looks.pick(a), tier: s.k });
    }
    if (s.k > 0 && rng.chance(0.5 + 0.08 * s.k)) { const [x, y] = spot(3); chests.push({ x, y, rare: rng.chance(0.08 * s.k) }); }
  }
  // lamps: torches on the back walls of the shafts, sparser down the tunnels
  const edgeSet = new Set(map.segments.map((sg) => sg.dir + sg.mx + ',' + sg.my + (sg.front ? 'f' : '')));
  const along = (sg, d) => (sg.dir === 'f' ? sg.dir + sg.mx + ',' + (sg.my + d) : sg.dir + (sg.mx + d) + ',' + sg.my);
  const torches = [], taken = [];
  for (const sg of map.segments) {
    if (sg.front || ![-1, 1].every((d) => edgeSet.has(along(sg, d)))) continue;
    const ti = Math.floor(sg.my) * W + Math.floor(sg.mx);   // the floor tile behind a back wall
    const inRoom = ti >= 0 && ti < room.length && room[ti] >= 0;
    if (!rng.chance(inRoom ? 0.2 : 0.1) || taken.some(([x, y]) => Math.hypot(x - sg.mx, y - sg.my) < (inRoom ? 4 : 6))) continue;
    torches.push(torchAtWallSegment(sg)); taken.push([sg.mx, sg.my]);
  }
  const top = shafts[0], bottom = shafts[shafts.length - 1];
  const start = [top.inAt[0], top.inAt[1]];
  return {
    map, props, torches, wallHangings: [], buildings: [], townTiles: null, looks, spawns, chests, rooms: [],
    start, exit: bottom.exitAt, townPortal: [start[0] - 1.5, start[1] + 1.5], seed, tileset: ts,
    mine: { shape: P.shape, L, shafts, edges, room, rail },
  };
}

/** The level: the mine's map, its shafts and lines, packs, chests, lamps; `tileset` is the mine's own. */
export function generateMines(depth, biome, seed, ts = mineTileSet()) {
  for (let k = 0; k < 24; k++) {
    const gen = build(depth, biome, (seed + k * 7919) >>> 0, ts);
    if (gen) return gen;
  }
  throw new Error('Deep Rail Mines: no layout for seed ' + seed);
}

/**
 * Is the mine whole? Every shaft reached by cart from the Lift Head, the Bottom among them; in every shaft its buffer
 * stop walks to its cart (and in the Bottom to the boss and the exit); every line's ends sit on walkable floor, and
 * its tunnel is walled (blocked) everywhere outside the two shafts. Returns { ok, bad: [...], rides }.
 */
export function checkMines(gen) {
  const { map } = gen, { shafts, edges, room } = gen.mine, W = map.w, bad = [];
  const seen = new Set([shafts[0]]), q = [shafts[0]];
  while (q.length) { const s = q.pop(); for (const e of s.out) if (!seen.has(e.to)) { seen.add(e.to); q.push(e.to); } }
  if (seen.size !== shafts.length) bad.push(`${shafts.length - seen.size} shafts no cart reaches`);
  const walk = (a, b) => !!map.findPath(a[0], a[1], b[0], b[1], 40000);
  for (const s of shafts) {
    if (s.k < gen.mine.L && !s.out.length) bad.push(`${s.name}: no line down`);
    if (s.k > 0 && !s.in.length) bad.push(`${s.name}: no line in`);
    const from = s.inAt;
    if (!map.walkable(from[0], from[1])) bad.push(`${s.name}: buffer stop on rock`);
    if (s.out.length && !walk(from, s.outAt)) bad.push(`${s.name}: its cart can't be walked to`);
    if (s.exitAt && !walk(from, s.exitAt)) bad.push(`${s.name}: the exit can't be walked to`);
  }
  const boss = gen.spawns.find((sp) => sp.rank === 'boss'), bottom = shafts[shafts.length - 1];
  if (!boss || !walk(bottom.inAt, [boss.x, boss.y])) bad.push('the boss is out of reach');
  for (const e of edges) {
    for (const p of e.pts) {
      const i = Math.floor(p[1]) * W + Math.floor(p[0]);
      if (!map.t[i]) { bad.push(`line ${e.from.name} -> ${e.to.name} runs through rock`); break; }
      if (room[i] < 0 && !map.block[i]) { bad.push(`line ${e.from.name} -> ${e.to.name}: an open tunnel`); break; }
      if (room[i] >= 0 && room[i] !== e.from.id && room[i] !== e.to.id) { bad.push(`line ${e.from.name} -> ${e.to.name} crosses ${shafts[room[i]].name}`); break; }
    }
  }
  for (const c of gen.chests) { const s = shafts[room[Math.floor(c.y) * W + Math.floor(c.x)]]; if (!s || !walk(s.inAt, [c.x, c.y])) bad.push('a chest out of reach'); }
  // the longest way down, in rides
  const depthOf = (s) => (s.out.length ? 1 + Math.max(...s.out.map((e) => depthOf(e.to))) : 0);
  return { ok: !bad.length, bad, rides: depthOf(shafts[0]), shafts: shafts.length, junctions: shafts.filter((s) => s.out.length > 1).length };
}
