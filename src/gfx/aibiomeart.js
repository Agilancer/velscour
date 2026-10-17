import { biomeArtProfile, materialForWall } from './biomecuration.js';
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

// Conservative atlas QA: user-generated imagery is kept intact only when
// alpha edges are clean. Reject chroma-key red/blue backgrounds and broad
// rectangular bleed instead of painting a colored box into an iso diamond.
export function cleanAuthoredCell(pixels,width,height,diamond=false) {
  const p=pixels.data||pixels;
  let colored=0,edge=0,edgeCount=0,solid=0,all=0;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const i=(y*width+x)*4,a=p[i+3];
    if(a<32)continue;
    all++;
    const r=p[i],g=p[i+1],b=p[i+2];
    if((r>170&&g<80&&b<95)||(b>150&&r<75&&g<95))colored++;
    // The atlas floor should never bring its own rectangle corners; it
    // will be drawn on existing authored Catacombs-standard backing.
    const outside=diamond?(Math.abs(x-(width-1)/2)/(width/2)+
      Math.abs(y-(height-1)/2)/(height/2)>.93):
      x<3||y<3||x>=width-3||y>=height-3;
    if(outside)edge++;
  }
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const outside=diamond?(Math.abs(x-(width-1)/2)/(width/2)+
      Math.abs(y-(height-1)/2)/(height/2)>.93):
      x<3||y<3||x>=width-3||y>=height-3;
    if(outside)edgeCount++;
  }
  if(all<20)return false;
  if(colored/all>.08)return false;
  return edge/Math.max(1,edgeCount)<(diamond?.15:.3);
}
function selectCleanCells(image,firstRow,count,width,height,diamond,allowed=null){
  const c=document.createElement('canvas');c.width=width;c.height=height;
  const g=c.getContext('2d',{willReadFrequently:true});
  const result=new Set();
  for(let i=0;i<count;i++){
    if(allowed&&!allowed.includes(i))continue;
    g.clearRect(0,0,width,height);
    const x=(i%8)*64,y=(firstRow+Math.floor(i/8))*64+(diamond?16:0);
    g.drawImage(image,x,y,width,height,0,0,width,height);
    const rgba=g.getImageData(0,0,width,height);
    if(cleanAuthoredCell(rgba,width,height,diamond))result.add(i);
  }
  return result;
}

/** Paint decorative AI motifs on top of existing floor art, never in place of it.
 * Imported AI cells may contain opaque rectangular backgrounds and do not
 * always reach the edges of a complete 2:1 diamond. Keeping the native tile
 * underneath avoids black holes; clipping the motif inside the diamond keeps
 * those backgrounds away from neighboring tiles and prevents visible seams.
 *
 * The ten generated seamless bases remain untouched. On expanded packs, only
 * the appended cells are decorated: the original pack was already processed.
 */
export function paintAIBiomeFloors(pack, image, allowedSources = null) {
  const floors = pack.floors?.getContext?.('2d');
  if (!floors || !pack.meta?.floors) return;
  const start = pack.meta.expansion?.floorStart ?? 0;
  floors.save();
  floors.imageSmoothingEnabled = false;
  floors.globalCompositeOperation = 'source-over';
  for (let index = start; index < pack.meta.floors.length; index++) {
    const cell = pack.meta.floors[index];
    if (cell.seamless) continue;
    const source = index % 32;
    if(allowedSources && !allowedSources.has(source))continue;
    const { x, y, w, h } = cell;
    // Reserve the outer band for the original, edge-matched floor material.
    // Even a fully opaque, rectangular source cell cannot paint outside this
    // inset rhombus or expose the black screen background between tiles.
    floors.save();
    floors.beginPath();
    floors.moveTo(x + w * .5, y + h * .12);
    floors.lineTo(x + w * .88, y + h * .5);
    floors.lineTo(x + w * .5, y + h * .88);
    floors.lineTo(x + w * .12, y + h * .5);
    floors.closePath();
    floors.clip();
    floors.drawImage(image, (source % 8) * 64, Math.floor(source / 8) * 64 + 16,
      64, 32, x, y, w, h);
    floors.restore();
  }
  floors.restore();
}

/** Overlay the authored floor motifs and replace the biome's prop and wall art. */
export async function applyAIBiomeArt(pack, biomeId) {
  if (!BIOMES.has(biomeId) || !pack?.meta) return pack;
  const [image, wallMaterials] = await Promise.all([
    loadAtlas(biomeId), loadAtlas(`${biomeId}_wall_materials`),
  ]);
  const profile=biomeArtProfile(biomeId);
  const approved=['desert_temple','ice_temple','hell','astral_plane','heavenly'].includes(biomeId);
  // Approved paintings are the priority in these five packs. Do not import
  // lower-quality floor or scatter cells from their chroma-keyed source grid.
  const cleanFloors=approved?new Set():
    selectCleanCells(image,0,32,64,32,true,profile?.accentSources);
  paintAIBiomeFloors(pack,image,cleanFloors);
  const start=pack.meta.expansion?.floorStart??0;
  const curated=[];
  for(let i=Math.max(10,start+10);i<pack.meta.floors.length;i++)
    if(cleanFloors.has(i%32)&&!pack.meta.floors[i].seamless)curated.push(i);
  pack.meta.curatedFloorIndices=curated;
  const scatter=pack.scatter?.getContext?.('2d');
  const propStart=pack.meta.expansion?.scatterStart??pack.meta.scatter.length;
  const cleanProps=approved?new Set():selectCleanCells(image,4,32,64,64,false);
  if(scatter){
    scatter.save();
    scatter.imageSmoothingEnabled=false;
    // Keep native source artwork and original pivots; only replace appended
    // fallback copies with quality-checked approved generated art.
    for(let index=propStart;index<pack.meta.scatter.length;index++){
      const cell=pack.meta.scatter[index],source=(index-propStart)%32;
      if(!cleanProps.has(source))continue;
      scatter.save();
      scatter.clearRect(cell.x,cell.y,cell.w,cell.h);
      scatter.drawImage(image,(source%8)*64,(4+Math.floor(source/8))*64,
        64,64,cell.x,cell.y,cell.w,cell.h);
      scatter.restore();
    }
    scatter.restore();
  }
  const walls = pack.walls?.getContext?.('2d');
  if (walls) {
    // Each biome has ten seamless materials: two per Catacombs wall family.
    // The SAME coherent material is used for every mask in a connected wall
    // family, never alternating lava/ice/sand because an end or corner differs.
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
    walls.globalAlpha = .63;
    Object.entries(pack.meta.walls || {}).forEach(([family, masks], familyIndex) => {
      Object.entries(masks).forEach(([mask, variants]) => {
        const texture = materialForWall(biomeId,familyIndex);
        variants.forEach(variant => variant.forEach(rect => paint(rect, texture)));
      });
    });
    let designIndex = 0;
    Object.values(pack.meta.arches || {}).forEach(directions => {
      Object.values(directions).forEach(slices => slices.forEach(rect => paint(rect,materialForWall(biomeId,designIndex++))));
    });
    Object.values(pack.meta.doors || {}).forEach(directions => {
      Object.values(directions).forEach(states => Object.values(states).forEach(slices =>
        slices.forEach(rect => paint(rect,materialForWall(biomeId,designIndex++)))));
    });
    walls.restore();
  }
  pack.meta.aiBiomeArt = {
    atlas: biomeId, sourceCell: 64, floorMotifs: 32, props: 32,
    wallMaterials: 10, curatedWallMaterials: profile?.wallMaterials||[],
    cleanFloorSources:[...cleanFloors],cleanPropSources:[...cleanProps],
    wallMaterialSize: 128,
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
