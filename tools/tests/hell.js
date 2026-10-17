// HELL dungeon pack QA, screenshots and atlas export.
// Start HTTP server at repo root, then: node tools/tests/hell.js
const fs = require('fs');
const path = require('path');
const { openGame, report, OUT_DIR } = require('./harness');

(async () => {
  const { browser, page, errors, shot } = await openGame({ width: 1440, height: 900 });
  try {
    const result = await page.evaluate(async () => {
      const { G, game } = window.VELSCOUR;
      await game.newChar('paladin', 'Hell QA');
      document.querySelectorAll('.screen').forEach(s => s.remove());
      G.ui.modalCount = 0;
      G.godMode = true;
      const { BIOME_BY_ID, drawBiome } = await import('/src/data/biomes.js');
      const { loadBiomeArt, A } = await import('/src/core/assets.js');
      const { biomeTileSet } = await import('/src/core/assets.js');
      const biome = BIOME_BY_ID.hell, problems = [];
      if (!biome || biome.pack !== 'hell' || biome.overworld) throw Error('Missing indoor HELL biome');
      await loadBiomeArt(biome);
      const p = A.packs.hell, m = p.meta, set=biomeTileSet(biome);
      if (!p.floors || !p.walls || !p.scatter) problems.push('Missing one or more generated atlases');
      if (m.floors.length !== 60 || m.floors.filter(f => f.seamless).length !== 10)
        problems.push('Expected 60 floors and ten seamless bases');
      if (Object.keys(m.walls).length !== 5 || set.families.length !== 5) problems.push('Missing wall families');
      for (const [family, masks] of Object.entries(m.walls)) for (let i = 0; i < 16; i++) {
        if (!masks[i]?.length) problems.push('Missing '+family+' connection mask '+i);
      }
      if (Object.keys(m.arches).length !== 3 || Object.keys(m.doors).length !== 3)
        problems.push('Expected three arches and doors');
      for (const [name, dirs] of Object.entries(m.arches)) for(const d of ['NE','SE','SW','NW'])
        if (dirs[d]?.length !== 6) problems.push('Broken arch '+name+' '+d);
      for (const [name, dirs] of Object.entries(m.doors)) for(const d of ['NE','SE','SW','NW'])
        if (!dirs[d]?.closed?.length || !dirs[d]?.open?.some(x => x[0][0] === 'leaf'))
          problems.push('Broken open/closed door '+name+' '+d);
      if (m.scatter.length !== 40 || new Set(m.scatter.map(x=>x.name)).size !== 40)
        problems.push('Expected forty differently named props');
      for (const s of m.scatter) if(s.x<0||s.y<0||s.x+s.w>p.scatter.width||s.y+s.h>p.scatter.height)
        problems.push('Out-of-bounds prop '+s.name);
      if (drawBiome({overworldMisses:6},500) !== 'throne') problems.push('Final throne replaced');
      if (!BIOME_BY_ID[drawBiome({overworldMisses:3,biomeBag:[]},27)]?.overworld)
        problems.push('Forced overworld visit broken');

      // Use real level generation and game world composition; the player starts
      // in normal entrance, and all unblocked floor tiles must be reachable.
      const stats = {levels:0, guardians:0, wallArms:0, arches:0, doors:0, props:0, unreachable:0};
      for(let run=0;run<20;run++){
        game.buildDungeon(3+run*7,biome);
        const w=G.world, map=w.map, W=map.w;
        stats.levels++;stats.guardians+=+!!(w.boss&&!w.boss.dead);
        stats.wallArms+=map.walls.filter(v=>v.kind==='wall').length;
        stats.arches+=map.walls.filter(v=>v.kind==='arch').length;
        stats.doors+=map.doors.length;stats.props+=w.props.length;
        if (!map.walkable(G.player.x,G.player.y)) {
          problems.push('Player in wall run '+run);continue;
        }
        if (map.walls.some(v=>!Number.isFinite(v.depth))) problems.push('Non-finite wall depth');
        const origin=Math.floor(G.player.y)*W+Math.floor(G.player.x);
        const seen=new Uint8Array(map.t.length),queue=[origin];seen[origin]=1;
        for(let i=0;i<queue.length;i++){
          const v=queue[i],x=v%W,y=Math.floor(v/W);
          for (const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
            const nx=x+dx,ny=y+dy,n=ny*W+nx;
            if(map.walkableTile(nx,ny) && !seen[n]){seen[n]=1;queue.push(n);}
          }
        }
        for(let i=0;i<map.t.length;i++)
          if(map.walkableTile(i%W,Math.floor(i/W))&&!seen[i])stats.unreachable++;
      }
      if(stats.unreachable)problems.push(stats.unreachable+' inaccessible walkable dungeon cells');
      if(!stats.wallArms||!stats.arches||!stats.doors)problems.push('Architecture did not generate');
      if(stats.guardians!==stats.levels)problems.push('One or more guardian bosses missing');

      game.buildDungeon(25,biome);
      const {camera}=await import('/src/core/view.js');
      camera.zoom=1.7;camera.follow(G.player.x,G.player.y,0,true);
      return {art:{floors:m.floors.length,wallFamilies:Object.keys(m.walls).length,
        arches:Object.keys(m.arches).length,doors:Object.keys(m.doors).length,
        props:m.scatter.length},stats,problems};
    });
    console.log('HELL QA',JSON.stringify(result));
    if(result.problems.length)errors.push(...result.problems);
    await page.waitForTimeout(700);
    await shot('hell_dungeon_gameplay');

    const exportData = await page.evaluate(async()=>{
      const {A}=await import('/src/core/assets.js');
      const p=A.packs.hell;
      const encode=cv=>cv.toDataURL('image/webp',.95).split(',')[1];
      return {floors:encode(p.floors),walls:encode(p.walls),
        scatter:encode(p.scatter),meta:JSON.stringify(p.meta)};
    });
    const target=path.join(OUT_DIR,'hell_export');
    fs.mkdirSync(target,{recursive:true});
    for(const n of ['floors','walls','scatter'])fs.writeFileSync(
      path.join(target,n+'.webp'),Buffer.from(exportData[n],'base64'));
    fs.writeFileSync(path.join(target,'pack.json'),exportData.meta);
    console.log('Exported HELL pack at',target);

    await page.evaluate(async()=>{
      const {A}=await import('/src/core/assets.js');
      const p=A.packs.hell;
      const cv=document.createElement('canvas');cv.id='hell-contact';
      cv.width=1600;cv.height=930;const g=cv.getContext('2d');
      g.fillStyle='#150b11';g.fillRect(0,0,1600,930);
      g.fillStyle='#ffb174';g.font='bold 24px monospace';
      g.fillText('HELL | 40 RENDERED INFERNAL PROPS',26,33);
      for(const [i,item] of p.meta.scatter.entries()){
        const x=(i%10)*158,y=Math.floor(i/10)*214+60;
        g.drawImage(p.scatter,item.x,item.y,item.w,item.h,x+13,y,130,134);
        g.fillStyle='#edbca1';g.font='10px monospace';
        g.fillText(String(i+1).padStart(2,'0')+' '+item.name.slice(0,20),x+2,y+151);
      }
      Object.assign(cv.style,{position:'fixed',top:'0',left:'0',zIndex:99999,
        maxWidth:'100vw',maxHeight:'100vh',background:'#150b11'});
      document.body.appendChild(cv);
    });
    await page.locator('#hell-contact').screenshot({path:path.join(OUT_DIR,'hell_40_props.png')});
    await page.evaluate(()=>document.querySelector('#hell-contact').remove());

    await page.evaluate(async()=>{
      const {A}=await import('/src/core/assets.js');const p=A.packs.hell;
      const cv=document.createElement('canvas');cv.id='hell-floors';
      cv.width=1400;cv.height=940;const g=cv.getContext('2d');
      g.fillStyle='#160a12';g.fillRect(0,0,1400,940);
      g.fillStyle='#ffb174';g.font='bold 24px monospace';g.fillText('HELL | 60 FLOOR GRAPHICS',20,33);
      for(const [i,item] of p.meta.floors.entries()){
        const x=(i%10)*138,y=Math.floor(i/10)*142+60;
        g.drawImage(p.floors,item.x,item.y,item.w,item.h,x+8,y+4,123,61);
        g.font='10px monospace';g.fillStyle='#edbca1';
        g.fillText(String(i+1).padStart(2,'0')+' '+item.name.slice(0,14),x+2,y+82);
      }
      Object.assign(cv.style,{position:'fixed',top:'0',left:'0',zIndex:99999,maxWidth:'100vw',maxHeight:'100vh'});
      document.body.appendChild(cv);
    });
    await page.locator('#hell-floors').screenshot({path:path.join(OUT_DIR,'hell_60_floors.png')});
  }catch(e){errors.push('[HELL] '+(e.stack||e));}
  report(errors);
  await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1;});
