"""Reduce generated 8x8 biome atlases to compact nearest-neighbor game sheets."""
from argparse import ArgumentParser
from pathlib import Path

from PIL import Image


BIOMES = ("desert_temple", "ice_temple", "hell", "astral_plane", "heavenly")
NEAREST = Image.Resampling.NEAREST


def cell_box(image, col, row):
    width, height = image.size
    return (
        round(col * width / 8),
        round(row * height / 8),
        round((col + 1) * width / 8),
        round((row + 1) * height / 8),
    )


def biome_sheet(source, destination):
    image = Image.open(source).convert("RGBA")
    sheet = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
    for row in range(8):
        for col in range(8):
            cell = image.crop(cell_box(image, col, row))
            if row < 4:
                # Isometric floor art keeps the engine's 2:1 diamond ratio.
                sprite = cell.resize((64, 32), NEAREST)
                sheet.alpha_composite(sprite, (col * 64, row * 64 + 16))
            else:
                sprite = cell.resize((64, 64), NEAREST)
                sheet.alpha_composite(sprite, (col * 64, row * 64))
    destination.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(destination, "WEBP", lossless=True, method=6)


def monster_sheet(source, destination):
    image = Image.open(source).convert("RGBA")
    sheet = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
    for row in range(8):
        for col in range(8):
            sprite = image.crop(cell_box(image, col, row)).resize((64, 64), NEAREST)
            sheet.alpha_composite(sprite, (col * 64, row * 64))
    destination.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(destination, "WEBP", lossless=True, method=6)


def architecture_sheets(source, output):
    """Split a five-panel generated architecture sheet into compact textures."""
    image = Image.open(source).convert("RGBA")
    for index, biome in enumerate(BIOMES):
        left = round(index * image.width / len(BIOMES))
        right = round((index + 1) * image.width / len(BIOMES))
        tile = image.crop((left, 0, right, image.height)).resize((128, 128), NEAREST)
        tile.save(output / f"{biome}_architecture.webp", "WEBP", lossless=True, method=6)


def main():
    parser = ArgumentParser()
    for biome in BIOMES:
        parser.add_argument(f"--{biome.replace('_', '-')}", required=True, type=Path)
    parser.add_argument("--monsters", required=True, type=Path)
    parser.add_argument("--architecture-source", type=Path,
                        help="generated five-panel architecture material sheet")
    parser.add_argument("--output", type=Path, default=Path("assets/tiles/ai_biomes"))
    args = parser.parse_args()
    for biome in BIOMES:
        biome_sheet(getattr(args, biome), args.output / f"{biome}.webp")
    monster_sheet(args.monsters, args.output / "heavenly_monsters.webp")
    if args.architecture_source:
        architecture_sheets(args.architecture_source, args.output)


if __name__ == "__main__":
    main()
