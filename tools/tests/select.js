// Class select + hero save slots: animated portraits (idle, and excited on hover), the six slots, a full-slots
// redirect, deleting, and the migration of slotless saves (8 old heroes -> 6 slotted + 2 parked).
//   node tools/tests/select.js            # desktop 1280x720
//   node tools/tests/select.js mobile     # 844x390 touch
const { openGame, report } = require('./harness');

(async () => {
  const mobile = process.argv[2] === 'mobile';
  const p = mobile ? 'sm_' : 's_';
  const { browser, page, errors, shot } = await openGame(mobile ? { width: 844, height: 390, mobile: true } : {});
  const click = (sel) => (mobile ? page.tap(sel) : page.click(sel));
  const fail = (msg) => { errors.push('[test] ' + msg); };
  // a canvas's pixels, to prove it animates
  const pixels = (sel) => page.evaluate((s) => document.querySelector(s).toDataURL(), sel);

  await shot(p + '1_title');
  await click('text=Heroes');
  await page.waitForTimeout(400);
  await shot(p + '2_slots_empty');
  await click('.slot-card[data-slot="2"]');
  await page.waitForTimeout(800);
  if (!(await page.textContent('.screen-title')).includes('Slot 3')) fail('empty slot 3 did not open class select for slot 3');
  await shot(p + '3_class');
  const a = await pixels('.class-card[data-id="wizard"] canvas');
  await page.waitForTimeout(700);
  if (a === await pixels('.class-card[data-id="wizard"] canvas')) fail('idle portrait is not animating');
  if (!mobile) {
    await page.hover('.class-card[data-id="slime_lord"]');
    await page.waitForTimeout(450);
    await shot(p + '4_hover');
    const cut = await page.$('.class-card[data-id="slime_lord"]');
    await cut.screenshot({ path: require('path').join(require('./harness').OUT_DIR, p + '4_hover_card.png') });
  }
  await click('.class-card[data-id="lancer"]');
  await page.waitForTimeout(300);
  await shot(p + '5_lancer');
  await page.fill('.name-input', 'Slotty');
  await click('text=Begin');
  await page.waitForFunction(() => window.VELSCOUR.G.mode === 'game' && window.VELSCOUR.G.world, null, { timeout: 15000 });
  const slot = await page.evaluate(() => window.VELSCOUR.G.char.slot);
  if (slot !== 2) fail('new hero went to slot ' + slot + ', expected 2');
  await page.evaluate(() => window.VELSCOUR.game.quitToTitle());
  await page.waitForTimeout(300);

  // fill the other five slots, then New Hero must show the slots screen instead of class select
  await page.evaluate(async () => {
    const S = await import('/src/game/save.js');
    const ids = ['paladin', 'necromancer', 'bard', 'gunner', 'carrion_witch'];
    for (const id of ids) { const c = S.newCharData(id, id.toUpperCase()); c.level = 7; S.writeSave(c); }
  });
  await page.evaluate(async () => { (await import('/src/ui/screens.js')).titleScreen(); });
  await click('text=New Hero');
  await page.waitForTimeout(500);
  if (!(await page.$('.slot-note'))) fail('New Hero with all slots full did not show the full-slots note');
  if ((await page.$$('.slot-card.empty')).length) fail('slots should all be full');
  await page.mouse.move(5, 5);
  if (!mobile) await page.hover('.slot-card[data-slot="0"]');
  await page.waitForTimeout(450);
  await shot(p + '6_slots_full');
  await click('.slot-card[data-slot="1"] .btn.red');
  await page.waitForTimeout(200);
  await click('.dialog-box button.red');
  await page.waitForTimeout(300);
  if ((await page.$$('.slot-card.empty')).length !== 1) fail('delete did not free exactly one slot');

  // old saves without slots: the 6 most recent get slots, the rest are parked and offered a move
  await page.evaluate(async () => {
    const S = await import('/src/game/save.js');
    const list = [];
    for (let i = 0; i < 8; i++) { const c = S.newCharData('ranger', 'Old ' + i); delete c.slot; c.lastPlayed = 1000 + i; list.push(c); }
    localStorage.setItem('velscour_saves_v1', JSON.stringify(list));
    (await import('/src/ui/screens.js')).heroesScreen();
  });
  await page.waitForTimeout(400);
  const mig = await page.evaluate(async () => {
    const { slotSaves } = await import('/src/game/save.js');
    const { slots, parked } = slotSaves();
    return { names: slots.map((c) => c && c.name), parked: parked.map((c) => c.name) };
  });
  if (mig.names.join() !== 'Old 7,Old 6,Old 5,Old 4,Old 3,Old 2' || mig.parked.join() !== 'Old 1,Old 0') fail('migration: ' + JSON.stringify(mig));
  await shot(p + '7_migrated');
  await click('.slot-card[data-slot="5"] .btn.red');
  await page.waitForTimeout(200);
  await click('.dialog-box button.red');
  await page.waitForTimeout(300);
  await click('text=Move to Slot 6');
  await page.waitForTimeout(300);
  const moved = await page.evaluate(async () => (await import('/src/game/save.js')).slotSaves().slots[5].name);
  if (moved !== 'Old 1') fail('move to slot gave ' + moved);
  await click('.slot-card[data-slot="0"]');
  await page.waitForFunction(() => window.VELSCOUR.G.mode === 'game' && window.VELSCOUR.G.world, null, { timeout: 15000 });
  if ((await page.evaluate(() => window.VELSCOUR.G.char.name)) !== 'Old 7') fail('slot 1 did not load Old 7');
  await browser.close();
  report(errors);
})();
