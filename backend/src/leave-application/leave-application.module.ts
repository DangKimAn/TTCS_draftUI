import { Module } from '@nestjs/common';
import { LeaveApplicationController } from './leave-application.controller';
import { LeaveApplicationService } from './leave-application.service';
import { LeaveCronService } from './leave-cron.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UserModule } from 'src/user/user.module';
import { NotificationModule } from 'src/notification/notification.module';
import { ExpiredLeaveApplicationService } from './expired-leave-application.service';

@Module({
  imports: [PrismaModule, UserModule, NotificationModule],
  controllers: [LeaveApplicationController],
  providers: [
    LeaveApplicationService,
    LeaveCronService,
    ExpiredLeaveApplicationService,
  ],
  exports: [LeaveApplicationService],
})
export class LeaveApplicationModule {}
