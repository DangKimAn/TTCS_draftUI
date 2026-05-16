import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, IsUUID } from 'class-validator';

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
