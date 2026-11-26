// What Phobos says (game/phobostalk.js): the occupiers and riff-raff in the streets and the castle, the gray folk who
// keep their heads down, and the good folk who help. Each kind is an opener and a line, joined (an empty opener stands
// the line alone), so a few hundred written pieces give thousands of different quips. {place} is the district or wing
// the speaker stands in, {lord} a ward lord there; tools/tests/phobostalk.mjs counts them and checks every one fits a
// three-line bubble.

// ---------------------------------------------------------------- the occupiers: idle chatter between themselves
const FOE_OPEN = ['', '', '', 'Tell you what,', 'Honestly,', 'Word is,', 'Between us,', 'Mark me,', 'Swear on the bells,', 'Look,', 'Heard it twice now:',
  'Not to complain, but', 'Don\'t tell the sergeant, but', 'Straight up,', 'I\'m only saying,', 'Funny thing,', 'Real talk,', 'Oi,', 'Psst,', 'Listen,',
  'Gods help me,', 'By the Herald\'s teeth,', 'On my mother\'s grave,', 'If you ask me,', 'Nobody asked, but', 'Last watch,', 'Quiet now,'];
const FOE_IDLE = [
  'the Herald docked my pay again.', 'nobody\'s been paid since the bells went quiet.', 'the castle wants more bodies for the wall.',
  '{lord} has us walking this street till dawn.', 'I joined for the looting, not the guard duty.', 'the gruel in {place} has teeth in it.',
  'somebody stole my boots. Again.', 'the Captain counts us twice and still comes up short.', 'they say Velscour never sleeps.',
  'the dead in the moat moved last night.', 'I\'d trade this halberd for a hot bath.', 'the rats here are better fed than us.',
  'the bell-ringers in Bellmourn are up to something.', 'a hero came through the Chasm, they say.', 'I heard screaming from the castle again.',
  '{place} smells worse every week.', 'my shift ended an hour ago.', 'the walls are taller than they were yesterday.',
  'the Sexton wants volunteers. Don\'t volunteer.', 'a man in Chainmarket sold his own shadow.', 'the Duke\'s cellar is full of wine and teeth.',
  'I saw something big in the Slough.', 'the gate stays shut till the lords say otherwise.', 'they\'re hanging another bell-ringer at dawn.',
  'the castle\'s windows watch you back.', 'my sword\'s gone soft from all this standing.', 'there\'s a card game behind the tannery tonight.',
  'the Feast That Walks ate the cook.', 'they\'ve doubled the watch on the King\'s Mile.', 'nobody goes up the Ossein Stair twice.',
  'the Bridge Warden fined me for breathing.', 'my brother deserted. Lucky sod.', 'I\'ve not seen the sun since spring.',
  'the Gate Captain keeps a list. I\'m on it.', 'the scrolls in the Library bite.', 'the ward lords don\'t sleep, they just stand there.',
  'I bet the hero dies in the Barbican.', 'I\'ve a coin on the hero reaching the castle.', 'the moat plain was green, once.',
  'the Herald talks to the ravens.', 'someone painted a bell on the barracks wall.', 'the Mages\' Rise lights up at midnight.',
  'I swear the cobbles move in {place}.', 'they found another one hanging in the Rookeries.', 'my feet hurt, my back hurts, my soul hurts.',
  'the Tanners\' Steps water is green again.', 'I need a new helmet. This one leaks.', 'the castle kitchens are serving \'meat\'. Just \'meat\'.',
  'the Balcony Duellist challenged a pigeon, and lost.', 'I\'ve been demoted to \'spare\'.', 'the barracks roof fell in again.',
  'they say the King\'s Mile used to have a king on it.', 'the chains in Chainmarket rattle by themselves.', 'my mate went into the castle. Came out quieter.',
  'I keep a lucky bone. It\'s not working.', 'they\'ve run out of rope at the gallows.', 'there\'s gold in the Wharf if you don\'t mind eels.',
  'the Bone Yards dig themselves up at night.', 'the drawbridge chain squeals like a pig.', 'the fog in {place} tastes of copper.',
];
// a second voice answering the first
const FOE_REPLY = ['Shut it.', 'You said that yesterday.', 'Keep your voice down.', 'Aye, and?', 'Don\'t let the sergeant hear.', 'Heh. True enough.',
  'Rather you than me.', 'Bah.', 'Hold your tongue or lose it.', 'Same as ever.', 'Gods, not this again.', 'You\'ll get us both flogged.', 'Mm.',
  'I heard worse.', 'Pay\'s pay.', 'I don\'t want to know.', 'Watch the street, idiot.', 'Tell it to {lord}.', 'And whose fault is that?',
  'You owe me three coppers.', 'Ha! Good one.', 'Not funny.', 'That\'s the castle for you.', 'Pass the flask.', 'Wake me when it\'s over.',
  'I\'m not paid to think.', 'Shh. Something moved.', 'Who told you that?', 'Lies. All lies.', 'Could be worse. Could be raining.',
  'Don\'t say his name.', 'Bet you a copper it\'s true.', 'I\'ll believe it when I see it.', 'Keep walking.'];
// ---------------------------------------------------------------- at the hero
const TAUNT_OPEN = ['', '', 'Oi!', 'Hah!', 'Fresh meat!', 'There you are!', 'Look lively, lads!', 'Hero!', 'Gotcha!', 'Over here!', 'You!',
  'Come on, then!', 'Ha ha!', 'Ooh, a shiny one!', 'For the castle!', 'For the Herald!', 'Velscour wills it!', 'Hold the line!', 'Get \'em!',
  'Well, well.', 'Look what crawled out of the Chasm!', 'Stop right there!', 'Not one step further!', 'Bells won\'t save you!', 'Ring the alarm!'];
const TAUNT = ['You\'re a long way from Bellmourn.', 'Nobody leaves {place} alive.', 'I\'ll hang your boots on the gate.', 'The castle sees you, hero.',
  'Your blood\'ll wash the cobbles.', 'I\'ve killed better than you before breakfast.', 'Turn around and run.', 'The ward lords will have your head.',
  'That armour\'ll fetch a good price.', 'Is that all you\'ve got?', 'You swing like a bell-ringer.', '{lord} pays double for heroes.',
  'This street is ours.', 'Lay down your arms!', 'Pray to whoever listens.', 'Velscour knows your name.', 'I\'ll make it quick. Probably.',
  'Your mother should\'ve kept you home.', 'The moat\'s got room for one more.', 'Another hero for the pile!', 'I\'ve got a bet riding on this!',
  'Hold still!', 'Stand and die!', 'We\'re many, you\'re one.', 'You\'ll never see the castle.', 'Too slow!', 'Missed me!',
  'Your gods aren\'t here.', 'Phobos eats heroes.', 'The bells toll for you.', 'Smile for the gallows.', 'You picked the wrong street.',
  'Nobody\'s coming to help you.', 'I\'ll take your gold and your teeth.', 'The Herald will hear of this!', 'You\'re bleeding, hero.',
  'Back to the Chasm with you!', 'This is our city now!', 'Kneel!', 'Let\'s see you dance!', 'I\'ll wear your skull as a hat.',
  'The castle\'s hungry tonight.', 'Your journey ends in {place}.', 'Cut him down!', 'Surround them!', 'I\'ve got you now!'];
const HURT = ['Argh!', 'My arm!', 'That one stung!', 'Ow! Ow!', 'You\'ll pay for that!', 'Lucky hit!', 'I\'m bleeding!', 'Medic! Anyone!',
  'Not the face!', 'Gah, my ribs!', 'That\'s it, I\'m angry now!', 'Someone help me!', 'Fall back! Fall back!', 'Nngh!', 'Curse you!',
  'Get it off me!', 'I felt that in my soul!', 'Mother!', 'Oof!', 'Why\'d I sign up for this?', 'Bloody hero!', 'My good shield!'];
const DEATH = ['Tell... my mother...', 'Worth... every copper...', 'The bells... I hear them...', 'Not... like this...', 'At last... sleep...',
  'Velscour... forgive...', 'I should\'ve... deserted...', 'Ugh...', 'Avenge me, lads...', 'You\'ll... never... reach the castle...',
  'Finally... a day off...', 'Cold... so cold...', 'Was it... the boots?', 'Free...', 'Bury me... out of {place}...'];

// ---------------------------------------------------------------- the gray folk (peaceable, until crossed)
const GRAY_OPEN = ['', '', 'Hm.', 'Keep moving,', 'Not my business, but', 'Eyes down,', 'Quietly now,', 'Stranger,', 'Ahem.', 'Well,', 'Look,'];
const GRAY = ['I don\'t see you, you don\'t see me.', 'the watch passes here at every bell.', 'I\'ve a family to feed, hero.',
  'whatever you\'re doing, do it somewhere else.', 'the lords pay for names. I don\'t sell mine.', 'trust no one in {place}.',
  'I\'ve seen heroes come. Never seen one leave.', 'don\'t touch my cart.', 'the castle has ears in every wall.', 'buy something or move along.',
  'they took my son for the wall. I\'ll not lose another.', 'I keep my head down and my door shut.', 'the bells mean nothing now.',
  'a copper for a rumour? No? Suit yourself.', 'it\'s safer not to know.', 'I don\'t want trouble.', 'the Herald\'s men were here this morning.',
  'you\'ll bring the watch down on us all.', 'I used to sell flowers. Now I sell silence.', 'mind the gutters. Things live in them.',
  'everyone in {place} owes somebody.', 'the price of bread has doubled.', 'the dead don\'t pay rent, but they stay.'];

// ---------------------------------------------------------------- the good folk
const GOOD_OPEN = ['', '', 'Friend!', 'Stranger,', 'Light keep you.', 'Bless the bells,', 'Quick, before the watch comes:', 'Hero,', 'Ah,',
  'Thank the gods,', 'Shh, listen:', 'You\'re the one from Bellmourn?', 'Careful now.', 'Good to see a kind face.'];
const GOOD = ['the ward lords stand in the squares. Break them and the gate opens.', 'there\'s a hidden house in {place}, if you know the knock.',
  'the castle gate only opens when twelve lords fall.', 'stay off the King\'s Mile after dark.', 'the Slough bridges are rotten. Mind your step.',
  'the old bell-ringers still meet in secret.', 'take this blessing. It\'s all I have.', 'my neighbour went to the castle. Bring them back if you can.',
  'the watch changes at every bell. That\'s your chance.', 'we hid the children in the cellars.', 'the Herald fears the bells. Remember that.',
  'the good folk of {place} are with you.', 'they say Velscour was a man, once.', 'the Barbican winch-house lowers the drawbridge.',
  'the Mages\' Rise still has a friend or two.', 'go with the bells, hero.', 'we\'ll light a candle for you tonight.',
  'the Bone Yards are quiet by day. Mostly.', 'there\'s water at the wells, and it\'s clean.', 'don\'t trust the ones who smile in {place}.',
  'the castle has ten wings, a stair between each.', 'the Library, halfway up the castle, holds the old maps.', 'you look tired. Rest a moment.',
  'I mend boots, if you ever need it.', 'the occupiers gamble by the tannery. Easy pickings.', 'every lord you break, we breathe easier.'];
// two good folk talking to each other: [first, answer]
const CONVO = [
  ['Did you hear the bells last night?', 'Aye. First time in a year.'], ['Have you eaten?', 'A crust. You have the rest.'],
  ['The watch took the baker\'s boy.', 'Then we\'ll get him back.'], ['Is it true about the hero?', 'Saw them myself, by the Sill.'],
  ['The well in {place} is running again.', 'Thank the bells for small mercies.'], ['Keep your voice down.', 'I am! This is me whispering!'],
  ['How\'s your mother?', 'Stubborn as the castle walls.'], ['The lords are getting nervous.', 'Good. Let them sweat.'],
  ['Do you remember the market before?', 'Every colour you could name.'], ['I found a coin in the gutter.', 'Buy bread, not ale.'],
  ['They\'re hanging bells again in Bellmourn.', 'Then there\'s hope yet.'], ['My roof leaks.', 'Everyone\'s roof leaks.'],
  ['Saw a ward lord fall today.', 'Saw it? I cheered!'], ['The castle lights went out.', 'Or something put them out.'],
  ['Will it ever end?', 'Everything ends. Even him.'], ['Tea?', 'If you can call it that.'], ['The children are singing again.', 'Quietly, I hope.'],
  ['The Slough rose a foot.', 'The eels will be bold tonight.'], ['I heard the Herald shout.', 'He always shouts. That\'s his job.'],
  ['The dead in the Bone Yards walked.', 'Walked where?'], ['Pass the word: the hero\'s in {place}.', 'Already passed.'],
  ['My knees ache.', 'Rain\'s coming.'], ['I miss the smell of bread.', 'I miss the smell of anything but smoke.'],
  ['The gray folk are watching us.', 'They watch everyone. Wave.'], ['Have you seen the stars lately?', 'The castle smoke hides them.']];
const GREET_OPEN = ['', 'Oh!', 'Ah,', 'There you are,', 'Hero!', 'Friend,', 'Look who it is.', 'Psst,'];
const GREET = ['you\'re a sight for sore eyes.', 'the streets are talking about you.', 'mind the watch on the next corner.', 'need anything?',
  'I\'ve something you could do, if you have a moment.', 'stay safe out there.', 'the bells sent you, didn\'t they?', 'don\'t stop, they\'re watching.',
  'thank you for what you\'re doing.', 'is it true you came through the Chasm?', 'you look like you could use a meal.', 'go on, break those lords.'];
// errands the good folk set (game/phobostalk.js)
const QUEST_OFFER = ['The occupiers in {place} have my brother. Clear them out?', 'Thin out the riff-raff in {place} and I\'ll make it worth your while.',
  'They\'ve taken our street. Drive them from {place}, please.', 'Every one of them you drop in {place} is a night we sleep.',
  'Clear the watch from {place}, and I\'ll pay you from my savings.', 'They broke my shop. Break them back, in {place}.'];
const QUEST_ACTIVE = ['Still at it? They\'re thick in {place}.', 'Keep going. I can hear them fewer already.', 'Not yet, but you\'re close.'];
const QUEST_DONE = ['You did it! Here, take this. You\'ve earned it.', 'The street\'s ours again. Bless you.', 'I\'ll tell the whole ward.',
  'Thank the bells. Here, for your trouble.'];

const join = (o, l) => !o ? l.charAt(0).toUpperCase() + l.slice(1) : /[,:]$/.test(o) || /but$/.test(o) ? `${o} ${l}` : `${o} ${l.charAt(0).toUpperCase() + l.slice(1)}`;
export const TALK = {
  foeIdle: [FOE_OPEN, FOE_IDLE], foeReply: [[''], FOE_REPLY], taunt: [TAUNT_OPEN, TAUNT], hurt: [[''], HURT], death: [[''], DEATH],
  gray: [GRAY_OPEN, GRAY], good: [GOOD_OPEN, GOOD], greet: [GREET_OPEN, GREET],
  questOffer: [[''], QUEST_OFFER], questActive: [[''], QUEST_ACTIVE], questDone: [[''], QUEST_DONE],
};
export const CONVOS = CONVO;
const fill = (s, ctx) => { const t = s.replace(/\{place\}/g, (ctx.place || 'Phobos').replace(/^The /, 'the ')).replace(/\{lord\}/g, (ctx.lord || 'the ward lord').replace(/^The /, 'the ')); return t.charAt(0).toUpperCase() + t.slice(1); };
/** One line of a kind, for a speaker in a place. */
export function talkLine(kind, ctx = {}, rnd = Math.random) {
  const [O, L] = TALK[kind], pk = (a) => a[Math.floor(rnd() * a.length)];
  return fill(join(pk(O), pk(L)), ctx);
}
export function convoLines(ctx = {}, rnd = Math.random) { const [a, b] = CONVO[Math.floor(rnd() * CONVO.length)]; return [fill(a, ctx), fill(b, ctx)]; }
/** Every line of a kind (with the longest place and lord names), for the test. */
export function allLines(kind, ctx = {}) { const [O, L] = TALK[kind], out = new Set(); for (const o of O) for (const l of L) out.add(fill(join(o, l), ctx)); return [...out]; }
