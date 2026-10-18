// Pure regression for gait timing, 2:1 isometric facing, named frames, emotions and body motion.
// Run: node tools/tests/town_visuals.mjs
import assert from 'node:assert/strict';
import { TOWN_WALK_FPS, townFacingFlip, townFrame, townMotion, townFrameOf, townFrameCount, EMOTIONS, STD_FRAMES } from '../../src/game/townsfolkvisuals.js';
import { EMOTE_ICONS } from '../../src/gfx/emotes.js';

assert.ok(TOWN_WALK_FPS<7 && TOWN_WALK_FPS>=3.5,'town walk cycle should be slower than 7fps');
assert.equal(townFacingFlip(1,0),false,'east in world moves right on screen');
assert.equal(townFacingFlip(0,-1),false,'north in world moves right on screen');
assert.equal(townFacingFlip(-1,0),true,'west in world moves left on screen');
assert.equal(townFacingFlip(0,1),true,'south in world moves left on screen');
assert.equal(townFacingFlip(1,1,true),true,'pure vertical motion must not flip');
assert.equal(townFacingFlip(-1,-1,false),false,'pure vertical motion must not flip');
// walk: stride, pass, stride, pass
const beat=1/(TOWN_WALK_FPS*2), walker={walking:true,walkT:0,animT:0,townsfolkSpriteId:'townsfolk_001'};
const seq=[0,1,2,3].map(i=>{walker.walkT=i*beat+beat/2;return townFrame(walker);});
assert.deepEqual(seq,[3,0,4,0],'walk cycle is stride, pass, stride, pass');
walker.walking=false;
for(let t=0;t<40;t+=.5){walker.animT=t;assert.ok(townFrame(walker)<=2,'idle sprite must use only idle frames');}
// named frames and per-identity extras
assert.equal(townFrameCount('townsfolk_001'),11);
assert.equal(townFrameCount('townsfolk_019'),13,'knights carry two attacks');
assert.equal(townFrameCount('townsfolk_024'),13,'the court lady has a fan and a shy pose');
assert.equal(townFrameCount('townsfolk_036'),11,'colourways follow their identity');
assert.equal(townFrameOf('townsfolk_019','attack_2'),12);
assert.equal(townFrameOf('townsfolk_001','attack_1'),-1);
const knight={walking:true,walkT:3,knight:true,townAttackT:1,animT:0,townAttackSeed:0,townsfolkSpriteId:'townsfolk_020'};
assert.equal(townFrame(knight),11);
knight.animT=.3;
assert.equal(townFrame(knight),12);
knight.townAttackT=0;knight.townPoseT=1;knight.townPoseFrame=8;
assert.equal(townFrame(knight),8,'event pose wins over walk');
knight.townPoseT=0;
assert.ok([0,3,4].includes(townFrame(knight)),'walk resumes after special event');
// every emotion: its poses exist (or fall back), its icon is drawn, its motion stays sane
const idle={walking:false,animT:1,townsfolkSpriteId:'townsfolk_005',emotionT:5,emoteClock:0};
for(const [name,e] of Object.entries(EMOTIONS)){
  idle.emotion=name;
  for(let c=0;c<4;c+=.37){idle.emoteClock=c;const f=townFrame(idle);assert.ok(f>=0&&f<11,`${name}: frame ${f} on a plain sheet`);}
  if(e.icon)assert.ok(EMOTE_ICONS.includes(e.icon),`${name}: icon ${e.icon} is not drawn`);
  if(e.pose)for(const p of e.pose)assert.ok(STD_FRAMES.includes(p)||e.alt||['attack_1','attack_2','gesture','fan','shy','read'].includes(p),`${name}: pose ${p}`);
  for(let t=0;t<=3;t+=.1){const m=townMotion(t,false,name);assert.ok(m.bob>=-1e-9&&m.bob<=10&&Math.abs(m.rot)<.3&&m.sy>.85&&m.sy<1.15,`${name}: motion out of range at ${t}`);}
}
for(let t=0;t<=1;t+=.05) {
  const {bob,sy}=townMotion(t,true);
  assert.ok(bob>=0&&bob<=2.2+1e-8,'moving bob must be upward and <= player bob');
  assert.ok(sy>=.97-1e-8&&sy<=1.03+1e-8,'squash must match player');
}
assert.ok(Math.abs(townMotion(.25,false).bob)<=.6,'idle bob must be subtle');
console.log(`Town animation contract OK (${Object.keys(EMOTIONS).length} emotions, ${EMOTE_ICONS.length} bubble icons)`);
