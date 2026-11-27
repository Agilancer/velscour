// "fear phobos" typed to Velscour (src/game/deathgift.js grantFearPhobos): a test cheat. The hero is level 100 with
// Mythic +10 gear, ACT III is done up to the Castle Gate, 1,000 Infernal Marks are added, and the hero stands on Castle
// Velscour's Floor 1, marked as cheated (never on the Honour Board). Usage: node tools/tests/fearphobos.js [classes]
const { openGame, report } = require('./harness');

(async () => {
  const classes = (process.argv[2] || 'paladin').split(',');
  const { browser, page, errors, shot } = await openGame();
  let fail = 0;
  for (const cls of classes) {
    await page.evaluate(async (cls) => { await window.VELSCOUR.game.newChar(cls, 'Fear'); }, cls);
    await page.waitForTimeout(1000);
    await page.evaluate(() => window.VELSCOUR.game.openVelscourContact());
    await page.fill('#velscour-message', 'Fear Phobos');
    await page.$eval('.velscour-contact-dialog .btn.red', (b) => b.click());
    await page.waitForFunction(() => window.VELSCOUR.G.phobosFloor === 1 && window.VELSCOUR.G.world?.biome?.id?.startsWith('cv_'), null, { timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(2500);
    const r = await page.evaluate(async () => {
      const { G } = window.VELSCOUR, c = G.char, S = c.phobos;
      const { QUESTS } = await import('/src/game/phobos.js');
      const { Board } = await import('/src/game/leaderboard.js');
      const { marksTotal } = await import('/src/game/marks.js');
      const gear = Object.values(c.equip).filter(Boolean).map((it) => [it.rarity, it.upg]);
      return { level: c.level, floor: G.phobosFloor, biome: G.world.biome.id, quest: QUESTS[S.q]?.id, gate: S.gate, wards: S.wards.length, hubs: Object.keys(S.hubs).length,
        gear, cheated: c.cheated, marks: marksTotal(), board: await Board.submit(c, 5, 100), hp: G.player.maxHp };
    });
    console.log(cls, JSON.stringify(r));
    const ok = r.level === 100 && r.floor === 1 && r.biome.startsWith('cv_') && r.quest === 'wing0' && r.gate && r.wards >= 12 && r.hubs === 3
      && r.gear.length >= 10 && r.gear.every((g) => g[0] === 5 && g[1] === 10) && r.cheated === true && r.marks >= 1000 && r.board && r.board.barred;
    if (!ok) { console.log(`FAIL ${cls}`); fail++; }
    await shot(`fearphobos_${cls}`);
  }
  if (fail) process.exitCode = 1;
  await report(errors);
  await browser.close();
})();
