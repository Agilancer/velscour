// Pure regression for gait timing, 2:1 isometric facing, and animation frames.
// Run: node tools/tests/town_visuals.mjs
import assert from 'node:assert/strict';
import { TOWN_WALK_FPS, townFacingFlip, townFrame, townMotion } from '../../src/game/townsfolkvisuals.js';

assert.ok(TOWN_WALK_FPS<7 && TOWN_WALK_FPS>=3.5,'town walk cycle should be slower than 7fps');
assert.equal(townFacingFlip(1,0),false,'east in world moves right on screen');
assert.equal(townFacingFlip(0,-1),false,'north in world moves right on screen');
assert.equal(townFacingFlip(-1,0),true,'west in world moves left on screen');
assert.equal(townFacingFlip(0,1),true,'south in world moves left on screen');
assert.equal(townFacingFlip(1,1,true),true,'pure vertical motion must not flip');
assert.equal(townFacingFlip(-1,-1,false),false,'pure vertical motion must not flip');
const walker={walking:true,walkT:0,animT:0,frameCount:11};
assert.equal(townFrame(walker),3);
walker.walkT=1/TOWN_WALK_FPS+.01;
assert.equal(townFrame(walker),4);
walker.walkT=2/TOWN_WALK_FPS+.01;
assert.equal(townFrame(walker),3);
walker.walking=false;
assert.ok(townFrame(walker)<=2,'idle sprite must use only idle frames');
const knight={walking:true,walkT:3,knight:true,townAttackT:1,animT:0,
  townAttackSeed:0,frameCount:13};
assert.equal(townFrame(knight),11);
knight.animT=.3;
assert.equal(townFrame(knight),12);
knight.townAttackT=0;knight.townPoseT=1;knight.townPoseFrame=8;
assert.equal(townFrame(knight),8,'event pose wins over walk');
knight.townPoseT=0;
assert.ok([3,4].includes(townFrame(knight)),'walk resumes after special event');
for(let t=0;t<=1;t+=.05) {
  const {bob,squash}=townMotion(t,true);
  assert.ok(bob>=0&&bob<=2.2+1e-8,'moving bob must be upward and <= player bob');
  assert.ok(squash>=.97-1e-8&&squash<=1.03+1e-8,'squash must match player');
}
assert.ok(Math.abs(townMotion(.25,false).bob)<=.6,'idle bob must be subtle');
console.log('Town movement/facing animation contract OK');
