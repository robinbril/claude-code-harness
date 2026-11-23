#!/usr/bin/env python3
"""Legt een tekst naast de gemeten menselijke bandbreedte van hetzelfde register.

  meet.py --register artikel|essay|vakblog|mail|app-<relatie> [bestand]   (zonder bestand: stdin)

Een waarde buiten p10-p90 is een vraag, geen fout. Los alleen op wat in de kolom 'richting' de
machinekant heet, en stop daarna: doorschieten voorbij de menskant valt net zo hard op.
"""
import argparse
import json
import os
import re
import sys

import kenmerken as K
from corpus import THUIS

# Kant waar modeltekst zit: +1 = te hoog is machine, -1 = te laag is machine. Gemeten op Nederlands
# uit 2026, niet overgenomen uit Engelse lijsten: modellen schrijven nu juist te kaal en te kort.
MACHINEKANT = {
    "artikel": {"woordlengte": -1, "lange_woorden_pct": -1, "kale_woorden": 1, "zinnen_vanaf_25_woorden_pct": -1,
                "alinea_spreiding": -1, "namen": -1, "getallen": -1, "haakjes": -1, "zinslengte_spreiding": -1,
                "contrastformule": 1, "drieslag": 1, "ai_woorden": 1, "gedachtestreep": 1},
    "mail": {"zinslengte_spreiding": -1, "partikels": -1, "naamwoordstijl": 1, "dubbelepunt": 1, "drieslag": 1,
             "ai_woorden": 1, "gedachtestreep": 1, "contrastformule": 1, "woorden_per_regel": 1},
    "app": {"partikels": -1, "spreektaal": -1, "regel_zonder_eindpunt_pct": -1, "regel_kleine_letter_pct": -1,
            "woorden_per_regel": 1, "zinslengte_mediaan": 1, "dubbelepunt": 1, "gedachtestreep": 1, "puntkomma": 1,
            "drieslag": 1, "ai_woorden": 1, "lange_woorden_pct": 1, "naamwoordstijl": 1, "contrastformule": 1},
}
PER_REGISTER_NEGEREN = {
    "app": {"alinea_spreiding", "haakjes", "puntkomma", "namen", "getallen", "woordvariatie", "ik", "jij", "vraagzinnen_pct"},
    "mail": {"ik", "jij", "vraagzinnen_pct", "woordvariatie", "regel_kleine_letter_pct", "alinea_spreiding", "herhaalde_opener_pct"},
    "artikel": {"ik", "jij", "spreektaal", "regel_kleine_letter_pct", "regel_zonder_eindpunt_pct", "emoji", "uitroep", "woorden_per_regel", "vraagzinnen_pct"},
}


def vondsten(t):
    for naam, rx in (("contrastformule", K.CONTRAST), ("drieslag", K.DRIESLAG), ("aanhangzin", K.AANHANG),
                     ("AI-woord", K.AI_WOORD), ("uitsmijter", K.PUNCHLINE)):
        for m in rx.finditer(t):
            yield naam, re.sub(r"\s+", " ", m.group(0))[:90]


def gelijkmatig(t):
    z = K.zinnen(t)
    lengtes = [len(K.woorden(x)) for x in z]
    for i in range(len(lengtes) - 3):
        stuk = lengtes[i:i + 4]
        if min(stuk) >= 7 and max(stuk) - min(stuk) <= 4:
            yield z[i][:60], stuk


def main():
    a = argparse.ArgumentParser()
    a.add_argument("--register", required=True)
    a.add_argument("bestand", nargs="?")
    a.add_argument("--alles", action="store_true")
    o = a.parse_args()
    t = (open(o.bestand, encoding="utf-8").read() if o.bestand else sys.stdin.read()).strip()
    banden = {}
    for pad in (os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "banden.json"), os.path.join(THUIS, "banden.json")):
        if os.path.exists(pad):
            banden.update(json.load(open(pad, encoding="utf-8")))
    if o.register not in banden or not banden[o.register]["kenmerken"]:
        sys.exit(f"onbekend of leeg register: {o.register}; keuze: {', '.join(k for k, v in banden.items() if v['kenmerken'])}")
    b, m, n = banden[o.register], K.meet(t), len(K.woorden(t))
    basis = o.register.split("-")[0]
    basis = "artikel" if basis in ("essay", "vakblog") else basis
    negeer = PER_REGISTER_NEGEREN[basis]
    if not n:
        sys.exit("lege tekst")
    print(f"{n} woorden, register {o.register}, vergeleken met {b['teksten']} menselijke teksten")
    if n < 40:
        print("onder 40 woorden: percentages zeggen weinig, gebruik alleen de vondsten hieronder")
    binnen = totaal = 0
    for k, v in m.items():
        band = b["kenmerken"].get(k)
        if band is None or v is None or k in negeer:
            continue
        totaal += 1
        marge = 0.15 * max(abs(band["p90"] - band["p10"]), 0.02)
        if band["p10"] - marge <= v <= band["p90"] + marge:
            binnen += 1
            if o.alles:
                print(f"  ok        {k:30} {v:8.2f}   [{band['p10']} .. {band['p90']}]")
            continue
        kant = 1 if v > band["p90"] else -1
        mk = MACHINEKANT[basis].get(k, 0)
        richting = "MACHINE" if kant == mk else ("doorschot" if mk else "anders")
        if richting == "doorschot" and (band["p90"] == 0 or k in ("getallen", "namen")):
            continue  # zeldzaam kenmerk, of gewoon een stuk vol feiten
        if n < 40 and richting != "MACHINE":
            continue
        print(f"  {richting:9} {k:30} {v:8.2f}   [{band['p10']} .. {band['p90']}], mediaan {band['p50']}")
    print(f"{binnen}/{totaal} binnen de menselijke band")
    for naam, s in vondsten(t):
        print(f"  vondst    {naam}: {s}")
    for kop, stuk in gelijkmatig(t):
        print(f"  metronoom vier zinnen van {stuk} woorden vanaf: {kop}")


if __name__ == "__main__":
    main()
