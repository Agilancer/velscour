// THE SERPENTINE TOWER's edge cases (docs/SERPENTINE_TOWER.md): a summon and all the stair's loot come up through the
// stairhead; every monster that arrives on the roof or the stair (drops, hooks, chargers, boats, captains) lands on open
// floor; no boat crew is left waiting off the map and the hazards are gone after the win; the automap, a resize; death
// on the roof and on the stair go back to town with the warp, the camera's zoom and the 3D released; town and back in.
//   node tools/tests/tower_edge.js        (start the server first: python -m http.server 8123)
const { openGame, report } = require('./harness');
(async () => {
  const { browser, page, errors, shot } = await openGame({ width: 1366, height: 820 });
  const ev = (f, a) => page.evaluate(f, a);
  const run = (secs, kill = false) => ev(async ([secs, kill]) => {
    const { G, game } = window.VELSCOUR, { kill: slay } = await import('/src/game/combat.js');
    for (let i = 0; i < secs * 60; i++) {
      G.time += 1 / 60; G.frame++; game.update(1 / 60);
      if (kill && i % 30 === 0 && G.world) for (const c of [...G.world.creatures]) if (c.team === 'enemy' && !c.dead && !c.entering && c.targetable !== false) slay(c, G.player);
      if (i % 10 === 0) game.render();
    }
    game.render();
  }, [secs, kill]);
  const enterTower = (vi, si) => ev(async ([vi, si]) => {
    const { G, game } = window.VELSCOUR, { BIOME_BY_ID } = await import('/src/data/biomes.js');
    G.towerVariant = vi; G.towerScenario = si;
    await game.teleportToBiome(BIOME_BY_ID.serpentine_tower);
    const { airshipsReady } = await import('/src/gfx/tower3d.js');
    for (let i = 0; i < 100 && !airshipsReady(); i++) await new Promise((r) => setTimeout(r, 100));
    return { biome: G.world.biome.id, tower: !!G.world.tower };
  }, [vi, si]);
  // walkable check: every enemy not mid-arrival stands on open floor
  const stranded = () => ev(() => {
    const w = window.VELSCOUR.G.world, bad = [];
    for (const c of w.creatures) if (!c.dead && !c.entering && !w.map.walkable(c.x, c.y)) bad.push(`${c.name}@${c.x.toFixed(1)},${c.y.toFixed(1)}`);
    return bad;
  });
  try {
    await ev(async () => { const { G, game } = window.VELSCOUR; await game.newChar('necromancer', 'Edge'); G.char.depth = 5; G.godMode = true; });
    console.log('enter', JSON.stringify(await enterTower(1, 12)));

    // ---- a summon on the stair comes to the roof; stair loot comes too
    const pre = await ev(async () => {
      const { G } = window.VELSCOUR, w = G.world, g = w.tower.g, p = w.player, { makeMonster } = await import('/src/game/monster.js');
      const pet = makeMonster(w, 'skeleton', w.biome, 5, 'normal', p.x - 1, p.y, 0); pet.team = 'player'; pet.summon = true; pet.owner = p; w.add(pet);
      const { dropChest } = await import('/src/game/loot.js');
      for (let i = 0; i < 4; i++) dropChest(w, { x: g.X1 - g.L * (0.2 + i * 0.2), y: g.YR + 2 }, 5);
      const { Orbit, Area } = await import('/src/game/hazards.js');   // one effect that rides with the hero, one left on the stair
      w.addHazard(new Orbit({ world: w, src: p, n: 2, radius: 1.6, dur: 60, fx: 'blade', el: 'phys', dmg: [1, 2], o: {}, edgeTest: 'orbit' }));
      w.addHazard(new Area({ world: w, src: p, x: p.x, y: p.y, r: 1, dur: 60, tick: 1, dmg: [1, 1], el: 'fire', fx: 'fire', edgeTest: 'zone' }));
      return { loot: w.loot.filter((l) => l.kind === 'item').length, pet: pet.id };
    });
    await ev(() => { const { G } = window.VELSCOUR, w = G.world, g = w.tower.g, p = w.player; for (const c of w.creatures) if (c.team === 'enemy') c.dead = true; p.x = g.XT + 1.5; p.y = g.door[1]; });
    await run(0.5);
    const post = await ev(() => {
      const { G } = window.VELSCOUR, w = G.world, g = w.tower.g;
      return { roof: w.tower.roof, pets: w.creatures.filter((c) => c.team === 'player' && c !== w.player).map((c) => [c.x < g.XR, w.map.walkable(c.x, c.y)]),
        loot: w.loot.length, lootOnRoof: w.loot.filter((l) => l.kind === 'item' && l.x < g.XR && w.map.walkable(l.x, l.y)).length, ambush: w.overworldScenario.top.mobs.length,
        ropes: w.hazards.includes(w.towerRopeLayer), orbit: w.hazards.some((h) => h.edgeTest === 'orbit'), zone: w.hazards.some((h) => h.edgeTest === 'zone') };
    });
    console.log('stairhead', JSON.stringify({ pre, post }));
    if (!post.pets.length || post.pets.some(([r, wk]) => !r || !wk)) errors.push('[edge] the summon did not come up to the roof');
    if (post.lootOnRoof !== pre.loot) errors.push(`[edge] stair loot: ${pre.loot} dropped, ${post.lootOnRoof} on the roof`);
    if (!post.ropes) errors.push('[edge] no rope layer on the roof: its climbers would hang from nothing');
    if (!post.orbit || post.zone) errors.push(`[edge] the hero's effects at the stairhead: orbit kept ${post.orbit}, stair zone kept ${post.zone}`);

    // ---- run the roof with the arrivals checked for landing spots, then the hazards and ships after the win
    let worst = [];
    for (let k = 0; k < 40; k++) {
      await run(6, k % 2 === 1);
      const st = await stranded(); if (st.length > worst.length) worst = st;
      const done = await ev(() => window.VELSCOUR.G.world.overworldScenario.completed);
      if (done) break;
    }
    await run(12);
    const after = await ev(async () => {
      const { G } = window.VELSCOUR, w = G.world, run = w.overworldScenario, T3 = await import('/src/gfx/tower3d.js');
      return { done: run.completed, hazards: w.hazards.length, creatures: w.creatures.length, waiting: w.creatures.filter((c) => c.x < -30).length };
    });
    console.log('roof', JSON.stringify(after), 'stranded', worst.slice(0, 5));
    if (!after.done) errors.push('[edge] the roof never finished');
    if (worst.length) errors.push('[edge] monsters off the floor: ' + worst.slice(0, 5).join(' '));
    if (after.waiting) errors.push(`[edge] ${after.waiting} boat crew left waiting off the map`);
    if (after.hazards > 60) errors.push(`[edge] ${after.hazards} hazards left after the win`);
    await shot('edge_after_win');

    // ---- the automap, a pause, a resize
    await ev(() => { window.VELSCOUR.G.showAutomap = true; window.VELSCOUR.game.render(); });
    await shot('edge_automap_roof');
    await ev(() => { window.VELSCOUR.G.showAutomap = false; });
    await page.setViewportSize({ width: 900, height: 600 }); await page.waitForTimeout(400); await run(0.5);
    await shot('edge_resized');
    await page.setViewportSize({ width: 1366, height: 820 }); await page.waitForTimeout(300);

    // ---- death on the roof: back to town, warp off, 3D gone
    const death = async (where) => {
      await ev(async () => { const { G } = window.VELSCOUR, { hit } = await import('/src/game/combat.js'); G.godMode = false; hit(G.world.creatures.find((c) => c.team === 'enemy' && !c.dead) || null, G.player, 999999, 'fire', {}); });
      await page.waitForTimeout(2600);
      await page.click('text=Return to Town');
      await page.waitForTimeout(1500);
      const r = await ev(async () => {
        const { G } = window.VELSCOUR, v = await import('/src/core/view.js');
        return { kind: G.world.kind, iso: v.isoX(3, 1) === 2 * v.HW && v.isoY(3, 1) === 4 * v.HH, zoomK: v.camera.zoomK };
      });
      console.log('death', where, JSON.stringify(r));
      if (r.kind !== 'town' || !r.iso || r.zoomK !== 1) errors.push(`[edge] death on the ${where}: ${JSON.stringify(r)}`);
      await ev(() => { window.VELSCOUR.G.godMode = true; });
    };
    await death('roof');
    await enterTower(3, 4);
    await ev(() => { const { G } = window.VELSCOUR, w = G.world, g = w.tower.g, p = w.player; p.x = g.X1 - g.L * 0.5; p.y = g.YR + 2; });
    await run(1);
    await death('stair');

    // ---- the town portal at the foot, and back in
    await enterTower(4, 7);
    const tp = await ev(async () => {
      const { G, game } = window.VELSCOUR; game.enterTown(); return G.world.kind;
    });
    await page.waitForTimeout(500);
    await ev(async () => { const { G, game } = window.VELSCOUR; G.char.nextBiome = 'serpentine_tower'; game.enterDungeon(); });
    await page.waitForFunction(() => window.VELSCOUR.G.world?.tower && document.querySelector('#loading').classList.contains('hidden'), null, { timeout: 60000 });
    await run(1);
    console.log('town and back', tp, await ev(() => window.VELSCOUR.G.world.tower.v.id));
    await shot('edge_back_in');

    // ---- the stair's arrivals land on the floor (many hooks, drops and chargers)
    let sw = [];
    for (let k = 0; k < 12; k++) {
      await ev((k) => {
        const { G } = window.VELSCOUR, w = G.world, g = w.tower.g, p = w.player, run = w.overworldScenario;
        p.x = g.X1 - g.L * (0.15 + k * 0.06); p.y = g.YR + 1 + (k % 4);
        run.hookT = 0; run.hookS = -99; run.chargeT = 0; run.chargeS = -99; run.dropCd = 0;
        const pack = w.creatures.find((c) => c.team === 'enemy' && !c.awake && g.s(c.x) > g.s(p.x) + g.C * 0.9 && g.s(c.x) < g.s(p.x) + g.C * 1.2);
        if (pack) { pack.towerDrop = true; p.x = pack.x + g.C + 1; }
      }, k);
      await run(4, k % 3 === 2);
      const st = await stranded(); if (st.length > sw.length) sw = st;
    }
    console.log('stair arrivals stranded', sw.slice(0, 6));
    if (sw.length) errors.push('[edge] stair monsters off the floor: ' + sw.slice(0, 6).join(' '));
  } catch (e) { errors.push('[edge] ' + e.stack); }
  report(errors);
  await browser.close();
})();
