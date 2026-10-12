#!/usr/bin/env python3
"""
Renders the level-up voice line, assets/audio/voice/levelup.wav:
    "YOU HAVE BECOME MORE POWERFUL ... BUT VELSCOUR STILL LIVES"

An arcade-cabinet style speech chip voice (think Sinistar): the same line is spoken three times by the MBROLA
us2 voice at different pitches (same timing, so they lock into a demonic unison), then ring-modulated and bit-crushed like
an 80s speech chip, and given a cavern echo. Stored as 8-bit 16 kHz mono PCM, which every
browser's decodeAudioData reads.

    apt-get install espeak-ng mbrola mbrola-us2
    pip install numpy
    python3 tools/levelup_voice.py
"""
import os
import subprocess
import tempfile
import wave

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'assets', 'audio', 'voice', 'levelup.wav')
SR = 16000
# SSML: a held beat after POWERFUL, then a slower, heavier second half. 'Vel scour' keeps the stress on VEL.
LINE = ('<speak><prosody rate="88%">You have become more <emphasis>powerful</emphasis>.</prosody>'
        '<break time="420ms"/><prosody rate="80%">But <emphasis>Vel scour</emphasis>, still lives.</prosody></speak>')


def tts(pitch):
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f:
        path = f.name
    subprocess.run(['espeak-ng', '-v', 'mb-us2', '-m', '-s', '128', '-p', str(pitch), '-a', '180',
                    '-w', path, LINE], check=True, capture_output=True)
    with wave.open(path) as w:
        sr = w.getframerate()
        x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float64) / 32768
    os.unlink(path)
    if sr != SR:
        x = np.interp(np.arange(0, len(x), sr / SR), np.arange(len(x)), x)
    return x


def delay(x, n):
    return np.concatenate([np.zeros(n), x])


def mix(*parts):
    n = max(len(p) for _, p in parts)
    out = np.zeros(n)
    for g, p in parts:
        out[:len(p)] += g * p
    return out


def onepole(x, a):
    """Cheap lowpass (a near 1 = darker)."""
    y = np.empty_like(x)
    acc = 0.0
    for i, v in enumerate(x):
        acc = a * acc + (1 - a) * v
        y[i] = acc
    return y


def main():
    lead = tts(38)            # the speaker
    low = tts(4)              # a sub-octave growl under it
    high = tts(72)            # a thin wail over it
    v = mix((1.0, lead), (0.6, delay(low, 40)), (0.16, delay(high, 110)))
    # ring modulation: the metallic, inhuman speech-chip edge
    t = np.arange(len(v)) / SR
    v = v * (0.85 + 0.15 * np.sin(2 * np.pi * 47 * t))
    # speech-chip crush: quantize to 7 bits (the 8-bit file adds the rest of the grit)
    v = v / (np.max(np.abs(v)) + 1e-9)
    v = np.round(v * 63) / 63
    # cabinet speaker: take off the harsh top a little
    v = onepole(v, 0.32)
    # cavern echo, each tap darker than the last (kept low: echo smears the words)
    tail = int(SR * 0.9)
    v = np.concatenate([v, np.zeros(tail)])
    wet = mix((0.2, delay(onepole(v, 0.7), int(SR * 0.21))), (0.12, delay(onepole(v, 0.85), int(SR * 0.43))),
              (0.07, delay(onepole(v, 0.92), int(SR * 0.66))))
    v = mix((1.0, v), (1.0, wet))
    # punch: soft clip, then trim silence and normalize
    v = np.tanh(v / (np.max(np.abs(v)) + 1e-9) * 1.6)
    on = np.nonzero(np.abs(v) > 0.02)[0]
    v = v[max(0, on[0] - 80):on[-1] + 400]
    v = v / np.max(np.abs(v)) * 0.95
    fade = min(len(v), 1600)
    v[-fade:] *= np.linspace(1, 0, fade)
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with wave.open(OUT, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(1)  # unsigned 8-bit PCM
        w.setframerate(SR)
        w.writeframes(np.clip(np.round(v * 127 + 128), 0, 255).astype(np.uint8).tobytes())
    print(f'{OUT}: {len(v) / SR:.2f} s, {os.path.getsize(OUT) // 1024} KB')


if __name__ == '__main__':
    main()
