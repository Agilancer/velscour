// Herrington Hollow's words: conversations, passing remarks, haggling at the shops, adventurers' talk and the lines
// of the special events. Every line is short enough for a two-line bubble.
// A line is [speaker, text, emotion?]: speaker 0/1/2 is the cast slot, emotion a key of EMOTIONS (townsfolkvisuals.js).
// Conversation tags pick who may hold them: any, kids, guard, old, couple, gossip, worker, royal.

export const CHATS = [
  // ---- gossip and neighbours
  { tags: ['any'], lines: [[0, 'Did the miller ever pay you back?', 'question'], [1, 'In flour. Damp flour.', 'sad'], [0, 'That man.', 'angry']] },
  { tags: ['any'], lines: [[0, 'The well water tastes of iron again.', 'think'], [1, 'Better iron than whatever was in it last spring.', 'scared']] },
  { tags: ['any'], lines: [[0, 'Another hero went through the portal.', 'point'], [1, 'How many came back this month?', 'question'], [0, 'Let\'s not count.', 'sad']] },
  { tags: ['any'], lines: [[0, 'My hens stopped laying.', 'sad'], [1, 'Mine too. They stare at the portal all night.', 'scared']] },
  { tags: ['any'], lines: [[0, 'Lovely morning!', 'happy'], [1, 'Is it? The sky\'s the colour of a bruise.', 'think'], [0, 'Lovely bruise, though.', 'laugh']] },
  { tags: ['any'], lines: [[0, 'I swear that crow follows me.', 'scared'], [1, 'It owes you money?', 'mischief'], [0, 'I owe IT money.', 'sad']] },
  { tags: ['any'], lines: [[0, 'Fortunato took my last silver.', 'angry'], [1, 'You gambled again?', 'surprised'], [0, 'He said the box was humming!', 'argue']] },
  { tags: ['any'], lines: [[0, 'Old Mother Wren sold me a "calming tonic".', 'think'], [1, 'And?', 'question'], [0, 'I can hear colours now.', 'surprised']] },
  { tags: ['any'], lines: [[0, 'Garrick sharpened my bread knife.', 'happy'], [1, 'You can\'t afford a bread knife.', 'question'], [0, 'I can\'t afford bread either.', 'laugh']] },
  { tags: ['any'], lines: [[0, 'Saw lights in the old ruins.', 'scared'], [1, 'Children with lanterns.', 'think'], [0, 'At three in the morning?', 'panic']] },
  { tags: ['any'], lines: [[0, 'The roof leaks right over my bed.', 'sad'], [1, 'Move the bed.', 'think'], [0, 'It follows the bed.', 'surprised']] },
  { tags: ['any'], lines: [[0, 'Bread\'s up a copper again.', 'angry'], [1, 'Blame the wolves on the mill road.', 'think'], [0, 'I blame the baker.', 'mischief']] },
  { tags: ['any'], lines: [[0, 'They say the dead walk at Depth Nine.', 'scared'], [1, 'The dead walk at Depth One.', 'think'], [0, 'Then why go deeper?', 'question'], [1, 'Better loot.', 'greedy']] },
  { tags: ['any'], lines: [[0, 'You look tired.', 'question'], [1, 'Someone sang under my window all night.', 'tired'], [0, 'Sorry. I was practising.', 'shy']] },
  { tags: ['any'], lines: [[0, 'Stevie lifted a cart by himself today.', 'surprised'], [1, 'With the horse still in it?', 'question'], [0, 'The horse looked impressed.', 'laugh']] },
  { tags: ['any'], lines: [[0, 'Smell that? Fresh bread!', 'hungry'], [1, 'That\'s the tannery.', 'sick'], [0, '...I\'m still hungry.', 'sad']] },
  { tags: ['any'], lines: [[0, 'Jamie the Curator has a new gem.', 'idea'], [1, 'Is it the one that whispers?', 'scared'], [0, 'They all whisper, dear.', 'think']] },
  { tags: ['any'], lines: [[0, 'Lily Belle enchanted my spoon.', 'happy'], [1, 'What does it do?', 'question'], [0, 'It refuses to touch soup.', 'sad']] },
  { tags: ['any'], lines: [[0, 'The portal hummed a tune last night.', 'music'], [1, 'Was it a nice tune?', 'question'], [0, 'It was a funeral march.', 'sad']] },
  { tags: ['any'], lines: [[0, 'Rain tomorrow, my knee says.', 'think'], [1, 'Your knee said that yesterday.', 'mischief'], [0, 'And was it wrong?', 'proud']] },
  { tags: ['any'], lines: [[0, 'Durgan\'s forge burned blue today.', 'surprised'], [1, 'He says that\'s good.', 'think'], [0, 'He also says that about burns.', 'scared']] },
  { tags: ['any'], lines: [[0, 'I\'m thinking of going down there.', 'proud'], [1, 'Into the dungeon? You?', 'surprised'], [0, 'Just to the first step.', 'shy'], [1, 'Bring a lantern.', 'think']] },
  { tags: ['any'], lines: [[0, 'Have you seen my goat?', 'panic'], [1, 'Brown, one horn, eats hats?', 'question'], [0, 'That\'s her!', 'happy'], [1, 'She ate my hat.', 'angry']] },
  { tags: ['any'], lines: [[0, 'Zafir says gems remember the light.', 'think'], [1, 'My mother remembers every slight.', 'sad'], [0, 'Different sort of stone.', 'laugh']] },
  { tags: ['gossip'], lines: [[0, 'Did you hear about the cooper\'s wife?', 'mischief'], [1, 'No! Tell me everything.', 'surprised'], [0, 'Not here. Later.', 'shy']] },
  { tags: ['gossip'], lines: [[0, 'The innkeeper waters his ale.', 'mischief'], [1, 'Everyone knows.', 'think'], [0, 'Now he waters the water.', 'laugh']] },
  { tags: ['gossip'], lines: [[0, 'Two suitors for the miller\'s girl!', 'love'], [1, 'Three. The third\'s a poet.', 'mischief'], [0, 'Poor girl.', 'laugh']] },
  { tags: ['gossip'], lines: [[0, 'Someone left flowers on the hero\'s doorstep.', 'love'], [1, 'Which hero?', 'question'], [0, 'The one who keeps coming back alive.', 'shy']] },
  { tags: ['gossip'], lines: [[0, 'I heard Fortunato is a duke in disguise.', 'mischief'], [1, 'I heard he\'s three goblins in a coat.', 'think'], [0, 'Why not both?', 'laugh']] },
  { tags: ['old'], lines: [[0, 'In my day the dungeon was one floor deep.', 'proud'], [1, 'And you walked it uphill both ways.', 'mischief'], [0, 'In the snow!', 'angry']] },
  { tags: ['old'], lines: [[0, 'My back aches.', 'tired'], [1, 'Rain coming.', 'think'], [0, 'Or the grave.', 'sad'], [1, 'Rain first, I hope.', 'laugh']] },
  { tags: ['old'], lines: [[0, 'I knew a lad who killed a demon with a spoon.', 'proud'], [1, 'Lily Belle\'s spoon?', 'question'], [0, 'Different spoon.', 'think']] },
  { tags: ['kids'], lines: [[0, 'Bet you won\'t touch the portal.', 'mischief'], [1, 'Bet I will!', 'proud'], [0, 'Go on then!', 'laugh'], [1, 'Tomorrow.', 'scared']] },
  { tags: ['kids'], lines: [[0, 'When I grow up I\'ll slay Velscour!', 'proud'], [1, 'You\'re scared of the dark.', 'mischief'], [0, 'I\'ll slay him in daytime.', 'angry']] },
  { tags: ['kids'], lines: [[0, 'Tag! You\'re it!', 'laugh'], [1, 'No fair, I wasn\'t ready!', 'argue']] },
  { tags: ['kids'], lines: [[0, 'I found a skeleton finger!', 'celebrate'], [1, 'Can I hold it?', 'question'], [0, 'It\'s holding ME.', 'panic']] },
  { tags: ['kids'], lines: [[0, 'The hero looked at me!', 'celebrate'], [1, 'The hero looked at a pig too.', 'mischief']] },
  { tags: ['guard'], lines: [[0, 'Quiet night on the wall.', 'think'], [1, 'Too quiet.', 'scared'], [0, 'You always say that.', 'impatient'], [1, 'And I\'m always right.', 'proud']] },
  { tags: ['guard'], lines: [[0, 'Saw tracks by the north fence.', 'point'], [1, 'Wolf?', 'question'], [0, 'Wolves don\'t wear boots.', 'scared']] },
  { tags: ['guard'], lines: [[0, 'Captain wants double watches.', 'impatient'], [1, 'With what men?', 'angry'], [0, 'You, and you again.', 'laugh']] },
  { tags: ['guard'], lines: [[0, 'Polish your armour, recruit.', 'proud'], [1, 'It\'s rust holding it together.', 'sad']] },
  { tags: ['couple'], lines: [[0, 'Walk with me to the orchard?', 'love'], [1, 'Only if you carry the basket.', 'mischief'], [0, 'I\'d carry the orchard.', 'love']] },
  { tags: ['couple'], lines: [[0, 'You forgot my name day.', 'angry'], [1, 'I did not! It\'s... soon.', 'scared'], [0, 'It was Tuesday.', 'argue']] },
  { tags: ['couple'], lines: [[0, 'I wrote you a poem.', 'shy'], [1, 'Read it!', 'love'], [0, 'Roses are red...', 'shy'], [1, 'Stop there. It\'s perfect.', 'laugh']] },
  { tags: ['worker'], lines: [[0, 'Need a hand with that beam?', 'question'], [1, 'Need two, and a back.', 'tired']] },
  { tags: ['worker'], lines: [[0, 'Order\'s due by sundown.', 'impatient'], [1, 'Sundown or the end of days?', 'mischief'], [0, 'Whichever comes first.', 'think']] },
  { tags: ['worker'], lines: [[0, 'Wagon wheel snapped again.', 'angry'], [1, 'Third one this week.', 'sad'], [0, 'The road eats them.', 'scared']] },
  { tags: ['royal'], lines: [[0, 'The town looks... rustic.', 'suspicious'], [1, 'Charmingly so, Your Grace.', 'gesture'], [0, 'Is that a pig?', 'surprised']] },
  { tags: ['royal'], lines: [[0, 'Note it: the people love us.', 'proud'], [1, 'One man threw a turnip.', 'thinking'], [0, 'Lovingly.', 'think']] },
  { tags: ['royal'], lines: [[0, 'In my day queens carried swords.', 'proud'], [1, 'You still carry one, Grandmother.', 'worried'], [0, 'And I still use it.', 'mischief']] },
  // ---- the traders
  { tags: ['merchant'], lines: [[0, 'How\'s trade on the north road?', 'question'], [1, 'Wolves bought nothing.', 'sad'], [0, 'Tight-fisted, wolves.', 'laugh']] },
  { tags: ['merchant'], lines: [[0, 'These glass beads are real crystal.', 'proud'], [1, 'They\'re river pebbles, Ilse.', 'suspicious'], [0, 'Shiny river pebbles.', 'mischief']] },
  { tags: ['merchant'], lines: [[0, 'I\'ll trade you three furs for that book.', 'haggle'], [1, 'It\'s a book of fur recipes.', 'think'], [0, 'Four furs.', 'excited']] },
  { tags: ['merchant'], lines: [[0, 'Smell my new saffron!', 'excited'], [1, 'Smell my new eels!', 'excited'], [0, 'Let\'s not, actually.', 'sick']] },
  { tags: ['merchant'], lines: [[0, 'A hero bought a pot today.', 'happy'], [1, 'What for?', 'question'], [0, 'To wear. As a helmet.', 'laugh']] },
  // ---- the knights and the watch
  { tags: ['knight'], lines: [[0, 'Your mantle is filthy.', 'suspicious'], [1, 'It\'s ash. From a lich.', 'proud'], [0, '...Respect.', 'surprised']] },
  { tags: ['knight'], lines: [[0, 'The Frostbound swears the deep floors are colder.', 'think'], [1, 'Everything\'s colder to him.', 'laugh']] },
  { tags: ['knight'], lines: [[0, 'Will the King knight another this year?', 'curious'], [1, 'If anyone survives the road.', 'worried']] },
  // ---- the Greeners
  { tags: ['kids'], lines: [[0, 'Let\'s put a frog in the friar\'s hood.', 'mischief'], [1, 'We did that Tuesday.', 'thinking'], [0, 'A BIGGER frog.', 'excited']] },
  { tags: ['kids'], lines: [[0, 'Do my spooky face!', 'excited'], [1, 'RAAAH!', 'spooky'], [0, 'Perfect. Terrifying.', 'proud']] },
  { tags: ['kids'], lines: [[0, 'Nan Bramble says goblins grow from mushrooms.', 'curious'], [1, 'We grew from Nan Bramble.', 'confused'], [0, '...Same thing?', 'question']] },
  // ---- folk and their animals
  { tags: ['any'], lines: [[0, 'That black cat crossed my path.', 'worried'], [1, 'Soot? Soot crosses everyone\'s path.', 'laugh'], [0, 'Twice!', 'scared']] },
  { tags: ['any'], lines: [[0, 'There were deer at the treeline at dawn.', 'love'], [1, 'Better deer than ghouls.', 'think']] },
  { tags: ['old'], lines: [[0, 'The rats are bold this year.', 'suspicious'], [1, 'The cats are lazy this year.', 'sleepy'], [0, 'Like us.', 'laugh']] },
];

// One-liners when the hero walks past (by role group; `any` for everyone)
export const BARKS = {
  any: [
    ['Back again? The portal likes you.', 'happy'], ['Mind the puddles, friend.', 'point'], ['Fine weather for dying. I mean, drying.', 'shy'],
    ['Bring us something shiny!', 'greedy'], ['You smell of crypts.', 'sick'], ['Good luck down there.', 'pray'],
    ['My cousin went in once. Once.', 'sad'], ['Is it true there\'s a dragon?', 'question'], ['Thank you for keeping us safe.', 'bow'],
    ['Wipe your boots before the inn.', 'impatient'], ['Heroes eat free at the inn! ...Not really.', 'mischief'], ['Light keep you.', 'pray'],
  ],
  kids: [['Are you a REAL hero?', 'excited'], ['Can I hold your sword?', 'question'], ['Teach me a spell!', 'wave'], ['Bet I could beat you!', 'mischief'], ['BOO! ...Did I scare you?', 'spooky'], ['Got any frogs?', 'curious']],
  old: [['In my day heroes wore proper boots.', 'proud'], ['Mind your back, it goes first.', 'tired'], ['I remember when the portal was a well.', 'think']],
  guard: [['Keep your weapon sheathed in town.', 'proud'], ['Report anything strange.', 'point'], ['All quiet. For now.', 'think']],
  royal: [['Kneel? No? Very well.', 'proud'], ['You may admire us.', 'happy'], ['The crown thanks you.', 'gesture'], ['Do mind the mud, hero.', 'suspicious']],
  merchant: [['Fine goods for a fine hero!', 'haggle'], ['Anything catch your eye?', 'happy'], ['Special price, just for you.', 'mischief'], ['Bring back something rare, I\'ll buy it!', 'greedy']],
  knight: [['Steel and faith, adventurer.', 'proud'], ['The Order salutes you.', 'proud'], ['We hold the town. You hold the depths.', 'point'], ['Spar later?', 'mischief']],
};

// A shopper at a vendor: [customer, vendor, customer] lines with emotions (the vendor speaks as slot 1)
export const SHOPPING = {
  weapons: [
    [['How much for the axe?', 'haggle'], ['More than you have.', 'proud'], ['I\'ll come back.', 'sad']],
    [['Can you make it sharper?', 'question'], ['It cuts the wind already.', 'proud'], ['Then I\'ll take two!', 'celebrate']],
    [['I need a sword for my son.', 'think'], ['Wooden, then. For now.', 'laugh'], ['He\'ll be thrilled.', 'happy']],
  ],
  armor: [
    [['Will this stop a ghoul?', 'question'], ['It\'ll make it think twice.', 'proud'], ['Ghouls think?', 'scared']],
    [['Does it come in blue?', 'question'], ['It comes in bloodstains.', 'mischief'], ['...I\'ll take it.', 'shy']],
    [['My helmet\'s dented.', 'sad'], ['So was its last owner.', 'think'], ['Not encouraging, Stevie.', 'angry']],
  ],
  upgrade: [
    [['Can you mend my plough?', 'question'], ['I mend swords, not ploughs.', 'impatient'], ['Pretend it\'s a sword.', 'mischief']],
    [['Is it supposed to glow?', 'surprised'], ['Only for a week.', 'think'], ['And after?', 'scared']],
  ],
  enchant: [
    [['Can you make my cat love me?', 'love'], ['No magic is that strong.', 'think'], ['Worth asking.', 'sad']],
    [['What does this rune do?', 'question'], ['It hums when you lie.', 'mischief'], ['It\'s humming now.', 'scared']],
  ],
  alchemist: [
    [['Something for a cough?', 'sick'], ['Red, then purple, never orange.', 'think'], ['What does orange do?', 'question']],
    [['Do you have love potions?', 'shy'], ['I have honesty potions. Worse.', 'mischief'], ['Never mind!', 'panic']],
    [['My tonic made me float.', 'surprised'], ['That\'s the good batch!', 'celebrate'], ['I was in the river!', 'angry']],
  ],
  gems: [
    [['Is this ruby real?', 'question'], ['Everything is real, friend.', 'think'], ['That\'s not a yes.', 'impatient']],
    [['Three of these make one better?', 'question'], ['Three of anything make one better.', 'proud'], ['Even husbands?', 'mischief']],
  ],
  socket: [
    [['Can you put a hole in my shield?', 'question'], ['Carefully, yes.', 'think'], ['Please be careful.', 'scared']],
    [['What\'s this gem do?', 'question'], ['Sit in a socket and shine.', 'proud'], ['Like my uncle.', 'laugh']],
  ],
  gamble: [
    [['One box, please!', 'greedy'], ['Ooh, a lucky one!', 'celebrate'], ['It\'s... a sock.', 'sad']],
    [['Is this game fair?', 'question'], ['As fair as fate!', 'gesture'], ['So no.', 'angry']],
    [['I feel lucky today.', 'greedy'], ['Fortune adores you!', 'cheer'], ['Then why am I poorer?', 'argue']],
  ],
};

// Adventurers at their camp or passing through (class-agnostic; speaker 0 and 1)
export const ADVENTURER_CHATS = [
  { lines: [[0, 'Depth twelve took my left boot.', 'sad'], [1, 'Just the boot?', 'question'], [0, 'And the foot in it.', 'laugh']] },
  { lines: [[0, 'Saw a chest with teeth.', 'scared'], [1, 'You opened it anyway.', 'think'], [0, 'It had gold teeth!', 'greedy']] },
  { lines: [[0, 'Who\'s buying the round?', 'question'], [1, 'Whoever dies last.', 'mischief'], [0, 'So nobody.', 'laugh']] },
  { lines: [[0, 'That guardian nearly had me.', 'tired'], [1, 'You ran screaming.', 'mischief'], [0, 'Tactically screaming.', 'proud']] },
  { lines: [[0, 'Heard a new hero\'s in town.', 'point'], [1, 'Looks tough.', 'think'], [0, 'Looks lucky.', 'mischief']] },
  { lines: [[0, 'Map says go left.', 'read'], [1, 'Map\'s upside down.', 'impatient'], [0, 'Then go right!', 'idea']] },
  { lines: [[0, 'I\'m retiring after this run.', 'proud'], [1, 'You said that forty runs ago.', 'laugh']] },
  { lines: [[0, 'Velscour waits at the bottom.', 'scared'], [1, 'Let him wait.', 'proud'], [0, 'I\'ll bring a chair.', 'laugh']] },
];
export const ADVENTURER_BARKS = [
  ['Seen anything worth killing?', 'question'], ['The deep floors pay better.', 'greedy'], ['Watch the bone traps on six.', 'point'],
  ['Race you to the next depth!', 'mischief'], ['Share a fire, friend?', 'wave'], ['I hear the boss rooms reset.', 'think'],
];

// Lines spoken by event casts (src/game/townlife.js EVENTS): beats [castRole, text, emotion]; {role} names that cast member
export const EVENT_LINES = {
  wedding: {
    title: 'A Wedding at the Well', intro: 'Gather close! {groom} and {bride} are to be wed!',
    vows: [['priest', 'Do you take each other, come plague or portal?', 'gesture'], ['groom', 'I do!', 'love'], ['bride', 'I do. Obviously.', 'love'],
      ['priest', 'Then kiss, before the bread goes stale!', 'celebrate']],
    crowd: [['Kiss!', 'cheer'], ['Long life to you both!', 'cheer'], ['I\'m not crying!', 'cry'], ['Save me some cake!', 'hungry'], ['Huzzah!', 'celebrate']],
  },
  royal: {
    title: 'The Royal Progress', intro: 'Make way! Make way for the King!',
    beats: [['herald', 'His Majesty, King Edric of the Hollow!', 'gesture'], ['king', 'Good people! We are... here.', 'proud'],
      ['queen', 'How quaint. Is that mud?', 'suspicious'], ['dowager', 'It\'s a town, Elowen. Towns have mud.', 'proud'],
      ['king', 'Taxes are lowered! Slightly!', 'cheer'], ['heir', 'Is that a REAL hero?!', 'excited'], ['princess', 'Can we see the portal?', 'question'],
      ['king', 'Absolutely not.', 'angry'], ['prince', 'I could take it. Probably.', 'proud']],
    crowd: [['Long live the King!', 'cheer'], ['Lower them more!', 'argue'], ['The princess waved at me!', 'love'], ['God save the Queen!', 'bow'], ['Is that the Dowager? Run!', 'scared']],
  },
  funeral: {
    title: 'A Funeral at the Well', intro: 'Hush now. We lay {dead} to rest.',
    beats: [['priest', 'They went into the dark so we would not.', 'pray'], ['mourner', 'They owed me two coppers.', 'cry'],
      ['friar', 'Debts forgiven, friend. Light keep them.', 'pray'], ['mourner', 'Light keep them.', 'grief']],
    crowd: [['Light keep them.', 'pray'], ['So kind to my children.', 'cry'], ['Too soon.', 'grief']],
  },
  fair: {
    title: 'Harvest Fair', intro: 'The Harvest Fair is open! Come and see!',
    calls: [['Fresh pies! Only slightly haunted!', 'haggle'], ['Apples! Sweet as sin!', 'greedy'], ['Honey cakes!', 'haggle']],
    juggler: ['Five apples! FIVE!', 'Look, no hands! Ow.', 'Throw me a pumpkin!'],
    crowd: [['I\'ll take three pies!', 'greedy'], ['Look at that marrow!', 'surprised'], ['Dance with me!', 'dance'], ['Best fair in years!', 'happy']],
  },
  brawl: {
    title: 'A Market Brawl', intro: 'Fight! Fight by the stalls!',
    beats: [['a', 'You sold me moth-eaten wool!', 'argue'], ['b', 'It was fine fur when it left me, {a}!', 'argue'], ['a', 'Say that again!', 'angry'],
      ['guard', 'Break it up, the pair of you!', 'alarm'], ['b', 'They started it!', 'point'], ['guard', 'And I\'m finishing it. Home!', 'angry'],
      ['a', 'Sorry, {b}.', 'embarrassed'], ['b', 'Sorry. Cider later?', 'happy']],
    crowd: [['Hit them!', 'cheer'], ['Not the stall!', 'panic'], ['My money\'s on the fur!', 'greedy']],
  },
  tourney: {
    title: 'Knights\' Sparring Match', intro: 'To first touch! {k1} against {k2}!',
    beats: [['k1', 'Ready yourself!', 'proud'], ['k2', 'Always ready.', 'proud'], ['k1', 'Hah! First touch to me!', 'cheer'],
      ['k2', 'A lucky blow.', 'angry'], ['k2', 'Match to me, I think.', 'proud'], ['k1', 'Well fought. Ale?', 'happy']],
    crowd: [['Go on, {k1}!', 'cheer'], ['{k2}! {k2}!', 'cheer'], ['Ooh, that had to hurt!', 'surprised'], ['Again!', 'celebrate']],
  },
  alarm: {
    title: 'Monster Sighting!', intro: 'Something in the trees! Everyone inside!',
    beats: [['watch', 'Beast at the treeline! Bar the doors!', 'alarm'], ['knight', 'With me! Shields up!', 'fight'],
      ['knight', '...It\'s a stag. It\'s just a stag.', 'confused'], ['watch', 'All clear! Come out, it\'s a deer!', 'relieved']],
    crowd: [['Run!', 'panic'], ['My children!', 'panic'], ['Not again!', 'scared'], ['Is it gone?', 'question'], ['A DEER?', 'laugh']],
  },
  birth: {
    title: 'A New Arrival', intro: 'It\'s a baby! A healthy baby!',
    beats: [['midwife', 'A strong little one, loud as a bell!', 'celebrate'], ['parent', 'I\'m a parent! Me!', 'cry'],
      ['midwife', 'Go on, tell everyone.', 'happy'], ['parent', 'EVERYONE! A BABY!', 'cheer']],
    crowd: [['Bless the child!', 'celebrate'], ['What\'s the name?', 'question'], ['Another mouth at the inn!', 'laugh'], ['Wonderful!', 'happy']],
  },
  party: {
    title: 'The Greeners\' Name Day', intro: 'It\'s our name day! All three of us!',
    beats: [['child2', 'We\'re seven! SEVEN!', 'cheer'], ['child3', 'I\'m seven and a bit. I was first.', 'proud'],
      ['host', 'Seven years of frogs in my boots.', 'laugh'], ['child', 'Can we have swords?', 'question'], ['host', 'You can have cake.', 'happy']],
    crowd: [['Happy name day, Greeners!', 'cheer'], ['Seven! So old!', 'laugh'], ['Is there cake?', 'hungry'], ['Count your fingers after.', 'suspicious']],
  },
  caravan: {
    title: 'A Caravan Arrives', intro: 'Traders from the far roads! Come see!',
    calls: [['Silks! Spices! Bottled thunder!', 'haggle'], ['Exotic goods for brave folk!', 'gesture']],
    beats: [['trader', 'Exotic goods for brave folk!', 'gesture'], ['buyer', 'What does bottled thunder do?', 'question'], ['trader', 'Opens loudly.', 'mischief']],
    crowd: [['Look at the cloth!', 'surprised'], ['I\'ll trade my goat for it!', 'greedy'], ['Real pepper!', 'happy'], ['Glass that\'s clear!', 'curious']],
  },
  wounded: {
    title: 'A Hero Returns, Barely', intro: 'Someone came out of the portal! Fetch Nan Bramble!',
    beats: [['hurt', 'Depth... thirty... so many teeth...', 'hurt'], ['healer', 'Lie still. Breathe. Drink this.', 'think'],
      ['healer', 'Hot water! Clean cloth! A frog!', 'alarm'], ['hurt', 'Why... a frog?', 'question'], ['healer', 'Moral support.', 'happy']],
    crowd: [['Are they dead?', 'scared'], ['Poor soul.', 'sad'], ['Give them room!', 'point'], ['The portal took their boots!', 'surprised']],
  },
  lost_child: {
    title: 'The Heir Is Missing!', intro: 'Pip! Has anyone seen my Pip?',
    beats: [['parent', 'Pip! PIP! Where are you?', 'worried'], ['watch', 'Search the lanes! Every barrel!', 'point'],
      ['child', 'Mother! I found a cat! Can we keep it?', 'excited'], ['parent', 'Oh thank the Light!', 'relieved'], ['parent', 'You\'re confined to the tower. Forever.', 'angry']],
    crowd: [['Found! The heir\'s found!', 'cheer'], ['Thank goodness!', 'happy'], ['Check the well!', 'scared']],
  },
  witch_trial: {
    title: 'A Witch on Trial', intro: 'Bring out the witch!',
    beats: [['acc', 'My milk curdled, Bramble! Every pail!', 'angry'], ['acc2', 'And my sheep walk backwards!', 'angry'],
      ['witch', 'Your sheep were always odd, {acc2}.', 'suspicious'], ['priest', 'Enough! Where is your proof?', 'angry'],
      ['acc', 'She has a cat! And a hat!', 'point'], ['witch', 'Everybody has a hat.', 'confused'],
      ['imp', 'Hee hee! It was us! Frogs in the churn!', 'mischief'], ['witch', 'Greeners. Of course it was.', 'relieved'],
      ['acc', '...Sorry, Nan Bramble.', 'embarrassed'], ['witch', 'Come by for tea. No frogs.', 'happy']],
    crowd: [['Burn her! ...Wait, what?', 'confused'], ['Those goblins!', 'angry'], ['I knew it wasn\'t her!', 'proud'], ['Poor old Nan.', 'sad']],
  },
  knighting: {
    title: 'A Knighting at the Well', intro: 'Kneel, {squire}.',
    beats: [['herald', 'By the King\'s grace, a new knight of the Hollow!', 'gesture'], ['squire', 'Majesty.', 'bow'],
      ['king', 'For holding the road when the dead walked it...', 'think'], ['king', 'Rise, {squire}, Knight of the Hollow!', 'proud'],
      ['squire', 'I... I won\'t fail you!', 'excited'], ['k1', 'Welcome to the order. You\'ll hate the armour.', 'happy']],
    crowd: [['Huzzah for {squire}!', 'cheer'], ['They earned it!', 'proud'], ['Long live the King!', 'cheer'], ['Look how shiny!', 'excited']],
  },
  wizard_show: {
    title: 'The Purple Wizard\'s Show', intro: 'Gather round! Zebulon the Purple performs!',
    beats: [['wiz', 'Behold! Sparks of the far stars!', 'proud', 'sparks'], ['kid', 'Ooooh!', 'excited'],
      ['wiz', 'And now... from my hat... a RABBIT!', 'cheer', 'rabbit'], ['crowd', 'It\'s a real rabbit!', 'surprised'],
      ['wiz', 'For my last trick: a dragon!', 'proud', 'flop'], ['wiz', '...A very small, invisible dragon.', 'embarrassed']],
    crowd: [['Do the rabbit again!', 'cheer'], ['Where did it go?', 'confused'], ['Bravo!', 'cheer'], ['My hat is gone too!', 'surprised']],
  },
  dog_chase: {
    title: 'A Dog Loose in the Market', intro: 'Drop my sausages, you mutt!',
    beats: [['baker', 'Come back here, you thief!', 'angry'], ['kid', 'Go, doggy, go!', 'cheer'], ['baker', 'Somebody stop that dog!', 'alarm'], ['kid', 'It\'s faster than you!', 'laugh']],
    outro: 'Oh, fine. Keep them. Good dog.',
    crowd: [['Ha! Look at it go!', 'laugh'], ['There goes supper!', 'surprised'], ['Good dog!', 'happy']],
  },
  tax_day: {
    title: 'Tax Day', intro: 'Hear ye! By order of the Duke: a new tax!',
    beats: [['duke', 'A copper for every window!', 'proud'], ['crowd', 'We\'ll board them up!', 'angry'],
      ['duke', 'And a copper for every board!', 'proud'], ['crowd', 'Shame! SHAME!', 'angry'],
      ['dowager', 'Halric. A word.', 'suspicious'], ['duke', 'Your Majesty! I was only...', 'scared'],
      ['dowager', 'Repeal it. Now. Before I repeal you.', 'angry'], ['duke', 'The tax is... repealed. Long live the Dowager.', 'embarrassed']],
    crowd: [['Long live the Dowager!', 'cheer'], ['Ha! Look at his face!', 'laugh'], ['She\'s terrifying. I love her.', 'love']],
  },
  ghost_prank: {
    title: 'The Greeners\' Ghost Prank', intro: 'Has anyone seen the Greeners?',
    boos: ['BOOOO!', 'I\'m a GHOST! Woo!', 'RAAAH! The dead walk!'],
    beats: [['knight', 'You three! Again?!', 'angry'], ['imp', 'It\'s a ghost-hunting drill!', 'mischief'], ['knight', 'Home. Now. All of you.', 'angry'], ['imp2', 'Worth it.', 'proud']],
    crowd: [['Those wretched goblins!', 'angry'], ['I nearly died!', 'scared'], ['Ha! Got you good!', 'laugh'], ['My heart!', 'surprised']],
  },
  deer_visit: {
    title: 'Deer in the Square', intro: 'Shh! Look! Deer!',
    beats: [['kid', 'Can I pet one?', 'excited'], ['crowd', 'Don\'t move. Don\'t breathe.', 'love'], ['kid', 'It\'s looking at me!', 'excited']],
    crowd: [['Oh, they\'re gone.', 'sad'], ['Stupid dog!', 'angry'], ['Beautiful.', 'love']],
  },
};
