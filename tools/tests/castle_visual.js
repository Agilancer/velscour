// Visual QA for the Castle overworld: curtain wall, towers, gatehouse, postern, moat, courtyard and keep.
// Start server at repo root: python3 -m http.server 8123
// Run: node tools/tests/castle_visual.js [--mobile] [view,view,...]
// Screenshots: tools/tests/out/castle_<view>.png. Look at them: wall gaps and bad layering don't throw.
const {openGame,report}=require('./harness');
const mobile=process.argv.includes('--mobile'),grid=process.argv.includes('--grid'),only=(process.argv.slice(2).find(a=>!a.startsWith('--'))||'').split(',').filter(Boolean);
(async()=>{
  const {browser,page,errors,shot}=await openGame(mobile
    ?{width:844,height:390,mobile:true}:{width:1440,height:900});
  try{
    await page.evaluate(async()=>{
      const {G,game}=window.VELSCOUR;
      try{await game.newChar('paladin','Castle Visual QA');}catch(e){console.warn('town setup: '+e.message);}  // only the castle matters here
      await (await import('/src/gfx/castle.js')).loadCastlePack();
      G.char.depth=19;G.godMode=true;
      const {BIOME_BY_ID}=await import('/src/data/biomes.js');
      game.buildDungeon(19,BIOME_BY_ID.castle);
      G.world.creatures.length=0;G.world.npcs.length=0;G.world.rebuildGrid();
      if(G.world.map.w!==336||G.world.map.h!==304)throw Error('Castle must be the 336 x 304 board');
    });
    // [name, map x, map y, zoom] (tiles)
    const views=[
      ['overview',169,140,.16],['door_th',156,118,1.4],['door_th2',144,134,1.4],['door_ch',182,118,1.4],['door_gh',156,154,1.4],['door_gh2',144,140,1.4],['approach',169,232,.6],['gatehouse',169,214,1.0],['bridge',169,208,1.5],['gate_inside',169,190,.9],
      ['bailey',148,186,.7],['inner_gate',193,178,.9],['courtyard',174,156,.7],['keep',170,126,.6],['throne_hall',141,117,.8],
      ['cathedral',196,117,.8],['great_hall',141,155,.8],['corner_nw',96,68,.7],['corner_se',241,201,.7],['inner_corner',124,96,.8],
      ['postern',209,64,.9],['river_bridge',285,153,.8],['village',169,252,.7],['siege',262,236,.6],['graveyard',56,176,.7],
      ['stables',112,140,.8],['mason',222,128,.8],['forest',169,284,.7],['garden_north',130,82,.8],['moat_west',90,140,1.0],
    ].filter(v=>!only.length||only.includes(v[0]));
    await page.waitForTimeout(2500);
    for(const [name,x,y,zoom] of views){
      try{
        await page.evaluate(async([x,y,zoom,grid])=>{
          const {G}=window.VELSCOUR;
          const {camera}=await import('/src/core/view.js');
          const [px,py]=G.world.map.walkable(x,y)?[x,y]:G.world.map.randomNear(x,y,4);
          G.player.x=px;G.player.y=py;
          G.settings.zoom=1;camera.computeZoom();G.settings.zoom=zoom/camera.zoom;camera.computeZoom();
          G.world.darkK=0;G.world.night=false;G.world.raining=false;camera.follow(x,y,0,true);G.debugWalk=grid;
        },[x,y,zoom,grid]);
        await page.waitForTimeout(500);
        await shot('castle_'+(mobile?'mobile_':'')+name);
      }catch(e){errors.push(name+': '+(e.stack||e));}
    }
  }catch(e){errors.push('CASTLE VISUAL: '+(e.stack||e));}
  report(errors);
  await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1;});
