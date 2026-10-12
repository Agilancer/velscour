// Builds the Depth 100 throne arena (DEMON LORD VELSCOUR) and a normal Depth 37 guardian,
// lets each fight for a few seconds with god mode on, and prints the boss setup.
const { openGame, report } = require('./harness');

(async () => {
  const { browser, page, errors, shot } = await openGame();
  const info = await page.evaluate(async () => {
    const { G, game } = window.VELSCOUR;
    await game.newChar('dragon_knight', 'Hero');
    document.querySelectorAll('.screen').forEach((s) => s.remove()); G.ui.modalCount = 0;
    const { BIOME_BY_ID } = await import('/src/data/biomes.js');
    G.char.depth = 100; G.char.level = 90;
    G.player.recompute(); G.player.hp = G.player.maxHp;
    game.buildDungeon(100, BIOME_BY_ID.throne);
    const b = G.world.boss;
    G.player.x = b.x; G.player.y = b.y + 6;
    G.godMode = true;
    for (let i = 0; i < 200; i++) G.world.update(1 / 30);
    return { boss: b.name, hp: Math.round(b.maxHp), awake: b.awake, patterns: b.patterns.join(','), hazards: G.world.hazards.length };
  });
  await page.waitForTimeout(1500);
  await shot('boss_velscour');
  const info2 = await page.evaluate(async () => {
    const { G, game } = window.VELSCOUR;
    const { BIOME_BY_ID } = await import('/src/data/biomes.js');
    G.char.depth = 37;
    game.buildDungeon(37, BIOME_BY_ID.molten);
    const b = G.world.boss;
    G.player.x = b.x; G.player.y = b.y + 4;
    for (let i = 0; i < 150; i++) G.world.update(1 / 30);
    return { boss: b.name, arch: b.arch, hp: Math.round(b.maxHp), patterns: b.patterns.join(','), el: b.el };
  });
  await page.waitForTimeout(800);
  await shot('boss_depth37');
  console.log(JSON.stringify(info));
  console.log(JSON.stringify(info2));
  report(errors);
  await browser.close();
})();
