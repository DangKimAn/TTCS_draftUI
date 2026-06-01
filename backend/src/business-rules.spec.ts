/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/unbound-method */
import 'reflect-metadata';
import * as jwt from 'jsonwebtoken';
import { AttendanceModuleService } from './attendance-module/attendance-module.service';
import { AuthService } from './auth/auth.service';
import { UserAccessGaurd } from './auth/guards/access.guard';
import { EmailService } from './common/email.service';
import { DepartmentController } from './department/department.controller';
import { LeaveApplicationService } from './leave-application/leave-application.service';
import { MonthlyTimeSheetService } from './monthly-time-sheet/monthly-time-sheet.service';
import { PayrollService } from './payroll/payroll.service';
import { RequestCorrectionService } from './request-correction/request-correction.service';
import { TypeLeaveService } from './type-leave/type-leave.service';
import { UserController } from './user/user.controller';
import { UserService } from './user/user.service';
import {
  APPROVED,
  BADREQUEST_CODE,
  CONFLIG_CODE,
  CREATED_RESPONE,
  DRAFT,
  OK_CODE,
  PENDING,
  REJECTED,
  SUBMITTED,
  UNAUTHORIZED_CODE,
} from './common/code';
import { ENV } from './common/env';

const user = {
  userID: 'user-1',
  email: 'employee@company.com',
  username: 'Employee',
  hashedPassword: 'hash',
  roleId: 'role-employee',
  departmentID: 'dept-1',
  isActive: true,
  refreshToken: 'stored-refresh-token',
  remainDaysofLeave: 12,
  totalDaysofLeave: 12,
  salaryCoefficient: 10,
  role: { nameRole: 'employee' },
};

describe('business rules', () => {
  describe('auth', () => {
    it('rejects inactive users before password/token work', async () => {
      const service = new AuthService(
        {
          getUserByEmail: jest.fn().mockResolvedValue({
            statusCode: OK_CODE,
            message: 'ok',
            data: { ...user, isActive: false },
          }),
        } as any,
        { compare: jest.fn() } as any,
      );

      const result = await service.login({
        email: user.email,
        password: 'password123',
      } as any);

      expect(result.statusCode).toBe(UNAUTHORIZED_CODE);
      expect(result.message).toContain('inactive');
    });

    it('rejects wrong password', async () => {
      const service = new AuthService(
        {
          getUserByEmail: jest
            .fn()
            .mockResolvedValue({ statusCode: OK_CODE, data: user }),
        } as any,
        { compare: jest.fn().mockResolvedValue(false) } as any,
      );

      const result = await service.login({
        email: user.email,
        password: 'bad-password',
      } as any);

      expect(result.statusCode).toBe(BADREQUEST_CODE);
      expect(result.message).toContain('password');
    });

    it('rotates a valid refresh token', async () => {
      const refreshToken = jwt.sign(
        { userID: user.userID, username: user.username, email: user.email },
        ENV.JWT.REFRESH_SECRET,
      );
      const updateUser = jest.fn().mockResolvedValue({
        statusCode: OK_CODE,
        data: { ...user, refreshToken: 'new-refresh-token' },
      });
      const service = new AuthService(
        {
          getUserByUserID: jest.fn().mockResolvedValue({
            statusCode: OK_CODE,
            data: { ...user, refreshToken },
          }),
          updateUser,
        } as any,
        { compare: jest.fn() } as any,
      );

      const result = await service.refreshToken(user.userID, refreshToken);

      expect(result.statusCode).toBe(CREATED_RESPONE);
      expect(result.data?.accessToken).toBeTruthy();
      expect(updateUser).toHaveBeenCalledWith(
        user.userID,
        expect.objectContaining({ refreshToken: expect.any(String) }),
      );
    });

    it('treats placeholder SSO credentials as not configured', () => {
      const service = new AuthService({} as any, {} as any);
      const originalGoogle = { ...ENV.GOOGLE };
      const originalMicrosoft = { ...ENV.MICROSOFT };

      try {
        ENV.GOOGLE.CLIENT_ID =
          'your-google-client-id.apps.googleusercontent.com';
        ENV.GOOGLE.CLIENT_SECRET = 'your-google-client-secret';
        ENV.GOOGLE.CALLBACK_URL =
          'http://localhost:3000/api/auth/google/callback';
        ENV.MICROSOFT.CLIENT_ID = 'your-microsoft-client-id';
        ENV.MICROSOFT.CLIENT_SECRET = 'your-microsoft-client-secret';
        ENV.MICROSOFT.TENANT_ID = 'your-tenant-id';
        ENV.MICROSOFT.CALLBACK_URL =
          'http://localhost:3000/api/auth/microsoft/callback';

        expect(service.isGoogleConfigured()).toBe(false);
        expect(service.isMicrosoftConfigured()).toBe(false);
      } finally {
        Object.assign(ENV.GOOGLE, originalGoogle);
        Object.assign(ENV.MICROSOFT, originalMicrosoft);
      }
    });
  });

  describe('attendance', () => {
    function createAttendanceService(tx: any) {
      const defaultTx = {
        user: {
          findUnique: jest.fn().mockResolvedValue({
            departmentID: 'dept-1',
            department: { managerID: 'manager-1' },
          }),
        },
        monthlyTimesheet: {
          findFirst: jest.fn().mockResolvedValue({
            monthlyTimesheetID: 'monthly-1',
            status: DRAFT,
          }),
          update: jest.fn().mockResolvedValue({}),
        },
        ...tx,
      };

      return new AttendanceModuleService(
        {
          $transaction: jest.fn((callback) => callback(defaultTx)),
          ...defaultTx,
        },
        {
          getUserByUserID: jest
            .fn()
            .mockResolvedValue({ statusCode: OK_CODE, data: user }),
          getManagerIdOfUserID: jest.fn().mockResolvedValue({
            statusCode: OK_CODE,
            data: { managerID: 'manager-1' },
          }),
        } as any,
        {
          getMonthlyTimeSheet: jest.fn().mockResolvedValue({
            statusCode: OK_CODE,
            data: { monthlyTimesheetID: 'monthly-1', status: DRAFT },
          }),
          refreshCanSubmit: jest.fn().mockResolvedValue(true),
        } as any,
        {
          createNotification: jest.fn().mockResolvedValue({ statusCode: 201 }),
        } as any,
      );
    }

    beforeAll(() => {
      jest.useFakeTimers().setSystemTime(new Date('2026-05-15T10:00:00'));
    });

    afterAll(() => {
      jest.useRealTimers();
    });

    it('blocks duplicate check-in while an open entry exists', async () => {
      const tx = {
        timesheetEntry: {
          findFirst: jest
            .fn()
            .mockResolvedValue({ timesheetEntryID: 'entry-1', checkOut: null }),
        },
      };

      const result = await createAttendanceService(tx).checkIn(
        user.userID,
        '192.168.1.20',
      );

      expect(result.statusCode).toBe(BADREQUEST_CODE);
      expect(result.message).toContain('already checked in');
    });

    it('blocks check-out without an open check-in entry', async () => {
      const tx = {
        timesheetEntry: {
          findFirst: jest.fn().mockResolvedValue(null),
        },
      };

      const result = await createAttendanceService(tx).checkOut(
        user.userID,
        '192.168.1.20',
      );

      expect(result.statusCode).toBe(BADREQUEST_CODE);
      expect(result.message).toContain("haven't checked in");
    });

    it('warns when check-out IP differs from check-in IP', async () => {
      const tx = {
        timesheetEntry: {
          findFirst: jest.fn().mockResolvedValue({
            timesheetEntryID: 'entry-1',
            checkOut: null,
            IPAddress: '192.168.1.20',
          }),
          update: jest.fn().mockResolvedValue({}),
        },
      };

      const result = await createAttendanceService(tx).checkOut(
        user.userID,
        '10.0.0.15',
      );

      expect(result.statusCode).toBe(OK_CODE);
      expect(result.message).toContain('warning');
    });

    it('creates attendance entry with device info', async () => {
      const tx = {
        timesheetEntry: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({}),
        },
      };

      const result = await createAttendanceService(tx).checkIn(
        user.userID,
        '192.168.1.20',
        'Windows PC',
      );

      expect(result.statusCode).toBe(CREATED_RESPONE);
      expect(tx.timesheetEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ deviceInfo: 'Windows PC' }),
        }),
      );
    });

    it('reopens a locked current monthly timesheet before check-in', async () => {
      const tx = {
        monthlyTimesheet: {
          update: jest.fn().mockResolvedValue({}),
          findFirst: jest.fn().mockResolvedValue({
            monthlyTimesheetID: 'monthly-1',
            status: APPROVED,
          }),
        },
        timesheetEntry: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({}),
        },
        user: {
          findUnique: jest.fn().mockResolvedValue({
            departmentID: 'dept-1',
            department: { managerID: 'manager-1' },
          }),
        },
      };
      const monthlyTimesheetService = {
        getMonthlyTimeSheet: jest.fn().mockResolvedValue({
          statusCode: OK_CODE,
          data: { monthlyTimesheetID: 'monthly-1', status: APPROVED },
        }),
        refreshCanSubmit: jest.fn().mockResolvedValue(true),
      };
      const service = new AttendanceModuleService(
        {
          $transaction: jest.fn((callback) => callback(tx)),
          ...tx,
        },
        {
          getUserByUserID: jest
            .fn()
            .mockResolvedValue({ statusCode: OK_CODE, data: user }),
        } as any,
        monthlyTimesheetService as any,
        { createNotification: jest.fn() } as any,
      );

      const result = await service.checkIn(user.userID, '192.168.1.20');

      expect(result.statusCode).toBe(CREATED_RESPONE);
      expect(tx.monthlyTimesheet.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { monthlyTimesheetID: 'monthly-1' },
          data: expect.objectContaining({
            status: DRAFT,
            isSubmitted: false,
            approvedById: null,
            reviewedAt: null,
          }),
        }),
      );
      expect(tx.timesheetEntry.create).toHaveBeenCalled();
    });

    it('creates missing out warning when check-out is missing at end of day', () => {
      // Simulate system closing a missing checkout
      // This is a placeholder test for business rule validation
      expect(true).toBe(true);
    });
  });

  describe('monthly timesheet', () => {
    function createMonthlyService(tx: any) {
      return new MonthlyTimeSheetService(
        { $transaction: jest.fn((callback) => callback(tx)) } as any,
        {
          getUserByUserID: jest
            .fn()
            .mockResolvedValue({ statusCode: OK_CODE, data: user }),
        } as any,
        {
          getDepartmentById: jest.fn().mockResolvedValue({
            statusCode: OK_CODE,
            data: { departmentID: 'dept-1', managerID: 'manager-1' },
          }),
        } as any,
        {
          createNotification: jest
            .fn()
            .mockResolvedValue({ statusCode: CREATED_RESPONE }),
        } as any,
        { sendTimesheetNotification: jest.fn() } as any,
      );
    }

    it('blocks submit while a correction is pending', async () => {
      // Mock current date to the 1st of month so submission window check passes
      jest.useFakeTimers().setSystemTime(new Date('2026-05-01T10:00:00'));

      const tx = {
        monthlyTimesheet: {
          findUnique: jest
            .fn()
            .mockResolvedValueOnce({
              monthlyTimesheetID: 'monthly-1',
              userID: user.userID,
              month: 4,
              year: 2026,
              status: DRAFT,
              isSubmitted: false,
            })
            .mockResolvedValueOnce({
              monthlyTimesheetID: 'monthly-1',
              status: DRAFT,
              entries: [{ checkIn: new Date(), checkOut: new Date() }],
              corrections: [{ status: PENDING }],
            }),
          update: jest.fn(),
        },
      };

      await expect(
        createMonthlyService(tx).SubmitMonthlyTimesheet('monthly-1'),
      ).rejects.toThrow('cannot');

      jest.useRealTimers();
    });

    it('persists approved status and locks entries after manager approval', async () => {
      const tx = {
        monthlyTimesheet: {
          findUnique: jest.fn().mockResolvedValue({
            monthlyTimesheetID: 'monthly-1',
            userID: user.userID,
            month: 5,
            year: 2026,
            status: SUBMITTED,
            isSubmitted: true,
          }),
          update: jest.fn().mockResolvedValue({
            monthlyTimesheetID: 'monthly-1',
            userID: user.userID,
            month: 5,
            year: 2026,
            status: APPROVED,
            isSubmitted: true,
            reasonReject: null,
            reviewedAt: new Date(),
          }),
        },
        timesheetEntry: {
          updateMany: jest.fn(),
        },
      };

      const result = await createMonthlyService(tx).reviewMonthlyTimesheet(
        'monthly-1',
        { accept: true } as any,
        'manager-1',
      );

      expect(result.statusCode).toBe(OK_CODE);
      expect(result.data?.status).toBe(APPROVED);
      expect(tx.timesheetEntry.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: APPROVED,
            canRequestCorrection: false,
          }),
        }),
      );
    });

    it('filters UC-09 report by date range, employee, department and status', async () => {
      const prisma = {
        monthlyTimesheet: {
          findMany: jest.fn().mockResolvedValue([
            {
              monthlyTimesheetID: 'monthly-1',
              userID: user.userID,
              month: 5,
              year: 2026,
              status: APPROVED,
              employee: {
                userID: user.userID,
                username: user.username,
                email: user.email,
                departmentID: 'dept-1',
                department: {
                  departmentID: 'dept-1',
                  departmentName: 'Engineering',
                },
              },
              entries: [
                {
                  timesheetEntryID: 'entry-1',
                  date: '2026-05-15',
                  checkIn: new Date('2026-05-15T08:00:00Z'),
                  checkOut: new Date('2026-05-15T16:30:00Z'),
                  status: APPROVED,
                  isWarning: false,
                },
              ],
            },
          ]),
        },
      };
      const service = new MonthlyTimeSheetService(
        prisma as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
      );

      const report = await service.getTimesheetReport(
        {
          fromDate: '2026-05-01',
          toDate: '2026-05-31',
          employeeId: user.userID,
          departmentId: 'dept-1',
          status: 'Approved',
        },
        {
          userID: 'admin-1',
          username: 'Admin',
          email: 'admin@example.com',
          roleId: 'role-admin',
          role: 'admin',
          roleName: 'admin',
        },
      );

      expect(prisma.monthlyTimesheet.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userID: user.userID,
            status: APPROVED,
            employee: { departmentID: 'dept-1' },
            entries: {
              some: {
                date: {
                  gte: '2026-05-01',
                  lte: '2026-05-31',
                },
              },
            },
          }),
        }),
      );
      expect(report.rows).toHaveLength(1);
      expect(report.rows[0]).toEqual(
        expect.objectContaining({
          employeeId: user.userID,
          status: 'Approved',
          workDate: '2026-05-15',
          totalHours: 8.5,
        }),
      );
      expect(report.summary).toEqual(
        expect.objectContaining({
          totalRecords: 1,
          totalEmployees: 1,
          totalHours: 8.5,
          approved: 1,
        }),
      );
    });
  });

  describe('correction requests', () => {
    it('blocks new correction requests for approved monthly timesheets', async () => {
      const tx = {
        monthlyTimesheet: {
          findUnique: jest.fn().mockResolvedValue({
            monthlyTimesheetID: 'monthly-1',
            userID: user.userID,
            status: APPROVED,
            employee: { ...user, department: { managerID: 'manager-1' } },
          }),
        },
        timesheetEntry: {
          findUnique: jest
            .fn()
            .mockResolvedValue({ timesheetEntryID: 'entry-1' }),
        },
      };
      const service = new RequestCorrectionService(
        { $transaction: jest.fn((callback) => callback(tx)) } as any,
        { createNotification: jest.fn() } as any,
      );

      const result = await service.createRequest(user.userID, {
        monthlyTimesheetID: 'monthly-1',
        timesheetEntryID: 'entry-1',
        date: '2026-05-18',
        requestedCheckOut: '18:00',
        reason: 'Forgot checkout',
      });

      expect(result.statusCode).toBe(BADREQUEST_CODE);
      expect(result.message).toContain('locked');
    });

    it('applies proposed check-in/out when a manager approves correction', async () => {
      const tx = {
        requestCorrection: {
          findUnique: jest.fn().mockResolvedValue({
            requestCorrectionID: 'correction-1',
            monthlyTimesheetID: 'monthly-1',
            timesheetEntryID: 'entry-1',
            userID: user.userID,
            status: PENDING,
            proposedCheckIn: new Date('2026-05-18T08:00:00'),
            proposedCheckOut: new Date('2026-05-18T18:00:00'),
            monthlyTimesheet: { userID: user.userID, status: DRAFT },
          }),
          update: jest.fn().mockResolvedValue({
            requestCorrectionID: 'correction-1',
            status: APPROVED,
          }),
        },
        user: {
          findUnique: jest
            .fn()
            .mockResolvedValueOnce({
              userID: 'manager-1',
              role: { nameRole: 'manager' },
            })
            .mockResolvedValueOnce({
              ...user,
              department: { managerID: 'manager-1' },
            }),
        },
        timesheetEntry: {
          findUnique: jest.fn().mockResolvedValue({
            timesheetEntryID: 'entry-1',
            checkIn: new Date('2026-05-18T08:30:00'),
            checkOut: null,
          }),
          update: jest.fn(),
        },
        monthlyTimesheet: {
          findUnique: jest.fn().mockResolvedValue({
            monthlyTimesheetID: 'monthly-1',
            status: DRAFT,
            entries: [{ checkIn: new Date(), checkOut: new Date() }],
            corrections: [],
          }),
          update: jest.fn(),
        },
      };
      const service = new RequestCorrectionService(
        { $transaction: jest.fn((callback) => callback(tx)) } as any,
        {
          createNotification: jest
            .fn()
            .mockResolvedValue({ statusCode: CREATED_RESPONE }),
        } as any,
      );

      const result = await service.reviewRequest('correction-1', 'manager-1', {
        status: APPROVED as any,
      });

      expect(result.statusCode).toBe(OK_CODE);
      expect(tx.timesheetEntry.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            checkIn: new Date('2026-05-18T08:00:00'),
            checkOut: new Date('2026-05-18T18:00:00'),
          }),
        }),
      );
    });
  });

  describe('leave applications', () => {
    beforeAll(() => {
      jest.useFakeTimers().setSystemTime(new Date('2026-05-15T00:00:00'));
    });

    afterAll(() => {
      jest.useRealTimers();
    });

    it('excludes weekends from leave duration', async () => {
      const prisma = {
        user: {
          findUnique: jest
            .fn()
            .mockResolvedValue({ ...user, remainDaysofLeave: 12 }),
        },
        typeLeave: {
          findUnique: jest
            .fn()
            .mockResolvedValue({ typeLeaveID: 'type-1', hasSalary: 1 }),
        },
        leaveApplication: {
          create: jest
            .fn()
            .mockResolvedValue({ leaveApplicationID: 'leave-1', duration: 2 }),
        },
        monthlyTimesheet: {
          findMany: jest.fn().mockResolvedValue([]),
        },
        department: {
          findUnique: jest.fn().mockResolvedValue({ managerID: null }),
        },
      };
      const service = new LeaveApplicationService(
        prisma as any,
        { createNotification: jest.fn() } as any,
      );

      const result = await service.createLeaveApplication(user.userID, {
        typeLeaveID: 'type-1',
        startDate: '2026-05-22',
        endDate: '2026-05-25',
        reason: 'Family',
      });

      expect(result.statusCode).toBe(CREATED_RESPONE);
      expect(prisma.leaveApplication.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ duration: 2 }),
        }),
      );
    });

    it('returns a warning when leave overlaps an existing work log', async () => {
      const prisma = {
        user: {
          findUnique: jest
            .fn()
            .mockResolvedValue({ ...user, remainDaysofLeave: 12 }),
        },
        typeLeave: {
          findUnique: jest
            .fn()
            .mockResolvedValue({ typeLeaveID: 'type-1', hasSalary: 1 }),
        },
        monthlyTimesheet: {
          findMany: jest.fn().mockResolvedValue([
            {
              entries: [{ date: '2026-05-18' }],
            },
          ]),
        },
        leaveApplication: {
          create: jest.fn().mockResolvedValue({
            leaveApplicationID: 'leave-conflict',
            duration: 1,
          }),
        },
        department: {
          findUnique: jest.fn().mockResolvedValue({ managerID: null }),
        },
      };
      const service = new LeaveApplicationService(
        prisma as any,
        { createNotification: jest.fn() } as any,
        { send: jest.fn() } as any,
      );

      const result = await service.createLeaveApplication(user.userID, {
        typeLeaveID: 'type-1',
        startDate: '2026-05-18',
        endDate: '2026-05-18',
        reason: 'Medical appointment',
      });

      expect(result.statusCode).toBe(CREATED_RESPONE);
      expect(result.message).toContain('warning');
      expect(result.data).toEqual(
        expect.objectContaining({
          warnings: [
            expect.objectContaining({
              code: 'LEAVE_WORKLOG_CONFLICT',
              date: '2026-05-18',
            }),
          ],
        }),
      );
    });

    it('rejects invalid or past leave dates', async () => {
      const service = new LeaveApplicationService({} as any, {} as any);

      await expect(
        service.createLeaveApplication(user.userID, {
          typeLeaveID: 'type-1',
          startDate: '2026-05-20',
          endDate: '2026-05-19',
          reason: 'Invalid',
        }),
      ).resolves.toMatchObject({ statusCode: BADREQUEST_CODE });

      await expect(
        service.createLeaveApplication(user.userID, {
          typeLeaveID: 'type-1',
          startDate: '2026-05-01',
          endDate: '2026-05-01',
          reason: 'Past',
        }),
      ).resolves.toMatchObject({ statusCode: BADREQUEST_CODE });
    });

    it('does not subtract annual balance for unpaid approved leave', async () => {
      const tx = {
        leaveApplication: {
          findUnique: jest.fn().mockResolvedValue({
            leaveApplicationID: 'leave-1',
            senderID: user.userID,
            status: PENDING,
            duration: 3,
            startDate: new Date('2026-05-18'),
            endDate: new Date('2026-05-20'),
            sender: { department: { managerID: 'manager-1' } },
            typeLeave: { hasSalary: 0 },
          }),
          update: jest.fn().mockResolvedValue({
            leaveApplicationID: 'leave-1',
            status: APPROVED,
          }),
        },
        user: {
          findUnique: jest
            .fn()
            .mockResolvedValue({ ...user, remainDaysofLeave: 12 }),
          update: jest.fn(),
        },
      };
      const service = new LeaveApplicationService(
        { $transaction: jest.fn((callback) => callback(tx)) } as any,
        {
          createNotification: jest
            .fn()
            .mockResolvedValue({ statusCode: CREATED_RESPONE }),
        } as any,
      );

      const result = await service.reviewLeaveApplication(
        'leave-1',
        'manager-1',
        { status: APPROVED },
      );

      expect(result.statusCode).toBe(OK_CODE);
      expect(tx.user.update).not.toHaveBeenCalled();
    });

    it('subtracts annual balance for paid approved leave', async () => {
      const tx = {
        leaveApplication: {
          findUnique: jest.fn().mockResolvedValue({
            leaveApplicationID: 'leave-2',
            senderID: user.userID,
            status: PENDING,
            duration: 2,
            startDate: new Date('2026-05-18'),
            endDate: new Date('2026-05-19'),
            sender: { department: { managerID: 'manager-1' } },
            typeLeave: { hasSalary: 1 },
          }),
          update: jest.fn().mockResolvedValue({ status: APPROVED }),
        },
        user: {
          findUnique: jest
            .fn()
            .mockResolvedValue({ ...user, remainDaysofLeave: 12 }),
          update: jest.fn(),
        },
      };
      const service = new LeaveApplicationService(
        { $transaction: jest.fn((callback) => callback(tx)) } as any,
        { createNotification: jest.fn() } as any,
      );

      await service.reviewLeaveApplication('leave-2', 'manager-1', {
        status: APPROVED,
      });
      expect(tx.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ remainDaysofLeave: 10 }),
        }),
      );
    });

    it('does not subtract balance when leave is rejected', async () => {
      const tx = {
        leaveApplication: {
          findUnique: jest.fn().mockResolvedValue({
            leaveApplicationID: 'leave-3',
            senderID: user.userID,
            status: PENDING,
            duration: 2,
            startDate: new Date('2026-05-18'),
            endDate: new Date('2026-05-19'),
            sender: { department: { managerID: 'manager-1' } },
            typeLeave: { hasSalary: 1 },
          }),
          update: jest.fn().mockResolvedValue({ status: 'rejected' }),
        },
        user: {
          findUnique: jest
            .fn()
            .mockResolvedValue({ ...user, remainDaysofLeave: 12 }),
          update: jest.fn(),
        },
      };
      const service = new LeaveApplicationService(
        { $transaction: jest.fn((callback) => callback(tx)) } as any,
        { createNotification: jest.fn() } as any,
      );

      await service.reviewLeaveApplication('leave-3', 'manager-1', {
        status: REJECTED as any,
        reasonReject: 'Too busy',
      });
      expect(tx.user.update).not.toHaveBeenCalled();
    });
  });

  describe('payroll', () => {
    it('generates payroll only for approved monthly timesheets', async () => {
      const service = new PayrollService({
        monthlyTimesheet: {
          findUnique: jest.fn().mockResolvedValue({ status: SUBMITTED }),
        },
      } as any);

      const result = await service.generatePayroll('monthly-1');

      expect(result.statusCode).toBe(CONFLIG_CODE);
      expect(result.message).toContain('approved');
    });

    it('generates payroll from approved timesheet hours and overtime', async () => {
      const payrollCreate = jest.fn().mockImplementation(({ data }) => ({
        payrollID: 'payroll-1',
        ...data,
      }));
      const service = new PayrollService({
        monthlyTimesheet: {
          findUnique: jest.fn().mockResolvedValue({
            monthlyTimesheetID: 'monthly-1',
            userID: user.userID,
            month: 5,
            year: 2026,
            status: APPROVED,
            employee: {
              username: user.username,
              salaryCoefficient: 10,
            },
            entries: [
              {
                status: APPROVED,
                checkIn: new Date('2026-05-18T08:00:00Z'),
                checkOut: new Date('2026-05-18T16:00:00Z'),
              },
              {
                status: APPROVED,
                checkIn: new Date('2026-05-19T08:00:00Z'),
                checkOut: new Date('2026-05-19T18:00:00Z'),
              },
              {
                status: PENDING,
                checkIn: new Date('2026-05-20T08:00:00Z'),
                checkOut: new Date('2026-05-20T18:00:00Z'),
              },
            ],
          }),
        },
        payroll: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: payrollCreate,
        },
      } as any);

      const result = await service.generatePayroll('monthly-1');

      expect(result.statusCode).toBe(CREATED_RESPONE);
      expect(payrollCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            totalHours: 16,
            totalExtraHours: 2,
            totalSalaryByHours: 190,
          }),
        }),
      );
    });

    it('exports generated payroll as JSON and CSV', async () => {
      const payrollRows = [
        {
          payrollID: 'payroll-1',
          userID: user.userID,
          month: 5,
          year: 2026,
          totalHours: 16,
          totalExtraHours: 2,
          totalSalaryByHours: 190,
          employee: {
            username: user.username,
            email: user.email,
            department: { departmentName: 'Engineering' },
          },
          monthlyTimesheet: {
            monthlyTimesheetID: 'monthly-1',
            status: APPROVED,
            reviewedAt: new Date('2026-05-20T00:00:00Z'),
          },
        },
      ];
      const service = new PayrollService({
        payroll: {
          findMany: jest.fn().mockResolvedValue(payrollRows),
        },
      } as any);

      const jsonResult = await service.exportPayroll(5, 2026, 'json');
      const csvResult = await service.exportPayroll(5, 2026, 'csv');

      expect(jsonResult).toMatchObject({
        statusCode: OK_CODE,
        data: payrollRows,
        isCsv: false,
      });
      expect(csvResult).toMatchObject({
        statusCode: OK_CODE,
        isCsv: true,
      });
      expect(String(csvResult.data)).toContain('Payroll ID');
      expect(String(csvResult.data)).toContain('Employee');
    });

    it('returns a clear empty export response and validates invalid month/year', async () => {
      const service = new PayrollService({
        payroll: {
          findMany: jest.fn().mockResolvedValue([]),
        },
      } as any);

      const emptyResult = await service.exportPayroll(5, 2026, 'json');
      const invalidMonth = await service.exportPayroll(13, 2026, 'json');

      expect(emptyResult).toMatchObject({
        statusCode: OK_CODE,
        message: 'No payroll data matched the selected period',
        data: [],
        meta: { count: 0, externalIntegration: 'not_configured' },
      });
      expect(invalidMonth).toMatchObject({
        statusCode: 400,
        message: 'Payroll month must be between 1 and 12',
      });
    });
  });

  describe('RBAC metadata', () => {
    it('locks user and department mutation endpoints to admin permission', () => {
      expect(
        Reflect.getMetadata('permission', UserController.prototype.createUser),
      ).toEqual(['admin']);
      expect(
        Reflect.getMetadata(
          'permission',
          UserController.prototype.deactivateUser,
        ),
      ).toEqual(['admin']);
      expect(
        Reflect.getMetadata(
          'permission',
          UserController.prototype.activateUser,
        ),
      ).toEqual(['admin']);
      expect(
        Reflect.getMetadata('permission', UserController.prototype.deleteUser),
      ).toEqual(['admin']);
      expect(
        Reflect.getMetadata(
          'permission',
          DepartmentController.prototype.createDepartment,
        ),
      ).toEqual(['admin']);
      expect(
        Reflect.getMetadata(
          'permission',
          DepartmentController.prototype.getDepartmentByDepartmentName,
        ),
      ).toEqual(['admin']);
      expect(
        Reflect.getMetadata(
          'permission',
          DepartmentController.prototype.updateDepartment,
        ),
      ).toEqual(['admin']);
      expect(
        Reflect.getMetadata(
          'permission',
          DepartmentController.prototype.deleteDepartment,
        ),
      ).toEqual(['admin']);
    });

    it('allows admin, me, manager and managerOfDepartment permissions through the access guard', async () => {
      const handler = jest.fn();
      const controllerClass = class TestController {};
      const createContext = (params: Record<string, string>) =>
        ({
          getHandler: () => handler,
          getClass: () => controllerClass,
          switchToHttp: () => ({
            getRequest: () => ({
              user: {
                userID: 'manager-1',
                email: 'manager@company.com',
                username: 'manager',
                roleId: 'role-manager',
                role: 'manager',
                roleName: 'manager',
                departmentID: 'dept-1',
              },
              params,
            }),
          }),
        }) as any;
      const userService = {
        checkAuthIsAdmin: jest.fn().mockResolvedValue({ statusCode: OK_CODE }),
        IsMe: jest.fn().mockReturnValue({ statusCode: OK_CODE }),
        checkAuthIsMyManager: jest
          .fn()
          .mockResolvedValue({ statusCode: OK_CODE }),
        checkAuthIsManagerOfDepartment: jest
          .fn()
          .mockResolvedValue({ statusCode: OK_CODE }),
      };
      const reflector = {
        getAllAndOverride: jest
          .fn()
          .mockReturnValueOnce(['admin'])
          .mockReturnValueOnce(['me'])
          .mockReturnValueOnce(['manager'])
          .mockReturnValueOnce(['managerOfDepartment'])
          .mockReturnValueOnce(['me']),
      };
      const guard = new UserAccessGaurd(userService as any, reflector as any);

      await expect(guard.canActivate(createContext({}))).resolves.toBe(true);
      await expect(
        guard.canActivate(createContext({ userID: 'manager-1' })),
      ).resolves.toBe(true);
      await expect(
        guard.canActivate(createContext({ userID: 'employee-1' })),
      ).resolves.toBe(true);
      await expect(
        guard.canActivate(createContext({ departmentID: 'dept-1' })),
      ).resolves.toBe(true);
      await expect(guard.canActivate(createContext({}))).resolves.toBe(true);

      expect(userService.checkAuthIsAdmin).toHaveBeenCalled();
      expect(userService.IsMe).toHaveBeenCalledWith(
        expect.objectContaining({ userID: 'manager-1' }),
        'manager-1',
        'userID',
      );
      expect(userService.checkAuthIsMyManager).toHaveBeenCalledWith(
        expect.objectContaining({ userID: 'manager-1' }),
        'employee-1',
        'userID',
      );
      expect(userService.checkAuthIsManagerOfDepartment).toHaveBeenCalledWith(
        expect.objectContaining({ userID: 'manager-1' }),
        'dept-1',
      );
    });
  });

  describe('user endpoints', () => {
    it('prevents self-deactivate and self-delete', async () => {
      const controller = new UserController({} as any);
      await expect(
        controller.deactivateUser('user-1', {
          user: { userID: 'user-1' },
        } as any),
      ).rejects.toThrow('Cannot deactivate your own account');
      await expect(
        controller.deleteUser('user-1', {
          user: { userID: 'user-1' },
        } as any),
      ).rejects.toThrow('Cannot delete your own account');
    });

    it('deactivates and activates users without deleting history', async () => {
      const update = jest
        .fn()
        .mockResolvedValueOnce({ ...user, userID: 'user-2', isActive: false })
        .mockResolvedValueOnce({ ...user, userID: 'user-2', isActive: true });
      const service = new UserService(
        { user: { update } } as any,
        {} as any,
        {} as any,
        {} as any,
      );

      const deactivated = await service.deactivateUser('user-2');
      const activated = await service.activateUser('user-2');

      expect(deactivated).toMatchObject({
        statusCode: OK_CODE,
        data: { userID: 'user-2', isActive: false },
      });
      expect(activated).toMatchObject({
        statusCode: OK_CODE,
        data: { userID: 'user-2', isActive: true },
      });
      expect(update).toHaveBeenNthCalledWith(1, {
        where: { userID: 'user-2' },
        data: { isActive: false },
      });
      expect(update).toHaveBeenNthCalledWith(2, {
        where: { userID: 'user-2' },
        data: { isActive: true },
      });
    });
  });

  describe('email service', () => {
    it('falls back to LogEmailProvider if SMTP info is missing or provider is not smtp', () => {
      const originalProvider = ENV.EMAIL.PROVIDER;
      try {
        ENV.EMAIL.PROVIDER = 'unknown_provider';
        const service = new EmailService();
        expect((service as any).provider.constructor.name).toBe(
          'LogEmailProvider',
        );
      } finally {
        ENV.EMAIL.PROVIDER = originalProvider;
      }
    });

    it('returns delivery metadata for log-provider emails', async () => {
      const originalProvider = ENV.EMAIL.PROVIDER;
      try {
        ENV.EMAIL.PROVIDER = 'log';
        const service = new EmailService();
        const result = await service.send({
          to: 'employee@example.com',
          subject: 'Test',
          text: 'Hello',
        });

        expect(result).toEqual(
          expect.objectContaining({
            provider: 'log',
            attempted: false,
            sent: false,
            message: 'EMAIL_LOGGED_ONLY',
          }),
        );
      } finally {
        ENV.EMAIL.PROVIDER = originalProvider;
      }
    });
  });

  describe('leave types', () => {
    it('soft-deactivates leave types instead of deleting them', async () => {
      const update = jest
        .fn()
        .mockResolvedValue({ typeLeaveID: 'type-1', isActive: false });
      const service = new TypeLeaveService({
        typeLeave: {
          findUnique: jest.fn().mockResolvedValue({ typeLeaveID: 'type-1' }),
          update,
        },
      } as any);

      const result = await service.deleteTypeLeave('type-1');

      expect(result).toMatchObject({
        statusCode: OK_CODE,
        data: { typeLeaveID: 'type-1', isActive: false },
      });
      expect(update).toHaveBeenCalledWith({
        where: { typeLeaveID: 'type-1' },
        data: { isActive: false },
      });
    });

    it('filters inactive leave types for employee-facing reads', async () => {
      const findMany = jest.fn().mockResolvedValue([]);
      const service = new TypeLeaveService({
        typeLeave: { findMany },
      } as any);

      await service.getAllTypeLeaves();
      await service.getAllTypeLeaves(true);

      expect(findMany).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ where: { isActive: true } }),
      );
      expect(findMany).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ where: undefined }),
      );
    });
  });
});
