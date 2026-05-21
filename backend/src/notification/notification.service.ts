import { Injectable } from '@nestjs/common';
import { Prisma, NotificationRelatedType } from '@prisma/client';
import {
  ANOTHER_ERROR_RESPONE,
  CREATED_RESPONE,
  NOTFOUND_CODE,
  OK_CODE,
  UNAUTHORIZED_CODE,
} from 'src/common/code';
import ResponseDto from 'src/common/response.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { UserService } from 'src/user/user.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import NotificationDto from './dto/notification.dto';
import { RealtimeService } from 'src/realtime/realtime.service';

const SYSTEM_SENDER_ID = 'system';

@Injectable()
export class NotificationService {
  constructor(
    private readonly userService: UserService,
    private readonly prismaService: PrismaService,
    private readonly realtimeService: RealtimeService,
  ) {}

  async sendNotification(
    senderID: string,
    createNotificationDto: CreateNotificationDto,
    tx?: Prisma.TransactionClient,
  ): Promise<ResponseDto<NotificationDto>> {
    const { receiverID, content } = createNotificationDto;
    return this.createNotification(
      senderID,
      receiverID,
      content,
      undefined,
      tx,
    );
  }

  async getReceivedNotifications(
    userID: string,
  ): Promise<ResponseDto<NotificationDto[]>> {
    try {
      const user = await this.userService.getUserByUserID(userID);
      if (user.statusCode !== OK_CODE || !user.data) {
        return { statusCode: user.statusCode, message: 'User not found' };
      }

      const notifications = await this.prismaService.notification.findMany({
        where: { receiverID: userID },
        orderBy: { createdAt: 'desc' },
        include: {
          sender: {
            select: {
              userID: true,
              username: true,
              email: true,
              linkAvatar: true,
            },
          },
        },
      });

      return {
        statusCode: OK_CODE,
        message: 'Get received notifications successfully',
        data: notifications as unknown as NotificationDto[],
      };
    } catch (error: unknown) {
      console.error('Error in getReceivedNotifications:', error);
      return ANOTHER_ERROR_RESPONE;
    }
  }

  async getSentNotifications(
    userID: string,
  ): Promise<ResponseDto<NotificationDto[]>> {
    try {
      const user = await this.userService.getUserByUserID(userID);
      if (user.statusCode !== OK_CODE || !user.data) {
        return { statusCode: user.statusCode, message: 'User not found' };
      }

      const notifications = await this.prismaService.notification.findMany({
        where: { senderID: userID },
        orderBy: { createdAt: 'desc' },
        include: {
          receiver: {
            select: {
              userID: true,
              username: true,
              email: true,
              linkAvatar: true,
            },
          },
        },
      });

      return {
        statusCode: OK_CODE,
        message: 'Get sent notifications successfully',
        data: notifications as unknown as NotificationDto[],
      };
    } catch (error: unknown) {
      console.error('Error in getSentNotifications:', error);
      return ANOTHER_ERROR_RESPONE;
    }
  }

  async markAsRead(
    notificationID: string,
    receiverID?: string,
  ): Promise<ResponseDto<NotificationDto>> {
    try {
      const notification = await this.prismaService.notification.findUnique({
        where: { notificationID },
        include: {
          sender: {
            select: {
              userID: true,
              username: true,
              email: true,
              linkAvatar: true,
            },
          },
        },
      });

      if (!notification) {
        return {
          statusCode: NOTFOUND_CODE,
          message: 'Notification not found',
        };
      }

      if (receiverID && notification.receiverID !== receiverID) {
        return {
          statusCode: UNAUTHORIZED_CODE,
          message: 'You can only mark your own notifications as read',
        };
      }

      if (notification.isRead) {
        return {
          statusCode: OK_CODE,
          message: 'Notification already read',
          data: notification as unknown as NotificationDto,
        };
      }

      const updatedNotification = await this.prismaService.notification.update({
        where: { notificationID },
        data: { isRead: true },
        include: {
          sender: {
            select: {
              userID: true,
              username: true,
              email: true,
              linkAvatar: true,
            },
          },
        },
      });

      return {
        statusCode: OK_CODE,
        message: 'Mark notification as read successfully',
        data: updatedNotification as unknown as NotificationDto,
      };
    } catch (error: unknown) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'P2025'
      ) {
        return {
          statusCode: NOTFOUND_CODE,
          message: 'Notification not found',
        };
      }

      console.error('Error in markAsRead:', error);
      return ANOTHER_ERROR_RESPONE;
    }
  }

  async getUnreadCount(
    userID: string,
  ): Promise<ResponseDto<{ count: number }>> {
    try {
      const user = await this.userService.getUserByUserID(userID);
      if (user.statusCode !== OK_CODE || !user.data) {
        return { statusCode: user.statusCode, message: 'User not found' };
      }

      const count = await this.prismaService.notification.count({
        where: {
          receiverID: userID,
          isRead: false,
        },
      });

      return {
        statusCode: OK_CODE,
        message: 'Get unread count successfully',
        data: { count },
      };
    } catch (error: unknown) {
      console.error('Error in getUnreadCount:', error);
      return ANOTHER_ERROR_RESPONE;
    }
  }

  async createNotification(
    senderID: string | null,
    receiverID: string,
    content: string,
    relatedType?: NotificationRelatedType,
    tx?: Prisma.TransactionClient,
  ): Promise<ResponseDto<NotificationDto>> {
    try {
      const executeLogic = async (
        dbCtx: Prisma.TransactionClient,
      ): Promise<ResponseDto<NotificationDto>> => {
        const normalizedSenderID =
          senderID === SYSTEM_SENDER_ID ? null : senderID;

        const receiver = await dbCtx.user.findUnique({
          where: { userID: receiverID },
          select: { userID: true },
        });
        if (!receiver) {
          return { statusCode: NOTFOUND_CODE, message: 'Receiver not found' };
        }

        if (normalizedSenderID) {
          const sender = await dbCtx.user.findUnique({
            where: { userID: normalizedSenderID },
            select: { userID: true },
          });
          if (!sender) {
            return { statusCode: NOTFOUND_CODE, message: 'Sender not found' };
          }
        }

        const notificationData: Prisma.NotificationUncheckedCreateInput = {
          receiverID,
          content,
          relatedType,
        };

        if (normalizedSenderID) {
          notificationData.senderID = normalizedSenderID;
        }

        const newNotification = await dbCtx.notification.create({
          data: notificationData,
        });

        return {
          statusCode: CREATED_RESPONE,
          message: 'Create notification successfully',
          data: newNotification as unknown as NotificationDto,
        };
      };

      let result: ResponseDto<NotificationDto>;
      if (tx) {
        result = await executeLogic(tx);
      } else {
        result = await this.prismaService.$transaction(
          async (tx) => executeLogic(tx),
          { timeout: 30000 },
        );
      }

      if (result.statusCode === CREATED_RESPONE && result.data) {
        this.realtimeService.emitToUser(
          receiverID,
          'new_notification',
          result.data,
        );
      }

      return result;
    } catch (error: unknown) {
      console.error('Error in createNotification:', error);
      return ANOTHER_ERROR_RESPONE;
    }
  }
}
