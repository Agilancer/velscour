// Runtime access to the complete, pivot-preserving CASTLE biome atlas pack.
import { recolor, pageAtlas } from '../core/util.js';
const DIR='assets/tiles/castle/';
let loading=null,meta=null,images=null;
const recolored=new Map();
function loadImage(name){return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error(`Failed to load ${DIR}${name}.webp`));img.src=`${DIR}${name}.webp`;});}
export function loadCastlePack(){
 if(images)return Promise.resolve();
 if(loading)return loading;
 loading=fetch(`${DIR}pack.json`).then(r=>{if(!r.ok)throw new Error('CASTLE metadata missing');return r.json();})
  .then(async m=>{const categories=Object.keys(m.atlases);const atlases=await Promise.all(categories.map(loadImage));meta=m;images=Object.fromEntries(categories.map((k,i)=>[k,atlases[i]]));})
  .catch(e=>{loading=null;throw e;});
 return loading;
}
export function castleFrames(category){return meta?.atlases[category]||[];}
function imageFor(category,palette){
 const src=images?.[category];if(!src||!palette)return src;
 const key=category+'|'+JSON.stringify(palette);
 if(!recolored.has(key))recolored.set(key,recolor(src,palette));
 return recolored.get(key);
}
export function castleObject(id,category='scatter',palette=null){
 const f=castleFrames(category).find(v=>v.id===id||v.name===id);
 if(!f)return null;
 const [px,py]=f.pivot||[f.w/2,f.h];
 const tree=category==='trees';
 const spr={...pageAtlas(imageFor(category))(f.x,f.y),w:f.w,h:f.h,ox:-px,oy:-py,
  fp:tree ? 0.72 : (f.w > 260 ? 0.7 : 0.42),block:tree,name:f.id,isometric:true,castle:true,
  category,connectionMask:f.connection_mask??f.mask??null,orientation:f.orientation||null};
 // A recoloured copy is built on first draw (small atlases only, so page offsets don't change);
 // map generation stays canvas-free and can run under Node.
 if(palette)Object.defineProperty(spr,'img',{get:()=>imageFor(category,palette),enumerable:true});
 return spr;
}
// A vertical slice of a wide authored sprite (e.g. one tile's worth of the crenellated
// curtain wall), pivoted at (px,py) inside the slice, so long walls tile and depth-sort per cell.
export function castleStrip(id,category,sx,w,px,py){
 const s=castleObject(id,category);if(!s)return null;
 return {...s,sx:s.sx+sx,w,ox:-px,oy:-py,strip:true};
}
export function castleFloorTiles(palette=null){
 const img=imageFor('floors',palette);
 return castleFrames('floors').map(f=>({img,sx:f.x,sy:f.y,w:f.w,h:f.h,lum:0.02,seamless:true,name:f.id,castle:true}));
}
export function castleFloorIndex(fragment){return castleFrames('floors').findIndex(f=>f.id.includes(fragment)||f.name?.includes(fragment));}
export function castleKeepFloorTiles(){
 const img=imageFor('keep_floors');
 return castleFrames('keep_floors').map(f=>({img,sx:f.x,sy:f.y,w:f.w,h:f.h,lum:0.02,seamless:true,name:f.id,castle:true}));
}
export function castleKeepFloorIndex(fragment){return castleFrames('keep_floors').findIndex(f=>f.id.includes(fragment)||f.name?.includes(fragment));}
export function castleKeepWallFrames(){return castleFrames('keep_walls');}
export function castlePackMetadata(){return meta;}
