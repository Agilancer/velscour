# Castle overworld: sprite request for ChatGPT

The Castle now uses only stone families. Four of the ten curtain-wall families in `assets/tiles/castle/walls.webp`
are house walls, despite their names: 01 and 07 are half-timber, and 02 and 08 are wooden planks. Two of the three keep-interior
families in `keep_walls.webp` have the same problem (02 is half-timber, 03 is planks). Until replacements arrive, the
curtain wall rotates the 6 stone families and every keep room uses `keep_wall_01_pale_quarry`.

## Attach as the template/example
- `assets/tiles/castle/walls.webp`: copy the layout of family `wall_04_rain_darkened` (third row, left) exactly.
- `assets/tiles/castle/keep_walls.webp`: the top two rows (`keep_wall_01_pale_quarry`) are the interior example.

## Shared rules (every piece)
- Same isometric 2:1 projection as the existing pack. A floor tile is a 160x80 diamond, and walls sit on it.
- Transparent PNG background, hard pixel edges, no anti-aliased halo, no drop shadow baked outside the footprint.
- Light comes from the upper left. Use the existing dark-fantasy Diablo II palette.
- Height must match the existing pieces exactly: a straight wall is **96x176**, its pivot (the foot on the tile centre) is **(48,152)**,
  and its top edge is at y=0 to 24. Mismatched heights break the wall joins.

## 1. Curtain wall families: 4 families x 20 pieces = 80 sprites
These replace families 01, 02, 07 and 08. Themes: **pale limestone ashlar**, **grey granite blocks**, **weathered sandstone**,
**dark basalt**. Every piece needs a **crenellated parapet top** (merlons), which the current walls lack.
The 20 pieces, as `size  pivot  name`:
```
32x144  16,136  pillar                      (mask 0)
64x160  16,152  end_NE                      (mask 1)
64x160  16,136  end_SE                      (mask 2)
64x176  16,152  corner_NE_SE                (mask 3)
64x160  48,136  end_SW                      (mask 4)
96x176  48,152  straight_NE_SW              (mask 5)
96x160  48,136  corner_SE_SW                (mask 6)
96x176  48,152  tee_NE_SE_SW                (mask 7)
64x160  48,152  end_NW                      (mask 8)
96x160  48,152  corner_NE_NW                (mask 9)
96x176  48,152  straight_SE_NW              (mask 10)
96x176  48,152  tee_NE_SE_NW                (mask 11)
64x176  48,152  corner_SW_NW                (mask 12)
96x176  48,152  tee_NE_SW_NW                (mask 13)
96x176  48,152  tee_SE_SW_NW                (mask 14)
96x176  48,152  cross_NE_SE_SW_NW           (mask 15)
96x176  48,152  panel_SE   panel_SW   panel_NW   panel_NE   (flat decorated faces: arrow slit, buttress, drain, banner hook)
```
File names: `wall_11_<theme>_stone_<piece>.png` through `wall_14_...`.

## 2. Keep-interior wall families: 2 families x 20 pieces = 40 sprites
Same 20 pieces and sizes as above, but with **no crenellations** (an indoor wall top with a dark cap). Themes:
**chapel: pale cream stone with gothic tracery panels**, and **great hall: warm brown dressed stone with oak trim**.
File names: `keep_wall_04_chapel_stone_<piece>.png` and `keep_wall_05_hall_stone_<piece>.png`.

## 3. Wall-matched modules: 10 sprites
These sit on one wall tile at the same scale as the walls above. The current landmark sprites are oversized composites,
so the code shrinks them, and they float.
```
192x256  pivot 96,232   gatehouse_SE      (arched gate, portcullis raised, two flanking turrets; spans 2 tiles)
192x256  pivot 96,232   gatehouse_SW
128x240  pivot 64,216   round_tower       (covers one wall corner, crenellated top)
128x240  pivot 64,216   square_tower
96x176   pivot 48,152   postern_gate_SE   (small walkable arch in a straight wall)
96x176   pivot 48,152   postern_gate_SW
96x176   pivot 48,152   postern_gate_NE
96x176   pivot 48,152   postern_gate_NW
160x120  pivot 80,96    drawbridge_lowered_SE   (wood planks + chains, covers a 1x2 tile moat crossing)
160x120  pivot 80,96    drawbridge_lowered_SW
```

## Total: 130 sprites
Send them back as one zip with the file names above. I'll pack them into the atlases and wire them in.
