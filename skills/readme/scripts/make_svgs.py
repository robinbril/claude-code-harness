#!/usr/bin/env python3
"""Generate README visuals (banner and step flows) as SVG with a light and a dark mode.

Usage: python3 make_svgs.py <spec.json> <output-dir>

The spec describes the images; see ../references/spec-voorbeeld.json. Each SVG carries
its own colours for light and dark mode, so it looks right on GitHub in both themes.
Standard library only.
"""
import json
import sys
from pathlib import Path
from xml.sax.saxutils import escape

FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif"
DEFAULT_COLORS = {
    "accent": "#5B50E6", "accent_dark": "#7C73FF", "gradient_end": "#2E2A8C",
    "card": "#F7F6FF", "card_stroke": "#DDD9FF", "line": "#A9A3F7", "line_dark": "#4D47A8",
}

ICONS = {
    "boek": '<path class="ico" d="M-11 -9h8a3 3 0 0 1 3 3v15a3 3 0 0 0-3-3h-8zM11 -9h-8a3 3 0 0 0-3 3v15a3 3 0 0 1 3-3h8z"/>',
    "blokken": '<rect class="ico" x="-11" y="-11" width="9" height="9" rx="2"/><rect class="ico" x="2" y="-11" width="9" height="9" rx="2"/>'
               '<rect class="ico" x="-11" y="2" width="9" height="9" rx="2"/><rect class="ico" x="2" y="2" width="9" height="9" rx="2"/>',
    "schild": '<path class="ico" d="M0 -12l10 4v6c0 7-4.5 11-10 13c-5.5-2-10-6-10-13v-6z"/><path class="ico" d="M-4 0l3 3l5-6"/>',
    "poort": '<path class="ico" d="M-11 11v-15M11 11v-15M-13 -6h26M-13 -1h26"/><path class="ico" d="M-11 -6l-2 -5M11 -6l2 -5"/>',
    "vraag": '<path class="ico" d="M-10 -9h20v13h-11l-6 5v-5h-3z"/>',
    "zoek": '<circle class="ico" cx="-2" cy="-2" r="7"/><path class="ico" d="M3 3l7 7"/>',
    "bewijs": '<rect class="ico" x="-9" y="-11" width="18" height="22" rx="3"/><path class="ico" d="M-4 1l3 3l5-6"/>',
    "plan": '<path class="ico" d="M-9 -8h18M-9 0h12M-9 8h7"/>',
    "bouw": '<path class="ico" d="M-10 10l9-9M3 -10l7 7l-4 4l-7-7z"/>',
    "glans": '<path class="ico" d="M0 -11l3 8l8 3l-8 3l-3 8l-3-8l-8-3l8-3z"/>',
    "fix": '<path class="ico" d="M-9 3a9 9 0 1 0 3-9"/><path class="ico" d="M-10 -10v5h5"/>',
    "check": '<circle class="ico" r="10"/><path class="ico" d="M-4 0l3 3l5-6"/>',
    "commit": '<circle class="ico" r="5"/><path class="ico" d="M-12 0h7M5 0h7"/>',
    "push": '<path class="ico" d="M0 10v-19M-7 -3l7-7l7 7"/>',
    "pr": '<circle class="ico" cx="-6" cy="-8" r="3"/><circle class="ico" cx="-6" cy="8" r="3"/><circle class="ico" cx="7" cy="8" r="3"/>'
          '<path class="ico" d="M-6 -5v10M7 5v-7a4 4 0 0 0-4-4h-3"/>',
    "venster": '<path class="ico" d="M-9 -6h18v14h-18zM-9 -1h18"/><path class="ico" d="M-4 4h3"/>',
    "download": '<path class="ico" d="M0 -10v14M-6 -2l6 6l6-6M-10 10h20"/>',
    "start": '<path class="ico" d="M-5 -9l13 9l-13 9z"/>',
}


def style(c):
    return f"""<style>
text{{font-family:{FONT}}}
.card{{fill:{c['card']};stroke:{c['card_stroke']};stroke-width:1.5}}
.hero{{fill:url(#g)}}
.t{{fill:#111827}}.m{{fill:#4B5563}}.w{{fill:#FFFFFF}}.wm{{fill:#E4E1FF}}
.acc{{fill:{c['accent']}}}
.line{{stroke:{c['line']};stroke-width:2.5;fill:none}}.arrow{{fill:{c['line']}}}
.ico{{stroke:#FFFFFF;stroke-width:2.4;fill:none;stroke-linecap:round;stroke-linejoin:round}}
@media (prefers-color-scheme: dark){{
.card{{fill:#161B22;stroke:#30363D}}
.t{{fill:#F0F6FC}}.m{{fill:#9DA7B3}}
.acc{{fill:{c['accent_dark']}}}
.line{{stroke:{c['line_dark']}}}.arrow{{fill:{c['line_dark']}}}
}}
</style>
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="{c['accent']}"/><stop offset="1" stop-color="{c['gradient_end']}"/></linearGradient></defs>"""


def text_width(s, size, weight=400):
    """Rough width estimate for a system sans font; good enough to catch overflow."""
    return len(s) * size * (0.56 if weight >= 600 else 0.48)


def check_fit(s, size, weight, room, where):
    if text_width(s, size, weight) > room:
        sys.exit(f"tekst te lang voor {where}: '{s}' ({int(text_width(s, size, weight))} > {int(room)} px); maak hem korter")


def text(x, y, s, cls, size, weight=400, anchor="start"):
    return (f'<text x="{x:.1f}" y="{y}" class="{cls}" font-size="{size}" font-weight="{weight}" '
            f'text-anchor="{anchor}">{escape(s)}</text>')


def icon(name):
    if name not in ICONS:
        sys.exit(f"onbekend icoon '{name}'; kies uit: {', '.join(sorted(ICONS))}")
    return ICONS[name]


def svg(w, h, body, title, c):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}" '
            f'role="img" aria-label="{escape(title)}"><title>{escape(title)}</title>{style(c)}{body}</svg>\n')


def banner(spec, c, w=1200, h=400):
    title = spec["title"]
    size = 52
    while text_width(title, size, 750) > w - 128 and size > 34:
        size -= 2
    check_fit(title, size, 750, w - 128, "de bannertitel")
    check_fit(spec["tagline"], 23, 400, w - 128, "de banner-ondertitel")
    b = [f'<clipPath id="c"><rect width="{w}" height="{h}" rx="28"/></clipPath>',
         f'<rect width="{w}" height="{h}" rx="28" class="hero"/>',
         '<g clip-path="url(#c)"><circle cx="1080" cy="40" r="170" fill="#FFFFFF" opacity="0.06"/>',
         '<circle cx="1150" cy="330" r="110" fill="#FFFFFF" opacity="0.05"/></g>',
         text(64, 108, title, "w", size, 750),
         text(64, 152, spec["tagline"], "wm", 23)]
    pillars = spec.get("pillars", [])
    n, gap, y = len(pillars), 24, 212
    cw = (w - 128 - (n - 1) * gap) / max(n, 1)
    for i, p in enumerate(pillars):
        x = 64 + i * (cw + gap)
        check_fit(p["title"], 24, 700, cw - 92, "een bannerblok")
        check_fit(p["text"], 17, 400, cw - 92, "een bannerblok")
        b.append(f'<rect x="{x:.1f}" y="{y}" width="{cw:.1f}" height="124" rx="18" fill="#FFFFFF" opacity="0.12"/>')
        b.append(f'<circle cx="{x + 46:.1f}" cy="{y + 62}" r="26" fill="#FFFFFF" opacity="0.18"/>')
        b.append(f'<g transform="translate({x + 46:.1f} {y + 62})">{icon(p["icon"])}</g>')
        b.append(text(x + 88, y + 56, p["title"], "w", 24, 700))
        b.append(text(x + 88, y + 86, p["text"], "wm", 17))
    return svg(w, h, "".join(b), spec.get("alt", title), c)


def flow(spec, c, w=1200):
    steps = spec["steps"]
    n, pad, gap = len(steps), 8, 40
    cw = (w - 2 * pad - (n - 1) * gap) / n
    ch = 150 + 24 * max(len(s.get("lines", [])) for s in steps)
    b = []
    for i, s in enumerate(steps):
        x = pad + i * (cw + gap)
        check_fit(s["title"], 21, 700, cw - 16, f"stap {i + 1} van {spec['file']}")
        b.append(f'<rect x="{x:.1f}" y="{pad}" width="{cw:.1f}" height="{ch}" rx="18" class="card"/>')
        b.append(f'<circle cx="{x + cw / 2:.1f}" cy="{pad + 52}" r="26" class="acc"/>')
        b.append(f'<g transform="translate({x + cw / 2:.1f} {pad + 52})">{icon(s["icon"])}</g>')
        b.append(text(x + cw / 2, pad + 112, s["title"], "t", 21, 700, "middle"))
        for j, line in enumerate(s.get("lines", [])):
            check_fit(line, 16, 400, cw - 16, f"stap {i + 1} van {spec['file']}")
            b.append(text(x + cw / 2, pad + 142 + 24 * j, line, "m", 16, 400, "middle"))
        if i < n - 1:
            ax, ay = x + cw + 6, pad + 52
            b.append(f'<path class="line" d="M{ax:.1f} {ay}h{gap - 18}"/>')
            b.append(f'<path class="arrow" d="M{ax + gap - 14:.1f} {ay - 7}l9 7l-9 7z"/>')
    return svg(w, ch + 2 * pad, "".join(b), spec.get("alt", spec["file"]), c)


def main():
    if len(sys.argv) != 3:
        sys.exit("gebruik: python3 make_svgs.py <spec.json> <output-map>")
    spec = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    out = Path(sys.argv[2])
    out.mkdir(parents=True, exist_ok=True)
    colors = {**DEFAULT_COLORS, **spec.get("colors", {})}
    written = []
    if "banner" in spec:
        (out / spec["banner"]["file"]).write_text(banner(spec["banner"], colors), encoding="utf-8")
        written.append(spec["banner"]["file"])
    for f in spec.get("flows", []):
        (out / f["file"]).write_text(flow(f, colors), encoding="utf-8")
        written.append(f["file"])
    print("geschreven:", ", ".join(written))


if __name__ == "__main__":
    main()
