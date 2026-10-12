// Wall rendering check: build dungeons in the given biomes, park the hero in a wall-heavy spot (with
// monsters moved away) and screenshot it. Look at the shots: wall seams and gaps don't throw errors.
//   node tools/tests/walls.js [prefix] [biome,biome,...]      e.g. walls catacombs,frozen,molten
//   ZOOM=3 node tools/tests/walls.js                          close-up (default zoom 1.5)
const { openGame, report } = require('./harness');

(async () => {
  const prefix = process.argv[2] || 'walls';
  const biomes = (process.argv[3] || 'catacombs,catacombs,catacombs').split(',');
  const { browser, page, errors, shot } = await openGame({ width: 1280, height: 720 });
  await page.click('text=New Hero'); await page.click('.class-card[data-id="paladin"]'); await page.click('text=Begin');
  await page.waitForTimeout(800);
  for (let n = 0; n < biomes.length; n++) {
    await page.evaluate(async (b) => {
      const { G, game } = window.VELSCOUR; G.godMode = true;
      const { BIOME_BY_ID } = await import('/src/data/biomes.js');
      const { loadBiomeArt } = await import('/src/core/assets.js');
      await loadBiomeArt(BIOME_BY_ID[b]);
      game.buildDungeon(3, BIOME_BY_ID[b]);
    }, biomes[n]);
    await page.waitForTimeout(1200);
    await page.evaluate((n) => {
      const { G } = window.VELSCOUR; const m = G.world.map;
      for (const c of G.world.creatures) if (c !== G.player) { c.x = -999; c.y = -999; }
      // a walkable tile with plenty of void around it (corridor bends, room corners); vary the pick per shot
      const spots = [];
      for (let y = 3; y < m.h - 3; y++) for (let x = 3; x < m.w - 3; x++) {
        if (!m.walkableTile(x, y)) continue;
        let s = 0; for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) if (!m.tile(x + dx, y + dy)) s++;
        if (s > 10 && s < 26) spots.push([x, y]);
      }
      const [x, y] = spots[(spots.length * (0.3 + 0.2 * n)) | 0];
      G.player.x = x + 0.5; G.player.y = y + 0.5;
    }, n);
    await page.evaluate(async (z) => { const { camera } = await import('/src/core/view.js'); camera.zoom = z; }, +(process.env.ZOOM || 1.5));
    await page.waitForTimeout(4500); // let the biome banner fade
    await shot(`${prefix}_${n}`);
  }
  report(errors);
  await browser.close();
})();
