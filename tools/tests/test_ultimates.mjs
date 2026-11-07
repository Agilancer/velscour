// Verification suite for all 17 Hero Class Ultimates, VFX, and procedural icons.
import assert from 'node:assert/strict';

function makeMockCtx() {
  const grad = { addColorStop() {} };
  return {
    save() {}, restore() {}, beginPath() {}, closePath() {}, clip() {},
    arc() {}, ellipse() {}, rect() {}, roundRect() {}, fillRect() {}, strokeRect() {}, clearRect() {},
    moveTo() {}, lineTo() {}, quadraticCurveTo() {}, bezierCurveTo() {},
    fill() {}, stroke() {}, translate() {}, rotate() {}, scale() {},
    fillText() {}, drawImage() {},
    createLinearGradient: () => grad,
    createRadialGradient: () => grad,
    getImageData: (_, __, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
  };
}

globalThis.window = globalThis;
Object.defineProperty(globalThis, 'navigator', { value: { maxTouchPoints: 0 }, configurable: true });
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
globalThis.performance = { now: () => 0 };
globalThis.requestAnimationFrame = () => 0;
globalThis.AudioContext = undefined;
globalThis.webkitAudioContext = undefined;
globalThis.Image = class { set src(_) {} get width() { return 64; } get height() { return 64; } };
globalThis.document = {
  createElement: (tag) => {
    if (tag === 'canvas') {
      return {
        width: 64, height: 64, style: {},
        getContext: () => makeMockCtx(),
        toDataURL: () => 'data:image/png;base64,AA==',
      };
    }
    return {
      style: {}, classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
      appendChild() {}, append() {}, addEventListener() {}, removeAttribute() {},
      querySelectorAll: () => [], querySelector: () => null,
    };
  },
  querySelector: () => null,
  querySelectorAll: () => [],
  documentElement: { style: { setProperty() {} } },
  body: { className: '', classList: { contains: () => false } },
};

const { CLASSES } = await import('../../src/data/classes.js');
const CLASS_IDS = Object.keys(CLASSES);
const VALID_ELEMENTS = ['phys', 'fire', 'cold', 'light', 'poison', 'arcane', 'shadow', 'holy'];
const { ULTIMATES, getUltimate, SMITE_KILLS, smiteReady, smiteArmed, smiteKill, toggleSmite, smiteAt } = await import('../../src/game/smite.js');
const { ultimateIcon, ultimateIconURL } = await import('../../src/ui/icons.js');
const { G } = await import('../../src/state.js');
const { newCharData } = await import('../../src/game/save.js');
const { Player } = await import('../../src/game/player.js');
const { Creature } = await import('../../src/game/creature.js');
const { UI } = await import('../../src/ui/ui.js');

UI.log = () => {};
UI.centerMsg = () => {};

// 1. Metadata & attribute parity across all 17 classes
const seenIds = new Set();
const seenTitles = new Set();
assert.equal(CLASS_IDS.length, 17, 'Expected 17 classes');

for (const cls of CLASS_IDS) {
  const ult = ULTIMATES[cls];
  assert.ok(ult, `Missing ULTIMATES entry for ${cls}`);
  assert.ok(!seenIds.has(ult.id), `Duplicate ultimate id ${ult.id}`);
  assert.ok(!seenTitles.has(ult.title), `Duplicate ultimate title ${ult.title}`);
  seenIds.add(ult.id);
  seenTitles.add(ult.title);
  assert.equal(ult.stat, CLASSES[cls].primary, `${cls} ultimate stat (${ult.stat}) must match class primary (${CLASSES[cls].primary})`);
  assert.ok(VALID_ELEMENTS.includes(ult.el), `${cls} ultimate invalid element: ${ult.el}`);
  assert.ok(ult.r >= 4.0 && ult.r <= 5.5, `${cls} ultimate radius out of expected range: ${ult.r}`);
  assert.ok(ult.name && ult.desc && ult.color && ult.haloColor, `${cls} ultimate missing display fields`);
  assert.equal(getUltimate(cls), ult);

  // 2. Procedural icon rendering & caching
  const cv = ultimateIcon(cls, 64);
  assert.ok(cv, `ultimateIcon failed for ${cls}`);
  const url = ultimateIconURL(cls, 64);
  assert.ok(url.startsWith('data:image/'), `ultimateIconURL failed for ${cls}`);
}

// 3. Meter charging, arming, execution, VFX draw & delayed damage across all 17 classes
const realSetTimeout = globalThis.setTimeout;
let pendingTimers = [];
globalThis.setTimeout = (fn) => { pendingTimers.push(fn); return pendingTimers.length; };

try {
  const mockCtx = makeMockCtx();
  for (const cls of CLASS_IDS) {
    G.effects = [];
    G.particles = [];
    G.decals = [];
    G.texts = [];
    G.smiteArmed = false;

    const c = newCharData(cls, 'Hero');
    c.level = 30;
    G.char = c;

    const w = {
      kind: 'dungeon',
      depth: 30,
      creatures: [],
      drops: [],
      orbs: [],
      add(e) { this.creatures.push(e); },
      addLoot(item) { this.drops.push(item); },
      hostiles: () => w.creatures.filter((m) => m.team === 'enemy' && !m.dead),
      map: { walkable: () => true, randomNear: (x, y) => [x, y] },
    };
    const dummyEnemy = Object.assign(new Creature(10, 10), {
      team: 'enemy', rank: 'normal', maxHp: 500, hp: 500, xp: 10, world: w,
    });
    const bossEnemy = Object.assign(new Creature(10.5, 10.5), {
      team: 'enemy', rank: 'boss', maxHp: 50000, hp: 50000, xp: 100, world: w,
    });
    w.creatures.push(dummyEnemy, bossEnemy);
    G.world = w;
    const p = new Player(c, 9, 9);
    p.world = w;
    p.recompute();
    G.player = p;

    // Charge meter via kills
    assert.equal(smiteReady(), false);
    for (let i = 0; i < SMITE_KILLS; i++) smiteKill({ team: 'enemy', rank: 'normal' });
    assert.equal(c.smite, 1, `${cls} meter should reach 1 after ${SMITE_KILLS} normal kills`);
    assert.equal(smiteReady(), true);

    // Arm & fire
    assert.equal(toggleSmite(true), true);
    assert.equal(smiteArmed(), true);

    pendingTimers = [];
    assert.equal(smiteAt(10, 10), true);
    assert.equal(c.smite, 0, `${cls} meter spent`);
    assert.equal(c.smites, 1, `${cls} smite count incremented`);
    assert.equal(smiteArmed(), false);

    // Phase 1 bespoke VFX should update and draw cleanly
    for (const fx of G.effects) {
      fx.update(0.1);
      fx.draw(mockCtx);
    }

    // Trigger Phase 2 impact & damage
    assert.equal(pendingTimers.length, 1, `${cls} should schedule phase 2 detonation`);
    pendingTimers[0]();

    // Phase 2 VFX should also draw cleanly
    for (const fx of G.effects) {
      fx.update(0.1);
      fx.draw(mockCtx);
    }

    assert.ok(dummyEnemy.hp <= 0 || dummyEnemy.dead, `${cls} ultimate should obliterate normal enemy (hp=${dummyEnemy.hp})`);
    assert.ok(bossEnemy.hp < bossEnemy.maxHp, `${cls} ultimate should chunk boss enemy`);
    assert.equal(c.smite, 0, `${cls} ultimate kills must not feed its own meter`);
  }
} finally {
  globalThis.setTimeout = realSetTimeout;
}

console.log('ALL 17 CLASS ULTIMATES, BESPOKE VFX, AND ICONS PASSED!');
