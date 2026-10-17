// Town visitor roster, transparent sprite-sheet format and pack contract.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const {TOWNSFOLK,TOWN_SITUATIONS,TOWN_CONVERSATIONS}=await import(pathToFileURL(path.join(root,'src/data/townsfolk.js')));
const dir=path.join(root,'assets/sprites/townsfolk'),manifest=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json'),'utf8'));
const order=['idle_1','idle_2','idle_3','walk_1','walk_2','dying_1','dead','scared_scream','scared_point','happy','celebrate'];
if(TOWNSFOLK.length!==100||new Set(TOWNSFOLK.map(p=>p.id)).size!==100)throw Error('town visitor catalog must contain 100 unique IDs');
if(TOWNSFOLK.filter(p=>p.child).length!==10)throw Error('town catalog must contain ten children');
if(TOWNSFOLK.filter(p=>p.royal).length!==4||TOWNSFOLK.filter(p=>p.regular).length!==4)throw Error('royal family or regular roster incomplete');
if(new Set(TOWNSFOLK.map(p=>p.spriteId)).size!==25||TOWNSFOLK.some(p=>!p.spriteId))throw Error('town roster must use all 25 original designs with engine palette variants');
if(TOWN_SITUATIONS.length!==2000||new Set(TOWN_SITUATIONS.map(e=>e.text)).size!==2000)throw Error('town situation deck must contain 2,000 distinct cards');
if(TOWN_CONVERSATIONS.length!==2000||new Set(TOWN_CONVERSATIONS.map(e=>e.lines.join('|'))).size!==2000)throw Error('town conversation bank must contain 2,000 distinct exchanges');
for(const kind of ['royal_visit','wedding','birth','birthday','funeral','harvest_fair','street_fight','enemy_scouts','siege_warning','monster_sighting'])if(!TOWN_SITUATIONS.some(e=>e.kind===kind))throw Error('missing town event kind '+kind);
if(manifest.characters.length!==25||manifest.generatedIdentityCount!==25||manifest.frameSize.join('x')!=='128x192'||manifest.order.join('|')!==order.join('|'))throw Error('town sprite pack identity contract mismatch');
if(manifest.characters.filter(p=>p.isKnight).length!==4||manifest.characters.filter(p=>p.isKnight&&p.frameCount===13&&p.attackFrameCount===2).length!==4)throw Error('all four knight sprites need two appended attack frames');
if(manifest.characters.filter(p=>!p.isKnight&&p.frameCount!==11).length)throw Error('non-knight sheets must use exactly eleven frames');
if(manifest.characters.some(p=>!p.source||p.helmet!==false||!p.generatedUniqueIdentity))throw Error('town sprite pack must use original generated civilian designs without helmets');
for(const source of ['baker','charcoal_burner','boy','girl','merchant','healer','watchman','noblewoman','smith','king','ferryman','tavern_keeper','midwife','carpenter','herbalist','shepherd','miller','seamstress','knight_aldric','knight_maeve','knight_bastian','knight_rosette','royal_steward','court_lady','royal_scribe']){
  if(!fs.existsSync(path.join(dir,'generated_sources',source+'.png')))throw Error('missing original generated civilian source '+source);
  if(source.startsWith('knight_')&&!fs.existsSync(path.join(dir,'generated_sources',source+'_attacks.png')))throw Error('missing distinct knight attack source '+source);
}
for(const p of manifest.characters){
  const file=path.join(dir,p.id+'.png');if(!fs.existsSync(file))throw Error('missing '+p.id+'.png');
  const png=fs.readFileSync(file);if(png.toString('ascii',1,4)!=='PNG')throw Error('invalid PNG '+p.id);
  const w=png.readUInt32BE(16),h=png.readUInt32BE(20);if(w!==128*p.frameCount||h!==192)throw Error(`${p.id}: expected ${128*p.frameCount}x192, got ${w}x${h}`);
  if(png[25]!==6)throw Error(`${p.id}: expected RGBA transparency`);
}
const zip=path.join(dir,'townsfolk_animation_pack.zip');if(!fs.existsSync(zip)||fs.statSync(zip).size<1_000_000)throw Error('town sprite ZIP missing or unexpectedly small');
console.log('Townsfolk pack OK',JSON.stringify({people:TOWNSFOLK.length,uniqueDesigns:manifest.generatedIdentityCount,knights:4,children:10,royals:4,regulars:4,events:TOWN_SITUATIONS.length,conversations:TOWN_CONVERSATIONS.length,sheets:manifest.characters.length,frameSize:manifest.frameSize,zipBytes:fs.statSync(zip).size}));
