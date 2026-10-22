// Homunculus the Proud in the live town (src/game/homunculus.js): every line wraps into its bubble at the real font,
// his poses load, auto-play stops at the forge for a 3-10 s chat (hero bubbles too) before trading, the axe speaks
// in later chapters (the 3D-baked axe turning on its rack), he hails townsfolk; shots of a chat, the axe talking and the poses.
// node tools/tests/homunculus.js
const { openGame, report } = require('./harness');
(async () => {
  const { browser, page, errors, shot } = await openGame({ width: 1600, height: 900 });
  await page.click('text=Heroes'); await page.click('.class-card[data-id="paladin"]'); await page.click('text=Begin');
  await page.waitForTimeout(1500);
  const fail = (m) => { errors.push('[check] ' + m); };
  // every line fits its bubble at the real font (townspeech.js: 3 lines, 196 px less 24 of padding)
  const fit = await page.evaluate(async () => {
    const H = await import('/src/game/homunculus.js'), D = await import('/src/data/homunculus.js');
    await document.fonts.ready;
    const ctx = document.createElement('canvas').getContext('2d');
    ctx.font = '600 11px "Alegreya Sans", "Segoe UI", sans-serif';
    const rows = (t) => { let n = 1, line = ''; for (const w of t.split(/\s+/)) { const next = line ? line + ' ' + w : w; if (line && ctx.measureText(next).width > 196 - 24) { n++; line = w; } else line = next; } return n; };
    const all = [...H.allLines({ gear: 'leggings', folk: 'Bartholomew', cls: 'Arcane Sorcerer' }), ...D.STORY.flatMap((c) => c.tellings.flat().map((l) => l[1])), ...D.AFTER.flat().map((l) => l[1]), ...D.AXE_MUTTERS.map((m) => m[1])];
    const over = all.filter((t) => rows(t) > 3);
    return { n: all.length, over: over.slice(0, 5), nOver: over.length };
  });
  console.log('bubble fit', JSON.stringify(fit));
  if (fit.nOver) fail(fit.nOver + ' lines need more than three bubble lines: ' + fit.over.join(' / '));
  // auto-play: walk to the forge, chat, then trade
  await page.evaluate(async () => {
    const { G, game } = window.VELSCOUR;
    const { homunculusReady } = await import('/src/gfx/homunculus.js');
    await homunculusReady();
    await (await import('/src/gfx/varrowaxe.js')).varrowAxeReady();
    G.char.gold = 50000;
    G.townEventForce = null; game.enterTown();
    const { Auto } = await import('/src/game/autoplay.js');
    Auto.toggle(true);
    window.__h = { Auto, statuses: new Set(), heroLines: new Set(), hLines: new Set(), poses: new Set(), axe: 0, t: 0, chatT: 0, moved: 0, last: null, town: G.world };
  });
  const run = (until) => page.evaluate((until) => {
    const { G, game } = window.VELSCOUR, S = window.__h, d = G.world.townLife, v = d && d.homunculus, p = G.player;
    for (let i = 0; i < 30 * 200 && G.world === S.town && !S.statuses.has('Travelling…'); i++) {
      game.update(1 / 30); S.t += 1 / 30;
      if (S.Auto.status) S.statuses.add(S.Auto.status.replace(/ — .*/, ''));
      if (p.talkT > 0) S.heroLines.add(p.talkText);
      if (v && v.talkT > 0) S.hLines.add(v.talkText);
      if (v) S.poses.add(v.pose);
      if (d.axe && d.axe.talkT > 0) S.axe++;
      const chatting = d.scenes.some((s) => s.tag === 'homunculus' && !s.done);
      if (chatting) { S.chatT += 1 / 30; if (S.last && Math.hypot(p.x - S.last[0], p.y - S.last[1]) > 0.02) S.moved++; S.last = [p.x, p.y]; } else S.last = null;
      if (until === 'chat' && chatting && p.talkT > 1 && v.talkT <= 0) return { at: 'hero talking' };
      if (until === 'chat' && chatting && v.talkT > 1.5 && S.chatT > 3) return { at: 'homunculus talking' };
    }
    S.Auto.toggle(false);
    return { statuses: [...S.statuses], heroLines: [...S.heroLines], hLines: [...S.hLines].slice(0, 6), poses: [...S.poses], chatT: +S.chatT.toFixed(1), moved: S.moved, left: S.statuses.has('Travelling…'), ch: G.char.homunculus };
  }, until);
  const mid = await run('chat');
  if (mid.at) { await page.waitForTimeout(200); await shot('homunculus_chat'); }
  const r = await run('end');
  console.log('auto-play forge', JSON.stringify(r));
  if (!r.statuses.includes('Chatting with Homunculus')) fail('auto-play never chatted with Homunculus');
  if (!r.heroLines.length) fail('the hero never answered him');
  if (r.chatT < 3 || r.chatT > 10.6) fail('chat lasted ' + r.chatT + ' s (want 3-10)');
  if (r.moved > 2) fail('hero moved during the chat');
  if (r.poses.length < 3) fail('Homunculus barely changed pose: ' + r.poses.join(','));
  if (!r.ch || r.ch.talks !== 1 || r.ch.told[0]?.length !== 1) fail('the first chat should tell the opening of the story');
  if (!r.left) fail('auto-play never went back down');
  // later chapters: the axe speaks (chapter 4, "The Voice"); he hails townsfolk; frost and glow on the rack
  const axe = await page.evaluate(async () => {
    const { G, game } = window.VELSCOUR;
    const H = await import('/src/game/homunculus.js');
    G.char.homunculus = { talks: 8, chapter: 4, told: [[0, 1], [0, 1], [0, 1], [0, 1], [2]], recap: [] };
    game.enterTown();
    const d = G.world.townLife, v = d.homunculus, p = G.player;
    p.x = v.x + 1.4; p.y = v.y + 1.4;
    for (let i = 0; i < 60; i++) game.update(1 / 30);
    const sc = H.homunculusChat(d, v);
    let axeT = 0, hailed = 0;
    for (let i = 0; i < 30 * 12 && !sc.done; i++) { game.update(1 / 30); if (d.axe.talkT > 0) axeT += 1 / 30; if (d.axe.talkT > 1.2 && axeT > 0.8 && axeT < 0.9) break; }
    return { axeT: +axeT.toFixed(1), axeLine: d.axe.talkText, ch: G.char.homunculus.chapter, title: v.vendor.title };
  });
  console.log('chapter 4', JSON.stringify(axe));
  await page.waitForTimeout(200);
  await shot('homunculus_axe');
  if (!axe.axeT) fail('the axe never spoke in a chapter 4 telling');
  const folk = await page.evaluate(() => {
    const { G, game } = window.VELSCOUR, d = G.world.townLife, v = d.homunculus;
    let hails = 0, prev = '';
    for (let i = 0; i < 30 * 120; i++) {
      game.update(1 / 30);
      if (v.talkT > 0 && v.talkText !== prev && d.scenes.some((s) => s.tag === 'homunculus:greet' && !s.done)) { hails++; prev = v.talkText; }
    }
    return { hails, last: prev };
  });
  console.log('townsfolk', JSON.stringify(folk));
  if (!folk.hails) fail('Homunculus never hailed a townsperson in two minutes');
  // his anvil stands by his door in every town
  const anvils = await page.evaluate(() => {
    const { G, game } = window.VELSCOUR, seed0 = G.char.townSeed, out = [];
    for (let s = 1; s <= 20; s++) {
      G.char.townSeed = s * 7717; game.enterTown();
      const d = G.world.townLife, v = d.homunculus, a = d.anvil;
      out.push(a ? +Math.hypot(a.x - v.x, a.y - v.y).toFixed(1) : -1);
    }
    G.char.townSeed = seed0; game.enterTown();
    return out;
  });
  console.log('anvil distance from Homunculus per seed', JSON.stringify(anvils));
  if (anvils.some((r) => r < 0)) fail('no anvil by the forge in ' + anvils.filter((r) => r < 0).length + ' of 20 towns');
  // the 30 poses in a row
  await page.evaluate(async () => {
    const { G, game } = window.VELSCOUR;
    const D = await import('/src/data/homunculus.js');
    const d = G.world.townLife, v = d.homunculus, C = d.t.center;
    for (const a of d.agents) { a.busy = true; d.hide(a); }
    v.update = () => {}; v.talkT = 0;
    const names = Object.keys(D.POSES);
    v.x = C.x; v.y = C.y; v.pose = names[0];
    window.__poseNames = names;
    G.player.x = C.x + 3; G.player.y = C.y + 3;
    for (let i = 0; i < 10; i++) game.update(1 / 30);
  });
  for (const i of [0, 7, 14, 21, 29]) {
    await page.evaluate((i) => { const { G } = window.VELSCOUR, v = G.world.townLife.homunculus; v.pose = window.__poseNames[i]; v.talkText = v.pose; v.talkT = 9; v.talkAge = 1; }, i);
    await page.waitForTimeout(150);
    await shot('homunculus_pose_' + i);
  }
  report(errors);
  await browser.close();
})();
