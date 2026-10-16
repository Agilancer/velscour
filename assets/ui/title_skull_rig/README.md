# Velscour skull animation rig

This rig defines a reusable oval cutout centered over the title logo's O and a 3×6 normal-talking atlas (three separate six-frame loops).

## Files

- `starting_cutout.svg` applies the production oval to the skull and hoop in `../title_skull_animations/source_overlay.png`, normalized to the 256×341 animation frame.
- `title_logo_oval_template.svg` shows the matching opening cut from the 1400×591 game logo.
- `talking_normal_3x6.png` is the normalized 6-column × 3-row atlas, with 256×341 cells.
- `talking_normal_generated_raw.png` preserves the original generated source sheet.
- `../../../tools/title-skull-rig.html` is the interactive preview and alignment rig.

The logo aperture center is `(881.5, 295.5)` with radii `(110.9, 147.7)` in 1400×591 logo coordinates. The preview page lets you drag the oval, resize its side and vertical handles, and restore this default. It uses the selected ellipse to clear the logo and clip the animation frame.
