// Procedural painted Desert Temple biome pack. Fully Canvas 2D, no external textures.
// Geometry/depth-slice masks are inherited from the Catacombs template; images are new
// sandstone/malachite/obsidian material art and 40 newly drawn temple objects.
// Every source cell aligns to the original 160x80 isometric pivot contract.
import { makeCanvas } from '../core/util.js';

export const TEMPLE_FAMILIES = ['sun_ashlar', 'scarab_sanctum', 'lotus_colonnade', 'royal_burial', 'obsidian_inner_temple'];
export const TEMPLE_ARCHES = ['sun_gate', 'ankh_vault', 'cobra_portal'];
export const TEMPLE_DOORS = ['golden_gate', 'lapis_barrier', 'sealed_reliquary'];
export const TEMPLE_PROPS = [
  'sun_obelisk', 'jackal_guardian', 'scarab_altar', 'solar_dais', 'canopic_urn',
  'gilded_sarcophagus', 'cobra_sentinel', 'sandstone_column', 'hieroglyph_stela', 'collapsed_pylon',
  'gold_brazier', 'blue_flame_brazier', 'sun_relief', 'broken_sphinx', 'serpent_carving',
  'temple_censer', 'lotus_font', 'sandstone_rubble', 'drifting_sand', 'urn_cluster',
  'relic_chest', 'mummy_wrappings', 'balance_scales', 'turquoise_offerings', 'fallen_column',
  'bone_pile', 'ankh_standard', 'cobra_standard', 'palm_planter', 'scarab_mosaic',
  'burial_lantern', 'sun_torch', 'obsidian_obelisk', 'chained_coffer', 'canopic_set',
  'cracked_tablet', 'incense_bowl', 'sand_drift', 'royal_censer', 'ritual_banner',
];
const WALKOVER = new Set(['mummy_wrappings','sandstone_rubble','drifting_sand','lotus_font',
  'bone_pile','turquoise_offerings','scarab_mosaic','cracked_tablet','incense_bowl','sand_drift']);
const STONE = ['#ba824e', '#d5a16a', '#a86f3e', '#e0b779', '#6e4a36', '#51443f'];
const GOLD = '#ddae56', LAPIS = '#3c899e', DARK = '#30262a';
const H = (a,b,c=0) => { let n=(Math.imul(a+1,374761393)+Math.imul(b+7,668265263)+Math.imul(c+11,1274126177))|0;
  n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967296; };
const rect=(c,x,y,w,h,col) => {c.fillStyle=col;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
const poly=(c,pts,col,stroke=null) => {c.beginPath();c.moveTo(...pts[0]);for(const p of pts.slice(1))c.lineTo(...p);
  c.closePath();c.fillStyle=col;c.fill();if(stroke){c.lineWidth=1.5;c.strokeStyle=stroke;c.stroke();}};
const line=(c,points,col,width=2)=>{c.beginPath();c.moveTo(...points[0]);for(const p of points.slice(1))c.lineTo(...p);
 c.strokeStyle=col;c.lineWidth=width;c.stroke();};
function emblem(c,x,y,s=1,color=GOLD) {
  rect(c,x-2*s,y-11*s,4*s,22*s,color);rect(c,x-8*s,y-4*s,16*s,4*s,color);
  c.beginPath();c.ellipse(x,y-10*s,5*s,5*s,0,0,Math.PI*2);c.lineWidth=2*s;c.strokeStyle=color;c.stroke();
}
function diamond(c,x,y,rx,ry,col,edge=null) {
 poly(c,[[x,y-ry],[x+rx,y],[x,y+ry],[x-rx,y]],col,edge);
}
function stoneTexture(c,x,y,w,h,id,scale=1) {
  for(let i=0;i<Math.round(w*h/175);i++){
    const xx=x+Math.floor(H(i,id,7)*w),yy=y+Math.floor(H(i,id,4)*h);
    rect(c,xx,yy,2*scale,scale,H(i,id,2)>.55?'rgba(45,29,22,.25)':'rgba(255,225,167,.20)');
  }
}
function floorCell(c,i) {
 const X=(i%10)*162,Y=Math.floor(i/10)*82,base=i<10?i:i%10;
 c.save();c.translate(X,Y);c.beginPath();c.moveTo(80,0);c.lineTo(160,40);c.lineTo(80,80);c.lineTo(0,40);c.closePath();c.clip();
 const palette=[['#b48151','#c9965b'],['#c39a65','#dfb77b'],['#896c52','#a78260'],
 ['#b78c5b','#d7ae6b'],['#916f48','#b99560'],['#b79b73','#dec7a1'],
 ['#bb784b','#d19b66'],['#978267','#bda57a'],['#35383d','#55575a'],['#5f6d67','#80969a']];
 rect(c,0,0,160,80,palette[base][0]);
 // Materials touch the world-tile boundary with identical colors. All pattern
 // pixels are inset, so repeated floor cells do not show a visible seam.
 c.save();c.beginPath();c.moveTo(80,7);c.lineTo(146,40);c.lineTo(80,73);c.lineTo(14,40);c.closePath();c.clip();
 // Low-contrast tesserae: nested diamonds remain level with the existing 2:1 world geometry.
 for(let y=-40;y<120;y+=16)for(let x=-40;x<200;x+=32){
   const xx=x+((Math.floor(y/16)&1)?16:0),u=H(xx,y,base);
   if(u<.2)continue;
   diamond(c,xx,y,14,7,u>.65?palette[base][1]:'#9a774f','rgba(53,38,35,.15)');
 }
 stoneTexture(c,0,0,160,80,i);
 // Clear a small centre for motifs; all decorative marks keep 8px away from edges.
 if(i>=10){
   const style=Math.floor((i-10)/5),color=style%3===0?'#c9aa6b':style%3===1?'#317a94':'#3b383b';
   const ux=80,uy=40;
   switch(i%5){
     case 0:diamond(c,ux,uy,25,13,'#6c5949',GOLD);diamond(c,ux,uy,17,9,'#2f6f7c',GOLD);break;
     case 1:emblem(c,ux,uy,1,color);break;
     case 2:line(c,[[53,42],[66,30],[77,39],[85,29],[99,36],[112,29]],'#493326',2);break;
     case 3:for(let j=0;j<7;j++)rect(c,60+j*6,30+j%2*6,4,10,color);break;
     default:diamond(c,ux,uy,23,12,'#84633e',GOLD);emblem(c,ux,uy,.55,'#86bfc3');
   }
   if(i%7===0){rect(c,66,35,28,11,'rgba(17,26,28,.7)');line(c,[[68,38],[92,42]],'#e0bf7b',2);}
 }
 c.restore(); // finish inset material details
 c.restore(); // finish outer diamond clip
}
function floorAtlas(meta) {
 const canvas=makeCanvas(1620,492),c=canvas.getContext('2d');c.imageSmoothingEnabled=false;
 for(let i=0;i<60;i++)floorCell(c,i);
 return canvas;
}
function stoneWalls(original,meta){
 const canvas=makeCanvas(original.width,original.height),c=canvas.getContext('2d',{willReadFrequently:true});
 c.drawImage(original,0,0);
 const im=c.getImageData(0,0,canvas.width,canvas.height),p=im.data,w=canvas.width,h=canvas.height;
 // Convert every original opaque pixel into four-shade sandstone with geometry,
 // full alpha, and source shading intact; dark interior shadows stay dark.
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const k=(y*w+x)*4;if(!p[k+3])continue;
  const lum=(p[k]*.28+p[k+1]*.58+p[k+2]*.14)/255;
  const v=Math.max(0,Math.min(1,lum*.76+.20+(H(x>>2,y>>2,3)-.5)*.12));
  const joint=((x+Math.floor(y/24)*17)%60<2&&y%46<39)||(y%46<2);
  const shadow=joint?.78:1;
  // Gold relief highlights, lapis enamel along horizontal structural bands.
  const band=(y%112>91&&y%112<96);
  const gold=band&&lum>.21,blue=(y%109>100&&y%109<104)&&lum>.26;
  p[k]=Math.round((gold?211:blue?49:69+159*v)*shadow);
  p[k+1]=Math.round((gold?156:blue?113:49+120*v)*shadow);
  p[k+2]=Math.round((gold?74:blue?143:38+68*v)*shadow);
 }
 c.putImageData(im,0,0);
 // Glyphs are gilded into original opaque wall surfaces without painting outside
 // the original collision silhouettes or past the depth-sliced geometry.
 c.save();c.globalCompositeOperation='source-atop';c.globalAlpha=.30;
 for(let y=18;y<h;y+=73)for(let x=23;x<w;x+=92){
   if(H(x,y,12)>.46){emblem(c,x,y,.7,GOLD);rect(c,x+13,y-9,3,18,LAPIS);}
   else {line(c,[[x-9,y+5],[x,y-6],[x+9,y+5]],'#1d647d',3);}
 }
 c.restore();
 return canvas;
}
function shadow(c,x,y,w=66,h=12) {
 c.save();c.fillStyle='rgba(16,12,17,.31)';c.beginPath();c.ellipse(x,y,w/2,h/2,0,0,Math.PI*2);c.fill();c.restore();
}
function cube(c,x,y,w=76,height=48){
 shadow(c,x,y+1,w+18,18);
 poly(c,[[x-w/2,y-height-8],[x,y-height-22],[x+w/2,y-height-8],[x,y-height+7]],'#d9aa6b','#493c37');
 poly(c,[[x-w/2,y-height-8],[x,y-height+7],[x,y],[x-w/2,y-14]],'#946744','#493c37');
 poly(c,[[x,y-height+7],[x+w/2,y-height-8],[x+w/2,y-14],[x,y]],'#bb824e','#493c37');
 for(let j=0;j<Math.floor(height/15);j++)line(c,[[x-w/2+4,y-22-j*15],[x-2,y-6-j*15]],'#72523d',1.5);
}
function column(c,x=80,y=147,night=false){
 const pal=night?'#4e555d':'#c79a62';
 shadow(c,x,y,53,14);
 cube(c,x,y,55,17);
 rect(c,x-17,y-104,34,85,pal);rect(c,x-17,y-101,5,81,night?'#74818c':'#e9b876');
 rect(c,x+10,y-101,7,81,night?'#27323a':'#815336');
 for(let j=0;j<3;j++)line(c,[[x-14,y-84+j*18],[x+14,y-84+j*18]],night?'#638899':'#8f673c',2);
 rect(c,x-28,y-109,56,12,night?'#63707d':'#dfb174');rect(c,x-23,y-117,46,9,GOLD);
 emblem(c,x,y-59,.6,night?'#78c4d4':'#537c84');
}
function obelisk(c,x=80,y=147,night=false){
 const a=night?'#41454e':'#d5a16a',b=night?'#626c7b':'#a76f43';
 shadow(c,x,y,55,15);cube(c,x,y,54,17);
 poly(c,[[x-17,y-18],[x,y-25],[x,y-108],[x-17,y-100]],b);
 poly(c,[[x,y-25],[x+17,y-19],[x+17,y-100],[x,y-108]],a);
 poly(c,[[x-17,y-100],[x,y-127],[x+17,y-100],[x,y-108]],GOLD);
 for(let j=0;j<5;j++)emblem(c,x+8,y-94+j*15,.24,j%2?GOLD:LAPIS);
 rect(c,x-18,y-28,36,6,GOLD);
}
function urn(c,x=80,y=138,color='#caa16a'){
 shadow(c,x,y+4,45,12);
 c.beginPath();c.moveTo(x-11,y-47);c.quadraticCurveTo(x-29,y-25,x-16,y-10);
 c.quadraticCurveTo(x,y+2,x+18,y-10);c.quadraticCurveTo(x+30,y-25,x+11,y-47);
 c.closePath();c.fillStyle=color;c.fill();c.lineWidth=2;c.strokeStyle='#654330';c.stroke();
 rect(c,x-14,y-48,28,6,GOLD);rect(c,x-10,y-54,20,8,'#704b37');
 rect(c,x-12,y-23,24,5,'#a87645');emblem(c,x,y-30,.45,LAPIS);
}
function coffin(c,x=80,y=143){
 shadow(c,x,y+4,98,14);
 poly(c,[[x-36,y-39],[x+7,y-66],[x+42,y-46],[x+36,y-11],[x-13,y+4],[x-42,y-14]],'#a67549','#4b382e');
 poly(c,[[x-31,y-41],[x+7,y-59],[x+35,y-43],[x+32,y-16],[x-13,y-5],[x-35,y-16]],'#d4ab6c',GOLD);
 emblem(c,x,y-33,1.1,'#398495');
 rect(c,x-15,y-21,30,5,GOLD);
}
function flame(c,x,y,color='#ffc96e'){
 rect(c,x-2,y-18,5,16,color);rect(c,x-5,y-10,9,10,'#f07135');
 rect(c,x-2,y-8,3,9,'#fff3b2');rect(c,x+3,y-14,3,11,color);
}
function brazier(c,x=80,y=148,blue=false){
 cube(c,x,y,45,25);
 poly(c,[[x-27,y-29],[x,y-40],[x+28,y-29],[x,y-17]],'#292a2f',GOLD);
 flame(c,x,y-33,blue?'#39d4fc':'#fcbf5a');
}
function statue(c,x=80,y=148,kind=0){
 cube(c,x,y,86,19);
 rect(c,x-21,y-86,45,53,kind?'#51545b':'#b38653');
 rect(c,x-14,y-101,31,20,kind?'#747582':'#d3ab6e');
 poly(c,[[x-17,y-99],[x-26,y-120],[x-6,y-104]],'#94764b');
 poly(c,[[x+9,y-99],[x+26,y-121],[x+19,y-94]],'#a38256');
 rect(c,x+5,y-88,5,4,LAPIS);
 rect(c,x-15,y-47,33,5,GOLD);
}
function palm(c,x=80,y=145){
 shadow(c,x,y,55,14);
 line(c,[[x,y-6],[x+4,y-38],[x-1,y-80],[x+8,y-103]],'#805037',12);
 for(let j=0;j<9;j++){const a=j*Math.PI*2/9;line(c,[[x+8,y-106],
 [x+8+Math.cos(a)*27,y-105+Math.sin(a)*19]],j%2?'#5c754a':'#879751',7);}
}
function banner(c,x=80,y=148){
 rect(c,x-28,y-112,6,105,'#866340');rect(c,x+27,y-112,6,105,'#866340');
 rect(c,x-35,y-118,73,7,GOLD);
 poly(c,[[x-22,y-108],[x+25,y-108],[x+22,y-51],[x+7,y-67],[x-2,y-49],[x-21,y-61]],'#2c6b79',GOLD);
 emblem(c,x,y-86,.88,GOLD);
}
function altar(c,x=80,y=148,flameTop=false){
 cube(c,x,y,89,42);
 diamond(c,x,y-61,41,17,'#3c5258',GOLD);
 emblem(c,x,y-62,.8,GOLD);
 if(flameTop)flame(c,x,y-70,'#46d1df');
}
function rubble(c,x=80,y=148,variant=0){
 shadow(c,x,y,90,13);
 for(let j=0;j<10;j++){
 const xx=x-38+(H(j,variant)*77)|0,yy=y-7-(H(j+2,variant)*13)|0;
 poly(c,[[xx-8,yy],[xx-2,yy-10],[xx+9,yy-7],[xx+11,yy+1]],
  STONE[(j+variant)%STONE.length],'#554637');
 }
}
function trap(c,x=80,y=148,variant=0){
 shadow(c,x,y+3,90,13);
 diamond(c,x,y-11,48,19,'#564a3e',GOLD);
 diamond(c,x,y-11,32,12,variant%2?'#a67443':'#245d6e',GOLD);
 for(let j=0;j<6;j++)rect(c,x-24+j*8,y-13+(j%2)*4,3,4,'#2d292b');
}
function templeProp(c,name,index) {
 const cx=80,y=151;const kind=index;
 if([0,8,32].includes(kind))obelisk(c,cx,y,kind===32);
 else if([1,6,13,14].includes(kind))statue(c,cx,y,kind===1||kind===6);
 else if([2,3,12,16].includes(kind))altar(c,cx,y,kind===3);
 else if([4,19,34].includes(kind)){urn(c,65,y);if(kind!==4)urn(c,104,y-2,'#b58b59');}
 else if([5,20,33].includes(kind))coffin(c);
 else if([7,24].includes(kind))column(c,cx,y,kind===24);
 else if([10,11,15,31,38].includes(kind))brazier(c,cx,y,[11,38].includes(kind));
 else if([17,18,21,25,35,37].includes(kind))rubble(c,cx,y,kind);
 else if([22,23,29,30,36].includes(kind))trap(c,cx,y,kind);
 else if([26,27,39].includes(kind))banner(c,cx,y);
 else if(kind===28)palm(c,cx,y);
 else if([9,18].includes(kind)){cube(c,cx,y,70,40);emblem(c,cx,y-25,.5,LAPIS);}
 else if(kind===32)obelisk(c,cx,y,true);
 else altar(c,cx,y,kind%2===0);
 // Varied pearl/enamel settings tie props to the same gold and lapis materials
 if(kind%3===0){rect(c,cx-3,121,6,5,'#37b3b7');rect(c,cx-2,122,2,2,'#d9f8f3');}
}
function scatterAtlas(meta) {
 const cell=166,canvas=makeCanvas(cell*8,cell*5),c=canvas.getContext('2d');
 c.imageSmoothingEnabled=false;
 meta.scatter=TEMPLE_PROPS.map((name,i)=>{
  const x=(i%8)*cell,y=Math.floor(i/8)*cell;
  c.save();c.translate(x,y);templeProp(c,name,i);c.restore();
  return {name,x,y,w:160,h:160,ox:-80,oy:-151,
    fp:WALKOVER.has(name)?0.28:0.64,block:!WALKOVER.has(name)};
 });
 return canvas;
}
/** Produces a complete biome-pack contract while preserving the original template
 * wall/arch/door connection masks and precise depth ordering. No network fetches.
 */
export function generateDesertTemplePack(base){
 const meta=JSON.parse(JSON.stringify(base.meta));
 meta.pack='Desert Temple — the Sunless Dynasty';
 meta.floors.forEach((f,i)=>{
  f.name=i<10?['sunlit_sandstone','ancient_limestone','ruined_basalt','golden_flagstones',
   'dusty_courtyard','bleached_masonry','terracotta_slab','buried_paving','obsidian_paving',
   'lapis_tesserae'][i]:'temple_relief_'+String(i-9).padStart(2,'0');
  f.lum=[.51,.63,.36,.55,.44,.62,.49,.46,.27,.38][i%10];
 });
 const rename=(obj,names)=>Object.fromEntries(Object.entries(obj).map(([key,val],i)=>[names[i]||key,val]));
 meta.walls=rename(meta.walls,TEMPLE_FAMILIES);
 meta.arches=rename(meta.arches,TEMPLE_ARCHES);
 meta.doors=rename(meta.doors,TEMPLE_DOORS);
 meta.archSpan=Object.fromEntries(Object.keys(meta.arches).map(k=>[k,3]));
 return {floors:floorAtlas(meta),walls:stoneWalls(base.walls,meta),
   scatter:scatterAtlas(meta),meta};
}
