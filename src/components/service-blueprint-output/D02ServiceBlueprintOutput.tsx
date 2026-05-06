"use client";

import { useState } from "react";
import { generateServiceBlueprintDrawioXml } from "@/lib/generators/drawio-service-blueprint-generator";
import type { ProcessTask } from "@/lib/models/process-task";
import type { TemplateProfile } from "@/lib/models/template-profile";
import {
  sampleProcessTasks,
  sampleServiceBlueprintTemplateProfile
} from "@/lib/sample-data/sme-online-loan";

const TASKS_STORAGE_KEY = "process-blueprint-ai-workbench:process-tasks";
const TEMPLATES_STORAGE_KEY =
  "process-blueprint-ai-workbench:template-profiles";
const D02_STORAGE_KEY = "process-blueprint-ai-workbench:selected-d02-template";
const D02_GENERATED_XML_KEY =
  "process-blueprint-ai-workbench:generated-d02-service-blueprint-xml";

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

  if (!savedTemplates) {
    return sampleServiceBlueprintTemplateProfile;
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

export function D02ServiceBlueprintOutput() {
  const [xml, setXml] = useState("");
  const [message, setMessage] = useState("");

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
      window.localStorage.setItem(D02_GENERATED_XML_KEY, generatedXml);
      setMessage("Đã generate D02 Service Blueprint draw.io XML.");
    } catch (error) {
      setXml("");
      setMessage(
        error instanceof Error
          ? `Không thể generate D02 Service Blueprint: ${error.message}`
          : "Không thể generate D02 Service Blueprint. Vui lòng kiểm tra dữ liệu đầu vào."
      );
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
    <section className="rounded border border-slate-200 bg-white">
      <div className="border-b border-slate-200 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase text-slate-500">
              D02 Service Blueprint Output
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-950">
              Generate D02 Service Blueprint
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Tạo draw.io XML từ Process Task Register đã lưu và template D02
              đang chọn. File có thể mở bằng draw.io / diagrams.net.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
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
          </div>
        </div>

        {message ? <p className="mt-3 text-sm text-slate-600">{message}</p> : null}
      </div>

      <div className="p-4">
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          draw.io XML đã generate
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
