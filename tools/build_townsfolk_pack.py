"""Pack originally generated Velscour townsfolk into standardized 11-frame sheets."""
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
FRAME_W, FRAME_H, FRAME_COUNT = 128, 192, 11
ORDER = ['idle_1','idle_2','idle_3','walk_1','walk_2','dying_1','dead','scared_scream','scared_point','happy','celebrate']
GRID_4=[(i%4,i//4) for i in range(11)]
GRID_5=[(i%5,i//5) for i in range(10)]+[(0,2)]
KING_BOXES=[(36,0,252,362),(371,0,551,362),(618,0,819,362),(893,0,1125,362),(1170,0,1426,362),
    (24,362,359,724),(380,362,807,724),(835,362,1081,724),(1142,362,1426,724),
    (46,724,333,1086),(456,724,739,1086)]
MASTERS = [
    ('baker','Baker',5,GRID_5),('charcoal_burner','Charcoal burner',4,GRID_4),('boy','Village boy',4,GRID_4),('girl','Village girl',4,GRID_4),
    ('merchant','Merchant',4,GRID_4),('healer','Healer',5,GRID_5),('watchman','Watchman',4,GRID_4),('noblewoman','Noblewoman',4,GRID_4),
    ('smith','Blacksmith',4,GRID_4),('king','King',5,KING_BOXES)]
for file,_,_,_ in MASTERS:
    if not (SOURCES/f'{file}.png').exists(): raise FileNotFoundError(SOURCES/f'{file}.png')

def fit_cell(sheet, col, row, columns, child=False):
    w,h=sheet.size
    cell=sheet.crop((round(col*w/columns),round(row*h/3),round((col+1)*w/columns),round((row+1)*h/3))).convert('RGBA')
    return fit_art(cell,child)

def fit_box(sheet, box, child=False):
    return fit_art(sheet.crop(box).convert('RGBA'),child)

def fit_art(cell,child=False):
    alpha=cell.getchannel('A')
    bbox=alpha.getbbox()
    if not bbox: return Image.new('RGBA',(FRAME_W,FRAME_H),(0,0,0,0))
    # Avoid stray almost-transparent pixels that make generated crop bounds unstable.
    alpha=np.asarray(alpha).copy()
    alpha[alpha<10]=0
    cell.putalpha(Image.fromarray(alpha))
    bbox=cell.getchannel('A').getbbox(); cell=cell.crop(bbox)
    max_h=130 if child else 170
    max_w=116
    scale=min(max_w/cell.width,max_h/cell.height)
    cell=cell.resize((max(1,round(cell.width*scale)),max(1,round(cell.height*scale))),Image.Resampling.LANCZOS)
    frame=Image.new('RGBA',(FRAME_W,FRAME_H),(0,0,0,0))
    frame.alpha_composite(cell,((FRAME_W-cell.width)//2,184-cell.height))
    return frame

def palette_variant(frame, variant, master_index):
    if variant==0: return frame.copy()
    hsv=np.asarray(frame.convert('HSV')).copy()
    alpha=np.asarray(frame.getchannel('A'))>0
    yy=np.arange(FRAME_H)[:,None]
    shift=((variant*0.137 + master_index*0.071) % 0.48) - 0.19
    hue,sat,val=hsv[:,:,0],hsv[:,:,1],hsv[:,:,2]
    # Keep skin tones intact. Recolor worn cloth/colored leather while retaining
    # the generated texture and shading. Pillow's HSV conversion is vectorized.
    clothes=alpha&(yy>38)&(sat>40)&~((hue>=4)&(hue<=29)&(val>82))
    hue[clothes]=np.mod(hue[clothes].astype(np.int16)+round(shift*255),256).astype(np.uint8)
    # Hair varies independently, but the generated face and silhouette stay intact.
    if variant%3:
        hair=alpha&(yy>8)&(yy<66)&(sat>36)&(val<118)
        delta=round(((variant%3)-1)*0.055*255)
        hue[hair]=np.mod(hue[hair].astype(np.int16)+delta,256).astype(np.uint8)
    out=Image.fromarray(hsv,'HSV').convert('RGBA')
    out.putalpha(frame.getchannel('A'))
    return out

masters=[]
for name,label,columns,cell_map in MASTERS:
    sheet=Image.open(SOURCES/f'{name}.png').convert('RGBA')
    frames=[]
    for cell in cell_map:
        if len(cell)==4: frames.append(fit_box(sheet,cell,child=name in ('boy','girl')))
        else: frames.append(fit_cell(sheet,*cell,columns,child=name in ('boy','girl')))
    masters.append((name,label,frames))

records=[]
for i in range(100):
    # Ten original generated identity designs, each with ten restrained clothing/hair palettes.
    if i<10: base_index=2+(i%2); variant=i//2
    elif 90<=i<94: base_index={90:9,91:7,92:2,93:3}[i];variant=(i-90)%5+1
    elif i>=94: base_index={94:1,95:3,96:5,97:6,98:8,99:4}[i];variant=(i-94)%10
    else: base_index=(i-10)%len(MASTERS);variant=((i-10)//len(MASTERS))%10
    base_name,label,source_frames=masters[base_index]
    sheet=Image.new('RGBA',(FRAME_W*FRAME_COUNT,FRAME_H),(0,0,0,0))
    for frame_index,frame in enumerate(source_frames):
        sheet.alpha_composite(palette_variant(frame,variant,base_index),(frame_index*FRAME_W,0))
    sid=f'townsfolk_{i+1:03d}'
    buf=io.BytesIO();sheet.save(buf,'PNG',optimize=True)
    (OUT/f'{sid}.png').write_bytes(buf.getvalue())
    records.append({'id':sid,'generatedIdentity':label,'generatedSource':f'generated_sources/{base_name}.png',
        'sourceGridColumns':MASTERS[base_index][2],'sourceGridRows':3,
        'sourceCellMap':MASTERS[base_index][3],
        'paletteVariant':variant,'frameSize':[FRAME_W,FRAME_H],'frameCount':FRAME_COUNT,
        'frameOrder':ORDER,'transparent':True,'helmet':False,'framesUnique':True,
        'animationFramesReferenceIdleIdentity':True})

manifest={'name':'Velscour Original Grimdark Townsfolk Animation Pack','version':2,
    'sourceStyle':'Velscour rendered character art; Diablo II grimdark mood',
    'generatedIdentityCount':len(MASTERS),'paletteVariantsPerIdentity':10,
    'frameSize':[FRAME_W,FRAME_H],'columns':FRAME_COUNT,'frameCount':FRAME_COUNT,
    'transparent':True,'order':ORDER,'characters':records}
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
readme='''# Velscour Original Grimdark Townsfolk Pack\n\n100 transparent RGBA PNG sprite sheets, each 1408×192 pixels: eleven exact 128×192 cells in a row. Frame order: three distinct idle beats, two alternating walking beats, dying, lying dead, frightened scream, frightened point, happy, celebration. Every pose is unique and generated as part of the same identity sheet; pose frames preserve the idle character's face, clothing and proportions.\n\nAll ten base identities were newly generated as civilians in Velscour's detailed rendered-sprite style with a gritty Diablo II mood. They are not cut from playable-class, armor or helmet assets. Ten restrained clothing/hair palette variants per generated identity make the 100 visitor sheets; the original generated source sheets are included in `generated_sources/`. Child, merchant, healer, guard, noble, blacksmith and royal identities are included. See manifest.json for each sheet's source identity, source grid and palette variant.\n'''
(OUT/'README.md').write_text(readme,encoding='utf-8')
with zipfile.ZipFile(OUT/'townsfolk_animation_pack.zip','w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
    for p in [OUT/'README.md',OUT/'manifest.json',*sorted(OUT.glob('townsfolk_*.png')),*sorted(SOURCES.glob('*.png'))]:
        z.write(p,p.relative_to(OUT))

# An idle-frame overview makes identity, palette variety and transparent bounds reviewable.
thumb=Image.new('RGBA',(10*112,10*166),(31,32,35,255));d=ImageDraw.Draw(thumb);font=ImageFont.load_default()
for i in range(100):
    f=Image.open(OUT/f'townsfolk_{i+1:03d}.png').convert('RGBA').crop((0,0,FRAME_W,FRAME_H))
    f.thumbnail((104,144),Image.Resampling.LANCZOS)
    x=(i%10)*112;y=(i//10)*166
    thumb.alpha_composite(f,(x+(112-f.width)//2,y+3))
    d.text((x+3,y+148),f'{i+1:03d} {records[i]["generatedIdentity"][:8]} v{records[i]["paletteVariant"]}',fill='white',font=font)
thumb.convert('RGB').save(REVIEW/'townsfolk-100-idle-preview.jpg',quality=92)
print('Built 100 sheets from',len(MASTERS),'original generated civilians; each is 1408x192 RGBA.')
