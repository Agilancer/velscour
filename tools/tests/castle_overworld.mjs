// Node-only asset contract, castle map reachability and overworld rotation checks.
//   node tools/tests/castle_overworld.mjs [seeds]
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const json=(p)=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const pack=json('assets/tiles/castle/pack.json'),trees=json('assets/tiles/dark_forest/trees.json'),ramparts=json('assets/tiles/castle/ramparts.json');
globalThis.fetch=async(url)=>({ok:true,json:async()=>String(url).includes('dark_forest')?trees:String(url).includes('ramparts')?ramparts:pack});
globalThis.Image=class{set src(_) {queueMicrotask(()=>this.onload?.());}};
const imp=(p)=>import(pathToFileURL(path.join(root,p)));
const {loadCastlePack,castleFrames}=await imp('src/gfx/castle.js');
const {loadDarkForestTrees}=await imp('src/gfx/darkforest.js');
const {A}=await imp('src/core/assets.js');
const {BIOME_BY_ID,OVERWORLD_BIOME_IDS,drawBiome,recordBiomeVisit}=await imp('src/data/biomes.js');
const {generateOverworld}=await imp('src/world/overworld.js');
const {SCENARIOS,CASTLE_SCENARIOS}=await imp('src/game/overworld.js');
const {CASTLE_OUTER,CASTLE_INNER,CASTLE_GATES,CASTLE_SIZE,MAT}=await imp('src/world/castleworld.js');
await loadCastlePack();await loadDarkForestTrees();
A.town={meta:json('assets/tiles/town/town.json'),objects:{},ground:{}};
const counts={floors:60,transitions:120,walls:200,roofs:96,gables:24,gateways:12,doors:40,windows:32,torches:32,signs:96,scatter:120,trees:18,castle_landmarks:19,castle_stairs:16,castle_bridges:20,wall_hangings:128,moat_edges:8,furniture:5,keep_floors:6,keep_walls:60};
for(const [k,n] of Object.entries(counts))if(castleFrames(k).length!==n)throw Error(`${k}: expected ${n} frames`);
if(BIOME_BY_ID.castle?.pack!=='castle'||!BIOME_BY_ID.castle.overworld)throw Error('Castle overworld not registered');
if(!BIOME_BY_ID.sea_of_sand?.overworld||OVERWORLD_BIOME_IDS.length<3)throw Error('Sea of Sand or multi-overworld pool missing');
const I=(m,x,y)=>Math.floor(y)*m.w+Math.floor(x);
const flood=(m,start,ok)=>{const seen=new Uint8Array(m.w*m.h),q=[I(m,start[0],start[1])];seen[q[0]]=1;
 for(let j=0;j<q.length;j++){const i=q[j],x=i%m.w,y=(i/m.w)|0;for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,k=I(m,nx,ny);
  if(nx>=0&&ny>=0&&nx<m.w&&ny<m.h&&!seen[k]&&ok(nx,ny,k,i)){seen[k]=1;q.push(k);}}}return seen;};
const SEEDS=+process.argv[2]||100,stats={minScatter:Infinity,minTrees:Infinity,minFree:Infinity,ms:0};const scenarios=new Set();
for(let seed=1;seed<=SEEDS;seed++){
 const t0=performance.now(),gen=generateOverworld(19,BIOME_BY_ID.castle,seed*1777+31),m=gen.map;stats.ms=Math.max(stats.ms,performance.now()-t0);
 if(m.w!==CASTLE_SIZE[0]||m.h!==CASTLE_SIZE[1]||m.w*m.h<3*192*176)throw Error(`Castle board must be three times the old 192x176; got ${m.w}x${m.h}`);
 stats.minScatter=Math.min(stats.minScatter,gen.props.filter(p=>p.spr?.category==='scatter').length);
 stats.minTrees=Math.min(stats.minTrees,gen.trees.length);
 stats.minFree=Math.min(stats.minFree,m.block.reduce((n,v)=>n+!v,0));scenarios.add(gen.scenarioId);
 // A height map: the walls stand up out of the ground, the water lies sunk below it; walkers hop up and drop down
 // only as far as the map allows (map.stepOk), so floods follow that rule.
 if(!m.hgt||!m.tallOcclusion)throw Error(`Castle has no height map seed ${seed}`);
 const step=(ok)=>(x,y,k,from)=>ok(x,y,k)&&m.stepOk(from,k);
 const seen=flood(m,gen.start,step((x,y)=>m.walkableTile(x,y)));
 for(const [x,y] of [gen.exit,...gen.sites])if(!seen[I(m,x,y)])throw Error(`unreachable seed ${seed} at ${x},${y}`);
 // Both curtains are solid bands of masonry (outer 6 tiles thick, inner 5): merlons and crenels along the outside
 // edge, the walk level behind them; open only where a gate passage goes through at ground level.
 const rings=[[CASTLE_OUTER.x0*2,CASTLE_OUTER.y0*2,CASTLE_OUTER.x1*2+1,CASTLE_OUTER.y1*2+1,6,24],[CASTLE_INNER.x0*2-3,CASTLE_INNER.y0*2-3,CASTLE_INNER.x1*2+4,CASTLE_INNER.y1*2+4,5,32]];
 const gatePass=new Uint8Array(m.w*m.h);
 for(const [x0,y0,x1,y1,th,lv] of rings)for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
  const d=Math.min(x-x0,x1-x,y-y0,y1-y);if(d>=th)continue;const i=I(m,x,y);
  if(!m.rampartWall[i]){if(m.hgt[i]!==0||m.block[i])throw Error(`curtain hole seed ${seed} at ${x},${y}`);gatePass[i]=1;continue;}
  if(m.hgt[i]<lv)throw Error(`curtain below its walk seed ${seed} at ${x},${y}: ${m.hgt[i]}`);
  if(d===0&&!m.block[i]&&!m.castleTowers.some(t=>x>=t.x0&&x<=t.x1&&y>=t.y0&&y<=t.y1))throw Error(`open parapet seed ${seed} at ${x},${y}`);
 }
 const shut=(x,y,k)=>m.walkableTile(x,y)&&!gatePass[k];
 const open_=([x,y])=>{for(let r=0;r<6;r++)for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++)if(m.walkable(x+dx,y+dy)&&!m.hgt[I(m,x+dx,y+dy)])return [x+dx,y+dy];return [x,y];};
 const ward=open_([CASTLE_OUTER.x0*2+12,CASTLE_OUTER.y0*2+14]),court=open_([CASTLE_GATES.inner[0][0]*2+1,CASTLE_INNER.y1*2-3]);
 for(const [x,y] of [ward,court])if(!m.walkable(x,y)||!seen[I(m,x,y)])throw Error(`ward unreachable seed ${seed} at ${x},${y}`);
 const outerShut=flood(m,gen.start,step(shut));
 if(outerShut[I(m,...ward)]||outerShut[I(m,...court)])throw Error(`outer ward reachable over or round the curtain seed ${seed}`);
 if(flood(m,ward,step(shut))[I(m,...court)])throw Error(`inner ward reachable over or round its curtain seed ${seed}`);
 // Wall-walks: wide, all of them reached by the stairs; towers a few steps up; stairs from the ground to the walk.
 const walk=(k)=>m.rampartDeck[k]===1&&!m.block[k];let deck=0,lost=0;
 for(let k=0;k<m.w*m.h;k++)if(walk(k)){deck++;if(!seen[k])lost++;}
 if(deck<3500||lost>deck*.01)throw Error(`wall-walk ${deck} tiles, ${lost} unreachable seed ${seed}`);
 if(m.castleTowers?.length!==31)throw Error(`towers missing seed ${seed}: ${m.castleTowers?.length}`);
 for(const t of m.castleTowers){let up=false;for(let y=t.y0;y<=t.y1;y++)for(let x=t.x0;x<=t.x1;x++){const k=I(m,x,y);if(m.hgt[k]===t.top&&seen[k])up=true;}
  if(!up)throw Error(`tower top unreachable seed ${seed} at ${t.x0},${t.y0}`);}
 if(m.castleStairs?.length!==11)throw Error(`stairs missing seed ${seed}`);
 for(const s of m.castleStairs){const foot=I(m,s.x,s.y),top=I(m,s.x+s.dx*s.n,s.y+s.dy*s.n);
  if(!seen[foot]||!seen[top]||m.hgt[top]!==s.lv)throw Error(`stairs broken seed ${seed} at ${s.x},${s.y}`);}
 for(const [x,y] of m.rampartPosts)if(!m.rampartDeck[I(m,x,y)]||!m.walkable(x,y)||!seen[I(m,x,y)])throw Error(`rampart post off the walk seed ${seed} at ${x},${y}`);
 if(m.rampartPosts.length<8)throw Error(`too few rampart posts seed ${seed}`);
 if(gen.spawns.filter(s=>s.rampart).length<8)throw Error(`too few packs on the walls seed ${seed}`);
 // gate passages carry their arched lintels (sliced), the main gate its portcullis
 if(gen.props.filter(p=>p.gateArch).length<30)throw Error(`gate arches missing seed ${seed}`);
 const named=(re)=>gen.props.filter(p=>re.test(p.spr?.name||''));
 if(gen.props.filter(p=>p.keep).length<12)throw Error(`keep missing seed ${seed}`);
 // Bridges: a walkable deck at ground level over the sunken water, low parapets, arches on the side the camera sees.
 if(m.castleBridges.length!==3)throw Error(`bridges missing seed ${seed}`);
 for(const b of m.castleBridges){let over=0,arches=0;
  for(let y=b.far;y<b.near;y++){for(let x=b.x0;x<=b.x1;x++){const k=I(m,x,y);if(!m.walkableTile(x,y)||!seen[k]||m.hgt[k]!==0)throw Error(`bridge ${b.kind} deck blocked seed ${seed} at ${x},${y}`);if(m.bridgeWater[k])over++;}
   if(!m.block[I(m,b.x1+1,y)]||!m.block[I(m,b.x0-1,y)])throw Error(`bridge ${b.kind} parapet open seed ${seed}`);if(m.faceArch[I(m,b.x1+1,y)])arches++;}
  if(over<(b.near-b.far)*(b.x1-b.x0+1)*.6)throw Error(`bridge ${b.kind} not over water seed ${seed}`);
  if(arches!==b.near-b.far)throw Error(`bridge ${b.kind} arches missing seed ${seed}`);
  for(const y of [b.far-1,b.near])if(m.castleMat[I(m,(b.x0+b.x1)/2,y)]===MAT.water)throw Error(`bridge ${b.kind} ends in the water seed ${seed}`);
 }
 for(let i=0;i<m.w*m.h;i++)if(m.castleMat[i]===MAT.water&&m.hgt[i]>=0)throw Error(`water not sunk seed ${seed}`);
 // a road, trail or paving reaches every door, site, chest, stair foot and the exit (map.road; auto-play keeps to it)
 const nearRoad=([x,y],r=3)=>{for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){const X=Math.floor(x)+dx,Y=Math.floor(y)+dy;if(X>=0&&Y>=0&&X<m.w&&Y<m.h&&m.road[I(m,X,Y)])return true;}return false;};
 const DX=new Set(['alchemist','gems','socket','gamble','bakery']);
 for(const b of gen.buildings){const dx=DX.has(b.name)!==b.flip,d=dx?[b.x0+b.fp+.5,b.y0+b.fp/2]:[b.x0+b.fp/2,b.y0+b.fp+.5];if(!nearRoad(d))throw Error(`no trail to the ${b.name} door seed ${seed} at ${d}`);}
 for(const p of [...gen.sites,gen.exit,...gen.chests.map(c=>[c.x,c.y]),...m.castleStairs.map(st=>[st.x-st.dx+.5,st.y-st.dy+.5])])if(!nearRoad(p))throw Error(`no trail to ${p} seed ${seed}`);
 // the network is one piece from the arrival
 const roadSeen=flood(m,gen.start,(x,y,k,from)=>m.road[k]&&m.stepOk(from,k));let roads=0,cut=0;
 for(let k=0;k<m.w*m.h;k++)if(m.road[k]&&!m.hgt[k]){roads++;if(!roadSeen[k])cut++;}
 if(cut>roads*.03)throw Error(`road network in pieces seed ${seed}: ${cut} of ${roads} tiles cut off`);
 // Keep: three enterable halls with their own floors, doors and room to fight.
 if(m.castleRooms?.length!==3)throw Error(`three enterable keep interiors missing seed ${seed}`);
 if(m.castleDoors?.length<6)throw Error(`keep has too few doors seed ${seed}`);
 // the halls' walls are masonry too, their doorways clean openings with a lintel and two leaves against the wall
 for(let i=0;i<m.w*m.h;i++)if(m.castleRoomWalls[i]&&(m.hgt[i]!==18||!m.block[i]))throw Error(`hall wall not solid seed ${seed}`);
 if(gen.props.filter(p=>p.roomDoor&&/castle_panel_door/.test(p.spr?.name||'')).length!==2*m.castleDoors.length)throw Error(`door leaves missing seed ${seed}`);
 for(const d of m.castleDoors)if(!seen[I(m,d.x,d.y)]||!m.walkable(d.x,d.y))throw Error(`unreachable or blocked keep door seed ${seed} at ${d.x},${d.y}`);
 for(const r of m.castleRooms){const cx=(r.rect[0]+r.rect[2])/2|0,cy=(r.rect[1]+r.rect[3])/2|0;let free=0;
  for(let y=cy-10;y<cy+10;y++)for(let x=cx-10;x<cx+10;x++)if(m.walkableTile(x,y))free++;
  if(free<300)throw Error(`combat room ${r.id} too crowded seed ${seed}: ${free}`);}
 const furnitureHeights={furniture_01_throne_dais:92,furniture_02_cathedral_pew:34,furniture_03_cathedral_pulpit:78,furniture_04_hanging_chandelier:55,furniture_05_floor_candelabrum:48};
 for(const p of gen.props.filter(p=>p.spr?.category==='furniture')){
  const expected=furnitureHeights[p.spr.name];
  const ratio=p.spr.h*p.k/expected;   // the hero-relative contract (gfx/castlescale.js), grand pieces up to 1.5x
  if(expected&&(ratio<.99||ratio>1.5))throw Error(`mis-sized Castle furniture ${p.spr.name}: ${p.spr.h*p.k} vs ${expected}`);
 }
 const caps={scatter:132,trees:300,torches:50,wall_hangings:80,doors:126,gateways:130,windows:70,signs:62};
 for(const p of gen.props.filter(p=>p.spr)){const max=caps[p.spr.category];if(max&&p.spr.h*p.k>max+.001)throw Error(`oversized Castle ${p.spr.name}: ${p.spr.h*p.k} > ${max}`);}
 if(gen.props.filter(p=>p.banner).length<80)throw Error(`too few banners on the walls seed ${seed}`);
 for(const category of ['windows','signs','torches','furniture'])
  if(!gen.props.some(p=>p.spr?.category===category))throw Error(`missing Castle ${category} placements seed ${seed}`);
 if(gen.buildings.length<13)throw Error(`outbuildings and village missing seed ${seed}: ${gen.buildings.length}`);
 for(const b of gen.buildings)for(let y=b.y0;y<b.y0+b.fp;y++)for(let x=b.x0;x<b.x0+b.fp;x++)if(!m.block[I(m,x,y)])throw Error(`building ${b.name} footprint open seed ${seed}`);
 if(gen.spawns.filter(s=>s.castleRoom).length<3||gen.spawns.some(s=>s.castleRoom&&!m.circleFree(s.x,s.y,.7)))throw Error(`room encounter spawns blocked seed ${seed}`);
 if(!m.treeCells||gen.trees.filter(t=>t.tree).length<800)throw Error(`forest border missing seed ${seed}`);
 // Water is a connected river + moat system (it flows), never under a wall.
 for(let i=0;i<m.w*m.h;i++)if(m.castleMat[i]===MAT.water&&m.rampartWall[i])throw Error(`water under a wall seed ${seed}`);
}
if(stats.minScatter<700)throw Error(`expected 700 scatter placements; got ${stats.minScatter}`);
if(stats.minFree<40000)throw Error(`too little free combat space (${stats.minFree})`);
if(SEEDS>=100&&scenarios.size!==35)throw Error(`expected all 35 Castle scenarios; saw ${scenarios.size}`);
if(CASTLE_SCENARIOS!==35||SCENARIOS.length<CASTLE_SCENARIOS)throw Error(`expected 35 Castle scenario definitions; saw ${CASTLE_SCENARIOS}`);
const selected=new Set();for(let i=0;i<120;i++)selected.add(drawBiome({overworldMisses:3,lastBiome:null,biomeBag:[]},22));
for(const id of OVERWORLD_BIOME_IDS)if(!selected.has(id))throw Error(`guarantee pool never selected ${id}`);
for(let run=0;run<30;run++){
 const c={overworldMisses:0,overworldLastVisit:null,biomeBag:[],lastBiome:null};
 for(let d=1;d<=100;d++){
  const id=drawBiome(c,d),b=BIOME_BY_ID[id];
  if(c.overworldMisses>=3&&!b.overworld)throw Error(`missed three-dungeon guarantee run ${run} depth ${d}`);
  recordBiomeVisit(c,b,d);recordBiomeVisit(c,b,d);c.lastBiome=id;
 }
}
if(drawBiome({overworldMisses:3},500)!=='throne')throw Error('final throne precedence regressed');
console.log('CASTLE overworld OK',JSON.stringify({seeds:SEEDS,...stats,ms:Math.round(stats.ms),scenarios:scenarios.size}));
