#!/usr/bin/env python3
"""Create a Remotion highlighted-keyword newspaper match-cut project."""

from __future__ import annotations

import argparse
import json
import shutil
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("destination", type=Path)
    parser.add_argument("--keyword", default="AGENT")
    parser.add_argument("--kicker", default="SOMETHING / HERE / HOME")
    parser.add_argument("--topic", default="UNDERSTANDING THE MODERN")
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
    parser.add_argument("--duration", type=int, default=75, help="Duration in frames")
    args = parser.parse_args()

    if args.width < 320 or args.height < 320 or args.fps < 1 or args.duration < 20:
        parser.error("width/height must be >= 320, fps >= 1, and duration >= 20 frames")
    for headline in args.headline or []:
        if headline.count("{{keyword}}") != 1:
            parser.error("each --headline must contain exactly one {{keyword}} marker")
    for body in args.body or []:
        if not body.strip():
            parser.error("--body cannot be empty")

    destination = args.destination.expanduser().resolve()
    if destination.exists() and any(destination.iterdir()):
        parser.error(f"destination is not empty: {destination}")

    template = Path(__file__).resolve().parents[1] / "assets" / "remotion-template"
    shutil.copytree(template, destination, dirs_exist_ok=True)

    root = destination / "src" / "Root.tsx"
    source = root.read_text(encoding="utf-8")
    replacements = {
        "__KEYWORD__": json.dumps(args.keyword, ensure_ascii=False)[1:-1],
        "__KICKER__": json.dumps(args.kicker, ensure_ascii=False)[1:-1],
        "__TOPIC__": json.dumps(args.topic, ensure_ascii=False)[1:-1],
        "__HEADLINE_TEMPLATES__": (
            json.dumps(args.headline, ensure_ascii=False)
            if args.headline
            else "DEFAULT_HEADLINE_TEMPLATES"
        ),
        "__BODY_PARAGRAPHS__": (
            json.dumps(args.body, ensure_ascii=False)
            if args.body
            else "DEFAULT_BODY_PARAGRAPHS"
        ),
        "__WIDTH__": str(args.width),
        "__HEIGHT__": str(args.height),
        "__FPS__": str(args.fps),
        "__DURATION__": str(args.duration),
    }
    for marker, value in replacements.items():
        source = source.replace(marker, value)
    root.write_text(source, encoding="utf-8")

    print(f"Created Remotion project: {destination}")
    print("Next: npm install && npm run typecheck && npm run studio")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
