// Decorations for the outdoor scenario biome. Imported tree/scatter crops and
// generated shrine/caravan sprites share the town-pack ground-pivot contract.
import { A } from '../core/assets.js';
import { makeCanvas } from '../core/util.js';
import { approvedOverworldScatter, approvedOverworldTree } from './approvedbiomeart.js';

export const EXTRA_TREES = [
  't_ember_maple', 't_silver_elm', 't_moon_birch', 't_gnarled_yew', 't_dusk_cedar',
  't_frost_fir', 't_gold_aspens', 't_copper_beech', 't_blight_oak', 't_wild_apple',
  't_gnarled_ash','t_old_cedar','t_wind_pine','t_dead_oak_painted','t_silver_birch',
];
export const EXTRA_SCATTER = [
  'ow_ancient_stone','ow_broken_column','ow_shattered_urn','ow_pale_mushrooms',
  'ow_blue_flowers','ow_red_flowers','ow_fallen_banner','ow_rotten_crate',
  'ow_tattered_tent','ow_ritual_candles','ow_forest_totem','ow_spectral_brazier',
  'ow_bone_pile','ow_stone_idol','ow_discarded_shield','ow_mossy_log',
  'ow_standing_stone','ow_fae_lantern','ow_cart_wreck','ow_sunken_chest',
];
export const SHRINES = ['ow_shrine_azure','ow_shrine_ember','ow_shrine_verdant','ow_shrine_violet','ow_shrine_gold'];
const TREE_SOURCES = ['t_crooked_oak', 't_mature_ash', 't_twin_birch', 't_dead_oak',
  't_old_cedar', 't_medium_fir', 't_young_birch', 't_ancient_oak', 't_orchard_pear', 't_young_apple'];
const TREE_COLORS = ['#bd4c27','#ccdceb','#c1d5e9','#405a34','#32545e',
  '#9dbdc9','#a88434','#bc5d29','#513f52','#a35c37'];
const CACHED = new Map();
function pixel(ctx,x,y,w,h,c) {ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
function baseSprite(name) {
  const r = A.town && A.town.meta.objects[name];
  return r && { image: A.town.objects, sx:r[0],sy:r[1],w:r[2],h:r[3],ox:r[4],oy:r[5] };
}
function format(image, w, h, name, fp=0.3) {
  return {img:image,sx:0,sy:0,w,h,ox:-Math.floor(w/2),oy:-h+5,name,fp,block:fp>0.7};
}
function tree(name) {
  const approved=approvedOverworldTree(name);
  if(approved)return approved;
  const index=EXTRA_TREES.indexOf(name),sourceIndex=index%TREE_SOURCES.length;
  const src=baseSprite(TREE_SOURCES[sourceIndex]);
  if(!src)return null;
  const w=src.w,h=src.h,c=makeCanvas(w,h),x=c.getContext('2d');
  x.drawImage(src.image,src.sx,src.sy,w,h,0,0,w,h);
  // Material tint remains constrained to original silhouette and keeps artwork shadow/light.
  x.globalCompositeOperation='source-atop';
  x.globalAlpha=.12+index%3*.07;x.fillStyle=TREE_COLORS[sourceIndex];x.fillRect(0,0,w,h);
  x.globalCompositeOperation='source-over';x.globalAlpha=1;
  const seed=index*1171+31;
  for(let i=0;i<34+index*3;i++){
    const vx=((seed+i*73+i*i*17)%Math.max(2,w-12))+6;
    const vy=((seed+i*83+i*i*11)%Math.max(2,Math.floor(h*.62)))+6;
    // Overlay tiny leaves, berries and moonfire highlights only where foliage exists.
    const rgba=x.getImageData(Math.floor(vx),Math.floor(vy),1,1).data;
    if(rgba[3]<150)continue;
    const col=i%7===0?'#e5c982':i%3===0?TREE_COLORS[sourceIndex]:'#6f8b61';
    pixel(x,vx,vy,2+(i%2),2,col);
  }
  return {img:c,sx:0,sy:0,w,h,ox:src.ox,oy:src.oy,name,fp:.4,block:true};
}
function shrine(name) {
  const i=SHRINES.indexOf(name), colors=['#459bff','#ed543b','#59db96','#c479ff','#f5bd4f'], glow=colors[i];
  const w=112,h=140,c=makeCanvas(w,h),x=c.getContext('2d');
  // Isometric stone plinth, metal corner bindings and a bright multi-faceted crystal.
  pixel(x,20,119,74,10,'#161a22');pixel(x,13,108,86,12,'#343842');
  pixel(x,18,100,76,10,'#717167');pixel(x,25,88,62,13,'#48454f');
  pixel(x,37,52,38,43,'#383941');pixel(x,34,59,7,38,'#a7a18a');
  pixel(x,71,59,7,38,'#242631');pixel(x,46,34,20,55,'#252732');
  pixel(x,51,23,10,15,'#b5b2a3');pixel(x,45,42,22,42,glow);
  pixel(x,48,38,17,6,'#e4f1ff');pixel(x,51,46,7,28,'#f9ffff');
  pixel(x,59,47,6,27,'#26394a');pixel(x,46,78,21,7,'#2c252d');
  for(let j=0;j<5;j++){ const px=29+j*14;pixel(x,px,99,6,5,j%2?glow:'#bda67a'); }
  for(let j=0;j<10;j++){const px=12+(i*13+j*23)%89,py=25+(i*19+j*31)%58;pixel(x,px,py,2,2,glow);}
  return format(c,w,h,name,.45);
}
function caravan(name) {
  const src=baseSprite('handcart'),w=170,h=145,c=makeCanvas(w,h),x=c.getContext('2d');
  // Travelling wagon: built from the pack's handcart, with original timber,
  // leather tarpaulin, gold fittings and a pair of visible axle wheels.
  pixel(x,18,108,128,15,'#35261f');pixel(x,24,93,117,20,'#936644');
  pixel(x,25,84,115,12,'#ba9266');pixel(x,31,54,101,33,'#46392e');
  pixel(x,37,48,89,11,'#d2b081');pixel(x,42,41,80,8,'#82674c');
  pixel(x,29,86,7,28,'#d4b274');pixel(x,128,85,7,29,'#443024');
  pixel(x,25,113,24,24,'#221c1a');pixel(x,29,118,15,15,'#b99459');
  pixel(x,119,108,23,25,'#25201b');pixel(x,124,115,12,13,'#c7a06b');
  for(let j=0;j<6;j++){pixel(x,37+j*15,57,5,25,j%2?'#bda073':'#8a704e');}
  if(src)x.drawImage(src.image,src.sx,src.sy,src.w,src.h,34,80,100,56);
  return format(c,w,h,name,.95);
}
function scattered(name) {
  const approved=approvedOverworldScatter(name);
  if(approved)return approved;
  const i=EXTRA_SCATTER.indexOf(name),w=88,h=92,c=makeCanvas(w,h),x=c.getContext('2d');
  const stone=['#77796b','#373e40','#9c9382','#5b624c','#ccc5a2'];
  // Original game-palette pixel pieces made from combinations of carved masonry,
  // wreckage, runes, flowers, fungus, ancient wood and expedition supplies.
  const family=i%5;
  if(family===0){ // megalith, ruins, standing stones, urns
    pixel(x,20,54,51,19,'#32342f');pixel(x,24,34,41,28,stone[(i+1)%5]);
    pixel(x,29,29,30,9,'#9f9c8e');pixel(x,32,39,8,30,'#3d4744');
    pixel(x,50,43,4,13,'#d5bf78');pixel(x,16,70,58,9,'#242923');
  }else if(family===1){ // wreckage, crates, banners, shields
    pixel(x,19,44,54,29,'#4c3426');pixel(x,25,39,38,7,'#9f8260');
    pixel(x,29,51,30,4,'#b18e60');pixel(x,20,65,54,6,'#211e1b');
    pixel(x,46,34,4,34,'#d4bd82');
  }else if(family===2){ // blooms, fungus and candles
    pixel(x,18,72,58,6,'#343e24');
    for(let j=0;j<17;j++){const px=22+(j*17+i*7)%46,py=48+(j*23+i*13)%22;
      pixel(x,px,py,2,10,'#446b42');pixel(x,px-2,py-4,6,6,
        i%2?'#d5d1ba':j%3?'#bd6970':'#b597d7');}
  }else if(family===3){ // skulls, braziers, totems
    pixel(x,35,44,18,31,'#494a43');pixel(x,28,34,32,12,'#8d8472');
    pixel(x,34,46,7,6,'#1a2020');pixel(x,49,46,6,6,'#181b1c');
    pixel(x,40,60,10,5,'#b1a890');pixel(x,26,73,40,6,'#272b24');
  }else{ // logs, camp clutter, chests
    pixel(x,14,58,61,16,'#644b32');pixel(x,20,53,58,12,'#9f8055');
    pixel(x,16,59,12,13,'#c3aa71');pixel(x,48,64,8,3,'#2a2825');
    pixel(x,31,46,35,4,'#4c4432');
  }
  // Unique colored runes/flowers/lichen consistent with the base town pack.
  const trim=['#bc954d','#80aa7c','#bd6954','#6aacc2','#c9c28e'][i%5];
  for(let j=0;j<8;j++){const xx=13+(j*23+i*7)%62,yy=47+(j*11+i*13)%30;pixel(x,xx,yy,2,2,trim);}
  return format(c,w,h,name,.28);
}
/** Sprite metadata matches townObject and drawProp exactly (native px ground pivot). */
export function overworldObject(name) {
  if(CACHED.has(name))return CACHED.get(name);
  let obj=null;
  if(EXTRA_TREES.includes(name))obj=tree(name);
  else if(EXTRA_SCATTER.includes(name))obj=scattered(name);
  else if(SHRINES.includes(name))obj=shrine(name);
  else if(name==='ow_caravan')obj=caravan(name);
  if(obj)CACHED.set(name,obj);
  return obj;
}
