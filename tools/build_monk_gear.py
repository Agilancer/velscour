#!/usr/bin/env python3
"""Build clean Monk gear sprites with strict binary alpha, comprehensive skin masking,
centered helmet placements, and clean artifact-free downsampling (no chromatic ringing).
"""
import json
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path('/home/dagyr/dagyr-online/Dagyr-Online')
BRAIN = Path('/home/dagyr/.gemini/antigravity/brain/ae6ee86b-1c5d-468f-8be6-9b148df6f979')

TIERS = [
    BRAIN / 'monk_sprite_1794073096157.jpg',
    BRAIN / 'monk_tier2_sprite_1794073890461.jpg',
    BRAIN / 'monk_t3_temple_guardian_1794073892002.jpg',
    BRAIN / 'monk_tier4_ascetic_1794073899630.jpg',
    BRAIN / 'monk_tier5_mythic_sprite_1794073907964.jpg'
]

FW, FH = 128, 192
CROWN, SOLE = 75, 183
TARGET_H = SOLE - CROWN # 108

def rgb_to_hsv(rgb_norm):
    r, g, b = rgb_norm[..., 0], rgb_norm[..., 1], rgb_norm[..., 2]
    mx = np.maximum(np.maximum(r, g), b)
    mn = np.minimum(np.minimum(r, g), b)
    d = mx - mn
    nz = d > 0
    h = np.zeros_like(mx)
    h = np.where(nz & (mx == r), ((g - b) / np.maximum(d, 1e-6)) % 6, h)
    h = np.where(nz & (mx == g) & (mx != r), (b - r) / np.maximum(d, 1e-6) + 2, h)
    h = np.where(nz & (mx == b) & (mx != r) & (mx != g), (r - g) / np.maximum(d, 1e-6) + 4, h)
    s = np.where(mx > 0, d / np.maximum(mx, 1e-6), 0)
    return np.stack([h * 60, s, mx], axis=-1)

def process_raw_tier(path, tier_idx):
    img = Image.open(path).convert('RGB')
    arr = np.array(img, dtype=np.float32)
    h, w, _ = arr.shape

    # 1. Background keying
    bg_corners = np.mean([arr[:20, :20], arr[:20, -20:], arr[-20:, :20], arr[-20:, -20:]], axis=(0, 1, 2))
    diff = np.sqrt(np.sum((arr - bg_corners) ** 2, axis=-1))
    dark = (arr[..., 0] < 45) & (arr[..., 1] < 40) & (arr[..., 2] < 38)
    is_bg = (diff < 35) | dark

    outer_bg = np.zeros((h, w), dtype=bool)
    outer_bg[0, :] = is_bg[0, :]
    outer_bg[-1, :] = is_bg[-1, :]
    outer_bg[:, 0] = is_bg[:, 0]
    outer_bg[:, -1] = is_bg[:, -1]
    outer_bg = ndimage.binary_propagation(outer_bg, mask=is_bg)

    underarm_box = np.zeros((h, w), dtype=bool)
    underarm_box[260:640, 330:560] = True
    underarm_dark = is_bg & underarm_box

    feet_box = np.zeros((h, w), dtype=bool)
    feet_box[860:990, 540:660] = True
    feet_dark = is_bg & feet_box

    bg_total = outer_bg | underarm_dark | feet_dark
    alpha = np.where(bg_total, 0, 255).astype(np.uint8)

    # 2. Crop to sprite bounding box
    ys, xs = np.where(alpha > 0)
    y0, y1 = ys.min(), ys.max() + 1
    x0, x1 = xs.min(), xs.max() + 1

    crop_rgb = arr[y0:y1, x0:x1].astype(np.uint8)
    crop_alpha = alpha[y0:y1, x0:x1]

    # 3. Clean Downsampling without Un-premultiplication division blowup
    scale = TARGET_H / (y1 - y0)
    target_w = max(1, int(round((x1 - x0) * scale)))

    # Zero background out in RGB to prevent color bleeding
    rgb_clean = crop_rgb.copy()
    rgb_clean[crop_alpha == 0] = 0

    rgb_pil = Image.fromarray(rgb_clean, mode='RGB')
    alpha_pil = Image.fromarray(crop_alpha, mode='L')

    res_rgb = np.array(rgb_pil.resize((target_w, TARGET_H), Image.Resampling.BILINEAR), dtype=np.float32)
    res_alpha = np.array(alpha_pil.resize((target_w, TARGET_H), Image.Resampling.BILINEAR), dtype=np.float32)

    # Safe alpha normalization: only where alpha is solid enough, otherwise keep raw res_rgb
    alpha_norm = np.maximum(res_alpha[..., None] / 255.0, 0.25)
    recovered_rgb = np.where(res_alpha[..., None] >= 64, res_rgb / alpha_norm, res_rgb)
    recovered_rgb = np.clip(recovered_rgb, 0, 255).astype(np.uint8)

    # Strict binary alpha at threshold 128
    on = res_alpha >= 128
    on = ndimage.binary_opening(on, structure=np.ones((2, 2)))
    on = ndimage.binary_fill_holes(on)

    recovered_rgb[~on] = 0

    # Clean any border ringing pixels: if a border pixel has extreme color saturation, blend with neighbors
    border = on & ~ndimage.binary_erosion(on)
    br, bg, bb = recovered_rgb[..., 0], recovered_rgb[..., 1], recovered_rgb[..., 2]
    bad_edge = border & (((br > 150) & (bg < 50) & (bb < 50)) |
                         ((bg > 150) & (br < 50) & (bb < 50)) |
                         ((bb > 150) & (br < 50) & (bg < 50)))
    if bad_edge.any():
        print(f'Tier {tier_idx+1}: cleaning {bad_edge.sum()} bad edge ringing pixels')
        eroded = ndimage.binary_erosion(on, structure=np.ones((3, 3)))
        for by, bx in zip(*np.where(bad_edge)):
            patch = recovered_rgb[max(0, by-1):min(TARGET_H, by+2), max(0, bx-1):min(target_w, bx+2)]
            mask_patch = eroded[max(0, by-1):min(TARGET_H, by+2), max(0, bx-1):min(target_w, bx+2)]
            if mask_patch.any():
                recovered_rgb[by, bx] = np.mean(patch[mask_patch], axis=0).astype(np.uint8)
            else:
                on[by, bx] = False
                recovered_rgb[by, bx] = 0

    res_arr = np.dstack([recovered_rgb, np.where(on, 255, 0).astype(np.uint8)])

    # 4. Find head horizontal center in resized sprite
    head_slice = res_arr[:22, :, 3] > 100
    rh_ys, rh_xs = np.where(head_slice)
    res_head_cx = (rh_xs.min() + rh_xs.max()) / 2

    # Place crown at y=75, head center at x=62.0
    x_dest = int(round(62.0 - res_head_cx))
    y_dest = CROWN

    frame = np.zeros((FH, FW, 4), dtype=np.uint8)

    src_x0 = max(0, -x_dest)
    src_x1 = min(target_w, FW - x_dest)
    dst_x0 = max(0, x_dest)
    dst_x1 = dst_x0 + (src_x1 - src_x0)

    frame[y_dest:y_dest+TARGET_H, dst_x0:dst_x1] = res_arr[:, src_x0:src_x1]

    # Verify strict binary alpha
    frame_on = frame[..., 3] == 255
    frame[..., 3] = np.where(frame_on, 255, 0)
    frame[..., :3] = np.where(frame_on[..., None], frame[..., :3], 0)

    # 5. Comprehensive Skin Mask (protect head, face, neck, exposed chest, bare arm)
    hsv = rgb_to_hsv(frame[..., :3].astype(np.float32) / 255.0)
    h, s, v = hsv[..., 0], hsv[..., 1], hsv[..., 2]

    # Skin tone detection
    skin_cand = frame_on & (h >= 5) & (h <= 45) & (s >= 0.05) & (s <= 0.70) & (v >= 0.15)

    # Head and face
    head_mask = np.zeros(frame_on.shape, bool)
    head_mask[75:95, 46:78] = frame_on[75:95, 46:78] & (v[75:95, 46:78] >= 0.15)

    # Bare right arm & shoulder
    arm_mask = np.zeros(frame_on.shape, bool)
    arm_box = (np.arange(FH)[:, None] >= 90) & (np.arange(FH)[:, None] <= 145) & \
              (np.arange(FW)[None, :] >= 30) & (np.arange(FW)[None, :] <= 62)
    arm_mask[arm_box] = skin_cand[arm_box]

    # Bare chest / neck
    chest_mask = np.zeros(frame_on.shape, bool)
    chest_box = (np.arange(FH)[:, None] >= 93) & (np.arange(FH)[:, None] <= 122) & \
                (np.arange(FW)[None, :] >= 55) & (np.arange(FW)[None, :] <= 76)
    chest_mask[chest_box] = skin_cand[chest_box]

    full_skin = head_mask | arm_mask | chest_mask
    full_skin = ndimage.binary_closing(full_skin, structure=np.ones((2, 2))) & frame_on

    return frame, full_skin.astype(np.uint8) * 255

def main():
    print('Processing 5 Monk tiers with clean artifact-free downsampling...')
    tier_frames = []
    tier_masks = []
    for i, path in enumerate(TIERS):
        f, m = process_raw_tier(path, i)
        semi = ((f[..., 3] > 0) & (f[..., 3] < 255)).sum()
        assert semi == 0, f'Tier {i+1} has {semi} semi-transparent pixels!'
        tier_frames.append(f)
        tier_masks.append(m)
        hys, hxs = np.nonzero(f[75:95, :, 3] > 0)
        hcx = (hxs.min() + hxs.max()) / 2
        print(f'Tier {i+1}: head_cx={hcx:.1f}, masked skin px={np.count_nonzero(m)}')

    names = [
        'armor_01_common', 'armor_02_common_additional',
        'armor_03_uncommon', 'armor_04_uncommon_additional',
        'armor_05_rare', 'armor_06_rare_additional',
        'armor_07_epic', 'armor_08_epic_additional',
        'armor_09_legendary', 'armor_10_legendary_additional',
        'armor_11_mythic', 'armor_12_mythic_additional',
        'armor_13_rare_c02a', 'armor_14_rare_c02b',
        'armor_15_epic_c02', 'armor_16_legendary_c02',
        'armor_17_mythic_c02a', 'armor_18_mythic_c02b',
        'armor_19_rare_c04a', 'armor_20_rare_c04b', 'armor_21_rare_c04c',
        'armor_22_epic_c04a', 'armor_23_epic_c04b', 'armor_24_epic_c04c',
        'armor_25_legendary_c04', 'armor_26_mythic_c04'
    ]

    tier_map = {
        1: 0, 2: 0,
        3: 1, 4: 1,
        5: 2, 6: 2, 13: 2, 14: 2, 19: 2, 20: 2, 21: 2,
        7: 3, 8: 3, 15: 3, 22: 3, 23: 3, 24: 3,
        9: 4, 10: 4, 11: 4, 12: 4, 16: 4, 17: 4, 18: 4, 25: 4, 26: 4
    }

    src_dir = ROOT / 'assets/source/gear_nocturne/monk'
    src_dir.mkdir(parents=True, exist_ok=True)

    print('Writing 26 native PNGs to assets/source/gear_nocturne/monk/...')
    for arm_id in range(1, 27):
        t_idx = tier_map[arm_id]
        f = tier_frames[t_idx]
        name = names[arm_id - 1]
        Image.fromarray(f).save(src_dir / f'{name}.png')

    cols = 6
    rows = -(-26 // cols) # 5 rows
    atlas = np.zeros((rows * FH, cols * FW, 4), dtype=np.uint8)
    mask = np.zeros((rows * FH, cols * FW), dtype=np.uint8)
    boxes = []

    for arm_id in range(1, 27):
        t_idx = tier_map[arm_id]
        f = tier_frames[t_idx]
        m = tier_masks[t_idx]
        i = arm_id - 1
        x, y = (i % cols) * FW, (i // cols) * FH
        atlas[y:y+FH, x:x+FW] = f
        mask[y:y+FH, x:x+FW] = m
        ys, xs = np.nonzero(f[..., 3])
        boxes.append([int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1])

    out_monk = ROOT / 'assets/sprites/gear/monk'
    out_monk.mkdir(parents=True, exist_ok=True)

    print('Saving armor.webp and armor_mask.png...')
    Image.fromarray(atlas).save(out_monk / 'armor.webp', lossless=True, quality=100, method=6)
    Image.fromarray(mask).save(out_monk / 'armor_mask.png', optimize=True)

    # Check for any rogue saturated pixels in entire atlas
    ar, ag, ab, aa = atlas[..., 0], atlas[..., 1], atlas[..., 2], atlas[..., 3]
    op = aa > 0
    bad_atlas = op & (((ar > 150) & (ag < 40) & (ab < 40)) |
                      ((ag > 150) & (ar < 40) & (ab < 40)) |
                      ((ab > 150) & (ar < 40) & (ag < 40)))
    print(f'Atlas total saturated rogue pixels: {bad_atlas.sum()}')
    assert bad_atlas.sum() == 0, 'Found saturated rogue pixels in atlas!'

    meta = {
        'class': 'monk',
        'style': 'grim_nocturne',
        'frame': [FW, FH],
        'cols': cols,
        'anchor': [64, CROWN],
        'feet': SOLE,
        'headTop': CROWN,
        'helmPin': [45, 63],
        'armor': {
            'n': 26,
            'bands': {
                'common': [1, 2],
                'uncommon': [3, 4],
                'rare': [5, 6, 13, 14, 19, 20, 21],
                'epic': [7, 8, 15, 22, 23, 24],
                'legendary': [9, 10, 16, 25],
                'mythic': [11, 12, 17, 18, 26]
            },
            'names': names,
            'box': boxes,
            'head': [[0, 0] for _ in range(26)]
        }
    }

    (out_monk / 'gear.json').write_text(json.dumps(meta, separators=(',', ':')))
    print('gear.json written successfully.')

    # Update helmet placements.json
    helm_atlas_img = Image.open(ROOT / 'assets/sprites/gear/helmets/atlas.webp')
    helm_idx = json.load(open(ROOT / 'assets/sprites/gear/helmets/index.json'))
    cw, ch = helm_idx['frame']
    barb_col = helm_idx['classes'].index('barbarian')
    f_meta = helm_idx['fit']
    sx = f_meta['scaleX']
    sy = f_meta['scaleY']
    head_top = CROWN

    placements_path = ROOT / 'assets/sprites/gear/helmets/placements.json'
    placements_data = json.load(open(placements_path)) if placements_path.exists() else {'version': 1, 'classes': {}}
    if 'classes' not in placements_data:
        placements_data['classes'] = {}

    monk_placements = {}
    helm_arr = np.array(helm_atlas_img)
    for design in range(1, 16):
        sy_px = (design - 1) * ch
        helm = helm_arr[sy_px:sy_px+ch, barb_col*cw:(barb_col+1)*cw]
        ys, xs = np.nonzero(helm[..., 3] > 0)
        cx = (xs.min() + xs.max() + 1) / 2
        dx = round(62.0 - cx * sx, 2)
        dy = round(head_top + f_meta['baselineOffset'] - f_meta['sourceBaseline'] * sy, 2)
        monk_placements[str(design)] = {
            'x': dx,
            'y': dy,
            'scaleX': sx,
            'scaleY': sy,
            'rotation': 0
        }

    placements_data['classes']['monk'] = monk_placements
    placements_path.write_text(json.dumps(placements_data, indent=2))
    print('Updated placements.json with monk helmet calibrations.')

    # Update select screen portrait
    select_path = ROOT / 'assets/sprites/select/nocturne/monk.webp'
    Image.fromarray(tier_frames[0]).save(select_path, lossless=True)
    print('Updated assets/sprites/select/nocturne/monk.webp')

if __name__ == '__main__':
    main()
