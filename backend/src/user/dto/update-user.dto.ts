import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export default class updateUserDto {
  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  email?: string;

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
    description: 'phone',
    example: '0900000000',
    required: false,
  })
  @IsString()
  @IsOptional()
  phone?: string | null;

  @ApiProperty({
    description: 'address',
    example: 'Ha Noi',
    required: false,
  })
  @IsString()
  @IsOptional()
  address?: string | null;

  @ApiProperty({
    description: 'emergencyContact',
    example: '0900000001',
    required: false,
  })
  @IsString()
  @IsOptional()
  emergencyContact?: string | null;

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
