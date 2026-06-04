import type { RecommendationSkillProfile } from "@/lib/recommendation-engine/types";

export type { RecommendationSkillProfile } from "@/lib/recommendation-engine/types";

export const defaultRuleBasedRecommendationSkillProfile: RecommendationSkillProfile = {
  id: "rule-based-qa-recommendations",
  name: "Rule-based QA Recommendations",
  version: "1.0.0",
  description: "Deterministic recommendations generated from Process Task Register QA rules.",
  supportedSources: ["rule"],
  enabled: true
};
