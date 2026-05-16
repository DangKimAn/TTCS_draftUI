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
```

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
cd backend && npm run build
cd backend && npm test -- --runInBand
cd backend && npm run prisma:generate
cd backend && npm run prisma:migrate:dev
cd backend && npm run seed
```

Nếu migration/seed fail với `P1001` hoặc schema engine error, kiểm tra PostgreSQL/Supabase URL, IP allowlist, password, pooler/direct port và SSL setting.
