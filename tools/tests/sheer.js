// SHEER DROPS (src/data/sheer.js, docs/SHEER_DROPS.md): the ten cliff dungeons.
//   node tools/tests/sheer.js                      # all ten: shots, the rules at the brink, an auto-play soak
//   node tools/tests/sheer.js sheer_rime,sheer_cinder noauto
//   node tools/tests/sheer.js - noshots barbarian,dragoon 8   # classes and game minutes for the soak (default barbarian,wizard 5)
// 1. every variant: no walls, lamps at the brinks, start -> exit reachable, every monster on floor; a shot from a brink
//    with the drop in view (sheer_<id>.png) and one pulled back (sheer_<id>_wide.png)
// 2. the rules (stepped, the live loop frozen): a monster knocked off a brink dies, its loot on the brink and no corpse;
//    a flyer crosses a gap to the hero; one hanging still over the void flutters back to floor; one frozen there falls;
//    a lunge clears a gap and lands on floor; the hero's Leap at the void comes down on floor; a ninja's cut at a flyer
//    over the void sets him on floor; knocked off the brink with auto-play on he braces, with it off he dies (the Abyss)
// 3. auto-play soak in Sheer Drops only: the hero must never fall (braced counts the knocks he stood his ground on)
const { openGame, report } = require('./harness');
const arg = (i) => (process.argv[i] && process.argv[i] !== '-' ? process.argv[i] : '');
const only = arg(2).split(',').filter(Boolean);
const noShots = process.argv.includes('noshots'), noAuto = process.argv.includes('noauto');
const extra = process.argv.slice(3).filter((a) => !['noshots', 'noauto'].includes(a));
const classes = (extra.find((a) => /[a-z]/.test(a)) || 'barbarian,wizard').split(',');
const minutes = +(extra.find((a) => /^\d+$/.test(a)) || 5);
const fails = [];
const check = (ok, msg) => { console.log((ok ? '  ok   ' : '  FAIL ') + msg); if (!ok) fails.push(msg); };

(async () => {
  const { browser, page, errors, shot } = await openGame({ width: 1280, height: 720 });
  try {
    await page.evaluate(async () => {
      const { G, game } = window.VELSCOUR;
      await game.newChar('paladin', 'Brinkwalker');
      document.querySelectorAll('.screen').forEach((s) => s.remove());
      G.ui.modalCount = 0; G.godMode = true;
      // helpers kept on window for the steps below
      window.T = {
        async build(id, depth = 13, keep = false) {
          const { BIOME_BY_ID } = await import('/src/data/biomes.js');
          const { loadBiomeArt } = await import('/src/core/assets.js');
          const b = BIOME_BY_ID[id];
          await loadBiomeArt(b);
          game.buildDungeon(depth, b);
          if (!keep) G.world.creatures = G.world.creatures.filter((c) => c === G.player || c.team === G.player.team);
          return G.world;
        },
        // the brink with the most drop in view below it (south-west / south-east of the hero on screen)
        view() {
          const m = G.world.map;
          let best = null, bs = -1;
          for (let y = 2; y < m.h - 2; y++) for (let x = 2; x < m.w - 2; x++) {
            if (!m.walkableTile(x, y)) continue;
            let v = 0, f = 0;
            for (let dy = -3; dy <= 7; dy++) for (let dx = -3; dx <= 7; dx++) if (m.tile(x + dx, y + dy)) f++; else v++;
            const s = Math.min(v, f) + (m.tile(x, y + 1) ? 0 : 6) + (m.tile(x + 1, y) ? 0 : 6);
            if (s > bs) { bs = s; best = [x + 0.5, y + 0.5]; }
          }
          return m.nearestFloor(best[0] - 0.6, best[1] - 0.6, 0.3, 2) || best;
        },
        // floor at (x,y), a straight gap of `gap` void tiles along +x, floor beyond
        gapX(gap) {
          const m = G.world.map;
          for (let y = 2; y < m.h - 2; y++) for (let x = 2; x < m.w - gap - 4; x++) {
            let ok = m.walkableTile(x, y) && m.walkableTile(x - 1, y) && m.walkableTile(x + gap + 1, y) && m.walkableTile(x + gap + 2, y);
            for (let k = 1; ok && k <= gap; k++) ok = !m.tile(x + k, y);
            if (ok) return [x, y];
          }
          return null;
        },
        step(n, dt = 1 / 60) { const w = G.world; for (let i = 0; i < n; i++) { G.time += dt; G.frame++; w.update(dt); } },
      };
    });

    // ---------------------------------------------------------------- 1. the ten variants
    const ids = await page.evaluate(async (only) => (await import('/src/data/sheer.js')).SHEER.map((v) => v.id).filter((id) => !only.length || only.includes(id)), only);
    console.log('variants:', ids.join(', '));
    for (const id of ids) {
      const info = await page.evaluate(async (id) => {
        const { G } = window.VELSCOUR, w = await window.T.build(id, 13, true), m = w.map;
        // start -> exit over floor
        const seen = new Uint8Array(m.w * m.h), s = Math.floor(w.gen?.start?.[1] ?? G.player.y) * m.w + Math.floor(w.gen?.start?.[0] ?? G.player.x), q = [s];
        seen[s] = 1;
        while (q.length) { const i = q.pop(), x = i % m.w, y = (i / m.w) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const j = (y + dy) * m.w + x + dx; if (!seen[j] && m.walkableTile(x + dx, y + dy)) { seen[j] = 1; q.push(j); } } }
        const ex = w.portals.find((p) => p.exit || p.kind === 'exit') || w.portals[w.portals.length - 1];
        const monsters = w.creatures.filter((c) => c.team === 'enemy' && !c.static);
        const res = {
          name: w.biome.name, below: m.sheer.below, walls: m.walls.length, torches: w.torches.length, lamps: w.props.filter((p) => p.light).length,
          exitReached: ex ? !!seen[Math.floor(ex.y) * m.w + Math.floor(ex.x)] : null, monsters: monsters.length,
          offFloor: monsters.filter((c) => !m.isFloor(c.x, c.y)).length, flyers: monsters.filter((c) => c.fly).length,
        };
        w.creatures = w.creatures.filter((c) => c === G.player || c.team === G.player.team);
        [G.player.x, G.player.y] = window.T.view();
        return res;
      }, id);
      console.log(`${id}: ${JSON.stringify(info)}`);
      check(info.walls === 0 && info.torches === 0, `${id}: no walls or wall torches`);
      check(info.lamps >= 3, `${id}: lamps at the brinks (${info.lamps})`);
      check(info.exitReached !== false, `${id}: the exit is reachable from the start`);
      check(info.offFloor === 0, `${id}: every monster starts on floor (${info.monsters}, ${info.flyers} flyers)`);
      if (!noShots) {
        await page.waitForTimeout(3600);
        // the scene itself: no omen banner or log text over it
        await page.evaluate(async () => { const { UI } = await import('/src/ui/ui.js'); UI.msgEl.style.visibility = 'hidden'; UI.clearLog(); });
        await shot(`sheer_${id}`);
        // pulled back round the hero: islands over the drop
        await page.evaluate(async () => {
          const { G } = window.VELSCOUR, { camera } = await import('/src/core/view.js'), m = G.world.map;
          const fit = Math.min(1280 / ((m.w + m.h) * 32 + 64), 720 / ((m.w + m.h) * 16 + 320));
          window.T.zk = camera.zoomK; camera.zoomK = Math.max(0.4, fit / (camera.zoom / camera.zoomK)); camera.computeZoom();
        });
        await page.waitForTimeout(3500);
        await page.evaluate(async () => (await import('/src/ui/ui.js')).UI.clearLog());
        await shot(`sheer_${id}_wide`);
        await page.evaluate(async () => {
          const { camera } = await import('/src/core/view.js'), { UI } = await import('/src/ui/ui.js');
          camera.zoomK = window.T.zk; camera.computeZoom(); UI.msgEl.style.visibility = '';
        });
      }
    }

    // ---------------------------------------------------------------- 2. the rules at the brink
    console.log('rules:');
    const rules = await page.evaluate(async () => {
      const { G, game } = window.VELSCOUR, T = window.T, out = {};
      const { makeMonster } = await import('/src/game/monster.js');
      const { sheerStats } = await import('/src/gfx/sheer.js');
      const { Auto } = await import('/src/game/autoplay.js');
      const realUpdate = game.update; game.update = () => {}; // the test steps the world itself
      // a level with straight gaps of 2 and 3 tiles to work at (rooms and corridors are random)
      let w = await T.build('sheer_ossuary', 13);
      for (let i = 0; i < 20 && !(T.gapX(3) && T.gapX(2)); i++) w = await T.build('sheer_ossuary', 13);
      if (!(T.gapX(3) && T.gapX(2))) throw new Error('no level with straight 2- and 3-tile gaps in 20 tries');
      const m = w.map, p = G.player, S = () => sheerStats(w);
      const spawn = (arch, x, y, rank = 'normal') => { const c = makeMonster(w, arch, w.biome, 10, rank, x, y); w.add(c); c.awake = true; return c; };
      // a) knocked off a brink
      let g = T.gapX(3);
      p.x = g[0] - 1.5; p.y = g[1] + 0.5;
      const loot0 = w.loot.length, corpses0 = w.corpses.length;
      const sk = spawn('skeleton', g[0] + 0.5, g[1] + 0.5);
      T.step(2); sk.kbx = 7; sk.kby = 0; T.step(40); // an ordinary knock (combat.js: knock 1 on a body this size)
      const loot = w.loot.slice(loot0);
      out.knock = { dead: sk.dead, fell: S().fell, loot: loot.length, lootOnFloor: loot.every((l) => m.isFloor(l.x, l.y)), corpses: w.corpses.length - corpses0, plunge: (w.plunges || []).length > 0 };
      // b) a flyer crosses the gap to the hero
      g = T.gapX(3);
      p.x = g[0] + 4.5; p.y = g[1] + 0.5;
      const bat = spawn('bat', g[0] + 0.3, g[1] + 0.5);
      let crossed = false, d0 = Math.hypot(bat.x - p.x, bat.y - p.y), dmin = d0;
      for (let i = 0; i < 240 && !bat.dead; i++) { T.step(1); if (!m.isFloor(bat.x, bat.y)) crossed = true; dmin = Math.min(dmin, Math.hypot(bat.x - p.x, bat.y - p.y)); }
      out.flyer = { voidFly: bat.voidFly, crossed, d0: +d0.toFixed(2), dmin: +dmin.toFixed(2), alive: !bat.dead, onFloorNow: m.isFloor(bat.x, bat.y) };
      // c) hanging still over the void: back to the floor
      const vx = g[0] + 2.5, vy = g[1] + 0.5;
      p.x = g[0] - 6; p.y = g[1] + 0.5;
      const hov = spawn('bat', g[0] + 0.5, g[1] + 0.5); hov.x = vx; hov.y = vy; hov.awake = false; hov.update = function (dt) { this.tickStatus && this.tickStatus(dt); }; // holds still
      T.step(150);
      out.hover = { alive: !hov.dead, backOnFloor: m.isFloor(hov.x, hov.y) };
      // d) frozen over the void: it drops
      const fr = spawn('bat', g[0] + 0.5, g[1] + 0.5); fr.x = vx; fr.y = vy;
      fr.status.freeze = { t: 2 };
      const fell0 = S().fell;
      T.step(3);
      out.frozen = { dead: fr.dead, fell: S().fell - fell0 };
      // e) a lunge clears the gap and lands on floor
      g = T.gapX(2);
      p.x = g[0] + 4.2; p.y = g[1] + 0.5;
      const kn = spawn('ghoul', g[0] + 0.4, g[1] + 0.5);
      T.step(1);
      const d = Math.hypot(kn.x - p.x, kn.y - p.y), began = kn.beginMove('lunge', p, d);
      let overVoid = false;
      for (let i = 0; i < 90; i++) { T.step(1); if (!m.isFloor(kn.x, kn.y)) overVoid = true; }
      out.lunge = { began: began !== false, overVoid, alive: !kn.dead, landedOnFloor: m.isFloor(kn.x, kn.y), farSide: kn.x > g[0] + 2.5 };
      for (const c of w.creatures) if (c.team === 'enemy') c.dead = true;
      T.step(2);
      // f) the hero's Leap at the void comes down on floor
      G.godMode = false;
      const { castSkill } = await import('/src/game/skillrun.js');
      const { SKILLS } = await import('/src/data/skills.js');
      const leap = Object.values(SKILLS).find((s) => s.kind === 'leap');
      g = T.gapX(3);
      p.x = g[0] + 0.4; p.y = g[1] + 0.5; p.channel = null; p.dead = false; p.hp = p.maxHp;
      castSkill(p, leap, 1, g[0] + 2.5, g[1] + 0.5); // into the middle of the gap
      T.step(50);
      out.leap = { skill: leap.name, dead: p.dead, onFloor: m.isFloor(p.x, p.y), x: +p.x.toFixed(2) };
      // ...and over the gap to floor on the far side
      p.x = g[0] + 0.4; p.y = g[1] + 0.5; p.channel = null;
      castSkill(p, leap, 1, g[0] + 4.5, g[1] + 0.5);
      let leapOver = false;
      for (let i = 0; i < 50; i++) { T.step(1); if (!m.isFloor(p.x, p.y)) leapOver = true; }
      out.leapAcross = { dead: p.dead, over: leapOver, farSide: p.x > g[0] + 3.5, onFloor: m.isFloor(p.x, p.y) };
      // g) set down with his middle over the drop by a skill (no knock): back on the floor
      p.x = g[0] + 1.6; p.y = g[1] + 0.5; p.kbx = p.kby = 0; p.shoveT = 0;
      T.step(2);
      out.setDown = { dead: p.dead, onFloor: m.isFloor(p.x, p.y) };
      // h) knocked off: auto-play braces him, without it he falls
      const b0 = S().braced;
      Auto.toggle(true);
      p.x = g[0] + 0.6; p.y = g[1] + 0.5; p.kbx = 12; p.kby = 0;
      T.step(40);
      out.braced = { dead: p.dead, onFloor: m.isFloor(p.x, p.y), braced: S().braced - b0 };
      Auto.toggle(false);
      const deaths0 = G.char.deaths || 0;
      p.x = g[0] + 0.6; p.y = g[1] + 0.5; p.kbx = 12; p.kby = 0;
      T.step(20);
      out.fall = { dead: p.dead, hero: S().hero, deaths: (G.char.deaths || 0) - deaths0 };
      game.update = realUpdate;
      return out;
    });
    console.log(JSON.stringify(rules));
    const r = rules;
    check(r.knock.dead && r.knock.fell >= 1 && r.knock.corpses === 0, 'a monster knocked off a brink dies, no corpse left');
    check(r.knock.loot === 0 || r.knock.lootOnFloor, `its loot lands on the brink (${r.knock.loot} drops)`);
    check(r.flyer.voidFly && r.flyer.crossed && r.flyer.dmin < 1.6 && r.flyer.alive, `a flyer crosses a gap to the hero (${r.flyer.d0} -> ${r.flyer.dmin})`);
    check(r.hover.alive && r.hover.backOnFloor, 'a flyer hanging still over the void flutters back to floor');
    check(r.frozen.dead && r.frozen.fell === 1, 'a flyer frozen over the void falls');
    check(r.lunge.began && r.lunge.overVoid && r.lunge.alive && r.lunge.landedOnFloor && r.lunge.farSide, 'a lunge clears a gap and lands on floor');
    check(!r.leap.dead && r.leap.onFloor, `the hero's ${r.leap.skill} at the void comes down on floor`);
    check(!r.leapAcross.dead && r.leapAcross.over && r.leapAcross.farSide && r.leapAcross.onFloor, 'the hero leaps a gap to the far side');
    check(!r.setDown.dead && r.setDown.onFloor, 'set down over the drop by a skill: back on the floor');
    check(!r.braced.dead && r.braced.onFloor && r.braced.braced >= 1, 'knocked at the brink with auto-play on: braced');
    check(r.fall.dead && r.fall.deaths === 1, 'knocked off the brink with auto-play off: killed by the Abyss');
    if (!noShots) {
      await page.waitForTimeout(2600);
      const txt = await page.evaluate(() => document.body.innerText.match(/Slain on Depth \d+ by ([^.\n]+)/)?.[1] || '');
      check(/Abyss/.test(txt), `death screen names the killer: "${txt}"`);
      await shot('sheer_death');
    }

    // ---------------------------------------------------------------- 3. auto-play soak, Sheer Drops only
    if (!noAuto) for (const cls of classes) {
      await page.evaluate(async (cls) => {
        const { G, game } = window.VELSCOUR;
        document.querySelectorAll('.screen').forEach((s) => s.remove());
        G.ui.modalCount = 0;
        const { ACT_BIOMES } = await import('/src/data/biomes.js');
        const { SHEER } = await import('/src/data/sheer.js');
        for (const a of Object.keys(ACT_BIOMES)) ACT_BIOMES[a] = SHEER.map((v) => v.id); // nothing but Sheer Drops
        await game.newChar(cls, 'Brinkbot');
        document.querySelectorAll('.screen').forEach((s) => s.remove());
        G.ui.modalCount = 0; G.godMode = false; G.autoOpenSeals = true;
        G.char.nextBiome = SHEER[Math.floor(Math.random() * SHEER.length)].id; G.char.biomeBag = [];
        G.sheerTally = { fell: 0, hero: 0, braced: 0, saved: 0, hover: 0 };
        (await import('/src/game/autoplay.js')).Auto.toggle(true);
      }, cls);
      const seen = new Set();
      for (let min = 1; min <= minutes; min++) {
        const res = await page.evaluate(async () => {
          const { G, game } = window.VELSCOUR;
          const { commState, LINE_BY_ID } = await import('/src/game/commissions.js');
          const t0 = performance.now();
          let sim = 0;
          while (sim < 60) {
            // a Town Commission set in some other biome would swap one of the exit's portals for it: keep to the drops
            const cs = commState(G.char); cs.open = cs.open.filter((e) => !LINE_BY_ID[e.id]?.chapters[e.ch]?.biome);
            for (let i = 0; i < 15; i++) { if (G.mode !== 'game' || !G.world) break; G.dt = 1 / 30; G.time += G.dt; G.frame++; game.update(1 / 30); sim += 1 / 30; }
            await new Promise((r) => setTimeout(r, 0));
            if (performance.now() - t0 > 60000) break;
          }
          game.render();
          const c = G.char, w = G.world;
          const { Auto } = await import('/src/game/autoplay.js');
          return { where: w ? (w.kind === 'town' ? 'town' : `D${w.depth} ${w.biome.id}`) : '-', lvl: c.level, kills: c.kills, deaths: c.deaths || 0, tally: G.sheerTally, sim: Math.round(sim), status: Auto.status };
        });
        seen.add(res.where.split(' ')[1] || res.where);
        console.log(`[${cls} ${min}m] ${res.where} lvl=${res.lvl} kills=${res.kills} deaths=${res.deaths} sim=${res.sim}s | ${res.status} | sheer=${JSON.stringify(res.tally)}`);
        if (min === minutes || min === 1) await shot(`sheer_auto_${cls}_m${min}`);
        if (min === minutes) {
          check(res.tally.hero === 0, `${cls}: auto-play never let the hero fall (${res.tally.braced} knocks braced at the brink, ${res.tally.saved} set back)`);
          check(res.kills > 0, `${cls}: auto-play fought through Sheer Drops (${res.kills} kills, ${res.tally.fell} knocked into the abyss, levels seen: ${[...seen].join(', ')})`);
        }
      }
    }
  } catch (e) { errors.push('[SHEER] ' + (e.stack || e)); }
  if (errors.some((e) => e.startsWith('[SHEER]'))) fails.push('the test itself threw');
  console.log(fails.length ? `${fails.length} FAILED` : 'ALL CHECKS PASSED');
  if (fails.length) process.exitCode = 1;
  report(errors);
  await browser.close();
})().catch((e) => { console.error(e); process.exitCode = 1; });
