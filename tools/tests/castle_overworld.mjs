// Node-only asset contract, castle map reachability and overworld rotation checks.
//   node tools/tests/castle_overworld.mjs
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const pack=JSON.parse(fs.readFileSync(path.join(root,'assets/tiles/castle/pack.json'),'utf8'));
globalThis.fetch=async()=>({ok:true,json:async()=>pack});
globalThis.Image=class{set src(_) {queueMicrotask(()=>this.onload?.());}};
const {loadCastlePack,castleFrames}=await import(pathToFileURL(path.join(root,'src/gfx/castle.js')));
const {BIOMES,BIOME_BY_ID,OVERWORLD_BIOME_IDS,drawBiome,recordBiomeVisit}=await import(pathToFileURL(path.join(root,'src/data/biomes.js')));
const {generateOverworld}=await import(pathToFileURL(path.join(root,'src/world/overworld.js')));
const {SCENARIOS}=await import(pathToFileURL(path.join(root,'src/game/overworld.js')));
await loadCastlePack();
const counts={floors:60,transitions:120,walls:200,roofs:96,gables:24,gateways:12,doors:40,windows:32,torches:32,signs:96,scatter:120,trees:18,castle_landmarks:19,castle_stairs:16,castle_bridges:20,wall_hangings:128,moat_edges:8,furniture:5,keep_floors:6,keep_walls:60};
for(const [k,n] of Object.entries(counts))if(castleFrames(k).length!==n)throw Error(`${k}: expected ${n} frames`);
for(const f of castleFrames('keep_floors'))if(f.w!==160||f.h!==80)throw Error(`keep floor ${f.id} breaks the documented 160x80 grid`);
if(BIOME_BY_ID.castle?.pack!=='castle'||!BIOME_BY_ID.castle.overworld)throw Error('Castle overworld not registered');
if(!BIOME_BY_ID.sea_of_sand?.overworld||OVERWORLD_BIOME_IDS.length<3)throw Error('Sea of Sand or multi-overworld pool missing');
const I=(m,x,y)=>Math.floor(y)*m.w+Math.floor(x);
let minScatter=Infinity,minFree=Infinity;const scenarios=new Set();
const {CASTLE_WALL:CWALL}=await import(pathToFileURL(path.join(root,'src/world/castleworld.js')));
const flood=(m,start,ok)=>{const seen=new Uint8Array(m.w*m.h),q=[I(m,start[0],start[1])];seen[q[0]]=1;
 for(let j=0;j<q.length;j++){const i=q[j],x=i%m.w,y=(i/m.w)|0;for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,k=I(m,nx,ny);
  if(nx>=0&&ny>=0&&nx<m.w&&ny<m.h&&!seen[k]&&ok(nx,ny,k)){seen[k]=1;q.push(k);}}}return seen;};
for(let seed=1;seed<=100;seed++){
 const gen=generateOverworld(19,BIOME_BY_ID.castle,seed*1777+31),m=gen.map;
 if(m.w!==192||m.h!==176||m.w*m.h!==96*88*4)throw Error(`Castle board must be 2x each dimension / 4x area; got ${m.w}x${m.h}`);
 minScatter=Math.min(minScatter,gen.props.filter(p=>p.spr.category==='scatter').length);
 minFree=Math.min(minFree,m.block.reduce((n,v)=>n+!v,0));scenarios.add(gen.scenarioId);
 const seen=flood(m,gen.start,(x,y)=>m.walkableTile(x,y));
 for(const [x,y] of [gen.exit,...gen.sites])if(!seen[I(m,x,y)])throw Error(`unreachable seed ${seed} at ${x},${y}`);
 // No holes: every wall cell is solid, and with the gate and postern sealed the ward can't be reached from outside.
 const {x0,y0,x1,y1}=CWALL,gates=[[47,y1],[48,y1],[49,y1],[61,y0],[62,y0]];
 for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
  if(!(x===x0||x===x1||y===y0||y===y1))continue;
  const gate=gates.some(([gx,gy])=>gx===x&&gy===y);
  for(const [dx,dy] of [[0,0],[1,0],[0,1],[1,1]]){const i=I(m,2*x+dx,2*y+dy);
   if(gate?m.block[i]:!m.block[i]||!m.rampartWall[i])throw Error(`curtain wall ${gate?'gate blocked':'hole'} seed ${seed} at ${x},${y}`);}
 }
 const sealed=flood(m,gen.start,(x,y)=>m.walkableTile(x,y)&&!gates.some(([gx,gy])=>Math.floor(x/2)===gx&&Math.floor(y/2)===gy));
 if(sealed[I(m,gen.shrine[0],gen.shrine[1])])throw Error(`ward reachable around the walls seed ${seed}`);
 // The curtain is drawn: one authored battlement slice on every non-corner, non-gate wall cell.
 const curtain=gen.props.filter(p=>p.curtain),slices=new Set(curtain.map(p=>p.x+','+p.y+','+p.flip));
 const want=2*(x1-x0-1)+2*(y1-y0-1)-gates.length;
 if(curtain.length!==want||slices.size!==want)throw Error(`curtain slices ${curtain.length}/${slices.size}, want ${want} seed ${seed}`);
 if(curtain.some(p=>p.spr.name!=='castle_landmark_04_curtain_wall_battlement'))throw Error(`curtain uses wrong art seed ${seed}`);
 for(let x=x0+1;x<x1;x++)for(const y of [y0,y1])if(!gates.some(([gx,gy])=>gx===x&&gy===y)&&!slices.has(2*x+','+2*(y+1)+',false'))throw Error(`missing curtain slice seed ${seed} at ${x},${y}`);
 for(let y=y0+1;y<y1;y++)for(const x of [x0,x1])if(!slices.has(2*(x+1)+','+2*y+',true'))throw Error(`missing curtain slice seed ${seed} at ${x},${y}`);
 const towerParts=gen.props.filter(p=>p.tower),gateParts=gen.props.filter(p=>p.gatehouse);
 if(new Set(towerParts.map(p=>p.spr.name)).size!==2||towerParts.length<13*3)throw Error(`towers missing seed ${seed}`);
 if(gateParts.length<4||gateParts.some(p=>p.spr.name!=='castle_landmark_08_corner_tower_cluster'))throw Error(`gatehouse missing seed ${seed}`);
 if(gen.props.filter(p=>p.spr.name==='castle_landmark_17_bridge_approach').length!==2)throw Error(`moat bridges missing seed ${seed}`);
 // Wall-walk lane: wide, connected, open, with its muster posts on it.
 const deckCount=m.rampartDeck.reduce((n,v)=>n+v,0);if(deckCount<1800)throw Error(`wall-walk lane too narrow seed ${seed}: ${deckCount}`);
 const deckSeen=flood(m,m.rampartPosts[0],(x,y,k)=>m.rampartDeck[k]);
 if(deckSeen.reduce((n,v)=>n+v,0)!==deckCount)throw Error(`wall-walk lane is disconnected seed ${seed}`);
 for(const [x,y] of m.rampartPosts)if(!m.rampartDeck[I(m,x,y)]||!m.walkable(x,y)||!seen[I(m,x,y)])throw Error(`rampart post off the lane seed ${seed} at ${x},${y}`);
 // Gate passage and both causeways are open end to end.
 for(let y=y1-3;y<=78;y++)for(const x of [47,48,49])if(!m.walkable(2*x+1,2*y+1))throw Error(`main gate or causeway blocked seed ${seed} at ${x},${y}`);
 for(let y=13;y<=y0+3;y++)for(const x of [61,62])if(!m.walkable(2*x+1,2*y+1))throw Error(`postern or causeway blocked seed ${seed} at ${x},${y}`);
 // Keep: three enterable halls with their own floors, doors and room to fight.
 if(gen.map.castleRooms?.length!==3)throw Error(`three enterable keep interiors missing seed ${seed}`);
 if(gen.townTiles.length!==66||gen.map.castleRooms.some(r=>r.floor<60||r.floor>=66))throw Error(`keep did not use its dedicated floor tiles seed ${seed}`);
 if(gen.map.castleDoors?.length<8)throw Error(`keep has too few doors seed ${seed}`);
 if(new Set(gen.map.castleDoors.map(d=>d.asset.split('_').slice(0,3).join('_'))).size<3)throw Error(`keep door varieties missing seed ${seed}`);
 for(const d of gen.map.castleDoors)if(!seen[I(m,d.x,d.y)]||!m.walkable(d.x,d.y))throw Error(`unreachable or blocked keep door seed ${seed} at ${d.x},${d.y}`);
 for(const r of gen.map.castleRooms){const cx=(r.rect[0]+r.rect[2])/2|0,cy=(r.rect[1]+r.rect[3])/2|0;let free=0;
  for(let y=cy-10;y<cy+10;y++)for(let x=cx-10;x<cx+10;x++)if(m.walkableTile(x,y))free++;
  if(free<340)throw Error(`combat room ${r.id} too crowded seed ${seed}: ${free}`);}
 if(gen.props.filter(p=>p.spr.category==='furniture').length<22)throw Error(`throne/chapel furniture not placed seed ${seed}`);
 if(gen.props.filter(p=>p.roomWall).length*4!==gen.map.castleRoomWalls.reduce((n,v)=>n+v,0))throw Error(`keep wall set placement mismatch seed ${seed}`);
 // World-pixel size contracts for a 60px hero.
 const furnitureHeights={furniture_01_throne_dais:92,furniture_02_cathedral_pew:34,furniture_03_cathedral_pulpit:78,
   furniture_04_hanging_chandelier:55,furniture_05_floor_candelabrum:48};
 for(const p of gen.props.filter(p=>p.spr.category==='furniture')){
   const expected=furnitureHeights[p.spr.name];
   if(expected&&Math.abs(p.spr.h*p.k-expected)>.05)throw Error(`oversized Castle furniture ${p.spr.name}: ${p.spr.h*p.k} vs ${expected}`);
 }
 const caps={scatter:46,trees:170,torches:48,wall_hangings:76,doors:125,gateways:225,castle_landmarks:500};
 for(const p of gen.props){const max=caps[p.spr.category];if(max&&p.spr.h*p.k>max+.001)throw Error(`oversized Castle ${p.spr.name}: ${p.spr.h*p.k} > ${max}`);}
 for(const category of ['gateways','windows','signs','torches','wall_hangings','trees','doors'])
   if(!gen.props.some(p=>p.spr.category===category))throw Error(`missing Castle ${category} placements seed ${seed}`);
 for(const id of Object.keys(furnitureHeights))if(!gen.props.some(p=>p.spr.name===id))throw Error(`missing placed furnishing ${id} seed ${seed}`);
 if(gen.spawns.filter(s=>s.castleRoom).length<3||gen.spawns.some(s=>s.castleRoom&&!m.circleFree(s.x,s.y,.7)))throw Error(`room encounter spawns blocked seed ${seed}`);
}
 if(minScatter<460)throw Error(`expected 460 scatter placements; got ${minScatter}`);
if(minFree<1500)throw Error(`too little free combat space (${minFree})`);
if(scenarios.size!==35)throw Error(`expected all 35 Castle scenarios; saw ${scenarios.size}`);
if(SCENARIOS.length!==35)throw Error(`expected 35 scenario definitions; saw ${SCENARIOS.length}`);
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
 console.log('CASTLE overworld OK',JSON.stringify({seeds:100,minScatter,minFree,scenarios:scenarios.size,overworlds:OVERWORLD_BIOME_IDS,atlases:counts}));
