import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID } from 'class-validator';

export class RefreshTokenDto {

  
  @ApiProperty({
    description: 'Refresh token',
    example: 'abc123',
  })
  @IsString()
  refreshToken: string;
}