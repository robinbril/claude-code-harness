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


def paren(echt, geschreven, uit, sleutel):
    e = {r["nr"]: r for r in json.load(open(echt))}
    g = {r["nr"]: r for r in json.load(open(geschreven))}
    random.seed(uit)
    antw, regels = {}, []
    for nr in sorted(set(e) & set(g)):
        a = random.random() < 0.5
        antw[nr] = "A" if a else "B"
        t = [e[nr]["tekst"], g[nr]["tekst"]]
        eerste, tweede = t if a else t[::-1]
        vorige = e[nr].get("vorige", "")[:150]
        regels.append(f"=== PAAR {nr} ===\n" + (f"(antwoord op: {vorige})\n" if vorige else "") + f"[A]\n{eerste}\n[B]\n{tweede}\n")
    open(uit, "w").write("\n".join(regels))
    json.dump(antw, open(sleutel, "w"))
    print(len(antw), "paren")


def score(sleutel, oordeel):
    s = json.load(open(sleutel))
    o = {str(r["nr"]): r for r in json.load(open(oordeel))}
    goed = sum(o[n]["mens"] == a for n, a in s.items() if n in o)
    n = sum(x in o for x in s)
    p = goed / n
    print(f"keurder herkent de mens in {goed}/{n} = {100 * p:.0f}% (± {196 * math.sqrt(p * (1 - p) / n):.0f}); 50% is niet te onderscheiden")
    for k, a in s.items():
        if k in o and o[k]["mens"] == a:
            print(f"  {k}: {o[k]['reden']}")


if __name__ == "__main__":
    {"paren": paren, "score": score}[sys.argv[1]](*sys.argv[2:])
