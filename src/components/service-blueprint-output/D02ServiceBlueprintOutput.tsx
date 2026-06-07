"use client";

import { useEffect, useState } from "react";
import { SessionFrame } from "@/components/layout/SessionFrame";
import { D02ServiceBlueprintPreview } from "@/components/preview/D02ServiceBlueprintPreview";
import { saveAuditLogEntry } from "@/lib/audit/audit-log";
import {
  confirmRealAICallIfNeeded,
  createAISkillRequestBody,
  logAICallAudit
} from "@/lib/ai/ai-governance";
import { getAIValidationUserMessage } from "@/lib/ai/user-facing-ai-errors";
import type { TemplateRecommendation } from "@/lib/ai/ai-template-review-types";
import { generateServiceBlueprintDrawioXml } from "@/lib/generators/drawio-service-blueprint-generator";
import type { ProcessTask } from "@/lib/models/process-task";
import type { TemplateProfile } from "@/lib/models/template-profile";
import {
  runD02PostGenerationGate,
  type GateVerdict
} from "@/lib/quality-engine";
import { validateProcessTasks } from "@/lib/qa/task-register-rules";
import type { QARecommendation } from "@/lib/recommendation-engine/types";
import {
  sampleBpmnTemplateProfile,
  sampleProcessTasks,
  sampleServiceBlueprintTemplateProfile
} from "@/lib/sample-data/sme-online-loan";

const ARTIFACT_REVIEW_SKILL_ID = "artifact-review";
const TASKS_STORAGE_KEY = "process-blueprint-ai-workbench:process-tasks";
const TEMPLATES_STORAGE_KEY =
  "process-blueprint-ai-workbench:template-profiles";
const D02_STORAGE_KEY = "process-blueprint-ai-workbench:selected-d02-template";
const D02_GENERATED_XML_KEY =
  "process-blueprint-ai-workbench:generated-d02-service-blueprint-xml";
const D02_GENERATED_STATUS_KEY =
  "process-blueprint-ai-workbench:generated-d02-service-blueprint-status";
const ARTIFACT_STATUS_EVENT = "process-blueprint-artifact-status-change";
const TEMPLATE_MANAGER_EVENT = "process-blueprint-open-template-manager";

function readProcessTasks() {
  const savedTasks = window.localStorage.getItem(TASKS_STORAGE_KEY);

  if (!savedTasks) {
    return sampleProcessTasks;
  }

  const parsedTasks = JSON.parse(savedTasks);

  if (!Array.isArray(parsedTasks)) {
    throw new Error("Dữ liệu Process Task Register đã lưu không hợp lệ.");
  }

  return parsedTasks as ProcessTask[];
}

function readSelectedD02Template() {
  const savedTemplates = window.localStorage.getItem(TEMPLATES_STORAGE_KEY);
  const selectedTemplateId =
    window.localStorage.getItem(D02_STORAGE_KEY) ??
    sampleServiceBlueprintTemplateProfile.id;
  const sampleTemplates = [
    sampleServiceBlueprintTemplateProfile,
    sampleBpmnTemplateProfile
  ];

  if (!savedTemplates) {
    return (
      sampleTemplates.find((template) => template.id === selectedTemplateId) ??
      sampleServiceBlueprintTemplateProfile
    );
  }

  const parsedTemplates = JSON.parse(savedTemplates);

  if (!Array.isArray(parsedTemplates)) {
    throw new Error("Dữ liệu Template Library đã lưu không hợp lệ.");
  }

  const templates = parsedTemplates as TemplateProfile[];

  return (
    templates.find((template) => template.id === selectedTemplateId) ??
    sampleServiceBlueprintTemplateProfile
  );
}

function createTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

type ArtifactStatus = "fresh" | "stale" | "not_generated";

type ArtifactReviewResult = {
  recommendations: QARecommendation[];
  templateRecommendations: TemplateRecommendation[];
  warnings: string[];
};

type ArtifactBusinessSummary = {
  taskCount: number;
  actorCount: number;
  systemCount: number;
  actors: string[];
  systems: string[];
};

function summarizeProcessTasks(tasks: ProcessTask[]): ArtifactBusinessSummary {
  const actors = Array.from(
    new Set(tasks.map((task) => task.actor).filter(Boolean))
  ).sort();
  const systems = Array.from(
    new Set(tasks.map((task) => task.system).filter(Boolean))
  ).sort();

  return {
    taskCount: tasks.length,
    actorCount: actors.length,
    systemCount: systems.length,
    actors,
    systems
  };
}

function readArtifactStatus(): ArtifactStatus {
  const status = window.localStorage.getItem(D02_GENERATED_STATUS_KEY);

  return status === "fresh" || status === "stale" ? status : "not_generated";
}

function getGateStatusClass(verdict: GateVerdict) {
  if (verdict.status === "fail") {
    return "border-red-200 bg-red-50 text-red-800";
  }

  if (verdict.status === "warning") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-800";
}

function getFriendlyAIReviewErrorMessage(error?: string, validationErrors?: string[]) {
  if (validationErrors?.length) {
    return getAIValidationUserMessage(validationErrors);
  }

  const normalizedError = (error ?? "").toLowerCase();

  if (normalizedError.includes("timeout") || normalizedError.includes("timed out")) {
    return "AI review timed out. Nothing was applied; you can retry with the current draw.io XML.";
  }

  if (
    normalizedError.includes("network") ||
    normalizedError.includes("fetch") ||
    normalizedError.includes("failed")
  ) {
    return "AI review could not reach the service. Nothing was applied; check the connection or retry.";
  }

  return "AI review could not complete. Nothing was applied; you can retry with the current draw.io XML.";
}

function PostGateVerdictSummary({ verdict }: { verdict: GateVerdict | null }) {
  if (!verdict) {
    return null;
  }

  return (
    <div className={`mb-4 rounded border p-3 text-sm ${getGateStatusClass(verdict)}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold">
          Post-generation gate: {verdict.status.toUpperCase()}
        </p>
        <p>
          Blockers: {verdict.summary.blockerCount} / Warnings:{" "}
          {verdict.summary.warningCount}
        </p>
      </div>
      {verdict.issues.length > 0 ? (
        <details className="mt-2">
          <summary className="cursor-pointer font-medium">
            View gate findings
          </summary>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {verdict.issues.slice(0, 6).map((issue) => (
              <li key={`${issue.code}-${issue.title}`}>
                <span className="font-medium">{issue.title}</span>:{" "}
                {issue.description}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}

export function D02ServiceBlueprintOutput() {
  const [xml, setXml] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<ArtifactStatus>("not_generated");
  const [postGateVerdict, setPostGateVerdict] =
    useState<GateVerdict | null>(null);
  const [selectedTemplateName, setSelectedTemplateName] = useState(
    sampleServiceBlueprintTemplateProfile.name
  );
  const [businessSummary, setBusinessSummary] =
    useState<ArtifactBusinessSummary>(() =>
      summarizeProcessTasks(sampleProcessTasks)
    );
  const [reviewResult, setReviewResult] = useState<ArtifactReviewResult | null>(
    null
  );
  const [isReviewing, setIsReviewing] = useState(false);
  const [realAIEnabled, setRealAIEnabled] = useState(false);
  const [canRetryAIReview, setCanRetryAIReview] = useState(false);

  function openTemplateManager() {
    window.dispatchEvent(new Event(TEMPLATE_MANAGER_EVENT));
  }

  function refreshStatus() {
    setStatus(readArtifactStatus());
  }

  useEffect(() => {
    refreshStatus();
    window.addEventListener(ARTIFACT_STATUS_EVENT, refreshStatus);

    return () => {
      window.removeEventListener(ARTIFACT_STATUS_EVENT, refreshStatus);
    };
  }, []);

  useEffect(() => {
    let active = true;

    try {
      setSelectedTemplateName(readSelectedD02Template().name);
      setBusinessSummary(summarizeProcessTasks(readProcessTasks()));
    } catch {
      setSelectedTemplateName(sampleServiceBlueprintTemplateProfile.name);
      setBusinessSummary(summarizeProcessTasks(sampleProcessTasks));
    }

    async function loadAIMode() {
      try {
        const response = await fetch("/api/ai/run-skill", {
          method: "GET"
        });
        const data = (await response.json()) as {
          realAIEnabled?: boolean;
        };

        if (active) {
          setRealAIEnabled(data.realAIEnabled === true);
        }
      } catch {
        if (active) {
          setRealAIEnabled(false);
        }
      }
    }

    loadAIMode();

    return () => {
      active = false;
    };
  }, []);

  function generateXml() {
    try {
      const processTasks = readProcessTasks();
      const selectedTemplate = readSelectedD02Template();
      const generatedXml = generateServiceBlueprintDrawioXml(
        processTasks,
        selectedTemplate
      );

      if (!generatedXml.trim()) {
        throw new Error("Generator không tạo ra draw.io XML.");
      }

      const verdict = runD02PostGenerationGate(generatedXml);

      setXml(generatedXml);
      setPostGateVerdict(verdict);
      setSelectedTemplateName(selectedTemplate.name);
      setBusinessSummary(summarizeProcessTasks(processTasks));
      setReviewResult(null);
      setCanRetryAIReview(false);
      window.localStorage.setItem(D02_GENERATED_XML_KEY, generatedXml);
      window.localStorage.setItem(D02_GENERATED_STATUS_KEY, "fresh");
      window.dispatchEvent(new Event(ARTIFACT_STATUS_EVENT));
      setStatus("fresh");
      saveAuditLogEntry({
        action: "generate_d02",
        status: "success",
        summary: "Generated D02 Service Blueprint draw.io XML.",
        metadata: {
          rowCount: processTasks.length,
          templateId: selectedTemplate.id
        }
      });
      setMessage(
        `Đã generate D02 từ Process Task Register hiện tại và template: ${selectedTemplate.name}.`
      );
    } catch (error) {
      setXml("");
      setPostGateVerdict(null);
      setMessage(
        error instanceof Error
          ? `Không thể generate D02 Service Blueprint: ${error.message}`
          : "Không thể generate D02 Service Blueprint. Vui lòng kiểm tra dữ liệu đầu vào."
      );
    }
  }

  async function reviewServiceBlueprintWithAI() {
    if (!xml.trim()) {
      setMessage("Generate D02 Service Blueprint before running AI review.");
      return;
    }

    const processTasks = readProcessTasks();
    const selectedTemplate = readSelectedD02Template();
    if (!confirmRealAICallIfNeeded(realAIEnabled)) {
      return;
    }

    setIsReviewing(true);
    setReviewResult(null);
    setCanRetryAIReview(false);
    setMessage("AI review is running...");

    try {
      const response = await fetch("/api/ai/run-skill", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(
          createAISkillRequestBody({
            skillId: ARTIFACT_REVIEW_SKILL_ID,
            payload: {
            artifactType: "service-blueprint",
            artifactXml: xml,
            processTasks,
            selectedTemplate,
            qaIssues: validateProcessTasks(processTasks)
          }
          })
        )
      });
      const data = (await response.json()) as {
        ok?: boolean;
        error?: string;
        validationErrors?: string[];
        result?: Partial<ArtifactReviewResult>;
        meta?: {
          externalApiCalled?: boolean;
          providerId?: string;
          validationPassed?: boolean;
        };
      };

      if (!response.ok || !data.ok || !data.result) {
        const errorMessage = [
          data.error ?? "AI artifact review failed.",
          ...(data.validationErrors ?? [])
        ].join(" ");
        const friendlyMessage = getFriendlyAIReviewErrorMessage(
          data.error,
          data.validationErrors
        );
        logAICallAudit({
          skillId: ARTIFACT_REVIEW_SKILL_ID,
          success: false,
          errorMessage,
          realAIEnabled,
          externalApiCalled: data.meta?.externalApiCalled,
          extraMetadata: {
            artifactType: "service-blueprint"
          }
        });
        throw new Error(friendlyMessage);
      }

      const result: ArtifactReviewResult = {
        recommendations: data.result.recommendations ?? [],
        templateRecommendations: data.result.templateRecommendations ?? [],
        warnings: data.result.warnings ?? []
      };

      setReviewResult(result);
      logAICallAudit({
        skillId: ARTIFACT_REVIEW_SKILL_ID,
        success: true,
        realAIEnabled,
        externalApiCalled: data.meta?.externalApiCalled,
        extraMetadata: {
          artifactType: "service-blueprint",
          ptrRecommendationCount: result.recommendations.length,
          templateRecommendationCount: result.templateRecommendations.length,
          warningCount: result.warnings.length
        }
      });
      setCanRetryAIReview(false);
      setMessage("AI review completed. Results are preview only; draw.io XML was not changed.");
    } catch (error) {
      setCanRetryAIReview(Boolean(xml.trim()));
      setMessage(
        error instanceof Error ? error.message : getFriendlyAIReviewErrorMessage()
      );
    } finally {
      setIsReviewing(false);
    }
  }

  function downloadDrawio() {
    if (!xml.trim()) {
      setMessage(
        "Chưa có draw.io XML để download. Vui lòng bấm Generate D02 Service Blueprint trước."
      );
      return;
    }

    if (postGateVerdict?.status === "fail") {
      setMessage("D02 post-generation gate failed. Fix blockers before downloading.");
      return;
    }

    const blob = new Blob([xml], { type: "application/xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `D02_Service_Blueprint_${createTimestamp()}.drawio`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setMessage("Đã tạo file .drawio để download.");
  }

  return (
    <SessionFrame
      actions={
        <>
            <button
              className="btn btn-primary"
              onClick={generateXml}
              type="button"
            >
              Generate D02 Service Blueprint
            </button>
            <button
              className="btn btn-secondary"
              disabled={postGateVerdict?.status === "fail"}
              onClick={downloadDrawio}
              type="button"
            >
              Download .drawio
            </button>
            <button
              className="btn btn-ai"
              disabled={isReviewing || !xml.trim()}
              onClick={reviewServiceBlueprintWithAI}
              type="button"
            >
              {isReviewing ? "Reviewing..." : "Review Service Blueprint with AI"}
            </button>
            <button
              className="btn btn-secondary"
              onClick={openTemplateManager}
              type="button"
            >
              Manage templates
            </button>
        </>
      }
      bodyClassName="p-4"
      description="Tạo draw.io XML từ Process Task Register đã lưu và template D02 đang chọn. File có thể mở bằng draw.io / diagrams.net."
      title="Generate D02 Service Blueprint"
    >
        <p className="mb-2 text-sm font-medium uppercase text-slate-500">
          D02 Service Blueprint Output
        </p>
        <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded border border-slate-200 bg-white px-2 py-1 text-slate-700">
            Template: {selectedTemplateName}
          </span>
          <span
            className={`rounded border px-2 py-1 ${
              status === "fresh"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : status === "stale"
                  ? "border-amber-200 bg-amber-50 text-amber-700"
                  : "border-slate-200 bg-slate-50 text-slate-500"
            }`}
          >
            Status:{" "}
            {status === "fresh"
              ? "Fresh"
              : status === "stale"
                ? "Stale - regenerate after data/template changes"
                : "Not generated"}
          </span>
          <span className="rounded border border-slate-200 bg-white px-2 py-1 text-slate-700">
            Gate: {postGateVerdict?.status.toUpperCase() ?? "Not generated"}
          </span>
        </div>
        <p
          className={`sr-only ${
            status === "fresh"
              ? "text-emerald-700"
              : status === "stale"
                ? "text-amber-700"
                : "text-slate-500"
          }`}
        >
          Trạng thái D02:{" "}
          {status === "fresh"
            ? "Fresh"
            : status === "stale"
              ? "Stale - cần generate lại sau khi dữ liệu/template thay đổi"
              : "Not generated"}
        </p>
        {message ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-800">
            <span>{message}</span>
            {canRetryAIReview && xml.trim() && !isReviewing ? (
              <button
                className="rounded border border-sky-300 bg-white px-2 py-1 text-xs font-semibold text-sky-800 hover:bg-sky-100"
                onClick={() => void reviewServiceBlueprintWithAI()}
                type="button"
              >
                Retry
              </button>
            ) : null}
          </div>
        ) : null}

        <div className="mb-4 rounded border border-slate-200 bg-slate-50 p-3">
          <p className="text-sm font-semibold text-slate-900">
            Business summary
          </p>
          <div className="mt-3 grid gap-2 md:grid-cols-4">
            <div className="rounded border border-slate-200 bg-white px-3 py-2">
              <p className="text-xs font-semibold uppercase text-slate-500">
                Tasks
              </p>
              <p className="mt-1 text-lg font-semibold text-slate-950">
                {businessSummary.taskCount}
              </p>
            </div>
            <div className="rounded border border-slate-200 bg-white px-3 py-2">
              <p className="text-xs font-semibold uppercase text-slate-500">
                Actors
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-950">
                {businessSummary.actorCount}
              </p>
              <p className="mt-1 truncate text-xs text-slate-500">
                {businessSummary.actors.join(", ") || "None"}
              </p>
            </div>
            <div className="rounded border border-slate-200 bg-white px-3 py-2">
              <p className="text-xs font-semibold uppercase text-slate-500">
                Systems
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-950">
                {businessSummary.systemCount}
              </p>
              <p className="mt-1 truncate text-xs text-slate-500">
                {businessSummary.systems.join(", ") || "None"}
              </p>
            </div>
            <div className="rounded border border-slate-200 bg-white px-3 py-2">
              <p className="text-xs font-semibold uppercase text-slate-500">
                Template / Gate
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-950">
                {selectedTemplateName}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Gate: {postGateVerdict?.status.toUpperCase() ?? "Not generated"}
              </p>
              <button
                className="mt-2 rounded border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                onClick={openTemplateManager}
                type="button"
              >
                Manage templates
              </button>
            </div>
          </div>
        </div>

        <PostGateVerdictSummary verdict={postGateVerdict} />

        <div className="mb-4">
          <D02ServiceBlueprintPreview
            artifactStatus={
              status === "fresh"
                ? "Fresh"
                : status === "stale"
                  ? "Stale"
                  : "Not generated"
            }
            gateStatus={postGateVerdict?.status.toUpperCase()}
            templateName={selectedTemplateName}
          />
        </div>

        {reviewResult ? (
          <div className="mb-4 rounded border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
            <p className="font-semibold text-slate-900">AI artifact review</p>
            <p className="mt-1">
              PTR recommendations: {reviewResult.recommendations.length} · Template recommendations:{" "}
              {reviewResult.templateRecommendations.length} · Warnings:{" "}
              {reviewResult.warnings.length}
            </p>
            {reviewResult.warnings.length > 0 ? (
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {reviewResult.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        <details className="rounded border border-slate-200 bg-slate-50">
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-800">
            Advanced / View draw.io XML
          </summary>
          <div className="border-t border-slate-200 p-4">
        <label className="grid min-w-0 gap-2 text-sm font-medium text-slate-700">
          draw.io XML đã generate
          <textarea
            className="min-h-96 w-full rounded border border-slate-300 bg-slate-950 p-3 font-mono text-xs font-normal text-slate-50"
            readOnly
            value={xml}
          />
        </label>
          </div>
        </details>
    </SessionFrame>
  );
}
