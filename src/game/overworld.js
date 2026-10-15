// Twenty playable, shrine-activated overworld challenge scenarios.
// The original monster, loot, XP, rarity, combat and portal systems remain authoritative.
import { makeMonster } from './monster.js';
import { depthLevel } from '../data/depth.js';
import { UI } from '../ui/ui.js';
import { RNG } from '../core/util.js';

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
  ['Relics of Old Duskhollow','relics','Recover five ancient artifacts.'],
  ['The Black Conclave','necros','Slay the three necromancers and their undead guards.'],
  ['Hold the Crossing','bridge','Protect a crossing from four assault waves.'],
  ['The Killing Fields','battle','Repel five waves across the battlefield.'],
  ['The Rotting Hamlet','infestation','Save villagers during a zombie infestation.'],
  ['The Alpha Hunt','beasts','Hunt three monstrous alpha beasts.'],
  ['Break Their Siege','siege','Sabotage three siege engines and defeat their guards.'],
  ['The Corrupted Totems','totems','Cleanse four blighted forest totems.'],
  ['Trial of the Hourglass','trial','Slay twenty enemies before time runs out.'],
  ['Fate of the Wilds','random','A random ancient test is waiting behind the shrine.'],
];
const CENTER=[36.5,35.5];
const norm=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const pos=(p)=>[p[0],p[1]];
export function createOverworldScenario(world,gen,biome,onSuccess) {
  const rng=new RNG((gen.seed ^ 0x71bb5eed)>>>0), selected=gen.scenarioId%SCENARIOS.length;
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
      m.awake=true;
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
  const wave=(target=4,at=CENTER,arch=null)=>{
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
    const n={name,sprite:cls,pal:{hue:25,sat:.75,light:.08},x,y,flip:rng.chance(.5),hp:100};
    world.npcs.push(n);S.civilians.push(n);return n;
  };
  const fail=(reason)=>{
    if(S.completed||S.failed)return;
    S.failed=true;S.active=false;
    for(const m of S.foes)if(!m.dead)m.dead=true; // reset the encounter without granting loot
    clearMarkers();
    for(const n of S.civilians){const i=world.npcs.indexOf(n);if(i>=0)world.npcs.splice(i,1);}
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
  const start=()=>{
    if(S.active||S.completed)return;
    if(S.foes.length)for(const m of S.foes)if(!m.dead)m.dead=true;
    for(const n of S.civilians){const i=world.npcs.indexOf(n);if(i>=0)world.npcs.splice(i,1);}
    Object.assign(S,{active:true,failed:false,stage:0,kills:0,seconds:0,remaining:0,
      foes:[],markers:[],civilians:[],escort:null,routeIndex:0,wardHp:0,spawnedTotal:0,capture:0});
    report(description);UI.centerMsg(title.toUpperCase(),description,3.2);
    const bosses=(n,archs)=>{
      S.goal=n;
      for(let i=0;i<n;i++){
        const angle=(i/n)*Math.PI*2;
        const at=[CENTER[0]+Math.cos(angle)*8,CENTER[1]+Math.sin(angle)*8];
        spawn(archs[i%archs.length],world.map.randomNear(at[0],at[1],3,rng.fn()),'boss',1);
      }
    };
    const tasks=(n,label)=>{
      S.goal=n;S.remaining=n;
      for(let i=0;i<n;i++){
        const at=site(i+1),idx=i+1;
        mark(label+' '+idx,at,(m)=>{
          unmark(m);S.remaining--;S.stage++;report(label+': '+S.stage+'/'+S.goal);
          if(['rifts','totems','siege'].includes(type))group(idx+2,3,type==='rifts'?'wraith':type==='totems'?'shroom':'knight');
          if(S.remaining===0&&(!['rifts','totems','siege'].includes(type)||!live()))finish();
        },type==='rifts'?'#b050ff':type==='totems'?'#5de5a3':'#e6b969');
        if(['rescue','relics','rifts','siege','totems'].includes(type))group(i+2,3,type==='rescue'?'zombie':null);
      }
    };
    switch(type){
      case 'waves':case 'battle':case 'bridge': wave(type==='battle'?5:4);break;
      case 'bosses': bosses(3,['demon','knight','abomination']);break;
      case 'defend':case 'infestation':
        for(let i=0;i<4;i++)person('Villager '+(i+1),25+(i%2)*3,40+Math.floor(i/2)*3);
        S.wardHp=4;wave(type==='infestation'?4:3,[27,42],'zombie');break;
      case 'escort':
        S.escort=person('Caravan Guard',CENTER[0],CENTER[1]+3,'paladin');
        S.escort.hp=140;S.goal=4;S.routeIndex=0;
        S.route=[site(0),site(5),site(2),gen.exit];
        group(2,5,'hound');group(5,4,'archer');break;
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
    const p=player();
    if(type==='waves'||type==='battle'||type==='bridge'||type==='defend'||type==='infestation'||type==='ward'){
      const required=type==='battle'?5:type==='defend'?3:type==='ward'?3:4;
      const at=type==='defend'||type==='infestation'?[27,42]:CENTER;
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
        const attackers=S.foes.filter(m=>!m.dead&&norm([m.x,m.y],CENTER)<5).length;
        S.wardHp-=dt*attackers*2;
        if(S.wardHp<=0){fail('The shrine was destroyed.');return;}
      }else if(type==='bridge'&&norm([p.x,p.y],CENTER)>18&&S.seconds>16){
        // Leaving the crossing does not automatically end the challenge, but gives
        // the enemy a greater chance to overwhelm the player on return.
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
      if(norm([p.x,p.y],at)<3.5&&
          !S.foes.some(m=>!m.dead&&norm([m.x,m.y],at)<6))S.capture+=dt;
      else S.capture=Math.max(0,S.capture-dt*.3);
      if(S.capture>=10){S.stage++;S.remaining--;S.capture=0;report('Watchpost '+S.stage+'/3 secured!');if(S.stage>=3)finish();}
    }else if(type==='escort'){
      const n=S.escort;
      if(!n)return;
      const attackers=S.foes.filter(m=>!m.dead&&norm([n.x,n.y],[m.x,m.y])<3).length;
      n.hp-=dt*attackers*3;
      if(n.hp<=0){fail('The caravan was lost.');return;}
      const target=S.route[S.routeIndex];
      if(!target){finish();return;}
      if(norm([p.x,p.y],[n.x,n.y])<7){
        const d=norm([n.x,n.y],target);
        if(d<1.5){S.routeIndex++;report('Caravan checkpoint '+S.routeIndex+'/4');if(S.routeIndex>=4)finish();}
        else{
          const speed=dt*.95/d;
          const nx=n.x+(target[0]-n.x)*speed,ny=n.y+(target[1]-n.y)*speed;
          if(world.map.circleFree(nx,ny,.3)){n.x=nx;n.y=ny;}
          else{
            const next=world.map.randomNear(nx,ny,1.2,rng.fn());
            if(world.map.circleFree(next[0],next[1],.3)){n.x=next[0];n.y=next[1];}
          }
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
