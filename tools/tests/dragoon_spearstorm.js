// Dragoon single/triple spear damage, VFX, cooldowns and bot rotation in the live browser.
// python3 -m http.server 8123; node tools/tests/dragoon_spearstorm.js [mobile]
const { openGame, report } = require('./harness');
const mobile = process.argv.includes('mobile');
(async () => {
  const { browser, page, errors, shot } = await openGame(mobile ? { width: 844, height: 390, mobile: true } : {});
  try {
    const result = await page.evaluate(async () => {
      const problems = [];
      const { G, game } = window.VELSCOUR;
      const { BIOME_BY_ID } = await import('/src/data/biomes.js');
      const { SKILLS, cooldown, useTime, skillRange, grantedSkillsAt } = await import('/src/data/skills.js');
      const { effects } = await import('/src/gfx/vfx.js');
      const { Auto } = await import('/src/game/autoplay.js');
      await game.newChar('dragoon', 'Spearstorm QA');
      document.querySelectorAll('.screen').forEach((x) => x.remove());
      G.ui.modalCount = 0; G.godMode = true;
      game.buildDungeon(3, BIOME_BY_ID.catacombs);
      const p = G.player, w = G.world;
      const single = SKILLS['dragoon.3.0'], triple = SKILLS['dragoon.3.1'];
      if (!single || !triple || cooldown(single) !== 8 || cooldown(triple) !== 14 ||
          useTime(single) !== 0 || useTime(triple) !== 0) problems.push('Spearstorm cooldown or instant-cast data wrong');
      if (!grantedSkillsAt('dragoon', 2).includes(triple.id)) problems.push('Triple Spearfall not granted at level 2');
      G.char.skills[single.id] = G.char.skills[triple.id] = 2;
      G.char.skills['dragoon.1.0'] = 1;
      p.recompute(); p.mana = p.maxMana = 99999; p.st.critChance = 0;
      const foe = w.creatures.find((c) => c.team === 'enemy' && !c.dead);
      if (!foe) problems.push('No enemy found for spear overlap check');
      else {
        foe.x = p.x + 0.5; foe.y = p.y;
        foe.hp = 999999; foe.maxHp = 999999;
        foe.invuln = 0; foe.targetable = true;
        const oldHostiles = w.hostiles;
        // Force the same target to be returned by all three circles: it must
        // still receive just one hit, independent of spatial-grid timing.
        w.hostiles = () => [foe];
        try {
          const before = foe.hp, n0 = effects.length;
          p.castLock = 0; p.cooldowns[triple.id] = 0;
          if (!p.tryUseSkill(triple, p.x, p.y)) problems.push('Triple spear cast failed');
          const dealt = before - foe.hp;
          const max = p.skillDamage(triple, 2)[1];
          if (!(dealt > 0 && dealt <= max * 1.2))
            problems.push('Triple overlap hit wrong (possible double/triple hit): ' + dealt + ' / ' + max);
          if (p.castLock !== 0) problems.push('Instant spear cast applied a cast lock');
          const fx = effects.slice(n0).find((e) => e.constructor.name === 'SpearBarrage');
          if (!fx || fx.spears.length !== (G.touch ? 21 : 33) || fx.life !== 1.65)
            problems.push('Triple spear visual instance missing or wrong mobile particle count');
          if (fx) {
            const cv = document.createElement('canvas'); cv.width = 600; cv.height = 300;
            try { fx.draw(cv.getContext('2d')); fx.update(0.25); fx.draw(cv.getContext('2d')); }
            catch (e) { problems.push('Spear visuals threw during draw: ' + e.message); }
          }
          const n1 = effects.length;
          p.castLock = 0; p.cooldowns[single.id] = 0;
          if (!p.tryUseSkill(single, p.x, p.y)) problems.push('Single spear cast failed');
          const oneFx = effects.slice(n1).find((e) => e.constructor.name === 'SpearBarrage');
          if (!oneFx || oneFx.life !== 1.35 || oneFx.spears.length !== (G.touch ? 7 : 11))
            problems.push('Single spear visual instance missing or wrong count');
          if (skillRange(single) !== 2.5 || skillRange(triple) !== 2.5)
            problems.push('Spearstorm must require point-blank range');
          // Manual long-range aiming must not let either spearstorm hit from afar.
          foe.x = p.x + 8; foe.y = p.y; foe.hp = 999999;
          w.hostiles = (_team, x, y, radius) =>
            Math.hypot(x - foe.x, y - foe.y) <= radius ? [foe] : [];
          for (const sk of [single, triple]) {
            p.castLock = 0; p.cooldowns[sk.id] = 0;
            const start = foe.hp;
            if (!p.tryUseSkill(sk, foe.x, foe.y)) problems.push(sk.name + ' fails to cast with a distant aim');
            if (foe.hp !== start) problems.push(sk.name + ' hit a distant enemy despite point-blank casting');
          }
        } finally { w.hostiles = oldHostiles; }
      }
      // Existing Dragoon jump must stay the primary hotbar skill, while both
      // new high-damage spear AoEs remain available for auto-play.
      p.cooldowns = {}; p.castLock = 0; p.mana = p.maxMana;
      Auto.reset(); Auto.arrangeBar();
      if (!G.char.bar.includes(single.id) || !G.char.bar.includes(triple.id))
        problems.push('Dragoon bot did not equip both granted spear barrages');
      const target = { x: p.x + 2, y: p.y, r: 0.35, rank: 'normal',
        curses: {}, status: {}, hp: 500, maxHp: 500 };
      const oldLos = w.map.los;
      w.map.los = () => true;
      try {
        Auto.dragoonJumps = 0; Auto.dragoonJumpGoal = 3;
        const jump = Auto.chooseSkill([target], target, 2, false);
        if (!jump || !['leap', 'dash'].includes(jump.sk.kind))
          problems.push('Dragoon did not leap before a fresh barrage');
        Auto.dragoonJumps = 3;
        const barrage = Auto.chooseSkill([target], target, 2, false);
        if (!barrage || !barrage.sk.m.barrage)
          problems.push('Dragoon did not choose point-blank barrage after 3 jumps');
        const far = { ...target, x: p.x + 5.5 };
        const jumpBackIn = Auto.chooseSkill([far], far, 5.5, false);
        if (!jumpBackIn || !['leap', 'dash'].includes(jumpBackIn.sk.kind))
          problems.push('Dragoon did not leap to close a 5.5-tile gap with the barrage ready');
      } finally { w.map.los = oldLos; }
      return { problems, level: G.char.level, bar: G.char.bar.filter(Boolean),
        spearEffects: effects.filter((e) => e.constructor.name === 'SpearBarrage').length };
    });
    errors.push(...result.problems);
    console.log('DRAGOON SPEARSTORM QA', JSON.stringify(result));
    await shot('dragoon_spearstorm');
  } catch (e) { errors.push(String(e.stack || e)); }
  report(errors);
  await browser.close();
})();
