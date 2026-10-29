# VELSCOUR DEFENSE: story bible

The cast, the eight regions and the 80 stages are data: `defense/src/data/cast.js` (the Bastion Sixteen, with voice
notes), `defense/src/data/campaign.js` (`REGIONS`, `LEVELS`: names and one-line situations). Who leads each of the
320 dialogs is `defense/docs/dialog_schedule.json`, made by `node defense/tools/dialog_schedule.mjs`. The dialogs
themselves are `defense/src/data/dialogs/part1.js` .. `part4.js` (stages 1-20, 21-40, 41-60, 61-80).

## Premise
Velscour, the Demon Lord who waits at Depth 500 beneath Herrington Hollow (the main game), has torn a **Riftgate**
open on the surface: a huge blue-black wound in the air at the edge of the Hollow. His horde pours out of it in
waves. Sixteen heroes, **the Bastion Sixteen**, answer the call of **the Commander** (the player: never named, never
speaks, addressed as "Commander"). The Commander fights from **the Bastion**, a field fortress around a glowing
**Bastion Heart**. Every monster that reaches the Heart cracks it; if it breaks, the stage is lost. The heroes are
deployed onto **posts** beside and on the roads the horde must walk: fighters hold the road and block, shooters and
casters take the high posts.

**Rift cards.** The Riftgate leaks *Rift Cards*: echoes of heroes, weapons, armour and relics from every timeline
Velscour has touched. The Commander draws them at the **Summoning Altar** (the game's packs; there is no money in this,
only Soul Shards won in battle). The Sixteen know about this and have opinions ("There is a card of me with a better
helmet. I want it destroyed.").

**Rule of the world:** the battle levels-ups the Commander buys during a stage (Valor) fade when the stage ends; what is
learned and forged at the Bastion between stages stays. Heroes may mention this ("the rift's strength never lasts past
the fight").

## Arc by region (keep continuity with it)
1. **Herrington Outskirts (1-10).** The company assembles. Corwin is uneasy that Varric is here at all; Brakka and Gloop
   are a comedy act; Jasper starts *The Ballad of the Bastion* and keeps revising it; Wren keeps a kill tally. Boss: the
   Horned Warlord, Velscour's vanguard champion. Afterwards they find the rift's roots run under the Hollow.
2. **The Catacomb Breach (11-20).** Mortimer guides them through the catacombs and greets the dead politely; Maudlin
   gossips and haggles; Flint worries his bombs will bring the roof down, Ismene wants to set things on fire anyway.
   Stage 19: the tomb of Mortimer's old teacher, **Master Ebon Sallow**, has been broken open from below. Boss: the King
   Below the Floor, a vast worm. They learn the Candle King is gathering the dead at the Ashen Cathedral.
3. **The Ashen Cathedral (21-30).** The Dawn Order's burned cathedral, where Corwin and Varric took their vows together
   at the font. Varric admits the Runeblade still whispers to him in Velscour's voice. Selene's code of honour; Jasper vs.
   the dead choir. Boss: the Candle King. Afterwards Varric says he fell to the whisper at Frostfang Pass.
4. **Frostfang Pass (31-40).** Halvard's Hanging Monastery (stage 36: he says one full, long sentence, the most he says
   in the whole campaign); Kestrel learns patience from him; Cassius reads dark omens; stage 38, the Knight's Cairn: Varric
   faces where he fell; the blade whispers "Velscour waits." Boss: the Frost Leviathan. From the summit they see a
   sandstorm in the south: more of the horde, coming out of the Sea of Sand.
5. **The Sea of Sand (41-50).** Flint's old salvage rig, the Rusted Dredge, and his lost crew (stage 46); Selene and Flint
   talk trajectories; Brakka hates sand; over the Tomb of the Sun Kings Cassius finds the stars wrong, and they point
   to the Dark Forest. Boss: the Grave-Star Colossus.
6. **The Dark Forest (51-60).** Wren's home woods, rotting; Nkemi's spirits are frightened; stage 56, Maudlin's old hut (she
   is embarrassed by the decor); Gloop finds the damp delightful. Boss: the Sleeper in the Roots, the fungal thing
   poisoning the forest. Then a messenger crow: Ironcrown Castle is besieged.
7. **The Siege of Ironcrown (61-70).** Ysolde and her dragon spirit Cinder; the Kestrel/Ysolde rivalry turns into respect;
   stage 68, an embassy from Gloop's lost slime kingdom (led by his cousin, **Duke Wobblesworth**) asks him to come home
   and be king again; he chooses the company. Halvard holds the throne stair. Boss: the Black Throne Engine. The company
   decides to go through the Riftgate itself.
8. **Beyond the Riftgate (71-80).** Through the gate; Mortimer frees souls from the chains; Nkemi speaks to the spirits of the
   Abyss; stage 76, the Mirror of Varric: Varric faces what he was and Corwin calls him brother again; stage 78 they
   build the Last Bastion inside the Abyss. Final boss: the Wound Without End, the Avatar of Velscour that holds the rift
   open. Epilogue (stage 80's end dialogs): the Avatar breaks, but Velscour laughs from below: he still waits at Depth
   500. The Riftgate shrinks to a blue-black portal at the edge of Herrington Hollow, and the Sixteen agree to keep
   watching it.

## Writing rules for the dialogs
- 320 dialogs; each stage has 2 at its **beginning** (what lies ahead: the place, the horde, worries, plans) and 2 at its
  **end** (what just happened, aftermath, banter, what comes next). Boss stages are dramatic.
- The schedule fixes each dialog's `lead` (speaks first) and `with` (must speak at least once). A third hero may chime in
  with at most one line.
- 2 to 5 lines a dialog, each line at most 180 characters. Speaker ids are the cast ids (`corwin`, `wren`, ...).
- Each hero sounds like their voice note. Halvard says very little (often one short line). Gloop says "We". Ysolde
  argues with Cinder. Jasper rhymes sometimes. Maudlin talks to her crows. Mortimer thanks his skeletons.
- Mention the Commander now and then. Mention concrete things from the stage's situation line. No modern slang, no
  profanity worse than "damn". Humour and drama both; don't repeat a joke.
- Optional third element per line: a mood, one of `angry`, `laugh`, `sad`, `shout`, `fear`, `smug`, `think`.
