import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString } from 'class-validator';

export default class ReportTimesheetDto {
  @ApiPropertyOptional({ example: '2026-05-01' })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional({ example: '2026-05-31' })
  @IsOptional()
  @IsDateString()
  toDate?: string;

  @ApiPropertyOptional({ description: 'Frontend employee filter alias' })
  @IsOptional()
  @IsString()
  employeeId?: string;

  @ApiPropertyOptional({ description: 'Backend user ID alias' })
  @IsOptional()
  @IsString()
  userID?: string;

  @ApiPropertyOptional({ description: 'Frontend department filter alias' })
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiPropertyOptional({ description: 'Backend department ID alias' })
  @IsOptional()
  @IsString()
  departmentID?: string;

  @ApiPropertyOptional({
    description: 'Pending, Submitted, Approved, Rejected, Draft, or all',
    example: 'Approved',
  })
  @IsOptional()
  @IsString()
  status?: string;
}
