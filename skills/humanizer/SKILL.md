---
name: humanizer
description: "Schrijft of herschrijft Nederlandse tekst zodat die minder naar AI klinkt, en meet dat tegen echte menselijke tekst. Voor appjes, mail, posts, artikelen en zakelijke stukken. Gebruik bij 'schrijf een appje/mail/artikel/post', 'maak menselijker', 'klinkt als AI', 'te robotisch', 'te perfect' of 'in mijn stijl'."
---

# Humanizer

Mensen herkennen AI-tekst niet aan losse woorden. Ze merken dat de tekst niet past bij wie het stuurt, aan wie, via welk kanaal. Een foutloze volzin met een punt erachter is prima in een offerte en vreemd in een appje. Daarom in deze volgorde: **inhoud, situatie, zin, woord.** Wie bij het woord begint (verboden lijstjes) houdt gladde AI-tekst over.

- **Materiaal telt het zwaarst.** In de toets van het project Quiron hielp stijl aanpassen niet (82% kans op "AI"); met eigen notities van de schrijver werd het 37%.
- **Doorschieten valt ook op.** "Schrijf menselijk" geeft tekst die korter, kaler en brokkeliger is dan een mens schrijft. Nederlands van modellen uit 2026 heeft al te weinig lange zinnen, te gelijke alinea's, te eenvoudige woorden en bijna geen namen of getallen.
- **Structuur verraadt meer dan woorden:** de les uitspreken, alles netjes afronden, elke alinea even zwaar.

Bronnen, cijfers en grenzen: [references/bronnen.md](references/bronnen.md).

## Zet de schrijfregels van de sessie uit

Een outputstijl of huisregel als "korte zinnen", "het simpelste woord" of "conclusie eerst" geldt voor wat je tegen de gebruiker zegt, **niet voor de tekst die je oplevert.** Schrijf een artikel, post of belangrijke mail in een subagent met alleen de kaart, de voorbeelden en het materiaal. Een appje schrijf je zelf.

## Stap 1. Wie stuurt dit aan wie, waarlangs

Kies een kaart uit [references/registers.md](references/registers.md): `app`, `mail`, `post`, `artikel` of `zakelijk`. Heeft de afzender een stemprofiel of een corpus (stap 3), dan wint dat van de kaart. Is er niets, vraag dan om drie echte teksten. Komen die niet, schrijf dan neutraal en zeg dat.

## Stap 2. Verzamel materiaal voor je schrijft

Haal uit de opdracht, het dictaat, de mailwisseling of de map: wat er gebeurde, wie, wanneer, hoeveel, wat de schrijver ervan vindt, wat hij niet zeker weet, wat hem irriteerde of verraste.

- **App en mail:** schrijf met wat er is. Vraag alleen als een feit ontbreekt waar het bericht om draait.
- **Post en artikel:** zonder minstens drie dingen die alleen de schrijver kan weten begin je niet. Stel dan in één keer hooguit vier vragen die met een spraakmemo te beantwoorden zijn: wat was het moment dat je dit dacht, met wie, wat ging er mis, waar ben je het niet eens met de rest. Komt er niets, schrijf dan korter. Verzin nooit een anekdote, reden, cijfer of citaat om menselijk te lijken.

Een dictaat is de kladversie. Houd de volgorde, de woorden en de zijpaden aan. Vat het nooit eerst samen: eigen woorden zijn het sterkste bewijs dat een mens het schreef. Maak het leesbaar, niet netjes.

## Stap 3. Haal echte voorbeelden op

Het corpus staat op de machine van de gebruiker, in `~/.local/share/humanizer` (of `$HUMANIZER_HOME`). De opgehaalde voorbeelden, met het bericht waarop ze antwoorden, komen wel in de context van het model; het filter op geheimen is grof. Zeg dat voor je het corpus bouwt. Bestaat het niet, bied dan aan het te bouwen; dat gaat met eigen teksten van de gebruiker. `SKILL` is de map van deze skill.

```bash
python3 "$SKILL/scripts/corpus.py" whatsapp chat.txt --naam "Naam in de export" --relatie werk
python3 "$SKILL/scripts/corpus.py" map ~/mijn-mails --register mail --relatie collega
python3 "$SKILL/scripts/corpus.py" schoon
python3 "$SKILL/scripts/corpus.py" banden
```

Mailbestanden heten `JJJJ-MM-DD-iets.txt`. `schoon` zet teksten die een assistent opstelde apart in `corpus/weg/`: zeven woorden op rij die op of vóór die dag al in de eigen transcripts van Claude Code of Codex stonden, over minstens 30% van de tekst. Tekst uit een webchat vindt het niet. Sla het nooit over. Wie met een assistent mailt, heeft een verzonden map vol machinetekst.

```bash
python3 "$SKILL/scripts/voorbeelden.py" --register app --relatie werk --soort vraag --over "kern van het bericht" --woorden 25 -n 5
```

Drie tot vijf voorbeelden is genoeg. Lees ze als klank: waar breekt hij af, waar staat geen punt, hoe verzacht hij een vraag, wat laat hij weg. Neem geen feiten, namen of hele zinnen over en citeer ze nergens.

## Stap 4. Kies een onverwachte weg, schrijf dan in één keer

Een model pakt uit zichzelf de meest waarschijnlijke opzet. Bedenk eerst intern vier tot vijf manieren om te beginnen en te ordenen, schat hoe voor de hand liggend elk is, en kies er een die klopt met het materiaal en **niet** de meest voor de hand liggende is. De varianten lever je niet op.

- Begin waar de schrijver zou beginnen. In een gesprek is dat het antwoord, in een artikel het ding dat hem dwarszat.
- Laat weg wat de ander al weet. AI legt uit, mensen rekenen op elkaar.
- Geef gewicht ongelijk. Het belangrijke punt krijgt drie keer zoveel ruimte als de rest, en sommige punten één bijzin.
- Zeg een oordeel één keer en trek er geen les uit. Minstens één voorbeeld blijft zonder uitleg staan.
- Noem het ding bij de naam: de tool, de persoon, de dag, het bedrag. `vorige week dinsdag` wint van `recent`.
- Stop als het klaar is. Geen afronding, geen terugblik, geen vraag aan de lezer om iets te mogen eindigen.

Langer dan een appje: lees [references/nederlands.md](references/nederlands.md). Artikel of post: ook [references/mooi-schrijven.md](references/mooi-schrijven.md).

## Stap 5. Meet

Vanaf 40 woorden. Een bestand of stdin.

```bash
python3 "$SKILL/scripts/meet.py" --register artikel tekst.txt
```

`artikel`, `essay` en `vakblog` worden meegeleverd (een post meet je met `essay`, voor `zakelijk` is er geen band); `app-<relatie>` en `mail` komen uit het eigen corpus. De band is p10 tot p90 van echte mensen, met 15% marge.

- `MACHINE`: kijk of het klopt en herstel het waar het ontstaat. Een te laag aantal namen los je op met materiaal, niet met versiering.
- `doorschot`: je hebt het te menselijk gemaakt. Terug.
- Hooguit twee rondes. Schrap en vervang op de zwakste plek; niet herordenen en niet het geheel gladstrijken. Alles binnen de band is geen doel.
- `contrastformule`, `drieslag`, `uitsmijter`, `metronoom`: lees de plek. Eén is stijl, drie is een patroon.

## Stap 6. Lees het als de ontvanger

1. Zou de ontvanger denken: zo praat die persoon niet? Wijs de zin aan en maak hem zoals hij hardop klinkt.
2. Welke zin kan in een bericht over iets heel anders staan? Die mag weg.
3. Klopt elk feit nog, en staat er niets bij wat niemand gezegd heeft?
4. Komt de schrijver over als iemand die weet waar het over gaat? Los is goed, slordig in de inhoud niet.

Gaat de tekst naar buiten, geef hem dan zonder context aan een verse subagent: *"Is dit door een mens getypt of door AI? Citeer de plekken die het verraden."* Herstel wat terecht is, één ronde.

## Fouten en slordigheid

Bouw nooit een typfout, d/t-fout of verkeerd woord in. Dat kost de schrijver aanzien en is zelf een trucje. Losse vorm mag waar de kaart hem toelaat: geen punt aan het eind van een appregel, een kleine beginletter, een weggelaten onderwerp, een Engels woord midden in de zin.

## Excuses, rouw, ziekte, ruzie, een bedankje met gevoel

Schrijf dit niet voor iemand. Vraag om twee ingesproken zinnen en zet alleen dat leesbaar neer, met de eigen woorden en niets erbij.

## Oplevering

Alleen de tekst, klaar om te plakken. Geen toelichting, tweede versie of score. Losse appjes als losse regels. Versturen doet de gebruiker. Bij een artikel, post of belangrijke mail mag er één regel onder: verander zelf nog een zin of twee.

Schrijfhulp in de eigen naam, met eigen inhoud, is waar dit voor is. Niet voor nepreviews, verzonnen ervaringen, schoolwerk of het nadoen van een ander zonder toestemming.
