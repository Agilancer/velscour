// People and animals roster, the sprite-sheet contract (tools/build_people_pack.py) and the town scripts
// (src/data/townscripts.js). No browser.   node tools/tests/townsfolk.mjs
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const imp=(f)=>import(pathToFileURL(path.join(root,f)));
const {TOWNSFOLK,ANIMALS}=await imp('src/data/townsfolk.js');
const {CHATS,BARKS,SHOPPING,ADVENTURER_CHATS,ADVENTURER_BARKS,EVENT_LINES}=await imp('src/data/townscripts.js');
const {EMOTIONS,STD_FRAMES,EXTRA_FRAMES,townFrameOf}=await imp('src/game/townsfolkvisuals.js');
const dir=path.join(root,'assets/sprites/people'),manifest=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json'),'utf8'));
const fail=(m)=>{throw Error(m);};
// lossless WebP sheets (VP8L, or VP8X with an alpha flag): size and transparency from the header
function webpInfo(b,id){
  if(b.toString('ascii',0,4)!=='RIFF'||b.toString('ascii',8,12)!=='WEBP')fail('invalid WebP '+id);
  const kind=b.toString('ascii',12,16);
  if(kind==='VP8L'){const v=b.readUInt32LE(21);return {w:(v&0x3fff)+1,h:((v>>>14)&0x3fff)+1,alpha:!!((v>>>28)&1)};}
  if(kind==='VP8X')return {w:b.readUIntLE(24,3)+1,h:b.readUIntLE(27,3)+1,alpha:!!(b[20]&0x10)};
  fail(id+': expected a lossless WebP, got '+kind);
}
// the roster: 47 people (one sheet each) and 10 animals
if(TOWNSFOLK.length!==47||new Set(TOWNSFOLK.map(p=>p.spriteId)).size!==47)fail('expected 47 people on 47 sheets');
if(ANIMALS.length!==10)fail('expected 10 animals');
const count=(f)=>TOWNSFOLK.filter(f).length;
if(count(p=>p.knight)!==10||count(p=>p.guard)!==5||count(p=>p.merchant)!==7||count(p=>p.child)!==4)fail('knights, guards, merchants or children miscounted');
for(const role of ['king','queen','prince','princess','dowager queen','duke','duchess','royal heir','hedge witch','wandering wizard','priest','friar','midwife','baker'])
  if(!TOWNSFOLK.some(p=>p.role===role))fail('no '+role+' in the roster');
for(const s of ['cat','dog','rabbit','rat','deer'])if(!ANIMALS.some(a=>a.species===s))fail('no '+s);
if(TOWNSFOLK.some(p=>p.palette))fail('sheets are painted: no runtime recolour');
// sheets
if(manifest.sheets.length!==57||manifest.frameSize.join('x')!=='256x200'||manifest.standardFrames.join('|')!==STD_FRAMES.join('|')||manifest.extraFrames.join('|')!==EXTRA_FRAMES.join('|'))fail('people pack contract mismatch');
for(const p of manifest.sheets){
  const file=path.join(dir,p.id+'.webp');if(!fs.existsSync(file))fail('missing '+p.id+'.webp');
  const {w,h,alpha}=webpInfo(fs.readFileSync(file),p.id);if(w!==256*p.frames.length||h!==200)fail(`${p.id}: expected ${256*p.frames.length}x200, got ${w}x${h}`);
  if(!alpha)fail(`${p.id}: expected RGBA transparency`);
  const roster=[...TOWNSFOLK,...ANIMALS].find(v=>v.spriteId===p.id);
  if(!roster)fail(p.id+' is not on the roster');
  if(roster.frame.count!==p.frames.length)fail(p.id+': roster frame count '+roster.frame.count+' != '+p.frames.length);
  p.frames.forEach((f,i)=>{if(townFrameOf(p.id,f)!==i)fail(p.id+': frame '+f+' maps to '+townFrameOf(p.id,f));});
}
if(manifest.sheets.filter(p=>p.frames.length===20).length!==3)fail('the three Greener sheets carry twenty emotions');
// every emotion resolves to a pose on an ordinary sheet (its alt) and on a Greener sheet
for(const [k,e] of Object.entries(EMOTIONS))if(e.pose)for(const id of ['18_king','00_greener_20_frames','dog_02_hound']){
  const list=(e.pose.every(p=>townFrameOf(id,p)>=0)?e.pose:e.alt||[]).map(p=>townFrameOf(id,p));
  if(!list.length||list.some(i=>i<0))fail(`emotion ${k} has no pose on ${id}`);
}
// scripts: valid speakers and emotions, and every line fits a two-line bubble (~28 characters a line)
const lines=[];
const emo=(e,where)=>{if(e&&!EMOTIONS[e])fail(`${where}: unknown emotion ${e}`);};
for(const c of [...CHATS,...ADVENTURER_CHATS])for(const [who,t,e] of c.lines){if(!(who>=0&&who<=2))fail('bad speaker in '+t);emo(e,t);lines.push(t);}
for(const list of Object.values(BARKS))for(const [t,e] of list){emo(e,t);lines.push(t);}
for(const [t,e] of ADVENTURER_BARKS){emo(e,t);lines.push(t);}
for(const [v,list] of Object.entries(SHOPPING))for(const ex of list){if(ex.length!==3)fail('shopping exchange '+v);for(const [t,e] of ex){emo(e,t);lines.push(t);}}
for(const [k,ev] of Object.entries(EVENT_LINES)){if(!ev.title||!ev.intro)fail('event '+k+' lacks a title or intro');lines.push(ev.intro);
  for(const key of ['beats','vows','crowd','calls'])for(const l of ev[key]||[]){const [a,b,c]=l;const t=key==='crowd'||key==='calls'?a:b,e=key==='crowd'||key==='calls'?b:c;emo(e,k+': '+t);lines.push(t);}
  for(const t of [...(ev.boos||[]),...(ev.juggler||[]),...(ev.outro?[ev.outro]:[])])lines.push(t);}
const tooLong=lines.filter(t=>t.replace(/\{\w+\}/g,'Someone').length>56);
if(tooLong.length)fail('lines too long for a two-line bubble: '+tooLong.slice(0,4).join(' / '));
if(Object.keys(EVENT_LINES).length<19)fail('expected nineteen special events');
if(CHATS.length<55)fail('the conversation bank is thin');
console.log('People pack OK',JSON.stringify({people:TOWNSFOLK.length,animals:ANIMALS.length,sheets:manifest.sheets.length,conversations:CHATS.length+ADVENTURER_CHATS.length,events:Object.keys(EVENT_LINES).length,lines:lines.length,emotions:Object.keys(EMOTIONS).length}));
