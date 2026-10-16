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
await loadCastlePack();
const counts={floors:60,transitions:120,walls:120,roofs:96,gables:24,gateways:12,doors:40,windows:32,torches:32,signs:96,scatter:120,trees:18,castle_landmarks:19,castle_stairs:16,castle_bridges:20,wall_hangings:128,moat_edges:8};
for(const [k,n] of Object.entries(counts))if(castleFrames(k).length!==n)throw Error(`${k}: expected ${n} frames`);
if(BIOME_BY_ID.castle?.pack!=='castle'||!BIOME_BY_ID.castle.overworld)throw Error('Castle overworld not registered');
if(!BIOME_BY_ID.sea_of_sand?.overworld||OVERWORLD_BIOME_IDS.length<3)throw Error('Sea of Sand or multi-overworld pool missing');
const I=(m,x,y)=>Math.floor(y)*m.w+Math.floor(x);
let minScatter=Infinity,minFree=Infinity;const scenarios=new Set();
for(let seed=1;seed<=100;seed++){
 const gen=generateOverworld(19,BIOME_BY_ID.castle,seed*1777+31),m=gen.map;
 minScatter=Math.min(minScatter,gen.props.filter(p=>p.spr.category==='scatter').length);
 minFree=Math.min(minFree,m.block.reduce((n,v)=>n+!v,0));scenarios.add(gen.scenarioId);
 const seen=new Uint8Array(m.w*m.h),q=[I(m,gen.start[0],gen.start[1])];seen[q[0]]=1;
 for(let j=0;j<q.length;j++){const i=q[j],x=i%m.w,y=(i/m.w)|0;for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,k=I(m,nx,ny);if(m.walkableTile(nx,ny)&&!seen[k]){seen[k]=1;q.push(k);}}}
 for(const [x,y] of [gen.exit,...gen.sites])if(!seen[I(m,x,y)])throw Error(`unreachable seed ${seed} at ${x},${y}`);
 for(const x of [25,26,27,28,29,30,31,32,33,34,35,37,38,39,40,41,42,43,44,45,46,47])if(!m.rampartDeck[I(m,x+.5,45.5)]||!m.walkable(x+.5,45.5)||m.rampartHeight<20)throw Error(`rampart deck not walkable seed ${seed}`);
 for(const [x,y] of [[36.5,19.5],[36.5,49.5],[21.5,35.5],[50.5,35.5]])if(!m.walkable(x,y))throw Error(`blocked bridge deck seed ${seed} at ${x},${y}`);
 const categories=new Set(gen.props.map(p=>p.spr.category));for(const c of ['walls','castle_bridges','castle_landmarks','castle_stairs','wall_hangings','trees'])if(!categories.has(c))throw Error(`missing placed ${c} seed ${seed}`);
}
if(minScatter<360)throw Error(`expected 360 scatter placements; got ${minScatter}`);
if(minFree<1500)throw Error(`too little free combat space (${minFree})`);
if(scenarios.size!==20)throw Error(`expected all 20 scenarios; saw ${scenarios.size}`);
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
