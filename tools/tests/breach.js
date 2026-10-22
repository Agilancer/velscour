// THE ETERNAL BREACH (docs/ETERNAL_BREACH.md), in the browser:
//   town   the purple portal in Herrington Hollow (reachable over 12 town seeds), its floor dialog, auto-play's
//          Standard/Breach menu
//   play   a bot plays every shrine scenario (and the Heart) on a live floor: each must be won, no long idle waits, and
//          never more than 3 s with nothing of the fight alive and nothing else to do (the next wave comes at once)
//   arrive every arrival kind brought in on a live floor, mid-flight screenshots
//   shots  a floor's overview, an island, a ruin, a ward, a fight
//   auto   auto-play (god mode, geared at the floor's level) plays a whole floor from the town to the exit
//   rules  the final boss's reward table, a death in the Breach (no Defiance, the descent untouched), save migration
//   perf   frame cost on a floor (update / render ms over 10 s of a fight), beside the Mountainside's
//   node tools/tests/breach.js [town,play,arrive,shots,auto,rules] [floor]      (all by default; floor 2)
const { openGame, report } = require('./harness');
const PARTS = (process.argv[2] || 'town,play,arrive,shots,auto,rules,perf').split(',');
const FLOOR = +(process.argv[3] || 2);

(async () => {
  const { browser, page, errors, shot } = await openGame({ width: 1366, height: 860 });
  const enter = async (floor, types = null) => {
    await page.evaluate(([floor, types]) => { const { G, game } = window.VELSCOUR; G.breachTypes = types; G.char.breach.best = Math.max(G.char.breach.best, floor - 1); game.enterBreach(floor); }, [floor, types]);
    await page.waitForFunction((f) => window.VELSCOUR.G.world?.breach?.floor === f && document.querySelector('#loading').classList.contains('hidden'), floor, { timeout: 60000 });
  };
  try {
    if (process.env.BREACH_CLASS) await page.evaluate((c) => { window.BREACH_CLASS = c; }, process.env.BREACH_CLASS); // e.g. lancer
    await page.evaluate(async () => { await window.VELSCOUR.game.newChar(window.BREACH_CLASS || 'paladin', 'Breacher'); });
    await page.waitForTimeout(300);

    // ------------------------------------------------ town: the purple portal
    if (PARTS.includes('town')) {
      const r = await page.evaluate(async () => {
        const { G, game } = window.VELSCOUR, bad = [];
        const { generateTown } = await import('/src/world/town.js');
        const { biomeTileSet } = await import('/src/core/assets.js');
        const { TOWN_BIOME } = await import('/src/data/biomes.js');
        for (let s = 1; s <= 12; s++) {
          const t = generateTown(biomeTileSet(TOWN_BIOME), s * 7717);
          if (!t.breach) { bad.push(`town ${s}: no breach portal`); continue; }
          const p = t.map.findPath(t.start[0], t.start[1], t.breach.x, t.breach.y, 40000);
          if (!p) bad.push(`town ${s}: the breach portal can't be reached`);
          if (Math.hypot(t.breach.x - t.portal.x, t.breach.y - t.portal.y) < 10) bad.push(`town ${s}: the two portals stand together`);
        }
        const bp = G.world.portals.find((q) => q.breach);
        if (!bp) bad.push('no purple portal in the town world');
        else { bp.use(); if (!document.querySelector('.breach-dialog #breach-floor')) bad.push('no floor dialog'); }
        const opts = [...document.querySelectorAll('#breach-floor option')].map((o) => o.value);
        [...document.querySelectorAll('.breach-dialog button')].find((b) => b.textContent.includes('Not yet'))?.click();
        if (G.ui.modal) bad.push('the floor dialog left the game paused');
        return { bad, opts, portal: bp && [bp.x, bp.y] };
      });
      console.log('town', JSON.stringify(r));
      for (const b of r.bad) errors.push('[town] ' + b);
      // auto-play's menu
      await page.evaluate(async () => { const { G, game } = window.VELSCOUR; game.enterTown(); const { Auto } = await import('/src/game/autoplay.js'); Auto.toggle(true); });
      await page.waitForTimeout(400);
      await shot('breach_auto_menu');
      const m = await page.evaluate(async () => {
        const btn = [...document.querySelectorAll('button')].find((b) => b.textContent.includes('THE ETERNAL BREACH'));
        if (!btn) return 'no menu';
        btn.click();
        const { Auto } = await import('/src/game/autoplay.js');
        const { G, game } = window.VELSCOUR;
        // auto-play walks to the purple portal and goes through
        let t = 0;
        while (t < 120 && !G.world.breach) { G.dt = 1 / 30; G.time += G.dt; G.frame++; game.update(1 / 30); t += 1 / 30; if (t % 1 < 0.04) await new Promise((r) => setTimeout(r, 0)); }
        const dest = Auto.dest;
        Auto.toggle(false);
        return dest + (G.world.breach ? '' : ' (never went in)');
      });
      await page.waitForFunction(() => document.querySelector('#loading').classList.contains('hidden'), null, { timeout: 60000 });
      console.log('auto-play menu ->', m);
      if (m !== 'breach') errors.push('[town] auto-play menu: ' + m);
      await page.evaluate(() => window.VELSCOUR.game.enterTown());
    }

    // ------------------------------------------------ a bot plays every scenario
    if (PARTS.includes('play')) {
      const types = await page.evaluate(async () => Object.keys((await import('/src/game/breach.js')).SCENARIOS).filter((t) => t !== 'heart'));
      for (let k = 0; k < types.length; k += 7) {
        const batch = types.slice(k, k + 7);
        while (batch.length < 7) batch.push('surge');
        await enter(FLOOR, batch.slice());
        const r = await page.evaluate(async () => {
          const { G } = window.VELSCOUR;
          const { hit } = await import('/src/game/combat.js');
          const W = G.world, P = G.player, run = W.overworldScenario, out = [], bad = [], dt = 1 / 15;
          G.godMode = true;
          for (const m of W.creatures) if (m.team === 'enemy') m.dead = true;
          const step = (S, st) => {
            const foes = S.foes.filter((m) => !m.dead && m.targetable !== false);
            for (const m of W.creatures) if (!m.dead && m.team === 'enemy' && m.targetable !== false && Math.hypot(m.x - P.x, m.y - P.y) < 2.4) hit(P, m, 1e12, 'phys', { crit: false });
            let goal = null, use = null;
            const near = foes.filter((m) => Math.hypot(m.x - P.x, m.y - P.y) < 6);
            const o = run.objective;
            if (o && !near.length) { goal = [o.x, o.y]; if (Math.hypot(o.x - P.x, o.y - P.y) < (o.reach || 1.4)) use = o; }
            if (!goal && foes.length) { const m = foes.reduce((a, b) => Math.hypot(a.x - P.x, a.y - P.y) < Math.hypot(b.x - P.x, b.y - P.y) ? a : b); goal = [m.x, m.y]; }
            if (use && use.use) use.use();
            if (near.length || use) { st.maxIdle = Math.max(st.maxIdle, st.idle); st.idle = 0; } else st.idle += dt;
            if (goal && Math.hypot(goal[0] - P.x, goal[1] - P.y) > 0.6) {
              if ((st.repath -= dt) <= 0 || !st.path?.length) { st.path = W.map.findPath(P.x, P.y, goal[0], goal[1], 60000, 0.28) || []; st.repath = 0.4; }
              while (st.path.length && Math.hypot(st.path[0][0] - P.x, st.path[0][1] - P.y) < 0.3) st.path.shift();
              if (st.path.length) { const [tx, ty] = st.path[0], d = Math.hypot(tx - P.x, ty - P.y), kk = Math.min(1, dt * 4.5 / d); W.map.move(P, (tx - P.x) * kk, (ty - P.y) * kk); }
            }
          };
          for (const S of run.scenarios) {
            if (S === run.heart) { for (const o of run.scenarios) if (o !== S && !o.completed) o.finish(); }
            run.force(S);
            const st = { idle: 0, maxIdle: 0, repath: 0, path: null }; let t = 0;
            // the longest stretch with nothing of the fight alive and no task to do: the hero waiting for monsters
            let empty = 0, emptyMax = 0;
            while (t < 400 && !S.completed) {
              t += dt; G.time += dt; G.frame++; W.update(dt); run.update(dt); step(S, st); if (G.player.dead) break;
              const none = !S.foes.some((m) => !m.dead && !m.static && !m.breachBoss), task = S.objective && (S.objective.use || S.type === 'anchor' || S.type === 'hold');
              if (none && !task && !S.completed) empty += dt; else { emptyMax = Math.max(emptyMax, empty); empty = 0; }
            }
            st.emptyMax = Math.max(emptyMax, empty);
            st.maxIdle = Math.max(st.maxIdle, st.idle);
            const left = S.foes.filter((m) => !m.dead).length;
            const line = `${S.type} — ${S.title} (${S.o.kind}): ${S.completed ? 'won' : 'STUCK (' + (S.progress() || '') + `, ${left} foes)`} in ${t.toFixed(0)}s, foes ${S.foes.length}, longest wait ${st.maxIdle.toFixed(1)}s, longest with no monster ${st.emptyMax.toFixed(1)}s`;
            out.push(line);
            if (!S.completed || st.maxIdle > 25 || st.emptyMax > 3) bad.push(line);
            // a won shrine drops its wards and leaves a reliquary
            if (S.completed && S !== run.heart && !W.chests.some((c) => Math.hypot(c.x - S.C[0], c.y - S.C[1]) < 3)) bad.push(S.type + ': no reliquary');
            if (S.completed && run.wards.some((w) => w.closed && w.b.ward === S.o.idx)) bad.push(S.type + ': its wards still stand');
            if (S.completed && S.locks.some((l) => l.closed)) bad.push(S.type + ': its locks still stand');
          }
          if (!run.completed) bad.push('the floor was never won');
          if (!W.portals.some((q) => q.type === 'exit' && q.active)) bad.push('no exit after the Heart');
          if (!W.loot.some((l) => l.kind === 'item')) bad.push('the Heart dropped no item');
          // the exit can be walked up to and used (a brazier once stood on it)
          const ex = W.portals.find((q) => q.type === 'exit');
          if (ex) {
            const path = W.map.findPath(P.x, P.y, ex.x, ex.y, 60000, 0.28), end = path && path[path.length - 1];
            if (!W.map.walkable(ex.x, ex.y) || !end || Math.hypot(end[0] - ex.x, end[1] - ex.y) > ex.reach - 0.3) bad.push('the exit portal cannot be walked up to');
          }
          return { out, bad };
        });
        console.log(r.out.join('\n'));
        for (const b of r.bad) errors.push('[play] ' + b);
      }
    }

    // ------------------------------------------------ every arrival
    if (PARTS.includes('arrive')) {
      await enter(FLOOR);
      await page.waitForTimeout(3500); // the floor's banner
      const kinds = await page.evaluate(async () => (await import('/src/game/breach.js')).ARRIVALS);
      for (const kind of kinds) {
        const r = await page.evaluate(async (kind) => {
          const { G, game } = window.VELSCOUR;
          const { arrive } = await import('/src/game/breach.js');
          const W = G.world, P = G.player, run = W.overworldScenario;
          G.godMode = true;
          for (const m of W.creatures) if (m.team === 'enemy') m.dead = true;
          const o = run.islands.filter((q) => q.kind !== 'small')[0];
          P.x = o.cx + 1; P.y = o.cy + 2.5;
          const ms = arrive(W, o, kind, 4, { near: P });
          let t = 0, mid = false;
          const midT = { ride: 1.1, shard: 1.4, chain: 0.7, sky: 0.6, climb: 0.6, coffin: 0.7, doorway: 0.7, meteor: 0.6 }[kind] || 0.4;
          while (t < midT) { t += 1 / 30; G.time += 1 / 30; G.frame++; game.update(1 / 30); }
          game.render();
          mid = ms.some((m) => !m.targetable);
          return { n: ms.length, mid };
        }, kind);
        await shot('breach_arrive_' + kind);
        const fin = await page.evaluate(async () => {
          const { G, game } = window.VELSCOUR;
          let t = 0;
          while (t < 8) { t += 1 / 30; G.time += 1 / 30; G.frame++; game.update(1 / 30); }
          const ms = G.world.creatures.filter((m) => m.team === 'enemy' && !m.dead);
          const stuck = ms.filter((m) => m.entering || m.targetable === false).length;
          const off = ms.filter((m) => !G.world.map.isFloor(m.x, m.y)).length;
          for (const m of ms) m.dead = true;
          return { live: ms.length, stuck, off };
        });
        console.log(`arrive ${kind}: ${r.n} brought, in flight at the shot: ${r.mid}; after 8 s ${fin.live} alive, ${fin.stuck} still arriving, ${fin.off} off the ground`);
        if (r.n < 2 || fin.stuck || fin.off) errors.push(`[arrive] ${kind}: brought ${r.n}, stuck ${fin.stuck}, off ${fin.off}`);
      }
    }

    // ------------------------------------------------ screenshots
    if (PARTS.includes('shots')) {
      await enter(FLOOR);
      await page.waitForTimeout(3500);
      const at = async (name, fn, zoom = 1) => {
        await page.evaluate(async ([src, zoom]) => {
          const { G } = window.VELSCOUR, W = G.world, run = W.overworldScenario, P = G.player;
          const { camera } = await import('/src/core/view.js');
          const p = new Function('W', 'run', 'P', src)(W, run, P);
          if (p) { P.x = p[0]; P.y = p[1]; }
          G.settings.zoom = zoom; camera.computeZoom(); camera.follow(P.x, P.y, 0, true);
        }, [fn, zoom]);
        await page.waitForTimeout(900);
        await shot('breach_' + name);
      };
      await at('overview', 'for (const m of W.creatures) if (m.team === "enemy") m.dead = true; return [W.map.w / 2, W.map.h / 2];', 0.3);
      await at('start', 'const o = run.islands.find((q) => q.start); return [o.cx, o.cy + 1.5];', 1);
      await at('heart', 'const o = run.islands[run.heart.o.idx]; return [o.cx, o.cy + 3];', 0.7);
      await at('ruin', 'const S = run.scenarios.find((s) => s.o.ruin) || run.scenarios[0]; return [S.C[0], S.C[1] + 1.5];', 0.85);
      await at('ward', 'const w = run.wards[0]; return [w.x - 1.5, w.y + 1.5];', 1);
      await at('fight', 'const S = run.scenarios.find((s) => s.type !== "heart"); run.force(S); for (let i = 0; i < 90; i++) { W.update(1/30); run.update(1/30); } return null;', 1);
      await page.evaluate(async () => { const { G } = window.VELSCOUR; const { camera } = await import('/src/core/view.js'); G.settings.zoom = 1; camera.computeZoom(); });
    }

    // ------------------------------------------------ auto-play plays a whole floor
    if (PARTS.includes('auto')) {
      if (process.env.BREACH_SEED) await page.evaluate((s) => { window.BREACH_SEED = +s; }, process.env.BREACH_SEED); // replay a floor
      const r = await page.evaluate(async (FLOOR) => {
        const { G, game } = window.VELSCOUR;
        const { Auto } = await import('/src/game/autoplay.js');
        const { breachLevel } = await import('/src/data/breach.js');
        const { rollItem, rollGem } = await import('/src/data/items.js');
        const { xpToNext } = await import('/src/game/player.js');
        if (Auto.on) Auto.toggle(false);
        game.enterTown();
        const c = G.char, p = G.player, L = breachLevel(FLOOR) + 2;
        c.level = L; c.xp = Math.round(xpToNext(L) * 0.3); c.statPoints += (L - 1) * 5; c.skillPoints += L - 1; c.depth = L;
        c.potions = { hp: 10, mp: 6, rejuv: 3, fury: 2 };
        Auto.spendStats(); Auto.spendSkills(); Auto.arrangeBar();
        // geared like tools/tests/balance.js: the best of a few rounds of drops, upgrades, gems, mastery
        for (let round = 0; round < 6; round++) { c.bag = c.bag.map(() => null); for (let i = 0; i < 25; i++) { const it = rollItem(L - Math.floor(Math.random() * 7), { mf: 60, bonus: Math.random() < 0.12 ? 1.2 : 0.15 }); it.unid = false; c.bag[i] = it; } p.recompute(); Auto.optimizeGear(); }
        c.bag = c.bag.map(() => null);
        for (const it of Object.values(c.equip)) if (it && it.type === 'gear') {
          it.upg = Math.min(6, 2 + Math.floor(L / 40)); it.sockets = Math.max(it.sockets, Math.min(it.maxSockets, 2));
          while (it.gems.length < it.sockets) { const g = rollGem(L); it.gems.push({ gem: g.gem, tier: g.tier }); }
        }
        const M = Math.min(1000, Math.round(20 + FLOOR * 10 * 1.6));
        c.bar.filter(Boolean).forEach((id, i) => { c.mastery[id] = [Math.max(1, Math.round(M * (i < 2 ? 1 : 0.55))), 0]; });
        Auto.spendSkills(); Auto.arrangeBar(); p.recompute(); p.hp = p.maxHp;
        c.breach.best = FLOOR - 1;
        G.godMode = true; G.autoDest = 'breach'; G.autoOpenSeals = true;
        if (window.BREACH_SEED) G.breachSeed = window.BREACH_SEED;
        Auto.toggle(true);
        const log = [];
        let t = 0, lastSt = '', lastLogT = 0;
        const t0 = performance.now();
        while (t < 2700 && performance.now() - t0 < 720000) {
          for (let i = 0; i < 30; i++) { if (G.mode !== 'game' || !G.world) break; G.dt = 1 / 30; G.time += G.dt; G.frame++; game.update(1 / 30); t += 1 / 30; }
          await new Promise((r) => setTimeout(r, 0));
          const W = G.world, run = W?.overworldScenario;
          if (W?.breach && run) {
            const st = `${run.won}/${run.scenarios.length - 1}${run.current ? ' in ' + run.current.type : ''}${run.completed ? ' WON' : ''}`;
            if (!lastSt) log.push('seed ' + W.breach.seed);
            if (st !== lastSt || t - (lastLogT || 0) > 45) { lastSt = st; lastLogT = t; const P = G.player, own = W.map.breach.own[W.map.tileIdx(P.x, P.y)]; log.push(`${t.toFixed(0)}s ${st} — ${Auto.status} @${P.x.toFixed(0)},${P.y.toFixed(0)} isl ${own} lvl ${G.char.level} tgt ${Auto.target ? Auto.target.name + " " + Math.round(Auto.target.hp / Auto.target.maxHp * 100) + "% d" + Math.hypot(Auto.target.x - P.x, Auto.target.y - P.y).toFixed(1) + " h" + (W.map.hgt[W.map.tileIdx(Auto.target.x, Auto.target.y)] - W.map.hgt[W.map.tileIdx(P.x, P.y)]) + " los" + W.map.los(P.x, P.y, Auto.target.x, Auto.target.y) : "-"} dz ${JSON.stringify(Auto.dangers(W).slice(0, 3).map((d) => [d.x.toFixed(1), d.y.toFixed(1), (d.r || 0).toFixed(1), d.line ? "L" : d.cone ? "C" : d.ring ? "R" : ""]))} hz ${W.hazards.filter((h) => h.team === "enemy").map((h) => h.constructor.name).join(",")} hp ${Math.round(P.hp)}/${P.maxHp} mana ${Math.round(P.mana)} ${run.current ? run.current.progress() : ""}`); }
          }
          if (W?.breach && run && !run.current && !run.dumped && run.won < 7 && Auto.status.includes('Breach Heart')) {
            run.dumped = true; const P = G.player, own = W.map.breach.own, I = run.islands;
            log.push('DUMP here ' + own[W.map.tileIdx(P.x, P.y)] + ' islands ' + JSON.stringify(I.map((o) => [o.idx, o.kind[0], o.hops, o.start ? 'S' : o.heart ? 'H' : ''])) + ' bridges ' + JSON.stringify(W.breachBridges.map((b) => [b.a, b.b, b.ward, run.wards.find((w) => w.b === b)?.closed ? 'X' : ''])) + ' scen ' + JSON.stringify(run.scenarios.map((S) => [S.o.idx, S.type, S.completed, S.active])) + ' target ' + (run.target && run.target.type) + ' heartShrine ' + JSON.stringify([run.heart.shrine.x, run.heart.shrine.y]) + ' P ' + [P.x, P.y].map((v) => v.toFixed(1)) + ' flowAtHeart ' + W.map.flowAt(run.heart.shrine.x, run.heart.shrine.y));
          }
          if (W && W.kind === 'town' && c.breach.best >= FLOOR) break;
          if (W?.breach && W.breach.floor > FLOOR) break;
        }
        Auto.toggle(false); G.godMode = false; G.autoDest = null;
        return { log, t: Math.round(t), best: c.breach.best, cleared: c.breach.cleared, where: G.world?.breach ? 'breach floor ' + G.world.breach.floor : G.world?.kind };
      }, FLOOR);
      console.log('auto:', r.log.join('\n  '));
      console.log(`auto: ${r.t}s game time, best floor ${r.best}, now in ${r.where}`);
      if (r.best < FLOOR) errors.push(`[auto] auto-play did not win floor ${FLOOR} in ${r.t}s`);
      // home again: the town must draw (the black town after a Breach run). The game's own loop, 3 s, then the
      // share of near-black pixels in the middle of the screen
      if (r.where === 'town') {
        await page.waitForTimeout(3000);
        const dark = await page.evaluate(() => {
          const c = window.VELSCOUR.G.canvas, g = c.getContext('2d'), w = c.width, h = c.height;
          const d = g.getImageData(Math.round(w * 0.2), Math.round(h * 0.2), Math.round(w * 0.6), Math.round(h * 0.6)).data;
          let n = 0; for (let i = 0; i < d.length; i += 16) if (d[i] + d[i + 1] + d[i + 2] < 30) n++;
          return n / (d.length / 16);
        });
        await shot('breach_home');
        console.log(`auto: back in town, ${(dark * 100).toFixed(1)}% of the view near black`);
        if (dark > 0.25) errors.push(`[auto] the town draws ${(dark * 100).toFixed(0)}% black after the Breach`);
      }
    }

    // ------------------------------------------------ rules
    if (PARTS.includes('rules')) {
      const r = await page.evaluate(async () => {
        const { G, game } = window.VELSCOUR;
        const { breachReward, BREACH_ODDS, breachDepth } = await import('/src/data/breach.js');
        const { migrate } = await import('/src/game/save.js');
        const bad = [], N = 20000, tally = (floor, first) => { const n = [0, 0, 0, 0, 0, 0]; for (let i = 0; i < N; i++) n[breachReward(floor, first)]++; return n.map((v) => v / N); };
        const f1 = tally(2, true), f2 = tally(2, false);
        if (f1[2] !== 1 || f2[2] !== 1) bad.push('floors 1-3 must always give a Rare');
        const f5a = tally(6, true), f5b = tally(6, false);
        if (f5a[3] !== 1) bad.push('floors 4-10 first clear must be an Epic');
        if (f5b[2] < 0.95 || f5b[4] < 0.005 || f5b[4] > 0.05 || f5b[3] || f5b[5]) bad.push('floors 4-10 repeats: ' + f5b.join(','));
        const f12a = tally(12, true), f12b = tally(12, false);
        if (f12a[2] || f12a[3] < 0.8 || f12a[4] < 0.05 || f12a[5] < 0.01 || f12a[5] > f12a[4]) bad.push('floor 11+ first clear: ' + f12a.join(','));
        if (f12b[2] < 0.9 || !(f12b[3] + f12b[4] + f12b[5] > 0)) bad.push('floor 11+ repeats: ' + f12b.join(','));
        if (breachDepth(1) !== 10 || breachDepth(7) !== 70) bad.push('floor n is depth 10n');
        // a death in the Breach: no Defiance, the descent stays
        game.enterTown();
        const c = G.char, d0 = c.depth, def0 = c.defiance ? c.defiance.n : 0;
        G.godMode = false;
        return { bad, f5b, f12a, f12b, d0, def0, migrated: JSON.stringify(migrate({ classId: 'paladin', bag: [], equip: {}, skills: {}, bar: [] }).breach), odds: BREACH_ODDS };
      });
      console.log('rewards', JSON.stringify(r));
      for (const b of r.bad) errors.push('[rules] ' + b);
      // a monster up on a ledge the hero can't climb is torn back down next to him
      await enter(1);
      const ledge = await page.evaluate(async () => {
        const { G } = window.VELSCOUR;
        const { arrive } = await import('/src/game/breach.js');
        const W = G.world, P = G.player, map = W.map, run = W.overworldScenario, own = map.breach.own, here = own[map.tileIdx(P.x, P.y)];
        G.godMode = true;
        for (const m of W.creatures) if (m.team === 'enemy') m.dead = true;
        const [m] = arrive(W, run.islands[here], 'rise', 1, { near: P });
        if (!m) return 'no monster arrived';
        for (let k = 0; k < 40; k++) { G.time += 0.05; W.update(0.05); }
        let t = -1;
        for (let r = 3; r < 6 && t < 0; r++) for (let a = 0; a < 16 && t < 0; a++) {
          const x = Math.floor(P.x + Math.cos(a * 0.39) * r), y = Math.floor(P.y + Math.sin(a * 0.39) * r), i = map.tileIdx(x, y);
          if (own[i] === here && map.walkableTile(x, y)) t = i;
        }
        if (t < 0) return 'no ledge tile';
        map.hgt[t] += 8; map.flowFrom = [-999, -999]; map._hrAt = -2; // 8 levels up: a monster drops off it, the hero can't climb it
        m.x = (t % map.w) + 0.5; m.y = ((t / map.w) | 0) + 0.5; m.speed = 0;
        let s = 0;
        while (s < 8 && map.tileIdx(m.x, m.y) === t) { s += 0.05; G.time += 0.05; W.update(0.05); run.update(0.05); }
        map.hgt[t] -= 8; map.flowFrom = [-999, -999]; map._hrAt = -2;
        return map.tileIdx(m.x, m.y) === t ? 'still up there after 8 s' : 'pulled down in ' + s.toFixed(1) + ' s';
      });
      console.log('ledge', ledge);
      if (!ledge.startsWith('pulled')) errors.push('[rules] stranded monster: ' + ledge);
      // auto-play leaves the Breach inside game.update: the Breach's ward check must not run on after him and put him
      // back at his last Breach spot (off the edge of town: the black town)
      await enter(1);
      const home = await page.evaluate(async () => {
        const { G, game } = window.VELSCOUR, { Auto } = await import('/src/game/autoplay.js');
        const step = () => { G.dt = 1 / 30; G.time += G.dt; G.frame++; game.update(1 / 30); };
        for (let i = 0; i < 30; i++) step();
        G.player.x = 90.5; G.player.y = 95.5; // far out over the void: what the ward check last saw
        const orig = Auto.update; Auto.update = () => { Auto.update = orig; game.breachExit(G.world, { auto: true, town: true }); };
        step(); for (let i = 0; i < 15; i++) step();
        const P = G.player, m = G.world.map;
        return { kind: G.world.kind, ok: m.walkable(P.x, P.y), at: [+P.x.toFixed(1), +P.y.toFixed(1)], size: [m.w, m.h] };
      });
      console.log('home', JSON.stringify(home));
      if (home.kind !== 'town' || !home.ok) errors.push('[rules] auto-play came home off the town\'s ground: ' + JSON.stringify(home));
      await enter(1);
      await page.evaluate(() => { const { G } = window.VELSCOUR; G.godMode = false; G.player.hp = 0; G.player.die(null); });
      await page.waitForTimeout(2200);
      await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.textContent.includes('Return to Town'))?.click());
      await page.waitForTimeout(800);
      const after = await page.evaluate(() => { const { G } = window.VELSCOUR; return { kind: G.world.kind, depth: G.char.depth, def: G.char.defiance ? G.char.defiance.n : 0, text: document.body.innerText.includes('Eternal Breach') }; });
      console.log('death', JSON.stringify(after));
      if (after.kind !== 'town' || after.depth !== r.d0 || after.def !== r.def0) errors.push('[rules] a death in the Breach changed the descent: ' + JSON.stringify(after));
    }
    // ------------------------------------------------ frame cost
    if (PARTS.includes('perf')) {
      // the game's own loop (requestAnimationFrame) with auto-play on, 8 s: the update/render ms a frame
      const measure = async () => page.evaluate(() => new Promise((res) => {
        const { G, game } = window.VELSCOUR, u = game.update, rd = game.render, s = { u: 0, r: 0, n: 0 };
        game.update = function (dt) { const t = performance.now(); u.call(this, dt); s.u += performance.now() - t; };
        game.render = function () { const t = performance.now(); rd.call(this); s.r += performance.now() - t; s.n++; };
        setTimeout(() => { game.update = u; game.render = rd; res({ update: +(s.u / s.n).toFixed(2), render: +(s.r / s.n).toFixed(2), creatures: G.world.creatures.length }); }, 8000);
      }));
      await page.evaluate(async () => { const { G } = window.VELSCOUR; const { Auto } = await import('/src/game/autoplay.js'); G.godMode = true; G.autoDest = 'breach'; if (!Auto.on) Auto.toggle(true); });
      await enter(FLOOR);
      await page.waitForTimeout(1500);
      const b = await measure();
      await page.evaluate(async () => { const { G, game } = window.VELSCOUR; const { BIOME_BY_ID } = await import('/src/data/biomes.js'); await game.loadLevelArt(BIOME_BY_ID.mountainside); game.buildDungeon(G.char.depth, BIOME_BY_ID.mountainside); });
      await page.waitForTimeout(1500);
      const m = await measure();
      await page.evaluate(async () => { const { G } = window.VELSCOUR; const { Auto } = await import('/src/game/autoplay.js'); Auto.toggle(false); G.godMode = false; G.autoDest = null; });
      console.log(`perf (ms a frame, SwiftShader): breach update ${b.update} render ${b.render} (${b.creatures} creatures); mountainside update ${m.update} render ${m.render} (${m.creatures})`);
    }
  } catch (e) { errors.push('[test] ' + (e.stack || e)); }
  report(errors);
  await browser.close();
})();
