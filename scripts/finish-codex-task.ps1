param(
  [Parameter(Mandatory=$true)]
  [string]$TaskId,

  [Parameter(Mandatory=$true)]
  [string]$CommitMessage
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

Write-Host "Verifying before finish..." -ForegroundColor Cyan
& "$PSScriptRoot\verify-task.ps1"

Write-Host ""
Write-Host "Files currently changed:" -ForegroundColor Cyan
git status --short

Write-Host ""
$proceed = Read-Host "Stage changes? (y = all, s = selective patch, n = abort)"

if ($proceed -eq "y") {
  git add -A
} elseif ($proceed -eq "s") {
  git add -p
} else {
  Write-Host "Aborted. No files staged." -ForegroundColor Red
  exit 1
}

$staged = git diff --cached --name-only

if (-not $staged) {
  Write-Host "No staged changes. Aborting commit." -ForegroundColor Red
  exit 1
}

Write-Host ""
Write-Host "Staged files:" -ForegroundColor Cyan
git diff --cached --name-only

Write-Host ""
$confirmCommit = Read-Host "Commit staged files with message '$CommitMessage'? (y/n)"
if ($confirmCommit -ne "y") {
  Write-Host "Commit aborted." -ForegroundColor Red
  exit 1
}

git commit -m "$CommitMessage"

Write-Host "Commit succeeded. Marking task as done..." -ForegroundColor Cyan

$queuePath = ".codex/TASK_QUEUE.md"
$queue = Get-Content $queuePath -Raw

$oldQueue = $queue
$queue = $queue -replace "- \[ \] $TaskId", "- [x] $TaskId"

if ($queue -eq $oldQueue) {
  Write-Warning "TaskId not found as pending in queue: $TaskId"
} else {
  Set-Content $queuePath $queue -Encoding UTF8
  git add $queuePath
  git commit --amend --no-edit
}

Write-Host "Task finished: $TaskId" -ForegroundColor Green
git status --short
