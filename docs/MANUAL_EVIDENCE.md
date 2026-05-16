# Manual Evidence

Date: 2026-05-16

## Automated Evidence

| Check | Result | Notes |
| --- | --- | --- |
| `cd backend && npm run test:e2e -- --runInBand` | PASS | Tất cả 4 bài test E2E đã vượt qua, bao gồm flow `request-correction`. |
| `cd backend && npm run lint:check` | PARTIAL | Build/Test pass. Còn nợ lint (> 300 lỗi) nhưng không gây lỗi build. |
| `cd backend && npm run build` | PASS | Build NestJS thành công 100%. |
| `cd backend && npm test -- --runInBand` | PASS | Tất cả 19 bài test (Unit/Business rules) đã vượt qua. |
| `cd backend && npm run prisma:generate` | PASS | Prisma Client v5.22.0 đã được generate thành công. |
| `cd backend && npx prisma validate` | PASS | PostgreSQL schema hợp lệ. |
| `cd frontend && npm test` | PASS | Đã thêm và chạy thành công test cho ProtectedRoute (Vitest). |
| `cd frontend && npm run build` | PASS | Build Vite thành công. |

## Manual Workflow Evidence

Quy trình kiểm tra thủ công chưa hoàn tất do chưa có kết nối trực tiếp đến PostgreSQL/Supabase.

Dùng danh sách này sau khi cấu hình biến môi trường thật:

| Workflow | Evidence To Capture | Status |
| --- | --- | --- |
| Login employee | Screenshot of employee dashboard after login | Pending DB |
| Role redirect | Employee/manager/admin được điều hướng đúng dashboard | Pending DB |
| Check-in/out | Bản ghi chấm công trước và sau khi check-out | Pending DB |
| Timesheet view | Danh sách các dòng bảng công tháng hiện tại | Pending DB |
| Submit/review timesheet | Trạng thái Submitted sau đó Approved/Rejected | Pending DB |
| Leave create/review | Đơn nghỉ phép Pending sau đó Approved/Rejected | Pending DB |
| HR user management | Tạo/Cập nhật/Vô hiệu hóa demo user | Pending DB |
| HR leave type | Tạo/Cập nhật loại nghỉ phép | Pending DB |
| Notification | Số lượng chưa đọc và hành vi đánh dấu đã đọc | Pending DB |

## API & External Services Status

Dự án hiện tại đang ở trạng thái tích hợp một phần và mock có kiểm soát. Cụ thể:

- **Frontend API Integration**: 
  - `HRDashboard.tsx` đã tích hợp API thật cho Users, Departments, Leave Types.
  - Hỗ trợ biến môi trường `VITE_ENABLE_MOCK_FALLBACK` để kiểm soát việc dùng dữ liệu mẫu khi API lỗi.
- **SSO (Google Login)**: 
  - Đã hoàn thiện flow production tối thiểu trong backend: Nhận profile -> Tìm user theo email -> Kiểm tra Active -> Sinh JWT & Refresh Token.
  - Yêu cầu cấu hình `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` trong `.env`.
- **Email Service**: 
  - Đã tích hợp SMTP Provider (Nodemailer). 
  - Hỗ trợ cấu hình qua các biến `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` trong `.env`.
  - Mặc định fallback về `log` provider (no-op) nếu chưa cấu hình.
- **Payroll System**: 
  - Đã thêm abstraction `IPayrollExporter`. Hiện tại hỗ trợ xuất CSV.
  - Cấu trúc đã sẵn sàng để tích hợp thêm các hệ thống bên thứ 3 trong tương lai.

## Environment Blocker

Hiện tại môi trường local chưa có PostgreSQL chạy tại port 5432. 

Để hoàn tất xác minh thủ công:

1. Điền URL Supabase vào `backend/.env` (`DATABASE_URL` và `DIRECT_URL`).
2. Chạy:

```bash
cd backend
npm run prisma:migrate:deploy
npm run seed
npm run start:dev
```

3. Chạy frontend:

```bash
cd frontend
npm run dev
```
