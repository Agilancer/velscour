// The Slime Lord's court (game/slimecourt.js, gfx/slimeart.js, art from tools/slimecourt.py):
//   slimecourt_sets.png    every Glymmora sprite set, idle, by colour (all must draw their art)
//   slimecourt_anims.png   one set of each kind playing its animations side by side
//   slimecourt_court.png   the twelve kinds full size round the Lord, minis in front
//   slimecourt_battle_*.png a court of every colour fighting a crowd at depth 11 (pounces, tethers, domes, curses...)
//   slimecourt_play_*.png  the court with nothing to fight: leapfrog, blink parades, dances, rides, naps...
//   slimecourt_lord.png    the Slime Lord close up: the bubble over his head clear of it, the royal puddle at his feet
// Checks: every set loads and draws, every kind uses its abilities in the fight, the reds pounce from afar, the blues
// blink, the court plays several different games when idle, rainbow broods go round the colours, no errors.
//   node tools/tests/slimecourt.js [battleSeconds=14] [playSeconds=40]
const { openGame, report } = require('./harness');
const SECS = +(process.argv[2] || 14), PLAY = +(process.argv[3] || 40);

(async () => {
  const { browser, page, errors, shot } = await openGame({ width: 1400, height: 800 });
  const setup = await page.evaluate(async () => {
    const { G, game } = window.VELSCOUR;
    await game.newChar('slime_lord', 'Gloop');
    document.querySelectorAll('.screen').forEach((s) => s.remove());
    G.ui.modalCount = 0;
    const art = await import('/src/gfx/slimeart.js');
    await art.SLIME_READY;
    const ids = Object.keys(art.SLIME_SETS);
    ids.forEach((id) => art.slimeImage(id));
    for (let i = 0; i < 100 && ids.some((id) => !art.slimeImage(id)); i++) await new Promise((r) => setTimeout(r, 100));
    const { camera } = await import('/src/core/view.js');
    G.paused = false; G.settings.zoom = 1.7; G.settings.gore = 0;
    G.char.level = 40; G.player.recompute();
    camera.computeZoom();
    document.getElementById('center-msg').style.display = 'none';
    G.godMode = true;
    for (const c of G.world.creatures) if (!c.isPlayer) c.dead = true;
    for (const n of G.world.npcs) n.x += 60;
    return { sets: ids.length, missing: ids.filter((id) => !art.slimeImage(id)) };
  });
  const out = [];
  out.push((setup.sets >= 55 && !setup.missing.length ? '  ok ' : 'FAIL ') + `${setup.sets} slime sets load` + (setup.missing.length ? ' missing ' + setup.missing.join(' ') : ''));

  // every set, idle, grouped by colour
  const r1 = await page.evaluate(async () => {
    const { G, game } = window.VELSCOUR;
    const { SUMMONS } = await import('/src/data/summons.js');
    const { buildSummon } = await import('/src/game/monster.js');
    const { SLIME_SETS } = await import('/src/gfx/slimeart.js');
    const { KINDS } = await import('/src/game/slimecourt.js');
    const p = G.player, w = G.world, list = [];
    const order = ['red', 'gold', 'green', 'blue', 'purple', 'pink'];
    const ids = Object.keys(SLIME_SETS).sort((a, b) => order.indexOf(KINDS[SLIME_SETS[a].kind].hue) - order.indexOf(KINDS[SLIME_SETS[b].kind].hue) || SLIME_SETS[a].kind.localeCompare(SLIME_SETS[b].kind));
    ids.forEach((id, i) => {
      const kind = SLIME_SETS[id].kind, key = 'sl_' + kind;
      const c = i % 12, r = Math.floor(i / 12);
      const m = buildSummon(p, SUMMONS[key], key, p.x - 6 + c * 0.95 + r * 0.95, p.y - 1 - c * 0.95 + r * 0.95 + 1, 1, 100, 0);
      m.slime.set = id; m.static = true; m.spawnT = 1; m.flip = false; m.slime.animT = i * 0.37;
      w.add(m); list.push(m);
    });
    G.paused = true; game.render();
    const { drawSlime } = await import('/src/gfx/slimeart.js');
    const cx = document.createElement('canvas').getContext('2d');
    const drew = list.filter((m) => drawSlime(cx, m)).length;
    window.sc = { list };
    return { n: list.length, drew };
  });
  out.push((r1.drew === r1.n ? '  ok ' : 'FAIL ') + `${r1.drew}/${r1.n} sets drew in the line-up`);
  await page.waitForTimeout(150);
  await shot('slimecourt_sets');

  // one set of each kind, each animation in a row
  await page.evaluate(async () => {
    const { G, game } = window.VELSCOUR;
    const { SUMMONS } = await import('/src/data/summons.js');
    const { buildSummon } = await import('/src/game/monster.js');
    const p = G.player, w = G.world;
    for (const m of window.sc.list) { if (m.slime) m.slime.popped = true; m.dead = true; }
    w.creatures = w.creatures.filter((c) => !c.dead);
    const kinds = ['pouncer', 'berserker', 'bulwark', 'warden', 'mender', 'druid', 'tide', 'frost', 'hexer', 'venom', 'idol', 'charmer'];
    const anims = ['idle', 'walk', 'run', 'jump', 'attack', 'open', 'ability', 'special'];
    const sets = { pouncer: 'blood_moon', berserker: 'dragon', bulwark: 'sun_emperor', warden: 'honey', mender: 'sap', druid: 'bramble', tide: 'sorcerer', frost: 'ice_emperor', hexer: 'prism_witch', venom: 'venom', idol: 'pop_idol', charmer: 'rose_duelist' };
    const list = [];
    kinds.forEach((k, i) => anims.forEach((a, j) => {
      const m = buildSummon(p, SUMMONS['sl_' + k], 'sl_' + k, p.x - 6.5 + i * 0.95 + j * 0.9, p.y - 4 - i * 0.95 + j * 0.9 + 3, 1, 100, 0);
      Object.assign(m.slime, { set: sets[k], anim: a, animT: 0.25 });
      m.static = true; m.spawnT = 1; m.update = () => {};
      w.add(m); list.push(m);
    }));
    G.paused = true; game.render();
    window.sc.list = list;
  });
  await page.waitForTimeout(150);
  await shot('slimecourt_anims');

  // the court: every kind round the Lord, minis in front, with the rainbow brood checked
  const r3 = await page.evaluate(async () => {
    const { G, game } = window.VELSCOUR;
    const { SUMMONS } = await import('/src/data/summons.js');
    const { buildSummon } = await import('/src/game/monster.js');
    const { courtSummon } = await import('/src/game/slimecourt.js');
    const p = G.player, w = G.world;
    for (const m of window.sc.list) { if (m.slime) m.slime.popped = true; m.dead = true; }
    w.creatures = w.creatures.filter((c) => !c.dead);
    const keys = Object.keys(SUMMONS).filter((k) => SUMMONS[k].slime);
    const list = keys.map((k, i) => { const a = (i / keys.length) * Math.PI * 2; const m = buildSummon(p, SUMMONS[k], k, p.x + Math.cos(a) * 3, p.y + Math.sin(a) * 3, 1, 100, 0); m.spawnT = 1; w.add(m); return m; });
    const hues = [];
    for (let i = 0; i < 6; i++) { const m = courtSummon(p, 'slimeling', p.x + 1 + i * 0.4, p.y + 1.6 - i * 0.4, 1, 50, 0); m.spawnT = 1; w.add(m); list.push(m); hues.push(m.slime.K.hue); }
    G.paused = true; game.render();
    window.sc.list = list;
    return { kinds: keys.length, hues };
  });
  out.push((new Set(r3.hues).size === 6 ? '  ok ' : 'FAIL ') + `6 slimelings in a row go round the rainbow: ${r3.hues.join(' ')} (${r3.kinds} court kinds)`);
  await page.waitForTimeout(150);
  await shot('slimecourt_court');

  // battle: the court against a crowd at depth 11
  await page.evaluate(async () => {
    const { G, game } = window.VELSCOUR;
    for (const m of window.sc.list) { if (m.slime) m.slime.popped = true; m.dead = true; }
    const { BIOME_BY_ID } = await import('/src/data/biomes.js');
    game.buildDungeon(11, BIOME_BY_ID.catacombs);
    game.enterDungeon();
    G.ui.modalCount = 0;
    document.getElementById('center-msg').style.display = 'none';
  });
  await page.waitForTimeout(500);
  let battle = await page.evaluate(async (SECS) => {
    const { G, game } = window.VELSCOUR;
    const { SUMMONS } = await import('/src/data/summons.js');
    const { buildSummon, makeMonster } = await import('/src/game/monster.js');
    const { courtSummon } = await import('/src/game/slimecourt.js');
    const p = G.player, w = G.world;
    for (const c of w.creatures) if (!c.isPlayer) c.dead = true;
    w.creatures = w.creatures.filter((c) => !c.dead);
    const keys = ['sl_pouncer', 'sl_berserker', 'sl_bulwark', 'sl_warden', 'sl_mender', 'sl_druid', 'sl_tide', 'sl_frost', 'sl_hexer', 'sl_venom', 'sl_idol', 'sl_charmer'];
    const court = [];
    const P = p.skillDamage ? 30 : 20;
    for (const k of keys) { const [x, y] = w.map.randomNear(p.x, p.y, 2.5); const m = buildSummon(p, SUMMONS[k], k, x, y, P * SUMMONS[k].dmg, p.maxHp * SUMMONS[k].hp, 0); m.skillId = 'test'; w.add(m); court.push(m); }
    for (let i = 0; i < 4; i++) { const [x, y] = w.map.randomNear(p.x, p.y, 2); const m = courtSummon(p, 'slimeling', x, y, P * 0.7, p.maxHp * 0.2, 0); w.add(m); court.push(m); }
    // a crowd ahead: the reds should go for it before anyone else
    const foes = [];
    const spawnFoes = () => { for (let i = 0; i < 14; i++) { let x, y; for (let k = 0; k < 30; k++) { [x, y] = w.map.randomNear(p.x + 5, p.y + 2, 4); if (w.map.los(p.x, p.y, x, y) && Math.hypot(x - p.x, y - p.y) > 4) break; } const m = makeMonster(w, 'skeleton', w.biome, 12, i % 7 === 0 ? 'champion' : 'normal', x, y); m.awake = true; m.maxHp *= 4; m.hp = m.maxHp; w.add(m); foes.push(m); } };
    spawnFoes();
    p.hp = p.maxHp * 0.45; // hurt: the healers and protectors have work
    const seen = {}, acts = {}, far = { leap: 0, maxD: 0 }, prev = new Map();
    let f = 0;
    window.sc.court = court;
    window.sc.step = (n) => {
      G.paused = false;
      for (let e = f + n; f < e; f++) {
        w.update(1 / 30);
        if (f % 150 === 149 && w.hostiles('player', p.x, p.y, 20).length < 6) spawnFoes();
        if (f % 90 === 0) p.hp = Math.min(p.hp, p.maxHp * 0.5);
        for (const m of court) {
          if (m.dead) continue;
          const S = m.slime, was = prev.get(m) || {};
          for (const k in S.cds) { if (S.cds[k] > (was[k] ?? 0) + 0.5) seen[S.kind + '.' + k] = (seen[S.kind + '.' + k] || 0) + 1; }
          prev.set(m, { ...S.cds });
          if (S.act) { acts[S.kind + ':' + S.act.type] = (acts[S.kind + ':' + S.act.type] || 0) + 1; if (S.act.type === 'leap' && S.act.t < 0.04 && S.kind === 'pouncer') { far.leap++; far.maxD = Math.max(far.maxD, Math.hypot(S.act.x1 - S.act.x0, S.act.y1 - S.act.y0)); } }
          if (S.healing) seen[S.kind + '.tether'] = (seen[S.kind + '.tether'] || 0) + 1;
        }
      }
      G.paused = true; game.render();
      return { seen, acts, far, alive: court.filter((m) => !m.dead).length, buffs: p.buffs.map((b) => b.id) };
    };
    return window.sc.step(45);
  }, SECS);
  await shot('slimecourt_battle_1');
  await page.evaluate(() => window.sc.step(60));
  await shot('slimecourt_battle_2');
  await page.evaluate(() => window.sc.step(75));
  await shot('slimecourt_battle_3');
  Object.assign(battle, await page.evaluate((n) => window.sc.step(n), Math.max(0, SECS * 30 - 180)));
  await shot('slimecourt_battle_4');
  const S = battle.seen;
  const want = { pouncer: ['leap'], berserker: ['roll'], bulwark: ['aegis'], warden: ['barrier', 'repel'], mender: ['tether'], druid: ['bloom', 'snare'], tide: ['bubble'], frost: ['nova'], hexer: ['hex', 'void'], venom: ['cloud'], idol: ['song'], charmer: ['charm'] };
  for (const [k, abil] of Object.entries(want)) {
    const used = abil.filter((a) => S[k + '.' + a]);
    out.push((used.length ? '  ok ' : 'FAIL ') + `${k}: used ${used.map((a) => a + ' x' + S[k + '.' + a]).join(', ') || 'none of ' + abil.join('/')}`);
  }
  out.push((battle.far.leap ? '  ok ' : 'FAIL ') + `pouncers leapt ${battle.far.leap} times in the brawl, longest ${battle.far.maxD.toFixed(1)} tiles`);
  // a lone foe far off: a pouncer by the Lord goes for it at once, in one long leap
  const far = await page.evaluate(async () => {
    const { G } = window.VELSCOUR;
    const { SUMMONS } = await import('/src/data/summons.js');
    const { buildSummon, makeMonster } = await import('/src/game/monster.js');
    const p = G.player, w = G.world;
    for (const c of w.creatures) if (!c.isPlayer) { if (c.slime) c.slime.popped = true; c.dead = true; }
    w.creatures = w.creatures.filter((c) => !c.dead);
    let spot = null;
    for (let a = 0; a < 64 && !spot; a++) { const ang = a * 0.39, x = p.x + Math.cos(ang) * 8, y = p.y + Math.sin(ang) * 8; if (w.map.circleFree(x, y, 0.4) && w.map.los(p.x, p.y, x, y)) spot = [x, y]; }
    if (!spot) return { skip: true };
    const m = buildSummon(p, SUMMONS.sl_pouncer, 'sl_pouncer', p.x + 0.5, p.y + 0.5, 10, 300, 0); w.add(m);
    const e = makeMonster(w, 'skeleton', w.biome, 12, 'normal', spot[0], spot[1]); e.awake = false; e.aggroRange = 0.1; e.maxHp = e.hp = 1e6; w.add(e);
    G.paused = false;
    let best = 0;
    for (let f = 0; f < 60; f++) { w.update(1 / 30); const A = m.slime.act; if (A && A.type === 'leap') best = Math.max(best, Math.hypot(A.x1 - A.x0, A.y1 - A.y0)); }
    G.paused = true;
    return { best };
  });
  out.push(far.skip ? '  -- no open ground for the long-pounce check' : (far.best > 5.5 ? '  ok ' : 'FAIL ') + `a pouncer leapt ${far.best.toFixed(1)} tiles at a lone foe 8 tiles off within 2s`);
  out.push(((S['tide.blink'] || 0) + (S['frost.blink'] || 0) ? '  ok ' : 'FAIL ') + `blues blinked ${(S['tide.blink'] || 0) + (S['frost.blink'] || 0)} times in the fight`);
  out.push('  -- acts: ' + Object.entries(battle.acts).sort().map(([k, v]) => `${k}=${v}`).join(' '));
  out.push('  -- lord buffs at the end: ' + battle.buffs.join(' '));

  // play: nothing to fight; the Lord stands, then walks about
  const play = await page.evaluate(async (PLAY) => {
    const { G, game } = window.VELSCOUR;
    const { SUMMONS } = await import('/src/data/summons.js');
    const { buildSummon } = await import('/src/game/monster.js');
    const { courtSummon } = await import('/src/game/slimecourt.js');
    const p = G.player, w = G.world;
    for (const c of w.creatures) if (c.team === 'enemy') c.dead = true;
    w.creatures = w.creatures.filter((c) => !c.dead);
    p.hp = p.maxHp;
    let court = window.sc.court.filter((m) => !m.dead);
    for (const k of ['sl_tide', 'sl_frost', 'sl_tide']) { const [x, y] = w.map.randomNear(p.x, p.y, 2); const m = buildSummon(p, SUMMONS[k], k, x, y, 10, 200, 0); w.add(m); court.push(m); }
    for (let i = 0; i < 4; i++) { const [x, y] = w.map.randomNear(p.x, p.y, 2); const m = courtSummon(p, 'slimeling', x, y, 5, 100, 0); w.add(m); court.push(m); }
    const games = {}, emotes = {};
    G.paused = false;
    const pts = [];
    for (let i = 0; i < 6; i++) pts.push(w.map.randomNear(p.x, p.y, 7));
    let leg = 0;
    for (let f = 0; f < PLAY * 30; f++) {
      // stand still for 20s, then walk from point to point
      if (f > 600) { const [tx, ty] = pts[leg % pts.length], d = Math.hypot(tx - p.x, ty - p.y); if (d < 0.3) leg++; else { p.moveToward(tx, ty, 1 / 30, 4.2); } }
      w.update(1 / 30);
      for (const m of court) {
        if (m.dead) continue;
        const S = m.slime;
        if (S.act && S.act.social && S.act.t < 0.04) games[S.act.type] = (games[S.act.type] || 0) + 1;
        if (S.act && S.act.type === 'blink' && S.act.t < 0.04) games.blink = (games.blink || 0) + 1;
        if (S.emote && S.emote.t < 0.04) emotes[S.emote.k] = (emotes[S.emote.k] || 0) + 1;
      }
    }
    G.paused = true; game.render();
    return { games: w.slimeCourt.games, acts: games, emotes, n: court.length };
  }, PLAY);
  await shot('slimecourt_play');
  const kinds = Object.keys(play.games);
  out.push((kinds.length >= 5 ? '  ok ' : 'FAIL ') + `the court played ${kinds.length} kinds of game in ${PLAY}s: ${Object.entries(play.games).map(([k, v]) => k + ' x' + v).join(', ')}`);
  out.push((play.acts.blink ? '  ok ' : 'FAIL ') + `blues blinked ${play.acts.blink || 0} times out of the fight`);
  out.push('  -- emotes: ' + Object.entries(play.emotes).map(([k, v]) => k + ' x' + v).join(', '));

  // the Lord close up: the mass bubble clear of his head, the royal puddle
  await page.evaluate(async () => {
    const { G, game } = window.VELSCOUR;
    const { camera } = await import('/src/core/view.js');
    const p = G.player, w = G.world;
    for (const c of w.creatures) if (!c.isPlayer) c.dead = true;
    w.creatures = w.creatures.filter((c) => !c.dead);
    G.settings.zoom = 3; camera.computeZoom();
    const s = p.sig && p.sig.s;
    if (s) s.mass = 72;
    G.paused = false;
    for (let i = 0; i < 60; i++) w.update(1 / 30);
    G.paused = true; game.render();
  });
  await shot('slimecourt_lord');
  console.log(out.join('\n'));
  if (out.some((l) => l.startsWith('FAIL'))) process.exitCode = 1;
  report(errors);
  await browser.close();
})();
