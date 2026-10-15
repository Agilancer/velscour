// Browser QA for the generated Desert Temple biome and every dungeon-pack contract:
//  python3 -m http.server 8123
//  node tools/tests/desert_temple.js
const { openGame, report, OUT_DIR } = require('./harness');
const path = require('path');
const fs = require('fs');
(async () => {
  const { browser, page, errors, shot } = await openGame({ width: 1366, height: 900 });
  try {
    await page.click('text=Heroes');
    await page.click('.class-card[data-id="paladin"]');
    await page.click('text=Begin');
    await page.waitForTimeout(650);
    const info = await page.evaluate(async () => {
      const { G, game } = window.VELSCOUR;
      const { BIOME_BY_ID } = await import('/src/data/biomes.js');
      const { loadBiomeArt, A } = await import('/src/core/assets.js');
      const b = BIOME_BY_ID.desert_temple;
      if (!b || b.pack !== 'desert_temple') throw Error('Biome not registered');
      await loadBiomeArt(b);
      const pack = A.packs.desert_temple, m = pack.meta, errors = [];
      if (m.floors.length !== 60 || m.floors.filter(f => f.seamless).length !== 10)
        errors.push('Need exactly 60 floors / 10 seamless bases');
      if (m.scatter.length !== 40) errors.push('Need exactly 40 unique scatter sprites');
      if (new Set(m.scatter.map(s => s.name)).size !== 40) errors.push('Duplicate temple prop');
      if (Object.keys(m.walls).length !== 5) errors.push('Need five modular wall families');
      for (const [f, masks] of Object.entries(m.walls)) {
        for (let mask = 0; mask < 16; mask++) {
          if (!masks[mask] || !masks[mask].length) errors.push('Missing wall mask ' + f + '#' + mask);
        }
      }
      if (Object.keys(m.arches).length !== 3 || Object.keys(m.doors).length !== 3)
        errors.push('Need three 4-direction arch and door designs');
      for (const [f, dirs] of Object.entries(m.arches)) {
        for (const d of ['SE', 'SW', 'NE', 'NW']) if (!dirs[d] || dirs[d].length !== 6)
          errors.push('Broken 3-tile arch ' + f + ' in ' + d);
      }
      for (const [f, dirs] of Object.entries(m.doors)) {
        for (const d of ['SE', 'SW', 'NE', 'NW'])
          if (!dirs[d]?.closed?.length || !dirs[d]?.open?.length ||
              !dirs[d].open.some(p => p[0][0] === 'leaf'))
            errors.push('Broken animated door ' + f + ' in ' + d);
      }
      const checks = { levels: 0, seenUnreachable: 0, doors: 0, arches: 0, props: 0, guardians: 0 };
      for (let i = 0; i < 16; i++) {
        game.buildDungeon(1 + i * 3, b);
        const w = G.world, mp = w.map, W = mp.w;
        checks.levels++;
        checks.doors += mp.doors.length;
        checks.arches += new Set(mp.walls.filter(a => a.kind === 'arch').map(a => a.x + ':' + a.y)).size;
        checks.props += w.props.length;
        if (w.boss && !w.boss.dead) checks.guardians++;
        if (!mp.circleFree(G.player.x, G.player.y, 0.3)) errors.push('Player spawned in wall ' + i);
        const seen = new Uint8Array(mp.t.length), start = Math.floor(G.player.y) * W + Math.floor(G.player.x);
        const queue = [start]; seen[start] = 1;
        for (let h = 0; h < queue.length; h++) {
          const cur = queue[h], x = cur % W, y = Math.floor(cur / W);
          for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
            const xx = x + dx, yy = y + dy, j = yy * W + xx;
            if (mp.walkableTile(xx,yy) && !seen[j]) { seen[j] = 1; queue.push(j); }
          }
        }
        for (let j = 0; j < mp.t.length; j++) {
          if (mp.walkableTile(j % W, Math.floor(j / W)) && !seen[j]) checks.seenUnreachable++;
        }
      }
      if (checks.seenUnreachable) errors.push('Unreachable temple floor tiles: ' + checks.seenUnreachable);
      if (!checks.doors || !checks.arches) errors.push('Temple did not generate arches or doors');
      if (checks.guardians !== checks.levels) errors.push('Temple levels missing guardian(s)');
      game.buildDungeon(22, b);
      const { camera } = await import('/src/core/view.js');
      camera.zoom = 1.75;
      camera.follow(G.player.x, G.player.y, 0, true);
      return { art: { floors: m.floors.length, walls: Object.keys(m.walls).length,
        arches: Object.keys(m.arches).length, doors: Object.keys(m.doors).length,
        scatter: m.scatter.length }, checks, errors };
    });
    console.log('Desert Temple QA:', JSON.stringify(info));
    if (info.errors.length) errors.push(...info.errors);
    await page.waitForTimeout(550);
    await shot('desert_temple_gameplay');
    // Export the actual game-consumed WebP atlases as production handoff files.
    // This also permits pixel QA outside the browser and lets an artist redraw
    // individual crops using the ordinary pack.json metadata if desired.
    const exportData = await page.evaluate(async () => {
      const { A } = await import('/src/core/assets.js');
      const pack = A.packs.desert_temple;
      const encode = (cv) => cv.toDataURL('image/webp',.93).split(',')[1];
      return { floors:encode(pack.floors), walls:encode(pack.walls),
        scatter:encode(pack.scatter), meta:JSON.stringify(pack.meta) };
    });
    const exportDir = path.join(OUT_DIR,'desert_temple_export');
    fs.mkdirSync(exportDir,{recursive:true});
    for (const key of ['floors','walls','scatter'])
      fs.writeFileSync(path.join(exportDir,key+'.webp'),Buffer.from(exportData[key],'base64'));
    fs.writeFileSync(path.join(exportDir,'pack.json'),exportData.meta);
    console.log('Exported game-ready Desert Temple atlas + metadata to',exportDir);
    // Prop contact sheet: exact runtime-sampled sprite images, not reference art.
    await page.evaluate(async () => {
      const { A } = await import('/src/core/assets.js');
      const { camera } = await import('/src/core/view.js');
      const pack = A.packs.desert_temple;
      const cv = document.createElement('canvas');
      cv.id = 'desert-temple-props-preview';cv.width = 1600;cv.height = 900;
      const c = cv.getContext('2d');c.fillStyle = '#151016';c.fillRect(0,0,1600,900);
      c.fillStyle = '#f1ce95';c.font = 'bold 25px monospace';
      c.fillText('DESERT TEMPLE | 40 LIVE PROP SPRITES',24,34);
      pack.meta.scatter.forEach((p,i)=>{
        const x=(i%10)*158,y=Math.floor(i/10)*211+60;
        c.drawImage(pack.scatter,p.x,p.y,p.w,p.h,x+20,y,118,130);
        c.fillStyle='#d8b98b';c.font='11px monospace';
        c.fillText(String(i+1).padStart(2,'0')+' '+p.name.slice(0,18),x+3,y+148);
      });
      Object.assign(cv.style,{position:'fixed',zIndex:'100000',left:0,top:0,
        maxWidth:'100vw',maxHeight:'100vh',background:'#151016'});
      document.body.appendChild(cv);
    });
    await page.locator('#desert-temple-props-preview').screenshot({
      path:path.join(OUT_DIR,'desert_temple_40_props.png')
    });
    await page.evaluate(() => document.querySelector('#desert-temple-props-preview')?.remove());
  } catch (e) { errors.push('[desert_temple] '+(e.stack || e)); }
  report(errors);
  await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1;});
