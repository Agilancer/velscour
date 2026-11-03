// THE GREAT HUNT (docs/GREAT_HUNT.md): reached through Velscour's skull ("hunt", "hunt 3", "hunt fen") from level 10
// (`minLevel`): a level-9 hero is refused by the skull word, the HAIL VELSCOUR! list (the region and its five lands
// greyed out), teleportToBiome and a saved portal; a level-10 hero gets in.
// The five lands (data/huntlands.js) over 20 seeds each: 96 x 96, every clue, the three hunting grounds, the lair, the
// exit and the caches reachable from the camp, three clues a leg, A* to the lair; the Crags' slope never steps more
// than 3 levels and peaks at the lair; the Fen's pools stay off the trail. Each land in play: a sign read, the beast
// woken, its life gate (a huge hit only takes it to the flee mark), the flight and its trail, its wounds carried over,
// and its twist (the blizzard hides the marked sign; the poison pools; the burrower buried, erupting under the hero at a
// sign and surfacing to fight; the winged beast flying to the next ground). Screenshots of each land (hunt_<land>_*.png).
// Then auto-play hunts each land with no god mode: a level-10 hero at Depth 9; and two geared as balance.js does at
// Depths 60 and 150. Then the phone layout.
//   node tools/tests/hunt.js [shots|noshots] [auto|noauto] [lands]   (start the server first: python3 -m http.server 8123)
const { openGame, report } = require('./harness');
const SHOTS = process.argv[2] !== 'noshots';
const AUTO = process.argv[3] !== 'noauto';
const LANDS = (process.argv[4] || 'wood,tundra,fen,badlands,crags').split(',');
const inHunt = () => window.VELSCOUR.G.world?.biome?.id === 'great_hunt';

// a hero as balance.js builds one arriving at depth D: level, auto-play's stats and skills, the best of `rounds` x 25
// drops near the depth's item level with upgrades and gems, and skill mastery
async function gearHero(page, cls, D, lvl, rounds) {
  await page.evaluate(async ({ cls, D, lvl, rounds }) => {
    const { G, game } = window.VELSCOUR;
    const { Auto } = await import('/src/game/autoplay.js');
    const { depthLevel } = await import('/src/data/depth.js');
    const { rollItem, rollGem } = await import('/src/data/items.js');
    const { xpToNext } = await import('/src/game/player.js');
    if (Auto.on) Auto.toggle(false);
    await game.newChar(cls, 'Hunter');
    document.querySelectorAll('.screen').forEach((s) => s.remove()); G.ui.modalCount = 0; G.ui.closeAll();
    const c = G.char, p = G.player, L = depthLevel(D);
    c.level = lvl; c.xp = Math.round(xpToNext(lvl) * 0.3);
    c.statPoints += (lvl - 1) * 5; c.skillPoints += (lvl - 1) + Math.max(0, D - 1);
    for (let d = 1; d < D; d++) c.cleared[d] = true;
    c.deepest = D - 1; c.depth = D;
    c.potions = { hp: 10, mp: 6, rejuv: 3, fury: 2 };
    Auto.spendStats(); Auto.spendSkills(); Auto.arrangeBar();
    for (let round = 0; round < rounds; round++) {
      c.bag = c.bag.map(() => null);
      for (let i = 0; i < 25 && i < c.bag.length; i++) { const it = rollItem(L - Math.floor(Math.random() * 7), { mf: 60, bonus: Math.random() < 0.12 ? 1.2 : 0.15 }); it.unid = false; c.bag[i] = it; }
      p.recompute(); Auto.optimizeGear();
    }
    c.bag = c.bag.map(() => null);
    for (const it of Object.values(c.equip)) if (it && it.type === 'gear') {
      it.upg = Math.min(6, 2 + Math.floor(L / 40));
      it.sockets = Math.max(it.sockets, Math.min(it.maxSockets, 2));
      while (it.gems.length < it.sockets) { const g = rollGem(L); it.gems.push({ gem: g.gem, tier: g.tier }); }
    }
    const M = Math.min(1000, Math.round(20 + D * 1.6));
    c.bar.filter(Boolean).forEach((id, i) => { c.mastery[id] = [Math.max(1, Math.round(M * (i < 2 ? 1 : 0.55))), 0]; });
    Auto.spendSkills(); Auto.arrangeBar(); p.recompute(); p.hp = p.maxHp; p.mana = p.maxMana;
    G.godMode = false;
  }, { cls, D, lvl, rounds });
}
// into the hunt on that land (null: let it roll)
const enter = (page, land) => page.evaluate(async (land) => {
  const { G, game } = window.VELSCOUR;
  const { BIOME_BY_ID } = await import('/src/data/biomes.js');
  if (land) (G.regionWant ||= {}).great_hunt = land;
  await game.teleportToBiome(BIOME_BY_ID.great_hunt);
  return G.world?.overworldScenario?.land?.id;
}, land);

(async () => {
  const { browser, page, errors, shot } = await openGame({ width: 1366, height: 860 });
  try {
    // ------------------------------------------------ the level gate: a level-9 hero is refused everywhere
    await page.evaluate(async () => { await window.VELSCOUR.game.newChar('paladin', 'Hunter'); const c = window.VELSCOUR.G.char; c.depth = 6; c.level = 9; });
    await page.waitForTimeout(300);
    const refused = async (what) => {
      await page.waitForTimeout(400);
      if (SHOTS && what === 'skull word') await shot('hunt_gate_refused');
      const r = await page.evaluate(() => {
        const box = [...document.querySelectorAll('.dialog-box')].find((b) => /VELSCOUR SAYS NO/.test(b.textContent));
        const text = box ? box.querySelector('.velscour-taunt')?.textContent : null;
        if (box) box.querySelector('button').click();
        return { text, biome: window.VELSCOUR.G.world?.biome?.id || window.VELSCOUR.G.world?.kind };
      });
      if (!r.text) errors.push(`[gate] ${what}: no refusal`);
      if (r.biome === 'great_hunt') errors.push(`[gate] ${what}: a level-9 hero got in`);
      return r.text;
    };
    // the region's own option and its five lands' in the HAIL VELSCOUR! list
    const listOptions = async () => {
      await page.click('#velscour-skull');
      await page.fill('#velscour-message', 'HAIL VELSCOUR!');
      await page.click('.velscour-contact-dialog button:has-text("Send")');
      return page.evaluate(() => {
        const r = [...document.querySelectorAll('#velscour-biome option')].filter((o) => /^great_hunt(:|$)/.test(o.value)).map((o) => ({ value: o.value, disabled: o.disabled, text: o.textContent }));
        document.querySelector('.velscour-teleport-dialog button')?.click(); // Cancel
        return r;
      });
    };
    for (const word of ['hunt', 'hunt 3']) {
      await page.click('#velscour-skull');
      await page.fill('#velscour-message', word);
      await page.click('.velscour-contact-dialog button:has-text("Send")');
      await refused(word === 'hunt' ? 'skull word' : `skull word '${word}'`);
    }
    const opts = await listOptions();
    if (opts.length !== 6 || opts.some((o) => !o.disabled || !/Reach level 10/.test(o.text))) errors.push(`[gate] the HAIL VELSCOUR! list: ${JSON.stringify(opts)}`);
    await page.evaluate(async () => { const { BIOME_BY_ID } = await import('/src/data/biomes.js'); await window.VELSCOUR.game.teleportToBiome(BIOME_BY_ID.great_hunt); });
    await refused('teleportToBiome');
    // a saved portal (an old save's nextBiome): redrawn, both in the portal dialog and on entering
    const portal = await page.evaluate(async () => {
      const { G, game } = window.VELSCOUR;
      G.char.nextBiome = 'great_hunt'; game.confirmDungeon();
      const shown = G.char.nextBiome;
      document.querySelectorAll('.screen').forEach((s) => s.remove()); G.ui.modalCount = 0;
      G.char.nextBiome = 'great_hunt'; game.enterDungeon();
      return { shown, entered: G.char.nextBiome };
    });
    await page.waitForTimeout(300);
    await page.waitForFunction(() => document.querySelector('#loading').classList.contains('hidden'), null, { timeout: 30000 });
    if (portal.shown === 'great_hunt' || portal.entered === 'great_hunt' || await page.evaluate(inHunt)) errors.push(`[gate] a saved portal let a level-9 hero in: ${JSON.stringify(portal)}`);
    // level 10: the list's options open, and the skull word below takes him in
    await page.evaluate(async () => { const { G, game } = window.VELSCOUR; await game.enterTown(); G.char.level = 10; G.char.depth = 6; });
    const opts10 = await listOptions();
    if (opts10.length !== 6 || opts10.some((o) => o.disabled || /Reach level/.test(o.text))) errors.push(`[gate] level 10: the list is still locked (${JSON.stringify(opts10)})`);
    console.log('gate', JSON.stringify({ locked: opts.map((o) => o.text), open: opts10.length, portal }));

    // ------------------------------------------------ reached through the skull (level 10): 'hunt fen' picks the Fen
    await page.click('#velscour-skull');
    await page.fill('#velscour-message', 'hunt fen');
    await page.click('.velscour-contact-dialog button:has-text("Send")');
    await page.waitForFunction(() => window.VELSCOUR.G.world?.biome?.id === 'great_hunt' && document.querySelector('#loading').classList.contains('hidden'), null, { timeout: 30000 });
    const first = await page.evaluate(async () => {
      const { G } = window.VELSCOUR;
      const { ART_BY_ID } = await import('/src/data/bestiary.js');
      const { HUNT_BEASTS } = await import('/src/game/hunt.js');
      const { HUNT_LANDS } = await import('/src/data/huntlands.js');
      const { ARCH } = await import('/src/data/enemies.js');
      const bad = [], w = G.world, sc = w.overworldScenario, m = w.map;
      if (m.w !== 96 || m.h !== 96) bad.push(`map is ${m.w} x ${m.h}`);
      if (!sc || sc.id !== 'great_hunt') bad.push('no hunt run');
      if (sc.land.id !== 'fen') bad.push(`'hunt fen' built ${sc.land.id}`);
      if (!sc.beast || w.boss !== sc.beast) bad.push('the beast is not the level boss');
      if (!sc.land.beasts.some((b) => b.id === sc.def.id)) bad.push(`${sc.def.name} is not a beast of ${sc.land.name}`);
      if (HUNT_LANDS.length !== 5) bad.push(`${HUNT_LANDS.length} lands`);
      for (const b of HUNT_BEASTS) { const a = ART_BY_ID[b.art]; if (!a) bad.push(`beast art ${b.art} missing`); else if (!a.lone) bad.push(`${b.art} is not a giant`); if (!ARCH[b.brood]) bad.push(`${b.id}'s brood ${b.brood} is no archetype`); }
      for (const L of HUNT_LANDS) {
        for (const k of [...L.kinds0, ...L.kinds, 'blood']) { if (!L.text[k]) bad.push(`${L.id}: no text for ${k}`); if (!(k in L.clues)) bad.push(`${L.id}: no props for ${k}`); }
        for (const a of L.roster) if (!ARCH[a]) bad.push(`${L.id}: roster ${a} is no archetype`);
      }
      if (sc.clues.length !== 12) bad.push(`${sc.clues.length} clues`);
      if (!w.portals.some((q) => q.type === 'objective')) bad.push('no sign marked');
      return { bad, land: sc.land.name, title: sc.title, beast: sc.beast.name, art: sc.beast.art, hp: Math.round(sc.beast.maxHp), props: w.props.length, mobs: w.creatures.length, beasts: HUNT_BEASTS.length };
    });
    console.log('skull', JSON.stringify(first));
    for (const b of first.bad) errors.push('[skull] ' + b);

    // ------------------------------------------------ every land over 20 seeds
    const gen = await page.evaluate(async (LANDS) => {
      const { BIOME_BY_ID } = await import('/src/data/biomes.js');
      const { generateHunt, HK } = await import('/src/world/hunt.js');
      const { loadSeaOfSandPack } = await import('/src/gfx/seaofsand.js');
      await loadSeaOfSandPack(); // the Badlands' ground and cliffs
      const biome = BIOME_BY_ID.great_hunt, bad = [], out = {};
      for (const land of LANDS) {
        const stats = [];
        let ms = 0;
        for (let n = 1; n <= 20; n++) {
          const seed = n * 6151 + 3, t0 = performance.now();
          let g;
          try { g = generateHunt(6, biome, seed, land); } catch (e) { bad.push(`${land} seed ${seed}: ${e.message}`); continue; }
          ms = Math.max(ms, performance.now() - t0);
          const m = g.map, W = m.w, I = (x, y) => Math.floor(y) * W + Math.floor(x), h = g.hunt;
          if (h.land !== land) bad.push(`${land} seed ${seed}: built ${h.land}`);
          const seen = new Uint8Array(W * m.h), q = [I(g.start[0], g.start[1])]; seen[q[0]] = 1;
          for (let a = 0; a < q.length; a++) {
            const i = q[a], x = i % W, y = (i / W) | 0;
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const j = I(x + dx, y + dy); if (m.walkableTile(x + dx, y + dy) && (!m.hgt || m.stepOk(i, j)) && !seen[j]) { seen[j] = 1; q.push(j); } }
          }
          const need = [['exit', g.exit], ['lair', h.lair], ...h.grounds.map((p, k) => ['ground ' + k, p]), ...h.clues.map((c) => [`clue ${c.leg}.${c.n}`, [c.x, c.y]]), ...g.chests.map((c, k) => ['chest ' + k, [c.x, c.y]])];
          for (const [what, p] of need) if (!seen[I(p[0], p[1])]) bad.push(`${land} seed ${seed}: ${what} unreachable`);
          for (let leg = 0; leg < 4; leg++) if (h.clues.filter((c) => c.leg === leg).length !== 3) bad.push(`${land} seed ${seed}: leg ${leg} has ${h.clues.filter((c) => c.leg === leg).length} clues`);
          for (const [k, path] of h.paths.entries()) { const off = path.filter(([x, y]) => !m.walkable(x, y)).length; if (off > 2) bad.push(`${land} seed ${seed}: leg ${k} has ${off} blocked trail points`); }
          if (!m.findPath(g.start[0], g.start[1], h.lair[0], h.lair[1], 60000)) bad.push(`${land} seed ${seed}: A* finds no way to the lair`);
          if (land === 'crags') {
            if (!m.hgt) bad.push(`crags seed ${seed}: no height map`);
            else {
              let steep = 0, top = -1e9;
              for (let y = 0; y < m.h; y++) for (let x = 0; x < W - 1; x++) {
                const i = y * W + x;
                if (!m.block[i] && !m.block[i + 1] && Math.abs(m.hgt[i] - m.hgt[i + 1]) > 3) steep++;
                if (y < m.h - 1 && !m.block[i] && !m.block[i + W] && Math.abs(m.hgt[i] - m.hgt[i + W]) > 3) steep++;
                if (!m.block[i]) top = Math.max(top, m.hgt[i]);
              }
              if (steep) bad.push(`crags seed ${seed}: ${steep} open steps over 3 levels`);
              if (m.hgt[I(h.lair[0], h.lair[1])] < top - 3) bad.push(`crags seed ${seed}: the lair (${m.hgt[I(h.lair[0], h.lair[1])]}) is not the peak (${top})`);
            }
          } else if (m.hgt) bad.push(`${land} seed ${seed}: a height map`);
          if (land === 'fen') {
            if ((h.pools || []).length < 6) bad.push(`fen seed ${seed}: ${(h.pools || []).length} pools`);
            for (const pl of h.pools || []) if (h.paths.some((pp) => pp.some((t) => Math.hypot(t[0] - pl.x, t[1] - pl.y) < pl.r + 1.5))) bad.push(`fen seed ${seed}: a pool on the trail`);
          }
          if (land === 'badlands' && !g.props.some((p) => p.spr?.cliff)) bad.push(`badlands seed ${seed}: no cliffs`);
          stats.push({ open: seen.reduce((a, v) => a + v, 0), props: g.props.length, spawns: g.spawns.length, trail: h.paths.reduce((a, p) => a + p.length, 0) });
        }
        const avg = (k) => Math.round(stats.reduce((a, s) => a + s[k], 0) / Math.max(1, stats.length));
        out[land] = { maxMs: Math.round(ms), open: avg('open'), trail: avg('trail'), props: avg('props'), packs: avg('spawns') };
      }
      return { bad, out };
    }, LANDS);
    console.log('generation', JSON.stringify(gen.out));
    for (const b of gen.bad.slice(0, 30)) errors.push('[gen] ' + b);

    // ------------------------------------------------ each land in play: a sign, the gate, the flight, the wounds kept, the twist
    for (const land of LANDS) {
      await enter(page, land);
      const play = await page.evaluate(async () => {
        const { G, game } = window.VELSCOUR;
        const { hit } = await import('/src/game/combat.js');
        const { bakedDecals } = await import('/src/gfx/vfx.js');
        const { Area, Delayed } = await import('/src/game/hazards.js');
        const w = G.world, sc = w.overworldScenario, m = sc.beast, p = G.player, bad = [], out = { land: sc.land.id, beast: m.name }, twist = sc.land.twist;
        G.godMode = true;
        const tick = (n, each) => { for (let i = 0; i < n; i++) { G.time += 1 / 30; game.update(1 / 30); if (each) each(); } };
        for (const c of w.creatures) if (c !== p && c !== m && c.team === 'enemy') c.dead = true;
        tick(2);
        if (twist === 'burrow' && (m.alpha !== 0 || m.targetable !== false)) bad.push('the burrower is not under the sand');
        if (twist === 'mire') { out.pools = w.hazards.filter((h) => h instanceof Area && h.fx === 'poison').length; if (out.pools < 6) bad.push(`${out.pools} poison pools`); }
        // a sign read by walking up to it, and the next one marked
        const c0 = sc.clues[0];
        p.x = c0.x; p.y = c0.y + 0.5; tick(3);
        if (!c0.read) bad.push('the first sign was not read');
        if (twist === 'burrow' && !w.hazards.some((h) => h instanceof Delayed && Math.hypot(h.x - p.x, h.y - p.y) < 1.5)) bad.push('no eruption under the hero at the sign');
        const mk = w.portals.find((q) => q.type === 'objective');
        if (!mk || Math.hypot(mk.x - sc.clues[1].x, mk.y - sc.clues[1].y) > 0.1) bad.push('the second sign is not marked');
        // the White Waste: a blizzard hides the marked sign, and lifts again
        if (twist === 'blizzard') {
          sc.storm.t = 0; tick(2);
          if (!sc.storm.on || w.portals.some((q) => q.type === 'objective')) bad.push('the blizzard did not hide the trail');
          sc.storm.t = 0; tick(2);
          if (sc.storm.on || !w.portals.some((q) => q.type === 'objective')) bad.push('the trail did not show again after the blizzard');
        }
        // up to the beast: it wakes, the fight starts
        p.x = m.x + 3; p.y = m.y + 3; tick(30);
        if (sc.phase !== 'fight') bad.push('the beast did not wake (phase ' + sc.phase + ')');
        if (twist === 'burrow' && (m.alpha !== 1 || m.targetable === false)) bad.push('the burrower did not surface to fight');
        // a hit for its whole life: the gate holds it at the flee mark
        const drunk = () => Object.values(G.char.potions).reduce((a, v) => a + v, 0), pot0 = drunk();
        hit(p, m, m.maxHp * 5, 'phys', { crit: false });
        out.afterBigHit = Math.round(m.hp / m.maxHp * 100);
        if (m.dead) bad.push('one hit killed it at the first ground');
        else if (Math.abs(m.hp / m.maxHp - 0.75) > 0.01) bad.push(`the gate held it at ${out.afterBigHit}%, not 75%`);
        const dec0 = bakedDecals.length;
        tick(2);
        if (sc.phase !== 'flee' || sc.stage !== 1) bad.push(`no flight after the gate (phase ${sc.phase}, stage ${sc.stage})`);
        if (m.targetable !== false) bad.push('the fleeing beast can be hit');
        // let it go; the hero stays put, so it leaves his sight and parks on the next ground
        let t = 0, zMax = 0, aMin = 1;
        while (sc.phase === 'flee' && t < 30) { tick(15, () => { zMax = Math.max(zMax, m.z || 0); aMin = Math.min(aMin, m.alpha ?? 1); }); t += 0.5; }
        out.fleeSecs = t;
        if (twist === 'wings' && zMax < 40) bad.push(`it never took wing (z ${Math.round(zMax)})`);
        if (twist === 'burrow' && aMin > 0.05) bad.push('it never went under the sand');
        if (sc.phase !== 'track') bad.push('the beast never reached the next ground');
        else if (Math.hypot(m.x - w.map.hunt.anchors[2][0], m.y - w.map.hunt.anchors[2][1]) > 0.5) bad.push('it parked away from the second ground');
        out.trail = bakedDecals.length - dec0;
        if (out.trail < 15) bad.push(`only ${out.trail} splats on its trail`);
        out.carried = Math.round(m.hp / m.maxHp * 100);
        if (out.carried !== 75) bad.push(`its wounds did not carry over (${out.carried}%)`);
        if (m.awake || (twist !== 'burrow' && m.targetable === false)) bad.push('it is not resting on the new ground');
        if (twist === 'burrow' && !m.buried) bad.push('it is not back under the sand');
        if (m.z) bad.push('it is still in the air');
        const c3 = sc.clues.find((c) => c.leg === 1 && c.n === 0), mk2 = w.portals.find((q) => q.type === 'objective');
        if (!sc.storm?.on && (!mk2 || Math.hypot(mk2.x - c3.x, mk2.y - c3.y) > 0.1)) bad.push('the next leg\'s first sign is not marked');
        out.potions = w.loot.filter((l) => l.kind === 'potion').length + Math.max(0, drunk() - pot0); // (on the ground, or already picked up)
        if (out.potions < 3) bad.push(`no hunter's satchel (${out.potions} potions)`);
        G.godMode = false;
        return { bad, ...out };
      });
      console.log('play', JSON.stringify(play));
      for (const b of play.bad) errors.push(`[play ${land}] ` + b);
    }

    // ------------------------------------------------ screenshots of each land
    if (SHOTS) {
      const at = async (name, fn, zoom = 1, steps = 12) => {
        await page.evaluate(async ([src, zoom, steps]) => {
          const { G, game } = window.VELSCOUR;
          const { camera } = await import('/src/core/view.js');
          const w = G.world, m = w.map, p = G.player, sc = w.overworldScenario;
          const r = new Function('G', 'w', 'm', 'p', 'sc', src)(G, w, m, p, sc);
          if (r) { const q = m.walkable(r[0], r[1]) ? r : m.randomNear(r[0], r[1], 2.5) || r; p.x = q[0]; p.y = q[1]; }
          p.moveVec = [0, 0]; p.path = null;
          G.settings.zoom = zoom; camera.computeZoom();
          m.reveal(p.x, p.y, zoom < 0.5 ? 70 : 16);
          for (let i = 0; i < steps; i++) { G.time += 1 / 30; game.update(1 / 30); }
          camera.follow(p.x, p.y, 0, true);
          game.render();
        }, [fn, zoom, steps]);
        await page.waitForTimeout(150);
        await shot('hunt_' + name);
      };
      for (const land of LANDS) {
        await enter(page, land);
        await page.evaluate(() => { const { G } = window.VELSCOUR; G.godMode = true; for (const c of G.world.creatures) if (c.team === 'enemy' && c !== G.world.boss && Math.hypot(c.x - G.player.x, c.y - G.player.y) < 30) c.dead = true; });
        await at(land + '_camp', 'return [w.map.hunt.anchors[0][0] + 1, w.map.hunt.anchors[0][1] + 1];');
        await at(land + '_sign', 'const c = sc.clues[1]; return [c.x + c.nx * 1.5, c.y + c.ny * 1.5];', 1.3);
        await at(land + '_fight', 'const b = sc.beast; return [b.x + 3, b.y + 3];', 1, 70);
        // the flight: a blow to its flee mark, then a moment of running
        await page.evaluate(async () => { const { G } = window.VELSCOUR; const { hit } = await import('/src/game/combat.js'); const b = G.world.overworldScenario.beast; hit(G.player, b, b.maxHp, 'phys', { crit: false }); });
        await at(land + '_flee', 'return null;', 1, 40);
        if (land === 'tundra') { await page.evaluate(() => { window.VELSCOUR.G.world.overworldScenario.storm.t = 0; }); await at('tundra_blizzard', 'const c = sc.clues[3]; return [c.x + 1, c.y + 1];', 1, 30); }
        await at(land + '_lair', 'const l = w.map.hunt.anchors[4]; return [l[0] + 4, l[1] + 4];', 1);
        await at(land + '_overview', 'return [48, 48];', 0.3);
        await page.evaluate(async () => { const { G } = window.VELSCOUR; const { camera } = await import('/src/core/view.js'); G.settings.zoom = 1; camera.computeZoom(); G.godMode = false; });
      }
    }

    // ------------------------------------------------ auto-play hunts each land, no god mode: a level-10 hero at Depth 9
    // (the gate's floor) on every land, then geared heroes at Depths 60 and 150 on lands of their own
    if (AUTO) {
      const runs = [...LANDS.map((land, i) => [['paladin', 'necromancer', 'wizard', 'ranger', 'death_knight'][i % 5], 9, 10, 3, land]),
        ['wizard', 60, 61, 8, LANDS[1 % LANDS.length]], ['ranger', 150, 102, 8, LANDS[4 % LANDS.length]]];
      for (const [cls, D, lvl, rounds, land] of runs) {
        await gearHero(page, cls, D, lvl, rounds);
        await enter(page, land);
        const res = await page.evaluate(async () => {
          const { G, game } = window.VELSCOUR;
          const { Auto } = await import('/src/game/autoplay.js');
          Auto.toggle(true);
          const t0 = performance.now();
          let sim = 0, fight = 0, dodge = 0;
          const w = G.world, sc = w.overworldScenario, p = G.player, log = [];
          let last = '';
          while (sim < 1200 && !sc.completed && !p.dead && G.world === w && performance.now() - t0 < 240000) {
            for (let i = 0; i < 30; i++) {
              G.dt = 1 / 30; G.time += G.dt; G.frame++; game.update(1 / 30); sim += 1 / 30;
              if (sc.phase === 'fight') { fight += 1 / 30; if (/Dodg/.test(Auto.status)) dodge += 1 / 30; }
            }
            const k = `${sc.stage}:${sc.phase}`;
            if (k !== last) { log.push(`${Math.round(sim)}s ${k} ${sc.life}%`); last = k; }
            await new Promise((r) => setTimeout(r, 0));
          }
          Auto.toggle(false);
          return { land: sc.land.id, level: G.char.level, secs: Math.round(sim), fighting: Math.round(fight), dodging: Math.round(dodge), completed: sc.completed, died: p.dead || G.world !== w, beast: sc.def.name, life: sc.life, log: log.join(' | '), exit: w.portals.find((q) => q.type === 'exit')?.active };
        });
        console.log(`auto-play ${cls} L${lvl} D${D}`, JSON.stringify(res));
        if (!res.completed) errors.push(`[auto ${cls} D${D} ${res.land}] did not finish the hunt in ${res.secs}s${res.died ? ' (died)' : ''} (${res.beast}: ${res.log})`);
        else if (!res.exit) errors.push(`[auto ${cls} D${D} ${res.land}] the exit did not open`);
        if (SHOTS) { await page.evaluate(() => window.VELSCOUR.game.render()); await shot(`hunt_auto_end_${res.land}_d${D}`); }
      }
    }

    // ------------------------------------------------ phone layout
    if (SHOTS) {
      const m = await openGame({ width: 844, height: 390, mobile: true });
      await m.page.evaluate(async () => {
        const { G, game } = window.VELSCOUR;
        const { BIOME_BY_ID } = await import('/src/data/biomes.js');
        await game.newChar('ranger', 'Phone');
        G.char.level = 10; // the hunt opens at level 10
        (G.regionWant ||= {}).great_hunt = 'crags';
        await game.teleportToBiome(BIOME_BY_ID.great_hunt);
        const c = G.world.overworldScenario.clues[0], p = G.player; p.x = c.x; p.y = c.y;
        for (let i = 0; i < 20; i++) { G.time += 1 / 30; game.update(1 / 30); }
        game.render();
      });
      await m.page.waitForTimeout(200);
      await m.shot('hunt_mobile');
      errors.push(...m.errors);
      await m.browser.close();
    }
  } catch (e) { errors.push('[test] ' + e.message); }
  report(errors);
  await browser.close();
})();
