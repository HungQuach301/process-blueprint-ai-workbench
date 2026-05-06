"use client";

import { useState } from "react";
import { BpmnPreview } from "@/components/preview/BpmnPreview";
import { generateBpmnXml } from "@/lib/generators/bpmn-generator";
import type { ProcessTask } from "@/lib/models/process-task";
import type { TemplateProfile } from "@/lib/models/template-profile";
import {
  sampleBpmnTemplateProfile,
  sampleProcessTasks
} from "@/lib/sample-data/sme-online-loan";

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

export function D01BpmnOutput() {
  const [xml, setXml] = useState("");
  const [message, setMessage] = useState("");

  function generateXml() {
    try {
      const processTasks = readProcessTasks();
      const selectedTemplate = readSelectedD01Template();
      const generatedXml = generateBpmnXml(processTasks, selectedTemplate);

      if (!generatedXml.trim()) {
        throw new Error("Generator không tạo ra XML.");
      }

      setXml(generatedXml);
      window.localStorage.setItem(D01_GENERATED_XML_KEY, generatedXml);
      window.localStorage.setItem(D01_GENERATED_STATUS_KEY, "fresh");
      window.dispatchEvent(new Event(ARTIFACT_STATUS_EVENT));
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
    <section className="rounded border border-slate-200 bg-white">
      <div className="border-b border-slate-200 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase text-slate-500">
              D01 BPMN Output
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-950">
              Generate D01 BPMN XML
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Tạo BPMN XML từ Process Task Register đã lưu và template D01 đang
              chọn. Chưa có chỉnh sửa trực quan ở bước này.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              className="rounded bg-slate-950 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
              onClick={generateXml}
              type="button"
            >
              Generate D01 BPMN
            </button>
            <button
              className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              onClick={downloadBpmn}
              type="button"
            >
              Download .bpmn
            </button>
          </div>
        </div>

        {message ? <p className="mt-3 text-sm text-slate-600">{message}</p> : null}
      </div>

      <div className="p-4">
        <div className="mb-4">
          <BpmnPreview xml={xml} />
        </div>

        <label className="grid gap-2 text-sm font-medium text-slate-700">
          XML đã generate
          <textarea
            className="min-h-96 w-full rounded border border-slate-300 bg-slate-950 p-3 font-mono text-xs font-normal text-slate-50"
            readOnly
            value={xml}
          />
        </label>
      </div>
    </section>
  );
}
