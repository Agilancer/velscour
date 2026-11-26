// The Act III climb (game/climb.js): auto-play on a castle floor takes the stair up (never a random dungeon), heads home
// at a climb goal (every 10th floor) and to resupply (and resumes after), tries the climb from town every few trips when
// its gear score is up to it, and not again at the same gear after a fall.
// Usage: node tools/tests/climb.js
const {openGame,report}=require('./harness');
(async()=>{
  const {browser,page,errors}=await openGame({width:1280,height:720});
  const T=(ms)=>page.waitForTimeout(ms);
  try{
    await page.evaluate(async()=>{const {G,game}=window.VELSCOUR;await game.newChar('paladin','Climber');document.querySelectorAll('.screen').forEach(s=>s.remove());G.ui.modalCount=0;G.godMode=true;G.char.level=90;G.player.recompute();});
    const leave=async(f)=>page.evaluate(async(f)=>{const {G,game}=window.VELSCOUR,{Auto}=await import('/src/game/autoplay.js'),{phobosState}=await import('/src/game/phobos.js');
      const S=phobosState();S.gate=true;S.city=true;await game.enterCastleFloor(f);const w=G.world;w.boss.dead=true;w.onBossKilled(w.boss);
      for(const p of G.char.potions||[])void p;Auto.needTown=()=>false;await Auto.leaveLevel(w);await new Promise(r=>setTimeout(r,3500));
      delete Auto.needTown;return {floor:G.phobosFloor,kind:G.world.kind,castle:G.world.castleFloor||0,on:S.climb&&S.climb.on};},f);
    const a=await leave(3);console.log('floor 3 ->',JSON.stringify(a));
    if(a.castle!==4)errors.push('[CLIMB] auto-play left floor 3 for '+JSON.stringify(a));
    const b=await leave(10);console.log('floor 10 ->',JSON.stringify(b));
    if(b.kind!=='town'||b.on)errors.push('[CLIMB] the climb goal at floor 10 did not send it home: '+JSON.stringify(b));
    const q=await page.evaluate(async()=>{const {G}=window.VELSCOUR,C=await import('/src/game/climb.js'),{phobosState}=await import('/src/game/phobos.js'),S=phobosState();
      S.climb.trips=0;const early=C.climbNext();S.climb.trips=3;const lvl=C.climbLevel(),gs=C.gearScore();
      const weak=C.climbNext();for(const k in G.char.equip){const it=G.char.equip[k];if(it){it.ilvl=lvl+10;}}const strong=C.climbNext();
      G.world.castleFloor=0;S.climb.on=false;C.climbDied();S.climb.trips=3;const after=C.climbNext();
      for(const k in G.char.equip){const it=G.char.equip[k];if(it)it.ilvl+=5;}const better=C.climbNext();
      return {lvl,gs,early,weak,strong,after,better,floor:S.floor};});
    console.log('town picks',JSON.stringify(q));
    if(q.early)errors.push('[CLIMB] tried the climb before its trips were up');
    if(q.gs<q.lvl-6&&q.weak)errors.push('[CLIMB] weak gear still climbs');
    if(!q.strong||q.strong.floor!==11)errors.push('[CLIMB] strong gear does not resume at floor 11: '+JSON.stringify(q.strong));
    if(!q.better)errors.push('[CLIMB] better gear after a fall never tries again');
    // mid-wing resupply: home, then straight back up
    const r=await page.evaluate(async()=>{const {G,game}=window.VELSCOUR,{Auto}=await import('/src/game/autoplay.js'),C=await import('/src/game/climb.js'),{phobosState}=await import('/src/game/phobos.js'),S=phobosState();
      await game.enterCastleFloor(13);const w=G.world;w.boss.dead=true;w.onBossKilled(w.boss);Auto.needTown=()=>true;await Auto.leaveLevel(w);await new Promise(r=>setTimeout(r,3500));delete Auto.needTown;
      S.climb.trips=0;return {kind:G.world.kind,on:S.climb.on,next:C.climbNext()};});
    console.log('resupply',JSON.stringify(r));
    if(r.kind!=='town'||!r.on||!r.next||r.next.floor!==14)errors.push('[CLIMB] resupply did not resume: '+JSON.stringify(r));
  }catch(e){errors.push(String(e.stack||e));}
  await report(browser,errors);
})();
