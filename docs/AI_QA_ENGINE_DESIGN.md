# AI QA Engine Design

## 1. Rule QA vs AI QA

Rule QA và AI QA nên cùng tồn tại, nhưng có vai trò khác nhau.

### Rule QA

Rule QA là lớp kiểm tra deterministic, ổn định và dễ audit. Rule QA phù hợp với các lỗi có điều kiện rõ ràng:

- Thiếu actor.
- Thiếu system cho service task.
- Gateway thiếu condition hoặc Yes/No branch.
- Next step trỏ tới `stepId` không tồn tại.
- User task thiếu actor lane.
- Service task thiếu system lane.
- Task thiếu input/output.
- Service Blueprint card thiếu field nền.

Ưu điểm:

- Không cần gọi model.
- Chạy local.
- Kết quả repeatable.
- Dễ test và giải thích.
- Phù hợp với No-AI mode.

Giới hạn:

- Khó phát hiện vấn đề ngữ nghĩa.
- Không hiểu đủ ngữ cảnh nghiệp vụ dài.
- Không tự suy luận process decomposition phức tạp.
- Không review được chất lượng wording hoặc business intent sâu.

### AI QA

AI QA là lớp phân tích bổ sung để phát hiện vấn đề mềm, ambiguity và design quality.

AI QA phù hợp với:

- Task name có nhiều hành động nhưng không có keyword rõ.
- Actor/system có thể suy luận nhưng rule không chắc.
- SLA, exception hoặc risk/control mô tả mơ hồ.
- Gateway condition chưa đúng ngữ cảnh nghiệp vụ.
- D01 BPMN XML hợp lệ về syntax nhưng chưa tốt về process semantics.
- D02 blueprint có row/card/phase chưa hợp lý với customer journey.
- TemplateProfile không phù hợp với process type hoặc output type.

Nguyên tắc:

- AI QA không thay thế Rule QA.
- AI QA không tự apply thay đổi.
- AI QA output phải được schema validation.
- AI QA recommendation phải qua human approval.
- Trong môi trường ngân hàng, AI QA mặc định local-only hoặc no-training nếu dùng provider.

## 2. AI QA inputs

AI QA có thể nhận nhiều nguồn input, nhưng cần gửi tối thiểu dữ liệu cần thiết theo data mode đã chọn.

### Process Task Register

Process Task Register là input chính. AI QA đọc `ProcessTask[]` để hiểu:

- Step sequence.
- Actor/system/data linkage.
- Phase/group.
- BPMN type và row type.
- Input/output.
- SLA, risk/control.
- Exception handling.
- Review status.
- Customer interaction type và channel.

Mọi recommendation sửa dữ liệu phải trace về `stepId`.

### D01 BPMN XML

D01 BPMN XML giúp AI QA review artifact đã generate:

- BPMN structure có phản ánh đúng Process Task Register không.
- Gateway flow có rõ meaning không.
- Lane/pool có hợp lý không.
- Message flow hoặc data association có bị thiếu/ngược không.
- BPMN diagram có thể quá rộng hoặc khó đọc không.

D01 XML chỉ là artifact review, không phải source of truth. Nếu cần sửa, recommendation phải quay về Process Task Register hoặc TemplateProfile.

### D02 draw.io XML

D02 draw.io XML giúp AI QA review Service Blueprint:

- Task card có đúng layer không.
- Customer action, front-stage, back-stage, support process có hợp lý không.
- Card có overlap không.
- Phase/row layout có dễ đọc không.
- Evidence/time/step row có thiếu context không.

D02 XML cũng không phải source of truth. Sửa đổi nên được đề xuất dưới dạng ProcessTask hoặc TemplateProfile recommendation.

### TemplateProfile

TemplateProfile cho AI QA biết rule và design intent của output:

- D01/D02 template đang chọn.
- Row rules.
- Lane rules.
- Task card rules.
- Connector rules.
- Layout rules.
- Mandatory fields.
- Classification metadata như outputType, processType, businessDomain.

AI QA có thể dùng TemplateProfile để phân biệt lỗi dữ liệu với lỗi template fit.

### Rule-based QA issues

Rule-based QA issues là input quan trọng để AI QA không làm lại việc rule đã làm.

AI QA có thể:

- Ưu tiên phân tích các issue nặng.
- Gom nhóm issue cùng nguyên nhân.
- Tạo recommendation có ngữ cảnh tốt hơn.
- Bổ sung rationale và warning.
- Đề xuất thứ tự xử lý.

Rule issue nên gồm: issue id, issue code, severity, stepId, message, suggestedFix và recommendations hiện có nếu có.

## 3. AI QA output schema using QARecommendation

AI QA output nên dùng `QARecommendation[]` để tận dụng Recommendation Engine hiện có.

Mỗi recommendation nên có:

- `id`: định danh recommendation.
- `source`: `ai` hoặc `hybrid`.
- `issueId`: issue liên quan nếu có.
- `issueCode`: rule issue code hoặc AI issue code.
- `title`: tiêu đề ngắn.
- `description`: mô tả gợi ý.
- `rationale`: lý do.
- `confidence`: low, medium, high.
- `impact`: low, medium, high.
- `riskLevel`: low, medium, high.
- `targetStepIds`: các step bị ảnh hưởng.
- `recommendationType`: loại gợi ý.
- `operations`: operation có cấu trúc.
- `previewText`: preview dễ đọc.
- `patch`: field patch nếu là update đơn giản.
- `newTasks`: task mới nếu có.
- `warnings`: cảnh báo.
- `requiresConfirmation`: luôn true với AI QA.
- `complianceTags`: ví dụ `human-review`, `process-integrity`, `banking-policy`.

Ví dụ output:

```ts
type AIQAResponse = {
  recommendations: QARecommendation[];
  meta: {
    requestId: string;
    provider: ModelProvider;
    dataUsageMode: DataUsageMode;
    externalApiCalled: boolean;
    warnings: string[];
    assumptions: string[];
  };
};
```

AI QA không nên trả free-form text làm output chính. Free-form explanation có thể nằm trong `description`, `rationale`, `warnings` hoặc `assumptions`.

## 4. Human approval workflow

AI QA recommendation phải đi qua workflow phê duyệt trước khi apply:

1. AI QA chạy trên input được phép.
2. Output được validate theo schema.
3. Recommendation hiển thị trong QA Panel.
4. Người dùng xem confidence, risk, preview và affected stepIds.
5. Người dùng chọn accept, reject hoặc skip.
6. Batch apply chỉ chọn recommendation safe mặc định.
7. Graph-changing recommendation không được chọn mặc định.
8. Khi confirm, apply qua graph-aware helper.
9. Process Task Register cập nhật.
10. QA chạy lại.
11. D01/D02/export artifact được đánh dấu stale.

Các recommendation cần approval nghiêm ngặt:

- SplitTask.
- CreateTaskAfter/CreateTaskBefore.
- InsertTaskBetween.
- CreateGateway.
- AddGatewayBranch.
- UpdateConnection.
- Thay đổi SLA, risk/control hoặc decision logic.
- Bất kỳ gợi ý nào có `riskLevel = high`.

## 5. Feedback logging for training/few-shot

Feedback logging giúp cải thiện AI QA trong tương lai mà không cần đưa dữ liệu ra ngoài mặc định.

Nên ghi local feedback:

- Recommendation id.
- Issue code.
- Source.
- User action: accepted, rejected, skipped.
- Original recommendation.
- Final applied operations.
- Affected stepIds.
- Reason nếu rejected/skipped.
- Timestamp.
- Batch summary nếu apply batch.

Ứng dụng có thể dùng feedback để:

- Tạo few-shot examples nội bộ.
- Đánh giá loại recommendation nào hay bị reject.
- Hiệu chỉnh confidence/risk.
- Cải thiện prompt pack.
- Tách dữ liệu train cho Recommendation Engine và Template Recommendation Engine.

Nguyên tắc:

- Feedback mặc định lưu local.
- Organization-private-learning phải opt-in.
- Không dùng dữ liệu khách hàng để train model chung.
- Cho phép export và clear feedback.

## 6. Data privacy

AI QA có thể đọc dữ liệu nghiệp vụ nhạy cảm, nên cần data privacy mặc định nghiêm ngặt.

Nguyên tắc:

- Local-only là mặc định an toàn nhất.
- No-AI mode phải luôn khả dụng.
- Cloud-processing cần explicit consent.
- No-training phải là mặc định nếu dùng provider bên ngoài.
- Chỉ gửi context tối thiểu cần thiết.
- Mask/redact PII nếu có thể.
- Không log full sensitive data nếu không cần.
- Không gửi API key từ client nếu chưa có backend bảo mật.
- Audit log phải ghi provider mode, data mode, request id, timestamp và externalApiCalled.

Dữ liệu cần đặc biệt bảo vệ:

- Hồ sơ vay.
- Thông tin định danh khách hàng.
- Số tài khoản, số giấy tờ, số điện thoại, email.
- Chính sách tín dụng nội bộ.
- Rule phê duyệt.
- Risk/control nội bộ.
- SLA vận hành.
- Tài liệu upload chưa được phân loại.

## 7. MVP and future roadmap

### MVP

MVP nên giữ AI QA ở dạng scaffold/mock hoặc local-only:

- Rule QA vẫn là nguồn QA chính.
- AI QA service chỉ có mock function, không gọi API thật.
- AI QA types dùng `QARecommendation[]`.
- QA Panel dùng recommendation apply/feedback logging hiện có.
- Không thay đổi D01/D02 generators.
- Không gửi dữ liệu ra ngoài app.
- Có tài liệu rõ về provider mode và data mode.

Mục tiêu MVP là chuẩn bị kiến trúc đúng, không vội tích hợp provider.

### Future roadmap

Roadmap tương lai:

- Thêm AI QA provider adapter qua backend an toàn.
- Thêm prompt pack versioning.
- Thêm schema validation report cho AI QA output.
- Thêm AI QA review cho D01 BPMN XML.
- Thêm AI QA review cho D02 draw.io XML.
- Thêm template fit QA.
- Thêm comparison giữa Rule QA và AI QA.
- Thêm audit log UI.
- Thêm feedback analytics.
- Thêm organization-private-learning theo opt-in.
- Thêm policy engine để block cloud-processing với dữ liệu nhạy cảm.

AI QA nên phát triển theo hướng hỗ trợ người phân tích, không trở thành nguồn quyết định tự động cho process, control hoặc policy ngân hàng.
