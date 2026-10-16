// Each sheet is 8x8: 32 isometric floor motifs followed by 32 terrain props.
const BIOMES = new Set([
  'desert_temple','ice_temple','hell','astral_plane','heavenly',
  'frozen','molten','fungal','sunken','blood','ashen','void','gilded','plague',
  'crystal','desert','shadow','forge','abyss','thorn','storm','obsidian','flesh',
  'serpent','shattered','library','necropolis','amber',
]);
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
  const [image, wallMaterials] = await Promise.all([
    loadAtlas(biomeId), loadAtlas(`${biomeId}_wall_materials`),
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
    // Each biome has ten seamless materials: two per Catacombs wall family.
    // Alternate them by topology mask so long runs gain surface variation,
    // while each node's arms and depth slices keep one matching material.
    const materials = Array.from({length: 10}, (_, index) => {
      const tile = document.createElement('canvas');
      tile.width = tile.height = 128;
      const g = tile.getContext('2d');
      g.imageSmoothingEnabled = false;
      g.drawImage(wallMaterials, index * 128, 0, 128, 128, 0, 0, 128, 128);
      return tile;
    });
    const paint = (rect, index) => {
      if (!Array.isArray(rect) || rect.length < 5) return;
      const [x, y, w, h, ox = 0, oy = 0] = rect.slice(1, 7);
      if (![x, y, w, h].every(Number.isFinite) || w <= 0 || h <= 0) return;
      const pattern = walls.createPattern(materials[index % materials.length], 'repeat');
      if (pattern?.setTransform && typeof DOMMatrix !== 'undefined')
        pattern.setTransform(new DOMMatrix().translate(x + ox, y + oy));
      walls.fillStyle = pattern;
      walls.fillRect(x, y, w, h);
    };
    walls.save();
    walls.globalCompositeOperation = 'source-atop';
    walls.globalAlpha = 1;
    Object.entries(pack.meta.walls || {}).forEach(([family, masks], familyIndex) => {
      Object.entries(masks).forEach(([mask, variants]) => {
        const texture = familyIndex * 2 + (Number(mask) & 1);
        variants.forEach(variant => variant.forEach(rect => paint(rect, texture)));
      });
    });
    let designIndex = 0;
    Object.values(pack.meta.arches || {}).forEach(directions => {
      Object.values(directions).forEach(slices => slices.forEach(rect => paint(rect, designIndex++)));
    });
    Object.values(pack.meta.doors || {}).forEach(directions => {
      Object.values(directions).forEach(states => Object.values(states).forEach(slices =>
        slices.forEach(rect => paint(rect, designIndex++))));
    });
    walls.restore();
  }
  pack.meta.aiBiomeArt = {
    atlas: biomeId, sourceCell: 64, floorMotifs: 32, props: 32,
    wallMaterials: 10, wallMaterialSize: 128,
  };
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
