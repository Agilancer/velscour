"""Cut the user's People and Animals sheets (VELSCOUR_People_and_Animals.zip) into runtime atlases.

Every sheet is a grid of labelled emotion poses: five columns, two rows (ten poses) or, for the Greener sheets, four
rows (twenty). The labels are text lines under each pose; they are found as text-line components and erased (the
two-line DEAD label sometimes touches the body, then only the label's own rows are cleared). Each pose is planted
with its feet (or, lying down, its middle) on one baseline, scaled by ONE factor per character taken from the idle
pose, so a raised arm never shrinks the figure. Animals get a per-species height so a cat stays cat-sized.

    python tools/build_people_pack.py <VELSCOUR_People_and_Animals.zip | extracted folder>

Writes assets/sprites/people/<id>.webp (cells FRAME_W x FRAME_H), manifest.json and art-review/people-cuts.jpg.
The 100 MB zip stays outside the repo.
"""
from pathlib import Path
import io, json, sys, zipfile
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as nd

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets/sprites/people'
REVIEW = ROOT / 'art-review'
FRAME_W, FRAME_H, BASE_Y = 256, 200, 194
STD = ['idle', 'angry', 'scared', 'point', 'dead', 'excited', 'love', 'cheer', 'attack', 'happy']
EXTRA = ['confused', 'embarrassed', 'proud', 'curious', 'worried', 'suspicious', 'sleepy', 'surprised', 'thinking', 'relieved']
ADULT_H = 172
# idle heights (px in the cell) by sheet; anything not listed is an adult
HEIGHTS = {'25_royal_heir': 150, '00_greener_20_frames': 150, '00_greener_spooky_goofy_a': 150, '00_greener_spooky_goofy_b': 150,
           'cat_01_black': 62, 'cat_02_tabby': 64, 'cat_03_tortoiseshell': 62, 'dog_01_small_terrier': 68, 'dog_02_hound': 86,
           'dog_03_shepherd': 94, 'deer_buck_01': 168, 'deer_doe_01': 142, 'rabbit_01': 54, 'rat_01': 38}


def sources(arg):
    p = Path(arg)
    if p.is_dir():
        for f in sorted(p.rglob('*.png')):
            yield f.parent.name, f.stem, Image.open(f).convert('RGBA')
    else:
        z = zipfile.ZipFile(p)
        for n in sorted(z.namelist()):
            if n.lower().endswith('.png'):
                yield Path(n).parent.name, Path(n).stem, Image.open(io.BytesIO(z.read(n))).convert('RGBA')


def cut(img, rows):
    """[pose masks] in reading order. Labels: every grid row's single-line labels share one y band (found from the
    labels that stand clear of their figure); the DEAD label (top row, last column) is two lines, found from the
    lowest pixels in its column. Inside a label box a component that lies wholly in it is text and goes; a component
    that runs down through it is a figure touching its label, and only its pixels inside the box go."""
    a = np.array(img)
    m = a[..., 3] > 24
    H, W = m.shape
    cw = W / 5
    lab, n = nd.label(m, structure=np.ones((3, 3)))
    sl = nd.find_objects(lab)
    clean = [s for s in sl if 16 <= s[0].stop - s[0].start <= 40 and s[1].stop - s[1].start >= 34]
    lh = int(np.median([s[0].stop - s[0].start for s in clean])) if clean else (27 if rows == 2 else 19)
    bands = []
    for s in sorted(clean, key=lambda s: s[0].start):
        if bands and s[0].start - bands[-1][0][0].start < 40: bands[-1].append(s)
        else: bands.append([s])
    # the dead label's own two lines can form a band of their own: keep bands seen in 2+ columns or 2+ labels
    bands = [b for b in bands if len({int(((q[1].start + q[1].stop) / 2) // cw) for q in b}) >= 2 or len(bands) <= rows]
    tops = [int(np.median([q[0].start for q in b])) for b in bands]
    big = [s for s in sl if (s[0].stop - s[0].start) > 120]
    while len(tops) < rows:
        # every label of a row touches its figure: the figures all end on the label's bottom row
        k = len(tops)
        below = [s[0].stop for s in big if (s[0].start + s[0].stop) / 2 > (tops[-1] if tops else 0) + 40
                 and k * H / rows <= (s[0].start + s[0].stop) / 2 < (k + 1) * H / rows]
        assert below, f'expected {rows} label rows, found {len(tops)}'
        tops.append(int(np.median(below)) - lh)
    assert len(tops) == rows, f'expected {rows} label rows, found {len(tops)}'
    boxes = {}
    for ri, y0 in enumerate(tops):
        y1 = y0 + lh
        for ci in range(5): boxes[(ri, ci)] = (y0 - 1, y1 + 1, int(ci * cw) - 24, int((ci + 1) * cw) + 24)
    # DEAD: the lowest opaque row in its column near the first band
    y0, y1 = boxes[(0, 0)][:2]
    # its lines: small components in its column starting at the band, else the band plus one line
    dl = [s for s in sl if s[1].start + s[1].stop > 8 * cw and y0 - 6 <= s[0].start <= y0 + lh + 10
          and s[0].stop - s[0].start <= 2 * lh + 10 and s[1].stop - s[1].start >= 30]
    db = max([s[0].stop for s in dl] + [y1 + lh - 2])
    boxes[(0, 4)] = (db - 2 * lh - 3, db + 1, int(4 * cw) - 30, W)
    keepm = m.copy()
    for (ri, ci), (by0, by1, bx0, bx1) in boxes.items():
        bx0, bx1 = max(0, bx0), min(W, bx1)
        ids = np.unique(lab[by0:by1, bx0:bx1]); ids = ids[ids > 0]
        for i in ids:
            s = sl[i - 1]
            if s[0].start >= by0 - 3 and s[0].stop <= by1 + 3: keepm[lab == i] = False   # text
            else:
                # a figure touching its label: its pixels in the box go if they read as label (a black plate with
                # cream letters); a body that only shares the rows (a lying cat beside the DEAD label) stays
                inb = lab[by0:by1, bx0:bx1] == i
                px = a[by0:by1, bx0:bx1][inb][:, :3].astype(int)
                if not len(px): continue
                lum = px.max(axis=1)
                cream = ((px[:, 0] > 185) & (px[:, 1] > 170) & (px[:, 2] > 135) & (px[:, 0] - px[:, 2] < 75)).mean()
                if s[0].stop >= by1 - 4 or ((ri, ci) == (0, 4) and s[0].stop > by0 + 1.3 * lh) or ((lum < 40).mean() > 0.3 and cream > 0.08):
                    keepm[by0:by1, bx0:bx1][inb] = False
    lab2, n2 = nd.label(keepm, structure=np.ones((3, 3)))
    sl2 = nd.find_objects(lab2)
    sizes = nd.sum(keepm, lab2, range(1, n2 + 1))
    rowEnd = [boxes[(ri, 0)][1] for ri in range(rows)]
    rowEnd[0] = max(rowEnd[0], boxes[(0, 4)][1])
    keep = {}
    for i, s in enumerate(sl2):
        if sizes[i] < 40: continue
        cy, cx = (s[0].start + s[0].stop) / 2, (s[1].start + s[1].stop) / 2
        ri = next((k for k in range(rows) if cy <= rowEnd[k] + 4), rows - 1)
        keep.setdefault((ri, min(4, int(cx // cw))), []).append(i + 1)
    out = []
    for ri in range(rows):
        for ci in range(5):
            ids = keep.get((ri, ci), [])
            if ids:
                # anything wholly under the figure's lowest row is label debris
                main = max(ids, key=lambda i: sizes[i - 1])
                bot = sl2[main - 1][0].stop
                ids = [i for i in ids if sl2[i - 1][0].start < bot - 3]
            out.append(np.isin(lab2, ids))
    return a, out


def plant(a, pm, scale, lying):
    ys, xs = np.nonzero(pm)
    if not len(ys): return Image.new('RGBA', (FRAME_W, FRAME_H)), None
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    crop = a[y0:y1, x0:x1].copy()
    crop[..., 3] = np.where(pm[y0:y1, x0:x1], crop[..., 3], 0)
    # feet: the middle of the lowest 12% of the figure; lying: the bbox middle
    if lying: fx = (x0 + x1) / 2
    else:
        lo = ys >= y1 - max(4, (y1 - y0) * 0.12)
        fx = (xs[lo].min() + xs[lo].max()) / 2
    w, h = x1 - x0, y1 - y0
    s = scale
    # a pose too big for the cell shrinks (rare: a cheering deer)
    s = min(s, (BASE_Y - 2) / h, (FRAME_W - 4) / w)
    im = Image.fromarray(crop).resize((max(1, round(w * s)), max(1, round(h * s))), Image.LANCZOS)
    cell = Image.new('RGBA', (FRAME_W, FRAME_H))
    left = round(FRAME_W / 2 - (fx - x0) * s)
    left = max(2, min(FRAME_W - 2 - im.width, left))
    cell.alpha_composite(im, (left, BASE_Y - im.height))
    return cell, h


def main():
    if len(sys.argv) < 2: sys.exit(__doc__)
    OUT.mkdir(parents=True, exist_ok=True)
    manifest = {'name': 'Velscour People and Animals', 'frameSize': [FRAME_W, FRAME_H], 'baseline': BASE_Y,
                'standardFrames': STD, 'extraFrames': EXTRA, 'sheets': []}
    review = []
    for folder, stem, img in sources(sys.argv[1]):
        rows = 4 if stem.startswith('00_greener') else 2
        print(stem, flush=True); a, poses = cut(img, rows)
        idle = poses[0]
        ys = np.nonzero(idle)[0]
        scale = HEIGHTS.get(stem, ADULT_H) / (ys.max() - ys.min() + 1)
        names = STD + (EXTRA if rows == 4 else [])
        cells = [plant(a, pm, scale, nm == 'dead')[0] for pm, nm in zip(poses, names)]
        atlas = Image.new('RGBA', (FRAME_W * len(cells), FRAME_H))
        for i, c in enumerate(cells): atlas.alpha_composite(c, (i * FRAME_W, 0))
        sid = stem
        atlas.save(OUT / f'{sid}.webp', 'WEBP', lossless=True, method=6)
        manifest['sheets'].append({'id': sid, 'kind': 'animal' if folder == 'animals' else 'person', 'frames': names,
                                   'idleH': HEIGHTS.get(stem, ADULT_H)})
        review.append((sid, atlas))
        print(sid, len(cells), 'frames')
    (OUT / 'manifest.json').write_text(json.dumps(manifest, indent=1))
    REVIEW.mkdir(exist_ok=True)
    wmax = max(r[1].width for r in review) // 2
    rv = Image.new('RGB', (wmax, len(review) * (FRAME_H // 2 + 12)), (70, 90, 70))
    d = ImageDraw.Draw(rv)
    for i, (sid, at) in enumerate(review):
        y = i * (FRAME_H // 2 + 12)
        sm = at.resize((at.width // 2, at.height // 2), Image.LANCZOS)
        rv.paste(sm, (0, y + 12), sm)
        for k in range(at.width // FRAME_W): d.line([(k * FRAME_W // 2, y + 12), (k * FRAME_W // 2, y + 12 + FRAME_H // 2)], fill=(90, 110, 90))
        d.line([(0, y + 12 + BASE_Y // 2), (wmax, y + 12 + BASE_Y // 2)], fill=(110, 140, 110))
        d.text((2, y), sid, fill=(255, 255, 0))
    rv.save(REVIEW / 'people-cuts.jpg', quality=88)


if __name__ == '__main__':
    main()
