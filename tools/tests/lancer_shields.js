// Four uploaded shield turntables + proper Lancer depth-sort regression.
// From repo root: python3 -m http.server 8123; node tools/tests/lancer_shields.js
const path=require('path');
const {openGame,report,OUT_DIR}=require('./harness');

(async()=>{
 const {browser,page,errors,shot}=await openGame({width:1400,height:900});
 try {
  const result=await page.evaluate(async()=>{
   const {G,game}=window.VELSCOUR;
   const {SHIELD_SHEET,SHIELD_FRAME,LANCER_SHIELD_ABILITY,SHIELD_ORBIT_RADIUS,
     shieldVariantForSkill,shieldOrbitRadius,shieldFrameForAngle,orbitShieldDepth,preloadLancerShield}
      =await import('/src/gfx/lancershields.js');
   const {SKILLS,CLASS_SKILLS}=await import('/src/data/skills.js');
   const {castSkill}=await import('/src/game/skillrun.js');
   const {Orbit}=await import('/src/game/hazards.js');
   const {BIOME_BY_ID}=await import('/src/data/biomes.js');
   const problems=[],detail={};
   if(SHIELD_FRAME.count!==8||SHIELD_FRAME.w!==44||SHIELD_FRAME.h!==56)
     problems.push('Expected exactly eight 44x56 frames in a 4x2 sheet');
   const variants=new Set(Object.values(LANCER_SHIELD_ABILITY));
   if(variants.size!==4||Object.keys(SHIELD_SHEET).length!==4)
     problems.push('Four unique shield images not assigned');
   for(const [name,variant]of Object.entries(LANCER_SHIELD_ABILITY)){
     if(shieldVariantForSkill(name)!==variant)problems.push('Unassigned ability '+name);
     if(!Object.values(SKILLS).some(sk=>sk.name===name&&sk.kind==='orbit'))
       problems.push('No existing orbit skill named '+name);
   }
   // Positive world-angle travel now plays the turntable BACKWARDS:
   // frame 0 is still the front, frame 4 still the rear.
   for(let i=0;i<8;i++){
     const a=Math.PI/4+i*Math.PI/4,expected=(8-i)%8;
     const f=shieldFrameForAngle(a);
     if(f!==expected)problems.push('Reversed angle/frame mismatch: '+i+' -> '+f);
     if(shieldFrameForAngle(a+Math.PI*2)!==f||
        shieldFrameForAngle(a-Math.PI*2)!==f)
       problems.push('Frame wrap mismatch at angle '+i);
   }
   const distances=Object.values(SHIELD_ORBIT_RADIUS);
   if(distances.length!==7)problems.push('Expected seven shield ability radii');
   for(let i=1;i<distances.length;i++)
     if(distances[i]-distances[i-1]<0.274)
       problems.push('Shield ability orbits too close: '+distances[i-1]+' / '+distances[i]);
   if(orbitShieldDepth(0,0,Math.PI*5/4)>=0)
     problems.push('Back-facing shield sorts after Lancer');
   if(orbitShieldDepth(0,0,Math.PI/4)<=0)
     problems.push('Front-facing shield sorts before Lancer');

   for(const [name,url]of Object.entries(SHIELD_SHEET)){
     let img=preloadLancerShield(name)?.image;
     if(!img) {problems.push('Failed to create image '+name);continue;}
     try {await img.decode();}catch(e) {
       problems.push('Missing/undecodable sprite '+url+': '+e.message);continue;
     }
     if(img.naturalWidth!==SHIELD_FRAME.w*4||
        img.naturalHeight!==SHIELD_FRAME.h*2)
       problems.push('Wrong atlas dimensions '+name);
     const canvas=document.createElement('canvas');
     canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;
     const c=canvas.getContext('2d',{willReadFrequently:true});
     c.drawImage(img,0,0);
     const hashes=[];
     for(let i=0;i<8;i++){
       const x=(i%4)*SHIELD_FRAME.w,y=Math.floor(i/4)*SHIELD_FRAME.h;
       const pixels=c.getImageData(x,y,SHIELD_FRAME.w,SHIELD_FRAME.h).data;
       let opaque=0,h=2166136261;
       for(let k=0;k<pixels.length;k+=4){
         if(pixels[k+3]>90)opaque++;
         for(let n=0;n<4;n++)h=Math.imul(h^pixels[k+n],16777619)>>>0;
       }
       if(opaque<90)problems.push('Blank sprite '+name+' frame '+i);
       hashes.push(h);
     }
     if(new Set(hashes).size!==8)problems.push('Duplicate angle frame in '+name);
     detail[name]={angles:hashes.length,unique:new Set(hashes).size};
   }
   await game.newChar('lancer','Shield QA');
   document.querySelectorAll('.screen').forEach(e=>e.remove());
   G.ui.modalCount=0;G.godMode=true;
   game.buildDungeon(8,BIOME_BY_ID.catacombs);
   const src=G.player,w=G.world;
   // Confirm the production cast path uses the opposite orbital direction
   // for EACH shield spell, not just for manually constructed hazards.
   const initialHazards=w.hazards.length;
   for(const name of Object.keys(LANCER_SHIELD_ABILITY)){
     const sk=CLASS_SKILLS.lancer.find(s=>s.name===name);
     if(!sk){problems.push('Missing Lancer cast skill '+name);continue;}
     try{
       castSkill(src,sk,1,src.x+1,src.y);
       const h=w.hazards.findLast(h=>h instanceof Orbit&&h.o?.sk===sk.id);
       if(!h){problems.push('No orbit spawned for '+name);continue;}
       if(h.speed!==2.4)problems.push('Orbit should rotate at +2.4 rad/s: '+name+'='+h.speed);
       if(h.shieldVariant!==LANCER_SHIELD_ABILITY[name])
         problems.push('Incorrect shield art on cast: '+name);
       if(Math.abs(h.radius/shieldOrbitRadius(name)-1)>0.05)
         problems.push('Unexpected scaled orbit radius: '+name+'='+h.radius);
     }catch(e){problems.push('Shield cast error '+name+': '+e.message);}
   }
   w.hazards.splice(initialHazards);
   // Spawn four shield variants explicitly and force opposite positions
   // around the same Lancer to confirm that front and back render passes
   // really interleave with the player and nearby walls.
   for(let i=0;i<4;i++){
     const variant=['round','diamond','kite','tower'][i];
     const h=new Orbit({world:w,src,n:1,radius:1.35,dur:15,
       speed:1,fx:'tshield',size:1.4,el:'phys',dmg:[0,0],
       o:{},shieldVariant:variant});
     h.base=Math.PI/4+i*Math.PI/2;
     h.pos=[[src.x+Math.cos(h.base)*1.35,
       src.y+Math.sin(h.base)*1.35,h.base]];
     w.addHazard(h);
   }
   const {camera}=await import('/src/core/view.js');
   camera.follow(src.x,src.y,0,true);camera.zoom=2;
   return{checks:detail, problems};
  });
  console.log('LANCER SHIELDS QA',JSON.stringify(result));
  if(result.problems.length)errors.push(...result.problems);
  await page.waitForTimeout(500);
  await shot('lancer_shield_depth_front_back');
 }catch(e){errors.push('LANCER SHIELDS: '+(e.stack||e));}
 report(errors);
 await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1;});
