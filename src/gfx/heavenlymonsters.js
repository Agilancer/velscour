// HEAVENLY monster sprites: the 60 hv_ monsters (data/heavenly.js) are cut from painted sheets only, the
// user-approved painting for each family's first rank (approvedbiomeart.js) and the 8x8 painted sheet for the rest
// (aibiomeart.js). Until a sheet has loaded this returns null and the archetype's pixel sprite stands in, like the
// other monster art. Keeps the bestiary's foot anchor and flash/corpse/palette-swap contract.
import { recolor, silhouette, swapKey } from '../core/util.js';
import { HEAVENLY_MONSTERS } from '../data/heavenly.js';
import { approvedHeavenlyMonsterCanvas, preloadApprovedHeavenlySprites } from './approvedbiomeart.js';
import { aiHeavenlyMonsterCanvas, preloadAIGeneratedHeavenlySprites } from './aibiomeart.js';

const BY_ID = Object.fromEntries(HEAVENLY_MONSTERS.map(e=>[e.id,e]));
export const CACHE = new Map(), MAX=88;
let preloadPromise = null;
export function preloadApprovedHeavenlyArtwork() {
  return preloadPromise || (preloadPromise=Promise.all([
    preloadApprovedHeavenlySprites(), preloadAIGeneratedHeavenlySprites(),
  ]).then(([image])=>{
    CACHE.clear(); // a first-rank look cut before the approved painting decoded used the other sheet
    return image;
  }));
}
function baseSprite(a) {
 // The user-approved paintings win for one sprite per Heavenly family (variant 0); the painted sheet covers the rest.
 if(a.heavenlyVariant===0) {
   const approved=approvedHeavenlyMonsterCanvas(a.heavenlyFamily);
   if(approved) return approved;
 }
 return aiHeavenlyMonsterCanvas(HEAVENLY_MONSTERS.indexOf(a));
}
/** Same interface as core/enemyart's enemyImage; bounded to avoid iOS canvas leaks. */
export function heavenlyEnemyImage(id,swap=null,mode=''){
 const a=BY_ID[id];if(!a)return null;
 const key=id+'|'+swapKey(swap);
 let image=CACHE.get(key);
 if(image){CACHE.delete(key);CACHE.set(key,image);}
 else{
   image=baseSprite(a);
   if(!image)return null;
   if(swap)image=recolor(image,swap);
   image._art={fx:80};
   CACHE.set(key,image);
   while(CACHE.size>MAX)CACHE.delete(CACHE.keys().next().value);
 }
 // flash/corpse silhouettes hang off the base sprite (util.silhouette), so they never evict a look
 return mode?silhouette(image,mode==='flash'?'#ffffff':'rgba(23,9,15,.67)'):image;
}
