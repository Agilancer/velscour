// The spectator's features (things to do while the hero plays): gilded critters to tap, the Divine Smite meter,
// sealed Epic+ treasures and their reveal, auto-play waiting in town while sealed treasures fill the bag, the
// stance dial, the three-portal choice at a cleared exit (auto-play's countdown) and the Greed lever.
// Taps go through the real input (mouse clicks, or touch taps with `mobile`) and must never move the hero or take
// over from auto-play. Screenshots: spectate_*.png.
//   node tools/tests/spectate.js            # 1280x720 mouse
//   node tools/tests/spectate.js mobile     # 844x390 touch
const { openGame, report } = require('./harness');
const mobile = process.argv[2] === 'mobile';
let fails = 0;
const check = (ok, msg) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${msg}`); if (!ok) { fails++; process.exitCode = 1; } };

(async () => {
  const { browser, page, errors, shot } = await openGame(mobile ? { width: 844, height: 390, mobile: true } : {});
  const tap = (x, y) => (mobile ? page.touchscreen.tap(x, y) : page.mouse.click(x, y));
  const tag = mobile ? '_mobile' : '';
  const press = async (sel) => { const bb = await (await page.$(sel)).boundingBox(); await tap(bb.x + bb.width / 2, bb.y + bb.height / 2); }; // pulsing buttons never hold still for page.click
  // a hero in a catacombs depth, god mode, auto-play on (spawning critters must not need anything else)
  await page.evaluate(async () => {
    const { G, game } = window.VELSCOUR;
    await game.newChar('wizard', 'Spectator');
    G.char.nextBiome = 'catacombs'; G.char.depth = 3;
    game.enterDungeon();
  });
  await page.waitForFunction(() => window.VELSCOUR.G.world && window.VELSCOUR.G.world.kind === 'dungeon' && document.querySelector('#loading').classList.contains('hidden'), null, { timeout: 30000 });
  await page.evaluate(() => { const { G } = window.VELSCOUR; G.godMode = true; for (const m of G.world.creatures) if (m.team === 'enemy' && m !== G.world.boss) m.dead = true; });
  await page.waitForTimeout(600);

  // ---------------------------------------------------------------- 4. gilded critters
  for (const key of ['wisp', 'moth', 'scarab', 'prism']) {
    const pos = await page.evaluate(async (key) => {
      const { G } = window.VELSCOUR;
      const { spawnCritter } = await import('/src/game/critters.js');
      const { Auto } = await import('/src/game/autoplay.js');
      if (!Auto.on) Auto.toggle(true);
      for (const c of G.world.critters || []) c.caught = true;
      const cr = spawnCritter(G.world, key);
      if (!cr) return null;
      cr.x = G.player.x + 1.2; cr.y = G.player.y - 1.2; cr.K = { ...cr.K, speed: 0.05 }; // hold still for the test's click
      G.player.moveTarget = null; G.player.lootTarget = null;
      window._before = { gold: G.char.gold, xp: G.char.xp, lvl: G.char.level, pots: { ...G.char.potions }, gems: G.char.bag.filter((b) => b && b.type === 'gem').length, n: G.char.critters || 0 };
      const [x, y] = cr.screen();
      return { x, y };
    }, key);
    if (!pos) { check(false, `${key}: spawned`); continue; }
    if (key === 'wisp') { await page.waitForTimeout(300); await shot('spectate_critter' + tag); }
    const p2 = await page.evaluate(() => { const c = window.VELSCOUR.G.world.critters.find((x) => x.alive); const [x, y] = c.screen(); return { x, y }; });
    await tap(p2.x, p2.y);
    await page.waitForTimeout(120);
    const r = await page.evaluate(async () => {
      const { G } = window.VELSCOUR;
      const { Auto } = await import('/src/game/autoplay.js');
      const b = window._before;
      return { caught: (G.char.critters || 0) - b.n, gold: G.char.gold - b.gold, xp: G.char.level > b.lvl || G.char.xp > b.xp, override: Auto.overrideT, status: Auto.status };
    });
    check(r.caught === 1, `${key}: caught by a ${mobile ? 'tap' : 'click'}`);
    check(r.xp && r.gold === 0, `${key}: paid experience only (gold ${r.gold})`);
    check(!(r.override > 0) && !/Manual/.test(r.status), `${key}: auto-play kept control (overrideT ${r.override}, "${r.status}")`);
  }
  // one that gets away
  const away = await page.evaluate(async () => {
    const { G, game } = window.VELSCOUR;
    const { spawnCritter } = await import('/src/game/critters.js');
    const cr = spawnCritter(G.world, 'wisp');
    const n = G.char.critters || 0;
    for (let i = 0; i < 30 * 15; i++) game.update(1 / 30);
    return { gone: cr.gone, caught: cr.caught, n: (G.char.critters || 0) - n, listed: G.world.critters.includes(cr) };
  });
  check(away.gone && !away.caught && away.n === 0 && !away.listed, 'an untouched critter escapes and is cleared');
  // the hero walking over one never catches it: only a click or a tap does (and it shies away)
  const walk = await page.evaluate(async () => {
    const { G, game } = window.VELSCOUR;
    const { spawnCritter } = await import('/src/game/critters.js');
    const out = [];
    for (const key of ['scarab', 'moth']) {
      for (const c of G.world.critters || []) c.caught = true;
      const cr = spawnCritter(G.world, key), n = G.char.critters || 0;
      if (!cr) { out.push(null); continue; }
      cr.x = G.player.x; cr.y = G.player.y;
      for (let i = 0; i < 30 * 3; i++) { game.update(1 / 30); if (cr.alive && i < 45) { G.player.x = cr.x; G.player.y = cr.y; } }
      out.push({ caught: cr.caught, n: (G.char.critters || 0) - n, d: Math.hypot(cr.x - G.player.x, cr.y - G.player.y) });
    }
    return out;
  });
  check(walk.every((w) => w && !w.caught && w.n === 0), `the hero standing on critters never catches them ${JSON.stringify(walk)}`);
  check(walk.every((w) => w && w.d > 0.8), 'critters shy away from the hero');
  // the spawning clock
  const clock = await page.evaluate(async () => {
    const { G, game } = window.VELSCOUR;
    const { Auto } = await import('/src/game/autoplay.js');
    Auto.toggle(false);
    G.world.critterT = 0.5; G.world.critters = [];
    for (let i = 0; i < 30; i++) game.update(1 / 30);
    return (G.world.critters || []).filter((c) => c.alive).length;
  });
  check(clock === 1, 'the clock spawns a critter on its own');

  // ---------------------------------------------------------------- 5. SMITE
  const fill = await page.evaluate(async () => {
    const { G } = window.VELSCOUR;
    const { onKill } = await import('/src/game/happenings.js');
    const { SMITE_KILLS } = await import('/src/game/smite.js');
    G.char.smite = 0;
    for (let i = 0; i < 10; i++) onKill({ team: 'enemy', rank: 'normal', world: G.world, x: G.player.x, y: G.player.y, xp: 1 });
    const a = G.char.smite;
    onKill({ team: 'enemy', rank: 'boss', world: G.world, x: G.player.x, y: G.player.y, xp: 1 });
    return { a, b: G.char.smite, want: 10 / SMITE_KILLS, boss: 12 / SMITE_KILLS };
  });
  check(Math.abs(fill.a - fill.want) < 1e-6 && Math.abs(fill.b - fill.a - fill.boss) < 1e-6, `kills fill the SMITE meter (${fill.a.toFixed(3)}, a guardian +${(fill.b - fill.a).toFixed(3)})`);
  const pack = await page.evaluate(async () => {
    const { G, game } = window.VELSCOUR;
    const { makeMonster } = await import('/src/game/monster.js');
    const { Auto } = await import('/src/game/autoplay.js');
    Auto.toggle(true);
    G.char.smite = 1;
    const p = G.player, w = G.world, made = [];
    const cx = p.x + 2.5, cy = p.y + 0.5;
    for (let i = 0; i < 5; i++) { const [x, y] = w.map.randomNear(cx, cy, 0.8); const m = makeMonster(w, w.roster[0] || 'skeleton', w.biome, 5, 'normal', x, y, 0); w.add(m); made.push(m); }
    window._pack = made;
    game.update(1 / 30);
    return { ready: !document.querySelector('#smite-btn').classList.contains('hidden') };
  });
  check(pack.ready, 'a full meter shows the SMITE button');
  await shot('spectate_smite_ready' + tag);
  await press('#smite-btn');
  const armed = await page.evaluate(() => window.VELSCOUR.G.smiteArmed === true);
  check(armed, 'the SMITE button arms the strike');
  const at = await page.evaluate(async () => {
    const { G } = window.VELSCOUR;
    const { camera } = await import('/src/core/view.js');
    const m = window._pack[0];
    G.player.moveTarget = null;
    const [x, y] = camera.tileToScreen(m.x, m.y);
    return { x, y };
  });
  if (!mobile) { await page.mouse.move(at.x, at.y); await page.waitForTimeout(150); await shot('spectate_smite_aim'); }
  await tap(at.x, at.y);
  await page.waitForTimeout(150);
  await shot('spectate_smite_strike' + tag);
  await page.waitForTimeout(600);
  const hitR = await page.evaluate(async () => {
    const { G } = window.VELSCOUR;
    const { Auto } = await import('/src/game/autoplay.js');
    return { dead: window._pack.filter((m) => m.dead || m.hp < m.maxHp * 0.2).length, smite: G.char.smite, armed: !!G.smiteArmed, override: Auto.overrideT, smites: G.char.smites };
  });
  check(hitR.dead >= 4, `SMITE flattened the pack (${hitR.dead}/5)`);
  check(hitR.smite === 0 && !hitR.armed && hitR.smites === 1, 'SMITE spent the meter');
  check(!(hitR.override > 0), 'aiming SMITE never took over from auto-play');

  // ---------------------------------------------------------------- 6. sealed treasures
  const seal = await page.evaluate(async () => {
    const { G } = window.VELSCOUR;
    const { rollItem, itemName } = await import('/src/data/items.js');
    const { GroundItem } = await import('/src/game/loot.js');
    const { addToBag } = await import('/src/game/player.js');
    const out = {};
    const epic = rollItem(80, { rarity: 3 }), rare = rollItem(80, { rarity: 2 }), myth = rollItem(80, { rarity: 5 });
    for (const it of [epic, rare, myth]) { G.char.sealT = 1e9; new GroundItem(0, 0, 'item', { item: it }); }
    out.epic = epic.sealed === true; out.rare = !rare.sealed; out.myth = myth.sealed === true; out.name = itemName(myth);
    // the seal clock: an Epic+ that drops before SEAL_GAP of dungeon time has passed since the last seal arrives open
    const soon = rollItem(80, { rarity: 4 }); new GroundItem(0, 0, 'item', { item: soon }); out.gap = soon.sealed === false;
    // an opened item dropped again stays open
    const leg = rollItem(80, { rarity: 4 }); leg.sealed = false; new GroundItem(0, 0, 'item', { item: leg }); out.reopen = leg.sealed === false;
    G.char.bag.fill(null);
    addToBag(G.char, myth); addToBag(G.char, epic);
    window._myth = myth;
    const { Auto } = await import('/src/game/autoplay.js');
    Auto.toggle(false);
    window.VELSCOUR.game.update(1 / 30);
    out.chip = !document.querySelector('#sealed-btn').classList.contains('hidden') && document.querySelector('#sealed-text').textContent;
    // auto-play never equips, sells or stashes one
    Auto.optimizeGear();
    out.kept = G.char.bag.includes(myth) && G.char.bag.includes(epic);
    return out;
  });
  check(seal.epic && seal.myth && seal.rare, 'Epic+ drops arrive sealed, Rare does not');
  check(seal.gap, 'a second Epic+ within the seal gap arrives open');
  check(seal.name === 'Sealed Treasure', 'a sealed item hides its name');
  check(seal.reopen, 'an opened item dropped again stays open');
  check(seal.chip === '2 SEALED', `the HUD shows the sealed count (${seal.chip})`);
  check(seal.kept, 'auto-play leaves sealed treasures alone');
  await press('#sealed-btn');
  await page.waitForTimeout(900);
  await shot('spectate_seal_spin' + tag);
  await page.waitForTimeout(2600);
  await shot('spectate_seal_landed' + tag);
  const land = await page.evaluate(() => ({ landed: !!document.querySelector('.rv-box.landed.rv-r5'), open: window._myth.sealed === false, next: [...document.querySelectorAll('.rv-btns button')].map((b) => b.textContent) }));
  check(land.landed && land.open, 'the reel lands on the Mythic and opens it');
  check(land.next.some((t) => /Next seal \(1\)/.test(t)), `the card offers the next seal (${land.next.join(', ')})`);
  await page.click('.rv-btns button.red');
  await page.waitForTimeout(3600);
  const second = await page.evaluate(async () => { const { G } = window.VELSCOUR; return G.char.bag.filter((b) => b && b.sealed).length; });
  check(second === 0, 'Next seal opened the second one');
  await page.evaluate(async () => { const { close } = await import('/src/ui/sealed.js'); close(); });

  // ---------------------------------------------------------------- 7. stance
  const st = await page.evaluate(async () => {
    const { G } = window.VELSCOUR;
    const { Auto } = await import('/src/game/autoplay.js');
    const out = {};
    for (const k of ['cautious', 'balanced', 'reckless']) { G.char.stance = k; Auto.hurt = 0; out[k] = Auto.boldness(); }
    G.char.stance = 'balanced';
    return out;
  });
  check(st.cautious < st.balanced && st.balanced < st.reckless, `stance moves auto-play's boldness (${st.cautious.toFixed(2)} < ${st.balanced.toFixed(2)} < ${st.reckless.toFixed(2)})`);

  // ---------------------------------------------------------------- 9. portal choice, auto-play's countdown
  const pc = await page.evaluate(async () => {
    const { G, game } = window.VELSCOUR;
    const { Auto } = await import('/src/game/autoplay.js');
    const { kill } = await import('/src/game/combat.js');
    Auto.toggle(true);
    G.char.stance = 'reckless';
    const b = G.world.boss; b.awake = true; kill(b, G.player, {});
    game.update(1 / 30);
    Auto.leaveLevel(G.world);
    return { cards: document.querySelectorAll('.portal-choice .pc-card').length, depth: G.world.depth };
  });
  check(pc.cards === 3, `the exit offers three portals (${pc.cards})`);
  await page.evaluate(() => { for (let i = 0; i < 45; i++) window.VELSCOUR.game.update(1 / 30); });
  await page.waitForTimeout(100);
  await shot('spectate_portals' + tag);
  const cd = await page.evaluate(() => document.querySelector('.pc-auto').textContent);
  check(/Auto-play picks a portal in [5-7]/.test(cd), `auto-play counts down ("${cd}")`);
  // the player taps the second portal: auto-play takes that one
  await page.click('.pc-card[data-i="1"]');
  const want = await page.evaluate(() => document.querySelector('.pc-card[data-i="1"] .pc-name').textContent);
  const told = await page.evaluate(() => { const g = window.VELSCOUR.game; let n = 0; while (g.pick && n++ < 400) g.update(1 / 30); return { secs: n / 30, omen: window.VELSCOUR.G.char.nextOmen, biome: window.VELSCOUR.G.char.nextBiome }; });
  check(told.secs <= 3.1, `a tapped portal goes after ${told.secs.toFixed(1)} s`);
  await page.waitForFunction((d) => window.VELSCOUR.G.world && window.VELSCOUR.G.world.depth === d + 1 && document.querySelector('#loading').classList.contains('hidden'), pc.depth, { timeout: 30000 }).catch(() => {});
  const after = await page.evaluate(async () => { const { G } = window.VELSCOUR; const { BIOME_BY_ID } = await import('/src/data/biomes.js'); return { depth: G.world.depth, biome: G.world.biome.name, omen: G.world.happen && G.world.happen.omen, kind: G.world.kind, pending: G.char.nextOmen, name: (BIOME_BY_ID[G.char.nextBiome] || {}).name }; });
  check(after.depth === pc.depth + 1 && after.biome === want, `descended into the chosen portal (${after.biome}, wanted ${want})`);
  check(told.omen === undefined || (told.omen === 'none' ? !after.omen : after.omen === told.omen), `the depth keeps the omen its portal showed (${told.omen} -> ${after.omen})`);
  check(after.pending === undefined, 'the promised omen is spent');

  // ---------------------------------------------------------------- 6b. auto-play waits in town while seals fill the bag
  const wait = await page.evaluate(async () => {
    const { G, game } = window.VELSCOUR;
    const { Auto } = await import('/src/game/autoplay.js');
    const { rollItem } = await import('/src/data/items.js');
    const { GroundItem } = await import('/src/game/loot.js');
    Auto.toggle(false);
    G.char.bag.fill(null);
    for (let i = 0; i < G.char.bag.length; i++) { const it = rollItem(60, { rarity: 3 + (i % 3) }); G.char.sealT = 1e9; new GroundItem(0, 0, 'item', { item: it }); G.char.bag[i] = it; }
    G.char.gold = 100;
    game.enterTown();
    Auto.toggle(true);
    for (let i = 0; i < 30 * 90; i++) { game.update(1 / 30); if (i % 300 === 0) await new Promise((r) => setTimeout(r, 0)); }
    return { kind: G.world.kind, status: Auto.status, urgent: document.querySelector('#sealed-btn').classList.contains('urgent'), sealed: G.char.bag.filter((b) => b && b.sealed).length };
  });
  check(wait.kind === 'town' && /break the seals/.test(wait.status) && wait.sealed === 60, `auto-play waits in town with a bag full of seals ("${wait.status}")`);
  check(wait.urgent, 'the SEALED button pleads');
  await shot('spectate_town_wait' + tag);
  const go = await page.evaluate(async () => {
    const { G, game } = window.VELSCOUR;
    const { openNextSeal, close } = await import('/src/ui/sealed.js');
    openNextSeal(); close(); // one seal broken: auto-play sells, stashes or wears it, and a slot is free
    for (let i = 0; i < 30 * 120 && G.world.kind === 'town'; i++) { game.update(1 / 30); if (i % 300 === 0) await new Promise((r) => setTimeout(r, 0)); }
    await new Promise((r) => setTimeout(r, 1500));
    return { kind: G.world.kind, free: G.char.bag.filter((b) => !b).length };
  });
  check(go.kind === 'dungeon', `with one seal broken auto-play trades and goes on (free slots ${go.free})`);

  // ---------------------------------------------------------------- 11. Greed
  const gr = await page.evaluate(async () => {
    const { G, game } = window.VELSCOUR;
    const { Auto } = await import('/src/game/autoplay.js');
    const { BIOME_BY_ID } = await import('/src/data/biomes.js');
    const { setGreed, greedCleared, greedDeath, hoardOf } = await import('/src/game/greed.js');
    Auto.toggle(false);
    const tally = (g) => {
      setGreed(g);
      let n = 0, champs = 0, traits = 0, hp = 0;
      for (let k = 0; k < 6; k++) {
        game.buildDungeon(20, BIOME_BY_ID.catacombs);
        game.update(1); // greedTick marks every enemy
        const foes = G.world.creatures.filter((m) => m.team === 'enemy' && m.rank !== 'boss');
        n += foes.length; champs += foes.filter((m) => m.rank === 'champion').length; traits += foes.filter((m) => m.trait).length;
        hp += foes.reduce((a, m) => a + m.maxHp, 0) / foes.length;
      }
      return { n: n / 6, champs: champs / 6, traits: traits / 6, hp: hp / 6, lootMul: G.world.lootMul, mf: G.world.mfAdd || 0, greed: G.world.greed };
    };
    const g0 = tally(0), g5 = tally(5);
    greedCleared(G.world);
    const hoard = hoardOf();
    greedCleared(G.world); // a depth pays once
    const once = hoardOf();
    const lost = greedDeath();
    return { g0, g5, hoard, once, lost, after: { greed: G.char.greed, hoard: G.char.hoard } };
  });
  console.log('   greed 0:', JSON.stringify(gr.g0), '\n   greed 5:', JSON.stringify(gr.g5));
  check(gr.g5.n > gr.g0.n * 1.3 && gr.g5.champs > gr.g0.champs + 2 && gr.g5.traits > gr.g0.traits, 'Greed 5 brings bigger packs, more champions and traits');
  check(gr.g5.hp > gr.g0.hp * 1.2, 'Greed 5 monsters are tougher');
  check(gr.g5.lootMul >= 2.25 && gr.g5.mf >= 100 && gr.g5.greed === 5, `Greed 5 pays (loot x${gr.g5.lootMul.toFixed(2)}, +${gr.g5.mf}% MF)`);
  check(gr.hoard === 5 && gr.once === 5, 'a cleared depth adds the lever to the Hoard, once');
  check(gr.lost && gr.after.greed === 0 && gr.after.hoard === 0, 'a death loses the Hoard and drops the lever');
  // the HUD dials, raised
  await page.evaluate(async () => {
    const { G, game } = window.VELSCOUR;
    const { Auto } = await import('/src/game/autoplay.js');
    const { BIOME_BY_ID } = await import('/src/data/biomes.js');
    G.char.greed = 3; G.char.hoard = 12; G.char.smite = 0.6; G.char.madness = 0.4; G.char.stance = 'cautious';
    game.buildDungeon(5, BIOME_BY_ID.catacombs);
    Auto.toggle(true);
    for (let i = 0; i < 20; i++) game.update(1 / 30);
  });
  await page.waitForTimeout(300);
  await shot('spectate_hud' + tag);
  const hud = await page.evaluate(() => ({ pips: document.querySelectorAll('#greed-pips i.on').length, hoard: document.querySelector('#hoard').textContent, stance: document.querySelector('#stance button.on')?.dataset.st, visible: !document.querySelector('#stance').classList.contains('hidden') }));
  check(hud.pips === 3 && hud.hoard === 'Hoard 12' && hud.stance === 'cautious' && hud.visible, `the HUD shows the lever, the Hoard and the stance (${JSON.stringify(hud)})`);
  const plus = await page.$('#greed .gr-btn[data-d="1"]');
  const bb = await plus.boundingBox();
  await tap(bb.x + bb.width / 2, bb.y + bb.height / 2);
  const g4 = await page.evaluate(() => window.VELSCOUR.G.char.greed);
  check(g4 === 4, 'the + button raises the lever');

  console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
  report(errors);
  await browser.close();
})();
