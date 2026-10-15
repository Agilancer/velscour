// 60 original HEAVENLY opponents. Every entry has its OWN procedural sprite,
// distinct name, physical proportions, weapon/insignia and an existing, proven
// combat-AI archetype. Five visual ranks in each of twelve silhouette families.
const FAMILIES = [
  {code:'seraph',arch:'knight',height:76,names:[
    'Dawnfeather Seraph','Ashenwing Seraph','Duskstar Seraph','Vowbound Seraph','Seraph of the Seventh Dawn']},
  {code:'cherub',arch:'wraith',height:46,names:[
    'Vesper Cherub','Ivory Cherub','Lamenting Cherub','Radiant Cherub','Choir Prince of Luminance']},
  {code:'ophanim',arch:'eye',height:67,names:[
    'Golden Ophanim','Iris-Wheel Ophanim','Seven-Eyed Ophanim','Eclipse Ophanim','Thronewheel of Judgement']},
  {code:'warden',arch:'golem',height:85,names:[
    'Marble Warden','Lapis Warden','Sunstone Warden','Winged Reliquary','Colossus of the Pearly Gate']},
  {code:'herald',arch:'cultist',height:69,names:[
    'Trumpet Herald','Censer Herald','Scripture Herald','Sunburst Herald','Archherald of the Final Hymn']},
  {code:'templar',arch:'knight',height:73,names:[
    'Cloudsteel Templar','Halo Lancer','Sanctum Justiciar','Solar Shieldmaiden','High Palatine of the Firmament']},
  {code:'beast',arch:'hound',height:46,names:[
    'Ivory Cloudhound','Golden Shrine Lion','Starlit Kirin','Pearl Mane Guardian','Regal Lion of the Dawn']},
  {code:'griffin',arch:'gargoyle',height:65,names:[
    'Silverwake Griffin','Cobalt Sky Griffin','Solar Gryphon','Opaline Wingbeast','Royal Griffin of the Zenith']},
  {code:'luminary',arch:'elemental',height:58,names:[
    'Mote of Creation','Living Dawnfire','Azure Aetherborn','Prism Incarnate','Prime Luminary']},
  {code:'judgement',arch:'abomination',height:89,names:[
    'Hand of Penance','Many-Armed Exactor','Scourge of Truth','Executioner of Oaths','Avatar of Final Judgement']},
  {code:'oracle',arch:'archer',height:64,names:[
    'Pale Oracle','Lapis Diviner','Glasswing Seer','Golden Bow Prophet','Star-Eyed Archon']},
  {code:'throne',arch:'demon',height:96,names:[
    'Pillar of Providence','Exalted Dominion','Virtue Ascendant','Crown of Six Suns','Sovereign of the First Light']},
];
export const HEAVENLY_FAMILIES = FAMILIES;
export const HEAVENLY_MONSTERS = FAMILIES.flatMap((f,family) =>
  f.names.map((name,variant) => ({
    id:'hv_'+f.code+'_'+(variant+1), sheet:'heavenly/generated',
    i:family*5+variant, arch:f.arch, name,
    h:f.height+(variant-2)*3, el: family%4===1?'arcane':'holy',
    boss:variant===4, lone:variant===4, fly:['cherub','ophanim','griffin','luminary'].includes(f.code),
    gore:['warden','ophanim','luminary'].includes(f.code)?'rock':'flesh',
    undead:false, demon:false, heavenlyFamily:f.code, heavenlyVariant:variant
  })));
export const HEAVENLY_IDS = HEAVENLY_MONSTERS.map(x=>x.id);
