# WEBKINHDOANH_GROUP13

Dưới đây là hướng dẫn cài đặt và quy trình làm việc nhóm siêu tinh gọn.

---

## 1. Chuẩn bị phần mềm & Cài đặt

**Cài đặt các phần mềm bắt buộc (Chỉ làm 1 lần):**
- **Node.js**: Tải và cài đặt bản LTS từ trang chủ Node.js.
- **Git**: Tải và cài đặt Git (Trên Windows thì cài Git Bash).
- **Angular CLI**: Mở Terminal hoặc Git Bash và gõ lệnh `npm install -g @angular/cli` để cài môi trường Angular.
- **VS Code**: Trình soạn thảo chính thức của nhóm.

**Cấu hình Git cá nhân (Bắt buộc để hiện đúng tên người commit):**
Mở Git Bash hoặc Terminal gõ 2 lệnh sau:
```bash
git config --global user.name "Tên Thật Của Bạn"
git config --global user.email "email-dang-ky-github@example.com"
```

**Cài đặt tiện ích (Extensions) khuyên dùng cho VS Code:**
Mở tab Extensions trong VS Code (hoặc bấm `Ctrl + Shift + X`) và cài đặt:
- **Prettier - Code formatter**: Tự động căn lề code cho cả nhóm giống nhau (Bấm `Ctrl + S` là code tự đẹp).
- **ESLint**: Phát hiện và gạch chân đỏ các lỗi sai cú pháp.
- **GitLens**: Chỉ chuột vào 1 dòng code, bạn sẽ biết ngay ai viết dòng đó.
- **Live Server**: Rất cần thiết để chạy trực tiếp trang web tĩnh của thư mục `customer-web`.

**Tải code về máy:**
```bash
git clone <đường-link-github-của-dự-án>
```

**Cài đặt thư viện (Dependencies):**
Mở Terminal trong VS Code và chạy:
```bash
# 1. Cài cho Server
cd server
npm install

# 2. Quay lại thư mục gốc và cài cho Admin Web
cd ..
cd admin-web
npm install
```

---

## 2. Cách Khởi Chạy Dự Án (Chạy Code Hàng Ngày)

Dự án gồm 3 phần, bạn muốn làm phần nào thì mở Terminal và chạy phần đó (hoặc mở 3 Terminal để chạy cả 3 cùng lúc):

**1. Chạy Backend (Server):**
Mở một Terminal mới, chuyển vào thư mục server và chạy lệnh start:
```bash
cd server
npm start
```
*(Server sẽ bắt đầu chạy và kết nối Database)*

**2. Chạy Frontend (Admin Web):**
Mở một Terminal mới, chuyển vào thư mục admin-web và chạy:
```bash
cd admin-web
npm start
```
*(Web admin bằng Angular sẽ chạy tại địa chỉ: `http://localhost:4200`)*

**3. Chạy Frontend (Customer Web - Web tĩnh):**
- Trong trình soạn thảo VS Code, mở thư mục `customer-web`.
- Chuột phải vào file `index.html` và chọn **"Open with Live Server"**.
- Trình duyệt sẽ tự động bật lên hiển thị trang web của khách hàng.

---

## 3. Quy trình làm việc (Code & Đẩy code)

Chúng ta sử dụng nhánh **`develop`** làm nhánh chính. Để Code an toàn và gọn gàng, bạn chỉ cần làm theo 3 bước sau mỗi khi bắt đầu một việc mới:

### Bước 1: Tạo nhánh mới từ `develop`
Lấy code mới nhất và tạo một nhánh riêng của bạn:
```bash
git checkout develop
git pull origin develop
git checkout -b ten-nhanh-cua-ban
```

### Bước 2: Code và Lưu lại (Commit)
Sau khi code xong, lưu lại thay đổi của bạn:
```bash
git add .
git commit -m "ghi chú những gì bạn vừa làm"
```

### Bước 3: Đẩy code và Tạo Pull Request (PR)
Đầu tiên, đẩy nhánh của bạn từ máy tính lên Github:
```bash
git push origin ten-nhanh-cua-ban
```
Sau đó lên trang web Github của dự án để tạo PR (Yêu cầu gộp code):
1. Github sẽ tự động hiện một thông báo màu vàng, bấm nút **"Compare & pull request"**.
2. Kiểm tra xem đã đúng chiều gộp chưa: **base** là `develop`, **compare** là nhánh của bạn.
3. Ghi tiêu đề ngắn gọn (ví dụ: *Hoàn thành giao diện admin*).
4. Nhìn sang cột bên phải (phần **Reviewers**), chọn 1 người trong nhóm (nhóm trưởng hoặc người chịu trách nhiệm check code) để họ duyệt.
5. Bấm nút xanh **"Create pull request"**.

Xong! Người Reviewer sẽ vào xem. Nếu code tốt, họ bấm **Merge pull request** để gộp tính năng của bạn vào nhánh `develop`.

---
**Tóm tắt 1 dòng siêu gọn:**
`git checkout develop` -> `git pull` -> `git checkout -b nhanh-moi` -> (Code) -> `git add .` -> `git commit -m "xong tính năng A"` -> `git push origin nhanh-moi` -> (Lên Github tạo PR).