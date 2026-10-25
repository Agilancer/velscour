// A player's requests (October 2026): item locks, the buy-then-sell fix, the freshness rule, auto-play with its hands
// off the gear never waiting in town, auto attribute points off, attribute respec, +5 / max skill points, the Golden
// Scarab's gold and the gold curve. No screenshots.
//   node tools/tests/locks.js
const { openGame, report } = require('./harness');
(async () => {
  const { browser, page, errors } = await openGame();
  const r = await page.evaluate(async () => {
    const { G, game } = window.VELSCOUR;
    await game.newChar('paladin', 'Locksmith');
    const { Vendor } = await import('/src/ui/vendor.js');
    const { Auto } = await import('/src/game/autoplay.js');
    const { rollItem, goldPile, goldScale } = await import('/src/data/items.js');
    const { attrRespec } = await import('/src/ui/inventory.js');
    const { dropFromBag } = await import('/src/ui/inventory.js');
    const { learn } = await import('/src/ui/skills.js');
    const { CLASS_SKILLS } = await import('/src/data/skills.js');
    const { catchCritter, CRITTERS } = await import('/src/game/critters.js');
    const { CLASSES } = await import('/src/data/classes.js');
    const c = G.char, p = G.player, out = {};
    G.ui.log = () => {}; G.ui.centerMsg = () => {};
    const gear = (lvl, slot, rarity) => rollItem(lvl, { slot, cls: 'paladin', rarity });
    c.level = 60; c.depth = 60;

    // 1. a locked ring stays worn, however good the bag's rings
    c.equip.ring1 = gear(20, 'ring', 3); c.equip.ring1.locked = true; c.equip.ring2 = gear(20, 'ring', 3); c.equip.ring2.locked = true;
    c.bag.fill(null); for (let i = 0; i < 6; i++) c.bag[i] = gear(60, 'ring', 4);
    p.recompute(); Auto.optimizeGear();
    out.lockedWorn = c.equip.ring1.locked && c.equip.ring2.locked;
    delete c.equip.ring1.locked; delete c.equip.ring2.locked;
    Auto.optimizeGear();
    out.unlockedSwapped = !c.equip.ring1.locked || !c.equip.ring2.locked ? c.bag.filter(Boolean).length < 6 : false;

    // 2. a locked bag item: never sold, stored, dropped or sold by Sell all
    c.bag.fill(null); c.gold = 1e9;
    const keep = gear(10, 'body', 1); keep.locked = true; c.bag[0] = keep; c.bag[1] = gear(10, 'body', 1);
    Auto.sellJunk();
    out.sellJunkKeeps = c.bag[0] === keep && !c.bag[1];
    c.bag[2] = gear(80, 'body', 3); const keep2 = c.bag[2]; keep2.locked = true;   // too high to wear: would go to the chest
    Auto.stashExtras();
    out.stashKeeps = c.bag[2] === keep2 && !c.stash.includes(keep2);
    out.vendorRefuses = Vendor.sell({ where: 'bag', idx: 0 }) === false && c.bag[0] === keep;
    out.dropRefuses = dropFromBag(0) === false && c.bag[0] === keep;

    // 3. buying: no piece bought this visit is sold straight back (the weaponsmith and the armorer both sell shields)
    let bought = 0, sold = 0;
    for (let k = 0; k < 16; k++) {
      c.level = 90 + k * 9; c.depth = c.level;
      for (const s of ['weapon', 'offhand', 'head', 'body', 'hands', 'legs', 'feet']) c.equip[s] = gear(c.level - 25, s, 2);
      p.recompute(); c.bag.fill(null); c.gold = 2e4 * Math.pow(1.06, Math.min(c.level, 120)); Vendor.restock();
      const uids = new Set(), buy = Vendor.buy;
      Vendor.buy = function (d, i) { const it = d.list[d.i], ok = buy.call(this, d, i); if (ok) { uids.add(it.uid); bought++; } return ok; };
      try { Auto.sellJunk(); if (Auto.buyGear(Vendor.stock.weapons)) Auto.sellJunk(); if (Auto.buyGear(Vendor.stock.armor)) Auto.sellJunk(); Auto.jeweler(); Auto.manageHero(); Auto.sellJunk(); } finally { Vendor.buy = buy; }
      const worn = new Set(Object.values(c.equip).filter(Boolean).map((e) => e.uid));
      for (const u of uids) if (!worn.has(u)) sold++;
    }
    out.buy = { bought, sold };

    // 4. hands off the gear: a full bag never sends it to town, nor keeps it there
    G.settings.autoGear = false;
    c.bag.fill(null); for (let i = 0; i < c.bag.length; i++) c.bag[i] = gear(10, 'feet', 0);
    c.potions.hp = 20; Auto.sinceTown = 0;
    out.noTownTrip = !Auto.needTown();
    G.settings.autoGear = true;

    // 5. auto attribute points off: they stay for the player; on: spent
    c.level = 30; c.statPoints = 10; G.settings.autoStatPoints = false; Auto.manageHero();
    out.statsLeft = c.statPoints === 10;
    G.settings.autoStatPoints = true; Auto.manageHero();
    out.statsSpent = c.statPoints === 0;
    // 6. attribute respec: back to the class's base, every point refunded, 25 gold x level squared
    const B = CLASSES.paladin.base, before = ['str', 'dex', 'vit', 'int'].reduce((a, k) => a + c.attrs[k] - B[k], 0);
    c.gold = 1e9; const g0 = c.gold; attrRespec();
    out.respec = c.statPoints === before && before > 0 && c.attrs.str === B.str && g0 - c.gold === 25 * 30 * 30;
    // 7. skill points: +5 and as many as it takes
    c.skillPoints = 40; const sk = CLASS_SKILLS.paladin[0], l0 = c.skills[sk.id] || 0;
    learn(sk, 5); out.plus5 = c.skills[sk.id] === l0 + 5;
    learn(sk, Infinity); out.max = c.skills[sk.id] === 20 && c.skillPoints === 40 - (20 - l0);

    // 8. gold: the Golden Scarab pays gold, piles follow prices past level ~85
    const gold0 = c.gold, xp0 = c.xp;
    catchCritter({ K: CRITTERS.scarab, alive: true, x: p.x, y: p.y, z: 10 });
    out.scarab = { gold: c.gold - gold0, xp: c.xp - xp0, pile: Math.round(goldPile(c.level)) };
    out.piles = [1, 50, 100, 200, 300].map((l) => Math.round(goldPile(l)));
    out.scaleLow = goldScale(40) === 1;
    return out;
  });
  console.log(JSON.stringify(r, null, 1));
  const fails = [];
  const ok = (v, w) => { if (!v) fails.push(w); };
  ok(r.lockedWorn, 'locked rings were swapped out');
  ok(r.unlockedSwapped, 'unlocked, the better rings should be worn (test setup)');
  ok(r.sellJunkKeeps, 'sellJunk sold a locked item (or kept the unlocked one)');
  ok(r.stashKeeps, 'stashExtras stored a locked item');
  ok(r.vendorRefuses && r.dropRefuses, 'a locked item could be sold or dropped');
  ok(r.buy.bought > 20 && r.buy.sold === 0, `${r.buy.sold} of ${r.buy.bought} bought pieces sold again`);
  ok(r.noTownTrip, 'hands off the gear, a full bag still sends auto-play to town');
  ok(r.statsLeft && r.statsSpent, 'auto attribute points setting');
  ok(r.respec, 'attribute respec');
  ok(r.plus5 && r.max, '+5 / max skill points');
  ok(r.scarab.gold > r.scarab.pile * 20 && r.scarab.xp === 0, 'the Golden Scarab pays gold, no experience');
  ok(r.scaleLow && r.piles[4] > r.piles[3] * 50 && r.piles[1] === Math.round(3 + 50 * 2.2), 'gold piles');
  if (fails.length) { console.log('FAIL\n  ' + fails.join('\n  ')); process.exitCode = 1; } else console.log('OK');
  report(errors);
  await browser.close();
})();
