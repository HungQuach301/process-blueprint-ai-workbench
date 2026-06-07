# Product Context — Process Blueprint AI Workbench

## 1. Product positioning

Process Blueprint AI Workbench is an AI Process & Spec Workbench for business-to-software delivery.

The product helps PO, BA, SA, Product Manager, Business Architect, and Solution Architect turn business intent, process notes, files, AI conversations, and requirements into controlled, traceable delivery artifacts.

The product is not just:
- an AI BPMN generator
- an AI BRD generator
- an AI SRS generator
- an AI UI generator

The product is a governed AI workbench that connects, validates, traces, and exports enterprise delivery artifacts.

## 2. Target users

Initial target users:
- Product Owner
- Business Analyst
- Solution Architect
- Product Manager
- Business Architect
- IT / Solution Architect

Initial go-to-market:
- Individual-first / product-led growth
- Banking and financial services as the first domain
- Expand later to team and enterprise workspace

Expected user mix:
- Around 50% non-tech users
- Around 50% tech-savvy users

Design implication:
- Simple mode for guided workflows
- Advanced / power mode for templates, specs, AI coding export, BYOK, and architecture controls

## 3. Product north star

Turn business knowledge into process, requirements, user stories, solution specs, UI specs, and AI-ready coding context with quality checks, traceability, and human approval.

## 4. Core moat

The product moat is not artifact generation alone.

The moat is:
- Artifact Graph
- Traceability Matrix
- Quality Gates
- Domain Packs
- Human-in-the-loop approval
- AI Coding Spec export
- Local-first / BYOK / enterprise-ready governance
- Banking-specific templates, glossary, rule packs, and delivery patterns

## 5. Core principle

AI creates drafts, recommendations, or review findings.

The user reviews and approves before changes are applied.

Process Task Register remains the canonical model for process artifacts, but not every feature must start from Process Task Register.

The broader architecture should be Artifact Graph-centric.

## 6. Initial business scope

The product scope includes:
- Process Modeling Core
- Product Delivery
- SA / BA Delivery
- UI / Experience Generation
- Business Architecture
- IT / Solution Architecture

## 7. MVP direction

The MVP should use real AI for a small number of high-value skills:
- Input / file / chat to Draft Process Task Register
- Notes / BRD to User Stories
- User Stories / SRS to AI Coding Pack
- QA / Recommendation assistance

The MVP must still support local/mock fallback.

No API key should be exposed in browser code.

All real AI calls should go through server-side provider adapters.