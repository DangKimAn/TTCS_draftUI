import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min, IsString } from 'class-validator';

export class ExportPayrollQueryDto {
  @ApiPropertyOptional({ description: 'Tháng' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;

  @ApiPropertyOptional({ description: 'Năm' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  year?: number;

  @ApiPropertyOptional({ description: 'Định dạng xuất file (csv/json)' })
  @IsOptional()
  @IsString()
  @IsIn(['csv', 'json'])
  format?: string;
}
