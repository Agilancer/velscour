// The Sky Battle (docs/SKY_BATTLE.md): plays a whole battle per scenario at simulated speed with the hero unkillable,
// clearing the boarders as they land, and checks every phase comes in order: the arrival, five boarding waves with the
// mid-boss after the third, the parley (2,000 talks), the flagship's duel, the hooks, the two captains, the open exit and
// the hoard chest. The cut scenes' camera is checked too: every spoken line frames its speaker between the letterbox
// bars, and the flagship is in the shot when her title card shows. Screenshots of each phase go to
// tools/tests/out/sky_<variant>_*.png.
//   node tools/tests/skyship.js                # the clear-sky scenario
//   node tools/tests/skyship.js storm,night    # these scenarios
//   node tools/tests/skyship.js all [auto]     # all eight; `auto` lets auto-play fight instead of clearing the deck
//   node tools/tests/skyship.js stories        # the thirty stories (docs/SKY_STORIES.md), gauntlets included
//   node tools/tests/skyship.js necromancer,slime_lord
// The first battle is then fought again: every scene it showed has been seen, so each plays at 20x (and at 1x again
// with Settings > "Don't skip cutscenes").
const { openGame, report } = require('./harness');
const arg = process.argv[2] || 'clear';
const auto = process.argv.includes('auto');
const ALL = ['clear', 'storm', 'night', 'fog', 'sunset', 'gale', 'blizzard', 'ash'];

(async () => {
  const { browser, page, errors, shot } = await openGame({ width: 1280, height: 720 });
  const fails = [];
  const STORIES = await page.evaluate(async () => (await import('/src/data/skystories.js')).SKY_STORIES.map((q) => q.id));
  const ids = arg === 'all' ? ALL : arg === 'stories' ? STORIES : arg === 'everything' ? [...ALL, ...STORIES] : arg.split(',');
  await page.evaluate(async (auto) => {
    const { G, game } = window.VELSCOUR;
    await game.newChar('paladin', 'Skyla');
    G.godMode = true;
    G.settings.noSkipCine = true;   // every battle at 1x (the end checks the 20x replay)
    if (auto) { const { Auto } = await import('/src/game/autoplay.js'); Auto.toggle(true); }
  }, auto);
  /** Run the game `sec` simulated seconds (30 updates a second), clearing landed boarders unless auto-play fights;
   * stops early when `until` (a phase name) is reached. Returns the run's state. */
  const run = (sec, until = null, clear = !auto) => page.evaluate(async ([sec, until, clear]) => {
    const { G, game } = window.VELSCOUR;
    const { kill } = await import('/src/game/combat.js');
    const { Cine } = await import('/src/game/cinema.js');
    const { camera } = await import('/src/core/view.js');
    const cam = (window.__skyCam ||= { lines: 0, miss: [], galleon: null });
    /** Is world px (x, y) in the frame between the letterbox bars, clear of the edges? */
    const inFrame = ([x, y]) => { const [sx, sy] = camera.toScreen(x, y), bar = G.H * 0.13; return sx > G.W * 0.1 && sx < G.W * 0.9 && sy > bar + 4 && sy < G.H - bar - 4; };
    for (let i = 0; i < sec * 30; i++) {
      G.time += 1 / 30; game.update(1 / 30);
      const r = G.world.skyRun;
      if (G.cine) {   // the camera: each line frames its speaker once the shot has settled, the flagship is in her card's shot
        const L = Cine.line, st = Cine.steps[Cine.i];
        if (L && L.focus && st && st.say && !st._checked && L.t >= st.dur * 0.6) { st._checked = true; cam.lines++; if (!inFrame(L.focus())) cam.miss.push(`${r.phase}: ${L.name} "${L.text.slice(0, 30)}"`); }
        const C = Cine.card, g = G.world.sky.galleon;
        if (C && C.title === (G.world.sky.v.ship || 'THE BLACK MOURNING') && C.t > 1 && cam.galleon === null && g) { const { HW, HH } = await import('/src/core/view.js'); cam.galleon = inFrame([(g.x - g.y) * HW, (g.x + g.y) * HH - g.lv * 4 - 120]); }
      }
      (window.__skySeen ||= new Set()).add(r.phase + (r.phase === 'waves' ? r.wave : ''));
      if (clear && !G.cine && i % 10 === 0) for (const m of G.world.creatures) if (m.sky && !m.dead && !m.entering && m.team === 'enemy') kill(m, G.player);
      if (G.player.hp < G.player.maxHp * 0.5) G.player.hp = G.player.maxHp;
      if (until && (r.phase === until || (until === 'cine' && G.cine))) break;
    }
    game.render();
    const r = G.world.skyRun, S = G.world.sky, exit = G.world.portals.find((q) => q.type === 'exit');
    return { phase: r.phase, wave: r.wave, cine: !!G.cine, boats: S.boats.length, galleon: !!S.galleon, hooks: S.hooks.length, foes: G.world.creatures.filter((m) => m.sky && !m.dead).length,
      exit: exit.active, chest: !!r.chest, completed: r.completed, line: G.cine && window.__cineLine, talk: r.talk };
  }, [sec, until, clear]);
  const look = (x, y, zoom = 1) => page.evaluate(async ([x, y, zoom]) => { const { camera, isoX, isoY } = await import('/src/core/view.js'); camera.x = isoX(x, y); camera.y = isoY(x, y) - 24; camera.zoom = zoom; window.VELSCOUR.game.render(); }, [x, y, zoom]);
  const expect = (ok, what) => { if (!ok) { fails.push(what); console.log('  FAIL', what); } };

  for (const id of ids) {
    console.log(`--- ${id}`);
    await page.evaluate(async ([id, auto]) => {
      const { G, game } = window.VELSCOUR;
      const { BIOME_BY_ID } = await import('/src/data/biomes.js');
      G.char.skyVariant = id; G.char.depth = auto ? 1 : 12;   // auto-play fights it for real: a fresh hero at depth 1
      await game.teleportToBiome(BIOME_BY_ID.skyship);
      if (auto) { const { Auto } = await import('/src/game/autoplay.js'); Auto.toggle(true); }   // the teleport turned it off
    }, [id, auto]);
    let s = await run(0.1);
    expect(s.phase === 'intro', `${id}: starts with the arrival`);
    s = await run(2.5); await shot(`sky_${id}_intro`);
    s = await run(9); await shot(`sky_${id}_gate`);
    s = await run(30, 'waves');
    expect(s.phase === 'waves', `${id}: the arrival ends in the waves (${s.phase})`);
    // the first boat comes alongside: look at the port side amidships
    s = await run(5.2, null, false);
    await look(26, 36, 1); await shot(`sky_${id}_boarding`);
    let shotMid = false;
    for (let k = 0; k < (auto ? 400 : 60) && s.phase !== 'parley'; k++) { s = await run(2, 'parley'); if (s.phase === 'mid' && !shotMid) { shotMid = true; await shot(`sky_${id}_midboss`); } }
    const seen = await page.evaluate(() => [...window.__skySeen]);
    expect([0, 1, 2, 3, 4].every((w) => seen.includes('waves' + w)), `${id}: all five waves came (${seen.join(',')})`);
    expect(seen.includes('mid'), `${id}: the mid-boss came`);
    expect(s.phase === 'parley', `${id}: the parley begins (${s.phase})`);
    for (let k = 0; k < 6; k++) { s = await run(5); await shot(`sky_${id}_parley_${k}`); }
    s = await run(200, 'flagship');   // a story's parley can run two minutes
    expect(s.phase === 'flagship' && s.galleon, `${id}: the flagship comes (${s.phase})`);
    s = await run(8); await look(24, 36, 0.8); await shot(`sky_${id}_duel`);
    s = await run(auto ? 400 : 60, 'hooks');
    expect(s.phase === 'hooks', `${id}: the hooks fly (${s.phase})`);
    s = await run(6); await shot(`sky_${id}_hooks`);
    s = await run(40, 'final');
    expect(s.phase === 'final', `${id}: the captains board (${s.phase})`);
    s = await run(1, null, false); await shot(`sky_${id}_final`);
    const gauntlet = await page.evaluate(() => !!window.VELSCOUR.G.world.sky.v.gauntlet);
    if (gauntlet) {   // the master's champions over the rail, then the master himself
      s = await run(auto ? 600 : 60, 'gauntlet'); s = await run(1.5, null, false); await shot(`sky_${id}_gauntlet`);
      s = await run(auto ? 900 : 200, 'master'); s = await run(2, null, false); await shot(`sky_${id}_master`);
    }
    s = await run(auto ? 900 : gauntlet ? 200 : 40, 'victory');
    if (gauntlet) { const ph = await page.evaluate(() => [...window.__skySeen]); expect(ph.includes('gauntlet') && ph.includes('master') && ph.includes('masterdead'), `${id}: the gauntlet and its master (${ph.join(',')})`); }
    s = await run(30, 'done');
    expect(s.completed && s.exit && s.chest, `${id}: victory opens the exit and lays the hoard (${JSON.stringify(s)})`);
    s = await run(2); await shot(`sky_${id}_victory`);
    const cam = await page.evaluate(() => window.__skyCam);
    expect(cam.miss.length === 0, `${id}: every line frames its speaker (${cam.miss.length} of ${cam.lines} missed: ${cam.miss.slice(0, 3).join('; ')})`);
    expect(cam.galleon === true, `${id}: the flagship is in the shot under her title card (${cam.galleon})`);
    console.log(`  phases: ${(await page.evaluate(() => [...window.__skySeen])).join(' > ')}; talk #${s.talk}; ${cam.lines} lines framed; ${errors.length} errors so far`);
    await page.evaluate(() => { window.__skySeen = new Set(); window.__skyCam = null; });
  }
  // seen scenes fast-forward: the arrival again takes a fraction of the time, unless "Don't skip cutscenes"
  const intro = (noSkip) => page.evaluate(async ([id, noSkip]) => {
    const { G, game } = window.VELSCOUR;
    const { BIOME_BY_ID } = await import('/src/data/biomes.js');
    G.settings.noSkipCine = noSkip; G.char.skyVariant = id;
    await game.teleportToBiome(BIOME_BY_ID.skyship);
    let t = 0;
    for (; t < 60 && G.world.skyRun.phase === 'intro'; t += 1 / 30) { G.time += 1 / 30; game.update(1 / 30); }
    G.settings.noSkipCine = false;
    return t;
  }, [ids[0], noSkip]);
  const slow = await intro(true), quick = await intro(false);
  console.log(`--- seen again: the arrival takes ${slow.toFixed(1)} s with "Don't skip cutscenes", ${quick.toFixed(1)} s without`);
  expect(quick < slow / 5 && slow > 8, `a seen arrival plays at 20x (${quick.toFixed(1)} s vs ${slow.toFixed(1)} s)`);
  if (fails.length) { console.log(`${fails.length} FAILED`); process.exitCode = 1; }
  report(errors);
  await browser.close();
})();
