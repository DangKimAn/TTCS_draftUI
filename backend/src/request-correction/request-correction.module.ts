import { Module } from '@nestjs/common';
import { UserModule } from 'src/user/user.module';
import { NotificationModule } from 'src/notification/notification.module';
import { EmailModule } from 'src/common/email.module';
import { RequestCorrectionController } from './request-correction.controller';
import { RequestCorrectionService } from './request-correction.service';

@Module({
  imports: [UserModule, NotificationModule, EmailModule],
  controllers: [RequestCorrectionController],
  providers: [RequestCorrectionService],
  exports: [RequestCorrectionService],
})
export class RequestCorrectionModule {}
