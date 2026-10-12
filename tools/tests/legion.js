// The Necromancer's skeletons (Skeletal Legion tree + Raise Skeleton, Skeletal Archer, Skeletal Mage): a line-up of
// every skeleton's art (legion_lineup.png, zoomed), then a battle where each Legion skill is cast against a crowd and
// every minion must use its attack, and its spell if it has one (legion_battle.png). Prints per-minion counts.
//   node tools/tests/legion.js
const { openGame, report } = require('./harness');

(async () => {
  const { browser, page, errors, shot } = await openGame({ width: 1400, height: 800 });
  await page.evaluate(async () => {
    const { G, game } = window.VELSCOUR;
    await game.newChar('necromancer', 'Legion');
    document.querySelectorAll('.screen').forEach((s) => s.remove());
    G.ui.modalCount = 0;
    const { loadEnemyArt } = await import('/src/core/enemyart.js');
    await loadEnemyArt();
    const { SUMMONS } = await import('/src/data/summons.js');
    const { buildSummon } = await import('/src/game/monster.js');
    const { camera } = await import('/src/core/view.js');
    const p = G.player, w = G.world;
    for (const c of w.creatures) if (!c.isPlayer) c.dead = true;
    const keys = Object.keys(SUMMONS).filter((k) => SUMMONS[k].look && SUMMONS[k].look.art && !SUMMONS[k].pool);
    keys.forEach((k, i) => {
      const r = Math.floor(i / 10), c = i % 10;
      const m = buildSummon(p, SUMMONS[k], k, p.x - 3.6 + c * 0.8 + r * 0.9, p.y + 3 - c * 0.8 + r * 0.9, 1, 100, 0);
      m.static = true; m.spawnT = 1; m.flip = false;
      w.add(m);
    });
    G.settings.zoom = 1.9; camera.computeZoom();
    for (const n of w.npcs) n.x += 40; // out of the shot
    G.paused = true;
    game.render();
  });
  await page.waitForTimeout(300);
  await shot('legion_lineup');

  // cast every Legion skill into a crowd, then a mid-fight shot
  await page.evaluate(async () => {
    const { G, game } = window.VELSCOUR;
    const { camera } = await import('/src/core/view.js');
    const { BIOME_BY_ID } = await import('/src/data/biomes.js');
    const { CLASS_SKILLS } = await import('/src/data/skills.js');
    const { SUMMONS } = await import('/src/data/summons.js');
    const { makeMonster, Monster } = await import('/src/game/monster.js');
    G.paused = false; G.settings.zoom = 2; G.settings.gore = 0; // a readable shot
    G.char.level = 30; G.player.recompute();
    game.buildDungeon(10, BIOME_BY_ID.catacombs);
    const p = G.player, w = G.world;
    camera.computeZoom();
    G.godMode = true;
    for (const c of w.creatures) if (!c.isPlayer) c.dead = true;
    // tally attacks and spells per minion kind
    const tally = {};
    const T = (k, f) => { (tally[k] = tally[k] || { atk: 0, spell: 0, melee: 0 })[f]++; };
    const sa = Monster.prototype.summonAttack, perf = Monster.prototype.perform;
    Monster.prototype.summonAttack = function (t, A = this.atk) { if (this.summonKey) T(this.summonKey, A === this.atk ? 'atk' : 'spell'); return sa.call(this, t, A); };
    Monster.prototype.perform = function (a) { if (this.summon && a.kind === 'melee') T(this.summonKey, 'melee'); return perf.call(this, a); };
    const step = (n) => { for (let i = 0; i < n; i++) { w.update(1 / 30); if (i % 10 === 0) game.render(); } };
    const crowd = (n) => {
      const roster = w.biome.roster;
      for (let k = 0; k < n; k++) {
        const [x, y] = w.map.randomNear(p.x + 3, p.y + 3, 3);
        const m = makeMonster(w, roster[k % roster.length], w.biome, 6, 'normal', x, y);
        m.maxHp = m.hp = m.maxHp * 6; m.awake = true;
        w.add(m);
      }
    };
    const legion = CLASS_SKILLS.necromancer.filter((s) => s.tree === 3 || ['skeleton', 'skelarcher', 'skelmage'].includes(s.m.sum));
    const out = [];
    for (const sk of legion) {
      G.char.skills[sk.id] = 5;
      p.mana = p.maxMana = 99999; p.cooldowns = {}; p.castLock = 0;
      w.rebuildGrid();
      if (w.creatures.filter((c) => c.team === 'enemy' && !c.dead).length < 8) crowd(12);
      const ok = p.tryUseSkill(sk, p.x + 1, p.y + 1);
      step(10);
      if (ok === false) out.push('FAIL cast ' + sk.name);
    }
    step(60);
    w.loot.length = 0; // no item labels in the shot
    G.paused = true;
    game.render();
    window.legionTest = { tally, legion, out, step };
  });
  await page.waitForTimeout(200);
  await shot('legion_battle');

  // fight on, then check every minion kind attacked and cast its spell
  const out = await page.evaluate(async () => {
    const { G } = window.VELSCOUR;
    const { SUMMONS } = await import('/src/data/summons.js');
    const { tally, legion, out, step } = window.legionTest;
    const w = G.world;
    G.paused = false;
    step(30 * 12);
    const mine = w.creatures.filter((c) => c.summon && !c.dead);
    out.push(`minions alive ${mine.length}: ` + Object.entries(mine.reduce((a, c) => ((a[c.summonKey] = (a[c.summonKey] || 0) + 1), a), {})).map((e) => e.join('x')).join(' '));
    const want = new Set(legion.filter((s) => s.kind === 'summon').map((s) => s.m.sum).flatMap((k) => SUMMONS[k].pool || [k]));
    for (const k of want) {
      const d = SUMMONS[k], t = tally[k] || { atk: 0, spell: 0, melee: 0 };
      const attacked = d.ai === 'melee' ? t.melee : t.atk;
      const line = `${k.padEnd(13)} attacks ${attacked}${d.spell ? ' spells ' + t.spell : ''}`;
      out.push((attacked && (!d.spell || t.spell) ? '  ok ' : 'FAIL ') + line);
    }
    out.push(`kills ${w.kills}, partyBuff on ${mine.filter((c) => c.partyBuff).length} minions`);
    return out;
  });
  console.log(out.join('\n'));
  if (out.some((l) => l.startsWith('FAIL'))) process.exitCode = 1;
  report(errors);
  await browser.close();
})();
