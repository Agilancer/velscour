// Ice Temple: complete procedural Canvas dungeon art, built on the existing 160x80
// iso tile geometry and depth-sliced architecture. No atlas imports or build step.
import { makeCanvas } from '../core/util.js';

export const ICE_TEMPLE_FAMILIES = [
  'hoarfrost_ashlar', 'glacier_buttresses', 'winter_reliquary',
  'aurora_sanctum', 'blackice_citadel',
];
export const ICE_TEMPLE_ARCHES = ['frost_lancet', 'crystal_triumph', 'winter_gate'];
export const ICE_TEMPLE_DOORS = ['glacial_bronze', 'icebound_oak', 'aurora_seal'];
export const ICE_TEMPLE_PROPS = [
  'frost_obelisk', 'shattered_frost_obelisk', 'crystal_cluster', 'blue_crystal_cluster',
  'amethyst_crystal_cluster', 'frozen_priest_statue', 'winter_queen_statue', 'ice_gargoyle',
  'icebound_column', 'shattered_column', 'frost_sarcophagus', 'opened_ice_tomb',
  'frozen_offering_altar', 'aurora_shrine', 'runic_pedestal', 'ancient_ice_urn',
  'frozen_urn_cluster', 'winter_brazier', 'azure_brazier', 'violet_brazier',
  'frost_lantern', 'icicle_chandelier', 'hanging_icicles', 'fallen_ice_spires',
  'ice_rubble', 'snow_drift', 'frosted_skull_heap', 'frozen_skeleton',
  'frost_lotus_font', 'dark_reflection_pool', 'ancient_rune_tablet', 'runic_dais',
  'glacial_throne', 'snowbound_reliquary', 'crystal_heart', 'broken_ice_mirror',
  'aurora_banner', 'frost_banner', 'glowing_rune_circle', 'frozen_chest',
];
const WALKOVER = new Set([
  'ice_rubble', 'snow_drift', 'frosted_skull_heap', 'frozen_skeleton',
  'dark_reflection_pool', 'hanging_icicles', 'glowing_rune_circle',
]);
const COLORS = {
  ice:'#9acddc', light:'#e1faff', deep:'#376b91', glacial:'#6ab5d0',
  dark:'#192e49', edge:'#b9e5ed', steel:'#59788d', blue:'#38d7f3',
  violet:'#a59cfa', gold:'#c9c5a6', shadow:'#0c1b31',
};
function rand(x,y,s=0){
  let n=Math.imul(x+101,374761393)+Math.imul(y+577,668265263)+Math.imul(s+19,1274126177);
  n=Math.imul((n^(n>>>13)),1274126177);
  return ((n^(n>>>16))>>>0)/4294967296;
}
const rect=(c,x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
function poly(c,pts,fill,stroke=null){
  c.beginPath();c.moveTo(pts[0][0],pts[0][1]);
  for(let i=1;i<pts.length;i++)c.lineTo(pts[i][0],pts[i][1]);
  c.closePath();c.fillStyle=fill;c.fill();
  if(stroke){c.lineWidth=1.5;c.strokeStyle=stroke;c.stroke();}
}
function stroke(c,pts,color,width=2){
  c.beginPath();c.moveTo(pts[0][0],pts[0][1]);
  for(let i=1;i<pts.length;i++)c.lineTo(pts[i][0],pts[i][1]);
  c.lineWidth=width;c.strokeStyle=color;c.stroke();
}
function rhombus(c,x,y,rx,ry,col,outline){
  poly(c,[[x,y-ry],[x+rx,y],[x,y+ry],[x-rx,y]],col,outline);
}
function rune(c,x,y,scale=1,color=COLORS.blue){
  const s=scale;
  stroke(c,[[x-9*s,y-8*s],[x+8*s,y+8*s],[x+4*s,y-10*s],[x-6*s,y+5*s]],color,2*s);
  stroke(c,[[x-10*s,y],[x+10*s,y]],color,2*s);
  rect(c,x-2*s,y-2*s,4*s,4*s,COLORS.light);
}
function snowflake(c,x,y,size=9,col=COLORS.edge){
  for(let j=0;j<3;j++){
    const a=j*Math.PI/3,dx=Math.cos(a)*size,dy=Math.sin(a)*size;
    stroke(c,[[x-dx,y-dy],[x+dx,y+dy]],col,1.5);
  }
  rect(c,x-2,y-2,4,4,col);
}
function iceShard(c,x,y,w,h,col=COLORS.glacial,lit=COLORS.light){
  poly(c,[[x-w*.4,y-h*.16],[x-w*.2,y-h*.86],[x,y-h],[x+w*.44,y-h*.70],
    [x+w*.52,y-h*.10],[x,y]],col,COLORS.dark);
  poly(c,[[x-w*.2,y-h*.86],[x,y-h],[x,y],[x-w*.33,y-h*.12]],lit);
  poly(c,[[x,y-h],[x+w*.44,y-h*.7],[x+w*.52,y-h*.10],[x,y]],COLORS.deep);
  stroke(c,[[x,y-h*.86],[x+1,y-h*.11]],'#c5f3fd',1.5);
}
function shadow(c,x,y,rx,ry=8){
  c.save();c.fillStyle='rgba(6,14,34,.4)';c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();c.restore();
}
function floorCell(c,i){
  const X=(i%10)*162,Y=Math.floor(i/10)*82;
  const cols=[
    ['#8daebb','#c3dbe1'],['#a7c3ca','#e2f4f6'],['#546b83','#7798a8'],
    ['#6b98aa','#c1e2e7'],['#667d8f','#a7bcc6'],['#bacdd2','#e3eff1'],
    ['#566581','#929cb2'],['#7199ac','#cadde5'],['#263852','#526d8b'],
    ['#446375','#8dc9d1'],
  ];
  const palette=cols[i%10],base=palette[0],light=palette[1];
  c.save();c.translate(X,Y);
  c.beginPath();c.moveTo(80,0);c.lineTo(160,40);c.lineTo(80,80);c.lineTo(0,40);c.closePath();c.clip();
  rect(c,0,0,160,80,base);
  // The center design is deliberately inset from tile edges. The same frozen
  // stone material therefore repeats without a material discontinuity.
  c.save();c.beginPath();c.moveTo(80,7);c.lineTo(146,40);c.lineTo(80,73);c.lineTo(14,40);c.closePath();c.clip();
  const material=i%10;
  if(material===0||material===1||material===3||material===5){
    for(let y=-25;y<110;y+=18)for(let x=-22;x<190;x+=28){
      const xx=x+((Math.floor(y/18)&1)?14:0),r=rand(xx,y,i);
      rhombus(c,xx,y,12,7,r>.5?light:'#759eab','rgba(22,40,59,.18)');
    }
  }else if(material===2||material===6||material===8){
    for(let y=-15;y<105;y+=21)for(let x=-22;x<190;x+=42){
      poly(c,[[x+1,y-8],[x+40,y-8],[x+40,y+9],[x+1,y+9]],
        rand(x,y,i)>.5?light:base,'rgba(10,32,54,.16)');
    }
  }else{
    for(let y=0;y<95;y+=14)for(let x=-10;x<180;x+=22){
      if(rand(x,y,i)>.3)rhombus(c,x,y,7,4,light,'rgba(31,66,79,.2)');
    }
  }
  // Hairline frost veins and tiny crystalline glints.
  for(let n=0;n<44;n++){
    const x=20+Math.floor(rand(n,i,3)*120),y=14+Math.floor(rand(n,i,4)*51);
    if(n%3===0)rect(c,x,y,3,1,'rgba(232,253,255,.45)');
    else if(n%3===1)rect(c,x,y,2,2,'rgba(8,35,64,.15)');
  }
  if(i>=10){
    const feature=i%8;
    if(feature===0||feature===4){
      rhombus(c,80,40,28,14,COLORS.dark,COLORS.edge);
      rhombus(c,80,40,20,10,COLORS.deep,COLORS.blue);rune(c,80,39,.7,COLORS.light);
    }else if(feature===1){
      snowflake(c,80,40,14,'#e5fbff');
      snowflake(c,56,42,7,COLORS.glacial);snowflake(c,103,39,7,COLORS.glacial);
    }else if(feature===2){
      stroke(c,[[45,42],[61,33],[75,44],[90,31],[106,41],[119,35]],COLORS.dark,3);
      stroke(c,[[60,32],[57,22]],COLORS.edge,2);
    }else if(feature===3){
      for(let n=0;n<5;n++)iceShard(c,59+n*11,50+(n%2)*3,10,17+n%3*4,'#78b6d0');
    }else if(feature===5){
      rhombus(c,80,41,27,14,'#202d47',COLORS.edge);
      snowflake(c,80,40,12,COLORS.blue);
    }else if(feature===6){
      poly(c,[[58,33],[70,28],[98,35],[109,44],[93,53],[68,50]],'#354f6d',COLORS.light);
      stroke(c,[[63,37],[102,42]],COLORS.blue,2);
    }else{
      for(let n=0;n<5;n++){const x=52+n*13;rect(c,x,31+(n%2)*5,6,15,COLORS.edge);}
      rune(c,80,43,.4,COLORS.blue);
    }
  }
  c.restore();c.restore();
}
function floorAtlas(){
  const canvas=makeCanvas(1620,492),c=canvas.getContext('2d');
  c.imageSmoothingEnabled=false;
  for(let i=0;i<60;i++)floorCell(c,i);
  return canvas;
}
function frostArchitecture(original){
  // Recolor structural source at its own resolution. This keeps precise pixel
  // coverage and all previously validated per-arm/arch/door depth masks.
  const canvas=makeCanvas(original.width,original.height);
  const c=canvas.getContext('2d',{willReadFrequently:true});
  c.drawImage(original,0,0);
  const data=c.getImageData(0,0,canvas.width,canvas.height),p=data.data,W=canvas.width;
  for(let i=0;i<p.length;i+=4){
    if(!p[i+3])continue;
    const k=i/4,x=k%W,y=Math.floor(k/W);
    const lum=(p[i]*.3+p[i+1]*.55+p[i+2]*.15)/255;
    const v=Math.max(0,Math.min(1,lum*.79+.16+(rand(x>>2,y>>2,4)-.5)*.10));
    const joint=((x+Math.floor(y/34)*14)%54<2)||(y%52<2);
    const colorBand=y%112>=90&&y%112<95&&lum>.2;
    const aurora=y%112>=101&&y%112<105&&lum>.24;
    const crack=rand(x>>3,y>>3,13)>.969;
    const scale=joint?.75:1;
    p[i]=Math.round((colorBand?164:aurora?67:crack?216:41+119*v)*scale);
    p[i+1]=Math.round((colorBand?226:aurora?209:crack?246:69+145*v)*scale);
    p[i+2]=Math.round((colorBand?241:aurora?237:crack?255:102+151*v)*scale);
  }
  c.putImageData(data,0,0);
  // Engrave runes/frost ridges INSIDE the original sprite masks only.
  // Do not paint outside the source walls: occlusion and door hinges stay exact.
  c.save();c.globalCompositeOperation='source-atop';c.globalAlpha=.30;
  for(let y=29;y<canvas.height;y+=81)for(let x=35;x<canvas.width;x+=109){
    if(rand(x,y,15)>.43)rune(c,x,y,.5,COLORS.blue);
    else snowflake(c,x,y,7,COLORS.light);
  }
  c.restore();
  return canvas;
}
function block(c,x,y,w=73,h=32){
  shadow(c,x,y+2,w*.57,8);
  poly(c,[[x-w*.5,y-h],[x,y-h-14],[x+w*.5,y-h],[x,y-h+10]],'#c4e4eb',COLORS.dark);
  poly(c,[[x-w*.5,y-h],[x,y-h+10],[x,y],[x-w*.5,y-11]],'#698b9d',COLORS.dark);
  poly(c,[[x,y-h+10],[x+w*.5,y-h],[x+w*.5,y-11],[x,y]],'#397193',COLORS.dark);
  stroke(c,[[x-w*.42,y-h+3],[x,y-h+14],[x+w*.40,y-h+3]],'#adf0f8',2);
}
function obelisk(c,x,y,variant=0){
  block(c,x,y,65,23);
  iceShard(c,x,y-23,40,105,variant?'#5a8ca7':'#7cc2d6',COLORS.light);
  for(let j=0;j<4;j++)rune(c,x+6,y-40-j*17,.32,j%2?COLORS.violet:COLORS.blue);
}
function crystals(c,x,y,variant=0){
  shadow(c,x,y,46,9);
  const cols=[COLORS.glacial,COLORS.blue,COLORS.violet,COLORS.edge];
  for(let j=0;j<6;j++){
    const xx=x-29+j*11,hh=28+(Math.floor(rand(j,variant,6)*48));
    iceShard(c,xx,y+(j%2)*3,18+(j%3)*3,hh,cols[(j+variant)%cols.length]);
  }
}
function statue(c,x,y,variant=0){
  block(c,x,y,91,20);
  rect(c,x-16,y-83,34,55,variant?'#7c91b6':'#8dc0d3');
  rect(c,x-17,y-95,35,18,COLORS.light);
  poly(c,[[x-19,y-91],[x-30,y-119],[x-9,y-104]],COLORS.steel);
  poly(c,[[x+8,y-104],[x+24,y-124],[x+22,y-87]],'#b5edfa');
  rect(c,x+7,y-89,4,3,COLORS.blue);
  rect(c,x-16,y-43,34,5,variant?COLORS.violet:COLORS.glacial);
  stroke(c,[[x-10,y-71],[x+10,y-56]],COLORS.edge,3);
}
function column(c,x,y,variant=0){
  block(c,x,y,71,20);
  rect(c,x-18,y-115,37,89,variant?'#405b81':'#9ed3dc');
  rect(c,x-18,y-111,7,88,COLORS.light);
  rect(c,x+12,y-111,7,88,COLORS.deep);
  for(let j=0;j<4;j++)stroke(c,[[x-17,y-101+j*18],[x+16,y-101+j*18]],COLORS.deep,2);
  rect(c,x-27,y-127,56,12,COLORS.steel);rect(c,x-24,y-135,50,10,COLORS.edge);
  rune(c,x,y-66,.7,variant?COLORS.violet:COLORS.blue);
}
function sarcophagus(c,x,y,open=false){
  block(c,x,y,106,37);
  poly(c,[[x-39,y-40],[x+2,y-63],[x+43,y-43],[x+36,y-18],[x-7,y-7],[x-40,y-19]],open?COLORS.dark:'#9fbecf',COLORS.edge);
  if(!open){
    rhombus(c,x,y-34,21,12,COLORS.deep,COLORS.light);
    rune(c,x,y-35,.45,COLORS.blue);
  }else{rect(c,x-16,y-36,32,11,'#1b2847');rect(c,x-6,y-38,12,13,'#e8faff');}
}
function altar(c,x,y,style=0){
  block(c,x,y,105,44);
  rhombus(c,x,y-57,42,19,style?'#423b70':'#355a80',COLORS.light);
  rhombus(c,x,y-59,29,13,COLORS.deep,style?COLORS.violet:COLORS.blue);
  rune(c,x,y-60,.8,COLORS.light);
}
function brazier(c,x,y,style=0){
  block(c,x,y,53,30);
  poly(c,[[x-24,y-34],[x,y-45],[x+24,y-34],[x,y-22]],COLORS.dark,COLORS.edge);
  const col=style===2?COLORS.violet:style===1?COLORS.blue:'#b6f2fc';
  rect(c,x-4,y-68,9,29,col);rect(c,x-9,y-49,17,12,COLORS.glacial);
  rect(c,x-2,y-46,5,20,COLORS.light);rect(c,x+5,y-59,4,15,col);
}
function urn(c,x,y){
  shadow(c,x,y,32,8);
  c.beginPath();c.moveTo(x-15,y-48);c.quadraticCurveTo(x-24,y-14,x-7,y-5);
  c.quadraticCurveTo(x+2,y+2,x+12,y-5);c.quadraticCurveTo(x+25,y-24,x+12,y-48);
  c.closePath();c.fillStyle='#7493b5';c.fill();c.lineWidth=2;c.strokeStyle=COLORS.dark;c.stroke();
  rect(c,x-16,y-49,31,6,COLORS.edge);rect(c,x-12,y-57,24,9,'#d6eaf2');
  rune(c,x,y-31,.35,COLORS.blue);
}
function snowPile(c,x,y,n=16){
  shadow(c,x,y,53,8);
  for(let j=0;j<n;j++){
    const xx=x-45+Math.floor(rand(j,n,4)*90),yy=y-Math.floor(rand(j,n,5)*16);
    rhombus(c,xx,yy,12,6,rand(j,n,6)>.45?'#bfd9e7':'#729db5',COLORS.deep);
    if(j%4===0)rect(c,xx,yy-6,5,2,COLORS.light);
  }
}
function bones(c,x,y){
  shadow(c,x,y,49,8);
  for(let i=0;i<8;i++){
    const xx=x-30+i*9,yy=y-8-(i%3)*7;
    rect(c,xx,yy,15,4,i%2?'#ccdbe1':'#a6b9c7');
    rect(c,xx-2,yy-2,4,8,COLORS.edge);
  }
}
function banner(c,x,y,variant=0){
  rect(c,x-26,y-119,5,110,COLORS.steel);rect(c,x+24,y-119,5,110,COLORS.steel);
  rect(c,x-31,y-125,65,6,COLORS.light);
  poly(c,[[x-20,y-117],[x+23,y-117],[x+20,y-52],[x+5,y-64],[x,y-49],[x-19,y-59]],variant?'#554f8f':'#275b83',COLORS.edge);
  rune(c,x,y-82,.9,variant?COLORS.violet:COLORS.blue);
}
function font(c,x,y,variant=0){
  block(c,x,y,96,35);
  rhombus(c,x,y-42,41,16,COLORS.steel,COLORS.light);
  rhombus(c,x,y-45,30,11,variant?'#303754':'#22526e',COLORS.blue);
  for(let i=0;i<5;i++)rect(c,x-22+i*11,y-51,5,2,'#8ef7fe');
}
function chandelier(c,x,y){
  const cy=y-78;
  stroke(c,[[x,cy-72],[x,cy-15]],COLORS.steel,5);
  rhombus(c,x,cy,48,13,COLORS.dark,COLORS.edge);
  for(let j=0;j<5;j++)iceShard(c,x-32+j*16,cy+17,13,35+(j%2)*15,COLORS.edge,'#ffffff');
}
function heart(c,x,y){
  block(c,x,y,87,22);
  iceShard(c,x,y-30,65,82,COLORS.violet,COLORS.light);
  rune(c,x,y-72,.75,COLORS.blue);
  snowflake(c,x,y-43,13,'#ffffff');
}
function templeProp(c,i){
  const x=80,y=151;
  if([0,1].includes(i))obelisk(c,x,y,i===1);
  else if([2,3,4,23].includes(i))crystals(c,x,y,i);
  else if([5,6,7].includes(i))statue(c,x,y,i%2);
  else if([8,9].includes(i))column(c,x,y,i%2);
  else if([10,11,33,39].includes(i))sarcophagus(c,x,y,i===11);
  else if([12,13,14,31].includes(i))altar(c,x,y,i%2);
  else if([15,16].includes(i)){urn(c,62,y);if(i===16)urn(c,107,y);}
  else if([17,18,19,20].includes(i))brazier(c,x,y,(i-17)%3);
  else if(i===21||i===22)chandelier(c,x,y);
  else if([24,25].includes(i))snowPile(c,x,y,i===24?16:25);
  else if([26,27].includes(i))bones(c,x,y);
  else if([28,29,38].includes(i))font(c,x,y,i%2);
  else if([30,35].includes(i))obelisk(c,x,y,i%2);
  else if([32,34].includes(i))statue(c,x,y,1);
  else if([36,37].includes(i))banner(c,x,y,i%2);
  else heart(c,x,y);
  if(i%4===0)rect(c,x-2,123,5,5,COLORS.blue);
}
function scatterAtlas(meta){
  const cell=166,canvas=makeCanvas(cell*8,cell*5),c=canvas.getContext('2d');
  c.imageSmoothingEnabled=false;
  meta.scatter=ICE_TEMPLE_PROPS.map((name,i)=>{
    const x=(i%8)*cell,y=Math.floor(i/8)*cell;
    c.save();c.translate(x,y);templeProp(c,i);c.restore();
    return {name,x,y,w:160,h:160,ox:-80,oy:-151,
      fp:WALKOVER.has(name)?0.27:0.64,block:!WALKOVER.has(name)};
  });
  return canvas;
}
/** Generates a complete ready-to-render biome pack, with the source architecture's
 * already-correct masks, raised isometric geometry, doors and exact ground pivots.
 */
export function generateIceTemplePack(base){
  const meta=JSON.parse(JSON.stringify(base.meta));
  meta.pack='Ice Temple — Palace of the Everfrost';
  const material=[
    'frosted_flagstone','glacial_limestone','blue_black_ice','frozen_sanctum_paving',
    'rimed_masonry','white_ice','sapphire_slate','snowbound_court',
    'blackice_obsidian','aurora_tesserae',
  ];
  meta.floors.forEach((f,i)=>{
    f.name=i<10?material[i]:'winter_relic_'+String(i-9).padStart(2,'0');
    f.lum=[.53,.68,.30,.57,.44,.74,.35,.61,.24,.40][i%10];
  });
  const renamed=(obj,keys)=>Object.fromEntries(Object.entries(obj).map(([key,val],i)=>[keys[i]||key,val]));
  meta.walls=renamed(meta.walls,ICE_TEMPLE_FAMILIES);
  meta.arches=renamed(meta.arches,ICE_TEMPLE_ARCHES);
  meta.doors=renamed(meta.doors,ICE_TEMPLE_DOORS);
  return {floors:floorAtlas(),walls:frostArchitecture(base.walls),scatter:scatterAtlas(meta),meta};
}
