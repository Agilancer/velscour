"""Pack labeled companion studies into compact, label-free runtime atlases."""
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

# Hand-measured per-sheet frame boundaries. These source sheets are not square
# grids: their gutters and pose widths vary, and labels occupy different parts
# of each sheet. Every tuple is one source row's visible-art range (captions
# omitted); each x list has one cut for every frame plus its two outer edges.
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

# A few source generators placed animation labels directly against a frame
# edge. Trim only those label bands before measuring the pose; the remaining
# pixels are then rescaled from the actual character bounds.
CROP_STRIPS = {
    'companions_winged': (20, 0),
    'companions_dragons': (0, 16),
    'skeletal_support': (18, 0),
    'lancer_knights_ii': (32, 0),
    'humanoid_warriors': (28, 0),
    # This sheet's labels sit below each character; its top edge is clean.
    'class_allies': (0, 22),
    'skeletal_champions': (30, 10),
    'misc_humanoids': (12, 30),
}

# The source sheet's Bone Standard-Bearer attack starts before the nominal
# frame boundary and intrudes into the last run pose. Trim that specific edge
# rather than sacrificing space for every row on the sheet.
FRAME_EDGE_TRIMS = {
    ('skeletal_guards', 2, 6): (0, 70),
}

# The Holy Guardian row is taller than the other rows and its caption plaques
# sit lower in each crop. Trim a little more from that row to remove the plaques.
ROW_CROP_STRIPS = {
    ('class_allies', 1): (30, 22),
    ('class_allies', 2): (30, 22),
    ('class_allies', 3): (30, 30),
}

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    catalog = {}
    for name, (filename, frames, keys) in SHEETS.items():
        src = Image.open(SOURCE / filename).convert('RGBA')
        x_edges, y_ranges = LAYOUT[name]
        if len(x_edges) != frames + 1 or len(y_ranges) != len(keys):
            raise ValueError(f'{name}: expected {frames} x slots and {len(keys)} y ranges')
        crops = []
        max_ratio = 0
        for row, key in enumerate(keys):
            for frame in range(frames):
                left = max(0, x_edges[frame])
                right = min(src.width, x_edges[frame + 1])
                top, bottom = y_ranges[row]
                slot = src.crop((left, top, right, bottom))
                alpha = slot.getchannel('A')
                # Remove faint export/compositing residue before measuring a
                # pose. The old code used this threshold only for the bounds,
                # then retained the low-alpha pixels and lossy WebP halos.
                rgba = np.array(slot)
                rgba[rgba[:, :, 3] <= 24, 3] = 0
                top_strip, bottom_strip = CROP_STRIPS.get(name, (0, 0))
                row_top, row_bottom = ROW_CROP_STRIPS.get((name, row), (0, 0))
                top_strip = max(top_strip, row_top)
                bottom_strip = max(bottom_strip, row_bottom)
                if top_strip:
                    rgba[:top_strip, :, 3] = 0
                if bottom_strip:
                    rgba[-bottom_strip:, :, 3] = 0
                # Neighboring poses sometimes extend a few pixels past their
                # measured frame boundary. Clear the seam on the left of each
                # frame and the right seam where the next pose is not an
                # intentional attack/flight effect.
                seam = min(14, max(2, rgba.shape[1] // 16))
                rgba[:, :seam, 3] = 0
                if frame < frames - 2:
                    rgba[:, -seam:, 3] = 0
                trim_left, trim_right = FRAME_EDGE_TRIMS.get((name, row, frame), (0, 0))
                if trim_left:
                    rgba[:, :trim_left, 3] = 0
                if trim_right:
                    rgba[:, -trim_right:, 3] = 0
                # Frame names are printed just below several creatures. Their
                # clipped black strokes sit in the final few source pixels.
                bottom = rgba.shape[0]
                edge_pixels = rgba[bottom - 8:bottom, :, :3]
                dark_caption = np.max(edge_pixels, axis=2) < 72
                alpha_strip = rgba[bottom - 8:bottom, :, 3]
                alpha_strip[dark_caption] = 0
                slot = Image.fromarray(rgba, 'RGBA')
                mask = slot.getchannel('A').point(lambda value: 255 if value else 0)

                # The source sheets place frame captions right against the
                # crop edges. Drop small disconnected marks touching an edge;
                # real pose parts and attack effects remain connected to the
                # pose or are large enough to stand on their own.
                pixels = np.asarray(mask) > 0
                h, w = pixels.shape
                seen = np.zeros((h, w), dtype=bool)
                clean = np.array(slot)
                components = []
                for sy, sx in zip(*np.where(pixels & ~seen)):
                    if seen[sy, sx]:
                        continue
                    stack = [(int(sy), int(sx))]
                    seen[sy, sx] = True
                    component = []
                    min_x = max_x = int(sx)
                    min_y = max_y = int(sy)
                    while stack:
                        cy, cx = stack.pop()
                        component.append((cy, cx))
                        min_x, max_x = min(min_x, cx), max(max_x, cx)
                        min_y, max_y = min(min_y, cy), max(max_y, cy)
                        for ny in range(max(0, cy - 1), min(h, cy + 2)):
                            for nx in range(max(0, cx - 1), min(w, cx + 2)):
                                if pixels[ny, nx] and not seen[ny, nx]:
                                    seen[ny, nx] = True
                                    stack.append((ny, nx))
                    area = len(component)
                    box_w = max_x - min_x + 1
                    box_h = max_y - min_y + 1
                    edge = min_x <= 24 or min_y <= 12 or max_x >= w - 25 or max_y >= h - 13
                    text_band = min_y <= 42 or max_y >= h - 42
                    rgb = clean[tuple(zip(*component))][:, :3].astype(np.int16)
                    color_range = rgb.max(axis=1) - rgb.min(axis=1)
                    bright_text = np.mean((color_range < 46) & (rgb.max(axis=1) > 145)) > 0.22
                    gold_text = np.mean((rgb[:, 0] > 145) & (rgb[:, 1] > 105) & (rgb[:, 2] < 120)) > 0.28
                    glyph = area <= 900 and box_w <= 30 and box_h <= 42 and box_h >= 6
                    word = (area <= 6500 and box_w <= 190 and box_h <= 44 and
                            box_w >= max(30, box_h * 1.35) and (bright_text or gold_text))
                    # Source labels can be printed within a frame, not only at
                    # its bottom. Strip disconnected font glyphs and words
                    # before measuring the creature's scale.
                    text_mark = glyph or (word and (text_band or bright_text or gold_text))
                    components.append((component, area, min_x, min_y, max_x, max_y, edge, text_mark))

                # Retain the pose and its meaningful attached effects. Small
                # disconnected pieces at a crop seam are neighboring frames,
                # captions, or export noise and should not become extra sprites.
                core = max((item[1] for item in components if not item[7]), default=0)
                core_item = max((item for item in components if not item[7]), key=lambda item: item[1], default=None)
                for component, area, min_x, min_y, max_x, max_y, edge, text_mark in components:
                    if core_item is None:
                        discard = True
                    else:
                        cminx, cminy, cmaxx, cmaxy = core_item[2:6]
                        gap_x = max(cminx - max_x - 1, min_x - cmaxx - 1, 0)
                        gap_y = max(cminy - max_y - 1, min_y - cmaxy - 1, 0)
                        gap = max(gap_x, gap_y)
                        tiny = area < max(500, core * 0.085)
                        edge_fragment = edge and component is not core_item[0] and area < core * 0.5 and gap > 10
                        discard = text_mark or tiny or edge_fragment
                    if discard:
                        yy, xx = zip(*component)
                        clean[yy, xx, 3] = 0
                slot = Image.fromarray(clean, 'RGBA')

                # Recompute after caption/edge cleanup so discarded source
                # marks cannot expand the crop around the creature.
                mask = slot.getchannel('A').point(lambda value: 255 if value else 0)
                box = mask.getbbox()
                if box:
                    pad = 4
                    box = (max(0, box[0] - pad), max(0, box[1] - pad),
                           min(slot.width, box[2] + pad), min(slot.height, box[3] + pad))
                    pose = slot.crop(box)
                else:
                    pose = Image.new('RGBA', (1, 1), (0, 0, 0, 0))
                max_ratio = max(max_ratio, pose.width / max(1, pose.height))
                crops.append((key, frame, pose))

        out_h = 128
        out_w = max(48, round(max_ratio * out_h) + 8)
        atlas = Image.new('RGBA', (out_w * frames, out_h * len(keys)), (0, 0, 0, 0))
        for row, key in enumerate(keys):
            for crop_key, frame, pose in (item for item in crops if item[0] == key):
                scale = min(out_h / max(1, pose.height), (out_w - 8) / max(1, pose.width))
                size = (max(1, round(pose.width * scale)), max(1, round(pose.height * scale)))
                sprite = pose.resize(size, Image.Resampling.LANCZOS)
                x = frame * out_w + (out_w - sprite.width) // 2
                y = row * out_h + out_h - sprite.height
                atlas.alpha_composite(sprite, (x, y))
            catalog[key] = {'sheet': name, 'row': row, 'frames': frames,
                            'cellW': out_w, 'cellH': out_h,
                            'kind': 'winged' if frames == 6 else 'land'}
        # Lossy WebP creates colored blocks around transparent magic glows.
        # Keep the existing runtime format, but encode it losslessly.
        atlas.save(OUT / f'{name}.webp', 'WEBP', lossless=True, quality=100, method=6)
        print(f'{name}: {len(keys)} rows, {frames} frames, {atlas.width}x{atlas.height}')

    (OUT / 'catalog.json').write_text(json.dumps(catalog, separators=(',', ':')) + '\n', encoding='utf-8')

if __name__ == '__main__':
    main()
