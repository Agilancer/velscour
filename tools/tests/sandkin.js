// The Sea of Sand bestiary (data/sandkin.js: 50 small, 70 large, 30 mythic, 50 bosses; cut by tools/sandkin.py):
//  1. every sprite loads (a cell in its atlas) and line-ups of each tier (sand_lineup_*.png)
//  2. every one of the 200 fights a god-mode hero in a desert dungeon, in batches: no errors, blows land both ways
//  3. where they live: desert dungeons' looks and guardians, never outside the deserts; the Sea of Sand natives trade
//     looks with them; every dune variant's packs and pyramid bosses; desert BOSS ROOMs
//   node tools/tests/sandkin.js [noshots]
const { openGame, report } = require('./harness');
const shots = !process.argv.includes('noshots');
(async () => {
  const { browser, page, errors, shot } = await openGame({ width: 1280, height: 720 });
  const ready = await page.evaluate(async () => {
    const { G, game } = window.VELSCOUR;
    await game.newChar('paladin', 'Sandwalker');
    document.querySelectorAll('.screen').forEach((s) => s.remove());
    G.ui.modalCount = 0;
    while (G.char.level < 30) G.player.levelUp();
    G.player.recompute();
    const { BIOME_BY_ID } = await import('/src/data/biomes.js');
    game.buildDungeon(20, BIOME_BY_ID.desert);
    document.querySelectorAll('.screen').forEach((s) => s.remove()); G.ui.modalCount = 0;
    const { loadArtFor, enemyArtReady } = await import('/src/core/enemyart.js');
    const { SAND_KIN } = await import('/src/data/sandkin.js');
    await loadArtFor(SAND_KIN.map((a) => a.id), true);
    G.godMode = true;
    return { n: SAND_KIN.length, missing: SAND_KIN.filter((a) => !enemyArtReady(a.id)).map((a) => a.id) };
  });
  console.log(`art: ${ready.n - ready.missing.length}/${ready.n} loaded${ready.missing.length ? ' MISSING ' + ready.missing.join(',') : ''}`);

  // ---- 1 line-ups
  const groups = [['small', 0, 50, 10, 1.4], ['large_1', 50, 85, 7, 2.2], ['large_2', 85, 120, 7, 2.2], ['mythic', 120, 150, 6, 3.2], ['boss_1', 150, 175, 5, 3.8], ['boss_2', 175, 200, 5, 3.8]];
  for (const [name, a, b, cols, gap] of shots ? groups : []) {
    await page.evaluate(async ([a, b, cols, gap]) => {
      const { G } = window.VELSCOUR;
      const { SAND_KIN } = await import('/src/data/sandkin.js');
      const { makeMonster } = await import('/src/game/monster.js');
      const w = G.world, p = G.player;
      for (const c of w.creatures) if (c !== p) c.dead = true;
      w.update(1 / 30);
      let best = null, bestR = 0;
      for (let i = 0; i < 1500; i++) {
        const x = 2 + Math.random() * (w.map.w - 4), y = 2 + Math.random() * (w.map.h - 4);
        if (!w.map.isFloor(x, y)) continue;
        let r = 1;
        while (r < 12 && [...Array(16)].every((_, k) => w.map.isFloor(x + Math.cos(k / 16 * Math.PI * 2) * r, y + Math.sin(k / 16 * Math.PI * 2) * r))) r++;
        if (r > bestR) { bestR = r; best = [x, y]; }
      }
      if (best) [p.x, p.y] = best;
      G.ui.centerMsg = null; document.querySelectorAll('#levelup, .levelup, .zone-title').forEach((e) => { e.style.display = 'none'; });
      SAND_KIN.slice(a, b).forEach((art, i) => {
        const m = makeMonster(w, art.arch, w.biome, 20, 'normal', 0, 0, 0, { art: art.id, swap: null });
        m.x = p.x + (i % cols - cols / 2) * gap + Math.floor(i / cols) * 0.5; m.y = p.y + Math.floor(i / cols) * gap * 0.9 - 2 - (i % cols - cols / 2) * 0.4;
        m.static = true; m.ai = 'turret'; m.awake = false; m.aggroRange = 0; m.hpShow = 0; m.targetable = false; m.pickTarget = () => null; m.aura = null;
        w.creatures.push(m); m.world = w;
      });
      G.player.alpha = 0;
    }, [a, b, cols, gap]);
    await page.waitForTimeout(1500);
    await shot(`sand_lineup_${name}`);
  }
  await page.evaluate(() => { const { G } = window.VELSCOUR; G.player.alpha = undefined; for (const c of G.world.creatures) if (c !== G.player) c.dead = true; });

  // ---- 2 every one fights, ten at a time
  const fights = [];
  for (let b = 0; b < 200; b += 10) {
    fights.push(await page.evaluate(async (b) => {
      const { G } = window.VELSCOUR;
      const { SAND_KIN } = await import('/src/data/sandkin.js');
      const { makeMonster } = await import('/src/game/monster.js');
      const { hit } = await import('/src/game/combat.js');
      const w = G.world, p = G.player;
      for (const c of w.creatures) if (c !== p) c.dead = true;
      w.hazards.length = 0; w.update(1 / 30);
      const list = SAND_KIN.slice(b, b + 10), ms = [];
      list.forEach((a, i) => {
        const [x, y] = w.map.randomNear(p.x + Math.cos(i) * 3, p.y + Math.sin(i) * 3, 2);
        const m = makeMonster(w, a.arch, w.biome, 20, a.boss ? 'boss' : 'normal', x, y, 0, { art: a.id, swap: null });
        w.add(m); m.awake = true; ms.push(m);
      });
      let taken = 0;
      for (let f = 0; f < 6 * 30; f++) {
        if (f % 10 === 0) for (const m of ms) if (!m.dead) hit(p, m, m.maxHp * 0.02, 'phys', { crit: false });
        const hp = p.hp;
        G.godMode = false; w.update(1 / 30); G.godMode = true;
        taken += Math.max(0, hp - p.hp); p.hp = p.maxHp; p.dead = false;
      }
      const hurt = ms.filter((m) => m.dead || m.hp < m.maxHp).length;
      return { from: list[0].id, hurt, n: ms.length, taken: Math.round(taken), bad: ms.filter((m) => !Number.isFinite(m.hp) || !Number.isFinite(m.x)).map((m) => m.art) };
    }, b));
  }
  let fightBad = 0;
  for (const r of fights) {
    const ok = r.hurt === r.n && r.taken > 0 && !r.bad.length;
    if (!ok) fightBad++;
    console.log(`${ok ? 'ok   ' : 'FAIL '} batch from ${r.from.padEnd(34)} hurt ${r.hurt}/${r.n}, hero took ${r.taken}${r.bad.length ? ' NaN ' + r.bad : ''}`);
  }

  // ---- 3 where they live
  const roll = await page.evaluate(async () => {
    const { G } = window.VELSCOUR;
    const { rollLooks } = await import('/src/data/bestiary.js');
    const { BIOME_BY_ID, BIOMES } = await import('/src/data/biomes.js');
    const { DUNE_VARIANTS, DUNE_ROSTER } = await import('/src/data/dunes.js');
    const { duneLooks } = await import('/src/world/dunes.js');
    const { makeMonster } = await import('/src/game/monster.js');
    const { makeRaidBoss } = await import('/src/game/raid.js');
    const { SAND_CREATURES } = await import('/src/data/seaofsand.js');
    const { isDesert, SAND_KIN } = await import('/src/data/sandkin.js');
    const sk = (id) => id && id.startsWith('sk_');
    const seen = new Set(), out = { desert: [0, 0], myth: 0, guard: [0, 0], outside: 0, natives: [0, 0], dunes: {}, raid: [0, 0], deserts: BIOMES.filter(isDesert).map((b) => b.id) };
    for (const id of out.deserts) for (let i = 0; i < 60; i++) {
      const L = rollLooks(BIOME_BY_ID[id]);
      for (const arch of ['skeleton', 'ghoul', 'hound', 'spider', 'scorpion', 'golem', 'worm', 'cultist', 'gargoyle', 'bat', 'beetle']) {
        const l = L.pick(arch); if (!l) continue;
        out.desert[1]++; if (sk(l.art)) { out.desert[0]++; seen.add(l.art); if (l.art && SAND_KIN.find((a) => a.id === l.art).mythic) out.myth++; }
      }
      const g = L.boss(); if (g) { out.guard[1]++; if (sk(g.look.art)) { out.guard[0]++; seen.add(g.look.art); } }
    }
    for (const b of BIOMES.filter((b) => !isDesert(b)).slice(0, 25)) for (let i = 0; i < 10; i++) {
      const L = rollLooks(b);
      for (const arch of ['skeleton', 'ghoul', 'hound', 'golem', 'worm']) if (sk(L.pick(arch)?.art)) out.outside++;
      if (sk(L.boss()?.look.art)) out.outside++;
    }
    // the Sea of Sand's natives on their own sand, a level at a time
    const sea = BIOME_BY_ID.sea_of_sand;
    for (let lvl = 0; lvl < 20; lvl++) {
      const w = { depth: 20, biome: sea };
      for (const [id] of SAND_CREATURES) { const m = makeMonster(w, id, sea, 20); out.natives[1]++; if (sk(m.art)) { out.natives[0]++; seen.add(m.art); } }
    }
    for (const v of DUNE_VARIANTS) {
      let n = 0, s = 0, bosses = 0;
      for (let i = 0; i < 20; i++) {
        const L = duneLooks(v);
        for (const arch of DUNE_ROSTER) { const l = L.pick(arch); n++; if (sk(l.art)) { s++; seen.add(l.art); } }
        bosses += L.bosses.filter((b) => sk(b[0])).length; L.bosses.forEach((b) => sk(b[0]) && seen.add(b[0]));
      }
      out.dunes[v.id] = [Math.round(s / n * 100), bosses];
    }
    // desert BOSS ROOMs (the hero's world is the desert level)
    const w = G.world, arena = { cx: Math.floor(G.player.x), cy: Math.floor(G.player.y), x: 0, y: 0, w: 10, h: 10 };
    const { RAID_BOSSES } = await import('/src/game/raid.js');
    for (let i = 0; i < 30; i++) { const m = makeRaidBoss(w, arena, 20, 20, { tpl: RAID_BOSSES[i % 10] }); out.raid[1]++; if (sk(m.art)) out.raid[0]++; }
    out.seen = seen.size;
    return out;
  });
  const pct = ([a, b]) => Math.round(a / Math.max(1, b) * 100);
  console.log(`deserts (${roll.deserts.join(', ')}): ${pct(roll.desert)}% of looks (${roll.myth} mythic), ${pct(roll.guard)}% of guardians, ${pct(roll.raid)}% of BOSS ROOMs`);
  console.log(`Sea of Sand natives wearing them: ${pct(roll.natives)}%; outside the deserts: ${roll.outside} looks`);
  console.log('dune variants (% of looks, bosses swapped in 20 runs): ' + Object.entries(roll.dunes).map(([k, [p, b]]) => `${k} ${p}%/${b}`).join(', '));
  console.log(`distinct sprites seen in play: ${roll.seen}/200`);
  const fail = ready.missing.length || fightBad || roll.outside || pct(roll.desert) < 40 || pct(roll.guard) < 40 || pct(roll.natives) < 25 || !roll.myth
    || Object.values(roll.dunes).some(([p, b]) => p < 30 || !b) || pct(roll.raid) < 30;
  if (fail) console.log('FAIL');
  const bad = report(errors);
  await browser.close();
  process.exit(bad || fail ? 1 : 0);
})();
