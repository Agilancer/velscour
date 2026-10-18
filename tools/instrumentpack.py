"""
Instrument import: the user's chromatic sampler packs in assets/source/audio/instruments/*.zip (one WAV per key,
mapped by the pack's .sfz) become short mono MP3 one-shots for the sampler in src/core/sampler.js.

    python3 tools/process_assets.py instruments

  Piano_C3-B4_Sampler_Pack.zip        -> assets/audio/inst/piano/<midi>.mp3        (MIDI 48-71, two octaves)
  Harpsichord_C4-C5_Sampler_Pack.zip  -> assets/audio/inst/harpsichord/<midi>.mp3  (MIDI 60-72)
  assets/audio/inst/instruments.json  {name: {keys: [midi...], dur: seconds}}

Each note: leading silence trimmed, mixed to mono, cut to KEEP seconds with a fade over the tail, one gain per
instrument (relative key loudness kept, peak -1 dBFS), 96 kbps MP3. Pure Python: needs numpy and `pip install lameenc`
(no ffmpeg).
"""
import io
import json
import os
import re
import wave
import zipfile

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "assets", "source", "audio", "instruments")
OUT = os.path.join(ROOT, "assets", "audio", "inst")
KEEP = {"piano": (3.6, 1.4), "harpsichord": (2.6, 1.0)}   # seconds kept, of which the last N fade out


def read_wav(data):
    w = wave.open(io.BytesIO(data))
    ch, sw, sr, n = w.getnchannels(), w.getsampwidth(), w.getframerate(), w.getnframes()
    raw = np.frombuffer(w.readframes(n), dtype=np.uint8)
    if sw == 3:   # 24-bit little endian -> int32
        b = raw.reshape(-1, 3).astype(np.int32)
        x = (b[:, 0] | (b[:, 1] << 8) | (b[:, 2] << 16))
        x = np.where(x & 0x800000, x - 0x1000000, x) / 8388608.0
    elif sw == 2:
        x = np.frombuffer(raw.tobytes(), dtype="<i2") / 32768.0
    else:
        raise SystemExit(f"instruments: unsupported sample width {sw}")
    return x.reshape(-1, ch).mean(axis=1), sr


def sfz_map(z):
    """{wav basename: midi key} from the pack's .sfz."""
    sfz = next(n for n in z.namelist() if n.lower().endswith(".sfz"))
    out = {}
    for line in z.read(sfz).decode("utf8", "replace").splitlines():
        m = re.search(r"sample=(\S+).*?key=(\d+)", line)
        if m:
            out[os.path.basename(m.group(1))] = int(m.group(2))
    return out


def process_instruments():
    import lameenc
    os.makedirs(OUT, exist_ok=True)
    manifest = {}
    for fn in sorted(os.listdir(SRC)):
        if not fn.lower().endswith(".zip"):
            continue
        name = fn.split("_")[0].lower()
        keep, fade = KEEP.get(name, (3.0, 1.0))
        z = zipfile.ZipFile(os.path.join(SRC, fn))
        keys = sfz_map(z)
        notes = {}
        for n in z.namelist():
            b = os.path.basename(n)
            if b in keys:
                x, sr = read_wav(z.read(n))
                start = int(np.argmax(np.abs(x) > 10 ** (-50 / 20)))   # first sample above -50 dB
                x = x[max(0, start - int(0.002 * sr)):][: int(keep * sr)]
                f = int(fade * sr)
                if len(x) > f:
                    x[-f:] *= np.linspace(1, 0, f) ** 2
                notes[keys[b]] = (x, sr)
        peak = max(np.abs(x).max() for x, _ in notes.values())
        gain = 10 ** (-1 / 20) / peak
        d = os.path.join(OUT, name)
        os.makedirs(d, exist_ok=True)
        for k, (x, sr) in sorted(notes.items()):
            enc = lameenc.Encoder()
            enc.set_bit_rate(96); enc.set_in_sample_rate(sr); enc.set_channels(1); enc.set_quality(2)
            pcm = (np.clip(x * gain, -1, 1) * 32767).astype("<i2").tobytes()
            with open(os.path.join(d, f"{k}.mp3"), "wb") as fh:
                fh.write(enc.encode(pcm) + enc.flush())
        manifest[name] = {"keys": sorted(notes), "dur": keep}
        print(f"instruments: {name}: {len(notes)} keys {min(notes)}-{max(notes)}, {keep}s each")
    with open(os.path.join(OUT, "instruments.json"), "w") as fh:
        json.dump(manifest, fh, indent=1)


if __name__ == "__main__":
    process_instruments()
