# De assistent naast de cijfers

Wanneer lezen: bij elke AI-assistent, chat of "leg uit"-functie naast dashboardcijfers: de knop, het paneel, de context die meegaat, bronverwijzingen en de getallencontrole. Het patroon leent van Copilot in Power BI; het merk niet. Externe claims met bron; ontwerpkeuzes als zodanig gemarkeerd.

## 1. De kernregel: verteller, geen rekenmachine

De backend berekent elk getal. De UI rendert getallen uit de payload. Het taalmodel vertelt alleen over getallen die al in de payload staan, en een controle markeert elk getal in het antwoord dat er niet in staat. Geen onderzochte leverancier beschrijft zo'n numerieke controle; het is de reactie op Microsofts eigen waarschuwing dat een taalmodel "no inherent understanding of truth" heeft ([Microsoft Learn](https://learn.microsoft.com/en-us/microsoft-cloud/dev/copilot/isv/ux-guidance)) en op de gedocumenteerde terugval van Power BI op algemene modelkennis ([Microsoft Learn](https://learn.microsoft.com/en-us/power-bi/create-reports/copilot-ask-data-question)).

## 2. Wat Copilot in Power BI doet (bron)

- Hoofdingang: een Copilot-knop in het lint opent een **paneel rechts** (GA); een standalone Copilot via de linkernavigatie is preview ([Microsoft Learn](https://learn.microsoft.com/en-us/power-bi/create-reports/copilot-introduction)). Daarbij een "Summarize"-knop en een samenvattingsicoon in de hover-header van elke visual, dat een tot die visual afgebakende prompt stuurt; beide stonden op 30 september 2026 als "temporarily unavailable" ([Microsoft Learn](https://learn.microsoft.com/en-us/power-bi/explore-reports/copilot-pane-summarize-content)). Staat Copilot uit, dan verdwijnt de ingang in plaats van een uitgeschakelde knop.
- Paneel: voorgestelde prompts als knoppen ("What is this report page about?", "Prep a summary for my team.") die verdwijnen zodra het gesprek begint en via een promptgids terugkomen; antwoorden streamen; kopiëren en duim onder elk antwoord; "Clear chat" ([Microsoft Learn](https://learn.microsoft.com/en-us/power-bi/explore-reports/copilot-pane-summarize-content)).
- Grounding: eerst tot 20 relevante visuals, dan samenvatten; **voetnoot-citaties naar visuals** die naar de juiste pagina springen ([Microsoft Learn](https://learn.microsoft.com/en-us/power-bi/explore-reports/copilot-pane-summarize-content)). "How Copilot arrived at this" toont velden, measures en filters ([Microsoft Learn](https://learn.microsoft.com/en-us/power-bi/create-reports/copilot-ask-data-question)).
- Gedocumenteerde zwaktes: datavragen passen de actieve slicers **niet** toe, het model kan terugvallen op algemene kennis, percentages kunnen in tekst anders opgemaakt zijn dan in de tabel ([Microsoft Learn](https://learn.microsoft.com/en-us/power-bi/create-reports/copilot-ask-data-question)).
- Concurrenten maken de berekening controleerbaar: ThoughtSpot (bewerkbare zoektokens, "Double check response"), Looker ("How was this calculated?" in bullets), Sigma (formules en filters), Tableau Pulse (citatielinks, "Metric Sources", expliciete waarschuwing voor "occasional hallucinations") ([ThoughtSpot](https://docs.thoughtspot.com/cloud/latest/spotter-getting-started); [Google Cloud](https://cloud.google.com/blog/products/business-intelligence/a-closer-look-at-looker-conversational-analytics/); [Sigma](https://www.sigmacomputing.com/product/ai); [Tableau](https://help.tableau.com/current/online/en-us/pulse_ask_discover_qa.htm)).

## 3. Merk: patroon ja, logo, naam en kleur nee

- Microsofts logo's, iconen en ontwerpen "can never be used without an express license", en Microsoft-merken mogen niet in de naam van je eigen product of feature: "Contoso OneDrive software" is verboden, dus "[Eigen merk] Copilot" ook ([Microsoft Trademark Guidelines](https://www.microsoft.com/en-us/legal/intellectualproperty/trademarks/usage/general)).
- De FY27-merkrichtlijnen noemen Copilot onder de app-iconen waarvoor een licentie vereist is en leggen de in-product merkkleur vast op **#464FEB** ([FY27 Microsoft 365 trademark guidelines](https://cdn-dynmedia-1.microsoft.com/is/content/microsoftcorp/microsoft/mscle/documents/presentations/FY27_Microsoft_365_trademark_guidelines.pdf)).
- Juridisch vrij: de Fluent UI System Icons onder MIT (`sparkle`, `chat_sparkle`, `bot_sparkle`, `data_usage_sparkle`) ([LICENSE](https://github.com/microsoft/fluentui-system-icons/blob/main/LICENSE); [iconenlijst](https://github.com/microsoft/fluentui-system-icons/blob/main/icons_regular.md)). MIT dekt auteursrecht, geen merkrecht: nooit combineren met Copilot-kleuren of een regenbooggradiënt. Een optie voor andere producten.
- De MIT-componenten `@fluentui-copilot/*` zijn React en pre-1.0: referentie voor gedrag en toegankelijkheid, geen dependency in Vue ([npm](https://www.npmjs.com/package/@fluentui-copilot/react-copilot-chat)).
- Dit is geen juridisch advies.

**Invulling:** de assistent draagt het eigen merk van de app, plat en herkenbaar, met een tekstlabel ("Assistent"). Nooit een orb, sterretje, toverstaf of Copilot-merk. Gebruik hetzelfde merk overal waar de assistent iets doet.

## 4. Microsoft-richtlijnen voor de vorm

- ISV-richtlijn: **assistive** (zijbalk "without obstructing the main content area") plus **embedded** (per object, "dive deeper into a chart"); combineer ze. Labels als werkwoord met hulpmiddel ("Summarize with copilot", niet "copilot, summarize"); geen vermenselijking ("processing", "analyzing", niet "think"); niet "we" namens het bedrijf. Disclaimer bij elke uitvoer en frictie bij opslaan, delen, kopiëren ([Microsoft Learn](https://learn.microsoft.com/en-us/microsoft-cloud/dev/copilot/isv/ux-guidance)).
- HAX: maak duidelijk wat het systeem kan en hoe vaak het fout zit (G1, G2), timing op context (G3), efficiënt aanroepen, wegklikken en corrigeren (G7 tot G9), afbakenen bij twijfel (G10), uitleggen waarom (G11), granulaire feedback (G15) ([HAX](https://www.microsoft.com/en-us/haxtoolkit/library/)).
- De disclaimer werd in Copilot Chat eind 2025 beheerbaar ([MC1181766](https://mc.merill.net/message/MC1181766)); voor finance hoort hij altijd aan.

## 5. Het ontwerp (eigen keuzes op basis van de bronnen)

| Onderdeel | Regel |
|---|---|
| Merk | Het eigen assistentmerk van de app. Nooit orb, sterretje, toverstaf of Copilot-merk. |
| Ingang | Knop met het merk in een getint rondje (28px) en het label "Assistent", zachte pil rechts op de titelregel; `aria-expanded`, ingedrukte staat als het paneel open is. Plus per visual "Leg deze grafiek uit" met het kale merk (14px) in de hover-header. |
| Plek | Rechter zijpaneel dat het canvas opzij schuift (nooit eroverheen); telefoon: blad van onderen met greep, hooguit 85% van de schermhoogte. Opent nooit vanzelf; Esc sluit; focus terug op de knop. |
| Kop | Merk in rondje (28px), "Assistent", scopechip: pagina · periode · entiteit. Knoppen "Nieuw gesprek" en "Assistent sluiten". |
| Bezig | Het merk in een live-stand, geen spinner met sterretje. |
| Leeg | Welkom met het merk in rondje (44px): "Waar wil je meer over weten?", "Ik gebruik alleen de cijfers op dit scherm.", en hooguit vier startvragen als kaarten, afgeleid uit de cijfers ("Vat deze periode samen voor het MT", "Wat verklaart het verschil met vorig jaar?"). Elke startvraag draagt een Lucide-betekenisicoon (doc, trendUp, chart), nooit een sterretje of toverstaf. Na het eerste bericht verdwijnen ze en staan ze achter "Voorbeeldvragen" bij de invoer. |
| Wat de assistent ontvangt | Een rustige inklapbare rij ("n visuals, n filters") die openklapt tot pagina, visuals met nummer, periode, filters, vergelijking, status en tijdstip. Uit hetzelfde model als de verstuurde tekst: wat je ziet is wat er meegaat. |
| Antwoord | Elke bewering met een bronnummer [n]; [n] wordt een knopje dat naar de visual scrollt en hem 1,8 s laat oplichten. Getal niet in de context: een regel "Bevat een getal dat niet in de cijfers staat; controleer het" met de getallen achter een ⓘ. |
| Voet | Invoer en een vaste regel: "AI-antwoorden kunnen fouten bevatten. Controleer cijfers via de bronverwijzing." |
| Weigeren | Vragen buiten de payload, prognoses en ongedefinieerde periodes: weigeren of doorvragen (HAX G10). Open periode: eerst een waarschuwing "Deze cijfers zijn nog niet afgesloten" met "Toon antwoord toch" (naar Power BI's "View answer"). "Waarom"-vragen worden ontleding over beschikbare data, geen causale claim. |
| Rechten | De payload wordt aan de serverkant opgebouwd met de rechten van de gebruiker. |
| Stem | Machine-taal: "Ik heb 6 grafieken geanalyseerd", niet "ik denk"; nooit "wij" namens het bedrijf; generieke naam, geen persona. |

Breedte: het onderzoek noemt 360 tot 420 px als eigen keuze (Microsoft publiceert geen maat); 340px werkt ook in een smalle kolom.

## 6. Bouwstenen

- **Merkcomponent**: icoon in px, `aria-hidden`, met een live-stand voor bezig; een variant in een rond vlak (28 of 44px) met een merktint van ongeveer 13% (donker 24%).
- **Paneel**: modus dok (sticky rechterkolom) of blad (telefoon, `max-height: min(85dvh, 760px)`, greep, scrim, focus blijft binnen).
- **Gesprek en aanvraag**: interfaces via provide/inject, zodat een test een eigen gesprek meegeeft. De ingang per visual verschijnt alleen als de pagina een aanvraag levert en de kaart een id heeft.
- **Contextmodel**: levert zowel de verstuurde tekst als het blok "Wat de assistent ontvangt". Instructie: "Gebruik alleen getallen die hieronder staan en reken niet zelf. Zet achter elke bewering het nummer van de visual als bron, zoals [2]." Hooguit 5 klanten; niets persoonlijks dat niet al in de grafiek staat.
- **Getallencontrole**: haalt bedragen (€, euro, k, mln), percentages, aantallen en jaartallen uit het antwoord en zoekt ze in de context, met de afronding die de schrijfwijze toelaat ("€ 1,23 mln" past op "€ 1.234.567", "36%" op "35,8%"). Alleen bronverwijzingen zoals [2] tellen niet.
- **Bronnen**: vervangt [n] in de gerenderde tekst door knoppen die naar de visual springen, niet in code, links of knoppen.

## 7. Veelgemaakte fouten

- Paneel op telefoon met witte leegte, kale tekstrijen, een ruwe toggle en een zware rand om de invoer. Beter: welkom met inhoud, startvragen als kaarten, rustige rij voor de context, lichte invoerrand, merk in de kop.
- Een knop met een sparkle in een grijze doos. Beter: het eigen merk met een tekstlabel als zachte pil.

## 8. In een ATS

Zie `ats-analytics.md`, sectie 6: standaard alleen aggregaten in de payload, nooit diversiteitsdata, de assistent beschrijft het proces en nooit personen (AI Act Annex III), en onder een minimale groepsgrootte geen percentage.
