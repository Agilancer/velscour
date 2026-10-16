"""Build the pixel-aligned Velscour title logo punchout and skull cutout."""

from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
RIG = ROOT / "assets/ui/title_skull_rig"
LOGO_PATH = ROOT / "assets/ui/logo.webp"
SOURCE_PATH = ROOT / "assets/ui/title_skull_animations/source_overlay.png"

# Coordinates are taken from the oval shown in the user's 562x234 reference,
# mapped onto the 1400x591 game logo canvas.
CENTER_X, CENTER_Y = 881.5, 295.5
RADIUS_X, RADIUS_Y = 67.0, 99.0
SCALE = 4
CUTOUT_BOX = (814, 196, 949, 395)  # 135x199; includes the antialiased ellipse edge.


def ellipse_mask(size: tuple[int, int], box: tuple[float, float, float, float]) -> Image.Image:
    mask = Image.new("L", (size[0] * SCALE, size[1] * SCALE), 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse(tuple(round(value * SCALE) for value in box), fill=255)
    return mask.resize(size, Image.Resampling.LANCZOS)


def main() -> None:
    logo = Image.open(LOGO_PATH).convert("RGBA")
    overlay = Image.open(SOURCE_PATH).convert("RGBA")
    if logo.size != (1400, 591):
        raise ValueError(f"Expected a 1400x591 logo, got {logo.size}.")
    if overlay.size != (310, 814):
        raise ValueError(f"Expected a 310x814 skull source crop, got {overlay.size}.")

    aperture = ellipse_mask(
        logo.size,
        (CENTER_X - RADIUS_X, CENTER_Y - RADIUS_Y, CENTER_X + RADIUS_X, CENTER_Y + RADIUS_Y),
    )

    black = Image.new("RGBA", logo.size, (0, 0, 0, 0))
    black.putalpha(aperture)
    composite = Image.alpha_composite(logo, black)

    # Pull the skull, hoop and adjacent orange spikes from the original title
    # cutout, scale them into the selected oval, and preserve the transparent edge.
    cutout = overlay.crop((0, 170, 310, 640)).resize((CUTOUT_BOX[2] - CUTOUT_BOX[0], CUTOUT_BOX[3] - CUTOUT_BOX[1]), Image.Resampling.LANCZOS)
    local_mask = aperture.crop(CUTOUT_BOX)
    source_alpha = cutout.getchannel("A")
    cutout.putalpha(Image.frombytes("L", source_alpha.size, bytes((a * b + 127) // 255 for a, b in zip(source_alpha.tobytes(), local_mask.tobytes()))))

    composite.alpha_composite(cutout, (CUTOUT_BOX[0], CUTOUT_BOX[1]))
    RIG.mkdir(parents=True, exist_ok=True)
    cutout.save(RIG / "skull_oval_cutout.png", optimize=True)
    composite.save(RIG / "velscour_logo_oval_skull_punched.png", optimize=True)


if __name__ == "__main__":
    main()
