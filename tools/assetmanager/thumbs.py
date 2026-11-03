"""Thumbnail sheets for the asset manager (tools/assetmanager/).

build.mjs writes a job (JSON on stdin): {"cell": 96, "out": "tools/assetmanager/thumbs", "items": [[key, path, [x, y, w, h] | null, flags], ...]}
flags: "p" pixel art (upscale by whole steps, nearest), "n" keep the margins (no trim to the alpha box).
Each crop is trimmed to its opaque box, fitted into a cell and packed 12 x 12 to a lossy WebP sheet.
Prints {"sheets": [{"f": "thumbs/t0.webp?v=...", "c": 12, "r": 12}], "at": {key: [sheet, index]}, "bad": [...]} on stdout.
Needs Pillow. Run through build.mjs, not by hand.
"""
import hashlib
import json
import os
import sys
from collections import OrderedDict

from PIL import Image

job = json.load(sys.stdin)
CELL = job.get('cell', 96)
OUT = job['out']
COLS = 12
PER = COLS * COLS
PAD = 3
cache = OrderedDict()


def load(path):
    if path in cache:
        cache.move_to_end(path)
        return cache[path]
    im = Image.open(path)
    im.load()
    im = im.convert('RGBA')
    cache[path] = im
    if len(cache) > 10:
        cache.popitem(last=False)
    return im


def thumb(path, rect, flags):
    im = load(path)
    if rect:
        x, y, w, h = [int(round(v)) for v in rect]
        x, y = max(0, x), max(0, y)
        w, h = min(w, im.width - x), min(h, im.height - y)
        if w <= 0 or h <= 0:
            raise ValueError('empty rect %s on %dx%d' % (rect, im.width, im.height))
        im = im.crop((x, y, x + w, y + h))
    if 'n' not in flags:
        box = im.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox()
        if box:
            im = im.crop(box)
    w, h = im.size
    room = CELL - 2 * PAD
    k = room / max(w, h)
    if k >= 1:
        k = min(4, int(k)) if 'p' in flags else min(k, 3)
        k = max(1, k)
        res = Image.NEAREST if 'p' in flags else Image.LANCZOS
    else:
        res = Image.LANCZOS
    tw, th = max(1, round(w * k)), max(1, round(h * k))
    if (tw, th) != (w, h):
        im = im.resize((tw, th), res)
    return im


os.makedirs(OUT, exist_ok=True)
for f in os.listdir(OUT):
    if f.endswith('.webp'):
        os.remove(os.path.join(OUT, f))

at, bad, sheets = {}, [], []
items = job['items']
order = sorted(range(len(items)), key=lambda i: items[i][1] or '')  # group by source file so the cache hits
cells = []
for i in order:
    key, path, rect, flags = items[i]
    try:
        cells.append((key, thumb(path, rect, flags or '')))
    except Exception as e:  # noqa: BLE001 - report and carry on
        bad.append([key, path, str(e)])
key_pos = {it[0]: j for j, it in enumerate(items)}
cells.sort(key=lambda c: key_pos[c[0]])

for s in range(0, len(cells), PER):
    chunk = cells[s:s + PER]
    rows = (len(chunk) + COLS - 1) // COLS
    sheet = Image.new('RGBA', (COLS * CELL, rows * CELL), (0, 0, 0, 0))
    for n, (key, im) in enumerate(chunk):
        cx, cy = (n % COLS) * CELL, (n // COLS) * CELL
        sheet.paste(im, (cx + (CELL - im.width) // 2, cy + (CELL - im.height) // 2), im)
        at[key] = [len(sheets), n]
    name = 't%d.webp' % len(sheets)
    path = os.path.join(OUT, name)
    sheet.save(path, 'WEBP', quality=84, method=5)
    v = hashlib.md5(open(path, 'rb').read()).hexdigest()[:8]
    sheets.append({'f': 'thumbs/%s?v=%s' % (name, v), 'c': COLS, 'r': rows})

json.dump({'sheets': sheets, 'at': at, 'bad': bad}, sys.stdout)
