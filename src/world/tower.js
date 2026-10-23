// THE SERPENTINE TOWER (docs/SERPENTINE_TOWER.md): a wide stone tower climbed by a spiral stair that hugs its wall,
// drawn live in three.js (gfx/tower3d.js). The game plays on the stair unrolled: a strip `w` tiles wide whose -x end
// is the top, so the climb runs up-left on screen (+y is the inner, railing side). game/tower.js warps every tile
// position onto the helix (view.js setWarp) and turns the camera with the hero, so the tower turns beneath him. The
// roof is a disk of its own at the -x end of the same grid, reached through the stairhead door; nothing joins the two
// in the grid. Lengths and heights are tiles; a tile of height is VZ world px. Five variants (TOWER_VARIANTS).
import { TileMap } from './map.js';
import { RNG } from '../core/util.js';
import { HW } from '../core/view.js';
import { rollLooks } from '../data/bestiary.js';

export const VZ = HW * Math.SQRT2 * Math.cos(Math.PI / 6); // 39.19 px: one tile of height in the 2:1 iso view

// geometry (rIn: the open well's radius, w: stair width, pitch: rise per turn, steps per turn) and the look of each
// variant: the stone texture and its palette swap (core/util.js recolor), trim, floor, railing, lanterns, chandeliers,
// windows, banners and the sky outside
export const TOWER_VARIANTS = [
  {
    id: 'serpentine', name: 'The Serpentine Tower', epithet: 'coils of verdigris stone',
    rIn: 11, w: 6, pitch: 10.5, turns: 4, steps: 52,
    stone: 'ashlar', stoneSwap: { colorize: [150, 0.22], light: -0.06, contrast: 1.08 },
    trim: 'chapel', trimSwap: { colorize: [160, 0.3], light: 0.02 }, floor: 'slate', floorSwap: { colorize: [140, 0.25], light: -0.04 },
    metal: 'MET-05_Oxidized_Copper', rail: 'serpent', lantern: 0xffb45a, chandelier: 'ring', windows: 'lancet', glass: 0x7fe0c0,
    banner: 0x2f6a4a, ribs: true, ambient: 0x4a5a58, moon: 0xa8d0ff, sky: ['#060a12', '#18263a', '#3a4a5a'], cloud: '#3a4a58',
  },
  {
    id: 'obsidian', name: 'The Obsidian Coil', epithet: 'black glass and violet fire',
    rIn: 13, w: 6, pitch: 11, turns: 3.5, steps: 56,
    stone: 'brick', stoneSwap: { colorize: [268, 0.18], light: -0.2, contrast: 1.2 },
    trim: 'panel', trimSwap: { colorize: [280, 0.35], light: -0.08 }, floor: 'slate', floorSwap: { colorize: [270, 0.3], light: -0.12, contrast: 1.15 },
    metal: 'MET-10_Amethyst_Corrosion', rail: 'iron', lantern: 0xb070ff, chandelier: 'crown', windows: 'slit', glass: 0xc080ff,
    banner: 0x4a1a6a, ribs: true, ambient: 0x3a3048, moon: 0xd0b0ff, sky: ['#05030a', '#1a0e2a', '#3a1e48'], cloud: '#2a2038',
  },
  {
    id: 'bloodstone', name: 'The Bloodstone Spire', epithet: 'red stone, black iron, a thousand candles',
    rIn: 10, w: 7, pitch: 11, turns: 4.5, steps: 52,
    stone: 'ashlar', stoneSwap: { colorize: [356, 0.4], light: -0.1, contrast: 1.1 },
    trim: 'brick', trimSwap: { colorize: [8, 0.3], light: -0.12 }, floor: 'chapel', floorSwap: { colorize: [350, 0.32], light: -0.08 },
    metal: 'MET-02_Riveted_Black_Iron', rail: 'balusters', lantern: 0xff7a40, chandelier: 'candelabra', windows: 'rose', glass: 0xff5a4a,
    banner: 0x8a1018, ribs: false, ambient: 0x5a3a36, moon: 0xffc0a0, sky: ['#0a0304', '#2a0a0e', '#5a1a14'], cloud: '#3a1a1a',
  },
  {
    id: 'rimeglass', name: 'The Rimeglass Tower', epithet: 'frost-white stone under a cold moon',
    rIn: 12, w: 6, pitch: 10, turns: 4, steps: 48,
    stone: 'chapel', stoneSwap: { colorize: [205, 0.2], light: 0.08, contrast: 1.05 },
    trim: 'ashlar', trimSwap: { colorize: [210, 0.3], light: 0.12 }, floor: 'slate', floorSwap: { colorize: [200, 0.25], light: 0.06 },
    metal: 'MET-08_Scratched_Blue_Steel', rail: 'arcade', lantern: 0x8ad8ff, chandelier: 'crystal', windows: 'lancet', glass: 0x9ae8ff,
    banner: 0x2a4a7a, ribs: true, ambient: 0x4a5a6a, moon: 0xc8e8ff, sky: ['#04070e', '#122238', '#2a4a68'], cloud: '#4a6078',
  },
  {
    id: 'sunken_bell', name: 'The Sunken Bell Tower', epithet: 'sandstone and tarnished gold, bells for chandeliers',
    rIn: 11, w: 7, pitch: 10.5, turns: 4, steps: 52,
    stone: 'brick', stoneSwap: { colorize: [34, 0.38], light: 0.02, contrast: 1.05 },
    trim: 'ashlar', trimSwap: { colorize: [40, 0.45], light: 0.04 }, floor: 'chapel', floorSwap: { colorize: [30, 0.35], light: -0.02 },
    metal: 'MET-04_Tarnished_Bronze', rail: 'balusters', lantern: 0xffc060, chandelier: 'bell', windows: 'slit', glass: 0xffd080,
    banner: 0x7a4a10, ribs: false, ambient: 0x5a4a3a, moon: 0xffe0b0, sky: ['#08060a', '#2a1a14', '#6a3a1a'], cloud: '#4a3424',
  },
];

/** The numbers of a variant's tower and grid, and the maps between tile positions and the tower (see the header). */
export function towerGeo(v) {
  const w = v.w, rIn = v.rIn, rWall = rIn + w, rc = rIn + w / 2, C = 2 * Math.PI * rc;
  const N = Math.round(v.turns * v.steps), d = C / v.steps, L = N * d, rise = v.pitch / v.steps, H = N * rise, slope = rise / d;
  const RT = rWall - 1.4;                                   // the roof's walkable radius, inside the parapet
  const AX = 48, XR = 96, GH = 2 * Math.ceil(rWall) + 8, AY = GH >> 1, YR = AY - (w >> 1);
  const XT = XR + 6, X0 = XT + 6, X1 = X0 + L, XB = X1 + 7, GW = Math.ceil(XB) + 6;
  const theta0 = Math.PI / 2;
  const g = {
    v, w, rIn, rWall, rc, C, N, d, L, rise, H, slope, RT, AX, AY, XR, GW, GH, YR, XT, X0, X1, XB, theta0,
    roofZ: H + 6.5,                                         // the roof deck, over the dome
    s: (x) => X1 - x,                                       // tiles climbed along the stair's centre line
    z: (s) => Math.min(H, Math.max(0, s * slope + rise / 2)),  // feet on the treads, sliding smoothly up
    theta: (s) => theta0 - s / rc,
    r: (y) => rWall - (y - YR),
    onRoof: (x) => x < XR,
  };
  g.sEnd = g.s(XT);                                         // the stairhead door
  g.alphaTop = g.theta(g.sEnd) + Math.PI / 2;               // the camera's turn on the roof: the door's at the far side
  g.door = [XT + 0.8, YR + w / 2];
  g.roofDoor = [AX, AY - rc + 3.2];                         // where the hero steps out of the stairhead turret
  /** Tower-frame position (tiles; z up) of tile position (x, y), on the stair or the roof. */
  g.point = (x, y, out = [0, 0, 0]) => {
    if (x < XR) {
      const cx = x - AX, cy = y - AY, a = g.alphaTop, c = Math.cos(a), s = Math.sin(a);
      out[0] = cx * c - cy * s; out[1] = cx * s + cy * c; out[2] = g.roofZ;
    } else {
      const s = g.s(x), t = g.theta(s), r = g.r(y);
      out[0] = r * Math.cos(t); out[1] = r * Math.sin(t); out[2] = g.z(s);
    }
    return out;
  };
  return g;
}

/** Pick a variant: forced (tests), else by seed. */
export const towerVariant = (seed, force) => TOWER_VARIANTS[force != null ? force % TOWER_VARIANTS.length : (seed >>> 3) % TOWER_VARIANTS.length];

export function generateTower(depth, biome, seed, force = null) {
  const v = towerVariant(seed, force), g = towerGeo(v), rng = new RNG(seed);
  const map = new TileMap(g.GW, g.GH), W = g.GW;
  // the stair, its landings (the ground floor at the foot, the stairhead at the top)
  for (let y = g.YR; y < g.YR + g.w; y++) for (let x = Math.floor(g.XT); x < Math.ceil(g.XB); x++) { const i = y * W + x; map.t[i] = 1; map.v[i] = 0; }
  // the roof: a disk inside the parapet, the stairhead turret blocked
  for (let y = 0; y < g.GH; y++) for (let x = 0; x < g.XR; x++) {
    const dx = x + 0.5 - g.AX, dy = y + 0.5 - g.AY;
    if (dx * dx + dy * dy > g.RT * g.RT) continue;
    const i = y * W + x; map.t[i] = 1;
    if (Math.hypot(dx, dy + g.rc) < 2.6) map.block[i] = 1;                               // the stairhead turret
    for (const a of [0, Math.PI / 2, Math.PI]) if (Math.hypot(dx - Math.cos(a) * g.RT * 0.68, dy - Math.sin(a) * g.RT * 0.68) < 1.0) map.block[i] = 1;   // braziers
  }
  map.tower = g;
  const start = [g.XB - 3.5, g.YR + g.w / 2];
  // packs all the way up: asleep on the floors above until the hero comes, some to drop down on him (game/tower.js)
  const looks = rollLooks(biome, rng.fn()), spawns = [], archs = biome.roster;
  for (let s = rng.range(12, 18), n = 0; s < g.L - 4; s += rng.range(13, 19), n++) {
    const arch = rng.pick(archs), lane = g.YR + rng.range(1.2, g.w - 1.2);
    const rank = n % 7 === 6 ? 'unique' : n % 4 === 3 ? 'champion' : 'normal';
    spawns.push({ x: g.X1 - s, y: lane, arch, n: rng.int(2, 3 + Math.min(3, Math.floor(depth / 30))), rank, look: looks.pick(arch) });
  }
  // a chest on every other turn's landing nook (by the wall) and two at the stairhead
  const chests = [];
  for (let k = 1; k < v.turns; k += 2) chests.push({ x: g.X1 - k * g.C - 2, y: g.YR + 0.9 });
  chests.push({ x: g.XT + 2.4, y: g.YR + 0.9 }, { x: g.XT + 2.4, y: g.YR + g.w - 0.9 });
  return {
    map, props: [], buildings: [], wallHangings: [], torches: [], looks, spawns, chests,
    start, exit: [g.AX, g.AY], tower: g, variant: v, seed,
  };
}
