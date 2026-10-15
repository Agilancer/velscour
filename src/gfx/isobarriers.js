// Correctly joined isometric barrier sprites. The world x and y axes project
// respectively as (+80,+40) and (-80,+40) at the native 160×80 tile size.
// A mirrored X fence is NOT a Y fence: both have different depth and endpoints.
import { makeCanvas } from '../core/util.js';

const cache=new Map();
const STYLES={
  rail:['#6e5136','#b89060','#3c302b','#d9b888'],
  stone:['#736d66','#b7b0a0','#4e4f52','#d9c6a5'],
  thorn:['#405039','#81905b','#222c26','#a9a776'],
  bone:['#9e9683','#e0d6b8','#524947','#f0e1b7'],
  iron:['#46545d','#8798a3','#253038','#bdc9c7'],
  crystal:['#3d7593','#81c5d6','#234458','#c2ebf6'],
  gilded:['#92704e','#e1bc72','#4f3b39','#fff0c8'],
  hell:['#682d32','#b45e3e','#241c27','#ecb373'],
  astral:['#605a8f','#aaa1db','#2a2851','#d7dbef'],
  heavenly:['#a3a3ac','#ede6d4','#706f89','#fffdf0'],
};
const rect=(g,x,y,w,h,c)=>{g.fillStyle=c;g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
function stroke(g,pts,c,w=2){
  g.beginPath();g.moveTo(...pts[0]);for(let i=1;i<pts.length;i++)g.lineTo(...pts[i]);
  g.lineWidth=w;g.strokeStyle=c;g.stroke();
}
function diamond(g,x,y,rx,ry,c){
 g.beginPath();g.moveTo(x,y-ry);g.lineTo(x+rx,y);g.lineTo(x,y+ry);g.lineTo(x-rx,y);g.closePath();g.fillStyle=c;g.fill();
}
/**
 * Every segment spans EXACTLY one tile edge through its midpoint (screen
 * endpoints at ±40 native px x, ±20 native px y). No arbitrary sprite
 * mirroring/offset, so consecutive posts and upper/lower rails JOIN.
 *
 * axis='x': from (-40,-20) to (40,20)
 * axis='y': from (40,-20) to (-40,20)
 * sprite pivot = (80,105). The entire sprite is sorted at midpoint x+y.
 */
export function isoBarrier(style='rail',axis='x'){
  style=STYLES[style]?style:'rail';axis=axis==='y'?'y':'x';
  const key=style+':'+axis;
  if(cache.has(key))return cache.get(key);
  const canvas=makeCanvas(160,152),g=canvas.getContext('2d');
  g.imageSmoothingEnabled=false;
  const [dark,mid,shade,light]=STYLES[style],px=80,py=105;
  const sign=axis==='x'?1:-1;
  const ax=px-40*sign,ay=py-20,bx=px+40*sign,by=py+20;
  // Upper and lower rails parallel the projected tile edge; material has
  // actual vertical thickness, with highlights constrained to upper faces.
  for(const z of [18,34]){
    stroke(g,[[ax,ay-z+5],[bx,by-z+5]],shade,10);
    stroke(g,[[ax,ay-z],[bx,by-z]],mid,8);
    stroke(g,[[ax,ay-z-3],[bx,by-z-3]],light,2);
  }
  // Three posts share the very same endpoints of adjacent segments; no
  // visual gaps when tiled. Uprights stay vertical in both orientations.
  for(let k=0;k<3;k++){
    const t=k/2,x=ax+(bx-ax)*t,y=ay+(by-ay)*t;
    rect(g,x-5,y-52,10,55,shade);
    rect(g,x-4,y-53,8,51,mid);
    rect(g,x-4,y-53,3,50,light);
    diamond(g,x,y-55,8,5,light);
    if(style!=='rail'&&style!=='thorn')rect(g,x-2,y-33,4,6,dark);
  }
  if(['thorn','bone','iron','hell','crystal'].includes(style))
   for(let i=0;i<5;i++){
    let t=.08+i*.21,x=ax+(bx-ax)*t,y=ay+(by-ay)*t-37;
    // Spikes obey same tile-space axis and stay inside the fence's bounds.
    diamond(g,x,y-7,4,13,style==='crystal'?light:style==='bone'?'#ddd4b6':dark);
   }
  const sprite={img:canvas,sx:0,sy:0,w:canvas.width,h:canvas.height,
    ox:-px,oy:-py,name:'iso_'+style+'_'+axis,fp:.15,block:true,
    isometric:true,axis,edgeA:[ax-px,ay-py],edgeB:[bx-px,by-py]};
  cache.set(key,sprite);return sprite;
}
/** Scatter prop object with a native 160px tile-space pivot, never mirror.
 * World anchor is the exact midpoint of a projected 1-tile barrier segment.
 */
export function isoBarrierProp(style,axis,x,y,k){
 return{kind:'scatter',x,y,spr:isoBarrier(style,axis),k,flip:false,barrier:true};
}
export const BARRIER_STYLES=Object.keys(STYLES);
