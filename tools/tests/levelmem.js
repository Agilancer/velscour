// Canvas memory over many levels: a hero goes down level after level (town every third), auto-play fights a few game
// seconds with every frame drawn, then the live canvases are counted after a forced GC and charged to the code that
// made them. Anything that keeps growing level after level is a leak a long session on a phone runs into.
//   node tools/tests/levelmem.js [levels] [class] [secs]      (defaults: 24 wizard 20)
//   LM_FAIL=MB    fail when live canvas memory grows more than MB from level 6 to the last
const { openGame, report } = require('./harness');
const levels = +(process.argv[2] || 24), cls = process.argv[3] || 'wizard', secs = +(process.argv[4] || 20);

(async () => {
  const { browser, ctx, page, errors } = await openGame({ width: 844, height: 390, mobile: true });
  const cdp = await ctx.newCDPSession(page);
  await page.evaluate(() => {
    const w = window; w.__lm = [];
    const ce = document.createElement.bind(document);
    document.createElement = (t, o) => {
      const c = ce(t, o);
      if (String(t).toLowerCase() === 'canvas') {
        const st = (new Error().stack || '').split('\n').slice(2, 6).map((l) => l.replace(/.*\/src\//, '').replace(/\)$/, '').replace(/:\d+$/, '').replace(/^\s*at /, '')).filter((l) => !/util\.js:(19\d|20\d)$/.test(l)).slice(0, 3).join(' < ');
        w.__lm.push([new WeakRef(c), st]);
      }
      return c;
    };
  });
  await page.evaluate(async (cls) => {
    const { G, game } = window.VELSCOUR;
    await game.newChar(cls, 'Levelmem');
    G.godMode = true; G.autoOpenSeals = true;
    const { Auto } = await import('/src/game/autoplay.js'); Auto.toggle(true);
  }, cls);
  const snap = async () => {
    await cdp.send('HeapProfiler.collectGarbage');
    return page.evaluate(() => {
      const m = new Map(), keep = []; let tot = 0, n = 0;
      for (const r of window.__lm) { const c = r[0].deref(); if (!c) continue; keep.push(r); const b = c.width * c.height * 4; tot += b; n++; const e = m.get(r[1]) || [0, 0]; e[0]++; e[1] += b; m.set(r[1], e); }
      window.__lm = keep;
      return { tot: tot / 1048576, n, by: Object.fromEntries([...m].map(([k, [c, b]]) => [k, [c, b / 1048576]])) };
    });
  };
  const count = async (expr) => {
    const p = await cdp.send('Runtime.evaluate', { expression: expr, awaitPromise: true, objectGroup: 'probe' });
    const q = await cdp.send('Runtime.queryObjects', { prototypeObjectId: p.result.objectId, objectGroup: 'probe' });
    const v = (await cdp.send('Runtime.callFunctionOn', { objectId: q.objects.objectId, functionDeclaration: 'function(){return this.length}', returnByValue: true })).result.value;
    await cdp.send('Runtime.releaseObjectGroup', { objectGroup: 'probe' }); // (an unreleased result keeps every object it found alive)
    return v;
  };
  const rows = [];
  for (let L = 1; L <= levels; L++) {
    const where = await page.evaluate(async ([L, secs]) => {
      const { G, game } = window.VELSCOUR;
      const w0 = G.world;
      document.querySelectorAll('.screen').forEach((s) => s.remove()); G.ui.modalCount = 0;
      if (L % 3 === 0) game.enterTown(); else { G.char.depth = Math.max(1, L * 4); G.char.nextBiome = null; game.enterDungeon(); }
      const t0 = performance.now();
      while ((G.world === w0 || !document.querySelector('#loading').classList.contains('hidden')) && performance.now() - t0 < 30000) await new Promise((r) => setTimeout(r, 50));
      for (let i = 0; i < secs * 30; i++) {
        if (G.mode === 'game' && G.world) { G.dt = 1 / 30; G.time += G.dt; G.frame++; game.update(1 / 30); game.render(); }
        if (i % 15 === 0) await new Promise((r) => setTimeout(r, 0));
      }
      const w = G.world;
      return w.kind === 'town' ? 'town' : `${w.biome.id}:D${w.depth}`;
    }, [L, secs]);
    const s = await snap();
    rows.push(s);
    const worlds = await count("import('/src/game/world.js').then((m) => m.World.prototype)");
    console.log(`[L${L}] ${where.padEnd(22)} live canvases ${s.n} = ${s.tot.toFixed(0)} MB, worlds alive ${worlds}`);
  }
  const a = rows[Math.min(5, rows.length - 1)], b = rows[rows.length - 1];
  const keys = new Set([...Object.keys(a.by), ...Object.keys(b.by)]);
  const d = [...keys].map((k) => [k, (b.by[k]?.[1] || 0) - (a.by[k]?.[1] || 0), (b.by[k]?.[0] || 0) - (a.by[k]?.[0] || 0), b.by[k]?.[1] || 0]).sort((x, y) => y[1] - x[1]);
  console.log(`\ngrowth from L${rows.indexOf(a) + 1} to L${rows.length}: ${(b.tot - a.tot).toFixed(0)} MB`);
  for (const [k, mb, n, now] of d.slice(0, 14)) console.log(`  ${mb >= 0 ? '+' : ''}${mb.toFixed(1)} MB (${n >= 0 ? '+' : ''}${n}) now ${now.toFixed(1)} MB  ${k}`);
  console.log('\nlargest now:');
  for (const [k, [n, mb]] of Object.entries(b.by).sort((x, y) => y[1][1] - x[1][1]).slice(0, 10)) console.log(`  ${mb.toFixed(1)} MB / ${n}  ${k}`);
  const lim = +process.env.LM_FAIL;
  if (lim && b.tot - a.tot > lim) { console.log(`FAIL: live canvas memory grew ${(b.tot - a.tot).toFixed(0)} MB`); process.exitCode = 1; }
  report(errors, 20);
  await browser.close();
})();
