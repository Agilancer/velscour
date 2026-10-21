// 3D-baked arches (tools/arch3d_bake.js) in a live dungeon: finds one of the given design in the biome and shoots it with
// the hero in front of it (an SE or SW one, front art toward the camera), under it and behind it (depth sorting of the slices), at game zoom.
//   node tools/tests/arch3d.js [biome] [design]       (default astral_plane chapel_lancet)
const { openGame, report } = require('./harness');

(async () => {
  const biome = process.argv[2] || 'astral_plane', design = process.argv[3] || 'chapel_lancet';
  const { browser, page, errors, shot } = await openGame({ width: 1280, height: 720 });
  await page.click('text=Heroes'); await page.click('.class-card[data-id="paladin"]'); await page.click('text=Begin');
  await page.waitForTimeout(800);
  const found = await page.evaluate(async ([id, design]) => {
    const { G, game } = window.VELSCOUR;
    const { BIOMES } = await import('/src/data/biomes.js');
    const { loadBiomeArt, biomeTileSet } = await import('/src/core/assets.js');
    const b = BIOMES.find((x) => x.id === id);
    await loadBiomeArt(b);
    for (let i = 0; i < 40; i++) {
      game.buildDungeon(2 + i * 3, b);
      const set = biomeTileSet(b), mine = new Set([...(set.arches[design]?.SE || []), ...(set.arches[design]?.SW || [])]);   // facing the camera
      const a = G.world.map.walls.find((w) => w.kind === 'arch' && mine.has(w.r));
      if (a) { G.world.creatures = G.world.creatures.filter((c) => c.team !== 'enemy'); G.godMode = true; window.__arch = { x: a.x, y: a.y, axis: a.axis }; return true; }
    }
    return false;
  }, [biome, design]);
  if (!found) errors.push(`[arch3d] no ${design} arch in 40 ${biome} levels`);
  else {
    await page.evaluate(async () => { const { camera } = await import('/src/core/view.js'); window.VELSCOUR.G.settings.zoom = 1.6; camera.computeZoom(); });
    for (const [name, off] of [['front', 1.6], ['under', 0], ['behind', -1.6]]) {
      await page.evaluate((off) => {
        const { G } = window.VELSCOUR, a = window.__arch, n = a.axis === 'x' ? [0, 1] : [1, 0];
        G.player.x = a.x + n[0] * off + (a.axis === 'x' ? 0.5 : 0); G.player.y = a.y + n[1] * off + (a.axis === 'y' ? 0.5 : 0);
      }, off);
      await page.waitForTimeout(name === 'front' ? 2500 : 700);
      await shot(`arch3d_${biome}_${design}_${name}`);
      // where the arch's ground centre is on screen, for cropping the shots
      console.log('arch at', name, JSON.stringify(await page.evaluate(async () => {
        const { camera } = await import('/src/core/view.js'); const a = window.__arch;
        return camera.tileToScreen(a.x + (a.axis === 'x' ? 0 : 0), a.y).map(Math.round);
      })));
    }
  }
  report(errors);
  await browser.close();
})();
