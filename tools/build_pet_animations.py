"""Pack labeled companion studies into compact, label-free runtime atlases."""
from collections import deque
from pathlib import Path
from PIL import Image
import json
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'assets/source/pet_animations'
OUT = ROOT / 'assets/sprites/pets'

# Frame order within each row is idle, three spawn, three run, two attack;
# winged companions use three flap frames followed by three forward-flight frames.
SHEETS = {
    'companions_land': ('animal_companions_land.png', 9, [
        'wolf', 'spiritwolf', 'direwolf', 'stormwolf']),
    'creatures_land': ('land_creature_companions.png', 9, [
        'bear', 'spiritbear', 'ghoul', 'abomination']),
    'companions_winged': ('winged_companions.png', 6, [
        'hawk', 'stormhawk', 'raven', 'phoenix']),
    'companions_dragons': ('dragon_companions.png', 6, [
        'whelp', 'wyvern', 'frostwyrm', 'elderwyrm']),
    'skeletal_warriors': ('skeletal_warriors.png', 9, [
        'skeleton', 'reaver', 'spearman', 'berserker']),
    'skeletal_ranged': ('skeletal_ranged.png', 9, [
        'skelarcher', 'crossbowman', 'skelmage', 'pyromancer']),
    'skeletal_support': ('skeletal_support.png', 9, [
        'plaguecaller', 'stormcaller', 'bishop', 'archlich']),
    'lancer_knights_i': ('lancer_knights_i.png', 9, [
        'kn_squire', 'kn_lance', 'kn_flame', 'kn_frost']),
    'lancer_knights_ii': ('lancer_knights_ii.png', 9, [
        'kn_storm', 'kn_captain', 'kn_chaplain', 'kn_marshal']),
    'elemental_golems': ('elemental_golems.png', 9, [
        'claygolem', 'bloodgolem', 'firegolem', 'icegolem']),
    'humanoid_warriors': ('humanoid_warriors.png', 9, [
        'deathknight', 'hoplite', 'squire', 'captain']),
    'class_allies': ('class_allies.png', 9, [
        'ancient', 'stormancient', 'ancestor', 'guardian']),
    'skeletal_guards': ('skeletal_guards.png', 9, [
        'jailer', 'coffinguard', 'standard', 'gravedigger']),
    'skeletal_champions': ('skeletal_champions.png', 9, [
        'pyreknight', 'druid', 'bellringer', 'reaperking']),
    'misc_humanoids': ('misc_humanoids.png', 9, [
        'clone', 'chorus', 'witch', 'bonecolossus']),
}

# Approximate frame columns and character rows per sheet (the sheets are not even grids). They only locate each
# frame: art is never sliced along these lines. Every connected piece goes whole to the frame whose column holds its
# centre and whose row centre is nearest, so tall poses keep their heads and feet and neighbours never leak in.
LAYOUT = {
    'companions_land': ([280, 435, 550, 670, 800, 930, 1065, 1195, 1325, 1474], [(179,290),(328,463),(498,624),(663,799)]),
    'creatures_land': ([210,460,655,851,1075,1318,1558,1806,2042,2299], [(81,225),(255,420),(470,615),(640,785)]),
    'companions_winged': ([370,610,835,1070,1285,1525,1756], [(160,370),(380,605),(610,830),(835,1080)]),
    'companions_dragons': ([300,550,800,1030,1270,1515,1756], [(85,285),(315,520),(560,790),(810,1040)]),
    'skeletal_warriors': ([350,520,700,870,1035,1210,1400,1600,1800,1994], [(125,315),(345,535),(555,755),(755,950)]),
    'skeletal_ranged': ([330,499,663,827,984,1143,1295,1443,1598,1839], [(140,325),(350,540),(555,770),(770,985)]),
    'skeletal_support': ([280,407,560,718,890,1045,1202,1360,1510,1756], [(140,305),(350,575),(590,800),(835,1075)]),
    'lancer_knights_i': ([355,520,700,870,1045,1220,1410,1600,1815,2101], [(105,290),(295,495),(500,695),(695,900)]),
    'lancer_knights_ii': ([355,495,670,850,1040,1224,1409,1598,1850,2101], [(70,250),(280,460),(480,660),(690,900)]),
    'elemental_golems': ([360,548,709,892,1086,1275,1467,1662,1859,2101], [(105,270),(290,470),(480,670),(680,890)]),
    'humanoid_warriors': ([280,423,634,826,1027,1232,1437,1653,1858,2101], [(75,265),(300,490),(520,680),(710,875)]),
    'class_allies': ([200,451,686,922,1167,1427,1672,1914,2137,2392], [(68,205),(230,400),(410,580),(590,790)]),
    'skeletal_guards': ([440,615,790,965,1140,1315,1490,1665,1840,2101], [(125,300),(305,490),(495,710),(735,900)]),
    'skeletal_champions': ([350,507,666,807,963,1121,1279,1431,1601,1840], [(115,340),(365,550),(560,760),(780,1010)]),
    'misc_humanoids': ([300,440,628,817,1003,1196,1374,1542,1755,1994], [(75,260),(280,500),(520,725),(700,953)]),
}
# Sheets imported from ChatGPT (tools/chatgpt_art.py pets): an even grid, registered in chatgpt_sheets.json.
_extra = SOURCE / 'chatgpt_sheets.json'
if _extra.exists():
    for _name, _e in json.loads(_extra.read_text(encoding='utf-8')).items():
        SHEETS[_name] = (_e['file'], _e['frames'], _e['keys'])
        LAYOUT[_name] = (_e['xs'], [tuple(r) for r in _e['ys']])
# Caption lines ('SPAWN 1') whose lone digits the label filter cannot tell from art: y-bands wiped before cutting.
CAPTIONS = {'creatures_land': [(242, 253), (446, 457), (617, 628), (796, 807)]}
ALPHA = 24   # below this is export residue, not art
CORE = 96    # solid art; fainter glow halos bridge neighbouring frames, so pieces are linked through solid art only


def label(mask):
    H, W = mask.shape; lab = np.zeros((H, W), np.int32); n = 0
    for y0, x0 in zip(*np.nonzero(mask)):
        if lab[y0, x0]: continue
        n += 1; lab[y0, x0] = n; q = deque([(y0, x0)])
        while q:
            y, x = q.popleft()
            for yy in (y - 1, y, y + 1):
                if yy < 0 or yy >= H: continue
                for xx in (x - 1, x, x + 1):
                    if 0 <= xx < W and mask[yy, xx] and not lab[yy, xx]:
                        lab[yy, xx] = n; q.append((yy, xx))
    return lab, n


def strip_plaques(src):
    """Erase caption plaques ('REST', 'SPAWN 1'): near-black, neutral, filled rectangles, often touching the feet."""
    rgb = src[..., :3].astype(np.int16); hi = rgb.max(axis=2)
    dark = (src[..., 3] > 200) & (hi < 58) & (hi - rgb.min(axis=2) < 20)
    lab, n = label(dark)
    yy, xx = np.nonzero(lab); ids = lab[yy, xx]
    cnt = np.bincount(ids, minlength=n + 1)
    x0 = np.full(n + 1, 1 << 30); x1 = np.zeros(n + 1, int); y0 = np.full(n + 1, 1 << 30); y1 = np.zeros(n + 1, int)
    np.minimum.at(x0, ids, xx); np.maximum.at(x1, ids, xx); np.minimum.at(y0, ids, yy); np.maximum.at(y1, ids, yy)
    for i in range(1, n + 1):
        w, h = x1[i] - x0[i] + 1, y1[i] - y0[i] + 1
        if 10 <= h <= 44 and w >= 1.6 * h and cnt[i] >= 0.35 * w * h:
            src[y0[i] - 2:y1[i] + 3, x0[i] - 2:x1[i] + 3, 3] = 0


def is_label(rgb, box_w, box_h, area):
    if area < 400 and box_h <= 24:   # a lone digit or letter
        rgb16 = rgb.astype(np.int16); hi = rgb16.max(axis=1)
        if np.mean((hi - rgb16.min(axis=1) < 46) & (hi > 145)) > 0.3: return True
    """Caption plaques and printed words: short, wide, and either light/gold glyphs or a dark plate."""
    if box_h > 48 or box_w < box_h * 1.5 or area > 9000: return False
    rgb = rgb.astype(np.int16); hi = rgb.max(axis=1); spread = hi - rgb.min(axis=1)
    glyphs = np.mean((spread < 46) & (hi > 145)) > 0.18 or np.mean((rgb[:, 0] > 145) & (rgb[:, 1] > 105) & (rgb[:, 2] < 120)) > 0.25
    plate = np.mean(hi < 70) > 0.45
    return glyphs or plate


def cut_sheet(name):
    filename, frames, keys = SHEETS[name]
    xs, ys = LAYOUT[name]
    src = np.array(Image.open(SOURCE / filename).convert('RGBA'))
    src[src[..., 3] <= ALPHA, 3] = 0
    strip_plaques(src)
    for y0, y1 in CAPTIONS.get(name, []):
        band = src[y0 - 3:y1 + 4]; rgb = band[..., :3].astype(np.int16); hi = rgb.max(axis=2)
        band[(hi - rgb.min(axis=2) < 30) & ((hi > 150) | (hi < 70)), 3] = 0
    solid = src[..., 3] >= CORE
    src[:, :max(0, xs[0] - 8), 3] = 0              # row-name column
    src[:max(0, ys[0][0] - 60), :, 3] = 0          # sheet title and frame header
    solid &= src[..., 3] > 0
    lab, n = label(solid)
    # Where the source art itself overlaps (a lance tip in the next pose's legs), poses fuse into one piece. Split
    # any piece spanning two frame centres by nearest centre; untouched pieces are never cut.
    cols = [(xs[c] + xs[c + 1]) / 2 for c in range(frames)]
    yy, xx = np.nonzero(lab); ids = lab[yy, xx]
    lo = np.full(n + 1, 1 << 30); hi = np.zeros(n + 1, int)
    np.minimum.at(lo, ids, xx); np.maximum.at(hi, ids, xx)
    for i in range(1, n + 1):
        spans = [c for c in range(frames) if lo[i] < cols[c] < hi[i]]
        if len(spans) < 2: continue
        sel = ids == i
        near = np.argmin(np.abs(xx[sel][:, None] - np.array(cols)), axis=1)
        for k in set(near.tolist()) - {near[0]}:
            n += 1; pick = near == k
            lab[yy[sel][pick], xx[sel][pick]] = n
    yy, xx = np.nonzero(lab); ids = lab[yy, xx]
    cnt = np.bincount(ids, minlength=n + 1)
    cy = np.bincount(ids, yy, n + 1) / np.maximum(cnt, 1)
    cx = np.bincount(ids, xx, n + 1) / np.maximum(cnt, 1)
    x0 = np.full(n + 1, 1 << 30); x1 = np.zeros(n + 1, int); y0 = np.full(n + 1, 1 << 30); y1 = np.zeros(n + 1, int)
    np.minimum.at(x0, ids, xx); np.maximum.at(x1, ids, xx); np.minimum.at(y0, ids, yy); np.maximum.at(y1, ids, yy)
    centres = [(a + b) / 2 for a, b in ys]
    reach = [0.75 * (b - a) for a, b in ys]   # some sheets hold extra rows the game does not use
    cells = {}
    for i in range(1, n + 1):
        if cnt[i] < 12 or cx[i] < xs[0] - 30 or cx[i] > xs[-1] + 120: continue
        col = int(np.argmin([abs(cx[i] - c) for c in cols]))
        row = int(np.argmin([abs(cy[i] - c) for c in centres]))
        if abs(cy[i] - centres[row]) > reach[row]: continue
        w, h = x1[i] - x0[i] + 1, y1[i] - y0[i] + 1
        if is_label(src[yy[ids == i], xx[ids == i], :3], w, h, cnt[i]): continue
        cells.setdefault((row, col), []).append(i)
    poses = {}
    for row in range(len(keys)):
        for col in range(frames):
            members = cells.get((row, col), [])
            if not members: raise SystemExit(f'{name}: no art for {keys[row]} frame {col}')
            main = max(members, key=lambda i: cnt[i])
            mx0, mx1, my0, my1 = x0[main] - 28, x1[main] + 28, y0[main] - 28, y1[main] + 28
            # Keep the pose and its effects (sparks, slashes, glows); drop distant specks from neighbours.
            keep = [i for i in members if cnt[i] >= 0.02 * cnt[main] or
                    (mx0 <= cx[i] <= mx1 and my0 <= cy[i] <= my1)]
            m = np.isin(lab, keep); py, px = np.nonzero(m)
            pad = 10
            box = (max(0, px.min() - pad), max(0, py.min() - pad), min(src.shape[1], px.max() + 1 + pad), min(src.shape[0], py.max() + 1 + pad))
            rgba = src[box[1]:box[3], box[0]:box[2]].copy(); own = m[box[1]:box[3], box[0]:box[2]]
            # Faint glow around the pose joins it, but only where it is nearer this frame than any neighbour.
            gy, gx = np.mgrid[box[1]:box[3], box[0]:box[2]]
            near_col = np.argmin(np.abs(gx[..., None] - np.array(cols)), axis=-1) == col
            near_row = np.argmin(np.abs(gy[..., None] - np.array(centres)), axis=-1) == row
            a = rgba[..., 3]
            glow = (a > 0) & (a < CORE) & near_col & near_row
            rgba[~(own | glow), 3] = 0
            vis = np.nonzero(rgba[..., 3])
            rgba = rgba[vis[0].min():vis[0].max() + 1, vis[1].min():vis[1].max() + 1]
            poses[(row, col)] = Image.fromarray(rgba, 'RGBA')
    return poses


def ramp(lum, stops):
    """Map luminance 0..1 onto a list of (pos, (r, g, b)) colour stops."""
    pos = np.array([p for p, _ in stops]); col = np.array([c for _, c in stops], float)
    return np.stack([np.interp(lum, pos, col[:, i]) for i in range(3)], axis=-1)


def frost(rgba):
    """Recolour a ghoul to the Death Knight's palette: corpse-blue skin, gunmetal rags, rune-cyan eyes and mist."""
    rgb = rgba[..., :3].astype(float) / 255; hi = rgb.max(-1); lo = rgb.min(-1); sat = (hi - lo) / np.maximum(hi, 1e-3)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    lum = np.clip(0.3 * r + 0.59 * g + 0.11 * b, 0, 1)
    out = ramp(np.clip(lum * 1.08, 0, 1), [(0, (8, 12, 22)), (0.25, (34, 48, 68)), (0.5, (92, 116, 140)), (0.75, (160, 186, 206)), (1, (228, 240, 250))])
    eyes = (r > 0.5) & (r > g * 1.8) & (r > b * 1.8) & (hi > 0.55)
    rags = (r > g * 1.12) & (r > b * 1.2) & (sat > 0.3) & ~eyes   # the loincloth and blood stripes
    mist = (g > r * 1.18) & (g > b * 1.05) & (sat > 0.18)         # the green spawn mist and claw swipe
    out[rags] = ramp(lum[rags], [(0, (6, 8, 16)), (0.3, (26, 34, 56)), (0.6, (58, 74, 104)), (1, (120, 140, 170))])
    out[mist] = ramp(lum[mist], [(0, (16, 40, 80)), (0.35, (58, 140, 210)), (0.6, (122, 208, 255)), (1, (232, 250, 255))])
    out[eyes] = ramp(lum[eyes], [(0, (64, 192, 255)), (0.5, (150, 230, 255)), (1, (240, 255, 255))])
    res = rgba.copy(); res[..., :3] = np.clip(out, 0, 255).astype(np.uint8)
    return res


# Rows re-coloured into sheets of their own: new key -> (source key, recolour).
DERIVED = {'dkghoul': ('ghoul', frost)}


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    catalog = {}
    for name, (filename, frames, keys) in SHEETS.items():
        poses = cut_sheet(name)
        # One scale per character, so crouched spawn poses and folded wings keep their size relative to the rest
        # pose instead of pulsing to full height. The tallest pose fills the cell; feet stay on the cell floor.
        out_h = 128
        row_scale = {r: out_h / max(poses[(r, c)].height for c in range(frames)) for r in range(len(keys))}
        out_w = max(48, max(round(p.width * row_scale[r]) for (r, c), p in poses.items()) + 8)
        atlas = Image.new('RGBA', (out_w * frames, out_h * len(keys)), (0, 0, 0, 0))
        for row, key in enumerate(keys):
            scale = row_scale[row]
            for frame in range(frames):
                pose = poses[(row, frame)]
                size = (max(1, round(pose.width * scale)), max(1, round(pose.height * scale)))
                sprite = pose.resize(size, Image.Resampling.LANCZOS)
                atlas.alpha_composite(sprite, (frame * out_w + (out_w - sprite.width) // 2, row * out_h + out_h - sprite.height))
            catalog[key] = {'sheet': name, 'row': row, 'frames': frames,
                            'cellW': out_w, 'cellH': out_h, 'restH': round(poses[(row, 0)].height * scale),
                            'kind': 'winged' if frames == 6 else 'land'}
        # Lossless: lossy WebP leaves colored blocks around transparent magic glows.
        atlas.save(OUT / f'{name}.webp', 'WEBP', lossless=True, quality=100, method=6)
        print(f'{name}: {len(keys)} rows, {frames} frames, {atlas.width}x{atlas.height}')
    for key, (src_key, fn) in DERIVED.items():
        meta = catalog[src_key]; sheet = 'dk_' + src_key if key == 'dkghoul' else key
        row = Image.open(OUT / f"{meta['sheet']}.webp").convert('RGBA').crop((0, meta['row'] * meta['cellH'], meta['cellW'] * meta['frames'], (meta['row'] + 1) * meta['cellH']))
        Image.fromarray(fn(np.array(row)), 'RGBA').save(OUT / f'{sheet}.webp', 'WEBP', lossless=True, quality=100, method=6)
        catalog[key] = {**meta, 'sheet': sheet, 'row': 0}
        print(f'{sheet}: {key} from {src_key}')
    (OUT / 'catalog.json').write_text(json.dumps(catalog, separators=(',', ':')) + '\n', encoding='utf-8')


if __name__ == '__main__':
    main()
