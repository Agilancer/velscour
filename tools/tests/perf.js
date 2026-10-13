// Frame-cost probe on a phone-sized touch screen (844x390, DPR 2, 4x CPU throttle): ms per frame spent in
// game.update and game.render over a few seconds in a dungeon. Usage: node tools/tests/perf.js [depth] [class] [throttle]
const { openGame, report } = require('./harness');
const depth = +(process.argv[2] || 6), cls = process.argv[3] || 'wizard', rate = +(process.argv[4] || 4);

(async () => {
  const { browser, ctx, page, errors, shot } = await openGame({ width: 844, height: 390, mobile: true });
  await page.evaluate((cls) => window.VELSCOUR.game.newChar(cls, 'Perf'), cls);
  await page.waitForTimeout(1500);
  await page.evaluate((d) => { const { G, game } = window.VELSCOUR; G.char.depth = d; game.enterDungeon(); G.godMode = true; }, depth);
  await page.waitForTimeout(3000);
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate });
  const r = await page.evaluate(() => new Promise((res) => {
    const { game } = window.VELSCOUR, u = game.update, rd = game.render, s = { u: 0, r: 0, n: 0 };
    game.update = function (dt) { const t = performance.now(); u.call(this, dt); s.u += performance.now() - t; };
    game.render = function () { const t = performance.now(); rd.call(this); s.r += performance.now() - t; s.n++; };
    const t0 = performance.now();
    setTimeout(() => { game.update = u; game.render = rd; res({ res: (window.VELSCOUR.G.resScale || 1).toFixed(2) + ' dpr ' + window.VELSCOUR.G.dpr.toFixed(2), fps: s.n / ((performance.now() - t0) / 1000), update: s.u / s.n, render: s.r / s.n }); }, 5000);
  }));
  console.log(`depth ${depth} ${cls}: ${r.fps.toFixed(1)} fps, update ${r.update.toFixed(2)} ms, render ${r.render.toFixed(2)} ms per frame (${rate}x CPU throttle, resScale ${r.res})`);
  await shot('perf');
  report(errors);
  await browser.close();
})();
