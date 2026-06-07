$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$fixturePath = Join-Path $repoRoot "src/lib/ai/provider-output-normalizer.test-data.ts"

if (-not (Test-Path $fixturePath)) {
  throw "Missing provider normalizer golden fixture file: $fixturePath"
}

$requiredFixtureIds = @(
  "already-normalized-draft-ptr",
  "wrapped-draft-ptr-with-aliases",
  "nested-result-wrapper-is-not-deep-normalized",
  "unsafe-broken-step-reference",
  "unknown-output-schema"
)

foreach ($fixtureId in $requiredFixtureIds) {
  if (-not (Select-String -Path $fixturePath -SimpleMatch $fixtureId -Quiet)) {
    throw "Missing provider normalizer golden fixture id: $fixtureId"
  }
}

Push-Location $repoRoot
try {
  npx.cmd tsc --noEmit
  Write-Host "Provider normalizer golden fixtures are present and type-check successfully."
  Write-Host "No executable TypeScript test runner is configured; assertions live in $fixturePath."
} finally {
  Pop-Location
}

