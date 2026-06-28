---
description: Đóng một slice — stage, duyệt diff, commit, merge --no-ff vào master, push, verify. Từng bước cần người xác nhận.
---
Bạn đang chạy quy trình đóng slice. **Không bỏ bước nào. Không tự ý commit/merge/push mà chưa được xác nhận.**

---

## Bước 1 — Tình trạng hiện tại (thông tin, không cần xác nhận)

Chạy và HIỂN THỊ toàn bộ output của:
```
git branch --show-current
git status --short
```

Nếu không đang trên nhánh `slice/*`, cảnh báo người dùng và dừng: đây là quy trình đóng slice, không phải nhánh thường.

---

## Bước 2 — Stage toàn bộ để duyệt (DỪNG để người duyệt)

Chạy:
```
git add -A
git status
git diff --cached --stat
```

Hiển thị toàn bộ output (kể cả file mới untracked đã được stage). Sau đó **DỪNG** và hỏi:

> "Staged content ở trên có đúng không? Có file nào bị thừa/thiếu không? (yes để tiếp tục, no để abort)"

Nếu người nói **no** hoặc cần chỉnh: chạy `git reset HEAD` để unstage, hướng dẫn người dùng điều chỉnh, rồi quay lại bước 2.

---

## Bước 3 — Commit (DỪNG để lấy message)

Hỏi người dùng:

> "Nhập commit message (ngắn gọn, tiếng Anh):"

Sau khi có message, chạy:
```
git commit -m "<message từ người dùng>"
```

Hiển thị commit hash và một dòng summary. **DỪNG** và xác nhận:

> "Commit xong: <hash> — <message>. Tiếp tục merge vào master không? (yes/no)"

---

## Bước 4 — Merge vào master và push

Lưu tên nhánh slice hiện tại vào biến (dùng output của bước 1). Chạy tuần tự:

```
git checkout master
git pull --ff-only
git merge --no-ff <slice-branch>
git push
```

- Nếu `git pull --ff-only` fail (master diverged): báo lỗi, DỪNG, đừng tiếp tục merge. Hướng dẫn người dùng giải quyết divergence thủ công.
- Nếu merge có conflict: hiển thị conflict list, DỪNG, đừng tiếp tục. Người dùng giải quyết thủ công.
- Nếu push bị hook chặn (exit 1): hiển thị toàn bộ lỗi hook, DỪNG.

Hiển thị output của từng lệnh.

---

## Bước 5 — Verify hậu-merge (bắt buộc, không bỏ qua)

Chạy và hiển thị toàn bộ raw output của:
```
npm run typecheck
npm run test:normalizer
```

Nếu bất kỳ lệnh nào fail: hiển thị lỗi rõ ràng, đánh dấu **VERIFY FAILED** và hướng dẫn người dùng fix trên master (hoặc revert merge) trước khi tiếp tục.

Nếu cả hai pass: hiển thị **VERIFY PASSED**.

---

## Bước 6 — Kiểm tra nhánh slice còn sót

Chạy:
```
git branch --no-merged master | grep slice/
```

Nếu có kết quả: hiển thị danh sách và cảnh báo:

> "Còn các nhánh slice chưa merge vào master. Kiểm tra xem có cần xử lý không."

Nếu không có: không cần thông báo gì thêm.

---

## Kết thúc

Tóm tắt ngắn: nhánh đã merge, commit hash, verify status, và danh sách nhánh slice còn lại (nếu có).
