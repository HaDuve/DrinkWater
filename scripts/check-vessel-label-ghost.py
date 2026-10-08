#!/usr/bin/env python3
"""
Fail if tiny dark goal-line ghost sits under vessel ml labels (animations on).

Cause signature: StrokedText absolute outline layers + adjustsFontSizeToFit leave a
mini dark "2000 ml" in the gap between the goal line and the sublabel.

Detects dark pixels in the mid-gap under the goal foam block (skips the first
few rows of legitimate large-glyph bottom outline).

Usage:
  python3 scripts/check-vessel-label-ghost.py <screenshot.png>

Exit 0 = clean, 1 = ghost detected (or bad input).
"""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image

# Mid-gap dark pixels under goal line (fixture ghost was ~250+; clean is 0).
GHOST_DARK_PX_MIN = 80


def is_dark(rgb: tuple[int, int, int]) -> bool:
    r, g, b = rgb
    return r < 70 and g < 70 and b < 90 and (r + g + b) < 180


def is_foamish(rgb: tuple[int, int, int]) -> bool:
    r, g, b = rgb
    return r > 170 and g > 190 and b > 210


def vessel_bands(im: Image.Image) -> list[Image.Image]:
    w, h = im.size
    cx = w // 2
    bands = [
        im.crop((cx - 180, h // 2 - 80, cx + 180, h // 2 + 100)),
        im.crop((cx - 220, int(h * 0.18), cx + 220, int(h * 0.42))),
        im.crop((cx - 200, int(h * 0.12), cx + 200, int(h * 0.36))),
    ]
    # Short / vessel-only crops (user bug screenshot). Skip on tall phone shots —
    # that window hits CTA / teaser foam-like pixels and false-positives.
    if h < 900:
        bands.append(im.crop((cx - 220, int(h * 0.30), cx + 220, int(h * 0.70))))
    return bands


def foam_blocks(band: Image.Image) -> list[tuple[int, int]]:
    w, h = band.size
    foam_counts: list[int] = []
    for y in range(h):
        foam = 0
        for x in range(w):
            if is_foamish(band.getpixel((x, y))):
                foam += 1
        foam_counts.append(foam)

    blocks: list[tuple[int, int]] = []
    start = None
    for y, foam in enumerate(foam_counts):
        if foam >= 40:
            if start is None:
                start = y
        elif start is not None:
            if y - start >= 8:
                blocks.append((start, y - 1))
            start = None
    if start is not None and h - start >= 8:
        blocks.append((start, h - 1))
    return blocks


def mid_gap_dark_px(band: Image.Image, goal_end: int, sub_start: int | None) -> int:
    """
    Dark pixels under the goal foam body, past the large-glyph bottom outline.

    +5.. skips most legitimate outline; ghost strokes still paint into this band.
    Clean screenshots are ~0–30 here; ghost fixtures are 100+.
    """
    w, h = band.size
    y0 = goal_end + 5
    y1 = min(goal_end + 19, h)
    if sub_start is not None:
        y1 = min(y1, max(y0, sub_start - 2))
    if y1 <= y0:
        return 0
    dark = 0
    for y in range(y0, y1):
        for x in range(40, max(40, w - 40)):
            if is_dark(band.getpixel((x, y))):
                dark += 1
    return dark


def detect_ghost(band: Image.Image) -> tuple[bool, str]:
    blocks = foam_blocks(band)
    # Need intake + goal foam bodies so we know which block is the ml line.
    if len(blocks) < 2:
        return False, f"need intake+goal foam blocks, got {blocks}"

    # intake / goal [/ sublabel] — goal is second block.
    goal_end = blocks[1][1]
    sub_start = blocks[2][0] if len(blocks) >= 3 else None

    dark = mid_gap_dark_px(band, goal_end, sub_start)
    if dark >= GHOST_DARK_PX_MIN:
        return True, f"ghost mid-gap under goal@{goal_end} dark_px={dark}"
    return False, f"mid-gap dark_px={dark} (goal@{goal_end})"


def main() -> int:
    if len(sys.argv) != 2:
        print("usage: check-vessel-label-ghost.py <screenshot.png>", file=sys.stderr)
        return 1
    path = Path(sys.argv[1])
    if not path.is_file():
        print(f"FAIL missing file: {path}", file=sys.stderr)
        return 1

    im = Image.open(path).convert("RGB")
    details: list[str] = []
    for i, band in enumerate(vessel_bands(im)):
        found, detail = detect_ghost(band)
        details.append(f"band{i}:{detail}")
        if found:
            print(f"FAIL ghost label text: {detail}")
            return 1
    print(f"OK no vessel label ghost ({'; '.join(details)})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
