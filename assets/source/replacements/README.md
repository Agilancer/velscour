# VELSCOUR replacement sprite source pack

Generated with built-in `image_gen`, October 2026. These are project assets, not runtime
placeholders. `catalog.json` lists every selected drawing in reading order, its source cell,
stable ID and world height. Unselected cells in the source sheets are discarded concepts.

Reference images inspected before generation:

- `assets/source/enemies/set1/demons.png`: painted low-resolution monsters, dark contours,
  worn bone/iron, muted earth colors with sharp elemental accents.
- `assets/FinalClasses/All 16 Classes.png`: human proportions, clothing, armor and faces.
- Briefs: `docs/PLACEHOLDER_ART.md`, `ART.md`, `CLASS_ART.md`, `ENEMY_ART.md`, `HANDOFF.md`,
  and current `src/data/summons.js` / town NPC definitions. Current code takes precedence
  where the old inventory still lists already-replaced pets.

## Final prompt set

Shared direction: **production VELSCOUR game sprites, grimdark Diablo II-like painted pixel
clusters, jagged near-black contours, worn metal/leather/bone, lean anatomy, muted colors
with a single saturated elemental accent. Three-quarter 2:1 isometric, facing screen right,
full silhouettes. True RGBA transparency, no ground shadow, scenery, labels, text or grid.
Uniform cells and generous empty gutters; single sprites centered with empty margins.**
The references are for visual style only. Human townspeople use the class sheet, not the
monster sheet. Icons must read at 48px and characters at approximately 60 world pixels.

| Source | Subject prompt, in reading order |
|---|---|
| velscour.png | Towering lean horned demon king; bone crown, dried-blood red flesh, black armor with molten cracks, gold-yellow eyes, ragged wings/chains, burning greatsword. Final edit: remove backdrop and diffuse haze, retain exact pose and sharp attached flame tongues. |
| undead.png (5x2) | Death Knight in dark steel/violet cape; earthen Clay Golem with handprints; fused-skeleton Bone Colossus/cyan eyes; hooded pale-violet Wraith; stitched Abomination/hooks/chains; bloated green Plague Bearer; early Hive concept (unused); brown-gold Hawk; electric blue Storm Hawk; neutral grayscale Warding Crystal above rune plinth. |
| sentries.png (5x2) | Lightning Sentry iron coil pylon; Death Sentry ember furnace; Chain Sentry three coils; tall copper Tesla Coil; three-headed fire Hydra; dark Storm Cloud with lightning; blue War Banner; burning crimson Battle Standard; crimson/gold Banner of Kings; skull-and-trophy Grim Ward. |
| spirits.png (5x2) | Early Chorus concept (unused); spectral axe-bearing Ancient; blue lightning Storm Ancient; antler-crowned Ancestral Elder; early Holy Guardian (unused); spectral spear/shield Hoplite; early Captain (unused); floating icy runed greatsword; sackcloth Scarecrow; twig-and-bone Effigy with crimson bindings. |
| totems.png (5x3) | Searing ember wood; Healing green/gold glyphs; Stoneclaw stone claws; Storm iron rods; Frost ice crystals; Windfury feathers; Magma basalt; Venom snake carving; Spirit Link paired faces/chains; Thunderhead storm bird; Ancestral ivory pillar; Earthbind roots; Grand violet monolith; Volcano obsidian shrine; Bone skull/antler pole. |
| machines.png (4x3) | Dragon Ward stone dragon shrine; Bubbling Cauldron green liquid; Spirit Lantern ivory flame/hooked post; Thunder Drum; Amplifier violet tuning fork; brass gatling Gun Turret; Flame Turret/fuel tanks; Rocket Turret/pods; Cryo Turret/coolant coils; brass Combat Drone; Bomb Drone; walking Death Machine/gun arms. |
| vendors.png (5x2) | Living humans: Garrick sword/leather apron; Hilde mail/shield; Durgan soot apron/hammer; Lily Belle the Veiled veiled violet robes/crystal; Mother Wren shawl/flask; Zafir gems/embroidered robes; Jamie the Curator monk/lens; Fortunato burgundy coat/cards; living veteran Captain silver armor/crimson sash; ethereal human Chorus Singer ivory robes/open mouth. |
| equipment.png (5x4) | Sword, axe, mace, hammer, dagger; staff, bone wand, longbow, crossbow, spear; scythe, flintlock pistol, bladed boomerang, lute, kite shield; claw-mounted orb, closed helm, empty breastplate, gauntlets, early greaves (unused). Weathered neutral steel, tarnished gold and brown leather. |
| loot.png (5x2) | Leg armor, short leather boots, simple iron ring, ornate silver ring, elaborate gold ring; small/medium/large gold piles, red health globe, blue mana globe. Clear stones for runtime tinting. |
| gems.png (7x3) | Ruby oval red, sapphire square blue, topaz triangle yellow, emerald rectangle green, amethyst diamond purple, diamond clear, onyx round black; opal oval pearl, jade hex green, bloodstone red speckled, moonstone crescent, sunstone orange star, rainbow prism, red/blue twinsoul; forked violet splitter, blue orbit/silver ring, orange novacore, cyan chainlink, amber square titan, green eye seeker, gold/violet classgem star. |
| townsfolk.png (3x2) | Old Tobin frail man/stick/lantern; Mira young adult villager/green dress; Brother Cael brown-ivory priest/book; Gorm retired barbarian/bad knees/stick; pale neutral spectral wolf leaping right; pale neutral spectral dragon lunging right. |
| guardian.png | Standalone Holy Guardian: lean angelic human spirit, ivory wings, aged gold/ivory plate, stern pale face, sword and shield, no halo outside silhouette. |
| hive.png | Standalone stationary locust nest: ochre papery honeycomb, chitin pods, egg sacs, dark openings, tiny clinging locusts. No head, face, legs, jaws or humanoid body. |

Regenerate runtime outputs with `python tools/replacementart.py` from repository root.
Do not overwrite the supplied reference art. Keep the source catalog and game mappings in sync.
