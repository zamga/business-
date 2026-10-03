"""
Generates the BERGWEISS brand assets from source geometry and the licensed
Newsreader font (OFL), so the logo never depends on font loading.

Outputs
  public/brand/bergweiss-mark.svg        the braced frame
  public/brand/bergweiss-wordmark.svg    the wordmark, outlined
  public/brand/bergweiss-lockup.svg      mark + wordmark
  public/favicon.svg                     small-size mark with dark-mode colours
  src/components/brand/wordmark.ts       outline data for inline use

Run:  pip install fonttools brotli && python3 scripts/build-brand.py
"""
from pathlib import Path

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

ROOT = Path(__file__).resolve().parent.parent
FONT = ROOT / "src/assets/fonts/newsreader-display.woff2"
INK, REDLINE = "#0E1216", "#B23A22"
MINERAL, GLOW = "#F1EDE5", "#EF6A4B"

WORD = "BERGWEISS"
WEIGHT = 430          # within the 300-460 range shipped to the browser
TRACKING = 0.15       # em; architectural lettering is generously spaced

def fmt(v: float) -> str:
    return f"{v:.2f}".rstrip("0").rstrip(".")


# ---------------------------------------------------------------- wordmark --
font = instantiateVariableFont(TTFont(FONT), {"wght": WEIGHT}, updateFontNames=False)
upm = font["head"].unitsPerEm
cap = font["OS/2"].sCapHeight
glyphs = font.getGlyphSet()
cmap = font.getBestCmap()
hmtx = font["hmtx"]

paths, x = [], 0.0
names = [cmap[ord(ch)] for ch in WORD]
for i, name in enumerate(names):
    pen = SVGPathPen(glyphs, ntos=lambda n: fmt(round(n, 1)))
    # flip y: font units grow upwards, SVG grows downwards; baseline at y = cap
    glyphs[name].draw(TransformPen(pen, (1, 0, 0, -1, x, cap)))
    paths.append(pen.getCommands())
    advance = hmtx[name][0]
    x += advance + (TRACKING * upm if i < len(names) - 1 else 0)

# trim the side bearings so the outline box is optically exact
first_lsb = hmtx[names[0]][1]
last_name = names[-1]
last_rsb = hmtx[last_name][0] - (hmtx[last_name][1] + (glyphs[last_name].width - hmtx[last_name][1]))
bbox_min_x = first_lsb
width = x - bbox_min_x
word_d = " ".join(paths)


# measure real ink bounds for a tight viewBox
from fontTools.pens.boundsPen import BoundsPen  # noqa: E402

bx0, by0, bx1, by1 = 1e9, 1e9, -1e9, -1e9
xx = 0.0
for i, name in enumerate(names):
    bp = BoundsPen(glyphs)
    glyphs[name].draw(TransformPen(bp, (1, 0, 0, -1, xx, cap)))
    if bp.bounds:
        a, b, c, d = bp.bounds
        bx0, by0, bx1, by1 = min(bx0, a), min(by0, b), max(bx1, c), max(by1, d)
    xx += hmtx[name][0] + (TRACKING * upm if i < len(names) - 1 else 0)

vb_word = f"{fmt(bx0)} {fmt(by0)} {fmt(bx1 - bx0)} {fmt(by1 - by0)}"
word_w, word_h = bx1 - bx0, by1 - by0

# -------------------------------------------------------------------- mark --
# 100-unit grid. Five members with 4-unit joints: the mark is an assembly.
MEMBERS = {
    "beam": '<rect x="0" y="0" width="100" height="8"/>',
    "left": '<rect x="0" y="12" width="8" height="76"/>',
    "right": '<rect x="92" y="12" width="8" height="76"/>',
    "base": '<rect x="0" y="92" width="100" height="8"/>',
}
BRACE = '<rect x="0.5" y="46" width="99" height="8" transform="rotate(-45 50 50)"/>'


def mark_group(frame: str, brace: str) -> str:
    return f'<g fill="{frame}">{"".join(MEMBERS.values())}</g><g fill="{brace}">{BRACE}</g>'


mark_svg = (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" role="img" '
    'aria-label="BERGWEISS mark">' + mark_group(INK, REDLINE) + "</svg>\n"
)

# --------------------------------------------------------------- lockup --
# Mark height equals 1.9 x cap height; gap equals 0.9 x cap height.
scale = 100 / (cap * 1.9)
gap = cap * 0.9 * scale
word_scale = scale
lock_w = 100 + gap + word_w * word_scale
lock_h = 100
word_y = (100 - word_h * word_scale) / 2
lockup_svg = (
    f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {fmt(lock_w)} {fmt(lock_h)}" role="img" aria-label="BERGWEISS">'
    + mark_group(INK, REDLINE)
    + f'<g fill="{INK}" transform="translate({fmt(100 + gap)} {fmt(word_y)}) scale({word_scale:.5f}) translate({fmt(-bx0)} {fmt(-by0)})">'
    + f'<path d="{word_d}"/></g></svg>\n'
)

wordmark_svg = (
    f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb_word}" role="img" aria-label="BERGWEISS">'
    f'<path fill="{INK}" d="{word_d}"/></svg>\n'
)

# -------------------------------------------------------------- favicon --
# At 16-32 px the joints close up; heavier members keep the brace legible.
fav = (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-12 -12 124 124">'
    "<style>.f{fill:%s}.b{fill:%s}.bg{fill:%s}"
    "@media (prefers-color-scheme: dark){.f{fill:%s}.b{fill:%s}.bg{fill:%s}}</style>"
    '<rect class="bg" x="-12" y="-12" width="124" height="124" rx="10"/>'
    '<g class="f"><rect x="0" y="0" width="100" height="13"/><rect x="0" y="0" width="13" height="100"/>'
    '<rect x="87" y="0" width="13" height="100"/><rect x="0" y="87" width="100" height="13"/></g>'
    '<rect class="b" x="2" y="43.5" width="96" height="13" transform="rotate(-45 50 50)"/>'
    "</svg>\n"
) % (INK, REDLINE, MINERAL, MINERAL, GLOW, INK)

out = ROOT / "public/brand"
out.mkdir(parents=True, exist_ok=True)
(out / "bergweiss-mark.svg").write_text(mark_svg)
(out / "bergweiss-wordmark.svg").write_text(wordmark_svg)
(out / "bergweiss-lockup.svg").write_text(lockup_svg)
(ROOT / "public/favicon.svg").write_text(fav)

ts = (
    "// Generated by scripts/build-brand.py from Newsreader (SIL OFL 1.1). Do not edit.\n"
    f"export const wordmarkViewBox = '{vb_word}';\n"
    f"export const wordmarkAspect = {word_w / word_h:.5f};\n"
    f"export const wordmarkPath = '{word_d}';\n"
)
(ROOT / "src/components/brand/wordmark.ts").write_text(ts)
print(f"upm={upm} cap={cap} word={word_w:.0f}x{word_h:.0f} aspect={word_w / word_h:.3f}")
