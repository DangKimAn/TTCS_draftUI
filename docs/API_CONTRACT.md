# API Contract

Base URL: `/api`

All JSON success responses use:

```json
{
  "statusCode": 200,
  "message": "success",
  "data": {}
}
```

Errors use NestJS HTTP status codes and include at least `statusCode` and `message`.

## Auth

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| POST | `/auth/login` | Public | Body: `email` or `username`, `password`. Returns `accessToken`, `refreshToken`, `user.role/nameRole`. |
| POST | `/auth/refreshToken/:userID` | Public token body | Body: `refreshToken`. Rotates both tokens. |
| POST | `/auth/logout` | Bearer | Clears stored refresh token. |
| GET | `/auth/google` | Public | Starts Google OAuth redirect. |
| GET | `/auth/google/callback` | Public OAuth callback | Finds an existing active user by Google email, then returns JWT/refresh token. |
| GET | `/auth/microsoft` | Public | Starts Microsoft OAuth redirect when Microsoft env vars are configured. |
| GET | `/auth/microsoft/callback` | Public OAuth callback | Exchanges authorization code, finds an existing active user by Microsoft email, then redirects to frontend `/auth/callback` with JWT/refresh token in the URL fragment. |

`/auth/register` is not exposed for public self-registration. HR/Admin account creation must use `POST /user/`.

Personal profile self-update is exposed through `PATCH /user/me` for the current JWT user only. The whitelist is limited to `linkAvatar`, `phone`, `address`, `emergencyContact`, and `birthday`; role, email, salary, leave balance, department and active status remain HR/Admin-only through `PATCH /user/:userID`.

Microsoft SSO requires `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `MICROSOFT_TENANT_ID`, `MICROSOFT_CALLBACK_URL`, `SSO_SUCCESS_REDIRECT_URL`, and `SSO_ERROR_REDIRECT_URL`. Credentials must stay in env files or deployment secrets.

## RBAC Roles

Canonical roles: `employee`, `manager`, `hr`, `admin`.

Backend role records currently use `admin` for HR/admin screens. Frontend maps backend `admin` to HR dashboard when needed.

Monthly timesheet status values are canonical: `draft`, `submitted`, `approved`, `rejected`. Legacy `accepted` must not be written by new backend code.

Permission names:

| Permission | Meaning |
| --- | --- |
| `me` | Current JWT user matches route user target. |
| `manager` | Current user has manager role, or manages the target user's department. |
| `managerOfDepartment` | Current manager belongs to the target department. |
| `admin` | Current role is `admin`. |

## Core Endpoints

### User, Role, Department

| Method | Path | Permission |
| --- | --- | --- |
| GET | `/user/` | admin |
| GET | `/user/getByID/:userID` | admin, manager, me |
| GET | `/user/getByDepartment/:departmentID` | admin, managerOfDepartment |
| POST | `/user/` | admin |
| PATCH | `/user/me` | authenticated current user |
| PATCH | `/user/:userID` | admin |
| PATCH | `/user/deactivate/:userID` | admin |
| PATCH | `/user/activate/:userID` | admin |
| DELETE | `/user/:userID` | admin |
| GET | `/department` | admin |
| GET | `/department/byID/:departmentID` | admin, managerOfDepartment |
| GET | `/department/byDepartmentName/:departmentName` | admin |
| POST | `/department` | admin |
| PATCH | `/department/:departmentID` | admin |
| DELETE | `/department/:departmentID` | admin |

### Attendance

| Method | Path | Permission |
| --- | --- | --- |
| POST | `/attendance-module/checkIn/:userID` | me |
| POST | `/attendance-module/checkOut/:userID` | me |
| GET | `/attendance-module/getAllAttendenceOfMonth/:userID?month=&year=` | me |
| GET | `/attendance-module/AllEmployeeNotCheckOutOfToday` | admin |

### Monthly Timesheet

| Method | Path | Permission |
| --- | --- | --- |
| GET | `/time-sheet/monthlyTimesheet/:userID?month=&year=` | me |
| POST | `/time-sheet/monthlyTimesheet/:userID` | me |
| PATCH | `/time-sheet/submitMonthlyTimesheet/:monthlyTimesheetID` | owner |
| PATCH | `/time-sheet/reviewMonthlyTimesheet/:monthlyTimesheetID` | manager reviewer |
| GET | `/time-sheet/export/:userID?month=&year=&format=csv` | me |
| GET | `/time-sheet/export-excel/:userID?month=&year=` | me |
| GET | `/time-sheet/report?fromDate=&toDate=&employeeId=&departmentId=&status=` | manager, admin |
| GET | `/time-sheet/export-department/:departmentID?month=&year=&format=csv` | managerOfDepartment, admin |
| GET | `/time-sheet/export-department-excel/:departmentID?month=&year=` | managerOfDepartment, admin |

Timesheet report returns `{ filters, rows, summary }`. `rows` include employee/department, date, check-in/out, hours, status, warnings. `summary` includes total records, employees, hours, status counts, missing checkout and warning counts.

Timesheet CSV/Excel exports remain monthly endpoints. PDF export is implemented in frontend from the real report payload using the browser print-to-PDF flow, so no backend PDF dependency is required.

### Request Correction

| Method | Path | Permission |
| --- | --- | --- |
| POST | `/request-correction/:userID` | me |
| GET | `/request-correction/my/:userID` | me |
| GET | `/request-correction/department/:departmentID?status=pending` | managerOfDepartment, admin |
| PATCH | `/request-correction/review/:requestCorrectionID` | manager, admin |

Correction review accepts body `{ "status": "approved" | "rejected", "reasonReject"?: string }`. Reject requires `reasonReject`. Approved corrections update the referenced timesheet entry when proposed check-in/check-out values are present.

### Leave

`POST /leave-application/:userID` may return `data.warnings[]` with `code=LEAVE_WORKLOG_CONFLICT` when the requested leave date range overlaps existing timesheet entries. The request is still created; reviewers should resolve the work-log/leave conflict manually.

| Method | Path | Permission |
| --- | --- | --- |
| POST | `/leave-application/:userID` | me |
| GET | `/leave-application/balance/:userID` | me, manager, admin |
| GET | `/leave-application/my/:userID` | me |
| GET | `/leave-application/department/:departmentID` | managerOfDepartment |
| GET | `/leave-application/all` | admin |
| PATCH | `/leave-application/review/:leaveApplicationID` | manager of sender department |
| GET | `/type-leave?includeInactive=true` | me, manager, admin |
| POST | `/type-leave` | admin |
| PATCH | `/type-leave/:typeLeaveID` | admin |
| PATCH | `/type-leave/:typeLeaveID/activate` | admin |
| PATCH | `/type-leave/:typeLeaveID/deactivate` | admin |
| DELETE | `/type-leave/:typeLeaveID` | admin; soft-deactivates, does not delete history |

Employee-facing `GET /type-leave` returns active leave types by default. HR screens call `includeInactive=true` to show both active and inactive records. Creating a leave request with an inactive `typeLeaveID` is rejected.

### Notification, Warning, Payroll

| Method | Path | Permission |
| --- | --- | --- |
| GET | `/notification/received/:userID` | me |
| GET | `/notification/sent/:userID` | me |
| PATCH | `/notification/read/:notificationID` | owner |
| GET | `/notification/unread-count/:userID` | me |
| POST | `/warning` | admin |
| GET | `/payroll/user/:userID` | me |
| GET | `/payroll/department/:departmentID` | managerOfDepartment, admin |
| POST | `/payroll/generate/:monthlyTimesheetID` | admin |
| GET | `/payroll/export?month=&year=&format=json` | admin |
| GET | `/payroll/export?month=&year=&format=csv` | admin |
| GET | `/payroll/export-excel?month=&year=` | admin |

Payroll export validates month/year at service and DTO level. Empty periods return an empty CSV/Excel/JSON export with a clear message instead of fabricated payroll rows. JSON export includes `meta.count`, `meta.warnings`, and `meta.externalIntegration="not_configured"`. External payroll system integration is not implemented yet; the backend contains only an exporter contract/stub so this is not represented as a live integration.
