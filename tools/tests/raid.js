// Raid bosses (game/raid.js): every fifth depth ends in a BOSS ROOM. For each depth given (default 5,30,55):
//  1. the arena is reachable from the start and the boss stands in it,
//  2. the hero walks in: the boss wakes and the gate seals,
//  3. every one of the boss's abilities is cast once (god mode) without errors,
//  4. the boss is worn down through every phase; each phase change raises warding crystals (90% less damage) that
//     are then broken, and the next phase starts,
//  5. the boss dies: the gate opens, the exit portal opens, extra loot drops.
// Also checks every RAID_BOSSES template casts its whole pool. Screenshots raid_<depth>_*.png.
//   node tools/tests/raid.js [depths=5,30,55]
const { openGame, report } = require('./harness');
const DEPTHS = (process.argv[2] || '5,30,55').split(',').map(Number);

(async () => {
  const { browser, page, errors, shot } = await openGame({ width: 1280, height: 720 });
  await page.evaluate(async () => {
    const { G, game } = window.VELSCOUR;
    await game.newChar('wizard', 'Raider');
    document.querySelectorAll('.screen').forEach((s) => s.remove());
    G.ui.modalCount = 0;
  });
  const fails = [];
  for (const depth of DEPTHS) {
    const r = await page.evaluate(async (depth) => {
      const { G, game } = window.VELSCOUR;
      const { BIOMES } = await import('/src/data/biomes.js');
      const { dist } = await import('/src/core/util.js');
      const list = BIOMES.filter((b) => b.id !== 'throne' && b.id !== 'town' && !b.overworld); // raids are dungeon rooms
      G.char.level = Math.min(90, depth + 4); G.player.recompute();
      game.buildDungeon(depth, list[depth % list.length]);
      const p = G.player, w = G.world, map = w.map, b = w.boss, R = w.raid;
      const out = { depth, boss: b && b.name, template: R && R.tpl.id, mods: R && R.mods.join(','), phases: R && R.phases.length, hp: b && Math.round(b.maxHp) };
      if (!R) return { ...out, err: 'no raid on this depth' };
      // 1. reachable
      map.flowFrom = [-9, -9]; map.buildFlow(p.x, p.y, 999);
      out.reach = map.flowAt(b.x, b.y);
      G.godMode = true;
      p.update = function () { this.hp = this.maxHp; this.mana = this.maxMana; };
      const step = (n) => { for (let i = 0; i < n; i++) w.update(1 / 30); };
      // 2. walk in at the gate
      for (const c of w.creatures) if (c.team === 'enemy' && c !== b) c.dead = true;
      const g = R.arena.gate;
      p.x = g.x - 3; p.y = g.y0 + 1.5; step(10);
      out.announced = R.announced;
      p.x = g.x + 3; p.y = g.y0 + 1.5; step(10);
      out.awake = b.awake; out.sealed = R.sealed;
      out.gateBlocked = R.gateTiles.every((i) => map.block[i]);
      // 3. every ability in every phase pool
      const pool = new Set(R.phases.flatMap((ph) => Object.keys(ph.pool)));
      out.cast = [];
      for (const k of pool) {
        b.state = 'idle'; b.action = null;
        const ok = R.cast(k, p);
        let n = 0;
        while ((b.state === 'windup' || b.state === 'act') && n < 30 * 8) { w.update(1 / 30); R.gap = 99; n++; }
        if (ok) out.cast.push(k);
        p.x = b.x + 4; p.y = b.y;
      }
      step(60);
      // 4. phases
      out.phaseLog = [];
      for (let k = 0; k < R.marks.length; k++) {
        b.hp = b.maxHp * R.marks[k] - 1;
        step(5);
        const wards = R.wards.filter((c) => !c.dead).length;
        const hp0 = b.hp; b.invuln = 0;
        const { hit } = await import('/src/game/combat.js');
        hit(p, b, 1000, 'fire', { crit: false });
        const taken = hp0 - b.hp;
        if (k === 0) { R.inter && (out.wardShot = true); }
        for (const c of R.wards) if (!c.dead) hit(p, c, c.maxHp * 2, 'fire', { crit: false });
        step(10);
        out.phaseLog.push({ at: R.marks[k], inter: wards, warded: taken < 200, phase: R.pi + 1, label: R.label() });
      }
      if (depth === 5) { b.state = 'idle'; R.cast('cataclysm', p); step(20); }
      out.wardOK = out.phaseLog.every((x) => x.inter >= 3 && x.warded);
      // 5. death
      const exit = w.portals.find((q) => q.type === 'exit');
      const loot0 = w.loot.length;
      const { kill } = await import('/src/game/combat.js');
      kill(b, p, {});
      step(10);
      out.dead = b.dead; out.unsealed = !R.sealed && R.gateTiles.every((i) => !map.block[i]); out.exitOpen = exit.active; out.loot = w.loot.length - loot0;
      out.phase = R.pi + 1;
      return out;
    }, depth);
    console.log(JSON.stringify(r));
    const bad = [];
    if (r.err) bad.push(r.err);
    else {
      if (!(r.reach >= 0)) bad.push('arena unreachable');
      if (!r.announced || !r.awake || !r.sealed || !r.gateBlocked) bad.push('wake/seal');
      if (!r.wardOK) bad.push('wards');
      if (r.phase !== r.phases) bad.push(`ended in phase ${r.phase} of ${r.phases}`);
      if (!r.unsealed || !r.exitOpen || r.loot < 8) bad.push('death: unseal/exit/loot');
    }
    if (bad.length) fails.push(`depth ${depth}: ${bad.join(', ')}`);
  }
  // every boss template: cast its whole pool
  const tpls = await page.evaluate(async () => {
    const { G, game } = window.VELSCOUR;
    const { BIOME_BY_ID } = await import('/src/data/biomes.js');
    const { RAID_BOSSES } = await import('/src/game/raid.js');
    const out = [];
    for (const T of RAID_BOSSES) {
      G.char.lastRaid = null;
      const keep = RAID_BOSSES.slice();
      RAID_BOSSES.splice(0, RAID_BOSSES.length, T); // only this one can be picked
      game.buildDungeon(25, BIOME_BY_ID.catacombs);
      RAID_BOSSES.splice(0, RAID_BOSSES.length, ...keep);
      const w = G.world, p = G.player, b = w.boss, R = w.raid;
      for (const c of w.creatures) if (c.team === 'enemy' && c !== b) c.dead = true;
      G.godMode = true;
      p.update = function () { this.hp = this.maxHp; };
      p.x = R.arena.cx - 5; p.y = R.arena.cy; for (let i = 0; i < 10; i++) w.update(1 / 30);
      const pool = [...new Set(R.phases.flatMap((ph) => Object.keys(ph.pool)))];
      const bad = [];
      for (const k of pool) {
        b.state = 'idle'; b.action = null;
        if (!R.cast(k, p)) bad.push(k);
        for (let n = 0; (b.state === 'windup' || b.state === 'act') && n < 240; n++) { w.update(1 / 30); R.gap = 99; }
        if (b.state !== 'idle') bad.push(k + ':stuck');
        b.x = R.arena.cx + 3; b.y = R.arena.cy; p.x = R.arena.cx - 4; p.y = R.arena.cy;
      }
      for (let i = 0; i < 90; i++) w.update(1 / 30);
      out.push({ id: T.id, art: b.art, n: pool.length, bad });
    }
    return out;
  });
  for (const t of tpls) { console.log(JSON.stringify(t)); if (t.bad.length) fails.push(`${t.id}: ${t.bad.join(',')}`); }

  // screenshots of a fight in progress
  await page.evaluate(async () => {
    const { G, game } = window.VELSCOUR;
    const { BIOME_BY_ID } = await import('/src/data/biomes.js');
    game.buildDungeon(10, BIOME_BY_ID.molten);
    const w = G.world, p = G.player, R = w.raid, g = R.arena.gate;
    for (const c of w.creatures) if (c.team === 'enemy' && c !== w.boss) c.dead = true;
    G.godMode = true;
    p.x = R.arena.cx - 5; p.y = R.arena.cy + 2;
    for (let i = 0; i < 20; i++) w.update(1 / 30);
    R.cast('shockwave', p);
    for (let i = 0; i < 40; i++) w.update(1 / 30);
  });
  await page.waitForTimeout(400);
  await shot('raid_fight');
  await page.evaluate(async () => {
    const { G } = window.VELSCOUR;
    const w = G.world, b = w.boss, R = w.raid;
    b.hp = b.maxHp * R.marks[0] - 1;
    for (let i = 0; i < 40; i++) w.update(1 / 30);
    b.state = 'idle'; R.cast('sweep', G.player);
    for (let i = 0; i < 45; i++) w.update(1 / 30);
  });
  await page.waitForTimeout(400);
  await shot('raid_wards');
  await page.evaluate(async () => {
    const { G } = window.VELSCOUR;
    const w = G.world;
    w.player.x = w.raid.arena.gate.x - 1.5; w.player.y = w.raid.arena.gate.y0 + 1.5;
    for (let i = 0; i < 5; i++) w.update(1 / 30);
  });
  await page.waitForTimeout(300);
  await shot('raid_gate');
  console.log(fails.length ? 'FAIL\n' + fails.join('\n') : 'PASS');
  if (fails.length) process.exitCode = 1;
  report(errors);
  await browser.close();
})();
