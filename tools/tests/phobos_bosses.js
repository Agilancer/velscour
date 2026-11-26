// Act III's free-standing boss scripts (game/phobosbosses.js applyBossMechanics) and the wing raids' new WoW signatures
// (game/phobosraids.js): in a cleared BOSS ROOM, every Dungeon Horror boss, castle guardian and a sample of ward lords
// fights ~25 s next to a god-mode hero who walks to each mechanic's autoGoal; every mechanic of its script must fire
// (a forced cast for any the loop didn't reach), stages must advance as its life is cut, and the boss's death must leave
// nothing behind. Then each wing raid and Lord Velscour's battles cast their new sigs and energy casts, a few
// telegraphs are photographed, and auto-play fights four of the bosses for real.
//   node tools/tests/phobos_bosses.js [names,comma|-] [autoSecs=120] [class=wizard] [noshots] [noauto]
const { openGame, report } = require('./harness');
const only = (process.argv[2] && process.argv[2] !== '-' ? process.argv[2] : '').split(',').filter(Boolean);
const secs = +(process.argv[3] || 120), cls = process.argv[4] || 'wizard', noShots = process.argv.includes('noshots'), noAuto = process.argv.includes('noauto');

// a fresh BOSS ROOM with its raid boss taken out: an open, walled floor of 30 x 26 tiles
const ROOM = async () => {
  const { G, game } = window.VELSCOUR;
  const { BIOME_BY_ID } = await import('/src/data/biomes.js');
  game.buildDungeon(25, BIOME_BY_ID.cathedral);
  document.querySelectorAll('.screen').forEach((s) => s.remove()); G.ui.modalCount = 0;
  const w = G.world, b = w.boss, A = w.raid.arena;
  w.remove(b); w.raid = null; w.boss = null; w.onBossKilled = () => {}; w.onBossAwake = null;
  for (const c of w.creatures) if (c.team === 'enemy') c.dead = true;
  w.hazards.length = 0;
  return { w, A };
};

(async () => {
  const { browser, page, errors, shot } = await openGame({ width: 1280, height: 720 });
  await page.evaluate(async (cls) => {
    const { G, game } = window.VELSCOUR;
    await game.newChar(cls, 'Raider');
    document.querySelectorAll('.screen').forEach((s) => s.remove()); G.ui.modalCount = 0;
    const { rollItem } = await import('/src/data/items.js');
    const { Auto } = await import('/src/game/autoplay.js');
    while (G.char.level < 30) G.player.levelUp();
    G.char.bag.fill(null);
    let i = 0;
    for (const slot of ['weapon', 'offhand', 'head', 'body', 'hands', 'legs', 'feet', 'ring', 'ring', 'ring', 'ring']) G.char.bag[i++] = rollItem(28, { slot, rarity: 2 });
    for (let k = 0; k < 4; k++) Auto.manageHero();
    G.player.recompute();
  }, cls);

  // ---- the cast: who fights, at which tier
  const cast = await page.evaluate(async (only) => {
    const P = await import('/src/data/phobos.js');
    const wingLord = new Set(P.WINGS.flatMap((w) => (w.lords || []).filter(Boolean).map((a) => a.id)));
    const L = [];
    for (const a of P.PHOBOS_ART.filter((a) => a.cat === 'horror_boss')) L.push({ id: a.id, name: a.name, tier: wingLord.has(a.id) ? 'lord' : 'ward', kind: 'horror' });
    for (let f = 5; f < 100; f += 10) { const g = P.guardianFor(f); L.push({ id: g.id, name: g.name, tier: 'guardian', kind: 'guardian f' + f }); }
    const wards = P.PHOBOS_ART.filter((a) => a.cat === 'ward_boss');
    for (let i = 0; i < wards.length; i += 4) L.push({ id: wards[i].id, name: wards[i].name, tier: 'ward', kind: 'ward lord' });
    return only.length ? L.filter((b) => only.some((n) => b.name.toLowerCase().includes(n.toLowerCase()))) : L;
  }, only);
  console.log(`${cast.length} bosses`);

  const fails = [];
  for (const B of cast) {
    const r = await page.evaluate(async ([B, ROOMs]) => {
      const ROOM = eval(ROOMs);
      const { G } = window.VELSCOUR;
      const { makeMonster } = await import('/src/game/monster.js');
      const { applyBossMechanics, MECHS } = await import('/src/game/phobosbosses.js');
      const { PHOBOS_BY_ID } = await import('/src/data/phobos.js');
      const { loadArtFor } = await import('/src/core/enemyart.js');
      const { depthLevel } = await import('/src/data/depth.js');
      const { hit } = await import('/src/game/combat.js');
      const { w, A } = await ROOM();
      const art = PHOBOS_BY_ID[B.id], p = G.player;
      await loadArtFor([art.id]).catch(() => {});
      const m = makeMonster(w, art.arch, w.biome, depthLevel(25) + 2, 'boss', A.cx + 3, A.cy, 0, { art: art.id, swap: null });
      m.name = art.name; if (B.tier === 'guardian') { m.maxHp *= 1.5; m.hp = m.maxHp; }
      m.maxHp *= 25; m.hp = m.maxHp;   // the pets must not end the check early (stage marks are fractions, chip is 0.4%)
      applyBossMechanics(m, art, B.tier);   // before it is in a world: it attaches on its first update (the castle's wiring)
      w.add(m); if (B.tier !== 'ward') w.boss = m;
      // two pets, so the pet rules (half soakers, marks, beams) run
      const pets = [];
      for (let i = 0; i < 2; i++) { const c = makeMonster(w, 'skeleton', w.biome, 20, 'normal', A.cx - 6, A.cy + i * 2 - 1); c.team = 'player'; c.summon = true; c.owner = p; c.maxHp *= 50; c.hp = c.maxHp; w.add(c); pets.push(c); }
      G.godMode = true; p.x = A.cx - 3; p.y = A.cy; p.hp = p.maxHp;
      m.awake = true;
      const dt = 1 / 30;
      const step = () => {   // the hero walks to the mechanic's goal (as auto-play would) and chips at the boss
        const S = m.bossScript, g = S && S.on && S.autoGoal();
        if (g) { const d = Math.hypot(g.x - p.x, g.y - p.y); if (d > g.r * 0.5) { const s = Math.min(d, 4.2 * dt), nx = p.x + (g.x - p.x) / d * s, ny = p.y + (g.y - p.y) / d * s; if (w.map.circleFree(nx, ny, 0.3)) { p.x = nx; p.y = ny; } } }
        if ((step.h = (step.h || 0) - dt) <= 0 && m.hp > m.maxHp * 0.06) { step.h = 0.5; hit(p, m, m.maxHp * 0.004, 'phys', { force: true, crit: false }); }
        w.update(dt); G.time += dt;
      };
      let t = 0, maxH = 0;
      const S = () => m.bossScript, C = () => S().C;
      const stages = [];
      while (t < 25) {
        step(); t += dt;
        if (!S().on) continue;
        if (Math.abs(t - 8) < dt / 2 && S().marks[0]) m.hp = Math.min(m.hp, m.maxHp * (S().marks[0] - 0.01));
        if (Math.abs(t - 15) < dt / 2 && S().marks[1]) m.hp = Math.min(m.hp, m.maxHp * (S().marks[1] - 0.01));
        if (C().pi !== stages[stages.length - 1]) stages.push(C().pi);
        maxH = Math.max(maxH, w.hazards.length);
      }
      const plan = S().plan, want = [...plan.loop, plan.big, ...plan.adds.slice(0, S().marks.length)];
      const natural = { ...S().log };
      // anything the loop didn't reach in 25 s is cast now, one at a time, to its end
      const bad = [];
      for (const s of want) {
        if (S().log[s.id]) continue;
        if (!MECHS[s.id]) { bad.push(s.id + ' missing'); continue; }
        if (S().cur) S().endCur();
        if (m.dead) break; m.hp = Math.max(m.hp, m.maxHp * 0.3);
        S().start(s, false);
        const c0 = S().cur; for (let n = 0; c0 && S().cur === c0 && n < 30 * 25; n++) { m.hp = Math.max(m.hp, m.maxHp * 0.3); m.ward = 0.001; step(); t += dt; }
        if (c0 && S().cur === c0 && !m.dead) bad.push(s.id + ' never ended' + JSON.stringify({ inW: w.hazards.includes(S()), dead: m.dead, hp: +(m.hp / m.maxHp).toFixed(2), st: !!C().stunned, t: +(S().cur.t || 0).toFixed(1), pd: p.dead, d: +Math.hypot(p.x - m.x, p.y - m.y).toFixed(1) }));
        m.ward = 1;
      }
      const fired = want.filter((s) => S().log[s.id]).length;
      const burned = C().timers.burn > 0 || m.ward > 1;
      // it dies: its hazards, adds, marks and hooks go with it
      const Cx = C(), Sx = S();
      hit(p, m, m.maxHp * 5, 'phys', { force: true, crit: false });
      for (let n = 0; n < 10; n++) { w.update(dt); G.time += dt; }
      const left = w.hazards.filter((h) => h === Sx || h.C === Cx || (h.R && h.R === Cx.R)).length;
      const minions = Cx.R.minions.filter((c) => !c.dead).length;
      const hooks = (m.vel === Cx.vel ? 1 : 0) + (p.raidTakenMul > 1 ? 1 : 0) + (p.raidDmgMul && p.raidDmgMul < 1 ? 1 : 0);
      for (const c of pets) c.dead = true;
      G.godMode = false;
      return { name: B.name, tier: B.tier, kind: B.kind, plan: want.map((s) => `${s.id}:${s.name}`), fired, want: want.length, natural, stages: stages.join('>'), marks: S().marks.length, bad, left, minions, hooks, maxH, dead: m.dead, burned, fails: Cx.fails };
    }, [B, ROOM.toString()]);
    const okStages = r.stages.split('>').length === r.marks + 1;
    const ok = r.fired === r.want && !r.bad.length && okStages && !r.left && !r.minions && !r.hooks && r.dead;
    console.log(`${ok ? 'ok ' : 'BAD'} ${r.tier.padEnd(8)} ${r.name.padEnd(36)} fired ${r.fired}/${r.want} (loop ran ${Object.entries(r.natural).map(([k, v]) => k + 'x' + v).join(' ')}) stages ${r.stages} fails ${JSON.stringify(r.fails)}${r.bad.length ? ' ' + r.bad.join(',') : ''}${r.left || r.minions || r.hooks ? ` LEFTOVER hazards=${r.left} adds=${r.minions} hooks=${r.hooks}` : ''}`);
    console.log(`      ${r.plan.join(' | ')}`);
    if (!ok) fails.push(r.name);
  }

  // ---- the wing raids and Lord Velscour: every new sig casts, every energy bar fires its big cast
  const raids = await page.evaluate(async (ROOMs) => {
    const ROOM = eval(ROOMs);
    const { G } = window.VELSCOUR;
    const { makeRaidBoss } = await import('/src/game/raid.js');
    const { WING_RAIDS, VELSCOUR_RAIDS } = await import('/src/game/phobosraids.js');
    const { PASSIVES } = await import('/src/game/raidsigs.js');
    const { loadArtFor } = await import('/src/core/enemyart.js');
    const { depthLevel } = await import('/src/data/depth.js');
    const NEW = ['ph_latch_soak', 'ph_latch_hold', 'ph_ballot', 'ph_ingot', 'ph_servers', 'ph_index', 'ph_ink', 'ph_pwave', 'ph_mass', 'ph_rod', 'ph_well', 'ph_lance', 'ph_v_edict', 'ph_v_tithe', 'ph_v_ascend', 'ph_v_unmake'];
    const out = [];
    for (const [key, tpl] of [...Object.entries(WING_RAIDS), ...Object.entries(VELSCOUR_RAIDS).map(([k, v]) => ['velscour_' + k, v])]) {
      const { w, A } = await ROOM();
      await loadArtFor(tpl.art).catch(() => {});
      const b = makeRaidBoss(w, A, 250, depthLevel(25) + 3, { tpl, art: tpl.art[0] }), R = b.raid, p = G.player;
      w.add(b); w.boss = b; w.raid = R;
      G.godMode = true; p.x = A.cx - 5; p.y = A.cy; p.hp = p.maxHp;
      for (let i = 0; i < 10; i++) w.update(1 / 30);
      R.wake();
      const keys = [...new Set(R.phases.flatMap((ph) => Object.keys(ph.pool)))].filter((k) => NEW.includes(k));
      const res = {};
      const run = (n) => { for (let i = 0; i < n; i++) { w.update(1 / 30); G.time += 1 / 30; } };
      for (const k of keys) {
        b.state = 'idle'; b.action = null; b.status.stun = null;
        const started = R.cast(k, p);
        for (let n = 0; (b.state === 'windup' || b.state === 'act') && n < 240; n++) { run(1); R.gap = 99; }
        const C = R.mctx, busy = !!(C && C.busy);
        for (let n = 0; C && C.busy && n < 30 * 25; n++) { run(1); R.gap = 99; }
        res[k] = started && busy ? 'ok' : `failed(start=${started} runner=${busy})`;
      }
      // the energy bar: fill it and its big cast must start
      if (PASSIVES[tpl.passive] && /_e$/.test(tpl.passive)) {
        for (let n = 0; R.mctx && R.mctx.busy && n < 30 * 25; n++) { run(1); R.gap = 99; }
        R.energy = 99.5; R.gap = 99; run(10);
        const C = R.mctx, busy = !!(C && C.busy);
        res['energy:' + tpl.passive] = busy && R.energy < 50 ? 'ok' : `failed(energy=${Math.round(R.energy)} runner=${busy})`;
        for (let n = 0; C && C.busy && n < 30 * 25; n++) { run(1); R.gap = 99; }
      }
      const label = R.label();
      const { hit } = await import('/src/game/combat.js'); hit(p, b, b.maxHp * 50, 'phys', { force: true, crit: false }); run(5);
      out.push({ key, res, label, left: w.hazards.filter((h) => h.C && h.C.raid === R).length });
      G.godMode = false;
    }
    return out;
  }, ROOM.toString());
  for (const r of raids) {
    const bad = Object.entries(r.res).filter(([, v]) => v !== 'ok');
    console.log(`${bad.length || r.left ? 'BAD' : 'ok '} raid ${r.key.padEnd(20)} ${Object.entries(r.res).map(([k, v]) => `${k}=${v}`).join(' ')}${r.left ? ' LEFTOVER ' + r.left : ''}  [${r.label}]`);
    if (bad.length || r.left) fails.push('raid ' + r.key);
  }

  // ---- photographs of the telegraphs, mid-wind-up
  if (!noShots) {
    for (const [nm, id, at] of [['Keeper of the Twelfth Toll', 'soak', 0.6], ['The Sixfold Sentinel', 'combo', 0.45], ['The Spire Warden', 'brk', 0.7], ['Gaoler of the Upside-Down Cistern', 'wave', 0.45],
      ['The Sexton of False Angles', 'beams', 0.4], ['Governor of Bent Keys', 'carry', 0.25], ['The Hollow-Headed Abbot', 'shield', 0.3], ['Bride of the Spore Bell', 'attune', 0.75], ['The Altar Beneath the Meat', 'march', 0.3]]) {
      const ok = await page.evaluate(async ([nm, id, at, ROOMs]) => {
        const ROOM = eval(ROOMs);
        const { G } = window.VELSCOUR;
        const { makeMonster } = await import('/src/game/monster.js');
        const { applyBossMechanics, scriptFor } = await import('/src/game/phobosbosses.js');
        const { PHOBOS_ART } = await import('/src/data/phobos.js');
        const { loadArtFor } = await import('/src/core/enemyart.js');
        const { depthLevel } = await import('/src/data/depth.js');
        const art = PHOBOS_ART.find((a) => a.name === nm); if (!art) return false;
        const { w, A } = await ROOM();
        await loadArtFor([art.id]).catch(() => {});
        const p = G.player, m = makeMonster(w, art.arch, w.biome, depthLevel(25) + 2, 'boss', A.cx + 2, A.cy, 0, { art: art.id, swap: null });
        m.name = art.name; w.add(m); w.boss = m; applyBossMechanics(m, art, 'guardian'); m.awake = true;
        G.godMode = true; p.x = A.cx - 2; p.y = A.cy + 1;
        const S = m.bossScript, plan = scriptFor(art), s = [...plan.loop, plan.big, ...plan.adds].find((q) => q.id === id) || { id, name: id };
        for (let i = 0; i < 5; i++) w.update(1 / 30);
        S.gap = 99; S.start(s, s === plan.big);
        const T = S.cur.castT * at;
        for (let t = 0; t < T && S.cur; t += 1 / 30) { w.update(1 / 30); G.time += 1 / 30; S.gap = 99; }
        G.game.render();
        return !!S.cur;
      }, [nm, id, at, ROOM.toString()]);
      await shot(`phobos_boss_${id}`);
      if (!ok) console.log(`shot ${id}: the mechanic had ended before the shot`);
    }
    await page.evaluate(() => { window.VELSCOUR.G.godMode = false; });
  }

  // ---- auto-play fights four of them, no god mode
  if (!noAuto) {
    for (const [nm, tier] of [['The Bell Without a Clapper', 'guardian'], ['The Rack That Wore a Crown', 'lord'], ['The Keeper of the Twelfth Toll', 'lord'], ['The Kiln Without a Door', 'ward']]) {
      const f = await page.evaluate(async ([nm, tier, secs, ROOMs]) => {
        const ROOM = eval(ROOMs);
        const { G, game } = window.VELSCOUR;
        const { makeMonster } = await import('/src/game/monster.js');
        const { applyBossMechanics } = await import('/src/game/phobosbosses.js');
        const { PHOBOS_ART } = await import('/src/data/phobos.js');
        const { loadArtFor } = await import('/src/core/enemyart.js');
        const { depthLevel } = await import('/src/data/depth.js');
        const { Auto } = await import('/src/game/autoplay.js');
        const art = PHOBOS_ART.find((a) => a.name === nm);
        G.godMode = false;
        const c = G.char; c.potions.hp = 20; c.potions.rejuv = 8;
        const { w, A } = await ROOM();
        await loadArtFor([art.id]).catch(() => {});
        const p = G.player, m = makeMonster(w, art.arch, w.biome, depthLevel(25) + 2, 'boss', A.cx + 3, A.cy, 0, { art: art.id, swap: null });
        m.name = art.name; if (tier === 'guardian') { m.maxHp *= 1.5; m.hp = m.maxHp; }
        w.add(m); w.boss = m; applyBossMechanics(m, art, tier);
        p.recompute(); p.hp = p.maxHp; p.dead = false; p.x = A.cx - 7; p.y = A.cy;
        if (!Auto.on) Auto.toggle(true);
        let t = 0, minHp = 1, dead = false, lastHp = p.hp, deaths = 0;
        const hits = {}, statuses = {};
        while (t < secs) {
          for (let i = 0; i < 30; i++) {
            if (G.mode !== 'game' || G.world !== w) break;
            G.dt = 1 / 30; G.time += G.dt; G.frame++; game.update(1 / 30); t += 1 / 30;
            minHp = Math.min(minHp, p.hp / p.maxHp); if (p.dead && !dead) { dead = true; deaths++; }
            const lost = lastHp - p.hp; lastHp = p.hp; statuses[Auto.status] = (statuses[Auto.status] || 0) + 1 / 30;
            const S = m.bossScript;
            if (lost > 0) { const k = S && S.cur ? S.cur.id : 'melee/other'; hits[k] = (hits[k] || 0) + lost / p.maxHp; }
          }
          if (dead || m.dead || G.world !== w) break;
          await new Promise((r) => setTimeout(r, 0));
        }
        Auto.toggle(false);
        game.render();
        const top = (o, n = 6) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => k + ':' + v.toFixed(2)).join(' ');
        const S = m.bossScript;
        return { nm, tier, secs: Math.round(t), killed: m.dead, bossHp: +(m.hp / m.maxHp).toFixed(2), stage: (S.C.stage || 0) + 1, deaths, minHp: +minHp.toFixed(2), hits: top(hits), statuses: top(statuses, 5), ran: Object.entries(S.log).map(([k, v]) => k + 'x' + v).join(' '), fails: JSON.stringify(S.C.fails) };
      }, [nm, tier, secs, ROOM.toString()]);
      await shot(`phobos_boss_auto_${tier}`);
      console.log(`auto ${f.tier.padEnd(8)} ${f.nm.padEnd(32)} ${f.killed ? 'KILLED' : 'alive ' + f.bossHp} in ${f.secs}s stage ${f.stage} deaths=${f.deaths} minHp=${f.minHp} fails=${f.fails}
      mechanics ${f.ran}
      life lost by mechanic ${f.hits}
      auto ${f.statuses}`);
      await page.waitForTimeout(2200);
      await page.evaluate(() => { const { G } = window.VELSCOUR; if (G.player.dead) { G.player.dead = false; G.player.hp = G.player.maxHp; } document.querySelectorAll('.screen').forEach((s) => s.remove()); G.ui.modalCount = 0; });
    }
  }
  console.log(fails.length ? 'FAIL\n' + fails.join('\n') : 'PASS');
  if (fails.length) process.exitCode = 1;
  report(errors);
  await browser.close();
})();
