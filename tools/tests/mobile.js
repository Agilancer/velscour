// Phone-sized touch run (844x390 landscape, touch + isMobile): title, class select, town,
// vendor, dungeon, joystick drag via CDP touch events, tapping the attack button, skill tree
// and inventory. Check the screenshots in tools/tests/out/ for overlapping or clipped UI.
const { openGame, report } = require('./harness');

(async () => {
  const { browser, ctx, page, errors, shot } = await openGame({ width: 844, height: 390, mobile: true });
  await shot('m1_title');
  await page.tap('text=Heroes');
  await page.waitForTimeout(500);
  await shot('m2_class');
  await page.tap('.class-card[data-id="gunner"]');
  await page.tap('text=Begin');
  await page.waitForTimeout(1500);
  await shot('m3_town');
  await page.evaluate(() => window.VELSCOUR.G.ui.vendor.open('weapons'));
  await page.waitForTimeout(600);
  await shot('m4_vendor');
  await page.evaluate(() => window.VELSCOUR.G.ui.closeAll());
  await page.evaluate(() => { window.VELSCOUR.game.enterDungeon(); window.VELSCOUR.G.godMode = true; });
  await page.waitForTimeout(2500);
  // Drag the floating joystick (left half of the screen).
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 150, y: 250 }] });
  for (let i = 0; i < 20; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 150 + i * 2, y: 250 + i }] }); await page.waitForTimeout(50); }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  // Tap the main attack button repeatedly.
  for (let i = 0; i < 10; i++) { await page.tap('.tbtn.main'); await page.waitForTimeout(120); }
  await shot('m5_dungeon');
  await page.evaluate(async () => { const { toggleTree } = await import('/src/ui/skills.js'); toggleTree(); });
  await page.waitForTimeout(500);
  await shot('m6_tree');
  await page.evaluate(async () => { window.VELSCOUR.G.ui.closeAll(); const { toggleInventory } = await import('/src/ui/inventory.js'); toggleInventory(); });
  await page.waitForTimeout(500);
  await shot('m7_inventory');
  report(errors, 30);
  await browser.close();
})();
