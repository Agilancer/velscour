// Headless verification suite for PR #6: Dark Wood rework, breakable dungeon clutter,
// cutscene paperdoll portrait & movement freeze, and gothic LoadingScreen.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(new URL('../../', import.meta.url).pathname);

// Minimal DOM/Canvas/Fetch/Image mocks for headless Node execution
function makeMockCtx() {
  const grad = { addColorStop() {} };
  return {
    imageSmoothingEnabled: false,
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    fillStyle: '#000',
    strokeStyle: '#000',
    lineWidth: 1,
    lineCap: 'round',
    font: '12px serif',
    textAlign: 'left',
    textBaseline: 'alphabetic',
    save() {},
    restore() {},
    translate() {},
    rotate() {},
    scale() {},
    transform() {},
    setTransform() {},
    beginPath() {},
    closePath() {},
    moveTo() {},
    lineTo() {},
    quadraticCurveTo() {},
    arc() {},
    ellipse() {},
    rect() {},
    roundRect() {},
    clip() {},
    fill() {},
    stroke() {},
    fillRect() {},
    strokeRect() {},
    clearRect() {},
    fillText() {},
    strokeText() {},
    measureText(s) { return { width: String(s).length * 7 }; },
    drawImage() {},
    createLinearGradient() { return grad; },
    createRadialGradient() { return grad; },
    getImageData(_x, _y, w, h) { return { data: new Uint8ClampedArray(w * h * 4) }; },
    putImageData() {},
  };
}

class MockHTMLCanvasElement {}
globalThis.HTMLCanvasElement = MockHTMLCanvasElement;

function makeMockEl(id = '', tag = 'div') {
  const classes = new Set();
  const base = tag === 'canvas' ? new MockHTMLCanvasElement() : {};
  return Object.assign(base, {
    id,
    width: 64,
    height: 64,
    textContent: '',
    innerHTML: '',
    style: {},
    children: [],
    classList: {
      add(...cs) { for (const c of cs) classes.add(c); },
      remove(...cs) { for (const c of cs) classes.delete(c); },
      contains(c) { return classes.has(c); },
      toggle(c, f) { const on = f === undefined ? !classes.has(c) : !!f; if (on) classes.add(c); else classes.delete(c); return on; },
    },
    getContext() { return makeMockCtx(); },
    getBoundingClientRect() { return { left: 0, top: 0, right: 64, bottom: 64, width: 64, height: 64 }; },
    appendChild(ch) { this.children.push(ch); return ch; },
    prepend(ch) { this.children.unshift(ch); return ch; },
    remove() {},
    addEventListener() {},
    removeEventListener() {},
    querySelector() { return null; },
  });
}

const domById = new Map([
  ['loading', makeMockEl('loading')],
  ['loading-title', makeMockEl('loading-title')],
  ['loading-sub', makeMockEl('loading-sub')],
  ['loading-bar', makeMockEl('loading-bar')],
  ['loading-fill', makeMockEl('loading-fill')],
  ['loading-percent', makeMockEl('loading-percent')],
  ['loading-text', makeMockEl('loading-text')],
  ['loading-tip-text', makeMockEl('loading-tip-text')],
  ['loading-eye', Object.assign(makeMockEl('loading-eye'), { width: 36, height: 24 })],
]);

globalThis.window = {
  innerWidth: 1280,
  innerHeight: 720,
  devicePixelRatio: 1,
  VELSCOUR_TEST_MENU: true,
  matchMedia: () => ({ matches: false }),
  addEventListener() {},
  removeEventListener() {},
};
globalThis.document = {
  readyState: 'complete',
  hidden: false,
  body: makeMockEl('body'),
  createElement(tag) { return makeMockEl(tag, tag); },
  getElementById(id) { return domById.get(id) || null; },
  querySelector(sel) { return sel.startsWith('#') ? domById.get(sel.slice(1)) || null : null; },
  addEventListener() {},
};
globalThis.localStorage = {
  _m: new Map(),
  getItem(k) { return this._m.has(k) ? this._m.get(k) : null; },
  setItem(k, v) { this._m.set(k, String(v)); },
  removeItem(k) { this._m.delete(k); },
};
globalThis.requestAnimationFrame = () => 1;
globalThis.cancelAnimationFrame = () => {};
globalThis.Image = class MockImage {
  constructor() { this.width = 2048; this.height = 2048; this.naturalWidth = 2048; this.naturalHeight = 2048; this.complete = true; }
  set src(v) { this._src = v; queueMicrotask(() => this.onload && this.onload()); }
  get src() { return this._src; }
};
globalThis.fetch = async (url) => {
  const clean = String(url).replace(/^\//, '').split('?')[0];
  const buf = readFileSync(resolve(ROOT, clean));
  return {
    ok: true,
    json: async () => JSON.parse(buf.toString('utf8')),
    text: async () => buf.toString('utf8'),
    arrayBuffer: async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
  };
};

const { G } = await import('../../src/state.js');
const { BIOME_BY_ID } = await import('../../src/data/biomes.js');
const { loadBiomeArt, biomeTileSet } = await import('../../src/core/assets.js');
const { loadDarkForestTrees } = await import('../../src/gfx/darkforest.js');
const { generateDarkForest } = await import('../../src/world/darkforest.js');
const { generateDungeon } = await import('../../src/world/dungeon.js');
const { World } = await import('../../src/game/world.js');
const { Clutter } = await import('../../src/game/clutter.js');
const { hit } = await import('../../src/game/combat.js');
const { Player } = await import('../../src/game/player.js');
const { newCharData } = await import('../../src/game/save.js');
const { Cine, drawCine, getHeroCutscenePortrait, drawHeroCutscenePortrait } = await import('../../src/game/cinema.js');
const { Auto } = await import('../../src/game/autoplay.js');
const { LoadingScreen, LORE_TIPS } = await import('../../src/ui/loading.js');

G.ctx = makeMockCtx();
G.W = 1280;
G.H = 720;
G.dpr = 1;

// 1. Dark Wood biome generation (reachability, widened high-contrast trails, zero Clutter on trees)
{
  const dfBiome = BIOME_BY_ID.dark_forest;
  await Promise.all([loadBiomeArt(dfBiome), loadDarkForestTrees()]);
  const dfTs = biomeTileSet(dfBiome);
  assert.equal(dfTs.pack, 'dark_forest');

  for (const seed of [7720, 15437, 23154]) {
    const g = generateDarkForest(7, dfBiome, dfTs, seed);
    assert.equal(g.map.darkForest, true, 'Dark Wood map must set map.darkForest = true');
    assert.ok(g.trees.length > 8000, `Dark Wood should place dense forest trees (got ${g.trees.length})`);
    const onPath = g.trees.filter((p) => !p.elder && g.map.walkable(p.x, p.y)).length;
    assert.equal(onPath, 0, 'No Dark Wood non-elder tree may sit on a walkable trail tile');

    // Flood-fill reachability from start to exit, Heart, all glades, and chests
    const m = g.map, I = (x, y) => y * m.w + x, seen = new Uint8Array(m.w * m.h);
    const q = [I(Math.floor(g.start[0]), Math.floor(g.start[1]))];
    seen[q[0]] = 1;
    for (let h = 0; h < q.length; h++) {
      const i = q[h], x = i % m.w, y = (i / m.w) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const j = I(x + dx, y + dy);
        if (m.walkableTile(x + dx, y + dy) && !seen[j]) { seen[j] = 1; q.push(j); }
      }
    }
    const must = [g.exit, g.heart.shrine, ...g.glades.map((v) => v.shrine), ...g.chests.map((c) => [c.x, c.y])];
    const unreachable = must.filter(([x, y]) => !seen[I(Math.floor(x), Math.floor(y))]);
    assert.equal(unreachable.length, 0, `Seed ${seed}: all Dark Wood objectives must remain reachable`);

    const dfWorld = new World('dungeon', {
      map: g.map,
      tileset: dfTs,
      biome: dfBiome,
      depth: 7,
      props: g.props,
    });
    assert.equal(dfWorld.creatures.filter((c) => c.clutter).length, 0, 'Dark Wood trees/props must NEVER spawn Clutter entities');
  }
}

// 2. Standard dungeon Clutter creation, 1-hit shatter, block/clutter map clearing & Autoplay clearing
{
  const catBiome = BIOME_BY_ID.catacombs;
  await loadBiomeArt(catBiome);
  const ts = biomeTileSet(catBiome);
  const gen = generateDungeon(5, catBiome, ts, 424242);

  // Place a deterministic blocking barrel prop adjacent to start for 1-hit shatter & Autoplay tests
  const [sx, sy] = gen.start;
  const bx = Math.floor(sx) + 1, by = Math.floor(sy);
  const idx = by * gen.map.w + bx;
  gen.map.t[idx] = 0;
  gen.map.block[idx] = 1;
  const barrelProp = { x: bx + 0.5, y: by + 0.5, tx: bx, ty: by, img: { width: 32, height: 32 }, kind: 'scatter', name: 'barrel', blocks: true };
  gen.props.push(barrelProp);

  const world = new World('dungeon', {
    map: gen.map,
    tileset: ts,
    biome: catBiome,
    depth: 5,
    props: gen.props,
  });
  G.world = world;

  const clutters = world.creatures.filter((c) => c instanceof Clutter && c.clutter);
  assert.ok(clutters.length >= 1, 'Standard dungeon blocking props should wrap in Clutter entities');
  assert.equal(world.map.clutter[idx], 1, 'world.map.clutter bitmask should mark blocking prop tile');

  const targetClutter = clutters.find((c) => c.prop === barrelProp);
  assert.ok(targetClutter, 'Explicit barrel prop should have a matching Clutter entity');
  assert.equal(targetClutter.noLifeBar, true, 'Clutter must suppress overhead health bars');

  const heroData = newCharData('barbarian', 'Tester');
  G.char = heroData;
  const hero = new Player(heroData);
  hero.x = sx;
  hero.y = sy;
  hero.recompute();
  G.player = hero;
  world.add(hero);

  const blocking = Auto.getBlockingClutter(bx + 0.5, by + 0.5, 1.8);
  assert.equal(blocking === targetClutter, true, 'Auto.getBlockingClutter should detect clutter obstructing a path');

  hit(hero, targetClutter, 25, 'phys', {});
  assert.equal(targetClutter.dead, true, '1 hit should shatter Clutter');
  assert.equal(world.props.includes(barrelProp), false, 'Broken clutter prop should be removed from world.props');
  assert.equal(world.map.block[idx], 0, 'Shattering clutter should clear map.block[idx]');
  assert.equal(world.map.clutter[idx], 0, 'Shattering clutter should clear map.clutter[idx]');
  assert.ok(!world.creatures.includes(targetClutter), 'Broken clutter should be removed from world.creatures');
}

// 3. Cutscene hero portrait & movement freeze
{
  const p = G.player;
  p.moveVec = [1, -1];
  p.moveTarget = { x: p.x + 5, y: p.y + 5 };
  p.path = [[p.x + 2, p.y + 2]];

  Cine.play([
    { line: { name: p.char.name, who: 'hero', text: 'Into the dark.' }, dur: 3.0 },
  ]);
  assert.equal(G.cine, true, 'Cine.play should activate G.cine');
  assert.equal(p.moveTarget, null, 'Cine.play should clear player.moveTarget');
  assert.equal(p.path, null, 'Cine.play should clear player.path');
  assert.deepEqual(p.moveVec, [0, 0], 'Cine.play should zero player.moveVec');

  const xBefore = p.x, yBefore = p.y;
  G.input = { mouseDown: true, worldX: p.x + 6, worldY: p.y + 6, shift: false, keys: new Set(['KeyW']) };
  p.update(0.1);
  assert.equal(p.x, xBefore, 'Player must not move during an active cutscene');
  assert.equal(p.y, yBefore, 'Player must not move during an active cutscene');

  Cine.update(0.4);
  getHeroCutscenePortrait(p.char);
  drawHeroCutscenePortrait(G.ctx, 20, 20, 96, 96, 0.4);
  drawCine(G.ctx, 1280, 720);
  Cine.stop();
  assert.equal(G.cine, false, 'Cine.stop should clear G.cine');
}

// 4. Gothic LoadingScreen single-player branding & pure-SP lore tips
{
  assert.equal(LORE_TIPS.length, 24, 'LoadingScreen should provide 24 lore tips');
  for (const tip of LORE_TIPS) {
    assert.ok(!/online|\/w|\/r|chat|jewel box|ultimate/i.test(tip), `Lore tip leaked multiplayer/cross-PR text: ${tip}`);
  }
  const hpBefore = G.player.hp;
  LoadingScreen.show({ text: 'Descending…', progress: 42 });
  assert.equal(domById.get('loading-title').textContent, 'VELSCOUR', 'Default loading title must be VELSCOUR');
  assert.equal(domById.get('loading-percent').textContent, '42%', 'Loading progress percentage should update');
  assert.equal(domById.get('loading').classList.contains('hidden'), false, 'LoadingScreen.show should unhide #loading');
  assert.equal(G.player.spawned, undefined, 'Single-player LoadingScreen must NOT mutate G.player.spawned');
  assert.equal(G.player.hp, hpBefore, 'Single-player LoadingScreen must NOT mutate G.player');

  await LoadingScreen.hide();
  assert.equal(domById.get('loading').classList.contains('hidden'), true, 'LoadingScreen.hide should add .hidden');
  assert.equal(G.loading, false, 'LoadingScreen.hide should clear G.loading');
}

console.log('PASS: world visuals, Dark Wood trails, breakable clutter, cutscene freeze & LoadingScreen verified.');
process.exit(0);
