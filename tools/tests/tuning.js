// Class tuning: how long every class takes to kill the monsters of its depth, measured in play.
// At each sample depth a hero two levels over its monsters (where auto-play's Balanced stance stops farming; TUNE_FULL=1:
// the level a full-clearing player has there, endgame.js) is built and geared the way endgame.js gears one (the best of a few rounds of 25 drops of its level, upgrades, gems, skill mastery). Then auto-play (god
// mode) fights pinned, harmless training dummies with no resistances on an open Wilds map, first one alone, then a
// pack of five, and the damage that lands (hero and minions) is counted after a warm-up for pets and buffs.
// Prints per class and depth:
//   one   seconds to kill one plain normal monster of the depth (archetype life 1) alone
//   pack  seconds to kill a pack of five of them (all damage that lands on the five, AoE included)
//   hit   % of the hero's life one normal monster hit takes (physical through armor)
// then each depth's geometric mean over the classes and every class's ratio to it (what CLASS_DMG in
// src/game/player.js evens out; toughness() in src/game/monster.js aims the mean at its target).
//   node tools/tests/tuning.js [classes|all] [depths] [seconds]   # e.g. tuning.js all 1,5,10,40 20
const { openGame, report, ALL_CLASSES } = require('./harness');
const classes = !process.argv[2] || process.argv[2] === 'all' ? ALL_CLASSES : process.argv[2].split(',');
const depths = (process.argv[3] || '1,3,6,10,20,40,80,160,250,350,500').split(',').map(Number);
const secs = +(process.argv[4] || 20);
// hero level a full-clearing player has on reaching a depth (endgame.js "F" column)
const LV = [[1, 1], [3, 3], [6, 6], [10, 12], [40, 50], [80, 93], [120, 124], [160, 147], [200, 164], [250, 184], [300, 203], [400, 236], [500, 265]];
const fullLevel = (d) => { for (let i = 1; i < LV.length; i++) if (d <= LV[i][0]) { const [d0, a] = LV[i - 1], [d1, b] = LV[i]; return Math.round(a + (b - a) * (d - d0) / (d1 - d0)); } return LV[LV.length - 1][1]; };
const depthLevel = (d) => (d <= 60 ? d : Math.round(60 + (d - 60) * 0.45));
const heroLevel = (d) => (process.env.TUNE_FULL ? fullLevel(d) : d <= 2 ? d : depthLevel(d) + 2);
const f = (x) => (x >= 100 ? x.toFixed(0) : x >= 0.1 ? x.toFixed(2) : x.toPrecision(2));

(async () => {
  const { browser, page, errors } = await openGame();
  const table = {};
  for (const cls of classes) {
    table[cls] = {};
    for (const D of depths) {
      table[cls][D] = await page.evaluate(async ({ cls, D, H, secs }) => {
        const { G, game } = window.VELSCOUR;
        const { Auto } = await import('/src/game/autoplay.js');
        const { depthLevel, armorDiv } = await import('/src/data/depth.js');
        const { rollItem, rollGem } = await import('/src/data/items.js');
        const { monsterBase, makeMonster } = await import('/src/game/monster.js');
        const { BIOME_BY_ID } = await import('/src/data/biomes.js');
        await game.newChar(cls, 'Tuning' + Math.random());
        document.querySelectorAll('.screen').forEach((s) => s.remove()); G.ui.modalCount = 0; G.ui.closeAll();
        const c = G.char, p = G.player, L = depthLevel(D);
        c.level = H; c.statPoints += (H - 1) * 5; c.skillPoints += (H - 1) + Math.max(0, D - 1);
        c.depth = D; c.deepest = D - 1;
        Auto.spendStats(); Auto.spendSkills(); Auto.arrangeBar();
        const rounds = D < 5 ? 1 : 2; // an early hero has seen few drops
        for (let round = 0; round < rounds; round++) {
          c.bag = c.bag.map(() => null);
          for (let i = 0; i < (D < 5 ? 6 : 25) && i < c.bag.length; i++) { const it = rollItem(Math.max(1, Math.min(L, H) - Math.floor(Math.random() * 4)), { mf: 0, bonus: 0.1 }); it.unid = false; c.bag[i] = it; }
          p.recompute(); Auto.optimizeGear();
        }
        c.bag = c.bag.map(() => null);
        if (D >= 10) for (const it of Object.values(c.equip)) if (it && it.type === 'gear') {
          it.upg = Math.min(6, 1 + Math.floor(Math.min(L, H) / 40));
          it.sockets = Math.max(it.sockets, Math.min(it.maxSockets, 1));
          while (it.gems.length < it.sockets) { const g = rollGem(L); it.gems.push({ gem: g.gem, tier: g.tier }); }
        }
        const M = Math.min(1000, Math.round(1 + D * 1.6));
        c.bar.filter(Boolean).forEach((id, i) => { c.mastery[id] = [Math.max(1, Math.round(M * (i < 2 ? 1 : 0.55))), 0]; });
        Auto.spendSkills(); Auto.arrangeBar(); p.recompute();
        const B = monsterBase(L), armK = p.st.armor / (p.st.armor + armorDiv(L));
        G.godMode = true; G.autoOpenSeals = true;
        game.buildDungeon(D, BIOME_BY_ID.overworld);
        await new Promise((res) => setTimeout(res, 300));
        const w = G.world;
        const fight = async (n) => {
          w.creatures = w.creatures.filter((m) => m.team !== 'enemy' && !(m.summon && m.owner !== G.player));
          let spot = null;
          for (let t = 0; t < 6000 && !spot; t++) {
            const x = 8 + Math.random() * (w.map.w - 16), y = 8 + Math.random() * (w.map.h - 16);
            let ok = true;
            for (let dx = -6; dx <= 6 && ok; dx++) for (let dy = -6; dy <= 6 && ok; dy++) ok = w.map.walkable(x + dx, y + dy);
            if (ok) spot = [x, y];
          }
          p.x = spot[0]; p.y = spot[1]; p.hp = p.maxHp; p.mana = p.maxMana;
          for (const m of w.creatures) if (m.summon && m.owner === p) { m.x = p.x + Math.random() - 0.5; m.y = p.y + Math.random() - 0.5; }
          const dummies = [];
          for (let k = 0; k < n; k++) {
            const a = (k / n) * Math.PI * 2, r = n > 1 ? 0.9 : 0;
            const m = makeMonster(w, 'ghoul', w.biome, L, 'normal', p.x + 4 + Math.cos(a) * r, p.y + Math.sin(a) * r);
            m.maxHp = m.hp = 1e15; m.awake = true; m.speed = 0; m.dmg = 0; m.res = {}; m.moves = null; m.affixes = null;
            m.x0 = m.x; m.y0 = m.y; w.add(m); dummies.push(m);
          }
          Auto.toggle(true);
          let sim = 0, dealt = 0;
          const warm = 4;
          while (sim < secs + warm) {
            for (let i = 0; i < 15 && sim < secs + warm; i++) {
              G.dt = 1 / 30; G.time += G.dt; G.frame++;
              game.update(1 / 30); sim += 1 / 30;
              for (const d of dummies) { if (sim > warm) dealt += d.maxHp - d.hp; d.hp = d.maxHp; d.x = d.x0; d.y = d.y0; d.dead = false; }
            }
            await new Promise((res) => setTimeout(res, 0));
          }
          Auto.toggle(false);
          return dealt / secs;
        };
        const one = await fight(1), pack = await fight(5);
        G.godMode = false;
        return { one: B.hp / Math.max(1e-9, one), pack: 5 * B.hp / Math.max(1e-9, pack), hit: B.dmg * (1 - armK) / p.maxHp * 100 };
      }, { cls, D, H: heroLevel(D), secs });
      if (!isFinite(table[cls][D].one)) table[cls][D].one = 999;
    }
    console.log(`${cls.padEnd(17)} ` + depths.map((D) => `D${D} ${f(table[cls][D].one)}/${f(table[cls][D].pack)}s ${table[cls][D].hit.toFixed(0)}%`).join('  '));
  }
  console.log('\ngeometric mean by depth (one / pack seconds), then each class one-target time / the mean:');
  const gm = (D, k) => Math.exp(classes.reduce((a, c) => a + Math.log(Math.max(1e-9, table[c][D][k])), 0) / classes.length);
  console.log('mean'.padEnd(17) + ' ' + depths.map((D) => `D${D} ${f(gm(D, 'one'))}/${f(gm(D, 'pack'))}`).join('  '));
  for (const cls of classes) {
    const r = depths.map((D) => table[cls][D].one / gm(D, 'one'));
    console.log(cls.padEnd(17) + ' ' + r.map((x) => x.toFixed(2)).join('  ') + `   (avg ${Math.exp(r.reduce((a, x) => a + Math.log(x), 0) / r.length).toFixed(2)})`);
  }
  report(errors);
  await browser.close();
})();
