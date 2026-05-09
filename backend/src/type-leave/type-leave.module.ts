import { Module } from '@nestjs/common';
import { TypeLeaveService } from './type-leave.service';
import { TypeLeaveController } from './type-leave.controller';

@Module({
  controllers: [TypeLeaveController],
  providers: [TypeLeaveService],
})
export class TypeLeaveModule {}
