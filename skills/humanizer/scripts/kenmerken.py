"""Telbare stijlkenmerken van een Nederlandse tekst. Alleen standaardbibliotheek."""
import re
import statistics as st

PARTIKELS = set("even effe ff eens gewoon gwn eigenlijk wel toch maar nou nog al ook dan hoor best misschien anders vast denk zeg".split())
KAAL = set("heel echt erg super goed leuk mooi fijn gek raar slecht stom groot klein vaak veel weinig soms bijna meestal doen gaan komen krijgen zeggen denken vinden kijken zitten staan maken hebben ding dingen iets iemand".split())
SPREEK = re.compile(r"(?<!\w)('t|'m|'n|'s|zo'n|z'n|m'n|da's|mn|zn|ff|gwn|svp|sws|idd|btw|iig|wss|hem|ie)(?!\w)", re.I)
NAAMWOORDSTIJL = re.compile(r"\b\w{4,}(?:atie|ering|heid|iteit|isme|teit|ingen|aties|eringen|heden)\b", re.I)
AANHANG = re.compile(r", (?:waardoor|waarbij|waarmee|wat (?:zorgt|leidt|betekent|resulteert)|zodat|om zo|met als)\b", re.I)
CONTRAST = re.compile(r"\bniet (?:alleen|slechts|zozeer)\b[^.!?\n]{2,90}\bmaar\b|\b(?:is|gaat|draait|zijn) (?:het )?niet\b[^.!?\n]{2,70}(?:, maar|\. (?:Het|Dat|Dit) (?:is|gaat|draait))", re.I)
DRIESLAG = re.compile(r"\b[a-zà-ÿ'-]+, (?:[a-zà-ÿ'-]+ )?[a-zà-ÿ'-]+,? (?:en|of) (?:[a-zà-ÿ'-]+ )?[a-zà-ÿ'-]+(?=[.,;!?)\s])")
BRUG = re.compile(r"^(?:daarnaast|bovendien|daarom|echter|kortom|tegelijkertijd|daarbij|hierdoor|daardoor|vervolgens|uiteindelijk|allereerst|ten slotte|tot slot|desondanks|niettemin|juist|precies|zo)\b", re.I)
AI_WOORD = re.compile(r"\b(?:cruciaal|cruciale|essentieel|essenti[eë]le|naadloos|naadloze|robuust|robuuste|waardevol(?:le)?|diepgaand\w*|veelzijdig\w*|aanzienlijk\w*|krachtig\w*|innovatie\w*|optimalis\w+|facilit\w+|stroomlijn\w*|benadruk\w+|onderstre\w+|landschap|ecosysteem|reis|gamechanger|fundamenteel|fundamentele|holistisch\w*|toekomstbestendig\w*|duik(?:en)? in|ontgrendel\w*|empower\w*|inzicht(?:en)?|uitdaging(?:en)?|essentie|spil|hoeksteen|speelt een (?:belangrijke|cruciale|grote) rol|breed scala|in een wereld|in de wereld van|in het hart van|het resultaat\?|de waarheid\?|eerlijk is eerlijk|de kern|stil(?:le|letjes)?)\b", re.I)
EMOJI = re.compile("[\U0001F000-\U0001FAFF☀-➿❤]")
PUNCHLINE = re.compile(r"(?:^|(?<=[.!?]) )(?:Dat is (?:het|de) \w+|En dat is precies|Punt|Elke keer|Niet meer, niet minder|Meer niet|Zo simpel is het)[.!]", re.M)


def zinnen(t):
    t = re.sub(r"https?://\S+", "LINK", t)
    uit = []
    for regel in t.split("\n"):
        regel = regel.strip()
        if regel:
            uit += [z for z in re.split(r"(?<=[.!?…])[\"'”’)]*\s+", regel) if re.search(r"\w", z)]
    return uit


def woorden(t):
    return re.findall(r"[A-Za-zÀ-ÿ]+(?:['’-][A-Za-zÀ-ÿ]+)*", re.sub(r"https?://\S+", "", t))


def mattr(w, k=50):
    w = [x.lower() for x in w]
    if len(w) < k:
        return None
    return st.mean(len(set(w[i:i + k])) / k for i in range(0, len(w) - k + 1, 5))


def meet(t):
    """dict kenmerk -> waarde. Alles per 1000 woorden tenzij de naam iets anders zegt."""
    w = woorden(t)
    n = len(w)
    if not n:
        return {}
    k = 1000 / n
    z = zinnen(t)
    zl = [max(1, len(woorden(x))) for x in z]
    al = [p for p in re.split(r"\n\s*\n", t) if p.strip()]
    pl = [len(woorden(p)) for p in al]
    laag = [x.lower() for x in w]
    openers = [" ".join(x.lower() for x in woorden(x)[:2]) for x in z]
    f = {
        "zinslengte_mediaan": st.median(zl),
        "zinslengte_spreiding": st.pstdev(zl) / st.mean(zl) if len(zl) > 2 else None,
        "zinnen_tot_4_woorden_pct": 100 * sum(x <= 4 for x in zl) / len(zl),
        "zinnen_vanaf_25_woorden_pct": 100 * sum(x >= 25 for x in zl) / len(zl),
        "alinea_spreiding": st.pstdev(pl) / st.mean(pl) if len(pl) > 3 else None,
        "woordlengte": st.mean(len(x) for x in w),
        "lange_woorden_pct": 100 * sum(len(x) >= 10 for x in w) / n,
        "naamwoordstijl": k * len(NAAMWOORDSTIJL.findall(t)),
        "partikels": k * sum(x in PARTIKELS for x in laag),
        "kale_woorden": k * sum(x in KAAL for x in laag),
        "spreektaal": k * len(SPREEK.findall(t)),
        "ik": k * sum(x in ("ik", "mij", "me", "mijn", "mn", "wij", "we", "ons", "onze") for x in laag),
        "jij": k * sum(x in ("je", "jij", "jou", "jouw", "jullie", "u", "uw") for x in laag),
        "aanhangzinnen": k * len(AANHANG.findall(t)),
        "contrastformule": k * len(CONTRAST.findall(t)),
        "drieslag": k * len(DRIESLAG.findall(t)),
        "brugwoord_opener_pct": 100 * sum(bool(BRUG.match(x)) for x in z) / len(z),
        "herhaalde_opener_pct": 100 * (1 - len(set(openers)) / len(openers)) if len(openers) > 5 else None,
        "dubbelepunt": k * len(re.findall(r":(?=\s|$)", t)),
        "gedachtestreep": k * len(re.findall(r"—|–| - ", t)),
        "puntkomma": k * t.count(";"),
        "haakjes": k * t.count("("),
        "beletsel": k * len(re.findall(r"\.\.\.?|…", t)),
        "uitroep": k * t.count("!"),
        "vraagzinnen_pct": 100 * sum(x.rstrip("\"'”’) ").endswith("?") for x in z) / len(z),
        "getallen": k * len(re.findall(r"(?<!\w)\d[\d.,:]*", t)),
        "namen": k * len(re.findall(r"(?<=[a-zà-ÿ,;] )[A-Z][\wÀ-ÿ-]+", t)),
        "ai_woorden": k * len(AI_WOORD.findall(t)),
        "woordvariatie": mattr(w),
    }
    regels = [r.strip() for r in t.split("\n") if r.strip()]
    f["regel_kleine_letter_pct"] = 100 * sum(r[0].islower() for r in regels) / len(regels)
    f["regel_zonder_eindpunt_pct"] = 100 * sum(not re.search(r"[.!?…:,]['\")]?$", r) for r in regels) / len(regels)
    f["woorden_per_regel"] = n / len(regels)
    f["emoji"] = k * len(EMOJI.findall(t))
    return f
