import { createMockAIResponseMeta } from "@/lib/ai/ai-orchestration-types";
import type { AIQARequest, AIQAResponse } from "@/lib/ai/ai-qa-types";

export function runMockAIQA(request: AIQARequest): AIQAResponse {
  const firstRuleIssue = request.qaIssues?.find(
    (issue) => (issue.recommendations ?? []).length > 0
  );
  const firstRuleRecommendation = firstRuleIssue?.recommendations?.[0];
  const targetTask =
    (firstRuleIssue
      ? request.processTasks.find((task) => task.stepId === firstRuleIssue.stepId)
      : undefined) ??
    request.processTasks.find((task) => task.reviewStatus !== "needsReview") ??
    request.processTasks[0];

  return {
    recommendations: firstRuleRecommendation
      ? [
          {
            ...firstRuleRecommendation,
            id: `mock-ai-qa-${firstRuleRecommendation.id ?? firstRuleIssue?.id ?? targetTask?.stepId}`,
            source: "hybrid",
            title: `AI context: ${firstRuleRecommendation.title}`,
            description:
              "Mock AI QA reviewed the rule-based issue and returns a hybrid recommendation with added rationale instead of duplicating the rule blindly.",
            rationale:
              "Rule QA ran first. This mock AI recommendation references an existing rule recommendation and adds human-review context.",
            requiresConfirmation: true,
            complianceTags: [
              ...(firstRuleRecommendation.complianceTags ?? []),
              "ai-qa-v2",
              "rule-context"
            ]
          }
        ]
      : targetTask
        ? [
            {
              id: `mock-ai-qa-${targetTask.stepId}-mark-review`,
              source: "ai",
              issueId: `mock-ai-qa-${targetTask.stepId}`,
              issueCode: "AI_QA_REVIEW",
              recommendationType: "MarkReviewStatus",
              type: "MarkReviewStatus",
              title: `AI review: mark ${targetTask.stepId} for review`,
              description:
                "Mock AI QA suggests marking this row for human review before final artifact generation.",
              rationale:
                "This is a local mock recommendation used to test the AI QA workflow without an external API call.",
              confidence: "high",
              impact: "low",
              riskLevel: "low",
              targetStepIds: [targetTask.stepId],
              patch: {
                reviewStatus: "needsReview"
              },
              operations: [
                {
                  kind: "MarkReviewStatus",
                  stepId: targetTask.stepId,
                  reviewStatus: "needsReview"
                }
              ],
              previewText: `${targetTask.stepId}: reviewStatus = needsReview`,
              warnings: [
                "Mock AI QA only. No external API call was made and no data left the app."
              ],
              requiresConfirmation: true,
              complianceTags: ["mock-ai", "human-review", "local-only"]
            }
          ]
      : [],
    meta: createMockAIResponseMeta(request.context, [], [
      "Mock AI QA scaffold only; no external API call was made."
    ])
  };
}
