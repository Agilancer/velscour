// THE IRON EXPRESS (region id ghost_train, docs/GHOST_TRAIN.md): reached through Velscour's skull ("train"), never in
// the biome draw. The live three.js train builds; 30 seeds: every car's pack and the tender's boss reachable from the
// caboose, a platform joins the train while it is written and is void again after; a station stop in play (the train
// brakes, stands, whistles and pulls out; the hero on the platform leaps back aboard, raiders on it are left behind);
// the cutaway (the hero's car open, the others roofed, who is inside them hidden) and the engine's mask; screenshots
// (caboose, a car fight, braking into a station, on the platform, the tender and the engine, an overview, the Last
// Stop, the phone layout). Then auto-play rides it from the caboose to the Last Stop's exit.
//   node tools/tests/ghosttrain.js [shots|noshots] [auto|noauto]      (start the server first: python3 -m http.server 8123)
const { openGame, report } = require('./harness');
const SHOTS = process.argv[2] !== 'noshots';
const AUTO = process.argv[3] !== 'noauto';

(async () => {
  const { browser, page, errors, shot } = await openGame({ width: 1366, height: 860 });
  page.on('requestfailed', (r) => console.log('request failed:', r.url()));
  const step = (secs) => page.evaluate((secs) => {
    const { G, game } = window.VELSCOUR;
    for (let i = 0; i < Math.round(secs * 30); i++) { G.dt = 1 / 30; G.time += G.dt; G.frame = (G.frame || 0) + 1; game.update(1 / 30); }
  }, secs);
  const view = async (name, src, zoom = 1, secs = 0.4) => {
    await page.evaluate(async ([src, zoom, secs]) => {
      const { G, game } = window.VELSCOUR;
      const { camera } = await import('/src/core/view.js');
      const w = G.world, m = w.map, p = G.player;
      const at = new Function('G', 'w', 'm', 'p', src)(G, w, m, p);
      if (at) { p.x = at[0]; p.y = at[1]; p.moveVec = [0, 0]; p.path = null; }
      G.settings.zoom = zoom; camera.computeZoom();
      m.reveal(p.x, p.y, 14);
      for (let i = 0; i < Math.round(secs * 30); i++) { G.time += 1 / 30; game.update(1 / 30); }
      camera.follow(p.x, p.y, 0, true);
      game.render();
    }, [src, zoom, secs]);
    await page.waitForTimeout(120);
    if (SHOTS) await shot('ghosttrain_' + name);
  };
  try {
    // ------------------------------------------------ reached through the skull
    await page.evaluate(async () => { await window.VELSCOUR.game.newChar('paladin', 'Rider'); window.VELSCOUR.G.char.depth = 6; });
    await page.waitForTimeout(300);
    await page.click('#velscour-skull');
    await page.fill('#velscour-message', 'train');
    await page.click('.velscour-contact-dialog button:has-text("Send")');
    await page.waitForFunction(() => window.VELSCOUR.G.world?.biome?.id === 'ghost_train' && document.querySelector('#loading').classList.contains('hidden'), null, { timeout: 30000 });
    const first = await page.evaluate(async () => {
      const { G } = window.VELSCOUR;
      const { BIOMES, drawBiome, OVERWORLD_BIOME_IDS } = await import('/src/data/biomes.js');
      const { trainScene, train3dReady } = await import('/src/gfx/ghosttrain3d.js');
      const { TENDER, FIGHT_CARS } = await import('/src/world/ghosttrain.js');
      const w = G.world, sc = w.overworldScenario, bad = [];
      const c = { biomeBag: [], overworldMisses: 0 };
      for (let i = 0; i < 3000; i++) { c.overworldMisses = i % 4; const id = drawBiome(c, 10 + (i % 30)); if (id === 'ghost_train') { bad.push('drawn into the rotation'); break; } c.lastBiome = id; }
      if ((OVERWORLD_BIOME_IDS || []).includes('ghost_train') || BIOMES.some((b) => b.id === 'ghost_train')) bad.push('listed with the regular biomes');
      if (!train3dReady() || !trainScene()) bad.push('three.js train not built');
      if (!w.cave || !w.cave.draw) bad.push('no world.cave hook');
      if (!sc || sc.id !== 'ghost_train') bad.push('run is ' + (sc && sc.id));
      const exit = w.portals.find((q) => q.type === 'exit');
      if (exit.x > 0 || exit.active) bad.push('exit is out before the train stops');
      if (!w.boss || w.boss.x < TENDER.x0 || w.boss.x > TENDER.x1) bad.push('the boss is not on the tender');
      const mobs = w.creatures.filter((m) => m.team === 'enemy' && m !== w.boss);
      for (const car of FIGHT_CARS) if (!mobs.some((m) => m.x >= car.x0 - 0.5 && m.x < car.x1 + 0.5)) bad.push(`car at ${car.x0} has no pack`);
      return { bad, title: sc && sc.title, objective: sc && sc.objective, mobs: mobs.length, boss: w.boss && w.boss.name, scene: trainScene() ? trainScene().scene.children.length : 0 };
    });
    console.log('skull', JSON.stringify(first));
    for (const b of first.bad) errors.push('[skull] ' + b);

    // ------------------------------------------------ 30 seeds
    const gen = await page.evaluate(async () => {
      const { BIOME_BY_ID } = await import('/src/data/biomes.js');
      const { generateGhostTrain, platformOn, platformOff, PLAT0, ROW0 } = await import('/src/world/ghosttrain.js');
      const biome = BIOME_BY_ID.ghost_train, bad = [];
      if (biome.name !== 'The Iron Express') bad.push('biome is named ' + biome.name);
      let ms = 0, spawns = 0;
      for (let n = 1; n <= 30; n++) {
        const seed = n * 7919 + 3, t0 = performance.now();
        let g;
        try { g = generateGhostTrain(6, biome, seed); } catch (e) { bad.push(`seed ${seed}: ${e.message}`); continue; }
        ms = Math.max(ms, performance.now() - t0);
        const m = g.map, W = m.w;
        const reach = () => {
          const seen = new Uint8Array(W * m.h), s0 = Math.floor(g.start[1]) * W + Math.floor(g.start[0]), q = [s0]; seen[s0] = 1;
          for (let h = 0; h < q.length; h++) {
            const i = q[h], x = i % W, y = (i / W) | 0;
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (m.walkableTile(x + dx, y + dy) && !seen[(y + dy) * W + x + dx]) { seen[(y + dy) * W + x + dx] = 1; q.push((y + dy) * W + x + dx); }
          }
          return seen;
        };
        const up = reach();
        for (const s of g.spawns) { spawns++; if (!up[Math.floor(s.y) * W + Math.floor(s.x)]) bad.push(`seed ${seed}: ${s.rank} ${s.arch} at ${s.x.toFixed(1)},${s.y.toFixed(1)} unreachable`); }
        if (!up[Math.floor(g.townPortal[1]) * W + Math.floor(g.townPortal[0])]) bad.push(`seed ${seed}: town portal off the train`);
        let off = 0; for (let x = 0; x < W; x++) for (let y = 0; y < m.h; y++) if ((y < ROW0 || y >= ROW0 + 3) && m.walkableTile(x, y)) off++;
        if (off) bad.push(`seed ${seed}: ${off} walkable tiles off the train before any station`);
        const x0 = 20 + (n % 30), x1 = x0 + 24;
        platformOn(m, x0, x1);
        const up2 = reach();
        if (!up2[(PLAT0 + 1) * W + x0 + 5]) bad.push(`seed ${seed}: the platform at ${x0} can't be reached from the train`);
        platformOff(m);
        if (m.walkable(x0 + 5.5, PLAT0 + 1.5)) bad.push(`seed ${seed}: the platform stayed after it left`);
      }
      return { bad, maxMs: Math.round(ms), spawns };
    });
    console.log('generation', JSON.stringify(gen));
    for (const b of gen.bad) errors.push('[gen] ' + b);

    // ------------------------------------------------ the caboose, a car fight
    await page.evaluate(() => { window.VELSCOUR.G.godMode = true; });
    await view('caboose', 'return null;', 1, 0.6);
    await view('car_fight', `const e = w.creatures.find((c) => c.team === 'enemy' && c !== w.boss && c.x > 20 && c.x < 30); return e ? [e.x - 2.2, 12.5] : [22, 12.5];`, 1, 1.2);

    // ------------------------------------------------ a station stop in play
    const stop = await page.evaluate(async () => {
      const { G, game } = window.VELSCOUR;
      const { PLAT0, ROW0, FIGHT_CARS } = await import('/src/world/ghosttrain.js');
      const w = G.world, sc = w.overworldScenario, p = G.player, bad = [];
      const run = (s) => { for (let i = 0; i < Math.round(s * 30); i++) { G.dt = 1 / 30; G.time += G.dt; game.update(1 / 30); } };
      // clear the first two cars (no loot): the first station is called
      for (const m of w.creatures) if (m.team === 'enemy' && m !== w.boss && m.x < FIGHT_CARS[2].x0 - 0.5) { m.dead = true; m.hp = 0; m.noLoot = true; }
      p.x = FIGHT_CARS[1].x0 + 4; p.y = 12.5;
      run(0.5);
      if (sc.cleared < 2) bad.push(`cleared ${sc.cleared} cars, not 2`);
      if (sc.phase !== 'brake') bad.push('no station called after two cars: ' + sc.phase);
      const name = sc.stop && sc.stop.name;
      // braking: a frame on the way in
      for (let i = 0; i < 600 && sc.phase === 'brake' && sc.stationX - sc.stop.x > 9; i++) run(1 / 30);
      return { bad, name, phase: sc.phase, speed: sc.speed };
    });
    console.log('station approach', JSON.stringify(stop));
    for (const b of stop.bad) errors.push('[station] ' + b);
    await view('station_braking', 'return null;', 0.8, 0.05);
    const stood = await page.evaluate(async () => {
      const { G, game } = window.VELSCOUR;
      const { PLAT0, ROW0, onPlatform } = await import('/src/world/ghosttrain.js');
      const w = G.world, sc = w.overworldScenario, p = G.player, bad = [];
      const run = (s) => { for (let i = 0; i < Math.round(s * 30); i++) { G.dt = 1 / 30; G.time += G.dt; game.update(1 / 30); } };
      for (let i = 0; i < 900 && sc.phase === 'brake'; i++) run(1 / 30);
      if (sc.phase !== 'stop') bad.push('the train never stopped: ' + sc.phase);
      const S = sc.stop;
      if (!w.map.walkable(S.x + 0.5, PLAT0 + 1.5)) bad.push('the platform is not walkable at the stop');
      if (S.chests.length < 2) bad.push(`${S.chests.length} chests on the platform`);
      const dead = w.creatures.filter((m) => m.team === 'enemy' && !m.dead && onPlatform(m.x, m.y)).length;
      if (dead < 3) bad.push(`${dead} of the waiting dead on the platform`);
      const ob = sc.objective;
      if (!ob || !ob.use) bad.push('auto-play is not sent to the platform chests');
      p.x = S.x + 1.5; p.y = PLAT0 + 2.5;   // step off
      return { bad, x: S.x, chests: S.chests.length, dead, leavesIn: sc.leavesIn };
    });
    console.log('station stop', JSON.stringify(stood));
    for (const b of stood.bad) errors.push('[station] ' + b);
    await view('station_platform', 'return null;', 1, 0.3);
    await view('station_wide', 'return null;', 0.6, 0.05);
    const left = await page.evaluate(async () => {
      const { G, game } = window.VELSCOUR;
      const { PLAT0, ROW0, ROWS, onPlatform } = await import('/src/world/ghosttrain.js');
      const w = G.world, sc = w.overworldScenario, p = G.player, bad = [];
      const run = (s) => { for (let i = 0; i < Math.round(s * 30); i++) { G.dt = 1 / 30; G.time += G.dt; game.update(1 / 30); } };
      const x = sc.stop.x;
      for (let i = 0; i < 40 * 30 && sc.phase === 'stop'; i++) { p.x = x + 1.5; p.y = PLAT0 + 2.5; run(1 / 30); }
      if (sc.phase !== 'leave') bad.push('she never pulled out: ' + sc.phase);
      if (p.y < ROW0 || p.y >= ROW0 + ROWS || !w.map.walkable(p.x, p.y)) bad.push(`the hero was left at ${p.x.toFixed(1)},${p.y.toFixed(1)}`);
      if (w.map.walkable(x + 0.5, PLAT0 + 1.5)) bad.push('the platform is still walkable');
      if (w.creatures.some((m) => !m.dead && onPlatform(m.x, m.y))) bad.push('someone is still on the platform');
      run(20);
      if (sc.phase !== 'run' || sc.stationX !== null) bad.push('not running again after the station: ' + sc.phase);
      // the land streams by while she runs
      const { trainScene } = await import('/src/gfx/ghosttrain3d.js');
      const s0 = trainScene().scroll; run(1);
      if (!(trainScene().scroll - s0 > 5)) bad.push('the ground does not stream by: ' + (trainScene().scroll - s0).toFixed(2));
      return { bad, phase: sc.phase, speed: sc.speed };
    });
    console.log('station departure', JSON.stringify(left));
    for (const b of left.bad) errors.push('[station] ' + b);

    // ------------------------------------------------ the tender and the engine (its mask), the boss's fall, the Last Stop
    const mask = await page.evaluate(async () => {
      const { G } = window.VELSCOUR;
      const { ENGINE } = await import('/src/world/ghosttrain.js');
      const w = G.world, bad = [];
      // (the coal heap keeps walkers a few tiles off the cab: this is a flier over the gangway to it)
      const near = { x: ENGINE.x0 - 0.6, y: 13.8, viewH: 60 }, far = { x: 30, y: 12.5, viewH: 60 };
      if (!w.cave.mask(near)) bad.push('the engine does not hide a sprite behind it');
      if (w.cave.mask(far)) bad.push('the engine hides a sprite far from it');
      // the cutaway: the hero's car open, a roofed car ahead closed and whoever is in it hidden
      const { CARS } = await import('/src/world/ghosttrain.js');
      const { trainScene } = await import('/src/gfx/ghosttrain3d.js');
      const p = G.player, coach = CARS.find((c) => c.kind === 'coach'), gond = CARS.find((c) => c.kind === 'gondola');
      p.x = gond.x0 + 4; p.y = 12.5; G.time += 1 / 30; window.VELSCOUR.game.update(1 / 30);
      const cuts = trainScene().cuts, cg = cuts.find((c) => c.x0 === gond.x0), cc = cuts.find((c) => c.x0 === coach.x0);
      if (cg.g.visible) bad.push("the hero's car is not cut away");
      if (!cc.g.visible) bad.push('a car ahead is cut away');
      if (w.cave.horizon({ x: coach.x0 + 4, y: 12.5, viewH: 60 }) !== -Infinity) bad.push('someone inside a roofed car ahead shows');
      if (w.cave.horizon({ x: gond.x0 + 3, y: 12.5, viewH: 60 }) !== null) bad.push("someone in the hero's car is hidden");
      return { bad };
    });
    for (const b of mask.bad) errors.push('[mask] ' + b);
    await view('tender', 'return [w.boss.x - 4, 12.5];', 1, 0.8);
    await view('engine', 'return [w.boss.x + 2.2, 13.4];', 0.75, 0.1);
    await view('overview', 'return [50, 12.5];', 0.42, 0.1);
    const last = await page.evaluate(async () => {
      const { G, game } = window.VELSCOUR;
      const { PLAT0 } = await import('/src/world/ghosttrain.js');
      const w = G.world, sc = w.overworldScenario, p = G.player, bad = [];
      const run = (s) => { for (let i = 0; i < Math.round(s * 30); i++) { G.dt = 1 / 30; G.time += G.dt; game.update(1 / 30); } };
      for (const m of w.creatures) if (m.team === 'enemy') { m.dead = true; m.hp = 0; m.noLoot = true; }
      p.x = w.boss.x - 3; p.y = 12.5;
      run(0.5);
      if (sc.phase !== 'dying') bad.push('the fire did not go out: ' + sc.phase);
      for (let i = 0; i < 60 * 30 && !sc.completed; i++) run(1 / 30);
      const exit = w.portals.find((q) => q.type === 'exit');
      if (!sc.completed) bad.push('never reached the Last Stop: ' + sc.phase);
      if (!exit.active) bad.push('the exit did not open');
      if (!w.map.walkable(exit.x, exit.y)) bad.push('the exit is not on walkable ground');
      if (!w.map.findPath(p.x, p.y, exit.x, exit.y, 20000)) bad.push('no path to the exit');
      return { bad, phase: sc.phase, exit: [exit.x, exit.y], fire: sc.fire, quest: (await import('/src/game/regions.js')).REGIONS.ghost_train.quest(sc, (d, h) => (d ? '[x] ' : '[ ] ') + h + ' | ').replace(/<[^>]+>/g, '') };
    });
    console.log('last stop', JSON.stringify(last));
    for (const b of last.bad) errors.push('[last] ' + b);
    await view('last_stop', 'const e = w.portals.find((q) => q.type === "exit"); return [e.x + 1.5, e.y + 2.5];', 0.9, 0.5);

    // ------------------------------------------------ three.js missing: the Forsaken Wilds stand in; the scene goes once the hero leaves
    const fallback = await page.evaluate(async () => {
      const { G, game } = window.VELSCOUR;
      const { REGIONS } = await import('/src/game/regions.js');
      const { BIOME_BY_ID } = await import('/src/data/biomes.js');
      const { trainScene } = await import('/src/gfx/ghosttrain3d.js');
      const R = REGIONS.ghost_train, ready = R.ready, bad = [];
      R.ready = () => false;
      try { game.buildDungeon(6, BIOME_BY_ID.ghost_train); } finally { R.ready = ready; }
      if (G.world.biome.id !== 'overworld') bad.push('no Wilds fallback: ' + G.world.biome.id);
      await new Promise((r) => setTimeout(r, 3000));
      if (trainScene()) bad.push('the train scene outlived its level');
      return { bad, biome: G.world.biome.id };
    });
    console.log('fallback', JSON.stringify(fallback));
    for (const b of fallback.bad) errors.push('[fallback] ' + b);

    // ------------------------------------------------ auto-play rides it to the Last Stop
    if (AUTO) {
      const res = await page.evaluate(async () => {
        const { G, game } = window.VELSCOUR;
        const { Auto } = await import('/src/game/autoplay.js');
        const { BIOME_BY_ID } = await import('/src/data/biomes.js');
        // as in seabattle.js: a fresh hero at depth 1 fights it for real (god mode only keeps the soak from dying)
        await game.newChar('paladin', 'Conductor'); G.char.depth = 1; G.godMode = true;
        await game.teleportToBiome(BIOME_BY_ID.ghost_train);
        Auto.toggle(true);
        const t0 = performance.now();
        let sim = 0;
        const w = G.world, sc = w.overworldScenario, log = [];
        let ph = '';
        while (sim < 1200 && !sc.completed && performance.now() - t0 < 240000) {
          for (let i = 0; i < 30; i++) { G.dt = 1 / 30; G.time += G.dt; G.frame++; game.update(1 / 30); sim += 1 / 30; }
          if (sc.phase !== ph || Math.round(sim) % 60 === 0) { ph = sc.phase; log.push(`${Math.round(sim)}s ${ph} cars ${sc.cleared} boss ${Math.round(100 * w.boss.hp / w.boss.maxHp)}% ${w.boss.awake ? 'awake' : ''} foes ${w.creatures.filter((m) => m.team === 'enemy' && !m.dead).length} hero ${G.player.x.toFixed(0)},${G.player.y.toFixed(0)} ${Auto.status}`); }
          await new Promise((r) => setTimeout(r, 0));
        }
        const exit = w.portals.find((q) => q.type === 'exit');
        let reached = false;
        let after = '';
        for (let i = 0; i < 240 && sc.completed && !reached; i++) {
          after = Auto.status;
          for (let k = 0; k < 30; k++) { G.dt = 1 / 30; G.time += G.dt; G.frame++; game.update(1 / 30); sim += 1 / 30; if (G.world !== w || game.pick) { reached = true; break; } }
          await new Promise((r) => setTimeout(r, 0));
        }
        Auto.toggle(false);
        if (game.pick) document.querySelector('.dialog button')?.click();
        return { secs: Math.round(sim), completed: sc.completed, cleared: sc.cleared, stations: sc.stationsSeen, status: after, exit: exit.active, reachedExit: reached, log };
      });
      console.log('auto-play', JSON.stringify(res));
      if (!res.completed) errors.push(`[auto] did not reach the Last Stop in ${res.secs}s (${res.cleared} cars, ${res.status})`);
      if (res.completed && res.stations < 2) errors.push(`[auto] only ${res.stations} stations on the way`);
      if (res.completed && !res.reachedExit) errors.push('[auto] did not take the exit');
    }

    // ------------------------------------------------ phone layout
    if (SHOTS) {
      const m = await openGame({ width: 844, height: 390, mobile: true });
      await m.page.evaluate(async () => {
        const { G, game } = window.VELSCOUR;
        const { BIOME_BY_ID } = await import('/src/data/biomes.js');
        await game.newChar('ranger', 'Phone');
        await game.teleportToBiome(BIOME_BY_ID.ghost_train);
        const p = G.player; p.x = 24; p.y = 12.5;
        for (let i = 0; i < 20; i++) { G.time += 1 / 30; game.update(1 / 30); }
        game.render();
      });
      await m.page.waitForTimeout(200);
      await m.shot('ghosttrain_mobile');
      errors.push(...m.errors);
      await m.browser.close();
    }
  } catch (e) { errors.push('[test] ' + e.message); }
  report(errors);
  await browser.close();
})();
