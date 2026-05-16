import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber } from 'class-validator';

export default class SubmitMonthlyTimesheetDto {
  @ApiProperty({
    description: 'month',
    required: true,
  })
  @Type(() => Number)
  @IsNumber()
  month: number;

  @ApiProperty({
    description: 'year',
    required: true,
  })
  @Type(() => Number)
  @IsNumber()
  year: number;
}
