// THE PIRATE SEAS (docs/PIRATE_SEAS.md): plays a whole sea battle per variant at simulated speed with the hero
// unkillable, clearing the boarders as they land, and checks every phase comes in order: the arrival (Brask's line, the
// bell), five boarding waves of longboats and cutters lying off the port side with the mid-boss after the third, the
// Tide's captain under his title card, the victory chest, Tolland's bell (G.char.seaBells / seaSeen / lastSeaVariant)
// and the bell tower's door as the exit. The cut scenes' camera is checked too: every spoken line frames its speaker.
// Screenshots of each phase go to tools/tests/out/sea_<variant>_*.png.
//   node tools/tests/seabattle.js                       # every scenario (src/data/seabattle.js SEA_SCENARIOS)
//   node tools/tests/seabattle.js across_the_plank      # one, by id (or 2 / 9, by the doc's number)
//   node tools/tests/seabattle.js fleet                 # every FLEET model builds; every deck bakes a walk map ('all fleet': both)
//   node tools/tests/seabattle.js all auto        # auto-play fights instead of the test clearing the deck
//   node tools/tests/seabattle.js all skull       # reach the first battle through Velscour's skull ("sea")
//   node tools/tests/seabattle.js red_tide auto mortal [wizard]   # auto-play alone, a fresh depth-1 hero who can die
// Then the first battle is fought again: its scenes have been seen, so each plays at 20x (and at 1x again with
// Settings > "Don't skip cutscenes"), and a replay rings no bell.
const { openGame, report } = require('./harness');
const arg = process.argv[2] || 'all';
const auto = process.argv.includes('auto'), skull = process.argv.includes('skull'), mortal = auto && process.argv.includes('mortal');
const cls = ['wizard', 'paladin', 'gunner', 'ranger', 'necromancer', 'bard', 'death_knight'].find((c) => process.argv.includes(c)) || 'paladin';

(async () => {
  const { browser, page, errors, shot } = await openGame({ width: 1280, height: 720 });
  const fails = [];
  const SC = await page.evaluate(async () => (await import('/src/data/seabattle.js')).SEA_SCENARIOS.map((v) => [v.id, v.number]));
  const ALL = SC.map((q) => q[0]);
  const ids = arg === 'all' ? ALL : arg === 'fleet' ? [] : arg.split(',').map((a) => (SC.find((q) => String(q[1]) === a) || [a])[0]);
  const O = await page.evaluate(async () => { const m = await import('/src/world/seaship.js'); return { OX: m.OX, OY: m.OY }; });
  await page.evaluate(async ([mortal, cls]) => {
    const { G, game } = window.VELSCOUR;
    await game.newChar(cls, 'Saltwyn');
    G.godMode = !mortal;
    G.settings.noSkipCine = true;   // every battle at 1x (the end checks the 20x replay)
  }, [mortal, cls]);
  /** Run the game `sec` simulated seconds (30 updates a second), clearing landed boarders unless auto-play fights;
   * stops early when `until` (a phase name, or 'cine') is reached. Returns the run's state. */
  const run = (sec, until = null, clear = !auto) => page.evaluate(async ([sec, until, clear]) => {
    const { G, game } = window.VELSCOUR;
    const { kill } = await import('/src/game/combat.js');
    const { Cine } = await import('/src/game/cinema.js');
    const { camera } = await import('/src/core/view.js');
    const cam = (window.__seaCam ||= { lines: 0, miss: [] });
    // the speaker's face well inside the frame between the letterbox bars (the Sky Battle's rule, held tighter: no one cropped at an edge)
    const inFrame = ([x, y]) => { const [sx, sy] = camera.toScreen(x, y), bar = G.H * 0.13; return sx > G.W * 0.2 && sx < G.W * 0.8 && sy > bar + 30 && sy < G.H - bar - 50; };
    const seen = (window.__seaSeen ||= new Set());
    if (camera.leadX || camera.leadY) { camera.leadX = camera.leadY = 0; camera.computeZoom(); }
    for (let i = 0; i < sec * 30; i++) {
      G.time += 1 / 30; game.update(1 / 30);
      const r = G.world.seaRun;
      if (!r) break;
      if (G.cine) {
        const L = Cine.line, st = Cine.steps[Cine.i];
        if (L && L.focus && st && st.say && !st._checked && L.t >= st.dur * 0.6) { st._checked = true; cam.lines++; if (!inFrame(L.focus())) cam.miss.push(`${r.phase}: ${L.name} "${L.text.slice(0, 30)}"`); }
        if (Cine.card) seen.add('card:' + Cine.card.title);
        if (L) seen.add('say:' + L.name);
      }
      seen.add(r.phase + (r.phase === 'waves' ? r.wave : ''));
      for (const b of G.world.seaState.boats) { seen.add('boat:' + b.kind); if (b.st === 'dock') seen.add('docked:' + b.kind); }
      const pip = G.world.npcs.find((n) => n.name === 'Pip Gannet'); if (pip && pip.talkT > 0) seen.add('bark:' + pip.talkText);
      if (clear && !G.cine && i % 10 === 0) for (const m of G.world.creatures) if (m.sea && !m.dead && !m.entering && m.team === 'enemy') kill(m, G.player);
      if (!window.__mortal && G.player.hp < G.player.maxHp * 0.5) G.player.hp = G.player.maxHp;
      if (until && (r.phase === until || (until === 'cine' && G.cine) || (until === 'docked' && G.world.seaState.boats.some((b) => b.st === 'dock' && b.crew.length)))) break;
    }
    game.render();
    const r = G.world.seaRun, S = G.world.seaState, exit = G.world.portals.find((q) => q.type === 'exit');
    return r ? { phase: r.phase, wave: r.wave, cine: !!G.cine, boats: S.boats.length, docked: S.boats.filter((b) => b.st === 'dock').length, foes: G.world.creatures.filter((m) => m.sea && !m.dead).length,
      exit: exit && exit.active, chest: !!r.chest, completed: r.completed, bell: r.bell, bells: G.char.seaBells, won: { ...G.char.seaSeen }, last: G.char.lastSeaVariant } : { gone: true, biome: G.world.biome.id, deaths: G.char.deaths, won: {} };
  }, [sec, until, clear]);
  /** Point the camera at tile (x, y) (zoom times the game's) and draw a frame. */
  const look = (x, y, zoom = 1, lv = 0) => page.evaluate(async ([x, y, zoom, lv]) => {   // the camera's lead holds it there until the next run()
    const { G } = window.VELSCOUR, { camera, isoX, isoY } = await import('/src/core/view.js'), p = G.player;
    camera.leadX = isoX(x, y) - isoX(p.x, p.y); camera.leadY = isoY(x, y) - lv * 4 - isoY(p.x, p.y); camera.follow(p.x, p.y, 0, true);
    camera.computeZoom(); camera.zoom *= zoom; window.VELSCOUR.game.render();
  }, [x, y, zoom, lv]);
  const expect = (ok, what) => { if (!ok) { fails.push(what); console.log('  FAIL', what); } };

  // the fleet: every model spawnShip knows builds, and every deck bakes into a walk map (on a scratch map)
  if (process.argv.includes('fleet') || arg === 'fleet') {
    const fl = await page.evaluate(async () => {
      const { G, game } = window.VELSCOUR;
      const { BIOME_BY_ID } = await import('/src/data/biomes.js');
      G.char.seaVariant = null; await game.teleportToBiome(BIOME_BY_ID.pirate_seas);
      const F = await import('/src/gfx/seabattle3d.js'), W = await import('/src/world/seaship.js'), { TileMap } = await import('/src/world/map.js');
      const kinds = Object.keys(F.FLEET).filter((k) => k !== 'dawnwake');
      await F.loadFleet(kinds);
      const out = {};
      for (const k of kinds) {
        try {
          const deck = ['galleon', 'dreadnought', 'carrier', 'tender', 'lightship', 'reef', 'brig', 'hulk', 'grappler'].includes(k);   // (the wreck's tilted deck needs walk data first: docs)
          const h = F.spawnShip(k, { deck }); h.place(W.OX + 400, W.OY, 0);
          let walk = null;
          if (deck) { const b = h.bake(), m = new TileMap(b.x0 + b.w + 2, b.z0 + b.h + 2); m.hgt = new Int16Array(m.w * m.h); m.deck = new Uint8Array(m.w * m.h);
            const lv = [0, h.info.walk?.QH, h.info.walk?.FH, h.info.walk?.QD_H, h.info.walk?.FC_H, ...(h.info.decks || []).map((d) => d.y), h.info.deck?.y, h.info.bossDeck?.y].filter((q) => typeof q === 'number').map((q) => q + h.deckY);
            walk = W.applyDeck(m, b, 2, { levels: k === 'reef' || k === 'wreck' ? null : lv.length ? lv : [h.deckY] }).walkN; }
          out[k] = { ok: true, walk, crew: (h.info.crew || []).length, air: h.air ?? null };
          h.remove();
        } catch (e) { out[k] = { ok: false, err: String(e.message || e).slice(0, 120) }; }
      }
      return out;
    });
    for (const [k, r] of Object.entries(fl)) { console.log(`  fleet ${k}: ${JSON.stringify(r)}`); expect(r.ok, `fleet: ${k} builds (${r.err || ''})`); if (r.walk != null) expect(r.walk > 10, `fleet: ${k} bakes a walkable deck (${r.walk})`); }
    if (arg === 'fleet') { if (fails.length) { console.log(`${fails.length} FAILED`); process.exitCode = 1; } else console.log('ALL OK'); report(errors); await browser.close(); return; }
  }
  let first = true;
  for (const id of ids) {
    console.log(`--- ${id}`);
    await page.evaluate(async ([id, auto, skull]) => {
      const { G, game } = window.VELSCOUR;
      const { BIOME_BY_ID } = await import('/src/data/biomes.js');
      G.char.depth = auto ? 1 : 12;   // auto-play fights it for real: a fresh hero at depth 1
      if (skull) {   // through Velscour's skull, as a player would: "sea <variant>"
        G.char.depth = auto ? 1 : 12;
        game.openVelscourContact();
        document.getElementById('velscour-message').value = `sea ${id}`;
        [...document.querySelectorAll('.velscour-contact-dialog button')].find((b) => b.textContent === 'Send').click();
        for (let t = 0; t < 200 && !(G.world && G.world.seaRun && G.world.seaRun.variant.id === id); t++) await new Promise((r) => setTimeout(r, 100));
      } else { G.char.seaVariant = id; await game.teleportToBiome(BIOME_BY_ID.pirate_seas); }
      if (auto) { const { Auto } = await import('/src/game/autoplay.js'); Auto.toggle(true); }   // the teleport turned it off
    }, [id, auto, skull]);
    await page.evaluate((m) => { window.__mortal = m; }, mortal);
    let s = await run(0.1);
    expect(s.phase === 'intro', `${id}: starts with the arrival (${JSON.stringify(s)})`);
    s = await run(1.5); await shot(`sea_${id}_arrival`);
    s = await run(9.6); await shot(`sea_${id}_gate`);
    s = await run(4.0); await shot(`sea_${id}_brask`);
    s = await run(30, 'waves');
    expect(s.phase === 'waves', `${id}: the arrival ends in the waves (${s.phase})`);
    // the arena: every deck the scenario added has walkable ground, and the hero can walk to it once it's joined
    s = await run(4, null, false);
    const ar = await page.evaluate(async () => {
      const { G } = window.VELSCOUR, A = G.world.seaRun && G.world.seaState, run = G.world.seaRun, m = G.world.map, p = G.player;
      const api = run._api || null, st = (G.world.seaRun.state) || {};
      const decks = (window.VELSCOUR.G.world.seaRun.api && window.VELSCOUR.G.world.seaRun.api.decks) || [];
      const reach = decks.map((d) => { const t = d.tile(0, 0); const path = m.findPath(p.x, p.y, t[0], t[1], 40000); return { id: d.id, walkN: d.walkN, path: !!path }; });
      return { decks: reach, meter: run.meter && run.meter.label };
    });
    console.log(`  arena: ${JSON.stringify(ar)}`);
    for (const d of ar.decks) { expect(d.walkN > 30, `${id}: deck ${d.id} has walkable ground (${d.walkN})`); expect(d.path, `${id}: the hero can cross to deck ${d.id}`); }
    if (id === 'across_the_plank') {
      expect(ar.meter && ar.decks.length === 1, `${id}: her brig is a deck and her broadside has its meter (${JSON.stringify(ar)})`);
      // the plank is down with the first wave: the hero can walk over it and up her stairs to her helm
      const helm = await page.evaluate(() => { const { G } = window.VELSCOUR, st = G.world.seaRun.api.state, m = G.world.map, p = G.player, q = m.randomNear(st.helm[0], st.helm[1], 1.5);
        return { corvus: st.corvus.isOpen, gunners: st.gunners.filter((g) => !g.dead).length, path: !!m.findPath(p.x, p.y, q[0], q[1], 60000) }; });
      console.log(`  plank: ${JSON.stringify(helm)}`);
      expect(helm.corvus && helm.path, `${id}: over the corvus and up to her helm (${JSON.stringify(helm)})`);
      await shot(`sea_${id}_corvus`);
    }
    if (id === 'red_tide') {
      const r9 = await page.evaluate(async () => {
        const st = window.VELSCOUR.G.world.seaRun.api.state, before = st.idol.hp;
        st.lever.use(); for (let i = 0; i < 60; i++) { window.VELSCOUR.G.time += 1 / 30; window.VELSCOUR.game.update(1 / 30); }
        return { idol: !!st.idol, hit: st.idol.hp < before, charges: st.charges, drowned: [...window.VELSCOUR.G.world.seaRun.api.live].filter((m) => m.drowned).length };
      });
      console.log(`  red tide: ${JSON.stringify(r9)}`);
      expect(r9.idol && r9.hit && r9.charges === 1, `${id}: the gun lever fires on the idol (${JSON.stringify(r9)})`);
      await shot(`sea_${id}_idol`);
    }
    const step = (sec) => page.evaluate((sec) => { const { G, game } = window.VELSCOUR; for (let i = 0; i < sec * 30; i++) { G.time += 1 / 30; game.update(1 / 30); } game.render(); }, sec);
    if (id === 'gullwrack_light') {
      // the lightship lashed to port by the plank; her beam turns; a common boarder runs for the plank (not the hero),
      // shrouded out of the beam; a climber at the gallery puts the lamp out (another wave), relit from the ladder's foot
      const g1 = await page.evaluate(() => {
        const { G, game } = window.VELSCOUR, api = G.world.seaRun.api, S = api.state, m = G.world.map, p = G.player, q = m.randomNear(S.foot[0], S.foot[1], 1.2);
        const ang = () => Math.atan2(S.B[3], S.B[2]), a0 = ang();
        const r = window.__gwr = api.spawnOnDeck(null, 'normal', api.tileOf(-3.5, 9), 0), d0 = Math.hypot(r.x - S.head[0], r.y - S.head[1]);
        p.x = api.OX + 3; p.y = api.OY - 2;
        let lit = 0, dim = 0;
        for (let i = 0; i < 75; i++) { G.time += 1 / 30; game.update(1 / 30); if (r.ward > 1) lit++; else if (r.ward < 0.5) dim++; }
        const a1 = ang();
        return { plank: S.plank.isOpen, path: !!m.findPath(p.x, p.y, q[0], q[1], 60000), turned: +Math.abs(Math.atan2(Math.sin(a1 - a0), Math.cos(a1 - a0))).toFixed(2), runner: !!r.runner, closer: +(d0 - Math.hypot(r.x - S.head[0], r.y - S.head[1])).toFixed(1), lit, dim };
      });
      console.log(`  gullwrack: ${JSON.stringify(g1)}`);
      expect(g1.plank && g1.path && g1.turned > 0.5, `${id}: the plank to the lightship, her ladder reachable, the beam turning (${JSON.stringify(g1)})`);
      expect(g1.runner && g1.closer > 2 && g1.dim > 0, `${id}: a common boarder runs for the plank, shrouded out of the beam (${JSON.stringify(g1)})`);
      const g2 = await page.evaluate(() => {
        const { G, game } = window.VELSCOUR, api = G.world.seaRun.api, S = api.state, r = window.__gwr, n0 = G.world.seaRun.variant.waves.length;
        r.x = S.foot[0]; r.y = S.foot[1]; r.runner.i = 3; r.runner.climb = 0.97; r.runner.engT = 0;
        for (let i = 0; i < 15; i++) { G.time += 1 / 30; game.update(1 / 30); }
        const dark = !S.lit, more = G.world.seaRun.variant.waves.length - n0;
        api.kill(r); G.player.x = S.foot[0]; G.player.y = S.foot[1] + 0.3;
        for (let i = 0; i < 75; i++) { G.time += 1 / 30; game.update(1 / 30); }
        return { dark, more, relit: S.lit };
      });
      console.log(`  gullwrack lamp: ${JSON.stringify(g2)}`);
      expect(g2.dark && g2.more === 1 && g2.relit, `${id}: a climber at the gallery puts the lamp out (another wave); relit from the ladder (${JSON.stringify(g2)})`);
      await look(...(await page.evaluate(() => window.VELSCOUR.G.world.seaRun.api.state.head)), 1, 0); await shot(`sea_${id}_plank`);
    }
    if (id === 'lashed_together') {
      // three tenders lashed abeam to starboard, a plank to the first and a leap across the lashings; boarders go for
      // the keepers while the hero is away; a crew wiped is a tender lost (a lighter chest)
      const t1 = await page.evaluate(async () => {
        const { G, game } = window.VELSCOUR, api = G.world.seaRun.api, S = api.state, m = G.world.map, p = G.player;
        const { Auto } = await import('/src/game/autoplay.js'), wasAuto = Auto.on; if (wasAuto) Auto.toggle(false);   // (the walk is the test's)
        const reach = S.t.map((T) => { const q = m.randomNear(T.posts[0][0], T.posts[0][1], 1); return !!(q && m.findPath(p.x, p.y, q[0], q[1], 60000)); });
        const [a, b] = S.gaps[0]; p.x = a[0] - 1.2; p.y = a[1]; let hop = 0;
        for (let i = 0; i < 75; i++) { p.moveTarget = [b[0] + 1.2, b[1]]; p.path = null; G.time += 1 / 30; game.update(1 / 30); hop = Math.max(hop, p.z || 0); }
        const across = m.deck[m.tileIdx(p.x, p.y)] === S.t[1].deck.id;
        if (wasAuto) Auto.toggle(true);
        const sails = S.t.every((T) => { let ok = true; T.h.ship.root.traverse((o) => { if (o.isMesh && /sail/.test(o.name) && !o.material.transparent) ok = false; }); return ok; });
        p.x = api.OX + 3; p.y = api.OY - 2; G.player.hp = G.player.maxHp;
        S.time = 99; S.t[2].hp = 0; const k0 = G.world.seaRun.rewardK;
        for (let i = 0; i < 30; i++) { G.time += 1 / 30; game.update(1 / 30); }
        return { tenders: S.t.length, reach, hop: Math.round(hop), across, sails, keepers: S.t.reduce((n, T) => n + T.keepers.length, 0), lost: S.t[2].lost, reward: +(k0 - G.world.seaRun.rewardK).toFixed(2) };
      });
      console.log(`  lashed: ${JSON.stringify(t1)}`);
      expect(t1.tenders === 3 && t1.reach.every(Boolean) && t1.keepers === 6, `${id}: three tenders lashed, every deck reached, their keepers aboard (${JSON.stringify(t1)})`);
      expect(t1.hop > 10 && t1.across && t1.sails, `${id}: the hero leaps the lashing to the next deck; their sails fade (${JSON.stringify(t1)})`);
      expect(t1.lost && t1.reward > 0.1, `${id}: a crew wiped loses the tender and lightens the chest (${JSON.stringify(t1)})`);
      const T0 = await page.evaluate(() => window.VELSCOUR.G.world.seaRun.api.state.t[1].mid);
      await look(T0[0], T0[1], 0.85, 0); await shot(`sea_${id}_convoy`);
    }
    if (id === 'three_chains') {
      // her three chains hold the rail and the haul meter runs; a climber comes over one; cut it and he drops into the
      // sea; the haul full grounds her (the view lists, another wave, a lighter chest)
      const st0 = await page.evaluate(() => { const S = window.VELSCOUR.G.world.seaRun.api.state; return { live: S.chains.filter((c) => c.live && c.m).length, meter: !!S.meter }; });
      let rider = null;
      for (let k = 0; k < 60 && !rider; k++) { await step(0.25); rider = await page.evaluate(() => { const m = [...window.VELSCOUR.G.world.seaRun.api.state.riders].find((q) => q.onChain && q.z < -10); return m ? [m.x, m.y] : null; }); }
      if (rider) { await look(rider[0] + 1, rider[1], 1, 0); await shot(`sea_${id}_chains`); }
      const r3 = await page.evaluate(async () => {
        const { G, game } = window.VELSCOUR, S = G.world.seaRun.api.state, { kill } = await import('/src/game/combat.js');
        const ch = S.chains.find((c) => c.live && c.m && [...S.riders].some((m) => m.onChain === c)) || S.chains.find((c) => c.live && c.m), rider = [...S.riders].find((m) => m.onChain === ch);
        kill(ch.m, G.player); for (let i = 0; i < 40; i++) { G.time += 1 / 30; game.update(1 / 30); }
        const cut = !ch.live, dropped = rider ? rider.dead : null, waves0 = G.world.seaRun.variant.waves.length;
        S.meter.set(1); for (let i = 0; i < 60; i++) { G.time += 1 / 30; game.update(1 / 30); } game.render();
        return { cut, dropped, grounded: S.grounded, tf: G.canvas.style.transform, reward: G.world.seaRun.rewardK, wave: G.world.seaRun.variant.waves.length - waves0 };
      });
      console.log(`  three chains: ${JSON.stringify(st0)} ${JSON.stringify(r3)}`);
      expect(st0.live === 3 && st0.meter, `${id}: three chains hold her rail and the haul runs (${JSON.stringify(st0)})`);
      expect(r3.cut && r3.dropped !== false, `${id}: a chain is cut and its climber drops (${JSON.stringify(r3)})`);
      expect(r3.grounded && /rotate/.test(r3.tf) && r3.reward < 1 && r3.wave === 1, `${id}: the haul full grounds her (${JSON.stringify(r3)})`);
      await shot(`sea_${id}_aground`);
    }
    if (id === 'harpoon_weather') {
      // a cutter lies off and its harpoon comes taut: the view heels and the hero slides to port; an airship lets
      // boarders down on ropes; the line cut, she comes back up
      for (let k = 0; k < 80; k++) { if (await page.evaluate(() => window.VELSCOUR.G.world.seaRun.api.state.lines.some((L) => L.live && L.m))) break; await step(0.25); }
      const h5 = await page.evaluate(() => { const { G, game } = window.VELSCOUR, R = G.world.seaRun, S = R.api.state, p = G.player; p.x = R.api.OX + 2.5; p.y = R.api.OY + 6.5; const x0 = p.x;   // out on her open main deck
        for (let i = 0; i < 60; i++) { G.time += 1 / 30; game.update(1 / 30); } game.render();
        const L = S.lines.find((q) => q.live); return { lines: S.lines.filter((q) => q.live).length, heel: +S.heel.toFixed(2), tf: G.canvas.style.transform, slid: +(x0 - p.x).toFixed(2), at: L && L.land, debris: S.debris.length }; });
      console.log(`  harpoon: ${JSON.stringify(h5)}`);
      expect(h5.lines >= 1 && h5.heel > 0.5 && /rotate/.test(h5.tf) && (auto || h5.slid > 0.2), `${id}: a taut line heels her and the hero slides to port (${JSON.stringify(h5)})`);
      expect(h5.debris > 0, `${id}: loose gear slides downhill (${h5.debris})`);
      // the tilted view's pointer: a point on the screen reaches the game as the canvas pixel under it
      const aim = await page.evaluate(async () => {
        const { G } = window.VELSCOUR, { input } = await import('/src/core/input.js'), S = G.world.seaRun.api.state, c = G.canvas, r = c.getBoundingClientRect();
        const px = G.W * 0.85, py = G.H * 0.2;   // where the canvas pixel (qx, qy) now shows on screen: the browser's own mapping
        const m = new DOMMatrix(getComputedStyle(c).transform), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        const scr = m.transformPoint(new DOMPoint(px - G.W / 2, py - G.H / 2)); const sx = cx + scr.x, sy = cy + scr.y;
        c.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: sx, clientY: sy, pointerType: 'mouse', pointerId: 1 }));
        return { deg: S.viewDeg, err: +Math.hypot(input.mouse.x - px, input.mouse.y - py).toFixed(2) };
      });
      console.log(`  aim: ${JSON.stringify(aim)}`);
      expect(aim.err < 1.5, `${id}: the pointer is mapped back through the tilt (${JSON.stringify(aim)})`);
      if (h5.at) { await look(h5.at[0] - 3, h5.at[1], 0.95, 0); await shot(`sea_${id}_line`); }
      let air = null;
      for (let k = 0; k < 120 && !air; k++) { await step(0.25); air = await page.evaluate(() => { const a = window.VELSCOUR.G.world.seaRun.api.state.ships.find((q) => q.ropes.length); return a ? a.hover : null; }); }
      if (air) { await step(0.3); await look(air[0] + 1, air[1] + 1.5, 0.9, 0); await shot(`sea_${id}_airship`); }
      expect(!!air, `${id}: an airship lets boarders down on ropes`);
      const c5 = await page.evaluate(async () => {
        const { G, game } = window.VELSCOUR, S = G.world.seaRun.api.state, { kill } = await import('/src/game/combat.js');
        for (const L of S.lines) if (L.live && L.m) kill(L.m, G.player);
        for (let i = 0; i < 90; i++) { G.time += 1 / 30; game.update(1 / 30); }
        for (const m of G.world.creatures) if (m.sea && !m.dead && !m.entering && m.team === 'enemy') kill(m, G.player);   // (the deck cleared: the next wave's boat comes for the check below)
        const R = G.world.seaRun; return { heel: +S.heel.toFixed(2), live: S.lines.filter((q) => q.live).length, wave: R.wave, phase: R.phase, boats: G.world.seaState.boats.map((q) => q.kind + ':' + q.st + ':' + q.crew.length), foes: [...R.api.live].filter((m) => !m.dead).map((m) => (m.wave) + (m.entering ? 'e' : '')), timers: R.timers.map((q) => q[2]) };
      });
      console.log(`  lines cut: ${JSON.stringify(c5)}`);
      expect(c5.heel < 0.6, `${id}: her lines cut, she comes back up (${JSON.stringify(c5)})`);
    }
    if (id === 'fire_below') {
      // the galleon is the arena: over the gangway, up her quarterdeck flights to Veyl's spot and up her forecastle; her
      // bombers lob fire onto the planks; a fire-bucket station douses its half of the waist
      const r4 = await page.evaluate(async () => {
        const { G, game } = window.VELSCOUR, api = G.world.seaRun.api, st = api.state, m = G.world.map, p = G.player;
        const to = (lx, lz) => { const q = m.randomNear(...st.deck.tile(lx, lz), 1.2); return !!(q && m.findPath(p.x, p.y, q[0], q[1], 60000)); };
        const out = { gang: st.gang.isOpen, qd: to(0, 14.4), fc: to(0, -17), bombers: st.bombers.filter((b) => !b.dead).length, veyl: !!st.veyl };
        for (let i = 0; i < 30 * 14 && !st.fires.size; i++) { G.time += 1 / 30; game.update(1 / 30); }
        out.fires = st.fires.size;
        const b = st.buckets.reduce((a, o) => { const n = [...st.fires.values()].filter((c) => Math.hypot(c.x - o.x, c.y - o.y) < 6).length; return !a || n > a.n ? { o, n } : a; }, null);
        out.near = b.n; b.o.use(); out.after = [...st.fires.values()].filter((c) => Math.hypot(c.x - b.o.x, c.y - b.o.y) < 6).length; out.cd = b.o.cd > 0;
        return out;
      });
      console.log(`  galleon: ${JSON.stringify(r4)}`);
      expect(r4.gang && r4.qd && r4.fc, `${id}: over the gangway and up both her raised decks (${JSON.stringify(r4)})`);
      expect(r4.bombers >= 2 && r4.veyl, `${id}: her bombers at their posts, Veyl on her quarterdeck (${JSON.stringify(r4)})`);
      expect(r4.fires > 0 && r4.near > 0 && r4.after === 0 && r4.cd, `${id}: cinderbombs light her planks and the buckets douse them (${JSON.stringify(r4)})`);
      s = await run(6, null, false);
      const gal = await page.evaluate(() => window.VELSCOUR.G.world.seaRun.api.state.deck.tile(0, 2));
      await look(gal[0], gal[1], 1, 0); await shot(`sea_${id}_waist`);
      const qd = await page.evaluate(() => window.VELSCOUR.G.world.seaRun.api.state.deck.tile(0, 11));
      await look(qd[0], qd[1], 1, 20); await shot(`sea_${id}_quarterdeck`);
    }
    {   // a scenario's own checks in tools/tests/sea_<id>.js (module.exports = async ({ page, run, look, shot, expect, auto }) => state)
      let ext = null; try { ext = require(`./sea_${id}.js`); } catch (e) { if (e.code !== 'MODULE_NOT_FOUND') throw e; }
      if (ext) s = (await ext({ page, run, look, shot, expect, auto, mortal, id, O })) || s;
    }
    // the first boat lies off the port side and its boarders cross: look at the port side (a scenario fought on her own deck may bring none)
    const boats = await page.evaluate(() => window.VELSCOUR.G.world.seaRun.variant.waves.some((w) => w.boats));
    if (boats) {
      s = await run(20, 'docked', false); s = await run(0.9, null, false);
      const boat = await page.evaluate(() => { const b = window.VELSCOUR.G.world.seaState.boats.find((q) => q.st === 'dock'); return b && [b.x, b.y, b.kind]; });
      const was = await page.evaluate(() => [...window.__seaSeen].some((q) => q.startsWith('docked:')));   // (an empty deck hurries the first boat in: it may have come and gone already)
      expect(!!boat || was, `${id}: a boat lies alongside`);
      // framed between the boat and her port rail, at the game's zoom
      if (boat) { await look((boat[0] + O.OX - 5) / 2, boat[1] + 1, 0.95, 0); await shot(`sea_${id}_boarding`); }
      s = await run(1.2, null, false); if (boat) { await look((boat[0] + O.OX - 5) / 2, boat[1] + 1, 0.95, 0); await shot(`sea_${id}_boarding2`); }
    }
    if (id === 'sea_coming_over') {
      // a sea comes over a lane: a boarder standing in it goes over the lee rail; the hero in it goes over and is hauled
      // back aboard; braced at the lane's mast the hero holds on
      const sea = (lane, hero, foe) => page.evaluate(async ([lane, hero, foe]) => {
        const { G, game } = window.VELSCOUR, api = G.world.seaRun.api, st = api.state, p = G.player, tick = (n) => { for (let i = 0; i < n; i++) { G.time += 1 / 30; game.update(1 / 30); } };
        const { camera } = await import('/src/core/view.js'); camera.leadX = camera.leadY = 0; camera.computeZoom();
        for (const m of G.world.creatures) if (m.sea && !m.dead && m.team === 'enemy' && !m.captain) api.kill(m);
        for (let i = 0; i < 300 && st.sea; i++) tick(1);
        st.forceLane = lane; st.seaT = 0; for (let i = 0; i < 300 && !(st.sea && st.sea.ph === 'tele'); i++) tick(1);
        const q = st.sea, z = api.OY + q.z;
        if (foe) { const m = api.spawnOnDeck(null, 'normal', [api.OX + 2.2, z], 99); m.static = true; }
        p.x = api.OX + hero[0]; p.y = z + hero[1]; p.moveTarget = null;
        tick(Math.round(30 * 1.5)); game.render();
        return { lane: q.z, ph: q.ph };
      }, [lane, hero, foe]);
      const after = () => page.evaluate(() => { const { G } = window.VELSCOUR, st = G.world.seaRun.api.state, p = G.player, m = G.world.map;
        return { over: !!st.over, seas: st.seas, deck: m.walkable(p.x, p.y), meter: G.world.seaRun.meter && +G.world.seaRun.meter.value.toFixed(2),
          thrown: st.thrown || 0 }; });
      await sea(1, [-3.0, 0.2], true); await shot(`sea_${id}_lane`);
      s = await run(2.1, null, false); await shot(`sea_${id}_sweep`);
      s = await run(0.5, null, false);
      const a1 = await after(); await shot(`sea_${id}_overboard`);
      s = await run(1.0, null, false); await shot(`sea_${id}_haul`);
      s = await run(2.0, null, false); const a2 = await after();
      console.log(`  sea 1: ${JSON.stringify(a1)} then ${JSON.stringify(a2)}`);
      expect((a1.over || auto) && a1.thrown >= 1, `${id}: the sea takes a boarder and the hero over the side (auto-play steps out of the lane) (${JSON.stringify(a1)})`);
      expect(!a2.over && a2.deck, `${id}: the hero is hauled back aboard (${JSON.stringify(a2)})`);
      await sea(2, [0.9, 0.4], false); s = await run(3.0, null, false);
      const a3 = await after();
      console.log(`  sea 2 (braced): ${JSON.stringify(a3)}`);
      expect(!a3.over && a3.deck, `${id}: braced at the mast the hero holds on (${JSON.stringify(a3)})`);
    }
    let shotMid = false;
    for (let k = 0; k < (auto ? 400 : 80) && s.phase !== 'finalIntro' && s.phase !== 'final'; k++) {
      s = await run(2, 'finalIntro');
      if (s.phase === 'mid' && !shotMid) {   // the captain aboard his cutter under his card, then swinging over
        shotMid = true;
        for (let j = 0; j < 60; j++) { s = await run(0.2, null, false); if (await page.evaluate(async () => { const { Cine } = await import('/src/game/cinema.js'); return !!(Cine.card && Cine.card.t > 1); })) break; }
        await shot(`sea_${id}_midboss_card`);
        for (let j = 0; j < 60; j++) { s = await run(0.1, null, false); if (await page.evaluate(() => { const m = window.VELSCOUR.G.world.seaRun.midM; return !!(m && m.entering && m.z > 40); })) break; }
        await shot(`sea_${id}_midboss_swing`);
      }
    }
    const seen = await page.evaluate(() => [...window.__seaSeen]);
    expect([0, 1, 2, 3, 4].every((w) => seen.includes('waves' + w)), `${id}: all five waves came (${seen.filter((q) => q.startsWith('waves')).join(',')})`);
    const hasMid = await page.evaluate(() => !!window.VELSCOUR.G.world.seaRun.variant.mid_boss);   // (the finale has none)
    expect(seen.includes('mid') || !hasMid, `${id}: the mid-boss came`);
    expect(!boats || seen.includes('docked:longboat') || seen.includes('docked:cutter'), `${id}: boats lay alongside`);
    expect(s.phase === 'finalIntro', `${id}: the Tide's captain comes (${s.phase})`);
    // his title card and his line
    for (let k = 0; k < 40; k++) { s = await run(0.25); const c = await page.evaluate(async () => { const { Cine } = await import('/src/game/cinema.js'); return Cine.card && Cine.card.t > 0.8 ? Cine.card.title : null; }); if (c) break; }
    await shot(`sea_${id}_captain_card`);
    s = await run(3); await shot(`sea_${id}_captain_line`);
    s = await run(30, 'final');
    expect(s.phase === 'final', `${id}: the captain boards (${s.phase})`);
    s = await run(1, null, false);
    const cap = await page.evaluate(() => { const m = window.VELSCOUR.G.world.seaRun.capM; return m && [m.x, m.y]; });
    if (cap) await look(cap[0], cap[1], 1, 8);
    await shot(`sea_${id}_final`);
    s = await run(auto ? 900 : 60, 'victory');
    expect(s.phase === 'victory', `${id}: the captain falls (${s.phase})`);
    for (let k = 0; k < 60; k++) { s = await run(0.25, 'done'); const c = await page.evaluate(async () => { const { Cine } = await import('/src/game/cinema.js'); return Cine.card && Cine.card.t > 0.6 ? Cine.card.title : null; }); if (c) { await shot(`sea_${id}_bell`); break; } }
    s = await run(40, 'done');
    expect(s.completed && s.exit && s.chest, `${id}: victory opens the exit and lays the chest (${JSON.stringify(s)})`);
    expect(s.won[id] === 1 && s.last === id, `${id}: the win is kept (${JSON.stringify(s.won)}, last ${s.last})`);
    expect(!first || s.bells === 1, `${id}: the first win rings the first bell (${s.bells})`);
    s = await run(2); await shot(`sea_${id}_victory`);
    await look(O.OX + 0.5, O.OY - 13.4 + 1.5, 1.2, 8); await shot(`sea_${id}_portal`);
    const cam = await page.evaluate(() => window.__seaCam);
    const ph = await page.evaluate(() => [...window.__seaSeen]);
    expect(ph.includes('say:Commodore Brask'), `${id}: Brask speaks`);
    const barks = ph.filter((q) => q.startsWith('bark:'));
    expect(barks.length >= 2, `${id}: Pip calls what's coming (${barks.join(' / ')})`);
    expect(ph.some((q) => q.startsWith('card:THE BELL RINGS') || q.startsWith('card:VICTORY') || q.startsWith('card:THE NINTH BELL')), `${id}: the bell's card`);   // (the finale's own: bellCard)
    expect(cam.miss.length === 0, `${id}: every line frames its speaker (${cam.miss.length} of ${cam.lines} missed: ${cam.miss.slice(0, 3).join('; ')})`);
    console.log(`  barks: ${barks.map((q) => q.slice(5)).join(' / ')}`);
    console.log(`  phases: ${ph.filter((q) => !q.includes(':')).join(' > ')}; ${cam.lines} lines framed; bells ${s.bells}; ${errors.length} errors so far`);
    // the exit: through the bell tower's door to the portal choice
    const ex = await page.evaluate(async () => { const { G } = window.VELSCOUR; const e = G.world.portals.find((q) => q.type === 'exit'); return { x: e.x, y: e.y, walk: G.world.map.walkable(e.x, e.y), seagate: !!e.seagate, label: e.label }; });
    expect(ex.walk && ex.seagate && /continue/.test(ex.label), `${id}: the exit stands in the bell tower's door (${JSON.stringify(ex)})`);
    await page.evaluate(() => { window.__seaSeen = new Set(); window.__seaCam = null; });
    first = false;
  }
  // seen scenes fast-forward; a replay rings no bell
  const again = (noSkip) => page.evaluate(async ([id, noSkip]) => {
    const { G, game } = window.VELSCOUR;
    const { BIOME_BY_ID } = await import('/src/data/biomes.js');
    G.settings.noSkipCine = noSkip; G.char.seaVariant = id;
    await game.teleportToBiome(BIOME_BY_ID.pirate_seas);
    let t = 0;
    for (; t < 60 && G.world.seaRun.phase === 'intro'; t += 1 / 30) { G.time += 1 / 30; game.update(1 / 30); }
    G.settings.noSkipCine = false;
    return t;
  }, [ids[0], noSkip]);
  const slow = await again(true), quick = await again(false);
  console.log(`--- seen again: the arrival takes ${slow.toFixed(1)} s with "Don't skip cutscenes", ${quick.toFixed(1)} s without`);
  expect(quick < slow / 5 && slow > 8, `a seen arrival plays at 20x (${quick.toFixed(1)} s vs ${slow.toFixed(1)} s)`);
  // the next battle is one not yet won (while there is one): a fresh hero's two draws differ from the one won
  const pickOk = await page.evaluate(async () => {
    const { pickSeaVariant } = await import('/src/game/seabattle.js');
    const { SEA_VARIANTS } = await import('/src/data/seabattle.js');
    const won = { [SEA_VARIANTS[0].id]: 1 };
    return [...Array(20)].every(() => pickSeaVariant(null, SEA_VARIANTS[0].id, won).id !== SEA_VARIANTS[0].id);
  });
  expect(pickOk, 'the next battle is rolled from those not won');
  // leaving for town tears the 3D down
  const gone = await page.evaluate(async () => { const { G, game } = window.VELSCOUR; game.enterTown(); const { seaScene } = await import('/src/gfx/seabattle3d.js'); return !seaScene() && G.world.kind === 'town'; });
  expect(gone, 'the sea scene is disposed in town');
  if (fails.length) { console.log(`${fails.length} FAILED`); process.exitCode = 1; } else console.log('ALL OK');
  report(errors);
  await browser.close();
})();
