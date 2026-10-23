// Auto-play's town shopping and the loot filter. Every piece auto-play buys gets worn (none sold straight back), the
// loot filter decides what it and walk-over pickup take, keepers go to the chest, the player's stored gear stays put,
// and the chest sorts by type. Shots: out/autoshop_filter.png, out/autoshop_chest.png.
// node tools/tests/autoshop.js [classes] [rounds]
const { openGame, report } = require('./harness');
const classes = (process.argv[2] || 'paladin,wizard,ranger').split(',');
const rounds = +(process.argv[3] || 40);
(async () => {
  const { browser, page, errors } = await openGame();
  const fails = [];
  for (const cls of classes) {
    const r = await page.evaluate(async ({ cls, rounds }) => {
      const { G, game } = window.VELSCOUR;
      await game.newChar(cls, 'Shopper');
      const { Vendor } = await import('/src/ui/vendor.js');
      const { Auto } = await import('/src/game/autoplay.js');
      const { rollItem } = await import('/src/data/items.js');
      const c = G.char, out = { bought: 0, sold: 0, spent: 0 };
      for (let k = 0; k < rounds; k++) {
        c.level = 5 + (k * 7) % 60; c.depth = Math.max(1, c.level - 3);
        for (const s of ['weapon', 'head', 'body', 'hands', 'legs', 'feet']) c.equip[s] = Math.random() < 0.8 ? rollItem(Math.max(1, c.level - 1 - (k % 5)), { slot: s, cls }) : null;
        G.player.recompute();
        c.bag.fill(null); c.gold = 2e4 * Math.pow(1.06, c.level);
        Vendor.restock();
        const uids = new Set(), buy = Vendor.buy;
        Vendor.buy = function (data, i) { const it = data.list[data.i], g = c.gold, ok = buy.call(this, data, i); if (ok) { uids.add(it.uid); out.bought++; out.spent += g - c.gold; } return ok; };
        try { Auto.buyGear(Vendor.stock.weapons); Auto.buyGear(Vendor.stock.armor); Auto.buyGear(Vendor.stock.rings || []); } finally { Vendor.buy = buy; }
        Auto.sellJunk();
        const worn = new Set(Object.values(c.equip).filter(Boolean).map((e) => e.uid));
        for (const u of uids) if (!worn.has(u)) out.sold++;
      }
      return out;
    }, { cls, rounds });
    console.log(cls, JSON.stringify(r));
    // rings weigh each other (augments), so now and then a ring bought this visit loses its slot to the one it replaced
    if (r.sold > r.bought * 0.02) fails.push(`${cls}: ${r.sold} of ${r.bought} bought items were sold again`);
  }

  const f = await page.evaluate(async () => {
    const { G, game } = window.VELSCOUR;
    await game.newChar('paladin', 'Filter');
    const { Auto } = await import('/src/game/autoplay.js');
    const { rollItem, makeGem } = await import('/src/data/items.js');
    const { filterPasses, lootFilter } = await import('/src/game/lootfilter.js');
    const { sortStash, Stash } = await import('/src/ui/stash.js');
    const { lootFilterDialog } = await import('/src/ui/screens.js');
    const c = G.char, out = {};
    Auto.reset();
    c.level = 30; c.depth = 30;
    for (const s of ['weapon', 'offhand', 'head', 'body', 'hands', 'legs', 'feet']) c.equip[s] = rollItem(34, { slot: s, cls: 'paladin', rarity: 4 });
    for (const s of ['ring1', 'ring2', 'ring3', 'ring4']) c.equip[s] = rollItem(34, { slot: 'ring', rarity: 4 });
    G.player.recompute();
    const want = (it) => Auto.wantLootNow({ kind: 'item', item: it });
    const items = { ring0: rollItem(20, { slot: 'ring', rarity: 0 }), ring1: rollItem(20, { slot: 'ring', rarity: 1 }), body2: rollItem(20, { slot: 'body', rarity: 2 }), body3: rollItem(20, { slot: 'body', rarity: 3 }), sword3: rollItem(20, { slot: 'weapon', cls: 'paladin', rarity: 3 }), gem: makeGem('ruby', 1) };
    const f = lootFilter();
    out.offByDefault = !f.on;
    Object.assign(f, { on: true, weapon: 3, offhand: 3, armor: 3, ring: 1, gems: true, upgrades: false, keep: true });
    out.pass = Object.fromEntries(Object.entries(items).map(([k, it]) => [k, filterPasses(it)]));
    out.want = Object.fromEntries(Object.entries(items).map(([k, it]) => [k, want(it)]));
    f.gems = false; out.gemOff = want(items.gem) || filterPasses(items.gem); f.gems = true;
    const sealed = rollItem(20, { slot: 'body', rarity: 3 }); sealed.sealed = true; f.armor = -1; out.sealedPasses = filterPasses(sealed) && want(sealed); f.armor = 3;
    // keepers stay out of the sale and go to the chest; the rest is sold
    c.bag.fill(null); c.stash.fill(null);
    c.bag[0] = items.ring1; c.bag[1] = items.body3; c.bag[2] = items.body2; c.bag[3] = items.ring0;
    Auto.sellJunk();
    out.afterSell = c.bag.filter(Boolean).map((b) => b.slot + b.rarity);
    out.sellOk = c.bag.every((b) => !b || filterPasses(b)) && c.bag.includes(items.body3) && !c.bag.includes(items.body2) && !c.bag.includes(items.ring0);
    Auto.stashExtras();
    out.stashed = c.stash.filter(Boolean).map((b) => b.slot + b.rarity);
    out.stashOk = !c.bag.some(Boolean) && c.stash.includes(items.body3);
    // gear the player stored stays in the chest (auto-play would sell it)
    c.bag[5] = rollItem(10, { slot: 'legs', rarity: 0 }); Stash.store(5);
    Auto.unstash(); Auto.sellJunk();
    out.playerStoredKept = c.stash.some((b) => b && b.slot === 'legs');
    // the chest sorts by type
    for (const it of [makeGem('topaz', 2), rollItem(20, { slot: 'feet', rarity: 1 }), rollItem(20, { slot: 'weapon', cls: 'paladin', rarity: 0 }), rollItem(20, { slot: 'ring', rarity: 2 }), rollItem(20, { slot: 'head', rarity: 5 })]) c.stash[c.stash.findIndex((b) => !b)] = it;
    c.stash.reverse();
    sortStash(c, 'type');
    out.byType = c.stash.filter(Boolean).map((b) => b.type === 'gem' ? 'gem' : b.slot);
    sortStash(c, 'rarity');
    out.byRarity = c.stash.filter(Boolean).map((b) => b.rarity ?? 'g');
    Object.assign(f, { on: false });
    lootFilterDialog();
    return out;
  });
  console.log(JSON.stringify(f));
  await page.screenshot({ path: 'tools/tests/out/autoshop_filter.png' });
  const exp = { ring0: false, ring1: true, body2: false, body3: true, sword3: true, gem: true };
  for (const k in exp) if (f.pass[k] !== exp[k] || f.want[k] !== exp[k]) fails.push(`filter ${k}: pass ${f.pass[k]} want ${f.want[k]}, expected ${exp[k]}`);
  if (!f.offByDefault) fails.push('the filter should start off');
  if (f.gemOff) fails.push('gems off still picks up gems');
  if (!f.sealedPasses) fails.push('sealed treasures must always pass');
  if (!f.sellOk) fails.push('sellJunk kept ' + f.afterSell + ' (keepers only: what passes the filter)');
  if (!f.stashOk) fails.push('stashExtras stored ' + f.stashed);
  if (!f.playerStoredKept) fails.push('auto-play took the player\'s stored gear out (and sold it)');
  const order = ['weapon', 'offhand', 'head', 'body', 'hands', 'legs', 'feet', 'ring', 'gem'];
  if (f.byType.some((t, i) => i && order.indexOf(t) < order.indexOf(f.byType[i - 1]))) fails.push('chest not sorted by type: ' + f.byType);
  await page.evaluate(async () => { const { Stash } = await import('/src/ui/stash.js'); document.querySelectorAll('.screen').forEach((s) => s.remove()); window.VELSCOUR.G.ui.modalCount = 0; Stash.open(); });
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'tools/tests/out/autoshop_chest.png' });
  console.log(fails.length ? 'FAIL\n  ' + fails.join('\n  ') : 'OK: shopping, loot filter, keepers, chest sort');
  report(errors); await browser.close();
  process.exit(fails.length ? 1 : 0);
})();
