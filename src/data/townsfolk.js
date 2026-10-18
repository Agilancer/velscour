// Herrington Hollow's 100 residents: 25 painted identities plus 75 pre-painted colourway sheets of the first ten
// (tools/build_townsfolk_pack.py). What they do and say lives in src/game/townlife.js and src/data/townscripts.js.
import { townFrameCount } from '../game/townsfolkvisuals.js';
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

const wayTurn={};
export const TOWNSFOLK=Object.freeze(Array.from({length:100},(_,i)=>{
  let name,role,child=false,royal=false,regularVisitor=false,courtier=false,knight=false,spriteIndex,familyId=null;
  if(i<10){name=children[i];role=childRoles[i];child=true;spriteIndex=[3,4,3,4,3,4,15,3,4,16][i];familyId=`family_${1+Math.floor(i/2)}`;}
  else if(i<79){const n=i-10;role=jobs[n%jobs.length];name=`${first[n%first.length]} ${last[Math.floor(n/first.length)%last.length]}`;spriteIndex=spriteForJob(role);if(n<5)familyId=`family_${n+1}`;}
  else if(i<83){[name,role,spriteIndex]=knights[i-79];knight=true;}
  else if(i<86){[name,role,spriteIndex]=court[i-83];courtier=true;}
  else if(i<90){[name,role,spriteIndex]=royals[i-86];royal=true;}
  else if(i<94){[name,role,spriteIndex]=regular[i-90];regularVisitor=true;}
  else {const n=i-94;role=['beekeeper','fisher','woodcutter','jeweler','porter','village cook'][n];name=`${first[40+n]} ${last[15+n]}`;spriteIndex=spriteForJob(role);}
  // Sheets 26-100 are pre-painted colourways of the ten source identities (sheet k shows identity (k-1)%10+1):
  // ordinary folk wear one of those, so all 100 sheets appear.
  const plain=!royal&&!courtier&&!knight&&!regularVisitor&&spriteIndex<=10;
  const ways=plain?Array.from({length:75},(_,k)=>k+26).filter(k=>(k-1)%10+1===spriteIndex):[];
  const turn=wayTurn[spriteIndex]=(wayTurn[spriteIndex]||0)+1;
  const sheet=ways.length&&turn%(ways.length+1)?ways[(turn-1)%ways.length]:spriteIndex;
  const spriteId=`townsfolk_${String(sheet).padStart(3,'0')}`;
  // who they talk like (townscripts.js BARKS / CHATS tags)
  const group=child?'kids':royal||courtier?'royal':knight?'knight':/guard|veteran/.test(role)?'guard':/retired|storyteller|midwife|chaplain|priest/.test(role)?'old':'any';
  const worker=/baker|carter|mason|tanner|woodcutter|carpenter|blacksmith|porter|miller|farmer|stablehand|cobbler|weaver|glassblower/.test(role);
  return Object.freeze({id:`townsfolk_${String(i+1).padStart(3,'0')}`,name,role,sprite:'townsfolk',spriteId,
    palette:null,child,royal,regular:regularVisitor,courtier,knight,familyId,group,worker,
    frame:{w:256,h:192,count:townFrameCount(spriteId)}});
}));

