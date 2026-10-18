"""Cut the generated Velscour townsfolk sheets into runtime atlases.

Every pose is found as a connected alpha component (no grid: the source sheets are ragged and poses overhang their
cells), labelled by hand below, scaled by ONE factor per character (taken from the idle poses, so a raised arm or a
fallen body never shrinks the figure) and planted with its hips/feet on a shared baseline. Cells are 256 x 192 so the
dying, dead and sword poses fit whole. Colourways 26-100 are rebuilt from the clean cuts of identities 1-10 by shifting
only the dyed cloth (skin, hair, leather and metal keep their colours).

    python tools/build_townsfolk_pack.py
"""
from pathlib import Path
import colorsys, io, json, zipfile
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage as nd

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets/sprites/townsfolk'
SOURCES = OUT / 'generated_sources'
REVIEW = ROOT / 'art-review'
FRAME_W, FRAME_H, BASE_Y = 256, 192, 186
ADULT_H, CHILD_H, YOUTH_H = 172, 132, 160
STD = ['idle_1', 'idle_2', 'idle_3', 'walk_1', 'walk_2', 'dying', 'dead', 'scream', 'point', 'happy', 'celebrate']
STD_MAP = {n: i for i, n in enumerate(STD)}

# (source, label, size, {frame name: blob index in reading order}, extras [(name, blob)] , knight)
# Blob indices come from the numbered contact sheets (rows by feet line, then left to right).
SPECS = [
    ('baker', 'Village Baker', 'adult', STD_MAP, [], False),
    ('charcoal_burner', 'Charcoal Burner', 'adult', STD_MAP, [], False),
    ('boy', 'Village Boy', 'child', STD_MAP, [], False),
    ('girl', 'Village Girl', 'child', STD_MAP, [], False),
    ('merchant', 'Traveling Merchant', 'adult', STD_MAP, [], False),
    ('healer', 'Village Healer', 'adult', STD_MAP, [], False),
    ('watchman', 'Town Watchman', 'adult', STD_MAP, [], False),
    ('noblewoman', 'Noblewoman', 'adult', STD_MAP, [], False),
    ('smith', 'Blacksmith', 'adult', STD_MAP, [], False),
    ('king', 'King', 'adult', STD_MAP, [], False),
    ('ferryman', 'Ferryman', 'adult', STD_MAP, [], False),
    ('tavern_keeper', 'Tavern Keeper', 'adult', STD_MAP, [], False),
    ('midwife', 'Midwife', 'adult', STD_MAP, [], False),
    ('carpenter', 'Carpenter', 'adult', STD_MAP, [], False),
    ('herbalist', 'Herbalist', 'adult', STD_MAP, [], False),
    ('shepherd', 'Shepherd', 'youth', STD_MAP, [], False),
    ('miller', 'Miller', 'adult', STD_MAP, [], False),
    ('seamstress', 'Seamstress', 'adult', STD_MAP, [], False),
    ('knight_aldric', 'Knight Aldric', 'adult', STD_MAP, [('attack_1', 11), ('attack_2', 12)], True),
    ('knight_maeve', 'Knight Maeve', 'adult', STD_MAP, [('attack_1', 11), ('attack_2', 12)], True),
    ('knight_bastian', 'Knight Bastian', 'adult', STD_MAP, [('attack_1', 11), ('attack_2', 'attacks:1')], True),
    ('knight_rosette', 'Knight Rosette', 'adult', {**STD_MAP, 'happy': 10, 'celebrate': 11}, [('attack_1', 12), ('attack_2', 9)], True),
    ('royal_steward', 'Royal Steward', 'adult', STD_MAP, [('gesture', 11)], False),
    ('court_lady', 'Lady of the Court', 'adult', {**STD_MAP, 'happy': 10, 'celebrate': 12}, [('fan', 9), ('shy', 11)], False),
    # the scribe's dead and celebrate poses touch: blob 9 is split along its narrowest row
    ('royal_scribe', 'Royal Scribe', 'adult', {**STD_MAP, 'dead': '9top', 'scream': 6, 'point': 7, 'happy': 8, 'celebrate': '9bottom'}, [('read', 10)], False),
]
LYING = {'dying', 'dead'}


def components(img):
    """Pose masks in reading order: [(bbox, mask)] with bbox (x0, y0, x1, y1) in sheet px."""
    a = np.asarray(img)[:, :, 3]
    lab, n = nd.label(nd.binary_dilation(a > 90, iterations=1))
    sizes = nd.sum(a > 90, lab, range(1, n + 1))
    objs = nd.find_objects(lab)
    big = [i for i in range(n) if sizes[i] > 3000]
    # loose specks (hair wisps, a dropped tool) join the nearest pose
    owner = np.zeros(n + 1, int)
    for i in big: owner[i + 1] = i + 1
    cents = {i: ((objs[i][1].start + objs[i][1].stop) / 2, (objs[i][0].start + objs[i][0].stop) / 2) for i in big}
    for i in range(n):
        if sizes[i] > 3000 or sizes[i] < 12: continue
        o = objs[i]; cx, cy = (o[1].start + o[1].stop) / 2, (o[0].start + o[0].stop) / 2
        j = min(big, key=lambda b: (cents[b][0] - cx) ** 2 + (cents[b][1] - cy) ** 2)
        if abs(cents[j][0] - cx) < 260 and abs(cents[j][1] - cy) < 260: owner[i + 1] = j + 1
    lab = owner[lab]
    out = []
    for i in big:
        m = (lab == i + 1)
        m = nd.binary_dilation(m, iterations=2) & (a > 0)
        ys, xs = np.nonzero(m)
        out.append(((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1), m))
    out.sort(key=lambda r: r[0][3])
    rows = []
    for r in out:
        if rows and r[0][3] - rows[-1][-1][0][3] < 110: rows[-1].append(r)
        else: rows.append([r])
    return [r for row in rows for r in sorted(row, key=lambda r: r[0][0])]


def cut(img, mask, bbox):
    x0, y0, x1, y1 = bbox
    arr = np.asarray(img)[y0:y1, x0:x1].copy()
    arr[..., 3] = np.where(mask[y0:y1, x0:x1], arr[..., 3], 0)
    return Image.fromarray(arr, 'RGBA')


def split_rows(img, mask, bbox):
    """Split a mask holding two stacked poses at its thinnest row in the middle third."""
    x0, y0, x1, y1 = bbox
    rows = mask[y0:y1, x0:x1].sum(1)
    h = y1 - y0
    k = h // 4 + int(np.argmin(rows[h // 4: 3 * h // 4]))
    top, bot = mask.copy(), mask.copy()
    top[y0 + k:] = False; bot[:y0 + k] = False
    res = []
    for m in (top, bot):
        ys, xs = np.nonzero(m)
        bb = (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)
        res.append(cut(img, m, bb))
    return res


def anchor_x(pose, lying):
    """Horizontal anchor: the bbox centre for lying poses, else the hips-to-feet mass centre (a pointing arm or a
    sword must not drag the body off its spot)."""
    a = np.asarray(pose)[:, :, 3] > 60
    if lying: return pose.width / 2
    h = a.shape[0]
    ys, xs = np.nonzero(a[int(h * 0.55):])
    return float(np.median(xs)) if len(xs) else pose.width / 2


def place(pose, scale, lying):
    p = pose.resize((max(1, round(pose.width * scale)), max(1, round(pose.height * scale))), Image.Resampling.LANCZOS)
    frame = Image.new('RGBA', (FRAME_W, FRAME_H), (0, 0, 0, 0))
    ax = anchor_x(p, lying)
    x = round(FRAME_W / 2 - ax)
    x = min(max(x, 0), FRAME_W - p.width) if p.width <= FRAME_W else (FRAME_W - p.width) // 2
    y = BASE_Y - p.height
    frame.alpha_composite(p, (max(0, x), max(0, y)), (max(0, -x), max(0, -y)))
    return frame


def build(spec):
    source, label, size, mapping, extras, knight = spec
    img = Image.open(SOURCES / f'{source}.png').convert('RGBA')
    comps = components(img)
    poses = {}
    def pose(ref):
        if ref in poses: return poses[ref]
        if isinstance(ref, str) and ref.startswith('attacks:'):
            att = Image.open(SOURCES / f'{source}_attacks.png').convert('RGBA')
            bb, m = components(att)[int(ref[8:])]
            poses[ref] = ('attacks', cut(att, m, bb))
        elif isinstance(ref, str) and ref[-3:] in ('top', 'tom'):
            i = int(ref.rstrip('topbm'))
            top, bot = split_rows(img, comps[i][1], comps[i][0])
            poses[f'{i}top'], poses[f'{i}bottom'] = ('sheet', top), ('sheet', bot)
        else:
            bb, m = comps[ref]
            poses[ref] = ('sheet', cut(img, m, bb))
        return poses[ref]
    names = STD + [n for n, _ in extras]
    refs = [mapping[n] for n in STD] + [r for _, r in extras]
    idle_h = float(np.median([pose(mapping[n])[1].height for n in ('idle_1', 'idle_2', 'idle_3')]))
    target = {'adult': ADULT_H, 'child': CHILD_H, 'youth': YOUTH_H}[size]
    scale = target / idle_h
    frames = []
    for n, r in zip(names, refs):
        kind, p = pose(r)
        s = scale
        if kind == 'attacks':  # the big attack sheets are drawn larger: crouch to 88% of a standing height
            s = target * 0.88 / p.height
        frames.append(place(p, s, n in LYING))
    return names, frames


def recolour(sheet, shift, sat, light):
    """Shift only dyed cloth: saturated hues outside the skin/hair/leather band (orange-brown) and not metal-grey."""
    a = np.asarray(sheet).astype(np.float32) / 255
    rgb, al = a[..., :3], a[..., 3]
    mx, mn = rgb.max(-1), rgb.min(-1)
    d = mx - mn
    s = np.where(mx > 0, d / np.maximum(mx, 1e-6), 0)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    h = np.zeros_like(mx)
    dm = np.maximum(d, 1e-6)
    h = np.where(mx == r, ((g - b) / dm) % 6, h)
    h = np.where(mx == g, (b - r) / dm + 2, h)
    h = np.where(mx == b, (r - g) / dm + 4, h)
    h = np.where(d == 0, 0, h / 6)
    earthy = (h > 0.0) & (h < 0.15)      # skin, hair, leather, straw, wood
    cloth = (s > 0.16) & (al > 0.03) & ~earthy
    # dark browns are cloth and hair, not skin (skin is lighter): a small dye toward the colourway's hue
    dark = earthy & (mx < 0.4) & (s > 0.2) & (al > 0.03)
    tow = ((shift + 0.5) % 1) - 0.5
    h2 = np.where(cloth, (h + shift) % 1, np.where(dark, (h + np.clip(tow, -0.09, 0.09)) % 1, h))
    s2 = np.where(cloth, np.clip(s * sat, 0, 1), np.where(dark, np.clip(s * (0.75 + sat * 0.35), 0, 1), s))
    v2 = np.where(cloth | dark, np.clip(mx + light, 0, 1), mx)
    i = np.floor(h2 * 6) % 6
    f = h2 * 6 - np.floor(h2 * 6)
    p, q, t = v2 * (1 - s2), v2 * (1 - f * s2), v2 * (1 - (1 - f) * s2)
    out = np.stack([
        np.choose(i.astype(int), [v2, q, p, p, t, v2]),
        np.choose(i.astype(int), [t, v2, v2, q, p, p]),
        np.choose(i.astype(int), [p, p, t, v2, v2, q]),
    ], -1)
    res = np.concatenate([out, al[..., None]], -1)
    return Image.fromarray((np.clip(res, 0, 1) * 255 + 0.5).astype(np.uint8), 'RGBA')


# hue shift, saturation, value for the 7-8 colourways of each of the first ten identities (sheets 26-100)
WAYS = [(0.33, 1.0, 0.0), (0.58, 0.9, -0.02), (0.82, 0.95, 0.0), (0.12, 0.8, 0.03), (0.45, 0.85, -0.04),
        (0.7, 1.05, -0.03), (0.92, 0.75, 0.02), (0.25, 0.7, -0.05)]


def main():
    REVIEW.mkdir(parents=True, exist_ok=True)
    records, sheets = [], {}
    for i, spec in enumerate(SPECS, 1):
        names, frames = build(spec)
        sid = f'townsfolk_{i:03d}'
        atlas = Image.new('RGBA', (FRAME_W * len(frames), FRAME_H), (0, 0, 0, 0))
        for j, f in enumerate(frames): atlas.alpha_composite(f, (j * FRAME_W, 0))
        atlas.save(OUT / f'{sid}.png', optimize=True)
        sheets[i] = atlas
        records.append({'id': sid, 'name': spec[1], 'source': f'generated_sources/{spec[0]}.png', 'size': spec[2],
                        'isKnight': spec[5], 'frameCount': len(frames), 'frames': names})
        print(sid, spec[1], len(frames), 'frames')
    for k in range(26, 101):
        base = (k - 1) % 10 + 1
        shift, sat, light = WAYS[((k - 26) // 10) % len(WAYS)]
        recolour(sheets[base], shift, sat, light).save(OUT / f'townsfolk_{k:03d}.png', optimize=True)
        b = records[base - 1]
        records.append({**b, 'id': f'townsfolk_{k:03d}', 'name': b['name'] + ' (colourway)', 'colourwayOf': b['id']})
    manifest = {'name': 'Velscour Townsfolk Animation Pack', 'version': 4, 'frameSize': [FRAME_W, FRAME_H],
                'baseline': BASE_Y, 'standardFrames': STD, 'identities': len(SPECS), 'characters': records}
    (OUT / 'manifest.json').write_text(json.dumps(manifest, indent=1), encoding='utf-8')
    old = OUT / 'townsfolk_animation_pack.zip'
    if old.exists(): old.unlink()
    # review sheet: every pose of the 25 identities, on a mid-grey with the baseline marked
    font = ImageFont.load_default()
    tw, th = FRAME_W // 2, FRAME_H // 2
    rv = Image.new('RGB', (tw * 13 + 120, th * 25), (58, 58, 66))
    d = ImageDraw.Draw(rv)
    for i in range(25):
        a = sheets[i + 1]
        for j in range(a.width // FRAME_W):
            f = a.crop((j * FRAME_W, 0, (j + 1) * FRAME_W, FRAME_H)).resize((tw, th), Image.Resampling.LANCZOS)
            rv.paste(f, (120 + j * tw, i * th), f)
        d.line((120, i * th + BASE_Y // 2, rv.width, i * th + BASE_Y // 2), fill=(90, 90, 100))
        d.text((4, i * th + 40), records[i]['name'], fill=(240, 236, 220), font=font)
    rv.save(REVIEW / 'townsfolk-cuts.jpg', quality=90)
    print('wrote', len(records), 'sheets; review:', REVIEW / 'townsfolk-cuts.jpg')


if __name__ == '__main__':
    main()
