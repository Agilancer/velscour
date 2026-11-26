// The Castle Creatures and Bosses (data/castlekin.js, game/castlekin.js, game/castleraids.js):
//  1. line-ups of the 50 creatures and 10 bosses (castle_lineup_*.png)
//  2. every creature fights a god-mode hero for 14 s with allies, gold, potions and loot about, while the hero
//     walks and strikes it: no errors, and its kit must have done something (state set, hazards, hero touched)
//  3. mid-mechanic shots of each (castle_kit_<kit>.png with `shots`)
//  4. a level's random bestiary favours them, and a castle boss turns up as a guardian
//   node tools/tests/castlekin.js [kits,comma] [shots]
// The raid fights: node tools/tests/raid_sigs.js castellan,matron,lastbell,seraph,regent,racksaint,banquet,seneschal,sable_briar,colossus_crown
const { openGame, report } = require('./harness');
const args = process.argv.slice(2), shots = args.includes('shots'), only = (args.find((a) => a !== 'shots') || '').split(',').filter(Boolean);
(async () => {
  const { browser, page, errors, shot } = await openGame({ width: 1280, height: 720 });
  await page.evaluate(async () => {
    const { G, game } = window.VELSCOUR;
    await game.newChar('paladin', 'Castellan');
    document.querySelectorAll('.screen').forEach((s) => s.remove());
    G.ui.modalCount = 0;
    while (G.char.level < 30) G.player.levelUp();
    G.player.recompute();
    const { BIOME_BY_ID } = await import('/src/data/biomes.js');
    game.buildDungeon(20, BIOME_BY_ID.catacombs);
    document.querySelectorAll('.screen').forEach((s) => s.remove()); G.ui.modalCount = 0;
    const { loadArtFor } = await import('/src/core/enemyart.js');
    const { CASTLE_KIN } = await import('/src/data/castlekin.js');
    await loadArtFor(CASTLE_KIN.map((a) => a.id), true);
    G.godMode = true;
  });

  // ---- 1 line-ups
  for (const [name, boss] of [['creatures', false], ['bosses', true]]) {
    await page.evaluate(async (boss) => {
      const { G } = window.VELSCOUR;
      const { CASTLE_KIN } = await import('/src/data/castlekin.js');
      const { makeMonster } = await import('/src/game/monster.js');
      const w = G.world, p = G.player;
      for (const c of w.creatures) if (c !== p) c.dead = true;
      w.update(1 / 30);
      // the widest open floor on the level
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
      const list = CASTLE_KIN.filter((a) => !!a.boss === boss), cols = boss ? 5 : 10;
      list.forEach((a, i) => {
        const m = makeMonster(w, a.arch, w.biome, 20, 'normal', 0, 0, 0, { art: a.id, swap: null }, true);
        m.x = p.x + (i % cols - cols / 2) * (boss ? 2.6 : 1.4) + Math.floor(i / cols) * 0.5; m.y = p.y + Math.floor(i / cols) * (boss ? 3 : 1.5) - 2 - (i % cols - cols / 2) * 0.4;
        m.static = true; m.ai = 'turret'; m.awake = false; m.aggroRange = 0; m.hpShow = 0; m.targetable = false; m.pickTarget = () => null;
        if (boss) m.scale = 1.4;
        w.creatures.push(m); m.world = w;
      });
      G.player.alpha = 0;
    }, boss);
    await page.waitForTimeout(name === 'creatures' ? 5000 : 800);
    await shot(`castle_lineup_${name}`);
  }
  await page.evaluate(() => { const { G } = window.VELSCOUR; G.player.alpha = undefined; for (const c of G.world.creatures) if (c !== G.player) c.dead = true; });

  // ---- 2/3 every creature's mechanic
  const kits = await page.evaluate(async (only) => (await import('/src/data/castlekin.js')).CASTLE_KIN.filter((a) => !a.boss && (!only.length || only.includes(a.kit))).map((a) => a.id), only);
  const quiet = [];
  for (const id of kits) {
    const r = await page.evaluate(async (id) => {
      const { G, game } = window.VELSCOUR;
      const { ART_BY_ID } = await import('/src/data/bestiary.js');
      const { makeMonster } = await import('/src/game/monster.js');
      const { GroundItem } = await import('/src/game/loot.js');
      const { hit } = await import('/src/game/combat.js');
      const w = G.world, p = G.player, a = ART_BY_ID[id];
      for (const c of w.creatures) if (c !== p) c.dead = true;
      w.hazards.length = 0; w.loot.length = 0; w.update(1 / 30);
      // a quiet spot with room round it
      let best = null;
      for (let i = 0; i < 400 && !best; i++) {
        const x = 2 + Math.random() * (w.map.w - 4), y = 2 + Math.random() * (w.map.h - 4);
        let ok = w.map.circleFree(x, y, 0.4);
        for (let k = 0; ok && k < 16; k++) { const an = k / 16 * Math.PI * 2; ok = w.map.isFloor(x + Math.cos(an) * 4, y + Math.sin(an) * 4); }
        if (ok) best = [x, y];
      }
      [p.x, p.y] = best || [p.x, p.y];
      p.hp = p.maxHp; p.status = {}; G.char.gold = 5000; G.char.potions = { hp: 10, mp: 10, rejuv: 2, fury: 1 };
      const m = makeMonster(w, a.arch, w.biome, 20, 'normal', p.x + 3.2, p.y + 0.4, 0, { art: id, swap: null });
      w.add(m);
      const friends = [];
      for (let i = 0; i < 3; i++) { const f = a.kit === 'choir' ? makeMonster(w, a.arch, w.biome, 20, 'normal', p.x + 4 + i * 0.6, p.y - 1.5 + i, 0, { art: id, swap: null }) : makeMonster(w, 'skeleton', w.biome, 20, 'normal', p.x + 4 + i * 0.6, p.y - 1.5 + i, 0); w.add(f); friends.push(f); }
      for (let i = 0; i < 3; i++) w.addLoot(new GroundItem(p.x + 1 + i, p.y + 2.5, 'gold', { amount: 10 }));
      // a corpse to eat, the hero has mana
      w.corpses.push({ x: m.x + 0.8, y: m.y, art: 'ck_grate_rat', artH: 30, t: 0, maxHp: 10, arch: 'hound', level: 20 });
      G.godMode = false; // blows must land for the on-hit kits; the hero is topped up every frame instead
      const live = () => w.creatures.filter((c) => !c.dead && c !== p).length;
      const hp0 = p.hp, gold0 = G.char.gold, pots0 = G.char.potions.hp, haz0 = w.hazards.length, n0 = live();
      let hazMax = 0, statuses = new Set(), dealt = 0, hitMul = 1, scaled = false; // blows scaled so each takes ~3.6% life whatever its armor
      const origHit = p.hp;
      for (let f = 0; f < 14 * 30; f++) {
        const t = f / 30;
        // the hero strolls round and strikes the creature now and then (or a friend)
        p.x += Math.cos(t * 1.3) * 0.02; p.y += Math.sin(t * 1.7) * 0.02;
        p.moving = true;
        if (f % 18 === 0 && !m.dead) { const tgt = f % 54 === 0 && friends[0] && !friends[0].dead ? friends[0] : m; const want = tgt.maxHp * 0.036, got = hit(p, tgt, want * hitMul, 'phys', { crit: false }); dealt += got; if (got > 0 && tgt === m && !scaled) { scaled = true; hitMul = Math.min(8, want / got); } }
        w.update(1 / 30);
        p.hp = p.maxHp; p.dead = false;
        hazMax = Math.max(hazMax, w.hazards.length);
        for (const k in p.status) if (p.status[k] && p.status[k].t > 0) statuses.add(k);
      }
      G.godMode = true;
      const ks = Object.keys(m.ks || {}).filter((k) => m.ks[k] !== undefined && m.ks[k] !== null);
      return { id, kit: a.kit, dead: m.dead, hp: Math.round(m.hp / m.maxHp * 100), ks, hazards: hazMax - haz0, statuses: [...statuses], gold: G.char.gold - gold0,
        pots: G.char.potions.hp - pots0, spawned: live() - n0, mana: Math.round(p.mana / p.maxMana * 100), friendsWarded: friends.filter((f) => f.ward !== undefined || f.guardedBy || f.crowned || f.smithed || f.communed).length };
    }, id);
    const did = r.ks.length > 0 && (r.hazards > 0 || r.statuses.length || r.gold || r.pots || r.spawned > 0 || r.mana < 90 || r.friendsWarded || r.ks.length >= 2);
    console.log(`${did ? 'ok   ' : 'QUIET'} ${r.kit.padEnd(11)} ${r.id.padEnd(26)} state[${r.ks.join(',')}] haz+${r.hazards} hero{${r.statuses.join(',')}} gold${r.gold} pots${r.pots} spawned${r.spawned} allies${r.friendsWarded} mana${r.mana}% ${r.dead ? 'dead' : r.hp + '%'}`);
    if (!did) quiet.push(r.kit);
    if (shots) { await page.waitForTimeout(300); await shot(`castle_kit_${r.kit}`); }
  }

  // ---- 4 the random bestiary favours them; a castle boss guards some depths
  const roll = await page.evaluate(async () => {
    const { rollLooks } = await import('/src/data/bestiary.js');
    const { BIOME_BY_ID } = await import('/src/data/biomes.js');
    let looks = 0, kin = 0, bosses = 0, kinBoss = 0, castle = 0, castleKin = 0;
    for (let i = 0; i < 300; i++) {
      const L = rollLooks(BIOME_BY_ID.catacombs);
      for (const arch of ['skeleton', 'ghoul', 'hound', 'spider', 'wraith', 'golem']) { const l = L.pick(arch); if (l) { looks++; if (l.art.startsWith('ck_')) kin++; } }
      const b = L.boss(); if (b) { bosses++; if (b.look.art.startsWith('ck_')) kinBoss++; }
      const C = rollLooks(BIOME_BY_ID.castle || { id: 'castle' });
      for (const arch of ['skeleton', 'ghoul', 'hound']) { const l = C.pick(arch); if (l) { castle++; if (l.art.startsWith('ck_')) castleKin++; } }
    }
    return { kin: kin / looks, kinBoss: kinBoss / bosses, castle: castleKin / castle };
  });
  console.log(`bestiary: castle creatures are ${(roll.kin * 100).toFixed(0)}% of dungeon looks, ${(roll.castle * 100).toFixed(0)}% in the Castle; ${(roll.kinBoss * 100).toFixed(0)}% of guardians are castle bosses`);
  const bad = report(errors);
  if (quiet.length) console.log('QUIET kits (did nothing visible):', quiet.join(', '));
  if (roll.kin < 0.1 || roll.kinBoss < 0.1) console.log('FAIL: castle creatures too rare');
  await browser.close();
  process.exit(bad || quiet.length || roll.kin < 0.1 ? 1 : 0);
})();
