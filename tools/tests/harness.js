// Shared helpers for the headless-browser test scripts in this folder.
//
// Run from the repo root with the game served on BASE_URL (default http://localhost:8123):
//   python3 -m http.server 8123 &
//   NODE_PATH=/opt/node22/lib/node_modules node tools/tests/skills.js
//
// Env:
//   BASE_URL       where the game is served (must serve the repo root, so /src/... imports resolve)
//   CHROMIUM_PATH  Chromium binary (default: the one preinstalled in Claude Code cloud containers)
//   OUT_DIR        where screenshots go (default tools/tests/out/, git-ignored)
//
// Every script drives the game through the debug hook main.js exposes: window.VELSCOUR = { G, game }.
// Inside page.evaluate() you can also `await import('/src/...')` any module, which returns the
// SAME module instances the game uses, so you can call internal functions directly.
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const BASE_URL = process.env.BASE_URL || 'http://localhost:8123';
const CHROMIUM_PATH = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const OUT_DIR = process.env.OUT_DIR || path.join(__dirname, 'out');
fs.mkdirSync(OUT_DIR, { recursive: true });

/** Launch Chromium and open the game. Returns { browser, ctx, page, errors, shot }. */
async function openGame({ width = 1280, height = 720, mobile = false } = {}) {
  const browser = await chromium.launch(fs.existsSync(CHROMIUM_PATH) ? { executablePath: CHROMIUM_PATH } : {});
  const ctx = await browser.newContext(mobile
    ? { viewport: { width, height }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
    : { viewport: { width, height } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push('[console] ' + m.text()); });
  page.on('pageerror', (e) => errors.push('[pageerror] ' + e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' | ')));
  await page.goto(BASE_URL + '/index.html');
  await page.waitForFunction(() => window.VELSCOUR && document.querySelector('#loading').classList.contains('hidden'), null, { timeout: 30000 });
  const shot = (name) => page.screenshot({ path: path.join(OUT_DIR, name + '.png') });
  return { browser, ctx, page, errors, shot };
}

/** Print collected page errors (or NO ERRORS) and set a failing exit code if there were any. */
function report(errors, limit = 40) {
  if (errors.length) {
    console.log(errors.slice(0, limit).join('\n'));
    process.exitCode = 1;
  } else console.log('NO ERRORS');
}

const ALL_CLASSES = ['paladin', 'ranger', 'wizard', 'necromancer', 'barbarian', 'dragoon', 'totem_master', 'death_knight',
  'arcane_sorcerer', 'carrion_witch', 'bard', 'slime_lord', 'boomerang_knight', 'lancer', 'dragon_knight', 'gunner'];

module.exports = { openGame, report, ALL_CLASSES, BASE_URL, OUT_DIR };
