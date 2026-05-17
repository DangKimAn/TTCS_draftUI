import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsOptional,
  IsUUID,
  IsNumber,
} from 'class-validator';

export class CreateUserDto {
  @ApiProperty()
  @IsString()
  username: string;

  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  password?: string;

  @ApiProperty({ required: false })
  @IsUUID()
  @IsOptional()
  roleID?: string;

  @ApiProperty({ required: false })
  @IsUUID()
  @IsOptional()
  departmentID?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  roleName?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  departmentName?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  linkAvatar?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  emergencyContact?: string;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  salaryCoefficient?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  birthday?: Date;

  @ApiProperty({ required: false })
  @IsOptional()
  remainDaysofLeave?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  totalDaysofLeave?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  refreshToken?: string;
}
