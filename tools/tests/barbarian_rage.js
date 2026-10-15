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
        await new Promise(resolve=>setTimeout(resolve,0));
        if(!record.atlas)problems.push('Shield opaque atlas missing '+key);
        else{
          const can=document.createElement('canvas');
          can.width=record.atlas.width;can.height=record.atlas.height;
          const g=can.getContext('2d',{willReadFrequently:true});
          g.drawImage(record.atlas,0,0);
          const {data:d}=g.getImageData(0,0,can.width,can.height);
          for(let frame=0;frame<SHIELD_FRAME.count;frame++){
            const ox=(frame%4)*SHIELD_FRAME.w,oy=Math.floor(frame/4)*SHIELD_FRAME.h;
            for(let y=oy;y<oy+SHIELD_FRAME.h;y++){
              let first=-1,last=-1;
              for(let x=ox;x<ox+SHIELD_FRAME.w;x++){
                const alpha=d[(y*can.width+x)*4+3];
                if(alpha>24){if(first<0)first=x;last=x;}
              }
              for(let x=first;x<=last;x++)if(d[(y*can.width+x)*4+3]!==255){
                problems.push('Shield interior alpha '+key+' frame '+frame);break;
              }
            }
          }
        }
      }
      const c=newCharData('barbarian','Rage QA');
      if(c.rage!==0)problems.push('New Barbarian Rage should start at zero');
      if(!fitsSlot(c.equip.weapon,'offhand','barbarian'))problems.push('Barbarian dual wield rejected');
      if(fitsSlot(c.equip.weapon,'offhand','paladin'))problems.push('Other class dual wield allowed');
      if(slotFor(c.equip,c.equip.weapon,'barbarian')!=='offhand')problems.push('Auto slot must choose second weapon');
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
      p.rage=100;p.char.rage=100;p.mana=0;p.castLock=0;
      const sp=p.speed;
      if(sp<5.2)problems.push('Barbarian move speed not boosted');
      const axe=rollItem(3,{slot:'weapon',base:'axe',rarity:0});
      p.char.bag[0]=axe;
      if(!equipFromBag(0,'offhand'))problems.push('Cannot equip second axe');
      if(p.char.equip.offhand!==axe)problems.push('Offhand axe not installed');
      const cast=p.tryUseSkill(whirlwind,p.x+0.5,p.y+0.5);
      if(!cast || !(p.channel instanceof Whirl))problems.push('Whirlwind cast failed at 100 Rage');
      else{
        const wrl=p.channel;
        wrl.update(0.5);
        if(Math.abs(p.rage-95)>0.1)problems.push('Expected five Rage spent in half a second, got '+p.rage);
        wrl.update(9.5);
        if(p.rage!==0||p.channel!==null)problems.push('Whirlwind did not end at empty Rage');
        p.update(1);
        if(Math.abs(p.rage-12)>0.2)problems.push('Rage regeneration should be 12 points/sec, got '+p.rage);
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
