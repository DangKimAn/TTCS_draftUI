import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';

export default class GetMonthlyTimeSheetDto {
  @ApiProperty({ description: 'Tháng cần tra cứu' })
  @Type(() => Number)
  @IsInt()
  month: number;

  @ApiProperty({ description: 'Năm cần tra cứu' })
  @Type(() => Number)
  @IsInt()
  year: number;

  @ApiPropertyOptional({
    description: 'Lọc theo trạng thái',
    example: 'APPROVED',
  })
  @IsOptional()
  @IsString()
  status?: string;
}
