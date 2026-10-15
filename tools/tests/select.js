// Hero select: one hero per class. New hero in an empty class, play an existing one, delete mode, old saves with
// two heroes of a class (the newest wins).
//   node tools/tests/select.js            # desktop 1280x720
//   node tools/tests/select.js mobile     # 844x390 touch
const { openGame, report } = require('./harness');

(async () => {
  const mobile = process.argv[2] === 'mobile';
  const p = mobile ? 'sm_' : 's_';
  const { browser, page, errors, shot } = await openGame(mobile ? { width: 844, height: 390, mobile: true } : {});
  const click = (sel) => (mobile ? page.tap(sel) : page.click(sel));
  const fail = (msg) => { errors.push('[test] ' + msg); };
  const toSelect = async () => { await page.evaluate(async () => (await import('/src/ui/screens.js')).titleScreen()); await page.evaluate(() => document.querySelector('.title-screen').classList.add('title-ready')); await click('text=Heroes'); await page.waitForTimeout(300); };

  await page.evaluate(async () => {
    const S = await import('/src/game/save.js');
    const a = S.newCharData('ranger', 'Old Ranger'); a.lastPlayed = 1000;
    const b = S.newCharData('ranger', 'New Ranger'); b.lastPlayed = 2000;
    const w = S.newCharData('wizard', 'Merla'); w.lastPlayed = 3000;
    localStorage.setItem('velscour_saves_v1', JSON.stringify([a, b, w]));
  });
  await toSelect();
  await shot(p + '1_select');
  if (!(await page.textContent('.class-card[data-id="ranger"]')).includes('New Ranger')) fail('ranger card should show the newest ranger');
  if ((await page.$('.class-card.has-hero')).length !== 2) fail('expected 2 class cards with heroes');
  // Both saved classes must preview their own current body/helm rather than the generic class portrait.
  await page.waitForFunction(() => document.querySelectorAll('.class-card.has-hero canvas[data-gear-preview="ready"]').length === 2, null, { timeout: 15000 }).catch(() => fail('saved gear preview did not finish for both classes'));
  if (!(await page.textContent('.class-gear-summary')).includes('Armor')) fail('saved gear summary is missing');
  // empty class: name + Begin
  await click('.class-card[data-id="bard"]');
  if (!(await page.isVisible('.name-input'))) fail('name input hidden for an empty class');
  await page.fill('.name-input', 'Lyra');
  await click('text=Begin');
  await page.waitForTimeout(1500);
  if ((await page.evaluate(() => window.VELSCOUR.G.char && window.VELSCOUR.G.char.name)) !== 'Lyra') fail('new bard did not start');
  await page.evaluate(async () => (await import('/src/game/save.js')).writeSave(window.VELSCOUR.G.char));
  // existing class: Play loads it
  await toSelect();
  await click('.class-card[data-id="wizard"]');
  if (await page.isVisible('.name-input')) fail('name input shown for a class with a hero');
  await shot(p + '2_wizard');
  // delete mode: Delete with an empty class selected arms it, then pick the ranger
  await click('.class-card[data-id="gunner"]');
  await click('.class-screen .btn.red');
  if (!(await page.$('.class-screen.del-mode'))) fail('delete mode not armed');
  await shot(p + '3_delmode');
  await click('.class-card[data-id="ranger"]');
  await page.waitForTimeout(200);
  await page.locator('button.red', { hasText: 'Delete' }).last().click();
  await page.waitForTimeout(300);
  const left = await page.evaluate(async () => (await import('/src/game/save.js')).listSaves().map((c) => c.name).sort().join(','));
  if (left !== 'Lyra,Merla') fail('after deleting ranger, saves are ' + left);
  if (!(await page.isVisible('.name-input'))) fail('deleted class should offer a new hero');
  await click('.class-card[data-id="wizard"]');
  await click('.class-screen .btn.big');
  await page.waitForTimeout(1500);
  if ((await page.evaluate(() => window.VELSCOUR.G.char.name)) !== 'Merla') fail('Play did not load Merla');
  await browser.close();
  report(errors);
})();
