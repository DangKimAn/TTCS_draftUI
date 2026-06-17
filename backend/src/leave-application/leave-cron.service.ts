import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class LeaveCronService {
  private readonly logger = new Logger(LeaveCronService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Chạy vào 00:00 ngày 1 tháng 1 hàng năm.
   * Reset số ngày nghỉ phép còn lại (remainDaysofLeave) bằng tổng số ngày phép (totalDaysofLeave) cho tất cả nhân viên.
   */
  @Cron('0 0 1 1 *')
  async handleAnnualLeaveReset() {
    this.logger.log('Bắt đầu cron job: Reset ngày phép hàng năm...');
    try {
      const result = await this.prisma.$executeRaw`
        UPDATE "users" 
        SET "remainDaysofLeave" = "totalDaysofLeave"
      `;
      this.logger.log(`Hoàn thành reset ngày phép. Số lượng nhân viên được cập nhật: ${result}`);
    } catch (error) {
      this.logger.error('Lỗi khi chạy cron job reset ngày phép:', error);
    }
  }
}
