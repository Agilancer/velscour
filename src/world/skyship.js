// The heroes' airship as a level (docs/SKY_BATTLE.md): the hull curves and deck plan shared by the 3D model
// (tools/airship3d_ironclad.js, baked by tools/skyship_bake.js) and the game, and the walk map built from them.
// Pure data, so it also runs under Node. Ship units are tiles (1 = one 64 x 32 tile), heights in the same unit;
// the bow points to -Z (tile -y, the upper right of the screen). Ship (x, z) sits on tile (OX + x, OY + z).
// A terrain level is 4 world px, and a ship unit of height is TU / LU = 9.8 levels.
import { TileMap } from './map.js';
export const TU = 32 * Math.SQRT2, LU = 4 / Math.cos(Math.PI / 6), LV = TU / LU;
export const L = 40, ZS = 20, QD_S = 0.2, FC_S = 0.8, QD_H = 2.2, FC_H = 2.0, BW = 1.1, WALL = 0.35;
export const MAP_W = 60, MAP_H = 64, OX = 30, OY = 34;
export const TOWER = [0.835, 0.945];
export const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
export const zAt = (s) => ZS - s * L, sAt = (z) => (ZS - z) / L;
export const beam = (s) => s < 0.1 ? 5.6 + 0.6 * sm(0, 0.1, s) : s < 0.6 ? 6.2 : 6.2 * (1 - Math.pow(Math.max(0, (s - 0.6) / 0.4), 2.2));
export const sheer = (s) => BW + QD_H * (1 - sm(0.17, 0.23, s)) + FC_H * sm(0.77, 0.83, s) + 1.0 * Math.pow(sm(0.88, 1, s), 2);
export const keel = (s) => -6.0 + 1.4 * (1 - sm(0, 0.3, s)) + 6.6 * Math.pow(sm(0.58, 1, s), 1.3);
// armored section: a vertical belt (the gun decks), a chine, a V bottom to a keel blade
export const prof = (k) => k < 0.42 ? 1 - 0.03 * k / 0.42 : k < 0.72 ? lerp(0.97, 0.72, (k - 0.42) / 0.3) : lerp(0.72, 0.04, (k - 0.72) / 0.28);
export const inner = (s) => Math.max(0, beam(s) - WALL);
export const deckAt = (s) => s < QD_S ? QD_H : s > FC_S ? FC_H : 0;
export const hullX = (s, y) => beam(s) * prof((sheer(s) - y) / (sheer(s) - keel(s)));
export const yAtK = (s, k) => sheer(s) - (sheer(s) - keel(s)) * k;
// the grand stairs: 4 tiles wide and 4 long, so they sit exactly on the tile grid
export const STAIR_W = 4, QD_STAIRS = [8, 12, 9], FC_STAIRS = [-12, -8, 8];   // [z0, z1, steps]
/** Deck height (ship units) at ship (x, z), stairs included; null off the decks. */
export function deckHeight(x, z) {
  if (Math.abs(x) < STAIR_W / 2) {
    if (z > QD_STAIRS[0] && z < QD_STAIRS[1]) return QD_H * (z - QD_STAIRS[0]) / (QD_STAIRS[1] - QD_STAIRS[0]);
    if (z > FC_STAIRS[0] && z < FC_STAIRS[1]) return FC_H * (FC_STAIRS[1] - z) / (FC_STAIRS[1] - FC_STAIRS[0]);
  }
  return deckAt(sAt(z));
}
// where the arrival portal (the bridge's great door) stands, and the landing in front of it
export const GATE = { z: zAt(TOWER[0]) + 0.04, w: 2.3, hs: 1.9, h: 3.0 };
export const LANDING = [0, -12.5];
// fixed fittings that block a tile: [x0, z0, x1, z1] in ship units
export const FITTINGS = [
  [-0.6, 13.9, 0.6, 16.0],                                    // helm and binnacle
  ...[-1, 1].map((sd) => { const x = sd * (inner(0.06) - 1.2), z = zAt(0.06); return [x - 1.0, z - 1.0, x + 1.0, z + 1.0]; }),  // turrets
  ...[-1, 1].map((sd) => { const x = sd * (GATE.w / 2 + 1.2); return [x - 0.25, -13.2, x + 0.25, -12.7]; }),                      // braziers
];

/**
 * The walk map: per tile `walk` (a deck tile), `lv` (its level), `struct` (part of the ship but not walkable: bulwarks,
 * the bridge, fittings, the hull below the decks). Bulwark tiles redraw over walkers behind them (gfx/terrain.js).
 */
export function shipLayout() {
  const N = MAP_W * MAP_H, walk = new Uint8Array(N), lv = new Int16Array(N), struct = new Uint8Array(N), ship = new Uint8Array(N);
  for (let ty = 0; ty < MAP_H; ty++) for (let tx = 0; tx < MAP_W; tx++) {
    const i = ty * MAP_W + tx, x = tx + 0.5 - OX, z = ty + 0.5 - OY, s = sAt(z);
    if (s < 0 || s > 1) continue;
    if (Math.abs(x) > beam(s) + 0.6) continue;
    ship[i] = 1;
    const h = deckHeight(x, z);
    lv[i] = Math.round(h * LV);
    let ok = Math.abs(x) < inner(s) - 0.45 && z < ZS - 0.85 && s < TOWER[0] - 0.012;
    if (ok && z > -12 && z < -11 && Math.abs(x) >= STAIR_W / 2) ok = false;   // the forecastle's front: rail over the bulkhead
    if (ok) for (const [x0, z0, x1, z1] of FITTINGS) if (x + 0.5 > x0 && x - 0.5 < x1 && z + 0.5 > z0 && z - 0.5 < z1) { ok = false; break; }
    walk[i] = ok ? 1 : 0;
    if (!ok) { struct[i] = 1; lv[i] = Math.round((Math.abs(x) < inner(s) ? h + 0.4 : sheer(s) + 0.1) * LV); }
  }
  return { W: MAP_W, H: MAP_H, walk, lv, struct, ship };
}
/** Ship (x, y, z) in ship units to [tile x, tile y, levels]. */
export const toTile = (x, y, z) => [OX + x, OY + z, y * LV];

/**
 * The Sky Battle's level: the ship's walk map as a height map whose every tile draws the baked pieces (map.c3only;
 * gfx/terrain.js), around it open sky. `baked` is the loaded set (gfx/castle3dart.js loadBaked): any tile with a piece
 * is part of the ship. The director (game/skybattle.js) brings the monsters; the level starts empty.
 */
export function generateSkyship(depth, biome, seed, baked) {
  const L = shipLayout(), map = new TileMap(L.W, L.H), N = L.W * L.H;
  map.hgt = new Int16Array(N);
  map.c3struct = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    const part = L.ship[i] || (baked && baked.base.has(i));
    if (!part) continue;
    map.t[i] = 1;
    map.hgt[i] = L.ship[i] ? L.lv[i] : 0;
    map.block[i] = L.walk[i] ? 0 : 1;
    map.c3struct[i] = L.walk[i] ? 0 : 1;
  }
  map.climb = 6; map.drop = 10; map.walkStep = 6;   // the grand stairs are walked (5-6 levels a tile), the raised decks walled
  map.c3only = true; map.occStruct = true; map.sky = true;
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < N; i++) if (map.t[i] === 1) { lo = Math.min(lo, map.hgt[i]); hi = Math.max(hi, map.hgt[i]); }
  map.minLevel = lo; map.maxLevel = hi; map.baseLevel = lo - 40;
  const start = [OX + LANDING[0] + 0.5, OY + LANDING[1]];
  return {
    map, props: [], buildings: [], wallHangings: [], torches: [], townTiles: null, spawns: [], chests: [], rooms: [],
    start, exit: [OX + 0.5, OY + GATE.z + 0.55], townPortal: [OX - 2.5, OY + 14.5], seed, layout: L,
  };
}
