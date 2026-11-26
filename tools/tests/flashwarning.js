// The photosensitive epilepsy warning after "Click to awaken": its two boxes (reduce flashing, "Don't show this window
// again") save at once and don't close it, a click elsewhere does; ticked, the next visit goes straight to the intro;
// Settings > Graphics turns the warning back on.
//   node tools/tests/flashwarning.js [mobile]      (screenshots: flashwarning_*.png)
const { openGame, report } = require('./harness');

const MOBILE = process.argv.includes('mobile');
const [W, H] = MOBILE ? [844, 390] : [1280, 720];
let fails = 0;
const fail = (m) => { console.log('FAIL: ' + m); fails++; process.exitCode = 1; };

(async () => {
  const { browser, page, errors, shot } = await openGame({ width: W, height: H, mobile: MOBILE, intro: true });
  const tag = MOBILE ? 'mobile' : 'pc';
  const phase = () => page.evaluate(() => document.querySelector('canvas.title-fx')?.fx.state().phase);
  const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem('velscour_settings_v1') || '{}'));
  const awaken = async () => {
    await page.waitForFunction(() => document.querySelector('canvas.title-fx')?.fx.state().phase === 'gate', null, { timeout: 10000 });
    await page.mouse.click(W * 0.1, H * 0.9);
    await page.waitForTimeout(700);
  };
  const tap = (sel) => (MOBILE ? page.tap(sel) : page.click(sel));

  // 1. a first visit: the warning shows, with both boxes unticked
  await page.evaluate(() => localStorage.removeItem('velscour_settings_v1'));
  await page.reload();
  await page.waitForFunction(() => window.VELSCOUR && document.querySelector('#loading').classList.contains('hidden'), null, { timeout: 30000 });
  await awaken();
  if (!(await page.$('.seizure-warning-splash'))) fail('no warning after the awaken click');
  const boxes = await page.evaluate(() => [...document.querySelectorAll('.seizure-warning-splash input[type=checkbox]')].map((b) => [b.id, b.checked]));
  console.log(tag, 'boxes', JSON.stringify(boxes));
  if (boxes.length !== 2 || boxes.some(([, c]) => c)) fail('expected two unticked boxes');
  const label = await page.evaluate(() => document.querySelector('#seizure-dont-show-checkbox')?.parentElement.textContent.trim());
  if (label !== "Don't show this window again") fail('box label is ' + JSON.stringify(label));
  // the whole card is on screen (or scrolls to it): the boxes and prompt can be reached
  const fit = await page.evaluate(() => {
    const sp = document.querySelector('.seizure-warning-splash'), card = sp.querySelector('.seizure-warning-card').getBoundingClientRect();
    return { cardTop: Math.round(card.top), cardH: Math.round(card.height), scrollH: sp.scrollHeight, clientH: sp.clientHeight };
  });
  console.log(tag, 'fit', JSON.stringify(fit));
  if (fit.cardTop < 0) fail('card top cut off above the screen');
  await shot(`flashwarning_${tag}_shown`);

  // 2. ticking "Don't show this window again" saves at once and leaves the warning up
  await page.locator('#seizure-dont-show-checkbox').scrollIntoViewIfNeeded();
  await tap('label:has(#seizure-dont-show-checkbox) span');
  await page.waitForTimeout(500);
  let st = await saved();
  if (st.flashWarning !== false) fail('flashWarning not saved off: ' + st.flashWarning);
  if (!(await page.$eval('#seizure-dont-show-checkbox', (b) => b.checked))) fail('box not ticked');
  if (!(await page.$('.seizure-warning-splash:not(.fading)'))) fail('ticking the box closed the warning');
  await shot(`flashwarning_${tag}_ticked`);
  // a click elsewhere closes it and the intro starts
  await page.mouse.click(W * 0.5, 8);
  await page.waitForTimeout(600);
  if (await page.$('.seizure-warning-splash')) fail('warning still up after a click outside the boxes');
  const deadline = Date.now() + 8000;
  let ph;
  while (!['credits', 'intro', 'lit'].includes(ph = await phase()) && Date.now() < deadline) await page.waitForTimeout(50);
  console.log(tag, 'after close', ph);
  if (!['credits', 'intro', 'lit'].includes(ph)) fail('intro did not start after the warning, phase ' + ph);

  // 3. next visit: no warning, straight to the intro
  await page.reload();
  await page.waitForFunction(() => window.VELSCOUR && document.querySelector('#loading').classList.contains('hidden'), null, { timeout: 30000 });
  await awaken();
  if (await page.$('.seizure-warning-splash')) fail('warning shown again after "Don\'t show this window again"');
  ph = await phase();
  console.log(tag, 'second visit', ph);
  if (!['audio-pending', 'credits', 'intro', 'lit'].includes(ph)) fail('second visit stuck in phase ' + ph);

  // 4. Settings > Graphics: the warning is off there, and turning it on saves
  await page.evaluate(async () => (await import('/src/ui/screens.js')).settingsDialog());
  await page.waitForTimeout(200);
  await tap('.settings-tab-btn[data-tab=graphics]');
  await page.waitForTimeout(200);
  const row = await page.evaluate(() => {
    const b = document.querySelector('.settings-dialog [data-k=flashWarning]'), r = document.querySelector('.settings-dialog [data-k=reduceFlashing]');
    return b && { checked: b.checked, label: b.previousElementSibling.textContent, reduce: !!r };
  });
  console.log(tag, 'settings', JSON.stringify(row));
  if (!row || row.checked || !row.reduce) fail('Settings > Graphics should hold an unticked warning box and Reduce flashing effects');
  await page.locator('.settings-dialog [data-k=flashWarning]').scrollIntoViewIfNeeded();
  await shot(`flashwarning_${tag}_settings`);
  await tap('.settings-dialog [data-k=flashWarning]');
  await page.waitForTimeout(200);
  st = await saved();
  if (st.flashWarning !== true) fail('Settings did not turn the warning back on');

  // 5. ...and the next visit shows it again
  await page.reload();
  await page.waitForFunction(() => window.VELSCOUR && document.querySelector('#loading').classList.contains('hidden'), null, { timeout: 30000 });
  await awaken();
  if (!(await page.$('.seizure-warning-splash'))) fail('warning not back after turning it on in Settings');
  // 6. once a visit: back on the title (audio unlocked, so the intro starts on its own) it doesn't come up again
  await page.mouse.click(W * 0.5, 8);
  await page.waitForTimeout(600);
  await page.evaluate(async () => { (await import('/src/core/audio.js')).stopMusic(0.1); (await import('/src/ui/screens.js')).titleScreen(); });
  await page.waitForTimeout(700);
  if (await page.$('.seizure-warning-splash')) fail('warning shown again on returning to the title in the same visit');
  ph = await phase();
  console.log(tag, 'back on the title', ph);
  if (!['audio-pending', 'credits', 'intro', 'lit'].includes(ph)) fail('back on the title stuck in phase ' + ph);

  console.log(tag, fails ? `${fails} FAILED` : 'ALL PASSED');
  report(errors);
  await browser.close();
})();
