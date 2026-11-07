// Regression test suite for PR #7: Storage Expansions, Gem Bag, Jewel Box, Hearthstone,
// Town Portal Floor Picker, Travelling Merchant Malakor, Walkover Scatter & 10-Grade Gem Filter.
import assert from 'node:assert/strict';
import fs from 'node:fs';

// Minimal DOM / localStorage / Canvas stubs for headless Node imports
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(String(k), String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear(),
  key: (i) => [...store.keys()][i] ?? null,
  get length() { return store.size; },
};
globalThis.window = globalThis;
globalThis.CustomEvent = class CustomEvent { constructor(type, detail) { this.type = type; this.detail = detail; } };
globalThis.dispatchEvent = () => true;
globalThis.addEventListener = () => {};
globalThis.requestAnimationFrame = () => 0;
globalThis.performance = globalThis.performance || { now: () => Date.now() };

function mockEl(tag = 'div') {
  const children = [];
  const classSet = new Set();
  const node = {
    tagName: tag.toUpperCase(),
    style: { setProperty() {}, removeProperty() {} },
    dataset: {},
    children,
    isConnected: true,
    innerHTML: '',
    textContent: '',
    value: '',
    classList: {
      add: (...cs) => cs.forEach((c) => c && classSet.add(c)),
      remove: (...cs) => cs.forEach((c) => classSet.delete(c)),
      toggle: (c, on) => (on === undefined ? (classSet.has(c) ? (classSet.delete(c), false) : (classSet.add(c), true)) : (on ? classSet.add(c) : classSet.delete(c), !!on)),
      contains: (c) => classSet.has(c),
    },
    appendChild(ch) { children.push(ch); return ch; },
    append(...chs) { children.push(...chs); },
    remove() { node.isConnected = false; },
    addEventListener() {},
    removeEventListener() {},
    querySelector: () => mockEl(),
    querySelectorAll: () => [],
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100, right: 100, bottom: 100 }),
    getContext: () => ({
      canvas: { width: 64, height: 64 },
      save() {}, restore() {}, clearRect() {}, fillRect() {}, strokeRect() {}, clip() {},
      beginPath() {}, closePath() {}, moveTo() {}, lineTo() {}, arc() {}, ellipse() {}, rect() {},
      quadraticCurveTo() {}, bezierCurveTo() {}, fill() {}, stroke() {},
      drawImage() {}, translate() {}, scale() {}, rotate() {}, setTransform() {},
      getImageData: (_x, _y, w, h) => ({ data: new Uint8ClampedArray((w || 1) * (h || 1) * 4), width: w || 1, height: h || 1 }),
      putImageData() {},
      createImageData: (w, h) => ({ data: new Uint8ClampedArray((w || 1) * (h || 1) * 4), width: w || 1, height: h || 1 }),
      createLinearGradient: () => ({ addColorStop() {} }),
      createRadialGradient: () => ({ addColorStop() {} }),
      measureText: () => ({ width: 10 }),
      fillText() {}, strokeText() {},
    }),
  };
  return node;
}

const elById = new Map();
globalThis.document = {
  body: mockEl('body'),
  documentElement: mockEl('html'),
  createElement: (tag) => mockEl(tag),
  getElementById: (id) => {
    if (!elById.has(id)) elById.set(id, mockEl('div'));
    return elById.get(id);
  },
  querySelector: () => null,
  querySelectorAll: () => [],
  addEventListener: () => {},
};
globalThis.Image = class Image {
  set src(_v) { if (this.onload) setTimeout(() => this.onload(), 0); }
};

const { G } = await import('../../src/state.js');
const { A } = await import('../../src/core/assets.js');
A.town = {
  ground: mockEl('canvas'),
  objects: mockEl('canvas'),
  meta: JSON.parse(fs.readFileSync(new URL('../../assets/tiles/town/town.json', import.meta.url), 'utf8')),
};
const { newCharData, writeSave, listSaves, migrate } = await import('../../src/game/save.js');
const { makeGem, rollItem, GEM_TIERS } = await import('../../src/data/items.js');
const { Player, addToBag } = await import('../../src/game/player.js');
const { addToJewelBox, sortJewelBox } = await import('../../src/ui/jewelbox.js');
const { socketGem } = await import('../../src/ui/inventory.js');
const { Vendor, fuseAll, fuseGem } = await import('../../src/ui/vendor.js');
const {
  GEM_BAG_COLS, GEM_BAG_BASE_ROWS, buyGemBagRow,
  buyStashRow, buyJewelBoxRow, buyReliquaryRow,
} = await import('../../src/data/bag.js');
const { grantMarks, marksFree, deductMarks } = await import('../../src/game/marks.js');
const { reliquary } = await import('../../src/game/reliquary.js');
const { generateTown, VENDORS } = await import('../../src/world/town.js');
const { walkOverProp } = await import('../../src/data/walkover.js');
const { filterPasses } = await import('../../src/game/lootfilter.js');
const {
  HEARTH_FILL, hearthOf, hearthReady, hearthChanneling, hearthPortalActive,
  hearthTick, useHearth, returnFromHearth, closeHearthPortals,
} = await import('../../src/game/hearth.js');
const { game } = await import('../../src/game/game.js');
const { UI } = await import('../../src/ui/ui.js');
const { HUD } = await import('../../src/ui/hud.js');

UI.log = () => {};
UI.refresh = () => {};
UI.centerMsg = () => {};
HUD.setArea = () => {};
G.ui = UI;
G.game = game;

// 1. Save migration, lowercase keys, Gem Bag (30) + Jewel Box (300) + Hearthstone (1)
{
  store.clear();
  const c = newCharData('paladin', 'Sir Test');
  assert.equal(c.gemBag.length, GEM_BAG_COLS * GEM_BAG_BASE_ROWS, 'new hero starts with 30-slot gemBag');
  assert.equal(c.jewelBox.length, 300, 'new hero starts with 300-slot jewelBox');
  assert.equal(c.stash.length, 300, 'new hero starts with 300-slot stash');
  assert.equal(c.hearth, 1, 'new hero starts with full Hearthstone');

  writeSave(c);
  assert.ok(store.has('velscour_saves_v1'), 'saves use lowercase velscour_saves_v1 key');

  // Legacy hero with 35 distinct gem stacks in c.bag and no gemBag/jewelBox:
  // first 30 migrate to gemBag, remaining 5 overflow cleanly to jewelBox!
  const legacy = newCharData('wizard', 'Legacy');
  delete legacy.gemBag;
  delete legacy.jewelBox;
  delete legacy.hearth;
  legacy.bag = Array(60).fill(null);
  const gemKinds = ['ruby', 'sapphire', 'topaz', 'emerald', 'amethyst', 'diamond', 'skull'];
  for (let i = 0; i < 35; i++) {
    legacy.bag[i] = makeGem(gemKinds[i % gemKinds.length], Math.floor(i / gemKinds.length));
  }
  const sword = rollItem(10, 'weapon', 2);
  legacy.bag[40] = sword;
  localStorage.setItem('velscour_saves_v1', JSON.stringify([legacy]));

  const loaded = migrate(listSaves()[0]);
  assert.equal(loaded.hearth, 1, 'migrated hero receives hearth = 1');
  assert.equal(loaded.gemBag.filter(Boolean).length, 30, 'first 30 legacy gem stacks migrate into gemBag');
  assert.equal(loaded.jewelBox.filter(Boolean).length, 5, 'overflow legacy gems migrate into jewelBox');
  assert.equal(loaded.bag.filter((x) => x && x.type === 'gem').length, 0, 'no gems left stranded in gear bag');
  assert.ok(loaded.bag.some((x) => x && x.uid === sword.uid), 'gear remains intact in c.bag');
}

// 2. Gem routing in addToBag, Jewel Box stacking/sorting, and socketing from gemBag
{
  const c = newCharData('paladin', 'Gemmer');
  G.char = c;
  G.player = new Player(c);

  const g1 = makeGem('ruby', 2);
  const g2 = makeGem('ruby', 2);
  assert.ok(addToBag(c, g1), 'ruby added');
  assert.ok(addToBag(c, g2), 'second identical ruby stacks');
  assert.equal(c.bag.filter(Boolean).length, 0, 'gems never land in c.bag');
  assert.equal(c.gemBag[0].gem, 'ruby');
  assert.equal(c.gemBag[0].count, 2, 'identical gems stack in c.gemBag');

  const helm = rollItem(10, 'head', 2);
  helm.sockets = 1;
  helm.gems = [];
  c.equip.head = helm;
  socketGem(0, { where: 'equip', slot: 'head' }, 'gemBag');
  assert.equal(helm.gems.length, 1, 'socketGem sockets directly from gemBag');
  assert.equal(c.gemBag[0].count, 1, 'gemBag stack decrements by 1 on socket');

  assert.equal(addToJewelBox(c, helm), false, 'Jewel Box rejects non-gem gear');
  assert.equal(addToJewelBox(c, makeGem('emerald', 1)), true);
  assert.equal(addToJewelBox(c, makeGem('sig', 4)), true);
  assert.equal(addToJewelBox(c, makeGem('prism', 0)), true);
  assert.equal(addToJewelBox(c, makeGem('emerald', 5)), true);

  sortJewelBox(c, 'kind');
  assert.equal(c.jewelBox[0].gem, 'sig', 'sort by kind puts Sigils first');
  assert.equal(c.jewelBox[1].gem, 'prism', 'sort by kind puts Prisms second');
  assert.equal(c.jewelBox[2].tier, 5, 'sort by kind orders gems highest tier first');

  sortJewelBox(c, 'grade');
  assert.equal(c.jewelBox[0].tier, 5, 'sort by grade puts highest tier first');
}

// 3. Infernal Marks row expansions & lowercase reliquary key
{
  store.clear();
  const c = newCharData('paladin', 'Expander');
  G.char = c;
  grantMarks(100, 'test');
  const m0 = marksFree();
  assert.equal(m0, 100);

  assert.equal(buyGemBagRow(c), true);
  assert.equal(c.gemBag.length, 40, 'buyGemBagRow adds 10 slots');
  assert.equal(marksFree(), 95, 'buyGemBagRow costs 5 Marks');

  assert.equal(buyStashRow(c), true);
  assert.equal(c.stash.length, 310, 'buyStashRow adds 10 slots');
  assert.equal(marksFree(), 85, 'buyStashRow costs 10 Marks');

  assert.equal(buyJewelBoxRow(c), true);
  assert.equal(c.jewelBox.length, 310, 'buyJewelBoxRow adds 10 slots');
  assert.equal(marksFree(), 80, 'buyJewelBoxRow costs 5 Marks');

  const r = reliquary(); // initialize
  const beforeTab = r.tabs[0].length;
  assert.equal(buyReliquaryRow(0), true);
  assert.equal(r.tabs[0].length, beforeTab + 12, 'buyReliquaryRow adds 12 slots to reliquary tab');
  assert.equal(marksFree(), 70, 'buyReliquaryRow costs 10 Marks');
  assert.ok(store.has('velscour_reliquary_v1'), 'reliquary saves to lowercase velscour_reliquary_v1');

  assert.equal(deductMarks(999), false, 'deductMarks refuses overspending');
}

// 4. 10-Grade Gem Fusion across gemBag & bag
{
  assert.equal(GEM_TIERS.length, 10, '10 gem grades (Chipped..Starlight)');
  const c = newCharData('ranger', 'Fuser');
  c.gold = 1_000_000;
  G.char = c;
  const r0 = makeGem('topaz', 0);
  r0.count = 9;
  addToBag(c, r0);
  assert.equal(fuseGem(c, 0, 'gemBag'), true, 'fuseGem fuses 3 Chipped Topazes in gemBag');
  const fused = fuseAll(c, c.gold, false);
  assert.ok(fused >= 2, 'fuseAll cascades remaining triples in gemBag');
  assert.ok(c.gemBag.some((g) => g && g.gem === 'topaz' && g.tier === 2), '9 tier-0 gems fuse up to a tier-2 gem');
}

// 5. Town Generation: Malakor the Ash-Wanderer & Infernal Marks Sealed Chest shop
{
  store.clear();
  const c = newCharData('necromancer', 'Shopper');
  G.char = c;
  G.player = new Player(c);
  grantMarks(50, 'test');

  assert.ok(VENDORS.some((v) => v.id === 'infernal' && v.travelling), 'Malakor registered in VENDORS');
  const town = generateTown(null, 12345);
  const malakor = town.npcs.find((n) => n.vendor && n.vendor.id === 'infernal');
  assert.ok(malakor, 'Malakor spawns in Herrington Hollow');
  assert.ok(town.map.walkable(Math.floor(malakor.x), Math.floor(malakor.y)) || town.map.randomNear(malakor.x, malakor.y, 1.8), 'Malakor stands adjacent to walkable plaza tiles');

  const beforeMarks = marksFree();
  assert.equal(Vendor.buySealedChest({ id: 'ashen', name: 'Ashen Coffer', cost: 2, rollRarity: () => 3 }), true, 'Malakor sells Sealed Epic Chest for Marks');
  assert.ok(marksFree() < beforeMarks, 'Marks deducted on Sealed Chest purchase');
  assert.ok(c.bag.some((it) => it && it.sealed), 'Sealed chest placed in hero bag');
}

// 6. Hearthstone channel, movement interruption, two-way portal, refill & return
{
  closeHearthPortals();
  const c = newCharData('ranger', 'Wayfarer');
  c.depth = 17;
  G.char = c;
  const p = new Player(c);
  p.x = 12.5; p.y = 14.5;
  G.player = p;

  const walkMap = {
    walkable: () => true,
    randomNear: (x, y) => [x + 1, y],
  };
  const dungeonWorld = { kind: 'dungeon', depth: 17, biome: { id: 'catacombs', name: 'Catacombs' }, map: walkMap, portals: [], creatures: [p] };
  const townWorld = { kind: 'town', map: walkMap, portals: [{ x: 5, y: 5, type: 'dungeon' }], creatures: [] };
  G.world = dungeonWorld;

  let enteredTown = 0, setWorldCalls = 0;
  const origEnterTown = game.enterTown;
  const origSetWorld = game.setWorld;
  game.enterTown = () => { enteredTown++; G.world = townWorld; p.x = 20; p.y = 20; };
  game.setWorld = (w, arrive) => { setWorldCalls++; G.world = w; [p.x, p.y] = arrive; };

  try {
    assert.equal(hearthReady(), true, 'Hearthstone ready at full charge in dungeon');
    assert.equal(useHearth(), true, 'useHearth starts 1.6s channel');
    assert.equal(hearthChanneling(), true);

    // Move slightly -> cancels channel without consuming charge!
    p.x += 0.5;
    hearthTick(0.2);
    assert.equal(hearthChanneling(), false, 'movement cancels Hearthstone channel');
    assert.equal(hearthOf(c), 1, 'cancelled channel preserves full Hearthstone charge');

    // Re-cast and hold still for 1.6s -> teleports to town and opens both portals!
    assert.equal(useHearth(), true);
    hearthTick(1.7);
    assert.equal(enteredTown, 1, 'completed channel carries hero to town');
    assert.equal(hearthOf(c), 0, 'completed teleport consumes Hearthstone charge');
    assert.equal(hearthPortalActive(), true, 'two-way Hearthstone portals active');
    assert.equal(dungeonWorld.portals.some((q) => q.hearth), true, 'departure portal placed in dungeon');
    assert.equal(townWorld.portals.some((q) => q.hearth), true, 'return portal placed in town');

    // Step back through town Hearthstone portal -> returns to exact spot and closes both portals!
    returnFromHearth();
    assert.equal(setWorldCalls, 1, 'returnFromHearth restores cached dungeon world');
    assert.equal(G.world, dungeonWorld);
    assert.equal(p.x, 13.0);
    assert.equal(p.y, 14.5);
    assert.equal(hearthPortalActive(), false, 'returning closes Hearthstone portals');
    assert.equal(dungeonWorld.portals.some((q) => q.hearth), false);
    assert.equal(townWorld.portals.some((q) => q.hearth), false);

    // Refills over HEARTH_FILL seconds in dungeon
    hearthTick(HEARTH_FILL / 2);
    assert.ok(Math.abs(hearthOf(c) - 0.5) < 1e-6, 'Hearthstone refills proportionally in dungeon');
    hearthTick(HEARTH_FILL / 2 + 1);
    assert.equal(hearthOf(c), 1, 'Hearthstone reaches full charge after 10 minutes');
  } finally {
    game.enterTown = origEnterTown;
    game.setWorld = origSetWorld;
    closeHearthPortals();
  }
}

// 7. Town Portal Floor Picker & Endless Torment (> 500) support
{
  const c = newCharData('barbarian', 'Delver');
  assert.equal(game.maxPortalFloor(c), 1, 'fresh hero max portal floor is 1');
  c.deepest = 42;
  c.depth = 38;
  assert.equal(game.maxPortalFloor(c), 43, 'hero who cleared 42 can open up to floor 43');
  c.deepest = 500;
  c.depth = 500;
  assert.equal(game.maxPortalFloor(c), 501, 'hero who beat Depth 500 can open Endless Torment Depth 501');
  c.deepest = 515;
  assert.equal(game.maxPortalFloor(c), 516, 'Endless Torment progression preserved past 500');
}

// 8. Walkover ground scatter & 10-grade gem loot filter
{
  assert.equal(walkOverProp('skull_waymarker_pile'), true, 'skull pile scatter is walkable');
  assert.equal(walkOverProp('gothic_rubble_2'), true, 'numbered gothic rubble is walkable');
  assert.equal(walkOverProp('dead_shrub'), true, 'low dead shrub is walkable');
  assert.equal(walkOverProp('barrel_closed'), false, 'barrels stay solid');
  assert.equal(walkOverProp('bookshelf_tall'), false, 'bookshelves stay solid');

  G.settings.lootFilter = { on: true, weapon: 0, offhand: 0, armor: 0, ring: 0, gems: 7, upgrades: true, keep: false };
  assert.equal(filterPasses(makeGem('ruby', 6)), false, 'grade 6 gem hidden when gems threshold is 7 (Royal)');
  assert.equal(filterPasses(makeGem('ruby', 7)), true, 'grade 7 (Royal) gem passes');
  assert.equal(filterPasses(makeGem('ruby', 9)), true, 'grade 9 (Starlight) gem passes');
  assert.equal(filterPasses(makeGem('sig', 0)), true, 'Sigil stones pass whenever gem pickup is enabled');
  G.settings.lootFilter = { on: false };
}

console.log('test_storage_and_town_qol.mjs: ALL CHECKS PASSED');
