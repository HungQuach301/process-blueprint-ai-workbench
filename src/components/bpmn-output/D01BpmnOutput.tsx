"use client";

import { useEffect, useState } from "react";
import { SessionFrame } from "@/components/layout/SessionFrame";
import { BpmnPreview } from "@/components/preview/BpmnPreview";
import { saveAuditLogEntry } from "@/lib/audit/audit-log";
import {
  confirmRealAICallIfNeeded,
  logAICallAudit
} from "@/lib/ai/ai-governance";
import type { TemplateRecommendation } from "@/lib/ai/ai-template-review-types";
import { generateBpmnXml } from "@/lib/generators/bpmn-generator";
import type { ProcessTask } from "@/lib/models/process-task";
import type { TemplateProfile } from "@/lib/models/template-profile";
import type { QARecommendation } from "@/lib/recommendation-engine/types";
import { validateProcessTasks } from "@/lib/qa/task-register-rules";
import {
  sampleBpmnTemplateProfile,
  sampleProcessTasks
} from "@/lib/sample-data/sme-online-loan";

const ARTIFACT_REVIEW_SKILL_ID = "artifact-review";
const TASKS_STORAGE_KEY = "process-blueprint-ai-workbench:process-tasks";
const TEMPLATES_STORAGE_KEY =
  "process-blueprint-ai-workbench:template-profiles";
const D01_STORAGE_KEY = "process-blueprint-ai-workbench:selected-d01-template";
const D01_GENERATED_XML_KEY =
  "process-blueprint-ai-workbench:generated-d01-bpmn-xml";
const D01_GENERATED_STATUS_KEY =
  "process-blueprint-ai-workbench:generated-d01-bpmn-status";
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

function readSelectedD01Template() {
  const savedTemplates = window.localStorage.getItem(TEMPLATES_STORAGE_KEY);
  const selectedTemplateId =
    window.localStorage.getItem(D01_STORAGE_KEY) ?? sampleBpmnTemplateProfile.id;

  if (!savedTemplates) {
    return sampleBpmnTemplateProfile;
  }

  const parsedTemplates = JSON.parse(savedTemplates);

  if (!Array.isArray(parsedTemplates)) {
    throw new Error("Dữ liệu Template Library đã lưu không hợp lệ.");
  }

  const templates = parsedTemplates as TemplateProfile[];

  return (
    templates.find((template) => template.id === selectedTemplateId) ??
    sampleBpmnTemplateProfile
  );
}

function createTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

type ArtifactReviewResult = {
  recommendations: QARecommendation[];
  templateRecommendations: TemplateRecommendation[];
  warnings: string[];
};

export function D01BpmnOutput() {
  const [xml, setXml] = useState("");
  const [message, setMessage] = useState("");
  const [reviewResult, setReviewResult] = useState<ArtifactReviewResult | null>(
    null
  );
  const [isReviewing, setIsReviewing] = useState(false);
  const [realAIEnabled, setRealAIEnabled] = useState(false);

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
      const selectedTemplate = readSelectedD01Template();
      const generatedXml = generateBpmnXml(processTasks, selectedTemplate);

      if (!generatedXml.trim()) {
        throw new Error("Generator không tạo ra XML.");
      }

      setXml(generatedXml);
      setReviewResult(null);
      window.localStorage.setItem(D01_GENERATED_XML_KEY, generatedXml);
      window.localStorage.setItem(D01_GENERATED_STATUS_KEY, "fresh");
      window.dispatchEvent(new Event(ARTIFACT_STATUS_EVENT));
      saveAuditLogEntry({
        action: "generate_d01",
        status: "success",
        summary: "Generated D01 BPMN XML.",
        metadata: {
          rowCount: processTasks.length,
          templateId: selectedTemplate.id
        }
      });
      setMessage("Đã generate D01 BPMN XML.");
    } catch (error) {
      setXml("");
      setMessage(
        error instanceof Error
          ? `Không thể generate D01 BPMN: ${error.message}`
          : "Không thể generate D01 BPMN. Vui lòng kiểm tra dữ liệu đầu vào."
      );
    }
  }

  async function reviewBpmnWithAI() {
    if (!xml.trim()) {
      setMessage("ChÆ°a cÃ³ BPMN XML Ä‘á»ƒ review. Vui lÃ²ng generate D01 trÆ°á»›c.");
      return;
    }

    const processTasks = readProcessTasks();
    const selectedTemplate = readSelectedD01Template();
    if (!confirmRealAICallIfNeeded(realAIEnabled)) {
      return;
    }

    setIsReviewing(true);
    setReviewResult(null);
    setMessage("Äang review BPMN báº±ng AI...");

    try {
      const response = await fetch("/api/ai/run-skill", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          skillId: ARTIFACT_REVIEW_SKILL_ID,
          payload: {
            artifactType: "bpmn",
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
            artifactType: "bpmn"
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
          artifactType: "bpmn",
          ptrRecommendationCount: result.recommendations.length,
          templateRecommendationCount: result.templateRecommendations.length,
          warningCount: result.warnings.length
        }
      });
      setMessage("ÄÃ£ review BPMN báº±ng AI. Káº¿t quáº£ chá»‰ lÃ  preview, khÃ´ng tá»± Ä‘á»™ng sá»­a XML.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "KhÃ´ng thá»ƒ review BPMN báº±ng AI."
      );
    } finally {
      setIsReviewing(false);
    }
  }

  function downloadBpmn() {
    if (!xml.trim()) {
      setMessage("Chưa có XML để download. Vui lòng bấm Generate D01 BPMN trước.");
      return;
    }

    const blob = new Blob([xml], { type: "application/xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `D01_BPMN_${createTimestamp()}.bpmn`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setMessage("Đã tạo file .bpmn để download.");
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
              Generate D01 BPMN
            </button>
            <button
              className="btn btn-secondary"
              onClick={downloadBpmn}
              type="button"
            >
              Download .bpmn
            </button>
            <button
              className="btn btn-ai"
              disabled={isReviewing || !xml.trim()}
              onClick={reviewBpmnWithAI}
              type="button"
            >
              {isReviewing ? "Reviewing..." : "Review BPMN with AI"}
            </button>
        </>
      }
      bodyClassName="p-4"
      description="Tạo BPMN XML từ Process Task Register đã lưu và template D01 đang chọn. Chưa có chỉnh sửa trực quan ở bước này."
      title="Generate D01 BPMN XML"
    >
        <p className="mb-4 text-sm font-medium uppercase text-slate-500">
          D01 BPMN Output
        </p>
        {message ? <p className="mt-3 text-sm text-slate-600">{message}</p> : null}

        <div className="mb-4">
          <BpmnPreview xml={xml} />
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
          XML đã generate
          <textarea
            className="min-h-96 w-full rounded border border-slate-300 bg-slate-950 p-3 font-mono text-xs font-normal text-slate-50"
            readOnly
            value={xml}
          />
        </label>
    </SessionFrame>
  );
}
