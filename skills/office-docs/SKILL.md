---
name: office-docs
description: >
  Generate PowerPoint (.pptx), Excel (.xlsx) and Word (.docx) files programmatically with Python.
  Use when the user wants to build or fill a presentation, spreadsheet or document. Triggers:
  "maak een powerpoint/pptx", "maak een excel/xlsx", "maak een word/docx", "genereer een
  presentatie/spreadsheet/document", "vul deze excel", "export naar Office".
---

# Office Docs

Build real .pptx / .xlsx / .docx files with Python. No system Python on Windows, always run via
`uv`. For a fixed house style, build a thin wrapper around python-pptx with your own palette and
fonts; use this skill for general or one-off documents.

## Libraries (run with uv)
```
uv run --with python-pptx  python make.py    # PowerPoint
uv run --with openpyxl     python make.py    # Excel
uv run --with python-docx  python make.py    # Word
```
Starter templates: `scripts/make_pptx.py`, `scripts/make_xlsx.py`, `scripts/make_docx.py`.

## Valkuilen (deze zijn echt gebeurd, niet theoretisch)
- **Bestand open in Office = lock.** Opslaan geeft dan `PermissionError`. Tijdens itereren: schrijf
  naar een werk-bestand (`_work.xlsx`) en lever pas de nette naam op het eind, of vraag de gebruiker
  het bestand te sluiten. Vang `PermissionError` en val terug op een `(nieuw)`-naam.
- **Windows-paden:** quote paden met spaties; gebruik `uv run`, nooit kaal `python` (bestaat niet op PATH).
- **Fonts:** een font dat niet geïnstalleerd is, valt terug op een ander font. Installeer custom fonts
  per-user, of blijf bij Calibri/Segoe UI.
- **Visueel controleren (pptx):** je ziet design, je raadt het niet. Render naar beeld via
  LibreOffice (`soffice --headless --convert-to pdf`) → PDF → PNG-contactsheet en bekijk het.

## PowerPoint (python-pptx): kort
- 16:9 = `Inches(13.333) x Inches(7.5)`. Gebruik layout `slide_layouts[6]` (blank) en teken zelf.
- Vormen: `add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, ...)`, tekst via `add_textbox`.
- Zet schaduw uit met een lege `a:effectLst` (anders default-schaduw op elke shape).
- Transparantie: voeg `a:alpha` toe aan de `srgbClr` van de fill.

## Excel (openpyxl): kort
- Styling: `PatternFill`, `Font`, `Border/Side`, `Alignment(wrap_text=True)`.
- Leesbaarheid: `freeze_panes`, `auto_filter.ref`, kolombreedtes, en **rijhoogte zelf berekenen**
  voor wraptekst (openpyxl groeit niet automatisch mee, anders kap je tekst af).
- Interactie: `DataValidation(type="list", ...)` voor dropdowns; `CellIsRule` voor kleur-per-waarde.
- Print: landscape + `fitToWidth=1` + `print_title_rows` voor een nette afdruk.

## Word (python-docx): kort
- Koppen/tekst: runs met `font.size/bold/color`. Tabellen: `add_table(rows, cols)`, `style="Table Grid"`.
- Cel-arcering kan alleen via XML: voeg een `w:shd` toe aan `cell._tc.get_or_add_tcPr()`.
- Pagina-einde: `doc.add_page_break()`.

## Werkwijze
1. Schrijf een klein generator-script (kopieer een starter uit `scripts/`).
2. `uv run --with <lib> python script.py`.
3. Voor pptx: render en bekijk. Voor xlsx/docx: open of valideer met de lib (tel rijen/shapes).
4. Itereer tot het klopt. Lever de nette bestandsnaam pas als het af is.
