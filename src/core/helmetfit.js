// Shared by the game and the visual fitting tool. Coordinates are body-frame pixels;
// x/y locate the atlas cell's top left, including transparent padding. Rotation is degrees around the visible center.
export function resolveHelmetFit(meta, placements, cls, design, headTop) {
  const f = meta.fit, [w] = meta.frame;
  const scaleX = f.scaleX ?? f.scale, scaleY = f.scaleY ?? f.scale;
  const fallback = {
    x: f.xAnchor - w * scaleX / 2 + (f.xOffset || 0),
    y: headTop + f.baselineOffset - f.sourceBaseline * scaleY + (f.yOffset || 0),
    scaleX, scaleY, rotation: 0,
  };
  return { ...fallback, ...placements?.classes?.[cls]?.[String(design)] };
}
