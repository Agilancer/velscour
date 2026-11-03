// THE IRON EXPRESS (region id ghost_train, docs/GHOST_TRAIN.md): reached through Velscour's skull ("train"), never in
// the biome draw. The live three.js train builds; 30 seeds: every car's pack and the tender's boss reachable from the
// caboose, a platform joins the train while it is written and is void again after; a station stop in play (the train
// brakes, stands, whistles and pulls out; the hero on the platform leaps back aboard, raiders on it are left behind);
// the cutaway (the hero's car open, the others roofed, who is inside them hidden) and the engine's mask; 16 fight cars,
// 5 stations and the lieutenant on the prison car; the frame cost at the back, middle and front; screenshots (caboose, a
// car fight, braking into a station, on the platform, the tender and the engine, two overviews, every station look,
// the gorge, the Last Stop, the phone layout). Then auto-play rides it from the caboose to the Last Stop's exit. The chief's train fight
// (coal lanes, the furnace vent, the whistle) is cast in play and shot. With depths, a hero geared for each depth the
// way balance.js gears one rides it on auto-play for real (no god mode; a fall is counted and the hero stood up again):
// it must finish, with few falls, and must not be a walk-over (life lost, the chief's fight length).
// Every variant (world/ghosttrain.js VARIANTS: forest, frost, badlands, storm, cinder) is built, checked (consist,
// stations, its look and beat), shot (a car fight, the beat under the train, a station, the tender) and soaked on
// auto-play for a few game minutes; the full ride is auto-played on one (VARIANT=<id>, else a random one).
//   node tools/tests/ghosttrain.js [shots|noshots] [auto|noauto] [depths, e.g. 50,150,300] [classes]
//   (start the server first: python3 -m http.server 8123)
const { openGame, report } = require('./harness');
const SHOTS = process.argv[2] !== 'noshots';
const AUTO = process.argv[3] !== 'noauto';
const DEPTHS = (process.argv[4] || '').split(',').filter(Boolean).map(Number);
const DEEP_CLASSES = (process.argv[5] || 'paladin').split(',');
const SOAK = +(process.env.SOAK || 150);   // game seconds of auto-play on each variant

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
    await page.fill('#velscour-message', 'train 1');   // (the number picks the variant: the night forest)
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
      const { LT_CAR, STATIONS } = await import('/src/world/ghosttrain.js');
      if (FIGHT_CARS.length < 14) bad.push(`only ${FIGHT_CARS.length} fight cars`);
      if (STATIONS.length < 4) bad.push(`only ${STATIONS.length} stations`);
      const L = sc && sc.lieutenant, ltc = FIGHT_CARS[LT_CAR];
      if (!L || L.rank !== 'boss' || L.x < ltc.x0 || L.x > ltc.x1 || w.boss === L) bad.push('no lieutenant on the prison car');
      const mobs = w.creatures.filter((m) => m.team === 'enemy' && m !== w.boss);
      FIGHT_CARS.forEach((car, k) => { if (!sc.packs[k].length) bad.push(`car at ${car.x0} has no pack`); });
      return { bad, title: sc && sc.title, objective: sc && sc.objective, mobs: mobs.length, boss: w.boss && w.boss.name, scene: trainScene() ? trainScene().scene.children.length : 0 };
    });
    console.log('skull', JSON.stringify(first));
    for (const b of first.bad) errors.push('[skull] ' + b);

    // ------------------------------------------------ frame cost: the render at the back, the middle and the front (the
    // game held still, so nobody wakes)
    const cost = await page.evaluate(async () => {
      const { G, game } = window.VELSCOUR;
      const { camera } = await import('/src/core/view.js');
      const { CABOOSE, TENDER, CZ } = await import('/src/world/ghosttrain.js');
      const p = G.player, out = {}, w = G.world;
      for (const [k, x] of [['back', CABOOSE.x0 + 4], ['mid', (CABOOSE.x0 + TENDER.x1) / 2], ['front', TENDER.x0 - 2]]) {
        p.x = x; p.y = CZ; w.cave.frame(0, true); camera.follow(p.x, p.y, 0, true);
        for (let i = 0; i < 10; i++) game.render();
        const t0 = performance.now();
        for (let i = 0; i < 60; i++) game.render();
        out[k] = +((performance.now() - t0) / 60).toFixed(2);
      }
      p.x = CABOOSE.x0 + 4.5; p.y = CZ; w.cave.frame(0, true); camera.follow(p.x, p.y, 0, true);
      return out;
    });
    console.log('render ms (SwiftShader: compare runs, not absolutes)', JSON.stringify(cost));

    // ------------------------------------------------ 30 seeds
    const gen = await page.evaluate(async () => {
      const { BIOME_BY_ID } = await import('/src/data/biomes.js');
      const { generateGhostTrain, platformOn, platformOff, PLAT0, ROW0, VARIANTS, useVariant } = await import('/src/world/ghosttrain.js');
      const biome = BIOME_BY_ID.ghost_train, bad = [];
      if (biome.name !== 'The Iron Express') bad.push('biome is named ' + biome.name);
      let ms = 0, spawns = 0;
      for (let n = 1; n <= 30; n++) {
        const seed = n * 7919 + 3, t0 = performance.now();
        let g;
        try { g = generateGhostTrain(6, biome, seed, VARIANTS[n % VARIANTS.length].id); } catch (e) { bad.push(`seed ${seed}: ${e.message}`); continue; }
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
      useVariant(window.VELSCOUR.G.world.trainVariant.id);   // (back to the level's own consist)
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
      const { PLAT0, ROW0, FIGHT_CARS, STATIONS } = await import('/src/world/ghosttrain.js');
      const w = G.world, sc = w.overworldScenario, p = G.player, bad = [], A = STATIONS[0].after;
      const run = (s) => { for (let i = 0; i < Math.round(s * 30); i++) { G.dt = 1 / 30; G.time += G.dt; game.update(1 / 30); } };
      // clear the first two cars (no loot): the first station is called
      for (const m of w.creatures) if (m.team === 'enemy' && m !== w.boss && m.x < FIGHT_CARS[A].x0 - 0.5) { m.dead = true; m.hp = 0; m.noLoot = true; }
      p.x = FIGHT_CARS[A - 1].x0 + 4; p.y = 12.5;
      run(0.5);
      if (sc.cleared < A) bad.push(`cleared ${sc.cleared} cars, not ${A}`);
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
    await view('overview_mid', 'return [110, 12.5];', 0.42, 0.1);
    // the new car kinds up close: the dining car and the sleeper, the armoury and the prison car with the lieutenant
    await view('cars_dining_sleeper', 'return [62, 12.5];', 0.75, 0.05);
    await view('cars_armoury_prison', 'return [w.overworldScenario.lieutenant.x - 6, 12.5];', 0.75, 0.05);
    // every station look, stood beside the hero for a moment; then the gorge passing under the train
    const looks = await page.evaluate(async () => (await import('/src/gfx/ghosttrain3d.js')).STATION_LOOKS);
    for (const look of looks) {
      await page.evaluate(async (look) => {
        const { G } = window.VELSCOUR;
        const { trainStation } = await import('/src/gfx/ghosttrain3d.js');
        const { STATIONS } = await import('/src/world/ghosttrain.js');
        const sc = G.world.overworldScenario; trainStation((STATIONS.find((s) => s.look === look) || { name: 'The Last Stop' }).name, look); sc.stationX = 60;
      }, look);
      await view('station_look_' + look, 'return [60, 12.5];', 0.6, 0.05);
    }
    const gorge = await page.evaluate(async () => {
      const { G, game } = window.VELSCOUR;
      const g3 = await import('/src/gfx/ghosttrain3d.js');
      const sc = G.world.overworldScenario, bad = [];
      sc.stationX = null; g3.trainStation('—', 'hall');
      g3.trainGorge();
      for (let i = 0; i < 2000 && g3.trainGorgeX() != null && g3.trainGorgeX() > 62; i++) { G.time += 1 / 30; game.update(1 / 30); }
      if (g3.trainGorgeX() == null) bad.push('the gorge never came under the train');
      return { bad, x: g3.trainGorgeX() };
    });
    for (const b of gorge.bad) errors.push('[gorge] ' + b);
    await view('gorge', 'return [60, 12.5];', 0.6, 0.05);

    // ------------------------------------------------ the chief's train fight: coal lanes, the furnace vent, the whistle
    const chiefSetup = await page.evaluate(async () => {
      const { G, game } = window.VELSCOUR;
      const { ROW0 } = await import('/src/world/ghosttrain.js');
      const w = G.world, sc = w.overworldScenario, b = w.boss, p = G.player, bad = [];
      const run = (s) => { for (let i = 0; i < Math.round(s * 30); i++) { G.dt = 1 / 30; G.time += G.dt; game.update(1 / 30); } };
      for (const m of w.creatures) if (m.team === 'enemy' && m !== b) { m.dead = true; m.hp = 0; m.noLoot = true; }
      p.x = b.x - 3.5; p.y = ROW0 + 1.5; b.awake = true; b.state = 'idle'; b.hp = b.maxHp;
      sc.chief.t = 99; run(0.2);
      sc.chief.cast('coal'); run(0.25);   // (the page's own loop runs on while the shot is taken: catch the lanes early)
      const lanes = (await import('/src/gfx/vfx.js')).effects.filter((e) => e.kind === 'line' && e.color === '#ff3a14').length;
      if (lanes !== 2) bad.push(`${lanes} coal lanes telegraphed, not 2`);
      if (b.state !== 'windup' || b.action.kind !== 'train_coal') bad.push('the chief does not stand to throw: ' + b.state);
      return { bad, lanes };
    });
    for (const b of chiefSetup.bad) errors.push('[chief] ' + b);
    await view('chief_coal', 'return null;', 1, 0.05);
    const chiefVent = await page.evaluate(async () => {
      const { G, game } = window.VELSCOUR;
      const { TENDER, CZ } = await import('/src/world/ghosttrain.js');
      const { effects } = await import('/src/gfx/vfx.js');
      const w = G.world, sc = w.overworldScenario, b = w.boss, p = G.player, bad = [];
      const run = (s) => { for (let i = 0; i < Math.round(s * 30); i++) { G.dt = 1 / 30; G.time += G.dt; game.update(1 / 30); } };
      run(1.5); b.state = 'idle'; b.action = null;
      p.x = TENDER.x0 - 0.5; p.y = CZ; run(0.1);
      sc.chief.cast('vent'); run(0.8);
      if (Math.abs(b.x - (TENDER.x1 - 2.6)) > 0.3) bad.push(`the chief did not leap to the coal heap: ${b.x.toFixed(1)}`);
      if (!effects.some((e) => e.kind === 'circle' && e.color === '#e8f4ff')) bad.push('no steam telegraph');
      return { bad, bx: b.x };
    });
    for (const b of chiefVent.bad) errors.push('[chief] ' + b);
    await view('chief_vent', 'return null;', 0.9, 0.05);
    const chiefWhistle = await page.evaluate(async () => {
      const { G, game } = window.VELSCOUR;
      const w = G.world, sc = w.overworldScenario, b = w.boss, bad = [];
      const run = (s) => { for (let i = 0; i < Math.round(s * 30); i++) { G.dt = 1 / 30; G.time += G.dt; game.update(1 / 30); } };
      run(1.2); b.state = 'idle'; b.action = null;
      const before = w.creatures.filter((m) => m.team === 'enemy' && !m.dead && m !== b).length;
      b.hp = b.maxHp * 0.6; sc.chief.t = 99; run(0.2);
      if (sc.chief.casts.whistle !== 1) bad.push('no whistle at 2/3 life');
      run(1.6);
      const after = w.creatures.filter((m) => m.team === 'enemy' && !m.dead && m !== b).length;
      if (after <= before) bad.push('nobody leapt aboard at the whistle');
      return { bad, casts: sc.chief.casts, boarders: after - before };
    });
    console.log('chief', JSON.stringify({ coal: chiefSetup, vent: chiefVent, whistle: chiefWhistle }));
    for (const b of chiefWhistle.bad) errors.push('[chief] ' + b);
    await view('chief_whistle', 'return null;', 1, 0.05);
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


    // ------------------------------------------------ every variant: built, checked, shot, and soaked on auto-play
    const vids = await page.evaluate(async () => (await import('/src/world/ghosttrain.js')).VARIANTS.map((v) => v.id));
    for (const [vi, vid] of vids.entries()) {
      const built = await page.evaluate(async ([vid, vi]) => {
        const { G, game } = window.VELSCOUR;
        const { BIOME_BY_ID } = await import('/src/data/biomes.js');
        const { REGIONS } = await import('/src/game/regions.js');
        const { FIGHT_CARS, STATIONS, LT_CAR, variantOf } = await import('/src/world/ghosttrain.js');
        const { trainScene } = await import('/src/gfx/ghosttrain3d.js');
        await game.newChar('paladin', 'Rider'); G.char.depth = 6; G.godMode = true;
        (G.regionWant ||= {}).ghost_train = String(vi + 1);   // (by number, as the skull's 'train 3')
        await game.teleportToBiome(BIOME_BY_ID.ghost_train);
        const w = G.world, sc = w.overworldScenario, v = variantOf(vid), bad = [];
        if (!sc || !sc.variant || sc.variant.id !== vid) return { bad: [`asked for ${vid}, built ${sc && sc.variant && sc.variant.id}`] };
        if (REGIONS.ghost_train.variants.length !== 5) bad.push('the region lists ' + REGIONS.ghost_train.variants.length + ' variants');
        FIGHT_CARS.forEach((c, k) => { if (c.kind !== v.consist[k]) bad.push(`car ${k} is a ${c.kind}, not a ${v.consist[k]}`); });
        if (STATIONS.map((q) => q.name).join() !== v.stations.map((q) => q.name).join()) bad.push('the stations are not the variant\'s');
        const S3 = trainScene();
        if (!S3 || S3.vid !== vid || S3.beatKind !== v.beat.kind) bad.push(`the 3D is ${S3 && S3.vid}/${S3 && S3.beatKind}`);
        if (w.biome.dark !== v.sky.dark || w.biome.fog !== v.sky.fog) bad.push('the night is not the variant\'s');
        if (!!w.raining !== !!v.sky.rain) bad.push('rain: ' + w.raining);
        if (!sc.lieutenant || !sc.lieutenant.name.startsWith(v.lt.title)) bad.push('the lieutenant is ' + (sc.lieutenant && sc.lieutenant.name));
        const quest = REGIONS.ghost_train.quest(sc, (d, h) => h + ' | ').replace(/<[^>]+>/g, '');
        if (!quest.includes(v.name)) bad.push('the Quest Log does not name the variant');
        return { bad, name: v.name, consist: FIGHT_CARS.map((c) => c.kind).join(','), lt: sc.lieutenant && sc.lieutenant.name, quest };
      }, [vid, vi]);
      console.log('variant ' + vid, JSON.stringify({ ...built, quest: undefined }));
      for (const b of built.bad) errors.push(`[variant ${vid}] ` + b);
      if (built.bad.length) continue;
      await view(`variant_${vid}`, `const e = w.creatures.find((c) => c.team === 'enemy' && c !== w.boss && c.x > 34 && c.x < 44); return e ? [e.x - 2.2, 12.5] : [38, 12.5];`, 0.85, 1);
      // the beat under the train, then a station beside it, then the tender
      const beat = await page.evaluate(async () => {
        const { G, game } = window.VELSCOUR;
        const g3 = await import('/src/gfx/ghosttrain3d.js');
        const w = G.world, p = G.player, bad = [];
        p.x = 60; p.y = 12.5;   // (no car is cleared, so no station is called over the beat)
        g3.trainGorge();
        for (let i = 0; i < 2000 && g3.trainGorgeX() != null && g3.trainGorgeX() > 62; i++) { G.time += 1 / 30; game.update(1 / 30); }
        if (g3.trainGorgeX() == null) bad.push('the beat never came under the train');
        for (let i = 0; i < 45; i++) { G.time += 1 / 30; game.update(1 / 30); }
        return { bad, x: g3.trainGorgeX(), darkK: +(w.darkK || 0).toFixed(2) };
      });
      for (const b of beat.bad) errors.push(`[variant ${vid} beat] ` + b);
      if (vid === 'frost' && !(beat.darkK > 0.5)) errors.push(`[variant ${vid} beat] the tunnel is not dark: ${beat.darkK}`);
      await view(`variant_${vid}_beat`, 'return [60, 12.5];', 0.6, 0.05);
      await page.evaluate(async () => {
        const { G } = window.VELSCOUR;
        const g3 = await import('/src/gfx/ghosttrain3d.js');
        const { STATIONS } = await import('/src/world/ghosttrain.js');
        const sc = G.world.overworldScenario, S3 = g3.trainScene();
        S3.gorgeX = null; G.world.darkK = 0;
        g3.trainStation(STATIONS[2].name, STATIONS[2].look); sc.stationX = 60;
      });
      await view(`variant_${vid}_station`, 'return [60, 12.5];', 0.6, 0.05);
      await page.evaluate(() => { window.VELSCOUR.G.world.overworldScenario.stationX = null; });
      await view(`variant_${vid}_tender`, 'return [w.boss.x - 3, 12.5];', 0.75, 0.05);
      // a short soak on auto-play: a fresh hero fights forward from the caboose
      if (AUTO) {
        const soak = await page.evaluate(async ([vi, secs]) => {
          const { G, game } = window.VELSCOUR;
          const { Auto } = await import('/src/game/autoplay.js');
          const { BIOME_BY_ID } = await import('/src/data/biomes.js');
          await game.newChar('paladin', 'Soak'); G.char.depth = 1; G.godMode = true;
          (G.regionWant ||= {}).ghost_train = String(vi + 1);
          await game.teleportToBiome(BIOME_BY_ID.ghost_train);
          const w = G.world, sc = w.overworldScenario, t0 = performance.now();
          Auto.toggle(true);
          let sim = 0;
          while (sim < secs && !sc.completed && performance.now() - t0 < 240000) {
            for (let i = 0; i < 30; i++) { G.dt = 1 / 30; G.time += G.dt; G.frame++; game.update(1 / 30); sim += 1 / 30; }
            await new Promise((r) => setTimeout(r, 0));
          }
          Auto.toggle(false);
          return { variant: sc.variant.id, secs: Math.round(sim), cleared: sc.cleared, stations: sc.stationsSeen, phase: sc.phase, status: Auto.status, foes: w.creatures.filter((m) => m.team === 'enemy' && !m.dead).length };
        }, [vi, SOAK]);
        console.log(`soak ${vid}`, JSON.stringify(soak));
        if (soak.cleared < Math.floor(SOAK / 50)) errors.push(`[variant ${vid} soak] only ${soak.cleared} cars in ${soak.secs}s (${soak.status})`);
      }
    }

    // ------------------------------------------------ auto-play rides it to the Last Stop
    if (AUTO) {
      const res = await page.evaluate(async (want) => {
        const { G, game } = window.VELSCOUR;
        const { Auto } = await import('/src/game/autoplay.js');
        const { BIOME_BY_ID } = await import('/src/data/biomes.js');
        // as in seabattle.js: a fresh hero at depth 1 fights it for real (god mode only keeps the soak from dying)
        await game.newChar('paladin', 'Conductor'); G.char.depth = 1; G.godMode = true;
        if (want) (G.regionWant ||= {}).ghost_train = want;
        await game.teleportToBiome(BIOME_BY_ID.ghost_train);
        Auto.toggle(true);
        const t0 = performance.now();
        let sim = 0;
        const w = G.world, sc = w.overworldScenario, log = [];
        let ph = '';
        while (sim < 2400 && !sc.completed && performance.now() - t0 < 900000) {
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
        return { variant: w.trainVariant.id, secs: Math.round(sim), completed: sc.completed, cleared: sc.cleared, stations: sc.stationsSeen, ltDead: !!(sc.lieutenant && sc.lieutenant.dead), status: after, exit: exit.active, reachedExit: reached, log };
      }, process.env.VARIANT || '');
      console.log('auto-play', JSON.stringify(res));
      if (!res.completed) errors.push(`[auto] did not reach the Last Stop in ${res.secs}s (${res.cleared} cars, ${res.status})`);
      if (res.completed && res.stations < 4) errors.push(`[auto] only ${res.stations} stations on the way`);
      if (res.completed && !res.ltDead) errors.push('[auto] the lieutenant still stands');
      if (res.completed && !res.reachedExit) errors.push('[auto] did not take the exit');
    }


    // ------------------------------------------------ deep depths: a hero geared for the depth, auto-play, no god mode
    const deepRows = [];
    for (const cls of DEEP_CLASSES) for (const D of DEPTHS) {
      const r = await page.evaluate(async ({ cls, D }) => {
        const { G, game } = window.VELSCOUR;
        const { Auto } = await import('/src/game/autoplay.js');
        const { depthLevel } = await import('/src/data/depth.js');
        const { rollItem, rollGem } = await import('/src/data/items.js');
        const { xpToNext } = await import('/src/game/player.js');
        const { BIOME_BY_ID } = await import('/src/data/biomes.js');
        if (Auto.on) Auto.toggle(false);
        await game.newChar(cls, 'Deep');
        document.querySelectorAll('.screen').forEach((s) => s.remove()); G.ui.modalCount = 0; G.ui.closeAll();
        // geared as balance.js gears a hero arriving at depth D
        const c = G.char, L = depthLevel(D), lvl = Math.min(3000, L + 1);
        c.level = lvl; c.xp = Math.round(xpToNext(lvl) * 0.3);
        c.statPoints += (lvl - 1) * 5; c.skillPoints += (lvl - 1) + Math.max(0, D - 1);
        for (let d = 1; d < D; d++) c.cleared[d] = true;
        c.deepest = D - 1; c.depth = D;
        c.gold = Math.round(800 * Math.pow(1.05, L));
        c.potions = { hp: 10, mp: 6, rejuv: 3, fury: 2 };
        Auto.spendStats(); Auto.spendSkills(); Auto.arrangeBar();
        for (let round = 0; round < 8; round++) {
          c.bag = c.bag.map(() => null);
          for (let i = 0; i < 25 && i < c.bag.length; i++) { const it = rollItem(L - Math.floor(Math.random() * 7), { mf: 60, bonus: Math.random() < 0.12 ? 1.2 : 0.15 }); it.unid = false; c.bag[i] = it; }
          G.player.recompute(); Auto.optimizeGear();
        }
        c.bag = c.bag.map(() => null);
        for (const it of Object.values(c.equip)) if (it && it.type === 'gear') {
          it.upg = Math.min(6, 2 + Math.floor(L / 40));
          it.sockets = Math.max(it.sockets, Math.min(it.maxSockets, 2));
          while (it.gems.length < it.sockets) { const g = rollGem(L); it.gems.push({ gem: g.gem, tier: g.tier }); }
        }
        const M = Math.min(1000, Math.round(20 + D * 1.6));
        c.bar.filter(Boolean).forEach((id, i) => { c.mastery[id] = [Math.max(1, Math.round(M * (i < 2 ? 1 : 0.55))), 0]; });
        Auto.spendSkills(); Auto.arrangeBar(); G.player.recompute();
        G.godMode = false; G.autoOpenSeals = true;
        await game.teleportToBiome(BIOME_BY_ID.ghost_train);
        const w = G.world, sc = w.overworldScenario, p = G.player, boss = w.boss;
        p.hp = p.maxHp; p.mana = p.maxMana;
        // a fall is counted, and the hero stood up again where he fell (so one soak measures the whole ride)
        let falls = 0, lost = 0, minHp = 1, pots = 0, bossAwakeAt = null, bossDiedAt = null, bossLost = 0;
        p.die = () => { falls++; p.hp = p.maxHp; p.status = {}; };
        const potSum = () => Object.values(G.char.potions).reduce((a, n) => a + n, 0);
        Auto.toggle(true);
        let sim = 0;
        const t0 = performance.now(), cars = [];
        while (sim < 2400 && !sc.completed && performance.now() - t0 < 1500000) {
          for (let i = 0; i < 30; i++) {
            const hp0 = p.hp, pots0 = potSum(), cl = sc.cleared;
            G.dt = 1 / 30; G.time += G.dt; G.frame++; game.update(1 / 30); sim += 1 / 30;
            if (G.player !== p || G.world !== w) break;
            if (p.hp < hp0) { lost += (hp0 - p.hp) / p.maxHp; if (bossAwakeAt != null && bossDiedAt == null) bossLost += (hp0 - p.hp) / p.maxHp; }
            minHp = Math.min(minHp, p.hp / p.maxHp);
            if (potSum() < pots0) pots += pots0 - potSum();
            if (sc.cleared > cl) cars.push(Math.round(sim));
            if (boss.awake && bossAwakeAt == null) bossAwakeAt = sim;
            if (boss.dead && bossDiedAt == null) bossDiedAt = sim;
          }
          if (G.player !== p || G.world !== w) break;
          await new Promise((r) => setTimeout(r, 0));
        }
        const casts = sc.chief ? { ...sc.chief.casts } : {};
        Auto.toggle(false);
        return { cls, D, lvl: depthLevel(D), heroLvl: c.level, secs: Math.round(sim), completed: sc.completed, cleared: sc.cleared, falls, lost: +lost.toFixed(2), minHp: +minHp.toFixed(2), pots,
          boss: boss.name, bossHp: Math.round(boss.maxHp), bossSecs: bossDiedAt != null && bossAwakeAt != null ? Math.round(bossDiedAt - bossAwakeAt) : null, bossLost: +bossLost.toFixed(2), bossLeft: Math.round(100 * Math.max(0, boss.hp) / boss.maxHp),
          cars, casts, status: Auto.status, phase: sc.phase, sinceCar: Math.round(sim - (cars.length ? cars[cars.length - 1] : 0)), outOfTime: !sc.completed && sim < 2400 };
      }, { cls, D });
      console.log('deep', JSON.stringify(r));
      deepRows.push(r);
      // a stall: the game-time cap reached, or no car cleared for 4 game minutes; a slow machine running out of wall
      // clock mid-ride (still clearing cars) is only noted
      if (!r.completed && (!r.outOfTime || r.sinceCar > 240)) errors.push(`[deep ${cls} D${D}] stalled: ${r.cleared}/16 cars, ${r.phase}, ${r.sinceCar}s since a car fell, chief at ${r.bossLeft}% after ${r.secs}s (${r.status})`);
      else if (!r.completed) console.log(`   (D${D} ${cls}: out of wall-clock time at ${r.cleared}/16 cars, still clearing them)`);
      if (r.falls > 2) errors.push(`[deep ${cls} D${D}] the hero fell ${r.falls} times`);
      if (r.completed && r.lost < 0.5 && r.bossSecs != null && r.bossSecs < 8) errors.push(`[deep ${cls} D${D}] a walk-over: ${r.lost} lives lost, the chief down in ${r.bossSecs}s`);
    }
    if (deepRows.length) {
      console.log('\nDEEP  class        depth mlvl  secs falls lives-lost min-hp pots  chief-secs chief-lost casts');
      for (const r of deepRows) console.log(`  ${r.cls.padEnd(12)} ${String(r.D).padStart(5)} ${String(r.lvl).padStart(4)} ${String(r.secs).padStart(5)} ${String(r.falls).padStart(5)} ${r.lost.toFixed(2).padStart(10)} ${r.minHp.toFixed(2).padStart(6)} ${String(r.pots).padStart(4)} ${String(r.bossSecs).padStart(11)} ${r.bossLost.toFixed(2).padStart(10)} ${JSON.stringify(r.casts)}`);
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
