"""Render logo candidates as 1024px PNGs plus one contact sheet.

Each candidate is a 1024x1024 SVG with a full-bleed background, so it is
already in the shape `scripts/build-icons.mjs` expects: drop the winner into
`assets/icons/` and run `npm run icons`.

    python scripts/logo-samples.py
"""

from pathlib import Path

# Kept identical to the app's plum/pink so a sample looks like the real icon.
BG = "#1A1020"
PINK = "#FF6E9C"

HEAD = (
    '<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" '
    'viewBox="0 0 1024 1024">'
    f'<rect width="1024" height="1024" fill="{BG}"/>'
)
TAIL = "</svg>"

SAMPLES = {
    # A — a doorway. Shelter, drawn as one even stroke.
    "A-arch": (
        f'<path d="M 272 736 V 496 A 240 240 0 0 1 752 496 V 736" fill="none" '
        f'stroke="{PINK}" stroke-width="104" stroke-linecap="round"/>'
    ),
    # B — the same arch, but with a figure resting inside it.
    "B-arch-figure": (
        f'<path d="M 272 736 V 496 A 240 240 0 0 1 752 496 V 736" fill="none" '
        f'stroke="{PINK}" stroke-width="104" stroke-linecap="round"/>'
        f'<circle cx="512" cy="612" r="72" fill="{PINK}"/>'
    ),
    # C — a heart built from two circles and a point, not a smooth blob.
    "C-heart-geo": (
        f'<path d="M 512 812 L 246 546 A 190 190 0 1 1 512 372 '
        f'A 190 190 0 1 1 778 546 Z" fill="{PINK}"/>'
    ),
    # D — a day beginning: a dome over a horizon.
    "D-sunrise": (
        f'<path d="M 232 648 A 280 280 0 0 1 792 648 Z" fill="{PINK}"/>'
        f'<rect x="352" y="720" width="320" height="56" rx="28" fill="{PINK}"/>'
    ),
    # E — a ribbon: a place held open.
    "E-ribbon": (
        f'<path d="M 400 232 H 624 A 48 48 0 0 1 672 280 V 792 L 512 656 '
        f'L 352 792 V 280 A 48 48 0 0 1 400 232 Z" fill="{PINK}"/>'
    ),
    # F — arches receding into each other.
    "F-nested": (
        f'<path d="M 208 784 V 520 A 304 304 0 0 1 816 520 V 784" fill="none" '
        f'stroke="{PINK}" stroke-width="72" stroke-linecap="round"/>'
        f'<path d="M 344 784 V 552 A 168 168 0 0 1 680 552 V 784" fill="none" '
        f'stroke="{PINK}" stroke-width="72" stroke-linecap="round"/>'
    ),
}


def main() -> None:
    out = Path(__file__).resolve().parent.parent / "assets" / "logo-samples"
    out.mkdir(parents=True, exist_ok=True)
    for name, body in SAMPLES.items():
        (out / f"{name}.svg").write_text(HEAD + body + TAIL, encoding="utf-8")
        print(f"{name}.svg")


if __name__ == "__main__":
    main()
