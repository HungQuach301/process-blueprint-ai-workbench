export type {
  GateBlocker,
  GateIssue,
  GateIssueSeverity,
  GateScoreBreakdown,
  GateScoreDimension,
  GateVerdict,
  GateVerdictStatus,
  GateVerdictSummary,
  GateWarning
} from "@/lib/quality-engine/gate-verdict";

export {
  createGateVerdict,
  createGateVerdictSummary,
  GATE_ISSUE_SEVERITIES,
  GATE_VERDICT_STATUSES,
  inferGateVerdictStatus,
  splitGateIssues
} from "@/lib/quality-engine/gate-verdict";

export type {
  ChainConfig,
  ChainStepResult,
  ChainStepResultStatus
} from "@/lib/quality-engine/chain-resilience";

export {
  CHAIN_STEP_RESULT_STATUSES
} from "@/lib/quality-engine/chain-resilience";

export { runDraftPtrGateV1 } from "@/lib/quality-engine/draft-ptr-gate-v1";

export {
  D01_PRE_GENERATION_GATE_ID,
  runD01PreGenerationGate
} from "@/lib/quality-engine/d01-pre-generation-gate";

export {
  D01_POST_GENERATION_GATE_ID,
  runD01PostGenerationGate
} from "@/lib/quality-engine/d01-post-generation-gate";

export {
  D02_PRE_GENERATION_GATE_ID,
  runD02PreGenerationGate
} from "@/lib/quality-engine/d02-pre-generation-gate";

export {
  D02_POST_GENERATION_GATE_ID,
  runD02PostGenerationGate
} from "@/lib/quality-engine/d02-post-generation-gate";

export type {
  SourceCoverageAdvisory,
  SourceCoverageAdvisoryStatus,
  SourceCoverageMode,
  SourceCoverageSignal
} from "@/lib/quality-engine/source-coverage-advisory";

export {
  createSourceCoverageAdvisory
} from "@/lib/quality-engine/source-coverage-advisory";

export type {
  QualityGateIssue,
  QualityGateResult,
  QualityGateSeverity
} from "@/lib/quality-engine/ai-draft-quality-gate";

export {
  formatQualityGateErrorsVi,
  formatQualityGateWarningsVi,
  runBriefQualityGate,
  runDraftProcessTaskRegisterQualityGate
} from "@/lib/quality-engine/ai-draft-quality-gate";
