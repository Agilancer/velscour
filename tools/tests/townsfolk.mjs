// Town visitor roster, transparent sprite-sheet format and pack contract.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const {TOWNSFOLK,TOWN_SITUATIONS}=await import(pathToFileURL(path.join(root,'src/data/townsfolk.js')));
const dir=path.join(root,'assets/sprites/townsfolk'),manifest=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json'),'utf8'));
const order=['idle_1','idle_2','idle_3','walk_1','walk_2','dying_1','dead','scared_scream','scared_point','happy','celebrate'];
if(TOWNSFOLK.length!==100||new Set(TOWNSFOLK.map(p=>p.id)).size!==100)throw Error('town visitor catalog must contain 100 unique IDs');
if(TOWNSFOLK.filter(p=>p.child).length!==10)throw Error('town catalog must contain ten children');
if(TOWNSFOLK.filter(p=>p.royal).length!==4||TOWNSFOLK.filter(p=>p.regular).length!==4)throw Error('royal family or regular roster incomplete');
if(TOWN_SITUATIONS.length!==2000||new Set(TOWN_SITUATIONS.map(e=>e.text)).size!==2000)throw Error('town situation deck must contain 2,000 distinct cards');
if(manifest.characters.length!==100||manifest.frameCount!==11||manifest.frameSize.join('x')!=='128x192'||manifest.order.join('|')!==order.join('|'))throw Error('town sprite pack animation contract mismatch');
if(manifest.generatedIdentityCount!==10||manifest.paletteVariantsPerIdentity!==10||manifest.characters.some(p=>!p.generatedSource||p.helmet!==false||!p.framesUnique||!p.animationFramesReferenceIdleIdentity))throw Error('town sprite pack must use original generated civilian designs, with unique idle-led poses and no helmets');
for(const source of ['baker','charcoal_burner','boy','girl','merchant','healer','watchman','noblewoman','smith','king'])if(!fs.existsSync(path.join(dir,'generated_sources',source+'.png')))throw Error('missing original generated civilian source '+source);
for(const p of manifest.characters){
  const file=path.join(dir,p.id+'.png');if(!fs.existsSync(file))throw Error('missing '+p.id+'.png');
  const png=fs.readFileSync(file);if(png.toString('ascii',1,4)!=='PNG')throw Error('invalid PNG '+p.id);
  const w=png.readUInt32BE(16),h=png.readUInt32BE(20);if(w!==128*11||h!==192)throw Error(`${p.id}: expected 1408x192, got ${w}x${h}`);
  if(png[25]!==6)throw Error(`${p.id}: expected RGBA transparency`);
}
const zip=path.join(dir,'townsfolk_animation_pack.zip');if(!fs.existsSync(zip)||fs.statSync(zip).size<1_000_000)throw Error('town sprite ZIP missing or unexpectedly small');
console.log('Townsfolk pack OK',JSON.stringify({people:TOWNSFOLK.length,children:10,royals:4,regulars:4,situations:TOWN_SITUATIONS.length,sheets:manifest.characters.length,frameSize:manifest.frameSize,zipBytes:fs.statSync(zip).size}));
