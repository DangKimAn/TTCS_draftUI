import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { RoleModule } from './role/role.module';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { DepartmentModule } from './department/department.module';
import { BycyptHashedModule } from './common/bycypt-hashed/bycypt-hashed.module';
import { SeedService } from './common/seed.service';
import { AttendanceModuleModule } from './attendance-module/attendance-module.module';
import { MonthlyTimeSheetModule } from './monthly-time-sheet/monthly-time-sheet.module';
import { NotificationModule } from './notification/notification.module';
import { ScheduleModule } from '@nestjs/schedule';
import { WarningModule } from './warning/warning.module';
import { TypeLeaveModule } from './type-leave/type-leave.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Để các module khác không cần import lại
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
    TypeLeaveModule
    
  ],
  controllers: [AppController],
  providers: [AppService, SeedService],
})
export class AppModule {}
