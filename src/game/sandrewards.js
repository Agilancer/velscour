// Scenario-only guaranteed reward rolls, still using the game's item system.
import { rollItem } from '../data/items.js';

export function rollSandScenarioRewards(beat, ilvl, random = Math.random) {
  const slot=beat===0?'weapon':beat===1?'offhand':undefined;
  const items=[rollItem(Math.max(1,ilvl),{rarity:4,slot,base:beat===1?'shield':undefined})];
  const mythicChance=Math.min(0.95,(beat+1)*0.19);
  if(random()<mythicChance)items.push(rollItem(Math.max(1,ilvl),{rarity:5,slot:'weapon'}));
  return {items,mythicChance};
}
