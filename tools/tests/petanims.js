// Summon animation atlases (tools/build_pet_animations.py, src/core/petart.js) in the live game: every summon with
// a catalog row stands in a line-up in town and is shown in each state the game picks (spawning, idle, moving,
// attacking, cheering, scared), then all fall and leave their dead pose. Checks: every catalog summon draws from its
// atlas in every state, each state shows the frame its kind lays out, Mirror Image wears its caster's class, a
// killed pet leaves a dead pose that fades, a killing blow makes a pet cheer, and no errors.
// Shots: petanims_<state>.png (one per state), petanims_fallen.png.
//   node tools/tests/petanims.js [keys]
const { openGame, report } = require('./harness');

(async () => {
  const only = process.argv[2] ? process.argv[2].split(',') : null;
  const { browser, page, errors, shot } = await openGame({ width: 1600, height: 900 });
  const out = await page.evaluate(async (only) => {
    const { G, game } = window.VELSCOUR;
    await game.newChar('ranger', 'Petra');
    document.querySelectorAll('.screen').forEach((s) => s.remove());
    G.ui.modalCount = 0;
    const { SUMMONS } = await import('/src/data/summons.js');
    const { buildSummon } = await import('/src/game/monster.js');
    const { petAnimation, petKey } = await import('/src/core/petart.js');
    const { camera } = await import('/src/core/view.js');
    const cat = await (await fetch('assets/sprites/pets/catalog.json')).json();
    G.paused = false; G.settings.zoom = 1.1; G.settings.gore = 0; G.godMode = true;
    camera.computeZoom();
    document.getElementById('center-msg').style.display = 'none';
    const p = G.player, w = G.world, res = [];
    for (const c of w.creatures) if (!c.isPlayer) c.dead = true;
    for (const n of w.npcs) n.x += 60;
    const keys = Object.keys(SUMMONS).filter((k) => (cat[k] || k === 'clone') && (!only || only.includes(k)));
    const pets = keys.map((k, i) => {
      const col = i % 14, row = Math.floor(i / 14);
      const m = buildSummon(p, SUMMONS[k], k, p.x - 7 + col * 1.05 + row * 0.9, p.y + 3 - col * 1.05 + row * 0.9, 1, 100, 0);
      m.ai = 'none'; m.static = true; m.flip = false; m.update = () => true;
      w.add(m); return m;
    });
    // load every atlas
    for (let i = 0; i < 60 && pets.some((m) => !petAnimation(m)); i++) await new Promise((r) => setTimeout(r, 100));
    const noArt = pets.filter((m) => !petAnimation(m)).map((m) => m.summonKey);
    res.push((noArt.length ? 'FAIL no atlas: ' + noArt.join(' ') : '  ok ') + ` ${pets.length} summons draw from their atlas (${new Set(pets.map((m) => cat[petKey(m)].sheet)).size} sheets)`);
    const clone = pets.find((m) => m.summonKey === 'clone');
    if (clone) res.push((petKey(clone) === 'clone_ranger' ? '  ok ' : 'FAIL ') + `Mirror Image cast by a Ranger is ${petKey(clone)}`);
    // each state: set the creature up the way the game would, and check the frame is one the kind lays out for it
    const frameOf = (m) => { const a = petAnimation(m); return a && Math.round(a.sx / a.cw); };
    const want = {
      summoned: (S) => S.summoned, idle: (S, k) => k === 'stationary' ? [...S.idle, ...S.active] : S.idle,
      moving: (S, k) => S.fly || S.walk || (k === 'stationary' ? [...S.idle, ...S.active] : S.idle),
      attacking: (S) => S.swoop || S.attack || S.cheer || S.happy, cheer: (S, k) => S.cheer || S.happy || [...S.idle, ...S.active],
      scared: (S) => S.scared || S.damaged,
    };
    const set = {
      summoned: (m) => { m.spawnT = 0.1; }, idle: (m) => { m.spawnT = 5; },
      moving: (m) => { m.spawnT = 5; m.moving = true; }, attacking: (m) => { m.spawnT = 5; m.attackAnimT = 0.3; },
      cheer: (m) => { m.spawnT = 5; m.cheerT = 1; }, scared: (m) => { m.spawnT = 5; m.hp = m.maxHp * 0.2; },
    };
    window.petTest = { pets, set };
    for (const st of Object.keys(set)) {
      const bad = [];
      for (const m of pets) {
        m.moving = false; m.attackAnimT = 0; m.cheerT = 0; m.hp = m.maxHp; m.animT = 0;
        set[st](m);
        const meta = cat[petKey(m)], f = frameOf(m);
        if (!want[st](meta.states, meta.kind).includes(f)) bad.push(`${m.summonKey}:${f}`);
      }
      res.push((bad.length ? 'FAIL ' : '  ok ') + `${st}: every summon shows its ${st} frame` + (bad.length ? ' ' + bad.join(' ') : ''));
    }
    return res;
  }, only);
  for (const st of ['summoned', 'idle', 'moving', 'attacking', 'cheer', 'scared']) {
    await page.evaluate((st) => {
      const { G, game } = window.VELSCOUR, { pets, set } = window.petTest;
      for (const m of pets) { m.moving = false; m.attackAnimT = 0; m.cheerT = 0; m.hp = m.maxHp; m.animT = 0.3; set[st](m); }
      G.paused = true; game.render();
    }, st);
    await page.waitForTimeout(100);
    await shot('petanims_' + st);
  }
  out.push(...await page.evaluate(async () => {
    const { G, game } = window.VELSCOUR, { pets } = window.petTest;
    const { kill } = await import('/src/game/combat.js');
    const { makeMonster } = await import('/src/game/monster.js');
    const w = G.world, res = [];
    // a killing blow: the pet that landed it cheers
    const foe = w.add(makeMonster(w, 'skeleton', w.biome, 5, 'normal', pets[0].x + 0.5, pets[0].y)) || w.creatures.at(-1);
    pets[0].cheerT = 0; kill(foe, pets[0]);
    res.push((pets[0].cheerT > 0 ? '  ok ' : 'FAIL ') + `a pet cheers after a killing blow (cheerT ${pets[0].cheerT})`);
    for (const m of pets) kill(m, null);
    res.push((w.fallen.length === pets.length ? '  ok ' : 'FAIL ') + `${w.fallen.length} of ${pets.length} killed summons left their dead pose`);
    w.creatures = w.creatures.filter((c) => !c.dead);
    G.paused = true; game.render();
    return res;
  }));
  await page.waitForTimeout(100);
  await shot('petanims_fallen');
  out.push(await page.evaluate(() => {
    const { G } = window.VELSCOUR, w = G.world;
    G.paused = false;
    for (let i = 0; i < 100; i++) w.update(1 / 30);
    return (w.fallen.length === 0 ? '  ok ' : 'FAIL ') + `dead poses gone after 3.3 s (${w.fallen.length} left)`;
  }));
  console.log(out.join('\n'));
  report(errors);
  await browser.close();
})();
