// The Castle's height-mapped walls (docs/CASTLE_OVERWORLD.md): the wall-walk, towers and stairs are reachable from
// the wards and fought on, monsters on the walls come down to the hero, and screenshots of the walls, gates, stairs,
// bridges and hall doorways with the hero (and a few monsters) in them. Look at the shots: layering doesn't throw.
// Start server at repo root: python3 -m http.server 8123
// Run: node tools/tests/castle_walls.js [view,view,...] [--mobile] [--noshots]
const {openGame,report}=require('./harness');
const mobile=process.argv.includes('--mobile'),noshots=process.argv.includes('--noshots'),only=(process.argv.slice(2).find(a=>!a.startsWith('--'))||'').split(',').filter(Boolean);
(async()=>{
  const {browser,page,errors,shot}=await openGame(mobile?{width:844,height:390,mobile:true}:{width:1440,height:900});
  try{
    const res=await page.evaluate(async()=>{
      const {G,game}=window.VELSCOUR;
      try{await game.newChar('paladin','Castle Walls QA');}catch(e){console.warn('town setup: '+e.message);}
      await (await import('/src/gfx/castle.js')).loadCastlePack();
      G.char.depth=19;G.godMode=true;
      const {BIOME_BY_ID}=await import('/src/data/biomes.js');
      game.buildDungeon(19,BIOME_BY_ID.castle);
      const m=G.world.map,W=m.w,I=(x,y)=>Math.floor(y)*W+Math.floor(x),bad=[];
      G.world.creatures=G.world.creatures.filter(c=>c===G.player);G.world.npcs.length=0;G.world.rebuildGrid();
      if(!m.hgt||!m.tallOcclusion)bad.push('the Castle has no height map');
      // flood from the arrival with the hop/drop rule: every wall-walk tile, tower floor and stair is reached
      const seen=new Uint8Array(W*m.h),q=[I(169,293)];seen[q[0]]=1;
      for(let a=0;a<q.length;a++){const i=q[a],x=i%W,y=(i/W)|0;for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const j=i+dx+dy*W;
        if(x+dx<0||y+dy<0||x+dx>=W||y+dy>=m.h||seen[j]||!m.walkableTile(x+dx,y+dy)||!m.stepOk(i,j))continue;seen[j]=1;q.push(j);}}
      let deck=0,lost=0;for(let i=0;i<W*m.h;i++)if(m.rampartDeck[i]&&!m.block[i]){deck++;if(!seen[i])lost++;}
      if(deck<1500)bad.push('wall-walk too small: '+deck);
      if(lost>deck*0.02)bad.push(lost+' of '+deck+' wall-walk tiles cannot be reached');
      // (the 3D stairs, src/world/castle3d.js: the top step is a hop below the walk beside it)
      for(const s of m.castleStairs){const top=[s.x+s.dx*(s.n-1),s.y+s.dy*(s.n-1)];if(!seen[I(s.x,s.y)]||!seen[I(...top)])bad.push('stairs unreachable at '+s.x+','+s.y);
        if(m.hgt[I(...top)]<s.lv-m.climb)bad.push('stair top more than a hop below the walk at '+top);}
      // the walls can't be stepped onto or dropped from except by the stairs
      for(let i=0;i<W*m.h;i++){if(!m.rampartDeck[i]||m.block[i])continue;const x=i%W,y=(i/W)|0;
        for(const j of [i+1,i-1,i+W,i-W]){if(m.block[j]||m.rampartWall[j])continue;const d=m.hgt[j]-m.hgt[i];if(d<-m.climb&&m.stepOk(i,j))bad.push('walk drops to '+(j%W)+','+((j/W)|0));}}
      // a monster on the walk paths down to the hero in the bailey
      const path=m.findPath?m.findPath(150.5,198.5,150.5,186.5):null;
      if(!path||!path.length)bad.push('no path from the south wall-walk down to the bailey');
      // monsters on the wall-walks come down the stairs to the hero in the bailey (and back up after him)
      const {makeMonster}=await import('/src/game/monster.js'),w=G.world,p=G.player,hits=[];
      p.update=function(){this.hp=this.maxHp;};
      const trial=(hx,hy,from)=>{
        w.creatures=w.creatures.filter(c=>c===p);p.x=hx;p.y=hy;
        const mobs=from.map(([x,y],k)=>{const arch=w.biome.roster[k%w.biome.roster.length],mo=makeMonster(w,arch,w.biome,19,'normal',x,y,0,w.looks?.pick?.(arch));
          mo.awake=true;mo.aggro=p;w.add(mo);return mo;});
        w.rebuildGrid();m.flowFrom=[-9,-9];
        for(let t=0;t<45*30;t++)w.update(1/30);
        const near=mobs.filter(mo=>!mo.dead&&Math.hypot(mo.x-p.x,mo.y-p.y)<(mo.range&&mo.ai!=='melee'?mo.range+1:3)&&Math.abs(m.hgt[m.tileIdx(mo.x,mo.y)]-m.hgt[m.tileIdx(p.x,p.y)])<=m.climb*2);
        return [near.length,mobs.length,mobs.filter(mo=>near.indexOf(mo)<0).map(mo=>[+mo.x.toFixed(1),+mo.y.toFixed(1),m.hgt[m.tileIdx(mo.x,mo.y)]])];
      };
      // (the hero by the south-west stairs: the walk's packs come down them; on the walk, the bailey's climb up)
      const down=trial(126.5,190.5,[[132.5,198.5],[140.5,198.5],[148.5,197.5],[110.5,198.5],[99.5,186.5],[99.5,176.5]]);
      const up=trial(134.5,198.5,[[126.5,186.5],[136.5,188.5],[142.5,184.5],[114.5,188.5]]);
      if(down[0]<down[1]-1)bad.push('wall monsters stuck up there: '+down[0]+'/'+down[1]+' reached the hero '+JSON.stringify(down[2]));
      if(up[0]<up[1]-1)bad.push('bailey monsters never climbed to the hero: '+up[0]+'/'+up[1]+' '+JSON.stringify(up[2]));
      return {bad,deck,lost,stairs:m.castleStairs.length,towers:m.castleTowers.length,path:path?path.length:0,down:down.slice(0,2),up:up.slice(0,2)};
    });
    console.log(JSON.stringify(res));
    for(const b of res.bad)errors.push(b);
    if(!noshots){
      // [name, x, y, zoom, monsters near the hero]
      const views=[
        ['walk_south',145.5,198.5,1.2,4],['walk_east',238.5,150.5,1.1,3],['walk_north',150.5,71.5,1.1,3],['walk_west',99.5,150.5,1.1,3],
        ['tower_north',120.5,70.5,1.2,2],['tower_corner_se',239.5,199.5,1.0,2],['stairs_north',131.5,75.5,1.3,0],['stairs_south',121.5,194.5,1.3,2],
        ['stairs_west',103.5,115.5,1.3,0],['stairs_inner',164.5,99.5,1.2,0],['behind_south',150.5,192.5,1.2,2],['behind_inner_north',150.5,89.5,1.2,2],
        ['gate_mouth',169.5,204.5,1.2,0],['gate_inside',169.5,193.5,1.2,0],['postern_out',209.5,62.5,1.1,0],['postern_in',209.5,77.5,1.1,0],
        ['inner_gate',193.5,180.5,1.1,0],['inner_gate_in',193.5,169.5,1.1,0],['inner_north_gate',145.5,99.5,1.1,0],
        ['bridge_main',169.5,208.5,1.3,0],['bridge_post',209.5,61.5,1.3,0],['bridge_river',285.5,152,1.0,0],
        ['hall_door_s',141.5,135.5,1.5,0],['door_zoom',141,135.5,3,0],['chapel_zoom',183.5,117.5,3,0],['hall_door_e',157.5,117.5,1.5,0],['chapel_door',183.5,117.5,1.5,0],['great_hall_door',141.5,138.5,1.5,0],
        ['keep_view',170.5,132.5,0.8,0],['foot_zoom',140.5,75.5,2.6,0],['foot_zoom2',124.5,190.5,2.6,0],['foot_zoom3',237.5,206.5,2.4,0],['moat_west',90.5,140.5,1.0,0],['moat_north',150.5,62.5,1.0,0],['overview',169,140,.16,0],['outer_ward',112,150,.5,0],
      ].filter(v=>!only.length||only.includes(v[0]));
      await page.waitForTimeout(2000);
      for(const [name,x,y,zoom,foes] of views){
        try{
          await page.evaluate(async([x,y,zoom,foes])=>{
            const {G}=window.VELSCOUR;
            const {camera}=await import('/src/core/view.js');
            const m=G.world.map,[px,py]=m.walkable(x,y)?[x,y]:m.randomNear(x,y,4);
            G.player.x=px;G.player.y=py;G.player._hopMap=null;
            G.world.creatures=G.world.creatures.filter(c=>c===G.player);
            if(foes){const {makeMonster}=await import('/src/game/monster.js'),w=G.world;
              for(let k=0;k<foes;k++){const a=k/foes*Math.PI*2+.4,fx=px+Math.cos(a)*2.4,fy=py+Math.sin(a)*1.6;
                if(!m.walkable(fx,fy)||Math.abs(m.hgt[m.tileIdx(fx,fy)]-m.hgt[m.tileIdx(px,py)])>m.climb)continue;
                const arch=w.biome.roster[k%w.biome.roster.length],mo=makeMonster(w,arch,w.biome,19,'normal',fx,fy,0,w.looks?.pick?.(arch));
                mo.static=false;mo.sleep=true;w.add(mo);}}
            G.world.rebuildGrid();
            G.settings.zoom=1;camera.computeZoom();G.settings.zoom=zoom/camera.zoom;camera.computeZoom();
            G.world.darkK=0;G.world.night=false;G.world.raining=false;camera.follow(px,py,0,true);
          },[x,y,zoom,foes]);
          await page.waitForTimeout(600);
          await shot('castlewall_'+(mobile?'mobile_':'')+name);
        }catch(e){errors.push(name+': '+(e.stack||e));}
      }
    }
  }catch(e){errors.push('CASTLE WALLS: '+(e.stack||e));}
  report(errors);
  await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1;});
