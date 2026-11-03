// THE GREAT HUNT (docs/GREAT_HUNT.md): reached through Velscour's skull ("hunt"). 40 seeds: 96 x 96, every clue, the
// three hunting grounds, the lair, the exit and the caches reachable from the camp, three clues a leg. The hunt in play:
// a sign read, the beast woken, its life gate (a huge hit only takes it to the flee mark), the flight down the next leg
// with its blood trail, its wounds carried over to the next ground. Screenshots: the camp, a sign, the beast at bay,
// the flight, the blood trail, the lair, an overview, the phone layout. Then auto-play tracks it down and kills it.
//   node tools/tests/hunt.js [shots|noshots] [auto|noauto]      (start the server first: python3 -m http.server 8123)
const { openGame, report } = require('./harness');
const SHOTS = process.argv[2] !== 'noshots';
const AUTO = process.argv[3] !== 'noauto';

(async () => {
  const { browser, page, errors, shot } = await openGame({ width: 1366, height: 860 });
  try {
    // ------------------------------------------------ reached through the skull
    await page.evaluate(async () => { await window.VELSCOUR.game.newChar('paladin', 'Hunter'); window.VELSCOUR.G.char.depth = 6; });
    await page.waitForTimeout(300);
    await page.click('#velscour-skull');
    await page.fill('#velscour-message', 'hunt');
    await page.click('.velscour-contact-dialog button:has-text("Send")');
    await page.waitForFunction(() => window.VELSCOUR.G.world?.biome?.id === 'great_hunt' && document.querySelector('#loading').classList.contains('hidden'), null, { timeout: 30000 });
    const first = await page.evaluate(async () => {
      const { G } = window.VELSCOUR;
      const { ART_BY_ID } = await import('/src/data/bestiary.js');
      const { HUNT_BEASTS } = await import('/src/game/hunt.js');
      const bad = [], w = G.world, sc = w.overworldScenario, m = w.map;
      if (m.w !== 96 || m.h !== 96) bad.push(`map is ${m.w} x ${m.h}`);
      if (!sc || sc.id !== 'great_hunt') bad.push('no hunt run');
      if (!sc.beast || w.boss !== sc.beast) bad.push('the beast is not the level boss');
      for (const b of HUNT_BEASTS) { const a = ART_BY_ID[b.art]; if (!a) bad.push(`beast art ${b.art} missing`); else if (!a.lone) bad.push(`${b.art} is not a giant`); }
      if (sc.clues.length !== 12) bad.push(`${sc.clues.length} clues`);
      if (!w.portals.some((q) => q.type === 'objective')) bad.push('no sign marked');
      return { bad, title: sc.title, beast: sc.beast.name, art: sc.beast.art, hp: Math.round(sc.beast.maxHp), props: w.props.length, trees: w.props.filter((p) => p.tree).length, mobs: w.creatures.length };
    });
    console.log('skull', JSON.stringify(first));
    for (const b of first.bad) errors.push('[skull] ' + b);

    // ------------------------------------------------ 40 seeds
    const gen = await page.evaluate(async () => {
      const { BIOME_BY_ID } = await import('/src/data/biomes.js');
      const { generateHunt } = await import('/src/world/hunt.js');
      const biome = BIOME_BY_ID.great_hunt, bad = [], stats = [];
      let ms = 0;
      for (let n = 1; n <= 40; n++) {
        const seed = n * 6151 + 3, t0 = performance.now();
        let g;
        try { g = generateHunt(6, biome, seed); } catch (e) { bad.push(`seed ${seed}: ${e.message}`); continue; }
        ms = Math.max(ms, performance.now() - t0);
        const m = g.map, W = m.w, I = (x, y) => Math.floor(y) * W + Math.floor(x), h = g.hunt;
        const seen = new Uint8Array(W * m.h), q = [I(g.start[0], g.start[1])]; seen[q[0]] = 1;
        for (let a = 0; a < q.length; a++) {
          const i = q[a], x = i % W, y = (i / W) | 0;
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const j = I(x + dx, y + dy); if (m.walkableTile(x + dx, y + dy) && !seen[j]) { seen[j] = 1; q.push(j); } }
        }
        const need = [['exit', g.exit], ['lair', h.lair], ...h.grounds.map((p, k) => ['ground ' + k, p]), ...h.clues.map((c) => [`clue ${c.leg}.${c.n}`, [c.x, c.y]]), ...g.chests.map((c, k) => ['chest ' + k, [c.x, c.y]])];
        for (const [what, p] of need) if (!seen[I(p[0], p[1])]) bad.push(`seed ${seed}: ${what} unreachable`);
        for (let leg = 0; leg < 4; leg++) if (h.clues.filter((c) => c.leg === leg).length !== 3) bad.push(`seed ${seed}: leg ${leg} has ${h.clues.filter((c) => c.leg === leg).length} clues`);
        // the beast runs the trail: every leg's line on open ground, and A* from the camp to the lair
        for (const [k, path] of h.paths.entries()) { const off = path.filter(([x, y]) => !m.walkable(x, y)).length; if (off > 2) bad.push(`seed ${seed}: leg ${k} has ${off} blocked trail points`); }
        if (!m.findPath(g.start[0], g.start[1], h.lair[0], h.lair[1], 60000)) bad.push(`seed ${seed}: A* finds no way to the lair`);
        const open = seen.reduce((a, v) => a + v, 0);
        stats.push({ open, props: g.props.length, spawns: g.spawns.length, chests: g.chests.length, trail: h.paths.reduce((a, p) => a + p.length, 0) });
      }
      const avg = (k) => Math.round(stats.reduce((a, s) => a + s[k], 0) / Math.max(1, stats.length));
      return { bad, maxMs: Math.round(ms), avg: { open: avg('open'), trail: avg('trail'), props: avg('props'), spawns: avg('spawns'), chests: avg('chests') } };
    });
    console.log('generation', JSON.stringify(gen));
    for (const b of gen.bad) errors.push('[gen] ' + b);

    // ------------------------------------------------ the hunt in play: a sign, the gate, the flight, the wounds kept
    const play = await page.evaluate(async () => {
      const { G, game } = window.VELSCOUR;
      const { hit } = await import('/src/game/combat.js');
      const { bakedDecals } = await import('/src/gfx/vfx.js');
      const w = G.world, sc = w.overworldScenario, m = sc.beast, p = G.player, bad = [], out = {};
      G.godMode = true;
      const tick = (n) => { for (let i = 0; i < n; i++) { G.time += 1 / 30; game.update(1 / 30); } };
      for (const c of w.creatures) if (c !== p && c !== m && c.team === 'enemy') c.dead = true;
      tick(2);
      // a sign read by walking up to it, and the next one marked
      const c0 = sc.clues[0];
      p.x = c0.x; p.y = c0.y + 0.5; tick(3);
      if (!c0.read) bad.push('the first sign was not read');
      const mk = w.portals.find((q) => q.type === 'objective');
      if (!mk || Math.hypot(mk.x - sc.clues[1].x, mk.y - sc.clues[1].y) > 0.1) bad.push('the second sign is not marked');
      // up to the beast: it wakes, the fight starts
      const g0 = [m.x, m.y];
      p.x = g0[0] + 3; p.y = g0[1] + 3; tick(30);
      if (sc.phase !== 'fight') bad.push('the beast did not wake (phase ' + sc.phase + ')');
      // a hit for its whole life: the gate holds it at the flee mark
      hit(p, m, m.maxHp * 5, 'phys', { crit: false });
      out.afterBigHit = Math.round(m.hp / m.maxHp * 100);
      if (m.dead) bad.push('one hit killed it at the first ground');
      else if (Math.abs(m.hp / m.maxHp - 0.75) > 0.01) bad.push(`the gate held it at ${out.afterBigHit}%, not 75%`);
      const dec0 = bakedDecals.length;
      tick(2);
      if (sc.phase !== 'flee' || sc.stage !== 1) bad.push(`no flight after the gate (phase ${sc.phase}, stage ${sc.stage})`);
      if (m.targetable !== false) bad.push('the fleeing beast can be hit');
      // let it run; the hero stays put, so it leaves his sight and parks on the next ground
      let t = 0;
      while (sc.phase === 'flee' && t < 30) { tick(15); t += 0.5; }
      const g1 = sc.clues.length && sc.phase === 'track' ? [m.x, m.y] : null;
      out.fleeSecs = t;
      if (sc.phase !== 'track') bad.push('the beast never reached the next ground');
      else {
        const want = w.map.hunt.anchors[2];
        if (Math.hypot(g1[0] - want[0], g1[1] - want[1]) > 0.5) bad.push('it parked away from the second ground');
      }
      out.blood = bakedDecals.length - dec0;
      if (out.blood < 20) bad.push(`only ${out.blood} blood splats down the trail`);
      out.carried = Math.round(m.hp / m.maxHp * 100);
      if (out.carried !== 75) bad.push(`its wounds did not carry over (${out.carried}%)`);
      if (m.awake || m.targetable === false) bad.push('it is not resting on the new ground');
      // the second leg's first clue is marked
      const c3 = sc.clues.find((c) => c.leg === 1 && c.n === 0), mk2 = w.portals.find((q) => q.type === 'objective');
      if (!mk2 || Math.hypot(mk2.x - c3.x, mk2.y - c3.y) > 0.1) bad.push('the blood trail\'s first sign is not marked');
      out.title = sc.title;
      return { bad, ...out };
    });
    console.log('play', JSON.stringify(play));
    for (const b of play.bad) errors.push('[play] ' + b);

    // ------------------------------------------------ screenshots
    if (SHOTS) {
      await page.evaluate(async () => { const { G, game } = window.VELSCOUR; const { BIOME_BY_ID } = await import('/src/data/biomes.js'); G.huntBeast = 'moon_eater'; await game.teleportToBiome(BIOME_BY_ID.great_hunt); G.godMode = true; });
      const at = async (name, fn, zoom = 1, steps = 12) => {
        await page.evaluate(async ([src, zoom, steps]) => {
          const { G, game } = window.VELSCOUR;
          const { camera } = await import('/src/core/view.js');
          const w = G.world, m = w.map, p = G.player, sc = w.overworldScenario;
          const r = new Function('G', 'w', 'm', 'p', 'sc', src)(G, w, m, p, sc);
          if (r) { p.x = r[0]; p.y = r[1]; }
          p.moveVec = [0, 0]; p.path = null;
          G.settings.zoom = zoom; camera.computeZoom();
          m.reveal(p.x, p.y, 16);
          for (let i = 0; i < steps; i++) { G.time += 1 / 30; game.update(1 / 30); }
          camera.follow(p.x, p.y, 0, true);
          game.render();
        }, [fn, zoom, steps]);
        await page.waitForTimeout(150);
        await shot('hunt_' + name);
      };
      await at('camp', 'return [w.map.hunt.anchors[0][0] + 1, w.map.hunt.anchors[0][1] + 1];');
      await at('sign', 'const c = sc.clues[0]; return [c.x + c.nx * 2.5, c.y + c.ny * 2.5];', 1.3);
      await at('sign2', 'const c = sc.clues[1]; return [c.x + 1.5, c.y + 1.5];', 1.3);
      await at('beast', 'const g = w.map.hunt.anchors[1]; return [g[0] + 5, g[1] + 5];', 1, 40);
      await at('fight', 'const b = sc.beast; return [b.x + 2.5, b.y + 2.5];', 1, 60);
      // the flight: the gate, a moment of running
      // the flight: a blow to its flee mark, then a moment of running
      await page.evaluate(async () => { const { G } = window.VELSCOUR; const { hit } = await import('/src/game/combat.js'); const b = G.world.overworldScenario.beast; hit(G.player, b, b.maxHp, 'phys', { crit: false }); });
      await at('flee', 'return null;', 1, 45);
      await at('blood_trail', 'const path = w.map.hunt.paths[1]; const q = path[Math.floor(path.length * 0.3)]; return [q[0], q[1]];', 1, 120);
      await at('lair', 'const l = w.map.hunt.anchors[4]; return [l[0] + 4, l[1] + 4];', 1);
      await at('overview', 'return [48, 48];', 0.3);
      await page.evaluate(async () => { const { G } = window.VELSCOUR; const { camera } = await import('/src/core/view.js'); G.settings.zoom = 1; camera.computeZoom(); G.huntBeast = undefined; });
    }

    // ------------------------------------------------ auto-play tracks the beast down and kills it
    if (AUTO) {
      const res = await page.evaluate(async () => {
        const { G, game } = window.VELSCOUR;
        const { Auto } = await import('/src/game/autoplay.js');
        const { BIOME_BY_ID } = await import('/src/data/biomes.js');
        // a new hero at Depth 3 (a fresh level-1 hero dodges more than he hits a depth 6 beast once it enrages)
        G.godMode = true; G.char.depth = 3; G.world.depth = 3;
        await game.teleportToBiome(BIOME_BY_ID.great_hunt);
        Auto.toggle(true);
        const t0 = performance.now();
        let sim = 0;
        const w = G.world, sc = w.overworldScenario, log = [];
        let last = '';
        while (sim < 1500 && !sc.completed && performance.now() - t0 < 240000) {
          for (let i = 0; i < 30; i++) { G.dt = 1 / 30; G.time += G.dt; G.frame++; game.update(1 / 30); sim += 1 / 30; }
          const k = `${sc.stage}:${sc.phase}`;
          if (k !== last) { log.push(`${Math.round(sim)}s ${k} ${sc.life}% read ${sc.read}`); last = k; }
          await new Promise((r) => setTimeout(r, 0));
        }
        Auto.toggle(false);
        return { secs: Math.round(sim), completed: sc.completed, beast: sc.def.name, life: sc.life, read: sc.read, log, status: Auto.status, exit: w.portals.find((q) => q.type === 'exit')?.active };
      });
      console.log('auto-play', JSON.stringify(res));
      if (!res.completed) errors.push(`[auto] did not finish the hunt in ${res.secs}s (stage log ${res.log.join(' | ')}, ${res.status})`);
      else if (!res.exit) errors.push('[auto] the exit did not open');
      if (SHOTS) { await page.evaluate(() => window.VELSCOUR.game.render()); await shot('hunt_auto_end'); }
    }

    // ------------------------------------------------ phone layout
    if (SHOTS) {
      const m = await openGame({ width: 844, height: 390, mobile: true });
      await m.page.evaluate(async () => {
        const { G, game } = window.VELSCOUR;
        const { BIOME_BY_ID } = await import('/src/data/biomes.js');
        await game.newChar('ranger', 'Phone');
        await game.teleportToBiome(BIOME_BY_ID.great_hunt);
        const c = G.world.overworldScenario.clues[0], p = G.player; p.x = c.x + 2; p.y = c.y + 2;
        for (let i = 0; i < 20; i++) { G.time += 1 / 30; game.update(1 / 30); }
        game.render();
      });
      await m.page.waitForTimeout(200);
      await m.shot('hunt_mobile');
      errors.push(...m.errors);
      await m.browser.close();
    }
  } catch (e) { errors.push('[test] ' + e.message); }
  report(errors);
  await browser.close();
})();
