# Summon Pet Animation Sheets

This art pass adds labeled animation sprite sheets for VELScour's animal companions and humanoid summons. Slime Lord summons are excluded as requested. Stationary structures (totems, turrets, banners and wards) are outside the pet animation roster.

## Frame layouts

- **Land and walking companions:** 9 frames per character: 1 rest/idle, 3 spawn, 3 run, and 2 attack frames.
- **Winged companions:** 6 frames per character: 3 wing-flap frames and 3 forward-flight frames.
- All sheets face right, use transparent backgrounds, and keep the existing dark-fantasy pixel-art palette. The added top and left labels identify each sheet and character row; frame labels are included on the sheet.

## Coverage

| Family | Summon rows |
|---|---|
| Wolves and bears | Wolf, Spirit Wolf, Dire Wolf, Storm Wolf, Bear, Spirit Bear |
| Other land creatures | Ghoul, Abomination |
| Winged birds | Hawk, Storm Hawk, Raven, Phoenix |
| Dragons (Dragoon and Dragon Knight) | Drake Whelp, Wyvern, Frost Wyrm, Elder Wyrm |
| Skeletal warriors | Skeleton Warrior, Skeletal Reaver, Skeletal Spearman, Ramskull Berserker, Chained Jailer, Coffin Guard, Bone Standard-Bearer, Gravedigger |
| Skeletal ranged and support | Skeletal Archer, Skeletal Crossbowman, Skeletal Frost Mage, Skeletal Pyromancer, Skeletal Plaguecaller, Skeletal Stormcaller, Bone Bishop, Skeletal Archlich |
| Skeletal champions | Pyre Inquisitor, Thornbone Druid, Knell Ringer, Reaper King |
| Lancer Knight Order | Squire Knight, Lance Knight, Flame Templar, Frost Warden, Storm Paladin, Knight Captain, Knight Chaplain, Grand Marshal. Knight of the Round reuses these order members. |
| Golems | Clay Golem, Blood Golem, Fire Golem, Ice Golem |
| Other humanoid allies | Death Knight, Hoplite, Squire, Captain, Ancient, Storm Ancient, Ancestral Elder, Holy Guardian |
| Other humanoid summons | Mirror Image, Chorus Singer, Coven Witch, Bone Colossus |

## Runtime integration

The builder never slices art along a line except where the source poses physically overlap: every connected piece of solid art (alpha 96+) goes whole to the frame nearest it, faint glow joins the nearest frame, and caption plaques, row names and frame numbers are erased. All frames of a character share one scale (its tallest pose fills the 128 px cell, feet on the cell floor), so crouched spawn poses and folded wings keep their true size. `catalog.json` records each rest pose's height (`restH`); `petart.js` uses it to draw the rest pose at the pet's usual height.

Summon keys now select the matching row from the compact atlases in `assets/sprites/pets/`. Land companions switch between idle, spawn, run, and lunge/attack frames; winged companions loop through wing-flap frames at rest and forward-flight frames while moving. The original labeled sheets in `assets/source/pet_animations/` remain the reviewable source art. Run `python tools/build_pet_animations.py` after changing those sheets to regenerate the runtime atlases.

`CAPTIONS` in the builder wipes caption bands whose lone digits the label filter can't tell from art (the land creatures sheet, where "SPAWN 1" left its "1" in the ghoul and bear frames). `DERIVED` makes recoloured rows of their own: `dk_ghoul.webp` is the ghoul in the Death Knight's frost palette (`frost()`: corpse-blue skin, gunmetal rags, rune-cyan eyes and mist), used by his `dkghoul` summon (Raise Ghoul, Army of the Dead), which is drawn 28 px tall (`look.h`, `Monster.petH`) and pounces on foes 2-6 tiles off (`leap` in `SUMMONS`, `Monster.tryLeap`).

Static structures, Slime Lord summons, and revived monsters keep their existing sprite rendering. The runtime mapping only covers rows created for animal companions and humanoid allies in this art pass.

## Sheet gallery

### Land animals

![Land animal companions: wolves and bears](../assets/source/pet_animations/animal_companions_land.png)

![Wolf companion motion study](../assets/source/pet_animations/wolf_companion_motion.png)

![Land creature companions](../assets/source/pet_animations/land_creature_companions.png)

### Winged pets

![Winged companions](../assets/source/pet_animations/winged_companions.png)

![Dragon companions for Dragoon and Dragon Knight](../assets/source/pet_animations/dragon_companions.png)

### Humanoid companions

![Skeletal warriors](../assets/source/pet_animations/skeletal_warriors.png)

![Skeletal ranged minions](../assets/source/pet_animations/skeletal_ranged.png)

![Skeletal support minions](../assets/source/pet_animations/skeletal_support.png)

![Skeletal guards and support](../assets/source/pet_animations/skeletal_guards.png)

![Skeletal champions](../assets/source/pet_animations/skeletal_champions.png)

![Lancer Knight Order, first group](../assets/source/pet_animations/lancer_knights_i.png)

![Lancer Knight Order, second group](../assets/source/pet_animations/lancer_knights_ii.png)

![Elemental golem companions](../assets/source/pet_animations/elemental_golems.png)

![Humanoid warrior companions](../assets/source/pet_animations/humanoid_warriors.png)

![Class summon allies](../assets/source/pet_animations/class_allies.png)

![Other humanoid companions](../assets/source/pet_animations/misc_humanoids.png)
