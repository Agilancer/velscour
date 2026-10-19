"""
Instrument import: the Bard's harpsichord (the user's "Harpsichord 5 Octaves / 7 Articulations" pack, 427 WAVs, C2-C7)
becomes small mono MP3 one-shots for the sampler in src/core/sampler.js.

    python tools/process_assets.py instruments <Harpsichord_5Octaves_7Articulations_427_Samples.zip | its folder>

The 220 MB zip stays outside the repo (like the Dark Forest pack). Its manifest.json is the contract: one WAV per
MIDI key 36-96 and articulation. The three "held" articulations are one recording at three gains (they correlate
1.000), and soft_short is normal_short played softer, so four banks are kept and the other three are gains on them:

  held      normal_held     cut to HELD_KEEP s with a fade (a harpsichord decays anyway; the low keys ring 13 s)
  normal    normal_short    (damper at 0.43 s, kept whole)
  staccato  staccato_short  (damper at 0.075 s)
  marcato   marcato_short   (damper at 0.2 s, the strong pluck)
  soft_held / marcato_held / soft_short = a bank x the gain measured between the pack's own files

-> assets/audio/inst/harpsichord/<bank>/<midi>.mp3 and assets/audio/inst/instruments.json. The pack has nothing above
11 kHz, so it is resampled to 22,050 Hz (half the decoded memory on a phone) at 48 kbps. One gain for every file
(relative loudness kept, peak -1 dBFS), never per-sample normalisation. Needs numpy, scipy and `pip install lameenc`.
The samples are rendered from the GPL-2 TimGM6mb SoundFont; its notice is copied next to them.
"""
import io
import json
import os
import shutil
import sys
import wave
import zipfile

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "assets", "audio", "inst")
RATE, KBPS = 22050, 48
HELD_KEEP, HELD_FADE = 3.0, 1.1
BANKS = {"held": "normal_held", "normal": "normal_short", "staccato": "staccato_short", "marcato": "marcato_short"}
DERIVED = {"soft_held": ("held", "soft_held"), "marcato_held": ("held", "marcato_held"), "soft_short": ("normal", "soft_short")}


def read_wav(data):
    w = wave.open(io.BytesIO(data))
    ch, sw, sr, n = w.getnchannels(), w.getsampwidth(), w.getframerate(), w.getnframes()
    raw = np.frombuffer(w.readframes(n), dtype=np.uint8)
    if sw == 3:   # 24-bit little endian -> float
        b = raw.reshape(-1, 3).astype(np.int32)
        x = (b[:, 0] | (b[:, 1] << 8) | (b[:, 2] << 16))
        x = np.where(x & 0x800000, x - 0x1000000, x) / 8388608.0
    elif sw == 2:
        x = np.frombuffer(raw.tobytes(), dtype="<i2") / 32768.0
    else:
        raise SystemExit(f"instruments: unsupported sample width {sw}")
    return x.reshape(-1, ch).mean(axis=1), sr


class Pack:
    """The pack as a zip or an extracted folder; paths are relative to the folder holding manifest.json."""
    def __init__(self, src):
        if os.path.isdir(src):
            base = next((r for r, _, f in os.walk(src) if "manifest.json" in f), None)
            if not base:
                raise SystemExit("instruments: no manifest.json under " + src)
            self.read = lambda rel: open(os.path.join(base, rel), "rb").read()
        else:
            z = zipfile.ZipFile(src)
            man = next(n for n in z.namelist() if n.endswith("manifest.json"))
            pre = man[: -len("manifest.json")]
            self.read = lambda rel: z.read(pre + rel)
        self.manifest = json.loads(self.read("manifest.json"))


def rms(x, sr):
    y = x[: int(0.3 * sr)]
    return float(np.sqrt((y ** 2).mean()))


def process_instruments(src=None):
    import lameenc
    from scipy.signal import resample_poly
    if not src:
        raise SystemExit(__doc__)
    pack = Pack(src)
    samples = pack.manifest["samples"]
    by = {(s["midi"], s["articulation"]): s["file"] for s in samples}
    keys = sorted({s["midi"] for s in samples})
    notes, levels = {b: {} for b in BANKS}, {}
    for midi in keys:
        for bank, art in BANKS.items():
            x, sr = read_wav(pack.read(by[(midi, art)]))
            start = int(np.argmax(np.abs(x) > 10 ** (-50 / 20)))   # first sample above -50 dB
            x = x[max(0, start - int(0.001 * sr)):]
            if bank == "held":
                x = x[: int(HELD_KEEP * sr)].copy()
                f = int(HELD_FADE * sr)
                if len(x) > f:
                    x[-f:] *= np.linspace(1, 0, f) ** 2
            else:   # the damped tail is baked in: keep it, just ramp the last 10 ms to silence
                f = int(0.01 * sr)
                x = x.copy(); x[-f:] *= np.linspace(1, 0, f)
            notes[bank][midi] = resample_poly(x, RATE, sr) if sr != RATE else x
        for art in ("normal_held", "soft_held", "marcato_held", "normal_short", "soft_short"):
            x, sr = read_wav(pack.read(by[(midi, art)]))
            levels.setdefault(art, []).append(rms(x, sr))
    gains = {name: round(float(np.median(np.array(levels[art]) / np.array(levels[BANKS[bank]]))), 3) for name, (bank, art) in DERIVED.items()}
    peak = max(np.abs(x).max() for b in notes.values() for x in b.values())
    gain = 10 ** (-1 / 20) / peak
    d0 = os.path.join(OUT, "harpsichord")
    if os.path.isdir(d0):
        shutil.rmtree(d0)
    total = 0
    for bank, b in notes.items():
        d = os.path.join(d0, bank)
        os.makedirs(d, exist_ok=True)
        for midi, x in b.items():
            enc = lameenc.Encoder()
            enc.set_bit_rate(KBPS); enc.set_in_sample_rate(RATE); enc.set_channels(1); enc.set_quality(2)
            pcm = (np.clip(x * gain, -1, 1) * 32767).astype("<i2").tobytes()
            data = enc.encode(pcm) + enc.flush()
            total += len(data)
            with open(os.path.join(d, f"{midi}.mp3"), "wb") as fh:
                fh.write(data)
    piano = os.path.join(OUT, "piano")   # the old piano is retired
    if os.path.isdir(piano):
        shutil.rmtree(piano)
    man = {"harpsichord": {
        "name": "Harpsichord", "lo": keys[0], "hi": keys[-1], "rate": RATE,
        "banks": {b: {"keys": sorted(notes[b]), "art": BANKS[b], "dur": round(max(len(x) for x in notes[b].values()) / RATE, 3)} for b in BANKS},
        "articulations": {**{art: {"bank": b, "gain": 1} for b, art in BANKS.items()}, **{n: {"bank": b, "gain": gains[n]} for n, (b, _) in DERIVED.items()}},
        "source": "Harpsichord 5 Octaves / 7 Articulations (FluidSynth render of the GPL-2 TimGM6mb SoundFont, GM program 7)",
    }}
    with open(os.path.join(OUT, "instruments.json"), "w") as fh:
        json.dump(man, fh, indent=1)
    notice = pack.read("Source/SOURCE_COPYRIGHT.txt").decode("utf8", "replace")
    with open(os.path.join(d0, "LICENSE.txt"), "w", encoding="utf8") as fh:
        fh.write("These harpsichord samples are rendered from the TimGM6mb SoundFont (GM Harpsichord) and are\n"
                 "distributed under the GNU General Public License, version 2 (GPL-2.0.txt next to this file).\n\n" + notice)
    with open(os.path.join(d0, "GPL-2.0.txt"), "wb") as fh:
        fh.write(pack.read("Source/GPL-2.0.txt"))
    print(f"instruments: harpsichord {keys[0]}-{keys[-1]}, {sum(len(b) for b in notes.values())} files in {len(BANKS)} banks, "
          f"{total / 1e6:.2f} MB; derived gains {gains}")


if __name__ == "__main__":
    process_instruments(sys.argv[1] if len(sys.argv) > 1 else None)
