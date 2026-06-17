import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  BADREQUEST_CODE,
  CREATED_RESPONE,
  NOTFOUND_CODE,
  OK_CODE,
} from 'src/common/code';
import {
  MonthlyTimesheetStatus,
  TimesheetStatus,
  NotificationRelatedType,
} from '@prisma/client';
import { DefaultResponse } from 'src/common/response.dto';
import { NotificationService } from 'src/notification/notification.service';
import { EmailService } from 'src/common/email.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateRequestCorrectionDto } from './dto/create-request-correction.dto';
import { ReviewRequestCorrectionDto } from './dto/review-request-correction.dto';

@Injectable()
export class RequestCorrectionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    private readonly emailService: EmailService,
  ) {}

  async createRequest(
    userID: string,
    dto: CreateRequestCorrectionDto,
  ): Promise<DefaultResponse> {
    const reason = dto.reason?.trim();

    if (!reason) {
      return {
        statusCode: BADREQUEST_CODE,
        message: 'Correction reason is required',
      };
    }

    return this.prisma.$transaction(
      async (tx) => {
        const timesheet = await tx.monthlyTimesheet.findUnique({
          where: { monthlyTimesheetID: dto.monthlyTimesheetID },
          include: {
            employee: { include: { department: true } },
          },
        });

        if (!timesheet) {
          return {
            statusCode: NOTFOUND_CODE,
            message: 'Monthly timesheet not found',
          };
        }

        if (timesheet.userID !== userID) {
          return {
            statusCode: BADREQUEST_CODE,
            message: 'Cannot create correction for another employee',
          };
        }

        if (timesheet.status === MonthlyTimesheetStatus.APPROVED) {
          return {
            statusCode: BADREQUEST_CODE,
            message: 'Approved monthly timesheet is locked',
          };
        }

        if (timesheet.status === MonthlyTimesheetStatus.SUBMITTED) {
          return {
            statusCode: BADREQUEST_CODE,
            message: 'Submitted monthly timesheet is waiting for review',
          };
        }

        const managerID = timesheet.employee.department?.managerID;
        if (!managerID) {
          return {
            statusCode: BADREQUEST_CODE,
            message: 'Employee department does not have a manager',
          };
        }

        const entry = dto.timesheetEntryID
          ? await tx.timesheetEntry.findUnique({
              where: { timesheetEntryID: dto.timesheetEntryID },
            })
          : null;

        if (dto.timesheetEntryID && !entry) {
          return {
            statusCode: NOTFOUND_CODE,
            message: 'Timesheet entry not found',
          };
        }

        if (
          entry &&
          entry.monthlyTimesheetID !== timesheet.monthlyTimesheetID
        ) {
          return {
            statusCode: BADREQUEST_CODE,
            message:
              'Timesheet entry does not belong to this monthly timesheet',
          };
        }

        const dateKey = dto.date || entry?.date;
        const proposedCheckIn = this.parseProposedDateTime(
          dto.requestedCheckIn,
          dateKey,
        );
        const proposedCheckOut = this.parseProposedDateTime(
          dto.requestedCheckOut,
          dateKey,
        );

        if ((proposedCheckIn || proposedCheckOut) && !entry) {
          return {
            statusCode: BADREQUEST_CODE,
            message:
              'Timesheet entry is required when proposing check-in/out changes',
          };
        }

        const nextCheckIn = proposedCheckIn || entry?.checkIn || null;
        const nextCheckOut = proposedCheckOut || entry?.checkOut || null;

        if (proposedCheckIn && proposedCheckIn.getHours() < 6) {
          return {
            statusCode: BADREQUEST_CODE,
            message: 'Proposed check-in must be 06:00 AM or later',
          };
        }

        if (nextCheckIn && nextCheckOut && nextCheckOut <= nextCheckIn) {
          return {
            statusCode: BADREQUEST_CODE,
            message: 'Proposed check-out must be after check-in',
          };
        }

        const duplicatePending = await tx.requestCorrection.findFirst({
          where: {
            userID,
            monthlyTimesheetID: timesheet.monthlyTimesheetID,
            timesheetEntryID: entry?.timesheetEntryID ?? null,
            status: TimesheetStatus.PENDING,
          },
        });

        if (duplicatePending) {
          return {
            statusCode: BADREQUEST_CODE,
            message: 'A pending correction already exists for this entry',
          };
        }

        const request = await tx.requestCorrection.create({
          data: {
            monthlyTimesheetID: timesheet.monthlyTimesheetID,
            timesheetEntryID: entry?.timesheetEntryID,
            userID,
            reviewerID: managerID,
            reason,
            status: TimesheetStatus.PENDING,
            proposedCheckIn,
            proposedCheckOut,
          },
          include: this.defaultInclude(),
        });

        await this.recalculateCanSubmit(timesheet.monthlyTimesheetID, tx);

        const notification = await this.notificationService.createNotification(
          userID,
          managerID,
          `${timesheet.employee.username} requested a timesheet correction for ${timesheet.month}/${timesheet.year}.`,
          NotificationRelatedType.TIMESHEET,
          tx,
        );

        if (notification.statusCode !== CREATED_RESPONE) {
          return {
            statusCode: notification.statusCode,
            message: notification.message,
          };
        }

        // --- GỬI EMAIL CHO QUẢN LÝ ---
        try {
          const manager = await tx.user.findUnique({
            where: { userID: managerID },
            select: { email: true },
          });
          if (manager?.email) {
            await this.emailService.send({
              to: manager.email,
              subject: '[HRM] Yêu cầu chỉnh sửa công mới',
              text: `Xin chào Quản lý,\n\nNhân viên ${timesheet.employee.username} vừa gửi yêu cầu chỉnh sửa công.\nLý do: ${reason}\n\nVui lòng truy cập hệ thống để phê duyệt.\n\nTrân trọng,\nHệ thống HRM`,
            });
          }
        } catch (e) {
          console.error('Email error in createRequest (Correction):', e);
        }

        return {
          statusCode: CREATED_RESPONE,
          message: 'Correction request created successfully',
          data: request,
        };
      },
      { timeout: 30000 },
    );
  }

  async getDepartmentRequests(
    departmentID: string,
    status: TimesheetStatus = TimesheetStatus.PENDING,
  ): Promise<DefaultResponse> {
    const requests = await this.prisma.requestCorrection.findMany({
      where: {
        status,
        monthlyTimesheet: {
          employee: {
            departmentID,
          },
        },
      },
      include: this.defaultInclude(),
      orderBy: { createdAt: 'desc' },
    });

    return {
      statusCode: OK_CODE,
      message: 'Get correction requests successfully',
      data: requests,
    };
  }

  async getMyRequests(userID: string): Promise<DefaultResponse> {
    const requests = await this.prisma.requestCorrection.findMany({
      where: { userID },
      include: this.defaultInclude(),
      orderBy: { createdAt: 'desc' },
    });

    return {
      statusCode: OK_CODE,
      message: 'Get my correction requests successfully',
      data: requests,
    };
  }

  async reviewRequest(
    requestCorrectionID: string,
    reviewerID: string,
    dto: ReviewRequestCorrectionDto,
  ): Promise<DefaultResponse> {
    const reasonReject = dto.reasonReject?.trim();

    if (dto.status === TimesheetStatus.REJECTED && !reasonReject) {
      return {
        statusCode: BADREQUEST_CODE,
        message: 'Reason for rejection is required',
      };
    }

    return this.prisma.$transaction(
      async (tx) => {
        const request = await tx.requestCorrection.findUnique({
          where: { requestCorrectionID },
          include: this.defaultInclude(),
        });

        if (!request) {
          return {
            statusCode: NOTFOUND_CODE,
            message: 'Correction request not found',
          };
        }

        if (request.status !== TimesheetStatus.PENDING) {
          return {
            statusCode: BADREQUEST_CODE,
            message: 'Correction request has already been reviewed',
          };
        }

        const canReview = await this.canReviewRequest(
          reviewerID,
          request.monthlyTimesheet.userID,
          tx,
        );
        if (!canReview) {
          return {
            statusCode: BADREQUEST_CODE,
            message:
              'Only department manager or admin can review this correction',
          };
        }

        if (
          request.monthlyTimesheet.status === MonthlyTimesheetStatus.APPROVED
        ) {
          return {
            statusCode: BADREQUEST_CODE,
            message: 'Approved monthly timesheet is locked',
          };
        }

        const reviewedAt = new Date();

        if (dto.status === TimesheetStatus.APPROVED) {
          await this.applyApprovedCorrection(request, tx);
        }

        const updatedRequest = await tx.requestCorrection.update({
          where: { requestCorrectionID },
          data: {
            status: dto.status,
            reasonReject:
              dto.status === TimesheetStatus.REJECTED ? reasonReject : null,
            reviewerID,
            reviewedAt,
          },
          include: this.defaultInclude(),
        });

        await this.recalculateCanSubmit(request.monthlyTimesheetID, tx);

        const notification = await this.notificationService.createNotification(
          reviewerID,
          request.userID,
          `Your timesheet correction request was ${dto.status}.${dto.status === TimesheetStatus.REJECTED ? ` Reason: ${reasonReject}` : ''}`,
          NotificationRelatedType.TIMESHEET,
          tx,
        );

        if (notification.statusCode !== CREATED_RESPONE) {
          return {
            statusCode: notification.statusCode,
            message: notification.message,
          };
        }

        // --- GỬI EMAIL CHO NHÂN VIÊN ---
        try {
          const formatTime = (date?: Date | null) => {
            if (!date) return '---';
            return date.toLocaleTimeString('vi-VN', {
              timeZone: 'Asia/Ho_Chi_Minh',
              hour: '2-digit',
              minute: '2-digit',
            });
          };

          await this.emailService.sendCorrectionNotification({
            recipientEmail: request.employee.email,
            employeeName: request.employee.username,
            status:
              dto.status === TimesheetStatus.APPROVED ? 'approved' : 'rejected',
            reason: reasonReject || undefined,
            correctionID: updatedRequest.requestCorrectionID,
            date: updatedRequest.timesheetEntry?.date || 'Không xác định',
            oldCheckIn: formatTime(updatedRequest.timesheetEntry?.checkIn),
            oldCheckOut: formatTime(updatedRequest.timesheetEntry?.checkOut),
            proposedCheckIn: formatTime(updatedRequest.proposedCheckIn),
            proposedCheckOut: formatTime(updatedRequest.proposedCheckOut),
            createdAt: updatedRequest.createdAt,
            reviewerName: updatedRequest.reviewer?.username || 'Quản lý',
            reviewedAt: updatedRequest.reviewedAt || new Date(),
          });
        } catch (e) {
          console.error('Email error in reviewRequest (Correction):', e);
        }

        return {
          statusCode: OK_CODE,
          message: `Correction request ${dto.status}`,
          data: updatedRequest,
        };
      },
      { timeout: 30000 },
    );
  }

  async recalculateCanSubmit(
    monthlyTimesheetID: string,
    tx?: Prisma.TransactionClient,
  ): Promise<boolean> {
    const db = tx ?? this.prisma;
    const timesheet = await db.monthlyTimesheet.findUnique({
      where: { monthlyTimesheetID },
      include: {
        entries: true,
        corrections: {
          where: { status: TimesheetStatus.PENDING },
        },
      },
    });

    if (!timesheet) {
      return false;
    }

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

  private async canReviewRequest(
    reviewerID: string,
    requesterID: string,
    tx: Prisma.TransactionClient,
  ): Promise<boolean> {
    const reviewer = await tx.user.findUnique({
      where: { userID: reviewerID },
      select: {
        role: { select: { nameRole: true } },
      },
    });

    if (!reviewer) {
      return false;
    }

    const roleName = reviewer.role.nameRole.toLowerCase();
    if (roleName === 'admin' || roleName === 'hr') {
      return true;
    }

    const requester = await tx.user.findUnique({
      where: { userID: requesterID },
      select: { department: { select: { managerID: true } } },
    });

    return requester?.department?.managerID === reviewerID;
  }

  private async applyApprovedCorrection(
    request: Prisma.RequestCorrectionGetPayload<{
      include: ReturnType<RequestCorrectionService['defaultInclude']>;
    }>,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    if (
      !request.timesheetEntryID ||
      (!request.proposedCheckIn && !request.proposedCheckOut)
    ) {
      return;
    }

    const entry = await tx.timesheetEntry.findUnique({
      where: { timesheetEntryID: request.timesheetEntryID },
    });

    if (!entry) {
      throw new BadRequestException('Timesheet entry not found');
    }

    const nextCheckIn = request.proposedCheckIn || entry.checkIn;
    const nextCheckOut = request.proposedCheckOut || entry.checkOut;

    if (nextCheckOut && nextCheckOut <= nextCheckIn) {
      throw new BadRequestException(
        'Corrected check-out must be after check-in',
      );
    }

    await tx.timesheetEntry.update({
      where: { timesheetEntryID: entry.timesheetEntryID },
      data: {
        checkIn: nextCheckIn,
        checkOut: nextCheckOut,
        status: TimesheetStatus.PENDING,
        isWarning: false,
      },
    });
  }

  private parseProposedDateTime(value?: string, dateKey?: string): Date | null {
    const normalizedValue = value?.trim();

    if (!normalizedValue) {
      return null;
    }

    const dateTimeValue = /^\d{2}:\d{2}(:\d{2})?$/.test(normalizedValue)
      ? `${dateKey || ''}T${normalizedValue.length === 5 ? `${normalizedValue}:00` : normalizedValue}`
      : normalizedValue;

    if (!dateTimeValue || dateTimeValue.startsWith('T')) {
      throw new BadRequestException(
        'Correction date is required when using HH:mm time',
      );
    }

    const parsed = new Date(dateTimeValue);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException('Invalid proposed correction time');
    }

    return parsed;
  }

  private defaultInclude() {
    return {
      monthlyTimesheet: {
        include: {
          employee: {
            select: {
              userID: true,
              email: true,
              username: true,
              departmentID: true,
              department: true,
            },
          },
        },
      },
      timesheetEntry: true,
      employee: {
        select: {
          userID: true,
          email: true,
          username: true,
          departmentID: true,
        },
      },
      reviewer: {
        select: {
          userID: true,
          email: true,
          username: true,
        },
      },
    } as const;
  }
}
