// Velscour's first seconds without god mode, traced: a depth-500-geared hero (like velscour_real.js) set down in his
// arena; every drop in life is logged with the fight's clock, what was near and who hit last, until the hero dies or
// `secs` of fight pass. For finding deaths that happen right as the fight begins.
//   node tools/tests/velscour_probe.js [class] [attempts] [secs] [unbound]
const { openGame, report } = require('./harness');
const cls = process.argv[2] || 'ranger', attempts = +(process.argv[3] || 4), secs = +(process.argv[4] || 20), unbound = process.argv.includes('unbound');

(async () => {
  const { browser, page, errors } = await openGame();
  for (let a = 0; a < attempts; a++) {
    const r = await page.evaluate(async ({ cls, secs, unbound }) => {
      const { G, game } = window.VELSCOUR;
      const { Auto, charScore } = await import('/src/game/autoplay.js');
      const { rollItem, rollGem, SLOTS } = await import('/src/data/items.js');
      const { depthLevel } = await import('/src/data/depth.js');
      const depth = unbound ? 600 : 500, ML = depthLevel(depth);
      if (Auto.on) Auto.toggle(false);
      await game.newChar(cls, 'Probe');
      document.querySelectorAll('.screen').forEach((s) => s.remove()); G.ui.modalCount = 0; G.ui.closeAll();
      const c = G.char, p = G.player;
      c.level = ML + 1; c.statPoints = ML * 5; c.skillPoints = ML + depth + 20; c.depth = depth; c.deepest = depth - 1;
      Auto.spendStats(); Auto.spendSkills(); Auto.arrangeBar();
      for (const s of SLOTS) {
        let best = null, bs = -Infinity;
        for (let i = 0; i < 40; i++) {
          const it = rollItem(ML + 4, { slot: s.startsWith('ring') ? 'ring' : s, mf: 300, bonus: 1.5 }); it.req = 1; it.upg = 8;
          it.sockets = it.maxSockets; it.gems = Array.from({ length: it.sockets }, () => { const g = rollGem(300); return { gem: g.gem, tier: 7 }; });
          c.equip[s] = it; p.recompute(); const sc = charScore(p); if (sc > bs) { bs = sc; best = it; }
        }
        c.equip[s] = best;
      }
      p.recompute(); p.hp = p.maxHp; p.mana = p.maxMana;
      c.potions = { hp: 15, mp: 15, rejuv: 6, fury: 3 };
      G.godMode = false;
      game.enterTown(); await new Promise((r) => setTimeout(r, 600));
      if (unbound) { const { unlockEndgame } = await import('/src/game/endgame.js'); unlockEndgame(); c.keys = 3; await game.enterUnbound(); }
      else await game.finalBoss();
      const w = G.world, V = w.velscour, P = G.player, log = [];
      let killer = null;
      const die0 = P.die.bind(P);
      P.die = (src) => { killer = src ? `${src.name || src.constructor.name}${src.owner ? ' of ' + src.owner.name : ''}` : 'none'; return die0(src); };
      let last = P.hp;
      Auto.toggle(true);
      for (let t = 0; t < 30 * (secs + 30) && !P.dead && G.world === w && V.t < secs; t++) {
        G.dt = 1 / 30; G.time += G.dt; G.frame++; game.update(1 / 30);
        if (P.hp < last - P.maxHp * 0.04 && log.length < 40) {
          const near = w.creatures.filter((m) => m.team === 'enemy' && !m.dead && Math.hypot(m.x - P.x, m.y - P.y) < 4).map((m) => m.name).slice(0, 4);
          log.push(`t=${V.t.toFixed(2)} ph${V.phase} -${Math.round(((last - P.hp) / P.maxHp) * 100)}% -> ${Math.round((P.hp / P.maxHp) * 100)}% near=[${near.join('; ')}] hz=[${[...new Set(w.hazards.map((h) => h.constructor.name))].join(',')}] boss@${Math.hypot(V.m.x - P.x, V.m.y - P.y).toFixed(1)}`);
        }
        last = P.hp;
        if (t % 120 === 0) await new Promise((r) => setTimeout(r, 0));
      }
      Auto.toggle(false);
      return { dead: P.dead, t: +V.t.toFixed(2), phase: V.phase, killer, maxHp: P.maxHp, armor: P.st.armor, res: P.st.res, log };
    }, { cls, secs, unbound });
    console.log(`${cls} #${a + 1}: dead=${r.dead} at ${r.t}s phase ${r.phase} killer=${r.killer} life ${r.maxHp} armor ${r.armor} res ${JSON.stringify(r.res)}`);
    for (const l of r.log) console.log('   ' + l);
  }
  report(errors);
  await browser.close();
})();
