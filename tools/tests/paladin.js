// Paladin: damage of every skill, Shield Throw's ricochets and blast, the 3D hammers and the thrown 3D shield.
//   node tools/tests/paladin.js [dps|shield|shots|all] [hero levels, default 3,12,40,120] [seconds per skill, default 10]
// dps: a geared hero (gear rolled like tuning.js) with every skill at the same rank casts each damaging skill as fast
//   as its cast time and cooldown allow (mana is refilled and counted) at one pinned immortal dummy, then at a pack of
//   five, signatures off. Prints damage per second (one / pack), mana per second and each skill's value against the
//   median of its row (sqrt(one x pack), mana-limited). Writes out/paladin_dps.json for diffing.
// shield: Shield Throw strikes 2 foes at rank 1 and one more every 4 ranks (5 from rank 13), never the same foe twice,
//   and ends in a holy blast; it seeks foes that walk, blasts at a wall and at the end of its flight.
// shots: hammer model turntable sheet, the thrown shield sheet, Wheel of Hammers / Hammerstorm / Shield Throw / Judgement in play.
const { openGame, report } = require('./harness');
const fs = require('fs'), path = require('path');
const mode = process.argv[2] || 'all';
const levels = (process.argv[3] || '3,12,40,120').split(',').map(Number);
const secs = +(process.argv[4] || 10);
const OUT = process.env.OUT_DIR || path.join(__dirname, 'out');

(async () => {
  const { browser, page, errors, shot } = await openGame();
  const fails = [];
  await page.evaluate(async () => {
    const { G, game } = window.VELSCOUR;
    await game.newChar('paladin', 'Pal' + Math.random());
    document.querySelectorAll('.screen').forEach((s) => s.remove()); G.ui.modalCount = 0; G.ui.closeAll();
    G.settings.signatures = false; G.godMode = true;
  });

  if (mode === 'dps' || mode === 'all') {
    const all = {};
    for (const H of levels) {
      const res = await page.evaluate(async ({ H, secs, only }) => {
        const { G, game } = window.VELSCOUR;
        const { CLASS_SKILLS, MAX_SKILL_LEVEL, manaCost } = await import('/src/data/skills.js');
        const { BIOME_BY_ID } = await import('/src/data/biomes.js');
        const { makeMonster } = await import('/src/game/monster.js');
        const { rollItem } = await import('/src/data/items.js');
        const { depthLevel } = await import('/src/data/depth.js');
        const { Auto } = await import('/src/game/autoplay.js');
        const c = G.char, p = G.player;
        c.level = H; c.statPoints = (H - 1) * 5; c.skillPoints = 0;
        Auto.spendStats();
        const R = Math.min(MAX_SKILL_LEVEL, Math.max(1, Math.round(H / 3)));
        for (const sk of CLASS_SKILLS.paladin) c.skills[sk.id] = sk.reqLevel <= H ? R : 0;
        c.bag = c.bag.map(() => null);
        let seed = H * 7919; const rnd = Math.random; Math.random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646; // the same gear every run
        for (let i = 0; i < 25 && i < c.bag.length; i++) { const it = rollItem(Math.max(1, H - Math.floor(Math.random() * 3)), { mf: 0, bonus: 0.1 }); it.unid = false; c.bag[i] = it; }
        p.recompute(); Auto.optimizeGear(); c.bag = c.bag.map(() => null); p.recompute(); Math.random = rnd;
        game.buildDungeon(Math.max(1, H - 2), BIOME_BY_ID.overworld);
        await new Promise((r) => setTimeout(r, 200));
        const w = G.world, P = G.player;
        w.creatures = w.creatures.filter((m) => m.team !== 'enemy');
        let spot = null;
        for (let t = 0; t < 8000 && !spot; t++) {
          const x = 10 + Math.random() * (w.map.w - 20), y = 10 + Math.random() * (w.map.h - 20);
          let ok = true;
          for (let dx = -7; dx <= 7 && ok; dx++) for (let dy = -7; dy <= 7 && ok; dy++) ok = w.map.walkable(x + dx, y + dy);
          if (ok) spot = [x, y];
        }
        const [hx, hy] = spot, L = depthLevel(Math.max(1, H - 2));
        const step = () => { G.dt = 1 / 30; G.time += G.dt; G.frame++; game.update(1 / 30); };
        const fight = (sk, n) => {
          w.hazards.length = 0; w.creatures = w.creatures.filter((m) => m === P);
          P.x = hx; P.y = hy; P.hp = P.maxHp; P.cooldowns = {}; P.buffs = []; P.castLock = 0; P.channel = null; P.queued = null; P.attackTarget = null; P.moveTarget = null; P.path = null; P.recompute();
          // one foe 1.1 tiles ahead, or a pack of five round a point 1.8 ahead (the nearest 1.1 away: in melee reach)
          const cx = hx + (n > 1 ? 1.8 : 1.1), cy = hy, dummies = [];
          for (let k = 0; k < n; k++) {
            const a = Math.PI + (k / n) * Math.PI * 2, r = n > 1 ? 0.7 : 0;
            const m = makeMonster(w, 'ghoul', w.biome, L, 'normal', cx + Math.cos(a) * r, cy + Math.sin(a) * r);
            m.maxHp = m.hp = 1e15; m.awake = true; m.speed = 0; m.dmg = 0; m.res = {}; m.moves = null; m.affixes = null;
            m.x0 = m.x; m.y0 = m.y; w.add(m); dummies.push(m);
          }
          w.rebuildGrid && w.rebuildGrid();
          let dealt = 0, mana = 0, casts = 0;
          const aim = [dummies[0].x0, dummies[0].y0]; // channels and whirls follow the aim, which the mouse would move
          Object.defineProperty(P, 'aim', { get: () => aim, set() {}, configurable: true });
          const moving = () => w.hazards.some((h) => h.src === P && /^(Leap|Dash|Whirl)$/.test(h.constructor.name));
          for (let i = 0; i < secs * 30; i++) {
            P.mana = P.maxMana = 1e9;
            if (P.castLock <= 0 && !P.channel && !moving()) {
              if (Math.hypot(P.x - hx, P.y - hy) > 0.1) { P.x = hx; P.y = hy; }
              if (!(P.cooldowns[sk.id] > 0)) {
                // at the nearest foe, as a player would
                if (P.tryUseSkill(sk, dummies[0].x0, dummies[0].y0, dummies[0])) { casts++; mana += manaCost(sk, P.skillLevel(sk)); }
              }
            }
            step();
            for (const d of dummies) { dealt += d.maxHp - d.hp; d.hp = d.maxHp; d.x = d.x0; d.y = d.y0; d.dead = false; d.status = {}; }
          }
          delete P.aim; P.aim = null;
          return { dps: dealt / secs, mps: mana / secs, casts };
        };
        const regen = (() => { P.mana = 0; P.recompute(); return P.st.manaRegen + P.maxMana / 40; })();
        const rows = [];
        for (const sk of CLASS_SKILLS.paladin) {
          if (!(c.skills[sk.id] > 0) || ['heal'].includes(sk.kind) || (only && !only.includes(sk.name))) continue;
          const one = fight(sk, 1), pack = fight(sk, 5);
          rows.push({ id: sk.id, name: sk.name, kind: sk.kind, tree: sk.tree, row: sk.row, one: one.dps, pack: pack.dps, mps: pack.mps, casts: pack.casts });
        }
        P.mana = P.maxMana;
        return { H, R, regen, rows };
      }, { H, secs, only: process.env.PAL_ONLY ? process.env.PAL_ONLY.split(',') : null });
      all[H] = res;
      const val = (r) => (r.pack > 0 ? Math.sqrt(r.pack * Math.max(r.one, 1)) * Math.min(1, res.regen / Math.max(1e-9, r.mps)) : 0);
      for (const r of res.rows) r.v = val(r);
      const med = {};
      for (let row = 0; row < 5; row++) {
        const v = res.rows.filter((r) => r.row === row && r.v > 0).map((r) => r.v).sort((a, b) => a - b);
        med[row] = v.length ? v[v.length >> 1] : 1;
      }
      console.log(`\nhero level ${H}, every skill rank ${res.R}, mana supply ${res.regen.toFixed(1)}/s`);
      console.log('skill'.padEnd(24) + 'kind'.padEnd(8) + 'T R ' + 'one/s'.padStart(9) + 'pack/s'.padStart(10) + 'mana/s'.padStart(8) + '  x row');
      for (const r of res.rows) {
        r.rel = r.v / med[r.row];
        console.log(r.name.padEnd(24) + r.kind.padEnd(8) + `${r.tree} ${r.row} ` + r.one.toFixed(0).padStart(9) + r.pack.toFixed(0).padStart(10) + r.mps.toFixed(1).padStart(8) + '  ' + (r.v ? r.rel.toFixed(2) : '  - '));
      }
    }
    fs.writeFileSync(path.join(OUT, 'paladin_dps.json'), JSON.stringify(all, null, 1));
  }

  if (mode === 'shield' || mode === 'all') {
    const res = await page.evaluate(async () => {
      const { G, game } = window.VELSCOUR;
      const { CLASS_SKILLS, ricochetCount } = await import('/src/data/skills.js');
      const { BIOME_BY_ID } = await import('/src/data/biomes.js');
      const { makeMonster } = await import('/src/game/monster.js');
      const { Projectile } = await import('/src/game/hazards.js');
      const sk = CLASS_SKILLS.paladin.find((x) => x.name === 'Shield Throw'), out = { lines: [], fails: [] };
      const c = G.char; c.level = Math.max(c.level, 20);
      const step = (n, f) => { for (let i = 0; i < n; i++) { G.dt = 1 / 30; G.time += G.dt; G.frame++; f && f(i); game.update(1 / 30); } };
      // every strike and blast of the player's thrown shields
      const P = Projectile.prototype, origR = P.ricochetFrom, origI = P.impact, log = [];
      P.ricochetFrom = function (t) { if (this.fx === 'pshield') log.push({ pr: this, hit: t.id }); return origR.call(this, t); };
      P.impact = function () { if (this.fx === 'pshield') log.push({ pr: this, blast: [this.x, this.y], t: this.t }); return origI.call(this); };
      const open = (biome, r) => {
        game.buildDungeon(8, BIOME_BY_ID[biome]);
        const w = G.world, p = G.player; w.creatures = w.creatures.filter((m) => m === p);
        for (let t = 0; t < 9000; t++) {
          const x = 8 + Math.random() * (w.map.w - 16), y = 8 + Math.random() * (w.map.h - 16);
          let ok = true;
          for (let dx = -r; dx <= r && ok; dx++) for (let dy = -r; dy <= r && ok; dy++) ok = w.map.walkable(x + dx, y + dy);
          if (ok) { p.x = x; p.y = y; break; }
        }
        p.recompute(); return { w, p };
      };
      const dummies = (w, pts) => pts.map(([x, y]) => {
        const m = makeMonster(w, 'ghoul', w.biome, 8, 'normal', x, y);
        m.maxHp = m.hp = 1e12; m.awake = true; m.speed = 0; m.dmg = 0; m.moves = null; m.affixes = null; w.add(m); return m;
      });
      const throwAt = (p, x, y, t, f) => {
        p.mana = p.maxMana = 1e6; p.castLock = 0; p.cooldowns = {}; log.length = 0;
        if (!p.tryUseSkill(sk, x, y, t)) return null;
        let k = 0; for (; k < 300 && G.world.hazards.some((h) => h instanceof Projectile && h.fx === 'pshield'); k++) step(1, f);
        const hits = log.filter((e) => e.hit !== undefined), blasts = log.filter((e) => e.blast);
        return { hits: hits.map((e) => e.hit), blasts, secs: k / 30 };
      };
      // 1. ranks 1..20 against seven foes in a loose line: 2, 3, 4, 5 foes, never one twice, then one blast
      {
        const { w, p } = open('overworld', 7);
        const foes = dummies(w, [[2, 0.3], [3.4, -0.6], [4.6, 0.5], [5.8, -0.4], [6.2, 1.2], [3, 1.6], [5, -1.7]].map(([dx, dy]) => [p.x + dx, p.y + dy]));
        for (const R of [1, 4, 5, 8, 9, 12, 13, 20]) {
          c.skills[sk.id] = R; p.recompute();
          const L = p.skillLevel(sk), want = Math.min(foes.length, ricochetCount(sk, L));
          const r = throwAt(p, foes[0].x, foes[0].y, foes[0], () => { for (const f of foes) f.hp = f.maxHp; });
          if (!r) { out.fails.push(`rank ${R}: could not throw`); continue; }
          const uniq = new Set(r.hits).size;
          out.lines.push(`rank ${R} (level ${L}): struck ${r.hits.length} foes (${uniq} different, want ${want}), ${r.blasts.length} blast, ${r.secs.toFixed(2)}s`);
          if (r.hits.length !== want || uniq !== want) out.fails.push(`rank ${R}: struck ${r.hits.length}/${uniq}, want ${want}`);
          if (r.blasts.length !== 1) out.fails.push(`rank ${R}: ${r.blasts.length} blasts`);
          if (L >= 13 && want !== 5) out.fails.push(`rank ${R}: only ${want} at level ${L}`);
        }
        // 2. foes on the move: it still finds all five
        c.skills[sk.id] = 13; p.recompute();
        for (const f of foes) { f.x0 = f.x; f.y0 = f.y; }
        const r = throwAt(p, foes[0].x, foes[0].y, foes[0], (i) => { for (const [j, f] of foes.entries()) { f.x = f.x0 + Math.sin(i * 0.15 + j) * 1.2; f.y = f.y0 + Math.cos(i * 0.12 + j) * 0.8; f.hp = f.maxHp; } });
        out.lines.push(`moving foes: struck ${r.hits.length} (${new Set(r.hits).size} different), ${r.blasts.length} blast`);
        if (r.hits.length !== 5 || new Set(r.hits).size !== 5 || r.blasts.length !== 1) out.fails.push('moving foes: ' + JSON.stringify({ n: r.hits.length, b: r.blasts.length }));
        // 3. one foe alone: one strike, then the blast where it stands
        w.creatures = w.creatures.filter((m) => !foes.includes(m) || m === foes[0]);
        foes[0].x = foes[0].x0; foes[0].y = foes[0].y0;
        const one = throwAt(p, foes[0].x, foes[0].y, foes[0]);
        const d = one.blasts[0] ? Math.hypot(one.blasts[0].blast[0] - foes[0].x, one.blasts[0].blast[1] - foes[0].y) : 99;
        out.lines.push(`one foe: struck ${one.hits.length}, blast ${d.toFixed(2)} tiles from it`);
        if (one.hits.length !== 1 || one.blasts.length !== 1 || d > 0.6) out.fails.push('one foe: ' + JSON.stringify({ n: one.hits.length, b: one.blasts.length, d }));
        // 4. thrown at nothing: it flies its range and blasts at the end
        w.creatures = w.creatures.filter((m) => m === p);
        const none = throwAt(p, p.x - 6, p.y, null);
        out.lines.push(`no foes: ${none.blasts.length} blast after ${none.secs.toFixed(2)}s`);
        if (none.hits.length || none.blasts.length !== 1) out.fails.push('no foes: ' + JSON.stringify({ n: none.hits.length, b: none.blasts.length }));
        // the blast damages a foe it did not strike
        const [a, b] = dummies(w, [[p.x + 2, p.y], [p.x + 2.6, p.y + 0.6]]);
        c.skills[sk.id] = 1; p.recompute();
        const hb0 = b.hp; throwAt(p, a.x, a.y, a);
        const bHit = log.some((e) => e.hit === b.id);
        if (!bHit && !(b.hp < hb0)) out.fails.push('blast: a foe beside the last one took no damage');
        out.lines.push(`blast: the foe beside took ${(hb0 - b.hp).toFixed(0)} (${bHit ? 'struck too' : 'from the blast'})`);
      }
      // 5. at a dungeon wall: it bursts on the wall
      {
        const { w, p } = open('catacombs', 1);
        let wall = null;
        for (let a = 0; a < 16 && !wall; a++) { const ang = a * Math.PI / 8; for (let d = 1; d < 8; d++) if (!w.map.isFloor(p.x + Math.cos(ang) * d, p.y + Math.sin(ang) * d)) { wall = [ang, d]; break; } }
        const r = wall && throwAt(p, p.x + Math.cos(wall[0]) * 9, p.y + Math.sin(wall[0]) * 9, null);
        out.lines.push(`wall: ${r ? r.blasts.length + ' blast after ' + r.secs.toFixed(2) + 's (wall ' + wall[1] + ' tiles away)' : 'no wall found'}`);
        if (r && (r.blasts.length !== 1 || r.secs > wall[1] / 8 + 0.4)) out.fails.push('wall: ' + JSON.stringify({ b: r.blasts.length, s: r.secs }));
      }
      P.ricochetFrom = origR; P.impact = origI;
      return out;
    });
    for (const l of res.lines) console.log('  ' + l);
    fails.push(...res.fails.map((f) => 'FAIL shield throw: ' + f));
  }

  if (mode === 'shots' || mode === 'all') {
    // the models on a plain canvas: hammer turntable (8 headings x 4 tumbles, then fire/cold/light fittings and the
    // light-cast JUDGEMENT hammer), and the thrown shield at 8 headings x 4 moments
    const sheets = await page.evaluate(async () => {
      const H = await import('/src/gfx/hammer3d.js');
      const { drawThrownShield, preloadLancerShield } = await import('/src/gfx/lancershields.js');
      const { elem } = await import('/src/gfx/vfx.js');
      const { isoX, isoY } = await import('/src/core/view.js');
      const rec = preloadLancerShield('round');
      for (let i = 0; i < 100 && !rec.ready; i++) await new Promise((r) => setTimeout(r, 50));
      const sheet = (w, h, fn) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.fillStyle = '#2b2a30'; g.fillRect(0, 0, w, h); g.imageSmoothingEnabled = false; fn(g); return c.toDataURL('image/png'); };
      const hammers = sheet(1200, 760, (g) => {
        for (let i = 0; i < 8; i++) for (let j = 0; j < 4; j++) H.drawHammer3D(g, 75 + i * 145, 70 + j * 125, { head: i * Math.PI / 4, spin: -j * Math.PI / 2, size: 3.2, E: elem('holy'), glow: j === 3 ? 0.6 : 0 });
        ['fire', 'cold', 'light'].forEach((el, i) => H.drawHammer3D(g, 75 + i * 145, 600, { head: 0.6, spin: -0.5, size: 3.2, E: elem(el), glow: 0.6 }));
        H.drawGreatHammer(g, 820, 740, 4.6, H.hammerPalette(null, true), -0.7);
      });
      const shields = sheet(960, 400, (g) => {
        for (let i = 0; i < 8; i++) for (let j = 0; j < 4; j++) {
          const a = i * Math.PI / 4, ox = 60 + i * 120 - isoX(0, 0), oy = 70 + j * 95 - isoY(0, 0) + 26;
          g.save(); g.translate(ox, oy); g.scale(1, 1);
          drawThrownShield(g, { x: 0, y: 0, z: 26, vx: Math.cos(a), vy: Math.sin(a), t: j * 0.07, size: 1.5, E: elem('holy') });
          g.restore();
        }
      });
      return { hammer_sheet: hammers, shield_sheet: shields, ready: rec.ready };
    });
    if (!sheets.ready) fails.push('FAIL the round shield model never loaded');
    for (const k of ['hammer_sheet', 'shield_sheet']) fs.writeFileSync(path.join(OUT, `paladin_${k}.png`), Buffer.from(sheets[k].split(',')[1], 'base64'));
    // in play: a pack of dummies, then each skill cast and shot a moment later
    await page.evaluate(async () => {
      const { G, game } = window.VELSCOUR;
      const { BIOME_BY_ID } = await import('/src/data/biomes.js');
      const { makeMonster } = await import('/src/game/monster.js');
      const { CLASS_SKILLS } = await import('/src/data/skills.js');
      G.char.level = 40; for (const sk of CLASS_SKILLS.paladin) G.char.skills[sk.id] = 13;
      game.buildDungeon(12, BIOME_BY_ID.overworld);
      const w = G.world, p = G.player; w.creatures = w.creatures.filter((m) => m === p || m.summon);
      for (let t = 0; t < 9000; t++) {
        const x = 8 + Math.random() * (w.map.w - 16), y = 8 + Math.random() * (w.map.h - 16);
        let ok = true;
        for (let dx = -6; dx <= 6 && ok; dx++) for (let dy = -6; dy <= 6 && ok; dy++) ok = w.map.walkable(x + dx, y + dy);
        if (ok) { p.x = x; p.y = y; break; }
      }
      for (let k = 0; k < 7; k++) { const m = makeMonster(w, 'skeleton', w.biome, 12, 'normal', p.x + 2.4 + (k % 4) * 0.9, p.y - 1 + Math.floor(k / 4) * 1.6 + (k % 2) * 0.4); m.maxHp = m.hp = 1e12; m.speed = 0; m.dmg = 0; m.moves = null; w.add(m); }
      p.recompute(); G.settings.zoom = 2; G.settings.signatures = true;
    });
    // the live loop keeps rendering, but the world only moves when advance() steps it: exact moments in every shot
    await page.evaluate(() => { const { game } = window.VELSCOUR; game._update = game._update || game.update; game.update = () => {}; });
    const advance = (secs) => page.evaluate((secs) => {
      const { G, game } = window.VELSCOUR;
      for (let i = 0; i < Math.round(secs * 60); i++) { G.dt = 1 / 60; G.time += G.dt; G.frame++; game._update(1 / 60); }
    }, secs);
    const cast = (names, x = 3.5, y = 0) => page.evaluate(async ({ names, x, y }) => {
      const { G } = window.VELSCOUR;
      const { CLASS_SKILLS } = await import('/src/data/skills.js');
      const p = G.player; p.mana = p.maxMana = 1e6; G.world.hazards.length = 0; // a clean stage for each skill
      for (const n of names) { p.castLock = 0; p.cooldowns = {}; p.tryUseSkill(CLASS_SKILLS.paladin.find((s) => s.name === n), p.x + x, p.y + y, null); }
    }, { names, x, y });
    const at = async (name, times) => { let t0 = 0; for (const t of times) { await advance((t - t0) / 1000); t0 = t; await page.waitForTimeout(60); await shot(`paladin_${name}_${t}`); } await advance(1.5); };
    for (const [name, list, times] of [['wheel', ['Wheel of Hammers'], [300, 900]], ['storm', ['Hammerstorm', 'Blessed Hammer'], [250, 700]],
      ['shield', ['Shield Throw'], [80, 200, 330, 480]], ['gods', ['Hammer of the Gods'], [100, 180]]]) {
      await cast(list); await at(name, times);
    }
    await cast(['Shield Throw'], -3, -3); await at('shield_air', [280]); // up the screen, away from the pack: the model alone
    await page.evaluate(async () => { const { G } = window.VELSCOUR; const { sigFire } = await import('/src/game/signature.js'); sigFire(G.player); });
    await at('judgement', [250, 520, 900]);
    await page.evaluate(() => { const { game } = window.VELSCOUR; game.update = game._update; });
  }

  report(errors.concat(fails));
  await browser.close();
})();
