// Close-ups of the Monk, the Rogue and the Ninja (zoomed in, no monsters near): standing in a few armors, and frame
// by frame through a flip. One sheet: tools/tests/out/martial_closeup.png.
//   node tools/tests/martial_closeup.js [classes]
const path = require('path');
const { spawnSync } = require('child_process');
const { openGame, report, OUT_DIR } = require('./harness');
const CLASSES = process.argv[2] ? process.argv[2].split(',') : ['ninja', 'rogue', 'monk'];
const FLIPS = { ninja: [["Swallow's Flight", [2, 5, 8, 11]], ['Rising Moon', [4, 10, 16, 22]], ['Storm of Steel', [8, 20, 30]]], rogue: [['Death from Above', [6, 14, 22, 30]], ["Executioner's Blade", [38, 46]]], monk: [] };

(async () => {
  const { browser, page, errors } = await openGame();
  const files = [];
  const clip = { x: 640 - 210, y: 360 - 250, width: 420, height: 380 };
  for (const cls of CLASSES) {
    await page.evaluate(async (cls) => {
      const { G, game } = window.VELSCOUR;
      if (window.__realUpdate) game.update = window.__realUpdate;
      await game.newChar(cls, 'Close');
      document.querySelectorAll('.screen').forEach((s) => s.remove()); G.ui.modalCount = 0;
      const { BIOME_BY_ID } = await import('/src/data/biomes.js');
      const { CLASS_SKILLS } = await import('/src/data/skills.js');
      G.godMode = true; G.settings.zoom = 2;
      game.buildDungeon(6, BIOME_BY_ID.overworld);
      await new Promise((r) => setTimeout(r, 600));
      const p = G.player, w = G.world;
      for (const sk of CLASS_SKILLS[cls]) G.char.skills[sk.id] = 5;
      G.char.level = 30; p.recompute(); p.mana = p.maxMana;
      for (const c of w.creatures) if (c.team === 'enemy') c.dead = true;
      w.creatures = w.creatures.filter((c) => c.team !== 'enemy');
      let spot = null;
      for (let t = 0; t < 12000 && !spot; t++) {
        const x = 9 + Math.random() * (w.map.w - 18), y = 9 + Math.random() * (w.map.h - 18), R = t < 6000 ? 7 : 5;
        let ok = true;
        for (let dx = -R; dx <= R && ok; dx++) for (let dy = -R; dy <= R && ok; dy++) ok = w.map.walkable(x + dx, y + dy);
        if (ok) spot = [x, y];
      }
      p.x = spot[0]; p.y = spot[1]; window.__home = spot;
      const upd = window.__realUpdate = game.update.bind(game); game.update = () => upd(0); // the live loop stands still: the test steps the world itself
      const V = await import('/src/core/view.js');
      window.__snap = () => { V.camera.x = V.isoX(p.x, p.y); V.camera.y = V.isoY(p.x, p.y) - 30; game.render(); };
    }, cls);
    const shot = async (name) => { await page.evaluate(() => window.__snap()); const f = path.join(OUT_DIR, `close_${cls}_${name}.png`); await page.screenshot({ path: f, clip }); files.push(f); };
    // standing: the starter look, then a Rare, an Epic and a Mythic armor, facing both ways
    for (const [i, rar] of [0, 2, 3, 5].entries()) {
      await page.evaluate(async ([rar, i]) => {
        const { G } = window.VELSCOUR, p = G.player;
        const { rollItem } = await import('/src/data/items.js');
        const C = (await import('/src/data/classes.js')).CLASSES[p.classId];
        const A = await import('/src/gfx/heldart.js');
        if (rar) {
          G.char.equip.body = rollItem(40, { slot: 'body', rarity: rar });
          G.char.equip.weapon = rollItem(40, { slot: 'weapon', base: C.weapon, rarity: rar });
          G.char.equip.offhand = C.offhand ? rollItem(40, { slot: 'offhand', base: C.offhand, rarity: rar }) : p.classId === 'rogue' ? rollItem(40, { slot: 'weapon', base: C.weapon, rarity: rar }) : null;
          G.char.equip.head = rollItem(40, { slot: 'head', rarity: rar });
        }
        p.recompute(); if (A.loadHeld) await A.loadHeld(p.classId, G.char);
        p.face(i % 2 ? 2.4 : 0.6); p.flip = !!(i % 2); p.moving = false;
        for (let k = 0; k < 30; k++) G.world.update(1 / 60);
        await new Promise((r) => setTimeout(r, 400));
      }, [rar, i]);
      await shot(`stand${rar}`);
    }
    for (const [name, frames] of FLIPS[cls] || []) {
      await page.evaluate(async (name) => {
        const { G } = window.VELSCOUR, p = G.player, w = G.world;
        const { CLASS_SKILLS } = await import('/src/data/skills.js');
        const { makeMonster } = await import('/src/game/monster.js');
        w.hazards.length = 0; p.x = window.__home[0]; p.y = window.__home[1]; p.z = 0; p.channel = null; p.acro = null; p.cooldowns = {}; p.castLock = 0; p.mana = p.maxMana;
        if (p.rogue) p.rogue.cp = 5;
        for (const c of w.creatures) if (c.team === 'enemy') c.dead = true;
        w.creatures = w.creatures.filter((c) => c.team !== 'enemy');
        const m = makeMonster(w, (w.biome.roster || ['skeleton'])[0], w.biome, 6, 'normal', p.x + 2.4, p.y - 0.6); m.maxHp = m.hp = 1e9; m.speed = 0; m.baseSpeed = 0; m.dmg = [0, 0]; w.add(m); w.rebuildGrid(); w.update(1 / 60);
        p.tryUseSkill(CLASS_SKILLS[p.classId].find((s) => s.name === name), m.x, m.y, m);
      }, name);
      let at = 0;
      for (const f of frames) { await page.evaluate((k) => { for (let i = 0; i < k; i++) window.VELSCOUR.G.world.update(1 / 60); }, f - at); at = f; await shot(`${name.replace(/[^a-z]+/gi, '')}_${String(f).padStart(2, '0')}`); }
      await page.evaluate(() => { for (let i = 0; i < 200; i++) window.VELSCOUR.G.world.update(1 / 60); });
    }
  }
  const py = 'import sys\nfrom PIL import Image\nout, files = sys.argv[1], sys.argv[2:]\nims = [Image.open(f).convert("RGB") for f in files]\nw, h = ims[0].size\ncols = 5\nrows = -(-len(ims) // cols)\nsheet = Image.new("RGB", (cols * w * 3 // 4, rows * h * 3 // 4), (20, 20, 24))\nfor i, im in enumerate(ims):\n    sheet.paste(im.resize((w * 3 // 4, h * 3 // 4), Image.LANCZOS), ((i % cols) * w * 3 // 4, (i // cols) * h * 3 // 4))\nsheet.save(out)\n';
  spawnSync(process.env.PYTHON || 'python', ['-c', py, path.join(OUT_DIR, 'martial_closeup.png'), ...files], { stdio: 'inherit' });
  console.log(files.length, 'shots -> martial_closeup.png');
  await browser.close();
  report(errors.filter((e) => !/404/.test(e)));
})();
