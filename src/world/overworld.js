// The Forsaken Wilds: connected outdoor dungeon carved from the existing Overworld/Town pack.
// Trees are collision walls, but the ground remains continuous; paths and quest landmarks are
// protected before placing any trees. All randomness is based on a single seed for reproducibility.
import { TileMap } from './map.js';
import { RNG } from '../core/util.js';
import { A } from '../core/assets.js';
import { TW } from '../core/view.js';
import { townObject, makeTownTiles } from './town.js';
import { overworldObject, EXTRA_TREES, EXTRA_SCATTER, SHRINES } from '../gfx/overworldart.js';
import { outdoorBiomeProp, extendedOverworldFloors, OVERWORLD_FLOOR_EXPANSION } from '../gfx/biomeexpansion.js';
import { isoBarrier } from '../gfx/isobarriers.js';
import { rollLooks } from '../data/bestiary.js';
import { wallHangingAtBuilding } from '../gfx/wallhangings.js';

const W = 72, H = 72;
const K = TW / 160; // town-pack source 160 x 80 base tiles
const SOURCE_TREES = ['t_medium_fir','t_old_cedar','t_scots_pine','t_mature_ash',
  't_twin_birch','t_crooked_oak','t_wind_juniper','t_ancient_oak','t_dead_oak'];
export const OVERWORLD_SITES = Object.freeze([
  [36.5,35.5],[20.5,20.5],[51.5,23.5],[21.5,49.5],[54.5,49.5],
  [36.5,17.5],[36.5,56.5],[16.5,35.5],[57.5,35.5],
]);
const ENTRY=[9.5,62.5], EXIT=[63.5,9.5], SHRINE=[36.5,35.5];
function lineDist(x,y,a,b) {
  const dx=b[0]-a[0],dy=b[1]-a[1];
  const t=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy)));
  return Math.hypot(x-a[0]-dx*t,y-a[1]-dy*t);
}
export function generateOverworld(depth,biome,seed) {
  const rng=new RNG(seed), map=new TileMap(W,H), flags=new Uint8Array(W*H);
  map.t.fill(1);map.losBlocks=true;
  const id=(x,y)=>y*W+x, dist=(x,y,a)=>Math.hypot(x-a[0],y-a[1]);
  const roads=[[ENTRY,SHRINE],[SHRINE,EXIT],[[14,35],SHRINE],[SHRINE,[58,36]],
    [[36,17],[36,57]],[[20,20],[51,23]],[[20,49],[54,49]]];
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
    const road=roads.some(([a,b])=>lineDist(cx,cy,a,b)<2.9);
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
    }else if(road){flags[i]=1;map.v[i]=rng.chance(.3)?1:2;}
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
    const building={cx,cy,spr,k:K*1.5,depth:cx+cy,flip:false,name,x0,y0};
    buildings.push(building);
    if(rng.chance(.8))wallHangings.push(wallHangingAtBuilding(building,false,rng.int(0,49)));
  }
  for(let i=0;i<260;i++){
    const x=rng.int(2,W-3),y=rng.int(2,H-3),cx=x+.5,cy=y+.5;
    if(!map.walkable(cx,cy)||reserved(cx,cy)&&rng.chance(.9))continue;
    if(!map.circleFree(cx,cy,.35))continue;
    const name=rng.chance(.35)?outdoorBiomeProp(biome.id,rng.int(0,39)):
      rng.chance(.55)?rng.pick(EXTRA_SCATTER):
      rng.pick(['wildflowers','mushrooms','fieldstone_cluster','leafy_shrub','hollow_stump',
        'stone_boundary','dry_reeds','cart_debris','fallen_log','moss_boulder']);
    add(name,cx+rng.range(-.22,.22),cy+rng.range(-.22,.22));
    // Scatter is primarily decorative: open-space combat should not turn into
    // a pathfinding nightmare of invisible one-tile collisions.
  }
  add(SHRINES[rng.int(0,SHRINES.length-1)],SHRINE[0],SHRINE[1],{light:5});
  for(let i=1;i<OVERWORLD_SITES.length;i++)if(i%3===0)
    add(rng.pick(['ow_ancient_stone','ow_forest_totem','ow_standing_stone']),
      OVERWORLD_SITES[i][0]+1.2,OVERWORLD_SITES[i][1]+1.2);
  // Reuse the town tiles and chest art; do NOT build indoor wall segments.
  const townTiles=makeTownTiles();
  townTiles.push(...extendedOverworldFloors(A.town.ground,A.town.meta));
  // A dedicated 120-cell wilderness floor set extends the original town art;
  // original 6+120 terrain-transition indices stay untouched.
  for(let y=3;y<H-3;y++)for(let x=3;x<W-3;x++){
    const i=y*W+x;
    if(!map.block[i]&&map.v[i]<6&&rng.chance(0.07))
      map.v[i]=OVERWORLD_FLOOR_EXPANSION.start+rng.int(0,OVERWORLD_FLOOR_EXPANSION.count-1);
  }
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
