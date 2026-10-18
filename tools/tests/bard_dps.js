// Bard damage on training dummies: a level-40 Bard (every skill at rank 10, the everyday Bard skills on the bar)
// auto-plays against a ring of immortal, harmless dummies in an open Wilds map; prints damage per second overall and
// Cadences per minute, averaged over a few runs. For balancing the composing measure.
//   node tools/tests/bard_dps.js [seconds per run, default 60] [runs, default 3]
const { openGame } = require('./harness');
const secs = +(process.argv[2] || 60), runs = +(process.argv[3] || 3);
const BAR = ['bard.0.0', 'bard.1.0', 'bard.2.0', 'bard.2.1', 'bard.1.11', 'bard.1.1', 'bard.1.2', 'bard.1.6', 'bard.3.3', 'bard.0.1', 'bard.2.15', 'bard.3.1', 'bard.1.13', 'bard.0.11', 'bard.2.7'];

(async () => {
  const { browser, page } = await openGame();
  const out = [];
  for (let r = 0; r < runs; r++) {
    out.push(await page.evaluate(async ({ secs, BAR }) => {
      const { G, game } = window.VELSCOUR;
      await game.newChar('bard', 'Dummy' + Math.random());
      document.querySelectorAll('.screen').forEach((s) => s.remove()); G.ui.modalCount = 0;
      const { CLASS_SKILLS } = await import('/src/data/skills.js');
      const { BIOME_BY_ID } = await import('/src/data/biomes.js');
      const { makeMonster } = await import('/src/game/monster.js');
      G.godMode = true; G.char.level = 40;
      for (const sk of CLASS_SKILLS.bard) G.char.skills[sk.id] = 10;
      G.char.bar = BAR.slice(); G.char.sp = 0;
      game.buildDungeon(6, BIOME_BY_ID.overworld);
      await new Promise((res) => setTimeout(res, 400));
      const w = G.world, p = G.player;
      w.creatures = w.creatures.filter((c) => c.team !== 'enemy');
      let spot = null;
      for (let t = 0; t < 6000 && !spot; t++) {
        const x = 6 + Math.random() * (w.map.w - 12), y = 6 + Math.random() * (w.map.h - 12);
        let ok = true;
        for (let dx = -5; dx <= 5 && ok; dx++) for (let dy = -5; dy <= 5 && ok; dy++) ok = w.map.walkable(x + dx, y + dy);
        if (ok) spot = [x, y];
      }
      p.x = spot[0]; p.y = spot[1]; p.recompute(); p.mana = p.maxMana;
      const dummies = [];
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2, m = makeMonster(w, 'skeleton', w.biome, 30, 'normal', p.x + Math.cos(a) * 3.5, p.y + Math.sin(a) * 3.5);
        m.maxHp = m.hp = 1e12; m.awake = true; m.speed = 0; m.dmg = [0, 0]; w.add(m); dummies.push(m);
      }
      const { Auto } = await import('/src/game/autoplay.js');
      Auto.toggle(true);
      const sc0 = p.score ? p.score.cadences : 0;
      let sim = 0;
      const hp0 = dummies.map((d) => d.hp);
      while (sim < secs) {
        for (let i = 0; i < 15 && sim < secs; i++) {
          G.dt = 1 / 30; G.time += G.dt; G.frame++;
          game.update(1 / 30); sim += 1 / 30;
          for (const d of dummies) { d.x = d.x0 ?? (d.x0 = d.x); d.y = d.y0 ?? (d.y0 = d.y); d.dead = false; }   // pinned in place
        }
        await new Promise((res) => setTimeout(res, 0));
      }
      Auto.toggle(false);
      const dmg = dummies.reduce((s, d, i) => s + (hp0[i] - d.hp), 0);
      return { dps: Math.round(dmg / secs), cadences: (p.score ? p.score.cadences : 0) - sc0, discords: p.score ? p.score.discords : 0 };
    }, { secs, BAR }));
  }
  const avg = (k) => Math.round(out.reduce((s, o) => s + o[k], 0) / out.length);
  console.log('runs', JSON.stringify(out));
  console.log(`BARD DPS ${avg('dps')} · cadences/min ${(avg('cadences') * 60 / secs).toFixed(1)}`);
  await browser.close();
})();
