// No-browser Dragoon Spearstorm skill-tree, early grant and balance regression.
// node tools/tests/dragoon_spearstorm.mjs
import assert from 'node:assert/strict';
import { SKILLS, CLASS_SKILLS, grantedSkillsAt, skillBaseDamage, manaCost, cooldown, useTime, skillRange, spearBarrageAreas, describe } from '../../src/data/skills.js';
import { CLASSES } from '../../src/data/classes.js';

assert.equal(CLASSES.dragoon.trees.length, 4);
assert.equal(CLASSES.dragoon.trees[3], 'Spearstorm');
const skills = CLASS_SKILLS.dragoon;
assert.equal(skills.length, 80, 'Dragoon gains twenty skills and loses none');
for (let tree = 0; tree < 3; tree++) for (let idx = 0; idx < 20; idx++)
  assert(SKILLS[`dragoon.${tree}.${idx}`], 'Original Dragoon skill ID missing');
const one = SKILLS['dragoon.3.0'], three = SKILLS['dragoon.3.1'];
assert.equal(one.name, 'Thousandfold Impalement');
assert.equal(three.name, 'Triune Spearfall');
assert.equal(one.m.barrage, 1);
assert.equal(three.m.barrage, 3);
assert.equal(cooldown(one), 8);
assert.equal(cooldown(three), 14);
assert.equal(useTime(one), 0);
assert.equal(useTime(three), 0);
assert.equal(skillRange(one), 2.5);
assert.equal(skillRange(three), 2.5);
const close = spearBarrageAreas(one, 12, 15, 0);
const triune = spearBarrageAreas(three, 12, 15, 0);
assert.equal(close.centers.length, 1);
assert.deepEqual(close.centers[0], [12, 15], 'Single AoE must always originate at the Dragoon');
assert.equal(triune.centers.length, 3);
assert.deepEqual(triune.centers[0], [12, 15], 'Triple AoE central circle must originate at the Dragoon');
assert.equal(close.radius, triune.radius);
assert(triune.centers.every(([x, y]) => Math.hypot(x - 12, y - 15) < 1.6), 'Triple AoE must stay tight to the Dragoon');
const nearWall = spearBarrageAreas(three, 12, 15, 0, 1, (_x, y) => y <= 15);
assert.deepEqual(nearWall.centers[2], [12, 15], 'Out-of-bounds spear circle should collapse onto caster');
assert.equal(nearWall.centers.length, 3);
assert.equal(one.reqLevel, 1);
assert.equal(three.reqLevel, 1);
assert.equal(one.prereq, null);
assert.equal(three.prereq, null);
for (const lv of [1, 2, 5, 20]) {
  const ratio = skillBaseDamage(three, lv) / skillBaseDamage(one, lv);
  assert(Math.abs(ratio - 1.5) < 1e-10, 'Triple barrage should deal 150% per-target damage');
  assert(manaCost(three, lv) === manaCost(one, lv), 'Barrage variants have same early resource cost');
  assert(describe(one, lv).includes('circle'));
  assert(describe(three, lv).includes('three circles'));
}
for (const [level, idx] of [[1, 0], [2, 1], [4, 2], [6, 3]])
  assert(grantedSkillsAt('dragoon', level).includes('dragoon.3.' + idx), 'Missing early grant');
assert.equal(grantedSkillsAt('paladin', 1).some((id) => id.includes('.3.')), false);
for (let idx = 0; idx < 20; idx++) {
  const sk = SKILLS['dragoon.3.' + idx];
  assert(sk, 'Missing Spearstorm slot ' + idx);
  assert.equal(sk.reqLevel, [1, 6, 12, 20, 30][Math.floor(idx / 4)]);
  assert.equal(sk.prereq, idx < 4 ? null : 'dragoon.3.' + (idx - 4));
}
assert.equal(Object.keys(SKILLS).length, 1000, 'Expected 20 more Dragoon skills, 1000 total');
console.log('Dragoon Spearstorm: original IDs retained; early grants, 2.5-tile point-blank reach, compact self-centered circles, instant casting, 1.5x damage, and cooldowns verified.');
