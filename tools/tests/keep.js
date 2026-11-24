// TESSARIEL'S KEEP (docs/TESSARIELS_KEEP.md) in the game: the portal in town, the hall, your other heroes walking and
// talking, the stairs up to the balcony, the Castellan's panel (every tab), a Saga taken and finished, rewards claimed,
// a trade, the Vault, Furnish (a banner and a trophy changed and shown at once), the War Table, the Flame's blessing,
// auto-play walking out, and back to town. Shots: tools/tests/out/keep_*.png.
//   node tools/tests/keep.js [noshots] [mobile]
const { openGame, report } = require('./harness');
const args = process.argv.slice(2), SHOTS = !args.includes('noshots'), MOBILE = args.includes('mobile');
(async () => {
  const { browser, page, errors, shot } = await openGame(MOBILE ? { width: 844, height: 390, mobile: true } : { width: 1440, height: 900 });
  const fail = (m) => { errors.push('[keep] ' + m); console.log('FAIL', m); };
  try {
    // three other heroes on this browser (their gear shows in the hall), then the hero we play
    await page.evaluate(async () => {
      const { newCharData, writeSave } = await import('/src/game/save.js');
      const { rollItem } = await import('/src/data/items.js');
      const mk = (cls, name, lvl, deep, kills) => {
        const c = newCharData(cls, name); c.level = lvl; c.deepest = deep; c.kills = kills; c.lastPlayed = Date.now() - 1000;
        c.equip.body = rollItem(lvl, { slot: 'body', rarity: 4 }); c.equip.head = rollItem(lvl, { slot: 'head', rarity: 3 });
        c.keep = { rec: { clear: { t: 40 + lvl / 3, depth: deep }, raid: { t: 80 + lvl / 2, depth: deep - deep % 5 } } };
        writeSave(c);
      };
      mk('wizard', 'Ysmay', 46, 61, 18400); mk('ranger', 'Corrin', 30, 33, 9200); mk('death_knight', 'Vael', 72, 140, 51000); mk('monk', 'Tamsin', 12, 9, 1300);
      await window.VELSCOUR.game.newChar('paladin', 'Keep QA');
    });
    // town: the keep's portal stands there
    const town = await page.evaluate(async () => {
      const { G, game } = window.VELSCOUR;
      G.char.deepest = 40; G.char.level = 38; G.char.depth = 41;
      game.enterTown();
      const kg = G.world.portals.find((p) => p.keepGate);
      return { kg: kg && [kg.x, kg.y], walk: kg && G.world.map.walkable(kg.x, kg.y) };
    });
    if (!town.kg) fail('no keep portal in town'); else console.log('keep gate in town at', town.kg.map((v) => v.toFixed(1)).join(','));
    if (SHOTS && town.kg) {
      await page.evaluate(([x, y]) => { const { G } = window.VELSCOUR; G.player.x = x + 1.6; G.player.y = y + 1.6; }, town.kg);
      await page.waitForTimeout(900); await shot('keep_town_gate');
    }
    // into the keep
    await page.evaluate(async () => { await window.VELSCOUR.game.enterKeep(); });
    await page.waitForTimeout(1500);
    const info = await page.evaluate(async () => {
      const { G } = window.VELSCOUR, w = G.world, m = w.map;
      const heroes = w.npcs.filter((n) => n.keepHero), L = w.layout;
      // every walkable tile of the floor and the balcony is reachable from the arrival (the stairs work)
      const st = w.anchors.start, bal = [L.anchors.chronicle[0], L.anchors.chronicle[1] + 0.5], fbal = [34.5, 30.5];
      const path = (a, b) => { const r = m.findPath(a[0], a[1], b[0], b[1], 8000); return r ? r.length : -1; };
      return { keep: !!w.keep, props: w.props.length, npcs: w.npcs.length, heroes: heroes.map((h) => h.name + ':' + h.cls), toBalcony: path(st, bal), toFront: path(st, fbal), area: document.querySelector('#hud-area, .hud-area')?.textContent || '' };
    });
    console.log('keep', JSON.stringify(info));
    if (!info.keep) fail('not in the keep');
    if (info.heroes.length !== 4) fail('expected 4 companions, saw ' + info.heroes.length);
    if (info.toBalcony < 0) fail('no way up to the north balcony');
    if (info.toFront < 0) fail('no way to the front (south-east) balcony');
    await page.waitForTimeout(2500);   // the heroes' gear previews come in
    const view = async (name, x, y, wait = 700) => {
      await page.evaluate(([x, y]) => { const { G } = window.VELSCOUR; const { camera } = window.VELSCOUR_CAM || {}; G.player.x = x; G.player.y = y; G.player.path = null; }, [x, y]);
      await page.waitForTimeout(wait);
      if (SHOTS) await shot('keep_' + name);
    };
    await view('arrival', 21, 31.2, 1200);
    await view('flame', 21, 25.5);
    await view('dais', 21, 13.5);
    await view('balcony_n', 21, 7.2);
    await view('balcony_w', 7, 20);
    await view('balcony_front', 34.5, 22);
    await view('stair', 12.5, 10.4);
    // companions move and talk within half a minute of play (sped up)
    const talk = await page.evaluate(async () => {
      const { G } = window.VELSCOUR, w = G.world;
      const p0 = w.npcs.filter((n) => n.keepHero).map((n) => [n.x, n.y]);
      let said = 0, saw = new Set();
      for (let i = 0; i < 900; i++) { w.update(1 / 30); for (const n of w.npcs) if (n.keepHero && n.talkT > 0 && !saw.has(n.talkText)) { saw.add(n.talkText); said++; } }
      const moved = w.npcs.filter((n) => n.keepHero).filter((n, i) => Math.hypot(n.x - p0[i][0], n.y - p0[i][1]) > 1).length;
      return { said, moved, lines: [...saw].slice(0, 6) };
    });
    console.log('companions', JSON.stringify(talk));
    if (talk.moved < 2) fail('companions did not walk');
    if (talk.said < 2) fail('companions did not talk');
    await view('hall_life', 19, 22, 900);
    // the Castellan's panel: take every Saga, finish a chapter, claim, trade, vault, furnish, chronicle, war table
    const panel = await page.evaluate(async () => {
      const { G } = window.VELSCOUR, K = await import('/src/game/keep.js'), UI = G.ui;
      const out = {};
      for (const s of K.sagaList()) if (s.open) K.takeSaga(s.saga.id);
      out.taken = Object.keys(K.keepState().sagas).length;
      for (let i = 0; i < 45; i++) K.keepEvent('kill', 1);   // The Ember's Road, chapter 1: slay 40
      K.keepEvent('socket', 1); K.keepEvent('upgrade', 1);
      out.owed = K.keepState().owed.length;
      const got = K.claimAll();
      out.embers = K.keepState().embers; out.claimed = got[0] && got[0].n;
      K.keepState().embers += 400;
      const before = G.char.bag.filter(Boolean).length;
      const { addToBag } = await import('/src/game/player.js');
      const it = K.buyArmor(2, 'body', G.char, addToBag);
      out.bought = it ? `${it.rarity}@${it.ilvl}` : null; out.bag = G.char.bag.filter(Boolean).length - before;
      K.keepState().vault.marks = 8; out.vault = K.vaultOffer().length;
      // a trophy won, a banner earned: the hall shows them at once
      K.keepState().have.trophy.push('ember_shield', 'elder_gale', 'elder_star'); K.keepState().decor.pedestal[0] = 'ember_shield';
      K.keepState().have.banner.push('holy_azure_sunburst'); K.setDecor('banner', 0, 'holy_azure_sunburst');
      (await import('/src/ui/keep.js')).rebuildDecor();
      out.trophies = G.world.props.filter((p) => p.trophy).length;
      return out;
    });
    console.log('panel', JSON.stringify(panel));
    if (!panel.claimed) fail('no reward claimed for a finished chapter');
    if (!panel.bought || panel.bag !== 1) fail('the Ember trade gave no armour');
    if (panel.vault !== 2) fail('vault offer should hold 2 choices at 8 marks, held ' + panel.vault);
    if (panel.trophies < 3) fail('trophies not shown in the hall: ' + panel.trophies);
    await view('trophies_w', 11.5, 14.5);
    await view('elders', 21, 19.5);
    for (const tab of ['sagas', 'bounties', 'deeds', 'trade', 'vault', 'furnish', 'chronicle', 'war']) {
      await page.evaluate((t) => window.VELSCOUR.G.ui.keep.open(t), tab);
      await page.waitForTimeout(300);
      if (SHOTS && (!MOBILE || ['sagas', 'furnish', 'trade'].includes(tab))) await shot('keep_panel_' + tab);
    }
    await page.evaluate(() => window.VELSCOUR.G.ui.closeAll());
    // the Flame's blessing; a companion sent on an expedition leaves the hall
    const misc = await page.evaluate(async () => {
      const { G } = window.VELSCOUR, K = await import('/src/game/keep.js');
      const gf0 = G.player.st.goldFind; K.kindle(); const gf1 = G.player.st.goldFind;
      const h = G.world.npcs.find((n) => n.keepHero);
      const sent = K.sendExpedition(h.cls, h.lvl, 'escort');
      return { gf0, gf1, sent };
    });
    console.log('misc', JSON.stringify(misc));
    if (!(misc.gf1 > misc.gf0)) fail('Kindled gave no gold find');
    // auto-play walks out to town
    const auto = await page.evaluate(async () => {
      const { G } = window.VELSCOUR, { Auto } = await import('/src/game/autoplay.js');
      Auto.toggle?.(); if (!G.autoplayOn) Auto.on?.();
      for (let i = 0; i < 1200 && G.world.keep; i++) { G.game.update(1 / 30); }
      const r = { left: !G.world.keep, kind: G.world.kind };
      if (G.autoplayOn) Auto.toggle?.();
      return r;
    });
    console.log('auto', JSON.stringify(auto));
    if (!auto.left) fail('auto-play did not leave the keep');
  } catch (e) { fail(e.stack || e.message); }
  await browser.close();
  report(errors);
})();
