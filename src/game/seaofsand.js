// A Sea of Sand run chains one to five ordinary overworld scenarios through a
// single cliff maze. The established scenario engines still own each beat.
import { createOverworldScenario } from './overworld.js';
import { SAND_BOSSES } from '../data/seaofsand.js';
import { GroundItem } from './loot.js';
import { rollSandScenarioRewards } from './sandrewards.js';
import { G } from '../state.js';
import { UI } from '../ui/ui.js';

export function createSeaOfSandScenario(world, gen, biome, onSuccess) {
  const c=G.char, key=String(world.depth), runs=c.seaOfSandRuns||(c.seaOfSandRuns={});
  const record=runs[key]||(runs[key]={seed:gen.seed,completed:0,rewarded:0});
  const sites=gen.scenarioSites||[gen.shrine],total=sites.length;
  let beat=Math.min(total,Math.max(record.completed||0,record.rewarded||0)),current=null;
  const run={id:'sea_of_sand',active:false,completed:false,failed:false,
    get beat(){return beat;},get total(){return total;},get current(){return current;},
    get title(){return current?.title||'Sea of Sand';},
    get shrine(){return current?.shrine;},get type(){return current?.type;},
    get markers(){return current?.markers||[];},get route(){return current?.route||[];},
    get stage(){return current?.stage||0;},get escort(){return current?.escort||null;},
    get routeIndex(){return current?.routeIndex||0;},
    get hud(){
      if(!current)return {title:'Sea of Sand',beat,total,timer:'',progress:beat>=total?'All areas secured':'Preparing next area'};
      const timer=current.timer>0?`${Math.max(0,Math.ceil(current.timer-current.seconds))}s`:'';
      let progress='';
      if(current.failed)progress='Failed — return to the shrine to retry';
      else if(current.goal>0){
        const done=current.kills>0?current.kills:Math.max(0,current.goal-(current.remaining||current.goal));
        progress=`Objectives ${Math.min(current.goal,done)}/${current.goal}`;
      } else progress=`Stage ${current.stage||0}`;
      return {title:current.title,beat:Math.min(total,beat+1),total,timer,progress};
    },
    update(dt){if(current){current.update(dt);run.active=current.active;}},
  };
  const finishRun=()=>{
    run.active=false;run.completed=true;
    if(onSuccess)onSuccess(run);
  };
  const reward=(index)=>{
    if(index<record.rewarded)return;
    const {items,mythicChance}=rollSandScenarioRewards(index,Math.max(1,world.depth*2));
    world.addLoot(new GroundItem(sites[index][0],sites[index][1], 'item',{item:items[0]}));
    if(items[1]){
      world.addLoot(new GroundItem(sites[index][0]+.45,sites[index][1], 'item',{item:items[1]}));
      UI.log(`The route yielded a Mythic weapon (${Math.round(mythicChance*100)}% scenario chance).`,'#ff536e');
    }
    record.rewarded=index+1;
    UI.log(`Sea of Sand reward ${index+1}/${total}: guaranteed Legendary gear.`,'#ffb044');
  };
  const beginBeat=(index)=>{
    if(index>=total){finishRun();return;}
    beat=index;run.active=true;run.completed=false;
    const p=sites[index],subgen={...gen,scenarioId:(gen.scenarioId+index*7)%20,shrine:p,
      sites:Array.from({length:9},(_,i)=>{const a=i*Math.PI*2/8;return [p[0]+Math.cos(a)*7,p[1]+Math.sin(a)*6];})};
    const originalSite=subgen.sites;
    // Scenario beats use the generated ring around their own landmark rather
    // than the forest's single central shrine.
    current=createOverworldScenario(world,{...subgen,sites:originalSite},biome,()=>{
      reward(index);
      record.completed=Math.max(record.completed||0,index+1);
      UI.refresh();
      if(index+1<total){
        UI.centerMsg(`AREA ${index+1} SECURED`,`Scenario ${index+2} is marked on the route`,2.4);
        beginBeat(index+1);
      } else finishRun();
      if(G.game?.autosave)G.game.autosave();
    });
  };
  if(beat>=total){run.completed=true;finishRun();}
  else beginBeat(beat);
  return run;
}
