# User Gate 1 Guide

## Purpose

User Gate 1 validates whether MVP1-AI Stable is understandable, trustworthy, and useful for a real process-to-delivery workflow.

The session is designed for a 30-45 minute moderated demo with PO, BA, SA, Product Manager, Business Architect, or Solution Architect users. It works for both technical and non-technical participants.

## Success Criteria

- The participant understands the flow from business input to controlled artifacts.
- The participant can explain what is draft, what is source of truth, and what requires approval.
- The participant can review AI output before applying or exporting it.
- The facilitator captures usability, trust, traceability, and AI safety feedback.
- Known limitations and follow-up actions are recorded.

## Core Message For The Facilitator

Use this message consistently during the session:

> The app does not let AI silently change the source process. AI creates drafts, recommendations, or review findings. The user reviews, previews, and explicitly applies or exports the result.

For process artifacts, the Process Task Register is the source of truth. D01 BPMN, D02 Service Blueprint, QA Report, JSON exports, and ZIP package are generated from the Process Task Register and selected templates.

## Setup Checklist

Before the session:

- Confirm the app opens locally at `http://localhost:3000`.
- Confirm the demo data is reset or in a known sample state.
- Confirm the browser zoom is comfortable for screen sharing.
- Confirm whether real AI is configured.
- If real AI is not configured, use mock/local mode and say this explicitly.
- Confirm the facilitator can access AI Input Brief, Process Task Register, QA Panel, D01 BPMN, D02 Service Blueprint, Template Library, and Export Center.
- Prepare a short business scenario, for example SME online loan origination.
- Prepare a note-taking document using the follow-up capture format below.

Optional external tools:

- Camunda Modeler for `.bpmn` inspection.
- diagrams.net for `.drawio` inspection.

If external modelers are not available, use in-app preview and exported file download only. Do not block the session.

## Suggested Scenario

Use a simple, familiar process:

SME Online Loan Application

Business intent:

- A customer submits an online loan request.
- The bank checks eligibility and documents.
- A credit officer reviews the application.
- The system sends approval, rejection, or request-for-more-information notification.
- The process should preserve actor, system, data, SLA, risk/control, and review status where possible.

Keep the scenario short enough that the participant can reason about the flow without needing domain training.

## Session Agenda

| Time | Activity | Goal |
| --- | --- | --- |
| 0-5 min | Context and consent | Explain purpose, data safety, and no-auto-apply rule. |
| 5-12 min | AI Input Brief | Show business input becoming a Draft PTR. |
| 12-20 min | Process Task Register | Review and edit the source process rows. |
| 20-27 min | QA Panel | Show deterministic QA, AI findings/recommendations, preview, and approval. |
| 27-34 min | D01 and D02 | Generate BPMN and Service Blueprint from PTR. |
| 34-39 min | Export Center | Generate/download controlled package. |
| 39-45 min | Feedback | Ask structured questions and capture follow-ups. |

If time is limited, prioritize AI Input Brief, PTR, QA Panel, and Export Center.

## Facilitator Script

### 1. Opening

Say:

- "This is a controlled workbench, not a chatbot."
- "The goal is to turn business process knowledge into reviewable artifacts."
- "AI output is never auto-applied. You will always see draft, preview, recommendation, or review finding first."
- "For sensitive banking or enterprise data, real AI should only be used when the organization approves cloud processing or a configured provider. Mock/local mode is available."

Ask:

- "In your current work, where do process notes usually live before they become specs?"
- "What would make you trust or distrust an AI-generated process artifact?"

### 2. AI Input Brief Demo

Show the AI Input Brief using the seven visible sections:

- Process information
- Business objective
- Scope
- Start-End point
- Actors
- Related systems
- Data and documents

Demo steps:

1. Enter or paste the sample scenario.
2. Generate Draft Process Task Register.
3. Point out assumptions, open questions, confidence, and quality issues if present.
4. Emphasize that the draft has not changed the main PTR yet.
5. Show Replace or Append as explicit user actions, but only apply if the demo plan calls for it.

User task:

- Ask the participant to identify one missing actor, system, data object, or business rule.
- Ask them whether they would Replace, Append, or keep reviewing.

Observe:

- Do they understand draft vs applied state?
- Do assumptions and open questions help them trust the output?
- Do they know what to do next?

### 3. Process Task Register Demo

Show the PTR as the canonical process source.

Demo steps:

1. Point out step id, BPMN type, actor, system, task name, input, output, next step, risk/control, and review status.
2. Edit a small field such as actor, system, or task wording.
3. Save the register.
4. Mention that generated artifacts become stale when source data changes.

User task:

- Ask the participant to review 2-3 rows and say whether the process is clear enough for a BA/SA handoff.
- Ask them to find one row that should be marked for review or needs more detail.

Observe:

- Can they scan the table?
- Are field names understandable?
- Does the source-of-truth concept feel clear?

### 4. QA Panel Demo

Show QA as a safety and quality layer.

Demo steps:

1. Create or use a known issue, such as missing actor, missing system, or gateway branch gap.
2. Run or review Rule QA issues.
3. Show findings and recommendations separately if available.
4. For recommendations, show preview before apply.
5. Explain that graph-changing or high-risk recommendations require explicit confirmation and are not selected by default.
6. Apply only a safe recommendation if useful for the demo.

User task:

- Ask the participant which QA finding they would fix first and why.
- Ask whether the recommendation preview gives enough confidence to apply the change.

Observe:

- Do they trust rule QA more than AI QA, or vice versa?
- Do they understand the difference between finding and recommendation?
- Do they notice risk, confidence, affected rows, and preview text?

### 5. D01 BPMN Demo

Show D01 BPMN generation from the current PTR and selected template.

Demo steps:

1. Generate BPMN XML.
2. Show the visual preview.
3. Mention that BPMN is generated from PTR, not edited as the source.
4. Show post-generation gate status when available.
5. Download `.bpmn` if useful.
6. If Camunda Modeler is unavailable, state that in-app preview is enough for this session.

User task:

- Ask whether the BPMN diagram is understandable enough for process review.
- Ask what would make the diagram easier to trust or present.

Observe:

- Is the participant looking for actor/system/lane traceability?
- Do they expect direct diagram editing?
- Do they understand generated artifact vs source data?

### 6. D02 Service Blueprint Demo

Show D02 Service Blueprint generation from the same PTR.

Demo steps:

1. Generate Service Blueprint XML.
2. Show the in-app preview or downloaded `.drawio`.
3. Explain that each ProcessTask should remain one card.
4. Point out the three-box card pattern: actor, task, system/app.
5. Mention that diagrams.net can be used later if not available now.

User task:

- Ask which row or layer helps them understand customer/internal handoff best.
- Ask whether the card content is enough for service design review.

Observe:

- Do cards feel too dense or too sparse?
- Are phase and row labels understandable?
- Does D02 provide different value from D01?

### 7. Export Center Demo

Show Export Center as the controlled package area.

Demo steps:

1. Generate all artifacts.
2. Explain Fresh, Stale, and Not generated status.
3. Show available downloads: PTR JSON, QA Report, D01 BPMN, D02 draw.io, ZIP package, and product delivery previews where relevant.
4. Emphasize that export is user-triggered after review.

User task:

- Ask which artifacts they would send to BA, SA, developer, or stakeholder.
- Ask whether ZIP package contents are understandable and complete enough.

Observe:

- Do users understand artifact status?
- Do they expect a traceability matrix now?
- Do they need simpler names for exported files?

## Feedback Questions

### Usability

- Which step felt easiest to understand?
- Which step felt confusing or too technical?
- Could you run this workflow without a facilitator after one walkthrough?
- Which labels or actions need clearer wording?
- Where did you hesitate before clicking?

### Trust

- What made you trust the generated draft or recommendations?
- What made you hesitate?
- Were assumptions, open questions, confidence, warnings, and quality issues visible enough?
- Would you use this with a real process from your team?
- What evidence would you need before sharing generated artifacts with stakeholders?

### Traceability

- Could you tell where D01/D02/QA/export outputs came from?
- Was it clear that PTR is the source of truth for process artifacts?
- Did you need row-level trace links, source references, or artifact history?
- Which traceability view would be most valuable next?

### AI Review Safety

- Was it clear that AI does not auto-apply changes?
- Did preview-before-apply feel safe enough?
- Which AI actions should require stricter confirmation?
- What data would you avoid entering unless cloud AI policy is approved?
- Would mock/local mode be acceptable for early internal adoption?

### Business Value

- Which role would benefit most from this workflow?
- Which artifact is most valuable: PTR, QA Report, BPMN, Service Blueprint, ZIP package, or AI Coding Pack?
- What would make this worth using in a real delivery project?
- What is missing before this can support your team?

## Observation Notes Template

Use this format during the session:

```text
Participant role:
Domain:
Technical comfort:
AI mode shown: mock/local | real AI configured

Top 3 useful moments:
1.
2.
3.

Top 3 confusing moments:
1.
2.
3.

Trust signals noticed:
- 

Traceability gaps:
- 

Safety concerns:
- 

Feature requests:
- 

Quotes:
- 

Severity:
Low | Medium | High

Recommended follow-up:
- 
```

## Known Limitations To State Clearly

- Real AI may not be configured in the demo environment. Use mock/local mode when provider settings or feature flags are unavailable.
- Mock/local output is deterministic and useful for workflow validation, but it is not a quality benchmark for real provider reasoning.
- Sensitive banking or enterprise data should not be sent to cloud AI unless the organization has approved the provider, data mode, and no-training policy.
- File Intake supports text-based extraction paths; image/OCR/voice intake is not the focus of this gate.
- D01 BPMN and D02 Service Blueprint are generated artifacts. Fixes should route back to PTR or template recommendations, not direct XML mutation.
- Camunda Modeler and diagrams.net may not be available during the session. In-app preview and downloads are enough for User Gate 1.
- Full Artifact Graph, durable multi-user workspace, enterprise RBAC, and complete traceability matrix are future phases.
- Product Delivery artifacts are preview/export oriented in this slice and should not be presented as fully persisted Artifact Graph nodes.

## Sensitive Data Response

If a participant asks about sensitive data or cloud AI, say:

- "For sensitive banking or enterprise data, use local/mock or approved enterprise provider mode."
- "The browser should not contain provider API keys."
- "Real AI calls go through controlled server-side routes when enabled."
- "AI output must pass validation and be reviewed before apply or export."
- "Do not paste customer PII, account numbers, internal credit policy, or confidential documents into cloud AI unless the organization has approved that data flow."

Capture:

- What data class concerned them.
- Whether local-only or BYOK would satisfy them.
- What policy evidence they would need.

## Follow-Up Capture Format

After the session, convert notes into follow-up items:

```text
ID:
Source session:
User role:
Theme: usability | trust | traceability | safety | artifact quality | export | other
Finding:
Evidence or quote:
Impact: low | medium | high
Suggested action:
Owner:
Target milestone:
Decision needed: yes | no
```

## Facilitator Readiness Check

Before running User Gate 1, read this guide end to end and confirm:

- You can explain source of truth, draft, preview, recommendation, finding, apply, and export in simple language.
- You can run the demo in mock/local mode if real AI is unavailable.
- You can show AI Input Brief, PTR, QA, D01, D02, and Export Center in one session.
- You can answer sensitive data questions without promising unimplemented enterprise controls.
- You can capture feedback in a consistent format.
