// Visual QA for the Castle overworld: curtain wall, towers, gatehouse, postern, moat, courtyard and keep.
// Start server at repo root: python3 -m http.server 8123
// Run: node tools/tests/castle_visual.js [--mobile] [view,view,...]
// Screenshots: tools/tests/out/castle_<view>.png. Look at them: wall gaps and bad layering don't throw.
const {openGame,report}=require('./harness');
const mobile=process.argv.includes('--mobile'),only=(process.argv.slice(2).find(a=>!a.startsWith('--'))||'').split(',').filter(Boolean);
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
      if(G.world.map.w!==192||G.world.map.h!==176)throw Error('Castle must be the 2x-expanded world');
    });
    // [name, map x, map y, zoom] (map = 2x the 96x88 layout grid)
    const views=[
      ['overview',97,90,.26],
      ['approach',97,152,.62],
      ['gatehouse',97,146,1.0],
      ['gate_inside',97,126,1.0],
      ['courtyard',97,108,.62],
      ['corner_nw',58,42,.7],
      ['corner_ne',136,42,.7],
      ['corner_sw',58,136,.7],
      ['corner_se',136,136,.7],
      ['postern',124,34,.9],
      ['postern_bridge',124,26,.9],
      ['wall_walk_west',63,80,.9],
      ['wall_walk_south',80,132,.9],
      ['throne_hall',97,62,.8],
      ['cathedral',75,104,.8],
      ['great_hall',119,104,.8],
    ].filter(v=>!only.length||only.includes(v[0]));
    await page.waitForTimeout(2500);
    for(const [name,x,y,zoom] of views){
      try{
        await page.evaluate(async([x,y,zoom])=>{
          const {G}=window.VELSCOUR;
          const {camera}=await import('/src/core/view.js');
          const [px,py]=G.world.map.walkable(x,y)?[x,y]:G.world.map.randomNear(x,y,4);
          G.player.x=px;G.player.y=py;
          G.settings.zoom=1;camera.computeZoom();G.settings.zoom=zoom/camera.zoom;camera.computeZoom();
          G.world.darkK=0;G.world.night=false;camera.follow(x,y,0,true);
        },[x,y,zoom]);
        await page.waitForTimeout(500);
        await shot('castle_'+(mobile?'mobile_':'')+name);
      }catch(e){errors.push(name+': '+(e.stack||e));}
    }
  }catch(e){errors.push('CASTLE VISUAL: '+(e.stack||e));}
  report(errors);
  await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1;});
