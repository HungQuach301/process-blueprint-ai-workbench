# AI Architecture Design

## 1. Product AI vision

Process Blueprint AI Workbench định hướng trở thành một AI workbench cho phân tích, chuẩn hóa, kiểm tra và sinh artifact quy trình doanh nghiệp. AI không thay thế người phân tích nghiệp vụ, mà đóng vai trò trợ lý có kiểm soát: gợi ý, phát hiện thiếu sót, chuẩn hóa cấu trúc và tăng tốc tạo tài liệu.

Nguyên tắc cốt lõi:

- Process Task Register là nguồn sự thật chính cho D01 BPMN, D02 Service Blueprint, QA Report, JSON export và ZIP package.
- AI chỉ được phép tạo hoặc đề xuất thay đổi dựa trên dữ liệu có cấu trúc, template đã chọn và policy hiện hành.
- Mọi thay đổi quan trọng cần có preview, lý do, affected fields và trạng thái phê duyệt rõ ràng.
- Với dữ liệu ngân hàng/doanh nghiệp, mặc định ưu tiên local-only, deterministic, no-training và human approval.

## 2. AI scopes

### Auto-generate

AI có thể hỗ trợ tạo dữ liệu khởi đầu cho Process Task Register từ brief, workshop note, transcript, SOP hoặc file nghiệp vụ. Output không nên đi thẳng vào D01/D02 generator nếu chưa qua validation. Luồng an toàn là:

1. Input brief hoặc tài liệu nghiệp vụ.
2. AI trích xuất thành draft ProcessTask.
3. Schema validation.
4. QA rule check.
5. Người dùng review và approve.
6. Lưu vào Process Task Register.

### QA

AI QA bổ sung cho rule-based QA engine. Rule-based QA xử lý các lỗi deterministic như missing actor, invalid next step, missing gateway branch. AI QA có thể phát hiện các vấn đề mềm hơn:

- Task name có nhiều hành động.
- Thiếu actor/system nhưng có thể suy luận từ ngữ cảnh.
- SLA hoặc risk/control chưa đủ rõ.
- Phân rã process chưa phù hợp.
- D02 row assignment có vẻ không đúng theo journey.

AI QA không được tự sửa dữ liệu nhạy cảm nếu chưa có preview và approval.

### Recommendation

Recommendation Engine tạo gợi ý sửa trực tiếp cho Process Task Register. Mỗi recommendation cần có:

- Recommendation id.
- Source.
- Issue code.
- Confidence.
- Risk level.
- Preview.
- Operations có cấu trúc.
- Affected stepIds.
- Warnings nếu có.

Các recommendation an toàn có thể được batch apply sau khi người dùng xác nhận. Recommendation thay đổi graph như split task, create task, update connection hoặc gateway branch phải được xem là rủi ro cao hơn và không chọn mặc định.

### Template review

AI có thể review template profile để đánh giá:

- Template phù hợp với output type nào.
- Template phù hợp với process type, business domain, organization type nào.
- D01/D02 rules có thiếu field bắt buộc không.
- D02 row rules có đủ layer service blueprint không.
- BPMN template có phù hợp với notation standard không.

Template review không thay đổi generator. Nó chỉ đưa ra nhận xét và recommendation để người dùng cập nhật TemplateProfile.

### Future BRD/URD/Jira/capability/UI generation

Trong tương lai, cùng một Process Task Register có thể là nguồn cho nhiều artifact:

- BRD: business requirement, scope, actor, control, exception, SLA.
- URD: user requirement, role, screen/action expectation, input/output.
- Jira: epic, story, acceptance criteria, dependency.
- Capability map: business capability, supporting system, process coverage.
- UI flow: screen flow, form field, validation rule, role-based action.

Các artifact này phải trace được về `ProcessTask.stepId`, template profile và version dữ liệu tại thời điểm generate.

## 3. Model provider modes

### Product AI

Product AI là chế độ nhà sản phẩm cung cấp sẵn model/provider. Chế độ này phù hợp với trial, SMB hoặc dữ liệu không nhạy cảm. Cần có policy rõ về retention, no-training option và dữ liệu nào được gửi đi.

### BYOK

BYOK cho phép khách hàng cấu hình API key riêng. Product chỉ điều phối prompt, schema, validation và UI approval. Billing/model access thuộc về khách hàng. Đây là chế độ phù hợp cho tổ chức muốn kiểm soát chi phí và quyền truy cập provider.

### Enterprise provider

Enterprise provider dùng endpoint do tổ chức cấp, ví dụ private cloud, Azure OpenAI, on-prem gateway hoặc model platform nội bộ. Chế độ này cần hỗ trợ:

- Endpoint riêng.
- Auth riêng.
- Network allowlist.
- Audit theo tenant.
- Data processing agreement.

### Local-only mode

Local-only mode không gửi dữ liệu ra ngoài máy hoặc môi trường local của tổ chức. AI có thể bị tắt hoàn toàn, hoặc dùng model local nếu tổ chức cài đặt. Các feature deterministic như rule-based QA, generator, export vẫn hoạt động.

### No-AI mode

No-AI mode tắt toàn bộ tính năng gọi model. Ứng dụng vẫn hoạt động như một process modeling workbench:

- Process Task Register.
- Template Library.
- Rule-based QA.
- D01/D02 deterministic generation.
- Export Center.

No-AI mode quan trọng cho ngân hàng, audit, demo nội bộ hoặc môi trường chưa được phê duyệt AI.

## 4. Data modes

### Local only

Dữ liệu chỉ lưu trong browser localStorage hoặc storage nội bộ được tổ chức kiểm soát. Không có request ra provider AI. Đây là baseline an toàn nhất.

### Cloud-processing

Dữ liệu được gửi tới provider để xử lý AI. Cần explicit consent, masking nếu có thể, audit log, retention policy và thông tin provider rõ ràng.

### No-training

Provider không được dùng dữ liệu khách hàng để train model chung. Đây nên là mặc định cho dữ liệu doanh nghiệp/ngân hàng.

### Organization-private-learning

Dữ liệu feedback và approval có thể được dùng để cải thiện recommendation riêng cho một tổ chức hoặc tenant. Không trộn dữ liệu giữa các tổ chức. Cần cơ chế opt-in, export, delete và governance.

## 5. AI Orchestration Engine

AI Orchestration Engine là lớp điều phối giữa UI, dữ liệu có cấu trúc, rule engine, prompt pack, model provider và validation.

Vai trò:

- Nhận request từ UI.
- Xác định task type: generate, QA, recommend, template review.
- Chọn provider mode và data mode.
- Chuẩn bị context tối thiểu cần thiết.
- Áp dụng prompt pack phù hợp.
- Gọi model nếu được phép.
- Validate output bằng schema.
- Tạo preview và recommendation operations.
- Ghi audit log.
- Chờ human approval trước khi apply.

Orchestration Engine không nên ghi trực tiếp vào Process Task Register nếu chưa qua approval workflow.

## 6. Skill/Agent concept

Skill là một gói năng lực có phạm vi rõ, ví dụ:

- Process extraction skill.
- BPMN QA skill.
- Service blueprint QA skill.
- Recommendation skill.
- Template review skill.
- Jira story generation skill.

Agent là thực thể điều phối một hoặc nhiều skill để hoàn thành một workflow. Agent cần có boundary rõ:

- Input được phép đọc.
- Output được phép tạo.
- Tool được phép gọi.
- Dữ liệu có được gửi ra ngoài không.
- Có cần human approval không.

Với banking workflow, agent nên hoạt động theo nguyên tắc least privilege.

## 7. Prompt pack

Prompt pack là tập prompt versioned cho từng AI scope. Mỗi prompt nên có:

- Id và version.
- Mục tiêu.
- Input schema.
- Output schema.
- Policy constraints.
- Few-shot examples nếu cần.
- Redaction/masking instruction.
- Refusal hoặc fallback behavior.

Prompt pack cần được quản lý như artifact sản phẩm, có changelog và test case. Khi prompt thay đổi, output cần được so sánh trên sample data để tránh regression.

## 8. Schema validation

Mọi output AI phải qua schema validation trước khi hiển thị hoặc apply.

Ví dụ schema:

- `ProcessTask[]` cho auto-generate.
- `QaIssue[]` hoặc structured QA finding cho AI QA.
- `QARecommendation[]` cho recommendation.
- `TemplateProfile` patch cho template review.
- BRD/URD/Jira structured sections cho future generation.

Validation cần kiểm tra:

- Required fields.
- Enum value.
- StepId uniqueness.
- Next step references.
- Operation type.
- Risk level.
- Confidence.
- Unsupported fields.

Nếu validation fail, output không được apply và phải hiển thị lỗi reviewable cho người dùng.

## 9. Human approval workflow

AI output cần đi qua workflow phê duyệt:

1. Draft: AI tạo đề xuất.
2. Preview: hiển thị thay đổi field, affected stepIds, warning và conflict.
3. Review: người dùng chọn accept, reject hoặc edit.
4. Apply: chỉ apply operation đã được xác nhận.
5. Persist: lưu vào localStorage hoặc backend.
6. Re-run QA: chạy lại QA sau thay đổi.
7. Mark stale: D01/D02/export artifact được đánh dấu stale nếu source data thay đổi.

Approval workflow giúp đảm bảo traceability và giảm rủi ro thay đổi ngầm.

## 10. Audit log

Audit log cần ghi lại các sự kiện quan trọng:

- AI request được tạo.
- Provider mode và data mode.
- Prompt pack id/version.
- Input metadata, tránh log full sensitive content nếu không cần.
- Output validation result.
- Recommendation accepted/rejected/skipped.
- User id hoặc session id nếu có.
- Timestamp.
- Affected stepIds.
- Artifact generated/downloaded.

Audit log nên hỗ trợ export để phục vụ kiểm toán nội bộ, model governance và phân tích chất lượng recommendation.

## 11. Banking policy considerations

Với ngân hàng và tổ chức tài chính, cần xem xét:

- Không gửi dữ liệu khách hàng, hồ sơ vay, thông tin định danh hoặc dữ liệu nội bộ ra provider nếu chưa được phê duyệt.
- Mặc định no-training với mọi cloud-processing.
- Có masking/redaction cho PII, account number, tax id, phone, email, document id.
- Có tenant isolation nếu dùng organization-private-learning.
- Có human approval cho recommendation thay đổi process graph, SLA, risk/control hoặc decision logic.
- Có audit trail cho mọi AI-assisted change.
- Không để AI tự quyết policy, credit decision hoặc control requirement.
- AI output phải nêu assumption khi thiếu dữ liệu.
- Có khả năng tắt AI hoàn toàn bằng No-AI mode.

## 12. Future commercialization readiness

Để sẵn sàng thương mại hóa, kiến trúc AI cần hỗ trợ:

- Multi-tenant configuration.
- Feature flags theo plan hoặc tenant.
- Provider abstraction.
- BYOK và enterprise endpoint.
- Usage metering.
- Prompt/version governance.
- Audit export.
- Data retention policy.
- Role-based access control.
- Local-only/no-AI deployment.
- Organization-private-learning opt-in.
- Template marketplace hoặc template catalog theo domain.

Điểm quan trọng là không khóa sản phẩm vào một model provider duy nhất.

## 13. Training Recommendation Engine và Template Recommendation Engine độc lập

Recommendation Engine và Template Recommendation Engine nên được train hoặc cải thiện độc lập vì chúng học từ tín hiệu khác nhau.

### Recommendation Engine

Recommendation Engine tập trung vào Process Task Register và QA issue.

Training/learning signal:

- Recommendation accepted/rejected/skipped.
- Conflict reason.
- Final applied operations.
- Affected stepIds.
- Before/after field values nếu được phép lưu.
- Issue code.
- Risk level và confidence calibration.

Mục tiêu học:

- Gợi ý field patch chính xác hơn.
- Suy luận actor/system/lane tốt hơn.
- Chọn safe recommendation tốt hơn.
- Giảm recommendation bị reject hoặc conflict.
- Ước lượng risk/confidence chính xác hơn.

### Template Recommendation Engine

Template Recommendation Engine tập trung vào TemplateProfile, template metadata và độ phù hợp với process/domain.

Training/learning signal:

- Template được chọn cho D01/D02.
- Template classification metadata.
- Artifact generation success/failure.
- User edits trong template rules.
- Domain/process type.
- QA issue còn lại sau khi dùng template.
- User rating hoặc review của template nếu có.

Mục tiêu học:

- Đề xuất template phù hợp theo business domain, process type và output type.
- Phát hiện template thiếu rule.
- Gợi ý mapping row/lane/card style.
- Xếp hạng template theo chất lượng artifact.
- Cá nhân hóa template catalog theo tổ chức.

Hai engine có thể dùng chung audit/feedback infrastructure, nhưng dataset, feature set và evaluation metric nên tách riêng. Điều này giúp recommendation sửa process không bị trộn với recommendation chọn template, giảm rủi ro học sai và dễ governance hơn.
