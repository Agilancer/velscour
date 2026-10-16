// Regression for the approved VELSCOUR class/rank helmet art replacement.
// node tools/tests/closed_helms.js paladin | all (with local web server and Playwright)
const path=require('path');
const {openGame,report,ALL_CLASSES,OUT_DIR}=require('./harness');
const arg=process.argv[2]||'paladin';
const classes=arg==='all'?ALL_CLASSES:arg.split(',');
(async()=>{
 const {browser,page,errors}=await openGame({width:1500,height:950});
 try{
  for(const cls of classes){
   const result=await page.evaluate(async cid=>{
    const ga=await import('/src/core/gearart.js');
    const ha=await import('/src/core/helmetart.js');
    const meta=await ga.loadGearArt(cid);
    if(!meta)return {errors:['Missing gear art for '+cid]};
    const errors=[];
    const atlas=await ha.loadHelmetAtlas(cid);
    if(atlas.naturalWidth!==460||atlas.naturalHeight!==736)
     errors.push('Wrong atlas dimensions '+atlas.naturalWidth+'x'+atlas.naturalHeight);
    const check=document.createElement('canvas');
    check.width=atlas.width;check.height=atlas.height;
    const x=check.getContext('2d',{willReadFrequently:true});
    x.drawImage(atlas,0,0);
    const data=x.getImageData(0,0,check.width,check.height).data;
    const bands=[[0,10,1],[10,5,21],[15,5,37],[20,10,53],[30,5,65],[35,5,75]];
    const view=document.createElement('canvas');
    view.id='approved-helmet-review';
    view.width=10*140; view.height=4*220;
    const ctx=view.getContext('2d');ctx.fillStyle='#151316';ctx.fillRect(0,0,view.width,view.height);
    let variants=0,opaqueDark=0;
    for(let r=0;r<6;r++){
     const [start,n,first]=bands[r];
     for(let i=0;i<n;i++){
      const idx=start+i,item={type:'gear',slot:'head',ilvl:75,rarity:r,look:[first+i,0,-1]};
      if(ha.helmetVariant(item)!==idx)errors.push('Bad rarity/helmet index '+r+'/'+i);
      let pixels=0,blacks=0;
      for(let yy=0;yy<92;yy++)for(let xx=0;xx<92;xx++){
       const k=(((Math.floor(idx/5)*92+yy)*460)+(idx%5)*92+xx)*4;
       if(data[k+3]>120){pixels++;if(data[k]<35&&data[k+1]<35&&data[k+2]<35)blacks++;}
      }
      if(pixels<500)errors.push('Mostly empty helmet '+idx);
      if(blacks<2)errors.push('Helmet missing opaque dark eye/face areas '+idx);
      opaqueDark+=blacks;variants++;
      const a=ga.heroLook(cid,{type:'gear',slot:'body',ilvl:1,rarity:0,look:[1,0,-1]},null);
      const b=ga.heroLook(cid,{type:'gear',slot:'body',ilvl:1,rarity:0,look:[1,0,-1]},item);
      if(!a||!b){errors.push('Could not render hero with helmet '+idx);continue;}
      const frame=ha.helmetFit(cid,r);
      if(frame.cx-frame.w/2<0||frame.cx+frame.w/2>128||frame.top<0||frame.top+frame.h>105)
       errors.push('Out-of-range helmet placement '+idx);
      if(!ga.gearIcon(item,48))errors.push('Missing item/drop icon '+idx);
      const grid=idx%10,row=Math.floor(idx/10);
      ctx.drawImage(b,0,0,128,186,grid*140+3,row*220+3,125,190);
      ctx.fillStyle='#edd5a8';ctx.font='14px sans-serif';
      ctx.fillText(['COMMON','UNCOMMON','RARE','EPIC','LEGENDARY','MYTHIC'][r]+' '+(i+1),
         grid*140+5,row*220+210);
     }
    }
    document.body.appendChild(view);
    return {variants,opaqueDark,errors};
   },cls);
   console.log('Approved helmets '+cls,JSON.stringify(result));
   errors.push(...result.errors.map(x=>cls+': '+x));
   if(!result.errors.length)
    await page.locator('#approved-helmet-review').screenshot({path:path.join(OUT_DIR,'helmets_new_'+cls+'.png')});
   await page.evaluate(()=>document.querySelector('#approved-helmet-review')?.remove());
  }
 }finally{report(errors);await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
