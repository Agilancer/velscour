#!/usr/bin/env python3
"""Build lossless runtime atlases from the complete CASTLE biome pack.

Usage: python tools/castlepack.py path/to/CASTLE_Biome_Pack
"""
import json, sys
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
PACK=Path(sys.argv[1]).resolve() if len(sys.argv)>1 else None
OUT=ROOT/'assets'/'tiles'/'castle'
if not PACK or not (PACK/'manifest.json').is_file():
    raise SystemExit('Pass the CASTLE_Biome_Pack directory as the first argument.')
m=json.loads((PACK/'manifest.json').read_text(encoding='utf-8'))
OUT.mkdir(parents=True,exist_ok=True)

def pack_category(category,entries,width=2048,gap=2):
    packed=[]; x=y=row_h=gap
    for a in entries:
        src=Image.open(PACK/a['file']).convert('RGBA')
        pivot=list(a.get('pivot_px',[src.width//2,src.height]))
        if category not in ('floors','transitions'):
            bounds=src.getchannel('A').getbbox()
            if bounds:
                left,top,right,bottom=bounds
                src=src.crop(bounds); pivot=[pivot[0]-left,pivot[1]-top]
        w,h=src.size
        if x+w+gap>width:
            x=gap; y+=row_h+gap; row_h=0
        packed.append((a,src,x,y,pivot))
        x+=w+gap; row_h=max(row_h,h)
    height=y+row_h+gap
    sheet=Image.new('RGBA',(width,height),(0,0,0,0)); records=[]
    for a,src,px,py,pivot in packed:
        sheet.alpha_composite(src,(px,py))
        r={k:a[k] for k in ('id','name','category') if k in a}
        r.update(x=px,y=py,w=src.width,h=src.height,pivot=pivot)
        for k in ('material','connection_mask','height_px','topology','orientation','state','mask'):
            if k in a:r[k]=a[k]
        records.append(r)
    sheet.crop((0,0,width,height)).save(OUT/f'{category}.webp','WEBP',lossless=True,method=6)
    return records

cats={}
for a in m['assets']: cats.setdefault(a['category'],[]).append(a)
meta={'version':1,'biome':'castle','source_pack_version':m.get('version'),'grid':m.get('grid'),'atlases':{}}
for cat,entries in cats.items():
    meta['atlases'][cat]=pack_category(cat,entries,2560 if cat in ('walls','roofs','signs','wall_hangings','scatter','castle_landmarks') else 2048)
(OUT/'pack.json').write_text(json.dumps(meta,separators=(',',':')),encoding='utf-8')
print('CASTLE atlases:',', '.join(f'{k}={len(v)}' for k,v in meta['atlases'].items()))
