# ATS- en recruitment-analytics (Polpo en andere ATS'en)

Wanneer lezen: bij analytics in een applicant tracking system of recruitment-CRM (Polpo, een bureau-ATS): pipeline, conversie per fase, time to hire, bronnen, vacature-ouderdom, aanbiedingen, kandidaatervaring, recruiter-activiteit, diversiteit, of een assistent naast die cijfers. Gedistilleerd uit het ATS-onderzoek van 2026-10-08 (`~/Desktop/Analytics ontwerp Power BI-stijl/ats-analytics.md`). Claims gemarkeerd **snippet** komen alleen uit een zoekresultaat; **[eigen keuze]** is een ontwerpbeslissing van het onderzoek.

Volgorde (Robin, 2026-10-08): eerst de backoffice-versie excellent maken, dan uitbreiden naar Polpo.

## 1. Wat de beste ATS'en tonen

| Onderwerp | Wat vendors tonen | Bron |
|---|---|---|
| Pipeline en conversie | Greenhouse: "Pipeline history and pass-through rates"; Ashby: "Stage Progress"; Lever: "Conversions" (snippet) | [Greenhouse](https://support.greenhouse.io/hc/en-us/articles/8837686136987-Which-report-should-I-use); [Ashby](https://www.ashbyhq.com/product-updates/recruiting-planner-visualizations-forecasting); [Lever](https://help.lever.co/hc/en-us/articles/20087349143581) |
| Cohort vs snapshot | Alleen cohortrapporten (gegroepeerd op aanmelddatum) tonen "the narrowing funnel"; een snapshot is "a single day in the life" | [Greenhouse](https://support.greenhouse.io/hc/en-us/articles/213332286) |
| Doorlooptijd | Time to hire (vanaf kandidaat), time to fill (vanaf vacature), time in stage; "Report median and p90 because hiring duration is right-skewed"; open sollicitaties niet negeren | [Greenhouse](https://support.greenhouse.io/hc/en-us/articles/8837686136987-Which-report-should-I-use); [Metabase](https://www.metabase.com/metrics/time-to-hire) |
| Bronnen en kosten | Candidates en quality by source; cost per hire = interne plus externe wervingskosten gedeeld door hires (SHRM/ANSI) | [Greenhouse](https://support.greenhouse.io/hc/en-us/articles/8837686136987-Which-report-should-I-use); [Workable](https://resources.workable.com/tutorial/faq-recruitment-budget-metrics) (ouder) |
| Aanbiedingen | Offer activity: extended, accepted, rejected per job | [Greenhouse](https://support.greenhouse.io/hc/en-us/articles/8837686136987-Which-report-should-I-use) |
| Activiteit | Interviewing activity, interviewer calibration, scheduling activity; Ashby stuurt op SLA-alerts | [Greenhouse](https://support.greenhouse.io/hc/en-us/articles/8837686136987-Which-report-should-I-use); [Ashby](https://ashbyhq.com/platform/recruiting/analytics) |
| Prognose | Passthrough rates uit de laatste 6 maanden, weekpace, forecast door extrapolatie, "Plan Progress" met tekort | [Ashby docs](https://docs.ashbyhq.com/recruiting-planner) |
| Diversiteit | Greenhouse toont onder vijf antwoorden "< 5" en beperkt de rechten; in de EU is verwerking van o.a. etnische afkomst verboden tenzij uitdrukkelijke toestemming voor een specifiek doel | [Greenhouse](https://support.greenhouse.io/hc/en-us/articles/360007254531); [AVG art. 9](https://gdpr-info.eu/art-9-gdpr/) |
| Kandidaatervaring | cNPS = % promoters (9-10) min % detractors (0-6), per fase, ook afgewezen kandidaten (snippet) | [AIHR](https://www.aihr.com/blog/candidate-nps/) |
| ATS + finance | Bullhorn combineert ATS-data met pay/bill-data: marge, fill rates, pipeline (snippet) | [Bullhorn](https://www.bullhorn.com/products/reporting-analytics/) |

Lessen **[eigen keuze]**: orden pagina's per zakelijke vraag (zoals Greenhouse zijn bibliotheek); maak de telbasis (cohort of activiteit) zichtbaar in slicer én subtitel; elke grafiek drillt naar een kandidatenlijst met de rechten van de gebruiker; stuur op SLA-signalen in plaats van ranglijsten; planning krijgt een eigen pagina; een vrije report builder is voor een eerste versie niet nodig.

## 2. Vorm per vraag

| Vraag | Vorm | Waarom en valkuil |
|---|---|---|
| In welke fase verliezen we kandidaten? | **Stage-conversiebalken**: liggende balken per fase, aantal, conversie% naar de volgende fase, ΔPY als pin | Lengte leest beter dan hoek of oppervlak ([SQLBI](https://www.sqlbi.com/articles/using-pie-charts-is-not-the-end-of-the-world/)), dus geen trechter van trapezia; liggend omdat fasenamen lang zijn |
| Wordt het proces beter? | **Cohorttabel**: aanmeldmaand x bereikte fase (%), lopende cohorten gearceerd | Recente cohorten zijn nog niet uitgelopen [eigen keuze: IBCS-arcering voor "nog niet af"] |
| Waar blijven ze hangen? | **Time in stage**: box- of strip-plot met mediaan, p90 en SLA-tick | Scheef verdeeld; strip bij kleine aantallen [eigen keuze] |
| Welke vacatures lopen vast? | **Vacature-ouderdom**: gesorteerde balken, dagen open, SLA-tick (bullet-stijl), label "n kandidaten actief" | Bullet in plaats van gauge ([Perceptual Edge](https://www.perceptualedge.com/articles/misc/Bullet_Graph_Design_Spec.pdf)) |
| Gedragen alle vacatures zich hetzelfde? | **Small multiples** van stage-balken | Zelfde schaal per paneel |
| Welke bron werkt, tegen welke kosten? | **Bronnentabel** met ingebedde balken; optioneel scatter kosten per hire x conversie, bel = volume, cross-filter naar de tabel | [IBCS](https://www.ibcs.com/resource/table-template-02/); [SQLBI](https://www.sqlbi.com/articles/using-scatterplots-to-find-details-in-reports/) |
| Halen we het wervingsplan? | **Cumulatieve hires**: AC doorgetrokken, prognose gestippeld of gearceerd vanaf de cutoff, plan als lijn, tekort gelabeld met teken | Per periode óf AC óf prognose ([SQLBI](https://www.sqlbi.com/articles/showing-actuals-and-forecasts-in-the-same-chart-with-power-bi/)) |
| Waarom zeggen kandidaten nee? | Acceptatie% per team met n-labels, afwijzingsredenen als gesorteerde balken | Kleine aantallen: n tonen, geen percentage onder de drempel [eigen keuze] |
| Hoe ervaren kandidaten het proces? | Divergerende gestapelde balk (detractors links, promoters rechts) per fase met n en cNPS | Afgewezen kandidaten scoren anders |
| Hoe divers is de instroom? | 100%-gestapelde balk per fase, alleen geaggregeerd, alleen boven de minimale groepsgrootte | Zie sectie 7 |

**Geen Sankey als werkvisual**: breedtes zijn slecht te vergelijken en te veel knopen overweldigen ([Storytelling with Data](https://www.storytellingwithdata.com/blog/what-is-a-sankey-diagram)); afhakers lopen in veel implementaties door tot de laatste kolom ([Oracle Analytics community](https://community.oracle.com/products/oracleanalytics/discussion/29325/enhance-sankey-charts-to-support-early-termination-nodes), snippet); en de verhoudingen zijn extreem: de late fasen worden haardunne linten naast één dikke afwijzingsstroom [eigen redenering].

## 3. Top-10 voor een ATS-analyticspagina

Nummers 1 tot en met 5 op het overzicht volgens 3-30-300; de rest naar subpagina's. Vergelijk met plan en vorige periode, IBCS-vullingen, kleur alleen op afwijkingen. Rangorde **[eigen keuze]**.

| # | Visual | Vraag | Plek |
|---|---|---|---|
| 1 | KPI-rij: hires t.o.v. plan, mediane time to hire (p90 als referentie), offer acceptance % (met n), vacatures boven SLA-leeftijd, cNPS (met n) | Op koers en gezond? | Overzicht, 3 s |
| 2 | Plan versus prognose hires, cumulatief | Halen we het aantal hires? | Overzicht, 30 s |
| 3 | Stage-conversiebalken (cohort) | Waar verliezen we de meeste kandidaten? | Overzicht, 30 s |
| 4 | Time in stage-verdeling | Waar blijven ze hangen? | Overzicht, 30 s |
| 5 | Vacature-ouderdom, Top N, drill naar de vacature | Welke vacatures lopen vast? | Overzicht, 300 s |
| 6 | Bronnentabel | Welke bron levert hires, tegen welke kosten? | Bronnen & kosten |
| 7 | Cohorttabel | Wordt het proces beter? | Pipeline |
| 8 | Small multiples per vacature(familie) | Welke wijkt af? | Pipeline |
| 9 | Aanbiedingen: acceptatie, redenen, tijd tot aanbod | Waarom nee? | Aanbiedingen |
| 10 | Kandidaatervaring: divergerende balk met n en cNPS | Hoe ervaren ze ons proces? | Kandidaatervaring |

Buiten de top-10, met een eigen pagina: **Team & capaciteit** (teamtotalen, werkdruk tegen capaciteit als bullet, **alfabetisch** in plaats van op prestatie, SLA-actielijst; per persoon alleen zichtbaar voor die persoon en de teamleider) en **Diversiteit** (alleen geaggregeerd, zelfgerapporteerd, apart recht).

## 4. Pagina's en slicers

```
Analytics
├─ Overzicht              #1 tot en met #5
├─ Pipeline               stage-conversie groot, cohorttabel, small multiples, afwijzingsredenen per fase
├─ Planning               plan vs prognose per vacature, benodigde activiteit per fase als weekpace
├─ Bronnen & kosten       bronnentabel, scatter kosten vs conversie, cost per hire-opbouw
├─ Aanbiedingen           acceptatie, afwijzingsredenen, tijd tot aanbod
├─ Kandidaatervaring      cNPS per fase, surveyscores
├─ Team & capaciteit      werkdruk vs capaciteit, SLA-actielijst, geen ranglijst
└─ Diversiteit            alleen met apart recht

Verborgen child-routes: /analytics/vacature/:id, /analytics/bron/:id
```

Slicerrij (vast, op elke pagina dezelfde plek): periode met "data t/m [datum]"; **telbasis** als segmented control ("Aanmelddatum (cohort)" of "Gebeurtenisdatum (activiteit)"); afdeling of, voor een bureau, klant (opdrachtgever); vacature(familie). Filter pane: bron, locatie, dienstverband, senioriteit, recruiter (als filter, niet als ranglijst).

Bureau-ATS (Polpo, Reforge): voeg de klantdimensie toe en koppel hires aan plaatsingsfees, zodat "Bronnen & kosten" en de finance-pagina Winstgevendheid dezelfde plaatsing tonen.

## 5. Polpo-plan (uit `voor-andere-projecten.md`)

- Begin met Overzicht en Pipeline (top-10 1 tot 5, 7 en 8); de assistent als laatste, na een AVG-privacytoets.
- Polpo heeft een eigen designtaal (indigo/violet, Inter; skill `polpohire-design`). Deel de **semantische** tokens (status, afwijking, scenario's, typografieschaal, radii, spacing), houd de **merk**-tokens van Polpo en valideer de reekskleuren opnieuw op de Polpo-oppervlakken.
- Nieuwe componenten bovenop de gedeelde set: **StageConversionBars**, **DistributionStrip** (box/strip met mediaan en p90), **CohortTable**.
- Trek tokens en componenten pas naar een gedeeld pakket als minstens twee pagina's of twee producten ze gebruiken.

## 6. De assistent in een ATS

Het patroon uit `assistent-patroon.md` blijft gelijk. Daarbovenop **[eigen keuzes]**:

1. **Payload standaard alleen aggregaten**: aantallen per fase, conversies, mediaan en p90, n per groep, filters, telbasis, tijdstip. Geen namen, cv-tekst, contactgegevens, notities of beoordelingen. Kandidaatniveau alleen in een kandidatenlijst-drill én als de vraag het vereist, met een pseudoniem-ID en minimale velden, aan de serverkant met de rechten van de gebruiker. "Wat de assistent ontvangt" zegt expliciet "Geen kandidaatgegevens" of welke velden wel.
2. **Nooit diversiteitsdata in de payload**: bijzondere persoonsgegevens ([AVG art. 9](https://gdpr-info.eu/art-9-gdpr/)); toestemming geldt voor monitoring, niet voor een taalmodel.
3. **De assistent beschrijft het proces, nooit personen**: AI om sollicitaties te analyseren en te filteren of kandidaten te beoordelen is hoog-risico ([AI Act Annex III, 4(a)](https://artificialintelligenceact.eu/annex/3/)). Weiger "Wie is de beste kandidaat?" en verwijs naar het menselijke proces. Juridische toets aanbevolen.
4. **Kleine aantallen**: onder de drempel "te weinig data voor een betrouwbaar percentage" en alleen n.

Startprompts: "Vat de pipeline van deze week samen voor het teamoverleg.", "In welke fase verliezen we de meeste kandidaten, en is dat anders dan vorig kwartaal?", "Welke vacatures lopen achter op het plan?", "Welke bron levert de meeste hires per euro op?"

## 7. Niet doen

| Niet doen | Wel doen |
|---|---|
| Trechter van trapezia, Sankey als werkvisual | Stage-conversiebalken plus afwijzingsredenen per fase |
| Snapshot-tellingen als conversie; cohort en activiteit mengen | Telbasis in slicer én subtitel |
| Gemiddelde time to hire als enige getal | Mediaan plus p90, en de verdeling |
| Lopende cohorten tonen alsof ze klaar zijn | Arceren als "nog niet afgerond", "n nog open" |
| Time to hire en time to fill door elkaar | Twee benoemde measures met definitie achter ⓘ |
| Ranglijsten van recruiters, sorteren op prestatie, leaderboards | Teamtotalen, werkdruk vs capaciteit, alfabetisch, SLA-actielijst |
| Diversiteit afleiden uit naam of foto (Ashby biedt "infer") | Alleen vrijwillig zelfgerapporteerd, met uitdrukkelijke toestemming |
| Diversiteit voor kleine groepen of per kandidaat | Eigen drempel n ≥ 10 per cel, ook de aanvullende cel onderdrukken, apart recht [strenger dan Greenhouse's 5] |
| Kandidaatgegevens in AI-payloads; de assistent laten ranken of beoordelen | Aggregaten; assistent beschrijft het proces |
| Percentages zonder n ("1 van 2 is 50%") | Altijd n; onder de drempel geen percentage |
| Amerikaanse tech-benchmarks als norm ([Gem](https://lp.gem.com/rs/972-IVV-330/images/Conversion_Rate_Benchmarks_Infographic.pdf), snippet) | Eigen PY en plan als referentielijn |
| Alleen rood/geel/groen als signaal | Kleur plus teken, pijl en tekst ("3 hires achter") |
| Gauge voor offer acceptance | KPI-kaart met ΔPY en n, of een bullet |
| Cost per hire los tonen | Kosten naast hires en conversie in de bronnentabel |

Open: Recruitee, Workable en Teamtailor niet diepgaand onderzocht; geen Nederlandse wervingsbenchmarks; de drempel n ≥ 10 is een eigen keuze; laat de diversiteitspagina en de AI-payload juridisch toetsen.
