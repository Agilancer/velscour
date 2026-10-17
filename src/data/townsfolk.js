// Town visitor roster: 25 individually generated designs, expanded in play by
// engine palette swaps rather than duplicate exported character sheets.
const first=['Alden','Anwen','Bram','Brina','Cedric','Celia','Dain','Della','Eamon','Eira','Fenn','Freya','Gareth','Greta','Hale','Hilda','Ivo','Isolde','Jory','Junia','Kellan','Kelda','Lorin','Lysa','Marek','Maren','Niall','Nessa','Orin','Oona','Perrin','Petra','Quill','Questa','Rowan','Runa','Soren','Sylva','Tobin','Talia','Ulf','Una','Valen','Vera','Wystan','Willa','Yorick','Ysolde','Zeph','Zora'];
const last=['Ashford','Bell','Cobbler','Dale','Ember','Fletcher','Grove','Hearth','Ironwood','Juniper','Kettle','Loom','Miller','North','Oak','Pike','Quarry','Reed','Stone','Thatcher'];
const children=['Pip Ashford','Miri Bell','Toma Dale','Elsie Ember','Ned Fletcher','Lottie Grove','Finn Hearth','Ada Loom','Robin Oak','Willa Reed'];
const childRoles=['baker’s apprentice','stable child','farmer’s child','chapel chorister','weaver’s daughter','young squire','herbalist’s helper','market runner','miller’s son','carter’s child'];
const jobs=['baker','carter','shepherd','weaver','herbalist','mason','fisher','scribe','tanner','woodcutter','beekeeper','midwife','cobbler','cook','candlemaker','farmer','stablehand','tailor','apothecary','musician','porter','ferryman','guard','merchant','priest','blacksmith','falconer','innkeeper','jeweler','messenger','carpenter','glassblower','seamstress','miller','storyteller','laundress','town crier'];
const spriteForJob=j=>({baker:1,'charcoal burner':2,merchant:5,healer:6,guard:7,blacksmith:9,ferryman:11,'tavern keeper':12,midwife:13,carpenter:14,herbalist:15,shepherd:16,miller:17,seamstress:18,knight:19,'royal steward':23,'court lady':24,'royal scribe':25,'village cook':12}[j]||((Math.max(0,jobs.indexOf(j))%18)+1));
const royals=[['King Edric','king',10],['Queen Elowen','queen',8],['Prince Rowan','prince',3],['Princess Mira','princess',4]];
const court=[['Lord Steward Halric','royal steward',23],['Lady Ysabet','court lady',24],['Tomas the Royal Scribe','royal scribe',25]];
const regular=[['Old Tobin','retired veteran',7],['Mira','apprentice ranger',16],['Brother Cael','chaplain',6],['Gorm','retired guard',7]];
const knights=[['Sir Aldric Vane','knight',19],['Dame Maeve Thorn','knight',20],['Sir Bastian Vale','knight',21],['Dame Rosette Marr','knight',22]];

export const TOWNSFOLK=Object.freeze(Array.from({length:100},(_,i)=>{
  let name,role,child=false,royal=false,regularVisitor=false,courtier=false,knight=false,spriteIndex,familyId=null;
  if(i<10){name=children[i];role=childRoles[i];child=true;spriteIndex=[3,4,3,4,3,4,15,3,4,16][i];familyId=`family_${1+Math.floor(i/2)}`;}
  else if(i<79){const n=i-10;role=jobs[n%jobs.length];name=`${first[n%first.length]} ${last[Math.floor(n/first.length)%last.length]}`;spriteIndex=spriteForJob(role);if(n<5)familyId=`family_${n+1}`;}
  else if(i<83){[name,role,spriteIndex]=knights[i-79];knight=true;}
  else if(i<86){[name,role,spriteIndex]=court[i-83];courtier=true;}
  else if(i<90){[name,role,spriteIndex]=royals[i-86];royal=true;}
  else if(i<94){[name,role,spriteIndex]=regular[i-90];regularVisitor=true;}
  else {const n=i-94;role=['beekeeper','fisher','woodcutter','jeweler','porter','village cook'][n];name=`${first[40+n]} ${last[15+n]}`;spriteIndex=spriteForJob(role);}
  const hue=((i*37)%360)-180;
  return Object.freeze({id:`townsfolk_${String(i+1).padStart(3,'0')}`,name,role,sprite:'townsfolk',spriteId:`townsfolk_${String(spriteIndex).padStart(3,'0')}`,
    palette:{hue,sat:.84+((i*7)%24)/100,light:((i%5)-2)*.025},child,royal,regular:regularVisitor,courtier,knight,familyId,
    frame:{w:128,h:192,count:knight?13:11,order:knight?['idle_1','idle_2','idle_3','walk_1','walk_2','dying_1','dead','scared_scream','scared_point','happy','celebrate','attack_1','attack_2']:['idle_1','idle_2','idle_3','walk_1','walk_2','dying_1','dead','scared_scream','scared_point','happy','celebrate']}});
}));

const places=['the market square','the old well','the north gate','the chapel steps','the orchard lane','the inn yard','the smithy green','the riverside path','the town bridge','the watchtower walk'];
const details=['under the first frost','as the bells ring vespers','while the rain clears','before the bread ovens open','beneath bright festival ribbons','as the evening watch changes','after a long road home','while lanterns are being lit','during the noon market rush','before dawn breaks'];
const events=[
 ['royal_visit','Royal Procession','royal','royal','The royal family arrives to greet the town','A courtier calls for room as the banners rise'],
 ['wedding','Wedding Feast','affection','wedding','Two villagers join hands in a town wedding','The fiddlers strike a joyful tune for the newlyweds'],
 ['birth','New Child','celebration','birth','The midwife announces a healthy newborn','Neighbors bring warm broth and a soft blanket'],
 ['birthday','Name Day Party','celebration','party','A family begins a lively name-day party','Children chase ribbons while the musicians play'],
 ['funeral','Town Funeral','grief','funeral','The town gathers to mourn a beloved neighbor','Friends share memories beside a candlelit bier'],
 ['harvest_fair','Harvest Fair','celebration','fair','The harvest fair opens with food stalls and games','A juggler draws a crowd by the cider barrels'],
 ['victory_feast','Victory Feast','celebration','party','The returning patrol is welcomed with a feast','The watch captain raises a cup to those who came home'],
 ['street_fight','Market Brawl','fight','fight','A quarrel spills into a brief market scuffle','Two rivals square off as friends rush to separate them'],
 ['enemy_scouts','Enemy Scouts','alarm','alarm','A lookout spots enemy scouts beyond the walls','The gate watch signals danger and townsfolk hurry indoors'],
 ['siege_warning','Looming Threat','alarm','alarm','Smoke rises beyond the distant road','A messenger warns that a hostile force is gathering'],
 ['returning_knights','Knights Return','celebration','royal','The town knights return from a hard patrol','The crowd cheers as the battered banners come into view'],
 ['lost_child','Lost Child Found','relief','affection','A missing child is found safe near the orchard','The family embraces as the search party lets out a cheer'],
 ['engagement','Betrothal','affection','affection','A pair announces their betrothal to the town','A ring catches the candlelight as the neighbors applaud'],
 ['winter_feast','Winter Feast','celebration','party','The inn hosts a warm winter gathering','A fiddler begins a reel while bowls of stew are passed'],
 ['market_show','Market Performance','happy','celebration','A traveling performer entertains the square','A clever tale earns laughter and a shower of copper coins'],
 ['caravan','Caravan Arrival','happy','celebration','A distant caravan reaches the town at last','Merchants unpack bright cloth and stories from far away'],
 ['healers_call','Healers Needed','grief','alarm','The healer calls for help after a rough night','Neighbors bring clean linen and water to the infirmary'],
 ['storm_damage','Storm Repairs','friendly','celebration','Neighbors gather to mend storm damage','The carpenter and masons organize a willing repair crew'],
 ['monster_sighting','Monster Sighting','alarm','alarm','A creature is seen prowling beyond the outer fields','The watch raises the warning horn while the gate is barred'],
 ['peace_treaty','Truce and Toast','relief','celebration','A tense border truce is celebrated in the square','Old rivals share bread while the watch keeps careful guard'],
];
const emotes={royal:'royal',wedding:'affection',birth:'birth',party:'celebration',funeral:'grief',fair:'celebration',fight:'fight',alarm:'alarm',affection:'affection',celebration:'celebration',grief:'grief',relief:'relief',happy:'celebration',friendly:'friendly'};
export const TOWN_SITUATIONS=Object.freeze(Array.from({length:2000},(_,i)=>{
  const archetype=events[Math.floor(i/100)],v=i%100,place=places[v%10],detail=details[Math.floor(v/10)],time=details[(v*3+Math.floor(i/100))%10];
  const [kind,title,mood,emote,intro,beat]=archetype;
  const text=`${intro}: ${title.toLowerCase()} unfolds at ${place} ${detail}; ${beat.toLowerCase()} ${time}.`;
  const visualMood=emotes[emote]||emote;
  return Object.freeze({id:`town_event_${String(i+1).padStart(4,'0')}`,kind,title,text,mood,emote:visualMood,
    actors:kind==='royal_visit'?['royal','courtier']:kind.includes('knight')?['knight']:kind==='wedding'||kind==='engagement'?['adult','child']:kind==='birth'?['midwife','family']:kind.includes('fight')?['knight','adult']:kind.includes('alarm')||kind.includes('scout')?['knight','watch']:['adult','child'],
    particle:visualMood,attack:kind==='street_fight'});
}));

const openings=['Did you hear the bell','How fares your household','The road brought a strange tale','I saved you a place','The market was lively','The watch changed early','The baker has fresh loaves','A traveler spoke of','The chapel candles burned late','Your work looks fine','The children found','I saw the royal colors','The river ran high','The inn has room','The smith sang','A raven dropped','The orchard smells of','The old wall needs','The fiddler promised','I brought news from'];
const replies=['The whole square is talking','All are well, and send their love','We should tell the captain','Then let us share a cup','I traded for a fine ribbon','That explains the hurried patrol','Save one for the gate watch','The elders remember it too','We will light another candle','Thank you; the neighbors helped','They have made a game of it','The banners looked bright at dusk','The ferry rope held through it','There is always room for a friend','It kept the evening cheerful','The children will want to hear','I will walk there after supper','I can bring stone at dawn','The town will gather to listen','I will carry word to the keep'];
const topics=['royal visit','wedding bells','a newborn child','the harvest fair','a neighbor’s funeral','the missing patrol','enemy torches on the ridge','the market brawl','the winter feast','the new bridge','a lost dog','the caravan','the rain damage','the chapel choir','the old well','the watch captain','the orchard bloom','a knight’s return','the fiddler’s tune','the baker’s new oven'];
export const TOWN_CONVERSATIONS=Object.freeze(Array.from({length:2000},(_,i)=>{
  const a=Math.floor(i/100),b=Math.floor(i/5)%20,c=i%5;
  return Object.freeze({id:`town_chat_${String(i+1).padStart(4,'0')}`,lines:[`${openings[a]} about ${topics[(a+c*3)%topics.length]}?`,`${replies[b]}; I will ask ${topics[(b+c*5)%topics.length]} when we meet.`]});
}));

const greetings=['The flour came in before sunrise.','Your boots need a good resole, friend.','The keep bells carry farther on cold mornings.','I saved you a honey cake for the road.','The children have been practicing their song.','The north wall looks handsome in this light.','I saw the royal falcons circling the orchard.','May your next journey bring you home safely.','That old joke gets funnier every winter.','The chapel garden is blooming again.'];
export function townLine(id,visit,beat=0){const n=TOWNSFOLK.findIndex(p=>p.id===id);return greetings[Math.abs((n*7+visit*11+beat*3)%greetings.length)];}
export function townEvent(visit,slot=0){return TOWN_SITUATIONS[(visit*37+slot*113)%TOWN_SITUATIONS.length];}
export function townConversation(a,b,visit,eventIndex=0){const ai=TOWNSFOLK.findIndex(p=>p.id===a.id),bi=TOWNSFOLK.findIndex(p=>p.id===b.id),n=Math.abs(ai*31+bi*17+visit*13+eventIndex*7)%TOWN_CONVERSATIONS.length;return TOWN_CONVERSATIONS[n].lines;}
