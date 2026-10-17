// World renderer: floors, decals, depth-sorted walls/entities, effects, lighting, minimap.
import { G } from '../state.js';
import { camera, isoX, isoY, HW, HH, TW, TH } from '../core/view.js';
import { makeCanvas, TAU, clamp, rgba, shade, hexToRgb } from '../core/util.js';
import { drawDecals, drawEffects, drawParticles, drawTexts, lights, glowSprite } from '../gfx/vfx.js';
import { orbitShieldDepth } from '../gfx/lancershields.js';
import { drawWallTorch, wallTorchRect } from '../gfx/walltorches.js';
import { drawWallHanging, wallHangingRect } from '../gfx/wallhangings.js';
import { replacementImage } from '../core/replacementart.js';
import { classSprite } from '../core/assets.js';
import { pixelSprite } from '../gfx/pixelart.js';
import { gritAt } from '../gfx/grit.js';
import { enemyImage } from '../core/enemyart.js';
import { drawLootLabels } from './loot.js';

let lightCanvas = null, vignette = null, vigKey = '';
const transitionSprites = new Map();
// Non-vendor town residents use the original 25-identity townsfolk animation pack.
// Vendors keep their existing painted replacement sprites.
// Cache original PNG sheets and recolored variants separately. Recolored
// sheets are Canvas elements, not HTMLImageElements (no .complete/.naturalWidth).
const TOWN_FRAME_W=128, TOWN_FRAME_H=192;
const townSheets=new Map();
const townPaletteSheets=new Map();
function townSheet(id) {
  if(!id)return null;
  let img=townSheets.get(id);
  if(!img){
    img=new Image();
    townSheets.set(id,img);
    img.src=`assets/sprites/townsfolk/${id}.png`;
  }
  return img;
}
export function preloadTownSheets(ids) {
  const unique=[...new Set(ids.filter(Boolean))];
  return Promise.all(unique.map(id=>{
    const img=townSheet(id);
    if(img.complete)return Promise.resolve(img.naturalWidth>0);
    return new Promise(resolve=>{
      img.addEventListener('load',()=>resolve(true),{once:true});
      img.addEventListener('error',()=>resolve(false),{once:true});
    });
  }));
}
function townPaletteSheet(id,img,palette) {
  if(!img?.complete||!img.naturalWidth||!palette)return img;
  const key=`${id}:${palette.hue||0}:${palette.sat??1}:${palette.light||0}`;
  if(townPaletteSheets.has(key))return townPaletteSheets.get(key);
  const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;
  const q=c.getContext('2d',{willReadFrequently:true});q.drawImage(img,0,0);
  const pixels=q.getImageData(0,0,c.width,c.height),d=pixels.data,hueShift=(palette.hue||0)/360,hairShift=hueShift*.38,satScale=palette.sat??1,light=palette.light||0;
  const rgbToHsv=(r,g,b)=>{r/=255;g/=255;b/=255;const max=Math.max(r,g,b),min=Math.min(r,g,b),delta=max-min;let h=0;if(delta){if(max===r)h=((g-b)/delta)%6;else if(max===g)h=(b-r)/delta+2;else h=(r-g)/delta+4;h/=6;if(h<0)h++;}return [h,max?delta/max:0,max];};
  const hsvToRgb=(h,s,v)=>{const k=n=>(n+h*6)%6,f=n=>v-v*s*Math.max(0,Math.min(k(n),4-k(n),1));return [f(5),f(3),f(1)];};
  for(let y=0;y<c.height;y++){const localY=y%TOWN_FRAME_H;for(let x=0;x<c.width;x++){const i=(y*c.width+x)*4;if(d[i+3]<8)continue;let [h,s,v]=rgbToHsv(d[i],d[i+1],d[i+2]);const skin=h>=.012&&h<=.12&&v>.32;if(localY>38&&s>.16&&!skin)h=(h+hueShift+1)%1;else if(localY>8&&localY<66&&s>.14&&v<.46)h=(h+hairShift+1)%1;s=Math.max(0,Math.min(1,s*satScale));v=Math.max(0,Math.min(1,v+light));const rgb=hsvToRgb(h,s,v);d[i]=Math.round(rgb[0]*255);d[i+1]=Math.round(rgb[1]*255);d[i+2]=Math.round(rgb[2]*255);}}
  q.putImageData(pixels,0,0);townPaletteSheets.set(key,c);
  if(townPaletteSheets.size>48)townPaletteSheets.delete(townPaletteSheets.keys().next().value);
  return c;
}
/** A decoded PNG or a palette-adjusted Canvas both satisfy the frame contract. */
export function townFrameReady(sheet,count=11) {
  const width=sheet?.naturalWidth||sheet?.width||0,height=sheet?.naturalHeight||sheet?.height||0;
  return width>=TOWN_FRAME_W*count && height>=TOWN_FRAME_H;
}
export function townSprite(id,palette=null) {
  const img=townSheet(id);
  return img?.complete&&img.naturalWidth ? townPaletteSheet(id,img,palette) : null;
}
function drawTownMood(ctx,n,x,y){
  if(!n.townMood||n.townMoodT<=0)return;
  const bob=Math.sin(G.time*8)*2,px=Math.round(x+18),py=Math.round(y-70+bob);ctx.save();
  if(n.townMood==='affection'||n.townMood==='celebration'){
    ctx.fillStyle=n.townMood==='affection'?'#f24e72':'#ffd45c';
    for(const [dx,dy,w,h] of [[3,0,5,3],[1,3,9,3],[2,6,7,3],[4,9,3,2]])ctx.fillRect(px+dx-7,py+dy-5,w,h);
    if(n.townMood==='celebration'){ctx.fillStyle='#fff0a0';for(let i=0;i<3;i++){const a=G.time*3+i*2.1;ctx.fillRect(px+Math.cos(a)*12,py+Math.sin(a)*10,3,3);}}
  }else if(n.townMood==='argument'){
    ctx.fillStyle='#ffc14d';ctx.fillRect(px-7,py-7,14,14);ctx.fillStyle='#42251d';
    ctx.fillRect(px-4,py-3,2,2);ctx.fillRect(px+2,py-3,2,2);ctx.fillRect(px-3,py+3,6,2);
    ctx.fillStyle='#e95039';ctx.fillRect(px-5,py-6,4,2);ctx.fillRect(px+1,py-6,4,2);
  }else if(n.townMood==='fight'){
    ctx.lineCap='square';ctx.lineWidth=3;ctx.strokeStyle='#d9e5ec';ctx.beginPath();ctx.moveTo(px-6,py+6);ctx.lineTo(px+6,py-6);ctx.moveTo(px-6,py-6);ctx.lineTo(px+6,py+6);ctx.stroke();
    ctx.fillStyle='#8b5831';for(const [dx,dy] of [[-8,8],[5,-8],[5,8],[-8,-8]])ctx.fillRect(px+dx,py+dy,4,3);
    ctx.fillStyle='#fff3a0';for(let i=0;i<4;i++){const a=G.time*7+i*Math.PI/2;ctx.fillRect(Math.round(px+Math.cos(a)*11),Math.round(py+Math.sin(a)*10),3,3);}
  }else if(n.townMood==='royal'){
    ctx.fillStyle='#f2c75a';ctx.fillRect(px-8,py-3,16,7);ctx.fillRect(px-7,py-7,3,5);ctx.fillRect(px-1,py-10,3,8);ctx.fillRect(px+5,py-7,3,5);
    ctx.fillStyle='#fff0a0';for(let i=0;i<4;i++){const a=G.time*2+i*Math.PI/2;ctx.fillRect(Math.round(px+Math.cos(a)*14),Math.round(py+Math.sin(a)*9),2,2);}
  }else if(n.townMood==='alarm'){
    const pulse=1+Math.sin(G.time*9)*.15;ctx.translate(px,py);ctx.scale(pulse,pulse);ctx.fillStyle='#d84c35';ctx.fillRect(-2,-11,4,13);ctx.fillRect(-2,5,4,4);ctx.restore();ctx.save();
    ctx.strokeStyle='rgba(229,94,62,.8)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(px,py,13+Math.sin(G.time*5)*2,0,Math.PI*2);ctx.stroke();
  }else if(n.townMood==='grief'){
    ctx.fillStyle='#8fc3d0';ctx.beginPath();ctx.moveTo(px,py-8);ctx.quadraticCurveTo(px+7,py,px,py+7);ctx.quadraticCurveTo(px-7,py,px,py-8);ctx.fill();
    ctx.fillStyle='#f3dd9a';ctx.fillRect(px-11,py+9,4,3);ctx.fillRect(px+7,py+8,4,3);
  }else if(n.townMood==='birth'){
    ctx.fillStyle='#ffd4e3';for(let i=0;i<3;i++){const a=G.time*2+i*2.1;ctx.fillRect(Math.round(px+Math.cos(a)*12),Math.round(py+Math.sin(a)*9),3,3);}
    ctx.fillStyle='#fff2cb';ctx.fillRect(px-1,py-8,3,16);ctx.fillRect(px-7,py-2,15,3);
  }else if(n.townMood==='relief'){
    ctx.fillStyle='#9bd28f';ctx.fillRect(px-7,py-4,14,7);ctx.fillRect(px-4,py-7,8,13);ctx.fillStyle='#e9f5ca';ctx.fillRect(px-2,py-3,4,5);
  }
  ctx.restore();
}

const MATERIALS = [
  [/water|moat|pond|river|stream|lake/, '#75b9be'],
  [/dune|desert|sand(?!stone)/, '#e0bd78'],
  [/gravel|scree|pebble|salt|gypsum|grit|chips/, '#c7b19a'],
  [/clay|mud|earth|loam|silt|wadi|rut|soil/, '#a97952'],
  [/pav|brick|slab|stone|rock|basalt|bedrock|slate|limestone/, '#aaa69a'],
  [/ore|quartz|crystal|gem|seam/, '#8bc4c2'],
  [/ice|snow|frost/, '#b5d9df'],
  [/ash|lava|volcanic/, '#bd7654'],
  [/grass|moss|root|reed|oasis|meadow|lawn|clover|wildflower|battlement|shaded/, '#a2ad72'],
  [/wood|plank|board|palm/, '#c49a60'],
];

function floorMaterial(world, variant) {
  const floor = floorEntry(world, variant);
  const key = `${floor?.material || ''} ${floor?.surface || ''} ${floor?.name || ''}`.toLowerCase();
  for (const [pattern, color] of MATERIALS) if (pattern.test(key)) {
    const material = key.match(pattern)[0];
    if (world.biome?.id === 'castle') {
      const castleColors = {
        water: '#477f8b', grass: '#a4ad6c', gravel: '#c2b69a',
        clay: '#a77b52', mud: '#9b704d', earth: '#ae8155',
        stone: '#a7a69b', brick: '#ae8d70', wood: '#9a7048',
      };
      return { key: material, color: castleColors[material] || color };
    }
    return { key: material, color };
  }
  return null;
}

function stableHash(x, y, salt) {
  let h = Math.imul(x ^ 0x45d9f3b, 0x45d9f3b) ^ Math.imul(y ^ salt, 0x27d4eb2d);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  return (h ^ (h >>> 13)) >>> 0;
}

function transitionSprite(color, size) {
  const key = `${color}:${size}`;
  if (!transitionSprites.has(key)) {
    const sprite = makeCanvas(size, size), g = sprite.getContext('2d');
    g.fillStyle = color; g.fillRect(0, 0, size, size);
    transitionSprites.set(key, sprite);
  }
  return transitionSprites.get(key);
}

/** Cache crisp, deterministic 2–4px flecks on shared edges between unlike materials. */
function buildTransitionParticles(world) {
  if (world.transitionParticles) return world.transitionParticles;
  const { map } = world, particles = [];
  const addEdge = (x, y, variant, nx, ny, nextVariant, x1, y1, x2, y2, salt) => {
    if (map.t[ny * map.w + nx] !== 1) return;
    const a = floorMaterial(world, variant), b = floorMaterial(world, nextVariant);
    if (!a || !b || a.key === b.key) return;
    const hash = stableHash(x, y, salt);
    // Leave gaps along long boundaries so particles read as scattered debris,
    // not a dotted outline around every material patch.
    if (hash % 3 !== 0) return;
    const count = 1 + ((hash >>> 1) % 2);
    const colors = [a.color, b.color];
    for (let i = 0; i < count; i++) {
      const seed = stableHash(x + i * 13, y - i * 7, salt ^ hash);
      // Scatter along and just across the seam instead of making a dotted line.
      const t = 0.12 + ((seed >>> 8) % 77) / 100;
      const offset = ((seed >>> 16) % 9) - 4;
      // Larger flecks survive normal zoom and read as scattered grit at dune
      // and stone seams, rather than a hairline dotted border.
      const size = 3 + ((seed >>> 21) % 4);
      particles.push({ x: x1 + (x2 - x1) * t + offset, y: y1 + (y2 - y1) * t - offset, color: colors[i], size });
    }
  };
  for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) {
    const i = y * map.w + x;
    if (map.t[i] !== 1) continue;
    const cx = (x - y) * HW, cy = (x + y) * HH;
    if (x + 1 < map.w) addEdge(x, y, map.v[i], x + 1, y, map.v[i + 1], cx + HW, cy, cx, cy + HH, 0x1b);
    if (y + 1 < map.h) addEdge(x, y, map.v[i], x, y + 1, map.v[i + map.w], cx, cy + HH, cx - HW, cy, 0x71);
  }
  world.transitionParticles = particles;
  return particles;
}

function drawTransitionParticles(ctx, world, vr) {
  const particles = buildTransitionParticles(world);
  if (!particles.length) return;
  ctx.imageSmoothingEnabled = false;
  for (const particle of particles) {
    if (particle.x < vr.x0 - 2 || particle.x > vr.x1 + 2 || particle.y < vr.y0 - 2 || particle.y > vr.y1 + 2) continue;
    ctx.drawImage(transitionSprite(particle.color, particle.size), particle.x - particle.size / 2, particle.y - particle.size / 2);
  }
}

function floorEntry(world, v) {
  if (world.townTiles) return world.townTiles[v] || world.townTiles[0];
  return world.tileset.floors[v] || world.tileset.floors[0];
}

/** The atlas slice a wall item (a wall arm, an arch slice or a door part) shows now; null for a shut door's leaf. */
function wallSlice(o) {
  if (o.kind !== 'door') return o.r;
  const d = o.door;
  if (o.part === 'leaf' && !d.open) return null;
  return d.art[d.open ? 'open' : 'closed'].find((p) => p.part === o.part) || null;
}
/** Its rect [x, y, w, h] in world px. */
function wallRect(o, k) {
  const r = wallSlice(o);
  return r && [isoX(o.x, o.y) + r.ox * k, isoY(o.x, o.y) + r.oy * k, r.w * k, r.h * k];
}

function drawWall(ctx, o, k, alpha) {
  const r = wallSlice(o);
  if (!r) return;
  if (alpha < 1) ctx.globalAlpha = alpha;
  // 0.25px of overlap hides hairline seams between neighbouring slices
  ctx.drawImage(r.img, r.sx, r.sy, r.w, r.h, isoX(o.x, o.y) + r.ox * k - 0.25, isoY(o.x, o.y) + r.oy * k - 0.25, r.w * k + 0.5, r.h * k + 0.5);
  if (alpha < 1) ctx.globalAlpha = 1;
}

function drawProp(ctx, pr, alpha) {
  const x = isoX(pr.x, pr.y), y = isoY(pr.x, pr.y) - (pr.z || 0);
  if (alpha < 1) ctx.globalAlpha = alpha;
  if (pr.kind === 'flame') {
    // a lit wall torch on a town building: a flickering flame over the pack's unlit torch head
    const fx = x + pr.fx, fy = y + pr.fy, f = Math.sin(G.time * 11 + pr.x * 3) * 0.5 + Math.sin(G.time * 17 + pr.y) * 0.3;
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.55 + f * 0.1;
    ctx.drawImage(glowSprite('#ff9a40'), fx - 20, fy - 26, 40, 40);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#ff7a20';
    ctx.beginPath(); ctx.ellipse(fx, fy - 4 - f, 2.6, 5 + f, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ffe080';
    ctx.beginPath(); ctx.ellipse(fx, fy - 3 - f * 0.5, 1.3, 2.8 + f * 0.5, 0, 0, TAU); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    return;
  }
  if (pr.k) {
    // biome pack scatter: drawn from its ground pivot (ox/oy in native px), maybe mirrored about it
    const s = pr.spr, w = s.w * pr.k, h = s.h * pr.k, dy = y + s.oy * pr.k;
    if (pr.flip) { ctx.save(); ctx.translate(x, 0); ctx.scale(-1, 1); ctx.drawImage(s.img, s.sx, s.sy, s.w, s.h, s.ox * pr.k, dy, w, h); ctx.restore(); }
    else ctx.drawImage(s.img, s.sx, s.sy, s.w, s.h, x + s.ox * pr.k, dy, w, h);
  } else if (pr.sprite) {
    const img = pr._img || (pr._img = pixelSprite(pr.sprite, pr.pal || {}, 4));
    const px = pr.px || 2.4;
    const w = (img.width / 4) * px, h = (img.height / 4) * px;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(x, y, w * 0.35, w * 0.15, 0, 0, TAU); ctx.fill();
    if (pr.sway) {
      ctx.save(); ctx.translate(x, y); ctx.transform(1, 0, Math.sin(G.time * 1.3 + pr.x) * 0.03, 1, 0, 0);
      ctx.drawImage(img, -w / 2, -h + 2, w, h); ctx.restore();
    } else ctx.drawImage(img, x - w / 2, y - h + 2, w, h);
    if (pr.light) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.6 + Math.sin(G.time * 8 + pr.x) * 0.1;
      ctx.drawImage(glowSprite('#ffb050'), x - 22, y - h - 14, 44, 44);
      ctx.globalCompositeOperation = 'source-over';
    }
  }
  if (alpha < 1 || pr.light) ctx.globalAlpha = 1;
}

/** A town building's rect [x, y, w, h] in world px (town-pack art drawn from the building's centre). */
function buildingRect(b) {
  const s = b.spr, k = b.k, X = isoX(b.cx, b.cy);
  return [b.flip ? X - (s.ox + s.w) * k : X + s.ox * k, isoY(b.cx, b.cy) + s.oy * k, s.w * k, s.h * k];
}

// b.flip: mirrored, which moves the door to the building's other street face (world/town.js)
function drawBuilding(ctx, b, alpha) {
  const s = b.spr, [x, y, w, h] = buildingRect(b);
  if (alpha < 1) ctx.globalAlpha = alpha;
  if (b.flip) { ctx.save(); ctx.translate(x + w, y); ctx.scale(-1, 1); ctx.drawImage(s.img, s.sx, s.sy, s.w, s.h, 0, 0, w, h); ctx.restore(); }
  else ctx.drawImage(s.img, s.sx, s.sy, s.w, s.h, x, y, w, h);
  if (alpha < 1) ctx.globalAlpha = 1;
}

function drawChest(ctx, c) {
  const x = isoX(c.x, c.y), y = isoY(c.x, c.y);
  const art = G.world && G.world.tileset && G.world.tileset.chest;
  const s = art && (c.opened ? (c.rare ? art.rareOpen : art.open) : (c.rare ? art.rareClosed : art.closed));
  if (s) {
    // the biome's chest art, sized off the closed chest so opening it doesn't change the scale
    const k = 46 / (c.rare ? art.rareClosed : art.closed).w, w = s.w * k, h = s.h * k;
    ctx.drawImage(s.img, s.sx, s.sy, s.w, s.h, x - w / 2, y + w / 4 - h, w, h);
    if (!c.opened) {
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.25 + Math.sin(G.time * 3) * 0.15;
      ctx.drawImage(glowSprite(c.rare ? '#c080ff' : '#ffd060'), x - 28, y - 40, 56, 46);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
    return;
  }
  ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.ellipse(x, y, 16, 7, 0, 0, TAU); ctx.fill();
  const body = c.rare ? '#5a3a6a' : '#5a3a1a', trim = c.rare ? '#e0c0ff' : '#d0a040';
  // box faces
  ctx.fillStyle = shade(body, -0.2);
  ctx.beginPath(); ctx.moveTo(x - 14, y - 4); ctx.lineTo(x, y + 3); ctx.lineTo(x, y - 9); ctx.lineTo(x - 14, y - 16); ctx.fill();
  ctx.fillStyle = shade(body, -0.4);
  ctx.beginPath(); ctx.moveTo(x, y + 3); ctx.lineTo(x + 14, y - 4); ctx.lineTo(x + 14, y - 16); ctx.lineTo(x, y - 9); ctx.fill();
  ctx.strokeStyle = trim; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(x - 14, y - 10); ctx.lineTo(x, y - 3); ctx.lineTo(x + 14, y - 10); ctx.stroke();
  if (c.opened) {
    ctx.fillStyle = shade(body, 0.1);
    ctx.beginPath(); ctx.moveTo(x - 14, y - 16); ctx.lineTo(x, y - 9); ctx.lineTo(x + 2, y - 26); ctx.lineTo(x - 12, y - 33); ctx.fill();
  } else {
    ctx.fillStyle = body;
    ctx.beginPath(); ctx.moveTo(x - 14, y - 16); ctx.lineTo(x, y - 9); ctx.lineTo(x + 14, y - 16); ctx.lineTo(x, y - 23); ctx.fill();
    ctx.strokeStyle = trim; ctx.beginPath(); ctx.moveTo(x - 7, y - 19.5); ctx.lineTo(x + 7, y - 12.5); ctx.stroke();
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.25 + Math.sin(G.time * 3) * 0.15;
    ctx.drawImage(glowSprite(c.rare ? '#c080ff' : '#ffd060'), x - 24, y - 34, 48, 40);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }
}

/** Scenario shrines and objective markers are not teleport portals: render a fitted
 * isometric glyph/stone marker over the separate sculpted shrine prop.
 */
function drawScenarioGlyph(ctx, p) {
  const x=isoX(p.x,p.y),y=isoY(p.x,p.y),t=G.time,col=p.color||'#80c8ff';
  const shrine=p.type==='shrine',radius=shrine?21:14;
  ctx.save();
  ctx.globalAlpha=.52+Math.sin(t*3+p.x)*.16;
  ctx.strokeStyle=col;ctx.lineWidth=shrine?2:1.5;
  ctx.beginPath();ctx.ellipse(x,y+1,radius,radius*.46,0,0,TAU);ctx.stroke();
  ctx.beginPath();ctx.ellipse(x,y+1,radius*.69,radius*.28,0,-t*.4,4.4-t*.4);ctx.stroke();
  ctx.globalAlpha=.66;
  ctx.fillStyle=col;
  const z=shrine?68:36,tipY=y-z+Math.sin(t*2+p.y)*2;
  ctx.beginPath();ctx.moveTo(x,tipY-9);ctx.lineTo(x+7,tipY);
  ctx.lineTo(x,tipY+11);ctx.lineTo(x-7,tipY);ctx.closePath();ctx.fill();
  ctx.globalAlpha=.85;ctx.fillStyle='#f7f1d6';
  ctx.beginPath();ctx.moveTo(x,tipY-6);ctx.lineTo(x+2,tipY);
  ctx.lineTo(x,tipY+5);ctx.lineTo(x-2,tipY);ctx.closePath();ctx.fill();
  ctx.restore();
}
function drawPortal(ctx, p) {
  if (p.type === 'shrine' || p.type === 'objective') return drawScenarioGlyph(ctx, p);
  const x = isoX(p.x, p.y), y = isoY(p.x, p.y);
  const active = p.active;
  const col = active ? p.color || '#ff5020' : '#5a5a60';
  const t = G.time;
  // floor rune ring
  ctx.strokeStyle = rgba(col, 0.6); ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(x, y, 34, 17, 0, 0, TAU); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(x, y, 26, 13, 0, t, t + 5); ctx.stroke();
  // side pillars
  const ts = G.world && G.world.tileset, ps = ts && ts.pillar;
  if (ps) {
    const k = ts.k;
    for (const sx of [-30, 26]) ctx.drawImage(ps.img, ps.sx, ps.sy, ps.w, ps.h, x + sx + ps.ox * k, y + (sx < 0 ? -4 : 4) + ps.oy * k, ps.w * k, ps.h * k);
  }
  // swirling vortex
  ctx.save();
  ctx.translate(x, y - 34);
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 6; i++) {
    ctx.globalAlpha = active ? 0.45 - i * 0.05 : 0.15;
    ctx.strokeStyle = i % 2 ? col : '#ffffff';
    ctx.lineWidth = 3 - i * 0.3;
    ctx.beginPath(); ctx.ellipse(0, 0, 18 - i * 2.4, 30 - i * 4, 0, t * (2 + i * 0.6), t * (2 + i * 0.6) + 4.2); ctx.stroke();
  }
  ctx.globalAlpha = active ? 0.8 : 0.25;
  ctx.drawImage(glowSprite(col), -26, -38, 52, 76);
  ctx.restore();
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}

function drawCorpse(ctx, c) {
  const img = c._img || (c._img = (c.art && enemyImage(c.art, c.swap, 'dark')) || pixelSprite(c.sprite, c.pal, 6, { dark: true }));
  const px = (c.px || 2.3) * (c.scale || 1) / 6;
  const h = img._art ? c.artH * (c.scale || 1) : img.height * px, w = img._art ? h * img.width / img.height : img.width * px;
  const x = isoX(c.x, c.y), y = isoY(c.x, c.y);
  const fade = c.t > 34 ? 1 - (c.t - 34) / 6 : 1;
  ctx.save();
  ctx.globalAlpha = Math.max(0, fade);
  ctx.translate(x, y - 4);
  ctx.scale(c.flip ? -1 : 1, 0.62);
  ctx.rotate(-Math.PI / 2 * 0.92);
  ctx.drawImage(img, -h * 0.1 - h * 0.45, -w / 2, w, h * 0.95);
  ctx.restore();
}

function drawNpc(ctx, n) {
  if (n.stash) {
    drawChest(ctx, { x: n.x, y: n.y, rare: true, opened: !!(G.ui.stash && G.ui.stash.active) });
    const x = isoX(n.x, n.y), y = isoY(n.x, n.y);
    n.sbox = [x - 24, y - 40, x + 24, y + 6];
    return;
  }
  // Vendors retain their existing hand-painted artwork, names and shops.
  // Only visitors/civilians use the animated townsfolk collection.
  const spriteId=n.vendor?null:(n.townsfolkSpriteId||n.spriteId||n.townsfolkId);
  const sheet=spriteId?townSprite(spriteId,n.pal):null;
  const vendorArt=n.vendor
    ? replacementImage('npc_'+n.vendor.id) || classSprite(n.vendor.sprite,180,n.vendor.pal)
    : null;
  const h=n.child?42:58,w=(h*128)/192;
  const x = isoX(n.x, n.y), y = isoY(n.x, n.y);
  ctx.fillStyle = 'rgba(0,0,0,0.38)';
  ctx.beginPath(); ctx.ellipse(x, y, 13, 6, 0, 0, TAU); ctx.fill();
  const bob=n.walking?Math.abs(Math.sin(G.time*10+n.x))*1.5:Math.sin(G.time*2+n.x)*.6;
  const frame=n.knight&&n.townAttackT>0?11+(Math.floor(G.time*7+n.townAttackSeed)%2):n.townPoseT>0?n.townPoseFrame:n.walking?3+(Math.floor(G.time*7)%2):Math.floor(G.time*.7+n.x)%3;
  // HTMLCanvasElement does not expose Image.complete or Image.naturalWidth.
  // The old guard failed for every recolored sheet and drew placeholders forever.
  const ready=townFrameReady(sheet,n.frameCount||11);
  if(n.vendor && vendorArt){
    // Keep the old vendor image (including fallback if the replacement atlas
    // cannot load). Match the same ground point and flip as the townsfolk.
    ctx.save();
    if(n.flip){ctx.translate(x,0);ctx.scale(-1,1);ctx.drawImage(vendorArt,-w/2,y-h+bob,w,h);}
    else ctx.drawImage(vendorArt,x-w/2,y-h+bob,w,h);
    ctx.restore();
  } else if(!n.vendor && ready){
    ctx.save();
    if(n.flip){ctx.translate(x,0);ctx.scale(-1,1);ctx.drawImage(sheet,frame*TOWN_FRAME_W,0,TOWN_FRAME_W,TOWN_FRAME_H,-w/2,y-h+bob,w,h);}
    else ctx.drawImage(sheet,frame*TOWN_FRAME_W,0,TOWN_FRAME_W,TOWN_FRAME_H,x-w/2,y-h+bob,w,h);
    ctx.restore();
  }
  if (n.vendor) {
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.25 + Math.sin(G.time * 3) * 0.1;
    ctx.drawImage(glowSprite('#ffd060'), x - 6, y - h - 18, 12, 12);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }
  n.sbox = [x - w / 2, y - h, x + w / 2, y];
  drawTownMood(ctx,n,x,y);
  n.bubbleRect=null;
  if(n.talkText&&n.talkT>0){
    const words=String(n.talkText).split(/\s+/),lines=[];let line='';
    for(const word of words){const next=line?line+' '+word:word;if(next.length>25&&line){lines.push(line);line=word;}else line=next;}
    if(line)lines.push(line);
    ctx.save();ctx.font='11px Georgia, "Times New Roman", serif';ctx.textAlign='center';ctx.textBaseline='middle';
    const bw=Math.min(190,Math.max(96,...lines.map(s=>ctx.measureText(s).width+18))),bh=lines.length*14+14,baseX=x-bw/2,baseY=y-h-bh-12;
    const occupied=[...(G.world?.npcs||[]).filter(q=>q!==n).flatMap(q=>[q.sbox,q.bubbleRect]),...(G.world?.creatures||[]).filter(q=>q!==G.player&&!q.dead).map(q=>q.sbox)].filter(Boolean);
    const overlaps=(bx,by)=>occupied.some(([l,t,r,b])=>bx<r+3&&bx+bw>l-3&&by<b+3&&by+bh>t-3);
    const shifts=[[0,0],[-34,0],[34,0],[-56,0],[56,0],[0,-bh-8],[-32,-bh-8],[32,-bh-8]];
    const [dx,dy]=shifts.find(([sx,sy])=>!overlaps(baseX+sx,baseY+sy))||[0,0],bx=Math.round(baseX+dx),by=Math.round(baseY+dy);
    n.bubbleRect=[bx,by,bx+bw,by+bh];
    // Crisp double-ruled parchment with a small directional tail, sized to keep
    // the speaker visible and the dialogue readable over the dimetric scene.
    ctx.fillStyle='#211b16';ctx.fillRect(bx-2,by-2,bw+4,bh+4);ctx.fillStyle='#c6a86c';ctx.fillRect(bx-1,by-1,bw+2,bh+2);
    ctx.fillStyle='#eee0bb';ctx.fillRect(bx,by,bw,bh);ctx.fillStyle='#37291b';ctx.fillRect(bx+4,by+4,bw-8,bh-8);
    ctx.fillStyle='#eee0bb';ctx.fillRect(bx+5,by+5,bw-10,bh-10);
    const tailX=Math.max(bx+10,Math.min(bx+bw-10,x));ctx.beginPath();ctx.moveTo(tailX-5,by+bh-1);ctx.lineTo(tailX+4,by+bh-1);ctx.lineTo(x,by+bh+7);ctx.closePath();ctx.fillStyle='#eee0bb';ctx.fill();ctx.strokeStyle='#37291b';ctx.lineWidth=1;ctx.stroke();
    ctx.fillStyle='#20170f';lines.forEach((s,i)=>ctx.fillText(s,x,by+12+i*14));ctx.restore();
  }
}

/** Main world render. */
export function renderWorld(ctx, world) {
  const W = G.W * G.dpr, H = G.H * G.dpr;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  camera.apply(ctx);
  ctx.imageSmoothingEnabled = true;
  // 'medium' (mipmapped) downscaling of the big floor/wall atlases costs several times 'low' per draw, and those are
  // most of the frame: tiles and walls always draw 'low'; sprites use 'low' on touch or when resolution is reduced.
  const hq = G.touch || (G.resScale || 1) < 0.95 ? 'low' : 'medium';
  ctx.imageSmoothingQuality = 'low';
  const vr = camera.viewRect(40);
  const map = world.map;

  // tile bounds of the view
  const corners = [[vr.x0, vr.y0 - 40], [vr.x1, vr.y0 - 40], [vr.x0, vr.y1 + 140], [vr.x1, vr.y1 + 140]].map(([wx, wy]) => [(wx / HW + wy / HH) / 2, (wy / HH - wx / HW) / 2]);
  const tx0 = clamp(Math.floor(Math.min(...corners.map((c) => c[0]))) - 1, 0, map.w - 1);
  const tx1 = clamp(Math.ceil(Math.max(...corners.map((c) => c[0]))) + 1, 0, map.w - 1);
  const ty0 = clamp(Math.floor(Math.min(...corners.map((c) => c[1]))) - 1, 0, map.h - 1);
  const ty1 = clamp(Math.ceil(Math.max(...corners.map((c) => c[1]))) + 1, 0, map.h - 1);

  // floors
  for (let ty = ty0; ty <= ty1; ty++) {
    for (let tx = tx0; tx <= tx1; tx++) {
      const i = ty * map.w + tx;
      if (map.t[i] !== 1) continue;
      const px = (tx - ty) * HW, py = (tx + ty) * HH;
      if (px < vr.x0 - TW || px > vr.x1 + TW || py < vr.y0 - TH || py > vr.y1 + TH) continue;
      const f = floorEntry(world, map.v[i]);
      ctx.drawImage(f.img, f.sx, f.sy, f.w, f.h, px - HW - 0.6, py - 0.6, TW + 1.2, TH + 1.2);
      const gr = gritAt(world, f, map.v[i], tx, ty);
      if (gr) ctx.drawImage(gr, px - HW, py);
    }
  }
  drawTransitionParticles(ctx, world, vr);
  ctx.imageSmoothingQuality = hq;
  drawDecals(ctx, vr);
  for (const c of world.corpses) {
    const px = isoX(c.x, c.y), py = isoY(c.x, c.y);
    if (px > vr.x0 - 40 && px < vr.x1 + 40 && py > vr.y0 - 40 && py < vr.y1 + 40) drawCorpse(ctx, c);
  }
  // ground layer hazards & effects
  // Reuse records by insertion index (sort rearranges the active array only).
  const frame = world.renderFrame || (world.renderFrame = { pool: [], sorted: [], top: [], walls: [] });
  const { pool, sorted, top, walls } = frame;
  sorted.length = 0; top.length = 0; walls.length = 0;
  const enqueue = (d, f, o, index = 0) => {
    const i = sorted.length, item = pool[i] || (pool[i] = {});
    item.d = d; item.f = f; item.o = o; item.index = index;
    sorted.push(item);
  };
  for (const h of world.hazards) {
    if (h.ground) h.draw(ctx);
    else if (h.shieldVariant && h.pos) {
      // Each rotating shield has its own world depth! The far-side shields
      // render BEFORE the Lancer; the near-side shields render AFTER him.
      // They also sort naturally between wall/door and creature slices.
      for (let i = 0; i < h.pos.length; i++) {
        const [x,y,a]=h.pos[i];
        enqueue(orbitShieldDepth(x,y,a),11,h,i);
      }
    }
    else if (typeof h.depth === 'number') enqueue(h.depth, 1, h);
    else top.push(h);
  }
  drawEffects(ctx, 'ground');

  // depth sorted pass
  const p = world.player;
  const pd = p ? p.x + p.y : 0;
  const ppx = p ? isoX(p.x, p.y) : 0, ppy = p ? isoY(p.x, p.y) : 0;
  const prect = [ppx - 16, ppy - 62, ppx + 16, ppy - 4];
  const occludes = (r) => p && r[0] < prect[2] && r[0] + r[2] > prect[0] && r[1] < prect[3] && r[1] + r[3] > prect[1];
  // walls in front of the hero fade with screen distance and depth, so the narrow slices form a soft see-through hole
  // (a wide hole: the walls stand ~1.4 heroes tall, and fights next to the hero should stay in view)
  const cutaway = (r, d) => {
    if (!p || !r || d <= pd || r[1] > prect[3] - 8 || r[1] + r[3] < prect[1] - 30) return 1;
    const t = clamp((Math.abs(r[0] + r[2] / 2 - ppx) - 24) / 120, 0, 1);
    return 1 - (1 - (0.16 + 0.84 * t * t * (3 - 2 * t))) * Math.min(1, (d - pd) * 1.5);
  };
  const wk = world.tileset && world.tileset.k;
  map.wallsIn(tx0 - 3, ty0 - 3, tx1 + 4, ty1 + 4, walls);
  for (const s of walls) {
    const r = wallSlice(s);
    if (!r) continue;
    const x = isoX(s.x, s.y) + r.ox * wk, y = isoY(s.x, s.y) + r.oy * wk;
    if (x - 1 > vr.x1 || x + r.w * wk + 1 < vr.x0 ||
        y - 1 > vr.y1 || y + r.h * wk + 1 < vr.y0) continue;
    enqueue(s.depth, 2, s);
  }
  // A wall-holder shares the same depth pass as its wall, so it fades with
  // an occluding front wall and doesn't float above the player or doors.
  for (const t of world.torches) {
    const px=isoX(t.mountX??t.x,t.mountY??t.y);
    const py=isoY(t.mountX??t.x,t.mountY??t.y);
    if(px<vr.x0-120||px>vr.x1+120||py<vr.y0-120||py>vr.y1+90)continue;
    enqueue(t.depth??(t.x+t.y),12,t);
  }
  for (const item of world.wallHangings) {
    const px=isoX(item.mountX,item.mountY), py=isoY(item.mountX,item.mountY);
    if(px<vr.x0-100||px>vr.x1+100||py<vr.y0-110||py>vr.y1+70)continue;
    enqueue(item.depth??(item.mountX+item.mountY),13,item);
  }
  for (const pr of world.props) {
    const px = isoX(pr.x, pr.y), py = isoY(pr.x, pr.y);
    // Tall outdoor trees are grounded well below their canopy; cull by the full
    // sprite bounds, not just its trunk's ground pivot, to prevent popping.
    if (pr.spr && pr.k) {
      const s = pr.spr, k = pr.k;
      const x0 = px + (pr.flip ? -s.ox - s.w : s.ox) * k;
      const y0 = py + s.oy * k;
      if (x0 > vr.x1 + 8 || x0 + s.w * k < vr.x0 - 8 ||
          y0 > vr.y1 + 8 || y0 + s.h * k < vr.y0 - 8) continue;
    } else if (px < vr.x0 - 100 || px > vr.x1 + 100 || py < vr.y0 - 40 || py > vr.y1 + 220) continue;
    enqueue(pr.x + pr.y, 4, pr);
  }
  for (const b of world.buildings) {
    const [x,y,w,h] = buildingRect(b);
    if (x > vr.x1+24 || x+w < vr.x0-24 || y > vr.y1+24 || y+h < vr.y0-24) continue;
    enqueue(b.depth, 5, b);
  }
  for (const c of world.creatures) {
    if (c.dead) continue;
    const px = isoX(c.x, c.y), py = isoY(c.x, c.y);
    if (px < vr.x0 - 80 || px > vr.x1 + 80 || py < vr.y0 - 40 || py > vr.y1 + 160) { c.sbox = null; continue; }
    enqueue(c.x + c.y + (c.fly ? 0.2 : 0), 6, c);
  }
  const closeEnough = (x,y,marginX=90,marginY=130) => {
    const px=isoX(x,y),py=isoY(x,y);
    return px >= vr.x0-marginX && px <= vr.x1+marginX && py >= vr.y0-marginY && py <= vr.y1+marginY;
  };
  for (const n of world.npcs) {
    if (!closeEnough(n.x,n.y)) { n.sbox=null; continue; }
    enqueue(n.x + n.y, 7, n);
  }
  for (const l of world.loot) if (closeEnough(l.x,l.y,50,75)) enqueue(l.x + l.y - 0.2, 8, l);
  for (const c of world.chests) if (closeEnough(c.x,c.y,70,80)) enqueue(c.x + c.y, 9, c);
  for (const po of world.portals) if (closeEnough(po.x,po.y,95,150)) enqueue(po.x + po.y, 10, po);
  sorted.sort((a, b) => a.d - b.d);
  let q = hq;
  for (const it of sorted) {
    const o = it.o, lq = it.f === 2 ? 'low' : hq;
    if (lq !== q) ctx.imageSmoothingQuality = q = lq;
    switch (it.f) {
      case 1: o.draw(ctx); break;
      case 2: drawWall(ctx, o, wk, cutaway(wallRect(o, wk), o.depth)); break;
      case 4: {
        let a = 1;
        if (p && it.d > pd + 0.5 && (o.spr || (o.sprite === 'tree' || o.sprite === 'pine'))) {
          const px = isoX(o.x, o.y), py = isoY(o.x, o.y);
          if (Math.abs(px - ppx) < 40 && py > ppy - 8 && py - 90 < ppy) a = 0.35;
        }
        drawProp(ctx, o, a);
        break;
      }
      case 5: {
        let a = 1;
        if (p && o.depth > pd) {
          const [x, y, w, h] = buildingRect(o);
          if (occludes([x + w * 0.15, y, w * 0.7, h * 0.85])) a = 0.4;
        }
        drawBuilding(ctx, o, a);
        break;
      }
      case 6: {
        const deckI=world.map.rampartDeck?Math.floor(o.y)*world.map.w+Math.floor(o.x):-1;
        const deckZ=deckI>=0?(world.map.rampartElev?.[deckI]??(world.map.rampartDeck[deckI]?world.map.rampartHeight||0:0)):0;
        const oldZ=o.z||0;
        if(deckZ)o.z=oldZ+deckZ;
        o.draw(ctx);
        if(deckZ)o.z=oldZ;
        const img = o.spriteImage();
        const [w, h] = o.spriteDims(img);
        const [sx, sy] = camera.tileToScreen(o.x, o.y, oldZ + deckZ + (o.fly ? 16 : 0));
        const z = camera.zoom;
        o.sbox = [sx - (w / 2) * z, sy - h * z, sx + (w / 2) * z, sy];
        break;
      }
      case 7: drawNpc(ctx, o); break;
      case 8: o.draw(ctx); break;
      case 9: drawChest(ctx, o); break;
      case 10: drawPortal(ctx, o); break;
      case 11: o.drawShield(ctx,it.index); break;
      case 12: drawWallTorch(ctx,o,world.biome,G.time,
        cutaway(wallTorchRect(o),it.d)); break;
      case 13: drawWallHanging(ctx,o,world.biome,
        cutaway(wallHangingRect(o),it.d)); break;
    }
  }
  if (q !== hq) ctx.imageSmoothingQuality = hq;
  drawParticles(ctx, vr);
  for (const h of top) h.draw(ctx);
  ctx.globalCompositeOperation = 'lighter';
  drawEffects(ctx, 'top');
  ctx.globalCompositeOperation = 'source-over';

  // ---------------------------------------------------------- screen space
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  drawLighting(ctx, world);
  if (G.hurtFlash > 0) {
    ctx.fillStyle = `rgba(160,0,0,${Math.min(0.45, G.hurtFlash)})`;
    ctx.fillRect(0, 0, W, H);
  }
  if (G.flash > 0) { ctx.fillStyle = `rgba(255,250,230,${Math.min(0.8, G.flash)})`; ctx.fillRect(0, 0, W, H); }
  if (p && p.hp < p.maxHp * 0.3 && !p.dead) {
    ctx.fillStyle = `rgba(120,0,0,${0.15 + Math.sin(G.time * 6) * 0.08})`;
    ctx.fillRect(0, 0, W, H);
  }
  drawOverheadNames(ctx, world);
  G.lootBoxes = drawLootLabels(ctx, world, G.input && G.input.lastPointerType === 'mouse' ? G.input.mouse : null);
  drawTexts(ctx);
  // Keep capacity without retaining creatures/loot that have left the world.
  for (const item of pool) item.o = null;
  top.length = 0;
}

/** The light falloff (alpha 1 at the centre to 0 at the rim), drawn with 'destination-out' to cut the darkness. */
let falloff = null;
function lightSprite() {
  if (falloff) return falloff;
  falloff = makeCanvas(64, 64);
  const x = falloff.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.55, 'rgba(0,0,0,0.6)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  return falloff;
}

function drawLighting(ctx, world) {
  const W = G.W * G.dpr, H = G.H * G.dpr;
  const b = world.biome;
  // The quarter-resolution lighting framebuffer is still expensive at retina
  // resolutions. A sixth-resolution buffer keeps the same falloff and avoids
  // repeated full-screen GPU traffic on memory-limited phones.
  const divisor = G.touch ? 6 : 4;
  const lw = Math.ceil(W / divisor), lh = Math.ceil(H / divisor);
  if (!lightCanvas || lightCanvas.width !== lw || lightCanvas.height !== lh) lightCanvas = makeCanvas(lw, lh);
  const lc = lightCanvas.getContext('2d');
  lc.globalCompositeOperation = 'source-over';
  lc.globalAlpha = 1;
  lc.clearRect(0, 0, lw, lh);
  const [fr, fg, fb] = hexToRgb(b.fog || '#000000');
  lc.fillStyle = `rgba(${fr},${fg},${fb},${b.dark})`;
  lc.fillRect(0, 0, lw, lh);
  lc.globalCompositeOperation = 'destination-out';
  const scale = (HW * 1.25 * camera.zoom * G.dpr) / divisor;
  const p = world.player, spr = lightSprite();
  const add = (x, y, r, inten, z = 20) => {
    const [sx, sy] = camera.tileToScreen(x, y, z);
    const cx = (sx * G.dpr) / divisor, cy = (sy * G.dpr) / divisor, rr = r * scale;
    if (cx + rr < 0 || cy + rr < 0 || cx - rr > lw || cy - rr > lh) return false;
    lc.globalAlpha = Math.min(1, inten);
    lc.drawImage(spr, cx - rr, cy - rr, rr * 2, rr * 2);
    return true;
  };
  if (p) {
    const i=world.map.rampartDeck?Math.floor(p.y)*world.map.w+Math.floor(p.x):-1;
    const deck=i>=0?(world.map.rampartElev?.[i]??(world.map.rampartDeck[i]?world.map.rampartHeight||0:0)):0;
    add(p.x,p.y,b.light*(1+(p.st.lightPct||0)),1,20+deck);
  }
  let visibleLights=0;
  for (const l of lights) {
    if (add(l.x, l.y, l.radius, l.intensity * 0.85, l.z ?? 20)) visibleLights++;
    if (G.touch && visibleLights >= 48) break;
  }
  // the vignette is baked into the same quarter-res layer, so the screen takes one full-size blit, not two
  const key = lw + 'x' + lh;
  if (vigKey !== key) {
    vigKey = key;
    vignette = makeCanvas(lw, lh);
    const v = vignette.getContext('2d');
    const g = v.createRadialGradient(lw / 2, lh / 2, Math.min(lw, lh) * 0.35, lw / 2, lh / 2, Math.max(lw, lh) * 0.75);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.6)');
    v.fillStyle = g; v.fillRect(0, 0, lw, lh);
  }
  lc.globalAlpha = 1;
  lc.globalCompositeOperation = 'source-over';
  lc.drawImage(vignette, 0, 0);
  ctx.imageSmoothingQuality = 'low';
  ctx.drawImage(lightCanvas, 0, 0, W, H);
}

function drawOverheadNames(ctx, world) {
  ctx.textAlign = 'center';
  const d = G.dpr;
  ctx.font = `700 ${Math.round(11 * d)}px Cinzel, Georgia, serif`;
  for (const c of world.creatures) {
    if (c.dead || !c.sbox) continue;
    if (c.rank === 'champion' || c.rank === 'unique') {
      const x = (c.sbox[0] + c.sbox[2]) / 2, y = c.sbox[1] - 8;
      ctx.lineWidth = 3 * d; ctx.strokeStyle = '#000';
      ctx.strokeText(c.name, x * d, y * d);
      ctx.fillStyle = c.rank === 'unique' ? '#ffc040' : '#80b0ff';
      ctx.fillText(c.name, x * d, y * d);
    }
  }
  for (const n of world.npcs) {
    if (!n.sbox) continue;
    const x = (n.sbox[0] + n.sbox[2]) / 2;
    const [sx, sy] = camera.toScreen(x, n.sbox[1] - 10);
    const label = n.vendor ? n.vendor.name : n.name;
    ctx.lineWidth = 3 * d; ctx.strokeStyle = '#000';
    ctx.strokeText(label, sx * d, sy * d);
    ctx.fillStyle = n.vendor || n.stash ? '#ffe090' : '#c8c0b0';
    ctx.fillText(label, sx * d, sy * d);
    if (n.vendor) {
      ctx.font = `${Math.round(10 * d)}px "Alegreya Sans", sans-serif`;
      ctx.fillStyle = '#b0a080';
      ctx.fillText(n.vendor.title, sx * d, (sy + 12) * d);
      ctx.font = `700 ${Math.round(11 * d)}px Cinzel, Georgia, serif`;
    }
  }
  // portal labels
  for (const po of world.portals) {
    const [sx, sy] = camera.tileToScreen(po.x, po.y, 82);
    ctx.lineWidth = 3 * d; ctx.strokeStyle = '#000';
    ctx.strokeText(po.label, sx * d, sy * d);
    ctx.fillStyle = po.active ? '#ffd0a0' : '#909090';
    ctx.fillText(po.label, sx * d, sy * d);
  }
  // hovered monster info (desktop)
  const h = G.hover;
  if (h && !h.dead && h.team === 'enemy' && h.rank !== 'boss') {
    const W = G.W * d;
    const bw = Math.min(360, G.W * 0.5) * d;
    const y = 18 * d;
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(W / 2 - bw / 2, y, bw, 22 * d);
    ctx.fillStyle = h.rank === 'unique' ? '#a06010' : h.rank === 'champion' ? '#2a4a90' : '#7a0a06';
    ctx.fillRect(W / 2 - bw / 2 + 2 * d, y + 2 * d, (bw - 4 * d) * clamp(h.hp / h.maxHp, 0, 1), 18 * d);
    ctx.fillStyle = '#fff';
    ctx.font = `700 ${Math.round(12 * d)}px Cinzel, Georgia, serif`;
    ctx.fillText(h.name, W / 2, y + 15 * d);
    if (h.affixes && h.affixes.length) {
      ctx.font = `${Math.round(11 * d)}px "Alegreya Sans", sans-serif`;
      ctx.fillStyle = '#c8b0ff';
      ctx.fillText(h.affixes.map((a) => ({ strong: 'Extra Strong', fast: 'Extra Fast', tough: 'Stone Skin', fiery: 'Fire Enchanted', frozen: 'Cold Aura', shocking: 'Lightning Enchanted', vampiric: 'Vampiric', teleport: 'Teleporting', multishot: 'Multishot', thorns: 'Thorns', regen: 'Regenerating' }[a] || a)).join(' · '), W / 2, y + 36 * d);
    }
  }
}

// ------------------------------------------------------------------ minimap
let mmT = 0;
export function drawMinimap(world, dt, canvas, big = false) {
  if (!canvas) return;
  mmT -= dt;
  if (!big && mmT > 0) return;
  mmT = 0.2;
  const c = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.clearRect(0, 0, W, H);
  const p = world.player;
  if (!p) return;
  const map = world.map;
  const s = big ? Math.max(2, Math.min(W / (map.w + map.h), H / ((map.w + map.h) / 2)) * 0.95) : 2.4;
  const cx = W / 2, cy = H / 2;
  const ox = big ? cx : cx - (p.x - p.y) * s, oy = big ? cy - ((map.w + map.h) / 4) * s + (big ? 0 : 0) : cy - ((p.x + p.y) * s) / 2;
  const toS = (x, y) => big ? [cx + (x - y) * s - ((map.w - map.h) * s) / 2, cy - ((map.w + map.h) * s) / 4 + ((x + y) * s) / 2] : [ox + (x - y) * s, oy + ((x + y) * s) / 2];
  c.fillStyle = big ? 'rgba(200,180,140,0.35)' : 'rgba(170,150,120,0.55)';
  for (let y = 0; y < map.h; y++) {
    for (let x = 0; x < map.w; x++) {
      const i = y * map.w + x;
      if (map.t[i] !== 1 || !map.seen[i]) continue;
      const [sx, sy] = toS(x, y);
      if (!big && (sx < -4 || sy < -4 || sx > W + 4 || sy > H + 4)) continue;
      c.fillRect(sx - s * 0.5, sy, s, s * 0.6);
    }
  }
  const dot = (x, y, col, r) => { const [sx, sy] = toS(x, y); c.fillStyle = col; c.beginPath(); c.arc(sx, sy + s * 0.3, r, 0, TAU); c.fill(); };
  for (const po of world.portals) if (map.seen[Math.floor(po.y) * map.w + Math.floor(po.x)] || world.kind === 'town') dot(po.x, po.y, po.active ? po.color || '#ff5020' : '#888', big ? 6 : 4);
  for (const ch of world.chests) if (!ch.opened && map.seen[Math.floor(ch.y) * map.w + Math.floor(ch.x)]) dot(ch.x, ch.y, '#ffd040', big ? 4 : 2.5);
  for (const n of world.npcs) dot(n.x, n.y, '#ffe090', big ? 4 : 2.5);
  for (const m of world.creatures) {
    if (m.dead || m === p) continue;
    const d = Math.hypot(m.x - p.x, m.y - p.y);
    if (m.team === 'enemy' && d < 14) dot(m.x, m.y, m.rank === 'boss' ? '#ff8000' : m.rank !== 'normal' ? '#ffb040' : '#ff3030', m.rank === 'boss' ? 4 : 2);
    else if (m.team === 'player') dot(m.x, m.y, '#40ff60', 1.8);
  }
  dot(p.x, p.y, '#ffffff', big ? 5 : 3.2);
}
