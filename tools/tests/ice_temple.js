// Ice Temple browser and atlas QA. Run from the repo root with a local HTTP server:
//   python3 -m http.server 8123
//   node tools/tests/ice_temple.js
// Exports game-ready generated WebP atlases and pack metadata into tools/tests/out/.
const fs = require('fs');
const path = require('path');
const { openGame, report, OUT_DIR } = require('./harness');

(async () => {
  const { browser, page, errors, shot } = await openGame({ width: 1366, height: 900 });
  try {
    await page.click('text=Heroes');
    await page.click('.class-card[data-id="paladin"]');
    await page.click('text=Begin');
    await page.waitForTimeout(700);
    const result = await page.evaluate(async () => {
      const { G, game } = window.VELSCOUR;
      const { BIOME_BY_ID, drawBiome, recordBiomeVisit } = await import('/src/data/biomes.js');
      const { loadBiomeArt, A } = await import('/src/core/assets.js');
      const biome = BIOME_BY_ID.ice_temple;
      const problems = [];
      if (!biome || biome.pack !== 'ice_temple') throw Error('Ice Temple is not registered');
      await loadBiomeArt(biome);
      const pack = A.packs.ice_temple, meta = pack.meta;
      if (!pack.floors || !pack.walls || !pack.scatter) problems.push('Missing generated Canvas atlas');
      if (meta.floors.length !== 60 || meta.floors.filter(f => f.seamless).length !== 10)
        problems.push('Expected 60 floors and ten repeating base floors');
      if (Object.keys(meta.walls).length !== 5) problems.push('Expected five wall families');
      for (const [fam, masks] of Object.entries(meta.walls)) for (let mask = 0; mask < 16; mask++) {
        if (!masks[mask]?.length) problems.push('Missing wall mask ' + fam + '/' + mask);
      }
      if (Object.keys(meta.arches).length !== 3 || Object.keys(meta.doors).length !== 3)
        problems.push('Expected three arches and three doors');
      for (const [a,dirs] of Object.entries(meta.arches)) for (const dir of ['NE','SE','SW','NW']) {
        if (dirs[dir]?.length !== 6) problems.push('Bad arch: ' + a + '/' + dir);
      }
      for (const [a,dirs] of Object.entries(meta.doors)) for (const dir of ['NE','SE','SW','NW']) {
        if (!dirs[dir]?.closed?.length || !dirs[dir]?.open?.some(r => r[0][0] === 'leaf'))
          problems.push('Missing opening door leaf: ' + a + '/' + dir);
      }
      if (meta.scatter.length !== 40 || new Set(meta.scatter.map(s => s.name)).size !== 40)
        problems.push('Expected forty distinct props');
      for (const s of meta.scatter)
        if (s.x < 0 || s.y < 0 || s.x + s.w > pack.scatter.width || s.y + s.h > pack.scatter.height)
          problems.push('Scatter outside atlas: ' + s.name);
      // The throne and the scheduled overworld must remain more important
      // than an ordinary shuffle-bag Ice Temple draw.
      if (drawBiome({overworldMisses:6},500) !== 'throne') problems.push('Throne priority regressed');
      if (!BIOME_BY_ID[drawBiome({overworldMisses:3,biomeBag:[]},17)]?.overworld)
        problems.push('Overworld guarantee regressed');
      const stats = { levels:0, guardians:0, doors:0, arches:0, props:0, unreachable:0, frozenFloors:meta.floors.length };
      for (let i=0; i<16; i++) {
        game.buildDungeon(3+i*4,biome);
        const w=G.world, map=w.map, W=map.w;
        stats.levels++;
        stats.guardians+=+(!!w.boss && !w.boss.dead);
        stats.doors+=map.doors.length;
        stats.arches+=map.walls.filter(x => x.kind === 'arch').length;
        stats.props+=w.props.length;
        const start=Math.floor(G.player.y)*W+Math.floor(G.player.x);
        if (start < 0 || start >= map.t.length || !map.walkable(G.player.x,G.player.y)) {
          problems.push('Bad player start on seed ' + i);continue;
        }
        const seen=new Uint8Array(map.t.length), queue=[start];seen[start]=1;
        for (let at=0;at<queue.length;at++) {
          const q=queue[at],x=q%W,y=Math.floor(q/W);
          for (const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
            const xx=x+dx,yy=y+dy,j=yy*W+xx;
            if (map.walkableTile(xx,yy) && !seen[j]) {seen[j]=1;queue.push(j);}
          }
        }
        for (let j=0;j<map.t.length;j++)
          if (map.walkableTile(j%W,Math.floor(j/W)) && !seen[j]) stats.unreachable++;
      }
      if (stats.unreachable) problems.push('Unreachable walkable tiles: '+stats.unreachable);
      if (!stats.doors || !stats.arches) problems.push('No generated doors or arches');
      if (stats.guardians !== stats.levels) problems.push('Missing guardian');
      game.buildDungeon(17,biome);
      const { camera } = await import('/src/core/view.js');
      camera.zoom=1.65;camera.follow(G.player.x,G.player.y,0,true);
      return { count: { floor:meta.floors.length, scatter:meta.scatter.length,
        walls:Object.keys(meta.walls).length, arches:Object.keys(meta.arches).length,
        doors:Object.keys(meta.doors).length }, stats, problems };
    });
    console.log('Ice Temple QA',JSON.stringify(result));
    if (result.problems.length) errors.push(...result.problems);
    await page.waitForTimeout(650);
    await shot('ice_temple_gameplay');

    const raw = await page.evaluate(async () => {
      const { A } = await import('/src/core/assets.js');
      const p = A.packs.ice_temple;
      const b64 = (cv) => cv.toDataURL('image/webp',0.94).split(',')[1];
      return { floors:b64(p.floors), walls:b64(p.walls),
        scatter:b64(p.scatter), meta:JSON.stringify(p.meta) };
    });
    const exportDir=path.join(OUT_DIR,'ice_temple_export');
    fs.mkdirSync(exportDir,{recursive:true});
    for (const key of ['floors','walls','scatter'])
      fs.writeFileSync(path.join(exportDir,key+'.webp'),Buffer.from(raw[key],'base64'));
    fs.writeFileSync(path.join(exportDir,'pack.json'),raw.meta);
    console.log('Exported Ice Temple game art:',exportDir);

    await page.evaluate(async () => {
      const { A }=await import('/src/core/assets.js');
      const pack=A.packs.ice_temple;
      const cv=document.createElement('canvas');
      cv.id='ice-temple-contact';cv.width=1600;cv.height=900;
      const c=cv.getContext('2d');c.fillStyle='#0c1427';c.fillRect(0,0,1600,900);
      c.fillStyle='#e3f8ff';c.font='bold 26px monospace';c.fillText('ICE TEMPLE | 40 LIVE PROP SPRITES',30,36);
      for (let i=0;i<pack.meta.scatter.length;i++) {
        const p=pack.meta.scatter[i],x=(i%10)*158,y=Math.floor(i/10)*211+59;
        c.drawImage(pack.scatter,p.x,p.y,p.w,p.h,x+13,y,128,129);
        c.fillStyle='#b9e8f4';c.font='11px monospace';
        c.fillText(String(i+1).padStart(2,'0')+' '+p.name.slice(0,18),x+3,y+149);
      }
      Object.assign(cv.style,{position:'fixed',left:'0',top:'0',zIndex:'100000',
        maxWidth:'100vw',maxHeight:'100vh',background:'#0c1427'});
      document.body.appendChild(cv);
    });
    await page.locator('#ice-temple-contact').screenshot({path:path.join(OUT_DIR,'ice_temple_40_props.png')});
    await page.evaluate(() => document.querySelector('#ice-temple-contact')?.remove());

    // Inspect real floor and architectural atlas pixels in a separate contact sheet.
    await page.evaluate(async ()=>{
      const { A }=await import('/src/core/assets.js');
      const pack=A.packs.ice_temple;
      const cv=document.createElement('canvas');
      cv.id='ice-temple-floors';cv.width=1400;cv.height=940;
      const c=cv.getContext('2d');c.fillStyle='#071126';c.fillRect(0,0,1400,940);
      c.fillStyle='#e3f8ff';c.font='bold 23px monospace';
      c.fillText('ICE TEMPLE | 60 FLOOR DESIGNS',25,36);
      for (let i=0;i<60;i++){
        const tile=pack.meta.floors[i],x=(i%10)*138,y=Math.floor(i/10)*143+57;
        c.drawImage(pack.floors,tile.x,tile.y,tile.w,tile.h,x+7,y+6,124,62);
        c.fillStyle='#b9d7ec';c.font='11px monospace';c.fillText(String(i+1).padStart(2,'0')+' '+tile.name.slice(0,14),x+5,y+84);
      }
      Object.assign(cv.style,{position:'fixed',left:'0',top:'0',zIndex:'100000',
        maxWidth:'100vw',maxHeight:'100vh'});
      document.body.appendChild(cv);
    });
    await page.locator('#ice-temple-floors').screenshot({path:path.join(OUT_DIR,'ice_temple_60_floors.png')});
  } catch(e) {errors.push('[ice_temple] '+(e.stack||e));}
  report(errors);await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1;});
