// The Astronomer (class id arcane_sorcerer; src/game/astronomer.js, src/gfx/cosmos.js):
//  1. icon sheet of all 80 skills -> astro_icons.png
//  2. the star chart: readSky names drawn shapes, five charted stars ascend with a zodiac boon, a merged star does not
//     count, three boons start a Grand Conjunction, Celestial Mirror makes eight images, charts the Crown and
//     keeps him from harm, Heaven's Map ascends at once
//  3. showcase shots, the game stepped frame by frame -> astro_<skill>.png
//  4. auto-play: an Astronomer plays N game minutes and must chart stars and ascend constellations
//   node tools/tests/astronomer.js [autoplay minutes, default 4] [mobile]
const { openGame, report, OUT_DIR } = require('./harness');
const minutes = +(process.argv[2] || 4);
const MOBILE = process.argv.includes('mobile');
const CLS = 'arcane_sorcerer';
let bad = 0;
const fail = (m) => { console.log('FAIL ' + m); bad++; };

(async () => {
  const { browser, page, errors } = await openGame(MOBILE ? { width: 844, height: 390, mobile: true } : {});
  // ------------------------------------------------------------ 1. icons
  await page.evaluate(async (CLS) => {
    const { skillIcon } = await import('/src/ui/icons.js');
    const { CLASS_SKILLS } = await import('/src/data/skills.js');
    const ic = document.createElement('canvas'); ic.id = 'iconsheet'; ic.width = 20 * 60; ic.height = 4 * 60;
    Object.assign(ic.style, { position: 'fixed', left: 0, top: 0, zIndex: 9999 });
    const ix = ic.getContext('2d');
    CLASS_SKILLS[CLS].forEach((sk, i) => ix.drawImage(skillIcon(sk, 58), (i % 20) * 60 + 1, Math.floor(i / 20) * 60 + 1));
    document.body.appendChild(ic);
  }, CLS);
  await page.setViewportSize({ width: 1200, height: 720 });
  await page.locator('#iconsheet').screenshot({ path: `${OUT_DIR}/astro_icons.png` });
  await page.evaluate(() => document.querySelector('#iconsheet').remove());
  await page.setViewportSize(MOBILE ? { width: 844, height: 390 } : { width: 1280, height: 720 });

  // ------------------------------------------------------------ 2. the chart
  const chart = await page.evaluate(async (CLS) => {
    const { G, game } = window.VELSCOUR;
    const A = await import('/src/game/astronomer.js');
    const out = {};
    const S = (pts) => pts.map(([x, y]) => ({ x, y }));
    out.sky = {
      hunter: A.readSky(S([[0, 0], [2, 0.2], [4, 0], [6, 0.3], [8, 0]])),
      crown: A.readSky(S([[0, 0], [2, -2], [4, 0], [3, 2.5], [0.8, 1.6]])),
      twins: A.readSky(S([[0, 0], [1, 0.5], [0.4, 1.2], [1.4, 1.4], [0.2, 2]])),
      serpent: A.readSky(S([[0, 0], [2, 1.5], [4, 0], [6, 1.5], [8, 0]])),
      swan: A.readSky(S([[0, 0], [3, -1], [5.5, 0.5], [6.5, 3.5], [5.5, 6.5]])),
    };
    await game.newChar(CLS, 'Stargazer');
    document.querySelectorAll('.screen').forEach((s) => s.remove()); G.ui.modalCount = 0;
    const { BIOME_BY_ID } = await import('/src/data/biomes.js');
    G.godMode = true;
    game.buildDungeon(3, BIOME_BY_ID.overworld);
    await new Promise((r) => setTimeout(r, 500));
    const { CLASS_SKILLS } = await import('/src/data/skills.js');
    const p = G.player, w = G.world;
    for (const sk of CLASS_SKILLS[CLS]) G.char.skills[sk.id] = 1;
    G.char.level = 40; p.recompute(); p.mana = p.maxMana = 99999;
    for (const c of w.creatures) if (c.team === 'enemy') c.dead = true;
    // a big open spot
    let spot = null;
    for (let t = 0; t < 6000 && !spot; t++) {
      const x = 8 + Math.random() * (w.map.w - 16), y = 8 + Math.random() * (w.map.h - 16);
      let ok = true;
      for (let dx = -7; dx <= 7 && ok; dx++) for (let dy = -7; dy <= 7 && ok; dy++) ok = w.map.walkable(x + dx, y + dy);
      if (ok) spot = [x, y];
    }
    if (!spot) return { err: 'no open spot' };
    p.x = spot[0]; p.y = spot[1];
    const byName = (n) => CLASS_SKILLS[CLS].find((s) => s.name === n);
    const cast = (n, dx, dy) => { p.castLock = 0; p.cooldowns = {}; p.channel = null; p.mana = 99999; return p.tryUseSkill(byName(n), p.x + dx, p.y + dy); };
    const ch = () => A.chartOf(p);
    const run = (s) => { for (let i = 0; i < s * 30; i++) w.update(1 / 30); };
    // five stars in a straight line: the Hunter
    const asc0 = ch().asc;
    cast('Comet Swarm', 3, -4); cast('Comet Swarm', 3, -2); cast('Comet Swarm', 3, 0);
    out.three = ch().stars.length;
    cast('Comet Swarm', 3, 0.2); // the same spot only brightens its star
    out.merged = ch().stars.length;
    cast('Comet Swarm', 3, 2); cast('Comet Swarm', 3, 4);
    out.asc = ch().asc - asc0; out.after = ch().stars.length;
    out.boons = A.activeBoons(p);
    // two more different shapes: a zigzag and a tight cluster -> three boons, a Grand Conjunction
    const conj0 = G.astroStats ? 0 : 0; G.astroStats = { conj: 0 };
    for (const [dx, dy] of [[-6, -2], [-4, 0], [-2, -2], [0, 0], [2, -2]]) cast('Meteor', dx, dy + 5);
    out.boons2 = A.activeBoons(p);
    for (const [dx, dy] of [[0, 0], [1.5, 0.4], [0.3, 1.5], [1.6, 1.8], [-1.2, 1.2]]) cast('Gravity Well', dx - 5, dy - 5);
    out.boons3 = A.activeBoons(p);
    out.conj = G.astroStats.conj; void conj0;
    run(1);
    // the mirror: eight images, the Crown, no harm
    p.buffs = p.buffs.filter((b) => !b.zodiac); p.recompute();
    G.godMode = false; p.hp = p.maxHp;
    cast('Celestial Mirror', 0, 0);
    run(0.6);
    out.images = p.mirror ? p.mirror.images.length : 0;
    out.crown = A.activeBoons(p).includes('crown');
    const { hit } = await import('/src/game/combat.js');
    const foe = { x: p.x, y: p.y, team: 'enemy', level: 3, curses: {}, status: {} };
    const hp0 = p.hp; hit(foe, p, 50, 'fire', {}); out.mirrorHurt = hp0 - p.hp;
    const invuln = p.invuln;
    run(invuln + 0.5);
    out.imagesAfter = p.mirror ? p.mirror.images.length : 0;
    const hp1 = p.hp; hit(foe, p, 5, 'fire', {}); out.afterHurt = Math.round(hp1 - p.hp);
    G.godMode = true;
    // Heaven's Map: seven stars round the target, the Crown at once
    p.buffs = p.buffs.filter((b) => !b.zodiac); p.recompute();
    const a1 = ch().asc; cast("Heaven's Map", 4, 0); run(0.6);
    out.map = { asc: ch().asc - a1, crown: A.activeBoons(p).includes('crown') };
    // Constellation (ignite) ascends a part-drawn chart
    p.buffs = p.buffs.filter((b) => !b.zodiac); p.recompute();
    cast('Black Hole', 5, 0); cast('Black Hole', 2, 4); const a2 = ch().asc; cast('Constellation', 0, 0);
    out.ignite = ch().asc - a2;
    return out;
  }, CLS);
  console.log('chart', JSON.stringify(chart));
  const C = chart;
  if (C.err) fail(C.err);
  for (const k of ['hunter', 'crown', 'twins', 'serpent', 'swan']) if (C.sky && C.sky[k] !== k) fail(`readSky: the ${k} shape read as ${C.sky[k]}`);
  if (C.three !== 3 || C.merged !== 3) fail('three spots should chart three stars, and the same spot should not add one');
  if (C.asc !== 1 || C.after !== 0) fail('the fifth star should ascend the constellation');
  if (!C.boons || !C.boons.includes('hunter')) fail('a straight line should grant the Hunter');
  if (!(C.boons3 && C.boons3.length >= 3) || C.conj < 1) fail('three boons should start a Grand Conjunction');
  if (C.images !== 8) fail('Celestial Mirror should make eight images');
  if (!C.crown) fail('the mirror ring should chart the Northern Crown');
  if (C.mirrorHurt !== 0) fail('the Astronomer should not be hurt while his mirror images shine');
  if (C.imagesAfter !== 0 || !(C.afterHurt > 0)) fail('the images should fade and he should be hurt again after the mirror');
  if (!C.map || C.map.asc < 1 || !C.map.crown) fail("Heaven's Map should ascend the Crown");
  if (C.ignite !== 1) fail('Constellation should ascend a part-drawn chart');

  // ------------------------------------------------------------ 3. showcase shots
  await page.evaluate(async () => {
    const { G, game } = window.VELSCOUR;
    const { camera } = await import('/src/core/view.js'); G.settings.zoom = 1.3; G.settings.gore = 0; camera.computeZoom();
    const upd = window.__realUpdate = game.update.bind(game);
    window.__step = 0;
    game.update = (dt) => upd(window.__step > 0 ? (window.__step--, 1 / 60) : 0);
  });
  const step = async (n) => { await page.evaluate((k) => { window.__step = k; }, n); await page.waitForFunction(() => window.__step === 0); };
  const vp = page.viewportSize(), cw = Math.min(820, vp.width), chh = Math.min(500, vp.height);
  const clip = { x: (vp.width - cw) / 2, y: (vp.height - chh) / 2 - (MOBILE ? 0 : 40), width: cw, height: chh };
  // [skill, frames to step, target offset, level]
  const SHOW = [
    ['Star Missiles', 14, [5, 0], 20], ['Starstream', 20, [5, 0], 15], ['Starstorm', 26, [5, 0], 20], ['Missile Galaxy', 22, [5, 0], 20],
    ['Comet', 16, [5, 0], 10], ["Halley's Comet", 24, [5, 0], 10], ['Lunar Lance', 14, [5, 0], 10],
    ['Celestial Mirror', 40, [3, 0], 20], ['Celestial Mirror', 110, [3, 0], 20, 'ring'], ['Celestial Mirror', 150, [3, 0], 20, 'close', 2.2], ['Starstorm', 30, [5, 0], 20, 'close', 2.2], ['Meteor', 30, [4, 0], 10], ['Great Meteor', 50, [4, 0], 15], ['Meteor Shower', 60, [4, 0], 15],
    ['Sun Slam', 60, [4, 0], 20], ['Sun Slam', 128, [4, 0], 20, 'impact'], ['Moonfall', 120, [4, 0], 20], ['Black Hole', 70, [4, 0], 20],
    ['Singularity', 90, [4, 0], 20], ['Pulsar', 50, [4, 0], 20], ['Quasar', 40, [5, 0], 20], ['Moonbeam', 30, [5, 0], 10], ['Neutron Star', 80, [3, 0], 15],
    ['Big Bang', 80, [4, 0], 20], ['Big Bang', 92, [4, 0], 20, 'blast'], ['Supernova', 14, [3, 0], 20], ['Eclipse', 66, [4, 0], 15],
    ['Orrery', 40, [3, 0], 20], ['Accretion Disk', 30, [3, 0], 15], ['Celestial Sphere', 30, [3, 0], 15], ['Comet Storm', 16, [4, 0], 15],
    ['Polaris', 10, [4, 0], 15], ['Syzygy', 60, [3, 0], 20], ['Wormhole', 12, [5, 0], 10], ['Dark Matter', 20, [5, 0], 10], ['Antimatter', 14, [5, 0], 10],
    ['Graviton Lance', 30, [5, 0], 10], ['Starfall', 40, [4, 0], 15],
  ];
  let shots = 0;
  for (const [name, frames, [dx, dy], L, tag, zoom] of SHOW) {
    const ok = await page.evaluate(async ([name, L, dx, dy, CLS, zoom]) => {
      const { G } = window.VELSCOUR, p = G.player, w = G.world;
      const { CLASS_SKILLS } = await import('/src/data/skills.js');
      const { camera } = await import('/src/core/view.js');
      const sk = CLASS_SKILLS[CLS].find((s) => s.name === name);
      if (!sk) return false;
      for (const h of w.hazards) h.dead = true;
      w.hazards.length = 0;
      const { effects, particles, decals, texts } = await import('/src/gfx/vfx.js'); effects.length = 0; particles.length = 0; decals.length = 0; texts.length = 0;
      const A = await import('/src/game/astronomer.js'); A.chartOf(p).stars.length = 0; A.chartOf(p).fading.length = 0;
      p.mirror = null; p.buffs = []; p.recompute();
      const { makeMonster } = await import('/src/game/monster.js');
      w.creatures = w.creatures.filter((c) => c.team !== 'enemy' && !c.summon);
      for (let k = 0; k < 6; k++) { // a fresh, tough crowd ahead
        const m = makeMonster(w, 'skeleton', w.biome, 4, 'normal', p.x + dx - 0.5 + (k % 2) * 1.3, p.y + dy - 2 + k * 0.8);
        m.maxHp = m.hp = 1e7; m.awake = true; m.speed = 0; w.add(m);
      }
      G.char.skills[sk.id] = L; p.recompute(); p.mana = p.maxMana = 99999; p.castLock = 0; p.cooldowns = {}; p.channel = null;
      G.settings.zoom = zoom || 1.3; camera.computeZoom();
      camera.follow(p.x + 1.5, p.y - 1, 0, true);
      p.tryUseSkill(sk, p.x + dx, p.y + dy);
      return true;
    }, [name, L, dx, dy, CLS, zoom]);
    if (!ok) { fail(`could not stage ${name}`); continue; }
    await page.mouse.move(vp.width / 2 + 170, vp.height / 2 + 40); // channelled beams follow the cursor
    await step(frames);
    await page.waitForTimeout(30);
    await page.screenshot({ path: `${OUT_DIR}/astro_${name.replace(/[^a-z]/gi, '')}${tag ? '_' + tag : ''}.png`, clip });
    shots++;
  }
  // a chart part drawn (starlines, the orrery) and an ascension
  await page.evaluate(async (CLS) => {
    const { G } = window.VELSCOUR, p = G.player;
    const { CLASS_SKILLS } = await import('/src/data/skills.js');
    const { camera } = await import('/src/core/view.js'); G.settings.zoom = 1.3; camera.computeZoom();
    const sk = CLASS_SKILLS[CLS].find((s) => s.name === 'Falling Star');
    for (const [dx, dy] of [[2, -3], [4, -1], [3, 2]]) { p.castLock = 0; p.cooldowns = {}; p.tryUseSkill(sk, p.x + dx, p.y + dy); }
  }, CLS);
  await step(50);
  await page.screenshot({ path: `${OUT_DIR}/astro_chart.png`, clip });
  await page.evaluate(async (CLS) => {
    const { G } = window.VELSCOUR, p = G.player;
    const { CLASS_SKILLS } = await import('/src/data/skills.js');
    const sk = CLASS_SKILLS[CLS].find((s) => s.name === 'Falling Star');
    for (const [dx, dy] of [[6, 1], [7, 4]]) { p.castLock = 0; p.cooldowns = {}; p.tryUseSkill(sk, p.x + dx, p.y + dy); }
  }, CLS);
  await step(20);
  await page.screenshot({ path: `${OUT_DIR}/astro_ascend.png`, clip });
  console.log(`${shots + 2} showcase shots`);

  // ------------------------------------------------------------ 4. auto-play
  const auto = await page.evaluate(async ([minutes, CLS]) => {
    const { G, game } = window.VELSCOUR;
    game.update = window.__realUpdate; G.astroStats = {};
    await game.newChar(CLS, 'Autostar');
    const { Auto } = await import('/src/game/autoplay.js');
    Auto.toggle(true);
    let sim = 0;
    while (sim < minutes * 60) {
      for (let i = 0; i < 15; i++) {
        if (G.mode !== 'game' || !G.world) break;
        G.dt = 1 / 30; G.time += G.dt; G.frame++;
        game.update(1 / 30);
        sim += 1 / 30;
      }
      await new Promise((r) => setTimeout(r, 0));
    }
    return { ...G.astroStats, lvl: G.char.level, depth: G.char.depth, kills: G.char.kills, deaths: G.char.deaths || 0 };
  }, [minutes, CLS]);
  console.log(`auto-play ${minutes} min: ${JSON.stringify(auto)}`);
  await page.screenshot({ path: `${OUT_DIR}/astro_autoplay.png` });
  if (!(auto.stars >= 10)) fail('auto-play charted too few stars');
  if (!(auto.asc >= 2)) fail('auto-play ascended too few constellations');
  console.log(bad ? `${bad} FAILURES` : 'ASTRONOMER OK');
  if (bad) process.exitCode = 1;
  report(errors, 20);
  await browser.close();
})();
