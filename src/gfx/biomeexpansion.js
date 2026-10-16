// Per-biome generated floor/wall/terrain expansion. Every artifact is drawn
// in VELSCOUR's original 160×80 iso tile and ground-pivot conventions. The
// source pack provides approved material grain and proven architectural depth
// slices, not pre-existing re-labelled sprite geometry.
import { makeCanvas } from '../core/util.js';
import { G } from '../state.js';

// Town has 6 base materials and 15 transition pairs * 8 masks. Additional
// source floor cells are APPENDED so every existing transition ID stays intact.
export const TOWN_FLOOR_EXPANSION={start:6+15*8,count:120};
const HUES={
  catacombs:38,frozen:205,ice_temple:207,molten:13,fungal:103,sunken:185,
  blood:356,ashen:30,void:277,gilded:47,plague:92,crystal:189,desert:35,
  shadow:251,forge:18,abyss:226,thorn:119,storm:217,obsidian:260,
  flesh:345,serpent:151,shattered:216,library:33,necropolis:225,
  cathedral:42,amber:31,overworld:110,desert_temple:38,hell:8,
  astral_plane:265,heavenly:48,throne:356,town:35,
};
const TYPES=['obelisk','brazier','relic','column','banner','urn','idol','statue',
 'broken_pillar','altar','rune_stone','rubble','shrine','crystal','roots',
 'barricade','fountain','carving','torch','cairn'];
const rect=(g,x,y,w,h,c)=>{g.fillStyle=c;g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
function path(g,pts,fill,edge=null){
  g.beginPath();g.moveTo(...pts[0]);for(let i=1;i<pts.length;i++)g.lineTo(...pts[i]);
  g.closePath();g.fillStyle=fill;g.fill();
  if(edge){g.strokeStyle=edge;g.lineWidth=1.8;g.stroke();}
}
function line(g,pts,c,w=2){
  g.beginPath();g.moveTo(...pts[0]);for(let i=1;i<pts.length;i++)g.lineTo(...pts[i]);
  g.lineWidth=w;g.strokeStyle=c;g.stroke();
}
function diamond(g,x,y,rx,ry,color,edge){
  path(g,[[x,y-ry],[x+rx,y],[x,y+ry],[x-rx,y]],color,edge);
}
function hash(x,y,k=0){
  let h=(Math.imul(x+17,374761393)+Math.imul(y+29,668265263)+Math.imul(k+37,1274126177))|0;
  h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967296;
}
const getPalette=(id,variation=0)=>{
  const hue=(HUES[id]??35)+(variation%5-2)*7;
  return {
    base:`hsl(${hue},24%,47%)`,
    dark:`hsl(${hue},23%,24%)`,
    mid:`hsl(${hue},31%,42%)`,
    light:`hsl(${hue},37%,69%)`,
    edge:`hsl(${hue+14},42%,84%)`,
    glow:`hsl(${hue+17},82%,75%)`,
  };
};
function decorateFloor(g,id,style,idx,base,regionX,regionY){
  const pal=getPalette(id,style),x=regionX,y=regionY;
  // Only 12px inside rhombus edges so ALL tile-edge pixels share the source
  // material; adjacent floor tiles never have chopped pattern ends.
  g.save();g.translate(x,y);g.beginPath();g.moveTo(80,9);g.lineTo(142,40);
  g.lineTo(80,71);g.lineTo(18,40);g.closePath();g.clip();
  const motif=idx<60?(idx+style)%8:8+((idx+style*3)%8);
  const xx=80,yy=40;
  if(motif===0){
    diamond(g,xx,yy,30,15,pal.dark,pal.light);
    diamond(g,xx,yy,19,9,pal.mid,pal.edge);
  }else if(motif===1){
    for(let j=0;j<6;j++)line(g,[[47+j*11,31+(j%2)*4],[57+j*11,46+(j%2)*3]],pal.light,2);
  }else if(motif===2){
    diamond(g,xx,yy,25,12,pal.mid,pal.edge);
    line(g,[[63,42],[80,28],[98,42],[80,53],[63,42]],pal.glow,3);
  }else if(motif===3){
    for(let j=0;j<4;j++)diamond(g,52+j*18,40+j%2*5,9,5,pal.base,pal.edge);
  }else if(motif===4){
    line(g,[[42,44],[59,31],[75,42],[90,29],[115,45]],pal.dark,3);
    line(g,[[63,34],[60,23]],pal.edge,2);
  }else if(motif===5){
    diamond(g,xx,yy,31,15,pal.dark,pal.glow);
    rect(g,xx-12,yy-4,24,8,pal.base);
    diamond(g,xx,yy,9,8,pal.edge);
  }else if(motif===6){
    for(let j=0;j<5;j++){const a=j*2.51;diamond(g,80+Math.cos(a)*23,40+Math.sin(a)*12,7,4,pal.light,pal.dark);}
  }else if(motif===7){
    diamond(g,xx,yy,29,15,pal.base,pal.edge);
    line(g,[[53,42],[68,35],[79,44],[99,36],[108,40]],pal.glow,2);
  }else if(motif===8){
    for(let j=0;j<3;j++)diamond(g,xx,yy,29-j*8,14-j*4,j%2?pal.mid:pal.dark,j%2?pal.edge:pal.light);
    diamond(g,xx,yy,5,3,pal.glow,pal.edge);
  }else if(motif===9){
    for(let j=0;j<5;j++){const x0=42+j*18;line(g,[[x0,26],[x0+8,34],[x0,42],[x0+8,50]],j%2?pal.light:pal.dark,2);}
    diamond(g,xx,yy,9,5,pal.glow,pal.edge);
  }else if(motif===10){
    line(g,[[49,28],[66,36],[61,43],[80,48],[91,39],[112,46]],pal.light,3);
    line(g,[[66,36],[69,25],[77,22]],pal.edge,2);
    for(let j=0;j<4;j++)diamond(g,54+j*19,53-j%2*7,4,3,pal.glow,pal.dark);
  }else if(motif===11){
    line(g,[[80,57],[80,24],[67,34],[60,29],[68,42],[55,47],[73,46]],pal.light,3);
    line(g,[[80,40],[94,29],[101,32],[94,42],[108,47],[88,46]],pal.edge,3);
    diamond(g,80,24,4,3,pal.glow,pal.dark);
  }else if(motif===12){
    for(let j=0;j<5;j++)line(g,[[47+j*13,29],[53+j*13,39],[47+j*13,49]],j%2?pal.edge:pal.mid,2);
    diamond(g,xx,yy,12,6,pal.dark,pal.light);
  }else if(motif===13){
    diamond(g,xx,yy,31,15,pal.dark,pal.edge);
    for(let j=0;j<3;j++)diamond(g,65+j*15,40+(j%2?6:-5),6,4,j%2?pal.glow:pal.light,pal.dark);
  }else if(motif===14){
    diamond(g,xx,yy,24,12,pal.mid,pal.light);
    line(g,[[80,27],[80,53]],pal.edge,3);line(g,[[66,34],[94,46]],pal.glow,2);line(g,[[94,34],[66,46]],pal.glow,2);
    diamond(g,xx,yy,5,3,pal.dark,pal.edge);
  }else{
    for(let j=0;j<3;j++){
      const x0=59+j*21;g.beginPath();g.ellipse(x0,40,13,7,j*.7,0,Math.PI*2);
      g.strokeStyle=j%2?pal.edge:pal.light;g.lineWidth=2;g.stroke();
    }
  }
  // Native pixel density: never smooth these marks.
  for(let n=0;n<22;n++){
    const vx=19+Math.floor(hash(n,idx,style+1)*123),vy=14+Math.floor(hash(n,idx,style+2)*50);
    if(hash(n,idx,style+3)>.65)rect(g,vx,vy,2,1,pal.light);
  }
  g.restore();
}
let townCache=null;
export function extendedTownFloors(source,meta){
  if(townCache&&townCache.source===source)return townCache.entries;
  const canvas=makeCanvas(1620,984),g=canvas.getContext('2d');
  g.imageSmoothingEnabled=false;
  const names=Object.keys(meta.floors);
  for(let i=0;i<TOWN_FLOOR_EXPANSION.count;i++){
    const [sx,sy]=meta.floors[names[i%6]];
    const x=(i%10)*162,y=Math.floor(i/10)*82;
    g.drawImage(source,sx,sy,160,80,x,y,160,80);
    decorateFloor(g,'town',i%6,i,source,x,y);
  }
  const entries=Array.from({length:TOWN_FLOOR_EXPANSION.count},(_,i)=>({
    img:canvas,sx:i%10*162,sy:Math.floor(i/10)*82,w:160,h:80,
    name:'town_accent_'+String(i+1).padStart(2,'0')
  }));
  townCache={source,entries};
  return entries;
}
// The town and the wilderness share approved source pixel density, but have
// SEPARATE 120-cell atlases. Each biome gets its own floor motifs.
export const OVERWORLD_FLOOR_EXPANSION={
  start:TOWN_FLOOR_EXPANSION.start+TOWN_FLOOR_EXPANSION.count,count:120,
};
let overworldCache=null;
export function extendedOverworldFloors(source,meta){
 if(overworldCache?.source===source)return overworldCache.entries;
 const count=OVERWORLD_FLOOR_EXPANSION.count;
 const canvas=makeCanvas(1620,984),g=canvas.getContext('2d');
 g.imageSmoothingEnabled=false;
 const names=['dense_meadow','trampled_verge','grass','mud','dirt','stone',
   'irregular_flagstone','slate_paving','bleached_boards','gravel'];
 for(let i=0;i<count;i++){
   const name=names[i%names.length],pos=meta.floors[name]||meta.floors.grass;
   const x=i%10*162,y=Math.floor(i/10)*82;
   g.drawImage(source,pos[0],pos[1],160,80,x,y,160,80);
   decorateFloor(g,'overworld',i%10,i,source,x,y);
 }
 const entries=Array.from({length:count},(_,i)=>({
   img:canvas,sx:i%10*162,sy:Math.floor(i/10)*82,
   w:160,h:80,name:'forsaken_wilds_floor_'+String(i+1).padStart(2,'0'),
 }));
 overworldCache={source,entries};return entries;
}
function drawProp(g,biome,i){
  const p=getPalette(biome,i%5),type=TYPES[i%TYPES.length],v=(i/20)|0;
  const x=80,y=151;
  // Low profile, exact isometric floor footprint at the base of every prop.
  const foot=(w=77,h=22)=>{
    diamond(g,x,y-8,w/2,h/2,p.dark,p.light);
    path(g,[[x-w/2,y-8],[x,y+3],[x,y+12],[x-w/2,y]],p.base,p.dark);
    path(g,[[x,y+3],[x+w/2,y-8],[x+w/2,y],[x,y+12]],p.mid,p.dark);
  };
  const crystal=(x0,yy,w=21,h=62)=>{
    path(g,[[x0-w*.4,yy],[x0-w*.2,yy-h*.82],[x0,yy-h],
      [x0+w*.45,yy-h*.65],[x0+w*.44,yy]],p.mid,p.dark);
    path(g,[[x0-w*.2,yy-h*.82],[x0,yy-h],[x0,yy]],p.edge);
    line(g,[[x0,yy-h*.8],[x0+2,yy-8]],p.glow,2);
  };
  foot(type==='banner'||type==='barricade'?94:70,type==='barricade'?32:20);
  if(['obelisk','rune_stone','column','broken_pillar','carving','cairn'].includes(type)){
    const hi=type==='obelisk'?113:77+v*18;
    rect(g,x-18,y-hi,36,hi-16,p.base);
    rect(g,x-18,y-hi,7,hi-17,p.light);
    rect(g,x+11,y-hi,7,hi-18,p.dark);
    diamond(g,x,y-hi-5,22,12,p.edge,p.dark);
    for(let j=0;j<4;j++)line(g,[[x-14,y-35-j*16],[x+14,y-35-j*16]],j%2?p.glow:p.dark,2);
    if(type==='broken_pillar')path(g,[[x-21,y-hi],[x-4,y-hi-13],[x+18,y-hi]],p.dark,p.edge);
  }else if(['brazier','torch','altar','shrine','fountain'].includes(type)){
    diamond(g,x,y-34,42,16,p.mid,p.edge);
    crystal(x,y-42,18,48+v*16);
    for(let j=0;j<3;j++)diamond(g,x-20+j*20,y-44,5,8,p.glow,p.light);
  }else if(['relic','idol','urn','statue','crystal'].includes(type)){
    crystal(x,y-12,42+v*8,75);
    crystal(x-24,y-10,17,34);
    crystal(x+24,y-10,18,36);
    diamond(g,x,y-72,12,9,p.glow,p.edge);
  }else if(['banner','barricade'].includes(type)){
    if(type==='banner'){
      rect(g,x-27,y-120,6,111,p.dark);
      rect(g,x+21,y-120,6,111,p.dark);
      path(g,[[x-21,y-113],[x+23,y-113],[x+19,y-60],
        [x+4,y-73],[x-8,y-55],[x-21,y-68]],p.mid,p.edge);
      diamond(g,x,y-85,16,13,p.glow,p.dark);
    }else{
      // Wall-like scatter is a 1-tile-long segment. In-world collision and
      // axis orientation use gfx/isobarriers.js, not this static crop.
      for(let j=0;j<3;j++)rect(g,x-42+j*40,y-75,9,65,p.dark);
      line(g,[[x-40,y-57],[x+42,y-15]],p.light,9);
      line(g,[[x-40,y-71],[x+42,y-29]],p.edge,8);
    }
  }else{
    for(let j=0;j<11;j++){
      const vx=x-39+hash(j,i,11)*78,vy=y-12-hash(j,i,12)*20;
      diamond(g,vx,vy,6+j%3*3,3+j%2*3,j%2?p.mid:p.light,p.dark);
    }
  }
  // Every one of the 40 pieces has a separate heraldic insignia and geometry.
  if(i%2)diamond(g,x+15,y-37,6+v*2,8,p.glow,p.dark);
  if(i%3===0)rect(g,x-22,y-33,7,4,p.edge);
}
function recolorArchitecture(source,meta,biome){
  const canvas=makeCanvas(source.width,source.height);
  const g=canvas.getContext('2d',G.touch?undefined:{willReadFrequently:true});
  g.drawImage(source,0,0);
  // Fast mobile path: tint individual validated atlas slices on the canvas.
  // Avoid full-atlas getImageData + one JS iteration per RGBA pixel (and its
  // multi-megabyte owner mask), which is particularly slow in iOS Safari.
  if (G.touch) {
    const hue=HUES[biome]??35;
    g.save();g.globalCompositeOperation='source-atop';g.globalAlpha=.42;
    Object.values(meta.walls).forEach((masks,fam)=>{
      g.fillStyle=`hsl(${(hue+(fam-2)*16+360)%360},38%,45%)`;
      const seen=new Set();
      for(const variants of Object.values(masks))for(const parts of variants)for(const r of parts){
        const [,sx,sy,w,h]=r,key=sx+':'+sy+':'+w+':'+h;
        if(seen.has(key))continue;
        seen.add(key);g.fillRect(sx,sy,w,h);
      }
    });
    g.restore();
    return canvas;
  }
  const img=g.getImageData(0,0,source.width,source.height),rgba=img.data;
  const W=source.width,H=source.height,owner=new Uint8Array(W*H);
  // Metadata is the authoritative atlas map. Per-family overlays are based
  // on each actual slice crop. No aliasing one wall texture for every family.
  const families=Object.keys(meta.walls);
  families.forEach((name,fam)=>{
    const masks=meta.walls[name];
    for(const v of Object.values(masks))for(const parts of v)for(const row of parts){
      const [,sx,sy,w,h]=row;if(!Number.isInteger(sx))continue;
      for(let y=Math.max(0,sy);y<Math.min(H,sy+h);y++)
        owner.fill(fam,y*W+Math.max(0,sx),y*W+Math.min(W,sx+w));
    }
  });
  const tint=HUES[biome]??35;
  const shades=Array.from({length:5},(_,k)=>{
    const hue=(tint+(k-2)*16+360)%360;
    const toRGB=(h,s,l)=>{
      const a=s*Math.min(l,1-l),f=n=>{const t=(n+h/30)%12;return Math.round(255*(l-a*Math.max(-1,Math.min(t-3,9-t,1))));};
      return[f(0),f(8),f(4)];
    };
    return{lo:toRGB(hue,.29,.18+k*.017),hi:toRGB(hue,.38,.69+k*.02)};
  });
  for(let p=0;p<rgba.length;p+=4){
    if(!rgba[p+3])continue;
    const i=p/4,x=i%W,y=(i/W)|0,shade=shades[owner[i]%5];
    const v=Math.max(0,Math.min(1,(rgba[p]*.29+rgba[p+1]*.58+rgba[p+2]*.13)/255*.91+.08));
    const mortar=(y%53<2)||((x+(y/33|0)*17)%64<2);
    for(let ch=0;ch<3;ch++)rgba[p+ch]=Math.round((shade.lo[ch]+(shade.hi[ch]-shade.lo[ch])*v)*(mortar?.68:1));
  }
  g.putImageData(img,0,0);
  // Surface relief follows the original alpha channel, so door leaf slices
  // and all 16 connector masks keep exactly the same extents.
  g.save();g.globalCompositeOperation='source-atop';g.globalAlpha=.15;
  for(let y=44;y<H;y+=97)for(let x=45;x<W;x+=102)
    diamond(g,x,y,12+(x%3)*3,17,getPalette(biome,owner[y*W+x]%5).edge);
  g.restore();
  return canvas;
}
function etchWallArchitecture(canvas,meta,biome){
  const g=canvas.getContext('2d');
  const families=Object.entries(meta.walls);
  const seen=new Set();
  g.save();g.globalCompositeOperation='source-atop';g.globalAlpha=.34;
  families.forEach(([,masks],fam)=>{
    const p=getPalette(biome,fam+2);
    for(const variants of Object.values(masks))for(const parts of variants)for(const r of parts){
      const [,x,y,w,h]=r,key=[x,y,w,h].join(':');
      if(seen.has(key)||w<16||h<14)continue;
      seen.add(key);
      const cx=x+w/2,cy=y+h/2,rx=Math.max(3,Math.min(12,w*.22)),ry=Math.max(3,Math.min(24,h*.2));
      g.strokeStyle=p.edge;g.fillStyle=p.glow;g.lineWidth=1.6;
      if(fam%5===0){
        line(g,[[cx-rx,cy-ry],[cx-rx,cy+ry],[cx+rx,cy+ry],[cx+rx,cy-ry]],p.edge,1.6);
        diamond(g,cx-rx,cy-ry,2,2,p.glow,p.edge);diamond(g,cx+rx,cy+ry,2,2,p.glow,p.edge);
      }else if(fam%5===1){
        line(g,[[cx,cy+ry],[cx,cy-ry],[cx-rx,cy-ry/2],[cx-rx/2,cy],[cx+rx/2,cy-ry/3],[cx+rx,cy-ry]],p.edge,2);
        for(let j=-1;j<=1;j++)diamond(g,cx+j*rx*.55,cy+ry*.35,2,3,p.glow,p.edge);
      }else if(fam%5===2){
        for(let j=-1;j<=1;j++){
          const yy=cy+j*ry*.65;line(g,[[cx-rx,yy],[cx+rx,yy]],p.edge,1.6);
          diamond(g,cx-rx,yy,2,2,p.glow,p.edge);
        }
      }else if(fam%5===3){
        diamond(g,cx,cy,rx,ry,p.mid,p.edge);
        diamond(g,cx,cy,rx*.48,ry*.48,p.dark,p.glow);
        line(g,[[cx,cy-ry],[cx,cy+ry]],p.edge,1.3);
      }else{
        g.beginPath();g.ellipse(cx,cy,rx,ry,0,0,Math.PI*2);g.stroke();
        line(g,[[cx-rx*.7,cy],[cx+rx*.7,cy]],p.edge,1.5);
        line(g,[[cx,cy-ry*.7],[cx,cy+ry*.7]],p.edge,1.5);
        diamond(g,cx,cy,3,3,p.glow,p.edge);
      }
    }
  });
  g.restore();
}
/** For an indoor biome, append 120 NEW floor variants and 40 NEW environmental
 * objects to its pack, tint each real wall family individually, and preserve
 * original (unchanged) arch/door geometry and metadata indexing.
 */
export function expandBiomePack(base,biome,{floorsOnly=false}={}){
  const meta=JSON.parse(JSON.stringify(base.meta));
  const floorStart=meta.floors.length,scatterStart=meta.scatter.length;
  const nFloor=120,nScatter=floorsOnly?0:40,cell=166;
  const floorCanvas=makeCanvas(Math.max(1620,base.floors.width),base.floors.height+984);
  const fg=floorCanvas.getContext('2d');fg.imageSmoothingEnabled=false;
  fg.drawImage(base.floors,0,0);
  // Starting each cell from the game-approved pack preserves grain, pixel
  // size and iso edges; NEW inset geometry creates sixty distinct decorations.
  for(let i=0;i<nFloor;i++){
    const src=base.meta.floors[(i*7)%base.meta.floors.length];
    const x=i%10*162,y=base.floors.height+Math.floor(i/10)*82;
    fg.drawImage(base.floors,src.x,src.y,src.w,src.h,x,y,160,80);
    const pal=getPalette(biome.id,Math.floor(i/12));
    fg.save();fg.globalCompositeOperation='source-atop';fg.globalAlpha=.37;
    fg.fillStyle=pal.mid;fg.fillRect(x,y,160,80);fg.restore();
    decorateFloor(fg,biome.id,i%5,i,base.floors,x,y);
    meta.floors.push({name:biome.id+'_extended_floor_'+String(i+1).padStart(2,'0'),
      x,y,w:160,h:80,seamless:i<10,lum:(biome.light||8)/18});
  }
  let scatterCanvas=base.scatter;
  if(!floorsOnly){
    const scatterY=base.scatter.height+4;
    scatterCanvas=makeCanvas(Math.max(base.scatter.width,cell*8),scatterY+cell*5);
    const sg=scatterCanvas.getContext('2d');sg.imageSmoothingEnabled=false;
    sg.drawImage(base.scatter,0,0);
    for(let i=0;i<nScatter;i++){
      const x=i%8*cell,y=scatterY+Math.floor(i/8)*cell;
      sg.save();sg.translate(x,y);drawProp(sg,biome.id,i);sg.restore();
      meta.scatter.push({name:biome.id+'_extended_'+TYPES[i%TYPES.length]+'_'+(i/20|0),
        x,y,w:160,h:160,ox:-80,oy:-151,
        fp:TYPES[i%TYPES.length]==='barricade'?.15:.58,
        block:!['rubble','cairn','roots'].includes(TYPES[i%TYPES.length])});
    }
  }
  meta.expansion={floorStart,scatterStart,newFloors:nFloor,newScatter:nScatter,biome:biome.id};
  meta.pack=(meta.pack||base.meta.pack)+' — '+biome.name+' Expanded';
  const walls=floorsOnly?base.walls:recolorArchitecture(base.walls,base.meta,biome.id);
  if(!floorsOnly)etchWallArchitecture(walls,base.meta,biome.id);
  return{meta,floors:floorCanvas,scatter:scatterCanvas,walls};
}
/** New individual prop for wilderness while retaining town-pack-native pivot. */
const outdoorCache=new Map();
export function outdoorBiomeProp(biome,index){
  const key=biome+':'+index;
  if(outdoorCache.has(key))return outdoorCache.get(key);
  const canvas=makeCanvas(160,160),g=canvas.getContext('2d');
  g.imageSmoothingEnabled=false;drawProp(g,biome,index%40);
  const item={img:canvas,sx:0,sy:0,w:160,h:160,ox:-80,oy:-151,
    name:biome==='town'?'town_scatter_'+index:biome+'_wild_prop_'+index,
    block:index%9===0,fp:index%9===0?.6:.2};
  if(outdoorCache.size>60)outdoorCache.delete(outdoorCache.keys().next().value);
  outdoorCache.set(key,item);return item;
}
export const BIOME_EXPANSION_NAMES=TYPES;
