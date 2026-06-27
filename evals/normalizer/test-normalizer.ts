import assert from "node:assert/strict";
import type { ProviderOutputNormalizerIssue } from "@/lib/ai/provider-output-normalizer";
import { normalizeProviderOutput } from "@/lib/ai/provider-output-normalizer";
import { providerOutputNormalizerGoldenFixtures } from "@/lib/ai/provider-output-normalizer.test-data";

function issueSig(i: ProviderOutputNormalizerIssue) {
  return { code: i.code, path: i.path };
}

let passed = 0;
let failed = 0;

for (const fixture of providerOutputNormalizerGoldenFixtures) {
  try {
    const result = normalizeProviderOutput(fixture.input, fixture.context);
    assert.deepStrictEqual(
      result.normalizedOutput,
      fixture.expected.normalizedOutput,
      "normalizedOutput"
    );
    assert.deepStrictEqual(
      result.warnings.map(issueSig),
      fixture.expected.warningIssues,
      "warningIssues"
    );
    assert.deepStrictEqual(
      result.errors.map(issueSig),
      fixture.expected.errorIssues,
      "errorIssues"
    );
    assert.deepStrictEqual(result.changedPaths, fixture.expected.changedPaths, "changedPaths");
    console.log(`PASS  ${fixture.id}`);
    passed++;
  } catch (err) {
    const detail =
      err instanceof assert.AssertionError
        ? `[${err.message}]\n        actual:   ${JSON.stringify(err.actual)}\n        expected: ${JSON.stringify(err.expected)}`
        : String(err);
    console.error(`FAIL  ${fixture.id}: ${detail}`);
    failed++;
  }
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
