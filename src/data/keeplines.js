// What your heroes say to you and to each other in Tessariel's Keep (game/keepfolk.js; docs/TESSARIELS_KEEP.md).
// Short and sweet. Fields: {me} the speaker, {mcls} their class; {you} and {ycls} the hero you play; {other} and
// {ocls} the one they talk to; {lvl}/{ylvl}/{olvl} levels; {depth}/{ydepth}/{odepth} deepest depths; {kills} theirs.

// a companion to the hero you play, when you come near
export const GREETS = [
  'Ah, {you}. The Flame said you\'d be back.', '{you}! Depth {ydepth} now? I heard.', 'Mind the third stair, {you}. It wobbles.',
  'Back from the deep, {you}? You smell of it.', 'Level {ylvl}, {you}. Don\'t let it go to your head.', 'The Castellan has been asking for you.',
  'If you see the Fiend, tell him {me} says hello.', 'I kept your seat by the Flame, {you}.', 'A {ycls} and a {mcls}. The Fiend should worry.',
  'You look tired, {you}. Kneel at the Flame. It helps.', 'Still hunting him, {you}? Good.', 'They\'re carving a new trophy. Yours, I think.',
  '{you}, have you seen my other glove? No? Never mind.', 'Depth {ydepth} for you, {depth} for me. We keep going.', 'You walk like a {ycls}, {you}.',
  'The Embers are piling up, {you}. Spend them.', 'Sit a while, {you}. The deep will keep.', 'Did you bring anything back for the hall?',
  'Brother Cael says the Flame burns brighter when you\'re here.', 'Look at the banners, {you}. We earned those.',
];
// a companion alone, at a place in the hall: where -> lines
export const MUSINGS = {
  flame: ['Green fire. It doesn\'t burn the hand.', 'Ember that falls... and gets back up.', 'I can hear it hum, if I\'m quiet.', 'It was a star, once. Now it\'s ours.', 'Warm. Even on the worst nights.'],
  trophy: ['I remember this one. Barely survived it.', 'Who polished this? It gleams.', 'A good shield. A better story.', 'One day, a trophy of mine.', 'Dents and all. Good.'],
  dragon: ['The old gods. Glad they\'re only carved.', 'Its eyes follow you. I checked.', 'Four teeth of the Hollow Star.', 'They say it flew once. I don\'t want to know.'],
  window: ['The angels win, in this one.', 'Look at the light come through it.', 'Every pane a battle. Every battle won.', 'I\'d like to be in a window one day.'],
  chronicle: ['Depth {depth}. Write it big.', 'Our names, in Mother Agatha\'s hand.', 'Somebody beat my time. Who?', 'The Chronicle never lies. Sadly.'],
  balcony: ['You can see the whole hall from here.', 'Mind the rail. Long way down.', 'The best view in the keep.', 'Quiet up here.'],
  hall: ['Smells of wax and iron.', 'Home. Of a sort.', 'Too quiet. I miss the screaming.', 'I should mend my boots.', 'One more descent. Then sleep.', 'Kills: {kills}. Not that I\'m counting.'],
};
// two companions talking: scripts of [speaker 0|1, line] taken in turn
export const CHATS = [
  [[0, 'How deep did you get, {other}?'], [1, 'Depth {depth}. You?'], [0, 'Depth {depth}.']],
  [[0, 'Your armour\'s dented, {other}.'], [1, 'Your face is dented.'], [0, 'Fair.']],
  [[0, 'Do you think the Fiend sleeps?'], [1, 'I think he waits.'], [0, 'Same thing, for a demon.']],
  [[0, 'I heard {you} broke a BOSS ROOM\'s lord alone.'], [1, '{you} does everything alone.'], [0, 'Not everything. We\'re here.']],
  [[0, 'A {ocls}. I never understood your kind.'], [1, 'And yet you keep asking me for help.'], [0, '...Fair.']],
  [[0, 'The green fire was a star, Agatha says.'], [1, 'Then what are we?'], [0, 'Sparks off it, maybe.']],
  [[0, 'Race you to the balcony.'], [1, 'In this armour? No.']],
  [[0, 'Level {lvl}. You, {other}?'], [1, 'Level {lvl}.'], [0, 'Hm. Not bad, for a {ocls}.']],
  [[0, 'What did you bring back this time?'], [1, 'A cough. Three teeth. Not mine.'], [0, 'Nice.']],
  [[0, 'Kestrel says we\'re too loud in the hall.'], [1, 'Kestrel says a lot of things.'], [0, 'LOUDLY.']],
  [[0, 'Ever seen the Breach, {other}?'], [1, 'Once. Floating rock, purple sky, things with too many eyes.'], [0, 'Sounds lovely.']],
  [[0, 'Who hung that banner crooked?'], [1, 'It\'s straight. You\'re crooked.']],
  [[0, 'Do you pray, {other}?'], [1, 'To the Flame? Before every descent.'], [0, 'Does it answer?'], [1, 'I keep coming back. That\'s an answer.']],
  [[0, 'The Castellan gave me a Saga.'], [1, 'Which one?'], [0, 'The long one.'], [1, 'They\'re all the long one.']],
  [[0, 'I spent all my Embers on gloves.'], [1, 'Good gloves?'], [0, 'Legendary.'], [1, 'Then it was worth it.']],
  [[0, 'Depth {depth}, {other}. Catch up.'], [1, 'I\'m pacing myself.'], [0, 'For what?'], [1, 'For the throne.']],
  [[0, 'The War Table wants me in the Wilds again.'], [1, 'Pilgrims?'], [0, 'Pilgrims. Always pilgrims.']],
  [[0, 'You fight like a {ocls}.'], [1, 'I AM a {ocls}.'], [0, 'And it shows.']],
  [[0, 'I dreamt of the Hollow Star.'], [1, 'Don\'t. It dreams back.']],
  [[0, 'Brother Cael feeds the Flame with what?'], [1, 'Prayers and lamp oil.'], [0, 'Mostly lamp oil, I bet.']],
  [[0, 'Have you seen {you}\'s trophies?'], [1, 'Hard to miss. They\'re everywhere.'], [0, 'Jealous?'], [1, 'Deeply.']],
  [[0, 'Tell me a story, {other}.'], [1, 'Once there was a Fiend. We\'re going to kill him.'], [0, 'Good story.']],
  [[0, 'I count {kills} kills.'], [1, 'Who\'s counting?'], [0, 'I am. Clearly.']],
];
// a line or two that is each class's own (said now and then, alone or to the hero)
export const CLASS_LINES = {
  paladin: ['The Light holds. So do I.', 'My hammer needs a blessing. Or a whetstone.'],
  ranger: ['Three arrows left. Enough.', 'The phoenix is restless tonight.'],
  wizard: ['Mind the sparks. Mostly.', 'I left a fireball in the oven.'],
  necromancer: ['The dead are polite here. I like it.', 'Don\'t mind the bones. They\'re friends.'],
  barbarian: ['RAAAGH. Sorry. Habit.', 'Too many stairs. Not enough axes.'],
  dragoon: ['Highest point in the keep? The tower. I\'ve checked.', 'I jumped from the balcony once. Once.'],
  totem_master: ['The great totem dreams of the forest.', 'The spirits approve of this place.'],
  death_knight: ['My blade hums near the Flame. It doesn\'t like it.', 'Cold, even by the fire.'],
  arcane_sorcerer: ['The stars over the keep are crooked tonight.', 'The Conjunction is near. Or I\'m hungry.'],
  carrion_witch: ['The crows won\'t come in. Rude.', 'Everything here smells of candles. Disgusting.'],
  bard: ['This hall has wonderful echo.', 'I\'m writing a song about you. It\'s mostly rhymes with "Fiend".'],
  slime_lord: ['Squelch. That\'s hello.', 'Blue is the Flame\'s colour too, you know. Nearly.'],
  boomerang_knight: ['It always comes back. So do I.', 'Duck. Habit.'],
  lancer: ['My banner should hang in this hall.', 'The shields spin better here. Holy air.'],
  dragon_knight: ['The carved dragons don\'t scare me. Much.', 'I speak a little dragon. They swear a lot.'],
  gunner: ['Powder\'s dry. Good.', 'The biplane needs a hangar. Just saying.'],
  monk: ['Breathe. The deep can wait one breath.', 'A quiet hall. Good for the form.'],
  rogue: ['Nobody saw me come in. Good.', 'Four combo points and nothing to spend them on.'],
  ninja: ['The shadows here are honest.', 'I counted the rafters. There are none.'],
};
// the Castellan, now and then, and when the hero has rewards waiting
export const CASTELLAN_LINES = ['The Flame keeps us. We keep the Flame.', 'Every trophy in this hall was paid for in blood.', 'The board has new bounties at dawn.',
  'Bring me deeds, hero. I\'ll bring you Embers.', 'Kneel at the Flame before you go down.'];
export const CASTELLAN_OWED = ['Your rewards are waiting, {you}.', 'Come, {you}. The Chronicle has new lines for you.', 'Embers for the deeds you\'ve done, {you}. Come claim them.'];
// the keep's own folk, when the hero speaks to them (game/keepfolk.js)
export const FOLK_LINES = {
  'Brother Cael': ['The Flame wants oil, prayers and company. Mostly oil.', 'Kneel a while. It burns kinder for it.', 'Hearth and Hall, hero: bring the keep what the deep gives up.'],
  'Ser Cassius': ['Every fifth depth a lord sits a stolen throne. Bring me their crowns.', 'The Hollow Crowns: I keep count. You keep breaking them.', 'Steady on the stair, hero.'],
  'Kestrel': ['The free towns send their thanks, and their troubles.', 'Best view in the keep, up here.', 'The Free Towns Saga is mine. Ask the Castellan.'],
  'Mother Agatha': ['The Chronicle remembers every depth you clear.', 'Saints of the Deep, child: walk the old shrines.', 'Your times are written here. Beat them.'],
  'Halvard': ['Some doors never close. Someone has to stand at them.', 'The Endless Watch waits for the deep ones.', 'Cold out there. Colder down there.'],
};
