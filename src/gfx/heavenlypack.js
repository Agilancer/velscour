// HEAVENLY — The Empyrean Citadel. Unique pearl, cloudstone and gold
// environment materials; 60 floor cells, 5 wall styles, 3 directional arch
// and hinged-gate styles, 40 independent terrain props.
// Proven catacomb alpha/depth-slice coordinates are used for architecture
// ONLY; every material and prop is painted with the functions below.
import { makeCanvas } from '../core/util.js';

export const HEAVENLY_WALLS=['pearly_basilica','celestial_cloister','sunstone_bastion','opal_sanctuary','golden_firmament'];
export const HEAVENLY_ARCHES=['radiant_nave','sunburst_triumph','pearly_stargate'];
export const HEAVENLY_DOORS=['gates_of_grace','ivory_covenant','dawn_seal'];
export const HEAVENLY_PROPS=[
 'pearl_column','sunlit_column','broken_marble_column','winged_angel_statue','seraph_statue',
 'radiant_brazier','azure_altar_flame','holy_censer','sunburst_obelisk','scripture_obelisk',
 'golden_reliquary','opal_reliquary','celestial_sarcophagus','luminous_font','blessing_shrine',
 'sun_disk_dais','divine_harp','sacred_trumpet','cloudstone_boulder','broken_angel_wing',
 'marble_rubble','golden_rubble','floating_rose_petals','feather_pile','white_lilies',
 'golden_lilies','cloud_fountain','sunwell_pool','holy_altar','judgement_throne',
 'offering_bowl','pearl_urn','gilded_urns','heavenly_banner','choir_banner',
 'winged_lectern','sun_chalice','celestial_hourglass','halo_ring','dawn_relic_chest',
];
const FLOOR=['#efe4cd','#f9f2df','#d4e0e9','#eed5bd','#e5e3df','#d6eff0',
 '#ddd5ee','#ecd69b','#e5ceac','#dee3da'];
const G='#dab667',WHITE='#fffae9',IVORY='#f3e8d4',SHADOW='#8996a9',BLUE='#72baca',ROSE='#d9b5d6';
const WALK=new Set(['marble_rubble','golden_rubble','floating_rose_petals','feather_pile','white_lilies',
 'golden_lilies','sunwell_pool','offering_bowl']);
function rand(x,y,z=0){
 let n=Math.imul(x+37,374761393)+Math.imul(y+33,668265263)+Math.imul(z+23,1274126177);
 n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967296;
}
const rect=(g,x,y,w,h,c)=>{g.fillStyle=c;g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
function poly(g,vs,c,edge){
 g.beginPath();g.moveTo(...vs[0]);for(let i=1;i<vs.length;i++)g.lineTo(...vs[i]);g.closePath();
 g.fillStyle=c;g.fill();if(edge){g.strokeStyle=edge;g.lineWidth=2;g.stroke();}
}
function line(g,vs,c,w=2){g.beginPath();g.moveTo(...vs[0]);for(let i=1;i<vs.length;i++)g.lineTo(...vs[i]);
 g.strokeStyle=c;g.lineWidth=w;g.stroke();}
function diamond(g,x,y,rx,ry,c,edge){poly(g,[[x,y-ry],[x+rx,y],[x,y+ry],[x-rx,y]],c,edge);}
function circle(g,x,y,r,c,edge){g.beginPath();g.arc(x,y,r,0,Math.PI*2);
 g.fillStyle=c;g.fill();if(edge){g.strokeStyle=edge;g.lineWidth=2;g.stroke();}}
function halo(g,x,y,rx,ry,c=G,w=2){g.beginPath();g.ellipse(x,y,rx,ry,0,0,Math.PI*2);g.strokeStyle=c;g.lineWidth=w;g.stroke();}
function star(g,x,y,r=9,color=G){rect(g,x-2,y-r,4,2*r,color);rect(g,x-r,y-2,2*r,4,color);circle(g,x,y,3,WHITE);}
function filigree(g,x,y,k=1){
 halo(g,x,y,15*k,7*k,G,2);star(g,x,y,6*k,WHITE);
 for(let i=0;i<3;i++)circle(g,x+(i-1)*18*k,y+(i%2)*3*k,2*k,BLUE);
}
function tile(g,i){
 const X=i%10*162,Y=Math.floor(i/10)*82,m=i%10;
 g.save();g.translate(X,Y);
 g.beginPath();g.moveTo(80,0);g.lineTo(160,40);g.lineTo(80,80);g.lineTo(0,40);g.closePath();g.clip();
 rect(g,0,0,160,80,FLOOR[m]);
 // Consistent clean rim along every repeated tile; decorate only the inset.
 g.save();g.beginPath();g.moveTo(80,7);g.lineTo(145,40);g.lineTo(80,73);g.lineTo(15,40);g.closePath();g.clip();
 if(m===0||m===1||m===4||m===9){
  for(let y=-19;y<112;y+=18)for(let x=-12;x<177;x+=37){
   diamond(g,x+((y/18|0)%2)*17,y,16,8,m%2?'#ddd6c8':'#e6d5b7','#c2b4a0');
  }
 }else if(m===2||m===5||m===6){
  for(let y=-12;y<102;y+=18)for(let x=-12;x<181;x+=31){
   diamond(g,x,y,13,7,m===6?'#c3b8d8':'#c0dfea','#899fb1');
  }
 }else for(let y=-15;y<111;y+=24)for(let x=-18;x<192;x+=42){
  diamond(g,x,y,17,10,m===7?'#f4d88f':'#e0b5a5',G);
 }
 // Soft marble veins and worn gold inlays that cannot escape the tile edge.
 for(let k=0;k<34;k++){
  const x=18+Math.floor(rand(k,i,1)*124),y=12+Math.floor(rand(k,i,2)*57);
  const c=rand(k,i,3)>.55?'rgba(255,255,255,.57)':'rgba(104,92,81,.15)';
  rect(g,x,y,k%3+1,k%2+1,c);
 }
 if(i>=10){
  const motif=i%10;
  if(motif===0||motif===5){diamond(g,80,40,31,16,WHITE,G);filigree(g,80,40,.7);}
  else if(motif===1){halo(g,80,40,26,13,G,3);filigree(g,80,40,.8);}
  else if(motif===2){star(g,80,40,16,BLUE);star(g,55,41,5,G);star(g,105,38,5,G);}
  else if(motif===3){line(g,[[49,42],[60,31],[74,40],[87,29],[110,43]],'#b5a59b',3);star(g,80,40,7);}
  else if(motif===4){for(let k=0;k<5;k++)diamond(g,52+k*13,38+k%2*5,7,5,G,WHITE);}
  else if(motif===6){diamond(g,80,40,29,14,'#d4c6e8',G);halo(g,80,40,16,8,WHITE,3);}
  else if(motif===7){poly(g,[[55,39],[69,27],[93,31],[107,42],[80,56]],'#d7c6af',G);}
  else if(motif===8){star(g,80,40,20,G);circle(g,80,40,10,WHITE,BLUE);}
  else {halo(g,80,40,31,16,BLUE,3);filigree(g,80,40,.95);}
 }
 g.restore();g.restore();
}
function floorAtlas(){const c=makeCanvas(1620,492),g=c.getContext('2d');g.imageSmoothingEnabled=false;for(let i=0;i<60;i++)tile(g,i);return c;}
function architecture(base,meta){
 const cv=makeCanvas(base.width,base.height),g=cv.getContext('2d',{willReadFrequently:true});
 g.drawImage(base,0,0);
 const im=g.getImageData(0,0,cv.width,cv.height),p=im.data,W=cv.width,H=cv.height;
 // Proven source sprites have multiple wall-family atlas regions. Use the
 // authoritative metadata coordinates to mark them individually, so five
 // materials ACTUALLY differ at the pixel level rather than being aliases.
 const families=new Uint8Array(W*H);families.fill(255);
 for(let fam=0;fam<5;fam++){
   const key=Object.keys(meta.walls)[fam];
   for(const group of Object.values(meta.walls[key])){
     for(const arms of group)for(const item of arms){
       const [dir,sx,sy,sw,sh]=item;
       if(typeof sx!=='number')continue;
       for(let y=Math.max(0,sy);y<Math.min(H,sy+sh);y++)
         families.fill(fam,y*W+Math.max(0,sx),y*W+Math.min(W,sx+sw));
     }
   }
 }
 const shades=[
   [[238,225,197],[167,149,139]], // pearl marble
   [[210,222,238],[106,151,180]], // lapis cloister
   [[243,209,131],[164,117,76]], // sunstone
   [[223,211,236],[144,133,184]], // opal
   [[240,226,183],[161,150,120]], // antique gold
 ];
 for(let k=0;k<p.length;k+=4){
  if(!p[k+3])continue;
  const id=k/4,x=id%W,y=Math.floor(id/W),fam=families[id]===255?(x>>7)%5:families[id];
  const [light,dark]=shades[fam];
  const lum=(p[k]*.29+p[k+1]*.56+p[k+2]*.15)/255;
  const shade=Math.max(0,Math.min(1,lum*.88+.13+(rand(x>>2,y>>2,fam)-.5)*.09));
  const joint=(y%51<2)||((x+Math.floor(y/33)*13)%67<2&&y%51<43);
  const trim=y%115>=91&&y%115<97&&lum>.23;
  const gem=y%115>=103&&y%115<107&&lum>.22;
  const damp=joint?.68:1;
  for(let ch=0;ch<3;ch++)p[k+ch]=Math.round(
    (trim?[213,171,83][ch]:gem?[87,194,215][ch]:dark[ch]+(light[ch]-dark[ch])*shade)*damp);
 }
 g.putImageData(im,0,0);
 // Relief on valid source silhouette only, with distinguishable motifs
 // for each wall family. None can paint transparent wall background.
 g.save();g.globalCompositeOperation='source-atop';g.globalAlpha=.28;
 for(let y=35;y<H;y+=103)for(let x=43;x<W;x+=112){
  const fam=families[Math.min(H-1,y)*W+Math.min(W-1,x)]%5;
  if(fam===0)filigree(g,x,y,.7);
  else if(fam===1){halo(g,x,y,19,8,BLUE,3);star(g,x,y,5);}
  else if(fam===2)star(g,x,y,13,G);
  else if(fam===3){diamond(g,x,y,17,23,'#d9c5e8',G);}
  else {star(g,x,y,8,WHITE);line(g,[[x-21,y+5],[x+20,y+5]],G,2);}
 }
 g.restore();
 return cv;
}
function shadow(g,x,y,rx=43,ry=9){g.save();g.beginPath();g.ellipse(x,y,rx,ry,0,0,Math.PI*2);g.fillStyle='rgba(49,48,71,.22)';g.fill();g.restore();}
function plinth(g,x=80,y=148,w=87,h=28){
 shadow(g,x,y+2,w*.56);
 poly(g,[[x-w/2,y-h],[x,y-h-15],[x+w/2,y-h],[x,y-h+10]],WHITE,G);
 poly(g,[[x-w/2,y-h],[x,y-h+10],[x,y],[x-w/2,y-13]],'#b5adc0','#a99789');
 poly(g,[[x,y-h+10],[x+w/2,y-h],[x+w/2,y-13],[x,y]],'#c8c3ce','#aea2ae');
 line(g,[[x-w*.38,y-h+1],[x,y-h+8],[x+w*.38,y-h]],G,2);
}
function column(g,x=80,y=148,mode=0){
 plinth(g,x,y,71,19);
 rect(g,x-21,y-120,42,95,mode?'#e5d8b6':IVORY);
 rect(g,x-21,y-117,6,90,WHITE);rect(g,x+14,y-117,7,91,SHADOW);
 for(let i=0;i<5;i++)line(g,[[x-16+i*8,y-118],[x-16+i*8,y-28]],'#d6c7ba',2);
 rect(g,x-27,y-130,55,12,WHITE);rect(g,x-23,y-138,47,8,G);
 if(mode===2)poly(g,[[x-24,y-137],[x-5,y-146],[x+20,y-136]],SHADOW,WHITE);
 else filigree(g,x,y-86,.65);
}
function statue(g,x=80,y=148,mode=0){
 plinth(g,x,y,96,21);
 for(let s of [-1,1]){
  poly(g,[[x+s*13,y-93],[x+s*54,y-137],[x+s*41,y-77],[x+s*17,y-46]],mode%2?BLUE:WHITE,G);
  for(let i=0;i<3;i++)line(g,[[x+s*17,y-79+i*12],[x+s*(42-i*5),y-99+i*8]],G,2);
 }
 rect(g,x-22,y-99,44,61,IVORY);circle(g,x,y-113,15,WHITE,G);
 halo(g,x,y-132,22,7,G,3);
 diamond(g,x,y-77,12,16,mode%2?BLUE:G,WHITE);
}
function urn(g,x=80,y=148){
 shadow(g,x,y,29);
 poly(g,[[x-13,y-59],[x-24,y-36],[x-21,y-11],[x,y-4],[x+20,y-11],[x+24,y-35],[x+12,y-59]],IVORY,G);
 rect(g,x-17,y-62,34,8,G);rect(g,x-13,y-70,25,11,WHITE);
 filigree(g,x,y-31,.4);
}
function shrine(g,x=80,y=148,v=0){
 plinth(g,x,y,97,34);
 diamond(g,x,y-48,40,17,v%2?'#bddae4':IVORY,G);
 halo(g,x,y-75,27,19,v%2?BLUE:G,4);star(g,x,y-75,14,WHITE);
 for(let k=0;k<6;k++){const a=k*2*Math.PI/6;circle(g,x+Math.cos(a)*29,y-75+Math.sin(a)*19,4,G);}
}
function altar(g,x=80,y=148,v=0){
 plinth(g,x,y,103,44);
 diamond(g,x,y-56,43,17,v%2?ROSE:WHITE,G);
 filigree(g,x,y-60,.75);
}
function fountain(g,x=80,y=148,v=0){
 plinth(g,x,y,101,32);
 diamond(g,x,y-42,43,17,WHITE,G);
 diamond(g,x,y-46,33,12,v%2?ROSE:BLUE,WHITE);
 line(g,[[x,y-65],[x-12,y-48]],WHITE,3);
 line(g,[[x,y-65],[x+12,y-48]],WHITE,3);
 star(g,x,y-70,7,G);
}
function harp(g,x=80,y=148,v=0){
 plinth(g,x,y,71,12);
 line(g,[[x-22,y-15],[x-26,y-116],[x+27,y-127],[x+21,y-17]],G,7);
 for(let j=0;j<7;j++)line(g,[[x-16+j*6,y-107-j*2],[x-14+j*5,y-22]],WHITE,2);
 star(g,x+28,y-123,9,G);
}
function banner(g,x=80,y=148,v=0){
 rect(g,x-30,y-119,5,114,G);rect(g,x+27,y-119,5,114,G);
 rect(g,x-32,y-128,66,9,WHITE);
 poly(g,[[x-24,y-119],[x+27,y-119],[x+22,y-47],[x+4,y-63],[x-5,y-45],[x-23,y-62]],
   v%2?'#a4d8e4':'#f6e8b7',G);
 star(g,x,y-84,14,G);
}
function debris(g,x=80,y=148,v=0){
 shadow(g,x,y,48);
 for(let j=0;j<17;j++){
  const xx=x-41+rand(j,v,4)*83,yy=y-6-rand(j,v,5)*18;
  if(v%3===0)diamond(g,xx,yy,9,7,IVORY,G);
  else if(v%3===1)circle(g,xx,yy,3,j%2?G:ROSE);
  else rect(g,xx,yy,6,9,j%2?WHITE:BLUE);
 }
}
function prop(g,i){
 const x=80,y=151;
 if(i<=2)column(g,x,y,i);
 else if(i<=4)statue(g,x,y,i);
 else if(i>=5&&i<=7){plinth(g,x,y,59,27);star(g,x,y-66,21,i===6?BLUE:G);halo(g,x,y-71,25,12,WHITE,3);}
 else if(i<=9)column(g,x,y,i);
 else if(i<=12)urn(g,x,y);
 else if(i<=16)shrine(g,x,y,i);
 else if(i<=18)harp(g,x,y,i);
 else if(i<=19)column(g,x,y,i);
 else if(i<=21)debris(g,x,y,i);
 else if(i<=25)debris(g,x,y,i);
 else if(i<=27)fountain(g,x,y,i);
 else if(i<=30)altar(g,x,y,i);
 else if(i<=32)urn(g,x,y);
 else if(i<=34)banner(g,x,y,i);
 else if(i<=36)harp(g,x,y,i);
 else if(i===37){plinth(g,x,y,74,22);halo(g,x,y-75,29,8,G,5);star(g,x,y-82,13,G);}
 else if(i===38){halo(g,x,y-85,36,19,G,5);star(g,x,y-86,17,WHITE);}
 else {plinth(g,x,y,91,35);diamond(g,x,y-55,36,16,IVORY,G);filigree(g,x,y-55,.7);}
 // Vary the visible insignia and gem color across all 40 individual props.
 if(i%2===0)star(g,x+20,y-35,4,BLUE);
 if(i%3===1)rect(g,x-25,y-45,6,6,ROSE);
 if(i%5===0)halo(g,x,y-48,17,6,G,2);
}
function scatterAtlas(meta){
 const cell=166,c=makeCanvas(cell*8,cell*5),g=c.getContext('2d');g.imageSmoothingEnabled=false;
 meta.scatter=HEAVENLY_PROPS.map((name,i)=>{
  const x=i%8*cell,y=Math.floor(i/8)*cell;
  g.save();g.translate(x,y);prop(g,i);g.restore();
  return{name,x,y,w:160,h:160,ox:-80,oy:-151,fp:WALK.has(name)?.27:.64,block:!WALK.has(name)};
 });
 return c;
}
export function generateHeavenlyPack(base){
 const meta=JSON.parse(JSON.stringify(base.meta));
 const newNames=['pearl_marble','sunblessed_limestone','cloudstone','rose_quartz','ivory_inlay',
  'celestial_aqua','opal_mosaic','golden_solar','rose_gold_paving','sacred_masonry'];
 meta.pack='HEAVENLY — The Empyrean Citadel';
 meta.floors.forEach((f,i)=>{
  f.name=i<10?newNames[i]:'empyrean_relief_'+String(i-9).padStart(2,'0');
  f.lum=[.75,.88,.76,.68,.79,.72,.71,.68,.66,.78][i%10];
 });
 const rename=(obj,keys)=>Object.fromEntries(Object.entries(obj).map(([k,v],i)=>[keys[i]||k,v]));
 const walls=architecture(base.walls,meta);
 meta.walls=rename(meta.walls,HEAVENLY_WALLS);
 meta.arches=rename(meta.arches,HEAVENLY_ARCHES);
 meta.doors=rename(meta.doors,HEAVENLY_DOORS);
 return{floors:floorAtlas(),walls,scatter:scatterAtlas(meta),meta};
}
