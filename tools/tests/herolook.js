// Hero look check: every gear combination loads and shows a full hero, and the hero stays visible in play.
//  1. Every class: all 18 armors x every finish, all helmets x every finish, the armor's own silhouette kept
//     (a swap never loses pixels), icons and the portrait; items of every rarity and level, and old saved looks.
//  2. Soak: a new hero on auto-play (~30x speed); every game second the hero's image must exist and be opaque,
//     and the hero must be drawn at full alpha and size.
//   node tools/tests/herolook.js [classes|all] [soak class] [minutes]
//   node tools/tests/herolook.js all death_knight 10
const { openGame, report, ALL_CLASSES } = require('./harness');
const arg = process.argv[2] || 'all';
const CLASSES = arg === 'all' ? ALL_CLASSES : arg === 'none' ? [] : arg.split(',');
const SOAK = process.argv[3] || 'death_knight', MINUTES = +(process.argv[4] || 8);

(async () => {
  const { browser, page, errors } = await openGame({ width: 1280, height: 800 });
  let failed = false;
  for (const cls of CLASSES) {
    const r = await page.evaluate(async (cls) => {
      const { game } = window.VELSCOUR;
      await game.loadClassPack(cls);
      const ga = await import('/src/core/gearart.js');
      const { PALETTES } = await import('/src/data/gear.js');
      const { rollItem } = await import('/src/data/items.js');
      const meta = ga.gearMeta(cls), issues = [];
      if (!meta) return { issues: ['no gear art'] };
      const cv = document.createElement('canvas'); cv.width = meta.frame[0]; cv.height = meta.frame[1];
      const x = cv.getContext('2d', { willReadFrequently: true });
      const opaque = (img) => {
        x.clearRect(0, 0, cv.width, cv.height); x.drawImage(img, 0, 0);
        const d = x.getImageData(0, 0, cv.width, cv.height).data; let n = 0;
        for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++;
        return n;
      };
      const body = (a, f, rarity = Math.floor((a - 1) / 2)) => ({ type: 'gear', slot: 'body', rarity, ilvl: 40, look: [a, f, -1, 2] });
      const head = (d, f, rarity = d - 1) => ({ type: 'gear', slot: 'head', rarity, ilvl: 40, look: [d, f, -1, 2] });
      let looks = 0;
      for (let a = 1; a <= meta.armor.n; a++) {
        const base = opaque(ga.heroLook(cls, body(a, 0), null));
        if (base < 2500) issues.push(`armor ${a}: only ${base} px`);
        for (let f = 0; f < PALETTES.length; f++) {
          const img = ga.heroLook(cls, body(a, f), null); looks++;
          if (!img) { issues.push(`armor ${a} finish ${f}: no image`); continue; }
          const n = opaque(img);
          if (n !== base) issues.push(`armor ${a} finish ${f}: ${n} px, not ${base}`);
        }
        if (!ga.gearIcon(body(a, 3))) issues.push(`armor ${a}: no icon`);
      }
      const designs = (await fetch('/assets/sprites/gear/helmets/index.json').then((q) => q.json())).designs;
      const bare = opaque(ga.heroLook(cls, body(1, 0), null));
      for (const d of designs) for (let f = 0; f < PALETTES.length; f++) {
        const img = ga.heroLook(cls, body(1, 0), head(d.id, f)); looks++;
        if (!img) { issues.push(`helmet ${d.id} finish ${f}: no image`); continue; }
        if (opaque(img) < bare) issues.push(`helmet ${d.id} finish ${f}: hero lost pixels`);
        if (f === 1 && !ga.gearIcon(head(d.id, f))) issues.push(`helmet ${d.id}: no icon`);
      }
      // items as the game rolls them, old saved looks, and the portrait
      for (let rar = 0; rar < 6; rar++) for (const lvl of [1, 30, 90]) for (const slot of ['body', 'head']) {
        for (const legacy of [null, [80, 120, 19], [3, 47, -1], [11, 2, 4, 2], [99, 999, 99, 2]]) {
          const it = rollItem(lvl, { slot, rarity: rar });
          if (legacy) it.look = legacy.slice();
          const l = ga.itemLook(it); looks++;
          const ok = l && l[3] === 2 && l[0] >= 1 && PALETTES[l[1]] && (slot === 'head' ? l[0] <= designs.length : l[0] <= meta.armor.n);
          if (!ok) { issues.push(`${slot} r${rar} i${lvl} look ${JSON.stringify(legacy)} -> ${JSON.stringify(l)}`); continue; }
          const img = slot === 'body' ? ga.heroLook(cls, it, null) : ga.heroLook(cls, body(1, 0), it);
          if (!img || opaque(img) < 2500) issues.push(`${slot} r${rar} i${lvl} look ${JSON.stringify(l)}: hero missing`);
        }
      }
      if (!ga.heroPortrait(cls, body(12, 5), head(5, 5), 130, 260)) issues.push('no portrait');
      return { looks, issues };
    }, cls);
    console.log(`${cls}: ${r.looks || 0} looks, ${r.issues.length ? r.issues.length + ' issues: ' + r.issues.slice(0, 12).join(' | ') : 'all load'}`);
    if (r.issues.length) failed = true;
  }

  if (SOAK !== 'none' && MINUTES > 0) {
    await page.evaluate(async (cls) => {
      const { game } = window.VELSCOUR;
      await game.newChar(cls, 'Lookbot');
      const { Auto } = await import('/src/game/autoplay.js');
      Auto.toggle(true);
    }, SOAK);
    for (let min = 1; min <= MINUTES; min++) {
      const res = await page.evaluate(async () => {
        const { G, game } = window.VELSCOUR;
        const ga = await import('/src/core/gearart.js');
        const bad = [], seen = new WeakMap(), cv = document.createElement('canvas'), x = cv.getContext('2d', { willReadFrequently: true });
        const opaque = (img) => {
          if (seen.has(img)) return seen.get(img);
          cv.width = img.width; cv.height = img.height; x.drawImage(img, 0, 0);
          const d = x.getImageData(0, 0, img.width, img.height).data; let n = 0;
          for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++;
          seen.set(img, n); return n;
        };
        const t0 = performance.now(); let sim = 0, next = 0;
        while (sim < 60 && performance.now() - t0 < 60000) {
          for (let i = 0; i < 15; i++) {
            if (G.mode !== 'game' || !G.world) break;
            G.dt = 1 / 30; G.time += G.dt; G.frame++; game.update(1 / 30); sim += 1 / 30;
          }
          if (sim >= next && G.mode === 'game' && G.world && G.player && !G.player.dead) {
            next = sim + 1;
            const p = G.player, eq = G.char.equip, a = p.artFrame();
            const where0 = () => `${G.world.kind === 'town' ? 'town' : 'D' + G.world.depth} t=${Math.round(sim)} buffs=${p.buffs.map((b) => b.id || b.name).join(',')}`;
            // render with drawImage watched: the hero's image (or its tinted copy) must reach the screen, sized and opaque
            const proto = CanvasRenderingContext2D.prototype, orig = proto.drawImage, drawn = [];
            proto.drawImage = function (img, ...r) {
              if (a && (img === a.img || (img.width === a.img.width && img.height === a.img.height && r.length >= 8 && img.constructor !== Image))) { // the image or its tinted copy
                const t = this.getTransform(), dw = r.length >= 8 ? r[6] : r.length === 4 ? r[2] : img.width;
                drawn.push({ alpha: this.globalAlpha, w: Math.abs(dw * t.a), x: t.e, y: t.f, op: this.globalCompositeOperation, cw: this.canvas.width, ch: this.canvas.height });
              }
              return orig.call(this, img, ...r);
            };
            try { game.render(); } finally { proto.drawImage = orig; }
            const main = drawn.find((d) => d.op === 'source-over');
            if (a && (!main || main.alpha < 0.5 || main.w < 20 || main.x < 0 || main.y < 0 || main.x > main.cw || main.y > main.ch)) {
              bad.push(`not on screen: ${JSON.stringify(drawn.slice(0, 3))} ` + where0());
            }
            const look = (it) => it ? JSON.stringify([it.rarity, it.look]) : '-';
            const where = `${G.world.kind === 'town' ? 'town' : 'D' + G.world.depth} t=${Math.round(sim)} body=${look(eq.body)} head=${look(eq.head)}`;
            if (!a) bad.push('no hero image ' + where + ' gearMeta=' + !!ga.gearMeta(p.classId));
            else {
              const n = opaque(a.img);
              if (n < 2500) bad.push(`hero image ${a.img.width}x${a.img.height} only ${n} px ` + where);
              if (!(a.k > 0) || !isFinite(a.ax) || !isFinite(a.ay)) bad.push(`bad frame k=${a.k} ${where}`);
            }
            if ((p.alpha ?? 1) < 0.5 || !(p.scale > 0.5) || p.hidden || p.ghostDraw || !isFinite(p.x) || !isFinite(p.z || 0)) {
              bad.push(`hero drawn alpha=${p.alpha} scale=${p.scale} hidden=${p.hidden} ghost=${p.ghostDraw} z=${p.z} ${where}`);
            }
          }
          await new Promise((r) => setTimeout(r, 0));
        }
        return { bad, where: G.world ? (G.world.kind === 'town' ? 'town' : 'D' + G.world.depth) : '-', lvl: G.char.level };
      });
      console.log(`[${min}m] ${res.where} lvl ${res.lvl}: ${res.bad.length ? res.bad.length + ' problems: ' + res.bad.slice(0, 6).join(' | ') : 'hero visible every second'}`);
      if (res.bad.length) failed = true;
    }
  }
  report(errors, 20);
  await browser.close();
  if (failed) { console.log('FAIL'); process.exitCode = 1; }
})();
