import { Module } from '@nestjs/common';
import { SystemLogService } from './system-log.service';
import { SystemLogController } from './system-log.controller';
import { UserModule } from '../user/user.module';

@Module({
  imports: [UserModule],
  providers: [SystemLogService],
  controllers: [SystemLogController],
})
export class SystemLogModule {}
