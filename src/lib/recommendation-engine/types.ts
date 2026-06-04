import type { ProcessTask } from "@/lib/models/process-task";
import type { TemplateProfile } from "@/lib/models/template-profile";
import type { Workspace } from "@/lib/models/workspace";

export type RecommendationSource = "rule" | "ai" | "hybrid" | "human-template";

export type QARecommendationType =
  | "UpdateField"
  | "SplitTask"
  | "CreateTask"
  | "CreateLane"
  | "AssignSystem"
  | "AssignActor"
  | "ChangeBpmnType"
  | "ChangeRowType"
  | "SetInteractionType"
  | "MarkReviewStatus"
  | "AddGatewayBranch";

export type QARecommendationImpact = "low" | "medium" | "high";

export type QARecommendationConfidence = "low" | "medium" | "high";

export type RecommendationRiskLevel = "low" | "medium" | "high";

export type RecommendationContext = {
  workspace?: Workspace;
  processTasks: ProcessTask[];
  templateProfiles?: TemplateProfile[];
  selectedD01Template?: TemplateProfile;
  selectedD02Template?: TemplateProfile;
  issueId?: string;
  issueCode?: string;
  metadata?: Record<string, unknown>;
};

export type QARecommendationPatch = Partial<
  Pick<
    ProcessTask,
    | "rowType"
    | "bpmnType"
    | "taskNature"
    | "phase"
    | "group"
    | "actor"
    | "actorLane"
    | "system"
    | "systemLane"
    | "dataObject"
    | "dataAction"
    | "taskName"
    | "input"
    | "output"
    | "defaultNextStep"
    | "conditionQuestion"
    | "yesNextStep"
    | "noNextStep"
    | "exception"
    | "exceptionHandling"
    | "sla"
    | "riskControl"
    | "sourceRef"
    | "reviewStatus"
    | "comment"
    | "customerInteractionType"
    | "channel"
  >
>;

export type QAConnectionField = "defaultNextStep" | "yesNextStep" | "noNextStep";

export type QARecommendationOperation =
  | {
      kind: "UpdateTaskField";
      stepId: string;
      field: keyof QARecommendationPatch;
      value: QARecommendationPatch[keyof QARecommendationPatch];
    }
  | {
      kind: "CreateTaskAfter";
      anchorStepId: string;
      task: ProcessTask;
      connect?: boolean;
    }
  | {
      kind: "CreateTaskBefore";
      anchorStepId: string;
      task: ProcessTask;
      connect?: boolean;
    }
  | {
      kind: "InsertTaskBetween";
      sourceStepId: string;
      targetStepId: string;
      task: ProcessTask;
    }
  | {
      kind: "SplitTask";
      targetStepId: string;
      newTasks: ProcessTask[];
    }
  | {
      kind: "CreateGateway";
      gatewayTask: ProcessTask;
      afterStepId?: string;
      beforeStepId?: string;
    }
  | {
      kind: "AddGatewayBranch";
      gatewayStepId: string;
      branch: QAConnectionField;
      targetStepId?: string;
      newTask?: ProcessTask;
    }
  | {
      kind: "UpdateConnection";
      stepId: string;
      field: QAConnectionField;
      value: string | null;
    }
  | {
      kind: "CreateLane";
      laneName: string;
      laneType: "actor" | "system" | "data";
      targetStepIds?: string[];
    }
  | {
      kind: "AssignActor";
      stepId: string;
      actor: string;
      actorLane?: string;
    }
  | {
      kind: "AssignSystem";
      stepId: string;
      system: string;
      systemLane?: string;
    }
  | {
      kind: "SetInteractionType";
      stepId: string;
      customerInteractionType: ProcessTask["customerInteractionType"];
    }
  | {
      kind: "MarkReviewStatus";
      stepId: string;
      reviewStatus: ProcessTask["reviewStatus"];
    };

export type QARecommendation = {
  id?: string;
  source?: RecommendationSource;
  issueId?: string;
  issueCode?: string;
  title: string;
  description: string;
  rationale?: string;
  confidence: QARecommendationConfidence;
  impact: QARecommendationImpact;
  riskLevel?: RecommendationRiskLevel;
  targetStepIds: string[];
  recommendationType?: QARecommendationType;
  type?: QARecommendationType;
  operations?: QARecommendationOperation[];
  previewText: string;
  patch?: QARecommendationPatch;
  newTasks?: ProcessTask[];
  warnings?: string[];
  requiresConfirmation: boolean;
  complianceTags?: string[];
};

export type RecommendationFeedback = {
  recommendationId: string;
  issueId?: string;
  issueCode?: string;
  accepted: boolean;
  applied: boolean;
  reason?: string;
  userComment?: string;
  createdAt: string;
};

export type RecommendationSkillProfile = {
  id: string;
  name: string;
  version: string;
  description?: string;
  supportedSources: RecommendationSource[];
  supportedIssueCodes?: string[];
  supportedRecommendationTypes?: QARecommendationType[];
  complianceTags?: string[];
  enabled: boolean;
};
