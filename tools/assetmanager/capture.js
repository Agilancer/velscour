// Renders the placeholders the game draws in code (skill icons, sigils, the Abyssal Key, the ASCII Treasure Imp, emotes,
// the code-built 3D phoenix, totem, hammers and boomerangs) with the game's own functions, into WebP sheets in
// tools/assetmanager/captures/ with captures.json. build.mjs uses them as previews for those placeholder cards.
// Rerun when those draw functions change, then rebuild:
//   python3 -m http.server 8123 &      (repo root)
//   NODE_PATH=/opt/node22/lib/node_modules node tools/assetmanager/capture.js && node tools/assetmanager/build.mjs
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const BASE = process.env.BASE_URL || 'http://localhost:8123';
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const OUT = path.join(__dirname, 'captures');

(async () => {
  const browser = await chromium.launch(fs.existsSync(CHROME) ? { executablePath: CHROME } : {});
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(BASE + '/index.html');
  await page.waitForFunction(() => window.VELSCOUR && window.VELSCOUR.G, null, { timeout: 60000 });
  await page.waitForTimeout(1500);
  const sheets = await page.evaluate(async () => {
    const im = (p) => import(p);
    const [{ pixelSprite, gemIcon }, { ARCH }, loot, { sheetIcon }, { skillIcon }, { CLASS_SKILLS }, { GEMS }, emotes, ph, tot, ham, rang] = await Promise.all([
      im('/src/gfx/pixelart.js'), im('/src/data/enemies.js'), im('/src/game/loot.js'), im('/src/gfx/notation.js'), im('/src/ui/icons.js'),
      im('/src/data/skills.js'), im('/src/data/items.js'), im('/src/gfx/emotes.js'), im('/src/gfx/phoenix3d.js'), im('/src/gfx/totem3d.js'),
      im('/src/gfx/hammer3d.js'), im('/src/gfx/boomerang3d.js')]);
    const out = {};
    // lay n cells of size c on a grid, each drawn by fn(ctx, i, c) (or a canvas to centre)
    const sheet = (key, n, c, fn, names) => {
      const cols = Math.min(n, 12), rows = Math.ceil(n / cols), cv = document.createElement('canvas');
      cv.width = cols * c; cv.height = rows * c;
      const x = cv.getContext('2d'), cells = [];
      for (let i = 0; i < n; i++) {
        const ox = (i % cols) * c, oy = Math.floor(i / cols) * c;
        x.save(); x.translate(ox, oy); x.beginPath(); x.rect(0, 0, c, c); x.clip();
        const r = fn(x, i, c);
        if (r && r.width) { const k = Math.min(1, (c - 4) / Math.max(r.width, r.height)); x.imageSmoothingEnabled = false; x.drawImage(r, (c - r.width * k) / 2, (c - r.height * k) / 2, r.width * k, r.height * k); }
        x.restore(); cells.push([ox, oy, c, c]);
      }
      out[key] = { png: cv.toDataURL('image/webp', 0.9), cells, names: names || [] };
    };
    sheet('imp', 1, 96, () => pixelSprite('imp', ARCH.imp.pal, 5), ['Treasure Imp']);
    sheet('sigils', 20, 64, (x, i) => loot.sigilIcon(i, 64), Array.from({ length: 20 }, (_, i) => 'Rank ' + (i + 1)));
    sheet('key', 1, 64, () => loot.keyIcon(64));
    sheet('sealed', 1, 64, () => loot.itemIcon({ sealed: true }, 64));
    sheet('sheet', 3, 64, (x, i) => sheetIcon([{ text: '' }, { text: 'e4 d4 c4' }, { text: 'e4 d4 c4', locked: true }][i], 64), ['Blank', 'Written', 'Locked']);
    const gems = Object.keys(GEMS).filter((k) => !GEMS[k].sigil).slice(0, 3);
    sheet('gemtiers', gems.length * 4, 64, (x, i) => { const g = gems[Math.floor(i / 4)]; return gemIcon(g, GEMS[g].color, 6 + (i % 4), 64); });
    for (const [c, list] of Object.entries(CLASS_SKILLS)) {
      const code = list.filter((s) => s.kind !== 'summon');
      sheet('skills_' + c, code.length, 64, (x, i) => skillIcon(code[i], 64), code.map((s) => s.name));
    }
    sheet('emotes', emotes.EMOTE_ICONS.length, 48, (x, i) => { const e = emotes.emoteIcon(emotes.EMOTE_ICONS[i]); const k = 2; const cv = document.createElement('canvas'); cv.width = e.width * k; cv.height = e.height * k; const cx = cv.getContext('2d'); cx.imageSmoothingEnabled = false; cx.drawImage(e, 0, 0, cv.width, cv.height); return cv; }, emotes.EMOTE_ICONS);
    sheet('phoenix', 8, 192, (x, i, c) => { ph.drawPhoenix3D(x, c / 2, c / 2, { yaw: (i / 8) * Math.PI * 2, flap: i * 0.7, amp: 1, t: i * 0.3, k: 2.6, heat: 0.6 }); });
    sheet('totem', 4, 192, (x, i, c) => { tot.drawTotem3D(x, c / 2, c - 8, ['bear', 'wolf', 'eagle', 'serpent'].slice(0, 4 - (i % 2)), { k: 0.85, rise: 1, fold: i < 2 ? 0 : 1, glow: [1, 1, 1, 1], rune: 1 }); });
    sheet('hammer', 8, 96, (x, i, c) => { ham.drawHammer3D(x, c / 2, c / 2, { head: (i / 8) * Math.PI * 2, spin: i * 0.8, size: 2.6, E: ['holy', 'fire', 'cold', 'light'][i % 4] }); });
    const skins = Object.keys(rang.RANG_SKINS);
    sheet('boomerang', skins.length, 96, (x, i, c) => { rang.drawRang3D(x, c / 2, c / 2, { skin: rang.RANG_SKINS[skins[i]], size: 2.4, spin: 0.6, head: 0.3, bank: 0.9 }); }, skins);
    return out;
  });
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  const index = {};
  for (const [key, s] of Object.entries(sheets)) {
    const f = `tools/assetmanager/captures/${key}.webp`;
    fs.writeFileSync(path.join(__dirname, '..', '..', f), Buffer.from(s.png.split(',')[1], 'base64'));
    index[key] = { f, cells: s.cells, names: s.names };
  }
  fs.writeFileSync(path.join(OUT, 'captures.json'), JSON.stringify(index, null, 1));
  console.log(`${Object.keys(index).length} capture sheets: ${Object.entries(index).map(([k, v]) => `${k} ${v.cells.length}`).join(', ')}`);
  if (errors.length) console.log('page errors:\n  ' + errors.slice(0, 10).join('\n  '));
  await browser.close();
})();
