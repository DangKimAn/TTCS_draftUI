import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsDateString,
  IsEmail,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export default class updateUserDto {
  @IsOptional()
  @IsString()
  password?: string;

  @ApiProperty({
    description: 'linkAvatar',
    example: '',
    required: false,
  })
  @IsString()
  @IsOptional()
  linkAvatar?: string;
  @ApiProperty({
    description: 'salaryCoefficient',
    example: '0.01',
    required: false,
  })
  @IsNumber()
  @IsOptional()
  salaryCoefficient?: number;
  @ApiProperty({
    description: 'birthday',
    example: '04/10/2005',
    required: false,
  })
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  birthday?: Date | null;

  @ApiProperty({
    description: 'remainDaysofLeaves',
    example: '12',
    required: false,
  })
  @IsInt()
  @IsOptional()
  remainDaysofLeave?: number;

  @ApiProperty({
    description: 'totalDayOfLeaves',
    example: '12',
    required: false,
  })
  @IsInt()
  @IsOptional()
  totalDaysofLeave?: number;

  @ApiProperty({
    description: 'isActive',
    example: 'true',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean | null;

  @ApiProperty({
    description: 'roleName',
    example: 'admin',
    required: false,
  })
  @IsString()
  @IsOptional()
  roleName?: string;

  @ApiProperty({
    description: 'departmentName',
    example: 'IT',
    required: false,
  })
  @IsString()
  @IsOptional()
  departmentName?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({
    description: 'departmentName',
    example: 'IT',
    required: false,
  })
  refreshToken?: string;
}
