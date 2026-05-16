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
| POST | `/auth/register` | Public/current demo | Creates employee user. HR user creation should prefer `/user`. |

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
| PATCH | `/user/:userID` | admin |
| PATCH | `/user/deactivate/:userID` | admin |
| PATCH | `/user/activate/:userID` | admin |
| DELETE | `/user/:userID` | admin |
| GET | `/department` | admin |
| GET | `/department/byID/:departmentID` | admin, managerOfDepartment |
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
| GET | `/time-sheet/export-department/:departmentID?month=&year=&format=csv` | managerOfDepartment, admin |

### Request Correction

| Method | Path | Permission |
| --- | --- | --- |
| POST | `/request-correction/:userID` | me |
| GET | `/request-correction/my/:userID` | me |
| GET | `/request-correction/department/:departmentID?status=pending` | managerOfDepartment, admin |
| PATCH | `/request-correction/review/:requestCorrectionID` | manager, admin |

Correction review accepts body `{ "status": "approved" | "rejected", "reasonReject"?: string }`. Reject requires `reasonReject`. Approved corrections update the referenced timesheet entry when proposed check-in/check-out values are present.

### Leave

| Method | Path | Permission |
| --- | --- | --- |
| POST | `/leave-application/:userID` | me |
| GET | `/leave-application/balance/:userID` | me, manager, admin |
| GET | `/leave-application/my/:userID` | me |
| GET | `/leave-application/department/:departmentID` | managerOfDepartment |
| GET | `/leave-application/all` | admin |
| PATCH | `/leave-application/review/:leaveApplicationID` | manager of sender department |
| GET | `/type-leave` | me, manager, admin |
| POST | `/type-leave` | admin |
| PATCH | `/type-leave/:typeLeaveID` | admin |
| DELETE | `/type-leave/:typeLeaveID` | admin |

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
| GET | `/payroll/export?month=&year=&format=csv` | admin |
