# Local Setup, Migration, Seed, Smoke Test

## 1. Environment

Backend:

```bash
cd backend
cp .env.example .env
```

Required for normal local/demo mode:

```env
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
JWT_ACCESS_SECRET=change-me
JWT_REFRESH_SECRET=change-me-too
CORS_ORIGIN=http://localhost:5173
EMAIL_PROVIDER=log
SKIP_AUTO_SEED=false
```

Frontend:

```bash
cd frontend
cp .env.example .env
```

Use real API mode by default:

```env
VITE_API_BASE_URL=http://localhost:3000/api
VITE_ENABLE_MOCK_FALLBACK=false
```

Only set `VITE_ENABLE_MOCK_FALLBACK=true` for offline UI development. Do not use it for main demo verification.

## 2. Install And Build

```bash
cd backend
npm install
npx prisma validate
npm run prisma:generate
npm run build
npm test -- --runInBand
```

```bash
cd frontend
npm install
npm test
npm run build
```

## 3. Migration And Seed

Use `DIRECT_URL` for migrations. Do not run migrations against a production database unless the migration history is already baselined.

```bash
cd backend
npm run prisma:migrate:dev
npm run seed
```

Seeded demo accounts use password `password123`:

| Role | Email |
| --- | --- |
| HR/Admin | `hr@company.com` |
| Manager | `manager.kt@company.com` |
| Employee | `nv1@company.com` |
| Employee | `nv2@company.com` |

## 4. SSO And SMTP

Google SSO redirect URI:

```text
http://localhost:3000/api/auth/google/callback
```

Backend env values:

```env
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback
```

Placeholder values such as `your-google-client-id` are treated as not configured.

Create an Azure App Registration and configure this redirect URI:

```text
http://localhost:3000/api/auth/microsoft/callback
```

Then set backend env values:

```env
MICROSOFT_CLIENT_ID=...
MICROSOFT_CLIENT_SECRET=...
MICROSOFT_TENANT_ID=...
MICROSOFT_CALLBACK_URL=http://localhost:3000/api/auth/microsoft/callback
MICROSOFT_SCOPES=openid profile email User.Read
SSO_SUCCESS_REDIRECT_URL=http://localhost:5173/auth/callback
SSO_ERROR_REDIRECT_URL=http://localhost:5173/auth/callback
```

The Microsoft account email must already exist as an active user in the app. The app does not auto-create users from SSO.

SMTP is optional. Without SMTP credentials, keep `EMAIL_PROVIDER=log`.

```env
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM="HRM System" <no-reply@example.com>
```

SMTP failures are logged and returned as email delivery metadata. They must not rollback leave/timesheet business updates.

## 5. Test DB And E2E

E2E tests are guarded and require a disposable database. Copy the example and edit it:

```bash
cd backend
cp .env.test.example .env.test
```

The test database URL, schema, or host must contain `test` or `e2e`, and `E2E_DATABASE_GUARD=test` must be set.
For remote PostgreSQL/Supabase test databases, include `sslmode=require` when needed. The E2E setup guard also appends `sslmode=require` at runtime for non-local URLs that do not already specify an SSL mode.

```bash
cd backend
npm exec prisma validate
npm run prisma:generate
npm run prisma:migrate:deploy:test
npm run seed:test
npm run test:e2e -- --runInBand
```

`npm run prisma:migrate:deploy:test` and `npm run seed:test` load `.env.test` through `backend/test/setup-e2e-env.ts`. Do not use plain `npm run prisma:migrate:deploy` or `npm run seed` for E2E unless your shell has already exported the test DB env values.

Do not point `.env.test` at demo, staging, or production data. If `backend/.env.test` is missing, skip migration/seed/E2E and record the blocker in `docs/MANUAL_EVIDENCE.md`.

CI uses the same guarded scripts. Backend E2E should run only when `vars.ENABLE_E2E=true` and `TEST_DATABASE_URL`/`TEST_DIRECT_URL` secrets point to a disposable database whose host, database name, or schema contains `test`, `testing`, `e2e`, or `ci`.

## 6. Safe Demo

Terminal 1:

```bash
cd backend
npm run start:dev
```

Terminal 2:

```bash
cd frontend
npm run dev
```

Open `http://localhost:5173`. Keep `VITE_ENABLE_MOCK_FALLBACK=false` when verifying real API behavior. Payroll preview reads generated payroll records from `GET /api/payroll/export?format=json`; if no payroll exists for the selected month/year, the UI must show an empty state instead of fabricated totals.
