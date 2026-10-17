// Pixel-art wall sconces from four approved four-angle sprite sheets.
// Each atlas has five designs (rows) and four authored iso views (columns).
// A holder is an overlay on a pre-existing lit wall segment; no new
// collision, light emitters or flame textures are introduced by the atlas.
import { isoX, isoY } from '../core/view.js';

const ROOT='assets/fx/wall_torches/';
export const HOLDER_CELL=96;
export const HOLDER_COUNT=20;
export const HOLDER_ANGLES=4;
// Wall decoration rather than a full-size freestanding light fixture.
const DISPLAY=40, HANG=70, FLAME_Z=60;
const atlases=new Map(), loading=new Map();

// Five motifs per source sheet; the themed pools deliberately overlap so
// adjacent rooms can mix matching blackiron, gilded, bone or root variants.
export const TORCH_STYLES=Object.freeze({
  catacombs:[0,4,5,8,10,12,13,15,17,18],
  frozen:[1,5,6,10,15,19],
  ice_temple:[1,5,10,15,19],
  molten:[2,4,7,9,12],
  fungal:[3,14,18],
  sunken:[0,10,13,14,19],
  blood:[2,7,9,18],
  ashen:[2,4,5,9,18],
  void:[0,10,15,19],
  gilded:[1,6,11,16],
  plague:[3,9,14,18],
  sewers:[3,9,13,14],
  crystal_castle:[1,10,16,19],
  velscours_castle:[2,6,11,16],
  velscours_temple:[1,6,11,16],
  crystal:[1,10,16,19],
  desert:[1,6,16],
  shadow:[0,5,10,18],
  forge:[2,4,5,7],
  abyss:[2,7,9,12],
  thorn:[3,14],
  storm:[1,5,10,16],
  obsidian:[2,5,7,15],
  flesh:[3,9,18],
  serpent:[3,14,19],
  shattered:[0,4,10,18],
  library:[0,1,10,16],
  necropolis:[2,4,12,18],
  cathedral:[1,6,11,16],
  amber:[1,6,16],
  desert_temple:[1,6,16],
  hell:[2,7,9,12,18],
  astral_plane:[0,10,16,19],
  heavenly:[1,6,11,16],
  throne:[2,7,9,18],
  // The outdoor biome uses its separate freestanding light fixtures.
});
const DEFAULT_STYLES=[0,5,10,15];
const PALETTE=Object.freeze({
  ice_temple:'#86d6ff',frozen:'#a6dbff',hell:'#ff782b',molten:'#ff782b',
  astral_plane:'#ad9bff',void:'#ac7cfa',heavenly:'#ffe3a0',
  desert_temple:'#ffc56a',desert:'#ffc56a',blood:'#ff6143',
  throne:'#ff6b30',storm:'#99bbff',sewers:'#a8ff60',
  crystal_castle:'#b49cff',crystal:'#9cecff',velscours_temple:'#7aa8ff'
});
const imageURL=i=>ROOT+'holders_'+(i+1)+'.webp';
function fetchAtlas(sheet) {
  if(loading.has(sheet))return loading.get(sheet);
  const promise=new Promise(resolve=>{
    if(typeof Image==='undefined'){resolve(null);return;}
    const img=new Image();
    img.onload=()=>{
      if(img.naturalWidth===HOLDER_CELL*4 && img.naturalHeight===HOLDER_CELL*5){
        atlases.set(sheet,img);resolve(img);
      }else{console.warn('Wall torch atlas has incorrect dimensions',sheet);resolve(null);}
    };
    img.onerror=()=>{console.warn('Wall torch artwork unavailable',imageURL(sheet));resolve(null);};
    img.src=imageURL(sheet);
  });
  loading.set(sheet,promise);
  return promise;
}
export function preloadWallTorchHolders(biome) {
  const id=typeof biome==='string'?biome:biome?.id;
  const styles=TORCH_STYLES[id] || DEFAULT_STYLES;
  return Promise.all([...new Set(styles.map(i=>Math.floor(i/5)))].map(fetchAtlas));
}
function design(t,biome) {
  if(t.holderStyle!==undefined)return t.holderStyle;
  const styles=TORCH_STYLES[biome?.id] || DEFAULT_STYLES;
  // Deterministic per-light variation: never switches as the camera moves.
  const hash=(Math.imul(Math.round((t.mountX??t.x)*16),73856093)^
    Math.imul(Math.round((t.mountY??t.y)*16),19349663))>>>0;
  return t.holderStyle=styles[hash%styles.length];
}

/** View 0/1 faces into the room on the rear x/y walls; view 2/3
 * faces into the room on the front y/x walls. Do not mirror the sprites.
 * f is the constant-X wall (/ on screen); b constant-Y (\\ on screen).
 */
export function holderAngle(dir,front=false){
  return dir==='f'?(front?3:0):(front?2:1);
}
function placement(t){
  const frame=holderAngle(t.dir,t.front);
  const wallX=isoX(t.mountX??t.x,t.mountY??t.y);
  const wallY=isoY(t.mountX??t.x,t.mountY??t.y);
  const plateLeft=frame===0||frame===2;
  return {frame,x:wallX-(plateLeft?.22:.78)*DISPLAY,y:wallY-HANG,
    w:DISPLAY,h:DISPLAY};
}
export function wallTorchRect(t){
  const q=placement(t);
  return [q.x,q.y,q.w,q.h];
}
export function drawWallTorch(ctx,t,biome,time,alpha=1){
  if(!t || !Number.isFinite(t.x) || !Number.isFinite(t.y))return;
  const id=design(t,biome),sheet=Math.floor(id/5),row=id%5;
  const img=atlases.get(sheet),p=placement(t);
  ctx.save();
  ctx.globalAlpha=alpha;
  if(img){
    ctx.imageSmoothingEnabled=false;
    ctx.drawImage(img,p.frame*HOLDER_CELL,row*HOLDER_CELL,HOLDER_CELL,HOLDER_CELL,
      p.x,p.y,p.w,p.h);
  }
  // The supplied holders are unlit. Flame/glow is placed above the mouth
  // of the holder's metal cup; the World owns light/particle simulation.
  const fx=isoX(t.x,t.y),fy=isoY(t.x,t.y)-(t.flameZ??FLAME_Z);
  const flicker=Math.sin(time*13+t.x*5+t.y*3)*.8+
    Math.sin(time*19+t.y*2)*.4;
  const c=PALETTE[biome?.id] || biome?.torch || '#ffae4d';
  ctx.globalCompositeOperation='lighter';
  ctx.globalAlpha=alpha*.23;
  ctx.fillStyle=c;ctx.beginPath();ctx.ellipse(fx,fy-5,8,10,0,0,Math.PI*2);ctx.fill();
  ctx.globalCompositeOperation='source-over';
  ctx.globalAlpha=alpha;
  ctx.fillStyle=c;
  ctx.beginPath();ctx.moveTo(fx-3,fy+2);ctx.quadraticCurveTo(fx-5,fy-6,fx+flicker,fy-13-flicker);
  ctx.quadraticCurveTo(fx+6,fy-3,fx+3,fy+2);ctx.closePath();ctx.fill();
  ctx.fillStyle='#fff1ad';
  ctx.beginPath();ctx.ellipse(fx,fy-1,1.35,3.3,0,0,Math.PI*2);ctx.fill();
  ctx.restore();
}
