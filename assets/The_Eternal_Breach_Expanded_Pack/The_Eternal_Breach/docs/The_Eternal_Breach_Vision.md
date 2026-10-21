# The Eternal Breach
## Biome vision and production notes

### Core idea

A graveyard has been split open by a wound that does not close. The burial ground and the catacombs beneath it form one continuous place: paths, roots, and broken graves descend through the fissure into ossuary halls, while buried architecture rises through the earth. The dungeon is the hidden underside of the same cursed landscape.

The breach is ancient and active. It has exposed chambers sealed for generations, disrupted burial rites, and drawn the dead toward the opening. The mood is solemn and oppressive; the strange light stays scarce enough that each glimpse matters.

### Visual direction

Keep the VELSCOUR reference pack’s 2:1 dimetric pixel-isometric language, crisp hard-edged pixel clusters, dense material texture, and dark outline treatment. Favor charcoal, ash gray, dirt brown, tarnished iron and bronze, and aged bone. Use chipped stone, granular rubble, tight shadow clusters, and restrained candle warmth.

The breach adds a distinct accent: bruised violet in the depths and rare sickly green pixels in the deepest fractures or where its light touches stone. Keep the upper graveyard cold and muted. Avoid broad neon glows and smooth gradients.

### Scene composition

The graveyard platform fractures around a central fissure. On the surface, a ruined chapel threshold, leaning headstones, iron fencing, dead trees, exposed roots, and cracked flagstones mark the burial ground. A heavy ossuary arch bridges one edge of the split. Below, stacked burial galleries, sealed cells, bone niches, collapsed passages, coffin shelves, and candlelit alcoves reveal the catacombs. The visible masonry below should connect to foundations above.

Layer earth and masonry so the vertical transition reads quickly. Thread roots through the opening and into the lower halls. Keep the rift silhouette open and readable as the main focal point.

### Landmark and prop ideas

- **The Split Chapel:** a broken funerary arch and chapel threshold straddling the crack, where surface rites meet the buried halls.
- **Rootbound Graves:** headstones and low mausoleums pierced by roots that vanish into the breach.
- **Ossuary Galleries:** recessed skull niches, bone stacks, family vaults, and sealed doors embedded in the cutaway walls.
- **The Last Procession:** overturned sarcophagi, a collapsed bier, prayer books, and grave goods leading toward the opening.
- **Breach markers:** iron stakes, chain anchors, and cracked memorial stones around unstable edges, suggesting attempts to bind or measure the wound.

The pack includes corresponding floors, wall families, arches, doors, and 40 scatter props. The full inventory is listed in `manifest.json` and the searchable browser.

### Ground and architecture

Surface ground moves between grave cobbles, cracked flagstone, rootbound earth, weathered limestone, gravel, and patches of bone inlay. Near the rift, use branching fractures and occasional dark, glassy stone. Underground, reuse the same stone vocabulary with ossuary reliefs, funerary chapel details, and ironwork. Transition tiles blend soil, roots, masonry, and a few violet seam pixels rather than making every tile glow.

Architecture feels old and load-bearing: thick piers, chipped carved lintels, iron reinforcement, and burial niches. The major arch frames the void. Doors and gates look like barriers built by people, now bent or undermined by the earth’s movement.

### Lighting and atmosphere

Keep most of the scene in cool shadow. Use small warm candle pools in protected niches and shrines. Let the breach provide the only unnatural light: violet in the deepest void with occasional green edging. Suggest surface fog, dust, and ash with sparse pixel clusters rather than soft overlays. The first visual pass emphasizes empty space and broken paths.

### Environmental storytelling hooks

A gradual descent can move from safe graveyard approach to unstable rim, exposed burial galleries, then sealed halls. Surface and underground routes can reconnect through collapsed floors and root-lined shafts. Visual clues can show which barriers were meant to keep something in, which were meant to keep the dead from escaping, and which failed recently. Candles and disturbed objects can guide attention without UI markers. These are mood and level-design hooks, not final mechanics or lore.

### Production status and constraints

The pack includes 236 generated sprite frames, transparent and labeled sheets, an offline browser, placement metadata, and mechanical QA evidence. The builder confirms inventory, canvas, alpha, topology, pivot/state, mask, and repeat checks. Its seam certification applies only to each of the first 10 floors repeated with itself; arbitrary material transitions are not certified. Generated scatter is visually matched art, not analytically verified 3D geometry. The concept sheet is a mood reference; it is not a finished assembled level or a substitute for engine integration and gameplay review.

Preserve the 160 × 80 floor slot, 2:1 basis vectors, supplied sprite canvases and pivots, nearest-neighbor sampling, transparent margins, and integer placement when importing. The pack is engine-neutral PNG art, not a native Diablo DT1/DCC package.
