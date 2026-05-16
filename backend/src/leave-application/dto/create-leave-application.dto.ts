import { IsDateString, IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateLeaveApplicationDto {
  @ApiProperty({ description: 'ID of the type of leave' })
  @IsUUID()
  @IsNotEmpty()
  typeLeaveID: string;

  @ApiProperty({ description: 'Start date of leave' })
  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @ApiProperty({ description: 'End date of leave' })
  @IsDateString()
  @IsNotEmpty()
  endDate: string;

  @ApiProperty({ description: 'Reason for leave' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}
