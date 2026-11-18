// The Ninja's live gear (src/gfx/ninjagear.js) and the Rogue's two daggers, close up. The Ninja's equipped katana is a
// three.js model in his right fist (src/gfx/heldmodel3d.js) and his nunchaku hangs from his belt and swings; both stay
// out of the baked hero image while they draw live, and come back for the inventory portrait and his after-images.
// Checks: the model loads, the hero image drops the two pieces, the portrait keeps them, the sticks swing at a walk and
// settle at a stand, a cut sweeps the blade, the settings turn it all off. The Rogue: a dagger in each fist on every
// armor of a rarity, both facings, the same design in either hand as in the bag.
// Shots (tools/tests/out/): ninjagear_<rarity>.png (standing right/left, walking, four frames of a cut, the rising
//   cut, in the air, a somersault), ninjagear_sheet.png (Common and Mythic rows), ninjagear_rogue.png (rarity rows x
//   facing), ninjagear_bag.png (bag icons), ninjagear_ground.png (dropped katanas, nunchaku and daggers).
//   node tools/tests/ninjagear.js [rarities, default 0,5]
const fs = require('fs'), path = require('path');
const { spawnSync } = require('child_process');
if (!process.env.CHROMIUM_ARGS) process.env.CHROMIUM_ARGS = '--enable-unsafe-swiftshader';   // WebGL in headless
const { openGame, report, OUT_DIR } = require('./harness');
const RARITIES = (process.argv[2] || '0,5').split(',').map(Number), NAMES = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];

(async () => {
  const { browser, page, errors } = await openGame({ width: 1280, height: 720 });
  const ok = (c, msg) => console.log(`  ${c ? 'ok  ' : 'FAIL'} ${msg}`) || (c || (process.exitCode = 1));
  const start = (cls) => page.evaluate(async (cls) => {
    const { G, game } = window.VELSCOUR;
    await game.newChar(cls, 'Shade');
    document.querySelectorAll('.screen').forEach((s) => s.remove()); G.ui.modalCount = 0;
    const { BIOME_BY_ID } = await import('/src/data/biomes.js');
    game.buildDungeon(1, BIOME_BY_ID.catacombs);
    await new Promise((r) => setTimeout(r, 300));
    for (const c of G.world.creatures) if (!c.isPlayer) c.dead = true;
    G.godMode = true; G.settings.zoom = 3; G.settings.heldGear = true; G.settings.heldFx = true; G.settings.gore = 0;
    (await import('/src/core/view.js')).camera.computeZoom();
    const m = document.getElementById('center-msg'); if (m) m.style.display = 'none';
    G.ui.modalCount = 1; // the game holds still (as under a dialog): the test steps the world itself
  }, cls);
  // n world steps of 1/60 s with the hero as given, then a frame
  const frame = (n = 0, o = {}) => page.evaluate(async ({ n, o }) => {
    const { G, game } = window.VELSCOUR, p = G.player, { camera } = await import('/src/core/view.js');
    if (o.flip !== undefined) p.flip = o.flip;
    if (o.lunge !== undefined) p.lunge = o.lunge;
    if (o.acro) p.acro = { t: 0, ...o.acro };
    if (o.walk) p.setMoveTarget(p.x + o.walk[0], p.y + o.walk[1]);
    if (o.stop) { p.moveTarget = null; p.path = null; }
    for (let i = 0; i < n; i++) { G.time += 1 / 60; G.world.update(1 / 60); if (o.z !== undefined) p.z = o.z; camera.follow(p.x, p.y, 0, true); game.render(); }
    camera.follow(p.x, p.y, 0, true); game.render();
    const [x, y] = camera.tileToScreen(p.x, p.y, 0), S = p._ninjaGear;
    return { clip: { x: Math.max(0, x - 110), y: Math.max(0, y - 190), width: 220, height: 230 }, a: S?.a, pts: S?.pts?.map((q) => [q.bx - q.tx, q.by - q.ty]), moving: p.moving };
  }, { n, o });
  const shots = {};
  const snap = async (key, f) => { (shots[key] ||= []).push(await page.screenshot({ clip: f.clip })); return f; };

  try {
    // ------------------------------------------------------------ the Ninja
    await start('ninja');
    for (const R of RARITIES) {
      const info = await page.evaluate(async (R) => {
        const { G } = window.VELSCOUR, p = G.player;
        const { rollItem, GEMS } = await import('/src/data/items.js');
        const { HELD_PER } = await import('/src/data/held.js');
        const { PALETTES } = await import('/src/data/gear.js');
        const H = await import('/src/gfx/heldart.js'), M3 = await import('/src/gfx/heldmodel3d.js');
        const gems = Object.keys(GEMS).filter((g) => !GEMS[g].special);
        const sock = (it) => { it.sockets = Math.max(1, Math.min(R + 1, it.maxSockets || 3)); it.gems = Array.from({ length: it.sockets }, (_, i) => ({ gem: gems[(i * 5 + R) % gems.length], tier: 5 })); return it; };
        const fin = R >= 4 ? Math.max(0, PALETTES.findIndex((q) => q.tier === R && q.ramps)) : 0;
        const w = sock(rollItem(60, { slot: 'weapon', base: 'katana', rarity: R })), o = sock(rollItem(60, { slot: 'offhand', base: 'nunchaku', rarity: R }));
        w.look = [Math.min(2, HELD_PER[R] - 1), 0, -1, 2]; o.look = [Math.min(1, HELD_PER[R] - 1), fin, -1, 2];
        Object.assign(G.char.equip, { weapon: w, offhand: o, body: rollItem(60, { slot: 'body', rarity: R }), head: null });
        p.recompute(); p._ninjaGear = null;
        await H.loadHeld('ninja', G.char);
        for (let i = 0; i < 300 && !M3.heldModel3DReady(w, 'ninja'); i++) await new Promise((r) => setTimeout(r, 50));
        p.artFrame();
        const live = p.heldArt.held, [still] = H.heldPortraitArgs(p.heldArt.base, 'ninja', G.char.equip), free = H.heldFree(o, 'ninja', 'offhand');
        p.ghostDraw = true; const ghost = H.heldHero(p.heldArt.base, 'ninja', G.char.equip); p.ghostDraw = false;
        return { model: M3.heldModel3DReady(w, 'ninja'), live: live ? live.pieces.length : 0, still: !!still, ghost: ghost ? ghost.pieces.length : 0, sticks: !!free?.pts.sticks, cord: free?.pts.cord, name: [H.heldFree(w, 'ninja')?.name, free?.name] };
      }, R);
      console.log(`Ninja ${NAMES[R]}: ${info.name.join(' + ')} (cord: ${info.cord})`);
      ok(info.model, 'the katana\'s three.js model loads');
      ok(info.sticks, 'the nunchaku\'s whole sprite has its two sticks marked');
      ok(info.live === 0, `the hero image leaves both pieces to the live gear (${info.live} baked)`);
      ok(info.still && info.ghost === 2, `the portrait and his after-images keep the baked katana and nunchaku (${info.ghost})`);

      const key = 'ninja_' + R;
      const rest = await snap(key, await frame(90, { flip: false, stop: true }));
      const sway = Math.max(...rest.pts.map(([x]) => Math.abs(x)));
      ok(sway < 0.6, `standing: the sticks hang still (${sway.toFixed(2)} px off plumb)`);
      await snap(key, await frame(2, { flip: true }));
      await frame(40, { flip: false });
      const w1 = await snap(key, await frame(14, { walk: [3, 3] }));
      const w2 = await snap(key, await frame(9));
      ok(w1.moving && Math.max(...w1.pts.map(([x]) => Math.abs(x)), ...w2.pts.map(([x]) => Math.abs(x))) > 1.2, `walking: the sticks swing out (${w1.pts.map(([x]) => x.toFixed(1))} / ${w2.pts.map(([x]) => x.toFixed(1))} px) and the blade trails (${(w2.a * 57.3).toFixed(0)} deg)`);
      await frame(80, { stop: true });
      const cut = [];
      cut.push(await snap(key, await frame(2, { lunge: 1, flip: false })));
      for (let i = 0; i < 3; i++) cut.push(await snap(key, await frame(3)));
      const arc = Math.max(...cut.map((c) => c.a)) - Math.min(...cut.map((c) => c.a));
      ok(arc > 1.5, `an attack sweeps the blade through ${(arc * 57.3).toFixed(0)} degrees`);
      await frame(40);
      await snap(key, await frame(5, { lunge: 1 }));     // the next attack: the rising cut
      await frame(40);
      await snap(key, await frame(12, { z: 22 }));
      await frame(30, { z: 0 });
      await snap(key, await frame(11, { acro: { dur: 0.5, spins: 1, h: 26, dir: 1 } }));
      await frame(60);
    }
    // the settings: held gear off draws neither
    const off = await page.evaluate(async () => {
      const { G, game } = window.VELSCOUR, p = G.player;
      G.settings.heldGear = false; p._ninjaGear = null; game.render();
      const none = !p._ninjaGear; G.settings.heldGear = true;
      return none;
    });
    ok(off, 'Settings: held gear off draws no live gear');

    // ------------------------------------------------------------ the Rogue
    await start('rogue');
    for (const R of [0, 2, 3, 4, 5]) {
      const info = await page.evaluate(async (R) => {
        const { G } = window.VELSCOUR, p = G.player;
        const { rollItem, GEMS } = await import('/src/data/items.js');
        const H = await import('/src/gfx/heldart.js');
        const gems = Object.keys(GEMS).filter((g) => !GEMS[g].special);
        const sock = (it) => { it.sockets = Math.max(1, Math.min(R + 1, it.maxSockets || 3)); it.gems = Array.from({ length: it.sockets }, (_, i) => ({ gem: gems[(i * 5 + R) % gems.length], tier: 5 })); return it; };
        Object.assign(G.char.equip, { weapon: sock(rollItem(60, { slot: 'weapon', base: 'dagger', rarity: R })), offhand: sock(rollItem(60, { slot: 'weapon', base: 'dagger', rarity: R })), body: rollItem(60, { slot: 'body', rarity: R }), head: null });
        p.recompute();
        await H.loadHeld('rogue', G.char);
        p.artFrame();
        const h = p.heldArt.held;
        // every armor of the class: both fists found, both daggers laid
        const { heroLook } = await import('/src/core/gearart.js');
        let bad = 0, n = 0;
        for (let a = 1; a <= 48; a++) { const body = { type: 'gear', slot: 'body', rarity: 3, look: [a, 0, -1, 2] }, base = heroLook('rogue', body, null), hh = base && H.heldHero(base, 'rogue', { ...G.char.equip, body }); n++; if (!hh || hh.pieces.length !== 2) bad++; }
        return { pieces: h ? h.pieces.map((q) => `${q.set}#${q.i} ${q.d.name} (${q.hand})`) : [], bad, n };
      }, R);
      console.log(`Rogue ${NAMES[R]}: ${info.pieces.join(' | ')}`);
      ok(info.pieces.length === 2 && /stilettos#.*\(R\)/.test(info.pieces[0]) && /offstilettos#.*\(L\)/.test(info.pieces[1]), 'a dagger in each fist: stilettos right, offstilettos left');
      ok(info.bad === 0, `both daggers on all ${info.n} armors`);
      await snap('rogue', await frame(20, { flip: false, stop: true }));
      await snap('rogue', await frame(2, { flip: true }));
    }

    // ------------------------------------------------------------ bag icons and ground drops
    await page.evaluate(async () => {
      const { G } = window.VELSCOUR;
      const { rollItem } = await import('/src/data/items.js');
      const { GroundItem } = await import('/src/game/loot.js');
      const { loadHeld } = await import('/src/gfx/heldart.js');
      const items = [];
      for (let R = 0; R < 6; R++) for (const [slot, base] of [['weapon', 'dagger'], ['weapon', 'dagger'], ['weapon', 'katana'], ['offhand', 'nunchaku']]) items.push(rollItem(30 + R * 10, { slot, base, rarity: R }));
      G.char.bag.fill(null); items.forEach((it, i) => { if (i < G.char.bag.length) G.char.bag[i] = it; });
      await loadHeld('ninja', G.char); await loadHeld('rogue', G.char);
      G.player.flip = false; G.ui.modalCount = 0;
      items.filter((_, i) => i % 4 !== 1).slice(0, 18).forEach((it, i) => { const a = i / 18 * Math.PI * 2; G.world.addLoot(Object.assign(new GroundItem(G.player.x + Math.cos(a) * 1.9, G.player.y + Math.sin(a) * 1.9, 'item', { item: it }), { vz: 0, vx: 0, vy: 0 })); });
      G.showLabels = false; G.settings.zoom = 2.4; (await import('/src/core/view.js')).camera.computeZoom();
    });
    await page.waitForTimeout(1500);
    const g = await page.evaluate(async () => { const { G } = window.VELSCOUR; const { camera } = await import('/src/core/view.js'); const [x, y] = camera.tileToScreen(G.player.x, G.player.y, 0); return { x: Math.max(0, x - 330), y: Math.max(0, y - 260), width: 660, height: 420 }; });
    await page.screenshot({ path: path.join(OUT_DIR, 'ninjagear_ground.png'), clip: g });
    await page.keyboard.press('i');
    await page.waitForTimeout(900);
    await page.screenshot({ path: path.join(OUT_DIR, 'ninjagear_bag.png') });
    const icons = await page.evaluate(async () => { const { G } = window.VELSCOUR; const { heldIcon } = await import('/src/gfx/heldart.js'); return G.char.bag.filter(Boolean).filter((it) => !heldIcon(it)).map((it) => it.base); });
    ok(icons.length === 0, `every katana, nunchaku and dagger in the bag has a held-art icon (${icons.join(',') || 'all'})`);
    await page.keyboard.press('i');
  } catch (e) { console.log('FAIL', e.stack || e); process.exitCode = 1; }

  // the frames, as strips
  const tmp = path.join(OUT_DIR, '_ninjagear'); fs.mkdirSync(tmp, { recursive: true });
  for (const [k, list] of Object.entries(shots)) list.forEach((b, i) => fs.writeFileSync(path.join(tmp, `${k}_${String(i).padStart(2, '0')}.png`), b));
  const py = `
import sys, os, glob
from PIL import Image
tmp, out = sys.argv[1], sys.argv[2]
keys = sorted(set(os.path.basename(f).rsplit('_', 1)[0] for f in glob.glob(tmp + '/*.png')))
rows = {}
for k in keys:
    fs = sorted(glob.glob(f'{tmp}/{k}_*.png')); ims = [Image.open(f) for f in fs]
    cols = 10 if k == 'rogue' else len(ims)
    w, h = ims[0].size; n = (len(ims) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * w, n * h))
    for i, im in enumerate(ims): sheet.paste(im, ((i % cols) * w, (i // cols) * h))
    sheet = sheet.resize((sheet.width * 2, sheet.height * 2), Image.NEAREST) if k != 'rogue' else sheet
    name = 'ninjagear_rogue.png' if k == 'rogue' else 'ninjagear_' + ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'][int(k.split('_')[1])] + '.png'
    sheet.save(os.path.join(out, name)); rows[k] = sheet
nin = [v for k, v in sorted(rows.items()) if k != 'rogue']
if nin:
    s = Image.new('RGB', (max(v.width for v in nin) // 2, sum(v.height for v in nin) // 2)); y = 0
    for v in nin: s.paste(v.resize((v.width // 2, v.height // 2), Image.NEAREST), (0, y)); y += v.height // 2
    s.save(os.path.join(out, 'ninjagear_sheet.png'))
for f in glob.glob(tmp + '/*.png'): os.remove(f)
os.rmdir(tmp)
`;
  const r = spawnSync(process.env.PYTHON || 'python', ['-c', py, tmp, OUT_DIR], { stdio: 'inherit' });
  if (r.status !== 0) console.log('(no strips: python with Pillow is needed; the frames are in', tmp + ')');
  console.log(process.exitCode ? 'FAILED' : 'OK');
  report(errors);
  await browser.close();
})();
