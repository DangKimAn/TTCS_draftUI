import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt } from 'class-validator';

export default class CreateMonthlyTimeSheetDto {
  @ApiProperty({ description: 'Tháng cần tra cứu' })
  @Type(() => Number)
  @IsInt()
  month: number;

  @ApiProperty({ description: 'Năm cần tra cứu' })
  @Type(() => Number)
  @IsInt()
  year: number;
}
