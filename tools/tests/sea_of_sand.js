// Sea of Sand art, cliff maze reachability, creature frames and live scenario HUD.
//   node tools/tests/sea_of_sand.js
// Requires the local HTTP server and Playwright (tools/tests/harness.js).
const { openGame, report } = require('./harness');
(async()=>{
  const {browser,page,errors,shot}=await openGame({width:1366,height:900});
  try {
    const stats=await page.evaluate(async()=>{
      const {loadSeaOfSandPack,seaOfSandFrames}=await import('/src/gfx/seaofsand.js');
      const {BIOME_BY_ID}=await import('/src/data/biomes.js');
      const {generateOverworld}=await import('/src/world/overworld.js');
      const {G,game}=window.VELSCOUR;
      await loadSeaOfSandPack();
      const errors=[],biome=BIOME_BY_ID.sea_of_sand;
      const counts={floor:60,scatter:40,tree:18,monster:60,boss:10,cliff:216};
      for(const [k,n] of Object.entries(counts))if(seaOfSandFrames(k).length!==n)errors.push(`${k} frames`);
      const locations=[];let areas=new Set(),minCliffs=Infinity;
      for(let n=1;n<=60;n++){
        const seed=n*32+1,gen=generateOverworld(13,biome,seed),m=gen.map,I=(x,y)=>y*m.w+x;
        areas.add(gen.scenarioCount);
        minCliffs=Math.min(minCliffs,gen.props.filter(p=>p.spr.cliff).length);
        const seen=new Uint8Array(m.w*m.h),q=[I(Math.floor(gen.start[0]),Math.floor(gen.start[1]))];seen[q[0]]=1;
        for(let n=0;n<q.length;n++){const i=q[n],x=i%m.w,y=(i/m.w)|0;for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,j=I(nx,ny);if(m.walkableTile(nx,ny)&&!seen[j]){seen[j]=1;q.push(j);}}}
        if([gen.exit,...gen.scenarioSites].some(([x,y])=>!seen[I(Math.floor(x),Math.floor(y))]))errors.push(`unreachable objective seed ${seed}`);
      }
      if(areas.size!==5)errors.push('did not generate each area count from one to five');
      if(minCliffs<100)errors.push('cliff maze was too sparse');
      await game.newChar('paladin','Sand QA');G.godMode=true;
      game.buildDungeon(13,biome);
      const run=G.world.overworldScenario;
      if(!run||run.total<1||run.total>5)errors.push('missing linked scenario run');
      run.current.start();run.update(.5);
      const hud=run.hud;
      if(!hud.timer||!hud.progress)errors.push('live timer or progress is missing');
      const sandIds=(await import('/src/data/seaofsand.js')).SAND_CREATURES.map(x=>'ss_'+x[0]);
      const {enemyArtReady}=await import('/src/core/enemyart.js');
      if(sandIds.some(id=>!enemyArtReady(id)))errors.push('a monster atlas frame did not resolve');
      return {counts,areas:[...areas].sort(),minCliffs,total:run.total,hud,errors};
    });
    console.log('Sea of Sand QA',JSON.stringify(stats));
    if(stats.errors.length)errors.push('[sea_of_sand] '+JSON.stringify(stats.errors));
    await page.waitForTimeout(500);
    await shot('sea_of_sand_scenario_hud');
  }catch(e){errors.push('[sea_of_sand] '+(e.stack||e));}
  report(errors);
  await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1;});
