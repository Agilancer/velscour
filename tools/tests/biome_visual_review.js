// Screenshot-based review of curated indoor and overworld palettes.
// From repo root: python3 -m http.server 8123
// Then: node tools/tests/biome_visual_review.js [--all] [--mobile]
// --all captures two clean character-anchored views of every biome.
const {openGame,report}=require('./harness');
const all=process.argv.includes('--all'),mobile=process.argv.includes('--mobile');
const shortlist=['catacombs','fungal','frozen','molten','obsidian','cathedral',
  'necropolis','desert_temple','ice_temple','hell','astral_plane','heavenly'];
(async()=>{
  const {browser,page,errors,shot}=await openGame(mobile
    ?{width:844,height:390,mobile:true}:{width:1440,height:900});
  try{
    await page.evaluate(async()=>{
      const {G,game}=window.VELSCOUR;
      await game.newChar('paladin','Biome Art QA');
      document.querySelectorAll('.screen').forEach(s=>s.remove());
      G.ui.modalCount=0;G.godMode=true;
    });
    const ids=all ? await page.evaluate(async()=>{
      const {BIOMES}=await import('/src/data/biomes.js');
      return BIOMES.map(b=>b.id);
    }) : shortlist;
    for(const id of ids){
      try{
        const review=await page.evaluate(async id=>{
          const {G,game}=window.VELSCOUR;
          const {BIOME_BY_ID}=await import('/src/data/biomes.js');
          const {A,loadBiomeArt,biomeTileSet}=await import('/src/core/assets.js');
          const {camera}=await import('/src/core/view.js');
          const biome=BIOME_BY_ID[id];
          if(id==='castle')await (await import('/src/gfx/castle.js')).loadCastlePack();
          else if(id==='sea_of_sand')
            await (await import('/src/gfx/seaofsand.js')).loadSeaOfSandPack();
          else await loadBiomeArt(biome);
          game.buildDungeon(15,biome);
          G.world.creatures.length=0;G.world.rebuildGrid();
          const meta=A.packs['expanded_'+id]?.meta;
          const set=biome.overworld?null:biomeTileSet(biome);
          const problems=[];
          if(!biome.overworld){
            if(id==='catacombs'){
              if(meta)problems.push('Catacombs master unexpectedly expanded');
            }else{
              if(!meta?.expansion)problems.push('Missing expanded pack');
              if(set?.bases.length<2||set?.bases.length>3)
                problems.push('Curated seamless base pool is inconsistent');
              if(!set?.features.length)problems.push('No authored floor details available');
              if(set?.scatter.length<2)problems.push('Not enough existing authored props');
            }
          }
          camera.zoom=1.12;camera.follow(G.player.x,G.player.y,0,true);
          return {problems,pack:set?.pack,bases:set?.bases.length,
            features:set?.features.length,scatter:set?.scatter.length,
            dimensions:[G.world.map.w,G.world.map.h]};
        },id);
        errors.push(...review.problems.map(x=>id+': '+x));
        await page.waitForTimeout(350);
        await shot('biome_curated_'+id+'_entry'+(mobile?'_mobile':''));
        const relocated=await page.evaluate(()=>{
          const {G}=window.VELSCOUR,map=G.world.map;
          const {camera}=window.VELSCOUR_VIEW||{};
          // Find a safe second area; no teleport into blocked masonry.
          const tx=Math.floor(map.w*.63),ty=Math.floor(map.h*.4);
          let best=null,bestDistance=Infinity;
          for(let y=2;y<map.h-2;y++)for(let x=2;x<map.w-2;x++){
            if(!map.walkableTile(x,y))continue;
            const d=(x-tx)**2+(y-ty)**2;
            if(d<bestDistance){bestDistance=d;best=[x+.5,y+.5];}
          }
          if(best){G.player.x=best[0];G.player.y=best[1];}
          return best;
        });
        await page.evaluate(async()=>{
          const {G}=window.VELSCOUR;
          const {camera}=await import('/src/core/view.js');
          camera.follow(G.player.x,G.player.y,0,true);
        });
        await page.waitForTimeout(300);
        await shot('biome_curated_'+id+'_secondary'+(mobile?'_mobile':''));
        console.log('review',id,JSON.stringify({...review,relocated}));
      }catch(e){errors.push('Visual '+id+': '+(e.stack||e));}
    }
  }catch(e){errors.push('BIOME REVIEW: '+(e.stack||e));}
  report(errors);await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1;});
