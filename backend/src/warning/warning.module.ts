import { forwardRef, Module } from '@nestjs/common';
import { WarningService } from './warning.service';
import { WarningController } from './warning.controller';
import { UserModule } from 'src/user/user.module';
import { AttendanceModuleModule } from 'src/attendance-module/attendance-module.module';
import { NotificationModule } from 'src/notification/notification.module';

@Module({
  controllers: [WarningController],
  providers: [WarningService],
  imports: [
    UserModule,
    forwardRef(() => AttendanceModuleModule),
    NotificationModule,
  ],
  exports: [WarningService],
})
export class WarningModule {}
