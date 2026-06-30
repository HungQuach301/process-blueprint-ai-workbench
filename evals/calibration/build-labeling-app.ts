import * as fs from "fs";
import * as path from "path";

const DATASETS_DIR = path.resolve(__dirname, "..", "datasets");
const OUT_FILE = path.resolve(__dirname, "labeling-app.html");
const SKILLS = [
  "input-brief-to-ptr",
  "process-improvement-recommendation",
  "artifact-review",
] as const;

type Skill = (typeof SKILLS)[number];
type BlindCase = { skillId: string; caseId: string; input: unknown; output: unknown };

function condensedRubric(text: string): string {
  const blocks: string[] = [];
  const axisParts = text.split(/(?=^## Axis)/m).filter((p) => p.startsWith("## Axis"));
  for (const part of axisParts) {
    const lines = part.split("\n");
    const title = lines[0];
    const firstContentIdx = lines.findIndex(
      (l, i) => i > 0 && l.trim() !== "" && !l.startsWith("#")
    );
    const desc = firstContentIdx >= 0 ? lines[firstContentIdx].trim() : "";
    const scoreIdx = lines.findIndex((l) => l.startsWith("**Score:**"));
    const hrIdx = lines.findIndex(
      (l, i) => i > (scoreIdx >= 0 ? scoreIdx : 0) && l.startsWith("---")
    );
    const scoreBlock =
      scoreIdx >= 0
        ? lines
            .slice(scoreIdx, hrIdx > scoreIdx ? hrIdx : lines.length)
            .join("\n")
            .trim()
        : "";
    blocks.push(`${title}\n${desc}\n\n${scoreBlock}`);
  }
  return blocks.join("\n\n");
}

// ── Load cases ────────────────────────────────────────────────────────────────
const allCases: BlindCase[] = [];
const rubricCondensed: Record<string, string> = {};

for (const skill of SKILLS) {
  const baselinePath = path.join(DATASETS_DIR, skill, "v1", "baseline.json");
  const rubricPath = path.join(DATASETS_DIR, skill, "v1", "rubric.md");

  const baseline = JSON.parse(fs.readFileSync(baselinePath, "utf8")) as {
    cases: Array<{
      id: string;
      input: unknown;
      output: unknown;
      verdict?: unknown;
      overall?: unknown;
      judgeNotes?: unknown;
    }>;
  };

  for (const c of baseline.cases) {
    // Intentionally destructure to exclude verdict/overall/judgeNotes
    const { id, input, output } = c;
    allCases.push({ skillId: skill, caseId: id, input, output });
  }

  const rubricText = fs.readFileSync(rubricPath, "utf8");
  rubricCondensed[skill] = condensedRubric(rubricText);
}

// ── Safe JSON embed (escape </script>) ───────────────────────────────────────
function safeJson(value: unknown): string {
  return JSON.stringify(value).replace(/<\/script>/gi, "<\\/script>");
}

// ── Build HTML ────────────────────────────────────────────────────────────────
const SKILL_COLORS: Record<Skill, string> = {
  "input-brief-to-ptr": "#2563eb",
  "process-improvement-recommendation": "#16a34a",
  "artifact-review": "#7c3aed",
};

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Calibration Labeling App</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: system-ui, sans-serif; background: #f8fafc; color: #1e293b; font-size: 14px; }
  #app { max-width: 1100px; margin: 0 auto; padding: 16px; }

  /* Header */
  #header { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
  #header h1 { font-size: 18px; font-weight: 700; }
  #progress-bar-wrap { flex: 1; height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden; }
  #progress-bar-fill { height: 100%; background: #2563eb; border-radius: 4px; transition: width .2s; }
  #progress-text { font-size: 12px; color: #64748b; white-space: nowrap; }

  /* Skill badge */
  .skill-badge {
    display: inline-block; padding: 2px 8px; border-radius: 10px;
    font-size: 11px; font-weight: 600; color: #fff; letter-spacing: .3px;
  }
  .skill-input-brief-to-ptr { background: #2563eb; }
  .skill-process-improvement-recommendation { background: #16a34a; }
  .skill-artifact-review { background: #7c3aed; }

  /* Case panel */
  #case-panel { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
  .section-card {
    border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; background: #fff;
    overflow: auto; max-height: 500px;
  }
  .section-card h2 { font-size: 13px; font-weight: 700; color: #475569; margin-bottom: 8px; text-transform: uppercase; letter-spacing: .5px; }
  .section-card h3 { font-size: 15px; font-weight: 700; margin-bottom: 6px; }
  .case-meta { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
  .case-id { font-family: monospace; font-size: 12px; color: #64748b; }

  /* Tables */
  table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 6px; }
  th { background: #f1f5f9; text-align: left; padding: 5px 8px; border-bottom: 2px solid #e2e8f0; font-weight: 600; }
  td { padding: 5px 8px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
  tr:nth-child(even) td { background: #f8fafc; }
  .bpmn-badge {
    display: inline-block; padding: 1px 6px; border-radius: 4px; font-size: 10px;
    font-weight: 600; background: #e0e7ff; color: #3730a3;
  }
  .risk-badge {
    display: inline-block; padding: 1px 6px; border-radius: 4px; font-size: 10px; font-weight: 600;
  }
  .risk-low { background: #dcfce7; color: #15803d; }
  .risk-medium { background: #fef9c3; color: #a16207; }
  .risk-high { background: #fee2e2; color: #b91c1c; }

  /* Recommendation cards */
  .rec-card { border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; margin-bottom: 8px; background: #fafafa; }
  .rec-title { font-weight: 700; font-size: 13px; margin-bottom: 4px; }
  .rec-rationale { font-size: 12px; color: #475569; margin-bottom: 4px; }
  .rec-ops { font-size: 11px; color: #64748b; }

  /* Rubric */
  #rubric-section { margin-bottom: 12px; }
  #rubric-toggle { cursor: pointer; background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 12px; font-size: 12px; font-weight: 600; }
  #rubric-panel { display: none; margin-top: 8px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; background: #fff; }
  #rubric-panel pre { white-space: pre-wrap; font-family: monospace; font-size: 12px; max-height: 300px; overflow-y: auto; }

  /* Verdict */
  #verdict-section { border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; background: #fff; margin-bottom: 12px; }
  #verdict-section h2 { font-size: 13px; font-weight: 700; color: #475569; margin-bottom: 10px; text-transform: uppercase; letter-spacing: .5px; }
  #verdict-buttons { display: flex; gap: 8px; margin-bottom: 10px; }
  .v-btn {
    padding: 8px 20px; border-radius: 6px; border: 2px solid transparent;
    font-weight: 600; cursor: pointer; font-size: 14px; transition: all .1s;
  }
  .v-btn-pass { background: #dcfce7; color: #15803d; }
  .v-btn-pass.active { border-color: #15803d; background: #bbf7d0; font-weight: 800; }
  .v-btn-partial { background: #fef9c3; color: #a16207; }
  .v-btn-partial.active { border-color: #a16207; background: #fde68a; font-weight: 800; }
  .v-btn-fail { background: #fee2e2; color: #b91c1c; }
  .v-btn-fail.active { border-color: #b91c1c; background: #fecaca; font-weight: 800; }
  #notes-area { width: 100%; padding: 8px; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 13px; resize: vertical; }
  #save-flash { font-size: 12px; color: #15803d; margin-left: 8px; opacity: 0; transition: opacity .3s; }

  /* Footer */
  #footer { display: flex; align-items: center; gap: 16px; padding: 12px 0; border-top: 1px solid #e2e8f0; }
  #footer .nav-btn {
    padding: 6px 16px; border-radius: 6px; border: 1px solid #e2e8f0;
    background: #fff; cursor: pointer; font-size: 13px; font-weight: 600;
  }
  #footer .nav-btn:hover { background: #f1f5f9; }
  #footer-info { flex: 1; font-size: 12px; color: #64748b; }
  #export-btn {
    padding: 6px 16px; border-radius: 6px; border: 1px solid #2563eb;
    background: #eff6ff; color: #2563eb; cursor: pointer; font-size: 13px; font-weight: 600;
  }
  #export-btn:hover { background: #dbeafe; }

  /* Pre fallback */
  pre.json-fallback { white-space: pre-wrap; word-break: break-word; font-family: monospace; font-size: 11px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 8px; margin-top: 4px; max-height: 300px; overflow-y: auto; }

  /* Lists */
  ol, ul { padding-left: 18px; margin-top: 4px; }
  li { margin-bottom: 2px; font-size: 12px; }
  p.field { margin-bottom: 6px; font-size: 12px; }
  span.label { font-weight: 600; color: #475569; }
  .pir-badge { display: inline-block; padding: 2px 8px; border-radius: 4px; background: #e0e7ff; color: #3730a3; font-size: 11px; font-weight: 700; margin-bottom: 6px; }
  .artifact-badge { display: inline-block; padding: 2px 8px; border-radius: 4px; background: #f3e8ff; color: #7c3aed; font-size: 11px; font-weight: 700; margin-bottom: 6px; }

  /* Per-action question banner */
  #question-banner {
    border-radius: 8px; padding: 12px 16px; margin-bottom: 12px;
    border: 2px solid #d97706; background: #fffbeb;
    font-weight: 700; font-size: 14px; color: #92400e; line-height: 1.5;
  }
  #question-banner .action-label {
    display: inline-block; background: #d97706; color: #fff;
    border-radius: 4px; padding: 1px 8px; font-size: 12px;
    font-weight: 700; margin-left: 8px; vertical-align: middle;
  }
</style>
</head>
<body>
<div id="app">
  <div id="header">
    <h1>Calibration Labeling</h1>
    <div id="progress-bar-wrap"><div id="progress-bar-fill" style="width:0%"></div></div>
    <span id="progress-text">0 / 0</span>
  </div>

  <div id="case-meta-row" style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
    <span id="skill-badge-el" class="skill-badge"></span>
    <span id="case-id-el" class="case-id"></span>
  </div>

  <div id="question-banner"></div>

  <div id="case-panel">
    <div class="section-card" id="input-card">
      <h2>Input</h2>
      <div id="input-content"></div>
    </div>
    <div class="section-card" id="output-card">
      <h2>Output</h2>
      <div id="output-content"></div>
    </div>
  </div>

  <div id="rubric-section">
    <button id="rubric-toggle" onclick="toggleRubric()">Show Rubric</button>
    <div id="rubric-panel">
      <pre id="rubric-text"></pre>
    </div>
  </div>

  <div id="verdict-section">
    <h2>Your Verdict</h2>
    <div id="verdict-buttons">
      <button class="v-btn v-btn-pass" onclick="setVerdict('pass')">Pass</button>
      <button class="v-btn v-btn-partial" onclick="setVerdict('partial')">Partial</button>
      <button class="v-btn v-btn-fail" onclick="setVerdict('fail')">Fail</button>
      <span id="save-flash">&#10003; Saved</span>
    </div>
    <textarea id="notes-area" rows="3" placeholder="Optional notes..."></textarea>
  </div>

  <div id="footer">
    <button class="nav-btn" onclick="navigate(-1)">&#8592; Prev</button>
    <button class="nav-btn" onclick="navigate(1)">Next &#8594;</button>
    <span id="footer-info"></span>
    <button id="export-btn" onclick="exportLabels()">Export labels.json</button>
  </div>
</div>

<script>
const CASES = ${safeJson(allCases)};
const RUBRICS_CONDENSED = ${safeJson(rubricCondensed)};

const SKILL_QUESTIONS = {
  'input-brief-to-ptr': 'Skill có tạo Draft PTR hợp lý từ brief không (đúng actor/system/flow/gateway THEO BRIEF)? KHÔNG đòi quy trình hoàn hảo vượt ngoài brief.',
  'process-improvement-recommendation': 'Skill có làm tốt ĐÚNG cái ptrAiAction được yêu cầu không (điền field / chia task khi action là split / thêm gateway khi action yêu cầu)? KHÔNG chấm quy trình tổng thể.',
  'artifact-review': 'Review có bắt được các lỗi đang HIỆN DIỆN trong artifact không? KHÔNG đòi review hoàn hảo tuyệt đối.',
};

let currentIdx = 0;
let labels = JSON.parse(localStorage.getItem('cal_labels') || '[]');

// ── Label helpers ─────────────────────────────────────────────────────────────
function getLabel(skillId, caseId) {
  return labels.find(l => l.skillId === skillId && l.caseId === caseId) || null;
}

function setLabel(skillId, caseId, verdict, notes) {
  const existing = labels.find(l => l.skillId === skillId && l.caseId === caseId);
  if (existing) {
    existing.humanVerdict = verdict;
    existing.notes = notes;
  } else {
    labels.push({ skillId, caseId, humanVerdict: verdict, notes });
  }
  localStorage.setItem('cal_labels', JSON.stringify(labels));
  flashSaved();
}

function flashSaved() {
  const el = document.getElementById('save-flash');
  el.style.opacity = '1';
  setTimeout(() => { el.style.opacity = '0'; }, 1200);
}

// ── Navigation ────────────────────────────────────────────────────────────────
function navigate(delta) {
  // Save current notes before leaving
  const notesEl = document.getElementById('notes-area');
  if (notesEl) {
    const c = CASES[currentIdx];
    const lbl = getLabel(c.skillId, c.caseId);
    if (lbl) {
      lbl.notes = notesEl.value;
      localStorage.setItem('cal_labels', JSON.stringify(labels));
    }
  }
  currentIdx = Math.max(0, Math.min(CASES.length - 1, currentIdx + delta));
  renderCase();
}

// ── Input renderers ───────────────────────────────────────────────────────────
function esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function jsonFallback(val) {
  return '<pre class="json-fallback">' + esc(JSON.stringify(val, null, 2)) + '</pre>';
}

function renderInputBrief(input) {
  const i = input || {};
  const pi = i.processInfo || {};
  let html = '';
  html += '<h3>' + esc(pi.processName || '(no name)') + '</h3>';
  html += '<p class="field"><span class="label">Domain:</span> ' + esc(pi.businessDomain) + '</p>';
  html += '<p class="field"><span class="label">Org:</span> ' + esc(pi.organizationName) + '</p>';
  if (i.businessObjective) html += '<p class="field"><span class="label">Objective:</span> ' + esc(i.businessObjective) + '</p>';
  if (i.scope) html += '<p class="field"><span class="label">Scope:</span> ' + esc(i.scope) + '</p>';

  if (Array.isArray(i.actors) && i.actors.length) {
    html += '<p class="field" style="font-weight:600;margin-top:8px">Actors</p>';
    html += '<table><thead><tr><th>Name</th><th>Role</th><th>Type</th></tr></thead><tbody>';
    for (const a of i.actors) html += '<tr><td>' + esc(a.name) + '</td><td>' + esc(a.role) + '</td><td>' + esc(a.type) + '</td></tr>';
    html += '</tbody></table>';
  }

  if (Array.isArray(i.relatedSystems) && i.relatedSystems.length) {
    html += '<p class="field" style="font-weight:600;margin-top:8px">Related Systems</p>';
    html += '<table><thead><tr><th>Name</th><th>Purpose</th></tr></thead><tbody>';
    for (const s of i.relatedSystems) html += '<tr><td>' + esc(s.name) + '</td><td>' + esc(s.purpose) + '</td></tr>';
    html += '</tbody></table>';
  }

  if (Array.isArray(i.happyPath) && i.happyPath.length) {
    html += '<p class="field" style="font-weight:600;margin-top:8px">Happy Path</p><ol>';
    for (const step of i.happyPath) html += '<li>' + esc(typeof step === 'string' ? step : JSON.stringify(step)) + '</li>';
    html += '</ol>';
  }

  if (Array.isArray(i.exceptionPaths) && i.exceptionPaths.length) {
    html += '<p class="field" style="font-weight:600;margin-top:8px">Exception Paths</p><ul>';
    for (const ep of i.exceptionPaths) html += '<li>' + esc(typeof ep === 'string' ? ep : JSON.stringify(ep)) + '</li>';
    html += '</ul>';
  }

  if (Array.isArray(i.riskControls) && i.riskControls.length) {
    html += '<p class="field" style="font-weight:600;margin-top:8px">Risk Controls</p><ul>';
    for (const rc of i.riskControls) html += '<li>' + esc(typeof rc === 'string' ? rc : JSON.stringify(rc)) + '</li>';
    html += '</ul>';
  }

  return html;
}

function renderPIRInput(input) {
  const i = input || {};
  const meta = i.metadata || {};
  let html = '';
  if (meta.ptrAiAction) html += '<div class="pir-badge">' + esc(meta.ptrAiAction) + '</div>';
  const targets = Array.isArray(i.targetStepIds) ? i.targetStepIds : [];
  if (targets.length) html += '<p class="field"><span class="label">Target Steps:</span> ' + esc(targets.join(', ')) + '</p>';

  const tasks = Array.isArray(i.processTasks) ? i.processTasks : [];
  const shown = targets.length
    ? tasks.filter(t => targets.includes(t.stepId))
    : tasks.slice(0, 5);

  if (shown.length) {
    html += '<p class="field" style="font-weight:600;margin-top:8px">Process Tasks' + (targets.length ? ' (target)' : ' (first 5)') + '</p>';
    html += '<table><thead><tr><th>stepId</th><th>taskName</th><th>actor</th><th>system</th><th>bpmnType</th></tr></thead><tbody>';
    for (const t of shown) {
      html += '<tr>';
      html += '<td>' + esc(t.stepId) + '</td>';
      html += '<td>' + esc(t.taskName) + '</td>';
      html += '<td>' + esc(t.actor) + '</td>';
      html += '<td>' + esc(t.system) + '</td>';
      html += '<td><span class="bpmn-badge">' + esc(t.bpmnType) + '</span></td>';
      html += '</tr>';
    }
    html += '</tbody></table>';
  }
  return html;
}

function renderARInput(input) {
  const i = input || {};
  let html = '';
  if (i.artifactType) html += '<div class="artifact-badge">' + esc(i.artifactType) + '</div>';

  const tpl = i.selectedTemplate || {};
  if (tpl.id || tpl.name) {
    html += '<p class="field"><span class="label">Template:</span> ' + esc(tpl.id) + ' — ' + esc(tpl.name) + '</p>';
  }

  const tasks = Array.isArray(i.processTasks) ? i.processTasks : [];
  html += '<p class="field"><span class="label">Process Tasks:</span> ' + tasks.length + ' tasks</p>';

  if (Array.isArray(i.qaIssues) && i.qaIssues.length) {
    html += '<p class="field" style="font-weight:600">QA Issues</p><ul>';
    for (const q of i.qaIssues) html += '<li>' + esc(typeof q === 'string' ? q : JSON.stringify(q)) + '</li>';
    html += '</ul>';
  }

  if (i.artifactXml) {
    const preview = String(i.artifactXml).slice(0, 500);
    html += '<p class="field" style="font-weight:600;margin-top:8px">Artifact XML (preview)</p>';
    html += '<pre style="white-space:pre-wrap;overflow:hidden;font-size:10px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:4px;padding:6px;max-height:80px">' + esc(preview) + '...</pre>';
  }
  return html;
}

function renderInput(skillId, input) {
  if (skillId === 'input-brief-to-ptr') return renderInputBrief(input);
  if (skillId === 'process-improvement-recommendation') return renderPIRInput(input);
  if (skillId === 'artifact-review') return renderARInput(input);
  return jsonFallback(input);
}

// ── Output renderers ──────────────────────────────────────────────────────────
function renderDraftProcessTasks(tasks) {
  if (!Array.isArray(tasks) || !tasks.length) return '<p style="color:#64748b;font-size:12px">No tasks.</p>';
  let html = '<table><thead><tr><th>stepId</th><th>taskName</th><th>actor</th><th>system</th><th>bpmnType</th><th>defaultNextStep</th></tr></thead><tbody>';
  for (const t of tasks) {
    const name = String(t.taskName || '');
    const shortName = name.length > 60 ? name.slice(0, 60) + '…' : name;
    html += '<tr>';
    html += '<td>' + esc(t.stepId) + '</td>';
    html += '<td>' + esc(shortName) + '</td>';
    html += '<td>' + esc(t.actor) + '</td>';
    html += '<td>' + esc(t.system) + '</td>';
    html += '<td><span class="bpmn-badge">' + esc(t.bpmnType) + '</span></td>';
    html += '<td>' + esc(t.defaultNextStep) + '</td>';
    html += '</tr>';
  }
  html += '</tbody></table>';
  return html;
}

function riskBadge(level) {
  const cls = level === 'high' ? 'risk-high' : level === 'medium' ? 'risk-medium' : 'risk-low';
  return '<span class="risk-badge ' + cls + '">' + esc(level) + '</span>';
}

function renderRecommendations(recs) {
  if (!Array.isArray(recs) || !recs.length) return '<p style="color:#64748b;font-size:12px">No recommendations.</p>';
  let html = '';
  for (const r of recs) {
    const ops = Array.isArray(r.operations) ? r.operations.map(o => o.kind).join(', ') : '';
    html += '<div class="rec-card">';
    html += '<div class="rec-title">' + esc(r.title || r.id) + ' ' + (r.riskLevel ? riskBadge(r.riskLevel) : '') + '</div>';
    if (r.rationale) html += '<div class="rec-rationale">' + esc(r.rationale) + '</div>';
    if (ops) html += '<div class="rec-ops">Ops: ' + esc(ops) + '</div>';
    if (Array.isArray(r.targetStepIds) && r.targetStepIds.length) {
      html += '<div class="rec-ops">Steps: ' + esc(r.targetStepIds.join(', ')) + '</div>';
    }
    html += '</div>';
  }
  return html;
}

function renderAROutput(output) {
  const o = output || {};
  let html = '';

  const warnings = Array.isArray(o.warnings) ? o.warnings : [];
  html += '<p class="field" style="font-weight:600">Warnings</p>';
  if (warnings.length) {
    html += '<ul>';
    for (const w of warnings) html += '<li>' + esc(typeof w === 'string' ? w : JSON.stringify(w)) + '</li>';
    html += '</ul>';
  } else {
    html += '<p style="color:#64748b;font-size:12px">No warnings.</p>';
  }

  html += '<p class="field" style="font-weight:600;margin-top:10px">Recommendations</p>';
  html += renderRecommendations(o.recommendations);

  if (Array.isArray(o.templateRecommendations) && o.templateRecommendations.length) {
    html += '<p class="field" style="font-weight:600;margin-top:10px">Template Recommendations</p>';
    for (const tr of o.templateRecommendations) {
      html += '<div class="rec-card">';
      html += '<div class="rec-title">' + esc(tr.title || tr.id) + '</div>';
      if (Array.isArray(tr.affectedFields) && tr.affectedFields.length) {
        html += '<div class="rec-ops">Fields: ' + esc(tr.affectedFields.join(', ')) + '</div>';
      }
      html += '</div>';
    }
  }

  // Unknown top-level keys (never render judge fields even if accidentally present in output)
  const knownKeys = new Set(['warnings', 'recommendations', 'templateRecommendations', 'verdict', 'overall', 'judgeNotes']);
  const unknownKeys = Object.keys(o).filter(k => !knownKeys.has(k));
  if (unknownKeys.length) {
    html += '<p class="field" style="font-weight:600;margin-top:10px">Other fields</p>';
    for (const k of unknownKeys) {
      html += '<p class="field" style="font-size:11px;font-weight:600">' + esc(k) + '</p>';
      html += jsonFallback(o[k]);
    }
  }
  return html;
}

function renderOutput(skillId, output) {
  if (skillId === 'input-brief-to-ptr') {
    const o = output || {};
    return renderDraftProcessTasks(o.draftProcessTasks);
  }
  if (skillId === 'process-improvement-recommendation') {
    const o = output || {};
    return renderRecommendations(o.recommendations);
  }
  if (skillId === 'artifact-review') {
    return renderAROutput(output);
  }
  return jsonFallback(output);
}

// ── Render case ───────────────────────────────────────────────────────────────
function renderCase() {
  const c = CASES[currentIdx];
  const lbl = getLabel(c.skillId, c.caseId);

  // Progress bar
  const pct = ((currentIdx + 1) / CASES.length * 100).toFixed(1);
  document.getElementById('progress-bar-fill').style.width = pct + '%';
  document.getElementById('progress-text').textContent = (currentIdx + 1) + ' / ' + CASES.length;

  // Skill badge
  const badgeEl = document.getElementById('skill-badge-el');
  badgeEl.textContent = c.skillId;
  badgeEl.className = 'skill-badge skill-' + c.skillId.replace(/-/g, '-');
  const colorMap = {
    'input-brief-to-ptr': '#2563eb',
    'process-improvement-recommendation': '#16a34a',
    'artifact-review': '#7c3aed',
  };
  badgeEl.style.background = colorMap[c.skillId] || '#64748b';

  // Case ID
  document.getElementById('case-id-el').textContent = c.skillId + ' / ' + c.caseId;

  // Per-action question banner
  const question = SKILL_QUESTIONS[c.skillId] || '';
  let bannerHtml = '❓ ' + esc(question);
  if (c.skillId === 'process-improvement-recommendation') {
    const pirAction = ((c.input || {}).metadata || {}).ptrAiAction || '(unknown)';
    bannerHtml += '<br><span style="margin-top:6px;display:inline-block">ptrAiAction của case này: <span class="action-label">' + esc(pirAction) + '</span></span>';
  }
  document.getElementById('question-banner').innerHTML = bannerHtml;

  // Input / Output
  document.getElementById('input-content').innerHTML = renderInput(c.skillId, c.input);
  document.getElementById('output-content').innerHTML = renderOutput(c.skillId, c.output);

  // Rubric
  document.getElementById('rubric-text').textContent = RUBRICS_CONDENSED[c.skillId] || '(no rubric)';

  // Verdict buttons
  const verdicts = ['pass', 'partial', 'fail'];
  for (const v of verdicts) {
    const btn = document.querySelector('.v-btn-' + v);
    btn.classList.toggle('active', lbl ? lbl.humanVerdict === v : false);
  }

  // Notes
  document.getElementById('notes-area').value = lbl ? (lbl.notes || '') : '';

  // Footer
  const labeled = labels.length;
  document.getElementById('footer-info').textContent =
    'Case ' + (currentIdx + 1) + ' of ' + CASES.length + '  |  ' + labeled + ' labeled';
}

// ── Verdict/notes handlers ────────────────────────────────────────────────────
function setVerdict(v) {
  const c = CASES[currentIdx];
  const notes = document.getElementById('notes-area').value;
  setLabel(c.skillId, c.caseId, v, notes);
  // Update buttons only
  const verdicts = ['pass', 'partial', 'fail'];
  for (const vv of verdicts) {
    document.querySelector('.v-btn-' + vv).classList.toggle('active', vv === v);
  }
  document.getElementById('footer-info').textContent =
    'Case ' + (currentIdx + 1) + ' of ' + CASES.length + '  |  ' + labels.length + ' labeled';
}

document.getElementById('notes-area').addEventListener('change', function() {
  const c = CASES[currentIdx];
  const lbl = getLabel(c.skillId, c.caseId);
  if (lbl) {
    lbl.notes = this.value;
    localStorage.setItem('cal_labels', JSON.stringify(labels));
    flashSaved();
  }
});

// ── Export ────────────────────────────────────────────────────────────────────
function exportLabels() {
  const blob = new Blob([JSON.stringify(labels, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'labels.json'; a.click();
  URL.revokeObjectURL(url);
}

// ── Rubric toggle ─────────────────────────────────────────────────────────────
function toggleRubric() {
  const panel = document.getElementById('rubric-panel');
  const btn = document.getElementById('rubric-toggle');
  const visible = panel.style.display === 'block';
  panel.style.display = visible ? 'none' : 'block';
  btn.textContent = visible ? 'Show Rubric' : 'Hide Rubric';
}

// ── Keyboard nav ──────────────────────────────────────────────────────────────
document.addEventListener('keydown', function(e) {
  if (e.target.tagName === 'TEXTAREA') return;
  if (e.key === 'ArrowLeft') navigate(-1);
  if (e.key === 'ArrowRight') navigate(1);
});

// ── Init ──────────────────────────────────────────────────────────────────────
renderCase();
</script>
</body>
</html>
`;

// ── Write output ──────────────────────────────────────────────────────────────
fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
fs.writeFileSync(OUT_FILE, html, "utf8");
console.log(
  `[build-labeling-app] Written ${OUT_FILE} (${allCases.length} cases, ${SKILLS.length} skills)`
);
