// THE ENDLESS SIEGE (docs/ENDLESS_SIEGE.md): reached through Velscour's skull ("siege"). 30 seeds: 64 x 64, the
// courtyard, the ballistae's feet, the standard, the exit and the outside of every gate reachable, spawn points in the
// field, the curtain solid and taller than a hop. In play: the gates hold the dead on their lines while the hero is
// inside (and let them by when he is out), battering breaks a gate, the winch mends it, a loaded ballista looses and
// hits. Screenshots: the courtyard, each gate, a battered gate, a ballista, the field, an overview, the phone layout.
// Then auto-play holds every wave and the exit opens.
//   node tools/tests/siege.js [shots|noshots] [auto|noauto] [depth]      (start the server first: python3 -m http.server 8123)
const { openGame, report } = require('./harness');
const SHOTS = process.argv[2] !== 'noshots';
const AUTO = process.argv[3] !== 'noauto';
const DEPTH = +(process.argv[4] || 8);

(async () => {
  const { browser, page, errors, shot } = await openGame({ width: 1366, height: 860 });
  try {
    // ------------------------------------------------ reached through the skull
    await page.evaluate(async (d) => { await window.VELSCOUR.game.newChar('paladin', 'Warden'); window.VELSCOUR.G.char.depth = d; }, DEPTH);
    await page.waitForTimeout(300);
    await page.click('#velscour-skull');
    await page.fill('#velscour-message', 'siege');
    await page.click('.velscour-contact-dialog button:has-text("Send")');
    await page.waitForFunction(() => window.VELSCOUR.G.world?.biome?.id === 'endless_siege' && document.querySelector('#loading').classList.contains('hidden'), null, { timeout: 30000 });
    const first = await page.evaluate(async () => {
      const { G } = window.VELSCOUR;
      const w = G.world, m = w.map, sc = w.overworldScenario, bad = [];
      if (m.w !== 64 || m.h !== 64) bad.push(`map is ${m.w} x ${m.h}`);
      if (!m.hgt || !m.faceArt) bad.push('no height map / wall faces');
      if (!sc || sc.id !== 'endless_siege') bad.push('no siege run: ' + (sc && sc.id));
      const { castleRamparts } = await import('/src/gfx/castle.js');
      if (!castleRamparts()) bad.push('the Castle masonry was released after the build');
      if (w.creatures.filter((c) => c.team === 'enemy' && !c.dead).length > 6) bad.push('monsters before the first wave');
      return { bad, title: sc?.title, waves: sc?.total, props: w.props.length, chests: w.chests.length, buildings: w.buildings.length, hud: !!document.getElementById('siege-objective') };
    });
    console.log('skull', JSON.stringify(first));
    for (const b of first.bad) errors.push('[skull] ' + b);

    // ------------------------------------------------ 30 seeds
    const gen = await page.evaluate(async () => {
      const { BIOME_BY_ID } = await import('/src/data/biomes.js');
      const { generateSiege, GATES, BALLISTAE, KEEP, LINE, LV } = await import('/src/world/siege.js');
      const biome = BIOME_BY_ID.endless_siege, bad = [];
      let ms = 0, props = 0, spawns = 0;
      for (let n = 1; n <= 30; n++) {
        const seed = n * 7717 + 3, t0 = performance.now();
        let g;
        try { g = generateSiege(8 + n * 10, biome, seed); } catch (e) { bad.push(`seed ${seed}: ${e.message}`); continue; }
        ms = Math.max(ms, performance.now() - t0);
        const m = g.map, W = m.w, I = (x, y) => y * W + x, at = (p) => I(Math.floor(p[0]), Math.floor(p[1]));
        const seen = new Uint8Array(W * m.h), q = [at(g.start)]; seen[q[0]] = 1;
        for (let h = 0; h < q.length; h++) {
          const i = q[h], x = i % W, y = (i / W) | 0;
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const j = I(x + dx, y + dy); if (m.walkableTile(x + dx, y + dy) && !seen[j] && m.stepOk(i, j)) { seen[j] = 1; q.push(j); } }
        }
        const must = [['exit', KEEP.exit], ['standard', [KEEP.banner[0], KEEP.banner[1] + 1.3]], ...BALLISTAE.map((b) => ['ballista ' + b.id, b.foot]),
          ...GATES.map((G0) => ['outside ' + G0.id, G0.axis === 'x' ? [G0.a0 + 1.5, LINE + 2] : [LINE + 2, G0.a0 + 1.5]]),
          ...GATES.map((G0) => ['passage ' + G0.id, G0.axis === 'x' ? [G0.a0 + 1.5, 33.5] : [33.5, G0.a0 + 1.5]]), ...g.spawnPts.map((p, k) => ['spawn ' + k, p]), ...g.chests.map((c, k) => ['chest ' + k, [c.x, c.y]])];
        for (const [name, p] of must) if (!seen[at(p)]) bad.push(`seed ${seed}: ${name} unreachable`);
        // the curtain: solid, taller than a hop, the only ways in are the three gates
        let gaps = 0;
        for (let x = 2; x < 35; x++) if (!m.block[I(x, 33)] && !GATES.some((G0) => G0.axis === 'x' && x >= G0.a0 && x < G0.a0 + 3)) gaps++;
        for (let y = 2; y < 35; y++) if (!m.block[I(33, y)] && !GATES.some((G0) => G0.axis === 'y' && y >= G0.a0 && y < G0.a0 + 3)) gaps++;
        if (gaps) bad.push(`seed ${seed}: ${gaps} gaps in the curtain`);
        if (m.hgt[I(15, 33)] < LV.wall) bad.push(`seed ${seed}: the wall is ${m.hgt[I(15, 33)]} levels`);
        if (g.spawnPts.length < 8) bad.push(`seed ${seed}: ${g.spawnPts.length} spawn points`);
        if (!g.boss) bad.push(`seed ${seed}: no boss look`);
        props += g.props.length; spawns += g.spawnPts.length;
      }
      return { bad, maxMs: Math.round(ms), props: Math.round(props / 30), spawnPts: Math.round(spawns / 30) };
    });
    console.log('generation', JSON.stringify(gen));
    for (const b of gen.bad) errors.push('[gen] ' + b);

    // ------------------------------------------------ the rules in play
    const rules = await page.evaluate(async () => {
      const { G, game } = window.VELSCOUR;
      const w = G.world, sc = w.overworldScenario, p = G.player, bad = [], out = {};
      G.godMode = true;
      const step = (n) => { for (let i = 0; i < n; i++) { G.time += 1 / 30; game.update(1 / 30); } };
      const g = sc.gates[1], lm = w.creatures.find((c) => c.team === 'enemy' && !c.dead);
      // start the first wave, then put one of the dead in the Great Gate's passage while the hero is inside
      sc.standard.use();
      if (sc.phase !== 'wave') bad.push('the standard did not start the wave');
      step(90);
      const m = [...sc.live].find((q) => !q.dead);
      if (!m) { bad.push('no monster spawned in 3 s'); return { bad }; }
      out.spawned = sc.live.size;
      p.x = 18.5; p.y = 26.5; m.x = g.a0 + 1.5; m.y = 34.2; m.nav = null;
      step(2);
      if (m.y < 35.3) bad.push(`held: monster at y ${m.y.toFixed(2)} inside the line`);
      // battering: the gate loses hp while the dead stand on its line
      const hp0 = g.hp;
      for (let i = 0; i < 300 && !g.broken; i++) { m.x = g.a0 + 1.5; m.y = 35.42; m.hp = m.maxHp; step(1); }
      out.battered = Math.round(hp0 - g.hp);
      if (!(g.hp < hp0)) bad.push('the gate took no damage');
      // the hero outside: the gate lets the dead by
      g.hp = g.max; g.broken = false;
      p.x = g.a0 + 1.5; p.y = 38.5; m.x = g.a0 + 1.5; m.y = 34.2;
      step(1);
      if (m.y > 35) bad.push('the gate held a monster while the hero was outside');
      // break it: the winch mends it (between waves: all of it)
      g.hp = 0; g.broken = true;
      const was = sc.phase; sc.phase = 'lull';
      sc.winches[1].use();
      if (g.broken || g.hp < g.max) bad.push('the winch did not mend the gate');
      sc.phase = was;
      // a ballista with bolts looses at the dead in range
      const b = sc.ballistae[1];
      b.ammo = 0; b.use();
      if (b.ammo !== b.max) bad.push('loading did not fill the ballista');
      sc.queue.length = 0; for (const q of sc.live) if (q !== m) { q.dead = true; q.noLoot = true; }
      p.x = 18.5; p.y = 24.5; m.x = 30.5; m.y = 38.5; m.hp = m.maxHp; const hpm = m.hp;
      for (let i = 0; i < 90 && b.ammo === b.max; i++) step(1);
      step(30);
      out.ballista = { ammo: b.ammo, dmg: Math.round(hpm - m.hp), dead: m.dead };
      if (b.ammo === b.max) bad.push('the ballista never loosed');
      if (!(m.hp < hpm) && !m.dead) bad.push('the bolt did not hit');
      out.resolve = sc.resolve;
      return { bad, ...out };
    });
    console.log('rules', JSON.stringify(rules));
    for (const b of rules.bad) errors.push('[rules] ' + b);

    // ------------------------------------------------ screenshots
    if (SHOTS) {
      await page.evaluate(() => window.VELSCOUR.game.teleportToBiome(window.VELSCOUR.G.world.biome));
      await page.waitForFunction(() => document.querySelector('#loading').classList.contains('hidden'), null, { timeout: 30000 });
      const at = async (name, src, zoom = 1, setup = '') => {
        await page.evaluate(async ([src, zoom, setup]) => {
          const { G, game } = window.VELSCOUR;
          const { camera } = await import('/src/core/view.js');
          const w = G.world, m = w.map, p = G.player, sc = w.overworldScenario;
          G.godMode = true;
          if (setup) new Function('G', 'w', 'm', 'p', 'sc', setup)(G, w, m, p, sc);
          const [x, y] = new Function('G', 'w', 'm', 'p', 'sc', src)(G, w, m, p, sc);
          p.x = x; p.y = y; p.moveVec = [0, 0]; p.path = null;
          G.settings.zoom = zoom; camera.computeZoom();
          m.reveal(x, y, 30);
          for (let i = 0; i < 12; i++) { G.time += 1 / 30; game.update(1 / 30); }
          camera.follow(p.x, p.y, 0, true);
          game.render();
        }, [src, zoom, setup]);
        await page.waitForTimeout(150);
        await shot('siege_' + name);
      };
      await at('courtyard', 'return [18.5, 22.5];');
      await at('great_gate_out', 'return [21.5, 39.5];');
      await at('east_gate_out', 'return [39.5, 16.5];');
      await at('ballista', 'const b = sc.ballistae[1]; return [b.foot[0], b.foot[1]];', 1.4);
      await at('field', 'return [46.5, 46.5];', 0.8);
      await at('overview', 'return [30, 30];', 0.42);
      // a wave at the Great Gate: battered, the dead held on its line, the hero behind it, a ballista loosing
      await at('battle', 'return [21.5, 33.6];', 1.1, `
        sc.standard.use(); const g = sc.gates[1]; g.hp = 45;
        for (const b of sc.ballistae) b.ammo = 4;
        for (let i = 0; i < 300 && sc.live.size < 8; i++) { G.time += 1/30; window.VELSCOUR.game.update(1/30); }
        let k = 0; for (const q of sc.live) { if (q.dead) continue; q.x = g.a0 + 0.4 + (k % 4) * 0.7; q.y = 35.5 + Math.floor(k / 4) * 0.9; q.nav = null; k++; }`);
      await at('breach', 'return [17.5, 29.5];', 1, 'const g = sc.gates[0]; g.hp = 0; g.broken = true;');
    }

    // ------------------------------------------------ auto-play holds the walls
    if (AUTO) {
      const res = await page.evaluate(async (d) => {
        const { G, game } = window.VELSCOUR;
        const { Auto } = await import('/src/game/autoplay.js');
        const { BIOME_BY_ID } = await import('/src/data/biomes.js');
        // a hero the way one looks arriving at this depth (tools/tests/balance.js, lighter): its level, points spent, gear
        const { depthLevel } = await import('/src/data/depth.js');
        const { rollItem } = await import('/src/data/items.js');
        const c = G.char, p = G.player, L = depthLevel(d);
        c.level = L + 1; c.statPoints += L * 5; c.skillPoints += L + d;
        Auto.spendStats(); Auto.spendSkills(); Auto.arrangeBar();
        for (let r = 0; r < 4; r++) {
          c.bag = c.bag.map(() => null);
          for (let i = 0; i < 20 && i < c.bag.length; i++) { const it = rollItem(L - (i % 4), { mf: 60, bonus: 0.15 }); it.unid = false; c.bag[i] = it; }
          p.recompute(); Auto.optimizeGear();
        }
        c.bag = c.bag.map(() => null); p.recompute(); p.hp = p.maxHp;
        G.godMode = true; c.depth = d;
        await game.teleportToBiome(BIOME_BY_ID.endless_siege);
        Auto.toggle(true);
        const t0 = performance.now(), w = G.world, sc = w.overworldScenario, log = [];
        let sim = 0, lastWave = -1, lastPhase = '';
        while (sim < 1500 && !sc.completed && performance.now() - t0 < 240000 && G.world === w) {
          for (let i = 0; i < 30; i++) { G.dt = 1 / 30; G.time += G.dt; G.frame++; game.update(1 / 30); sim += 1 / 30; }
          if (sc.phase === 'lull' && Math.round(sim) % 10 === 0) log.push(`  ${Math.round(sim)}s ${Auto.status} @${G.player.x.toFixed(1)},${G.player.y.toFixed(1)} ${JSON.stringify(sc.objective && [sc.objective.x, sc.objective.y].map((v) => +v.toFixed(1)))}`);
          if (sc.wave !== lastWave || sc.phase !== lastPhase) { log.push(`${Math.round(sim)}s ${sc.phase} w${sc.wave} r${Math.round(sc.resolve)} [${sc.ballistae.map((b) => b.ammo).join(',')}] [${sc.gates.map((g) => (g.broken ? 'X' : Math.round(g.hp))).join(',')}]`); lastWave = sc.wave; lastPhase = sc.phase; }
          await new Promise((r) => setTimeout(r, 0));
        }
        const exit = w.portals.find((q) => q.type === 'exit');
        Auto.toggle(false);
        return { lvl: G.char.level, secs: Math.round(sim), completed: sc.completed, waves: `${sc.wave}/${sc.total}`, falls: sc.falls, kills: sc.kills, status: Auto.status, exit: exit?.active, log, same: G.world === w };
      }, DEPTH);
      console.log('auto-play', JSON.stringify(res));
      if (!res.completed) errors.push(`[auto] did not break the siege in ${res.secs}s (${res.waves}, ${res.status})`);
      if (res.completed && !res.exit) errors.push('[auto] the exit did not open');
      if (SHOTS) { await page.evaluate(() => window.VELSCOUR.game.render()); await shot('siege_auto_end'); }
    }

    // ------------------------------------------------ phone layout
    if (SHOTS) {
      const m = await openGame({ width: 844, height: 390, mobile: true });
      await m.page.evaluate(async () => {
        const { G, game } = window.VELSCOUR;
        const { BIOME_BY_ID } = await import('/src/data/biomes.js');
        await game.newChar('ranger', 'Phone');
        await game.teleportToBiome(BIOME_BY_ID.endless_siege);
        const p = G.player; p.x = 20.5; p.y = 29.5;
        for (let i = 0; i < 20; i++) { G.time += 1 / 30; game.update(1 / 30); }
        game.render();
      });
      await m.page.waitForTimeout(300);
      await m.shot('siege_mobile');
      errors.push(...m.errors);
      await m.browser.close();
    }
  } catch (e) { errors.push('[test] ' + e.message); }
  report(errors);
  await browser.close();
})();
