// The see-through layer (creature.js xray/drawXray, render.js drawSeeThrough) and its three settings:
//  1. defaults: see-through outlines on, life bars over every enemy on, wall-base outlines off; the settings dialog
//  2. a level 117 Astronomer in a dungeon with a staged crowd (normal, champion, unique, boss, a pet) under a white
//     cover drawn over the whole scene like a screen of novas: every rim colour shows through it with outlines on and
//     is gone with them off; every enemy (the boss too) has a life bar over its head, and none without the setting
//  3. a champion behind a nearer monster: the nearer body cuts the champion's outline (blue round it drops)
//  4. wall-base outlines: the line colour over the cover with the setting on, none off
//  5. shots with real spells (Supernova, Big Bang, Starstorm): seethrough_<spell>_on/_off/_walls.png, a monster
//     behind a wall (seethrough_wall.png) and the settings dialog (seethrough_settings.png)
//   node tools/tests/seethrough.js [mobile]
const { openGame, report, OUT_DIR } = require('./harness');
const MOBILE = process.argv.includes('mobile');
let bad = 0;
const fail = (m) => { console.log('FAIL ' + m); bad++; };
const ok = (m) => console.log('  ok ' + m);
const T = MOBILE ? 'm_' : '';

(async () => {
  const { browser, page, errors } = await openGame(MOBILE ? { width: 844, height: 390, mobile: true } : { width: 1280, height: 720 });
  const shot = (name) => page.screenshot({ path: `${OUT_DIR}/seethrough_${T}${name}.png` });
  // ------------------------------------------------------------ 1. defaults + dialog
  const d = await page.evaluate(async () => {
    const { G } = window.VELSCOUR;
    const { settingsDialog } = await import('/src/ui/screens.js');
    settingsDialog();
    const box = (k) => document.querySelector(`.settings-grid [data-k="${k}"]`);
    const r = { outlines: G.settings.outlines, lifeBars: G.settings.lifeBars, wallLines: G.settings.wallLines,
      boxes: ['outlines', 'lifeBars', 'wallLines'].map((k) => (box(k) ? box(k).checked : 'missing')) };
    return r;
  });
  await page.waitForTimeout(200);
  await shot('settings');
  await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent === 'Done'); if (b) b.click(); });
  if (d.outlines === true && d.lifeBars === true && d.wallLines === false && d.boxes.join() === 'true,true,false') ok(`defaults: outlines on, life bars on, wall lines off; dialog boxes ${d.boxes.join(',')}`);
  else fail('defaults/dialog ' + JSON.stringify(d));

  // ------------------------------------------------------------ 2. stage the crowd under a white cover
  const st = await page.evaluate(async () => {
    const { G, game } = window.VELSCOUR;
    await game.newChar('arcane_sorcerer', 'Seer');
    document.querySelectorAll('.screen').forEach((s) => s.remove()); G.ui.modalCount = 0;
    G.char.depth = 6; const w0 = G.world; game.enterDungeon();
    for (let i = 0; i < 150 && (G.world === w0 || !document.getElementById('loading').classList.contains('hidden')); i++) await new Promise((r) => setTimeout(r, 100));
    G.paused = false; G.godMode = true; G.settings.gore = 0; G.settings.shake = false;
    document.getElementById('center-msg').style.display = 'none';
    const upd = game.update.bind(game);
    window.__step = 0;
    game.update = (dt) => upd(window.__step > 0 ? (window.__step--, 1 / 60) : 0); // frozen unless stepped
    const { CLASS_SKILLS } = await import('/src/data/skills.js');
    const { camera } = await import('/src/core/view.js');
    const { makeMonster, buildSummon } = await import('/src/game/monster.js');
    const { SUMMONS } = await import('/src/data/summons.js');
    const { loadPetArt } = await import('/src/core/enemyart.js');
    await loadPetArt();
    const p = G.player, w = G.world, map = w.map;
    for (const sk of CLASS_SKILLS.arcane_sorcerer) G.char.skills[sk.id] = 20;
    G.char.level = 117; p.recompute(); p.mana = p.maxMana = 99999;
    w.creatures = w.creatures.filter((c) => c.team !== 'enemy');
    // an open patch of floor (the crowd stands in it), the nearest to the start
    let spot = null;
    const open = (x, y) => { for (let dx = -2; dx <= 5; dx++) for (let dy = -2; dy <= 3; dy++) if (!map.isFloor(Math.floor(x + dx), Math.floor(y + dy))) return false; return true; };
    for (let r = 0; r < 90 && !spot; r++) for (let dy = -r; dy <= r && !spot; dy++) for (let dx = -r; dx <= r && !spot; dx++) {
      const x = Math.floor(p.x) + dx + 0.5, y = Math.floor(p.y) + dy + 0.5;
      if (map.inb(Math.floor(x), Math.floor(y)) && open(x, y)) spot = [x, y];
    }
    if (!spot) return { err: 'no open spot' };
    p.x = spot[0]; p.y = spot[1]; map.reveal(p.x, p.y, 16);
    G.settings.zoom = 1.2; camera.computeZoom(); camera.follow(p.x + 1, p.y, 0, true);
    const mk = (rank, dx, dy) => { const m = makeMonster(w, 'skeleton', w.biome, 40, rank, p.x + dx, p.y + dy); m.maxHp = m.hp = 1e7; m.awake = false; m.speed = 0; m.spawnT = 5; m.update = () => {}; w.add(m); return m; };
    window.__crowd = { normal: mk('normal', 2.6, -1.6), champion: mk('champion', 3.4, 0.2), unique: mk('unique', 1.4, 2.2), boss: mk('boss', 4.4, 2.6) };
    const key = Object.keys(SUMMONS).find((k) => SUMMONS[k].look && Array.isArray(SUMMONS[k].look.art));
    const pet = buildSummon(p, SUMMONS[key], key, p.x - 1.2, p.y + 1.4, 1, 100, 0); pet.spawnT = 5; pet.update = () => {};
    window.__crowd.pet = w.add(pet) || pet;
    // the cover: a white sheet over the whole scene, drawn where the spells are (the world's top hazards)
    window.__cover = { update() { return true; }, draw(ctx) { if (window.__coverOn) { ctx.fillStyle = '#ffffff'; ctx.fillRect(-1e5, -1e5, 2e5, 2e5); } } };
    w.addHazard(window.__cover);
    window.__frames = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(r))));
    // the canvas's pixels in a CSS px rect [x0, y0, x1, y1], and how many differ (summed channels > 90) between two grabs
    window.__grab = (r) => {
      const dp = G.dpr, c = G.canvas, x0 = Math.max(0, Math.floor(r[0] * dp)), y0 = Math.max(0, Math.floor(r[1] * dp));
      const x1 = Math.min(c.width, Math.ceil(r[2] * dp)), y1 = Math.min(c.height, Math.ceil(r[3] * dp));
      return x1 > x0 && y1 > y0 ? G.ctx.getImageData(x0, y0, x1 - x0, y1 - y0).data : new Uint8ClampedArray(0);
    };
    window.__diff = (a, b) => { let n = 0; for (let i = 0; i < a.length; i += 4) if (Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]) > 90) n++; return n; };
    // how much of creature m shows in rect r: the pixels that change when it turns invisible (alpha 0: its sprite, rim
    // and see-through ring go; the light, the camera and its name stay put)
    window.__shows = async (m, r) => {
      await window.__frames();
      const a = window.__grab(r), oa = m.alpha;
      m.alpha = 0; await window.__frames();
      const b = window.__grab(r);
      m.alpha = oa; await window.__frames();
      return window.__diff(a, b);
    };
    return { spot, biome: w.biome.id, pet: key };
  });
  if (st.err) { fail(st.err); await browser.close(); return report(errors); }
  console.log(`  .. ${st.biome} at ${st.spot.map((v) => v.toFixed(1))}, pet ${st.pet}`);

  const set = (o) => page.evaluate((o) => Object.assign(window.VELSCOUR.G.settings, o), o);
  // each creature's showing pixels round its sprite (the top rows left out: champion names sit there)
  const shows = () => page.evaluate(async () => {
    const { G } = window.VELSCOUR, out = {};
    for (const [k, m] of Object.entries({ ...window.__crowd, hero: G.player })) {
      if (!m.sbox) { out[k] = -1; continue; }
      const [x0, y0, x1, y1] = m.sbox;
      out[k] = await window.__shows(m, [x0 - 6, y0 + 4, x1 + 6, y1 + 6]);
    }
    return out;
  });
  await page.evaluate(() => { window.__coverOn = true; });
  await set({ outlines: true, lifeBars: false, wallLines: false });
  const on = await shows();
  await set({ outlines: false });
  const off = await shows();
  console.log('  .. px showing through the cover, outlines on/off: ' + Object.keys(on).map((k) => `${k} ${on[k]}/${off[k]}`).join(', '));
  const n0 = bad;
  for (const k of Object.keys(on)) if (!(on[k] >= 30) || !(off[k] <= 3)) fail(`${k} through the cover: ${on[k]} px with outlines on, ${off[k]} off`);
  if (bad === n0) ok('the hero, a pet and every rank (normal, champion, unique, boss) show through a white cover with outlines on, not at all off');

  // life bars: the strip over each head, with the setting on and off (outlines on both times)
  const bars = (lifeBars) => page.evaluate(async (lifeBars) => {
    const { G } = window.VELSCOUR, { camera } = await import('/src/core/view.js'), out = {};
    G.settings.lifeBars = true; await window.__frames();
    const strips = {};
    for (const k of ['normal', 'champion', 'unique', 'boss']) {
      const m = window.__crowd[k], by = camera.toScreen(0, m.barTop)[1];
      strips[k] = [m.sbox[0] - 40, by - 1, m.sbox[2] + 40, by + 7 * camera.zoom];
      out[k] = { has: m.barTop != null };
    }
    const a = Object.fromEntries(Object.entries(strips).map(([k, r]) => [k, window.__grab(r)]));
    G.settings.lifeBars = lifeBars; await window.__frames();
    for (const k of Object.keys(strips)) { out[k].px = window.__diff(a[k], window.__grab(strips[k])); out[k].after = window.__crowd[k].barTop != null; }
    return out;
  }, lifeBars);
  const lb = await bars(false);
  console.log('  .. life bar px (gone with the setting off): ' + Object.entries(lb).map(([k, v]) => `${k} ${v.px}`).join(', '));
  const n1 = bad;
  for (const [k, v] of Object.entries(lb)) if (!v.has || !(v.px >= 20) || v.after) fail(`${k} life bar over the cover: ${JSON.stringify(v)}`);
  if (bad === n1) ok('every enemy, the boss too, has a life bar over the cover; none with the setting off (nobody hit)');
  // the old flash of a bar over a hit monster, with the setting off
  const flash = await page.evaluate(async () => { const c = window.__crowd; c.normal.hpShow = 2; c.boss.hpShow = 2; await window.__frames(); return [c.normal.barTop != null, c.boss.barTop != null]; });
  if (flash[0] && !flash[1]) ok('setting off: a hit monster flashes its bar, a hit boss does not (as before)'); else fail('setting off, hit bars ' + JSON.stringify(flash));
  await page.evaluate(() => { const c = window.__crowd; c.normal.hpShow = 0; c.boss.hpShow = 0; });

  // ------------------------------------------------------------ 3. a nearer body cuts a farther outline
  await set({ outlines: true, lifeBars: false });
  const occ = await page.evaluate(async () => {
    const { G } = window.VELSCOUR, c = window.__crowd, front = c.normal, sx = front.x, sy = front.y;
    front.x = c.champion.x + 0.35; front.y = c.champion.y + 0.35; // just in front (larger x + y), the same screen column
    await window.__frames();
    const r = front.sbox, inner = [r[0] + 3, r[1] + 3, r[2] - 3, r[3] - 3];
    // the front monster's body: what it changes with the cover off and no outlines
    window.__coverOn = false; G.settings.outlines = false; await window.__frames();
    const a = window.__grab(inner); front.alpha = 0; await window.__frames();
    const b = window.__grab(inner); front.alpha = undefined;
    const body = new Uint8Array(a.length / 4);
    for (let i = 0; i < a.length; i += 4) body[i / 4] = Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]) > 90 ? 1 : 0;
    window.__coverOn = true; G.settings.outlines = true;
    // the champion's showing pixels on that body, with the front monster there and moved away
    const onBody = async () => {
      await window.__frames(); const x = window.__grab(inner);
      c.champion.alpha = 0; await window.__frames(); const y = window.__grab(inner); c.champion.alpha = undefined;
      let n = 0;
      for (let i = 0; i < x.length; i += 4) if (body[i / 4] && Math.abs(x[i] - y[i]) + Math.abs(x[i + 1] - y[i + 1]) + Math.abs(x[i + 2] - y[i + 2]) > 90) n++;
      return n;
    };
    const behind = await onBody();
    front.x = sx; front.y = sy;
    const alone = await onBody();
    return { behind, alone, body: body.reduce((t, v) => t + v, 0) };
  });
  if (occ.alone >= 20 && occ.behind <= occ.alone * 0.15) ok(`a nearer monster's body cuts the champion's outline: ${occ.alone} px of it show there alone, ${occ.behind} behind it (body ${occ.body} px)`);
  else fail('occlusion by a nearer body ' + JSON.stringify(occ));
  await set({ lifeBars: true });

  // ------------------------------------------------------------ 4. wall-base outlines
  const walls = await page.evaluate(async () => {
    const { G } = window.VELSCOUR, c = G.canvas, all = [0, 0, c.width / G.dpr, c.height / G.dpr];
    G.settings.wallLines = false; await window.__frames(); const a = window.__grab(all);
    G.settings.wallLines = true; await window.__frames(); const b = window.__grab(all);
    // none over a creature: the crowd's bodies (inner boxes) are the same with and without
    let over = 0;
    for (const m of Object.values(window.__crowd)) {
      const r = m.sbox, inner = [r[0] + 4, r[1] + 4, r[2] - 4, r[3] - 4];
      G.settings.wallLines = false; await window.__frames(); const x = window.__grab(inner);
      G.settings.wallLines = true; await window.__frames(); over += window.__diff(x, window.__grab(inner));
    }
    return { px: window.__diff(a, b), over };
  });
  if (walls.px >= 500) ok(`wall-base outlines over the cover: ${walls.px} px change`); else fail('wall-base outlines ' + JSON.stringify(walls));
  console.log(`  .. wall-line px inside the crowd's bodies: ${walls.over}`);
  await shot('cover_walls');
  await set({ wallLines: false });
  await page.evaluate(() => { window.__coverOn = false; });

  // ------------------------------------------------------------ 5. real spells
  const step = async (n) => { await page.evaluate((k) => { window.__step = k; }, n); await page.waitForFunction(() => window.__step === 0); };
  for (const [name, frames, dx, dy] of [['Supernova', 14, 3, 0], ['Big Bang', 92, 3.5, 0.5], ['Starstorm', 30, 3, 0.4]]) {
    const okc = await page.evaluate(async ([name, dx, dy]) => {
      const { G } = window.VELSCOUR, p = G.player, w = G.world;
      const { CLASS_SKILLS } = await import('/src/data/skills.js');
      const sk = CLASS_SKILLS.arcane_sorcerer.find((s) => s.name === name);
      if (!sk) return false;
      const { effects, particles, texts } = await import('/src/gfx/vfx.js'); effects.length = 0; particles.length = 0; texts.length = 0;
      w.hazards = w.hazards.filter((h) => h === window.__cover);
      for (const m of Object.values(window.__crowd)) { m.hp = m.maxHp; m.dead = false; }
      p.castLock = 0; p.cooldowns = {}; p.channel = null; p.mana = 99999;
      p.tryUseSkill(sk, p.x + dx, p.y + dy);
      return true;
    }, [name, dx, dy]);
    if (!okc) { fail('no skill ' + name); continue; }
    await step(frames);
    const tag = name.replace(/[^a-z]/gi, '').toLowerCase();
    await set({ outlines: true, lifeBars: true, wallLines: false }); await page.evaluate(() => window.__frames()); await shot(tag + '_on');
    await set({ outlines: false, lifeBars: false }); await page.evaluate(() => window.__frames()); await shot(tag + '_off');
    await set({ outlines: true, lifeBars: true, wallLines: true }); await page.evaluate(() => window.__frames()); await shot(tag + '_walls');
    await set({ wallLines: false });
  }
  // a monster behind a wall: its outline shows over the wall
  const wall = await page.evaluate(async () => {
    const { G } = window.VELSCOUR, p = G.player, map = G.world.map, m = window.__crowd.champion;
    let spot = null;
    for (let r = 2; r < 14 && !spot; r++) for (let dy = -r; dy <= r && !spot; dy++) for (let dx = -r; dx <= r && !spot; dx++) {
      const x = Math.floor(p.x) + dx, y = Math.floor(p.y) + dy;
      if (!map.isFloor(x, y) && map.isFloor(x - 1, y - 1) && map.isFloor(x - 2, y - 2) && Math.hypot(x - p.x, y - p.y) > 3) spot = [x, y];
    }
    if (!spot) return null;
    m.x = spot[0] - 0.6; m.y = spot[1] - 0.6;
    const { camera } = await import('/src/core/view.js'); camera.follow((p.x + m.x) / 2, (p.y + m.y) / 2, 0, true);
    await window.__frames();
    return spot;
  });
  if (wall) await shot('wall'); else console.log('  .. no wall spot for the behind-a-wall shot');
  await browser.close();
  if (bad) process.exitCode = 1;
  report(errors);
})();
