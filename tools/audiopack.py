"""
Audio import: unpacks the user's sound zips in assets/source/audio/ and transcodes them to MP3 under assets/audio/
(MP3 is the one format every browser decodes, Safari and Firefox-on-Linux included).

    python3 tools/process_assets.py audio

  SFX.zip                -> assets/audio/sfx/<slug>.mp3     mono one-shots (attacks, spells, doors, footsteps, torch)
  BG Loops N.zip         -> assets/audio/amb/<slug>.mp3     60 s stereo ambient beds (+ the river/waterfall loops)
  Game Music / Music Pack 2 -> assets/audio/music/<slug>.mp3   only the MUSIC_KEEP songs (title + town); the rest are skipped
  <Song>.m4a|mp3|ogg|wav  -> assets/audio/music/<slug>.mp3   loose songs are always kept (the dungeon/overworld rotation)
  oneshots/<name>.wav     -> assets/audio/sfx/<name>.mp3     stereo one-shots, lead-in cut and faded out (ONESHOTS)
  assets/audio/audio.json   {sfx: [...], amb: {slug: seconds}, music: {slug: seconds}}  (read by src/core/audio.js)
Needs ffmpeg + ffprobe on PATH. Slugs: lower case, spaces -> '_' ("Sword Attack 1.ogg" -> sword_attack_1).
The one-shots need only numpy + lameenc and build on their own:  python3 tools/process_assets.py oneshots
"""
import json
import os
import re
import shutil
import subprocess
import tempfile
import wave
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "assets", "source", "audio")
OUT = os.path.join(ROOT, "assets", "audio")

SFX_SKIP = re.compile(r"(Chain |Jump|Land|Chopping and Mining|Put Away|Take Out|Sheath|Unsheath)", re.I)
MUSIC_KEEP = {"hymn_of_the_abyss", "empty_school"}   # title screen + town (dungeons: the loose songs)
SONG_EXT = (".m4a", ".mp3", ".ogg", ".wav", ".flac")
LOOPS = re.compile(r"(Loop\.ogg$)", re.I)   # river / waterfall / torch loops are ambient beds, not one-shots
# oneshots/<name>.wav -> (fade-out start, silent by), seconds after the cut lead-in
ONESHOTS = {
    # the level-up's lightning: the first 6 s of Freesound #616992 by trp, "210914 thunder crack pretty close, bit of
    # distortion, urban toronto 1am"
    "thunder_crack": (2.0, 4.0),
}


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
        for f in sorted(os.listdir(SRC)):   # loose songs (e.g. "Stone Room Reverberation.m4a")
            if f.lower().endswith(SONG_EXT):
                p, s = os.path.join(SRC, f), slug(f)
                encode(p, os.path.join(OUT, "music", s + ".mp3"), False, 4)
                manifest["music"][s] = duration(p)
                print("audio:", s)
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
    process_oneshots(manifest)
    manifest["sfx"].sort()
    with open(os.path.join(OUT, "audio.json"), "w") as fh:
        json.dump(manifest, fh, indent=1, sort_keys=True)
    print(f"audio: {len(manifest['sfx'])} sfx, {len(manifest['amb'])} ambient loops, {len(manifest['music'])} songs")


def read_wav(path):
    """16/24-bit PCM WAV -> (float samples [n, channels], rate)."""
    import numpy as np
    w = wave.open(path)
    ch, sw, sr, n = w.getnchannels(), w.getsampwidth(), w.getframerate(), w.getnframes()
    raw = np.frombuffer(w.readframes(n), dtype=np.uint8)
    if sw == 3:   # 24-bit little endian -> int32
        b = raw.reshape(-1, 3).astype(np.int32)
        x = b[:, 0] | (b[:, 1] << 8) | (b[:, 2] << 16)
        x = np.where(x & 0x800000, x - 0x1000000, x) / 8388608.0
    elif sw == 2:
        x = np.frombuffer(raw.tobytes(), dtype="<i2") / 32768.0
    else:
        raise SystemExit(f"audio: {path}: unsupported sample width {sw}")
    return x.reshape(-1, ch), sr


def process_oneshots(manifest=None):
    """oneshots/*.wav -> sfx/<slug>.mp3: the lead-in cut to 10 ms before the sound, the ONESHOTS fade, peak -1 dBFS.
    With no manifest given, adds the slugs to assets/audio/audio.json in place."""
    import numpy as np
    import lameenc
    src = os.path.join(SRC, "oneshots")
    own = manifest is None
    if own:
        with open(os.path.join(OUT, "audio.json")) as fh:
            manifest = json.load(fh)
    os.makedirs(os.path.join(OUT, "sfx"), exist_ok=True)
    for f in sorted(os.listdir(src)) if os.path.isdir(src) else []:
        if not f.lower().endswith(".wav"):
            continue
        s = slug(f)
        x, sr = read_wav(os.path.join(src, f))
        # the sound starts where it rises out of the room tone: walk back from the first loud 5 ms until 15 ms in a
        # row sit near the floor (a lone click in the lead-in is never loud for long)
        win = sr // 200
        m = x.mean(axis=1)
        rms = np.sqrt((m[: len(m) // win * win].reshape(-1, win) ** 2).mean(axis=1))
        floor = np.median(rms[: int(0.5 * sr / win)])
        i, quiet = int(np.argmax(rms > 0.1)), 0
        while i > 0 and quiet < 3:
            i -= 1
            quiet = quiet + 1 if rms[i] < 3 * floor else 0
        cut = max(0, (i + quiet) * win - sr // 100)
        x = x[cut:].copy()
        if s in ONESHOTS:
            f0, f1 = ONESHOTS[s]
            x = x[: int(f1 * sr)]
            u = np.clip((np.arange(len(x)) / sr - f0) / (f1 - f0), 0, 1)
            x *= ((1 - u) ** 2)[:, None]   # dies away like a rumble, silent at f1
        x[:win] *= np.linspace(0, 1, win)[:, None]   # no click at the cut
        x *= 0.89 / max(1e-9, np.abs(x).max())
        enc = lameenc.Encoder()
        enc.set_bit_rate(128); enc.set_in_sample_rate(sr); enc.set_channels(x.shape[1]); enc.set_quality(2)
        with open(os.path.join(OUT, "sfx", s + ".mp3"), "wb") as fh:
            fh.write(enc.encode((np.clip(x, -1, 1) * 32767).astype("<i2").tobytes()) + enc.flush())
        if s not in manifest["sfx"]:
            manifest["sfx"].append(s)
        print(f"audio: {s} (lead-in {cut / sr:.3f} s cut, {len(x) / sr:.2f} s)")
    if own:
        manifest["sfx"].sort()
        with open(os.path.join(OUT, "audio.json"), "w") as fh:
            json.dump(manifest, fh, indent=1, sort_keys=True)
