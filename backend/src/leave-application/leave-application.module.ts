import { Module } from '@nestjs/common';
import { LeaveApplicationController } from './leave-application.controller';
import { LeaveApplicationService } from './leave-application.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UserModule } from 'src/user/user.module';
import { NotificationModule } from 'src/notification/notification.module';

@Module({
  imports: [PrismaModule, UserModule, NotificationModule],
  controllers: [LeaveApplicationController],
  providers: [LeaveApplicationService],
  exports: [LeaveApplicationService],
})
export class LeaveApplicationModule {}
