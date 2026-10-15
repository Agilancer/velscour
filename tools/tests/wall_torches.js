// Approved wall-torch artwork: direction, placement, loading, in-game QA.
// Serve repo root (python3 -m http.server 8123), then run:
// node tools/tests/wall_torches.js
const path=require('path');
const {openGame,report,OUT_DIR}=require('./harness');
(async()=>{
  const {browser,page,errors,shot}=await openGame({width:1280,height:900});
  try{
    const info=await page.evaluate(async()=>{
      const {G,game}=window.VELSCOUR;
      const {BIOME_BY_ID}=await import('/src/data/biomes.js');
      const {isoX,isoY}=await import('/src/core/view.js');
      const {torchAtWallSegment}=await import('/src/world/dungeon.js');
      const {HOLDER_COUNT,HOLDER_ANGLES,HOLDER_CELL,TORCH_STYLES,
        holderAngle,preloadWallTorchHolders,drawWallTorch,wallTorchRect}
        =await import('/src/gfx/walltorches.js');
      const issues=[],report={};
      if(HOLDER_COUNT!==20||HOLDER_ANGLES!==4||HOLDER_CELL!==96)
        issues.push('Expected 20 designs with 4 views each, in 96x96 cells');
      for(const [id,pool] of Object.entries(TORCH_STYLES))
        if(!BIOME_BY_ID[id]||!pool.length||pool.some(n=>n<0||n>=20))
          issues.push('Invalid biome style pool '+id);
      const directions=[['f',false],['b',false],['b',true],['f',true]];
      for(let k=0;k<directions.length;k++){
        const [dir,front]=directions[k];
        if(holderAngle(dir,front)!==k)issues.push('Invalid atlas angle '+k);
        const s={dir,front,mx:20,my:25,depth:45};
        const t=torchAtWallSegment(s);
        const sx=isoX(t.x,t.y)-isoX(t.mountX,t.mountY);
        const sy=isoY(t.x,t.y)-isoY(t.mountX,t.mountY);
        if(Math.abs(sx-([25,-25,25,-25][k]))>.001||Math.abs(sy)>.001)
          issues.push('Incorrect torch bowl attachment '+k);
        if(!Array.isArray(wallTorchRect(t))||t.flameZ!==63||
          !Number.isFinite(t.depth))issues.push('Invalid torch drawing anchor '+k);
      }
      await preloadWallTorchHolders('catacombs');
      let decoded=0,validated=0;
      for(let i=1;i<=4;i++){
        const img=new Image();
        img.src='assets/fx/wall_torches/holders_'+i+'.webp';
        try{await img.decode();}catch(e){
          issues.push('Torch image did not decode '+i);continue;
        }
        if(img.naturalWidth!==384||img.naturalHeight!==480){
          issues.push('Incorrect torch atlas dimensions '+i);continue;
        }
        decoded++;
        const cv=document.createElement('canvas');cv.width=384;cv.height=480;
        const cx=cv.getContext('2d',{willReadFrequently:true});
        cx.drawImage(img,0,0);
        for(let row=0;row<5;row++)for(let col=0;col<4;col++){
          const a=cx.getImageData(col*96,row*96,96,96).data;
          let opaque=0,transparent=0;
          for(let k=3;k<a.length;k+=4){
            opaque+=a[k]>120?1:0;
            transparent+=a[k]===0?1:0;
          }
          if(opaque<200||transparent<150)issues.push(
            'Empty/opaque sprite '+i+'/'+row+'/'+col);
          validated++;
        }
      }
      report.decodedAtlases=decoded;report.validatedViews=validated;
      await game.newChar('paladin','Torch Art QA');
      document.querySelectorAll('.screen').forEach(s=>s.remove());
      G.ui.modalCount=0;G.godMode=true;
      game.buildDungeon(12,BIOME_BY_ID.hell);
      const world=G.world;
      report.spawnedTorches=world.torches.length;
      if(!world.torches.length)issues.push('Dungeon generated no wall torches');
      const segments=new Set(world.map.segments.map(s=>
        [s.mx,s.my,s.dir,s.front].join(':')));
      for(const t of world.torches){
        if(!segments.has([t.mountX,t.mountY,t.dir,t.front].join(':')))
          issues.push('Free-floating torch without matching wall segment');
        if(t.flameZ!==63||!Number.isFinite(t.depth))
          issues.push('Bad torch depth or flame anchor');
      }
      const cv=document.createElement('canvas');
      cv.id='wall-torch-review';cv.width=640;cv.height=2180;
      const ctx=cv.getContext('2d');
      ctx.fillStyle='#211f27';ctx.fillRect(0,0,cv.width,cv.height);
      ctx.font='bold 20px sans-serif';ctx.fillStyle='#f2dbad';
      ctx.fillText('VELSCOUR - 20 TORCH HOLDERS / FOUR WALL ANGLES',12,30);
      for(let d=0;d<20;d++)for(let k=0;k<4;k++){
        const [dir,front]=directions[k];
        const t=torchAtWallSegment({mx:20,my:25,dir,front,depth:45});
        t.holderStyle=d;
        ctx.save();
        ctx.translate(80+150*k-isoX(20,25),104+d*105-isoY(20,25));
        drawWallTorch(ctx,t,BIOME_BY_ID.hell,1.5);
        ctx.restore();
        ctx.font='11px sans-serif';ctx.fillStyle='#cdbda8';
        ctx.fillText('#'+(d+1)+' / '+(k+1),17+150*k,158+d*105);
      }
      Object.assign(cv.style,{position:'fixed',left:0,top:0,zIndex:999999,
        maxWidth:'100vw',maxHeight:'100vh'});
      document.body.appendChild(cv);
      return {report,issues};
    });
    console.log('WALL TORCH QA',JSON.stringify(info));
    if(info.issues.length)errors.push(...info.issues);
    await page.locator('#wall-torch-review').screenshot({
      path:path.join(OUT_DIR,'wall_torches_80_views.png')});
    await page.evaluate(()=>document.querySelector('#wall-torch-review')?.remove());
    await shot('wall_torches_hell_gameplay');
  }catch(e){errors.push('WALL TORCH QA: '+(e.stack||e));}
  report(errors);
  await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1;});
