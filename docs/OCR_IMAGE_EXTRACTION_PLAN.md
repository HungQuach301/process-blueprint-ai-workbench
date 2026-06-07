# Kế hoạch OCR và Image Extraction

## 1. Vì sao OCR/image extraction là phase sau

OCR và image extraction nên được triển khai sau Excel, DOCX và PDF text-based extraction vì độ rủi ro và độ không chắc chắn cao hơn.

Các file Excel, DOCX và PDF có text layer thường cho dữ liệu có cấu trúc hoặc bán cấu trúc, dễ kiểm tra và dễ trace. Ngược lại, ảnh và PDF scan cần nhận diện ký tự từ pixel, dễ sai do chất lượng scan, font, bảng biểu, dấu tiếng Việt, chữ viết tay, watermark, con dấu, chữ mờ hoặc ảnh nghiêng.

Trong bối cảnh banking/enterprise, dữ liệu OCR sai có thể tạo ra Draft PTR sai actor, sai step, sai SLA hoặc sai control. Vì vậy OCR cần có governance, confidence score, preview rõ ràng và human review chặt hơn trước khi đi vào Draft Process Task Register.

## 2. Image types dự kiến hỗ trợ

Các định dạng ảnh nên được hỗ trợ theo thứ tự ưu tiên:

- `.png`
- `.jpg`
- `.jpeg`
- `.webp`
- `.tif`
- `.tiff`
- ảnh nhúng trong PDF scan ở phase sau

Ở MVP hiện tại, image files chỉ nên được chọn và lưu metadata local. OCR chưa nên chạy tự động.

## 3. Local OCR và Cloud OCR options

### Local OCR

Local OCR chạy trực tiếp trong browser hoặc local runtime.

Ưu điểm:

- Dữ liệu không rời khỏi máy người dùng.
- Phù hợp với nguyên tắc local-only và banking privacy.
- Không cần API key.
- Dễ giải thích với người dùng cá nhân hoặc tổ chức có yêu cầu bảo mật cao.

Hạn chế:

- Model OCR local có thể nặng.
- Chất lượng OCR tiếng Việt, bảng biểu, form scan có thể chưa ổn định.
- Tốc độ phụ thuộc thiết bị người dùng.
- Khó xử lý tài liệu phức tạp như bảng nhiều cột, checkbox, con dấu, chữ ký.

### Cloud OCR

Cloud OCR dùng provider server-side, ví dụ OCR service của cloud vendor hoặc document intelligence provider.

Ưu điểm:

- Chất lượng OCR thường tốt hơn.
- Có thể hỗ trợ layout, table, form field, checkbox và confidence score.
- Phù hợp với enterprise deployment nếu có hợp đồng, DPA và region control.

Hạn chế:

- Dữ liệu có thể rời khỏi môi trường local.
- Cần cấu hình provider, API key server-side, audit và consent.
- Cần kiểm soát data residency, retention, no-training và encryption.
- Không phù hợp nếu người dùng chưa bật cloud-processing hoặc chưa được tổ chức phê duyệt.

## 4. Banking data privacy considerations

OCR/image extraction có thể xử lý dữ liệu nhạy cảm như:

- Thông tin khách hàng.
- Hồ sơ vay, hồ sơ mở tài khoản, KYC/KYB.
- Số tài khoản, mã định danh, số điện thoại, email.
- Thông tin tài chính, hạn mức, điều kiện phê duyệt.
- Risk/control, SLA, quy trình nội bộ và cấu trúc vận hành.

Nguyên tắc bắt buộc:

- Không upload ảnh hoặc PDF scan ra ngoài nếu người dùng chưa bật cloud mode rõ ràng.
- Không lưu nội dung OCR nhạy cảm vào audit log.
- Audit chỉ nên ghi metadata: file name, file type, size, extraction mode, status, timestamp, provider nếu có.
- API key phải ở server-side, không đưa vào browser.
- Cloud OCR cần hiển thị notice trước khi gửi dữ liệu.
- OCR output phải đi qua preview và quality gate.
- Không auto-apply OCR output vào Process Task Register.
- User approval là bắt buộc trước Apply.

## 5. Future workflow

Workflow mục tiêu:

```text
image
  -> OCR
  -> extracted text
  -> draft PTR
  -> QA
  -> recommendation
  -> user apply
```

Chi tiết:

1. User chọn image hoặc PDF scan.
2. Hệ thống hiển thị privacy notice và extraction mode.
3. OCR chạy local hoặc cloud theo governance settings.
4. OCR tạo extracted text kèm confidence và warnings.
5. Extracted text được preview cho user.
6. Rule generator hoặc AI skill tạo Draft Process Task Register.
7. Draft PTR chạy schema validation và quality gate.
8. QA Engine phát hiện lỗi, thiếu field hoặc luồng chưa rõ.
9. Recommendation Engine đề xuất chỉnh sửa.
10. User review và apply thủ công.

## 6. Risks and limitations

Rủi ro chính:

- OCR sai ký tự, đặc biệt với tiếng Việt có dấu.
- Mất thứ tự dòng hoặc thứ tự cột trong bảng.
- Nhầm header, footer, watermark thành nội dung quy trình.
- Không đọc được chữ viết tay, con dấu hoặc ảnh mờ.
- Bỏ sót checkbox, trạng thái phê duyệt hoặc exception path.
- Tạo Draft PTR thiếu actor, system, input/output hoặc next step.
- Confidence thấp nhưng user vẫn apply nếu UI không cảnh báo đủ rõ.
- Cloud OCR có rủi ro data privacy nếu cấu hình sai.

Giới hạn cần ghi rõ trong UI:

- OCR không đảm bảo chính xác tuyệt đối.
- OCR output là draft, không phải source of truth.
- Process Task Register chỉ được cập nhật sau khi user apply.
- Với scan chất lượng thấp, user nên paste nội dung hoặc dùng Word/Excel nếu có.

## 7. Suggested implementation phases

### Phase 1: Local image metadata baseline

- Cho phép chọn image files.
- Lưu metadata local only.
- Hiển thị privacy note.
- Không OCR.

### Phase 2: Local OCR prototype

- Thử local OCR cho `.png`, `.jpg`, `.jpeg`.
- Hiển thị extracted text preview.
- Hiển thị confidence/warnings nếu engine hỗ trợ.
- Không auto-generate Draft PTR.

### Phase 3: OCR to Draft PTR

- Cho phép user tạo Draft PTR từ extracted text.
- Dùng rule/mock generator trước.
- Schema validation và quality gate bắt buộc.
- Draft preview trước Apply.

### Phase 4: Cloud OCR behind governance

- Chỉ bật khi `allowCloudAI` hoặc cloud-processing được cấu hình rõ.
- Provider call phải server-side.
- Không expose API key.
- Audit metadata cho mọi OCR action.
- Hiển thị consent notice trước khi gửi dữ liệu.

### Phase 5: Enterprise OCR controls

- Thêm provider settings theo organization.
- Thêm data residency, no-training, retention policy.
- Thêm confidence threshold.
- Thêm redaction hoặc sensitive-data masking nếu cần.
- Thêm review queue cho OCR output confidence thấp.

### Phase 6: Continuous QA and recommendation learning

- Dùng QA Engine để phát hiện thiếu field từ OCR.
- Recommendation Engine đề xuất bổ sung actor/system/data/next step.
- Feedback logging ghi nhận user accepted/rejected recommendation.
- Không dùng feedback để train ngoài môi trường tổ chức nếu chưa được phê duyệt.
