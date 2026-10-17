// World-space visual scale contract for Castle's 2x-expanded overworld.
// Architectural modules must scale with their enlarged grid/anchors so wall
// joints, stairs, towers and bridges still connect. Loose props and enormous
// painted furniture must instead remain proportional to the 60px-tall hero.
export const CASTLE_FURNITURE_HEIGHT = Object.freeze({
  furniture_01_throne_dais: 92,          // a raised, taller-than-hero seat
  furniture_02_cathedral_pew: 34,       // waist-high rows, never giant benches
  furniture_03_cathedral_pulpit: 78,    // slightly taller than the hero
  furniture_04_hanging_chandelier: 55,  // overhead fixture, not a tower
  furniture_05_floor_candelabrum: 48,   // about shoulder height
});

export function scaledCastlePropK(prop, factor = 2, nativeTileWorldWidth = 64) {
  const {spr, k} = prop;
  if (!spr || !Number.isFinite(k)) return k;
  const category = spr.category;
  const height = Math.max(1, spr.h);
  const raw = k * factor;
  const targetHeight = CASTLE_FURNITURE_HEIGHT[spr.name];
  if (category === 'furniture' && targetHeight) return targetHeight / height;
  // Props are decorations, not two-tile-wide structural masonry. Enlarging
  // 460 loose objects 2x makes crates, bowls and barrels hero-sized.
  if (category === 'scatter') return k;
  // Moat banks are a single native 160x80 floor diamond each. Expanding
  // them introduces overlaps into adjacent water tiles.
  if (category === 'moat_edges') return nativeTileWorldWidth / 160;
  // Architectural connectors remain scaled 2x to match the enlarged map;
  // cap extreme silhouettes whose source pixels are disproportionately tall.
  const caps = {
    trees: 170, castle_landmarks: 238, castle_stairs: 150,
    castle_bridges: 135, torches: 48, wall_hangings: 76,
    doors: 125, gateways: 225,
  };
  return Math.min(raw, (caps[category] ?? Infinity) / height);
}

/** Allocate wall families in long contiguous runs, not a different material
 * for every little direction change. Keeps all ten approved textures in use.
 */
export function castleWallFamilyAt(distanceAlongWall, totalWallLength, families = 10) {
  if (!(totalWallLength > 0)) return 0;
  return Math.max(0, Math.min(families - 1,
    Math.floor(distanceAlongWall * families / totalWallLength)));
}
