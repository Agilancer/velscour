"""Cut the HUD's Velscour skull (assets/ui/velscour_contact_skull.png) into the skulls that skills and particles draw.

  python tools/build_skulls.py   ->  assets/fx/skulls/skull.webp (bone, ember eyes) and skull_frost.webp
                                     (the Death Knight's palette: rime-white bone, gunmetal shadows, rune-cyan eyes)
"""
from pathlib import Path
from PIL import Image
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / 'assets/ui/velscour_contact_skull.png'
OUT = ROOT / 'assets/fx/skulls'
SIZE = 48   # skulls are drawn 6-30 px on screen; 48 keeps them crisp at 2x


def ramp(lum, stops):
    pos = np.array([p for p, _ in stops]); col = np.array([c for _, c in stops], float)
    return np.stack([np.interp(lum, pos, col[:, i]) for i in range(3)], axis=-1)


def frost(rgba):
    rgb = rgba[..., :3].astype(float) / 255; r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    hi = rgb.max(-1); sat = (hi - rgb.min(-1)) / np.maximum(hi, 1e-3)
    lum = np.clip(0.3 * r + 0.59 * g + 0.11 * b, 0, 1)
    out = ramp(lum, [(0, (6, 10, 20)), (0.25, (30, 44, 66)), (0.5, (96, 122, 150)), (0.75, (178, 202, 222)), (1, (240, 250, 255))])
    eyes = (r > 0.45) & (r > g * 1.6) & (r > b * 1.6) & (sat > 0.5)   # the red-hot eyes and their glow
    out[eyes] = ramp(lum[eyes], [(0, (26, 90, 200)), (0.3, (64, 192, 255)), (0.6, (150, 232, 255)), (1, (240, 255, 255))])
    res = rgba.copy(); res[..., :3] = np.clip(out, 0, 255).astype(np.uint8)
    return res


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    im = Image.open(SRC).convert('RGBA')
    im = im.crop(im.getbbox())
    k = SIZE / max(im.size)
    im = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.Resampling.LANCZOS)
    im.save(OUT / 'skull.webp', 'WEBP', lossless=True, quality=100, method=6)
    Image.fromarray(frost(np.array(im)), 'RGBA').save(OUT / 'skull_frost.webp', 'WEBP', lossless=True, quality=100, method=6)
    print('skulls:', im.size)


if __name__ == '__main__':
    main()
