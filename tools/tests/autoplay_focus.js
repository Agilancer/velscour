// Focused auto-play regression: point routing, bar coverage, skill rotation, Rage.
// From repo root: python3 -m http.server 8123; node tools/tests/autoplay_focus.js
const { openGame, report } = require('./harness');

(async () => {
  const { browser, page, errors } = await openGame({ width: 844, height: 390 });
  try {
    const result = await page.evaluate(async () => {
      const { G, game } = window.VELSCOUR;
      const { SKILLS, CLASS_SKILLS, rageCost, manaCost, cooldown } = await import('/src/data/skills.js');
      const { Auto } = await import('/src/game/autoplay.js');
      const problems = [], details = {};
      const earthquake = SKILLS['barbarian.2.5'];
      if (!earthquake || rageCost(earthquake) !== 25 || manaCost(earthquake, 1) !== 0 || cooldown(earthquake) !== 5)
        problems.push('Earthquake must cost 25 Rage, zero mana and have a five-second cooldown');

      for (const cls of ['barbarian', 'lancer', 'dragoon']) {
        await game.newChar(cls, 'Autoplay ' + cls);
        document.querySelectorAll('.screen').forEach((x) => x.remove());
        G.ui.modalCount = 0;
        G.char.level = 35; G.char.skillPoints = 45;
        G.player.recompute();
        Auto.spendSkills(); Auto.arrangeBar();
        const learned = CLASS_SKILLS[cls].filter((sk) => G.char.skills[sk.id] > 0);
        const signature = learned.filter((sk) => cls === 'barbarian' ? sk.kind === 'whirl' :
          cls === 'lancer' ? !!sk.m.shields : sk.kind === 'leap');
        const mobility = learned.filter((sk) => ['leap', 'dash', 'blink'].includes(sk.kind));
        const barred = (sk) => G.char.bar.includes(sk.id);
        if (signature.length < (cls === 'lancer' ? 7 : 3) || signature.some((sk) => !barred(sk)))
          problems.push(cls + ' failed to learn/equip its class signature skills');
        if (mobility.length && !mobility.some(barred)) problems.push(cls + ' did not equip mobility');
        if (new Set(G.char.bar.filter(Boolean)).size !== G.char.bar.filter(Boolean).length)
          problems.push(cls + ' has duplicate skills in the bar');
        const main = SKILLS[G.char.bar[0]];
        if (!main || (cls === 'barbarian' && main.name !== 'Whirlwind') ||
          (cls === 'lancer' && !main.m.shields) || (cls === 'dragoon' && main.kind !== 'leap'))
          problems.push(cls + ' has the wrong primary class ability');
        // Mobility must work as an actual combat decision, not merely appear
        // in a skill slot. Each focused melee class should close a five-tile gap.
        Auto.reset();
        const start = G.player;
        const target = { x: start.x + 5, y: start.y, r: 0.35,
          rank: 'normal', curses: {}, status: {} };
        const oldLos = G.world.map.los;
        G.world.map.los = () => true;
        let gapCast;
        try { gapCast = Auto.chooseSkill([target], target, 5, false); }
        finally { G.world.map.los = oldLos; }
        if (!gapCast || !['leap', 'dash', 'blink'].includes(gapCast.sk.kind))
          problems.push(cls + ' did not select a gap-closing skill at five tiles');
        details[cls] = { learned: learned.length, signature: signature.map((sk) => sk.name),
          gapCast: gapCast?.sk.name || null,
          bar: G.char.bar.filter(Boolean).map((id) => SKILLS[id].name) };
      }

      await game.newChar('barbarian', 'Rage test');
      document.querySelectorAll('.screen').forEach((x) => x.remove());
      G.ui.modalCount = 0; G.godMode = true;
      const { BIOME_BY_ID } = await import('/src/data/biomes.js');
      game.buildDungeon(2, BIOME_BY_ID.catacombs);
      const p = G.player;
      p.char.skills[earthquake.id] = 1; p.recompute();
      p.castLock = 0; p.cooldowns[earthquake.id] = 0;
      p.rage = 24; p.char.rage = 24;
      if (p.canUse(earthquake) !== 'rage') problems.push('Earthquake usable below 25 Rage');
      p.rage = 60; p.char.rage = 60;
      const mana = p.mana;
      if (!p.tryUseSkill(earthquake, p.x, p.y)) problems.push('Earthquake fails with 60 Rage');
      else if (p.rage !== 35 || p.char.rage !== 35 || p.mana !== mana)
        problems.push('Earthquake charge deducted incorrectly');

      // Three ready valid attacks should rotate rather than select only the strongest.
      p.castLock = 0; p.rage = 100; p.char.rage = 100;
      p.char.skills['barbarian.0.0'] = 1;
      p.char.skills['barbarian.0.1'] = 1;
      p.char.skills['barbarian.2.0'] = 1;
      p.char.bar = Array(15).fill(null);
      p.char.bar[0] = 'barbarian.0.0';
      p.char.bar[1] = 'barbarian.0.1';
      p.char.bar[2] = 'barbarian.2.0';
      p.recompute(); p.mana = p.maxMana;
      Auto.lastCast = {};
      const foe = { x: p.x + 0.7, y: p.y + 0.2, r: 0.3, rank: 'normal', curses: {}, status: {} };
      const cast = [];
      for (let i = 0; i < 3; i++) {
        const pick = Auto.chooseSkill([foe], foe, Math.hypot(foe.x - p.x, foe.y - p.y), false);
        if (!pick) { problems.push('No ready attack selected for rotation'); break; }
        cast.push(pick.sk.id);
        Auto.lastCast[pick.sk.id] = G.world.time;
        G.world.time += 0.2;
      }
      if (new Set(cast).size < 3) problems.push('Autoplay repeated attacks despite three viable bar skills: ' + cast);
      details.rotation = cast.map((id) => SKILLS[id]?.name);
      return { problems, details };
    });
    errors.push(...result.problems);
    console.log(JSON.stringify(result.details, null, 2));
  } catch (e) {
    errors.push(String(e.stack || e));
  }
  report(errors);
  await browser.close();
})();
