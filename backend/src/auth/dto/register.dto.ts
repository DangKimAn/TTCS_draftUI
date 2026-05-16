import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString } from 'class-validator';

export default class RegiesterDto {
  @IsEmail()
  @IsString()
  @ApiProperty({
    description: 'Email',
    example: 'abc@gmail.com',
    required: true,
  })
  email: string;
  @IsString()
  @ApiProperty({
    description: 'username',
    example: 'username',
    required: true,
  })
  username: string;

  @IsString()
  @ApiProperty({
    description: 'password',
    example: 'my password ',
    required: true,
  })
  password: string;

  @IsString()
  @IsOptional()
  @ApiProperty({
    description: 'departmnetName',
    example: 'IT',
    required: true,
  })
  departmentName?: string;
}
