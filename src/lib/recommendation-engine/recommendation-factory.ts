import type {
  QARecommendation,
  QARecommendationType,
  RecommendationRiskLevel,
  RecommendationSource
} from "@/lib/recommendation-engine/types";

type RecommendationFactoryInput = Omit<
  QARecommendation,
  "source" | "recommendationType" | "type" | "riskLevel" | "requiresConfirmation"
> & {
  source?: RecommendationSource;
  recommendationType?: QARecommendationType;
  type?: QARecommendationType;
  riskLevel?: RecommendationRiskLevel;
  requiresConfirmation?: boolean;
};

export function normalizeRecommendation(recommendation: QARecommendation): QARecommendation {
  const recommendationType = recommendation.recommendationType ?? recommendation.type ?? "UpdateField";

  return {
    source: recommendation.source ?? "rule",
    riskLevel: recommendation.riskLevel ?? "medium",
    complianceTags: recommendation.complianceTags ?? [],
    ...recommendation,
    recommendationType,
    type: recommendation.type ?? recommendationType,
    requiresConfirmation: recommendation.requiresConfirmation ?? true
  };
}

export function createQARecommendation(input: RecommendationFactoryInput): QARecommendation {
  return normalizeRecommendation({
    ...input,
    confidence: input.confidence,
    impact: input.impact,
    previewText: input.previewText,
    targetStepIds: input.targetStepIds,
    title: input.title,
    description: input.description,
    requiresConfirmation: input.requiresConfirmation ?? true
  });
}

export function createRuleRecommendation(input: RecommendationFactoryInput): QARecommendation {
  return createQARecommendation({
    ...input,
    source: "rule"
  });
}
