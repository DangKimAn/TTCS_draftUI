import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UserService } from 'src/user/user.service';
import { CreateWarningDto } from './dto/create-warning.dto';
import ResponseDto from 'src/common/response.dto';
import WarningDto from './dto/warning.dto';
import { CREATED_RESPONE, OK_CODE } from 'src/common/code';
import { NotificationService } from 'src/notification/notification.service';
import { WarningLevel, NotificationRelatedType } from '@prisma/client';

@Injectable()
export class WarningService {
  constructor(
    private readonly userService: UserService,
    private readonly prismaService: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}
  async sendWarning(
    createWarningDto: CreateWarningDto,
  ): Promise<ResponseDto<WarningDto>> {
    const { userID, content, level } = createWarningDto;

    return await this.prismaService.$transaction(async (tx) => {
      const userGet = await this.userService.getUserByUserID(userID, tx);

      if (userGet.statusCode !== OK_CODE || userGet.data === undefined)
        return {
          statusCode: userGet.statusCode,
          message: userGet.message,
        };

      const warning: WarningDto = await tx.warning.create({
        data: {
          userID,
          content,
          level: level || WarningLevel.LOW,
        },
      });

      const notification = await this.notificationService.createNotification(
        'system',
        userID,
        `You have received a warning: ${content}`,
        NotificationRelatedType.WARNING,
        tx,
      );

      if (notification.statusCode !== CREATED_RESPONE) {
        return {
          statusCode: notification.statusCode,
          message: notification.message,
        };
      }

      return {
        statusCode: CREATED_RESPONE,
        message: 'Created warning successfull !!!!',
        data: warning,
      };
    });
  }
}
