// Scenario-only guaranteed reward rolls, still using the game's item system.
import { rollItem } from '../data/items.js';

// Each beat: an Epic (a Legendary 25% of the time); a Mythic weapon is a slim chance that grows along the route.
export function rollSandScenarioRewards(beat, ilvl, random = Math.random) {
  const slot=beat===0?'weapon':beat===1?'offhand':undefined;
  const items=[rollItem(Math.max(1,ilvl),{rarity:random()<0.25?4:3,slot,base:beat===1?'shield':undefined})];
  const mythicChance=Math.min(0.1,(beat+1)*0.02);
  if(random()<mythicChance)items.push(rollItem(Math.max(1,ilvl),{rarity:5,slot:'weapon'}));
  return {items,mythicChance};
}
