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
for(let seed=1;seed<=100;seed++){
 const gen=generateOverworld(19,BIOME_BY_ID.castle,seed*1777+31),m=gen.map;
 if(m.w!==192||m.h!==176||m.w*m.h!==96*88*4)throw Error(`Castle board must be 2x each dimension / 4x area; got ${m.w}x${m.h}`);
 minScatter=Math.min(minScatter,gen.props.filter(p=>p.spr.category==='scatter').length);
 minFree=Math.min(minFree,m.block.reduce((n,v)=>n+!v,0));scenarios.add(gen.scenarioId);
 const seen=new Uint8Array(m.w*m.h),q=[I(m,gen.start[0],gen.start[1])];seen[q[0]]=1;
 for(let j=0;j<q.length;j++){const i=q[j],x=i%m.w,y=(i/m.w)|0;for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,k=I(m,nx,ny);if(m.walkableTile(nx,ny)&&!seen[k]){seen[k]=1;q.push(k);}}}
 for(const [x,y] of [gen.exit,...gen.sites])if(!seen[I(m,x,y)])throw Error(`unreachable seed ${seed} at ${x},${y}`);
 const deckCount=m.rampartDeck.reduce((n,v)=>n+v,0);if(deckCount<2200)throw Error(`battlement walkway too narrow seed ${seed}: ${deckCount}`);
 const topSeen=new Uint8Array(m.w*m.h),topStart=I(m,69,53),topQ=[topStart];topSeen[topStart]=1;
 for(let a=0;a<topQ.length;a++){const i=topQ[a],x=i%m.w,y=(i/m.w)|0;for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,k=I(m,nx,ny);if(m.rampartDeck[k]&&!topSeen[k]){topSeen[k]=1;topQ.push(k);}}}
 if(topQ.length!==deckCount)throw Error(`battlement top is disconnected seed ${seed}: ${topQ.length}/${deckCount}`);
 for(const [x,y] of [[35,27],[42,29],[52,32],[62,44],[58,53],[55,61],[44,61],[34,52],[31,38]])if(!m.rampartDeck[I(m,2*x,2*y)]||m.block[I(m,2*x,2*y)])throw Error(`walkable wide rampart lane missing seed ${seed} at ${x},${y}`);
 for(const [x,y] of [[48.5,64.5],[48.5,65.5],[48.5,66.5],[48.5,67.5],[48.5,68.5],[48.5,69.5],[48.5,70.5],[42.5,24.5],[42.5,25.5],[42.5,26.5],[28.5,37.5],[29.5,37.5],[30.5,37.5],[66.5,37.5],[67.5,37.5],[68.5,37.5]])if(!m.walkable(x*2,y*2))throw Error(`broad stair lane blocked seed ${seed} at ${x},${y}`);
 for(const [x,y] of [[42.5,19.5],[48.5,69.5],[25.5,38.5],[71.5,38.5]])if(!m.walkable(x*2,y*2))throw Error(`blocked bridge deck seed ${seed} at ${x},${y}`);
 for(let y=63;y<=72;y++)if(!m.walkable(97,y*2+1))throw Error(`drawbridge or keep gate entrance blocked seed ${seed} at y=${y}`);
 if(!gen.props.some(p=>p.spr.name==='castle_drawbridge_closed_SE'))throw Error(`usable drawbridge art missing seed ${seed}`);
 if(gen.map.castleRooms?.length!==3)throw Error(`three enterable keep interiors missing seed ${seed}`);
 if(gen.townTiles.length!==66||gen.map.castleRooms.some(r=>r.floor<60||r.floor>=66))throw Error(`keep did not use its dedicated floor tiles seed ${seed}`);
 if(gen.map.castleDoors?.length<8)throw Error(`keep has too few doors seed ${seed}`);
 if(new Set(gen.map.castleDoors.map(d=>d.asset.split('_').slice(0,3).join('_'))).size<3)throw Error(`keep door varieties missing seed ${seed}`);
 for(const d of gen.map.castleDoors)if(!seen[I(m,d.x,d.y)]||!m.walkable(d.x,d.y))throw Error(`unreachable or blocked keep door seed ${seed} at ${d.x},${d.y}`);
 for(const [cx,cy,need] of [[94,82,380],[70,102,380],[100,110,320]]){let free=0;for(let y=cy-10;y<cy+10;y++)for(let x=cx-10;x<cx+10;x++)if(m.walkableTile(x,y))free++;if(free<need)throw Error(`combat room too crowded seed ${seed} at ${cx},${cy}: ${free}`);}
 if(gen.props.filter(p=>p.spr.category==='furniture').length<22)throw Error(`throne/chapel furniture not placed seed ${seed}`);
 for(const id of ['furniture_01_throne_dais','furniture_02_cathedral_pew','furniture_03_cathedral_pulpit','furniture_04_hanging_chandelier','furniture_05_floor_candelabrum'])if(!gen.props.some(p=>p.spr.name===id))throw Error(`missing placed furnishing ${id} seed ${seed}`);
 if(gen.spawns.filter(s=>s.castleRoom).length<3||gen.spawns.some(s=>s.castleRoom&&!m.circleFree(s.x,s.y,.7)))throw Error(`room encounter spawns blocked seed ${seed}`);
 const categories=new Set(gen.props.map(p=>p.spr.category));for(const c of ['walls','doors','furniture','castle_bridges','castle_landmarks','castle_stairs','wall_hangings','trees'])if(!categories.has(c))throw Error(`missing placed ${c} seed ${seed}`);
 if(gen.props.filter(p=>p.roomWall).length*4!==gen.map.castleRoomWalls.reduce((n,v)=>n+v,0)||gen.props.filter(p=>p.roomWall).some(p=>p.spr.category!=='keep_walls'))throw Error(`keep wall set placement mismatch seed ${seed}`);
 if(gen.props.filter(p=>p.spr.category==='walls'&&!p.roomWall).some(p=>p.k<.94*64/160-1e-6))throw Error(`wall modules undersized and likely separated seed ${seed}`);
 if(gen.props.filter(p=>p.spr.category==='torches').length<10)throw Error(`rampart flame sconces missing seed ${seed}`);
 if(gen.props.filter(p=>p.spr.category==='castle_stairs').length<8)throw Error(`four inner and outer stair approaches missing seed ${seed}`);
 const walls=gen.props.filter(p=>p.spr.category==='walls'&&!p.roomWall),wallCount=m.baseRampartWallCount;
 if(walls.length!==wallCount)throw Error(`wall segment gap seed ${seed}: ${walls.length}/${wallCount}`);
 for(const p of walls){const x=Math.floor(p.x),y=Math.floor(p.y),joined=(nx,ny)=>m.rampartWall[I(m,nx,ny)]?1:0;
   const bx=Math.floor(x/2),by=Math.floor(y/2);
   const mask=(m.rampartWall[I(m,bx*2,by*2-1)]?1:0)|(m.rampartWall[I(m,bx*2+2,by*2)]?2:0)|(m.rampartWall[I(m,bx*2,by*2+2)]?4:0)|(m.rampartWall[I(m,bx*2-1,by*2)]?8:0);
   if(p.spr.connectionMask!==mask)throw Error(`wrong Castle bend/corner topology seed ${seed} at ${x},${y}: ${p.spr.connectionMask} != ${mask}`);
 }
 if(new Set(walls.map(p=>p.spr.textureVariant)).size<10)throw Error(`all ten Castle wall families not represented seed ${seed}`);
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
