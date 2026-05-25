import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AttendanceModuleModule } from './attendance-module/attendance-module.module';
import { AuthModule } from './auth/auth.module';
import { BycyptHashedModule } from './common/bycypt-hashed/bycypt-hashed.module';
import { SeedService } from './common/seed.service';
import { SystemLogCleanupService } from './common/system-log-cleanup.service';
import { DepartmentModule } from './department/department.module';
import { LeaveApplicationModule } from './leave-application/leave-application.module';
import { MonthlyTimeSheetModule } from './monthly-time-sheet/monthly-time-sheet.module';
import { NotificationModule } from './notification/notification.module';
import { PayrollModule } from './payroll/payroll.module';
import { PrismaModule } from './prisma/prisma.module';
import { RoleModule } from './role/role.module';
import { TypeLeaveModule } from './type-leave/type-leave.module';
import { UserModule } from './user/user.module';
import { WarningModule } from './warning/warning.module';
import { RequestCorrectionModule } from './request-correction/request-correction.module';
import { EmailModule } from './common/email.module';
import { RealtimeModule } from './realtime/realtime.module';
import { CloudinaryModule } from './common/cloudinary/cloudinary.module';
import { SystemLogModule } from './system-log/system-log.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: ['.env', '../.env'],
    }),
    PrismaModule,
    RoleModule,
    UserModule,
    AuthModule,
    DepartmentModule,
    BycyptHashedModule,
    AttendanceModuleModule,
    MonthlyTimeSheetModule,
    NotificationModule,
    ScheduleModule.forRoot(),
    WarningModule,
    TypeLeaveModule,
    LeaveApplicationModule,
    PayrollModule,
    RequestCorrectionModule,
    EmailModule,
    RealtimeModule,
    CloudinaryModule,
    SystemLogModule,
  ],
  controllers: [AppController],
  providers: [AppService, SeedService, SystemLogCleanupService],
})
export class AppModule {}
