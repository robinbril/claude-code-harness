#!/usr/bin/env python3
"""Bouwt een lokaal corpus van eigen teksten. Blijft op deze machine, buiten elke repo.

  corpus.py whatsapp export.txt [...] --naam "Naam in de export" --relatie werk
  corpus.py map <map met .txt> --register mail [--relatie collega]
  corpus.py schoon            haalt teksten weg die een assistent opstelde
  corpus.py banden            p10-p90 per register
"""
import argparse
import collections
import glob
import hashlib
import json
import os
import re
import statistics as st
from datetime import datetime

from kenmerken import meet, woorden

THUIS = os.path.expanduser(os.environ.get("MENSENTAAL_HOME", "~/.local/share/mensentaal"))
BEURT_SECONDEN = 150
REEKS = 7
MAX_OVERLAP = 0.3
GEVOELIG = re.compile(r"\b(kanker|ziekenhuis|chemo|uitzaai\w*|diagnose|wachtwoord|password|iban|bsn)\b|\bNL\d{2}[A-Z]{4}\d{6,}|sk-[a-z0-9]{8,}", re.I)
ENGELS = re.compile(r"\b(the|and|you|are|this|that|with|for|have|your|will|just|what|not|can|they)\b", re.I)
WA_REGEL = re.compile(r"^‎?\[?(\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}),? (\d{1,2}:\d{2})(?::\d{2})?\]?(?: -)? ([^:]{1,60}): (.*)$")
WA_RUIS = re.compile(r"‎|weggelaten|omitted|<Media|https?://|bericht is verwijderd|message was deleted", re.I)


def soort(t):
    k = t.lower()
    if "?" in t:
        return "vraag"
    if re.search(r"\b(sorry|excuses|mijn fout)\b", k):
        return "sorry"
    if re.search(r"\b(thanks|thx|dank|bedankt|merci)\b", k):
        return "dank"
    if re.search(r"\b(nee|kan niet|lukt niet|helaas|liever niet)\b", k):
        return "nee"
    if re.search(r"\b(morgen|vandaag|vanavond|straks|\d{1,2}[:.]\d{2}|(?:maan|dins|woens|donder|vrij|zater|zon)dag)\b", k):
        return "afspraak"
    return "update" if len(woorden(t)) >= 18 else "reactie"


def record(register, relatie, bron, datum, tekst, vorige="", berichten=1):
    engels = len(ENGELS.findall(tekst)) > 0.14 * max(1, len(woorden(tekst)))
    return dict(id=hashlib.sha1(f"{register}|{tekst}".encode()).hexdigest()[:12], relatie=relatie, bron=bron, datum=datum,
                taal="en" if engels else "nl", soort=soort(tekst), berichten=berichten, vorige=vorige[:300], tekst=tekst)


def pad(register):
    return f"{THUIS}/corpus/{register}.jsonl"


def lees(register):
    return [json.loads(x) for x in open(pad(register), encoding="utf-8")] if os.path.exists(pad(register)) else []


def schrijf(register, rs):
    os.makedirs(f"{THUIS}/corpus", mode=0o700, exist_ok=True)
    with open(os.open(pad(register), os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600), "w", encoding="utf-8") as f:
        f.writelines(json.dumps(r, ensure_ascii=False) + "\n" for r in rs)


def voeg_toe(register, nieuw):
    samen = {r["id"]: r for r in lees(register)}
    samen.update((r["id"], r) for r in nieuw)
    schrijf(register, samen.values())
    print(f"{register}: {len(nieuw)} ingelezen, {len(samen)} totaal")


def whatsapp(bestanden, naam, relatie):
    nieuw = []
    for nr, bestand in enumerate(bestanden):
        berichten = []
        for regel in open(bestand, encoding="utf-8"):
            m = WA_REGEL.match(regel.rstrip("\n"))
            if m:
                d, u, wie, tekst = m.groups()
                dag, maand, jaar = re.split(r"[-/.]", d)
                berichten.append([datetime(int(jaar) + (2000 if len(jaar) == 2 else 0), int(maand), int(dag), *map(int, u.split(":"))), wie.strip(), tekst])
            elif berichten:
                berichten[-1][2] += "\n" + regel.rstrip("\n")
        beurt, laatste, ander = [], None, ""

        def sluit():
            t = "\n".join(beurt).strip()
            if len(woorden(t)) >= 2 and not GEVOELIG.search(t):
                nieuw.append(record("app", relatie, f"chat{nr}", laatste.strftime("%Y-%m-%d"), t, ander, len(beurt)))

        for tijd, wie, tekst in berichten:
            eigen = wie == naam
            if beurt and (not eigen or (tijd - laatste).total_seconds() > BEURT_SECONDEN):
                sluit()
                beurt = []
            if eigen:
                if not WA_RUIS.search(tekst):
                    beurt.append(tekst)
                    laatste = tijd
            else:
                ander = tekst
        if beurt:
            sluit()
    voeg_toe("app", nieuw)


def map_(dir_, register, relatie):
    nieuw = []
    for f in sorted(glob.glob(os.path.join(os.path.expanduser(dir_), "**", "*.txt"), recursive=True)):
        t = re.split(r"\n(?:>|Op .{5,60} schreef|On .{5,60} wrote|-{3,}Orig)", open(f, encoding="utf-8").read())[0].strip()
        if len(woorden(t)) >= 12 and not GEVOELIG.search(t):
            nieuw.append(record(register, relatie, os.path.basename(f), datetime.fromtimestamp(os.path.getmtime(f)).strftime("%Y-%m-%d"), t))
    voeg_toe(register, nieuw)


def strings(o):
    if isinstance(o, str):
        yield o
    elif isinstance(o, dict):
        for v in o.values():
            yield from strings(v)
    elif isinstance(o, list):
        for v in o:
            yield from strings(v)


def reeksen(t):
    w = re.findall(r"\w+", t.lower())
    return [tuple(w[i:i + REEKS]) for i in range(len(w) - REEKS + 1)]


def schoon():
    registers = [os.path.basename(p)[:-6] for p in glob.glob(f"{THUIS}/corpus/*.jsonl")]
    alles = {(reg, r["id"]): reeksen(r["tekst"]) for reg in registers for r in lees(reg)}
    gezocht = {s for rs in alles.values() for s in rs}
    gevonden, bestanden = set(), 0
    for wortel in ("~/.claude/projects", "~/.codex/sessions", "~/.codex/archived_sessions"):
        for f in glob.iglob(os.path.expanduser(wortel) + "/**/*.jsonl", recursive=True):
            bestanden += 1
            for regel in open(f, encoding="utf-8", errors="replace"):
                if '"assistant"' not in regel:
                    continue
                try:
                    d = json.loads(regel)
                except ValueError:
                    continue
                m = d.get("message") or d.get("payload") or {}
                if not isinstance(m, dict) or m.get("role") != "assistant":
                    continue
                inhoud = m.get("content") if isinstance(m.get("content"), list) else [m.get("content")]
                for b in inhoud:
                    bron = b if isinstance(b, str) else (b.get("text") or b.get("input")) if isinstance(b, dict) else None
                    for s in strings(bron or ""):
                        gevonden.update(x for x in reeksen(s) if x in gezocht)
    for reg in registers:
        rs = lees(reg)
        houd = [r for r in rs if not (x := alles[(reg, r["id"])]) or sum(s in gevonden for s in x) / len(x) < MAX_OVERLAP]
        schrijf(reg, houd)
        print(f"{reg}: {len(rs) - len(houd)} door een assistent opgesteld, {len(houd)} over ({bestanden} transcripts doorzocht)")


def band(teksten):
    per = collections.defaultdict(list)
    for t in teksten:
        for k, v in meet(t).items():
            if v is not None:
                per[k].append(v)
    return {k: dict(p10=round(st.quantiles(v, n=10)[0], 2), p50=round(st.median(v), 2), p90=round(st.quantiles(v, n=10)[8], 2))
            for k, v in per.items() if len(v) >= 12}


def banden():
    b = {}
    app = [r for r in lees("app") if r["taal"] == "nl" and len(woorden(r["tekst"])) >= 12]
    groepen = {f"app-{x}": [r["tekst"] for r in app if r["relatie"] == x] for x in {r["relatie"] for r in app}}
    groepen["mail"] = [r["tekst"] for r in lees("mail") if r["taal"] == "nl" and len(woorden(r["tekst"])) >= 20]
    for naam, ts in groepen.items():
        if len(ts) >= 12:
            b[naam] = dict(teksten=len(ts), kenmerken=band(ts))
        else:
            print(f"{naam}: {len(ts)} teksten, minstens 12 nodig")
    os.makedirs(THUIS, mode=0o700, exist_ok=True)
    with open(f"{THUIS}/banden.json", "w", encoding="utf-8") as f:
        json.dump(b, f, indent=1)
    print({k: v["teksten"] for k, v in b.items()})


def main():
    a = argparse.ArgumentParser()
    s = a.add_subparsers(dest="wat", required=True)
    w = s.add_parser("whatsapp")
    w.add_argument("bestanden", nargs="+")
    w.add_argument("--naam", required=True)
    w.add_argument("--relatie", default="vriend")
    m = s.add_parser("map")
    m.add_argument("map")
    m.add_argument("--register", choices=["mail", "app"], default="mail")
    m.add_argument("--relatie", default="onbekend")
    s.add_parser("schoon")
    s.add_parser("banden")
    o = a.parse_args()
    if o.wat == "whatsapp":
        whatsapp(o.bestanden, o.naam, o.relatie)
    elif o.wat == "map":
        map_(o.map, o.register, o.relatie)
    else:
        {"schoon": schoon, "banden": banden}[o.wat]()


if __name__ == "__main__":
    main()
