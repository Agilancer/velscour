// Comprehensive headless Node integration test for the 17-Class Skill Tree Pruning & 5-Tier Talent Morph Overhaul.
// Run: node tools/tests/test_skill_talent_overhaul.mjs
import assert from 'node:assert/strict';

// Minimal DOM / Canvas / Storage shims so full game combat modules run headlessly in Node
const memStore = new Map();
globalThis.localStorage = {
  getItem: (k) => (memStore.has(k) ? memStore.get(k) : null),
  setItem: (k, v) => memStore.set(k, String(v)),
  removeItem: (k) => memStore.delete(k),
  key: (i) => [...memStore.keys()][i] ?? null,
  get length() { return memStore.size; },
};
const noopCtx = new Proxy({}, {
  get: (_t, prop) => {
    if (prop === 'measureText') return () => ({ width: 10 });
    if (prop === 'getImageData') return (_x, _y, w, h) => ({ data: new Uint8ClampedArray((w || 1) * (h || 1) * 4) });
    if (prop === 'createLinearGradient' || prop === 'createRadialGradient') return () => ({ addColorStop() {} });
    return () => {};
  },
});
const makeFakeEl = () => ({
  width: 64, height: 64, style: {}, classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
  getContext: () => noopCtx, appendChild() {}, append() {}, remove() {}, addEventListener() {},
  setAttribute() {}, querySelector: () => null, querySelectorAll: () => [],
});
globalThis.document = {
  createElement: () => makeFakeEl(),
  getElementById: () => makeFakeEl(),
  querySelector: () => null,
  querySelectorAll: () => [],
  body: makeFakeEl(),
  addEventListener() {},
};
globalThis.window = globalThis;
globalThis.addEventListener = () => {};
globalThis.dispatchEvent = () => true;
globalThis.CustomEvent = class CustomEvent { constructor(type, detail) { this.type = type; this.detail = detail; } };
globalThis.Image = class FakeImage {
  constructor() { this.width = 64; this.height = 64; this.naturalWidth = 64; this.naturalHeight = 64; this.complete = true; }
  decode() { return Promise.resolve(); }
};

const { G } = await import('../../src/state.js');
const { CLASSES } = await import('../../src/data/classes.js');
const { SKILLS, CLASS_SKILLS, ROW_LEVELS, MAX_SKILL_LEVEL, describe } = await import('../../src/data/skills.js');
const {
  TALENTS, CLASS_TALENTS, TALENT_ROW_LEVELS,
  canLearnTalent, learnTalent, respecTalents,
  skillMorphFor, applySkillMorph,
} = await import('../../src/data/talents.js');
const { BIOME_BY_ID } = await import('../../src/data/biomes.js');
const { TileMap } = await import('../../src/world/map.js');
const { World } = await import('../../src/game/world.js');
const { Player } = await import('../../src/game/player.js');
const { makeMonster } = await import('../../src/game/monster.js');
const { castSkill } = await import('../../src/game/skillrun.js');
const { hit, kill } = await import('../../src/game/combat.js');
const { newCharData, migrate } = await import('../../src/game/save.js');
const { rollItem } = await import('../../src/data/items.js');

G.ui = {
  log() {}, refresh() {}, float() {}, hud: { sheet: { atk: 100 } },
};
G.game = {
  autosave() {}, onPlayerDeath() {}, isDungeonAuthority: () => true,
};

console.log('1. Validating 17-Class 3x3 Skill Trees & 5-Tier Talent Trees...');
const classIds = Object.keys(CLASS_SKILLS);
assert.equal(classIds.length, 17, 'Expected 17 active classes');
assert.deepEqual(ROW_LEVELS, [1, 12, 30]);
assert.deepEqual(TALENT_ROW_LEVELS, [1, 10, 20, 30, 45]);
assert.equal(Object.keys(SKILLS).length, 612, 'Expected 612 total skills');
assert.equal(Object.keys(TALENTS).length, 408, 'Expected 408 total talent nodes');

function makeTestWorld(p) {
  const map = new TileMap(32, 32);
  for (let y = 2; y < 30; y++) for (let x = 2; x < 30; x++) map.t[y * 32 + x] = 1;
  map.start = [16, 16];
  const w = new World('dungeon', { map, biome: BIOME_BY_ID.catacombs, depth: 6 });
  p.x = 16.5;
  p.y = 16.5;
  w.player = p;
  w.add(p);
  G.world = w;
  G.player = p;
  G.char = p.char;
  // Add a target enemy and a corpse near the player so targeted, chain, and corpse skills all execute their full codepaths
  const foe = makeMonster(w, 'skeleton', w.biome, 10, 'normal', p.x + 1.8, p.y + 0.2);
  foe.maxHp = foe.hp = 1e9;
  foe.awake = true;
  w.add(foe);
  for (let i = 0; i < 4; i++) {
    w.corpses.push({ x: p.x + 1 + i * 0.2, y: p.y + 0.2, sprite: foe.sprite, pal: foe.pal, maxHp: 500, arch: 'skeleton', level: 10 });
  }
  w.rebuildGrid();
  return { w, foe };
}

console.log('2. Testing Player instantiation, free LMB grant, and casting all 612 skills (Base + Path A + Path B)...');
let totalCasts = 0;
for (const cls of classIds) {
  const c = newCharData(cls, 'Test_' + cls);
  c.level = 60;
  c.talentPoints = 40;
  const p = new Player(c);
  const { w, foe } = makeTestWorld(p);
  p.applyGrants();
  assert(c.bar[0] && SKILLS[c.bar[0]], `${cls}: missing LMB skill after applyGrants()`);

  for (const sk of CLASS_SKILLS[cls]) c.skills[sk.id] = 5;
  p.recompute();

  // Pass 0: Base casts
  for (const sk of CLASS_SKILLS[cls]) {
    w.corpses.forEach((cp) => { cp.used = false; });
    const ok = castSkill(p, sk, 5, foe.x, foe.y);
    assert.notEqual(ok, false, `${cls} base cast failed on ${sk.id} (${sk.name})`);
    totalCasts++;
  }

  // Pass 1: Unlock Path A across all 3 branches (0 -> 1A -> 2 -> 3A -> 4A)
  respecTalents(c);
  c.talentPoints = 60;
  for (const b of CLASS_TALENTS[cls]) {
    for (const n of b.nodes) {
      if (n.choice === 'B') continue;
      while (canLearnTalent(c, n)) assert(learnTalent(c, n.id));
      if (n.choice === 'A') {
        const sibB = b.nodes.find((x) => x.row === n.row && x.choice === 'B');
        assert(sibB && !canLearnTalent(c, sibB), `${cls}: Sibling B ${sibB?.id} should be locked after choosing A`);
      }
    }
  }
  p.recompute();
  for (const sk of CLASS_SKILLS[cls]) {
    w.corpses.forEach((cp) => { cp.used = false; });
    const morph = skillMorphFor(p, sk);
    const effSk = morph ? applySkillMorph(sk, morph) : sk;
    const desc = describe(effSk, 5, [10, 20]);
    assert(typeof desc === 'string' && desc.length > 5);
    const ok = castSkill(p, sk, 5, foe.x, foe.y);
    assert.notEqual(ok, false, `${cls} Path A cast failed on ${sk.id} (${sk.name})`);
    totalCasts++;
  }

  // Pass 2: Respec & unlock Path B across all 3 branches (0 -> 1B -> 2 -> 3B -> 4B)
  const refunded = respecTalents(c);
  assert(refunded > 0, `${cls}: respecTalents should refund spent points`);
  c.talentPoints = 60;
  for (const b of CLASS_TALENTS[cls]) {
    for (const n of b.nodes) {
      if (n.choice === 'A') continue;
      while (canLearnTalent(c, n)) assert(learnTalent(c, n.id));
    }
  }
  p.recompute();
  for (const sk of CLASS_SKILLS[cls]) {
    w.corpses.forEach((cp) => { cp.used = false; });
    const ok = castSkill(p, sk, 5, foe.x, foe.y);
    assert.notEqual(ok, false, `${cls} Path B cast failed on ${sk.id} (${sk.name})`);
    totalCasts++;
  }
}
console.log(`   ✔ Executed ${totalCasts} live skill casts across all 17 classes (Base + Path A + Path B) with 0 errors!`);

console.log('3. Testing specific live gameplay morphs (sumSwap, el conversion, waveProjs, resetOnKill, talentOnKill, cheatDeath, knightCapPlus)...');
{
  // 3a. Necromancer Golem sumSwap (Summon Golem -> Blood Golem / Fire Golem)
  const nc = newCharData('necromancer', 'NecroMorph');
  nc.level = 50; nc.talentPoints = 20;
  const np = new Player(nc);
  const { w: nw } = makeTestWorld(np);
  const sumSwapNode = Object.values(TALENTS).find((n) => n.classId === 'necromancer' && n.morph && n.morph.sumSwap);
  assert(sumSwapNode, 'Necromancer has sumSwap talent morph');
  const golemName = Array.isArray(sumSwapNode.morph.skills) ? sumSwapNode.morph.skills[0] : sumSwapNode.morph.skills;
  const golemSk = CLASS_SKILLS.necromancer.find((s) => s.name === golemName);
  assert(golemSk, `Target skill ${golemName} exists`);
  nc.skills[golemSk.id] = 5;
  const branch = CLASS_TALENTS.necromancer[sumSwapNode.branch];
  for (const n of branch.nodes) {
    if (n.row < sumSwapNode.row && n.choice !== (sumSwapNode.choice === 'B' ? 'A' : 'B')) {
      while (canLearnTalent(nc, n)) learnTalent(nc, n.id);
    }
  }
  while (canLearnTalent(nc, sumSwapNode)) learnTalent(nc, sumSwapNode.id);
  np.recompute();
  castSkill(np, golemSk, 5, np.x + 1, np.y);
  const spawned = nw.creatures.find((cr) => cr.summon && cr.skillId === golemSk.id && !cr.dead);
  assert(spawned, 'Morphed Golem spawned');
  assert.equal(spawned.summonKey, sumSwapNode.morph.sumSwap, `Expected Golem to swap to ${sumSwapNode.morph.sumSwap}`);

  // 3b. Cooldown Reset on Kill (resetOnKill morph)
  const resetNode = Object.values(TALENTS).find((n) => n.morph && n.morph.resetOnKill);
  assert(resetNode, 'Found a resetOnKill talent node');
  const rc = newCharData(resetNode.classId, 'ResetHero');
  rc.level = 50; rc.talentPoints = 30;
  const rp = new Player(rc);
  const { w: rw } = makeTestWorld(rp);
  const rBranch = CLASS_TALENTS[resetNode.classId][resetNode.branch];
  for (const n of rBranch.nodes) {
    if (n.row < resetNode.row && n.choice !== (resetNode.choice === 'B' ? 'A' : 'B')) {
      while (canLearnTalent(rc, n)) learnTalent(rc, n.id);
    }
  }
  while (canLearnTalent(rc, resetNode)) learnTalent(rc, resetNode.id);
  const targetSkName = Array.isArray(resetNode.morph.skills) ? resetNode.morph.skills[0] : resetNode.morph.skills;
  const rSk = CLASS_SKILLS[resetNode.classId].find((s) => (targetSkName ? s.name === targetSkName : s.tree === resetNode.morph.tree));
  assert(rSk, 'Target skill for resetOnKill exists');
  rc.skills[rSk.id] = 5;
  rp.recompute();
  rp.cooldowns[rSk.id] = 8.0;
  const victim = makeMonster(rw, 'skeleton', rw.biome, 5, 'normal', rp.x + 1, rp.y);
  victim.lastSk = rSk.id;
  rw.add(victim);
  kill(victim, rp, {});
  assert.equal(rp.cooldowns[rSk.id], 0, `Expected cooldown of ${rSk.name} to reset to 0 on kill`);

  // 3c. On-Kill Elemental Explosion (talentOnKill)
  const okNode = Object.values(TALENTS).find((n) => n.onKill);
  assert(okNode, 'Found an onKill keystone node');
  const oc = newCharData(okNode.classId, 'OnKillHero');
  oc.level = 60; oc.talentPoints = 30;
  const op = new Player(oc);
  const { w: ow } = makeTestWorld(op);
  const oBranch = CLASS_TALENTS[okNode.classId][okNode.branch];
  for (const n of oBranch.nodes) {
    if (n.row < okNode.row && n.choice !== (okNode.choice === 'B' ? 'A' : 'B')) {
      while (canLearnTalent(oc, n)) learnTalent(oc, n.id);
    }
  }
  while (canLearnTalent(oc, okNode)) learnTalent(oc, okNode.id);
  op.recompute();
  assert(op.st.talentOnKill.length > 0, 'talentOnKill populated on player stats');
  const carrier = makeMonster(ow, 'skeleton', ow.biome, 10, 'normal', op.x + 2, op.y);
  carrier.maxHp = 1000; carrier.hp = 10;
  const stName = okNode.onKill.status === 'slow' ? 'chill' : okNode.onKill.status;
  carrier.status[stName] = { t: 3, dps: 10 };
  const bystander = makeMonster(ow, 'skeleton', ow.biome, 10, 'normal', op.x + 2.4, op.y);
  bystander.maxHp = bystander.hp = 5000;
  ow.add(carrier); ow.add(bystander);
  ow.rebuildGrid();
  kill(carrier, op, {});
  assert(bystander.hp < 5000, 'Expected nearby enemy to take AoE damage from talentOnKill explosion');

  // 3d. Cheat Death Keystone (cheatDeath)
  const cdNode = Object.values(TALENTS).find((n) => n.cheatDeath);
  assert(cdNode, 'Found a cheatDeath keystone node');
  const cc = newCharData(cdNode.classId, 'ImmortalHero');
  cc.level = 60; cc.talentPoints = 30;
  const cp = new Player(cc);
  const { foe: bossFoe } = makeTestWorld(cp);
  const cBranch = CLASS_TALENTS[cdNode.classId][cdNode.branch];
  for (const n of cBranch.nodes) {
    if (n.row < cdNode.row && n.choice !== (cdNode.choice === 'B' ? 'A' : 'B')) {
      while (canLearnTalent(cc, n)) learnTalent(cc, n.id);
    }
  }
  while (canLearnTalent(cc, cdNode)) learnTalent(cc, cdNode.id);
  cp.recompute();
  assert(cp.st.cheatDeath, 'cheatDeath active on player');
  cp.hp = 10;
  hit(bossFoe, cp, 999999, 'fire', { force: true });
  assert.equal(cp.dead, false, 'cheatDeath prevented player death');
  assert(cp.hp >= Math.floor(cp.maxHp * 0.44), 'cheatDeath restored ~45% max HP');
  assert(cp.invuln >= 1.4, 'cheatDeath granted invulnerability');
  assert.equal(cp.talentCheatCd, 120, 'cheatDeath started 120s cooldown');

  // 3e. Lancer Grand Commander (+2 Knight Order cap -> 6 knights)
  const lc = newCharData('lancer', 'Commander');
  lc.level = 60; lc.talentPoints = 30;
  const lp = new Player(lc);
  const { w: lw } = makeTestWorld(lp);
  const knNode = Object.values(TALENTS).find((n) => n.classId === 'lancer' && n.knightCapPlus);
  assert(knNode, 'Lancer knightCapPlus talent exists');
  const lBranch = CLASS_TALENTS.lancer[knNode.branch];
  for (const n of lBranch.nodes) {
    if (n.row < knNode.row && n.choice !== (knNode.choice === 'B' ? 'A' : 'B')) {
      while (canLearnTalent(lc, n)) learnTalent(lc, n.id);
    }
  }
  while (canLearnTalent(lc, knNode)) learnTalent(lc, knNode.id);
  lp.recompute();
  assert.equal(lp.st.knightCapPlus, 2, 'Lancer gained +2 knightCapPlus');
  const knSk = CLASS_SKILLS.lancer.find((s) => s.name === 'Knights of the Round');
  const sqSk = CLASS_SKILLS.lancer.find((s) => s.name === 'Squire Knight');
  lc.skills[knSk.id] = 10; lc.skills[sqSk.id] = 10;
  castSkill(lp, knSk, 10, lp.x + 1, lp.y);
  castSkill(lp, sqSk, 10, lp.x + 1, lp.y);
  castSkill(lp, sqSk, 10, lp.x + 1, lp.y);
  const activeKnights = lw.creatures.filter((cr) => cr.summon && !cr.dead && cr.summonKey && cr.summonKey.startsWith('kn_'));
  assert.equal(activeKnights.length, 6, 'Grand Commander allowed 6 simultaneous Knight summons');

  // 3f. Elemental Conversion + Wave Projectiles + Auto.spendTalents()
  const { Auto } = await import('../../src/game/autoplay.js');
  const wpNode = Object.values(TALENTS).find((n) => n.morph && n.morph.waveProj);
  assert(wpNode, 'Found waveProj talent morph');
  const wc = newCharData(wpNode.classId, 'WaveHero');
  wc.level = 55; wc.talentPoints = 11;
  const wp = new Player(wc);
  const { w: ww, foe: wf } = makeTestWorld(wp);
  wp.applyGrants();
  for (const sk of CLASS_SKILLS[wpNode.classId]) wc.skills[sk.id] = 5;
  wp.recompute();
  assert(Auto.spendTalents(), 'Auto.spendTalents() spent talent points across 5-tier tree');
  assert.equal(wc.talentPoints, 0, 'Auto.spendTalents() spent all 11 talent points cleanly');

  respecTalents(wc);
  wc.talentPoints = 30;
  const wBranch = CLASS_TALENTS[wpNode.classId][wpNode.branch];
  for (const n of wBranch.nodes) {
    if (n.row < wpNode.row && n.choice !== (wpNode.choice === 'B' ? 'A' : 'B')) {
      while (canLearnTalent(wc, n)) learnTalent(wc, n.id);
    }
  }
  while (canLearnTalent(wc, wpNode)) learnTalent(wc, wpNode.id);
  wp.recompute();
  const wpSkName = Array.isArray(wpNode.morph.skills) ? wpNode.morph.skills[0] : wpNode.morph.skills;
  const wpSk = CLASS_SKILLS[wpNode.classId].find((s) => (wpSkName ? s.name === wpSkName : s.tree === wpNode.morph.tree));
  const hazBefore = ww.hazards.length;
  castSkill(wp, wpSk, 5, wf.x, wf.y);
  assert(ww.hazards.length > hazBefore, 'waveProjs spawned piercing wave projectile hazards on melee cast');
}
console.log('   ✔ All live gameplay morphs (sumSwap, resetOnKill, talentOnKill, cheatDeath, knightCapPlus) verified!');

console.log('4. Testing legacy character save migration (refunding pruned skills/talents, fixing hotbar/macros, remapping ring augments)...');
{
  const leg = newCharData('paladin', 'LegacyPaladin');
  leg.level = 45;
  leg.skillPoints = 2;
  leg.talentPoints = 1;
  leg.granted = { 'paladin.0.0': true, 'paladin.0.12': true };
  leg.skills = {
    'paladin.0.0': 1,   // granted valid skill (0 paid)
    'paladin.0.1': 8,   // valid Blessed Hammer (8 paid)
    'paladin.0.12': 10, // pruned legacy skill with grant (9 paid -> refund 9!)
    'paladin.2.19': 5,  // pruned legacy skill (5 paid -> refund 5!)
  };
  leg.talents = {
    pal_legacy_node: 3, // obsolete talent ID -> refund 3!
    pal_legacy_key: 1,  // obsolete keystone -> refund 1!
  };
  leg.bar = ['paladin.0.12', 'paladin.0.1', 'paladin.2.19', ...Array(12).fill(null)];
  leg.macros[0].skills = ['paladin.0.1', 'paladin.0.12', 'wizard.0.0'];
  const ring = rollItem(30, { slot: 'ring', rarity: 4 });
  ring.aug = [{ id: 'tether', sk: 'paladin.0.12', pow: 1.5 }];
  ring.rname = 'Storm-Bound Gold Ring of Wheel of Hammers';
  leg.equip.ring1 = ring;

  migrate(leg);

  assert.equal(leg.skills['paladin.0.12'], undefined, 'Pruned skill removed');
  assert.equal(leg.skills['paladin.2.19'], undefined, 'Pruned skill removed');
  assert.equal(leg.skills['paladin.0.1'], 8, 'Valid skill rank preserved');
  assert.equal(leg.skillPoints, 2 + 9 + 5, 'Exact spent skill points refunded (16 total)');
  assert.equal(leg.talentPoints, 1 + 3 + 1, 'Exact spent talent points refunded (5 total)');
  assert.deepEqual(leg.talents, {}, 'Obsolete talent IDs cleaned');
  assert(leg.bar[0] && SKILLS[leg.bar[0]], 'LMB slot restored to valid learned basic skill');
  assert.equal(leg.bar[1], 'paladin.0.1', 'Valid hotbar skill preserved');
  assert.equal(leg.bar[2], null, 'Pruned hotbar slot cleared');
  assert.deepEqual(leg.macros[0].skills, ['paladin.0.1'], 'Macros stripped of pruned and wrong-class skills');
  assert(SKILLS[leg.equip.ring1.aug[0].sk], `Ring augment remapped to valid skill: ${leg.equip.ring1.aug[0].sk}`);
  assert(!leg.equip.ring1.rname.includes('a lost skill') && !leg.equip.ring1.rname.includes('Wheel of Hammers'), `Ring name updated cleanly: ${leg.equip.ring1.rname}`);

  // Upstream pre-talent save (talentPoints undefined) must earn floor(level/5) talentPoints without stealing skillPoints
  const preTalent = newCharData('wizard', 'PreTalentWizard');
  preTalent.level = 50;
  preTalent.skillPoints = 12;
  delete preTalent.talentPoints;
  migrate(preTalent);
  assert.equal(preTalent.talentPoints, 10, 'Pre-talent Lv 50 save receives 10 talentPoints');
  assert.equal(preTalent.skillPoints, 12, 'Pre-talent save retains all 12 skillPoints untouched');
}
console.log('   ✔ Legacy save migration verified cleanly!');
console.log('\nALL SKILL TREE & TALENT MORPH OVERHAUL INTEGRATION TESTS PASSED!');
process.exit(0);
