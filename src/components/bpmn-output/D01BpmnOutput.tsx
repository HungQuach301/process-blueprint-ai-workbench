"use client";

import { useEffect, useState } from "react";
import { SessionFrame } from "@/components/layout/SessionFrame";
import { BpmnPreview } from "@/components/preview/BpmnPreview";
import {
  confirmRealAICallIfNeeded,
  logAICallAudit
} from "@/lib/ai/ai-governance";
import type { TemplateRecommendation } from "@/lib/ai/ai-template-review-types";
import { saveAuditLogEntry } from "@/lib/audit/audit-log";
import { generateBpmnXml } from "@/lib/generators/bpmn-generator";
import { getLocale, type Locale } from "@/lib/i18n";
import type { ProcessTask } from "@/lib/models/process-task";
import type { TemplateProfile } from "@/lib/models/template-profile";
import { validateProcessTasks } from "@/lib/qa/task-register-rules";
import type { QARecommendation } from "@/lib/recommendation-engine/types";
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
const LOCALE_EVENT = "process-blueprint-locale-change";

const d01Text = {
  vi: {
    invalidTasks: "Dữ liệu Process Task Register đã lưu không hợp lệ.",
    invalidTemplates: "Dữ liệu thư viện mẫu đã lưu không hợp lệ.",
    emptyXml: "Generator không tạo ra XML.",
    generated: "Đã tạo D01 BPMN XML.",
    generateFailed: "Không thể tạo D01 BPMN",
    generateFailedFallback: "Không thể tạo D01 BPMN. Vui lòng kiểm tra dữ liệu đầu vào.",
    noXmlForReview: "Chưa có BPMN XML để rà soát. Vui lòng tạo D01 trước.",
    reviewing: "Đang rà soát BPMN bằng AI...",
    reviewed: "Đã rà soát BPMN bằng AI. Kết quả chỉ là bản xem trước, không tự động sửa XML.",
    reviewFailed: "Không thể rà soát BPMN bằng AI.",
    noXmlForDownload: "Chưa có XML để tải xuống. Vui lòng bấm Tạo D01 BPMN trước.",
    downloaded: "Đã tạo file .bpmn để tải xuống.",
    generateButton: "Tạo D01 BPMN",
    downloadButton: "Tải .bpmn",
    reviewButton: "Rà soát BPMN bằng AI",
    reviewingButton: "Đang rà soát...",
    description:
      "Tạo BPMN XML từ Process Task Register đã lưu và mẫu D01 đang chọn. Bước này chưa chỉnh sửa trực quan.",
    title: "Tạo D01 BPMN XML",
    output: "Đầu ra D01 BPMN",
    aiReview: "Rà soát artifact bằng AI",
    ptrRecommendations: "Đề xuất PTR",
    templateRecommendations: "Đề xuất mẫu",
    warnings: "Cảnh báo",
    advancedXml: "Nâng cao / Xem BPMN XML",
    generatedXml: "XML đã tạo"
  },
  en: {
    invalidTasks: "Saved Process Task Register data is invalid.",
    invalidTemplates: "Saved template library data is invalid.",
    emptyXml: "Generator did not create XML.",
    generated: "Generated D01 BPMN XML.",
    generateFailed: "Could not generate D01 BPMN",
    generateFailedFallback: "Could not generate D01 BPMN. Please check the input data.",
    noXmlForReview: "No BPMN XML to review. Please generate D01 first.",
    reviewing: "Reviewing BPMN with AI...",
    reviewed: "Reviewed BPMN with AI. Results are preview-only and do not auto-edit XML.",
    reviewFailed: "Could not review BPMN with AI.",
    noXmlForDownload: "No XML to download. Please generate D01 BPMN first.",
    downloaded: "Created .bpmn file for download.",
    generateButton: "Generate D01 BPMN",
    downloadButton: "Download .bpmn",
    reviewButton: "Review BPMN with AI",
    reviewingButton: "Reviewing...",
    description:
      "Create BPMN XML from the saved Process Task Register and selected D01 template. Visual editing is not included in this step.",
    title: "Generate D01 BPMN XML",
    output: "D01 BPMN Output",
    aiReview: "AI artifact review",
    ptrRecommendations: "PTR recommendations",
    templateRecommendations: "Template recommendations",
    warnings: "Warnings",
    advancedXml: "Advanced / View BPMN XML",
    generatedXml: "Generated XML"
  }
} satisfies Record<Locale, Record<string, string>>;

function readProcessTasks(locale: Locale) {
  const savedTasks = window.localStorage.getItem(TASKS_STORAGE_KEY);

  if (!savedTasks) {
    return sampleProcessTasks;
  }

  const parsedTasks = JSON.parse(savedTasks);

  if (!Array.isArray(parsedTasks)) {
    throw new Error(d01Text[locale].invalidTasks);
  }

  return parsedTasks as ProcessTask[];
}

function readSelectedD01Template(locale: Locale) {
  const savedTemplates = window.localStorage.getItem(TEMPLATES_STORAGE_KEY);
  const selectedTemplateId =
    window.localStorage.getItem(D01_STORAGE_KEY) ?? sampleBpmnTemplateProfile.id;

  if (!savedTemplates) {
    return sampleBpmnTemplateProfile;
  }

  const parsedTemplates = JSON.parse(savedTemplates);

  if (!Array.isArray(parsedTemplates)) {
    throw new Error(d01Text[locale].invalidTemplates);
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
  const [locale, setActiveLocale] = useState<Locale>("vi");
  const [xml, setXml] = useState("");
  const [message, setMessage] = useState("");
  const [reviewResult, setReviewResult] = useState<ArtifactReviewResult | null>(
    null
  );
  const [isReviewing, setIsReviewing] = useState(false);
  const [realAIEnabled, setRealAIEnabled] = useState(false);

  useEffect(() => {
    setActiveLocale(getLocale());

    function handleLocaleChange(event: Event) {
      const localeDetail = (event as CustomEvent<{ locale?: Locale }>).detail;

      if (localeDetail?.locale) {
        setActiveLocale(localeDetail.locale);
      }
    }

    window.addEventListener(LOCALE_EVENT, handleLocaleChange);

    return () => window.removeEventListener(LOCALE_EVENT, handleLocaleChange);
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
    const text = d01Text[locale];

    try {
      const processTasks = readProcessTasks(locale);
      const selectedTemplate = readSelectedD01Template(locale);
      const generatedXml = generateBpmnXml(processTasks, selectedTemplate);

      if (!generatedXml.trim()) {
        throw new Error(text.emptyXml);
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
      setMessage(text.generated);
    } catch (error) {
      setXml("");
      setMessage(
        error instanceof Error
          ? `${text.generateFailed}: ${error.message}`
          : text.generateFailedFallback
      );
    }
  }

  async function reviewBpmnWithAI() {
    const text = d01Text[locale];

    if (!xml.trim()) {
      setMessage(text.noXmlForReview);
      return;
    }

    const processTasks = readProcessTasks(locale);
    const selectedTemplate = readSelectedD01Template(locale);
    if (!confirmRealAICallIfNeeded(realAIEnabled)) {
      return;
    }

    setIsReviewing(true);
    setReviewResult(null);
    setMessage(text.reviewing);

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
      setMessage(text.reviewed);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : text.reviewFailed);
    } finally {
      setIsReviewing(false);
    }
  }

  function downloadBpmn() {
    const text = d01Text[locale];

    if (!xml.trim()) {
      setMessage(text.noXmlForDownload);
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
    setMessage(text.downloaded);
  }

  const text = d01Text[locale];

  return (
    <SessionFrame
      actions={
        <>
          <button className="btn btn-primary" onClick={generateXml} type="button">
            {text.generateButton}
          </button>
          <button className="btn btn-secondary" onClick={downloadBpmn} type="button">
            {text.downloadButton}
          </button>
          <button
            className="btn btn-ai"
            disabled={isReviewing || !xml.trim()}
            onClick={reviewBpmnWithAI}
            type="button"
          >
            {isReviewing ? text.reviewingButton : text.reviewButton}
          </button>
        </>
      }
      bodyClassName="p-4"
      description={text.description}
      title={text.title}
    >
      <p className="section-kicker mb-4">
        {text.output}
      </p>
      {message ? <p className="status-message mb-4">{message}</p> : null}

      <div className="mb-4">
        <BpmnPreview xml={xml} />
      </div>

      {reviewResult ? (
        <div className="status-message mb-4">
          <p className="font-semibold text-slate-900">{text.aiReview}</p>
          <p className="mt-1">
            {text.ptrRecommendations}: {reviewResult.recommendations.length} ·{" "}
            {text.templateRecommendations}:{" "}
            {reviewResult.templateRecommendations.length} · {text.warnings}:{" "}
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

      <details className="advanced-panel">
        <summary>
          {text.advancedXml}
        </summary>
        <div className="border-t border-slate-200 p-4">
          <label className="grid min-w-0 gap-2 text-sm font-medium text-slate-700">
            {text.generatedXml}
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
