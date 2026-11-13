"""Subset the faces Haven ships to the characters it actually renders.

Inter ships ~1.3 MB of Latin across four weights; the app renders English UI
text plus a handful of symbols. Subsetting takes each face from 343 KB to
~42 KB, removing about 1.1 MB from the Android APK and the web bundle.

Fraunces is the display face: headings only, so one roman and one italic
instance are enough. Its source is a variable font from the Google Fonts repo,
downloaded once into the ignored `.font-cache/` and instanced to the axes the
app draws with.

    npm run fonts

The output files are committed, so a clean clone builds without Python.
"""

import urllib.request
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / "assets" / "fonts"
CACHE = ROOT / ".font-cache"

INTER_SOURCE = ROOT / "node_modules" / "@expo-google-fonts" / "inter"
INTER_WEIGHTS = ["400Regular", "500Medium", "600SemiBold", "700Bold"]

FRAUNCES_URL = "https://raw.githubusercontent.com/google/fonts/main/ofl/fraunces/"
FRAUNCES_FACES = {
    "Fraunces[SOFT,WONK,opsz,wght].ttf": "Fraunces-600.ttf",
    "Fraunces-Italic[SOFT,WONK,opsz,wght].ttf": "Fraunces-600-Italic.ttf",
}
# Display sizes only, so `opsz` sits high; SOFT 100 is Fraunces' softest,
# warmest cut and WONK 0 keeps the letterforms calm.
FRAUNCES_AXES = {"wght": 600, "opsz": 72, "SOFT": 100, "WONK": 0}

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


def download(url: str, target: Path) -> Path:
    if target.exists():
        return target
    target.parent.mkdir(parents=True, exist_ok=True)
    print(f"downloading {url}")
    with urllib.request.urlopen(url) as response:
        target.write_bytes(response.read())
    return target


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)

    for weight in INTER_WEIGHTS:
        source = INTER_SOURCE / weight / f"Inter_{weight}.ttf"
        save(subset.load_font(str(source), options()), OUTPUT / f"Inter_{weight}.ttf")

    for remote, name in FRAUNCES_FACES.items():
        cached = download(FRAUNCES_URL + urllib.parse.quote(remote), CACHE / remote)
        variable = TTFont(str(cached))
        instance = instantiateVariableFont(variable, FRAUNCES_AXES, updateFontNames=True)
        save(instance, OUTPUT / name)


if __name__ == "__main__":
    main()
