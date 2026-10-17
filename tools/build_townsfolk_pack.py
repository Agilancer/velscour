"""Normalize original generated Velscour civilian sheets to runtime frame cells."""
from pathlib import Path
import io, json, zipfile
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets/sprites/townsfolk'
SOURCES = OUT / 'generated_sources'
REVIEW = ROOT / 'art-review'
OUT.mkdir(parents=True, exist_ok=True)
REVIEW.mkdir(parents=True, exist_ok=True)
FRAME_W, FRAME_H = 128, 192
BASE_ORDER = ['idle_1','idle_2','idle_3','walk_1','walk_2','dying_1','dead','scared_scream','scared_point','happy','celebrate']
GRID_4 = [(i % 4, i // 4) for i in range(11)]
GRID_4X3_11_RAGGED = [(i % 4, i // 4, 4) for i in range(8)] + [(i, 2, 5) for i in range(3)]
GRID_5 = [(i % 5, i // 5) for i in range(10)] + [(0, 2)]
KING_BOXES = [(36,0,252,362),(371,0,551,362),(618,0,819,362),(893,0,1125,362),(1170,0,1426,362),
    (24,362,359,724),(380,362,807,724),(835,362,1081,724),(1142,362,1426,724),
    (46,724,333,1086),(456,724,739,1086)]

# Each source is one genuinely different generated identity, not a palette duplicate.
SOURCES_25 = [
    ('baker','Village Baker',5,3,GRID_5,False,False),
    ('charcoal_burner','Charcoal Burner',4,3,GRID_4,False,False),
    ('boy','Village Boy',4,3,GRID_4,True,False),
    ('girl','Village Girl',4,3,GRID_4,True,False),
    ('merchant','Traveling Merchant',4,3,GRID_4,False,False),
    ('healer','Village Healer',5,3,GRID_5,False,False),
    ('watchman','Town Watchman',4,3,GRID_4,False,False),
    ('noblewoman','Noblewoman',4,3,GRID_4,False,False),
    ('smith','Blacksmith',4,3,GRID_4,False,False),
    ('king','King',0,0,KING_BOXES,False,False),
    ('ferryman','Ferryman',4,3,GRID_4,False,False),
    ('tavern_keeper','Tavern Keeper',4,3,GRID_4,False,False),
    ('midwife','Midwife',4,3,GRID_4,False,False),
    ('carpenter','Carpenter',4,3,GRID_4,False,False),
    ('herbalist','Herbalist',4,3,GRID_4,False,False),
    ('shepherd','Shepherd',4,3,GRID_4,True,False),
    ('miller','Miller',4,3,GRID_4,False,False),
    ('seamstress','Seamstress',4,3,GRID_4,False,False),
    ('knight_aldric','Knight Aldric',4,3,GRID_4X3_11_RAGGED,False,True),
    ('knight_maeve','Knight Maeve',4,3,GRID_4X3_11_RAGGED,False,True),
    ('knight_bastian','Knight Bastian',4,3,GRID_4X3_11_RAGGED,False,True),
    ('knight_rosette','Knight Rosette',4,3,GRID_4X3_11_RAGGED,False,True),
    ('royal_steward','Royal Steward',4,3,GRID_4X3_11_RAGGED,False,False),
    ('court_lady','Lady of the Court',4,3,GRID_4X3_11_RAGGED,False,False),
    ('royal_scribe','Royal Scribe',4,3,GRID_4X3_11_RAGGED,False,False),
]

def fit_art(cell, child=False, attack=False):
    alpha = cell.getchannel('A')
    a = np.asarray(alpha).copy()
    a[a < 10] = 0
    cell.putalpha(Image.fromarray(a))
    bbox = cell.getchannel('A').getbbox()
    frame = Image.new('RGBA', (FRAME_W, FRAME_H), (0,0,0,0))
    if not bbox:
        return frame
    if attack:
        left,top,right,bottom=bbox;target_w=max(1,round((bottom-top)*128/170))
        if right-left>target_w:
            center=(left+right)//2;left=max(left,center-target_w//2);right=min(right,left+target_w)
            left=max(bbox[0],right-target_w)
            bbox=(left,top,right,bottom)
    cell = cell.crop(bbox)
    max_h = 130 if child else 170
    max_w = 128 if attack else 116
    scale = min(max_w / cell.width, max_h / cell.height)
    cell = cell.resize((max(1,round(cell.width*scale)), max(1,round(cell.height*scale))), Image.Resampling.LANCZOS)
    frame.alpha_composite(cell, ((FRAME_W-cell.width)//2, 184-cell.height))
    return frame

def cell_at(sheet, col, row, columns, rows, child=False):
    w,h = sheet.size
    box = (round(col*w/columns), round(row*h/rows), round((col+1)*w/columns), round((row+1)*h/rows))
    return fit_art(sheet.crop(box).convert('RGBA'), child)

records = []
for i,(source,label,cols,rows,cell_map,child,knight) in enumerate(SOURCES_25,1):
    path = SOURCES / f'{source}.png'
    if not path.exists():
        raise FileNotFoundError(path)
    sheet = Image.open(path).convert('RGBA')
    if source == 'king':
        frames = [fit_art(sheet.crop(box), child) for box in cell_map]
    else:
        frames = [cell_at(sheet,col,row,cell_cols,rows,child) for cell in cell_map for col,row,cell_cols in [cell if len(cell)==3 else (*cell,cols)]]
    if knight:
        attacks = Image.open(SOURCES/f'{source}_attacks.png').convert('RGBA')
        aw,ah=attacks.size
        frames.extend([fit_art(attacks.crop((0,0,aw//2,ah)),attack=True),fit_art(attacks.crop((aw//2,0,aw,ah)),attack=True)])
        frame_order = BASE_ORDER + ['attack_1','attack_2']
        attack_frames = 2
    else:
        frame_order = BASE_ORDER
        attack_frames = 0
        frames = frames[:11]
    sprite_id = f'townsfolk_{i:03d}'
    atlas = Image.new('RGBA',(FRAME_W*len(frames),FRAME_H),(0,0,0,0))
    for j,frame in enumerate(frames):
        atlas.alpha_composite(frame,(j*FRAME_W,0))
    atlas.save(OUT/f'{sprite_id}.png', optimize=True)
    records.append({'id':sprite_id,'name':label,'source':f'generated_sources/{source}.png','attackSource':f'generated_sources/{source}_attacks.png' if knight else None,
      'frameSize':[FRAME_W,FRAME_H],'frameCount':len(frames),'frameOrder':frame_order,
      'transparent':True,'helmet':False,'generatedUniqueIdentity':True,'isKnight':knight,
      'attackFrameCount':attack_frames,'paletteVariants':'runtime'})

manifest={'name':'Velscour Townsfolk Original Identity Animation Pack','version':3,
  'sourceStyle':'Velscour rendered character art; gritty Diablo II mood',
  'generatedIdentityCount':len(records),'runtimePaletteVariants':True,
  'frameSize':[FRAME_W,FRAME_H],'order':BASE_ORDER,'characters':records}
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
readme='''# Velscour Original Townsfolk Animation Pack

This pack contains 25 distinct, newly generated civilian identities in the existing Velscour rendered-sprite style. The ten original source identities are retained; fifteen new generated designs add workers, children, four individually designed knights, and royal court members. The design is unique in face, silhouette, clothing and source art. Palette variants are applied by the game engine.

Every non-knight sheet is a transparent RGBA PNG, 1408×192 pixels: eleven 128×192 frames in this order: idle 1–3, walk 1–2, dying, lying dead, scared scream, scared point, happy, celebration. Every knight sheet is 1664×192 and appends two unique sword attack frames after the same eleven standard frames. Poses retain each identity's face, clothes and proportions. The complete PNG sheets and their source artwork are included in the ZIP; `manifest.json` defines every frame contract.
'''
(OUT/'README.md').write_text(readme,encoding='utf-8')
with zipfile.ZipFile(OUT/'townsfolk_animation_pack.zip','w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
    for p in [OUT/'README.md',OUT/'manifest.json',*sorted(OUT.glob('townsfolk_*.png')),*sorted(SOURCES.glob('*.png'))]:
        z.write(p,p.relative_to(OUT))

# One idle-frame contact sheet supports a quick visual review of all 25 identities.
cols=5; rows=(len(records)+cols-1)//cols
preview=Image.new('RGBA',(cols*160,rows*218),(30,31,34,255)); draw=ImageDraw.Draw(preview); font=ImageFont.load_default()
for i,record in enumerate(records):
    im=Image.open(OUT/f"{record['id']}.png").convert('RGBA').crop((0,0,FRAME_W,FRAME_H))
    im.thumbnail((144,180),Image.Resampling.LANCZOS)
    x=(i%cols)*160;y=(i//cols)*218
    preview.alpha_composite(im,(x+(160-im.width)//2,y+2))
    draw.text((x+4,y+185),f"{i+1:02d} {record['name']}",fill=(244,238,224,255),font=font)
preview.convert('RGB').save(REVIEW/'townsfolk-25-unique-designs.jpg',quality=94)
knights=[r for r in records if r['isKnight']]
attack=Image.new('RGBA',(len(knights)*2*180,244),(30,31,34,255)); ad=ImageDraw.Draw(attack)
for i,record in enumerate(knights):
    src=Image.open(OUT/f"{record['id']}.png").convert('RGBA')
    for j,frame_no in enumerate((11,12)):
        frame=src.crop((frame_no*FRAME_W,0,(frame_no+1)*FRAME_W,FRAME_H));frame.thumbnail((164,190),Image.Resampling.LANCZOS)
        x=(i*2+j)*180;attack.alpha_composite(frame,(x+(180-frame.width)//2,4))
        ad.text((x+4,200),f"{record['name']} attack {j+1}",fill=(244,238,224,255),font=font)
attack.convert('RGB').save(REVIEW/'townsfolk-knight-attacks.jpg',quality=94)
print(f"Built {len(records)} distinct identities (15 new); {sum(r['isKnight'] for r in records)} knight sheets have 13 frames.")
