#!/usr/bin/env python3
"""Haalt eigen teksten op die lijken op wat er nu geschreven moet worden.

  voorbeelden.py --register app --relatie werk --soort vraag --over "planning van vrijdag" --woorden 25 -n 5

Gebruik ze als klank: neem geen namen of feiten over en citeer ze nergens.
"""
import argparse
import collections
import math
import random
import re
import sys

from corpus import lees

STOP = set("de het een en van ik je dat die in is op te met voor aan er niet als maar om ook zijn was bij wat heb nog of hij ze we dan".split())


def tok(t):
    return [w for w in re.findall(r"[a-zà-ÿ0-9]+", t.lower()) if w not in STOP]


def main():
    a = argparse.ArgumentParser()
    a.add_argument("--register", choices=["app", "mail"], required=True)
    a.add_argument("--relatie")
    a.add_argument("--soort")
    a.add_argument("--over", default="")
    a.add_argument("--woorden", type=int, help="verwachte lengte")
    a.add_argument("--taal", choices=["nl", "en"], default="nl")
    a.add_argument("--zonder", default="", help="ids die niet meedoen, komma-gescheiden (voor toetsen)")
    a.add_argument("-n", type=int, default=5)
    o = a.parse_args()
    weg = set(o.zonder.split(","))
    rs = [r for r in lees(o.register) if r["id"] not in weg and r["taal"] == o.taal]
    if not rs:
        sys.exit(f"geen corpus voor {o.register}; bouw het met corpus.py")
    q = tok(o.over)
    df = collections.Counter(w for r in rs for w in set(tok(r["tekst"])))
    random.seed(len(o.over))

    def score(r):
        w = collections.Counter(tok(r["tekst"]))
        # klank telt zwaarder dan onderwerp
        s = sum(math.log(1 + len(rs) / (1 + df[x])) * w[x] / (w[x] + 1) for x in q) / (3 + 2 * len(q) ** 0.5)
        s += 1.6 * (r["relatie"] == o.relatie) + 1.6 * (r["soort"] == o.soort)
        n = len(r["tekst"].split())
        if o.woorden:
            s -= 1.2 * abs(math.log((n + 3) / (o.woorden + 3)))
        elif n < 6 or n > 140:
            s -= 2
        return s + random.random() * 0.4

    per_bron, getoond = collections.Counter(), 0
    for r in sorted(rs, key=score, reverse=True):
        if o.register == "app" and per_bron[r["bron"]] >= max(2, o.n // 2):
            continue
        per_bron[r["bron"]] += 1
        getoond += 1
        los = f" / {r['berichten']} losse berichten" if r["berichten"] > 1 else ""
        print(f"--- {r['soort']} / {r['relatie']} / {r['datum'][:7]}{los}")
        if r["vorige"]:
            print("   (antwoord op: " + r["vorige"].replace("\n", " ")[:140] + ")")
        print(r["tekst"])
        if getoond == o.n:
            break


if __name__ == "__main__":
    main()
