// Auto-play's gear setting, +N gear kept in the chest, and the vendors' Sell all button.
//   node tools/tests/autogear.js [mobile]
// 1. Settings › "Auto-play manages gear" off: a much better bag item stays in the bag, a full bag isn't emptied to make
//    room, the town round only visits the alchemist (bag, gear and stash untouched), and a full bag neither sends it to
//    town nor keeps it there: it goes back down and leaves new gear on the ground (a player asleep at the screen).
// 2. On: every piece of gear auto-play buys from a shop gets worn at once (equipBar). Gear upgraded at the blacksmith
//    (+N) is never sold or dropped: a town round puts it in the storage chest, it stays there unless it's an upgrade,
//    and a full chest sells the other gear auto-play stored first.
// 3. Sell all: Cancel sells nothing; one confirmation sells all bag gear, keeps gems, sealed treasures and equipped
//    gear. Shots of the button and the dialog.
const { openGame, report } = require('./harness');
const mobile = process.argv[2] === 'mobile';

(async () => {
  const { browser, page, errors, shot } = await openGame(mobile ? { width: 844, height: 390, mobile: true } : { width: 1440, height: 810 });
  let fails = 0;
  const check = (ok, msg) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${msg}`); if (!ok) fails++; };
  await page.evaluate(async () => { await window.VELSCOUR.game.newChar('paladin', 'Gearbot'); window.VELSCOUR.G.autoDest = 'standard'; });
  await page.waitForTimeout(800);
  // a town round with auto-play on: the statuses it showed (errands only) and where it ended up
  const townRound = async (secs, opts = {}) => page.evaluate(async ({ secs, freeAt }) => {
    const { G, game } = window.VELSCOUR;
    const { Auto } = await import('/src/game/autoplay.js');
    const seen = new Set();
    let waited = false;
    Auto.toggle(true);
    for (let t = 0; t < secs * 30 && G.world.kind === 'town'; t++) {
      G.dt = 1 / 30; G.time += G.dt; G.frame++; game.update(1 / 30);
      seen.add(Auto.status);
      if (Auto.sealWaiting) { waited = true; if (freeAt && t > freeAt * 30) { const i = G.char.bag.findIndex((b) => b && b.type === 'gear'); G.char.bag[i] = null; } } // the player sells one
      if (t % 60 === 0) await new Promise((r) => setTimeout(r, 0));
    }
    Auto.toggle(false);
    return { seen: [...seen].filter((s) => !/^(To the portal|Travelling|Thinking|Paying|Saying|Watching|Listening|Looking|Chatting)/.test(s)), left: G.world.kind, waited };
  }, { secs, freeAt: opts.freeAt || 0 });

  // ---- 1. hands off
  const off = await page.evaluate(async () => {
    const { G } = window.VELSCOUR;
    const items = await import('/src/data/items.js');
    const { addToBag } = await import('/src/game/player.js');
    const { Auto } = await import('/src/game/autoplay.js');
    const c = G.char;
    window.uids = () => JSON.stringify([c.bag.map((b) => b && b.uid), Object.values(c.equip).map((b) => b && b.uid), c.stash.map((b) => b && b.uid)]);
    G.settings.autoGear = false;
    c.level = 20; c.gold = 200000; c.potions.hp = 0; G.player.recompute();
    const best = items.rollItem(30, { slot: 'weapon', rarity: 4 }); best.req = 1; best.sealed = false;
    addToBag(c, best); addToBag(c, items.rollItem(18, { slot: 'body', rarity: 3 })); addToBag(c, items.makeGem('ruby', 3));
    window.before = window.uids();
    Auto.manageHero();
    return { kept: c.equip.weapon.uid !== best.uid && c.bag.some((b) => b && b.uid === best.uid) };
  });
  const offTown = await townRound(120);
  const off2 = await page.evaluate(async () => {
    const { G } = window.VELSCOUR;
    const items = await import('/src/data/items.js');
    const { Auto } = await import('/src/game/autoplay.js');
    const c = G.char, out = { untouched: window.uids() === window.before, pots: c.potions.hp };
    // neither a nearly full bag nor a full one sends it to town (it plays on, leaving gear on the ground); no dropping for room
    for (let i = 0; i < c.bag.length; i++) if (!c.bag[i]) c.bag[i] = items.rollItem(5, { slot: 'feet', rarity: 0 });
    for (let i = 0; i < 10; i++) c.bag[c.bag.length - 1 - i] = null;
    c.potions.hp = 20;
    Auto.sinceTown = 10; out.townLow = Auto.needTown();
    for (let i = 0; i < c.bag.length; i++) if (!c.bag[i]) c.bag[i] = items.rollItem(5, { slot: 'feet', rarity: 0 });
    const full = window.uids();
    out.room = Auto.makeRoom(items.rollItem(25, { slot: 'ring', rarity: 4 }));
    out.townFull = Auto.needTown();
    out.fullKept = window.uids() === full;
    if (G.world.kind !== 'town') { G.game.enterTown(); await new Promise((r) => setTimeout(r, 1500)); }
    return out;
  });
  const offWait = await townRound(120, { freeAt: 30 });
  console.log(JSON.stringify({ off, offTown, off2, offWait }));
  check(off.kept, 'hands off: a much better weapon stays in the bag');
  check(offTown.seen.includes('Buying potions') && !offTown.seen.some((s) => /Selling|Browsing|gem merchant|jeweler|Enchanting|Gambling|storage chest|Stashing/.test(s)), `hands off: town errands ${JSON.stringify(offTown.seen)}`);
  check(off2.untouched, 'hands off: bag, equipment and stash untouched by the town round');
  check(off2.pots > 0, `hands off: still buys potions (${off2.pots} healing)`);
  check(offTown.left !== 'town', 'hands off: left town through the portal');
  check(!off2.townLow && !off2.townFull, 'hands off: a full bag does not send the hero to town');
  check(!off2.room && off2.fullKept, 'hands off: a full bag is not emptied to make room');
  check(!offWait.waited && offWait.left !== 'town', 'hands off: a full bag does not keep the hero in town');

  // ---- 2. hands on: what it buys, it wears
  const on = await page.evaluate(async () => {
    const { G, game } = window.VELSCOUR;
    const { Auto } = await import('/src/game/autoplay.js');
    const { Vendor } = await import('/src/ui/vendor.js');
    if (G.world.kind !== 'town') { game.enterTown(); await new Promise((r) => setTimeout(r, 1500)); }
    const c = G.char;
    G.settings.autoGear = true;
    c.bag = c.bag.map(() => null);
    // buyGear wears each purchase (optimizeGear) before it looks at the next: check every one right then
    const buy = Vendor.buy, opt = Auto.optimizeGear, bought = [];
    let last = null;
    Vendor.buy = function (data, ...rest) { const it = data.list[data.i]; const ok = buy.call(this, data, ...rest); if (ok) bought.push(last = { uid: it.uid }); return ok; };
    Auto.optimizeGear = function () { const r = opt.call(this); if (last) { last.worn = Object.values(c.equip).some((it) => it && it.uid === last.uid); last = null; } return r; };
    let rounds = 0;
    for (let lvl = 6; lvl <= 40; lvl += 2) {
      c.level = lvl; c.gold = 30000 * lvl; G.player.recompute();
      Vendor.restock();
      for (const k of ['weapons', 'armor', 'rings']) Auto.buyGear(Vendor.stock[k]);
      rounds++;
    }
    Vendor.buy = buy; Auto.optimizeGear = opt;
    return { rounds, bought: bought.length, unworn: bought.filter((b) => !b.worn).length };
  });
  console.log(JSON.stringify(on));
  check(on.bought > 0, `hands on: bought ${on.bought} pieces over ${on.rounds} shop visits`);
  check(on.unworn === 0, `hands on: every purchase was worn at once (${on.unworn} not worn)`);

  // ---- 2b. hands on: +N gear goes to the storage chest, never to a vendor or the floor
  const plus0 = await page.evaluate(async () => {
    const { G } = window.VELSCOUR;
    const items = await import('/src/data/items.js');
    const { addToBag } = await import('/src/game/player.js');
    const { Auto } = await import('/src/game/autoplay.js');
    const c = G.char, out = {};
    c.bag = c.bag.map(() => null); c.stash = c.stash.map(() => null);
    const ring = window.ring = items.rollItem(8, { slot: 'ring', rarity: 2 }); ring.upg = 8; ring.sealed = false;
    const junk = window.junk = items.rollItem(3, { slot: 'feet', rarity: 0 }); junk.sealed = false;
    addToBag(c, ring); addToBag(c, junk);
    out.dropPick = c.bag[Auto.worstBag(1e12)] === junk;
    c.bag[c.bag.indexOf(junk)] = null;
    out.dropNone = Auto.worstBag(1e12) === -1;
    addToBag(c, junk);
    return out;
  });
  const plusTown = await townRound(150);
  const plus = await page.evaluate(async () => {
    const { G } = window.VELSCOUR;
    const items = await import('/src/data/items.js');
    const { addToBag } = await import('/src/game/player.js');
    const { Auto } = await import('/src/game/autoplay.js');
    const c = G.char, ring = window.ring, out = {};
    const where = (it) => (c.stash.some((b) => b && b.uid === it.uid) ? 'chest' : c.bag.some((b) => b && b.uid === it.uid) ? 'bag' : Object.values(c.equip).some((b) => b && b.uid === it.uid) ? 'worn' : 'gone');
    out.ring = where(ring); out.junk = where(window.junk); out.flag = (c.stash.find((b) => b && b.uid === ring.uid) || {}).autoStash;
    Auto.unstash(); // stays in the chest: not carried back out
    out.after = where(ring);
    // a full chest sells the gear auto-play stored, +N gear last
    const stored = c.stash.find((b) => b && b.uid === ring.uid);
    c.stash = c.stash.map((b, i) => (i === 0 ? stored : Object.assign(items.rollItem(2, { slot: 'feet', rarity: 0 }), { autoStash: true })));
    c.bag = c.bag.map(() => null); addToBag(c, items.makeGem('emerald', 0));
    Auto.stashExtras();
    out.pruned = 299 - c.stash.filter((b) => b && b.type === 'gear' && b !== stored).length; out.kept = c.stash[0] === stored;
    return out;
  });
  console.log(JSON.stringify({ plus0, plusTown, plus }));
  check(plus0.dropPick && plus0.dropNone, 'hands on: a +8 ring is never picked to drop for room');
  check(plusTown.seen.includes('Stashing gems and gear for later'), `hands on: town round stops at the chest ${JSON.stringify(plusTown.seen)}`);
  check(plus.ring === 'chest' && plus.junk === 'gone', `hands on: the +8 ring went to the chest (${plus.ring}, ${plus.flag}), the junk was sold (${plus.junk})`);
  check(plus.after === 'chest', 'hands on: the +8 ring is not taken back out of the chest');
  check(plus.pruned === 30 && plus.kept, `hands on: a full chest sold ${plus.pruned} other pieces and kept the +8 ring`);

  // ---- 3. Sell all
  await page.evaluate(async () => {
    const { G, game } = window.VELSCOUR;
    if (G.world.kind !== 'town') { game.enterTown(); await new Promise((r) => setTimeout(r, 1500)); }
    const items = await import('/src/data/items.js');
    const { addToBag } = await import('/src/game/player.js');
    const c = G.char;
    c.bag = c.bag.map(() => null);
    for (let i = 0; i < 12; i++) addToBag(c, Object.assign(items.rollItem(20 + i, { rarity: i % 6 }), { sealed: false }));
    addToBag(c, Object.assign(items.rollItem(30, { rarity: 4 }), { sealed: true }));
    const g = items.makeGem('topaz', 2); g.count = 4; addToBag(c, g);
    c.bag.find((b) => b && b.type === 'gear').gems = [{ gem: 'ruby', tier: 1 }];
    G.ui.vendor.open('weapons');
  });
  await page.waitForTimeout(400);
  const pre = await page.evaluate(() => { const c = window.VELSCOUR.G.char; return { gold: c.gold, gear: c.bag.filter((b) => b && b.type === 'gear' && !b.sealed).length, equip: Object.values(c.equip).filter(Boolean).map((b) => b.uid).join() }; });
  const btn = page.locator('.btn', { hasText: /^Sell all$/ }).first();
  await btn.scrollIntoViewIfNeeded();
  check(await btn.isVisible(), 'Sell all button shows in the inventory at a vendor');
  await shot(`autogear_sellall_button${mobile ? '_mobile' : ''}`);
  await btn.click();
  await page.waitForTimeout(200);
  await shot(`autogear_sellall_confirm${mobile ? '_mobile' : ''}`);
  await page.locator('.dialog-box button', { hasText: 'Cancel' }).click();
  const cancelled = await page.evaluate(() => window.VELSCOUR.G.char.bag.filter((b) => b && b.type === 'gear' && !b.sealed).length);
  check(cancelled === pre.gear, `Cancel sells nothing (${cancelled}/${pre.gear} gear left)`);
  await btn.click();
  await page.locator('.dialog-box button', { hasText: 'Sell all' }).click();
  await page.waitForTimeout(200);
  const post = await page.evaluate(() => { const c = window.VELSCOUR.G.char; return { gold: c.gold, gear: c.bag.filter((b) => b && b.type === 'gear' && !b.sealed).length, sealed: c.bag.filter((b) => b && b.sealed).length, gems: c.bag.filter((b) => b && b.type === 'gem').map((b) => b.count || 1), equip: Object.values(c.equip).filter(Boolean).map((b) => b.uid).join(), disabled: [...document.querySelectorAll('.btn')].find((b) => b.textContent === 'Sell all')?.disabled, dialogs: document.querySelectorAll('.dialog-box').length }; });
  console.log(JSON.stringify({ pre, post }));
  check(post.gear === 0 && post.gold > pre.gold, `one confirmation sold ${pre.gear} pieces for ${post.gold - pre.gold} gold`);
  check(post.gems.join() === '4' && post.sealed === 1, 'gems and the sealed treasure are kept');
  check(post.equip === pre.equip, 'equipped gear is not sold');
  check(post.disabled === true && post.dialogs === 0, 'the button greys out with no gear left, dialog closed');
  await shot(`autogear_sellall_done${mobile ? '_mobile' : ''}`);
  // no Sell all away from a vendor
  await page.evaluate(async () => { window.VELSCOUR.G.ui.closeAll(); (await import('/src/ui/inventory.js')).toggleInventory(); });
  await page.waitForTimeout(300);
  check(!(await page.locator('.btn', { hasText: /^Sell all$/ }).count()), 'no Sell all button away from a vendor');

  console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
  if (fails) process.exitCode = 1;
  report(errors, 20);
  await browser.close();
})();
