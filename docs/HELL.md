# HELL — The Infernal Dominion

## What it is

**HELL** is a genuine indoor dungeon biome in VELSCOUR's shuffled dungeon
progression, distinct from the **Molten Depths** and from the special
depth-500 encounter in **Velscour's Throne**. It uses the normal procedural
rooms, corridors, caves, doors, arches, monsters, loot, chests and
sealed-until-guardian-defeated exit. A visit counts as a normal non-overworld
dungeon for the Forsaken Wilds guaranteed-visitation counter.

Art direction: an ancient infernal citadel with high black-iron walls,
brimstone cobbles, bone chapels, obsidian altars, blood-stained flagstone,
smoldering lava fissures, serrated demonic statues and hellforged gates.
Material colors are oxidized iron, cinder-black, marrow bone, deep crimson,
flame-orange and gold-hot sulfur. Existing VELSCOUR player silhouettes,
gear/helm composites, rig attachment points and screen-space coordinates
are preserved unchanged.

## Generated environmental graphics

Source of truth: **`src/gfx/hellpack.js`**. The loader caches three
Canvas atlases and a full `pack.json`-compatible metadata object. All art
is drawn when the user first visits HELL, requiring neither a new build
step nor separate shipped binary atlas downloads.

| Type | Number | Art |
|---|---|---|
| Floors | **60** 160×80, 10 seamlessly repeating base materials + 50 decorated feature tiles | Blood flagstone, obsidian, brimstone, bone-dust pavers, molten veins, ash, rune circles, sacrificial sigils |
| Walls | **5 families × 16 connection masks = 80 topology combinations** | Brimstone Ashlar, Obsidian Citadel, Bone Cathedral, Blood Foundry, Damned Sanctum |
| Arches | **3 designs × 4 directional views** | Maw of Ashes, Horned Gate, Infernal Triumph |
| Doors | **3 designs × 4 directions × closed/open states** | Blackiron Gate, Hellforged Seal, Bone Prison |
| Environment props | **40 new named designs** | Skull obelisks, soul obelisks, hellfire braziers, violet balefire, lava vents and pools, rock and bone piles, soul cages, torture racks, fallen-angel/demon statues, pillars, infernal altars and sarcophagi, banners, black iron, reliquaries, cursed tomes |

The original Catacombs architecture is used **solely as a geometric and alpha
silhouette stencil** for already-correct modular wall-arm and door-leaf slicing.
Materials, colors and relief overlays are newly computed, but arch and door
silhouettes aren't independently repainted or re-modeled. This ensures
exact original 160×80 isometric grid alignment, wall cutaway, z-order and
hinged door behavior. The 60 floor designs and 40 prop designs are drawn
by the generator from their own shapes instead of tinted existing props.

The generated floors use an identical outer rhombus border color for each
material and inset interior texture decorations. Thus every base tile
can repeat with itself without an abrupt exterior texture discontinuity.

Props conform to the original `{img,sx,sy,w,h,ox,oy,fp,block}` rendering
contract. Some small decorations are walk-over; bulky monuments block
movement, and the normal dungeon generator rejects placements that
would disconnect navigable areas.

## Integration and gameplay

- `src/data/biomes.js`: `hell` biome included in the normal shuffle,
  cold/heat unchanged in other biomes, fiery enemy selection and infernal
  monster-art finish swaps. Mixes only with biomes on the same pack,
  so a normal palette mixed level won't replace the infernal architecture.
- `src/core/assets.js`: lazy `loadPack('hell')` builds the cached full
  atlas by reading the Catacombs geometrical template.
- `src/world/dungeon.js`: floor/room generators are unchanged; adds
  dedicated light radii to lava, soul furnaces and infernal flames.
- `src/core/audio.js`: torch/fire, deep cavern and storm ambience.
- `tools/tests/data_check.mjs`: recognizes this supported runtime art generator.
- `tools/tests/hell.js`: real browser QA and contact-sheet/export script.

No additional forced biome visitation rule is added for HELL; it rolls
normally like Ice Temple and Desert Temple. Final Depth 500 always uses
`throne` and is never replaced by HELL.

## Testing and asset handoff

Run after cloning the repository and starting a root HTTP server:

```bash
python3 -m http.server 8123
node tools/tests/data_check.mjs
node tools/tests/hell.js
node tools/tests/pack.js hell
node tools/tests/walls.js hell hell
node tools/tests/flow.js
node tools/tests/mobile.js
```

The browser script checks all 60 floor tiles, 10 seamless bases, five full
16-mask wall sets, directional 3-tile arches, opening door leaves, 40
non-overflowing prop cells, and 20 generated dungeon levels with reachable
floors, proper architecture and guardians.

It captures screenshots to:
- `tools/tests/out/hell_dungeon_gameplay.png`
- `tools/tests/out/hell_40_props.png`
- `tools/tests/out/hell_60_floors.png`

It also exports the complete **actual generated runtime** art pack:

```
tools/tests/out/hell_export/floors.webp
tools/tests/out/hell_export/walls.webp
tools/tests/out/hell_export/scatter.webp
tools/tests/out/hell_export/pack.json
```

These test outputs are intentionally ignored by Git. The source generator
is fully editable and deterministic. A later artist can replace the generated
sprites by changing the code or switching the loader to a traditional biome
ZIP imported with `tools/biomepack.py`.

**Review requirement:** this feature is on a draft branch. Mock Canvas
structural/scheduler checks passed, but a real game-browser rendering pass,
door-open visual review and mobile Safari performance measurement remain
necessary prior to merge.
