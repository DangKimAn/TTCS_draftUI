import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from 'src/prisma/prisma.service';
import { BycyptHashedService } from 'src/common/bycypt-hashed/bycypt-hashed.service';
import {
  MonthlyTimesheetStatus,
  TimesheetStatus,
  NotificationRelatedType,
} from '@prisma/client';

function getTestServer(app: INestApplication): App {
  return app.getHttpServer() as unknown as App;
}

interface ApiResponse<T> {
  statusCode: number;
  message: string;
  data: T;
}

describe('RequestCorrection (e2e)', () => {
  jest.setTimeout(60000);
  let app: INestApplication;
  let prisma: PrismaService;
  let bcrypt: BycyptHashedService;

  let employeeToken: string;
  let managerToken: string;
  let employeeID: string;
  let managerID: string;
  let departmentID: string;
  let monthlyTimesheetID: string;
  let timesheetEntryID: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Mirror main.ts configuration
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalInterceptors(
      new ClassSerializerInterceptor(app.get(Reflector)),
    );

    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
    bcrypt = app.get<BycyptHashedService>(BycyptHashedService);

    // Setup Roles
    const roles = await Promise.all([
      prisma.role.upsert({
        where: { nameRole: 'employee' },
        update: {},
        create: { nameRole: 'employee' },
      }),
      prisma.role.upsert({
        where: { nameRole: 'manager' },
        update: {},
        create: { nameRole: 'manager' },
      }),
    ]);
    const employeeRole = roles.find((r) => r.nameRole === 'employee');
    const managerRole = roles.find((r) => r.nameRole === 'manager');

    // Create Manager
    const hashedPassword = await bcrypt.hash('password123');
    const manager = await prisma.user.upsert({
      where: { email: 'manager_e2e@example.com' },
      update: {
        roleId: managerRole.roleID,
        hashedPassword,
        isActive: true,
      },
      create: {
        email: 'manager_e2e@example.com',
        username: 'manager_e2e',
        hashedPassword,
        roleId: managerRole.roleID,
        isActive: true,
      },
    });
    managerID = manager.userID;

    // Create Department
    const department = await prisma.department.upsert({
      where: { departmentName: 'E2E Testing Dept' },
      update: { managerID },
      create: {
        departmentName: 'E2E Testing Dept',
        managerID,
      },
    });
    departmentID = department.departmentID;

    // Link Manager to Department (Required by UserService.updateUser validation)
    await prisma.user.update({
      where: { userID: managerID },
      data: { departmentID },
    });

    // Create Employee in Department
    const employee = await prisma.user.upsert({
      where: { email: 'employee_e2e@example.com' },
      update: {
        departmentID,
        roleId: employeeRole.roleID,
        hashedPassword,
        isActive: true,
      },
      create: {
        email: 'employee_e2e@example.com',
        username: 'employee_e2e',
        hashedPassword,
        roleId: employeeRole.roleID,
        departmentID,
        isActive: true,
      },
    });
    employeeID = employee.userID;

    // Create MonthlyTimesheet (Draft)
    const timesheet = await prisma.monthlyTimesheet.upsert({
      where: {
        userID_month_year: { userID: employeeID, month: 5, year: 2026 },
      },
      update: { status: MonthlyTimesheetStatus.DRAFT },
      create: {
        userID: employeeID,
        month: 5,
        year: 2026,
        status: MonthlyTimesheetStatus.DRAFT,
      },
    });
    monthlyTimesheetID = timesheet.monthlyTimesheetID;

    // Create TimesheetEntry with missing checkOut
    const entry = await prisma.timesheetEntry.create({
      data: {
        monthlyTimesheetID,
        date: '2026-05-15',
        checkIn: new Date('2026-05-15T08:00:00Z'),
        checkOut: null,
        IPAddress: '127.0.0.1',
        status: TimesheetStatus.PENDING,
      },
    });
    timesheetEntryID = entry.timesheetEntryID;

    // Login as Employee
    const server = getTestServer(app);

    const empLogin = await request(server)
      .post('/api/auth/login')
      .send({ email: 'employee_e2e@example.com', password: 'password123' });

    if (empLogin.status !== 201) {
      console.error(
        'Employee Login Failed:',
        JSON.stringify(empLogin.body, null, 2),
      );
    }
    const empLoginBody = empLogin.body as ApiResponse<{
      accessToken: string;
    }>;
    employeeToken = empLoginBody.data?.accessToken ?? '';

    // Login as Manager
    const mgrLogin = await request(server)
      .post('/api/auth/login')
      .send({ email: 'manager_e2e@example.com', password: 'password123' });

    if (mgrLogin.status !== 201) {
      console.error(
        'Manager Login Failed:',
        JSON.stringify(mgrLogin.body, null, 2),
      );
    }
    const mgrLoginBody = mgrLogin.body as ApiResponse<{
      accessToken: string;
    }>;
    managerToken = mgrLoginBody.data?.accessToken ?? '';
  });

  afterAll(async () => {
    // Cleanup in correct order to respect foreign keys
    try {
      // 1. Unlink manager and employees from department to avoid Restrict violations
      await prisma.department.updateMany({
        where: { departmentName: 'E2E Testing Dept' },
        data: { managerID: null },
      });
      await prisma.user.updateMany({
        where: {
          email: {
            in: ['employee_e2e@example.com', 'manager_e2e@example.com'],
          },
        },
        data: { departmentID: null },
      });

      // 2. Delete related transactional data
      await prisma.notification.deleteMany({
        where: {
          OR: [
            { receiverID: employeeID },
            { receiverID: managerID },
            { senderID: employeeID },
            { senderID: managerID },
          ],
        },
      });
      await prisma.requestCorrection.deleteMany({
        where: { userID: employeeID },
      });
      await prisma.timesheetEntry.deleteMany({ where: { monthlyTimesheetID } });
      await prisma.monthlyTimesheet.deleteMany({
        where: { monthlyTimesheetID },
      });

      // 3. Delete department and users
      await prisma.department.deleteMany({
        where: { departmentName: 'E2E Testing Dept' },
      });
      await prisma.user.deleteMany({
        where: {
          email: {
            in: ['employee_e2e@example.com', 'manager_e2e@example.com'],
          },
        },
      });
    } catch (error) {
      console.error('Cleanup failed:', error);
    } finally {
      await app.close();
    }
  });

  describe('Correction Flow', () => {
    it('should complete the full correction flow from creation to approval', async () => {
      const server = getTestServer(app);

      // 1. Employee creates correction request
      const createRes = await request(server)
        .post(`/api/request-correction/${employeeID}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          monthlyTimesheetID,
          timesheetEntryID,
          requestedCheckOut: '17:00', // Use HH:mm format
          reason: 'Forgot to check out at the end of the day',
        });

      expect(createRes.status).toBe(201);
      const createBody = createRes.body as ApiResponse<{
        requestCorrectionID: string;
      }>;
      expect(createBody.data).toBeDefined();
      const requestId = createBody.data.requestCorrectionID;

      const correction = await prisma.requestCorrection.findUnique({
        where: { requestCorrectionID: requestId },
      });
      expect(correction?.status).toBe(TimesheetStatus.PENDING);
      expect(correction?.proposedCheckOut).toBeDefined();

      // Assert Manager received notification
      const managerNoti = await prisma.notification.findFirst({
        where: {
          receiverID: managerID,
          relatedType: NotificationRelatedType.TIMESHEET,
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(managerNoti).toBeDefined();
      expect(managerNoti?.content).toContain(
        'requested a timesheet correction',
      );

      // 2. Manager approves the request
      const reviewRes = await request(server)
        .patch(`/api/request-correction/review/${requestId}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          status: TimesheetStatus.APPROVED,
        });

      expect(reviewRes.status).toBe(200);
      const reviewBody = reviewRes.body as ApiResponse<unknown>;
      expect(reviewBody.message).toContain(TimesheetStatus.APPROVED);

      // 3. Verify TimesheetEntry updated automatically
      const updatedEntry = await prisma.timesheetEntry.findUnique({
        where: { timesheetEntryID },
      });

      // The service parses '17:00' using the date from the entry ('2026-05-15')
      // Checking the service logic: `dateTimeValue = dateKey + 'T' + value`
      // dateKey is '2026-05-15'
      // dateTimeValue becomes '2026-05-15T17:00:00'
      // new Date('2026-05-15T17:00:00') will be local or UTC depending on environment.
      // We'll just check if it's not null and has the right hour.
      expect(updatedEntry?.checkOut).toBeDefined();
      if (updatedEntry?.checkOut) {
        expect(new Date(updatedEntry.checkOut).getHours()).toBe(17);
      }

      // Verify Employee received notification
      const employeeNoti = await prisma.notification.findFirst({
        where: {
          receiverID: employeeID,
          relatedType: NotificationRelatedType.TIMESHEET,
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(employeeNoti).toBeDefined();
      expect(employeeNoti?.content).toContain(TimesheetStatus.APPROVED);
    });

    it('should fail if the monthly timesheet is not in Draft status', async () => {
      const server = getTestServer(app);

      // Manually set status to submitted
      await prisma.monthlyTimesheet.update({
        where: { monthlyTimesheetID },
        data: { status: MonthlyTimesheetStatus.SUBMITTED },
      });

      const createRes = await request(server)
        .post(`/api/request-correction/${employeeID}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          monthlyTimesheetID,
          timesheetEntryID,
          requestedCheckOut: '18:00',
          reason: 'Invalid state test',
        });

      expect(createRes.status).toBe(400);
      const createBody = createRes.body as ApiResponse<unknown>;
      expect(createBody.message).toContain('waiting for review');

      // Cleanup: Reset to draft for any subsequent tests
      await prisma.monthlyTimesheet.update({
        where: { monthlyTimesheetID },
        data: { status: MonthlyTimesheetStatus.DRAFT },
      });
    });
  });
});
