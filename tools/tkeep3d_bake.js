// Bake Tessariel's Keep (tools/tkeep3d.html, layout in src/world/tkeep.js, docs/TESSARIELS_KEEP.md): the great hall's
// per-tile pieces and the trophies' sprites -> assets/source/tkeep/out/ (PNG pages + index.json); then
// `python tools/tkeep3d.py pack` writes assets/tiles/tkeep/. Needs the repo served (python -m http.server 8123; BASE_URL)
// and the trophies' models: clones of the user's repos vesperwrithe and bm (TKEEP_VW / TKEEP_BM, default
// ../agilancer/<repo> beside this repo, or /home/user/agilancer/<repo>), copied into tools/tests/out/tkeep_src/.
//   node tools/tkeep3d_bake.js                       # bake
//   node tools/tkeep3d_bake.js preview [x,y[,w,h,S]] # a framed view -> tools/tests/out/tkeep3d_preview_<x>_<y>.png
//   node tools/tkeep3d_bake.js trophies              # every trophy sprite in a row -> tools/tests/out/tkeep3d_trophies.png
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const BASE = process.env.BASE_URL || 'http://localhost:8123';
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'tools/tests/out');
const png = (u) => Buffer.from(u.split(',')[1], 'base64');
const repo = (env, name) => [process.env[env], path.join(ROOT, '..', 'agilancer', name), path.join('/home/user/agilancer', name)].find((d) => d && fs.existsSync(d));

function copyModels() {
  const src = path.join(OUT, 'tkeep_src'), vw = repo('TKEEP_VW', 'vesperwrithe'), bm = repo('TKEEP_BM', 'bm');
  fs.mkdirSync(path.join(src, 'vw'), { recursive: true }); fs.mkdirSync(path.join(src, 'bm'), { recursive: true });
  const find = (dir, name) => { for (const d of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, d.name); if (d.isDirectory()) { const r = find(p, name); if (r) return r; } else if (d.name === name) return p; } return null; };
  let n = 0;
  return import('../src/data/keepart.js').then(({ TROPHY_ART }) => {
    for (const T of TROPHY_ART) {
      const [from, file] = T.model.split('/'), root = from === 'vw' ? vw : bm, dst = path.join(src, from, file);
      if (fs.existsSync(dst)) { n++; continue; }
      const p = root && find(path.join(root, from === 'vw' ? 'assets/game' : 'art/dragons/rigged'), file);
      if (p && fs.statSync(p).size > 1000) { fs.copyFileSync(p, dst); n++; } else console.warn('no model for', T.id, file);
    }
    return n;
  });
}

(async () => {
  const args = process.argv.slice(2);
  fs.mkdirSync(OUT, { recursive: true });
  const models = await copyModels();
  console.log('trophy models:', models);
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--enable-unsafe-swiftshader', ...(process.env.CHROMIUM_ARGS || '').split(' ').filter(Boolean)] });
  const page = await browser.newPage();
  page.on('console', (m) => ['error', 'warning'].includes(m.type()) && console.log('[page]', m.text()));
  page.on('pageerror', (e) => console.log('[page]', e.message));
  await page.goto(`${BASE}/tools/tkeep3d.html`);
  await page.waitForFunction(() => window.TKEEP, null, { timeout: 60000 });
  if (args[0] === 'preview') {
    const [x, y, w, h, S] = (args[1] || '21,21').split(',').map(Number);
    const u = await page.evaluate(([x, y, w, h, S]) => window.TKEEP.preview(x, y, w || 1600, h || 1000, S || 0.6), [x, y, w, h, S]);
    const f = path.join(OUT, `tkeep3d_preview_${x}_${y}.png`); fs.writeFileSync(f, png(u)); console.log('preview', f);
  } else if (args[0] === 'trophies') {
    const r = await page.evaluate(() => window.TKEEP.trophySheet());
    for (const t of r) if (t.url) fs.writeFileSync(path.join(OUT, `tkeep3d_trophy_${t.id}.png`), png(t.url)); else console.log('trophy', t.id, t.err);
    console.log('trophies', r.filter((t) => t.url).map((t) => `${t.id} ${t.w}x${t.h}`).join(', '));
  } else {
    const r = await page.evaluate(() => window.TKEEP.bakeAll(1.5, 2));
    const dir = path.join(ROOT, 'assets/source/tkeep/out'); fs.mkdirSync(dir, { recursive: true });
    for (const f of fs.readdirSync(dir)) fs.unlinkSync(path.join(dir, f));
    const pages = r.pages.map((u, i) => { fs.writeFileSync(path.join(dir, `page_${i}.png`), png(u)); return `page_${i}`; });
    const { pages: _, ...rest } = r;
    fs.writeFileSync(path.join(dir, 'index.json'), JSON.stringify({ ...rest, pages }));
    console.log(`tkeep: ${r.pieces.length} pieces, ${Object.keys(r.sprites).length} sprites, ${pages.length} pages in ${r.ms} ms`);
  }
  await browser.close();
})();
