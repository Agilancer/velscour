// ASTRAL PLANE — self-contained generated cosmic dungeon art.
// Native 160×80 isometric floors / 160×160 prop pivots. Catacombs art supplies
// tested alpha/depth slices ONLY for wall connectivity, arches and door hinges.
import { makeCanvas } from '../core/util.js';

export const ASTRAL_WALLS = [
  'starforged_bastion','aetheric_arcades','constellation_cloister',
  'prismatic_nexus','event_horizon_sanctum',
];
export const ASTRAL_ARCHES = ['stargate_vault','celestial_conduit','horizon_arch'];
export const ASTRAL_DOORS = ['astral_iris','runebound_aether','celestial_seal'];
export const ASTRAL_PROPS = [
  'astral_obelisk','prismatic_obelisk','starfall_brazier','voidflame_brazier',
  'aether_lantern','stellar_conduit','cosmic_telescope','orrery_of_worlds',
  'armillary_sphere','celestial_astrolabe','fallen_star_fragment','crystal_meteor',
  'moonstone_column','broken_moonstone_column','orbiting_crystal','prismatic_cluster',
  'nebula_shrine','astral_fountain','convergence_dais','echoing_monolith',
  'worldshard_pedestal','star_sarcophagus','translucent_reliquary','sealed_stellar_coffer',
  'astral_watcher_statue','starweaver_statue','rift_guardian_statue','portal_anchor',
  'collapsed_stargate','aetheric_sundial','runic_star_tablet','fallen_constellation',
  'cosmic_rune_circle','stardust_pile','floating_stone_rubble','shattered_orb',
  'lunar_banner','solar_banner','celestial_chest','singularity_heart',
];
const WALKOVER = new Set(['fallen_star_fragment','fallen_constellation',
  'cosmic_rune_circle','stardust_pile','floating_stone_rubble','shattered_orb']);
const P = {
  void:'#101027',midnight:'#1a1640',indigo:'#343073',amethyst:'#7459be',
  lavender:'#b29af7',star:'#e9eeff',blue:'#58cdf9',turquoise:'#74f5e9',
  rose:'#d477cf',gold:'#edd1a4',dark:'#191a39',stone:'#62639c',
  shadow:'#090d21',plum:'#543c86'
};
function hash(x,y,s=0){
  let n=(Math.imul(x+93,374761393)+Math.imul(y+57,668265263)+Math.imul(s+17,1274126177))|0;
  n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967296;
}
const rect=(g,x,y,w,h,color)=>{g.fillStyle=color;g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
function poly(g,v,color,edge){
  g.beginPath();g.moveTo(...v[0]);for(let i=1;i<v.length;i++)g.lineTo(...v[i]);
  g.closePath();g.fillStyle=color;g.fill();if(edge){g.strokeStyle=edge;g.lineWidth=1.5;g.stroke();}
}
function stroke(g,v,color,w=2){
  g.beginPath();g.moveTo(...v[0]);for(let i=1;i<v.length;i++)g.lineTo(...v[i]);
  g.strokeStyle=color;g.lineWidth=w;g.stroke();
}
function diamond(g,x,y,rx,ry,c,edge){poly(g,[[x,y-ry],[x+rx,y],[x,y+ry],[x-rx,y]],c,edge);}
function star(g,x,y,r=7,c=P.star){
  rect(g,x-1,y-r,2,2*r,c);rect(g,x-r,y-1,2*r,2,c);
  rect(g,x-2,y-2,4,4,P.star);rect(g,x-r*.4,y-r*.4,2,2,P.blue);
}
function rune(g,x,y,k=1,c=P.turquoise){
  stroke(g,[[x-12*k,y-7*k],[x+10*k,y+8*k],[x+7*k,y-8*k],[x-10*k,y+8*k]],c,2*k);
  stroke(g,[[x-12*k,y],[x+12*k,y]],c,2*k);
  rect(g,x-2*k,y-2*k,4*k,4*k,P.star);
}
function ring(g,x,y,r,col=P.lavender,w=2,elliptic=.5){
  g.beginPath();g.ellipse(x,y,r,r*elliptic,0,0,Math.PI*2);
  g.strokeStyle=col;g.lineWidth=w;g.stroke();
}
function cosmicTile(g,i) {
  const X=(i%10)*162,Y=Math.floor(i/10)*82,m=i%10;
  const palette=[
    [P.midnight,'#36336d'],[P.indigo,'#5954a2'],[P.void,'#2a2752'],
    ['#283458','#435d93'],[P.plum,'#7757ab'],['#1e2751','#3c5585'],
    ['#41366b','#6e60a0'],['#212950','#3f3875'],
    ['#161b36','#2c3258'],['#3c2c66','#65529e'],
  ];
  const a=palette[m];
  g.save();g.translate(X,Y);
  g.beginPath();g.moveTo(80,0);g.lineTo(160,40);g.lineTo(80,80);g.lineTo(0,40);g.closePath();g.clip();
  // Fixed outer material, inset constellation tesserae: each base can repeat.
  rect(g,0,0,160,80,a[0]);
  g.save();g.beginPath();g.moveTo(80,7);g.lineTo(146,40);g.lineTo(80,73);g.lineTo(14,40);g.closePath();g.clip();
  for(let y=-25;y<105;y+=17)for(let x=-30;x<193;x+=34){
    const xx=x+((Math.floor(y/17)&1)?17:0),n=hash(xx,y,m);
    if(n<.19)continue;
    diamond(g,xx,y,15,8,n>.59?a[1]:a[0],n>.79?'rgba(133,177,255,.24)':'rgba(6,8,26,.23)');
  }
  // Star fields are sparse and non-white enough to sit behind the character.
  for(let s=0;s<39;s++){
    const x=18+Math.floor(hash(s,m,1)*125),y=11+Math.floor(hash(s,m,2)*57);
    const v=hash(s,m,3);
    if(v>.74)rect(g,x,y,2,2,v>.91?P.star:P.lavender);
    if(v>.965)star(g,x,y,3,P.turquoise);
  }
  if(i>=10){
    const v=i%10;
    if(v===0||v===5){ring(g,80,40,26,P.blue,2);ring(g,80,40,18,P.lavender,2);star(g,80,40,8);}
    else if(v===1){diamond(g,80,40,32,16,P.dark,P.gold);rune(g,80,41,.7,P.turquoise);}
    else if(v===2){for(let k=0;k<5;k++)star(g,48+k*16,32+(k%3)*7,k%2?2:4,P.star);
      stroke(g,[[48,32],[64,39],[80,46],[96,32],[112,39]],P.blue,2);}
    else if(v===3){diamond(g,80,40,32,16,'#1e1b43',P.lavender);
      diamond(g,80,40,17,9,P.plum,P.blue);}
    else if(v===4){stroke(g,[[45,40],[58,27],[80,38],[96,31],[117,41]],P.turquoise,2);
      stroke(g,[[58,27],[61,18]],P.rose,2);}
    else if(v===6){ring(g,80,40,31,P.gold,2);rune(g,80,40,.8,P.star);}
    else if(v===7){for(let k=0;k<6;k++)diamond(g,51+k*11,38+(k%3)*5,5,4,k%2?P.blue:P.lavender);}
    else if(v===8){diamond(g,80,40,35,17,P.shadow,P.rose);ring(g,80,40,17,P.blue,2);}
    else {ring(g,80,40,24,P.lavender,2);star(g,80,40,11,P.gold);}
  }
  g.restore();g.restore();
}
function floorAtlas(){
 const c=makeCanvas(1620,492),g=c.getContext('2d');
 g.imageSmoothingEnabled=false;
 for(let i=0;i<60;i++)cosmicTile(g,i);
 return c;
}
function astralArchitecture(original){
 const c=makeCanvas(original.width,original.height),g=c.getContext('2d',{willReadFrequently:true});
 g.drawImage(original,0,0);
 const image=g.getImageData(0,0,c.width,c.height),p=image.data,W=c.width;
 for(let i=0;i<p.length;i+=4){
  if(!p[i+3])continue;
  const px=i/4,x=px%W,y=Math.floor(px/W);
  const lum=(p[i]*.28+p[i+1]*.58+p[i+2]*.14)/255;
  const v=Math.max(0,Math.min(1,lum*.88+.11+(hash(x>>2,y>>2,9)-.5)*.09));
  const seam=(y%53<2)||((x+Math.floor(y/31)*15)%65<2&&y%53<44);
  const band=y%119>=93&&y%119<=97&&lum>.20;
  const energy=y%119>=108&&y%119<=111&&lum>.24;
  const sparkle=hash(x>>3,y>>3,12)>.985;
  const shade=seam?.64:1;
  p[i]=Math.round((band?170:energy?75:sparkle?226:22+95*v)*shade);
  p[i+1]=Math.round((band?145:energy?194:sparkle?217:24+92*v)*shade);
  p[i+2]=Math.round((band?224:energy?242:sparkle?255:55+149*v)*shade);
 }
 g.putImageData(image,0,0);
 // Frieze symbols are masked to the exact alpha geometry, maintaining
 // cutaway, collision silhouette, and open/closed door pivot alignment.
 g.save();g.globalCompositeOperation='source-atop';g.globalAlpha=.34;
 for(let y=27;y<c.height;y+=83)for(let x=33;x<c.width;x+=107){
  if(hash(x,y,33)>.5)rune(g,x,y,.55,P.turquoise);
  else star(g,x,y,7,P.gold);
 }
 g.restore();
 return c;
}
function shadow(g,x,y,rx=44,ry=9){
 g.save();g.beginPath();g.ellipse(x,y,rx,ry,0,0,Math.PI*2);g.fillStyle='rgba(3,5,24,.45)';g.fill();g.restore();
}
function pedestal(g,x=80,y=148,w=80,h=26){
 shadow(g,x,y+3,w*.62);
 poly(g,[[x-w/2,y-h],[x,y-h-16],[x+w/2,y-h],[x,y-h+9]],P.stone,P.dark);
 poly(g,[[x-w/2,y-h],[x,y-h+9],[x,y],[x-w/2,y-12]],P.plum,P.dark);
 poly(g,[[x,y-h+9],[x+w/2,y-h],[x+w/2,y-12],[x,y]],P.indigo,P.dark);
 stroke(g,[[x-w*.42,y-h],[x,y-h+6],[x+w*.42,y-h]],P.gold,2);
}
function crystal(g,x,y,w=38,h=80,tint=P.turquoise){
 poly(g,[[x-w*.32,y-h*.11],[x-w*.23,y-h*.77],[x,y-h],
   [x+w*.42,y-h*.76],[x+w*.44,y-h*.1],[x,y]],tint,P.shadow);
 poly(g,[[x-w*.23,y-h*.77],[x,y-h],[x,y],[x-w*.32,y-h*.11]],'#d7ccfa');
 poly(g,[[x,y-h],[x+w*.42,y-h*.76],[x+w*.44,y-h*.1],[x,y]],P.indigo);
 stroke(g,[[x,y-h*.84],[x+1,y-h*.18]],P.star,2);
}
function orb(g,x,y,r=24,col=P.turquoise){
 g.beginPath();g.arc(x,y,r,0,Math.PI*2);
 g.fillStyle=P.dark;g.fill();g.strokeStyle=col;g.lineWidth=3;g.stroke();
 g.beginPath();g.arc(x-r*.26,y-r*.26,r*.33,0,Math.PI*2);
 g.fillStyle=P.star;g.fill();
 ring(g,x,y,r+10,P.lavender,2,.43);
 star(g,x+r*.5,y-r*.5,4,col);
}
function obelisk(g,x=80,y=148,alt=false){
 pedestal(g,x,y,65,18);
 crystal(g,x,y-19,40,113,alt?P.lavender:P.blue);
 for(let i=0;i<4;i++)rune(g,x+7,y-49-i*16,.24,i%2?P.gold:P.star);
}
function brazier(g,x=80,y=148,purple=false){
 pedestal(g,x,y,60,28);
 diamond(g,x,y-39,28,10,P.shadow,P.gold);
 orb(g,x,y-73,19,purple?P.rose:P.blue);
 for(let k=0;k<6;k++)star(g,x-26+k*9,y-80+(k%3)*9,2,purple?P.lavender:P.turquoise);
}
function column(g,x=80,y=148,broken=false){
 pedestal(g,x,y,66,17);
 rect(g,x-18,y-109,36,82,P.stone);
 rect(g,x-18,y-108,6,80,P.lavender);rect(g,x+12,y-108,6,80,P.dark);
 for(let i=0;i<4;i++)stroke(g,[[x-15,y-96+i*17],[x+16,y-96+i*17]],P.blue,2);
 rect(g,x-25,y-119,52,9,P.lavender);
 if(broken){poly(g,[[x-23,y-117],[x-4,y-137],[x+20,y-123]],P.indigo,P.blue);}
 else {rect(g,x-22,y-129,46,10,P.gold);rune(g,x,y-74,.6);}
}
function complex(g,x=80,y=148,kind=0){
 pedestal(g,x,y,95,24);
 if(kind===0){
   // Orbiting golden orrery and star-chart spheres.
   ring(g,x,y-81,41,P.gold,3,.48);
   ring(g,x,y-81,31,P.blue,2,.77);
   ring(g,x,y-81,22,P.rose,2,.55);
   orb(g,x,y-81,13,P.turquoise);
   orb(g,x-34,y-88,5,P.gold);
   orb(g,x+32,y-65,5,P.rose);
 }else if(kind===1){
   rect(g,x-7,y-100,14,61,P.stone);
   orb(g,x,y-118,25,P.lavender);
   star(g,x,y-122,8,P.star);
 }else{
   ring(g,x,y-74,34,P.turquoise,3,.68);
   ring(g,x,y-74,26,P.rose,2,.65);
   crystal(g,x,y-40,27,66,P.lavender);
 }
}
function watcher(g,x=80,y=148,variant=0){
 pedestal(g,x,y,91,21);
 rect(g,x-21,y-100,43,63,variant?P.plum:P.stone);
 rect(g,x-15,y-114,30,22,P.lavender);
 poly(g,[[x-17,y-110],[x-26,y-129],[x-4,y-114]],P.indigo,P.star);
 poly(g,[[x+10,y-110],[x+27,y-128],[x+18,y-105]],P.indigo,P.star);
 rect(g,x+7,y-104,5,4,P.turquoise);
 poly(g,[[x-22,y-91],[x-45,y-109],[x-35,y-65],[x-20,y-52]],P.plum,P.dark);
 poly(g,[[x+22,y-91],[x+45,y-109],[x+35,y-65],[x+20,y-52]],P.indigo,P.dark);
 rune(g,x,y-66,.52,P.star);
}
function fountain(g,x=80,y=148,variant=0){
 pedestal(g,x,y,103,35);
 diamond(g,x,y-44,44,18,P.dark,P.gold);
 diamond(g,x,y-47,29,12,variant?P.rose:P.blue,P.turquoise);
 crystal(g,x,y-48,23,43,P.star);
 for(let i=0;i<4;i++)star(g,x-26+i*17,y-50+(i%2)*6,3,P.star);
}
function sarcophagus(g,x=80,y=148,variant=0){
 pedestal(g,x,y,102,31);
 poly(g,[[x-36,y-40],[x,y-63],[x+40,y-42],[x+31,y-14],
 [x-12,y-5],[x-43,y-17]],variant?P.midnight:P.stone,P.gold);
 diamond(g,x,y-35,24,12,P.dark,P.blue);rune(g,x,y-34,.5,P.turquoise);
}
function shardPile(g,x=80,y=148,variant=0){
 shadow(g,x,y,49);
 for(let i=0;i<10;i++){
  const xx=x-39+hash(i,variant,4)*78;
  const yy=y-2-hash(i,variant,5)*11;
  crystal(g,xx,yy,10+hash(i,variant,6)*13,17+hash(i,variant,7)*42,
    [P.blue,P.lavender,P.turquoise,P.stone][(i+variant)%4]);
 }
}
function runeCircle(g,x=80,y=148,variant=0){
 shadow(g,x,y,48);
 diamond(g,x,y-8,49,18,P.midnight,P.gold);
 ring(g,x,y-8,37,variant?P.rose:P.turquoise,2,.45);
 ring(g,x,y-8,22,P.lavender,2,.45);
 rune(g,x,y-9,.7,P.star);
}
function banner(g,x=80,y=148,variant=0){
 rect(g,x-28,y-119,5,110,P.gold);rect(g,x+25,y-119,5,110,P.gold);
 rect(g,x-32,y-126,67,7,P.lavender);
 poly(g,[[x-23,y-119],[x+25,y-119],[x+21,y-54],
 [x+6,y-66],[x-5,y-51],[x-23,y-65]],variant?P.plum:P.indigo,P.gold);
 rune(g,x,y-89,.8,P.turquoise);
}
function drawProp(g,id){
 const x=80,y=151;
 if([0,1,19].includes(id))obelisk(g,x,y,id%2===1);
 else if([2,3,4].includes(id))brazier(g,x,y,id===3);
 else if([5,6,7,8,9,29].includes(id))complex(g,x,y,id%3);
 else if([10,11,14,15,34,35].includes(id))shardPile(g,x,y,id);
 else if([12,13].includes(id))column(g,x,y,id===13);
 else if([16,17,18,20].includes(id))fountain(g,x,y,id%2);
 else if([21,22,23,38].includes(id))sarcophagus(g,x,y,id%2);
 else if([24,25,26,27].includes(id))watcher(g,x,y,id%2);
 else if([28,32,33,31].includes(id))runeCircle(g,x,y,id%2);
 else if([36,37].includes(id))banner(g,x,y,id%2);
 else if(id===39){pedestal(g,x,y,92,32);orb(g,x,y-81,33,P.rose);ring(g,x,y-81,47,P.turquoise,3);}
 else {pedestal(g,x,y,80,25);orb(g,x,y-61,21,P.blue);}
 // Small but distinct celestial markings for each prop, retained in its cell.
 if(id%4===0)star(g,x+25,y-36,3,P.star);
 if(id%3===1)rect(g,x-21,y-35,4,4,P.gold);
}
function propAtlas(meta){
 const cell=166,canvas=makeCanvas(cell*8,cell*5),g=canvas.getContext('2d');
 g.imageSmoothingEnabled=false;
 meta.scatter=ASTRAL_PROPS.map((name,i)=>{
   const x=(i%8)*cell,y=Math.floor(i/8)*cell;
   g.save();g.translate(x,y);drawProp(g,i);g.restore();
   return {name,x,y,w:160,h:160,ox:-80,oy:-151,
      fp:WALKOVER.has(name)?0.26:0.64,block:!WALKOVER.has(name)};
 });
 return canvas;
}
/** Build a complete ordinary dungeon pack from original star-art surfaces while
 * retaining the validated directional architecture connection and depth-slice metadata.
 */
export function generateAstralPlanePack(base){
 const meta=JSON.parse(JSON.stringify(base.meta));
 meta.pack='ASTRAL PLANE — The Celestial Expanse';
 const materials=['midnight_stellar_flagstone','aether_lattice','deep_void_masonry',
  'starlit_courtyard','nebular_mosaic','astral_limestone','fallen_star_metal',
  'echoing_tesserae','event_horizon_stone','celestial_inlay'];
 meta.floors.forEach((f,i)=>{
  f.name=i<10?materials[i]:'astral_relic_'+String(i-9).padStart(2,'0');
  f.lum=[.35,.40,.22,.42,.39,.37,.30,.32,.18,.35][i%10];
 });
 const rename=(o,a)=>Object.fromEntries(Object.entries(o).map(([k,v],i)=>[a[i]||k,v]));
 meta.walls=rename(meta.walls,ASTRAL_WALLS);
 meta.arches=rename(meta.arches,ASTRAL_ARCHES);
 meta.doors=rename(meta.doors,ASTRAL_DOORS);
 return {floors:floorAtlas(),walls:astralArchitecture(base.walls),scatter:propAtlas(meta),meta};
}
