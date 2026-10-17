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
const FLOOR = Object.freeze({w:80,h:40,cols:8,rows:5});
const PROP = Object.freeze({w:80,h:80,cols:8,rows:5});
const MONSTER = Object.freeze({w:120,h:150,cols:4,rows:3});
const VARIANT = Object.freeze({w:80,h:80,cols:5,rows:3});
const WORLD_SCATTER = Object.freeze({w:80,h:80,cols:5,rows:4});
const WILD_SUPPLEMENTAL = Object.freeze({w:128,h:128,cols:4,rows:4});
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

/** Keep the original complete diamond beneath painted accents, and clip
 * sheet backgrounds to the exact native 2:1 silhouette. Some art sources
 * have transparent corners or rectangular background pixels; neither should
 * cause an exposed black tile rectangle in gameplay.
 */
function drawApprovedFloor(g, sheet, cell, sx, sy, sw, sh) {
  const {x,y,w,h}=cell;
  g.save();
  g.beginPath();
  g.moveTo(x+w/2,y);
  g.lineTo(x+w,y+h/2);
  g.lineTo(x+w/2,y+h);
  g.lineTo(x,y+h/2);
  g.closePath();
  g.clip();
  g.drawImage(sheet,sx,sy,sw,sh,x,y,w,h);
  g.restore();
}

// The eight painted objects of each row: obelisk, brazier, sarcophagus, column, banner, urn, statue, altar.
// The brazier takes a lit prop name so dungeon.js gives it a light.
const PROP_TYPES = ['obelisk', 'brazier', 'sarcophagus', 'column', 'banner', 'urn', 'statue', 'altar'];
const BRAZIER = { desert_temple: 'gold_brazier', ice_temple: 'azure_brazier', hell: 'hellfire_brazier',
  astral_plane: 'voidflame_brazier', heavenly: 'radiant_brazier' };
const extraCache = new Map();

/** Load the approved floor/prop sheets a biome uses (only the five temple biomes have rows). */
export function preloadApprovedBiomeArt(biomeId) {
  return ROWS[biomeId] === undefined ? Promise.resolve(null) : Promise.all([loadSheet('floors'), loadSheet('props')]);
}

/** Copy one 80×80 painted prop at 2x into a 160×160 pack-sized cell, dropping slivers of neighbouring cells
 * (small alpha blobs apart from the object) and returning its ground pivot. */
function propCell(sheet, sx, sy) {
  const c = document.createElement('canvas');
  c.width = PROP.w; c.height = PROP.h;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(sheet, sx, sy, PROP.w, PROP.h, 0, 0, PROP.w, PROP.h);
  const img = g.getImageData(0, 0, PROP.w, PROP.h), d = img.data, W = PROP.w, H = PROP.h;
  // label the opaque blobs; keep the biggest (the object) and any big enough to be part of it
  const label = new Int32Array(W * H).fill(-1), sizes = [];
  for (let start = 0; start < W * H; start++) {
    if (label[start] >= 0 || d[start * 4 + 3] <= 24) continue;
    const id = sizes.length, stack = [start];
    let size = 0;
    label[start] = id;
    while (stack.length) {
      const q = stack.pop(), x = q % W, y = (q / W) | 0;
      size++;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy, nq = ny * W + nx;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H || label[nq] >= 0 || d[nq * 4 + 3] <= 24) continue;
        label[nq] = id; stack.push(nq);
      }
    }
    sizes.push(size);
  }
  const big = Math.max(0, ...sizes);
  let bottom = 0, sum = 0, n = 0;
  for (let q = 0; q < W * H; q++) {
    if (label[q] < 0 || sizes[label[q]] < big * 0.15) { d[q * 4 + 3] = 0; continue; }
    bottom = Math.max(bottom, (q / W) | 0);
  }
  for (let y = Math.max(0, bottom - 6); y <= bottom; y++) for (let x = 0; x < W; x++)
    if (d[(y * W + x) * 4 + 3] > 24) { sum += x; n++; }
  g.putImageData(img, 0, 0);
  const out = document.createElement('canvas');
  out.width = PROP.w * 2; out.height = PROP.h * 2;
  const o = out.getContext('2d');
  o.imageSmoothingEnabled = false;
  o.drawImage(c, 0, 0, out.width, out.height);
  return { img: out, cx: (n ? sum / n : W / 2) * 2, foot: bottom * 2 - 6 };
}

/**
 * The temple biomes' approved painted floors and props as extra tile-set entries, or null for other biomes.
 * Floors are composed over `baseFloor` (the biome's own recoloured paving) so a transparent corner never shows
 * through; props are pack-sized 160×160 cells drawn at the pack's scale.
 */
export function approvedBiomeArt(biomeId, baseFloor) {
  const row = ROWS[biomeId], floors = sheets.get('floors'), props = sheets.get('props');
  if (row === undefined || !floors || !props || !baseFloor) return null;
  const key = biomeId + '|' + baseFloor.sx + ',' + baseFloor.sy + '|' + (baseFloor.img.width || 0);
  if (extraCache.has(key)) return extraCache.get(key);
  const strip = document.createElement('canvas');
  strip.width = 160 * FLOOR.cols; strip.height = 80;
  const g = strip.getContext('2d', { willReadFrequently: true });
  g.imageSmoothingEnabled = false;
  const out = { floors: [], scatter: [] };
  for (let i = 0; i < FLOOR.cols; i++) {
    const cell = { x: i * 160, y: 0, w: 160, h: 80 };
    g.drawImage(baseFloor.img, baseFloor.sx, baseFloor.sy, baseFloor.w, baseFloor.h, cell.x, 0, 160, 80);
    drawApprovedFloor(g, floors, cell, i * FLOOR.w, row * FLOOR.h, FLOOR.w, FLOOR.h);
    const px = g.getImageData(cell.x + 40, 20, 80, 40).data;
    let l = 0, n = 0;
    for (let p = 0; p < px.length; p += 16) if (px[p + 3]) { l += (px[p] * 0.3 + px[p + 1] * 0.59 + px[p + 2] * 0.11) / 255; n++; }
    out.floors.push({ img: strip, sx: cell.x, sy: 0, w: 160, h: 80, lum: n ? l / n : 0.4, seamless: false,
      name: biomeId + '_painted_floor_' + (i + 1) });
  }
  for (let i = 0; i < PROP.cols; i++) {
    const type = PROP_TYPES[i], p = propCell(props, i * PROP.w, row * PROP.h);
    out.scatter.push({ img: p.img, sx: 0, sy: 0, w: p.img.width, h: p.img.height, ox: -Math.round(p.cx), oy: -p.foot,
      fp: type === 'sarcophagus' || type === 'altar' ? 0.7 : 0.5, block: true, painted: true,
      name: type === 'brazier' ? BRAZIER[biomeId] : biomeId + '_painted_' + type });
  }
  extraCache.set(key, out);
  return out;
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
