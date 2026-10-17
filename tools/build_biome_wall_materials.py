"""Build ten seamless 128px wall materials for every AI-authored dungeon biome."""
from pathlib import Path

from PIL import Image, ImageEnhance


ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / "assets" / "tiles" / "ai_biomes"
SOURCE = ART / "wall_materials_source.png"
CELL = 128
BLEED = 12
NEAREST = Image.Resampling.NEAREST


def seamless(image):
    """Blend opposing edge pixels together over a short band for clean repeats."""
    image = image.copy()
    px = image.load()
    w, h = image.size
    for i in range(BLEED):
        amount = i / max(1, BLEED - 1)
        for y in range(h):
            left, right = px[i, y], px[w - 1 - i, y]
            avg = tuple((left[c] + right[c]) // 2 for c in range(3))
            for c in range(3):
                left = (*left[:c], round(avg[c] * (1 - amount) + left[c] * amount), *left[c + 1:])
                right = (*right[:c], round(avg[c] * (1 - amount) + right[c] * amount), *right[c + 1:])
            px[i, y], px[w - 1 - i, y] = left, right
    for i in range(BLEED):
        amount = i / max(1, BLEED - 1)
        for x in range(w):
            top, bottom = px[x, i], px[x, h - 1 - i]
            avg = tuple((top[c] + bottom[c]) // 2 for c in range(3))
            for c in range(3):
                top = (*top[:c], round(avg[c] * (1 - amount) + top[c] * amount), *top[c + 1:])
                bottom = (*bottom[:c], round(avg[c] * (1 - amount) + bottom[c] * amount), *bottom[c + 1:])
            px[x, i], px[x, h - 1 - i] = top, bottom
    return image


def source_swatches(sheet):
    # The generated reference is a 5x2 wall-surface sheet. Crop the broad
    # masonry field from each column; strip away no source pixel via alpha.
    if sheet.width != sheet.height or sheet.width < 1000:
        raise ValueError(f"Expected a square high-resolution generated sheet, got {sheet.size}")
    swatches = []
    for row in range(2):
        row_top = round(row * sheet.height / 2)
        row_bottom = round((row + 1) * sheet.height / 2)
        top = row_top + (row_bottom - row_top - 256) // 2
        for col in range(5):
            left = round(col * sheet.width / 5)
            right = round((col + 1) * sheet.width / 5)
            crop_left = left + (right - left - 256) // 2
            swatches.append(sheet.crop((crop_left, top, crop_left + 256, top + 256)).resize((CELL, CELL), NEAREST))
    return swatches


def main():
    sheet = Image.open(SOURCE).convert("RGB")
    swatches = source_swatches(sheet)
    for architecture in sorted(ART.glob("*_architecture.webp")):
        biome = architecture.stem.removesuffix("_architecture")
        theme = Image.open(architecture).convert("RGB").resize((CELL, CELL), NEAREST)
        atlas = Image.new("RGB", (CELL * 10, CELL))
        for index, swatch in enumerate(swatches):
            # Carry each biome's own stone, ornament and palette strongly into
            # the material while keeping each of the ten masonry motifs legible.
            detail = ImageEnhance.Color(theme).enhance(0.8 + (index % 3) * 0.15)
            detail = ImageEnhance.Brightness(detail).enhance(0.84 + (index % 4) * 0.06)
            mix = Image.blend(swatch, detail, 0.48)
            mix = seamless(mix)
            atlas.paste(mix, (index * CELL, 0))
        atlas.save(ART / f"{biome}_wall_materials.webp", "WEBP", lossless=True, method=6)
        print(f"{biome}: 10 x 128x128 seamless wall materials")


if __name__ == "__main__":
    main()
