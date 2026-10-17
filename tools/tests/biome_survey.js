// Visual survey of every dungeon biome for art review: screenshots of the start
// room, a torch wall, a wall hanging and the exit, with monsters removed.
// Usage: node tools/tests/biome_survey.js [ids,comma,separated] [depth] [prefix]
const {openGame,report}=require('./harness');
const only=(process.argv[2]||'').split(',').filter(Boolean);
const depth=+(process.argv[3]||13), prefix=process.argv[4]||'survey';
(async()=>{
  const {browser,page,errors,shot}=await openGame({width:1280,height:720});
  try{
    await page.evaluate(async()=>{
      const {G,game}=window.VELSCOUR;
      await game.newChar('paladin','Biome Survey');
      document.querySelectorAll('.screen').forEach(s=>s.remove());
      G.ui.modalCount=0;G.godMode=true;
    });
    const ids=await page.evaluate(async(only)=>{
      const {BIOMES}=await import('/src/data/biomes.js');
      return BIOMES.filter(b=>!b.overworld&&(!only.length||only.includes(b.id))).map(b=>b.id);
    },only);
    for(const id of ids){
      const info=await page.evaluate(async([id,depth])=>{
        const {G,game}=window.VELSCOUR;
        const {BIOME_BY_ID}=await import('/src/data/biomes.js');
        const {loadBiomeArt}=await import('/src/core/assets.js');
        const b=BIOME_BY_ID[id];
        await loadBiomeArt(b);
        game.buildDungeon(depth,b);
        const w=G.world;
        w.creatures=w.creatures.filter(c=>c===G.player||c.team===G.player.team);
        // stand on the room side of a wall mount, a couple of tiles out
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
        const h=w.wallHangings[(w.wallHangings.length/3)|0];
        if(h)spots.push(near(h.mountX,h.mountY));
        const ex=w.portals[1];if(ex)spots.push([ex.x,ex.y]);
        const pr=w.props.filter(p=>p.spr)[(w.props.length/2)|0];
        if(pr)spots.push(near(pr.x,pr.y));
        return {spots,torches:w.torches.length,hangings:w.wallHangings.length,
          hangFront:w.wallHangings.filter(h=>h.front).length,pack:w.tileset?.pack};
      },[id,depth]);
      console.log(id,JSON.stringify({...info,spots:undefined}));
      for(let i=0;i<info.spots.length;i++){
        await page.evaluate(([x,y])=>{const {G}=window.VELSCOUR;G.player.x=x;G.player.y=y;},info.spots[i]);
        await page.waitForTimeout(i?300:3600);
        await shot(`${prefix}_${id}_${i}`);
      }
    }
  }catch(e){errors.push('[SURVEY] '+(e.stack||e));}
  report(errors);
  await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1;});
