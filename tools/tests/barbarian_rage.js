// Barbarian Rage, dual wield, whirlwind variants, and Lancer shield revisions.
// From repo root: python3 -m http.server 8123; node tools/tests/barbarian_rage.js
const {openGame,report}=require('./harness');

(async()=>{
  const {browser,page,errors}=await openGame({width:844,height:390,mobile:true});
  try {
    const checks=await page.evaluate(async()=>{
      const problems=[];
      const {G,game}=window.VELSCOUR;
      const {SKILLS,manaCost}=await import('/src/data/skills.js');
      const {BIOME_BY_ID}=await import('/src/data/biomes.js');
      const {newCharData}=await import('/src/game/save.js');
      const {rollItem,fitsSlot,slotFor}=await import('/src/data/items.js');
      const {equipFromBag}=await import('/src/ui/inventory.js');
      const {Whirl}=await import('/src/game/hazards.js');
      const {SHIELD_ORBIT_RADIUS,preloadLancerShield,SHIELD_FRAME}=await import('/src/gfx/lancershields.js');
      const a=Object.values(SHIELD_ORBIT_RADIUS);
      if(a.length!==7 || new Set(a).size!==7)problems.push('Lancer orbit radii must all differ');
      for(const key of ['round','diamond','kite','tower']){
        const record=preloadLancerShield(key);
        try{await record.image.decode();}catch(e){problems.push('Shield failed to load '+key);continue;}
        for(let k=0;k<40&&!record.ready&&!record.error;k++)await new Promise(resolve=>setTimeout(resolve,25));
        // The turntable is the texture source of the 3D shield model (src/gfx/lancershields.js), so
        // check the model was built and every turntable frame has art (edge-on frames are thin).
        if(!record.model)problems.push('Shield model missing '+key);
        else{
          const can=document.createElement('canvas');
          can.width=record.image.naturalWidth;can.height=record.image.naturalHeight;
          const g=can.getContext('2d',{willReadFrequently:true});
          g.drawImage(record.image,0,0);
          const {data:d}=g.getImageData(0,0,can.width,can.height);
          for(let frame=0;frame<SHIELD_FRAME.count;frame++){
            const ox=(frame%4)*SHIELD_FRAME.w,oy=Math.floor(frame/4)*SHIELD_FRAME.h;
            let solid=0;
            for(let y=oy;y<oy+SHIELD_FRAME.h;y++)for(let x=ox;x<ox+SHIELD_FRAME.w;x++)
              if(d[(y*can.width+x)*4+3]>24)solid++;
            if(solid<20)problems.push('Shield frame empty '+key+' frame '+frame);
          }
        }
      }
      const c=newCharData('barbarian','Rage QA');
      if(c.rage!==0)problems.push('New Barbarian Rage should start at zero');
      if(!fitsSlot(c.equip.weapon,'offhand','barbarian'))problems.push('Barbarian dual wield rejected');
      if(fitsSlot(c.equip.weapon,'offhand','paladin'))problems.push('Other class dual wield allowed');
      if(slotFor(c.equip,c.equip.weapon,'barbarian')!=='offhand')problems.push('Auto slot must choose second weapon');
      const bash=SKILLS['barbarian.0.0'];
      const whirlwind=SKILLS['barbarian.0.4'];
      if(manaCost(whirlwind,1)!==0)problems.push('Whirlwind should consume Rage, not mana');
      for(const id of ['barbarian.2.13','barbarian.2.18']){
        const sk=SKILLS[id];
        if(sk.kind==='orbit'||sk.fx==='hammer')problems.push('Barbarian still has orbit hammer '+id);
      }
      await game.newChar('barbarian','Rage QA');
      G.godMode=true;
      game.buildDungeon(3,BIOME_BY_ID.catacombs);
      const p=G.player,w=G.world;
      p.char.skills[whirlwind.id]=20;
      p.char.skills[bash.id]=1;
      // Rage must begin empty and build through Bash rather than idle regeneration.
      p.rage=0;p.char.rage=0;p.update(1);
      if(p.rage!==0)problems.push('Idle regeneration must not generate Rage');
      p.castLock=0;
      const beforeBash=new Set(w.hazards);
      if(!p.tryUseSkill(bash,p.x+1,p.y))problems.push('Free Bash could not cast at 0 Rage');
      const bolts=w.hazards.filter(h=>!beforeBash.has(h) && h.o?.bashBolt);
      if(bolts.length!==5 || new Set(bolts.map(h=>h.ang.toFixed(3))).size!==5)problems.push('Bash must fire five directional lightning bolts');
      if(w.hazards.some(h=>!beforeBash.has(h) && h.fx==='hammer'))problems.push('Bash spawned an orbiting hammer');
      if(Math.abs(p.rage-3)>0.1)problems.push('Bash cast should earn small starter Rage');
      p.onHit(null,20,'phys',{sk:bash.id,rageCast:p.bashCastSerial});
      const afterHit=p.rage;
      if(afterHit<17.9)problems.push('Bash hit did not earn its bonus Rage');
      p.onHit(null,20,'light',{sk:bash.id,rageCast:p.bashCastSerial,bashBolt:true});
      if(Math.abs(p.rage-afterHit)>0.05)problems.push('Bash bolts granted duplicate Rage');
      p.onHit(null,20,'phys',{sk:'barbarian.0.1'});
      if(p.rage<=afterHit || p.rage>=afterHit+10)problems.push('Non-Bash attack Rage should be small');
      p.rage=100;p.char.rage=100;p.mana=0;p.castLock=0;
      const sp=p.speed;
      if(sp<5.2)problems.push('Barbarian move speed not boosted');
      const axe=rollItem(3,{slot:'weapon',base:'axe',rarity:0});
      p.char.bag[0]=axe;p.char.level=Math.max(p.char.level,axe.req||1);   // an ilvl-3 axe can require level 2
      if(!equipFromBag(0,'offhand'))problems.push('Cannot equip second axe');
      if(p.char.equip.offhand!==axe)problems.push('Offhand axe not installed');
      const cast=p.tryUseSkill(whirlwind,p.x+0.5,p.y+0.5);
      if(!cast || !(p.channel instanceof Whirl))problems.push('Whirlwind cast failed at 100 Rage');
      else{
        const wrl=p.channel;
        wrl.update(0.5);
        if(Math.abs(p.rage-95)>0.1)problems.push('Expected five Rage spent in half a second, got '+p.rage);
        // While spinning, follow autopilot waypoints instead of a stale aimed target.
        const oldMove=w.map.move,oldAim=p.aim,oldAuto=p.whirlAuto;
        p.whirlAuto=true;p.moveVec=[0,1];p.aim=[p.x-20,p.y-20];
        w.map.move=(who,dx,dy)=>{who.x+=dx;who.y+=dy;return true;};
        const startY=p.y;
        wrl.update(0.05);
        w.map.move=oldMove;p.moveVec=[0,0];p.aim=oldAim;p.whirlAuto=oldAuto;
        if(p.y<=startY)problems.push('Whirlwind ignored the navigation vector');
        const {spawn,particles}=await import('/src/gfx/vfx.js');
        const gib=spawn({type:'gib',x:p.x+0.5,y:p.y+0.3,z:14,life:2,size:3,w:1,color:'#a01010'});
        const oldGore=G.settings.gore;G.settings.gore=2;
        wrl.update(0.05);
        G.settings.gore=oldGore;
        if(!gib.vortex)problems.push('Whirlwind did not pull nearby gib into its cyclone');
        if(!particles.some(q=>q.vortex && !q.vortex.gib))problems.push('Whirlwind emitted no spiral particles');
        wrl.update(9.4);
        if(p.rage!==0||p.channel!==null)problems.push('Whirlwind did not end at empty Rage');
        p.update(1);
        if(p.rage!==0)problems.push('Rage regenerated after Whirlwind ended');
        if(Math.abs(p.char.rage-p.rage)>0.01)problems.push('Rage not included in save data');
      }
      // Allow the HUD to refresh rather than testing its pre-frame state.
      (await import('/src/ui/hud.js')).HUD.update(0.1);
      if(document.querySelector('#barbarian-rage')?.classList.contains('hidden'))problems.push('Rage HUD hidden');
      return {problems,character:p.char.classId,whirlwind:whirlwind.name,rage:p.rage,shieldRadii:a};
    });
    console.log('BARBARIAN + LANCER QA',JSON.stringify(checks));
    errors.push(...checks.problems);
  }catch(e){errors.push('BARBARIAN QA: '+(e.stack||e));}
  report(errors);
  await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1;});
