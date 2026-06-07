$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$fixturePath = Join-Path $repoRoot "src/lib/quality-engine/draft-ptr-gate-v1.test-data.ts"

if (-not (Test-Path $fixturePath)) {
  throw "Missing Draft PTR Gate golden fixture file: $fixturePath"
}

$requiredFixtureIds = @(
  "passing-draft-ptr",
  "blocker-draft-ptr",
  "gateway-safety",
  "source-coverage-advisory-only"
)

foreach ($fixtureId in $requiredFixtureIds) {
  if (-not (Select-String -Path $fixturePath -SimpleMatch $fixtureId -Quiet)) {
    throw "Missing Draft PTR Gate golden fixture id: $fixtureId"
  }
}

Push-Location $repoRoot
try {
  npx.cmd tsc --noEmit
  Write-Host "Draft PTR Gate golden fixtures are present and type-check successfully."
  Write-Host "No executable TypeScript test runner is configured; assertions live in $fixturePath."
} finally {
  Pop-Location
}
