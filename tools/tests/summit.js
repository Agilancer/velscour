// THE SNOWY SUMMIT (docs/SNOWY_SUMMIT.md): the region the Mountainside's summit leads into (and the skull's "summit").
// Seeds: start to peak along ridges and four plateaus, every gate shuts its plateau's way on, hop steps on the ridges,
// ridges thin (2-3 tiles), the five bosses' art and templates. Live: every plateau's fight forced and won by a bot (its
// gate opens, its chest), each of the five bosses comes down on the peak in its snow swap, the exit opens there;
// screenshots; then auto-play takes a whole Summit.
//   node tools/tests/summit.js [shots|noshots] [auto|noauto] [seeds] [mobile]   (start the server first)
const { openGame, report } = require('./harness');
const SHOTS = process.argv[2] !== 'noshots';
const AUTO = process.argv[3] !== 'noauto';
const SEEDS = +(process.argv[4] || 30);
const MOBILE = process.argv.includes('mobile');

(async () => {
  const { browser, page, errors, shot } = await openGame({ width: 1366, height: 860 });
  try {
    // ------------------------------------------------ through the skull
    await page.evaluate(async () => { await window.VELSCOUR.game.newChar('paladin', 'Peakbound'); window.VELSCOUR.G.char.depth = 8; });
    await page.waitForTimeout(300);
    await page.click('#velscour-skull');
    await page.fill('#velscour-message', 'summit');
    await page.click('.velscour-contact-dialog button:has-text("Send")');
    await page.waitForFunction(() => window.VELSCOUR.G.world?.biome?.id === 'snowy_summit' && document.querySelector('#loading').classList.contains('hidden'), null, { timeout: 60000 });

    // ------------------------------------------------ seeds
    const gen = await page.evaluate(async (SEEDS) => {
      const { BIOME_BY_ID } = await import('/src/data/biomes.js');
      const { generateSummit, SUMMIT_BOSSES, CLIMB, DROP, WALK } = await import('/src/world/summit.js');
      const { reachFrom, stepStats } = await import('/src/world/alpine.js');
      const { ART_BY_ID } = await import('/src/data/bestiary.js');
      const { RAID_BOSSES } = await import('/src/game/raid.js');
      const bad = [], stats = [];
      for (const b of SUMMIT_BOSSES) {
        if (!ART_BY_ID[b.art]) bad.push(`boss art ${b.art} missing`);
        const t = RAID_BOSSES.find((r) => r.id === b.tpl);
        if (!t) bad.push(`boss template ${b.tpl} missing`); else if (t.sigs) bad.push(`boss template ${b.tpl} has signature casts`);
      }
      let ms = 0;
      for (let n = 1; n <= SEEDS; n++) {
        const seed = n * 7717 + 3, t0 = performance.now();
        let g;
        try { g = generateSummit(8, BIOME_BY_ID.snowy_summit, seed); } catch (e) { bad.push(`seed ${seed}: ${e.message}`); continue; }
        ms = Math.max(ms, performance.now() - t0);
        const m = g.map, W = m.w, H = m.h, I = (x, y) => y * W + x, walk = Uint8Array.from(m.t), sm = m.summit;
        const at = (n) => I(Math.floor(n.x), Math.floor(n.y));
        const s0 = at(sm.start), pk = at(sm.peak), open = new Uint8Array(W * H);
        for (let i = 0; i < W * H; i++) open[i] = m.block[i];
        for (const gt of sm.gates) for (const i of gt.tiles) open[i] = 0;
        if (!reachFrom(W, H, m.hgt, walk, open, s0, CLIMB, DROP)[pk]) bad.push(`seed ${seed}: the peak unreachable with the gates open`);
        if (!reachFrom(W, H, m.hgt, walk, open, pk, CLIMB, DROP)[s0]) bad.push(`seed ${seed}: no way back down`);
        if (reachFrom(W, H, m.hgt, walk, m.block, s0, CLIMB, DROP)[pk]) bad.push(`seed ${seed}: the peak reachable with the gates shut`);
        if (sm.gates.length < 3) bad.push(`seed ${seed}: only ${sm.gates.length} gates`);
        for (const gt of sm.gates) {
          const before = reachFrom(W, H, m.hgt, walk, m.block, at(sm.nodes[gt.r]), CLIMB, DROP);
          if (before[at(sm.nodes[gt.r + 1])]) bad.push(`seed ${seed}: gate ${gt.r} shuts nothing`);
        }
        if (sm.nodes.filter((q) => q.kind === 'plateau').length !== 4) bad.push(`seed ${seed}: ${sm.nodes.length - 2} plateaus`);
        const st = stepStats(W, H, m.hgt, walk, WALK, CLIMB);
        if (st.hop < 4) bad.push(`seed ${seed}: only ${st.hop} hop steps`);
        // the ridges are thin: across each ridge (perpendicular to it) at most 4 walkable tiles
        let wide = 0, ridgeTiles = 0;
        for (let i = 0; i < W * H; i++) if (sm.ridgeOf[i] >= 0) ridgeTiles++;
        for (const R of sm.ridges) for (let k = 4; k < R.smp.length - 4; k += 6) {
          const q = R.smp[k];
          if (q[2] < R.s0 + 3 || q[2] > R.s1 - 3) continue;
          const a = R.smp[k - 2], b = R.smp[k + 2], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, px = -dy / l, py = dx / l;
          let n = 0;
          for (let t = -4; t <= 4; t += 0.5) { const x = Math.floor(q[0] + px * t), y = Math.floor(q[1] + py * t); if (x >= 0 && y >= 0 && x < W && y < H && walk[I(x, y)] && sm.reg[I(x, y)] < 0) n++; }
          if (n > 9) wide++;
        }
        if (wide > 3) bad.push(`seed ${seed}: ${wide} wide ridge sections`);
        // the way gains height: every plateau above the last, the peak highest
        for (let k = 1; k < sm.nodes.length; k++) if (m.hgt[at(sm.nodes[k])] <= m.hgt[at(sm.nodes[k - 1])]) bad.push(`seed ${seed}: node ${k} no higher than node ${k - 1}`);
        const ridgePacks = g.spawns.filter((s) => s.zone === 'ridge');
        if (ridgePacks.some((s) => s.n > 2)) bad.push(`seed ${seed}: a ridge pack of more than two`);
        if (ridgePacks.length < 6) bad.push(`seed ${seed}: only ${ridgePacks.length} ridge packs`);
        stats.push({ ridgeTiles, hop: st.hop, gates: sm.gates.length, rise: Math.round((m.maxLevel - m.minLevel) / 9.8), props: g.props.length, packs: ridgePacks.length, leaps: g.leaps.length });
      }
      const avg = (k) => Math.round(stats.reduce((a, s) => a + s[k], 0) / Math.max(1, stats.length));
      return { bad, maxMs: Math.round(ms), avg: Object.fromEntries(['ridgeTiles', 'hop', 'gates', 'rise', 'props', 'packs', 'leaps'].map((k) => [k, avg(k)])) };
    }, SEEDS);
    console.log('generation', JSON.stringify(gen));
    for (const b of gen.bad) errors.push('[gen] ' + b);

    const view = async (name, src, zoom = 1) => {
      if (!SHOTS) return;
      await page.evaluate(async ([src, zoom]) => {
        const { G, game } = window.VELSCOUR;
        const { camera } = await import('/src/core/view.js');
        const w = G.world, m = w.map, p = G.player;
        if (src) { const [x, y] = new Function('G', 'w', 'm', 'p', src)(G, w, m, p); p.x = x; p.y = y; }
        p.moveVec = [0, 0]; p.path = null;
        G.settings.zoom = zoom; camera.computeZoom();
        for (let i = 0; i < 6; i++) { G.time += 1 / 30; game.update(1 / 30); }
        camera.follow(p.x, p.y, 0, true); game.render();
      }, [src, zoom]);
      await page.waitForTimeout(120);
      await shot('summit_' + name);
    };

    // ------------------------------------------------ every plateau's fight won by a bot; the gates open
    await view('start', 'const s = m.summit.start; return [s.x, s.y];');
    await view('ridge', 'const r = m.summit.route[3]; return [r.x, r.y];');
    const fights = await page.evaluate(async () => {
      const { G, game } = window.VELSCOUR;
      const { hit } = await import('/src/game/combat.js');
      const w = G.world, m = w.map, run = w.overworldScenario, p = G.player, out = [], bad = [];
      G.godMode = true;
      const step = (n) => { for (let i = 0; i < n; i++) { G.dt = 1 / 30; G.time += G.dt; G.frame++; game.update(1 / 30); } };
      for (const e of run.plateaus) {
        p.x = e.x; p.y = e.y; p.path = null;
        step(3);
        if (e.state !== 'fight') { bad.push(`${e.kind}: did not start`); continue; }
        let t = 0;
        while (e.state === 'fight' && t < 90) {
          for (const c of w.creatures) if (c.team === 'enemy' && !c.dead && Math.hypot(c.x - e.x, c.y - e.y) < e.r + 6 && !c.isRaid) { c.targetable = true; c.static = false; c.entering = null; c.alpha = 1; hit(null, c, c.maxHp * 10, 'phys', { force: true }); }
          step(15); t += 0.5;
        }
        const shut = e.gate ? e.gate.tiles.filter((i) => m.block[i]).length : 0, doors = e.gate ? e.gate.doors.every((d) => d.open) : true;
        out.push({ kind: e.kind, state: e.state, secs: t, gate: !!e.gate, shut, doors, chest: w.chests.some((c) => Math.hypot(c.x - e.x, c.y - e.y) < 3) });
        if (e.state !== 'done') bad.push(`${e.kind}: not won in 90 s`);
        if (shut || !doors) bad.push(`${e.kind}: its gate still shut`);
      }
      return { out, bad };
    });
    console.log('plateaus', JSON.stringify(fights.out));
    for (const b of fights.bad) errors.push('[plateau] ' + b);
    await view('plateau_won', 'const e = w.overworldScenario.plateaus[1]; return [e.x, e.y + 2];');

    // ------------------------------------------------ each of the five bosses on the peak
    for (let k = 0; k < 5; k++) {
      const r = await page.evaluate(async (k) => {
        const { G, game } = window.VELSCOUR;
        const { BIOME_BY_ID } = await import('/src/data/biomes.js');
        G.summitBoss = k;
        if (k) await game.teleportToBiome(BIOME_BY_ID.snowy_summit);
        G.godMode = true;
        const w = G.world, run = w.overworldScenario, pk = w.map.summit.peak, p = G.player;
        for (const e of run.plateaus) e.state = 'done';
        p.x = pk.x; p.y = pk.y + 2; p.path = null;
        for (let i = 0; i < 40; i++) { G.time += 1 / 30; game.update(1 / 30); }
        const b = run.boss, def = run.bossDef;
        const res = { k, name: b && b.name, art: b && b.art, swap: b && JSON.stringify(b.swap) === JSON.stringify(def.swap), raid: !!(b && b.raid) };
        return res;
      }, k);
      if (!r.name || !r.raid) errors.push(`[boss ${k}] no raid boss on the peak`);
      if (!r.swap) errors.push(`[boss ${k}] ${r.name} is not in its snow swap`);
      if (SHOTS) await view('boss_' + k, null, 1);
      const won = await page.evaluate(async () => {
        const { G, game } = window.VELSCOUR;
        const { hit } = await import('/src/game/combat.js');
        const w = G.world, run = w.overworldScenario, b = run.boss;
        for (let k = 0; k < 30 && !b.dead; k++) { b.targetable = true; b.entering = null; hit(null, b, b.maxHp * 2, 'phys', { force: true }); for (let i = 0; i < 10; i++) { G.time += 1 / 30; game.update(1 / 30); } }
        for (let i = 0; i < 30; i++) { G.time += 1 / 30; game.update(1 / 30); }
        const ex = w.portals.find((q) => q.type === 'exit');
        return { completed: run.completed, exit: ex.active, at: [ex.x, ex.y], peak: [w.map.summit.peak.x, w.map.summit.peak.y], cleared: !!G.char.cleared[w.depth] };
      });
      console.log('boss', JSON.stringify(r), JSON.stringify(won));
      if (!won.completed || !won.exit) errors.push(`[boss ${k}] its fall did not open the exit`);
      if (Math.hypot(won.at[0] - won.peak[0], won.at[1] - won.peak[1]) > 4) errors.push(`[boss ${k}] the exit is not on the peak`);
    }
    await page.evaluate(() => { window.VELSCOUR.G.summitBoss = undefined; });
    await view('peak_won', 'const n = m.summit.peak; return [n.x, n.y + 3];');
    await view('overview', 'return [58, 58];', 0.5);

    // ------------------------------------------------ auto-play takes a whole Summit
    if (AUTO) {
      const res = await page.evaluate(async () => {
        const { G, game } = window.VELSCOUR;
        const { Auto } = await import('/src/game/autoplay.js');
        const { BIOME_BY_ID } = await import('/src/data/biomes.js');
        // a hero geared for the depth, like tools/tests/breach.js (a level-1 hero spends most of a climb on each pack)
        const { rollItem, rollGem } = await import('/src/data/items.js');
        const { xpToNext } = await import('/src/game/player.js');
        const { depthLevel } = await import('/src/data/depth.js');
        game.enterTown();
        const c = G.char, p = G.player, D = 8, L = depthLevel(D) + 2;
        c.level = L; c.xp = Math.round(xpToNext(L) * 0.3); c.statPoints += (L - 1) * 5; c.skillPoints += L - 1; c.depth = D;
        c.potions = { hp: 10, mp: 6, rejuv: 3, fury: 2 };
        Auto.spendStats(); Auto.spendSkills(); Auto.arrangeBar();
        for (let round = 0; round < 6; round++) { c.bag = c.bag.map(() => null); for (let i = 0; i < 25; i++) { const it = rollItem(L - Math.floor(Math.random() * 4), { mf: 60, bonus: 0.15 }); it.unid = false; c.bag[i] = it; } p.recompute(); Auto.optimizeGear(); }
        c.bag = c.bag.map(() => null);
        for (const it of Object.values(c.equip)) if (it && it.type === 'gear') { it.upg = 2; it.sockets = Math.max(it.sockets, Math.min(it.maxSockets, 1)); while (it.gems.length < it.sockets) { const g = rollGem(L); it.gems.push({ gem: g.gem, tier: g.tier }); } }
        Auto.spendSkills(); Auto.arrangeBar(); p.recompute(); p.hp = p.maxHp;
        await game.teleportToBiome(BIOME_BY_ID.snowy_summit);
        G.godMode = true;
        Auto.toggle(true);
        const render = game.render; game.render = () => {};   // SwiftShader's 3D readback would run the clock at real time
        const t0 = performance.now(), log = [];
        let sim = 0;
        const w = G.world, sc = w.overworldScenario;
        while (sim < 1200 && !sc.completed && performance.now() - t0 < 400000) {
          for (let i = 0; i < 30; i++) { G.dt = 1 / 30; G.time += G.dt; G.frame++; game.update(1 / 30); sim += 1 / 30; }
          if (Math.round(sim) % 90 === 0) log.push(`${Math.round(sim)} s: won ${sc.won}/4 ${sc.phase} alt ${sc.altitude}% ${Auto.status}`);
          await new Promise((r) => setTimeout(r, 0));
        }
        Auto.toggle(false); game.render = render;
        return { secs: Math.round(sim), completed: sc.completed, won: sc.won, phase: sc.phase, status: Auto.status, log };
      });
      console.log('auto-play', JSON.stringify(res));
      if (!res.completed) errors.push(`[auto] did not take the peak in ${res.secs}s (${res.won}/4 plateaus, ${res.phase}, ${res.status})`);
      if (SHOTS) { await page.evaluate(() => window.VELSCOUR.game.render()); await shot('summit_auto_end'); }
    }

    if (MOBILE && SHOTS) {
      const m = await openGame({ width: 844, height: 390, mobile: true });
      await m.page.evaluate(async () => {
        const { G, game } = window.VELSCOUR;
        const { BIOME_BY_ID } = await import('/src/data/biomes.js');
        await game.newChar('ranger', 'Phone');
        await game.teleportToBiome(BIOME_BY_ID.snowy_summit);
        const r = G.world.map.summit.route[4], p = G.player; p.x = r.x; p.y = r.y;
        for (let k = 0; k < 20; k++) { G.time += 1 / 30; game.update(1 / 30); }
        game.render();
      });
      await m.page.waitForTimeout(200);
      await m.shot('summit_mobile');
      errors.push(...m.errors);
      await m.browser.close();
    }
  } catch (e) { errors.push('[test] ' + e.message); }
  report(errors);
  await browser.close();
})();
