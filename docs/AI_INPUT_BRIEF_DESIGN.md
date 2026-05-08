# AI Input Brief Design

## 1. Structured input form

AI Input Brief là điểm nhập dữ liệu ban đầu để tạo draft Process Task Register. Mục tiêu là giúp người dùng mô tả quy trình nghiệp vụ bằng form có cấu trúc trước khi hệ thống trích xuất thành `ProcessTask[]`.

Form nên hỗ trợ các nhóm thông tin sau:

- Thông tin workspace: tên quy trình, mô tả, phạm vi, phòng ban, domain nghiệp vụ.
- Mục tiêu quy trình: outcome mong muốn, trigger bắt đầu, trạng thái kết thúc.
- Actor và vai trò: customer, RM, ops, approver, system, external provider.
- Hệ thống liên quan: LOS, portal, OCR, notification service, document store, external data provider.
- Dữ liệu và chứng từ: input, output, data object, source reference.
- SLA và control: thời gian xử lý, rủi ro, kiểm soát, quy định cần tuân thủ.
- Exception: reject, pause, supplement, manual review, missing document.
- Template preference: D01 BPMN template, D02 Service Blueprint template, output type.

Form có cấu trúc giúp AI giảm suy đoán, tạo draft rõ nguồn và dễ QA hơn so với prompt tự do.

## 2. Supported uploads

Upload là nguồn bổ sung cho structured input form. File upload không nên ghi trực tiếp vào Process Task Register. Mọi nội dung trích xuất phải đi qua draft, QA và human review.

### PDF

PDF phù hợp cho SOP, policy, process manual, BRD hoặc scan tài liệu. Với PDF scan, cần OCR trước khi extraction.

Thông tin có thể trích xuất:

- Step nghiệp vụ.
- Actor/system.
- Input/output.
- Rule và exception.
- SLA, risk/control.

### DOCX

DOCX phù hợp cho BRD, URD, process note, workshop minutes hoặc tài liệu mô tả nghiệp vụ.

Thông tin có thể trích xuất:

- Heading thành phase/group.
- Bullet list thành task.
- Table thành field mapping.
- Decision section thành gateway candidate.

### XLSX

XLSX phù hợp cho process inventory, RACI, task register cũ hoặc control matrix.

Thông tin có thể trích xuất:

- Mỗi row thành draft ProcessTask.
- Column mapping vào actor, system, input, output, SLA, risk/control.
- Sheet mapping theo phase hoặc subprocess.

### Image

Image phù hợp cho whiteboard, screenshot, process sketch hoặc diagram. Image cần OCR/vision extraction nếu dùng AI provider hỗ trợ.

Thông tin có thể trích xuất:

- Box thành task/event/gateway candidate.
- Arrow thành next step candidate.
- Swimlane label thành actor/system lane.
- Text note thành comment hoặc assumption.

## 3. Extraction workflow

Luồng chuẩn:

```text
input/upload -> extraction -> draft PTR -> QA -> recommendations -> human review -> apply
```

Chi tiết:

1. Người dùng nhập form hoặc upload file.
2. Extraction engine đọc input và tạo draft `ProcessTask[]`.
3. Draft Process Task Register được hiển thị trong chế độ review, chưa thay thế dữ liệu chính.
4. Rule-based QA chạy trên draft để phát hiện lỗi rõ ràng.
5. Recommendation Engine tạo gợi ý sửa draft.
6. Người dùng review từng thay đổi hoặc batch recommendation an toàn.
7. Khi approve, draft mới được apply vào Process Task Register chính.
8. D01/D02/export artifact được đánh dấu stale để generate lại từ nguồn mới.

Nguyên tắc: AI chỉ tạo draft và recommendation. Người dùng quyết định apply.

## 4. Draft Process Task Register schema

Draft PTR nên dùng cùng schema với `ProcessTask` để giữ một nguồn sự thật duy nhất.

Các field chính:

- `id`: định danh nội bộ của row.
- `stepId`: mã bước nghiệp vụ, phải unique.
- `parentStepId`: liên kết subprocess nếu có.
- `rowType`: phase, group, task, gateway, start, end, event, data, annotation.
- `bpmnType`: startEvent, endEvent, userTask, serviceTask, sendTask, exclusiveGateway, dataObject, dataStore, none.
- `taskNature`: manual, automatic, semiAutomatic, system, decision, approval, integration, notification, control, data.
- `phase`: giai đoạn quy trình.
- `group`: nhóm hoặc journey step.
- `actor`: người/vai trò thực hiện.
- `actorLane`: lane nghiệp vụ.
- `system`: hệ thống/app hỗ trợ.
- `systemLane`: lane hệ thống.
- `dataObject`: dữ liệu/chứng từ.
- `dataAction`: create, read, update, delete, pull, push, store, validate, approve, reject, send, receive.
- `taskName`: tên bước.
- `input`: đầu vào.
- `output`: đầu ra.
- `defaultNextStep`: bước tiếp theo mặc định.
- `conditionQuestion`: câu hỏi điều kiện cho gateway.
- `yesNextStep`: nhánh Yes.
- `noNextStep`: nhánh No.
- `exception`: tình huống ngoại lệ.
- `exceptionHandling`: cách xử lý ngoại lệ.
- `sla`: cam kết thời gian.
- `riskControl`: rủi ro/kiểm soát.
- `sourceRef`: nguồn trích xuất.
- `reviewStatus`: draft, needsReview, approved, rejected.
- `comment`: ghi chú và assumption.
- `customerInteractionType`: layer cho D02 Service Blueprint.
- `channel`: kênh tương tác.

Draft nên lưu thêm metadata ngoài schema nếu cần, ví dụ confidence hoặc extraction source, nhưng không được tạo nguồn process thứ hai thay thế ProcessTask.

## 5. Review-before-apply

Review-before-apply là bắt buộc cho AI Input Brief.

UI nên hiển thị:

- Draft row mới, row thay đổi và row bị xung đột.
- Field-level diff giữa current PTR và draft PTR.
- Issue count từ QA.
- Recommendation preview.
- Affected stepIds.
- Warning về dữ liệu thiếu hoặc assumption.
- Nút approve/apply theo từng row hoặc batch.
- Nút reject/skip có reason.

Các trường hợp cần human review bắt buộc:

- AI tạo gateway hoặc thay đổi next step.
- AI tạo task mới từ upload không rõ nguồn.
- AI suy luận actor/system từ ngữ cảnh.
- AI thay đổi SLA, risk/control hoặc decision logic.
- AI xử lý dữ liệu khách hàng hoặc thông tin nhạy cảm.

## 6. Local/BYOK modes

### Local-only mode

Local-only mode không gửi input, file upload hoặc draft Process Task Register ra ngoài máy. Chế độ này có thể dùng:

- Parser local cho XLSX.
- Text extraction local nếu có thư viện phù hợp.
- Rule-based QA.
- Mock AI service scaffold.
- Manual review và deterministic generators.

Nếu không có model local, AI extraction có thể bị tắt nhưng form và upload preview vẫn hoạt động.

### BYOK mode

BYOK cho phép tổ chức dùng API key riêng để gọi provider được phê duyệt. Ứng dụng chỉ điều phối:

- Prompt pack.
- Schema validation.
- Preview.
- Human approval.
- Audit log.

BYOK cần có cảnh báo rõ rằng dữ liệu sẽ được gửi tới provider do người dùng/tổ chức cấu hình. Không lưu API key trong client nếu chưa có thiết kế bảo mật phù hợp.

### No-AI mode

No-AI mode vẫn cho phép người dùng nhập structured form, upload file để tham chiếu, và tự tạo Process Task Register thủ công. Rule-based QA, D01/D02 generation và export vẫn hoạt động.

## 7. Banking policy considerations

Với dữ liệu ngân hàng, mặc định thiết kế phải thận trọng:

- Không gửi hồ sơ vay, thông tin khách hàng, dữ liệu định danh, số tài khoản, số điện thoại, email hoặc tài liệu nội bộ ra provider nếu chưa được phê duyệt.
- Mọi cloud-processing phải có consent rõ ràng.
- Mặc định no-training cho provider AI.
- Cần masking/redaction cho PII trước khi gửi ra ngoài nếu được phép xử lý cloud.
- File upload có thể chứa dữ liệu nhạy cảm, nên cần cảnh báo data mode trước khi extraction.
- Audit log phải ghi provider mode, data mode, timestamp, file metadata và hành động apply/reject.
- Draft từ AI phải có `reviewStatus = needsReview` nếu có suy luận quan trọng.
- Không để AI tự quyết định credit policy, approval rule hoặc control requirement.
- Cho phép tổ chức tắt AI hoàn toàn bằng No-AI mode.

## 8. MVP and future roadmap

### MVP

MVP nên tập trung vào luồng an toàn và kiểm soát được:

- Structured input form.
- Upload placeholder/metadata, chưa cần full extraction cho mọi file.
- Mock AI input brief extraction service, không gọi API thật.
- Draft PTR preview.
- Rule-based QA trên draft.
- Recommendation apply qua human confirmation.
- LocalStorage persistence.
- Export/import JSON.
- Data mode indicator: Local-only, BYOK, No-AI.

### Future roadmap

Các bước tiếp theo:

- PDF text extraction.
- DOCX extraction.
- XLSX mapping wizard.
- Image OCR/diagram extraction.
- BYOK provider integration qua backend an toàn.
- Prompt pack versioning.
- Schema validation report.
- Draft/current PTR diff viewer.
- Audit log export.
- Organization-private-learning cho accepted/rejected recommendation nếu khách hàng opt-in.
- BRD/URD/Jira/capability/UI generation từ approved Process Task Register.

Roadmap nên giữ nguyên nguyên tắc: extract vào draft trước, QA trước, recommendation trước, human review trước, rồi mới apply vào Process Task Register chính.
