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
function Backup-Skill($sourcePath, $backupRoot) {
    New-Item -ItemType Directory -Force -Path $backupRoot | Out-Null
    Move-Item -LiteralPath $sourcePath -Destination (Join-Path $backupRoot (Split-Path -Leaf $sourcePath))
}
function Move-DiscoverableBackups($root, $backupRoot) {
    if (-not (Test-Path $root)) { return }
    Get-ChildItem -LiteralPath $root -Directory -Filter '*bak-emil-*' | ForEach-Object { Backup-Skill $_.FullName $backupRoot }
}
function Install-To($label, $root, $backupRoot) {
    New-Item -ItemType Directory -Force -Path $root | Out-Null
    Move-DiscoverableBackups $root $backupRoot
    $updated = @()
    foreach ($name in $names) {
        $from = Join-Path $source "skills\$name"
        $to = Join-Path $root $name
        if (Same-Skill $from $to) { continue }
        if (Test-Path $to) { Backup-Skill $to $backupRoot }
        Copy-Item -LiteralPath $from -Destination $to -Recurse
        $updated += $name
    }
    Write-Host "${label}: $(if ($updated.Count) {$updated -join ', '} else {'already current'})"
}

Install-To 'Claude' (Join-Path $TargetHome '.claude\skills') (Join-Path $TargetHome '.claude\skill-backups\emil')
Install-To 'Codex' (Join-Path $TargetHome '.codex\skills') (Join-Path $TargetHome '.codex\skill-backups\emil')
Write-Host 'Restart Claude Code and Codex, or start a new session, before relying on newly discovered skills.'
