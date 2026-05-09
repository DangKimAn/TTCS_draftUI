import { Controller } from '@nestjs/common';
import { TypeLeaveService } from './type-leave.service';

@Controller('type-leave')
export class TypeLeaveController {
  constructor(private readonly typeLeaveService: TypeLeaveService) {}
}
