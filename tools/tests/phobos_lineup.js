// ACT III sprite sizes against the rest of the game: rows of Phobos art (each category: folk, ward foes, castle foes,
// knights, creatures, ward and castle bosses, Velscour's forms) beside the hero and painted monsters of the older sets,
// frozen in place on a cleared floor; one shot per row. Usage: node tools/tests/phobos_lineup.js [perRow]
const {openGame,report}=require('./harness');
const per=+(process.argv[2]||8);
(async()=>{
  const {browser,page,errors,shot}=await openGame({width:1600,height:900});
  try{
    await page.evaluate(async()=>{const {G,game}=window.VELSCOUR;await game.newChar('paladin','Lineup');document.querySelectorAll('.screen').forEach(s=>s.remove());G.ui.modalCount=0;G.godMode=true;});
    const rows=await page.evaluate(async(per)=>{
      const {PHOBOS_ART}=await import('/src/data/phobos.js');const {BESTIARY}=await import('/src/data/bestiary.js');
      const cats=['gray','good','ward','castle','knight','creature','ward_boss','castle_boss','finale'];
      const pickN=(a,n)=>{const out=[],step=Math.max(1,Math.floor(a.length/n));for(let i=0;i<a.length&&out.length<n;i+=step)out.push(a[i]);return out;};
      const old=BESTIARY.filter(a=>!a.phobos&&!a.lone&&!a.boss&&!a.seaOfSand&&!a.breach&&!a.air&&!a.depthsEdge);
      const oldB=BESTIARY.filter(a=>a.boss&&!a.phobos&&!a.seaOfSand);
      return cats.map(c=>({c,ids:pickN(PHOBOS_ART.filter(a=>a.cat===c),per).map(a=>a.id),ref:pickN(c.includes('boss')||c==='finale'?oldB:old,3).map(a=>a.id)}));
    },per);
    for(const r of rows){
      const info=await page.evaluate(async(r)=>{
        const {G,game}=window.VELSCOUR;const {BIOME_BY_ID}=await import('/src/data/biomes.js');const {loadBiomeArt}=await import('/src/core/assets.js');
        const {loadArtFor}=await import('/src/core/enemyart.js');const {makeMonster}=await import('/src/game/monster.js');const {ART_BY_ID}=await import('/src/data/bestiary.js');
        const b=BIOME_BY_ID.ph_castle;await loadBiomeArt(b);game.buildDungeon(60,b);const w=G.world;
        w.creatures=w.creatures.filter(c=>c===G.player);w.hazards=[];
        await loadArtFor([...r.ids,...r.ref],true);
        // a straight run of floor for the line
        const m=w.map;let best=null;
        for(let y=4;y<m.h-4&&!best;y++)for(let x=4;x<m.w-24;x++){let ok=true;for(let k=0;k<20&&ok;k++)for(let d=-1;d<=1;d++)if(!m.walkable(x+k+0.5,y+d+0.5))ok=false;if(ok){best=[x,y];break;}}
        if(!best)return {err:'no floor'};
        const [x0,y0]=best;const all=[...r.ref.map(id=>[id,'normal']),...r.ids.map(id=>[id,(r.c.includes('boss')||r.c==='finale')?'boss':'normal'])];
        const rank=(id)=>id;void rank;
        G.player.x=x0+0.5;G.player.y=y0+0.5;
        const sizes=[];
        all.forEach(([id,rk],i)=>{const a=ART_BY_ID[id];const mm=makeMonster(w,a.arch,b,60,rk,x0+1.6+i*1.5,y0+0.5,0,{art:id,swap:null});mm.awake=false;mm.speed=0;mm.spd=0;mm.sight=0;mm.aggroR=0;w.add(mm);sizes.push([a.name.slice(0,18),a.h,+(mm.scale||1).toFixed(2)]);});
        return {sizes,at:[x0+6,y0]};
      },r);
      if(info.err){errors.push('[LINEUP] '+r.c+' '+info.err);continue;}
      console.log(r.c,JSON.stringify(info.sizes));
      await page.evaluate(([x,y])=>{const {G}=window.VELSCOUR;const {camera}=window.VELSCOUR.G;void camera;},info.at);
      await page.waitForTimeout(1500);await shot('phobos_lineup_'+r.c);
    }
  }catch(e){errors.push('[LINEUP] '+(e.stack||e));}
  report(errors);await browser.close();
})();
