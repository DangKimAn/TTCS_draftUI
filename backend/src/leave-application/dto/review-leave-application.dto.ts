import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReviewLeaveApplicationDto {
  @ApiProperty({
    description: 'Status of leave application (approved or rejected)',
  })
  @IsString()
  @IsIn(['approved', 'rejected'])
  @IsNotEmpty()
  status: string;

  @ApiProperty({
    description: 'Reason for rejection (optional)',
    required: false,
  })
  @IsString()
  @IsOptional()
  reasonReject?: string;
}
