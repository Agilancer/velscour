// Outdoor biome regression and QA screenshots:
//   node tools/tests/overworld.js
// Requires a local server and Playwright (tools/tests/harness.js).
const { openGame, report } = require('./harness');
(async()=>{
  const {browser,page,errors,shot}=await openGame({width:1366,height:900});
  try {
    await page.evaluate(async()=>{
      const {G,game}=window.VELSCOUR;
      await game.newChar('paladin','Outdoor QA');
      G.godMode=true;
      const {BIOME_BY_ID}=await import('/src/data/biomes.js');
      game.buildDungeon(13,BIOME_BY_ID.overworld);
      const s=G.world.overworldScenario;
      if(!s||G.world.map.w!==72||G.world.map.h!==72)throw Error('Overworld not built');
      G.world.creatures.length=0;G.world.rebuildGrid(); // keep visual captures free of stacked spawn labels
      G.player.x=s.shrine.x-2;G.player.y=s.shrine.y+2;
      const {camera}=await import('/src/core/view.js');
      camera.zoom=1.2;camera.follow(G.player.x,G.player.y,0,true);
    });
    await page.waitForTimeout(4000); // clear the depth intro before visual review
    await shot('overworld_shrine_and_forest');
    await page.evaluate(async()=>{
      const {G}=window.VELSCOUR; G.player.x=36.5;G.player.y=35.5;
      const {camera}=await import('/src/core/view.js');
      camera.zoom=.42;camera.follow(G.player.x,G.player.y,0,true);
    });
    await page.waitForTimeout(500);
    await shot('overworld_wide_layout');
    const stats=await page.evaluate(async()=>{
      const {G}=window.VELSCOUR;
      const {BIOME_BY_ID,drawBiome,recordBiomeVisit}=await import('/src/data/biomes.js');
      const {generateOverworld}=await import('/src/world/overworld.js');
      const {createOverworldScenario,SCENARIOS}=await import('/src/game/overworld.js');
      const {World}=await import('/src/game/world.js');
      const errors=[],b=BIOME_BY_ID.overworld;
      const locations=[ [63.5,9.5],[36.5,35.5],[20.5,20.5],[51.5,23.5],
        [21.5,49.5],[54.5,49.5],[36.5,17.5],[36.5,56.5],[16.5,35.5],[57.5,35.5] ];
      const oddMonuments=new Set(['ow_ancient_stone','ow_broken_column','ow_shattered_urn',
        'ow_ritual_candles','ow_forest_totem','ow_spectral_brazier','ow_stone_idol','ow_standing_stone']);
      let minTrees=Infinity,minClear=Infinity,maxProps=0;
      for(let seed=1;seed<=60;seed++){
        let gen;
        try{gen=generateOverworld(seed,b,(seed*193137)|0);}
        catch(e){errors.push('seed '+seed+': '+e.message);continue;}
        const m=gen.map,unblocked=m.block.reduce((n,v)=>n+!v,0);
        minClear=Math.min(minClear,unblocked);
        minTrees=Math.min(minTrees,gen.props.filter(p=>p.spr.name.startsWith('t_')).length);
        maxProps=Math.max(maxProps,gen.props.length);
        if(locations.some(([x,y])=>!m.walkable(x,y)))errors.push('unwalkable marker at '+seed);
        if(gen.buildings.some(b=>b.entryAxis!=='y'||!b.approach?.length||b.approach.some(([x,y],i,a)=>
          !m.walkable(x+.5,y+.5)||(i>0&&Math.abs(x-a[i-1][0])+Math.abs(y-a[i-1][1])!==1))))errors.push('invalid settlement approach at '+seed);
        if(m.v.some(v=>v>=126))errors.push('out-of-place floor accents at '+seed);
        if(gen.props.some(p=>oddMonuments.has(p.spr.name)))errors.push('random monument scatter at '+seed);
        if(gen.scenarioId<0||gen.scenarioId>=20)errors.push('invalid scenario id at '+seed);
      }
      if(minTrees<150)errors.push('too few forest wall trees');
      if(minClear<1800)errors.push('too little free combat space');

      // Verify the shuffle bag and the six-dungeon safety rule, including town
      // re-entry and the un-overridable throne at Depth 500.
      for(let run=0;run<50;run++){
        const hero={biomeBag:[],lastBiome:null,overworldMisses:0,overworldLastVisit:null};
        let count=0;
        for(let d=1;d<=100;d++){
          const biomeId=drawBiome(hero,d),pick=BIOME_BY_ID[biomeId];
          if(count>=6&&biomeId!=='overworld')errors.push('missed forced visit at '+d);
          if(biomeId===hero.lastBiome)errors.push('back-to-back biome repeat');
          recordBiomeVisit(hero,pick,d);
          count=biomeId==='overworld'?0:count+1;
          recordBiomeVisit(hero,pick,d);
          if(hero.overworldMisses!==count)errors.push('double-counted same depth '+d);
          hero.lastBiome=biomeId;
        }
      }
      if(drawBiome({overworldMisses:6},500)!=='throne')errors.push('overworld replaced throne');

      // Exercise 20 different scenario completions without requiring a full combat
      // soak. Foes use real Monster instances; deaths signal actual objective hooks.
      let complete=0;
      for(let id=0;id<20;id++){
        const gen=generateOverworld(13,b,471234+id*7313);
        gen.scenarioId=id;
        const world=new World('dungeon',{map:gen.map,depth:13,biome:b,props:gen.props,buildings:gen.buildings,looks:gen.looks});
        world.player={x:36.5,y:35.5,team:'player',dead:false};
        const sc=createOverworldScenario(world,gen,b,()=>complete++);
        sc.start();
        for(let t=0;t<2400&&!sc.completed&&!sc.failed;t++){
          for(const m of sc.foes)if(!m.dead){m.dead=true;m.onDeath&&m.onDeath();}
          for(const m of sc.markers.slice())m.use();
          if(sc.type==='zones'&&sc.route[sc.stage]){
            world.player.x=sc.route[sc.stage][0];world.player.y=sc.route[sc.stage][1];
          }else if(sc.type==='escort'&&sc.escort){
            world.player.x=sc.escort.x;world.player.y=sc.escort.y;
          }
          sc.update(.5);
        }
        if(!sc.completed||sc.failed)errors.push('scenario '+id+' '+SCENARIOS[id][0]+' did not complete');
      }
      return {seeds:60,scenarios:SCENARIOS.length,successfulScenarios:complete,
        minTrees,minClear,maxProps,errors};
    });
    console.log('overworld QA',JSON.stringify(stats));
    if(stats.errors.length||stats.successfulScenarios!==20) errors.push('[overworld] '+JSON.stringify(stats));
    await page.evaluate(()=>{const {G}=window.VELSCOUR;G.world.overworldScenario.start();G.world.creatures.length=0;G.world.rebuildGrid();});
    await page.waitForTimeout(400);
    await shot('overworld_active_scenario');
  }catch(e){errors.push('[overworld] '+(e.stack||e));}
  report(errors);
  await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1;});
