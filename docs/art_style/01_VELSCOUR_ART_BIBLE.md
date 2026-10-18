# VELSCOUR ART BIBLE: "GRIM NOCTURNE" PIXEL STYLE

This is the law for every sprite in VELSCOUR: heroes, armor, helmets, gloves, boots, townsfolk, monsters, bosses,
pets, biome floors, walls and props. Every image prompt starts from it. Where this document and a prompt
disagree, this document wins.

---

## 0. The style in one paragraph

VELSCOUR is **hand-placed 2D pixel art from the 16/32-bit era, pushed to PlayStation 2 density**: every sprite is
drawn one deliberate pixel at a time from a **tiny palette**, like a Super Famicom sprite that grew up. Its lead
ancestor is **Final Fantasy VI**; two others season it. The result belongs to none of them:

1. **Final Fantasy VI** (SNES original and Pixel Remaster battle sprites) is the **lead: about 60% of the look.**
   Theatrical costume design (opera, circus, court, cathedral and magitek workshop), flowing sashes, scarves, capes,
   feathered collars and puffed sleeves locked into bold readable shapes; a slightly heroic head-to-body ratio; the
   discipline of **one small palette per sprite**; monsters that look like Amano illustrations translated into
   pixels: painted, outline-less, elongated, ornamental and strange. See section 0A.
2. **Diablo II** gives **mood and material truth (about 25%)**: the 3/4 isometric camera, desaturated grime,
   rust, blood, old bone, believable straps and buckles, torchlight in black dungeons, a dangerous tone.
   It keeps FF6's theatre grimdark.
3. **Castlevania: Symphony of the Night** gives **the night (about 15%)**: elegant elongated gothic silhouettes and
   the cold moonlit rim light that separates dark figures from dark backgrounds.

**The meld:** an FF6 battle sprite's costume theatre, palette discipline and presence, dragged through Diablo II's
mud and lit by SotN's moon. It must look like a lost 1996-2002 Square-era masterpiece nobody has seen before,
never like a copy of any game, and never like "AI dark-fantasy pixel art" (section 0B).

The house name for this look is **Grim Nocturne**.

---

## 0A. The Final Fantasy VI lead: what to take (craft only, never content)

- **Palette discipline (the biggest single source of character):** a SNES sprite has 15 colours plus transparency.
  A VELSCOUR character sprite has **one 16-colour palette** (15 + transparent): skin 3, hair 2, and 10 for the outfit
  shared between materials, plus outline and rim. Rare and above may use up to 20, Legendary and Mythic 24 (the
  Pixel Remaster tier). Few colours force bold, flat, designed shapes: exactly what generic AI art lacks.
- **Flat-then-band shading:** large flat areas of a mid tone, 1-2 shadow bands, 1 highlight band. Shadows are
  shapes, not gradients. Cloth is drawn as a few big folds with hard-edged shadow shapes.
- **Costume theatre:** every outfit is a *costume* with a story: a court duelist's slashed doublet, a cathedral
  cantor's surplice over mail, a magitek engineer's brass rig, a circus strongman's harness, an opera villain's
  layered coat. Long sashes, tabards and coat tails give motion even in a still pose.
- **Proportions:** heroic but stylised: about 6.75 heads tall (head 16 AP of 108), hands and feet slightly
  generous, shoulders and silhouette clear. Never chibi, never realistic-proportioned "illustration".
- **Faces:** simple, iconic, 2-3 tone faces with a strong brow and a clear eye shape (2-3 AP dark with a 1 AP
  glint), expressive hair shapes (big locks, a cowlick, a braid) that identify the character in silhouette.
- **Two drawing modes (as in FF6):**
  - *Character mode* (heroes, townsfolk, knights, humanoid pets): coloured 1 AP outline, flat-then-band shading.
  - *Manuscript mode* (monsters, bosses, beasts, espers-like summons): **no outline**, more colours (16-24, bosses
    32), painterly pixel shading with deliberate hue jumps, Amano-like flowing ornament: tendrils, ribbons, tattered
    silks, filigree horns, masks, many limbs, faces inside armour. Strange first, scary second.
- **Hue confidence:** muted grimdark bases, but each sprite gets one bold hue contrast that FF6 would use (wine
  against teal, ochre against violet, rust against slate blue). Pick it on purpose (section 0B, step 3).
- **Magitek and opera, made grim:** brass, pipes, gauges, dials and stitched leather bellows next to gothic plate;
  stage finery (ruffs, feathers, masks, embroidered tabards) now torn, bloodied and soot-stained.

---

## 0B. The originality engine (use it for every single design)

Generic output comes from generic briefs. Before drawing anything, ChatGPT must write a **design card** for each
cell, then draw from the card. A card is 4 lines:

1. **Costume source** (pick from the list, never "knight", "warrior", "rogue" or "mage"): opera villain, court
   duelist, cathedral cantor, plague-hospital orderly, magitek engineer, circus strongman, funeral mute, lamplighter,
   bell-ringer, falconer, ship's chaplain, toll-gate warden, glassblower, executioner's apprentice, pilgrim-penitent,
   reliquary bearer, siege engineer, ferryman, astrologer-clerk, river smuggler, mummer, chimney-sweep guild,
   stilt-walker, coffin-maker, cartographer, diver in a brass helm-suit (body only), beekeeper, tannery foreman,
   saint's-day processional, frost-trapper, salt miner, vintner, organ-builder, kennel master, archive keeper.
2. **Material twist** (one): wax-sealed parchment strips, stained-glass shards set in lead, brass bellows and
   gauges, porcelain plates, bone lacework, lacquered wood, quilted silk over mail, reliquary glass with a relic
   inside, tarnished silver filigree, felted wool, cracked enamel, riveted copper, braided horsehair, tin votive
   charms, tallow-stained linen, chain-hung censers.
3. **Hue contrast** (one bold pair on a muted base): wine/teal, ochre/violet, rust/slate, moss/rose, bone/ultramarine,
   copper/sea-green, soot/saffron.
4. **Silhouette hook** (one, readable in solid black): bell-shaped coat, one giant pauldron, split tabard to the
   ankles, high funnel collar, hooped ribs, cape worn on one shoulder, layered capelets, stilt-like greaves, a hump of
   gear on the back, a chimney collar, crossed bandoliers, a train of tattered ribbons.

Two cells on one sheet may share no line of their cards. The class motif family (section 12) is applied *on top*.

**Banned clichés** (redraw if they appear): skull pauldrons, spikes all over, glowing red eyes, hooded
faceless figure, generic "dark knight" plate, bat wings on armor, chains for decoration everywhere, tribal tattoos
as default, flaming swords or any weapon, generic leather-and-belts rogue, wizard robe with stars as the whole
idea, cape billowing out of frame, symmetrical filigree wallpaper, the same face with a different beard, anything
that looks like a default "dark fantasy RPG character" or a stock-asset pack.

---

## 1. Resolution and the art-pixel grid (non-negotiable)

**Art pixel (AP):** the smallest square of colour in a sprite. Every sprite in the game is made of whole art pixels,
all the same size inside one image. No half pixels, no blur between pixels, no mixed pixel sizes ("mixels").

**Density:** VELSCOUR is drawn at **about twice the pixel density of Symphony of the Night on PlayStation.** On the
PSX's 256 x 240 screen, Alucard stands about 54 pixels from crown to sole (measured from an in-game screenshot).
A VELSCOUR hero stands **108 AP** from crown to sole: exactly 2x.

**Hero frame (the contract every hero, armor and overlay uses):**

| Item | Value |
|---|---|
| Frame | 128 x 192 AP, transparent background |
| Hero height | 108 AP from top of the bare head (crown) to the soles |
| Soles (ground line) | y = 183 |
| Crown (bare head) | y = 75 |
| Head centre | x = 65 |
| Body centre at the hips | x = 64 |
| Facing | three-quarter view facing screen right, camera above (Diablo II angle, about 30 degrees down) |
| In game | drawn 60 world pixels tall: the same on-screen size as today |

**Delivery scale for ChatGPT:** images are drawn **at 2x (one AP = a 2 x 2 block of identical pixels)** on armor
sheets and **3x or 4x** on pose-master and overlay sheets. The importer reads each block back to one AP, so a block
that is not one flat colour gets averaged and looks smeared. **Every block must be one flat colour.**

**Other sizes on the same density (1.8 AP per world pixel):**

| Thing | Height in AP |
|---|---|
| Hero (60 world px) | 108 |
| Adult townsfolk | 100-108 |
| Child | 72-80 |
| Small monster (imp, crawler, h 30-40) | 54-72 |
| Man-sized monster (h 54-58) | 97-104 |
| Brute (h 64-80) | 115-144 |
| Boss (h 90-160) | 162-288 |
| Pets: wolf (h 34), bird (h 28) | 61, 50 |

Biome tiles keep their 160 x 80 diamond at 1 pixel per world pixel (a lower density than characters), so floors,
walls and props use **bigger clusters (2-3 px minimum)** and the same palette, light and outline rules, so the
characters stand out as the most detailed thing on screen, as in Diablo II and SotN.

---

## 2. Camera, perspective and facing

- **Camera:** fixed, above and in front, about 30 degrees down: the Diablo II isometric camera. Ground objects are
  seen from above: you see the tops of boots, the top plane of shoulders, the crown of the head.
- **Characters:** three-quarter view **facing screen right**, turned about 30 degrees toward the viewer: the chest
  is visible, the face is in three-quarter profile looking right. Never full side profile, never front-on.
- **The game mirrors sprites for left facing.** So: no asymmetric text, no "this side only" logic that breaks when
  flipped. Asymmetry in design (one pauldron, a sash) is welcome; it simply flips.
- **Light** is fixed for the whole game (see section 5), never per sprite.

---

## 3. THE POSE LOCK (the stance never changes)

Every hero frame, every armor of every class, every overlay: **the same stance, joint for joint.** This is what
makes 80+ armors per class look like one character changing clothes. The stance is the "battle-ready idle" of the
current game, measured from all 16 current heroes and rescaled to 108 AP:

| Landmark | AP (x, y) | Rule |
|---|---|---|
| Crown (top of bare head) | y 75 | exact |
| Eye line | y 83 | exact |
| Chin | y 91 | exact (head 16 AP: about 6.75 heads tall, the FF6 lean) |
| Shoulder line (top of the shoulder joint) | y 96 | exact for the body; pauldrons may rise above it |
| Elbows | y 114 | +-1 |
| Belt / waist | y 120 | +-2 |
| Crotch | y 129 | +-1 |
| Fists (knuckle centre) | screen-left (37, 132), screen-right (87, 132) | +-2 |
| Knees | screen-left (50, 154), screen-right (78, 154) | +-1 |
| Ankles | y 178 | +-1 |
| Soles | screen-left foot (46, 183), screen-right foot (84, 183) | exact |

**The stance in words:** standing tall and grounded, weight centred, feet planted wider than the shoulders in an
open "A" stance, both soles flat on the ground line, screen-right foot slightly toward the viewer and pointing
right-down, screen-left foot further back pointing right. Legs straight but not locked. Torso upright, chest open,
shoulders level, chin level, eyes looking right. Both arms hang just away from the body (a fist's width of air
between arm and torso), elbows very slightly bent, **hands empty, loosely clenched into fists** at the crotch line.
No weapon, no shield, no cape blowing off the frame. Calm, proud, dangerous: a FF6 battle stance with Diablo II
weight.

**What armor may change:**
- **Bulk outward:** heavy armor may widen the silhouette up to **8 AP on each side** and thicken limbs, but the joint
  centres stay where they are.
- **Height:** only pauldrons, collars and spaulders may rise above the shoulder line, at most **6 AP**. Nothing on a
  body armor goes above the crown (helmets are separate).
- **Robes, skirts, tassets, coat tails** may hang to the ankles and flare up to 10 AP outward, but must not hide the
  soles' positions (boot toes stay visible or their outline is implied).

**What armor may never change:** the head (identical every frame: same face, hair, skin, pixels), the crown and
sole lines, the fist positions, the knee positions, the facing, the camera angle, the light. If one of these moved,
the sprite is rejected.

**Bare head, always.** Body armors have no helmet, hood, hat, crown, circlet, mask or face paint. Hair is part of the
head and is identical in every armor (long hair falls over the armor the same way every time).

---

## 4. Pixel craft rules (the "hand-placed" test)

1. **One pixel size per image.** Every AP is a perfectly square flat block. No blur, no smoothing, no gradients that
   are not made of distinct bands.
2. **Clusters, not noise.** Shapes are built from clusters of 2+ AP of one colour. No single isolated "orphan"
   pixels except deliberate specular glints (max 1 per material area) and eye highlights.
3. **Colour ramps, not airbrush.** Each material has a 4-7 step ramp (section 6). Shading moves along the ramp in
   bands. Hue shifts with value: shadows go cooler and more saturated toward indigo/wine; lights go warmer toward
   ochre/ivory. Never shade by just darkening toward black or lightening toward white.
4. **Selective outline ("sel-out"), character mode.** Heroes, townsfolk and humanoid pets have an outer outline 1 AP wide.
   Monsters and bosses use *manuscript mode* (section 0A): no outline, the silhouette is made by value and hue. The outline is *not* black: it
   is the darkest step of the neighbouring material's ramp, darker on the shadow side (bottom right of forms and
   underside), broken or lighter on the lit top-left side. Inner lines (plate seams, straps, folds) are 1 AP and
   use the material's second-darkest step. Pure black #000000 only in the deepest crevice pixels, never as a line.
5. **Moonlit rim (the signature).** A 1 AP cold rim light (`#9fb4d4`, brighter `#d4e2f4` on metal) along the
   back-right edges of the silhouette, as if moonlight comes from behind and to the right. Only on edges that face
   right/back. It separates the dark figure from dark dungeons (the SotN trick) and is the single most important
   identity mark of Grim Nocturne. Never a glow, always a hard 1 AP line, broken into segments, not continuous.
6. **No pillow shading.** Light comes from the upper left; forms are lit on their top-left planes and fall into
   shadow toward the bottom-right. Don't darken every edge evenly around a shape.
7. **Dithering only as texture,** never as a blend: allowed in 2-colour checker patches for rough stone, fur, rust,
   coarse cloth, at most 10% of a sprite's area. Never dither skin, never dither metal highlights.
8. **Anti-aliasing by hand only,** and sparingly: one intermediate colour step at the steepest curves of the
   silhouette's inside edges. Never anti-alias the outer edge against the background (it must cut cleanly from
   transparency).
9. **Line quality:** curves follow clean pixel-art steps (1-1-2-2-3-3, never 1-3-1-2), no jaggies, no doubled
   pixels in 1-AP lines, no "staircase noise".
10. **Readability at 60 px:** the game shows the hero ~60 screen pixels tall. The silhouette, head, armor's main
    shapes and the dominant colour must read at that size. Fine detail is a bonus layer on strong big shapes:
    **big shape -> medium shape -> detail**, never detail without structure.
11. **Detail budget:** a body armor has 3 big shapes (e.g. breastplate, skirt, pauldrons), up to 6 medium shapes,
    and detail (rivets, trim, stitches, scratches) concentrated on 2 focal areas, typically chest and shoulders.
    Calm areas let detail areas sing. Uniform all-over detail is forbidden.

---

## 5. Light

- **Key light:** upper left, slightly in front, warm-neutral (tallow candle and grey daylight mixed). Brightest
  values on top-left planes: pauldron tops, forehead, top of the breastplate, top of the boots.
- **Rim light:** back right, cold moonlight, the 1 AP signature rim (section 4.5).
- **Bounce:** from below, very faint warm brown (`#3e2a1a`-ish) in the deepest under-planes, as if from a torch-lit
  floor. Optional; never brighter than the 2nd ramp step.
- **Emissive:** only for magic and fire: runes, gems, embers, eyes. Emissive pixels use the glow ramps and the
  brightest step sits in the core, 1-3 AP; the glow may spread 1-2 AP *inside* the silhouette, never as a soft halo
  outside it. The game adds its own glow effects at runtime.
- **No cast shadows** in sprites. The game draws the ground shadow.

---

## 6. The master palette

Every sprite picks its colours from these ramps (dark -> light). Budgets follow the FF6 rule of one small palette
per sprite (section 0A): a hero body **16 colours including transparency** (Rare 20, Legendary and Mythic 24); an
overlay piece (helmet, glove pair, boot pair) **8-12**; a townsperson 16; a monster 16-24; a boss 32. Fewer colours is
better: if a design needs more, simplify the design.
Hex values are exact targets; very close is acceptable, wild deviations are not.

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

**Colour discipline:** one dominant material colour (60% of the sprite), one secondary (30%), one accent (10%, the
"jewel": a gem, a sash, a rune). Saturated colour only in the accent. Large areas stay muted. That is Diablo II's
grime with SotN's jewel accents.

**Rarity reads through craft and materials, not through brightness alone:**

| Rarity | Look |
|---|---|
| Common | patched, mismatched, dented, frayed hems, rope belts, plain iron and leather, no trim |
| Uncommon | matched set, sturdier, riveted, simple bronze buckles, one modest motif |
| Rare | fitted and tailored, gilt or silver trim, layered plates, a heraldic or cult motif |
| Epic | ornate: engraved plate, embossed relief, gem settings, tabards with embroidery, asymmetric statement piece |
| Legendary | ceremonial and storied: reliquary plates, saint/demon iconography, one emissive accent (runes, an ember core) |
| Mythic | otherworldly: materials that should not exist (living bone, frozen flame, star-iron), strong emissive accent, a silhouette nobody else has |

---

## 7. Materials (how each one is pixelled)

- **Plate steel:** large flat planes with 2-3 value bands, a hard 1-2 AP specular streak along the top-left edge of
  each plate, dark 1 AP seam between plates, rivets as 2 x 2 AP (light top-left pixel, dark bottom-right).
  Scratches: 1 AP lines in the second-lightest step, 3-6 per armor, never noise. Rust only in recesses, as checker
  dither of leather/rust browns.
- **Mail:** a repeating 2-AP pattern (alternating rows offset by 1), darkened toward the shadow side; never per-ring
  noise; it reads as texture, not as detail.
- **Gold / brass trim:** thin 1-2 AP bands on plate edges with one bright pixel per curve; aged gold has dark
  recesses of `#3a240c`.
- **Leather:** soft value steps, stitched seams as dotted 1-AP lines (every other pixel), worn edges in a lighter
  step, straps with a 1-AP highlight on top.
- **Cloth:** folds as long tapering shapes, 3 steps; hems frayed with 1-2 AP notches on Common/Uncommon; heavy cloth
  hangs straight, fine cloth breaks in more folds. Embroidery: a 2-colour motif, never noise.
- **Fur:** clumped locks with pointed tips (3-5 AP), checker dither allowed inside clumps.
- **Bone:** ivory ramp, rounded forms, darker sockets and cracks, sickly warmth in recesses.
- **Skin:** 3 tones (shadow, mid, light) from one skin ramp, flat-then-band, no dither, warm reddish shadow shape
  under brow, nose and chin; the cheek and nose catch the key light; eyes 2-3 AP dark with at most a 1 AP glint.
  Faces are iconic and calm-to-grim (FF6 battle-sprite clarity), never cute, never chibi.
- **Hair:** 3-4 locks big shapes, each with a dark core and a 1-AP highlight on the top-left; the moon rim on the
  back edge.
- **Gems:** 2 x 2 to 4 x 4 AP, dark rim, saturated mid, 1 AP white-hot glint top-left, an emissive core if magic.
- **Magic / fire:** emissive ramps, flame tongues as tapered clusters (no smoke blur), embers as 1 AP sparks inside
  the frame.

---

## 8. Shape language: gothic, heavy, original

- **Costume theatre first** (FF6): every outfit is a costume with a story from its design card (section 0B), worn
  by this class's character, then made grim. Costume reads before armor reads.
- **Silhouette first:** every armor needs a silhouette idea you could recognise in solid black: a horned collar,
  stacked pauldrons, a split tabard, a bell-shaped coat, a ribcage cuirass. Two armors of one class may not share a
  silhouette idea.
- **Gothic vertical rhythm** (SotN): tall tapering shapes, pointed arches, long tabards and coat tails, spikes that
  point down more than up.
- **Weight** (Diablo II): straps, buckles, overlapping layers, thick hems, armor that sits on shoulders and hips.
  Things look forged, sewn, worn and repaired.
- **Ornament** (FF6 and Amano): flourishes appear on 1-2 focal pieces: a filigree collar, a saint relief on the chest,
  a demon face on a belt plate. Ornament follows the form, it doesn't float.
- **Class identity is constant across all its armors:** each class keeps a motif family (section 12) so all 80+
  armors stay recognisably that class.

---

## 9. ANTI-SLOP RULES (instant rejection list)

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

---

## 10. Asset-type rules

### 10.1 Hero pose masters (one per class, made once)
The class's base body in the new style: the class's own face, hair and skin, wearing only the class's plain
**underlayer** (arming doublet or padded gambeson, linen shirt, braies or trousers, simple leather shoes and a
belt), in the exact pose lock. This image is the reference for every armor and overlay of that class forever. It is
approved by a human before any armor is drawn, and saved in `assets/source/pose_masters/<class>.png`.

### 10.2 Body armors (5 per sheet)
The pose master wearing a new outfit: torso, arms, legs, boots and gloves that *come with the outfit* (the game
draws a body armor as one picture; separate glove/boot overlays draw over it). Bare head. Rarity per section 6.

### 10.3 Helmets (overlay)
Drawn exactly over the pose master's head on the head zone (40 x 40 AP, top-left at (45, 63)). Fits the head: the
skull of the head inside the helmet sits where the pose master's skull is. Open helms show the face through the
opening (leave the face area transparent); closed helms cover it. Everything outside the helmet is transparent.
8-12 colours. Crests, horns and plumes may leave the zone upward, inside the frame.

### 10.4 Gloves / gauntlets (overlay)
Both hands, each drawn exactly over the pose master's fist in its hand zone (24 x 24 AP around each fist), same
clenched fist, same angle, covering the hand and wrist up to a cuff. Transparent everywhere else.

### 10.5 Boots / greaves (overlay)
Both feet and shins, drawn exactly over the pose master's legs in the boots zone (76 x 40 AP, top-left (28, 150)),
soles exactly on y 183. Transparent above the boot tops.

### 10.6 Townsfolk (11 frames: idle 1-3, walk 1-2, dying, dead, scream, point, happy, cheer; knights +2 attacks)
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

---

## 11. QA checklist (run on every returned image)

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

---

## 12. Class identities: costume theatres

Each class is a *character* with a theatre of its own (FF6 thinking: Edgar is a king-engineer, Setzer a gambler,
Shadow a ninja-for-hire). Every armor of the class is a costume from that theatre; the hero's face, hair and build
never change. Use the theatre to pick design cards; never repeat a card.

| Class | Hero (face, hair, build) | Costume theatre | Signature hue contrast | Recurring shapes |
|---|---|---|---|---|
| Arcane Sorcerer | brown-haired bearded man, lean | the court orrery-keeper: an astronomer who serves a mad prince | violet / tarnished brass | brass orbit rings on the shoulders, quilted silk over an armature, lens monocle charms |
| Barbarian | muscular red-haired woman, powerful | the champion of a frozen fighting-pit carnival | rust red / glacier teal | fur over hooped iron ribs, prize ribbons and medals, trophy straps, bare scarred arms |
| Bard | curly dark-haired bearded man | the touring tragedian of a cursed opera company | wine / saffron | slashed doublets, stage capes, ruffs, mask charms, score-sheet sashes |
| Boomerang Knight | short black-haired woman | the falconer-courier of a border kingdom | teal / copper | crescent pauldrons, gauntlet cuffs, flight-feather fringes, layered capelets |
| Carrion Witch | pale woman, long grey hair | the crow-wife who sings at plague funerals | ash grey / bruise violet | feathered capelets, funeral veils on the shoulders, ossuary charms on cords, ragged hems |
| Death Knight | pale man, close-cropped black hair | the last honour guard of a drowned mausoleum | blackened steel / cold cyan | tomb-lid plates, funeral sashes, verdigris tears, hourglass buckles |
| Dragon Knight | auburn-haired woman | the scale-smith of a dragon-worship cult | copper red / sea green | overlapping scale lamellar, wing-rib pauldrons, ember-glass buckles |
| Dragoon | black-haired man | the cliff-temple jumper who serves a sky shrine | slate blue / burgundy | angular wing-edged plates, stilt greaves, long split tabards, prayer flags |
| Gunner | dark-haired moustached man | the powder-engineer of a magitek artillery corps | charcoal / brass and scarlet | long coats with gauges, bandoliers of cartridges, bellows packs, goggles worn on the chest (never on the head) |
| Lancer | large broad man, short brown hair | the bastion-warden who holds a siege gate | iron grey / heraldic ochre | fortress-tower pauldrons, gate-bar plates, portcullis motifs, heavy tasset skirts |
| Necromancer | pale bald man | the archive keeper of a forbidden ossuary-library | soot black / sickly gold | ledger-plates, bone lacework, wax-seal strips, index-tab sashes, ink-stained cuffs |
| Paladin | dark-skinned bearded man | the saint's-day processional guard of a sun cathedral | silver / navy and gold | sunburst gorgets, processional banners on the back, reliquary-glass chest plates |
| Ranger | red-haired woman | the warden-poacher of a royal deer park | moss / rose | leaf lamellar, antler toggles, quiver-shaped back gear (no weapons), hunting-horn charms |
| Slime Lord | humanoid of translucent cobalt slime, bare round slime head | the alchemist's runaway experiment wearing stolen armor | cobalt / bruised purple | mismatched plates held on by oozing slime, glass vials, specimen tags |
| Totem Master | brown-skinned man, long dark hair | the carver of guardian totems for a river people | moss bronze / turquoise | carved wooden plates, bead strings, mask-faced belt totems, woven reed capes |
| Wizard | silver-haired man | the cartographer-mage of a lost cathedral city | midnight blue / pale gold | map-panel robes, compass-rose clasps, folded-paper capelets, ink-pot charms |

## 13. Sources and what we took from each

- Diablo II postmortem (Erich Schaefer, Game Developer): player characters are about 75 pixels tall in game,
  modelled and rendered in 3D Studio Max, 640 x 480 with 8-bit colour, equipment as separately rendered components
  (head, torso, legs, arms, weapon, shield) composited at runtime: the root of VELSCOUR's body-armor + overlay system.
  https://www.gamedeveloper.com/design/postmortem-blizzard-s-i-diablo-ii-i-
- Symphony of the Night: 256 x 240 on PlayStation (Hardcore Gaming 101); character designs by Ayami Kojima, whose
  painted, gothic, bishonen-influenced art the sprites translate into pixels; Alucard measured at about 54 px tall.
  http://blog.hardcoregaming101.net/2012/03/explaining-resolution-intro-of.html ,
  https://en.wikipedia.org/wiki/Castlevania:_Symphony_of_the_Night , https://en.wikipedia.org/wiki/Ayami_Kojima
- Super Famicom sprites: 4 bits per pixel, so each sprite palette is 16 colours with one reserved for transparency:
  the origin of VELSCOUR's 16-colour character rule.
- Final Fantasy VI and its Pixel Remaster: sprites by Kazuko Shibuya, redrawn for the remaster "to display clearly on
  modern high-resolution screens" while keeping the original feel; Yoshitaka Amano's concept art behind the
  ornamental enemies. https://finalfantasypixelremaster.square-enix-games.com/en_US/faq
