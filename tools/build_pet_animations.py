"""Pack labeled companion studies into compact, label-free runtime atlases."""
from pathlib import Path
from PIL import Image
import json

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'assets/source/pet_animations'
OUT = ROOT / 'assets/sprites/pets'

# Frame order within each row is idle, three spawn, three run, two attack;
# winged companions use three flap frames followed by three forward-flight frames.
SHEETS = {
    'companions_land': ('animal_companions_land.png', 9, [
        'wolf', 'spiritwolf', 'direwolf', 'stormwolf', 'bear', 'spiritbear', 'ghoul']),
    'creatures_land': ('land_creature_companions.png', 9, [
        'bear', 'spiritbear', 'ghoul', 'abomination']),
    'companions_winged': ('winged_companions.png', 6, [
        'hawk', 'stormhawk', 'raven', 'phoenix']),
    'companions_dragons': ('dragon_companions.png', 6, [
        'whelp', 'wyvern', 'frostwyrm', 'elderwyrm']),
    'skeletal_warriors': ('skeletal_warriors.png', 9, [
        'skeleton', 'reaver', 'spearman', 'berserker']),
    'skeletal_ranged': ('skeletal_ranged.png', 9, [
        'skelarcher', 'crossbowman', 'skelmage', 'pyromancer']),
    'skeletal_support': ('skeletal_support.png', 9, [
        'plaguecaller', 'stormcaller', 'bishop', 'archlich']),
    'lancer_knights_i': ('lancer_knights_i.png', 9, [
        'kn_squire', 'kn_lance', 'kn_flame', 'kn_frost']),
    'lancer_knights_ii': ('lancer_knights_ii.png', 9, [
        'kn_storm', 'kn_captain', 'kn_chaplain', 'kn_marshal']),
    'elemental_golems': ('elemental_golems.png', 9, [
        'claygolem', 'bloodgolem', 'firegolem', 'icegolem']),
    'humanoid_warriors': ('humanoid_warriors.png', 9, [
        'deathknight', 'hoplite', 'squire', 'captain']),
    'class_allies': ('class_allies.png', 9, [
        'ancient', 'stormancient', 'ancestor', 'guardian']),
    'skeletal_guards': ('skeletal_guards.png', 9, [
        'jailer', 'coffinguard', 'standard', 'gravedigger']),
    'skeletal_champions': ('skeletal_champions.png', 9, [
        'pyreknight', 'druid', 'bellringer', 'reaperking']),
    'misc_humanoids': ('misc_humanoids.png', 9, [
        'clone', 'chorus', 'witch', 'bonecolossus']),
}

# The generated studies use slightly different left gutters; these values keep
# the first idle/rest pose in frame zero rather than starting at the spawn pose.
X0 = {
    'creatures_land': 220, 'class_allies': 220, 'humanoid_warriors': 220,
    'lancer_knights_i': 300, 'lancer_knights_ii': 300,
    'companions_winged': 360, 'companions_dragons': 350,
}

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    catalog = {}
    for name, (filename, frames, keys) in SHEETS.items():
        src = Image.open(SOURCE / filename).convert('RGBA')
        # The art was labeled with a fixed 18% left margin and 13% top margin.
        # Cutting at those boundaries removes all sheet/row captions while
        # retaining the original frame grid.
        x0 = X0.get(name, round(src.width * .18))
        y0 = {'class_allies': 55, 'companions_dragons': 65}.get(name, round(src.height * .13))
        cw = (src.width - x0) // frames
        ch = (src.height - y0) // len(keys)
        out_h = min(128, ch)
        scale = out_h / ch
        out_w = max(1, round(cw * scale))
        atlas = Image.new('RGBA', (out_w * frames, out_h * len(keys)), (0, 0, 0, 0))
        for row, key in enumerate(keys):
            for frame in range(frames):
                cell = src.crop((x0 + frame * cw, y0 + row * ch,
                                 x0 + (frame + 1) * cw, y0 + (row + 1) * ch))
                cell = cell.resize((out_w, out_h), Image.Resampling.LANCZOS)
                atlas.alpha_composite(cell, (frame * out_w, row * out_h))
            catalog[key] = {'sheet': name, 'row': row, 'frames': frames,
                            'cellW': out_w, 'cellH': out_h,
                            'kind': 'winged' if frames == 6 else 'land'}
        atlas.save(OUT / f'{name}.webp', 'WEBP', quality=88, method=2)
        print(f'{name}: {len(keys)} rows, {frames} frames, {atlas.width}x{atlas.height}')

    (OUT / 'catalog.json').write_text(json.dumps(catalog, separators=(',', ':')) + '\n', encoding='utf-8')

if __name__ == '__main__':
    main()
