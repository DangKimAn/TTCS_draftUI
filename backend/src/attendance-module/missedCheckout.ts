import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from 'src/prisma/prisma.service';
import { AttendanceModuleService } from './attendance-module.service';
import { EmailService } from 'src/common/email.service';
import { TimesheetStatus } from '@prisma/client';
import { WarningService } from 'src/warning/warning.service';
import { OK_CODE, CREATED_RESPONE } from 'src/common/code';
import ResponseDto, { DefaultResponse } from 'src/common/response.dto';

interface MissedCheckoutEmployee {
  userID: string;
  username: string;
  email: string;
}

interface MissedCheckoutEntry {
  timesheetEntryID: string;
  monthlyTimesheetID: string;
  date: string;
  monthlyTimesheet: {
    employee: MissedCheckoutEmployee;
  };
}

@Injectable()
export class MissedCheckoutTask {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly attendanceService: AttendanceModuleService,
    private readonly warningService: WarningService,
    private readonly emailService: EmailService,
  ) {}

  @Cron('0 0 0 * * *') // Chạy lúc 12:00 đêm mỗi ngày
  async processMissingCheckouts(): Promise<ResponseDto<DefaultResponse>> {
    const now = new Date();
    const todayStr = this.formatDateKey(now);
    console.log(
      `[MissedCheckoutTask] Cron triggered at ${now.toISOString()} - Processing entries before ${todayStr}`,
    );

    const result =
      await this.attendanceService.GetAllEmployeeDidNotCheckOutBefore(todayStr);

    if (result.statusCode !== OK_CODE || !result.data) {
      return { statusCode: result.statusCode, message: result.message };
    }

    const missedEntries = result.data as MissedCheckoutEntry[];
    console.log(
      `[MissedCheckoutTask] Found ${missedEntries.length} missed check-out entries.`,
    );

    for (const entry of missedEntries) {
      try {
        await this.prismaService.$transaction(async (tx) => {
          // 1. Cập nhật trạng thái entry thành MISSING_OUT
          await tx.timesheetEntry.update({
            where: { timesheetEntryID: entry.timesheetEntryID },
            data: {
              status: TimesheetStatus.MISSING_OUT,
              isWarning: true,
            },
          });

          // 2. Gửi Warning (trong DB)
          const employee = entry.monthlyTimesheet.employee;
          await this.warningService.sendWarning({
            userID: employee.userID,
            content: `Hệ thống ghi nhận bạn quên check-out ngày ${entry.date}. Vui lòng tạo yêu cầu giải trình/chỉnh sửa.`,
          });

          // 3. Gửi Email thông báo (không làm rollback nếu lỗi)
          try {
            await this.emailService.send({
              to: employee.email,
              subject: '[HRM] Cảnh báo quên Check-out',
              text: `Xin chào ${employee.username},\n\nHệ thống ghi nhận bạn quên check-out ngày ${entry.date}.\nTrạng thái công ngày này đã được chuyển sang "Missing Out".\nBạn sẽ không thể nộp bảng công tháng này cho đến khi giải trình xong.\nVui lòng truy cập hệ thống để tạo yêu cầu chỉnh sửa (Request Correction).\n\nTrân trọng,\nHệ thống HRM`,
            });
          } catch (emailErr) {
            console.error(
              `[MissedCheckoutTask] Failed to send email to ${employee.email}`,
              emailErr,
            );
          }

          // 4. Refresh canSubmit của MonthlyTimesheet
          // Lưu ý: attendanceService.GetAllEmployeeDidNotCheckOutBefore đã bao gồm monthlyTimesheet
          await tx.monthlyTimesheet.update({
            where: { monthlyTimesheetID: entry.monthlyTimesheetID },
            data: { canSubmit: false },
          });
        });
      } catch (err) {
        console.error(
          `[MissedCheckoutTask] Error processing entry ${entry.timesheetEntryID}:`,
          err,
        );
      }
    }

    return {
      statusCode: CREATED_RESPONE,
      message: `Processed ${missedEntries.length} missed check-out entries successfully.`,
    };
  }

  private formatDateKey(date: Date): string {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
  }
}
