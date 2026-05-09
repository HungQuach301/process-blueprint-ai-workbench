# AI Input Brief Design

## 1. Mục tiêu

AI Input Brief là điểm nhập đầu vào để người dùng mô tả một quy trình nghiệp vụ trước khi hệ thống tạo Draft Process Task Register.

Mục tiêu hiện tại:

- Giúp người dùng nhập brief nhanh, rõ, ít trường.
- Chuyển brief thành draft `ProcessTask[]`.
- Luôn đi qua Draft -> Preview -> QA -> User Apply.
- Không tạo nguồn quy trình thứ hai ngoài Process Task Register.
- Chuẩn bị boundary cho skill AI tương lai `input-brief-to-ptr`.

Trong phase hiện tại, AI Input Brief vẫn là local/mock workflow. Không gọi external AI API.

## 2. Simplified Visible Form

MVP form chỉ hiển thị 7 section chính.

| Internal key | UI label VI | UI label EN | Bắt buộc |
| --- | --- | --- | --- |
| `processInfo` | Thông tin quy trình | Process information | Có |
| `businessObjective` | Mục tiêu nghiệp vụ | Business objective | Có |
| `scope` | Phạm vi | Scope | Có |
| `startEnd` | Điểm bắt đầu / kết thúc | Start-End point | Có |
| `actors` | Người tham gia / Actor | Actors | Có |
| `relatedSystems` | Hệ thống liên quan | Related systems | Không bắt buộc |
| `dataDocuments` | Dữ liệu / hồ sơ / chứng từ | Data and documents | Không bắt buộc |

Các field nâng cao chưa hiển thị trong simple mode, nhưng có thể giữ optional trong model để tránh migration risk.

## 3. Bilingual UX

Thiết kế UI cần sẵn sàng cho tiếng Việt và tiếng Anh.

Nguyên tắc:

- UI labels, helper texts, placeholders và buttons dùng i18n dictionaries.
- Internal keys giữ tiếng Anh và canonical, ví dụ `processInfo`, `businessObjective`, `relatedSystems`.
- BPMN enum values giữ canonical, ví dụ `startEvent`, `userTask`, `serviceTask`, `sendTask`, `endEvent`.
- Stored Process Task Register data không được dịch enum theo UI language.
- Output language có thể hỗ trợ `vi`, `en`, hoặc `bilingual` trong phase sau.

Người dùng có thể nhập brief bằng tiếng Việt hoặc tiếng Anh. Generator/mock hiện tại có thể dùng current UI locale làm language preference, nhưng schema và enum vẫn phải ổn định.

## 4. Draft-First Workflow

Luồng chuẩn:

```text
brief -> draft PTR -> preview -> QA -> user apply
```

Chi tiết:

1. Người dùng nhập 7 section trong Input Brief.
2. Hệ thống tạo Draft Process Task Register.
3. Draft được preview trước, chưa ghi vào PTR chính.
4. QA chạy trên dữ liệu draft hoặc sau khi apply tùy phase runtime.
5. Người dùng review assumptions, open questions, field values và next-step sequence.
6. Người dùng chọn Replace current PTR hoặc Append to current PTR.
7. Sau khi apply, Process Task Register là source of truth mới.
8. D01/D02/export artifacts được đánh dấu stale/not generated để generate lại.

AI hoặc mock generator không được auto-apply.

## 5. Draft Process Task Register Output

Draft output nên gồm:

- `draftProcessTasks`: mảng `ProcessTask[]`.
- `assumptions`: các giả định khi thông tin chưa đủ.
- `openQuestions`: câu hỏi cần người dùng xác nhận.
- `sourceSummary`: tóm tắt brief đầu vào.
- `confidence`: `low`, `medium`, hoặc `high`.

Các row draft nên có:

- `stepId`
- `rowType`
- `bpmnType`
- `taskNature`
- `phase`
- `actor`
- `actorLane`
- `system`
- `systemLane`
- `taskName`
- `input`
- `output`
- `defaultNextStep`
- `reviewStatus = needsReview`
- `customerInteractionType` nếu suy luận được
- `channel` nếu suy luận được

Draft phải tạo connected flow cơ bản, tối thiểu gồm start event, một hoặc nhiều task, và end event.

## 6. Future AI Skill

Skill tương lai:

```text
id: input-brief-to-ptr
version: 0.1.0
category: transformation
```

Skill boundary:

- Input: `StructuredProcessBrief`.
- Output: Draft Process Task Register.
- Không apply trực tiếp vào PTR chính.
- Không gọi tool ngoài nếu data mode không cho phép.
- Luôn trả metadata review: assumptions, openQuestions, sourceSummary, confidence.
- Human approval required.

Skill có thể chạy theo nhiều mode:

- Local/mock rule-based.
- Product AI.
- BYOK.
- Enterprise provider.
- Local model.
- No-AI fallback.

## 7. Quality Gates

AI Input Brief workflow cần nhiều lớp kiểm soát trước khi người dùng apply.

### Pre-validation

Kiểm tra trước khi generate draft:

- Brief có tối thiểu process information.
- Có mục tiêu nghiệp vụ hoặc scope.
- Có start/end hoặc đủ mô tả để suy luận.
- Actors không rỗng nếu người dùng biết.
- Cảnh báo nếu optional systems/data bị thiếu.

### Schema validation

Kiểm tra output có đúng shape:

- `ProcessTask[]` hợp lệ.
- `stepId` unique.
- `rowType`, `bpmnType`, `taskNature`, `dataAction`, `reviewStatus` dùng enum canonical.
- `defaultNextStep`, `yesNextStep`, `noNextStep` là string hoặc null.

### Semantic validation

Kiểm tra ý nghĩa nghiệp vụ:

- Có start event và end event.
- Task có actor hoặc system hợp lý.
- Service task nên có system.
- Data interaction nên có data object.
- Send task/notification nên có channel hoặc system gửi.

### Consistency check

Kiểm tra tính nhất quán của flow:

- Không có duplicate `stepId`.
- `defaultNextStep` trỏ đến step tồn tại.
- Không có orphan task.
- Gateway nếu có phải có nhánh rõ.
- Row `needsReview` khi có suy luận hoặc assumption.

Nếu quality gate fail, hệ thống không nên apply silent. Người dùng cần thấy lỗi hoặc warning rõ.

## 8. Local/BYOK/Enterprise Considerations

### Local-only

Local-only là mặc định an toàn cho MVP.

- Không gửi brief, file, hoặc draft PTR ra ngoài máy.
- Có thể dùng mock/rule-based generator.
- File upload nếu có chỉ lưu local metadata hoặc preview.
- Phù hợp khi dữ liệu có thể chứa thông tin ngân hàng/doanh nghiệp nhạy cảm.

### BYOK

BYOK cho phép tổ chức dùng provider/API key riêng.

Yêu cầu:

- Cần backend bảo mật trước khi lưu hoặc gọi API key thật.
- UI phải cảnh báo dữ liệu có thể được gửi tới provider do tổ chức cấu hình.
- Data mode nên mặc định là no-training.
- Prompt, schema validation, preview và approval vẫn do product điều phối.

### Enterprise Provider

Enterprise provider phù hợp cho ngân hàng hoặc tổ chức lớn.

Yêu cầu:

- Tenant isolation.
- Audit log đầy đủ.
- Data residency và retention policy.
- Redaction/masking cho PII nếu cần.
- Chính sách không dùng dữ liệu khách hàng để train nếu chưa có opt-in.

### No-AI Mode

No-AI mode vẫn phải dùng được:

- Người dùng nhập brief thủ công.
- Hệ thống có thể dùng rule-based/mock draft hoặc cho user tự nhập PTR.
- QA, D01/D02 generation và export vẫn hoạt động từ Process Task Register.

## 9. Future Advanced Mode

Simple mode chỉ có 7 section. Advanced mode có thể mở thêm khi người dùng cần mô tả sâu hơn.

Các section tương lai:

- Happy path.
- Exception path.
- SLA/control.
- Risk/control.
- Desired outputs.
- Upload files.

Supported uploads tương lai:

- PDF: SOP, policy, BRD, scan tài liệu.
- DOCX: BRD, URD, process note, workshop minutes.
- XLSX: process inventory, RACI, task register cũ, control matrix.
- Image: whiteboard, screenshot, sketch, diagram.

File extraction vẫn phải đi qua Draft -> Preview -> QA -> User Apply. Upload không được ghi trực tiếp vào Process Task Register.

## 10. Banking Policy Considerations

Với dữ liệu ngân hàng/doanh nghiệp:

- Không gửi hồ sơ vay, thông tin khách hàng, định danh, số tài khoản, số điện thoại, email hoặc tài liệu nội bộ ra provider nếu chưa được phê duyệt.
- Cloud-processing phải có consent rõ.
- Mặc định no-training cho provider AI.
- Cần masking/redaction trước khi gửi ra ngoài nếu được phép.
- Audit log nên ghi provider mode, data mode, timestamp, action apply/reject.
- AI không được tự quyết định credit policy, approval rule hoặc control requirement.
- Mọi row suy luận quan trọng phải `reviewStatus = needsReview`.

## 11. Roadmap

MVP hiện tại:

- 7-section structured brief.
- i18n-ready labels/helper texts.
- Local/mock Draft PTR generation.
- Draft preview with assumptions/open questions.
- Replace/Append apply with confirmation.
- Stale marking for D01/D02 after apply.

Next:

- Strong schema validation report.
- Draft QA before apply.
- Diff viewer between current PTR and draft PTR.
- Prompt pack runtime for `input-brief-to-ptr`.
- Provider/data mode enforcement.
- PDF/DOCX/XLSX/Image extraction in advanced mode.
- BYOK/enterprise integration through a secure backend.
