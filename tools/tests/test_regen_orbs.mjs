import assert from 'assert';
import { Player } from '../../src/game/player.js';
import { dropLoot, dropChest } from '../../src/game/loot.js';
import { G } from '../../src/state.js';

console.log('Testing life regen and health orb mechanics...');

// Setup minimal player and world
const char = {
  name: 'Tester',
  classId: 'paladin',
  level: 50,
  attrs: { str: 10, dex: 10, vit: 10, int: 10 },
  potions: { hp: 5, mp: 5 },
  inv: [],
  equip: {},
  skills: {},
  perks: {},
  keys: {},
  sigils: {}
};

G.char = char;

const townWorld = {
  kind: 'town',
  depth: 0,
  biome: { name: 'town' },
  map: Array(50).fill(null).map(() => Array(50).fill(1)),
  creatures: [],
  hazards: [],
  projectiles: [],
  loot: [],
  addLoot(it) { this.loot.push(it); }
};

const dungeonWorld = {
  kind: 'dungeon',
  depth: 10,
  biome: { name: 'crypt' },
  map: Array(50).fill(null).map(() => Array(50).fill(1)),
  creatures: [],
  hazards: [],
  projectiles: [],
  loot: [],
  addLoot(it) { this.loot.push(it); }
};

const p = new Player(char);
p.x = 25; p.y = 25;

// Test 1: Town vs Dungeon regen
p.world = townWorld;
p.recompute();
assert.ok(p.st.naturalLifeRegen > 0, `Expected naturalLifeRegen > 0, got ${p.st.naturalLifeRegen}`);
assert.strictEqual(p.st.lifeRegen, p.st.naturalLifeRegen, `Expected in town lifeRegen to equal naturalLifeRegen`);

p.world = dungeonWorld;
p.recompute();
assert.ok(p.st.naturalLifeRegen > 0, `naturalLifeRegen should still be calculated as stat baseline`);
assert.strictEqual(p.st.lifeRegen, 0, `In dungeon without gear, lifeRegen should be 0, got ${p.st.lifeRegen}`);

// Test 2: Orb HP pickup restore amount (20% of maxHp)
p.maxHp = 1000;
p.hp = 100;
p.char.class = 'warrior';
p.pickup({ kind: 'orb_hp', data: {} });
assert.strictEqual(p.hp, 300, `Expected 100 + 0.2*1000 = 300, got ${p.hp}`);

// Test 3: Loot orb drop distributions
G.player = p;
const runs = 1000;

// Normal monster (healthy player)
p.hp = 1000; // 100% HP
let normalOrbs = 0;
for (let i = 0; i < runs; i++) {
  dungeonWorld.loot = [];
  const m = { rank: 'normal', level: 10, x: 25, y: 25 };
  dropLoot(dungeonWorld, m);
  normalOrbs += dungeonWorld.loot.filter(l => l.kind === 'orb_hp').length;
}
const normalRate = normalOrbs / runs;
console.log(`Normal monster orb drop rate (healthy): ${(normalRate * 100).toFixed(1)}% (expected ~30%)`);
assert.ok(normalRate >= 0.25 && normalRate <= 0.35, `Normal orb rate ${normalRate} out of expected ~30%`);

// Normal monster (wounded player < 50% HP)
p.hp = 300; // 30% HP
let woundedOrbs = 0;
for (let i = 0; i < runs; i++) {
  dungeonWorld.loot = [];
  const m = { rank: 'normal', level: 10, x: 25, y: 25 };
  dropLoot(dungeonWorld, m);
  woundedOrbs += dungeonWorld.loot.filter(l => l.kind === 'orb_hp').length;
}
const woundedRate = woundedOrbs / runs;
console.log(`Normal monster orb drop rate (wounded): ${(woundedRate * 100).toFixed(1)}% (expected ~50%)`);
assert.ok(woundedRate >= 0.44 && woundedRate <= 0.56, `Wounded orb rate ${woundedRate} out of expected ~50%`);

// Champion monster (1 guaranteed + 50% chance for 2nd -> average 1.5)
let champOrbs = 0;
for (let i = 0; i < runs; i++) {
  dungeonWorld.loot = [];
  const m = { rank: 'champion', level: 10, x: 25, y: 25 };
  dropLoot(dungeonWorld, m);
  const count = dungeonWorld.loot.filter(l => l.kind === 'orb_hp').length;
  assert.ok(count >= 1, 'Champion must drop at least 1 orb');
  champOrbs += count;
}
const champAvg = champOrbs / runs;
console.log(`Champion average orbs: ${champAvg.toFixed(2)} (expected ~1.50)`);
assert.ok(champAvg >= 1.4 && champAvg <= 1.6, `Champion average ${champAvg} out of expected ~1.50`);

// Boss monster (2-4 orbs)
let bossOrbs = 0;
for (let i = 0; i < runs; i++) {
  dungeonWorld.loot = [];
  const m = { rank: 'boss', level: 10, x: 25, y: 25 };
  dropLoot(dungeonWorld, m);
  const count = dungeonWorld.loot.filter(l => l.kind === 'orb_hp').length;
  assert.ok(count >= 2 && count <= 4, `Boss dropped ${count} orbs, expected 2-4`);
  bossOrbs += count;
}
console.log(`Boss average orbs: ${(bossOrbs / runs).toFixed(2)} (expected ~3.0)`);

// Chest (75% chance)
let chestOrbs = 0;
for (let i = 0; i < runs; i++) {
  dungeonWorld.loot = [];
  const chest = { x: 25, y: 25, rare: false };
  dropChest(dungeonWorld, chest, 10);
  chestOrbs += dungeonWorld.loot.filter(l => l.kind === 'orb_hp').length;
}
const chestRate = chestOrbs / runs;
console.log(`Chest orb drop rate: ${(chestRate * 100).toFixed(1)}% (expected ~75%)`);
assert.ok(chestRate >= 0.70 && chestRate <= 0.80, `Chest orb rate ${chestRate} out of expected ~75%`);

console.log('ALL REGEN AND ORB TESTS PASSED!');
