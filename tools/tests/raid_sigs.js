// The third host of raid bosses (game/raidsigs.js): for each `sigs` boss, cast every ability (god mode), screenshot
// the fight mid-mechanic, then let auto-play fight it for real with an over-levelled hero and report the outcome.
//   node tools/tests/raid_sigs.js [ids,comma] [autoplaySeconds=150] [class=wizard]
const { openGame, report } = require('./harness');
const only = (process.argv[2] || '').split(',').filter(Boolean), secs = +(process.argv[3] || 150), cls = process.argv[4] || 'wizard';
(async () => {
  const { browser, page, errors, shot } = await openGame({ width: 1280, height: 720 });
  await page.evaluate(async (cls) => {
    const { G, game } = window.VELSCOUR;
    await game.newChar(cls, 'Raider');
    document.querySelectorAll('.screen').forEach((s) => s.remove());
    G.ui.modalCount = 0;
    // a depth-25 hero: levels, a full kit of rare gear, auto-play spends the points and dresses it
    const { rollItem } = await import('/src/data/items.js');
    const { Auto } = await import('/src/game/autoplay.js');
    while (G.char.level < 30) G.player.levelUp();
    G.char.bag.fill(null);
    let i = 0;
    for (const slot of ['weapon', 'offhand', 'head', 'body', 'hands', 'legs', 'feet', 'ring', 'ring', 'ring', 'ring']) G.char.bag[i++] = rollItem(28, { slot, rarity: 2 });
    for (let k = 0; k < 4; k++) Auto.manageHero();
    G.player.recompute();
  }, cls);
  const ids = await page.evaluate(async (only) => (await import('/src/game/raid.js')).RAID_BOSSES.filter((b) => only.length ? only.includes(b.id) : b.sigs).map((b) => b.id), only);
  const fails = [];
  for (const id of ids) {
    const r = await page.evaluate(async (id) => {
      const { G, game } = window.VELSCOUR;
      const { BIOME_BY_ID } = await import('/src/data/biomes.js');
      const { RAID_BOSSES } = await import('/src/game/raid.js');
      const { loadArtFor } = await import('/src/core/enemyart.js');
      const T = RAID_BOSSES.find((b) => b.id === id), keep = RAID_BOSSES.slice();
      G.char.lastRaid = null;
      RAID_BOSSES.splice(0, RAID_BOSSES.length, T);
      game.buildDungeon(25, BIOME_BY_ID.cathedral);
      RAID_BOSSES.splice(0, RAID_BOSSES.length, ...keep);
      document.querySelectorAll('.screen').forEach((s) => s.remove()); G.ui.modalCount = 0;
      await loadArtFor([G.world.boss.art]).catch(() => {});
      const w = G.world, p = G.player, b = w.boss, R = w.raid;
      for (const c of w.creatures) if (c.team === 'enemy' && c !== b) c.dead = true;
      G.godMode = true;
      p.x = R.arena.cx - 5; p.y = R.arena.cy; for (let i = 0; i < 10; i++) w.update(1 / 30);
      const pool = [...new Set(R.phases.flatMap((ph) => Object.keys(ph.pool)))], bad = [];
      for (const k of pool) {
        b.state = 'idle'; b.action = null; b.status.stun = null;
        if (!R.cast(k, p)) bad.push(k);
        for (let n = 0; (b.state === 'windup' || b.state === 'act') && n < 240; n++) { w.update(1 / 30); R.gap = 99; }
        for (let n = 0; n < 20; n++) { w.update(1 / 30); R.gap = 99; }
      }
      return { id, art: b.art, name: b.name, pool: pool.length, bad };
    }, id);
    await page.waitForTimeout(250);
    await shot(`raidsig_${id}`);
    // auto-play fights it: a hero a little over the depth, no god mode
    const f = await page.evaluate(async ([id, secs]) => {
      const { G, game } = window.VELSCOUR;
      const { BIOME_BY_ID } = await import('/src/data/biomes.js');
      const { RAID_BOSSES } = await import('/src/game/raid.js');
      const { Auto } = await import('/src/game/autoplay.js');
      const T = RAID_BOSSES.find((b) => b.id === id), keep = RAID_BOSSES.slice();
      G.godMode = false;
      const c = G.char; c.potions.hp = 20; c.potions.rejuv = 8; c.lastRaid = null;
      RAID_BOSSES.splice(0, RAID_BOSSES.length, T);
      game.buildDungeon(25, BIOME_BY_ID.cathedral);
      RAID_BOSSES.splice(0, RAID_BOSSES.length, ...keep);
      document.querySelectorAll('.screen').forEach((s) => s.remove()); G.ui.modalCount = 0;
      const w = G.world, p = G.player, b = w.boss, R = w.raid;
      for (const m of w.creatures) if (m.team === 'enemy' && m !== b) m.dead = true;
      p.recompute(); p.hp = p.maxHp;
      p.x = R.arena.gate.x - 2; p.y = R.arena.gate.y0 + 1.5;
      if (!Auto.on) Auto.toggle(true);
      let t = 0, minHp = 1, dead = false, lastHp = p.hp;
      const hits = {}, statuses = {};
      while (t < secs) {
        for (let i = 0; i < 30; i++) { if (G.mode !== 'game' || G.world !== w) break; G.dt = 1 / 30; G.time += G.dt; G.frame++; game.update(1 / 30); t += 1 / 30; minHp = Math.min(minHp, p.hp / p.maxHp); if (p.dead) dead = true;
          const lost = lastHp - p.hp; lastHp = p.hp; statuses[Auto.status] = (statuses[Auto.status] || 0) + 1 / 30;
          if (lost > 0) { const k = (R.m.action && R.m.action.sig) || (R.m.action && R.m.action.kind) || 'other'; hits[k] = (hits[k] || 0) + lost / p.maxHp; } }
        if (dead || b.dead || G.world !== w) break;
        await new Promise((r) => setTimeout(r, 0));
      }
      Auto.toggle(false);
      game.render();
      const top = (o) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => k + ':' + v.toFixed(1)).join(' ');
      return { hits: top(hits), statuses: top(statuses), secs: Math.round(t), bossHp: +(b.hp / b.maxHp).toFixed(2), phase: R.pi + 1, killed: b.dead, heroDied: dead, minHp: +minHp.toFixed(2), status: Auto.status };
    }, [id, secs]);
    await shot(`raidsig_${id}_auto`);
    console.log(`${r.id.padEnd(10)} ${r.name} art=${r.art} abilities=${r.pool} ${r.bad.length ? 'BAD ' + r.bad.join(',') : 'ok'} | auto: ${f.killed ? 'KILLED' : 'alive ' + f.bossHp} in ${f.secs}s phase ${f.phase} heroDied=${f.heroDied} minHp=${f.minHp}
    lost(maxHp by boss action) ${f.hits}
    auto ${f.statuses}`);
    if (r.bad.length) fails.push(`${id}: ${r.bad.join(',')}`);
    // reset the hero for the next one (the death screen shows 1.7 s after a death)
    await page.waitForTimeout(2200);
    await page.evaluate(async () => { const { G, game } = window.VELSCOUR; if (G.player.dead) { G.player.dead = false; G.player.hp = G.player.maxHp; } document.querySelectorAll('.screen').forEach((s) => s.remove()); G.ui.modalCount = 0; });
  }
  console.log(fails.length ? 'FAIL\n' + fails.join('\n') : 'PASS');
  if (fails.length) process.exitCode = 1;
  report(errors);
  await browser.close();
})();
