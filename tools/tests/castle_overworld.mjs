// Node-only asset contract, castle map reachability and overworld rotation checks.
//   node tools/tests/castle_overworld.mjs [seeds]
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const json=(p)=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const pack=json('assets/tiles/castle/pack.json'),trees=json('assets/tiles/dark_forest/trees.json');
globalThis.fetch=async(url)=>({ok:true,json:async()=>String(url).includes('dark_forest')?trees:pack});
globalThis.Image=class{set src(_) {queueMicrotask(()=>this.onload?.());}};
const imp=(p)=>import(pathToFileURL(path.join(root,p)));
const {loadCastlePack,castleFrames}=await imp('src/gfx/castle.js');
const {loadDarkForestTrees}=await imp('src/gfx/darkforest.js');
const {A}=await imp('src/core/assets.js');
const {BIOME_BY_ID,OVERWORLD_BIOME_IDS,drawBiome,recordBiomeVisit}=await imp('src/data/biomes.js');
const {generateOverworld}=await imp('src/world/overworld.js');
const {SCENARIOS}=await imp('src/game/overworld.js');
const {CASTLE_OUTER,CASTLE_INNER,CASTLE_GATES,CASTLE_SIZE,MAT}=await imp('src/world/castleworld.js');
const {castle3d,K:K3,C3}=await imp('src/world/castle3d.js');
await loadCastlePack();await loadDarkForestTrees();
A.town={meta:json('assets/tiles/town/town.json'),objects:{},ground:{}};
const counts={floors:60,transitions:120,walls:200,roofs:96,gables:24,gateways:12,doors:40,windows:32,torches:32,signs:96,scatter:120,trees:18,castle_landmarks:19,castle_stairs:16,castle_bridges:20,wall_hangings:128,moat_edges:8,furniture:5,keep_floors:6,keep_walls:60};
for(const [k,n] of Object.entries(counts))if(castleFrames(k).length!==n)throw Error(`${k}: expected ${n} frames`);
if(BIOME_BY_ID.castle?.pack!=='castle'||!BIOME_BY_ID.castle.overworld)throw Error('Castle overworld not registered');
if(!BIOME_BY_ID.sea_of_sand?.overworld||OVERWORLD_BIOME_IDS.length<3)throw Error('Sea of Sand or multi-overworld pool missing');
const I=(m,x,y)=>Math.floor(y)*m.w+Math.floor(x);
const flood=(m,start,ok)=>{const seen=new Uint8Array(m.w*m.h),q=[I(m,start[0],start[1])];seen[q[0]]=1;
 for(let j=0;j<q.length;j++){const i=q[j],x=i%m.w,y=(i/m.w)|0;for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,k=I(m,nx,ny);
  if(nx>=0&&ny>=0&&nx<m.w&&ny<m.h&&!seen[k]&&ok(nx,ny,k)&&(!m.hgt||m.stepOk(i,k))){seen[k]=1;q.push(k);}}}return seen;};
const SEEDS=+process.argv[2]||100,stats={minScatter:Infinity,minTrees:Infinity,minFree:Infinity,ms:0};const scenarios=new Set();
const L=castle3d();
for(let seed=1;seed<=SEEDS;seed++){
 const t0=performance.now(),gen=generateOverworld(19,BIOME_BY_ID.castle,seed*1777+31),m=gen.map;stats.ms=Math.max(stats.ms,performance.now()-t0);
 if(m.w!==CASTLE_SIZE[0]||m.h!==CASTLE_SIZE[1]||m.w*m.h<3*192*176)throw Error(`Castle board must be three times the old 192x176; got ${m.w}x${m.h}`);
 stats.minScatter=Math.min(stats.minScatter,gen.props.filter(p=>p.spr?.category==='scatter').length);
 stats.minTrees=Math.min(stats.minTrees,gen.trees.length);
 stats.minFree=Math.min(stats.minFree,m.block.reduce((n,v)=>n+!v,0));scenarios.add(gen.scenarioId);
 // the drawbridge comes down when the hero nears it (game/castle3d.js): open it for the route checks
 for(const i of m.drawbridge.tiles)m.block[i]=0;
 const seen=flood(m,gen.start,(x,y)=>m.walkableTile(x,y));
 for(const [x,y] of [gen.exit,...gen.sites])if(!seen[I(m,x,y)])throw Error(`unreachable seed ${seed} at ${x},${y}`);
 // No holes: every curtain tile is masonry (blocked, or a wall-walk too high to climb) or a gate tunnel; with the gate
 // tunnels shut neither ward can be reached from outside.
 for(const R of [CASTLE_OUTER,CASTLE_INNER]){const lv=R===CASTLE_OUTER?C3.OW:C3.IW,X0=R.x0*2,Y0=R.y0*2,X1=R.x1*2+1,Y1=R.y1*2+1;
  for(let y=Y0;y<=Y1;y++)for(let x=X0;x<=X1;x++){if(Math.min(x-X0,X1-x,y-Y0,Y1-y)>1)continue;const i=I(m,x,y);
   const tunnel=L.cover[i]&&L.kind[i]===K3.gate;
   if(tunnel?m.block[i]:!(m.block[i]||m.hgt[i]>=lv))throw Error(`curtain ${tunnel?'gate blocked':'hole'} seed ${seed} at ${x},${y}`);}}
 const gateCells=[...CASTLE_GATES.outer,...CASTLE_GATES.postern,...CASTLE_GATES.inner,...CASTLE_GATES.innerNorth];
 const shut=(set)=>(x,y,k)=>m.walkableTile(x,y)&&!(L.cover[k]&&L.kind[k]===K3.gate&&set.some(([gx,gy])=>Math.abs(Math.floor(x/2)-gx)<=1&&Math.abs(Math.floor(y/2)-gy)<=1));
 const outerShut=flood(m,gen.start,shut([...CASTLE_GATES.outer,...CASTLE_GATES.postern]));
 const open_=([x,y])=>{for(let r=0;r<6;r++)for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++)if(m.walkable(x+dx,y+dy))return [x+dx,y+dy];return [x,y];};
 const ward=open_([CASTLE_OUTER.x0*2+6,CASTLE_OUTER.y0*2+10]);
 if(!seen[I(m,ward[0],ward[1])])throw Error(`outer ward unreachable seed ${seed}`);
 if(outerShut[I(m,ward[0],ward[1])])throw Error(`outer ward reachable round the curtain seed ${seed}`);
 const court=open_([CASTLE_GATES.inner[0][0]*2+1,CASTLE_INNER.y1*2-3]);
 if(!seen[I(m,court[0],court[1])])throw Error(`inner ward unreachable seed ${seed}`);
 if(flood(m,ward,shut([...CASTLE_GATES.inner,...CASTLE_GATES.innerNorth]))[I(m,court[0],court[1])])throw Error(`inner ward reachable round its curtain seed ${seed}`);
 // The masonry is the 3D layout's (src/world/castle3d.js): towers, the gatehouse, the keep, stairs, the height map.
 const named=(re)=>gen.props.filter(p=>re.test(p.spr?.name||''));
 const kinds=(k)=>{let n=0;for(let i=0;i<m.w*m.h;i++)if(m.c3kind[i]===k)n++;return n;};
 if(!m.hgt||!m.c3struct||kinds(K3.tower)<500||kinds(K3.stair)<100||kinds(K3.gate)<150||kinds(K3.keep)<300)throw Error(`castle masonry missing seed ${seed}`);
 if(gen.props.some(p=>!p.c3&&L.solid[I(m,p.x,p.y)]))throw Error(`a prop stands in the masonry seed ${seed}`);
 // Bridges stand over water and their decks are walkable and reached from both banks; the main crossing is the drawbridge.
 if(m.castleBridges.length!==3||named(/landmark_17/).length!==2)throw Error(`bridges missing seed ${seed}`);
 if(m.drawbridge.tiles.length!==8||m.drawbridge.tiles.some(i=>m.castleMat[i]!==MAT.water))throw Error(`drawbridge not over the moat seed ${seed}`);
 for(const b of m.castleBridges.filter(b=>b.kind!=='main')){
  for(let y=b.far;y<b.near;y++)for(const x of [b.x-.5,b.x+.5])if(!m.walkable(x,y+.5)||!seen[I(m,x,y+.5)])throw Error(`bridge ${b.kind} deck blocked seed ${seed} at ${x},${y}`);
  const i=I(m,b.x,b.y);if(m.castleMat[i]!==MAT.water)throw Error(`bridge ${b.kind} not over water seed ${seed}`);
  for(const y of [b.near,b.far-1])if(m.castleMat[I(m,b.x+2.5,y)]===MAT.water&&m.castleMat[I(m,b.x+2.5,b.y)]!==MAT.water)throw Error(`bridge ${b.kind} ends in the water seed ${seed}`);
  if(m.castleMat[I(m,b.x,b.near+.5)]===MAT.water)throw Error(`bridge ${b.kind} near end lands in water seed ${seed}`);
 }
 // Wall-walk: along the top of both curtains, reached by stairs, with its muster posts on it.
 const lane=(k)=>m.rampartDeck[k]===1&&!m.block[k],deckCount=m.rampartDeck.reduce((n,v,k)=>n+lane(k),0);
 if(deckCount<1500)throw Error(`wall-walk too short seed ${seed}: ${deckCount}`);
 for(const [x,y] of m.rampartPosts)if(!m.rampartDeck[I(m,x,y)]||!m.walkable(x,y)||!seen[I(m,x,y)]||m.hgt[I(m,x,y)]<C3.OW)throw Error(`rampart post off the wall-walk seed ${seed} at ${x},${y}`);
 if(m.rampartPosts.length<8)throw Error(`too few rampart posts seed ${seed}`);
 // Keep: three enterable halls with their own floors, doors and room to fight.
 if(m.castleRooms?.length!==3)throw Error(`three enterable keep interiors missing seed ${seed}`);
 if(m.castleDoors?.length<12)throw Error(`keep has too few doors seed ${seed}`);
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
 for(const category of ['windows','signs','torches','wall_hangings','furniture'])
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
console.log('CASTLE overworld OK',JSON.stringify({seeds:SEEDS,...stats,ms:Math.round(stats.ms),scenarios:scenarios.size}));
