// Auto-play swaps out stale, heavily invested gear (a player's report: a depth 504 Paladin kept a level 40 green
// chest +10 full of top gems, and auto-play sold every level 250 chest that would have been far better).
//   node tools/tests/stalegear.js
// 1. A level 40 Uncommon +10 body with top gems vs a level 250 Rare body with the same sockets: auto-play wears the new
//    one, moves the gems across, and doesn't sell it. 2. The old piece is never thrown back on (no swap loop).
// 3. A fair new piece that really is worse (much lower item level) is still left in the bag.
const { openGame, report } = require('./harness');

(async () => {
  const { browser, page, errors } = await openGame({ width: 1280, height: 720 });
  let fails = 0;
  const check = (ok, msg) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${msg}`); if (!ok) fails++; };
  await page.evaluate(async () => { await window.VELSCOUR.game.newChar('paladin', 'Stalebot'); });
  await page.waitForTimeout(800);
  const r = await page.evaluate(async () => {
    const { G } = window.VELSCOUR;
    const items = await import('/src/data/items.js');
    const { addToBag } = await import('/src/game/player.js');
    const { Auto } = await import('/src/game/autoplay.js');
    const c = G.char, p = G.player;
    c.level = 330; c.depth = 500; c.gold = 2e8;
    // a full kit of level-appropriate gear so only the body slot is stale
    for (const s of ['weapon', 'offhand', 'head', 'hands', 'legs', 'feet']) { const it = items.rollItem(255, { slot: s, rarity: 2 }); it.req = 1; c.equip[s] = it; }
    const old = items.rollItem(40, { slot: 'body', rarity: 1 }); old.req = 1; old.upg = 10;
    old.sockets = old.maxSockets = 2; old.gems = [{ gem: 'ruby', tier: 7 }, { gem: 'diamond', tier: 7 }];
    c.equip.body = old;
    p.recompute();
    const neu = items.rollItem(250, { slot: 'body', rarity: 2 }); neu.req = 1; neu.sockets = 2; neu.gems = [];
    addToBag(c, neu);
    G.settings.autoGear = true;
    Auto.toggle(true);
    const out = { oldArmor: items.itemArmor(old), newArmor: items.itemArmor(neu), wantNew: Auto.isUpgrade(neu) };
    Auto.optimizeGear();
    out.worn = c.equip.body && c.equip.body.uid === neu.uid;
    out.gemsMoved = Object.values(c.equip).reduce((a, it) => a + (it ? it.gems.filter((g) => g.tier === 7).length : 0), 0) + c.bag.filter((b) => b && b.type === 'gem' && b.tier === 7).length;
    out.oldInBag = c.bag.some((b) => b && b.uid === old.uid);
    // no swap loop: a second pass keeps the new one
    Auto.optimizeGear(); Auto.optimizeGear();
    out.stillWorn = c.equip.body.uid === neu.uid;
    // a truly worse piece stays in the bag
    const junk = items.rollItem(60, { slot: 'body', rarity: 2 }); junk.req = 1; junk.sockets = 2;
    addToBag(c, junk);
    Auto.optimizeGear();
    out.junkWorn = c.equip.body.uid === junk.uid;
    Auto.toggle(false);
    return out;
  });
  console.log(r);
  check(r.wantNew, 'the level 250 chest counts as an upgrade (picked up, not sold)');
  check(r.worn, 'auto-play wears it');
  check(r.gemsMoved === 2, 'the old chest\'s gems are moved into it');
  check(r.stillWorn, 'no swap back on later passes');
  check(!r.junkWorn, 'a level 60 chest is still left alone');
  report(errors); if (fails) process.exitCode = 1;
  await browser.close();
})();
