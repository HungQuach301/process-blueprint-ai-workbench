import type { GateVerdict } from "@/lib/quality-engine/gate-verdict";

export const CHAIN_STEP_RESULT_STATUSES = [
  "pass",
  "warning",
  "fail",
  "skipped"
] as const;

export type ChainStepResultStatus =
  (typeof CHAIN_STEP_RESULT_STATUSES)[number];

export type ChainStepResult = {
  stepId: string;
  stepName?: string;
  status: ChainStepResultStatus;
  outputSummary?: string;
  verdict?: GateVerdict;
  warnings: string[];
  errors: string[];
  skippedReason?: string;
  metadata?: Record<string, unknown>;
};

export type ChainConfig = {
  chainId: string;
  stepOrder: string[];
  continueOnWarning: boolean;
  stopOnFail: boolean;
  allowMissingVerdict?: boolean;
  metadata?: Record<string, unknown>;
};

