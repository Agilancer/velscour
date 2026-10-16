// Each sheet is 8x8: 32 isometric floor motifs followed by 32 terrain props.
const BIOMES = new Set(['desert_temple','ice_temple','hell','astral_plane','heavenly']);
const CACHE = new Map();

function loadAtlas(id) {
  if (CACHE.has(id)) return CACHE.get(id);
  const promise = new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load AI biome atlas: ${id}`));
    image.src = `assets/tiles/ai_biomes/${id}.webp`;
  });
  CACHE.set(id, promise);
  return promise;
}

/** Replace the generated floor and scatter cells after the authored pack is built. */
export async function applyAIBiomeArt(pack, biomeId) {
  if (!BIOMES.has(biomeId) || !pack?.meta) return pack;
  const [image, architecture] = await Promise.all([
    loadAtlas(biomeId), loadAtlas(`${biomeId}_architecture`),
  ]);
  const floors = pack.floors?.getContext?.('2d');
  if (floors) {
    floors.save();
    floors.imageSmoothingEnabled = false;
    pack.meta.floors.forEach((cell, index) => {
      const source = index % 32;
      floors.clearRect(cell.x, cell.y, cell.w, cell.h);
      floors.drawImage(image, (source % 8) * 64, Math.floor(source / 8) * 64 + 16,
        64, 32, cell.x, cell.y, cell.w, cell.h);
    });
    floors.restore();
  }
  const scatter = pack.scatter?.getContext?.('2d');
  if (scatter) {
    scatter.save();
    scatter.imageSmoothingEnabled = false;
    pack.meta.scatter.forEach((cell, index) => {
      const source = index % 32;
      scatter.clearRect(cell.x, cell.y, cell.w, cell.h);
      scatter.drawImage(image, (source % 8) * 64, (4 + Math.floor(source / 8)) * 64,
        64, 64, cell.x, cell.y, cell.w, cell.h);
    });
    scatter.restore();
  }
  const walls = pack.walls?.getContext?.('2d');
  if (walls) {
    // Add the compact generated material atlas only inside the established
    // wall/arch/door silhouettes. Connection masks and depth slices stay exact.
    walls.save();
    walls.globalCompositeOperation = 'source-atop';
    walls.globalAlpha = 0.34;
    walls.fillStyle = walls.createPattern(architecture, 'repeat');
    walls.fillRect(0, 0, pack.walls.width, pack.walls.height);
    walls.restore();
  }
  pack.meta.aiBiomeArt = {atlas: biomeId, sourceCell: 64, floorMotifs: 32, props: 32};
  return pack;
}

let heavenlyPromise = null;
let heavenlyImage = null;
export function preloadAIGeneratedHeavenlySprites() {
  return heavenlyPromise || (heavenlyPromise = loadAtlas('heavenly_monsters').then(image => {
    heavenlyImage = image;
    return image;
  }));
}

export function aiHeavenlyMonsterCanvas(index) {
  if (!heavenlyImage || index < 0 || index >= 60) return null;
  const canvas = document.createElement('canvas');
  canvas.width = 160;
  canvas.height = 186;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(heavenlyImage, (index % 8) * 64, Math.floor(index / 8) * 64,
    64, 64, 0, 26, 160, 160);
  canvas._art = {fx: 80};
  return canvas;
}
