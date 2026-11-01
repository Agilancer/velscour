// THE PIRATE SEAS (docs/PIRATE_SEAS.md): the decks as a level. The Dawnwake keeps the Sky Battle ironclad's deck plan
// (world/skyship.js shipLayout: decks, stairs, bulwarks, the gate), with her own fittings blocked too (two masts, the
// funnel) and her paddle boxes standing over the water amidships. Other ships' decks (a scenario's arena: a brig
// alongside, the galleon, the dreadnought...) are written into the same map from a top-down bake of their 3D model
// (gfx/seabattle3d.js bakeDeck -> applyDeck), and two decks are joined by a plank, a corvus or a gangway (joinDecks).
// The ships are drawn live in three.js; this map is only what is walked and what hides whoever stands behind it
// (game/seabattle.js horizon). Pure data, so it also runs under Node. Dawnwake (x, z) is tile (OX + x, OY + z).
import { TileMap } from './map.js';
import { shipLayout, MAP_W, MAP_H, OX as SKY_OX, OY as SKY_OY, LV, GATE, LANDING, beam, sAt, sheer, deckHeight } from './skyship.js';

/** The sea's map: room round the Dawnwake for decks lying alongside, astern or off at a distance. */
export const SEA_W = 104, SEA_H = 118, OX = 60, OY = 58;
export { LV, GATE, LANDING };
/** The Dawnwake's waterline (tools/seaship3d_dawnwake.js WL): the sea's level, ship units under the main deck. */
export const WL = -2.2;
export const SEA_LV = Math.round(WL * LV);
/** The Dawnwake's own fittings on the walkable main deck ([x0, z0, x1, z1], ship units; buildDawnwake info.fittings). */
export const FZ = -1.2;
export const SEA_FITTINGS = [[-0.5, -6.9, 0.5, -5.9], [-0.5, 3.9, 0.5, 4.9], [-1.25, FZ - 1.25, 1.25, FZ + 1.25]];
/** Tall things on the Dawnwake that hide whoever stands behind them (game/seabattle.js mask): [x, z, radius, y0, height]. */
export const SEA_COLUMNS = [[0, -6.4, 0.45, 0, 18.2], [0, 4.4, 0.5, 0, 20], [0, 13.55, 0.34, 2.2, 13.4], [0, FZ, 1.3, 0, 8.1]];
/** The paddle boxes amidships (half drums over the water): centre z, radius, top of the drum over the main deck. */
export const PADDLE = { z: 0, r: 3.28, y: -0.25, x0: 0.12, x1: 2.2 };
/**
 * Where boats lie off the port side: [ship z, distance of the boat's centre from her centreline]. Port is the far
 * side from the game camera, so the boats lie off, not alongside: a hull 3.4 tiles over the water hides the sea for
 * about 4 tiles behind it (39.2 px a unit up against 32 px a tile back along the view). Out here the boats show whole,
 * and their boarders swing across on the grapnel lines. Each berth is where nothing tall on her deck stands between
 * the boat and the camera: the view ray from a boat 12 out at z crosses her centreline at z + 12, so not behind the
 * funnel or the masts, nor the paddle box amidships; the aft one lies further out, clear of the middle one.
 * A scenario can bring its own (plugin `docks`).
 */
export const SEA_DOCKS = [[-16, 12], [2.5, 12], [12, 15.5]];
/** Where a captain's boat lies: off the port quarter, astern of her, with nothing of the Dawnwake between it and the
 *  camera (his title card frames him aboard); he comes over onto the quarterdeck. Tile offsets from (OX, OY). */
export const SEA_QUARTER = { x: -9.3, z: 25.5 };
/** Where the Tide captain's own gun-brig lies to: further off the port quarter (26 x 7), her starboard side to us. */
export const SEA_BRIG = { x: -14.5, z: 28 };
/** Deck ids in map.deck: 0 sea, 1 the Dawnwake, 2.. the arena decks in the order a scenario adds them. */
export const DAWNWAKE = 1;

/** Dawnwake (x, z) to the ground height there in ship units (the deck, the stairs; null off the walkable decks). */
export const seaDeck = (x, z) => deckHeight(x, z);

/**
 * The Pirate Seas' level: the walk map as a height map (map.hgt in levels, struct tiles at their top: bulwarks,
 * raised-deck fronts, fittings, the paddle boxes), around it the open sea. map.deck says whose deck a tile is. The
 * director (game/seabattle.js) adds a scenario's other decks and brings the boats; the level starts empty.
 */
export function generateSeaship(depth, biome, seed, size = null) {
  // a scenario fought on a bigger deck (the carrier, the dreadnought) asks for more sea: the map grows right and down
  const MW = Math.max(SEA_W, size ? size[0] : 0), MH = Math.max(SEA_H, size ? size[1] : 0);
  const L = shipLayout(), map = new TileMap(MW, MH), N = MW * MH, dx = OX - SKY_OX, dy = OY - SKY_OY;
  map.hgt = new Int16Array(N); map.deck = new Uint8Array(N);
  for (let ty = 0; ty < MAP_H; ty++) for (let tx = 0; tx < MAP_W; tx++) {
    const i = ty * MAP_W + tx, x = tx + 0.5 - SKY_OX, z = ty + 0.5 - SKY_OY, j = (ty + dy) * MW + tx + dx;
    let walk = !!L.walk[i], part = !!L.ship[i], lv = L.lv[i];
    if (walk) for (const [x0, z0, x1, z1] of SEA_FITTINGS) if (x + 0.5 > x0 && x - 0.5 < x1 && z + 0.5 > z0 && z - 0.5 < z1) { walk = false; lv = Math.round((deckHeight(x, z) + 0.6) * LV); break; }
    // the paddle boxes: a half drum outboard of each side amidships
    const ax = Math.abs(x), b = beam(0.5), dz = z - PADDLE.z;
    if (ax > b - 0.1 && ax < b + PADDLE.x1 + 0.4 && Math.abs(dz) < PADDLE.r) {
      part = true; walk = false;
      lv = Math.max(L.ship[i] ? lv : -999, Math.round((PADDLE.y + Math.sqrt(PADDLE.r * PADDLE.r - dz * dz)) * LV));
    }
    if (!part) continue;
    map.t[j] = 1; map.hgt[j] = lv; map.block[j] = walk ? 0 : 1; map.deck[j] = DAWNWAKE;
  }
  map.climb = 6; map.drop = 10; map.walkStep = 6;   // the grand stairs are walked (5-6 levels a tile), the raised decks walled
  // a walkable patch shut in by fittings (the forecastle's corners behind the braziers, one tile each) is no deck:
  // boarders landed there and nobody could path in or out; such pockets (under 8 tiles) become struct
  {
    const seen = new Uint8Array(N);
    for (let i = 0; i < N; i++) {
      if (seen[i] || map.deck[i] !== DAWNWAKE || map.block[i]) continue;
      const comp = [i]; seen[i] = 1;
      for (let k = 0; k < comp.length; k++) {
        const j = comp[k], x = j % MW, y = (j / MW) | 0;
        for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
          const n = (y + oy) * MW + x + ox;
          if ((ox || oy) && x + ox >= 0 && x + ox < MW && y + oy >= 0 && y + oy < MH && !seen[n] && map.deck[n] === DAWNWAKE && !map.block[n]) { seen[n] = 1; comp.push(n); }
        }
      }
      if (comp.length < 8) for (const j of comp) { map.block[j] = 1; map.hgt[j] += Math.round(0.6 * LV); }
    }
  }
  map.sea = true; map.noSky = true; map.losOverWater = true;   // across open water foes see each other (map.los)
  levels(map);
  const start = [OX + LANDING[0] + 0.5, OY + LANDING[1]];
  return {
    map, props: [], buildings: [], wallHangings: [], torches: [], townTiles: null, spawns: [], chests: [], rooms: [],
    start, exit: [OX + 0.5, OY + GATE.z + 0.55], townPortal: [OX - 2.5, OY + 14.5], seed, layout: L, sea: true,
    sheerAt: (z) => sheer(sAt(z)),
  };
}
/** The map's lowest and highest ground (render culling, picking). */
function levels(map) {
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < map.w * map.h; i++) if (map.t[i] === 1) { lo = Math.min(lo, map.hgt[i]); hi = Math.max(hi, map.hgt[i]); }
  map.minLevel = lo; map.maxLevel = hi; map.baseLevel = SEA_LV;
}
/** After the walk map changes (a deck added, a plank down): the path search's caches go, the culling box is worked out
 *  again (render.js propReach reads map.minLevel/maxLevel). */
export function mapChanged(map) { map._stepMask = null; map._los = null; map.flowFrom = [-999, -999]; levels(map); }

/**
 * Write a deck baked from a model (gfx/seabattle3d.js bakeDeck: per tile the median, lowest and highest top under a
 * cap, its 20th and 80th percentiles, and the uncapped top, in ship units over the Dawnwake's main deck) into the map
 * as deck `id`. A tile is walked when it is mostly covered, flat between its 20th and 80th percentile (< `flat` units:
 * ring bolts, gratings and a stair's tread don't count, a rail or a gun carriage does) and near one of the deck's levels
 * (`levels`: its main deck, quarterdeck, forecastle...; null for ground of any height: a reef, a tilted wreck); anything else on the ship is struct, standing at its 80th
 * percentile (bulwarks, deckhouse walls, masts' feet) and hiding whoever is behind it. Tiles of an earlier deck are left alone. Returns the deck's
 * tall things as columns [x, z, r, y0, h] (world tiles) for the sprite masks, and its walkable tile count.
 */
export function applyDeck(map, bake, id, { levels: lvs = [0], tol = 0.6, flat = 0.45, tall = 3 } = {}) {
  const cols = []; let walkN = 0;
  for (let j = 0; j < bake.h; j++) for (let i = 0; i < bake.w; i++) {
    const k = j * bake.w + i, tx = bake.x0 + i, ty = bake.z0 + j;
    if (tx < 0 || ty < 0 || tx >= map.w || ty >= map.h || bake.cover[k] < 0.4) continue;
    const t = ty * map.w + tx;
    if (map.deck[t] && map.deck[t] !== id) continue;
    const med = bake.med[k], lo = bake.lo[k], p20 = bake.p20[k], p80 = bake.p80[k];
    const lvl = lvs ? lvs.reduce((a, l) => (Math.abs(med - l) < Math.abs(med - a) ? l : a), lvs[0]) : med;   // levels null: any height (a reef, a tilted wreck)
    const walk = bake.cover[k] > 0.75 && p80 - p20 < flat && Math.abs(med - lvl) < tol;
    map.t[t] = 1; map.deck[t] = id; map.block[t] = walk ? 0 : 1;
    map.hgt[t] = Math.round((walk ? med : p80) * LV);
    if (walk) walkN++;
    if (bake.top[k] - lo > tall) cols.push([tx + 0.5, ty + 0.5, 0.55, lo, Math.min(16, bake.top[k] - lo)]);
  }
  mapChanged(map);
  return { cols, walkN };
}
/**
 * Join two decks: every tile within `w` of the segment from a to b ([tile x, tile y, height in ship units]) becomes
 * walkable at the height along it (a plank, a corvus, a gangway; the rails it crosses open). Returns the tiles it
 * changed with what they were, so unjoin() can put them back (a corvus hauled up).
 */
export function joinDecks(map, a, b, w = 0.75, id = 0) {
  const d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, was = [];
  const x0 = Math.floor(Math.min(a[0], b[0]) - w - 1), x1 = Math.ceil(Math.max(a[0], b[0]) + w + 1);
  const y0 = Math.floor(Math.min(a[1], b[1]) - w - 1), y1 = Math.ceil(Math.max(a[1], b[1]) + w + 1);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    if (tx < 0 || ty < 0 || tx >= map.w || ty >= map.h) continue;
    const px = tx + 0.5, py = ty + 0.5, k = Math.max(0, Math.min(1, ((px - a[0]) * (b[0] - a[0]) + (py - a[1]) * (b[1] - a[1])) / (d * d)));
    if (Math.hypot(px - (a[0] + (b[0] - a[0]) * k), py - (a[1] + (b[1] - a[1]) * k)) > w) continue;
    const t = ty * map.w + tx;
    was.push([t, map.t[t], map.block[t], map.hgt[t], map.deck[t]]);
    map.t[t] = 1; map.block[t] = 0; map.hgt[t] = Math.round((a[2] + (b[2] - a[2]) * k) * LV); if (!map.deck[t]) map.deck[t] = id;
  }
  mapChanged(map);
  return was;
}
export function unjoin(map, was) {
  for (const [t, tt, bl, h, dk] of was) { map.t[t] = tt; map.block[t] = bl; map.hgt[t] = h; map.deck[t] = dk; }
  mapChanged(map);
}
