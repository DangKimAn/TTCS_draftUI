# Manual Smoke Checklist

Date: 2026-05-17

Manual UI smoke was prepared but not marked PASS in this code pass because no browser-driven manual session was executed. Automated backend E2E did run against the guarded disposable PostgreSQL test DB after `npm run prisma:migrate:deploy:test` and `npm run seed:test`. Run the checklist below with `VITE_ENABLE_MOCK_FALLBACK=false`, backend started from the same safe test/demo environment, and screenshots or API snippets captured into `docs/MANUAL_EVIDENCE.md`.

| UC | Workflow | Status | Reason / Evidence |
| --- | --- | --- | --- |
| UC-01 | Login/role redirect | READY | Account: `nv1@company.com`, `manager.kt@company.com`, `hr@company.com`; UI path `/login`; expected redirect by role. |
| UC-02 | Check-in/check-out | READY | Account: `nv1@company.com`; UI section employee attendance; endpoints `POST /attendance-module/checkIn/:userID`, `POST /attendance-module/checkOut/:userID`. |
| UC-03 | Confirm/submit timesheet | READY | Account: `nv1@company.com`; UI section employee timesheet; endpoint `PATCH /time-sheet/submitMonthlyTimesheet/:monthlyTimesheetID`. |
| UC-04 | Submit leave request | READY | Account: `nv1@company.com`; UI section leave request; endpoint `POST /leave-application/:userID`; inactive leave types must not be selectable. |
| UC-05 | View leave balance/history | READY | Account: `nv1@company.com`; UI section leave balance; endpoints `GET /leave-application/balance/:userID`, `GET /leave-application/my/:userID`. |
| UC-06 | Manager approve/reject timesheet | READY | Account: `manager.kt@company.com`; manager dashboard timesheets; endpoint `PATCH /time-sheet/reviewMonthlyTimesheet/:monthlyTimesheetID`. |
| UC-07 | Manager approve/reject leave | READY | Account: `manager.kt@company.com`; manager leave approvals; endpoint `PATCH /leave-application/review/:leaveApplicationID`. |
| UC-08 | Export payroll | READY | Account: `hr@company.com`; HR reports payroll; endpoints `GET /payroll/export?format=json/csv`, `GET /payroll/export-excel`. Empty period must show empty state. |
| UC-09 | Export timesheet | READY | Account: `hr@company.com`; HR reports timesheet; endpoint `GET /time-sheet/report`; frontend PDF generated from real report payload. |
| UC-10 | Manage leave types | READY | Account: `hr@company.com`; HR policies; endpoints `POST/PATCH /type-leave`, `DELETE /type-leave/:id` soft-deactivates, `PATCH /type-leave/:id/activate` reactivates. |
| UC-11 | Create user account | READY | Account: `hr@company.com`; HR employees; endpoint `POST /user/`; verify no public self-registration. |
| UC-12 | Deactivate/activate user | READY | Account: `hr@company.com`; HR employees; endpoints `PATCH /user/deactivate/:id`, `PATCH /user/activate/:id`; self-deactivate remains blocked. |

## Pass Criteria

- `frontend/.env` must set `VITE_ENABLE_MOCK_FALLBACK=false`.
- No UI path may use `mockData`, `mockProfile`, or localStorage profile fallback to hide API errors.
- SMTP/Google/Microsoft checks are blocked until local credentials are provided through env files or deployment secrets.
- Record screenshots or API response snippets in `docs/MANUAL_EVIDENCE.md` after each UC is actually run.
