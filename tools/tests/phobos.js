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
    // HAIL VELSCOUR!'s list: Act III's places in their own group, labelled, and they take you there
    const menu=await page.evaluate(()=>{const {game}=window.VELSCOUR;game.openVelscourTeleport();const sel=document.querySelector('#velscour-biome'),g=sel&&sel.querySelector('optgroup');return {group:g&&g.label,opts:g?[...g.querySelectorAll('option')].map(o=>o.textContent):[],cv:[...sel.querySelectorAll('option')].filter(o=>/^cv_|phobos_city/.test(o.value)).length};});
    console.log('hail',JSON.stringify(menu));
    if(!/Act III/.test(menu.group||'')||menu.opts.length<12)errors.push('[HAIL] no Act III group: '+JSON.stringify(menu));
    if(menu.cv)errors.push('[HAIL] raw castle biomes still listed: '+menu.cv);
    await page.evaluate(()=>{document.querySelector('#velscour-biome').size=16;});await shot('phobos_hail_list');
    await page.evaluate(()=>{const sel=document.querySelector('#velscour-biome');sel.value='act3:f41';[...document.querySelectorAll('.velscour-teleport-dialog button')].find(b=>b.textContent==='Teleport').click();});
    await T(4000);
    const went=await page.evaluate(()=>{const {G}=window.VELSCOUR;return {floor:G.phobosFloor,biome:G.world.biome.id};});
    console.log('hail went',JSON.stringify(went));if(went.floor!==41)errors.push('[HAIL] the library pick went to '+JSON.stringify(went));
    await shot('phobos_hail_library');
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
    for(const x of [30,60,86,100]){await page.evaluate(async(x)=>{const {G}=window.VELSCOUR,m=G.world.map,{toMap}=await import('/src/world/phobos.js');for(let d=0;d<40;d++)for(const s of [1,-1]){const [mx,my]=toMap(x+0.5,102.5+s*d);if(m.walkable(mx,my)){G.player.x=mx;G.player.y=my;return;}}},x);await T(1200);await shot('phobos_road_'+x);}
    // walk the King's Mile: a few spots east, monsters cleared so the shots show the streets
    for(const fx of [0.4,0.5,0.62,0.78,0.93]){
      await page.evaluate(async(fx)=>{const {G}=window.VELSCOUR,m=G.world.map,{toMap,PW}=await import('/src/world/phobos.js');for(let d=0;d<30;d++)for(const s of [1,-1]){const [mx,my]=toMap(Math.floor(PW*fx)+0.5,102.5+s*d);if(m.walkable(mx,my)){G.player.x=mx;G.player.y=my;return;}}},fx);
      await T(900);await shot('phobos_city_'+Math.round(fx*100));
    }
    // the streets talk: folk walk and chat, the occupiers grumble and taunt, an errand pays (game/phobostalk.js)
    const talk=await page.evaluate(async()=>{const {G}=window.VELSCOUR,w=G.world,{kill}=await import('/src/game/combat.js');
      const f=w.npcs.find(n=>n.errand&&n.errand.state==='offer'&&w.creatures.some(c=>c.talks&&!c.dead&&Math.hypot(c.x-n.x,c.y-n.y)<10));if(!f)return {err:'no errand giver near foes'};
      G.player.x=f.x+1.2;G.player.y=f.y;const at=w.npcs.filter(n=>n.folk).map(n=>[n.x,n.y]);const seen=new Set();let foe=0,folk=0;
      for(let i=0;i<360;i++){await new Promise(r=>setTimeout(r,50));for(const c of w.creatures)if(c.talks&&c.talkT>0&&!seen.has('c'+c.talkText)){seen.add('c'+c.talkText);foe++;}for(const n of w.npcs)if(n.talkT>0&&!seen.has('n'+n.talkText)){seen.add('n'+n.talkText);folk++;}}
      const moved=w.npcs.filter(n=>n.folk).filter((n,i)=>Math.hypot(n.x-at[i][0],n.y-at[i][1])>1).length;
      const e=f.errand;e.state='active';const g0=G.char.gold;
      for(const m of w.creatures.filter(c=>c.talks&&!c.dead&&c.district===e.district&&!c.wardLord).slice(0,e.need))kill(m,G.player);
      await new Promise(r=>setTimeout(r,300));f.use();
      return {foe,folk,moved,errand:e.state,gold:G.char.gold-g0,got:e.got,need:e.need,lines:[...seen].slice(0,6)};});
    console.log('talk',JSON.stringify(talk));await shot('phobos_talk');
    if(talk.err)errors.push('[TALK] '+talk.err);else{if(talk.foe<2)errors.push('[TALK] the occupiers said only '+talk.foe+' lines');if(talk.folk<1)errors.push('[TALK] the folk said nothing');if(talk.moved<5)errors.push('[TALK] only '+talk.moved+' folk walked');if(talk.errand!=='paid'||talk.gold<=0)errors.push('[TALK] the errand did not pay: '+talk.errand);}
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
