// Bake the Sky Battle art (tools/skyship_bake.html, docs/SKY_BATTLE.md): the heroes' ironclad as per-tile pieces, the
// galleon, boats and engine props as sprite frames, and the anchors -> assets/source/skyship/out/ (PNG pages + index);
// then `python tools/skyship.py pack` writes assets/tiles/skyship/. Needs the repo served (BASE_URL, default
// http://localhost:8123) and jsDelivr (three.js, for this tool only). On Windows a GPU helps:
// CHROMIUM_ARGS="--use-angle=d3d11 --enable-gpu --ignore-gpu-blocklist".
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const BASE = process.env.BASE_URL || 'http://localhost:8123';
const ROOT = path.resolve(__dirname, '..');
const png = (u) => Buffer.from(u.split(',')[1], 'base64');
(async () => {
  const browser = await chromium.launch({ args: (process.env.CHROMIUM_ARGS || '').split(' ').filter(Boolean) });
  const page = await browser.newPage();
  page.on('console', (m) => ['error', 'warning'].includes(m.type()) && console.log('[page]', m.text()));
  page.on('pageerror', (e) => console.log('[page]', e.message));
  await page.goto(`${BASE}/tools/skyship_bake.html`);
  await page.waitForFunction(() => window.SKYBAKE, null, { timeout: 60000 });
  const r = await page.evaluate(() => window.SKYBAKE.bakeAll(Number(new URLSearchParams(location.search).get('S')) || 1.5), null);
  const dir = path.join(ROOT, 'assets/source/skyship/out'); fs.mkdirSync(dir, { recursive: true });
  for (const f of fs.readdirSync(dir)) fs.unlinkSync(path.join(dir, f));
  const pages = r.pages.map((u, i) => { fs.writeFileSync(path.join(dir, `page_${i}.png`), png(u)); return `page_${i}`; });
  const { pages: _, ...rest } = r;
  fs.writeFileSync(path.join(dir, 'index.json'), JSON.stringify({ ...rest, pages }));
  console.log(`skyship: ${r.pieces.length} pieces on ${r.tiles.length / 3} tiles, ${Object.keys(r.sprites).length} sprites, ${pages.length} pages in ${r.ms} ms`);
  await browser.close();
})();
