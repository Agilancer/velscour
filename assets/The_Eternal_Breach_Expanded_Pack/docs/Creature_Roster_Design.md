# Eternal Breach Creature Roster

The collection contains **200 regular monsters and 30 bosses**. Every roster entry is a creature design, with a unique ID, name, biome family, short description, size tier, and source atlas cell recorded in `../Creatures/catalogue.json` and `.csv`.

The regular roster spans bone-and-crypt predators, root and fungal broods, impossible breach anatomy, crypt fauna, echo and veil beasts, living stone, deep crawlers, and coffin-born amalgams. The boss roster takes those motifs to larger, more legible silhouettes: fused remains, ritual organisms, impossible structures that behave like animals, and massive rift-warped beasts. The stranger designs use asymmetry, repeated eyes or mouths, impossible joints, nested silhouettes, and anatomy that folds back into itself.

The source sheets were separated into individual PNGs, reduced to each roster entry's assigned sprite height, centered on transparent canvases, converted to hard alpha, and mapped to the compact VELScour-inspired palette. Regular sprites use at most 24 opaque colors; bosses use at most 32. QA sheets are labeled with stable IDs so each sprite can be matched back to its catalogue entry.

## Palette and rendering

Bone, tarnished stone, cold steel, rust, and dark plum carry the main forms. Violet and lilac call attention to eyes, rift organs, seams, and aberrant anatomy. The sprite canvases use binary alpha. Preserve nearest-neighbor sampling in engine and use the catalogue dimensions and assigned height as the intended scale guide.
