// End-to-end game loop through the real UI: new hero -> town portal dialog -> dungeon ->
// boss killed -> exit dialog -> Depth 2 -> death screen -> back in town at Depth 1 ->
// reload page -> Continue restores the save.
const { openGame, report } = require('./harness');

(async () => {
  const { browser, page, errors, shot } = await openGame();
  await page.click('text=Heroes'); await page.click('.class-card[data-id="bard"]'); await page.click('text=Begin');
  await page.waitForTimeout(1000);
  // Stand next to the town portal and interact with it.
  await page.evaluate(() => { const { G } = window.VELSCOUR; const po = G.world.portals[0]; G.player.x = po.x - 1; G.player.y = po.y; G.player.interact = po; });
  await page.waitForTimeout(800);
  await shot('flow1_portal_dialog');
  await page.click('text=Enter');
  await page.waitForTimeout(2500);
  // Kill the guardian instantly, then walk into the exit.
  await page.evaluate(async () => {
    const { G } = window.VELSCOUR; const { kill } = await import('/src/game/combat.js');
    const b = G.world.boss; b.awake = true; kill(b, G.player, {});
    const ex = G.world.portals.find((p) => p.type === 'exit'); G.player.x = ex.x - 1; G.player.y = ex.y; G.player.interact = ex;
  });
  await page.waitForTimeout(1200);
  await shot('flow2_exit_dialog');
  await page.click('text=/Descend to Depth 2/');
  await page.waitForTimeout(2500);
  const d = await page.evaluate(() => ({ depth: window.VELSCOUR.G.world.depth, biome: window.VELSCOUR.G.world.biome.name, sp: window.VELSCOUR.G.char.skillPoints }));
  console.log('after descend', JSON.stringify(d));
  if (d.depth !== 2) { console.log('FAIL: expected depth 2'); process.exitCode = 1; }
  // Die.
  await page.evaluate(async () => { const { G } = window.VELSCOUR; const { hit } = await import('/src/game/combat.js'); const m = G.world.creatures.find((c) => c.team === 'enemy'); hit(m, G.player, 999999, 'fire', {}); });
  await page.waitForTimeout(2600);
  await shot('flow3_death');
  await page.click('text=Return to Town');
  await page.waitForTimeout(1500);
  const after = await page.evaluate(() => ({ kind: window.VELSCOUR.G.world.kind, depth: window.VELSCOUR.G.char.depth, deaths: window.VELSCOUR.G.char.deaths, hp: window.VELSCOUR.G.player.hp }));
  console.log('after death', JSON.stringify(after));
  if (after.kind !== 'town' || after.depth !== 1) { console.log('FAIL: expected town at depth 1'); process.exitCode = 1; }
  // Reload and continue from the save.
  await page.reload();
  await page.waitForFunction(() => window.VELSCOUR && document.querySelector('#loading').classList.contains('hidden'), null, { timeout: 30000 });
  await shot('flow4_continue');
  await page.click('text=Continue');
  await page.waitForTimeout(1200);
  console.log('continued', await page.evaluate(() => window.VELSCOUR.G.char.name + ' depth ' + window.VELSCOUR.G.char.depth));
  report(errors);
  await browser.close();
})();
