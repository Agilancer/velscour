// Runtime illustration overlays for the 50 native creatures of each biome.
// Uses the existing painted VELSCOUR bestiary as a pixel-art body silhouette
// (same resolution, pose and foot pivot), adding authored-in-code armor,
// growths, weapons, halos and surface inlays; NOT a simple palette swap.
import { makeCanvas, recolor } from '../core/util.js';
import { ART_BY_ID } from '../data/bestiary.js';

const CACHE=new Map(),MAX=96;
const HUES={
 catacombs:38,frozen:205,ice_temple:207,molten:13,fungal:103,sunken:185,
 blood:356,ashen:30,void:277,gilded:47,plague:92,sewers:82,crystal_castle:258,velscours_castle:358,velscours_temple:218,crystal:189,desert:35,
 shadow:251,forge:18,abyss:226,thorn:119,storm:217,obsidian:260,
 flesh:345,serpent:151,shattered:216,library:33,necropolis:225,
 cathedral:42,amber:31,overworld:110,desert_temple:38,hell:8,
 astral_plane:265,heavenly:48,throne:356,
};
const rect=(g,x,y,w,h,c)=>{g.fillStyle=c;g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
function line(g,v,c,w=2){
 g.beginPath();g.moveTo(...v[0]);for(let i=1;i<v.length;i++)g.lineTo(...v[i]);
 g.lineWidth=w;g.strokeStyle=c;g.stroke();
}
function poly(g,v,c){
 g.beginPath();g.moveTo(...v[0]);for(let i=1;i<v.length;i++)g.lineTo(...v[i]);
 g.closePath();g.fillStyle=c;g.fill();
}
function crystal(g,x,y,r,col,edge){
 poly(g,[[x-r,y],[x-r*.35,y-r*1.7],[x,y-r*2.1],
   [x+r,y-r*.7],[x+r*.55,y+r*.6],[x,y+r]],col);
 line(g,[[x,y-r*2],[x,y+r]],edge,1.5);
}
function nSprite(a,source){
 const pad=15,w=source.width+pad*2,h=source.height+pad;
 const result=makeCanvas(w,h),g=result.getContext('2d');
 g.imageSmoothingEnabled=false;
 const sx=pad,sy=0,v=a.nativeVariant,hue=(HUES[a.homeBiome]||42)+(v%5-2)*6;
 const bright=`hsl(${hue},62%,75%)`,mid=`hsl(${hue},48%,47%)`,
   shade=`hsl(${hue},41%,25%)`,shine=`hsl(${hue+13},62%,87%)`;
 const fx=(source._art?.fx??source.width/2)+pad;
 // Slightly transform a SOURCE-painted monster, rather than drawing a rough
 // abstract replacement. Its armor, weapons and alpha edges retain their pixel style.
 const painted=recolor(source,{colorize:[hue,.21],sat:1.04,contrast:1.05});
 g.drawImage(painted,pad,0);
 const bodyX=fx,headY=Math.max(14,h*.32),bodyY=h*.58,footY=h-5;
 const variant=v%10,group=Math.floor(v/10);
 const amount=6+variant;
 // Added morphology is visibly different across ranks, in the source pixel scale.
 if(group%4===0){
   for(let k=-1;k<=1;k+=2){
     poly(g,[[bodyX+k*15,headY+18],[bodyX+k*(26+amount),headY-12],
       [bodyX+k*(28+amount),headY-36],[bodyX+k*12,headY-3]],mid);
     line(g,[[bodyX+k*(26+amount),headY-12],[bodyX+k*12,headY+9]],shine,2);
   }
 }else if(group%4===1){
   for(let k=0;k<4;k++)crystal(g,bodyX+(k-1.5)*10,headY-2-(k%2)*10,
     3+variant%3,mid,shine);
 }else if(group%4===2){
   // Rootlike/bone/spiked silhouette along the shoulders.
   for(let side of [-1,1])for(let k=0;k<3;k++){
     poly(g,[[bodyX+side*(10+k*9),bodyY-10],
       [bodyX+side*(20+k*11),bodyY-24-k*8],
       [bodyX+side*(17+k*6),bodyY-4]],k%2?mid:shade);
   }
 }else{
   for(let side of [-1,1]){
     line(g,[[bodyX+side*18,bodyY-5],[bodyX+side*34,bodyY-28],
       [bodyX+side*(24+variant),headY-18]],shine,4);
     crystal(g,bodyX+side*34,bodyY-28,5,mid,shine);
   }
 }
 // Creature armor remains near shoulders/chest so monsters keep their
 // biological source character rather than appearing as pasted-on badges.
 const plateY=bodyY-8;
 poly(g,[[bodyX-13,plateY-8],[bodyX,plateY-17],[bodyX+13,plateY-8],
   [bodyX+8,plateY+11],[bodyX,plateY+17],[bodyX-8,plateY+11]],shade);
 poly(g,[[bodyX-8,plateY-5],[bodyX,plateY-13],[bodyX+8,plateY-5],
   [bodyX,plateY+9]],mid);
 crystal(g,bodyX,plateY+6,4,bright,shine);
 // Fifty native variants have unique visible insignia, shoulder trim and
 // silhouettes, not simply 50 catalog names sharing one raster.
 for(let k=0;k<2+variant%4;k++){
   const angle=k*Math.PI*2/(2+variant%4);
   const x=bodyX+Math.cos(angle)*(9+variant),
     y=plateY+Math.sin(angle)*(7+variant%3);
   rect(g,x-1,y-1,3,3,shine);
 }
 if(v>=40){
   // Guardian-tier crests change the outer silhouette as well.
   poly(g,[[bodyX-23,headY-10],[bodyX-14,headY-30],
     [bodyX,headY-23],[bodyX+14,headY-30],[bodyX+23,headY-10]],
     mid);
   for(let k=0;k<5;k++)crystal(g,bodyX-18+k*9,headY-19,3,bright,shine);
 }
 if(variant%3===1) {
   line(g,[[bodyX+26,footY-8],[bodyX+34,headY+18]],shade,5);
   crystal(g,bodyX+34,headY+12,6,bright,shine);
 }else if(variant%3===2){
   line(g,[[bodyX-24,bodyY],[bodyX-38,headY+16]],shine,4);
   poly(g,[[bodyX-42,headY+16],[bodyX-35,headY-5],[bodyX-29,headY+16]],mid);
 }
 result._art={fx};
 return result;
}
/** sourceResolver returns an approved/loaded art cell via core/enemyart.js.
 * Returns null while the source sheet is loading, respecting pixel fallback.
 */
export function biomeNativeImage(id,swap,mode,sourceResolver){
 const a=ART_BY_ID[id];if(!a?.sourceArt)return null;
 const key=id+'|'+mode+'|'+JSON.stringify(swap||null);
 if(CACHE.has(key)){
   const c=CACHE.get(key);CACHE.delete(key);CACHE.set(key,c);return c;
 }
 const original=sourceResolver(a.sourceArt);
 if(!original)return null;
 let sprite=nSprite(a,original);
 if(swap){
   const recolored=recolor(sprite,swap);
   recolored._art={...sprite._art};sprite=recolored;
 }
 if(mode){
   const output=makeCanvas(sprite.width,sprite.height),g=output.getContext('2d');
   g.drawImage(sprite,0,0);g.globalCompositeOperation='source-atop';
   g.fillStyle=mode==='flash'?'#fff':'rgba(21,11,15,.65)';
   g.fillRect(0,0,output.width,output.height);
   output._art={...sprite._art};sprite=output;
 }
 CACHE.set(key,sprite);while(CACHE.size>MAX)CACHE.delete(CACHE.keys().next().value);
 return sprite;
}
