import type {
  QARecommendation,
  QARecommendationOperation,
  RecommendationSource
} from "@/lib/recommendation-engine/types";

const STORAGE_KEY = "process-blueprint-recommendation-feedback";

export type RecommendationUserAction = "accepted" | "rejected" | "skipped";

export type RecommendationFeedbackRecord = {
  recordType: "recommendation";
  recommendationId: string;
  issueCode?: string;
  source?: RecommendationSource;
  userAction: RecommendationUserAction;
  reason?: string;
  originalRecommendation: QARecommendation;
  finalAppliedOperations: QARecommendationOperation[];
  affectedStepIds: string[];
  timestamp: string;
};

export type RecommendationBatchSummaryRecord = {
  recordType: "batchSummary";
  batchId: string;
  recommendationCount: number;
  appliedCount: number;
  skippedCount: number;
  affectedStepIds: string[];
  warnings: string[];
  conflicts: string[];
  timestamp: string;
};

export type RecommendationFeedbackEntry =
  | RecommendationFeedbackRecord
  | RecommendationBatchSummaryRecord;

function canUseLocalStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

export function loadRecommendationFeedback(): RecommendationFeedbackEntry[] {
  if (!canUseLocalStorage()) {
    return [];
  }

  try {
    const savedFeedback = window.localStorage.getItem(STORAGE_KEY);

    if (!savedFeedback) {
      return [];
    }

    const parsedFeedback = JSON.parse(savedFeedback);

    return Array.isArray(parsedFeedback) ? parsedFeedback : [];
  } catch {
    return [];
  }
}

export function saveRecommendationFeedback(
  feedback: RecommendationFeedbackEntry | RecommendationFeedbackEntry[]
) {
  if (!canUseLocalStorage()) {
    return;
  }

  const nextFeedback = [
    ...loadRecommendationFeedback(),
    ...(Array.isArray(feedback) ? feedback : [feedback])
  ];

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextFeedback));
}

export function exportRecommendationFeedbackJson() {
  return JSON.stringify(loadRecommendationFeedback(), null, 2);
}

export function clearRecommendationFeedback() {
  if (!canUseLocalStorage()) {
    return;
  }

  window.localStorage.removeItem(STORAGE_KEY);
}
