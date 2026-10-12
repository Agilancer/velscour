// Title screen logo FX: flames, tar drips piling up, a spark igniting the pile, the explosion.
//   node tools/tests/titlefx.js            (screenshots: titlefx_*.png)
// Uses the test hooks on the FX canvas (canvas.title-fx .fx) to pile tar up and fire the spark without waiting.
const { openGame, report } = require('./harness');

(async () => {
  for (const [w, h, mobile, tag] of [[1280, 720, false, 'pc'], [844, 390, true, 'mobile']]) {
    const { browser, page, errors, shot } = await openGame({ width: w, height: h, mobile });
    const st = () => page.evaluate(() => document.querySelector('canvas.title-fx').fx.state());
    await page.waitForTimeout(2500);
    await shot(`titlefx_${tag}_flames`);
    await page.waitForTimeout(6000);
    console.log(tag, 'after 8.5s', JSON.stringify(await st()));
    await shot(`titlefx_${tag}_drips`);
    await page.evaluate(() => document.querySelector('canvas.title-fx').fx.pileUp(14));
    await page.waitForTimeout(400);
    await shot(`titlefx_${tag}_pile`);
    await page.evaluate(() => document.querySelector('canvas.title-fx').fx.spark());
    let s, t0 = Date.now(), shots = 0;
    for (let i = 0; i < 60; i++) {   // catch it burning and exploding
      await page.waitForTimeout(100);
      s = await st();
      if (s.fires && shots === 0) { await page.waitForTimeout(250); await shot(`titlefx_${tag}_burning`); shots = 1; }
      if (shots === 1 && !s.fires) { await page.waitForTimeout(60); await shot(`titlefx_${tag}_boom`); await page.waitForTimeout(450); await shot(`titlefx_${tag}_after`); shots = 2; break; }
    }
    console.log(tag, shots === 2 ? `ignited + exploded in ${Date.now() - t0}ms` : 'FAIL: no explosion', JSON.stringify(s));
    if (shots !== 2) process.exitCode = 1;
    // leaving the title screen must stop the loop and drop the canvas
    await page.evaluate(() => document.querySelector('.title-menu .btn:nth-last-child(1)').click());
    report(errors);
    await browser.close();
  }
})();
