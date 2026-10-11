// Casts every skill of every class (or the classes given as a comma list) in a live dungeon
// and reports exceptions and no-op casts. 16 classes x 60 skills takes several minutes; split
// the class list across parallel runs to go faster.
//   node tools/tests/skills.js                 # all 16 classes
//   node tools/tests/skills.js wizard,gunner   # just these
const { openGame, report, ALL_CLASSES } = require('./harness');
const CLASSES = process.argv[2] ? process.argv[2].split(',') : ALL_CLASSES;

(async () => {
  const { browser, page, errors, shot } = await openGame();
  for (const cls of CLASSES) {
    const res = await page.evaluate(async (cls) => {
      const { G, game } = window.VELSCOUR;
      const out = [];
      game.newChar(cls, 'T');
      document.querySelectorAll('.screen').forEach((s) => s.remove());
      G.ui.modalCount = 0;
      const biomes = ['catacombs', 'frozen', 'molten', 'fungal', 'void', 'crystal', 'flesh', 'storm'];
      const { BIOME_BY_ID } = await import('/src/data/biomes.js');
      const { CLASS_SKILLS } = await import('/src/data/skills.js');
      const { makeMonster } = await import('/src/game/monster.js');
      game.buildDungeon(8, BIOME_BY_ID[biomes[Math.floor(Math.random() * biomes.length)]]);
      const p = G.player;
      G.godMode = true;
      const step = (n) => { for (let i = 0; i < n; i++) { G.world.update(1 / 30); if (i % 6 === 0) game.render(); } };
      for (const sk of CLASS_SKILLS[cls]) {
        try {
          G.char.skills[sk.id] = 5;
          p.mana = p.maxMana = 9999; p.castLock = 0; p.channel = null; p.cooldowns = {};
          // The spatial grid is only rebuilt inside world.update(), so rebuild before querying.
          G.world.rebuildGrid();
          let t = G.world.nearestHostile('player', p.x, p.y, 60, false);
          if (!t || G.world.creatures.filter((c) => c.team === 'enemy' && !c.dead).length < 6) {
            const roster = G.world.biome.roster;
            for (let k = 0; k < 10; k++) {
              const [x, y] = G.world.map.randomNear(p.x, p.y, 4);
              G.world.add(makeMonster(G.world, roster[k % roster.length], G.world.biome, 8, k === 0 ? 'champion' : 'normal', x, y));
            }
            G.world.rebuildGrid();
            t = G.world.nearestHostile('player', p.x, p.y, 60, false);
            if (!t) { out.push('no target even after respawn'); break; }
          }
          // Stand next to the target so melee and short-range skills connect.
          const [x, y] = G.world.map.randomNear(t.x, t.y, 2);
          p.x = x; p.y = y; p.channel = null;
          // Corpse skills need a corpse to work with.
          if (sk.kind === 'corpse' || sk.m.sum === 'revive') G.world.corpses.push({ x: t.x + 0.5, y: t.y, sprite: 'zombie', pal: {}, px: 2.3, scale: 1, t: 0, maxHp: 50, arch: 'zombie', level: 8 });
          const ok = p.tryUseSkill(sk, t.x, t.y, t);
          step(45);
          if (ok === false && sk.kind !== 'melee') out.push(`noop ${sk.id} ${sk.name} (${sk.kind})`);
        } catch (e) {
          out.push(`ERR ${sk.id} ${sk.name} [${sk.kind}/${sk.fx}]: ${e.message} ${(e.stack || '').split('\n')[1]}`);
        }
      }
      out.push(`tested=${CLASS_SKILLS[cls].length} creatures=${G.world.creatures.length} hazards=${G.world.hazards.length} kills=${G.world.kills} lvl=${G.char.level} loot=${G.world.loot.length}`);
      return out;
    }, cls);
    console.log(`== ${cls}\n  ` + res.join('\n  '));
    if (res.some((l) => l.startsWith('ERR') || l.startsWith('noop'))) process.exitCode = 1;
    await shot(`skills_${cls}`);
  }
  report(errors);
  await browser.close();
})();
