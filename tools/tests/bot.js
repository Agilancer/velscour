// A simple bot plays depths 1..N with one class: spends skill/stat points, drinks potions,
// fights the nearest enemy, walks to the boss, then to the exit. Prints one JSON line per depth
// (time to kill the boss / reach the exit, kills, deaths, potions, level...). Useful for balance.
//   node tools/tests/bot.js paladin 2
const { openGame, report } = require('./harness');
const cls = process.argv[2] || 'paladin';
const depths = +(process.argv[3] || 2);

(async () => {
  const { browser, page, errors, shot } = await openGame();
  await page.evaluate((cls) => window.VELSCOUR.game.newChar(cls, 'Bot'), cls);
  for (let d = 1; d <= depths; d++) {
    const res = await page.evaluate(async (d) => {
      const { G, game } = window.VELSCOUR;
      const { BIOME_BY_ID } = await import('/src/data/biomes.js');
      const { CLASS_SKILLS, SKILLS } = await import('/src/data/skills.js');
      const { learn, canLearn } = await import('/src/ui/skills.js');
      const { autoAllocate } = await import('/src/ui/inventory.js');
      document.querySelectorAll('.screen').forEach((s) => s.remove()); G.ui.modalCount = 0; G.ui.closeAll();
      G.char.depth = d;
      game.buildDungeon(d, BIOME_BY_ID[d === 1 ? 'catacombs' : 'frozen']);
      const p = G.player, w = G.world;
      let t = 0, deaths = 0, potions = 0, bossT = null, exitT = null;
      const startKills = w.kills;
      while (t < 900) {
        if (p.dead) { deaths++; p.dead = false; p.hp = p.maxHp; }
        // canLearn(s) returns a reason string when it can NOT be learned, falsy when it can.
        while (G.char.skillPoints > 0) {
          const list = CLASS_SKILLS[G.char.classId];
          const sk = list.find((s) => !canLearn(s) && s.kind !== 'summon' && s.kind !== 'buff' && s.kind !== 'curse') || list.find((s) => !canLearn(s));
          if (!sk) break;
          learn(sk);
          if (!G.char.bar[9] && sk.id !== G.char.bar[0]) G.char.bar[9] = sk.id;
        }
        if (G.char.statPoints > 0) autoAllocate();
        if (p.hp < p.maxHp * 0.4 && G.char.potions.hp > 0 && !p.potionRegen.length) { p.usePotion('hp'); potions++; }
        const tgt = w.nearestHostile('player', p.x, p.y, 9, true);
        if (tgt) {
          const rmb = G.char.bar[9] && SKILLS[G.char.bar[9]];
          const useR = rmb && p.mana > p.maxMana * 0.3 && Math.random() < 0.5;
          p.tryUseSkill(useR ? rmb : SKILLS[G.char.bar[0]], tgt.x, tgt.y, tgt);
        } else if (w.boss && !w.boss.dead) {
          if (!p.moveTarget && !p.attackTarget) {
            const near = w.creatures.filter((c) => c.team === 'enemy' && !c.dead).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
            const goal = near && Math.hypot(near.x - p.x, near.y - p.y) < 25 ? near : w.boss;
            p.setMoveTarget(goal.x, goal.y);
          }
        } else {
          if (bossT === null) bossT = t;
          const ex = w.portals.find((q) => q.type === 'exit');
          if (Math.hypot(ex.x - p.x, ex.y - p.y) < 1.5) { exitT = t; break; }
          if (!p.moveTarget) p.setMoveTarget(ex.x, ex.y);
        }
        for (let i = 0; i < 3; i++) { w.update(1 / 30); t += 1 / 30; }
        if (Math.floor(t * 10) % 50 === 0) game.render();
      }
      game.render();
      return {
        depth: d, time: Math.round(t), bossKilledAt: bossT && Math.round(bossT), exitAt: exitT && Math.round(exitT),
        kills: w.kills - startKills, monstersLeft: w.creatures.filter((c) => c.team === 'enemy').length, deaths, potions,
        level: G.char.level, hp: Math.round(p.hp) + '/' + p.maxHp, gold: G.char.gold, bag: G.char.bag.filter(Boolean).length, loot: w.loot.length,
        skills: Object.keys(G.char.skills).map((k) => SKILLS[k].name + ':' + G.char.skills[k]).join(', '),
      };
    }, d);
    console.log(JSON.stringify(res));
    await shot(`bot_${cls}_d${d}`);
  }
  report(errors, 20);
  await browser.close();
})();
