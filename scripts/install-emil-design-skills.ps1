param([string]$TargetHome = $env:USERPROFILE)

$ErrorActionPreference = 'Stop'
$source = Split-Path -Parent $PSScriptRoot
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$names = @('animate', 'animate-expo', 'animation-vocabulary', 'apple-design', 'ask-sonner', 'emil-design-eng', 'find-animation-opportunities', 'improve-animations', 'mobile-native', 'pick-ui-library', 'prototype', 'review-animations')

function Same-Skill($left, $right) {
    if (-not (Test-Path $right)) { return $false }
    $leftFiles = @(Get-ChildItem $left -Recurse -File | ForEach-Object { $_.FullName.Substring($left.Length).TrimStart('\', '/') }) | Sort-Object
    $rightFiles = @(Get-ChildItem $right -Recurse -File | ForEach-Object { $_.FullName.Substring($right.Length).TrimStart('\', '/') }) | Sort-Object
    if (Compare-Object $leftFiles $rightFiles) { return $false }
    foreach ($relative in $leftFiles) {
        if ((Get-FileHash (Join-Path $left $relative) -Algorithm SHA256).Hash -ne (Get-FileHash (Join-Path $right $relative) -Algorithm SHA256).Hash) { return $false }
    }
    return $true
}
function Install-To($label, $root) {
    New-Item -ItemType Directory -Force -Path $root | Out-Null
    $updated = @()
    foreach ($name in $names) {
        $from = Join-Path $source "skills\$name"
        $to = Join-Path $root $name
        if (Same-Skill $from $to) { continue }
        if (Test-Path $to) { Move-Item -LiteralPath $to -Destination "$to.bak-emil-$stamp" }
        Copy-Item -LiteralPath $from -Destination $to -Recurse
        $updated += $name
    }
    Write-Host "${label}: $(if ($updated.Count) {$updated -join ', '} else {'already current'})"
}

Install-To 'Claude' (Join-Path $TargetHome '.claude\skills')
Install-To 'Codex' (Join-Path $TargetHome '.codex\skills')
Write-Host 'Restart Claude Code and Codex, or start a new session, before relying on newly discovered skills.'
