// Tessariel's Keep frame pacing: no plain canvas drawn into the game every frame with mipmapped smoothing (Chromium
// sends such a canvas up to the GPU whole on every draw: the hall's banners, glass, rugs and Elder shades kept the GPU
// busy past the frame, 24-48 ms hitches in the keep and none in town). Counts those draws over 60 frames in the keep
// and in town, and the look with raster sprites on vs off (?noraster, the old plain canvases) for the same view.
// HEADED=1 + CHROMIUM_ARGS="--use-angle=d3d11 --enable-gpu --ignore-gpu-blocklist" also prints real RAF gap stats.
//   node tools/tests/keep_frames.js
const { openGame, report } = require('./harness');
const path = require('path');
(async () => {
  const fails = [];
  const probe = () => {
    const orig = CanvasRenderingContext2D.prototype.drawImage;
    window.__tally = null;
    CanvasRenderingContext2D.prototype.drawImage = function (img, ...a) {
      const T = window.__tally;
      if (T && this.canvas.id === 'game' && img instanceof HTMLCanvasElement && this.imageSmoothingEnabled && this.imageSmoothingQuality !== 'low') {
        const k = img.width + 'x' + img.height + ' ' + ((new Error().stack || '').split('\n')[2] || '').trim().replace(/^at /, '').replace(/https?:\/\/[^/]+\//, '');
        T[k] = (T[k] || 0) + 1;
      }
      return orig.call(this, img, ...a);
    };
  };
  const setup = async (page) => page.evaluate(async () => {
    const { newCharData, writeSave } = await import('/src/game/save.js');
    const { rollItem } = await import('/src/data/items.js');
    const { CLASSES } = await import('/src/data/classes.js');
    Object.keys(CLASSES).filter((c) => c !== 'paladin').slice(0, 12).forEach((c, i) => {
      const d = newCharData(c, 'H' + i); d.level = 50 + i; d.deepest = 60; d.lastPlayed = Date.now() - 1000;
      d.equip.body = rollItem(50, { slot: 'body', rarity: 4 }); writeSave(d);
    });
    await window.VELSCOUR.game.newChar('paladin', 'Frames QA');
    await window.VELSCOUR.game.enterKeep();
  });
  const measure = (page) => page.evaluate(async () => {
    window.__tally = {}; const gaps = []; let last = performance.now();
    await new Promise((res) => { let f = 0; const s = (t) => { gaps.push(t - last); last = t; ++f < 120 ? requestAnimationFrame(s) : res(); }; requestAnimationFrame(s); });
    const T = window.__tally; window.__tally = null;
    gaps.sort((a, b) => a - b);
    return { perFrame: Object.values(T).reduce((s, n) => s + n, 0) / 120, top: Object.entries(T).sort((a, b) => b[1] - a[1]).slice(0, 6), p50: +gaps[60].toFixed(1), max: +gaps[gaps.length - 1].toFixed(1) };
  });
  // with raster sprites (the game as shipped)
  const { browser, page, errors, shot } = await openGame({ width: 1440, height: 900, init: probe });
  try {
    await setup(page);
    await page.waitForTimeout(2500);
    const k = await measure(page);
    console.log('keep: plain mipmapped canvas draws/frame', k.perFrame.toFixed(1), 'raf p50', k.p50, 'max', k.max, k.top.length ? JSON.stringify(k.top) : '');
    await page.evaluate(() => { const { G } = window.VELSCOUR; G.player.x = 15; G.player.y = 15; });
    await page.waitForTimeout(800);
    await shot('keep_frames_raster');
    await page.evaluate(() => window.VELSCOUR.game.enterTown());
    await page.waitForTimeout(2500);
    const t = await measure(page);
    console.log('town: plain mipmapped canvas draws/frame', t.perFrame.toFixed(1), 'raf p50', t.p50, 'max', t.max);
    // the keep's own sprites are raster now: what is left there (the floor chunks and the see-through layer draw 'low';
    // name plates, a few per frame) must stay under town's level
    const raster = await page.evaluate(async () => (await import('/src/core/util.js')).rasterSprites());
    if (raster && k.perFrame > Math.max(4, t.perFrame + 2)) fails.push(`keep draws ${k.perFrame.toFixed(1)} plain canvases a frame with mipmaps (town ${t.perFrame.toFixed(1)})`);
  } catch (e) { fails.push(e.message); }
  await browser.close();
  // the same view with plain canvases (?noraster): the sprites must look the same
  const b2 = await openGame({ width: 1440, height: 900, url: (process.env.BASE_URL || 'http://localhost:8123'), init: () => { globalThis.VELSCOUR_NO_RASTER = true; } });
  try {
    await setup(b2.page);
    await b2.page.waitForTimeout(2500);
    await b2.page.evaluate(() => { const { G } = window.VELSCOUR; G.player.x = 15; G.player.y = 15; });
    await b2.page.waitForTimeout(800);
    await b2.shot('keep_frames_plain');
  } catch (e) { fails.push(e.message); }
  await b2.browser.close();
  console.log('shots:', path.join(__dirname, 'out', 'keep_frames_{raster,plain}.png'));
  for (const f of fails) errors.push('[keep_frames] ' + f);
  report(errors.concat(b2.errors));
})();
