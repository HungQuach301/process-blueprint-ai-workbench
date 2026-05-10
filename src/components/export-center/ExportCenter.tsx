"use client";

import { useEffect, useMemo, useState } from "react";
import JSZip from "jszip";
import {
  exportAuditLogJson,
  saveAuditLogEntry
} from "@/lib/audit/audit-log";
import {
  generateAICodingPack,
  type AICodingPackFiles
} from "@/lib/generators/ai-coding-pack-generator";
import { generateBpmnXml } from "@/lib/generators/bpmn-generator";
import { generateServiceBlueprintDrawioXml } from "@/lib/generators/drawio-service-blueprint-generator";
import {
  generateProductDeliveryDraft,
  type ProductDeliveryDraft
} from "@/lib/generators/product-delivery-generator";
import { generateQaReportMarkdown } from "@/lib/generators/qa-report-generator";
import type { ProcessTask } from "@/lib/models/process-task";
import type { TemplateProfile } from "@/lib/models/template-profile";
import { validateProcessTasks } from "@/lib/qa/task-register-rules";
import {
  sampleBpmnTemplateProfile,
  sampleProcessTasks,
  sampleServiceBlueprintTemplateProfile,
  sampleWorkspace
} from "@/lib/sample-data/sme-online-loan";

const TASKS_STORAGE_KEY = "process-blueprint-ai-workbench:process-tasks";
const BRIEF_STORAGE_KEY = "process-blueprint-ai-workbench:input-brief";
const TEMPLATES_STORAGE_KEY =
  "process-blueprint-ai-workbench:template-profiles";
const D01_STORAGE_KEY = "process-blueprint-ai-workbench:selected-d01-template";
const D02_STORAGE_KEY = "process-blueprint-ai-workbench:selected-d02-template";
const D01_GENERATED_XML_KEY =
  "process-blueprint-ai-workbench:generated-d01-bpmn-xml";
const D02_GENERATED_XML_KEY =
  "process-blueprint-ai-workbench:generated-d02-service-blueprint-xml";
const D01_GENERATED_STATUS_KEY =
  "process-blueprint-ai-workbench:generated-d01-bpmn-status";
const D02_GENERATED_STATUS_KEY =
  "process-blueprint-ai-workbench:generated-d02-service-blueprint-status";
const ARTIFACT_STATUS_EVENT = "process-blueprint-artifact-status-change";

type ArtifactStatus = "fresh" | "stale" | "not_generated";

type OutputArtifacts = {
  timestamp: string;
  d01BpmnXml: string;
  d02ServiceBlueprintXml: string;
  processTaskRegisterJson: string;
  templateProfileJson: string;
  qaReportMarkdown: string;
};

type AICodingPackPreview = {
  timestamp: string;
  files: AICodingPackFiles;
};

type ProductDeliveryPreview = {
  timestamp: string;
  draft: ProductDeliveryDraft;
};

function createTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function readJsonArray<T>(key: string, fallback: T[]) {
  const savedValue = window.localStorage.getItem(key);

  if (!savedValue) {
    return fallback;
  }

  const parsedValue = JSON.parse(savedValue);

  if (!Array.isArray(parsedValue)) {
    throw new Error(`${key} không phải là danh sách hợp lệ.`);
  }

  return parsedValue as T[];
}

function readProcessTasks() {
  return readJsonArray<ProcessTask>(TASKS_STORAGE_KEY, sampleProcessTasks);
}

function readTemplateProfiles() {
  return readJsonArray<TemplateProfile>(TEMPLATES_STORAGE_KEY, [
    sampleBpmnTemplateProfile,
    sampleServiceBlueprintTemplateProfile
  ]);
}

function readInputBriefSourceSummary() {
  const savedBrief = window.localStorage.getItem(BRIEF_STORAGE_KEY);

  if (!savedBrief) {
    return "";
  }

  try {
    const parsedBrief = JSON.parse(savedBrief) as Record<string, unknown>;
    const summaryFields = [
      parsedBrief.processInfo,
      parsedBrief.businessObjective,
      parsedBrief.scopeBoundary,
      parsedBrief.actors
    ].filter((value): value is string => typeof value === "string" && value.trim().length > 0);

    return summaryFields.join("\n\n");
  } catch {
    return "";
  }
}

function findTemplate(
  templates: TemplateProfile[],
  templateId: string | null,
  fallback: TemplateProfile
) {
  return templates.find((template) => template.id === templateId) ?? fallback;
}

function downloadBlob(content: BlobPart, fileName: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function ExportCenter() {
  const [artifacts, setArtifacts] = useState<OutputArtifacts | null>(null);
  const [aiCodingPack, setAICodingPack] = useState<AICodingPackPreview | null>(
    null
  );
  const [productDeliveryDraft, setProductDeliveryDraft] =
    useState<ProductDeliveryPreview | null>(null);
  const [projectContext, setProjectContext] = useState("");
  const [productDeliveryContext, setProductDeliveryContext] = useState("");
  const [productDeliveryNotes, setProductDeliveryNotes] = useState("");
  const [message, setMessage] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDownloadingAICodingPack, setIsDownloadingAICodingPack] =
    useState(false);
  const [d01Status, setD01Status] = useState<ArtifactStatus>("not_generated");
  const [d02Status, setD02Status] = useState<ArtifactStatus>("not_generated");
  const [exportPackageStatus, setExportPackageStatus] =
    useState<ArtifactStatus>("not_generated");

  function readArtifactStatus(key: string): ArtifactStatus {
    const status = window.localStorage.getItem(key);

    return status === "fresh" || status === "stale" ? status : "not_generated";
  }

  function refreshArtifactStatuses() {
    setD01Status(readArtifactStatus(D01_GENERATED_STATUS_KEY));
    setD02Status(readArtifactStatus(D02_GENERATED_STATUS_KEY));
  }

  useEffect(() => {
    function handleArtifactStatusChange() {
      refreshArtifactStatuses();

      if (artifacts) {
        setExportPackageStatus("stale");
      }
    }

    refreshArtifactStatuses();
    window.addEventListener(ARTIFACT_STATUS_EVENT, handleArtifactStatusChange);

    return () => {
      window.removeEventListener(ARTIFACT_STATUS_EVENT, handleArtifactStatusChange);
    };
  }, [artifacts]);

  const readiness = useMemo(
    () => ({
      d01Bpmn: d01Status,
      d02ServiceBlueprint: d02Status,
      qaReport: artifacts?.qaReportMarkdown ? exportPackageStatus : "not_generated",
      processTaskRegister: artifacts?.processTaskRegisterJson
        ? exportPackageStatus
        : "not_generated",
      templateProfile: artifacts?.templateProfileJson
        ? exportPackageStatus
        : "not_generated"
    }),
    [artifacts, d01Status, d02Status, exportPackageStatus]
  );

  function buildArtifacts() {
    const timestamp = createTimestamp();
    const processTasks = readProcessTasks();
    const templateProfiles = readTemplateProfiles();
    const selectedD01TemplateId =
      window.localStorage.getItem(D01_STORAGE_KEY) ??
      sampleWorkspace.selectedBpmnTemplateId;
    const selectedD02TemplateId =
      window.localStorage.getItem(D02_STORAGE_KEY) ??
      sampleWorkspace.selectedServiceBlueprintTemplateId;
    const selectedD01Template = findTemplate(
      templateProfiles,
      selectedD01TemplateId,
      sampleBpmnTemplateProfile
    );
    const selectedD02Template = findTemplate(
      templateProfiles,
      selectedD02TemplateId,
      sampleServiceBlueprintTemplateProfile
    );
    const d01BpmnXml = generateBpmnXml(processTasks, selectedD01Template);
    const d02ServiceBlueprintXml = generateServiceBlueprintDrawioXml(
      processTasks,
      selectedD02Template
    );
    const selectedTemplates = [selectedD01Template, selectedD02Template];
    const qaIssues = validateProcessTasks(processTasks);
    const processTaskRegisterJson = JSON.stringify(processTasks, null, 2);
    const templateProfileJson = JSON.stringify(
      {
        selectedD01TemplateId,
        selectedD02TemplateId,
        templates: templateProfiles
      },
      null,
      2
    );
    const qaReportMarkdown = generateQaReportMarkdown({
      workspace: sampleWorkspace,
      processTasks,
      templateProfiles: selectedTemplates,
      qaIssues,
      artifactReadiness: {
        d01BpmnXml: true,
        d02ServiceBlueprintDrawio: true,
        qaReport: true
      }
    });

    window.localStorage.setItem(D01_GENERATED_XML_KEY, d01BpmnXml);
    window.localStorage.setItem(D02_GENERATED_XML_KEY, d02ServiceBlueprintXml);
    window.localStorage.setItem(D01_GENERATED_STATUS_KEY, "fresh");
    window.localStorage.setItem(D02_GENERATED_STATUS_KEY, "fresh");
    window.dispatchEvent(new Event(ARTIFACT_STATUS_EVENT));

    return {
      timestamp,
      d01BpmnXml,
      d02ServiceBlueprintXml,
      processTaskRegisterJson,
      templateProfileJson,
      qaReportMarkdown
    };
  }

  function generateAllArtifacts() {
    try {
      const nextArtifacts = buildArtifacts();

      setArtifacts(nextArtifacts);
      setExportPackageStatus("fresh");
      refreshArtifactStatuses();
      setMessage("Đã generate fresh đủ 5 artifacts cho output package.");
    } catch (error) {
      setArtifacts(null);
      setExportPackageStatus("not_generated");
      setMessage(
        error instanceof Error
          ? `Không thể generate output package: ${error.message}`
          : "Không thể generate output package. Vui lòng kiểm tra dữ liệu."
      );
    }
  }

  function buildAICodingPack() {
    const timestamp = createTimestamp();
    const processTasks = readProcessTasks();
    const templateProfiles = readTemplateProfiles();
    const selectedD01TemplateId =
      window.localStorage.getItem(D01_STORAGE_KEY) ??
      sampleWorkspace.selectedBpmnTemplateId;
    const selectedD02TemplateId =
      window.localStorage.getItem(D02_STORAGE_KEY) ??
      sampleWorkspace.selectedServiceBlueprintTemplateId;
    const selectedD01Template = findTemplate(
      templateProfiles,
      selectedD01TemplateId,
      sampleBpmnTemplateProfile
    );
    const selectedD02Template = findTemplate(
      templateProfiles,
      selectedD02TemplateId,
      sampleServiceBlueprintTemplateProfile
    );
    const files = generateAICodingPack({
      processTasks,
      selectedD01Template,
      selectedD02Template,
      projectContext,
      generatedAt: timestamp,
      assumptions: [
        "MVP1 AI Coding Pack is generated deterministically from Process Task Register and selected template metadata."
      ],
      openQuestions: [
        "Confirm target repository architecture before applying generated implementation steps."
      ]
    });

    return {
      timestamp,
      files
    };
  }

  function buildProductDeliveryDraft() {
    const timestamp = createTimestamp();
    const processTasks = readProcessTasks();
    const draft = generateProductDeliveryDraft({
      processTasks,
      projectContext: productDeliveryContext,
      notes: productDeliveryNotes,
      sourceSummary: readInputBriefSourceSummary(),
      generatedAt: timestamp
    });

    return {
      timestamp,
      draft
    };
  }

  async function downloadZip() {
    try {
      setIsDownloading(true);
      const currentArtifacts = artifacts ?? buildArtifacts();
      const zip = new JSZip();
      const timestamp = currentArtifacts.timestamp;

      zip.file(`D01_BPMN_${timestamp}.bpmn`, currentArtifacts.d01BpmnXml);
      zip.file(
        `D02_Service_Blueprint_${timestamp}.drawio`,
        currentArtifacts.d02ServiceBlueprintXml
      );
      zip.file(
        `Process_Task_Register_${timestamp}.json`,
        currentArtifacts.processTaskRegisterJson
      );
      zip.file(
        `Template_Profile_${timestamp}.json`,
        currentArtifacts.templateProfileJson
      );
      zip.file(`QA_Report_${timestamp}.md`, currentArtifacts.qaReportMarkdown);

      const zipBlob = await zip.generateAsync({ type: "blob" });

      downloadBlob(
        zipBlob,
        `Output_Package_${timestamp}.zip`,
        "application/zip"
      );
      saveAuditLogEntry({
        action: "export_zip",
        status: "success",
        summary: "Exported output package ZIP.",
        metadata: {
          timestamp,
          fileCount: 5
        }
      });
      setArtifacts(currentArtifacts);
      setExportPackageStatus("fresh");
      refreshArtifactStatuses();
      setMessage("Đã tạo ZIP output package.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? `Không thể download ZIP: ${error.message}`
          : "Không thể download ZIP. Vui lòng thử lại."
      );
    } finally {
      setIsDownloading(false);
    }
  }

  function downloadAuditLog() {
    downloadBlob(
      exportAuditLogJson(),
      `Audit_Log_${createTimestamp()}.json`,
      "application/json;charset=utf-8"
    );
    setMessage("Đã export audit log JSON.");
  }

  function previewAICodingPack() {
    try {
      const nextPack = buildAICodingPack();

      setAICodingPack(nextPack);
      setMessage("Da tao preview AI Coding Pack deterministic.");
    } catch (error) {
      setAICodingPack(null);
      setMessage(
        error instanceof Error
          ? `Khong the tao AI Coding Pack: ${error.message}`
          : "Khong the tao AI Coding Pack. Vui long kiem tra du lieu."
      );
    }
  }

  function previewProductDeliveryDraft() {
    try {
      const nextDraft = buildProductDeliveryDraft();

      setProductDeliveryDraft(nextDraft);
      setMessage("Da tao preview Product Delivery draft deterministic.");
    } catch (error) {
      setProductDeliveryDraft(null);
      setMessage(
        error instanceof Error
          ? `Khong the tao Product Delivery draft: ${error.message}`
          : "Khong the tao Product Delivery draft. Vui long kiem tra du lieu."
      );
    }
  }

  function downloadProductDeliveryMarkdown() {
    try {
      const currentDraft = productDeliveryDraft ?? buildProductDeliveryDraft();

      downloadBlob(
        currentDraft.draft.combinedMarkdown,
        `Product_Delivery_Draft_${currentDraft.timestamp}.md`,
        "text/markdown;charset=utf-8"
      );
      saveAuditLogEntry({
        action: "export_product_delivery_draft",
        status: "success",
        summary: "Exported deterministic Product Delivery draft markdown.",
        metadata: {
          timestamp: currentDraft.timestamp,
          sectionCount: 3
        }
      });
      setProductDeliveryDraft(currentDraft);
      setMessage("Da export Product Delivery draft markdown.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? `Khong the export Product Delivery draft: ${error.message}`
          : "Khong the export Product Delivery draft. Vui long thu lai."
      );
    }
  }

  async function downloadAICodingPackZip() {
    try {
      setIsDownloadingAICodingPack(true);
      const currentPack = aiCodingPack ?? buildAICodingPack();
      const zip = new JSZip();
      const { files, timestamp } = currentPack;

      zip.file("AGENTS.md", files.agentsMd);
      zip.file("CLAUDE.md", files.claudeMd);
      zip.file("cursor-rules.md", files.cursorRulesMd);
      zip.file("spec.json", files.specJson);
      zip.file("acceptance-criteria.md", files.acceptanceCriteriaMd);
      zip.file("implementation-plan.md", files.implementationPlanMd);
      zip.file("test-plan.md", files.testPlanMd);

      const zipBlob = await zip.generateAsync({ type: "blob" });

      downloadBlob(
        zipBlob,
        `AI_Coding_Pack_${timestamp}.zip`,
        "application/zip"
      );
      saveAuditLogEntry({
        action: "export_ai_coding_pack",
        status: "success",
        summary: "Exported deterministic AI Coding Pack ZIP.",
        metadata: {
          timestamp,
          fileCount: 7
        }
      });
      setAICodingPack(currentPack);
      setMessage("Da tao ZIP AI Coding Pack.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? `Khong the download AI Coding Pack: ${error.message}`
          : "Khong the download AI Coding Pack. Vui long thu lai."
      );
    } finally {
      setIsDownloadingAICodingPack(false);
    }
  }

  return (
    <section className="rounded border border-slate-200 bg-white">
      <div className="border-b border-slate-200 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase text-slate-500">
              Export Center
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-950">
              Output Package ZIP
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Generate và đóng gói D01 BPMN, D02 Service Blueprint, JSON dữ liệu
              và QA Report vào một file ZIP.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              onClick={generateAllArtifacts}
              type="button"
            >
              Generate all artifacts
            </button>
            <button
              className="rounded bg-slate-950 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              disabled={isDownloading}
              onClick={downloadZip}
              type="button"
            >
              {isDownloading ? "Đang tạo ZIP..." : "Download ZIP"}
            </button>
            <button
              className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              onClick={downloadAuditLog}
              type="button"
            >
              Export Audit Log JSON
            </button>
          </div>
        </div>

        {message ? <p className="mt-3 text-sm text-slate-600">{message}</p> : null}
      </div>

      <div className="grid gap-3 p-4 md:grid-cols-2 lg:grid-cols-5">
        {[
          ["D01 BPMN", readiness.d01Bpmn],
          ["D02 Service Blueprint", readiness.d02ServiceBlueprint],
          ["QA Report", readiness.qaReport],
          ["Process Task Register", readiness.processTaskRegister],
          ["Template Profile", readiness.templateProfile]
        ].map(([label, status]) => (
          <div className="rounded border border-slate-200 p-3" key={String(label)}>
            <p className="text-sm font-semibold text-slate-950">{label}</p>
            <p
              className={`mt-1 text-sm ${
                status === "fresh"
                  ? "text-emerald-700"
                  : status === "stale"
                    ? "text-amber-700"
                    : "text-slate-500"
              }`}
            >
              {status === "fresh"
                ? "Fresh"
                : status === "stale"
                  ? "Stale"
                  : "Not generated"}
            </p>
          </div>
        ))}
      </div>

      <div className="border-t border-slate-200 p-4">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,28rem)]">
          <div>
            <p className="text-sm font-medium uppercase text-slate-500">
              Product Delivery
            </p>
            <h3 className="mt-1 text-xl font-semibold text-slate-950">
              Draft BRD outline and user stories
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Deterministic MVP1 draft generated from Process Task Register,
              saved AI Input Brief summary when available, and optional notes.
              Preview first, then export markdown when ready.
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">
                  Optional project context
                </span>
                <textarea
                  className="mt-2 min-h-24 w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-800"
                  onChange={(event) => setProductDeliveryContext(event.target.value)}
                  placeholder="Example: MVP scope, target users, business objective, delivery constraints..."
                  value={productDeliveryContext}
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">
                  Optional notes
                </span>
                <textarea
                  className="mt-2 min-h-24 w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-800"
                  onChange={(event) => setProductDeliveryNotes(event.target.value)}
                  placeholder="Paste workshop notes, BRD notes, assumptions, or stakeholder comments..."
                  value={productDeliveryNotes}
                />
              </label>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                onClick={previewProductDeliveryDraft}
                type="button"
              >
                Generate Product Delivery Draft
              </button>
              <button
                className="rounded bg-slate-950 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
                onClick={downloadProductDeliveryMarkdown}
                type="button"
              >
                Download Product Delivery Markdown
              </button>
            </div>
          </div>

          <div className="rounded border border-slate-200 bg-slate-50 p-3">
            <p className="text-sm font-semibold text-slate-950">
              Draft includes
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
              <li>BRD outline</li>
              <li>User stories</li>
              <li>Acceptance criteria</li>
            </ul>
            <p className="mt-3 text-xs leading-5 text-slate-500">
              No Artifact Graph is created in MVP1. Future AI enhancement can
              use the server-side `brd-or-notes-to-user-stories` skill.
            </p>
          </div>
        </div>

        {productDeliveryDraft ? (
          <div className="mt-4 rounded border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-4 py-3">
              <p className="text-sm font-semibold text-slate-950">
                Preview: Product Delivery draft
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Generated at {productDeliveryDraft.timestamp}. Step IDs are
                preserved in stories and acceptance criteria.
              </p>
            </div>
            <pre className="max-h-96 overflow-auto whitespace-pre-wrap p-4 text-xs leading-5 text-slate-700">
              {productDeliveryDraft.draft.combinedMarkdown}
            </pre>
          </div>
        ) : null}
      </div>

      <div className="border-t border-slate-200 p-4">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,28rem)]">
          <div>
            <p className="text-sm font-medium uppercase text-slate-500">
              AI Coding Pack
            </p>
            <h3 className="mt-1 text-xl font-semibold text-slate-950">
              Export AI-ready coding context
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Deterministic MVP1 export for Codex, Claude Code, Cursor, or
              similar coding tools. Source data comes from Process Task
              Register and selected template metadata. No browser AI call is
              made.
            </p>
            <label className="mt-4 block">
              <span className="text-sm font-medium text-slate-700">
                Optional project context
              </span>
              <textarea
                className="mt-2 min-h-24 w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-800"
                onChange={(event) => setProjectContext(event.target.value)}
                placeholder="Example: Target repo, frontend/backend stack, coding constraints, team conventions..."
                value={projectContext}
              />
            </label>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                onClick={previewAICodingPack}
                type="button"
              >
                Preview AI Coding Pack
              </button>
              <button
                className="rounded bg-slate-950 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                disabled={isDownloadingAICodingPack}
                onClick={downloadAICodingPackZip}
                type="button"
              >
                {isDownloadingAICodingPack
                  ? "Dang tao AI Coding Pack..."
                  : "Download AI Coding Pack ZIP"}
              </button>
            </div>
          </div>

          <div className="rounded border border-slate-200 bg-slate-50 p-3">
            <p className="text-sm font-semibold text-slate-950">
              Included files
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
              <li>AGENTS.md</li>
              <li>CLAUDE.md</li>
              <li>cursor-rules.md</li>
              <li>spec.json</li>
              <li>acceptance-criteria.md</li>
              <li>implementation-plan.md</li>
              <li>test-plan.md</li>
            </ul>
            <p className="mt-3 text-xs leading-5 text-slate-500">
              AI enhancement is planned as future skill
              `user-stories-to-ai-coding-pack`; MVP1 uses deterministic export
              first.
            </p>
          </div>
        </div>

        {aiCodingPack ? (
          <div className="mt-4 rounded border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-4 py-3">
              <p className="text-sm font-semibold text-slate-950">
                Preview: spec.json
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Generated at {aiCodingPack.timestamp}. Step IDs are preserved
                for traceability.
              </p>
            </div>
            <pre className="max-h-96 overflow-auto p-4 text-xs leading-5 text-slate-700">
              {aiCodingPack.files.specJson}
            </pre>
          </div>
        ) : null}
      </div>
    </section>
  );
}
