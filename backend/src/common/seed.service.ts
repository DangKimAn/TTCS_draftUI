import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  Department,
  LeaveStatus,
  MonthlyTimesheet,
  MonthlyTimesheetStatus,
  NotificationRelatedType,
  Prisma,
  Role,
  TimesheetStatus,
  TypeLeave,
  User,
} from '@prisma/client';
import { BycyptHashedService } from 'src/common/bycypt-hashed/bycypt-hashed.service';
import { PrismaService } from 'src/prisma/prisma.service';

type SeedUserKey =
  | 'hrAdmin'
  | 'managerKt'
  | 'employee1'
  | 'employee2'
  | 'employeeOT'
  | 'employeeRejected'
  | 'employeePending';
type SeedDepartmentKey = 'engineering' | 'hr' | 'sales';
type SeedLeaveTypeKey = 'annual' | 'unpaid' | 'sick' | 'wedding';
type SeedTimesheetKey =
  | 'managerKt'
  | 'employee1'
  | 'employee2'
  | 'employeeOT'
  | 'employeeRejected'
  | 'employeePending';
type RoleName = (typeof ROLE_NAMES)[number];

type SeedRoleMap = Record<RoleName, Role>;
type SeedDepartmentMap = Record<SeedDepartmentKey, Department>;
type SeedLeaveTypeMap = Record<SeedLeaveTypeKey, TypeLeave>;
type SeedUserMap = Record<SeedUserKey, User>;
type SeedTimesheetMap = Record<SeedTimesheetKey, MonthlyTimesheet>;

interface SeedOptions {
  force?: boolean;
}

interface DemoUserConfig {
  email: string;
  username: string;
  roleName: RoleName;
  departmentKey: SeedDepartmentKey;
  salaryCoefficient: number;
  remainDaysofLeave?: number;
}

const DEMO_PASSWORD = 'password123';

const ROLE_NAMES = ['admin', 'manager', 'employee'] as const;

const DEPARTMENTS: Record<SeedDepartmentKey, string> = {
  engineering: 'Phòng Kỹ thuật',
  hr: 'Phòng Nhân sự',
  sales: 'Phòng Kinh doanh',
};

const LEGACY_DEPARTMENT_NAMES: Record<SeedDepartmentKey, string[]> = {
  engineering: ['PhÃ²ng Ká»¹ thuáº­t'],
  hr: ['PhÃ²ng NhÃ¢n sá»±'],
  sales: ['PhÃ²ng Kinh doanh'],
};

const LEAVE_TYPES: Record<
  SeedLeaveTypeKey,
  { code: string; nameTypeLeave: string; hasSalary: number }
> = {
  annual: { code: 'AL', nameTypeLeave: 'Nghỉ phép năm', hasSalary: 1 },
  unpaid: { code: 'UP', nameTypeLeave: 'Nghỉ không lương', hasSalary: 0 },
  sick: { code: 'SL', nameTypeLeave: 'Nghỉ ốm', hasSalary: 1 },
  wedding: { code: 'ML', nameTypeLeave: 'Nghỉ cưới', hasSalary: 1 },
};

const LEGACY_LEAVE_TYPE_NAMES: Record<SeedLeaveTypeKey, string[]> = {
  annual: ['Nghá»‰ phÃ©p nÄƒm'],
  unpaid: ['Nghá»‰ khÃ´ng lÆ°Æ¡ng'],
  sick: ['Nghá»‰ á»‘m'],
  wedding: ['Nghá»‰ cÆ°á»›i'],
};

const DEMO_USERS: Record<SeedUserKey, DemoUserConfig> = {
  hrAdmin: {
    email: 'hr@company.com',
    username: 'HR Admin',
    roleName: 'admin',
    departmentKey: 'hr',
    salaryCoefficient: 3,
  },
  managerKt: {
    email: 'manager.kt@company.com',
    username: 'Manager KT',
    roleName: 'manager',
    departmentKey: 'engineering',
    salaryCoefficient: 2.6,
  },
  employee1: {
    email: 'nguyentranngocduyen11a1@gmail.com',
    username: 'Ngọc Duyên',
    roleName: 'employee',
    departmentKey: 'engineering',
    salaryCoefficient: 1.35,
  },
  employee2: {
    email: 'nv2@company.com',
    username: 'Employee 2',
    roleName: 'employee',
    departmentKey: 'engineering',
    salaryCoefficient: 1.45,
    remainDaysofLeave: 11,
  },
  employeeOT: {
    email: 'nv_ot@company.com',
    username: 'Employee OT',
    roleName: 'employee',
    departmentKey: 'engineering',
    salaryCoefficient: 1.5,
  },
  employeeRejected: {
    email: 'nv_rejected@company.com',
    username: 'Employee Rejected',
    roleName: 'employee',
    departmentKey: 'sales',
    salaryCoefficient: 1.2,
  },
  employeePending: {
    email: 'nv_pending@company.com',
    username: 'Employee Pending',
    roleName: 'employee',
    departmentKey: 'sales',
    salaryCoefficient: 1.25,
  },
};

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly bcrypt: BycyptHashedService,
  ) {}

  async onModuleInit() {
    if (process.env.SKIP_AUTO_SEED === 'true') {
      this.logger.log('SKIP_AUTO_SEED=true, bỏ qua seed tự động.');
      return;
    }

    if (await this.isDatabaseEmpty()) {
      await this.seedDemoData({ force: true });
      return;
    }

    this.logger.log('Database đã có dữ liệu, bỏ qua seed tự động.');
  }

  async seedDemoData(options: SeedOptions = {}) {
    if (!options.force && !(await this.isDatabaseEmpty())) {
      this.logger.log(
        'Database không trống, chỉ chạy seed khi gọi npm run seed.',
      );
      return;
    }

    this.logger.log('Đang seed dữ liệu demo...');

    const passwordHash = await this.bcrypt.hash(DEMO_PASSWORD);
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const businessDays = this.getBusinessDays(year, month, 10);

    await this.prisma.$transaction(
      async (tx) => {
        const roles = await this.seedRoles(tx);
        const departments = await this.seedDepartments(tx);
        const leaveTypes = await this.seedLeaveTypes(tx);

        await this.mergeLegacyDepartments(tx, departments);
        await this.mergeLegacyLeaveTypes(tx, leaveTypes);

        const users = await this.seedUsers(
          tx,
          roles,
          departments,
          passwordHash,
        );

        await this.assignDepartmentManagers(tx, departments, users);

        const timesheets = await this.seedMonthlyTimesheets(
          tx,
          users,
          businessDays,
          month,
          year,
        );

        await this.seedLeaveApplications(tx, users, leaveTypes, month, year);
        await this.seedPayrolls(tx, users, timesheets);
        await this.seedNotifications(tx, users, month, year);
        await this.cleanupLegacySeedData(tx, roles.employee.roleID);

        this.logger.log(
          `Seed hoàn tất: ${Object.keys(users).length} users, ${Object.keys(timesheets).length} monthly timesheets.`,
        );
      },
      {
        timeout: 90000, // Tăng lên 90 giây để xử lý độ trễ mạng lớn
      },
    );
  }

  private async isDatabaseEmpty(): Promise<boolean> {
    const [roleCount, departmentCount, userCount] = await Promise.all([
      this.prisma.role.count(),
      this.prisma.department.count(),
      this.prisma.user.count(),
    ]);

    return roleCount === 0 && departmentCount === 0 && userCount === 0;
  }

  private async seedRoles(tx: Prisma.TransactionClient): Promise<SeedRoleMap> {
    const existingRoles = await tx.role.findMany({
      where: { nameRole: { in: [...ROLE_NAMES] } },
    });

    const existingNames = new Set(existingRoles.map((r) => r.nameRole));
    const missingNames = ROLE_NAMES.filter((name) => !existingNames.has(name));

    if (missingNames.length > 0) {
      await tx.role.createMany({
        data: missingNames.map((nameRole) => ({ nameRole })),
        skipDuplicates: true,
      });
    }

    const allRoles = await tx.role.findMany({
      where: { nameRole: { in: [...ROLE_NAMES] } },
    });

    return Object.fromEntries(
      allRoles.map((role) => [role.nameRole, role]),
    ) as SeedRoleMap;
  }

  private async seedDepartments(
    tx: Prisma.TransactionClient,
  ): Promise<SeedDepartmentMap> {
    const entries = await Promise.all(
      Object.entries(DEPARTMENTS).map(async ([key, departmentName]) => {
        const department = await tx.department.upsert({
          where: { departmentName },
          update: { departmentName },
          create: { departmentName },
        });

        return [key, department] as const;
      }),
    );

    return Object.fromEntries(entries) as SeedDepartmentMap;
  }

  private async seedLeaveTypes(
    tx: Prisma.TransactionClient,
  ): Promise<SeedLeaveTypeMap> {
    const entries = await Promise.all(
      Object.entries(LEAVE_TYPES).map(async ([key, data]) => {
        const existing = await tx.typeLeave.findFirst({
          where: { nameTypeLeave: data.nameTypeLeave },
        });

        const typeLeave = existing
          ? await tx.typeLeave.update({
              where: { typeLeaveID: existing.typeLeaveID },
              data,
            })
          : await tx.typeLeave.create({ data });

        return [key, typeLeave] as const;
      }),
    );

    return Object.fromEntries(entries) as SeedLeaveTypeMap;
  }

  private async seedUsers(
    tx: Prisma.TransactionClient,
    roles: SeedRoleMap,
    departments: SeedDepartmentMap,
    passwordHash: string,
  ): Promise<SeedUserMap> {
    const entries = await Promise.all(
      Object.entries(DEMO_USERS).map(async ([key, config]) => {
        const user = await this.upsertUser(tx, {
          email: config.email,
          username: config.username,
          roleId: roles[config.roleName].roleID,
          departmentID: departments[config.departmentKey].departmentID,
          salaryCoefficient: config.salaryCoefficient,
          remainDaysofLeave: config.remainDaysofLeave,
          hashedPassword: passwordHash,
        });

        return [key, user] as const;
      }),
    );

    return Object.fromEntries(entries) as SeedUserMap;
  }

  private async upsertUser(
    tx: Prisma.TransactionClient,
    data: {
      email: string;
      username: string;
      roleId: string;
      departmentID: string;
      salaryCoefficient: number;
      hashedPassword: string;
      remainDaysofLeave?: number;
    },
  ): Promise<User> {
    const userData = {
      username: data.username,
      hashedPassword: data.hashedPassword,
      roleId: data.roleId,
      departmentID: data.departmentID,
      salaryCoefficient: data.salaryCoefficient,
      remainDaysofLeave: data.remainDaysofLeave ?? 12,
      totalDaysofLeave: 12,
      isActive: true,
    };

    return tx.user.upsert({
      where: { email: data.email },
      update: userData,
      create: {
        email: data.email,
        ...userData,
      },
    });
  }

  private async assignDepartmentManagers(
    tx: Prisma.TransactionClient,
    departments: SeedDepartmentMap,
    users: SeedUserMap,
  ) {
    await Promise.all([
      tx.department.update({
        where: { departmentID: departments.engineering.departmentID },
        data: { managerID: users.managerKt.userID },
      }),
      tx.department.update({
        where: { departmentID: departments.hr.departmentID },
        data: { managerID: users.hrAdmin.userID },
      }),
    ]);
  }

  private async seedMonthlyTimesheets(
    tx: Prisma.TransactionClient,
    users: SeedUserMap,
    businessDays: Date[],
    month: number,
    year: number,
  ): Promise<SeedTimesheetMap> {
    const managerTimesheet = await this.upsertMonthlyTimesheet(tx, {
      userID: users.managerKt.userID,
      month,
      year,
      status: MonthlyTimesheetStatus.DRAFT,
      isSubmitted: false,
      canSubmit: true,
    });

    const employee1Timesheet = await this.upsertMonthlyTimesheet(tx, {
      userID: users.employee1.userID,
      month,
      year,
      status: MonthlyTimesheetStatus.SUBMITTED,
      isSubmitted: true,
      canSubmit: false,
    });

    const employee2Timesheet = await this.upsertMonthlyTimesheet(tx, {
      userID: users.employee2.userID,
      month,
      year,
      status: MonthlyTimesheetStatus.APPROVED,
      isSubmitted: true,
      canSubmit: false,
      approvedById: users.managerKt.userID,
      reviewedAt: new Date(),
    });

    const employeeOTTimesheet = await this.upsertMonthlyTimesheet(tx, {
      userID: users.employeeOT.userID,
      month,
      year,
      status: MonthlyTimesheetStatus.APPROVED,
      isSubmitted: true,
      canSubmit: false,
      approvedById: users.managerKt.userID,
      reviewedAt: new Date(),
    });

    const employeeRejectedTimesheet = await this.upsertMonthlyTimesheet(tx, {
      userID: users.employeeRejected.userID,
      month,
      year,
      status: MonthlyTimesheetStatus.REJECTED,
      isSubmitted: true,
      canSubmit: false,
      approvedById: users.hrAdmin.userID,
      reviewedAt: new Date(),
      reasonReject: 'Thiếu minh chứng cho các ngày nghỉ không phép.',
    });

    const employeePendingTimesheet = await this.upsertMonthlyTimesheet(tx, {
      userID: users.employeePending.userID,
      month,
      year,
      status: MonthlyTimesheetStatus.SUBMITTED,
      isSubmitted: true,
      canSubmit: false,
    });

    await this.seedTimesheetEntries(
      tx,
      managerTimesheet.monthlyTimesheetID,
      businessDays,
      {
        status: TimesheetStatus.PENDING,
        ipAddress: '192.168.1.10',
        lateOnIndex: 3,
      },
    );

    await this.seedTimesheetEntries(
      tx,
      employee1Timesheet.monthlyTimesheetID,
      businessDays,
      {
        status: TimesheetStatus.PENDING,
        ipAddress: '192.168.1.20',
        lateOnIndex: 2,
        missingCheckoutOnIndex: 5,
      },
    );

    await this.seedTimesheetEntries(
      tx,
      employee2Timesheet.monthlyTimesheetID,
      businessDays,
      {
        status: TimesheetStatus.APPROVED,
        ipAddress: '192.168.1.21',
        lateOnIndex: 1,
      },
    );

    await this.seedTimesheetEntries(
      tx,
      employeeOTTimesheet.monthlyTimesheetID,
      businessDays,
      {
        status: TimesheetStatus.APPROVED,
        ipAddress: '192.168.1.30',
        isOT: true,
      },
    );

    await this.seedTimesheetEntries(
      tx,
      employeeRejectedTimesheet.monthlyTimesheetID,
      businessDays,
      {
        status: TimesheetStatus.REJECTED,
        ipAddress: '192.168.1.40',
      },
    );

    await this.seedTimesheetEntries(
      tx,
      employeePendingTimesheet.monthlyTimesheetID,
      businessDays,
      {
        status: TimesheetStatus.PENDING,
        ipAddress: '192.168.1.50',
      },
    );

    return {
      managerKt: managerTimesheet,
      employee1: employee1Timesheet,
      employee2: employee2Timesheet,
      employeeOT: employeeOTTimesheet,
      employeeRejected: employeeRejectedTimesheet,
      employeePending: employeePendingTimesheet,
    };
  }

  private async upsertMonthlyTimesheet(
    tx: Prisma.TransactionClient,
    data: {
      userID: string;
      month: number;
      year: number;
      status: MonthlyTimesheetStatus;
      isSubmitted: boolean;
      canSubmit: boolean;
      approvedById?: string | null;
      reviewedAt?: Date | null;
      reasonReject?: string | null;
    },
  ): Promise<MonthlyTimesheet> {
    const monthlyTimesheetData = {
      status: data.status,
      isSubmitted: data.isSubmitted,
      canSubmit: data.canSubmit,
      approvedById: data.approvedById ?? null,
      reviewedAt: data.reviewedAt ?? null,
      reasonReject: data.reasonReject ?? null,
    };

    return tx.monthlyTimesheet.upsert({
      where: {
        userID_month_year: {
          userID: data.userID,
          month: data.month,
          year: data.year,
        },
      },
      update: monthlyTimesheetData,
      create: {
        userID: data.userID,
        month: data.month,
        year: data.year,
        ...monthlyTimesheetData,
      },
    });
  }

  private async seedTimesheetEntries(
    tx: Prisma.TransactionClient,
    monthlyTimesheetID: string,
    days: Date[],
    options: {
      status: TimesheetStatus;
      ipAddress: string;
      lateOnIndex?: number;
      missingCheckoutOnIndex?: number;
      isOT?: boolean;
    },
  ) {
    const dateKeys = days.map((day) => this.formatDateKey(day));
    const existingEntries = await tx.timesheetEntry.findMany({
      where: {
        monthlyTimesheetID,
        date: { in: dateKeys },
      },
    });

    const existingMap = new Map(existingEntries.map((e) => [e.date, e]));

    for (const [index, day] of days.entries()) {
      const isLate = options.lateOnIndex === index;
      const isMissingCheckout = options.missingCheckoutOnIndex === index;
      const date = this.formatDateKey(day);
      const checkIn = this.withTime(day, isLate ? 8 : 7, isLate ? 45 : 55);

      // If isOT is true, set checkout to 19:30 (2.5 hours extra if base is 17:00)
      const checkOut = isMissingCheckout
        ? null
        : this.withTime(
            day,
            options.isOT ? 19 : 17,
            options.isOT ? 30 : index % 3 === 0 ? 45 : 30,
          );

      const existing = existingMap.get(date);
      const data = {
        status: isMissingCheckout ? TimesheetStatus.PENDING : options.status,
        checkIn,
        checkOut,
        IPAddress: options.ipAddress,
        canRequestCorrection: true,
      };

      if (existing) {
        await tx.timesheetEntry.update({
          where: { timesheetEntryID: existing.timesheetEntryID },
          data,
        });
      } else {
        await tx.timesheetEntry.create({
          data: {
            monthlyTimesheetID,
            date,
            ...data,
          },
        });
      }
    }
  }

  private async seedPayrolls(
    tx: Prisma.TransactionClient,
    users: SeedUserMap,
    timesheets: SeedTimesheetMap,
  ) {
    // Payroll for employee2 (approved, no OT)
    await this.upsertPayroll(tx, {
      userID: users.employee2.userID,
      month: timesheets.employee2.month,
      year: timesheets.employee2.year,
      monthlyTimesheetID: timesheets.employee2.monthlyTimesheetID,
      totalHours: 160,
      totalExtraHours: 0,
      totalSalaryByHours: 160 * 100000 * users.employee2.salaryCoefficient, // Giả sử base 100k
    });

    // Payroll for employeeOT (approved, many OT hours)
    await this.upsertPayroll(tx, {
      userID: users.employeeOT.userID,
      month: timesheets.employeeOT.month,
      year: timesheets.employeeOT.year,
      monthlyTimesheetID: timesheets.employeeOT.monthlyTimesheetID,
      totalHours: 160,
      totalExtraHours: 25.5, // Nhiều giờ OT
      totalSalaryByHours:
        (160 + 25.5 * 1.5) * 100000 * users.employeeOT.salaryCoefficient,
    });
  }

  private async upsertPayroll(
    tx: Prisma.TransactionClient,
    data: {
      userID: string;
      month: number;
      year: number;
      monthlyTimesheetID: string;
      totalHours: number;
      totalExtraHours: number;
      totalSalaryByHours: number;
    },
  ) {
    const existing = await tx.payroll.findFirst({
      where: {
        userID: data.userID,
        month: data.month,
        year: data.year,
      },
    });

    const payload = {
      monthlyTimesheetID: data.monthlyTimesheetID,
      totalHours: data.totalHours,
      totalExtraHours: data.totalExtraHours,
      totalSalaryByHours: data.totalSalaryByHours,
    };

    if (existing) {
      return tx.payroll.update({
        where: { payrollID: existing.payrollID },
        data: payload,
      });
    }

    return tx.payroll.create({
      data: {
        userID: data.userID,
        month: data.month,
        year: data.year,
        ...payload,
      },
    });
  }

  private async seedLeaveApplications(
    tx: Prisma.TransactionClient,
    users: SeedUserMap,
    leaveTypes: SeedLeaveTypeMap,
    month: number,
    year: number,
  ) {
    await this.upsertLeaveApplication(tx, {
      senderID: users.employee1.userID,
      reviewerID: null,
      typeLeaveID: leaveTypes.annual.typeLeaveID,
      startDate: this.fixedDate(year, month, 12),
      endDate: this.fixedDate(year, month, 13),
      duration: 2,
      reason: 'Nghỉ phép gia đình',
      status: LeaveStatus.PENDING,
    });

    await this.upsertLeaveApplication(tx, {
      senderID: users.employee2.userID,
      reviewerID: users.managerKt.userID,
      typeLeaveID: leaveTypes.sick.typeLeaveID,
      startDate: this.fixedDate(year, month, 5),
      endDate: this.fixedDate(year, month, 5),
      duration: 1,
      reason: 'Nghỉ ốm có giấy xác nhận',
      status: LeaveStatus.APPROVED,
      reviewedAt: new Date(),
    });

    await this.upsertLeaveApplication(tx, {
      senderID: users.employee1.userID,
      reviewerID: users.managerKt.userID,
      typeLeaveID: leaveTypes.unpaid.typeLeaveID,
      startDate: this.fixedDate(year, month, 20),
      endDate: this.fixedDate(year, month, 20),
      duration: 1,
      reason: 'Việc cá nhân đột xuất',
      status: LeaveStatus.REJECTED,
      reasonReject: 'Lịch trực trong ngày đã kín.',
      reviewedAt: new Date(),
    });
  }

  private async upsertLeaveApplication(
    tx: Prisma.TransactionClient,
    data: {
      senderID: string;
      reviewerID: string | null;
      typeLeaveID: string;
      startDate: Date;
      endDate: Date;
      duration: number;
      reason: string;
      status: LeaveStatus;
      reasonReject?: string;
      reviewedAt?: Date;
    },
  ) {
    const existing = await tx.leaveApplication.findFirst({
      where: {
        senderID: data.senderID,
        typeLeaveID: data.typeLeaveID,
        startDate: data.startDate,
        endDate: data.endDate,
      },
    });
    const payload = {
      reviewerID: data.reviewerID,
      duration: data.duration,
      reason: data.reason,
      status: data.status,
      reasonReject: data.reasonReject ?? null,
      reviewedAt: data.reviewedAt ?? null,
    };

    if (existing) {
      return tx.leaveApplication.update({
        where: { leaveApplicationID: existing.leaveApplicationID },
        data: payload,
      });
    }

    return tx.leaveApplication.create({
      data: {
        senderID: data.senderID,
        typeLeaveID: data.typeLeaveID,
        startDate: data.startDate,
        endDate: data.endDate,
        ...payload,
      },
    });
  }

  private async seedNotifications(
    tx: Prisma.TransactionClient,
    users: SeedUserMap,
    month: number,
    year: number,
  ) {
    const currentPeriod = `${String(month).padStart(2, '0')}/${year}`;

    await this.upsertNotification(tx, {
      senderID: users.employee1.userID,
      receiverID: users.managerKt.userID,
      content: `Bảng công tháng ${currentPeriod} của Employee 1 đang chờ duyệt.`,
      relatedType: NotificationRelatedType.TIMESHEET,
      isRead: false,
      legacyContentIncludes: ['Monthly timesheet', 'Employee 1 needs review'],
    });
    await this.upsertNotification(tx, {
      senderID: users.employee1.userID,
      receiverID: users.managerKt.userID,
      content: 'Employee 1 vừa gửi đơn nghỉ phép năm.',
      relatedType: NotificationRelatedType.LEAVE,
      isRead: false,
      legacyContentIncludes: ['New leave application submitted by Employee 1'],
    });
    await this.upsertNotification(tx, {
      senderID: users.managerKt.userID,
      receiverID: users.employee2.userID,
      content: 'Đơn nghỉ ốm của bạn đã được duyệt.',
      relatedType: NotificationRelatedType.LEAVE,
      isRead: true,
      legacyContentIncludes: ['Your sick leave application has been approved'],
    });
    await this.upsertNotification(tx, {
      senderID: users.managerKt.userID,
      receiverID: users.employee1.userID,
      content:
        'Đơn nghỉ không lương của bạn đã bị từ chối. Lý do: Lịch trực trong ngày đã kín.',
      relatedType: NotificationRelatedType.LEAVE,
      isRead: false,
      legacyContentIncludes: [
        'Your unpaid leave application has been rejected',
      ],
    });
    await this.upsertNotification(tx, {
      senderID: null,
      receiverID: users.employee1.userID,
      content:
        'Bạn có cảnh báo chấm công: thiếu giờ check-out trong tháng này.',
      relatedType: NotificationRelatedType.WARNING,
      isRead: false,
      legacyContentIncludes: ['Missed checkout in this month'],
    });
    await this.upsertNotification(tx, {
      senderID: null,
      receiverID: users.hrAdmin.userID,
      content: `Dữ liệu demo chấm công và nghỉ phép tháng ${currentPeriod} đã sẵn sàng.`,
      relatedType: NotificationRelatedType.TIMESHEET,
      isRead: true,
      legacyContentIncludes: ['Payroll and attendance demo data'],
    });

    await this.upsertNotification(tx, {
      senderID: users.hrAdmin.userID,
      receiverID: users.employeeRejected.userID,
      content:
        'Bảng công tháng này của bạn đã bị từ chối. Lý do: Thiếu minh chứng cho các ngày nghỉ không phép.',
      relatedType: NotificationRelatedType.TIMESHEET,
      isRead: false,
    });

    await this.upsertNotification(tx, {
      senderID: users.employeePending.userID,
      receiverID: users.hrAdmin.userID,
      content: `Nhân viên ${users.employeePending.username} đã gửi bảng công tháng ${currentPeriod} chờ duyệt.`,
      relatedType: NotificationRelatedType.TIMESHEET,
      isRead: false,
    });

    // Additional notifications for smoothing the demo
    await this.upsertNotification(tx, {
      senderID: users.employee1.userID,
      receiverID: users.managerKt.userID,
      content: 'Employee 1 vừa gửi yêu cầu chỉnh sửa giờ check-in ngày 15/05.',
      relatedType: NotificationRelatedType.TIMESHEET,
      isRead: false,
    });

    await this.upsertNotification(tx, {
      senderID: null,
      receiverID: users.employeeOT.userID,
      content:
        'Chào mừng! Bạn đã hoàn thành 100% mục tiêu giờ làm việc tuần này.',
      relatedType: NotificationRelatedType.WARNING,
      isRead: true,
    });

    await this.upsertNotification(tx, {
      senderID: users.hrAdmin.userID,
      receiverID: users.managerKt.userID,
      content: 'Thông báo: Hệ thống sẽ bảo trì vào lúc 23:00 tối nay.',
      relatedType: NotificationRelatedType.WARNING,
      isRead: false,
    });
  }

  private async upsertNotification(
    tx: Prisma.TransactionClient,
    data: {
      senderID: string | null;
      receiverID: string;
      content: string;
      relatedType: NotificationRelatedType;
      isRead: boolean;
      legacyContentIncludes?: string[];
    },
  ) {
    const senderWhere =
      data.senderID === null ? { senderID: null } : { senderID: data.senderID };

    const existing = await tx.notification.findFirst({
      where: {
        receiverID: data.receiverID,
        relatedType: data.relatedType,
        ...senderWhere,
        OR: [
          { content: data.content },
          ...(data.legacyContentIncludes ?? []).map((content) => ({
            content: { contains: content },
          })),
        ],
      },
    });

    const payload = {
      senderID: data.senderID,
      receiverID: data.receiverID,
      content: data.content,
      relatedType: data.relatedType,
      isRead: data.isRead,
    };

    if (existing) {
      return tx.notification.update({
        where: { notificationID: existing.notificationID },
        data: payload,
      });
    }

    return tx.notification.create({ data: payload });
  }

  private async mergeLegacyDepartments(
    tx: Prisma.TransactionClient,
    departments: SeedDepartmentMap,
  ) {
    for (const [key, legacyNames] of Object.entries(
      LEGACY_DEPARTMENT_NAMES,
    ) as Array<[SeedDepartmentKey, string[]]>) {
      const canonicalDepartment = departments[key];
      const legacyDepartments = await tx.department.findMany({
        where: {
          departmentName: { in: legacyNames },
        },
      });

      for (const legacyDepartment of legacyDepartments) {
        if (
          legacyDepartment.departmentID === canonicalDepartment.departmentID
        ) {
          continue;
        }

        await tx.user.updateMany({
          where: { departmentID: legacyDepartment.departmentID },
          data: { departmentID: canonicalDepartment.departmentID },
        });

        await tx.department.delete({
          where: { departmentID: legacyDepartment.departmentID },
        });
      }
    }
  }

  private async mergeLegacyLeaveTypes(
    tx: Prisma.TransactionClient,
    leaveTypes: SeedLeaveTypeMap,
  ) {
    for (const [key, legacyNames] of Object.entries(
      LEGACY_LEAVE_TYPE_NAMES,
    ) as Array<[SeedLeaveTypeKey, string[]]>) {
      const canonicalType = leaveTypes[key];
      const duplicateTypes = await tx.typeLeave.findMany({
        where: {
          nameTypeLeave: {
            in: [canonicalType.nameTypeLeave, ...legacyNames],
          },
        },
      });

      for (const duplicateType of duplicateTypes) {
        if (duplicateType.typeLeaveID === canonicalType.typeLeaveID) {
          continue;
        }

        await tx.leaveApplication.updateMany({
          where: { typeLeaveID: duplicateType.typeLeaveID },
          data: { typeLeaveID: canonicalType.typeLeaveID },
        });

        const applicationsCount = await tx.leaveApplication.count({
          where: { typeLeaveID: duplicateType.typeLeaveID },
        });

        if (applicationsCount === 0) {
          await tx.typeLeave.delete({
            where: { typeLeaveID: duplicateType.typeLeaveID },
          });
        }
      }
    }
  }

  private async cleanupLegacySeedData(
    tx: Prisma.TransactionClient,
    employeeRoleID: string,
  ) {
    const legacyEmployeeRole = await tx.role.findUnique({
      where: { nameRole: 'emloyee' },
    });

    if (legacyEmployeeRole) {
      await tx.user.updateMany({
        where: { roleId: legacyEmployeeRole.roleID },
        data: { roleId: employeeRoleID },
      });
      await this.deleteRoleIfUnused(tx, legacyEmployeeRole.roleID);
    }

    const noneRole = await tx.role.findUnique({
      where: { nameRole: 'none Role' },
    });

    if (noneRole) {
      await this.deleteRoleIfUnused(tx, noneRole.roleID);
    }

    await this.deleteLegacyAdminIfUnused(tx);
  }

  private async deleteRoleIfUnused(
    tx: Prisma.TransactionClient,
    roleID: string,
  ) {
    const usersInRole = await tx.user.count({ where: { roleId: roleID } });

    if (usersInRole === 0) {
      await tx.role.delete({ where: { roleID } });
    }
  }

  private async deleteLegacyAdminIfUnused(tx: Prisma.TransactionClient) {
    const legacyAdmin = await tx.user.findUnique({
      where: { email: 'admin@gmail.com' },
      select: { userID: true, username: true },
    });

    if (!legacyAdmin || legacyAdmin.username !== 'admin') {
      return;
    }

    const relationCounts = await Promise.all([
      tx.department.count({ where: { managerID: legacyAdmin.userID } }),
      tx.monthlyTimesheet.count({ where: { userID: legacyAdmin.userID } }),
      tx.monthlyTimesheet.count({
        where: { approvedById: legacyAdmin.userID },
      }),
      tx.leaveApplication.count({ where: { senderID: legacyAdmin.userID } }),
      tx.leaveApplication.count({ where: { reviewerID: legacyAdmin.userID } }),
      tx.notification.count({ where: { senderID: legacyAdmin.userID } }),
      tx.notification.count({ where: { receiverID: legacyAdmin.userID } }),
      tx.warning.count({ where: { userID: legacyAdmin.userID } }),
      tx.payroll.count({ where: { userID: legacyAdmin.userID } }),
      tx.requestCorrection.count({ where: { userID: legacyAdmin.userID } }),
      tx.requestCorrection.count({ where: { reviewerID: legacyAdmin.userID } }),
    ]);

    if (relationCounts.every((count) => count === 0)) {
      await tx.user.delete({ where: { userID: legacyAdmin.userID } });
    }
  }

  private getBusinessDays(year: number, month: number, count: number): Date[] {
    const days: Date[] = [];
    const lastDay = new Date(year, month, 0).getDate();

    for (let day = 1; day <= lastDay && days.length < count; day += 1) {
      const date = new Date(year, month - 1, day);
      const weekday = date.getDay();

      if (weekday !== 0 && weekday !== 6) {
        days.push(date);
      }
    }

    return days;
  }

  private fixedDate(year: number, month: number, preferredDay: number): Date {
    const lastDay = new Date(year, month, 0).getDate();
    return new Date(
      year,
      month - 1,
      Math.min(preferredDay, lastDay),
      0,
      0,
      0,
      0,
    );
  }

  private withTime(date: Date, hour: number, minute: number): Date {
    return new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      hour,
      minute,
      0,
      0,
    );
  }

  private formatDateKey(date: Date): string {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${date.getFullYear()}-${month}-${day}`;
  }
}
