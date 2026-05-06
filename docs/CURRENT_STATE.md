# Current State

## 1. Product goal

Process Blueprint AI Workbench helps business and delivery teams turn structured process information into reviewable delivery artifacts.

The current MVP focuses on a Process Task Register as the single source of truth, then generates:

- D01 BPMN XML / `.bpmn`
- D02 Service Blueprint draw.io XML / `.drawio`
- QA Report Markdown
- Output Package ZIP

The target domain is enterprise/banking process design, where traceability, data safety, reviewability, and template governance are required.

## 2. Current completed modules

- Core data models:
  - `ProcessTask`
  - `TemplateProfile`
  - `Workspace`
- SME Online Loan sample data with 30 process rows.
- Editable Process Task Register:
  - Inline edit
  - Add row
  - Duplicate row
  - Delete row
  - Save/load/reset
- Template Library and Template Profile Editor:
  - D01 BPMN template selection
  - D02 Service Blueprint template selection
  - Editable rule fields
- Rule-based QA Engine and QA Panel:
  - Errors, warnings, suggestions
  - Row highlight from issue click
  - QA Report download
- D01 BPMN generator:
  - BPMN 2.0 XML
  - BPMN DI shapes and edges
  - `.bpmn` download
  - Visual preview via `bpmn-js`
- D02 Service Blueprint draw.io generator:
  - `.drawio` XML
  - Task cards with header/middle/footer cells
  - `.drawio` download
- Export Center:
  - Generate all artifacts
  - Download ZIP package with 5 files
  - Artifact cache freshness status

## 3. Known D01 BPMN issues

- D01 output should still be validated in Camunda Modeler with real edited data, not only sample data.
- BPMN layout is simple horizontal layout and may become too wide for large processes.
- Data interactions are represented using BPMN data objects and associations, but detailed business semantics are still basic.
- Cache invalidation now marks generated artifacts stale after task/template changes, but broader artifact versioning is not implemented yet.
- The generator does not yet support advanced BPMN patterns such as sub-processes, event-based gateways, boundary events, pools beyond the current participant, or message flows between participants.

## 4. Known D02 Service Blueprint issues

- Dynamic row height is not yet implemented.
- Crowded phase/row combinations can cause overlapping cards.
- Row mapping is rule-based and basic; it should later use richer `TemplateProfile` configuration.
- Service Blueprint layout is simple and not optimized for large enterprise journeys.
- Template visual rules are only partially reflected in the draw.io output.
- No visual in-browser draw.io preview exists yet.

## 5. Current 1-day priority

Highest priority for the next working day:

1. Fix D02 dynamic row height to prevent overlapping cards.
2. Validate generated `.bpmn` in Camunda Modeler.
3. Validate generated `.drawio` in diagrams.net.
4. Run one clean end-to-end test:
   - Edit task
   - Select templates
   - Run QA
   - Generate D01
   - Generate D02
   - Download QA Report
   - Download ZIP
5. Document any import/opening errors as test cases before adding new feature areas.

## 6. Key files and what they do

- `src/lib/models/process-task.ts`
  - Defines `ProcessTask` and process-related union types.
- `src/lib/models/template-profile.ts`
  - Defines `TemplateProfile`, `TemplateType`, and `TemplateStatus`.
- `src/lib/models/workspace.ts`
  - Defines workspace metadata.
- `src/lib/sample-data/sme-online-loan.ts`
  - Provides sample workspace, templates, and SME Online Loan process tasks.
- `src/components/task-register/ProcessTaskRegister.tsx`
  - Editable table UI for the Process Task Register.
- `src/components/template-library/TemplateLibraryEditor.tsx`
  - Template library and selected D01/D02 template UI.
- `src/lib/qa/task-register-rules.ts`
  - Rule-based QA engine for Process Task Register quality checks.
- `src/components/qa-panel/QAPanel.tsx`
  - QA issue display and QA Report download entry point.
- `src/lib/generators/bpmn-generator.ts`
  - D01 BPMN XML generator.
- `src/components/bpmn-output/D01BpmnOutput.tsx`
  - D01 generation UI, XML display, and `.bpmn` download.
- `src/components/preview/BpmnPreview.tsx`
  - Read-only BPMN visual preview using `bpmn-js`.
- `src/lib/generators/drawio-service-blueprint-generator.ts`
  - D02 Service Blueprint draw.io XML generator.
- `src/components/service-blueprint-output/D02ServiceBlueprintOutput.tsx`
  - D02 generation UI, XML display, and `.drawio` download.
- `src/lib/generators/qa-report-generator.ts`
  - Markdown QA Report generator.
- `src/components/export-center/ExportCenter.tsx`
  - Generates all artifacts and exports ZIP package.
- `src/app/globals.css`
  - Global styles and `bpmn-js` CSS imports.

## 7. Long-term product direction

The workbench should evolve from process artifact generation into a broader enterprise delivery assistant.

Planned long-term directions:

- Business Capability Landscape
  - Extract capabilities from process scope, actors, systems, and data objects.
- BRD/URD generation
  - Generate structured business and user requirement documents from approved process tasks.
- Jira story/task generation
  - Convert process steps and requirements into epics, stories, tasks, and acceptance criteria.
- IT Capability Landscape
  - Map systems, data actions, integrations, controls, and technology responsibilities.
- Solution Architecture
  - Generate solution views including system interactions, data movement, and control points.
- UI generation
  - Derive UI flows, screens, forms, and interaction requirements from customer/system tasks.
- AI-assisted QA
  - Add deeper consistency, compliance, completeness, and ambiguity checks.
- Template review
  - Let reviewers inspect, approve, version, and compare output templates before generation.
