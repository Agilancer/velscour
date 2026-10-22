// The Ethereal Wyrm of the Eternal Breach (game/breachdragon.js, gfx/breachdragon.js), in the browser:
//   looks   all seven colour variants posed beside the hero (one shot each) and a line-up sheet
//   pass    it lines up and sweeps through the hero: it must touch him, bend round for its next pass and leave
//   bridge  the hero on a walkway: it must come for him there within ~40 s
//   void    it wanders deep under the islands between visits (a shot)
//   fight   two thirds of the shrines won: it comes down on the hero's island, the walkways lock, the Heart refuses
//           while it lives; auto-play (god mode) must kill it; it dissolves and drops its hoard
//   floors  its stats grow floor by floor (length, speed, life)
//   node tools/tests/breach_dragon.js [looks,pass,bridge,void,fight,floors] [floor]
const { openGame, report } = require('./harness');
const PARTS = (process.argv[2] || 'looks,pass,bridge,void,fight,floors').split(',');
const FLOOR = +(process.argv[3] || 3);

(async () => {
  const { browser, page, errors, shot } = await openGame({ width: 1366, height: 860 });
  const enter = async (floor, seed) => {
    await page.evaluate(([floor, seed]) => { const { G, game } = window.VELSCOUR; G.breachSeed = seed; G.char.breach.best = Math.max(G.char.breach.best, floor - 1); game.enterBreach(floor); }, [floor, seed]);
    await page.waitForFunction((f) => window.VELSCOUR.G.world?.breach?.floor === f && document.querySelector('#loading').classList.contains('hidden'), floor, { timeout: 60000 });
    await page.waitForFunction(async () => (await import('/src/gfx/breachdragon.js')).wyrmReady(), null, { timeout: 20000 });
  };
  // step the game n seconds at 30 fps (yielding now and then); returns what `probe` collected
  const STEP = null;
  const installStep = () => page.evaluate(() => { window.__step = async (secs, each) => { const { G, game } = window.VELSCOUR; for (let t = 0; t < secs; t += 1 / 30) { G.dt = 1 / 30; G.time += G.dt; G.frame++; game.update(1 / 30); if (each && each(t) === false) return t; if ((G.frame & 63) === 0) await new Promise((r) => setTimeout(r, 0)); } return secs; }; });
  try {
    await page.evaluate(async () => { await window.VELSCOUR.game.newChar('paladin', 'Wyrmslayer'); });
    await page.waitForTimeout(300);
    await enter(FLOOR, 4242);
    await installStep();
    const clearFoes = () => page.evaluate(() => { const { G } = window.VELSCOUR; for (const m of G.world.creatures) if (m.team === 'enemy' && !m.wyrm) m.dead = true; });

    // ------------------------------------------------ the seven looks
    if (PARTS.includes('looks')) {
      await page.waitForTimeout(3600);   // (the floor's title fades)
      const ids = await page.evaluate(async () => (await import('/src/data/breach.js')).WYRM_VARIANTS.map((v) => v.id));
      for (const id of ids) {
        await clearFoes();
        await page.evaluate(async (id) => {
          const { G, game } = window.VELSCOUR, { WYRM_VARIANTS } = await import('/src/data/breach.js');
          const run = G.world.overworldScenario, W = run.wyrm, v = WYRM_VARIANTS.find((q) => q.id === id);
          G.godMode = true;
          Object.assign(W.w, { variant: v, head: v.heads[v.heads.length > 1 && id === 'white' ? 1 : 0], claw: v.claw, name: `the ${v.name} Wyrm` });
          W.force.pose(-1, 3, -0.8, 70, 0.9);
          for (let i = 0; i < 20; i++) { G.time += 1 / 30; G.frame++; W.update(1 / 30); }
          game.render();
        }, id);
        await page.waitForTimeout(60);
        await shot('wyrm_look_' + id);
      }
      console.log('looks: ' + ids.join(', '));
    }

    // ------------------------------------------------ a pass
    if (PARTS.includes('pass')) {
      await clearFoes();
      const r = await page.evaluate(async (STEP) => {
        const step = window.__step;
        const { G, game } = window.VELSCOUR, W = G.world.overworldScenario.wyrm, P = G.player;
        G.godMode = false; P.hp = P.maxHp = 1e9;
        W.force.pass();
        let hits = 0, last = P.hp, near = 1e9, states = new Set(), shotAt = -1;
        await step(14, (t) => {
          states.add(W.force.state);
          if (P.hp < last) hits++; last = P.hp;
          const d = Math.hypot(W.w.x - P.x, W.w.y - P.y); near = Math.min(near, d);
          if (shotAt < 0 && d < 2.2 && W.force.state === 'pass') { shotAt = t; return false; }
        });
        game.render();
        return { hits, near: +near.toFixed(2), states: [...states], shotAt: +shotAt.toFixed(2) };
      }, STEP);
      await page.waitForTimeout(50);
      await shot('wyrm_pass_over_hero');
      await page.evaluate(async (STEP) => {
        const step = window.__step;
        const { G, game } = window.VELSCOUR, W = G.world.overworldScenario.wyrm, P = G.player;
        let hits = 0, last = P.hp, states = new Set(), shot2 = false;
        await step(24, (t) => { states.add(W.force.state); if (P.hp < last) hits++; last = P.hp; if (!shot2 && t > 1 && W.force.state === 'pass' && Math.hypot(W.w.segs[6].x - P.x, W.w.segs[6].y - P.y) < 3.5) { shot2 = true; return false; } });
        game.render();
        window.__pass = { hits, last, states: [...states] };
      }, STEP);
      await shot('wyrm_pass_turning');
      const r2b = await page.evaluate(async () => {
        const step = window.__step, { G } = window.VELSCOUR, W = G.world.overworldScenario.wyrm, P = G.player, o = window.__pass, states = new Set(o.states);
        let hits = o.hits, last = o.last;
        await step(30, () => { states.add(W.force.state); if (P.hp < last) hits++; last = P.hp; });
        return { hits, states: [...states], layer: W.w.layer };
      });
      const r2 = r2b; // (the second pass, then it leaves)
      console.log('pass', JSON.stringify(r), JSON.stringify(r2));
      if (r.hits + r2.hits < 1) errors.push('[pass] it never touched the hero');
      if (!r2.states.includes('leave') && !r2.states.includes('away')) errors.push('[pass] it never left: ' + r2.states.join(','));
      await page.evaluate(() => { const P = window.VELSCOUR.G.player; P.maxHp = P.st?.maxHp || 500; P.hp = P.maxHp; window.VELSCOUR.G.godMode = true; });
    }

    // ------------------------------------------------ on a walkway, it comes
    if (PARTS.includes('bridge')) {
      await clearFoes();
      const r = await page.evaluate(async (STEP) => {
        const step = window.__step;
        const { G } = window.VELSCOUR, Wd = G.world, W = Wd.overworldScenario.wyrm, P = G.player, map = Wd.map;
        G.godMode = true;
        // a walkway tile the hero may stand on (one with no ward on it)
        // a walkway off the start island, a few tiles out (short of any ward on it)
        const run = Wd.overworldScenario, st = run.islands.find((q) => q.start), b = Wd.breachBridges[st.bridges[0]];
        const i = b.tiles.slice().sort((p, q) => Math.hypot((p % map.w) - st.cx, ((p / map.w) | 0) - st.cy) - Math.hypot((q % map.w) - st.cx, ((q / map.w) | 0) - st.cy))[Math.min(4, b.tiles.length - 1)];
        P.x = (i % map.w) + 0.5; P.y = ((i / map.w) | 0) + 0.5;
        let came = -1;
        const t = await step(45, (t) => { P.x = (i % map.w) + 0.5; P.y = ((i / map.w) | 0) + 0.5; if (['approach', 'pass'].includes(W.force.state)) { came = t; return false; } });
        return { came: +came.toFixed(1), state: W.force.state };
      }, STEP);
      console.log('bridge', JSON.stringify(r));
      if (r.came < 0) errors.push('[bridge] it never came for the hero on the walkway');
      await page.evaluate(async (STEP) => { const step = window.__step; const W = window.VELSCOUR.G.world.overworldScenario.wyrm; const P = window.VELSCOUR.G.player; await step(25, () => !(W.force.state === 'pass' && Math.hypot(W.w.x - P.x, W.w.y - P.y) < 4)); window.VELSCOUR.game.render(); }, STEP);
      await shot('wyrm_on_the_bridge');
    }

    // ------------------------------------------------ deep in the void
    if (PARTS.includes('void')) {
      await page.evaluate(async (STEP) => {
        const step = window.__step;
        const { G, game } = window.VELSCOUR, W = G.world.overworldScenario.wyrm, P = G.player;
        // let it go home, then bring it under the hero's view
        await step(40, () => W.force.state !== 'away');
        W.w.layer = 'void';
        W.force.pose(-7, -5, 0.6, -110, 1.1); W.w.layer = 'void'; W.w.alpha = 0.55;
        for (let i = 0; i < 10; i++) { G.time += 1 / 30; G.frame++; W.update(1 / 30); }
        game.render();
      }, STEP);
      await shot('wyrm_in_the_void');
    }

    // ------------------------------------------------ the fight
    if (PARTS.includes('fight')) {
      // geared for the floor like tools/tests/breach.js (auto)
      await page.evaluate(async (FLOOR) => {
        const { G, game } = window.VELSCOUR;
        const { Auto } = await import('/src/game/autoplay.js');
        const { breachLevel } = await import('/src/data/breach.js');
        const { rollItem, rollGem } = await import('/src/data/items.js');
        const { xpToNext } = await import('/src/game/player.js');
        game.enterTown();
        const c = G.char, p = G.player, L = breachLevel(FLOOR) + 2;
        c.level = L; c.xp = Math.round(xpToNext(L) * 0.3); c.statPoints += (L - 1) * 5; c.skillPoints += L - 1; c.depth = L;
        c.potions = { hp: 10, mp: 6, rejuv: 3, fury: 2 };
        Auto.spendStats(); Auto.spendSkills(); Auto.arrangeBar();
        for (let round = 0; round < 6; round++) { c.bag = c.bag.map(() => null); for (let i = 0; i < 25; i++) { const it = rollItem(L - Math.floor(Math.random() * 7), { mf: 60, bonus: Math.random() < 0.12 ? 1.2 : 0.15 }); it.unid = false; c.bag[i] = it; } p.recompute(); Auto.optimizeGear(); }
        c.bag = c.bag.map(() => null);
        for (const it of Object.values(c.equip)) if (it && it.type === 'gear') {
          it.upg = Math.min(6, 2 + Math.floor(L / 40)); it.sockets = Math.max(it.sockets, Math.min(it.maxSockets, 2));
          while (it.gems.length < it.sockets) { const g = rollGem(L); it.gems.push({ gem: g.gem, tier: g.tier }); }
        }
        const M = Math.min(1000, Math.round(20 + FLOOR * 16));
        c.bar.filter(Boolean).forEach((id, i) => { c.mastery[id] = [Math.max(1, Math.round(M * (i < 2 ? 1 : 0.55))), 0]; });
        Auto.spendSkills(); Auto.arrangeBar(); p.recompute(); p.hp = p.maxHp;
      }, FLOOR);
      await page.waitForFunction(() => document.querySelector('#loading').classList.contains('hidden'), null, { timeout: 60000 });
      await enter(FLOOR, 777);
      await clearFoes();
      await page.evaluate(() => { const P = window.VELSCOUR.G.player; P.path = null; P.moveTarget = null; });
      const r = await page.evaluate(async (STEP) => {
        const step = window.__step;
        const { G } = window.VELSCOUR, Wd = G.world, run = Wd.overworldScenario, W = run.wyrm, P = G.player;
        G.godMode = true;
        // two thirds of the shrines won, the hero on a large island that isn't the Heart
        const others = run.scenarios.filter((S) => S !== run.heart && !S.wyrm);
        for (const S of others) S.finish();
        // every shrine won: only the wyrm bars the Heart now
        run.heart.start();
        const heartRefused = !run.heart.active;
        // a medium or large island the open wards let the hero stand on (else the wards put him back)
        let o = null;
        for (const q of run.islands.filter((q) => q.kind !== 'small').sort((a, b) => (b.kind === 'large') - (a.kind === 'large'))) {
          const at = Wd.map.walkable(q.cx, q.cy) ? [q.cx, q.cy] : Wd.map.randomNear(q.cx, q.cy, 3);
          P.x = at[0]; P.y = at[1]; P.path = null; P.moveTarget = null;
          await step(0.2);
          if (Wd.map.breach.own[Wd.map.tileIdx(P.x, P.y)] === q.idx) { o = q; break; }
        }
        let came = -1, log = [], last = '';
        await step(30, (t) => { const k = W.force.state + '/' + run.active + '/' + run.won + '/' + Wd.map.breach.own[Wd.map.tileIdx(P.x, P.y)]; if (k !== last) { last = k; log.push(t.toFixed(1) + ' ' + k); } if (W.S.active) { came = t; return false; } });
        window.__log = log.join(' ; ');
        return { modal: String(G.ui.modal && (G.ui.modal.id || G.ui.modal.className || G.ui.modal)).slice(0, 80), paused: G.paused, log: window.__log, came: +came.toFixed(1), locks: W.S.locks.filter((l) => l.closed).length, bridges: o.bridges.length, heartRefused, hp: Math.round(W.m.maxHp), name: W.w.name };
      }, STEP);
      console.log('fight start', JSON.stringify(r));
      if (r.came < 0) errors.push('[fight] it never came down to fight');
      if (r.locks < r.bridges) errors.push(`[fight] ${r.locks}/${r.bridges} walkways locked`);
      if (!r.heartRefused) errors.push('[fight] the Heart answered while the wyrm lives');
      await page.evaluate(async (STEP) => { const step = window.__step; await step(3); window.VELSCOUR.game.render(); }, STEP);
      await shot('wyrm_fight_coils');
      // auto-play fights it
      const f = await page.evaluate(async (STEP) => {
        const step = window.__step;
        const { G, game } = window.VELSCOUR, W = G.world.overworldScenario.wyrm, P = G.player;
        const { Auto } = await import('/src/game/autoplay.js');
        Auto.toggle(true);
        let hitbox = 0, frames = 0, shot = false;
        const t = await step(300, (t) => { frames++; if (W.m.targetable) hitbox++; if (W.slain) return false; if (!shot && t > 20 && W.w.mouth && Math.hypot(W.w.x - P.x, W.w.y - P.y) < 3) { shot = true; window.__mid = t; return false; } });
        if (!W.slain) { game.render(); return { mid: true }; }
        Auto.toggle(false);
        return { t: Math.round(t), slain: W.slain, life: +(W.m.hp / W.m.maxHp).toFixed(2), hitboxShare: +(hitbox / frames).toFixed(2) };
      }, STEP);
      if (f.mid) {
        await shot('wyrm_fight_close');
        Object.assign(f, await page.evaluate(async () => {
          const step = window.__step, { G } = window.VELSCOUR, W = G.world.overworldScenario.wyrm;
          const { Auto } = await import('/src/game/autoplay.js');
          let hitbox = 0, frames = 0;
          const t = await step(300, () => { frames++; if (W.m.targetable) hitbox++; if (W.slain) return false; });
          Auto.toggle(false);
          return { t: Math.round(t + window.__mid), slain: W.slain, life: +(W.m.hp / W.m.maxHp).toFixed(2), hitboxShare: +(hitbox / frames).toFixed(2), heroLvl: G.char.level };
        }));
      }
      console.log('fight', JSON.stringify(f));
      if (!f.slain) errors.push(`[fight] auto-play didn't kill it in 300 s (life left ${f.life}, hitbox reachable ${f.hitboxShare})`);
      await page.evaluate(async (STEP) => { const step = window.__step; await step(1); window.VELSCOUR.game.render(); }, STEP);
      await shot('wyrm_slain');
      const after = await page.evaluate(async (STEP) => {
        const step = window.__step;
        const { G } = window.VELSCOUR, run = G.world.overworldScenario, W = run.wyrm;
        await step(3);
        const P = G.player; P.x = run.heart.C[0]; P.y = run.heart.C[1] + 1.6; await step(0.2); run.heart.start();
        return { gone: !!W.w.gone, locks: W.S.locks.filter((l) => l.closed).length, loot: G.world.loot ? G.world.loot.filter((l) => l.kind === 'item').length : -1, won: run.won, heartOpens: run.heart.active };
      }, STEP);
      console.log('after', JSON.stringify(after));
      if (!after.gone) errors.push('[fight] it never dissolved');
      if (after.locks) errors.push('[fight] the walkways stayed locked');
      if (!after.heartOpens) errors.push('[fight] the Heart still refused after the wyrm fell');
    }

    // ------------------------------------------------ floor by floor
    if (PARTS.includes('floors')) {
      const s = await page.evaluate(async () => { const { wyrmStats } = await import('/src/data/breach.js'); return [1, 3, 6, 10, 20, 40].map((f) => ({ f, ...wyrmStats(f) })); });
      for (const q of s) console.log(`floor ${q.f}: ${q.segs} segments x${q.scale.toFixed(2)}, ${q.speed.toFixed(1)} t/s, ${q.passes} passes, life x${q.hpMul.toFixed(2)}, hits x${q.dmgMul.toFixed(2)}${q.breath ? ', breath' : ''}${q.orbs ? ', orbs' : ''}${q.coil ? ', coils' : ''}`);
      for (let i = 1; i < s.length; i++) if (s[i].segs < s[i - 1].segs || s[i].hpMul <= s[i - 1].hpMul) errors.push(`[floors] floor ${s[i].f} is no harder than ${s[i - 1].f}`);
    }
  } catch (e) { errors.push('[crash] ' + (e.stack || e.message)); }
  await browser.close();
  report(errors);
})();
