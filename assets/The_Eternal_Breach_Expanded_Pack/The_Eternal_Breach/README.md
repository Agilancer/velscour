# The Eternal Breach biome pack

A grimdark 2:1 dimetric pixel-isometric asset pack for a graveyard overworld broken open into its own catacombs. The included concept sheet and vision document define the art direction; the individual sprites are original generated art projected and normalized with the supplied offline builder.

## Contents

- 60 floor sprites, with the first 10 processed as self-repeatable base materials
- Five modular wall families with 20 connection/topology sprites each
- Three arches with four directed orientations each
- Three doors with four directed orientations and open/closed states
- 40 biome scatter props
- 236 transparent sprite frames total, labeled sheets, transparent atlases, metadata, and mechanical QA layouts
- `docs/The_Eternal_Breach_Vision.md` and `docs/The_Eternal_Breach_Draft_Sheet.png`
- `START_HERE.html`, an offline searchable asset browser

## Import and placement

Use PNG RGBA, nearest-neighbor filtering, no smoothing, integer screen positions, and the supplied canvas sizes and pivots. Disable mipmaps for a fixed-resolution pixel presentation. If scaling the game, scale all sprites by the same integer factor.

The base floor slot is 160 × 80 pixels, with basis vectors `u = (+80,+40)` and `v = (-80,+40)`. Coordinates use the ground center of each sprite:

```text
ground_x = origin_x + 80 * (u - v)
ground_y = origin_y + 40 * (u + v)
image_x  = ground_x - pivot_x
image_y  = ground_y - pivot_y
```

Draw floors first. Ground depth `u+v` is a useful starting order for props. Use the manifest for exact pivots, connection data, states, and atlas rectangles. Arches span three tiles structurally; doors occupy one wall tile. Split or mask tall architecture in-engine if characters need to move both behind and in front of it.

The 10 repeatable base floors are each certified for self-repeat by the numeric validation. Transitions between different floors and motif tiles are not certified as seamless. Scatter sprites are visually matched generated art and their pivots are practical placement anchors, not recovered 3D collision geometry. This is an engine-neutral PNG pack, not a native DT1/DCC package.

## Inspect and rebuild

Open `START_HERE.html` directly after extracting the ZIP; it works offline. See `manifest.json`, `manifest.csv`, the labeled `reference_sheets/`, and `qa/` for asset details and assembly checks.

To rebuild the sprites and metadata with Python 3.10+, Pillow, and NumPy:

```text
python tools/build_pack.py --source source_art --config template/eternal_breach_config.json --out The_Eternal_Breach_Build
python tools/make_previews.py The_Eternal_Breach_Build
```

The generated source atlases and prompt record are in `source_art/`. The pack template and measured grid are in `template/`.
