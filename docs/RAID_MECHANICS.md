# Raid mechanics: a design reference from modern WoW raids

Research notes on World of Warcraft raid boss mechanics from The War Within (Nerub-ar Palace, Liberation of
Undermine, Manaforge Omega) and Midnight (Season 1: The Voidspire, The Dreamrift, March on Quel'Danas; Season 2:
The Venomous Abyss; 12.1.5: The Unbinding of Kith'ix), rewritten for VELSCOUR's solo isometric fights: one hero,
some pets, no tank or healer. Read it with `src/game/raid.js`, `raidsigs.js` and `castleraids.js`.

**Baselines used for the numbers.** The hero walks 4.2 tiles/s and has a 0.3 tile body. The BOSS ROOM is 30 x 26 tiles
with cut corners (`ARENA_W/H` in `src/world/dungeon.js`). The `Telegraph` kinds that exist now are `circle`, `cone`
and `line`, with radii of 1.4 to 3.4 tiles and 0.6 to 3.2 s wind-ups. Damage is given as a % of the hero's max
life after mitigation at the depth the fight is tuned for. "Lethal" means 100%+. A hero escapes a circle of radius
R centred on him in about R / 4.2 s, plus a 0.35 s reaction allowance. That gives the rule
**wind-up >= 0.35 + (R + 0.5) / 4.2 s**: 1.0 s for R = 2, 1.6 s for R = 4.5.

**How WoW telegraphs.** There are four layers, and a solo game needs all four:
1. **Cast bar** with the ability name. Big or lethal casts run 3-6 s (Gallywix's Total Destruction!!! is a long
   channel; Midnight Falls' Light Siphon gives 22 s).
2. **Ground art**: circles that fill, cones, arrows that show where you will be launched (Raging Crosswinds), and lines
   with a glowing leading edge (Rolling Acid).
3. **Body tells**: Ula'tek pulls one wing back before Caustic Waves, and Vorasius' Void Breath comes from one hand.
4. **Personal debuff timers**: 6-15 s countdowns on marked players (Queensbane 10 s, Null Consumption 6 s,
   Venomous Surge 10 s).

The cadence is a **timeline loop**. Bosses run fixed rotations, mostly on an energy bar where 100 energy fires the
big ability or intermission, and the loop repeats with more stacks each lap. Sszorak runs two loops, then an
intermission. Rasha'nan jumps at 100 energy. Gallywix enters an intermission at 100 energy. Health thresholds
(Nek'zali 50%, Loom'ithar 55%, Kith'ix 25%) end a stage.

Note: the Midnight 12.x encounters (Season 1, Venomous Abyss, Kith'ix) are described from guides fetched in
November 2026. Treat their exact numbers as approximate.

---

## 1. Mechanic catalogue (40)

Each entry gives **WoW**: where the mechanic comes from and how it works there. **ARPG** then covers the ground
telegraph, how the hero answers it, what failure costs, and the suggested numbers.

### Soaks and shared damage
**M01 Split soak.** *WoW:* Araz's Arcane Obliteration and Ula'tek's Serpent's Bite are circles whose damage falls with
each extra player inside. Left alone, a circle becomes raid-wide damage (Calcified Corpse for Serpent's Bite).
*ARPG:* A gold circle fills over 2.5 s. The hero stands in it, and pets inside count as half a soaker each.
Soaked, it deals 30% / (1 + 0.5 x pets). Unsoaked, it pulses 70% across the whole arena and stuns for 1 s. R 1.6.

**M02 Soak with a vulnerability brand.** *WoW:* Sszorak's Mutilate puts Mutilated Gash on its soakers (+500% from the next
Mutilate), so two groups alternate. Dimensius' Darkened Sky shockwaves stack +300% for 3 s. *ARPG:* Two soak circles
land 2 s apart. Soaking the first brands the hero (+300% from the second). The hero takes one and sends a pet, totem or
summoned decoy into the other, or leaves the second unsoaked and takes its 35% pulse. Brand 3 s, circles R 1.4.

**M03 Mine field with a spacing rule.** *WoW:* Lockenstock's Foot-Blasters leave mines that must be popped. Each pop gives
a 2 s debuff, and the next pop within it deals +200%. *ARPG:* Four glowing caps spawn and arm in 12 s, and an armed cap
explodes for 50% arena-wide. Stepping on one costs 12%. A second pop within 2 s costs 36%. The hero paces them
around the room, which keeps him moving. Cap R 0.6.

**M04 Intercept the beam.** *WoW:* Belo'ren's Infused Quills fire a beam at a random player that hits the first body in its path
after 6 s, so a matching-colour player steps in. Mug'Zee's Double Whammy Shot is a line the tank soaks. *ARPG:*
A thin line runs from the boss to a pet or a fragile altar and thickens over 2.5 s. The hero steps into it and takes
25%. If he doesn't, the pet dies or the altar breaks and the boss heals 5%. Line width 0.8.

**M05 Colour attunement.** *WoW:* Belo'ren gives each player a Light or Void Feather. Matching damage is halved, and Radiant
Echoes popped by the wrong colour deal heavy damage. "Never get hit by anything that's the opposite colour." *ARPG:*
The hero's aura flips gold or violet on a 4 s cast with a swirl of the new colour. Hazards of his colour deal 25% damage.
Opposite-colour hazards deal 200% and apply Dissonance (-30% damage for 6 s). The swap happens every 20-25 s.

**M06 Sanctuary stack.** *WoW:* Dimensius' Devour pulls everyone in unless they stand in a Collective Gravity zone made by
Excess Mass carriers. In Rasha'nan's Web Reave, the raid soaks a circle to weaken a grip. *ARPG:* The boss gathers a 4 s
inhale with a spiralling dust ring, and one sigil circle (R 2) lights up. Inside the sigil the pull is ignored.
Outside it, the hero is dragged toward the maw at 3 tiles/s and dies on contact. Later casts shrink the sigil.

### Spreads, drops and placement
**M07 Drop a pool (marked carrier).** *WoW:* Sszorak's Venomous Surge (10 s, then a Viscous Cyst left where the player
stood), Plexus Sentinel's Manifest Matrices (dropped traps) and Ula'tek's Coiling Ichor (walk to the edge and let it
expire). *ARPG:* A ring follows the hero for 5 s with a ticking rim. On expiry it drops a pool that lasts 60-120 s and
deals 8%/s. The hero places it at the wall. Pools taking space is the fight's soft enrage. R 1.5.

**M08 Pools as tools.** *WoW:* Sszorak's cysts go opposite the active wind tunnels. Howling Maelstrom blows the raid
into a cyst, and its knockback throws them back to safety. Ansurek's Abyssal Infusion portals are placed one in the
middle and one at the edge. *ARPG:* The dropped object is needed later. A brazier dropped now is the only cover from the
next breath, and a cyst dropped now cancels the next gale. Show a faint ghost of where the next "use" will happen.

**M09 Chain-blast spread.** *WoW:* Fractillus' Null Consumption ticks 6 s and then explodes for 10 yards. Ky'veza's Queensbane
(10 s) bursts and sprays orbs. *ARPG:* The hero is marked, and every pet within 2 tiles when it ends takes 60% and passes
the mark on. Pets need a "scatter" order, or the hero walks away from them. Hero takes 15%. R 2.

**M10 Seed the add spawn.** *WoW:* Nek'zali's Essence Rend leaves a dispellable DoT, and a Latent Cultist spawns where it ends.
That cultist moves around the well in Phase 2, so placement matters later. *ARPG:* A debuff counts down 6 s and shows a
small skull icon on the ground under the hero. The add spawns there and leaves a 40% slow patch. The hero chooses a
corner. Spawning in the boss's walking path hurts later.

### Frontals, beams and lines
**M11 Frontal cone.** *WoW:* Sszorak's Ravage, Salhadaar's Vanquish (with knockback, harder each cast) and Mug'Zee's Stormfury Finger
Gun. *ARPG:* A red cone with a bright edge, 5 tiles long and 70 degrees wide. The answer is a side-step or a dodge-roll
behind the boss. A hit deals 45% and knocks back 3 tiles. Wind-up 1.0 s, or 0.8 s from Stage 3. Never aim it at a pet.

**M12 Shuffled combo string.** *WoW:* Sszorak's Apex Predator is five cone attacks in a random order (Ravage x2, Mutilate x2,
Tempest). *ARPG:* Three to five glyphs appear over the boss's head (cone, ring, slam) and light up in order, 0.7 s
apart. The hero reads the next glyph, not the whole string. Each hit deals 25-35%. This tests reading, not reflexes.

**M13 Rotating beams.** *WoW:* Bloodbound Horror's Spewing Hemorrhage (a lethal laser sweeping counter-clockwise; blinks
pass through it), Gallywix's Radiant Electricity (three rotating lines that ranged can outrange) and Midnight Falls'
Dark Quasar (random direction). *ARPG:* 1-3 beams from the boss sweep at 30-45 degrees/s and are shown 1.5 s ahead as
faint lines. The hero walks with the sweep, stays outside the beams' reach of 12 tiles, or dashes through. Contact deals 60% and
stuns 1 s.

**M14 One-sided breath.** *WoW:* Vorasius' Void Breath comes from one hand. Read the hand and run the other way. Breaking both
side walls first gives the most room. *ARPG:* The boss raises the glowing left or right claw for 2.5 s, then a half-arena
breath sweeps that side. A hit deals 90%. Clearing debris first (M15) opens the safe half.

**M15 Walls the boss builds.** *WoW:* Fractillus' Entropic Conjunction fires shockwaves that raise crystal walls on six pins,
and six walls on one pin enrages him. Shattering Backhand knocks players into walls to break them. Vorasius' Shadowclaw
Slam raises walls that Blistercreep explosions shatter. *ARPG:* Each slam aimed at the hero raises a crystal wall in
the lane behind him. The hero chooses the lane. Walls block movement and line of sight. Kiting a burst add (M17) into a
wall breaks it. Four walls in one lane = cataclysm.

**M16 Steer the beam into a target.** *WoW:* Midnight Falls' Galvanize beams must strike rotating Void Cores, and hitting
cores on opposite sides cancels Cosmic Fission's pull. Salhadaar's Starkiller Swing must hit a different Dark
Star each time. *ARPG:* A beam is tethered from the boss to the hero for 3 s. The hero stands so the line crosses a
crystal pylon, which charges or breaks it. If it misses, the beam hits the hero for 40%. This doubles as a way to break
M37 shields.

**M17 Ricochet blades.** *WoW:* Midnight Falls' Heaven's Glaives spin outward, rebound off walls and weaken the longer they fly.
Imperator Averzian's Oblivion's Wrath spikes fire in the direction they face. *ARPG:* 4-8 spinning blades with
facing arrows bounce off walls and pillars up to 2 times, dealing 30%, then 20%, then 10%. Pillars become hazards
as well as cover.

### Adds and objects
**M18 Marchers to the well.** *WoW:* Nek'zali's Restless Amani march to the Soulcoil Well, and each arrival gives her 5
energy plus raid damage. Bloodbound Horror's Blood Horrors that reach the boss wipe the raid. Ansurek's Gloom
Hatchlings empower her by 20%. *ARPG:* 3-6 slow adds (1.6 tiles/s) leave the walls, and a dotted trail shows their
route. Each arrival grants +10% boss damage for 20 s or 10 energy. The hero kills, slows or knocks them back.

**M19 Keyed shield.** *WoW:* Crown of the Cosmos' Undying Sentinels cannot die until a Silverstrike Arrow hits them, and a
second hit resets their stacks. Nek'zali's Amani have a shield that only magic damage removes. *ARPG:* The add wears a
chain-shaped immunity. The boss periodically marks the hero, and a 2 s line then fires from the boss through the hero
and beyond. The hero lines the shot up through the add to strip the shield. A shield left up gains 10 energy/s, and
an add at 100 energy one-shots.

**M20 Claim the board.** *WoW:* Imperator Averzian runs tic-tac-toe. Voidshapers claim tiles, three claimed in a line
enrages him, and he takes 90% less damage near a claimed tile. Dropping the Umbral Collapse soak on a Voidshaper kills it.
*ARPG:* The arena floor is a 3 x 3 grid of 6-tile squares. Each round, 2-3 casters start a 10 s claim. The hero kills
them, or drags a soak circle (M01) onto one. Three in a row triggers a lethal cataclysm.

**M21 Kill them together.** *WoW:* The Twin Fangs' Uncoiled Wrath gives the survivor +25% damage every 4 s, without limit. Crown of the
Cosmos' Voidlink makes Alleria and the Rift Simulacrum share health. *ARPG:* Two bosses with linked bars. When one
dies, the other's damage rises +20% every 3 s. Keep them within 15% of each other. Cleaving both is rewarded.

**M22 Egg before rebirth.** *WoW:* Belo'ren's Ember turns into an egg that revives in 15 s unless it is killed. Belo'ren's own
Rebirth makes him a 30 s egg whose health equals his own, and he comes back stronger each time. *ARPG:* A killed add
leaves a pulsing egg, and a 10 s ring counts down to its rebirth. The boss can become an egg at 0% "life" two times
before the true kill, with a soft enrage of -10% hero healing for each rebirth.

**M23 Carry the item.** *WoW:* Gallywix's Charged Giga Bombs are carried to a Giga Coil to end the intermission. Dimensius' Excess Mass
lets its holder resist Devour. Midnight Falls' Dawn Crystals are torches that make a 12-yard safe zone. Ula'tek's eggs are
walked into the Cauldron. *ARPG:* An item drops. Holding it slows the hero 25% and ticks 2%/s, and it blocks skills
(or only basic attacks). He delivers it to the marked socket. Some items are light sources (M33). Hold limit 12 s.

**M24 Ride the rolling thing.** *WoW:* Stix Bunkjunker's Rolling Rubbish puts up to 5 players on balls that can only be steered.
The balls grow by eating piles, a large ball destroys Doomsplosives, and a ball crashing into the boss makes the adds it
carried take +100% damage. *ARPG:* The hero is put inside a rolling ossuary wheel or bell for 12 s and can only
steer it (turn rate 120 degrees/s, 5 tiles/s). Rolling over bone piles grows the wheel. Ramming the boss deals 2% of
his life per size and stuns him 2 s. Hitting a bomb add ends the ride (35%).

### Debuffs and stacks
**M25 Stacks that need a pet to take over.** *WoW:* Tank-swap busters: Ravage (+400% for 25 s), Fractillus' Shockwave Slam (500% for 55 s),
Stix's Demolish (+100% for 50 s) and Averzian's Blackening Wounds (-4% max life per stack). *ARPG:* The boss's heavy
swings stack Sundered on the hero (+15% damage taken per stack, 20 s). At 4 stacks, a "taunt window" glyph appears.
If a pet or summoned decoy holds the boss for 6 s, the stacks fall off. Classes without pets get a cleansing font
(M31).

**M26 Permanent venom, removed only by risk.** *WoW:* The Twin Fangs' Eternal Venom never expires, 10 stacks kill, and only
being struck by Ithraz's Ravenous Feast removes a stack. *ARPG:* Stacks come from waves, splashes and spit (each
stack is -3% max life). The only cure is to stand in the boss's telegraphed "feast" bite, which deals 30% and
removes 2 stacks. The hero chooses when to pay the price.

**M27 Tether: snap it or bear it.** *WoW:* Ula'tek's Grasping Fangs (snap in pairs, because every snap hits both sides),
Crown of the Cosmos' Aspect of the End (moving 30 yards away triggers Gravity Collapse and +300% physical damage
taken) and Rasha'nan's Spinneret's Strands. *ARPG:* A chain runs from the hero to an anchor stake. It drains 2%/s and
grows a 10%/s healing cut. Walking 6 tiles away snaps it for a 25% burst and a 6 s vulnerability. Snap it between
boss slams, not during one.

**M28 Memory order.** *WoW:* Midnight Falls' Death's Dirge marks five players in a random order. A clockwise laser must hit them in
that order, and getting it wrong causes Dissonance, usually a wipe. *ARPG:* Four rune plates around the arena flash in
an order (0.6 s each, played on a bell tone). The hero steps on them in that order within 10 s. Each correct plate
gives Resonance (+5% damage). A wrong plate deals 50% and restarts the sequence once. Then the boss casts the big spell.

### Movement and positioning
**M29 Pull toward a lethal centre.** *WoW:* Ansurek's Wrest grips players inward and Devour kills anyone too close. Midnight
Falls' Total Eclipse drags the raid toward the Darkwell. Araz's Dark Singularity pull grows stronger. Ky'veza's Nether
Rifts cancel each other when placed close together. *ARPG:* A pull of 2.5-3.5 tiles/s toward a maw (R 1.5, lethal).
The hero walks out at an effective 1-1.5 tiles/s. A dash or blink breaks free. Two maws placed on opposite sides
cancel each other.

**M30 Ride the knockback over the wave.** *WoW:* Ansurek's Reactive Toxin blobs knock the raid airborne over Venom
Nova, and if no blob is popped she enrages. Sszorak's Raging Crosswinds launch players along arrows, and two floating
players colliding fall safely. *ARPG:* A ring wave of venom rolls out from the boss. A green blob on the floor launches
the hero 4 tiles when he touches it, clearing the wave. Touching it too early (more than 1.2 s before the wave arrives)
lands him in the wave. The wave deals 70%.

**M31 Pads and portals.** *WoW:* Ansurek's Abyssal Conduits let players skip Frothing Gluttony, but they explode after use
and each spawn raises Dreadful Presence. Plexus Sentinel's Phase Blink passes through the energy wall. *ARPG:* Two
linked circles on the floor. Stepping in teleports the hero and gives him 1 s of immunity. Each pad works once and then
bursts (15%, R 1.2). Pads are the answer to a full-room wave (M32).

**M32 Sweeping wave with gaps.** *WoW:* Ula'tek's Caustic Waves (she pulls back one wing to telegraph; from Phase 3 the
waves have gaps), Ansurek's Frothing Gluttony (rolling in from the outside) and the Twin Fangs' Stir the Depths (dodge
between green waves). *ARPG:* A wall of venom, water or bone crosses the arena edge to edge at 3 tiles/s, with 1-2 gaps
2 tiles wide marked by bright foam. A hit deals 50% and knocks the hero down, prone for 1 s.

**M33 Light in the dark.** *WoW:* Midnight Falls' Torchbearer: outside a crystal holder's 12-yard light, damage climbs and
movement slows 30%. Ky'veza's Starless Night darkens the room for 24 s. *ARPG:* The arena goes dark, and the hero's light shrinks
to 2 tiles. Damage climbs 3%/s outside a lit brazier (R 3) or a carried lantern (M23). Monsters hidden in the dark
show only their eyes and life bars.

**M34 Maze intermission.** *WoW:* Plexus Sentinel's Arcanomatrix Sieve throws the raid far away. They navigate radiation
circles, old traps and spinning beams, Phase Blink through the energy wall (Atomize if not), then kill the shield. Each
maze is longer. *ARPG:* The hero is blown to the arena edge and the boss shields up. He walks a path of safe tiles through
slow fields and 1-2 sweeping beams, using one blink charge on a ward line. 20-25 s, then the shield breaks for 25 s of +50%
damage taken. Getting stuck deals 10%/s, so make sure the maze can always be solved.

### Platforms and arena changes
**M35 Platform break.** *WoW:* Ula'tek's Circling Prey destroys the melee platform (lethal within 13 yards), and the
platform shatters into four pieces. Gallywix's coils, hit by two bombs, electrify part of the room for good. *ARPG:*
One arena sector (a quarter, or the ring around the boss) glows with cracks for 5 s and then falls into the void
(lethal). Three breaks per fight, never more than half the floor, and the last break is the hard enrage.

**M36 Covered slices and a glide out.** *WoW:* Crown of the Cosmos' Devouring Cosmos covers the current slice. Dark Rush feathers
at the edge grant 12 s of glide to the next slice, and three casts cover the platform (hard enrage). Volatile Fissures
split the room, and crossing one gives a stacking DoT. *ARPG:* The arena is cut into 3 wedges by glowing fissures
(crossing deals 8% and gives a 12 s DoT). Every 60 s the hero's wedge fills with a void pool, and a pickup at the edge
gives 4 s of fast, hazard-immune movement to the next wedge.

**M37 Shrinking ring with breakable gaps.** *WoW:* Loom'ithar's Lair Weaving is a closing silk ring that roots for 8 s. Infused
Tangles are shielded until a tank's Piercing Strand breaks them, opening a gap. Midnight Falls' Iris of Oblivion: leaving
the circle is lethal. *ARPG:* A ring of thorns, chains or webbing closes from R 13 to R 6 over 30 s. Touching it roots
the hero 2 s and deals 15%. 3-4 knots on the ring are shielded, and a boss line attack (M16) or a pet breaks a knot to open
a 3-tile gap that stays open.

**M38 The boss changes platforms.** *WoW:* Rasha'nan jumps sides at 100 energy, and each landing's Acidic Eruption grows +100% until
it is interrupted. Ansurek's Phase 2 runs across three mini platforms joined by crystal bridges. In Dimensius' flying
intermission, Umbral Gates refresh the flight buff. *ARPG:* The boss leaps to a far balcony and begins a ramping cast
there (+50% per cast). The hero crosses a bridge that appears on a timer, past one add, and interrupts it with any hit
after landing. Arriving late deals a 20% arena pulse each time.

### Enrage and burn windows
**M39 Break the shield or die.** *WoW:* Gallywix's Total Destruction!!! at 50%: a shield, then an interrupt before the cast ends,
or the raid wipes. Ansurek's Predation shield ends the intermission. Midnight Falls' Safeguard Prism matrices restore
shield stacks. *ARPG:* The boss raises a ward equal to 10-12 s of the hero's expected damage and begins a 15 s channel. Breaking
the ward makes the next hit an interrupt that stuns him 3 s. A finished channel deals 150%. Pets add damage, but never
let their damage alone be enough.

**M40 Energy and stack enrages, plus burn windows.** *WoW:* Nek'zali's Uncoiled Rage triggers at 100 energy. Ansurek's
Dreadful Presence rises +12% each time portals spawn, and at 4 stacks she triggers Cataclysmic Evolution. Belo'ren's
Ashen Benediction is -10% healing per rebirth. The Twin Fangs' third Submerge brings Caustic Rain. Each bad phase is
answered by a window: Dimensius' Destabilized (+50% damage taken for 15 s), Sszorak's Dig In (+30% for 25 s), Ula'tek's
Venomous Heart (+100% for 20 s) and Araz (+100% for 12 s). *ARPG:* Show one visible ramp (a boss bar, a stack counter
or rising water) and pair every survival test with a vulnerable window of 10-20 s at +50-100% damage taken. Keep the
existing 3-min frenzy / 5-min execute in `raid.js` as the backstop.

---

## 2. Ten boss scripts

Each script uses the catalogue numbers. **S1/S2/S3** are stages, **I** is an intermission, and percentages are boss life.
Times are the loop cadence in seconds. Every stage adds at most one new mechanic to the ones before.

**1. Archivist Morvane, the Librarian Lich.** The arena is a reading hall with four shelf lanes and a central lectern.
- S1 (100-70%), a 30 s loop: Page Storm frontals (M11) at 0/10/20 s. Silencing Index (M07): the hero drops ink pools,
  and the shelves are the place for them. Errata pages (M18) fly to the lectern, and each arrival gives +10% damage.
- I (70%), Closed Stacks (M34): the hero is thrown into the shelf maze, with a reading-lamp beam sweeping it and one
  blink across the ward. At the far end he breaks the lich's phylactery ward (M39).
- S2 (70-35%): Shelving (M15). Each Tome Slam raises a bookcase wall in the hero's lane, and four in a lane cause a
  cataclysm. Exploding Marginalia adds break walls. Recitation (M28): four rune plates in order.
- S3 (35-0%), Burning Library (M35): a quarter of the floor collapses every 45 s. Page Storm keeps going, plus
  Recitation. The last collapse is the enrage.

**2. Mother Ilse, the Drowned Conservatory Matron.** The arena is a glasshouse with a flooded centre and four planters.
- S1 (100-65%): Tidal Sweep (M32), a wave with two foam gaps that she telegraphs by raising her trowel arm.
  Seed Pods (M22): eggs that sprout in 10 s if no venom touches them. Spore Tether (M27).
- I (65%), High Water (M29 + M31): water drags the hero toward the drowned drain, and lily pads (M31) are safe
  stepping stones out of it.
- S2 (65-30%): the glass panes crack, and one planter sector shatters every 40 s (M35). Pollen Brand split soaks (M02).
  Pods must be carried to the compost cauldron (M23).
- S3 (30-0%): Verdant Heart exposed for 20 s at +100% (M40), followed by a final flood. Waves now arrive in pairs.

**3. Brother Tollund, the Bell-Ringer.** The arena is a belfry with three hanging bells, rope pulls and a split floor.
- S1 (100-70%): Toll (M01), the hero soaks under a ringing bell, or the whole tower takes 70%. Aftershock rings
  (M13 as expanding rings) after every strike.
- S2 (70-40%): Peal (M28), where the bells ring in an order and the hero pulls the ropes in that order. Tolling Pull
  (M29) toward the great bell's mouth.
- I (40%): the boss climbs the bell (M38) and starts a ramping Death Knell. The hero climbs the stairs to cut the rope.
- S3 (40-0%): Belfry Collapse, where the floor planks fall in thirds (M35). Bells come loose and roll (M24, the hero can
  ride one into him for a 2 s stun). Toll soaks come twice as often.

**4. The Crier in Black, Lord Velscour's Herald.** The arena is a throne-hall antechamber with banners and a long carpet lane.
- S1 (100-70%): Proclamation (M12), a combo string of 3-5 edict glyphs: cone, ring, march. Summons to Court
  (M09): marked spread that passes onto pets.
- S2 (70-40%): Heralds Multiplied (Ky'veza): untargetable echoes copy his rifts (M29). Two rifts that cancel are the
  safe zone. The Banner March (M32) sweeps the carpet lane.
- I (40%), Reading of the Decree (M39): a 15 s channel behind a ward, and a finished channel deals 150%.
- S3 (40-0%), Velscour's Gaze (M33): the hall goes dark, and the hero carries the lantern dropped by the herald's page
  (M23). Proclamations speed up by 20%.

**5. Brother Gutter and Sister Spout, the Twin Gargoyles.** The arena is the cathedral roof, with a gutter channel through the middle.
- S1 (100-0% shared, M21): Gutter stacks Sundered on the hero (M25), and a pet must hold him for 6 s. Spout's Rainspew
  waves (M32). Lichen Venom stacks (M26) are cured only by Gutter's telegraphed Stone Bite.
- I (every 100 energy), Submerge: the two dive into the gutter and swap sides, leaving slicks (+30% damage taken).
  Then Rainspew and Hailstones fall together for 14 s.
- Enrage: the third Submerge brings a roof-wide downpour. The survivor's +20% every 3 s keeps the two bars together.

**6. The Organist of the Black Chapel.** The arena is a choir with ranks of pipes along the back wall.
- S1 (100-65%): Chord Attunement (M05), with the hero gold or violet. Pipe Blasts are colour-coded lines. Matching
  Echo orbs must be popped (M05).
- S2 (65-30%): three rotating Fugue beams from the pipes (M13). A mark aims the Pedal Note beam so it hits a cracked
  pipe (M16), and three broken pipes end the stage.
- I (30%), Requiem (M39): a ward plus a 15 s channel.
- S3 (30-0%): Crescendo rotates 15% faster, attunement swaps every 15 s, and there is a +50% burn window after each Requiem.

**7. Old Kennelmaster Harrow.** The arena is the kennel yard, with cages along the walls.
- S1 (100-70%): Loose the Hounds (M18): hounds run for the feeding trough, and each one that arrives frenzies him.
  Iron Muzzle Gaol: the hero soaks a cage circle and must kill the gaoler add to get out (Mug'Zee's Earthshaker Gaol).
- S2 (70-35%): Rolling Feed Barrel (M24). The hero steers it to crush hounds and rams Harrow for a stun. Bait Lines
  (M04): a line aimed at the pet that the hero must intercept.
- S3 (35-0%): Kennels Opened. Cages along one wall burst every 40 s, and that strip becomes a hound run (M36 without the glide).
  Muzzle Gaol and Hounds happen together.

**8. The Rack-Saint of the Oubliette.** The arena is a dungeon floor of iron trapdoors over a pit.
- S1 (100-70%): Chains of Penance (M27): tethered to a rack stake, snapped between whip combos (M12). Thumbscrew
  brand split soaks (M02).
- S2 (70-40%): Trapdoors (M35 at small scale). 2 x 2 tile doors open for 6 s in a checkered pattern, telegraphed 2 s
  ahead with rattling bolts. Confessor adds have keyed shields (M19).
- I (40%): the hero is dropped into the oubliette maze (M34) and climbs back up the chain.
- S3 (40-0%), Iron Maiden: a pull toward the open maiden (M29), and two counter-maidens cancel it. The +100% Exposed Heart
  window opens after each one.

**9. The Seneschal of the Hours.** The arena is a great clock face, with a 3 x 3 inlaid grid and two iron hands.
- S1 (100-65%): Claim the Hours (M20): cog-wraiths claim squares, and three in a row means Midnight Strikes (a wipe).
  Drag the Pendulum soak (M01) onto a wraith to kill it.
- S2 (65-30%): Clock Hands (M13): the hour and minute hands sweep at different speeds, and blinking through costs a
  charge. Escapement walls (M15) form on the hero's lane.
- I (30%), Stopped Time: the arena greys out, the hero has 10 s to reach three gears in order (M28) and restarts the clock.
- S3 (30-0%): the face shrinks inward (M37) and the hands speed up 20%. Enrage at the second Stopped Time.

**10. The Bride of Ash, the burnt-ballroom revenant.** The arena is a ballroom dance floor with mirrors and a ruined chandelier.
- S1 (100-0%, phoenix form): Waltz Dives, where a soak circle (M01) leaves a widening ember pool. Ember Suitor adds become
  eggs (M22). Mirror Partners: glaive fans that bounce off the mirrors (M17).
- S2 (at 0%), Rebirth: she becomes an ash egg for 25 s with her life as its health. The chandelier falls in the centre
  (stay off it, M35 lite), and cones of her colour are safe (M05). Killing the egg wins the fight.
- Loop: S1 then S2, up to three times. Each rebirth gives the hero -10% healing and adds a second dive (M40).

---

## 3. Design rules

**Telegraph clarity**
- Every damaging ability shows two of the four tells: cast bar, ground art, body tell and sound. Lethal abilities show
  all four. Keep one consistent colour language: red = dodge out, gold = stand in, violet/void = lethal, green = poison
  pools, and white arrows = forced movement.
- Ground art fills from the edge inward. A full circle means it lands now. Make the rim brighter than the fill so it
  stays readable over gibs, spell effects and dark biomes (see the see-through outlines in `seethrough.js`).
- Use the wind-up rule from the top of this file. Never shorten a wind-up below 0.6 s, even on the last stage.
  Make it harder with overlap and pace, not shorter tells.
- Personal marks need a ring on the hero **and** an icon on the HUD, with a countdown in whole seconds.

**Fairness**
- Every fail state is something the hero saw coming at least one telegraph earlier. Lethal mechanics (M14, M29, M35,
  M39) never come from a random proc.
- A wipe mechanic lets the hero make one mistake. The first unsoaked circle or wrong rune costs 50-70%, and only the
  second one kills.
- Always leave a safe path. Mazes, rings and waves have a gap the pathfinder can find. Test this the way `mobs.js`
  checks reachability.
- Pool placement (M07) gets an edge strip of 3 tiles that the boss never targets, so placing pools well is always possible.

**Scaling for one hero**
- WoW splits the roles: the tank takes busters, the healers fix raid damage and the DPS soak. The solo hero does all
  three, so cut the steady background damage (WoW's 2 s raid ticks) to 1-2%/s at most. Let positioning carry the
  difficulty.
- Soak counts become "hero = 1, pet = 0.5". Tank swaps become pet taunt windows or fonts (M25). Interrupts become
  "any hit after the ward breaks".
- Pets should help but never be required. Every mechanic that uses a pet (M02, M04, M09, M25) needs a second answer:
  a totem, a decoy, a font, or accepting a smaller penalty.
- Auto-play (`src/game/autoplay.js`) has to read each mechanic. Give each telegraph a machine-readable `kind` and
  `answer` ('out', 'in', 'carry', 'order', 'gap') and a target point, the way `reach` is passed for lines in `raid.js`.
- Tune by depth with `depthLevel()`. Keep the % of life values fixed and scale only the number of things on the floor
  and the loop speed.

**Avoiding unreadable overlap**
- **One movement verb at a time.** Never stack two forced movements (pull + wave + tether snap). A loop has one
  "move" beat, one "stand" beat and one "kill" beat.
- **Lanes in time.** Schedule abilities on a timeline with 2.5 s of silence after any lethal one. Combo strings (M12)
  and rotating beams (M13) do not overlap.
- **Budget the screen.** At most 3 active ground telegraphs plus persistent pools, and at most 8 add bodies. Cap pools by
  fading the oldest one out.
- **Escalate within a lap, reset between laps.** Each loop adds stacks (M40). Each new stage drops one old mechanic for
  every new one it adds.
- **Mobile.** At 844 x 390, tiles are small. Make radii at least 1.2 tiles and keep cone edges thick. Every timer must be
  readable without a cast bar, through rim fill and sound.

---

## 4. Sources

Fetched or searched in November 2026. Icy Veins returned HTTP 403 to automated fetching, so its pages are listed from
search results only.

Nerub-ar Palace
- https://www.method.gg/guides/nerubar-palace/queen-ansurek-heroic
- https://icy-veins.com/wow/queen-ansurek-raid-guide-in-nerub-ar-palace
- https://www.method.gg/guides/nerubar-palace/rashanan-heroic
- https://www.method.gg/guides/nerubar-palace/nexus-princess-kyveza-heroic
- https://www.method.gg/guides/nerubar-palace/the-bloodbound-horror-heroic
- https://warcraft.wiki.gg/wiki/Nerub-ar_Palace

Liberation of Undermine
- https://method.gg/guides/liberation-of-undermine/chrome-king-gallywix-heroic
- https://warcraft.wiki.gg/wiki/Chrome_King_Gallywix
- https://www.method.gg/guides/liberation-of-undermine/stix-bunkjunker-heroic
- https://www.method.gg/guides/liberation-of-undermine/sprocketmonger-lockenstock-heroic
- https://www.method.gg/guides/liberation-of-undermine/the-one-armed-bandit-heroic
- https://www.method.gg/guides/liberation-of-undermine/mugzee-heads-of-security-heroic

Manaforge Omega
- https://www.method.gg/guides/manaforge-omega/dimensius-the-all-devouring-heroic
- https://www.icy-veins.com/wow/dimensius-raid-guide-in-manaforge-omega
- https://warcraft.wiki.gg/wiki/Dimensius,_the_All-Devouring
- https://www.method.gg/guides/manaforge-omega/fractillus-heroic
- https://www.method.gg/guides/manaforge-omega/plexus-sentinel-heroic
- https://www.method.gg/guides/manaforge-omega/loomithar-heroic
- https://www.method.gg/guides/manaforge-omega/forgeweaver-araz-heroic
- https://www.method.gg/guides/manaforge-omega/nexus-king-salhadaar-heroic

Midnight Season 1 (Voidspire, Dreamrift, March on Quel'Danas)
- https://worldofwarcraft.blizzard.com/en-us/news/24223664 (Blizzard: three new raids in Midnight)
- https://news.blizzard.com/en-us/article/24264416/march-on-quel-danas-raid-finder-and-story-mode-now-live
- https://www.wowhead.com/news=380447/midnight-season-1-raid-overview-and-schedule
- https://www.method.gg/guides/the-voidspire/crown-of-the-cosmos-heroic
- https://www.method.gg/guides/the-voidspire/imperator-averzian-heroic
- https://www.method.gg/guides/the-voidspire/vorasius-heroic
- https://www.method.gg/guides/march-on-queldanas/midnight-falls-heroic
- https://www.method.gg/guides/march-on-queldanas/beloren-child-of-alar-heroic

Midnight Season 2 (The Venomous Abyss) and 12.1.5 (The Unbinding of Kith'ix)
- https://warcraft.wiki.gg/wiki/The_Venomous_Abyss
- https://www.method.gg/guides/the-venomous-abyss/nekzali-the-soulcoiler-heroic
- https://www.method.gg/guides/the-venomous-abyss/the-twin-fangs-heroic
- https://www.method.gg/guides/the-venomous-abyss/sszorak-heroic
- https://www.method.gg/guides/the-venomous-abyss/ulatek-heroic
- https://www.wowhead.com/news=382291/the-venomous-abyss-raid-preview-and-schedule-story-mode-delayed-one-week
- https://www.icy-veins.com/wow/kithix-raid-guide
- https://wow.gg/guides/the-unbinding-of-kithix
- https://www.wowhead.com/news=382728/midnight-patch-12-1-5-revealed-labyrinths-and-new-1-boss-raid

Not reached: YouTube transcripts weren't fetched, and Raider.IO had no mechanics write-ups in search results. Method's
Dreamrift (Chimaerus) guide URL returned 404, so Chimaerus isn't covered.
