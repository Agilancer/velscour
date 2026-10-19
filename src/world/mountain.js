// MOUNTAINSIDE (beta, docs/MOUNTAINSIDE.md): a 50 x 50 height-mapped overworld. The foot of the mountain is the
// bottom-left edge of the screen (+y), the summit the top-right (y = 0), so the ground rises away from the camera and
// its cliffs face the climber. Five cliff bands too tall to hop cross the slope; each is broken by one stair-stepped
// ramp, alternating east and west, so the trail switchbacks up. A rock ridge walls the west side, the east side ends
// in a precipice over the haze. Heights are in levels (gfx/terrain.js HS px each); a body hops up `map.climb` levels
// and drops at most `map.drop` (world/map.js).
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

export const MW = 50, MH = 50;
const K = TW / 160;          // town-pack source tiles are 160 x 80
const EDGE = 46;             // the last walkable column: east of it the mountain falls away
const CLIFF = [8, 17, 26, 35, 42]; // uphill distance (v = 49 - y) of each cliff band
const RAMP = [36, 12, 37, 13, 38]; // the column each band's ramp climbs
const TERRACE = [13, 22, 31, 39];  // a hop-high terrace step across each band between the cliffs
const START = [8.5, 45.5], SUMMIT = [42.5, 1.5];
const CLIMB = 4, DROP = 10; // levels of 4 px: a 16 px hop up, a 40 px drop

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

export function generateMountain(depth, biome, seed) {
  for (let k = 0; k < 8; k++) {
    const gen = build(depth, biome, (seed + k * 7919) >>> 0);
    if (gen) return gen;
  }
  throw new Error('Mountainside generator found no trail to the summit; seed ' + seed);
}

function build(depth, biome, seed) {
  const W = MW, H = MH, N = W * H, rng = new RNG(seed), noise = noiseFn(seed & 0xffff);
  const id = (x, y) => y * W + x, map = new TileMap(W, H);
  const hgt = new Int16Array(N), mat = new Int8Array(N).fill(-1);
  const rock = new Uint8Array(N); // ridge and outcrop tiles: bare rock
  const ph = CLIFF.map(() => [rng.range(0, 6.28), rng.range(0, 6.28), rng.range(0, 6.28)]);
  const cliffAt = (k, x) => CLIFF[k] + Math.round(1.6 * Math.sin(x * 0.19 + ph[k][0]) + 0.8 * Math.sin(x * 0.47 + ph[k][1]));
  const rise = (k, x) => 9 + Math.round(2 * (1 + Math.sin(x * 0.31 + ph[k][2]))) + (k >= 3 ? 2 : 0); // 9..15 levels
  const band = (x, v) => { let b = 0; for (let k = 0; k < CLIFF.length; k++) if (v >= cliffAt(k, x)) b++; return b; };
  const onRamp = (x, v) => CLIFF.some((c, k) => Math.abs(x - RAMP[k]) <= 3 && v >= cliffAt(k, RAMP[k]) - 5 && v <= cliffAt(k, RAMP[k]) + 4);

  // ---- heights: the slope, the cliff bands (a stair where the ramp crosses), a lumpy surface, the west ridge
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const v = H - 1 - y, i = id(x, y);
    let lv = Math.floor(v * 0.68);
    // ramps lie in the same few columns on alternate bands, so each band asks for its own
    const stair = (k, rise) => Math.round(rise * Math.min(1, Math.max(0, (v - (cliffAt(k, RAMP[k]) - 4)) / 8))); // ~2 levels a tile
    const onStair = (k) => Math.abs(x - RAMP[k]) <= 2;
    for (let k = 0; k < CLIFF.length; k++) {
      if (onStair(k)) lv += stair(k, rise(k, x));
      else if (v >= cliffAt(k, x)) lv += rise(k, x);
    }
    for (let k = 0; k < TERRACE.length; k++) {
      const tv = TERRACE[k] + Math.round(1.3 * Math.sin(x * 0.27 + ph[k + 1][1])), T = x % 7 === k ? CLIMB : CLIMB - 1;
      const j = CLIFF.findIndex((c, r) => onStair(r) && Math.abs(tv - cliffAt(r, RAMP[r])) <= 5);
      if (j >= 0) lv += stair(j, T); // a terrace meeting a ramp folds into its stair
      else if (v >= tv) lv += T;
    }
    if (!onRamp(x, v)) lv += Math.round((noise(x, y, 7) - 0.5) * 5);
    if (x <= 2) { lv += (3 - x) * 9; rock[i] = 1; }
    hgt[i] = lv;
    map.t[i] = x <= EDGE ? 1 : 0;
  }
  const flatten = (cx, cy, r, lv = hgt[id(Math.floor(cx), Math.floor(cy))]) => {
    for (let y = Math.max(0, Math.floor(cy - r)); y <= Math.min(H - 1, Math.ceil(cy + r)); y++)
      for (let x = Math.max(3, Math.floor(cx - r)); x <= Math.min(EDGE, Math.ceil(cx + r)); x++)
        if (Math.hypot(x + 0.5 - cx, y + 0.5 - cy) <= r) hgt[id(x, y)] = lv;
    return lv;
  };
  flatten(START[0], START[1], 2.6); // the summit is the top band itself, above the last ramp

  // ---- outcrops: crags too tall to hop and a few shelves exactly a hop up with a chest on top. A crag that would
  // cut the climb in two (the top band is narrow) is taken back.
  const near = (x, y, p, r) => Math.hypot(x - p[0], y - p[1]) < r;
  const s0 = id(Math.floor(START[0]), Math.floor(START[1])), g0 = id(Math.floor(SUMMIT[0]), Math.floor(SUMMIT[1]));
  const seen = new Uint8Array(N), q = [];
  const connected = () => {
    seen.fill(0); q.length = 0; q.push(s0); seen[s0] = 1;
    for (let k = 0; k < q.length; k++) {
      const i = q[k], x = i % W;
      if (i === g0) return true;
      for (const j of [x > 3 ? i - 1 : -1, x < EDGE ? i + 1 : -1, i - W, i + W])
        if (j >= 0 && j < N && !seen[j] && !rock[j] && Math.abs(hgt[j] - hgt[i]) <= CLIMB) { seen[j] = 1; q.push(j); }
    }
    return false;
  };
  const keepClear = (x, y) => near(x, y, START, 6) || near(x, y, SUMMIT, 6.5) || onRamp(Math.floor(x), H - 1 - Math.floor(y));
  const ledges = [];
  for (let n = 0, tries = 0; n < 26 && tries < 400; tries++) {
    const cx = rng.range(5, EDGE - 2), cy = rng.range(4, H - 3), ledge = ledges.length < 3 && n % 6 === 2;
    if (keepClear(cx, cy)) continue;
    const r = ledge ? rng.range(1.1, 1.6) : rng.range(0.7, 2.1), up = ledge ? CLIMB : rng.int(6, 13);
    const blob = [];
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++)
      if (x >= 3 && x <= EDGE && y >= 0 && y < H && Math.hypot(x + 0.5 - cx, y + 0.5 - cy) <= r && !onRamp(x, H - 1 - y)) blob.push(id(x, y));
    if (!blob.length) continue;
    if (ledge) {
      // a flat shelf exactly a hop above the lowest ground round it
      const inBlob = new Set(blob);
      let ring = Infinity;
      for (const i of blob) for (const j of [i - 1, i + 1, i - W, i + W]) if (j >= 0 && j < N && !inBlob.has(j) && j % W >= 3) ring = Math.min(ring, hgt[j]);
      for (const i of blob) hgt[i] = ring + CLIMB;
    } else {
      const lv0 = hgt[id(Math.floor(cx), Math.floor(cy))], was = blob.map((i) => [hgt[i], rock[i]]);
      for (const i of blob) { hgt[i] = Math.max(hgt[i], lv0 + up); rock[i] = 1; }
      if (!connected()) { blob.forEach((i, k) => { hgt[i] = was[k][0]; rock[i] = was[k][1]; }); continue; }
    }
    if (ledge) ledges.push([Math.floor(cx) + 0.5, Math.floor(cy) + 0.5]);
    n++;
  }
  for (let y = 0; y < H; y++) for (let x = EDGE + 1; x < W; x++) hgt[id(x, y)] = hgt[id(EDGE, y)]; // the void keeps the edge's height
  map.hgt = hgt; map.climb = CLIMB; map.drop = DROP;

  // ---- the trail: the cheapest way up that can also be walked back down (every step a hop either way)
  const cost = new Float32Array(N).fill(Infinity), came = new Int32Array(N).fill(-1), done = new Uint8Array(N);
  cost[s0] = 0;
  const open = [s0];
  while (open.length) {
    let bi = 0;
    for (let k = 1; k < open.length; k++) if (cost[open[k]] < cost[open[bi]]) bi = k;
    const cur = open[bi]; open[bi] = open[open.length - 1]; open.pop();
    if (done[cur]) continue;
    done[cur] = 1;
    if (cur === g0) break;
    const cx = cur % W, cy = (cur / W) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cx + dx, ny = cy + dy;
      if (nx < 3 || ny < 0 || nx > EDGE || ny >= H) continue;
      const j = id(nx, ny), dh = Math.abs(hgt[j] - hgt[cur]);
      if (dh > CLIMB || done[j] || rock[j]) continue;
      const c = cost[cur] + 1 + dh * 0.6 + (nx < 6 || nx > EDGE - 2 ? 2 : 0);
      if (c < cost[j]) { cost[j] = c; came[j] = cur; open.push(j); }
    }
  }
  if (!done[g0]) return null;
  const trail = [], onTrail = new Uint8Array(N);
  for (let c = g0; c >= 0; c = came[c]) { trail.push(c); onTrail[c] = 2; if (c === s0) break; }
  trail.reverse();
  for (const c of trail) {
    const x = c % W, y = (c / W) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const j = id(x + dx, y + dy);
      if (x + dx >= 3 && x + dx <= EDGE && y + dy >= 0 && y + dy < H && !onTrail[j] && Math.abs(hgt[j] - hgt[c]) <= 2 && !rock[j]) onTrail[j] = 1;
    }
  }

  // ---- ground: lush at the foot, alpine grass and lichen higher up, scree and snow at the top; rock on crags.
  // Each band has a base ground and two kinds of patch, laid by broad noise so the ground reads in drifts, not tiles.
  const ZONE = [
    ['grass', 'meadow', 'petals'], ['deep_grass', 'ferns', 'moss'], ['grass', 'alpine', 'moss'],
    ['alpine', 'dry_grass', 'lichen'], ['dry_grass', 'scree', 'lichen'], ['stone', 'snow', 'scree'],
  ];
  const ROCK = ['stone', 'stone', 'vein', 'lichen'];
  const zoneOf = (x, y) => band(x, H - 1 - y);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = id(x, y), z = zoneOf(x, y), n = noise(x, y, 6), m = noise(x + 31, y + 17, 3), q = noise(x + 77, y + 5, 9);
    const s = y + 1 < H ? hgt[i] - hgt[id(x, y + 1)] : 0, e = x < EDGE ? hgt[i] - hgt[id(x + 1, y)] : 0;
    let name;
    if (onTrail[i] === 2) name = onRamp(x, H - 1 - y) && z < 5 ? 'steps' : z <= 1 ? 'dirt' : z <= 3 ? (m < 0.6 ? 'dirt' : 'gravel') : 'gravel';
    else if (onTrail[i] === 1) name = z <= 1 ? (m < 0.5 ? 'mud' : 'dirt') : z <= 3 ? (m < 0.5 ? 'dirt' : 'wash') : 'wash';
    else if (rock[i] || Math.max(s, e) >= 9) name = ROCK[Math.floor(n * ROCK.length)];
    else { const [base, a, b] = ZONE[Math.min(5, z)]; name = q > 0.7 ? a : n > 0.76 && m > 0.5 ? b : base; }
    mat[i] = MF[name];
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) map.v[id(x, y)] = Math.max(0, mat[id(x, y)]);
  map.v[g0] = MF.cairn;

  // ---- props
  const pack = biomeTileSet(BIOME_BY_ID.dark_forest), scat = new Map(pack.scatter.map((s) => [s.name, s]));
  const props = [], taken = new Uint8Array(N);
  const free = (x, y) => x >= 3 && x <= EDGE && y >= 0 && y < H && !taken[id(x, y)] && !onTrail[id(x, y)] && !keepClear(x + 0.5, y + 0.5) &&
    !ledges.some((l) => near(x + 0.5, y + 0.5, l, 1.9));
  const put = (spr, k, x, y, o = {}) => {
    if (!spr) return null;
    const p = { kind: 'scatter', x, y, spr, k, flip: o.flip ?? (spr.isometric ? false : rng.chance(0.5)), light: o.light || 0 };
    if (spr.tree) p.tree = true;
    props.push(p);
    return p;
  };
  const town = (name, x, y, o) => { const s = overworldObject(name) || townObject(name); return s && put(s, K * (s.pixelScale || 1), x, y, o); };
  const forest = (name, x, y, o = {}) => { const s = scat.get(name); return s && put(s, pack.k * (o.scale || 1), x, y, o); };
  const tall = (name, x, y, sc) => put(darkForestTree(name), darkTreeK(sc), x, y);
  const block = (x, y) => { taken[id(x, y)] = 1; map.block[id(x, y)] = 1; };
  const jit = () => rng.range(-0.18, 0.18);
  const TREES = [
    [['t_medium_fir', 'T'], ['t_scots_pine', 'T'], ['t_old_cedar', 'T'], ['spire_pine', 'D'], ['hanging_moss_fir', 'D'], ['t_young_pine', 'T']],
    [['spire_pine', 'D'], ['hanging_moss_fir', 'D'], ['t_medium_fir', 'T'], ['t_scots_pine', 'T'], ['t_old_cedar', 'T'], ['t_dusk_cedar', 'T']],
    [['t_scots_pine', 'T'], ['t_wind_pine', 'T'], ['t_young_pine', 'T'], ['t_medium_fir', 'T'], ['t_frost_fir', 'T']],
    [['t_wind_juniper', 'T'], ['t_wind_pine', 'T'], ['t_frost_fir', 'T'], ['t_dead_thorn', 'T'], ['t_young_pine', 'T']],
    [['t_wind_juniper', 'T'], ['t_dead_thorn', 'T'], ['t_frost_fir', 'T'], ['t_storm_deadwood', 'T']],
    [['t_dead_thorn', 'T'], ['t_frost_fir', 'T']],
  ];
  const DENS = [0.5, 0.55, 0.62, 0.68, 0.74, 0.86];
  for (let y = 0; y < H; y++) for (let x = 3; x <= EDGE; x++) {
    const i = id(x, y), z = Math.min(5, zoneOf(x, y));
    if (!free(x, y) || rock[i]) continue;
    const g = noise(x + 101, y + 7, 5);
    // groves, thick at the foot and along the ridge, thinning to lone wind-bent junipers near the top
    const edgeBias = x <= 5 ? 0.12 : x >= EDGE - 1 ? 0.06 : 0;
    if (g + edgeBias > DENS[z] && rng.chance(0.75)) {
      const [name, src] = rng.pick(TREES[z]);
      const p = src === 'D' ? tall(name, x + 0.5 + jit(), y + 0.5 + jit(), rng.range(0.55, 0.72)) : town(name, x + 0.5 + jit(), y + 0.5 + jit());
      if (p) block(x, y);
    }
  }
  // the ridge: rocks and a few hardy trees on its ledges (unwalkable; it only frames the climb)
  for (let y = 0; y < H; y++) for (let x = 0; x <= 2; x++) {
    if (!rng.chance(x === 2 ? 0.3 : 0.18)) continue;
    const r = rng.next();
    if (r < 0.45) town(rng.pick(['moss_boulder', 'fieldstone_cluster']), x + 0.5 + jit(), y + 0.5 + jit());
    else if (r < 0.7) forest(rng.pick(['moss_boulder', 'stone_cairn']), x + 0.5, y + 0.5);
    else town(rng.pick(['t_wind_juniper', 't_wind_pine', 't_frost_fir']), x + 0.5 + jit(), y + 0.5 + jit());
  }
  // boulders, more of them higher up; flowers, shrubs and ferns lower down
  for (let n = 0; n < 220; n++) {
    const x = rng.int(3, EDGE), y = rng.int(0, H - 1);
    if (!free(x, y)) continue;
    const z = zoneOf(x, y), cx = x + 0.5 + jit(), cy = y + 0.5 + jit();
    if (rng.chance(0.18 + z * 0.08)) {
      const r = rng.next();
      if (r < 0.4) town(rng.pick(['moss_boulder', 'fieldstone_cluster']), cx, cy);
      else if (r < 0.75) forest('moss_boulder', cx, cy);
      else town(rng.pick(['ow_standing_stone', 'ow_ancient_stone']), cx, cy);
      block(x, y);
    } else if (z <= 2) {
      const pickName = rng.pick(['leafy_shrub', 'wildflowers', 'wildflowers', 'dry_reeds', 'mushrooms', 'thorn_bush', 'F:fern_clump', 'F:reeds', 'ow_blue_flowers', 'ow_red_flowers']);
      if (pickName.startsWith('F:')) forest(pickName.slice(2), cx, cy); else town(pickName, cx, cy);
      taken[id(x, y)] = 1;
    } else {
      const pickName = rng.pick(['dry_reeds', 'thorn_bush', 'F:dead_sapling', 'F:dead_bramble', 'fieldstone_cluster', 'F:feather_scatter']);
      if (pickName.startsWith('F:')) forest(pickName.slice(2), cx, cy); else town(pickName, cx, cy);
      taken[id(x, y)] = 1;
    }
  }
  // trail markers: a cairn every so often beside the path, signs at the foot of each ramp, rope posts at the top
  const beside = (c) => {
    const x = c % W, y = (c / W) | 0;
    for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [-1, 1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx >= 3 && nx <= EDGE && ny >= 0 && ny < H && !onTrail[id(nx, ny)] && !taken[id(nx, ny)] && Math.abs(hgt[id(nx, ny)] - hgt[c]) <= 2) return [nx, ny];
    }
    return null;
  };
  for (let k = 9; k < trail.length - 6; k += 11) {
    const at = beside(trail[k]);
    if (!at || keepClear(at[0] + 0.5, at[1] + 0.5)) continue;
    forest(k % 3 === 0 ? 'trail_sign' : 'stone_cairn', at[0] + 0.5, at[1] + 0.5);
    block(at[0], at[1]);
  }
  for (let k = 0; k < RAMP.length; k++) {
    const c0 = cliffAt(k, RAMP[k]);
    for (const [v, name] of [[c0 - 5, 'trail_sign'], [c0 + 4, 'rope_post']]) {
      const y = H - 1 - v;
      for (const x of [RAMP[k] - 3, RAMP[k] + 3]) {
        if (x < 3 || x > EDGE || y < 0 || y >= H || taken[id(x, y)] || onTrail[id(x, y)]) continue;
        forest(name, x + 0.5, y + 0.5); block(x, y); break;
      }
    }
  }
  // a climbers' camp beside the trail halfway up
  const mid = trail[Math.floor(trail.length * 0.5)], camp = beside(mid);
  const chests = [];
  if (camp) {
    const [cx, cy] = camp;
    forest('campfire', cx + 0.5, cy + 0.5, { light: 5 }); block(cx, cy);
    for (const [dx, dy, name] of [[1, 0, 'F:bedroll'], [0, 1, 'firewood_stack'], [1, 1, 'F:wooden_crate']]) {
      const x = cx + dx, y = cy + dy;
      if (x > EDGE || y >= H || onTrail[id(x, y)] || taken[id(x, y)]) continue;
      if (name.startsWith('F:')) forest(name.slice(2), x + 0.5, y + 0.5); else town(name, x + 0.5, y + 0.5);
      taken[id(x, y)] = 1;
    }
  }
  // the summit: an old shrine and cairns round the peak
  forest('ruined_shrine', SUMMIT[0] + 2.2, SUMMIT[1] - 1.4); block(Math.floor(SUMMIT[0] + 2.2), Math.floor(SUMMIT[1] - 1.4));
  for (const [dx, dy] of [[-3.2, -1.2], [3.4, 2.2], [-2.6, 3.4]]) {
    const x = Math.floor(SUMMIT[0] + dx), y = Math.floor(SUMMIT[1] + dy);
    if (y >= 0 && x <= EDGE && !onTrail[id(x, y)]) { forest('stone_cairn', x + 0.5, y + 0.5); block(x, y); }
  }

  // ---- loot: a chest on each hop-up ledge, one at the camp, one tucked under the ridge
  const up = new Uint8Array(N), uq = [s0]; up[s0] = 1;
  for (let k = 0; k < uq.length; k++) {
    const i = uq[k];
    for (const j of [i - 1, i + 1, i - W, i + W]) if (j >= 0 && j < N && map.walkableTile(j % W, (j / W) | 0) && !up[j] && Math.abs((j % W) - (i % W)) <= 1 && map.stepOk(i, j)) { up[j] = 1; uq.push(j); }
  }
  for (const [x, y] of ledges) {
    const i = id(Math.floor(x), Math.floor(y));
    map.block[i] = 0;
    if (up[i]) chests.push({ x, y, rare: rng.chance(0.35) });
  }
  if (camp) {
    const at = map.randomNear(camp[0] + 0.5, camp[1] + 0.5, 1.6, rng.fn());
    chests.push({ x: at[0], y: at[1], rare: false });
  }

  // ---- monsters: packs on every band, champions higher up, the Summit Warden on the peak
  const looks = rollLooks(biome, rng.fn()), spawns = [];
  const archs = biome.roster;
  for (let n = 0, tries = 0; n < 22 && tries < 500; tries++) {
    const x = rng.int(4, EDGE - 1) + 0.5, y = rng.int(2, H - 3) + 0.5;
    if (!map.circleFree(x, y, 0.35) || near(x, y, START, 10) || near(x, y, SUMMIT, 6)) continue;
    const z = zoneOf(Math.floor(x), Math.floor(y)), arch = rng.pick(archs);
    spawns.push({ x, y, arch, n: rng.int(2, 3 + Math.min(2, z >> 1)), rank: n % 6 === 5 || (z >= 4 && n % 3 === 0) ? 'champion' : 'normal', look: looks.pick(arch) });
    n++;
  }
  spawns.push({ x: SUMMIT[0] - 0.5, y: SUMMIT[1] + 2, arch: 'golem', rank: 'boss', look: looks.pick('golem') });

  // ---- level bookkeeping for the renderer and the minimap
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < N; i++) if (map.t[i] === 1) { lo = Math.min(lo, hgt[i]); hi = Math.max(hi, hgt[i]); }
  map.minLevel = lo; map.maxLevel = hi; map.baseLevel = lo - 14;
  map.losBlocks = true;
  map.mountain = { trail, summit: SUMMIT, ledges, camp };
  return {
    map, props, buildings: [], wallHangings: [], torches: [], townTiles: mountainFloors(), looks, spawns, chests,
    start: START, exit: SUMMIT, summit: SUMMIT, trail, seed,
  };
}
