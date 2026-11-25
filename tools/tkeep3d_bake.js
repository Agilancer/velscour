// Bake Tessariel's Keep (tools/tkeep3d.html, layout in src/world/tkeep.js, docs/TESSARIELS_KEEP.md): the great hall's
// per-tile pieces and the trophies' sprites -> assets/source/tkeep/out/ (PNG pages + index.json); then
// `python tools/tkeep3d.py pack` writes assets/tiles/tkeep/. Needs the repo served (python -m http.server 8123; BASE_URL)
// and the trophies' models: clones of the user's repos vesperwrithe and bm (TKEEP_VW / TKEEP_BM, default
// ../agilancer/<repo> beside this repo, or /home/user/agilancer/<repo>), copied into tools/tests/out/tkeep_src/.
//   node tools/tkeep3d_bake.js                       # bake
//   node tools/tkeep3d_bake.js preview [x,y[,w,h,S]] # a framed view -> tools/tests/out/tkeep3d_preview_<x>_<y>.png
//   node tools/tkeep3d_bake.js trophies              # every trophy sprite in a row -> tools/tests/out/tkeep3d_trophies.png
//   node tools/tkeep3d_bake.js front                 # only the mask of the Flame brazier's near half (the pieces' S)
//   node tools/tkeep3d_bake.js elders [ids]          # only the Elders' sprites (or those trophies) -> out/elders.png +
//                                                    # out/elders.json; then `python tools/tkeep3d.py elders` (needs bm only)
// Both the bake and `front` write assets/tiles/tkeep/brazier_front.json: which pixels of the pieces the game draws again
// over the Sacred Flame (the near rim and crown blades; gfx/keepart.js brazierFront).
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const BASE = process.env.BASE_URL || 'http://localhost:8123';
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'tools/tests/out');
const png = (u) => Buffer.from(u.split(',')[1], 'base64');
const writeFront = (f) => {
  if (!f) { console.warn('no brazier front mask'); return; }
  const file = path.join(ROOT, 'assets/tiles/tkeep/brazier_front.json');
  fs.writeFileSync(file, JSON.stringify(f));
  console.log(`brazier front: ${f.w}x${f.h} px at S ${f.S}, ${f.tiles.length} tiles -> ${path.relative(ROOT, file)}`);
};
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
  const front = args[0] === 'front', elders = args[0] === 'elders', models = front ? 0 : await copyModels();
  if (!front) console.log('trophy models:', models);
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--enable-unsafe-swiftshader', ...(process.env.CHROMIUM_ARGS || '').split(' ').filter(Boolean)] });
  const page = await browser.newPage();
  page.on('console', (m) => ['error', 'warning'].includes(m.type()) && console.log('[page]', m.text()));
  page.on('pageerror', (e) => console.log('[page]', e.message));
  await page.goto(`${BASE}/tools/tkeep3d.html`);
  await page.waitForFunction(() => window.TKEEP, null, { timeout: 60000 });
  if (front) {
    const S = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/tiles/tkeep/index.json'), 'utf8')).S;   // the pieces' own scale
    writeFront(await page.evaluate((S) => window.TKEEP.bakeFrontOnly(S), S));
  } else if (elders) {
    const ids = args[1] ? args[1].split(',') : null;
    const r = await page.evaluate((ids) => window.TKEEP.bakeTrophies(ids), ids);
    const dir = path.join(ROOT, 'assets/source/tkeep/out'); fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'elders.png'), png(r.page));
    fs.writeFileSync(path.join(dir, 'elders.json'), JSON.stringify({ sprites: r.sprites }));
    console.log('elders:', Object.entries(r.sprites).map(([k, v]) => `${k} ${v.f[0][3]}x${v.f[0][4]}`).join(', '), '-> assets/source/tkeep/out/elders.*');
  } else if (args[0] === 'preview') {
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
    const { pages: _, front: fr, ...rest } = r;
    writeFront(fr);
    fs.writeFileSync(path.join(dir, 'index.json'), JSON.stringify({ ...rest, pages }));
    console.log(`tkeep: ${r.pieces.length} pieces, ${Object.keys(r.sprites).length} sprites, ${pages.length} pages in ${r.ms} ms`);
  }
  await browser.close();
})();
