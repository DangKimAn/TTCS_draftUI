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
  ) {}

  private async reopenCurrentTimesheetForAttendance(
    monthlyTimesheetID: string,
    status: MonthlyTimesheetStatus | undefined,
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
      return { statusCode: BADREQUEST_CODE, message: 'IP address is missing' };
    }

    try {
      const executeLogic = async (
        dbCtx: Prisma.TransactionClient,
      ): Promise<ResponseDto<unknown>> => {
        const now = new Date();
        if (now.getHours() < 6) {
          return {
            statusCode: BADREQUEST_CODE,
            message: 'You can only check in after 6:00 AM.',
          };
        }

        const month = now.getMonth() + 1;
        const year = now.getFullYear();
        const currentDateString = `${year}-${String(month).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

        // 1. TỐI ƯU: Chạy song song tìm User và Timesheet + Select
        const [user, timesheet] = await Promise.all([
          dbCtx.user.findUnique({
            where: { userID },
            select: {
              departmentID: true,
              department: { select: { managerID: true } },
            },
          }),
          dbCtx.monthlyTimesheet.findFirst({
            where: { userID, month, year },
            select: { monthlyTimesheetID: true, status: true },
          }),
        ]);

        if (!user)
          return { statusCode: NOTFOUND_CODE, message: 'User not found' };
        if (!user.departmentID)
          return {
            statusCode: BADREQUEST_CODE,
            message: 'Please add departmentID to this employee',
          };
        if (!user.department?.managerID)
          return {
            statusCode: BADREQUEST_CODE,
            message:
              'Please update managerID for this department before create monthly timesheet for this user !!!! ',
          };

        let timesheetID: string;
        let needsTimesheetUpdate = false;
        let timesheetUpdateData: Prisma.MonthlyTimesheetUncheckedUpdateInput = {
          canSubmit: false,
        };

        // 2. TỐI ƯU: Xử lý Bảng công tháng
        if (!timesheet) {
          const newTimesheet = await dbCtx.monthlyTimesheet.create({
            data: {
              userID,
              month,
              year,
              status: MonthlyTimesheetStatus.DRAFT,
              canSubmit: false,
            },
            select: { monthlyTimesheetID: true },
          });
          timesheetID = newTimesheet.monthlyTimesheetID;
        } else {
          timesheetID = timesheet.monthlyTimesheetID;
          needsTimesheetUpdate = true;

          if (
            timesheet.status === MonthlyTimesheetStatus.APPROVED ||
            timesheet.status === MonthlyTimesheetStatus.SUBMITTED
          ) {
            timesheetUpdateData = {
              ...timesheetUpdateData,
              status: MonthlyTimesheetStatus.DRAFT,
              isSubmitted: false,
              reasonReject: null,
              approvedById: null,
              reviewedAt: null,
            };
          }
        }

        // 3. Tìm lượt Check-in gần nhất (Select lấy duy nhất checkOut)
        const lastEntry = await dbCtx.timesheetEntry.findFirst({
          where: {
            date: currentDateString,
            monthlyTimesheetID: timesheetID,
          },
          orderBy: { checkIn: 'desc' },
          select: { checkOut: true },
        });

        if (lastEntry && lastEntry.checkOut === null) {
          return {
            statusCode: BADREQUEST_CODE,
            message:
              'You have already checked in. Please check out first before checking in again.',
          };
        }

        // 4. TỐI ƯU: Chạy song song việc tạo Entry và cập nhật Timesheet
        const createEntryPromise = dbCtx.timesheetEntry.create({
          data: {
            monthlyTimesheetID: timesheetID,
            date: currentDateString,
            IPAddress,
            deviceInfo,
            checkIn: now,
            status: TimesheetStatus.PENDING,
          },
        });

        if (needsTimesheetUpdate) {
          const updateTimesheetPromise = dbCtx.monthlyTimesheet.update({
            where: { monthlyTimesheetID: timesheetID },
            data: timesheetUpdateData,
          });
          await Promise.all([createEntryPromise, updateTimesheetPromise]);
        } else {
          await createEntryPromise;
        }

        return { statusCode: CREATED_RESPONE, message: 'Check-in successful!' };
      };

      if (tx) return await executeLogic(tx);
      // KHÔNG SỬ DỤNG $transaction ĐỂ TRÁNH NGẼN POOL VÀ CHO PHÉP PROMISE.ALL TỰ DO CHẠY
      return await executeLogic(this.prismaService);
    } catch (error: unknown) {
      if (
        error &&
        typeof error === 'object' &&
        'getStatus' in error &&
        typeof (error as { getStatus?: () => number }).getStatus === 'function'
      ) {
        throw error;
      }
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
    if (!IPAddress) {
      return { statusCode: BADREQUEST_CODE, message: 'IP address is missing' };
    }

    try {
      let isWarning = false;
      let managerIdToNotify: string | null = null;
      let userName: string = '';

      const executeLogic = async (
        dbCtx: Prisma.TransactionClient,
      ): Promise<ResponseDto<unknown>> => {
        const now = new Date();
        const month = now.getMonth() + 1;
        const year = now.getFullYear();
        const currentDateString = `${year}-${String(month).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

        // 1. TỐI ƯU: Chạy song song lấy User và Timesheet + Select
        const [user, timesheet] = await Promise.all([
          dbCtx.user.findUnique({
            where: { userID },
            select: {
              username: true,
              department: { select: { managerID: true } },
            },
          }),
          dbCtx.monthlyTimesheet.findFirst({
            where: { userID, month, year },
            select: { monthlyTimesheetID: true, status: true },
          }),
        ]);

        if (!user)
          return { statusCode: NOTFOUND_CODE, message: 'User not found' };
        userName = user.username || 'Employee';
        managerIdToNotify = user.department?.managerID || null;

        if (!timesheet) {
          return {
            statusCode: BADREQUEST_CODE,
            message: "You haven't checked in yet.",
          };
        }

        const timesheetID = timesheet.monthlyTimesheetID;

        // 2. TỐI ƯU: Lấy lượt Check-in chưa check-out gần nhất + Select
        const lastEntry = await dbCtx.timesheetEntry.findFirst({
          where: {
            monthlyTimesheetID: timesheetID,
            date: currentDateString,
          },
          orderBy: { checkIn: 'desc' },
          select: {
            timesheetEntryID: true,
            checkOut: true,
            IPAddress: true,
            deviceInfo: true,
          },
        });

        if (!lastEntry || lastEntry.checkOut !== null) {
          return {
            statusCode: BADREQUEST_CODE,
            message: "You haven't checked in or have already checked out.",
          };
        }

        if (lastEntry.IPAddress !== IPAddress) {
          isWarning = true;
        }

        let needsTimesheetUpdate = false;
        let timesheetUpdateData: Prisma.MonthlyTimesheetUncheckedUpdateInput =
          {};

        if (
          timesheet.status === MonthlyTimesheetStatus.APPROVED ||
          timesheet.status === MonthlyTimesheetStatus.SUBMITTED
        ) {
          needsTimesheetUpdate = true;
          timesheetUpdateData = {
            status: MonthlyTimesheetStatus.DRAFT,
            isSubmitted: false,
            canSubmit: false,
            reasonReject: null,
            approvedById: null,
            reviewedAt: null,
          };
        }

        // 3. TỐI ƯU: Cập nhật Check-out và Timesheet song song
        const updateEntryPromise = dbCtx.timesheetEntry.update({
          where: { timesheetEntryID: lastEntry.timesheetEntryID },
          data: {
            checkOut: now,
            deviceInfo: deviceInfo ?? lastEntry.deviceInfo,
            isWarning: isWarning,
          },
        });

        if (needsTimesheetUpdate) {
          const updateTimesheetPromise = dbCtx.monthlyTimesheet.update({
            where: { monthlyTimesheetID: timesheetID },
            data: timesheetUpdateData,
          });
          await Promise.all([updateEntryPromise, updateTimesheetPromise]);
        } else {
          await updateEntryPromise;
        }

        // 4. CHẠY NGẦM: Tính toán lại quyền Submit bảng công (không block kết quả trả về)
        this.monthlyTimesheetService
          .refreshCanSubmit(timesheetID, this.prismaService)
          .catch(console.error);

        return {
          statusCode: OK_CODE,
          message: isWarning
            ? 'Check-out successful with IP warning (Manager notified).'
            : 'Check-out successful!',
        };
      };

      let result: ResponseDto<unknown>;
      if (tx) {
        result = await executeLogic(tx);
      } else {
        result = await executeLogic(this.prismaService);
      }

      // 5. CHẠY NGẦM: Gửi thông báo CẢNH BÁO IP
      if (result.statusCode === OK_CODE && isWarning && managerIdToNotify) {
        this.notificationService
          .createNotification(
            'system',
            managerIdToNotify,
            `Cảnh báo: Nhân viên ${userName} Check-out với IP khác (${IPAddress}) so với lúc Check-in.`,
            NotificationRelatedType.WARNING,
          )
          .catch((err) =>
            console.error('Error pushing IP warning notification:', err),
          );
      }

      return result;
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
