import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, Max, Min } from 'class-validator';

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
}
