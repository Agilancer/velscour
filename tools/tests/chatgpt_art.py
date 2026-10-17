"""
ChatGPT art kits round trip (no browser): each kit's example sheet, drawn without labels or guides, stands in for
ChatGPT's reply and goes through tools/chatgpt_art.py --dry. Checks every cell is found and writes the previews to
tools/tests/out/chatgpt_art/<kind>/preview.png (look at them).

    python tools/tests/chatgpt_art.py [enemies,bosses,pets,npcs,armor]
"""
import json, os, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, os.path.join(ROOT, 'tools'))
import chatgpt_art_kits as K

K.CLEAN = True
OUT = os.path.join(HERE, 'out', 'chatgpt_art')
kinds = sys.argv[1].split(',') if len(sys.argv) > 1 else ['enemies', 'bosses', 'pets', 'npcs', 'armor']
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
print('chatgpt art kits:', 'OK' if not fails else '%d FAILED' % fails)
sys.exit(1 if fails else 0)
