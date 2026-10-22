# Placeholder art kit: everything still drawn by code

Every in-game art object (not UI) that is still drawn by code instead of coming from painted art, with a paint
template for each, so ChatGPT can make the replacements. The templates are built by
`python tools/placeholder_art_kit.py`, which also writes `docs/art_kits/ChatGPT_Placeholder_Art_Kit.zip`
(this folder plus `current/`, the two Python-drawn textures as they look now).

**Python vs JavaScript.** Only **two** in-game images are drawn by Python: the 3D Castle's slate roof and oak plank
textures (`slate()` and `wood()` in `tools/castle3d.py`, baked into `assets/source/castle3d/tex/`). Everything else
drawn in code is drawn at runtime by the game's JavaScript (Canvas paths). That list is below too, limited to objects
seen in **normal play**. Art that only shows while a painted image is loading is left out.

**No importers yet.** These templates are only the paint side. Each sheet will need a small import step and a code
change so the game draws the painted art instead of its code version (the existing kits work the same way). Send the
finished sheets back and they can be wired in.

## What to paint (16 templates: 118 sprites + 6 textures)

| Template | Asset | Drawn now by | In game (world px) | Paint at |
|---|---|---|---|---|
| `01_castle_floor_tiles` | Carpet runner, plain field | `carpetArt` in `src/gfx/castle.js` | one 64 x 32 floor tile (160 x 80 tile px) | 640 x 320 diamond |
| | Carpet runner, gold trim on the top-left edge | same | same | same |
| | Carpet runner, gold trim on the bottom-right edge | same | same | same |
| | Drawbridge deck (oak boards, two iron straps) | `plankArt` in `src/gfx/castle.js` | same | same |
| `02a_slate_roof` | **Slate roof texture (Python)** | `slate()` in `tools/castle3d.py` | 256 x 256 texture, tiles both ways | 1024 x 1024 |
| `02b_wood_planks` | **Oak plank texture (Python)**: doors, gates, drawbridge on the 3D Castle | `wood()` in `tools/castle3d.py` | 128 x 256 texture, tiles both ways | 512 x 1024 |
| `03_castle_siege_tents` | Siege-camp ridge tent: tan, dark red and olive cloth | `castleTent` in `src/gfx/castle.js` | 140 x 120, on a 2 x 3 tile footprint (the yellow diamond) | 3x |
| `04_town_props` | Campfire, unlit (stone ring and logs) | `drawTownProp` in `src/gfx/townprops.js` | 40 x 24 | 5x |
| | Candle on a dish, unlit | same | 8 x 16 | 5x |
| | Festival bunting post with brass cap (the string and pennants stay code) | same | 8 x 50 | 5x |
| | Bedroll, two directions | same | 34 x 20 | 5x |
| | Flame loop, 5 frames (shared by campfire, candles and every lit town wall torch) | `flame` in `townprops.js`, `'flame'` props in `src/game/render.js` | 12 x 24 | 5x |
| `05_dungeon_interactables` | Shrine obelisk, active and spent (glow seam painted white, the game tints it per shrine) | `obelisk` in `src/game/happenings.js` | 30 x 50 | 4x |
| | Cursed chest, closed and burst open (it has no open look now) | `addCursed` in `happenings.js` | 34 x 30 | 4x |
| | Eternal Breach ward rune post (the violet curtain between two posts stays code) | `src/gfx/breach.js` | 10 x 30 | 4x |
| `06_dragon_knight_gunner` | Dragon Knight spectral dragon: skull and neck, and the lower jaw as a separate piece (the game opens it on the hinge) | `dragonHead` in `src/game/sigs/dragonknight.js` | 80 x 80 + 40 x 16, drawn at 1.6x | 3x |
| | Dragon Knight flame wing, right side (mirrored for the left, scaled with Heat) | `wing` in `dragonknight.js` | 70 x 60 | 3x |
| | Gunner biplane in side view, 3 propeller blur frames, falling bomb | `biplane`/`Bomb` in `src/game/sigs/gunner.js` | 104 x 38 | 3x |
| `07_lancer_phantom_knight` | Lancer phantom knight on a charger with lance and pennant, 6-frame gallop | `src/game/sigs/lancer.js` | 64 x 44 | 4x |
| `08_small_signature_objects` | Necromancer skull lantern (empty cage; the souls filling it stay code), screaming skull | `src/game/sigs/necromancer.js` | 14 x 26, 14 x 14 | 6x |
| | Carrion Witch hex poppet, normal and rotted, and a hex pin | `src/game/sigs/witch.js` | 16 x 26 | 6x |
| | Totem Master's small totem pole: bear, wolf, thunderbird and serpent faces, and the crown wings | `src/game/sigs/totem.js` | 12 x 10 faces, 32 x 12 wings | 6x |
| `09_sky_clouds` | Sky Battle clouds (4 large, 3 medium, 3 wisps), sun and moon | `cloudSprite`/`skyBack` in `src/gfx/skyship.js` | 160 x 60 and smaller | 2x |
| `10_breach_pieces` | Breach backdrop far rocks (4); island-underside stalactites, roots, rift crystals, glow seam | `src/gfx/breach.js` | up to 60 x 46 | 3x |
| `11_castle_ground_bits` | Castle grounds bits: grass tufts, pebbles, leaves, reeds, specks, flowers, 8 of each | `src/gfx/castleground.js` | 10 x 9 | 10x |
| `12a/b/c_mountain_sky_*` | Mountainside sky: far, mid and near ridge strips (parallax) | `drawSky` in `src/gfx/terrain.js` | full screen width | 2048 x 512 each, tiles left to right |
| `13a_breach_void_nebula` | Eternal Breach void backdrop: nebula and stars | `src/gfx/breach.js` | full screen | 1024 x 1024, tiles both ways |

### Left as code on purpose (not in the kit)
- Physics-driven or stretchy: bunting string and pennants, Sky Battle ropes, Breach ward curtain, water flow, river
  banks, cliff-face rock, ground grit, island-underside rock bodies (they follow each column's shape).
- Turned and posed in 3D every frame: Ranger phoenix, Totem Master great totem, boomerangs and chakrams, Paladin
  hammers. These could later be baked into turn sheets like Varrow's axe, but that is a different job.
- VFX, projectiles, auras, telegraphs, portals, skill icons, emote bubbles, Bard notation, Astronomer star charts.
- Fallback-only art that you never see once painted art has loaded: the ASCII monsters, decor and items in
  `src/gfx/pixelart.js`, the generic chest, the fallen-adventurer remains, the flat Forsaken Wilds shrine and caravan
  pictures, the flat phoenix, totem and Runeblade, and the unused `biomeexpansion.js` outdoor props.

## How to ask ChatGPT
1. New chat. Paste the **style bible** below.
2. Attach **one** template and paste its prompt (below). One sheet per message.
3. Ask for a PNG of **exactly the template's size**. Keep the magenta background for sprite sheets.

### Style bible (paste first)
> You are painting sprites for VELSCOUR, a grimdark isometric action RPG in the style of Diablo II. The view is 2:1
> isometric (floor tiles are diamonds twice as wide as tall). A hero is about 60 world px tall on a 64 px tile.
> Style: painted low-resolution pixel art, chunky pixel clusters, near-black shadows, jagged dark ink contours, worn
> metal, weathered wood, torn cloth, bone. Muted palettes with one saturated accent. Light comes from the upper left.
> Objects face screen right in three-quarter isometric view unless told otherwise. No ground shadows (the game draws
> its own), no scenery, no text in the art.
> Delivery rules: keep the template's exact pixel size and grid; art goes inside its cyan dashed box, standing on the
> yellow ground line or centred on the yellow pivot mark; the background stays flat magenta #FF00FF (no gradients, no
> checkerboard, no soft glow onto the magenta); nothing crosses a cell edge; remove every guide line, label and
> number from the finished image. Same scale and baseline across the whole sheet.

### Sheet prompts
- **01 castle floor tiles:** "Fill each of the four isometric diamonds edge to edge (no magenta inside a diamond, no
  gaps at the corners): 1) a worn crimson carpet runner running top-right to bottom-left, with a faint woven lattice and a thin gold centre stripe; 2) the
  same carpet with a gold-and-dark-red border along the edge marked in yellow; 3) the same with the border on the
  other marked edge; 4) a drawbridge deck of dark tarred oak boards running top-left to bottom-right, with two iron
  straps across them and rivets. Tiles 1-3 must join seamlessly along the carpet's length."
- **02a slate roof:** "Paint a 1024 x 1024 seamless texture of castle roof slates seen straight on: 16 rows of
  overlapping blue-grey slates, staggered, each darker at its lower edge, a few chipped or mossy. Flat even lighting.
  It must tile left-right and top-bottom without visible seams." Attach `current/slate_now.png` as the layout reference.
- **02b wood planks:** "Paint a 512 x 1024 seamless texture of 8 vertical weathered oak boards with dark seams and
  grain running up. Flat even lighting, no nails or straps. Tiles both ways." Attach `current/wood_now.png`.
- **03 siege tents:** "Paint the same military ridge tent three times, in tan canvas, dark red canvas and olive green
  canvas. Its base fills the yellow diamond footprint, its ridge pole runs along the yellow line, the open door flap is
  on the gable marked 'door gable', with short poles at both ridge ends, guy ropes and a small pennant. Patched, muddy,
  sagging canvas."
- **04 town props:** "Row 1: a campfire ring of stones with crossed unburnt logs (no fire); a short tallow candle on an
  iron dish (no flame); a tall wooden festival post with a brass cap; a rolled-out wool bedroll lying along the
  top-left to bottom-right diagonal, and the same bedroll along the other diagonal. Row 2: a 5-frame looping flame,
  orange-red outside, yellow-white core, its base on the yellow line, flickering shape changing frame to frame."
- **05 dungeon interactables:** "1) a dark stone obelisk on a small diamond plinth, with a vertical glowing seam
  painted pure white; 2) the same obelisk spent, seam dark and cracked; 3) a cursed iron-bound chest in black wood with
  crimson trim and a chained lock; 4) the same chest burst open, lid thrown back, chains broken; 5) a short rune post of
  black rock with a white glowing rune slot."
- **06 dragon knight and gunner:** "1) a spectral fire dragon's skull and neck in profile facing right, horns swept
  back, upper teeth, NO lower jaw, the jaw hinge at the yellow mark, made of translucent flame; 2) its lower jaw alone
  with teeth, hinge at the yellow mark; 3) a flame wing of three fingers with a scalloped edge, its root at the yellow
  shoulder mark, reaching up to the top right; 4) a rickety WWI-style biplane in side view facing right, olive and tan
  canvas, red roundel, pilot's head, no propeller; 5-7) three frames of a spinning propeller blur; 8) a small black
  bomb falling nose down."
- **07 phantom knight:** "A ghostly knight riding a barded charger at full gallop, facing right, lance couched with a
  pennant, translucent blue-white spectral glow. Six frames of one gallop loop, hooves on the yellow line."
- **08 small signature objects:** "1) an empty iron cage lantern with a skull motif, hanging from its ring at the
  yellow mark; 2) a small screaming skull facing right; 3) a crude burlap voodoo poppet with stitched X eyes and
  twine; 4) the same poppet rotted, torn and stained; 5) a long iron hex pin with a bone head, point at the yellow
  mark; 6) a pair of carved painted wooden wings for a totem pole top; 7-10) four carved, painted totem-pole faces:
  bear, wolf, thunderbird, serpent."
- **09 sky clouds:** "Pixel-art clouds for a high-altitude battle at dusk, lit from above: four large cumulus, three
  medium, three thin wisps, each filling its box; then a glowing sun disc and a pale cratered moon disc."
- **10 breach pieces:** "Chunks of shattered land floating in a violet void. 1-4) distant floating rock islands with a
  little dead grass on top; 5-6) hanging stalactite spikes of dark rock; 7-8) dangling dead roots; 9-11) violet rift
  crystal shards growing downward; 12) a glowing violet crack in rock. Items 5-11 hang from the yellow mark at their top."
- **11 castle ground bits:** "Tiny pixel-art ground details, 8 variations of each row: grass tufts, pebbles, fallen
  leaves, reeds, dirt specks, small wildflowers. Each fills its box, sitting on the yellow line."
- **12a/b/c mountain sky:** "2048 x 512, seamless left to right. a) far layer: a dusk sky gradient over pale distant
  snowy peaks; b) mid layer: TRANSPARENT background, a bluer jagged ridge across the lower half; c) near layer:
  TRANSPARENT background, the darkest nearest ridge across the bottom third." (For b and c ask for a transparent PNG;
  if it comes back with a backdrop, ask for flat magenta instead.)
- **13a breach void:** "1024 x 1024 seamless texture of an endless near-black violet void with soft nebula clouds and
  scattered single-pixel stars; tiles both ways; no big objects."

## Template legend
- Flat magenta `#FF00FF` = empty. Thin purple lines = cell edges. Labels above each cell name the sprite (ids match
  the table above) and give its in-game size.
- Cyan dashed box = the art's bounding box at paint scale. Yellow line = ground line (feet on it). Yellow cross = pivot
  or anchor (a hinge, a hanging point, a shoulder or a centre). On the tent the yellow diamond is the ground footprint.
- Texture templates are grey: deliver an image of exactly the stated size, full bleed, with no transparency.
