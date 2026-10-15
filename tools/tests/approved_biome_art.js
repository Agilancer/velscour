// Browser regression for the three approved painted sheets (five biome rows).
// From the repo root: python3 -m http.server 8123
// Then: node tools/tests/approved_biome_art.js
const {openGame,report,OUT_DIR}=require('./harness');
const path=require('path');
(async()=>{
  const {browser,page,errors,shot}=await openGame({width:1440,height:960});
  try{
    const result=await page.evaluate(async()=>{
      const {G,game}=window.VELSCOUR;
      const {A,loadBiomeArt}=await import('/src/core/assets.js');
      const {BIOME_BY_ID}=await import('/src/data/biomes.js');
      const {HEAVENLY_MONSTERS}=await import('/src/data/heavenly.js');
      const {enemyImage}=await import('/src/core/enemyart.js');
      const {approvedHeavenlyMonsterCanvas}=await import('/src/gfx/approvedbiomeart.js');
      const issues=[],checks=[];
      const ids=['desert_temple','ice_temple','hell','astral_plane','heavenly'];
      const cv=document.createElement('canvas');
      cv.id='approved-biome-contact';
      cv.width=1180;cv.height=990;
      const ctx=cv.getContext('2d');
      ctx.fillStyle='#24202b';ctx.fillRect(0,0,cv.width,cv.height);
      ctx.fillStyle='#ffe5b1';ctx.font='22px monospace';
      ctx.fillText('VELSCOUR | APPROVED BIOME ART (5 ROWS)',22,28);
      await game.newChar('paladin','Approved Biome QA');
      document.querySelectorAll('.screen').forEach(e=>e.remove());
      G.ui.modalCount=0;G.godMode=true;
      const signature=(image,r)=>{
        const pixels=image.getContext('2d',{willReadFrequently:true})
          .getImageData(r.x,r.y,r.w,r.h).data;
        let count=0,h=2166136261;
        for(let i=0;i<pixels.length;i+=4){
          if(pixels[i+3]>80)count++;
          for(let k=0;k<4;k++)h=Math.imul(h^pixels[i+k],16777619)>>>0;
        }
        return {count,hash:h};
      };
      for(let row=0;row<ids.length;row++){
        const id=ids[row],biome=BIOME_BY_ID[id];
        if(!biome){issues.push('Missing biome '+id);continue;}
        await loadBiomeArt(biome);
        const pack=A.packs['expanded_'+id]||A.packs[id];
        const annotated=pack?.meta?.approvedArt;
        if(!annotated || annotated.row!==row ||
           annotated.floorCount!==8 || annotated.propCount!==8){
          issues.push('Approved art did not load for '+id+': '+JSON.stringify(annotated));
          continue;
        }
        ctx.fillStyle='#e4d7bf';ctx.font='16px monospace';
        ctx.fillText(biome.name||id,18,row*177+62);
        const seenFloors=new Set(),seenProps=new Set();
        for(let i=0;i<8;i++){
          const f=pack.meta.floors[annotated.floorStart+i];
          const p=pack.meta.scatter[annotated.propIndices[i]];
          if(!f||!p){issues.push('Missing sprite slot '+id+'/'+i);continue;}
          const fh=signature(pack.floors,f),ph=signature(pack.scatter,p);
          if(fh.count<1000 || ph.count<500)
            issues.push('Mostly empty approved sprite '+id+'/'+i+
              ' floor='+fh.count+' prop='+ph.count);
          seenFloors.add(fh.hash);seenProps.add(ph.hash);
          ctx.imageSmoothingEnabled=false;
          ctx.drawImage(pack.floors,f.x,f.y,f.w,f.h,20+i*142,row*177+65,128,64);
          ctx.drawImage(pack.scatter,p.x,p.y,p.w,p.h,40+i*142,row*177+127,72,72);
        }
        if(new Set(annotated.propIndices).size!==8)
          issues.push('Painted prop slot aliases in '+id);
        if(seenFloors.size!==8||seenProps.size!==8)
          issues.push('Duplicate approved art detected in '+id);
        checks.push({biome:id,approvedFloors:seenFloors.size,approvedProps:seenProps.size});
      }
      const paintings=[];
      for(const a of HEAVENLY_MONSTERS.filter(a=>a.heavenlyVariant===0)){
        const painted=approvedHeavenlyMonsterCanvas(a.heavenlyFamily);
        const actual=enemyImage(a.id);
        if(!painted||painted!==actual)
          issues.push('Approved Heavenly monster not selected: '+a.id);
        else if(signature(actual,{x:0,y:0,w:160,h:186}).count<250)
          issues.push('Empty painted Heavenly monster: '+a.id);
        paintings.push(a.id);
      }
      if(paintings.length!==12)issues.push('Expected twelve Heavenly art mappings');
      if(enemyImage('hv_seraph_2')===approvedHeavenlyMonsterCanvas('seraph'))
        issues.push('Second monster variant should keep its unique original art');
      Object.assign(cv.style,{position:'fixed',left:0,top:0,zIndex:999999,
        maxWidth:'100vw',maxHeight:'100vh'});
      document.body.appendChild(cv);
      game.buildDungeon(15,BIOME_BY_ID.heavenly);
      return {checks,paintedHeavenly:paintings,issues};
    });
    console.log('APPROVED BIOME ART',JSON.stringify(result));
    if(result.issues.length)errors.push(...result.issues);
    await page.locator('#approved-biome-contact').screenshot({
      path:path.join(OUT_DIR,'approved_biome_floor_props.png')});
    await page.evaluate(()=>document.querySelector('#approved-biome-contact')?.remove());
    await page.waitForTimeout(400);
    await shot('approved_biome_heavenly_gameplay');
  }catch(e){errors.push('APPROVED BIOME ART: '+(e.stack||e));}
  report(errors);
  await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1;});
