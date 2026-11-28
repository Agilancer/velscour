// Exports every skill, talent and class ultimate with the icon the game draws for it today, for the ChatGPT skill
// icon kit (tools/chatgpt_skill_icons.py, docs/CHATGPT_SKILL_ICONS.md). Each icon is drawn by the game's own
// skillIcon()/talentIcon()/ultimateIcon() at 128 px and sorted: 'art' when the icon is painted art (a summon showing
// its painted creature, the Slime Lord's Glymmora slimes, a painted sheet cell in assets/ui/skills/), 'code' otherwise.
//   python3 -m http.server 8123 &      (repo root)
//   NODE_PATH=/opt/node22/lib/node_modules node tools/chatgpt_skill_icons_export.js [outdir]
// Writes <outdir>/icons.json and <outdir>/now/<id>.png (default tools/tests/out/skill_icons_export/).
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const BASE = process.env.BASE_URL || 'http://localhost:8123';
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const OUT = path.resolve(process.argv[2] || path.join(__dirname, 'tests', 'out', 'skill_icons_export'));

(async () => {
  const browser = await chromium.launch(fs.existsSync(CHROME) ? { executablePath: CHROME } : {});
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(BASE + '/index.html');
  await page.waitForFunction(() => window.VELSCOUR && window.VELSCOUR.G, null, { timeout: 60000 });
  const data = await page.evaluate(async () => {
    const im = (p) => import(p);
    const [icons, { CLASS_SKILLS, describe }, { CLASSES }, { CLASS_TALENTS }, { ULTIMATES }, { SUMMONS }, { ELEM }, { classSprite }] = await Promise.all([
      im('/src/ui/icons.js'), im('/src/data/skills.js'), im('/src/data/classes.js'), im('/src/data/talents.js'), im('/src/game/smite.js'),
      im('/src/data/summons.js'), im('/src/gfx/vfx.js'), im('/src/core/assets.js')]);
    const { enemyImage } = await im('/src/core/enemyart.js');
    const { slimeIconParts } = await im('/src/gfx/slimeart.js');
    const text = (h) => String(h || '').replace(/<br\s*\/?>/g, ' ').replace(/<[^>]+>/g, '').replace(/&#9835;/g, '♫').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim();
    // what a summon skill's icon shows (mirrors the 'summon' case of skillIcon)
    const summonArt = (sk) => {
      const def = SUMMONS[sk.m.sum];
      if (def && (def.slime || def.court)) return slimeIconParts(def) ? ['art', 'the Slime Lord\'s painted Glymmora slimes'] : ['loading', ''];
      const look = def && def.look, art = look && (look.icon || (Array.isArray(look.art) ? look.art[0] : look.art));
      if (art) return enemyImage(art) ? ['art', `painted creature art (${art})`] : ['loading', ''];
      if (look && look.cls) return ['code', 'a shrunk copy of the hero sprite'];
      if (look && look.sprite) return ['code', 'an ASCII pixel-art fallback'];
      return ['code', 'the fallback skeleton'];
    };
    const sheetOf = (cls, kind) => new Promise((res) => { const i = new Image(); i.onload = () => res(true); i.onerror = () => res(false); i.src = `assets/ui/skills/${cls}_${kind}.png`; });
    // wait for painted summon art (it loads on first use)
    const all = Object.values(CLASS_SKILLS).flat();
    for (let t = 0; t < 60; t++) {
      if (!all.filter((s) => s.kind === 'summon').some((s) => summonArt(s)[0] === 'loading')) break;
      await new Promise((r) => setTimeout(r, 500));
    }
    for (const c of Object.keys(CLASS_SKILLS)) await icons.preloadSkillSheets(c);
    const png = (cv) => cv.toDataURL('image/png');
    const out = { classes: [], skills: [], talents: [], ultimates: [], elements: {} };
    for (const [k, e] of Object.entries(ELEM)) out.elements[k] = { name: e.name, core: e.core, glow: e.glow, dark: e.dark };
    for (const [cls, list] of Object.entries(CLASS_SKILLS)) {
      const C = CLASSES[cls], sheets = { skills: await sheetOf(cls, 'skills'), talents: await sheetOf(cls, 'talents') };
      out.classes.push({ id: cls, name: C.name, trees: C.trees, desc: text(C.desc || ''), portrait: png(classSprite(cls, 120)) });
      for (const sk of list) {
        let [status, why] = sk.kind === 'summon' ? summonArt(sk) : ['code', ''];
        if (sheets.skills) [status, why] = ['art', 'painted cell in assets/ui/skills/' + cls + '_skills.png'];
        if (status === 'loading') [status, why] = ['code', 'painted art failed to load'];
        out.skills.push({ id: sk.id, cls, className: C.name, tree: sk.tree, treeName: C.trees[sk.tree], slot: sk.idx, row: sk.row, col: sk.col, reqLevel: sk.reqLevel,
          name: sk.name, kind: sk.kind, el: sk.el, fx: sk.fx, summon: sk.m.sum || null, summonName: sk.m.sum ? (SUMMONS[sk.m.sum]?.name || sk.m.sum) : null,
          desc: text(describe(sk, 1)), status, why: why || (sk.kind === 'summon' ? '' : 'element gradient and a shape drawn in code'), png: png(icons.skillIcon(sk, 128)) });
      }
      (CLASS_TALENTS[cls] || []).forEach((b) => b.nodes.forEach((n, i) => {
        out.talents.push({ id: n.id, cls, className: C.name, branch: b.index, branchName: b.name, slot: i, row: n.row, choice: n.choice || null, name: n.name, el: n.el || b.el,
          desc: text(typeof n.desc === 'function' ? n.desc(1) : n.desc), status: sheets.talents ? 'art' : 'code', png: png(icons.talentIcon(n, 128)) });
      }));
      const U = ULTIMATES[cls];
      if (U) out.ultimates.push({ id: 'ult.' + cls, cls, className: C.name, name: U.name, el: U.el, desc: U.desc, status: 'code', png: png(icons.ultimateIcon(cls, 128)) });
    }
    return out;
  });
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(path.join(OUT, 'now'), { recursive: true });
  const save = (id, url) => { const f = `now/${id}.png`; fs.writeFileSync(path.join(OUT, f), Buffer.from(url.split(',')[1], 'base64')); return f; };
  for (const c of data.classes) c.portrait = save('class_' + c.id, c.portrait);
  for (const k of ['skills', 'talents', 'ultimates']) for (const s of data[k]) s.png = save(s.id, s.png);
  fs.writeFileSync(path.join(OUT, 'icons.json'), JSON.stringify(data, null, 1));
  const n = (k, st) => data[k].filter((s) => s.status === st).length;
  console.log(`skills ${data.skills.length} (art ${n('skills', 'art')}, code ${n('skills', 'code')}), talents ${data.talents.length} (art ${n('talents', 'art')}), ultimates ${data.ultimates.length} -> ${OUT}`);
  if (errors.length) console.log('page errors:', errors.slice(0, 5));
  await browser.close();
})();
