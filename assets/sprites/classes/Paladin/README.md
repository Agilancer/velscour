# Paladin — labeled artwork draft

Generated with the built-in imagegen tool. This pack is a visual-development draft, not a validated game-ready animation pack.

## Contents

- 60 named armor designs across six rarities, with attack and casting pose sequences.
- 60 equipment designs total: 42 weapons and 18 shields.
- 60 helmet designs.
- 60 ability-effect sequences, six stages each.
- Right-facing Paladin direction; lean grimdark anime styling.

## Selected sheets

- [paladin_common_armor_labeled](paladin_common_armor_labeled.png)
- [paladin_uncommon_armor_labeled](paladin_uncommon_armor_labeled.png)
- [paladin_rare_armor_labeled](paladin_rare_armor_labeled.png)
- [paladin_epic_armor_labeled](paladin_epic_armor_labeled.png)
- [paladin_legendary_armor_labeled](paladin_legendary_armor_labeled.png)
- [paladin_mythic_armor_grid_v2](paladin_mythic_armor_grid_v2.png)
- [paladin_weapons_shields_labels_v3](paladin_weapons_shields_labels_v3.png)
- [paladin_helmets_labels_v2](paladin_helmets_labels_v2.png)
- [paladin_common_abilities_labeled](paladin_common_abilities_labeled.png)
- [paladin_uncommon_abilities_labeled](paladin_uncommon_abilities_labeled.png)
- [paladin_rare_abilities_labeled](paladin_rare_abilities_labeled.png)
- [paladin_epic_abilities_labeled](paladin_epic_abilities_labeled.png)
- [paladin_legendary_abilities_labeled](paladin_legendary_abilities_labeled.png)
- [paladin_mythic_abilities_labeled](paladin_mythic_abilities_labeled.png)

## Known issues and remaining production work

The image generator did not reliably produce a fixed native pixel grid, perfectly uniform cells, or registered attachment points. These sheets are not ready for automatic grid slicing or drop-in equipment compositing. Their pixel density and silhouette details need further art cleanup to meet the requested low-resolution style consistently. Armor proportions and head/hand placement drift between frames and outfits. Weapon and helmet sheets are separate item art, not per-frame fitted overlays. Attack/cast sequences are illustrated poses, not playback-validated animations. No running/idle/hit/death animation sets or engine integration are included.

The legendary armor sheet retains an extra pose/duplicated CAST1 column. The mythic sheet's column headers are not fully aligned with the poses. Several weapon IDs remain misprinted after correction attempts: Moon Scimitar should be W22, Martyr Axe W34, and Inquisitor Blade W37. The catalog below is authoritative. All items have visible name labels in the selected sheets, but generated typography should be proofread during cleanup.

PNG files contain alpha transparency; sampled background pixels included alpha 0 and near-zero residual alpha. Complete matte cleanup and VFX edge validation have not been performed. Labels are embedded in margins and must be excluded when extracting game sprites.

## Intended animation convention

Armor: ATK1 ready, ATK2 draw-back, ATK3 windup, ATK4 strike, ATK5 follow-through, ATK6 recovery. CAST1 rest, CAST2 raise hand, CAST3 gather, CAST4 extend, CAST5 release, CAST6 recover. This is the design specification, not a claim that all generated frames satisfy it.

Ability effects: 1 start, 2 gather, 3 release, 4 peak, 5 decay, 6 fade.

## Future roster note

Slime Lord should be blue and have more humanoid features. No other class was generated in this pass.

## Exact asset catalog

### Common armor

| ID | Name | Design |
|---|---|---|
| P01 | Ragged Pilgrim | patched charcoal gambeson and rope belt |
| P02 | Rust Lamellar | rusty narrow lamellar with torn brown waistcloth |
| P03 | Soot Chapel | battered iron breastplate over soot-grey pilgrim robes |
| P04 | Scrap Sentinel | asymmetrical scrap-steel shoulder and burgundy surcoat |
| P05 | Bone Tabard | chainmail with bone-white ragged tabard |
| P06 | Road Brigand | riveted leather brigandine and split olive skirt |
| P07 | Black Rivet | blackened studded jack with wrapped greaves |
| P08 | Tin Votary | dull tin scale-mail and frayed blue sash |
| P09 | Prayer Cuirass | worn ribbed cuirass with tan prayer strips |
| P10 | Ringmail Exile | patched ringmail with ragged long dark clerical coat |

### Uncommon armor

| ID | Name | Design |
|---|---|---|
| P11 | Wayfarer Brigandine | long split leather coat with diagonal iron plates |
| P12 | Iron Penitent | narrow rusted rib-cage cuirass and rope prayer knots |
| P13 | Chapel Watch | faded moss tabard over short chain sleeves |
| P14 | Thornbound Mail | thorn-shaped iron lamellae and wrapped shins |
| P15 | Grave Road Warden | asymmetric weathered shoulder mantle and slim breastplate |
| P16 | Cinder Acolyte | charcoal quilted robe with copper elbow plates |
| P17 | Votive Guard | beeswax-yellow prayer strips and studded mail |
| P18 | Ashen Hospitaller | bone-white split medical surcoat and black arm guards |
| P19 | Tollkeeper Harness | brown knee-length brigandine with squared small steel scales |
| P20 | Oathbound Exile | faded blue scarf and angular salvaged steel |

### Rare armor

| ID | Name | Design |
|---|---|---|
| P21 | Raven Chapel | raven-feather short mantle and thin black plate |
| P22 | Sepulcher Guard | vertical tomb-like fluted grey cuirass |
| P23 | Moonlit Vow | crescent silver plates and dark indigo split robe |
| P24 | Crimson Litany | blood-red narrow tabard with crossed iron breast straps |
| P25 | Wolfsbane Sentinel | serrated small steel shoulders and grey fur collar |
| P26 | Drowned Reliquary | verdigris chain skirt and oxidized long bronze chestguard |
| P27 | Gallows Saint | noose-knot cord harness over battered long plate |
| P28 | Pale Confessor | ivory ribbed light armor and severe clerical stole |
| P29 | Black Rose Oath | thorn-etched black vambraces and rose-maroon split coat |
| P30 | Censer Knight | tiny hanging brass censers and charcoal scale cuirass |

### Epic armor

| ID | Name | Design |
|---|---|---|
| P31 | Eclipse Justiciar | overlapping black crescent plates with pale gold seams |
| P32 | Thorn Martyr | elongated thorn steel breastplate and ragged wine fabric |
| P33 | Ossuary Regent | bone-rib chest armor and narrow dark steel greaves |
| P34 | Storm Vesper | sharp blue-grey flutes and long storm cloak scraps |
| P35 | Sable Seraph | small skeletal wing-shaped shoulder fins and feather hem |
| P36 | Furnace Templar | charred copper plates with restrained ember cracks |
| P37 | Veilbreaker | silver mask medallions on a narrow chain stole |
| P38 | Violet Inquisitor | deep violet split cassock with asymmetrical steel pauldron |
| P39 | Bleeding Sun | sunburst punctured cuirass and bloodstained ivory cloth |
| P40 | Hollow Basilica | architectural gothic arch chest plates and black draped sash |

### Legendary armor

| ID | Name | Design |
|---|---|---|
| P41 | Saint of Ash | ashen ivory ceramic armor with black scorch veins and thin gold cords |
| P42 | Last Cathedral | slender cathedral-spire steel shoulder and long narrow tabard |
| P43 | Kingless Oath | shattered crown motifs on black iron chest and burgundy coat |
| P44 | Wound of Dawn | narrow gilt fractured cuirass with white bandage wrappings |
| P45 | Gravebell Sovereign | small bronze bells along battered funerary plate |
| P46 | Fallen Halo | broken halo filigree collar and silver-black scale armor |
| P47 | Obsidian Covenant | razor obsidian plates with bone-white oath ribbons |
| P48 | Winter Confession | frost-grey articulated plate over long black clerical robe |
| P49 | Lion of Cinders | small leonine brass chest relief and ragged ember cloak |
| P50 | Pallbearer of Stars | midnight mail with restrained star-silver studs and torn mourning sash |

### Mythic armor

| ID | Name | Design |
|---|---|---|
| P51 | Godless Benediction | split holy/unholy narrow ivory and abyss-black plates with torn scripture |
| P52 | End of All Suns | black sun disc chest motif with thin copper eclipse edges |
| P53 | Saint Beyond Death | pale bone filigree exoskeleton armor over ghost-grey robes |
| P54 | Crown of Thorns | thorn lattice breastplate with crimson hanging prayer cloth |
| P55 | Abyssal Absolution | deep midnight jagged armor with subtle cold cyan hairline seams |
| P56 | First Flame Martyr | charcoal-gold charred armor with tiny red ember vents |
| P57 | Eternal Funeral | tall narrow mourning collar with grave-silver chain and long black split coat |
| P58 | Heaven in Ruins | broken marble-white arch plates with dull gold ruin fragments |
| P59 | Blood of the Covenant | dark garnet enamel narrow cuirass with blood-red twisted cords |
| P60 | Final Amen | severe matte black perfectly slender gothic armor with single pale gold vertical vow line |

### Weapons and shields

| Rarity | ID and name |
|---|---|
| Common | W01 Nail Sword |
| Common | W02 Rust Sabre |
| Common | W03 Chapel Mace |
| Common | W04 Split Axe |
| Common | W05 Pilgrim Spear |
| Common | W06 Iron Flail |
| Common | W07 Knotted Club |
| Common | W08 Plank Buckler |
| Common | W09 Hide Roundshield |
| Common | W10 Scrap Kite |
| Uncommon | W11 Votive Blade |
| Uncommon | W12 Hook Falchion |
| Uncommon | W13 Bell Hammer |
| Uncommon | W14 Thorn Axe |
| Uncommon | W15 Vigil Lance |
| Uncommon | W16 Censer Flail |
| Uncommon | W17 Copper Estoc |
| Uncommon | W18 Rivet Buckler |
| Uncommon | W19 Chapel Heater |
| Uncommon | W20 Road Pavise |
| Rare | W21 Raven Edge |
| Rare | W22 Moon Scimitar |
| Rare | W23 Ossuary Mace |
| Rare | W24 Gallows Cleaver |
| Rare | W25 Tide Trident |
| Rare | W26 Litany Flail |
| Rare | W27 Wolf Glaive |
| Rare | W28 Bone Buckler |
| Rare | W29 Rose Kite |
| Rare | W30 Mourning Shield |
| Epic | W31 Eclipse Sword |
| Epic | W32 Veil Rapier |
| Epic | W33 Furnace Maul |
| Epic | W34 Martyr Axe |
| Epic | W35 Storm Halberd |
| Epic | W36 Sable Scourge |
| Epic | W37 Inquisitor Blade |
| Epic | W38 Censer Ward |
| Epic | W39 Basilica Shield |
| Epic | W40 Bleeding Aegis |
| Legendary | W41 Ash Saint Blade |
| Legendary | W42 Kingless Sword |
| Legendary | W43 Gravebell Hammer |
| Legendary | W44 Dawn Reaver |
| Legendary | W45 Winter Pike |
| Legendary | W46 Halo Flail |
| Legendary | W47 Cinder Falchion |
| Legendary | W48 Obsidian Ward |
| Legendary | W49 Cathedral Shield |
| Legendary | W50 Star Pall |
| Mythic | W51 Godless Edge |
| Mythic | W52 Last Sun Sword |
| Mythic | W53 Funeral Hammer |
| Mythic | W54 Thorn Executioner |
| Mythic | W55 Abyss Spear |
| Mythic | W56 Covenant Scourge |
| Mythic | W57 Final Amen |
| Mythic | W58 Heaven Shard |
| Mythic | W59 Eternal Aegis |
| Mythic | W60 Worldend Ward |

### Helmets

| Rarity | ID and name |
|---|---|
| Common | H01 Iron Cap |
| Common | H02 Rust Sallet |
| Common | H03 Mail Coif |
| Common | H04 Pilgrim Hood |
| Common | H05 Split Nasal |
| Common | H06 Leather Skullcap |
| Common | H07 Dent Bascinet |
| Common | H08 Chapel Kettle |
| Common | H09 Wrapped Helm |
| Common | H10 Rivet Mask |
| Uncommon | H11 Votive Visor |
| Uncommon | H12 Thorn Coif |
| Uncommon | H13 Road Sallet |
| Uncommon | H14 Copper Beak |
| Uncommon | H15 Vigil Hood |
| Uncommon | H16 Penitent Mask |
| Uncommon | H17 Ring Aventail |
| Uncommon | H18 Ashen Cap |
| Uncommon | H19 Bell Guard |
| Uncommon | H20 Exile Armet |
| Rare | H21 Raven Helm |
| Rare | H22 Sepulcher Mask |
| Rare | H23 Moon Visor |
| Rare | H24 Crimson Coif |
| Rare | H25 Wolf Sallet |
| Rare | H26 Drowned Crown |
| Rare | H27 Gallows Hood |
| Rare | H28 Pale Confessor |
| Rare | H29 Rose Bascinet |
| Rare | H30 Censer Helm |
| Epic | H31 Eclipse Armet |
| Epic | H32 Martyr Visor |
| Epic | H33 Ossuary Crown |
| Epic | H34 Storm Beak |
| Epic | H35 Sable Helm |
| Epic | H36 Furnace Mask |
| Epic | H37 Veil Visor |
| Epic | H38 Violet Hood |
| Epic | H39 Bleeding Sun |
| Epic | H40 Basilica Helm |
| Legendary | H41 Ash Saint |
| Legendary | H42 Cathedral Spire |
| Legendary | H43 Kingless Crown |
| Legendary | H44 Dawn Visor |
| Legendary | H45 Gravebell Helm |
| Legendary | H46 Fallen Halo |
| Legendary | H47 Obsidian Mask |
| Legendary | H48 Winter Confessor |
| Legendary | H49 Cinder Lion |
| Legendary | H50 Star Mourner |
| Mythic | H51 Godless Crown |
| Mythic | H52 Sunless Visor |
| Mythic | H53 Deathless Saint |
| Mythic | H54 Thorn Crown |
| Mythic | H55 Abyss Mask |
| Mythic | H56 First Flame |
| Mythic | H57 Funeral Mitre |
| Mythic | H58 Ruined Heaven |
| Mythic | H59 Blood Covenant |
| Mythic | H60 Final Amen |

### Ability effects

| Rarity | ID and name | Effect |
|---|---|---|
| Common | F01 Votive Spark | tiny ivory ember gathering then popping |
| Common | F02 Iron Smite | short dirty-gold angular slash impact |
| Common | F03 Dust Step | grey ground dust kick |
| Common | F04 Candle Bolt | small candle-orange dart moves right |
| Common | F05 Prayer Ring | thin ivory ellipse expands on floor |
| Common | F06 Buckler Flash | small dull silver semicircle flickers |
| Common | F07 Mercy Mote | pale green motes spiral upward |
| Common | F08 Cinder Tap | tiny red cinder impact |
| Common | F09 Oath Mark | simple gold cross-like vow rune writes then fades |
| Common | F10 Purge Puff | bone-white smoke curls and dissolves |
| Uncommon | F11 Thorn Lash | gold-brown thorn whip snaps right |
| Uncommon | F12 Chapel Ward | small gothic arch shield forms and breaks |
| Uncommon | F13 Bell Pulse | bronze concentric isometric ground ellipses expand |
| Uncommon | F14 Pilgrim Dash | low dusty grey streak surges right |
| Uncommon | F15 Litany Bolt | three ivory prayer fragments fly right |
| Uncommon | F16 Ember Seal | orange angular seal ignites on floor |
| Uncommon | F17 Chain Rebuke | silver chain shoots right and retracts |
| Uncommon | F18 Mending Wisp | muted green wisps gather upward |
| Uncommon | F19 Vigil Spark | small blue-white star ignites and sheds sparks |
| Uncommon | F20 Censer Breath | desaturated incense cone rolls right |
| Rare | F21 Raven Judgment | black feather crescent sweeps right |
| Rare | F22 Moon Cleave | pale blue narrow crescent slash |
| Rare | F23 Grave Light | thin ivory flame rises from ground |
| Rare | F24 Crimson Vow | blood-red angular ring pulses |
| Rare | F25 Wolf Verdict | silver fang-shaped impact burst |
| Rare | F26 Tide Absolution | cold turquoise splash sweeps right |
| Rare | F27 Gallows Bind | grey spectral cords tighten |
| Rare | F28 Confessor Halo | pale broken halo assembles and dissolves |
| Rare | F29 Rose Thorns | dark crimson thorn ring erupts |
| Rare | F30 Reliquary Beam | narrow pale gold beam fires right |
| Epic | F31 Eclipse Smite | black center with fine gold eclipse flare |
| Epic | F32 Martyr Spikes | ivory thorns rise in ground fan |
| Epic | F33 Bone Benediction | bone-white ribs form protective arc |
| Epic | F34 Storm Litany | violet-white jagged lightning forks right |
| Epic | F35 Sable Wings | black spectral feather arcs unfold |
| Epic | F36 Furnace Wrath | red-orange cinder wave erupts right |
| Epic | F37 Veil Rupture | thin silver vertical tear opens and shuts |
| Epic | F38 Inquisitor Brand | purple blade-shaped glyph stamps down |
| Epic | F39 Bleeding Dawn | red sun disk sheds narrow golden rays |
| Epic | F40 Basilica Ward | ghostly small gothic arch rises then shatters |
| Legendary | F41 Ash Ascension | ivory fire rises amid charcoal ash |
| Legendary | F42 Cathedral Fall | spectral silver spire strikes ground |
| Legendary | F43 Kingless Edict | broken gold crown explodes into shards |
| Legendary | F44 Dawn Wound | long narrow gold-white slash opens right |
| Legendary | F45 Gravebell Toll | bronze bell-shaped flare emits floor rings |
| Legendary | F46 Halo Collapse | silver broken halo contracts to spark |
| Legendary | F47 Obsidian Oath | black glass spikes burst with white edges |
| Legendary | F48 Winter Mercy | pale icy blue branching healing sigil |
| Legendary | F49 Cinder Roar | small ember lion-like flame head lunges right |
| Legendary | F50 Star Requiem | silver stars spiral into midnight vortex |
| Mythic | F51 Godless Light | black-white split ray flashes right |
| Mythic | F52 Last Sun | tiny dying black sun flares with copper corona |
| Mythic | F53 Deathless Grace | ivory spectral ribs bloom into pale wings |
| Mythic | F54 Thorn Apotheosis | crimson thorn crown erupts and collapses |
| Mythic | F55 Abyssal Pardon | dark cyan void spiral closes inward |
| Mythic | F56 First Flame | thin white core fire with red broken edges |
| Mythic | F57 Eternal Funeral | silver funeral candles ignite in ring and extinguish |
| Mythic | F58 Heaven Shatters | pale gold arch breaks into angular shards |
| Mythic | F59 Covenant Blood | crimson droplets form sharp sacred seal |
| Mythic | F60 Final Amen | single ivory vertical line expands into cross flare then fades |

The exact generation prompts are saved in catalog-and-prompts.json; edit prompts are saved in correction-prompts.json.

