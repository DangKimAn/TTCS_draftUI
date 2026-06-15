import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateLeaveApplicationDto } from './dto/create-leave-application.dto';
import { ReviewLeaveApplicationDto } from './dto/review-leave-application.dto';
import { DefaultResponse } from 'src/common/response.dto';
import {
  BADREQUEST_CODE,
  CREATED_RESPONE,
  Interval_Server_Network_Exeception_Code,
  NOTFOUND_CODE,
  OK_CODE,
  UNAUTHORIZED_CODE,
} from 'src/common/code';
import { Prisma, LeaveStatus, NotificationRelatedType } from '@prisma/client';
import { NotificationService } from 'src/notification/notification.service';
import { EmailService } from 'src/common/email.service';

@Injectable()
export class LeaveApplicationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    private readonly emailService: EmailService,
  ) {}

  async createLeaveApplication(
    userID: string,
    createDto: CreateLeaveApplicationDto,
  ): Promise<DefaultResponse> {
    try {
      const { typeLeaveID, startDate, endDate, reason } = createDto;

      const start = this.parseDateOnly(startDate);
      const end = this.parseDateOnly(endDate);
      const today = this.startOfToday();

      if (start > end) {
        return {
          statusCode: BADREQUEST_CODE,
          message: 'Start date must be before or equal to end date',
        };
      }

      if (start < today) {
        return {
          statusCode: BADREQUEST_CODE,
          message: 'Cannot create leave application for past dates',
        };
      }

      const duration = this.calculateBusinessDays(start, end);

      if (duration <= 0) {
        return {
          statusCode: BADREQUEST_CODE,
          message: 'Leave duration must include at least one weekday',
        };
      }

      const user = await this.prisma.user.findUnique({ where: { userID } });
      if (!user) {
        return { statusCode: NOTFOUND_CODE, message: 'User not found' };
      }

      const typeLeave = await this.prisma.typeLeave.findUnique({
        where: { typeLeaveID },
      });
      if (!typeLeave) {
        return { statusCode: NOTFOUND_CODE, message: 'Type leave not found' };
      }
      if (typeLeave.isActive === false) {
        return {
          statusCode: BADREQUEST_CODE,
          message:
            'Không thể tạo đơn xin nghỉ phép với loại nghỉ phép đã bị vô hiệu hóa',
        };
      }

      const isPaidLeave = Number(typeLeave.hasSalary) > 0;
      if (isPaidLeave && user.remainDaysofLeave < duration) {
        return {
          statusCode: BADREQUEST_CODE,
          message: `Not enough remaining annual leave. You have ${user.remainDaysofLeave} days left. Please choose an unpaid leave type.`,
        };
      }

      const conflictDates = await this.findWorkLogConflictDates(
        userID,
        start,
        end,
      );
      const application = await this.prisma.leaveApplication.create({
        data: {
          senderID: userID,
          typeLeaveID,
          startDate: start,
          endDate: end,
          duration,
          reason,
          status: LeaveStatus.PENDING,
        },
      });

      // Send notification to manager
      if (user.departmentID) {
        const department = await this.prisma.department.findUnique({
          where: { departmentID: user.departmentID },
        });

        if (department?.managerID) {
          const notification =
            await this.notificationService.createNotification(
              userID,
              department.managerID,
              `New leave application submitted by ${user.username} from ${startDate} to ${endDate} (${duration} days).`,
              NotificationRelatedType.LEAVE,
            );

          if (notification.statusCode !== CREATED_RESPONE) {
            return {
              statusCode: notification.statusCode,
              message: notification.message,
            };
          }

          // --- GỬI EMAIL CHO QUẢN LÝ ---
          try {
            const manager = await this.prisma.user.findUnique({
              where: { userID: department.managerID },
              select: { email: true },
            });
            if (manager?.email) {
              await this.emailService?.send({
                to: manager.email,
                subject: '[HRM] Yêu cầu nghỉ phép mới',
                text: `Xin chào Quản lý,\n\nNhân viên ${user.username} vừa gửi đơn xin nghỉ phép từ ngày ${startDate} đến ${endDate} (${duration} ngày).\nLý do: ${reason}\n\nVui lòng truy cập hệ thống để phê duyệt.\n\nTrân trọng,\nHệ thống HRM`,
              });
            }
          } catch (e) {
            console.error('Email error in createLeaveApplication:', e);
          }
        }
      }

      return {
        statusCode: CREATED_RESPONE,
        message: conflictDates.length
          ? `Leave application submitted successfully with warning: work logs already exist on ${conflictDates.join(', ')}`
          : 'Leave application submitted successfully',
        data: conflictDates.length
          ? {
              ...application,
              warnings: conflictDates.map((date) => ({
                code: 'LEAVE_WORKLOG_CONFLICT',
                date,
                message:
                  'Leave request overlaps with an existing timesheet entry.',
              })),
            }
          : application,
      };
    } catch (error: unknown) {
      console.error('Error creating leave application:', error);
      return {
        statusCode: Interval_Server_Network_Exeception_Code,
        message:
          'Internal server error occurred while creating leave application',
      };
    }
  }

  async getMyLeaveApplications(userID: string): Promise<DefaultResponse> {
    const applications = await this.prisma.leaveApplication.findMany({
      where: { senderID: userID },
      orderBy: { createdAt: 'desc' },
      include: { typeLeave: true },
    });

    return {
      statusCode: OK_CODE,
      message: 'Get my leave applications successful',
      data: applications,
    };
  }

  async getDepartmentLeaveApplications(
    departmentID: string,
  ): Promise<DefaultResponse> {
    const applications = await this.prisma.leaveApplication.findMany({
      where: { sender: { departmentID } },
      orderBy: { createdAt: 'desc' },
      include: { sender: true, typeLeave: true },
    });

    return {
      statusCode: OK_CODE,
      message: 'Get department leave applications successful',
      data: applications,
    };
  }

  async getAllLeaveApplications(): Promise<DefaultResponse> {
    const applications = await this.prisma.leaveApplication.findMany({
      orderBy: { createdAt: 'desc' },
      include: { sender: true, typeLeave: true },
    });

    return {
      statusCode: OK_CODE,
      message: 'Get all leave applications successful',
      data: applications,
    };
  }

  async reviewLeaveApplication(
    leaveApplicationID: string,
    reviewerID: string,
    reviewDto: ReviewLeaveApplicationDto,
  ): Promise<DefaultResponse> {
    const { status, reasonReject } = reviewDto;

    try {
      const executeLogic = async (
        dbCtx: Prisma.TransactionClient,
      ): Promise<DefaultResponse> => {
        const application = await dbCtx.leaveApplication.findUnique({
          where: { leaveApplicationID },
          include: {
            sender: {
              include: {
                department: true,
              },
            },
            typeLeave: true,
          },
        });

        if (!application) {
          return {
            statusCode: NOTFOUND_CODE,
            message: 'Leave application not found',
          };
        }

        if (application.sender?.department?.managerID !== reviewerID) {
          return {
            statusCode: UNAUTHORIZED_CODE,
            message:
              'Only the sender department manager can review this leave application',
          };
        }

        const oldStatus = application.status;
        const newStatus = status.toUpperCase() as LeaveStatus;
        const isPaidLeave = Number(application.typeLeave?.hasSalary ?? 0) > 0;

        if (oldStatus === newStatus) {
          if (
            newStatus === LeaveStatus.REJECTED &&
            reasonReject !== application.reasonReject
          ) {
            await dbCtx.leaveApplication.update({
              where: { leaveApplicationID },
              data: { reasonReject, reviewerID, reviewedAt: new Date() },
            });
            return { statusCode: OK_CODE, message: 'Rejection reason updated' };
          }
          return {
            statusCode: OK_CODE,
            message: `Leave application is already ${oldStatus}`,
          };
        }

        if (newStatus === LeaveStatus.REJECTED && !reasonReject) {
          return {
            statusCode: BADREQUEST_CODE,
            message: 'Reason for rejection is required',
          };
        }

        const user = await dbCtx.user.findUnique({
          where: { userID: application.senderID },
        });
        if (!user) {
          return { statusCode: NOTFOUND_CODE, message: 'Applicant not found' };
        }

        // Handle leave balance updates
        if (isPaidLeave) {
          if (
            oldStatus === LeaveStatus.APPROVED &&
            newStatus !== LeaveStatus.APPROVED
          ) {
            // Refund days if changing from approved to something else (e.g. rejected)
            await dbCtx.user.update({
              where: { userID: application.senderID },
              data: {
                remainDaysofLeave:
                  user.remainDaysofLeave + application.duration,
              },
            });
          } else if (
            oldStatus !== LeaveStatus.APPROVED &&
            newStatus === LeaveStatus.APPROVED
          ) {
            // Deduct days if changing to approved from something else (e.g. pending or rejected)
            if (user.remainDaysofLeave < application.duration) {
              return {
                statusCode: BADREQUEST_CODE,
                message:
                  'User does not have enough remaining days of leave to approve this application',
              };
            }
            await dbCtx.user.update({
              where: { userID: application.senderID },
              data: {
                remainDaysofLeave:
                  user.remainDaysofLeave - application.duration,
              },
            });
          }
        }

        const updatedApp = await dbCtx.leaveApplication.update({
          where: { leaveApplicationID },
          data: {
            status: newStatus,
            reasonReject:
              newStatus === LeaveStatus.REJECTED ? reasonReject : null,
            reviewerID,
            reviewedAt: new Date(),
          },
        });

        // Send notification to employee
        const notificationMsg =
          newStatus === LeaveStatus.APPROVED
            ? `Your leave application from ${application.startDate.toDateString()} to ${application.endDate.toDateString()} has been approved.`
            : `Your leave application from ${application.startDate.toDateString()} to ${application.endDate.toDateString()} has been rejected. Reason: ${reasonReject}`;

        await this.notificationService.createNotification(
          reviewerID,
          application.senderID,
          notificationMsg,
          NotificationRelatedType.LEAVE,
          dbCtx,
        );

        // --- GỬI EMAIL CHO NHÂN VIÊN ---
        if (this.emailService) {
          this.emailService
            .sendLeaveNotification({
              recipientEmail: application.sender.email,
              employeeName: application.sender.username,
              status:
                newStatus === LeaveStatus.APPROVED ? 'approved' : 'rejected',
              reason: reasonReject || undefined,
            })
            .catch((e) =>
              console.error('Email error in reviewLeaveApplication:', e),
            );
        }

        return {
          statusCode: OK_CODE,
          message: `Leave application ${newStatus}`,
          data: updatedApp,
        };
      };

      return await this.prisma.$transaction(executeLogic);
    } catch (error: unknown) {
      console.error('Error reviewing leave application:', error);
      return {
        statusCode: Interval_Server_Network_Exeception_Code,
        message:
          'Internal server error occurred while reviewing leave application',
      };
    }
  }

  async getLeaveBalance(userID: string): Promise<DefaultResponse> {
    const user = await this.prisma.user.findUnique({ where: { userID } });
    if (!user) {
      return { statusCode: NOTFOUND_CODE, message: 'User not found' };
    }

    const applications = await this.prisma.leaveApplication.findMany({
      where: { senderID: userID },
      orderBy: { createdAt: 'desc' },
      include: { typeLeave: true },
    });

    const pendingDays = applications
      .filter(
        (app) =>
          app.status === LeaveStatus.PENDING &&
          Number(app.typeLeave?.hasSalary ?? 0) > 0,
      )
      .reduce((sum, app) => sum + app.duration, 0);

    const data = {
      totalDaysOfLeave: user.totalDaysofLeave,
      remainDaysOfLeave: user.remainDaysofLeave,
      usedDays: user.totalDaysofLeave - user.remainDaysofLeave,
      pendingDays,
      history: applications,
    };

    return {
      statusCode: OK_CODE,
      message: 'Get leave balance successful',
      data,
    };
  }

  private parseDateOnly(value: string): Date {
    const [year, month, day] = value.split('-').map(Number);

    if (!year || !month || !day) {
      return new Date(value);
    }

    return new Date(year, month - 1, day, 0, 0, 0, 0);
  }

  private startOfToday(): Date {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  }

  private calculateBusinessDays(start: Date, end: Date): number {
    let count = 0;
    const cursor = new Date(start);

    while (cursor <= end) {
      const day = cursor.getDay();
      if (day !== 0 && day !== 6) {
        count += 1;
      }
      cursor.setDate(cursor.getDate() + 1);
    }

    return count;
  }

  private async findWorkLogConflictDates(
    userID: string,
    start: Date,
    end: Date,
  ): Promise<string[]> {
    const startKey = this.toDateKey(start);
    const endKey = this.toDateKey(end);

    const monthlyTimesheets = await this.prisma.monthlyTimesheet.findMany({
      where: {
        userID,
        entries: {
          some: {
            date: {
              gte: startKey,
              lte: endKey,
            },
          },
        },
      },
      include: {
        entries: {
          where: {
            date: {
              gte: startKey,
              lte: endKey,
            },
          },
          select: { date: true },
        },
      },
    });

    return Array.from(
      new Set(
        monthlyTimesheets.flatMap((timesheet) =>
          timesheet.entries.map((entry) => entry.date),
        ),
      ),
    ).sort();
  }

  private toDateKey(value: Date): string {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }
}
