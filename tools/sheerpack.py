"""Cliff textures for the SHEER DROP dungeons (src/data/sheer.js, docs/SHEER_DROPS.md).

    python tools/sheerpack.py                 # assets/source/sheer/*  ->  assets/tiles/sheer/<tex>.webp
    python tools/sheerpack.py --import <bm>   # first copy the sources in from a checkout of the bm repo (origin/main)

Each variant's cliff face is one seamless rock texture from the bm repo (see SOURCES), kept at 512 px in
assets/source/sheer/ and recoloured here to its biome (TINT), then written at 256 px (the game draws a period over
128 world px, so it stays sharp at 2x). Resizing a whole seamless tile keeps it seamless.
Needs: pip install pillow numpy
"""
import os
import subprocess
import sys

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'assets', 'source', 'sheer')
OUT = os.path.join(ROOT, 'assets', 'tiles', 'sheer')

# tex name -> path of the source in the bm repo (origin/main)
SOURCES = {
    'ossuary': 'assets/game/phobos/tex/ossuary_wall_c.webp',
    'drowned': 'assets/game/phobos/tex/undercroft_c.webp',
    'canyon': 'assets/desert/Desert_Architecture_20_Textures/02_red_canyon_wall.png',
    'gilded': 'assets/desert/Desert_Architecture_20_Textures/05_layered_ochre_wall.png',
    'rime': 'assets/desert/Desert_Architecture_20_Textures/03_pale_limestone_wall.png',
    'shard': 'assets/game/phobos/tex/granite_c.webp',
    'cloister': 'assets/game/phobos/tex/bone_stone_c.webp',
    'storm': 'assets/phobos/textures/ph2_04_01_curtain_granite.png',
    'cinder': 'assets/phobos/textures/ph2_04_08_basalt_columns.png',
    'starless': 'assets/desert/Desert_Architecture_20_Textures/04_dark_desert_rock_wall.png',
}

# tex name -> recolour: colorize (hue degrees, strength 0..1), light (-1..1), contrast, sat
TINT = {
    'ossuary': {'colorize': (34, 0.22), 'light': -0.06, 'contrast': 1.08},
    'drowned': {'colorize': (172, 0.42), 'light': 0.02, 'contrast': 1.1},
    'canyon': {'light': 0.0, 'contrast': 1.06, 'sat': 1.05},
    'gilded': {'colorize': (40, 0.55), 'light': -0.14, 'contrast': 1.2},
    'rime': {'colorize': (204, 0.3), 'light': 0.04, 'contrast': 1.12},
    'shard': {'colorize': (190, 0.5), 'light': 0.04, 'contrast': 1.25},
    'cloister': {'colorize': (42, 0.18), 'light': 0.1, 'contrast': 1.0},
    'storm': {'colorize': (218, 0.22), 'light': 0.02, 'contrast': 1.12},
    'cinder': {'colorize': (14, 0.32), 'light': 0.06, 'contrast': 1.15},
    'starless': {'colorize': (272, 0.4), 'light': -0.08, 'contrast': 1.15},
}


def import_from_bm(bm):
    os.makedirs(SRC, exist_ok=True)
    for name, path in SOURCES.items():
        raw = subprocess.run(['git', '-C', bm, 'show', 'origin/main:' + path], capture_output=True, check=True).stdout
        tmp = os.path.join(SRC, '_tmp' + os.path.splitext(path)[1])
        with open(tmp, 'wb') as f:
            f.write(raw)
        im = Image.open(tmp).convert('RGB').resize((512, 512), Image.LANCZOS)
        im.save(os.path.join(SRC, name + '.webp'), 'WEBP', quality=94, method=6)
        os.remove(tmp)
        print('imported', name, '<-', path)


def hsl_colorize(rgb, hue, k):
    """Blend toward a single hue, keeping each pixel's lightness (like an image editor's Colorize)."""
    lum = (rgb @ np.array([0.299, 0.587, 0.114]))[..., None]
    h = hue / 60.0
    c = np.array([max(0, min(1, abs(h - 3) - 1)), max(0, min(1, 2 - abs(h - 2))), max(0, min(1, 2 - abs(h - 4)))])
    tint = lum * (0.55 + 0.9 * c[None, None, :])
    return rgb * (1 - k) + np.clip(tint, 0, 1) * k


def recolor(im, t):
    a = np.asarray(im, dtype=np.float32) / 255.0
    if 'colorize' in t:
        a = hsl_colorize(a, *t['colorize'])
    if 'sat' in t:
        g = (a @ np.array([0.299, 0.587, 0.114]))[..., None]
        a = g + (a - g) * t['sat']
    if 'contrast' in t:
        a = (a - 0.5) * t['contrast'] + 0.5
    if 'light' in t:
        a = a + t['light']
    return Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8))


def build():
    os.makedirs(OUT, exist_ok=True)
    for name in SOURCES:
        src = os.path.join(SRC, name + '.webp')
        im = recolor(Image.open(src).convert('RGB'), TINT.get(name, {})).resize((256, 256), Image.LANCZOS)
        out = os.path.join(OUT, name + '.webp')
        im.save(out, 'WEBP', quality=88, method=6)
        print('wrote', os.path.relpath(out, ROOT), os.path.getsize(out) // 1024, 'KB')


if __name__ == '__main__':
    if len(sys.argv) > 2 and sys.argv[1] == '--import':
        import_from_bm(sys.argv[2])
    build()
