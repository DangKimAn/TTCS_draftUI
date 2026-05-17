import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateTypeLeaveDto {
  @ApiProperty({ example: 'AL' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ example: 'Nghỉ phép năm' })
  @IsString()
  @IsNotEmpty()
  nameTypeLeave: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  @Min(0)
  @Max(1)
  hasSalary: number;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
