"""Subset the faces Haven ships to the characters it actually renders.

Inter ships ~1.3 MB of Latin across four weights; the app renders English UI
text plus a handful of symbols. Subsetting takes each face from 343 KB to
~42 KB, removing about 1.1 MB from the Android APK and the web bundle.

    npm run fonts

The output files are committed, so a clean clone builds without Python.
"""

from pathlib import Path

from fontTools import subset

ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / "assets" / "fonts"

INTER_SOURCE = ROOT / "node_modules" / "@expo-google-fonts" / "inter"
INTER_WEIGHTS = ["400Regular", "500Medium", "600SemiBold", "700Bold"]

# Latin letters, digits, punctuation and the symbols the UI actually uses.
# Everything else falls back to the system font, so this list is the contract:
# add a character here before using it in a string.
UNICODE = (
    "U+0020-007E"  # printable ASCII
    "U+00A0-00FF"  # Latin-1: ° ± × é etc.
    "U+00B7"  # ·
    "U+2013-2014"  # – —
    "U+2018-201D"  # ' ' " "
    "U+2022"  # •
    "U+2026"  # …
    "U+20B9"  # ₹
    "U+2190-2193"  # ← ↑ → ↓
    "U+2212"  # −
    "U+2605"  # ★
    "U+2713"  # ✓
    "U+2715"  # ✕
)


def options() -> subset.Options:
    opts = subset.Options()
    # Kerning, ligatures and contextual alternates; the other ~60 features
    # (Arabic, Indic, vertical) are dead weight in a Latin subset.
    opts.layout_features = ["kern", "liga", "calt", "ccmp", "locl", "mark", "mkmk"]
    opts.notdef_outline = True
    return opts


def save(font, target: Path) -> None:
    opts = options()
    subsetter = subset.Subsetter(options=opts)
    subsetter.populate(unicodes=subset.parse_unicodes(UNICODE))
    subsetter.subset(font)
    subset.save_font(font, str(target), opts)
    print(f"{target.name}: {target.stat().st_size / 1024:.1f} KB")


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)

    for weight in INTER_WEIGHTS:
        source = INTER_SOURCE / weight / f"Inter_{weight}.ttf"
        save(subset.load_font(str(source), options()), OUTPUT / f"Inter_{weight}.ttf")



if __name__ == "__main__":
    main()
