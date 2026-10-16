// Fifty biome-tinted wall ornaments, each with four authored isometric wall
// views. The view contract intentionally matches walltorches.js.
import { isoX, isoY } from '../core/view.js';

const ROOT = 'assets/fx/wall_hangings/';
const CELL = 96, DISPLAY = 42, HANG = 78;
const atlases = new Map(), loading = new Map();
const HUE = Object.freeze({
  frozen: 190, ice_temple: 194, sunken: 160, storm: 200, crystal: 170,
  abyss: 210, necropolis: 220, void: 260, shadow: 250, astral_plane: 245,
  fungal: 80, plague: 78, thorn: 100, serpent: 130,
  blood: 350, flesh: 340, throne: 350, hell: 5, forge: 12, molten: 15,
  ashen: 25, desert: 32, desert_temple: 36, gilded: 42, amber: 30,
  heavenly: 46, cathedral: 34, library: 28, shattered: 210,
  obsidian: 260, catacombs: 28, overworld: 108, town: 34,
});

function fetchAtlas(sheet) {
  if (loading.has(sheet)) return loading.get(sheet);
  const promise = new Promise((resolve) => {
    if (typeof Image === 'undefined') { resolve(null); return; }
    const img = new Image();
    img.onload = () => {
      if (img.naturalWidth === CELL * 4 && img.naturalHeight === CELL * 10) {
        atlases.set(sheet, img); resolve(img);
      } else { console.warn('Wall-hanging atlas has incorrect dimensions', sheet); resolve(null); }
    };
    img.onerror = () => { console.warn('Wall-hanging artwork unavailable', sheet); resolve(null); };
    img.src = `${ROOT}hangings_${sheet + 1}.webp`;
  });
  loading.set(sheet, promise);
  return promise;
}

/** Preload the catalog once before placing its wall-mounted views. */
export function preloadWallHangings() {
  return Promise.all([0, 1, 2, 3, 4].map(fetchAtlas));
}

/** Match the established wall-torch contract: f/back, b/back, b/front, f/front. */
export function wallHangingAngle(dir, front = false) {
  return dir === 'f' ? (front ? 3 : 0) : (front ? 2 : 1);
}

export function wallHangingAtWallSegment(segment, design) {
  return {
    mountX: segment.mx, mountY: segment.my, dir: segment.dir,
    front: !!segment.front,
    depth: segment.depth + (segment.front ? 0.57 : -0.34),
    design,
  };
}

/** Place one authored view on the outward facade of a 3×3 town-pack building. */
export function wallHangingAtBuilding(building, sx, design) {
  const mountX = sx ? building.x0 + 3 : building.x0 + 1.5;
  const mountY = sx ? building.y0 + 1.5 : building.y0 + 3;
  return { mountX, mountY, dir: sx ? 'f' : 'b', front: true,
    depth: mountX + mountY + 0.05, design };
}

export function wallHangingRect(item) {
  const frame = wallHangingAngle(item.dir, item.front);
  const x = isoX(item.mountX, item.mountY), y = isoY(item.mountX, item.mountY);
  const plateLeft = frame === 0 || frame === 2;
  return [x - (plateLeft ? 0.22 : 0.78) * DISPLAY,
    y - HANG, DISPLAY, DISPLAY];
}

export function drawWallHanging(ctx, item, biome, alpha = 1) {
  if (!item || !Number.isInteger(item.design) || item.design < 0 || item.design >= 50) return;
  const atlasIndex = Math.floor(item.design / 10), row = item.design % 10;
  const img = atlases.get(atlasIndex);
  if (!img) return;
  const frame = wallHangingAngle(item.dir, item.front);
  const [x, y, w, h] = wallHangingRect(item);
  const hue = HUE[biome?.id] ?? 34;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.imageSmoothingEnabled = false;
  // Shift the shared hand-painted metal, stone, and cloth into the current
  // biome family while preserving the atlas alpha and four authored views.
  ctx.filter = `hue-rotate(${hue - 34}deg) saturate(${hue === 34 ? 0.88 : 1.08})`;
  ctx.drawImage(img, frame * CELL, row * CELL, CELL, CELL, x, y, w, h);
  ctx.restore();
}
