import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import ResponseDto, { DefaultResponse } from 'src/common/response.dto';
import { UserService } from 'src/user/user.service';
import {
  BADREQUEST_CODE,
  CREATED_RESPONE,
  Interval_Server_Network_Exeception_Code,
  NOTFOUND_CODE,
  OK_CODE,
} from 'src/common/code';
import {
  TimesheetStatus,
  MonthlyTimesheetStatus,
  NotificationRelatedType,
} from '@prisma/client';
import { MonthlyTimeSheetService } from 'src/monthly-time-sheet/monthly-time-sheet.service';
import GetAttendenceDto from './dto/getAttendence.dto';
import { Prisma } from '@prisma/client';
import { NotificationService } from 'src/notification/notification.service';

@Injectable()
export class AttendanceModuleService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly userService: UserService,
    private readonly monthlyTimesheetService: MonthlyTimeSheetService,
    private readonly notificationService: NotificationService,
  ) { }

  private async reopenCurrentTimesheetForAttendance(
    monthlyTimesheetID: string,
    status: MonthlyTimesheetStatus | string | undefined,
    dbCtx: Prisma.TransactionClient,
  ): Promise<void> {
    if (
      status !== MonthlyTimesheetStatus.APPROVED &&
      status !== MonthlyTimesheetStatus.SUBMITTED
    ) {
      return;
    }

    await dbCtx.monthlyTimesheet.update({
      where: { monthlyTimesheetID },
      data: {
        status: MonthlyTimesheetStatus.DRAFT,
        isSubmitted: false,
        canSubmit: false,
        reasonReject: null,
        approvedById: null,
        reviewedAt: null,
      },
    });
  }

  async getAllAttedencOfMonth(
    userID: string,
    getAttedencOfMonth: GetAttendenceDto,
    tx?: Prisma.TransactionClient,
  ): Promise<DefaultResponse> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { month, year } = getAttedencOfMonth;

    const db: Prisma.TransactionClient = tx ?? this.prismaService;
    const { statusCode, data } =
      await this.monthlyTimesheetService.getMonthlyTimeSheet(
        userID,
        getAttedencOfMonth,
        db,
      );
    if (statusCode !== OK_CODE || data === undefined)
      return {
        statusCode,
        message: 'Dont have any attendence',
      };

    const allAttedencOfMonth = await db.timesheetEntry.findMany({
      where: {
        monthlyTimesheetID: data.monthlyTimesheetID,
      },
    });

    return {
      statusCode: OK_CODE,
      message: 'Get all attendence of month successfull !!!!',
      data: allAttedencOfMonth,
    };
  }

  async checkIn(
    userID: string,
    IPAddress: string | undefined,
    deviceInfo?: string,
    tx?: Prisma.TransactionClient,
  ): Promise<DefaultResponse> {
    if (!IPAddress) {
      return {
        statusCode: BADREQUEST_CODE,
        message: 'IP address is missing',
      };
    }

    try {
      const executeLogic = async (
        dbCtx: Prisma.TransactionClient,
      ): Promise<ResponseDto<any>> => {
        const userGet = await this.userService.getUserByUserID(userID, dbCtx);
        if (userGet.statusCode !== OK_CODE || !userGet.data) {
          return {
            statusCode: userGet.statusCode,
            message: userGet.message || 'User not found',
          };
        }

        const now = new Date();

        const currentDateString = [
          now.getFullYear(),
          String(now.getMonth() + 1).padStart(2, '0'),
          String(now.getDate()).padStart(2, '0'),
        ].join('-');

        let timesheet = await this.monthlyTimesheetService.getMonthlyTimeSheet(
          userID,
          { month: now.getMonth() + 1, year: now.getFullYear() },
          dbCtx,
        );

        if (timesheet.statusCode === NOTFOUND_CODE) {
          timesheet = await this.monthlyTimesheetService.createMonthlyTimeSheet(
            userID,
            { month: now.getMonth() + 1, year: now.getFullYear() },
            dbCtx,
          );
        }

        if (
          (timesheet.statusCode !== CREATED_RESPONE &&
            timesheet.statusCode !== OK_CODE) ||
          !timesheet.data
        ) {
          return {
            statusCode: BADREQUEST_CODE,
            message:
              timesheet.message || 'Failed to get/create monthly timesheet',
          };
        }

        const monthlyTimesheetID = timesheet.data.monthlyTimesheetID;
        await this.reopenCurrentTimesheetForAttendance(
          monthlyTimesheetID,
          timesheet.data.status,
          dbCtx,
        );

        const lastEntry = await dbCtx.timesheetEntry.findFirst({
          where: {
            date: currentDateString,
            monthlyTimesheetID: monthlyTimesheetID,
          },
          orderBy: { checkIn: 'desc' },
        });

        if (!lastEntry || lastEntry.checkOut !== null) {
          await dbCtx.timesheetEntry.create({
            data: {
              monthlyTimesheetID: monthlyTimesheetID,
              date: currentDateString,
              IPAddress,
              deviceInfo,
              checkIn: now,
              status: TimesheetStatus.PENDING,
            },
          });

          await this.monthlyTimesheetService.refreshCanSubmit(
            monthlyTimesheetID,
            dbCtx,
          );

          return {
            statusCode: CREATED_RESPONE,
            message: 'Check-in successful!',
          };
        } else {
          return {
            statusCode: BADREQUEST_CODE,
            message:
              'You have already checked in. Please check out first before checking in again.',
          };
        }
      };

      if (tx) {
        return await executeLogic(tx);
      }

      return await this.prismaService.$transaction(executeLogic,
        {
          maxWait: 5000, // Chờ tối đa 5s để lấy connection
          timeout: 15000 // Cho phép transaction chạy tối đa 15s
        }
      );
    } catch (error: unknown) {
      console.error('Error in checkIn:', error);
      return {
        statusCode: Interval_Server_Network_Exeception_Code,
        message: 'Internal server error occurred during check-in',
      };
    }
  }
  async checkOut(
    userID: string,
    IPAddress: string | undefined,
    deviceInfo?: string,
    tx?: Prisma.TransactionClient,
  ): Promise<DefaultResponse> {
    // 1. FAIL-FAST
    if (!IPAddress) {
      return {
        statusCode: BADREQUEST_CODE,
        message: 'IP address is missing',
      };
    }

    try {
      const executeLogic = async (
        dbCtx: Prisma.TransactionClient,
      ): Promise<ResponseDto<any>> => {
        // --- BƯỚC 1: KIỂM TRA USER ---
        const userGet = await this.userService.getUserByUserID(userID, dbCtx);
        if (userGet.statusCode !== OK_CODE || !userGet.data) {
          return {
            statusCode: userGet.statusCode,
            message: userGet.message || 'User not found',
          };
        }

        const now = new Date();

        // Chuẩn hóa format ngày (YYYY-MM-DD)
        const currentDateString = [
          now.getFullYear(),
          String(now.getMonth() + 1).padStart(2, '0'),
          String(now.getDate()).padStart(2, '0'),
        ].join('-');

        // --- BƯỚC 2: LẤY BẢNG CÔNG THÁNG CỦA USER NÀY ---
        const timesheet =
          await this.monthlyTimesheetService.getMonthlyTimeSheet(
            userID,
            { month: now.getMonth() + 1, year: now.getFullYear() },
            dbCtx,
          );

        // Nếu tháng này chưa có bảng công -> Chắc chắn chưa từng Check-in
        if (timesheet.statusCode !== OK_CODE || !timesheet.data) {
          return {
            statusCode: BADREQUEST_CODE,
            message: "You haven't checked in yet.",
          };
        }

        const monthlyTimesheetID = timesheet.data.monthlyTimesheetID;

        await this.reopenCurrentTimesheetForAttendance(
          monthlyTimesheetID,
          timesheet.data.status,
          dbCtx,
        );

        // --- BƯỚC 3: LẤY LƯỢT CHECK-IN MỚI NHẤT TRONG NGÀY ---
        const lastEntry = await dbCtx.timesheetEntry.findFirst({
          where: {
            monthlyTimesheetID: monthlyTimesheetID,
            date: currentDateString,
          },
          orderBy: { checkIn: 'desc' }, // Lấy bản ghi trễ nhất
        });

        // --- BƯỚC 4: KIỂM TRA CÁC ĐIỀU KIỆN ---
        // 1. Không có lượt chấm công nào, hoặc lượt gần nhất đã check-out rồi
        if (!lastEntry || lastEntry.checkOut !== null) {
          return {
            statusCode: BADREQUEST_CODE,
            message: "You haven't checked in or have already checked out.",
          };
        }

        // 2. Kiểm tra tính hợp lệ của IP
        let isWarning = false;
        if (lastEntry.IPAddress !== IPAddress) {
          isWarning = true;

          // Gửi thông báo cho Manager
          const managerResult =
            await this.userService.getManagerIdOfUserID(userID, dbCtx);
          if (
            managerResult.statusCode === OK_CODE &&
            managerResult.data &&
            typeof managerResult.data === 'object' &&
            'managerID' in managerResult.data
          ) {
            const managerData = managerResult.data as { managerID: string };
            await this.notificationService.createNotification(
              'system',
              managerData.managerID,
              `Cảnh báo: Nhân viên ${userGet.data.username} Check-out với IP khác (${IPAddress}) so với lúc Check-in (${lastEntry.IPAddress}).`,
              NotificationRelatedType.WARNING,
              dbCtx,
            );
          }
        }

        // --- BƯỚC 5: CẬP NHẬT THỜI GIAN CHECK-OUT ---
        await dbCtx.timesheetEntry.update({
          where: {
            timesheetEntryID: lastEntry.timesheetEntryID,
          },
          data: {
            checkOut: now,
            deviceInfo: deviceInfo ?? lastEntry.deviceInfo,
            isWarning: isWarning,
          },
        });

        await this.monthlyTimesheetService.refreshCanSubmit(
          monthlyTimesheetID,
          dbCtx,
        );

        return {
          statusCode: OK_CODE,
          message: isWarning
            ? 'Check-out successful with IP warning (Manager notified).'
            : 'Check-out successful!',
        };
      };

      // THỰC THI TRANSACTION
      if (tx) {
        return await executeLogic(tx);
      }

      return await this.prismaService.$transaction(executeLogic);
    } catch (error: unknown) {
      if (
        error &&
        typeof error === 'object' &&
        'getStatus' in error &&
        typeof error.getStatus === 'function'
      ) {
        throw error;
      }

      console.error('Error in checkOut:', error);
      return {
        statusCode: Interval_Server_Network_Exeception_Code,
        message: 'Internal server error occurred during check-out',
      };
    }
  }

  async GetAllEmployeeDidNotCheckOutBefore(
    date: string,
    tx?: Prisma.TransactionClient,
  ): Promise<DefaultResponse> {
    const db: Prisma.TransactionClient = tx ?? this.prismaService;
    const allEmployeeDidntCheckOut = await db.timesheetEntry.findMany({
      where: {
        date: {
          lt: date,
        },
        checkOut: null,
        status: {
          not: TimesheetStatus.MISSING_OUT,
        },
      },
      include: {
        monthlyTimesheet: {
          include: {
            employee: true,
          },
        },
      },
    });

    if (allEmployeeDidntCheckOut.length === 0)
      return {
        statusCode: NOTFOUND_CODE,
        message: 'No employees missed check-out before ' + date,
      };

    return {
      statusCode: OK_CODE,
      message: 'Found employees who missed check-out before ' + date,
      data: allEmployeeDidntCheckOut,
    };
  }
}
