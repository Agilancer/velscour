// HELL: procedural infernal art pack for VELSCOUR's isometric indoor dungeon.
// The existing sliced architecture defines only geometry/occlusion/door hinges;
// all infernal materials, flooring, sculpture, and decals below are generated here.
// 160x80 isometric tiles; 160x160 prop cells (pivot 80,151); no build step.
import { makeCanvas } from '../core/util.js';

export const HELL_WALLS = ['brimstone_ashlar','obsidian_citadel','bone_cathedral','blood_foundry','damned_sanctum'];
export const HELL_ARCHES = ['maw_of_ashes','horned_gate','infernal_triumph'];
export const HELL_DOORS = ['blackiron_gate','hellforged_seal','bone_prison'];
export const HELL_PROPS = [
  'skull_obelisk','soul_obelisk','hellfire_brazier','balefire_brazier','bloodfire_brazier',
  'lava_vent','lava_pool','magma_rock','obsidian_spires','brimstone_boulders',
  'horned_demon_statue','fallen_angel_statue','bone_pillar','blackiron_pillar','cracked_pillar',
  'soul_cage','chain_torture_rack','chain_heap','spiked_iron_cage','blood_altar',
  'sacrificial_slab','hellforge_anvil','demonic_anvil','soul_furnace','bone_throne',
  'flayed_banner','infernal_standard','blasphemous_reliquary','infernal_sarcophagus','spiked_coffin',
  'cursed_tome','ashen_urn','skull_pile','bone_heap','charred_remains',
  'rune_circle','pentacle_seal','smoldering_rubble','ash_pile','obsidian_relic',
];
const WALK_OVER = new Set(['lava_vent','lava_pool','chain_heap','skull_pile','bone_heap',
  'charred_remains','rune_circle','pentacle_seal','smoldering_rubble','ash_pile']);
const C={black:'#17131c',iron:'#404047',steel:'#787174',ash:'#78685f',rock:'#55434a',
  dark:'#301d29',red:'#a22a26',blood:'#7d171d',crimson:'#e74725',
  flame:'#ff932d',yellow:'#ffd769',bone:'#d0bba0',hot:'#ffed9a',
  violet:'#b355d2',rift:'#622c73',obsidian:'#20212b'};
function hash(x,y,k=0){
  let n=(Math.imul(x+19,374761393)+Math.imul(y+23,668265263)+Math.imul(k+17,1274126177))|0;
  n=Math.imul((n^(n>>>13)),1274126177);
  return ((n^(n>>>16))>>>0)/4294967296;
}
const rect=(g,x,y,w,h,color)=>{g.fillStyle=color;g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
function poly(g,points,fill,stroke){
  g.beginPath();g.moveTo(points[0][0],points[0][1]);
  for(let i=1;i<points.length;i++)g.lineTo(points[i][0],points[i][1]);
  g.closePath();g.fillStyle=fill;g.fill();
  if(stroke){g.lineWidth=1.8;g.strokeStyle=stroke;g.stroke();}
}
function line(g,points,color,width=2){
  g.beginPath();g.moveTo(points[0][0],points[0][1]);
  for(let i=1;i<points.length;i++)g.lineTo(points[i][0],points[i][1]);
  g.lineWidth=width;g.strokeStyle=color;g.stroke();
}
function diamond(g,x,y,rx,ry,fill,outline){
  poly(g,[[x,y-ry],[x+rx,y],[x,y+ry],[x-rx,y]],fill,outline);
}
function sigil(g,x,y,scale=1,tint=C.flame){
  const s=scale;
  line(g,[[x-12*s,y-3*s],[x+11*s,y-3*s],[x,y+12*s],[x-12*s,y-3*s]],tint,2*s);
  line(g,[[x-9*s,y+9*s],[x+9*s,y+9*s],[x,y-11*s],[x-9*s,y+9*s]],tint,2*s);
  rect(g,x-2*s,y-2*s,4*s,4*s,C.hot);
}
function flame(g,x,y,scale=1,violet=false){
  const f=violet?C.violet:C.crimson,mid=violet?'#cf89fa':C.flame;
  poly(g,[[x-6*scale,y],[x-10*scale,y-12*scale],[x-3*scale,y-19*scale],
    [x-1*scale,y-34*scale],[x+7*scale,y-18*scale],[x+10*scale,y-10*scale],
    [x+6*scale,y]],f);
  poly(g,[[x-4*scale,y],[x-4*scale,y-9*scale],[x+2*scale,y-24*scale],
    [x+6*scale,y-7*scale],[x+4*scale,y]],mid);
  rect(g,x-2*scale,y-9*scale,4*scale,7*scale,C.hot);
}
function floorCell(g,id){
  const x=(id%10)*162,y=Math.floor(id/10)*82,m=id%10;
  const palette=[
    ['#4a3638','#71514a'],['#3a2a32','#665057'],['#382f37','#58474b'],
    ['#5e322e','#84493a'],['#4d3d39','#7a5c50'],['#45333b','#72555d'],
    ['#29202a','#514047'],['#56312f','#8a4b37'],['#201d28','#49414b'],
    ['#4c252d','#802c33'],
  ];
  g.save();g.translate(x,y);
  g.beginPath();g.moveTo(80,0);g.lineTo(160,40);g.lineTo(80,80);g.lineTo(0,40);g.closePath();g.clip();
  rect(g,0,0,160,80,palette[m][0]);
  // Keep repeating floor-tile material borders identical: all grout,
  // tesserae, cracks, and lava ornamentation are inset inside the rhombus.
  g.save();g.beginPath();g.moveTo(80,8);g.lineTo(144,40);g.lineTo(80,72);g.lineTo(16,40);g.closePath();g.clip();
  for(let v=-30;v<110;v+=17)for(let u=-40;u<200;u+=34){
    const xx=u+((Math.floor(v/17)&1)*17),rr=hash(xx,v,m);
    if(m===3||m===7||m===9){
      diamond(g,xx,v,15,8,rr>.65?'#9d4330':'#593138','#38272c');
    }else{
      diamond(g,xx,v,15,8,rr>.55?palette[m][1]:palette[m][0],'rgba(10,5,12,.2)');
    }
    if((m===3||m===7)&&rr>.59){
      line(g,[[xx-8,v],[xx-1,v+3],[xx+5,v-2],[xx+11,v]],C.flame,2);
    }
  }
  for(let i=0;i<32;i++){
    const xx=21+Math.floor(hash(i,m,1)*119),yy=14+Math.floor(hash(i,m,2)*52);
    if(hash(i,m,3)>.73)rect(g,xx,yy,3,2,m%2?C.ash:C.crimson);
  }
  if(id>=10){
    const t=id%10;
    if(t===0||t===5){
      diamond(g,80,40,25,12,C.obsidian,C.flame);sigil(g,80,40,.55,C.crimson);
    }else if(t===1||t===6){
      diamond(g,80,40,27,14,'#311b2b',C.bone);
      diamond(g,80,40,15,8,C.blood,C.flame);
    }else if(t===2){
      line(g,[[47,41],[60,29],[78,42],[91,32],[114,41]],'#1d1925',4);
      line(g,[[60,30],[58,21]],C.crimson,2);
    }else if(t===3){
      diamond(g,80,40,33,17,'#1e1825',C.ash);
      for(let i=0;i<4;i++)flame(g,62+i*13,45,0.25);
    }else if(t===4){
      for(let i=0;i<5;i++)rect(g,54+i*12,28+(i%2)*5,4,20,C.bone);
    }else if(t===7){
      diamond(g,80,40,32,17,C.blood,C.flame);
      sigil(g,80,41,.67,C.hot);
    }else if(t===8){
      for(let i=0;i<5;i++)diamond(g,53+i*13,37+i%2*6,5,4,C.obsidian,C.ash);
    }else{
      poly(g,[[57,41],[66,30],[83,37],[98,29],[109,43],[81,55]],'#802d23',C.flame);
    }
  }
  g.restore();g.restore();
}
function floors(){
  const canvas=makeCanvas(1620,492),g=canvas.getContext('2d');
  g.imageSmoothingEnabled=false;
  for(let i=0;i<60;i++)floorCell(g,i);
  return canvas;
}
function architecture(original){
  const canvas=makeCanvas(original.width,original.height),g=canvas.getContext('2d',{willReadFrequently:true});
  g.drawImage(original,0,0);
  const data=g.getImageData(0,0,canvas.width,canvas.height),p=data.data,W=canvas.width;
  for(let i=0;i<p.length;i+=4){
    if(!p[i+3])continue;
    const n=i/4,x=n%W,y=Math.floor(n/W);
    const l=(.29*p[i]+.58*p[i+1]+.13*p[i+2])/255;
    const v=Math.max(0,Math.min(1,l*.83+.10+(hash(x>>2,y>>2,13)-.5)*.12));
    const seam=(y%47<2)||((x+Math.floor(y/25)*16)%63<2&&y%47<42);
    const gilded=y%116>=90&&y%116<96&&l>.23;
    const ember=y%116>=101&&y%116<105&&l>.20;
    const noise=hash(x>>3,y>>3,21)>.978;
    const factor=seam?.63:1;
    p[i]=Math.round((gilded?171:ember?246:noise?184:23+108*v)*factor);
    p[i+1]=Math.round((gilded?108:ember?69:noise?72:18+63*v)*factor);
    p[i+2]=Math.round((gilded?65:ember?24:noise?63:25+56*v)*factor);
  }
  g.putImageData(data,0,0);
  // Engraved bone/lava relief only inside geometry's existing alpha.
  g.save();g.globalCompositeOperation='source-atop';g.globalAlpha=.3;
  for(let y=35;y<canvas.height;y+=83)for(let x=46;x<canvas.width;x+=112){
    if(hash(x,y,7)>.5)sigil(g,x,y,.7,C.flame);
    else{
      line(g,[[x-9,y-4],[x-2,y+4],[x+6,y-2],[x+13,y+5]],C.crimson,3);
      rect(g,x-3,y-10,6,4,C.bone);
    }
  }
  g.restore();
  return canvas;
}
function shadow(g,x,y,rx=43,ry=9){
  g.save();g.beginPath();g.ellipse(x,y,rx,ry,0,0,Math.PI*2);
  g.fillStyle='rgba(4,1,7,.46)';g.fill();g.restore();
}
function plinth(g,x=80,y=148,w=84,h=28){
  shadow(g,x,y+2,w*.58);
  poly(g,[[x-w/2,y-h],[x,y-h-13],[x+w/2,y-h],[x,y-h+10]],'#615157','#241c27');
  poly(g,[[x-w/2,y-h],[x,y-h+10],[x,y],[x-w/2,y-12]],'#332632','#160f1b');
  poly(g,[[x,y-h+10],[x+w/2,y-h],[x+w/2,y-12],[x,y]],'#4a2b33','#160f1b');
  line(g,[[x-w*.4,y-h],[x,y-h+8],[x+w*.4,y-h]],C.crimson,2);
}
function skull(g,x,y,s=1){
  rect(g,x-11*s,y-20*s,22*s,19*s,C.bone);
  rect(g,x-8*s,y-3*s,16*s,8*s,'#b6a18b');
  rect(g,x-7*s,y-10*s,5*s,5*s,C.black);
  rect(g,x+3*s,y-10*s,5*s,5*s,C.black);
  rect(g,x-2*s,y-5*s,4*s,3*s,C.ash);
  for(let i=0;i<4;i++)rect(g,x-6*s+i*4*s,y+1*s,2*s,4*s,C.black);
}
function horn(g,x,y,len=32,side=1){
  poly(g,[[x-7*side,y],[x+9*side,y],[x+13*side,y-len*.57],
    [x+4*side,y-len]],C.bone,'#5f4a42');
}
function infernalObelisk(g,x=80,y=148,style=0){
  plinth(g,x,y,62,20);
  poly(g,[[x-20,y-25],[x,y-36],[x,y-118],[x-20,y-104]],style?C.rock:C.obsidian,C.black);
  poly(g,[[x,y-36],[x+20,y-26],[x+20,y-105],[x,y-118]],'#59404a',C.black);
  poly(g,[[x-20,y-104],[x,y-137],[x+20,y-105],[x,y-118]],C.bone,C.crimson);
  for(let i=0;i<4;i++)sigil(g,x+10,y-48-i*16,.25,style?C.violet:C.flame);
}
function infernalBrazier(g,x=80,y=148,style=0){
  plinth(g,x,y,55,31);
  diamond(g,x,y-39,29,10,C.iron,C.bone);
  flame(g,x,y-44,1.6,style===1);
  if(style===2)flame(g,x+10,y-52,.7);
}
function stonePile(g,x=80,y=148,style=0){
  shadow(g,x,y,47);
  for(let i=0;i<12;i++){
    const xx=x-40+hash(i,style,6)*80, yy=y-4-hash(i,style,7)*20;
    poly(g,[[xx-11,yy],[xx-5,yy-13],[xx+8,yy-7],[xx+12,yy+2]],
      [C.obsidian,C.rock,'#774439',C.ash][(style+i)%4],C.black);
  }
}
function lavaPool(g,x=80,y=148,style=0){
  shadow(g,x,y,54);
  diamond(g,x,y-8,53,22,C.obsidian,C.rock);
  diamond(g,x,y-9,42,15,style?C.blood:C.crimson,C.flame);
  line(g,[[x-32,y-7],[x-14,y-14],[x+3,y-7],[x+17,y-13],[x+35,y-7]],C.hot,3);
}
function tower(g,x=80,y=148,style=0){
  plinth(g,x,y,70,19);
  rect(g,x-21,y-113,42,88,style?C.ash:C.iron);
  rect(g,x-22,y-118,48,12,C.rock);
  rect(g,x-19,y-126,43,8,C.bone);
  rect(g,x-19,y-111,7,78,C.dark);
  rect(g,x+13,y-111,7,78,C.black);
  for(let i=0;i<4;i++)line(g,[[x-19,y-94+i*18],[x+19,y-94+i*18]],C.red,2);
  sigil(g,x,y-69,.5,C.flame);
  if(style)horn(g,x-21,y-123,31,-1);
}
function demonStatue(g,x=80,y=148,angel=false){
  plinth(g,x,y,90,23);
  rect(g,x-21,y-96,43,63,angel?C.ash:C.rock);
  rect(g,x-14,y-110,29,19,C.bone);
  horn(g,x-16,y-104,39,-1);horn(g,x+17,y-104,38,1);
  rect(g,x-9,y-103,7,3,C.crimson);rect(g,x+5,y-103,7,3,C.crimson);
  poly(g,[[x-22,y-88],[x-47,y-117],[x-38,y-55],[x-22,y-46]],
    angel?'#948478':'#44303a',C.black);
  poly(g,[[x+21,y-88],[x+48,y-118],[x+39,y-55],[x+22,y-46]],
    angel?'#978c8a':'#30202d',C.black);
  rect(g,x-21,y-43,43,7,C.red);
}
function boneAltar(g,x=80,y=148,style=0){
  plinth(g,x,y,105,45);
  diamond(g,x,y-57,42,16,style?C.blood:C.obsidian,C.bone);
  sigil(g,x,y-56,.9,style?C.violet:C.crimson);
  skull(g,x-26,y-52,.55);skull(g,x+27,y-51,.55);
}
function sarcophagus(g,x=80,y=148,style=0){
  plinth(g,x,y,105,37);
  poly(g,[[x-40,y-38],[x+2,y-62],[x+43,y-41],[x+38,y-14],
    [x-11,y-2],[x-43,y-16]],style?C.blood:C.rock,C.bone);
  diamond(g,x,y-36,23,11,C.obsidian,C.flame);
  sigil(g,x,y-35,.5,C.hot);
}
function soulCage(g,x=80,y=148,style=0){
  plinth(g,x,y,71,19);
  rect(g,x-26,y-99,6,73,C.iron);rect(g,x+21,y-99,6,73,C.iron);
  rect(g,x-23,y-101,48,6,C.bone);rect(g,x-21,y-33,43,7,C.red);
  for(let i=0;i<5;i++)rect(g,x-18+i*9,y-97,3,62,C.ash);
  flame(g,x,y-44,.8,style===1);
}
function chainPile(g,x=80,y=148){
  shadow(g,x,y,43);
  for(let i=0;i<17;i++){
    const xx=x-33+(i*17)%67,yy=y-9-((i*7)%25);
    g.beginPath();g.ellipse(xx,yy,8,4,i*.49,0,Math.PI*2);
    g.strokeStyle=i%3?C.iron:C.ash;g.lineWidth=3;g.stroke();
  }
}
function hellforge(g,x=80,y=148,style=0){
  plinth(g,x,y,98,27);
  poly(g,[[x-31,y-48],[x+1,y-63],[x+39,y-48],[x+28,y-26],
    [x-24,y-26]],style?C.rock:C.iron,C.bone);
  rect(g,x-13,y-59,28,5,C.red);flame(g,x+3,y-64,.65);
}
function boneHeap(g,x=80,y=148,style=0){
  shadow(g,x,y,48);
  for(let i=0;i<10;i++){
    const xx=x-40+i*9,yy=y-11-(i%3)*8;
    rect(g,xx,yy,20,5,C.bone);rect(g,xx-3,yy-3,5,10,C.ash);
  }
  if(style)skull(g,x+11,y-13,.55);
}
function standard(g,x=80,y=148,style=0){
  rect(g,x-31,y-126,6,116,C.iron);rect(g,x+25,y-126,6,116,C.iron);
  rect(g,x-38,y-131,79,6,C.bone);
  poly(g,[[x-25,y-121],[x+25,y-121],[x+23,y-58],
    [x+10,y-70],[x-2,y-50],[x-25,y-65]],style?C.rift:C.blood,C.flame);
  sigil(g,x,y-93,.83,style?C.violet:C.hot);
}
function skullUrn(g,x=80,y=148,style=0){
  shadow(g,x,y,30);
  poly(g,[[x-13,y-57],[x-24,y-39],[x-21,y-13],
    [x,y-3],[x+21,y-13],[x+25,y-39],[x+12,y-57]],style?C.bone:C.rock,C.ash);
  rect(g,x-16,y-62,32,8,C.iron);rect(g,x-10,y-65,21,5,C.bone);
  sigil(g,x,y-34,.55,C.flame);
}
function drawProp(g,i){
  const x=80,y=151;
  if([0,1,39].includes(i))infernalObelisk(g,x,y,i%2);
  else if([2,3,4].includes(i))infernalBrazier(g,x,y,i-2);
  else if([5,6].includes(i))lavaPool(g,x,y,i-5);
  else if([7,8,9,37].includes(i))stonePile(g,x,y,i);
  else if([10,11].includes(i))demonStatue(g,x,y,i===11);
  else if([12,13,14].includes(i))tower(g,x,y,i%2);
  else if([15,16,18,23].includes(i))soulCage(g,x,y,i%2);
  else if(i===17)chainPile(g,x,y);
  else if([19,20,27,36].includes(i))boneAltar(g,x,y,i%2);
  else if([21,22].includes(i))hellforge(g,x,y,i%2);
  else if([24,28,29].includes(i))sarcophagus(g,x,y,i%2);
  else if([25,26].includes(i))standard(g,x,y,i%2);
  else if([30,31].includes(i)){skullUrn(g,59,y,i%2);if(i===31)skullUrn(g,103,y,1);}
  else if([32,33,34].includes(i))boneHeap(g,x,y,i%2);
  else if([35].includes(i)){plinth(g,x,y,80,15);sigil(g,x,y-28,1.2,C.crimson);}
  else if([38].includes(i))stonePile(g,x,y,i);
  else infernalObelisk(g,x,y,1);
  // Each item has a local unique ornament; no atlas cells are duplicated.
  if(i%3===0)rect(g,x+14,y-28,5,4,i%2?C.violet:C.flame);
  if(i%4===1)sigil(g,x-21,y-39,.25,C.hot);
}
function props(meta){
  const cell=166,canvas=makeCanvas(cell*8,cell*5),g=canvas.getContext('2d');
  g.imageSmoothingEnabled=false;
  meta.scatter=HELL_PROPS.map((name,i)=>{
    const x=(i%8)*cell,y=Math.floor(i/8)*cell;
    g.save();g.translate(x,y);drawProp(g,i);g.restore();
    return {name,x,y,w:160,h:160,ox:-80,oy:-151,
      fp:WALK_OVER.has(name)?0.28:0.64,block:!WALK_OVER.has(name)};
  });
  return canvas;
}
/** The returned pack matches tools/biomepack.py's entire runtime schema.
 * It reuses only topology and alpha silhouettes (wall arms, hinged doors,
 * arches); geometry stays compatible with all character/monster collision.
 */
export function generateHellPack(base){
  const meta=JSON.parse(JSON.stringify(base.meta));
  meta.pack='HELL — The Infernal Dominion';
  const mats=['brimstone_pavers','ironblood_flagstone','obsidian_tiles',
    'lava_scabbed_stone','ash_crypt_masonry','bone_dust_bricks',
    'blackiron_stone','molten_cracks','void_basalt','blood_ritual_slabs'];
  meta.floors.forEach((f,i)=>{
    f.name=i<10?mats[i]:'hell_relic_'+String(i-9).padStart(2,'0');
    f.lum=[.23,.18,.17,.27,.22,.24,.13,.30,.12,.19][i%10];
  });
  const replace=(obj,names)=>Object.fromEntries(Object.entries(obj).map(([k,v],i)=>[names[i]||k,v]));
  meta.walls=replace(meta.walls,HELL_WALLS);
  meta.arches=replace(meta.arches,HELL_ARCHES);
  meta.doors=replace(meta.doors,HELL_DOORS);
  return {floors:floors(),walls:architecture(base.walls),scatter:props(meta),meta};
}
