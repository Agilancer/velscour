// Visual QA for castle scale, connected battlements, open gateways and keep.
// Start server at repo root: python3 -m http.server 8123
// Run: node tools/tests/castle_visual.js [--mobile]
const {openGame,report}=require('./harness');
const mobile=process.argv.includes('--mobile');
(async()=>{
  const {browser,page,errors,shot}=await openGame(mobile
    ?{width:844,height:390,mobile:true}:{width:1440,height:900});
  try{
    await page.evaluate(async()=>{
      const {G,game}=window.VELSCOUR;
      await game.newChar('paladin','Castle Visual QA');
      await (await import('/src/gfx/castle.js')).loadCastlePack();
      G.char.depth=19;G.godMode=true;
      const {BIOME_BY_ID}=await import('/src/data/biomes.js');
      game.buildDungeon(19,BIOME_BY_ID.castle);
      G.world.creatures.length=0;G.world.rebuildGrid();
      if(G.world.map.w!==192||G.world.map.h!==176)
        throw Error('Castle must be the 2x-expanded world');
    });
    const views=[
      ['south_drawbridge',97,137,1.05],
      ['north_postern',85,54,1.0],
      ['west_postern',61,74,1.0],
      ['east_postern',133,74,1.0],
      ['curtain_wall',80,53,.95],
      ['rampart_stairs',85,47,1.0],
      ['throne_hall',94,82,1.02],
      ['cathedral',70,102,1.02],
      ['great_hall',100,110,1.02],
      ['whole_keep',94,91,.47],
    ];
    await page.waitForTimeout(2700);
    for(const [name,x,y,zoom] of views){
      try{
        const stats=await page.evaluate(async([x,y,zoom])=>{
          const {G}=window.VELSCOUR;
          const {camera}=await import('/src/core/view.js');
          const [px,py]=G.world.map.walkable(x,y)
            ?[x,y]:G.world.map.randomNear(x,y,2.5);
          G.player.x=px;G.player.y=py;
          camera.zoom=zoom;camera.follow(px,py,0,true);
          const p=G.world.props.filter(o=>Math.hypot(o.x-px,o.y-py)<14);
          return {location:[px,py],nearby:p.length,
            tallFurniture:p.filter(o=>o.spr.category==='furniture'
              &&o.spr.h*o.k>100).map(o=>o.spr.name)};
        },[x,y,zoom]);
        if(stats.tallFurniture.length)
          errors.push(name+': oversized furnishing '+stats.tallFurniture.join(','));
        await page.waitForTimeout(450);
        await shot('castle_corrected_'+(mobile?'mobile_':'')+name);
        console.log(name,JSON.stringify(stats));
      }catch(e){errors.push(name+': '+(e.stack||e));}
    }
  }catch(e){errors.push('CASTLE VISUAL: '+(e.stack||e));}
  report(errors);
  await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1;});
