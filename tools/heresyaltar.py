"""The Altar of Heresy's sprites (src/gfx/heresyaltar.js, docs/ENDGAME.md) from its Blender model.

    python tools/heresyaltar.py [--blender EXE] [--renders DIR] [--skip-render] [--fast] [--blend FILE]

Runs tools/heresyaltar_blender.py in Blender headless (renders into a temp folder, or DIR), then packs
assets/sprites/npc/heresy_altar.webp + .json: the altar without its heart in three states (sealed, awake, ablaze;
one crop, so they cross-fade in place) and its fire alone blurred to a bloom on black (added on top), then the floating heart's 32-frame loop dim and lit (one crop), and the
points the game lights live (the heart, the horn tips, the candle flames, the skull's eyes), in world px from the
altar's tile centre. --skip-render packs DIR as it is. Needs Blender 4.2+ (Cycles) and Pillow. Also writes DIR/preview.png (every layer).
"""
import argparse, json, math, os, subprocess, sys, tempfile
from PIL import Image, ImageChops, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'assets', 'sprites', 'npc', 'heresy_altar')
BLENDERS = [r'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe', '/Applications/Blender.app/Contents/MacOS/Blender', 'blender']


def find_blender(given):
    if given: return given
    for b in BLENDERS:
        if os.path.isfile(b): return b
    return 'blender'


def bbox(ims):
    """The union of the images' alpha boxes (a pixel counts from alpha 2 up)."""
    x0 = y0 = 1 << 30; x1 = y1 = 0
    for im in ims:
        b = im.getchannel('A').point(lambda a: 255 if a > 1 else 0).getbbox()
        if b: x0, y0, x1, y1 = min(x0, b[0]), min(y0, b[1]), max(x1, b[2]), max(y1, b[3])
    return x0, y0, x1, y1


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--blender'); ap.add_argument('--renders'); ap.add_argument('--blend')
    ap.add_argument('--skip-render', action='store_true'); ap.add_argument('--fast', action='store_true')
    a = ap.parse_args()
    d = a.renders or tempfile.mkdtemp(prefix='heresy_altar_')
    if not a.skip_render:
        cmd = [find_blender(a.blender), '-b', '--factory-startup', '--python', os.path.join(ROOT, 'tools', 'heresyaltar_blender.py'), '--', d]
        if a.fast: cmd.append('--fast')
        if a.blend: cmd += ['--blend', a.blend]
        print(' '.join(cmd)); subprocess.run(cmd, check=True)
    fr = json.load(open(os.path.join(d, 'frame.json')))
    S, n, (ax, ay) = fr['scale'], fr['frames'], fr['anchor']
    states = ['sealed', 'awake', 'ablaze']
    bases = [Image.open(os.path.join(d, f'base_{s}.png')).convert('RGBA') for s in states]
    # the shadow catcher leaves a breath of shadow over all the ground it sees: lift it off, or the crop shows as a box
    r, g, b_, al = bases[0].split(); bases[0] = Image.merge('RGBA', (r, g, b_, al.point(lambda v: max(0, v - 12) * 255 // 243)))
    hearts = {v: [Image.open(os.path.join(d, f'heart_{v}_{i:02d}.png')).convert('RGBA') for i in range(n)] for v in ('dim', 'lit')}
    glow = Image.open(os.path.join(d, 'glow_ablaze.png')).convert('RGBA')
    P = 12   # room for the bloom
    bx0, by0, bx1, by1 = bbox(bases)
    bx0, by0, bx1, by1 = max(0, bx0 - P), max(0, by0 - P), min(bases[0].width, bx1 + P), min(bases[0].height, by1 + P)
    hx0, hy0, hx1, hy1 = bbox(hearts['dim'] + hearts['lit'])
    bw, bh, hw, hh = bx1 - bx0, by1 - by0, hx1 - hx0, hy1 - hy0
    cols = max(1, (4 * bw) // hw)
    rows = math.ceil(2 * n / cols)
    W, H = 4 * bw, bh + rows * hh
    atlas = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    meta = {'S': S, 'base': {'size': [bw, bh], 'anchor': [ax * S - bx0, ay * S - by0]},
            'heart': {'size': [hw, hh], 'anchor': [ax * S - hx0, ay * S - hy0], 'n': n}, 'fx': {k: fr[k] for k in ('heart', 'tips', 'flames', 'eyes')}}
    for i, (s, im) in enumerate(zip(states, bases)):
        atlas.alpha_composite(im.crop((bx0, by0, bx1, by1)), (i * bw, 0)); meta['base'][s] = [i * bw, 0]
    fire = Image.alpha_composite(Image.new('RGBA', glow.size, (0, 0, 0, 255)), glow).convert('RGB').crop((bx0, by0, bx1, by1))
    bloom = fire.filter(ImageFilter.GaussianBlur(7)).point(lambda v: min(255, int(v * 1.7)))
    fire = ImageChops.add(bloom, fire.point(lambda v: int(v * 0.3)))
    # stored as colour over its own brightness, so 'lighter' adds exactly the fire and nothing at all outside it
    px = []
    for r, g, b_ in fire.getdata():
        m = max(r, g, b_)
        px.append((r * 255 // m, g * 255 // m, b_ * 255 // m, m) if m >= 5 else (0, 0, 0, 0))
    glow_im = Image.new('RGBA', fire.size); glow_im.putdata(px)
    atlas.paste(glow_im, (3 * bw, 0)); meta['base']['glow'] = [3 * bw, 0]
    k = 0
    for v in ('dim', 'lit'):
        meta['heart'][v] = []
        for im in hearts[v]:
            x, y = (k % cols) * hw, bh + (k // cols) * hh
            atlas.alpha_composite(im.crop((hx0, hy0, hx1, hy1)), (x, y)); meta['heart'][v].append([x, y]); k += 1
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    atlas.save(OUT + '.webp', 'WEBP', quality=86, alpha_quality=100, method=6)
    json.dump(meta, open(OUT + '.json', 'w'), separators=(',', ':'))
    print(f'{OUT}.webp {W}x{H} {os.path.getsize(OUT + ".webp") // 1024} KB; base {bw}x{bh}, heart {hw}x{hh} x {2 * n}')
    # a preview: each state with its heart, on a dark ground
    pv = Image.new('RGBA', (3 * bw, bh), (46, 40, 34, 255))
    for i, s in enumerate(states):
        pv.alpha_composite(bases[i].crop((bx0, by0, bx1, by1)), (i * bw, 0))
        h = hearts['dim' if s == 'sealed' else 'lit'][0].crop((bx0, by0, bx1, by1))
        pv.alpha_composite(h, (i * bw, 0))
    pv.convert('RGB').save(os.path.join(d, 'preview.png'))
    print('preview', os.path.join(d, 'preview.png'))


if __name__ == '__main__':
    main()
