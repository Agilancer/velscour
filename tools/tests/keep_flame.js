// TESSARIEL'S KEEP: the Sacred Flame in its crowned brazier, close up (docs/TESSARIELS_KEEP.md). Shots of the fire at
// its smallest, at a high Renown, Kindled and leaping, a few frames apart, zoomed in on the brazier; and checks that the
// brazier's near rim and blades are drawn over the fire (the front overlay is there and has pixels where it should).
// Shots: tools/tests/out/keep_flame_*.png.
//   node tools/tests/keep_flame.js [zoom]
const { openGame, report, OUT_DIR } = require('./harness');
const ZOOM = +(process.argv[2] || 3);
(async () => {
  const { browser, page, errors } = await openGame({ width: 1280, height: 900 });
  const fail = (m) => { errors.push('[keep_flame] ' + m); console.log('FAIL', m); };
  try {
    await page.evaluate(async () => { await window.VELSCOUR.game.newChar('paladin', 'Flame QA'); await window.VELSCOUR.game.enterKeep(); });
    await page.waitForTimeout(1500);
    // the hero out of the picture, the camera held on the brazier (leadX/Y) and zoomed in, the folk sent away, no HUD
    await page.addStyleTag({ content: 'body * { visibility: hidden !important; } #game { visibility: visible !important; }' });
    await page.evaluate(async (Z) => {
      const { G } = window.VELSCOUR, { camera, isoX, isoY } = await import('/src/core/view.js'), A = G.world.anchors, p = G.player;
      p.x = A.flame[0] - 3.2; p.y = A.flame[1] + 3.2; p.path = null;   // level with the fire on screen, off to its left
      for (const n of G.world.npcs) if (n.keepFolk || n.keepHero || n.keepCastellan) { n.x = -20; n.y = -20; }
      camera.leadX = isoX(A.flame[0], A.flame[1]) - isoX(p.x, p.y); camera.leadY = isoY(A.flame[0], A.flame[1]) - 78 - isoY(p.x, p.y) + 24;
      camera.zoomK = Z; camera.computeZoom(); camera.follow(p.x, p.y, 0, true);
    }, ZOOM);
    await page.waitForTimeout(900);
    const shoot = async (name) => {
      const z = await page.evaluate(async () => (await import('/src/core/view.js')).camera.zoom), w = Math.min(1280, Math.round(190 * z)), h = Math.min(900, Math.round(270 * z));
      await page.screenshot({ path: require('path').join(OUT_DIR, 'keep_flame_' + name + '.png'), clip: { x: Math.round(640 - w / 2), y: Math.round(450 - h / 2), width: w, height: h } });
    };
    const state = async (o) => page.evaluate(async (o) => {
      const { G } = window.VELSCOUR, { keepState } = await import('/src/game/keep.js'), k = keepState(G.char);
      k.renown = o.renown || 0;
      k.kindled = o.kindled ? { at: Date.now(), until: Date.now() + 600000 } : null;
      G.world.flameSurge = o.surge || 0;
    }, o);
    for (const [name, o] of [['small', {}], ['renown', { renown: 1e9 }], ['kindled', { renown: 1e9, kindled: true }]]) {
      await state(o);
      for (let i = 0; i < 3; i++) { await page.waitForTimeout(260); await shoot(name + '_' + i); }
    }
    // leaping (the biggest it gets): the surge decays, so shoot right after it is set
    for (let i = 0; i < 2; i++) { await state({ surge: 1, kindled: true, renown: 1e9 }); await page.waitForTimeout(60); await shoot('surge_' + i); }
    // the front overlay: the brazier's near rim and blades, drawn over the fire
    const ov = await page.evaluate(async () => {
      const m = await import('/src/gfx/keepart.js'), { pixelsOf } = await import('/src/core/util.js'), o = m.brazierFront && m.brazierFront();
      if (!o) return null;
      const d = pixelsOf(o.img);
      let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++;
      return { w: o.img.width, h: o.img.height, px: n };
    });
    console.log('front overlay', JSON.stringify(ov));
    if (!ov) fail('no brazier front overlay');
    else if (ov.px < 400) fail('the brazier front overlay is (nearly) empty: ' + ov.px + ' px');
    // the four Elders on their plinths, each turned to face the Flame (re-baked onto elders.webp: tkeep3d_bake.js elders):
    // all earned, then none (their grey shades are the same sprites)
    await state({});
    await page.evaluate(async () => {
      const { G } = window.VELSCOUR, { camera, isoX, isoY } = await import('/src/core/view.js'), A = G.world.anchors, p = G.player;
      p.x = A.flame[0] + 1; p.y = A.flame[1] + 9; p.path = null;
      camera.leadX = isoX(A.flame[0], A.flame[1]) - isoX(p.x, p.y); camera.leadY = isoY(A.flame[0], A.flame[1]) - 100 - isoY(p.x, p.y) + 24;
      camera.zoomK = 1; camera.computeZoom(); camera.zoomK = 1.3 / camera.zoom; camera.computeZoom(); camera.follow(p.x, p.y, 0, true);
    });
    const ELDERS = ['elder_gale', 'elder_hearth', 'elder_cold', 'elder_star'];
    for (const [name, earned] of [['earned', true], ['shades', false]]) {
      const r = await page.evaluate(async ([ids, earned]) => {
        const { G } = window.VELSCOUR, { keepState } = await import('/src/game/keep.js'), { castle3dState } = await import('/src/gfx/castle3dart.js');
        const have = keepState(G.char).have;
        have.trophy = have.trophy.filter((t) => !ids.includes(t)).concat(earned ? ids : []);
        (await import('/src/ui/keep.js')).rebuildDecor();
        const st = castle3dState(), pg = st.idx.pages.indexOf('elders.webp');
        const on = G.world.props.filter((p) => ids.includes(p.trophy) || ids.includes(p.ghost));
        return { pg, n: on.length, onPage: on.filter((p) => p.spr.img === st.imgs[pg]).length };
      }, [ELDERS, earned]);
      console.log('elders', name, JSON.stringify(r));
      if (r.n !== 4) fail(`expected the 4 Elders on their plinths (${name}), saw ${r.n}`);
      if (earned && (r.pg < 0 || r.onPage !== 4)) fail('the earned Elders are not drawn from elders.webp: ' + JSON.stringify(r));
      await page.waitForTimeout(700);
      await page.screenshot({ path: require('path').join(OUT_DIR, 'keep_flame_elders_' + name + '.png') });
    }
  } catch (e) {
    fail(e.stack || String(e));
  } finally {
    await browser.close();
    report(errors);
  }
})();
