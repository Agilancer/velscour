# Rogue: Combo Points, Stealth, three.js daggers

The 18th class (id `rogue`). A black-leather knife-fighter with short black hair (art: `assets/martialarts/`, 48 armors,
`tools/martialgear.py`). Dexterity, element Blood, a dagger in each hand (`DUAL_WIELD`, `CLASS_ARMS` in
`src/data/items.js`: she can hold nothing but daggers). She wears her own 48 helmets
(`assets/sprites/gear/helmets_martial/`, `tools/martialhelms.py`), which leave her chin bare as drawn.

## The mechanic (`src/game/rogue.js`)
- **Combo Points** (after World of Warcraft's Rogue). Builders (`cp=N` in the skill line) add N points when the cast
  first lands, once a cast however many foes or strikes; she holds 5 (6 with the Deeper Stratagem keystone). They drain
  one every 1.5 s after 10 s without a blow. Crimson diamonds over her head show them.
- **Finishers** (`fin`) spend every point: damage x (0.55 + 0.33 per point), so 0.55x with none and 2.2x with five. Some
  scale something else too: Kidney Shot's stun, Rupture's bleed, the number of shadows of Secret Technique, the daggers
  of Death from Above.
- **Stealth** (Stealth 8 s, Smoke Bomb 2.5 s): she is untargetable (`targetable = false`) and monsters drop her. Her
  next damaging cast breaks it as an **Ambush**: a sure critical (`o.sureCrit`), x1.5 damage, and a builder gains one
  more point. Shadow Dance makes every cast an Ambush while it lasts; Adrenaline Rush adds a point to every builder;
  Blade Flurry carries melee blows to two more foes for 40%.
- Blood: every melee hit and finisher draws a crimson cut line through the foe, a spray along the blow and now and then
  a pool (`bloodCut` in `src/gfx/shadowfx.js`, throttled).
- **Signature, Bloodletting** (`src/game/sigs/rogue.js`): every point spent fills the blade over her head; at 15,
  DEATHMARK: a three.js dagger falls on the toughest foe near her and daggers burst from the ground under the rest.
- **Ultimate (F), Night's Verdict** (`src/game/martialults.js`): rings of daggers close in out of the ground, steel
  rains, one colossal dagger falls on the spot.

## Skills (`src/data/skilldata.js`, `src/data/skilltrees4.js`)
| | Assassination | Subtlety | Knives | Crimson Tempest |
|---|---|---|---|---|
| Lv 1 | **Sinister Strike** (free, +1) · **Eviscerate** (finisher, granted at 1) · **Backstab** (behind the foe, sure crit, +2) | **Shadowstrike** (dash, +1) · **Stealth** · **Smoke Bomb** | **Throwing Knife** (free, +1) · **Fan of Knives** (ring of 10, +1) · **Ricochet Blade** (+1) | **Hemorrhage** (free cleave, +1) · **Crimson Tempest** (finisher nova) · **Blood Dance** (whirl, +1) |
| Lv 12 | **Rupture** (finisher bleed) · **Mutilate** (+2, poison) · **Kidney Shot** (finisher stun) | **Cheap Shot** (stun, +2) · **Shadowstep** · **Shadow Dance** | **Rain of Daggers** · **Poisoned Volley** (+1) · **Fangs of the Earth** (daggers out of the ground) | **Exsanguinate** (the bleeding burst) · **Blade Vortex** (orbit) · **Crimson Vial** (heal) |
| Lv 30 | **Envenom** (finisher nova) · **Vendetta** (buff) · **Death from Above** (finisher leap, a somersault) | **Marked for Death** (full points) · **Cloak of Shadows** · **Secret Technique** (finisher: 4 shadows + 1 a point) | **Between the Eyes** (finisher throw) · **Blade Flurry** · **Executioner's Blade** (finisher: one giant dagger from the sky) | **Thousand Cuts** · **Adrenaline Rush** · **Night of Knives** (finisher: daggers up from the ground, then 30 rain down) |

Every thrown, raining, orbiting, falling or rising dagger is the three.js model of `src/gfx/blades3d.js` (fx `dagger3`).

## Talents (`src/data/talentdata3.js`)
Assassin's Mark (bleeds, venom, Find Weakness; keystones Deeper Stratagem = a 6th point, or Crimson Harvest), Shadowcraft
(shadow novas, longer stealth, more shadows; Cheat Death or Shadow Dancer), Knifework (more daggers, bounces, wider rain;
Kingsbane = one more dagger a throw, or Red Wheel).

## Balance
`DMG_TUNE.rogue` in `src/data/classes.js`. Builders are a little under other classes' basics; a five-point finisher is
about four of its no-point self (`tools/tests/martial.js` checks the ratio). Auto-play (`focusMul` in
`src/game/autoplay.js`) builds below four points and spends at four or five.

Test: `node tools/tests/martial.js rogue` (rules, a shot of every move, auto-play), `skills.js rogue`, `signatures.js rogue`.
