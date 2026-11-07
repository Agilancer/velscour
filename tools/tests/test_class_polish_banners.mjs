// Headless Node integration test for PR #5: Lancer War Banner Studio, Acoustic Lute Sampler, Sheet QoL & DK Town Rest.
// Run: node tools/tests/test_class_polish_banners.mjs
import assert from 'node:assert/strict';

const memStore = new Map();
globalThis.localStorage = {
  getItem: (k) => (memStore.has(k) ? memStore.get(k) : null),
  setItem: (k, v) => memStore.set(k, String(v)),
  removeItem: (k) => memStore.delete(k),
  key: (i) => [...memStore.keys()][i] ?? null,
  get length() { return memStore.size; },
};

const makeMockCtx = () => {
  let ops = 0;
  return new Proxy({
    get _ops() { return ops; },
  }, {
    get: (target, prop) => {
      if (prop in target) return target[prop];
      if (prop === 'measureText') return () => ({ width: 12 });
      if (prop === 'getTransform') return () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 });
      if (prop === 'getImageData') return (_x, _y, w, h) => ({ data: new Uint8ClampedArray((w || 1) * (h || 1) * 4) });
      if (prop === 'createLinearGradient' || prop === 'createRadialGradient') return () => ({ addColorStop() {} });
      return (..._args) => { ops++; };
    },
    set: () => true,
  });
};

const makeFakeEl = () => {
  const ctx = makeMockCtx();
  return {
    width: 64,
    height: 64,
    style: {},
    dataset: {},
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    getContext: () => ctx,
    toDataURL: () => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    appendChild() {},
    append() {},
    remove() {},
    addEventListener() {},
    setAttribute() {},
    querySelector: () => null,
    querySelectorAll: () => [],
  };
};

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
  constructor() { this.width = 48; this.height = 96; this.naturalWidth = 48; this.naturalHeight = 96; this.complete = true; }
  decode() { return Promise.resolve(); }
};

console.log('1. Validating Heraldic War Banner Generator (bannergen.js)...');
const {
  BANNER_SHAPES, BANNER_COLORS, BANNER_PATTERNS, PATTERN_COLORS,
  BANNER_EMBLEMS, EMBLEM_COLORS, DEFAULT_BANNER,
  createBannerCanvas, getBannerSkin, getBannerRoll,
} = await import('../../src/gfx/bannergen.js');

assert.equal(Object.keys(BANNER_SHAPES).length, 4);
assert.equal(Object.keys(BANNER_COLORS).length, 8);
assert.equal(Object.keys(BANNER_PATTERNS).length, 7);
assert.equal(Object.keys(PATTERN_COLORS).length, 6);
assert.equal(Object.keys(BANNER_EMBLEMS).length, 8);
assert.equal(Object.keys(EMBLEM_COLORS).length, 5);

for (const shape of Object.keys(BANNER_SHAPES)) {
  for (const emblem of [...Object.keys(BANNER_EMBLEMS), 'dragon', 'lion']) {
    const c = createBannerCanvas({
      shape,
      color: 'crimson',
      pattern: 'cross',
      patternColor: 'gold',
      emblem,
      emblemColor: 'silver',
    });
    assert.equal(c.width, 48);
    assert.equal(c.height, 96);
    assert(c.getContext('2d')._ops > 10, `Expected canvas draw ops for ${shape}/${emblem}`);
  }
}
const s1 = getBannerSkin(DEFAULT_BANNER);
const s2 = getBannerSkin({ ...DEFAULT_BANNER });
assert.equal(s1, s2, 'getBannerSkin caches identical banner configurations');
assert.equal(getBannerRoll({ color: 'crimson' }), BANNER_COLORS.crimson.dark);

console.log('2. Validating Lancer Banner Kit item, icon, tooltip & 3D cloth skin integration...');
const { BANNER_KIT_PRICE, bannerKitItem, itemName, itemColor, itemValue, sheetItem } = await import('../../src/data/items.js');
const { bannerKitIcon, itemIcon } = await import('../../src/game/loot.js');
const { itemIconURL } = await import('../../src/ui/icons.js');
const { itemTooltip } = await import('../../src/ui/itemui.js');
const { stepBanner, drawBanner } = await import('../../src/gfx/lancerbanner.js');

const kit = bannerKitItem();
assert.equal(kit.type, 'banner_kit');
assert.equal(itemName(kit), "Lancer's Banner Kit");
assert.equal(itemColor(kit), '#ffd860');
assert.equal(itemValue(kit), BANNER_KIT_PRICE);
assert.equal(BANNER_KIT_PRICE, 75);
assert.equal(bannerKitIcon(48), itemIcon(kit, 48));
assert(itemIconURL(kit).startsWith('data:image/png;base64,'));
assert(itemTooltip(kit).includes('Banner Customization Kit'));

const mockLancer = {
  x: 10, y: 10, z: 0, scale: 1, spriteH: 60, world: { kind: 'dungeon' },
  char: { banner: { shape: 'swallowtail', color: 'crimson', pattern: 'chevron', patternColor: 'gold', emblem: 'deathguard', emblemColor: 'bone' } },
};
const bannerState = {};
stepBanner(mockLancer, bannerState, 1 / 60, 0.5, false);
assert(bannerState.cloth, 'Verlet cloth initialized');
const drawCtx = makeMockCtx();
assert.equal(drawBanner(drawCtx, mockLancer, bannerState), true);
assert(drawCtx._ops > 20, 'drawBanner rendered custom skin triangles and rolled edge');

console.log('3. Validating Acoustic Lute Sampler & Music Sheet Tablature...');
const { INSTRUMENTS, loadInstruments, instReady, setNoteTap, playSequence } = await import('../../src/core/sampler.js');
const { readSheet } = await import('../../src/data/tabs.js');
const { STARTER } = await import('../../src/ui/sheets.js');

assert(INSTRUMENTS.lute && INSTRUMENTS.harpsichord);
assert.equal(await loadInstruments(), 61);
assert.equal(instReady(), true);
const tapped = [];
setNoteTap((ev) => tapped.push(ev));
playSequence([{ midi: 60, beat: 0, beats: 1 }, { midi: 64, beat: 1, beats: 1 }], { bpm: 120 });
setNoteTap(null);
assert.equal(tapped.length, 2);
assert.equal(tapped[0].name, 'lute');

const parsedStarter = readSheet(STARTER);
assert(parsedStarter.ev && parsedStarter.ev.length > 20, 'Starter Ode to Joy tablature parses cleanly');
const draftSheet = sheetItem();
draftSheet.text = STARTER;
assert(itemTooltip(draftSheet).includes('Lock & Equip'));

console.log('4. Validating Death Knight Runeblade Town Rest behavior...');
const dkSig = (await import('../../src/game/sigs/deathknight.js')).default;
const dkState = dkSig.init();
dkState.idle = 0;
dkState.rest = 0;
const mockDk = {
  x: 5, y: 5, z: 0, level: 25, classId: 'death_knight',
  world: { kind: 'town', hostiles: () => [] },
};
dkSig.update(mockDk, dkState, 0.1);
assert.equal(dkState.rest, 1, 'Death Knight Runeblade stays sheathed on back in town');
assert.equal(dkState.idle, 99);

console.log('\nALL PR #5 CLASS POLISH & WAR BANNER STUDIO TESTS PASSED!');
