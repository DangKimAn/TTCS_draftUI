import { Injectable } from '@nestjs/common';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { UserService } from 'src/user/user.service';
import { ANOTHER_ERROR_RESPONE, CREATED_RESPONE, OK_CODE } from 'src/common/code';
import ResponseDto, { AnotherError } from 'src/common/response.dto';
import NotificationDto from './dto/notification.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { not } from 'supertest/lib/cookies';
import { Prisma } from '@prisma/client';
import { PrismaModule } from 'src/prisma/prisma.module';

@Injectable()
export class NotificationService {

  constructor(private readonly userService: UserService,
    private readonly prismaService: PrismaService
  ) { }
  async sendNotification(senderID: string, createNotificationDto: CreateNotificationDto, tx?: Prisma.TransactionClient): Promise<ResponseDto<NotificationDto>> {
    const { receiverID, content } = createNotificationDto


    try {
      const executeLogic = async (dbCtx: Prisma.TransactionClient): Promise<ResponseDto<NotificationDto>> => {

        // Kiểm tra song song Người gửi và Người nhận
        const [receiver, sender] = await Promise.all([
          this.userService.getUserByUserID(receiverID, dbCtx),
          this.userService.getUserByUserID(senderID, dbCtx)
        ]);

        if (receiver.statusCode !== OK_CODE || !receiver.data) {
          return { statusCode: receiver.statusCode, message: 'Receiver not found' };
        }

        if (sender.statusCode !== OK_CODE || !sender.data) {
          return { statusCode: sender.statusCode, message: 'Sender not found' };
        }

        // 2. NHỚ CÓ AWAIT: Lưu thông báo vào DB
        const newNotification = await dbCtx.notification.create({
          data: {
            senderID,
            receiverID,
            content,
          }
        });

        // 3. Trả về data sau khi tạo thành công
        return {
          statusCode: CREATED_RESPONE,
          message: 'Create notification successfully',
          data: newNotification as unknown as NotificationDto
        };
      };

      // 4. Nếu có tx truyền vào từ ngoài, chạy thẳng logic bằng tx đó (KHÔNG mở transaction mới)
      if (tx) {
        return await executeLogic(tx);
      }

      // 5. Nếu chạy độc lập (tx là undefined), tự mở một transaction mới
      return await this.prismaService.$transaction(async (tx) => executeLogic(tx));

    } catch (error) {
      console.error('Error in sendNotification:', error);
      return ANOTHER_ERROR_RESPONE;
    }
  }
}

