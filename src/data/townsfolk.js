// Reusable town visitor catalog. Every townsfolk uses an original generated
// civilian sheet; playable class and helmet sprites are not part of this set.
const first=['Alden','Anwen','Bram','Brina','Cedric','Celia','Dain','Della','Eamon','Eira','Fenn','Freya','Gareth','Greta','Hale','Hilda','Ivo','Isolde','Jory','Junia','Kellan','Kelda','Lorin','Lysa','Marek','Maren','Niall','Nessa','Orin','Oona','Perrin','Petra','Quill','Questa','Rowan','Runa','Soren','Sylva','Tobin','Talia','Ulf','Una','Valen','Vera','Wystan','Willa','Yorick','Ysolde','Zeph','Zora'];
const last=['Ashford','Bell','Cobbler','Dale','Ember','Fletcher','Grove','Hearth','Ironwood','Juniper','Kettle','Loom','Miller','North','Oak','Pike','Quarry','Reed','Stone','Thatcher'];
const jobs=['baker','carter','shepherd','weaver','herbalist','mason','fisher','scribe','tanner','woodcutter','beekeeper','midwife','cobbler','cook','candlemaker','farmer','stablehand','tailor','apothecary','musician','porter','ferryman','guard','merchant','priest','blacksmith','falconer','innkeeper','jeweler','messenger'];
const royal=[['King Edric','king'],['Queen Elowen','queen'],['Prince Rowan','prince'],['Princess Mira','princess']];
const regular=[['Old Tobin','retired veteran'],['Mira','apprentice ranger'],['Brother Cael','chaplain'],['Gorm','retired guard']];
export const TOWNSFOLK=Object.freeze(Array.from({length:100},(_,i)=>{
  const isChild=i<10, isRoyal=i>=90&&i<94, isRegular=i>=94&&i<98;
  const name=isRoyal?royal[i-90][0]:isRegular?regular[i-94][0]:`${first[i%50]} ${last[Math.floor(i/5)%20]}`;
  const role=isRoyal?royal[i-90][1]:isRegular?regular[i-94][1]:isChild?['young baker','stable child','farmer’s child','page','choir child','weaver’s child','herbalist’s child','market runner','young squire','miller’s child'][i]:jobs[(i-10)%jobs.length];
  const sprite='townsfolk';
  const palette={hue:((i*37)%360)-180,sat:.22+((i*13)%55)/100,light:((i%5)-2)*.025};
  return Object.freeze({id:`townsfolk_${String(i+1).padStart(3,'0')}`,name,role,sprite,palette,child:isChild,royal:isRoyal,regular:isRegular,
    familyId:isChild?`family_${Math.floor(i/2)+1}`:!isRoyal&&!isRegular?`family_${Math.floor((i-10)/16)+1}`:null,
    frame:{w:128,h:192,count:11,order:['idle_1','idle_2','idle_3','walk_1','walk_2','dying_1','dead','scared_scream','scared_point','happy','celebrate']}});
}));

const openers=['The road was quiet until','A cart arrived just as','The old bell rang when','A raven carried word that','Someone left a lantern by','The market grew lively after','A child found a silver button while','The watch changed shifts as','The baker swears that','At dusk, the gate guard saw','The chapel keeper smiled when','A pair of travelers stopped as','The mill wheel slowed after','A young squire hurried in because','The queen paused to admire','The blacksmith laughed when','A peddler unpacked blue ribbons while','The town crier announced that','The orchard path filled with music as','A sleepy dog barked when'];
const subjects=['the north gate reopened','the caravan reached the square','the chapel candles all guttered','a lost hound came home','the royal party took the long way','a stranger asked about the keep','the rain finally stopped','the stable boy found a horseshoe','the fiddler learned a new reel','the old well echoed twice','a baker shared the first warm loaf','the watch found a missing glove','a child brought flowers to the chapel','the players announced a market show','a mason repaired the fountain step','the falcon returned with a blue ribbon','a traveler asked for the river road','the royal family visited the green','a lantern was lit above the inn','neighbors gathered to mend a cart'];
const responses=['and everyone lent a hand.','so the neighbors gathered to help.','which became the talk of the market.','and the children laughed all afternoon.','so the watch made a careful note.','and nobody minded the delay.','before the evening lamps were lit.','while the innkeeper set out warm bread.','and the whole square joined in.','but the old mason only smiled.'];
// Stable, seeded event cards give town visits a large authored combinatorial deck.
export const TOWN_SITUATIONS=Object.freeze(Array.from({length:2000},(_,i)=>Object.freeze({
  id:`town_event_${String(i+1).padStart(4,'0')}`,
  text:`${openers[Math.floor(i/100)]} ${subjects[Math.floor(i/10)%subjects.length]}, ${responses[i%responses.length]}`,
  mood:i%71===0?'fight':i%11===0?'celebration':i%17===0?'affection':i%29===0?'argument':'friendly',
})));

const lines=['The flour came in before sunrise.','Your boots need a good resole, friend.','The keep bells carry farther on cold mornings.','I saved you a honey cake for the road.','The children have been practicing their song.','The north wall looks handsome in this light.','I saw the royal falcons circling the orchard.','May your next journey bring you home safely.','That old joke gets funnier every winter.','The chapel garden is blooming again.'];
export function townLine(id,visit,beat=0){const n=TOWNSFOLK.findIndex(p=>p.id===id);return lines[Math.abs((n*7+visit*11+beat*3)%lines.length)];}
export function townEvent(visit,slot=0){return TOWN_SITUATIONS[(visit*37+slot*113)%TOWN_SITUATIONS.length];}
export function townConversation(a,b,visit){
  const ai=TOWNSFOLK.findIndex(p=>p.id===a.id),bi=TOWNSFOLK.findIndex(p=>p.id===b.id),n=Math.abs(ai*31+bi*17+visit*13);
  const starts=['How is the stall today?','Did your family sleep well?','The keep looks grand from here.','I brought fresh bread for the watch.','The children found a new game.','Your work at the forge is famous.','Will you hear the musicians tonight?','The road was muddy this morning.','I saved a place beside the fountain.','That was a fine story you told.'];
  const replies=['Busy, but the neighbors make it pleasant.','All well, and they send their greetings.','It does; the banners are bright today.','You are kind. Share it with the guard.','They have been laughing all afternoon.','You flatter me; I am still learning.','I would not miss it for the world.','The carter says it should dry by noon.','Gladly. I have a tale to trade.','Wait until you hear the ending.'];
  return [starts[n%starts.length],replies[Math.floor(n/7)%replies.length]];
}
