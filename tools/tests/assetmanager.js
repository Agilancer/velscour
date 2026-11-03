// The asset manager page (tools/assetmanager/, docs in its index.html): loads the manifest, every section and view
// renders without page errors or sideways scrolling on a PC and a phone, thumbnails and previews load, search finds,
// a flag and a note survive a reload, and the exports download.
//   python3 -m http.server 8123 &   then   NODE_PATH=/opt/node22/lib/node_modules node tools/tests/assetmanager.js
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const BASE = (process.env.BASE_URL || 'http://localhost:8123') + '/tools/assetmanager/';
const CHROME = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const OUT = process.env.OUT_DIR || path.join(__dirname, 'out');
fs.mkdirSync(OUT, { recursive: true });
const M = JSON.parse(fs.readFileSync(path.join(__dirname, '../assetmanager/manifest.json'), 'utf8'));
const bad = [];
const check = (ok, msg) => { if (!ok) bad.push(msg); };

(async () => {
  const browser = await chromium.launch(fs.existsSync(CHROME) ? { executablePath: CHROME } : {});
  // the manifest itself
  check(M.items.length > 2000, `only ${M.items.length} assets`);
  for (const it of M.items) {
    if (!M.kinds[it.k]) bad.push(`${it.id}: unknown kind ${it.k}`);
    if (it.t && !M.sheets[it.t[0]]) bad.push(`${it.id}: thumbnail sheet ${it.t[0]} missing`);
    for (const f of it.f || []) if (!fs.existsSync(path.join(__dirname, '../..', M.files[f]))) bad.push(`${it.id}: missing file ${M.files[f]}`);
  }
  for (const sh of M.sheets) check(fs.existsSync(path.join(__dirname, '../assetmanager', sh.f.split('?')[0])), `missing ${sh.f}`);
  const placeholders = M.items.filter((it) => M.kinds[it.k].list === 'ph').length;
  console.log(`${M.items.length} assets, ${placeholders} placeholders, ${M.sheets.length} thumbnail sheets`);

  for (const [label, opt] of [['pc', { viewport: { width: 1440, height: 900 } }], ['phone', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }]]) {
    const ctx = await browser.newContext({ ...opt, acceptDownloads: true });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('requestfailed', (r) => errors.push('failed ' + r.url()));
    page.on('response', (r) => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
    await page.goto(BASE + '#/');
    await page.waitForSelector('.ov');
    const views = [...M.sections.map((s) => s.id), 'models', 'textures'];
    for (const id of views) {
      await page.goto(BASE + '#/s/' + id);
      await page.waitForTimeout(250);
      const r = await page.evaluate(() => ({ cards: document.querySelectorAll('[data-i]').length, wide: document.documentElement.scrollWidth - innerWidth, h1: document.querySelector('h1')?.textContent }));
      check(r.cards > 0, `${label} ${id}: no cards`);
      check(r.wide <= 0, `${label} ${id}: page is ${r.wide}px wider than the window`);
    }
    // thumbnails paint as they scroll in
    await page.goto(BASE + '#/s/monsters'); await page.waitForTimeout(600);
    check(await page.evaluate(() => [...document.querySelectorAll('.th[data-t]')].slice(0, 6).every((e) => e.style.backgroundImage)), `${label}: thumbnails not painted`);
    // search
    await page.fill('#q', 'velscour'); await page.waitForTimeout(400);
    check(await page.evaluate(() => document.querySelectorAll('[data-i]').length) > 0, `${label}: search found nothing`);
    await page.fill('#q', ''); await page.waitForTimeout(300);
    // a detail with frames: preview draws, flag + note persist
    await page.goto(BASE + '#/a/held_greatswords'); await page.waitForSelector('#stage canvas', { timeout: 8000 }).catch(() => bad.push(`${label}: preview did not draw`));
    await page.click('[data-frame="5"]'); await page.waitForTimeout(300);
    check((await page.textContent('#dims')).includes('6/50'), `${label}: frame pick did not redraw`);
    await page.click('[data-flag="needs"]'); await page.fill('#note', 'test note'); await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(OUT, `assetmanager_${label}_detail.png`) });
    await page.reload(); await page.waitForSelector('#note');
    check(await page.inputValue('#note') === 'test note', `${label}: note lost on reload`);
    check(await page.getAttribute('[data-flag="needs"]', 'aria-pressed') === 'true', `${label}: flag lost on reload`);
    await page.click('[data-close]'); await page.waitForTimeout(200);
    check(await page.isHidden('#detail'), `${label}: detail did not close`);
    // exports
    for (const act of ['md', 'csv', 'backup']) {
      await page.click('#menuBtn');
      const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 5000 }), page.click(`[data-act="${act}"]`)]).catch(() => [null]);
      if (!dl) { bad.push(`${label}: ${act} export did not download`); continue; }
      const text = fs.readFileSync(await dl.path(), 'utf8');
      if (act === 'md') check(text.includes('test note') && text.includes('## '), `${label}: to-do misses the note`);
      if (act === 'backup') check(JSON.parse(text).items.held_greatswords?.n === 'test note', `${label}: backup misses the note`);
    }
    await page.goto(BASE + '#/'); await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(OUT, `assetmanager_${label}_overview.png`) });
    for (const e of errors) bad.push(`${label}: ${e}`);
    await ctx.close();
  }
  await browser.close();
  console.log(bad.length ? `FAIL\n  ${bad.slice(0, 40).join('\n  ')}` : 'PASS');
  process.exit(bad.length ? 1 : 0);
})();
