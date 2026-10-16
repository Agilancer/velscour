// Town check: for a few town seeds (each hero rolls their own Herrington Hollow), every vendor and the portal must be
// reachable from the start; screenshots of the plaza, the portal yard and a zoomed-out view of each town.
// node tools/tests/town.js [seeds]   (default 3 random seeds plus 1337)
const { openGame, report } = require('./harness');
(async () => {
  const { browser, page, errors, shot } = await openGame();
  await page.click('text=Heroes'); await page.click('.class-card[data-id="paladin"]'); await page.click('text=Begin');
  await page.waitForTimeout(4000); // let the first-entry banner clear before visual review
  const seeds = process.argv[2] ? process.argv[2].split(',').map(Number) : [1337, ...[0, 1, 2].map(() => (Math.random() * 1e9) | 0)];
  for (const seed of seeds) {
    const info = await page.evaluate((seed) => {
      const { G, game } = window.VELSCOUR;
      G.char.townSeed = seed; game.enterTown();
      const w = G.world, m = w.map, p = G.player;
      const out = { size: `${m.w}x${m.h}`, buildings: w.buildings.length, props: w.props.length,
        oddTownProps: w.props.filter((p) => p.spr && p.spr.name && p.spr.name.startsWith('town_scatter_')).length,
        sigilFloors: m.v.filter((v) => v >= 126).length, reach: {} };
      for (const t of [...w.npcs.filter((n) => n.vendor), ...w.portals]) {
        const path = m.findPath(p.x, p.y, t.x, t.y, 6000);
        out.reach[t.vendor ? t.vendor.id : 'portal'] = !!(path && path.length);
      }
      const po = w.portals[0], c = { x: p.x, y: p.y };
      out.views = { plaza: [c.x, c.y], portal: [po.x - 2, po.y - 2], mid: [m.w / 2, m.h / 2] };
      return out;
    }, seed);
    console.log('seed', seed, info.size, 'buildings', info.buildings, 'props', info.props, 'reachable', JSON.stringify(info.reach));
    if (Object.values(info.reach).some((v) => !v) || Object.keys(info.reach).length < 9) errors.push(`town ${seed}: unreachable or missing target`);
    if (info.oddTownProps || info.sigilFloors) errors.push(`town ${seed}: out-of-place monuments or sigil floors remain`);
    const view = async (name, [x, y], zoom = 1) => {
      await page.evaluate(([x, y, zoom]) => {
        const { G } = window.VELSCOUR; G.player.x = x; G.player.y = y;
        return import('/src/core/view.js').then((v) => { v.camera.zoom = zoom; v.camera.follow(x, y, 0, true); });
      }, [x, y, zoom]);
      await page.waitForTimeout(500); await shot(name);
    };
    await view(`town_${seed}_plaza`, info.views.plaza);
    await view(`town_${seed}_portal`, info.views.portal);
    await view(`town_${seed}_wide`, info.views.mid, 0.42);
    const rain = await page.evaluate(() => {
      const { G } = window.VELSCOUR; G.world.raining = true;
      return Promise.all([import('/src/world/town.js'), import('/src/core/view.js')]).then(([town, view]) => {
        view.camera.zoom = 1; view.camera.follow(G.player.x, G.player.y, 0, true);
        return {
          belowThreshold: town.rollTownWeather(() => 0.249), atThreshold: town.rollTownWeather(() => 0.25),
        };
      });
    });
    await page.waitForTimeout(700);
    const rainDrops = await page.evaluate(() => import('/src/gfx/vfx.js').then(({ particles }) => particles.filter((p) => p.type === 'streak').length));
    if (!rain.belowThreshold || rain.atThreshold || !rainDrops) errors.push(`town ${seed}: rain roll or rain particles failed`);
    await shot(`town_${seed}_rain`);
    await page.evaluate(() => { window.VELSCOUR.G.world.raining = false; });
  }
  report(errors);
  await browser.close();
})();
