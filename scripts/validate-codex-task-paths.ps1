param(
  [string]$TaskPath = ".codex/CURRENT_TASK.md"
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

if (-not (Test-Path $TaskPath)) {
  throw "Task file not found: $TaskPath"
}

$lines = Get-Content $TaskPath
$inSection = $false
$paths = @()

foreach ($line in $lines) {
  if ($line -match "^## Files to inspect first\s*$") {
    $inSection = $true
    continue
  }

  if ($line -match "^## " -and $inSection) {
    break
  }

  if ($inSection -and $line -match "^- ") {
    $candidate = ($line -replace "^- ", "").Trim()

    # Remove common Markdown inline code/backtick/single-quote/double-quote wrappers safely
    $candidate = $candidate.Trim()
    $candidate = $candidate.Trim([char]96)
    $candidate = $candidate.Trim([char]39)
    $candidate = $candidate.Trim([char]34)

    if (
      $candidate -and
      $candidate -ne "..." -and
      $candidate -notmatch "<" -and
      $candidate -notmatch "^None$"
    ) {
      $paths += $candidate
    }
  }
}

$missing = @()

foreach ($candidatePath in $paths) {
  if (-not (Test-Path $candidatePath)) {
    $missing += $candidatePath
  }
}

if ($missing.Count -gt 0) {
  Write-Host "Task has missing inspect paths:" -ForegroundColor Red
  $missing | ForEach-Object { Write-Host "- $_" -ForegroundColor Red }
  Write-Host ""
  Write-Host "Fix the task file before running Codex." -ForegroundColor Yellow
  exit 1
}

Write-Host "Task inspect paths validated." -ForegroundColor Green
