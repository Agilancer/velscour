"""Render full-size visual contact sheets for the Castle wall and rampart atlases."""
from pathlib import Path
import json
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'art-review'
OUT.mkdir(exist_ok=True)
pack = json.loads((ROOT / 'assets/tiles/castle/pack.json').read_text(encoding='utf8'))
font = ImageFont.load_default()

def card(src, box, width, height):
    # Alternating dark checker field makes true transparent edges easy to judge.
    out = Image.new('RGBA', (width, height), (43, 44, 48, 255))
    d = ImageDraw.Draw(out)
    for y in range(0, height, 12):
        for x in range(0, width, 12):
            if (x // 12 + y // 12) % 2:
                d.rectangle((x, y, x+11, y+11), fill=(55, 56, 60, 255))
    crop = src.crop(box).convert('RGBA')
    crop.thumbnail((width-10, height-31), Image.Resampling.NEAREST)
    out.alpha_composite(crop, ((width-crop.width)//2, 3))
    return out

atlas = Image.open(ROOT / 'assets/tiles/castle/walls.webp').convert('RGBA')
families = {}
for a in pack['atlases']['walls']:
    families.setdefault(a['id'].split('_')[1] + '_' + a['id'].split('_')[2], []).append(a)
for family, items in families.items():
    items.sort(key=lambda a: (a.get('connection_mask') is None, a.get('connection_mask') if a.get('connection_mask') is not None else a['name']))
    sheet = Image.new('RGBA', (4*148, 5*220+44), (26, 27, 30, 255))
    d = ImageDraw.Draw(sheet)
    d.text((8, 8), f'{family}: all 20 wall variants', fill='white', font=font)
    for i, a in enumerate(items):
        x, y = 4+(i%4)*148, 32+(i//4)*220
        tile = card(atlas, (a['x'],a['y'],a['x']+a['w'],a['y']+a['h']), 144, 219)
        sheet.alpha_composite(tile, (x,y))
        label = f"{a['name']}  m{a.get('connection_mask','p')}"
        d.text((x+3,y+199), label[:25], fill=(244,238,224,255), font=font)
    sheet.convert('RGB').save(OUT/f'castle-wall-{family}.png')

stair = Image.open(ROOT/'assets/tiles/castle/castle_stairs.webp').convert('RGBA')
landmark = Image.open(ROOT/'assets/tiles/castle/castle_landmarks.webp').convert('RGBA')
groups = [
    ('Rampart stairs (all 16)', stair, pack['atlases']['castle_stairs']),
    ('Castle structures and walkable wall tops (all 19)', landmark, pack['atlases']['castle_landmarks']),
]
for label, src, items in groups:
    cols=4; rows=(len(items)+cols-1)//cols
    sheet=Image.new('RGBA',(cols*258,rows*270+46),(27,28,31,255));d=ImageDraw.Draw(sheet)
    d.text((8,8),label,fill='white',font=font)
    for i,a in enumerate(items):
        x=4+(i%cols)*258;y=36+(i//cols)*270
        tile=card(src,(a['x'],a['y'],a['x']+a['w'],a['y']+a['h']),252,268)
        sheet.alpha_composite(tile,(x,y))
        d.text((x+4,y+246),a['name'][:38],fill=(244,238,224,255),font=font)
    sheet.convert('RGB').save(OUT/('castle-rampart-stairs.png' if 'stairs' in label else 'castle-walltops-landmarks.png'))
