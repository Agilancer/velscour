"""Pack labeled companion studies into compact, label-free runtime atlases."""
from pathlib import Path
from PIL import Image
import json

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
    'creatures_land': ([280,460,655,851,1075,1318,1558,1806,2042,2299], [(81,225),(255,420),(470,615),(640,785)]),
    'companions_winged': ([370,610,835,1070,1285,1525,1756], [(150,370),(380,605),(610,830),(835,1080)]),
    'companions_dragons': ([300,550,800,1030,1270,1515,1756], [(85,285),(315,520),(560,790),(810,1040)]),
    'skeletal_warriors': ([350,520,700,870,1035,1210,1400,1600,1800,1994], [(125,315),(345,535),(555,755),(755,950)]),
    'skeletal_ranged': ([330,499,663,827,984,1143,1295,1443,1598,1839], [(140,325),(350,540),(555,770),(770,985)]),
    'skeletal_support': ([280,407,560,718,890,1045,1202,1360,1510,1756], [(140,305),(350,575),(590,800),(835,1075)]),
    'lancer_knights_i': ([355,520,700,870,1045,1220,1410,1600,1815,2101], [(105,290),(295,495),(500,695),(695,900)]),
    'lancer_knights_ii': ([355,495,670,850,1040,1224,1409,1598,1850,2101], [(70,260),(265,460),(465,660),(665,900)]),
    'elemental_golems': ([360,548,709,892,1086,1275,1467,1662,1859,2101], [(105,270),(290,470),(480,670),(680,890)]),
    'humanoid_warriors': ([280,423,634,826,1027,1232,1437,1653,1858,2101], [(75,265),(300,490),(520,680),(710,875)]),
    'class_allies': ([200,451,686,922,1167,1427,1672,1914,2137,2392], [(68,205),(230,375),(410,560),(590,785)]),
    'skeletal_guards': ([440,615,790,965,1140,1315,1490,1665,1840,2101], [(125,300),(305,490),(495,710),(735,900)]),
    'skeletal_champions': ([350,507,666,807,963,1121,1279,1431,1601,1840], [(115,340),(365,550),(560,760),(780,1010)]),
    'misc_humanoids': ([300,440,628,817,1003,1196,1374,1542,1755,1994], [(75,260),(280,500),(520,725),(765,940)]),
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
                # Ignore isolated semitransparent edge noise from the source
                # export when finding a pose's true visible bounds.
                mask = slot.getchannel('A').point(lambda value: 255 if value > 24 else 0)
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
        atlas.save(OUT / f'{name}.webp', 'WEBP', quality=88, method=2)
        print(f'{name}: {len(keys)} rows, {frames} frames, {atlas.width}x{atlas.height}')

    (OUT / 'catalog.json').write_text(json.dumps(catalog, separators=(',', ':')) + '\n', encoding='utf-8')

if __name__ == '__main__':
    main()
