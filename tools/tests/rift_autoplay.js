// Auto-play in Abyssal Rifts (a player report: "the hero goes to the boss room with less than 100%, and sometimes
// just goes to the far right corner and stays there"). Three bugs made that:
// - a rift has no boss until the quota, and auto-play read "no boss" as "boss dead": it made for the sealed exit, in the
//   BOSS ROOM arena at the far right of the map, and waited there;
// - the pylons stood at each room's maze-chunk index (tiles 1-3, the map's top corner, often in a wall), and auto-play
//   walked at an unreachable one with no give-up;
// - the Conduit Pylon's bolts did NaN damage (p.st.attack does not exist): every monster they touched, the Guardian
//   too, got NaN life, which never reaches 0, and the rift could not be finished.
//   node tools/tests/rift_autoplay.js [seeds] [secs]     # seeds comma-separated, seed or seed:biome (default 8), game seconds each
// For each seed (biomes in turn): a level 273 wizard in item level 263 gear, god mode, auto-play on. Fails if a pylon
// is off the floor or out of reach; if before the quota he ever heads for the exit, steps into the arena or stands still
// for 20 s; if any monster's life goes NaN; or if the quota and the Guardian's death never come.
// Then the Conduit Pylon by itself: its bolts hurt the monsters round the hero, and leave their life a number.
const { openGame, report } = require('./harness');
const seeds = (process.argv[2] || '11,22,33,44,55,66,77,88').split(',');
const SECS = +process.argv[3] || 420;

let fails = 0;
const check = (ok, msg) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${msg}`); if (!ok) fails++; };
const top = (o) => Object.entries(o || {}).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([s, n]) => `${s} ${Math.round(n / 30)}s`).join(', ');

(async () => {
  const { browser, page, errors } = await openGame();
  try {
    await page.evaluate(async () => {
      const { G, game } = window.VELSCOUR;
      const { Auto } = await import('/src/game/autoplay.js');
      const { rollItem } = await import('/src/data/items.js');
      const { endgame, saveEndgame, resetEndgameCache } = await import('/src/game/endgame.js');
      localStorage.removeItem('velscour_endgame_v1'); resetEndgameCache(); endgame().unlocked = Date.now(); saveEndgame();
      await game.newChar('wizard', 'Rifter');
      document.querySelectorAll('.screen').forEach((s) => s.remove()); G.ui.modalCount = 0; G.ui.closeAll();
      const c = G.char, p = G.player;
      c.level = 273; c.statPoints += 272 * 5; c.skillPoints += 272 + 499; c.depth = 501; c.deepest = 500;
      Auto.spendStats(); Auto.spendSkills(); Auto.arrangeBar();
      for (let round = 0; round < 4; round++) {
        c.bag = c.bag.map(() => null);
        for (let i = 0; i < 25 && i < c.bag.length; i++) { const it = rollItem(263, { mf: 60 }); it.unid = false; c.bag[i] = it; }
        p.recompute(); Auto.optimizeGear();
      }
      c.bag = c.bag.map(() => null); Auto.spendSkills(); Auto.arrangeBar(); p.recompute(); p.hp = p.maxHp; c.potions.hp = 20;
      G.godMode = true;
    });
    const biomes = ['catacombs', 'cathedral', 'frozen', 'abyss', 'forge', 'shadow', 'thorn', 'storm'];
    for (let i = 0; i < seeds.length; i++) {
      const [seed, biome = biomes[i % biomes.length]] = [+seeds[i].split(':')[0], seeds[i].split(':')[1]];
      const r = await page.evaluate(async ({ seed, biome, SECS }) => {
        const { G, game } = window.VELSCOUR;
        const { Auto } = await import('/src/game/autoplay.js');
        const { BIOME_BY_ID } = await import('/src/data/biomes.js');
        G.riftSeed = seed; game.buildRift(1, BIOME_BY_ID[biome] || BIOME_BY_ID.catacombs); delete G.riftSeed;
        document.querySelectorAll('.screen').forEach((s) => s.remove()); G.ui.modalCount = 0; G.ui.closeAll();
        const w = G.world, R = w.rift, A = R.gen.raid, exit = w.portals.find((q) => q.type === 'exit');
        Auto.toggle(true); Auto.buildNav();
        const ev = { exitT: 0, arena: null, statuses: {}, stillMax: 0, gT: null, endT: null };
        ev.pylons = w.chests.filter((ch) => ch.pylon).map((ch) => ({ at: [Math.round(ch.x), Math.round(ch.y)], floor: w.map.walkable(ch.x, ch.y), path: Math.round(Auto.navDist(ch.x, ch.y)) }));
        let lx = G.player.x, ly = G.player.y, still = 0;
        for (let f = 0; f < SECS * 30; f++) {
          G.dt = 1 / 30; G.time += G.dt; G.frame++; game.update(1 / 30);
          if (f % 120 === 0) await new Promise((res) => setTimeout(res, 0));
          if (G.world !== w) break;
          const p = G.player;
          if (f % 30 === 0 && !ev.nan) for (const m of w.creatures) if (m.team === 'enemy' && !m.dead && !(m.hp >= 0)) { ev.nan = `${m.name} at ${Math.round(R.t)}s`; break; }
          const s = (Auto.status || '').replace(/ —.*/, '');
          if (!R.guardian) {
            ev.statuses[s] = (ev.statuses[s] || 0) + 1;
            if (Math.hypot(p.x - exit.x, p.y - exit.y) < 4) ev.exitT += 1 / 30;
            if (A && p.x >= A.x && ev.arena === null) ev.arena = { t: Math.round(R.t), pct: R.pct };
            if (Math.hypot(p.x - lx, p.y - ly) > 0.5) { lx = p.x; ly = p.y; still = 0; } else ev.stillMax = Math.max(ev.stillMax, still += 1 / 30);
          } else {
            if (ev.gT === null) ev.gT = Math.round(R.t);
            (ev.post ||= {})[s] = (ev.post[s] || 0) + 1;
            ev.gHp = Math.round(100 * R.guardian.hp / R.guardian.maxHp); ev.gD = Math.round(Math.hypot(p.x - R.guardian.x, p.y - R.guardian.y));
          }
          if (R.done || R.failed) { ev.endT = Math.round(R.t); ev.done = R.done; break; }
        }
        ev.pct = R.pct; ev.mapW = w.map.w; ev.exit = [Math.round(exit.x), Math.round(exit.y)];
        Auto.toggle(false);
        return ev;
      }, { seed, biome, SECS });
      const pyOk = r.pylons.length > 0 && r.pylons.every((q) => q.floor && q.path < 1e6 && q.at[0] + q.at[1] > 8);
      check(pyOk, `seed ${seed} ${biome}: ${r.pylons.length} pylons on reachable floor, not in the map's corner ${JSON.stringify(r.pylons)}`);
      const toExit = Math.round((r.statuses['Heading for the exit'] || 0) / 30);
      if (r.post && !r.done) console.log(`     after the quota: Guardian ${r.gHp}% life, ${r.gD} tiles off [${top(r.post)}]`);
      check(!r.nan && !toExit && r.exitT < 1 && !r.arena && r.stillMax < 20 && r.gT !== null && r.done,
        `seed ${seed} ${biome}: quota at ${r.gT}s, closed ${r.done ? 'at ' + r.endT + 's' : 'NO (' + r.pct + '%)'}; before the quota: ${toExit}s heading for the exit, ${r.exitT.toFixed(1)}s by the exit ${JSON.stringify(r.exit)} of a ${r.mapW}-wide map, ${r.nan ? 'NaN life: ' + r.nan + ', ' : ''}arena ${r.arena ? 'entered at ' + r.arena.t + 's, ' + r.arena.pct + '%' : 'kept out of'}, longest stand ${r.stillMax.toFixed(1)}s [${top(r.statuses)}]`);
    }
    // the Conduit Pylon alone: the hero by a pack, auto-play off, 4 s of bolts
    const z = await page.evaluate(async () => {
      const { G, game } = window.VELSCOUR;
      const { BIOME_BY_ID } = await import('/src/data/biomes.js');
      const { activatePylon } = await import('/src/game/rifts.js');
      const { PYLONS } = await import('/src/data/rifts.js');
      G.riftSeed = 4242; game.buildRift(1, BIOME_BY_ID.catacombs); delete G.riftSeed;
      document.querySelectorAll('.screen').forEach((s) => s.remove()); G.ui.modalCount = 0; G.ui.closeAll();
      const w = G.world, p = G.player;
      const m0 = w.creatures.find((m) => m.team === 'enemy' && !m.dead && m.rank === 'normal');
      p.x = m0.x; p.y = m0.y;
      const near = w.creatures.filter((m) => m.team === 'enemy' && !m.dead && Math.hypot(m.x - p.x, m.y - p.y) < 8);
      for (const m of near) { m.hp0 = m.hp; m.speed = 0; m.attackCd = 99; }
      activatePylon(w, PYLONS.find((d) => d.id === 'conduit'));
      const zap = p.pylonBuff.zap;
      for (let f = 0; f < 120; f++) { G.dt = 1 / 30; G.time += G.dt; G.frame++; game.update(1 / 30); }
      return { zap, n: near.length, hurt: near.filter((m) => m.dead || m.hp < m.hp0).length, nan: near.filter((m) => !(m.hp >= 0)).length };
    });
    check(z.zap > 0 && z.hurt > 0 && !z.nan, `the Conduit Pylon: bolts of ${Math.round(z.zap * 4.5 * 1.1)} hurt ${z.hurt} of the ${z.n} monsters by the hero, ${z.nan} left with NaN life`);
  } catch (e) { console.log('FAIL', e); fails++; }
  report(errors);
  await browser.close();
  console.log(fails ? `${fails} FAILED` : 'ALL OK');
  process.exit(fails ? 1 : 0);
})();
