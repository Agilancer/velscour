// Approved and generated low-resolution biome / overworld sprite atlases.
// Small atlases stay shared/lazily decoded; original wall geometry, tile
// metadata, native indices and collision rules remain authoritative.
const ART_DIR = 'assets/tiles/approved_biomes/';
const ROWS = Object.freeze({
  desert_temple: 0,
  ice_temple: 1,
  hell: 2,
  astral_plane: 3,
  heavenly: 4,
});
// Match the painted object type to the name/collision already used by each
// native pack: obelisk, brazier, sarcophagus, column, banner, urn, statue,
// altar. This avoids, for example, making Hell's nonblocking lava pools
// look like solid statues or mixing up NPC-facing decoration names.
const NATIVE_PROP_INDICES = Object.freeze({
  desert_temple: [0,10,5,7,26,4,1,2],
  ice_temple: [0,18,10,8,36,15,5,12],
  hell: [0,2,28,13,25,31,10,19],
  astral_plane: [0,2,21,12,36,9,24,17],
  heavenly: [8,5,12,0,33,31,3,28],
});
const FLOOR = Object.freeze({w:80,h:40,cols:8,rows:5});
const PROP = Object.freeze({w:80,h:80,cols:8,rows:5});
const MONSTER = Object.freeze({w:120,h:150,cols:4,rows:3});
const VARIANT = Object.freeze({w:80,h:80,cols:5,rows:3});
const WORLD_SCATTER = Object.freeze({w:80,h:80,cols:5,rows:4});
const WILD_SUPPLEMENTAL = Object.freeze({w:128,h:128,cols:4,rows:4});
const VARIANT_ART = Object.freeze({
  desert_temple:{column:0,nativeProp:32,expandedProp:20},
  ice_temple:{column:1,nativeProp:33,expandedProp:25},
  hell:{column:2,nativeProp:3,expandedProp:21},
  astral_plane:{column:3,nativeProp:28,expandedProp:30},
  heavenly:{column:4,nativeProp:32,expandedProp:25},
});
const FAMILIES = Object.freeze([
  'seraph','cherub','ophanim','warden',
  'herald','templar','beast','griffin',
  'luminary','judgement','oracle','throne',
]);
const urls = {floors:'floors.webp',props:'props.webp',monsters:'heavenly_monsters.webp',
  variants:'velscour_variants.webp',worldScatter:'velscour_overworld_scatter.webp',
  wildSupplemental:'forsaken_wilds_supplemental.webp'};
const sheetPromises = new Map(), sheets = new Map();
const monsterFrames = new Map();

function loadSheet(kind) {
  if (sheetPromises.has(kind)) return sheetPromises.get(kind);
  const promise = new Promise(resolve => {
    if (typeof Image === 'undefined') return resolve(null);
    const img = new Image();
    img.onload = () => {
      const size = kind==='floors'?FLOOR:kind==='props'?PROP:
        kind==='variants'?VARIANT:kind==='worldScatter'?WORLD_SCATTER:
        kind==='wildSupplemental'?WILD_SUPPLEMENTAL:MONSTER;
      if (img.naturalWidth !== size.w*size.cols ||
          img.naturalHeight !== size.h*size.rows) {
        console.warn('VELSCOUR approved art has wrong atlas dimensions:',kind);
        return resolve(null);
      }
      sheets.set(kind,img);
      resolve(img);
    };
    img.onerror = () => {
      console.warn('VELSCOUR approved artwork unavailable:',ART_DIR+urls[kind]);
      resolve(null); // Original generated graphics continue to work offline.
    };
    img.src = ART_DIR+urls[kind];
  });
  sheetPromises.set(kind,promise);
  return promise;
}

/** Overwrite only eight approved floor and eight prop cells in the active
 * biome's existing atlas. For expanded packs, replace appended cells rather
 * than legacy ones. Do not alter counts, sprite pivots, terrain collision,
 * wall slices, source palettes, tile IDs or established selection ranges.
 */
export async function applyApprovedBiomeArt(pack, biomeId) {
  const row = ROWS[biomeId];
  if (row === undefined || !pack?.meta) return pack;
  const [floors,props,variants] = await Promise.all([
    loadSheet('floors'),loadSheet('props'),loadSheet('variants'),
  ]);
  const meta=pack.meta, expanded=meta.expansion;
  const floorStart=(expanded ? expanded.floorStart : 0)+10; // after seamless bases
  const propStart=expanded ? expanded.scatterStart : 0;
  const propIndices=expanded ? Array.from({length:8},(_,i)=>propStart+i) :
    NATIVE_PROP_INDICES[biomeId];
  let floorCount=0,propCount=0;
  if (floors && pack.floors?.getContext) {
    const g=pack.floors.getContext('2d');
    if(g){
      g.save();g.imageSmoothingEnabled=false;
      for(let i=0;i<8;i++){
        const cell=meta.floors[floorStart+i];
        if(!cell)continue;
        g.clearRect(cell.x,cell.y,cell.w,cell.h);
        g.drawImage(floors,i*FLOOR.w,row*FLOOR.h,FLOOR.w,FLOOR.h,
          cell.x,cell.y,cell.w,cell.h);
        cell.seamless=false;
        floorCount++;
      }
      g.restore();
    }
  }
  if (props && pack.scatter?.getContext) {
    const g=pack.scatter.getContext('2d');
    if(g){
      g.save();g.imageSmoothingEnabled=false;
      for(let i=0;i<8;i++){
        const cell=meta.scatter[propIndices[i]];
        if(!cell)continue;
        g.clearRect(cell.x,cell.y,cell.w,cell.h);
        g.drawImage(props,i*PROP.w,row*PROP.h,PROP.w,PROP.h,
          cell.x,cell.y,cell.w,cell.h);
        propCount++;
      }
      g.restore();
    }
  }
  // Add one generated native-size art variant to spare decorative cells.
  // The seamless bases and the existing approved paintings remain untouched.
  const variant=VARIANT_ART[biomeId];
  if(variants&&variant){
    const floorIndex=(expanded?expanded.floorStart:0)+18;
    const propIndex=expanded?expanded.scatterStart+variant.expandedProp:variant.nativeProp;
    const floorCell=meta.floors[floorIndex],propCell=meta.scatter[propIndex];
    if(floorCell&&pack.floors?.getContext){
      const g=pack.floors.getContext('2d');
      if(g){
        g.save();g.imageSmoothingEnabled=false;
        g.clearRect(floorCell.x,floorCell.y,floorCell.w,floorCell.h);
        // The centered 80×40 crop retains the native 2:1 isometric diamond.
        g.drawImage(variants,variant.column*VARIANT.w,20,VARIANT.w,40,
          floorCell.x,floorCell.y,floorCell.w,floorCell.h);
        g.restore();
        floorCell.seamless=false;
      }
    }
    if(propCell&&pack.scatter?.getContext){
      const g=pack.scatter.getContext('2d');
      if(g){
        g.save();g.imageSmoothingEnabled=false;
        g.clearRect(propCell.x,propCell.y,propCell.w,propCell.h);
        g.drawImage(variants,variant.column*VARIANT.w,VARIANT.h,
          VARIANT.w,VARIANT.h,propCell.x,propCell.y,propCell.w,propCell.h);
        g.restore();
      }
    }
    meta.approvedVariantArt={floorIndex,propIndex,column:variant.column};
  }
  meta.approvedArt={row,floorStart,propStart,propIndices:[...propIndices],
    floorCount,propCount};
  return pack;
}

// Compact 80×80 tree sprites for the Forsaken Wilds, indexed by catalog name.
const WILD_TREE_COLUMNS=Object.freeze({
  t_gnarled_ash:0,t_old_cedar:1,t_wind_pine:2,t_dead_oak_painted:3,t_silver_birch:4,
});
const WILD_TREE_INDICES=Object.freeze({
  t_ember_maple:0,t_silver_elm:1,t_moon_birch:2,t_gnarled_yew:3,
  t_dusk_cedar:4,t_frost_fir:5,t_gold_aspens:6,t_copper_beech:7,
  t_blight_oak:8,t_wild_apple:9,
});
export function approvedOverworldTree(name){
  const index=WILD_TREE_INDICES[name];
  if(index!==undefined){
    const image=sheets.get('wildSupplemental');
    if(!image)return null;
    return{img:image,sx:index%WILD_SUPPLEMENTAL.cols*WILD_SUPPLEMENTAL.w,
      sy:Math.floor(index/WILD_SUPPLEMENTAL.cols)*WILD_SUPPLEMENTAL.h,
      w:WILD_SUPPLEMENTAL.w,h:WILD_SUPPLEMENTAL.h,ox:-64,oy:-123,name,fp:.4,
      block:true,isometric:true,pixelScale:1.25};
  }
  const image=sheets.get('variants'),column=WILD_TREE_COLUMNS[name];
  if(!image||column===undefined)return null;
  return{img:image,sx:column*VARIANT.w,sy:VARIANT.h*2,w:VARIANT.w,h:VARIANT.h,
    ox:-40,oy:-76,name,fp:.4,block:true,isometric:true,pixelScale:2};
}

const WILD_OBJECT_INDICES=Object.freeze({
  ow_shrine_azure:10,ow_shrine_ember:11,ow_shrine_verdant:12,
  ow_shrine_violet:13,ow_shrine_gold:14,ow_caravan:15,
});
export function approvedOverworldSupplemental(name){
  const index=WILD_OBJECT_INDICES[name],image=sheets.get('wildSupplemental');
  if(!image||index===undefined)return null;
  return{img:image,sx:index%WILD_SUPPLEMENTAL.cols*WILD_SUPPLEMENTAL.w,
    sy:Math.floor(index/WILD_SUPPLEMENTAL.cols)*WILD_SUPPLEMENTAL.h,
    w:WILD_SUPPLEMENTAL.w,h:WILD_SUPPLEMENTAL.h,ox:-64,oy:-123,name,
    fp:name==='ow_caravan'?.95:.45,block:name==='ow_caravan',isometric:true,
    pixelScale:name==='ow_caravan'?1.33:1};
}

export function preloadBiomeVariantArt(){return loadSheet('variants');}

const WORLD_SCATTER_NAMES=Object.freeze([
  'ow_ancient_stone','ow_broken_column','ow_shattered_urn','ow_pale_mushrooms',
  'ow_blue_flowers','ow_red_flowers','ow_fallen_banner','ow_rotten_crate',
  'ow_tattered_tent','ow_ritual_candles','ow_forest_totem','ow_spectral_brazier',
  'ow_bone_pile','ow_stone_idol','ow_discarded_shield','ow_mossy_log',
  'ow_standing_stone','ow_fae_lantern','ow_cart_wreck','ow_sunken_chest',
]);
export function approvedOverworldScatter(name){
  const image=sheets.get('worldScatter'),index=WORLD_SCATTER_NAMES.indexOf(name);
  if(!image||index<0)return null;
  return{img:image,sx:index%WORLD_SCATTER.cols*WORLD_SCATTER.w,
    sy:Math.floor(index/WORLD_SCATTER.cols)*WORLD_SCATTER.h,
    w:WORLD_SCATTER.w,h:WORLD_SCATTER.h,ox:-40,oy:-76,name,fp:.28,block:false,
    isometric:true};
}
export function preloadOverworldScatterArt(){
  return Promise.all([loadSheet('worldScatter'),loadSheet('wildSupplemental')]);
}

export function preloadApprovedHeavenlySprites() {
  return loadSheet('monsters');
}

/** One painted design per original Heavenly family, assigned to variant #1
 * of its existing five monster IDs. The other four ranks keep their unique
 * generated looks and all sixty monster IDs/AI behaviours remain untouched.
 */
export function approvedHeavenlyMonsterCanvas(family) {
  const index=FAMILIES.indexOf(family),image=sheets.get('monsters');
  if (index<0 || !image) return null;
  if(monsterFrames.has(family)) return monsterFrames.get(family);
  const canvas=document.createElement('canvas');
  canvas.width=160;canvas.height=186;
  const g=canvas.getContext('2d');
  g.imageSmoothingEnabled=false;
  g.drawImage(image,(index%4)*MONSTER.w,Math.floor(index/4)*MONSTER.h,
    MONSTER.w,MONSTER.h,8,3,144,180);
  canvas._art={fx:80};
  monsterFrames.set(family,canvas);
  return canvas;
}
