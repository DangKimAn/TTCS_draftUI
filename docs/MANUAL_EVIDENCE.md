# Manual Evidence

Date: 2026-05-17

## Automated Evidence

| Check | Result | Notes |
| --- | --- | --- |
| `cd backend && npx prisma validate` | PASS | Prisma schema is valid. This command loaded `backend/.env` but did not mutate DB. |
| `cd backend && npm test -- --runInBand` | PASS | 3 suites, 34 tests passed after adding RBAC, payroll, TypeLeave activation/deactivation, profile and email metadata coverage. |
| `cd frontend && npm test` | PASS | 4 files, 14 tests passed after adding profile mock-fallback gate coverage. |
| `cd backend && npm run build` | PASS | NestJS build completed. |
| `cd frontend && npm run build` | PASS | TypeScript + Vite production build completed. |
| `cd backend && npm run lint:check` | PASS | 0 errors, 0 warnings after formatting backend TypeScript changes. |
| `cd backend && npm run prisma:generate` | PASS | Prisma Client generated successfully. |
| `cd backend && npm run prisma:migrate:deploy:test` | PASS | Ran against guarded `backend/.env.test` target: PostgreSQL database `postgres`, schema `test`, host `aws-1-ap-southeast-2.pooler.supabase.com`. Final rerun reported no pending migrations. |
| `cd backend && npm run seed:test` | PASS | Seeded disposable test DB: 7 users, 6 monthly timesheets. First sandbox run hit Prisma TLS `P1011`; rerun with approved external execution succeeded. |
| `cd backend && npm run test:e2e -- --runInBand` | PASS | 3 suites, 4 E2E tests passed against `.env.test`. |
| `cd backend && npm run seed` | NOT RUN | Not needed for this pass; destructive/demo seed should not run without explicit confirmation of target DB. |

## Manual Smoke Evidence

No browser-driven manual UI smoke workflow was executed in this pass, so no UC is marked PASS from manual observation. The workspace now has a confirmed guarded disposable test DB for backend E2E. All 12 UI UCs are prepared as `READY` in `docs/SMOKE_CHECKLIST.md` and should be run with `VITE_ENABLE_MOCK_FALLBACK=false`.

## API & External Services Status

- E2E test startup requires `backend/.env.test` or `.env.test.local`, `E2E_DATABASE_GUARD=test`, and DB URL/schema/host containing `test`, `testing`, `e2e`, or `ci`.
- Added `npm run prisma:migrate:deploy:test` and `npm run seed:test` so Prisma migration/seed can be run with `.env.test` instead of accidentally using `.env`.
- Frontend profile update now calls `PATCH /api/user/me` when `VITE_ENABLE_MOCK_FALLBACK=false`; localStorage/mock write remains limited to mock fallback mode.
- `PATCH /api/user/me` allows only `linkAvatar`, `phone`, `address`, `emergencyContact`, and `birthday`.
- `DELETE /api/type-leave/:id` soft-deactivates leave types, `PATCH /api/type-leave/:id/activate` restores them, and inactive leave types are rejected for new leave applications.
- Payroll export handles empty periods, validates month/year in service, warns on large synchronous exports, and documents external payroll integration as not configured.
- Leave creation returns a warning payload when the requested leave dates overlap existing timesheet entries.
- Email service supports `EMAIL_PROVIDER=log` and `EMAIL_PROVIDER=smtp`; SMTP failures are logged and returned as delivery metadata without rolling back business operations.
- Google/Microsoft SSO must be configured via env values. Placeholder `your-*` values are treated as not configured.

## Remaining Blockers

1. Start backend/frontend with `VITE_ENABLE_MOCK_FALLBACK=false` and execute the 12 manual UI smoke UCs from `docs/SMOKE_CHECKLIST.md`.
2. Provide SMTP, Google, and Microsoft credentials in local env files or deployment secrets if those external flows must be verified.
3. Configure a real external payroll provider if payroll handoff beyond CSV/Excel/JSON is required.
