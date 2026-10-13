// Rings and skill mastery: equips rings carrying each augment, casts skills into a pack of monsters and checks the
// augments fire without errors; screenshots Wheel of Hammers with Storm Tether + Immolation at mastery 1 and 1000,
// the inventory with four rings, a ring tooltip, the Gem Forge, and the skill book's mastery bars.
// node tools/tests/rings.js
const { openGame, report } = require('./harness');
(async () => {
  const { browser, page, errors, shot } = await openGame();
  await page.click('text=Heroes'); await page.click('.class-card[data-id="paladin"]'); await page.click('text=Begin');
  await page.waitForTimeout(1200);
  // a level-30 paladin with the hammer skills, in a depth-12 dungeon
  await page.evaluate(async () => {
    const { G, game } = window.VELSCOUR;
    const c = G.char;
    c.level = 30;
    for (const id of ['paladin.0.0', 'paladin.0.1', 'paladin.0.3', 'paladin.0.4', 'paladin.0.8', 'paladin.0.12', 'paladin.0.9', 'paladin.0.13']) c.skills[id] = 10;
    c.bar = Array(15).fill(null); c.bar[0] = 'paladin.0.4'; c.bar[1] = 'paladin.0.12'; c.bar[2] = 'paladin.0.1'; c.bar[3] = 'paladin.0.3'; c.bar[4] = 'paladin.0.9'; c.bar[5] = 'paladin.0.13';
    G.godMode = true;
    const { BIOME_BY_ID } = await import('/src/data/biomes.js');
    game.buildDungeon(12, BIOME_BY_ID.catacombs);
    G.player.recompute(); G.player.hp = G.player.maxHp; G.player.mana = G.player.maxMana = 1e6;
  });
  const AUGS = await page.evaluate(async () => Object.keys((await import('/src/data/rings.js')).AUGMENTS));
  const res = {};
  for (const id of AUGS) {
    res[id] = await page.evaluate(async (id) => {
      const { G } = window.VELSCOUR;
      const { rollItem } = await import('/src/data/items.js');
      const { makeMonster } = await import('/src/game/monster.js');
      const c = G.char, p = G.player, w = G.world;
      const ring = rollItem(20, { slot: 'ring', rarity: 3 });
      ring.aug = [{ id, all: true, pow: 2 }];
      c.equip.ring1 = ring; p.recompute(); p.mana = p.maxMana;
      // a fresh pack around the hero
      for (const m of w.creatures) if (m.team === 'enemy') m.dead = true;
      let n = 0;
      for (let i = 0; i < 10; i++) { const [x, y] = w.map.randomNear(p.x + 2, p.y + 1, 2.5); const m = makeMonster(w, 'skeleton', w.biome, 12, 'normal', x, y); m.maxHp = m.hp = 1e7; m.awake = true; w.add(m); n++; }
      const hpBefore = w.creatures.filter((m) => m.team === 'enemy' && !m.dead).reduce((a, m) => a + m.hp, 0);
      const SK = (await import('/src/data/skills.js')).SKILLS;
      const sim = (t) => { for (let k = 0; k < t * 60; k++) { p.castLock = 0; for (const s in p.cooldowns) p.cooldowns[s] = 0; w.update(1 / 60); } };
      for (let r = 0; r < 4; r++) for (const sid of ['paladin.0.4', 'paladin.0.12', 'paladin.0.1', 'paladin.0.3', 'paladin.0.0', 'paladin.0.9']) {
        const t = w.creatures.find((m) => m.team === 'enemy' && !m.dead) || { x: p.x + 2, y: p.y };
        p.mana = p.maxMana; p.castLock = 0; p.cooldowns = {};
        p.tryUseSkill(SK[sid], t.x, t.y, t); sim(0.25);
      }
      sim(1.5);
      const hpAfter = w.creatures.filter((m) => m.team === 'enemy' && !m.dead).reduce((a, m) => a + m.hp, 0);
      const st = w.creatures.filter((m) => m.team === 'enemy').map((m) => Object.keys(m.status).filter((k) => m.status[k] && m.status[k].t > 0)).flat();
      return { dmg: Math.round(hpBefore - hpAfter), status: [...new Set(st)].join(','), hazards: w.hazards.length };
    }, id);
    console.log(id.padEnd(9), JSON.stringify(res[id]));
    if (!(res[id].dmg > 0)) errors.push(`augment ${id}: no damage dealt`);
  }
  // mastery: gain, levels, damage multiplier
  const ms = await page.evaluate(async () => {
    const { G } = window.VELSCOUR;
    const { SKILLS } = await import('/src/data/skills.js');
    const p = G.player, sk = SKILLS['paladin.0.12'];
    const d1 = p.skillDamage(sk, 10)[1];
    p.gainMastery(sk.id, 5e6);
    const m = G.char.mastery[sk.id];
    const d2 = p.skillDamage(sk, 10)[1];
    return { level: m[0], d1, d2 };
  });
  console.log('mastery', JSON.stringify(ms));
  if (!(ms.level > 50 && ms.d2 > ms.d1)) errors.push('mastery did not level or scale damage');
  // pictures: Wheel of Hammers + Storm Tether + Immolation, at mastery 1 and 1000
  for (const M of [1, 1000]) {
    await page.evaluate(async (M) => {
      const { G } = window.VELSCOUR;
      const { SKILLS } = await import('/src/data/skills.js');
      const { rollItem } = await import('/src/data/items.js');
      const c = G.char, p = G.player, w = G.world;
      c.mastery['paladin.0.12'] = [M, 0];
      const ring = rollItem(20, { slot: 'ring', rarity: 4 });
      ring.aug = [{ id: 'tether', sk: 'paladin.0.12', pow: 1.6 }, { id: 'ignite', sk: 'paladin.0.12', pow: 1.6 }];
      c.equip.ring1 = ring; p.recompute();
      w.hazards.length = 0;
      p.cooldowns = {}; p.castLock = 0; p.mana = p.maxMana;
      p.tryUseSkill(SKILLS['paladin.0.12'], p.x + 1, p.y);
      const v = await import('/src/core/view.js'); v.camera.zoom = 1.4;
    }, M);
    await page.waitForTimeout(900);
    await shot(`rings_wheel_m${M}`);
  }
  // UI: inventory with four rings, a ring tooltip, the Gem Forge, the skill book
  await page.evaluate(async () => {
    const { G, game } = window.VELSCOUR;
    const { rollItem, makeGem } = await import('/src/data/items.js');
    const c = G.char;
    for (const s of ['ring1', 'ring2', 'ring3', 'ring4']) c.equip[s] = rollItem(25, { slot: 'ring', rarity: 2 + ['ring1', 'ring2', 'ring3', 'ring4'].indexOf(s) });
    c.bag[0] = rollItem(25, { slot: 'ring', rarity: 5 });
    c.bag[1] = makeGem('ruby', 2); c.bag[1].count = 7; c.bag[2] = makeGem('prism', 5); c.bag[2].count = 3; c.gold = 1e7;
    G.player.recompute();
    game.enterTown();
  });
  await page.waitForTimeout(800);
  await page.keyboard.press('i'); await page.waitForTimeout(500);
  await page.hover('.bag .bslot >> nth=0'); await page.waitForTimeout(400);
  await shot('rings_inventory');
  await page.evaluate(async () => { (await import('/src/ui/vendor.js')).Vendor.open('gems'); });
  await page.waitForTimeout(500); await shot('rings_gemforge');
  await page.click('text=Fuse all'); await page.waitForTimeout(300);
  const gems = await page.evaluate(() => window.VELSCOUR.G.char.bag.filter((b) => b && b.type === 'gem').map((b) => `${b.gem}:${b.tier}x${b.count || 1}`).join(' '));
  console.log('after fuse all:', gems);
  if (!/ruby:3/.test(gems)) errors.push('Fuse all did not fuse rubies');
  await page.evaluate(async () => { (await import('/src/ui/vendor.js')).Vendor.open('socket'); });
  await page.waitForTimeout(500); await shot('rings_jeweler');
  await page.keyboard.press('Escape'); await page.keyboard.press('Escape');
  await page.keyboard.press('b'); await page.waitForTimeout(500); await shot('rings_book');
  report(errors);
  await browser.close();
})();
