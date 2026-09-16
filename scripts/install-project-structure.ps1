param([string]$TargetHome = $env:USERPROFILE)

$ErrorActionPreference = 'Stop'
$source = Split-Path -Parent $PSScriptRoot
$node = 'node'
$claude = Join-Path $TargetHome '.claude'
$codex = Join-Path $TargetHome '.codex'
$cursor = Join-Path $TargetHome '.cursor'
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'

function Read-Config($file, $fallback) {
    if (Test-Path $file) { return (Get-Content -Raw -Encoding UTF8 $file | ConvertFrom-Json) }
    return ($fallback | ConvertFrom-Json)
}
function Save-Config($file, $value) {
    Copy-Item -LiteralPath $file -Destination "$file.bak-project-structure-$stamp" -ErrorAction SilentlyContinue
    [System.IO.File]::WriteAllText($file, ($value | ConvertTo-Json -Depth 20), (New-Object System.Text.UTF8Encoding($false)))
}
function Ensure-Hook($hooks, $eventName, $matcher, $command) {
    $list = @($hooks.$eventName)
    $entry = @($list | Where-Object { $_.matcher -eq $matcher }) | Select-Object -First 1
    if (-not $entry) { $entry = [pscustomobject]@{ matcher = $matcher; hooks = @() }; $list += $entry; $hooks.$eventName = $list }
    if (@($entry.hooks | Where-Object { $_.command -match 'project-structure-(guard|adapter)' }).Count -eq 0) {
        $entry.hooks = @($entry.hooks) + [pscustomobject]@{ type = 'command'; command = $command; timeout = 30 }
        return $true
    }
    return $false
}

New-Item -ItemType Directory -Force -Path "$claude\hooks", "$claude\skills", "$claude\commands", "$codex\hooks", "$codex\skills", "$cursor\skills-cursor", $cursor | Out-Null
Copy-Item "$source\hooks\project-structure-guard.js" "$claude\hooks" -Force
Copy-Item "$source\scripts\project-structure-check.js" "$claude\hooks" -Force
Copy-Item "$source\scripts\project-structure-init.js" "$claude\hooks" -Force
Copy-Item "$source\scripts\project-structure-inventory.js" "$claude\hooks" -Force
Copy-Item "$source\hooks\codex-project-structure-adapter.cjs" "$codex\hooks" -Force
Copy-Item "$source\hooks\project-structure-guard.js" "$codex\hooks" -Force
Copy-Item "$source\scripts\project-structure-check.js" "$codex\hooks" -Force
Copy-Item "$source\scripts\project-structure-init.js" "$codex\hooks" -Force
Copy-Item "$source\scripts\project-structure-inventory.js" "$codex\hooks" -Force
Copy-Item "$source\skills\project-structure" "$claude\skills" -Recurse -Force
Copy-Item "$source\skills\project-structure" "$codex\skills" -Recurse -Force
Copy-Item "$source\skills\project-structure" "$cursor\skills-cursor" -Recurse -Force
Copy-Item "$source\commands\project-structure.md" "$claude\commands" -Force

$claudeFile = "$claude\settings.json"
if (-not (Test-Path $claudeFile)) { [System.IO.File]::WriteAllText($claudeFile, '{"hooks":{"PreToolUse":[]}}', (New-Object System.Text.UTF8Encoding($false))) }
$claudeConfig = Read-Config $claudeFile '{}'
if (-not $claudeConfig.hooks) { $claudeConfig | Add-Member NoteProperty hooks ([pscustomobject]@{}) }
if (-not ($claudeConfig.hooks.PSObject.Properties.Name -contains 'PreToolUse')) { $claudeConfig.hooks | Add-Member NoteProperty PreToolUse @() }
$claudeCommand = "node `"$claude/hooks/project-structure-guard.js`""
$claudeWriteChanged = Ensure-Hook $claudeConfig.hooks 'PreToolUse' 'Write|Edit' $claudeCommand
$claudeBashChanged = Ensure-Hook $claudeConfig.hooks 'PreToolUse' 'Bash' $claudeCommand
$claudeChanged = $claudeWriteChanged -or $claudeBashChanged
if ($claudeChanged) { Save-Config $claudeFile $claudeConfig }

$codexFile = "$codex\hooks.json"
if (-not (Test-Path $codexFile)) { [System.IO.File]::WriteAllText($codexFile, '{"hooks":{"PreToolUse":[]}}', (New-Object System.Text.UTF8Encoding($false))) }
$codexConfig = Read-Config $codexFile '{}'
if (-not $codexConfig.hooks) { $codexConfig | Add-Member NoteProperty hooks ([pscustomobject]@{}) }
if (-not ($codexConfig.hooks.PSObject.Properties.Name -contains 'PreToolUse')) { $codexConfig.hooks | Add-Member NoteProperty PreToolUse @() }
$codexCommand = "node `"$codex/hooks/codex-project-structure-adapter.cjs`""
$codexBashChanged = Ensure-Hook $codexConfig.hooks 'PreToolUse' '^(Bash|functions\.(exec|exec_command)|shell_command)$' $codexCommand
$codexWriteChanged = Ensure-Hook $codexConfig.hooks 'PreToolUse' '^(functions\.)?(apply_patch|Edit|Write)$' $codexCommand
$codexChanged = $codexBashChanged -or $codexWriteChanged
if ($codexChanged) { Save-Config $codexFile $codexConfig }

$cursorFile = "$cursor\hooks.json"
if (-not (Test-Path $cursorFile)) { [System.IO.File]::WriteAllText($cursorFile, '{"version":1,"hooks":{"beforeShellExecution":[]}}', (New-Object System.Text.UTF8Encoding($false))) }
$cursorConfig = Read-Config $cursorFile '{}'
if (-not $cursorConfig.hooks) { $cursorConfig | Add-Member NoteProperty hooks ([pscustomobject]@{}) }
if (-not ($cursorConfig.hooks.PSObject.Properties.Name -contains 'beforeShellExecution')) { $cursorConfig.hooks | Add-Member NoteProperty beforeShellExecution @() }
$cursorCommand = "node `"$claude/hooks/project-structure-guard.js`" --cursor"
if (@($cursorConfig.hooks.beforeShellExecution | Where-Object { $_.command -match 'project-structure-guard' }).Count -eq 0) {
    $cursorConfig.hooks.beforeShellExecution += [pscustomobject]@{ command = $cursorCommand; matcher = '.*' }
    Save-Config $cursorFile $cursorConfig; $cursorChanged = $true
}

Write-Host "Claude: $(if ($claudeChanged) {'updated'} else {'already active'})"
Write-Host "Codex: $(if ($codexChanged) {'updated'} else {'already active'})"
Write-Host "Cursor shell: $(if ($cursorChanged) {'updated'} else {'already active'})"
Write-Host 'Restart Claude Code, Codex and Cursor before relying on their newly loaded hooks.'
