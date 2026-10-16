# Velscour skull animation rig

This rig defines a reusable oval cutout centered over the title logo's O and a 3×6 normal-talking atlas (three separate six-frame loops).

## Files

- `starting_cutout.svg` marks the selected crop; `skull_oval_cutout.png` is the transparent oval cutout used in the composite.
- `title_logo_oval_template.svg` shows the matching opening cut from the 1400×591 game logo.
- `talking_normal_3x6.png` is the normalized 6-column × 3-row atlas, with 256×341 cells.
- `talking_normal_generated_raw.png` preserves the original generated source sheet.
- `../../../tools/title-skull-rig.html` is the interactive preview and alignment rig.

The punchout matches the oval in the supplied reference screenshot: center `(881.5, 295.5)`, radii `(67, 99)` in 1400×591 logo coordinates. `tools/build-title-skull-oval.py` recreates the transparent PNG cutout and logo composite. The preview page lets you drag the oval, resize its side and vertical handles, and restore this default.
