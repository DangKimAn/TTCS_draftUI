import { forwardRef, Module } from '@nestjs/common';
import { AttendanceModuleService } from './attendance-module.service';
import { AttendanceModuleController } from './attendance-module.controller';
import { UserModule } from 'src/user/user.module';
import { MonthlyTimeSheetModule } from 'src/monthly-time-sheet/monthly-time-sheet.module';

@Module({
  controllers: [AttendanceModuleController],
  providers: [AttendanceModuleService ],
  imports :[forwardRef(() => UserModule) , forwardRef(() => MonthlyTimeSheetModule)],
  exports : [AttendanceModuleService]
})
export class AttendanceModuleModule {}
