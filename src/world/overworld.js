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
import { scaledCastlePropK, castleWallFamilyAt } from '../gfx/castlescale.js';
import { castleFloorTiles, castleFloorIndex, castleKeepFloorTiles, castleKeepFloorIndex,
  castleKeepWallFrames, castleFrames, castleObject } from '../gfx/castle.js';

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
  if (biome.id === 'castle') return generateCastle(depth,biome,seed);
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


const CASTLE_SITES=[[48.5,45.5],[39.5,39.5],[57.5,39.5],[39.5,52.5],[55.5,52.5],
  [34.5,44.5],[62.5,44.5],[44.5,57.5],[53.5,57.5]];
const CASTLE_ENTRY=[48.5,82.5],CASTLE_EXIT=[86.5,8.5],CASTLE_SHRINE=CASTLE_SITES[0];
function generateCastleBase(depth,biome,seed){
  const CW=96,CH=88,CN=CW*CH,
    floors=castleFloorTiles(),
    keepFloors=castleKeepFloorTiles(),
    allFloors=[...floors,...keepFloors],
    grass=castleFloorIndex('courtyard_meadow'),
    shaded=castleFloorIndex('trimmed_battlement_grass'),
    damp=castleFloorIndex('damp_grass'),
    dry=castleFloorIndex('dry_grass'),
    earth=castleFloorIndex('sandy_soil'),
    stone=castleFloorIndex('grey_flagstone'),
    battlement=castleFloorIndex('dressed_slab'),
    hallFloor=floors.length+castleKeepFloorIndex('throne_herringbone'),
    chapelFloor=floors.length+castleKeepFloorIndex('chapel_pale_brick'),
    greatFloor=floors.length+castleKeepFloorIndex('great_hall_dark_brick'),
    water=castleFloorIndex('moat_water_rippled'),
    rng=new RNG(seed),map=new TileMap(CW,CH),props=[],id=(x,y)=>y*CW+x,
    dist=(x,y,p)=>Math.hypot(x-p[0],y-p[1]);
  if(!floors.length||water<0)throw new Error('Castle floors and moat water must load before generating the overworld.');
  const rooms=[
    {id:'throne_hall',name:'Throne Hall',rect:[38,33,56,49],floor:hallFloor,wallStyle:'keep_wall_01_pale_quarry',doors:[[47,49,'door_01_oak_keep_door_SE_open'],[48,49,'door_01_oak_keep_door_SE_open'],[49,49,'door_01_oak_keep_door_SE_open']]},
    {id:'cathedral',name:'Cathedral',rect:[29,42,41,59],floor:chapelFloor,wallStyle:'keep_wall_02_honey_chapel',doors:[[41,51,'door_05_carved_chapel_door_NE_open'],[34,59,'door_05_carved_chapel_door_SE_open'],[35,59,'door_05_carved_chapel_door_SE_open'],[36,59,'door_05_carved_chapel_door_SE_open']]},
    {id:'great_hall',name:'Great Hall',rect:[43,51,57,60],floor:greatFloor,wallStyle:'keep_wall_03_aged_keep',doors:[[43,55,'door_04_arched_stable_door_SW_open'],[43,56,'door_04_arched_stable_door_SW_open']]},
  ];
  map.t.fill(1);map.losBlocks=true;map.rampartDeck=new Uint8Array(CN);map.rampartHeight=0;
  const wallPath=[[34,26],[47,26],[47,28],[52,28],[52,31],[61,31],[66,31],[66,36],[66,43],[63,43],[63,46],[63,52],[59,52],[59,61],[53,65],[45,65],[45,62],[41,62],[34,62],[30,58],[30,50],[33,50],[33,46],[33,41],[30,41],[30,34],[34,34],[34,30],[34,26]];
  const entry=CASTLE_ENTRY,exit=CASTLE_EXIT,center=CASTLE_SHRINE;
  const drawRoad=([ax,ay],[bx,by],width,material)=>{
    const steps=Math.ceil(Math.hypot(bx-ax,by-ay)*2);
    for(let s=0;s<=steps;s++){const t=steps?s/steps:0,x=ax+(bx-ax)*t,y=ay+(by-ay)*t,r=Math.ceil(width);
      for(let yy=Math.floor(y-r);yy<=Math.ceil(y+r);yy++)for(let xx=Math.floor(x-r);xx<=Math.ceil(x+r);xx++)
        if(xx>=0&&yy>=0&&xx<CW&&yy<CH&&Math.hypot(xx+.5-x,yy+.5-y)<=width){map.v[id(xx,yy)]=material;map.block[id(xx,yy)]=0;}
    }
  };
  // Broad avenues lead to a defensible causeway and the south gate; side posterns
  // feed directly to the same courtyard instead of leaving the wall walk isolated.
  drawRoad(entry,[48.5,73.5],2.1,earth);drawRoad([48.5,73.5],[48.5,65.5],1.8,stone);
  drawRoad(exit,[42.5,19.5],1.5,earth);drawRoad([42.5,19.5],[42.5,31.5],1.5,stone);
  const reserved=(x,y)=>[entry,exit,...CASTLE_SITES].some(p=>dist(x,y,p)<5.8)||
    rooms.some(r=>x>=r.rect[0]-1&&x<=r.rect[2]+1&&y>=r.rect[1]-1&&y<=r.rect[3]+1)||
    (x>40&&x<57&&y>36&&y<55)||Math.abs(x-48.5)<3.1&&(y>64&&y<75)||Math.abs(x-42.5)<2.6&&(y>18&&y<32);
  const add=(asset,category,x,y,scale=.5,light=0)=>{
    const spr=castleObject(asset,category);if(!spr)return false;
    props.push({kind:'scatter',x,y,spr,k:TW/160*scale,flip:false,light,z:0});return true;
  };
  for(let y=0;y<CH;y++)for(let x=0;x<CW;x++){
    const i=id(x,y),cx=x+.5,cy=y+.5,edge=Math.min(x,y,CW-x-1,CH-y-1);
    const westGrove=((x-15)**2/270+(y-43)**2/680<1),eastGrove=((x-80)**2/310+(y-43)**2/720<1);
    const grove=westGrove||eastGrove||edge<2;
    let floor=grove?shaded:grass;
    if((x<23||x>73||y<16||y>71)&&floor===grass&&((x+y)%17<2))floor=dry;
    else if(x>=29&&x<=67&&y>=25&&y<=66&&((x*7+y*11)%37===0))floor=damp;
    if(Math.abs(cx-48.5)<15&&Math.abs(cy-45.5)<14)floor=grass;
    map.v[i]=floor<0?0:floor;
    if(x<2||y<2||x>=CW-2||y>=CH-2){map.block[i]=1;continue;}
    const moat=x>=24&&x<=72&&y>=18&&y<=71&&(x<=27||x>=69||y<=21||y>=68);
    const bridge=(y>=18&&y<=21&&x>=41&&x<=43)||(y>=68&&y<=71&&x>=46&&x<=50)||
      (x>=24&&x<=27&&y>=36&&y<=40)||(x>=69&&x<=72&&y>=36&&y<=40);
    if(moat&&!bridge){map.v[i]=water;map.block[i]=1;}
    else if(bridge)map.v[i]=stone;
    if(grove&&rng.chance(.25)&&!reserved(cx,cy)&&!bridge)map.block[i]=1;
  }
  const wallCells=new Set(),trace=(a,b)=>{
    let x=a[0],y=a[1],dx=Math.abs(b[0]-x),sx=x<b[0]?1:-1,dy=-Math.abs(b[1]-y),sy=y<b[1]?1:-1,err=dx+dy;
    for(;;){wallCells.add(id(x,y));if(x===b[0]&&y===b[1])break;const e=2*err;
      if(e>=dy){err+=dy;x+=sx;}if(e<=dx){err+=dx;y+=sy;}}
  };
  for(let i=1;i<wallPath.length;i++)trace(wallPath[i-1],wallPath[i]);
  const poly=wallPath.slice(0,-1),inside=(x,y)=>{let c=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){
    const a=poly[i],b=poly[j];if(((a[1]>y)!==(b[1]>y))&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])c=!c;}return c;};
  const gates=new Set();
  for(const [x,y] of [[47,65],[48,65],[49,65],[41,26],[42,26],[43,26],[30,36],[30,37],[66,36],[66,37]])gates.add(id(x,y));
  const wallStyles=['wall_01_quarry_limestone','wall_02_aged_castle','wall_03_mossed_limestone',
    'wall_04_rain_darkened','wall_05_pale_dressed','wall_06_soot_marked','wall_07_honey_ashlar',
    'wall_08_red_sandstone','wall_09_blue_slate','wall_10_olive_granite'];
  // Five full cells of playable parapet behind one continuous curtain wall.
  // Intentional gates are the only openings; every other corner is joined 4-way.
  const deck=new Set(wallCells);
  for(let y=22;y<=69;y++)for(let x=27;x<=69;x++)if(inside(x+.5,y+.5)){
    let near=Infinity;for(const wi of wallCells){const wx=wi%CW,wy=(wi/CW)|0;near=Math.min(near,Math.abs(wx-x)+Math.abs(wy-y));}
    if(near<=5)deck.add(id(x,y));
  }
  for(const i of deck){map.rampartDeck[i]=1;map.block[i]=0;map.v[i]=battlement<0?stone:battlement;}
  map.rampartWall=new Uint8Array(CN);
  const familyFrames=new Map();
  for(const f of castleFrames('walls')){const k=f.id.split('_').slice(0,4).join('_')+'|'+f.connection_mask;const a=familyFrames.get(k)||[];a.push(f);familyFrames.set(k,a);}
  const keepFamilyFrames=new Map();
  for(const f of castleKeepWallFrames()){const key=f.family+'|'+f.connection_mask,items=keepFamilyFrames.get(key)||[];items.push(f);keepFamilyFrames.set(key,items);}
  const isGate=(x,y)=>gates.has(id(x,y));
  // Historic curtain walls read as continuous masonry runs, not a patchwork
  // that swaps stone color at every bend. Spread ten existing family variants
  // across the length of the wall while keeping all authored corner masks.
  const segmentStyle=new Int8Array(CN).fill(-1);
  const wallLength=wallPath.slice(1).reduce((sum,b,i)=>sum+
    Math.abs(b[0]-wallPath[i][0])+Math.abs(b[1]-wallPath[i][1]),0);
  let distanceAlongWall=0;
  for(let segment=1;segment<wallPath.length;segment++){
    const a=wallPath[segment-1],b=wallPath[segment];
    const steps=Math.abs(b[0]-a[0])+Math.abs(b[1]-a[1]);
    for(let q=0;q<=steps;q++){
      const x=a[0]+Math.sign(b[0]-a[0])*q,y=a[1]+Math.sign(b[1]-a[1])*q,i=id(x,y);
      if(segmentStyle[i]<0)
        segmentStyle[i]=castleWallFamilyAt(distanceAlongWall+q,wallLength,wallStyles.length);
    }
    distanceAlongWall+=steps;
  }
  for(const i of wallCells){const x=i%CW,y=(i/CW)|0;if(isGate(x,y))continue;
    const joined=(nx,ny)=>wallCells.has(id(nx,ny))&&!gates.has(id(nx,ny));
    const mask=(joined(x,y-1)?1:0)|(joined(x+1,y)?2:0)|
      (joined(x,y+1)?4:0)|(joined(x-1,y)?8:0);
    const style=wallStyles[(segmentStyle[i]>=0?segmentStyle[i]:0)%wallStyles.length],frames=familyFrames.get(style+'|'+mask);
    if(!frames?.length)throw new Error('Missing wall texture/topology '+style+' mask '+mask);
    const spr=castleObject(rng.pick(frames).id,'walls');
    if(!spr)throw new Error('Castle wall texture failed to load.');spr.textureVariant=style;
    props.push({kind:'scatter',x:x+.5,y:y+.5,spr,k:TW/160*.94,flip:false,z:0});map.rampartWall[i]=1;map.block[i]=0;
  }
  const ramp=(cells)=>cells.forEach(([x,y])=>{const i=id(x,y);if(x<0||y<0||x>=CW||y>=CH)return;map.block[i]=0;map.v[i]=stone;map.rampartDeck[i]=1;});
  // Four broad, three-tile stair approaches. South is the drawbridge; the other
  // three rise through defended posterns beside projecting corner bastions.
  const stairs=[
    {art:'castle_stairs_broad_NW',x:48.5,y:67.5,lanes:[[47,69],[48,69],[49,69],[47,68],[48,68],[49,68],[47,67],[48,67],[49,67],[47,66],[48,66],[49,66],[47,65],[48,65],[49,65],[47,64],[48,64],[49,64]]},
    {art:'castle_stairs_broad_NE',x:42.5,y:23.5,lanes:[[41,21],[42,21],[43,21],[41,22],[42,22],[43,22],[41,23],[42,23],[43,23],[41,24],[42,24],[43,24],[41,25],[42,25],[43,25],[41,26],[42,26],[43,26]]},
    {art:'castle_stairs_tower_SW',x:28.5,y:37.5,lanes:[[27,36],[27,37],[27,38],[28,36],[28,37],[28,38],[29,36],[29,37],[29,38],[30,36],[30,37],[30,38],[31,36],[31,37],[31,38]]},
    {art:'castle_stairs_tower_SE',x:68.5,y:38.5,lanes:[[65,37],[65,38],[65,39],[66,37],[66,38],[66,39],[67,37],[67,38],[67,39],[68,37],[68,38],[68,39],[69,37],[69,38],[69,39]]},
    {art:'castle_stairs_broad_NW',x:35.5,y:59.5,lanes:[[34,57],[35,57],[36,57],[34,58],[35,58],[36,58],[34,59],[35,59],[36,59]]},
    {art:'castle_stairs_broad_NE',x:60.5,y:48.5,lanes:[[60,46],[60,47],[60,48],[61,46],[61,47],[61,48],[62,46],[62,47],[62,48]]},
    {art:'castle_stairs_tower_SW',x:37.5,y:29.5,lanes:[[35,29],[36,29],[37,29],[35,30],[36,30],[37,30],[35,31],[36,31],[37,31]]},
    {art:'castle_stairs_tower_SE',x:33.5,y:45.5,lanes:[[32,43],[32,44],[32,45],[33,43],[33,44],[33,45],[34,43],[34,44],[34,45]]},
  ];
  for(const st of stairs){ramp(st.lanes);add(st.art,'castle_stairs',st.x,st.y,1.0);}
  // Moat crossings, a raised portcullis/drawbridge entrance, and an inner keep ward.
  for(const [asset,x,y,scale] of [['castle_moat_edge_north_bank',48.5,18.5,.62],['castle_moat_edge_south_bank',48.5,69.5,.62],
    ['castle_moat_edge_west_bank',25.5,38.5,.62],['castle_moat_edge_east_bank',71.5,38.5,.62]])add(asset,'moat_edges',x,y,scale);
  for(const [asset,x,y,scale] of [['castle_bridge_standard_arch_NW',43.5,20.5,.92],['castle_drawbridge_closed_SE',48.5,68.5,1.2],
    ['castle_bridge_short_arch_SW',25.5,38.5,.88],['castle_bridge_short_arch_NE',71.5,38.5,.88]])add(asset,'castle_bridges',x,y,scale);
  add('castle_landmark_02_gatehouse_wall_turn','castle_landmarks',48.5,64.5,1.25);
  // Use the original authored arches at the three lesser posterns instead
  // of leaving gate openings as bare missing wall modules. These are visual
  // overlays; pathing still uses the existing explicit gate openings.
  for(const [asset,x,y] of [
    ['gateway_01_arched_castle_gate_SE',42.5,26.5],
    ['gateway_01_arched_castle_gate_SW',30.5,36.5],
    ['gateway_01_arched_castle_gate_NE',66.5,36.5],
  ])add(asset,'gateways',x,y,.72);
  // The 200-piece wall atlas preserves every connection mask; authored
  // curtain-wall battlements break up the timber-like surface on long straight
  // runs, without replacing or mirroring the correctly oriented wall pieces.
  for(const [x,y] of [[40.5,26.5],[58.5,31.5],[61.5,52.5],[38.5,62.5],[48.5,65.5]])
    if(!isGate(Math.floor(x),Math.floor(y)))
      add('castle_landmark_04_curtain_wall_battlement','castle_landmarks',x,y,.62);
  const towers=[[34.5,26.5,'castle_landmark_03_round_tower_upper'],[55.5,31.5,'castle_landmark_05_square_tower_upper'],
    [66.5,36.5,'castle_landmark_08_corner_tower_cluster'],[63.5,46.5,'castle_landmark_03_round_tower_upper'],
    [59.5,61.5,'castle_landmark_05_square_tower_upper'],[53.5,65.5,'castle_landmark_08_corner_tower_cluster'],
    [41.5,62.5,'castle_landmark_03_round_tower_upper'],[30.5,50.5,'castle_landmark_05_square_tower_upper'],
    [30.5,34.5,'castle_landmark_08_corner_tower_cluster']];
  for(const [x,y,asset] of towers)add(asset,'castle_landmarks',x,y,.88);
  // Tower-top stair access and wall-top sconces make the whole route playable at night.
  for(const [x,y] of [[37,28],[43,28],[50,30],[59,33],[63,39],[61,48],[57,55],[53,61],[46,60],[37,59],[34,54],[32,45],[32,37],[34,32]]){
    const frame=rng.pick(castleFrames('torches'));add(frame.id,'torches',x+.5,y+.5,.56,5.0);
  }
  for(const [asset,x,y] of [['castle_hanging_01_01_eclipse_sun_NE',38.5,30.5],['castle_hanging_01_07_wingless_raven_NE',57.5,34.5],
    ['castle_hanging_01_10_triple_moon_NE',39.5,60.5],['castle_hanging_01_09_crossed_hammers_NE',57.5,57.5]])add(asset,'wall_hangings',x,y,.48);
  // Three enterable, roof-open keep interiors sit inside the fortress walls.
  // Their exact tile floors and connected wall modules share the Castle pack's
  // 160x80 dimetric contract; doorway cells are true walkable breaks in walls.
  const roomWalls=new Set(),roomWallOwner=new Map(),roomDoors=[];map.castleRoomWalls=new Uint8Array(CN);
  for(const room of rooms){
    const [x0,y0,x1,y1]=room.rect,doorSet=new Set(room.doors.map(d=>id(d[0],d[1])));
    for(let y=y0+1;y<y1;y++)for(let x=x0+1;x<x1;x++){
      const i=id(x,y);map.v[i]=room.floor<0?stone:room.floor;map.block[i]=0;
    }
    for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
      if(x!==x0&&x!==x1&&y!==y0&&y!==y1)continue;
      const i=id(x,y);if(doorSet.has(i)){map.v[i]=room.floor<0?stone:room.floor;map.block[i]=0;roomDoors.push({room:room.id,x,y,asset:room.doors.find(d=>d[0]===x&&d[1]===y)?.[2]});continue;}
      roomWalls.add(i);roomWallOwner.set(i,room);
    }
  }
  for(const i of roomWalls){const x=i%CW,y=(i/CW)|0,room=roomWallOwner.get(i);
    const joined=(nx,ny)=>roomWalls.has(id(nx,ny))&&roomWallOwner.get(id(nx,ny))===room;
    const mask=(joined(x,y-1)?1:0)|(joined(x+1,y)?2:0)|(joined(x,y+1)?4:0)|(joined(x-1,y)?8:0);
    const frames=keepFamilyFrames.get(room.wallStyle+'|'+mask);if(!frames?.length)throw new Error('Missing interior wall topology '+room.wallStyle+' mask '+mask);
    const spr=castleObject(rng.pick(frames).id,'keep_walls');spr.textureVariant=room.wallStyle;map.block[i]=1;map.castleRoomWalls[i]=1;
    props.push({kind:'scatter',x:x+.5,y:y+.5,spr,k:TW/160*.94,flip:false,z:0,roomWall:true});
  }
  for(const d of roomDoors){const spr=castleObject(d.asset,'doors');if(!spr)throw new Error('Missing keep door '+d.asset);
    props.push({kind:'scatter',x:d.x+.5,y:d.y+.5,spr,k:TW/160*.78,flip:false,z:0,roomDoor:true});
  }
  // The atlas already has oriented stone-window and room-plaque sprites.
  // Mount them on real keep walls, with the original authored pivots, rather
  // than on the floor or across any open doorway.
  for(const [asset,category,x,y,scale] of [
    ['window_03_lancet_keep_SE','windows',43.5,33.5,.7],
    ['window_03_lancet_keep_SE','windows',51.5,33.5,.7],
    ['window_05_twin_lancet_SW','windows',29.5,47.5,.65],
    ['window_05_twin_lancet_SW','windows',29.5,54.5,.65],
    ['window_02_round_barred_SE','windows',48.5,51.5,.65],
    ['sign_05_chapel_plaque_SE','signs',35.5,59.5,.6],
    ['sign_02_hall_plaque_SW','signs',43.5,55.5,.6],
  ])add(asset,category,x,y,scale);
  const furnish=(id,x,y,scale,light=0,flip=false,z=0)=>{
    const spr=castleObject(id,'furniture');if(!spr)throw new Error('Missing keep furnishing '+id);
    props.push({kind:'scatter',x,y,spr,k:TW/160*scale,flip,light,z});return spr;
  };
  // Throne hall: a raised dais at the north end, clear central combat space,
  // paired banquet tables and wall-side guard seats.
  furnish('furniture_01_throne_dais',47.5,36.2,.38,0);
  for(const [asset,x,y] of [['scatter_09_trestle_table',42.5,40.5],['scatter_09_trestle_table',52.5,40.5],
    ['scatter_10_guard_bench',41.5,44.5],['scatter_10_guard_bench',53.5,44.5],['scatter_31_shield_rack',39.5,38.5],['scatter_32_spear_bundle',54.5,38.5]])
      add(asset,'scatter',x,y,asset.includes('table')?.66:asset.includes('bench')?.55:.42);
  // Cathedral: long nave, a broad aisle, side chapels, and a raised pulpit.
  furnish('furniture_03_cathedral_pulpit',35.5,44.5,.30,1.8);
  for(let row=0;row<6;row++)for(const x of [32.5,38.5])furnish('furniture_02_cathedral_pew',x,47.5+row*2.0,.13,0,row%2===1);
  for(const [x,y] of [[30.5,44.5],[39.5,44.5],[30.5,56.5],[39.5,56.5]])furnish('furniture_05_floor_candelabrum',x,y,.105,4.5);
  for(const [x,y] of [[35.5,50.5],[35.5,53.5],[35.5,56.5]])furnish('furniture_04_hanging_chandelier',x,y,.30,3.0,false,28);
  // Great hall sideboard and a clear wide lane for combat and movement.
  for(const [asset,x,y] of [['scatter_09_trestle_table',47.5,53.5],['scatter_09_trestle_table',52.5,53.5],
    ['scatter_10_guard_bench',47.5,57.5],['scatter_10_guard_bench',52.5,57.5],['scatter_97_armor_stand',55.5,56.5]])
      add(asset,'scatter',x,y,asset.includes('table')?.58:asset.includes('bench')?.48:.42);
  furnish('furniture_04_hanging_chandelier',50.5,56.5,.28,3.0,false,26);
  // Outer groves frame the fort rather than filling the lawns with noisy debris.
  for(let y=2;y<CH-2;y++)for(let x=2;x<CW-2;x++){
    const i=id(x,y);if(!map.block[i]||map.v[i]===water||x>=28&&x<=68&&y>=23&&y<=68)continue;
    if(rng.chance(.2))add(rng.pick(castleFrames('trees')).id,'trees',x+.5,y+.5,.55);
  }
  let scatterCount=0;
  for(let n=0;n<9000&&scatterCount<460;n++){
    const x=rng.int(2,CW-3)+.5,y=rng.int(2,CH-3)+.5;
    if(!map.walkable(x,y)||reserved(x,y)||!map.circleFree(x,y,.32))continue;
    const grove=((x-15)**2/270+(y-43)**2/680<1)||((x-80)**2/310+(y-43)**2/720<1);
    const wardEdge=x>=30&&x<=66&&y>=26&&y<=65&&(x<=36||x>=59||y<=32||y>=58);
    if(!grove&&!wardEdge&&!rng.chance(.045))continue;
    const frame=rng.pick(castleFrames('scatter'));
    if(add(frame.id,'scatter',x,y,.5))scatterCount++;
  }
  const looks=rollLooks(biome,rng.fn()),spawns=[];
  for(let i=0;i<34;i++){
    const x=rng.int(8,CW-9)+.5,y=rng.int(8,CH-9)+.5;
    if(!map.circleFree(x,y,.35)||dist(x,y,entry)<11||dist(x,y,center)<9)continue;
    const arch=rng.pick(biome.roster);spawns.push({x,y,arch,n:rng.int(2,4),rank:i%10===0?'champion':'normal',look:looks.pick(arch)});
  }
  const seen=new Uint8Array(CN),q=[id(Math.floor(entry[0]),Math.floor(entry[1]))];seen[q[0]]=1;
  for(let a=0;a<q.length;a++){const i=q[a],x=i%CW,y=(i/CW)|0;for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
    const nx=x+dx,ny=y+dy,j=id(nx,ny);if(nx>=0&&ny>=0&&nx<CW&&ny<CH&&map.walkableTile(nx,ny)&&!seen[j]){seen[j]=1;q.push(j);}}}
  if([exit,...CASTLE_SITES].some(([x,y])=>!seen[id(Math.floor(x),Math.floor(y))]))throw new Error('Castle moat, gate or stair blocked a route; seed '+seed);
  for(const st of stairs)for(const [x,y] of st.lanes)if(!map.walkableTile(x,y))throw new Error('Castle stair lane blocked at '+x+','+y);
  const chests=[[40.5,51.5],[56.5,51.5],[48.5,36.5]].map(([x,y],i)=>({x,y,rare:i===0||rng.chance(.2)}));
  map.castleRooms=rooms.map(r=>({id:r.id,name:r.name,rect:r.rect.slice(),floor:r.floor}));
  map.castleDoors=roomDoors.map(d=>({room:d.room,x:d.x+.5,y:d.y+.5,asset:d.asset}));
  const fixedSpawns=[['throne_hall',46.5,44.5],['cathedral',35.5,55.5],['great_hall',49.5,58.5]];
  for(const [room,x,y] of fixedSpawns){const arch=rng.pick(biome.roster);spawns.push({x,y,arch,n:2,rank:'normal',look:looks.pick(arch),castleRoom:room});}
  return {map,props,buildings:[],wallHangings:[],townTiles:allFloors,looks,spawns,chests,torches:[],
    start:entry,exit,shrine:center,sites:CASTLE_SITES,scenarioId:(((seed>>>0)^depth)>>>0)%35,seed};
}

// Give the Castle four times the playable ground area: every original map cell
// becomes a 2x2 cluster, preserving collision topology while making the keep,
// courtyards and broad ramparts large enough for full encounters.
function generateCastle(depth,biome,seed){
  const base=generateCastleBase(depth,biome,seed),old=base.map,factor=2;
  const map=new TileMap(old.w*factor,old.h*factor);map.losBlocks=old.losBlocks;
  map.castleRooms=old.castleRooms;map.castleDoors=old.castleDoors;
  for(const key of ['t','v','block','rampartDeck','rampartWall','castleRoomWalls']){
    const src=old[key];if(!src)continue;const dst=new src.constructor(map.w*map.h);
    for(let y=0;y<old.h;y++)for(let x=0;x<old.w;x++){
      const val=src[y*old.w+x],xx=x*factor,yy=y*factor;
      for(let dy=0;dy<factor;dy++)for(let dx=0;dx<factor;dx++)dst[(yy+dy)*map.w+xx+dx]=val;
    }
    map[key]=dst;
  }
  map.baseCastleSize=[old.w,old.h];map.baseRampartWallCount=old.rampartWall.reduce((n,v)=>n+v,0);
  const point=p=>p&&[p[0]*factor,p[1]*factor];
  for(const key of ['start','exit','shrine'])base[key]=point(base[key]);
  base.sites=base.sites.map(point);
  for(const k of ['spawns','chests'])for(const item of base[k]||[]){item.x*=factor;item.y*=factor;}
  for(const p of base.props||[]){
    p.x*=factor;p.y*=factor;
    // Structural wall connectors must follow the enlarged grid; small props
    // and interior furniture must stay proportional to the 60px-tall hero.
    p.k=scaledCastlePropK(p,factor,TW);
  }
  for(const d of map.castleDoors||[]) { d.x*=factor;d.y*=factor; }
  if(map.castleRooms)map.castleRooms=map.castleRooms.map(r=>({...r,rect:r.rect.map(n=>n*factor)}));
  base.map=map;return base;
}

function generateSeaOfSand(depth,biome,seed) {
  if (!seaOfSandFloorTiles().length) throw new Error('Sea of Sand art must load before generating its overworld.');
  const rng=new RNG(seed),map=new TileMap(W,H),floors=seaOfSandFloorTiles(),props=[];
  const scenarioCount=1+((seed>>>5)%5),scenarioSites=SAND_SITES.slice(0,scenarioCount);
  map.t.fill(1);map.losBlocks=true;
  const I=(x,y)=>y*W+x,dist=(x,y,p)=>Math.hypot(x-p[0],y-p[1]);
  const links=[[ENTRY,SAND_SITES[0]],[SAND_SITES[0],SAND_SITES[4]],[SAND_SITES[4],SAND_SITES[1]],
    [SAND_SITES[4],SAND_SITES[2]],[SAND_SITES[4],SAND_SITES[3]],[SAND_SITES[1],EXIT]];
  // Each route is a seeded, gently meandering caravan track. The same anchor
  // network stays connected, while the curve bends, phase, and width vary per seed.
  const routes=links.map(([a,b],i)=>{
    const dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy),nx=-dy/len,ny=dx/len;
    const amp=rng.range(1.8,4.1),phase=rng.range(0,Math.PI*2),cycles=rng.range(1.2,2.5);
    const pts=[];for(let s=0;s<=40;s++){const t=s/40,env=Math.sin(Math.PI*t),bend=Math.sin(t*cycles*Math.PI*2+phase)*amp*env;
      pts.push([a[0]+dx*t+nx*bend,a[1]+dy*t+ny*bend]);}
    return {pts,radius:rng.range(1.75,2.15),trail:rng.range(.82,1.12),id:i};
  });
  const routeDistance=(x,y,routesToCheck=routes)=>Math.min(...routesToCheck.map(r=>r.pts.slice(1).reduce((best,p,i)=>Math.min(best,lineDist(x,y,r.pts[i],p)),Infinity)));
  const onRoute=(x,y,radius)=>routes.some(r=>routeDistance(x,y,[r])<radius);
  const outcrops=Array.from({length:36},()=>({
    x:rng.range(4,W-4),y:rng.range(4,H-4),rx:rng.range(2.2,5.2),ry:rng.range(.8,1.8),a:rng.range(0,Math.PI),
  }));
  const floorAt=(x,y)=>{
    // Fine dune sand stays dominant. Terrain changes follow long fields and
    // the dry wash; paving is confined to objective courtyards.
    const nearestSite=Math.min(...SAND_SITES.map(p=>dist(x,y,p)));
    if(nearestSite<1.8)return nearestSite<0.8?30:31;
    if(onRoute(x,y,.9))return 15; // caravan trail
    const washX=13+y*.49+Math.sin(y*.14+seed*.0003)*4;
    if(Math.abs(x-washX)<1.15)return 21;
    const dunes=(Math.sin(x*.12+seed*.0007)+Math.cos(y*.1-x*.055+seed*.0003))/2;
    if(dunes>.72)return 3;
    if(dunes<-.78)return 2;
    return 0;
  };
  const reserved=(x,y)=>[ENTRY,EXIT,...SAND_SITES].some(p=>dist(x,y,p)<9.5)||onRoute(x,y,3.1);
  const add=(spr,x,y,options={})=>{if(!spr)return;props.push({kind:'scatter',x,y,spr,k:TW/160*(options.scale||1),flip:false,light:options.light||0});};
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    const i=I(x,y),cx=x+.5,cy=y+.5;
    map.v[i]=floorAt(cx,cy);
    if(x===0||y===0||x===W-1||y===H-1){map.block[i]=1;continue;}
    const corridor=onRoute(cx,cy,2.7);
    // Eroded, wind-shaped outcrops replace the old rigid checkerboard wall
    // maze. The objective corridors remain clear and visually marked by tracks.
    const outcrop=outcrops.some(o=>{
      const dx=cx-o.x,dy=cy-o.y,ca=Math.cos(o.a),sa=Math.sin(o.a);
      const u=(dx*ca+dy*sa)/o.rx,v=(-dx*sa+dy*ca)/o.ry;
      const edge=1+.14*Math.sin(cx*1.7+seed*.013)*Math.cos(cy*1.9-seed*.009);
      return u*u+v*v<edge;
    });
    const dune=((Math.sin(x*.27+seed*.00003)+Math.cos(y*.31-x*.12))/2)>.82&&rng.chance(.12);
    if(!reserved(cx,cy)&&!corridor&&(outcrop||dune))map.block[i]=1;
  }
  const cliffs=seaOfSandFrames('cliff');
  const sandstone=cliffs.find(f=>f.material==='sunbaked_sandstone')?.material;
  const ruinBrick=cliffs.find(f=>f.material==='ruin_brick')?.material;
  const cliffByMask=new Map();
  for(const f of cliffs)if(f.connection_mask!=null){if(!cliffByMask.has(f.connection_mask))cliffByMask.set(f.connection_mask,[]);cliffByMask.get(f.connection_mask).push(f);}
  const dirs=[[0,-1,1],[1,0,2],[0,1,4],[-1,0,8]];
  for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(map.block[I(x,y)]){
    // The blocked perimeter also gets cliff pieces, so the camera never looks
    // through an unfinished map edge into black void.
    let mask=0;for(const [dx,dy,bit] of dirs){const nx=x+dx,ny=y+dy;if(nx>=0&&ny>=0&&nx<W&&ny<H&&map.block[I(nx,ny)])mask|=bit;}
    const variants=cliffByMask.get(mask)||cliffByMask.get(0);
    // One cliff material per broad region prevents a randomly patched wall
    // maze while retaining matching corner/end/tee topology pieces.
    const nearRuin=SAND_SITES.some(p=>dist(x+.5,y+.5,p)<4);
    const material=nearRuin&&ruinBrick?ruinBrick:sandstone;
    const family=variants.filter(v=>v.material===material);
    const f=rng.pick(family.length?family:variants);
    add(seaOfSandCliff(f?.name),x+.5,y+.5,{scale:1});
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
  for(let n=0;n<185;n++){
    const x=rng.int(2,W-3)+.5,y=rng.int(2,H-3)+.5;
    if(!map.walkable(x,y)||reserved(x,y)&&rng.chance(.82))continue;
    add(seaOfSandObject(rng.pick(SAND_SCATTER)),x+rng.range(-.2,.2),y+rng.range(-.2,.2),{scale:rng.range(.42,.58)});
  }
  // Small debris and hardy plants collect in natural clusters at the base of
  // the wind-carved outcrops, giving the open dunes scale without cluttering trails.
  const groundCluster=['dry_scrub','spiny_aloe','reed_bundle','wind_carved_boulder','basalt_shards','broken_pottery'];
  for(let patch=0;patch<42;patch++){
    const x=rng.int(3,W-4)+.5,y=rng.int(3,H-4)+.5;
    if(!map.walkable(x,y)||reserved(x,y))continue;
    const count=rng.int(2,4);
    for(let n=0;n<count;n++){
      const px=x+rng.range(-1.1,1.1),py=y+rng.range(-.8,.8);
      if(map.walkable(px,py)&&!reserved(px,py))add(seaOfSandObject(rng.pick(groundCluster)),px,py,{scale:rng.range(.42,.6)});
    }
  }
  // Oasis palms ring the central caravan rest and provide recognizable landmarks.
  for(const [x,y] of [[34.5,33.5],[39.5,34.5],[34.5,38.5],[39.5,38.5]]){
    const t=seaOfSandObject(rng.pick(['date_palm','doum_palm','fruiting_oasis_palm']),'tree');
    add(t,x,y,{scale:.55});
  }
  for(const [name,x,y,scale] of [
    ['canvas_tent',35.4,31.8,.66],['canvas_tent',39.8,36.8,.62],
    ['bronze_brazier',37.2,32.8,.58],['clay_water_jar',33.7,37.2,.62],
  ])add(seaOfSandObject(name),x,y,{scale});
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
