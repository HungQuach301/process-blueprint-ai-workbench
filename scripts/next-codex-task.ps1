param(
  [string]$TaskId,
  [string]$ExpectedBranch = "feature/quality-gate-overhaul"
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

Write-Host "Checking branch..." -ForegroundColor Cyan
$branch = git branch --show-current

if ($branch -ne $ExpectedBranch) {
  Write-Warning "Not on expected branch. Current: $branch. Expected: $ExpectedBranch"
  $proceed = Read-Host "Continue anyway? (y/n)"
  if ($proceed -ne "y") { exit 1 }
}

Write-Host "Checking working tree..." -ForegroundColor Cyan
$status = git status --porcelain

if ($status) {
  Write-Warning "Working tree is not clean. Uncommitted changes:"
  git status --short
  $proceed = Read-Host "Continue anyway? (y/n)"
  if ($proceed -ne "y") { exit 1 }
}

if (-not (Test-Path ".codex/tasks")) {
  throw "Missing .codex/tasks folder."
}

if ([string]::IsNullOrWhiteSpace($TaskId)) {
  $queueLines = Get-Content ".codex/TASK_QUEUE.md"

  $inPendingSection = $false
  $pendingLines = @()

  foreach ($line in $queueLines) {
    if ($line -match "^## Pending\s*$") {
      $inPendingSection = $true
      continue
    }

    if ($line -match "^## " -and $inPendingSection) {
      break
    }

    if ($inPendingSection) {
      $pendingLines += $line
    }
  }

  $nextLine = $pendingLines |
    Where-Object { $_ -match "^- \[ \] [A-Za-z0-9][A-Za-z0-9_.-]*\s*$" } |
    Select-Object -First 1

  if (-not $nextLine) {
    Write-Host "No pending task found." -ForegroundColor Yellow
    exit 0
  }

  $TaskId = ($nextLine -replace "^- \[ \] ", "").Trim()
}

$taskFile = ".codex/tasks/$TaskId.md"

if (-not (Test-Path $taskFile)) {
  throw "Task file not found: $taskFile"
}

Copy-Item $taskFile ".codex/CURRENT_TASK.md" -Force

& "$PSScriptRoot\validate-codex-task-paths.ps1" -TaskPath ".codex/CURRENT_TASK.md"

Write-Host "Current Codex task set to: $TaskId" -ForegroundColor Green
Write-Host ""
Write-Host "In Codex, type this one line:" -ForegroundColor Cyan
Write-Host "Read .codex/PROMPT.md and execute .codex/CURRENT_TASK.md." -ForegroundColor Yellow

code ".codex/CURRENT_TASK.md"

