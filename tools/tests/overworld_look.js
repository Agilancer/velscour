// Look at an overworld: screenshots of a few spots of a seeded map with the hero there and no monsters, for art review
// (scatter in context, sizes against the hero, height maps). Shots: tools/tests/out/look_<biome>_<n>.png.
// Start server at repo root: python3 -m http.server 8123
// Run: node tools/tests/overworld_look.js [biome] [seed] [x,y,zoom;x,y,zoom...]
//   biome: overworld (the Forsaken Wilds, default), sea_of_sand, dark_forest, mountainside, castle
const { openGame, report } = require('./harness');
const biome = process.argv[2] || 'overworld', seed = +(process.argv[3] || 12345);
const DEFAULT = {
  overworld: '10,61,.8;20.5,20.5,.8;36.5,35.5,.8;30,42,.8;54.5,49.5,.8;50,30,.8;36,10,.55;36,36,.3',
  sea_of_sand: '10,61,.8;18.5,19.5,.8;36.5,35.5,.8;53,51,.8;45,25,.8;36,36,.3',
  dark_forest: '20,170,.8;96,96,.8;60,120,.8;150,60,.8;96,96,.25',
  mountainside: '8,42,.8;25,25,.8;42,8,.8;25,25,.3',
};
const spots = (process.argv[4] || DEFAULT[biome] || '36,36,.6').split(';').map((s) => s.split(',').map(Number));
(async () => {
  const { browser, page, errors, shot } = await openGame({ width: 1440, height: 900 });
  try {
    await page.evaluate(async ([biome, seed]) => {
      const { G, game } = window.VELSCOUR;
      await game.newChar('paladin', 'Look QA');
      const { BIOME_BY_ID, BETA_BIOMES } = await import('/src/data/biomes.js');
      const B = BIOME_BY_ID[biome] || BETA_BIOMES.find((b) => b.id === biome);
      G.char.depth = 6; G.godMode = true; G.overworldSeed = seed;
      await game.loadLevelArt(B);
      const R = Math.random; let s = seed >>> 0; Math.random = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
      try { game.buildDungeon(6, B); } finally { Math.random = R; }
      G.world.creatures = G.world.creatures.filter((c) => c === G.player); G.world.rebuildGrid();
    }, [biome, seed]);
    await page.waitForTimeout(2500);
    for (let k = 0; k < spots.length; k++) {
      const [x, y, zoom] = spots[k];
      await page.evaluate(async ([x, y, zoom]) => {
        const { G } = window.VELSCOUR, { camera } = await import('/src/core/view.js');
        const m = G.world.map, [px, py] = m.walkable(x, y) ? [x, y] : (m.randomNear(x, y, 5) || [x, y]);
        G.player.x = px; G.player.y = py;
        G.settings.zoom = 1; camera.computeZoom(); G.settings.zoom = zoom / camera.zoom; camera.computeZoom();
        G.world.darkK = 0; G.world.night = false; G.world.raining = false; camera.follow(px, py, 0, true);
      }, [x, y, zoom]);
      await page.waitForTimeout(600);
      await shot(`look_${biome}_${k}`);
    }
  } catch (e) { errors.push(String(e.stack || e)); }
  report(errors);
  await browser.close();
})();
