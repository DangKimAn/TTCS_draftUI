import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export default class ReviewMonthlyTimesheetDto {
  @ApiProperty()
  @IsBoolean()
  accept: boolean;

  @ApiProperty()
  @IsOptional()
  @IsString()
  reasonReject: string | undefined;
}
