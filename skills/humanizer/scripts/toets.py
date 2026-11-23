#!/usr/bin/env python3
"""Blinde paartoets: echt bericht tegen geschreven bericht.

  toets.py paren echt.json geschreven.json uit.txt sleutel.json   maakt A/B-paren in willekeurige volgorde
  toets.py score sleutel.json oordeel.json                        deel dat de keurder goed raadde, met marge

echt.json / geschreven.json: [{"nr":1,"tekst":"..."}]. oordeel.json: [{"nr":1,"mens":"A","reden":"..."}].
50% = niet te onderscheiden. 24 paren geven een marge van ongeveer 20 punten.
"""
import json
import math
import random
import sys


def lees(pad):
    return {str(r["nr"]): r for r in json.load(open(pad, encoding="utf-8"))}


def paren(echt, geschreven, uit, sleutel):
    e, g = lees(echt), lees(geschreven)
    if set(e) != set(g):
        sys.exit(f"nummers verschillen: {sorted(set(e) ^ set(g))}")
    random.seed(uit)
    antw, regels = {}, []
    for nr in sorted(e, key=lambda x: (len(x), x)):
        a = random.random() < 0.5
        antw[nr] = "A" if a else "B"
        eerste, tweede = (e[nr]["tekst"], g[nr]["tekst"]) if a else (g[nr]["tekst"], e[nr]["tekst"])
        vorige = e[nr].get("vorige", "")[:150]
        regels.append(f"=== PAAR {nr} ===\n" + (f"(antwoord op: {vorige})\n" if vorige else "") + f"[A]\n{eerste}\n[B]\n{tweede}\n")
    with open(uit, "w", encoding="utf-8") as f:
        f.write("\n".join(regels))
    with open(sleutel, "w", encoding="utf-8") as f:
        json.dump(antw, f)
    print(len(antw), "paren")


def score(sleutel, oordeel):
    s, o = json.load(open(sleutel, encoding="utf-8")), lees(oordeel)
    if not s or set(s) != set(o):
        sys.exit(f"oordelen kloppen niet met de sleutel: {sorted(set(s) ^ set(o))}")
    keus = {n: str(r["mens"]).strip().upper() for n, r in o.items()}
    fout = [n for n, k in keus.items() if k not in ("A", "B")]
    if fout:
        sys.exit(f"geen A of B bij {fout}")
    n = len(s)
    p = sum(keus[k] == a for k, a in s.items()) / n
    print(f"keurder herkent de mens in {round(p * n)}/{n} = {100 * p:.0f}% (± {196 * math.sqrt(p * (1 - p) / n):.0f}); 50% is niet te onderscheiden")
    for k, a in s.items():
        if keus[k] == a:
            print(f"  {k}: {o[k].get('reden', '')}")


if __name__ == "__main__":
    {"paren": paren, "score": score}[sys.argv[1]](*sys.argv[2:])
