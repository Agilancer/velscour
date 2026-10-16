"""Build compact, four-angle wall-hanging atlases from the authored sheets."""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets" / "source" / "biome-variants"
OUT = ROOT / "assets" / "fx" / "wall_hangings"
CELL = 96
SHEET_ROWS = [
    [
        "cracked_heraldic_shield", "parchment_wayfinder_map", "antlered_hunt_skull",
        "chained_iron_reliquary", "cracked_stone_visage", "apothecary_bottle_shelf",
        "crossed_swords_plaque", "carved_votive_shrine", "torn_crimson_banner",
        "brass_astrolabe_clock",
    ],
    [
        "ornate_handbell", "perched_raven_bracket", "pressed_herbarium_frame",
        "chained_rune_tablet", "cracked_bronze_mirror", "wyvern_jaw_trophy",
        "three_iron_keys", "laced_war_drum", "skull_reliquary_cabinet", "moonstar_medallion",
    ],
    [
        "portcullis_warning_plaque", "saint_portrait_frame", "three_bone_charms",
        "spiked_demon_mask", "blue_moon_glass_medallion", "three_blade_rack",
        "hooked_chain_bundle", "gargoyle_relief", "niche_funeral_urn", "pendant_bell",
    ],
    [
        "iron_keyhole_plate", "rootbound_emerald_wreath", "plague_doctor_mask",
        "carved_spider_tablet", "three_tonic_vials", "cracked_sunburst_crest",
        "spiked_mace_bracket", "caged_sandglass", "bone_tally_board", "serpent_ring_knocker",
    ],
    [
        "teardrop_silver_mirror", "stone_moth_relief", "ravenfall_tapestry",
        "green_idol_niche", "crescent_candle_sconce", "copper_pressure_gauge",
        "leather_chart_case", "antler_crown_plaque", "clawed_crystal_cluster",
        "clockwork_moth_automaton",
    ],
]

# Existing VELSCOUR wall-torch columns, copied as a contract rather than
# rotating one flat image: f/back, b/back, b/front, f/front.
ANGLE_ORDER = ["f_back", "b_back", "b_front", "f_front"]
SOURCE_SHEETS = [
    (1, 10), (2, 10), (3, 10), (4, 10), (5, 9),
]


def view_bands(sheet: Image.Image) -> list[tuple[int, int]]:
    alpha = np.asarray(sheet.getchannel("A"))
    support = (alpha >= 32).sum(axis=0)
    active = support > 0
    bands: list[tuple[int, int]] = []
    start = None
    for x, on in enumerate(active.tolist() + [False]):
        if on and start is None:
            start = x
        elif not on and start is not None:
            bands.append((start, x))
            start = None
    if len(bands) != 4:
        raise ValueError(f"expected four authored view bands, found {len(bands)}")
    return bands


def crop_cell(sheet: Image.Image, row: int, col: int, rows: int,
              bands: list[tuple[int, int]]) -> Image.Image:
    _, h = sheet.size
    x0, x1 = bands[col]
    y0, y1 = round(row * h / rows), round((row + 1) * h / rows)
    frame = sheet.crop((x0, y0, x1, y1)).convert("RGBA")
    # Threshold near-invisible antialiasing specks from generation while
    # preserving the authored transparent cutout and fine outlines.
    alpha = frame.getchannel("A").point(lambda a: 0 if a < 10 else a)
    frame.putalpha(alpha)
    bbox = alpha.getbbox()
    if not bbox:
        raise ValueError(f"empty frame at row {row + 1}, angle {col}")
    return frame.crop(bbox)


def fit_frame(frame: Image.Image) -> Image.Image:
    bbox = frame.getchannel("A").getbbox()
    frame = frame.crop(bbox)
    scale = min(86 / frame.width, 86 / frame.height)
    size = (max(1, round(frame.width * scale)), max(1, round(frame.height * scale)))
    # Nearest-neighbor keeps the chunky game-sprite clusters crisp.
    frame = frame.resize(size, Image.Resampling.NEAREST)
    out = Image.new("RGBA", (CELL, CELL), (0, 0, 0, 0))
    out.alpha_composite(frame, ((CELL - size[0]) // 2, (CELL - size[1]) // 2))
    return out


def build():
    OUT.mkdir(parents=True, exist_ok=True)
    all_names = [name for group in SHEET_ROWS for name in group]
    if len(all_names) != 50 or len(set(all_names)) != 50:
        raise ValueError("the catalog must contain exactly 50 unique names")

    cells: list[list[Image.Image]] = []
    for sheet_no, row_count in SOURCE_SHEETS:
        path = SOURCE / f"wall_hangings_sheet_{sheet_no:02}.png"
        source = Image.open(path).convert("RGBA")
        bands = view_bands(source)
        for row in range(row_count):
            cells.append([fit_frame(crop_cell(source, row, col, row_count, bands)) for col in range(4)])

    # Sheet 5 contributes nine rows. The final clockwork moth is the supplied
    # standalone four-view source, treated as its own one-row atlas.
    final = Image.open(SOURCE / "wall_hangings_row_50.png").convert("RGBA")
    bands = view_bands(final)
    cells.append([fit_frame(crop_cell(final, 0, col, 1, bands)) for col in range(4)])
    if len(cells) != 50:
        raise ValueError(f"expected 50 rows, found {len(cells)}")

    manifest = {
        "name": "VELSCOUR wall hangings",
        "count": 50,
        "directions_per_item": 4,
        "cell_px": [CELL, CELL],
        "atlas_layout": "4 columns by 10 rows per atlas; one item per row",
        "angle_order": ANGLE_ORDER,
        "angle_contract": {
            "f_back": "constant-X wall, back/interior-facing",
            "b_back": "constant-Y wall, back/interior-facing",
            "b_front": "constant-Y wall, front-facing",
            "f_front": "constant-X wall, front-facing",
            "render_rule": "use authored views; never mirror or rotate a flat sprite",
        },
        "items": [],
    }
    for item_index, (name, views) in enumerate(zip(all_names, cells)):
        atlas = item_index // 10 + 1
        row = item_index % 10
        manifest["items"].append({
            "id": name,
            "index": item_index,
            "atlas": atlas,
            "row": row,
            "angles": {direction: col for col, direction in enumerate(ANGLE_ORDER)},
            "pivot_px": [48, 90],
        })
        if row == 0:
            sheet = Image.new("RGBA", (CELL * 4, CELL * 10), (0, 0, 0, 0))
        for col, view in enumerate(views):
            sheet.alpha_composite(view, (col * CELL, row * CELL))
        if row == 9:
            sheet.save(OUT / f"hangings_{atlas}.webp", "WEBP", lossless=True, method=6)
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"Built 50 items × 4 authored angles into {OUT}")


if __name__ == "__main__":
    build()
