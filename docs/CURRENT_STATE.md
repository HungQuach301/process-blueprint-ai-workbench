# Current State

## 1. Mục tiêu sản phẩm hiện tại

Process Blueprint AI Workbench là MVP cho một workbench phân tích, chuẩn hóa, kiểm tra và sinh artifact quy trình doanh nghiệp.

Mục tiêu hiện tại:

- Dùng Process Task Register làm nguồn sự thật duy nhất.
- Sinh D01 BPMN, D02 Service Blueprint, QA Report, JSON export và ZIP package từ `ProcessTask[]` và `TemplateProfile`.
- Giữ generation deterministic, reviewable và phù hợp dữ liệu enterprise/banking.
- Chuẩn bị nền tảng cho AI-assisted workflow nhưng chưa gửi dữ liệu ra external AI provider.
- Cho phép người dùng review, apply recommendation và lưu feedback local để phục vụ training/learning trong tương lai.

Nguyên tắc quan trọng:

- Không tạo nguồn định nghĩa quy trình thứ hai ngoài Process Task Register.
- Không tự động apply thay đổi rủi ro cao.
- Dữ liệu ngân hàng/doanh nghiệp mặc định nên local-only hoặc no-training.
- AI future integration phải đi qua schema validation và human approval.

## 2. Các module đã hoàn thành

### Core data model

- `ProcessTask`
- `TemplateProfile`
- `Workspace`
- Template classification metadata:
  - `outputType`
  - `processType`
  - `journeyType`
  - `scopeType`
  - `businessDomain`
  - `notationStandard`
  - `organizationType`
  - `tags`

### Sample data

- SME Online Loan workspace.
- Sample D01 BPMN template.
- Sample D02 Service Blueprint template.
- Sample Process Task Register.

### Process Task Register

- Inline editing.
- Controlled dropdowns cho các field chính.
- Add row.
- Duplicate row.
- Delete row.
- Save/load/reset bằng `localStorage`.
- Excel import preview/apply flow.
- Artifact stale marking khi dữ liệu thay đổi.

### Template Library

- D01 BPMN template selection.
- D02 Service Blueprint template selection.
- Template Profile editor.
- Editable JSON rule fields.
- Classification metadata editor bằng select controls.
- Tags input dạng comma-separated.
- Save/load/reset bằng `localStorage`.

### Rule-based QA Engine và QA Panel

- Rule-based validation cho Process Task Register.
- Errors, warnings, suggestions.
- Click issue để highlight row.
- QA Report download.
- Recommendation UI cho từng issue.
- Batch recommendation UI:
  - select safe recommendations
  - clear selection
  - apply selected
  - apply all safe
  - batch preview
  - conflict detection
  - confirmation before apply

### Recommendation feedback logging

- Local feedback logging bằng `localStorage`.
- Export Recommendation Feedback JSON.
- Clear Local Feedback.
- Log accepted/rejected/skipped recommendation.
- Log batch summary.
- Conflict skip được ghi reason `conflict`.

### D01 BPMN

- BPMN 2.0 XML generation từ `ProcessTask[]`.
- `.bpmn` download.
- Read-only visual preview bằng `bpmn-js`.
- Typed BPMN elements:
  - Start Event
  - End Event
  - User Task
  - Service Task
  - Send Task
  - Exclusive Gateway
- Collaboration pools và internal lanes.
- Message/data associations ở mức cơ bản.
- BPMN DI shapes/edges.

### D02 Service Blueprint

- draw.io compatible XML generation từ `ProcessTask[]`.
- `.drawio` download.
- Một `ProcessTask` là một card.
- Không merge nhiều task thành một card.
- Task card gồm 3 joined boxes:
  - Header = actor
  - Middle = task name + BPMN type + task nature
  - Footer = system/app
- Phase columns.
- Dynamic row height và phase width.
- Separator lines.
- Actor/system/data/control notation styling.
- In-browser lightweight D02 preview đã có ở mức hiện tại.

### Export Center

- Generate all artifacts.
- Artifact readiness/freshness status.
- ZIP package gồm D01, D02, Process Task Register JSON, Template Profile JSON và QA Report Markdown.

### AI documentation

Đã có các tài liệu thiết kế:

- `docs/AI_ARCHITECTURE_DESIGN.md`
- `docs/AI_INPUT_BRIEF_DESIGN.md`
- `docs/AI_QA_ENGINE_DESIGN.md`
- `docs/AI_RECOMMENDATION_ENGINE_DESIGN.md`
- `docs/AI_TEMPLATE_REVIEW_DESIGN.md`

## 3. Kiến trúc hiện tại

Kiến trúc hiện tại là client-side Next.js MVP với App Router, React, TypeScript và Tailwind CSS.

Luồng dữ liệu chính:

```text
ProcessTask[] + TemplateProfile[]
  -> Rule-based QA
  -> Recommendation Engine
  -> D01 BPMN generator
  -> D02 Service Blueprint generator
  -> QA Report generator
  -> Export Center
```

Nguồn lưu trữ hiện tại:

- `localStorage` cho Process Task Register.
- `localStorage` cho Template Profiles và selected D01/D02 templates.
- `localStorage` cho artifact freshness status.
- `localStorage` cho recommendation feedback.

Các boundary quan trọng:

- `src/lib/models/`: core models.
- `src/lib/qa/`: rule-based QA entrypoints.
- `src/lib/recommendation-engine/`: recommendation types, factories, preview/apply operations, feedback store.
- `src/lib/generators/`: deterministic artifact generators.
- `src/lib/ai/`: AI scaffold mock-only, chưa gọi API thật.
- `src/components/*`: UI modules.

## 4. Recommendation Engine status

Recommendation Engine hiện tại là rule-based và local.

Đã có:

- `QARecommendation` type.
- Recommendation factory từ QA issue.
- Operation model:
  - `UpdateTaskField`
  - `AssignActor`
  - `AssignSystem`
  - `SetInteractionType`
  - `MarkReviewStatus`
  - `UpdateConnection`
  - `CreateTaskAfter`
  - `CreateTaskBefore`
  - `InsertTaskBetween`
  - `SplitTask`
  - `CreateGateway`
  - `AddGatewayBranch`
  - `CreateLane`
- Single recommendation preview/apply.
- Batch recommendation preview/apply.
- Conflict detection.
- Safe recommendation detection:
  - `confidence = high`
  - `riskLevel = low`
  - only simple operations
- Graph-changing recommendation không được chọn mặc định.
- Feedback logging local.

Trạng thái:

- Hoạt động local-only.
- Không gọi AI API.
- Chưa có AI ranking hoặc AI-generated recommendation thật.
- Đã sẵn sàng để AI scaffold trả về `QARecommendation[]` trong tương lai.

## 5. Template Recommendation Engine status

Template Recommendation Engine hiện ở mức thiết kế và scaffold type.

Đã có:

- Template classification metadata trong `TemplateProfile`.
- Template Library editor cho metadata.
- Tài liệu `AI_TEMPLATE_REVIEW_DESIGN.md`.
- AI scaffold type `TemplateRecommendation` trong `src/lib/ai/ai-template-review-types.ts`.
- Mock service `runMockTemplateReview`.

Chưa có:

- Rule-based template reviewer runtime.
- Template quality score runtime.
- UI riêng cho Template Recommendation.
- Apply workflow cho TemplateRecommendation.
- Feedback logging riêng cho template recommendation.

Định hướng:

- Template Recommendation Engine nên train/evaluate độc lập với Recommendation Engine sửa Process Task Register.
- Output nên là `TemplateRecommendation[]`, không dùng `QARecommendation[]` cho template patch.
- Không sửa D01/D02 generators trong giai đoạn template review.

## 6. AI scaffold status

AI scaffold đã được tạo trong `src/lib/ai/`.

Files hiện có:

- `model-provider-types.ts`
- `ai-orchestration-types.ts`
- `ai-qa-types.ts`
- `ai-qa-service.ts`
- `ai-template-review-types.ts`
- `ai-template-review-service.ts`
- `ai-input-brief-types.ts`
- `ai-input-brief-service.ts`
- `ai-recommendation-types.ts`
- `ai-recommendation-service.ts`

Provider/data modes đã định nghĩa:

- Model provider:
  - `product-ai`
  - `openai-byok`
  - `claude-byok`
  - `azure-openai`
  - `local-model`
  - `no-ai`
- Data usage mode:
  - `local-only`
  - `cloud-processing`
  - `no-training`
  - `organization-private-learning`

Mock functions:

- `runMockAIQA`
- `runMockTemplateReview`
- `runMockInputBriefExtraction`
- `runMockAIRecommendations`

Trạng thái:

- Compile được.
- Không có API key.
- Không có external API/network call.
- `meta.externalApiCalled = false`.
- Dùng lại type hiện có như `ProcessTask`, `TemplateProfile`, `QARecommendation`.

## 7. Hạn chế hiện tại

### Product/runtime

- Chưa có backend persistence.
- `localStorage` là storage chính, chưa phù hợp production enterprise.
- Chưa có auth, user role, tenant isolation.
- Chưa có audit log UI đầy đủ.
- Chưa có version history/rollback.

### D01 BPMN

- Layout còn đơn giản và có thể rất rộng với process lớn.
- Cần validate thêm bằng Camunda Modeler với dữ liệu thực.
- Chưa hỗ trợ đầy đủ advanced BPMN:
  - boundary events
  - event-based gateways
  - subprocess
  - complex exception choreography

### D02 Service Blueprint

- D02 preview còn lightweight, không thay thế kiểm tra trong diagrams.net.
- Large blueprint vẫn cần manual layout review.
- Template visual rules mới áp dụng một phần.

### Recommendation

- Recommendation hiện chủ yếu rule-based.
- AI Recommendation chưa được gọi thật.
- Safe criteria đang cố ý chặt.
- Graph-changing recommendation cần review kỹ.
- Feedback logging local chưa có analytics UI.

### Template Recommendation

- Mới có metadata, docs và scaffold type.
- Chưa có scoring runtime.
- Chưa có apply/approval UI riêng.

### AI

- AI scaffold chỉ mock.
- Chưa có provider adapter.
- Chưa có prompt pack runtime.
- Chưa có schema validation runtime riêng cho AI output.
- Chưa có masking/redaction pipeline.
- Chưa có data mode enforcement UI.

## 8. Ưu tiên triển khai tiếp theo

1. Hoàn thiện AI Input Brief MVP local-only:
   - structured input form
   - draft PTR preview
   - mock extraction
   - review-before-apply

2. Thêm schema validation cho AI scaffold output:
   - `ProcessTask[]`
   - `QARecommendation[]`
   - `TemplateRecommendation[]`

3. Thêm UI data mode/provider mode:
   - Local-only
   - No-AI
   - BYOK placeholder
   - Enterprise provider placeholder

4. Template Recommendation Engine MVP:
   - rule-based template checks
   - template quality score
   - template recommendation preview

5. Recommendation feedback analytics:
   - accepted/rejected/skipped counts
   - conflict rate
   - export summary

6. Audit log foundation:
   - local audit entries
   - export audit JSON
   - provider/data mode metadata

7. Excel export/import improvements:
   - export reviewed PTR to Excel
   - import reviewed Excel with validation

8. D02 refinement:
   - stronger row/card/source-field contract
   - preview fidelity improvements
   - large blueprint layout checks

9. Enterprise readiness:
   - backend persistence design
   - auth/role model
   - tenant isolation
   - no-training/BYOK governance

## 9. Git baseline/tag

Available tag:

- `v0.4.0`

Current HEAD at time of this document update:

- `3d0b050`

Ghi chú:

- Nếu tiếp tục phát triển sau khi có thêm commit mới, hãy chạy lại:

```powershell
git tag --sort=-creatordate
git rev-parse --short HEAD
git status --short
```

để cập nhật baseline chính xác.

## 10. Cách tiếp tục trong Codex session mới

Khi mở session Codex mới, nên bắt đầu bằng checklist sau:

1. Đọc `AGENTS.md`.
2. Đọc `docs/CURRENT_STATE.md`.
3. Đọc tài liệu AI liên quan nếu task thuộc AI:
   - `docs/AI_ARCHITECTURE_DESIGN.md`
   - `docs/AI_INPUT_BRIEF_DESIGN.md`
   - `docs/AI_QA_ENGINE_DESIGN.md`
   - `docs/AI_RECOMMENDATION_ENGINE_DESIGN.md`
   - `docs/AI_TEMPLATE_REVIEW_DESIGN.md`
4. Chạy `git status --short` để biết worktree có thay đổi sẵn không.
5. Nếu task liên quan UI/generator, đọc đúng file liên quan trước khi sửa.
6. Trước khi code, giải thích plan bằng tiếng Việt và liệt kê file sẽ sửa.
7. Giữ thay đổi nhỏ nhất.
8. Không sửa D01/D02 generators nếu task không yêu cầu rõ.
9. Không gọi external AI API nếu chưa được yêu cầu và chưa có data/provider mode an toàn.
10. Sau khi sửa, chạy tối thiểu:

```powershell
npx.cmd tsc --noEmit
```

11. Nếu thay đổi application code đáng kể, chạy thêm:

```powershell
npm run build
```

12. Nếu thay đổi UI, mở app và test workflow liên quan:

```powershell
npm run dev
```

Sau đó mở:

```text
http://localhost:3000
```

Luôn nhớ: Process Task Register là nguồn sự thật chính, AI chỉ tạo draft/recommendation, người dùng phải review trước khi apply.
