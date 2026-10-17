// Monster traits, ambush arrivals and new bullet patterns, plus the MADNESS meter and button.
// node tools/tests/mayhem.js   (screenshots: mayhem_<entry>.png, mayhem_moves.png, mayhem_madness.png)
const { openGame, report } = require('./harness');

(async () => {
  const { browser, page, errors, shot } = await openGame();
  await page.click('text=Heroes'); await page.click('.class-card[data-id="wizard"]'); await page.click('text=Begin');
  await page.waitForTimeout(800);
  await page.evaluate(() => { const { G, game } = window.VELSCOUR; G.godMode = true; G.char.depth = 30; game.enterDungeon(); });
  await page.waitForTimeout(2500);
  const traits = await page.evaluate(() => {
    const { G } = window.VELSCOUR, n = {};
    for (const c of G.world.creatures) if (c.trait) n[c.trait] = (n[c.trait] || 0) + 1;
    return { n, roster: G.world.roster, hunters: G.world.creatures.filter((c) => c.hunter).map((c) => c.name).slice(0, 3) };
  });
  console.log('level traits', JSON.stringify(traits));
  let fail = false;
  for (const kind of ['drop', 'teleport', 'burrow', 'wall']) {
    const r = await page.evaluate(async (kind) => {
      const { G } = window.VELSCOUR; const M = await import('/src/game/mayhem.js');
      for (const c of G.world.creatures) if (c.team === 'enemy' && c !== G.world.boss && c.ambusher) c.dead = true;
      return M.ambush(G.world, kind, 4);
    }, kind);
    await page.waitForTimeout(450);
    await shot('mayhem_' + kind);
    await page.waitForTimeout(1600);
    const st = await page.evaluate(() => window.VELSCOUR.G.world.creatures.filter((c) => c.ambusher && !c.dead).map((c) => [!!c.entering, c.targetable, c.awake]));
    const stuck = st.filter((s) => s[0] || s[1] === false).length;
    console.log(kind, 'spawned', r, 'still entering', stuck);
    if (!r || stuck) fail = true;
  }
  // every new move from a monster next to the hero
  const moves = ['spiral', 'cross', 'rings', 'wall', 'rain', 'homing', 'phase', 'burrow'];
  const res = await page.evaluate(async (moves) => {
    const { G } = window.VELSCOUR, w = G.world, p = G.player, out = {};
    const { makeMonster } = await import('/src/game/monster.js');
    for (const k of moves) {
      const [x, y] = w.map.randomNear(p.x, p.y, 6);
      const m = makeMonster(w, 'wraith', w.biome, 30, 'normal', x, y);
      m.fly = false; w.add(m);
      const d = Math.hypot(m.x - p.x, m.y - p.y);
      out[k] = m.beginMove(k, p, Math.max(d, 4)) !== false;
      for (let i = 0; i < 200 && m.state !== 'idle'; i++) { m.update(1 / 30); w.hazards.forEach((h) => h.update(1 / 30)); }
      out[k] = out[k] && m.state === 'idle' && m.targetable !== false;
      m.dead = true;
    }
    return out;
  }, moves);
  console.log('moves', JSON.stringify(res));
  if (Object.values(res).some((v) => !v)) fail = true;
  await shot('mayhem_moves');
  // MADNESS: fills over MADNESS_FILL (420 s), button only for the hero
  const mad = await page.evaluate(async () => {
    const { G } = window.VELSCOUR; const M = await import('/src/game/mayhem.js');
    G.char.madness = 0; G.char.madT = 0;
    const halfway = M.MADNESS_FILL / 2;
    for (let i = 0; i < halfway * 30; i++) M.madnessTick(1 / 30);
    const half = G.char.madness;
    for (let i = 0; i < (halfway + 1) * 30; i++) M.madnessTick(1 / 30);
    return { half, full: G.char.madness, ready: M.madnessReady() };
  });
  await page.waitForFunction(() => !document.querySelector('#madness-btn').classList.contains('hidden'), null, { timeout: 3000 }).catch(() => {});
  const btn = await page.evaluate(() => !document.querySelector('#madness-btn').classList.contains('hidden'));
  await shot('mayhem_madness_ready');
  console.log('pre', JSON.stringify(await page.evaluate(() => ({ m: window.VELSCOUR.G.char.madness, t: window.VELSCOUR.G.char.madT, k: window.VELSCOUR.G.world.kind, dead: window.VELSCOUR.G.player.dead }))));
  const sp0 = await page.evaluate(() => window.VELSCOUR.G.player.speedMul());
  await page.click('#madness-btn', { force: true });
  await page.waitForTimeout(500);
  const after = await page.evaluate(() => ({ madT: window.VELSCOUR.G.char.madT, sp: window.VELSCOUR.G.player.speedMul(), btnAfter: !document.querySelector('#madness-btn').classList.contains('hidden') }));
  await shot('mayhem_madness');
  console.log('madness', JSON.stringify({ ...mad, btn, sp0, ...after }));
  if (Math.abs(mad.half - 0.5) > 0.02 || !mad.ready || !btn || !(after.madT > 29) || after.sp < sp0 * 1.9 || after.btnAfter) fail = true;
  if (fail) process.exitCode = 1;
  report(errors);
  if (fail) process.exitCode = 1;
  await browser.close();
})();
