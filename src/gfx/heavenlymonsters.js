// HEAVENLY monster sprite renderer: 60 distinct, actual in-game Canvas sprites.
// Twelve independent body silhouettes with five named, individually ornamented
// variants each. Uses the existing bestiary's pixel-art foot anchor and flash/
// corpse/palette-swap contract; original geometry is drawn, not re-skinned enemies.
import { makeCanvas, recolor, silhouette, swapKey } from '../core/util.js';
import { HEAVENLY_MONSTERS } from '../data/heavenly.js';
import { approvedHeavenlyMonsterCanvas, preloadApprovedHeavenlySprites } from './approvedbiomeart.js';
import { aiHeavenlyMonsterCanvas, preloadAIGeneratedHeavenlySprites } from './aibiomeart.js';

const BY_ID = Object.fromEntries(HEAVENLY_MONSTERS.map(e=>[e.id,e]));
const CACHE = new Map(), MAX=88;
let preloadPromise = null;
export function preloadApprovedHeavenlyArtwork() {
  return preloadPromise || (preloadPromise=Promise.all([
    preloadApprovedHeavenlySprites(), preloadAIGeneratedHeavenlySprites(),
  ]).then(([image])=>{
    CACHE.clear(); // Evict procedural previews created before both sheets decoded.
    return image;
  }));
}
const PALETTES = [
  {shell:'#f2e8c9',light:'#fffbe9',shadow:'#b2a488',metal:'#e4bb62',edge:'#715b51',gem:'#52bddd',aura:'#c9e7ef'},
  {shell:'#c8e3f0',light:'#f4f9ff',shadow:'#799fb8',metal:'#b2c6e7',edge:'#526e91',gem:'#4e88eb',aura:'#98befa'},
  {shell:'#f1dfd5',light:'#fff9f0',shadow:'#be8eae',metal:'#e3b7cb',edge:'#6d5876',gem:'#b778dc',aura:'#e3c9fd'},
  {shell:'#fff0c2',light:'#fffdef',shadow:'#c9a468',metal:'#f5ce5b',edge:'#785b36',gem:'#f4ae43',aura:'#ffebad'},
  {shell:'#dde8f6',light:'#ffffff',shadow:'#a9a0cc',metal:'#f5d77c',edge:'#5e5891',gem:'#e7adfc',aura:'#d9d5fc'},
];
const R=(g,x,y,w,h,c)=>{g.fillStyle=c;g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
function path(g,pts,col,edge){
  g.beginPath();g.moveTo(...pts[0]);for(let i=1;i<pts.length;i++)g.lineTo(...pts[i]);
  g.closePath();g.fillStyle=col;g.fill();if(edge){g.strokeStyle=edge;g.lineWidth=2;g.stroke();}
}
function line(g,pts,col,w=2){
  g.beginPath();g.moveTo(...pts[0]);for(let i=1;i<pts.length;i++)g.lineTo(...pts[i]);
  g.strokeStyle=col;g.lineWidth=w;g.stroke();
}
function oval(g,x,y,rx,ry,c,edge){
  g.beginPath();g.ellipse(x,y,rx,ry,0,0,Math.PI*2);
  g.fillStyle=c;g.fill();if(edge){g.strokeStyle=edge;g.lineWidth=2;g.stroke();}
}
function ring(g,x,y,rx,ry,c,w=3){
  g.beginPath();g.ellipse(x,y,rx,ry,0,0,Math.PI*2);
  g.lineWidth=w;g.strokeStyle=c;g.stroke();
}
function diamond(g,x,y,rx,ry,c,edge){
  path(g,[[x,y-ry],[x+rx,y],[x,y+ry],[x-rx,y]],c,edge);
}
function star(g,x,y,r,p){
 R(g,x-1,y-r,3,r*2,p.light);R(g,x-r,y-1,r*2,3,p.metal);
 diamond(g,x,y,r*.36,r*.36,p.gem);
}
function feather(g,x,y,angle,length,p){
  g.save();g.translate(x,y);g.rotate(angle);
  path(g,[[0,0],[-8,-length*.35],[-2,-length],[6,-length*.48],[5,0]],p.shell,p.edge);
  line(g,[[1,0],[0,-length*.86]],p.light,2);
  g.restore();
}
function wings(g,x,y,w,h,p,style=0){
 for(let side of [-1,1]){
   path(g,[[x+side*8,y+h*.44],[x+side*(w*.75),y-h*.05],
     [x+side*w,y-h*.87],[x+side*w*.63,y-h*.69],
     [x+side*w*.33,y-h*.46],[x+side*15,y+h*.06]],p.shadow,p.edge);
   for(let i=0;i<5+style%3;i++){
     feather(g,x+side*(16+i*8),y+h*.22-i*7,
       side*(-.45-i*.08),27+(i%2)*10,p);
   }
 }
}
function halo(g,x,y,p,v=0){
 ring(g,x,y,19+v*2,6+v%2*2,p.metal,3);
 ring(g,x,y,15+v*2,4+v%2,p.light,1.5);
 for(let i=0;i<3+v;i++){
   const px=x-13+(i*(26/Math.max(1,2+v)));
   R(g,px,y-7-(i%2)*2,3,3,p.gem);
 }
}
function staff(g,x,y,p,type=0){
  line(g,[[x,y],[x+9,y-103]],p.edge,7);
  line(g,[[x+2,y-9],[x+10,y-105]],p.metal,3);
  if(type%3===0){diamond(g,x+10,y-116,12,17,p.gem,p.light);star(g,x+10,y-118,8,p);}
  if(type%3===1){ring(g,x+10,y-111,18,16,p.metal,4);star(g,x+10,y-111,8,p);}
  if(type%3===2){R(g,x-3,y-122,28,10,p.metal);R(g,x+3,y-134,6,25,p.light);}
}
function weapon(g,x,y,p,v=0){
  const t=v%5;
  if(t===0||t===3){
    line(g,[[x,y],[x+16,y-96]],p.edge,7);
    line(g,[[x+16,y-96],[x+16,y-144]],p.light,10);
    diamond(g,x+16,y-132,7,20,p.metal,p.edge);
    R(g,x+1,y-106,31,7,p.metal);
  }else if(t===1){
    line(g,[[x,y],[x+8,y-102]],p.metal,6);
    diamond(g,x+7,y-115,14,24,p.light,p.gem);
  }else if(t===2) staff(g,x,y,p,t);
  else {
    line(g,[[x,y],[x+16,y-84]],p.metal,5);
    ring(g,x+17,y-98,18,15,p.gem,3);
    star(g,x+18,y-97,10,p);
  }
}
function armor(g,x,y,p,v,wide=false){
 const w=wide?33:24;
 path(g,[[x-w,y-73],[x-w-5,y-57],[x-w+1,y-17],[x,y-7],
   [x+w-1,y-17],[x+w+6,y-59],[x+w,y-73]],p.shell,p.edge);
 path(g,[[x-w+4,y-70],[x,y-80],[x+w-4,y-70],[x,y-24]],p.shadow,p.metal);
 diamond(g,x,y-53,7+v,12,p.gem,p.light);
 R(g,x-w,y-25,w*2,6,p.metal);
 for(let i=0;i<3;i++)R(g,x-15+i*14,y-66+i%2*13,5,6,p.light);
}
function face(g,x,y,p,v,mask=false){
 oval(g,x,y-94,18,21,mask?p.metal:p.shell,p.edge);
 path(g,[[x-16,y-102],[x-11,y-120],[x+11,y-120],[x+16,y-102]],p.metal,p.edge);
 R(g,x-11,y-97,7,4,p.gem);R(g,x+4,y-97,7,4,p.gem);
 if(v%2===1)R(g,x-2,y-112,4,23,p.light);
 else diamond(g,x,y-108,6,8,p.light);
}
function cloak(g,x,y,p,v){
 path(g,[[x-20,y-72],[x-43,y-15],[x-21,y],[x,y-13],
   [x+22,y],[x+40,y-15],[x+19,y-72]],v%2?p.shadow:p.metal,p.edge);
 for(let i=0;i<4;i++)line(g,[[x-14+i*9,y-49],[x-20+i*13,y-8]],p.light,1.4);
}
function feet(g,x,y,p,v){
 for(let side of [-1,1]){
   line(g,[[x+side*12,y-22],[x+side*15,y-3]],p.edge,12);
   R(g,x+side*15-12,y-6,22,8,p.metal);
   if(v%2)R(g,x+side*15-9,y-5,4,3,p.light);
 }
}
function humanoid(g,p,v,family){
 const cx=80,cy=178;
 if(family==='seraph'||family==='herald'||family==='oracle')wings(g,cx,91,73,53,p,v);
 else if(family==='templar'||family==='throne'){if(v>=3)wings(g,cx,93,59,46,p,v);}
 if(family==='throne'){wings(g,cx,91,94,70,p,v);halo(g,cx,43,p,v);}
 if(family==='herald'||family==='oracle')cloak(g,cx,cy,p,v);
 feet(g,cx,cy,p,v);
 armor(g,cx,cy,p,v,family==='throne');
 // distinct shoulder plates and weapon silhouette per rank
 for(const s of [-1,1]){
  diamond(g,cx+s*30,cy-73,12+v,12,p.metal,p.edge);
  line(g,[[cx+s*27,cy-69],[cx+s*(31+v*2),cy-38]],p.shell,10);
 }
 face(g,cx,cy,p,v,family==='templar'||family==='throne');
 halo(g,cx,cy-128,p,v);
 if(family==='herald'){
  // sacred horn and trumpet, unique from conventional weapons
  line(g,[[cx+28,cy-39],[cx+50,cy-96],[cx+50,cy-131]],p.metal,8);
  path(g,[[cx+37,cy-131],[cx+62,cy-131],[cx+57,cy-143],[cx+42,cy-143]],p.gem,p.light);
 }else if(family==='oracle'){
  line(g,[[cx+24,cy-42],[cx+52,cy-129]],p.metal,5);
  ring(g,cx+47,cy-86,11+v,22,p.gem,3);
  star(g,cx+50,cy-123,5,p);
 }else weapon(g,cx+33,cy-28,p,v);
 if(family==='templar'){
  diamond(g,cx-34,cy-42,20,32,p.metal,p.edge);
  star(g,cx-34,cy-42,9,p);
 }
 if(family==='throne'){
  for(let i=0;i<5+v;i++){const x=32+i*19;star(g,x,43+i%2*18,5,p);}
  R(g,cx-10,cy-138,20,10,p.metal);
 }
 if(v===4){
  // boss-specific seven-point radiant crown
  for(let i=0;i<7;i++)diamond(g,cx-28+i*9,cy-143-(i%2)*8,5,11,p.light,p.gem);
 }
}
function cherub(g,p,v){
 const x=80,y=123;
 wings(g,x,y,70+v*7,54,p,v);
 oval(g,x,y,27+v*2,30,p.shell,p.edge);
 for(let i=0;i<5;i++)feather(g,x-24+i*12,y+30,i*.19-.4,20+v*2,p);
 face(g,x,y+18,p,v);
 halo(g,x,y-63,p,v);
 for(let i=0;i<v+2;i++)star(g,x-35+i*16,y-60+(i%2)*13,4,p);
}
function ophanim(g,p,v){
 const x=80,y=99;
 for(let j=0;j<3;j++){
  g.save();g.translate(x,y);g.rotate((j-1)*.5+(v%2)*.14);
  ring(g,0,0,34+j*12+v*2,14+j*7,p.metal,7);
  ring(g,0,0,32+j*12+v*2,11+j*7,p.light,2);
  g.restore();
 }
 oval(g,x,y,18+v,25,p.shadow,p.edge);
 oval(g,x,y,10+v,17,p.gem,p.light);
 R(g,x-2,y-6,5,10,p.light);
 for(let i=0;i<8+v;i++){
  const a=i*Math.PI*2/(8+v);
  oval(g,x+Math.cos(a)*(47+v*3),y+Math.sin(a)*30,4,6,p.light,p.gem);
 }
 halo(g,x,y-58,p,v);
}
function golem(g,p,v){
 const x=80,y=175;
 for(const side of [-1,1]){
  R(g,x+side*19-12,y-48,24,44,p.shadow);
  diamond(g,x+side*23,y-52,14,19,p.metal,p.edge);
  R(g,x+side*20-11,y-7,26,11,p.edge);
 }
 path(g,[[x-37,y-125],[x,y-151],[x+37,y-125],[x+31,y-59],
 [x,y-46],[x-31,y-59]],p.shell,p.edge);
 diamond(g,x,y-111,15+v*3,21,p.gem,p.light);
 for(let i=0;i<4;i++)R(g,x-19+i*12,y-94+(i%2)*15,6,7,p.metal);
 for(let side of [-1,1]){
  diamond(g,x+side*40,y-109,15+v,20,p.metal,p.edge);
  line(g,[[x+side*42,y-104],[x+side*47,y-38]],p.shadow,17);
  diamond(g,x+side*49,y-35,14,16,p.shell,p.metal);
 }
 face(g,x,y-21,p,v,true);
 halo(g,x,y-160,p,v);
}
function animal(g,p,v,griffin=false){
 const x=79,y=171;
 if(griffin)wings(g,x,100,75+v*8,55,p,v);
 for(const side of [-1,1]){
  line(g,[[x+side*25,y-47],[x+side*26,y-4]],p.edge,11);
  R(g,x+side*26-10,y-7,21,8,p.metal);
 }
 oval(g,x,y-58,48+v*2,32,p.shell,p.edge);
 path(g,[[x-45,y-61],[x-13,y-108],[x+29,y-106],[x+45,y-71]],p.metal,p.edge);
 oval(g,x+32,y-94,25,23,p.shell,p.edge);
 path(g,[[x+44,y-89],[x+73,y-82],[x+43,y-68]],griffin?p.metal:p.shadow,p.edge);
 for(const side of [-1,1])diamond(g,x+33+side*13,y-110,7,14,p.light,p.edge);
 R(g,x+43,y-99,6,4,p.gem);
 line(g,[[x-45,y-51],[x-70,y-94],[x-64,y-125]],p.metal,9);
 if(v>=2)ring(g,x+5,y-70,18+v*3,17,p.gem,3);
 for(let i=0;i<3+v;i++)feather(g,x-36+i*14,y-68,.1,23+v*3,p);
}
function luminary(g,p,v){
 const x=80,y=109;
 for(let i=0;i<6+v;i++){
  const a=i*Math.PI*2/(6+v),r=31+i%3*10;
  diamond(g,x+Math.cos(a)*r,y+Math.sin(a)*r,8+v,14+v,p.metal,p.edge);
 }
 oval(g,x,y,24+v*3,30+v*2,p.gem,p.light);
 oval(g,x-7,y-12,6,12,p.light);
 for(let j=0;j<3;j++)ring(g,x,y,34+v*5+j*12,10+j*6,p.aura,2);
 for(let i=0;i<7;i++)star(g,25+i*18,58+(i%3)*21,3,p);
}
function judgement(g,p,v){
 const x=80,y=174;
 wings(g,x,91,85+v*5,63,p,v);
 feet(g,x,y,p,v);
 armor(g,x,y,p,v,true);
 face(g,x,y,p,v,true);halo(g,x,y-127,p,v);
 for(let i=0;i<4+v;i++){
   const side=i%2?1:-1,offset=(i/2|0)*11;
   line(g,[[x+side*30,y-65+offset],[x+side*(55+offset),y-43+offset]],p.metal,10);
   diamond(g,x+side*(55+offset),y-43+offset,10,14,p.gem,p.edge);
 }
 weapon(g,x+37,y-22,p,v);
 for(let i=0;i<2+v;i++)star(g,x-25+i*16,34+i%2*9,4,p);
}
function ornament(g,p,v,code){
 const x=80;
 // Unique variant-specific badges: sunburst, lily, star, leaf, crescent.
 const y=code==='luminary'?113:code==='ophanim'?101:130;
 switch(v){
  case 0:star(g,x,y,9,p);break;
  case 1:diamond(g,x,y,11,17,p.gem,p.light);break;
  case 2:ring(g,x,y,16,13,p.gold||p.metal,3);break;
  case 3:for(let i=0;i<4;i++)diamond(g,x-15+i*10,y+((i%2)*6),6,11,p.light,p.edge);break;
  default:for(let i=0;i<7;i++){let a=i*2*Math.PI/7;star(g,x+Math.cos(a)*23,y+Math.sin(a)*19,5,p);}
 }
}
function baseSprite(a) {
 // The user-approved paintings win for one sprite per Heavenly family (variant 0),
 // without duplicating painted art across named variants; AI art covers the rest.
 if(a.heavenlyVariant===0) {
   const approved=approvedHeavenlyMonsterCanvas(a.heavenlyFamily);
   if(approved) return approved;
 }
 const generated=aiHeavenlyMonsterCanvas(HEAVENLY_MONSTERS.indexOf(a));
 if(generated)return generated;
 const canvas=makeCanvas(160,186),g=canvas.getContext('2d');
 g.imageSmoothingEnabled=false;
 const p=PALETTES[a.heavenlyVariant],v=a.heavenlyVariant,code=a.heavenlyFamily;
 g.save();
 switch(code){
   case 'seraph':case 'herald':case 'templar':case 'oracle':case 'throne':humanoid(g,p,v,code);break;
   case 'cherub':cherub(g,p,v);break;
   case 'ophanim':ophanim(g,p,v);break;
   case 'warden':golem(g,p,v);break;
   case 'beast':animal(g,p,v,false);break;
   case 'griffin':animal(g,p,v,true);break;
   case 'luminary':luminary(g,p,v);break;
   case 'judgement':judgement(g,p,v);break;
 }
 ornament(g,p,v,code);
 g.restore();
 canvas._art={fx:80};
 return canvas;
}
/** Same interface as core/enemyart's enemyImage; bounded to avoid iOS canvas leaks. */
export function heavenlyEnemyImage(id,swap=null,mode=''){
 const a=BY_ID[id];if(!a)return null;
 const key=id+'|'+swapKey(swap);
 let image=CACHE.get(key);
 if(image){CACHE.delete(key);CACHE.set(key,image);}
 else{
   image=baseSprite(a);
   if(swap)image=recolor(image,swap);
   image._art={fx:80};
   CACHE.set(key,image);
   while(CACHE.size>MAX)CACHE.delete(CACHE.keys().next().value);
 }
 // flash/corpse silhouettes hang off the base sprite (util.silhouette), so they never evict a look
 return mode?silhouette(image,mode==='flash'?'#ffffff':'rgba(23,9,15,.67)'):image;
}
