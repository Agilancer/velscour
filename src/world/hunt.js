// THE GREAT HUNT (docs/GREAT_HUNT.md): the beast's territory, 96 x 96 tiles of dark woods. A winding game trail runs
// from the hunters' camp through three hunting grounds (clearings where the beast turns to fight) to its lair, a
// rocky den strewn with bones. Each leg of the trail carries three signs (a kill, claw marks, a sprung trap, its
// blood...) that lead from clue to clue. Narrow game trails branch off to small glades (a dead hunter's cache) and
// meadows open beside the trail; everything else is woods: blocked tiles under the Dark Forest pack's towering trees
// and the town pack's. The floors are the Mountainside's set (gfx/mountainart.js), so the level needs the town art,
// the Dark Forest pack and its trees (regions/hunt.js load()).
import { TileMap } from './map.js';
import { RNG } from '../core/util.js';
import { TW } from '../core/view.js';
import { biomeTileSet } from '../core/assets.js';
import { townObject } from './town.js';
import { overworldObject } from '../gfx/overworldart.js';
import { darkForestTree, darkTreeK } from '../gfx/darkforest.js';
import { mountainFloors, MF } from '../gfx/mountainart.js';
import { BIOME_BY_ID } from '../data/biomes.js';
import { rollLooks } from '../data/bestiary.js';

export const HUNT_W = 96, HUNT_H = 96;
const K = TW / 160; // town-pack source tiles are 160 x 80
// tile kinds, in priority order (a later carve never lowers a tile's kind)
export const HK = { WOOD: 0, MEADOW: 1, SPUR: 2, TRAIL: 3, GROUND: 4, CAMP: 5, LAIR: 6 };
const GROUND_R = 6.5, LAIR_R = 7.5, CAMP_R = 4.5;
// the signs a clue shows: its props (Dark Forest pack scatter) and how much blood lies round it
export const CLUE_PROPS = {
  kill: [['deer_skull', 0, 0], ['wolf_bones', 0.8, 0.5]],
  claws: [['split_stump', 0, 0], ['twisted_roots', 0.7, -0.4]],
  trap: [['hunter_trap', 0, 0]],
  tracks: [['dead_bramble', 0.6, 0.6]],
  hunter: [['lost_shield', 0, 0], ['wrapped_corpse', 0.9, 0.4]],
  raven: [['raven_perch', 0, 0], ['wolf_bones', 0.7, 0.6]],
  flattened: [['fallen_log', 0, 0], ['dead_bramble', 0.8, -0.5]],
  blood: [],
};
export const CLUE_BLOOD = { kill: 5, claws: 0, trap: 2, tracks: 0, hunter: 4, raven: 2, flattened: 1, blood: 7 };
const DARK_TREES = ['ancient_black_oak', 'twisted_yew', 'dead_crowned_elm', 'hollow_ash', 'blighted_chestnut', 'hanging_moss_fir', 'spire_pine',
  'bone_white_birch', 'root_fused_twins', 'split_lightning_oak', 'thornbound_cypress', 'fungal_beech'];
const TOWN_TREES = ['t_dead_oak', 't_crooked_oak', 't_storm_deadwood', 't_dead_thorn', 't_old_cedar', 't_medium_fir', 't_scots_pine', 't_ancient_oak',
  't_gnarled_yew', 't_blight_oak', 't_dusk_cedar'];
const UNDER = ['fern_clump', 'thorn_bush', 'dead_bramble', 'twisted_roots', 'pale_mushrooms', 'dead_sapling', 'hollow_stump', 'split_stump', 'poison_mushrooms'];

const h01 = (x, y, s) => {
  let h = Math.imul(x ^ 0x5bd1e995, 0x27d4eb2d) ^ Math.imul(y ^ s, 0x165667b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296;
};
/** Smooth value noise in [0, 1) at a feature size of s tiles. */
const noiseFn = (seed) => (x, y, s) => {
  const gx = x / s, gy = y / s, x0 = Math.floor(gx), y0 = Math.floor(gy), sm = (t) => t * t * (3 - 2 * t);
  const u = sm(gx - x0), v = sm(gy - y0), salt = (seed + s * 131) | 0, r = (a, b) => h01(a, b, salt);
  return (r(x0, y0) * (1 - u) + r(x0 + 1, y0) * u) * (1 - v) + (r(x0, y0 + 1) * (1 - u) + r(x0 + 1, y0 + 1) * u) * v;
};
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function generateHunt(depth, biome, seed) {
  const errs = [];
  for (let k = 0; k < 8; k++) {
    try { return build(depth, biome, (seed + k * 7919) >>> 0, seed); } catch (e) { errs.push(e.message); }
  }
  throw new Error('Great Hunt generator: ' + errs.join('; '));
}

function build(depth, biome, seed, savedSeed) {
  const W = HUNT_W, H = HUNT_H, N = W * H, rng = new RNG(seed), noise = noiseFn(seed & 0xffff);
  const id = (x, y) => y * W + x, map = new TileMap(W, H);
  map.t.fill(1); map.block.fill(1); map.losBlocks = true;
  const kind = new Uint8Array(N);

  // ---- the route: camp, three hunting grounds, the lair, zig-zagging up the map; turned one of four ways
  const flip = rng.int(0, 3);
  const turn = ([x, y]) => {
    let p = [x, y];
    if (flip & 1) p = [p[1], p[0]];                  // transposed
    if (flip & 2) p = [W - 1 - p[1], H - 1 - p[0]];  // mirrored across the other diagonal
    return [Math.floor(p[0]) + 0.5, Math.floor(p[1]) + 0.5];
  };
  const anchors = [[8.5, 87.5], [rng.range(40, 52), rng.range(74, 84)], [rng.range(74, 86), rng.range(52, 64)], [rng.range(36, 50), rng.range(28, 40)],
    [rng.range(72, 84), rng.range(11, 17)]].map(turn);
  const [START] = anchors, grounds = anchors.slice(1), LAIR = anchors[4];

  const carve = (cx, cy, r, k, rough = 0) => {
    for (let y = Math.floor(cy - r - 2); y <= Math.ceil(cy + r + 2); y++) for (let x = Math.floor(cx - r - 2); x <= Math.ceil(cx + r + 2); x++) {
      if (x < 2 || y < 2 || x >= W - 2 || y >= H - 2) continue;
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) + (rough ? (noise(x, y, 3) - 0.5) * rough : 0);
      if (d > r) continue;
      const i = id(x, y);
      map.block[i] = 0;
      if (kind[i] < k) kind[i] = k;
    }
  };
  // a winding line from a to b: jittered waypoints, Chaikin-smoothed, resampled a tile apart
  const wander = (a, b, amp) => {
    const L = dist(a, b), n = Math.max(2, Math.round(L / 7)), nx = -(b[1] - a[1]) / L, ny = (b[0] - a[0]) / L;
    let pts = [a];
    for (let k = 1; k < n; k++) {
      const t = k / n, off = rng.range(-amp, amp);
      pts.push([clamp(a[0] + (b[0] - a[0]) * t + nx * off, 5, W - 6), clamp(a[1] + (b[1] - a[1]) * t + ny * off, 5, H - 6)]);
    }
    pts.push(b);
    for (let pass = 0; pass < 3; pass++) {
      const q = [pts[0]];
      for (let k = 0; k < pts.length - 1; k++) {
        const [p, r] = [pts[k], pts[k + 1]];
        q.push([p[0] * 0.75 + r[0] * 0.25, p[1] * 0.75 + r[1] * 0.25], [p[0] * 0.25 + r[0] * 0.75, p[1] * 0.25 + r[1] * 0.75]);
      }
      q.push(pts[pts.length - 1]); pts = q;
    }
    const out = [pts[0]];
    let carry = 0;
    for (let k = 0; k < pts.length - 1; k++) {
      const [p, r] = [pts[k], pts[k + 1]], d = dist(p, r);
      let s = 1 - carry;
      while (s <= d) { out.push([p[0] + (r[0] - p[0]) * s / d, p[1] + (r[1] - p[1]) * s / d]); s += 1; }
      carry = d - (s - 1);
    }
    out.push(pts[pts.length - 1]);
    return out;
  };

  // ---- the trail legs, the clearings
  const paths = [];
  for (let k = 0; k < 4; k++) {
    const path = wander(anchors[k], anchors[k + 1], 7);
    for (const [x, y] of path) carve(x, y, 1.55 + noise(x, y, 5) * 0.6, HK.TRAIL);
    paths.push(path);
  }
  carve(START[0], START[1], CAMP_R, HK.CAMP, 1.2);
  for (const g of grounds.slice(0, 3)) carve(g[0], g[1], GROUND_R, HK.GROUND, 2);
  carve(LAIR[0], LAIR[1], LAIR_R, HK.LAIR, 1.6);

  // ---- meadows beside the trail, game trails off it to small glades
  const nearRoute = (p, r) => anchors.some((a) => dist(p, a) < r);
  for (let n = 0, tries = 0; n < rng.int(6, 9) && tries < 80; tries++) {
    const path = rng.pick(paths), i = rng.int(4, path.length - 5), p = path[i], q = path[i + 1];
    const L = dist(p, q) || 1, nx = -(q[1] - p[1]) / L, ny = (q[0] - p[0]) / L, r = rng.range(2.6, 4.6), side = rng.chance(0.5) ? 1 : -1;
    const c = [p[0] + nx * side * (r + 0.6), p[1] + ny * side * (r + 0.6)];
    if (c[0] < r + 3 || c[1] < r + 3 || c[0] > W - r - 3 || c[1] > H - r - 3 || nearRoute(c, 9)) continue;
    carve(c[0], c[1], r, HK.MEADOW, 2.2); n++;
  }
  const spurs = [];
  for (let n = 0, tries = 0; n < 5 && tries < 120; tries++) {
    const leg = rng.int(0, 3), path = paths[leg], i = rng.int(6, path.length - 7), p = path[i], q = path[i + 1];
    const L = dist(p, q) || 1, side = rng.chance(0.5) ? 1 : -1, len = rng.range(9, 15);
    const end = [p[0] - (q[1] - p[1]) / L * side * len, p[1] + (q[0] - p[0]) / L * side * len];
    if (end[0] < 6 || end[1] < 6 || end[0] > W - 7 || end[1] > H - 7 || nearRoute(end, 12) || spurs.some((s) => dist(s.end, end) < 12)) continue;
    // not back across another leg of the trail
    if (paths.some((pp, k) => k !== leg && pp.some((t) => dist(t, end) < 7))) continue;
    const e = [Math.floor(end[0]) + 0.5, Math.floor(end[1]) + 0.5], line = wander(p, e, 2.5);
    for (const [x, y] of line) carve(x, y, 1.15, HK.SPUR);
    carve(e[0], e[1], 2.7, HK.SPUR, 1);
    spurs.push({ end: e, leg, line }); n++;
  }

  // ---- floors (the Mountainside's set)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = id(x, y), k = kind[i], n = noise(x, y, 6), m = noise(x + 31, y + 17, 3), q = noise(x + 77, y + 5, 9);
    let name;
    if (k === HK.WOOD) name = q > 0.66 ? 'ferns' : n > 0.6 ? 'moss' : m > 0.55 ? 'deep_grass' : 'turf';
    else if (k === HK.MEADOW) name = q > 0.7 ? 'petals' : n > 0.62 ? 'dry_grass' : m > 0.6 ? 'meadow' : 'grass';
    else if (k === HK.TRAIL) name = m > 0.62 ? 'mud' : n > 0.7 ? 'dry_grass' : 'dirt';
    else if (k === HK.SPUR) name = m > 0.5 ? 'dry_grass' : 'dirt';
    else if (k === HK.GROUND) name = n > 0.6 ? 'mud' : m > 0.45 ? 'dry_grass' : 'turf';
    else if (k === HK.CAMP) name = n > 0.55 ? 'dirt' : 'grass';
    else name = q > 0.55 ? 'scree' : n > 0.5 ? 'mud' : m > 0.55 ? 'wash' : 'dirt';
    map.v[i] = MF[name] ?? 0;
  }

  // ---- props
  const pack = biomeTileSet(BIOME_BY_ID.dark_forest), scat = new Map(pack.scatter.map((s) => [s.name, s]));
  const props = [], taken = new Uint8Array(N);
  const put = (spr, k, x, y, o = {}) => {
    if (!spr) return null;
    const p = { kind: 'scatter', x, y, spr, k, flip: o.flip ?? (spr.isometric ? false : rng.chance(0.5)), light: o.light || 0 };
    if (spr.tree) p.tree = true;
    props.push(p);
    taken[id(clamp(Math.floor(x), 0, W - 1), clamp(Math.floor(y), 0, H - 1))] = 1;
    return p;
  };
  const town = (name, x, y, o) => { const s = overworldObject(name) || townObject(name); return s && put(s, K * (s.pixelScale || 1), x, y, o); };
  const forest = (name, x, y, o = {}) => { const s = scat.get(name); return s && put(s, pack.k * (o.scale || 1), x, y, o); };
  const tall = (name, x, y, sc) => put(darkForestTree(name), darkTreeK(sc), x, y);
  const jit = () => rng.range(-0.2, 0.2);
  const openAt = (x, y) => map.walkable(x, y) && map.circleFree(x, y, 0.3);

  // the clues: three on every leg, on the trail, away from the clearings at its ends
  const clues = [];
  const KINDS0 = ['kill', 'claws', 'trap', 'tracks'], KINDS = ['flattened', 'kill', 'hunter', 'raven', 'claws'];
  for (let leg = 0; leg < 4; leg++) {
    const path = paths[leg], a = anchors[leg], b = anchors[leg + 1], ra = leg ? GROUND_R : CAMP_R, rb = leg === 3 ? LAIR_R : GROUND_R;
    const span = path.map((p, i) => i).filter((i) => dist(path[i], a) > ra + 2.5 && dist(path[i], b) > rb + 3);
    if (span.length < 9) throw new Error(`leg ${leg} too short for its clues`);
    const pool = (leg ? KINDS : KINDS0).slice();
    for (let i = pool.length - 1; i > 0; i--) { const j = rng.int(0, i); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    const kinds = leg ? ['blood', pool[0], pool[1]] : pool.slice(0, 3);
    [0.2, 0.5, 0.82].forEach((f, n) => {
      const pi = span[Math.floor(f * (span.length - 1))], p = path[pi], q = path[Math.min(path.length - 1, pi + 1)];
      const L = dist(p, q) || 1, nx = -(q[1] - p[1]) / L, ny = (q[0] - p[0]) / L;
      const c = { x: p[0], y: p[1], leg, n, kind: kinds[n], pi, nx, ny };
      clues.push(c);
      for (const [name, ox, oy] of CLUE_PROPS[c.kind]) {
        const side = n % 2 ? 1 : -1, px = p[0] + nx * side * (1.1 + ox) + oy * 0.3, py = p[1] + ny * side * (1.1 + ox) + oy * 0.3;
        if (map.walkable(px, py)) forest(name, px, py);
      }
    });
  }
  const nearClue = (x, y, r) => clues.some((c) => Math.hypot(c.x - x, c.y - y) < r);

  // the hunters' camp
  const camp = [[1.6, -1.2, 'F:campfire', 5], [2.6, -0.2, 'F:bedroll'], [0.4, -2.5, 'F:wooden_crate'], [-1.8, -1.4, 'F:lantern_stake', 3], [2.4, 1.8, 'F:trail_sign'],
    [-2.2, 1.6, 'firewood_stack'], [3.2, -2.2, 'F:raven_perch']];
  for (const [dx, dy, name, light] of camp) {
    const x = START[0] + dx, y = START[1] + dy;
    if (!openAt(x, y)) continue;
    if (name.startsWith('F:')) forest(name.slice(2), x, y, { light: light || 0 }); else town(name, x, y);
  }
  // the hunting grounds: trampled, a carcass or two, a fallen trunk at the edge
  const GROUND_DRESS = ['F:fallen_log', 'F:split_stump', 'F:wolf_bones', 'F:deer_skull', 'F:moss_boulder', 'F:hollow_log', 'F:twisted_roots'];
  for (const g of grounds.slice(0, 3)) {
    const a0 = rng.range(0, 6.28);
    for (let n = 0; n < 6; n++) {
      const a = a0 + n * 1.05 + rng.range(-0.2, 0.2), r = rng.range(4.2, 5.8), x = g[0] + Math.cos(a) * r, y = g[1] + Math.sin(a) * r;
      if (openAt(x, y) && !nearClue(x, y, 2)) forest(GROUND_DRESS[(n + rng.int(0, 6)) % GROUND_DRESS.length].slice(2), x, y);
    }
  }
  // the lair: a ring of boulders and cairns, bones and the wrapped dead inside, effigies at the mouth
  {
    const a0 = rng.range(0, 6.28);
    for (let n = 0; n < 14; n++) {
      const a = a0 + n * 0.449 + rng.range(-0.1, 0.1), r = rng.range(6.2, 7.4), x = LAIR[0] + Math.cos(a) * r, y = LAIR[1] + Math.sin(a) * r;
      if (!map.walkable(x, y) || paths[3].slice(-12).some((t) => Math.hypot(t[0] - x, t[1] - y) < 2.2)) continue;
      if (n % 3 === 2) forest('stone_cairn', x, y); else if (rng.chance(0.5)) forest('moss_boulder', x, y); else town('fieldstone_cluster', x, y);
      map.block[id(Math.floor(x), Math.floor(y))] = 1;
    }
    const BONES = ['wolf_bones', 'deer_skull', 'wolf_bones', 'wrapped_corpse', 'deer_skull', 'spider_eggs', 'buried_urn'];
    for (let n = 0; n < 9; n++) {
      const a = rng.range(0, 6.28), r = rng.range(2.6, 5.4), x = LAIR[0] + Math.cos(a) * r, y = LAIR[1] + Math.sin(a) * r;
      if (openAt(x, y)) forest(BONES[n % BONES.length], x, y);
    }
    town('ow_bone_pile', LAIR[0] + 1.2, LAIR[1] - 2.2);
    const mouth = paths[3][Math.max(0, paths[3].length - 1 - Math.round(LAIR_R + 1.5))];
    for (const s of [-1, 1]) {
      const q = paths[3][Math.max(0, paths[3].length - 1 - Math.round(LAIR_R + 2.5))], L = dist(mouth, q) || 1;
      const x = mouth[0] - (q[1] - mouth[1]) / L * s * 2.2, y = mouth[1] + (q[0] - mouth[0]) / L * s * 2.2;
      if (map.walkable(x, y)) forest('hanging_effigy', x, y);
    }
  }
  // the dead hunters' caches at the end of the game trails, two with a chest
  const chests = [];
  spurs.forEach((s, k) => {
    const [x, y] = s.end;
    if (k < 2) {
      chests.push({ x: x + 0.3, y: y - 0.4, rare: rng.chance(0.3) });
      forest('wrapped_corpse', x - 1.3, y + 0.6); forest('lost_shield', x + 1.1, y + 1.0);
    } else forest(rng.pick(['stone_cairn', 'buried_urn', 'hunter_trap', 'raven_perch']), x, y);
  });

  // trees: thick at the wood's edge (they read as its wall), thinner deep in; never two on neighbouring tiles
  const into = new Uint8Array(N).fill(255), bq = [];
  for (let i = 0; i < N; i++) if (!map.block[i]) { into[i] = 0; bq.push(i); }
  for (let a = 0; a < bq.length; a++) {
    const i = bq[a], x = i % W, y = (i / W) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const j = id(nx, ny);
      if (into[j] > into[i] + 1) { into[j] = into[i] + 1; bq.push(j); }
    }
  }
  const treeAt = new Uint8Array(N);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = id(x, y);
    if (!map.block[i] || taken[i] || into[i] === 0) continue;
    const p = into[i] <= 2 ? 0.72 : into[i] <= 5 ? 0.5 : 0.3;
    if (!rng.chance(p)) continue;
    let crowded = false;
    for (let dy = -1; dy <= 1 && !crowded; dy++) for (let dx = -1; dx <= 1; dx++) if (treeAt[id(clamp(x + dx, 0, W - 1), clamp(y + dy, 0, H - 1))]) { crowded = true; break; }
    if (crowded) continue;
    const pr = rng.chance(0.6) ? tall(rng.pick(DARK_TREES), x + 0.5 + jit(), y + 0.5 + jit(), rng.range(0.5, 0.68)) : town(rng.pick(TOWN_TREES), x + 0.5 + jit(), y + 0.5 + jit());
    if (pr) treeAt[i] = 1;
  }
  // undergrowth along the wood's edge, flowers and field stones in the meadows
  for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) {
    const i = id(x, y), k = kind[i], cx = x + 0.5 + jit(), cy = y + 0.5 + jit();
    if (map.block[i] || taken[i] || k >= HK.GROUND || nearClue(cx, cy, 2.2)) continue;
    const edge = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => map.block[id(x + dx, y + dy)]);
    if (edge && rng.chance(k === HK.TRAIL ? 0.1 : 0.18)) forest(rng.pick(UNDER), cx, cy);
    else if (k === HK.MEADOW && rng.chance(0.08)) town(rng.pick(['wildflowers', 'ow_blue_flowers', 'ow_red_flowers', 'fieldstone_cluster', 'leafy_shrub', 'dry_reeds', 'mushrooms']), cx, cy);
  }
  // a hunter's lantern now and then beside the first leg; effigies hung along the last
  for (const [leg, every, name, light] of [[0, 16, 'lantern_stake', 3], [3, 14, 'hanging_effigy', 0]]) {
    const path = paths[leg];
    for (let i = every; i < path.length - every; i += every) {
      const p = path[i], q = path[i + 1], L = dist(p, q) || 1, s = i % 2 ? 1 : -1;
      const x = p[0] - (q[1] - p[1]) / L * s * 2.1, y = p[1] + (q[0] - p[0]) / L * s * 2.1;
      if (map.walkable(x, y) && !nearClue(x, y, 2.5)) forest(name, x, y, { light });
    }
  }

  // ---- the exit: at the back of the lair, away from its mouth; the town portal by the camp
  const back = paths[3][Math.max(0, paths[3].length - 8)], L = dist(LAIR, back) || 1;
  let exit = [LAIR[0] + (LAIR[0] - back[0]) / L * 3.6, LAIR[1] + (LAIR[1] - back[1]) / L * 3.6];
  if (!map.circleFree(exit[0], exit[1], 0.4)) exit = map.randomNear(LAIR[0], LAIR[1], 3, rng.fn());
  let townPortal = [START[0] - 1.8, START[1] + 1.2];
  if (!map.circleFree(townPortal[0], townPortal[1], 0.4)) townPortal = map.randomNear(START[0], START[1], 2.5, rng.fn());

  // ---- monsters: packs through the woods' open ground, never at the camp or where the beast waits
  const looks = rollLooks(biome, rng.fn()), spawns = [];
  const archs = biome.roster.filter((a) => a !== 'golem');
  for (let n = 0, tries = 0; n < 20 && tries < 600; tries++) {
    const x = rng.int(4, W - 5) + 0.5, y = rng.int(4, H - 5) + 0.5, k = kind[id(Math.floor(x), Math.floor(y))];
    if (!map.circleFree(x, y, 0.35) || k >= HK.GROUND || dist([x, y], START) < 14 || grounds.some((g) => dist([x, y], g) < 10) || nearClue(x, y, 3)) continue;
    if (spawns.some((s) => dist([x, y], [s.x, s.y]) < 6)) continue;
    const arch = rng.pick(archs);
    spawns.push({ x, y, arch, n: rng.int(2, 4), rank: n % 6 === 5 ? 'champion' : 'normal', look: looks.pick(arch) });
    n++;
  }

  // ---- everything that matters must be walkable from the camp
  const seen = new Uint8Array(N), q = [id(Math.floor(START[0]), Math.floor(START[1]))];
  seen[q[0]] = 1;
  for (let a = 0; a < q.length; a++) {
    const i = q[a], x = i % W, y = (i / W) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const j = id(x + dx, y + dy);
      if (map.walkableTile(x + dx, y + dy) && !seen[j]) { seen[j] = 1; q.push(j); }
    }
  }
  const must = [...anchors, exit, townPortal, ...clues.map((c) => [c.x, c.y]), ...chests.map((c) => [c.x, c.y])];
  const lost = must.filter(([x, y]) => !seen[id(Math.floor(x), Math.floor(y))]);
  if (lost.length) throw new Error(`seed ${seed}: ${lost.length} hunt spots unreachable`);

  map.hunt = { kind, paths, anchors, spurs };
  return {
    map, props, buildings: [], wallHangings: [], torches: [], townTiles: mountainFloors(), looks, spawns, chests,
    start: START, exit, townPortal, seed: savedSeed,
    hunt: { start: START, grounds, lair: LAIR, paths, clues, spurs, flip },
  };
}
