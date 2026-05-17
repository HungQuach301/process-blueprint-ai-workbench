$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

Write-Host "Running TypeScript check..." -ForegroundColor Cyan
npx.cmd tsc --noEmit

Write-Host "Running build..." -ForegroundColor Cyan
npm run build

if (Test-Path "package.json") {
  $package = Get-Content "package.json" -Raw
  if ($package -match '"test:golden"') {
    Write-Host "Running golden tests..." -ForegroundColor Cyan
    npm run test:golden
  }
}

Write-Host "Git diff stat:" -ForegroundColor Cyan
git diff --stat

Write-Host "Git status:" -ForegroundColor Cyan
git status --short
