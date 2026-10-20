// HEAVENLY regression + monster export. Serve repo root then run:
//   python3 -m http.server 8123
//   node tools/tests/heavenly.js
const fs=require('fs');
const path=require('path');
const {openGame,report,OUT_DIR}=require('./harness');
(async()=>{
  const {browser,page,errors,shot}=await openGame({width:1440,height:960});
  try{
    const info=await page.evaluate(async()=>{
      const {G,game}=window.VELSCOUR;
      await game.newChar('paladin','Heavenly QA');
      document.querySelectorAll('.screen').forEach(s=>s.remove());
      G.ui.modalCount=0;G.godMode=true;
      const {HEAVENLY_MONSTERS,HEAVENLY_FAMILIES}=await import('/src/data/heavenly.js');
      const {BIOME_BY_ID,drawBiome,recordBiomeVisit}=await import('/src/data/biomes.js');
      const {rollLooks,ART_BY_ID}=await import('/src/data/bestiary.js');
      const {loadBiomeArt,A,biomeTileSet}=await import('/src/core/assets.js');
      const {enemyImage}=await import('/src/core/enemyart.js');
      await (await import('/src/gfx/heavenlymonsters.js')).preloadApprovedHeavenlyArtwork(); // painted sheets only now
      const b=BIOME_BY_ID.heavenly,issues=[];
      if(!b||b.pack!=='cathedral_graveyard'||b.overworld)throw Error('HEAVENLY is not a Cathedral-pack indoor dungeon');
      if(HEAVENLY_MONSTERS.length!==60||HEAVENLY_FAMILIES.length!==12)issues.push('60 monsters / 12 families missing');
      if(new Set(HEAVENLY_MONSTERS.map(m=>m.id)).size!==60||
         new Set(HEAVENLY_MONSTERS.map(m=>m.name)).size!==60)issues.push('Monster IDs or names not unique');
      if(HEAVENLY_MONSTERS.some(a=>ART_BY_ID[a.id]!==a))issues.push('Not registered in bestiary');
      const sigs=new Set();
      let tested=0;
      for(const a of HEAVENLY_MONSTERS){
        const img=enemyImage(a.id);
        if(!img||img.width!==160||img.height!==186||img._art?.fx!==80){
          issues.push('Missing rendered monster '+a.id);continue;
        }
        const sample=document.createElement('canvas');
        sample.width=img.width;sample.height=img.height;
        const ctx=sample.getContext('2d',{willReadFrequently:true});
        ctx.drawImage(img,0,0);
        const bytes=ctx.getImageData(0,0,img.width,img.height).data;
        let hash=2166136261,visible=0;
        for(let i=0;i<bytes.length;i+=4){
          if(bytes[i+3])visible++;
          for(let channel=0;channel<4;channel++)hash=Math.imul(hash^bytes[i+channel],16777619)>>>0;
        }
        if(visible<130)issues.push('Empty or underdrawn sprite '+a.id);
        if(sigs.has(hash))issues.push('Duplicate rendered monster silhouette/material '+a.id);
        sigs.add(hash);
        if(!enemyImage(a.id,null,'flash')||!enemyImage(a.id,null,'dark'))
          issues.push('Hit/corpse state missing '+a.id);
        if(!enemyImage(a.id,{colorize:[42,.62]}))
          issues.push('Monster finish missing '+a.id);
        tested++;
      }
      // No biome themes: the Heavenly dungeon rolls from the whole catalogue like every other biome, and the sixty
      // Heavenly monsters can turn up anywhere (data/bestiary.js rollLooks).
      const seen={heavenly:0,other:0};
      for(let run=0;run<160;run++){
        const looks=rollLooks(b);
        for(const arch of b.roster){
          const choice=looks.pick(arch),a=choice&&ART_BY_ID[choice.art];
          if(!a)issues.push('Unresolved Heavenly roster look '+arch);
          else if(a.id.startsWith('hv_'))seen.heavenly++;
          else seen.other++;
        }
        if(!looks.boss(b.roster)?.look?.art)
          issues.push('Heavenly guardian lacks artwork');
      }
      if(!seen.other)issues.push('Heavenly still themed: '+JSON.stringify(seen));
      await loadBiomeArt(b);
      // floors, walls and props: the Cathedral nave palette swapped, plus the eight approved painted floors/props
      const tiles=biomeTileSet(b);
      if(tiles.pack!=='cathedral_graveyard'||tiles.bases.length<2)issues.push('Heavenly paving missing');
      if(tiles.floors.filter(f=>f.name?.startsWith('heavenly_painted_floor_')).length!==8)issues.push('Painted Heavenly floors missing');
      if(tiles.scatter.filter(e=>e.painted).length!==8)issues.push('Painted Heavenly props missing');
      if(tiles.families.length!==3)issues.push('Three nave wall families expected');
      if(drawBiome({overworldMisses:6},500)!=='throne'||!BIOME_BY_ID[drawBiome({overworldMisses:3},20)]?.overworld)
        issues.push('Overworld or throne priority regressed');
      let hasHeaven=false;
      for(let run=0;run<50;run++){
        let c={biomeBag:[],lastBiome:null,overworldMisses:0};
        for(let depth=1;depth<=80;depth++){
          const selected=drawBiome(c,depth);
          if(c.overworldMisses>=3&&!BIOME_BY_ID[selected]?.overworld)issues.push('Missed forced overworld');
          if(selected==='heavenly')hasHeaven=true;
          recordBiomeVisit(c,BIOME_BY_ID[selected],depth);c.lastBiome=selected;
        }
      }
      if(!hasHeaven)issues.push('HEAVENLY not in the biome selection pool');
      const levels={generated:0,guardians:0,props:0,doors:0,arches:0};
      for(let depth=3;depth<63;depth+=5){
        game.buildDungeon(depth,b);levels.generated++;
        const w=G.world;
        levels.guardians+=+(!!w.boss&&!w.boss.dead);
        levels.props+=w.props.length;
        levels.doors+=w.map.doors.length;
        levels.arches+=w.map.walls.filter(x=>x.kind==='arch').length;
        if(!w.map.walkable(G.player.x,G.player.y))issues.push('Player spawned inside wall depth '+depth);
      }
      if(levels.guardians!==levels.generated)issues.push('A dungeon guardian did not spawn');
      if(!levels.props||!levels.doors||!levels.arches)issues.push('Expected normal dungeon walls, doors and scatter');
      game.buildDungeon(15,b);
      const {camera}=await import('/src/core/view.js');
      camera.zoom=1.6;camera.follow(G.player.x,G.player.y,0,true);
      return{testedMonsters:tested,uniqueVisuals:sigs.size,
        art:{floor:tiles.floors.length,wallFamilies:tiles.families.length,
          scatter:tiles.scatter.length,arches:Object.keys(tiles.arches).length,doors:Object.keys(tiles.doors).length},
        levels,issues};
    });
    console.log('HEAVENLY QA',JSON.stringify(info));
    if(info.issues.length)errors.push(...info.issues);
    await page.waitForTimeout(600);await shot('heavenly_gameplay');

    // Export the exact generated game atlas and every original monster cell.
    const data=await page.evaluate(async()=>{
      const {A}=await import('/src/core/assets.js');
      const {HEAVENLY_MONSTERS}=await import('/src/data/heavenly.js');
      const {enemyImage}=await import('/src/core/enemyart.js');
      const encode=cv=>cv.toDataURL('image/webp',.95).split(',')[1];
      const tileW=160,tileH=186,columns=10;
      const atlas=document.createElement('canvas');
      atlas.width=tileW*columns;atlas.height=tileH*6;
      const ctx=atlas.getContext('2d');
      ctx.imageSmoothingEnabled=false;
      const entries=HEAVENLY_MONSTERS.map((a,i)=>{
        const x=i%columns*tileW,y=Math.floor(i/columns)*tileH;
        ctx.drawImage(enemyImage(a.id),x,y);
        return{id:a.id,name:a.name,family:a.heavenlyFamily,variant:a.heavenlyVariant,
          arch:a.arch,boss:a.boss,cell:{x,y,w:tileW,h:tileH,fx:80}};
      });
      return{monsters:encode(atlas),monsterMeta:JSON.stringify(entries,null,2)};
    });
    const folder=path.join(OUT_DIR,'heavenly_export');
    fs.mkdirSync(folder,{recursive:true});
    fs.writeFileSync(path.join(folder,'monsters.webp'),Buffer.from(data.monsters,'base64'));
    fs.writeFileSync(path.join(folder,'monsters.json'),data.monsterMeta);
    console.log('HEAVENLY 60 monster atlas exported:',folder);

    await page.evaluate(async()=>{
      const {HEAVENLY_MONSTERS}=await import('/src/data/heavenly.js');
      const {enemyImage}=await import('/src/core/enemyart.js');
      const cv=document.createElement('canvas');cv.id='heavenly-gallery';
      cv.width=1580;cv.height=1200;const g=cv.getContext('2d');
      g.fillStyle='#222034';g.fillRect(0,0,cv.width,cv.height);
      g.fillStyle='#f8e6a9';g.font='bold 27px monospace';
      g.fillText('HEAVENLY | 60 UNIQUE IN-GAME MONSTERS',24,35);
      HEAVENLY_MONSTERS.forEach((a,i)=>{
        const x=i%10*157,y=Math.floor(i/10)*190+54;
        g.drawImage(enemyImage(a.id),x+20,y,117,136);
        g.fillStyle='#e2d7b4';g.font='10px monospace';
        g.fillText(String(i+1).padStart(2,'0')+' '+a.name.slice(0,21),x+2,y+153);
      });
      Object.assign(cv.style,{position:'fixed',left:0,top:0,zIndex:999999,
        maxWidth:'100vw',maxHeight:'100vh'});
      document.body.appendChild(cv);
    });
    await page.locator('#heavenly-gallery').screenshot({path:path.join(OUT_DIR,'heavenly_60_monsters.png')});
    await page.evaluate(()=>document.querySelector('#heavenly-gallery').remove());
  }catch(e){errors.push('[HEAVENLY] '+(e.stack||e));}
  report(errors);
  await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1;});
