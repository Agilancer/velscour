"""Build compact, four-angle wall-hanging atlases from the authored sheets."""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

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
# (sheet, rows drawn on it, rows to skip). The items don't sit on an even grid, so rows are cut at the emptiest
# scanlines (CUT_HINTS: approximate cuts where items overlap vertically, snapped to the emptiest line within 30 px).
# Sheet 5 draws an unnamed rope pulley as its second row; it isn't one of the 50.
SOURCE_SHEETS = [
    (1, 10, ()), (2, 10, ()), (3, 10, ()), (4, 10, ()), (5, 10, (1,)),
]
CUT_HINTS = {
    1: [129, 285, 406, 571, 708, 838, 988, 1155, 1320],
    5: [94, 205, 289, 383, 468, 548, 644, 724, 809],
}


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


def row_cuts(alpha: np.ndarray, rows: int, hints=None) -> list[int]:
    """Row boundaries: the emptiest scanlines across all four views, at least ~half a row apart."""
    prof = np.convolve((alpha > 40).sum(axis=1).astype(float), np.ones(3) / 3, "same")
    h = len(prof)
    if hints:
        return [0] + [int(y - 30 + np.argmin(prof[y - 30:y + 31])) for y in hints] + [h]
    step = h / rows
    order = np.lexsort((np.abs(np.arange(h) - np.round(np.arange(h) / step) * step), prof))
    cuts: list[int] = []
    for y in order:
        if step * .4 <= y <= h - step * .4 and all(abs(y - c) >= step * .55 for c in cuts):
            cuts.append(int(y))
            if len(cuts) == rows - 1:
                break
    return [0] + sorted(cuts) + [h]


def crop_cell(sheet: Image.Image, cuts: list[int], row: int, col: int,
              bands: list[tuple[int, int]]) -> Image.Image:
    x0, x1 = bands[col]
    cell = np.asarray(sheet)[cuts[row]:cuts[row + 1], x0:x1].copy()
    # drop slivers of the neighbouring rows: small blobs touching the cut (and loose specks)
    m = cell[..., 3] > 24
    lab, n = ndimage.label(m, np.ones((3, 3)))
    if n > 1:
        sizes = ndimage.sum(m, lab, range(1, n + 1)); big = sizes.max()
        for i, sl in enumerate(ndimage.find_objects(lab), 1):
            edge = sl[0].start == 0 or sl[0].stop == m.shape[0]
            if sizes[i - 1] < big * (0.3 if edge else 0.02):
                cell[lab == i, 3] = 0
    # Threshold near-invisible antialiasing specks from generation while
    # preserving the authored transparent cutout and fine outlines.
    cell[..., 3] = np.where(cell[..., 3] < 10, 0, cell[..., 3])
    frame = Image.fromarray(cell, "RGBA")
    bbox = frame.getchannel("A").getbbox()
    if not bbox:
        raise ValueError(f"empty frame at row {row + 1}, angle {col}")
    return frame.crop(bbox)


# ---- wall angle -------------------------------------------------------------------------------------------------
# A view must lie on its wall: a constant-X ('f') wall runs / on screen (slope -1/2), a constant-Y ('b') wall \ (+1/2),
# and a front or back wall of the same axis shows the same plane. The sheets' four views don't keep to that (about half
# the items lean the wrong way on one axis, some face the camera head-on), so each item gets one view per axis: an
# authored one where it clearly leans the right way, else its most head-on view sheared onto the wall's slope.
LEAN_MIN = 0.45
# lean measures the dominant straight edges: the plane for flat pieces, but the part that sticks out for these
LEAN_OVERRIDE = {"plague_doctor_mask": "invert", "brass_astrolabe_clock": "shear", "teardrop_silver_mirror": "shear"}


def lean(view: Image.Image) -> float:
    """+1 when the view's straight edges run down to the right (slope +1/2), -1 up to the right, ~0 head-on."""
    a = np.asarray(view).astype(float)
    al = a[..., 3] / 255
    lum = (a[..., :3] @ [.3, .59, .11]) * al + 40 * (1 - al)
    gx, gy = ndimage.sobel(lum, 1), ndimage.sobel(lum, 0)
    m = np.hypot(gx, gy); thr = np.percentile(m[al > .1], 70)
    ys, xs = np.nonzero(m > thr); w = m[ys, xs]; ang = np.arctan2(gy[ys, xs], gx[ys, xs])
    H = a.shape[0] + a.shape[1]

    def score(deg):
        phi = np.radians(deg); nx, ny = -np.sin(phi), np.cos(phi)
        al2 = (np.cos(ang) * nx + np.sin(ang) * ny) ** 2; k = al2 > .85
        rho = np.round(xs[k] * nx + ys[k] * ny).astype(int) + H
        acc = np.convolve(np.bincount(rho, weights=w[k] * al2[k], minlength=2 * H + 2), [1, 1, 1], "same")
        return np.sort(acc)[-3:].sum()
    f = max(score(d) for d in np.arange(-34, -18.5, 0.5)); b = max(score(d) for d in np.arange(19, 34.5, 0.5))
    return float((b - f) / max(f, b))


def onto_wall(view: Image.Image, slope: float) -> Image.Image:
    """Shear a head-on view onto a wall plane (vertical shear by `slope`, horizontally foreshortened)."""
    w, h = view.size; sx = 0.9
    W, H = round(w * sx), round(h + abs(slope) * w * sx)
    # output (u, v) -> source x = u / sx, y = v - slope * u - (H - h) / 2 offset so the middle stays put
    off = (H - h) / 2 - slope * W / 2
    src = view.convert("RGBa").transform((W, H), Image.Transform.AFFINE, (1 / sx, 0, 0, -slope, 1, -off),
                                         resample=Image.Resampling.BICUBIC)
    return src.convert("RGBA")


def wall_views(name: str, views: list[Image.Image]) -> tuple[Image.Image, Image.Image]:
    """-> (f view, b view)."""
    leans = [lean(v) for v in views]
    mode = LEAN_OVERRIDE.get(name)
    if mode == "invert": leans = [-x for x in leans]
    head_on = views[int(np.argmin(np.abs(leans)))]
    fi, bi = int(np.argmin(leans)), int(np.argmax(leans))
    f = views[fi] if mode != "shear" and leans[fi] <= -LEAN_MIN else onto_wall(head_on, -0.5)
    b = views[bi] if mode != "shear" and leans[bi] >= LEAN_MIN else onto_wall(head_on, 0.5)
    return f, b


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
    for sheet_no, row_count, skip in SOURCE_SHEETS:
        path = SOURCE / f"wall_hangings_sheet_{sheet_no:02}.png"
        source = Image.open(path).convert("RGBA")
        bands = view_bands(source)
        cuts = row_cuts(np.asarray(source.getchannel("A")), row_count, CUT_HINTS.get(sheet_no))
        for row in range(row_count):
            if row not in skip:
                cells.append([crop_cell(source, cuts, row, col, bands) for col in range(4)])

    # Sheet 5 contributes nine rows. The final clockwork moth is the supplied
    # standalone four-view source, treated as its own one-row atlas.
    final = Image.open(SOURCE / "wall_hangings_row_50.png").convert("RGBA")
    bands = view_bands(final)
    cuts = row_cuts(np.asarray(final.getchannel("A")), 1)
    cells.append([crop_cell(final, cuts, 0, col, bands) for col in range(4)])
    if len(cells) != 50:
        raise ValueError(f"expected 50 rows, found {len(cells)}")
    # one view per wall axis, in the atlas order f/back, b/back, b/front, f/front
    for i, views in enumerate(cells):
        f, b = wall_views(all_names[i], views)
        f, b = fit_frame(f), fit_frame(b)
        cells[i] = [f, b, b, f]

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
