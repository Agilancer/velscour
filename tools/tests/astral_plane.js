// ASTRAL PLANE generated-art, dungeon gameplay and export QA.
// From repo root: python3 -m http.server 8123 &
//                 node tools/tests/astral_plane.js
const fs=require('fs');
const path=require('path');
const {openGame,report,OUT_DIR}=require('./harness');
(async()=>{
  const {browser,page,errors,shot}=await openGame({width:1440,height:900});
  try{
    const result=await page.evaluate(async()=>{
      const {G,game}=window.VELSCOUR;
      await game.newChar('lancer','Astral QA');
      document.querySelectorAll('.screen').forEach(s=>s.remove());
      G.ui.modalCount=0;G.godMode=true;
      const {BIOME_BY_ID,drawBiome}=await import('/src/data/biomes.js');
      const {loadBiomeArt,A,biomeTileSet}=await import('/src/core/assets.js');
      const biome=BIOME_BY_ID.astral_plane,problems=[];
      if(!biome||biome.pack!=='astral_plane'||biome.overworld)
        throw Error('ASTRAL PLANE must be registered as an ordinary indoor dungeon');
      await loadBiomeArt(biome);
      const pack=A.packs.astral_plane,m=pack.meta,set=biomeTileSet(biome);
      if(m.floors.length!==60||m.floors.filter(x=>x.seamless).length!==10)
        problems.push('Expected 60 floor designs and 10 seamless bases');
      if(m.scatter.length!==40||new Set(m.scatter.map(s=>s.name)).size!==40)
        problems.push('Expected 40 unique named objects');
      if(m.scatter.some(s=>s.x<0||s.y<0||s.x+s.w>pack.scatter.width||s.y+s.h>pack.scatter.height))
        problems.push('Scatter atlas crop out of bounds');
      if(Object.keys(m.walls).length!==5||set.families.length!==5)
        problems.push('Missing Astral Plane wall families');
      for(const [fam,masks] of Object.entries(m.walls))
        for(let mask=0;mask<16;mask++)if(!masks[mask]?.length)
          problems.push('Missing '+fam+' mask '+mask);
      if(Object.keys(m.arches).length!==3||Object.keys(m.doors).length!==3)
        problems.push('Need three arch and three door designs');
      for(const [name,dirs] of Object.entries(m.arches))
        for(const d of ['NE','SE','SW','NW'])if(dirs[d]?.length!==6)
          problems.push('Missing arch slices '+name+'/'+d);
      for(const [name,dirs] of Object.entries(m.doors))
        for(const d of ['NE','SE','SW','NW'])
          if(!dirs[d]?.closed?.length||!dirs[d]?.open?.some(x=>x[0][0]==='leaf'))
            problems.push('Missing directional opening door '+name+'/'+d);
      if(drawBiome({overworldMisses:6},500)!=='throne')
        problems.push('Astral biome broke final throne precedence');
      if(drawBiome({overworldMisses:6,biomeBag:[]},20)!=='overworld')
        problems.push('Astral biome broke six-depth overworld guarantee');

      const stats={levels:0,guardians:0,props:0,doors:0,arches:0,wallArms:0,unreachable:0};
      for(let run=0;run<20;run++){
        game.buildDungeon(3+run*7,biome);
        const w=G.world,mp=w.map,W=mp.w;
        stats.levels++;
        stats.guardians+=Number(!!w.boss&&!w.boss.dead);
        stats.props+=w.props.length;
        stats.doors+=mp.doors.length;
        stats.arches+=mp.walls.filter(v=>v.kind==='arch').length;
        stats.wallArms+=mp.walls.filter(v=>v.kind==='wall').length;
        if(!mp.walkable(G.player.x,G.player.y)){
          problems.push('Player spawned in blocked tile, level '+run);continue;
        }
        if(mp.walls.some(v=>!Number.isFinite(v.depth)))
          problems.push('Non-finite depth in level '+run);
        const origin=Math.floor(G.player.y)*W+Math.floor(G.player.x);
        const seen=new Uint8Array(mp.t.length),queue=[origin];seen[origin]=1;
        for(let at=0;at<queue.length;at++){
          const q=queue[at],x=q%W,y=Math.floor(q/W);
          for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
            const xx=x+dx,yy=y+dy,idx=yy*W+xx;
            if(mp.walkableTile(xx,yy)&&!seen[idx]){seen[idx]=1;queue.push(idx);}
          }
        }
        for(let idx=0;idx<mp.t.length;idx++)
          if(mp.walkableTile(idx%W,Math.floor(idx/W))&&!seen[idx])stats.unreachable++;
      }
      if(stats.unreachable)problems.push('Unreachable dungeon tiles: '+stats.unreachable);
      if(stats.guardians!==stats.levels)problems.push('A dungeon guardian did not spawn');
      if(!stats.wallArms||!stats.arches||!stats.doors)
        problems.push('Normal walls, arches or doors did not generate');
      game.buildDungeon(29,biome);
      const {camera}=await import('/src/core/view.js');
      camera.zoom=1.75;camera.follow(G.player.x,G.player.y,0,true);
      return {art:{floor:m.floors.length,props:m.scatter.length,wallFamilies:Object.keys(m.walls).length,
        arches:Object.keys(m.arches).length,doors:Object.keys(m.doors).length},stats,problems};
    });
    console.log('ASTRAL PLANE QA:',JSON.stringify(result));
    if(result.problems.length)errors.push(...result.problems);
    await page.waitForTimeout(550);await shot('astral_plane_gameplay');
    const exports=await page.evaluate(async()=>{
      const {A}=await import('/src/core/assets.js');
      const p=A.packs.astral_plane,enc=c=>c.toDataURL('image/webp',.94).split(',')[1];
      return {floors:enc(p.floors),walls:enc(p.walls),scatter:enc(p.scatter),meta:JSON.stringify(p.meta)};
    });
    const dir=path.join(OUT_DIR,'astral_plane_export');
    fs.mkdirSync(dir,{recursive:true});
    for(const name of ['floors','walls','scatter'])
      fs.writeFileSync(path.join(dir,name+'.webp'),Buffer.from(exports[name],'base64'));
    fs.writeFileSync(path.join(dir,'pack.json'),exports.meta);
    console.log('Game-ready astral atlas export:',dir);

    // Contact sheet uses actual generated sprites/crops, not illustrative mockups.
    await page.evaluate(async()=>{
      const {A}=await import('/src/core/assets.js'),pack=A.packs.astral_plane;
      const cv=document.createElement('canvas');cv.id='astral-props';
      cv.width=1600;cv.height=930;
      const g=cv.getContext('2d');g.fillStyle='#0b0825';g.fillRect(0,0,cv.width,cv.height);
      g.font='bold 25px monospace';g.fillStyle='#c4b2ff';
      g.fillText('ASTRAL PLANE | 40 CELESTIAL OBJECTS',25,35);
      pack.meta.scatter.forEach((p,i)=>{
        const x=i%10*158,y=Math.floor(i/10)*213+62;
        g.drawImage(pack.scatter,p.x,p.y,p.w,p.h,x+16,y,125,130);
        g.fillStyle='#bcb9e6';g.font='11px monospace';
        g.fillText(String(i+1).padStart(2,'0')+' '+p.name.slice(0,18),x+3,y+151);
      });
      Object.assign(cv.style,{position:'fixed',left:0,top:0,zIndex:99999,
        maxWidth:'100vw',maxHeight:'100vh'});
      document.body.appendChild(cv);
    });
    await page.locator('#astral-props').screenshot({path:path.join(OUT_DIR,'astral_plane_40_props.png')});
    await page.evaluate(()=>document.querySelector('#astral-props')?.remove());
    await page.evaluate(async()=>{
      const {A}=await import('/src/core/assets.js'),p=A.packs.astral_plane;
      const cv=document.createElement('canvas');cv.id='astral-floors';
      cv.width=1400;cv.height=940;
      const g=cv.getContext('2d');g.fillStyle='#0b0825';g.fillRect(0,0,cv.width,cv.height);
      g.font='bold 24px monospace';g.fillStyle='#c4b2ff';
      g.fillText('ASTRAL PLANE | 60 STELLAR FLOOR TILES',24,35);
      p.meta.floors.forEach((t,i)=>{
        const x=i%10*138,y=Math.floor(i/10)*142+61;
        g.drawImage(p.floors,t.x,t.y,t.w,t.h,x+5,y+4,124,62);
        g.fillStyle='#c8c0e3';g.font='10px monospace';
        g.fillText(String(i+1).padStart(2,'0')+' '+t.name.slice(0,14),x+3,y+85);
      });
      Object.assign(cv.style,{position:'fixed',left:0,top:0,zIndex:99999,
        maxWidth:'100vw',maxHeight:'100vh'});
      document.body.appendChild(cv);
    });
    await page.locator('#astral-floors').screenshot({path:path.join(OUT_DIR,'astral_plane_60_floors.png')});
  }catch(e){errors.push('[ASTRAL PLANE] '+(e.stack||e));}
  report(errors);await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1;});
