# Test Plan

## Automated Checks

Run from `frontend/`:

```bash
npm run build
```

Run from `backend/`:

```bash
npm run build
npm test -- --runInBand
npm run prisma:generate
npx prisma validate
npm run prisma:migrate:dev
npm run seed
```

Expected:

- Frontend TypeScript and Vite build pass.
- Backend Nest build pass.
- Jest unit tests pass.
- Prisma generate/validate pass.
- Migrate/seed pass when `DATABASE_URL` and `DIRECT_URL` point to a reachable PostgreSQL/Supabase database.

## Manual Smoke Test

Use seeded accounts, password `password123`.

1. Login and role redirect
   - `nv1@company.com` redirects to employee dashboard.
   - `manager.kt@company.com` redirects to manager dashboard.
   - `hr@company.com` redirects to HR dashboard.
   - Unauthorized role/page combinations redirect to `/unauthorized`.

2. Attendance
   - Employee check-in creates/updates today's timesheet entry.
   - Check-out closes today's entry.
   - Attendance history shows current month entries.
   - Duplicate check-in/out surfaces normalized error.

3. Timesheet
   - Employee opens monthly timesheet.
   - Employee submits a complete timesheet.
   - Manager sees submitted department timesheet.
   - Manager approves and rejects with reason.
   - Employee sees approved/rejected status and notification.

4. Leave
   - Employee views leave balance.
   - Employee creates leave request.
   - Manager views department leave requests.
   - Manager approves/rejects request.
   - Leave balance changes after approval.

5. HR/Admin
   - HR opens user management.
   - HR creates/updates/deactivates user.
   - HR manages leave types.
   - HR exports payroll/timesheet CSV.

6. Notification
   - Notification dropdown loads received notifications.
   - Unread count displays.
   - Mark as read updates count.

## Regression Areas

- Token refresh after access token expiry.
- RBAC for manager vs managerOfDepartment.
- CSV routes using `@Res` should not be wrapped as JSON.
- Supabase pooled URL for runtime vs direct URL for migrations.
