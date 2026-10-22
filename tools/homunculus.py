"""Homunculus the Proud, the Hollow's blacksmith: cut his 30 emotion poses out of the user's three sheets.

  python tools/homunculus.py            # assets/source/npc/homunculus/poses_{1,2,3}.webp -> assets/sprites/npc/

Each sheet is 2 rows x 5 poses on a transparent background with a caption under every pose. A pose is every opaque
component in its grid cell that is taller than a caption; all poses keep one shared scale and are placed in equal
cells with the feet on the bottom row, centred. Writes homunculus.webp (one row of cells) and homunculus.json
({cell: [w, h], foot, stand, poses: {name: index}}); src/gfx/homunculus.js draws them.
"""
import json, os, sys
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'assets', 'source', 'npc', 'homunculus')
OUT = os.path.join(ROOT, 'assets', 'sprites', 'npc')
NAMES = [
  ['relieved', 'curious', 'embarrassed', 'suspicious', 'exhausted', 'frustrated', 'determined', 'surprised', 'thoughtful', 'sleepy'],
  ['nervous', 'concentrating', 'disappointed', 'shy', 'confident', 'worried', 'grateful', 'winking', 'impatient', 'apologetic'],
  ['defiant', 'mournful', 'confused', 'skeptical', 'overjoyed', 'annoyed', 'nostalgic', 'alarmed', 'focused', 'humble'],
]
CELL_H = 240   # px of the tallest standing pose plus headroom


def cut(path):
  im = Image.open(path).convert('RGBA')
  a = np.array(im)
  H, W = a.shape[:2]
  # the caption pills can touch the boots: clear each cell's caption first, a band of nearly constant width at the
  # bottom of the cell (boots are two narrower runs)
  for r in range(2):
    for c in range(5):
      x0, x1, y0, y1 = int(c * W / 5), int((c + 1) * W / 5), int(r * H / 2), int((r + 1) * H / 2)
      seen = a[y0:y1, x0:x1, 3] > 24
      def run(row):
        best = cur = 0
        for v in row: cur = cur + 1 if v else 0; best = max(best, cur)
        return best
      runs = [run(seen[y]) for y in range(y1 - y0)]
      low = next((y for y in range(y1 - y0 - 1, y1 - y0 - 90, -1) if runs[y] >= 60), None)
      if low is None: continue
      ref = max(runs[low - 10:low + 1])
      while runs[low] < 0.75 * ref: low -= 1   # the caption's narrower fringe under it
      top = low
      while low - top < 40 and 0.75 * ref <= runs[top - 1] <= 1.2 * ref: top -= 1
      if low - top >= 8: a[y0 + top - 1:y1, x0:x1] = 0
  lab, n = ndimage.label(a[..., 3] > 24)
  boxes = ndimage.find_objects(lab)
  poses = []
  for r in range(2):
    for c in range(5):
      x0, x1, y0, y1 = c * W / 5, (c + 1) * W / 5, r * H / 2, (r + 1) * H / 2
      keep = []
      for i, b in enumerate(boxes):
        ys, xs = b
        cx, cy = (xs.start + xs.stop) / 2, (ys.start + ys.stop) / 2
        if x0 <= cx < x1 and y0 <= cy < y1 and ys.stop - ys.start > 60: keep.append(i + 1)
      mask = np.isin(lab, keep)
      # a plain-text caption joined on by its faint halo: the bottom band below rows with no solid pixels
      solid = (mask & (a[..., 3] > 150)).any(1)
      ys = np.nonzero(solid)[0]
      for y in range(ys.max(), ys.min() + 100, -1):
        if not solid[y] and not solid[y - 1] and ys.max() - y < 60: mask[y:] = False; break
      ys, xs = np.nonzero(mask)
      bx0, bx1, by0, by1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
      crop = a[by0:by1, bx0:bx1].copy()
      crop[~mask[by0:by1, bx0:bx1]] = 0
      # the feet: the middle of the opaque pixels in the bottom eighth
      fy = int((by1 - by0) * 0.875)
      fx = np.nonzero(crop[fy:, :, 3] > 24)[1]
      poses.append((Image.fromarray(crop), (fx.min() + fx.max()) / 2))
  return poses


def main():
  poses, names = [], []
  for i, row in enumerate(NAMES):
    poses += cut(os.path.join(SRC, f'poses_{i + 1}.webp'))
    names += row
  stand = max(p.height for p, _ in poses)
  k = CELL_H * 0.96 / stand
  half = max(max(foot, p.width - foot) for p, foot in poses) * k
  cw = int(np.ceil(half * 2)) + 4
  sheet = Image.new('RGBA', (cw * len(poses), CELL_H), (0, 0, 0, 0))
  for i, (p, foot) in enumerate(poses):
    s = p.resize((max(1, round(p.width * k)), max(1, round(p.height * k))), Image.LANCZOS)
    sheet.alpha_composite(s, (int(i * cw + cw / 2 - foot * k), CELL_H - s.height))
  os.makedirs(OUT, exist_ok=True)
  sheet.save(os.path.join(OUT, 'homunculus.webp'), lossless=False, quality=92, method=6)
  meta = {'cell': [cw, CELL_H], 'stand': round(stand * k), 'poses': {n: i for i, n in enumerate(names)}}
  with open(os.path.join(OUT, 'homunculus.json'), 'w') as f: json.dump(meta, f, indent=1)
  print('homunculus:', len(poses), 'poses,', sheet.size, 'cell', cw, 'x', CELL_H)


if __name__ == '__main__':
  main()
