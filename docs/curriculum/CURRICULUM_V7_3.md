# AI Orchestration Engineering Curriculum v7.3

**Subtitle:** From Foundations → Agentic Systems → Banking AI Workbench → Solution Packaging
**Owner:** Hung Quach / Process Blueprint AI Workbench
**Generated:** 2026-06-13
**Supersedes:** v7.2 (2026-06-13), v7.1, v7, v6
**Location rule:** This file lives at `docs/curriculum/` in the repo. Chat is a workspace; this file is the source of truth; changes happen only via CCR commits (see §3.7).
**Purpose:** This is the single curriculum to follow for learning, practicing, building, and packaging the AI orchestration product.

---

## 0. Executive Summary

This curriculum is not only a learning plan. It is the operating system for turning `process-blueprint-ai-workbench` into a credible AI orchestration product.

The curriculum has four goals:

1. **Deep conceptual understanding** of AI, LLMs, agents, multi-agent orchestration, prompt engineering, context engineering, evaluation harnesses, MCP, RAG, governance, security, design engineering, and related foundations.
2. **Practical mastery** of common tools and solutions such as LangGraph, OpenAI Agents SDK, Claude Agent SDK / Claude Code, MCP, eval harnesses, provider routing, caching, AI-assisted design, and AI governance/security patterns.
3. **Shared professional vocabulary**: the ability to name your work using language recognized by the global AI engineering community.
4. **Solution packaging**: the ability to express everything through your product, demo, case study, metrics, security story, and architecture narrative — for both the PLG individual user and the enterprise buyer.

The current repo is best described as:

> A governed AI workflow workbench for process-to-delivery artifact generation, with strong foundations for AI orchestration.

It should **not yet** be described as a complete enterprise multi-agent system. It has the right foundation, but still needs model routing, advisor strategy, semantic self-correction, context engineering, PII masking, adversarial security, hard governance enforcement, observability, a design system contract, and Artifact Graph/Traceability foundations.

**v7.1 structural rule (kept):** the curriculum is split into a **Core Execution Spine** (mandatory, ordered, ships the product) and an **Expansion/Maturity Track** (depth work after the spine produces a baseline and a mini case study). See §6.0. Following all 28 lessons linearly is explicitly *not* the plan.

**v7.2 additions:** mobile development workflow (Remote Control / cloud / delegate) folded into Bài 0; a new Bài 0E for the **dev-agent layer and the user-feedback→development loop**; Claude Design recognized as a design-time tool for Bài 0D/21B; and an explicit **handover package** (§13b). See §0.3.

**v7.3 additions:** a new Bài 3B **Knowledge Substrate Strategy** (how to solve fragmented bank/personal data) with a `SOURCE_REGISTER` and a scope ADR; and Bài 19 expanded with **provenance-by-reference** (deliverables reference the exact bank data region+version, with a freshness lifecycle and reverse traceability) — the product binds to and tracks bank data instead of owning it. See §0.4.

---

## 0.1 What Changed from v6 to v7 (kept for traceability)

| # | Change | Why |
|---|---|---|
| 1 | Roadmap reordered: baseline eval before routing (Bài 7 before Bài 9). | v6 contradicted its own evaluation-driven principle; without a baseline you cannot prove the advisor strategy improves anything. |
| 2 | New Bài 17B — Adversarial AI Security & Red Teaming. | v6 governance only protected data going out (PII), not malicious data coming in (prompt injection via files, RAG corpus, MCP tool results). |
| 3 | New Bài 17C — Deployment Topology, Multi-tenancy & VN Compliance Mapping. | PLG → enterprise requires topology decisions; VN banking adds data residency and regulatory mapping. |
| 4 | Bài 7 deepened: golden datasets, LLM-as-judge, judge calibration, eval-in-CI. | v6 listed metrics but no methodology for judges or datasets. |
| 5 | Bài 9 deepened: caching levers, fallback/outage policy, executor/advisor as hypothesis. | Caching is often the biggest cost lever; role assignment must be earned by eval numbers. |
| 6 | Bài 14 deepened: retrieval metrics, hybrid search/reranking, Vietnamese embedding considerations. | RAG quality = retrieval quality + groundedness, each with own metrics. |
| 7 | Bài 17 deepened: Vietnamese PII pattern catalog. | Generic PII regexes miss Vietnamese banking data. |
| 8 | Bài 20 deepened: failure modes, incident runbook, release management for prompts/skills/packs. | You cannot operate what you cannot recover. |
| 9 | Bài 22 deepened: dual narrative (PLG + enterprise). | v6 packaged only for enterprise buyers, misaligned with individual-first GTM. |
| 10 | Gates strengthened with evidence criteria; Gate 5 added. | Doc-existence gates allow paper progress without product progress. |
| 11 | Time & cadence plan, risk & budget guardrails, doc-debt rule (ADRs). | v6 had no time dimension, no budget cap. |
| 12 | Heading/numbering normalized; vocabulary, forbidden list, references extended. | Hygiene. |

---

## 0.2 What Changed from v7 to v7.1

| # | Change | Why |
|---|---|---|
| 1 | **Two-track structure (§6.0): Core Execution Spine vs Expansion/Maturity Track.** Spine = Gate 0 → 0D → 7-min → 9-min ∥ 17 → 17B-min → (8 if needed) → 22-mini. | v7 risked becoming an "enterprise AI master plan" that slows product execution. The spine ships; the expansion deepens. |
| 2 | **New Bài 0D — Design System as Contract & AI UI Generation** (Spine). | For a PLG product aimed at PO/BA, UI quality decides the aha-moment. v7 had no lesson on AI *doing* design — Bài 21 only covered UX *of* AI features. |
| 3 | **New Bài 21B — Agentic Design Orchestration (Design ↔ FE ↔ BE)** (Expansion). | The design agent in Bài 0B was conceptualized but never developed; design work can be governed with the same contract/gate/HITL discipline as AI outputs. |
| 4 | **Gate 4 split into Learning Gate 4 and Product Gate 4.** | "Implemented OR fully designed" was too loose for banking claims. Design-only counts as learning done, never as banking-ready. |
| 5 | **Legal verification protocol + `docs/compliance/LEGAL_SOURCE_REGISTER.md`.** | Regulations change; AI must not be the final source of law. Every mapping needs an official source, a last-verified date, and a human owner before sales use. |
| 6 | **Model capability catalog hardened: `verifiedDate` + `deprecationPolicy` fields; rule: routing logic never hard-codes model name strings.** | Cleanup audit showed brittleness from model-string comparisons. The curriculum teaches the catalog principle, never "model X is always the advisor". |
| 7 | **Golden dataset growth & drift policy (v1 curated → v2 +failed production cases → v3 +red-team cases) and mandatory version stamping on every eval report.** | Without dataset/judge/rubric/model/prompt version stamps, eval numbers are not comparable over time. |
| 8 | **Trust-label taxonomy (6 labels) made a hard rule: no RAG chunk or MCP tool result enters context unlabeled.** Labels are necessary but not sufficient — structural controls remain the real defense. | Concrete, implementable anti-injection foundation connecting Bài 3, 13, 14, 17B. |
| 9 | **§10 rebuilt around `CURRICULUM_STATUS.md`: rolling 2-week plan updated in the weekly retro**, with a seed schedule. | A static 6-month table is a concept, not an operating schedule; a fixed long plan drifts by week 2. |
| 10 | **§3.7 Curriculum operating model: Chat = workspace, `docs/curriculum/` = source of truth, CCR = change mechanism, Git = history.** | Prevents the curriculum from drifting back into untraceable chat history as it grows. |
| 11 | Spine insurance: **tenant ID propagation through every new storage/audit write starts now** (pulled forward from Bài 17C). | Retrofitting tenancy into storage/feedback/audit later is expensive; propagating an ID now is cheap. |
| 12 | Bài 8 made **conditional in the spine**: do it only if the Bài 7 baseline reveals quality gaps worth the cost/latency. | Eval-driven discipline applies to the curriculum itself. |

---

## 0.3 What Changed from v7.1 to v7.2

| # | Change | Why |
|---|---|---|
| 1 | **Bài 0 deepened — Mobile Development Workflow.** Three execution models (Claude Code Remote Control = local session, machine on; cloud sessions = Anthropic cloud; Codex Cloud = delegate, machine off), with the Windows/WSL caveat and a data-safety rule. | The owner wants to develop anytime/anywhere, not only at a desk. Remote Control runs straight from the WSL CLI; Codex mobile *pairing* needs a macOS host (Windows pending), so on Windows the Codex mobile path is Codex Cloud. |
| 2 | **New Bài 0E — Dev-Agent Layer & User-Feedback Loop** (Spine). Enforcement tiering (hooks vs instructions vs subagents vs skills vs plugins), a subagent roster defined as contracts, and a two-loop feedback design. | The owner needs to create/govern the agents that build and change the product, and to feed user feedback/bugs back into development and later upgrades. v7.1 only covered product-runtime feedback (Bài 16), not dev-process feedback. |
| 3 | **Feedback→evidence rule:** a confirmed bug becomes a golden dataset case (Bài 7 v2); a security report becomes a red-team case (Bài 7/17B v3); a structural pattern becomes a CCR (§3.7). | Closes the loop: feedback is not fixed once and forgotten — it becomes a permanent regression guard or a curriculum change. |
| 4 | **Bài 0D note — Claude Design as a design-time tool** for sketching screens and the UI state catalog; its output feeds the design contract and is never a runtime UI engine. | Keeps the design contract (not an agent's taste) as source of truth, consistent with §3.1. |
| 5 | **New §13b — Handover Readiness** and a `HANDOVER.md` index artifact, framing the four handover layers (runnable code, decision map, operational/security evidence, product/people context). | The owner may hand the product to another person/team; the curriculum's artifacts *are* the handover package, and this makes that explicit and testable. |
| 6 | Governance enforcement principle hardened: **anything that must be true 100% of the time is a hook, not an instruction** — the dev-layer twin of §3.4 ("governance enforced, not shown"). | CLAUDE.md instructions are advisory (~80%); deterministic gates belong in hooks. |
| 7 | Tracking table, spine sequence, seed schedule, artifact set, forbidden list, references, and action plan updated for the above. Lesson count 26 → 27. | Hygiene. |

---

## 0.4 What Changed from v7.2 to v7.3

| # | Change | Why |
|---|---|---|
| 1 | **New Bài 3B — Knowledge Substrate Strategy.** A six-step framework (separate personal vs bank scope → inventory → canonical schema → source-of-truth vs reference corpus → Domain Pack → eval-driven incremental ingestion → governance), plus a `SOURCE_REGISTER` catalog template. | Bank/personal knowledge (process, docs, code, templates) is fragmented; the curriculum had the pieces (Bài 3/14/15/17C) but no strategy tying them together. |
| 2 | **New `docs/decisions/ADR-knowledge-substrate-scope.md`** — the product / connect-buy / org-people boundary, mapped to the 8 engines and to Tiers 1/2/3. | "What belongs in the product vs another scope" needs a durable, referenceable decision; trying to productize org/infra scope bloats the product and hits compliance. |
| 3 | **Bài 19 expanded — Provenance-by-Reference.** A `SourceRef` type binds each deliverable to an external bank data region + version + locator (metadata, not a copy); plus forward/reverse traceability, a freshness lifecycle, change-detection tiers, a Region Registry, and AI-assisted impact analysis. | Resolves the substrate boundary elegantly: the product does not own/host the bank's data — it references and tracks which region+version each deliverable used, so users can update canonical regions and know what to refresh. |
| 4 | **Provenance *capture* added to spine insurance** (record SourceRef at generation time as soon as RAG exists, with Bài 14); the full freshness lifecycle stays E4. | Same lesson as tenantId — retrofitting provenance onto already-generated deliverables is painful; capturing the metadata at creation is cheap. |
| 5 | Vocabulary, tracking table, two-track, artifact set, forbidden list, and action plan updated. Lesson count 27 → 28. | Hygiene. |

The throughline of v7.3: the product's moat (Artifact Graph + Traceability, Bài 19) *is* the answer to the fragmentation problem — bind to and track bank data, don't own it.

---

## 1. Source Alignment and Current Repository Baseline

### 1.1 Current repo checkpoint

- P0 cleanup has been completed and merged to `master`.
- P1.2 `prompt-engine` removal has been completed.
- Core provider/route/skill/eval logic has not fundamentally changed since the previous review.
- The curriculum is at the boundary before **Design Contract → Baseline Evaluation → Provider Routing & Advisor Strategy**.
- The product branch target remains aligned to full Module 2 + Module 3 MVP1-AI.

### 1.2 Important cleanup still pending

| Area | Status | Why it matters |
|---|---|---|
| P1.1 skill-ID cleanup | Pending | Remove legacy aliases and make `skill-registry-v2` the naming source of truth. |
| P1.3 retire `skill-engine` | Pending | Remove dual registry / dual source-of-truth risk. |
| P1.4 pin dependencies | Pending | Prevent non-reproducible builds caused by `latest`. |
| P1.5 decide SDK vs raw fetch | Pending | Avoid misleading dependencies and choose build-vs-buy intentionally. |
| ESLint 9 decision | Pending | Either configure lint or document intentional deferral. |
| P3 hygiene | Pending | EOL, i18n quality gate text, debug logging cleanup. |
| P2 route split | Pending | `route.ts` is too large and should become a thin dispatcher over time. |
| Banking masking/enforcement | Pending | Needed before serious enterprise/banking positioning. |

### 1.3 What must not be broken

The repo has several healthy foundations. Do not "clean up" these away:

- Process Task Register as canonical source for process artifacts.
- No browser API keys.
- Server-side real AI route.
- Mock/local fallback.
- Structured output and validators.
- Quality gates.
- Draft / Recommendation / Review Finding → Preview → Human approval.
- Deterministic D01 BPMN and D02 Service Blueprint generators.
- Audit metadata and eval harness foundations.

---

## 2. The Four Goals of Curriculum v7.1

### 2.1 Goal 1 — Deep Foundations and Principles

You should understand and explain the following without relying on buzzwords:

- LLMs and reasoning models.
- Provider differences and capability trade-offs.
- Prompt engineering versus context engineering.
- Structured output and schema engineering.
- Validation versus evaluation.
- Quality gates versus eval harnesses.
- Golden datasets, dataset drift policy, and LLM-as-judge methodology.
- Workflow orchestration versus agentic systems.
- Agent versus multi-agent.
- Tool use and MCP — including tool-use security.
- RAG, retrieval quality, and source grounding.
- Model routing, advisor strategies, capability catalogs, and caching economics.
- Design systems as contracts and AI-assisted design engineering.
- Human-in-the-loop design.
- AI governance, privacy, adversarial security, and enterprise safety.
- LLMOps / AgentOps observability and incident response.
- Multi-tenancy and deployment topology.
- Domain Packs and vertical AI.
- Artifact Graph and traceability engineering.

Every lesson must answer:

```text
What principle am I learning?
What problem does it solve?
When should I use it?
When should I not use it?
How does it map to my repo and product?
```

### 2.2 Goal 2 — Practical Mastery of Tools and Solutions

You should be able to build and evaluate real implementation slices in your repo:

- Define skill contracts.
- Write prompt packs.
- Build structured output schemas.
- Validate AI outputs.
- Build golden datasets (with growth policy) and eval harnesses with calibrated judges.
- Compare model/provider results with numbers.
- Design context assemblers with trust labels.
- Build PII masking layers (Vietnamese-aware).
- Build prompt-injection defenses and a red-team test suite.
- Design RAG/source-grounded output and measure retrieval quality.
- Create MCP connector architecture with security boundaries.
- Define a design system contract and generate UI with AI against it.
- Design agentic workflows.
- Evaluate LangGraph / OpenAI Agents / Claude Agent SDK trade-offs.
- Build model routing / advisor strategy / caching from a capability catalog.
- Build semantic self-correction.
- Track cost, latency, quality, and governance metadata.
- Operate releases: version, canary, A/B, rollback for prompts/skills/packs.

### 2.3 Goal 3 — Shared Global AI Vocabulary

You must be able to describe what you are doing using globally recognized AI engineering vocabulary.

Examples:

```text
skill-as-contract
context engineering
trust labeling
evaluation harness engineering
golden dataset
LLM-as-judge
agentic workflow
model routing / capability catalog
advisor strategy
prompt caching
guardrails
prompt injection / red teaming
design system as code / generative UI
human-in-the-loop
source-grounded generation
MCP tool integration
LLMOps / AgentOps
multi-tenancy
domain-specific AI
Artifact Graph
traceability engineering
AI-native UX
```

This is a core learning outcome. The purpose is not only to build a product, but also to be able to discuss it with AI engineers, product leaders, CTOs, CIOs, CISOs, founders, and the global AI community.

### 2.4 Goal 4 — Solution Packaging

Every major lesson must produce a reusable artifact: architecture note, ADR, eval report, cost report, security report, demo script, case study, before/after metrics, or README/roadmap update.

The final result should be a solution story:

> I built an AI orchestration workbench for banking process-to-delivery workflows, with skill-as-contract design, context engineering, structured output, calibrated eval harnesses, quality gates, advisor routing with caching economics, adversarial security, governance, a design system contract, domain packs, artifact traceability, observability, and a demo backed by cost/quality/privacy metrics — packaged for both individual PO/BA users and enterprise stakeholders.

---

## 3. Core Principles of the Curriculum

### 3.1 Build once to understand, use native to ship

```text
Build the primitive once.
Understand the trade-offs.
Compare with native tools.
Then decide build / buy / hybrid.
```

Examples: build your own route-based workflow before comparing with LangGraph; build a simple local eval harness before hosted eval platforms; build a basic agent pipeline before managed agent frameworks.

### 3.2 Avoid agent-washing

Do not call everything an agent. Use precise language:

| Term | Correct meaning | Repo mapping |
|---|---|---|
| Workflow | Predefined code path | Current `/api/ai/run-skill` route flow. |
| Agentic workflow | Workflow with model/advisor decisions under guardrails | After advisor + self-correct. |
| Agent | LLM with instructions, tools, loop, feedback, and stopping conditions | Future runtime components. |
| Multi-agent | Multiple agents with explicit roles, handoffs, or manager/worker topology | Future Bài 10/11/12+ architecture, not current state. |

Current repo: `governed AI workflow orchestration foundation`.
After routing + advisor + semantic self-correct: `agentic workflow with advisor escalation and semantic self-correct`.
After graph/handoff/subagents: `agent orchestration or multi-agent orchestration`.

### 3.3 Evaluation-driven AI development — measure before you optimize

From Phase 2 onward, every prompt/model/routing/domain change should be measured.

**Ordering rule:** a baseline eval set must exist for a skill *before* you optimize that skill's routing, prompts, or context. No baseline → no optimization claim. This applies to the curriculum itself: Bài 8 (self-correct) runs only if the baseline shows gaps worth fixing.

Do not say "better" unless you can show:

```text
pass rate / partial rate / fail rate
semantic score
judge-human agreement
schema error rate
quality gate fail rate
cost per valid output
cache hit rate
latency
advisor escalation rate
```

…stamped with `datasetVersion / judgeVersion / rubricVersion / modelVersion / promptPackVersion` so numbers are comparable over time.

### 3.4 Enterprise/banking governance is not optional

- No browser API keys; server-side AI calls only.
- Mock/local fallback.
- Local-only must hard-block cloud calls.
- Cloud calls must apply PII masking when required.
- Audit should log safe metadata, not full sensitive content.
- AI output must not auto-apply; human approval is required for process changes.
- Traceability must be preserved.
- **Banking-ready claims require Product Gate 4 evidence (implemented + tested), never design-only (see Gate 4).**

### 3.5 Security-by-design: untrusted content is data, not instructions

Everything that enters the context window from outside — uploaded files, chat pastes, retrieved corpus chunks, MCP tool results — is **untrusted data**.

**Hard rule (v7.1):** no RAG corpus chunk or MCP tool result enters model context without a trust label. The Context Engineering Layer uses this taxonomy:

```text
trusted_instruction
trusted_system_context
trusted_schema
untrusted_user_content
untrusted_retrieved_content
untrusted_tool_result
```

Labels are **necessary but not sufficient** — a model can still follow instructions inside labeled content. The real defense is structural: human approval on side-effects, tool allowlists, output filtering (Bài 17B). Never let labeling create false confidence.

### 3.6 Timebox, budget, and doc-debt control

- Each spine step gets a target timebox (§10). Overruns trigger a scope decision, not silent drift.
- AI experiments run under a monthly API budget cap (§11). Eval runs prefer batch/cached/mock paths.
- Decision documents default to **one-page ADRs** in `docs/decisions/`. Only flagship documents (§13) are maintained as living docs.

### 3.7 Curriculum operating model (new in v7.1)

```text
Chat            = workspace (exploration, drafts, reviews)
docs/curriculum = source of truth (this file lives in the repo)
CCR             = Curriculum Change Request — the only mechanism to
                  change the curriculum: a short note (what changes,
                  why, evidence) applied as a Git commit
Git             = version history of the curriculum itself
```

If an idea from a chat session is worth keeping, it becomes a CCR commit. If it is not worth a CCR, it is not worth following.

---

## 4. Vocabulary Map

| Vocabulary | Practical meaning | How it maps to your project |
|---|---|---|
| AI Engineering | Engineering production-grade AI applications | Whole workbench. |
| LLM Application Engineering | Building systems around model APIs | Provider adapters, route, eval, audit. |
| Workflow Orchestration | Code-controlled multi-step flow | Current `/api/ai/run-skill`. |
| Agentic Systems | Systems where LLMs/tools operate in workflows or agents | Bài 8 onward. |
| Agent Engineering | Designing agents, roles, tools, loops, boundaries | Agent dev pipeline, future advisor/reviewer agents. |
| Multi-agent Systems | Coordinated agents with handoffs or manager/worker logic | Future advanced orchestration. |
| Prompt Engineering | Writing instructions/examples/output format | `prompt-packs.ts`. |
| Context Engineering | Selecting, filtering, compressing, grounding context | Context assembler, domain packs, RAG, masking. |
| Trust Labeling | Tagging every context block by trust level | `trust-labels.ts`, §3.5 taxonomy. |
| Tool Engineering | Designing tool interfaces and tool descriptions | MCP/tool connectors. |
| MCP | Open standard for connecting AI apps to external systems | Future enterprise connectors. |
| RAG | Retrieval-augmented generation | SOP/BIAN/template corpus grounding. |
| Retrieval Metrics | recall@k, precision@k, MRR for the retrieval step | Bài 14 eval. |
| Source-grounded AI | Output backed by evidence/source refs | Artifact review and banking rules. |
| Groundedness | Degree to which claims are supported by sources | unsupportedClaimRate metric. |
| Skill Engineering | Modeling AI capability as versioned contract | `skill-registry-v2`. |
| Skill-as-Contract | Input/output schema + provider + risk + approval + eval | Core design rule. |
| Structured Output | Provider/schema-constrained output | Provider-enforced schema paths. |
| Schema Engineering | Designing schemas/validators/contracts | `skill-schemas`, output schemas. |
| Validation Engineering | Check contract correctness | validators, normalizer, quality preconditions. |
| Evaluation Engineering | Measure output usefulness/quality | `evals/`, semantic criteria. |
| Golden Dataset | Curated, versioned eval cases with growth policy | `evals/datasets/<skill>/vN/`. |
| LLM-as-Judge | Model grading outputs against a rubric, calibrated vs humans | `evals/common/graders.ts`. |
| Quality Gate Engineering | Runtime block/allow decisions | `QualityGateResult`. |
| Outcome Engineering | Measuring real success of AI workflow | score, pass-rate, cost per valid output. |
| Guardrails | Safety/policy checks around model behavior | schema, gates, PII, data mode, injection defense. |
| Prompt Injection | Untrusted content steering the model (direct/indirect) | Bài 17B threat model. |
| Red Teaming | Adversarial testing of AI behavior | `evals/security/` suite. |
| Human-in-the-loop | Human checkpoints before changes apply | Draft/Preview/Apply. |
| Model Routing | Choosing provider/model by skill/risk/cost via catalog | Bài 9. |
| Model Capability Catalog | Catalog of models with capabilities, cost, verifiedDate, deprecation status | Routing reads this; never hard-coded names. |
| Advisor Strategy | Cheap executor first, stronger advisor when needed | Executor/advisor assignment decided by eval. |
| Prompt Caching | Reusing cached context prefixes to cut cost/latency | System + domain pack prefix caching. |
| Semantic Caching | Reusing answers for semantically repeated requests | Repeated briefs/templates. |
| Canary Release | Shipping a new prompt/skill version to a subset first | Release management (Bài 20). |
| Design Engineering | Engineering UI/UX as a governed artifact class | Bài 0D / 21B. |
| Design System as Code | Tokens + component registry as the UI contract | `DESIGN_SYSTEM_CONTRACT.md`. |
| Design Tokens | Colors/typography/spacing/states as versioned code | `src/design/tokens`. |
| Generative UI | AI-generated interfaces constrained by a design contract | UI generation prompt pack. |
| Visual Regression Testing | Screenshot-diff gate for UI changes | Playwright suite (Bài 21B). |
| LLMOps | Observability for LLM apps | token/cost/latency/eval dashboard. |
| AgentOps | Observability for agentic workflows | traces, state, handoffs, retries, failures. |
| Failure Mode & Fallback | Known failure taxonomy + degradation ladder | Incident runbook (Bài 20). |
| Multi-tenancy | Isolated data/feedback/audit per tenant | tenantId propagation (spine), Bài 17C topology. |
| Data Residency | Where data is stored/processed, legally | VN compliance mapping + legal register. |
| Domain Pack | Versioned domain context/rules/examples | Banking Pack. |
| Vertical AI | Domain-specific AI solution | Banking process/delivery workbench. |
| Artifact Engineering | Producing structured business/software artifacts | PTR, BPMN, BRD, SRS, stories, AC, AI Coding Pack. |
| Traceability Engineering | Linking sources to artifacts/elements | Artifact Graph, TraceLink. |
| Knowledge Substrate | The layered set of data/context the product binds to | Bài 3B strategy. |
| Source Register | A catalog classifying every knowledge source | `SOURCE_REGISTER.md`. |
| Canonical Store vs Reference Corpus | Trusted curated source vs cited fuzzy corpus | Bài 3B / 14. |
| Provenance-by-Reference | Deliverable references external region+version, no copy | Bài 19 `SourceRef`. |
| Reverse Traceability | Source region → all deliverables referencing it | impact set on region change. |
| Freshness Lifecycle | fresh → source-changed → stale → resolved | Bài 19 + HITL. |
| Region Registry | User-registered canonical bank regions + version-detection | Bài 19. |
| AI-native UX | UX exposing AI state, uncertainty, gates, advisors | Bài 21. |
| ADR | One-page architecture decision record | `docs/decisions/`. |
| Enforcement Tiering | Choosing hook vs instruction vs subagent vs skill by guarantee needed | Bài 0E dev-agent layer. |
| Hook (dev) | Deterministic gate firing on a dev lifecycle event | secrets block, typecheck-on-edit, no-force-push. |
| Subagent | Bounded dev role with isolated context, returns a summary | dev/debug/reviewer/eval-runner/feedback-triager. |
| Plugin | Versioned bundle of subagents/hooks/skills for sharing/handover | `.claude/` packaged for the team. |
| Feedback Triage | Turning a raw user report into a structured, classified record | feedback-triager subagent. |
| Regression Guard | A past bug turned into a permanent eval case | bug → golden dataset v2 / red-team v3. |
| Remote Control | Phone/browser window into a local Claude Code session | Bài 0 mobile workflow. |
| CCR | Curriculum Change Request — Git-committed curriculum update | `docs/curriculum/`. |

---

## 5. Architecture Target for the Product

### 5.1 Target architecture layers

```text
Input / Source Layer
  - AI Input Brief
  - File Intake
  - Chat / Notes
  - Process Task Register
  - Template Profiles
  - Domain Packs
  - Future SOP / BIAN / policy corpus

Context Engineering Layer
  - context assembler
  - context selector / compressor
  - PII redactor (VN-aware)
  - trust labeling (6-label taxonomy, §3.5) — mandatory for
    retrieved content and tool results
  - data usage policy guard
  - domain pack injector
  - source grounding / retrieval

Skill Runtime Layer
  - skill registry v2
  - input schema / output schema
  - prompt pack (versioned)
  - provider policy
  - risk level
  - approval behavior
  - eval criteria

Model Routing Layer
  - model capability catalog (capabilities, cost, context length,
    caching support, verifiedDate, deprecation status)
  - executor / advisor / fallback assignment read from catalog
  - no hard-coded model name strings in routing logic
  - prompt cache / semantic cache
  - timeout / outage / escalation policy

Output Control Layer
  - parse / JSON repair / normalization
  - schema validation
  - quality gate
  - semantic self-correct
  - injection/output filtering
  - scoring

Human-in-the-loop Layer
  - draft / recommendation / review finding
  - preview / accept / reject / edit
  - apply / export

Artifact Layer
  - PTR, D01 BPMN, D02 Service Blueprint
  - BRD, SRS, User Stories, Acceptance Criteria
  - AI Coding Pack
  - Artifact Graph, TraceLink
  - SourceRef provenance (deliverable → bank region+version) + Region Registry

UI / Design Layer (new in v7.1)
  - design system contract (tokens + component registry)
  - UI state catalog (loading / empty / error / degraded)
  - AI UI generation against the contract
  - visual regression + a11y gates

Observability / Eval / Ops Layer
  - audit log (tenantId on every write — spine insurance)
  - run history, token/cost/latency, cache hit rate
  - validation status, gate status
  - eval reports + trends (version-stamped)
  - security/red-team results
  - release versions (prompt/skill/pack)
  - incident runbook
```

### 5.2 What the repo already has

- Canonical Process Task Register for process artifacts.
- D01/D02 deterministic generation.
- Rule QA and Recommendation Engine.
- AI Skill Registry v2; prompt packs; provider factory.
- OpenAI + Claude + product-ai + mock adapters.
- Structured output for key OpenAI-backed skills.
- Schema validators; provider output normalizer; JSON repair.
- Draft/Preview/Apply human-in-the-loop flow.
- Eval harness foundation; audit metadata foundation.

### 5.3 What is not yet mature

- Context assembler / context budget / context redaction / trust labels.
- Source-grounded RAG.
- Domain Pack runtime.
- Model capability catalog; cost-aware routing and caching.
- Advisor escalation; semantic self-correction.
- PII masking before cloud call.
- Prompt-injection defenses and red-team suite.
- Hard local-only enforcement.
- Design system contract and design gates.
- Observability dashboard and incident runbook.
- Release management for prompts/skills/packs.
- Multi-tenancy / deployment topology decision (tenantId propagation starts now).
- Artifact Graph runtime.
- Route modularization.

---

## 6. Curriculum Structure

Curriculum v7.3 has 6 phases, 28 lessons, and 6 gates (Gate 4 has two levels: Learning and Product).

```text
Phase 0 — Operating System, Design Contract, Dev-Agent Layer & Cleanup Gate
Phase 1 — Foundations & Shared Vocabulary
Phase 2 — Contract-first AI: Skills, Schema, Validation, Eval, Outcomes
Phase 3 — Routing, Agents, Tools, MCP
Phase 4 — Context, RAG, Domain Packs
Phase 5 — Enterprise Banking Productization & Security
Phase 6 — Solution Packaging & Case Study
```

### 6.0 Two-Track Structure (v7.1, extended in v7.2)

The phases organize *knowledge*. Execution follows *tracks*:

**Core Execution Spine — mandatory, ordered, ships the product:**

```text
Gate 0 cleanup
→ Bài 0E  dev-agent layer + starter hooks (governs how all later
          building happens; hooks guard even the cleanup commits)
→ Bài 0D  design system contract (UI is built continuously; contract first)
→ Bài 7   minimum: golden dataset v1 × 3 key skills + baseline run
          + judge calibration
→ Bài 9   minimum: executor/advisor tested both directions + prompt
          caching + cost per attempt
   ∥ Bài 17  PII masking (VN patterns) + hard data-mode enforcement
→ Bài 17B minimum: threat model + red-team suite v0
→ Bài 8   self-correct — ONLY if the baseline reveals quality gaps
          worth the cost/latency
→ Bài 22  mini case study: honest scope, real numbers so far

Spine insurance (do now, cheap):
  - propagate tenantId through every NEW storage/audit write
    (pulled forward from Bài 17C — retrofitting later is expensive)
  - record SourceRef (Bài 19 provenance) the moment RAG exists — bind each
    deliverable to its bank data region+version at generation time
  - Mobile workflow (Bài 0): enable Remote Control once, so spine
    steps can be steered from the phone (capability, not a deliverable)

Activates once users + baseline exist (not blocking the spine):
  - Bài 0E feedback loop: user feedback/bug → triage → fix → release,
    and confirmed bugs → golden dataset v2 / red-team v3
```

**Expansion / Maturity Track — after the spine and mini case study, ordered by ROI:**

```text
E1. Bài 3B substrate strategy → Bài 15 Banking Pack → Bài 14 RAG/source
    grounding (+ SourceRef capture)   (product moat)
E2. Bài 10/11/12/13 orchestration, LangGraph, managed agents, MCP
E3. Bài 16 feedback + Bài 17C full (topology, compliance mapping,
    legal register)
E4. Bài 19/20/21/21B Artifact Graph + provenance lifecycle, Ops,
    AI-native UX, design orchestration
E5. Bài 22 full case study + Gate 5
```

**Interleaved:** Bài 1–6 + Bài 3B (Phase 1 + substrate strategy + structured output/validation) run as reading/ADR work inside spine blocks — most of their repo practice overlaps Gate 0, Bài 0D, and Bài 7/9. Bài 3B's strategy is decided before RAG (E1); its SourceRef capture is spine insurance. They do not get their own calendar blocks.

Rule: nothing on the Expansion Track may block a Spine step. New ideas during the spine become backlog notes or CCRs, not detours.

---

# Phase 0 — Operating System, Design Contract & Cleanup Gate

## Bài 0 — Agentic Setup & Context-managed Development

**Track:** Spine (mostly done) | **Global vocabulary:** Agentic Development Environment, Context-managed Development, AI Coding Workflow

### Principle

Agentic coding only works when the agent has the right project context. Poor context causes wrong assumptions, wrong files, and architectural drift.

### Repo state

P0 cleanup is done. The environment is mostly ready. ESLint is still deferred.

### Practice

- Read `AGENTS.md`, `CURRENT_STATE.md`, `MASTER_GUIDE`, and cleanup status before coding.
- Run typecheck/build before meaningful work.
- Create a branch per lesson or cleanup slice.
- Make the smallest possible change.
- List files before editing.

### Native/tools to compare

Codex; Claude Code; Claude Code Desktop / agents view; VS Code + WSL; Git branches/worktrees.

### Deliverable

```text
docs/SESSION_WORKFLOW.md
docs/DEV_CHECKLIST.md
```

### Done

You can start an AI coding session without letting the agent guess project context.

### Mobile Development Workflow (new in v7.2)

Goal: drive development from anywhere, not only at a desk. There are three execution models; choose by *where the code runs* and *whether the machine must stay on*. (Feature details change fast — re-verify at `code.claude.com/docs/en/remote-control` and the Codex docs before relying on them.)

```text
1. Claude Code Remote Control — phone is a window into a session running
   on YOUR machine. Code/files/MCP stay local; only chat + tool results
   cross an encrypted bridge. Machine must stay awake. Best fit here.
2. Claude Code on the web (cloud sessions) — runs on Anthropic cloud;
   machine can be off, but the session starts fresh (no local setup).
3. Codex Cloud via ChatGPT mobile — fire-and-delegate; runs in OpenAI's
   cloud sandbox on a repo clone; machine off.
```

**Windows/WSL caveat (matches your setup):** Codex mobile *pairing to a local session* currently needs a macOS host (Windows pending), so on Windows the Codex mobile path is **Codex Cloud**, not pairing. **Claude Code Remote Control runs straight from the WSL CLI** — the smoothest mobile path for you.

Remote Control setup (verify versions/plan):

```bash
# in WSL, in the project directory
claude --version          # needs a recent version (v2.1.51+)
claude                    # run once: accept workspace trust + /login via claude.ai
claude --rc               # or /remote-control in a session, or `claude remote-control`
# scan the QR with the Claude app, or open the session URL in a browser
# /config → "Enable Remote Control for all sessions" to make it default
# /mobile shows a QR to install the app
```

**Data-safety rule (ties to Bài 17/17B):** Remote Control keeps code local — safe. Cloud sessions and Codex Cloud clone the repo to a vendor cloud — never run them on a branch containing real bank data. "Untrusted content" and local-only discipline apply to dev tooling, not just the product runtime.

Practical pattern: start a spine task at the desk (Bài 7 eval, Bài 9 routing) with Remote Control on, leave the machine running; from the phone, review diffs, answer the agent's questions, redirect. Delegate to Codex Cloud only for long, independent, data-safe tasks when the machine is off.

### Deliverable (updated)

```text
docs/SESSION_WORKFLOW.md   (includes the mobile workflow + data-safety rule)
docs/DEV_CHECKLIST.md
```

---

## Bài 0B — Agent Dev Pipeline

**Track:** Spine (exists) | **Global vocabulary:** Agent Workflow, Agent Dev Pipeline, Human-supervised Agentic Coding

### Principle

```text
Agent = role + bounded input + bounded output.
Pipeline = sequence of agents + checkpoints.
Human approval remains the final authority.
```

### Repo state

A four-agent dev pipeline is already conceptualized: dev, debug, QA, design. The pipeline stops before commit and does not allow agent autopush/autocommit. The **design agent** is developed in Bài 0D (contract) and Bài 21B (orchestration).

### Practice

- Create or use `curriculum/scripts/dev.sh`.
- Run it on P1.1 or P1.3.
- Let debug agent handle `tsc` failure.
- Let QA agent review diff.
- You approve or reject final diff.

### Deliverable

```text
curriculum/scripts/dev.sh
docs/AGENT_DEV_PIPELINE_NOTES.md
```

### Done

You can explain least privilege, checkpointing, and why the human still approves final changes.

---

## Bài 0C — Self-correcting Pipeline Foundation

**Track:** Spine (design exists) | **Global vocabulary:** Self-correcting Workflow, Evaluator-Optimizer Loop, Repair Loop

### Principle

```text
Self-correct = fail a criterion → feed failure back → retry within limits → escalate.
JSON repair is not semantic self-correction.
```

### Repo state

JSON repair exists. Semantic self-correct does not.

### Practice

Design the future loop:

```text
run executor
→ parse / repair JSON → normalize → validate schema → run quality gate
→ if fail, feed blockingErrors back → retry limited
→ if still fail, escalate advisor
→ if still fail, return reviewable error
```

### Deliverable

```text
docs/SELF_CORRECTING_WORKFLOW_DESIGN.md
```

### Done

You can distinguish code/schema repair, semantic self-correct, advisor escalation, and architecture-level human escalation.

---

## Bài 0D — Design System as Contract & AI UI Generation (new in v7.1)

**Track:** Spine | **Global vocabulary:** Design Engineering, Design System as Code, Design Tokens, Generative UI, Prompt-to-Design, Screenshot-driven Iteration

### Principle

UI is an artifact class. AI cannot generate consistent UI without a design contract, just as a prompt without an output schema produces unvalidatable output.

```text
design tokens + component registry  = the UI schema
visual regression + a11y checks     = the UI quality gates  (Bài 21B)
design review before merge          = the UI HITL
```

The contract — not the agent's taste — defines the look. For a PLG product aimed at PO/BA, this is where the aha-moment is won or lost.

### Repo state

Next.js/TypeScript product with continuously evolving UI (v0.8.x). UI styles are applied per feature without a formal contract. `AGENTS.md` has minimal-change rules but no design rules.

### Practice

Design contract:

- Define design tokens as code (colors, typography, spacing, radii, elevation, state colors): `src/design/tokens.ts` or CSS variables.
- Define the component registry: which components (shadcn/ui-based or custom) are canonical, their variants/props conventions, and the UI state catalog — loading / empty / error / degraded — which Bài 21's AI-native UX states plug into.
- Write design rules into `AGENTS.md`: agents must use tokens + registry components; no inline ad-hoc styles; introducing a new component requires human approval.

AI UI generation workflow:

- Build a UI generation prompt pack: feature spec → component spec (which registry components, which states, which tokens) → implementation.
- Practice screenshot-driven iteration: paste a screenshot, ask the agent to diagnose deviations from the contract, fix.
- Compare tools on one real feature: v0, Figma AI/Make, Claude Code frontend skills, Cursor — judge by compliance with *your* contract, not by demo prettiness.

**Claude Design (design-time tool, v7.2 note):** use Claude Design's canvas to sketch screens and especially the UI state catalog (loading / validating / self-correcting / blocked-by-governance / fallback / ready-for-review) and to explore recommendation-card variants. Its output is *input to the design contract* — distilled into tokens + component specs — never a runtime UI engine inside the product. Generated UI in the product must still pass the design contract + visual-regression + a11y gates (Bài 21B). Per §3.1, use it to lock the contract at this lesson; do not let it pull you into endless UI polish before a baseline exists.

### Deliverables

```text
docs/DESIGN_SYSTEM_CONTRACT.md
src/design/tokens (code)
UI generation prompt pack
AGENTS.md design rules section
```

### Metrics

```text
designComplianceRate (manual sample review)
reworkRate of AI-generated UI
time-from-spec-to-UI
```

### Done

An AI agent can implement a new screen that passes design review on the first or second attempt — because the contract decides, not the agent.

---

## Bài 0E — Dev-Agent Layer & User-Feedback Loop (new in v7.2)

**Track:** Spine (dev-agent foundation now; feedback loop activates once users + baseline exist) | **Global vocabulary:** Agent Dev Pipeline, Enforcement Tiering, Hooks, Subagents, Skills, Plugins, Feedback Triage, Regression Guard, Dev-Process Feedback Loop

### Principle

This is the layer of agents that **build and change the product**, and the loop that feeds **user feedback/bugs back into development and later upgrades**. The key insight: you do not build dev agents from scratch — you compose primitives, and you apply the *same* disciplines you already use on the product (skill-as-contract, HITL, enforced governance, version stamping, CCR) one level up.

Distinguish this from the product-runtime AI: Bài 16 is about the product's AI learning from feedback; *this* lesson is about your dev process turning a user report into a code change and a permanent guard.

**Enforcement tiering — which primitive enforces what:**

```text
CLAUDE.md / rules  = advisory standards (~80% adherence): coding style,
                     architecture notes, naming. Good enough for taste.
hooks              = deterministic gates that CANNOT be skipped: this is
                     where governance lives at the dev layer.
subagents          = role + clean isolated context; report a summary back.
skills             = reusable procedures (the former "custom commands"):
                     /triage, /release-notes, /new-skill scaffold.
plugins            = versioned bundle of the above, for sharing/handover.
```

**Golden rule (dev-layer twin of §3.4):** anything that must be true 100% of the time is a **hook, not an instruction**. "Never commit secrets", "run typecheck after edit", "never force-push master" are hooks. Style preferences are CLAUDE.md.

### Repo state

A four-agent pipeline (dev, debug, QA, design) is conceptualized in Bài 0B but the design agent is only developed via Bài 0D/21B, and no hooks/feedback loop exist. The human-approves-final-diff rule exists as intent but is not enforced.

### Practice — Part A: the dev-agent layer

Define each subagent as a short contract (~30 lines): role + input + output + allowed tools + boundaries. Starter roster:

```text
dev              — implement a scoped change on a branch.
debug            — diagnose a failing build/test; propose a fix.
reviewer (QA)    — review the diff against rules + contracts; flag risks.
eval-runner      — run the Bài 7 regression eval; report pass/fail vs baseline.
feedback-triager — turn a raw user report into a structured record; propose
                   disposition (does NOT act).
```

Starter hooks (the enforcement layer — set up before Gate 0 so they guard the cleanup commits):

```text
pre-commit  : block committing secrets (.env/.key/.pem/creds*).
post-edit   : run typecheck/lint; block on failure.
pre-push    : block force-push to master; require human-approved diff.
```

Human stays the approver: no agent autocommit/autopush. Enforce it with the pre-push hook, not just a CLAUDE.md line.

Concrete `.claude/` structure (verify exact file syntax in the Claude Code docs):

```text
.claude/
  CLAUDE.md          # advisory standards (keep short)
  rules/             # path-scoped behaviors (tests.md, types.md, ...)
  agents/            # subagents above, each ~30 lines
  skills/            # /triage, /release-notes, /new-skill
  hooks/ + settings.json   # the deterministic gates above
  .mcp.json          # connectors (e.g., issue tracker) with trust boundaries
```

### Practice — Part B: the two feedback loops

**Fast loop (days): user report → fix → release**

```text
1. Capture  — feedback/bug becomes a STRUCTURED record (not free text):
              id / type(bug|feedback|feature) / severity / repro
              / affected skill|artifact / status. Git-tracked (issues or a log).
2. Triage   — feedback-triager subagent: dedupe, classify, link to the
              affected skill/artifact, PROPOSE disposition → human approves (HITL).
3. Fix      — dev/debug subagent on a branch.
4. Verify   — reviewer + eval-runner run regression; human approves the diff.
5. Release  — version bump + eval + changelog + rollback path (Bài 20).
```

**Feedback→evidence rule (the high-value link):** a confirmed bug becomes a **golden dataset case** (Bài 7 v2 = +failed production cases); a security report becomes a **red-team case** (Bài 7/17B v3). The report is not fixed once and forgotten — it becomes a permanent regression guard.

**Slow loop (weeks): pattern → CCR → upgrade**

If several reports reveal a structural gap, it does not become a patch — it becomes a **CCR** (§3.7) and the curriculum/architecture changes. This is the "later upgrade" path.

### Deliverables

```text
docs/DEV_AGENT_LAYER.md          (roster as contracts + enforcement tiering)
.claude/ (agents, hooks, skills, settings)
docs/FEEDBACK_RECORD_SCHEMA.md   (the structured intake record + loop)
```

### Metrics

```text
hookBlockEvents (secrets/force-push prevented)
triageTurnaround
bugsConvertedToEvalCases   (Bài 7 v2/v3 growth)
escapedRegressions         (target → 0 for guarded cases)
```

### Guardrails

- Least privilege: each subagent gets only the tools it needs.
- Do not run dev agents on a cloud session over a branch with real bank data (Bài 0 mobile rule, Bài 17/17B).
- Anti-over-engineering (§3.1): start with 2–3 subagents + the three starter hooks. Add more only when a repeated pain justifies it. Keep CLAUDE.md and each subagent short.
- When handing over (§13b), package `.claude/` as a versioned **plugin** so the team inherits the same gates and roles.

### Done

Building and changing the product runs through bounded subagents with deterministic hooks and human-approved diffs; and a user report reliably becomes either a guarded eval case (fast loop) or a CCR (slow loop) — feedback provably improves the product over time.

---

## Gate 0 — Architecture Cleanliness Gate

Before building the next big AI capability, clean the foundation.

### Required cleanup

```text
P1.1 — Unify skill IDs
P1.3 — Retire skill-engine
P1.4 — Pin dependencies
P1.5 — Decide SDK vs raw fetch
Lint — configure or intentionally defer
```

### Why this gate exists

This is not cosmetic cleanup. It is a lesson in single source of truth, contract integrity, reproducible engineering, build-vs-buy decisions, and maintainability.

### Evidence to pass

```text
[ ] No legacy skill aliases remain (grep proof in PR).
[ ] `skill-registry-v2` is the only skill source of truth.
[ ] No `latest` dependencies remain (lockfile committed).
[ ] SDK decision recorded as ADR in docs/decisions/.
[ ] Typecheck/build are green in CI or local log.
[ ] Lint decision recorded as ADR.
[ ] Bài 0E starter hooks active (secrets block, typecheck-on-edit,
    no-force-push) so they guard the cleanup commits themselves.
```

---

# Phase 1 — Foundations & Shared Vocabulary

*(Track: interleaved — reading/ADR work inside spine blocks; repo practice overlaps Gate 0, Bài 0D, 7, 9.)*

## Bài 1 — LLMs, Reasoning Models & Provider Differences

**Global vocabulary:** Model & Provider Engineering, Model Capability Catalog

### Principle

There is no universal best model. Providers differ by structured output, reasoning, tool use, context length, cost, latency, caching support, privacy posture, and enterprise controls.

**Catalog principle (v7.1):** the curriculum never teaches "model X is always the advisor". It teaches:

```text
model capability catalog
model verification date
model deprecation policy
```

Routing logic reads the catalog; it never hard-codes model name strings. (The cleanup audit already showed how brittle model-string comparisons are.)

### Repo state

The repo has OpenAI, Claude, product-ai, and mock providers through a provider factory.

### Practice

- Read the provider factory; compare OpenAI and Claude adapters.
- Create the provider/model capability matrix — include caching support, structured-output enforcement, `verifiedDate`, and deprecation status per entry.

### Native/tools

OpenAI Responses API; Claude Messages API / thinking; provider model catalogs and prompt caching docs; managed provider settings.

### Deliverable

```text
docs/MODEL_PROVIDER_COMPARISON.md  (with verifiedDate per entry)
```

### Done

You can explain which provider fits the executor path and which fits the advisor path **as a testable hypothesis**, and your routing design has no hard-coded model names.

---

## Bài 2 — Prompt Engineering & Tool Prompting

**Global vocabulary:** Prompt Engineering, Tool Prompt Engineering, Agent-Computer Interface

### Principle

Prompt engineering is not the entire AI system. It is one layer inside context engineering. Tool descriptions are also prompts: a poorly described tool becomes an unreliable agent-computer interface.

### Repo practice

- Review `prompt-packs.ts`.
- Separate provider-neutral constraints from skill-specific procedures.
- Make prompts reinforce schema and human approval, not replace validation.
- Prepare tool-description principles for MCP/tool integration.
- Add explicit instruction/data separation markers for user-supplied content (foundation for §3.5 / Bài 17B).

### Deliverable

```text
docs/PROMPT_PACK_DESIGN_GUIDE.md
```

### Done

You can explain the difference between instruction, context, schema contract, and tool interface.

---

## Bài 3 — Context Engineering Fundamentals

**Global vocabulary:** Context Engineering, Trust Labeling

### Principle

Context engineering is the design of what information the model receives, in what structure, at what time, under what token budget, with what privacy rules, and with what **trust labels**.

It includes: prompt instructions, user payload, structured source data, retrieved knowledge, domain packs, tool results, memory/feedback, redacted/safe context, quality gate feedback — every block tagged with one of the six §3.5 trust labels.

### Repo gap

The repo currently has prompt packs and payloads, but not a full context engineering layer.

### Practice

Design:

```text
src/lib/ai/context/
  context-assembler.ts
  context-budget.ts
  context-redactor.ts
  context-summary.ts
  domain-pack-loader.ts
  source-grounding.ts
  trust-labels.ts        ← implements the 6-label taxonomy (§3.5)
```

### Deliverable

```text
docs/CONTEXT_ENGINEERING_ARCHITECTURE.md
```

### Done

You can distinguish prompt, payload, context, memory, retrieval, domain pack, redaction — and every context block in your design carries a trust label.

---

## Bài 3B — Knowledge Substrate Strategy (new in v7.3)

**Track:** Interleaved (strategy); provenance *capture* is spine insurance | **Global vocabulary:** Knowledge Substrate, Source Register, Canonical Store vs Reference Corpus, Provenance-by-Reference, Region Registry, Data Catalog

### Principle

The bank's (and your own) knowledge — process docs, templates, source code, notes, glossaries — is fragmented across formats and locations. Fragmentation is fundamentally "many formats, no shared schema, no trust tiering." The fix is **disciplined layering**, not one giant store. The organizing principle (from the scope analysis): the product owns *mechanisms*; people/organizations own *judgment and data*; the ecosystem owns *infrastructure*. The full scope split is recorded in `docs/decisions/ADR-knowledge-substrate-scope.md`.

The strategic resolution: the product does **not unify the bank's data** — it **binds to and tracks** it (provenance-by-reference, detailed in Bài 19). This keeps the product light, compliant, and defensible, and turns the Artifact Graph (Bài 19) into the answer to the fragmentation problem.

### Repo state

AI works primarily from brief/PTR. No source register, no canonical-vs-corpus separation, no provenance references to external sources.

### Practice — the six steps

```text
0. Separate scopes FIRST: personal corpus (you control; ingest freely
   with masking) vs bank corpus (often cannot ingest — NĐ 13, TT 09,
   residency, ownership). Separate stores, separate masking/access.
   Conflating them is a compliance landmine.
1. Inventory & classify, don't ingest yet → SOURCE_REGISTER (below).
2. Normalize to canonical schema + adapters (extends the PTR philosophy;
   this is schema engineering applied to data — Bài 3/4).
3. Separate source-of-truth from reference:
   - canonical store (PTR, glossary, templates): small, curated, governed,
     TRUSTED.
   - reference corpus (RAG, Bài 14): large, fuzzy SOP/docs, chunked,
     trust-labeled, CITED — grounding, not truth.
   - source code: code-aware index / Git reference, NOT the doc store.
4. Package the stable core as a Domain Pack (Bài 15) — the moat.
5. Ingest incrementally, eval-driven: only the sources needed for the
   3 key-skill golden datasets first (Bài 7); expand only where retrieval
   eval shows a gap (Bài 14). No boiling the ocean.
6. Govern throughout (Bài 17/17C): mask before ingest; tenantId on every
   record; keep bank data in the bank's environment — connect via MCP
   (Bài 13), don't copy out.
```

`SOURCE_REGISTER.md` (a data catalog, one row per source — analog of the legal register):

```text
source | type(process|doc|code|template|note) | owner(you|bank)
| format | sensitivity(public|internal|PII) | residency
| volume | changeFrequency | value(how often needed) | ingest decision
| canonical|corpus|reference-only | status
```

### The product / not-product boundary (summary; full detail in the ADR)

```text
INSIDE product (build):  canonical schema + common adapters; retrieval/
  grounding/citation/trust-labeling; Domain Pack mechanism; governance
  runtime (masking, tenant isolation, local-only); MCP connector capability;
  retrieval eval; the binding/provenance layer (Bài 19); Region Registry.
CONNECT/BUY (ecosystem): document stores (SharePoint/Confluence/Drive/Git);
  vector DB + embeddings; code repos & code intelligence; foundation models.
ORG/PEOPLE (cannot productize): the inventory & classification judgment;
  Domain Pack *content*; data residency & what may leave the bank;
  on-prem/VPC decision; credentials; tacit knowledge (captured over time
  via HITL feedback, Bài 0E/18).
```

PLG tiering: at Tier 1 the product solves fragmentation for *one person's own inputs* (narrow, BYO); the heavy org scope appears only at Tier 3 (Bài 17C).

### Deliverables

```text
docs/KNOWLEDGE_SUBSTRATE_STRATEGY.md
docs/SOURCE_REGISTER.md            (the catalog template, filled at onboarding)
docs/decisions/ADR-knowledge-substrate-scope.md   (A/B/C × 8 engines × tiers)
```

### Done

You can say, for any knowledge source, whether the product ingests it (canonical), grounds on it (corpus), references it (provenance), or leaves it to the bank/ecosystem — and why.

---

## Bài 4 — Skill Engineering / Skill-as-Contract

**Global vocabulary:** Skill Engineering, Skill-as-Contract, Contract-first AI

### Principle

A skill is not a prompt. A skill is:

```text
input schema + output schema + provider policy + context policy
+ risk policy + approval behavior + eval criteria + version
```

### Repo state

`skill-registry-v2`, `skill-schemas`, `prompt-packs`, and output schemas exist, but skill-ID cleanup and legacy `skill-engine` retirement remain pending.

### Practice

- Complete P1.1 skill-ID cleanup.
- Complete P1.3 retire `skill-engine`.
- Extend registry-v2 with routing/governance/eval metadata where needed.

### Deliverable

```text
docs/AI_SKILL_CONTRACT_MATRIX.md
```

### Done

You can define a new AI skill without spreading logic across route, prompt, schema, eval, and UI in inconsistent ways.

---

# Phase 2 — Contract-first AI: Schema, Validation, Eval, Outcomes

## Bài 5 — Structured Output & Schema Engineering

**Track:** interleaved | **Global vocabulary:** Structured Output Engineering, Schema Engineering, Contract-first AI Outputs

### Principle

Do not merely ask the model to return JSON. Use provider-enforced structured output when available, and always validate output before display/apply/export.

### Repo state

OpenAI structured output exists for key skills. Other provider paths rely on prompt JSON + parser + validator.

### Practice

- Build a schema matrix by skill and provider.
- Smoke test structured output for key skills.
- Document provider-specific enforcement (including the Claude path, not only OpenAI json_schema).

### Deliverable

```text
docs/STRUCTURED_OUTPUT_SCHEMA_MATRIX.md
```

### Done

You can explain strict structured output, schema validation, and provider-specific enforcement differences.

---

## Bài 6 — Validation Engineering

**Track:** interleaved | **Global vocabulary:** Validation Engineering, Runtime Contract Validation

### Principle

Validation answers: *Is the output contract-valid?* It does not answer: *Is the output semantically good?*

### Repo state

Validators and normalizer exist. Normalizer still needs cleanup after skill-ID consolidation.

### Practice

- Remove legacy aliases in normalizer after P1.1.
- Add per-skill validation context where needed.
- Keep validation reusable outside the route.

### Deliverable

```text
docs/VALIDATION_ARCHITECTURE.md
```

### Done

You can block contract-invalid output before preview, apply, save, or export.

---

## Bài 7 — Evaluation Harness Engineering

**Track:** Spine (minimum) → Expansion (full) | **Global vocabulary:** Evaluation Engineering, Eval Harness, Golden Dataset, LLM-as-Judge, Regression Evals

### Principle

Evaluation answers: *Is the output useful, complete, traceable, safe, and business-meaningful?* Schema-valid output can still be a bad output.

Three methodology pillars:

```text
1. Golden datasets — curated, versioned, representative cases per skill.
2. Calibrated judges — an LLM judge is only trustworthy after you measure
   its agreement with your own human labels on a sample.
3. Regression evals — evals run automatically when prompts/skills change,
   not only when you remember.
```

**Golden datasets are living, not static (v7.1).** Growth & drift policy:

```text
v1 = curated cases (10–30 per skill: typical, edge, known-bad)
v2 = v1 + failed production cases
v3 = v2 + red-team / adversarial edge cases (links Bài 17B)
```

Every eval report MUST stamp:

```text
datasetVersion / judgeVersion / rubricVersion
modelVersion / promptPackVersion / skillVersion
```

Unstamped numbers are not comparable and therefore not evidence.

### Repo state

The repo has eval harnesses for multiple skills, but needs golden datasets, stronger semantic criteria, judge calibration, and model/provider comparison.

### Practice

**Spine minimum:**

- Curate golden dataset v1 for 3 key skills (≥10 cases each) from real anonymized BIDV-style process work.
- Store versioned: `evals/datasets/<skill>/v1/`.
- Write rubric prompts per skill (completeness, domain-term correctness, traceability, safety).
- Hand-label a calibration sample (≥20 outputs); measure judge-human agreement before trusting judge scores.
- Run and record one full baseline eval per key skill.

**Expansion (full):**

- Extend `evals/common/` (graders, metrics, report-writer, provider-runner).
- Grow datasets per the v1→v2→v3 policy.
- Add an eval run to CI, triggered on prompt-pack or skill-contract changes (small dataset, batch/cached).

### Metrics

```text
passRate / partialRate / failRate
semanticScore
judgeHumanAgreement
schemaErrorRate / qualityGateFailRate
avgInputTokens / avgOutputTokens / avgCostUsd / p95LatencyMs
+ full version stamp (above)
```

### Deliverable

```text
docs/EVAL_HARNESS_ENGINEERING_GUIDE.md
eval-results/<skill>/summary.md   (baseline numbers, version-stamped)
```

### Done

You have a stamped baseline per key skill, you know how much to trust your judge, and any future "better" claim can be tested in one command.

---

## Bài 8 — Quality Gates, Scoring & Outcome Engineering

**Track:** Spine — conditional (only if baseline shows quality gaps worth the cost) | **Global vocabulary:** Quality Gate Engineering, Outcome Engineering

### Principle

Quality gates are runtime controls. Eval harnesses are batch/offline measurement. Quality gates block output that is not ready for preview/apply/export.

**v7.1 entry condition:** run this lesson's build work only if the Bài 7 baseline reveals semantic-quality gaps that self-correction can plausibly fix. If first-pass quality is already high, record that finding and move on — that *is* the eval-driven outcome.

### Repo state

Quality gates exist for Draft PTR and other artifacts, but scoring and semantic self-correct are not mature.

### Practice

- Add score 0–100.
- Add semantic gate rules.
- Feed blocking errors into self-correct retry.
- Use advisor escalation if retry fails.
- Measure all of it against the Bài 7 baseline.

### Deliverable

```text
docs/QUALITY_GATE_AND_OUTCOME_DESIGN.md
```

### Metrics

```text
firstPassRate / retrySuccessRate / advisorEscalationRate
finalValidOutputRate / costPerValidOutput
```

### Done

You can prove self-correction improves quality and quantify the cost/latency trade-off — or prove it isn't needed yet.

---

## Gate 1 — Contract-first Runtime Gate

### Evidence to pass

```text
[ ] skill-ID source of truth is clean.
[ ] skill-engine is retired.
[ ] structured output matrix exists.
[ ] validation vs evaluation is documented.
[ ] Golden dataset v1 exists for at least 3 key skills (≥10 cases each)
    with the growth policy written down.
[ ] At least one full baseline eval run is recorded with version-stamped
    numbers (pass rate, semantic score, cost, latency) per key skill.
[ ] Judge-human agreement measured on a calibration sample.
[ ] Quality gates have scoring or a concrete scoring design.
```

---

# Phase 3 — Routing, Agents, Tools, MCP

## Bài 9 — Model Routing, Caching & Cost-aware Advisor Strategy

**Track:** Spine (minimum) → Expansion (full) | **Global vocabulary:** Model Routing, Capability Catalog, Cost-aware Routing, Advisor Strategy, Prompt Caching, Fallback Policy

### Principle

Provider/model selection is a runtime governance and economics decision. Do not call multiple models blindly. Use escalation rules — and remember that caching is usually a larger cost lever than model choice.

**Executor/advisor assignment is a hypothesis, not a decision.** Test both directions on the Bài 7 baseline and let the numbers assign the roles per skill.

**Catalog rule (v7.1):** routing logic reads the model capability catalog — capabilities, cost, context length, caching support, `verifiedDate`, deprecation status. It never hard-codes model name strings. Catalog entries are re-verified against official provider docs at the start of this lesson, before the final case study, and on any deprecation notice.

### Repo state

Provider factory exists. Current `AI_PROVIDER` selects a single provider. Capability catalog, advisor strategy, caching, and fallback policy are not implemented.

### Target strategy

```text
Executor runs first (assignment per skill decided by eval).
If confidence is low, quality gate fails, skill is high-risk,
or output needs deeper review:
  escalate to advisor.
Compare/select final output.
Record cost, latency, validation, gate, and cache results per attempt.
```

### Practice

**Spine minimum:**

- Build the model capability catalog (with verifiedDate + deprecation fields).
- Run executor/advisor in both directions on 2–3 key skills against the baseline; record the comparison.
- Structure prompts so the stable prefix (system + domain pack + schema) is cacheable; volatile payload last. Enable provider prompt caching; measure hit rate.
- Add cost-per-attempt and escalation-reason metadata to the audit log.

**Expansion (full):**

- Skill × provider decision matrix; escalation policy per risk level.
- Semantic/response cache for repeated briefs and template runs.
- Batch APIs for eval runs.
- Timeout, retry, and provider-outage fallback ladder (executor → fallback provider → mock with clear UX state).
- Make thinking/capability config catalog-driven.

### Deliverables

```text
docs/PROVIDER_ROUTING_COST_OPTIMIZATION_PLAN.md
docs/PROVIDER_ROUTING_COST_REPORT.md
```

### Metrics

```text
cost executor-only vs executor+advisor (both direction hypotheses)
quality improvement vs Bài 7 baseline
latency increase / escalation rate
cacheHitRate / costSavedByCachePct
fallbackActivations
cost per valid output
```

### Done

You have a cost story for CIO/CTO: when cheaper execution is enough, when advisor escalation is worth the extra cost, how much caching saves — and your routing survives a model deprecation without a code change.

---

## Bài 10 — Workflow vs Agent vs Multi-agent Orchestration

**Track:** Expansion (E2) | **Global vocabulary:** Agentic Systems, Workflow Orchestration, Agent Orchestration, Multi-agent Systems

### Principle

Use precise architecture language:

```text
Workflow = predefined code path.
Agentic workflow = workflow with model/advisor decisions under guardrails.
Agent = model with tools, feedback, loop, and stopping conditions.
Multi-agent = multiple agents with explicit roles/handoffs/subagents.
```

### Practice

- Draw the current route as workflow orchestration.
- Mark deterministic nodes; mark future agentic nodes.
- Decide what should remain deterministic and what can become agentic.

### Deliverable

```text
docs/decisions/ADR-workflow-vs-agent.md
```

### Done

You stop using "agent" as a vague label and can explain why the current repo is mostly deterministic workflow orchestration.

---

## Bài 11 — LangGraph & Graph-based Orchestration

**Track:** Expansion (E2) | **Global vocabulary:** Graph-based Agent Orchestration, Durable Execution, Stateful Agents

### Principle

Graph orchestration is useful for workflows with state, retry, human interrupts, streaming, persistence, subgraphs, and long-running tasks. Do not adopt LangGraph just because it is popular.

### Practice

Prototype outside the production path:

```text
Input → executor → validate → gate → self-correct → advisor → HITL
```

Compare this graph prototype with the custom route on: code clarity, debuggability, persistence, HITL interrupts, observability, lock-in.

### Tools

LangGraph; LangChain agents; LangSmith tracing/evaluation.

### Deliverable

```text
docs/decisions/ADR-langgraph.md
```

### Done

You can decide when the custom route is enough and when a graph runtime is justified.

---

## Bài 12 — OpenAI Agents SDK, Claude Agent SDK & Managed Agents

**Track:** Expansion (E2) | **Global vocabulary:** Managed Agent Runtime, Agent SDKs, Handoffs, Guardrails, Sessions

### Principle

Managed agent runtimes are useful when you want the framework to handle tool loops, guardrails, handoffs, sessions, traces, and multi-step agent execution. But frameworks can obscure prompts/responses and add abstraction.

### Practice

- Compare custom route vs OpenAI Agents SDK.
- Compare custom dev pipeline vs Claude Code / Claude Agent SDK.
- Decide build/buy/hybrid.

### Deliverable

```text
docs/decisions/ADR-managed-agent-runtime.md
```

### Done

You can explain what should remain custom in your product and what can be delegated to managed agent runtimes.

---

## Bài 13 — Tool Engineering & MCP

**Track:** Expansion (E2) | **Global vocabulary:** Tool Use, Function Calling, MCP, Tool Interface Design, Tool-use Security

### Principle

Tools are how agents act. Tool schemas and descriptions are part of the model interface. MCP standardizes how AI applications connect to data sources, tools, and workflows.

**Security rules (v7.1):** every MCP connector is also an attack surface — tool results are untrusted content, and tool descriptions can be poisoned.

```text
Hard rule: no MCP tool result enters model context without the
untrusted_tool_result trust label (§3.5).
```

### Practice

Design future MCP-ready connectors:

```text
SOP repository MCP / Template library MCP / Audit log MCP
Banking glossary MCP / Document corpus MCP / Jira/export MCP
```

For each connector specify: read/write scope, side-effect actions requiring human approval, and how its results are trust-labeled in context.

### Deliverable

```text
docs/MCP_AND_TOOL_INTEGRATION_ARCHITECTURE.md
```

### Done

You can design a tool/MCP integration without violating privacy, governance, security, or source-of-truth boundaries.

---

## Gate 2 — Agentic Runtime Gate

### Evidence to pass

```text
[ ] Model capability catalog exists with verifiedDate per entry;
    routing logic contains no hard-coded model name strings.
[ ] Routing decision is backed by an eval comparison vs the Bài 7
    baseline (executor-only vs executor+advisor, both directions).
[ ] Cost per attempt and cache hit rate are tracked.
[ ] Fallback/timeout/outage policy is defined.
[ ] Workflow vs agent ADR exists.
[ ] LangGraph ADR exists.
[ ] Managed agent runtime ADR exists.
[ ] MCP connector architecture exists with trust boundaries
    and trust-label rules.
```

---

# Phase 4 — Context, RAG, Domain Packs

## Bài 14 — RAG & Source-grounded AI

**Track:** Expansion (E1 — product moat) | **Global vocabulary:** Retrieval-Augmented Generation, Source-grounded Generation, Retrieval Evaluation, Hybrid Search, Reranking

### Principle

RAG is not "paste documents into prompt." RAG means retrieving relevant sources, grounding output, citing/trace-linking evidence, and checking unsupported claims.

RAG quality is two separate problems — retrieval quality and generation groundedness — each with its own metrics. A perfect generator on top of bad retrieval is still a bad system.

```text
Hard rule (v7.1): no RAG corpus chunk enters model context without
the untrusted_retrieved_content trust label (§3.5).
```

### Repo gap

AI currently works primarily from brief/PTR. It is not yet grounded in SOP/BIAN/template corpus.

### Practice

Corpus & retrieval:

- Build a small banking/process corpus (SOP excerpts, BIAN definitions, templates) — masked per Bài 17 rules before indexing.
- Decide chunking strategy (structure-aware for SOP sections vs fixed-size).
- Compare vector-only vs hybrid (BM25 + vector) retrieval; add reranking if needed.
- **Vietnamese-language considerations:** test multilingual embedding models on Vietnamese banking text; check diacritics handling, abbreviation matching (XHTD, TSĐB, HMTD), and mixed VN-EN queries. Build a small Vietnamese retrieval test set.

Generation & grounding:

- Generate output with source refs; trace recommendations back to source.
- Check unsupported claims against retrieved chunks.

### Deliverable

```text
docs/RAG_SOURCE_GROUNDING_DESIGN.md
evals/datasets/retrieval-vn/v1/
```

### Metrics

```text
Retrieval: recall@k, precision@k, MRR (on the VN test set)
Generation: sourceCoverage, citationAccuracy, unsupportedClaimRate
```

### Done

AI recommendations can cite evidence instead of relying only on model priors, and you can show retrieval quality numbers on Vietnamese banking text.

---

## Bài 15 — Domain Pack Engineering

**Track:** Expansion (E1 — product moat, runs before Bài 14) | **Global vocabulary:** Domain-specific AI, Domain Pack, Vertical AI, Knowledge Pack

### Principle

Domain Pack is a moat. It turns a generic AI workflow into a vertical AI solution.

A Domain Pack includes:

```text
glossary / rules / few-shot examples / templates / quality criteria
source corpus / redaction policy / feedback examples / versioning
```

### Practice

Banking Pack v1:

```text
XHTD / TSĐB / HMTD / PAKD / EWS / Score
lending workflow
approval / risk / control terminology
Vietnamese-English glossary
rule pack / few-shot pack / quality criteria
```

### Deliverables

```text
src/lib/domain-packs/banking/
docs/BANKING_PACK_V1.md
docs/BANKING_PACK_EVAL_REPORT.md
```

### Metrics

```text
quality score before/after (vs Bài 7 baseline, version-stamped)
missing domain term reduction
recommendation acceptance rate
trace coverage
```

### Done

You can show the Banking Pack improves output quality using before/after metrics.

---

## Bài 16 — Memory, Feedback & Organization-private Learning

**Track:** Expansion (E3) | **Global vocabulary:** Feedback Learning, Memory, Organization-private Learning

### Principle

Feedback is learning data, but enterprise learning must be opt-in, isolated, exportable, and deletable.

### Practice

Design:

```text
feedback-store schema (tenantId on every record — spine insurance
already in place)
accepted/rejected/skipped recommendations
prompt examples from approved feedback
export/delete/opt-in
tenant isolation
```

### Deliverable

```text
docs/FEEDBACK_AND_PRIVATE_LEARNING_DESIGN.md
```

### Done

You can distinguish local feedback, organization-private learning, and model training.

---

## Gate 3 — Context & Domain Gate

### Evidence to pass

```text
[ ] Context assembler design exists with trust labels.
[ ] SOURCE_REGISTER exists (sources classified; personal vs bank separated)
    and the scope ADR is recorded.
[ ] RAG/source-grounded demo exists; retrieval metrics recorded
    on a Vietnamese test set.
[ ] SourceRef captured at generation time (deliverable → region+version).
[ ] Banking Pack v1 exists.
[ ] Banking Pack eval report shows a version-stamped before/after
    delta vs baseline.
[ ] Feedback/private learning design exists.
```

---

# Phase 5 — Enterprise Banking Productization & Security

## Bài 17 — Security, Privacy & AI Governance

**Track:** Spine (parallel with Bài 9) | **Global vocabulary:** AI Governance, Privacy Engineering, Policy Enforcement, Guardrails

### Principle

Governance must be server-enforced, not just shown in UI.

```text
local-only must block cloud calls.
PII must be masked before cloud calls.
Audit must record safe metadata.
```

### Repo gap

Data mode exists, but PII masking and hard enforcement are still pending.

### Practice

Implement:

```text
src/lib/ai/security/pii-masking.ts
src/lib/ai/security/cloud-call-guard.ts
src/lib/ai/security/data-usage-policy.ts
```

Cloud call path:

```text
payload → data usage guard → PII masking → provider.run → safe audit
```

**Vietnamese PII pattern catalog** — generic regexes miss VN banking data; build and test patterns for:

```text
CCCD (12 digits) / CMND (9 digits) / passport
Mã số thuế (10/13 digits)
Số điện thoại (+84 / 0xx formats)
Số tài khoản ngân hàng, số thẻ
CIF number, số hợp đồng tín dụng, mã khoản vay, mã TSĐB
Họ tên tiếng Việt (diacritics-aware NER, not regex-only)
Địa chỉ, ngày sinh, email
```

Masking strategy: replace with stable placeholder tokens (`[PERSON_1]`, `[CCCD_1]`) and keep a server-side reversible map so output can be re-identified after the cloud round-trip. Build a test suite with realistic VN samples.

### Deliverable

```text
docs/AI_GOVERNANCE_AND_PII_MASKING_REPORT.md
evals/security/pii-vn-test-suite/
```

### Metrics

```text
piiDetected / piiMasked (per VN pattern class)
externalApiCalled=false in local-only
redactionCoverage
policyDecision
```

### Done

You can present a credible privacy story to a CISO or banking risk/compliance stakeholder, with VN-specific test evidence.

---

## Bài 17B — Adversarial AI Security & Red Teaming

**Track:** Spine (minimum) → Expansion (full) | **Global vocabulary:** Prompt Injection, Indirect Prompt Injection, Jailbreak, Tool Poisoning, Data Exfiltration, Red Teaming, OWASP LLM Top 10

### Principle

Bài 17 protects data going **out**. This lesson protects the system from malicious data coming **in**.

Every untrusted input — uploaded files, pasted notes, RAG corpus chunks, MCP tool results — can contain embedded instructions. A banking product that ingests SOP documents and connects to enterprise tools must demonstrably resist:

```text
Direct injection: user prompt tries to override system rules.
Indirect injection: instructions hidden inside documents/corpus/tool results.
Tool poisoning: malicious tool descriptions or results steering behavior.
Exfiltration: tricking the model into leaking masked PII, audit data,
or system prompts through outputs or tool calls.
```

**Defense-in-depth caveat:** trust labels (§3.5) are the foundation, but they are **necessary, not sufficient** — a model can still follow instructions inside labeled content. No single layer is the defense; the layers together are.

### Repo gap

No injection defenses exist. Planned RAG (Bài 14) and MCP connectors (Bài 13) significantly expand the attack surface.

### Practice

**Spine minimum:**

- Threat model: entry points (file intake, chat, corpus, tool results), assets (PTR data, credentials, audit log, masked-PII map), trust boundaries. Map to the OWASP Top 10 for LLM applications.
- Implement instruction/data separation using the §3.5 trust-label taxonomy; system rules state that embedded instructions in untrusted content are data.
- Build red-team suite v0: `evals/security/red-team-suite/` — injection strings embedded in uploaded docs and corpus chunks (VN + EN), exfiltration attempts targeting masked PII. Run it; record results.

**Expansion (full):**

- Structural controls: tool allowlists per skill; output filtering for secrets/placeholder leakage (side-effect human approval already exists — keep it).
- Detection heuristics for known injection patterns (supplementary signal, not primary defense).
- Tool-poisoning cases added to the suite; suite cases feed golden dataset v3 (Bài 7 growth policy).

### Deliverables

```text
docs/AI_SECURITY_THREAT_MODEL.md
evals/security/red-team-suite/
docs/RED_TEAM_REPORT.md
```

### Metrics

```text
attackSuccessRate (target: trending to 0 for covered cases)
injectionBlockRate
exfiltrationAttemptsCaught
redTeamCasesCovered
```

### Done

You can explain to a CISO how the system resists indirect prompt injection via documents, corpus, and tools — with a runnable test suite as evidence, not just a diagram.

---

## Bài 17C — Deployment Topology, Multi-tenancy & VN Compliance Mapping

**Track:** Expansion (E3) — except tenantId propagation, which is spine insurance done now | **Global vocabulary:** Multi-tenancy, Tenant Isolation, Deployment Topology, Data Residency, BYO-key, Sovereign/On-prem AI

### Principle

The PLG path (individual → team → enterprise) is also an architecture path. Each tier changes where data lives, who can see it, and which regulations apply. Deciding this late forces painful rewrites of storage, feedback, and audit layers — which is exactly why tenantId propagation was pulled into the spine.

### Practice

Deployment tiers:

```text
Tier 1 — Individual SaaS:
  BYO API key, local-first storage where possible, no cross-user data.
Tier 2 — Team workspace:
  shared workspace storage, role-based access, workspace-isolated feedback.
Tier 3 — Enterprise / bank:
  VPC or on-prem deployment, enterprise provider endpoints or local models,
  bank-controlled keys, full audit export.
```

Multi-tenancy design:

- Per-tenant isolation for: artifacts, feedback store (Bài 16), audit log, domain pack customizations, caches.
- Verify tenantId is present on all writes (spine insurance audit).

VN compliance mapping — **with verification protocol (v7.1):**

```text
Rule: all legal/compliance mapping must be verified from official
sources and reviewed by a compliance/legal owner before being used
in any sales material. AI is never the final source of law.
```

Tracked in `docs/compliance/LEGAL_SOURCE_REGISTER.md`, one row per regulation:

```text
regulation | official source URL | last verified date | owner
| product control mapping | status
```

Study targets to seed the register (verify current versions):

```text
Nghị định 13/2023/NĐ-CP — bảo vệ dữ liệu cá nhân
Luật Bảo vệ dữ liệu cá nhân 2025 (hiệu lực 2026 — verify)
Thông tư 09/2020/TT-NHNN — an toàn hệ thống thông tin trong hoạt động ngân hàng
Nghị định 53/2022/NĐ-CP — data localization theo Luật An ninh mạng
Thông tư 50/2024/TT-NHNN — an toàn bảo mật dịch vụ ngân hàng trực tuyến (verify)
```

### Deliverables

```text
docs/decisions/ADR-deployment-topology.md
docs/VN_BANKING_COMPLIANCE_MAPPING.md
docs/compliance/LEGAL_SOURCE_REGISTER.md
```

### Done

For each deployment tier you can answer: where does data live, who can see it, which keys are used — and every regulatory claim has an official source, a verified date, and a human owner.

---

## Bài 18 — Human-in-the-loop & Decision UX

**Track:** Expansion (E4) | **Global vocabulary:** HITL AI Design, Approval Workflow, Reviewable AI

### Principle

Enterprise AI should show rationale, risk, evidence, affected artifacts, and alternatives before the user approves changes.

### Practice

Upgrade recommendation cards with:

```text
recommended action / business rationale / evidence/source
affected stepIds / affected artifacts / risk level / confidence
alternative options / before/after preview / audit note
```

### Deliverable

```text
docs/HUMAN_IN_THE_LOOP_UX_GUIDE.md
```

### Done

The user can make a controlled decision rather than blindly click Apply.

---

## Bài 19 — Artifact Engineering, Traceability & Provenance (expanded in v7.3)

**Track:** Expansion (E4) — but provenance *capture* is spine insurance (do as soon as RAG exists) | **Global vocabulary:** Artifact Engineering, Artifact Graph, Traceability Engineering, Provenance-by-Reference, Source Reference, Freshness Lifecycle, Reverse Traceability, Region Registry, AI-assisted Impact Analysis

### Principle

The moat is not artifact generation alone. It is traceability, quality gates, stale detection, and governed transformation between artifacts — **plus provenance to external, versioned bank sources**. This is how the Knowledge Substrate Strategy (Bài 3B) is realized: the product does not own the bank's data; it **binds to and tracks** which data region / document / version each deliverable was derived from, so the user can keep canonical regions updated and know which deliverables to refresh when a region changes.

### Practice — internal Artifact Graph v0

```ts
type Artifact = {
  id: string;
  type: string;
  version: string;
  status: "draft" | "reviewed" | "approved" | "stale";
  generatedBySkillId?: string;
  sourceArtifactIds: string[];
};

type TraceLink = {   // internal artifact → internal artifact
  sourceArtifactId: string;
  sourceElementId: string;
  targetArtifactId: string;
  targetElementId: string;
  relationType: "derivedFrom" | "refines" | "implements" | "tests" | "explains";
  confidence?: "low" | "medium" | "high";
};
```

### Practice — provenance-by-reference to external sources (v7.3)

```ts
type SourceRef = {       // deliverable → EXTERNAL versioned bank source
  artifactId: string;
  sourceSystem: string;        // connector id, e.g. "bidv-sop", "git:core-lending"
  sourceLocator: string;       // doc id + section anchor, or repo path
  sourceVersion?: string;      // version id / commit / effective date
  sourceFingerprint?: string;  // content hash at bind time (fallback if no version)
  boundAt: string;             // when generated against this version
  relationType: "derivedFrom" | "citesPolicy" | "implementsRule" | "basedOnTemplate";
  freshness: "fresh" | "source-changed" | "stale" | "accepted-despite-change";
  trustLabel: string;          // untrusted_retrieved_content, ...
};
```

Key compliance point: a SourceRef is **metadata about** bank data (locator + version + hash), **not a copy** of the content. The provenance store itself inherits masking + tenant isolation — locators/fingerprints/snippets can leak, so "just metadata" is not a free pass.

**Two directions:**
- Forward: deliverable → its sources ("where did this BRD come from?").
- Reverse: source region → all deliverables referencing it ("I'm updating SOP §4 — what's affected?"). The reverse query is what enables keeping canonical regions updated.

**Freshness lifecycle:**

```text
D bound {R @ v3} → bank changes R to v4
→ detect change → mark D = source-changed
→ [AI-assisted impact analysis] → material? → stale (needs review) | cleared (cosmetic)
→ [HITL] → regenerate | partial update | accept-with-note
```

Change detection by source maturity: webhook/event (best) → scheduled poll via connector (middle; ties to Bài 20 + scheduled tasks) → fingerprint compare on access (fallback). For sources lacking versioning, add a lightweight **Region Registry**: the user/admin registers which bank locations are "canonical regions" and how their version is read.

**Staying AI-native:**
- Bind = grounding: when AI grounds on a retrieved chunk (Bài 14), the pipeline auto-records the SourceRef. Grounding *is* linking — no manual linking.
- AI-assisted impact analysis: on a version change, AI diffs the source and reasons whether/how the deliverable is affected (material vs cosmetic). This is what prevents alert fatigue — without it, every edit flags everything.
- Freshness UX (Bài 21): inline provenance + fresh/changed/stale indicator + "review impact" action.

**Spine insurance:** record SourceRef *at generation time* as soon as RAG exists (with Bài 14, E1), even though the full freshness lifecycle + impact analysis lands in E4. Retrofitting provenance onto already-generated deliverables is painful — same lesson as tenantId.

### Deliverable

```text
docs/ARTIFACT_GRAPH_V0_DESIGN.md   (includes SourceRef, freshness lifecycle,
                                    reverse traceability, Region Registry)
```

### Done

You can trace from process step to BRD/SRS/story/AC/AI Coding Pack, AND from any deliverable to the exact bank data region+version it used — and when a region changes, the product surfaces the impacted deliverables for human-approved refresh, without ever copying the bank's data.

---

## Bài 20 — LLMOps, AgentOps, Observability & Release Management

**Track:** Expansion (E4) | **Global vocabulary:** LLMOps, AgentOps, AI Observability, Tracing, Incident Response, Release Management

### Principle

You cannot operate an AI product you cannot observe — and you cannot operate what you cannot recover or roll back.

### Practice

Observability dashboard:

```text
cost by skill/provider/model/day
p95 latency / cache hit rate
schema failure rate / gate failure rate
advisor escalation rate / self-correct success rate
eval trend (version-stamped)
PII masking count
attack-success-rate trend (Bài 17B suite)
```

Failure modes & incident runbook:

```text
Taxonomy: provider outage, schema-failure spike, cost spike,
quality regression, cache poisoning, injection incident, design drift.
For each: detection signal → fallback ladder → user-facing state →
recovery step → postmortem note.
```

Release management for prompts/skills/packs:

```text
Semantic versioning for prompt packs, skill contracts, domain packs.
Every version change runs the regression eval (Bài 7 CI hook).
Canary: route a subset of runs to the new version first.
A/B: compare versions on the same eval set before full rollout.
Rollback: one-step revert to the previous pinned version.
```

### Deliverables

```text
docs/LLMOPS_AGENTOPS_DASHBOARD_DESIGN.md
docs/AI_INCIDENT_RUNBOOK.md
docs/RELEASE_MANAGEMENT_PLAYBOOK.md
```

### Done

You can discuss cost, quality, latency, and risk with engineering and business stakeholders — and you can ship, detect, and roll back a bad prompt version safely.

---

## Bài 21 — AI-native UX

**Track:** Expansion (E4) | **Global vocabulary:** AI-native UX, Agentic UX, Trustworthy AI UX

### Principle

AI state should be visible. The user should see what AI is doing, why it is blocked, why it escalates, and why human review is required. These states are implemented through the design system contract from Bài 0D (the UI state catalog).

### Practice

Design UX states (including degraded modes from Bài 20):

```text
Generating draft...
Validating schema...
Checking quality gate...
Self-correcting attempt 1/2...
Asking advisor...
Blocked by governance policy...
Provider unavailable — running in fallback mode...
Ready for human review...
```

Consider streaming/partial output where it improves perceived latency without bypassing validation.

### Deliverable

```text
docs/AI_NATIVE_UX_SPEC.md
```

### Done

Users understand AI behavior, uncertainty, degradation, and review requirements.

---

## Bài 21B — Agentic Design Orchestration: Design ↔ FE ↔ BE (new in v7.1)

**Track:** Expansion (E4) | **Global vocabulary:** AI Design Ops, Multi-agent Dev Pipeline, Visual Regression Testing, Accessibility Gates, API Contract

### Principle

Once a design contract exists (Bài 0D), design work can be orchestrated like any governed AI workflow: bounded agents, contracts at the handoffs, quality gates, human approval.

```text
design ↔ FE handshake = component spec (registry components, states, tokens)
FE ↔ BE handshake     = typed API contract (zod / OpenAPI)
quality gates          = visual regression + a11y + contract compliance
HITL                   = human design review before merge
```

This is design governance with the same vocabulary as AI output governance — which is exactly how you explain it to stakeholders.

### Repo state

The 4-agent pipeline (Bài 0B) conceptualizes a design agent but never developed it. Bài 0D supplies the contract. No visual regression or a11y gates exist.

### Practice

Pipeline extension:

- Design agent: feature spec → component spec (which registry components, which UI states, which tokens).
- FE agent: implement strictly against the component spec and design contract.
- BE agent: maintain the typed API contract (zod/OpenAPI) the FE consumes.
- QA agent: run the gates below; human reviews the diff + screenshots.

Automated design gates:

- Playwright screenshot diff (visual regression) with a maintained baseline.
- axe-core accessibility checks.
- A compliance check script (or lint rule) for token/registry usage.
- Treat design drift as a detectable failure mode (added to Bài 20 taxonomy).

### Deliverables

```text
curriculum/scripts/dev.sh (extended) or pipeline notes
evals/ui/visual-regression/ (baseline + suite)
docs/DESIGN_ORCHESTRATION_NOTES.md
```

### Metrics

```text
designComplianceRate (automated)
a11yViolations
visualRegressionFailures
specToUiLeadTime
```

### Done

A UI change flows design → FE → BE → QA with automated gates and human review — and you can explain design governance to a CTO using the same contract/gate/HITL vocabulary as the AI runtime.

---

## Gate 4 — Enterprise Product Gate (two levels, v7.1)

**Design-only counts as learning done. It never counts as banking-ready.**

### Learning Gate 4 — lesson completion

```text
[ ] PII masking fully designed + VN test cases written.
[ ] Threat model exists; red-team suite designed with cases written.
[ ] Deployment topology ADR drafted; compliance mapping drafted;
    LEGAL_SOURCE_REGISTER seeded.
[ ] HITL UX guide exists.
[ ] Artifact/TraceLink v0 design exists.
[ ] Observability dashboard design + incident runbook +
    release playbook drafted.
[ ] AI-native UX spec exists.
[ ] Design orchestration notes + gate designs exist.
```

### Product Gate 4 — required before any "banking-ready" claim

```text
[ ] PII masking implemented; VN test suite passing.
[ ] local-only hard-block of cloud calls verified by test.
[ ] No sensitive payload/prompt/output content in logs (verified).
[ ] Red-team suite v0 passing for covered cases; results recorded.
[ ] tenantId present on all storage/audit writes (verified).
[ ] Every regulatory claim in sales material backed by a
    LEGAL_SOURCE_REGISTER entry verified by its owner.
```

---

# Phase 6 — Solution Packaging & Case Study

## Bài 22 — Solution Packaging & Case Study

**Track:** Spine (mini) → Expansion (full, E5) | **Global vocabulary:** AI Solution Packaging, Case Study Engineering, Product Narrative, PLG Storytelling

### Principle

A solution is not just code. A solution is:

```text
problem + architecture + demo + metrics + governance story
+ business value + stakeholder narrative
```

**Two narratives, one product:**

```text
PLG narrative (individual PO/BA):
  "From messy process notes to a complete artifact set in minutes."
  Metric: time-to-first-artifact; aha-moment demo ≤ 10 minutes;
  onboarding template; what the free/individual tier includes.

Enterprise narrative (CIO/CTO/CISO):
  governance, security evidence (red-team report), cost economics
  (routing + caching), compliance mapping (verified register),
  deployment options.
```

### Spine minimum — mini case study

After the spine (Gate 0 → 0D → 7 → 9 ∥ 17 → 17B → [8]):

- One honest page: what works today, baseline numbers, routing/cost numbers, PII + red-team evidence so far.
- A recorded 5-minute demo of the current real flow.
- Explicit "not yet" list (no agent-washing).

This mini case study is the checkpoint that decides Expansion priorities.

### Expansion (full) — target case study

```text
Problem:
BA/SA/PO spend too much time turning business process knowledge into
delivery artifacts.

Solution:
AI orchestration workbench with PTR, QA, D01 BPMN, D02 Service Blueprint,
BRD, SRS, stories, acceptance criteria, AI Coding Pack, export, and audit.

Architecture:
skill-as-contract, structured output, context engineering with trust
labels, calibrated eval harness, advisor routing + caching via capability
catalog, adversarial security, design system contract, HITL, governance,
multi-tenant-ready topology.

Metrics:
cost executor-only vs advisor; cache savings;
quality before/after Banking Pack; self-correct success rate;
PII masking + red-team evidence; latency/pass-rate;
time-to-first-artifact (PLG); design compliance.

Demo:
notes/file/chat → PTR → QA → BPMN/D02 → BRD/SRS/story/AC
→ AI Coding Pack → export/audit
```

### Deliverables

```text
Spine: docs/MINI_CASE_STUDY.md + 5-min recording
Full:
docs/CASE_STUDY_BANKING_AI_ORCHESTRATOR.md
docs/DEMO_SCRIPT.md
docs/SOLUTION_ARCHITECTURE_OVERVIEW.md
docs/CIO_CISO_BRIEF.md
docs/PLG_ONE_PAGER.md
README update / LinkedIn post draft / recorded demo (10–15 minutes)
```

### Done

You can present the solution in 10–15 minutes to AI engineers, CTO, CIO, CISO, BA/SA/Product teams, banking stakeholders — and in 2 minutes to an individual PO/BA deciding whether to try it.

---

## Gate 5 — Solution Gate

### Evidence to pass

```text
[ ] Case study cites real measured, version-stamped numbers
    (no placeholders).
[ ] Demo recording exists and follows the demo script.
[ ] CIO/CISO brief includes security evidence (red-team report ref)
    and only register-verified regulatory claims.
[ ] PLG one-pager exists with time-to-first-artifact measured.
[ ] README reflects the current true state (no agent-washing).
```

---

## 7. Tracking Table

Track legend: **S** = Spine · **S-min** = Spine minimum (full version in Expansion) · **S?** = Spine conditional · **I** = Interleaved · **E1–E5** = Expansion priority order

| Phase | Bài | Short name | Track | Core vocabulary | Required output |
|---|---:|---|---|---|---|
| 0 | 0 | Setup + Mobile workflow | S (done) | context-managed dev, remote control | dev checklist + mobile/data-safety |
| 0 | 0B | Agent Dev Pipeline | S (exists) | agent workflow | dev.sh / notes |
| 0 | 0C | Self-correct foundation | S (design) | repair loop | self-correct design |
| 0 | 0D | Design Contract & AI UI | S | design system as code | DESIGN_SYSTEM_CONTRACT + tokens |
| 0 | 0E | Dev-Agent Layer & Feedback | S (loop activates w/ users) | enforcement tiering, feedback triage | DEV_AGENT_LAYER + .claude/ + feedback schema |
| 1 | 1 | LLM & Providers | I | capability catalog | provider comparison (verifiedDate) |
| 1 | 2 | Prompt & Tools | I | prompt/tool engineering | prompt guide |
| 1 | 3 | Context Engineering | I | trust labeling | context architecture |
| 1 | 3B | Knowledge Substrate Strategy | I (capture=S) | canonical vs corpus, provenance-by-ref | SUBSTRATE_STRATEGY + SOURCE_REGISTER + scope ADR |
| 1 | 4 | Skill-as-Contract | I | skill engineering | skill matrix |
| 2 | 5 | Structured Output | I | schema engineering | schema matrix |
| 2 | 6 | Validation | I | validation engineering | validation design |
| 2 | 7 | Eval Harness | S-min | golden dataset, LLM-as-judge | stamped baseline report |
| 2 | 8 | Quality/Outcomes | S? | outcome engineering | scoring/self-correct |
| 3 | 9 | Routing/Caching/Cost | S-min | model routing, caching | routing+cost report |
| 3 | 10 | Workflow vs Agent | E2 | agentic systems | orchestration ADR |
| 3 | 11 | LangGraph | E2 | graph orchestration | LangGraph ADR |
| 3 | 12 | Managed Agents | E2 | agent runtime | SDK ADR |
| 3 | 13 | MCP/Tools | E2 | tool engineering | MCP design |
| 4 | 14 | RAG | E1 | source grounding, retrieval eval | RAG demo + VN retrieval metrics |
| 4 | 15 | Domain Packs | E1 | vertical AI | Banking Pack |
| 4 | 16 | Feedback/Memory | E3 | private learning | feedback design |
| 5 | 17 | Governance/Privacy | S | AI governance | VN PII suite + report |
| 5 | 17B | Adversarial Security | S-min | prompt injection, red teaming | threat model + red-team report |
| 5 | 17C | Deployment/Tenancy | E3 (tenantId = S) | multi-tenancy, data residency | topology ADR + compliance map + legal register |
| 5 | 18 | HITL UX | E4 | reviewable AI | approval UX |
| 5 | 19 | Artifact Graph + Provenance | E4 (capture=S) | traceability, provenance-by-ref | Artifact v0 + SourceRef |
| 5 | 20 | Observability/Ops | E4 | LLMOps, release mgmt | dashboard + runbook + playbook |
| 5 | 21 | AI-native UX | E4 | agentic UX | UX spec/demo |
| 5 | 21B | Design Orchestration | E4 | AI design ops, visual regression | design pipeline + UI gates |
| 6 | 22 | Case Study | S (mini) / E5 (full) | solution packaging | mini case study → final demo/story + PLG one-pager |

---

## 8. Lesson Rubric

Each lesson is scored on four axes, 0–5.

| Axis | 0 | 3 | 5 |
|---|---|---|---|
| Principle | Not understood | Can explain basics | Can explain trade-offs and when to use/not use |
| Practice | Not done | Followed steps | Can build/debug/evaluate independently |
| Vocabulary | Vague labels | Uses 3–5 correct terms | Can speak with global AI engineering vocabulary |
| Packaging | No artifact | Has note/report | Has demo + metrics + stakeholder story |

A lesson is complete only when:

```text
Principle ≥ 4 / Practice ≥ 4 / Vocabulary ≥ 4 / Packaging ≥ 3
```

Final lesson requires `Packaging = 5`.

Weekly ritual: a 30-minute retro — what was measured, what was decided (ADR/CCR), update `CURRICULUM_STATUS.md`, plan the next smallest slice.

---

## 9. Immediate Roadmap from Current State

Do not restart from Bài 1. Execution follows the two tracks (§6.0):

**Core Execution Spine:**

```text
Gate 0 cleanup
→ Bài 0E dev-agent layer + starter hooks (guard the cleanup too)
→ Bài 0D design contract
→ Bài 7 minimum (golden dataset v1 × 3 skills + stamped baseline
   + judge calibration)
→ Bài 9 minimum (executor/advisor both directions + caching
   + cost per attempt)
   ∥ Bài 17 PII masking VN + hard data-mode enforcement
→ Bài 17B minimum (threat model + red-team suite v0)
→ Bài 8 self-correct — only if baseline shows gaps worth fixing
→ Bài 22 mini case study (honest scope, real numbers)

Spine insurance from day one:
  - tenantId propagated through every new storage/audit write
  - Mobile: Remote Control enabled once (steer spine tasks from phone)

Activates once users + baseline exist (not blocking the spine):
  - Bài 0E feedback loop; confirmed bugs → golden dataset v2 / red-team v3
```

**Expansion / Maturity Track (after mini case study, by ROI):**

```text
E1. Bài 15 Banking Pack → Bài 14 RAG (moat)
E2. Bài 10/11/12/13 orchestration / LangGraph / managed agents / MCP
E3. Bài 16 + Bài 17C full (feedback, topology, compliance + legal register)
E4. Bài 19/20/21/21B Artifact Graph, Ops, AI-native UX, design orchestration
E5. Bài 22 full + Gate 5
```

Concrete next steps:

```text
1. Move this file to docs/curriculum/ and commit (operating model §3.7).
2. Create CURRICULUM_STATUS.md from the §10 template.
3. Bài 0E: set up .claude/ (subagents + starter hooks) and enable
   Remote Control (Bài 0 mobile) before the cleanup commits.
4. Merge master cleanup into feature/m2-m3-full-ai or branch cleanly.
5. P1.1 skill-ID cleanup. 6. P1.3 retire skill-engine.
7. P1.4 pin dependencies. 8. P1.5 SDK decision (ADR). 9. Lint decision (ADR).
10. Bài 0D: design tokens + component registry + AGENTS.md design rules.
11. Bài 7 minimum: datasets + stamped baseline + judge calibration.
12. Bài 9 minimum ∥ Bài 17 in parallel.
```

---

## 10. Cadence: CURRICULUM_STATUS.md (rolling plan)

A static 6-month table is a concept, not a schedule. The operating tool is a **rolling 2-week plan** updated in the weekly retro.

Template — `CURRICULUM_STATUS.md` (lives next to this file, updated weekly):

```markdown
# CURRICULUM STATUS
Updated: <date>
Current spine step: <e.g., Bài 7 minimum>
Budget this month: $<spent> / $<cap>

## This week (≤3 items)
- [ ] <lesson slice> → evidence: <eval report / ADR / PR link>

## Next week (provisional)
- <slice>

## Done log
| Week | Item | Evidence |
|---|---|---|

## Blocked / decisions needed
- <item> → <CCR or ADR needed?>
```

Seed schedule (adjust in the first retro; ~6–10 focused hours/week):

```text
W1: Bài 0E (.claude/ subagents + starter hooks) + Mobile (Remote Control)
    + Gate 0 cleanup  (hooks guard the cleanup commits)
W2: Bài 0D design contract
W3: Bài 7 minimum (datasets + baseline + judge calibration)
W4: Bài 9 minimum (routing/caching/cost)
W5: Bài 17 PII + Bài 17B minimum (threat model + red-team v0)
W6: Bài 8 if baseline demands it — otherwise buffer/overflow
W7: Bài 22 mini case study → decide Expansion priorities
(Feedback loop of Bài 0E activates whenever first users arrive,
 independent of this schedule.)
```

Timebox rule: an overrun triggers a scope decision in the retro (cut scope, split, or consciously extend) — never silent drift. Two consecutive zero-progress weeks trigger a timebox/scope renegotiation, not self-blame.

---

## 11. Risk & Budget Guardrails

```text
API budget: set a monthly experiment budget cap (write the number in
  CURRICULUM_STATUS.md). Track spend per lesson. Eval runs prefer batch
  APIs, cached prefixes, and the mock provider for dev loops.
Scope creep: any new idea during a lesson becomes a backlog note or CCR,
  not a detour. One lesson = one branch = one merge.
Doc debt: decisions → one-page ADRs in docs/decisions/. Only flagship
  docs (§13) are maintained as living documents.
Model drift: capability catalog entries carry verifiedDate; re-verify at
  Bài 9 start, before the case study, and on deprecation notices.
  Routing logic never hard-codes model names.
Legal: all legal/compliance mapping must be verified from official
  sources and reviewed by a compliance/legal owner before use in sales
  material — tracked in docs/compliance/LEGAL_SOURCE_REGISTER.md.
  AI is never the final source of law.
Design drift: agents must not introduce UI styles outside the design
  system contract; violations are gate failures, not style choices.
Burnout: weekly 30-minute retro is mandatory.
```

---

## 12. Tool and Native Comparison Matrix

| Topic | Current/custom path | Tool/native to learn | Likely decision |
|---|---|---|---|
| Skill runtime | registry-v2 + route | OpenAI Skills / Claude Skills | Keep custom contract for product control. |
| Structured output | JSON schema + validators | Provider-enforced schemas | Use provider-enforced when available. |
| Workflow orchestration | `route.ts` | LangGraph | Prototype and compare before migration. |
| Managed agent runtime | Custom advisor/self-correct | OpenAI Agents SDK, Claude Agent SDK | Use when handoffs/sessions/tool loop justify it. |
| Dev agents | dev.sh + Codex/Claude | Claude Code, Codex, subagents | Hybrid. |
| Tool integration | future custom tools | MCP | Design MCP-ready connectors with trust boundaries. |
| Eval harness | local `evals/` | OpenAI Evals, LangSmith | Keep local; compare hosted for scale. |
| Caching | none | provider prompt caching, custom semantic cache | Provider caching first; custom semantic cache if ROI shown. |
| UI generation | ad hoc | v0, Figma AI, Claude Code frontend skills, Cursor, Claude Design | Any tool, constrained by your design contract. |
| UI quality gates | none | Playwright visual diff, axe-core, Storybook/Chromatic | Playwright + axe locally first. |
| Dev-agent layer | manual prompting | Claude Code subagents/hooks/skills/plugins, Codex CLI | Compose primitives; hooks for enforcement, subagents for roles. |
| Mobile dev | desk-only | Claude Code Remote Control, cloud sessions, Codex Cloud | Remote Control from WSL CLI; Codex Cloud for machine-off delegation. |
| Security testing | none | OWASP LLM Top 10 checklists, custom red-team suite | Custom suite required for banking story. |
| Observability | audit/run history | LangSmith/OpenAI tracing | Hybrid. |
| Governance | custom data mode | enterprise controls/sandbox/MCP tunnel | Custom banking controls required. |
| Domain knowledge | Banking Pack | RAG/source grounding | Custom moat. |

---

## 13. Required Final Artifact Set

**Doc-debt rule:** items marked (ADR) are one-page decision records in `docs/decisions/`. Items marked ★ are flagship living documents — kept current. Everything else is a one-shot report frozen after its lesson.

```text
 0. docs/curriculum/CURRICULUM_V7_3.md ★  (this file — source of truth)
 0b. CURRICULUM_STATUS.md ★               (rolling plan)
 0c. docs/curriculum/CCR_TEMPLATE.md      (change request template)
 1. SESSION_WORKFLOW.md + DEV_CHECKLIST.md  (incl. mobile workflow, v7.2)
 2. DEV_AGENT_LAYER.md + FEEDBACK_RECORD_SCHEMA.md ★ (Bài 0E, v7.2)
 3. MODEL_PROVIDER_COMPARISON.md          (with verifiedDate)
 4. PROMPT_PACK_DESIGN_GUIDE.md ★
 5. CONTEXT_ENGINEERING_ARCHITECTURE.md ★
 5a. KNOWLEDGE_SUBSTRATE_STRATEGY.md ★    (Bài 3B, new in v7.3)
 5b. SOURCE_REGISTER.md ★                 (data catalog, new in v7.3)
 5c. ADR-knowledge-substrate-scope (ADR)  (new in v7.3)
 6. AI_SKILL_CONTRACT_MATRIX.md ★
 7. STRUCTURED_OUTPUT_SCHEMA_MATRIX.md
 8. VALIDATION_ARCHITECTURE.md
 9. EVAL_HARNESS_ENGINEERING_GUIDE.md ★
10. QUALITY_GATE_AND_OUTCOME_DESIGN.md
11. DESIGN_SYSTEM_CONTRACT.md ★           (v7.1)
12. DESIGN_ORCHESTRATION_NOTES.md         (v7.1)
13. PROVIDER_ROUTING_COST_OPTIMIZATION_PLAN.md
14. PROVIDER_ROUTING_COST_REPORT.md
15. ADR-workflow-vs-agent (ADR)
16. ADR-langgraph (ADR)
17. ADR-managed-agent-runtime (ADR)
18. MCP_AND_TOOL_INTEGRATION_ARCHITECTURE.md
19. RAG_SOURCE_GROUNDING_DESIGN.md
20. BANKING_PACK_V1.md ★
21. BANKING_PACK_EVAL_REPORT.md
22. FEEDBACK_AND_PRIVATE_LEARNING_DESIGN.md   (product-runtime feedback; cf. #2 dev-process)
23. AI_GOVERNANCE_AND_PII_MASKING_REPORT.md ★
24. AI_SECURITY_THREAT_MODEL.md ★
25. RED_TEAM_REPORT.md
26. ADR-deployment-topology (ADR)
27. VN_BANKING_COMPLIANCE_MAPPING.md ★
28. docs/compliance/LEGAL_SOURCE_REGISTER.md ★  (v7.1)
29. HUMAN_IN_THE_LOOP_UX_GUIDE.md
30. ARTIFACT_GRAPH_V0_DESIGN.md          (incl. SourceRef/provenance, v7.3)
31. LLMOPS_AGENTOPS_DASHBOARD_DESIGN.md
32. AI_INCIDENT_RUNBOOK.md ★
33. RELEASE_MANAGEMENT_PLAYBOOK.md
34. AI_NATIVE_UX_SPEC.md
35. MINI_CASE_STUDY.md                    (v7.1 — spine checkpoint)
36. CASE_STUDY_BANKING_AI_ORCHESTRATOR.md ★
37. DEMO_SCRIPT.md ★
38. SOLUTION_ARCHITECTURE_OVERVIEW.md ★
39. CIO_CISO_BRIEF.md ★
40. PLG_ONE_PAGER.md ★
41. HANDOVER.md ★                         (new in v7.2 — see §13b)
```

These artifacts bridge learning and product packaging.

---

## 13b. Handover Readiness (new in v7.2)

"Making someone the owner" means another person/team can run, change, extend, and ship the product **without you** — not merely run the app. If you follow v7.2, the handover package forms as a by-product of the lessons; you do not stop to write separate handover docs. `HANDOVER.md` is a one-page index that points into four layers.

```text
Layer 1 — Runnable code & config
  repo + pinned lockfile (P1.4), .env.example, env setup (WSL/Node),
  seed/mock data to run without real keys, green CI.
  Acceptance: a newcomer can clone → install → build → run (mock) in one sitting.

Layer 2 — Decision map (the most valuable, easiest to lose)
  SOLUTION_ARCHITECTURE_OVERVIEW + all ADRs in docs/decisions/
  (why custom route not LangGraph, why defer Artifact Graph, why ownerId
  schema), the contracts (AI_SKILL_CONTRACT_MATRIX,
  CONTEXT_ENGINEERING_ARCHITECTURE, DESIGN_SYSTEM_CONTRACT), and this
  curriculum (onboarding + roadmap in one).

Layer 3 — Operational & security evidence
  eval harness + version-stamped golden datasets; RED_TEAM_REPORT +
  threat model + PII suite; AI_INCIDENT_RUNBOOK + RELEASE playbook;
  LEGAL_SOURCE_REGISTER with owners; the .claude/ plugin (Bài 0E) so the
  team inherits the same hooks/roles.

Layer 4 — Product & people context
  CASE_STUDY + DEMO_SCRIPT + PLG_ONE_PAGER + CIO_CISO_BRIEF;
  CURRICULUM_STATUS (where we are / what's next);
  Vietnamese banking glossary (XHTD/TSĐB/HMTD…) — tacit domain knowledge;
  credentials/keys ownership list (handed over OUT of the repo, securely).
```

**Handover test (the real bar):** give the package to a newcomer and ask them to ship one small slice — add a skill or change a prompt, then run the eval vs baseline — **without asking you anything**. Passing means Layers 2 and 3 are real. Failing points at exactly which layer is thin.

`HANDOVER.md` is a flagship living document: keep its links current as artifacts evolve.

---

## 14. Things the Curriculum Forbids

```text
Do not add a new AI feature without a skill contract.
Do not add a prompt without an output schema or validator.
Do not call an external provider without data-mode guard.
Do not claim banking-ready without passing Product Gate 4 —
  design-only never counts.
Do not call it multi-agent unless there are real agents/handoffs/subagents.
Do not claim cost optimization unless cost is tracked per attempt.
Do not call validation an eval.
Do not optimize a skill (routing/prompt/context) before it has a
  baseline eval set.
Do not publish eval numbers without dataset/judge/rubric/model/prompt
  version stamps.
Do not ship a new prompt/skill/pack version without an eval comparison
  against the previous version.
Do not hard-code model names in routing logic; read the capability catalog.
Do not let any RAG chunk or MCP tool result enter context without
  a trust label.
Do not index real customer data into any corpus without masking
  and approval.
Do not treat retrieved or tool-returned content as instructions.
Do not let agents introduce UI styles outside the design system contract.
Do not put any legal/compliance claim in sales material without a
  verified LEGAL_SOURCE_REGISTER entry.
Do not adopt LangGraph or managed agent SDKs only because they are
  fashionable.
Do not refactor route massively before source-of-truth cleanup.
Do not let agents commit/push/apply without human approval
  (enforce with a pre-push hook, not just a CLAUDE.md line).
Do not put a must-be-true-always rule in CLAUDE.md when it belongs
  in a deterministic hook (secrets, force-push, post-edit checks).
Do not close a confirmed bug without converting it into a golden
  dataset case (v2) or red-team case (v3).
Do not run a cloud/delegate dev session on a branch with real bank data.
Do not copy bank data into the product when a SourceRef (region+version)
  suffices; bind and track, don't own.
Do not generate a deliverable from a bank source without recording its
  SourceRef (region + version + boundAt) at generation time.
Do not treat a source-region change as material without AI-assisted
  impact analysis (avoid stale-flag alert fatigue).
Do not conflate the personal corpus and the bank corpus in one store.
Do not exceed the monthly API experiment budget without an explicit
  decision.
Do not change this curriculum outside a CCR commit.
```

---

## 15. Official Tool Reference Notes

These references should be checked when implementing tool comparisons. The curriculum intentionally uses official/vendor docs for current tool capabilities.

### LangGraph / LangSmith

Low-level orchestration framework/runtime for long-running, stateful agents: durable execution, streaming, human-in-the-loop, persistence, observability via LangSmith.

```text
https://docs.langchain.com/oss/javascript/langgraph/overview
```

### OpenAI Agents SDK

Primitives: agents, agents-as-tools/handoffs, guardrails, function tools, MCP integration, sessions, human-in-the-loop, tracing.

```text
https://openai.github.io/openai-agents-python/
```

### Anthropic effective agents & tools

Distinguishes workflows from agents; emphasizes starting simple and adding complexity only when measurable benefits justify latency/cost. Tool-writing guidance applies to Bài 2/13.

```text
https://www.anthropic.com/engineering/building-effective-agents
https://www.anthropic.com/engineering/writing-tools-for-agents
```

### MCP

Open standard for connecting AI applications to external systems. Review its security best-practices guidance before implementing connectors (Bài 13/17B).

```text
https://modelcontextprotocol.io/introduction
```

### OpenAI Evals

Official evaluation workflow for testing model outputs against datasets and criteria. Study alongside the local `evals/` harness.

```text
https://platform.openai.com/docs/guides/evals
```

### OWASP Top 10 for LLM Applications

Reference taxonomy for LLM security risks (prompt injection, insecure output handling, data leakage, etc.). Anchor Bài 17B's threat model to it.

```text
https://genai.owasp.org/
```

### Provider prompt caching docs

Check current caching mechanics, minimum cacheable prefix sizes, and pricing on the official OpenAI and Anthropic platform docs before implementing Bài 9 caching.

### UI quality gate tooling

Playwright (visual regression via screenshot comparison) and axe-core (accessibility) official docs — for Bài 21B gates.

### Claude Code dev-agent primitives (Bài 0E)

Official docs for subagents, hooks, skills, and plugins — the primitives for the dev-agent layer. Verify exact file syntax here before implementing; the enforcement-tiering principle (hooks = deterministic, instructions = advisory) is the durable takeaway.

```text
https://code.claude.com/docs/en/sub-agents
```

### Mobile development (Bài 0)

Claude Code Remote Control setup, security model, and version/plan requirements; and the OpenAI Codex app for the Codex Cloud delegate path. Re-verify before relying on them — these features and their plan/OS requirements change quickly.

```text
https://code.claude.com/docs/en/remote-control
https://openai.com/index/introducing-the-codex-app/
```

---

## 16. Final Positioning

Curriculum v7.3 can be described as:

> This curriculum teaches AI orchestration engineering by building a real banking-focused AI workbench, covering a governed dev-agent layer (enforcement tiering + a user-feedback→evidence loop) and mobile development, a knowledge-substrate strategy with provenance-by-reference (binding deliverables to bank data regions+versions instead of owning the data), skill-as-contract design, prompt and context engineering with trust labels, structured outputs, golden datasets with growth policy and calibrated judges, quality gates, cost-aware model routing via a capability catalog with caching, a design system contract with AI UI generation and design orchestration, agentic workflows, MCP/tool integration, RAG with retrieval evaluation, domain packs, privacy and adversarial security, verified compliance mapping, multi-tenant deployment, observability and release operations, AI-native UX, handover readiness, and solution packaging for both PLG users and enterprise stakeholders — executed as a Core Spine that ships, plus an Expansion Track that deepens.

Vietnamese version:

> Curriculum này dạy AI Orchestration Engineering qua việc xây một sản phẩm thật cho banking process-to-delivery workflow, vận hành theo 2 track: Core Spine (bắt buộc, ship sản phẩm) và Expansion (đào sâu). Nội dung phủ: lớp dev-agent có governance (phân tầng enforcement bằng hook + vòng phản hồi người dùng→bằng chứng) và phát triển trên mobile, chiến lược knowledge substrate với provenance-by-reference (gắn deliverable tới vùng dữ liệu+phiên bản của ngân hàng thay vì sở hữu dữ liệu), LLM & capability catalog, prompt/context engineering với trust label, skill contract, schema, golden dataset có chính sách tăng trưởng & judge được hiệu chỉnh, quality gate, routing/advisor/caching, design system contract & sinh UI bằng AI, agentic workflow, MCP, RAG (kèm đánh giá retrieval tiếng Việt), domain pack, bảo mật chống prompt injection & red teaming, governance & mapping tuân thủ VN có xác minh nguồn luật, multi-tenancy, observability & vận hành release, sẵn sàng bàn giao, đến đóng gói case study cho cả người dùng cá nhân (PLG) lẫn ngân hàng.

---

## 17. One-page Action Plan

### Now — operating model + dev-agent layer + cleanup

```text
- Commit file này vào docs/curriculum/ (source of truth)
- Tạo CURRICULUM_STATUS.md từ template §10, điền budget cap
- Bài 0E: dựng .claude/ (subagent + starter hook: chặn secrets,
  typecheck-on-edit, no force-push) — hook gác cả các commit cleanup
- Mobile: bật Claude Code Remote Control (steer task từ điện thoại)
- Gate 0: P1.1, P1.3, P1.4, P1.5 (ADR), lint (ADR)
- Bật tenantId trên mọi storage/audit write mới
```

### Spine W2–W3 — design contract + baseline

```text
Bài 0D: design tokens + component registry + AGENTS.md design rules
Bài 7 min: golden dataset v1 × 3 skills + stamped baseline
           + judge calibration
```

### Spine W4–W5 — routing + security song song

```text
Bài 9 min: executor/advisor 2 chiều + prompt caching + cost per attempt
Bài 17:    PII masking (VN patterns) + hard data-mode enforcement
Bài 17B min: threat model + red-team suite v0
```

### Spine W6–W7 — quality (nếu cần) + mini case study

```text
Bài 8: chỉ làm nếu baseline lộ quality gap đáng giá
Bài 22 mini: 1 trang số liệu thật + demo 5 phút + danh sách "not yet"
→ quyết định thứ tự Expansion (E1–E5)
```

### Expansion — theo ROI sau mini case study

```text
E1 Bài 3B substrate strategy + SOURCE_REGISTER + scope ADR
   → Banking Pack + RAG (bind SourceRef khi sinh deliverable)
→ E2 orchestration/MCP
→ E3 feedback + topology/compliance (legal register)
→ E4 Artifact Graph + provenance lifecycle (freshness/impact) + Ops + UX
   + design orchestration
→ E5 full case study + Gate 5
```

Lưu ý: chiến lược substrate (Bài 3B) quyết trước khi dựng RAG; SourceRef capture là spine insurance (ghi ngay khi RAG có), còn vòng đời freshness/impact ở E4.

---

## End State

At the end of this curriculum, you should not merely know AI terms. You should be able to:

```text
Explain the principles.
Build the primitives.
Use the right vocabulary.
Compare native tools.
Govern the dev-agent layer with deterministic hooks and human approval.
Turn user feedback into guarded eval cases or curriculum changes.
Bind deliverables to bank data by reference (region+version), not by copying.
Develop from anywhere without putting real data at risk.
Measure outcomes against stamped baselines.
Ship UI that honors a design contract.
Secure the banking path — privacy AND adversarial.
Back every compliance claim with a verified source and owner.
Operate releases and incidents.
Hand the whole thing to another team and have them own it.
Package the solution for both PLG users and enterprise buyers.
Present it with metrics.
```

That is the standard for completion.
