// The ten Phobos / Castle Velscour dungeon biomes (data/phobosbiomes.js, packs from tools/phobostex.py): each builds,
// its tile set is its own pack (walls, arches, doors, floors, the rig's props), never in a bag; shots of the start
// room, a wall run and the exit with monsters removed.
// Usage: node tools/tests/phobos_biomes.js [ids,comma,separated] [depth]
const {openGame,report}=require('./harness');
const only=(process.argv[2]||'').split(',').filter(Boolean);
const depth=+(process.argv[3]||30);
(async()=>{
  const {browser,page,errors,shot}=await openGame({width:1280,height:720});
  try{
    await page.evaluate(async()=>{
      const {G,game}=window.VELSCOUR;
      await game.newChar('paladin','Phobos Survey');
      document.querySelectorAll('.screen').forEach(s=>s.remove());
      G.ui.modalCount=0;G.godMode=true;
    });
    const ids=await page.evaluate(async(only)=>{
      const {PHOBOS_BIOMES}=await import('/src/data/phobosbiomes.js');
      const {BIOMES,ACT_BIOMES,OVERWORLD_BIOME_IDS,drawBiome}=await import('/src/data/biomes.js');
      const ids=PHOBOS_BIOMES.map(b=>b.id), bad=[];
      for(const id of ids)if(BIOMES.some(b=>b.id===id)||Object.values(ACT_BIOMES).flat().includes(id)||OVERWORLD_BIOME_IDS.includes(id))bad.push(id);
      const c={};for(let i=0;i<400;i++){const id=drawBiome(c,1+(i%499));if(ids.includes(id))bad.push('drawn '+id);}
      if(bad.length)console.error('phobos biome in a bag: '+bad.join(' '));
      return ids.filter(id=>!only.length||only.includes(id));
    },only);
    for(const id of ids){
      const info=await page.evaluate(async([id,depth])=>{
        const {G,game}=window.VELSCOUR;
        const {BIOME_BY_ID}=await import('/src/data/biomes.js');
        const {loadBiomeArt}=await import('/src/core/assets.js');
        const b=BIOME_BY_ID[id];
        await loadBiomeArt(b);
        game.buildDungeon(depth,b);
        const w=G.world,ts=w.tileset;
        w.creatures=w.creatures.filter(c=>c===G.player||c.team===G.player.team);
        const near=(x,y)=>{
          for(let r=1;r<5;r+=0.5)for(let a=0;a<16;a++){
            const px=x+Math.cos(a*Math.PI/8)*r,py=y+Math.sin(a*Math.PI/8)*r;
            if(w.map.walkable(px,py))return [px+0.6,py+0.6];
          }
          return [G.player.x,G.player.y];
        };
        const spots=[[G.player.x,G.player.y]];
        const t=w.torches.find(t=>!t.front)||w.torches[0];
        if(t)spots.push(near(t.mountX??t.x,t.mountY??t.y));
        const ex=w.portals[1];if(ex)spots.push([ex.x,ex.y]);
        if(ts.pack!==id)console.error(id+': tile set is '+ts.pack);
        if(!ts.families.length||!ts.bases.length||!Object.keys(ts.arches).length||!Object.keys(ts.doors).length)console.error(id+': empty tile set parts');
        return {spots,pack:ts.pack,families:ts.families,arches:Object.keys(ts.arches),bases:ts.bases.length,features:ts.features.length,props:ts.scatter.length};
      },[id,depth]);
      console.log(id,JSON.stringify({...info,spots:undefined}));
      for(let i=0;i<info.spots.length;i++){
        await page.evaluate(([x,y])=>{const {G}=window.VELSCOUR;G.player.x=x;G.player.y=y;},info.spots[i]);
        await page.waitForTimeout(i?400:2500);
        await shot(`phobos_${id}_${i}`);
      }
    }
  }catch(e){errors.push('[PHOBOS] '+(e.stack||e));}
  report(errors);
  await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1;});
