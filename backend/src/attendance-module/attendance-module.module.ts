import { forwardRef, Module } from '@nestjs/common';
import { AttendanceModuleService } from './attendance-module.service';
import { AttendanceModuleController } from './attendance-module.controller';
import { UserModule } from 'src/user/user.module';
import { MonthlyTimeSheetModule } from 'src/monthly-time-sheet/monthly-time-sheet.module';
import { NotificationModule } from 'src/notification/notification.module';
import { MissedCheckoutTask } from './missedCheckout';
import { WarningModule } from 'src/warning/warning.module';

@Module({
  controllers: [AttendanceModuleController],
  providers: [AttendanceModuleService, MissedCheckoutTask],
  imports: [
    forwardRef(() => UserModule),
    forwardRef(() => MonthlyTimeSheetModule),
    NotificationModule,
    forwardRef(() => WarningModule),
  ],
  exports: [AttendanceModuleService],
})
export class AttendanceModuleModule {}
