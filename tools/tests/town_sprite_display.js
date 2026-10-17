// Browser regression for original vendor art and generated 25-identity
// townsfolk sprite sheets, including Canvas palette variants and knight poses.
// From repo root: python3 -m http.server 8123
// Then: node tools/tests/town_sprite_display.js
const {openGame,report}=require('./harness');

(async()=>{
  const {browser,page,errors,shot}=await openGame({width:1440,height:900});
  try{
    const initial=await page.evaluate(async()=>{
      const {townFrameReady,preloadTownSheets,townSprite}=await import('/src/game/render.js');
      const {TOWNSFOLK}=await import('/src/data/townsfolk.js');
      const canvas=document.createElement('canvas');
      canvas.width=128*11;canvas.height=192;
      const checks=[];
      if(!townFrameReady(canvas,11))checks.push('Recolored Canvas sheet rejected');
      if(townFrameReady(canvas,13))checks.push('Short non-knight sheet accepted for knight');
      const knightIds=TOWNSFOLK.filter(n=>n.knight).map(n=>n.spriteId);
      if(!(await preloadTownSheets(knightIds)).every(Boolean))
        checks.push('A generated knight sheet failed to load');
      for(const id of knightIds){
        const sheet=townSprite(id,{hue:15,sat:.9,light:.01});
        if(!(sheet instanceof HTMLCanvasElement)||!townFrameReady(sheet,13))
          checks.push('Knight palette Canvas not ready: '+id);
      }
      return checks;
    });
    errors.push(...initial);
    await page.evaluate(async()=>{
      const {G,game}=window.VELSCOUR;
      await game.newChar('paladin','Townsfolk Artwork QA');
      document.querySelectorAll('.screen').forEach(s=>s.remove());
      G.ui.modalCount=0; G.godMode=true;
    });
    // Render a sample bubble on a transparent canvas and check that the
    // complete parchment panel, rounded trim and tail are drawn.
    const bubbleIssues=await page.evaluate(async()=>{
      const {drawTownSpeech}=await import('/src/game/townspeech.js');
      const canvas=document.createElement('canvas');
      canvas.id='town-speech-preview';
      canvas.width=550;canvas.height=250;
      const ctx=canvas.getContext('2d');
      const npc={talkText:'The watch has news from the northern gate. Traders are gathering by the market square, and winter is coming.',talkT:3};
      drawTownSpeech(ctx,npc,275,200);
      const problems=[];
      const rect=npc.bubbleRect;
      if(!rect||rect.length!==4||rect.some(v=>!Number.isFinite(v)))
        problems.push('Speech bubble bounds missing');
      else{
        const cx=Math.floor((rect[0]+rect[2])/2),cy=Math.floor((rect[1]+rect[3])/2);
        if(ctx.getImageData(cx,cy,1,1).data[3]===0)
          problems.push('Rounded parchment bubble has transparent middle');
      }
      Object.assign(canvas.style,{position:'fixed',left:'24px',top:'24px',zIndex:999999,
        background:'#30241c'});
      document.body.appendChild(canvas);
      return problems;
    });
    errors.push(...bubbleIssues);
    await page.locator('#town-speech-preview').screenshot({
      path:require('path').join(require('./harness').OUT_DIR,'town_rounded_dialogue.png')});
    await page.evaluate(()=>document.querySelector('#town-speech-preview')?.remove());
    for(const seed of [1337,42301]){
      const issues=await page.evaluate(async(seed)=>{
        const {G,game}=window.VELSCOUR;
        const {preloadTownSheets,townSprite,townFrameReady}=await import('/src/game/render.js');
        const {replacementImage}=await import('/src/core/replacementart.js');
        const {VENDORS}=await import('/src/world/town.js');
        G.char.townSeed=seed;game.enterTown();
        const npcs=G.world.npcs;
        const vendors=npcs.filter(n=>!!n.vendor),visitors=npcs.filter(n=>!!n.townsfolkId);
        const issues=[];
        if(vendors.length!==VENDORS.length)
          issues.push('Expected '+VENDORS.length+' unchanged vendors, got '+vendors.length);
        for(const n of vendors){
          if(n.townsfolkId||n.townsfolkSpriteId)
            issues.push('Vendor accidentally assigned civilian sheet: '+n.vendor.id);
          if(!replacementImage('npc_'+n.vendor.id))
            issues.push('Original painted art unavailable for vendor: '+n.vendor.id);
          if(typeof n.use!=='function')
            issues.push('Vendor interaction lost: '+n.vendor.id);
        }
        if(visitors.length<5)issues.push('Town residents did not spawn');
        if(visitors.filter(n=>n.talkT>0).length>1)
          issues.push('Town opens with too many simultaneous conversations');
        if(visitors.some(n=>!Number.isFinite(n.animT)||!Number.isFinite(n.walkT)))
          issues.push('Some visitors lack independent gait clocks');
        const loaded=await preloadTownSheets(visitors.map(n=>n.townsfolkSpriteId));
        if(!loaded.every(Boolean))issues.push('Some generated civilian sheets failed to load');
        for(const n of visitors){
          const img=townSprite(n.townsfolkSpriteId,n.pal);
          const frames=n.knight?13:11;
          if(!(img instanceof HTMLCanvasElement)||!townFrameReady(img,frames))
            issues.push('Original generated animation unavailable: '+n.name);
        }
        return issues;
      },seed);
      errors.push(...issues.map(s=>seed+': '+s));
      await page.waitForTimeout(350);
      await shot('townsfolk_generated_'+seed);
    }
  }catch(e){errors.push('TOWN SPRITES: '+(e.stack||e));}
  report(errors);
  await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1;});
