// Gameplay options: "Lock skill bar" (auto-play only fills empty slots), "Hide dropped item names" (no ground
// labels, the item still picks up by clicking it), "Auto skill point assignment" off (auto-play keeps the points),
// and the skill tree's Respec button (50 gold x level squared).
const { openGame, report } = require('./harness');

(async () => {
  const { browser, page, errors, shot } = await openGame({ width: 1440, height: 810 });
  await page.click('text=Heroes');
  await page.click('.class-card[data-id="wizard"]');
  await page.click('text=Begin');
  await page.waitForTimeout(1200);
  const fails = [];
  const check = (ok, msg) => { if (!ok) fails.push(msg); console.log((ok ? 'ok   ' : 'FAIL ') + msg); };

  // ---- auto skill points off: auto-play leaves them for the player
  const r1 = await page.evaluate(async () => {
    const { G } = window.VELSCOUR;
    const { Auto } = await import('/src/game/autoplay.js');
    G.char.level = 20; G.char.skillPoints = 12; G.player.recompute();
    G.settings.autoSkillPoints = false; Auto.manageHero();
    const kept = G.char.skillPoints;
    G.settings.autoSkillPoints = true; Auto.manageHero();
    return { kept, after: G.char.skillPoints, learned: Object.values(G.char.skills).reduce((a, b) => a + b, 0) };
  });
  check(r1.kept === 12, `auto skill points off keeps all 12 points (${r1.kept})`);
  check(r1.after === 0, `auto skill points on spends them (${r1.after} left)`);

  // ---- lock skill bar: the player's slots stay, empty ones fill
  const r2 = await page.evaluate(async () => {
    const { G } = window.VELSCOUR;
    const { Auto } = await import('/src/game/autoplay.js');
    const { CLASS_SKILLS } = await import('/src/data/skills.js');
    const learned = CLASS_SKILLS.wizard.filter((s) => G.char.skills[s.id] > 0).map((s) => s.id);
    const mine = Array(15).fill(null); mine[0] = learned[learned.length - 1]; mine[5] = learned[0];
    G.char.bar = mine.slice();
    G.settings.lockSkillBar = true; Auto.arrangeBar();
    const locked = G.char.bar.slice();
    G.settings.lockSkillBar = false; Auto.arrangeBar();
    return { mine, locked, unlocked: G.char.bar.slice(), learned: learned.length };
  });
  check(r2.locked[0] === r2.mine[0] && r2.locked[5] === r2.mine[5], 'locked bar keeps the player\'s slots');
  check(r2.locked.filter(Boolean).length > 2, `locked bar fills empty slots (${r2.locked.filter(Boolean).length} of ${r2.learned} learned)`);
  check(new Set(r2.locked.filter(Boolean)).size === r2.locked.filter(Boolean).length, 'locked bar has no duplicates');
  check(r2.unlocked.join() !== r2.mine.join(), 'unlocked bar is rearranged by auto-play');

  // ---- hide item names: no labels drawn, a click on the item still picks it up
  await page.evaluate(async () => {
    const { G } = window.VELSCOUR;
    const { GroundItem } = await import('/src/game/loot.js');
    const { rollItem } = await import('/src/data/items.js');
    const p = G.player;
    for (let i = 0; i < 6; i++) G.world.addLoot(new GroundItem(p.x + 1.5 + (i % 3) * 0.8, p.y + 1 + Math.floor(i / 3) * 0.8, 'item', { item: rollItem(20, { rarity: i % 5 }) }));
  });
  await page.mouse.move(5, 5); await page.waitForTimeout(300);
  await shot('options_labels_on');
  await page.evaluate(() => { window.VELSCOUR.G.settings.hideItemNames = true; });
  await page.waitForTimeout(300);
  await shot('options_labels_off');
  const target = await page.evaluate(async () => {
    const { G } = window.VELSCOUR;
    const b = (G.lootBoxes || [])[0];
    return b ? { x: b.x, y: b.y, n: G.lootBoxes.length, loot: G.world.loot.length } : null;
  });
  check(target && target.n === 6, `hidden labels keep 6 hit boxes (${target && target.n})`);
  await page.mouse.move(target.x, target.y); await page.waitForTimeout(250);
  await shot('options_labels_hover');
  await page.mouse.click(target.x, target.y); await page.waitForTimeout(2500);
  const left = await page.evaluate(() => window.VELSCOUR.G.world.loot.filter((l) => l.kind === 'item').length);
  check(left === 5, `clicking a hidden-name item picks it up (${left} left on the ground)`);

  // ---- respec
  const before = await page.evaluate(() => { const { G } = window.VELSCOUR; G.char.gold = 30000; G.ui.refresh(); return { gold: G.char.gold, pts: G.char.skillPoints, skills: { ...G.char.skills }, granted: { ...G.char.granted } }; });
  await page.keyboard.press('KeyK'); await page.waitForTimeout(400);
  await shot('options_respec_button');
  await page.click('.respec-btn'); await page.waitForTimeout(300);
  await shot('options_respec_confirm');
  await page.click('.dialog-box button.red'); await page.waitForTimeout(300);
  const after = await page.evaluate(() => { const { G } = window.VELSCOUR; return { gold: G.char.gold, pts: G.char.skillPoints, skills: { ...G.char.skills }, bar: G.char.bar.slice() }; });
  const spent = Object.entries(before.skills).reduce((a, [id, lv]) => a + lv - (before.granted[id] ? 1 : 0), 0);
  check(before.gold - after.gold === 50 * 20 * 20, `respec costs 50 x 20^2 = 20,000 gold (${before.gold - after.gold})`);
  check(after.pts === before.pts + spent, `respec refunds ${spent} points (${after.pts - before.pts})`);
  check(after.bar.every((id) => !id || after.skills[id] > 0), 'bar holds only learned skills after respec');
  await shot('options_respec_done');
  await page.evaluate(() => { const { G } = window.VELSCOUR; G.char.gold = 10; G.ui.refresh(); });
  await page.click('.respec-btn'); await page.waitForTimeout(200);
  const g2 = await page.evaluate(() => window.VELSCOUR.G.char.gold);
  check(g2 === 10, 'respec refused without the gold');

  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  if (await page.$('text=Settings')) { await page.click('text=Settings'); await page.waitForTimeout(300); await shot('options_settings'); }
  report(errors);
  if (fails.length) console.log(`${fails.length} FAILED`);
  await browser.close();
  process.exit(fails.length || errors.length ? 1 : 0);
})();
