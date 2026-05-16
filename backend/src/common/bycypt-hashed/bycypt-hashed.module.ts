import { Module } from '@nestjs/common';
import { BycyptHashedService } from './bycypt-hashed.service';
import { BycyptHashedController } from './bycypt-hashed.controller';

@Module({
  controllers: [BycyptHashedController],
  providers: [BycyptHashedService],
  exports: [BycyptHashedService],
})
export class BycyptHashedModule {}
