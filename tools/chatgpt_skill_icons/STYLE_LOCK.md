# STYLE LOCK: VELSCOUR skill icons

These rules come from the icons the game already has: every skill and talent of the {{PAINTED_CLASSES}}
(`style_reference/`). New icons must look like they belong to the same set. If a rule here and a prompt seem to
disagree, the rule wins.

## The look in one sentence
A dark-fantasy action-RPG ability icon: a painterly, high-contrast digital painting of one bold subject in near-black
darkness, lit by its own blazing element-coloured magic, filling a square edge to edge.

## Shape and framing
- **Square and full-bleed.** The painting fills the whole cell. No frame, border, bevel, rounded corners, drop
  shadow, vignette ring or plate. The game adds its own frame.
- **One subject, one idea.** One weapon, creature, figure, spell or emblem per icon, big and centred or on a strong
  diagonal (bottom left to top right for projectiles, beams, thrusts and dashes).
- **Readable at 48 px.** Big shapes, a clear silhouette and strong light-against-dark contrast. No fine detail that
  only shows at full size. Squint at it: it should still say what the skill is.
- **No text of any kind:** no letters, numbers, words, labels, signatures, watermarks or UI. The only symbols
  allowed are musical note glyphs (Bard), constellation lines (Astronomer), crosses and runes drawn as glowing shapes.

## Light and colour
- **Background:** near black (#050405 to #161114), darkest in the corners, sometimes a faint dark ground, smoke,
  ruins or sky behind the subject. Never a white, grey, flat-coloured or transparent background.
- **The magic is the light source.** Saturated glow, bloom, sparks, embers, motion streaks and light rays come out of
  the spell and rim-light everything near it. A white-hot core, then the element colour, then darkness.
- **One dominant hue per icon**, taken from the skill's element (below), plus white highlights. One accent colour at
  most (fire sparks on a lightning lance, for example). A tree reads as a family: its icons share their palette.
- **Never use magenta #FF00FF inside an icon.** It is the template's key colour. Arcane magic is violet and purple.

| Element | Colours | Glow / core / shadow |
|---|---|---|
| Physical | steel, bone, stone, warm white-amber light | #e0d8c8 / #ffffff / #7a7060 |
| Fire | orange-gold flame, ember red | #ff7a10 / #fff3a0 / #c02000 |
| Cold | icy cyan and white frost, deep blue | #60c8ff / #f0ffff / #1a50d0 |
| Lightning | blue-white arcs with violet edges | #a8ccff / #ffffff / #4a64ff |
| Poison | toxic lime green, sickly fumes | #70e020 / #e8ff90 / #206010 |
| Arcane | violet and purple energy | #c060ff / #ffe0ff / #5a10c0 |
| Holy | radiant gold and white | #ffd860 / #fffff0 / #d08a00 |
| Shadow | purple-black, violet glow | #9030d0 / #e8c0ff / #280038 |
| Blood | crimson, dark red | #e01010 / #ffa0a0 / #5a0000 |
| Acid (Slime Lord) | glossy translucent **blue** ooze | #3a8cff / #d8f0ff / #0c2aa0 |
| Astronomer's arcane | starlight blue on night sky, gold star lines | #4aa8ff / #f2fbff / #1430a0 |

## Rendering
- A painterly digital illustration: confident brush strokes, crisp edges on the subject, soft glow around it. The
  rendering of a premium ARPG skill icon.
- **Not** pixel art, photographic, a 3D render or plastic, cel-shaded or cartoon, cute or chibi, flat vector, or
  line art.
- Figures (the hero, summons, enemies) are seen in a heroic three-quarter view and are partly silhouetted against
  their own light. Faces are simplified and never the focus. Small dark enemy silhouettes at the bottom edge give area
  attacks their scale.
- Ground effects (zones, traps, rains, slams, fissures, novas) sit on a dark ground in the lower third, seen from a
  low three-quarter angle, with the magic on it.
- Buffs and auras show the hero (or the class's emblem) wrapped in light. Curses and hexes show a sigil or a hand
  over cowering silhouettes. Summons show the creature itself, posed and lit. Passive talents are symbolic emblems
  (a shield, a weapon, an eye, a heart, a crown) in the branch's colour.

## Telling icons apart
- The nine icons of a sheet must each be clearly different, in subject or composition, so a player can find a skill
  on the bar at a glance. Mix close-ups of a weapon or object, a figure in action, a ground effect and an emblem.
- Skills that share an element or weapon must still differ: a single arrow against a volley, a ring against a
  pillar, one shield against a wall of shields.
- Choice talents come in A/B pairs: make the two clearly different.

## The sheet
- One image is **1024 x 1024**: a flat magenta (#FF00FF) border of {{BORDER}} px and gutters of {{GUTTER}} px around
  **nine square cells of {{CELL}} x {{CELL}} px** in a 3 x 3 grid (`templates/template_3x3.png`). Cells are read left to
  right, top to bottom (`templates/template_3x3_cell_numbers.png`).
- Each icon stays inside its own cell and fills it completely. Nothing crosses a gutter. Gutters and border stay pure,
  flat magenta.
- An EMPTY cell is filled with flat magenta.
- Same lighting, rendering and level of detail in all nine cells, and across every batch.
