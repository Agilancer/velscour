// Unreadable saves are never written over (src/game/save.js): the title says so, nothing is written at boot, the first
// new save sets the old data aside (localStorage, or IndexedDB when that's full) and Hero backups downloads it byte for
// byte. With no room anywhere the game refuses to save and warns. JSON that isn't a hero list counts as unreadable.
// node tools/tests/savesafe.js
const fs = require('fs');
const { openGame, report } = require('./harness');
const KEY = 'velscour_saves_v1';
const BROKEN = '[{"id":"abc","name":"Lost Hero","classId":"paladin","level":40,"gold":99';   // truncated mid-write
const fails = [], errs = [];
const check = (ok, msg) => { console.log((ok ? 'ok   ' : 'FAIL ') + msg); if (!ok) fails.push(msg); };
const ready = (page) => page.waitForFunction(() => window.VELSCOUR && document.querySelector('#loading').classList.contains('hidden'), null, { timeout: 30000 });
async function boot(raw, init) {
  const d = await openGame();
  await d.page.evaluate(([k, v]) => localStorage.setItem(k, v), [KEY, raw]);
  if (init) await d.page.addInitScript(init);
  await d.page.reload(); await ready(d.page);
  return d;
}
const newHero = (page) => page.evaluate(async () => { const { game, G } = window.VELSCOUR; await game.newChar('wizard', 'Fresh'); game.autosave(); return G.char.id; });
const raws = (page) => page.evaluate(async () => (await import('/src/game/save.js')).unreadableSaves());

(async () => {
  // 1. truncated saves: a notice, untouched at boot, set aside on the first save, downloadable
  let d = await boot(BROKEN);
  try {
    await d.page.waitForSelector('.dialog-box:has-text("could not be read")', { timeout: 5000 }).catch(() => {});
    check(!!await d.page.$('.dialog-box:has-text("could not be read")'), 'the title says the saves could not be read');
    await d.shot('savesafe_notice');
    check(await d.page.evaluate((k) => localStorage.getItem(k), KEY) === BROKEN, 'nothing was written over them at boot');
    await d.page.click('.dialog-box button:has-text("OK")');
    const id = await newHero(d.page);
    const now = await d.page.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY);
    check(Array.isArray(now) && now.length === 1 && now[0].id === id, 'the new hero saved');
    let r = await raws(d.page);
    check(r.length === 1 && r[0].text === BROKEN, 'the old data was set aside first, exactly');
    await d.page.evaluate(() => window.VELSCOUR.game.autosave());
    check((await raws(d.page)).length === 1, 'later saves do not set it aside again');
    await d.page.evaluate(() => window.VELSCOUR.game.quitToTitle());
    await d.page.click('.title-menu button:has-text("Settings")');
    await d.page.click('[data-backups]');
    await d.page.waitForSelector('.backup-row:has-text("Unreadable")');
    await d.shot('savesafe_backups');
    const [dl] = await Promise.all([d.page.waitForEvent('download'), d.page.click('.backup-row:has-text("Unreadable") button')]);
    const text = fs.readFileSync(await dl.path(), 'utf8');
    check(text === BROKEN && /velscour-unreadable-saves-.*\.json/.test(dl.suggestedFilename()), `Download gives the data byte for byte (${dl.suggestedFilename()})`);
    errs.push(...d.errors);
  } finally { await d.browser.close(); }

  // 2. localStorage has no room for the copy: it goes to IndexedDB, and the save waits until it's there
  d = await boot(BROKEN, () => {
    const set = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) { if (String(k).includes('_unreadable_')) throw new DOMException('full', 'QuotaExceededError'); return set.call(this, k, v); };
  });
  try {
    await d.page.click('.dialog-box button:has-text("OK")').catch(() => {});
    await newHero(d.page);
    check(await d.page.evaluate((k) => localStorage.getItem(k), KEY) === BROKEN, 'no room: the first save waits, the old data untouched');
    await d.page.waitForTimeout(500);
    await d.page.evaluate(() => window.VELSCOUR.game.autosave());
    const r = await raws(d.page);
    const now = await d.page.evaluate((k) => localStorage.getItem(k), KEY);
    check(r.length === 1 && r[0].text === BROKEN && now !== BROKEN && JSON.parse(now).length === 1, 'no room: kept in IndexedDB, then the next save went through');
    errs.push(...d.errors);
  } finally { await d.browser.close(); }

  // 3. no room anywhere: the game refuses to save and warns; the old data stays
  d = await boot(BROKEN, () => {
    Object.defineProperty(window, 'indexedDB', { value: undefined });
    const set = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) { if (String(k).includes('_unreadable_')) throw new DOMException('full', 'QuotaExceededError'); return set.call(this, k, v); };
  });
  try {
    await d.page.click('.dialog-box button:has-text("OK")').catch(() => {});
    await newHero(d.page);
    await d.page.waitForTimeout(300);
    await d.page.evaluate(() => window.VELSCOUR.game.autosave());
    check(await d.page.evaluate((k) => localStorage.getItem(k), KEY) === BROKEN, 'nowhere to keep it: never written over');
    await d.page.waitForSelector('.dialog-box:has-text("Not saving")', { timeout: 5000 }).catch(() => {});
    check(!!await d.page.$('.dialog-box:has-text("Not saving")'), 'nowhere to keep it: the player is warned');
    await d.shot('savesafe_blocked');
    errs.push(...d.errors.filter((e) => !/IndexedDB/.test(e)));
  } finally { await d.browser.close(); }

  // 4. JSON that isn't a hero list counts as unreadable too; readable saves are never set aside
  d = await boot('{"heroes":[1,2,3]}');
  try {
    await d.page.click('.dialog-box button:has-text("OK")').catch(() => {});
    await newHero(d.page);
    const r = await raws(d.page);
    check(r.length === 1 && r[0].text === '{"heroes":[1,2,3]}', 'a non-list was set aside before the first save');
    errs.push(...d.errors);
  } finally { await d.browser.close(); }
  d = await openGame();
  try {
    await newHero(d.page); await newHero(d.page);
    check(!(await raws(d.page)).length && !await d.page.$('.dialog-box:has-text("could not be read")'), 'normal saves: no notice, nothing set aside');
    errs.push(...d.errors);
  } finally { await d.browser.close(); }

  console.log(fails.length ? `${fails.length} FAILED` : 'ALL PASSED');
  if (fails.length) process.exitCode = 1;
  report(errs);
})();
