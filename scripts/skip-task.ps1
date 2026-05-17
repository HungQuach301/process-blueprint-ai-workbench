param(
  [Parameter(Mandatory=$true)]
  [string]$TaskId,

  [Parameter(Mandatory=$true)]
  [string]$Reason
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

$queuePath = ".codex/TASK_QUEUE.md"
$queue = Get-Content $queuePath -Raw

$queue = $queue -replace "- \[ \] $TaskId", "- [~] $TaskId - skipped: $Reason"

Set-Content $queuePath $queue -Encoding UTF8

Write-Host "Skipped task: $TaskId" -ForegroundColor Yellow
Write-Host "Reason: $Reason" -ForegroundColor Yellow
