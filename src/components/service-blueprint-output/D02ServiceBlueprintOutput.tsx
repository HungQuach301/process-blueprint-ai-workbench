"use client";

import { useEffect, useState } from "react";
import { SessionFrame } from "@/components/layout/SessionFrame";
import { D02ServiceBlueprintPreview } from "@/components/preview/D02ServiceBlueprintPreview";
import {
  confirmRealAICallIfNeeded,
  logAICallAudit
} from "@/lib/ai/ai-governance";
import type { TemplateRecommendation } from "@/lib/ai/ai-template-review-types";
import { saveAuditLogEntry } from "@/lib/audit/audit-log";
import { generateServiceBlueprintDrawioXml } from "@/lib/generators/drawio-service-blueprint-generator";
import { getLocale, type Locale } from "@/lib/i18n";
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
const LOCALE_EVENT = "process-blueprint-locale-change";

type ArtifactStatus = "fresh" | "stale" | "not_generated";

const d02Text = {
  vi: {
    invalidTasks: "Dữ liệu Process Task Register đã lưu không hợp lệ.",
    invalidTemplates: "Dữ liệu thư viện mẫu đã lưu không hợp lệ.",
    emptyXml: "Generator không tạo ra draw.io XML.",
    generated: "Đã tạo D02 từ Process Task Register hiện tại và mẫu",
    generateFailed: "Không thể tạo D02 Service Blueprint",
    generateFailedFallback: "Không thể tạo D02 Service Blueprint. Vui lòng kiểm tra dữ liệu đầu vào.",
    noXmlForReview: "Chưa có draw.io XML để rà soát. Vui lòng tạo D02 trước.",
    reviewing: "Đang rà soát Service Blueprint bằng AI...",
    reviewed:
      "Đã rà soát Service Blueprint bằng AI. Kết quả chỉ là bản xem trước, không tự động sửa draw.io XML.",
    reviewFailed: "Không thể rà soát Service Blueprint bằng AI.",
    noXmlForDownload: "Chưa có draw.io XML để tải xuống. Vui lòng bấm Tạo D02 Service Blueprint trước.",
    downloaded: "Đã tạo file .drawio để tải xuống.",
    generateButton: "Tạo D02 Service Blueprint",
    downloadButton: "Tải .drawio",
    reviewButton: "Rà soát Service Blueprint bằng AI",
    reviewingButton: "Đang rà soát...",
    description:
      "Tạo draw.io XML từ Process Task Register đã lưu và mẫu D02 đang chọn. File có thể mở bằng draw.io / diagrams.net.",
    title: "Tạo D02 Service Blueprint",
    output: "Đầu ra D02 Service Blueprint",
    statusLabel: "Trạng thái D02",
    statusFresh: "Mới nhất",
    statusStale: "Cần tạo lại sau khi dữ liệu/mẫu thay đổi",
    statusMissing: "Chưa tạo",
    aiReview: "Rà soát artifact bằng AI",
    ptrRecommendations: "Đề xuất PTR",
    templateRecommendations: "Đề xuất mẫu",
    warnings: "Cảnh báo",
    advancedXml: "Nâng cao / Xem draw.io XML",
    generatedXml: "draw.io XML đã tạo"
  },
  en: {
    invalidTasks: "Saved Process Task Register data is invalid.",
    invalidTemplates: "Saved template library data is invalid.",
    emptyXml: "Generator did not create draw.io XML.",
    generated: "Generated D02 from the current Process Task Register and template",
    generateFailed: "Could not generate D02 Service Blueprint",
    generateFailedFallback: "Could not generate D02 Service Blueprint. Please check the input data.",
    noXmlForReview: "No draw.io XML to review. Please generate D02 first.",
    reviewing: "Reviewing Service Blueprint with AI...",
    reviewed:
      "Reviewed Service Blueprint with AI. Results are preview-only and do not auto-edit draw.io XML.",
    reviewFailed: "Could not review Service Blueprint with AI.",
    noXmlForDownload: "No draw.io XML to download. Please generate D02 Service Blueprint first.",
    downloaded: "Created .drawio file for download.",
    generateButton: "Generate D02 Service Blueprint",
    downloadButton: "Download .drawio",
    reviewButton: "Review Service Blueprint with AI",
    reviewingButton: "Reviewing...",
    description:
      "Create draw.io XML from the saved Process Task Register and selected D02 template. The file can be opened with draw.io / diagrams.net.",
    title: "Generate D02 Service Blueprint",
    output: "D02 Service Blueprint Output",
    statusLabel: "D02 status",
    statusFresh: "Fresh",
    statusStale: "Stale - regenerate after data/template changes",
    statusMissing: "Not generated",
    aiReview: "AI artifact review",
    ptrRecommendations: "PTR recommendations",
    templateRecommendations: "Template recommendations",
    warnings: "Warnings",
    advancedXml: "Advanced / View draw.io XML",
    generatedXml: "Generated draw.io XML"
  }
} satisfies Record<Locale, Record<string, string>>;

function readProcessTasks(locale: Locale) {
  const savedTasks = window.localStorage.getItem(TASKS_STORAGE_KEY);

  if (!savedTasks) {
    return sampleProcessTasks;
  }

  const parsedTasks = JSON.parse(savedTasks);

  if (!Array.isArray(parsedTasks)) {
    throw new Error(d02Text[locale].invalidTasks);
  }

  return parsedTasks as ProcessTask[];
}

function readSelectedD02Template(locale: Locale) {
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
    throw new Error(d02Text[locale].invalidTemplates);
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
  const [locale, setActiveLocale] = useState<Locale>("vi");
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
    const text = d02Text[locale];

    try {
      const processTasks = readProcessTasks(locale);
      const selectedTemplate = readSelectedD02Template(locale);
      const generatedXml = generateServiceBlueprintDrawioXml(
        processTasks,
        selectedTemplate
      );

      if (!generatedXml.trim()) {
        throw new Error(text.emptyXml);
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
      setMessage(`${text.generated}: ${selectedTemplate.name}.`);
    } catch (error) {
      setXml("");
      setMessage(
        error instanceof Error
          ? `${text.generateFailed}: ${error.message}`
          : text.generateFailedFallback
      );
    }
  }

  async function reviewServiceBlueprintWithAI() {
    const text = d02Text[locale];

    if (!xml.trim()) {
      setMessage(text.noXmlForReview);
      return;
    }

    const processTasks = readProcessTasks(locale);
    const selectedTemplate = readSelectedD02Template(locale);
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
      setMessage(text.reviewed);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : text.reviewFailed);
    } finally {
      setIsReviewing(false);
    }
  }

  function downloadDrawio() {
    const text = d02Text[locale];

    if (!xml.trim()) {
      setMessage(text.noXmlForDownload);
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
    setMessage(text.downloaded);
  }

  const text = d02Text[locale];
  const statusText =
    status === "fresh"
      ? text.statusFresh
      : status === "stale"
        ? text.statusStale
        : text.statusMissing;

  return (
    <SessionFrame
      actions={
        <>
          <button className="btn btn-primary" onClick={generateXml} type="button">
            {text.generateButton}
          </button>
          <button className="btn btn-secondary" onClick={downloadDrawio} type="button">
            {text.downloadButton}
          </button>
          <button
            className="btn btn-ai"
            disabled={isReviewing || !xml.trim()}
            onClick={reviewServiceBlueprintWithAI}
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
      <p className="section-kicker mb-2">
        {text.output}
      </p>
      <p
        className={`status-message mb-4 ${
          status === "fresh"
            ? "status-message-success"
            : status === "stale"
              ? "status-message-warning"
              : ""
        }`}
      >
        {text.statusLabel}: {statusText}
      </p>
      {message ? <p className="status-message mb-4">{message}</p> : null}

      <div className="mb-4">
        <D02ServiceBlueprintPreview />
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
