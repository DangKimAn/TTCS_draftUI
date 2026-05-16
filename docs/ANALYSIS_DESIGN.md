# Analysis And Design

## Goal

Refactor the existing project in place, keeping current screens and backend modules while moving to the target architecture:

- React 19 + Vite + TypeScript + Tailwind CSS.
- Zustand global state by domain.
- NestJS + Prisma + PostgreSQL/Supabase.
- Swagger/OpenAPI, JWT auth, explicit RBAC.
- Prisma schema and migrations as database source of truth.

## Frontend Architecture

`frontend/src/app` owns app wiring:

- `AppProviders.tsx`: global providers such as `BrowserRouter`.
- `AppRouter.tsx`: route tree and protected role routes.

`frontend/src/store` owns global client state:

- `authStore`: session, current user, role, login/logout/verify.
- `uiStore`: sidebar and notification UI state.
- `attendanceStore`: monthly attendance and check-in/out state.
- `timesheetStore`: personal period data and manager review state.
- `leaveStore`: leave requests, leave types and balance state.
- `hrStore`: HR users and leave type management state.
- `notificationStore`: notification list and unread count.

`frontend/src/services` remains the backend integration boundary. `apiClient.ts` centralizes:

- Axios base URL from `VITE_API_BASE_URL`.
- Bearer access token injection.
- Refresh-token retry on 401.
- Error/message normalization.

Existing CSS remains in place. Tailwind CSS is enabled through the Vite plugin and can be used incrementally without deleting legacy CSS.

## Backend Architecture

NestJS modules remain domain-oriented:

- auth, user, role, department
- attendance-module
- monthly-time-sheet
- leave-application, type-leave
- notification, warning, payroll

Global behavior:

- `ConfigModule` loads `.env`.
- `ValidationPipe` enforces DTO whitelisting.
- `ResponseEnvelopeInterceptor` wraps non-enveloped success payloads as `{ statusCode, message, data }`.
- Swagger UI is mounted at `/api/docs`; OpenAPI JSON at `/api/docs-json`.

## Auth And RBAC

JWT payload includes:

- `userID`
- `email`
- `username`
- `roleId`
- `role` / `roleName`
- `departmentID`

Permission semantics:

- `me`: route user target equals current user.
- `manager`: current user is manager role, or manager of target user's department.
- `managerOfDepartment`: current manager belongs to the target department.
- `admin`: current role is admin.

Frontend no longer infers role only from `roleId`; it prefers backend `role.nameRole`, `roleName`, or JWT role claims.

## Database Design

Prisma schema maps to PostgreSQL tables:

- `users`, `roles`, `departments`
- `monthly_timesheets`, `timesheet_entries`, `request_corrections`
- `leave_applications`, `type_leaves`
- `notifications`, `warnings`, `payrolls`

Important constraints:

- Unique user email and username.
- Unique role name.
- Unique department name.
- Unique monthly timesheet per `(userID, month, year)`.
- Restrict delete for historical/audit relations.
- Request corrections can target a monthly timesheet and optionally one timesheet entry, with proposed check-in/check-out timestamps. Pending corrections block monthly timesheet submission.

Prisma migration `20260515000000_postgresql_init` is the PostgreSQL baseline.

## Known Design Notes

- Backend role `admin` currently powers HR/admin screens. Frontend allows `admin` to enter HR dashboard.
- Legacy CSS and feature modules remain to avoid UI/workflow regression.
- Local SQLite `dev.db` is ignored and no longer part of the target database path.
