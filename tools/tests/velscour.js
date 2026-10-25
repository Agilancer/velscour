// Demon Lord Velscour's five-phase last stand (game/velscour.js) and the skull's "final boss" message.
//   node tools/tests/velscour.js [noauto]
// 1. "final boss" in the skull's message box: the throne at the hero's depth (practice), the hero inside the arena.
// 2. Every phase, stepped by hand (god mode): the arena seals; at 80% he rises, can't be hurt, four seals with Wardens
//    and flame walls; breaking them lands him (phase 3: lava tide, Doom Brand, Mirror of Sin, spirals); at 50% the
//    abyss (dark, three Heart Shards each -5%, shades, lanterns); then True Form with APOCALYPSE (three safe circles,
//    auto-play's cover); at 10% bound to four obelisks; breaking them lets him die. Life gates and the damage cap.
//    Shots of every phase.
// 3. Auto-play fights the whole thing at depth 500 with a geared hero (god mode): every phase reached, a win, and how
//    long it took (target 5-10 minutes).
const { openGame, report } = require('./harness');
const noauto = process.argv.includes('noauto');

(async () => {
  const { browser, page, errors, shot } = await openGame({ width: 1600, height: 900 });
  let fails = 0;
  const check = (ok, msg) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${msg}`); if (!ok) fails++; };
  await page.evaluate(async () => { await window.VELSCOUR.game.newChar('paladin', 'Bossbot'); });
  await page.waitForTimeout(1500);
  const step = (s) => page.evaluate(async (s) => { const { G, game } = window.VELSCOUR; for (let t = 0; t < s * 30; t++) { G.dt = 1 / 30; G.time += G.dt; G.frame++; game.update(1 / 30); if (t % 60 === 0) await new Promise((r) => setTimeout(r, 0)); } }, s);

  // ---- 1. "final boss"
  await page.evaluate(async () => {
    const { G } = window.VELSCOUR, c = G.char;
    c.depth = 60; c.level = 70; G.player.recompute(); G.godMode = true;
    document.getElementById('velscour-skull').click();
  });
  await page.waitForTimeout(500);
  await page.fill('#velscour-message', 'final boss');
  await page.evaluate(() => [...document.querySelectorAll('.velscour-contact-dialog button')].find((b) => b.textContent === 'Send').click());
  await page.waitForFunction(() => { const w = window.VELSCOUR.G.world; return w && w.velscour; }, null, { timeout: 60000 });
  await page.waitForTimeout(1500);
  const fb = await page.evaluate(() => { const { G } = window.VELSCOUR, w = G.world, p = w.player, b = w.boss; return { practice: w.practice, biome: w.biome.id, depth: w.depth, inArena: ((p.x - 22) / 16) ** 2 + ((p.y - 17.5) / 13.5) ** 2 < 1, boss: b && b.name, d: Math.hypot(p.x - b.x, p.y - b.y) }; });
  console.log(JSON.stringify(fb));
  check(fb.biome === 'throne' && fb.practice && fb.depth === 60, '"final boss" builds Velscour\'s throne at the hero\'s depth (practice)');
  check(fb.inArena && fb.d < 14, 'the hero is set down inside his arena');
  await step(1);

  // ---- 2. every phase by hand
  const ph = () => page.evaluate(() => { const V = window.VELSCOUR.G.world.velscour, m = V.m; return { phase: V.phase, hp: +(m.hp / m.maxHp).toFixed(3), invuln: m.invuln > 0, targetable: m.targetable !== false, label: V.label(), parts: V.parts.filter((c) => !c.dead).map((c) => c.vk), sealed: V.gateTiles.length, dark: V.world.darkK }; });
  const dmg = (frac) => page.evaluate((frac) => { const V = window.VELSCOUR.G.world.velscour, m = V.m; m.hp = Math.max(1, m.hp - m.maxHp * frac); V.lastHp = m.hp; }, frac);
  let s = await ph();
  check(s.phase === 1 && s.sealed > 0, `phase 1 begins and the arena seals (${s.label})`);
  await shot('velscour_p1');
  // the damage cap: a huge hit only takes a few seconds' worth
  await page.evaluate(async () => { const { hit } = await import('/src/game/combat.js'); const w = window.VELSCOUR.G.world, V = w.velscour, m = V.m; V.bank = 0; hit(w.player, m, m.maxHp * 0.15, 'phys', { force: true }); });
  await step(0.1);
  s = await ph();
  check(s.hp > 0.97, `the damage cap holds a 15% hit to a sliver (${s.hp})`);
  // through the 80% gate: hits past it stop at 80%
  await dmg(0.5); await step(0.2);
  s = await ph();
  check(s.phase === 2 && s.hp >= 0.799 && s.invuln && !s.targetable, `at 80% he rises and can't be hurt (${JSON.stringify(s)})`);
  check(s.parts.filter((k) => k === 'seal').length === 4, 'four seals');
  const wardens = await page.evaluate(() => window.VELSCOUR.G.world.creatures.filter((c) => /^Warden of/.test(c.name) && !c.dead).length);
  check(wardens === 4, 'four Seal Wardens');
  await step(2);
  await shot('velscour_p2_seals');
  await page.evaluate(async () => { const { kill } = await import('/src/game/combat.js'); const w = window.VELSCOUR.G.world; for (const c of w.velscour.parts) if (c.vk === 'seal') kill(c, w.player); for (const c of w.creatures) if (/^Warden of/.test(c.name)) kill(c, w.player); });
  await step(0.5);
  s = await ph();
  check(s.phase === 3 && !s.invuln, `the seals broken, he lands: phase 3 (${s.label})`);
  await page.evaluate(() => { const V = window.VELSCOUR.G.world.velscour; V.cd.mirror = 0; V.cd.doom = 0; V.cd.spiral = 0; });
  await step(6);
  const p3 = await page.evaluate(() => { const w = window.VELSCOUR.G.world; return { lava: w.hazards.some((h) => h.constructor.name === 'LavaRing'), mirrors: w.velscour.parts.filter((c) => c.vk === 'mirror' && !c.dead).length }; });
  check(p3.lava && p3.mirrors === 2, `lava tide and two Mirrors of Sin (${JSON.stringify(p3)})`);
  await shot('velscour_p3_hellfire');
  // the 50% gate: the abyss
  await dmg(0.6); await step(0.3);
  s = await ph();
  check(s.phase === 4 && s.dark > 0.9 && s.parts.filter((k) => k === 'shard').length === 3 && s.invuln, `at 50% the abyss: dark, three Heart Shards (${s.label})`);
  await step(2);
  await shot('velscour_p4_abyss');
  const before = s.hp;
  await page.evaluate(async () => { const { kill } = await import('/src/game/combat.js'); const w = window.VELSCOUR.G.world; for (const c of w.velscour.parts) if (c.vk === 'shard') kill(c, w.player); });
  await step(0.5);
  s = await ph();
  check(s.phase === 5 && s.hp < before - 0.12 && s.dark < 0.9, `three shards broken tear 15% off him; True Form (${before} -> ${s.hp})`);
  // APOCALYPSE: three safe circles, auto-play's cover
  await page.evaluate(() => { window.VELSCOUR.G.world.velscour.cd.apoc = 0; });
  await step(1);
  const ap = await page.evaluate(() => { const w = window.VELSCOUR.G.world, h = w.hazards.find((x) => x.safeAt); return { has: !!h }; });
  check(ap.has, 'APOCALYPSE marks safe circles (auto-play takes cover in them)');
  await shot('velscour_p5_apocalypse');
  await step(5);
  // the 10% gate: the obelisks
  await dmg(0.6); await step(0.3);
  s = await ph();
  check(s.phase === 6 && s.invuln && s.parts.filter((k) => k === 'obelisk').length === 4, `at 10% he binds himself to four obelisks (${s.label})`);
  await step(1);
  await shot('velscour_p5_obelisks');
  await page.evaluate(async () => { const { kill } = await import('/src/game/combat.js'); const w = window.VELSCOUR.G.world; for (const c of w.velscour.parts) if (c.vk === 'obelisk') kill(c, w.player); });
  await step(0.5);
  s = await ph();
  check(s.phase === 5 && !s.invuln, 'the obelisks broken, he can be finished');
  await page.evaluate(async () => { const { kill } = await import('/src/game/combat.js'); const w = window.VELSCOUR.G.world; kill(w.boss, w.player); });
  await step(1);
  const end = await page.evaluate(() => { const w = window.VELSCOUR.G.world; return { dead: w.boss.dead, sealed: w.velscour.gateTiles.length, exit: w.portals.find((p) => p.type === 'exit').active, victory: !!document.querySelector('.screen'), loot: w.loot.filter((l) => l.kind === 'item' && l.item.relic).length }; });
  check(end.dead && !end.sealed && end.exit, 'he dies, the arena opens, the exit lights');

  // ---- 3. auto-play, the real thing at depth 500 with a geared hero
  if (!noauto) {
    const res = await page.evaluate(async () => {
      const { G, game } = window.VELSCOUR;
      const { Auto } = await import('/src/game/autoplay.js');
      const { rollItem, rollGem, RING_SLOTS, SLOTS } = await import('/src/data/items.js');
      const { charScore } = await import('/src/game/autoplay.js');
      const { BIOME_BY_ID } = await import('/src/data/biomes.js');
      const c = G.char, p = G.player;
      // gear like tools/tests/balance.js: level 259, the best of many drops of item level 260 per slot, +8, gems
      c.level = 259; c.statPoints = 258 * 5; c.skillPoints = 520; c.depth = 500; c.deepest = 499;
      Auto.spendStats(); Auto.spendSkills(); Auto.arrangeBar();
      for (const s of SLOTS) {
        let best = null, bs = -Infinity;
        for (let i = 0; i < 60; i++) {
          const it = rollItem(262, { slot: s.startsWith('ring') ? 'ring' : s, mf: 300, bonus: 1.5 }); it.req = 1; it.upg = 8;
          it.sockets = it.maxSockets; it.gems = Array.from({ length: it.sockets }, () => { const g = rollGem(300); return { gem: g.gem, tier: 7 }; });
          c.equip[s] = it; p.recompute(); const sc = charScore(p); if (sc > bs) { bs = sc; best = it; }
        }
        c.equip[s] = best;
      }
      p.recompute(); p.hp = p.maxHp; p.mana = p.maxMana;
      c.potions = { hp: 20, mp: 20, rejuv: 10, fury: 5 };
      game.enterTown(); await new Promise((r) => setTimeout(r, 800));
      await game.finalBoss();
      const w = G.world;
      Auto.toggle(true);
      const phases = new Set();
      let t = 0;
      for (; t < 30 * 60 * 13 && !w.boss.dead; t++) {
        G.dt = 1 / 30; G.time += G.dt; G.frame++; game.update(1 / 30);
        phases.add(w.velscour.phase);
        if (t % 120 === 0) await new Promise((r) => setTimeout(r, 0));
        if (G.world !== w) break;
      }
      Auto.toggle(false);
      return { dead: w.boss.dead, mins: +(w.velscour.t / 60).toFixed(2), phases: [...phases], practice: w.practice, hp: +(w.boss.hp / w.boss.maxHp).toFixed(3), loot: w.loot.filter((l) => l.kind === 'item' && l.item.relic).length };
    });
    console.log(JSON.stringify(res));
    check(!res.practice, 'depth 500: the real fight');
    check(res.dead, `auto-play beats Velscour (${res.mins} min, phases ${res.phases.join(',')}, left at ${res.hp})`);
    check(res.mins >= 5 && res.mins <= 10, `the fight lasts 5-10 minutes (${res.mins})`);
    check([1, 2, 3, 4, 5, 6].every((k) => res.phases.includes(k)), 'auto-play sees every phase');
    check(res.loot >= 2, 'the real win drops a Heirloom and a Covenant piece');
    await shot('velscour_won');
  }
  report(errors);
  if (fails) { console.log(fails + ' FAILED'); process.exitCode = 1; }
  await browser.close();
})();
