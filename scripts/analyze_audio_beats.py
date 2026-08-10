#!/usr/bin/env python3
"""Detect deterministic audio onset frames using ffmpeg and Python's standard library."""

from __future__ import annotations

import argparse
import json
import math
import shutil
import statistics
import subprocess
import sys
from array import array
from pathlib import Path


DENSITY = {
    "sparse": {"threshold": 1.7, "refractory": 0.34},
    "standard": {"threshold": 1.15, "refractory": 0.22},
    "dense": {"threshold": 0.72, "refractory": 0.14},
}


def _decode_mono_pcm(
    audio_path: Path,
    start_seconds: float,
    duration_seconds: float,
    sample_rate: int = 16000,
) -> array:
    if shutil.which("ffmpeg") is None:
        raise RuntimeError("ffmpeg is required for audio analysis")

    command = [
        "ffmpeg",
        "-v",
        "error",
        "-ss",
        f"{start_seconds:.6f}",
        "-t",
        f"{duration_seconds:.6f}",
        "-i",
        str(audio_path),
        "-vn",
        "-ac",
        "1",
        "-ar",
        str(sample_rate),
        "-f",
        "s16le",
        "pipe:1",
    ]
    result = subprocess.run(command, check=True, capture_output=True)
    samples = array("h")
    samples.frombytes(result.stdout)
    if sys.byteorder != "little":
        samples.byteswap()
    if not samples:
        raise RuntimeError("ffmpeg decoded no audio samples")
    return samples


def _energy_envelope(samples: array, window: int = 1024, hop: int = 256) -> list[float]:
    energies: list[float] = []
    for offset in range(0, max(1, len(samples) - window), hop):
        block = samples[offset : offset + window]
        if not block:
            continue
        rms = math.sqrt(sum(sample * sample for sample in block) / len(block))
        energies.append(math.log1p(rms))
    return energies


def detect_beat_frames(
    audio_path: Path,
    *,
    start_seconds: float,
    duration_seconds: float,
    fps: int,
    density: str = "standard",
) -> list[int]:
    """Return sorted unique onset frames relative to the selected audio segment."""

    if density not in DENSITY:
        raise ValueError(f"unsupported density: {density}")
    if start_seconds < 0 or duration_seconds <= 0 or fps <= 0:
        raise ValueError("start must be >= 0; duration and fps must be positive")

    sample_rate = 16000
    hop = 256
    energies = _energy_envelope(
        _decode_mono_pcm(audio_path, start_seconds, duration_seconds, sample_rate),
        hop=hop,
    )
    if len(energies) < 8:
        return []

    smoothed = [
        statistics.fmean(energies[max(0, index - 1) : min(len(energies), index + 2)])
        for index in range(len(energies))
    ]
    flux = [0.0]
    flux.extend(max(0.0, smoothed[index] - smoothed[index - 1]) for index in range(1, len(smoothed)))

    local_radius = max(6, round(0.45 * sample_rate / hop))
    threshold = DENSITY[density]["threshold"]
    candidates: list[tuple[int, float]] = []
    for index in range(2, len(flux) - 2):
        local = flux[max(0, index - local_radius) : min(len(flux), index + local_radius + 1)]
        local_mean = statistics.fmean(local)
        local_std = statistics.pstdev(local) or 1e-9
        score = (flux[index] - local_mean) / local_std
        is_peak = flux[index] >= max(flux[index - 2 : index + 3])
        if is_peak and score >= threshold:
            candidates.append((index, score))

    refractory_frames = max(1, round(DENSITY[density]["refractory"] * sample_rate / hop))
    selected: list[tuple[int, float]] = []
    for candidate in candidates:
        if not selected or candidate[0] - selected[-1][0] >= refractory_frames:
            selected.append(candidate)
        elif candidate[1] > selected[-1][1]:
            selected[-1] = candidate

    total_frames = max(1, round(duration_seconds * fps))
    beat_frames = {
        round((index * hop / sample_rate) * fps)
        for index, _score in selected
    }
    return sorted(frame for frame in beat_frames if 0 < frame < total_frames)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("audio", type=Path)
    parser.add_argument("--start", type=float, default=0.0)
    parser.add_argument("--duration", type=float, required=True)
    parser.add_argument("--fps", type=int, default=30)
    parser.add_argument("--density", choices=tuple(DENSITY), default="standard")
    args = parser.parse_args()

    frames = detect_beat_frames(
        args.audio.expanduser().resolve(),
        start_seconds=args.start,
        duration_seconds=args.duration,
        fps=args.fps,
        density=args.density,
    )
    print(json.dumps({"beatFrames": frames}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
