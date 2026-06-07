# AI Recommendation Engine Design

## 1. Relationship with rule-based Recommendation Engine

AI Recommendation Engine không thay thế rule-based Recommendation Engine. Hai lớp này nên phối hợp theo mô hình bổ sung năng lực.

Rule-based Recommendation Engine phù hợp với các gợi ý deterministic:

- Gán actor/system khi rule rõ ràng.
- Gán actorLane/systemLane từ actor/system hiện có.
- Đánh dấu `reviewStatus = needsReview`.
- Sửa field đơn giản từ issue có logic rõ.
- Tạo recommendation an toàn với confidence/risk đã biết.

AI Recommendation Engine phù hợp với các gợi ý cần ngữ cảnh:

- Suy luận actor/system từ mô tả nghiệp vụ dài.
- Đề xuất tách task khi task name hoặc output cho thấy nhiều hành động.
- Đề xuất wording tốt hơn cho taskName, conditionQuestion, exceptionHandling.
- Đề xuất bổ sung SLA hoặc risk/control dựa trên domain.
- Đề xuất customerInteractionType hoặc D02 layer khi rule chưa chắc.
- Đề xuất template/process fit khi metadata và process context không khớp.

Nguyên tắc phối hợp:

- Rule-based engine chạy trước để tạo baseline issues và recommendations.
- AI engine nhận Process Task Register, rule-based QA issues và existing recommendations làm context.
- AI không lặp lại recommendation giống rule nếu không bổ sung giá trị.
- AI có thể tạo `source = "ai"` hoặc `source = "hybrid"`.
- Recommendation cuối cùng đều phải đi qua cùng preview/apply workflow.

## 2. AI Recommendation input/output schema

### Input schema

AI Recommendation input nên có cấu trúc rõ:

```ts
type AIRecommendationRequest = {
  context: AIOrchestrationContext;
  processTasks: ProcessTask[];
  templateProfiles?: TemplateProfile[];
  targetStepIds?: string[];
  issueCodes?: string[];
};
```

Input có thể gồm:

- `ProcessTask[]`: nguồn dữ liệu chính.
- Rule-based QA issues: lỗi hiện có.
- Existing rule recommendations: gợi ý đã có để tránh trùng.
- Selected D01/D02 TemplateProfile.
- D01 BPMN XML hoặc D02 draw.io XML nếu cần review artifact.
- Provider mode và data mode.
- Prompt pack id/version.

### Output schema

Output chính phải là:

```ts
type AIRecommendationResponse = {
  recommendations: QARecommendation[];
  meta: AIOrchestrationResponseMeta;
};
```

Không nên dùng free-form text làm output chính. Nếu cần giải thích, đưa vào `description`, `rationale`, `warnings` hoặc `meta.assumptions`.

## 3. How AI creates QARecommendation[]

AI tạo `QARecommendation[]` theo các bước:

1. Đọc Process Task Register và context được phép.
2. Xác định issue hoặc improvement candidate.
3. Chọn recommendation type phù hợp.
4. Sinh operation có cấu trúc.
5. Tính confidence và riskLevel.
6. Tạo previewText dễ đọc.
7. Gắn targetStepIds và complianceTags.
8. Trả về schema `QARecommendation[]`.

Các recommendation type có thể dùng:

- `UpdateField`
- `AssignActor`
- `AssignSystem`
- `SetInteractionType`
- `MarkReviewStatus`
- `SplitTask`
- `CreateTask`
- `CreateLane`
- `AddGatewayBranch`
- `ChangeBpmnType`
- `ChangeRowType`

Ví dụ recommendation field-only:

```ts
{
  source: "ai",
  recommendationType: "SetInteractionType",
  title: "Gán customerInteractionType = Front-stage People",
  targetStepIds: ["S120"],
  confidence: "medium",
  riskLevel: "low",
  operations: [
    {
      kind: "SetInteractionType",
      stepId: "S120",
      customerInteractionType: "Front-stage People"
    }
  ],
  requiresConfirmation: true
}
```

Với recommendation graph-changing, AI phải đánh dấu warning rõ và không được auto-select mặc định.

## 4. How AI recommendations are validated

Validation là bắt buộc trước khi recommendation hiển thị hoặc apply.

Các lớp validation:

### Schema validation

Kiểm tra:

- Output là array.
- Mỗi item có `title`, `description`, `confidence`, `impact`, `targetStepIds`, `previewText`.
- `confidence`, `impact`, `riskLevel` nằm trong enum hợp lệ.
- `recommendationType` hợp lệ.
- `operations` hợp lệ theo union type.

### Reference validation

Kiểm tra:

- `targetStepIds` tồn tại trong Process Task Register nếu recommendation cập nhật row hiện có.
- `newTasks.stepId` không trùng với stepId hiện có.
- `defaultNextStep`, `yesNextStep`, `noNextStep` trỏ tới stepId hợp lệ hoặc được đánh dấu placeholder cần review.

### Safety validation

Kiểm tra:

- Graph-changing operation có `requiresConfirmation = true`.
- High-risk recommendation không được chọn mặc định.
- Recommendation thay đổi SLA/risk/control phải có warning.
- Recommendation không được xóa dữ liệu quan trọng nếu không có approval explicit.

### Conflict validation

Batch preview phải phát hiện:

- Hai recommendation sửa cùng field thành giá trị khác nhau.
- Hai recommendation tạo cùng stepId.
- Recommendation tạo connection tới target không tồn tại.
- Recommendation bị skip vì conflict phải log reason.

## 5. Preview/apply workflow

Luồng preview/apply:

1. Recommendation được sinh ra.
2. UI hiển thị title, description, confidence, risk, previewText.
3. Người dùng chọn từng recommendation hoặc chọn safe recommendations.
4. Batch preview tính:
   - số recommendations
   - affected stepIds
   - field changes
   - new tasks
   - connection changes
   - warnings/conflicts
5. Người dùng confirm.
6. Apply qua graph-aware helper.
7. Persist Process Task Register theo hành vi hiện tại.
8. QA chạy lại.
9. D01/D02/export artifact được đánh dấu stale.
10. Feedback record được ghi local.

Safe recommendations mặc định:

- `confidence = high`
- `riskLevel = low`
- operations chỉ gồm:
  - `UpdateTaskField`
  - `AssignActor`
  - `AssignSystem`
  - `SetInteractionType`
  - `MarkReviewStatus`

Graph-changing recommendations không được chọn mặc định:

- `SplitTask`
- `CreateTaskAfter`
- `CreateTaskBefore`
- `InsertTaskBetween`
- `CreateGateway`
- `AddGatewayBranch`
- `UpdateConnection`
- `CreateLane`

## 6. Feedback logging for training

Feedback logging là nguồn học chính cho Recommendation Engine.

Mỗi recommendation nên log:

- `recommendationId`
- `issueCode`
- `source`
- `userAction`: accepted, rejected, skipped
- `originalRecommendation`
- `finalAppliedOperations`
- `affectedStepIds`
- `reason`
- `timestamp`

Batch apply nên log thêm batch summary:

- số recommendation được chọn
- số applied
- số skipped
- conflicts
- warnings
- affected stepIds

Feedback có thể dùng cho:

- Few-shot examples.
- Prompt tuning.
- Confidence calibration.
- Risk calibration.
- Ranking recommendation.
- Detect repeated rejection patterns.
- Train organization-private recommendation skill nếu khách hàng opt-in.

Mặc định feedback chỉ lưu local. Không dùng để train model chung nếu chưa có consent và data policy rõ ràng.

## 7. Safety rules

### No auto apply

AI Recommendation Engine không được tự apply vào Process Task Register. Nó chỉ được tạo recommendation và preview. Apply luôn là hành động của người dùng.

### No destructive update without user approval

AI không được xóa, overwrite hoặc thay đổi dữ liệu quan trọng nếu chưa có user approval.

Các update cần đặc biệt cẩn thận:

- Xóa next step.
- Thay đổi gateway branch.
- Thay đổi SLA.
- Thay đổi risk/control.
- Thay đổi decision logic.
- Thay đổi actor/system có ảnh hưởng ownership.
- Split task hoặc create task mới.

### Graph-changing recommendation requires explicit confirmation

Graph-changing recommendation luôn phải có explicit confirmation.

Yêu cầu:

- Không chọn mặc định trong Select safe.
- Hiển thị affected stepIds.
- Hiển thị connection changes.
- Hiển thị warning.
- Log accepted/rejected/skipped.
- Re-run QA sau khi apply.

## 8. Local/BYOK/enterprise model modes

### Local-only

Recommendation chạy bằng rule-based engine, mock AI hoặc local model. Không gửi dữ liệu ra ngoài app/máy. Phù hợp cho dữ liệu ngân hàng nhạy cảm và môi trường chưa phê duyệt cloud AI.

### BYOK

Tổ chức dùng API key riêng. Product chỉ điều phối prompt, schema, validation, approval và audit. BYOK cần backend bảo mật nếu lưu hoặc gọi API key.

### Enterprise provider

Tổ chức cấu hình provider nội bộ hoặc private endpoint. Chế độ này cần:

- Endpoint riêng.
- Auth riêng.
- Tenant isolation.
- Audit log.
- No-training.
- Network policy.

### No-AI

Tắt mọi model call. Rule-based Recommendation Engine vẫn hoạt động. Đây là fallback bắt buộc cho môi trường ngân hàng hoặc audit.

## 9. Independent trainable skill/agent

AI Recommendation Engine có thể hoạt động như một skill/agent độc lập.

### Skill boundary

Skill nên có boundary rõ:

- Input: ProcessTask[], QA issues, TemplateProfile, selected artifact context.
- Output: QARecommendation[].
- Không apply trực tiếp.
- Không gọi external API nếu provider mode không cho phép.
- Không đọc dữ liệu ngoài context được cấp.

### Training data

Skill có thể học từ:

- Recommendation feedback.
- Accepted operations.
- Rejected reason.
- Conflict/skipped reason.
- Before/after ProcessTask snapshot nếu được phép.
- Issue code và template metadata.

### Evaluation metrics

Metric nên gồm:

- Acceptance rate.
- Rejection rate.
- Conflict rate.
- Safe recommendation precision.
- Post-apply QA issue reduction.
- Human edit distance sau recommendation.
- Risk/confidence calibration.

### Deployment model

Skill có thể triển khai theo nhiều chế độ:

- Local mock skill cho MVP.
- Rule+AI hybrid skill.
- Organization-private trained skill.
- Enterprise-hosted skill.

Điểm quan trọng: Recommendation skill học cách sửa Process Task Register, không nên trộn với Template Recommendation skill học cách chọn/review template. Hai skill có thể dùng chung feedback infrastructure, nhưng dataset và evaluation nên tách riêng để dễ governance.
