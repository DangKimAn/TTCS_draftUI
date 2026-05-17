import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, IsUUID } from 'class-validator';

export default class UserDto {
  @IsString()
  @IsUUID()
  userID: string;
  @ApiProperty({
    description: 'email',
    example: 'abc@gmail.com',
    required: true,
  })
  @IsString()
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'username',
    example: 'hahaha',
    required: true,
  })
  @IsString()
  username: string;

  @IsString()
  @IsOptional()
  linkAvatar?: string | null;

  @IsString()
  @IsOptional()
  phone?: string | null;

  @IsString()
  @IsOptional()
  address?: string | null;

  @IsString()
  @IsOptional()
  emergencyContact?: string | null;

  @IsString()
  @IsOptional()
  departmentName?: string;

  @IsString()
  @IsOptional()
  departmentID?: string | null;

  @IsString()
  @IsOptional()
  roleId: string | null;

  @IsOptional()
  role?: unknown;
}
