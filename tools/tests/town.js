// Town pack check: screenshots of the plaza, the shop rows, the portal road (zoomed out), and that every vendor
// and the portal can be reached from the start.  node tools/tests/town.js
const { openGame, report } = require('./harness');
(async () => {
  const { browser, page, errors, shot } = await openGame();
  await page.click('text=New Hero'); await page.click('.class-card[data-id="paladin"]'); await page.click('text=Begin');
  await page.waitForTimeout(1500);
  const info = await page.evaluate(() => {
    const { G } = window.VELSCOUR, w = G.world, m = w.map, p = G.player;
    const out = {};
    for (const t of [...w.npcs.filter((n) => n.vendor), ...w.portals]) {
      const path = m.findPath(p.x, p.y, t.x, t.y, 4000);
      out[t.vendor ? t.vendor.id : 'portal'] = !!(path && path.length);
    }
    return out;
  });
  console.log('reachable', JSON.stringify(info));
  if (Object.values(info).some((v) => !v)) errors.push('unreachable town target');
  const view = async (name, x, y, zoom) => {
    await page.evaluate(([x, y, zoom]) => {
      const { G } = window.VELSCOUR; G.player.x = x; G.player.y = y;
      return import('/src/core/view.js').then((v) => { if (zoom) v.camera.zoom = zoom; v.camera.follow(x, y, 0, true); });
    }, [x, y, zoom]);
    await page.waitForTimeout(600); await shot(name);
  };
  await view('town1_plaza', 22, 25.5);
  await view('town2_north', 22, 15);
  await view('town3_west', 15, 22);
  await view('town4_portal', 36, 35);
  await view('town5_wide', 22, 24, 0.5);
  report(errors);
  await browser.close();
})();
