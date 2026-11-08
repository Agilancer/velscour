# VELSCOUR STYLE LOCK — GRIM NOCTURNE

## Approval and source status

The user approved style_lock_sheet_v3_REVIEW.png as the visual direction on 2026-10-18. Its material shapes, restrained ornament and increasingly regular patterns guide future art. Approval does not make its noisy background, color counts, oversized samples or inconsistent 3x blocks the production specification. Exact technical requirements below remain the target; the sheet is not an import-ready sprite source.

Sources: 01_VELSCOUR_ART_BIBLE.md, 02_MASTER_PROMPT.txt, 03_SHEET_PROMPTS.md, 04_STYLE_LOCK_REQUEST.txt, 05_PROMPT_PACK.md, and the geometry constants read from tools/chatgpt_art.py. No included script was executed.

Every paragraph or table introduced here rather than transcribed from the kit is labelled (added). Labels apply to the complete following table/list/section until the next heading. Exact material-role selections and class color allocations are proposed production choices, not measurements of the generated sheet. They may be reviewed before pose-master approval.

### Conflict resolutions (added)

- Hero budgets: Common/Uncommon 16; Rare/Epic 20; Legendary/Mythic 24, all including transparency. The master omits Epic explicitly; the pack and importer both specify 20. This fills that omission without changing the master values.
- The 15 visible colors of a base hero comprise skin 3, hair 2, and up to 10 remaining colors TOTAL, including outline, eyes, materials and rim. Share colors across roles; do not add outline/rim beyond the budget.
- Necromancer is bald and Slime Lord has no hair: their literal identities override the pack's repeated generic 'hair 2 tones' clause. Do not invent hair. Slime Lord retains two eye glints and a round head; do not add human facial features from the generic pose paragraph.
- Boss height follows the bible: 162-288 AP, rather than the pack's rounded 160-290.
- Pet modes follow the bible: humanoid pets use character mode; beasts and unnatural summons use manuscript mode. The pack's blanket outlined-animal instruction is not used.
- The master gives an 8-AP outward bulk allowance. Use that stricter cap for skirts too; do not use the bible's separate 10-AP flare allowance without a later explicit revision.
- Pose landmarks target the exact canonical coordinates. Bible tolerances are QA limits for drafting, not permission to move the approved master between armors.
- Helmet crests must fit inside the supplied 40x40 AP extraction zone; the prose permission to leave it would be cropped by the included importer. A larger crest needs revised geometry first.
- The example hue pairs are suggestions, not an exhaustive list. If more unique pairs are needed, choose distinct pairs from existing ramps and mark the new design card '(added)'; never silently repeat a card line.
- Pattern and construction review is mandatory on future artwork, following the user's instruction: inspect several times, revise material inconsistencies, and keep intentional repeats as regular as the form permits.

## A. GRIM NOCTURNE in five sentences

GRIM NOCTURNE is deliberate 2D pixel art with theatrical costumes, compact palettes and flat bands of light and shadow. Final Fantasy VI supplies about 60% of the craft recipe: readable battle-sprite presence, costume storytelling and disciplined color. Diablo II supplies about 25%: weight, grime, constructed materials and an elevated three-quarter camera. Symphony of the Night supplies about 15%: gothic elongation and a hard cold rim on back-right edges. Every character and object is original, borrowing craft rather than existing characters, equipment, logos or compositions.

## B. Grid and asset sizes

An art pixel (AP) is one flat square color. Hero frame: 128x192 AP; bare crown y=75, soles y=183, geometric height 108 AP; head center x=65, hip center x=64. The hero is about 6.75 heads tall, head crown-to-chin 16 AP, and displays at 60 world pixels tall. Do not reinterpret the difference of coordinates as an instruction to add another pixel to the body height.

| Asset | Height / size in AP | Delivery |
|---|---|---|
| Hero pose master | 108 tall in 128x192 | 4x; frame 512x768 output pixels |
| Body armor | same | 2x; frame 256x384 output pixels |
| Overlay full-frame layer | 128x192 | 3x; zones below |
| Adult townsperson | 100-108 tall | supplied world template scale |
| Child | 72-80 tall | supplied world template scale |
| Small monster | 54-72 tall | supplied world template scale |
| Man-sized monster | 97-104 tall | supplied world template scale |
| Brute | 115-144 tall | supplied world template scale |
| Boss | 162-288 tall | supplied world template scale |
| Wolf pet / bird pet | 61 / 50 tall | supplied world template scale |
| Biome floor diamond | 160x80 native pixels, 1 native pixel/world pixel | native tile scale; 2-3 pixel clusters |

The material sheet is 1536x1024 at 3x, with 6-8 selected colors per sample at most; skin studies use three skin tones plus any separately budgeted eye/rim color. Armor and overlay sheets are 1536x1024. Every block at the declared scale must contain identical pixels. World sheets require their actual template: select 2x or 3x only if the selected AP size fits its cells. Do not squeeze a boss into a smaller cell or rescale silently. (added)

## C. Pose lock

Three-quarter view facing screen right, turned about 30 degrees toward the viewer; camera about 30 degrees above. Stand tall, weight centered, shoulders level, chin level, both soles planted, screen-right foot pointing right-down. Legs are straight but relaxed; arms hang a fist's width away from the torso, elbows slightly bent, empty hands loosely clenched. No weapon or shield.

| Landmark | AP coordinate | Bible draft tolerance |
|---|---|---|
| Crown | y=75 | exact |
| Head center | x=65 | exact |
| Eyes | y=83 | exact |
| Chin | y=91 | exact |
| Shoulders | y=96 | exact |
| Elbows | y=114 | ±1 AP |
| Belt / waist | y=120; hip center x=64 | ±2 AP vertically |
| Crotch | y=129 | ±1 AP |
| Fists | left (37,132); right (87,132) | ±2 AP |
| Knees | left (50,154); right (78,154) | ±1 AP |
| Ankles | y=178 | ±1 AP |
| Soles | left (46,183); right (84,183) | exact |

Heavy costumes may grow 8 AP outward per side; pauldrons/collars rise at most 6 AP above the shoulder line. All joints, head pixels, face, hair, skin, age, direction and lighting remain fixed across a class's armors. Body armor has no helmet, hood, hat, crown, circlet, mask or face paint. Robes and tails can hang to ankles while leaving foot locations readable. Use the approved class master for any x coordinate not specified here; do not invent shoulder/elbow x coordinates. (added)

## D. Palette and class allocation

| Ramp | Steps (dark -> light) |
|---|---|
| Shadow ink (outlines, crevices) | `#07060a` `#100c14` `#1a1220` |
| Grave steel (cool iron, plate) | `#0e1016` `#1c2230` `#2e3747` `#46526a` `#6a7891` `#98a6bc` `#d0d9e6` |
| Blackened steel (death knights, cursed) | `#08080c` `#13131c` `#20202e` `#323246` `#4c4c66` `#76769a` |
| Reliquary gold (aged gilt, brass) | `#1a1006` `#3a240c` `#63401a` `#8e6427` `#b98e3c` `#dcbf6a` `#f4e3a6` |
| Verdigris bronze | `#0e1412` `#1c2a26` `#2e4640` `#46665c` `#6a8c7e` `#9ab8a6` |
| Wine / blood cloth | `#12060a` `#2a0c14` `#4a1420` `#6e1e2a` `#962c34` `#c04848` |
| Night indigo cloth | `#0a0a18` `#161a34` `#242c52` `#34406e` `#4c5c92` `#7084b8` |
| Moss / ranger green | `#0c1208` `#1a2612` `#2c3e1c` `#44582a` `#62763a` `#8e9c56` |
| Leather (boiled, oiled) | `#120c08` `#261a10` `#3e2a1a` `#5a3e26` `#7a5636` `#9e7650` |
| Wool / undyed linen | `#16130f` `#2c2720` `#4a4236` `#6c6252` `#948870` `#bcb096` |
| Bone / parchment / ivory | `#1c1812` `#3a3226` `#5e5442` `#8a7e66` `#b4a88c` `#ddd2b6` `#f2ecda` |
| Fur (grey wolf) | `#121212` `#262422` `#3e3a36` `#5c5650` `#827a70` `#aaa094` |
| Skin, light | `#2a1610` `#5a3020` `#8c5038` `#b8785a` `#dca484` `#f2cdb0` |
| Skin, medium | `#1e100a` `#42241a` `#6a3c28` `#93583c` `#b87a56` `#d8a07c` |
| Skin, deep | `#120a08` `#2a1610` `#44261a` `#603826` `#7e4e36` `#9c6a4c` |
| Undead flesh | `#101410` `#20281e` `#3a4436` `#58624e` `#7a846a` `#a6ac8c` |
| Hellfire (emissive) | `#2a0800` `#5c1200` `#9a2a00` `#d45208` `#f68a1c` `#ffc458` `#fff2b8` |
| Arcane violet (emissive) | `#0c0a24` `#20185a` `#3a2c96` `#5c4cd0` `#8a7cf0` `#c4bcff` |
| Frost (emissive or ice) | `#0a1620` `#16303e` `#285468` `#3e7c94` `#66a8c0` `#a6d8e6` `#e6f6fa` |
| Poison / bile | `#0e1206` `#1e2a0a` `#36480e` `#56701a` `#80a02a` `#b8d050` |
| Holy (emissive) | `#2a2008` `#5a4814` `#9a8428` `#d4bc48` `#f2e08a` `#fffae0` |
| Moonlit rim (signature) | `#6f84a8` `#9fb4d4` `#d4e2f4` |
| Slime (Slime Lord) | `#04102a` `#082456` `#0e3c8c` `#1a5cc8` `#3c86ec` `#86bcff` `#d8ecff` |

Budgets including transparency: pose master/Common/Uncommon 16; Rare/Epic 20; Legendary/Mythic 24; townsperson 16; monster 16-24; boss 32. Overlay helmet/glove pair/boot pair 8-12 colors. Use 3 skin tones and 2 hair tones where hair exists. Dominant base 60%, secondary 30%, accent 10%; saturated color only in the accent.

### Class ramp selections (added exact selections; identity colors from pack)

| Class | Skin / body | Hair (two tones) | Base cloth | Accent / supporting ramp |
|---|---|---|---|---|
| Arcane Sorcerer | Skin, light: #8c5038 #b8785a #dca484 | #261a10 #7a5636 | Wine /: #12060a #2a0c14 #4a1420 #6e1e2a #962c34 #c04848 | Arcane violet: #0c0a24 #20185a #3a2c96 #5c4cd0 #8a7cf0 #c4bcff; Reliquary gold: #1a1006 #3a240c #63401a #8e6427 #b98e3c #dcbf6a #f4e3a6 |
| Barbarian | Skin, light: #8c5038 #b8785a #dca484 | #2a0c14 #962c34 | Wine /: #12060a #2a0c14 #4a1420 #6e1e2a #962c34 #c04848 | Frost (: #0a1620 #16303e #285468 #3e7c94 #66a8c0 #a6d8e6 #e6f6fa; Leather: #120c08 #261a10 #3e2a1a #5a3e26 #7a5636 #9e7650 |
| Bard | Skin, medium: #6a3c28 #93583c #b87a56 | #100c14 #100c14 | Wine /: #12060a #2a0c14 #4a1420 #6e1e2a #962c34 #c04848 | Holy (: #2a2008 #5a4814 #9a8428 #d4bc48 #f2e08a #fffae0; Reliquary gold: #1a1006 #3a240c #63401a #8e6427 #b98e3c #dcbf6a #f4e3a6 |
| Boomerang Knight | Skin, medium: #6a3c28 #93583c #b87a56 | #100c14 #100c14 | Verdigris bronze: #0e1412 #1c2a26 #2e4640 #46665c #6a8c7e #9ab8a6 | Reliquary gold: #1a1006 #3a240c #63401a #8e6427 #b98e3c #dcbf6a #f4e3a6; Leather: #120c08 #261a10 #3e2a1a #5a3e26 #7a5636 #9e7650 |
| Carrion Witch | Skin, light: #8c5038 #b8785a #dca484 | #262422 #827a70 | Blackened steel: #08080c #13131c #20202e #323246 #4c4c66 #76769a | Arcane violet: #0c0a24 #20185a #3a2c96 #5c4cd0 #8a7cf0 #c4bcff; Bone /: #1c1812 #3a3226 #5e5442 #8a7e66 #b4a88c #ddd2b6 #f2ecda |
| Death Knight | Skin, light: #8c5038 #b8785a #dca484 | #100c14 #100c14 | Blackened steel: #08080c #13131c #20202e #323246 #4c4c66 #76769a | Frost (: #0a1620 #16303e #285468 #3e7c94 #66a8c0 #a6d8e6 #e6f6fa; Verdigris bronze: #0e1412 #1c2a26 #2e4640 #46665c #6a8c7e #9ab8a6 |
| Dragon Knight | Skin, light: #8c5038 #b8785a #dca484 | #261a10 #7a5636 | Wine /: #12060a #2a0c14 #4a1420 #6e1e2a #962c34 #c04848 | Verdigris bronze: #0e1412 #1c2a26 #2e4640 #46665c #6a8c7e #9ab8a6; Reliquary gold: #1a1006 #3a240c #63401a #8e6427 #b98e3c #dcbf6a #f4e3a6 |
| Dragoon | Skin, medium: #6a3c28 #93583c #b87a56 | #100c14 #100c14 | Grave steel: #0e1016 #1c2230 #2e3747 #46526a #6a7891 #98a6bc #d0d9e6 | Wine /: #12060a #2a0c14 #4a1420 #6e1e2a #962c34 #c04848; Night indigo: #0a0a18 #161a34 #242c52 #34406e #4c5c92 #7084b8 |
| Gunner | Skin, medium: #6a3c28 #93583c #b87a56 | #100c14 #100c14 | Blackened steel: #08080c #13131c #20202e #323246 #4c4c66 #76769a | Reliquary gold: #1a1006 #3a240c #63401a #8e6427 #b98e3c #dcbf6a #f4e3a6; Wine /: #12060a #2a0c14 #4a1420 #6e1e2a #962c34 #c04848 |
| Lancer | Skin, light: #8c5038 #b8785a #dca484 | #261a10 #7a5636 | Grave steel: #0e1016 #1c2230 #2e3747 #46526a #6a7891 #98a6bc #d0d9e6 | Holy (: #2a2008 #5a4814 #9a8428 #d4bc48 #f2e08a #fffae0; Reliquary gold: #1a1006 #3a240c #63401a #8e6427 #b98e3c #dcbf6a #f4e3a6 |
| Necromancer | Skin, light: #8c5038 #b8785a #dca484 | None | Blackened steel: #08080c #13131c #20202e #323246 #4c4c66 #76769a | Reliquary gold: #1a1006 #3a240c #63401a #8e6427 #b98e3c #dcbf6a #f4e3a6; Bone /: #1c1812 #3a3226 #5e5442 #8a7e66 #b4a88c #ddd2b6 #f2ecda |
| Paladin | Skin, deep: #44261a #603826 #7e4e36 | #100c14 #100c14 | Night indigo: #0a0a18 #161a34 #242c52 #34406e #4c5c92 #7084b8 | Reliquary gold: #1a1006 #3a240c #63401a #8e6427 #b98e3c #dcbf6a #f4e3a6; Grave steel: #0e1016 #1c2230 #2e3747 #46526a #6a7891 #98a6bc #d0d9e6 |
| Ranger | Skin, light: #8c5038 #b8785a #dca484 | #2a0c14 #962c34 | Moss /: #0c1208 #1a2612 #2c3e1c #44582a #62763a #8e9c56 | Wine /: #12060a #2a0c14 #4a1420 #6e1e2a #962c34 #c04848; Leather: #120c08 #261a10 #3e2a1a #5a3e26 #7a5636 #9e7650 |
| Slime Lord | Slime (: #0e3c8c #1a5cc8 #3c86ec | None | Arcane violet: #0c0a24 #20185a #3a2c96 #5c4cd0 #8a7cf0 #c4bcff | Slime (: #04102a #082456 #0e3c8c #1a5cc8 #3c86ec #86bcff #d8ecff; Blackened steel: #08080c #13131c #20202e #323246 #4c4c66 #76769a |
| Totem Master | Skin, medium: #6a3c28 #93583c #b87a56 | #100c14 #100c14 | Moss /: #0c1208 #1a2612 #2c3e1c #44582a #62763a #8e9c56 | Frost (: #0a1620 #16303e #285468 #3e7c94 #66a8c0 #a6d8e6 #e6f6fa; Verdigris bronze: #0e1412 #1c2a26 #2e4640 #46665c #6a8c7e #9ab8a6 |
| Wizard | Skin, light: #8c5038 #b8785a #dca484 | #262422 #827a70 | Night indigo: #0a0a18 #161a34 #242c52 #34406e #4c5c92 #7084b8 | Reliquary gold: #1a1006 #3a240c #63401a #8e6427 #b98e3c #dcbf6a #f4e3a6; Bone /: #1c1812 #3a3226 #5e5442 #8a7e66 #b4a88c #ddd2b6 #f2ecda |

## E. Pixel craft: do / don't (added formulation of source rules)

| Rule | Do | Don't |
|---|---|---|
| Grid | Use one integer AP scale and flat blocks. | Mix sizes, soften edges or average colors. |
| Clusters | Build clusters of 2+ AP; isolate only eye highlights or at most one glint/material area. | Scatter orphan pixels or grain. |
| Shading | Use broad midtone, 1-2 shadow bands, 1 highlight band. | Airbrush or pillow-shade. |
| Hue | Shift shadows toward indigo/wine and light toward ochre/ivory within selected ramps. | Shade by black/white gradients. |
| Outline | Character mode: 1 AP neighboring-material dark, broken on top-left. | Use thick or pure-black contour lines. |
| Manuscript mode | Shape beast/monster silhouettes with value and hue. | Trace their silhouette with a character outline. |
| Rim | Use segmented 1 AP #9fb4d4, #d4e2f4 on metal, back-right only. | Wrap a continuous bright contour or halo around everything. |
| Key light | Light top-left planes consistently. | Give adjacent objects contradictory highlights. |
| Dither | Use two colors as rough-material texture on under 10% of sprite area. | Dither skin, metal highlights or whole forms. |
| Anti-alias | At most one intermediate inner-edge step where necessary. | Blend an outside edge into magenta/transparency. |
| Curves | Use orderly 1-1-2-2-3 steps. | Add random stair lengths or doubled contour lines. |
| Detail | Use 3 big shapes, up to 6 medium shapes and 2 focal detail areas for armor. | Engrave every surface. |
| Emission | Put 1-3 AP bright core and 1-2 AP spread inside the silhouette. | Add bloom, smoke or detached decorative sparks. |
| Scale read | Check hero at 60 px tall and at AP/native output zoom. | Rely on fine ornament for identity. |

## Pattern and physical-construction review (added)

Before drawing, define one repeat unit, its pitch, row offset and direction. Repeat it unchanged on a flat plane; deform spacing consistently with perspective or cloth folds. For repair patches, damage can interrupt a repeat locally, but the underlying regular construction must remain legible. A regular pattern is not necessarily a seamless tile: only biome floors must join seamlessly.

Mail uses a compact 2-AP repeating cluster with alternate rows offset 1 AP at sprite scale; it represents interlocked rings, not vertical necklaces. Enlarged studies may show links, but the links must connect and row direction must agree. Leather stitches join actual edges; straps pass through buckles and leave an exit tail; rivets secure overlapping plates or lining edges. Cloth folds originate at support/tension points and hang with gravity; fur and hair grow from a root. Gem facets meet along shared edges; crystal faces belong to the same prism. Do not add physically meaningless fasteners or treat random texture as craftsmanship.

Review each image separately for (1) anatomy/fit and construction, (2) repetition and material/light logic, and (3) exact geometry/palette/pixel compliance. Revise identified defects and review again. Preserve versions and state remaining limitations; visual approval alone does not certify technical compliance. Use targeted changes and bounded image generations rather than an automatic unlimited loop.

## F. Material recipes (added exact role selections and repeat dimensions)

The role table is a menu, not an instruction to use all five distinct colors in every region. Skin and hair intentionally repeat roles to stay within three/two tones. Shared outline/rim colors count toward the asset budget. New repeat dimensions refine the source recipes for review.

| Sample | Outline / edge | Shadow | Mid | Light | Highlight | Construction |
|---|---|---|---|---|---|---|
| Grave steel | #0e1016 | #1c2230 | #46526a | #98a6bc | #d0d9e6 | 1 AP seams; 2x2 AP rivets, lit top-left/dark bottom-right; 1-2 AP top-left streak. Rivet pitch 6 AP along the securing edge; 3-6 short scratches per armor. |
| Mail | #0e1016 | #1c2230 | #2e3747 | #6a7891 | #98a6bc | Repeat a 2-AP cluster, alternate rows offset 1 AP. Keep links attached under a hem. Shade the whole plane, preserving the repeated unit. |
| Reliquary gold trim | #1a1006 | #3a240c | #8e6427 | #dcbf6a | #f4e3a6 | 1-2 AP trim, repeat arch/stamp every 6 AP; one 2-4 AP gem in a continuous bezel; at most one 1 AP glint per trim area. |
| Blackened steel | #08080c | #13131c | #20202e | #4c4c66 | #76769a | Overlap upper plate over lower with 1 AP seam; 2x2 AP rivets on side margins, regular 6 AP pitch. Use moon-rim #d4e2f4 only if budget permits. |
| Leather | #120c08 | #261a10 | #5a3e26 | #7a5636 | #9e7650 | 1 AP seam; 1 AP stitches every other AP, following seam. Strap top edge gets 1 AP highlight; buckle tongue and tail must connect. |
| Wine cloth | #12060a | #2a0c14 | #6e1e2a | #962c34 | #c04848 | Use three shading roles per cloth region, taper folds from attachment; 1-2 AP hem notches on worn pieces, not random holes. |
| Night indigo cloth | #0a0a18 | #161a34 | #34406e | #4c5c92 | #7084b8 | Three shading roles for folds; gold diamond motif 3x3 AP, 6 AP pitch along hem. Reuse gold ramp colors already in the sprite budget. |
| Wool | #16130f | #2c2720 | #4a4236 | #948870 | #bcb096 | Broad folded planes; 2-color weave/dither under 10% total sprite area. Repeat small weave units instead of pebble texture. |
| Bone | #1c1812 | #3a3226 | #8a7e66 | #ddd2b6 | #f2ecda | Openwork holes 3 AP across on 6 AP pitch, bridges at least 2 AP thick. Carving is structural rounded cutwork, not incidental skulls. |
| Fur | #121212 | #262422 | #5c5650 | #827a70 | #aaa094 | 3-5 AP tapered clumps pointing away from root; optional 2-color checker texture inside clumps only. |
| Light skin | #8c5038 | #8c5038 | #b8785a | #dca484 | #dca484 | Exactly three skin tones: shadow #8c5038, mid #b8785a, light #dca484; eye 2-3 AP dark, optional 1 AP glint counted in budget. |
| Medium skin | #6a3c28 | #6a3c28 | #93583c | #b87a56 | #b87a56 | Exactly three skin tones: shadow #6a3c28, mid #93583c, light #b87a56; no dither; brow/nose/chin shadows support anatomy. |
| Deep skin | #44261a | #44261a | #603826 | #7e4e36 | #7e4e36 | Exactly three skin tones: shadow #44261a, mid #603826, light #7e4e36; maintain readable planes without lightening the whole face. |
| Hair lock | #261a10 | #261a10 | #261a10 | #7a5636 | #7a5636 | Use only #261a10 and #7a5636 for this brown study; 3-4 major locks, rooted and tapering. Other classes use the two-color selections below. |
| Gem | #12060a | #2a0c14 | #6e1e2a | #962c34 | #c04848 | 2x2 to 4x4 AP gem, common facet vertices, 1 AP glint and optional 1-3 AP emissive core. Holy #fffae0 may replace a highlight within the budget. |
| Hellfire | #2a0800 | #5c1200 | #d45208 | #ffc458 | #fff2b8 | Connected flame base, tapering upward tongues; hot core 1-3 AP inside silhouette, no detached sparks or smoke. |
| Frost | #0a1620 | #16303e | #3e7c94 | #a6d8e6 | #e6f6fa | Connected hexagonal-prism study with shared planar edges; 1 AP facet highlight, no external glow. |
| Arcane | #0c0a24 | #20185a | #5c4cd0 | #8a7cf0 | #c4bcff | One closed abstract glyph, 1 AP core/highlight line with 1-2 AP internal color spread; no letters or floating satellites. |

## G. Rarity ladder



| Rarity | Look |
|---|---|
| Common | patched, mismatched, dented, frayed hems, rope belts, plain iron and leather, no trim |
| Uncommon | matched set, sturdier, riveted, simple bronze buckles, one modest motif |
| Rare | fitted and tailored, gilt or silver trim, layered plates, a heraldic or cult motif |
| Epic | ornate: engraved plate, embossed relief, gem settings, tabards with embroidery, asymmetric statement piece |
| Legendary | ceremonial and storied: reliquary plates, saint/demon iconography, one emissive accent (runes, an ember core) |
| Mythic | otherworldly: materials that should not exist (living bone, frozen flame, star-iron), strong emissive accent, a silhouette nobody else has |
## H. Class bible

The following is the full class reference, including face, hair, build, skin/underlayer selections and five examples for each gear slot. See the repeated class cards below; their (added) labels carry over.

## Arcane Sorcerer

Identity: a lean brown-haired bearded man in his forties, sharp nose, tired clever eyes.

Theatre: the court orrery-keeper: an astronomer who serves a mad prince. Signature contrast: violet / tarnished brass. Motif family: brass orbit rings on the shoulders, quilted silk over an armature, lens monocle charms.

Underlayer: a plum quilted arming doublet, grey linen shirt, dark trousers, soft brown shoes.

### Palette (added exact role choices)

- Skin/body: Skin, light; use #8c5038 #b8785a #dca484.
- Hair: #261a10 #7a5636.
- Base cloth pool: Wine / #12060a #2a0c14 #4a1420 #6e1e2a #962c34 #c04848.
- Accent pool: Arcane violet #0c0a24 #20185a #3a2c96 #5c4cd0 #8a7cf0 #c4bcff.
- Secondary material pool: Reliquary gold #1a1006 #3a240c #63401a #8e6427 #b98e3c #dcbf6a #f4e3a6.
- Neutral shirt/trousers pool: Wool #16130f #2c2720 #4a4236 #6c6252 #948870 #bcb096; shoes/straps pool: Leather #120c08 #261a10 #3e2a1a #5a3e26 #7a5636 #9e7650.
- Outline/rim pool shared within the budget: #07060a #100c14 #1a1220; #6f84a8 #9fb4d4 #d4e2f4.

The costume color words above remain the target: choose muted pool steps, not every ramp color. Plum/purple cloth uses dark Arcane/Wine steps with no emission; grey/cream uses Wool/Bone. Black uses Blackened steel/Shadow ink without metal highlights. For pale skin do not substitute undead green; keep the pack's Skin light selection. (added)

### Ten armor ideas

1. Common: astrologer-clerk; material twist: felted wool; silhouette hook: layered capelets.
2. Uncommon: organ-builder; material twist: riveted copper; silhouette hook: high funnel collar.
3. Rare: court duelist; material twist: quilted silk over mail; silhouette hook: one giant pauldron carrying a brass orbit ring.
4. Epic: cathedral cantor; material twist: stained-glass shards in lead; silhouette hook: bell-shaped coat.
5. Legendary: reliquary bearer; material twist: reliquary glass with a tiny trapped star inside; silhouette hook: a hump of orrery gear on the back.
6. Common: Patched lens-cleaner apron with short split hem. (added)
7. Uncommon: Copper-ribbed observatory waistcoat. (added)
8. Rare: Star-chart quilted skirt with brass clasps. (added)
9. Epic: One-shoulder eclipse capelet with enamel aperture. (added)
10. Mythic: Suspended-orbit cuirass of dark glass. (added)

### Five helmet motifs

1. astronomer cap with lens.
2. brass armillary circlet over a hood.
3. porcelain half-mask helm.
4. funnel-collar bascinet.
5. crown of tiny orbiting rings.

### Five glove motifs

1. quilted silk mitts.
2. brass-knuckled engraver gloves.
3. lens-cuff gauntlets.
4. ink-stained clerk gloves.
5. armillary bracers.

### Five boot motifs

1. felt-wrapped pilgrim boots.
2. brass-buckled riding boots.
3. quilted greaves.
4. stilt-heeled court shoes with spats.
5. star-chart greaves.

Overlay rarities left-to-right: Common, Uncommon, Rare, Epic, Legendary. Motifs must remain inside the extraction zone; hats, masks and hoods occur only as overlays. A circlet described as orbiting uses attached ornament and no detached lights. A tiny feather/quill must be a silhouette cluster, not a loose weapon. (added)

## Barbarian

Identity: a powerful muscular adult man with short cropped red hair, a broad square jaw, male pectoral chest, freckles, a broken nose and a fierce grin (user correction: no breasts, no long hair, full masculine chest armor).

Theatre: the champion of a frozen fighting-pit carnival. Signature contrast: rust red / glacier teal. Motif family: fur over hooped iron ribs, prize ribbons and medals, trophy straps, bare scarred arms.

Underlayer: a rust-red wool wrap tunic, hide trousers, fur-cuffed shoes, bare arms.

### Palette (added exact role choices)

- Skin/body: Skin, light; use #8c5038 #b8785a #dca484.
- Hair: #2a0c14 #962c34.
- Base cloth pool: Wine / #12060a #2a0c14 #4a1420 #6e1e2a #962c34 #c04848.
- Accent pool: Frost ( #0a1620 #16303e #285468 #3e7c94 #66a8c0 #a6d8e6 #e6f6fa.
- Secondary material pool: Leather #120c08 #261a10 #3e2a1a #5a3e26 #7a5636 #9e7650.
- Neutral shirt/trousers pool: Wool #16130f #2c2720 #4a4236 #6c6252 #948870 #bcb096; shoes/straps pool: Leather #120c08 #261a10 #3e2a1a #5a3e26 #7a5636 #9e7650.
- Outline/rim pool shared within the budget: #07060a #100c14 #1a1220; #6f84a8 #9fb4d4 #d4e2f4.

The costume color words above remain the target: choose muted pool steps, not every ramp color. Plum/purple cloth uses dark Arcane/Wine steps with no emission; grey/cream uses Wool/Bone. Black uses Blackened steel/Shadow ink without metal highlights. For pale skin do not substitute undead green; keep the pack's Skin light selection. (added)

### Ten armor ideas

1. Common: salt miner; material twist: braided horsehair; silhouette hook: crossed bandoliers.
2. Uncommon: circus strongman; material twist: riveted copper; silhouette hook: hooped iron ribs over a fur sash.
3. Rare: kennel master; material twist: felted wool; silhouette hook: one giant fur pauldron.
4. Epic: executioner's apprentice; material twist: cracked enamel prize medals; silhouette hook: a train of tattered prize ribbons.
5. Legendary: saint's-day processional; material twist: frozen glass reliquary on the chest; silhouette hook: a chimney collar of icicle-iron.
6. Common: Stitched prizefighter apron with one hide panel. (added)
7. Uncommon: Matched carnival rib harness with ribbon rosette. (added)
8. Rare: Fitted glacial-felt pit coat with bronze medals. (added)
9. Epic: Asymmetric judge-of-the-pit mantle. (added)
10. Mythic: Frozen-flame hoop cuirass with a single thawing core. (added)

### Five helmet motifs

1. iron muzzle-helm.
2. horned fur cap.
3. carnival champion's crown-helm.
4. ice-crusted bascinet.
5. wolf-skull hood (jaw only, no skull pauldron).

### Five glove motifs

1. bare knuckle wraps.
2. riveted pit gauntlets.
3. fur mittens with iron claws.
4. prize-ribbon cuffs.
5. ice-glass gauntlets.

### Five boot motifs

1. fur leg-wraps.
2. hooped iron greaves.
3. spiked pit boots (toes only).
4. felt boots with ribbon ties.
5. glacier-iron sabatons.

Overlay rarities left-to-right: Common, Uncommon, Rare, Epic, Legendary. Motifs must remain inside the extraction zone; hats, masks and hoods occur only as overlays. A circlet described as orbiting uses attached ornament and no detached lights. A tiny feather/quill must be a silhouette cluster, not a loose weapon. (added)

## Bard

Identity: a curly dark-haired bearded man with a theatrical moustache, warm brown eyes, a roguish smile.

Theatre: the touring tragedian of a cursed opera company. Signature contrast: wine / saffron. Motif family: slashed doublets, stage capes, ruffs, mask charms, score-sheet sashes.

Underlayer: a burgundy wool doublet with slashed sleeves, cream shirt, charcoal trousers, buckled shoes.

### Palette (added exact role choices)

- Skin/body: Skin, medium; use #6a3c28 #93583c #b87a56.
- Hair: #100c14 #100c14.
- Base cloth pool: Wine / #12060a #2a0c14 #4a1420 #6e1e2a #962c34 #c04848.
- Accent pool: Holy ( #2a2008 #5a4814 #9a8428 #d4bc48 #f2e08a #fffae0.
- Secondary material pool: Reliquary gold #1a1006 #3a240c #63401a #8e6427 #b98e3c #dcbf6a #f4e3a6.
- Neutral shirt/trousers pool: Wool #16130f #2c2720 #4a4236 #6c6252 #948870 #bcb096; shoes/straps pool: Leather #120c08 #261a10 #3e2a1a #5a3e26 #7a5636 #9e7650.
- Outline/rim pool shared within the budget: #07060a #100c14 #1a1220; #6f84a8 #9fb4d4 #d4e2f4.

The costume color words above remain the target: choose muted pool steps, not every ramp color. Plum/purple cloth uses dark Arcane/Wine steps with no emission; grey/cream uses Wool/Bone. Black uses Blackened steel/Shadow ink without metal highlights. For pale skin do not substitute undead green; keep the pack's Skin light selection. (added)

### Ten armor ideas

1. Common: mummer; material twist: tallow-stained linen; silhouette hook: cape worn on one shoulder.
2. Uncommon: lamplighter; material twist: tin votive charms; silhouette hook: crossed bandoliers of candles.
3. Rare: opera villain; material twist: tarnished silver filigree; silhouette hook: high ruffed collar.
4. Epic: court duelist; material twist: quilted silk over mail; silhouette hook: split tabard to the ankles printed with a torn score.
5. Legendary: organ-builder; material twist: brass bellows and pipes; silhouette hook: a hump of organ pipes on the back.
6. Common: Patched stagehand doublet with score-strip cuffs. (added)
7. Uncommon: Matched prompter coat with brass buttons. (added)
8. Rare: Tailored harlequin-panel surcoat with sober wine blocks. (added)
9. Epic: Asymmetric conductor cape and enamel brooch. (added)
10. Mythic: Silent-opera coat of folded resonant glass. (added)

### Five helmet motifs

1. feathered tricorn.
2. half-mask helm.
3. a ruffed bascinet.
4. laurel-and-iron circlet.
5. stage-crown helm.

### Five glove motifs

1. fingerless lute gloves.
2. lace-cuffed gauntlets.
3. ring-heavy court gloves.
4. bell-tasselled mitts.
5. silver-wire gauntlets.

### Five boot motifs

1. buckled stage shoes with spats.
2. cuffed riding boots.
3. striped mummer hose with greaves.
4. tasselled boots.
5. silver-filigree sabatons.

Overlay rarities left-to-right: Common, Uncommon, Rare, Epic, Legendary. Motifs must remain inside the extraction zone; hats, masks and hoods occur only as overlays. A circlet described as orbiting uses attached ornament and no detached lights. A tiny feather/quill must be a silhouette cluster, not a loose weapon. (added)

## Boomerang Knight

Identity: a compact short black-haired woman with a sharp jaw, narrow focused eyes, a scar through one eyebrow.

Theatre: the falconer-courier of a border kingdom. Signature contrast: teal / copper. Motif family: crescent pauldrons, gauntlet cuffs, flight-feather fringes, layered capelets.

Underlayer: a teal padded gambeson, grey shirt, leather trousers, soft courier boots.

### Palette (added exact role choices)

- Skin/body: Skin, medium; use #6a3c28 #93583c #b87a56.
- Hair: #100c14 #100c14.
- Base cloth pool: Verdigris bronze #0e1412 #1c2a26 #2e4640 #46665c #6a8c7e #9ab8a6.
- Accent pool: Reliquary gold #1a1006 #3a240c #63401a #8e6427 #b98e3c #dcbf6a #f4e3a6.
- Secondary material pool: Leather #120c08 #261a10 #3e2a1a #5a3e26 #7a5636 #9e7650.
- Neutral shirt/trousers pool: Wool #16130f #2c2720 #4a4236 #6c6252 #948870 #bcb096; shoes/straps pool: Leather #120c08 #261a10 #3e2a1a #5a3e26 #7a5636 #9e7650.
- Outline/rim pool shared within the budget: #07060a #100c14 #1a1220; #6f84a8 #9fb4d4 #d4e2f4.

The costume color words above remain the target: choose muted pool steps, not every ramp color. Plum/purple cloth uses dark Arcane/Wine steps with no emission; grey/cream uses Wool/Bone. Black uses Blackened steel/Shadow ink without metal highlights. For pale skin do not substitute undead green; keep the pack's Skin light selection. (added)

### Ten armor ideas

1. Common: ferryman; material twist: braided horsehair; silhouette hook: layered capelets.
2. Uncommon: falconer; material twist: riveted copper; silhouette hook: one giant crescent pauldron.
3. Rare: toll-gate warden; material twist: lacquered wood; silhouette hook: crossed bandoliers with courier tubes.
4. Epic: cartographer; material twist: cracked enamel crescents; silhouette hook: a train of flight feathers from the belt.
5. Legendary: saint's-day processional; material twist: tarnished silver filigree wings; silhouette hook: stilt-like greaves.
6. Common: Repaired message-runner vest with felt shoulder flap. (added)
7. Uncommon: Matched falconry quilt with copper toggles. (added)
8. Rare: Tailored crescent courier coat with flight-feather hem. (added)
9. Epic: One-shoulder herald cape with leaded-glass badge. (added)
10. Mythic: Wind-lamellar coat of lacquered paper crescents. (added)

### Five helmet motifs

1. falconer's hood (face open).
2. crescent-crest sallet.
3. courier cap with goggles.
4. copper winged helm.
5. lacquered half-helm.

### Five glove motifs

1. falconry gauntlet with perch cuff.
2. copper crescent gauntlets.
3. feather-fringed gloves.
4. courier mitts.
5. lacquered gauntlets.

### Five boot motifs

1. courier boots with feather spurs.
2. crescent greaves.
3. wrapped runner boots.
4. copper sabatons.
5. lacquered greaves.

Overlay rarities left-to-right: Common, Uncommon, Rare, Epic, Legendary. Motifs must remain inside the extraction zone; hats, masks and hoods occur only as overlays. A circlet described as orbiting uses attached ornament and no detached lights. A tiny feather/quill must be a silhouette cluster, not a loose weapon. (added)

## Carrion Witch

Identity: a gaunt pale woman with very long grey hair, hollow cheeks, pale eyes and dark lips.

Theatre: the crow-wife who sings at plague funerals. Signature contrast: ash grey / bruise violet. Motif family: feathered capelets, funeral veils on the shoulders, ossuary charms on cords, ragged hems.

Underlayer: a charcoal linen shift, grey wool shawl, dark stockings, worn shoes.

### Palette (added exact role choices)

- Skin/body: Skin, light; use #8c5038 #b8785a #dca484.
- Hair: #262422 #827a70.
- Base cloth pool: Blackened steel #08080c #13131c #20202e #323246 #4c4c66 #76769a.
- Accent pool: Arcane violet #0c0a24 #20185a #3a2c96 #5c4cd0 #8a7cf0 #c4bcff.
- Secondary material pool: Bone / #1c1812 #3a3226 #5e5442 #8a7e66 #b4a88c #ddd2b6 #f2ecda.
- Neutral shirt/trousers pool: Wool #16130f #2c2720 #4a4236 #6c6252 #948870 #bcb096; shoes/straps pool: Leather #120c08 #261a10 #3e2a1a #5a3e26 #7a5636 #9e7650.
- Outline/rim pool shared within the budget: #07060a #100c14 #1a1220; #6f84a8 #9fb4d4 #d4e2f4.

The costume color words above remain the target: choose muted pool steps, not every ramp color. Plum/purple cloth uses dark Arcane/Wine steps with no emission; grey/cream uses Wool/Bone. Black uses Blackened steel/Shadow ink without metal highlights. For pale skin do not substitute undead green; keep the pack's Skin light selection. (added)

### Ten armor ideas

1. Common: funeral mute; material twist: felted wool; silhouette hook: a train of tattered ribbons.
2. Uncommon: plague-hospital orderly; material twist: wax-sealed parchment strips; silhouette hook: layered capelets.
3. Rare: coffin-maker; material twist: bone lacework; silhouette hook: high funnel collar of crow feathers.
4. Epic: cathedral cantor; material twist: tin votive charms; silhouette hook: bell-shaped coat.
5. Legendary: reliquary bearer; material twist: reliquary glass with a crow skull inside; silhouette hook: cape worn on one shoulder.
6. Common: Patched shroud-tender apron with wool ties. (added)
7. Uncommon: Matched funeral-singer coat with bone toggles. (added)
8. Rare: Tailored plague-choir shoulder veil and narrow gown. (added)
9. Epic: Asymmetric ossuary cape with porcelain mourning clasp. (added)
10. Mythic: Living-bone lace mantle holding one violet ember. (added)

### Five helmet motifs

1. veiled funeral crown.
2. crow-beak plague mask.
3. bone-lace hood (face open).
4. feather headdress.
5. iron mourning circlet.

### Five glove motifs

1. black lace gloves with long nails.
2. bone-knuckle gauntlets.
3. wax-dripped mitts.
4. feather-cuff gloves.
5. iron claw rings.

### Five boot motifs

1. mourning boots with buckles.
2. feather-wrapped greaves.
3. rag-bound feet.
4. bone-lace sabatons.
5. iron pattens.

Overlay rarities left-to-right: Common, Uncommon, Rare, Epic, Legendary. Motifs must remain inside the extraction zone; hats, masks and hoods occur only as overlays. A circlet described as orbiting uses attached ornament and no detached lights. A tiny feather/quill must be a silhouette cluster, not a loose weapon. (added)

## Death Knight

Identity: a pale stern man with close-cropped black hair, a hard jaw, dark-circled grey eyes.

Theatre: the last honour guard of a drowned mausoleum. Signature contrast: blackened steel / cold cyan. Motif family: tomb-lid plates, funeral sashes, verdigris tears, hourglass buckles.

Underlayer: a black quilted arming doublet, grey shirt, dark trousers, plain boots.

### Palette (added exact role choices)

- Skin/body: Skin, light; use #8c5038 #b8785a #dca484.
- Hair: #100c14 #100c14.
- Base cloth pool: Blackened steel #08080c #13131c #20202e #323246 #4c4c66 #76769a.
- Accent pool: Frost ( #0a1620 #16303e #285468 #3e7c94 #66a8c0 #a6d8e6 #e6f6fa.
- Secondary material pool: Verdigris bronze #0e1412 #1c2a26 #2e4640 #46665c #6a8c7e #9ab8a6.
- Neutral shirt/trousers pool: Wool #16130f #2c2720 #4a4236 #6c6252 #948870 #bcb096; shoes/straps pool: Leather #120c08 #261a10 #3e2a1a #5a3e26 #7a5636 #9e7650.
- Outline/rim pool shared within the budget: #07060a #100c14 #1a1220; #6f84a8 #9fb4d4 #d4e2f4.

The costume color words above remain the target: choose muted pool steps, not every ramp color. Plum/purple cloth uses dark Arcane/Wine steps with no emission; grey/cream uses Wool/Bone. Black uses Blackened steel/Shadow ink without metal highlights. For pale skin do not substitute undead green; keep the pack's Skin light selection. (added)

### Ten armor ideas

1. Common: ferryman; material twist: tallow-stained linen; silhouette hook: split tabard to the ankles.
2. Uncommon: bell-ringer; material twist: riveted copper gone green; silhouette hook: high funnel collar.
3. Rare: funeral mute; material twist: cracked enamel; silhouette hook: tomb-lid breastplate as a bell-shaped coat.
4. Epic: siege engineer; material twist: reliquary glass; silhouette hook: one giant pauldron shaped like a coffin lid.
5. Legendary: saint's-day processional; material twist: stained-glass shards in lead; silhouette hook: cape worn on one shoulder.
6. Common: Repaired vault-attendant quilt with slate sash. (added)
7. Uncommon: Matched tomb-keeper lamellar with hourglass clasp. (added)
8. Rare: Tailored drowned-court cuirass with verdigris edging. (added)
9. Epic: One-sided mausoleum pall over engraved plate. (added)
10. Mythic: Waterglass tomb-plate with a captive cold core. (added)

### Five helmet motifs

1. drowned great-helm with verdigris.
2. hourglass-crested armet.
3. mourning sallet.
4. tomb-angel helm.
5. iron veil helm.

### Five glove motifs

1. black gauntlets with cyan inlay.
2. funeral-sash wrapped gloves.
3. coffin-nail knuckles.
4. verdigris gauntlets.
5. chain mitts.

### Five boot motifs

1. barnacled sabatons.
2. black greaves with sash ties.
3. tomb-plate boots.
4. drowned riding boots.
5. hourglass-buckle boots.

Overlay rarities left-to-right: Common, Uncommon, Rare, Epic, Legendary. Motifs must remain inside the extraction zone; hats, masks and hoods occur only as overlays. A circlet described as orbiting uses attached ornament and no detached lights. A tiny feather/quill must be a silhouette cluster, not a loose weapon. (added)

## Dragon Knight

Identity: a fierce auburn-haired woman with braids, amber eyes, a strong chin and burn scars on one cheek.

Theatre: the scale-smith of a dragon-worship cult. Signature contrast: copper red / sea green. Motif family: overlapping scale lamellar, wing-rib pauldrons, ember-glass buckles.

Underlayer: a wine-red gambeson, cream shirt, leather trousers, copper-buckled boots.

### Palette (added exact role choices)

- Skin/body: Skin, light; use #8c5038 #b8785a #dca484.
- Hair: #261a10 #7a5636.
- Base cloth pool: Wine / #12060a #2a0c14 #4a1420 #6e1e2a #962c34 #c04848.
- Accent pool: Verdigris bronze #0e1412 #1c2a26 #2e4640 #46665c #6a8c7e #9ab8a6.
- Secondary material pool: Reliquary gold #1a1006 #3a240c #63401a #8e6427 #b98e3c #dcbf6a #f4e3a6.
- Neutral shirt/trousers pool: Wool #16130f #2c2720 #4a4236 #6c6252 #948870 #bcb096; shoes/straps pool: Leather #120c08 #261a10 #3e2a1a #5a3e26 #7a5636 #9e7650.
- Outline/rim pool shared within the budget: #07060a #100c14 #1a1220; #6f84a8 #9fb4d4 #d4e2f4.

The costume color words above remain the target: choose muted pool steps, not every ramp color. Plum/purple cloth uses dark Arcane/Wine steps with no emission; grey/cream uses Wool/Bone. Black uses Blackened steel/Shadow ink without metal highlights. For pale skin do not substitute undead green; keep the pack's Skin light selection. (added)

### Ten armor ideas

1. Common: tannery foreman; material twist: braided horsehair; silhouette hook: crossed bandoliers.
2. Uncommon: glassblower; material twist: riveted copper; silhouette hook: high funnel collar.
3. Rare: siege engineer; material twist: lacquered wood; silhouette hook: wing-rib pauldron on one shoulder.
4. Epic: saint's-day processional; material twist: cracked enamel scales; silhouette hook: split tabard to the ankles.
5. Legendary: reliquary bearer; material twist: ember-glass reliquary with a dragon tooth; silhouette hook: a hump of folded wing-plates on the back.
6. Common: Patched kiln-worker gambeson with copper scraps. (added)
7. Uncommon: Matched scale-apprentice coat with enamel toggles. (added)
8. Rare: Tailored cult-smith lamellar with sea-green trim. (added)
9. Epic: Asymmetric kiln-master shoulder with ember-glass buckle. (added)
10. Mythic: Living-copper scales grown over frozen flame. (added)

### Five helmet motifs

1. scale sallet with fin crest.
2. horned copper helm.
3. ember-glass visor helm.
4. braided-cord circlet with fangs.
5. wing-rib helm.

### Five glove motifs

1. scale gauntlets.
2. smith's heat gloves.
3. copper claw gauntlets.
4. ember-glass knuckles.
5. sea-green enamel gauntlets.

### Five boot motifs

1. scale greaves.
2. smith's boots.
3. copper sabatons with claws.
4. wing-rib greaves.
5. ember-glass boots.

Overlay rarities left-to-right: Common, Uncommon, Rare, Epic, Legendary. Motifs must remain inside the extraction zone; hats, masks and hoods occur only as overlays. A circlet described as orbiting uses attached ornament and no detached lights. A tiny feather/quill must be a silhouette cluster, not a loose weapon. (added)

## Dragoon

Identity: a lean black-haired man with a tied-back ponytail, hawkish features and calm dark eyes.

Theatre: the cliff-temple jumper who serves a sky shrine. Signature contrast: slate blue / burgundy. Motif family: angular wing-edged plates, stilt greaves, long split tabards, prayer flags.

Underlayer: a slate-blue quilted doublet, white shirt, grey trousers, wrapped boots.

### Palette (added exact role choices)

- Skin/body: Skin, medium; use #6a3c28 #93583c #b87a56.
- Hair: #100c14 #100c14.
- Base cloth pool: Grave steel #0e1016 #1c2230 #2e3747 #46526a #6a7891 #98a6bc #d0d9e6.
- Accent pool: Wine / #12060a #2a0c14 #4a1420 #6e1e2a #962c34 #c04848.
- Secondary material pool: Night indigo #0a0a18 #161a34 #242c52 #34406e #4c5c92 #7084b8.
- Neutral shirt/trousers pool: Wool #16130f #2c2720 #4a4236 #6c6252 #948870 #bcb096; shoes/straps pool: Leather #120c08 #261a10 #3e2a1a #5a3e26 #7a5636 #9e7650.
- Outline/rim pool shared within the budget: #07060a #100c14 #1a1220; #6f84a8 #9fb4d4 #d4e2f4.

The costume color words above remain the target: choose muted pool steps, not every ramp color. Plum/purple cloth uses dark Arcane/Wine steps with no emission; grey/cream uses Wool/Bone. Black uses Blackened steel/Shadow ink without metal highlights. For pale skin do not substitute undead green; keep the pack's Skin light selection. (added)

### Ten armor ideas

1. Common: pilgrim-penitent; material twist: felted wool; silhouette hook: a train of prayer-flag ribbons.
2. Uncommon: bell-ringer; material twist: riveted copper; silhouette hook: stilt-like greaves.
3. Rare: cathedral cantor; material twist: lacquered wood; silhouette hook: split tabard to the ankles.
4. Epic: falconer; material twist: tarnished silver filigree; silhouette hook: wing-edged pauldrons.
5. Legendary: saint's-day processional; material twist: stained-glass shards in lead; silhouette hook: high funnel collar.
6. Common: Patched cliff-porters quilt with rope sash. (added)
7. Uncommon: Matched shrine-keeper vest with slate tassets. (added)
8. Rare: Tailored prayer-panel coat with burgundy lining. (added)
9. Epic: One-shoulder wind-bell mantle with angular plates. (added)
10. Mythic: Cloudstone stilt greaves beneath star-iron tabard. (added)

### Five helmet motifs

1. beaked shrine helm.
2. crested sallet.
3. prayer-flag circlet.
4. wing-eared armet.
5. lacquered mask helm.

### Five glove motifs

1. wing-edged gauntlets.
2. wrapped climbing gloves.
3. silver filigree gauntlets.
4. prayer-bead cuffs.
5. lacquered mitts.

### Five boot motifs

1. stilt greaves.
2. wrapped climbing boots.
3. wing-spurred sabatons.
4. prayer-flag greaves.
5. silver-filigree boots.

Overlay rarities left-to-right: Common, Uncommon, Rare, Epic, Legendary. Motifs must remain inside the extraction zone; hats, masks and hoods occur only as overlays. A circlet described as orbiting uses attached ornament and no detached lights. A tiny feather/quill must be a silhouette cluster, not a loose weapon. (added)

## Gunner

Identity: a dark-haired man with a big waxed moustache, soot on his face, squinting eyes.

Theatre: the powder-engineer of a magitek artillery corps. Signature contrast: charcoal / brass and scarlet. Motif family: long coats with gauges, bandoliers of cartridges, bellows packs, goggles worn on the chest (never on the head).

Underlayer: a charcoal wool waistcoat over a grey shirt, dark trousers, scuffed boots, red neck scarf.

### Palette (added exact role choices)

- Skin/body: Skin, medium; use #6a3c28 #93583c #b87a56.
- Hair: #100c14 #100c14.
- Base cloth pool: Blackened steel #08080c #13131c #20202e #323246 #4c4c66 #76769a.
- Accent pool: Reliquary gold #1a1006 #3a240c #63401a #8e6427 #b98e3c #dcbf6a #f4e3a6.
- Secondary material pool: Wine / #12060a #2a0c14 #4a1420 #6e1e2a #962c34 #c04848.
- Neutral shirt/trousers pool: Wool #16130f #2c2720 #4a4236 #6c6252 #948870 #bcb096; shoes/straps pool: Leather #120c08 #261a10 #3e2a1a #5a3e26 #7a5636 #9e7650.
- Outline/rim pool shared within the budget: #07060a #100c14 #1a1220; #6f84a8 #9fb4d4 #d4e2f4.

The costume color words above remain the target: choose muted pool steps, not every ramp color. Plum/purple cloth uses dark Arcane/Wine steps with no emission; grey/cream uses Wool/Bone. Black uses Blackened steel/Shadow ink without metal highlights. For pale skin do not substitute undead green; keep the pack's Skin light selection. (added)

### Ten armor ideas

1. Common: chimney-sweep guild; material twist: tallow-stained linen; silhouette hook: crossed bandoliers.
2. Uncommon: siege engineer; material twist: brass bellows and gauges; silhouette hook: a hump of gear on the back.
3. Rare: toll-gate warden; material twist: riveted copper; silhouette hook: bell-shaped long coat.
4. Epic: magitek engineer; material twist: cracked enamel; silhouette hook: one giant pauldron with a pressure gauge.
5. Legendary: opera villain; material twist: tarnished silver filigree; silhouette hook: high funnel collar.
6. Common: Repaired powder-store apron with wool pockets. (added)
7. Uncommon: Matched bellows-tender vest with copper clips. (added)
8. Rare: Tailored gauge-reader coat with scarlet inset. (added)
9. Epic: Asymmetric foundry-inspector mantle with porcelain dial. (added)
10. Mythic: Pressure-glass coat around one sealed furnace core. (added)

### Five helmet motifs

1. brass diving-style bascinet (face window).
2. soot top hat with goggles.
3. magitek visor helm.
4. felt shako.
5. gauge-crested helm.

### Five glove motifs

1. powder-burnt gauntlets.
2. brass-knuckled engineer gloves.
3. quilted loading mitts.
4. gauge-cuff gauntlets.
5. red-silk dress gloves.

### Five boot motifs

1. hobnailed boots.
2. brass-buckled jackboots.
3. quilted gaiters.
4. magitek piston greaves.
5. spatterdashes.

Overlay rarities left-to-right: Common, Uncommon, Rare, Epic, Legendary. Motifs must remain inside the extraction zone; hats, masks and hoods occur only as overlays. A circlet described as orbiting uses attached ornament and no detached lights. A tiny feather/quill must be a silhouette cluster, not a loose weapon. (added)

## Lancer

Identity: a large broad-shouldered man with short brown hair, a square jaw, heavy brows and a calm stare.

Theatre: the bastion-warden who holds a siege gate. Signature contrast: iron grey / heraldic ochre. Motif family: fortress-tower pauldrons, gate-bar plates, portcullis motifs, heavy tasset skirts.

Underlayer: a grey arming doublet, linen shirt, thick trousers, heavy boots.

### Palette (added exact role choices)

- Skin/body: Skin, light; use #8c5038 #b8785a #dca484.
- Hair: #261a10 #7a5636.
- Base cloth pool: Grave steel #0e1016 #1c2230 #2e3747 #46526a #6a7891 #98a6bc #d0d9e6.
- Accent pool: Holy ( #2a2008 #5a4814 #9a8428 #d4bc48 #f2e08a #fffae0.
- Secondary material pool: Reliquary gold #1a1006 #3a240c #63401a #8e6427 #b98e3c #dcbf6a #f4e3a6.
- Neutral shirt/trousers pool: Wool #16130f #2c2720 #4a4236 #6c6252 #948870 #bcb096; shoes/straps pool: Leather #120c08 #261a10 #3e2a1a #5a3e26 #7a5636 #9e7650.
- Outline/rim pool shared within the budget: #07060a #100c14 #1a1220; #6f84a8 #9fb4d4 #d4e2f4.

The costume color words above remain the target: choose muted pool steps, not every ramp color. Plum/purple cloth uses dark Arcane/Wine steps with no emission; grey/cream uses Wool/Bone. Black uses Blackened steel/Shadow ink without metal highlights. For pale skin do not substitute undead green; keep the pack's Skin light selection. (added)

### Ten armor ideas

1. Common: salt miner; material twist: braided horsehair; silhouette hook: heavy tasset skirt.
2. Uncommon: toll-gate warden; material twist: riveted copper; silhouette hook: portcullis breastplate.
3. Rare: siege engineer; material twist: lacquered wood; silhouette hook: fortress-tower pauldrons.
4. Epic: saint's-day processional; material twist: cracked enamel heraldry; silhouette hook: split tabard to the ankles.
5. Legendary: bell-ringer; material twist: reliquary glass with a gate key inside; silhouette hook: a hump of bell-tower gear on the back.
6. Common: Patched toll-house quilt with salvaged gate plate. (added)
7. Uncommon: Matched bridge-warden coat with ochre bindings. (added)
8. Rare: Tailored portcullis cuirass with layered gate tassets. (added)
9. Epic: Asymmetric bastion shoulder and embroidered oath sash. (added)
10. Mythic: Star-iron gate lattice with impossible inward arches. (added)

### Five helmet motifs

1. tower great-helm.
2. portcullis-visor armet.
3. crenellated crown helm.
4. ochre-plumed sallet.
5. bell-shaped bascinet.

### Five glove motifs

1. gate-bar gauntlets.
2. heavy mitten gauntlets.
3. ochre heraldic gauntlets.
4. chain-cuffed gloves.
5. tower-knuckle gauntlets.

### Five boot motifs

1. bastion sabatons.
2. gate-bar greaves.
3. heavy riding boots.
4. ochre-banded greaves.
5. tower-plinth boots.

Overlay rarities left-to-right: Common, Uncommon, Rare, Epic, Legendary. Motifs must remain inside the extraction zone; hats, masks and hoods occur only as overlays. A circlet described as orbiting uses attached ornament and no detached lights. A tiny feather/quill must be a silhouette cluster, not a loose weapon. (added)

## Necromancer

Identity: a pale bald man with sunken grey eyes, ink-stained fingers and a thin cruel mouth.

Theatre: the archive keeper of a forbidden ossuary-library. Signature contrast: soot black / sickly gold. Motif family: ledger-plates, bone lacework, wax-seal strips, index-tab sashes, ink-stained cuffs.

Underlayer: a black wool cassock, grey shirt, dark trousers, soft archive slippers.

### Palette (added exact role choices)

- Skin/body: Skin, light; use #8c5038 #b8785a #dca484.
- Hair: none; do not add hair.
- Base cloth pool: Blackened steel #08080c #13131c #20202e #323246 #4c4c66 #76769a.
- Accent pool: Reliquary gold #1a1006 #3a240c #63401a #8e6427 #b98e3c #dcbf6a #f4e3a6.
- Secondary material pool: Bone / #1c1812 #3a3226 #5e5442 #8a7e66 #b4a88c #ddd2b6 #f2ecda.
- Neutral shirt/trousers pool: Wool #16130f #2c2720 #4a4236 #6c6252 #948870 #bcb096; shoes/straps pool: Leather #120c08 #261a10 #3e2a1a #5a3e26 #7a5636 #9e7650.
- Outline/rim pool shared within the budget: #07060a #100c14 #1a1220; #6f84a8 #9fb4d4 #d4e2f4.

The costume color words above remain the target: choose muted pool steps, not every ramp color. Plum/purple cloth uses dark Arcane/Wine steps with no emission; grey/cream uses Wool/Bone. Black uses Blackened steel/Shadow ink without metal highlights. For pale skin do not substitute undead green; keep the pack's Skin light selection. (added)

### Ten armor ideas

1. Common: archive keeper; material twist: wax-sealed parchment strips; silhouette hook: layered capelets.
2. Uncommon: coffin-maker; material twist: lacquered wood; silhouette hook: high funnel collar.
3. Rare: cathedral cantor; material twist: bone lacework; silhouette hook: split tabard to the ankles.
4. Epic: astrologer-clerk; material twist: tarnished silver filigree; silhouette hook: bell-shaped coat.
5. Legendary: reliquary bearer; material twist: reliquary glass with a heart inside; silhouette hook: a train of index-tab ribbons.
6. Common: Patched cataloguer cassock with index hem. (added)
7. Uncommon: Matched bookbinder coat with bone toggles. (added)
8. Rare: Tailored ledger-panel robe with sealed pockets. (added)
9. Epic: One-shoulder archive pall with glass reliquary buckle. (added)
10. Mythic: Living parchment coat with bone-spine ribs. (added)

### Five helmet motifs

1. archivist's skullcap.
2. bone-lace crown.
3. wax-sealed hood (face open).
4. gold-gilt mitre helm.
5. ledger-plate helm.

### Five glove motifs

1. ink-stained gloves.
2. bone-lace gauntlets.
3. gold-ring clerk gloves.
4. wax-sealed mitts.
5. ledger-plate gauntlets.

### Five boot motifs

1. archive slippers with spats.
2. bone-lace greaves.
3. wax-strip wrapped boots.
4. gold-gilt sabatons.
5. ledger-plate boots.

Overlay rarities left-to-right: Common, Uncommon, Rare, Epic, Legendary. Motifs must remain inside the extraction zone; hats, masks and hoods occur only as overlays. A circlet described as orbiting uses attached ornament and no detached lights. A tiny feather/quill must be a silhouette cluster, not a loose weapon. (added)

## Paladin

Identity: a dark-skinned man with close-cropped dark hair and a full beard, kind but hard eyes, a broad nose.

Theatre: the saint's-day processional guard of a sun cathedral. Signature contrast: silver / navy and gold. Motif family: sunburst gorgets, processional banners on the back, reliquary-glass chest plates.

Underlayer: a navy padded gambeson, white shirt, dark trousers, plain leather boots.

### Palette (added exact role choices)

- Skin/body: Skin, deep; use #44261a #603826 #7e4e36.
- Hair: #100c14 #100c14.
- Base cloth pool: Night indigo #0a0a18 #161a34 #242c52 #34406e #4c5c92 #7084b8.
- Accent pool: Reliquary gold #1a1006 #3a240c #63401a #8e6427 #b98e3c #dcbf6a #f4e3a6.
- Secondary material pool: Grave steel #0e1016 #1c2230 #2e3747 #46526a #6a7891 #98a6bc #d0d9e6.
- Neutral shirt/trousers pool: Wool #16130f #2c2720 #4a4236 #6c6252 #948870 #bcb096; shoes/straps pool: Leather #120c08 #261a10 #3e2a1a #5a3e26 #7a5636 #9e7650.
- Outline/rim pool shared within the budget: #07060a #100c14 #1a1220; #6f84a8 #9fb4d4 #d4e2f4.

The costume color words above remain the target: choose muted pool steps, not every ramp color. Plum/purple cloth uses dark Arcane/Wine steps with no emission; grey/cream uses Wool/Bone. Black uses Blackened steel/Shadow ink without metal highlights. For pale skin do not substitute undead green; keep the pack's Skin light selection. (added)

### Ten armor ideas

1. Common: pilgrim-penitent; material twist: tallow-stained linen; silhouette hook: crossed bandoliers of prayer strips.
2. Uncommon: bell-ringer; material twist: riveted copper; silhouette hook: high sunburst gorget.
3. Rare: cathedral cantor; material twist: quilted silk over mail; silhouette hook: split tabard to the ankles.
4. Epic: saint's-day processional; material twist: stained-glass shards in lead; silhouette hook: a processional banner pole on the back.
5. Legendary: reliquary bearer; material twist: reliquary glass with a saint's finger inside; silhouette hook: one giant sunburst pauldron.
6. Common: Patched procession-steward quilt with blue sash. (added)
7. Uncommon: Matched bell-warden coat with sun clasp. (added)
8. Rare: Tailored cathedral plate with navy processional tabard. (added)
9. Epic: Asymmetric cantor mantle and stained-glass chest badge. (added)
10. Mythic: Dawn-glass reliquary armor with one contained sun core. (added)

### Five helmet motifs

1. sunburst great-helm.
2. halo-crested armet.
3. mitre bascinet.
4. gold laurel circlet.
5. stained-glass visor helm.

### Five glove motifs

1. silver gauntlets with sun knuckles.
2. prayer-strip wrapped gloves.
3. gold-chased gauntlets.
4. mail mitts.
5. reliquary cuffs.

### Five boot motifs

1. silver sabatons.
2. pilgrim boots.
3. gold-banded greaves.
4. mail chausses.
5. sunburst-knee greaves.

Overlay rarities left-to-right: Common, Uncommon, Rare, Epic, Legendary. Motifs must remain inside the extraction zone; hats, masks and hoods occur only as overlays. A circlet described as orbiting uses attached ornament and no detached lights. A tiny feather/quill must be a silhouette cluster, not a loose weapon. (added)

## Ranger

Identity: a wiry red-haired woman with a long braid, green eyes, freckles and a hunter's squint.

Theatre: the warden-poacher of a royal deer park. Signature contrast: moss / rose. Motif family: leaf lamellar, antler toggles, quiver-shaped back gear (no weapons), hunting-horn charms.

Underlayer: a moss-green wool jerkin, linen shirt, leather trousers, soft hunting boots.

### Palette (added exact role choices)

- Skin/body: Skin, light; use #8c5038 #b8785a #dca484.
- Hair: #2a0c14 #962c34.
- Base cloth pool: Moss / #0c1208 #1a2612 #2c3e1c #44582a #62763a #8e9c56.
- Accent pool: Wine / #12060a #2a0c14 #4a1420 #6e1e2a #962c34 #c04848.
- Secondary material pool: Leather #120c08 #261a10 #3e2a1a #5a3e26 #7a5636 #9e7650.
- Neutral shirt/trousers pool: Wool #16130f #2c2720 #4a4236 #6c6252 #948870 #bcb096; shoes/straps pool: Leather #120c08 #261a10 #3e2a1a #5a3e26 #7a5636 #9e7650.
- Outline/rim pool shared within the budget: #07060a #100c14 #1a1220; #6f84a8 #9fb4d4 #d4e2f4.

The costume color words above remain the target: choose muted pool steps, not every ramp color. Plum/purple cloth uses dark Arcane/Wine steps with no emission; grey/cream uses Wool/Bone. Black uses Blackened steel/Shadow ink without metal highlights. For pale skin do not substitute undead green; keep the pack's Skin light selection. (added)

### Ten armor ideas

1. Common: river smuggler; material twist: braided horsehair; silhouette hook: cape worn on one shoulder.
2. Uncommon: beekeeper; material twist: felted wool; silhouette hook: layered capelets.
3. Rare: falconer; material twist: lacquered wood; silhouette hook: leaf-lamellar bell-shaped coat.
4. Epic: kennel master; material twist: cracked enamel; silhouette hook: crossed bandoliers with horn charms.
5. Legendary: saint's-day processional; material twist: stained-glass leaves in lead; silhouette hook: a train of rose-coloured ribbons.
6. Common: Patched park-keeper jerkin with repaired wool hem. (added)
7. Uncommon: Matched beekeeper quilt with antler toggles. (added)
8. Rare: Tailored leaf-lamellar coat with rose lining. (added)
9. Epic: Asymmetric deer-warden cape with enamel leaf clasp. (added)
10. Mythic: Living leaf-glass plates with one rose-colored seed core. (added)

### Five helmet motifs

1. antlered hood (face open).
2. leaf sallet.
3. beekeeper veil hat.
4. rose-crowned circlet.
5. lacquered hunting helm.

### Five glove motifs

1. archer's bracer gloves.
2. leaf-lamellar gauntlets.
3. beekeeper gloves.
4. antler-toggle mitts.
5. rose-enamel gauntlets.

### Five boot motifs

1. soft hunting boots.
2. leaf greaves.
3. wading boots.
4. antler-buckle boots.
5. rose-enamel sabatons.

Overlay rarities left-to-right: Common, Uncommon, Rare, Epic, Legendary. Motifs must remain inside the extraction zone; hats, masks and hoods occur only as overlays. A circlet described as orbiting uses attached ornament and no detached lights. A tiny feather/quill must be a silhouette cluster, not a loose weapon. (added)

## Slime Lord

Identity: a humanoid of translucent cobalt-blue slime with a bare, round, faceless slime head with two bright eye-glints.

Theatre: the alchemist's runaway experiment wearing stolen armor. Signature contrast: cobalt / bruised purple. Motif family: mismatched plates held on by oozing slime, glass vials, specimen tags.

Underlayer: a purple wool tabard and a plain belt worn over the slime body.

### Palette (added exact role choices)

- Skin/body: Slime (; use #0e3c8c #1a5cc8 #3c86ec.
- Hair: none; do not add hair.
- Base cloth pool: Arcane violet #0c0a24 #20185a #3a2c96 #5c4cd0 #8a7cf0 #c4bcff.
- Accent pool: Slime ( #04102a #082456 #0e3c8c #1a5cc8 #3c86ec #86bcff #d8ecff.
- Secondary material pool: Blackened steel #08080c #13131c #20202e #323246 #4c4c66 #76769a.
- Neutral shirt/trousers pool: Wool #16130f #2c2720 #4a4236 #6c6252 #948870 #bcb096; shoes/straps pool: Leather #120c08 #261a10 #3e2a1a #5a3e26 #7a5636 #9e7650.
- Outline/rim pool shared within the budget: #07060a #100c14 #1a1220; #6f84a8 #9fb4d4 #d4e2f4.

The costume color words above remain the target: choose muted pool steps, not every ramp color. Plum/purple cloth uses dark Arcane/Wine steps with no emission; grey/cream uses Wool/Bone. Black uses Blackened steel/Shadow ink without metal highlights. For pale skin do not substitute undead green; keep the pack's Skin light selection. (added)

### Ten armor ideas

1. Common: plague-hospital orderly; material twist: wax-sealed specimen tags; silhouette hook: crossed bandoliers of vials.
2. Uncommon: glassblower; material twist: riveted copper; silhouette hook: one giant mismatched pauldron.
3. Rare: magitek engineer; material twist: brass bellows and gauges; silhouette hook: a hump of alchemical gear on the back.
4. Epic: opera villain; material twist: porcelain plates; silhouette hook: high funnel collar.
5. Legendary: reliquary bearer; material twist: reliquary glass with a homunculus inside; silhouette hook: bell-shaped coat.
6. Common: Patched specimen-carrier tabard with waxed hem. (added)
7. Uncommon: Matched glasshouse apron with copper clips. (added)
8. Rare: Tailored containment vest with sealed vial mounts. (added)
9. Epic: One-shoulder porcelain carapace and purple sash. (added)
10. Mythic: Self-growing cobalt glass armor with a captive pearl. (added)

### Five helmet motifs

1. stolen bascinet floating on the slime.
2. cork-and-glass flask helm.
3. porcelain mask helm.
4. copper diving helm.
5. purple velvet hat.

### Five glove motifs

1. mismatched gauntlets sunk in slime.
2. glass vial cuffs.
3. porcelain hand-plates.
4. copper mitts.
5. velvet gloves.

### Five boot motifs

1. mismatched sabatons.
2. glass-jar boots.
3. porcelain greaves.
4. copper diving boots.
5. purple velvet boots.

Overlay rarities left-to-right: Common, Uncommon, Rare, Epic, Legendary. Motifs must remain inside the extraction zone; hats, masks and hoods occur only as overlays. A circlet described as orbiting uses attached ornament and no detached lights. A tiny feather/quill must be a silhouette cluster, not a loose weapon. (added)

## Totem Master

Identity: a brown-skinned man with long dark braided hair, a calm weathered face and carved bead earrings.

Theatre: the carver of guardian totems for a river people. Signature contrast: moss bronze / turquoise. Motif family: carved wooden plates, bead strings, mask-faced belt totems, woven reed capes.

Underlayer: a moss-dyed wool tunic, woven sash, leather leggings, soft moccasin boots.

### Palette (added exact role choices)

- Skin/body: Skin, medium; use #6a3c28 #93583c #b87a56.
- Hair: #100c14 #100c14.
- Base cloth pool: Moss / #0c1208 #1a2612 #2c3e1c #44582a #62763a #8e9c56.
- Accent pool: Frost ( #0a1620 #16303e #285468 #3e7c94 #66a8c0 #a6d8e6 #e6f6fa.
- Secondary material pool: Verdigris bronze #0e1412 #1c2a26 #2e4640 #46665c #6a8c7e #9ab8a6.
- Neutral shirt/trousers pool: Wool #16130f #2c2720 #4a4236 #6c6252 #948870 #bcb096; shoes/straps pool: Leather #120c08 #261a10 #3e2a1a #5a3e26 #7a5636 #9e7650.
- Outline/rim pool shared within the budget: #07060a #100c14 #1a1220; #6f84a8 #9fb4d4 #d4e2f4.

The costume color words above remain the target: choose muted pool steps, not every ramp color. Plum/purple cloth uses dark Arcane/Wine steps with no emission; grey/cream uses Wool/Bone. Black uses Blackened steel/Shadow ink without metal highlights. For pale skin do not substitute undead green; keep the pack's Skin light selection. (added)

### Ten armor ideas

1. Common: ferryman; material twist: braided horsehair; silhouette hook: woven reed cape.
2. Uncommon: beekeeper; material twist: lacquered wood; silhouette hook: crossed bead bandoliers.
3. Rare: organ-builder; material twist: riveted copper; silhouette hook: one giant carved-mask pauldron.
4. Epic: saint's-day processional; material twist: cracked enamel turquoise; silhouette hook: a totem pole on the back.
5. Legendary: reliquary bearer; material twist: reliquary glass with a river pearl inside; silhouette hook: a train of feathered ribbons.
6. Common: Patched river-carver tunic with reed shoulder mat. (added)
7. Uncommon: Matched lacquered ferry vest with bead toggles. (added)
8. Rare: Tailored guardian-panel coat with turquoise trim. (added)
9. Epic: One-shoulder carved canopy and enamel river clasp. (added)
10. Mythic: Living riverwood ribs around one luminous pearl. (added)

### Five helmet motifs

1. carved mask helm.
2. reed crown.
3. turquoise-bead headdress.
4. bronze bird helm.
5. woven hood (face open).

### Five glove motifs

1. carved-wood gauntlets.
2. bead-wrapped gloves.
3. turquoise cuffs.
4. bronze-knuckle mitts.
5. reed-woven gloves.

### Five boot motifs

1. moccasin boots with beads.
2. carved-wood greaves.
3. reed-wrapped legs.
4. bronze sabatons.
5. turquoise-banded boots.

Overlay rarities left-to-right: Common, Uncommon, Rare, Epic, Legendary. Motifs must remain inside the extraction zone; hats, masks and hoods occur only as overlays. A circlet described as orbiting uses attached ornament and no detached lights. A tiny feather/quill must be a silhouette cluster, not a loose weapon. (added)

## Wizard

Identity: a silver-haired older man with a long silver beard, bright blue eyes, deep laugh lines.

Theatre: the cartographer-mage of a lost cathedral city. Signature contrast: midnight blue / pale gold. Motif family: map-panel robes, compass-rose clasps, folded-paper capelets, ink-pot charms.

Underlayer: a midnight-blue wool robe-shirt, grey trousers, soft boots, a plain sash.

### Palette (added exact role choices)

- Skin/body: Skin, light; use #8c5038 #b8785a #dca484.
- Hair: #262422 #827a70.
- Base cloth pool: Night indigo #0a0a18 #161a34 #242c52 #34406e #4c5c92 #7084b8.
- Accent pool: Reliquary gold #1a1006 #3a240c #63401a #8e6427 #b98e3c #dcbf6a #f4e3a6.
- Secondary material pool: Bone / #1c1812 #3a3226 #5e5442 #8a7e66 #b4a88c #ddd2b6 #f2ecda.
- Neutral shirt/trousers pool: Wool #16130f #2c2720 #4a4236 #6c6252 #948870 #bcb096; shoes/straps pool: Leather #120c08 #261a10 #3e2a1a #5a3e26 #7a5636 #9e7650.
- Outline/rim pool shared within the budget: #07060a #100c14 #1a1220; #6f84a8 #9fb4d4 #d4e2f4.

The costume color words above remain the target: choose muted pool steps, not every ramp color. Plum/purple cloth uses dark Arcane/Wine steps with no emission; grey/cream uses Wool/Bone. Black uses Blackened steel/Shadow ink without metal highlights. For pale skin do not substitute undead green; keep the pack's Skin light selection. (added)

### Ten armor ideas

1. Common: cartographer; material twist: wax-sealed parchment strips; silhouette hook: layered folded-paper capelets.
2. Uncommon: astrologer-clerk; material twist: felted wool; silhouette hook: high funnel collar.
3. Rare: archive keeper; material twist: tarnished silver filigree; silhouette hook: split map-panel tabard to the ankles.
4. Epic: organ-builder; material twist: stained-glass shards in lead; silhouette hook: bell-shaped coat.
5. Legendary: reliquary bearer; material twist: reliquary glass with a burning compass inside; silhouette hook: one giant compass-rose pauldron.
6. Common: Patched surveyor robe-shirt with paper pocket flap. (added)
7. Uncommon: Matched route-clerk coat with compass buttons. (added)
8. Rare: Tailored map-panel tabard with pale-gold edges. (added)
9. Epic: One-shoulder folded atlas cape with glass clasp. (added)
10. Mythic: Impossible folded-stone coat with one star compass. (added)

### Five helmet motifs

1. cartographer cap with quills.
2. compass-crowned circlet.
3. paper-lantern helm.
4. gold-banded hood (face open).
5. lens visor helm.

### Five glove motifs

1. ink-stained gloves.
2. compass-cuff gauntlets.
3. gold-wire mitts.
4. folded-paper bracers.
5. lens-knuckle gauntlets.

### Five boot motifs

1. soft walking boots.
2. map-wrapped greaves.
3. gold-buckled boots.
4. compass-knee greaves.
5. folded-paper sabatons.

Overlay rarities left-to-right: Common, Uncommon, Rare, Epic, Legendary. Motifs must remain inside the extraction zone; hats, masks and hoods occur only as overlays. A circlet described as orbiting uses attached ornament and no detached lights. A tiny feather/quill must be a silhouette cluster, not a loose weapon. (added)


## I. Overlay zones and fit

Coordinates are top-left plus width/height in the 128x192 AP full-frame coordinate system. Exact glove origins and sheet positions below come from importer constants, not estimates from the generated art.

| Piece | Origin (x,y) AP | Size AP | Fitting requirement |
|---|---|---|---|
| Helmet | (45,63) | 40x40 | Match skull; face opening empty; all crests stay in extraction zone |
| Left glove | (25,120) | 24x24 | Fist center (37,132), same angle |
| Right glove | (75,120) | 24x24 | Fist center (87,132), same angle |
| Boots pair | (28,150) | 76x40 | Both shins/feet, soles y=183 |

At 3x, the five set columns begin from x=290 with a 248-pixel step and a 228-pixel allocation. Helmet content starts column+54, row y=140; glove pair starts column+36, row y=340, with two 72x72 cells separated by 12 output pixels; boots start column+0, row y=490 with size 228x120. Helmet cell size is 120x120. These are sheet output coordinates; they are not AP body coordinates. (added transcription of importer geometry)

Draw only the gear. No head, hands or legs beneath it. Open helmets leave facial pixels fully transparent/magenta; closed helmets may cover the face. Each glove/boot pair is one equipment design, not two different designs. Pair color budget is shared across both sides. Composite-test each piece on its approved class master to confirm contact, angle, wrist/cuff joins and sole position. Do not repair a fit error by moving the hero. (added)

## J. World rules

Townsfolk (11 frames: idle 1-3, walk 1-2, dying, dead, scream, point, happy, cheer; knights +2 attacks)
Same density and palette, plainer materials (wool, linen, leather), 100-108 AP adults, 72-80 AP children. Faces
more expressive than heroes, never comic. Idle frames differ only by breathing (1 AP shoulder rise) and a small hand
or head change.

### 10.7 Monsters and bosses
Same density (section 1 table) and light, drawn in **manuscript mode** (section 0A): no outline, painterly pixel
shading, Amano-like ornament: ribbons, tattered silks, masks, faces set into armour, too many arms, elegant
elongation. Strange first, frightening second, always Diablo II-grim in material and colour. Every monster gets a
design card (section 0B) with a creature source instead of a costume source (a cursed instrument, a reliquary
that walked off its altar, a drowned choir, a magitek prototype that ate its pilot, an opera set piece come
alive). Bosses carry one huge focal feature (a crown of horns, a cathedral on the back, a ribcage maw), 32 colours.

### 10.8 Pets and summons
Same as monsters; animated rows keep the exact same design frame to frame (only the pose changes), feet on the ground
line.

### 10.9 Biomes (floors, walls, arches, doors, props)
Same palette and light. Clusters of 2-3 px at tile resolution, quieter values than characters (backgrounds stay
1-2 ramp steps darker and less saturated than the characters standing on them). Floors tile seamlessly, no
directional light baked into floors except the soft top-left. Props follow the prop rules of the biome kit.

(added) Apply the pet-mode and boss-size resolutions above. Generic master forbiddances such as identical hero head/stance apply to hero armor frames; animation rows change pose deliberately while keeping identity and equipment fixed. World animation requires its own attached layout; do not force the hero idle skeleton onto a running wolf. Biome backgrounds stay 1-2 ramp steps darker and less saturated than characters. No silent reinterpretation of native tile pixels as 1.8x character AP.

## K. Rejection rules and QA

The output is rejected and redrawn if any of these appear:

1. Soft, blurry, airbrushed or painterly gradients; anything that looks like a painting with a "pixel filter".
2. Pixels of different sizes in one image (mixels), or blocks that aren't one flat colour at the requested scale.
3. Glow halos, bloom, lens flares, sparkles, light rays or smoke outside the sprite.
4. Generic "epic fantasy" over-detail: filigree spaghetti everywhere, symmetric clutter, every surface engraved.
5. Plastic or chrome sheen, glossy 3D-render look, subsurface glow on skin.
6. Noise texture: random speckles, film grain, JPEG artefacts, dithering over large areas.
7. Pillow shading (dark rim all around a shape), black outlines everywhere, outlines thicker than 1 AP.
8. Anatomy errors: extra or missing fingers, arms of different lengths, merged legs, floating feet, a head that
   changed size or shape.
9. Pose drift: any landmark of the pose lock moved; a different stance; a weapon; a shield; a raised hand.
10. Face drift: a different face, age, hairline, beard, skin tone or expression from the class's pose master.
11. Any text, letters, numbers, logo, signature, watermark, UI, frame or border in the art cells.
12. Backgrounds: floors, ground shadows, gradients or texture behind the sprite (must be flat magenta #FF00FF).
13. Cute or chibi proportions, big-eyed anime faces, cartoon outlines, Western comic shading.
14. Copies of existing characters, items or logos (Alucard, Richter, Diablo II heroes, FF6 cast, Amano drawings),
    or any recognisable existing armor design. Inspiration is the craft, never the content.
15. Modern elements: zippers, sneakers, sunglasses, guns that are not the Gunner's flintlock-era style, sci-fi
    panels, neon colours outside the emissive ramps.
16. Repetition: two cells of one sheet that are recolours or near copies of each other.
17. Generic AI fantasy: anything from the banned-cliché list (section 0B), or a design with no costume source,
    no material twist, no hue contrast or no silhouette hook.
18. Too many colours: a character sprite that looks like it has more than its budget (section 6).

- [ ] Canvas size and cell layout match the template.
- [ ] Background flat magenta, nothing touching cell edges, no guides or text left.
- [ ] Pixel scale is uniform; each block is one flat colour.
- [ ] Pose lock: crown, chin, shoulders, fists, knees and soles on their lines (overlay the template to check).
- [ ] Head identical to the pose master (hero frames).
- [ ] Outline is 1 AP sel-out, no black lines; moonlit rim on back-right edges.
- [ ] Palette from the master ramps; colour count within budget; dominant/secondary/accent ratio.
- [ ] Silhouette idea is unique on the sheet; rarity reads.
- [ ] No anti-slop violations (section 9) and no banned clichés (section 0B).
- [ ] Every cell has a design card and no two cards share a line.
- [ ] Reads at 60 px (look at it zoomed out to that size).

### Practical acceptance pass (added)

- Compare actual canvas and crop rectangles against the supplied template; verify every figure fits without touching boundaries.
- Count exact colors per extracted asset, including transparency. Check palette membership and fully uniform kxk blocks using each cell's local origin, not necessarily the whole sheet origin.
- Check background is exactly #FF00FF or valid transparency; no near-magenta noise or fringe.
- Overlay the reference skeleton and compare the fixed head region pixel-for-pixel after conversion to AP.
- Review every repeat on a flat plane, its intentional perspective deformation and its connection to surrounding material.
- Review buckle routing, stitched edges, plate overlap, anatomical contact and gravity.
- Inspect the entire sheet, then individual cells enlarged with nearest-neighbor, then at game display size. Fix identified failures, recheck affected areas, preserve versions, and report any unresolved defects.
- Aesthetic approval and technical pass are recorded separately. Do not claim a generated image is ready to import merely because its presentation looks pixelated.

## L. Reproduction recipe (added operational detail)

1. Read 01_VELSCOUR_ART_BIBLE.md, then 02_MASTER_PROMPT.txt. Treat 'GRIM NOCTURNE READY' as setup acknowledgement, not an instruction to abandon the requested work.
2. Attach templates/0_style_lock_sheet.png, reference/palette.png and reference/pixel_scale_guide.png. Use pack section B, follow all 18 actual template subjects, write design cards outside the image, and produce one sheet. Apply construction/repeat/technical reviews and revise. Preserve the selected sheet.
3. After human visual approval, run the 04_STYLE_LOCK_REQUEST.txt writing step: these five documents. Carry their source/added distinction into later revisions. Current approved visual reference: style_lock_sheet_v3_REVIEW.png; technical limitations remain documented.
4. For each class in pack order, attach this document, approved sheet, templates/1_pose_master/<class>_pose_master.png, reference/classes/<class>_current.png and reference/canonical_stance.png. Paste master prompt plus class C1 prompt and its CLASS_CARDS entry. Produce only that class's underlayer hero, review repeatedly, obtain human approval, preserve its exact pixels. First class: Arcane Sorcerer.
5. Only in the actual game repository, dry-run the approved pose import with the correct names JSON, inspect the preview, then import it. Rebuild the armor/overlay templates with tools/chatgpt_style_kit.py after verifying that script exists. It is absent from the ZIP; do not run nonexistent commands or substitute the old head.
6. Attach the rebuilt class armor template and approved pose master, approved visual sheet and STYLE_LOCK.md. Fill ARMOR_PROMPT_TEMPLATE.txt with five designs and rarities. Check head identity, pose, pattern logic and file limits; repair bad cells; preserve approved sheets.
7. Use OVERLAY_PROMPT_TEMPLATE.txt and the rebuilt overlay template plus pose master. Review every gear layer composited on the master before import.
8. Use the matching WORLD_PROMPT_TEMPLATES.txt section and its existing world/biome template. Those full world kits and processing tools are not included here; obtain the actual files before production. Follow each animation row's identity and frame order.
9. No batch-generation loop, package installation, large downloads or repo-wide asset processing is implied by these prompts. Inspect scope first and make one sheet at a time, reflecting the user's compute constraint.
