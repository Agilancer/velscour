// Pet art from the familiar sheets (assets/source/enemies/familiars/): a line-up of every summon that draws one
// (familiars_lineup.png, 3 of each so the random picks show), a field of 40 Slime Lord slimelings (court slimes,
// game/slimecourt.js) rising out of their puddles and hopping after the hero (familiars_slimes.png), then a Slime Lord casting every slime summon into a
// crowd (familiars_battle.png). Checks: every pet look drew painted art, the slimelings are many different Glymmora
// slime sets of every colour, the wolves sit when idle, and no errors.
//   node tools/tests/familiars.js
const { openGame, report } = require('./harness');

(async () => {
  const { browser, page, errors, shot } = await openGame({ width: 1400, height: 800 });
  // town has open ground for the line-up; the battle is at depth 11 (10 is a raid boss room)
  const out = await page.evaluate(async () => {
    const { G, game } = window.VELSCOUR;
    await game.newChar('slime_lord', 'Gloop');
    document.querySelectorAll('.screen').forEach((s) => s.remove());
    G.ui.modalCount = 0;
    const { loadPetArt } = await import('/src/core/enemyart.js');
    const { SUMMONS } = await import('/src/data/summons.js');
    const { buildSummon } = await import('/src/game/monster.js');
    const { camera } = await import('/src/core/view.js');
    await loadPetArt();
    G.paused = false; G.settings.zoom = 1.6; G.settings.gore = 0;
    G.char.level = 30; G.player.recompute();
    camera.computeZoom(); // the line-up and the slime field are in town: open ground
    document.getElementById('center-msg').style.display = 'none';
    G.godMode = true;
    const p = G.player, w = G.world, out = [];
    for (const c of w.creatures) if (!c.isPlayer) c.dead = true;
    const keys = Object.keys(SUMMONS).filter((k) => SUMMONS[k].look && Array.isArray(SUMMONS[k].look.art));
    const lineup = [];
    keys.forEach((k, i) => {
      for (let j = 0; j < 3; j++) {
        const r = Math.floor(i / 9), c = i % 9;
        const m = buildSummon(p, SUMMONS[k], k, p.x - 4 + c * 1 + r * 1.1 + j * 0.3, p.y + 2.5 - c * 1 + r * 1.1 + j * 0.3, 1, 100, 0);
        m.static = true; m.spawnT = 1; m.flip = false;
        lineup.push(w.add(m) || m);
      }
    });
    for (const n of w.npcs) n.x += 40;
    G.paused = true;
    game.render();
    const noArt = lineup.filter((m) => !m.spriteImage()._art).map((m) => m.summonKey);
    out.push((noArt.length ? 'FAIL no art: ' + [...new Set(noArt)].join(' ') : '  ok ') + ` ${keys.length} pet summons drew painted art: ${keys.join(' ')}`);
    window.famTest = { lineup, keys, out };
    return out;
  });
  await page.waitForTimeout(200);
  await shot('familiars_lineup');

  // 40 slimelings: the rainbow brood, each a random sprite set of its kind, rising from puddles, then hopping after the hero
  const out2 = await page.evaluate(async () => {
    const { G, game } = window.VELSCOUR;
    const { SUMMONS } = await import('/src/data/summons.js');
    const { courtSummon } = await import('/src/game/slimecourt.js');
    const { lineup, out } = window.famTest;
    const p = G.player, w = G.world;
    for (const m of lineup) m.dead = true;
    w.creatures = w.creatures.filter((c) => !c.dead);
    const slimes = [];
    for (let i = 0; i < 40; i++) {
      const [x, y] = w.map.randomNear(p.x, p.y, 4);
      const m = courtSummon(p, 'slimeling', x, y, 1, 100, 0);
      w.add(m); slimes.push(m);
    }
    const ids = new Set(slimes.map((m) => m.slime && m.slime.set)), hues = new Set(slimes.map((m) => m.slime && m.slime.K.hue));
    out.push((ids.size >= 25 && hues.size === 6 ? '  ok ' : 'FAIL ') + `40 slimelings wear ${ids.size} different slime sets in ${hues.size} colours`);
    G.paused = false;
    for (let i = 0; i < 4; i++) w.update(1 / 30);
    G.paused = true; game.render();
    window.famTest.slimes = slimes;
    return out;
  });
  await page.waitForTimeout(150);
  await shot('familiars_rising');
  await page.evaluate(async () => {
    const { G, game } = window.VELSCOUR;
    const p = G.player, w = G.world;
    G.paused = false;
    p.x += 4; p.y += 4; // run off: they hop after the hero
    for (let i = 0; i < 25; i++) w.update(1 / 30);
    G.paused = true; game.render();
  });
  await page.waitForTimeout(150);
  await shot('familiars_slimes');

  // a Slime Lord casts every slime summon into a crowd; wolves sit when idle
  const out3 = await page.evaluate(async () => {
    const { G, game } = window.VELSCOUR;
    const { CLASS_SKILLS } = await import('/src/data/skills.js');
    const { SUMMONS } = await import('/src/data/summons.js');
    const { makeMonster, buildSummon } = await import('/src/game/monster.js');
    const { BIOME_BY_ID } = await import('/src/data/biomes.js');
    const { out } = window.famTest;
    game.buildDungeon(11, BIOME_BY_ID.catacombs);
    const p = G.player, w = G.world;
    for (const c of w.creatures) if (!c.isPlayer) c.dead = true;
    const step = (n) => { for (let i = 0; i < n; i++) { w.update(1 / 30); if (i % 10 === 0) game.render(); } };
    G.paused = false;
    const roster = w.biome.roster;
    for (let k = 0; k < 14; k++) {
      const [x, y] = w.map.randomNear(p.x + 3, p.y + 3, 3);
      const m = makeMonster(w, roster[k % roster.length], w.biome, 6, 'normal', x, y);
      m.maxHp = m.hp = m.maxHp * 6; m.awake = true;
      w.add(m);
    }
    const sks = CLASS_SKILLS.slime_lord.filter((s) => s.kind === 'summon');
    let fails = 0;
    for (const sk of sks) {
      G.char.skills[sk.id] = 5;
      p.mana = p.maxMana = 99999; p.cooldowns = {}; p.castLock = 0;
      w.rebuildGrid();
      if (p.tryUseSkill(sk, p.x + 1, p.y + 1) === false) { out.push('FAIL cast ' + sk.name); fails++; }
      step(8);
    }
    step(90);
    const mine = w.creatures.filter((c) => c.summon && !c.dead);
    out.push(`${fails ? 'FAIL' : '  ok '} cast ${sks.length} slime summons; alive: ` + Object.entries(mine.reduce((a, c) => ((a[c.summonKey] = (a[c.summonKey] || 0) + 1), a), {})).map((e) => e.join('x')).join(' '));
    out.push(`  .. ${new Set(mine.map((c) => (c.slime && c.slime.set) || c.art)).size} different looks among ${mine.length} minions`);
    // idle wolves sit
    const wolf = buildSummon(p, SUMMONS.spiritwolf, 'spiritwolf', p.x - 2, p.y - 2, 1, 100, 0);
    wolf.art = 'wf5'; wolf.idleArt = 'wf6'; wolf.static = true;
    w.add(wolf);
    for (let i = 0; i < 40; i++) wolf.update(1 / 30);
    const sat = wolf.spriteImage() && wolf._imgSprite === 'wf6';
    out.push((sat ? '  ok ' : 'FAIL ') + 'an idle spirit wolf sits down');
    w.loot.length = 0;
    G.paused = true; game.render();
    return out;
  });
  await page.waitForTimeout(200);
  await shot('familiars_battle');
  console.log(out3.join('\n'));
  if (out3.some((l) => l.startsWith('FAIL'))) process.exitCode = 1;
  report(errors);
  await browser.close();
})();
