import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString } from 'class-validator';

export default class LoginDto {
  @IsString()
  @IsOptional()
  @ApiProperty({
    example: 'dangkiman123@gmail.com',
    description: 'username',
    required: false,
  })
  username?: string;

  @IsString()
  @IsEmail()
  @IsOptional()
  @ApiProperty({
    example: 'dangkiman123@gmail.com',
    description: 'email',
    required: false,
  })
  email?: string;

  @ApiProperty({
    example: '123123',
    description: 'email',
    required: true,
  })
  @IsString()
  password: string;
}
