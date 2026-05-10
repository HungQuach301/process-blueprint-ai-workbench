"use client";

import { useEffect, useState } from "react";
import { SessionFrame } from "@/components/layout/SessionFrame";
import { D02ServiceBlueprintPreview } from "@/components/preview/D02ServiceBlueprintPreview";
import { saveAuditLogEntry } from "@/lib/audit/audit-log";
import {
  confirmRealAICallIfNeeded,
  logAICallAudit
} from "@/lib/ai/ai-governance";
import type { TemplateRecommendation } from "@/lib/ai/ai-template-review-types";
import { generateServiceBlueprintDrawioXml } from "@/lib/generators/drawio-service-blueprint-generator";
import type { ProcessTask } from "@/lib/models/process-task";
import type { TemplateProfile } from "@/lib/models/template-profile";
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

function readArtifactStatus(): ArtifactStatus {
  const status = window.localStorage.getItem(D02_GENERATED_STATUS_KEY);

  return status === "fresh" || status === "stale" ? status : "not_generated";
}

export function D02ServiceBlueprintOutput() {
  const [xml, setXml] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<ArtifactStatus>("not_generated");
  const [reviewResult, setReviewResult] = useState<ArtifactReviewResult | null>(
    null
  );
  const [isReviewing, setIsReviewing] = useState(false);
  const [realAIEnabled, setRealAIEnabled] = useState(false);

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

      setXml(generatedXml);
      setReviewResult(null);
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
      setMessage(
        error instanceof Error
          ? `Không thể generate D02 Service Blueprint: ${error.message}`
          : "Không thể generate D02 Service Blueprint. Vui lòng kiểm tra dữ liệu đầu vào."
      );
    }
  }

  async function reviewServiceBlueprintWithAI() {
    if (!xml.trim()) {
      setMessage(
        "ChÆ°a cÃ³ draw.io XML Ä‘á»ƒ review. Vui lÃ²ng generate D02 trÆ°á»›c."
      );
      return;
    }

    const processTasks = readProcessTasks();
    const selectedTemplate = readSelectedD02Template();
    if (!confirmRealAICallIfNeeded(realAIEnabled)) {
      return;
    }

    setIsReviewing(true);
    setReviewResult(null);
    setMessage("Äang review Service Blueprint báº±ng AI...");

    try {
      const response = await fetch("/api/ai/run-skill", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          skillId: ARTIFACT_REVIEW_SKILL_ID,
          payload: {
            artifactType: "service-blueprint",
            artifactXml: xml,
            processTasks,
            selectedTemplate,
            qaIssues: validateProcessTasks(processTasks)
          }
        })
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
        throw new Error(errorMessage);
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
      setMessage(
        "ÄÃ£ review Service Blueprint báº±ng AI. Káº¿t quáº£ chá»‰ lÃ  preview, khÃ´ng tá»± Ä‘á»™ng sá»­a draw.io XML."
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "KhÃ´ng thá»ƒ review Service Blueprint báº±ng AI."
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
              className="rounded bg-slate-950 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
              onClick={generateXml}
              type="button"
            >
              Generate D02 Service Blueprint
            </button>
            <button
              className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              onClick={downloadDrawio}
              type="button"
            >
              Download .drawio
            </button>
            <button
              className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isReviewing || !xml.trim()}
              onClick={reviewServiceBlueprintWithAI}
              type="button"
            >
              {isReviewing ? "Reviewing..." : "Review Service Blueprint with AI"}
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
        <p
          className={`mb-4 text-sm ${
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
        {message ? <p className="mt-3 text-sm text-slate-600">{message}</p> : null}

        <div className="mb-4">
          <D02ServiceBlueprintPreview />
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

        <label className="grid min-w-0 gap-2 text-sm font-medium text-slate-700">
          draw.io XML đã generate
          <textarea
            className="min-h-96 w-full rounded border border-slate-300 bg-slate-950 p-3 font-mono text-xs font-normal text-slate-50"
            readOnly
            value={xml}
          />
        </label>
    </SessionFrame>
  );
}
