"""
Reproducible font pipeline for BERGWEISS.

Source: OFL-licensed variable fonts from the @fontsource-variable npm packages
(Newsreader by Production Type, Archivo by Omnibus-Type), Latin subset.

Newsreader is only used at display sizes (>= 30px), so its optical-size axis
is pinned to a display master and its weight axis limited to the range the
type scale uses. Archivo keeps a narrow weight range for interface and body
text. This cuts transfer size by roughly two thirds without touching glyph
quality.

Run:  pip install fonttools brotli && python3 scripts/build-fonts.py
"""
from pathlib import Path

from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

ROOT = Path(__file__).resolve().parent.parent
NM = ROOT / "node_modules" / "@fontsource-variable"
OUT = ROOT / "src" / "assets" / "fonts"
OUT.mkdir(parents=True, exist_ok=True)

JOBS = [
    (NM / "newsreader/files/newsreader-latin-opsz-normal.woff2",
     OUT / "newsreader-display.woff2", {"opsz": 60, "wght": (300, 460)}),
    (NM / "newsreader/files/newsreader-latin-opsz-italic.woff2",
     OUT / "newsreader-display-italic.woff2", {"opsz": 60, "wght": (300, 400)}),
    (NM / "archivo/files/archivo-latin-wght-normal.woff2",
     OUT / "archivo.woff2", {"wght": (380, 620)}),
]

for src, dst, limits in JOBS:
    font = instantiateVariableFont(TTFont(src), limits, updateFontNames=False)
    font.flavor = "woff2"
    font.save(dst)
    print(f"{dst.name}: {src.stat().st_size / 1024:.1f} KB -> {dst.stat().st_size / 1024:.1f} KB")

# A single-glyph font: Newsreader's italic ampersand, used for every "&" set
# in Archivo (whose own ampersand reads ambiguously in "M&A").
from fontTools import subset  # noqa: E402

amp_src = instantiateVariableFont(
    TTFont(NM / "newsreader/files/newsreader-latin-opsz-italic.woff2"),
    {"opsz": 24, "wght": 420},
    updateFontNames=False,
)
opts = subset.Options()
opts.flavor = "woff2"
opts.layout_features = []
opts.name_IDs = ["*"]
sub = subset.Subsetter(options=opts)
sub.populate(unicodes=[0x26])
sub.subset(amp_src)
amp_src.flavor = "woff2"
amp_dst = OUT / "ampersand.woff2"
amp_src.save(amp_dst)
print(f"{amp_dst.name}: {amp_dst.stat().st_size / 1024:.1f} KB")
