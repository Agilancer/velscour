// Thirty-five playable, shrine-activated overworld challenge scenarios.
// The original monster, loot, XP, rarity, combat and portal systems remain authoritative.
import { makeMonster } from './monster.js';
import { depthLevel } from '../data/depth.js';
import { UI } from '../ui/ui.js';
import { RNG } from '../core/util.js';
import { overworldObject } from '../gfx/overworldart.js';
import { TW } from '../core/view.js';
import { TOWNSFOLK } from '../data/townsfolk.js';
import { townFacingFlip } from './townsfolkvisuals.js';

export const SCENARIOS = [
  ['Siege of the Forgotten','waves','Survive four escalating enemy waves.'],
  ['The Three Tyrants','bosses','Defeat three bosses fighting together.'],
  ['Night of the Walking Dead','defend','Protect the settlement from waves of zombies.'],
  ['The Lost Caravan','escort','Escort a survivor safely across the forest.'],
  ['The Three Watchposts','zones','Hold three ancient control circles.'],
  ['Tears in the Veil','rifts','Seal four infernal rifts.'],
  ['The Warband Commanders','captains','Hunt four enemy captains and their bodyguards.'],
  ['Last Light','ward','Defend the sacred shrine from attackers.'],
  ['Bandit Encampments','camps','Eliminate the leaders of four hostile camps.'],
  ['Prisoners of the Wild','rescue','Free four imprisoned wanderers.'],
  ['Relics of Old Herrington Hollow','relics','Recover five ancient artifacts.'],
  ['The Black Conclave','necros','Slay the three necromancers and their undead guards.'],
  ['Hold the Crossing','bridge','Protect a crossing from four assault waves.'],
  ['The Killing Fields','battle','Repel five waves across the battlefield.'],
  ['The Rotting Hamlet','infestation','Save villagers during a zombie infestation.'],
  ['The Alpha Hunt','beasts','Hunt three monstrous alpha beasts.'],
  ['Break Their Siege','siege','Sabotage three siege engines and defeat their guards.'],
  ['The Corrupted Totems','totems','Cleanse four blighted forest totems.'],
  ['Trial of the Hourglass','trial','Slay twenty enemies before time runs out.'],
  ['Fate of the Wilds','random','A random ancient test is waiting behind the shrine.'],
  ['Fire on the Ramparts','rampart_siege','Repel a coordinated assault along the castle wall walk.'],
  ['The Wallbreaker Captains','rampart_captains','Defeat three siege captains holding the battlements.'],
  ['Breach at the Battlements','rampart_breach','Drive the invaders off four breaches in the curtain wall.'],
  ['The Sconce Ward','rampart_ward','Keep the wall torches lit while enemies storm the parapet.'],
  ['Last Stand Above the Moat','rampart_last','Survive five waves across the elevated wall walk.'],
  ['The Hall of Banners','keep_banners','Clear the throne hall while the royal banners burn.'],
  ['Ashes in the Chapel','keep_chapel','Drive the invaders from the cathedral nave and sanctuary.'],
  ['The Feast Interrupted','keep_feast','Defeat the raiders who have breached the great hall.'],
  ['The Crown Vault','keep_vault','Recover the crown relic from the guarded inner chamber.'],
  ['Trial of the Lord Marshal','keep_trial','Best the keep guard in a three-stage martial trial.'],
  ['The Royal Procession','keep_procession','Protect the royal party as it crosses the keep.'],
  ['Armory Under Siege','keep_armory','Repel the enemy force trying to seize the castle armory.'],
  ['The Oathsworn Guard','keep_guard','Defeat the corrupted guard captain and sworn knights.'],
  ['The Bell Tower Breach','keep_belltower','Clear the attackers from the cathedral stair and bell landing.'],
  ['Coronation at Dawn','keep_coronation','Defend the throne hall through a final assault.'],
];
const CENTER=[36.5,35.5];
const norm=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const pos=(p)=>[p[0],p[1]];
export function createOverworldScenario(world,gen,biome,onSuccess) {
  const rng=new RNG((gen.seed ^ 0x71bb5eed)>>>0), selected=gen.scenarioId%SCENARIOS.length;
  const center=gen.shrine||CENTER;
  const [title,baseType,description]=SCENARIOS[selected];
  const type=baseType==='random'?rng.pick(['waves','bosses','rifts','zones']):baseType;
  const S={id:selected,title,type,description,active:false,completed:false,failed:false,
    stage:0,goal:0,kills:0,seconds:0,remaining:0,foes:[],markers:[],civilians:[],capture:0,
    timer:0, routeIndex:0, escort:null, wardHp:0,spawnedTotal:0};
  const live=()=>S.foes.some(m=>!m.dead);
  const site=(n)=>gen.sites[n%gen.sites.length];
  const player=()=>world.player;
  const report=(s)=>UI.log('['+title+'] '+s,'#c4e6a1');
  const mark=(name,coords,callback,color='#8c70ff')=>{
    const marker={x:coords[0],y:coords[1],type:'objective',active:true,reach:1.8,
      color,label:name,use:()=>{
        if(!S.active||S.completed||S.failed)return;
        callback(marker);
      }};
    world.portals.push(marker);S.markers.push(marker);return marker;
  };
  const unmark=(marker)=>{
    const i=world.portals.indexOf(marker);if(i>=0)world.portals.splice(i,1);
    const j=S.markers.indexOf(marker);if(j>=0)S.markers.splice(j,1);
  };
  const clearMarkers=()=>{for(const p of S.markers.slice())unmark(p);};
  const spawn=(arch,at,rank='normal',num=1)=>{
    for(let i=0;i<num;i++){
      const [x,y]=i?world.map.randomNear(at[0],at[1],Math.min(2.6,i*.7+1),rng.fn()):at;
      const p=world.map.walkable(x,y)?[x,y]:world.map.randomNear(at[0],at[1],3,rng.fn());
      const m=makeMonster(world,arch,biome,depthLevel(world.depth)+(rank==='boss'?2:0),rank,p[0],p[1],0);
      // Scenario foes track the hero across the whole map, so a phase never stalls on stragglers out of sight.
      m.awake=true;m.hunter=true;
      // Quest outcomes are driven by real combat deaths, not a fake counter.
      const previous=m.onDeath;
      m.onDeath=(source)=>{if(previous)previous.call(m,source);S.kills++;};
      world.add(m);S.foes.push(m);S.spawnedTotal++;
    }
  };
  const group=(index,count=4,arch=null,rank='normal')=>{
    const at=site(index);
    const species=arch||rng.pick(biome.roster);
    spawn(species,world.map.randomNear(at[0],at[1],2,rng.fn()),rank,1);
    if(count>1)spawn(species,world.map.randomNear(at[0],at[1],3,rng.fn()),'normal',count-1);
  };
  const wave=(target=4,at=center,arch=null)=>{
    S.stage++;
    S.foes=[];
    const n=4+S.stage*3;
    const type=arch||rng.pick(['skeleton','zombie','ghoul','hound','cultist']);
    const offset=S.stage%2?[-7,6]:[7,-6];
    spawn(type,world.map.randomNear(at[0]+offset[0],at[1]+offset[1],2,rng.fn()),'normal',n);
    if(S.stage===target)spawn(type,world.map.randomNear(at[0]+3,at[1]-6,2,rng.fn()),'champion',1);
    report('Wave '+S.stage+'/'+target+' is attacking!');
  };
  const person=(name,x,y,cls='ranger')=>{
    // Painted townsfolk/guard art; recoloured class sprites read as green ghosts.
    const art=cls==='paladin'?'captain':cls==='wizard'?'npc_tobin':['npc_mira','npc_gorm','npc_cael','npc_tobin'][S.civilians.length%4];
    // ...and townsfolk from Herrington Hollow (animated sheets: they walk, flinch and cheer) for everyone else
    const folk=cls==='paladin'?null:rng.pick(TOWNSFOLK.filter(v=>!v.royal&&!v.courtier&&(cls==='ranger'?!v.child:true)));
    const n={name:folk?folk.name.split(' ')[0]+' the '+folk.role:name,sprite:cls,art,x,y,flip:rng.chance(.5),hp:100,reach:1.6,
      townsfolkSpriteId:folk?.spriteId,pal:folk?.palette,frameCount:folk?.frame.count,child:folk?.child,knight:folk?.knight,animT:rng.next()*3,walkT:0,idleSeed:rng.int(0,2),
      update(dt){this.animT+=dt;if(!this.walking)this.walkT=0;this.walking=false;},
      use:()=>{
        // NPCs are normally click targets; give each one a safe and useful interaction.
        if(type==='rescue'){
          const marker=S.markers.find(m=>norm([m.x,m.y],[n.x,n.y])<2.5);
          if(marker)return marker.use();
        }
        UI.log('['+name+'] Stay close, and help keep the Wilds safe.','#e2d6aa');
      }};
    world.npcs.push(n);S.civilians.push(n);return n;
  };
  const fail=(reason)=>{
    if(S.completed||S.failed)return;
    S.failed=true;S.active=false;
    for(const m of S.foes)if(!m.dead)m.dead=true; // reset the encounter without granting loot
    clearMarkers();
    for(const n of S.civilians){const i=world.npcs.indexOf(n);if(i>=0)world.npcs.splice(i,1);}
    if(S.wagon){const i=world.props.indexOf(S.wagon);if(i>=0)world.props.splice(i,1);S.wagon=null;}
    S.civilians=[];S.escort=null;S.foes=[];
    report('FAILED — '+reason+' Return to the scenario shrine to try again.');
    UI.centerMsg('SCENARIO FAILED','Activate the shrine to retry',3);
  };
  const finish=()=>{
    if(S.completed||S.failed)return;
    S.completed=true;S.active=false;S.remaining=0;clearMarkers();
    UI.centerMsg('SCENARIO COMPLETE',title+' — the exit is open!',3.6);
    onSuccess(S);
  };
  const trackWaves=(n,at,arch)=>{
    if(live())return;
    if(S.stage>=n)finish();
    else wave(n,at,arch);
  };
  // Multi-phase fights: the next phase spawns the moment the current one is dead; `then` runs after the last.
  const phases=(list,then=finish)=>{
    S.phaseList=list;S.phaseDone=then;S.goal=list.length;S.stage=1;list[0]();
  };
  const trackPhases=()=>{
    if(live()||!S.phaseList)return;
    if(S.stage<S.phaseList.length){
      S.stage++;S.foes=S.foes.filter(m=>!m.dead);S.phaseList[S.stage-1]();
      report('Phase '+S.stage+'/'+S.phaseList.length+' — they keep coming!');
    }else{const then=S.phaseDone;S.phaseList=null;then();}
  };
  const start=()=>{
    if(S.active||S.completed)return;
    if(S.foes.length)for(const m of S.foes)if(!m.dead)m.dead=true;
    for(const n of S.civilians){const i=world.npcs.indexOf(n);if(i>=0)world.npcs.splice(i,1);}
    Object.assign(S,{active:true,failed:false,stage:0,kills:0,seconds:0,remaining:0,
      foes:[],markers:[],civilians:[],escort:null,routeIndex:0,wardHp:0,spawnedTotal:0,capture:0,
      phaseList:null,phaseDone:null,escortPath:null,zoneWave:-1});
    S.timer=biome.id==='sea_of_sand'?rng.int(90,181):0;
    report(description);UI.centerMsg(title.toUpperCase(),description,3.2);
    if(type.startsWith('rampart_')){
      const posts=[[35.5,29.5],[48.5,27.5],[62.5,34.5],[64.5,48.5],
        [58.5,58.5],[48.5,63.5],[32.5,55.5],[31.5,38.5]]
        .map(([x,y])=>[x*2,y*2])
        .filter(([x,y])=>world.map.rampartDeck?.[Math.floor(y)*world.map.w+Math.floor(x)]);
      const roster=biome.roster;
      const put=(post,arch,rank='normal')=>{
        const [cx,cy]=posts[post%posts.length],offsets=[[0,0],[-.65,0],[.65,0],[0,-.65],[0,.65],[-.65,-.65],[.65,-.65],[-.65,.65],[.65,.65]];
        const occupied=S.foes.filter(m=>!m.dead),at=offsets.map(([dx,dy])=>[cx+dx,cy+dy]).find(([x,y])=>
          world.map.rampartDeck[Math.floor(y)*world.map.w+Math.floor(x)]&&world.map.walkable(x,y)&&
          occupied.every(m=>norm([m.x,m.y],[x,y])>.62))||[cx,cy];
        spawn(arch||rng.pick(roster),at,rank,1);
      };
      if(type==='rampart_siege'||type==='rampart_last'){
        // Real assault waves along the wall walk, each arriving the moment the last falls.
        const waves=type==='rampart_last'?5:4;
        phases(Array.from({length:waves},(_,w)=>()=>{
          const n=4+w*2;
          for(let i=0;i<n;i++)put(w*3+i,i%3===0?'knight':null,i===n-1&&w===waves-1?'champion':'normal');
        }));
      }else if(type==='rampart_captains'){
        S.goal=3;for(let i=0;i<3;i++){put(i*2,['knight','abomination','demon'][i],'boss');put(i*2+1,'cultist','champion');}
      }else if(type==='rampart_breach'){
        S.goal=4;for(let i=0;i<4;i++){put(i*2,'knight','champion');put(i*2+1,null,'normal');put(i*2+1,null,'normal');}
      }else{
        S.goal=18;S.wardHp=220;for(let i=0;i<18;i++)put(i,i%4===0?'cultist':null,i%9===0?'champion':'normal');
      }
      return;
    }
    if(type.startsWith('keep_')){
      const rooms={
        keep_banners:[[[95,82]],'knight'],keep_chapel:[[[70,102]],'cultist'],
        keep_feast:[[[100,110]],'abomination'],keep_vault:[[[96,82],[70,102]],'wraith'],
        keep_trial:[[[95,82],[100,110]],'knight'],keep_procession:[[[70,102],[100,110]],'demon'],
        keep_armory:[[[100,110]],'knight'],keep_guard:[[[95,82],[100,110]],'knight'],
        keep_belltower:[[[70,102]],'wraith'],keep_coronation:[[[95,82],[70,102],[100,110]],'demon'],
      };
      const [roomsToUse,arch]=rooms[type],at=roomsToUse[rng.int(0,roomsToUse.length-1)];
      const squad=(count,lead='normal',boss=null)=>()=>{
        for(let i=0;i<count;i++){
          const p=world.map.randomNear(at[0]+(i%2?1.4:-1.4),at[1]+(i%3-1)*1.2,2,rng.fn());
          spawn(i%4===0?arch:rng.pick(biome.roster),p,i===0?lead:'normal',1);
        }
        if(boss)spawn(boss,world.map.randomNear(at[0],at[1],1.5,rng.fn()),'boss',1);
      };
      if(type==='keep_procession'){
        S.wardHp=240;
        const family=[['Queen Elowen',95,82,'wizard'],['Prince Rowan',96.5,83,'ranger'],['Princess Mira',93.5,83,'bard']];
        for(const [name,x,y,sprite] of family){const [px,py]=world.map.walkable(x,y)?[x,y]:world.map.randomNear(x,y,2,rng.fn());person(name,px,py,sprite);}
      }
      const plan={
        keep_trial:[squad(4),squad(5,'champion'),squad(2,'champion','knight')],                 // three-stage trial
        keep_coronation:[squad(6),squad(7,'champion'),squad(4,'champion','demon')],
        keep_procession:[squad(5),squad(6,'champion')],
        keep_guard:[squad(6),squad(3,'champion','knight')],
        keep_vault:[squad(5),squad(5,'champion')],
      }[type]||[squad(6),squad(5,'champion')];
      // The crown vault ends at the relic itself, claimed once its guards are down.
      phases(plan,type==='keep_vault'?()=>{
        mark('Claim the Crown Relic',at,(m)=>{unmark(m);finish();},'#ffd860');
        report('The vault is clear — claim the crown relic!');
      }:finish);
      return;
    }
    const bosses=(n,archs)=>{
      S.goal=n;
      for(let i=0;i<n;i++){
        const angle=(i/n)*Math.PI*2;
        const at=[center[0]+Math.cos(angle)*8,center[1]+Math.sin(angle)*8];
        spawn(archs[i%archs.length],world.map.randomNear(at[0],at[1],3,rng.fn()),'boss',1);
      }
    };
    const tasks=(n,label)=>{
      S.goal=n;S.remaining=n;
      for(let i=0;i<n;i++){
        const at=site(i+1),idx=i+1;
        const captive=type==='rescue'?person('Prisoner '+idx,at[0]+1.2,at[1]+.8,'wizard'):null;
        mark(label+' '+idx,at,(m)=>{
          if(captive){const j=world.npcs.indexOf(captive);if(j>=0)world.npcs.splice(j,1);}
          unmark(m);S.remaining--;S.stage++;report(label+': '+S.stage+'/'+S.goal);
          if(['rifts','totems','siege'].includes(type))group(idx+2,3,type==='rifts'?'wraith':type==='totems'?'shroom':'knight');
          if(S.remaining===0&&(!['rifts','totems','siege'].includes(type)||!live()))finish();
        },type==='rifts'?'#b050ff':type==='totems'?'#5de5a3':'#e6b969');
        if(['rescue','relics','rifts','siege','totems'].includes(type))group(i+2,3,type==='rescue'?'zombie':null);
      }
    };
    switch(type){
      case 'waves':case 'battle':case 'bridge':
        if(type==='bridge'){S.escort=person('Crossing Watchman',center[0]+2,center[1]+3,'paladin');S.escort.hp=170;}
        wave(type==='battle'?5:4);break;
      case 'bosses': bosses(3,['demon','knight','abomination']);break;
      case 'defend':case 'infestation': {
        // The settlement sits beside this map's shrine (fixed Wilds coordinates broke on larger maps).
        const v=world.map.randomNear(center[0]-9,center[1]+7,2,rng.fn());S.village=v;
        for(let i=0;i<4;i++){const q=world.map.randomNear(v[0]+(i%2)*2.5-1.2,v[1]+Math.floor(i/2)*2.5-1.2,1.5,rng.fn());person('Villager '+(i+1),q[0],q[1]);}
        S.wardHp=4;wave(type==='infestation'?4:3,v,'zombie');break;
      }
      case 'escort': {
        S.escort=person('Caravan Guard',center[0],center[1]+3,'paladin');
        S.escort.hp=140;S.goal=4;S.routeIndex=0;
        const wagon=overworldObject('ow_caravan');
        S.wagon={kind:'scatter',x:S.escort.x,y:S.escort.y,spr:wagon,
          k:TW/160*(wagon?.pixelScale||1),flip:false};
        world.props.push(S.wagon);
        S.route=[site(0),site(5),site(2),gen.exit];
        group(2,5,'hound');group(5,4,'archer');break;
      }
      case 'zones':
        S.goal=3;S.route=[site(1),site(2),site(3)];S.remaining=3;
        for(let i=0;i<3;i++)group(i+1,5);
        break;
      case 'rifts':tasks(4,'Seal Rift');break;
      case 'captains':case 'camps':case 'necros':
        S.goal=type==='necros'?3:4;
        for(let i=0;i<S.goal;i++){
          group(i+1,4,type==='necros'?'cultist':null,'champion');
          // champion leaders receive their own marker through a reference.
        }break;
      case 'ward':
        S.wardHp=190;wave(3);break;
      case 'rescue':tasks(4,'Free Prisoner');break;
      case 'relics':tasks(5,'Claim Relic');break;
      case 'beasts':bosses(3,['hound','abomination','golem']);break;
      case 'siege':tasks(3,'Destroy Engine');break;
      case 'totems':tasks(4,'Purify Totem');break;
      case 'trial':
        S.goal=20;S.timer=110;S.remaining=110;
        for(let i=1;i<=5;i++)group(i+1,6,i%2?'ghoul':'skeleton');break;
    }
  };
  const update=(dt)=>{
    if(!S.active||S.completed||S.failed)return;
    S.seconds+=dt;
    if(type.startsWith('rampart_')){
      if(type==='rampart_ward'&&S.seconds>8){
        // A short grace lets the hero reach the wall before the torches start to gutter.
        const torches=S.torches||(S.torches=world.props.filter(pr=>pr.spr?.category==='torches'));
        const attackers=S.foes.filter(m=>!m.dead&&torches.some(t=>norm([t.x,t.y],[m.x,m.y])<3)).length;
        S.wardHp-=dt*attackers*0.6;
        if(S.wardHp<=0){fail('The wall torches were extinguished.');return;}
      }
      if(S.phaseList)trackPhases();
      else if(!live())finish();
      return;
    }
    if(type.startsWith('keep_')){
      if(type==='keep_procession'){
        const attackers=S.foes.filter(m=>!m.dead&&S.civilians.some(n=>norm([n.x,n.y],[m.x,m.y])<3)).length;
        S.wardHp-=dt*attackers*1.5;
        if(S.wardHp<=0){fail('The royal party has fallen.');return;}
      }
      trackPhases();
      return;
    }
    if(biome.id==='sea_of_sand'){
      if(S.seconds>=S.timer){fail('The scenario timer expired.');return;}
    }
    const p=player();
    if(type==='waves'||type==='battle'||type==='bridge'||type==='defend'||type==='infestation'||type==='ward'){
      const required=type==='battle'?5:type==='defend'?3:type==='ward'?3:4;
      const at=type==='defend'||type==='infestation'?S.village:center;
      const arch=type==='defend'||type==='infestation'?'zombie':null;
      // Simulated NPC defensive damage scales with actual nearby living attackers.
      if(type==='defend'||type==='infestation'){
        let living=0;
        for(const n of S.civilians){
          if(n.hp<=0)continue;
          living++;
          const attackers=S.foes.filter(m=>!m.dead&&norm([n.x,n.y],[m.x,m.y])<4).length;
          if(attackers)n.hp=Math.max(0,n.hp-dt*attackers*2.6);
        }
        if(!S.civilians.some(n=>n.hp>0)){fail('The villagers have fallen.');return;}
      }else if(type==='ward'){
        const attackers=S.foes.filter(m=>!m.dead&&norm([m.x,m.y],center)<5).length;
        S.wardHp-=dt*attackers*2;
        if(S.wardHp<=0){fail('The shrine was destroyed.');return;}
      }else if(type==='bridge'){
        const n=S.escort;
        const attackers=S.foes.filter(m=>!m.dead&&norm([n.x,n.y],[m.x,m.y])<6).length;
        n.hp-=dt*attackers*(norm([p.x,p.y],center)<7?1.2:4.5);
        if(n.hp<=0){fail('The crossing was overrun.');return;}
      }
      trackWaves(required,at,arch);
    }else if(type==='bosses'||type==='beasts'){
      if(!live())finish();
    }else if(type==='captains'||type==='camps'||type==='necros'){
      const leaders=S.foes.filter(m=>m.rank==='champion');
      if(leaders.length>=S.goal&&leaders.every(m=>m.dead))finish();
    }else if(type==='zones'){
      const at=S.route[S.stage];
      if(!at){finish();return;}
      const inside=norm([p.x,p.y],at)<3.5;
      // Stepping onto a watchpost calls its counter-attack, so holding it is a fight rather than a wait.
      if(inside&&S.zoneWave!==S.stage){S.zoneWave=S.stage;spawn(rng.pick(biome.roster),world.map.randomNear(at[0],at[1],5,rng.fn()),'normal',3+S.stage);report('Watchpost '+(S.stage+1)+' is under attack!');}
      if(inside&&!S.foes.some(m=>!m.dead&&norm([m.x,m.y],at)<4.5))S.capture+=dt;
      else S.capture=Math.max(0,S.capture-dt*.3);
      if(S.capture>=4){S.stage++;S.remaining--;S.capture=0;report('Watchpost '+S.stage+'/3 secured!');if(S.stage>=3)finish();}
    }else if(type==='escort'){
      const n=S.escort;
      if(!n)return;
      const attackers=S.foes.filter(m=>!m.dead&&norm([n.x,n.y],[m.x,m.y])<3).length;
      n.hp-=dt*attackers*3;
      if(n.hp<=0){fail('The caravan was lost.');return;}
      const target=S.route[S.routeIndex];
      if(!target){finish();return;}
      if(norm([p.x,p.y],[n.x,n.y])<9){
        const d=norm([n.x,n.y],target);
        if(d<1.5){
          S.routeIndex++;S.escortPath=null;report('Caravan checkpoint '+S.routeIndex+'/4');
          if(S.routeIndex>=4)finish();
          else{spawn(rng.pick(biome.roster),world.map.randomNear(n.x,n.y,6,rng.fn()),'normal',2+S.routeIndex);report('Ambush on the road!');}
        }
        else{
          // Follow a real path around walls and moats instead of grinding into them.
          if(!S.escortPath&&(S.escortRetry=(S.escortRetry||0)-dt)<=0){
            S.escortPath=world.map.findPath(n.x,n.y,target[0],target[1],40000,.3);
            if(!S.escortPath){S.escortRetry=1;return;}
          }
          if(!S.escortPath)return;
          while(S.escortPath.length>1&&norm([n.x,n.y],S.escortPath[0])<.35)S.escortPath.shift();
          const [tx,ty]=S.escortPath[0],step=norm([n.x,n.y],[tx,ty]),k=Math.min(1,dt*2.4/Math.max(step,1e-3));
          const nx=n.x+(tx-n.x)*k,ny=n.y+(ty-n.y)*k;
          if(world.map.walkable(nx,ny)){n.flip=townFacingFlip(nx-n.x,ny-n.y,n.flip);n.walking=true;n.walkT=(n.walkT||0)+dt;n.x=nx;n.y=ny;}
          else S.escortPath=null;
          if(S.wagon){S.wagon.x=n.x;S.wagon.y=n.y;}
        }
      }
    }else if(['rifts','siege','totems'].includes(type)){
      if(S.remaining===0&&!live())finish();
    }else if(type==='rescue'||type==='relics'){
      if(S.remaining===0)finish();
    }else if(type==='trial'){
      S.remaining=Math.max(0,S.timer-S.seconds);
      if(S.kills>=S.goal)finish();
      else if(S.seconds>=S.timer)fail('The hourglass ran out.');
    }
  };
  const shrine={x:gen.shrine[0],y:gen.shrine[1],type:'shrine',reach:1.7,active:true,
    color:'#55d8ff',get label(){return S.completed?'Trial Conquered':S.failed?'Retry: '+title:S.active?title:'Activate: '+title;},
    use:()=>{if(!S.completed&&!S.active)start();else if(S.active)report(S.description);}};
  world.portals.push(shrine);
  S.start=start;S.update=update;S.shrine=shrine;S.finish=finish;S.fail=fail;
  return S;
}
