// Town life (src/game/townlife.js): the hero arrives by the portal; nobody speaks for the first seconds; at most two
// ambient bubbles (three in an event) near the hero; special events on about a quarter of visits; every event plays
// to its end without errors; shots of an ordinary day and of each event, plus a sheet of every emotion.
// node tools/tests/townlife.js [events]   (default: all; 'none' for ordinary days only)
const { openGame, report } = require('./harness');
(async () => {
  const { browser, page, errors, shot } = await openGame({ width: 1600, height: 900 });
  await page.click('text=Heroes'); await page.click('.class-card[data-id="paladin"]'); await page.click('text=Begin');
  await page.waitForTimeout(1500);
  const fail = (m) => { errors.push('[check] ' + m); };
  // arrival and the quiet start
  const arrival = await page.evaluate(() => {
    const { G, game } = window.VELSCOUR;
    const p = G.player, po = G.world.portals[0], d = G.world.townLife, talk = [0];
    while (d.time < 5) { game.update(1 / 30); talk.push(d.agents.filter((a) => a.talkT > 0).length + d.vendors.filter((v) => v.talkT > 0).length); }
    return { fromPortal: Math.hypot(p.x - po.x, p.y - po.y), early: Math.max(...talk) };
  });
  console.log('arrival', JSON.stringify(arrival));
  if (arrival.fromPortal > 5) fail('hero starts ' + arrival.fromPortal.toFixed(1) + ' tiles from the portal');
  if (arrival.early) fail('someone spoke in the first 5 seconds');
  await page.waitForTimeout(400);
  await shot('townlife_arrival');
  // event frequency over many visits
  const freq = await page.evaluate(() => {
    const { G, game } = window.VELSCOUR;
    const kinds = {};
    let n = 0;
    for (let i = 0; i < 160; i++) { game.enterTown(); const k = G.world.townLife.eventKind; if (k) { n++; kinds[k] = (kinds[k] || 0) + 1; } }
    return { share: n / 160, kinds };
  });
  console.log('events per visit', JSON.stringify(freq));
  if (freq.share < 0.15 || freq.share > 0.36) fail('special events on ' + Math.round(freq.share * 100) + '% of visits (want about 25%)');
  // an ordinary day: a two-minute soak with the hero standing on the square; bubble budget near the hero
  const day = await page.evaluate(() => {
    const { G, game } = window.VELSCOUR;
    G.townEventForce = null; game.enterTown();
    const d = G.world.townLife, C = d.t.center;
    G.player.x = C.x + 1.5; G.player.y = C.y + 2.5;
    let maxNear = 0, lines = 0, emotions = new Set(), rooms = 0, prev = new Set();
    for (let i = 0; i < 30 * 120; i++) {
      game.update(1 / 30);
      maxNear = Math.max(maxNear, d.talkingNear());
      for (const a of d.agents) { if (a.talkT > 0 && !prev.has(a)) { lines++; prev.add(a); } if (a.talkT <= 0) prev.delete(a); if (a.emotionT > 0 && a.emotion) emotions.add(a.emotion); }
      rooms = Math.max(rooms, d.agents.filter((a) => a.hidden).length);
    }
    return { maxNear, lines, emotions: [...emotions], visible: d.agents.filter((a) => !a.hidden).length, agents: d.agents.length, scenes: d.scenes.filter((s) => !s.done).length, pieces: d.setPieces.map((s) => s.name) };
  });
  console.log('ordinary day', JSON.stringify(day));
  if (day.maxNear > 2) fail('more than two ambient bubbles near the hero: ' + day.maxNear);
  if (day.lines < 8) fail('the town is too quiet: ' + day.lines + ' lines in two minutes');
  await shot('townlife_day');
  // each special event, stepped to its end, with shots at its height
  const all = ['wedding', 'royal', 'funeral', 'fair', 'brawl', 'tourney', 'alarm', 'birth', 'party', 'caravan', 'wounded', 'lost_child'];
  const which = process.argv[2] === 'none' ? [] : process.argv[2] ? process.argv[2].split(',') : all;
  for (const kind of which) {
    const r = await page.evaluate((kind) => {
      const { G, game } = window.VELSCOUR;
      G.townEventForce = kind; game.enterTown(); G.townEventForce = undefined;
      const d = G.world.townLife, C = d.t.center;
      G.player.x = C.x + 1; G.player.y = C.y + 5.5;
      let maxNear = 0;
      for (let i = 0; i < 30 * 16; i++) { game.update(1 / 30); maxNear = Math.max(maxNear, d.talkingNear()); }
      return { kind: d.eventKind, maxNear };
    }, kind);
    // follow the cast and shoot twice
    for (const [k, secs] of [[1, 6], [2, 14]]) {
      await page.evaluate((secs) => {
        const { G, game } = window.VELSCOUR, d = G.world.townLife;
        for (let i = 0; i < 30 * secs; i++) game.update(1 / 30);
        const cast = d.agents.filter((a) => !a.hidden && a.eventRole && a.eventRole !== 'crowd');
        const busy = cast.length ? cast : d.agents.filter((a) => !a.hidden && a.eventRole);
        if (busy.length) { G.player.x = busy.reduce((s, a) => s + a.x, 0) / busy.length + 1; G.player.y = busy.reduce((s, a) => s + a.y, 0) / busy.length + 3.5; }
        for (let i = 0; i < 10; i++) game.update(1 / 30);
        return cast.map((a) => a.eventRole + '@' + a.x.toFixed(0) + ',' + a.y.toFixed(0)).join(' ');
      }, secs).then((c) => console.log('  ', kind, k, c));
      await page.waitForTimeout(250);
      await shot(`townlife_event_${kind}_${k}`);
    }
    const end = await page.evaluate(() => {
      const { G, game } = window.VELSCOUR, d = G.world.townLife;
      for (let i = 0; i < 30 * 150 && !d.event.done; i++) game.update(1 / 30);
      return { done: d.event.done, t: Math.round(d.time) };
    });
    console.log('event', r.kind, 'bubbles near hero', r.maxNear, 'ended', end.done, 'at', end.t + 's');
    if (r.kind !== kind) fail('event did not start: ' + kind);
    if (r.maxNear > 3) fail(kind + ': ' + r.maxNear + ' bubbles at once');
    if (!end.done) fail(kind + ' never finished');
  }
  // a line-up of every emotion on one townsperson per row
  await page.evaluate(async () => {
    const { G, game } = window.VELSCOUR;
    const { EMOTIONS } = await import('/src/game/townsfolkvisuals.js');
    G.townEventForce = null; game.enterTown();
    const d = G.world.townLife, C = d.t.center;
    for (const a of d.agents) { a.busy = true; d.hide(a); }
    for (const pr of G.world.props) if (Math.hypot(pr.x - C.x - 2, pr.y - C.y - 2) < 9 && pr.spr && !/well/.test(pr.spr.name || '')) pr._hiddenForShot = true;
    G.world.props = G.world.props.filter((p) => !p._hiddenForShot);
    const names = Object.keys(EMOTIONS), TF = (await import('/src/data/townsfolk.js')).TOWNSFOLK;
    const people = [TF[11], TF[0], TF[80], TF[85], TF[84]];
    names.forEach((e, i) => {
      const v = people[i % people.length], a = d.makeAgent(v, C.x - 4 + (i % 8) * 1.4, C.y - 2 + Math.floor(i / 8) * 1.6);
      a.busy = true; a.flip = false; d.feel(a, e, 9999); a.iconT = 9999; a.iconAge = 1; a.name = e;
    });
    G.player.x = C.x + 1; G.player.y = C.y + 5;
    for (let i = 0; i < 20; i++) game.update(1 / 30);
  });
  await page.waitForTimeout(600);
  await shot('townlife_emotions');
  report(errors);
  await browser.close();
})();
