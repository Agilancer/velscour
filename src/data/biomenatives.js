// Fifty additional, individually named combatants per combat biome.
// Native identities are deterministic and retain the original painted
// VELSCOUR art as a silhouette source, then acquire distinct biome-specific
// equipment, markings and silhouette extensions in gfx/biomenatives.js.
// No entries for Duskhollow, which has no combat.
const ROLES=[
 'Reaver','Sentry','Harrower','Templar','Stalker','Myrmidon','Seer','Warden','Devourer','Custodian',
 'Marauder','Huntress','Exactor','Ravager','Invoker','Harbinger','Watchman','Goliath','Hexer','Sentinel',
 'Drifter','Lurker','Executioner','Ranger','Binder','Acolyte','Colossus','Skirmisher','Wraithlord','Oracle',
 'Punisher','Crusher','Herald','Destroyer','Prowler','Whisperer','Armiger','Prophet','Guardian','Spellweaver',
 'Archfiend','Curator','Inquisitor','Ritualist','Tyrant','Matriarch','Overseer','Revenant','Eclipse King','Ascendant',
];
const ASPECT=[
 'Crowned','Venerable','Veiled','Split-Horned','Runebound',
 'Glass-Eyed','Twin-Bladed','Ironhearted','Star-Marked','Thorn-Crowned',
 'Gilded','Bone-Helmed','Ash-Wreathed','Moonstruck','Flame-Sworn',
 'Rune-Etched','Elder','Nightbound','Thrice-Forged','Bloodied',
 'Oathbroken','Storm-Touched','Graveborn','Spectral','Blackened',
 'Forsaken','Crystal-Clad','Feral','Sundered','Echoing',
 'Witchmarked','Mistbound','Spireborn','Frost-Wreathed','Scarred',
 'Serpentine','Wandering','Dread','Dawnless','Pale',
 'Moss-Grown','Void-Touched','Brass-Bound','Sun-Blinded','Arcane',
 'Giant','Blessed','Cursed','Ember-Eyed','Immortal',
];
const compatible=(a,arch)=>a.arch===arch||(a.also&&a.also.includes(arch));
/** Supply the actual static bestiary as a source of approved original silhouettes. */
export function buildBiomeNatives(biomes,staticArts) {
 const source=staticArts.filter(a=>a.sheet&&a.sheet!=='heavenly/generated'&&
   !a.sheet.includes('/generated')&&!a.id.startsWith('bn_')&&!a.lone);
 const out=[];
 for(const b of biomes){
   // The throne is a combat dungeon and the wilderness is too; town is not a BIOME.
   const roster=b.roster||[];
   if(!roster.length)continue;
   for(let i=0;i<50;i++){
     const arch=roster[(i*7+Math.floor(i/roster.length))%roster.length];
     const choices=source.filter(a=>compatible(a,arch));
     if(!choices.length)throw new Error('Missing approved monster source for '+b.id+':'+arch);
     const art=choices[(i*11+ b.id.length*7 + (i>>2))%choices.length];
     const rank=i%5;
     const monster={
       id:'bn_'+b.id+'_'+String(i).padStart(2,'0'),
       name:ASPECT[i]+' '+ROLES[i]+' of '+b.name.replace(/^.*? — /,''),
       sheet:'biome/generated',sourceArt:art.id,homeBiome:b.id,
       arch,h:Math.max(32,Math.min(115,(art.h||54)+(rank-2)*2)),
       el:b.el==='phys'?(art.el||'phys'):b.el,boss:i>=45,
       lone:i>=45,fly:!!art.fly,gore:art.gore||'flesh',
       nativeVariant:i, nativeRole:ROLES[i],nativeAspect:ASPECT[i],
       undead:art.undead,demon:art.demon,
     };
     out.push(monster);
   }
 }
 return out;
}
export const BIOME_NATIVE_COUNT=50;
