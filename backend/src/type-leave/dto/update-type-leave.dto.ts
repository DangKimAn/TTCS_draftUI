import { PartialType } from '@nestjs/swagger';
import { CreateTypeLeaveDto } from './create-type-leave.dto';

export class UpdateTypeLeaveDto extends PartialType(CreateTypeLeaveDto) {}
