// MOUNTAINSIDE (beta, docs/MOUNTAINSIDE.md): reached through Velscour's skull ("mountain"), first on the HAIL
// VELSCOUR! list, never in the biome draw. 30 seeds: 50 x 50, a two-way trail to the summit, cliffs too tall to hop on
// every band. The hop rules in play (a 1-2 level step climbs, 3+ blocks, a drop works one way), pathing (A*, the
// flow field), picking on lifted ground, and screenshots: the foot, a ramp, a cliff band, a hop, the summit, an
// overview, the phone layout. Then auto-play climbs and takes the summit.
//   node tools/tests/mountain.js [shots|noshots] [auto|noauto]      (start the server first: python3 -m http.server 8123)
const { openGame, report } = require('./harness');
const SHOTS = process.argv[2] !== 'noshots';
const AUTO = process.argv[3] !== 'noauto';

(async () => {
  const { browser, page, errors, shot } = await openGame({ width: 1366, height: 860 });
  try {
    // ------------------------------------------------ reached through the skull
    await page.evaluate(async () => { await window.VELSCOUR.game.newChar('paladin', 'Climber'); window.VELSCOUR.G.char.depth = 6; });
    await page.waitForTimeout(300);
    await page.click('#velscour-skull');
    await page.fill('#velscour-message', 'mountain');
    await page.click('.velscour-contact-dialog button:has-text("Send")');
    await page.waitForFunction(() => window.VELSCOUR.G.world?.biome?.id === 'mountainside' && document.querySelector('#loading').classList.contains('hidden'), null, { timeout: 30000 });
    const first = await page.evaluate(async () => {
      const { G, game } = window.VELSCOUR;
      const { BIOMES, BETA_BIOMES, drawBiome, OVERWORLD_BIOME_IDS } = await import('/src/data/biomes.js');
      const bad = [];
      // never drawn: 3000 draws with every guarantee path
      const c = { biomeBag: [], overworldMisses: 0 };
      for (let i = 0; i < 3000; i++) { c.overworldMisses = i % 4; const id = drawBiome(c, 10 + (i % 30)); if (id === 'mountainside') { bad.push('drawn into the rotation'); break; } c.lastBiome = id; }
      if (OVERWORLD_BIOME_IDS.includes('mountainside') || BIOMES.some((b) => b.id === 'mountainside')) bad.push('listed with the regular biomes');
      // first on HAIL VELSCOUR!'s list
      game.openVelscourTeleport();
      const opt = document.querySelector('#velscour-biome option');
      if (!opt || opt.value !== 'mountainside') bad.push('not first on the teleport list: ' + (opt && opt.value));
      document.querySelector('.velscour-teleport-dialog button')?.click();
      const m = G.world.map;
      if (m.w !== 50 || m.h !== 50) bad.push(`map is ${m.w} x ${m.h}`);
      if (!m.hgt) bad.push('no height map');
      return { bad, title: G.world.overworldScenario?.title, levels: [m.minLevel, m.maxLevel], props: G.world.props.length, mobs: G.world.creatures.length };
    });
    console.log('skull', JSON.stringify(first));
    for (const b of first.bad) errors.push('[skull] ' + b);

    // ------------------------------------------------ 30 seeds
    const gen = await page.evaluate(async () => {
      const { BIOME_BY_ID } = await import('/src/data/biomes.js');
      const { generateMountain } = await import('/src/world/mountain.js');
      const biome = BIOME_BY_ID.mountainside, bad = [], stats = [];
      let ms = 0;
      for (let n = 1; n <= 30; n++) {
        const seed = n * 4241 + 9, t0 = performance.now();
        let g;
        try { g = generateMountain(6, biome, seed); } catch (e) { bad.push(`seed ${seed}: ${e.message}`); continue; }
        ms = Math.max(ms, performance.now() - t0);
        const m = g.map, W = m.w, I = (x, y) => y * W + x;
        // directed reachability under the hop rules: up from the foot, and back down from the summit
        const reach = (from) => {
          const seen = new Uint8Array(W * m.h), q = [from]; seen[from] = 1;
          for (let h = 0; h < q.length; h++) {
            const i = q[h], x = i % W, y = (i / W) | 0;
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
              if (!m.walkableTile(x + dx, y + dy)) continue;
              const j = I(x + dx, y + dy);
              if (!seen[j] && m.stepOk(i, j)) { seen[j] = 1; q.push(j); }
            }
          }
          return seen;
        };
        const s0 = I(Math.floor(g.start[0]), Math.floor(g.start[1])), e0 = I(Math.floor(g.exit[0]), Math.floor(g.exit[1]));
        const up = reach(s0), down = reach(e0);
        if (!up[e0]) bad.push(`seed ${seed}: summit unreachable from the foot`);
        if (!down[s0]) bad.push(`seed ${seed}: no way back down`);
        for (const ch of g.chests) if (!up[I(Math.floor(ch.x), Math.floor(ch.y))]) bad.push(`seed ${seed}: chest at ${ch.x.toFixed(1)},${ch.y.toFixed(1)} unreachable`);
        // tall cliffs on every band, hop-sized steps, and the climb
        let tall = 0, hops = 0, drops = 0;
        for (let y = 0; y < m.h - 1; y++) for (let x = 3; x < 46; x++) {
          const a = I(x, y), b = I(x, y + 1), d = m.hgt[a] - m.hgt[b];
          if (d > m.climb) tall++; if (d === m.climb) hops++; if (d > m.climb && d <= m.drop) drops++;
        }
        if (tall < 100) bad.push(`seed ${seed}: only ${tall} unclimbable steps`);
        if (hops < 20) bad.push(`seed ${seed}: only ${hops} hop-high steps`);
        const blockedTrail = g.trail.filter((i) => m.block[i]).length;
        if (blockedTrail) bad.push(`seed ${seed}: ${blockedTrail} trail tiles blocked`);
        stats.push({ seed, tall, hops, drops, trail: g.trail.length, rise: m.maxLevel - m.minLevel, props: g.props.length, spawns: g.spawns.length, chests: g.chests.length });
      }
      const avg = (k) => Math.round(stats.reduce((a, s) => a + s[k], 0) / stats.length);
      return { bad, maxMs: Math.round(ms), avg: { tall: avg('tall'), hops: avg('hops'), drops: avg('drops'), trail: avg('trail'), rise: avg('rise'), props: avg('props'), spawns: avg('spawns'), chests: avg('chests') } };
    });
    console.log('generation', JSON.stringify(gen));
    for (const b of gen.bad) errors.push('[gen] ' + b);

    // ------------------------------------------------ the hop rules in play
    const rules = await page.evaluate(async () => {
      const { G, game } = window.VELSCOUR;
      const { camera, isoX, isoY } = await import('/src/core/view.js');
      const w = G.world, m = w.map, p = G.player, W = m.w, bad = [], out = {};
      G.godMode = true;
      for (const c of w.creatures) if (c !== p && c.team === 'enemy') { c.x = 48; c.y = 48; c.disabled = () => true; }
      // walk into the next tile toward +y/-y and see where the hero ends up
      const tryStep = (x, y, dy) => {
        p.x = x + 0.5; p.y = y + 0.5; p.path = null; p.moveTarget = null;
        for (let i = 0; i < 40 && (dy < 0 ? p.y >= y : p.y < y + 1); i++) m.move(p, 0, dy * 0.05);
        return dy < 0 ? p.y < y : p.y >= y + 1;
      };
      const find = (pred) => {
        for (let y = 2; y < m.h - 2; y++) for (let x = 6; x < 44; x++) {
          const a = y * W + x, b = (y - 1) * W + x;
          if (!m.walkableTile(x, y) || !m.walkableTile(x, y - 1)) continue;
          if (!m.walkableTile(x - 1, y) || !m.walkableTile(x + 1, y) || !m.walkableTile(x - 1, y - 1) || !m.walkableTile(x + 1, y - 1)) continue;
          // the same rise across the three columns, so the hero can't slide round the step
          const d = m.hgt[b] - m.hgt[a];
          if ([-1, 0, 1].every((o) => m.hgt[b + o] - m.hgt[a + o] === d) && pred(d)) return [x, y];
        }
        return null;
      };
      const two = find((d) => d === m.climb), three = find((d) => d > m.climb && d <= m.drop);
      if (!two) bad.push('no clean two-level step found'); else if (!tryStep(two[0], two[1], -1)) bad.push(`could not hop up ${m.climb} levels at ${two}`);
      if (!three) bad.push('no clean tall step found');
      else {
        out.tall = m.hgt[(three[1] - 1) * W + three[0]] - m.hgt[three[1] * W + three[0]];
        if (tryStep(three[0], three[1], -1)) bad.push(`climbed ${out.tall} levels at ${three}`);
        if (!tryStep(three[0], three[1] - 1, 1)) bad.push(`could not drop ${out.tall} levels at ${three}`);
      }
      // A* and the flow field respect the cliffs: a path from the foot to the summit only steps legally
      const path = m.findPath(w.overworldScenario.shrine.x, w.overworldScenario.shrine.y + 1.5, 8.5, 45.5, 60000);
      const top = w.overworldScenario.shrine, up = m.findPath(8.5, 45.5, top.x, top.y, 60000);
      if (!up) bad.push('A* found no way up');
      else {
        let x = 8.5, y = 45.5, ill = 0;
        for (const [tx, ty] of up) { if (!m.losWide(x, y, tx, ty, 0.28)) ill++; x = tx; y = ty; }
        if (ill) bad.push(`${ill} A* legs cross a cliff`);
        out.upLegs = up.length;
      }
      out.downLegs = path ? path.length : 0;
      m.flowFrom = [-1, -1]; m.buildFlow(top.x, top.y, 400);
      if (m.flowAt(8.5, 45.5) < 0) bad.push('the flow field from the summit never reaches the foot');
      // picking: the screen point of a lifted tile maps back to that tile
      let miss = 0;
      for (let k = 0; k < 40; k++) {
        const tx = 6 + (k * 7) % 38, ty = 2 + (k * 11) % 44;
        // skip tiles hidden behind a higher column in front of them
        if (!m.walkableTile(tx, ty) || [[1, 0], [0, 1], [1, 1]].some(([ox, oy]) => m.hgt[(ty + oy) * W + tx + ox] > m.hgt[ty * W + tx])) continue;
        p.x = tx + 0.5; p.y = ty + 0.5; camera.follow(p.x, p.y, 0, true);
        const [sx, sy] = camera.tileToScreen(tx + 0.5, ty + 0.5), [px, py] = camera.screenToTile(sx, sy);
        if (Math.floor(px) !== tx || Math.floor(py) !== ty) miss++;
      }
      if (miss > 2) bad.push(`${miss}/40 picks land on the wrong tile`);
      out.pickMisses = miss;
      return { bad, ...out };
    });
    console.log('rules', JSON.stringify(rules));
    for (const b of rules.bad) errors.push('[rules] ' + b);

    // ------------------------------------------------ screenshots
    if (SHOTS) {
      const at = async (name, fn, zoom = 1) => {
        await page.evaluate(async ([src, zoom]) => {
          const { G, game } = window.VELSCOUR;
          const { camera } = await import('/src/core/view.js');
          const w = G.world, m = w.map, p = G.player;
          const [x, y] = new Function('G', 'w', 'm', 'p', src)(G, w, m, p);
          p.x = x; p.y = y; p.moveVec = [0, 0]; p.path = null;
          G.settings.zoom = zoom; camera.computeZoom();
          m.reveal(x, y, 14);
          for (let i = 0; i < 12; i++) { G.time += 1 / 30; game.update(1 / 30); }
          camera.follow(p.x, p.y, 0, true);
          game.render();
        }, [fn, zoom]);
        await page.waitForTimeout(150);
        await shot('mountain_' + name);
      };
      await at('start', 'return [8.5, 45.5];');
      await at('ramp1', 'const t = m.mountain.trail; const i = t[Math.floor(t.length * 0.18)]; return [i % m.w + 0.5, ((i / m.w) | 0) + 0.5];');
      await at('trail_mid', 'const t = m.mountain.trail; const i = t[Math.floor(t.length * 0.5)]; return [i % m.w + 0.5, ((i / m.w) | 0) + 0.5];');
      await at('trail_high', 'const t = m.mountain.trail; const i = t[Math.floor(t.length * 0.8)]; return [i % m.w + 0.5, ((i / m.w) | 0) + 0.5];');
      await at('summit', 'const s = w.overworldScenario.shrine; return [s.x - 2.5, s.y + 3.5];');
      await at('ledge', 'const l = m.mountain.ledges[0] || [20, 20]; return [l[0] + 1.5, l[1] + 1.5];');
      await at('overview', 'return [24, 24];', 0.42);
      await at('overview_low', 'return [20, 36];', 0.6);
      // a hop caught mid-air: walk the hero up a two-level step
      await page.evaluate(async () => {
        const { G, game } = window.VELSCOUR;
        const { camera } = await import('/src/core/view.js');
        const m = G.world.map, p = G.player, W = m.w;
        G.settings.zoom = 1.6; camera.computeZoom();
        for (let y = 30; y > 2; y--) for (let x = 8; x < 40; x++) {
          const a = y * W + x, b = (y - 1) * W + x;
          if (m.walkableTile(x, y) && m.walkableTile(x, y - 1) && m.hgt[b] - m.hgt[a] === m.climb && !p._hopDone) {
            p.x = x + 0.5; p.y = y + 0.62; p._hopDone = true;
          }
        }
        camera.follow(p.x, p.y, 0, true); game.render();
        for (let i = 0; i < 60 && !(p._hop && G.time - p._hop.t0 > 0.08); i++) { m.move(p, 0, -0.04); G.time += 1 / 60; camera.follow(p.x, p.y, 0, true); game.render(); }
      });
      await shot('mountain_hop');
      await page.evaluate(async () => { const { G } = window.VELSCOUR; const { camera } = await import('/src/core/view.js'); G.settings.zoom = 1; camera.computeZoom(); });
    }

    // ------------------------------------------------ auto-play takes the summit
    if (AUTO) {
      const res = await page.evaluate(async () => {
        const { G, game } = window.VELSCOUR;
        const { Auto } = await import('/src/game/autoplay.js');
        const { BIOME_BY_ID } = await import('/src/data/biomes.js');
        G.godMode = true;
        await game.teleportToBiome(BIOME_BY_ID.mountainside);
        Auto.toggle(true);
        const t0 = performance.now();
        let sim = 0, best = 0;
        const w = G.world, sc = w.overworldScenario;
        while (sim < 600 && !sc.completed && performance.now() - t0 < 150000) {
          for (let i = 0; i < 30; i++) { G.dt = 1 / 30; G.time += G.dt; G.frame++; game.update(1 / 30); sim += 1 / 30; }
          best = Math.max(best, sc.altitude);
          await new Promise((r) => setTimeout(r, 0));
        }
        Auto.toggle(false);
        return { secs: Math.round(sim), completed: sc.completed, altitude: best, status: Auto.status, exit: w.portals.find((q) => q.type === 'exit')?.active };
      });
      console.log('auto-play', JSON.stringify(res));
      if (!res.completed) errors.push(`[auto] did not take the summit in ${res.secs}s (best altitude ${res.altitude}%, ${res.status})`);
      if (SHOTS) { await page.evaluate(() => window.VELSCOUR.game.render()); await shot('mountain_auto_end'); }
    }

    // ------------------------------------------------ phone layout
    if (SHOTS) {
      const m = await openGame({ width: 844, height: 390, mobile: true });
      await m.page.evaluate(async () => {
        const { G, game } = window.VELSCOUR;
        const { BIOME_BY_ID } = await import('/src/data/biomes.js');
        await game.newChar('ranger', 'Phone');
        await game.teleportToBiome(BIOME_BY_ID.mountainside);
        const p = G.player; p.x = 20.5; p.y = 30.5;
        for (let i = 0; i < 20; i++) { G.time += 1 / 30; game.update(1 / 30); }
        game.render();
      });
      await m.page.waitForTimeout(200);
      await m.shot('mountain_mobile');
      errors.push(...m.errors);
      await m.browser.close();
    }
  } catch (e) { errors.push('[test] ' + e.message); }
  report(errors);
  await browser.close();
})();
