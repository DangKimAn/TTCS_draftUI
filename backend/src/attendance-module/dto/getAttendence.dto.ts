import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt } from 'class-validator';

export default class GetAttendenceDto {
  @ApiProperty({
    description: 'month',
    required: true,
  })
  @Type(() => Number)
  @IsInt()
  month: number;

  @ApiProperty({
    description: 'year',
    required: true,
  })
  @Type(() => Number)
  @IsInt()
  year: number;
}
