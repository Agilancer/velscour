// Sunscorch Oasis: The Act II Desert Town
// A vibrant desert oasis settlement featuring sandstone canyon cliffs, a sparkling central oasis pool,
// the Grand Desert Bazaar, Bedouin canvas pavilions, ancient ruin monuments, and all town vendors and services.
import { TileMap } from './map.js';
import { RNG, TAU, makeCanvas } from '../core/util.js';
import { TW } from '../core/view.js';
import { VENDORS, townObject } from './town.js';
import {
  seaOfSandObject,
  seaOfSandCliff,
  seaOfSandFrames,
  seaOfSandFloorTiles,
  loadSeaOfSandPack,
} from '../gfx/seaofsand.js';
import { SAND_H } from './overworld.js';

export const ACT2_TOWN_NAME = 'Sunscorch Oasis';

const TREE_NAMES = new Set([
  'palm_seedling', 'dwarf_palm', 'young_thorn_acacia', 'saltbush', 'dry_reeds', 'spiny_aloe',
  'short_bent_palm', 'wind_bent_acacia', 'dead_thorn_snag', 'date_palm', 'doum_palm',
  'umbrella_acacia', 'tall_slender_palm', 'twin_palms', 'split_trunk_palm', 'fruiting_oasis_palm',
  'storm_broken_giant_palm', 'fossilized_dead_tree'
]);

let act2TownTilesCache = null;

/**
 * Act 2 desert town ground tiles:
 * Sea of Sand pack floor tiles (0-59) + custom shimmering oasis water tile (index 60).
 */
export function makeAct2TownTiles() {
  if (act2TownTilesCache) return act2TownTilesCache;
  const baseTiles = seaOfSandFloorTiles();

  // Create shimmering isometric turquoise oasis water tile (160 x 80)
  const waterCanvas = makeCanvas(160, 80);
  const wg = waterCanvas.getContext('2d');

  wg.beginPath();
  wg.moveTo(80, 0);
  wg.lineTo(160, 40);
  wg.lineTo(80, 80);
  wg.lineTo(0, 40);
  wg.closePath();

  // Vibrant desert oasis water gradient
  const grad = wg.createRadialGradient(80, 40, 6, 80, 40, 75);
  grad.addColorStop(0, '#0a6270');
  grad.addColorStop(0.45, '#12868b');
  grad.addColorStop(0.8, '#1eada6');
  grad.addColorStop(1, '#3ecbbd');
  wg.fillStyle = grad;
  wg.fill();

  // Soft sunlight caustic wave reflections
  wg.strokeStyle = 'rgba(170, 255, 245, 0.45)';
  wg.lineWidth = 1.8;
  wg.beginPath();
  wg.ellipse(80, 40, 36, 16, -0.15, 0, Math.PI * 2);
  wg.stroke();

  wg.beginPath();
  wg.ellipse(70, 32, 18, 8, 0.2, 0, Math.PI * 2);
  wg.stroke();

  wg.beginPath();
  wg.ellipse(92, 46, 20, 9, -0.1, 0, Math.PI * 2);
  wg.stroke();

  // Lighter outer diamond rim
  wg.strokeStyle = 'rgba(215, 255, 250, 0.55)';
  wg.lineWidth = 1.0;
  wg.beginPath();
  wg.moveTo(80, 2);
  wg.lineTo(158, 40);
  wg.lineTo(80, 78);
  wg.lineTo(2, 40);
  wg.closePath();
  wg.stroke();

  const waterTile = {
    img: waterCanvas,
    sx: 0,
    sy: 0,
    w: 160,
    h: 80,
    lum: 0.08,
    seamless: true,
    name: 'oasis_water',
  };

  act2TownTilesCache = [...baseTiles, waterTile];
  return act2TownTilesCache;
}

/**
 * Generate a randomized Sunscorch Oasis (Act II Town).
 * Retries with perturbed seeds if pathfinding/connectivity verification fails.
 */
export function generateAct2Town(tileset, seed = 1337) {
  let t = null;
  for (let i = 0; i < 16 && !t; i++) {
    t = rollAct2Town(tileset, (seed + i * 7919) >>> 0, i === 15);
  }
  if (t) t.seed = seed;
  return t;
}

function rollAct2Town(tileset, seed, isLastTry) {
  const rng = new RNG(seed);
  const W = rng.int(54, 58), H = rng.int(54, 58);
  const N = W * H;
  const map = new TileMap(W, H);
  map.t.fill(1); // All walkable ground by default

  const mat = new Uint8Array(N); // Sea of Sand floor index per tile (0: fine dune sand)
  const use = new Uint8Array(N); // 0: sand, 1: paved/trail, 2: stall, 3: water, 4: cliff perimeter
  const keep = new Uint8Array(N); // Reserved walkable areas

  const I = (x, y) => y * W + x;
  const inb = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
  const R = (a, b) => rng.range(a, b);

  // ------------------------------------------------------------------ 1. Sandstone Cliff Canyon Perimeter
  const ph = [R(0, 9), R(0, 9), R(0, 9)];
  const cliffAt = (x, y) => {
    const e = Math.min(x, y, W - 1 - x, H - 1 - y);
    const f = 3.6 + 1.2 * Math.sin(x * 0.45 + ph[0]) + 1.1 * Math.sin(y * 0.42 + ph[1]) + 0.8 * Math.sin((x + y) * 0.28 + ph[2]);
    return e < Math.max(2, Math.min(6, f));
  };
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (cliffAt(x, y)) {
        use[I(x, y)] = 4;
        map.block[I(x, y)] = 1;
      }
    }
  }

  // ------------------------------------------------------------------ 2. Central Oasis Pond & Shore
  const C = { x: Math.floor(W / 2 + R(-2, 2)), y: Math.floor(H / 2 + R(-2, 2)) };
  const rwX = R(3.6, 4.4), rwY = R(3.2, 3.8);

  // Water pool: index 60 in makeAct2TownTiles()
  const WATER_INDEX = 60;
  for (let y = Math.floor(C.y - rwY - 2); y <= Math.ceil(C.y + rwY + 2); y++) {
    for (let x = Math.floor(C.x - rwX - 2); x <= Math.ceil(C.x + rwX + 2); x++) {
      if (!inb(x, y)) continue;
      const d = ((x + 0.5 - C.x) / rwX) ** 2 + ((y + 0.5 - C.y) / rwY) ** 2;
      const i = I(x, y);
      if (d <= 1.0) {
        mat[i] = WATER_INDEX;
        use[i] = 3;
        map.block[i] = 1; // Deep water cannot be walked across
      } else if (d <= 1.7) {
        // Oasis shoreline: mud and damp silt (floor 54: oasis_edge_mud)
        if (use[i] === 0) {
          mat[i] = 54;
          use[i] = 1;
        }
      }
    }
  }

  // Wooden boardwalk/deck on the southeast shore of the pond (floor 50: weathered_palm_boards)
  const pierX = Math.floor(C.x + rwX * 0.7);
  const pierY = Math.floor(C.y + rwY * 0.4);
  for (let dy = 0; dy <= 2; dy++) {
    for (let dx = 0; dx <= 1; dx++) {
      const px = pierX + dx, py = pierY + dy;
      if (inb(px, py) && use[I(px, py)] !== 4) {
        mat[I(px, py)] = 50;
        use[I(px, py)] = 1;
        map.block[I(px, py)] = 0; // Walkable pier
      }
    }
  }

  // Well area on the north bank: sandstone flags (floor 31)
  const wellPos = { x: C.x + 0.5, y: C.y - rwY - 1.2 };
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      const wx = Math.floor(wellPos.x + dx), wy = Math.floor(wellPos.y + dy);
      if (inb(wx, wy) && use[I(wx, wy)] !== 4 && use[I(wx, wy)] !== 3) {
        mat[I(wx, wy)] = 31; // worn_sandstone_flag
        use[I(wx, wy)] = 1;
        map.block[I(wx, wy)] = 0;
      }
    }
  }

  // ------------------------------------------------------------------ 3. Grand Bazaar Market Plaza
  // North and Northeast of the oasis pond: paved with sunbaked block paving (floor 30) & mosaic (floor 32)
  const plazaBlobs = [
    [C.x + 0.5, C.y - rwY - 4.5, R(5.5, 7.5), R(4.5, 6.0)],
    [C.x + 5.5, C.y - rwY - 2.5, R(4.0, 5.5), R(4.0, 5.0)],
    [C.x - 4.5, C.y - rwY - 3.0, R(4.0, 5.0), R(3.5, 4.5)],
  ];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (use[I(x, y)] === 4 || use[I(x, y)] === 3) continue;
      const inPlaza = plazaBlobs.some(([bx, by, rx, ry]) => ((x + 0.5 - bx) / rx) ** 2 + ((y + 0.5 - by) / ry) ** 2 < 1);
      if (inPlaza) {
        mat[I(x, y)] = rng.chance(0.2) ? 32 : 30; // 30: sunbaked_block_paving, 32: mosaic_fragments
        use[I(x, y)] = 1;
      }
    }
  }

  // ------------------------------------------------------------------ 4. Caravan Trails (Lanes)
  const paintTrail = (x, y, r, m, shoulder) => {
    for (let yy = Math.floor(y - r - 1); yy <= y + r + 1; yy++) {
      for (let xx = Math.floor(x - r - 1); xx <= x + r + 1; xx++) {
        if (!inb(xx, yy) || use[I(xx, yy)] === 4 || use[I(xx, yy)] === 3) continue;
        const d = Math.hypot(xx + 0.5 - x, yy + 0.5 - y), i = I(xx, yy);
        if (d <= r) {
          if (mat[i] < 30) mat[i] = m;
          use[i] = 1;
        } else if (shoulder && d <= r + 0.75 && mat[i] === 0) {
          mat[i] = 23; // deep_caravan_ruts
        }
      }
    }
  };

  const lane = (x0, y0, x1, y1, r, m, shoulder) => {
    let x = x0, y = y0;
    const pts = [], phase = R(0, TAU), wig = R(0.2, 0.45);
    for (let k = 0; k < 350; k++) {
      const d = Math.hypot(x1 - x, y1 - y);
      if (d < 0.6) break;
      let a = Math.atan2(y1 - y, x1 - x) + Math.sin(k * 0.1 + phase) * wig * Math.min(1, d / 6);
      x += Math.cos(a) * 0.5;
      y += Math.sin(a) * 0.5;
      if (Math.min(x, y, W - 1 - x, H - 1 - y) < 4) break;
      paintTrail(x, y, r, m, shoulder);
      pts.push([x, y]);
    }
    return pts;
  };

  // Dungeon Portal Yard: situated to the East in an ancient sandstone ruin courtyard
  const portal = {
    x: Math.min(W - 8, Math.max(8, Math.floor(C.x + R(14, 18)))) + 0.5,
    y: Math.min(H - 8, Math.max(8, Math.floor(C.y + R(-3, 3)))) + 0.5,
  };
  // Pave dungeon portal courtyard with worn sandstone flags (floor 31) and processional stone (34)
  for (let y = Math.floor(portal.y - 4); y <= portal.y + 4; y++) {
    for (let x = Math.floor(portal.x - 4); x <= portal.x + 4; x++) {
      if (!inb(x, y) || use[I(x, y)] === 4) continue;
      const d = Math.hypot(x + 0.5 - portal.x, y + 0.5 - portal.y), i = I(x, y);
      if (d < 4.5) keep[i] = 1;
      if (d < 3.2) {
        mat[i] = d < 1.4 ? 34 : 31; // 34: engraved_processional_stone
        use[i] = 1;
        map.block[i] = 0;
      }
    }
  }

  // Act I Waypoint Portal: situated to the North among the calm date palms
  const act1Portal = {
    x: Math.min(W - 8, Math.max(8, Math.floor(C.x + R(-4, 4)))) + 0.5,
    y: Math.min(H - 8, Math.max(8, Math.floor(C.y - rwY - R(10, 13)))) + 0.5,
  };
  for (let y = Math.floor(act1Portal.y - 3); y <= act1Portal.y + 3; y++) {
    for (let x = Math.floor(act1Portal.x - 3); x <= act1Portal.x + 3; x++) {
      if (!inb(x, y) || use[I(x, y)] === 4) continue;
      const d = Math.hypot(x + 0.5 - act1Portal.x, y + 0.5 - act1Portal.y), i = I(x, y);
      if (d < 3.6) keep[i] = 1;
      if (d < 2.5) {
        mat[i] = d < 1.2 ? 32 : 31;
        use[i] = 1;
        map.block[i] = 0;
      }
    }
  }

  // Eternal Breach Portal: situated to the West in an excavated sandy basin
  const breach = {
    x: Math.min(W - 8, Math.max(8, Math.floor(C.x - R(13, 17)))) + 0.5,
    y: Math.min(H - 8, Math.max(8, Math.floor(C.y + R(-2, 4)))) + 0.5,
  };
  for (let y = Math.floor(breach.y - 3); y <= breach.y + 3; y++) {
    for (let x = Math.floor(breach.x - 3); x <= breach.x + 3; x++) {
      if (!inb(x, y) || use[I(x, y)] === 4) continue;
      const d = Math.hypot(x + 0.5 - breach.x, y + 0.5 - breach.y), i = I(x, y);
      if (d < 3.6) keep[i] = 1;
      if (d < 2.5) {
        mat[i] = d < 1.2 ? 21 : 15; // dried_wadi_bed / caravan_track
        use[i] = 1;
        map.block[i] = 0;
      }
    }
  }

  // Caravan roads connecting the Central Bazaar to the portals
  const roads = [
    lane(C.x + 0.5, wellPos.y - 1, portal.x, portal.y, 1.4, 15, true),
    lane(C.x + 0.5, wellPos.y - 1, act1Portal.x, act1Portal.y, 1.3, 15, true),
    lane(C.x + 0.5, wellPos.y - 1, breach.x, breach.y, 1.3, 15, true),
  ];

  // Soft dune variations on open sand (floor 1: rippled_amber_sand, floor 2: pale_leeward_sand)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = I(x, y);
      if (use[i] === 0) {
        const duneWave = (Math.sin(x * 0.22 + seed * 0.001) + Math.cos(y * 0.18 - x * 0.09)) / 2;
        if (duneWave > 0.6) mat[i] = 1; // rippled_amber_sand
        else if (duneWave < -0.65) mat[i] = 2; // pale_leeward_sand
      }
    }
  }

  // ------------------------------------------------------------------ 5. Props, Cliffs & Scatter
  const props = [];
  const npcs = [];
  const k = TW / 160; // 0.4

  const freeAt = (x, y, radius = 0.5) => {
    const tx = Math.floor(x), ty = Math.floor(y);
    if (!inb(tx, ty) || map.block[I(tx, ty)] || use[I(tx, ty)] === 4 || use[I(tx, ty)] === 3) return false;
    if (keep[I(tx, ty)]) return false;
    return !props.some((p) => Math.hypot(p.x - x, p.y - y) < radius);
  };

  const addProp = (name, x, y, opts = {}) => {
    const isTree = opts.tree ?? TREE_NAMES.has(name);
    const spr = seaOfSandObject(name, isTree ? 'tree' : 'scatter');
    if (!spr) return false;
    const h = (SAND_H[name] || 40) * (opts.scale || rng.range(0.96, 1.04));
    const propK = h / (spr.h * (spr.pixelScale || 1));
    props.push({
      kind: 'scatter',
      x,
      y,
      spr,
      k: propK,
      flip: opts.flip ?? rng.chance(0.5),
      light: opts.light || 0,
      tree: isTree,
    });
    if (opts.solid || isTree) {
      map.block[I(Math.floor(x), Math.floor(y))] = 1;
    }
    return true;
  };

  // Dress the Sandstone Cliff Canyon Perimeter
  const cliffs = seaOfSandFrames('cliff');
  const sandstone = cliffs.find((f) => f.material === 'sunbaked_sandstone')?.material;
  const ruinBrick = cliffs.find((f) => f.material === 'ruin_brick')?.material;
  const cliffByMask = new Map();
  for (const f of cliffs) {
    if (f.connection_mask != null) {
      if (!cliffByMask.has(f.connection_mask)) cliffByMask.set(f.connection_mask, []);
      cliffByMask.get(f.connection_mask).push(f);
    }
  }
  const dirs = [[0, -1, 1], [1, 0, 2], [0, 1, 4], [-1, 0, 8]];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (use[I(x, y)] === 4) {
        let mask = 0;
        for (const [dx, dy, bit] of dirs) {
          const nx = x + dx, ny = y + dy;
          if (nx >= 0 && ny >= 0 && nx < W && ny < H && use[I(nx, ny)] === 4) mask |= bit;
        }
        const variants = cliffByMask.get(mask) || cliffByMask.get(0);
        if (variants && variants.length) {
          const nearRuin = Math.hypot(x + 0.5 - portal.x, y + 0.5 - portal.y) < 10;
          const targetMat = nearRuin && ruinBrick ? ruinBrick : sandstone;
          const family = variants.filter((v) => v.material === targetMat);
          const f = rng.pick(family.length ? family : variants);
          const spr = seaOfSandCliff(f.name);
          if (spr) {
            props.push({
              kind: 'scatter',
              x: x + 0.5,
              y: y + 0.5,
              spr,
              k, // Cliff slices are pre-proportioned for 160x80 cells (k = TW / 160)
              flip: false,
            });
          }
        }
      }
    }
  }

  // The Central Well & North Bank Facilities
  addProp('rope_pulley_well', wellPos.x, wellPos.y, { solid: true, flip: false });
  addProp('bronze_brazier', wellPos.x - 2.2, wellPos.y + 0.2, { solid: true, light: 4.8 });
  addProp('bronze_brazier', wellPos.x + 2.2, wellPos.y + 0.2, { solid: true, light: 4.8 });
  addProp('cold_firepit', wellPos.x, wellPos.y - 2.2, { solid: false });
  addProp('salt_trough', wellPos.x + 1.8, wellPos.y - 1.6, { solid: true });
  addProp('clay_water_jar', wellPos.x - 1.2, wellPos.y + 0.6, { solid: false });
  addProp('waterskin_rack', wellPos.x + 1.2, wellPos.y + 0.6, { solid: true });

  // ------------------------------------------------------------------ 6. The 9 Vendor Stalls & Pavilions
  // Dedicated vendor positions around the Grand Bazaar Plaza:
  const STALL_CONFIGS = [
    {
      id: 'weapons',
      name: 'weaponsmith',
      offset: [-7.0, -4.5],
      tent: 'market_awning',
      props: ['buried_weapon_cache', 'caravan_chest', 'bronze_brazier'],
      mat: 51, // reed_weave_mat
    },
    {
      id: 'armor',
      name: 'armorer',
      offset: [-4.0, -7.5],
      tent: 'canvas_tent',
      props: ['pack_saddle', 'caravan_chest', 'salt_trough'],
      mat: 52, // tent_packed_earth
    },
    {
      id: 'upgrade',
      name: 'blacksmith',
      offset: [0.0, -8.5],
      tent: 'market_awning',
      props: ['bronze_brazier', 'clay_water_jar', 'waterskin_rack'],
      mat: 30, // sunbaked_block_paving
      smithy: true,
    },
    {
      id: 'enchant',
      name: 'enchanter',
      offset: [4.5, -8.0],
      tent: 'canvas_tent',
      props: ['turquoise_ore', 'amber_crystal', 'hanging_lantern'],
      mat: 52,
    },
    {
      id: 'gems',
      name: 'gem_merchant',
      offset: [8.5, -5.5],
      tent: 'market_awning',
      props: ['rolled_carpet_stack', 'amber_crystal', 'turquoise_ore'],
      mat: 32, // mosaic_fragments
    },
    {
      id: 'socket',
      name: 'jeweler',
      offset: [9.0, -1.5],
      tent: 'market_awning',
      props: ['carved_standing_stone', 'caravan_chest', 'reed_crate'],
      mat: 51,
    },
    {
      id: 'alchemist',
      name: 'alchemist',
      offset: [-8.5, -1.0],
      tent: 'market_awning',
      props: ['clay_water_jar', 'clay_water_jar', 'spiny_aloe'],
      mat: 51,
    },
    {
      id: 'gamble',
      name: 'gambler',
      offset: [6.5, 3.0],
      tent: 'canvas_tent',
      props: ['broken_cart_wheel', 'rolled_carpet_stack', 'reed_crate'],
      mat: 52,
    },
    {
      id: 'infernal',
      name: 'travelling_merchant',
      offset: [-6.5, 3.5],
      tent: 'canvas_tent',
      props: ['giant_skull', 'bronze_brazier', 'fossil_ribcage'],
      mat: 21, // dried_wadi_bed
    },
  ];

  for (const cfg of STALL_CONFIGS) {
    const v = VENDORS.find((ven) => ven.id === cfg.id);
    if (!v) continue;
    const sx = Math.floor(C.x + cfg.offset[0]) + 0.5;
    const sy = Math.floor(wellPos.y + cfg.offset[1]) + 0.5;

    // Pave stall ground with rug/mat/stone
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const px = Math.floor(sx + dx), py = Math.floor(sy + dy);
        if (inb(px, py) && use[I(px, py)] !== 4 && use[I(px, py)] !== 3) {
          mat[I(px, py)] = cfg.mat;
          use[I(px, py)] = 2; // stall
        }
      }
    }

    // Place the stall structure (awning or canvas tent)
    addProp(cfg.tent, sx, sy - 0.8, { solid: true, flip: rng.chance(0.5) });

    // Homunculus' anvil stump & forge
    if (cfg.smithy) {
      addProp('bronze_brazier', sx - 1.4, sy + 0.3, { solid: true, light: 5.0 });
      addProp('waterskin_rack', sx + 1.4, sy + 0.3, { solid: true });
    }

    // Place decorative shop props around the sides
    if (cfg.props[0]) addProp(cfg.props[0], sx - 1.2, sy - 0.2, { solid: true });
    if (cfg.props[1]) addProp(cfg.props[1], sx + 1.2, sy - 0.2, { solid: true });
    if (cfg.props[2]) addProp(cfg.props[2], sx + (rng.chance(0.5) ? -1.5 : 1.5), sy + 0.8, { solid: false, light: cfg.props[2].includes('brazier') || cfg.props[2].includes('lantern') ? 4.5 : 0 });

    // The vendor stands in front of their stall
    const npcX = sx;
    const npcY = sy + 0.6;
    keep[I(Math.floor(npcX), Math.floor(npcY))] = 1;
    map.block[I(Math.floor(npcX), Math.floor(npcY))] = 0;
    // Keep approach in front of vendor clear
    keep[I(Math.floor(npcX), Math.floor(npcY + 1))] = 1;
    map.block[I(Math.floor(npcX), Math.floor(npcY + 1))] = 0;

    npcs.push({
      vendor: v,
      x: npcX,
      y: npcY,
      flip: npcX < C.x,
      aura: v.travelling ? 0.45 : undefined,
      auraCol: v.travelling ? '#ff5522' : undefined,
    });
  }

  // ------------------------------------------------------------------ 7. Oasis Palms, Reeds & Vegetation
  // Ring the central water pond with majestic palms and oasis reeds
  const oasisFloraAngles = [0, 0.45, 0.95, 1.4, 1.9, 2.5, 3.1, 3.7, 4.3, 4.9, 5.5, 6.0];
  for (const a of oasisFloraAngles) {
    const prX = C.x + Math.cos(a) * (rwX + R(0.8, 1.8));
    const prY = C.y + Math.sin(a) * (rwY + R(0.7, 1.5));
    if (freeAt(prX, prY, 1.2)) {
      const treeName = rng.pick(['fruiting_oasis_palm', 'date_palm', 'doum_palm', 'twin_palms', 'tall_slender_palm', 'split_trunk_palm']);
      addProp(treeName, prX, prY, { tree: true });
    }
  }
  // Reeds along the water's edge
  for (let i = 0; i < 18; i++) {
    const a = R(0, TAU);
    const rx = C.x + Math.cos(a) * (rwX + R(0.2, 0.9));
    const ry = C.y + Math.sin(a) * (rwY + R(0.2, 0.8));
    if (freeAt(rx, ry, 0.7)) {
      addProp(rng.pick(['reed_bundle', 'dry_reeds', 'spiny_aloe', 'saltbush']), rx, ry, { solid: false });
    }
  }

  // ------------------------------------------------------------------ 8. Ancient Desert Ruins & Landmarks
  // Ruin Courtyard around the Dungeon Portal
  addProp('toppled_column', portal.x - 2.8, portal.y - 1.5, { solid: true });
  addProp('toppled_column', portal.x + 2.8, portal.y - 1.5, { solid: true });
  addProp('obelisk_fragment', portal.x - 2.5, portal.y + 2.0, { solid: true });
  addProp('buried_statue_head', portal.x + 2.6, portal.y + 2.0, { solid: true });
  addProp('bronze_brazier', portal.x - 2.0, portal.y, { solid: true, light: 5.0 });
  addProp('bronze_brazier', portal.x + 2.0, portal.y, { solid: true, light: 5.0 });

  // Waypoint Portal yard to Herrington Hollow
  addProp('carved_standing_stone', act1Portal.x - 2.2, act1Portal.y - 1.0, { solid: true });
  addProp('sand_swept_milestone', act1Portal.x + 2.2, act1Portal.y - 1.0, { solid: true });
  addProp('date_palm', act1Portal.x - 2.6, act1Portal.y + 1.8, { tree: true });
  addProp('doum_palm', act1Portal.x + 2.6, act1Portal.y + 1.8, { tree: true });

  // Eternal Breach yard
  addProp('salt_spires', breach.x - 2.2, breach.y - 1.2, { solid: true });
  addProp('basalt_shards', breach.x + 2.2, breach.y - 1.2, { solid: true });
  addProp('giant_skull', breach.x - 2.0, breach.y + 1.8, { solid: true });
  addProp('fossil_ribcage', breach.x + 2.0, breach.y + 1.8, { solid: true });

  // Altar of Heresy: dark obelisk at the western edge of the bazaar plaza
  const altar = { x: C.x - 8.5, y: wellPos.y - 5.5 };
  if (inb(Math.floor(altar.x), Math.floor(altar.y))) {
    keep[I(Math.floor(altar.x), Math.floor(altar.y))] = 1;
    map.block[I(Math.floor(altar.x), Math.floor(altar.y))] = 0;
    mat[I(Math.floor(altar.x), Math.floor(altar.y))] = 32;
    addProp('carved_standing_stone', altar.x - 1.5, altar.y - 0.5, { solid: true });
    addProp('bronze_brazier', altar.x + 1.5, altar.y - 0.5, { solid: true, light: 5.0 });
  }

  // Abyssal Rift Gate (for endgame): on the breach approach road
  const rift = { x: breach.x + 4.5, y: breach.y + 0.5 };
  keep[I(Math.floor(rift.x), Math.floor(rift.y))] = 1;
  map.block[I(Math.floor(rift.x), Math.floor(rift.y))] = 0;

  // Braziers along the bazaar plaza and roads
  for (const road of roads) {
    for (let s = 5; s < road.length - 4; s += rng.int(8, 12)) {
      const [rx, ry] = road[s];
      const bx = rx + (rng.chance(0.5) ? -1.8 : 1.8);
      const by = ry + (rng.chance(0.5) ? -1.8 : 1.8);
      if (freeAt(bx, by, 1.4)) {
        addProp('bronze_brazier', bx, by, { solid: true, light: 4.6 });
      }
    }
  }

  // Scatter across open dunes: acacias, desert boulders, cairns, pottery
  for (let n = 0, tries = 0; n < 45 && tries < 300; tries++) {
    const x = R(5, W - 5), y = R(5, H - 5);
    if (!freeAt(x, y, 1.4)) continue;
    const nm = rng.pick([
      'wind_carved_boulder', 'basalt_shards', 'desert_cairn', 'sand_swept_milestone',
      'broken_cart_wheel', 'broken_pottery', 'salt_spires', 'spiny_aloe',
      'umbrella_acacia', 'young_thorn_acacia', 'wind_bent_acacia', 'dead_thorn_snag'
    ]);
    if (addProp(nm, x, y, { solid: /boulder|cairn|acacia|snag/.test(nm) })) n++;
  }

  // ------------------------------------------------------------------ 9. Spawn Position & Reachability Validation
  let start = [wellPos.x, wellPos.y - 2.8];
  if (!map.walkable(...start)) {
    start = map.randomNear(wellPos.x, wellPos.y - 2.5, 2.0, () => rng.next()) || [C.x, C.y - rwY - 2.5];
  }

  // Flood fill from spawn to verify all critical interactables are reached
  const seen = new Uint8Array(N);
  const q = [I(Math.floor(start[0]), Math.floor(start[1]))];
  seen[q[0]] = 1;

  for (let h = 0; h < q.length; h++) {
    const idx = q[h], x = idx % W, y = (idx / W) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, j = I(nx, ny);
      if (inb(nx, ny) && map.walkableTile(nx, ny) && !seen[j]) {
        seen[j] = 1;
        q.push(j);
      }
    }
  }

  const reach = (x, y) => {
    const tx = Math.floor(x), ty = Math.floor(y);
    if (!inb(tx, ty)) return false;
    if (seen[I(tx, ty)]) return true;
    // Check cardinal neighbors within reach distance
    return [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => inb(tx + dx, ty + dy) && seen[I(tx + dx, ty + dy)]);
  };

  const portalOk = reach(portal.x, portal.y);
  const act1Ok = reach(act1Portal.x, act1Portal.y);
  const breachOk = reach(breach.x, breach.y);
  const npcsOk = npcs.every((n) => reach(n.x, n.y));

  if (!isLastTry && (!portalOk || !act1Ok || !breachOk || !npcsOk)) {
    return null; // Retry with next seed
  }

  // Assign floor variants
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      map.v[I(x, y)] = mat[I(x, y)];
    }
  }

  return {
    map,
    buildings: [],
    npcs,
    props,
    torches: [],
    wallHangings: [],
    portal,
    act1Portal,
    breach,
    rift,
    altar,
    center: { x: C.x + 0.5, y: C.y + 0.5 },
    start,
    seed,
  };
}
