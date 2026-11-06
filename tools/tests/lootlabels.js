// The loot on the ground doesn't bury the screen: a label budget (best drops first, junk only close by, the rest by hover
// and click), lesser monster drops fade, a hard cap, and what must never vanish stays.
//   node tools/tests/lootlabels.js [mobile]
const { openGame, report } = require('./harness');
const mobile = process.argv[2] === 'mobile';

(async () => {
  const { browser, page, errors, shot } = await openGame(mobile ? { width: 844, height: 390, mobile: true } : { width: 1280, height: 886 });
  let fails = 0;
  const check = (ok, msg) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${msg}`); if (!ok) fails++; };
  await page.evaluate(async () => {
    const { G, game } = window.VELSCOUR;
    await game.newChar('paladin', 'Lootbot');
    await game.enterDungeon();
    G.godMode = true;
    for (const c of G.world.creatures) if (c.team === 'enemy') { c.hp = 0; c.dead = true; }
    G.world.creatures = G.world.creatures.filter((c) => c.team !== 'enemy');
  });
  await page.waitForTimeout(800);

  // the screenshot's pile: 90 drops round the hero, mostly Common and Uncommon, a few good ones hidden among them
  const pile = await page.evaluate(async () => {
    const { G } = window.VELSCOUR;
    const { GroundItem, fadeOf } = await import('/src/game/loot.js');
    const { rollItem, rollGem } = await import('/src/data/items.js');
    const p = G.player, w = G.world;
    window.__good = [];
    for (let i = 0; i < 90; i++) {
      const a = i * 2.4, r = 1.2 + (i % 12) * 0.8;
      const rarity = i % 15 === 0 ? 4 : i % 7 === 0 ? 2 : i % 2;
      const item = rollItem(40, { rarity }); item.sealed = false;
      const [x, y] = w.map.randomNear(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r, 1);
      const g = new GroundItem(x, y, 'item', { item, fades: fadeOf(item) });
      g.vz = 0; g.t = 1; w.addLoot(g);
      if (rarity === 4) window.__good.push(g);
    }
    p.lootTarget = null;
    return w.loot.length;
  });
  await page.mouse.move(5, 5); await page.waitForTimeout(400);
  await shot('lootlabels_budget');
  const seen = await page.evaluate(async () => {
    const { G } = window.VELSCOUR;
    const { labelBudget } = await import('/src/game/loot.js');
    const named = G.world.loot.filter((l) => l.named);
    const byTile = G.lootBoxes.filter((b) => b.loot.named && b.h === 16), o = [];
    for (let i = 0; i < byTile.length; i++) for (let j = i + 1; j < byTile.length; j++) { const a = byTile[i], b = byTile[j]; if (Math.abs(a.x - b.x) < (a.w + b.w) / 2 - 0.5 && Math.abs(a.y - b.y) < 15.5) o.push(1); }
    return { named: named.length, budget: labelBudget(innerHeight), overlaps: o.length, boxes: G.lootBoxes.length, loot: G.world.loot.length,
      goodNamed: window.__good.filter((g) => g.named && G.world.loot.includes(g)).length, goodThere: window.__good.filter((g) => G.world.loot.includes(g)).length, junkNamed: named.filter((l) => l.item.rarity < 2).length };
  });
  console.log(seen);
  check(seen.named > 0 && seen.named <= seen.budget, `${seen.loot} drops: ${seen.named} names, budget ${seen.budget}`);
  check(seen.overlaps === 0, `no two names overlap (${seen.overlaps})`);
  check(seen.goodNamed >= Math.min(seen.goodThere, seen.budget) - 2, `the Legendaries get names first (${seen.goodNamed}/${seen.goodThere})`);
  check(seen.boxes === seen.loot, `every drop can still be clicked (${seen.boxes} boxes, ${seen.loot} drops)`);

  // an unnamed item: hover shows its name, a click walks over and takes it
  if (!mobile) {
    const t = await page.evaluate(() => {
      const { G } = window.VELSCOUR;
      const b = G.lootBoxes.find((x) => !x.loot.named && !G.lootBoxes.some((y) => y !== x && Math.abs(y.x - x.x) < (y.w + x.w) / 2 && Math.abs(y.y - x.y) < (y.h + x.h) / 2));
      if (b) window.__t = b.loot;
      return b ? { x: b.x, y: b.y } : null;
    });
    check(!!t, 'found an unnamed drop on its own');
    if (t) {
      const n0 = await page.evaluate(() => window.VELSCOUR.G.lootBoxes.length);
      await page.mouse.move(t.x, t.y); await page.waitForTimeout(200);
      await shot('lootlabels_hover');
      await page.mouse.click(t.x, t.y); await page.waitForTimeout(1600);
      const got = await page.evaluate(() => { const { G } = window.VELSCOUR; return { gone: !G.world.loot.includes(window.__t), target: G.player.lootTarget === window.__t }; });
      check(got.gone || got.target, `clicking an unnamed drop goes for it (${JSON.stringify(got)}, ${n0} boxes)`);
    }
  }

  // the setting brings back every name
  const allN = await page.evaluate(async () => { const { G } = window.VELSCOUR; G.settings.allItemNames = true; await new Promise((r) => setTimeout(r, 300)); const n = G.world.loot.filter((l) => l.named).length; G.settings.allItemNames = false; return n; });
  check(allN > seen.budget, `Show every item name: ${allN} names`);

  // fading, and what stays
  const fade = await page.evaluate(async () => {
    const { G } = window.VELSCOUR;
    const { GroundItem, fadeOf, dropLoot } = await import('/src/game/loot.js');
    const { rollItem, rollGem, rollSigil } = await import('/src/data/items.js');
    const w = G.world, p = G.player, far = w.map.randomNear(p.x, p.y, 3);
    w.loot.length = 0;
    const mk = (item, extra = {}) => { const g = new GroundItem(p.x + 40, p.y + 40, 'item', { item, fades: fadeOf(item), ...extra }); g.vz = 0; w.addLoot(g); return g; };
    const common = mk(rollItem(40, { rarity: 0 })), uncommon = mk(rollItem(40, { rarity: 1 })), rare = mk(rollItem(40, { rarity: 2 })), gem = mk(rollGem(40));
    const epic = mk(Object.assign(rollItem(40, { rarity: 3 }), { sealed: false })), sealed = mk(Object.assign(rollItem(40, { rarity: 4 }), { sealed: true }));
    const sigil = mk(rollSigil(40)), relic = mk(Object.assign(rollItem(40, { rarity: 0 }), { relic: 'x' }));
    const own = mk(rollItem(40, { rarity: 0 }), { fades: 0, dropped: true }), chest = mk(rollItem(40, { rarity: 0 }), { fades: 0 });
    const targeted = mk(rollItem(40, { rarity: 0 })); p.lootTarget = targeted;
    const key = w.addLoot(new GroundItem(p.x + 40, p.y + 40, 'key', {})); key.vz = 0;
    const has = (g) => w.loot.includes(g);
    const run = (s) => { for (const g of [...w.loot]) { g.t = s; if (g.update(0.016, w) === false) w.loot.splice(w.loot.indexOf(g), 1); } };
    run(40); const at40 = [has(common), has(uncommon), has(rare), has(gem)];
    run(50); const at50 = [has(common), has(uncommon), has(rare), has(gem)];
    run(70); const at70 = [has(uncommon), has(rare), has(gem)];
    run(130); const at130 = [has(rare), has(gem)];
    run(200); const at200 = has(gem);
    run(100000);
    const stays = { epic: has(epic), sealed: has(sealed), sigil: has(sigil), relic: has(relic), own: has(own), chest: has(chest), targeted: has(targeted), key: has(key) };
    // a monster's drops carry the clock
    w.loot.length = 0; p.lootTarget = null;
    for (let i = 0; i < 25; i++) dropLoot(w, { x: p.x + 40, y: p.y + 40, level: 40, rank: 'unique' });
    const gear = w.loot.filter((l) => l.kind === 'item' && l.item.type === 'gear');
    const wrong = gear.filter((l) => (l.item.rarity <= 2 && !l.item.relic && l.item.slot !== 'ring' && !l.fades) || (l.item.rarity >= 3 && l.fades)).length;
    // the hard cap
    w.loot.length = 0;
    const keeper = mk(Object.assign(rollItem(40, { rarity: 4 }), { sealed: false }));
    const firstCommon = mk(rollItem(40, { rarity: 0 }));
    for (let i = 0; i < 400; i++) mk(rollItem(40, { rarity: i % 3 }));
    const cap = { n: w.loot.length, keeper: has(keeper), firstCommon: has(firstCommon) };
    w.loot.length = 0;
    return { at40, at50, at70, at130, at200, stays, gear: gear.length, wrong, cap };
  });
  console.log(JSON.stringify(fade));
  check(fade.at40.every(Boolean), 'all wait 40 seconds');
  check(!fade.at50[0] && fade.at50[1] && fade.at50[2] && fade.at50[3], 'a Common is gone by 50 seconds, the others wait');
  check(!fade.at70[0] && fade.at70[1] && fade.at70[2], 'an Uncommon is gone by 70');
  check(!fade.at130[0] && fade.at130[1], 'a Rare is gone by 130');
  check(!fade.at200, 'a gem is gone by 200');
  for (const k in fade.stays) check(fade.stays[k], `${k} never fades`);
  check(fade.gear > 30 && fade.wrong === 0, `monster gear: lesser fades, Epic and up doesn't (${fade.gear} drops, ${fade.wrong} wrong)`);
  check(fade.cap.n <= 241 && fade.cap.keeper && !fade.cap.firstCommon, `the cap keeps ${fade.cap.n}: the oldest junk goes, a Legendary stays`);

  await browser.close();
  report(errors);
  console.log(fails ? `${fails} FAILED` : 'all ok');
  process.exit(fails || errors.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
