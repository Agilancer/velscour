"""
Audio import: unpacks the user's sound zips in assets/source/audio/ and transcodes them to MP3 under assets/audio/
(MP3 is the one format every browser decodes, Safari and Firefox-on-Linux included).

    python3 tools/process_assets.py audio

  SFX.zip                -> assets/audio/sfx/<slug>.mp3     mono one-shots (attacks, spells, doors, footsteps, torch)
  BG Loops N.zip         -> assets/audio/amb/<slug>.mp3     60 s stereo ambient beds (+ the river/waterfall loops)
  Game Music / Music Pack 2 -> assets/audio/music/<slug>.mp3   only the MUSIC_KEEP songs (title + town); the rest are skipped
  assets/audio/audio.json   {sfx: [...], amb: {slug: seconds}, music: {slug: seconds}}  (read by src/core/audio.js)
Needs ffmpeg + ffprobe on PATH. Slugs: lower case, spaces -> '_' ("Sword Attack 1.ogg" -> sword_attack_1).
"""
import json
import os
import re
import shutil
import subprocess
import tempfile
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "assets", "source", "audio")
OUT = os.path.join(ROOT, "assets", "audio")

SFX_SKIP = re.compile(r"(Chain |Jump|Land|Chopping and Mining|Put Away|Take Out|Sheath|Unsheath)", re.I)
MUSIC_KEEP = {"hymn_of_the_abyss", "empty_school"}   # title screen + town; dungeons have ambience only
LOOPS = re.compile(r"(Loop\.ogg$)", re.I)   # river / waterfall / torch loops are ambient beds, not one-shots


def slug(name):
    return re.sub(r"[^a-z0-9]+", "_", os.path.splitext(os.path.basename(name))[0].lower()).strip("_")


def duration(path):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path],
                       capture_output=True, text=True, check=True)
    return round(float(r.stdout.strip()), 2)


def encode(src, dst, mono, q):
    args = ["ffmpeg", "-v", "error", "-y", "-i", src, "-map_metadata", "-1", "-vn"]
    if mono:
        args += ["-ac", "1"]
    args += ["-ar", "44100", "-c:a", "libmp3lame", "-q:a", str(q), dst]
    subprocess.run(args, check=True)


def process_audio():
    if not shutil.which("ffmpeg"):
        raise SystemExit("audio: ffmpeg not found")
    for d in ("sfx", "amb", "music"):
        os.makedirs(os.path.join(OUT, d), exist_ok=True)
    manifest = {"sfx": [], "amb": {}, "music": {}}
    tmp = tempfile.mkdtemp(prefix="velscour_audio_")
    try:
        for zname in sorted(os.listdir(SRC)):
            if not zname.lower().endswith(".zip"):
                continue
            zdir = os.path.join(tmp, slug(zname))
            with zipfile.ZipFile(os.path.join(SRC, zname)) as z:
                z.extractall(zdir)
            is_sfx, is_amb = zname.startswith("SFX"), zname.startswith("BG Loops")
            for base, _, files in os.walk(zdir):
                for f in sorted(files):
                    if not f.lower().endswith(".ogg"):
                        continue
                    p = os.path.join(base, f)
                    s = slug(f)
                    if is_sfx and LOOPS.search(f):
                        encode(p, os.path.join(OUT, "amb", s + ".mp3"), False, 7)
                        manifest["amb"][s] = duration(p)
                    elif is_sfx:
                        if SFX_SKIP.search(os.path.relpath(p, zdir)):
                            continue
                        encode(p, os.path.join(OUT, "sfx", s + ".mp3"), True, 5)
                        manifest["sfx"].append(s)
                    elif is_amb:
                        encode(p, os.path.join(OUT, "amb", s + ".mp3"), False, 7)
                        manifest["amb"][s] = duration(p)
                    elif s in MUSIC_KEEP:
                        encode(p, os.path.join(OUT, "music", s + ".mp3"), False, 4)
                        manifest["music"][s] = duration(p)
                    else:
                        continue
                    print("audio:", s)
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    manifest["sfx"].sort()
    with open(os.path.join(OUT, "audio.json"), "w") as fh:
        json.dump(manifest, fh, indent=1, sort_keys=True)
    print(f"audio: {len(manifest['sfx'])} sfx, {len(manifest['amb'])} ambient loops, {len(manifest['music'])} songs")
