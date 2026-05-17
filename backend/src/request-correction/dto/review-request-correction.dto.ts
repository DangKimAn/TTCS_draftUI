import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { TimesheetStatus } from '@prisma/client';

export class ReviewRequestCorrectionDto {
  @ApiProperty({
    description: 'Review status',
    enum: [TimesheetStatus.APPROVED, TimesheetStatus.REJECTED],
  })
  @IsEnum(TimesheetStatus)
  status: TimesheetStatus;

  @ApiProperty({ description: 'Reason for rejection', required: false })
  @IsString()
  @IsOptional()
  reasonReject?: string;
}
