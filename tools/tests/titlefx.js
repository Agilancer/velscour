// Title screen intro: click-to-awaken gate, sequential credit cards starting with Hymn of the Abyss, the logo fade and
// flame burst on the song's hit, skipping the intro, and the blinking eyes.
//   node tools/tests/titlefx.js            (screenshots: titlefx_*.png)
// Uses the test hooks on the FX canvas (canvas.title-fx .fx).
const { openGame, report } = require('./harness');

(async () => {
  for (const [w, h, mobile, tag] of [[1280, 720, false, 'pc'], [844, 390, true, 'mobile']]) {
    const { browser, page, errors, shot } = await openGame({ width: w, height: h, mobile, intro: true });
    const st = () => page.evaluate(() => document.querySelector('canvas.title-fx').fx.state());
    const clock = () => page.evaluate(async () => (await import('/src/core/audio.js')).musicClock());
    await page.evaluate(() => { const fx = document.querySelector('canvas.title-fx').fx; for (let i = 0; i < 4; i++) fx.watcher(); });
    await page.waitForTimeout(700);
    let s = await st();
    console.log(tag, 'start', JSON.stringify(s));
    await shot(`titlefx_${tag}_gate`);
    if (s.phase === 'gate') { await page.mouse.click(w * 0.1, h * 0.9); }
    const t0 = Date.now();
    const introDeadline = Date.now() + 12000;
    while ((s = await st()).phase !== 'intro' && Date.now() < introDeadline) await page.waitForTimeout(30);
    s = await st();
    console.log(tag, 'fading', JSON.stringify(s), 'song', JSON.stringify(await clock()));
    if (s.phase !== 'intro' || !(s.opacity > 0.05 && s.opacity < 0.9)) { console.log('FAIL: logo should be part-way faded in'); process.exitCode = 1; }
    if (s.ready) { console.log('FAIL: menu clickable before it is visible'); process.exitCode = 1; }
    await shot(`titlefx_${tag}_fading`);
    while ((s = await st()).phase !== 'lit' && Date.now() - t0 < 16000) await page.waitForTimeout(30);
    const litAt = (Date.now() - t0) / 1000, song = await clock();
    console.log(tag, `lit ${litAt.toFixed(2)}s after the click, song at ${song ? song.t.toFixed(2) : 'n/a'}`);
    if (s.phase !== 'lit' || (song && Math.abs(song.t - 6.88) > 0.25)) { console.log('FAIL: burst not on the hit'); process.exitCode = 1; }
    await page.waitForTimeout(120);
    await shot(`titlefx_${tag}_burst`);
    await page.waitForTimeout(2500);
    s = await st(); console.log(tag, 'burning', JSON.stringify(s));
    if (!s.ready) { console.log('FAIL: menu still locked after the burst'); process.exitCode = 1; }
    await shot(`titlefx_${tag}_burning`);
    // a fresh title screen (audio already unlocked) starts the intro at once; a click skips to the burst
    await page.evaluate(async () => { const a = await import('/src/core/audio.js'); a.stopMusic(0.1); (await import('/src/ui/screens.js')).titleScreen(); });
    const creditsDeadline = Date.now() + 8000;
    while (!['credits', 'intro'].includes((s = await st()).phase) && Date.now() < creditsDeadline) await page.waitForTimeout(30);
    if (!['credits', 'intro'].includes(s.phase)) { console.log('FAIL: expected credits or intro without gate, got', s.phase); process.exitCode = 1; }
    await page.mouse.click(w * 0.1, h * 0.9);
    await page.waitForTimeout(800);
    s = await st();
    console.log(tag, 'after skip', JSON.stringify(s));
    if (s.phase !== 'lit') { console.log('FAIL: skip did not light the logo'); process.exitCode = 1; }
    // leaving the title screen must stop the loop and drop the canvases
    await page.click('text=Heroes');
    await page.waitForTimeout(200);
    const left = await page.evaluate(() => document.querySelectorAll('canvas.title-fx, canvas.title-eyes').length);
    if (left) { console.log('FAIL: title canvases left behind'); process.exitCode = 1; }
    report(errors);
    await browser.close();
  }
})();
