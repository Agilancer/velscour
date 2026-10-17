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
