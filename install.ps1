# Claude Harness - installer (Windows)
# Kopieert de skills naar ~/.claude/skills/ en plaatst de CLAUDE.md.
# Raakt je bestaande skills/settings niet aan; maakt back-ups van wat het vervangt.
#
# Draaien:  powershell -ExecutionPolicy Bypass -File .\install.ps1

$ErrorActionPreference = 'Stop'
$here   = Split-Path -Parent $MyInvocation.MyCommand.Path
$claude = Join-Path $env:USERPROFILE '.claude'
$skillsDst = Join-Path $claude 'skills'
$stamp  = Get-Date -Format 'yyyy-MM-dd_HHmmss'

New-Item -ItemType Directory -Force -Path $skillsDst | Out-Null

# 1. Skills kopiëren (back-up van een bestaande skill met dezelfde naam)
$copied = 0
Get-ChildItem (Join-Path $here 'skills') -Directory | ForEach-Object {
    $dst = Join-Path $skillsDst $_.Name
    if (Test-Path $dst) {
        $bak = "$dst.bak-$stamp"
        Move-Item $dst $bak
        Write-Host "  back-up: $($_.Name) -> $(Split-Path $bak -Leaf)"
    }
    Copy-Item $_.FullName $dst -Recurse -Force
    $copied++
}
Write-Host "Skills geplaatst: $copied"

# 2. CLAUDE.md plaatsen (bestaande wordt geback-upt, niet overschreven)
$cmdSrc = Join-Path $here 'CLAUDE.md'
$cmdDst = Join-Path $claude 'CLAUDE.md'
if (Test-Path $cmdDst) {
    Copy-Item $cmdDst "$cmdDst.bak-$stamp" -Force
    Write-Host "Bestaande CLAUDE.md geback-upt naar CLAUDE.md.bak-$stamp"
}
Copy-Item $cmdSrc $cmdDst -Force
Write-Host "CLAUDE.md geplaatst in $claude"

# Hooks (humanizer-guard, commit-guard) voor de script-install route
$hooksDst = Join-Path $claude 'claude-code-harness\hooks'
New-Item -ItemType Directory -Force -Path $hooksDst | Out-Null
Copy-Item (Join-Path $here 'hooks\humanizer-guard.js') $hooksDst -Force
Copy-Item (Join-Path $here 'hooks\commit-guard.js') $hooksDst -Force
Write-Host "Hooks geplaatst in $hooksDst"

Write-Host ""
Write-Host "Klaar. Herstart Claude Code. De skills triggeren vanzelf (of typ '/')."
Write-Host "Optioneel: merge settings.example.json in ~/.claude/settings.json voor de hooks + auto-mode + remote control."
