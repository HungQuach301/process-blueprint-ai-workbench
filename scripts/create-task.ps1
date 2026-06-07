param(
  [Parameter(Mandatory=$true)]
  [string]$TaskId,

  [Parameter(Mandatory=$true)]
  [string]$TaskName
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

$templatePath = ".codex/task-template.md"

if (-not (Test-Path $templatePath)) {
  throw "Missing task template: $templatePath"
}

$taskPath = ".codex/tasks/$TaskId.md"

if (Test-Path $taskPath) {
  throw "Task already exists: $taskPath"
}

$template = Get-Content $templatePath -Raw
$template = $template -replace "<ID>", $TaskId
$template = $template -replace "<Short task name>", $TaskName

Set-Content $taskPath $template -Encoding UTF8

$queuePath = ".codex/TASK_QUEUE.md"
$queue = Get-Content $queuePath -Raw

if ($queue -notmatch [regex]::Escape($TaskId)) {
  $queue = $queue -replace "## Done", "- [ ] $TaskId`n`n## Done"
  Set-Content $queuePath $queue -Encoding UTF8
}

Write-Host "Created task: $taskPath" -ForegroundColor Green
code $taskPath
