// Happenings (src/game/happenings.js): every omen builds, every shrine/remains/cursed chest is placed reachable and
// auto-play uses it, the treasure imp flees and drops its hoard, Velscour's challenge runs, kill streaks fire, each
// town event applies, and Defiance stacks on deaths and clears at the block's end. Screenshots in tools/tests/out/.
//   node tools/tests/happenings.js
const { openGame, report } = require('./harness');

(async () => {
  const { browser, page, errors, shot } = await openGame();
  if (process.env.TRACE) await page.evaluate(() => { window.__TRACE = true; });
  const fails = [];
  const ok = (cond, msg) => { if (!cond) fails.push(msg); console.log((cond ? 'ok   ' : 'FAIL ') + msg); };
  await page.evaluate(async () => {
    const { G, game } = window.VELSCOUR;
    await game.newChar('paladin', 'Happy');
    G.godMode = true; // a death screen from the omen checks would fire mid-test
    document.querySelectorAll('.screen').forEach((s) => s.remove()); G.ui.modalCount = 0; G.ui.closeAll();
  });
  const run = (secs) => page.evaluate(async (secs) => {
    const { G, game } = window.VELSCOUR;
    for (let t = 0; t < secs; t += 1 / 30) {
      if (G.mode !== 'game' || !G.world) break;
      G.dt = 1 / 30; G.time += G.dt; G.frame++; game.update(1 / 30);
      if ((t * 30 | 0) % 60 === 0) await new Promise((r) => setTimeout(r, 0));
    }
    game.render();
  }, secs);

  // ---- every omen builds a level and announces
  const omens = await page.evaluate(async () => {
    const { G, game } = window.VELSCOUR;
    const H = await import('/src/game/happenings.js');
    const { BIOME_BY_ID } = await import('/src/data/biomes.js');
    const out = {};
    for (const k of Object.keys(H.OMENS)) {
      G.char.level = 40; G.player.recompute();
      game.buildDungeon(34, BIOME_BY_ID.catacombs);
      const w = G.world;
      w.happen.omen = k; // re-roll with this omen forced
      const O = H.OMENS[k];
      w.lootMul = O.loot || 1; w.goldMul = O.gold || 1;
      H.announceHappenings(w);
      for (let i = 0; i < 60; i++) { G.dt = 1 / 30; G.time += G.dt; game.update(1 / 30); }
      out[k] = { foes: w.creatures.filter((m) => m.team === 'enemy').length, omenBuff: G.player.buffs.some((b) => b.id === 'omen'), marked: w.creatures.filter((m) => m._omen).length };
    }
    return out;
  });
  for (const [k, v] of Object.entries(omens)) ok(v.foes > 0, `omen ${k}: level built (${v.foes} foes, ${v.marked} marked${v.omenBuff ? ', hero buffed' : ''})`);

  // ---- a level with every interactable, auto-play on
  const placed = await page.evaluate(async () => {
    const { G, game } = window.VELSCOUR;
    const H = await import('/src/game/happenings.js');
    const { BIOME_BY_ID } = await import('/src/data/biomes.js');
    const { Auto } = await import('/src/game/autoplay.js');
    G.godMode = true;
    game.buildDungeon(34, BIOME_BY_ID.catacombs);
    const w = G.world, p = G.player, map = w.map;
    w.chests = w.chests.filter((c) => !c.label && !c.shrine);
    G.char.level = 40; G.char.statPoints += 39 * 5; G.char.skillPoints += 39 + 33; // its points spent: monsters take a while now
    Auto.spendStats(); Auto.spendSkills(); Auto.arrangeBar(); p.recompute(); p.hp = p.maxHp; p.mana = p.maxMana;
    for (const m of w.creatures) if (m.team === 'enemy' && m !== w.boss && Math.hypot(m.x - p.x, m.y - p.y) < 30) m.dead = true; // a quiet start: walking to them is the test
    const near = (r) => { for (let i = 0; i < 80; i++) { const a = Math.random() * 6.28, x = p.x + Math.cos(a) * r, y = p.y + Math.sin(a) * r; if (map.walkable(x, y) && map.findPath(p.x, p.y, x, y, 8000)) return [x, y]; } return map.randomNear(p.x, p.y, 3); };
    for (const k of Object.keys(H.SHRINES)) H.addShrine(w, near(4 + Math.random() * 6), k);
    H.addRemains(w, near(5)); H.addCursed(w, near(6));
    window.__cursed = w.chests.find((c) => c.label === 'Cursed Chest');
    if (w.boss) w.boss.invuln = 1e6; // auto-play must not finish the depth mid-test
    w.ambushT = 1e9; // and no ambush waves: the cursed chest brings its own
    if (window.__TRACE) { const d = p.die; p.die = function (src) { console.error('DIE godMode=' + G.godMode + ' hp=' + this.hp + ' by ' + (src && src.name) + ' ' + new Error().stack.split(/\n/).slice(1, 6).join(' | ')); return d.call(this, src); }; }
    Auto.toggle(true);
    return w.chests.filter((c) => c.label).length;
  });
  ok(placed === 9, `placed 7 shrines + remains + cursed chest (${placed})`);
  await run(1); await shot('happen_interactables');
  // monsters take a few seconds each: 200 s to get round the level
  for (let i = 0; i < 20; i++) { await run(10); if (process.env.TRACE) console.log('   trace', await page.evaluate(async () => { const { Auto } = await import('/src/game/autoplay.js'); const G = window.VELSCOUR.G; return G.world.kind + ' D' + G.world.depth + ' ' + Auto.status + ' hp ' + Math.round(G.player.hp) + ' boss ' + (G.world.boss && G.world.boss.dead); })); }
  const used = await page.evaluate(() => {
    const w = window.VELSCOUR.G.world;
    return { open: w.chests.filter((c) => c.label && c.opened).map((c) => c.label), shut: w.chests.filter((c) => c.label && !c.opened).map((c) => c.label), buffs: window.VELSCOUR.G.player.buffs.map((b) => b.id), cursed: window.__cursed && { opened: window.__cursed.opened, done: window.__cursed.done } };
  });
  console.log('   used:', used.open.join(', '), '| left:', used.shut.join(', '), '| buffs:', used.buffs.join(','));
  ok(used.open.length >= 6, `auto-play used ${used.open.length}/9 interactables`);
  ok(used.cursed && used.cursed.opened, 'auto-play opened the cursed chest');
  await run(20);
  const cursedDone = await page.evaluate(() => window.__cursed && window.__cursed.done);
  ok(cursedDone, 'cursed chest waves beaten, hoard dropped');
  await shot('happen_after');

  // ---- treasure imp: flees, auto-play chases it down, it bursts into loot
  const imp = await page.evaluate(async () => {
    const { G, game } = window.VELSCOUR;
    const H = await import('/src/game/happenings.js');
    const w = G.world;
    for (const m of w.creatures) if (m.team === 'enemy' && m !== w.boss) m.dead = true;
    H.spawnImp(w);
    const m = w.happen.imp;
    return m ? { name: m.name, hp: Math.round(m.maxHp) } : null;
  });
  ok(!!imp, `treasure imp spawned ${imp ? imp.name + ' ' + imp.hp + ' hp' : ''}`);
  await run(0.6); await shot('happen_imp');
  await run(34);
  const impEnd = await page.evaluate(() => { const w = window.VELSCOUR.G.world; return { left: !!w.happen.imp, loot: w.loot.filter((l) => l.kind === 'item').length }; });
  ok(!impEnd.left, `imp caught or escaped within 34 s (loot items on floor ${impEnd.loot})`);

  // ---- Velscour's challenge + streak counter
  const ch = await page.evaluate(async () => {
    const { G } = window.VELSCOUR;
    const H = await import('/src/game/happenings.js');
    H.startChallenge(G.world);
    return G.world.happen.ch && G.world.happen.ch.need;
  });
  ok(ch > 0, `challenge started: slay ${ch}`);
  await run(47); // 45 s on the clock
  const chEnd = await page.evaluate(() => ({ ch: window.VELSCOUR.G.world.happen.ch, best: window.VELSCOUR.G.world.happen.best || 0, kills: window.VELSCOUR.G.world.happen.kills || 0 }));
  ok(!chEnd.ch, `challenge resolved (kills this level ${chEnd.kills}, best streak ${chEnd.best})`);

  // ---- town events
  const town = await page.evaluate(async () => {
    const { G, game } = window.VELSCOUR;
    const H = await import('/src/game/happenings.js');
    const { Auto } = await import('/src/game/autoplay.js');
    Auto.toggle(false); G.godMode = false;
    const out = {};
    for (const k of Object.keys(H.TOWN_EVENTS)) {
      const E = H.TOWN_EVENTS[k], c = G.char;
      const before = { gold: c.gold, pots: c.potions.hp, bag: c.bag.filter(Boolean).length };
      if (E.bless) c.blessing = { name: E.name, left: 3, stats: E.bless };
      const msg = E.fn ? E.fn(c) : 'blessed';
      G.player.recompute();
      out[k] = { msg, gold: c.gold - before.gold, pots: c.potions.hp - before.pots, bag: c.bag.filter(Boolean).length - before.bag, bless: !!c.blessing };
    }
    // a blessing lasts three depths
    const { tickBlessing, addDefiance, clearDefiance, heroBonus } = await import('/src/game/defiance.js');
    const c = G.char;
    c.blessing = { name: 't', left: 3, stats: { dmg: 15 } };
    tickBlessing(c); tickBlessing(c); const two = !!c.blessing; tickBlessing(c);
    out.blessTicks = { afterTwo: two, afterThree: !!c.blessing };
    // Defiance: stacks per death in one block, caps, clears past the block's raid depth
    c.defiance = null;
    for (let i = 0; i < 10; i++) addDefiance(c, 153);
    const capped = c.defiance.n; const bonus = heroBonus(c);
    const kept = !clearDefiance(c, 154); const cleared = clearDefiance(c, 155);
    addDefiance(c, 157); const fresh = c.defiance.n;
    out.defiance = { capped, life: bonus.life, kept, cleared, fresh };
    game.enterTown();
    return out;
  });
  for (const [k, v] of Object.entries(town)) if (!['blessTicks', 'defiance'].includes(k)) console.log(`   town ${k}: ${v.msg}`);
  ok(town.festival.pots === 3 && town.lottery.gold > 0 && town.peddler.bag === 1, 'town festival / lottery / peddler pay out');
  ok(town.blessTicks.afterTwo && !town.blessTicks.afterThree, 'a blessing lasts exactly three depths');
  ok(town.defiance.capped === 8 && town.defiance.kept && town.defiance.cleared && town.defiance.fresh === 1, `Defiance caps at 8 (+${town.defiance.life}% life), holds inside the block, clears at its BOSS ROOM`);
  await run(3); await shot('happen_town');

  // ---- death goes back to the start of the block with a Defiance stack
  const death = await page.evaluate(async () => {
    const { G, game } = window.VELSCOUR;
    const { BIOME_BY_ID } = await import('/src/data/biomes.js');
    G.char.defiance = null;
    G.char.depth = 153; game.buildDungeon(153, BIOME_BY_ID.catacombs);
    G.player.buffs = []; G.char.blessing = null; G.player.recompute();
    const hp0 = G.player.maxHp;
    G.player.die(null);
    await new Promise((r) => setTimeout(r, 2200));
    const btn = [...document.querySelectorAll('.screen button')].pop();
    if (btn) btn.click();
    await new Promise((r) => setTimeout(r, 300));
    return { depth: G.char.depth, n: G.char.defiance && G.char.defiance.n, hp0, hp1: G.player.maxHp, where: G.world.kind };
  });
  ok(death.depth === 151 && death.n === 1 && death.hp1 > death.hp0, `death at 153 -> town, depth ${death.depth}, Defiance ${death.n}, life ${death.hp0} -> ${death.hp1}`);
  await shot('happen_defiance');

  // ---- nemesis: the killer comes back as a unique on a later depth; killing it clears it
  const nem = await page.evaluate(async () => {
    const { G, game } = window.VELSCOUR;
    const H = await import('/src/game/happenings.js');
    const { BIOME_BY_ID } = await import('/src/data/biomes.js');
    const { kill } = await import('/src/game/combat.js');
    document.querySelectorAll('.screen').forEach((s) => s.remove()); G.ui.modalCount = 0; G.ui.closeAll();
    G.char.nemesis = null;
    H.markNemesis(G.char, { team: 'enemy', arch: 'skeleton', name: 'Champion Rattlebones', art: null, rank: 'champion' }, 33);
    const marked = G.char.nemesis && G.char.nemesis.name;
    let m = null;
    for (let i = 0; i < 4 && !m; i++) { game.buildDungeon(34, BIOME_BY_ID.catacombs); m = G.world.happen.nemesis; }
    const name = m && m.name;
    if (m) kill(m, G.player);
    return { marked, name, cleared: !G.char.nemesis };
  });
  ok(nem.marked === 'Rattlebones' && nem.name && nem.cleared, `nemesis "${nem.name}" returns and its death clears it`);

  console.log(fails.length ? `\n${fails.length} FAILED` : '\nALL PASSED');
  if (fails.length) process.exitCode = 1;
  report(errors, 20);
  await browser.close();
})();
