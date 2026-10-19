# e2e opnemen op je eigen Claude-seat

Voor collega's die e2e-stappen willen opnemen met hun eigen Claude-abonnement. Geen
API-sleutel, geen OpenAI, geen proxy. Afspelen heeft geen model nodig; dit gaat
alleen over opnemen (`node .poort/poort.mjs e2e --record` of `npx e2e run --record`).

## In het kort

1. Zorg dat je repo poort 0.4.0 of nieuwer heeft: `node .poort/poort.mjs --version`.
2. Maak je eigen token: `claude setup-token`.
3. Zet hem in `~/.config/poort/claude-seat-token`, alleen voor jou leesbaar (zie stap 3 hieronder).
4. Controleer: `node .poort/poort.mjs doctor` meldt `Claude-seat: ingelogd`.

Iedereen gebruikt zijn eigen seat. Deel je token nooit, ook niet met een agent in de chat.

## Architectuur

```
  e2e-runner (npx e2e run --record)
      │  agent.act('…'): screenshot + doel + toolkeuze (klik, typ, …)
      ▼
  claudeSeat('claude-sonnet-5-5')          .poort/integrations/e2e-claude-seat.mjs
      │  AI SDK-model (spec v4): doGenerate / doStream
      │  1. prompt plat slaan, alleen de laatste 2 screenshots
      │  2. toolkeuze als JSON-schema (anyOf per tool)
      │  3. env opschonen: geen ANTHROPIC_*, geen sessie-variabelen, geen
      │     HTTP(S)/ALL/NO_PROXY, wel jouw token (env of ~/.config/poort/claude-seat-token)
      │  4. vóór elk kind: beheerde instellingen? dan weigeren;
      │     claude auth status --json (geïsoleerd): echt een seat? anders weigeren
      ▼
  claude -p  (Claude Code zelf, als kind-proces, in een lege tijdelijke map)
      │  --tools "" --strict-mcp-config --setting-sources "" --json-schema …
      │  prompt en screenshots via stdin, nooit via argv
      ▼
  jouw Claude-seat (je abonnement, ingelogd via je eigen OAuth-token)
      │
      ▼  antwoord: { tool, input } als gestructureerde uitvoer
  claudeSeat → tool-call → e2e-runner voert de klik uit in de browser
```

Afspelen slaat alles boven de streep over: de runner leest `.e2e/cache/` en roept geen
model aan. Daarom draaien de commit- en push-hooks ook bij collega's zonder Claude-login.

Waarom zo en niet anders:

- **Een seat-token werkt niet op de API.** Een token uit `claude setup-token` geeft op de
  Anthropic Messages-API een weigering; alleen Claude Code zelf mag hem gebruiken.
- **Geen proxy.** Je abonnement via een eigen proxy naar een API-vorm routeren mag niet
  volgens de voorwaarden van Anthropic. Daarom draait elke stap echt `claude -p`, en
  gaan ook `HTTP_PROXY`, `HTTPS_PROXY`, `ALL_PROXY` en `NO_PROXY` (hoofd- en kleine
  letters) uit de env: seat-verkeer gaat rechtstreeks naar Anthropic. Zit je achter
  een bedrijfsproxy zonder directe route, dan werkt opnemen daar niet.
- **Alleen een seat telt.** Ook zonder API-sleutel in de env kan Claude Code een
  opgeslagen Console-sleutel of een `apiKeyHelper` gebruiken. Daarom draait vóór élk
  `claude`-kind, ook bij een nieuwe poging, `claude auth status --json` met dezelfde env,
  dezelfde lege werkmap en dezelfde isolatie (`--setting-sources "" --strict-mcp-config
  --safe-mode`, vóór het subcommando; gemeten: zo telt een `apiKeyHelper` in
  projectinstellingen niet mee, net als bij de opname). Geen cache: een login of beleid
  dat tussen twee stappen verandert, telt bij de volgende stap. Dat kost ongeveer 0,2 s
  per stap en geen modelaanroep. Toegestaan: `apiProvider` `firstParty` met `authMethod` `claude.ai`
  (interactieve abonnementslogin) of `oauth_token` uit `CLAUDE_CODE_OAUTH_TOKEN`.
  Alles anders faalt dicht, met de methode in de fout. Claude Code 2.1.x kent als
  `authMethod` `none`, `claude.ai`, `oauth_token`, `api_key`, `api_key_helper` en
  `third_party`, en als `apiProvider` `firstParty`, `bedrock`, `vertex`, `foundry`,
  `anthropicAws`, `anthropicGoogleCloud`, `mantle` en `gateway`.
- **`claude -p` is een agent.** Met al zijn tools aan zou hij zelf gaan klikken of
  zeggen dat hij de tool niet heeft. Met tools, MCP, hooks en instellingen uit en een
  JSON-schema als uitvoer gedraagt hij zich als een gewoon model.
- **Beheerde instellingen weigeren we, we volgen ze niet stil.** `--setting-sources ""`
  en `--safe-mode` zetten gebruikers-, project- en lokale instellingen en hun hooks uit,
  maar beheerde instellingen van een organisatie blijven gelden: een beheerde hook zou
  draaien met je seat-token in zijn env. Daarom kijkt de integratie vóór elk kind (en
  doctor vóór hij `claude` start) in `/Library/Application Support/ClaudeCode` (macOS),
  `/etc/claude-code` (Linux) of `C:\Program Files\ClaudeCode` (Windows) naar
  `managed-settings.json` en `managed-settings.d/*.json`, en op macOS naar het MDM-profiel
  (`/Library/Managed Preferences/…/com.anthropic.claudecode.plist`, gelezen met `plutil`).
  Alleen sleutels die alleen beperken of alleen weergave regelen mogen (zoals
  `permissions`, `forceLoginMethod`, `allowedMcpServers`, `disableAllHooks`); alles anders,
  dus ook `hooks`, `env`, `apiKeyHelper`, `awsCredentialExport`, `otelHeadersHelper`,
  `enabledPlugins` of een sleutel die we niet kennen, laat de integratie weigeren met de
  reden. Ook een bestand dat geen geldige JSON is, een `managed-mcp.json` (die negeert onze
  lege `--mcp-config`), een onleesbaar MDM-profiel of Windows-registerbeleid geeft een
  weigering. Er is geen opt-out: een hook met je token of een beheerde proxy breekt een
  harde regel. De integratie leest altijd de echte systeemplekken; geen env-variabele of
  configsleutel kan ze vervangen (de tests gebruiken een interne testnaad).
- **Buiten de garantie: beleid via de server.** Claude Code kan beheerd beleid ook van de
  servers van Anthropic halen, voor organisaties die dat zo instellen. Dat beleid staat
  niet op schijf en is lokaal niet uit te lezen, dus deze integratie kan het niet
  controleren en ook niet weigeren. Op een machine waar je organisatie Claude-beleid via
  de server uitrolt, geldt de belofte "nooit een hook met je token, nooit via een proxy"
  daarom niet. `poort doctor` zegt dat bij elke geslaagde seat-controle. Wat wel en niet
  gegarandeerd is, en wat de organisatiebeheerder moet laten: zie "Wat gegarandeerd is,
  en wat niet" onder Veiligheid.
- **Finish reason en afbeeldingen zoals de AI SDK ze verwacht.** De `stop_reason` van de
  CLI wordt de finish reason: `max_tokens` is `length` (afgekapt, ook als er een
  tool-keuze stond), `refusal` is `content-filter`, een tool-keuze is `tool-calls`,
  `end_turn` en `stop_sequence` zijn `stop`, en de rest `other`. Een kale `tool_use`
  zonder tool-keuze van ons is `other`, niet `tool-calls`: de SDK zou dan wachten op calls
  die er niet zijn. Een afbeelding met `mediaType` `image` of `image/*` krijgt het type uit
  de eerste bytes (PNG, JPEG, GIF, WebP); onbekende bytes worden een tekstregel.
- **Tools en een JSON-antwoord samen.** Vraagt een aanroep zowel tools als
  `responseFormat: { type: 'json', schema }`, dan is het antwoord zonder tool
  `{"action":{"json":…}}` volgens dat schema, geen vrije tekst.
- **`maxOutputTokens` werkt via `CLAUDE_CODE_MAX_OUTPUT_TOKENS`** (alleen voor de
  modelcall; een waarde uit je shell gaat niet mee). Wordt de grens bereikt, dan gooit
  `claude -p` de tekst weg; de integratie geeft dan lege inhoud met finish reason
  `length` en een waarschuwing. Gemeten: de seat telt dan toch het gebruikte aantal
  tokens (160 bij een grens van 40), dus de grens beperkt het antwoord, niet altijd het
  verbruik.
- **Nooit een lege systeemprompt.** Zonder systeembericht stuurt de integratie een korte
  vaste prompt mee; een lege of witruimte-prompt weigert de API (400).
- **Opnieuw proberen alleen bij tijdelijke fouten.** De AI SDK herhaalt alleen zijn eigen
  `APICallError`, dus de integratie doet het zelf: bij overbelast (529), een 5xx of een
  timeout maximaal twee keer, na ongeveer 2 en 6 seconden, en een `AbortSignal` breekt
  ook het wachten af. Een gebruikslimiet of een login-fout wordt niet herhaald.
- **`timeoutMs` is één termijn.** De controle vooraf, de terugval zonder onbekende vlag,
  elke nieuwe poging en het wachten ertussen vallen samen binnen `timeoutMs` (standaard
  180 s). Past een nieuwe poging niet meer, dan komt de fout meteen.
- **Tokens eerlijk geteld.** `outputTokens.text` is het totaal min de denk-tokens als de
  CLI die apart meldt; anders `undefined`, want dan is de verdeling onbekend.
- **Een mislukt kind is een fout.** Eindigt `claude` niet met 0 of stopt hij door een
  signaal, dan telt dat als fout, ook als er al een succes-resultaat op stdout stond.
- **Dezelfde opzet als een seat-shim op een server**: per gebruiker `claude -p` met
  `CLAUDE_CODE_OAUTH_TOKEN`, prompt via stdin, API-sleutel eruit gehaald.

## De code, per stap

Alles staat in `.poort/integrations/e2e-claude-seat.mjs` (zonder dependencies), met typen
in `e2e-claude-seat.d.mts`:

| Functie | Wat hij doet |
|---|---|
| `claudeSeat(modelId, opties)` | Geeft het AI SDK-model terug dat je in `e2e.config.ts` als `model` of `judge` zet. |
| `flattenPrompt` | Zet het gesprek (systeem, gebruiker, eerdere tool-calls en -resultaten) om in één bericht; oudere screenshots worden `[schermafbeelding weggelaten]`. |
| `toolPlan` / `toolSchema` | Maakt van de tools van de runner één JSON-schema; bij `toolChoice: auto` mag het model ook gewoon tekst antwoorden. |
| `extractJson` | Leest het antwoord uit de gestructureerde uitvoer, met tekst als terugval. |
| `childEnv` | Geeft alleen een allowlist door: `PATH`, `HOME`, `USER`, `LOGNAME`, `SHELL`, `TERM`, `LANG`, `LC_*`, `TZ`, `TMPDIR`/`TEMP`/`TMP`, `XDG_*`, de Windows-systeemvariabelen, `CLAUDE_CONFIG_DIR` (welke login) en `CLAUDE_CODE_OAUTH_TOKEN`. Zo kunnen `NODE_OPTIONS`, `LD_PRELOAD`, `DYLD_*`, proxyvariabelen, `ANTHROPIC_*` en sessievariabelen nooit mee, ook niet naar de controle vooraf of doctor. `NODE_EXTRA_CA_CERTS` gaat bewust niet mee. |
| `seatToken` / `seatEnv` | Neemt je token uit de env, anders uit `~/.config/poort/claude-seat-token`; weigert dat bestand als anderen het kunnen lezen. |
| `judgeSeatAuth` | Beoordeelt de uitvoer van `claude auth status --json`: seat of niet, en waarom niet. |
| `managedPolicyProblems` | Somt beheerde instellingen op die de isolatie zouden breken. |
| `redact` | Haalt de actieve token en elk `sk-ant-…`-patroon uit foutmeldingen en `detail`. |
| `ClaudeSeatError` | Fouten met een soort (`auth`, `managed`, `limit`, `overloaded`, `timeout`, `spawn`, `cli`); `isRetryable` is alleen waar bij een tijdelijke fout, die de integratie dan al zelf herhaald heeft. |

`poort doctor` gebruikt dezelfde `seatEnv`, `judgeSeatAuth` en `managedPolicyProblems` en
draait `claude auth status`; dat kost geen modelaanroep. Ingelogd met iets anders dan een
seat, of beheerde instellingen die de opname zou weigeren: `✗` met de reden. Hij valideert
een token niet: een verlopen token merk je bij de eerste opname.

Gebruik in `e2e.config.ts` (in een submap zoals `frontend/` wordt het pad `'../.poort/…'`):

```ts
import { claudeSeat } from './.poort/integrations/e2e-claude-seat.mjs';

agents: {
  default: {
    model: claudeSeat(process.env.E2E_MODEL ?? 'claude-sonnet-5-5'),
    judge: claudeSeat(process.env.E2E_JUDGE ?? 'claude-opus-5-5'),
  },
},
```

## Je eigen seat inrichten

1. **Claude Code staat op je machine**: `claude --version`. Zo niet, installeer Claude Code.
2. **Maak een token** in een gewone terminal: `claude setup-token`. Log in met je eigen
   Claude-account; je krijgt een token die begint met `sk-ant-oat`.
3. **Zet hem op je eigen machine**, buiten elke repo. Op macOS, met de token nog op je klembord:

   ```bash
   mkdir -p ~/.config/poort && (umask 077 && pbpaste > ~/.config/poort/claude-seat-token) && chmod 600 ~/.config/poort/claude-seat-token
   ```

   Op Linux kan het met `read -rs TOKEN && printf '%s\n' "$TOKEN" > ~/.config/poort/claude-seat-token`
   in dezelfde `umask 077`-subshell. Zet de token niet in `.env`, `.zshrc` of een
   projectbestand; een bestand in je home dat alleen jij kunt lezen lekt niet mee in een
   commit of een gedeeld scherm.
4. **Controleer**: `node .poort/poort.mjs doctor` meldt `Claude-seat: ingelogd via
   CLAUDE_CODE_OAUTH_TOKEN`. Neem daarna één test op: `npx e2e run --record tests/<test>.e2e.ts`.

Liever geen token? Draai dan één keer `claude` en log interactief in; de integratie
gebruikt die login ook.

## Prompt voor je agent

Plak dit in Claude Code, Codex of Cursor in de root van je repo. De agent richt alles
in behalve de token: die maak en plaats je zelf, nooit via de chat.

```text
Richt e2e-opnames in op mijn eigen Claude-seat, volgens docs/claude-seat.md in de
poort-repo (github.com/Reforge-Recruitment/poort).

1. Controleer `node .poort/poort.mjs --version`. Lager dan 0.4.0: draai
   `npx -y github:Reforge-Recruitment/poort init` (in een worktree met --no-hooks) en
   laat me de diff zien.
2. Pas e2e.config.ts aan zodat model en judge `claudeSeat(...)` uit
   .poort/integrations/e2e-claude-seat.mjs gebruiken (relatief pad goed zetten als de
   config in een submap staat). Haal ongebruikte providers (@ai-sdk/openai,
   @ai-sdk/anthropic, e2e/oauth/chatgpt) weg en controleer dat `npm ci` de lockfile
   ongewijzigd laat.
3. Vraag mij nooit om de token in de chat te plakken. Laat me zelf `claude setup-token`
   draaien en de token in ~/.config/poort/claude-seat-token zetten met chmod 600
   (de commando's staan in docs/claude-seat.md, stap 3).
4. Draai daarna `node .poort/poort.mjs doctor` en `npx e2e list`, en neem één bestaande
   test opnieuw op met --record tegen mijn lokale stack met demo-data.
5. Rapporteer wat je veranderde en de echte uitvoer van doctor en de opname. Commit niets
   zonder mijn akkoord.
```

## Veiligheid

- **Je token is je abonnement.** Nooit in een repo, een `.env` die je deelt, CI, een ticket
  of de chat met een agent. Lekt hij toch: maak een nieuwe met `claude setup-token`,
  vervang het bestand en meld het.
- **Alleen demo-data.** Bij opnemen gaan screenshots van de app naar Anthropic. Neem
  alleen op tegen een lokale stack met demo-data, nooit tegen een kopie van een
  klantdatabase, staging of productie.
- **De pagina kan het model niets laten doen op je machine.** `claude -p` draait zonder
  tools, zonder MCP, zonder gebruikers- en projecthooks en in een lege tijdelijke map;
  het enige wat het model kan teruggeven is een keuze uit de tools van de e2e-runner in
  de browser. Beheerde hooks of MCP van een organisatie gaan niet stil mee: dan weigert
  de integratie (zie hierboven).
- **Geen token in meldingen.** Foutmeldingen, hun `detail`, de velden uit `claude auth
  status` en de uitvoer van doctor gaan door `redact`, zodat ze veilig in een rapport of
  agent-transcript kunnen.
- **Afbreken stopt alles.** Op macOS en Linux draait `claude` in een eigen procesgroep;
  afbreken of een verlopen termijn stopt de hele groep (eerst SIGTERM, na 1,5 s SIGKILL),
  ook een `claude` die een `CLAUDE_BIN`-wrapper als kleinkind startte.
- **CI heeft geen token nodig**: CI speelt alleen af.

### Wat gegarandeerd is, en wat niet

Gegarandeerd, op elke machine waar de integratie draait:

- geen API-sleutel: alleen een seat-login (`claude.ai` of `CLAUDE_CODE_OAUTH_TOKEN`) op
  `firstParty` wordt geaccepteerd, gecontroleerd vóór elk `claude`-kind;
- geen proxy en geen routering via de env: alleen een allowlist van variabelen gaat mee,
  dus geen `HTTP(S)_PROXY`, `ANTHROPIC_BASE_URL`, `NODE_OPTIONS` of loader-variabelen;
- geen lokale hooks of instellingen: gebruikers-, project- en lokale instellingen en hun
  hooks staan uit, en beheerd beleid op schijf (`managed-settings.json`,
  `managed-settings.d/`, `managed-mcp.json`, MDM-profiel, Windows-register) met hooks,
  env, credential-helpers of routering laat de integratie weigeren.

Niet gegarandeerd: beleid dat de Claude-organisatie waar je seat bij hoort via de servers
van Anthropic uitrolt (server-managed settings). Dat laadt Claude Code bij het starten, het
staat niet op je machine en is lokaal niet uit te lezen; de integratie kan het dus niet
zien en niet weigeren. Een hook of `env` in dat beleid krijgt je seat-token wel te zien.
Daarom geldt voor elke organisatie waarvan seats met poort worden gebruikt: **de
organisatiebeheerder zet geen hooks, `env`, credential-helpers of routering in de
server-managed settings.** Weigeren als er misschien server-beleid is, zou elke Team-seat
blokkeren; deze grens is daarom bewust gedocumenteerd in plaats van afgedwongen.
`poort doctor` noemt dit voorbehoud bij elke geslaagde seat-controle.

## Problemen

| Melding | Oorzaak | Oplossing |
|---|---|---|
| `Claude-seat niet ingelogd` | Geen login en geen token gevonden | Stap 2 en 3, of één keer `claude` en inloggen |
| `… is leesbaar voor anderen` | Het tokenbestand heeft te ruime rechten | `chmod 600 ~/.config/poort/claude-seat-token` |
| `Claude-seat geweigerd: authMethod is api_key` | Claude Code gebruikt een opgeslagen Console-sleutel | Zet een token van `claude setup-token` in het tokenbestand, of log uit en in met je abonnement |
| `Claude-seat geweigerd: apiProvider is bedrock` (of vertex, gateway…) | Claude Code staat op een cloud-account of gateway | Haal de providerinstelling weg of gebruik een token |
| `beheerde Claude Code-instellingen gevonden` | Je organisatie heeft beleid met hooks, env of MCP | Overleg met wie het beheert, of neem op op een machine zonder dat beleid |
| `limiet bereikt` | De usage-limiet van je seat | Later opnieuw; afspelen werkt gewoon door |
| `tijdelijk niet beschikbaar` | Overbelast of een serverfout, ook na twee nieuwe pogingen | Even later opnieuw |
| `claude niet gevonden` | Claude Code staat niet op je PATH | Installeer Claude Code of zet `CLAUDE_BIN` |
| Opname traag | Elke stap start `claude -p` (enkele seconden) | Normaal; opnemen gebeurt zelden |
