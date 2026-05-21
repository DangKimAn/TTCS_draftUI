import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsEmail,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

@Exclude()
export default class FullUserDto {
  @Expose()
  @IsString()
  @IsUUID()
  userID: string;
  @ApiProperty({
    description: 'email',
    example: 'abc@gmail.com',
    required: true,
  })
  @Expose()
  @IsString()
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'username',
    example: 'hahaha',
    required: true,
  })
  @Expose()
  @IsString()
  username: string;
  @ApiProperty({
    description: 'password',
    example: 'hacked by me',
    required: true,
  })
  @IsString()
  hashedPassword: string;

  @ApiProperty({
    description: 'linkAvatar',
    example: '',
    required: false,
  })
  @IsString()
  @IsOptional()
  linkAvatar?: string | null;

  @ApiProperty({
    description: 'phone',
    example: '0900000000',
    required: false,
  })
  @Expose()
  @IsString()
  @IsOptional()
  phone?: string | null;

  @ApiProperty({
    description: 'address',
    example: 'Ha Noi',
    required: false,
  })
  @Expose()
  @IsString()
  @IsOptional()
  address?: string | null;

  @ApiProperty({
    description: 'emergencyContact',
    example: '0900000001',
    required: false,
  })
  @Expose()
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
  roleId: string | null;

  @ApiProperty({
    description: 'departmentName',
    example: 'IT',
    required: false,
  })
  @IsString()
  @IsOptional()
  departmentID?: string | null;

  @IsString()
  @IsOptional()
  acessToken?: string;

  @IsString()
  @IsOptional()
  refreshToken?: string | null;

  @Expose()
  @IsOptional()
  role?: {
    roleID: string;
    nameRole: string;
  };

  @Expose()
  @IsOptional()
  department?: {
    departmentID: string;
    departmentName: string;
    managerID: string | null;
    manager?: {
      username: string;
      email: string;
    } | null;
  } | null;
}
