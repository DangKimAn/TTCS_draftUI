import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SystemLogCleanupService {
  private readonly logger = new Logger(SystemLogCleanupService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Chạy tự động vào lúc 0:00 (Nửa đêm) mỗi ngày
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleCron() {
    this.logger.log('Đang bắt đầu dọn dẹp các system log cũ hơn 6 tháng...');

    try {
      // Lấy thời điểm hiện tại và lùi lại 6 tháng
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      // Xóa các record trong bảng SystemLog được tạo trước thời điểm sixMonthsAgo
      const result = await this.prisma.systemLog.deleteMany({
        where: {
          createdAt: {
            lt: sixMonthsAgo, // lt: less than (nhỏ hơn / cũ hơn)
          },
        },
      });

      this.logger.log(`Đã xóa thành công ${result.count} system log cũ.`);
    } catch (error) {
      this.logger.error('Lỗi khi cố gắng xóa system log cũ:', error);
    }
  }
}
