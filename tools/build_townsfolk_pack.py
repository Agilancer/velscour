"""Build consistent 11-cell visitor sheets from the game's existing hero art."""
from pathlib import Path
import json, zipfile, io
from PIL import Image
import colorsys, numpy as np

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'assets/sprites/townsfolk'
OUT.mkdir(parents=True,exist_ok=True)
CLASSES=['paladin','ranger','wizard','necromancer','barbarian','dragoon','totem_master','death_knight','arcane_sorcerer','carrion_witch','bard','slime_lord','boomerang_knight','lancer','dragon_knight','gunner']
helm_atlas=Image.open(ROOT/'assets/sprites/gear/common_helmets/atlas.png').convert('RGBA')
helm_fits=json.loads((ROOT/'assets/sprites/gear/common_helmets/placements.json').read_text(encoding='utf-8'))['classes']
order=['idle_1','idle_2','idle_3','walk_1','walk_2','dying_1','dead','scared_scream','scared_point','happy','celebrate']
records=[]
for i in range(100):
    cls=CLASSES[(i*7+i//11)%len(CLASSES)];ci=ROOT/'assets/sprites/gear'/cls/'armor.webp'
    src=Image.open(ci).convert('RGBA');idx=(i*13+(i//16)*7)%80;col=idx%10;row=idx//10
    base=src.crop((col*128,row*192,(col+1)*128,(row+1)*192))
    helmet=(i%5==0 or 90<=i<94)
    if helmet:
        design=(i%10)+1;hc=CLASSES.index(cls);helm=helm_atlas.crop((hc*192,(design-1)*224,(hc+1)*192,design*224))
        fit=helm_fits[cls][str(design)];helm=helm.resize((round(192*fit['scaleX']),round(224*fit['scaleY'])),Image.Resampling.LANCZOS)
        base.alpha_composite(helm,(round(fit['x']),round(fit['y'])))
    mask=Image.open(ROOT/'assets/sprites/gear'/cls/'armor_mask.png').convert('L').crop((col*128,row*192,(col+1)*128,(row+1)*192))
    # Preserve the authored face, skin and hair via the class gear protect mask;
    # hue-shift clothes/accessories and separately vary colored hair strands.
    px=np.asarray(base).copy();protect=np.asarray(mask)>128
    coat_hues=[.02,.07,.11,.14,.30,.43,.56,.62,.72,.83,.91]
    hair_hues=[.045,.075,.10,.015,.58,.83]
    for y in range(192):
        for x in range(128):
            r,g,b,a=px[y,x]
            if a<40:continue
            h,s,v=colorsys.rgb_to_hsv(r/255,g/255,b/255)
            is_hair=22<=y<=73 and 30<=x<=100 and s>.2 and v<.64 and protect[y,x]
            if (not protect[y,x] and s>.15) or is_hair:
                h=hair_hues[(i*5)%len(hair_hues)] if is_hair else coat_hues[(i*7)%len(coat_hues)]
                nr,ng,nb=colorsys.hsv_to_rgb(h,s,v);px[y,x,:3]=[int(nr*255),int(ng*255),int(nb*255)]
    base=Image.fromarray(px,'RGBA')
    if base.getbbox() is None: raise RuntimeError(f'empty source cell: {cls} #{idx}')

    frames=Image.new('RGBA',(128*11,192),(0,0,0,0))
    # Every pose stays inside an exact 128x192 frame. Small body/foot shifts
    # produce breathing and footfall beats; the dead pose lies horizontally.
    for frame in range(11):
        pose=base.copy()
        if frame in (1,2): pose=Image.new('RGBA',(128,192),(0,0,0,0));pose.alpha_composite(base,(0,-1 if frame==1 else 1))
        elif frame in (3,4):
            upper=base.crop((0,0,128,126));lower=base.crop((0,126,128,192));pose=Image.new('RGBA',(128,192),(0,0,0,0));pose.alpha_composite(upper,(0,0));pose.alpha_composite(lower,(-3 if frame==3 else 3,126))
        elif frame==5: pose=base.rotate(28,resample=Image.Resampling.NEAREST,expand=False,center=(64,160))
        elif frame==6:
            fallen=base.rotate(90,resample=Image.Resampling.NEAREST,expand=True)
            fallen.thumbnail((120,176),Image.Resampling.NEAREST);pose=Image.new('RGBA',(128,192),(0,0,0,0));pose.alpha_composite(fallen,((128-fallen.width)//2,12+(176-fallen.height)//2))
        elif frame==8: pose=base.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
        elif frame==9: pose=base.rotate(-3,resample=Image.Resampling.NEAREST,expand=False,center=(64,160))
        elif frame==10: pose=base.rotate(7,resample=Image.Resampling.NEAREST,expand=False,center=(64,160))
        frames.alpha_composite(pose,(frame*128,0))
    name=f'townsfolk_{i+1:03d}'
    buf=io.BytesIO();frames.save(buf,format='PNG',optimize=True)
    records.append({'id':name,'classArt':cls,'sourceArmorFrame':idx,
      'frameSize':[128,192],'frameCount':11,'frameOrder':order,'transparent':True,
      'helmet':helmet,'helmetDesign':(i%10)+1 if helmet else None,'paletteSwap':{'clothesHue':coat_hues[(i*7)%len(coat_hues)],'hairHue':hair_hues[(i*5)%len(hair_hues)]}})
    (OUT/f'{name}.png').write_bytes(buf.getvalue())
manifest={'name':'Velscour Townsfolk Animation Pack','version':1,'frameSize':[128,192],'columns':11,'frameCount':11,'transparent':True,'order':order,'characters':records}
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
readme='''# Velscour Townsfolk Animation Pack\n\n100 transparent PNG sprite sheets, each with eleven fixed 128×192 cells in one horizontal row. The order is idle 1–3, walk 1–2, dying, lying dead, scared/screaming, scared/pointing, happy, celebration. See manifest.json for class art source, atlas coordinates, helmet selection, and the clothing/hair palette recipes baked into each sheet. Helmets and crowns use the game’s fitted shared helmet atlas.\n\nThe sheets are derived from the project’s existing 16-class equipment art to preserve Velscour’s character rendering style and body bounds. Breathing and footfall variants preserve the silhouette; the dying sequence ends in a horizontal lying pose. Emotion frames retain the source face expression.\n'''
(OUT/'README.md').write_text(readme,encoding='utf-8')
with zipfile.ZipFile(OUT/'townsfolk_animation_pack.zip','w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as z:
    for p in [OUT/'README.md',OUT/'manifest.json',*sorted(OUT.glob('townsfolk_*.png'))]:z.write(p,p.name)
