// The 3D Castle (docs/CASTLE_3D.md) in the game: the hero on the wall-walk, on a stair, in the gate tunnel, in the throne
// room (the keep's roof lifted), outside the keep, at the drawbridge, and an overview; walkability checks on the way.
//   node tools/tests/castle3d.js [view,view,...]
// Screenshots: tools/tests/out/castle3d_<view>.png.
const { openGame, report } = require('./harness');
const only = (process.argv[2] || '').split(',').filter(Boolean);
(async () => {
  const { browser, page, errors, shot } = await openGame({ width: 1440, height: 900 });
  try {
    const info = await page.evaluate(async () => {
      const { G, game } = window.VELSCOUR;
      await game.newChar('paladin', 'Castle 3D QA');
      await (await import('/src/gfx/castle.js')).loadCastlePack();
      await (await import('/src/gfx/castle3dart.js')).loadCastle3D();
      G.char.depth = 19; G.godMode = true;
      const { BIOME_BY_ID } = await import('/src/data/biomes.js');
      game.buildDungeon(19, BIOME_BY_ID.castle);
      G.world.creatures = G.world.creatures.filter((c) => c === G.player); G.world.npcs.length = 0; G.world.rebuildGrid();
      const m = G.world.map;
      return { hgt: !!m.hgt, deck: m.rampartDeck.reduce((a, b) => a + b, 0), posts: m.rampartPosts.length, doors: m.castleDoors.length };
    });
    console.log('castle', JSON.stringify(info));
    if (!info.hgt) errors.push('[castle3d] the Castle has no height map');
    // can the hero walk from the bailey up the south stair onto the wall-walk, and from the courtyard into the throne room?
    const paths = await page.evaluate(() => {
      const { G } = window.VELSCOUR, m = G.world.map, at = (x, y) => m.hgt[m.tileIdx(x, y)];
      const p = (a, b) => { const r = m.findPath(a[0], a[1], b[0], b[1]); return r ? r.length : -1; };
      return { wall: p([150.5, 190.5], [160.5, 199.5]), throne: p([167.5, 139.5], [143.5, 112.5]), walkLv: at(160.5, 199.5), throneLv: at(143.5, 120.5) };
    });
    console.log('paths', JSON.stringify(paths));
    if (paths.wall < 0) errors.push('[castle3d] no path up onto the outer wall-walk');
    if (paths.throne < 0) errors.push('[castle3d] no path into the throne room');
    const views = [
      ['walltop', 160.5, 199.5, 1.0], ['stair', 143.5, 197.5, 1.1], ['tunnel', 168.6, 199.5, 1.1], ['throne', 143.5, 118.5, 0.9],
      ['keep_front', 167.5, 142.5, 0.8], ['gate_front', 169, 214, 0.8], ['inner_walk', 180.5, 171.5, 1.0], ['cathedral_in', 196, 118, 0.85],
      ['door_open', 166.5, 137.2, 1.1], ['drawbridge_up', 169, 222, 0.9], ['drawbridge_down', 169, 213.5, 0.9],
      ['overview', 169, 140, 0.24],
    ].filter((v) => !only.length || only.includes(v[0]));
    for (const [name, x, y, zoom] of views) {
      await page.evaluate(async ([x, y, zoom]) => {
        const { G } = window.VELSCOUR, { camera } = await import('/src/core/view.js');
        G.player.x = x; G.player.y = y;
        G.settings.zoom = 1; camera.computeZoom(); G.settings.zoom = zoom / camera.zoom; camera.computeZoom();
        G.world.darkK = 0; G.world.night = false; G.world.raining = false; camera.follow(x, y, 0, true);
      }, [x, y, zoom]);
      await page.waitForTimeout(name === 'overview' ? 4000 : name === 'drawbridge_down' ? 3600 : 1200);
      await shot('castle3d_' + name);
      if (name === 'drawbridge_down') {
        const st = await page.evaluate(() => { const { G } = window.VELSCOUR, D = G.world.map.drawbridge; return { down: D.down, open: D.tiles.every((i) => !G.world.map.block[i]) }; });
        console.log('drawbridge', JSON.stringify(st));
        if (!st.down || !st.open) errors.push('[castle3d] the drawbridge did not come down and open the crossing');
      }
    }
  } catch (e) { errors.push('[castle3d] ' + e.message); }
  report(errors);
  await browser.close();
})();
