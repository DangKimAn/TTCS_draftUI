import { forwardRef, Module } from '@nestjs/common';
import { MonthlyTimeSheetService } from './monthly-time-sheet.service';
import { MonthlyTimeSheetController } from './monthly-time-sheet.controller';
import { UserModule } from 'src/user/user.module';
import { DepartmentModule } from 'src/department/department.module';
import { NotificationModule } from 'src/notification/notification.module';

@Module({
  controllers: [MonthlyTimeSheetController],
  providers: [MonthlyTimeSheetService],
  exports: [MonthlyTimeSheetService],
  imports: [
    forwardRef(() => UserModule),
    forwardRef(() => DepartmentModule),
    forwardRef(() => NotificationModule),
  ],
})
export class MonthlyTimeSheetModule {}
