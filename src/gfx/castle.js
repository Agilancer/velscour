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
// Sprites that pack two structures in one image, cut apart by a polygon (source px) with their own ground pivot.
const CUTOUTS={
 // the arch bridge with its near-end footings (below deck level, where the road meets it) cut away; pivot: the
 // midpoint of the deck's near edge
 castle_landmark_17_bridge_approach:{deck:{poly:[[0,0],[306,0],[306,264],[140,264],[140,188.4],[0,122.9]],pivot:[66,154]}},
 castle_landmark_16_stone_causeway_bridge:{
  left:{poly:[[0,0],[360,0],[330,120],[180,200],[170,277],[0,277]],pivot:[128,176]},
  right:{poly:[[360,0],[480,0],[480,277],[170,277],[180,200],[330,120]],pivot:[330,228]},
 },
};
const cutCache=new Map();
/** One structure cut out of a shared sprite: a canvas (built on first draw, so Node generation stays canvas-free). */
export function castleCutout(id,category,part){
 const s=castleObject(id,category),c=CUTOUTS[id]?.[part];if(!s||!c)return null;
 const key=id+'|'+part,spr={...s,sx:0,sy:0,ox:-c.pivot[0],oy:-c.pivot[1],cutout:part};
 Object.defineProperty(spr,'img',{enumerable:true,get(){
  if(typeof document==='undefined')return null;   // map generation under Node
  if(!cutCache.has(key)){const cv=document.createElement('canvas');cv.width=s.w;cv.height=s.h;const g=cv.getContext('2d');
   g.beginPath();c.poly.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();g.clip();
   g.drawImage(s.img,s.sx,s.sy,s.w,s.h,0,0,s.w,s.h);cutCache.set(key,cv);}
  return cutCache.get(key);}});
 return spr;
}
// Procedural carpet runner floor tiles (160 x 80 diamonds): [field, trimmed on its -x edge, trimmed on its +x edge],
// for aisles running along y. The canvas is drawn on first use, so map generation stays canvas-free under Node.
let carpetCanvas=null;
function carpetArt(){
 if(carpetCanvas)return carpetCanvas;
 const c=document.createElement('canvas');c.width=480;c.height=80;const g=c.getContext('2d');
 const h=(x,y)=>{let n=Math.imul(x,374761393)+Math.imul(y,668265263)|0;n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967296;};
 for(let t=0;t<3;t++)for(let Y=0;Y<80;Y+=2)for(let X=0;X<160;X+=2){
  const u=((X+1-80)/80+(Y+1)/40)/2,v=((Y+1)/40-(X+1-80)/80)/2;if(u<-.02||v<-.02||u>1.02||v>1.02)continue;
  const e=t===1?u:t===2?1-u:9;   // distance to the trimmed edge
  let col=h(X,Y)<.25?'#5a1015':'#6b1418';
  if(Math.abs(((v*4)%1)-.5)<.06||Math.abs((((u+v)*2)%1)-.5)<.04)col='#7e1c22';   // a woven lattice
  if(Math.abs(u-.5)<.05&&Math.abs(((v*4)%1)-.5)<.12)col='#9a6a2c';
  if(e<.05)col='#3d0b0d';else if(e<.15)col=h(X,Y+3)<.3?'#8a6526':'#b58b3c';else if(e<.19)col='#3d0b0d';
  g.fillStyle=col;g.fillRect(t*160+X,Y,2,2);
 }
 return carpetCanvas=c;
}
export function castleCarpetTiles(){
 return [0,1,2].map(t=>{const f={sx:t*160,sy:0,w:160,h:80,lum:0.02,seamless:true,name:'castle_carpet_'+t,castle:true};
  Object.defineProperty(f,'img',{enumerable:true,get:()=>typeof document==='undefined'?null:carpetArt()});return f;});
}
// A procedural pixel-art ridge tent for the siege lines (the pack has none): ridge along x, the door in its +x gable.
// 140 x 120 px, pivot at the ground centre of its 2 x 3 tile footprint; drawn on first use.
const TENT_CLOTH=[['#8c7a5a','#6b5c42','#a8946c','#4a3f2c'],['#7a2a24','#5a1e1a','#9a3a30','#3a1210'],['#5a6a4a','#434f37','#72845e','#2c3424']];
const tentCache=new Map();
export function castleTent(variant=0){
 const v=variant%TENT_CLOTH.length,spr={sx:0,sy:0,w:140,h:120,ox:-70,oy:-86,name:'castle_tent_'+v,category:'tent',castle:true,isometric:true};
 Object.defineProperty(spr,'img',{enumerable:true,get(){
  if(typeof document==='undefined')return null;
  if(tentCache.has(v))return tentCache.get(v);
  const c=document.createElement('canvas');c.width=140;c.height=120;const g=c.getContext('2d'),[mid,dark,lit,deep]=TENT_CLOTH[v];
  // footprint corners (front-left, front-right, back-right, back-left) and the ridge ends above the gable midpoints
  const C=[12,82],E=[82,117],F=[132,92],G=[62,57],A=[37,28],B=[107,63];
  const poly=(pts,fill)=>{g.beginPath();pts.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();g.fillStyle=fill;g.fill();};
  g.fillStyle='rgba(0,0,0,0.35)';g.beginPath();g.ellipse(72,92,64,22,-0.46,0,Math.PI*2);g.fill();
  poly([A,B,E,C],mid);                 // the front slope
  g.save();g.beginPath();[A,B,E,C].forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();g.clip();
  for(let s=0;s<7;s++){const t=s/7;g.strokeStyle=s%2?dark:lit;g.lineWidth=3;   // seams running down the slope
   g.beginPath();g.moveTo(A[0]+(B[0]-A[0])*t,A[1]+(B[1]-A[1])*t);g.lineTo(C[0]+(E[0]-C[0])*t,C[1]+(E[1]-C[1])*t);g.stroke();}
  for(let y=0;y<120;y+=2)for(let x=0;x<140;x+=2){const n=Math.imul(x*31+y*17+v,2654435761)>>>0;if(n%9===0){g.fillStyle='rgba(0,0,0,0.18)';g.fillRect(x,y,2,2);}}
  g.restore();
  poly([B,E,F],lit);                   // the gable, lit
  poly([B,[B[0]-6,B[1]+40],[B[0]+12,B[1]+46]],deep);   // the open door flap
  g.strokeStyle=deep;g.lineWidth=2;g.beginPath();g.moveTo(...A);g.lineTo(...B);g.stroke();
  g.strokeStyle='#3a2a18';g.lineWidth=2;   // poles, guy ropes, pennant
  g.beginPath();g.moveTo(A[0],A[1]);g.lineTo(A[0],A[1]-10);g.moveTo(B[0],B[1]);g.lineTo(B[0],B[1]-10);g.stroke();
  g.strokeStyle='rgba(60,45,30,0.8)';g.lineWidth=1;g.beginPath();g.moveTo(B[0],B[1]-6);g.lineTo(138,104);g.moveTo(A[0],A[1]-6);g.lineTo(2,70);g.stroke();
  poly([[A[0],A[1]-10],[A[0]+12,A[1]-7],[A[0],A[1]-4]],v===1?'#d8c070':'#a02a20');
  tentCache.set(v,c);return c;}});
 return spr;
}
// A copy of a big painted sprite pre-scaled to `over` x the size it is drawn at (the furniture is painted at up to
// 1,256 px and drawn at ~40): drawing the full-size source every frame costs the throne hall half its frame time.
// Returns [sprite, k]; the canvas is built on first draw.
const scaledCache=new Map();
export function castleScaled(spr,k,over=2.5){
 const s=Math.min(1,k*over);if(s>=.9)return [spr,k];
 const w=Math.ceil(spr.w*s),h=Math.ceil(spr.h*s),key=spr.name+'|'+w+'x'+h,src={img:spr.img,sx:spr.sx,sy:spr.sy,w:spr.w,h:spr.h};
 const out={...spr,sx:0,sy:0,w,h,ox:spr.ox*s,oy:spr.oy*s,prescaled:s};
 Object.defineProperty(out,'img',{enumerable:true,get(){
  if(typeof document==='undefined')return null;
  let c=scaledCache.get(key);
  if(!c){c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';
   g.drawImage(src.img,src.sx,src.sy,src.w,src.h,0,0,w,h);scaledCache.set(key,c);}
  return c;}});
 return [out,k/s];
}
