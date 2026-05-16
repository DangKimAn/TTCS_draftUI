# Demo Script

## Preparation

```bash
cd backend
npm run prisma:generate
npm run prisma:migrate:dev
npm run seed
npm run start:dev
```

```bash
cd frontend
npm run dev
```

Open `http://localhost:5173`.

## Demo Accounts

Password: `password123`

| Persona | Email |
| --- | --- |
| Employee | `nv1@company.com` |
| Manager | `manager.kt@company.com` |
| HR/Admin | `hr@company.com` |

## Flow

1. Landing and login
   - Show landing page.
   - Login as employee.
   - Confirm redirect to employee dashboard.

2. Employee attendance
   - Open attendance area.
   - Click check-in.
   - Show today's working status.
   - Click check-out.
   - Show completed status and history row.

3. Employee timesheet
   - Open timesheet.
   - Show current month rows and warnings.
   - Submit timesheet when allowed.
   - Show submitted status.

4. Employee leave
   - Open leave page.
   - Show leave balance and leave types.
   - Submit annual leave request.
   - Show request in pending state.

5. Manager review
   - Logout and login as manager.
   - Confirm manager dashboard.
   - Review submitted timesheet.
   - Approve one item and reject one item with reason.
   - Review department leave request.

6. HR/Admin
   - Logout and login as `hr@company.com`.
   - Open HR dashboard.
   - Show user management.
   - Create or update a demo user.
   - Open leave type management.
   - Create/update a leave type.
   - Export payroll/timesheet CSV if sample data is present.

7. Notification
   - Return to employee or manager account.
   - Open notification dropdown.
   - Mark one notification as read.

## Closing

Show Swagger:

- `http://localhost:3000/api/docs`
- `http://localhost:3000/api/docs-json`

Show Prisma/Supabase tables:

- users
- roles
- departments
- monthly_timesheets
- timesheet_entries
- leave_applications
- notifications
- payrolls
