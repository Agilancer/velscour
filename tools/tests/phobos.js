// ACT III (docs/PHOBOS.md): Bellmourn, City State Phobos and Castle Velscour. Bellmourn's waypoints and folk; Phobos
// builds, its gate is sealed until the ward lords fall, folk wear their art; castle floors of every layout family build
// and reach their exit; the wing raid bosses and Lord Velscour's three battles cast every phase (god mode); shots.
// Usage: node tools/tests/phobos.js [floors,comma] [noraid | raids=10,20,100c,100o,100x]
const {openGame,report}=require('./harness');
const floors=(process.argv[2]||'1,2,3,4,5,9,13,27,34,48,55,61,77,83,95').split(',').map(Number);
const noraid=process.argv.includes('noraid');
const rarg=(process.argv.find(a=>a.startsWith('raids='))||'').slice(6).split(',').filter(Boolean);
(async()=>{
  const {browser,page,errors,shot}=await openGame({width:1280,height:720});
  const T=(ms)=>page.waitForTimeout(ms);
  try{
    await page.evaluate(async()=>{
      const {G,game}=window.VELSCOUR;
      await game.newChar('paladin','Act Three');
      document.querySelectorAll('.screen').forEach(s=>s.remove());
      G.ui.modalCount=0;G.godMode=true;G.char.level=90;G.player.recompute();
    });
    // Bellmourn
    const bell=await page.evaluate(async()=>{const {G,game}=window.VELSCOUR;game.enterBellmourn();return {portals:G.world.portals.map(p=>p.label),npcs:G.world.npcs.filter(n=>n.enemyArt).length};});
    console.log('bellmourn',JSON.stringify(bell));
    await T(2500);await shot('phobos_bellmourn');
    // Phobos
    await page.evaluate(async()=>{const {game}=window.VELSCOUR;await game.enterPhobos();});
    const city=await page.evaluate(()=>{const {G}=window.VELSCOUR,w=G.world,sc=w.overworldScenario;
      const ex=w.portals.find(p=>p.type==='exit');
      return {w:w.map.w,h:w.map.h,mobs:w.creatures.filter(c=>c.team!==G.player.team).length,lords:w.creatures.filter(c=>c.wardLord).length,folk:w.npcs.filter(n=>n.enemyArt).length,gate:ex.active,label:ex.label,obj:!!sc.objective,start:[G.player.x,G.player.y]};});
    console.log('phobos',JSON.stringify(city));
    if(city.gate)errors.push('[PHOBOS] the Castle Gate starts open');
    if(city.lords<12)errors.push('[PHOBOS] only '+city.lords+' ward lords');
    await T(2500);await shot('phobos_city_marches');
    // the road in: the Marches, the Chasm, the Sill, the moat plain (green to dead)
    for(const x of [30,60,86,100]){await page.evaluate((x)=>{const {G}=window.VELSCOUR,m=G.world.map;for(let d=0;d<40;d++)for(const s of [1,-1]){const y=102+s*d;if(m.walkable(x+0.5,y+0.5)){G.player.x=x+0.5;G.player.y=y+0.5;return;}}},x);await T(1200);await shot('phobos_road_'+x);}
    // walk the King's Mile: a few spots east, monsters cleared so the shots show the streets
    for(const fx of [0.4,0.5,0.62,0.78,0.93]){
      await page.evaluate((fx)=>{const {G}=window.VELSCOUR,w=G.world,m=w.map;const y=Math.floor(m.h/2);for(let d=0;d<30;d++)for(const s of [1,-1]){const x=Math.floor(m.w*fx),yy=y+s*d;if(m.walkable(x+0.5,yy+0.5)){G.player.x=x+0.5;G.player.y=yy+0.5;return;}}},fx);
      await T(900);await shot('phobos_city_'+Math.round(fx*100));
    }
    // ward lords slain open the gate
    await page.evaluate(async()=>{const {G}=window.VELSCOUR;const {kill}=await import('/src/game/combat.js');for(const m of G.world.creatures.filter(c=>c.wardLord).slice(0,12))kill(m,G.player);});
    const g2=await page.evaluate(()=>{const {G}=window.VELSCOUR;return G.char.phobos.gate;});
    if(!g2)errors.push('[PHOBOS] the gate stayed shut after 12 ward lords');
    // castle floors
    for(const f of floors){
      const r=await page.evaluate(async(f)=>{const {G,game}=window.VELSCOUR;await game.enterCastleFloor(f);const w=G.world,m=w.map,ex=w.portals.find(p=>p.type==='exit');
        const path=m.findPath?m.findPath(G.player.x,G.player.y,ex.x,ex.y,400000):null;
        return {f,biome:w.biome.id,layout:G.phobosLayout,size:[m.w,m.h],mobs:w.creatures.filter(c=>c.team!==G.player.team).length,boss:w.boss&&w.boss.name,raid:!!w.raid,leaps:(w.hazards||[]).filter(h=>h.L).length,path:path?path.length:null};},f);
      console.log('floor',JSON.stringify(r));
      await T(1800);await shot('phobos_floor_'+f);
    }
    // raids: every wing boss + Velscour's three battles, each phase
    if(!noraid){
      const wings=[10,20,30,40,50,60,70,80,90];
      const V={c:'crimson',o:'obsidian',x:'cathedral'};
      const runs=rarg.length?rarg.map(r=>[parseInt(r),V[r.slice(-1)]||null]):[...wings.map(f=>[f,null]),[100,'crimson'],[100,'obsidian'],[100,'cathedral']];
      for(const [f,v] of runs){
        await page.evaluate(async([f,v])=>{const {G,game}=window.VELSCOUR;G.velscourVariant=v;await game.enterCastleFloor(f);const b=G.world.boss,A=G.world.raid?G.world.raid.arena:null;G.player.x=A?A.cx-5:b.x-6;G.player.y=A?A.cy:b.y;b.awake=true;b.aggro=G.player;},[f,v]);
        for(let ph=0;ph<4;ph++){
          await page.evaluate((ph)=>{const {G}=window.VELSCOUR,b=G.world.boss;b.hp=b.maxHp*[1,0.7,0.44,0.18][ph];},ph);
          for(let k=0;k<45;k++){await T(1000);if(await page.evaluate(async([ph,k])=>{const {G}=window.VELSCOUR,R=G.world.raid;if(R&&R.inter&&k>3){const {kill}=await import('/src/game/combat.js');for(const c of G.world.creatures)if(!c.dead&&c!==R.m&&c.team!==G.player.team&&c.hp<R.m.maxHp*0.2)kill(c,G.player);}return !R||(R.pi>=ph&&!R.inter);},[ph,k]))break;}
          await T(2500);
          if(ph===1||ph===3)await shot(`phobos_raid_${f}${v?'_'+v:''}_p${ph+1}`);
        }
        if(!await page.evaluate(()=>{const R=window.VELSCOUR.G.world.raid;return !R||R.pi===3;}))errors.push(`[PHOBOS] ${f}${v||''} never reached phase 4`);
        const res=await page.evaluate(async()=>{const {G}=window.VELSCOUR,b=G.world.boss,R=G.world.raid;const {kill}=await import('/src/game/combat.js');const pi=R?R.pi:null;kill(b,G.player);return {name:R?R.tpl.name:b.name,pi};});
        await T(600);
        const won=await page.evaluate(()=>{const {G}=window.VELSCOUR;const b=G.world.boss;return {dead:b.dead,exit:G.world.portals.find(p=>p.type==='exit').active};});
        if(!won.exit)errors.push('[PHOBOS] floor '+f+' exit stayed sealed');
        console.log('raid',f,v||'',JSON.stringify(res),JSON.stringify(won));
      }
    }
  }catch(e){errors.push('[PHOBOS] '+(e.stack||e));}
  report(errors);
  await browser.close();
})();
