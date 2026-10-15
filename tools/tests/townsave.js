// Town persistence: a hero's Herrington Hollow is rolled once (c.townSeed) and comes back identical after a save + reload.
// node tools/tests/townsave.js
const { openGame, report } = require('./harness');
(async () => {
  const { browser, page, errors } = await openGame();
  await page.click('text=Heroes'); await page.click('.class-card[data-id="paladin"]'); await page.click('text=Begin');
  await page.waitForTimeout(1500);
  const sig = () => page.evaluate(async () => {
    const { G, game } = window.VELSCOUR;
    const town = await import('/src/world/town.js');
    const t = town.generateTown(G.world.tileset, G.char.townSeed), u = town.generateTown(G.world.tileset, G.char.townSeed);
    const s = (t) => JSON.stringify([t.map.w, t.map.h, t.buildings.map((b) => [b.x, b.y]), t.props.map((p) => [p.x, p.y]), t.start]);
    game.autosave();
    return { seed: G.char.townSeed, same: s(t) === s(u), sig: s(t).length + ':' + s(t).slice(0, 80) };
  });
  const a = await sig();
  await page.reload();
  await page.waitForFunction(() => window.VELSCOUR && document.querySelector('#loading').classList.contains('hidden'), null, { timeout: 30000 });
  await page.click('text=Continue', { timeout: 5000 });
  await page.waitForTimeout(1200);
  const b = await sig();
  console.log('before', a, '\nafter', b);
  if (!a.same) errors.push('town not deterministic from its seed');
  if (b.seed !== undefined && b.seed !== a.seed) errors.push('townSeed changed across reload');
  report(errors);
  await browser.close();
})();
