# Ninja: somersaults, shadows, the hook

The 19th class (id `ninja`). Hooded in black with only an eye slit (art: `assets/martialarts/`, 48 armors,
`tools/martialgear.py`; finishes only tint him, `FINISH_K` in `src/core/gearart.js`). Dexterity, element Shadow. He holds
a **katana** (weapon base `katana`) and carries **nunchaku** (off-hand base `nunchaku`) on his belt, and nothing else
(`CLASS_ARMS` in `src/data/items.js`). He wears his own 48 helmets
(`assets/sprites/gear/helmets_martial/`, `tools/martialhelms.py`).

## How he moves (`src/game/ninja.js`, `src/gfx/shadowfx.js`)
- **Somersaults.** `Creature.acro = { t, dur, spins, h, dir }` turns the hero image about the middle of his body while he
  is in the air (`Creature.drawArt`): one transform round the back layer, the image and the front layer, so the gear in
  his hands turns with him. `flip(p, dur, spins, h, dir)` starts one.
- **After-images.** `AfterImage` / `shadowTrail` leave copies of him in the pose he had (flip included), drawn by his
  own `draw` as a shadow (`Creature.tintAs`), fading.
- **Cuts.** A katana strike draws a `Crescent`; a foe he cuts gets a `CutLine` through it; dashes leave a line along
  their path.
- **Mirror Shadows.** For its time 2 shadows (3 at rank 8, 4 at rank 15, one more with Living Shadows) walk where he
  walked a moment ago and repeat every strike he makes for 20% of its damage (32% with Shadows of Substance).
- **Grappling Hook.** `hookCount(L)`: 1 foe at rank 1, one more every four ranks, 5 from rank 17. The hook (a three.js
  model on a rope) flies out, bites, and drags them to his feet stunned. A guardian or a rooted foe is too heavy: the
  rope takes him to it.
- **Signature, Zanshin** (`src/game/sigs/ninja.js`): every cut marks the foe (up to 4 each, thin lines on it); at 16
  cuts he sheathes the blade and every mark opens at once.
- **Ultimate (F), Moonless Night** (`src/game/martialults.js`): the light goes, nine shadows cross the circle in a star,
  every line opens.

## Skills (`src/data/skilldata.js`, `src/data/skilltrees4.js`)
| | Way of the Blade | Shadow Arts | Tools of War | Dragon Ninpo |
|---|---|---|---|---|
| Lv 1 | **Crescent Cut** (free; every third is a flip, +25%) · **Swallow's Flight** (a somersault through them) · **Rising Moon** (backflip, launches) | **Shadow Step** (blink) · **Mirror Shadows** · **Grappling Hook** | **Shuriken** (free, 3) · **Caltrops** · **Kunai Burst** (explode, burn) | **Nunchaku Flurry** (free, 4 blows) · **Art of the Fire Wheels** · **Thunder Step** |
| Lv 12 | **Iaido** (crosses the room; the damage lands when the blade is sheathed) · **Crossing Blades** (3 dashes) · **Heaven's Drop** (carries a foe up, turning, and slams it) | **Smoke Bomb** (vanish 2.5 s) · **Shadow Bind** · **Hook Swing** | **Windmill Shuriken** (returns) · **Backflip Scatter** (back over, caltrops, 5 shuriken) · **Blast Tags** | **Dragon Flail** · **Art of the Inferno** · **Art of the Piercing Void** |
| Lv 30 | **Flowing Water** (buff) · **Falling Petals** (cartwheel whirl) · **Hundred-Cut Reckoning** (12 cuts through the pack, then the sheathing) | **Umbral Legion** (6 shadows run foes through) · **Eclipse Veil** · **Thousand Shadows** (a star of shadows, then the dark closes) | **Storm of Steel** (spins up, 24 shuriken) · **Poison Darts** · **Demon Wind Shuriken** | **Lightning Kick** · **Ninpo Trance** · **True Dragon Technique** |

Shuriken, kunai, caltrops and the hook are three.js models (`src/gfx/blades3d.js`).

## Talents (`src/data/talentdata3.js`)
Kenjutsu (blade waves, cooldown resets, bleeding draws; Thousand-Fold Blade or Certain Death), Shadow Arts (Living Shadows,
Iron Hook, Umbral Host; Substitution or Shadows of Substance), Hidden Arsenal (more shuriken, barbed caltrops, burning
ground; Master of Arms or Dragon Heart).

## Rules every move keeps (`tools/tests/martial.js` checks them)
He ends on walkable ground, at z 0, targetable, with no channel and no flip left; a foe the hook or Heaven's Drop lifted
comes back to z 0.

Test: `node tools/tests/martial.js ninja`, `martial_closeup.js ninja`, `skills.js ninja`, `signatures.js ninja`.
