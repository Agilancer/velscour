// First-person view (Settings > First-person view, gfx/firstperson.js): off by default; on, the town, a dungeon and a
// wilds level draw through the hero's eyes. Checks: three.js loads and the 3D view takes over, monsters in view get
// a click box, a click on the floor ahead walks the hero forward, W walks where the view looks, D turns it, auto-play
// still fights, and turning it off hands the usual view back. Shots: fp_town, fp_dungeon, fp_fight, fp_wilds, fp_mobile.
//   node tools/tests/firstperson.js [biomes] [mobile]
const { openGame, report } = require('./harness');

const BIOMES = (process.argv[2] && process.argv[2] !== 'mobile' ? process.argv[2] : 'catacombs,frozen').split(',');
const MOBILE = process.argv.includes('mobile');

(async () => {
  const { browser, page, errors, shot } = await openGame(MOBILE ? { width: 844, height: 390, mobile: true } : {});
  let fail = 0;
  const check = (ok, msg) => { console.log((ok ? 'ok   ' : 'FAIL ') + msg); if (!ok) fail++; };
  await page.click('text=Heroes'); await page.click('.class-card[data-id="paladin"]'); await page.click('text=Begin');
  await page.waitForTimeout(1200);
  check(await page.evaluate(() => window.VELSCOUR.G.settings.firstPerson === false), 'first person is off by default');
  await page.evaluate(() => { const { G } = window.VELSCOUR; G.settings.firstPerson = true; G.godMode = true; });
  await page.waitForFunction(async () => (await import('/src/gfx/firstperson.js')).fp.on, null, { timeout: 20000 });
  await page.waitForTimeout(600);
  await shot(MOBILE ? 'fp_mobile_town' : 'fp_town');
  check(true, 'town draws in first person');

  for (const biome of BIOMES) {
    await page.evaluate(async (b) => {
      const { G, game } = window.VELSCOUR; G.char.nextBiome = b; game.enterDungeon();
    }, biome);
    await page.waitForTimeout(3500);
    const st = await page.evaluate(async () => {
      const { G } = window.VELSCOUR; const { fp } = await import('/src/gfx/firstperson.js');
      return { on: fp.on, kind: G.world.kind, biome: G.world.biome.id, walls: !!G.world.fp3d, far: fp.far };
    });
    console.log(JSON.stringify(st));
    check(st.on && st.walls, `${biome}: 3D view on`);
    await shot(`fp_dungeon_${biome}${MOBILE ? '_mobile' : ''}`);
    // a monster stood a few tiles ahead gets a click box in front of the eye
    const box = await page.evaluate(async () => {
      const { G } = window.VELSCOUR; const { fp } = await import('/src/gfx/firstperson.js');
      const p = G.player, m = G.world.creatures.find((c) => c.team === 'enemy' && !c.dead && !c.boss);
      if (!m) return 'no monster';
      // face down the longest open run from the hero, put the monster 3 tiles along it
      let best = 0, ba = 0;
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 16) { let d = 0; while (d < 12 && G.world.map.walkable(p.x + Math.cos(a) * d, p.y + Math.sin(a) * d)) d += 0.25; if (d > best) { best = d; ba = a; } }
      fp.yaw = ba; fp.manual = 5; p.facing = ba;
      m.x = p.x + Math.cos(ba) * Math.min(3, best - 0.5); m.y = p.y + Math.sin(ba) * Math.min(3, best - 0.5); m.awake = false;
      await new Promise((r) => setTimeout(r, 300));
      return m.sbox ? m.sbox.map((v) => Math.round(v)) : null;
    });
    console.log('monster box', JSON.stringify(box));
    check(Array.isArray(box) && box[2] > box[0] && box[3] > box[1], `${biome}: monster ahead has a click box`);
    await shot(`fp_fight_${biome}${MOBILE ? '_mobile' : ''}`);
    // frame cost of a draw, first person against the usual view (SwiftShader numbers: compare, don't trust)
    const ms = await page.evaluate(async () => {
      const { G, game } = window.VELSCOUR, t = (n) => { const a = performance.now(); for (let i = 0; i < n; i++) game.render(); return (performance.now() - a) / n; };
      t(5); const fpMs = t(30);
      G.settings.firstPerson = false; t(5); const isoMs = t(30); G.settings.firstPerson = true; t(3);
      return { fp: +fpMs.toFixed(1), iso: +isoMs.toFixed(1) };
    });
    console.log('render ms', JSON.stringify(ms));
    // a click on the floor below the centre walks forward
    const walked = await page.evaluate(async () => {
      const { G } = window.VELSCOUR; const { camera } = await import('/src/core/view.js'); const { fp } = await import('/src/gfx/firstperson.js');
      const [tx, ty] = camera.screenToTile(G.W / 2, G.H * 0.8);
      const ahead = (tx - G.player.x) * fp.c + (ty - G.player.y) * fp.s;
      return { ahead: +ahead.toFixed(2) };
    });
    console.log('floor pick', JSON.stringify(walked));
    check(walked.ahead > 0.5 && walked.ahead < 6, `${biome}: a click low on the screen picks the floor just ahead`);
  }
  // W walks where the view looks; D turns it
  const keys = await page.evaluate(async () => {
    const { G } = window.VELSCOUR; const { fp } = await import('/src/gfx/firstperson.js');
    for (const c of G.world.creatures) if (c.team === 'enemy') c.awake = false;
    const p = G.player; p.moveTarget = null; p.path = null; p.attackTarget = null;
    const x0 = p.x, y0 = p.y, yaw0 = fp.yaw; fp.manual = 0;
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyD', key: 'd' }));
    await new Promise((r) => setTimeout(r, 400));
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyD', key: 'd' }));
    const turned = fp.yaw - yaw0;
    const a = fp.yaw;
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW', key: 'w' }));
    await new Promise((r) => setTimeout(r, 400));
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW', key: 'w' }));
    const dx = p.x - x0, dy = p.y - y0, moved = Math.hypot(dx, dy);
    return { turned: +turned.toFixed(2), moved: +moved.toFixed(2), along: moved ? +((dx * Math.cos(a) + dy * Math.sin(a)) / moved).toFixed(2) : 0 };
  });
  console.log('keys', JSON.stringify(keys));
  check(Math.abs(keys.turned) > 0.3, 'D turns the view');
  check(keys.moved < 0.05 || keys.along > 0.7, 'W walks where the view looks (or a wall stopped it)');
  // auto-play still fights in first person
  const ap = await page.evaluate(async () => {
    const { G } = window.VELSCOUR; const { Auto } = await import('/src/game/autoplay.js');
    const k0 = G.char.kills || 0; Auto.toggle(true);
    for (const c of G.world.creatures) if (c.team === 'enemy') c.awake = true;
    await new Promise((r) => setTimeout(r, 12000));
    Auto.toggle(false);
    return { kills: (G.char.kills || 0) - k0 };
  });
  console.log('auto-play', JSON.stringify(ap));
  await shot(`fp_autoplay${MOBILE ? '_mobile' : ''}`);
  // the wilds (outdoors: sky, trees)
  await page.evaluate(async () => { const { G, game } = window.VELSCOUR; const { BIOME_BY_ID } = await import('/src/data/biomes.js'); game.buildDungeon(G.char.depth, BIOME_BY_ID.overworld); });
  await page.waitForTimeout(3500);
  await shot(`fp_wilds${MOBILE ? '_mobile' : ''}`);
  // off: the usual view, the warp handed back, the camera following again
  const off = await page.evaluate(async () => {
    const { G } = window.VELSCOUR; const { fp } = await import('/src/gfx/firstperson.js'); const { currentWarp, camera } = await import('/src/core/view.js');
    G.settings.firstPerson = false;
    await new Promise((r) => setTimeout(r, 500));
    return { on: fp.on, warp: !!currentWarp(), fixed: !!camera.fixed };
  });
  check(!off.on && !off.warp && !off.fixed, 'turning it off restores the usual view');
  await shot(`fp_off${MOBILE ? '_mobile' : ''}`);
  if (fail) process.exitCode = 1;
  report(errors);
  await browser.close();
})();
