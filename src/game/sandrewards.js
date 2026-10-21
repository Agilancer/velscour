// Scenario-only guaranteed reward rolls, still using the game's item system.
import { rollItem, rarityAt, RARITY } from '../data/items.js';

// Each beat: an Epic (a Legendary 25% of the time); a Mythic weapon is a slim chance that grows along the route.
// Rarities the item level hasn't unlocked yet step down (rarityAt): early routes pay Rares.
export function rollSandScenarioRewards(beat, ilvl, random = Math.random) {
  const slot=beat===0?'weapon':beat===1?'offhand':undefined;
  ilvl=Math.max(1,ilvl);
  const items=[rollItem(ilvl,{rarity:rarityAt(ilvl,random()<0.25?4:3),slot,base:beat===1?'shield':undefined})];
  const mythicChance=ilvl>=RARITY[5].minIlvl?Math.min(0.1,(beat+1)*0.02):0;
  if(random()<mythicChance)items.push(rollItem(ilvl,{rarity:5,slot:'weapon'}));
  return {items,mythicChance};
}
