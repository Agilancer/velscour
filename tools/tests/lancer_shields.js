// Lancer spinning shields as 3D models built from the four turntables, + depth-sort regression.
// From repo root: python3 -m http.server 8123; node tools/tests/lancer_shields.js
// Shots: lancer_shield_models.png (16-step turntable per model, big), lancer_shield_depth_front_back.png
const fs=require('fs'),path=require('path');
const {openGame,report,OUT_DIR}=require('./harness');

(async()=>{
 const {browser,page,errors,shot}=await openGame({width:1400,height:900});
 try {
  const result=await page.evaluate(async()=>{
   const {G,game}=window.VELSCOUR;
   const {SHIELD_SHEET,SHIELD_FRAME,LANCER_SHIELD_ABILITY,SHIELD_ORBIT_RADIUS,shieldVariantForSkill,shieldOrbitRadius,
     shieldFacing,orbitShieldDepth,preloadLancerShield,shieldModel,drawShieldModel}=await import('/src/gfx/lancershields.js');
   const {SKILLS,CLASS_SKILLS}=await import('/src/data/skills.js');
   const {castSkill}=await import('/src/game/skillrun.js');
   const {Orbit}=await import('/src/game/hazards.js');
   const {BIOME_BY_ID}=await import('/src/data/biomes.js');
   const problems=[],detail={},variants=Object.keys(SHIELD_SHEET);
   if(new Set(Object.values(LANCER_SHIELD_ABILITY)).size!==4||variants.length!==4)
     problems.push('Four unique shield models not assigned');
   for(const [name,variant]of Object.entries(LANCER_SHIELD_ABILITY)){
     if(shieldVariantForSkill(name)!==variant)problems.push('Unassigned ability '+name);
     if(!Object.values(SKILLS).some(sk=>sk.name===name&&sk.kind==='orbit'))problems.push('No existing orbit skill named '+name);
   }
   // Front faces the camera on the near side (a=pi/4), the rear on the far side (a=5pi/4).
   if(shieldFacing(Math.PI/4)!=='front'||shieldFacing(Math.PI*5/4)!=='back')problems.push('Shield faces the wrong way');
   const distances=Object.values(SHIELD_ORBIT_RADIUS);
   if(distances.length!==7)problems.push('Expected seven shield ability radii');
   for(let i=1;i<distances.length;i++)
     if(distances[i]-distances[i-1]<0.274)problems.push('Shield ability orbits too close: '+distances[i-1]+' / '+distances[i]);
   if(orbitShieldDepth(0,0,Math.PI*5/4)>=0)problems.push('Back-facing shield sorts after Lancer');
   if(orbitShieldDepth(0,0,Math.PI/4)<=0)problems.push('Front-facing shield sorts before Lancer');
   for(const v of variants)preloadLancerShield(v);
   for(let k=0;k<100&&!variants.every(v=>preloadLancerShield(v).ready||preloadLancerShield(v).error);k++)await new Promise(r=>setTimeout(r,50));
   // Every model: a closed outline, rim faces, a sane slab, both caps; and it draws something at every angle.
   const sheet=document.createElement('canvas');sheet.width=16*84;sheet.height=4*110;
   const g=sheet.getContext('2d');g.imageSmoothingEnabled=false;g.fillStyle='#34343e';g.fillRect(0,0,sheet.width,sheet.height);
   const probe=document.createElement('canvas');probe.width=probe.height=96;
   const pc=probe.getContext('2d',{willReadFrequently:true});pc.imageSmoothingEnabled=false;
   variants.forEach((v,j)=>{
     const m=shieldModel(v);
     if(!m){problems.push('No 3D model for '+v);return;}
     if(m.pts.length<8||m.faces.length<8)problems.push('Outline too coarse '+v);
     if(!(m.T>=2&&m.T<=5))problems.push('Odd slab thickness '+v+'='+m.T);
     if(m.front.levels.length<2||m.back.levels.length<2)problems.push('Caps not baked '+v);
     if(Math.abs(m.back.sx-1)>0.25||Math.abs(m.back.sy-1)>0.25)problems.push('Rear art does not fit the front '+v);
     const cover=[];
     for(let i=0;i<16;i++){
       const a=Math.PI/4+i*Math.PI/8;
       drawShieldModel(g,m,42+i*84,55+j*110,a,2);
       pc.clearRect(0,0,96,96);drawShieldModel(pc,m,48,48,a,1);
       const d=pc.getImageData(0,0,96,96).data;let n=0;for(let k=3;k<d.length;k+=4)n+=d[k]>0;
       cover.push(n);
     }
     if(cover.some(n=>n<20))problems.push('Model vanishes at some angle '+v+': '+cover);
     if(cover[0]<cover[4]*2)problems.push('Face-on not wider than edge-on '+v);
     detail[v]={T:m.T,outline:m.pts.length,faceOn:cover[0],edgeOn:cover[4]};
   });
   window.__shieldSheet=sheet.toDataURL('image/png');
   await game.newChar('lancer','Shield QA');
   document.querySelectorAll('.screen').forEach(e=>e.remove());
   G.ui.modalCount=0;G.godMode=true;
   game.buildDungeon(8,BIOME_BY_ID.catacombs);
   const src=G.player,w=G.world;
   // The production cast path: every shield spell spins at +2.4 rad/s with its own model and ring.
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
  const png=await page.evaluate(()=>window.__shieldSheet);
  if(png)fs.writeFileSync(path.join(OUT_DIR,'lancer_shield_models.png'),Buffer.from(png.split(',')[1],'base64'));
  if(result.problems.length)errors.push(...result.problems);
  await page.waitForTimeout(500);
  await shot('lancer_shield_depth_front_back');
  // All seven Bulwark rings at once, as cast, mid-spin.
  await page.evaluate(async()=>{
   const {G}=window.VELSCOUR,{CLASS_SKILLS}=await import('/src/data/skills.js'),{castSkill}=await import('/src/game/skillrun.js');
   const {LANCER_SHIELD_ABILITY}=await import('/src/gfx/lancershields.js');
   G.world.hazards.length=0;
   for(const name of Object.keys(LANCER_SHIELD_ABILITY))castSkill(G.player,CLASS_SKILLS.lancer.find(s=>s.name===name),1,G.player.x+1,G.player.y);
  });
  await page.waitForTimeout(900);
  await shot('lancer_shield_all_rings');
 }catch(e){errors.push('LANCER SHIELDS: '+(e.stack||e));}
 report(errors);
 await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1;});
