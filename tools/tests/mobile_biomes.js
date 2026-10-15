// Mobile visual/performance sweep: sample both normal packs and the heavyweight
// runtime-generated biomes at 844x390. Requires local HTTP server + Playwright.
// node tools/tests/mobile_biomes.js         # high-risk biomes
// node tools/tests/mobile_biomes.js --all   # every combat biome
const { openGame, report } = require('./harness');
const all = process.argv.includes('--all');
const selected = ['catacombs', 'ice_temple', 'desert_temple', 'hell',
  'astral_plane', 'heavenly', 'overworld', 'throne'];

(async () => {
  const { browser, page, errors, shot } = await openGame({ width: 844, height: 390, mobile: true });
  try {
    await page.evaluate(() => window.VELSCOUR.game.newChar('wizard', 'Mobile QA'));
    const ids = await page.evaluate(async () => {
      const { BIOMES } = await import('/src/data/biomes.js');
      return BIOMES.map(b => b.id);
    });
    const targets = all ? ids : selected.filter(id => ids.includes(id));
    for (const id of targets) {
      try {
        await page.evaluate(async (id) => {
          const { G, game } = window.VELSCOUR;
          const { BIOME_BY_ID } = await import('/src/data/biomes.js');
          const { loadBiomeArt } = await import('/src/core/assets.js');
          const biome = BIOME_BY_ID[id], depth = id === 'throne' ? 500 : 8;
          G.godMode = true;
          G.char.depth = depth;
          await loadBiomeArt(biome);
          game.buildDungeon(depth, biome);
        }, id);
        await page.waitForTimeout(300);
        const stats = await page.evaluate(() => new Promise(resolve => {
          const { game, G } = window.VELSCOUR;
          const render = game.render, update = game.update;
          const times = [], updates = [], start = performance.now();
          game.render = function (...args) {
            const t = performance.now();
            try { return render.apply(this, args); }
            finally { times.push(performance.now() - t); }
          };
          game.update = function (...args) {
            const t = performance.now();
            try { return update.apply(this, args); }
            finally { updates.push(performance.now() - t); }
          };
          setTimeout(() => {
            game.render = render; game.update = update;
            const percentile = (samples, p) => {
              if (!samples.length) return 0;
              const s = [...samples].sort((a, b) => a - b);
              return s[Math.min(s.length - 1, Math.floor(p * s.length))];
            };
            resolve({ fps: times.length / ((performance.now() - start) / 1000),
              renderP50: percentile(times, .5), renderP95: percentile(times, .95),
              updateP95: percentile(updates, .95), dpr: G.dpr, resScale: G.resScale || 1 });
          }, 2000);
        }));
        console.log(id.padEnd(16), `fps=${stats.fps.toFixed(1)} render p95=${stats.renderP95.toFixed(1)}ms update p95=${stats.updateP95.toFixed(1)}ms dpr=${stats.dpr.toFixed(2)} res=${stats.resScale.toFixed(2)}`);
        if (stats.fps < 15) errors.push('[performance] ' + id + ' fell below 15 fps during this Chromium test');
        if (['hell', 'heavenly', 'astral_plane', 'overworld'].includes(id)) await shot('mobile_biome_' + id);
      } catch (err) { errors.push('[biome ' + id + '] ' + String(err)); }
    }
  } finally {
    report(errors);
    await browser.close();
  }
})();
