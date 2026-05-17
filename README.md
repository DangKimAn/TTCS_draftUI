# Timesheet Pro

Timesheet Pro là hệ thống chấm công, bảng công tháng, nghỉ phép, thông báo, cảnh báo và payroll cho doanh nghiệp.

## Stack

| Layer | Công nghệ |
| --- | --- |
| Frontend | React 19, Vite 8, TypeScript, Tailwind CSS, Zustand, React Router |
| Backend | NestJS, TypeScript, Prisma ORM, Swagger/OpenAPI, JWT auth, RBAC |
| Database | PostgreSQL/Supabase, Prisma migrations |

## Cấu trúc chính

```text
TTCS_draftUI/
  frontend/
    src/
      app/          App providers và router
      store/        Zustand stores theo domain
      services/     API client, refresh token, service mapping
      pages/        Màn hình landing/login/dashboard/attendance/timesheet/leave/HR
      components/   UI components hiện có
      styles/       CSS cũ được giữ trong quá trình chuyển sang Tailwind
  backend/
    src/          NestJS modules theo domain
    prisma/       schema.prisma và migrations PostgreSQL
  docs/           API contract, design, test plan, demo evidence
```

## Supabase/PostgreSQL setup

1. Tạo Supabase project và lấy connection strings:
   - `DATABASE_URL`: pooled URL cho runtime.
   - `DIRECT_URL`: direct URL cho Prisma migrate.
2. Tạo `backend/.env` từ `backend/.env.example`.
3. Đặt các biến bắt buộc:

```env
DATABASE_URL=postgresql://postgres:[PASSWORD]@[PROJECT-REF].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&schema=public
DIRECT_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?schema=public
JWT_ACCESS_SECRET=change-me
JWT_REFRESH_SECRET=change-me-too
CORS_ORIGIN=http://localhost:5173
```

## Cài đặt và chạy

```bash
cd frontend
npm install
npm run build
npm run dev
```

```bash
cd backend
npm install
npm run prisma:generate
npm run prisma:migrate:dev
npm run seed
npm run start:dev
```

Frontend mặc định gọi API tại `http://localhost:3000/api`. Có thể override bằng `.env`:

```env
VITE_API_BASE_URL=http://localhost:3000/api
VITE_ENABLE_MOCK_FALLBACK=false
```

`VITE_ENABLE_MOCK_FALLBACK` mặc định nên để `false` cho demo thật/production. Khi không bật flag này, frontend không tự fallback sang dữ liệu mock và Vite mock API plugin không được đăng ký.

## Swagger/OpenAPI

Khi backend đang chạy:

- Swagger UI: `http://localhost:3000/api/docs`
- OpenAPI JSON: `http://localhost:3000/api/docs-json`

## Demo accounts

Sau khi chạy `cd backend && npm run seed`, các tài khoản demo dùng chung password `password123`:

| Role | Email |
| --- | --- |
| HR/Admin | `hr@company.com` |
| Manager | `manager.kt@company.com` |
| Employee | `nv1@company.com` |
| Employee | `nv2@company.com` |

## Verification

```bash
cd frontend && npm run build
cd frontend && npm test
cd backend && npm run build
cd backend && npm test -- --runInBand
cd backend && npm run prisma:generate
```

E2E/migration/seed must use a disposable test DB:

```bash
cd backend && npm run prisma:migrate:deploy:test
cd backend && npm run seed:test
cd backend && npm run test:e2e -- --runInBand
```

Do not run E2E, migrate, or seed against production/demo data. If `backend/.env.test` is missing, skip E2E and document the blocker.

Chi tiết setup local, migration, seed, test DB và demo an toàn: [docs/LOCAL_SETUP.md](docs/LOCAL_SETUP.md).

Manual smoke checklist 12 UC: [docs/SMOKE_CHECKLIST.md](docs/SMOKE_CHECKLIST.md).

## SSO & Email Setup (Optional)

Hệ thống hỗ trợ Google Login, Microsoft SSO và thông báo qua Email. Frontend Google SSO chuyển hướng tới `GET /api/auth/google`; callback backend là `GET /api/auth/google/callback`. Microsoft SSO chuyển hướng tới `GET /api/auth/microsoft`; callback backend là `GET /api/auth/microsoft/callback` và trả token về frontend route `/auth/callback`.

Tài khoản nhân viên do HR/Admin tạo qua `POST /api/user/`. Không expose public `/auth/register` cho self-service registration.
Nhân viên chỉ được tự cập nhật profile cá nhân qua `PATCH /api/user/me` với whitelist `linkAvatar`, `phone`, `address`, `emergencyContact`, `birthday`; các field HR như role, department, salary, leave balance và active status vẫn chỉ dành cho HR/Admin.

Nếu muốn dùng thật, hãy cập nhật `backend/.env`:

```env
# SSO
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback

MICROSOFT_CLIENT_ID=your-microsoft-client-id
MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret
MICROSOFT_TENANT_ID=your-tenant-id
MICROSOFT_CALLBACK_URL=http://localhost:3000/api/auth/microsoft/callback
MICROSOFT_SCOPES=openid profile email User.Read
SSO_SUCCESS_REDIRECT_URL=http://localhost:5173/auth/callback
SSO_ERROR_REDIRECT_URL=http://localhost:5173/auth/callback

# EMAIL
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM="HRM System" <your-email@gmail.com>
```

Nếu `EMAIL_PROVIDER=smtp` nhưng SMTP lỗi, nghiệp vụ nghỉ phép/bảng công vẫn tiếp tục; lỗi gửi mail được log và trả về dưới dạng metadata nội bộ. Nếu SSO dùng placeholder `your-*`, hệ thống coi như chưa cấu hình.

Nếu migration/seed fail với `P1001` hoặc schema engine error, kiểm tra PostgreSQL/Supabase URL, IP allowlist, password, pooler/direct port và SSL setting.

Payroll export hiện hỗ trợ JSON/CSV/Excel trong hệ thống. Chưa có external payroll provider thật; backend chỉ có contract/stub `not_configured` để phạm vi tích hợp không bị hiểu nhầm.
