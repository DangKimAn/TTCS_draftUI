import 'reflect-metadata';
import * as jwt from 'jsonwebtoken';
import { AttendanceModuleService } from './attendance-module/attendance-module.service';
import { AuthService } from './auth/auth.service';
import { DepartmentController } from './department/department.controller';
import { LeaveApplicationService } from './leave-application/leave-application.service';
import { MonthlyTimeSheetService } from './monthly-time-sheet/monthly-time-sheet.service';
import { PayrollService } from './payroll/payroll.service';
import { RequestCorrectionService } from './request-correction/request-correction.service';
import { UserController } from './user/user.controller';
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
  });

  describe('attendance', () => {
    function createAttendanceService(tx: any) {
      return new AttendanceModuleService(
        { $transaction: jest.fn((callback) => callback(tx)) } as any,
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
      );
    }

    it('blocks submit while a correction is pending', async () => {
      const tx = {
        monthlyTimesheet: {
          findUnique: jest
            .fn()
            .mockResolvedValueOnce({
              monthlyTimesheetID: 'monthly-1',
              userID: user.userID,
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
          findUnique: jest.fn().mockResolvedValue({ timesheetEntryID: 'entry-1' }),
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
  });
});
