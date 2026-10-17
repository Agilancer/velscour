// World-wide biome, native-monster, and town fence regression suite.
// Requires local repo web server: python3 -m http.server 8123
// Usage: node tools/tests/worldwide_biomes.js [--all]
// Runs 7 representative full browser packs by default; --all renders every
// combat dungeon biome, which can take several minutes and high peak memory.
const fs=require('fs'),path=require('path');
const {openGame,report,OUT_DIR}=require('./harness');
const FULL=process.argv.includes('--all');
(async()=>{
  const {browser,page,errors,shot}=await openGame({width:1440,height:900});
  try{
    const result=await page.evaluate(async(full)=>{
      const {G,game}=window.VELSCOUR;
      await game.newChar('paladin','Worldwide Biome QA');
      document.querySelectorAll('.screen').forEach(s=>s.remove());
      G.ui.modalCount=0;G.godMode=true;
      const {BIOMES,BIOME_BY_ID,drawBiome,recordBiomeVisit}=await import('/src/data/biomes.js');
      const {BIOME_NATIVES,ART_BY_ID,rollLooks}=await import('/src/data/bestiary.js');
      const {A,loadBiomeArt,biomeTileSet}=await import('/src/core/assets.js');
      const {makeTownTiles}=await import('/src/world/town.js');
      const {generateOverworld}=await import('/src/world/overworld.js');
      const {enemyImage,loadArtFor}=await import('/src/core/enemyart.js');
      const {isoBarrier,BARRIER_STYLES}=await import('/src/gfx/isobarriers.js');
      const {TOWN_FLOOR_EXPANSION,OVERWORLD_FLOOR_EXPANSION}=await import('/src/gfx/biomeexpansion.js');
      const issues=[],stats={biomes:BIOMES.length,natives:BIOME_NATIVES.length,
        rendered:[],townFences:0,townFloors:0,townProps:0,wildFloors:0,wildProps:0,monsterImages:0};
      if(BIOMES.length*50!==BIOME_NATIVES.length)issues.push('50 native monsters per biome missing');
      if(new Set(BIOME_NATIVES.map(a=>a.id)).size!==BIOME_NATIVES.length)issues.push('Duplicate native monster ID');
      for(const b of BIOMES){
        const own=BIOME_NATIVES.filter(a=>a.homeBiome===b.id);
        if(own.length!==50)issues.push('Missing native monsters '+b.id);
        for(const a of own){
          if(!ART_BY_ID[a.sourceArt] || !b.roster.includes(a.arch))
            issues.push('Invalid native monster source/AI '+a.id);
        }
        const looks=rollLooks(b);
        for(const arch of b.roster)if(!looks.pick(arch))issues.push('No art for '+b.id+'/'+arch);
      }
      // The town is explicitly a safe zone. Validate across independent
      // rollTown() seeds, including physical segment orientation and no mirroring.
      for(const seed of [1337,262144,94317]){
        G.char.townSeed=seed;game.enterTown();
        const props=G.world.props;
        const rails=props.filter(p=>p.spr?.name?.startsWith('iso_'));
        stats.townFences+=rails.length;
        stats.townProps+=props.filter(p=>p.spr?.name?.startsWith('town_scatter_')).length;
        for(const f of rails){
          const s=f.spr;
          if(f.flip||!['x','y'].includes(s.axis)||!s.isometric)
            issues.push('Invalid fence flip/orientation seed '+seed);
          if(s.edgeB[1]-s.edgeA[1]!==40 ||
             Math.abs(s.edgeB[0]-s.edgeA[0])!==80)
            issues.push('Non-isometric fence projection '+s.name);
        }
        if(G.world.npcs.length<8)issues.push('Lost vendor at town seed '+seed);
        if((G.world.map.v||[]).some(v=>v>=makeTownTiles().length))
          issues.push('Bad town floor index seed '+seed);
      }
      stats.townFloors=makeTownTiles().length;
      if(stats.townFences===0)issues.push('No replacement fences ever appeared');
      if(stats.townProps!==0)issues.push('Procedurally drawn town terrain props reintroduced');
      if(stats.townFloors!==TOWN_FLOOR_EXPANSION.start+TOWN_FLOOR_EXPANSION.count)
        issues.push('Town floor atlas indices incorrect');
      // Validate all ten material families in both tile axes and their exact
      // 2:1 slope at native sprite resolution.
      for(const name of BARRIER_STYLES)for(const axis of ['x','y']){
        const s=isoBarrier(name,axis);
        if(!s.img||s.img.width!==160||s.img.height!==152||
           s.edgeB[1]-s.edgeA[1]!==40 ||
           s.edgeB[0]-s.edgeA[0] !== (axis==='x'?80:-80))
          issues.push('Bad '+name+' '+axis+' tileable barricade');
      }
      // The wilderness gets sixty *additional, wilderness-specific* floor
      // designs rather than borrowing the 24 Duskhollow accent tiles.
      const wild=BIOME_BY_ID.overworld;
      await loadBiomeArt(wild);
      const ow=generateOverworld(9,wild,904731);
      stats.wildFloors=ow.townTiles?.length||0;
      stats.wildProps=ow.props.filter(p=>p.spr?.name?.startsWith('overworld_wild_prop_')).length;
      if(stats.wildFloors!==stats.townFloors)
        issues.push('60 standalone wilderness tiles missing');
      if(stats.wildProps<10)issues.push('Generated wilderness props not used');
      if((ow.map.v||[]).some(v=>v>=stats.wildFloors))
        issues.push('Out-of-bounds wilderness floor index');
      // Use the original monster artwork loaded by the core asset pipeline,
      // then check new native sprite overlays are actual alpha images.
      const chosen=full?BIOMES.filter(b=>!b.overworld):
        BIOMES.filter(b=>['catacombs','necropolis','desert_temple',
          'heavenly','ice_temple','hell','astral_plane'].includes(b.id));
      const checkArt=[];
      for(const b of chosen){
        await loadBiomeArt(b);
        const id='expanded_'+b.id,pack=A.packs[id],m=pack?.meta;
        if(b.id==='catacombs'){
          if(pack)issues.push('Master Catacombs unexpectedly regenerated');
          const master=biomeTileSet(b);
          if(master.bases.length!==10||master.features.length<30)
            issues.push('Master Catacombs floor library was altered');
          game.buildDungeon(13,b);
          stats.rendered.push(b.id);
          continue;
        }
        if(!m?.expansion){issues.push('Missing expanded pack '+b.id);continue;}
        const nBase=m.expansion.floorStart,nScat=m.expansion.scatterStart;
        if(m.floors.length!==nBase+120||m.scatter.length!==nScat+40)
          issues.push('Incomplete terrain expansion '+b.id);
        if(m.floors.slice(nBase).filter(f=>f.seamless).length!==10)
          issues.push('Missing 10 extra base floors '+b.id);
        const set=biomeTileSet(b);
        if(set.bases.length<2||set.bases.length>3||set.features.length<1||set.features.length>25)
          issues.push('Curated paving selection missing in '+b.id);
        for(const [family,masks]of Object.entries(set.walls))
          for(let i=0;i<16;i++)if(!masks[i]?.length)
            issues.push('Missing wall mask '+b.id+'/'+family+'/'+i);
        for(const [design,dirs]of Object.entries(set.arches))
          for(const dir of ['NE','NW','SE','SW'])
            if(dirs[dir]?.length!==2*(set.archSpan[design]||3))
              issues.push('Invalid arch slices '+b.id+'/'+design+'/'+dir);
        for(const [design,dirs]of Object.entries(set.doors))
          for(const dir of ['NE','NW','SE','SW'])
            if(!dirs[dir]?.closed?.length || !dirs[dir]?.open?.some(v=>v.part==='leaf'))
              issues.push('Invalid opening door '+b.id+'/'+design+'/'+dir);
        if(set.floors.length>255)
          issues.push('Too many floors for Uint8Array tile variants '+b.id);
        if(m.scatter.slice(nScat).some(v=>v.x+v.w>pack.scatter.width||v.y+v.h>pack.scatter.height))
          issues.push('Scatter crop overflow '+b.id);
        game.buildDungeon(13,b);
        if(!G.world.boss)issues.push('Missing boss '+b.id);
        if(!G.world.map.walkable(G.player.x,G.player.y))
          issues.push('Player is inside blocked cell '+b.id);
        stats.rendered.push(b.id);
        checkArt.push(...BIOME_NATIVES.filter(a=>a.homeBiome===b.id&&!a.lone).slice(0,4).map(a=>a.id));
      }
      await loadArtFor(checkArt);
      for(const id of checkArt){
        const sprite=enemyImage(id);
        if(!sprite||!sprite._art||!Number.isFinite(sprite._art.fx))
          issues.push('Native artwork missing '+id);
        else stats.monsterImages++;
      }
      // Verify existing random bestiary remains possible and native
      // characters can travel to a foreign biome at reduced frequency.
      let owned=0,global=0,visitors=0,tries=0;
      for(let i=0;i<600;i++){
        const looks=rollLooks(BIOME_BY_ID.catacombs);
        for(const arch of BIOME_BY_ID.catacombs.roster){
          const picked=looks.pick(arch);
          const a=picked&&ART_BY_ID[picked.art];
          if(!a)continue;
          if(a.homeBiome==='catacombs')owned++;
          else if(a.homeBiome)visitors++;
          else global++;
          tries++;
        }
      }
      stats.spawnSamples={owned,global,visitors,tries};
      if(!owned||!global||!visitors||!(owned>global&&global>visitors))
        issues.push('Home/global/foreign native spawn weighting incorrect');
      for(let trial=0;trial<24;trial++){
        const hero={biomeBag:[],lastBiome:null,overworldMisses:0};
        for(let d=1;d<55;d++){
          const picked=drawBiome(hero,d);
          if(hero.overworldMisses>=3&&!BIOME_BY_ID[picked]?.overworld)
            issues.push('Forced overworld visit was bypassed');
          recordBiomeVisit(hero,BIOME_BY_ID[picked],d);
          hero.lastBiome=picked;
        }
      }
      if(drawBiome({overworldMisses:6},500)!=='throne')
        issues.push('Depth 500 not the final throne');
      return{stats,issues};
    },FULL);
    console.log('WORLD-WIDE BIOME QA',JSON.stringify(result));
    if(result.issues.length)errors.push(...result.issues);
    await page.waitForTimeout(750);
    await shot('worldwide_biomes_gameplay');
    await page.evaluate(async()=>{
      const {isoBarrier,BARRIER_STYLES}=await import('/src/gfx/isobarriers.js');
      const cv=document.createElement('canvas');cv.id='barrier-contact';
      cv.width=1440;cv.height=1120;const g=cv.getContext('2d');
      g.fillStyle='#171921';g.fillRect(0,0,1440,1120);
      g.fillStyle='#edc492';g.font='bold 24px monospace';
      g.fillText('ISOMETRIC BARRICADES: X and Y axes, 10 material families',30,38);
      for(let i=0;i<BARRIER_STYLES.length;i++){
        const name=BARRIER_STYLES[i],y=50+i*82;
        g.fillStyle='#fff2d5';g.font='16px monospace';g.fillText(name,25,y+37);
        for(let j=0;j<2;j++){
          const axis=j?'y':'x',s=isoBarrier(name,axis);
          for(let t=0;t<4;t++){
            // The exact 2:1 isometric projected step at 80% native size
            // is (+/-64,+32), matching this sprite's ±40×20 endpoints.
            const x0=j?895:215,dx=j?-64:64;
            g.drawImage(s.img,0,0,160,152,
              x0+t*dx,y-25+t*32,128,121);
          }
        }
      }
      Object.assign(cv.style,{position:'fixed',left:0,top:0,zIndex:999999,maxWidth:'100vw',maxHeight:'100vh'});
      document.body.appendChild(cv);
    });
    await page.locator('#barrier-contact').screenshot({path:path.join(OUT_DIR,'isometric_fences_and_barricades.png')});
  }catch(e){errors.push('[WORLDWIDE BIOMES] '+(e.stack||e));}
  report(errors);
  await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1;});
