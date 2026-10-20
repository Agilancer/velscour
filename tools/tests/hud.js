// The HUD art and the 15-slot skill bar: an old 10-slot save migrates, all 13 keys (` 1-9 0 - =) and both mouse
// buttons cast their slot, the bar's slots line up with the art, the minimap ring and the six art buttons work
// (Quest opens the Quest Log), and on touch the skill cluster flips to its second page.
// The orbs' shading and numbers stay on the art through portrait/landscape rotations.
// Screenshots: hud1_bar (desktop, full bar), hud2_quest, hud3_touch_p1, hud4_touch_p2, hud5_portrait.
const { openGame, report } = require('./harness');

const fail = (msg) => { console.log('FAIL', msg); process.exitCode = 1; };

(async () => {
  // ---- desktop
  let { browser, page, errors, shot } = await openGame({ width: 1280, height: 720 });
  const mig = await page.evaluate(async () => {
    const { migrate, newCharData } = await import('/src/game/save.js');
    const c = newCharData('wizard', 'Old Bar');
    c.bar = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j']; // LMB, 1-8, RMB
    return migrate(c).bar;
  });
  const want = ['a', null, 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', null, null, null, null, 'j'];
  if (JSON.stringify(mig) !== JSON.stringify(want)) fail('10-slot bar migration: ' + JSON.stringify(mig));
  // a wizard with 15 learned skills, one on every slot
  await page.evaluate(async () => {
    const { G, game } = window.VELSCOUR;
    const { newCharData } = await import('/src/game/save.js');
    const { CLASS_SKILLS } = await import('/src/data/skills.js');
    const c = newCharData('wizard', 'Barkeep');
    c.level = 40;
    const list = CLASS_SKILLS.wizard.filter((s) => !['summon', 'blink', 'leap', 'dash'].includes(s.kind)).slice(0, 15);
    for (const s of list) c.skills[s.id] = 1;
    c.bar = list.map((s) => s.id);
    await game.loadClassPack('wizard');
    game.startChar(c, false);
    G.godMode = true;
  });
  await page.waitForTimeout(800);
  await page.evaluate(() => window.VELSCOUR.game.enterDungeon());
  await page.waitForFunction(() => window.VELSCOUR.G.world && window.VELSCOUR.G.world.kind === 'dungeon', null, { timeout: 30000 });
  await page.waitForTimeout(1200);
  const slots = await page.evaluate(() => [...document.querySelectorAll('#hud-slots .slot')].map((d) => { const r = d.getBoundingClientRect(); return { x: r.x, w: r.width, title: d.title, icon: d.querySelector('img.icon').style.display !== 'none' }; }));
  if (slots.length !== 19) fail('expected 19 HUD slots, got ' + slots.length);
  const skillSlots = slots.filter((s) => /Skill slot/.test(s.title));
  if (skillSlots.length !== 15 || skillSlots.some((s) => !s.icon)) fail('15 skill slots with icons: ' + skillSlots.length);
  console.log('slot titles', slots.map((s) => s.title.replace('Skill slot ', '').replace(/ Potion.*|Elixir.*/, 'P')).join(' '));
  // every key casts its slot
  const KEYS = [null, 'Backquote', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0', 'Minus', 'Equal', null];
  const cast = [];
  for (let i = 0; i < 15; i++) {
    const ok = await page.evaluate(async ({ i, key }) => {
      const { G } = window.VELSCOUR;
      const { input } = await import('/src/core/input.js');
      const p = G.player, id = G.char.bar[i];
      p.cooldowns = {}; p.castLock = 0; p.mana = p.maxMana;
      let used = null;
      const orig = p.tryUseSkill;
      p.tryUseSkill = function (sk, ...a) { used = sk.id; return orig.call(this, sk, ...a); };
      input.lastPointerType = 'mouse'; input.mouse.inside = true; input.mouse.x = G.W / 2 + 80; input.mouse.y = G.H / 2;
      if (key) input.pressed.add(key);
      else if (i === 14) { input.mouse.rightPressed = true; input.mouse.right = true; }
      else { input.keys.add('ShiftLeft'); input.mouse.leftPressed = true; input.mouse.left = true; }
      G.controls.update(1 / 60);
      input.keys.delete('ShiftLeft'); input.mouse.left = input.mouse.right = false;
      p.tryUseSkill = orig;
      return used === id;
    }, { i, key: KEYS[i] });
    cast.push(ok ? 1 : 0);
  }
  console.log('cast per slot', cast.join(''));
  if (cast.some((x) => !x)) fail('some slots did not cast from their key');
  await shot('hud1_bar');
  // minimap ring sits around the map, the six buttons are images
  const geo = await page.evaluate(() => {
    const m = document.querySelector('#minimap').getBoundingClientRect(), r = document.querySelector('#minimap-ring').getBoundingClientRect();
    return { m: [m.x, m.y, m.width, m.height], r: [r.x, r.y, r.width, r.height], btns: [...document.querySelectorAll('.hbtn img')].map((i) => i.complete && i.naturalWidth > 0) };
  });
  console.log('minimap', geo.m.map(Math.round).join(','), 'ring', geo.r.map(Math.round).join(','));
  if (!(geo.r[0] < geo.m[0] && geo.r[1] < geo.m[1] && geo.r[0] + geo.r[2] > geo.m[0] + geo.m[2] && geo.r[1] + geo.r[3] > geo.m[1] + geo.m[3])) fail('ring does not surround the minimap');
  if (geo.btns.length !== 6 || geo.btns.some((x) => !x)) fail('HUD button art missing');
  await page.click('.hbtn[data-act="quest"]');
  await page.waitForTimeout(400);
  const q = await page.evaluate(() => { const p = document.querySelector('.panel[data-panel="quest"]'); return p ? p.innerText : ''; });
  if (!/Current Quest/i.test(q) || !/Depth/.test(q)) fail('Quest Log did not open: ' + q.slice(0, 80));
  await shot('hud2_quest');
  report(errors);
  await browser.close();

  // ---- touch: the skill cluster's two pages
  ({ browser, page, errors, shot } = await openGame({ width: 844, height: 390, mobile: true }));
  await page.evaluate(async () => {
    const { G, game } = window.VELSCOUR;
    const { newCharData } = await import('/src/game/save.js');
    const { CLASS_SKILLS } = await import('/src/data/skills.js');
    const c = newCharData('necromancer', 'Thumbs');
    c.level = 40;
    const list = CLASS_SKILLS.necromancer.slice(0, 15);
    for (const s of list) c.skills[s.id] = 1;
    c.bar = list.map((s) => s.id);
    await game.loadClassPack('necromancer');
    game.startChar(c, false);
    G.godMode = true;
    game.enterDungeon();
  });
  await page.waitForFunction(() => window.VELSCOUR.G.world && window.VELSCOUR.G.world.kind === 'dungeon', null, { timeout: 30000 });
  await page.waitForTimeout(1200);
  const labels = () => page.evaluate(() => [...document.querySelectorAll('.tbtn:not(.flip):not(.hidden) .k')].map((k) => k.textContent).join(' '));
  const p1 = await labels();
  await shot('hud3_touch_p1');
  await page.tap('.tbtn.flip');
  await page.waitForTimeout(300);
  const p2 = await labels();
  await shot('hud4_touch_p2');
  console.log('touch page 1:', p1, '| page 2:', p2);
  const all = new Set((p1 + ' ' + p2).split(' '));
  for (const k of ['ATK', 'RMB', '`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=']) if (!all.has(k)) fail('touch pages miss slot ' + k);
  // flip button and orbs must not overlap
  const ov = await page.evaluate(() => {
    const a = document.querySelector('.tbtn.flip').getBoundingClientRect(), b = document.querySelector('#mana-cover').getBoundingClientRect();
    return !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);
  });
  if (ov) fail('flip button overlaps the mana orb');
  // the orb shading + numbers follow the art through portrait -> landscape -> portrait, and the portrait tray clears the orbs
  const orbs = () => page.evaluate(() => {
    const r = (s) => document.querySelector(s).getBoundingClientRect();
    const out = [];
    for (const k of ['life', 'mana']) {
      const c = r('#' + k + '-cover'), t = r('#' + k + '-text');
      const frame = document.querySelector(`.portrait-orb-frame[data-orb="${k}"]`);
      const art = frame && frame.style.display === 'block' ? r(`.portrait-orb-frame[data-orb="${k}"]`) : r('#hud-img');
      if (c.left < art.left - 1 || c.right > art.right + 1 || c.top < art.top - 1 || c.bottom > art.bottom + 1) out.push(k + ' shading off the orb art');
      if (Math.abs((t.left + t.right) / 2 - (c.left + c.right) / 2) > 2 || Math.abs((t.top + t.bottom) / 2 - (c.top + c.bottom) / 2) > c.height * .2) out.push(k + ' numbers off the orb');
      for (const b of document.querySelectorAll('.tbtn.portrait-tile')) { const q = b.getBoundingClientRect(); if (q.width && !(q.right < c.left || q.left > c.right || q.bottom < c.top || q.top > c.bottom)) { out.push('touch tile over the ' + k + ' orb'); break; } }
    }
    return out;
  });
  for (const [w, h, tag] of [[390, 844, 'portrait'], [844, 390, 'landscape after portrait'], [390, 844, 'portrait again']]) {
    await page.setViewportSize({ width: w, height: h }); await page.waitForTimeout(500);
    for (const m of await orbs()) fail(`${tag}: ${m}`);
  }
  await shot('hud5_portrait');
  report(errors);
  await browser.close();
})();
