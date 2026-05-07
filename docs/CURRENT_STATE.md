# Current State

## 1. Current completed modules

Process Blueprint AI Workbench currently has an MVP flow where the Process Task Register is the single source of truth for generated artifacts.

Completed modules:

- Core data models:
  - `ProcessTask`
  - `TemplateProfile`
  - `Workspace`
- SME Online Loan sample data.
- Editable Process Task Register:
  - Inline editing
  - Controlled dropdowns for core BPMN fields
  - Add row
  - Duplicate row
  - Delete row
  - Save/load/reset with `localStorage`
- Template Library and Template Profile Editor:
  - D01 BPMN template selection
  - D02 Service Blueprint template selection
  - Editable template rule fields
  - Save/load/reset with `localStorage`
- Rule-based QA Engine and QA Panel:
  - Errors, warnings, suggestions
  - Row highlight from issue click
  - QA Report download
- D01 BPMN generator and output UI:
  - BPMN 2.0 XML generation
  - `.bpmn` download
  - Read-only visual preview using `bpmn-js`
- D02 Service Blueprint generator and output UI:
  - draw.io compatible XML generation
  - `.drawio` download
  - Task cards using 3 joined boxes
- Export Center:
  - Generate all artifacts
  - Artifact readiness/freshness status
  - ZIP package download with D01, D02, Process Task Register JSON, Template Profile JSON, and QA Report Markdown

## 2. D01 current status

D01 BPMN currently generates BPMN XML from `ProcessTask[]` and the selected D01 `TemplateProfile`.

Current status:

- Uses BPMN typed elements instead of generic task by default:
  - Start Event
  - End Event
  - User Task
  - Service Task
  - Send Task
  - Exclusive Gateway
- Exclusive gateways include default flow handling.
- Default gateway flows do not include `conditionExpression`.
- Non-default gateway flows include readable condition expressions.
- Data objects are deduplicated by normalized `dataObject` name.
- Task data flow uses `dataInputAssociation` and `dataOutputAssociation`.
- Data associations are not attached directly to gateways/end events.
- BPMN IDs use clearer prefixes for events, gateways, and task types.
- Collaboration pools have been introduced:
  - SME Customer
  - Bank / Financial Institution
  - External Data Providers
- Bank pool includes internal lanes for channel, RM, Ops Support, Credit Approver, LOS/Workflow, Notification Service, and Document/OCR.
- Cross-pool interaction uses message flows where applicable.
- Output includes BPMN DI shapes/edges and can be previewed with `bpmn-js`.

Known D01 risks:

- Needs repeated validation in Camunda Modeler after real user edits.
- Layout is still intentionally simple and may become wide for large processes.
- Advanced BPMN constructs are not yet covered, such as boundary events, event-based gateways, sub-processes, and complex exception choreography.

## 3. D02 current status

D02 Service Blueprint currently generates draw.io compatible XML from `ProcessTask[]` and the selected D02 `TemplateProfile`.

Current status:

- Uses Process Task Register as source data.
- Keeps one `ProcessTask` as one card.
- Does not merge tasks.
- Uses phase columns.
- Uses default Service Blueprint rows when template row rules are missing.
- Generates task cards as 3 joined boxes:
  - Header = actor
  - Middle = task name + BPMN type + task nature
  - Footer = system/app
- Supports `.drawio` download.
- Output is designed to open in diagrams.net/draw.io.

Known D02 risks:

- No in-browser D02 preview yet.
- Template visual rules are still only partially applied.
- Large blueprints may still need manual layout review in diagrams.net.
- D02 remains deterministic and rule-based; it does not yet use AI-assisted design recommendations.

## 4. Latest completed D02 fixes

Recently completed D02 improvements:

- Row assignment:
  - Actor-based mapping now takes priority over BPMN type.
  - Customer actions stay in Customer Actions.
  - RM/Ops/Approver actions stay in Back-stage Interactions - People.
  - System service tasks map to Back-stage Interactions - System / Tools.
  - Gateways map by decision owner instead of being pushed to Data / Control.
  - `dataAction` alone no longer forces user/system tasks into Data / Control.
- Dynamic layout:
  - Row height is calculated from card count.
  - Phase width is calculated from the number of cards in that phase.
  - Page width/page height adjust dynamically.
- Separator lines:
  - Line of Interaction
  - Line of Visibility
  - Line of Internal Interaction
  - Lines span all phase columns and move with dynamic row heights.
- Top context rows:
  - STEPS populated from phase/group/stage data.
  - PHASE populated from `ProcessTask.phase`.
  - TIME populated from `sla`, or `TBD`.
  - EVIDENCE populated from input/output/dataObject/system, or `TBD`.
- Duplicate connectors:
  - Source-target connector pairs are deduplicated.
  - The blueprint no longer emits both solid and dashed connectors for the same pair by default.
  - Connector output is limited to main journey flow, useful cross-layer associations, and critical exception links.
- Notation styling:
  - Header color differs by actor group.
  - Gateway cards look different from normal tasks.
  - Data/control cards look different from normal tasks.
  - Start/end event cards look different from normal tasks.
  - Send Task / notification cards have a message-style notation.
- Horizontal row stretching:
  - Tasks inside the same row/phase are arranged left-to-right first.
  - Phase columns expand horizontally when needed.
  - Rows grow vertically only when cards wrap.

## 5. Next priority

Recommended next priorities:

1. D02 single source of truth from Process Task Register
   - Tighten the contract between Process Task Register fields and D02 row/card/connector generation.
   - Make it explicit which fields control D02 row, card notation, evidence, timing, and associations.
2. Front-stage Interactions - People
   - Add a clearer row/layer distinction for human front-stage interactions.
   - Separate customer-facing human interactions from back-stage people work.
3. D02 preview
   - Add in-browser draw.io/XML preview or a lightweight visual render.
   - Keep download behavior unchanged.
4. Process Task Register changes
   - Improve fields needed for D02, such as blueprint row override, customer-visible flag, evidence, channel, and journey step.
   - Preserve backward compatibility with saved data.
5. Excel export/import
   - Export Process Task Register and Template Profiles to Excel.
   - Import reviewed Excel back into the app with validation.
6. QA recommendation apply
   - Let users apply safe QA fixes directly to the Process Task Register.
   - Keep changes explicit and reviewable.
7. AI design
   - Add AI-assisted suggestions for decomposition, row assignment, ambiguity detection, missing fields, and template fit.
   - Avoid sending sensitive banking data externally without explicit approval.

## 6. Key files and what they do

- `src/lib/models/process-task.ts`
  - Defines `ProcessTask` and process-related union types.
- `src/lib/models/template-profile.ts`
  - Defines `TemplateProfile`, template type, status, and rule structures.
- `src/lib/models/workspace.ts`
  - Defines workspace metadata.
- `src/lib/sample-data/sme-online-loan.ts`
  - Provides SME Online Loan sample workspace, templates, and process tasks.
- `src/components/task-register/ProcessTaskRegister.tsx`
  - Editable Process Task Register UI.
- `src/components/template-library/TemplateLibraryEditor.tsx`
  - Template library, template profile editor, and selected D01/D02 template UI.
- `src/lib/qa/task-register-rules.ts`
  - Rule-based QA checks for Process Task Register quality.
- `src/components/qa-panel/QAPanel.tsx`
  - QA issue panel, row highlighting trigger, and QA Report download entry point.
- `src/lib/generators/bpmn-generator.ts`
  - D01 BPMN XML generator.
- `src/components/bpmn-output/D01BpmnOutput.tsx`
  - D01 generation UI, XML display, status, and `.bpmn` download.
- `src/components/preview/BpmnPreview.tsx`
  - Read-only BPMN visual preview using `bpmn-js`.
- `src/lib/generators/drawio-service-blueprint-generator.ts`
  - D02 Service Blueprint draw.io XML generator, layout, row assignment, cards, separators, and connectors.
- `src/components/service-blueprint-output/D02ServiceBlueprintOutput.tsx`
  - D02 generation UI, XML display, status, and `.drawio` download.
- `src/lib/generators/qa-report-generator.ts`
  - Markdown QA Report generator.
- `src/components/export-center/ExportCenter.tsx`
  - Generates all artifacts, shows readiness/freshness, and exports ZIP package.
- `src/lib/utils/artifact-state.ts`
  - Shared artifact freshness/status helpers.
- `src/app/page.tsx`
  - Main page composition for the MVP workbench.
- `src/app/globals.css`
  - Global styles and `bpmn-js` CSS imports.
