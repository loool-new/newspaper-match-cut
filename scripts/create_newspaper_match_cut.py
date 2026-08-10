#!/usr/bin/env python3
"""Create a Remotion highlighted-keyword newspaper match-cut project."""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
from pathlib import Path

from analyze_audio_beats import detect_beat_frames


def get_audio_duration(audio_path: Path) -> float:
    if shutil.which("ffprobe") is None:
        raise RuntimeError("ffprobe is required when --audio is used")
    result = subprocess.run(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
            str(audio_path),
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    return float(result.stdout.strip())


def render_audio_segment(
    audio_path: Path,
    output_path: Path,
    start_seconds: float,
    duration_seconds: float,
) -> None:
    if shutil.which("ffmpeg") is None:
        raise RuntimeError("ffmpeg is required when --audio is used")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        [
            "ffmpeg",
            "-v",
            "error",
            "-y",
            "-ss",
            f"{start_seconds:.6f}",
            "-t",
            f"{duration_seconds:.6f}",
            "-i",
            str(audio_path),
            "-vn",
            "-c:a",
            "libmp3lame",
            "-q:a",
            "2",
            str(output_path),
        ],
        check=True,
    )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("destination", type=Path)
    parser.add_argument("--language", choices=("zh", "en"), default="en")
    parser.add_argument("--keyword")
    parser.add_argument("--kicker")
    parser.add_argument("--topic")
    parser.add_argument(
        "--headline",
        action="append",
        help="Complete headline containing exactly one {{keyword}} marker; repeat for multiple editions",
    )
    parser.add_argument(
        "--body",
        action="append",
        help="Complete body paragraph; repeat for multiple editions",
    )
    parser.add_argument("--width", type=int, default=1080)
    parser.add_argument("--height", type=int, default=1920)
    parser.add_argument("--fps", type=int, default=30)
    parser.add_argument("--duration", type=int, help="Composition duration in frames")
    parser.add_argument("--timing-mode", choices=("fixed", "beats"))
    parser.add_argument("--audio", type=Path)
    parser.add_argument("--audio-start", type=float, default=0.0)
    parser.add_argument("--audio-duration", type=float)
    parser.add_argument(
        "--beat-density",
        choices=("sparse", "standard", "dense"),
        default="standard",
    )
    parser.add_argument(
        "--beat-frame",
        action="append",
        type=int,
        help="Manual beat frame; repeat to override automatic beat detection",
    )
    args = parser.parse_args()

    if args.width < 320 or args.height < 320 or args.fps < 1:
        parser.error("width/height must be >= 320 and fps must be >= 1")
    if args.duration is not None and args.duration < 20:
        parser.error("--duration must be at least 20 frames")
    if args.audio_start < 0:
        parser.error("--audio-start must be >= 0")
    if args.audio_duration is not None and args.audio_duration <= 0:
        parser.error("--audio-duration must be positive")
    for headline in args.headline or []:
        if headline.count("{{keyword}}") != 1:
            parser.error("each --headline must contain exactly one {{keyword}} marker")
    for body in args.body or []:
        if not body.strip():
            parser.error("--body cannot be empty")

    audio_path = args.audio.expanduser().resolve() if args.audio else None
    if audio_path and not audio_path.is_file():
        parser.error(f"audio file does not exist: {audio_path}")

    timing_mode = args.timing_mode or ("beats" if audio_path or args.beat_frame else "fixed")
    if timing_mode == "beats" and not audio_path and not args.beat_frame:
        parser.error("beats timing requires --audio or at least one --beat-frame")

    audio_segment_duration = 0.0
    if audio_path:
        source_duration = get_audio_duration(audio_path)
        if args.audio_start >= source_duration:
            parser.error("--audio-start is outside the audio file")
        available_duration = source_duration - args.audio_start
        audio_segment_duration = min(args.audio_duration or available_duration, available_duration)

    duration_frames = args.duration or (
        max(20, round(audio_segment_duration * args.fps))
        if audio_path
        else 75
    )
    audio_segment_duration = min(audio_segment_duration, duration_frames / args.fps)

    if args.beat_frame:
        beat_frames = sorted({frame for frame in args.beat_frame if 0 < frame < duration_frames})
    elif timing_mode == "beats" and audio_path:
        beat_frames = detect_beat_frames(
            audio_path,
            start_seconds=args.audio_start,
            duration_seconds=audio_segment_duration,
            fps=args.fps,
            density=args.beat_density,
        )
    else:
        beat_frames = []

    if timing_mode == "beats" and not beat_frames:
        parser.error(
            "no beat frames were found; try --beat-density dense or provide --beat-frame values"
        )

    destination = args.destination.expanduser().resolve()
    if destination.exists() and any(destination.iterdir()):
        parser.error(f"destination is not empty: {destination}")

    template = Path(__file__).resolve().parents[1] / "assets" / "remotion-template"
    shutil.copytree(template, destination, dirs_exist_ok=True)

    audio_src = ""
    if audio_path:
        audio_src = "audio/source.mp3"
        render_audio_segment(
            audio_path,
            destination / "public" / audio_src,
            args.audio_start,
            audio_segment_duration,
        )

    language_defaults = {
        "zh": {"keyword": "焦点", "kicker": "创作实验室", "topic": "现代创作"},
        "en": {
            "keyword": "AGENT",
            "kicker": "SOMETHING / HERE / HOME",
            "topic": "UNDERSTANDING THE MODERN",
        },
    }[args.language]
    keyword = args.keyword or language_defaults["keyword"]
    kicker = args.kicker or language_defaults["kicker"]
    topic = args.topic or language_defaults["topic"]
    default_headlines = (
        "DEFAULT_HEADLINE_TEMPLATES_ZH"
        if args.language == "zh"
        else "DEFAULT_HEADLINE_TEMPLATES"
    )
    default_bodies = (
        "DEFAULT_BODY_PARAGRAPHS_ZH"
        if args.language == "zh"
        else "DEFAULT_BODY_PARAGRAPHS"
    )

    root = destination / "src" / "Root.tsx"
    source = root.read_text(encoding="utf-8")
    replacements = {
        "__LANGUAGE__": args.language,
        "__KEYWORD__": json.dumps(keyword, ensure_ascii=False)[1:-1],
        "__KICKER__": json.dumps(kicker, ensure_ascii=False)[1:-1],
        "__TOPIC__": json.dumps(topic, ensure_ascii=False)[1:-1],
        "__HEADLINE_TEMPLATES__": (
            json.dumps(args.headline, ensure_ascii=False)
            if args.headline
            else default_headlines
        ),
        "__BODY_PARAGRAPHS__": (
            json.dumps(args.body, ensure_ascii=False)
            if args.body
            else default_bodies
        ),
        "__TIMING_MODE__": timing_mode,
        "__BEAT_FRAMES__": json.dumps(beat_frames),
        "__AUDIO_SRC__": audio_src,
        "__AUDIO_DURATION__": f"{audio_segment_duration:.6f}",
        "__WIDTH__": str(args.width),
        "__HEIGHT__": str(args.height),
        "__FPS__": str(args.fps),
        "__DURATION__": str(duration_frames),
    }
    for marker, value in replacements.items():
        source = source.replace(marker, value)
    root.write_text(source, encoding="utf-8")

    print(f"Created Remotion project: {destination}")
    print(f"Timing: {timing_mode}; beat frames: {beat_frames}")
    if audio_path:
        print(f"Audio segment: {args.audio_start:.3f}s–{args.audio_start + audio_segment_duration:.3f}s")
    print("Next: npm install && npm run typecheck && npm run studio")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
