import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import CreateMonthlyTimeSheetDto from './dto/create-timesheet.dto';
import ResponseDto, { DefaultResponse } from 'src/common/response.dto';
import {
  BADREQUEST_CODE,
  CREATED_RESPONE,
  Interval_Server_Network_Exeception_Code,
  NOTFOUND_CODE,
  OK_CODE,
} from 'src/common/code';
import { MonthlyTimesheetStatus, TimesheetStatus, NotificationRelatedType } from '@prisma/client';
import { catchError, NotFoundError } from 'rxjs';
import GetMonthlyTimeSheetDto from './dto/get-timesheet.dto';
import { UserService } from 'src/user/user.service';
import { DepartmentService } from 'src/department/department.service';
import { MonthlyTimesheeetResponeDto } from './dto/monthly-tinesheet-respone.dto';
import ReviewMonthlyTimesheetDto from './dto/review-monthly-timesheet.dto';
import { NotificationService } from 'src/notification/notification.service';
import { Prisma } from '@prisma/client';
import { EmailService } from 'src/common/email.service';
import { ExcelHelper } from 'src/common/excel.helper';
import * as ExcelJS from 'exceljs';

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
    const hasMissingTime = timesheet.entries.some(
      (entry) => !entry.checkIn || !entry.checkOut || entry.status === TimesheetStatus.MISSING_OUT,
    );
    const hasPendingCorrection = timesheet.corrections.length > 0;
    const isLocked =
      timesheet.status === MonthlyTimesheetStatus.APPROVED || timesheet.status === MonthlyTimesheetStatus.SUBMITTED;
    const canSubmit =
      hasEntries && !hasMissingTime && !hasPendingCorrection && !isLocked;

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
        message: 'This timesheet isnt exist',
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
        const { statusCode, message, data } = await this.getMonthlyTimeSheet(
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
      return await this.prismaService.$transaction(async (tx) =>
        executeLogic(tx),
      );
    } catch (error) {
      console.error('Error in checkIn:', error);
      return {
        statusCode: Interval_Server_Network_Exeception_Code,
        message: 'Internal server error occurred during check-in',
      };
    }
  }

  async SubmitMonthlyTimesheet(
    monthlyTimesheetID: string,
    tx?: Prisma.TransactionClient,
  ): Promise<DefaultResponse> {
    try {
      const executeLogic = async (dCbt): Promise<DefaultResponse> => {
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

        if (monthGet === undefined || monthGet?.userID === undefined) {
          throw new NotFoundException('monthly timesheet is not found');
        }

        if (monthGet?.isSubmitted === true)
          throw new BadRequestException('You were submit this timesheet');

        if (monthGet.status === MonthlyTimesheetStatus.APPROVED)
          throw new BadRequestException('Approved monthly timesheet is locked');

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
            monthlyTimesheetID: monthGet?.monthlyTimesheetID,
          },
          data: {
            isSubmitted: true,
            canSubmit: false,
            status: MonthlyTimesheetStatus.SUBMITTED,
          },
        });

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

      return await this.prismaService.$transaction(async (tx) =>
        executeLogic(tx),
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
            status: accept ? MonthlyTimesheetStatus.APPROVED : MonthlyTimesheetStatus.REJECTED,
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
            data: { status: TimesheetStatus.APPROVED, canRequestCorrection: false },
          });
        } else {
          await dCbt.timesheetEntry.updateMany({
            where: { monthlyTimesheetID: monthGet.monthlyTimesheetID },
            data: { status: TimesheetStatus.PENDING, canRequestCorrection: true },
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

      return await this.prismaService.$transaction(async (tx) =>
        executeLogic(tx),
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
