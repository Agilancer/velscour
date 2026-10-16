#!/usr/bin/env python3
"""Pack the Sea of Sand reference frames into browser atlases.

Usage: python tools/seaofsandpack.py <Sea_of_Sand_Biome_Pack directory>
The input is the authored Velscour Overworld Biome Set; output is the runtime
asset folder and metadata used by the game. Pillow is required.
"""
import json
import sys
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets' / 'tiles' / 'sea_of_sand'
PACK = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else None
if not PACK or not (PACK / 'manifest.json').is_file():
    raise SystemExit('Pass the Sea_of_Sand_Biome_Pack directory as the first argument.')
manifest = json.loads((PACK / 'manifest.json').read_text(encoding='utf-8'))
OUT.mkdir(parents=True, exist_ok=True)

def atlas(category, width=2048, gap=2):
    frames = [a for a in manifest['assets'] if a['category'] == category]
    if not frames:
        return []
    placed, x, y, row_h = [], gap, gap, 0
    for entry in frames:
        src = Image.open(PACK / entry['file']).convert('RGBA')
        left = top = 0
        pivot = entry.get('pivot_px', [src.width // 2, src.height])
        if category != 'floor':
            bounds = src.getchannel('A').getbbox()
            if bounds:
                left, top, right, bottom = bounds
                src = src.crop(bounds)
            # Cropped world props need one stable ground anchor. Source-sheet
            # pivots referenced the uncropped cells and varied between sheets.
            pivot = [src.width / 2, src.height]
        w, h = src.size
        if x + w + gap > width:
            x, y, row_h = gap, y + row_h + gap, 0
        # Store the pivot with its frame instead of reusing the previous frame's.
        placed.append((entry, src, x, y, pivot))
        x += w + gap
        row_h = max(row_h, h)
    height = y + row_h + gap
    sheet = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    records = []
    for entry, src, px, py, pivot in placed:
        sheet.alpha_composite(src, (px, py))
        record = {k: entry[k] for k in ('id', 'name', 'category') if k in entry}
        record.update(x=px, y=py, w=src.width, h=src.height, pivot=pivot)
        for key in ('material', 'connection_mask', 'height_px', 'topology', 'orientation', 'state'):
            if key in entry:
                record[key] = entry[key]
        records.append(record)
    # Crop to occupied rows; webp remains lossless and keeps crisp pixel art.
    sheet.crop((0, 0, width, height)).save(OUT / f'{category}.webp', 'WEBP', lossless=True, method=6)
    return records

meta = {'version': 1, 'biome': 'sea_of_sand', 'atlases': {}}
for cat in ('floor', 'scatter', 'tree', 'monster', 'boss', 'cliff'):
    meta['atlases'][cat] = atlas(cat, 2560 if cat == 'cliff' else 2048)
(OUT / 'pack.json').write_text(json.dumps(meta, separators=(',', ':')), encoding='utf-8')
print('Sea of Sand atlases:', ', '.join(f'{k}={len(v)}' for k, v in meta['atlases'].items()))
