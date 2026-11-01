// Bag rows bought with gold (src/data/bag.js): 6 rows to start, rows 7..12 at 5k..160k, the inventory button,
// saves keep them, old saves stay 6 rows, auto-play buys one when the gold is idle. Shots of 6 and 12 rows.
// node tools/tests/bagrows.js [mobile]
const { openGame, report } = require('./harness');
const mobile = process.argv.includes('mobile');
(async () => {
  const { browser, page, errors } = await openGame(mobile ? { mobile: true } : {});
  const fail = [];
  const ev = (f, a) => page.evaluate(f, a);
  await ev(async () => { const { G, game } = window.VELSCOUR; await game.newChar('paladin', 'Packrat'); G.char.gold = 0; });
  const st = () => ev(async () => {
    const { G } = window.VELSCOUR, { nextRowCost } = await import('/src/data/bag.js');
    const b = document.querySelector('.bag-buy');
    return { len: G.char.bag.length, slots: document.querySelectorAll('.bag .bslot').length, gold: G.char.gold, cost: nextRowCost(G.char), btn: b ? b.textContent : null };
  });
  await ev(async () => { const { toggleInventory } = await import('/src/ui/inventory.js'); toggleInventory(); });
  await page.waitForTimeout(300);
  let s = await st();
  console.log('start', JSON.stringify(s));
  if (s.len !== 60 || s.slots !== 60 || s.cost !== 5000 || !/row 7 of 12/.test(s.btn || '')) fail.push('start: ' + JSON.stringify(s));
  await page.screenshot({ path: 'tools/tests/out/bagrows_6.png' });
  // too poor: a click logs and buys nothing
  await page.click('.bag-buy'); await page.waitForTimeout(150);
  if ((await st()).len !== 60 || await page.$('.modal .btn.red')) fail.push('bought with no gold');
  // buy all six by clicking, each through the confirm dialog
  const want = [5000, 10000, 20000, 40000, 80000, 160000];
  await ev(() => { window.VELSCOUR.G.char.gold = 400000; window.VELSCOUR.G.ui.refresh && window.VELSCOUR.G.ui.refresh(); });
  for (let k = 0; k < 6; k++) {
    const before = await st();
    if (before.cost !== want[k]) fail.push(`row ${7 + k} costs ${before.cost}`);
    await page.click('.bag-buy'); await page.waitForTimeout(150);
    const yes = await page.$('.btn.red'); if (!yes) { fail.push('no confirm dialog'); break; }
    await yes.click(); await page.waitForTimeout(200);
    const after = await st();
    if (after.len !== before.len + 10 || after.slots !== after.len || after.gold !== before.gold - want[k]) fail.push('buy ' + k + ': ' + JSON.stringify([before, after]));
  }
  s = await st();
  console.log('full', JSON.stringify(s));
  if (s.len !== 120 || s.btn !== null || s.cost !== 0 || s.gold !== 400000 - 315000) fail.push('full: ' + JSON.stringify(s));
  await page.screenshot({ path: 'tools/tests/out/bagrows_12.png' });
  const r = await ev(async () => {
    const { G } = window.VELSCOUR, { migrate } = await import('/src/game/save.js'), { buyBagRow } = await import('/src/data/bag.js'), { Auto } = await import('/src/game/autoplay.js');
    const out = {};
    G.char.bag[119] = { type: 'gem', gem: 'ruby', tier: 0 };
    const back = migrate(JSON.parse(JSON.stringify(G.char)));
    out.saved = [back.bag.length, !!back.bag[119]];
    out.old = migrate({ classId: 'paladin', bag: Array(60).fill(null), equip: {}, skills: {}, bar: [] }).bag.length;
    out.short = migrate({ classId: 'paladin', bag: Array(47).fill(null), equip: {}, skills: {}, bar: [] }).bag.length;
    out.capped = (G.char.gold = 1e9, buyBagRow(G.char)); // no 13th row
    // auto-play: a fresh hero with idle gold buys one row on its way through town, not with too little
    const c = G.char; c.bag = Array(60).fill(null); c.gold = 19999; Auto.town = null; Auto.toggle(true); Auto.townTick(0.016);
    out.poorAuto = c.bag.length; Auto.toggle(false);
    c.gold = 20000; Auto.town = null; Auto.toggle(true); Auto.townTick(0.016);
    out.richAuto = [c.bag.length, c.gold]; Auto.toggle(false);
    G.settings.autoGear = false; c.gold = 1e7; Auto.town = null; Auto.toggle(true); Auto.townTick(0.016);
    out.handsOff = c.bag.length; Auto.toggle(false); G.settings.autoGear = true;
    return out;
  });
  console.log(JSON.stringify(r));
  if (r.saved[0] !== 120 || !r.saved[1]) fail.push('save lost rows');
  if (r.old !== 60 || r.short !== 60) fail.push('migrate sizes ' + r.old + ' ' + r.short);
  if (r.capped) fail.push('bought a 13th row');
  if (r.poorAuto !== 60 || r.richAuto[0] !== 70 || r.richAuto[1] !== 15000 || r.handsOff !== 70) fail.push('auto-play ' + JSON.stringify(r));
  console.log(fail.length ? 'FAIL\n' + fail.join('\n') : 'PASS');
  report(errors); await browser.close();
  process.exit(fail.length ? 1 : 0);
})();
