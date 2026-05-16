import { Module } from '@nestjs/common';
import { TypeLeaveService } from './type-leave.service';
import { TypeLeaveController } from './type-leave.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UserModule } from 'src/user/user.module';

@Module({
  imports: [PrismaModule, UserModule],
  controllers: [TypeLeaveController],
  providers: [TypeLeaveService],
  exports: [TypeLeaveService],
})
export class TypeLeaveModule {}
