// Town life (src/game/townlife.js): the hero arrives by the portal; nobody speaks for the first seconds; at most two
// ambient bubbles (three in an event) near the hero; special events on about a third of visits; every event plays
// to its end without errors; cats and dogs in the lanes, wild things on the outskirts that bolt from the hero;
// shots of an ordinary day, the animals and each event, plus a sheet of every emotion.
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
  if (freq.share < 0.24 || freq.share > 0.47) fail('special events on ' + Math.round(freq.share * 100) + '% of visits (want about 35%)');
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
  // the animals: one of each kind, a minute of town time; tame ones wander, wild ones keep away from the hero
  const zoo = await page.evaluate(() => {
    const { G, game } = window.VELSCOUR;
    G.townEventForce = null; G.townAnimalsForce = { cat: 2, dog: 2, rabbit: 2, rat: 2, deer: 2 }; game.enterTown(); G.townAnimalsForce = undefined;
    const d = G.world.townLife, C = d.t.center, beasts = d.agents.filter((a) => a.animal), start = beasts.map((a) => [a.x, a.y]);
    let closest = 99, poses = new Set();
    const wild = beasts.filter((a) => a.wild);
    for (let i = 0; i < 30 * 60; i++) {
      // the hero strolls toward a wild animal now and then
      if (i % 300 === 0 && wild.length) { const w = wild[(i / 300) % wild.length]; G.player.x = w.x + 1.5; G.player.y = w.y + 1.5; }
      game.update(1 / 30);
      if (i % 300 > 60) for (const a of wild) closest = Math.min(closest, Math.hypot(a.x - G.player.x, a.y - G.player.y));
      for (const a of beasts) if (a.emotionT > 0) poses.add(a.species + ':' + a.emotion);
    }
    const moved = beasts.filter((a, i) => Math.hypot(a.x - start[i][0], a.y - start[i][1]) > 1.5).length;
    // a shot: everyone at the well, the hero a little way off
    beasts.forEach((a, i) => { if (a.busy) d.release(a.busy); a.busy = true; a.goal = a.path = null; a.wild = false; a.x = C.x - 3 + (i % 5) * 1.5; a.y = C.y + 2 + Math.floor(i / 5) * 1.8; a.flip = false; });
    G.player.x = C.x + 1; G.player.y = C.y + 6;
    for (let i = 0; i < 10; i++) game.update(1 / 30);
    return { n: beasts.length, wild: wild.length, moved, closest: +closest.toFixed(1), poses: [...poses] };
  });
  console.log('animals', JSON.stringify(zoo));
  if (zoo.n !== 10) fail('expected 10 animals, got ' + zoo.n);
  if (zoo.moved < 6) fail('the animals hardly moved: ' + zoo.moved + '/10');
  await page.waitForTimeout(400);
  await shot('townlife_animals');
  const { TOWN_EVENTS } = await page.evaluate(async () => ({ TOWN_EVENTS: (await import('/src/game/townlife.js')).TOWN_EVENTS }));
  const all = TOWN_EVENTS;
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
  // auto-play during the royal progress: the hero pays its respects to the royals (watching the procession until they
  // are free), stands still while anyone talks to it, then goes back down through the portal
  await page.evaluate(async () => {
    const { G, game } = window.VELSCOUR;
    const { Auto } = await import('/src/game/autoplay.js');
    G.townEventForce = 'royal'; game.enterTown(); G.townEventForce = null;
    Auto.toggle(true);
    window.__aud = { d: G.world.townLife, town: G.world, Auto, statuses: new Set(), heard: new Set(), visited: new Set(), moved: 0, listenFrames: 0, last: null, minHold: 99, holdT: 0, t: 0, shot: false };
  });
  // run the town until a royal is talking to the hero (pause there for a screenshot), then on to the portal
  const runAudience = (pause) => page.evaluate((pause) => {
    const { G, game } = window.VELSCOUR, A = window.__aud;
    while (A.t < 240 && G.world === A.town && !A.statuses.has('Travelling…')) { // entering the dungeon is async: stop at the portal
      game.update(1 / 30); A.t += 1 / 30;
      if (A.Auto.status) A.statuses.add(A.Auto.status.replace(/ [A-Z].*/, ''));
      for (const s of A.d.scenes) if (s.tag === 'audience') for (const a of s.agents) A.visited.add(a.role);
      const L = G.heroListen, p = G.player;
      if (L) { A.heard.add(L.who.name); A.listenFrames++; A.holdT += 1 / 30; if (A.last && Math.hypot(p.x - A.last[0], p.y - A.last[1]) > 0.02) A.moved++; A.last = [p.x, p.y]; }
      else { if (A.holdT) A.minHold = Math.min(A.minHold, A.holdT); A.holdT = 0; A.last = null; }
      if (pause && L && L.who.royal && L.who.talkT > 1.5) return { paused: L.who.name };
    }
    A.Auto.toggle(false);
    return { statuses: [...A.statuses], heard: [...A.heard], visited: [...A.visited], moved: A.moved, listenFrames: A.listenFrames, minHold: A.minHold, left: G.world !== A.town || A.statuses.has('Travelling…'), t: Math.round(A.t) };
  }, pause);
  const paused = await runAudience(true);
  if (paused.paused) { await page.waitForTimeout(300); await shot('townlife_audience'); console.log('audience shot:', paused.paused); }
  const audience = paused.paused ? await runAudience(false) : paused;
  console.log('auto-play audience', JSON.stringify(audience));
  if (!audience.visited.some((r) => ['king', 'queen'].includes(r))) fail('auto-play never spoke with the King or Queen during the royal progress');
  if (!audience.listenFrames) fail('auto-play never stopped to listen');
  if (audience.moved > 3) fail('hero moved ' + audience.moved + ' times while being spoken to');
  if (audience.minHold < 0.95) fail('hero held still only ' + audience.minHold.toFixed(2) + 's for a bubble');
  if (!audience.left) fail('auto-play never left town after the audience');
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
    const people = [TF[34], TF[0], TF[18], TF[8], TF[47 - 22]];
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
