// The Altar of Heresy's look in Herrington Hollow (gfx/heresyaltar.js, docs/ENDGAME.md): the Blender-baked altar in
// its three states (sealed before the Endgame, awake once it opens, ablaze while Heresies are on), a few town seeds,
// the hero in front of and behind it, the 3 x 3 under its dais blocked, the hero still reaches it and its 'use' opens the
// panel, and a look at it in first person.
//   node tools/tests/heresy_altar.js [seeds]      (default 1,2,3)
// Shots: tools/tests/out/heresy_altar_*.png (each state at the game's zoom and close, the town round it, behind it).
const { openGame, report } = require('./harness');
const seeds = (process.argv[2] || '1,2,3').split(',').map(Number);
let fails = 0;
const check = (ok, msg) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${msg}`); if (!ok) fails++; };

(async () => {
  const { browser, page, errors, shot } = await openGame({ width: 1280, height: 720 });
  await page.evaluate(async () => { await window.VELSCOUR.game.newChar('paladin', 'Heretic'); });
  await page.waitForTimeout(1200);
  await page.evaluate(() => {
    const { G, game } = window.VELSCOUR;
    window.AL = {
      step(secs) { for (let i = 0; i < secs * 30; i++) { G.dt = 1 / 30; G.time += G.dt; G.frame++; game.update(1 / 30); } game.render && game.render(); },
      // the hero beside the altar (dx, dy tiles off it), the camera on the altar
      stand(dx, dy) { const a = G.world.npcs.find((n) => n.altar), p = G.player; p.x = a.x + dx; p.y = a.y + dy; p.path = null; p.moveTarget = null; return a; },
    };
  });
  // a crop round the altar (at the game's own zoom, then at twice it for the detail)
  const crop = async (name) => {
    for (const [z, w, h, tag] of [[1, 420, 360, ''], [2.2, 560, 600, '_close']]) {
      const [sx, sy] = await page.evaluate(async (z) => { const { camera } = await import('/src/core/view.js'); const { G } = window.VELSCOUR; G.settings.zoom = z; camera.computeZoom(); const a = G.world.npcs.find((n) => n.altar); camera.follow(a.x, a.y, 0, true); await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); return camera.tileToScreen(a.x, a.y, 55); }, z);
      await page.screenshot({ path: require('path').join(__dirname, 'out', name + tag + '.png'), clip: { x: Math.max(0, sx - w / 2), y: Math.max(0, sy - h / 2), width: Math.min(w, 1280), height: Math.min(h, 720) } });
    }
    await page.evaluate(async () => { const { camera } = await import('/src/core/view.js'); window.VELSCOUR.G.settings.zoom = 1; camera.computeZoom(); });
  };
  const look = () => page.evaluate(() => { const a = window.VELSCOUR.G.world.npcs.find((n) => n.altar); return { lvl: +(a._lvl ?? -1).toFixed(2), sbox: !!a.sbox }; });
  for (const seed of seeds) {
    const t = await page.evaluate(async (seed) => {
      const { G, game } = window.VELSCOUR, E = await import('/src/game/endgame.js');
      if (G.char) G.char.townSeed = seed;
      localStorage.removeItem('velscour_endgame_v1'); E.resetEndgameCache(); G.char.heresy = { on: [] };
      game.enterTown();
      const { UI } = await import('/src/ui/ui.js'); UI.clearCenterMsg();
      const { heresyAltarReady } = await import('/src/gfx/heresyaltar.js'); await heresyAltarReady();
      const w = G.world, a = w.npcs.find((n) => n.altar), p = G.player, start = [p.x, p.y];
      const path = w.map.findPath(p.x, p.y, a.x, a.y, 20000);
      // the hero walks up from the arrival and the altar opens its panel
      p.interact = a; let n = 0;
      for (; n < 30 * 40 && !G.ui.heresies.active; n++) { G.dt = 1 / 30; G.time += G.dt; G.frame++; game.update(1 / 30); }
      const walked = { open: G.ui.heresies.active, secs: +(n / 30).toFixed(1), d: +Math.hypot(a.x - p.x, a.y - p.y).toFixed(2) };
      G.ui.closePanel('heresies');
      // the 3 x 3 under the dais solid, the ring of 16 round it open (so it never cuts a path)
      let solid = 0, ring = 0;
      for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) { const inner = Math.abs(i) <= 1 && Math.abs(j) <= 1, ok = w.map.walkable(a.x + i, a.y + j); if (inner && !ok) solid++; if (!inner && ok) ring++; }
      window.AL.stand(2.7, 0.4); window.AL.step(0.6);
      return { x: a.x, y: a.y, start, open: E.endgameUnlocked(), path: !!(path && path.length), solid, ring, reach: a.reach, walked };
    }, seed);
    console.log(seed, JSON.stringify(t));
    check(!t.open, `seed ${seed}: the Endgame starts sealed`);
    check(t.solid === 9 && t.ring === 16, `seed ${seed}: the 3 x 3 under the dais is solid (${t.solid}), the ring round it open (${t.ring}/16)`);
    check(t.path && t.walked.open && t.walked.d <= t.reach + 0.05, `seed ${seed}: the hero walks to it (${t.walked.secs} s, ${t.walked.d} tiles) and it opens the panel`);
    await page.waitForTimeout(400);
    const l0 = await look();
    check(l0.lvl === 0 && l0.sbox, `seed ${seed}: drawn sealed from the bake (${JSON.stringify(l0)})`);
    await crop(`heresy_altar_s${seed}_sealed`);
    await shot(`heresy_altar_s${seed}_town_sealed`);
    await page.evaluate(async () => { const E = await import('/src/game/endgame.js'); E.unlockEndgame(); window.VELSCOUR.G.char.heresy = { on: [] }; window.AL.step(1.2); });
    await page.waitForTimeout(2500);
    const l1 = await look();
    check(Math.abs(l1.lvl - 1) < 0.08, `seed ${seed}: awake once the Endgame opens (${l1.lvl})`);
    await crop(`heresy_altar_s${seed}_awake`);
    await page.evaluate(() => { const { G } = window.VELSCOUR; G.char.heresy = { on: ['twins', 'iron', 'glass', 'omens', 'gaze'] }; window.AL.step(1.4); });
    await page.waitForTimeout(2500);
    const l2 = await look();
    check(l2.lvl > 1.5, `seed ${seed}: ablaze with Heresies on (${l2.lvl})`);
    await crop(`heresy_altar_s${seed}_ablaze`);
    await shot(`heresy_altar_s${seed}_town_ablaze`);
    await page.evaluate(() => { window.AL.stand(-2.2, -1.6); window.AL.step(0.6); });
    await crop(`heresy_altar_s${seed}_behind`);
  }
  // first person (gfx/firstperson.js): the hero four tiles off, looking at it, ablaze
  await page.evaluate(async () => {
    const { G } = window.VELSCOUR, { fp, fpSnap } = await import('/src/gfx/firstperson.js');
    const a = G.world.npcs.find((n) => n.altar), p = G.player;
    p.x = a.x + 3.2; p.y = a.y + 2.6; p.facing = Math.atan2(a.y - p.y, a.x - p.x);
    G.settings.firstPerson = true; fpSnap(p);
  });
  await page.waitForFunction(async () => (await import('/src/gfx/firstperson.js')).fp.on, null, { timeout: 20000 });
  await page.evaluate(async () => { const { G } = window.VELSCOUR, { fpSnap } = await import('/src/gfx/firstperson.js'); fpSnap(G.player); });
  await page.waitForTimeout(900);
  await shot('heresy_altar_firstperson');
  await page.evaluate(() => { window.VELSCOUR.G.settings.firstPerson = false; });
  console.log(fails ? `${fails} FAILED` : 'all ok');
  report(errors);
  await browser.close();
  process.exit(fails ? 1 : 0);
})();
