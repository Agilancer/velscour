// Town roster, sprite-sheet contract (tools/build_townsfolk_pack.py) and the town scripts (src/data/townscripts.js).
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const imp=(f)=>import(pathToFileURL(path.join(root,f)));
const {TOWNSFOLK}=await imp('src/data/townsfolk.js');
const {CHATS,BARKS,SHOPPING,ADVENTURER_CHATS,ADVENTURER_BARKS,EVENT_LINES}=await imp('src/data/townscripts.js');
const {EMOTIONS,STD_FRAMES}=await imp('src/game/townsfolkvisuals.js');
const dir=path.join(root,'assets/sprites/townsfolk'),manifest=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json'),'utf8'));
const fail=(m)=>{throw Error(m);};
if(TOWNSFOLK.length!==100||new Set(TOWNSFOLK.map(p=>p.id)).size!==100)fail('town visitor catalog must contain 100 unique IDs');
if(TOWNSFOLK.filter(p=>p.child).length!==10)fail('town catalog must contain ten children');
if(TOWNSFOLK.filter(p=>p.royal).length!==4||TOWNSFOLK.filter(p=>p.regular).length!==4)fail('royal family or regular roster incomplete');
{const ids=TOWNSFOLK.map(p=>+p.spriteId.slice(-3)),base=new Set(ids.map(k=>k>25?(k-1)%10+1:k));
if(base.size!==25||new Set(ids).size<60)fail('town roster must use all 25 designs and most of the colourway sheets');
if(TOWNSFOLK.some(p=>p.palette))fail('sheets are pre-painted: no runtime recolour');}
// sheets
if(manifest.characters.length!==100||manifest.identities!==25||manifest.frameSize.join('x')!=='256x192'||manifest.standardFrames.join('|')!==STD_FRAMES.join('|'))fail('town sprite pack contract mismatch');
for(const p of manifest.characters){
  const file=path.join(dir,p.id+'.png');if(!fs.existsSync(file))fail('missing '+p.id+'.png');
  const png=fs.readFileSync(file);if(png.toString('ascii',1,4)!=='PNG')fail('invalid PNG '+p.id);
  const w=png.readUInt32BE(16),h=png.readUInt32BE(20);if(w!==256*p.frameCount||h!==192)fail(`${p.id}: expected ${256*p.frameCount}x192, got ${w}x${h}`);
  if(png[25]!==6)fail(`${p.id}: expected RGBA transparency`);
  if(p.frames.slice(0,11).join('|')!==STD_FRAMES.join('|'))fail(p.id+': standard frames out of order');
  const roster=TOWNSFOLK.find(v=>v.spriteId===p.id);if(roster&&roster.frame.count!==p.frameCount)fail(p.id+': roster frame count '+roster.frame.count+' != '+p.frameCount);
}
if(manifest.characters.filter(p=>p.isKnight&&p.frames.includes('attack_1')&&p.frames.includes('attack_2')).length!==4)fail('all four knights need two attack frames');
// scripts: valid speakers and emotions, and every line fits a two-line bubble (~28 characters a line)
const lines=[];
const emo=(e,where)=>{if(e&&!EMOTIONS[e])fail(`${where}: unknown emotion ${e}`);};
for(const c of [...CHATS,...ADVENTURER_CHATS])for(const [who,t,e] of c.lines){if(!(who>=0&&who<=2))fail('bad speaker in '+t);emo(e,t);lines.push(t);}
for(const list of Object.values(BARKS))for(const [t,e] of list){emo(e,t);lines.push(t);}
for(const [t,e] of ADVENTURER_BARKS){emo(e,t);lines.push(t);}
for(const [v,list] of Object.entries(SHOPPING))for(const ex of list){if(ex.length!==3)fail('shopping exchange '+v);for(const [t,e] of ex){emo(e,t);lines.push(t);}}
for(const [k,ev] of Object.entries(EVENT_LINES)){if(!ev.title||!ev.intro)fail('event '+k+' lacks a title or intro');lines.push(ev.intro);
  for(const key of ['beats','vows','crowd'])for(const l of ev[key]||[]){const [a,b,c]=l;const t=key==='crowd'?a:b,e=key==='crowd'?b:c;emo(e,k+': '+t);lines.push(t);}}
const tooLong=lines.filter(t=>t.length>56);
if(tooLong.length)fail('lines too long for a two-line bubble: '+tooLong.slice(0,4).join(' / '));
if(Object.keys(EVENT_LINES).length<12)fail('expected twelve special events');
if(CHATS.length<45)fail('the conversation bank is thin');
console.log('Townsfolk pack OK',JSON.stringify({people:TOWNSFOLK.length,identities:manifest.identities,sheets:manifest.characters.length,conversations:CHATS.length+ADVENTURER_CHATS.length,events:Object.keys(EVENT_LINES).length,lines:lines.length,emotions:Object.keys(EMOTIONS).length}));
