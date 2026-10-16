// The Forsaken Wilds: connected outdoor dungeon carved from the existing Overworld/Town pack.
// Trees are collision walls, but the ground remains continuous; paths and quest landmarks are
// protected before placing any trees. All randomness is based on a single seed for reproducibility.
import { TileMap } from './map.js';
import { RNG } from '../core/util.js';
import { A } from '../core/assets.js';
import { TW } from '../core/view.js';
import { townObject, makeTownTiles } from './town.js';
import { overworldObject, EXTRA_TREES, SHRINES } from '../gfx/overworldart.js';
import { isoBarrier } from '../gfx/isobarriers.js';
import { rollLooks } from '../data/bestiary.js';
import { wallHangingAtBuilding } from '../gfx/wallhangings.js';
import { seaOfSandFloorTiles, seaOfSandObject, seaOfSandCliff, seaOfSandFrames } from '../gfx/seaofsand.js';
import { SAND_SCATTER, SAND_TREES, SAND_BOSSES } from '../data/seaofsand.js';

const W = 72, H = 72, N = W * H;
const K = TW / 160; // town-pack source 160 x 80 base tiles
const FLOOR_MATERIALS = ['grass', 'gravel', 'dirt', 'mud'];
const DOOR_X = new Set(['bakery']);
const SOURCE_TREES = ['t_medium_fir','t_old_cedar','t_scots_pine','t_mature_ash',
  't_twin_birch','t_crooked_oak','t_wind_juniper','t_ancient_oak','t_dead_oak'];
const SCENARIO_SCATTER = ['ow_pale_mushrooms','ow_blue_flowers','ow_red_flowers','ow_fallen_banner',
  'ow_rotten_crate','ow_tattered_tent','ow_bone_pile','ow_discarded_shield','ow_mossy_log',
  'ow_cart_wreck','ow_sunken_chest'];
export const OVERWORLD_SITES = Object.freeze([
  [36.5,35.5],[20.5,20.5],[51.5,23.5],[21.5,49.5],[54.5,49.5],
  [36.5,17.5],[36.5,56.5],[16.5,35.5],[57.5,35.5],
]);
const ENTRY=[9.5,62.5], EXIT=[63.5,9.5], SHRINE=[36.5,35.5];
const SAND_SITES=[[18.5,19.5],[52.5,19.5],[18.5,51.5],[53.5,51.5],[36.5,35.5]];
function lineDist(x,y,a,b) {
  const dx=b[0]-a[0],dy=b[1]-a[1];
  const t=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy)));
  return Math.hypot(x-a[0]-dx*t,y-a[1]-dy*t);
}
export function generateOverworld(depth,biome,seed) {
  if (biome.id === 'sea_of_sand') return generateSeaOfSand(depth,biome,seed);
  const rng=new RNG(seed), map=new TileMap(W,H), flags=new Uint8Array(W*H);
  map.t.fill(1);map.losBlocks=true;
  const id=(x,y)=>y*W+x, dist=(x,y,a)=>Math.hypot(x-a[0],y-a[1]);
  const roads=[[ENTRY,SHRINE],[SHRINE,EXIT],[[14,35],SHRINE],[SHRINE,[58,36]],
    [[36,17],[36,57]],[[20,20],[51,23]],[[20,49],[54,49]],
    [[14,35],[27,42]],[[27,42],[36,44]]];
  const reserved=(x,y)=>[ENTRY,EXIT,...OVERWORLD_SITES].some(p=>dist(x,y,p)<6.4)
    || roads.some(([a,b])=>lineDist(x,y,a,b)<3.1);
  // The playable map is mainly grassland and ruin-pocked clearings. Forest stands form
  // impassable banks and winding walls around several always-accessible trunk roads.
  const groves=[
    {x:15,y:14,rx:18,ry:18},{x:58,y:14,rx:18,ry:17},
    {x:12,y:42,rx:14,ry:16},{x:60,y:59,rx:22,ry:20},
    {x:35,y:69,rx:21,ry:11},{x:35,y:7,rx:19,ry:9},
  ];
  const props=[],buildings=[],wallHangings=[];
  const add=(name,x,y,opts={})=>{
    // Legacy town 'stone_boundary' was drawn in one fixed direction and
    // mirrored as a second direction. Replace that old scatter, too.
    const normalized=name==='stone_boundary'
      ? isoBarrier('stone',((Math.floor(x)+Math.floor(y))%2)?'x':'y')
      : name;
    const sprite=typeof normalized==='string'?
      (overworldObject(normalized)||townObject(normalized)):normalized;
    if(!sprite)return false;
    props.push({kind:'scatter',x,y,spr:sprite,k:K*(sprite.pixelScale||1),flip:sprite.isometric?false:(opts.flip??rng.chance(.5)),
      light:opts.light||0});
    return true;
  };
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    const i=id(x,y),cx=x+.5,cy=y+.5;
    if(x===0||y===0||x===W-1||y===H-1){map.block[i]=1;flags[i]=2;continue;}
    const roadDistance=Math.min(...roads.map(([a,b])=>lineDist(cx,cy,a,b)));
    const road=roadDistance<2.15;
    const landmark=OVERWORLD_SITES.some(p=>dist(cx,cy,p)<5);
    const noise=(Math.sin(x*.53+y*.13+seed*.00003)+Math.cos(y*.41-x*.29))/4;
    const woodland=groves.some(g=>{
      const r=((cx-g.x)/g.rx)**2+((cy-g.y)/g.ry)**2;
      return r<.62+noise*.25;
    });
    const border=Math.min(x,y,W-x-1,H-y-1);
    const forest=!reserved(cx,cy)&&(border<2||woodland||rng.chance(.018));
    if(forest){
      flags[i]=2;map.block[i]=1;
      // One tree per blocked tile would flood the renderer with oversized overlapping crowns;
      // staggering crowns maintains a solid, readable "living wall" without 1,500 draw calls.
      if((x+y)%3===0||rng.chance(.12)) {
        const t=rng.chance(.6)?rng.pick(SOURCE_TREES):rng.pick(EXTRA_TREES);
        add(t,cx+rng.range(-.18,.18),cy+rng.range(-.15,.15));
      }
    }else if(road){flags[i]=1;map.v[i]=roadDistance<1.35?1:2;}
    else if(landmark){map.v[i]=rng.chance(.25)?1:0;}
    else map.v[i]=rng.chance(.035)?2:rng.chance(.04)?3:0;
  }

  // Small neutral settlement in the western clearing. Reserve entire footprints and keep
  // buildings off roads; their graphics use the same native 3x3 footprint as Herrington Hollow.
  const houses=[['cottage',28,39],['inn',26,45],['bakery',36,44]];
  for(const [name,x0,y0] of houses){
    const spr=townObject('b_'+name);
    if(!spr)continue;
    const cx=x0+1.5,cy=y0+1.5;
    let valid=true;
    for(let y=y0;y<y0+3;y++)for(let x=x0;x<x0+3;x++)if(map.block[id(x,y)])valid=false;
    if(!valid)continue;
    for(let y=y0;y<y0+3;y++)for(let x=x0;x<x0+3;x++)map.block[id(x,y)]=1;
    const flip=DOOR_X.has(name); // mirror the bakery so all settlement doors face the same way
    const building={cx,cy,spr,k:K*1.5,depth:cx+cy,flip,name,x0,y0,entryAxis:'y'};
    buildings.push(building);
    if(rng.chance(.8))wallHangings.push(wallHangingAtBuilding(building,false,rng.int(0,49)));
    const door=[x0+1,y0+3],start=id(door[0],door[1]);
    const previous=new Int32Array(N).fill(-1),q=[start];previous[start]=start;
    let end=-1;
    for(let head=0;head<q.length&&end<0;head++){
      const i=q[head],x=i%W,y=(i/W)|0;
      if(i!==start&&flags[i]===1){end=i;break;}
      for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
        const nx=x+dx,ny=y+dy,j=id(nx,ny);
        if(map.walkableTile(nx,ny)&&previous[j]<0){previous[j]=i;q.push(j);}
      }
    }
    const approach=[];
    for(let i=end;i>=0;i=previous[i]){
      const x=i%W,y=(i/W)|0;
      if(flags[i]!==1){map.v[i]=1;flags[i]=3;}
      approach.push([x,y]);
      if(i===start)break;
    }
    building.approach=approach;
  }
  // Encode native transitions at the seams between grass, gravel, dirt and mud.
  // This gives the lanes soft, connected edges instead of scattered full-tile decals.
  const transitionPairs=Object.keys(A.town.meta.transitions),material=map.v.slice();
  const at=(x,y)=>material[Math.min(H-1,Math.max(0,y))*W+Math.min(W-1,Math.max(0,x))];
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    const i=id(x,y),m=material[i],sides=[at(x-1,y),at(x+1,y),at(x,y-1),at(x,y+1)];
    let n=99;for(const s of sides)if(s<m&&s<n)n=s;
    if(n===99)continue;
    const [left,right,up,down]=sides.map(s=>s===n);
    const shape=left&&!right&&!up&&!down?0:right&&!left&&!up&&!down?1:up&&!down&&!left&&!right?2:down&&!up&&!left&&!right?3:
      left&&up&&!right&&!down?4:right&&down&&!left&&!up?5:left&&down&&!right&&!up?6:right&&up&&!left&&!down?7:-1;
    const pair=transitionPairs.indexOf(FLOOR_MATERIALS[n]+'__'+FLOOR_MATERIALS[m]);
    map.v[i]=shape<0||pair<0?n:6+pair*8+shape;
  }
  for(let i=0;i<260;i++){
    const x=rng.int(2,W-3),y=rng.int(2,H-3),cx=x+.5,cy=y+.5;
    if(!map.walkable(cx,cy)||flags[id(x,y)]!==0||reserved(cx,cy))continue;
    if(!map.circleFree(cx,cy,.35))continue;
    const name=rng.chance(.58)?rng.pick(SCENARIO_SCATTER):
      rng.pick(['wildflowers','mushrooms','fieldstone_cluster','leafy_shrub','hollow_stump',
        'stone_boundary','dry_reeds','cart_debris','fallen_log','moss_boulder']);
    add(name,cx+rng.range(-.22,.22),cy+rng.range(-.22,.22));
    // Scatter stays off routes, objective clearings and road lanes so it reads
    // as natural edge dressing without cluttering combat space.
  }
  add(SHRINES[rng.int(0,SHRINES.length-1)],SHRINE[0],SHRINE[1],{light:5});
  // Reuse the town tiles and chest art; do NOT build indoor wall segments.
  const townTiles=makeTownTiles();
  // Living barriers outline the northwestern forest rather than obstructing
  // the guaranteed entrance/shrine/exit paths. Each segment has exact 2:1
  // endpoint geometry and no incorrect mirrored orientation.
  for(let j=0;j<7;j++){
    const x=6+j+.5,y=8.5;
    if(map.block[Math.floor(y)*W+Math.floor(x)])
      add(isoBarrier('thorn','x'),x,y,{flip:false});
  }
  const looks=rollLooks(biome,rng.fn()),spawns=[];
  const archs=biome.roster.filter(a=>!['golem','abomination'].includes(a));
  for(let i=0;i<24;i++){
    const x=rng.int(7,64)+.5,y=rng.int(7,64)+.5;
    if(!map.circleFree(x,y,.35)||dist(x,y,ENTRY)<11||dist(x,y,SHRINE)<7)continue;
    const arch=rng.pick(archs);
    spawns.push({x,y,arch,n:rng.int(2,4),rank:i%11===0?'champion':'normal',look:looks.pick(arch)});
  }
  const chests=[];
  for(const p of [OVERWORLD_SITES[2],OVERWORLD_SITES[3],OVERWORLD_SITES[4]]) {
    const at=map.randomNear(p[0]+3,p[1]-3,2,rng.fn());
    chests.push({x:at[0],y:at[1],rare:rng.chance(.17)});
  }
  // Every portal, shrine, village and challenge zone must remain accessible.
  const seen=new Uint8Array(W*H),q=[id(Math.floor(ENTRY[0]),Math.floor(ENTRY[1]))];seen[q[0]]=1;
  for(let a=0;a<q.length;a++){
    const i=q[a],x=i%W,y=(i/W)|0;
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const nx=x+dx,ny=y+dy,j=id(nx,ny);
      if(map.walkableTile(nx,ny)&&!seen[j]){seen[j]=1;q.push(j);}
    }
  }
  const targets=[EXIT,...OVERWORLD_SITES];
  if(targets.some(([x,y])=>!seen[id(Math.floor(x),Math.floor(y))]))
    throw new Error('Overworld generator produced unreachable objective; seed '+seed);
  return {map,props,buildings,wallHangings,townTiles,looks,spawns,chests,torches:[],
    start:ENTRY,exit:EXIT,shrine:SHRINE,sites:OVERWORLD_SITES,
    scenarioId:(((seed >>> 0) ^ depth) >>> 0) % 20,seed};
}

function generateSeaOfSand(depth,biome,seed) {
  if (!seaOfSandFloorTiles().length) throw new Error('Sea of Sand art must load before generating its overworld.');
  const rng=new RNG(seed),map=new TileMap(W,H),floors=seaOfSandFloorTiles(),props=[];
  const scenarioCount=1+((seed>>>5)%5),scenarioSites=SAND_SITES.slice(0,scenarioCount);
  map.t.fill(1);map.losBlocks=true;
  const I=(x,y)=>y*W+x,dist=(x,y,p)=>Math.hypot(x-p[0],y-p[1]);
  const links=[[ENTRY,SAND_SITES[0]],[SAND_SITES[0],SAND_SITES[4]],[SAND_SITES[4],SAND_SITES[1]],
    [SAND_SITES[4],SAND_SITES[2]],[SAND_SITES[4],SAND_SITES[3]],[SAND_SITES[1],EXIT]];
  const reserved=(x,y)=>[ENTRY,EXIT,...SAND_SITES].some(p=>dist(x,y,p)<9.5)||links.some(([a,b])=>lineDist(x,y,a,b)<2.8);
  const add=(spr,x,y,options={})=>{if(!spr)return;props.push({kind:'scatter',x,y,spr,k:TW/160*(options.scale||1),flip:false,light:options.light||0});};
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    const i=I(x,y),cx=x+.5,cy=y+.5;
    map.v[i]=rng.int(0,59);
    if(x===0||y===0||x===W-1||y===H-1){map.block[i]=1;continue;}
    const corridor=links.some(([a,b])=>lineDist(cx,cy,a,b)<2.65);
    // Low ridges and broken ruin walls form a connected maze. Objective roads
    // remain clear so every selected scenario area is reachable.
    const maze=(x%11===0&&y%9!==4&&y%9!==5)||(y%13===0&&x%15!==7&&x%15!==8);
    const dune=((Math.sin(x*.27+seed*.00003)+Math.cos(y*.31-x*.12))/2)>.72;
    if(!reserved(cx,cy)&&!corridor&&(maze||dune&&rng.chance(.17))){map.block[i]=1;}
  }
  const cliffs=seaOfSandFrames('cliff');
  const cliffByMask=new Map();
  for(const f of cliffs)if(f.connection_mask!=null){if(!cliffByMask.has(f.connection_mask))cliffByMask.set(f.connection_mask,[]);cliffByMask.get(f.connection_mask).push(f);}
  const dirs=[[0,-1,1],[1,0,2],[0,1,4],[-1,0,8]];
  for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++)if(map.block[I(x,y)]){
    let mask=0;for(const [dx,dy,bit] of dirs)if(map.block[I(x+dx,y+dy)])mask|=bit;
    const variants=cliffByMask.get(mask)||cliffByMask.get(0),f=rng.pick(variants);
    add(seaOfSandCliff(f?.name),x+.5,y+.5,{scale:.5});
  }
  const treeNames=SAND_TREES.filter(n=>!['dry_reeds','spiny_aloe','saltbush'].includes(n));
  for(let y=2;y<H-2;y++)for(let x=2;x<W-2;x++){
    const i=I(x,y),cx=x+.5,cy=y+.5;
    if(map.block[i]||reserved(cx,cy))continue;
    if(rng.chance(.022)){
      const name=rng.pick(treeNames),tree=seaOfSandObject(name,'tree');
      if(tree){map.block[i]=1;add(tree,cx,cy,{scale:rng.range(.43,.6)});}
    }
  }
  for(let n=0;n<360;n++){
    const x=rng.int(2,W-3)+.5,y=rng.int(2,H-3)+.5;
    if(!map.walkable(x,y)||reserved(x,y)&&rng.chance(.82))continue;
    add(seaOfSandObject(rng.pick(SAND_SCATTER)),x+rng.range(-.2,.2),y+rng.range(-.2,.2),{scale:rng.range(.32,.48)});
  }
  // Oasis palms ring the central caravan rest and provide recognizable landmarks.
  for(const [x,y] of [[34.5,33.5],[39.5,34.5],[34.5,38.5],[39.5,38.5]]){
    const t=seaOfSandObject(rng.pick(['date_palm','doum_palm','fruiting_oasis_palm']),'tree');
    add(t,x,y,{scale:.55});
  }
  for(let i=0;i<scenarioSites.length;i++){
    const [x,y]=scenarioSites[i];
    add(seaOfSandObject('quest_shrine'),x,y,{scale:.48,light:4.5});
  }
  const chests=SAND_SITES.slice(0,3).map(([x,y],i)=>({x:x+2.5,y:y+1,rare:i===0||rng.chance(.2)}));
  const looks=rollLooks(biome,rng.fn()),spawns=[];
  for(let i=0;i<38;i++){
    const x=rng.int(7,64)+.5,y=rng.int(7,64)+.5;
    if(!map.circleFree(x,y,.35)||dist(x,y,ENTRY)<9)continue;
    const arch=rng.pick(biome.roster);
    spawns.push({x,y,arch,n:rng.int(1,3),rank:i%13===0?'champion':'normal',look:looks.pick(arch)});
  }
  // Named boss archetypes are included in the biome boss pool and rotate as
  // site guardians. They retain the normal boss patterns, loot and progression.
  const boss=SAND_BOSSES[(seed>>>0)%SAND_BOSSES.length];
  const [bx,by]=SAND_SITES[(seed>>>3)%SAND_SITES.length];
  spawns.push({x:bx+2,y:by-2,arch:boss[0],n:1,rank:'boss'});
  const seen=new Uint8Array(W*H),q=[I(Math.floor(ENTRY[0]),Math.floor(ENTRY[1]))];seen[q[0]]=1;
  for(let a=0;a<q.length;a++){const i=q[a],x=i%W,y=(i/W)|0;for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,j=I(nx,ny);if(map.walkableTile(nx,ny)&&!seen[j]){seen[j]=1;q.push(j);}}}
  if([EXIT,...SAND_SITES].some(p=>!seen[I(Math.floor(p[0]),Math.floor(p[1]))]))throw new Error('Sea of Sand maze blocked an objective at seed '+seed);
  return {map,props,buildings:[],wallHangings:[],townTiles:floors,looks,spawns,chests,torches:[],
    start:ENTRY,exit:EXIT,shrine:scenarioSites[0],sites:Array.from({length:9},(_,i)=>{
      const [cx,cy]=scenarioSites[0];const a=i*Math.PI*2/8;return [cx+Math.cos(a)*7,cy+Math.sin(a)*6];
    }),scenarioSites,scenarioCount,scenarioId:(((seed>>>0)^depth)>>>0)%20,seed};
}
