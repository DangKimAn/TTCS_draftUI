import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateRequestCorrectionDto {
  @ApiProperty({ description: 'Monthly timesheet ID' })
  @IsUUID()
  monthlyTimesheetID: string;

  @ApiProperty({
    description: 'Timesheet entry ID to correct',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  timesheetEntryID?: string;

  @ApiProperty({ description: 'Work date of the correction', required: false })
  @IsDateString()
  @IsOptional()
  date?: string;

  @ApiProperty({
    description: 'Proposed check-in time, HH:mm or ISO datetime',
    required: false,
  })
  @IsString()
  @IsOptional()
  requestedCheckIn?: string;

  @ApiProperty({
    description: 'Proposed check-out time, HH:mm or ISO datetime',
    required: false,
  })
  @IsString()
  @IsOptional()
  requestedCheckOut?: string;

  @ApiProperty({ description: 'Reason for correction' })
  @IsString()
  reason: string;
}
