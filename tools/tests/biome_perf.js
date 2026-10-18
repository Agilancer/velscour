// Frame cost per biome with auto-play running: every dungeon and overworld biome plus the town, on a phone-sized
// touch screen with CPU throttling. Prints fps, update and render ms per frame, creatures and effects alive, and the
// top self-time functions from a CPU profile. Usage: node tools/tests/biome_perf.js [ids,comma] [depth] [throttle] [secs]
const { openGame, report } = require('./harness');
const only = (process.argv[2] || '').split(',').filter(Boolean);
const depth = +(process.argv[3] || 24), rate = +(process.argv[4] || 4), secs = +(process.argv[5] || 4);

(async () => {
  const { browser, ctx, page, errors } = await openGame({ width: 844, height: 390, mobile: true });
  await page.evaluate(async () => {
    const { G, game } = window.VELSCOUR;
    await game.newChar('wizard', 'Perf');
    document.querySelectorAll('.screen').forEach((s) => s.remove());
    G.ui.modalCount = 0; G.godMode = true;
  });
  const ids = await page.evaluate(async (only) => {
    const { BIOMES } = await import('/src/data/biomes.js');
    return ['town', ...BIOMES.map((b) => b.id)].filter((id) => !only.length || only.includes(id));
  }, only);
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Profiler.enable');
  const rows = [], hot = {};
  for (const id of ids) {
    await page.evaluate(async ([id, depth]) => {
      const { G, game } = window.VELSCOUR;
      const { BIOME_BY_ID } = await import('/src/data/biomes.js');
      const { loadBiomeArt } = await import('/src/core/assets.js'); const { loadArtFor } = await import('/src/core/enemyart.js');
      const { Auto } = await import('/src/game/autoplay.js');
      if (Auto.on) Auto.toggle(false);
      if (id === 'town') { game.enterTown(); }
      else {
        const b = BIOME_BY_ID[id];
        if (id === 'sea_of_sand') await (await import('/src/gfx/seaofsand.js')).loadSeaOfSandPack?.();
        else if (id === 'castle') await (await import('/src/gfx/castle.js')).loadCastlePack?.();
        else if (!b.overworld) await loadBiomeArt(b);
        G.char.depth = depth;
        game.buildDungeon(depth, b);
        // as enterDungeon does: the level's sheets (letting go of the rest), then its sprites built and the caches trimmed
        await loadArtFor([...G.world.creatures.map((m) => m.art), ...(G.world.looks ? G.world.looks.ids() : [])], true).catch(() => {});
        await game.warmArt();
      }
      document.querySelectorAll('.screen').forEach((s) => s.remove());
      G.ui.modalCount = 0;
      Auto.toggle(true);
    }, [id, depth]).catch((e) => console.log(id, 'setup failed', e.message));
    await page.waitForTimeout(2500);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate });
    await cdp.send('Profiler.start');
    const r = await page.evaluate((secs) => new Promise((res) => {
      const { G, game } = window.VELSCOUR, u = game.update, rd = game.render, s = { u: 0, r: 0, n: 0, worst: 0 };
      game.update = function (dt) { const t = performance.now(); u.call(this, dt); s.u += performance.now() - t; };
      game.render = function () { const t = performance.now(); rd.call(this); const d = performance.now() - t; s.r += d; s.worst = Math.max(s.worst, d); s.n++; };
      const t0 = performance.now();
      setTimeout(() => { game.update = u; game.render = rd; const w = G.world; res({ fps: s.n / ((performance.now() - t0) / 1000), update: s.u / s.n, render: s.r / s.n, worst: s.worst, mobs: w.creatures.length, props: (w.props || []).length, map: w.map.w + 'x' + w.map.h }); }, secs * 1000);
    }), secs);
    const { profile } = await cdp.send('Profiler.stop');
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    // self time per function
    const self = {}, dtv = profile.timeDeltas, byId = {};
    profile.nodes.forEach((n) => { byId[n.id] = n; });
    profile.samples.forEach((id, i) => { const n = byId[id], f = n.callFrame; const k = `${f.functionName || '(anon)'} ${f.url.split('/').slice(-2).join('/')}:${f.lineNumber + 1}`; self[k] = (self[k] || 0) + (dtv[i] || 0); });
    const tot = Object.values(self).reduce((a, b) => a + b, 0);
    const top = Object.entries(self).filter(([k]) => !/^\((idle|program|garbage collector)\)/.test(k)).sort((a, b) => b[1] - a[1]).slice(0, 6);
    top.forEach(([k, v]) => { hot[k] = (hot[k] || 0) + v / tot; });
    rows.push({ id, ...r });
    console.log(`${id.padEnd(16)} ${r.fps.toFixed(1).padStart(5)} fps  upd ${r.update.toFixed(2).padStart(5)}  rnd ${r.render.toFixed(2).padStart(6)}  worst ${r.worst.toFixed(1).padStart(5)}  mobs ${r.mobs} props ${r.props} map ${r.map}`);
    console.log('   ' + top.map(([k, v]) => `${(100 * v / tot).toFixed(1)}% ${k}`).join('\n   '));
  }
  console.log('\nHOT ACROSS BIOMES:\n' + Object.entries(hot).sort((a, b) => b[1] - a[1]).slice(0, 20).map(([k, v]) => `  ${(100 * v / ids.length).toFixed(1)}% ${k}`).join('\n'));
  report(errors, 10);
  await browser.close();
})();
