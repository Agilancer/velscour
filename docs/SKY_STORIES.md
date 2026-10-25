# Sky Battle stories

Thirty tales fought on the heroes' ironclad (docs/SKY_BATTLE.md) beside the eight weather scenarios. Each story keeps
the battle's shape (boarding waves, a mid-boss, the parley, the flagship, the hooks, two captains) but brings its own
boarders, captains, sky-knights and every spoken line, and may add a **gauntlet**: a master on the flagship who sends
boss after boss over the rail before coming over himself.

- Data: `src/data/skystories.js` (index) and `src/data/skystories/s0.js` (2 stories) ... `s4.js` (7 each).
- Engine: `src/game/skybattle.js` reads a story like a scenario (`SKY_ALL` in `src/data/skybattle.js` merges each story
  onto its `base` weather).
- Check: `node tools/tests/skystories.mjs` (no browser: art ids, archetypes, cast keys, speakers, acts, tokens, line
  lengths, unique names); `node tools/tests/skyship.js <story ids> [auto]` plays them.
- Picking: a hero who hasn't seen every story gets an unseen one 70% of the time; skull: `sky <story id>`.
- **Seen scenes play at 20x.** Every cut scene a hero has watched once (per story; the eight weathers count as one
  story) fast-forwards at 20x the next time: `G.char.skySeen`, Settings › "Don't skip cutscenes" (off by default) turns
  that off.

## A story

```js
{
  id: 'necro', name: 'The Drowned Armada', base: 'night',        // base: clear storm night fog sunset gale blizzard ash
  weather: 'Grave-Mist Night',                                   // the label on the title card ("<weather> · Depth N")
  blurb: 'One line for the portal prompt and the HOLD THE DECK card.',
  // optional: any key of a weather in data/skybattle.js to override (sky, far, mid, dark, hazard, hazardText, boats...)
  ship: 'THE WIDOW\'S BELL', shipSub: 'Once the flagship of the sky fleet. Now his.',
  crew: [ { art: 'bone_cleaver', arch: 'skeleton', swap: 'spectral' }, ... ],   // 8-14 boarders
  cast: {                                                         // every named character but the hero and the knights
    mid:  { art, arch, name, title, h, swap, voice, moves },
    capA: { ... }, capB: { ... }, master: { ... }, bossX: { ... },
  },
  mid: 'mid', finals: ['capA', 'capB'],                           // keys into cast
  knights: [ { base: 'Maeve', name: 'Sister Maeve', hue: 280 }, { base: 'Odo', name: 'Brother Odo', hue: 40 } ],  // optional
  lines: { arrive, mid, parley, twist, betrayal, hooks, second, charge, farewell, victory },
  gauntlet: { master: 'master', intro: [...], waves: [ { keys: ['bossX'], line: {...} }, ... ], finale: [...], death: [...] },  // optional
}
```

### Art
- `art`: an id from the bestiary (`src/data/bestiary.js` BESTIARY, SUMMON_ART `ns_*`, FAMILIAR_ART slimes `ea*`, `eb*`,
  `cr*`, dragons `da*`/`db*`, wolves `wf*`) or an Air Pirate (`ap_*`, `src/data/airpirates.js`). Never `de_*`, the
  Breach's art or `bs*` blue slimes.
- `arch`: the AI it plays: skeleton archer zombie ghoul imp demon spider bat slime wraith golem cultist hound eye knight
  worm shroom elemental scorpion gargoyle beetle abomination.
- `swap`: a palette swap by name (SWAPS in bestiary.js: pale ash ember frost rime venom rot tide blood flesh void abyss
  storm gilded sand shadow obsidian crystal thorn infernal verdigris amethyst coral bronze bone spectral bile midnight
  rust) or null. A swapped Air Pirate captain is a new character.
- `h`: height in world px (the hero is 60; captains ~86-94; a huge boss up to 200). Crew default to their art's height.
- `voice`: the pitch of the syllable blips (0.4 deep - 1.4 shrill). `moves`: 1-3 of crew hook leap barrage storm smoke
  (climb, swing and rappel come with every captain).

### What happens, and which lines play there
1. **Arrival.** Title card (`name`, `weather`); the hero steps out of the gate: `arrive` (a string, the hero).
2. **Waves 1-3.** Boats lie alongside to port; the `crew` leap the rail.
3. **Mid-boss.** `cast[mid]` comes in on a gasbag; its card (name, title); it shouts `mid` (a string) and swings over.
4. **Waves 4-5.**
5. **Parley.** A gasbag under a white flag docks. `finals[0]` (the line speaker `cap`) and the two knights hop aboard
   and stand facing the hero. `parley`: 8-14 lines between `hero`, `cap`, `k1`, `k2` only.
6. **The flagship.** She pushes out of a cloud bank, card `ship` / `shipSub`; her first broadside bursts short.
   `twist`: 1-3 lines (`cap`, or the gauntlet's master, who stands at her rail). Then the captain leaps back to the
   gasbag and flees to her, and a broadside lands beside the knights (they collapse).
7. **The knights turn.** `betrayal`: 2-4 lines (`k1`, `k2`, `hero`): left under the guns, they fight beside the hero
   (they never "join").
8. **The duel.** She closes trading broadsides; boarders drop over.
9. **Hooks.** Each knight runs to the rail and throws a grappling hook: `hooks` = [[k1 text, act], [k2 text, act]].
   `finals[1]` shouts `second` (a string) from her rail; both captains come over. The knights leap at them shouting
   `charge` = [k1 text, k2 text].
10. **The last fight** against the two captains.
11. **Gauntlet** (optional). The master at the flagship's rail: `intro` lines. Each wave: its `line` plays, then its
    bosses (`keys`, 1-2 cast keys) come over the rail and must fall before the next wave. Then `finale` lines, the
    master's card, and he leaps over: the final fight. When he falls: `death` lines.
12. **Victory.** The chains are cut; the knights' `farewell` = [[k1 text, act], [k2 text, act]], then they leap onto
    the flagship, which sinks into the clouds. The gate turns blue, the hoard chest rises, the hero says `victory`.

### Lines
`{ who, text, act }`. `who`: `hero`, `k1`, `k2`, `cap` (= `finals[0]`) or any cast key whose character is on screen
then (on the deck, or the master at the flagship's rail). `act`: for the hero and the cast: calm grim laugh angry smug
shock; for the knights: laugh cry rage flex dance spin salute swoon faint hop point shrug bow thinking attack. Tokens:
`{hero}` (the hero's name), `{class}`, `{k1}` `{k2}` (the knights' names), `{@key}` (a cast member's name). At most
150 characters a line (two lines of the panel on a phone).
