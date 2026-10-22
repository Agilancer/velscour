// Homunculus the Proud, the Hollow's blacksmith (src/game/homunculus.js). He thinks he is a Paladin; his "holy"
// powers come from Varrow the Rimebound, a death knight sealed in the great axe on his wall. With auto-play on, the
// hero stops for a 3-10 second chat before every visit to the forge.
//
// Everyday talk is a small grammar: a topic is three bubbles, [speaker, template]; speakers are h (Homunculus),
// p (the hero) and a (the axe). `{pool}` picks from a pool below; `{gear}`, `{folk}`, `{cls}` and `{name}` come from
// the game. A pool entry is a string or [text, pose, minChapter]: the pose is one of his 30 (POSES) and the entry only
// comes up once the axe story has reached minChapter, so his boasts grow stranger as it unfolds.
// The axe story (STORY) unfolds over visits, every chapter told in three different ways (and retold later as recaps).

// his 30 painted poses (assets/sprites/npc/homunculus.webp) and the town emotion each one moves like
export const POSES = {
  relieved: 'happy', curious: 'curious', embarrassed: 'embarrassed', suspicious: 'suspicious', exhausted: 'tired',
  frustrated: 'argue', determined: 'proud', surprised: 'surprised', thoughtful: 'think', sleepy: 'sleepy',
  nervous: 'worried', concentrating: 'thinking', disappointed: 'sad', shy: 'shy', confident: 'proud',
  worried: 'worried', grateful: 'happy', winking: 'mischief', impatient: 'impatient', apologetic: 'gesture',
  defiant: 'proud', mournful: 'sad', confused: 'confused', skeptical: 'suspicious', overjoyed: 'cheer',
  annoyed: 'angry', nostalgic: 'think', alarmed: 'alarm', focused: 'thinking', humble: 'bow',
};
export const IDLE_POSES = ['confident', 'confident', 'relieved', 'determined', 'focused', 'thoughtful', 'curious', 'defiant', 'winking', 'sleepy', 'exhausted'];

export const POOLS = {
  hail: [
    ['Hero!', 'overjoyed'], ['Ha! There you are!', 'overjoyed'], ['Friend!', 'confident'], ['Oh good, you\'re alive!', 'relieved'],
    ['My favourite customer!', 'winking'], ['Psst. Hero.', 'suspicious'], ['By the Light, it\'s you!', 'overjoyed'],
    ['Welcome back to the forge!', 'confident'], ['Hero! Quickly!', 'alarmed'], ['You again! Wonderful!', 'overjoyed'],
    ['Look who crawled back up!', 'winking'], ['Hello, hello, hello!', 'overjoyed'], ['Ah! Just the hero I wanted!', 'confident'],
    ['There\'s my champion!', 'grateful'],
  ],
  feat: [
    ['I smote a rat with the Light this morning.', 'confident'], ['I prayed so hard my eyebrows came back.', 'overjoyed'],
    ['I blessed the well. Now it hums.', 'confident'], ['I laid hands on a sick goat. It laid hooves on me.', 'embarrassed'],
    ['My hammer glowed during morning prayers!', 'overjoyed'], ['I said "Light, guide me" and found a coin!', 'overjoyed'],
    ['I parried a wasp. With FAITH.', 'determined'], ['I meditated an hour. Forty minutes. Naps count.', 'sleepy'],
    ['I can bless boots now. Only left boots, so far.', 'thoughtful'], ['I fasted a whole day! Until lunch.', 'grateful'],
    ['I read a whole page of the Paladin Codex. Twice!', 'confident'], ['The Light told me to buy a bigger hammer. I obeyed.', 'determined'],
    ['I smote a weed. It never grew back. Ever.', 'confident', 2], ['I healed a crow. It follows me and never blinks.', 'nervous', 3],
    ['My candle burned green at prayer. Holy, right?', 'curious', 2], ['I touched a dead tree and it stood up straighter.', 'overjoyed', 3],
    ['I blessed a cheese. It aged three hundred years.', 'surprised', 4], ['My shadow saluted me this morning. So polite.', 'winking', 4],
    ['I glowed a bit in the bath. Mostly green.', 'embarrassed', 2], ['I tried to heal a cut. It frosted over. Neat!', 'curious', 5],
    ['I knelt at dawn and the grass froze in a circle.', 'focused', 5], ['Wren says my aura smells of graves. Jealous.', 'annoyed', 3],
    ['I sang a hymn and every dog in town howled along.', 'overjoyed', 3], ['I shook hands with a skeleton in a dream. Firm grip.', 'thoughtful', 4],
    ['I lifted the anvil with one hand! And most of my back.', 'exhausted'], ['I kept the forge lit by prayer alone. And coal.', 'confident'],
    ['I was struck by inspiration. Then by my own hammer.', 'embarrassed'], ['I blessed my apron. It\'s holy leather now.', 'confident'],
    ['I practised my holy stance in the mirror all night.', 'determined'], ['I swore to protect the weak. Then ate their pie.', 'apologetic'],
    ['I forged a holy symbol. It came out a bit skull-ish.', 'confused', 1], ['I lit a candle for every hero below. You\'re on it.', 'humble'],
    ['I outshone the sun! Briefly. It was cloudy.', 'overjoyed'], ['I tried smiting from range. I need to work on range.', 'disappointed'],
    ['I purified a bucket of water. Holy bucket now.', 'confident'], ['Children follow me in the street! For the sweets.', 'winking'],
    ['I shone so bright the bats left the barn. Forever.', 'determined', 2], ['I tamed a stray cat with one holy glance.', 'winking'],
    ['I asked the Light a question. It said "hmm". Promising!', 'thoughtful', 1], ['I hammered so righteously the sparks made a halo.', 'overjoyed'],
  ],
  doubt: [
    'That\'s... impressive?', 'Are you sure that was holy?', 'Uh-huh.', 'I believe you. Mostly.', 'Did anyone see it?',
    'Homunculus, you\'re a blacksmith.', 'Paladins don\'t usually do that.', 'Truly a man of the Light.', 'Huh. Good for you!',
    ['That doesn\'t sound like the Light.', null, 3], ['Was it... green again?', null, 2], ['Please stop touching dead things.', null, 3],
    ['You smell like frost. Again.', null, 5], 'As a {cls}, I have questions.',
  ],
  proof: [
    ['Ask anyone! Except the goat.', 'winking'], ['Nobody saw. That\'s how you know it\'s holy.', 'confident'],
    ['The Light doesn\'t do witnesses. Very private.', 'thoughtful'], ['I\'d show you, but it only works when nobody looks.', 'shy'],
    ['Mark my words: Paladin by spring!', 'determined'], ['Next time I\'ll fetch you. You\'ll weep.', 'overjoyed'],
    ['Mother always said I was special. Nicely.', 'nostalgic'], ['Faith, friend. Faith and forearms.', 'confident'],
    ['You doubt me? I forgive you. That\'s holy too.', 'humble'], ['I\'m writing it all down. For the Codex.', 'concentrating'],
    ['Some are born paladins. I was born near one.', 'winking'], ['The Light works in mysterious ways. Mostly me.', 'confident'],
    ['I\'d swear on my axe, but she gets jealous.', 'nervous', 1], ['Ser— I mean, the Light— says I\'m doing great.', 'embarrassed', 6],
    ['Don\'t mind the cold. That\'s holiness settling.', 'relieved', 5], ['They\'ll paint me on a church one day. Small church.', 'humble'],
    ['Ha! Your face! Priceless.', 'overjoyed'], ['I\'m practising humility too. I\'m the best at it.', 'confident'],
    ['Alright, maybe it was a little bit luck.', 'apologetic'], ['Stay humble, hero. Like me. Homunculus the Proud.', 'winking'],
    ['And that\'s why they call me the Proud!', 'overjoyed'], ['Paladins don\'t brag. I\'m merely reporting.', 'defiant'],
    ['Believe what you like! The goat knows.', 'defiant'], ['I\'ll smite you a souvenir next time.', 'winking'],
    ['Holy work is hungry work. Have you eaten?', 'grateful'], ['Train with me sometime! Dawn. Bring snacks.', 'confident'],
    ['I sense doubt. Also beans. Who had beans?', 'suspicious'], ['The axe hummed when I told her. She agrees!', 'overjoyed', 1],
    ['Faith moves mountains. I\'m starting with anvils.', 'determined'], ['Now, let\'s see that gear of yours.', 'focused'],
  ],
  training: [
    ['Learning to ride into battle. The horse is learning to run.', 'determined'], ['I practised my battle cry. LIIIGHT! Too much?', 'overjoyed'],
    ['I polished my "Smite Evil" face. Look! Scary, right?', 'annoyed'], ['Paladins kneel a lot. My knees never agreed to this.', 'exhausted'],
    ['I tried on paladin plate. I\'m a plate and a half.', 'embarrassed'], ['Lesson today: lay on hands. Not on the forge.', 'apologetic'],
    ['I wrote my own oath! Nine pages. Mostly snacks.', 'confident'], ['I\'m learning to glow on command. Hnnngh. Anything?', 'concentrating'],
    ['I\'m growing a righteous beard. Head first. No luck.', 'disappointed'], ['I sparred with the scarecrow. Lost on points.', 'mournful'],
    ['I asked the priest for paladin lessons. He laughed. Kindly.', 'shy'], ['I practised shield bashing on the door. Need a new door.', 'apologetic'],
    ['Paladins need a noble steed. I have a noble donkey.', 'confident'], ['I learned the Aura of Devotion. Devotes mostly to me.', 'winking'],
    ['Paladins never lie. So I told the baker the truth.', 'nervous'], ['Fasting, praying and lifting. Mostly lifting.', 'determined'],
    ['My holy symbol is a horseshoe. Very lucky so far.', 'confident'], ['I do a heroic pose at dawn. The roosters feel threatened.', 'defiant'],
    ['Paladins have mottos. Mine: "Hot iron, warm heart!"', 'overjoyed'], ['I tried to charge into battle. Charged into a fence.', 'embarrassed'],
    ['I\'m working on a holy hammer throw. Sorry about the roof.', 'apologetic'], ['Paladins wash their feet? Nobody told me!', 'alarmed'],
    ['I asked the axe for advice. Very quiet. Wise axe.', 'thoughtful', 1], ['I train at night now. The Light is louder then.', 'focused', 4],
    ['I can see in the dark now! The Light provides. Greenly.', 'overjoyed', 3], ['I don\'t need sleep anymore! Holy energy!', 'determined', 5],
    ['I fought my reflection. It fought colder.', 'suspicious', 5], ['I\'m learning to pray in the old tongue. The axe teaches.', 'concentrating', 6],
    ['I asked for the strength of ten men. Got eight. Good start.', 'grateful'], ['My war cry soured the milk. Powerful stuff.', 'confident', 2],
  ],
  trainReply: [
    'Keep at it!', 'How is the donkey?', 'You\'ll get there. Somewhere.', 'Maybe start smaller?', 'I\'m rooting for you.',
    'Please never charge anything again.', 'That\'s... dedication.', 'Can I watch next time?', ['Are you sleeping at all?', null, 5],
    ['The axe teaches you? Hm.', null, 6], 'You\'re the most paladin smith I know.',
  ],
  trainClose: [
    ['Thank you! You\'re a true friend.', 'grateful'], ['Tomorrow: smiting. Or lunch.', 'thoughtful'], ['One day, hero. One day!', 'determined'],
    ['The donkey sends his regards.', 'winking'], ['Faith is a muscle. So is everything else.', 'confident'],
    ['I\'ll be the first smith-paladin in history!', 'overjoyed'], ['Now! Your gear. Paladin business can wait.', 'focused'],
    ['Watch this space. Well, that space. By the anvil.', 'confident'], ['Don\'t tell the priest. It\'s a surprise.', 'shy'],
    ['Saint Varrow says I\'m ready. Saints know.', 'confident', 6], ['Shh. Don\'t tell the axe I said that.', 'nervous', 4],
  ],
  gearLook: [
    ['Let me see that {gear}.', 'focused'], ['Ooh, is that a new {gear}?', 'curious'], ['That {gear} of yours...', 'skeptical'],
    ['Hold still, I\'m looking at your {gear}.', 'concentrating'], ['Hm. Your {gear}.', 'skeptical'], ['Is that blood on your {gear}?', 'alarmed'],
    ['Who made that {gear}? Not me. I can tell.', 'suspicious'], ['Your {gear} is talking to me.', 'thoughtful'],
    ['Ah, your trusty {gear}!', 'overjoyed'], ['I dreamt about your {gear}. Long story.', 'nostalgic'], ['That {gear} has seen things.', 'mournful'],
    ['Hand me that {gear}. Gently.', 'focused'],
  ],
  gearVerdict: [
    'It\'s brave. Too brave. It needs work.', 'It whispers "hit me with a hammer."', 'I can make it sing. Louder.',
    'Ugly as sin. Strong as faith.', 'A few taps and it\'ll outlive us both.', 'Dented in a heroic sort of way.',
    'Nothing a holy hammer can\'t fix.', 'I\'d bless it, but it looks shy.', 'Good bones. Bad haircut.', 'Fine work. Mine\'s finer.',
    'Held together by courage and rust.', 'It\'s crying out for a +1.', 'Half price! Full price.', 'It has character. Mostly scratches.',
    ['Cold to the touch. Like my axe!', null, 5], 'Monsters chewed it. Rude monsters.',
  ],
  gearReply: [
    'Be gentle with it.', 'It\'s been through a lot.', 'Can you make it better?', 'How much?', 'It saved my life twice.',
    ['Don\'t bless it. Please.', null, 3], 'Just a polish, please.', 'It\'s fine. Really.',
  ],
  gearClose: [
    ['Leave it with me. And your gold.', 'winking'], ['Into the fire with it! Figuratively!', 'overjoyed'], ['Let\'s get to work!', 'determined'],
    ['I\'ll treat it like my own child. Firmly.', 'confident'], ['Trust the Proud!', 'confident'], ['Hammer, faith and elbow grease!', 'determined'],
    ['It\'ll come out better than it went in. Mostly.', 'apologetic'], ['Gertrude the anvil is ready for it.', 'overjoyed'],
    ['Don\'t mind the frost on the anvil.', 'nervous', 5], ['Varrow says it\'s weak. I say it\'s humble!', 'defiant', 6],
  ],
  folkOpen: [
    ['Have you met {folk}?', 'curious'], ['You know {folk}?', 'winking'], ['I saw {folk} this morning!', 'overjoyed'],
    ['{folk} came by the forge today.', 'relieved'], ['I worry about {folk}.', 'worried'], ['{folk} is the best of us.', 'grateful'],
    ['Don\'t tell {folk}, but...', 'winking'], ['Between you and me, {folk}...', 'suspicious'], ['Pray for {folk}, would you?', 'humble'],
    ['I owe {folk} a pie.', 'apologetic'],
  ],
  folkPraise: [
    'Kindest soul in the Hollow.', 'Laughed at my joke. Twice!', 'Gave me soup. Holy soup.', 'Said I\'d make a fine paladin!',
    'Heart of gold. Elbows of iron.', 'Mended my apron. I cried.', 'Best singer in town. Don\'t tell the bard.',
    ['Terrified of my axe. Silly!', null, 1], ['Brought me flowers. Then ran.', null, 5], 'Saving for a sword. I\'ll make it free.',
    'Named a goat after me!', 'We arm-wrestled. I let them win. Barely.', 'Their bread could stop an arrow. Kindly meant.',
    'Taught me to whistle. I can\'t stop.', 'Listens to my sermons. Mostly awake.', 'Found my hammer in the well. Again.',
    'Keeps this whole town going, you know.', 'I owe them everything.', 'Laughs like a church bell!', 'Dances like a drunk bear. Glorious.',
    ['Said my aura gave them chills. Holy chills!', null, 2], ['Asked why my forge is frozen. Divine mystery!', null, 5],
    'Hugs like a blacksmith. Respect.', 'Sharpest wit in the Hollow. Ow.', 'Patched my roof for free. A saint.',
  ],
  folkReply: [
    'They seem nice.', 'Everyone loves you too, you know.', 'I\'ll say hello.', 'You know everyone here.', 'That\'s sweet, Homunculus.',
    'Is there anyone you don\'t like?', 'The Hollow\'s lucky to have you.',
  ],
  folkClose: [
    ['Everyone here is family. You too!', 'overjoyed'], ['Not one bad apple in the Hollow. Well. One goat.', 'winking'],
    ['I love this town. Don\'t tell it. It\'ll get proud.', 'shy'], ['Right! Back to work.', 'determined'],
    ['The Light loves them. I checked.', 'confident'], ['I\'d smite anyone who hurt them. Gently.', 'defiant'],
    ['Go on, wave at them. They like that.', 'grateful'], ['My axe likes them too. She hums.', 'nostalgic', 1],
  ],
  adviceOpen: [
    ['A word of advice for the deep:', 'focused'], ['Paladin tip!', 'confident'], ['Listen to old Homunculus.', 'nostalgic'],
    ['Before you go down:', 'worried'], ['Free advice, worth every copper:', 'winking'], ['From one holy warrior to another:', 'confident'],
    ['My axe says— I mean, I say:', 'embarrassed', 4], ['Remember this:', 'determined'],
  ],
  advice: [
    'Hit the big ones first.', 'Never trust a chest that smiles.', 'Skeletons hate being called thin.', 'Keep potions where your hands are.',
    'If it glows, don\'t lick it.', 'Duck. Always duck.', 'Run toward danger. Then a bit back.', 'Ghosts don\'t need doors. Run anyway.',
    'Sharp side toward the enemy.', 'A dented helm beats a dented head.', 'Count your fingers after every fight.',
    'Liches love a speech. Hit them during it.', 'If the floor is warm, move.', 'Big doors, big bosses. Knock first.',
    'Rest when you can. Bleed when you must.', 'Never fight hungry. Fight full. Then nap.', 'Every monster has a mother. Avoid her.',
    'Never say "how bad can it be."', 'When in doubt, smite.', 'A shield is a door you carry. Use it.', 'The dead hate the living. Stay living.',
    'Spiders are crabs that gave up on the sea.', ['If something whispers your name, don\'t answer.', null, 4],
    ['Cold steel is honest steel. Mostly.', null, 5], 'Trust your gear. I polished it.', 'Gold is heavy. Glory is light. Carry both.',
    ['Death knights are real. Very rude people.', null, 2], ['The deeper you go, the colder. Like my shop!', null, 5],
    'Come home. That\'s the whole trick.', 'Never lend your sword to a ghost.',
  ],
  adviceReply: [
    'Noted.', 'Wise words.', 'I\'ll remember that.', 'Is that from the Codex?', 'Did you just make that up?', 'Thanks, Homunculus.',
    'You worry too much.', ['Did the axe tell you that?', null, 4],
  ],
  adviceClose: [
    ['Now go make the Hollow proud!', 'overjoyed'], ['And come back! I mean it.', 'worried'], ['That one\'s free. The next costs.', 'winking'],
    ['Light be with you. And me. Mostly me.', 'confident'], ['I\'ll pray for you. Loudly.', 'determined'], ['Off you go. After your gear.', 'focused'],
    ['Mother taught me that. She was terrifying.', 'nostalgic'], ['Varrow agrees. He says "obviously".', 'relieved', 6],
  ],
  lifeOpen: [
    ['Guess what?', 'overjoyed'], ['Can I tell you something?', 'shy'], ['Funny thing happened.', 'winking'], ['True story:', 'confident'],
    ['Don\'t laugh, but...', 'embarrassed'], ['I\'ve been thinking.', 'thoughtful'], ['What a week.', 'exhausted'], ['Confession time:', 'apologetic'],
  ],
  life: [
    'I named my anvil Gertrude. She\'s a good listener.', 'I tried baking. The bread is now a doorstop.',
    'I slept in the forge. Woke up warm. Holy warm.', 'Mother wrote! She says hello and wear a vest.',
    'I\'m learning the lute. The lute is not learning me.', 'I adopted a pigeon. Or it adopted me.',
    'I wrote a poem about hammers. It\'s mostly "bang".', 'I grew a tomato. Just one. I\'m very proud.',
    'I lost my hammer in my apron for a whole day.', 'I dreamt I was a teapot. Very relaxing.',
    'Someone left a love note at the forge. I melted it.', 'The children made me a crown of nails. I wear it daily.',
    'I counted the stars last night. Got to nine. Slept.', ['I talked to my axe for an hour. Great listener.', null, 1],
    'I bathe in the river at dawn. Cold. And holy.', 'My pigeon brought me a worm. We\'re close now.',
    'I whistled a hymn. Dogs came from miles.', 'I fixed the bell tower. It rings in a new key now.',
    'I sat on a hedgehog. We\'re both healing.', 'I\'m writing my memoirs. Chapter one: Born Proud.',
    'I swept the forge! Found three hammers and a cat.', 'I had soup. It was a good day.', 'My boots were my father\'s boots.',
    'The forge sneezed sparks on the mayor. He lived.', 'I\'m saving for a horse. I have four coppers.',
    ['I sleep with my axe now. Keeps the bed cold.', null, 5], ['My breath fogs indoors. In summer! Blessed!', null, 5],
    ['Something knocks at night. From the axe rack.', null, 4], ['I lit a candle for Father. It burned upside down.', null, 3],
    'Pip asked if I\'m a giant. I said "of faith!"',
  ],
  lifeReply: [
    'That\'s wonderful.', 'Homunculus, you\'re a treasure.', 'Ha! Of course you did.', 'Are you... okay?', 'Tell me more!',
    'I have so many questions.', 'You need a day off.', ['That is deeply strange.', null, 3],
  ],
  lifeClose: [
    ['Life\'s good in the Hollow! Now, business.', 'overjoyed'], ['Anyway! Enough about me. More about me later.', 'winking'],
    ['That\'s my news. What\'s yours? No time? Next time!', 'curious'], ['Don\'t tell Gertrude I said that.', 'shy'],
    ['Simple joys, hero. Simple joys and hammers.', 'relieved'], ['Ha! I love my life.', 'overjoyed'],
    ['Varrow thinks it\'s funny. He laughed. Once.', 'grateful', 9],
  ],
  complOpen: [
    ['You know what,', 'thoughtful'], ['Hero, I must say,', 'grateful'], ['Honestly,', 'humble'], ['Not to embarrass you, but', 'shy'],
    ['Let me tell you:', 'confident'], ['Whole town agrees:', 'overjoyed'], ['I\'ve been meaning to say,', 'nervous'], ['Hand on heart,', 'grateful'],
  ],
  compliment: [
    'you\'re the best {cls} I\'ve ever met.', 'you walk like a hero. Squeaks and all.', 'the Hollow sleeps safer with you below.',
    'you came back. That\'s the bravest bit.', 'your swing\'s gotten frightening. Good frightening.', 'you\'d make a fine paladin. Like me!',
    'you remind me of me. High praise.', 'I keep your portrait by the anvil. I drew it. Badly.', 'the children all play at being you.',
    'you\'ve a good heart. I can hear it. Very loud.', 'you never say no to a friend. Even me.', 'you smell like victory. And crypt.',
    'you\'re my favourite customer. Shh.', 'I\'d want a sibling like you.', 'I\'d follow you into the dark. Way behind.',
    'you\'re the only one who hears my stories out.', ['even the axe likes you. She goes quiet.', null, 4],
    'you\'ve more Light in you than the temple.', 'that {cls} business suits you.', 'you make this old forge feel warm.',
  ],
  complReply: [
    'Stop, you\'ll make me blush.', 'Thank you, Homunculus.', 'You\'re a good friend.', 'Right back at you.', 'That means a lot.', 'Way behind?',
  ],
  complClose: [
    ['Now! Let\'s make you even better.', 'determined'], ['Ha! Look at you, all pink.', 'winking'], ['I mean every word. Proudly.', 'confident'],
    ['Right. Enough feelings. Hammers!', 'embarrassed'], ['Go on, before I cry on your boots.', 'grateful'], ['Light keep you, friend.', 'humble'],
  ],
  blessOpen: [
    ['Kneel, hero!', 'determined'], ['Hold still!', 'focused'], ['Don\'t move.', 'concentrating'], ['Close your eyes.', 'thoughtful'],
    ['Let me bless you.', 'humble'], ['Hands out!', 'confident'], ['A blessing before you go!', 'overjoyed'], ['Quick, before it wears off!', 'alarmed'],
  ],
  blessing: [
    'By the Light, may your blade stay sharp!', 'May your potions never run dry!', 'May your foes trip on their own feet!',
    'May your boots stay dry and your foes damp!', 'Light protect this hero. And their trousers.', 'I bless thee with... glowing. Done.',
    'May the deep fear you more than you fear it.', 'By the power vested in me by me!', 'May every chest you open be full!',
    'Go forth and smite! Politely.', 'Holy Light, do your thing!', 'May you come home with all your fingers!',
    ['May the dead stay dead around you!', null, 3], ['Rise, cold and— I mean, rise, blessed!', null, 6], ['By Light and by... frost? By Light!', null, 5],
    ['May the grave never... no, wrong prayer.', null, 4], 'May your aim be true and your armour truer!', 'Blessed be this hero, their gear and their gold.',
    ['By my anvil and my axe, be blessed!', null, 1], 'In the name of the Light and Homunculus!',
  ],
  blessReply: [
    ['I feel... chilly.', null, 2], 'Thanks. I think?', 'Was that supposed to tingle?', ['My fingers went numb.', null, 4], 'I feel blessed. Probably.',
    ['Why is it green?', null, 2], 'That was lovely, Homunculus.',
  ],
  blessClose: [
    ['There! Holier already.', 'overjoyed'], ['That\'ll last a week. Or a fight.', 'confident'], ['Don\'t scratch it. Lets the holy out.', 'focused'],
    ['Free of charge. Paladins don\'t charge. Smiths do.', 'winking'], ['The tingle is normal! I think.', 'nervous'],
    ['Varrow added a little extra. You\'re welcome!', 'grateful', 9],
  ],
};

// three-bubble topics: [speaker, template]; `holy` topics make his "holy" (necrotic) glow flare
export const TOPICS = [
  { id: 'boast', w: 3, holy: true, lines: [['h', '{hail} {feat}'], ['p', '{doubt}'], ['h', '{proof}']] },
  { id: 'training', w: 2, lines: [['h', '{hail} {training}'], ['p', '{trainReply}'], ['h', '{trainClose}']] },
  { id: 'gear', w: 2, lines: [['h', '{gearLook} {gearVerdict}'], ['p', '{gearReply}'], ['h', '{gearClose}']] },
  { id: 'folk', w: 2, lines: [['h', '{folkOpen} {folkPraise}'], ['p', '{folkReply}'], ['h', '{folkClose}']] },
  { id: 'advice', w: 2, lines: [['h', '{adviceOpen} {advice}'], ['p', '{adviceReply}'], ['h', '{adviceClose}']] },
  { id: 'life', w: 2, lines: [['h', '{lifeOpen} {life}'], ['p', '{lifeReply}'], ['h', '{lifeClose}']] },
  { id: 'compliment', w: 1, lines: [['h', '{complOpen} {compliment}'], ['p', '{complReply}'], ['h', '{complClose}']] },
  { id: 'bless', w: 1, holy: true, lines: [['h', '{blessOpen} {blessing}'], ['p', '{blessReply}'], ['h', '{blessClose}']] },
];

// The axe. Each chapter is told twice (two of its three tellings) before the next one; later visits retell old
// chapters (recaps) so a missed beat comes round again in other words. [speaker, text, pose]
export const STORY = [
  { title: 'Homunculus the Proud', tellings: [
    [['h', 'Welcome! I\'m Homunculus the Proud, blacksmith and Paladin of the Light!', 'overjoyed'], ['p', 'A paladin? You?'], ['h', 'Self-taught! The Light found me last spring. Right after I found the axe.', 'confident']],
    [['h', 'New smith, old soul! Homunculus the Proud. Paladin, mostly.', 'confident'], ['p', 'Mostly?'], ['h', 'The powers came with the shop. So did that lovely axe on the wall.', 'winking']],
    [['h', 'Did I mention I\'m a paladin? Since spring! Since the axe!', 'overjoyed'], ['p', 'What axe?'], ['h', 'Her, on the rack! Isn\'t she grand? Came with the forge.', 'nostalgic']],
  ] },
  { title: 'The Axe on the Wall', tellings: [
    [['h', 'See the great axe? Seven chains on her when I moved in.', 'curious'], ['p', 'Seven chains?'], ['h', 'And a note: DO NOT. Very rude. I took the note down.', 'defiant']],
    [['h', 'The old smith left that axe behind. And the town. Quite fast.', 'thoughtful'], ['p', 'Did he say why?'], ['h', 'He said "never touch it". So I polish her every morning!', 'winking']],
    [['h', 'There\'s a name carved on the axe. Old letters. Can\'t read them.', 'concentrating'], ['p', 'Is it... humming?'], ['h', 'She purrs when I\'m near! The holy ones do that.', 'overjoyed']],
  ] },
  { title: 'Green Light', tellings: [
    [['h', 'Watch! Holy light!', 'determined'], ['p', 'That\'s... green, Homunculus.'], ['h', 'Regional variation! Hollow Light is green.', 'confident']],
    [['h', 'My hands glowed green at prayer again!', 'overjoyed'], ['p', 'Holy light is usually gold.'], ['h', 'Gold is for show-offs. Green is humble.', 'humble']],
    [['h', 'Whenever I touch the axe, my fingers glow. Green!', 'surprised'], ['p', 'Maybe don\'t touch the axe?'], ['h', 'And turn my back on a gift? Never!', 'defiant']],
  ] },
  { title: 'The Hen', tellings: [
    [['h', 'I laid hands on Old Mother Wren\'s dead hen. She got up!', 'overjoyed'], ['p', 'Got up... how?'], ['h', 'Slowly. She doesn\'t eat or blink now. Very low upkeep!', 'relieved']],
    [['h', 'Remember the hen I healed? She follows me everywhere.', 'winking'], ['p', 'Does she blink yet?'], ['h', 'Never blinks! So focused. A holy hen.', 'confident']],
    [['h', 'Healing\'s easy! The dead ones just need a nudge.', 'confident'], ['p', 'That\'s not what healing is.'], ['h', 'They\'re up and about. That\'s healthy, surely!', 'confused']],
  ] },
  { title: 'The Voice', tellings: [
    [['h', 'The Light speaks to me now! Deep voice. Lots of echo.', 'overjoyed'], ['a', '...free... me...'], ['h', 'So humble! Always asking, never demanding.', 'grateful']],
    [['h', 'Hear that? The Light! It whispers from the wall.', 'curious'], ['a', '...a body... bring me... a body...'], ['h', 'It wants a body! For the choir, I think.', 'thoughtful']],
    [['h', 'The Light talks at night. From the axe rack, oddly.', 'nervous'], ['p', 'What does it say?'], ['h', '"Free me." "Kneel." "Obey." Very traditional stuff.', 'confident']],
  ] },
  { title: 'The Cold Forge', tellings: [
    [['h', 'My forge burns blue now. Cold blue. In summer!', 'overjoyed'], ['p', 'A cold forge? Does that even work?'], ['h', 'Divine air! The iron weeps frost. Lovely.', 'relieved']],
    [['h', 'Wren\'s tea froze solid when I waved at her. Holy chill!', 'winking'], ['p', 'Homunculus, your breath is fogging.'], ['h', 'Indoors! In summer! Blessed beyond measure.', 'overjoyed']],
    [['h', 'I hold the axe and the room goes cold. Grace has a draught.', 'thoughtful'], ['a', '...winter comes... with me...'], ['h', 'Winter of the soul! Very deep. Very holy.', 'confident']],
  ] },
  { title: 'Saint Varrow', tellings: [
    [['h', 'The Light told me its name! Varrow. Saint Varrow.', 'overjoyed'], ['p', 'Never heard of a Saint Varrow.'], ['h', 'Very obscure! That\'s how you know he\'s humble.', 'confident']],
    [['a', '...I am Varrow... the Rimebound... Knight of the Pale Rune...'], ['h', 'Saint Varrow! Patron of... cold things? Lovely!', 'overjoyed'], ['p', 'Knight of the... Pale Rune?']],
    [['h', 'I pray to Saint Varrow now. He answers! Rare, for a saint.', 'grateful'], ['p', 'What does he say?'], ['h', '"You are a fool." Humility lessons. Every morning.', 'humble']],
  ] },
  { title: 'The Warning', tellings: [
    [['p', 'Homunculus, that axe holds a death knight.'], ['h', 'A death knight? In MY axe? Cursed with goodness, more like!', 'defiant'], ['a', '...he does not listen... he never listens...']],
    [['p', 'Your powers are green, cold, and raise the dead.'], ['h', 'Yes! Healing, refreshing and... encouraging!', 'overjoyed'], ['p', 'Homunculus. That\'s necromancy.'], ['h', 'Necro-what? Big word. Bless you!', 'confused']],
    [['p', 'Wren says your saint is a death knight.'], ['h', 'Wren says frogs are spies. I love her, but no.', 'annoyed'], ['a', '...the old woman... is wise...']],
  ] },
  { title: 'A Vessel', tellings: [
    [['h', 'Saint Varrow wants a vessel. I offered him a bucket!', 'overjoyed'], ['a', '...not... a bucket...'], ['h', 'A bigger bucket, then. I\'ll forge one!', 'determined']],
    [['h', 'He asked for my body. I said it\'s taken. By me!', 'winking'], ['a', '...three hundred years... and I get... this one...'], ['h', 'Three hundred! Respect your elders, hero.', 'humble']],
    [['p', 'He wants to possess you, Homunculus.'], ['h', 'He can borrow me Sundays. I\'m generous.', 'confident'], ['a', '...that is not... how it works...']],
  ] },
  { title: 'Good Morning', tellings: [
    [['a', '...hero. A word. Quietly...'], ['a', '...he polishes me. Tells me jokes. Every dawn...'], ['a', '...three centuries alone. Do not tell him. He is happy.'], ['p', 'Your secret\'s safe, Varrow.']],
    [['h', 'Varrow laughed today! First time. I told him the goat joke.', 'overjoyed'], ['a', '...it was... a good goat joke...'], ['p', 'Is the axe... warmer?']],
    [['a', '...I could take him. Any night. I have not...'], ['p', 'Why not?'], ['a', '...because he says good morning. Every morning.']],
  ] },
  { title: 'Homunculus the Reformed', tellings: [
    [['h', 'Hero, I\'ve been thinking. Saint Varrow is a death knight, isn\'t he?', 'thoughtful'], ['p', '...Yes. I\'m sorry.'], ['h', 'Then he\'s a GOOD death knight now. I\'ve been a good influence!', 'overjoyed']],
    [['h', 'Varrow. Are you a death knight?', 'skeptical'], ['a', '...yes.'], ['h', 'Do you want to be a paladin with me instead?', 'grateful'], ['a', '...yes.']],
    [['h', 'So my holy powers are death knight powers. Borrowed!', 'confused'], ['p', 'How do you feel?'], ['h', 'Proud! Homunculus the Proud and Varrow the Reformed!', 'overjoyed']],
  ] },
];

// after the story: Homunculus and Varrow, partners
export const AFTER = [
  [['h', 'Varrow and I are writing a hymn. He does the low notes.', 'overjoyed'], ['a', '...all the notes are low...'], ['p', 'It\'s... haunting.']],
  [['h', 'Varrow, say hello to the hero!', 'winking'], ['a', '...hello, mortal. Stay alive. He would cry.'], ['h', 'I would! Buckets!', 'grateful']],
  [['a', '...he named the anvil after me. It is... an honour...'], ['h', 'Gertrude Varrow! Lovely name.', 'overjoyed'], ['p', 'Poor Gertrude.']],
  [['h', 'Varrow helps me smite now! Together we\'re unstoppable.', 'determined'], ['a', '...together we are... adequate...'], ['h', 'Adequate is holy too!', 'confident']],
  [['h', 'We blessed the well. Cold, holy, slightly haunted.', 'overjoyed'], ['p', 'Slightly?'], ['h', 'Friendly haunted!', 'winking']],
  [['a', '...I have not slain anyone in a year. He made a chart...'], ['h', 'Gold stars every week!', 'overjoyed'], ['p', 'I\'m proud of you, Varrow.']],
  [['h', 'The children want axe rides. Varrow says no.', 'disappointed'], ['a', '...Varrow says... once...'], ['h', 'He\'s soft! Under all that frost.', 'overjoyed']],
  [['h', 'Varrow still wants a body. We\'re knitting him one.', 'concentrating'], ['a', '...it is... very itchy...'], ['p', 'Is that a sleeve or a leg?']],
];

// Homunculus and the townsfolk: he hails them by name, they answer fondly (folk emotions are town EMOTIONS)
export const FOLK_HAILS = [
  ['Morning, {name}! The Light loves you! I checked!', 'overjoyed'], ['{name}! Looking holy today!', 'confident'],
  ['{name}! Come by later, I\'ll fix that buckle!', 'winking'], ['Bless you, {name}! Free of charge!', 'humble'],
  ['Ho, {name}! Mind the sparks!', 'alarmed'], ['{name}! Did you eat? Eat something!', 'worried'], ['Good to see you, {name}! Truly!', 'grateful'],
  ['{name}, you\'re glowing! Am I doing that?', 'curious', 2], ['{name}! A hymn? No? Next time!', 'overjoyed'],
  ['Wave to the axe, {name}! She likes you.', 'winking', 1], ['{name}! Stay warm, it\'s chilly by the forge.', 'nervous', 5],
  ['{name}! I forged you a nail! Just one. With love.', 'grateful'], ['Hail, {name}! Paladin business, very busy!', 'determined'],
  ['{name}! You\'re my favourite! Don\'t tell the others.', 'winking'], ['Ah, {name}! The Hollow\'s finest!', 'overjoyed'],
];
export const FOLK_BACK = [
  ['Morning, Homunculus!', 'happy'], ['Ha! You great lump!', 'laugh'], ['Bless you too, big man!', 'happy'],
  ['You\'re a treasure, Homunculus.', 'love'], ['Save me a hymn!', 'cheer'], ['Your forge is freezing again!', 'surprised', 5],
  ['Still a paladin, are we?', 'mischief'], ['Love you, Homunculus!', 'love'], ['Smite something for me!', 'cheer'],
  ['You smell like snow again.', 'curious', 5], ['Best smith we\'ve ever had!', 'cheer'], ['Your hen is staring at me.', 'scared', 3],
  ['How\'s the saint?', 'question', 6], ['Mind your back, big fellow!', 'wave'], ['You made my week, Homunculus!', 'happy'],
];
// the axe on its own, now and then, once it has found its voice
export const AXE_MUTTERS = [
  [4, '...free... me...'], [4, '...so warm... the living...'], [4, '...kneel...'], [5, '...winter... is patient...'],
  [5, '...cold... colder...'], [6, '...I am Varrow... remember it...'], [6, '...he polishes... too much...'],
  [7, '...do not... believe him... about the goat...'], [8, '...a bucket... honestly...'], [9, '...good morning... smith...'],
  [10, '...the hymn... needs work...'], [10, '...hello, hero...'],
];
// what a hero says when nobody has asked them anything (opens a chat at times)
export const HERO_OPENERS = ['Morning, Homunculus.', 'How\'s the forge?', 'Got a minute?', 'Hello, big man.', 'Still a paladin?'];
