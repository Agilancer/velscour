// The Sky Battle's parley (docs/SKY_BATTLE.md): the hero, the next captain and two sky-knights sworn to VELSCOUR talk
// on the heroes' deck before the flagship comes. The knights tell why they serve Velscour as Air Pirates; the hero
// tries to win them over; they never join. Then the truce, a moment of calm, and the twist.
// conversation(i, ctx) builds one: index i picks the opener, the first knight's tale and the refusal by mixed radix,
// so indices 0..CONVERSATION_COUNT-1 are all different talks; the other beats vary with i too.
// A line is { who: 'hero' | 'cap' | 'k1' | 'k2', text, act }: `act` is a mood for the hero and the captain ('calm',
// 'grim', 'laugh', 'angry', 'smug', 'shock') and an animation for the knights (game/skybattle.js KNIGHT_ACTS).
// Tokens: {hero} {class} {cap} {captitle} {k1} {k2} {weather}.
export const CONVERSATION_COUNT = 2000;

const OPEN = [
  ['So. The famous {hero}. Smaller than the wanted posters.', 'smug'],
  ['Stand easy, {class}. I came under a white flag. Mostly white. It was white once.', 'calm'],
  ['You have sunk nine of my boats today. I came to see the face that cost me nine boats.', 'grim'],
  ['Parley! By the old sky-law, nobody stabs anybody for the next five minutes.', 'calm'],
  ['I am {cap}, {captitle}. You may kneel, or you may simply look impressed.', 'smug'],
  ['{weather}, boarders in the rigging, and a {class} on my target. What a lovely afternoon.', 'laugh'],
  ['You fight well for a groundling. Velscour mentioned you might.', 'grim'],
  ['Put the weapon down, {hero}. Or keep it up. I find either very flattering.', 'smug'],
  ['I lost a bet. My crew said you would be dead by the third wave. I said the fourth. We were both wrong.', 'laugh'],
  ['The abyss whispers your name, {hero}. Mostly it whispers it with a sigh.', 'grim'],
  ['You know what they call a {class} who boards an Air Pirate lane? Lunch.', 'angry'],
  ['I have a proposal. Hear it, then refuse it. Everyone does.', 'calm'],
  ['Hold your fire! I bring words, two knights, and a very small snack.', 'laugh'],
  ['Velscour sends his regards. And his fleet. Mostly his fleet.', 'smug'],
  ['You are standing on a ship we were going to steal. That makes you a trespasser.', 'angry'],
  ['Let us talk, {hero}, like two people who will soon be trying to kill each other.', 'grim'],
  ['I do not usually parley. But you have ruined my afternoon so thoroughly I had to meet you.', 'angry'],
  ['A {class}! I knew it. Nobody else would bring that much luggage to a sky battle.', 'laugh'],
];
const REPLY = [
  ['Say what you came to say. My blade is getting bored.', 'grim'],
  ['Sure. Talking beats bleeding. Usually.', 'calm'],
  ['You have about one minute before I stop being polite.', 'angry'],
  ['I am listening. I am also counting your crew.', 'calm'],
  ['A white flag on a pirate. Now I have seen everything.', 'laugh'],
  ['If this is a trick, it is a very slow one.', 'smug'],
  ['Talk fast, captain. The wind is not on your side today.', 'grim'],
  ['Fine. But your knights stay where I can see them.', 'calm'],
  ['I came up here for Velscour, not for small talk. Make it interesting.', 'angry'],
  ['Go on. I will pretend I am not already winning.', 'smug'],
  ['Parley it is. Nobody touch the cannons.', 'calm'],
  ['You called a truce in the middle of a sky battle? Bold. Strange. Bold.', 'laugh'],
  ['Velscour sends pirates now? He must be running out of demons.', 'smug'],
  ['Speak. Then get off my ship.', 'grim'],
];
const INTRO = [
  ['My sky-knights: {k1} and {k2}. Sworn to the black sail, and to Velscour.', 'smug'],
  ['Meet {k1} and {k2}, the finest blades between here and the abyss.', 'calm'],
  ['These two are {k1} and {k2}. Do not let the shiny armor fool you. They bite.', 'laugh'],
  ['{k1}. {k2}. Say hello to the {class} who keeps sinking our boats.', 'grim'],
  ['I brought {k1} and {k2} so you could see what loyalty looks like.', 'smug'],
  ['Behind me stand {k1} and {k2}. Every one of their stories ends with Velscour.', 'grim'],
  ['{k1} and {k2} asked to come along. They wanted to meet you before they kill you.', 'laugh'],
  ['These are my knights, {k1} and {k2}. They have stories. Gods help us, they always have stories.', 'calm'],
];
// the first knight's tale: why they serve Velscour as an Air Pirate (comedic and grim)
const TALE = [
  ['My kingdom fell to the abyss. The king fled. The gods were silent. Only Velscour\'s black sails came for us.', 'cry'],
  ['Velscour remembered my birthday. NOBODY remembers my birthday.', 'swoon'],
  ['Dental. Velscour\'s fleet has full dental. Do you know what sky-scurvy does to a smile?', 'laugh'],
  ['I swore an oath under the red moon, with blood on the deck and thunder in the sails. I do not break oaths.', 'salute'],
  ['I was a knight of the realm for twenty years. Twenty years of guarding a door. Now I FLY.', 'spin'],
  ['The Hollow Crown hanged my brother for stealing bread. Velscour hanged the Hollow Crown.', 'rage'],
  ['He lets us name the clouds. That one is Gerald. That one is also Gerald. I am bad at naming.', 'point'],
  ['When the abyss opened under my village, it was an Air Pirate who caught me falling. I owe them every breath.', 'cry'],
  ['Velscour said I had "promising cruelty." Nobody had ever believed in me before.', 'swoon'],
  ['Ground knights polish armor all day. Sky knights polish armor all day AT ALTITUDE.', 'flex'],
  ['I tried honest work. The honest work tried to kill me. The pirates just gave me a sword.', 'shrug'],
  ['The shanties. You have not heard a shanty until two hundred pirates sing it inside a thundercloud.', 'dance'],
  ['My oath is to the black sail. The sail does not lie, does not flee, and does not tax my horse.', 'salute'],
  ['I watched my order sell our city to the highest bidder. Velscour was the only one who bid with honesty.', 'rage'],
  ['There is a cookie. On the flagship. Velscour bakes it himself. It is the size of a shield.', 'hop'],
  ['Up here nobody asks where I came from. Down there, everyone asked. Up here, I am just a blade.', 'shrug'],
  ['I lost a duel to Velscour once. He spared me, then bought me dinner. I have been his ever since.', 'swoon'],
  ['The abyss took everything I loved. So I sail above it, every day, and spit down into it.', 'rage'],
  ['My mother was an Air Pirate. My grandmother was an Air Pirate. My horse is an Air Pirate.', 'flex'],
  ['I joined for the hat. I stayed for the hat. It is a very good hat.', 'dance'],
  ['They promised me the sky. Nobody else promised me anything but a grave.', 'cry'],
  ['Velscour is a demon, yes. But he is OUR demon. You get used to the screaming.', 'shrug'],
  ['The knights of the tower called me too short for the order. The pirates called me "captain material."', 'flex'],
  ['I owe Velscour a life-debt. Technically three. I keep falling off things.', 'faint'],
  ['There is no throne up here, no king, no tithe. Only wind and the black sail. I will die for that.', 'salute'],
  ['I once tried to leave. I got as far as the rope ladder. The view stopped me. Look at it. LOOK AT IT.', 'point'],
  ['Velscour healed my sister when the temple priests would not. A demon did what saints refused to do.', 'cry'],
  ['The pay is terrible, the hours are worse, and I have never been happier in my life.', 'laugh'],
  ['I was cursed to never touch the ground again. Joining the fleet seemed practical.', 'shrug'],
  ['We are the only free people left in the sky. Velscour keeps the abyss off our backs, and we keep the black sail flying.', 'salute'],
];
// the hero's recruiting pitch
const PITCH = [
  ['Then come with me. Fight against Velscour, not for him.', 'calm'],
  ['You do not owe a demon anything. Join us. The abyss can be closed.', 'grim'],
  ['Herrington Hollow could use knights like you. We have bread. Good bread.', 'laugh'],
  ['Velscour is using you. When the abyss swallows everything, he will not catch you a second time.', 'grim'],
  ['Switch sides. I will even let you keep the hat.', 'smug'],
  ['Listen to yourselves. You are better than a demon\'s fleet.', 'calm'],
  ['Join me and you will never have to sing a shanty again.', 'laugh'],
  ['There is still a road home. I can show you where it starts.', 'calm'],
  ['When I reach Depth 500, I would rather have you beside me than in front of me.', 'grim'],
  ['Our town needs defenders. Real ones. Ones who can fly.', 'calm'],
  ['You could be heroes. Songs, statues, the works. Possibly a small festival.', 'laugh'],
  ['Velscour will burn the world. Do you want to watch that from a nice ship?', 'angry'],
  ['I have a skill tree. You can have a branch of it. Metaphorically.', 'smug'],
  ['Every knight I meet down there wants to be you. Come back and show them how it is done.', 'calm'],
  ['Throw down the black sail and I will throw down my sword. Well. Lower it. Slightly.', 'smug'],
  ['You saw the abyss swallow your homes. Help me make sure it never swallows anyone else.', 'grim'],
  ['We have a fishmonger named Nell. She would love you. She loves everyone. It is unsettling.', 'laugh'],
  ['Join me. I am very good at winning, as nine of your boats can confirm.', 'smug'],
  ['Velscour does not care about you. I am not sure he cares about anything.', 'angry'],
  ['I am offering you a choice nobody offered you before. Take it.', 'calm'],
];
// the second knight chips in
const COUNTER = [
  ['{k1} is too polite to say it, so I will: our cause is not for sale.', 'rage'],
  ['Did you just offer us BREAD? We have bread. We have SKY bread. It is fluffier.', 'laugh'],
  ['I have heard a hundred speeches like yours. All of them ended at the bottom of the abyss.', 'shrug'],
  ['Funny. The last hero who tried to recruit us is now our cabin boy.', 'point'],
  ['Your town hanged my cousin for poaching a rabbit. A RABBIT. Velscour made him a quartermaster.', 'rage'],
  ['We knew you would say that. We practiced our faces. Look. This is our unmoved face.', 'flex'],
  ['A statue? I already have a statue. It is on the flagship. Velscour carved it. It is mostly accurate.', 'swoon'],
  ['I would join you, {hero}, truly, but I am deeply allergic to losing.', 'shrug'],
  ['My oath is older than your town. Older than your class. Older than your shoes.', 'salute'],
  ['You know what I like about you, {class}? Nothing. But I respect it.', 'laugh'],
  ['If Velscour burns the world, we will be the ones holding the matches. At least we will be warm.', 'shrug'],
  ['Every one of us was thrown away by somebody. Velscour picked us up. You are just picking us off.', 'cry'],
  ['A festival? With a parade? ...No. NO. Do not tempt me with parades.', 'hop'],
  ['Last week a {class} tried this speech. We threw him overboard. He is still falling.', 'point'],
  ['I tried living down there. They wanted taxes for the air I breathed.', 'rage'],
  ['We are pirates, {hero}. We keep our word. Our word just happens to be "no."', 'salute'],
  ['Ha! A cabin with a VIEW? We have a view. We have ALL the view.', 'dance'],
  ['The only thing I want to join is your funeral. Respectfully.', 'salute'],
  ['Hmm. Hmm. Hmmmmmmm. ...No.', 'shrug'],
  ['You fight for a town. We fight for each other. That is the difference.', 'cry'],
];
// the hero sweetens it
const SWEETEN = [
  ['Last offer: a warm bed, a roof, and nobody shooting cannons at you.', 'calm'],
  ['Think about it. Really think. I can wait. The pirates on the next boat cannot.', 'smug'],
  ['I will put in a good word with the town. They forgive anyone who brings back the bread cart.', 'laugh'],
  ['You do not have to decide now. Just do not decide wrong.', 'grim'],
  ['I will throw in my second best potion. It is a very good potion.', 'laugh'],
  ['When the black sails burn, my offer still stands.', 'grim'],
  ['Come on. Nobody truly loves screaming. Not even you.', 'smug'],
  ['Nobody is born a villain. Some people are just hired as one.', 'calm'],
  ['The abyss only wins if good knights keep fighting on the wrong ship.', 'grim'],
  ['Join me and I will learn every shanty you know. Badly. Loudly.', 'laugh'],
  ['Velscour will not save you twice. I might.', 'calm'],
  ['Picture it. A parade. Banners. Confetti. Nell the fishmonger crying happy tears.', 'laugh'],
  ['You could walk away from this. Walk. On the ground. Like normal people.', 'smug'],
  ['Final answer? Please say yes. My arms are tired from swinging.', 'laugh'],
];
// both knights refuse: [k1 line, k1 act, k2 line, k2 act]
const REFUSE = [
  ['No.', 'shrug', 'Absolutely not.', 'shrug'],
  ['Never. I would rather fall.', 'salute', 'And we have fallen. It was AWFUL. Still no.', 'faint'],
  ['The black sail, now and always.', 'salute', 'Now, always, and a bit after that.', 'salute'],
  ['Tempting. Truly tempting. No.', 'swoon', 'Do not look at the bread, {k1}. DO NOT LOOK AT THE BREAD.', 'rage'],
  ['We are flattered, {hero}. Flattered and unmoved.', 'flex', 'Mostly unmoved. Slightly moved. Moving back now.', 'spin'],
  ['I will not betray Velscour. Not for bread, not for gold, not for you.', 'rage', 'Maybe for a parade. NO. Not for a parade.', 'hop'],
  ['Our answer is the same as the wind\'s: it blows the other way.', 'point', 'That was beautiful, {k1}. Write that down.', 'cry'],
  ['Ask me again when the abyss is closed. Which will be never.', 'shrug', 'Which is a long time. We checked.', 'shrug'],
  ['You have heart, {class}. We have an oath. An oath beats heart.', 'salute', 'Usually. Not in poetry. But usually.', 'shrug'],
  ['If you want our swords, come and take them.', 'rage', 'Please do not take my sword. I just had it polished.', 'cry'],
  ['No, no, and once more for the sky: NO.', 'dance', 'NOOOO!', 'dance'],
  ['I will think about it.', 'thinking', 'He has thought about it. It is no.', 'point'],
  ['We would rather jump.', 'salute', 'And we have parachutes, so the threat is a bit hollow.', 'shrug'],
  ['The only side we switch is port to starboard.', 'laugh', 'And only when the cannons are on port.', 'laugh'],
  ['You are kind. Kindness gets people killed up here.', 'cry', 'We have seen it. We will not see it again.', 'cry'],
  ['Our hearts belong to the black sail.', 'swoon', 'Mine also belongs to that cookie.', 'swoon'],
  ['Velscour holds our oaths. Only death holds them tighter.', 'salute', 'And death owes Velscour money, so that is fine.', 'laugh'],
  ['A knight who changes sides is no knight at all.', 'salute', 'He read that on a banner. It was a very convincing banner.', 'point'],
  ['Go home, {hero}. While you still have one.', 'rage', 'That sounded threatening. It was meant to. Sorry. Not sorry.', 'shrug'],
  ['We will remember the offer.', 'salute', 'Fondly. As we stab you.', 'laugh'],
  ['Hmm. No. But thank you for asking nicely.', 'bow', 'Nobody ever asks nicely. That was nice.', 'cry'],
  ['If the day ever comes that we leave the black sail, it will not be for you.', 'rage', 'It will be for bread. It is always the bread.', 'hop'],
  ['The sky made us. The sky keeps us.', 'salute', 'The sky also keeps our pensions. Long story.', 'shrug'],
  ['Never.', 'rage', 'Never, ever, ever.', 'rage'],
];
// the captain closes the parley in peace
const TRUCE = [
  ['Well. That was civilised. Nobody died. Rare, for a parley.', 'laugh'],
  ['You have my respect, {hero}. Go in peace. For now.', 'calm'],
  ['Enough words. The sky is wide; perhaps we never meet again.', 'calm'],
  ['I will tell Velscour you were reasonable. He will not believe me.', 'smug'],
  ['Let us part as almost-friends. Mostly-enemies. Pleasant acquaintances.', 'laugh'],
  ['A truce then, until the wind changes.', 'calm'],
  ['You fought with honour. We will leave you to the clouds.', 'grim'],
  ['Perhaps there is room in the sky for both of us after all.', 'calm'],
  ['Go on, {class}. Fly your fine ship. Enjoy the view while it lasts.', 'smug'],
  ['I came to measure you. You measure up. Good day, {hero}.', 'calm'],
  ['Peace, then. A rare thing up here. Savour it.', 'calm'],
  ['We will go. Our boats are sunk anyway. Thank you for that.', 'angry'],
  ['A toast, then. To the sky, which belongs to nobody.', 'laugh'],
  ['That is the end of it. No more boats. No more blood. You have my word.', 'calm'],
];
const OK = [
  ['...Huh. That went better than I expected.', 'calm'],
  ['Peace. Actual peace. I should write this down.', 'laugh'],
  ['Well. That was strange. Nice, but strange.', 'calm'],
  ['Did we just win a sky battle by talking? Is that allowed?', 'laugh'],
  ['Finally. A quiet moment. Nothing could possibly go wrong now.', 'calm'],
  ['Huh. Pirates with manners. The world is full of surprises.', 'smug'],
  ['I will take it. A truce beats another wave of boarders.', 'calm'],
  ['Nice weather for it, even. Well. Nicer.', 'calm'],
  ['I almost liked those two.', 'laugh'],
  ['And here I was, all ready for a fight.', 'smug'],
];
// the flagship comes out of the clouds
const TWIST = [
  ['Ah. Did I mention my word expires when the flagship arrives?', 'laugh'],
  ['Oh dear. Is that the time? It is cannon time.', 'smug'],
  ['Funny thing about truces. They float. Until they sink.', 'smug'],
  ['Meet the BLACK MOURNING. My word was good. Hers never is.', 'laugh'],
  ['I said no more boats. That is not a boat. That is a SHIP.', 'smug'],
  ['You should have kept your blade up, {hero}.', 'grim'],
  ['Velscour does not do truces. I only borrow them.', 'grim'],
  ['Right on time. Battle stations, my lovelies!', 'laugh'],
  ['Did you really think we came up here just to chat?', 'smug'],
  ['That, {hero}, is what Velscour sends when he is serious.', 'grim'],
  ['Peace was nice while it lasted. About four seconds.', 'laugh'],
  ['Hooks out! We go over the rail together!', 'angry'],
];
// the knights' last words as the hooks fly, the captains' battle cries, the farewell after the battle
export const HOOK_LINES = [
  ['Nothing personal, {hero}!', 'salute'], ['Sorry! Sorry! Orders!', 'cry'], ['HOOKS AWAY!', 'rage'], ['Catch, flagship!', 'point'],
  ['For the black sail!', 'salute'], ['I liked the bread offer, you know!', 'swoon'], ['Wheeee!', 'spin'], ['Hold fast, lads!', 'flex'],
];
export const CAPTAIN_CRIES = [
  'Over the rail, you dogs!', 'For Velscour and the black sail!', 'Let us see how the {class} dances!', 'Nobody leaves this deck!',
  'Board them! BOARD THEM!', 'This ship is ours, {hero}!', 'I will hang your boots from my mast!', 'Your sky ends here!',
];
export const FAREWELLS = [
  ['We will be back, {hero}! Probably. Maybe. Do not wait up.', 'salute'], ['The offer was nice. Really. Still no!', 'cry'],
  ['Tell Nell the fishmonger we said hello!', 'dance'], ['Next time, WE bring the bread!', 'hop'],
  ['You won this one, {class}. The sky is long!', 'salute'], ['Cut the chains! CUT THE CHAINS!', 'rage'],
];

const fill = (s, c) => s.replace(/\{(\w+)\}/g, (m, k) => (c[k] !== undefined ? c[k] : m));
const hash = (i, k) => { let h = Math.imul(i ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(k + 1, 0xc2b2ae35); h ^= h >>> 15; h = Math.imul(h, 0x27d4eb2f); return ((h ^ (h >>> 13)) >>> 0); };
const at = (bank, i, k) => bank[hash(i, k) % bank.length];

/** Talk number i (0..CONVERSATION_COUNT-1): an array of lines with the tokens filled from ctx. */
export function conversation(i, ctx = {}) {
  i = ((i % CONVERSATION_COUNT) + CONVERSATION_COUNT) % CONVERSATION_COUNT;
  const o = OPEN[i % OPEN.length], t = TALE[Math.floor(i / OPEN.length) % TALE.length], r = REFUSE[Math.floor(i / (OPEN.length * TALE.length)) % REFUSE.length];
  const line = (who, [text, act]) => ({ who, text: fill(text, ctx), act });
  return [
    line('cap', o), line('hero', at(REPLY, i, 1)), line('cap', at(INTRO, i, 2)), line('k1', t), line('hero', at(PITCH, i, 3)),
    line('k2', at(COUNTER, i, 4)), line('hero', at(SWEETEN, i, 5)), line('k1', [r[0], r[1]]), line('k2', [r[2], r[3]]),
    line('cap', at(TRUCE, i, 6)), line('hero', at(OK, i, 7)),
  ];
}
/** The captain's twist line when the flagship shows itself. */
export const twistLine = (i, ctx) => { const [text, act] = at(TWIST, i, 8); return { who: 'cap', text: fill(text, ctx), act }; };
export const fillLine = fill;

// The flagship fires on the truce with the knights still aboard: their captain leaves them under the guns. They will
// not join the hero. They fight beside the hero anyway. [k1 line, k1 act, k2 line, k2 act, hero line]
const BETRAYED = [
  ['He... left us. He LEFT us!', 'cry', 'They fired on the truce. They fired on US.', 'rage', 'Then fight with me. Just for today.'],
  ['That broadside had my NAME on it!', 'rage', 'Mine too! It was very specific!', 'point', 'Looks like you need a new ship. Want to borrow mine?'],
  ['We are not joining you. Let me be very clear.', 'salute', 'We are just going to help you stab everyone. Unrelated thing.', 'flex', 'I will take it.'],
  ['Thirty years of loyalty, and he leaves us on the enemy deck!', 'cry', 'I am revising my feelings about the cookie.', 'rage', 'Swords up. Cry later.'],
  ['Still not joining you!', 'rage', 'But nobody shoots at us and sails away!', 'rage', 'Good enough for me.'],
  ['The black sail... it fired on its own.', 'cry', 'Then the black sail can catch these blades.', 'flex', 'Stay close. Hit hard.'],
  ['Change of plans. Temporarily. Do NOT tell Velscour.', 'shrug', 'He knows. He always knows. We are SO fired.', 'faint', 'Welcome aboard. Temporarily.'],
  ['Fine! FINE! One battle! Then we are enemies again!', 'rage', 'Pinky swear on the enemies part.', 'salute', 'Deal.'],
];
export const betrayal = (i, ctx) => { const b = BETRAYED[hash(i, 9) % BETRAYED.length]; return [{ who: 'k1', text: fill(b[0], ctx), act: b[1] }, { who: 'k2', text: fill(b[2], ctx), act: b[3] }, { who: 'hero', text: fill(b[4], ctx), act: 'grim' }]; };
// the knights' battle cries beside the hero, and their leap into the captains as they come over the rail
export const ALLY_CRIES = ['Watch your left, {hero}!', 'This is NOT us joining you!', 'Ha! Take THAT, black sail!', 'Behind you! No, your OTHER behind!', 'For spite! For SPITE!',
  'Still not joining! *stab*', 'Nobody fires on a truce!', 'I am having a wonderful time and I hate it!', 'Mind the furnaces!', 'Is it always this loud with you?'];
export const CHARGE_LINES = ['Nobody shoots at us and walks away!', 'You left us under the guns, Captain!', 'RUNEBLADES! NOW!', 'Remember us? You should!', 'This one is for the truce!'];
export const HOOK_LINES2 = [['Lash her tight!', 'flex'], ['HOOKS AWAY!', 'rage'], ['Catch, flagship!', 'point'], ['You fired on US? Have a hook!', 'rage'], ['Wheeee!', 'spin'],
  ['Pull! PULL!', 'flex'], ['Nobody sails away from this!', 'salute'], ['Bring them to us!', 'rage']];
