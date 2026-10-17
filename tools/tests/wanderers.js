// Overworld wanderers (game/wanderers.js): townsfolk walk the Wilds/Castle/Sea of Sand with animated sheets, flee
// monsters, and give bounties that auto-play takes and finishes. Usage: node tools/tests/wanderers.js [minutes=3]
const { openGame, report } = require('./harness');
const minutes = +(process.argv[2] || 3);
(async () => {
  const { browser, page, errors, shot } = await openGame({ width: 1280, height: 720 });
  await page.evaluate(async () => { const { G, game } = window.VELSCOUR; await game.newChar('ranger', 'Walker'); document.querySelectorAll('.screen').forEach((s) => s.remove()); G.ui.modalCount = 0; });
  const fails = [];
  for (const id of ['overworld', 'castle', 'sea_of_sand']) {
    const r = await page.evaluate(async ([id, minutes]) => {
      const { G, game } = window.VELSCOUR;
      const { BIOME_BY_ID } = await import('/src/data/biomes.js');
      const { Auto } = await import('/src/game/autoplay.js');
      if (id === 'castle') await (await import('/src/gfx/castle.js')).loadCastlePack();
      if (id === 'sea_of_sand') await (await import('/src/gfx/seaofsand.js')).loadSeaOfSandPack();
      while (G.char.level < 12) G.player.levelUp();
      G.godMode = true;
      game.buildDungeon(12, BIOME_BY_ID[id]);
      document.querySelectorAll('.screen').forEach((s) => s.remove()); G.ui.modalCount = 0;
      const w = G.world, wn = w.npcs.filter((n) => n.wanderer);
      const start = wn.map((n) => [n.x, n.y]);
      if (!Auto.on) Auto.toggle(true);
      const flips = new Set();
      for (let s = 0; s < minutes * 60 * 30; s++) {
        if (G.world !== w) break;
        G.dt = 1 / 30; G.time += G.dt; G.frame++; game.update(1 / 30);
        for (const n of wn) if (n.walking) flips.add(n.flip);
        if (s % 300 === 0) await new Promise((r) => setTimeout(r, 0));
      }
      Auto.toggle(false); game.render();
      return { id, wanderers: wn.length, moved: wn.filter((n, i) => Math.hypot(n.x - start[i][0], n.y - start[i][1]) > 2).length, sheets: wn.every((n) => n.townsfolkSpriteId), bothWays: flips.size === 2,
        bounties: wn.filter((n) => n.bounty).map((n) => `${n.bounty.kind}:${n.bounty.state}`).join(' ') };
    }, [id, minutes]);
    console.log(JSON.stringify(r));
    await shot('wanderers_' + id);
    if (!r.wanderers || r.moved < 2 || !r.sheets) fails.push(`${id}: wanderers ${r.wanderers} moved ${r.moved}`);
    if (!/paid|active/.test(r.bounties)) fails.push(`${id}: no bounty taken (${r.bounties})`);
  }
  console.log(fails.length ? 'FAIL\n' + fails.join('\n') : 'PASS');
  if (fails.length) process.exitCode = 1;
  report(errors);
  await browser.close();
})();
