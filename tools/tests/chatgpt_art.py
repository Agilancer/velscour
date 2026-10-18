"""
ChatGPT art kits round trip (no browser): each kit's example sheet, drawn without labels or guides, stands in for
ChatGPT's reply and goes through tools/chatgpt_art.py --dry. Checks every cell is found and writes the previews to
tools/tests/out/chatgpt_art/<kind>/preview.png (look at them).

    python tools/tests/chatgpt_art.py [enemies,bosses,pets,npcs,armor,nocturne]
"""
import json, os, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, os.path.join(ROOT, 'tools'))
import chatgpt_art_kits as K

K.CLEAN = True
OUT = os.path.join(HERE, 'out', 'chatgpt_art')
kinds = sys.argv[1].split(',') if len(sys.argv) > 1 else ['enemies', 'bosses', 'pets', 'npcs', 'armor', 'nocturne']
NAMES = {
    'enemies': lambda: {'set': 'set3', 'family': 'test', 'monsters': [{'name': 'Test %d' % i, 'arch': 'skeleton', 'h': 54, 'el': ''} for i in range(10)]},
    'bosses': lambda: {'set': 'set3', 'family': 'testboss', 'monsters': [{'name': 'Boss %d' % i, 'arch': 'golem', 'h': 120, 'el': ''} for i in range(6)]},
    'pets_land': lambda: {'sheet': 'testland', 'kind': 'land', 'pets': [{'name': n, 'h': 34} for n in ('Test Wolf', 'Test Bear', 'Test Skel', 'Test Golem')]},
    'pets_winged': lambda: {'sheet': 'testwing', 'kind': 'winged', 'pets': [{'name': n, 'h': 30} for n in ('Test Hawk', 'Test Raven', 'Test Phoenix', 'Test Whelp')]},
    'npcs': lambda: {'knights': False, 'npcs': [{'name': n, 'role': 'test', 'child': n == 'Boy'} for n in ('Baker', 'Healer', 'Boy', 'King')]},
    'armor': lambda: {'class': 'paladin', 'armors': [{'name': 'Test %d' % i, 'rarity': r} for i, r in enumerate(['uncommon', 'rare', 'epic', 'legendary', 'mythic'])]},
}
fails = 0
for kind in kinds:
    if kind == 'nocturne':
        continue
    files = K.build(kind)
    for path, img in files.items():
        if not path.startswith('examples/'):
            continue
        sub = os.path.basename(path)[:-len('_example.png')]
        if sub == 'knights':
            continue  # half the knights example is empty template rows
        if kind == 'armor' and sub != 'paladin_armor':
            continue  # one class is enough: the sheets share one layout
        key = 'armor' if kind == 'armor' else sub if sub in NAMES else kind
        work = os.path.join(OUT, sub)
        os.makedirs(work, exist_ok=True)
        sheet = os.path.join(work, 'sheet.png'); names = os.path.join(work, 'names.json')
        img.save(sheet)
        json.dump(NAMES[key](), open(names, 'w'))
        r = subprocess.run([sys.executable, os.path.join(ROOT, 'tools', 'chatgpt_art.py'), 'pets' if key.startswith('pets') else key,
                            sheet, names, '--dry', '--work', work], capture_output=True, text=True)
        ok = r.returncode == 0 and os.path.exists(os.path.join(work, 'preview.png'))
        fails += not ok
        print('%-4s %-14s %s' % ('ok' if ok else 'FAIL', sub, (r.stdout + r.stderr).strip().splitlines()[-1]))

# Grim Nocturne (pixel-locked): a known 128 x 192 frame painted into each template at its scale, guides left in,
# must come back pixel for pixel.
if 'nocturne' in kinds:
    import numpy as np
    from PIL import Image
    import chatgpt_art as A
    import chatgpt_style_kit as SK
    f = SK.rescale_hero(K.class_frames('paladin')[1][0])
    a = np.array(f); a[..., 3] = np.where(a[..., 3] > 100, 255, 0)
    q = Image.fromarray(np.ascontiguousarray(a[..., :3])).quantize(40, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    a[..., :3] = np.asarray(q.convert('RGB')); a[a[..., 3] == 0] = 0
    frame = Image.fromarray(a)

    def same(got, want, zone=None):
        zx, zy, zw, zh = zone or (0, 0, 128, 192)
        g, w = np.asarray(got)[zy:zy + zh, zx:zx + zw], np.asarray(want)[zy:zy + zh, zx:zx + zw]
        return float(np.mean(np.all(g == w, axis=2)))

    def paint(sheet, img, box, k):
        sheet.alpha_composite(img.resize((img.width * k, img.height * k), Image.NEAREST), box[:2])

    checks = []
    s = SK.pose_master_template('paladin'); paint(s, frame, A.POSE_CELL, A.POSE_S); sa = np.array(s)
    checks.append(('posemaster', same(A.unblock(sa, A.POSE_CELL, A.POSE_S, A.locked_mask(sa)), frame)))
    s = SK.armor_template('paladin')
    for box in A.ARMOR_FRAMES:
        paint(s, frame, box, A.ARMOR_S)
    sa = np.array(s); m = A.locked_mask(sa)
    checks.append(('armor', min(same(A.unblock(sa, box, A.ARMOR_S, m), frame) for box in A.ARMOR_FRAMES)))
    s = SK.overlay_template('paladin')
    for slot in A.ZONES:
        for i in range(5):
            for box, (zx, zy, zw, zh) in A.overlay_cells(slot, i):
                paint(s, frame.crop((zx, zy, zx + zw, zy + zh)), box, A.OVL_S)
    sa = np.array(s); m = A.locked_mask(sa)
    worst = 1.0
    for slot in A.ZONES:
        for i in range(5):
            for box, zone in A.overlay_cells(slot, i):
                part = np.zeros((192, 128, 4), np.uint8)
                part[zone[1]:zone[1] + zone[3], zone[0]:zone[0] + zone[2]] = A.unblock(sa, box, A.OVL_S, m)
                worst = min(worst, same(part, frame, zone))
    checks.append(('overlays', worst))
    for name, v in checks:
        ok = v >= 0.995
        fails += not ok
        print('%-4s nocturne %-10s %.2f%% of art pixels back exactly' % ('ok' if ok else 'FAIL', name, 100 * v))
print('chatgpt art kits:', 'OK' if not fails else '%d FAILED' % fails)
sys.exit(1 if fails else 0)
