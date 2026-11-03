// THE IRON EXPRESS (region id ghost_train; docs/GHOST_TRAIN.md): the train as a level. The cars lie end to end along
// tile x (the caboose at the back, the engine in front), three tiles wide on rows ROW0..ROW0+2; off the train is void
// while it runs. A station's platform lies on the near side (rows PLAT0..PLAT1-1, toward the camera) and is written
// into the map only while the train stands at it (platformOn/platformOff). The train is drawn live in three.js
// (gfx/ghosttrain3d.js): one unit a tile, the car floors at height 0 where the sprites stand. Pure data (runs under Node).
import { TileMap } from './map.js';
import { RNG } from '../core/util.js';
import { rollLooks } from '../data/bestiary.js';

export const GT_W = 200, GT_H = 24;
export const ROW0 = 11, ROWS = 3, CZ = ROW0 + ROWS / 2;   // the cars' rows; their centre line
export const PLAT0 = ROW0 + ROWS, PLAT1 = PLAT0 + 5;      // a platform's rows (near side)
export const PLAT_LEN = 24;                                // a platform's length in tiles
const X0 = 6;
/** The car types: a roof (the cutaway hides it over the hero), the near side's height, `cells`: tiles from the car's
 *  start blocked on the far row (crates, weapon racks, cells, tables), so two rows always pass. */
export const KINDS = {
  caboose: { roof: true, wall: 1.9 }, gondola: { roof: false, wall: 1.0 }, coach: { roof: true, wall: 1.9 },
  flat: { roof: false, wall: 0.35, cells: [2, 3, 6] }, boxcar: { roof: true, wall: 1.9, cells: [2, 3, 6] }, mail: { roof: true, wall: 1.9 },
  sleeper: { roof: true, wall: 1.9 },                        // the second coach style: a raised clerestory roof
  armoury: { roof: true, wall: 1.9, cells: [1, 4, 7] },     // weapon racks
  prison: { roof: true, wall: 1.9, cells: [2, 3, 6, 7] },   // two iron cages
  dining: { roof: true, wall: 1.9, cells: [2, 4, 6] },      // tables
  tender: { roof: false, wall: 1.0 }, engine: { roof: true, wall: 0 },
};
/** The fight cars from the back. The lieutenant holds the prison car halfway along (LT_CAR). */
const FIGHT = ['gondola', 'coach', 'flat', 'boxcar', 'dining', 'sleeper', 'armoury', 'prison', 'gondola', 'mail', 'flat', 'coach', 'boxcar', 'dining', 'armoury', 'sleeper'];
export const LT_CAR = 7;
/** The stations: called once this many cars are clear; `look` picks the buildings (gfx/ghosttrain3d.js STATION_LOOKS). */
export const STATIONS = [
  { after: 2, name: 'Hollowmere Halt', look: 'hall' }, { after: 5, name: 'Gallowmarsh Water Stop', look: 'water' },
  { after: 8, name: "Saint Vey's Crossing", look: 'chapel' }, { after: 11, name: 'Blackwick Junction', look: 'signal' },
  { after: 14, name: 'Coldharbour Goods', look: 'goods' },
];
/** The gorge the line crosses on its trestle (a scenic beat, gfx/ghosttrain3d.js trainGorge): once this many are clear. */
export const GORGE_AFTER = 7;
/** The cars from the back: { kind, x0, x1, i, roof, wall, crates } (x1 exclusive), one tile of gangway between each. */
export function trainLayout() {
  const cars = [];
  let x = X0;
  const add = (kind, len) => { cars.push({ kind, x0: x, x1: x + len, i: cars.length, ...KINDS[kind] }); x += len + 1; };
  add('caboose', 7);
  for (const k of FIGHT) add(k, 9);
  add('tender', 8);
  add('engine', 11);
  return cars;
}
export const CARS = trainLayout();
export const FIGHT_CARS = CARS.slice(1, 1 + FIGHT.length);
export const TENDER = CARS.find((c) => c.kind === 'tender'), ENGINE = CARS.find((c) => c.kind === 'engine'), CABOOSE = CARS[0];
/** The blocked tiles on a car's far row (crates, racks, cages, tables): [x, y] tiles. */
export const crateCells = (car) => (car.cells || []).map((dx) => [car.x0 + dx, ROW0]);
/** The car at tile x (a gangway belongs to the car behind it), or null. */
export const carAt = (x) => CARS.find((c) => x >= c.x0 && x < c.x1 + 1) || null;

/** After the walk map changes (a platform written or wiped): the path search's caches go. */
export function mapChanged(map) { map._stepMask = null; map._los = null; map.flowFrom = [-999, -999]; }
/** Write a platform from x0 to x1 (tiles) beside the train: walkable, level with the car floors. */
export function platformOn(map, x0, x1) {
  for (let y = PLAT0; y < PLAT1; y++) for (let x = Math.max(0, x0); x < Math.min(map.w, x1); x++) { const i = y * map.w + x; map.t[i] = 1; map.block[i] = 0; map.seen[i] = 1; }
  mapChanged(map);
}
export function platformOff(map) {
  for (let y = PLAT0; y < PLAT1; y++) for (let x = 0; x < map.w; x++) { const i = y * map.w + x; map.t[i] = 0; map.block[i] = 0; }
  mapChanged(map);
}
export const onPlatform = (x, y) => y >= PLAT0 && y < PLAT1;
/** A walkable spot on the cars nearest tile x (the near row first): where someone left on a platform lands. */
export function aboardSpot(map, x) {
  const lo = CABOOSE.x0 + 1.5, hi = TENDER.x1 - 2.5;
  for (let d = 0; d < 12; d += 0.5) for (const s of [1, -1]) for (const y of [ROW0 + 2.5, ROW0 + 1.5, ROW0 + 0.5]) {
    const tx = Math.min(hi, Math.max(lo, x + d * s));
    if (map.walkable(tx, y)) return [tx, y];
  }
  return [CABOOSE.x0 + 4.5, CZ];
}

/** Elite packs on the train by depth (a dungeon's 2 + depth/25 champions and 1 + depth/45 uniques, at a train's
 *  thirty-odd packs, eased: a three-wide train leaves no room to kite): 4 champion packs at first, 7 by depth 150; a
 *  unique pack from 75, two from 150. */
export const trainElites = (depth) => ({ champs: 4 + Math.floor(Math.min(depth, 150) / 50), uniques: Math.floor(Math.min(depth, 150) / 75) });
/** Which packs the elites lead, first to last: [car, pack]: every third car's leader from the front, then the rest. */
const ELITE_ORDER = (() => {
  const n = FIGHT.length, out = [];
  for (const p of [0, 1]) for (let off = 0; off < 3; off++) for (let k = n - 1 - off; k >= 1; k -= 3) if (k !== LT_CAR) out.push([k, p]);
  return out;
})();

export function generateGhostTrain(depth, biome, seed) {
  const rng = new RNG(seed), map = new TileMap(GT_W, GT_H);
  for (const car of CARS) {
    const gap = car.kind === 'engine' ? 0 : 1;   // the gangway to the next car
    for (let y = ROW0; y < ROW0 + ROWS; y++) for (let x = car.x0; x < car.x1 + gap; x++) {
      const i = y * GT_W + x; map.t[i] = 1;
      if (car.kind === 'engine' || (car.kind === 'tender' && x >= car.x1 - 2) || (car.kind === 'caboose' && x === car.x0)) map.block[i] = 1;   // the engine; the coal heap; the stove
    }
    for (const [x, y] of crateCells(car)) map.block[y * GT_W + x] = 1;
  }
  map.noSky = true;
  map.ghostTrain = true;
  // ---- monsters: a pack or two on every fight car (worse further forward), the raiders' chief on the tender. Deeper
  // down it fills up as a dungeon does (world/dungeon.js): a third pack on the forward cars from depth 60, a raider
  // more a pack past 30 (and 100), and more of the packs led by elites (trainElites).
  const looks = rollLooks(biome, rng.fn()), spawns = [], roster = biome.roster;
  for (const a of roster) looks.pick(a);   // every look the boarders may take is chosen (and its art loaded) now
  FIGHT_CARS.forEach((car, k) => {
    const packs = k < 2 || k === LT_CAR ? 1 : depth >= 60 && k % 2 ? 3 : 2;   // (a third pack on every other car deep)
    for (let p = 0; p < packs; p++) {
      let x, y, tries = 0;
      do { x = rng.range(car.x0 + 1.5, car.x1 - 1.5); y = ROW0 + rng.int(0, ROWS - 1) + 0.5; } while (!map.walkable(x, y) && ++tries < 30);
      const arch = rng.pick(roster);
      const n = rng.int(2, 3) + Math.floor(k / 6) + (depth > 30 && rng.chance(0.4) ? 1 : 0) + (depth >= 100 ? 1 : 0);
      spawns.push({ x, y, arch, n, rank: 'normal', look: looks.pick(arch), car: k, p });
    }
  });
  const { champs, uniques } = trainElites(depth);
  ELITE_ORDER.map(([k, p]) => spawns.find((s) => s.car === k && s.p === p)).filter(Boolean).slice(0, champs + uniques)
    .forEach((s, i) => { s.rank = i < uniques ? 'unique' : 'champion'; s.n = s.rank === 'unique' ? Math.max(3, Math.min(5, s.n)) : Math.min(4, s.n); });   // (a dungeon's elite pack sizes)
  // the lieutenant (game/ghosttrain.js spawns him: one guardian per level is game.js's): another bestiary boss look
  const ltCar = FIGHT_CARS[LT_CAR], lt = looks.boss(roster, rng.fn());
  const lieutenant = { x: ltCar.x0 + 5.5, y: CZ, arch: lt ? lt.arch : 'knight', look: lt ? lt.look : looks.pick('knight') };
  const boss = looks.boss(roster, rng.fn());
  spawns.push({ x: TENDER.x0 + 2.5, y: CZ, arch: boss ? boss.arch : 'knight', rank: 'boss', look: boss ? boss.look : looks.pick('knight') });
  map.seen.fill(0);
  return {
    map, props: [], buildings: [], wallHangings: [], torches: [], townTiles: null, looks, spawns, chests: [], rooms: [],
    start: [CABOOSE.x0 + 4.5, CZ], townPortal: [CABOOSE.x0 + 1.8, CZ], exit: [TENDER.x0 + 3, CZ], seed, cars: CARS, lieutenant,
  };
}
