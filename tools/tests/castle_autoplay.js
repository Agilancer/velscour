// Auto-play on the Castle's walls (src/game/autoplay.js offTier): shooters pinned on the wall-walk are fought up there
// (the hero takes the stairs, no hits from the ward below), then a foe pinned in the ward is fought down there (the
// hero takes the stairs back down, never leaps or blinks off the wall). Per class: damage the hero did across the
// height, the biggest one-tick change of level (a stair step is 4), and whether he got there.
// Start server at repo root: python3 -m http.server 8123
// Run: node tools/tests/castle_autoplay.js [classes] (default wizard,dragoon,paladin,ranger,necromancer,lancer)
const { openGame, report } = require('./harness');
const classes = (process.argv[2] || 'wizard,dragoon,paladin,ranger,necromancer,lancer').split(',');
(async () => {
  const { browser, page, errors, shot } = await openGame({ width: 1280, height: 720 });
  for (const cls of classes) {
    const res = await page.evaluate(async (cls) => {
      const { G, game } = window.VELSCOUR;
      const { Auto } = await import('/src/game/autoplay.js');
      const { BIOME_BY_ID } = await import('/src/data/biomes.js');
      const { makeMonster } = await import('/src/game/monster.js');
      const { xpToNext } = await import('/src/game/player.js');
      if (Auto.on) Auto.toggle(false);
      await game.newChar(cls, 'Wall QA');
      document.querySelectorAll('.screen').forEach((s) => s.remove()); G.ui.modalCount = 0; G.ui.closeAll();
      const c = G.char;
      c.level = 30; c.xp = Math.round(xpToNext(30) * 0.3); c.statPoints += 29 * 5; c.skillPoints += 40;
      Auto.spendStats(); Auto.spendSkills(); Auto.arrangeBar(); G.player.recompute();
      await (await import('/src/gfx/castle.js')).loadCastlePack();
      c.depth = 19; G.godMode = true;
      game.buildDungeon(19, BIOME_BY_ID.castle);
      const w = G.world, m = w.map, p = G.player, lv = (e) => m.hgt[m.tileIdx(e.x, e.y)];
      w.creatures = w.creatures.filter((x) => x === p); w.npcs.length = 0; w.rebuildGrid();
      if (w.overworldScenario) w.overworldScenario.completed = true; // nothing to walk off to
      const arches = w.biome.roster.filter((a) => a.ai === 'ranged' || a.ai === 'caster');
      const spawn = (pts) => pts.map(([x, y], k) => {
        const arch = arches[k % arches.length] || w.biome.roster[0];
        const mo = makeMonster(w, arch, w.biome, 19, 'normal', x, y, 0, w.looks?.pick?.(arch));
        mo.awake = true; mo.aggro = p; mo.speed = 0; mo.maxHp = mo.hp = mo.maxHp * 3; w.add(mo); return mo;
      });
      const run = (mobs, secs, purge) => {
        let across = 0, all = 0, jump = 0, at = -1, last = lv(p), top = 0; let big = null;
        p.mana = p.maxMana; // (godmode keeps his life, not his mana)
        const hp = new Map(mobs.map((mo) => [mo, mo.hp])), leaps = [];
        if (!p._wrapped) { const f = p.tryUseSkill.bind(p); p._wrapped = true; p.tryUseSkill = (sk, x, y, tg) => { const ok = f(sk, x, y, tg); if (ok && ["leap", "dash", "blink"].includes(sk.kind)) (window.__leaps ||= []).push([sk.kind, +p.x.toFixed(1), +p.y.toFixed(1), lv(p), +x.toFixed(1), +y.toFixed(1), lv({ x, y }), Auto.target && lv(Auto.target), Auto.status]); return ok; }; }
        window.__leaps = [];
        Auto.toggle(true);
        for (let t = 0; t < secs * 30; t++) {
          if (purge && t % 15 === 0) for (const x of w.creatures) if (x.team === "enemy" && !mobs.includes(x)) x.dead = true; // only the test foe
          G.dt = 1 / 30; G.time += G.dt; G.frame++; game.update(1 / 30);
          const L = lv(p); top = Math.max(top, L); if (Math.abs(L - last) > 10 && !big) big = [t / 30, last, L, Auto.status, p.channel?.constructor?.name, Object.entries(Auto.lastCast).sort((a, b) => b[1] - a[1])[0]?.[0], +p.x.toFixed(1), +p.y.toFixed(1)]; jump = Math.max(jump, Math.abs(L - last)); last = L;
          for (const mo of mobs) {
            const dmg = hp.get(mo) - Math.max(0, mo.hp); hp.set(mo, Math.max(0, mo.hp));
            if (dmg > 0) { all += dmg; if (Math.abs(lv(mo) - L) > m.drop) across += dmg; }
          }
          if (at < 0 && mobs.some((mo) => Math.abs(lv(mo) - L) <= m.drop && Math.hypot(mo.x - p.x, mo.y - p.y) < 10)) at = +(t / 30).toFixed(1);
          if (mobs.every((mo) => mo.dead)) break;
        }
        Auto.toggle(false);
        return { killed: mobs.filter((mo) => mo.dead).length + '/' + mobs.length, across: Math.round(across), all: Math.round(all), jump, reachedAt: at, top, big, leaps: (window.__leaps || []).filter((l) => Math.abs(l[3] - l[6]) > 6) };
      };
      // in the ward by the south-west stairs; shooters on the south wall-walk above
      p.x = 134.5; p.y = 192.5; Auto.reset?.();
      const up = run(spawn([[136.5, 199.5], [130.5, 200.5]]), 120);
      // now down again: a shooter in the ward
      w.creatures = w.creatures.filter((x) => x === p || !x.dead); w.rebuildGrid();
      p.x = 133.5; p.y = 199.5; Auto.path = null; // up on the south wall-walk (level 26)
      // (in sight: a ground tile 7-10 tiles off)
      // (inside the wards: one outside the curtain can't be walked to with the drawbridge up, and is shot from the walls)
      let spot = [124.5, 186.5];
      Auto.buildNav();
      for (let r = 7, done = false; r <= 10 && !done; r++) for (let a = 0; a < 24 && !done; a++) {
        const x = Math.floor(p.x + Math.cos(a * 0.26) * r) + 0.5, y = Math.floor(p.y + Math.sin(a * 0.26) * r) + 0.5;
        if (m.walkable(x, y) && lv({ x, y }) === 0 && !m.rampartDeck[m.tileIdx(x, y)] && m.los(p.x, p.y, x, y) && Auto.navDist(x, y) < 120) { spot = [x, y]; done = true; }
      }
      const down = run(spawn([spot]), 120, true);
      return { up, down, end: lv(p) };
    }, cls);
    console.log(cls, JSON.stringify(res));
    const bad = [];
    for (const k of ['up', 'down']) {
      const r = res[k];
      if (r.reachedAt < 0) bad.push(`${k}: never reached the foes' level`);
      if (r.across > r.all * 0.15) bad.push(`${k}: ${r.across} of ${r.all} damage dealt across the height`);
      if (r.jump > 10) bad.push(`${k}: changed level by ${r.jump} in one tick (leapt or blinked)`);
    }
    if (res.up.top < 20) bad.push('never got up on the wall');
    for (const b of bad) errors.push(cls + ': ' + b);
    await shot(`castle_auto_${cls}`);
  }
  report(errors, 30);
  await browser.close();
})();
