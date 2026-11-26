// ACT III signature attacks (data/phobosattacks.js, game/phobosattacks.js):
//  1. the data: every non-boss Phobos art has a kit, no two share primitive + rider + form or a name, bosses have none
//  2. every kitted monster is spawned beside a god-mode hero on a castle floor (applyPhobosKit applied here), wakes and
//     must cast its signature, the marks must land, and nothing may throw (the hero stands still: most kits touch him,
//     the ones with a safe eye or a breakable leash may not)
//  3. line-ups mid-telegraph, four primitives a shot, each caster at its own stand-in (phobos_attacks_<n>.png)
//   node tools/tests/phobos_attacks.js [prims or art ids, comma] [noshots]
const { openGame, report } = require('./harness');
const args = process.argv.slice(2), noshots = args.includes('noshots'), only = (args.find((a) => a !== 'noshots') || '').split(',').filter(Boolean);
(async () => {
  const { browser, page, errors, shot } = await openGame({ width: 1280, height: 720 });
  let bad = 0;
  try {
    const data = await page.evaluate(async () => {
      const { G, game } = window.VELSCOUR;
      await game.newChar('paladin', 'Phobos Kits');
      document.querySelectorAll('.screen').forEach((s) => s.remove()); G.ui.modalCount = 0;
      const { BIOME_BY_ID } = await import('/src/data/biomes.js');
      const { loadBiomeArt } = await import('/src/core/assets.js');
      const b = BIOME_BY_ID.ph_castle || BIOME_BY_ID.castle_keep;
      await loadBiomeArt(b);
      game.buildDungeon(260, b);
      document.querySelectorAll('.screen').forEach((s) => s.remove()); G.ui.modalCount = 0;
      G.godMode = true;
      const { PHOBOS_ART } = await import('/src/data/phobos.js');
      const { PHOBOS_KITS, PRIMS, RIDERS } = await import('/src/data/phobosattacks.js');
      const kitted = PHOBOS_ART.filter((a) => !a.boss), bosses = PHOBOS_ART.filter((a) => a.boss);
      const K = Object.values(PHOBOS_KITS);
      return { arts: kitted.length, kits: K.length, missing: kitted.filter((a) => !PHOBOS_KITS[a.id]).map((a) => a.id), bossKits: bosses.filter((a) => PHOBOS_KITS[a.id]).length,
        combos: new Set(K.map((k) => k.prim + '/' + k.rider + '/' + k.form)).size, names: new Set(K.map((k) => k.name)).size,
        prims: Object.keys(PRIMS).length, riders: Object.keys(RIDERS).length, unused: Object.keys(PRIMS).filter((p) => !K.some((k) => k.prim === p)) };
    });
    console.log(`data: ${data.kits}/${data.arts} arts kitted from ${data.prims} primitives x ${data.riders} riders x 3 forms; ${data.combos} distinct combinations, ${data.names} distinct names; boss kits ${data.bossKits}`);
    if (data.missing.length || data.combos !== data.kits || data.names !== data.kits || data.bossKits || data.unused.length) { console.log('FAIL data', JSON.stringify(data)); bad++; }

    // ---- 2 every kit fires
    const ids = await page.evaluate(async (only) => {
      const { PHOBOS_KITS } = await import('/src/data/phobosattacks.js');
      return Object.keys(PHOBOS_KITS).filter((id) => !only.length || only.includes(id) || only.includes(PHOBOS_KITS[id].prim)).sort();
    }, only);
    const results = [];
    for (let i = 0; i < ids.length; i += 25) {
      const part = await page.evaluate(async (chunk) => {
        const { G } = window.VELSCOUR;
        const { PHOBOS_BY_ID } = await import('/src/data/phobos.js');
        const { makeMonster } = await import('/src/game/monster.js');
        const { applyPhobosKit } = await import('/src/game/phobosattacks.js');
        const { depthLevel } = await import('/src/data/depth.js');
        const w = G.world, p = G.player, lvl = depthLevel(260);
        if (!window.__pkSpot) {   // a quiet spot with room round it
          let best = null;
          for (let i = 0; i < 3000 && !best; i++) {
            const x = 3 + Math.random() * (w.map.w - 6), y = 3 + Math.random() * (w.map.h - 6);
            let ok = w.map.circleFree(x, y, 0.4);
            for (let r = 1; ok && r <= 5; r++) for (let k = 0; ok && k < 16; k++) { const an = k / 16 * Math.PI * 2; ok = w.map.isFloor(x + Math.cos(an) * r, y + Math.sin(an) * r); }
            if (ok) best = [x, y];
          }
          window.__pkSpot = best || [p.x, p.y];
        }
        const [sx, sy] = window.__pkSpot, out = [];
        for (const id of chunk) {
          for (const c of w.creatures) if (c !== p) c.dead = true;
          w.hazards.length = 0; w.update(1 / 30);
          p.x = sx; p.y = sy; p.hp = p.maxHp; p.mana = p.maxMana; p.status = {}; p.kbx = p.kby = 0;
          const a = PHOBOS_BY_ID[id];
          const m = makeMonster(w, a.arch, w.biome, lvl, 'normal', sx + 2.4, sy + 0.3, 0, { art: id, swap: null });
          applyPhobosKit(m, a);
          w.add(m); m.awake = true; m.pk.cd = 0.2;
          const r = { id, name: a.name, arch: a.arch, kit: m.pk.K.name, prim: m.pk.K.prim, rider: m.pk.K.rider, err: null, casts: 0, landed: 0, hits: 0, hero: 0, firstCast: -1, statuses: [] };
          const st = new Set();
          try {
            for (let f = 0; f < 30 * 9; f++) {
              w.update(1 / 30);
              p.x = sx; p.y = sy; p.hp = p.maxHp; p.dead = false;
              for (const k in p.status) if (p.status[k] && p.status[k].t > 0) st.add(k);
              if (r.firstCast < 0 && m.pk.casts) r.firstCast = +(f / 30).toFixed(2);
              if (m.pk.casts && f / 30 - r.firstCast > 3.2) break;   // its marks, shots and leashes have all played out
            }
          } catch (e) { r.err = String(e && e.stack || e).split('\n').slice(0, 3).join(' | '); }
          Object.assign(r, { casts: m.pk.casts, landed: m.pk.landed, hits: m.pk.hits, hero: m.pk.hero, statuses: [...st] });
          out.push(r);
        }
        return out;
      }, ids.slice(i, i + 25));
      results.push(...part);
    }
    const byPrim = {};
    for (const r of results) {
      const ok = !r.err && r.casts > 0 && r.landed > 0;
      (byPrim[r.prim] ||= { n: 0, ok: 0, hero: 0, cast: 0 }).n++;
      if (ok) byPrim[r.prim].ok++;
      if (r.hero) byPrim[r.prim].hero++;
      byPrim[r.prim].cast += Math.max(0, r.firstCast);
      if (!ok) { bad++; console.log(`FAIL ${r.id} (${r.name}, ${r.arch}) ${r.kit}: casts ${r.casts} landed ${r.landed}${r.err ? ' ERR ' + r.err : ''}`); }
    }
    for (const [k, v] of Object.entries(byPrim).sort()) console.log(`${v.ok === v.n ? 'ok  ' : 'FAIL'} ${k.padEnd(10)} ${String(v.ok).padStart(2)}/${String(v.n).padEnd(2)} fired, hero struck by ${v.hero}, first cast after ${(v.cast / v.n).toFixed(1)} s`);
    const fired = results.filter((r) => !r.err && r.casts && r.landed).length;
    console.log(`${fired}/${results.length} signatures fired and landed; hero struck by ${results.filter((r) => r.hero).length}`);
    for (const r of results.filter((_, i) => i % 49 === 0)) console.log(`  e.g. ${r.name.padEnd(28)} ${r.kit.padEnd(36)} hits ${r.hero} hero{${r.statuses.join(',')}}`);

    // ---- auto-play fights a mixed pack (its danger map reads the marks): no errors, the kits cast, it dodges some
    const skirmish = await page.evaluate(async (ids) => {
      const { G, game } = window.VELSCOUR;
      const { PHOBOS_BY_ID } = await import('/src/data/phobos.js');
      const { makeMonster } = await import('/src/game/monster.js');
      const { applyPhobosKit } = await import('/src/game/phobosattacks.js');
      const { Auto } = await import('/src/game/autoplay.js');
      const { depthLevel } = await import('/src/data/depth.js');
      const w = G.world, p = G.player, [sx, sy] = window.__pkSpot;
      for (const c of w.creatures) if (c !== p) c.dead = true;
      w.hazards.length = 0; w.update(1 / 30);
      Object.assign(p, { x: sx, y: sy, hp: p.maxHp, status: {}, alpha: undefined, invuln: 0 });
      const pack = [];
      for (let i = 0; i < 8; i++) {
        const id = ids[Math.floor((i + 0.5) / 8 * ids.length)], a = PHOBOS_BY_ID[id], an = i / 8 * Math.PI * 2;
        const m = makeMonster(w, a.arch, w.biome, depthLevel(260), 'normal', sx + Math.cos(an) * 4, sy + Math.sin(an) * 4, 0, { art: id, swap: null });
        if (!w.map.circleFree(m.x, m.y, 0.3)) { m.x = sx + Math.cos(an) * 1.5; m.y = sy + Math.sin(an) * 1.5; }
        applyPhobosKit(m, a); m.maxHp *= 20; m.hp = m.maxHp; w.add(m); pack.push(m);
      }
      G.godMode = true; Auto.toggle(true);
      let dodging = 0, err = null;
      try {
        for (let f = 0; f < 30 * 20; f++) {
          G.dt = 1 / 30; G.time += G.dt; G.frame++; game.update(1 / 30);
          if (Auto.dangerList && Auto.dangerList.length && Auto.inDanger(Auto.dangerList, p.x, p.y)) dodging++;
          if (G.world !== w) break;
        }
      } catch (e) { err = String(e && e.stack || e).split('\n').slice(0, 3).join(' | '); }
      Auto.toggle(false);
      return { err, casts: pack.reduce((s, m) => s + m.pk.casts, 0), casters: pack.filter((m) => m.pk.casts).length, inDanger: +(dodging / 30).toFixed(1), kits: pack.map((m) => m.pk.K.prim).join(',') };
    }, ids);
    console.log(`auto-play skirmish (${skirmish.kits}): ${skirmish.casts} casts by ${skirmish.casters}/8, hero inside a marked zone ${skirmish.inDanger} s of 20${skirmish.err ? ' ERR ' + skirmish.err : ''}`);
    if (skirmish.err || skirmish.casters < 6) bad++;

    // ---- 3 line-ups mid-telegraph: four casters in a row across the screen, each at its own stand-in target
    if (!noshots) {
      const groups = await page.evaluate(async () => {
        const { PHOBOS_KITS, PRIMS } = await import('/src/data/phobosattacks.js');
        const prims = Object.keys(PRIMS), g = [], ids = Object.keys(PHOBOS_KITS).sort();
        for (let i = 0; i < prims.length; i += 4) g.push(prims.slice(i, i + 4).map((p) => ids.find((id) => PHOBOS_KITS[id].prim === p)).filter(Boolean));
        return g;
      });
      for (let gi = 0; gi < groups.length; gi++) {
        const names = await page.evaluate(async (list) => {
          const { G } = window.VELSCOUR;
          const { PHOBOS_BY_ID } = await import('/src/data/phobos.js');
          const { makeMonster } = await import('/src/game/monster.js');
          const { applyPhobosKit, castPhobosKit } = await import('/src/game/phobosattacks.js');
          const { loadArtFor } = await import('/src/core/enemyart.js');
          const { depthLevel } = await import('/src/data/depth.js');
          await loadArtFor(list, true);
          const w = G.world, p = G.player;
          if (!window.__pkWide) {   // the widest open floor on the level
            let best = null, bestR = 0;
            for (let i = 0; i < 2500; i++) {
              const x = 2 + Math.random() * (w.map.w - 4), y = 2 + Math.random() * (w.map.h - 4);
              if (!w.map.isFloor(x, y)) continue;
              let r = 1;
              while (r < 12 && [...Array(24)].every((_, k) => w.map.circleFree(x + Math.cos(k / 24 * Math.PI * 2) * r, y + Math.sin(k / 24 * Math.PI * 2) * r, 0.3))) r++;
              if (r > bestR) { bestR = r; best = [x, y]; }
            }
            window.__pkWide = best;
          }
          const [sx, sy] = window.__pkWide;
          for (const c of w.creatures) if (c !== p) c.dead = true;
          w.hazards.length = 0; w.update(1 / 30);
          p.x = sx + 1; p.y = sy + 1; p.hp = p.maxHp; p.status = {}; p.alpha = 0; p.invuln = 99;
          const { UI } = await import('/src/ui/ui.js');
          UI.clearCenterMsg(); UI.clearLog();
          const out = [];
          list.forEach((id, i) => {
            const a = PHOBOS_BY_ID[id], k = i - (list.length - 1) / 2, x = sx + k * 2.6, y = sy - k * 2.6;
            // the stand-in: a still, unkillable figure on the hero's side for the kit to aim at
            const d = makeMonster(w, 'skeleton', w.biome, 1, 'normal', x + 1.7, y + 1.7, 0, null);
            Object.assign(d, { team: 'player', static: true, ai: 'turret', invuln: 99, alpha: 0.45, pickTarget: () => null, speed: 0 });
            w.add(d);
            const m0 = makeMonster(w, a.arch, w.biome, depthLevel(260), 'normal', x, y, 0, { art: id, swap: null });
            applyPhobosKit(m0, a);
            w.add(m0); m0.awake = true; m0.speed = 0; m0.cd = 9; m0.pickTarget = () => d;
            castPhobosKit(m0, d, true);
            out.push(m0.pk.K.name);
          });
          return out;
        }, groups[gi]);
        await page.waitForTimeout(260);
        await shot(`phobos_attacks_${gi + 1}`);
        console.log(`shot phobos_attacks_${gi + 1}: ${names.join(', ')}`);
      }
    }
  } catch (e) { errors.push('[TEST] ' + (e.stack || e)); }
  report(errors);
  await browser.close();
  process.exit(bad || errors.length ? 1 : 0);
})();
