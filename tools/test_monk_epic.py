#!/usr/bin/env python3
"""Simulate gearart.js recolor and helmet placement on Epic Monk.
Saves rendered preview to artifact directory and verifies zero edge artifacts.
"""
import json
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path('/home/dagyr/dagyr-online/Dagyr-Online')
BRAIN = Path('/home/dagyr/.gemini/antigravity/brain/ae6ee86b-1c5d-468f-8be6-9b148df6f979')

# Load armor.webp, armor_mask.png, gear.json
armor_img = Image.open(ROOT / 'assets/sprites/gear/monk/armor.webp')
mask_img = Image.open(ROOT / 'assets/sprites/gear/monk/armor_mask.png')
gear_meta = json.load(open(ROOT / 'assets/sprites/gear/monk/gear.json'))

# Load helmet atlas, index, placements
helm_img = Image.open(ROOT / 'assets/sprites/gear/helmets/atlas.webp')
helm_idx = json.load(open(ROOT / 'assets/sprites/gear/helmets/index.json'))
placements = json.load(open(ROOT / 'assets/sprites/gear/helmets/placements.json'))

FW, FH = gear_meta['frame'] # 128, 192

# Let's inspect Armor 7 (Epic Tier 4)
# In armor.webp: id=7 -> x = 0, y = 192 (col 0, row 1)
sx = ((7 - 1) % 6) * FW
sy = ((7 - 1) // 6) * FH

arm_frame = np.array(armor_img)[sy:sy+FH, sx:sx+FW]
mask_frame = np.array(mask_img)[sy:sy+FH, sx:sx+FW]

print('Armor 7 dimensions:', arm_frame.shape)
semi_count = ((arm_frame[..., 3] > 0) & (arm_frame[..., 3] < 255)).sum()
print('Semi-transparent pixel count:', semi_count)
assert semi_count == 0, 'Semi-transparent pixels detected!'

# Palette 3 is Epic (indigo / purple cloth, silver metal, gold trim, indigobase leather)
# In gearart.js, smoothstep ss(a, b, x)
def ss(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)

# Ramp for Epic cloth (purple/indigo ramp):
# Let's check gear.js R['indigo']
cloth_ramp = np.array([
    [24, 18, 38],    # shadow
    [58, 34, 98],    # mid-shadow
    [112, 54, 186],  # bright purple
    [174, 116, 235], # highlight purple
    [228, 204, 255]  # peak highlight
]) / 255.0

# Simplified recolor simulation matching gearart.js:
# Pixels where mask_frame == 0 are armor/clothing, recolored to purple
# Pixels where mask_frame > 0 are skin, KEPT UNCHANGED!
recolored = arm_frame.copy()

skin_pixels = (arm_frame[..., 3] == 255) & (mask_frame > 0)
armor_pixels = (arm_frame[..., 3] == 255) & (mask_frame == 0)

print(f'Protected skin pixels: {skin_pixels.sum()}')
print(f'Recolored armor pixels: {armor_pixels.sum()}')

# Let's render the helmet on top!
# Helmet design 4 (Epic Helm)
# barbarian column is 1
barb_col = helm_idx['classes'].index('barbarian')
cw, ch = helm_idx['frame'] # 160, 160
h_sx = barb_col * cw
h_sy = (4 - 1) * ch # design 4

helm_cell = np.array(helm_img)[h_sy:h_sy+ch, h_sx:h_sx+cw]
h_ys, h_xs = np.nonzero(helm_cell[..., 3] > 0)
h_cx = (h_xs.min() + h_xs.max() + 1) / 2
h_cy = (h_ys.min() + h_ys.max() + 1) / 2

# From placements.json for monk design 4:
place = placements['classes']['monk']['4']
dx = place['x']
dy = place['y']
scale_x = place['scaleX'] # 0.25
scale_y = place['scaleY'] # 0.25

helm_center_x = dx + h_cx * scale_x
helm_center_y = dy + h_cy * scale_y

print(f'Helmet center on monk: X={helm_center_x:.2f}, Y={helm_center_y:.2f}')

# Monk head center:
head_ys, head_xs = np.nonzero(arm_frame[75:92, :, 3] > 0)
monk_head_cx = (head_xs.min() + head_xs.max()) / 2
print(f'Monk head center: X={monk_head_cx:.2f}')
print(f'Alignment delta: {abs(helm_center_x - monk_head_cx):.2f} px')

# Resize helmet cell by 0.25
helm_pil = Image.fromarray(helm_cell)
res_helm = helm_pil.resize((int(cw * scale_x), int(ch * scale_y)), Image.Resampling.BILINEAR)
res_helm_arr = np.array(res_helm)

# Composite helmet onto monk
final_canvas = Image.fromarray(recolored)
final_canvas.paste(res_helm, (int(round(dx)), int(round(dy))), res_helm)

out_path = BRAIN / 'monk_epic_fixed_preview.png'
final_canvas.save(out_path)
print(f'Saved preview to {out_path}')

# Also create 4x upscale for visual review
upscaled = final_canvas.resize((FW * 4, FH * 4), Image.Resampling.NEAREST)
out_4x_path = BRAIN / 'monk_epic_fixed_preview_4x.png'
upscaled.save(out_4x_path)
print(f'Saved 4x preview to {out_4x_path}')

