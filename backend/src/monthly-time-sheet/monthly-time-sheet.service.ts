import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import CreateMonthlyTimeSheetDto from './dto/create-timesheet.dto';
import ResponseDto, { DefaultResponse } from 'src/common/response.dto';
import {
  CREATED_RESPONE,
  Interval_Server_Network_Exeception_Code,
  NOTFOUND_CODE,
  OK_CODE,
} from 'src/common/code';
import {
  MonthlyTimesheetStatus,
  TimesheetStatus,
  NotificationRelatedType,
} from '@prisma/client';
import GetMonthlyTimeSheetDto from './dto/get-timesheet.dto';
import { UserService } from 'src/user/user.service';
import { DepartmentService } from 'src/department/department.service';
import { MonthlyTimesheeetResponeDto } from './dto/monthly-tinesheet-respone.dto';
import ReviewMonthlyTimesheetDto from './dto/review-monthly-timesheet.dto';
import ReportTimesheetDto from './dto/report-timesheet.dto';
import { NotificationService } from 'src/notification/notification.service';
import { Prisma } from '@prisma/client';
import { EmailService } from 'src/common/email.service';
import { ExcelHelper } from 'src/common/excel.helper';
import { RequestUser } from 'src/common/types';
import * as ExcelJS from 'exceljs';

interface TimesheetReportFilters {
  fromDate?: string;
  toDate?: string;
  employeeId?: string;
  departmentId?: string;
  status?: string;
}

interface TimesheetReportRow {
  id: string;
  code: string;
  monthlyTimesheetID: string;
  timesheetEntryID: string;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  departmentId: string;
  departmentName: string;
  workDate: string;
  date: string;
  checkIn: string;
  checkOut: string;
  totalHours: number;
  status: string;
  monthlyStatus: string;
  entryStatus: string;
  locked: boolean;
  warnings: string[];
}

interface TimesheetReportSummary {
  totalRecords: number;
  totalEmployees: number;
  totalHours: number;
  pending: number;
  submitted: number;
  approved: number;
  rejected: number;
  missingOut: number;
  warningRecords: number;
  byStatus: Record<string, number>;
}

interface TimesheetReportData {
  filters: TimesheetReportFilters;
  rows: TimesheetReportRow[];
  summary: TimesheetReportSummary;
}

@Injectable()
export class MonthlyTimeSheetService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly userService: UserService,
    private readonly departmentService: DepartmentService,
    private readonly notificationService: NotificationService,
    private readonly emailService: EmailService,
  ) {}

  async refreshCanSubmit(
    monthlyTimesheetID: string,
    tx?: Prisma.TransactionClient,
  ): Promise<boolean> {
    const db: Prisma.TransactionClient = tx ?? this.prismaService;
    const timesheet = await db.monthlyTimesheet.findUnique({
      where: { monthlyTimesheetID },
      include: {
        entries: true,
        corrections: {
          where: { status: TimesheetStatus.PENDING },
        },
      },
    });

    if (!timesheet) return false;

    const hasEntries = timesheet.entries.length > 0;
    const hasPendingCorrection = timesheet.corrections.length > 0;
    const isLocked =
      timesheet.status === MonthlyTimesheetStatus.APPROVED ||
      timesheet.status === MonthlyTimesheetStatus.SUBMITTED;
    const canSubmit = hasEntries && !hasPendingCorrection && !isLocked;

    await db.monthlyTimesheet.update({
      where: { monthlyTimesheetID },
      data: { canSubmit },
    });

    return canSubmit;
  }

  async getMonthlyTimeSheet(
    userID: string,
    getMonthlyTimeSheetDto: GetMonthlyTimeSheetDto,
    tx?: Prisma.TransactionClient,
  ): Promise<ResponseDto<MonthlyTimesheeetResponeDto>> {
    const { month, year } = getMonthlyTimeSheetDto;

    const dCbt: Prisma.TransactionClient = tx ?? this.prismaService;
    const timesheet = await dCbt.monthlyTimesheet.findFirst({
      where: {
        userID,
        month,
        year,
      },
    });

    if (timesheet === null)
      return {
        statusCode: NOTFOUND_CODE,
        message: 'Không có bảng công',
      };
    const canSubmit = await this.refreshCanSubmit(
      timesheet.monthlyTimesheetID,
      dCbt,
    );
    return {
      statusCode: OK_CODE,
      message: 'get timesheet successfull',
      data: {
        monthlyTimesheetID: timesheet.monthlyTimesheetID,
        userID: timesheet.userID,
        month: timesheet.month,
        year: timesheet.year,
        status: timesheet.status,
        canSubmit,
        isSubmitted: timesheet.isSubmitted,
        reasonReject: timesheet.reasonReject,
        reviewedAt: timesheet.reviewedAt,
      },
    };
  }

  async getTimesheetReport(
    query: ReportTimesheetDto,
    currentUser?: RequestUser,
  ): Promise<TimesheetReportData> {
    const filters = await this.normalizeReportFilters(query, currentUser);
    const entryWhere: Prisma.TimesheetEntryWhereInput = {};

    if (filters.fromDate || filters.toDate) {
      entryWhere.date = {};
      if (filters.fromDate) entryWhere.date.gte = filters.fromDate;
      if (filters.toDate) entryWhere.date.lte = filters.toDate;
    }

    const where: Prisma.MonthlyTimesheetWhereInput = {};
    const monthlyStatus = this.toMonthlyStatusFilter(filters.status);

    if (filters.employeeId) {
      where.userID = filters.employeeId;
    }

    if (filters.departmentId) {
      where.employee = { departmentID: filters.departmentId };
    }

    if (monthlyStatus) {
      where.status = monthlyStatus;
    }

    if (Object.keys(entryWhere).length > 0) {
      where.entries = { some: entryWhere };
    }

    const timesheets = await this.prismaService.monthlyTimesheet.findMany({
      where,
      include: {
        employee: {
          select: {
            userID: true,
            username: true,
            email: true,
            departmentID: true,
            department: {
              select: {
                departmentID: true,
                departmentName: true,
              },
            },
          },
        },
        entries: {
          where: entryWhere,
          orderBy: { date: 'asc' },
        },
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });

    const rows = timesheets.flatMap((timesheet) =>
      timesheet.entries.map((entry) =>
        this.toReportRow({
          monthlyTimesheetID: timesheet.monthlyTimesheetID,
          month: timesheet.month,
          year: timesheet.year,
          status: timesheet.status,
          employee: timesheet.employee,
          entry,
        }),
      ),
    );

    rows.sort((left, right) => right.workDate.localeCompare(left.workDate));

    return {
      filters,
      rows,
      summary: this.buildTimesheetReportSummary(rows),
    };
  }

  async getMonthlyTimesheetsForReview(
    month: number,
    year: number,
    currentManagerId?: string,
  ): Promise<DefaultResponse> {
    if (!currentManagerId) {
      throw new BadRequestException('Manager userID is required');
    }

    if (
      !Number.isInteger(month) ||
      month < 1 ||
      month > 12 ||
      !Number.isInteger(year) ||
      year < 1900
    ) {
      throw new BadRequestException('Invalid month or year');
    }

    const timesheets = await this.prismaService.monthlyTimesheet.findMany({
      where: {
        month,
        year,
        status: MonthlyTimesheetStatus.SUBMITTED,
        employee: {
          department: {
            managerID: currentManagerId,
          },
        },
      },
      include: {
        employee: {
          include: {
            department: true,
          },
        },
        entries: {
          orderBy: { date: 'asc' },
        },
      },
      orderBy: [{ createdAt: 'desc' }, { monthlyTimesheetID: 'asc' }],
    });

    return {
      statusCode: OK_CODE,
      message: 'get monthly timesheets for review successfull',
      data: timesheets,
    };
  }

  async exportPersonalTimesheetCsv(
    userID: string,
    month: number,
    year: number,
    format: string = 'csv',
  ): Promise<string> {
    if (format.toLowerCase() !== 'csv')
      throw new BadRequestException('Only csv format is supported');

    const timesheet = await this.prismaService.monthlyTimesheet.findFirst({
      where: { userID, month, year },
      include: { entries: true },
    });

    if (!timesheet) throw new NotFoundException('This timesheet isnt exist');

    return this.buildCsvFromEntries(timesheet.entries);
  }

  private buildCsvFromEntries(
    entries: Array<{
      date: string;
      checkIn: Date;
      checkOut: Date | null;
      status: string;
    }>,
  ): string {
    const header = ['Ngày', 'Check-in', 'Check-out', 'Tổng giờ', 'Trạng thái'];
    const rows = entries
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((entry) => {
        const checkIn = this.formatDateTime(entry.checkIn);
        const checkOut = entry.checkOut
          ? this.formatDateTime(entry.checkOut)
          : '';
        const totalHours = entry.checkOut
          ? (
              (new Date(entry.checkOut).getTime() -
                new Date(entry.checkIn).getTime()) /
              3600000
            ).toFixed(2)
          : '';
        return [entry.date, checkIn, checkOut, totalHours, entry.status]
          .map((value) => this.csvEscape(value))
          .join(',');
      });

    return [
      header.map((value) => this.csvEscape(value)).join(','),
      ...rows,
    ].join('\r\n');
  }

  private formatDateTime(value: Date): string {
    const date = new Date(value);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }

  private csvEscape(value: string): string {
    const escaped = value.replace(/"/g, '""');
    return `"${escaped}"`;
  }

  private async normalizeReportFilters(
    query: ReportTimesheetDto,
    currentUser?: RequestUser,
  ): Promise<TimesheetReportFilters> {
    const requestedDepartmentId = this.cleanFilterValue(
      query.departmentId || query.departmentID,
    );
    const employeeId = this.cleanFilterValue(query.employeeId || query.userID);
    const roleName = String(
      currentUser?.roleName || currentUser?.role || '',
    ).toLowerCase();
    const isAdmin = roleName === 'admin' || roleName === 'hr';
    let departmentId = requestedDepartmentId;

    if (!isAdmin) {
      const managerDepartmentId =
        currentUser?.departmentID ||
        (currentUser?.userID
          ? await this.getUserDepartmentID(currentUser.userID)
          : '');

      if (!managerDepartmentId) {
        throw new BadRequestException('Manager department is required');
      }

      if (
        requestedDepartmentId &&
        requestedDepartmentId !== managerDepartmentId
      ) {
        throw new ForbiddenException(
          'Managers can only view their own department report',
        );
      }

      departmentId = managerDepartmentId;
    }

    return {
      fromDate: this.cleanFilterValue(query.fromDate),
      toDate: this.cleanFilterValue(query.toDate),
      employeeId,
      departmentId,
      status: this.normalizeReportStatusFilter(query.status),
    };
  }

  private cleanFilterValue(value?: string): string | undefined {
    const normalized = String(value || '').trim();
    if (!normalized || normalized.toLowerCase() === 'all') return undefined;
    return normalized;
  }

  private normalizeReportStatusFilter(status?: string): string | undefined {
    const normalized = String(status || '')
      .trim()
      .toLowerCase()
      .replace(/[\s_-]+/g, '');

    switch (normalized) {
      case '':
      case 'all':
        return undefined;
      case 'draft':
      case 'pending':
        return 'Pending';
      case 'submitted':
        return 'Submitted';
      case 'approved':
      case 'accepted':
        return 'Approved';
      case 'rejected':
        return 'Rejected';
      default:
        return status?.trim();
    }
  }

  private toMonthlyStatusFilter(
    status?: string,
  ): MonthlyTimesheetStatus | undefined {
    switch (
      String(status || '')
        .trim()
        .toLowerCase()
    ) {
      case 'pending':
      case 'draft':
        return MonthlyTimesheetStatus.DRAFT;
      case 'submitted':
        return MonthlyTimesheetStatus.SUBMITTED;
      case 'approved':
      case 'accepted':
        return MonthlyTimesheetStatus.APPROVED;
      case 'rejected':
        return MonthlyTimesheetStatus.REJECTED;
      default:
        return undefined;
    }
  }

  private async getUserDepartmentID(userID: string): Promise<string> {
    const user = await this.prismaService.user.findUnique({
      where: { userID },
      select: { departmentID: true },
    });

    return user?.departmentID || '';
  }

  private toReportRow(input: {
    monthlyTimesheetID: string;
    month: number;
    year: number;
    status: MonthlyTimesheetStatus;
    employee: {
      userID: string;
      username: string;
      email: string;
      departmentID: string | null;
      department: {
        departmentID: string;
        departmentName: string;
      } | null;
    };
    entry: {
      timesheetEntryID: string;
      date: string;
      status: TimesheetStatus;
      checkIn: Date;
      checkOut: Date | null;
      isWarning: boolean;
    };
  }): TimesheetReportRow {
    const status = this.toReportDisplayStatus(input.status);
    const employeeId = input.employee.userID;
    const monthText = String(input.month).padStart(2, '0');
    const shortEmployeeId = employeeId.slice(0, 8).toUpperCase();

    return {
      id: input.entry.timesheetEntryID,
      code: `TS-${input.year}${monthText}-${shortEmployeeId}`,
      monthlyTimesheetID: input.monthlyTimesheetID,
      timesheetEntryID: input.entry.timesheetEntryID,
      employeeId,
      employeeName: input.employee.username || input.employee.email,
      employeeEmail: input.employee.email,
      departmentId:
        input.employee.department?.departmentID ||
        input.employee.departmentID ||
        '',
      departmentName: input.employee.department?.departmentName || '',
      workDate: input.entry.date,
      date: input.entry.date,
      checkIn: this.formatTime(input.entry.checkIn),
      checkOut: this.formatTime(input.entry.checkOut),
      totalHours: this.calculateEntryHours(
        input.entry.checkIn,
        input.entry.checkOut,
      ),
      status,
      monthlyStatus: input.status,
      entryStatus: input.entry.status,
      locked: input.status === MonthlyTimesheetStatus.APPROVED,
      warnings: this.buildReportWarnings(input.entry),
    };
  }

  private toReportDisplayStatus(status: MonthlyTimesheetStatus): string {
    switch (status) {
      case MonthlyTimesheetStatus.SUBMITTED:
        return 'Submitted';
      case MonthlyTimesheetStatus.APPROVED:
        return 'Approved';
      case MonthlyTimesheetStatus.REJECTED:
        return 'Rejected';
      case MonthlyTimesheetStatus.DRAFT:
      default:
        return 'Pending';
    }
  }

  private buildReportWarnings(entry: {
    status: TimesheetStatus;
    checkOut: Date | null;
    isWarning: boolean;
  }): string[] {
    const warnings: string[] = [];

    if (!entry.checkOut || entry.status === TimesheetStatus.MISSING_OUT) {
      warnings.push('Missing Out');
    }

    if (entry.isWarning) {
      warnings.push('Warning');
    }

    if (entry.status === TimesheetStatus.REJECTED) {
      warnings.push('Rejected Entry');
    }

    return warnings;
  }

  private formatTime(value?: Date | null): string {
    if (!value) return '';
    const date = new Date(value);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  private calculateEntryHours(checkIn: Date, checkOut?: Date | null): number {
    if (!checkIn || !checkOut) return 0;
    const hours =
      (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 3600000;
    return Math.round(Math.max(hours, 0) * 100) / 100;
  }

  private buildTimesheetReportSummary(
    rows: TimesheetReportRow[],
  ): TimesheetReportSummary {
    const byStatus = rows.reduce<Record<string, number>>((acc, row) => {
      acc[row.status] = (acc[row.status] || 0) + 1;
      return acc;
    }, {});

    const totalHours = rows.reduce(
      (total, row) => total + Number(row.totalHours || 0),
      0,
    );

    return {
      totalRecords: rows.length,
      totalEmployees: new Set(rows.map((row) => row.employeeId)).size,
      totalHours: Math.round(totalHours * 100) / 100,
      pending: byStatus.Pending || 0,
      submitted: byStatus.Submitted || 0,
      approved: byStatus.Approved || 0,
      rejected: byStatus.Rejected || 0,
      missingOut: rows.filter((row) => row.warnings.includes('Missing Out'))
        .length,
      warningRecords: rows.filter((row) => row.warnings.length > 0).length,
      byStatus,
    };
  }

  async createMonthlyTimeSheet(
    userID: string,
    createMonthlyTimeSheetDto: CreateMonthlyTimeSheetDto,
    tx?: Prisma.TransactionClient,
  ): Promise<ResponseDto<MonthlyTimesheeetResponeDto>> {
    const { month, year } = createMonthlyTimeSheetDto;

    try {
      const executeLogic = async (
        dCbt: Prisma.TransactionClient,
      ): Promise<ResponseDto<MonthlyTimesheeetResponeDto>> => {
        const { statusCode, message } = await this.getMonthlyTimeSheet(
          userID,
          {
            month: createMonthlyTimeSheetDto.month,
            year: createMonthlyTimeSheetDto.year,
          },
          dCbt,
        );
        if (statusCode === OK_CODE) throw new ConflictException(message);

        const user = await this.userService.getUserByUserID(userID, dCbt);
        if (
          user.statusCode !== OK_CODE ||
          user.data === undefined ||
          user.data.departmentID === null ||
          user.data.departmentID === undefined
        )
          throw new BadRequestException(user.message);

        const department = await this.departmentService.getDepartmentById(
          user.data.departmentID,
          dCbt,
        );
        if (department.statusCode !== OK_CODE || department.data === undefined)
          throw new BadRequestException(department.message);

        const reviewerID = department.data.managerID;
        if (reviewerID === undefined || reviewerID === null)
          throw new BadRequestException(
            'Please update managerID for this department before create monthly timesheet for this user !!!! ',
          );

        if (statusCode === NOTFOUND_CODE) {
          const timesheet = await dCbt.monthlyTimesheet.create({
            data: {
              userID,
              month,
              year,
              status: MonthlyTimesheetStatus.DRAFT,
            },
          });

          return {
            statusCode: CREATED_RESPONE,
            message: 'Created successfull',
            data: {
              monthlyTimesheetID: timesheet.monthlyTimesheetID,
              userID: timesheet.userID,
              month: timesheet.month,
              year: timesheet.year,
              status: timesheet.status,
              canSubmit: timesheet.canSubmit,
              isSubmitted: timesheet.isSubmitted,
            },
          };
        }

        throw new BadRequestException('Another Error!!!!');
      };

      if (tx) return await executeLogic(tx);
      return await this.prismaService.$transaction(
        async (tx) => executeLogic(tx),
        { timeout: 30000 },
      );
    } catch (error: unknown) {
      if (
        error &&
        typeof error === 'object' &&
        'getStatus' in error &&
        typeof (error as { getStatus?: () => number }).getStatus === 'function'
      ) {
        throw error;
      }
      console.error('Error in createMonthlyTimeSheet:', error);
      return {
        statusCode: Interval_Server_Network_Exeception_Code,
        message: 'Internal server error occurred',
      };
    }
  }

  async SubmitMonthlyTimesheet(
    monthlyTimesheetID: string,
    tx?: Prisma.TransactionClient,
  ): Promise<DefaultResponse> {
    try {
      const executeLogic = async (
        dCbt: Prisma.TransactionClient,
      ): Promise<DefaultResponse> => {
        const monthGet = await dCbt.monthlyTimesheet.findUnique({
          where: {
            monthlyTimesheetID,
          },
          include: {
            entries: true,
            corrections: {
              where: { status: TimesheetStatus.PENDING },
            },
          },
        });

        if (!monthGet) {
          throw new NotFoundException('monthly timesheet is not found');
        }

        if (monthGet.isSubmitted === true)
          throw new BadRequestException('You were submit this timesheet');

        if (monthGet.status === MonthlyTimesheetStatus.APPROVED)
          throw new BadRequestException('Approved monthly timesheet is locked');

        const currentDate = new Date();
        const currentDay = currentDate.getDate();
        const currentMonth = currentDate.getMonth() + 1;
        const currentYear = currentDate.getFullYear();

        if (currentDay < 1 || currentDay > 5) {
          throw new BadRequestException(
            'Bạn chỉ có thể nộp bảng công từ ngày 1 đến ngày 5 hàng tháng.',
          );
        }

        let expectedMonth = currentMonth - 1;
        let expectedYear = currentYear;
        if (expectedMonth === 0) {
          expectedMonth = 12;
          expectedYear = currentYear - 1;
        }

        if (
          monthGet.month !== expectedMonth ||
          monthGet.year !== expectedYear
        ) {
          throw new BadRequestException(
            `Bạn chỉ được phép nộp bảng công của tháng trước (${expectedMonth}/${expectedYear}).`,
          );
        }

        const canSubmit = await this.refreshCanSubmit(
          monthGet.monthlyTimesheetID,
          dCbt,
        );

        if (canSubmit === false)
          throw new BadRequestException(
            'This monthly timesheet cannot be  submitted ',
          );

        await dCbt.monthlyTimesheet.update({
          where: {
            monthlyTimesheetID: monthGet.monthlyTimesheetID,
          },
          data: {
            isSubmitted: true,
            canSubmit: false,
            status: MonthlyTimesheetStatus.SUBMITTED,
          },
        });

        const userGet = await this.userService.getUserByUserID(
          monthGet.userID,
          dCbt,
        );

        if (
          userGet?.statusCode !== OK_CODE ||
          userGet.data === undefined ||
          userGet.data?.departmentID === null ||
          userGet.data?.departmentID === undefined
        )
          throw new NotFoundException(
            'please at departmentID to this employee',
          );

        const department = await this.departmentService.getDepartmentById(
          userGet.data?.departmentID,
          dCbt,
        );

        if (
          department?.statusCode != OK_CODE ||
          department.data === undefined ||
          department.data?.managerID === undefined ||
          department.data?.managerID === null
        )
          throw new NotFoundException(
            'Please add managerID to this department ',
          );
        const notificationGet =
          await this.notificationService.createNotification(
            userGet.data.userID,
            department.data.managerID,
            `Monthly timesheet ${monthGet.month}/${monthGet.year} from ${userGet.data.username} needs review.`,
            NotificationRelatedType.TIMESHEET,
            dCbt,
          );
        if (notificationGet.statusCode !== CREATED_RESPONE)
          throw new BadRequestException(notificationGet.message);

        // --- GỬI EMAIL CHO QUẢN LÝ ---
        try {
          // Lấy email của manager
          const manager = await dCbt.user.findUnique({
            where: { userID: department.data.managerID },
            select: { email: true },
          });
          if (manager?.email) {
            await this.emailService.sendTimesheetNotification({
              recipientEmail: manager.email,
              employeeName: userGet.data.username,
              month: monthGet.month,
              year: monthGet.year,
              status: 'submitted',
            });
          }
        } catch (e) {
          console.error('Email error in SubmitMonthlyTimesheet:', e);
        }

        return {
          statusCode: OK_CODE,
          message: 'submit monthly timesheet successfull',
          data: {
            monthlyTimesheetID: monthGet.monthlyTimesheetID,
            userID: monthGet.userID,
            month: monthGet.month,
            year: monthGet.year,
            status: MonthlyTimesheetStatus.SUBMITTED,
            canSubmit: false,
            isSubmitted: true,
          },
        };
      };

      if (tx) return await executeLogic(tx);

      return await this.prismaService.$transaction(
        async (tx) => executeLogic(tx),
        { timeout: 30000 },
      );
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      // Các lỗi không lường trước (Database rớt mạng, v.v.)
      console.error('Error submitting timesheet:', error);
      return {
        statusCode: Interval_Server_Network_Exeception_Code, // Hoặc HTTP 500
        message: 'Internal server error occurred',
      };
    }
  }

  async reviewMonthlyTimesheet(
    monthlyTimesheetID: string,
    reviewMonthlyTimesheetDto: ReviewMonthlyTimesheetDto,
    reviewerID?: string,
    tx?: Prisma.TransactionClient,
  ): Promise<ResponseDto<MonthlyTimesheeetResponeDto>> {
    const { accept, reasonReject } = reviewMonthlyTimesheetDto;
    try {
      const executeLogic = async (
        dCbt: Prisma.TransactionClient,
      ): Promise<ResponseDto<MonthlyTimesheeetResponeDto>> => {
        if (!accept && !reasonReject?.trim())
          throw new BadRequestException('Reason for rejection is required');

        const monthGet = await dCbt.monthlyTimesheet.findUnique({
          where: {
            monthlyTimesheetID,
          },
        });

        if (
          monthGet === undefined ||
          monthGet?.userID === undefined ||
          monthGet.userID === null
        )
          throw new NotFoundException('Not found ');

        if (monthGet?.isSubmitted === false)
          throw new BadRequestException('This monthly was not submitted ');

        if (monthGet.status === MonthlyTimesheetStatus.APPROVED)
          throw new BadRequestException(
            'This monthly timesheet was already approved',
          );

        const now = new Date();
        const monthlyTimesheetUpdate = await dCbt.monthlyTimesheet.update({
          where: {
            monthlyTimesheetID: monthGet?.monthlyTimesheetID,
          },
          data: {
            status: accept
              ? MonthlyTimesheetStatus.APPROVED
              : MonthlyTimesheetStatus.REJECTED,
            reasonReject: accept ? null : reasonReject?.trim(),
            canSubmit: false,
            isSubmitted: accept ? true : false,
            approvedById: accept ? (reviewerID ?? null) : null,
            reviewedAt: now,
          },
        });

        if (accept) {
          await dCbt.timesheetEntry.updateMany({
            where: {
              monthlyTimesheetID: monthGet.monthlyTimesheetID,
              checkOut: { not: null },
            },
            data: {
              status: TimesheetStatus.APPROVED,
              canRequestCorrection: false,
            },
          });
        } else {
          await dCbt.timesheetEntry.updateMany({
            where: { monthlyTimesheetID: monthGet.monthlyTimesheetID },
            data: {
              status: TimesheetStatus.PENDING,
              canRequestCorrection: true,
            },
          });
        }

        const userGet = await this.userService.getUserByUserID(
          monthGet?.userID,
          dCbt,
        );

        if (
          userGet?.statusCode !== OK_CODE ||
          userGet.data === undefined ||
          userGet.data?.departmentID === null ||
          userGet.data?.departmentID === undefined
        )
          throw new NotFoundException(
            'please at departmentID to this employee',
          );

        const department = await this.departmentService.getDepartmentById(
          userGet.data?.departmentID,
          dCbt,
        );

        if (
          department?.statusCode != OK_CODE ||
          department.data === undefined ||
          department.data?.managerID === undefined ||
          department.data?.managerID === null
        )
          throw new NotFoundException(
            'Please add managerID to this department ',
          );
        const canSubmit = accept
          ? false
          : await this.refreshCanSubmit(monthGet.monthlyTimesheetID, dCbt);
        const reviewStatus = accept ? 'approved' : 'rejected';
        const rejectReason =
          !accept && monthlyTimesheetUpdate.reasonReject
            ? ` Reason: ${monthlyTimesheetUpdate.reasonReject}`
            : '';
        const notificationGet =
          await this.notificationService.createNotification(
            reviewerID ?? department.data.managerID,
            userGet.data.userID,
            `Your monthly timesheet ${monthlyTimesheetUpdate.month}/${monthlyTimesheetUpdate.year} was ${reviewStatus}.${rejectReason}`,
            NotificationRelatedType.TIMESHEET,
            dCbt,
          );
        if (notificationGet.statusCode !== CREATED_RESPONE)
          throw new BadRequestException(notificationGet.message);

        // --- GỬI EMAIL CHO NHÂN VIÊN ---
        try {
          await this.emailService.sendTimesheetNotification({
            recipientEmail: userGet.data.email,
            employeeName: userGet.data.username,
            month: monthlyTimesheetUpdate.month,
            year: monthlyTimesheetUpdate.year,
            status: accept ? 'approved' : 'rejected',
            reason: monthlyTimesheetUpdate.reasonReject ?? undefined,
          });
        } catch (e) {
          console.error('Email error in reviewMonthlyTimesheet:', e);
        }

        return {
          statusCode: OK_CODE,
          message: 'review monthly timesheet successfull',
          data: {
            monthlyTimesheetID: monthlyTimesheetUpdate.monthlyTimesheetID,
            userID: monthlyTimesheetUpdate.userID,
            month: monthlyTimesheetUpdate.month,
            year: monthlyTimesheetUpdate.year,
            status: monthlyTimesheetUpdate.status,
            reasonReject: monthlyTimesheetUpdate.reasonReject,
            canSubmit,
            isSubmitted: monthlyTimesheetUpdate.isSubmitted,
            reviewedAt: monthlyTimesheetUpdate.reviewedAt,
          },
        };
      };

      if (tx) return await executeLogic(tx);

      return await this.prismaService.$transaction(
        async (tx) => executeLogic(tx),
        { timeout: 30000 },
      );
    } catch (error) {
      if (error instanceof HttpException) throw error;
      // Các lỗi không lường trước (Database rớt mạng, v.v.)
      console.error('Error submitting timesheet:', error);
      return {
        statusCode: Interval_Server_Network_Exeception_Code, // Hoặc HTTP 500
        message: 'Internal server error occurred',
      };
    }
  }

  async exportTimesheetCsv(
    userID: string,
    month: number,
    year: number,
  ): Promise<string> {
    const timesheet = await this.prismaService.monthlyTimesheet.findUnique({
      where: {
        userID_month_year: { userID, month, year },
      },
      include: {
        entries: {
          orderBy: { date: 'asc' },
        },
      },
    });

    if (!timesheet) {
      throw new NotFoundException('Timesheet not found');
    }

    let csv = 'Ngày,Check-in,Check-out,Tổng giờ,Trạng thái\n';
    for (const entry of timesheet.entries) {
      const checkIn = entry.checkIn
        ? new Date(entry.checkIn).toLocaleString('vi-VN')
        : '';
      const checkOut = entry.checkOut
        ? new Date(entry.checkOut).toLocaleString('vi-VN')
        : '';

      let totalHours = 0;
      if (entry.checkIn && entry.checkOut) {
        totalHours =
          (new Date(entry.checkOut).getTime() -
            new Date(entry.checkIn).getTime()) /
          (1000 * 60 * 60);
      }

      csv += `"${entry.date}","${checkIn}","${checkOut}","${totalHours.toFixed(2)}","${entry.status}"\n`;
    }

    return csv;
  }

  async exportDepartmentTimesheetCsv(
    departmentID: string,
    month: number,
    year: number,
  ): Promise<string> {
    const users = await this.prismaService.user.findMany({
      where: { departmentID },
      select: { userID: true, username: true },
    });

    if (!users || users.length === 0) {
      throw new NotFoundException('No users found in this department');
    }

    const userIds = users.map((u) => u.userID);

    const timesheets = await this.prismaService.monthlyTimesheet.findMany({
      where: {
        userID: { in: userIds },
        month,
        year,
      },
      include: {
        entries: {
          orderBy: { date: 'asc' },
        },
        employee: { select: { username: true } },
      },
    });

    let csv = 'Nhân viên,Ngày,Check-in,Check-out,Tổng giờ,Trạng thái\n';
    for (const ts of timesheets) {
      for (const entry of ts.entries) {
        const checkIn = entry.checkIn
          ? new Date(entry.checkIn).toLocaleString('vi-VN')
          : '';
        const checkOut = entry.checkOut
          ? new Date(entry.checkOut).toLocaleString('vi-VN')
          : '';

        let totalHours = 0;
        if (entry.checkIn && entry.checkOut) {
          totalHours =
            (new Date(entry.checkOut).getTime() -
              new Date(entry.checkIn).getTime()) /
            (1000 * 60 * 60);
        }

        csv += `"${ts.employee.username}","${entry.date}","${checkIn}","${checkOut}","${totalHours.toFixed(2)}","${entry.status}"\n`;
      }
    }

    return csv;
  }

  async exportPersonalTimesheetExcel(
    userID: string,
    month: number,
    year: number,
  ): Promise<ExcelJS.Workbook> {
    const timesheet = await this.prismaService.monthlyTimesheet.findFirst({
      where: { userID, month, year },
      include: { entries: true },
    });

    if (!timesheet) {
      throw new NotFoundException('Timesheet not found');
    }

    return ExcelHelper.createTimesheetWorkbook(
      timesheet.entries,
      `Timesheet_${userID}_${month}_${year}`,
    );
  }

  async exportDepartmentTimesheetExcel(
    departmentID: string,
    month: number,
    year: number,
  ): Promise<ExcelJS.Workbook> {
    const timesheets = await this.prismaService.monthlyTimesheet.findMany({
      where: {
        employee: { departmentID },
        month,
        year,
      },
      include: {
        entries: true,
        employee: true,
      },
    });

    const workbook = new ExcelJS.Workbook();
    for (const ts of timesheets) {
      const sheet = workbook.addWorksheet(ts.employee.username);
      sheet.columns = [
        { header: 'Date', key: 'date', width: 15 },
        { header: 'Check In', key: 'checkIn', width: 20 },
        { header: 'Check Out', key: 'checkOut', width: 20 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Device Info', key: 'deviceInfo', width: 30 },
      ];
      ts.entries.forEach((e) => {
        sheet.addRow({
          date: e.date,
          checkIn: e.checkIn ? new Date(e.checkIn).toLocaleString() : '',
          checkOut: e.checkOut ? new Date(e.checkOut).toLocaleString() : '',
          status: e.status,
          deviceInfo: e.deviceInfo || '',
        });
      });
    }
    return workbook;
  }
}
