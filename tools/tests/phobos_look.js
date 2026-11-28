// ACT III art review (docs/PHOBOS.md "The dressing"): screenshots of City State Phobos (the curtain wall and its
// towers, the King's Mile, squares, house rows, ground cover over the joins) and of Castle Velscour's great rooms
// (sanctuary, auditorium, stadium, cloister), monsters cleared, plus top-down plans of each. Checks: the city's houses
// all stand on a street, the wall rings the city, every great room's furniture is in and its floor still joined up,
// most wall hangings are Velscour's V, walls draw on more than one pack's stone.
// Usage: node tools/tests/phobos_look.js [city|castle|all] [noshots]     shots -> tools/tests/out/look_*.png
const {openGame,report}=require('./harness');const fs=require('fs'),path=require('path');
const what=process.argv[2]||'all',noshots=process.argv.includes('noshots');
const CITY=[['west_gate',0.3,0.46],['inside_gate',0.37,0.5],['kings_mile',0.45,0.5],['market',0.6,0.4],['east_square',0.8,0.5],['castle_gate',0.93,0.5],['north_wall',0.6,0.1],['south_wall',0.6,0.9]];
const FLOORS=[[61,'sanctuary',['furn:pew','furn:altar','furn:pulpit']],[32,'auditorium',['room:1']],[34,'stadium',['room:1','furn:lord_box']],[53,'cloister',['room:0']],[2,'-',['room:2']],[64,'cathedral',['furn:pew']],[31,'greathall',['furn:hall_table']]];
(async()=>{
  const {browser,page,errors,shot}=await openGame({width:1600,height:900});
  const T=(ms)=>page.waitForTimeout(ms),snap=async(n)=>{if(!noshots)await shot('look_'+n);};
  const plan=async(name)=>{if(noshots)return;const url=await page.evaluate(async()=>{const {G}=window.VELSCOUR,w=G.world,m=w.map;const {PH_V,TOWN_GROUND,PH_FLOORS}=await import('/src/gfx/phobostex.js');
    const K=4,c=document.createElement('canvas');c.width=m.w*K;c.height=m.h*K;const g=c.getContext('2d');g.fillStyle='#000';g.fillRect(0,0,c.width,c.height);
    const col=(n)=>/carpet_red/.test(n)?'#a33':/carpet_blue/.test(n)?'#35a':/carpet_green/.test(n)?'#3a5':/carpet_gold/.test(n)?'#ca4':/walk_paving/.test(n)?'#bbb':/setts/.test(n)?'#888':/cobbles/.test(n)?'#776':/ward_paving|ashlar/.test(n)?'#aa9':/grass|meadow/.test(n)?'#3a6a30':/dirt|mud|verge/.test(n)?'#6a5030':/ash/.test(n)?'#555':/bone/.test(n)?'#ddc':'#667';
    for(let y=0;y<m.h;y++)for(let x=0;x<m.w;x++){const i=y*m.w+x;if(!m.t[i])continue;const k=m.v[i]-PH_V;const n=k<0?'':k<TOWN_GROUND.length?TOWN_GROUND[k]:PH_FLOORS[(k-TOWN_GROUND.length)>>2];g.fillStyle=k<0?'#556':col(n);g.fillRect(x*K,y*K,K,K);if(m.block[i]){g.fillStyle='rgba(0,0,0,.45)';g.fillRect(x*K+1,y*K+1,K-2,K-2);}}
    for(const b of w.buildings||[]){g.fillStyle='#7a2a1a';g.fillRect(b.x0*K+1,b.y0*K+1,3*K-2,3*K-2);}
    for(const p of w.props||[]){const n=p.spr&&p.spr.name||'';g.fillStyle=/rampart/.test(n)?'#ddd':/standard/.test(n)?'#f0f':/pew/.test(n)?'#c84':/tier/.test(n)?'#0cc':/column/.test(n)?'#fff':/altar|pulpit/.test(n)?'#ff0':'#f80';g.fillRect(p.x*K-1,p.y*K-1,3,3);}
    return c.toDataURL('image/png');});fs.writeFileSync(path.join(__dirname,'out','look_plan_'+name+'.png'),Buffer.from(url.split(',')[1],'base64'));};
  const clear=()=>page.evaluate(()=>{const {G}=window.VELSCOUR,w=G.world;w.creatures=w.creatures.filter(c=>c===G.player);w.npcs=[];if(w.overworldScenario)w.overworldScenario.update=()=>{};G.player.hp=G.player.maxHp;});
  try{
    await page.evaluate(async()=>{const {G,game}=window.VELSCOUR;await game.newChar('paladin','Look');document.querySelectorAll('.screen').forEach(s=>s.remove());G.ui.modalCount=0;G.godMode=true;G.char.level=90;G.player.recompute();G.player.hp=G.player.maxHp;});
    if(what!=='castle'){
      await page.evaluate(async()=>{await window.VELSCOUR.game.enterPhobos();});await T(2500);
      const c=await page.evaluate(async()=>{const {G}=window.VELSCOUR,w=G.world,m=w.map;const {toMap}=await import('/src/world/phobos.js');void toMap;
        const open=(x,y)=>x>=0&&y>=0&&x<m.w&&y<m.h&&m.t[y*m.w+x]&&!m.block[y*m.w+x];let off=0;
        for(const b of w.buildings){let ok=false;for(let d=-1;d<=3&&!ok;d++)if(open(b.x0+d,b.y0-1)||open(b.x0+d,b.y0+3)||open(b.x0-1,b.y0+d)||open(b.x0+3,b.y0+d))ok=true;if(!ok)off++;}
        const names=w.props.map(p=>p.spr&&p.spr.name||'');
        return {houses:w.buildings.length,off,wall:names.filter(n=>/^rampart/.test(n)&&n!=='rampart_tower').length,towers:names.filter(n=>n==='rampart_tower').length,standards:names.filter(n=>/^standard_/.test(n)).length,lamps:names.filter(n=>n==='lamp_post').length,seams:m.seam?m.seam.reduce((a,v)=>a+(v?1:0),0):0};});
      console.log('city',JSON.stringify(c));
      if(c.houses<800)errors.push('[CITY] only '+c.houses+' houses');if(c.off>c.houses*0.02)errors.push('[CITY] '+c.off+' houses stand on no street');
      if(c.wall<500||c.towers<20)errors.push('[CITY] the curtain wall is thin: '+c.wall+' columns, '+c.towers+' towers');if(c.standards<60)errors.push('[CITY] few standards: '+c.standards);if(c.seams<3000)errors.push('[CITY] no ground cover: '+c.seams);
      await clear();await plan('city');
      for(const [name,fx,fy] of CITY){await page.evaluate(async([fx,fy])=>{const {G}=window.VELSCOUR,m=G.world.map,{toMap,PW,PH}=await import('/src/world/phobos.js');for(let d=0;d<40;d++)for(const s of [1,-1])for(const t of [0,1,-1,2,-2]){const [mx,my]=toMap(Math.floor(PW*fx)+0.5+t,Math.floor(PH*fy)+0.5+s*d);if(m.walkable(mx,my)){G.player.x=mx;G.player.y=my;return;}}},[fx,fy]);await T(1300);await snap('city_'+name);}
    }
    if(what!=='city')for(const [fl,lay,spots] of FLOORS){
      await page.evaluate(async([fl,lay])=>{const {G,game}=window.VELSCOUR;if(lay!=='-')G.phobosLayoutWant=lay;await game.enterCastleFloor(fl);},[fl,lay]);await T(3000);
      const r=await page.evaluate(()=>{const {G}=window.VELSCOUR,w=G.world,m=w.map;const names=w.props.map(p=>p.spr&&p.spr.name||'');const n=(re)=>names.filter(x=>re.test(x)).length;
        const seen=new Uint8Array(m.w*m.h),q=[m.tileIdx(G.player.x,G.player.y)];seen[q[0]]=1;for(let h=0;h<q.length;h++){const j=q[h];for(const k of [j+1,j-1,j+m.w,j-m.w])if(!seen[k]&&m.t[k]&&!m.block[k]){seen[k]=1;q.push(k);}}
        const ex=w.portals.find(p=>p.type==='exit');let free=0;for(let i=0;i<m.t.length;i++)if(m.t[i]&&!m.block[i])free++;
        return {layout:G.phobosLayout,packs:new Set(w.tileset.families.map(f=>f.includes(':')?f.split(':')[0]:'own')).size,fams:w.tileset.families.length,pews:n(/^pew/),altars:n(/^altar/),pulpits:n(/^pulpit/),tiers:n(/^tier/),cols:n(/^column/),standards:n(/^standard/),hang:w.wallHangings.length,vb:w.wallHangings.filter(h=>h.vb).length,exitOk:!!seen[m.tileIdx(ex.x,ex.y)],cut:free-q.length,mobs:w.creatures.length-1};});
      console.log('floor',fl,JSON.stringify(r));
      if(!r.exitOk)errors.push(`[F${fl}] the exit is cut off`);if(r.cut>12)errors.push(`[F${fl}] ${r.cut} open tiles no one can reach`);
      if(r.packs<2)errors.push(`[F${fl}] walls of one pack only`);if(r.hang&&r.vb<r.hang*0.5)errors.push(`[F${fl}] few V banners: ${r.vb}/${r.hang}`);
      if(lay==='sanctuary'&&(r.pews<90||!r.altars||!r.pulpits))errors.push(`[F${fl}] the sanctuary is bare: ${JSON.stringify(r)}`);
      if((lay==='stadium'||lay==='auditorium')&&r.tiers<200)errors.push(`[F${fl}] no stands: ${r.tiers}`);if(lay==='cloister'&&r.cols<80)errors.push(`[F${fl}] no arcade: ${r.cols}`);
      await clear();await plan(fl+'_'+r.layout);
      for(const s of spots){await page.evaluate((r)=>{const {G}=window.VELSCOUR,w=G.world,m=w.map;let t=null;if(r.startsWith('furn:')){const ps=w.props.filter(p=>p.spr&&p.spr.name&&p.spr.name.startsWith(r.slice(5)));const p=ps[Math.floor(ps.length/2)];if(p)t=[p.x,p.y];}else{const q=w.rooms[+r.slice(5)];if(q)t=[q.mx,q.my];}
        if(!t)return;for(let d=0;d<30;d++)for(let a=0;a<8;a++){const x=t[0]+Math.cos(a*0.785)*d*0.7,y=t[1]+Math.sin(a*0.785)*d*0.7;if(m.walkable(x,y)){G.player.x=x;G.player.y=y;return;}}},s);await T(1300);await snap(`castle_${fl}_${r.layout}_${s.replace(/[:]/g,'_')}`);}
    }
  }catch(e){errors.push('[LOOK] '+(e.stack||e));}
  report(errors);await browser.close();
})();
