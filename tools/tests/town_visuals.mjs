// Pure regression for the people/animal animation contract: 2:1 isometric facing, named frames, emotions, the
// bouncing walk (no walk frames), animal trots and body motion.
// Run: node tools/tests/town_visuals.mjs
import assert from 'node:assert/strict';
import { townFacingFlip, townFrame, townMotion, townFrameOf, townFrameCount, EMOTIONS, STD_FRAMES, EXTRA_FRAMES } from '../../src/game/townsfolkvisuals.js';
import { EMOTE_ICONS } from '../../src/gfx/emotes.js';

assert.equal(townFacingFlip(1,0),false,'east in world moves right on screen');
assert.equal(townFacingFlip(0,-1),false,'north in world moves right on screen');
assert.equal(townFacingFlip(-1,0),true,'west in world moves left on screen');
assert.equal(townFacingFlip(0,1),true,'south in world moves left on screen');
assert.equal(townFacingFlip(1,1,true),true,'pure vertical motion must not flip');
assert.equal(townFacingFlip(-1,-1,false),false,'pure vertical motion must not flip');
assert.equal(townFacingFlip(0.0175,0,true),false,'a slow walker heading screen-right turns right');
assert.equal(townFacingFlip(-0.0175,0,false),true,'a slow walker heading screen-left turns left (per-frame steps are tiny)');
assert.equal(townFacingFlip(-0.012,-0.0105,false),false,'nearly vertical steps keep the facing');
// named frames: ten painted emotions everywhere, ten more on the Greener sheets
assert.equal(townFrameCount('18_king'),10);
assert.equal(townFrameCount('dog_02_hound'),10);
assert.equal(townFrameCount('00_greener_spooky_goofy_a'),20);
assert.equal(townFrameOf('18_king','attack'),8);
assert.equal(townFrameOf('18_king','thinking'),-1,'extras only on the Greener sheets');
assert.equal(townFrameOf('00_greener_20_frames','thinking'),10+EXTRA_FRAMES.indexOf('thinking'));
// people walk on their pose with a bounce: idle (or the emotion's pose if it walks), never a walk frame
const walker={walking:true,walkT:0,animT:0,townsfolkSpriteId:'35_townsfolk_baker'};
for(let t=0;t<3;t+=.1){walker.walkT=t;assert.equal(townFrame(walker),0,'a walking person keeps the idle pose');}
walker.emotion='scared';walker.emotionT=2;
assert.equal(townFrame(walker),STD_FRAMES.indexOf('scared'),'a frightened person runs in the scared pose');
walker.emotion='think';
assert.equal(townFrame(walker),0,'a thinking pose stops while walking');
walker.emotion=null;walker.walking=false;
for(let t=0;t<40;t+=.5){walker.animT=t;assert.ok([0,9].includes(townFrame(walker)),'idle uses idle and the odd smile');}
// a knight's swing, and forced poses
const knight={walking:true,walkT:3,townAttackT:1,animT:0,townsfolkSpriteId:'06_knight_ashen_bastion'};
assert.equal(townFrame(knight),STD_FRAMES.indexOf('attack'));
knight.townAttackT=0;knight.townPoseT=1;knight.townPose='cheer';
assert.equal(townFrame(knight),STD_FRAMES.indexOf('cheer'),'a forced pose wins over the walk');
// animals trot paw-up/paw-down, bound in the attack leap when they run, rabbits hop
const dog={animal:true,species:'dog',walking:true,walkT:0,animT:0,townsfolkSpriteId:'dog_02_hound'};
const trot=new Set();for(let t=0;t<2;t+=.05){dog.walkT=t;trot.add(townFrame(dog));}
assert.deepEqual([...trot].sort(),[0,3],'a trot alternates idle and the raised paw');
dog.running=true;assert.equal(townFrame(dog),STD_FRAMES.indexOf('attack'),'a running dog bounds');
// every emotion: its poses exist (or fall back), its icon is drawn, its motion stays sane
for(const sid of ['18_king','00_greener_20_frames','cat_01_black']){
  const idle={walking:false,animT:1,townsfolkSpriteId:sid,emotionT:5,emoteClock:0,animal:sid.startsWith('cat')};
  for(const [name,e] of Object.entries(EMOTIONS)){
    idle.emotion=name;
    for(let c=0;c<4;c+=.37){idle.emoteClock=c;const f=townFrame(idle);assert.ok(f>=0&&f<townFrameCount(sid),`${name}: frame ${f} on ${sid}`);}
    if(e.icon)assert.ok(EMOTE_ICONS.includes(e.icon),`${name}: icon ${e.icon} is not drawn`);
    if(e.pose)for(const p of [...e.pose,...(e.alt||[])])assert.ok(STD_FRAMES.includes(p)||EXTRA_FRAMES.includes(p),`${name}: pose ${p}`);
    for(let t=0;t<=3;t+=.1){const m=townMotion(t,false,name);assert.ok(m.bob>=-1e-9&&m.bob<=10&&Math.abs(m.rot)<.3&&m.sy>.85&&m.sy<1.15,`${name}: motion out of range at ${t}`);}
  }
}
// the walk is the hero's bounce with a little more spring (the pose doesn't step): up, small, squash within 4%
for(let t=0;t<=1;t+=.05){
  const {bob,sy,rot}=townMotion(t,true);
  assert.ok(bob>=0&&bob<=3+1e-8,'moving bob must be upward and small');
  assert.ok(sy>=.96-1e-8&&sy<=1.04+1e-8,'squash must stay near the hero\'s');
  assert.ok(Math.abs(rot)<.06,'the sway is slight');
  const r=townMotion(t,true,null,false,'rabbit');assert.ok(r.bob>=0&&r.bob<=9.01,'rabbits hop');
}
assert.ok(Math.abs(townMotion(.25,false).bob)<=.6,'idle bob must be subtle');
console.log(`People animation contract OK (${Object.keys(EMOTIONS).length} emotions, ${EMOTE_ICONS.length} bubble icons)`);
