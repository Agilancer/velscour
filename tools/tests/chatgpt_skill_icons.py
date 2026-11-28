"""
Round trip of the ChatGPT skill icon kit (tools/chatgpt_skill_icons.py, docs/CHATGPT_SKILL_ICONS.md), no browser:
fake "ChatGPT" sheets are built from the game's painted icons (exact template, rescaled and shifted, dark gutters,
a talent sheet with cell 9 empty, the last ultimates sheet with one icon, a file with a random name mapped by
--map), packed into a return zip the way ChatGPT does, and imported with --dry. Every cut icon must match its source.
Needs the kit built first (node tools/chatgpt_skill_icons_export.js; python tools/chatgpt_skill_icons.py kit).
    python tools/tests/chatgpt_skill_icons.py
"""
import io, json, os, shutil, subprocess, sys, zipfile
from PIL import Image, ImageChops, ImageDraw, ImageStat

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
sys.path.insert(0, os.path.join(ROOT, 'tools'))
import chatgpt_skill_icons as K

OUT = os.path.join(ROOT, 'tools', 'tests', 'out', 'skill_icons_roundtrip')
LIST = os.path.join(ROOT, 'tools', 'tests', 'out', 'skill_icons_kit', 'icon_list.json')
fails = []


def check(ok, msg):
    print(('ok   ' if ok else 'FAIL ') + msg)
    if not ok: fails.append(msg)


def painted(k):
    """The k-th painted skill icon of the game (a stand-in for a ChatGPT icon)."""
    cls = ['paladin', 'wizard', 'necromancer', 'monk', 'ranger'][k % 5]
    im = Image.open(os.path.join(ROOT, 'assets', 'ui', 'skills', f'{cls}_skills.png')).convert('RGB')
    i = (k * 7) % 36
    cw, ch = im.width // 9, im.height // 4
    return im.crop(((i % 9) * cw + 1, (i // 9) * ch + 1, (i % 9 + 1) * cw - 1, (i // 9 + 1) * ch - 1))


def sheet(icons, gutter=(255, 0, 255)):
    im = Image.new('RGB', (K.SIZE, K.SIZE), gutter)
    for k, ic in enumerate(icons):
        if ic is None:
            x0, y0, x1, y1 = K.cell_box(k); ImageDraw.Draw(im).rectangle((x0, y0, x1 - 1, y1 - 1), fill=(255, 0, 255)); continue
        x0, y0, _, _ = K.cell_box(k)
        im.paste(ic.resize((K.CELL, K.CELL), Image.LANCZOS), (x0, y0))
    return im


def diff(a, b):
    a, b = a.convert('RGB').resize((48, 48), Image.LANCZOS), b.convert('RGB').resize((48, 48), Image.LANCZOS)
    return sum(ImageStat.Stat(ImageChops.difference(a, b)).mean) / 3


def main():
    if not os.path.exists(LIST): sys.exit('build the kit first: python tools/chatgpt_skill_icons.py kit')
    L = json.load(open(LIST, encoding='utf-8'))
    B = {b['id']: b for b in L['batches']}
    shutil.rmtree(OUT, ignore_errors=True)
    src = os.path.join(OUT, 'sheets'); os.makedirs(src)
    truth, n = {}, 0
    cases = [('barbarian__skills_t0', 'exact', 'barbarian__skills_t0.png'), ('gunner__skills_t3', 'rescaled', 'ChatGPT Image Nov 28, 2026, 10_15_32 AM.png'),
             ('lancer__skills_t1', 'dark gutters', 'lancer__skills_t1 (1).png'), ('rogue__talents_b2', 'talents', 'rogue__talents_b2.png'),
             ('ultimates_3', 'one ultimate', 'ultimates_3.png'), ('ninja__skills_t0', 'jpeg', 'ninja__skills_t0.jpg')]
    for bid, how, fname in cases:
        cells = B[bid]['cells']
        icons = []
        for c in cells:
            if c: icons.append(painted(n)); truth[c] = icons[-1]; n += 1
            else: icons.append(None)
        im = sheet(icons, (14, 10, 12) if how == 'dark gutters' else (255, 0, 255))
        if how == 'rescaled':   # ChatGPT never lands exactly on the template: other size, a little off-centre
            im = Image.new('RGB', (1040, 1060), (255, 0, 255)); im.paste(sheet(icons).resize((1010, 1030), Image.LANCZOS), (18, 10))
        if how == 'jpeg':
            buf = io.BytesIO(); im.save(buf, 'JPEG', quality=85); im = Image.open(buf)
        im.save(os.path.join(src, fname))
    json.dump({'ChatGPT Image Nov 28, 2026, 10_15_32 AM.png': 'gunner__skills_t3'}, open(os.path.join(OUT, 'map.json'), 'w'))
    rz = os.path.join(OUT, K.RETURN_NAME)
    # pack the way ChatGPT runs it: the kit's own copy of the script, from another directory
    kitpy = os.path.join(ROOT, 'tools', 'tests', 'out', 'skill_icons_kit', 'chatgpt_skill_icons.py')
    r = subprocess.run([sys.executable, '-I', kitpy, 'pack', src, '--list', LIST, '--map', os.path.join(OUT, 'map.json'), '--out', rz], capture_output=True, text=True, cwd=OUT)
    print(r.stdout.strip()); check(r.returncode == 0, 'pack ran' + (': ' + r.stderr[-400:] if r.returncode else ''))
    z = zipfile.ZipFile(rz)
    man = json.loads(z.read('manifest.json'))
    check(len(man['sheets']) == len(cases), f'{len(man["sheets"])} sheets in the manifest')
    check(set(man['icons']) == set(truth), f'{len(man["icons"])} icons packed, {len(truth)} painted')
    check('preview.png' in z.namelist(), 'preview.png in the zip')
    check(all(man['sheets'][b]['grid_found'] for b in ('barbarian__skills_t0', 'gunner__skills_t3', 'rogue__talents_b2', 'ninja__skills_t0')), 'magenta grid found on the full magenta sheets')
    check(not man['sheets']['lancer__skills_t1']['grid_found'], 'dark gutters fall back to the template positions')
    worst = {}
    for icon_id, f in man['icons'].items():
        ic = Image.open(io.BytesIO(z.read(f)))
        check(ic.size == (K.ICON_OUT, K.ICON_OUT), f'{icon_id} is {ic.size}') if ic.size != (K.ICON_OUT, K.ICON_OUT) else None
        bid = next(b for b, *_ in cases if icon_id in B[b]['cells'])
        worst[bid] = max(worst.get(bid, 0), diff(ic, truth[icon_id]))
        px = ic.convert('RGB').load()
        mag = sum(K.is_mag(px[x, y]) for x in range(0, K.ICON_OUT, 4) for y in range(0, K.ICON_OUT, 4))
        if mag > 4: check(False, f'{icon_id}: magenta left ({mag} samples)')
    for bid, d in worst.items():
        limit = 12
        check(d < limit, f'{bid}: worst cut icon differs from its source by {d:.1f} (< {limit})')
    # import (dry): the class sheets the game would load
    r = subprocess.run([sys.executable, os.path.join(ROOT, 'tools', 'chatgpt_skill_icons.py'), 'import', rz, '--dry', '--list', LIST], capture_output=True, text=True)
    print(r.stdout.strip()); check(r.returncode == 0, 'import --dry ran' + (': ' + r.stderr[-400:] if r.returncode else ''))
    imp = os.path.join(ROOT, 'tools', 'tests', 'out', 'skill_icons_import')
    for cls, kind, size in (('barbarian', 'skills', (9 * 128, 4 * 128)), ('gunner', 'skills', (9 * 128, 4 * 128)), ('rogue', 'talents', (8 * 128, 3 * 128)), ('ultimates', '', (19 * 128, 128))):
        f = os.path.join(imp, f'{cls}_{kind}.png' if kind else 'ultimates.png')
        ok = os.path.exists(f) and Image.open(f).size == size
        check(ok, f'{os.path.basename(f)} written at {size}')
    by = {i['id']: i for i in L['icons']}
    sk = Image.open(os.path.join(imp, 'barbarian_skills.png'))
    r_, c_ = by['barbarian.0.4']['sheet_cell']
    check(diff(sk.crop((c_ * 128, r_ * 128, c_ * 128 + 128, r_ * 128 + 128)), truth['barbarian.0.4']) < 12, 'barbarian.0.4 sits in its sheet cell (tree row, slot column)')
    keep = sk.crop((0, 128, 128, 256))   # barbarian.1.0 was not painted: the game's own icon fills the cell
    now = Image.open(os.path.join(ROOT, 'tools', 'tests', 'out', 'skill_icons_export', 'now', 'barbarian.1.0.png'))
    check(diff(keep, now) < 6, 'an icon left out keeps what the game draws today')
    check(os.path.exists(os.path.join(imp, 'preview.png')), 'import preview written')
    print('\n' + ('ALL OK' if not fails else f'{len(fails)} FAILED'))
    sys.exit(1 if fails else 0)


main()
