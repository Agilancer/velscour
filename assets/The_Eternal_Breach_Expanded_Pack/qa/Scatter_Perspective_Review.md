# Scatter Terrain Perspective Review

The 40 Eternal Breach scatter props were regenerated from two corrected source atlases with an explicit orthographic 2:1 dimetric camera instruction. The revised atlases replace the earlier scatter sources in `The_Eternal_Breach/source_art/`; the unpacked source copies are in `../source_atlases/corrected_eternal_scatter/`.

## Review criteria

- Ground contact faces follow the same two-axis basis as the 160×80 floors: `u=(+80,+40)` and `v=(-80,+40)`.
- Flat tops, bases, lids, and footprints use the corresponding 2:1 diamond rather than a shallow 3:1 or near-isometric oval.
- Upright elements rise from a defined ground contact point; their vertical sides do not change the ground-plane slopes.
- Loose bones, rocks, roots, and debris remain attached to the same projected surface, without separate conflicting ground planes.
- Purple details stay on the object's surface as inlay, trim, or rift growth and do not distort its camera projection.

## Results

Reviewed the complete 40-prop contact sheet and the assembled biome preview. All 40 revised sprites are present in the rebuilt manifest. The deterministic builder reported 236 frames and `qa_pass: true`; the scatter contact sheet and room assembly are included at `The_Eternal_Breach/sheets/scatter.png` and `The_Eternal_Breach/qa/assembled_room.png`.

The audit is a visual projection and assembly check. It does not claim collision geometry or multi-view rotations for scatter props; their manifest pivots remain practical placement anchors.
