// The Rogue's daggers (tools/weapons3d.js stilettos, offstilettos): both held reversed through the slot of her fist,
// pommel above it, guard under it, blades down to her back; the left blade behind her body (its hilt in front). Close-ups facing right and left over a spread of armors and dagger
// designs, and checks: the left dagger is drawn under the hero, both blades run down from the fist, and to the screen
// left (facing right). Sheet: out/rogue_daggers.png.
//   node tools/tests/rogue_daggers.js
const fs = require('fs');
const path = require('path');
const { openGame, report, OUT_DIR } = require('./harness');

(async () => {
  const { browser, page, errors } = await openGame({ width: 1400, height: 900 });
  let failed = false;
  try {
    const r = await page.evaluate(async () => {
      const ga = await import('/src/core/gearart.js'), ha = await import('/src/gfx/heldart.js'), { rollItem } = await import('/src/data/items.js');
      await ga.loadGearArt('rogue');
      const mk = (slot, rarity, d) => { const it = rollItem(40, { slot, rarity, base: 'dagger' }); it.base = 'dagger'; it.look = [d, 0, -1, 2]; it.gems = []; return it; };
      const cases = [[1, 0, 0], [2, 0, 4], [9, 1, 2], [20, 2, 5], [26, 3, 1], [33, 3, 6], [41, 4, 3], [44, 4, 0], [46, 5, 2], [48, 5, 5]];
      const Z = 4, X0 = 26, Y0 = 92, CW = 84, CH = 84, issues = [];
      const cv = document.createElement('canvas'); cv.width = 4 * CW * Z + 30; cv.height = Math.ceil(cases.length / 2) * CH * Z;
      const x = cv.getContext('2d'); x.fillStyle = '#3a3840'; x.fillRect(0, 0, cv.width, cv.height); x.imageSmoothingEnabled = false;
      for (const [k, [body, R, d]] of cases.entries()) {
        const eq = { body: { type: 'gear', slot: 'body', rarity: 0, look: [body, 0, -1, 2] }, weapon: mk('weapon', R, d), offhand: mk('offhand', R, d) };
        await ha.loadHeld('rogue', { equip: eq });
        const base = ga.heroLook('rogue', eq.body, null), h = ha.heldHero(base, 'rogue', eq);
        if (!h) { issues.push(`armor ${body}: no held image`); continue; }
        const F = ha.heldFists('rogue', eq);
        for (const p of h.pieces) {
          const f = F[p.hand], tip = p.pts.tip, name = `armor ${body} ${p.set} r${R}#${d}`;
          if (!tip) { issues.push(name + ': no tip'); continue; }
          if (tip[1] < f[1] + 4) issues.push(`${name}: blade not down (tip y ${tip[1].toFixed(1)}, fist ${f[1]})`);
          if (tip[0] > f[0] - 2) issues.push(`${name}: blade not to the screen left (tip x ${tip[0].toFixed(1)}, fist ${f[0]})`);
          if (p.y > f[1] - 2) issues.push(`${name}: nothing above the fist (top y ${p.y})`);
          if ((p.set === 'offstilettos') !== p.behind > 0) issues.push(`${name}: behind = ${p.behind}`);
        }
        const ox = (k % 2) * (2 * CW * Z + 30), oy = Math.floor(k / 2) * CH * Z;
        x.drawImage(h.img, X0 * 4, Y0 * 4, CW * 4, CH * 4, ox, oy, CW * Z, CH * Z);
        x.save(); x.translate(ox + 2 * CW * Z, oy); x.scale(-1, 1); x.drawImage(h.img, X0 * 4, Y0 * 4, CW * 4, CH * 4, 0, 0, CW * Z, CH * Z); x.restore();
      }
      return { issues, png: cv.toDataURL('image/png') };
    });
    fs.writeFileSync(path.join(OUT_DIR, 'rogue_daggers.png'), Buffer.from(r.png.split(',')[1], 'base64'));
    console.log(r.issues.length ? r.issues.length + ' issues: ' + r.issues.slice(0, 12).join(' | ') : 'all daggers reversed, the left one behind her');
    if (r.issues.length) failed = true;
  } finally {
    report(errors);
    await browser.close();
  }
  if (failed) process.exitCode = 1;
})().catch((e) => { console.error(e); process.exitCode = 1; });
