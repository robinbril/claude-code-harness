#!/usr/bin/env python3
"""Bouwt een lokaal corpus van eigen teksten. Blijft op deze machine, buiten elke repo.

  corpus.py whatsapp export.txt [...] --naam "Naam in de export" --relatie werk
  corpus.py map <map met JJJJ-MM-DD*.txt> --register mail [--relatie collega]
  corpus.py schoon            zet teksten die een assistent eerder opstelde apart in corpus/weg/
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
import sys
from datetime import datetime

from kenmerken import meet, woorden

THUIS = os.path.expanduser(os.environ.get("HUMANIZER_HOME", "~/.local/share/humanizer"))
BEURT_SECONDEN = 150
ANTWOORD_SECONDEN = 24 * 3600
REEKS = 7
MAX_OVERLAP = 0.3
GEVOELIG = re.compile(r"\b(kanker|ziekenhuis|chemo|uitzaai\w*|diagnose|wachtwoord\w*|password\w*|iban|bsn)\b|\b[a-z]{2}\d{2}(?: ?[a-z0-9]{4}){3,}|\b(?:sk|ghp|gho|xox[bp])[-_][\w-]{8,}", re.I)
ENGELS = re.compile(r"\b(the|and|you|are|this|that|with|for|have|your|will|just|what|not|can|they)\b", re.I)
WA_REGEL = re.compile(r"^‎?\[?(\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}),? (\d{1,2}:\d{2})(?::\d{2})?\]?(?: -)? ([^:]{1,60}): (.*)$")
WA_KOP = re.compile(r"^‎?\[?\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4},? \d{1,2}:\d{2}")
CITAAT = re.compile(r"^(?:>|(?:Van|From|Verzonden|Sent):\s|-{2,} ?(?:Oorspronkelijk|Original|Doorgestuurd|Forwarded)|_{8,}|Begin doorgestuurd|Begin forwarded)", re.I)
CITAATKOP = re.compile(r"^(?:Op|On)\b.{4,}", re.I)
GESCHREVEN = re.compile(r"\b(?:schreef|geschreven|wrote)\b", re.I)
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
    return dict(id=hashlib.sha1(f"{register}|{relatie}|{tekst}".encode()).hexdigest()[:12], relatie=relatie, bron=bron, datum=datum,
                taal="en" if engels else "nl", soort=soort(tekst), berichten=berichten, vorige=vorige[:300], tekst=tekst)


def pad(register):
    return f"{THUIS}/corpus/{register}.jsonl"


def lees(register):
    return [json.loads(x) for x in open(pad(register), encoding="utf-8")] if os.path.exists(pad(register)) else []


def schrijf_bestand(doel, rs):
    """Eerst naast het doel, dan in één keer omwisselen: een onderbreking kost nooit het corpus."""
    os.makedirs(os.path.dirname(doel), mode=0o700, exist_ok=True)
    tijdelijk = doel + ".nieuw"
    with open(os.open(tijdelijk, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600), "w", encoding="utf-8") as f:
        f.writelines(json.dumps(r, ensure_ascii=False) + "\n" for r in rs)
    os.replace(tijdelijk, doel)


def schrijf(register, rs):
    schrijf_bestand(pad(register), rs)


def tekst_van(bestand):
    ruw = open(bestand, "rb").read()
    try:
        return ruw.decode("utf-8-sig")
    except UnicodeDecodeError:
        return ruw.decode("cp1252", errors="replace")


def bron(bestand):
    return hashlib.sha1(os.path.abspath(bestand).encode()).hexdigest()[:8]


def voeg_toe(register, nieuw):
    samen = {r["id"]: r for r in lees(register)}
    samen.update((r["id"], r) for r in nieuw)
    schrijf(register, samen.values())
    print(f"{register}: {len(nieuw)} ingelezen, {len(samen)} totaal")


def whatsapp(bestanden, naam, relatie):
    nieuw = []
    for bestand in bestanden:
        berichten = []
        for regel in tekst_van(bestand).splitlines():
            m = WA_REGEL.match(regel.rstrip("\n"))
            if m:
                d, u, wie, tekst = m.groups()
                dag, maand, jaar = re.split(r"[-/.]", d)
                if int(maand) > 12:
                    sys.exit(f"{bestand}: datum {d} is geen dag-maand-jaar")
                berichten.append([datetime(int(jaar) + (2000 if len(jaar) == 2 else 0), int(maand), int(dag), *map(int, u.split(":"))), wie.strip(), tekst])
            elif WA_KOP.match(regel):
                continue
            elif berichten:
                berichten[-1][2] += "\n" + regel.rstrip("\n")
        beurt, laatste, ander, ander_tijd, context = [], None, "", None, ""

        def sluit():
            t = "\n".join(beurt).strip()
            if len(woorden(t)) >= 2 and not GEVOELIG.search(t):
                nieuw.append(record("app", relatie, bron(bestand), laatste.strftime("%Y-%m-%d"), t, context, len(beurt)))

        for tijd, wie, tekst in berichten:
            eigen = wie == naam
            if beurt and (not eigen or (tijd - laatste).total_seconds() > BEURT_SECONDEN):
                sluit()
                beurt = []
            if eigen:
                if not WA_RUIS.search(tekst):
                    if not beurt:
                        vers = ander_tijd and (tijd - ander_tijd).total_seconds() <= ANTWOORD_SECONDEN
                        context = ander if vers else ""
                    beurt.append(tekst)
                    laatste = tijd
            else:
                ander, ander_tijd = ("" if GEVOELIG.search(tekst) else tekst), tijd
        if beurt:
            sluit()
    if not nieuw:
        sys.exit(f"geen berichten van '{naam}' herkend; controleer de naam en het exportformaat (dag-maand-jaar, 24 uur)")
    voeg_toe("app", nieuw)


def zonder_citaat(t):
    regels = t.splitlines()
    for i, r in enumerate(regels):
        if CITAAT.match(r.strip()) or (CITAATKOP.match(r.strip()) and GESCHREVEN.search(" ".join(regels[i:i + 3]))):
            return "\n".join(regels[:i]).strip()
    return t.strip()


def map_(dir_, register, relatie):
    nieuw, zonder_datum = [], 0
    for f in sorted(glob.glob(os.path.join(os.path.expanduser(dir_), "**", "*.txt"), recursive=True)):
        datum = re.match(r"\d{4}-\d{2}-\d{2}", os.path.basename(f))
        if not datum:
            zonder_datum += 1
            continue
        t = zonder_citaat(tekst_van(f))
        if len(woorden(t)) >= 12 and not GEVOELIG.search(t):
            nieuw.append(record(register, relatie, bron(f), datum.group(0), t))
    if zonder_datum:
        print(f"{zonder_datum} bestanden overgeslagen: de naam begint niet met JJJJ-MM-DD", file=sys.stderr)
    if not nieuw:
        sys.exit(f"geen JJJJ-MM-DD*.txt met 12 woorden of meer in {dir_}")
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


def assistent_teksten(gezocht):
    """Per gezochte reeks de vroegste dag waarop een assistent hem schreef."""
    eerste, regels = {}, 0
    for wortel in ("~/.claude/projects", "~/.codex/sessions", "~/.codex/archived_sessions"):
        for f in glob.iglob(os.path.expanduser(wortel) + "/**/*.jsonl", recursive=True):
            for regel in open(f, encoding="utf-8", errors="replace"):
                if '"assistant"' not in regel:
                    continue
                try:
                    d = json.loads(regel)
                except ValueError:
                    continue
                m = (d.get("message") or d.get("payload")) if isinstance(d, dict) else None
                dag = str(d.get("timestamp") or "")[:10] if isinstance(d, dict) else ""
                if not isinstance(m, dict) or m.get("role") != "assistant" or not dag:
                    continue
                regels += 1
                inhoud = m.get("content") if isinstance(m.get("content"), list) else [m.get("content")]
                for b in inhoud:
                    stuk = b if isinstance(b, str) else (b.get("text") or b.get("input")) if isinstance(b, dict) else None
                    for s in strings(stuk or ""):
                        for x in reeksen(s):
                            if x in gezocht and dag < eerste.get(x, "9999"):
                                eerste[x] = dag
    return eerste, regels


def schoon():
    registers = [os.path.basename(p)[:-6] for p in glob.glob(f"{THUIS}/corpus/*.jsonl")]
    alles = {(reg, r["id"]): reeksen(r["tekst"]) for reg in registers for r in lees(reg)}
    if not alles:
        sys.exit("geen corpus gevonden; er is niets gecontroleerd")
    eerste, regels = assistent_teksten({s for rs in alles.values() for s in rs})
    if not regels:
        sys.exit("geen transcripts van Claude Code of Codex gevonden; er is niets gecontroleerd")

    def opgesteld(reg, r):
        # alleen wat een assistent schreef vóór of op de dag van de tekst; later citeren telt niet
        x = alles[(reg, r["id"])]
        return bool(x) and sum(eerste.get(s, "9999") <= r["datum"] for s in x) / len(x) >= MAX_OVERLAP

    for reg in registers:
        rs = lees(reg)
        weg = [r for r in rs if opgesteld(reg, r)]
        if weg:
            apart = f"{THUIS}/corpus/weg/{reg}.jsonl"
            eerder = [json.loads(x) for x in open(apart, encoding="utf-8")] if os.path.exists(apart) else []
            schrijf_bestand(apart, {r["id"]: r for r in eerder + weg}.values())
            schrijf(reg, [r for r in rs if not opgesteld(reg, r)])
        print(f"{reg}: {len(weg)} door een assistent opgesteld, {len(rs) - len(weg)} over ({regels} assistentregels doorzocht)")


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
    if not b:
        sys.exit("te weinig teksten; bestaande banden blijven staan")
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
