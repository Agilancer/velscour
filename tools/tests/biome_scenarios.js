// Dungeon biome rooms and scenarios (data/biomerooms.js, game/scenarios.js, world/dungeon.js STYLES):
//  - every dungeon biome builds levels whose rooms carry its own themes, all reachable;
//  - each of the twenty scenario mechanics, forced in turn, is set up and can be completed by a cheating solver
//    (kills its foes, uses its markers, stands on its objectives);
//  - screenshots of a scenario marker per mechanic.
// Usage: node tools/tests/biome_scenarios.js [biomes,comma,separated] [noshots]
const { openGame, report } = require('./harness');
const only = (process.argv[2] || 'catacombs,castle_keep,fungal,sewers,cathedral,molten').split(',').filter(Boolean);
const shots = !process.argv.includes('noshots');
(async () => {
  const { browser, page, errors, shot } = await openGame({ width: 1280, height: 720 });
  try {
    await page.evaluate(async () => {
      const { G, game } = window.VELSCOUR;
      await game.newChar('paladin', 'Scenario Check');
      document.querySelectorAll('.screen').forEach((s) => s.remove());
      G.ui.modalCount = 0; G.godMode = true;
    });
    // rooms: themes per biome, reachability
    const rooms = await page.evaluate(async () => {
      const { G, game } = window.VELSCOUR;
      const { BIOMES } = await import('/src/data/biomes.js');
      const { loadBiomeArt } = await import('/src/core/assets.js');
      const { BIOME_ROOMS } = await import('/src/data/biomerooms.js');
      const out = {}, bad = [];
      for (const b of BIOMES.filter((b) => !b.overworld && b.id !== 'throne')) {
        await loadBiomeArt(b);
        const seen = new Set();
        let props = 0, unreach = 0;
        for (const depth of [3, 11, 22]) {
          game.buildDungeon(depth, b);
          const w = G.world, m = w.map, p = G.player;
          for (const r of w.rooms || []) if (r.title) seen.add(r.title);
          props += w.props.length;
          for (const r of w.rooms || []) if (r.w && m.walkable(r.mx, r.my) && !m.findPath(p.x, p.y, r.mx, r.my, 20000)) unreach++;
        }
        const own = new Set((BIOME_ROOMS[b.id] || []).map((e) => e[1]));
        if ([...seen].some((t) => !own.has(t))) bad.push(b.id + ' foreign theme');
        if (seen.size < 3) bad.push(b.id + ' only ' + seen.size + ' themes');
        if (unreach) bad.push(b.id + ' ' + unreach + ' unreachable rooms');
        out[b.id] = { style: b.style, themes: seen.size, props };
      }
      return { out, bad };
    });
    for (const [id, r] of Object.entries(rooms.out)) console.log('rooms', id, JSON.stringify(r));
    if (rooms.bad.length) errors.push('[ROOMS] ' + rooms.bad.join('; '));
    // scenarios: every mechanic in each tested biome
    for (const id of only) {
      for (let i = 0; i < 20; i++) {
        const r = await page.evaluate(async ([id, i]) => {
          const { G, game } = window.VELSCOUR;
          const { BIOME_BY_ID } = await import('/src/data/biomes.js');
          const { loadBiomeArt } = await import('/src/core/assets.js');
          const { scenarioTick } = await import('/src/game/scenarios.js');
          await loadBiomeArt(BIOME_BY_ID[id]);
          G.scenarioForce = i;
          game.buildDungeon(14, BIOME_BY_ID[id]);
          G.scenarioForce = null;
          const w = G.world, S = w.scenario, p = G.player;
          if (!S) return { id, i, err: 'no scenario' };
          const mark = w.chests.find((c) => c.scen === S && !c.hidden) || (S.targets && S.targets[0]) || null;
          const info = { id, i, mech: S.mech, title: S.title, at: mark ? [mark.x, mark.y] : null };
          // the cheating solver: a minute of game time in 0.25 s steps
          for (let t = 0; t < 240 && !S.done && !S.failed; t++) {
            for (const m of w.creatures) if (m.team === 'enemy' && !m.dead && (S.foes.includes(m) || (S.targets || []).includes(m) || Math.hypot(m.x - p.x, m.y - p.y) < 12)) { m.hp = 0; m.dead = true; if (m.onDeath) try { m.onDeath(p); } catch (e) {} }
            const mk = w.chests.find((c) => c.scen === S && !c.opened && !c.hidden);
            if (S.objective) { p.x = S.objective.x; p.y = S.objective.y; }
            else if (mk) { p.x = mk.x + 0.3; p.y = mk.y + 0.3; mk.use(); }
            if (S.mech === 'slaughter' && S.active && w.happen) w.happen.kills = (w.happen.kills || 0) + 2;
            if (S.mech === 'courier' && S.targets) { p.x = S.targets[0].x + 1; p.y = S.targets[0].y; }
            scenarioTick(w, 0.25);
          }
          return { ...info, done: S.done, failed: S.failed, progress: S.progress && S.progress() };
        }, [id, i]);
        console.log('scenario', JSON.stringify(r));
        if (r.err || !r.done) errors.push(`[SCENARIO] ${id} #${i} ${r.mech || ''} ${r.err || (r.failed ? 'failed' : 'not completed: ' + r.progress)}`);
        if (shots && id === only[0] && r.at) {
          await page.evaluate(async ([id, i]) => {
            const { G, game } = window.VELSCOUR;
            const { BIOME_BY_ID } = await import('/src/data/biomes.js');
            G.scenarioForce = i; game.buildDungeon(14, BIOME_BY_ID[id]); G.scenarioForce = null;
            const w = G.world, S = w.scenario, mk = w.chests.find((c) => c.scen === S && !c.hidden) || (S.targets && S.targets[0]);
            w.biome = { ...w.biome, dark: 0.3 };
            if (mk) { G.player.x = mk.x + 1.2; G.player.y = mk.y + 1.2; }
            G.hitStop = 1e9;
          }, [id, i]);
          await page.waitForTimeout(700);
          await shot(`scen_${id}_${String(i).padStart(2, '0')}`);
        }
      }
    }
  } catch (e) { errors.push('[SCEN] ' + (e.stack || e)); }
  report(errors);
  await browser.close();
})().catch((e) => { console.error(e); process.exitCode = 1; });
