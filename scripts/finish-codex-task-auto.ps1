param(
  [Parameter(Mandatory=$true)]
  [string]$TaskId,

  [Parameter(Mandatory=$true)]
  [string]$CommitMessage
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

$taskPath = ".codex/tasks/$TaskId.md"

if (-not (Test-Path $taskPath)) {
  throw "Task file not found: $taskPath"
}

function Convert-TaskListLineToPath {
  param(
    [Parameter(Mandatory=$true)]
    [string]$RawLine
  )

  $path = ($RawLine -replace "^- ", "").Trim()

  # Support task lines like:
  # - Optional: docs/ABC.md
  # - Optional: `docs/ABC.md` if needed
  $path = ($path -replace "^Optional:\s*", "").Trim()

  if ($path -match "\s+only if\s+") {
    $path = ($path -split "\s+only if\s+")[0].Trim()
  }

  if ($path -match "\s+if\s+") {
    $path = ($path -split "\s+if\s+")[0].Trim()
  }

  # Strip Markdown/code quote wrappers safely
  $path = $path.Trim()
  $path = $path.Trim([char]96)  # backtick `
  $path = $path.Trim([char]39)  # single quote '
  $path = $path.Trim([char]34)  # double quote "

  # Normalize Windows slashes to Git-style slashes
  $path = $path -replace "\\", "/"

  return $path
}

function Get-TaskSectionPaths {
  param(
    [Parameter(Mandatory=$true)]
    [string]$SectionName
  )

  $taskLines = Get-Content $taskPath
  $paths = @()
  $inSection = $false

  foreach ($line in $taskLines) {
    if ($line -match "^##\s+$([regex]::Escape($SectionName))\s*$") {
      $inSection = $true
      continue
    }

    if ($line -match "^## " -and $inSection) {
      break
    }

    if ($inSection -and $line -match "^- ") {
      $path = Convert-TaskListLineToPath -RawLine $line

      if (
        $path -and
        $path -ne "..." -and
        $path -notmatch "<" -and
        $path -notmatch "^None$"
      ) {
        $paths += $path
      }
    }
  }

  return $paths
}

Write-Host "Verifying before finish..." -ForegroundColor Cyan
& "$PSScriptRoot\verify-task.ps1"

Write-Host "Reading allowed changed files from task..." -ForegroundColor Cyan

$allowed = Get-TaskSectionPaths -SectionName "Allowed changed files"

if (-not $allowed -or $allowed.Count -eq 0) {
  Write-Warning "No Allowed changed files found in task. Falling back to Files expected to change."
  $allowed = Get-TaskSectionPaths -SectionName "Files expected to change"
}

if (-not $allowed -or $allowed.Count -eq 0) {
  throw "No allowed or expected changed files declared in task file."
}

Write-Host "Allowed files:" -ForegroundColor Cyan
$allowed | ForEach-Object { Write-Host "- $_" }

$changedRaw = git status --porcelain
$changed = @()

foreach ($line in $changedRaw) {
  if (-not [string]::IsNullOrWhiteSpace($line)) {
    $filePath = $line.Substring(3).Trim()
    $filePath = $filePath -replace "\\", "/"
    $changed += $filePath
  }
}

if (-not $changed -or $changed.Count -eq 0) {
  Write-Host "No changed files to commit." -ForegroundColor Yellow
  exit 0
}

$allowedNormalized = $allowed | ForEach-Object { $_ -replace "\\", "/" }

$unexpected = @()

foreach ($file in $changed) {
  $isAllowed = $false

  foreach ($allowedPath in $allowedNormalized) {
    if ($file -eq $allowedPath) {
      $isAllowed = $true
      break
    }

    if ($allowedPath.EndsWith("/*")) {
      $prefix = $allowedPath.Substring(0, $allowedPath.Length - 1)
      if ($file.StartsWith($prefix)) {
        $isAllowed = $true
        break
      }
    }
  }

  if (-not $isAllowed) {
    $unexpected += $file
  }
}

if ($unexpected.Count -gt 0) {
  Write-Host "Unexpected changed files detected. Aborting." -ForegroundColor Red
  $unexpected | ForEach-Object { Write-Host "- $_" -ForegroundColor Red }
  Write-Host ""
  Write-Host "Fix the task or update Allowed changed files intentionally." -ForegroundColor Yellow
  exit 1
}

Write-Host "All changed files are allowed. Staging..." -ForegroundColor Green

foreach ($file in $changed) {
  git add -- $file
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

